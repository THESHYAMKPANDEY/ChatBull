import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { io, Socket } from 'socket.io-client';
import { withScreenshotProtection } from '../services/security';
import { appConfig } from '../config/appConfig';

const SOCKET_URL = `${appConfig.SOCKET_BASE_URL}/private`;

interface Message {
  id?: string;
  senderAlias: string;
  content: string;
  createdAt: Date;
  isSelf?: boolean;
}

interface PrivateModeScreenProps {
  onExit: () => void;
}

export default function PrivateModeScreen({ onExit }: PrivateModeScreenProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [alias, setAlias] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const screenshotCleanupRef = useRef<Function | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Connect to private namespace
    socketRef.current = io(SOCKET_URL, {
      extraHeaders: {
        'X-Ephemeral-Session': sessionId || '',
      }
    });

    socketRef.current.on('connect', () => {
      // If we have a sessionId (from API start), join the room
      if (sessionId) {
        socketRef.current?.emit('private:join-session', { sessionId });
      } else {
        // Fallback for direct socket join without API (legacy)
        socketRef.current?.emit('private:join', (data: any) => {
          setSessionId(data.sessionId);
          setAlias(data.alias);
          setIsConnecting(false);
          
          // Add welcome message
          setMessages([{
            senderAlias: 'System',
            content: `${data.message} You are: ${data.alias}`,
            createdAt: new Date(),
          }]);
        });
      }
    });

    // Listen for broadcasts
    socketRef.current.on('private:broadcast', (data: Message) => {
      setMessages(prev => [...prev, data]);
    });

    // User joined notification
    socketRef.current.on('private:user-joined', (data: any) => {
      setMessages(prev => [...prev, {
        senderAlias: 'System',
        content: data.message,
        createdAt: new Date(),
      }]);
      refreshUsers();
    });

    // User left notification
    socketRef.current.on('private:user-left', (data: any) => {
      setMessages(prev => [...prev, {
        senderAlias: 'System',
        content: data.message,
        createdAt: new Date(),
      }]);
      refreshUsers();
    });

    // Initialize screenshot protection for private mode
    screenshotCleanupRef.current = withScreenshotProtection(null, 'anonymous_user', 'private_mode');

    // Cleanup on unmount
    return () => {
      if (socketRef.current && sessionId) {
        socketRef.current.emit('private:exit', { sessionId });
      }
      socketRef.current?.disconnect();
      
      // Clean up screenshot protection
      if (screenshotCleanupRef.current) {
        screenshotCleanupRef.current();
      }
    };
  }, []);

  const refreshUsers = () => {
    if (socketRef.current && sessionId) {
      socketRef.current.emit('private:users', { sessionId }, (users: string[]) => {
        setOnlineUsers(users);
      });
    }
  };

  const sendBroadcast = () => {
    if (!newMessage.trim() || !socketRef.current || !sessionId) return;

    socketRef.current.emit('private:broadcast', {
      sessionId,
      content: newMessage.trim(),
    });

    setNewMessage('');
  };

  const handleExit = () => {
    Alert.alert(
      '🚨 Exit Private Mode',
      'ALL your messages will be PERMANENTLY DELETED. This cannot be undone!',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Exit & Delete All',
          style: 'destructive',
          onPress: () => {
            if (socketRef.current && sessionId) {
              socketRef.current.emit('private:exit', { sessionId });
            }
            socketRef.current?.disconnect();
            onExit();
          },
        },
      ]
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isSystem = item.senderAlias === 'System';
    const isMe = item.senderAlias === alias;

    if (isSystem) {
      return (
        <View style={styles.systemMessage}>
          <Text style={styles.systemText}>{item.content}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.otherMessage]}>
        <Text style={styles.aliasText}>{item.senderAlias}</Text>
        <Text style={[styles.messageText, isMe && styles.myMessageText]}>
          {item.content}
        </Text>
      </View>
    );
  };

  if (isConnecting) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>🔒 Entering Private Mode...</Text>
        <Text style={styles.loadingSubtext}>Generating anonymous identity...</Text>
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
          <Text style={styles.headerTitle}>🔒 Private Mode</Text>
          <Text style={styles.aliasLabel}>You are: {alias}</Text>
        </View>
        <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
          <Text style={styles.exitButtonText}>Exit</Text>
        </TouchableOpacity>
      </View>

      {/* Warning Banner */}
      <View style={styles.warningBanner}>
        <Text style={styles.warningText}>
          ⚠️ All messages are ephemeral. Data deleted on exit.
        </Text>
      </View>

      {/* Online Users */}
      {onlineUsers.length > 0 && (
        <View style={styles.onlineBar}>
          <Text style={styles.onlineText}>
            Online: {onlineUsers.join(', ')}
          </Text>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Send anonymous message..."
          placeholderTextColor="#666"
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendBroadcast}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingText: {
    color: '#fff',
    fontSize: 24,
    textAlign: 'center',
    marginTop: '50%',
  },
  loadingSubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#2a2a2a',
    paddingTop: 50,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  aliasLabel: {
    color: '#4CAF50',
    fontSize: 12,
    marginTop: 2,
  },
  exitButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  exitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  warningBanner: {
    backgroundColor: '#ff9800',
    padding: 10,
  },
  warningText: {
    color: '#000',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
  },
  onlineBar: {
    backgroundColor: '#333',
    padding: 10,
  },
  onlineText: {
    color: '#4CAF50',
    fontSize: 12,
  },
  messagesList: {
    padding: 10,
  },
  systemMessage: {
    alignItems: 'center',
    marginVertical: 10,
  },
  systemText: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 15,
    marginVertical: 5,
  },
  myMessage: {
    backgroundColor: '#4CAF50',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 5,
  },
  otherMessage: {
    backgroundColor: '#333',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 5,
  },
  aliasText: {
    color: '#aaa',
    fontSize: 10,
    marginBottom: 3,
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
  },
  myMessageText: {
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    color: '#fff',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
