import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { api } from '../services/api';
import { pickImage, pickVideo, uploadFile } from '../services/media';
import * as Contacts from 'expo-contacts';

import VerifiedBadge from '../components/VerifiedBadge';
import { Ionicons } from '@expo/vector-icons';
import { t } from '../i18n';
import { useTheme } from '../config/theme';

export interface User {
  _id: string;
  displayName: string;
  email: string;
  isOnline: boolean;
  isPremium?: boolean;
  phoneNumber?: string;
  photoURL?: string;
  isGroup?: boolean;
  members?: string[];
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
  const { colors, theme } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [contactUsers, setContactUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<User[]>([]); // Groups treated as Users for list
  const [mergedList, setMergedList] = useState<User[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingPrivate, setIsStartingPrivate] = useState(false);
  const [stories, setStories] = useState<Story[]>([]);
  const [isPostingStory, setIsPostingStory] = useState(false);

  // Group Creation State
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedForGroup, setSelectedForGroup] = useState<string[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    mergeLists();
  }, [users, contactUsers, groups]);

  const initializeData = async () => {
    setIsLoading(true);
    await Promise.all([
      loadUsers(), // Social/Global users
      loadStories(),
      fetchGroups(),
      currentUser.phoneNumber ? syncDeviceContacts() : Promise.resolve()
    ]);
    setIsLoading(false);
  };

  const mergeLists = () => {
    // Combine Groups + Contacts + Social Users
    // Filter duplicates based on _id
    const combined = [...groups, ...contactUsers, ...users];
    const unique = combined.filter((v, i, a) => a.findIndex(t => t._id === v._id) === i);
    setMergedList(unique);
  };

  const fetchGroups = async () => {
    try {
      const result = await api.getGroups();
      const formattedGroups = result.groups.map((g: any) => ({
        ...g,
        displayName: g.name,
        photoURL: g.avatar,
        isGroup: true,
        email: `${g.members.length} members` // Subtitle
      }));
      setGroups(formattedGroups);
    } catch (error) {
      console.error('Fetch groups error:', error);
    }
  };

  const syncDeviceContacts = async () => {
    try {
      if (Platform.OS === 'web') {
        // Web does not support native contacts access
        // We can show a manual entry modal or just skip
        console.log('Contacts sync not supported on web');
        // Mock data for web testing if needed
        // setContactUsers([]);
        return;
      }

      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers],
        });

        if (data.length > 0) {
          const phones = data
            .map(c => c.phoneNumbers?.[0]?.number)
            .filter(Boolean)
            .map(p => p?.replace(/\D/g, '')) // Normalize: remove non-digits
            .filter(p => p && p.length >= 7); // Basic filter

          console.log('Syncing phones:', phones.length); // Debug

          if (phones.length > 0) {
            const result = await api.syncContacts(phones as string[]);
            // Filter out self
            const contacts = result.users.filter((u: User) => u._id !== currentUser.id);
            console.log('Synced contacts found:', contacts.length); // Debug
            setContactUsers(contacts);
          }
        }
      } else {
        Alert.alert('Permission Denied', 'Contacts permission is required to find friends.');
      }
    } catch (error) {
      console.error('Sync contacts error:', error);
      Alert.alert('Error', 'Failed to sync contacts.');
    }
  };

  const loadUsers = async () => {
    try {
      const result = await api.getUsers();
      const otherUsers = result.users.filter(
        (u: User) => u._id !== currentUser.id
      );
      setUsers(otherUsers);
    } catch (error) {
      console.error('Load users error:', error);
    }
  };

  const handlePrivateMode = async () => {
    try {
      setIsStartingPrivate(true);
      await api.startPrivateSession();
      onPrivateMode();
    } catch (error: any) {
      console.error('Failed to start private session:', error);
      alert('Could not start private session.');
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
      Alert.alert(t('createStoryTitle'), t('createStoryChooseMediaType'), [
        { text: t('cancel'), style: 'cancel', onPress: () => resolve(null) },
        { text: t('photo'), onPress: () => resolve('image') },
        { text: t('video'), onPress: () => resolve('video') },
      ]);
    });
    if (!choice) return;

    setIsPostingStory(true);
    try {
      const picked = choice === 'image' ? await pickImage() : await pickVideo();
      if (!picked) return;

      const upload = await uploadFile(picked);
      if (!upload.success || !upload.url) throw new Error(upload.error || 'Upload failed');

      const created = await api.createStory(upload.url, choice);
      if (!created?.success) throw new Error(created?.error || 'Failed to create story');

      await loadStories();
      Alert.alert('Success', 'Story posted');
    } catch (error: any) {
      Alert.alert('Story Failed', error.message || 'Failed to create story');
    } finally {
      setIsPostingStory(false);
    }
  };

  const handleNewChat = async () => {
    // Check phone number existence if needed
    if (!currentUser.phoneNumber) {
       Alert.alert('Phone Number Required', 'Please link your phone number in Profile to sync contacts and chat with friends.');
       // We still show modal to let them see empty state / instructions
    }
    
    // Refresh contacts when opening
    await syncDeviceContacts();
    setShowContactsModal(true);
  };

  const handleCreateGroup = async () => {
    // Navigate to CreateGroupScreen instead of showing modal
    // This connects to the separate screen the user likely wants
    // or if we keep the modal, ensure it works. 
    // Given the user said "connected... with another people icon", let's make sure
    // the "New Group" icon (people-outline) triggers the group creation logic correctly.
    setShowCreateGroup(true);
  };

  const submitCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    if (selectedForGroup.length < 1) { // Current user + 1 other = 2
      Alert.alert('Error', 'Please select at least one member');
      return;
    }

    setIsCreatingGroup(true);
    try {
      const result = await api.createGroup({
        name: groupName,
        members: selectedForGroup
      });
      
      setShowCreateGroup(false);
      setGroupName('');
      setSelectedForGroup([]);
      await fetchGroups(); // Refresh list
      Alert.alert('Success', 'Group created!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create group');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const toggleGroupSelection = (userId: string) => {
    if (selectedForGroup.includes(userId)) {
      setSelectedForGroup(prev => prev.filter(id => id !== userId));
    } else {
      setSelectedForGroup(prev => [...prev, userId]);
    }
  };

  const renderUser = ({ item }: { item: User }) => (
    <TouchableOpacity style={styles.userItem} onPress={() => onSelectUser(item)}>
      <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
        {item.photoURL ? (
           // Simplified image handling
           <Text style={[styles.avatarText, { color: colors.text }]}>{item.displayName.charAt(0).toUpperCase()}</Text>
        ) : (
           <Text style={[styles.avatarText, { color: colors.text }]}>{item.displayName.charAt(0).toUpperCase()}</Text>
        )}
        {item.isGroup && (
           <View style={styles.groupIconBadge}>
             <Ionicons name="people" size={12} color="#fff" />
           </View>
        )}
      </View>
      <View style={styles.userInfo}>
        <View style={styles.nameRow}>
          <Text style={[styles.userName, { color: colors.text }]}>{item.displayName}</Text>
          {item.isPremium && (
            <View style={{ marginLeft: 4 }}>
              <VerifiedBadge size={14} />
            </View>
          )}
        </View>
        <Text style={[styles.userEmail, { color: colors.mutedText }]}>{item.email}</Text>
      </View>
      {!item.isGroup && (
        <View
          style={[
            styles.onlineIndicator,
            item.isOnline ? styles.online : styles.offline,
            { borderColor: colors.background }
          ]}
        />
      )}
    </TouchableOpacity>
  );

  const renderSelectableUser = ({ item }: { item: User }) => {
    const isSelected = selectedForGroup.includes(item._id);
    return (
      <TouchableOpacity 
        style={[styles.userItem, isSelected && { backgroundColor: colors.secondary }]} 
        onPress={() => toggleGroupSelection(item._id)}
      >
        <Ionicons 
          name={isSelected ? "checkbox" : "square-outline"} 
          size={24} 
          color={isSelected ? colors.primary : colors.mutedText} 
          style={{ marginRight: 10 }}
        />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>{item.displayName}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('appName')}</Text>
        <View style={styles.headerRight}>
           <TouchableOpacity 
             onPress={handleNewChat}
             style={styles.headerIcon}
             accessibilityLabel="New Chat"
           >
             <Ionicons name="create-outline" size={24} color={colors.text} />
           </TouchableOpacity>
           <TouchableOpacity 
             onPress={handleCreateGroup}
             style={styles.headerIcon}
             accessibilityLabel="New Group"
           >
             <Ionicons name="people-outline" size={24} color={colors.text} />
           </TouchableOpacity>
        </View>
      </View>

      {/* Stories/Active Section */}
      <View style={styles.storiesContainer}>
        <TouchableOpacity style={styles.storyItem} onPress={handleCreateStory} disabled={isPostingStory}>
          <View style={[styles.storyAvatar, styles.myStory, { borderColor: colors.border }]}>
            <View style={[styles.storyAvatarInner, { backgroundColor: colors.secondary }]}>
              {isPostingStory ? <ActivityIndicator color={colors.text} /> : <Ionicons name="add" size={24} color={colors.text} />}
            </View>
          </View>
          <Text style={[styles.storyName, { color: colors.text }]}>{t('yourStory')}</Text>
        </TouchableOpacity>

        {stories.slice(0, 10).map((s) => (
          <View key={s._id} style={styles.storyItem}>
            <View style={styles.storyAvatar}>
              <View style={[styles.storyAvatarInner, { backgroundColor: colors.secondary }]}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>
                  {s.author?.displayName?.charAt(0)?.toUpperCase() || 'S'}
                </Text>
              </View>
            </View>
            <Text style={[styles.storyName, { color: colors.text }]} numberOfLines={1}>
              {s.author?.displayName || 'Story'}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ height: 0.5, backgroundColor: colors.border }} />

      {/* Messages List Header */}
      <View style={styles.messagesHeader}>
        <Text style={[styles.messagesTitle, { color: colors.text }]}>{t('messages')}</Text>
        <Text style={[styles.requestsLink, { color: colors.primary }]}>{t('requests')}</Text>
      </View>

      {/* Users List */}
      {mergedList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.text }]}>{t('noMessagesYet')}</Text>
          <Text style={[styles.emptySubtext, { color: colors.mutedText }]}>
            {t('startNewChatHint')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={mergedList}
          keyExtractor={(item) => item._id}
          renderItem={renderUser}
          contentContainerStyle={styles.usersList}
        />
      )}

      {/* Contacts List Modal (New Chat) */}
      <Modal
        visible={showContactsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowContactsModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Chat</Text>
            <TouchableOpacity onPress={() => setShowContactsModal(false)}>
              <Text style={{ color: colors.primary, fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
             {contactUsers.length === 0 ? (
               <View style={styles.emptyContainer}>
                 <Ionicons name="people-outline" size={64} color={colors.mutedText} />
                 <Text style={[styles.emptyText, { color: colors.text, marginTop: 16 }]}>No Contacts Found</Text>
                 <Text style={[styles.emptySubtext, { display: 'flex', color: colors.mutedText, textAlign: 'center', marginTop: 8 }]}>
                   {Platform.OS === 'web' 
                     ? 'Contact syncing is only available on mobile devices.' 
                     : 'Sync your contacts to find friends on ChatBull.'}
                 </Text>
               </View>
             ) : (
               <FlatList
                 data={contactUsers}
                 keyExtractor={item => item._id}
                 renderItem={({ item }) => (
                   <TouchableOpacity 
                     style={styles.userItem} 
                     onPress={() => {
                       onSelectUser(item);
                       setShowContactsModal(false);
                     }}
                   >
                     <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
                        <Text style={[styles.avatarText, { color: colors.text }]}>
                          {item.displayName.charAt(0).toUpperCase()}
                        </Text>
                     </View>
                     <View style={styles.userInfo}>
                       <Text style={[styles.userName, { color: colors.text }]}>{item.displayName}</Text>
                       <Text style={[styles.userEmail, { color: colors.mutedText }]}>{item.phoneNumber || item.email}</Text>
                     </View>
                   </TouchableOpacity>
                 )}
               />
             )}
          </View>
        </View>
      </Modal>

      {/* Create Group Modal */}
      <Modal
        visible={showCreateGroup}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateGroup(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Group</Text>
            <TouchableOpacity onPress={() => setShowCreateGroup(false)}>
              <Text style={{ color: colors.primary, fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.secondary, borderColor: colors.border }]}
              placeholder="Group Name"
              placeholderTextColor={colors.mutedText}
              value={groupName}
              onChangeText={setGroupName}
            />
            
            <Text style={[styles.sectionTitle, { color: colors.mutedText }]}>Select Members</Text>
            
            <FlatList
              data={[...contactUsers, ...users].filter((v,i,a) => a.findIndex(t => t._id === v._id) === i)}
              keyExtractor={item => item._id}
              renderItem={renderSelectableUser}
              style={{ flex: 1 }}
            />
            
            <TouchableOpacity 
              style={[styles.createButton, { backgroundColor: colors.primary }]}
              onPress={submitCreateGroup}
              disabled={isCreatingGroup}
            >
              {isCreatingGroup ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.createButtonText}>Create Group ({selectedForGroup.length})</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  // Header simplified like Insta Direct
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60, // More top padding
    paddingBottom: 12,
    backgroundColor: '#fff',
    // No border bottom in Insta usually, but we keep light one
    borderBottomWidth: 0.5,
    borderBottomColor: '#dbdbdb',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20, // Add gap between icons
  },
  headerIcon: {
    // marginLeft removed in favor of gap
  },
  // Stories row styling
  storiesContainer: {
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  storyItem: {
    alignItems: 'center',
    marginRight: 16,
  },
  storyAvatar: {
    width: 72, // Larger avatars
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#C13584', // Instagram gradient-ish color
    padding: 2, // Space for ring
  },
  myStory: {
    borderColor: '#dbdbdb', // Grey for own story
  },
  storyAvatarInner: { // New inner image style
    width: '100%',
    height: '100%',
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyName: {
    fontSize: 11,
    marginTop: 4,
    color: '#262626',
  },
  // Messages List
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
    color: '#000',
  },
  requestsLink: {
    color: '#0095f6', // Insta blue
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
    position: 'relative',
  },
  avatarText: {
    color: '#666',
    fontSize: 20,
    fontWeight: '600',
  },
  groupIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3797F0',
    borderRadius: 8,
    padding: 2,
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
    display: 'none',
  },
  // Modal
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
  modalContent: {
    flex: 1,
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  createButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
