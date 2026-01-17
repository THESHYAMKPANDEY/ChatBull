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

import { VerifiedBadge } from '../components/VerifiedBadge';
import BottomTabBar from '../components/BottomTabBar';
import StoryViewer, { Story } from '../components/StoryViewer';
import { pickImage, pickVideo, takePhoto, takeVideo, uploadFile } from '../services/media';
import { useTheme } from '../config/theme';
import AppHeader from '../components/AppHeader';

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
  onAI: () => void;
}

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
  const [isLoadingStories, setIsLoadingStories] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerStoryId, setViewerStoryId] = useState<string>('');

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

  const loadStories = async () => {
    try {
      setIsLoadingStories(true);
      const result = await api.getStories();
      setStories(result.stories || []);
    } catch (error) {
      console.error('Load stories error:', error);
    } finally {
      setIsLoadingStories(false);
    }
  };

  const handleCreateStory = async () => {
    try {
      const choice = await new Promise<'image' | 'video' | null>((resolve) => {
        Alert.alert('New Story', 'Choose what to post', [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
          { text: 'Photo', onPress: () => resolve('image') },
          { text: 'Video', onPress: () => resolve('video') },
        ]);
      });

      if (!choice) return;

      const source = await new Promise<'camera' | 'library' | null>((resolve) => {
        Alert.alert(choice === 'image' ? 'New Photo Story' : 'New Video Story', 'Choose source', [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
          { text: 'Camera', onPress: () => resolve('camera') },
          { text: 'Library', onPress: () => resolve('library') },
        ]);
      });

      if (!source) return;

      const picked =
        choice === 'image'
          ? source === 'camera'
            ? await takePhoto()
            : await pickImage()
          : source === 'camera'
            ? await takeVideo()
            : await pickVideo();
      if (!picked) return;

      const upload = await uploadFile(picked);
      if (!upload.success || !upload.url) {
        Alert.alert('Upload Failed', upload.error || 'Could not upload file');
        return;
      }

      const create = await api.createStory({
        mediaUrl: upload.url,
        mediaType: choice,
      });

      if (create.success && create.story) {
        setStories((prev) => [create.story, ...prev]);
      } else {
        Alert.alert('Error', create.error || 'Failed to create story');
      }
    } catch (error: any) {
      console.error('Create story error:', error);
      Alert.alert('Error', error.message || 'Failed to create story');
    }
  };

  const openStory = (storyId: string) => {
    setViewerStoryId(storyId);
    setViewerVisible(true);
  };

  const uniqueStories = React.useMemo(() => {
    const seen = new Set<string>();
    const result: Story[] = [];
    for (const s of stories) {
      const authorId = s.author?._id || s.author?.displayName || s._id;
      if (!seen.has(authorId)) {
        seen.add(authorId);
        result.push(s);
      }
    }
    return result;
  }, [stories]);

  const renderStory = ({ item }: { item: Story }) => (
    <TouchableOpacity style={styles.storyItem} onPress={() => openStory(item._id)}>
      <View style={styles.storyAvatar}>
        <Text style={styles.storyAvatarText}>
          {item.author?.displayName?.charAt(0)?.toUpperCase() || '?'}
        </Text>
      </View>
      <Text style={[styles.storyName, { color: colors.text }]} numberOfLines={1}>
        {item.author?.displayName || 'User'}
      </Text>
    </TouchableOpacity>
  );

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
          <Text style={[styles.userName, { color: colors.text }]}>{item.displayName}</Text>
          {item.isPremium && <VerifiedBadge size={14} />}
        </View>
        <Text style={[styles.userEmail, { color: colors.mutedText }]}>{item.email}</Text>
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <AppHeader title="ChatBull" />

      {/* Stories/Active Section (Mock) */}
      <View style={styles.storiesContainer}>
        <TouchableOpacity style={styles.storyItem} onPress={handleCreateStory}>
          <View style={[styles.storyAvatar, styles.myStory]}>
            <Text style={styles.storyAvatarText}>+</Text>
          </View>
          <Text style={[styles.storyName, { color: colors.text }]}>Your Story</Text>
        </TouchableOpacity>

        {isLoadingStories ? (
          <View style={styles.storiesLoading}>
            <ActivityIndicator size="small" color="#999" />
          </View>
        ) : (
          <FlatList
            data={uniqueStories}
            keyExtractor={(item) => item._id}
            renderItem={renderStory}
            horizontal
            style={styles.storiesScroller}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storiesList}
          />
        )}
      </View>

      <View style={styles.divider} />

      {/* Messages List Header */}
      <View style={styles.messagesHeader}>
        <Text style={[styles.messagesTitle, { color: colors.text }]}>Messages</Text>
        <Text style={[styles.requestsLink, { color: colors.primary }]}>Requests</Text>
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
          onAI={onAI}
          onProfile={onProfile}
        />
      </View>

      <StoryViewer
        visible={viewerVisible}
        stories={stories}
        initialStoryId={viewerStoryId}
        onClose={() => setViewerVisible(false)}
      />
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
    flexDirection: 'row',
    alignItems: 'center',
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
    width: 64,
    textAlign: 'center',
  },
  storiesList: {
    paddingLeft: 6,
    paddingRight: 10,
  },
  storiesScroller: {
    flex: 1,
  },
  storiesLoading: {
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
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
