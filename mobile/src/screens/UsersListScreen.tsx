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
import BottomTabBar from '../components/BottomTabBar';

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
      
      // Add more detailed logging
      console.log('Initiating private session request...');
      
      const result = await api.startPrivateSession();
      console.log('Private session created successfully:', result);
      
      onPrivateMode();
    } catch (error: any) {
      console.error('Failed to start private session:', error);
      
      // More descriptive error alert
      let errorMessage = 'Could not start private session. Please try again.';
      if (error.message && error.message.includes('500')) {
        errorMessage = 'Server error occurred while creating private session. Please check backend logs.';
      } else if (error.message && error.message.includes('Network')) {
        errorMessage = 'Network connection failed. Please check your internet.';
      }
      
      alert(errorMessage);
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
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={onFeed} style={styles.headerIcon}>
            <Text style={styles.iconText}>🏠</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePrivateMode} disabled={isStartingPrivate} style={styles.headerIcon}>
            {isStartingPrivate ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={styles.iconText}>🔒</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={onProfile} style={styles.headerIcon}>
            <Text style={styles.iconText}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stories/Active Section (Mock) */}
      <View style={styles.storiesContainer}>
        <View style={styles.storyItem}>
          <View style={[styles.storyAvatar, styles.myStory]}>
            <Text style={styles.storyAvatarText}>+</Text>
          </View>
          <Text style={styles.storyName}>Your Story</Text>
        </View>
        {/* We can map some active users here if we want */}
      </View>

      <View style={styles.divider} />

      {/* Messages List Header */}
      <View style={styles.messagesHeader}>
        <Text style={styles.messagesTitle}>Messages</Text>
        <Text style={styles.requestsLink}>Requests</Text>
      </View>

      {/* Users List */}
      {users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No messages yet</Text>
          <Text style={styles.emptySubtext}>
            Tap the + button to start a new chat
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

      <View style={styles.tabBar}>
        <BottomTabBar
          active="chats"
          onChats={() => {}}
          onFeed={onFeed}
          onPrivate={handlePrivateMode}
          onProfile={onProfile}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingBottom: 56,
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
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#efefef',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'System', // Use default system font which is close to IG
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginLeft: 20,
  },
  iconText: {
    fontSize: 24,
  },
  storiesContainer: {
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  storyItem: {
    alignItems: 'center',
    marginRight: 15,
  },
  storyAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  myStory: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  storyAvatarText: {
    fontSize: 24,
    color: '#007AFF',
  },
  storyName: {
    fontSize: 12,
    marginTop: 4,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#efefef',
  },
  messagesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  messagesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  requestsLink: {
    color: '#0095f6',
    fontWeight: '600',
  },
  usersList: {
    padding: 0,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#666',
    fontSize: 20,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  userName: {
    fontSize: 14,
    color: '#262626',
    fontWeight: '400',
  },
  userEmail: {
    fontSize: 14,
    color: '#8e8e8e',
  },
  onlineIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff',
    position: 'absolute',
    bottom: 12,
    left: 58,
  },
  online: {
    backgroundColor: '#00d000', // IG green
  },
  offline: {
    backgroundColor: 'transparent',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#262626',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8e8e8e',
    textAlign: 'center',
  },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
