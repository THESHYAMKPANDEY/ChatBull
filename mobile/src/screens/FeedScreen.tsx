import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { api } from '../services/api';
import { pickImage, pickVideo, pickDocument, uploadFile } from '../services/media';

interface PostAuthor {
  _id: string;
  displayName: string;
  photoURL?: string;
}

interface Post {
  _id: string;
  author: PostAuthor;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'file';
  createdAt: string;
}

interface FeedScreenProps {
  currentUser: any;
  onBack: () => void;
}

export default function FeedScreen({ currentUser, onBack }: FeedScreenProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [content, setContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | undefined>(undefined);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'file' | undefined>(undefined);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    try {
      setIsLoading(true);
      const result = await api.getFeed();
      setPosts(result.posts || []);
    } catch (error) {
      console.error('Load feed error:', error);
      Alert.alert('Error', 'Failed to load feed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMediaPick = async (type: 'image' | 'video' | 'document') => {
    if (uploading) return;

    setUploading(true);
    try {
      let uri: string | null = null;

      if (type === 'image') {
        uri = await pickImage();
      } else if (type === 'video') {
        uri = await pickVideo();
      } else {
        uri = await pickDocument();
      }

      if (!uri) {
        setUploading(false);
        return;
      }

      const result = await uploadFile(uri);

      if (result.success && result.url) {
        setMediaUrl(result.url);
        const mt: 'image' | 'video' | 'file' =
          type === 'image' ? 'image' : type === 'video' ? 'video' : 'file';
        setMediaType(mt);
        Alert.alert('Success', 'Media attached to your post');
      } else {
        Alert.alert('Upload Failed', result.error || 'Could not upload file');
      }
    } catch (error) {
      console.error('Media upload error:', error);
      Alert.alert('Error', 'Failed to upload media');
    } finally {
      setUploading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!content.trim() && !mediaUrl) {
      Alert.alert('Error', 'Please enter some text or attach media');
      return;
    }

    try {
      setIsPosting(true);
      const result = await api.createPost({
        content: content.trim(),
        mediaUrl,
        mediaType,
      });

      if (result.success && result.post) {
        setPosts((prev) => [result.post, ...prev]);
        setContent('');
        setMediaUrl(undefined);
        setMediaType(undefined);
      } else {
        Alert.alert('Error', result.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Create post error:', error);
      Alert.alert('Error', 'Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  const renderPost = ({ item }: { item: Post }) => {
    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.author?.displayName?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.postHeaderText}>
            <Text style={styles.authorName}>{item.author?.displayName || 'User'}</Text>
            <Text style={styles.postTime}>
              {new Date(item.createdAt).toLocaleString()}
            </Text>
          </View>
        </View>
        {item.content ? (
          <Text style={styles.postContent}>{item.content}</Text>
        ) : null}
        {item.mediaUrl && item.mediaType && (
          <TouchableOpacity onPress={() => Linking.openURL(item.mediaUrl!)}>
            <Text style={styles.mediaLink}>[{item.mediaType.toUpperCase()}] Open media</Text>
          </TouchableOpacity>
        )}
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
          <Text style={styles.backButton}>← Chats</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feed</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Create Post */}
      <View style={styles.createContainer}>
        <View style={styles.createHeader}>
          <View style={styles.userAvatarSmall}>
             <Text style={styles.userAvatarText}>
               {currentUser?.displayName?.charAt(0).toUpperCase() || 'U'}
             </Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="What's happening?"
            value={content}
            onChangeText={setContent}
            multiline
          />
        </View>
        
        {mediaUrl && mediaType && (
          <View style={styles.mediaPreview}>
            <Text style={styles.attachedText}>
              📎 Attached: {mediaType.toUpperCase()}
            </Text>
            <TouchableOpacity onPress={() => {
              setMediaUrl(undefined);
              setMediaType(undefined);
            }}>
              <Text style={styles.removeMedia}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.actionsRow}>
          <View style={styles.mediaButtons}>
            <TouchableOpacity onPress={() => handleMediaPick('image')}>
              <Text style={styles.mediaIcon}>🖼️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleMediaPick('video')}>
              <Text style={styles.mediaIcon}>🎥</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleMediaPick('document')}>
              <Text style={styles.mediaIcon}>📄</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={[styles.postButton, (!content.trim() && !mediaUrl) && styles.postButtonDisabled]}
            onPress={handleCreatePost}
            disabled={isPosting || uploading || (!content.trim() && !mediaUrl)}
          >
            {isPosting || uploading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.postButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Feed */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id}
          renderItem={renderPost}
          contentContainerStyle={styles.feedList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#efefef',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  headerSpacer: {
    width: 50,
  },
  createContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#efefef',
  },
  createHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  userAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    minHeight: 40,
    maxHeight: 100,
    paddingTop: 8,
  },
  mediaPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    marginLeft: 48,
  },
  attachedText: {
    fontSize: 13,
    color: '#007AFF',
  },
  removeMedia: {
    fontSize: 16,
    color: '#999',
    fontWeight: 'bold',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingLeft: 48,
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 20,
  },
  mediaIcon: {
    fontSize: 20,
  },
  postButton: {
    backgroundColor: '#0095f6',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postButtonDisabled: {
    backgroundColor: '#b2dffc',
  },
  postButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedList: {
    paddingBottom: 20,
  },
  postCard: {
    marginBottom: 1,
    backgroundColor: '#fff',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  postHeaderText: {
    justifyContent: 'center',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#262626',
  },
  postTime: {
    fontSize: 11,
    color: '#8e8e8e',
    marginTop: 1,
  },
  postContent: {
    fontSize: 14,
    color: '#262626',
    lineHeight: 20,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  mediaLink: {
    color: '#0095f6',
    fontSize: 14,
    padding: 12,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 4,
    overflow: 'hidden',
  },
});