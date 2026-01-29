import AsyncStorage from '@react-native-async-storage/async-storage';

export type RecentChatUser = {
  _id: string;
  displayName: string;
  email?: string;
  username?: string;
  phoneNumber?: string;
  photoURL?: string;
  isGroup?: boolean;
  members?: string[];
};

const STORAGE_KEY = 'recent_chats_v1';
const MAX_RECENTS = 50;

const normalizeUser = (user: RecentChatUser): RecentChatUser => ({
  _id: user._id,
  displayName: user.displayName,
  email: user.email,
  username: user.username,
  phoneNumber: user.phoneNumber,
  photoURL: user.photoURL,
  isGroup: user.isGroup,
  members: user.members,
});

export const loadRecentChats = async (): Promise<RecentChatUser[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((u) => u && typeof u._id === 'string' && typeof u.displayName === 'string');
  } catch {
    return [];
  }
};

export const saveRecentChat = async (user: RecentChatUser) => {
  if (!user?._id) return;
  try {
    const existing = await loadRecentChats();
    const normalized = normalizeUser(user);
    const next = [normalized, ...existing.filter((u) => u._id !== user._id)].slice(0, MAX_RECENTS);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
};

