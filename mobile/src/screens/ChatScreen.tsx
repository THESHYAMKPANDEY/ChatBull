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
} from 'react-native';
import { io, Socket } from 'socket.io-client';
import { pickImage, pickVideo, pickDocument, takePhoto, takeVideo, uploadFile, PickedMedia } from '../services/media';
import { withScreenshotProtection } from '../services/security';
import { appConfig } from '../config/appConfig';
import { messageStatusManager, MessageStatus } from '../services/messageStatus';
import { messageReactionManager, DEFAULT_REACTIONS } from '../services/messageReactions';
// expo-clipboard will be imported inside the component

const SOCKET_URL = appConfig.SOCKET_BASE_URL;

interface Message {
  _id: string;
  sender: { _id: string; displayName: string };
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
}

interface ChatScreenProps {
  currentUser: any;
  otherUser: any;
  onBack: () => void;
}

export default function ChatScreen({ currentUser, otherUser, onBack }: ChatScreenProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ messageId: string; senderName: string; content: string } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const screenshotCleanupRef = useRef<Function | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList>(null);
  
  // Import clipboard inside the component
  const Clipboard = require('expo-clipboard');
  
  const handleReactionPress = (messageId: string, reaction: string) => {
    // Toggle reaction on this message
    messageReactionManager.toggleReaction(
      messageId,
      currentUser.id, // currentUser is defined in the component scope
      reaction,
      currentUser.displayName
    );
  };
  
  const showReactionPicker = (messageId: string) => {
    // Show reaction picker (in a real app, this would be a modal)
    Alert.alert(
      'Add Reaction',
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
        {
          text: 'Cancel',
          style: 'cancel' as const
        }
      ]
    );
  };

  useEffect(() => {
    // Connect to socket
    socketRef.current = io(SOCKET_URL);
    
    // Initialize message status manager with socket
    messageStatusManager.initialize(socketRef.current);
    messageReactionManager.initialize(socketRef.current);

    // Join room
    socketRef.current.emit('user:join', currentUser.id);

    // Get chat history
    socketRef.current.emit('messages:get', {
      userId: currentUser.id,
      otherUserId: otherUser._id,
    });

    // Listen for messages
    socketRef.current.on('messages:history', (history: Message[]) => {
      setMessages(
        history.map((msg) => ({
          ...msg,
          status:
            msg.isRead === true
              ? ('read' as MessageStatus)
              : ('delivered' as MessageStatus),
        })),
      );
    });

    socketRef.current.on('message:receive', (message: Message) => {
      setMessages((prev) => [
        ...prev,
        { ...message, status: 'delivered' as MessageStatus },
      ]);
      if (message.sender._id === otherUser._id) {
        socketRef.current?.emit('messages:read', {
          senderId: otherUser._id,
          receiverId: currentUser.id,
        });
      }
    });

    socketRef.current.on('message:sent', (message: Message) => {
      setMessages((prev) => [
        ...prev,
        { ...message, status: 'sent' as MessageStatus },
      ]);
    });

    socketRef.current.on(
      'messages:read',
      (receiverId: string) => {
        if (receiverId === otherUser._id) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.sender._id === currentUser.id
                ? { ...msg, status: 'read' as MessageStatus }
                : msg,
            ),
          );
        }
      },
    );

    socketRef.current.on(
      'user:online',
      (userId: string) => {
        if (userId === otherUser._id) {
          setIsOtherUserOnline(true);
        }
      },
    );

    socketRef.current.on(
      'user:offline',
      (userId: string) => {
        if (userId === otherUser._id) {
          setIsOtherUserOnline(false);
        }
      },
    );

    socketRef.current.emit('user:subscribe-status', otherUser._id);

    socketRef.current.on(
      'user:status-update',
      (data: { userId: string; isOnline: boolean }) => {
        if (data.userId === otherUser._id) {
          setIsOtherUserOnline(data.isOnline);
        }
      },
    );

    socketRef.current.emit('user:status-request', otherUser._id);

    socketRef.current.on(
      'user:status-response',
      (data: { userId: string; isOnline: boolean }) => {
        if (data.userId === otherUser._id) {
          setIsOtherUserOnline(data.isOnline);
        }
      },
    );

    socketRef.current.on(
      'message:reaction:add',
      (data: {
        messageId: string;
        userId: string;
        reaction: string;
      }) => {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg._id !== data.messageId) {
              return msg;
            }
            const reactions = { ...(msg.reactions || {}) };
            const users = new Set(reactions[data.reaction] || []);
            if (!users.has(data.userId)) {
              users.add(data.userId);
            }
            reactions[data.reaction] = Array.from(users);
            return { ...msg, reactions };
          }),
        );
      },
    );

    socketRef.current.on(
      'message:reaction:remove',
      (data: {
        messageId: string;
        userId: string;
        reaction: string;
      }) => {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg._id !== data.messageId || !msg.reactions) {
              return msg;
            }
            const reactions = { ...msg.reactions };
            const users = (reactions[data.reaction] || []).filter(
              (id) => id !== data.userId,
            );
            if (users.length === 0) {
              delete reactions[data.reaction];
            } else {
              reactions[data.reaction] = users;
            }
            return { ...msg, reactions };
          }),
        );
      },
    );

    socketRef.current.on('typing:start', (senderId: string) => {
      if (senderId === otherUser._id) {
        setIsTyping(true);
      }
    });

    socketRef.current.on('typing:stop', (senderId: string) => {
      if (senderId === otherUser._id) {
        setIsTyping(false);
      }
    });

    screenshotCleanupRef.current = withScreenshotProtection(
      null,
      currentUser.firebaseUid,
      'chat_screen',
    );

    return () => {
      socketRef.current?.disconnect();
      // Clean up screenshot protection
      if (screenshotCleanupRef.current) {
        screenshotCleanupRef.current();
      }
    };
  }, [currentUser.id, currentUser.firebaseUid, otherUser._id]);

  const sendMessage = () => {
    if (!newMessage.trim() || !socketRef.current) return;
    
    // Generate a temporary message ID
    const tempId = Date.now().toString();
    
    // Add message to UI immediately with 'sending' status
    const tempMessage: Message = {
      _id: tempId,
      sender: { _id: currentUser.id, displayName: currentUser.displayName },
      content: newMessage.trim(),
      messageType: 'text',
      createdAt: new Date().toISOString(),
      status: 'sending' as MessageStatus,
      ...(replyingTo && { replyTo: replyingTo }) // Add reply info if replying
    };
    
    setMessages(prev => [...prev, tempMessage]);
    
    // Track message sending status
    messageStatusManager.trackMessageSending(tempId);

    // Send to server
    socketRef.current.emit('message:send', {
      _id: tempId, // Include temp ID
      senderId: currentUser.id,
      receiverId: otherUser.isGroup ? undefined : otherUser._id,
      groupId: otherUser.isGroup ? otherUser._id : undefined,
      content: newMessage.trim(),
      messageType: 'text' as const,
      ...(replyingTo && { replyTo: replyingTo }) // Include reply info
    });

    setNewMessage('');
    setReplyingTo(null); // Clear reply state
  };

  const sendMediaMessage = async (mediaUrl: string, mediaType: 'image' | 'video' | 'file' | 'document') => {
    if (!socketRef.current) return;

    socketRef.current.emit('message:send', {
      senderId: currentUser.id,
      receiverId: otherUser._id,
      content: mediaUrl,
      messageType: mediaType,
    });
  };

  const handleMediaUpload = async (mediaType: 'image' | 'video' | 'document') => {
    if (isUploading) return;

    setIsUploading(true);
    let picked: PickedMedia | null = null;

    try {
      switch (mediaType) {
        case 'image':
          {
            const source = await new Promise<'camera' | 'library' | null>((resolve) => {
              Alert.alert('Send Photo', 'Choose source', [
                { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
                { text: 'Camera', onPress: () => resolve('camera') },
                { text: 'Library', onPress: () => resolve('library') },
              ]);
            });
            if (!source) break;
            picked = source === 'camera' ? await takePhoto() : await pickImage();
          }
          break;
        case 'video':
          {
            const source = await new Promise<'camera' | 'library' | null>((resolve) => {
              Alert.alert('Send Video', 'Choose source', [
                { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
                { text: 'Camera', onPress: () => resolve('camera') },
                { text: 'Library', onPress: () => resolve('library') },
              ]);
            });
            if (!source) break;
            picked = source === 'camera' ? await takeVideo() : await pickVideo();
          }
          break;
        case 'document':
          picked = await pickDocument();
          break;
      }

      if (!picked) {
        setIsUploading(false);
        return;
      }

      // Upload to backend (Cloudinary)
      const result = await uploadFile(picked);

      if (result.success && result.url) {
        // Send as media message
        const mt = picked.kind === 'file' ? 'file' : picked.kind;
        sendMediaMessage(result.url, mt);
        Alert.alert('Success', 'File uploaded and sent successfully!');
      } else {
        Alert.alert('Upload Failed', result.error || 'Could not upload file');
      }
    } catch (error) {
      console.error('Media upload error:', error);
      Alert.alert('Error', 'Failed to upload media');
    } finally {
      setIsUploading(false);
    }
  };

  const [isCurrentlyTyping, setIsCurrentlyTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const handleTyping = (text: string) => {
    setNewMessage(text);
    
    if (socketRef.current) {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      if (text.length > 0 && !isCurrentlyTyping) {
        // User started typing
        setIsCurrentlyTyping(true);
        socketRef.current.emit('typing:start', {
          senderId: currentUser.id,
          receiverId: otherUser._id,
        });
      } else if (text.length === 0 && isCurrentlyTyping) {
        // User stopped typing
        setIsCurrentlyTyping(false);
        socketRef.current.emit('typing:stop', {
          senderId: currentUser.id,
          receiverId: otherUser._id,
        });
      }
      
      // Set timeout to stop typing indication after pause
      if (text.length > 0) {
        typingTimeoutRef.current = setTimeout(() => {
          if (isCurrentlyTyping && socketRef.current) {
            setIsCurrentlyTyping(false);
            socketRef.current.emit('typing:stop', {
              senderId: currentUser.id,
              receiverId: otherUser._id,
            });
          }
        }, 2000); // Stop typing after 2 seconds of inactivity
      }
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMyMessage = item.sender._id === currentUser.id;
    const isMedia = item.messageType && ['image', 'video', 'file', 'document'].includes(item.messageType);

    return (
      <View
        style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessage : styles.otherMessage,
        ]}
      >
        {/* Reply preview */}
        {item.replyTo && (
          <View style={styles.replyPreview}>
            <Text style={styles.replySender}>
              Replying to {item.replyTo.senderName}
            </Text>
            <Text style={styles.replyContent} numberOfLines={1}>
              {item.replyTo.content}
            </Text>
          </View>
        )}
        
        {/* Long press menu for message actions */}
        <TouchableOpacity
          onLongPress={() => {
            // Show message action menu
            Alert.alert(
              'Message Options',
              '',
              [
                {
                  text: 'Reply',
                  onPress: () => {
                    setReplyingTo({
                      messageId: item._id,
                      senderName: item.sender.displayName,
                      content: item.content
                    });
                  }
                },
                {
                  text: 'React',
                  onPress: () => {
                    showReactionPicker(item._id);
                  }
                },
                {
                  text: 'Copy',
                  onPress: () => {
                    Clipboard.setString(item.content);
                    Alert.alert('Copied!', 'Message copied to clipboard');
                  }
                },
                {
                  text: 'Cancel',
                  style: 'cancel'
                }
              ]
            );
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>
            {isMedia && item.messageType ? `[${item.messageType.toUpperCase()}] ${item.content}` : item.content}
          </Text>
        </TouchableOpacity>
        
        {/* Message reactions */}
        {item.reactions && Object.keys(item.reactions).length > 0 && (
          <View style={styles.reactionsContainer}>
            {Object.entries(item.reactions).map(([reaction, users]) => (
              <TouchableOpacity
                key={`${item._id}-${reaction}`}
                style={styles.reactionButton}
                onPress={() => {
                  // Prevent self-reaction from being toggled off
                  const userReactions = messageReactionManager.getUserReaction(item._id, currentUser.id);
                  if (userReactions === reaction) {
                    // If user already reacted with this emoji, remove it
                    messageReactionManager.toggleReaction(
                      item._id,
                      currentUser.id,
                      reaction,
                      currentUser.displayName
                    );
                  } else {
                    // Add the reaction
                    messageReactionManager.toggleReaction(
                      item._id,
                      currentUser.id,
                      reaction,
                      currentUser.displayName
                    );
                  }
                }}
              >
                <Text style={styles.reactionText}>
                  {reaction} {users.length}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        <View style={styles.messageFooter}>
          <Text style={styles.timeText}>
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {isMyMessage && (
            <View style={styles.statusIcon}>
              {getStatusIcon(item.status || 'sending')}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{otherUser.displayName}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      {/* Typing indicator */}
      {isTyping && (
        <Text style={styles.typingText}>{otherUser.displayName} is typing...</Text>
      )}
      {!isTyping && isOtherUserOnline && (
        <Text style={styles.onlineIndicator}>● {otherUser.displayName} is online</Text>
      )}
      {!isTyping && !isOtherUserOnline && (
        <Text style={styles.offlineIndicator}>○ {otherUser.displayName} is offline</Text>
      )}

      {/* Reply preview */}
      {replyingTo && (
        <View style={styles.replyingToContainer}>
          <View style={styles.replyPreviewSmall}>
            <Text style={styles.replySenderSmall} numberOfLines={1}>
              Replying to {replyingTo.senderName}
            </Text>
            <Text style={styles.replyContentSmall} numberOfLines={1}>
              {replyingTo.content}
            </Text>
          </View>
          <TouchableOpacity style={styles.cancelReplyButton} onPress={() => setReplyingTo(null)}>
            <Text style={styles.cancelReplyText}>×</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Input */}
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.mediaButton} onPress={() => handleMediaUpload('image')} disabled={isUploading}>
          <Text style={styles.mediaButtonText}>📷</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.mediaButton} onPress={() => handleMediaUpload('document')} disabled={isUploading}>
          <Text style={styles.mediaButtonText}>📄</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder={replyingTo ? "Type your reply..." : "Type a message..."}
          value={newMessage}
          onChangeText={handleTyping}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={isUploading}>
          <Text style={styles.sendButtonText}>{isUploading ? 'Uploading...' : 'Send'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

  const getStatusIcon = (status: MessageStatus) => {
    switch (status) {
      case 'sending':
        return <Text style={styles.statusText}>⏳</Text>; // Sending
      case 'sent':
        return <Text style={styles.statusText}>✓</Text>; // Sent
      case 'delivered':
        return <Text style={styles.statusText}>✓✓</Text>; // Delivered
      case 'read':
        return <Text style={[styles.statusText, styles.readStatus]}>✓✓</Text>; // Read
      case 'failed':
        return <Text style={[styles.statusText, styles.failedStatus]}>⚠️</Text>; // Failed
      default:
        return <Text style={styles.statusText}>✓</Text>;
    }
  };
  
  // All functions are defined inline in the component where currentUser is available
  


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#007AFF',
    paddingTop: 50,
  },
  backButton: {
    color: '#fff',
    fontSize: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 50,
  },
  messagesList: {
    padding: 10,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 15,
    marginVertical: 5,
  },
  myMessage: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 5,
  },
  otherMessage: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  myMessageText: {
    color: '#fff',
  },
  timeText: {
    fontSize: 10,
    color: '#999',
    alignSelf: 'flex-end',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 3,
  },
  statusIcon: {
    marginLeft: 5,
  },
  statusText: {
    fontSize: 10,
    color: '#999',
  },
  readStatus: {
    color: '#007AFF',
  },
  failedStatus: {
    color: '#FF3B30',
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
    marginBottom: 5,
  },
  reactionButton: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 2,
  },
  reactionText: {
    fontSize: 12,
  },
  replyPreview: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
    paddingLeft: 8,
    paddingBottom: 4,
    marginBottom: 5,
  },
  replySender: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  replyContent: {
    fontSize: 12,
    color: '#666',
  },
  replyingToContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  replyPreviewSmall: {
    flex: 1,
    padding: 8,
    backgroundColor: 'white',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  replySenderSmall: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  replyContentSmall: {
    fontSize: 11,
    color: '#666',
  },
  cancelReplyButton: {
    marginLeft: 10,
    padding: 5,
    backgroundColor: '#ccc',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelReplyText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  typingText: {
    padding: 10,
    color: '#666',
    fontStyle: 'italic',
  },
  onlineIndicator: {
    padding: 5,
    color: '#4CAF50',
    fontSize: 12,
  },
  offlineIndicator: {
    padding: 5,
    color: '#999',
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  mediaButton: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 20,
    marginRight: 5,
  },
  mediaButtonText: {
    fontSize: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
