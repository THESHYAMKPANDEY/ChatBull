import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking, Image, Switch, Platform, Modal, TextInput, FlatList, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { appConfig } from '../config/appConfig';
import { useTheme } from '../config/theme';
import AppHeader from '../components/AppHeader';
import BottomTabBar from '../components/BottomTabBar';
import VerifiedBadge from '../components/VerifiedBadge';
import { api } from '../services/api';
import { pickImage, uploadFile, PickedMedia } from '../services/media';

interface ProfileScreenProps {
  currentUser: any;
  onChats: () => void;
  onFeed: () => void;
  onPrivate: () => void;
  onAI: () => void;
  onDeleteAccount: () => void;
  onUserUpdated: (user: any) => void;
}

type Post = {
  _id: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'file';
};

export default function ProfileScreen({ currentUser, onChats, onFeed, onPrivate, onAI, onDeleteAccount, onUserUpdated }: ProfileScreenProps) {
  const { colors, theme, toggleTheme } = useTheme();

  const displayName = currentUser?.displayName || 'User';
  const email = currentUser?.email || '';
  const photoURL = currentUser?.photoURL as string | undefined;
  const username = currentUser?.username as string | undefined;
  const bio = currentUser?.bio as string | undefined;
  const website = currentUser?.website as string | undefined;
  const phoneNumber = currentUser?.phoneNumber as string | undefined;

  const stats = useMemo(() => {
    return { followers: 0, following: 0 };
  }, []);

  const [posts, setPosts] = useState<Post[]>([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [imageViewerUrl, setImageViewerUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'tagged'>('posts');

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(displayName);
  const [editUsername, setEditUsername] = useState(username || '');
  const [editBio, setEditBio] = useState(bio || '');
  const [editWebsite, setEditWebsite] = useState(website || '');
  const [editPhoneNumber, setEditPhoneNumber] = useState(phoneNumber || '');
  const [pickedAvatar, setPickedAvatar] = useState<PickedMedia | null>(null);
  const [avatarPreviewUri, setAvatarPreviewUri] = useState<string | null>(null);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your data will be deleted. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDeleteAccount },
      ]
    );
  };

  const openPrivacyPolicy = async () => {
    try {
      await Linking.openURL(appConfig.LEGAL_PRIVACY_URL);
    } catch {
      Alert.alert('Error', 'Could not open privacy policy.');
    }
  };

  const loadMyPosts = async () => {
    try {
      setLoadingPosts(true);
      const result = await api.getMyPosts({ page: 1, limit: 30 });
      setPosts(Array.isArray(result?.posts) ? result.posts : []);
      setPostsTotal(typeof result?.total === 'number' ? result.total : Array.isArray(result?.posts) ? result.posts.length : 0);
    } catch {
      setPosts([]);
      setPostsTotal(0);
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    loadMyPosts();
  }, []);

  const openEditProfile = () => {
    setEditDisplayName(displayName);
    setEditUsername(username || '');
    setEditBio(bio || '');
    setEditWebsite(website || '');
    setEditPhoneNumber(phoneNumber || '');
    setPickedAvatar(null);
    setAvatarPreviewUri(null);
    setEditOpen(true);
  };

  const pickNewAvatar = async () => {
    try {
      const picked = await pickImage();
      if (!picked) return;
      setPickedAvatar(picked);
      setAvatarPreviewUri(picked.uri);
    } catch {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const saveProfile = async () => {
    if (saving) return;

    try {
      setSaving(true);
      let nextPhotoURL: string | undefined = undefined;
      if (pickedAvatar) {
        const upload = await uploadFile(pickedAvatar);
        if (!upload.success || !upload.url) {
          throw new Error(upload.error || 'Failed to upload photo');
        }
        nextPhotoURL = upload.url;
      }

      const payload: any = {
        displayName: editDisplayName.trim(),
        username: editUsername.trim().toLowerCase(),
        bio: editBio.trim(),
        website: editWebsite.trim(),
        phoneNumber: editPhoneNumber.trim(),
      };
      if (nextPhotoURL) payload.photoURL = nextPhotoURL;

      const result = await api.updateProfile(payload);
      if (!result?.user) {
        throw new Error(result?.error || 'Failed to update profile');
      }

      onUserUpdated(result.user);
      setEditOpen(false);
      await loadMyPosts();
    } catch (error: any) {
      Alert.alert('Update Failed', error?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const shareProfile = async () => {
    const url = currentUser?.website || '';
    const text = username ? `@${username}` : displayName;
    if (!url) {
      Alert.alert('Share', 'Add a website to share your profile link.');
      return;
    }
    try {
      await Share.share({ message: `${text}\n${url}`, url });
    } catch {
      Alert.alert('Error', 'Failed to share');
    }
  };

  const renderHeader = () => {
    const avatarUri = photoURL;

    return (
      <View style={styles.headerWrapper}>
        <View style={[styles.topCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.topRow}>
            <TouchableOpacity style={[styles.avatarRing, { borderColor: colors.border }]} onPress={openEditProfile} activeOpacity={0.9}>
              <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <Text style={[styles.avatarInitial, { color: colors.text }]}>{displayName.charAt(0).toUpperCase()}</Text>
                )}
              </View>
              <View style={[styles.avatarEditBadge, { borderColor: colors.card }]}>
                <Ionicons name="camera-outline" size={14} color="#fff" />
              </View>
            </TouchableOpacity>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={[styles.statNumber, { color: colors.text }]}>{postsTotal}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedText }]}>posts</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statNumber, { color: colors.text }]}>{stats.followers}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedText }]}>followers</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statNumber, { color: colors.text }]}>{stats.following}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedText }]}>following</Text>
              </View>
            </View>
          </View>

          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }]}>{displayName}</Text>
            {currentUser?.isPremium ? <VerifiedBadge size={16} /> : null}
          </View>

          {username ? <Text style={[styles.username, { color: colors.text }]}>@{username}</Text> : null}
          {bio ? <Text style={[styles.bio, { color: colors.text }]}>{bio}</Text> : null}
          {website ? (
            <TouchableOpacity onPress={() => Linking.openURL(website)} activeOpacity={0.8}>
              <Text style={[styles.website, { color: colors.primary }]} numberOfLines={1}>
                {website}
              </Text>
            </TouchableOpacity>
          ) : null}
          {email ? <Text style={[styles.email, { color: colors.mutedText }]}>{email}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.border }]} onPress={openEditProfile}>
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Edit profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.border }]} onPress={shareProfile}>
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Share profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="moon-outline" size={18} color={colors.text} />
              <Text style={[styles.settingText, { color: colors.text }]}>Dark mode</Text>
            </View>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
            />
          </View>

          <TouchableOpacity style={styles.settingRow} onPress={openPrivacyPolicy}>
            <View style={styles.settingLeft}>
              <Ionicons name="document-text-outline" size={18} color={colors.text} />
              <Text style={[styles.settingText, { color: colors.text }]}>Privacy policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={handleDeleteAccount}>
            <View style={styles.settingLeft}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text style={[styles.settingText, { color: colors.danger }]}>Delete account</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
          </TouchableOpacity>
        </View>

        <View style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.gridHeader, { borderBottomColor: colors.border }]}>
            <Ionicons name="grid-outline" size={18} color={colors.text} />
            <Text style={[styles.gridTitle, { color: colors.text }]}>Posts</Text>
          </View>
          <View style={[styles.profileTabs, { borderBottomColor: colors.border }]}>
            <TouchableOpacity style={styles.profileTab} onPress={() => setActiveTab('posts')}>
              <Ionicons name={activeTab === 'posts' ? 'grid' : 'grid-outline'} size={18} color={activeTab === 'posts' ? colors.text : colors.mutedText} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileTab} onPress={() => setActiveTab('saved')}>
              <Ionicons name={activeTab === 'saved' ? 'bookmark' : 'bookmark-outline'} size={18} color={activeTab === 'saved' ? colors.text : colors.mutedText} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileTab} onPress={() => setActiveTab('tagged')}>
              <Ionicons name={activeTab === 'tagged' ? 'person' : 'person-outline'} size={18} color={activeTab === 'tagged' ? colors.text : colors.mutedText} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderGridItem = ({ item }: { item: Post }) => {
    const uri = item.mediaType === 'image' ? item.mediaUrl : undefined;
    return (
      <TouchableOpacity style={styles.gridItem} activeOpacity={0.9} onPress={() => uri && setImageViewerUrl(uri)}>
        {uri ? (
          <Image source={{ uri }} style={styles.gridImage} resizeMode="cover" />
        ) : (
          <View style={[styles.gridPlaceholder, { backgroundColor: colors.secondary }]}>
            <Ionicons name="image-outline" size={20} color={colors.mutedText} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const gridData =
    activeTab === 'posts'
      ? posts.filter((p) => p.mediaType === 'image' && !!p.mediaUrl)
      : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title={displayName}
        rightIcon={<Ionicons name="menu-outline" size={24} color={colors.text} />}
      />
      <FlatList
        data={gridData}
        keyExtractor={(i) => i._id}
        renderItem={renderGridItem}
        numColumns={3}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          activeTab === 'posts' ? (
            loadingPosts ? null : (
              <View style={styles.gridEmpty}>
                <Ionicons name="images-outline" size={28} color={colors.mutedText} />
                <Text style={[styles.gridEmptyText, { color: colors.mutedText }]}>No posts yet</Text>
              </View>
            )
          ) : (
            <View style={styles.gridEmpty}>
              <Ionicons name="lock-closed-outline" size={28} color={colors.mutedText} />
              <Text style={[styles.gridEmptyText, { color: colors.mutedText }]}>Coming soon</Text>
            </View>
          )
        }
        contentContainerStyle={styles.scrollContent}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
        refreshing={loadingPosts}
        onRefresh={loadMyPosts}
      />

      <View style={styles.tabBar}>
        <BottomTabBar
          active="profile"
          onChats={onChats}
          onFeed={onFeed}
          onPrivate={onPrivate}
          onAI={onAI}
          onProfile={() => {}}
        />
      </View>

      <Modal visible={!!imageViewerUrl} transparent animationType="fade" onRequestClose={() => setImageViewerUrl(null)}>
        <View style={styles.viewerBackdrop}>
          <TouchableOpacity style={styles.viewerCloseHitbox} onPress={() => setImageViewerUrl(null)} activeOpacity={0.8}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
          {imageViewerUrl ? <Image source={{ uri: imageViewerUrl }} style={styles.viewerImage} resizeMode="contain" /> : null}
        </View>
      </Modal>

      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <View style={styles.editBackdrop}>
          <View style={[styles.editCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.editHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setEditOpen(false)} disabled={saving}>
                <Text style={[styles.editHeaderBtn, { color: colors.mutedText }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.editTitle, { color: colors.text }]}>Edit profile</Text>
              <TouchableOpacity onPress={saveProfile} disabled={saving}>
                <Text style={[styles.editHeaderBtn, { color: saving ? colors.mutedText : colors.primary }]}>{saving ? 'Saving…' : 'Done'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.editContent}>
              <TouchableOpacity style={styles.editAvatarRow} onPress={pickNewAvatar} disabled={saving} activeOpacity={0.9}>
                <View style={[styles.editAvatar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  {avatarPreviewUri || photoURL ? (
                    <Image source={{ uri: avatarPreviewUri || photoURL }} style={styles.editAvatarImage} resizeMode="cover" />
                  ) : (
                    <Text style={[styles.editAvatarInitial, { color: colors.text }]}>{displayName.charAt(0).toUpperCase()}</Text>
                  )}
                </View>
                <View style={styles.editAvatarMeta}>
                  <Text style={[styles.editAvatarTitle, { color: colors.text }]}>Profile photo</Text>
                  <Text style={[styles.editAvatarSub, { color: colors.primary }]}>Change</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>Name</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.text, borderColor: colors.border }]}
                  value={editDisplayName}
                  onChangeText={setEditDisplayName}
                  placeholder="Name"
                  placeholderTextColor={colors.mutedText}
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>Username</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.text, borderColor: colors.border }]}
                  value={editUsername}
                  onChangeText={setEditUsername}
                  autoCapitalize="none"
                  placeholder="username"
                  placeholderTextColor={colors.mutedText}
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>Bio</Text>
                <TextInput
                  style={[styles.fieldInput, styles.fieldInputMultiline, { color: colors.text, borderColor: colors.border }]}
                  value={editBio}
                  onChangeText={setEditBio}
                  placeholder="Bio"
                  placeholderTextColor={colors.mutedText}
                  multiline
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>Website</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.text, borderColor: colors.border }]}
                  value={editWebsite}
                  onChangeText={setEditWebsite}
                  autoCapitalize="none"
                  placeholder="https://example.com"
                  placeholderTextColor={colors.mutedText}
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>Phone</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.text, borderColor: colors.border }]}
                  value={editPhoneNumber}
                  onChangeText={setEditPhoneNumber}
                  autoCapitalize="none"
                  placeholder="+1234567890"
                  placeholderTextColor={colors.mutedText}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 56,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 96,
  },
  headerWrapper: {
    width: '100%',
  },
  topCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: '800',
  },
  avatarEditBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0095f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  nameRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
  },
  email: {
    marginTop: 2,
    fontSize: 12,
  },
  username: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
  },
  bio: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
  },
  website: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  settingsCard: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 12,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  gridCard: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 12,
    overflow: 'hidden',
  },
  gridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  profileTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  profileTab: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridRow: {
    gap: 2,
  },
  gridItem: {
    flex: 1,
    aspectRatio: 1,
    marginBottom: 2,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridEmpty: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 8,
  },
  gridEmptyText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
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
  editBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  editCard: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: '92%',
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  editHeaderBtn: {
    fontSize: 14,
    fontWeight: '700',
  },
  editTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  editContent: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  editAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  editAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  editAvatarImage: {
    width: '100%',
    height: '100%',
  },
  editAvatarInitial: {
    fontSize: 18,
    fontWeight: '800',
  },
  editAvatarMeta: {
    marginLeft: 12,
  },
  editAvatarTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  editAvatarSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '800',
  },
  field: {
    marginTop: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  fieldInputMultiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
});
