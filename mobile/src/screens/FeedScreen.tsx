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
  Image,
  Share,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { api } from '../services/api';
import { pickImage, pickVideo, pickDocument, takePhoto, takeVideo, uploadFile, PickedMedia } from '../services/media';
import BottomTabBar from '../components/BottomTabBar';
import { useTheme } from '../config/theme';
import AppHeader from '../components/AppHeader';

export interface PostAuthor {
  _id: string;
  displayName: string;
  photoURL?: string;
}

interface Post {
  _id: string;
  author?: PostAuthor | null;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'file';
  createdAt: string;
  likeCount?: number;
  likedByMe?: boolean;
}

interface FeedScreenProps {
  currentUser: any;
  onChats: () => void;
  onPrivate: () => void;
  onAI: () => void;
  onProfile: () => void;
}

export default function FeedScreen({ currentUser, onChats, onPrivate, onAI, onProfile }: FeedScreenProps) {
  const { colors } = useTheme();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [content, setContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<PickedMedia | null>(null);
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
      let picked: PickedMedia | null = null;

      if (type === 'image') {
        const source = await new Promise<'camera' | 'library' | null>((resolve) => {
          Alert.alert('Add Photo', 'Choose source', [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
            { text: 'Camera', onPress: () => resolve('camera') },
            { text: 'Library', onPress: () => resolve('library') },
          ]);
        });
        if (!source) return;
        picked = source === 'camera' ? await takePhoto() : await pickImage();
      } else if (type === 'video') {
        const source = await new Promise<'camera' | 'library' | null>((resolve) => {
          Alert.alert('Add Video', 'Choose source', [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
            { text: 'Camera', onPress: () => resolve('camera') },
            { text: 'Library', onPress: () => resolve('library') },
          ]);
        });
        if (!source) return;
        picked = source === 'camera' ? await takeVideo() : await pickVideo();
      } else {
        picked = await pickDocument();
      }

      if (!picked) {
        setUploading(false);
        return;
      }

      setSelectedMedia(picked);
      const result = await uploadFile(picked);

      if (result.success && result.url) {
        setMediaUrl(result.url);
        const mt: 'image' | 'video' | 'file' = picked.type === 'file' ? 'file' : picked.type;
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
        setPosts((prev) => [{ ...result.post, likeCount: 0, likedByMe: false }, ...prev]);
        setContent('');
        setSelectedMedia(null);
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

  const toggleLike = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p._id !== postId
          ? p
          : {
              ...p,
              likedByMe: !p.likedByMe,
              likeCount: Math.max(0, (p.likeCount || 0) + (p.likedByMe ? -1 : 1)),
            }
      )
    );

    try {
      const result = await api.togglePostLike(postId);
      if (result?.success && result?.post) {
        setPosts((prev) => prev.map((p) => (p._id === postId ? result.post : p)));
      }
    } catch (error) {
      console.error('Toggle like error:', error);
      await loadFeed();
    }
  };

  const handleSharePost = async (post: Post) => {
    try {
      const authorName = post.author?.displayName || 'User';
      const text = post.content ? `${authorName}: ${post.content}` : `${authorName} posted`;
      const url = post.mediaUrl || undefined;
      await Share.share({ message: url ? `${text}\n${url}` : text, url });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const renderMedia = (post: Post) => {
    if (!post.mediaUrl || !post.mediaType) return null;

    if (post.mediaType === 'image') {
      return (
        <Image
          source={{ uri: post.mediaUrl }}
          style={styles.postImage}
          resizeMode="cover"
        />
      );
    }

    const label = post.mediaType === 'video' ? 'Video' : 'File';
    const icon = post.mediaType === 'video' ? '▶' : '📎';

    return (
      <TouchableOpacity onPress={() => Linking.openURL(post.mediaUrl!)}>
        <View style={[styles.mediaRow, { backgroundColor: colors.background }]}>
          <Text style={[styles.mediaRowIcon, { color: colors.text }]}>{icon}</Text>
          <Text style={[styles.mediaRowText, { color: colors.text }]}>{label}</Text>
          <Text style={styles.mediaRowOpen}>Open</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPost = ({ item }: { item: Post }) => {
    const authorName = item.author?.displayName || 'User';
    const isLiked = !!item.likedByMe;

    return (
      <View style={[styles.postCard, { backgroundColor: colors.card }]}>
        <View style={styles.postHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {authorName.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.postHeaderText}>
            <Text style={[styles.authorName, { color: colors.text }]}>{authorName}</Text>
          </View>
          <View style={styles.postHeaderRight}>
            <Text style={[styles.moreIcon, { color: colors.text }]}>⋯</Text>
          </View>
        </View>

        {renderMedia(item)}

        <View style={styles.postActions}>
          <View style={styles.actionsLeft}>
            <TouchableOpacity onPress={() => toggleLike(item._id)} style={styles.actionButton}>
              <Text style={[styles.actionIcon, { color: isLiked ? '#ed4956' : colors.text }]}>{isLiked ? '♥' : '♡'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Alert.alert('Coming soon', 'Comments are not implemented yet')} style={styles.actionButton}>
              <Text style={[styles.actionIcon, { color: colors.text }]}>💬</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleSharePost(item)} style={styles.actionButton}>
              <Text style={[styles.actionIcon, { color: colors.text }]}>↗</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => Alert.alert('Saved', 'Post saved (UI only)')} style={styles.actionButton}>
            <Text style={[styles.actionIcon, { color: colors.text }]}>🔖</Text>
          </TouchableOpacity>
        </View>

        {typeof item.likeCount === 'number' && item.likeCount > 0 ? (
          <Text style={[styles.likesText, { color: colors.text }]}>
            {item.likeCount} {item.likeCount === 1 ? 'like' : 'likes'}
          </Text>
        ) : (
          <View style={styles.likesSpacer} />
        )}

        {item.content ? (
          <Text style={[styles.captionText, { color: colors.text }]}>
            <Text style={[styles.captionUser, { color: colors.text }]}>{authorName}</Text> {item.content}
          </Text>
        ) : (
          <View style={styles.captionSpacer} />
        )}

        <Text style={[styles.postTime, { color: colors.mutedText }]}>{new Date(item.createdAt).toLocaleString()}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader title="ChatBull" />

      {/* Create Post */}
      <View style={styles.createContainer}>
        <View style={styles.createHeader}>
          <View style={styles.userAvatarSmall}>
             <Text style={styles.userAvatarText}>
               {currentUser?.displayName?.charAt(0).toUpperCase() || 'U'}
             </Text>
          </View>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="What's happening?"
            placeholderTextColor={colors.mutedText}
            value={content}
            onChangeText={setContent}
            multiline
          />
        </View>
        
        {mediaUrl && mediaType && (
          <View style={styles.mediaPreview}>
            <View style={styles.mediaPreviewLeft}>
              {mediaType === 'image' ? (
                <Image source={{ uri: selectedMedia?.uri || mediaUrl }} style={styles.mediaPreviewThumb} />
              ) : (
                <Text style={styles.mediaPreviewIcon}>{mediaType === 'video' ? '▶' : '📎'}</Text>
              )}
              <Text style={styles.attachedText}>Attached: {mediaType.toUpperCase()}</Text>
            </View>
            <TouchableOpacity onPress={() => {
              setSelectedMedia(null);
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

      <View style={styles.tabBar}>
        <BottomTabBar
          active="feed"
          onChats={onChats}
          onFeed={() => {}}
          onPrivate={onPrivate}
          onAI={onAI}
          onProfile={onProfile}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingBottom: 56,
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
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginLeft: 16,
  },
  headerIconText: {
    fontSize: 20,
    color: '#000',
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
  mediaPreviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  mediaPreviewThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#e9ecef',
  },
  mediaPreviewIcon: {
    width: 36,
    height: 36,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 18,
    color: '#262626',
    backgroundColor: '#e9ecef',
    borderRadius: 6,
    overflow: 'hidden',
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
  postHeaderRight: {
    marginLeft: 'auto',
    paddingHorizontal: 6,
  },
  moreIcon: {
    fontSize: 20,
    color: '#262626',
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
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 360,
    backgroundColor: '#f0f0f0',
  },
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 12,
    marginTop: 4,
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  mediaRowIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#262626',
  },
  mediaRowText: {
    fontSize: 14,
    color: '#262626',
    fontWeight: '600',
  },
  mediaRowOpen: {
    marginLeft: 'auto',
    fontSize: 14,
    color: '#0095f6',
    fontWeight: '600',
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    paddingRight: 12,
    paddingVertical: 4,
  },
  actionIcon: {
    fontSize: 22,
    color: '#262626',
  },
  likedIcon: {
    color: '#ed4956',
  },
  likesText: {
    paddingHorizontal: 12,
    paddingTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#262626',
  },
  likesSpacer: {
    height: 22,
  },
  captionText: {
    paddingHorizontal: 12,
    paddingTop: 6,
    fontSize: 13,
    color: '#262626',
    lineHeight: 18,
  },
  captionUser: {
    fontWeight: '600',
    color: '#262626',
  },
  captionSpacer: {
    height: 20,
  },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
