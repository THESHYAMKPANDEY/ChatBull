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
        <Text style={styles.createLabel}>Create a post</Text>
        <TextInput
          style={styles.input}
          placeholder="What's on your mind?"
          value={content}
          onChangeText={setContent}
          multiline
        />
        {mediaUrl && mediaType && (
          <Text style={styles.attachedText}>
            Attached: [{mediaType.toUpperCase()}]
          </Text>
        )}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.mediaButton}
            onPress={() => handleMediaPick('image')}
            disabled={uploading}
          >
            <Text style={styles.mediaButtonText}>📷</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mediaButton}
            onPress={() => handleMediaPick('document')}
            disabled={uploading}
          >
            <Text style={styles.mediaButtonText}>📄</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mediaButton}
            onPress={() => handleMediaPick('video')}
            disabled={uploading}
          >
            <Text style={styles.mediaButtonText}>🎥</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.postButton}
            onPress={handleCreatePost}
            disabled={isPosting || uploading}
          >
            <Text style={styles.postButtonText}>
              {isPosting ? 'Posting...' : 'Post'}
            </Text>
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
        />
      )}
    </KeyboardAvoidingView>
  );
}

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
  headerSpacer: {
    width: 60,
  },
  createContainer: {
    backgroundColor: '#fff',
    padding: 15,
    margin: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  createLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    minHeight: 60,
    maxHeight: 120,
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  attachedText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mediaButton: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  mediaButtonText: {
    fontSize: 16,
  },
  postButton: {
    marginLeft: 'auto',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  postButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedList: {
    padding: 10,
    paddingBottom: 20,
  },
  postCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  postHeaderText: {
    marginLeft: 10,
  },
  authorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  postTime: {
    fontSize: 12,
    color: '#999',
  },
  postContent: {
    fontSize: 15,
    color: '#333',
    marginBottom: 8,
  },
  mediaLink: {
    color: '#007AFF',
    fontSize: 14,
  },
});