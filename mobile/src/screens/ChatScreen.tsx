import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
  ImageBackground,
  SafeAreaView,
  Image
} from 'react-native';
import { Socket } from 'socket.io-client';
import { pickImage, pickVideo, pickDocument, takePhoto, takeVideo, uploadEncryptedFile, PickedMedia } from '../services/media';
import { withScreenshotProtection } from '../services/security';
import { appConfig } from '../config/appConfig';
import { messageStatusManager, MessageStatus } from '../services/messageStatus';
import { messageReactionManager, DEFAULT_REACTIONS } from '../services/messageReactions';
import * as Clipboard from 'expo-clipboard';
import { auth } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import i18n from '../i18n';
import { useTheme } from '../config/theme';
import { connectSocket, getSocket } from '../services/socket';
import { api } from '../services/api';
import {
  decryptFromSender,
  decryptGroupKeyFromSender,
  decryptGroupMessage,
  encryptForRecipient,
  encryptGroupKeyForMember,
  encryptGroupMessage,
  generateGroupKey,
  getGroupKey as getStoredGroupKey,
  getOrCreateIdentityKeypair,
  IdentityKeyPair,
  setGroupKey as saveGroupKey,
} from '../services/e2ee';
import * as FileSystem from 'expo-file-system';
import nacl from 'tweetnacl';
import util from 'tweetnacl-util';


interface Message {
  _id: string;
  sender: { _id: string; displayName: string; photoURL?: string };
  content: string;
  messageType?: 'text' | 'image' | 'video' | 'file' | 'document';
  isRead?: boolean;
  createdAt: string;
  status?: MessageStatus;
  reactions?: { [key: string]: string[] };
  replyTo?: {
    messageId: string;
    senderName: string;
    content: string;
  };
  decryptedText?: string;
  media?: {
    url: string;
    mediaType: 'image' | 'video' | 'file' | 'document';
    key?: string;
    nonce?: string;
    name?: string;
    mimeType?: string;
  };
  localMediaUri?: string;
}

interface ChatScreenProps {
  currentUser: any;
  otherUser: any;
  onBack: () => void;
  onStartCall?: (data: { receiverId: string; type: 'audio' | 'video'; receiverName?: string; receiverAvatar?: string }) => void;
}

