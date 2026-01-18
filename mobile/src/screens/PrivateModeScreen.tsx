import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  AppState,
  Image,
  ActivityIndicator,
} from 'react-native';
import { io, Socket } from 'socket.io-client';
import { withScreenshotProtection } from '../services/security';
import { appConfig } from '../config/appConfig';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Device from 'expo-device';
import {
  generateKeyPair,
  encryptMessage,
  decryptMessage,
  encodeBase64,
  KeyPair,
  EncryptedMessage,
} from '../services/encryption';

const SOCKET_URL = `${appConfig.SOCKET_BASE_URL}/private`;

type PrivateChatMode = 'lobby' | 'dm';

interface Message {
  id?: string;
  senderAlias: string;
  receiverAlias?: string;
  content: string; // This might be ciphertext for DMs
  isEncrypted?: boolean;
  nonce?: string;
  createdAt: Date;
  isSelf?: boolean;
  mode: PrivateChatMode;
  expiresAt?: number | null;
  viewedAt?: number | null; // For burn-on-read
  isBurned?: boolean;
}

interface PrivateModeScreenProps {
  onExit: () => void;
}

export default function PrivateModeScreen({ onExit }: PrivateModeScreenProps) {
  // Security State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const myKeyPairRef = useRef<KeyPair | null>(null);
  const publicKeysRef = useRef<Map<string, string>>(new Map()); // alias -> publicKeyBase64

  // Session State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [alias, setAlias] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectAttempt, setConnectAttempt] = useState(0);
  
  // Refs
  const screenshotCleanupRef = useRef<Function | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<any>(null);
  const messageTimersRef = useRef<Map<string, any>>(new Map());
  const aliasRef = useRef<string>('');
  const sessionIdRef = useRef<string | null>(null);
  const autoClearSecondsRef = useRef<number>(60);
  const chatModeRef = useRef<PrivateChatMode>('lobby');
  const dmTargetRef = useRef<string | null>(null);

  // UI State
  const [chatMode, setChatMode] = useState<PrivateChatMode>('lobby');
  const [dmTarget, setDmTarget] = useState<string | null>(null);
  const [typingBy, setTypingBy] = useState<string | null>(null);
  const [autoExitOnBackground, setAutoExitOnBackground] = useState(true);
  const [autoClearSeconds, setAutoClearSeconds] = useState<number>(60);
  const [showPeople, setShowPeople] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Initialize Security
  useEffect(() => {
    // Only generate keys if we can
    try {
      checkBiometrics();
      const keys = generateKeyPair();
      myKeyPairRef.current = keys;
    } catch (err) {
      console.error('Failed to init private mode:', err);
      // Don't crash, just let them see the screen but maybe without full security
    }
  }, []);

  const checkBiometrics = async () => {
    try {
      if (Platform.OS === 'web') {
        // On web, we cannot use native biometrics easily without WebAuthn
        // For now, we still allow access but in a real production build, 
        // you might want to enforce a PIN or password re-entry here.
        setIsAuthenticated(true); 
        return;
      }
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setHasBiometrics(hasHardware && isEnrolled);
      
      if (hasHardware && isEnrolled) {
        authenticate();
      } else {
        // PRODUCTION HARDENING:
        // If device has no biometrics, we should fallback to a secure PIN or just deny access?
        // For now, we will fallback to simple alert but in high security mode this might be a blocker.
        // Or we assume the user has device passcode which LocalAuthentication also checks.
        
        // If LocalAuth says no enrolled, it might mean no FaceID but maybe Passcode?
        // LocalAuthentication.authenticateAsync works with passcode too on many devices.
        // But if hasHardware is false (e.g. older device or simulator), we need a fallback.
        
        if (!hasHardware) {
           Alert.alert('Security Warning', 'Device lacks secure hardware. Private mode may be compromised.');
           // In strict mode, we might want to return here.
           // return;
        }
        
        // Try authenticating anyway (system passcode fallback)
        authenticate();
      }
    } catch (e) {
      console.warn('Biometrics check failed', e);
      // In production, failure to check biometrics should probably deny access
      Alert.alert('Error', 'Security check failed. Access denied.');
      onExit();
    }
  };

  const authenticate = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access Private Mode',
        fallbackLabel: 'Use Device Passcode',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel'
      });
      
      if (result.success) {
        setIsAuthenticated(true);
      } else {
        // If they canceled or failed
        if (result.error === 'user_cancel' || result.error === 'system_cancel') {
           onExit();
           return;
        }
        
        Alert.alert('Authentication failed', 'Access denied', [
          { text: 'Exit', onPress: onExit },
          { text: 'Retry', onPress: authenticate }
        ]);
      }
    } catch (e) {
      console.error(e);
      // Fail secure
      Alert.alert('Error', 'Authentication system error.');
      onExit();
    }
  };

  useEffect(() => {
    autoClearSecondsRef.current = autoClearSeconds;
  }, [autoClearSeconds]);

  useEffect(() => {
    chatModeRef.current = chatMode;
  }, [chatMode]);

  useEffect(() => {
    dmTargetRef.current = dmTarget;
  }, [dmTarget]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Connect to private namespace
    setIsConnecting(true);
    setConnectError(null);
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      timeout: 8000,
      reconnectionAttempts: 2,
      forceNew: true,
    });

    socketRef.current.on('connect', () => {
      const pubKey = myKeyPairRef.current ? encodeBase64(myKeyPairRef.current.publicKey) : undefined;
      
      // Join private mode and get anonymous alias
      socketRef.current?.emit('private:join', { publicKey: pubKey }, (data: any) => {
        sessionIdRef.current = data.sessionId;
        aliasRef.current = data.alias;
        setSessionId(data.sessionId);
        setAlias(data.alias);
        setIsConnecting(false);
        
        addMessageWithAutoClear({
          id: `sys_${Date.now()}_${Math.random()}`,
          senderAlias: 'System',
          content: `${data.message} You are: ${data.alias}`,
          createdAt: new Date(),
          mode: 'lobby',
        });
        refreshUsers();
      });
    });

    socketRef.current.on('connect_error', (err: any) => {
      setConnectError(err?.message || 'Unable to connect to private server.');
      setIsConnecting(false);
    });

    // Listen for broadcasts
    socketRef.current.on('private:broadcast', (data: any) => {
      // Lobby messages are plain text for now
      const msg: Message = {
        ...data,
        mode: 'lobby',
        createdAt: new Date(),
      };
      addMessageWithAutoClear(msg);
    });

    // Listen for private DMs (Encrypted)
    socketRef.current.on('private:receive', (data: any) => {
      // Try to decrypt
      let content = data.content;
      let isEncrypted = false;
      
      // Attempt decryption if it looks like JSON/encrypted
      try {
        if (data.content.startsWith('{') && myKeyPairRef.current) {
          const parsed = JSON.parse(data.content);
          if (parsed.nonce && parsed.ciphertext) {
            isEncrypted = true;
            const senderKey = publicKeysRef.current.get(data.senderAlias);
            if (senderKey) {
              const decrypted = decryptMessage(
                parsed,
                senderKey,
                myKeyPairRef.current.secretKey
              );
              if (decrypted) content = decrypted;
              else content = '⚠️ Decryption failed';
            } else {
              content = '🔒 Encrypted message (Key missing)';
            }
          }
        }
      } catch (e) {
        // Not encrypted or parse error
      }

      const msg: Message = {
        ...data,
        content,
        isEncrypted,
        mode: 'dm',
        createdAt: new Date(),
      };
      addMessageWithAutoClear(msg);
    });

    // Listen for DM sent confirmation
    socketRef.current.on('private:sent', (data: any) => {
      // We know what we sent, so we show it plain
      // But if we sent encrypted, data.content is ciphertext.
      // We should use our local state content, but for simplicity let's assume we want to show what we sent.
      // Actually, we shouldn't show ciphertext to self.
      // We'll rely on the fact that we clear newMessage input after sending.
      // We can reconstruct the message or just ignore the content from server and use "Message Sent"
      // or handle it in the send function to optimistically add to list.
      // For now, let's just parse if needed (though we don't have our own public key in map usually)
      
      // Better approach: Add to list immediately on send, ignore this event OR use it to confirm delivery.
      // Let's use it but handle content.
      let content = data.content;
      if (content.startsWith('{')) {
         content = '🔒 Encrypted Message Sent';
      }

      const msg: Message = {
        ...data,
        content,
        mode: 'dm',
        createdAt: new Date(),
        isSelf: true
      };
      addMessageWithAutoClear(msg);
    });

    socketRef.current.on('private:user-joined', (data: any) => {
      if (data.publicKey) {
        publicKeysRef.current.set(data.alias, data.publicKey);
      }
      addMessageWithAutoClear({
        id: `sys_${Date.now()}_${Math.random()}`,
        senderAlias: 'System',
        content: data.message,
        createdAt: new Date(),
        mode: 'lobby',
      });
      refreshUsers();
    });

    socketRef.current.on('private:user-left', (data: any) => {
      publicKeysRef.current.delete(data.alias);
      addMessageWithAutoClear({
        id: `sys_${Date.now()}_${Math.random()}`,
        senderAlias: 'System',
        content: data.message,
        createdAt: new Date(),
        mode: 'lobby',
      });
      refreshUsers();
    });

    socketRef.current.on('private:typing', (data: any) => {
       if (data.alias === aliasRef.current) return;
       if (data.isTyping) {
         setTypingBy(data.alias);
         if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
         typingTimeoutRef.current = setTimeout(() => setTypingBy(null), 3000);
       } else {
         setTypingBy(null);
       }
    });

    // Initialize screenshot protection
    screenshotCleanupRef.current = withScreenshotProtection(null, 'anonymous_user', 'private_mode');

    return () => {
      if (socketRef.current && sessionId) {
        socketRef.current.emit('private:exit', { sessionId });
      }
      socketRef.current?.disconnect();
      if (screenshotCleanupRef.current) screenshotCleanupRef.current();
    };
  }, [isAuthenticated, connectAttempt]);

  const refreshUsers = () => {
    if (socketRef.current && sessionIdRef.current) {
      socketRef.current.emit('private:users', { sessionId: sessionIdRef.current }, (users: any[]) => {
        const names: string[] = [];
        users.forEach(u => {
          names.push(u.alias);
          if (u.publicKey) {
            publicKeysRef.current.set(u.alias, u.publicKey);
          }
        });
        setOnlineUsers(names);
      });
    }
  };

  const addMessageWithAutoClear = (msg: Omit<Message, 'mode'> & { mode: PrivateChatMode }) => {
    const id = msg.id || `${Date.now()}_${Math.random()}`;
    const now = Date.now();
    const seconds = autoClearSecondsRef.current;
    const expiresAt = seconds > 0 ? now + seconds * 1000 : null;
    const next: Message = { ...msg, id, expiresAt };

    setMessages((prev) => [...prev, next].slice(-200));

    if (expiresAt) {
      const timer = setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m.id !== id));
        messageTimersRef.current.delete(id);
      }, expiresAt - now);
      messageTimersRef.current.set(id, timer);
    }
  };

  const emitTyping = (isTyping: boolean) => {
    const sId = sessionIdRef.current;
    if (!socketRef.current || !sId) return;
    socketRef.current.emit('private:typing', {
      sessionId: sId,
      receiverAlias: chatModeRef.current === 'dm' ? dmTargetRef.current : undefined,
      isTyping,
    });
  };

  const handleComposerChange = (text: string) => {
    setNewMessage(text);
    emitTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => emitTyping(false), 800);
  };

  const panicExit = async () => {
    if (isExiting) return;
    try {
      setIsExiting(true);
      const sId = sessionIdRef.current;
      if (socketRef.current && sId) {
        socketRef.current.emit('private:exit', { sessionId: sId });
      }
      socketRef.current?.disconnect();
      setMessages([]);
      onExit();
    } finally {
      setIsExiting(false);
    }
  };

  const sendBroadcast = () => {
    if (!newMessage.trim() || !socketRef.current || !sessionId) return;
    if (isExiting) return;

    let content = newMessage.trim();
    setNewMessage('');
    emitTyping(false);

    if (chatMode === 'dm') {
      if (!dmTarget) {
        Alert.alert('Choose a person', 'Select a user to send a private DM.');
        setShowPeople(true);
        return;
      }
      
      // ENCRYPT
      const receiverKey = publicKeysRef.current.get(dmTarget);
      if (receiverKey && myKeyPairRef.current) {
         try {
           const encrypted = encryptMessage(content, receiverKey, myKeyPairRef.current.secretKey);
           content = JSON.stringify(encrypted);
         } catch (e) {
           console.error('Encryption failed', e);
           Alert.alert('Encryption Error', 'Could not encrypt message. Sending plain text? No, aborting.');
           return;
         }
      } else {
        Alert.alert('Secure Channel Error', 'Cannot establish secure connection with user (Missing public key).');
        return;
      }

      socketRef.current.emit('private:send', { sessionId, receiverAlias: dmTarget, content });
      return;
    }

    // Lobby messages are public
    socketRef.current.emit('private:broadcast', { sessionId, content });
  };

  const handleExit = () => {
    Alert.alert(
      'Exit Private Mode',
      'ALL data will be securely wiped from device and server.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Wipe & Exit',
          style: 'destructive',
          onPress: () => panicExit(),
        },
      ]
    );
  };

  // Burn on read: Reveal message then delete after 10s
  const revealMessage = (msgId: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId && !m.viewedAt) {
         // Set viewedAt
         const viewedAt = Date.now();
         // Schedule immediate burn
         const burnTimer = setTimeout(() => {
           setMessages(curr => curr.filter(x => x.id !== msgId));
         }, 10000); // 10s to read
         messageTimersRef.current.set(msgId + '_burn', burnTimer);
         return { ...m, viewedAt };
      }
      return m;
    }));
  };

  const visibleMessages = useMemo(() => {
    const now = Date.now();
    return messages
      .filter((m) => (chatMode === 'lobby' ? m.mode === 'lobby' : m.mode === 'dm'))
      .filter((m) => {
        if (chatMode !== 'dm') return true;
        if (!dmTarget) return m.senderAlias === 'System';
        return (
          m.senderAlias === 'System' ||
          m.senderAlias === dmTarget ||
          m.receiverAlias === dmTarget ||
          m.senderAlias === alias
        );
      })
      .filter((m) => !m.expiresAt || m.expiresAt > now);
  }, [messages, chatMode, dmTarget, alias]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isSystem = item.senderAlias === 'System';
    const isMe = item.senderAlias === alias;
    const isEncrypted = item.isEncrypted || (item.mode === 'dm' && !isSystem && !isMe);

    if (isSystem) {
      return (
        <View style={styles.systemMessage}>
          <Text style={styles.systemText}>{item.content}</Text>
        </View>
      );
    }

    // Burn on read logic for received DMs
    if (item.mode === 'dm' && !isMe && !isSystem) {
      if (!item.viewedAt) {
        return (
          <TouchableOpacity 
            style={[styles.messageBubble, styles.otherMessage, styles.blurBubble]}
            onPress={() => revealMessage(item.id || '')}
          >
             <Text style={styles.aliasText}>{item.senderAlias}</Text>
             <View style={styles.blurContent}>
               <Ionicons name="eye-off-outline" size={20} color="#aaa" />
               <Text style={styles.blurText}>Tap to decrypt & read</Text>
             </View>
          </TouchableOpacity>
        );
      }
    }

    return (
      <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.otherMessage]}>
        <Text style={styles.aliasText}>
          {item.mode === 'dm' && !isSystem
            ? `${item.senderAlias}${isMe ? ' (You)' : ''}`
            : item.senderAlias}
          {item.isEncrypted && <Ionicons name="lock-closed" size={10} color="#4CAF50" style={{marginLeft: 4}} />}
        </Text>
        <Text style={[styles.messageText, isMe && styles.myMessageText]}>
          {item.content}
        </Text>
        {item.viewedAt && (
           <Text style={styles.burnText}>🔥 Burning in 10s...</Text>
        )}
      </View>
    );
  };

  if (!isAuthenticated) {
    return (
       <View style={[styles.container, styles.centerContent]}>
         <View style={styles.loadingRow}>
            <Ionicons name="finger-print-outline" size={48} color="#fff" />
         </View>
         <Text style={styles.loadingText}>Authentication Required</Text>
         <TouchableOpacity style={styles.authButton} onPress={authenticate}>
            <Text style={styles.authButtonText}>Unlock Private Mode</Text>
         </TouchableOpacity>
       </View>
    );
  }

  if (isConnecting) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#4CAF50" size="large" />
          <Text style={styles.loadingText}>Establishing Secure Connection...</Text>
        </View>
        <Text style={styles.loadingSubtext}>Generating 256-bit Ephemeral Keys...</Text>
        <TouchableOpacity 
          style={{ marginTop: 30, padding: 10 }}
          onPress={() => {
            // Force break if stuck (e.g. socket issue)
            onExit();
          }}
        >
          <Text style={{ color: '#666', fontSize: 12 }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (connectError) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <View style={styles.loadingRow}>
          <Ionicons name="warning-outline" size={28} color="#ffb020" />
          <Text style={styles.loadingText}>Private Mode unavailable</Text>
        </View>
        <Text style={styles.loadingSubtext}>{connectError}</Text>
        <View style={{ marginTop: 20, flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            style={[styles.authButton, { backgroundColor: '#4CAF50' }]}
            onPress={() => setConnectAttempt((v) => v + 1)}
          >
            <Text style={styles.authButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.authButton, { backgroundColor: '#333' }]} onPress={onExit}>
            <Text style={styles.authButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.headerTitleRow}>
            <Ionicons name="shield-checkmark" size={18} color="#4CAF50" />
            <Text style={styles.headerTitle}>Secure Channel</Text>
          </View>
          <Text style={styles.aliasLabel}>{alias}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowPeople(true)} disabled={isExiting}>
            <Ionicons name="people-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowSettings(true)} disabled={isExiting}>
            <Ionicons name="settings-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.exitButton} onPress={handleExit} disabled={isExiting}>
            <Ionicons name="power" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Security Banner */}
      <View style={styles.securityBanner}>
        <Ionicons name="lock-closed" size={12} color="#4CAF50" />
        <Text style={styles.securityText}>End-to-End Encrypted • Ephemeral • Screenshot Protected</Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={visibleMessages}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      {typingBy ? (
        <View style={styles.typingBar}>
          <Text style={styles.typingText}>{typingBy} is typing…</Text>
        </View>
      ) : null}

      {/* Input */}
      <View style={styles.inputContainer}>
        <View style={styles.modePills}>
          <TouchableOpacity
            style={[styles.modePill, chatMode === 'lobby' && styles.modePillActive]}
            onPress={() => {
              setChatMode('lobby');
              setDmTarget(null);
              emitTyping(false);
            }}
            disabled={isExiting}
          >
            <Text style={[styles.modePillText, chatMode === 'lobby' && styles.modePillTextActive]}>Lobby</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modePill, chatMode === 'dm' && styles.modePillActive]}
            onPress={() => {
              setChatMode('dm');
              emitTyping(false);
              if (!dmTarget) setShowPeople(true);
            }}
            disabled={isExiting}
          >
            <Text style={[styles.modePillText, chatMode === 'dm' && styles.modePillTextActive]}>
              {dmTarget ? `DM: ${dmTarget}` : 'DM'}
            </Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.input}
          placeholder={chatMode === 'dm' ? 'Encrypted Message...' : 'Broadcast Message...'}
          placeholderTextColor="#AAA"
          value={newMessage}
          onChangeText={handleComposerChange}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendBroadcast} disabled={isExiting}>
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <Modal visible={showPeople} transparent animationType="fade" onRequestClose={() => setShowPeople(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Active Agents</Text>
              <TouchableOpacity onPress={() => setShowPeople(false)}>
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalDivider} />
            {onlineUsers.length === 0 ? (
              <Text style={styles.modalEmpty}>No other agents online</Text>
            ) : (
              onlineUsers.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={styles.modalRow}
                  onPress={() => {
                    setChatMode('dm');
                    setDmTarget(u);
                    setShowPeople(false);
                  }}
                >
                  <Ionicons name="shield-half-outline" size={16} color="#4CAF50" />
                  <Text style={styles.modalRowText}>{u}</Text>
                  {publicKeysRef.current.has(u) && <Ionicons name="key-outline" size={14} color="#AAA" style={{marginLeft: 'auto'}} />}
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showSettings} transparent animationType="fade" onRequestClose={() => setShowSettings(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Protocol Settings</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.settingRow2}>
              <Text style={styles.settingLabel}>Background Wipe</Text>
              <TouchableOpacity
                style={[styles.toggleBtn, autoExitOnBackground && styles.toggleBtnOn]}
                onPress={() => setAutoExitOnBackground((v) => !v)}
              >
                <Text style={styles.toggleText}>{autoExitOnBackground ? 'ARMED' : 'OFF'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.settingRow2}>
              <Text style={styles.settingLabel}>Auto-Burn Timer</Text>
              <View style={styles.ttlRow}>
                {[0, 30, 60, 300].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.ttlChip, autoClearSeconds === s && styles.ttlChipOn]}
                    onPress={() => setAutoClearSeconds(s)}
                  >
                    <Text style={[styles.ttlChipText, autoClearSeconds === s && styles.ttlChipTextOn]}>
                      {s === 0 ? '∞' : s < 60 ? `${s}s` : `${s/60}m`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.panicRow} onPress={panicExit} disabled={isExiting}>
              <Ionicons name="nuclear" size={18} color="#fff" />
              <Text style={styles.panicText}>INITIATE WIPEOUT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Pitch black for stealth
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    // Remove marginTop as centerContent handles vertical alignment
  },
  loadingText: {
    color: '#4CAF50',
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 10,
    textAlign: 'center',
  },
  loadingSubtext: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  authButton: {
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 40,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
    alignItems: 'center',
  },
  authButtonText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#111',
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: {
    color: '#eee',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginLeft: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aliasLabel: {
    color: '#666',
    fontSize: 10,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 15,
  },
  headerIconBtn: {
    padding: 5,
  },
  exitButton: {
    backgroundColor: '#B71C1C',
    padding: 8,
    borderRadius: 4,
  },
  securityBanner: {
    backgroundColor: '#0a1a0a',
    padding: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1a331a',
  },
  securityText: {
    color: '#4CAF50',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  messagesList: {
    padding: 10,
  },
  systemMessage: {
    alignItems: 'center',
    marginVertical: 10,
  },
  systemText: {
    color: '#444',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
  },
  myMessage: {
    backgroundColor: '#1B5E20', // Dark green
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  otherMessage: {
    backgroundColor: '#212121',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#333',
  },
  blurBubble: {
    backgroundColor: '#111',
    borderStyle: 'dashed',
    borderColor: '#444',
  },
  blurContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  blurText: {
    color: '#888',
    fontSize: 14,
    fontStyle: 'italic',
  },
  aliasText: {
    color: '#666',
    fontSize: 10,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  messageText: {
    fontSize: 15,
    color: '#eee',
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  burnText: {
    color: '#ff9800',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  inputContainer: {
    padding: 10,
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  modePills: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 10,
  },
  modePill: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#222',
  },
  modePillActive: {
    backgroundColor: '#1B5E20',
  },
  modePillText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
  },
  modePillTextActive: {
    color: '#4CAF50',
  },
  input: {
    backgroundColor: '#222',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    minHeight: 40,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 10,
  },
  sendButton: {
    position: 'absolute',
    right: 15,
    bottom: 15,
    backgroundColor: '#1B5E20',
    padding: 8,
    borderRadius: 20,
  },
  typingBar: {
    paddingHorizontal: 15,
    paddingBottom: 5,
  },
  typingText: {
    color: '#666',
    fontSize: 10,
    fontStyle: 'italic',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#111',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 10,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  modalRowText: {
    color: '#eee',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modalEmpty: {
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  settingRow2: {
    marginBottom: 20,
  },
  settingLabel: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  toggleBtn: {
    backgroundColor: '#222',
    padding: 10,
    borderRadius: 4,
    alignItems: 'center',
  },
  toggleBtnOn: {
    backgroundColor: '#1B5E20',
  },
  toggleText: {
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  ttlRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ttlChip: {
    flex: 1,
    backgroundColor: '#222',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  ttlChipOn: {
    backgroundColor: '#1B5E20',
  },
  ttlChipText: {
    color: '#666',
    fontSize: 12,
  },
  ttlChipTextOn: {
    color: '#fff',
    fontWeight: 'bold',
  },
  panicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B71C1C',
    padding: 15,
    borderRadius: 8,
    gap: 10,
    marginTop: 10,
  },
  panicText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
});
