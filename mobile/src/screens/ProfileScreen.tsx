import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { appConfig } from '../config/appConfig';
import BottomTabBar from '../components/BottomTabBar';

interface ProfileScreenProps {
  currentUser: any;
  onChats: () => void;
  onFeed: () => void;
  onPrivate: () => void;
  onDeleteAccount: () => void;
}

export default function ProfileScreen({
  currentUser,
  onChats,
  onFeed,
  onPrivate,
  onDeleteAccount,
}: ProfileScreenProps) {
  const handlePrivacyPolicy = () => {
    // In a real app, you might navigate to a dedicated privacy policy screen
    // For now, we'll show an alert with the policy
    Alert.alert(
      'Privacy Policy',
      `You can view our privacy policy at: ${appConfig.LEGAL_PRIVACY_URL}\n\nThis policy outlines how we collect, use, and protect your data.`,
      [
        { text: 'View Online', onPress: () => Linking.openURL(appConfig.LEGAL_PRIVACY_URL) },
        { text: 'OK', style: 'cancel' }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '⚠️ Delete Account',
      'This action is permanent and cannot be undone. All your data will be deleted. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: onDeleteAccount
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>
      
      <View style={styles.profileCard}>
        <Text style={styles.label}>Name:</Text>
        <Text style={styles.value}>{currentUser.displayName}</Text>
        
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{currentUser.email}</Text>
        
        <Text style={styles.label}>Premium Status:</Text>
        <Text style={styles.value}>
          {currentUser.isPremium ? 'Active' : 'Not subscribed'}
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handlePrivacyPolicy}>
        <Text style={styles.buttonText}>Privacy Policy</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
        <Text style={styles.deleteButtonText}>Delete Account</Text>
      </TouchableOpacity>

      <View style={styles.tabBar}>
        <BottomTabBar
          active="profile"
          onChats={onChats}
          onFeed={onFeed}
          onPrivate={onPrivate}
          onProfile={() => {}}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: '#fff',
    paddingBottom: 56,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#efefef',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  profileCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#efefef',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8e8e8e',
    marginTop: 10,
  },
  value: {
    fontSize: 15,
    color: '#262626',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#0095f6',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    marginHorizontal: 16,
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    marginHorizontal: 16,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