export default function ChatScreen({ currentUser, otherUser, onBack, onStartCall }: ChatScreenProps) {
  const { colors, theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ messageId: string; senderName: string; content: string } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [identityKeys, setIdentityKeys] = useState<IdentityKeyPair | null>(null);
  const [recipientKey, setRecipientKey] = useState<string | null>(null);
  const [groupKey, setGroupKeyState] = useState<string | null>(null);
  const [isKeyReady, setIsKeyReady] = useState(false);
  const identityKeysRef = useRef<IdentityKeyPair | null>(null);
  const groupKeyRef = useRef<string | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const screenshotCleanupRef = useRef<Function | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    identityKeysRef.current = identityKeys;
  }, [identityKeys]);

  useEffect(() => {
    groupKeyRef.current = groupKey;
  }, [groupKey]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const showReactionPicker = (messageId: string) => {
    Alert.alert(
      i18n.t('react'),
      'Choose a reaction',
      [
        ...DEFAULT_REACTIONS.map(reaction => ({
          text: reaction,
          onPress: () => {
            messageReactionManager.toggleReaction(
              messageId,
              currentUser.id,
              reaction,
              currentUser.displayName
            );
          }
        })),
        { text: i18n.t('cancel'), style: 'cancel' as const }
      ]
    );
  };

  const parseDecryptedBody = (text: string): any => {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && parsed.type) return parsed;
    } catch {
      // ignore
    }
    return { type: 'text', text };
  };

  const ensureRecipientKey = async () => {
    if (recipientKey || otherUser?.isGroup) return;
    try {
      const keyRes = await api.getUserKey(otherUser._id);
      if (keyRes?.identityKey) {
        setRecipientKey(keyRes.identityKey);
      }
    } catch (error) {
      console.warn('Failed to fetch recipient key', error);
    }
  };

  const ensureGroupKey = async (identity: IdentityKeyPair) => {
    if (!otherUser?.isGroup) return;
    const groupId = otherUser._id;

    const cached = await getStoredGroupKey(groupId);
    if (cached) {
      setGroupKeyState(cached);
      return;
    }

    try {
      const record = await api.getGroupKey(groupId);
      if (record?.encryptedKey && record?.nonce && record?.senderId) {
        const senderKey = await api.getUserKey(String(record.senderId));
        if (senderKey?.identityKey) {
          const decrypted = decryptGroupKeyFromSender(
            record.encryptedKey,
            record.nonce,
            senderKey.identityKey,
            identity.secretKey
          );
          if (decrypted) {
            await saveGroupKey(groupId, decrypted);
            setGroupKeyState(decrypted);
            return;
          }
        }
      }
    } catch (error) {
      // ignore and try to create
    }

    try {
      const members: string[] = Array.isArray(otherUser.members) ? otherUser.members : [];
      const keyResp = await api.getUserKeys(members);
      const keyMap = new Map<string, string>();
      (keyResp?.keys || []).forEach((k: any) => {
        keyMap.set(String(k.userId), k.identityKey);
      });

      const groupKey = generateGroupKey();
      const keysToUpload = members
        .map((memberId) => {
          const memberKey = keyMap.get(String(memberId));
          if (!memberKey) return null;
          const enc = encryptGroupKeyForMember(groupKey, memberKey, identity.secretKey);
          return { userId: String(memberId), encryptedKey: enc.encryptedKey, nonce: enc.nonce };
        })
        .filter(Boolean) as { userId: string; encryptedKey: string; nonce: string }[];

      if (keysToUpload.length > 0) {
        await api.uploadGroupKeys(groupId, keysToUpload, 1);
      }

      await saveGroupKey(groupId, groupKey);
      setGroupKeyState(groupKey);
    } catch (error) {
      console.warn('Failed to create group key', error);
    }
  };

  const hydrateMessage = async (message: Message): Promise<Message> => {
    let content = message.content;
    let replyTo = message.replyTo;
    let media = message.media;
    let decryptedText: string | undefined;

    if (typeof message.content === 'string') {
      try {
        const payload = JSON.parse(message.content);
        if (payload?.t === 'dm' || payload?.t === 'group') {
          let decrypted: string | null = null;
          const identity = identityKeysRef.current;
          if (payload.t === 'dm' && identity?.secretKey) {
            decrypted = decryptFromSender(payload, identity.secretKey);
          }
          const currentGroupKey = groupKeyRef.current;
          if (payload.t === 'group' && currentGroupKey) {
            decrypted = decryptGroupMessage(payload, currentGroupKey);
          }
          if (decrypted) {
            const body = parseDecryptedBody(decrypted);
            if (body.type === 'media' && body.media) {
              media = body.media;
              content = body.caption || '[media]';
            } else {
              content = body.text || decrypted;
            }
            replyTo = body.replyTo || replyTo;
            decryptedText = content;
          }
        }
      } catch {
        // ignore parse errors
      }
    }

    return { ...message, content, replyTo, decryptedText, media };
  };

  const decryptMediaToUri = async (msg: Message): Promise<string | null> => {
    if (!msg.media?.url || !msg.media.key || !msg.media.nonce) return null;
    try {
      const response = await fetch(msg.media.url);
      const buffer = await response.arrayBuffer();
      const cipherBytes = new Uint8Array(buffer);

      const key = util.decodeBase64(msg.media.key);
      const nonce = util.decodeBase64(msg.media.nonce);
      const plain = nacl.secretbox.open(cipherBytes, nonce, key);
      if (!plain) return null;

      if (Platform.OS === 'web') {
        const blob = new Blob([plain], { type: msg.media.mimeType || 'application/octet-stream' });
        return URL.createObjectURL(blob);
      }

      const base64 = util.encodeBase64(plain);
      const safeName = msg.media.name || `media_${Date.now()}`;
      const fileUri = `${FileSystem.cacheDirectory}dec_${safeName}`;
      await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
      return fileUri;
    } catch (error) {
      console.warn('Failed to decrypt media', error);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;
    let socket: Socket | null = null;

    const setup = async () => {
      const identity = await getOrCreateIdentityKeypair();
      if (!isMounted) return;
      setIdentityKeys(identity);

      if (otherUser?.isGroup) {
        await ensureGroupKey(identity);
      } else {
        await ensureRecipientKey();
      }

      if (!isMounted) return;
      setIsKeyReady(true);

      socket = await connectSocket();
      if (!isMounted || !socket) return;
      socketRef.current = socket;

      messageStatusManager.initialize(socket);
      messageReactionManager.initialize(socket);

      socket.emit('user:join', currentUser.id);

      socket.emit('messages:get', otherUser?.isGroup ? { groupId: otherUser._id } : { otherUserId: otherUser._id });

      socket.on('messages:history', async (history: Message[]) => {
        const hydrated = await Promise.all(history.map((msg) => hydrateMessage(msg)));
        if (!isMounted) return;
        setMessages(
          hydrated.map((msg) => ({
            ...msg,
            status: msg.isRead === true ? ('read' as MessageStatus) : ('delivered' as MessageStatus),
          })),
        );
      });

      socket.on('message:receive', async (message: Message) => {
        const hydrated = await hydrateMessage(message);
        if (!isMounted) return;
        setMessages((prev: Message[]) => [...prev, { ...hydrated, status: 'delivered' as MessageStatus }]);
        if (!otherUser?.isGroup && message.sender?._id === otherUser._id) {
          socket?.emit('messages:read', {
            senderId: otherUser._id,
            receiverId: currentUser.id,
          });
        }
      });

      socket.on('message:sent', async (message: Message) => {
        const hydrated = await hydrateMessage(message);
        if (!isMounted) return;
        setMessages((prev: Message[]) => [...prev, { ...hydrated, status: 'sent' as MessageStatus }]);
      });

      socket.on('messages:read', (receiverId: string) => {
        if (receiverId === otherUser._id) {
          setMessages((prev: Message[]) =>
            prev.map((msg: Message) =>
              msg.sender._id === currentUser.id
                ? { ...msg, status: 'read' as MessageStatus }
                : msg,
            ),
          );
        }
      });

      if (!otherUser?.isGroup) {
        socket.on('user:online', (userId: string) => {
          if (userId === otherUser._id) setIsOtherUserOnline(true);
        });

        socket.on('user:offline', (userId: string) => {
          if (userId === otherUser._id) setIsOtherUserOnline(false);
        });

        socket.emit('user:subscribe-status', otherUser._id);
        socket.emit('user:status-request', otherUser._id);

        socket.on('user:status-response', (data: { userId: string; isOnline: boolean }) => {
          if (data.userId === otherUser._id) setIsOtherUserOnline(data.isOnline);
        });
      }

      socket.on('message:reaction:add', (data: any) => {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg._id !== data.messageId) return msg;
            const reactions = { ...(msg.reactions || {}) };
            const users = new Set(reactions[data.reaction] || []);
            users.add(data.userId);
            reactions[data.reaction] = Array.from(users);
            return { ...msg, reactions };
          })
        );
      });

      socket.on('message:reaction:remove', (data: any) => {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg._id !== data.messageId || !msg.reactions) return msg;
            const reactions = { ...msg.reactions };
            const users = (reactions[data.reaction] || []).filter(id => id !== data.userId);
            if (users.length === 0) delete reactions[data.reaction];
            else reactions[data.reaction] = users;
            return { ...msg, reactions };
          })
        );
      });

      socket.on('typing:start', (senderId: string) => {
        if (!otherUser?.isGroup && senderId === otherUser._id) setIsTyping(true);
      });

      socket.on('typing:stop', (senderId: string) => {
        if (!otherUser?.isGroup && senderId === otherUser._id) setIsTyping(false);
      });
    };

    setup();

    screenshotCleanupRef.current = withScreenshotProtection(null, currentUser.firebaseUid, 'chat_screen');

    return () => {
      isMounted = false;
      if (socket) {
        socket.off('messages:history');
        socket.off('message:receive');
        socket.off('message:sent');
        socket.off('messages:read');
        socket.off('user:online');
        socket.off('user:offline');
        socket.off('user:status-response');
        socket.off('message:reaction:add');
        socket.off('message:reaction:remove');
        socket.off('typing:start');
        socket.off('typing:stop');
      }
      if (screenshotCleanupRef.current) screenshotCleanupRef.current();
    };
  }, [currentUser.id, currentUser.firebaseUid, otherUser._id, otherUser.isGroup]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!identityKeysRef.current && !groupKeyRef.current) return;
      const hydrated = await Promise.all(messagesRef.current.map((msg) => hydrateMessage(msg)));
      if (!active) return;
      setMessages((prev) =>
        hydrated.map((msg, index) => ({
          ...msg,
          status: prev[index]?.status || msg.status,
        }))
      );
    })();
    return () => {
      active = false;
    };
  }, [identityKeys, groupKey]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const pending = messagesRef.current.filter(
        (msg) => msg.media && !msg.localMediaUri && msg.media.key && msg.media.nonce
      );
      for (const msg of pending) {
        const uri = await decryptMediaToUri(msg);
        if (cancelled) return;
        if (uri) {
          setMessages((prev) =>
            prev.map((m) => (m._id === msg._id ? { ...m, localMediaUri: uri } : m))
          );
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !socketRef.current) return;
    if (!isKeyReady || !identityKeysRef.current) {
      Alert.alert(i18n.t('error'), 'Encryption keys are not ready yet.');
      return;
    }

    const tempId = Date.now().toString();
    const body = JSON.stringify({
      type: 'text',
      text: newMessage.trim(),
      replyTo: replyingTo || null,
    });

    let encryptedContent: string | null = null;

    if (otherUser?.isGroup) {
      if (!groupKeyRef.current) {
        Alert.alert(i18n.t('error'), 'Group encryption key not ready.');
        return;
      }
      const payload = encryptGroupMessage(body, groupKeyRef.current);
      encryptedContent = JSON.stringify(payload);
    } else {
      if (!recipientKey) {
        await ensureRecipientKey();
      }
      if (!recipientKey) {
        Alert.alert(i18n.t('error'), 'Recipient key not found.');
        return;
      }
      const payload = encryptForRecipient(body, recipientKey, identityKeysRef.current.publicKey);
      encryptedContent = JSON.stringify(payload);
    }

    const tempMessage: Message = {
      _id: tempId,
      sender: { _id: currentUser.id, displayName: currentUser.displayName },
      content: newMessage.trim(),
      messageType: 'text',
      createdAt: new Date().toISOString(),
      status: 'sending' as MessageStatus,
      ...(replyingTo && { replyTo: replyingTo })
    };

    setMessages((prev: Message[]) => [...prev, tempMessage]);
    messageStatusManager.trackMessageSending(tempId);

    socketRef.current.emit('message:send', {
      _id: tempId,
      senderId: currentUser.id,
      receiverId: otherUser.isGroup ? undefined : otherUser._id,
      groupId: otherUser.isGroup ? otherUser._id : undefined,
      content: encryptedContent,
      messageType: 'text' as const,
    });

    setNewMessage('');
    setReplyingTo(null);
  };

  const handleMediaUpload = async (mediaType: 'image' | 'video' | 'document') => {
    if (isUploading) return;
    setIsUploading(true);
    let picked: PickedMedia | null = null;

    try {
      if (mediaType === 'document') {
        picked = await pickDocument();
      } else {
        const choice = await new Promise<'camera' | 'library' | null>((resolve) => {
          Alert.alert(i18n.t('chooseSource'), '', [
            { text: i18n.t('camera'), onPress: () => resolve('camera') },
            { text: i18n.t('library'), onPress: () => resolve('library') },
            { text: i18n.t('cancel'), style: 'cancel', onPress: () => resolve(null) },
          ]);
        });
        if (!choice) {
          setIsUploading(false);
          return;
        }
        if (mediaType === 'image') picked = choice === 'camera' ? await takePhoto() : await pickImage();
        else picked = choice === 'camera' ? await takeVideo() : await pickVideo();
      }

      if (picked) {
        if (!isKeyReady || !identityKeysRef.current) {
          Alert.alert(i18n.t('error'), 'Encryption keys are not ready yet.');
          return;
        }

        const upload = await uploadEncryptedFile(picked);
        if (!upload.success || !upload.url || !upload.key || !upload.nonce) {
          Alert.alert(i18n.t('error'), upload.error || i18n.t('uploadFailed'));
          return;
        }

        const payloadBody = JSON.stringify({
          type: 'media',
          caption: newMessage.trim() || '',
          replyTo: replyingTo || null,
          media: {
            url: upload.url,
            mediaType: picked.type === 'file' ? 'document' : picked.type,
            key: upload.key,
            nonce: upload.nonce,
            name: picked.name,
            mimeType: picked.mimeType,
          },
        });

        let encryptedContent: string | null = null;
        if (otherUser?.isGroup) {
          if (!groupKeyRef.current) {
            Alert.alert(i18n.t('error'), 'Group encryption key not ready.');
            return;
          }
          const payload = encryptGroupMessage(payloadBody, groupKeyRef.current);
          encryptedContent = JSON.stringify(payload);
        } else {
          if (!recipientKey) {
            await ensureRecipientKey();
          }
          if (!recipientKey) {
            Alert.alert(i18n.t('error'), 'Recipient key not found.');
            return;
          }
          const payload = encryptForRecipient(payloadBody, recipientKey, identityKeysRef.current.publicKey);
          encryptedContent = JSON.stringify(payload);
        }

        const tempId = `media_${Date.now()}`;
        const tempMessage: Message = {
          _id: tempId,
          sender: { _id: currentUser.id, displayName: currentUser.displayName },
          content: '[media]',
          messageType: picked.type === 'file' ? 'document' : picked.type,
          createdAt: new Date().toISOString(),
          status: 'sending' as MessageStatus,
          media: {
            url: upload.url,
            mediaType: picked.type === 'file' ? 'document' : picked.type,
            key: upload.key,
            nonce: upload.nonce,
            name: picked.name,
            mimeType: picked.mimeType,
          },
          ...(replyingTo && { replyTo: replyingTo }),
        };

        setMessages((prev) => [...prev, tempMessage]);

        socketRef.current?.emit('message:send', {
          _id: tempId,
          senderId: currentUser.id,
          receiverId: otherUser.isGroup ? undefined : otherUser._id,
          groupId: otherUser.isGroup ? otherUser._id : undefined,
          content: encryptedContent,
          messageType: picked.type === 'file' ? 'document' : picked.type,
        });

        setNewMessage('');
        setReplyingTo(null);
      }
    } catch (error) {
      console.error(error);
      Alert.alert(i18n.t('error'), i18n.t('uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  const [isCurrentlyTyping, setIsCurrentlyTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const handleTyping = (text: string) => {
    setNewMessage(text);
    if (socketRef.current) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      if (text.length > 0 && !isCurrentlyTyping) {
        setIsCurrentlyTyping(true);
        socketRef.current.emit('typing:start', {
          senderId: currentUser.id,
          receiverId: otherUser.isGroup ? undefined : otherUser._id,
          groupId: otherUser.isGroup ? otherUser._id : undefined,
        });
      } else if (text.length === 0 && isCurrentlyTyping) {
        setIsCurrentlyTyping(false);
        socketRef.current.emit('typing:stop', {
          senderId: currentUser.id,
          receiverId: otherUser.isGroup ? undefined : otherUser._id,
          groupId: otherUser.isGroup ? otherUser._id : undefined,
        });
      }
      
      if (text.length > 0) {
        typingTimeoutRef.current = setTimeout(() => {
          if (isCurrentlyTyping && socketRef.current) {
            setIsCurrentlyTyping(false);
            socketRef.current.emit('typing:stop', {
              senderId: currentUser.id,
              receiverId: otherUser.isGroup ? undefined : otherUser._id,
              groupId: otherUser.isGroup ? otherUser._id : undefined,
            });
          }
        }, 2000);
      }
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.sender._id === currentUser.id;
    const isMedia = !!item.media || (item.messageType && ['image', 'video', 'file', 'document'].includes(item.messageType));

    return (
      <View style={[styles.messageRow, isMyMessage ? styles.rowEnd : styles.rowStart]}>
        {!isMyMessage && (
          <Image 
            source={{ uri: otherUser.photoURL || 'https://via.placeholder.com/30' }} 
            style={styles.messageAvatar} 
          />
        )}
        <View style={[
          styles.messageBubble, 
          isMyMessage ? styles.myMessage : [styles.otherMessage, { backgroundColor: colors.secondary, borderColor: colors.border }],
          isMedia ? { padding: 0, overflow: 'hidden' } : {}
        ]}>
          {isMyMessage ? (
             <LinearGradient
              colors={['#3797F0', '#3797F0']}
              style={styles.gradientBubble}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {renderMessageContent(item, isMedia, true)}
            </LinearGradient>
          ) : (
            renderMessageContent(item, isMedia, false)
          )}
        </View>
      </View>
    );
  };

  const renderMessageContent = (item: Message, isMedia: boolean | undefined, isMyMessage: boolean) => {
    const displayText = item.decryptedText || item.content;

    const renderMedia = () => {
      if (!item.media) return null;
      if (item.media.mediaType === 'image' && item.localMediaUri) {
        return (
          <Image
            source={{ uri: item.localMediaUri }}
            style={{ width: 220, height: 220, borderRadius: 12 }}
            resizeMode="cover"
          />
        );
      }

      const openUrl = item.localMediaUri || item.media.url;
      return (
        <TouchableOpacity onPress={() => Linking.openURL(openUrl)} activeOpacity={0.8}>
          <View style={[styles.mediaRowBubble, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Ionicons
              name={item.media.mediaType === 'video' ? 'play-circle-outline' : item.media.mediaType === 'document' ? 'document-text-outline' : 'attach-outline'}
              size={18}
              color={colors.text}
            />
            <Text style={[styles.mediaRowText, { color: colors.text }]}>
              {item.media.name || item.media.mediaType.toUpperCase()}
            </Text>
            <Text style={[styles.mediaRowOpen, { color: colors.primary }]}>Open</Text>
          </View>
        </TouchableOpacity>
      );
    };

    return (
      <View style={!isMedia ? styles.textContainer : undefined}>
        {item.replyTo && (
          <View style={[styles.replyPreview, isMyMessage ? styles.replyPreviewMy : [styles.replyPreviewOther, { borderLeftColor: colors.border }]]}>
            <Text style={[styles.replySender, isMyMessage ? { color: 'rgba(255,255,255,0.9)' } : { color: colors.mutedText }]}>
              {item.replyTo.senderName}
            </Text>
            <Text style={[styles.replyContent, isMyMessage ? { color: 'rgba(255,255,255,0.8)' } : { color: colors.mutedText }]} numberOfLines={1}>
              {item.replyTo.content}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onLongPress={() => {
            Alert.alert(i18n.t('options'), '', [
              { text: i18n.t('reply'), onPress: () => setReplyingTo({ messageId: item._id, senderName: item.sender.displayName, content: displayText }) },
              { text: i18n.t('react'), onPress: () => showReactionPicker(item._id) },
              { text: i18n.t('copy'), onPress: () => Clipboard.setStringAsync(displayText) },
              { text: i18n.t('cancel'), style: 'cancel' }
            ]);
          }}
          activeOpacity={0.9}
          accessibilityLabel={displayText}
          accessibilityRole="text"
        >
          {item.media ? (
            renderMedia()
          ) : (
            <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : { color: colors.text }]}>
              {isMedia && item.messageType ? `[${item.messageType.toUpperCase()}]` : displayText}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.messageFooter}>
            {item.reactions && Object.keys(item.reactions).length > 0 && (
            <View style={styles.reactionsContainer}>
              {Object.entries(item.reactions).map(([reaction, users]) => (
                <View key={reaction} style={[styles.reactionBubble, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                  <Text style={styles.reactionText}>{reaction}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          onPress={onBack} 
          style={styles.backButton}
          accessibilityLabel={i18n.t('goBack')}
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={30} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatarContainer}>
            <Image 
              source={{ uri: otherUser.photoURL || 'https://via.placeholder.com/40' }} 
              style={styles.headerAvatar} 
            />
            {isOtherUserOnline && <View style={[styles.onlineBadgeHeader, { borderColor: colors.background }]} />}
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{otherUser.displayName}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.mutedText }]}>
              {isTyping ? i18n.t('typing') : (isOtherUserOnline ? i18n.t('activeNow') : i18n.t('activeAgo'))}
            </Text>
          </View>
        </View>

        <View style={styles.headerIcons}>
          <TouchableOpacity 
            onPress={() => {
              onStartCall?.({
                receiverId: otherUser._id,
                type: 'audio',
                receiverName: otherUser.displayName,
                receiverAvatar: otherUser.photoURL,
              });
            }} 
            style={styles.iconButton}
            accessibilityLabel="Voice call"
            accessibilityRole="button"
          >
            <Ionicons name="call-outline" size={28} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => {
              onStartCall?.({
                receiverId: otherUser._id,
                type: 'video',
                receiverName: otherUser.displayName,
                receiverAvatar: otherUser.photoURL,
              });
            }} 
            style={styles.iconButton}
            accessibilityLabel="Video call"
            accessibilityRole="button"
          >
            <Ionicons name="videocam-outline" size={30} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          showsVerticalScrollIndicator={false}
        />

        {replyingTo && (
          <View style={[styles.replyingBar, { backgroundColor: colors.secondary, borderTopColor: colors.border }]}>
            <View style={styles.replyingBarContent}>
              <Text style={[styles.replyingTitle, { color: colors.mutedText }]}>Replying to {replyingTo.senderName}</Text>
              <Text numberOfLines={1} style={[styles.replyingText, { color: colors.mutedText }]}>{replyingTo.content}</Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)} accessibilityLabel={i18n.t('cancel')} accessibilityRole="button">
              <Ionicons name="close" size={24} color={colors.mutedText} />
            </TouchableOpacity>
          </View>
        )}

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={[styles.inputWrapper, { backgroundColor: colors.background }]}>
            <TouchableOpacity 
              style={styles.mediaButton} 
              onPress={() => handleMediaUpload('image')}
              accessibilityLabel={i18n.t('camera')}
              accessibilityRole="button"
            >
              <View style={styles.mediaIconCircle}>
                <Ionicons name="camera" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
            
            <View style={[styles.inputContainer, { backgroundColor: colors.secondary }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={i18n.t('typeMessage')}
                placeholderTextColor={colors.mutedText}
                value={newMessage}
                onChangeText={handleTyping}
                multiline
                accessibilityLabel={i18n.t('typeMessage')}
              />
              <TouchableOpacity 
                onPress={() => handleMediaUpload('document')} 
                style={{ marginRight: 10 }}
                accessibilityLabel={i18n.t('library')}
                accessibilityRole="button"
              >
                 <Ionicons name="images-outline" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {newMessage.trim().length > 0 ? (
              <TouchableOpacity 
                onPress={sendMessage} 
                style={styles.sendTextButton}
                accessibilityLabel={i18n.t('send')}
                accessibilityRole="button"
              >
                <Text style={styles.sendText}>{i18n.t('send')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.micButton} accessibilityLabel={i18n.t('tapToTalk')} accessibilityRole="button">
                <Ionicons name="mic-outline" size={28} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    height: 60,
  },
  backButton: {
    marginRight: 15,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatarContainer: {
    position: 'relative',
    marginRight: 10,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  onlineBadgeHeader: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00d000',
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 1.5,
  },
  headerTextContainer: {
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 11,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  iconButton: {
    padding: 2,
  },
  contentContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 15,
    paddingVertical: 20,
  },
  messageRow: {
    width: '100%',
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  rowEnd: {
    justifyContent: 'flex-end',
  },
  rowStart: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    marginBottom: 4,
    backgroundColor: '#f0f0f0',
  },
  messageBubble: {
    maxWidth: '70%',
    borderRadius: 22,
    overflow: 'hidden',
  },
  myMessage: {
    // Background handled by LinearGradient
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  gradientBubble: {
    padding: 12,
    paddingHorizontal: 16,
  },
  textContainer: {
    padding: 12,
    paddingHorizontal: 16,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  mediaRowBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  mediaRowText: {
    fontSize: 12,
    fontWeight: '600',
  },
  mediaRowOpen: {
    marginLeft: 'auto',
    fontSize: 12,
    fontWeight: '700',
  },
  reactionBubble: {
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginRight: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  reactionText: {
    fontSize: 10,
  },
  replyPreview: {
    borderLeftWidth: 2,
    paddingLeft: 8,
    marginBottom: 6,
  },
  replyPreviewMy: {
    borderLeftColor: 'rgba(255,255,255,0.5)',
  },
  replyPreviewOther: {
    // Color handled inline
  },
  replySender: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  replyContent: {
    fontSize: 11,
  },
  // Input Area
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingBottom: Platform.OS === 'ios' ? 10 : 10,
  },
  mediaButton: {
    marginRight: 10,
  },
  mediaIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3797F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 8,
    minHeight: 44,
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 10,
  },
  sendTextButton: {
    paddingHorizontal: 5,
  },
  sendText: {
    color: '#3797F0',
    fontWeight: '600',
    fontSize: 16,
  },
  micButton: {
    
  },
  replyingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 0.5,
  },
  replyingBarContent: {
    flex: 1,
    paddingRight: 10,
  },
  replyingTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  replyingText: {
    fontSize: 12,
  },
  statusContainer: {
    marginLeft: 4,
  }
});
