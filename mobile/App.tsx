import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Alert, Platform } from 'react-native';
import { auth } from './src/config/firebase';
import { api } from './src/services/api';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

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
import Sentry, { initSentry } from './src/services/sentry';

type Screen = 'login' | 'users' | 'chat' | 'private' | 'profile' | 'feed' | 'ai' | 'createGroup' | 'call';

initSentry();

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [callData, setCallData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) console.log('Expo Push Token:', token);
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification Received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification Response:', response);
    });

    return () => {
      if (notificationListener.current) Notifications.removeNotificationSubscription(notificationListener.current);
      if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // Sync with backend
        try {
          console.log('App: Starting backend sync for user:', firebaseUser.uid);
          const result = await api.syncUser({
            firebaseUid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            phoneNumber: (firebaseUser as any).phoneNumber || '',
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
      await auth.signOut();
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

  const handleStartCall = (callID: string) => {
    if (!currentUser) return;
    setCallData({
      callID,
      userID: currentUser.id,
      userName: currentUser.displayName,
    });
    setCurrentScreen('call');
  };

  const handleBackFromCall = () => {
    setCallData(null);
    if (selectedUser) {
      setCurrentScreen('chat');
    } else {
      setCurrentScreen('users');
    }
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

  async function registerForPushNotificationsAsync() {
    let token;
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        Alert.alert('Failed to get push token for push notification!');
        return;
      }
      token = (await Notifications.getExpoPushTokenAsync()).data;
    } else {
      Alert.alert('Must use physical device for Push Notifications');
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token;
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
          <CallScreen
            callID={callData.callID}
            userID={callData.userID}
            userName={callData.userName}
            onBack={handleBackFromCall}
          />
        )}

        {currentScreen === 'chat' && currentUser && selectedUser && (
          <ChatScreen
            currentUser={currentUser}
            otherUser={selectedUser}
            onBack={handleBackFromChat}
            onStartCall={handleStartCall}
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
            onUserUpdated={(user) => setCurrentUser(user)}
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

export default Sentry.wrap(App);

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
