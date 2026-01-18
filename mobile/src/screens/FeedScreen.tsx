import React, { useEffect, useRef, useState } from 'react';
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
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  commentCount?: number;
  savedByMe?: boolean;
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
  const [imageAspectRatios, setImageAspectRatios] = useState<Record<string, number>>({});
  const requestedImageSizesRef = useRef<Set<string>>(new Set());
  const [imageViewerUrl, setImageViewerUrl] = useState<string | null>(null);
  
  // Comments state
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    loadFeed();
  }, []);

  useEffect(() => {
    const imageUrls = posts
      .filter((p) => p.mediaType === 'image' && typeof p.mediaUrl === 'string' && p.mediaUrl.length > 0)
      .map((p) => p.mediaUrl as string);

    for (const url of imageUrls) {
      if (requestedImageSizesRef.current.has(url)) continue;
      requestedImageSizesRef.current.add(url);

      Image.getSize(
        url,
        (width, height) => {
          const ratio = width > 0 && height > 0 ? width / height : 1;
          setImageAspectRatios((prev) => (prev[url] ? prev : { ...prev, [url]: ratio }));
        },
        () => {
          setImageAspectRatios((prev) => (prev[url] ? prev : { ...prev, [url]: 1 }));
        }
      );
    }
  }, [posts]);

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
    try {
      // Optimistic update
      setPosts((current) =>
        current.map((p) => {
          if (p._id === postId) {
            return {
              ...p,
              likedByMe: !p.likedByMe,
              likeCount: (p.likeCount || 0) + (p.likedByMe ? -1 : 1),
            };
          }
          return p;
        })
      );

      await api.togglePostLike(postId);
    } catch (error) {
      console.error('Like error:', error);
      // Revert on error could be implemented here
    }
  };

  const handleSave = async (postId: string) => {
    try {
      // Optimistic update
      setPosts((current) =>
        current.map((p) => {
          if (p._id === postId) {
            return {
              ...p,
              savedByMe: !p.savedByMe,
            };
          }
          return p;
        })
      );

      await api.toggleSavePost(postId);
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save post');
    }
  };

  const openComments = async (postId: string) => {
    setActivePostId(postId);
    setCommentsVisible(true);
    setComments([]);
    setLoadingComments(true);
    try {
      const result = await api.getComments(postId);
      setComments(result.comments || []);
    } catch (error) {
      console.error('Load comments error:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const submitComment = async () => {
    if (!activePostId || !commentText.trim()) return;
    const text = commentText.trim();
    setCommentText('');
    
    // Optimistic add (mock ID until refresh)
    const mockComment = {
      _id: `temp-${Date.now()}`,
      content: text,
      author: {
        _id: currentUser.id || currentUser._id,
        displayName: currentUser.displayName || 'Me',
        photoURL: currentUser.photoURL
      },
      createdAt: new Date().toISOString()
    };
    
    setComments(prev => [mockComment, ...prev]);
    
    try {
      await api.addComment(activePostId, text);
      // Refresh to get real ID and server timestamp
      const result = await api.getComments(activePostId);
      setComments(result.comments || []);
      
      // Update comment count in feed
      setPosts(current => 
        current.map(p => {
          if (p._id === activePostId) {
            return { ...p, commentCount: (p.commentCount || 0) + 1 };
          }
          return p;
        })
      );
    } catch (error) {
      console.error('Post comment error:', error);
      Alert.alert('Error', 'Failed to post comment');
      // Revert
      setComments(prev => prev.filter(c => c._id !== mockComment._id));
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
      const naturalAspectRatio = imageAspectRatios[post.mediaUrl] || 1;
      const displayAspectRatio = Math.max(0.8, Math.min(1.91, naturalAspectRatio));
      return (
        <TouchableOpacity activeOpacity={0.9} onPress={() => setImageViewerUrl(post.mediaUrl!)}>
          <Image
            source={{ uri: post.mediaUrl }}
            style={[styles.postImage, { aspectRatio: displayAspectRatio }]}
            resizeMode="cover"
          />
        </TouchableOpacity>
      );
    }

    const label = post.mediaType === 'video' ? 'Video' : 'File';

    return (
      <TouchableOpacity onPress={() => Linking.openURL(post.mediaUrl!)}>
        <View style={[styles.mediaRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons
            name={post.mediaType === 'video' ? 'play-circle-outline' : 'attach-outline'}
            size={18}
            color={colors.text}
            style={styles.mediaRowIcon}
          />
          <Text style={[styles.mediaRowText, { color: colors.text }]}>{label}</Text>
          <Text style={[styles.mediaRowOpen, { color: colors.primary }]}>Open</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPost = ({ item }: { item: Post }) => {
    const authorName = item.author?.displayName || 'User';
    const isLiked = !!item.likedByMe;

    return (
      <View style={[styles.postCard, Platform.OS === 'web' && styles.postCardWeb, { backgroundColor: colors.card }]}>
        <View style={styles.postHeader}>
          <View style={styles.avatar}>
            {item.author?.photoURL ? (
              <Image source={{ uri: item.author.photoURL }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <Text style={styles.avatarText}>{authorName.charAt(0)?.toUpperCase() || '?'}</Text>
            )}
          </View>
          <View style={styles.postHeaderText}>
            <Text style={[styles.authorName, { color: colors.text }]}>{authorName}</Text>
          </View>
          <View style={styles.postHeaderRight}>
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.text} />
          </View>
        </View>

        {renderMedia(item)}

        <View style={styles.postActions}>
          <View style={styles.actionsLeft}>
            <TouchableOpacity onPress={() => toggleLike(item._id)} style={styles.actionButton}>
              <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={24} color={isLiked ? '#ed4956' : colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openComments(item._id)} style={styles.actionButton}>
              <Ionicons name="chatbubble-outline" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleSharePost(item)} style={styles.actionButton}>
              <Ionicons name="paper-plane-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => handleSave(item._id)} style={styles.actionButton}>
            <Ionicons name={item.savedByMe ? 'bookmark' : 'bookmark-outline'} size={24} color={colors.text} />
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

      <View style={[styles.screenContent, Platform.OS === 'web' && styles.screenContentWeb]}>
        <View
          style={[
            styles.createContainer,
            Platform.OS === 'web' && styles.createContainerWeb,
            { backgroundColor: colors.card, borderBottomColor: colors.border, borderColor: colors.border },
          ]}
        >
          <View style={styles.createHeader}>
            <View style={[styles.userAvatarSmall, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.userAvatarText, { color: colors.text }]}>{currentUser?.displayName?.charAt(0).toUpperCase() || 'U'}</Text>
            </View>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Write a caption..."
              placeholderTextColor={colors.mutedText}
              value={content}
              onChangeText={setContent}
              multiline
            />
          </View>

          {mediaUrl && mediaType && (
            <View style={[styles.mediaPreview, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <View style={styles.mediaPreviewLeft}>
                {mediaType === 'image' ? (
                  <Image source={{ uri: selectedMedia?.uri || mediaUrl }} style={styles.mediaPreviewThumb} />
                ) : (
                  <View style={[styles.mediaPreviewIcon, { backgroundColor: colors.secondary }]}>
                    <Ionicons name={mediaType === 'video' ? 'play' : 'attach'} size={18} color={colors.text} />
                  </View>
                )}
                <Text style={[styles.attachedText, { color: colors.primary }]}>Attached: {mediaType.toUpperCase()}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setSelectedMedia(null);
                  setMediaUrl(undefined);
                  setMediaType(undefined);
                }}
              >
                <Ionicons name="close" size={18} color={colors.mutedText} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.actionsRow}>
            <View style={styles.mediaButtons}>
              <TouchableOpacity onPress={() => handleMediaPick('image')}>
                <Ionicons name="image-outline" size={22} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleMediaPick('video')}>
                <Ionicons name="videocam-outline" size={22} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleMediaPick('document')}>
                <Ionicons name="attach-outline" size={22} color={colors.text} />
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
                <Text style={styles.postButtonText}>Share</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
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
      </View>

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

      <Modal
        visible={commentsVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCommentsVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: colors.background }}
        >
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setCommentsVisible(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginLeft: 16, color: colors.text }}>Comments</Text>
          </View>

          {loadingComments ? (
            <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ padding: 16 }}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', color: '#666', marginTop: 20 }}>No comments yet. Be the first!</Text>
              }
              renderItem={({ item }) => (
                <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                  <Image
                    source={{ uri: item.author?.photoURL || 'https://via.placeholder.com/32' }}
                    style={{ width: 32, height: 32, borderRadius: 16, marginRight: 12 }}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                      <Text style={{ fontWeight: 'bold', marginRight: 8, color: colors.text }}>
                        {item.author?.displayName || 'User'}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#666' }}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={{ marginTop: 2, color: colors.text }}>{item.content}</Text>
                  </View>
                </View>
              )}
            />
          )}

          <View style={{ 
            padding: 12, 
            borderTopWidth: 1, 
            borderTopColor: colors.border,
            flexDirection: 'row', 
            alignItems: 'center'
          }}>
            <Image
              source={{ uri: currentUser.photoURL || 'https://via.placeholder.com/32' }}
              style={{ width: 32, height: 32, borderRadius: 16, marginRight: 12 }}
            />
            <TextInput
              style={{ 
                flex: 1, 
                backgroundColor: colors.card, 
                borderRadius: 20, 
                paddingHorizontal: 16, 
                paddingVertical: 8,
                color: colors.text,
                marginRight: 12
              }}
              placeholder="Add a comment..."
              placeholderTextColor="#666"
              value={commentText}
              onChangeText={setCommentText}
              onSubmitEditing={submitComment}
            />
            <TouchableOpacity 
              disabled={!commentText.trim()} 
              onPress={submitComment}
            >
              <Text style={{ color: !commentText.trim() ? '#666' : colors.primary, fontWeight: 'bold' }}>Post</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={!!imageViewerUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setImageViewerUrl(null)}
      >
        <View style={styles.viewerBackdrop}>
          <Pressable style={styles.viewerCloseHitbox} onPress={() => setImageViewerUrl(null)}>
            <Ionicons name="close" size={20} color="#fff" />
          </Pressable>
          {imageViewerUrl ? (
            <Image source={{ uri: imageViewerUrl }} style={styles.viewerImage} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingBottom: 56,
  },
  screenContent: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    maxWidth: 520,
  },
  screenContentWeb: {
    marginHorizontal: 'auto' as any,
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
    borderBottomColor: '#dbdbdb',
    backgroundColor: '#fff',
  },
  createContainerWeb: {
    borderWidth: 1,
    borderColor: '#dbdbdb',
    borderRadius: 8,
    marginTop: 16,
    overflow: 'hidden',
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
    backgroundColor: '#e9ecef',
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingBottom: 96,
  },
  postCard: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#dbdbdb',
  },
  postCardWeb: {
    borderWidth: 1,
    borderColor: '#dbdbdb',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#dbdbdb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
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
    backgroundColor: '#f0f0f0',
    maxHeight: 520,
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: '100%',
    height: '100%',
    maxWidth: 980,
  },
  viewerCloseHitbox: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  viewerCloseText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 12,
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbdbdb',
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
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    paddingRight: 16,
    paddingVertical: 6,
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
