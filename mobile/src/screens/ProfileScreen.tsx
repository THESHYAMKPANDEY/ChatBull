import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking, Image, Switch, Platform, Modal, TextInput, FlatList, Share, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { appConfig } from '../config/appConfig';
import { useTheme } from '../config/theme';
import AppHeader from '../components/AppHeader';
import BottomTabBar from '../components/BottomTabBar';
import VerifiedBadge from '../components/VerifiedBadge';
import { api } from '../services/api';
import { pickImage, uploadFile, PickedMedia } from '../services/media';
import { getCurrentUser, linkEmailPassword, updateUserPassword } from '../services/authClient';
import i18n from '../i18n';

interface ProfileScreenProps {
  currentUser: any;
  onChats: () => void;
  onFeed: () => void;
  onPrivate: () => void;
  onDeleteAccount: () => void;
  onUserUpdated: (user: any) => void;
  showTabBar?: boolean;
  onLogout?: () => void;
}

type Post = {
  _id: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'file';
};

export default function ProfileScreen({ currentUser, onChats, onFeed, onPrivate, onDeleteAccount, onUserUpdated, showTabBar = true, onLogout }: ProfileScreenProps) {
  const { colors, theme, toggleTheme } = useTheme();

  const displayName = currentUser?.displayName || 'User';
  const email = currentUser?.email || '';
  const photoURL = currentUser?.photoURL as string | undefined;
  const username = currentUser?.username as string | undefined;
  const bio = currentUser?.bio as string | undefined;
  const website = currentUser?.website as string | undefined;
  const phoneNumber = currentUser?.phoneNumber as string | undefined;

  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [loadingFollowCounts, setLoadingFollowCounts] = useState(true);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);

  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(false);
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordEmail, setPasswordEmail] = useState(email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [allowDirectMessages, setAllowDirectMessages] = useState(currentUser?.allowDirectMessages ?? true);
  const [updatingDmSetting, setUpdatingDmSetting] = useState(false);

  const handleDeleteAccount = () => {
    Alert.alert(
      i18n.t('deleteConfirmTitle'),
      i18n.t('deleteConfirmMsg'),
      [
        { text: i18n.t('cancel'), style: 'cancel' },
        { text: i18n.t('delete'), style: 'destructive', onPress: onDeleteAccount },
      ]
    );
  };

  const openPrivacyPolicy = async () => {
    try {
      await Linking.openURL(appConfig.LEGAL_PRIVACY_URL);
    } catch {
      Alert.alert(i18n.t('error'), 'Could not open privacy policy.');
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

  const loadSavedPosts = async () => {
    try {
      setLoadingSaved(true);
      const result = await api.getSavedPosts();
      setSavedPosts(Array.isArray(result?.posts) ? result.posts : []);
    } catch {
      setSavedPosts([]);
    } finally {
      setLoadingSaved(false);
    }
  };

  const loadFollowCounts = async () => {
    if (!currentUser?.id) return;
    try {
      setLoadingFollowCounts(true);
      const result = await api.getFollowCounts();
      if (typeof result?.followers === 'number' && typeof result?.following === 'number') {
        setFollowCounts({ followers: result.followers, following: result.following });
      }
    } catch {
      setFollowCounts({ followers: 0, following: 0 });
    } finally {
      setLoadingFollowCounts(false);
    }
  };

  const openFollowers = async () => {
    setShowFollowers(true);
    try {
      setLoadingFollowers(true);
      const result = await api.getFollowers();
      setFollowers(Array.isArray(result?.users) ? result.users : []);
    } catch {
      setFollowers([]);
    } finally {
      setLoadingFollowers(false);
    }
  };

  const openFollowing = async () => {
    setShowFollowing(true);
    try {
      setLoadingFollowing(true);
      const result = await api.getFollowing();
      setFollowing(Array.isArray(result?.users) ? result.users : []);
    } catch {
      setFollowing([]);
    } finally {
      setLoadingFollowing(false);
    }
  };

  const toggleAllowDirectMessages = async (nextValue: boolean) => {
    if (updatingDmSetting) return;
    const previous = allowDirectMessages;
    setAllowDirectMessages(nextValue);
    setUpdatingDmSetting(true);
    try {
      const result = await api.updateProfile({ allowDirectMessages: nextValue });
      if (result?.user) {
        onUserUpdated(result.user);
        setAllowDirectMessages(result.user.allowDirectMessages ?? nextValue);
      } else {
        setAllowDirectMessages(nextValue);
      }
    } catch (error: any) {
      Alert.alert(i18n.t('error'), error?.message || 'Failed to update setting.');
      setAllowDirectMessages(previous);
    } finally {
      setUpdatingDmSetting(false);
    }
  };

  useEffect(() => {
    loadMyPosts();
  }, []);

  useEffect(() => {
    setAllowDirectMessages(currentUser?.allowDirectMessages ?? true);
  }, [currentUser?.allowDirectMessages]);

  useEffect(() => {
    loadFollowCounts();
  }, [currentUser?.id]);

  useEffect(() => {
    if (activeTab === 'saved') {
      loadSavedPosts();
    }
  }, [activeTab]);

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

  const openPasswordModal = () => {
    setPasswordEmail(email || '');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordOpen(true);
  };

  const savePassword = async () => {
    if (savingPassword) return;
    if (!newPassword || newPassword.length < 6) {
      Alert.alert(i18n.t('error'), 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(i18n.t('error'), 'Passwords do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      if (!email) {
        if (!passwordEmail) {
          Alert.alert(i18n.t('error'), i18n.t('enterEmail'));
          return;
        }
        await linkEmailPassword(passwordEmail.trim(), newPassword);
      } else {
        const user = getCurrentUser();
        if (!user) {
          throw new Error('Please log in again to update your password.');
        }
        await updateUserPassword(user, newPassword);
      }

      const firebaseUser = getCurrentUser();
      if (firebaseUser) {
        const syncResult = await api.syncUser({
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email || passwordEmail.trim(),
          displayName: firebaseUser.displayName || displayName,
          phoneNumber: firebaseUser.phoneNumber || phoneNumber || '',
          photoURL: firebaseUser.photoURL || photoURL || '',
        });
        if (syncResult?.user) {
          onUserUpdated(syncResult.user);
        }
      }

      setPasswordOpen(false);
      Alert.alert(i18n.t('success'), 'Password updated successfully.');
    } catch (error: any) {
      const msg = error?.message || 'Failed to update password. Please try again.';
      Alert.alert(i18n.t('error'), msg);
    } finally {
      setSavingPassword(false);
    }
  };

  const pickNewAvatar = async () => {
    try {
      const picked = await pickImage();
      if (!picked) return;
      setPickedAvatar(picked);
      setAvatarPreviewUri(picked.uri);
    } catch {
      Alert.alert(i18n.t('error'), 'Failed to pick image');
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
          throw new Error(upload.error || i18n.t('uploadFailed'));
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
        throw new Error(result?.error || i18n.t('updateFailed'));
      }

      onUserUpdated(result.user);
      setEditOpen(false);
      await loadMyPosts();
    } catch (error: any) {
      Alert.alert(i18n.t('updateFailed'), error?.message || i18n.t('updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const shareProfile = async () => {
    const url = currentUser?.website || '';
    const text = username ? `@${username}` : displayName;
    if (!url) {
      Alert.alert(i18n.t('share'), 'Add a website to share your profile link.');
      return;
    }
    try {
      await Share.share({ message: `${text}\n${url}`, url });
    } catch {
      Alert.alert(i18n.t('error'), 'Failed to share');
    }
  };

  const renderHeader = () => {
    const avatarUri = photoURL;

    return (
      <View style={styles.headerWrapper}>
        <View style={[styles.topCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.topRow}>
            <TouchableOpacity 
              style={[styles.avatarRing, { borderColor: colors.border }]} 
              onPress={openEditProfile} 
              activeOpacity={0.9}
              accessibilityLabel={i18n.t('editProfile')}
              accessibilityRole="button"
            >
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
              <View style={styles.stat} accessibilityLabel={`${postsTotal} ${i18n.t('posts')}`}>
                <Text style={[styles.statNumber, { color: colors.text }]}>{postsTotal}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedText }]}>{i18n.t('posts')}</Text>
              </View>
              <TouchableOpacity
                style={styles.stat}
                onPress={openFollowers}
                disabled={loadingFollowCounts}
                accessibilityLabel={`${followCounts.followers} ${i18n.t('followers')}`}
              >
                <Text style={[styles.statNumber, { color: colors.text }]}>
                  {loadingFollowCounts ? '-' : followCounts.followers}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedText }]}>{i18n.t('followers')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stat}
                onPress={openFollowing}
                disabled={loadingFollowCounts}
                accessibilityLabel={`${followCounts.following} ${i18n.t('following')}`}
              >
                <Text style={[styles.statNumber, { color: colors.text }]}>
                  {loadingFollowCounts ? '-' : followCounts.following}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedText }]}>{i18n.t('following')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }]}>{displayName}</Text>
            {currentUser?.isPremium ? <VerifiedBadge size={16} /> : null}
          </View>

          {username ? <Text style={[styles.username, { color: colors.text }]}>@{username}</Text> : null}
          {bio ? <Text style={[styles.bio, { color: colors.text }]}>{bio}</Text> : null}
          {website ? (
            <TouchableOpacity 
              onPress={() => Linking.openURL(website)} 
              activeOpacity={0.8}
              accessibilityLabel={`${i18n.t('website')}: ${website}`}
              accessibilityRole="link"
            >
              <Text style={[styles.website, { color: colors.primary }]} numberOfLines={1}>
                {website}
              </Text>
            </TouchableOpacity>
          ) : null}
          {email ? <Text style={[styles.email, { color: colors.mutedText }]}>{email}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.actionBtn, { borderColor: colors.border }]} 
              onPress={openEditProfile}
              accessibilityLabel={i18n.t('editProfile')}
              accessibilityRole="button"
            >
              <Text style={[styles.actionBtnText, { color: colors.text }]}>{i18n.t('editProfile')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, { borderColor: colors.border }]} 
              onPress={shareProfile}
              accessibilityLabel={i18n.t('shareProfile')}
              accessibilityRole="button"
            >
              <Text style={[styles.actionBtnText, { color: colors.text }]}>{i18n.t('shareProfile')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="moon-outline" size={18} color={colors.text} />
              <Text style={[styles.settingText, { color: colors.text }]}>{i18n.t('darkMode')}</Text>
            </View>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
              accessibilityLabel={i18n.t('darkMode')}
              accessibilityRole="switch"
              accessibilityState={{ checked: theme === 'dark' }}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.text} />
              <Text style={[styles.settingText, { color: colors.text }]}>Allow direct messages</Text>
            </View>
            <Switch
              value={allowDirectMessages}
              onValueChange={(value) => toggleAllowDirectMessages(value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
              disabled={updatingDmSetting}
              accessibilityLabel="Allow direct messages"
              accessibilityRole="switch"
              accessibilityState={{ checked: allowDirectMessages, disabled: updatingDmSetting }}
            />
          </View>

          <TouchableOpacity 
            style={styles.settingRow} 
            onPress={openPrivacyPolicy}
            accessibilityLabel={i18n.t('privacyPolicy')}
            accessibilityRole="button"
          >
            <View style={styles.settingLeft}>
              <Ionicons name="document-text-outline" size={18} color={colors.text} />
              <Text style={[styles.settingText, { color: colors.text }]}>{i18n.t('privacyPolicy')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingRow} 
            onPress={openPasswordModal}
            accessibilityLabel="Set password"
            accessibilityRole="button"
          >
            <View style={styles.settingLeft}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.text} />
              <Text style={[styles.settingText, { color: colors.text }]}>
                {email ? 'Change Password' : 'Set Password'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingRow} 
            onPress={handleDeleteAccount}
            accessibilityLabel={i18n.t('deleteAccount')}
            accessibilityRole="button"
          >
            <View style={styles.settingLeft}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text style={[styles.settingText, { color: colors.danger }]}>{i18n.t('deleteAccount')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
          </TouchableOpacity>
        </View>

        <View style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.gridHeader, { borderBottomColor: colors.border }]}>
            <Ionicons name="grid-outline" size={18} color={colors.text} />
            <Text style={[styles.gridTitle, { color: colors.text }]}>{i18n.t('posts')}</Text>
          </View>
          <View style={[styles.profileTabs, { borderBottomColor: colors.border }]}>
            <TouchableOpacity 
              style={styles.profileTab} 
              onPress={() => setActiveTab('posts')}
              accessibilityLabel={i18n.t('posts')}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'posts' }}
            >
              <Ionicons name={activeTab === 'posts' ? 'grid' : 'grid-outline'} size={18} color={activeTab === 'posts' ? colors.text : colors.mutedText} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.profileTab} 
              onPress={() => setActiveTab('saved')}
              accessibilityLabel="Saved posts"
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'saved' }}
            >
              <Ionicons name={activeTab === 'saved' ? 'bookmark' : 'bookmark-outline'} size={18} color={activeTab === 'saved' ? colors.text : colors.mutedText} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.profileTab} 
              onPress={() => setActiveTab('tagged')}
              accessibilityLabel="Tagged posts"
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'tagged' }}
            >
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
      <TouchableOpacity 
        style={styles.gridItem} 
        activeOpacity={0.9} 
        onPress={() => uri && setImageViewerUrl(uri)}
        accessibilityLabel={i18n.t('photo')}
        accessibilityRole="imagebutton"
      >
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
      : activeTab === 'saved'
      ? savedPosts.filter((p) => p.mediaType === 'image' && !!p.mediaUrl)
      : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title={displayName}
        rightIcon={<Ionicons name="menu-outline" size={24} color={colors.text} />}
        onRightPress={() => setMenuOpen(true)}
      />
      {menuOpen && (
        <View style={[styles.menuBackdrop]}>
          <TouchableOpacity style={styles.menuBackdropHit} onPress={() => setMenuOpen(false)} />
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuOpen(false); onLogout && onLogout(); }}>
              <Ionicons name="log-out-outline" size={18} color={colors.text} />
              <Text style={[styles.menuText, { color: colors.text }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
                <Text style={[styles.gridEmptyText, { color: colors.mutedText }]}>{i18n.t('noPosts')}</Text>
              </View>
            )
          ) : activeTab === 'saved' ? (
            loadingSaved ? null : (
              <View style={styles.gridEmpty}>
                <Ionicons name="bookmark-outline" size={28} color={colors.mutedText} />
                <Text style={[styles.gridEmptyText, { color: colors.mutedText }]}>No saved posts yet.</Text>
              </View>
            )
          ) : (
            <View style={styles.gridEmpty}>
              <Ionicons name="lock-closed-outline" size={28} color={colors.mutedText} />
              <Text style={[styles.gridEmptyText, { color: colors.mutedText }]}>{i18n.t('comingSoon')}</Text>
            </View>
          )
        }
        contentContainerStyle={styles.scrollContent}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
        refreshing={activeTab === 'posts' ? loadingPosts : activeTab === 'saved' ? loadingSaved : false}
        onRefresh={activeTab === 'posts' ? loadMyPosts : activeTab === 'saved' ? loadSavedPosts : undefined}
      />

      {showTabBar && (
        <View style={styles.tabBar}>
          <BottomTabBar
            active="profile"
            onChats={onChats}
            onFeed={onFeed}
            onPrivate={onPrivate}
            onProfile={() => {}}
            profilePhotoUrl={currentUser?.photoURL}
          />
        </View>
      )}

      <Modal visible={showFollowers} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowFollowers(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Followers</Text>
            <TouchableOpacity onPress={() => setShowFollowers(false)}>
              <Text style={{ color: colors.primary, fontSize: 16 }}>Done</Text>
            </TouchableOpacity>
          </View>
          {loadingFollowers ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={followers}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <View style={styles.listItem}>
                  <View style={[styles.listAvatar, { backgroundColor: colors.secondary }]}>
                    {item.photoURL ? (
                      <Image source={{ uri: item.photoURL }} style={styles.listAvatarImage} />
                    ) : (
                      <Text style={[styles.listAvatarText, { color: colors.text }]}>
                        {item.displayName?.charAt(0)?.toUpperCase() || 'U'}
                      </Text>
                    )}
                  </View>
                  <View style={styles.listInfo}>
                    <Text style={[styles.listName, { color: colors.text }]}>{item.displayName}</Text>
                    <Text style={[styles.listMeta, { color: colors.mutedText }]} numberOfLines={1}>
                      {item.username ? `@${item.username}` : item.email}
                    </Text>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </Modal>

      <Modal visible={showFollowing} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowFollowing(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Following</Text>
            <TouchableOpacity onPress={() => setShowFollowing(false)}>
              <Text style={{ color: colors.primary, fontSize: 16 }}>Done</Text>
            </TouchableOpacity>
          </View>
          {loadingFollowing ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={following}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <View style={styles.listItem}>
                  <View style={[styles.listAvatar, { backgroundColor: colors.secondary }]}>
                    {item.photoURL ? (
                      <Image source={{ uri: item.photoURL }} style={styles.listAvatarImage} />
                    ) : (
                      <Text style={[styles.listAvatarText, { color: colors.text }]}>
                        {item.displayName?.charAt(0)?.toUpperCase() || 'U'}
                      </Text>
                    )}
                  </View>
                  <View style={styles.listInfo}>
                    <Text style={[styles.listName, { color: colors.text }]}>{item.displayName}</Text>
                    <Text style={[styles.listMeta, { color: colors.mutedText }]} numberOfLines={1}>
                      {item.username ? `@${item.username}` : item.email}
                    </Text>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </Modal>

      <Modal visible={!!imageViewerUrl} transparent animationType="fade" onRequestClose={() => setImageViewerUrl(null)}>
        <View style={styles.viewerBackdrop}>
          <TouchableOpacity 
            style={styles.viewerCloseHitbox} 
            onPress={() => setImageViewerUrl(null)} 
            activeOpacity={0.8}
            accessibilityLabel={i18n.t('close')}
            accessibilityRole="button"
          >
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
          {imageViewerUrl ? <Image source={{ uri: imageViewerUrl }} style={styles.viewerImage} resizeMode="contain" /> : null}
        </View>
      </Modal>

      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <View style={styles.editBackdrop}>
          <View style={[styles.editCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.editHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setEditOpen(false)} disabled={saving} accessibilityLabel={i18n.t('cancel')} accessibilityRole="button">
                <Text style={[styles.editHeaderBtn, { color: colors.mutedText }]}>{i18n.t('cancel')}</Text>
              </TouchableOpacity>
              <Text style={[styles.editTitle, { color: colors.text }]}>{i18n.t('editProfile')}</Text>
              <TouchableOpacity onPress={saveProfile} disabled={saving} accessibilityLabel={i18n.t('save')} accessibilityRole="button">
                <Text style={[styles.editHeaderBtn, { color: saving ? colors.mutedText : colors.primary }]}>{saving ? i18n.t('saving') : i18n.t('done')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.editContent}>
              <TouchableOpacity 
                style={styles.editAvatarRow} 
                onPress={pickNewAvatar} 
                disabled={saving} 
                activeOpacity={0.9}
                accessibilityLabel={i18n.t('changePhoto')}
                accessibilityRole="button"
              >
                <View style={[styles.editAvatar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  {avatarPreviewUri || photoURL ? (
                    <Image source={{ uri: avatarPreviewUri || photoURL }} style={styles.editAvatarImage} resizeMode="cover" />
                  ) : (
                    <Text style={[styles.editAvatarInitial, { color: colors.text }]}>{displayName.charAt(0).toUpperCase()}</Text>
                  )}
                </View>
                <View style={styles.editAvatarMeta}>
                  <Text style={[styles.editAvatarTitle, { color: colors.text }]}>{i18n.t('profilePhoto')}</Text>
                  <Text style={[styles.editAvatarSub, { color: colors.primary }]}>{i18n.t('changePhoto')}</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>{i18n.t('name')}</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.text, borderColor: colors.border }]}
                  value={editDisplayName}
                  onChangeText={setEditDisplayName}
                  placeholder={i18n.t('name')}
                  placeholderTextColor={colors.mutedText}
                  accessibilityLabel={i18n.t('name')}
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>{i18n.t('username')}</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.text, borderColor: colors.border }]}
                  value={editUsername}
                  onChangeText={setEditUsername}
                  autoCapitalize="none"
                  placeholder={i18n.t('username')}
                  placeholderTextColor={colors.mutedText}
                  accessibilityLabel={i18n.t('username')}
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>{i18n.t('bio')}</Text>
                <TextInput
                  style={[styles.fieldInput, styles.fieldInputMultiline, { color: colors.text, borderColor: colors.border }]}
                  value={editBio}
                  onChangeText={setEditBio}
                  placeholder={i18n.t('bio')}
                  placeholderTextColor={colors.mutedText}
                  multiline
                  accessibilityLabel={i18n.t('bio')}
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>{i18n.t('website')}</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.text, borderColor: colors.border }]}
                  value={editWebsite}
                  onChangeText={setEditWebsite}
                  autoCapitalize="none"
                  placeholder="https://example.com"
                  placeholderTextColor={colors.mutedText}
                  accessibilityLabel={i18n.t('website')}
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>{i18n.t('phone')}</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.text, borderColor: colors.border }]}
                  value={editPhoneNumber}
                  onChangeText={setEditPhoneNumber}
                  autoCapitalize="none"
                  placeholder="+1234567890"
                  placeholderTextColor={colors.mutedText}
                  accessibilityLabel={i18n.t('phone')}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={passwordOpen} transparent animationType="slide" onRequestClose={() => setPasswordOpen(false)}>
        <View style={styles.editBackdrop}>
          <View style={[styles.editCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.editHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setPasswordOpen(false)} disabled={savingPassword} accessibilityLabel={i18n.t('cancel')} accessibilityRole="button">
                <Text style={[styles.editHeaderBtn, { color: colors.mutedText }]}>{i18n.t('cancel')}</Text>
              </TouchableOpacity>
              <Text style={[styles.editTitle, { color: colors.text }]}>{email ? 'Change Password' : 'Set Password'}</Text>
              <TouchableOpacity onPress={savePassword} disabled={savingPassword} accessibilityLabel={i18n.t('save')} accessibilityRole="button">
                <Text style={[styles.editHeaderBtn, { color: savingPassword ? colors.mutedText : colors.primary }]}>{savingPassword ? i18n.t('saving') : i18n.t('done')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.editContent}>
              {!email && (
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>{i18n.t('email')}</Text>
                  <TextInput
                    style={[styles.fieldInput, { color: colors.text, borderColor: colors.border }]}
                    value={passwordEmail}
                    onChangeText={setPasswordEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder={i18n.t('email')}
                    placeholderTextColor={colors.mutedText}
                    accessibilityLabel={i18n.t('email')}
                  />
                </View>
              )}

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>{i18n.t('password')}</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.text, borderColor: colors.border }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  placeholder={i18n.t('password')}
                  placeholderTextColor={colors.mutedText}
                  accessibilityLabel={i18n.t('password')}
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>Confirm Password</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.text, borderColor: colors.border }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  placeholder="Confirm Password"
                  placeholderTextColor={colors.mutedText}
                  accessibilityLabel="Confirm Password"
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
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
    zIndex: 20,
  },
  menuBackdropHit: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
  },
  menuCard: {
    position: 'absolute',
    top: 60,
    right: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    width: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#dbdbdb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  listAvatarImage: {
    width: '100%',
    height: '100%',
  },
  listAvatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 14,
    fontWeight: '600',
  },
  listMeta: {
    fontSize: 12,
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
