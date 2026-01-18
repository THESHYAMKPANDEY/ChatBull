import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  FlatList, 
  Image, 
  ActivityIndicator, 
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { useTheme } from '../config/theme';
import AppHeader from '../components/AppHeader';

interface User {
  _id: string;
  displayName: string;
  photoURL?: string;
  email?: string;
}

export default function CreateGroupScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [step, setStep] = useState(1); // 1: Select Members, 2: Group Info
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await api.getUsers();
      if (result && Array.isArray(result.users)) {
        setUsers(result.users);
      }
    } catch (error) {
      console.error('Failed to load users', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (userId: string) => {
    const next = new Set(selectedUsers);
    if (next.has(userId)) {
      next.delete(userId);
    } else {
      next.add(userId);
    }
    setSelectedUsers(next);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Required', 'Please enter a group name');
      return;
    }
    if (selectedUsers.size === 0) {
       Alert.alert('Required', 'Please select at least one member');
       return;
    }

    try {
      setCreating(true);
      const memberIds = Array.from(selectedUsers);
      const result = await api.createGroup({
        name: groupName.trim(),
        description: description.trim(),
        memberIds
      });
      
      if (result && result.success) {
        Alert.alert('Success', 'Group created successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        throw new Error(result?.error || 'Failed to create group');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isSelected = selectedUsers.has(item._id);
    return (
      <TouchableOpacity 
        style={[styles.userItem, { borderBottomColor: colors.border }]} 
        onPress={() => toggleUser(item._id)}
      >
        <Image 
          source={{ uri: item.photoURL || 'https://via.placeholder.com/40' }} 
          style={styles.avatar} 
        />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>{item.displayName}</Text>
          <Text style={[styles.userEmail, { color: colors.mutedText }]}>{item.email}</Text>
        </View>
        <View style={[
          styles.checkbox, 
          isSelected ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: colors.mutedText }
        ]}>
          {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader 
        title={step === 1 ? "New Group: Select Members" : "New Group: Info"} 
        leftIcon={<Ionicons name="arrow-back" size={24} color={colors.text} />}
        onLeftPress={() => step === 1 ? navigation.goBack() : setStep(1)}
      />

      {step === 1 ? (
        <View style={{ flex: 1 }}>
           <View style={[styles.stepHeader, { backgroundColor: colors.card }]}>
             <Text style={{ color: colors.text }}>Selected: {selectedUsers.size}</Text>
             <TouchableOpacity 
               disabled={selectedUsers.size === 0}
               onPress={() => setStep(2)}
               style={{ opacity: selectedUsers.size > 0 ? 1 : 0.5 }}
             >
               <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 16 }}>Next</Text>
             </TouchableOpacity>
           </View>
           {loading ? (
             <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />
           ) : (
             <FlatList
               data={users}
               keyExtractor={(item) => item._id}
               renderItem={renderUserItem}
               contentContainerStyle={styles.list}
             />
           )}
        </View>
      ) : (
        <View style={styles.formContainer}>
          <View style={styles.avatarContainer}>
             <View style={[styles.groupAvatarPlaceholder, { backgroundColor: colors.secondary }]}>
               <Ionicons name="people" size={40} color={colors.mutedText} />
             </View>
             <Text style={{ color: colors.primary, marginTop: 8 }}>Add Group Photo (Optional)</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Group Name</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholder="e.g. Project Team"
              placeholderTextColor={colors.mutedText}
              value={groupName}
              onChangeText={setGroupName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card, height: 80 }]}
              placeholder="What is this group for?"
              placeholderTextColor={colors.mutedText}
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>

          <TouchableOpacity 
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={handleCreateGroup}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>Create Group</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  list: {
    paddingBottom: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    padding: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  groupAvatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  createButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
