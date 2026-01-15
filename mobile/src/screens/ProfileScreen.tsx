import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { appConfig } from '../config/appConfig';

interface ProfileScreenProps {
  currentUser: any;
  onBack: () => void;
  onDeleteAccount: () => void;
}

export default function ProfileScreen({ currentUser, onBack, onDeleteAccount }: ProfileScreenProps) {
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
      <Text style={styles.header}>Profile Settings</Text>
      
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

      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>Back to Chats</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  profileCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 10,
  },
  value: {
    fontSize: 16,
    color: '#666',
    marginLeft: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#666',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});