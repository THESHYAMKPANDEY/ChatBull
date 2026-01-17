import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './src/config/firebase';
import { api } from './src/services/api';

import LoginScreen from './src/screens/LoginScreen';
import UsersListScreen from './src/screens/UsersListScreen';
import ChatScreen from './src/screens/ChatScreen';
import PrivateModeScreen from './src/screens/PrivateModeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import FeedScreen from './src/screens/FeedScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';
import CallScreen from './src/screens/CallScreen';
import { ThemeProvider } from './src/config/theme';
import AIChatScreen from './src/screens/AIChatScreen';

type Screen = 'login' | 'users' | 'chat' | 'private' | 'profile' | 'feed' | 'ai' | 'createGroup' | 'call';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [callData, setCallData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Sync with backend
        try {
          console.log('App: Starting backend sync for user:', firebaseUser.uid);
          const result = await api.syncUser({
            firebaseUid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          });
          console.log('App: Backend sync successful, result:', result);
          setCurrentUser(result.user);
          setCurrentScreen('users');
        } catch (error: any) {
          console.error('❌ App sync error:', error);
          
          // Show error alert to user but don't force logout
          if (error.message?.includes('Network')) {
            Alert.alert('Network Error', 'Cannot reach backend. Check WiFi and API URL.');
          } else {
            Alert.alert('Sync Error', 'Failed to sync with server. ' + error.message);
          }
          
          // Still allow user to continue to users screen
          setCurrentUser(null);
          setCurrentScreen('login');
        }
      } else {
        console.log('App: No user, setting to login screen');
        setCurrentUser(null);
        setCurrentScreen('login');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (user: any) => {
    setCurrentUser(user);
    setCurrentScreen('users');
  };

  const handleLogout = async () => {
    try {
      if (currentUser) {
        await api.logout();
      }
      await signOut(auth);
      setCurrentUser(null);
      setCurrentScreen('login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    setCurrentScreen('chat');
  };

  const handleBackFromChat = () => {
    setSelectedUser(null);
    setCurrentScreen('users');
  };

  const handlePrivateMode = () => {
    setCurrentScreen('private');
  };

  const handleExitPrivateMode = () => {
    setCurrentScreen('users');
  };

  const handleProfile = () => {
    setCurrentScreen('profile');
  };

  const handleFeed = () => {
    setCurrentScreen('feed');
  };

  const handleAI = () => {
    setCurrentScreen('ai');
  };

  const handleBackToUsers = () => {
    setCurrentScreen('users');
  };

  const handleDeleteAccount = async () => {
    if (currentUser) {
      try {
        const result = await api.deleteAccount();
        if (result.message) {
          // Successfully deleted, log out user
          await handleLogout();
          Alert.alert('Account Deleted', 'Your account and all data have been permanently deleted.');
        } else {
          Alert.alert('Error', result.error || 'Failed to delete account');
        }
      } catch (error) {
        console.error('Delete account error:', error);
        Alert.alert('Error', 'Failed to delete account');
      }
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <View style={styles.container}>
        {currentScreen === 'login' && (
          <LoginScreen onLogin={handleLogin} />
        )}
        
        {currentScreen === 'users' && currentUser && (
          <UsersListScreen
            currentUser={currentUser}
            onSelectUser={handleSelectUser}
            onLogout={handleLogout}
            onPrivateMode={handlePrivateMode}
            onProfile={handleProfile}
            onFeed={handleFeed}
            onAI={handleAI}
          />
        )}
        
        {currentScreen === 'createGroup' && currentUser && (
          <CreateGroupScreen />
        )}
        
        {currentScreen === 'call' && callData && (
          <CallScreen />
        )}

        {currentScreen === 'chat' && currentUser && selectedUser && (
          <ChatScreen
            currentUser={currentUser}
            otherUser={selectedUser}
            onBack={handleBackFromChat}
          />
        )}

        {currentScreen === 'private' && (
          <PrivateModeScreen onExit={handleExitPrivateMode} />
        )}

        {currentScreen === 'profile' && currentUser && (
          <ProfileScreen
            currentUser={currentUser}
            onChats={handleBackToUsers}
            onFeed={handleFeed}
            onPrivate={handlePrivateMode}
            onAI={handleAI}
            onDeleteAccount={handleDeleteAccount}
          />
        )}

        {currentScreen === 'feed' && currentUser && (
          <FeedScreen
            currentUser={currentUser}
            onChats={handleBackToUsers}
            onPrivate={handlePrivateMode}
            onAI={handleAI}
            onProfile={handleProfile}
          />
        )}

        {currentScreen === 'ai' && currentUser && (
          <AIChatScreen
            onChats={handleBackToUsers}
            onFeed={handleFeed}
            onPrivate={handlePrivateMode}
            onProfile={handleProfile}
          />
        )}
        
        <StatusBar style="auto" />
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
