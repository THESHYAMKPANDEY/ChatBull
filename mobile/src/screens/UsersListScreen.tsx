import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { api } from '../services/api';

import { VerifiedBadge } from '../components/VerifiedBadge';

interface User {
  _id: string;
  displayName: string;
  email: string;
  isOnline: boolean;
  isPremium?: boolean;
}

interface UsersListScreenProps {
  currentUser: any;
  onSelectUser: (user: User) => void;
  onLogout: () => void;
  onPrivateMode: () => void;
  onProfile: () => void;
  onFeed: () => void;
}

export default function UsersListScreen({
  currentUser,
  onSelectUser,
  onLogout,
  onPrivateMode,
  onProfile,
  onFeed,
}: UsersListScreenProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingPrivate, setIsStartingPrivate] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const result = await api.getUsers();
      // Filter out current user
      const otherUsers = result.users.filter(
        (u: User) => u._id !== currentUser.id
      );
      setUsers(otherUsers);
    } catch (error) {
      console.error('Load users error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrivateMode = async () => {
    try {
      setIsStartingPrivate(true);
      const result = await api.startPrivateSession();
      // Pass sessionId to the private mode screen/handler
      // Since current navigation is state-based in App.tsx, we pass it via callback
      // But App.tsx logic for 'private' screen needs to know about the session
      // For now, we assume App.tsx or PrivateModeScreen handles the session initialization
      // We'll update onPrivateMode to accept data if needed, but current prop signature is void
      
      // We will rely on PrivateModeScreen to handle the session join if we can't pass params
      // However, we updated api.ts to have startPrivateSession
      
      onPrivateMode();
    } catch (error) {
      console.error('Failed to start private session:', error);
      alert('Could not start private session. Please try again.');
    } finally {
      setIsStartingPrivate(false);
    }
  };

  const renderUser = ({ item }: { item: User }) => (
    <TouchableOpacity style={styles.userItem} onPress={() => onSelectUser(item)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.displayName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.userName}>{item.displayName}</Text>
          {item.isPremium && <VerifiedBadge size={14} />}
        </View>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <View
        style={[
          styles.onlineIndicator,
          item.isOnline ? styles.online : styles.offline,
        ]}
      />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ChatBull</Text>
        <TouchableOpacity onPress={onLogout}>
          <Text style={styles.logoutButton}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Current User Info */}
      <View style={styles.currentUserBar}>
        <View style={styles.currentUserInfo}>
           <Text style={styles.welcomeText}>Hi, {currentUser.displayName}</Text>
        </View>
        <TouchableOpacity style={styles.profileIcon} onPress={onProfile}>
           <Text style={styles.profileIconText}>👤</Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons Row */}
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.feedButton]} 
          onPress={onFeed}
        >
          <Text style={styles.actionButtonText}>📣 Feed</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.privateButton]} 
          onPress={handlePrivateMode}
          disabled={isStartingPrivate}
        >
          {isStartingPrivate ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.actionButtonText}>🔒 Private</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Users List */}
      <View style={styles.listHeader}>
         <Text style={styles.listTitle}>Recent Chats</Text>
      </View>

      {users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No other users yet</Text>
          <Text style={styles.emptySubtext}>
            Ask a friend to sign up and start chatting!
          </Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id}
          renderItem={renderUser}
          contentContainerStyle={styles.usersList}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#007AFF',
    paddingTop: 50,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  logoutButton: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.9,
  },
  currentUserBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  currentUserInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  profileIcon: {
    padding: 8,
    backgroundColor: '#f0f2f5',
    borderRadius: 20,
  },
  profileIconText: {
    fontSize: 20,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    padding: 15,
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 0.48,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  privateButton: {
    backgroundColor: '#333',
  },
  feedButton: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  usersList: {
    padding: 10,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginVertical: 5,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
    marginLeft: 15,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  onlineIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  online: {
    backgroundColor: '#4CAF50',
  },
  offline: {
    backgroundColor: '#ccc',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});