import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { appConfig } from '../config/appConfig';
import BottomTabBar from '../components/BottomTabBar';
import { useTheme } from '../config/theme';
import AppHeader from '../components/AppHeader';

interface ProfileScreenProps {
  currentUser: any;
  onChats: () => void;
  onFeed: () => void;
  onPrivate: () => void;
  onAI: () => void;
  onDeleteAccount: () => void;
}

export default function ProfileScreen({
  currentUser,
  onChats,
  onFeed,
  onPrivate,
  onAI,
  onDeleteAccount,
}: ProfileScreenProps) {
  const { mode, toggle, colors } = useTheme();

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="Settings" />
      
      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.mutedText }]}>Name</Text>
        <Text style={[styles.value, { color: colors.text }]}>{currentUser.displayName}</Text>
        
        <Text style={[styles.label, { color: colors.mutedText }]}>Email</Text>
        <Text style={[styles.value, { color: colors.text }]}>{currentUser.email}</Text>
        
        <Text style={[styles.label, { color: colors.mutedText }]}>Premium Status</Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {currentUser.isPremium ? 'Active' : 'Not subscribed'}
        </Text>
      </View>

      <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handlePrivacyPolicy}>
        <Text style={styles.buttonText}>Privacy Policy</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]} onPress={toggle}>
        <Text style={[styles.buttonText, { color: colors.text }]}>
          Theme: {mode === 'dark' ? 'Dark' : 'Light'} (Tap to switch)
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.deleteButton, { backgroundColor: colors.danger }]} onPress={handleDeleteAccount}>
        <Text style={styles.deleteButtonText}>Delete Account</Text>
      </TouchableOpacity>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 56,
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
