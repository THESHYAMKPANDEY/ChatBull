import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, FlatList, ActivityIndicator, Alert } from 'react-native';
import AppHeader from '../components/AppHeader';
import VerifiedBadge from '../components/VerifiedBadge';
import { useTheme } from '../config/theme';
import { api } from '../services/api';

export type PublicUser = {
  _id: string;
  displayName: string;
  email?: string;
  username?: string;
  phoneNumber?: string;
  photoURL?: string;
  isPremium?: boolean;
  allowDirectMessages?: boolean;
  isFollowing?: boolean;
};

interface UserProfileScreenProps {
  currentUser: any;
  user: PublicUser;
  onBack: () => void;
  onMessage: (user: PublicUser) => void;
}

export default function UserProfileScreen({ currentUser, user, onBack, onMessage }: UserProfileScreenProps) {
  const { colors } = useTheme();
  const [isFollowing, setIsFollowing] = useState(!!user.isFollowing);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [updatingFollow, setUpdatingFollow] = useState(false);
  const [followers, setFollowers] = useState<PublicUser[]>([]);
  const [following, setFollowing] = useState<PublicUser[]>([]);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);

  const isMe = currentUser?.id && user?._id ? String(currentUser.id) === String(user._id) : false;

  const canMessage = useMemo(() => {
    if (isMe) return false;
    if (user.allowDirectMessages === false) {
      return isFollowing;
    }
    return true;
  }, [isFollowing, user.allowDirectMessages, isMe]);

  useEffect(() => {
    loadCounts();
    if (user?._id) {
      refreshFollowStatus();
    }
  }, [user?._id]);

  const loadCounts = async () => {
    if (!user?._id) return;
    try {
      setLoadingCounts(true);
      const result = await api.getFollowCounts(user._id);
      if (typeof result?.followers === 'number' && typeof result?.following === 'number') {
        setCounts({ followers: result.followers, following: result.following });
      }
    } catch (error) {
      console.error('Follow counts error:', error);
    } finally {
      setLoadingCounts(false);
    }
  };

  const refreshFollowStatus = async () => {
    try {
      const result = await api.getFollowStatus(user._id);
      if (typeof result?.isFollowing === 'boolean') {
        setIsFollowing(result.isFollowing);
      }
    } catch (error) {
      console.error('Follow status error:', error);
    }
  };

  const toggleFollow = async () => {
    if (updatingFollow || !user?._id) return;
    try {
      setUpdatingFollow(true);
      if (isFollowing) {
        await api.unfollowUser(user._id);
        setIsFollowing(false);
        setCounts((prev) => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
      } else {
        await api.followUser(user._id);
        setIsFollowing(true);
        setCounts((prev) => ({ ...prev, followers: prev.followers + 1 }));
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update follow status');
    } finally {
      setUpdatingFollow(false);
    }
  };

  const openFollowers = async () => {
    setShowFollowers(true);
    try {
      setLoadingFollowers(true);
      const result = await api.getFollowers(user._id);
      setFollowers(Array.isArray(result?.users) ? result.users : []);
    } catch (error) {
      console.error('Followers error:', error);
      setFollowers([]);
    } finally {
      setLoadingFollowers(false);
    }
  };

  const openFollowing = async () => {
    setShowFollowing(true);
    try {
      setLoadingFollowing(true);
      const result = await api.getFollowing(user._id);
      setFollowing(Array.isArray(result?.users) ? result.users : []);
    } catch (error) {
      console.error('Following error:', error);
      setFollowing([]);
    } finally {
      setLoadingFollowing(false);
    }
  };

  const renderListUser = ({ item }: { item: PublicUser }) => (
    <View style={styles.listItem}>
      <View style={[styles.listAvatar, { backgroundColor: colors.secondary }]}>
        {item.photoURL ? (
          <Image source={{ uri: item.photoURL }} style={styles.listAvatarImage} />
        ) : (
          <Text style={[styles.listAvatarText, { color: colors.text }]}>{item.displayName?.charAt(0)?.toUpperCase() || 'U'}</Text>
        )}
      </View>
      <View style={styles.listInfo}>
        <Text style={[styles.listName, { color: colors.text }]}>{item.displayName}</Text>
        <Text style={[styles.listMeta, { color: colors.mutedText }]} numberOfLines={1}>
          {item.username ? `@${item.username}` : item.email}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title={user.displayName || 'Profile'} showBack onBack={onBack} />

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View style={[styles.avatarRing, { borderColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
              {user.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarInitial, { color: colors.text }]}>{user.displayName?.charAt(0)?.toUpperCase() || 'U'}</Text>
              )}
            </View>
          </View>

          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.stat} onPress={openFollowers} disabled={loadingCounts}>
              <Text style={[styles.statNumber, { color: colors.text }]}>{loadingCounts ? '-' : counts.followers}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedText }]}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stat} onPress={openFollowing} disabled={loadingCounts}>
              <Text style={[styles.statNumber, { color: colors.text }]}>{loadingCounts ? '-' : counts.following}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedText }]}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.text }]}>{user.displayName}</Text>
          {user.isPremium ? <VerifiedBadge size={16} /> : null}
        </View>
        {user.username ? <Text style={[styles.username, { color: colors.text }]}>@{user.username}</Text> : null}

        {!isMe && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { borderColor: colors.border, backgroundColor: isFollowing ? colors.secondary : colors.primary },
              ]}
              onPress={toggleFollow}
              disabled={updatingFollow}
            >
              {updatingFollow ? (
                <ActivityIndicator color={isFollowing ? colors.text : '#fff'} />
              ) : (
                <Text style={[styles.actionBtnText, { color: isFollowing ? colors.text : '#fff' }]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { borderColor: colors.border, opacity: canMessage ? 1 : 0.6 },
              ]}
              onPress={() => {
                if (!canMessage) {
                  Alert.alert('Private', 'Follow this user to send a message.');
                  return;
                }
                onMessage(user);
              }}
              disabled={!canMessage}
            >
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Message</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

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
            <FlatList data={followers} keyExtractor={(item) => item._id} renderItem={renderListUser} />
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
            <FlatList data={following} keyExtractor={(item) => item._id} renderItem={renderListUser} />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
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
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
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
  username: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
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
});
