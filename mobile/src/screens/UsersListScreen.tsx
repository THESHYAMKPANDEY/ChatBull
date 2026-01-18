import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { api } from '../services/api';
import { pickImage, pickVideo, uploadFile } from '../services/media';
import { Ionicons } from '@expo/vector-icons';

import { VerifiedBadge } from '../components/VerifiedBadge';
import { useTheme } from '../config/theme';

export interface User {
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
  onAI: () => void;
}

type Story = {
  _id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  author?: { _id: string; displayName: string; photoURL?: string } | null;
  createdAt: string;
};

export default function UsersListScreen({
  currentUser,
  onSelectUser,
  onLogout,
  onPrivateMode,
  onProfile,
  onFeed,
  onAI,
}: UsersListScreenProps) {
  const { colors } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingPrivate, setIsStartingPrivate] = useState(false);
  const [stories, setStories] = useState<Story[]>([]);
  const [isPostingStory, setIsPostingStory] = useState(false);

  useEffect(() => {
    loadUsers();
    loadStories();
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

  const loadStories = async () => {
    try {
      const result = await api.getStories();
      setStories(result.stories || []);
    } catch (error) {
      console.error('Load stories error:', error);
    }
  };

  const handleCreateStory = async () => {
    if (isPostingStory) return;

    const choice = await new Promise<'image' | 'video' | null>((resolve) => {
      Alert.alert('Create Story', 'Choose media type', [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        { text: 'Photo', onPress: () => resolve('image') },
        { text: 'Video', onPress: () => resolve('video') },
      ]);
    });
    if (!choice) return;

    setIsPostingStory(true);
    try {
      const picked = choice === 'image' ? await pickImage() : await pickVideo();
      if (!picked) return;

      const upload = await uploadFile(picked);
      if (!upload.success || !upload.url) {
        throw new Error(upload.error || 'Upload failed');
      }

      const created = await api.createStory({
        mediaUrl: upload.url,
        mediaType: choice,
      });

      if (!created?.success) {
        throw new Error(created?.error || 'Failed to create story');
      }

      await loadStories();
      Alert.alert('Success', 'Story posted');
    } catch (error: any) {
      Alert.alert('Story Failed', error.message || 'Failed to create story');
    } finally {
      setIsPostingStory(false);
    }
  };

  const renderUser = ({ item }: { item: User }) => (
    <TouchableOpacity style={styles.userItem} onPress={() => onSelectUser(item)}>
      <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.avatarText, { color: colors.mutedText }]}>
          {item.displayName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <View style={styles.nameRow}>
          <Text style={[styles.userName, { color: colors.text }]}>{item.displayName}</Text>
          {item.isPremium && <VerifiedBadge size={14} />}
        </View>
        <Text style={[styles.userEmail, { color: colors.mutedText }]}>{item.email}</Text>
      </View>
      <View
        style={[
          styles.onlineIndicator,
          item.isOnline ? styles.online : styles.offline,
          { borderColor: colors.card },
        ]}
      />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>ChatBull</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={onFeed} style={styles.headerIcon}>
            <Ionicons name="home-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePrivateMode} disabled={isStartingPrivate} style={styles.headerIcon}>
            {isStartingPrivate ? (
              <ActivityIndicator color={colors.text} size="small" />
            ) : (
              <Ionicons name="lock-closed-outline" size={24} color={colors.text} />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={onProfile} style={styles.headerIcon}>
            <Ionicons name="person-circle-outline" size={26} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stories/Active Section (Mock) */}
      <View style={styles.storiesContainer}>
        <TouchableOpacity style={styles.storyItem} onPress={handleCreateStory} disabled={isPostingStory}>
          <View style={[styles.storyAvatar, styles.myStory, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {isPostingStory ? <ActivityIndicator color={colors.text} /> : <Ionicons name="add" size={22} color={colors.text} />}
          </View>
          <Text style={[styles.storyName, { color: colors.text }]}>Your Story</Text>
        </TouchableOpacity>

        {stories.slice(0, 10).map((s) => (
          <View key={s._id} style={styles.storyItem}>
            <View style={[styles.storyAvatar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Text style={[styles.storyAvatarText, { color: colors.text }]}>{s.author?.displayName?.charAt(0)?.toUpperCase() || 'S'}</Text>
            </View>
            <Text style={[styles.storyName, { color: colors.text }]} numberOfLines={1}>
              {s.author?.displayName || 'Story'}
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Messages List Header */}
      <View style={styles.messagesHeader}>
        <Text style={[styles.messagesTitle, { color: colors.text }]}>Messages</Text>
        <Text style={[styles.requestsLink, { color: colors.primary }]}>Requests</Text>
      </View>

      {/* Users List */}
      {users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.text }]}>No messages yet</Text>
          <Text style={[styles.emptySubtext, { color: colors.mutedText }]}>
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
});
