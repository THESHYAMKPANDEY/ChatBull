import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Alert, Platform, PanResponder, TouchableOpacity, Text, BackHandler, Image } from 'react-native';
import type { Socket } from 'socket.io-client';
import { auth } from './src/config/firebase';
import { api } from './src/services/api';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Ionicons } from '@expo/vector-icons';
import { getOrCreateIdentityKeypair } from './src/services/e2ee';
import { connectSocket, disconnectSocket } from './src/services/socket';

import LoginScreen from './src/screens/LoginScreen';
import CompleteProfileScreen from './src/screens/CompleteProfileScreen';
import ViteLoginWeb from './src/screens/ViteLoginWeb';
import UsersListScreen from './src/screens/UsersListScreen';
import ChatScreen from './src/screens/ChatScreen';
import PrivateModeScreen from './src/screens/PrivateModeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import FeedScreen from './src/screens/FeedScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';
import CallScreen from './src/screens/CallScreen';
import { ThemeProvider, useTheme } from './src/config/theme';
import Sentry, { initSentry } from './src/services/sentry';

type Screen = 'login' | 'users' | 'chat' | 'private' | 'profile' | 'userProfile' | 'feed' | 'createGroup' | 'call' | 'completeProfile';

type CallData = {
  peerId: string;
  peerName?: string;
  peerAvatar?: string;
  callType: 'audio' | 'video';
  incoming?: boolean;
  callId?: string;
};

initSentry();

// Session Timeout Configuration (e.g., 5 minutes)
const INACTIVITY_TIMEOUT = 5 * 60 * 1000;

function AppContent() {
  const { colors, theme } = useTheme();
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedProfileUser, setSelectedProfileUser] = useState<any>(null);
  const [usersListRefreshToken, setUsersListRefreshToken] = useState(0);
  const [callData, setCallData] = useState<CallData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

  // Session Management
  const lastInteraction = useRef<number>(Date.now());
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const resetTimer = () => {
    lastInteraction.current = Date.now();
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    if (currentUser) {
      logoutTimer.current = setTimeout(() => {
        Alert.alert('Session Expired', 'You have been logged out due to inactivity.');
        handleLogout();
      }, INACTIVITY_TIMEOUT);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => {
        resetTimer();
        return false;
      },
    })
  ).current;

  useEffect(() => {
    if (currentUser) {
      resetTimer();
    } else {
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
    }
    return () => {
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
    };
  }, [currentUser]);

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
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
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
          try {
            const identity = await getOrCreateIdentityKeypair();
            const deviceId = Device.modelName || Platform.OS;
            await api.uploadIdentityKey(identity.publicKey, deviceId);
          } catch (keyError) {
            console.warn('E2EE key upload failed', keyError);
          }
          setCurrentUser(result.user);
          if (!result.user.username) {
            setCurrentScreen('completeProfile');
          } else {
            setCurrentScreen('users');
          }
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

  useEffect(() => {
    if (!currentUser?.id) return;
    let active = true;
    let socket: Socket | null = null;

    const onIncomingCall = (data: { callId: string; callerId: string; callerName?: string; type: 'audio' | 'video' }) => {
      if (!active) return;
      setCallData({
        peerId: data.callerId,
        peerName: data.callerName,
        callType: data.type,
        incoming: true,
        callId: data.callId,
      });
      setCurrentScreen('call');
    };

    const setupSocket = async () => {
      socket = await connectSocket();
      if (!active || !socket) return;
      socket.emit('user:join', currentUser.id);
      socket.on('call:incoming', onIncomingCall);
    };

    setupSocket();

    return () => {
      active = false;
      if (socket) {
        socket.off('call:incoming', onIncomingCall);
      }
    };
  }, [currentUser?.id]);

  const handleLogin = (user: any) => {
    setCurrentUser(user);
    if (!user.username) {
      setCurrentScreen('completeProfile');
    } else {
      setCurrentScreen('users');
    }
  };

  const handleProfileComplete = (user: any) => {
    setCurrentUser(user);
    setCurrentScreen('users');
  };

  const handleLogout = async () => {
    try {
      if (currentUser) {
        await api.logout();
      }
      disconnectSocket();
      await auth.signOut();
      setCurrentUser(null);
      setCurrentScreen('login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleSelectUser = (user: any) => {
    setSelectedProfileUser(null);
    setSelectedUser(user);
    setCurrentScreen('chat');
  };

  const handleBackFromChat = () => {
    setSelectedUser(null);
    setCurrentScreen('users');
    setUsersListRefreshToken((prev) => prev + 1);
  };

  const handleViewProfile = (user: any) => {
    setSelectedUser(null);
    setSelectedProfileUser(user);
    setCurrentScreen('userProfile');
  };

  const handleBackFromUserProfile = () => {
    setSelectedProfileUser(null);
    setCurrentScreen('users');
  };

  const handleStartCall = (data: { receiverId: string; type: 'audio' | 'video'; receiverName?: string; receiverAvatar?: string }) => {
    if (!currentUser) return;
    setCallData({
      peerId: data.receiverId,
      peerName: data.receiverName,
      peerAvatar: data.receiverAvatar,
      callType: data.type,
      incoming: false,
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

  // Track previous screen to return correctly from Private Mode
  const previousScreenRef = useRef<Screen>('users');

  const handlePrivateMode = () => {
    // Save current screen before entering private mode
    if (currentScreen !== 'private') {
      previousScreenRef.current = currentScreen;
    }
    setCurrentScreen('private');
  };

  const handleExitPrivateMode = () => {
    // Return to the screen they were on before
    setCurrentScreen(previousScreenRef.current);
  };

  // Android Back Handler
  useEffect(() => {
    const onBackPress = () => {
      // Return true to stop default behavior (exiting app)
      
      if (currentScreen === 'chat') {
        handleBackFromChat();
        return true;
      }
      
      if (currentScreen === 'call') {
        handleBackFromCall();
        return true;
      }

      if (currentScreen === 'createGroup') {
        handleBackToUsers();
        return true;
      }
      
      if (currentScreen === 'profile') {
        handleBackToUsers();
        return true;
      }

      if (currentScreen === 'userProfile') {
        handleBackFromUserProfile();
        return true;
      }
      
      if (currentScreen === 'feed') {
        handleBackToUsers();
        return true;
      }
      
      if (currentScreen === 'private') {
        handleExitPrivateMode();
        return true;
      }

      // If on login or users list (main screens), let default behavior happen (exit app)
      if (currentScreen === 'users' || currentScreen === 'login') {
        return false;
      }

      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    return () => subscription.remove();
  }, [currentScreen, selectedUser, callData]); // Re-bind when screen changes to capture correct state closures

  const handleProfile = () => {
    setCurrentScreen('profile');
  };

  const handleFeed = () => {
    setCurrentScreen('feed');
  };

  const handleBackToUsers = () => {
    setSelectedProfileUser(null);
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

  const renderWebLayout = () => {
    // Determine active tab for sidebar highlight
    const activeTab =
      currentScreen === 'call'
        ? (selectedUser ? 'chat' : 'users')
        : currentScreen === 'userProfile'
        ? 'users'
        : currentScreen;

    return (
      <View style={[styles.webContainer, { backgroundColor: colors.background, shadowColor: colors.text }]}>
        {/* Web Sidebar Navigation */}
        <View style={[styles.webNavRail, { backgroundColor: colors.background, borderRightColor: colors.border }]}>
           <TouchableOpacity 
             style={[styles.webNavItem, activeTab === 'users' && { backgroundColor: colors.secondary }]} 
             onPress={handleBackToUsers}
           >
             <Ionicons name={activeTab === 'users' ? "chatbubble" : "chatbubble-outline"} size={28} color={activeTab === 'users' ? colors.text : colors.mutedText} />
           </TouchableOpacity>
           
           <TouchableOpacity 
             style={[styles.webNavItem, activeTab === 'feed' && { backgroundColor: colors.secondary }]} 
             onPress={handleFeed}
           >
             <Ionicons name={activeTab === 'feed' ? "home" : "home-outline"} size={28} color={activeTab === 'feed' ? colors.text : colors.mutedText} />
           </TouchableOpacity>

           <TouchableOpacity 
             style={[styles.webNavItem, activeTab === 'profile' && { backgroundColor: colors.secondary }]} 
             onPress={handleProfile}
           >
             {currentUser?.photoURL ? (
               <View style={[styles.navAvatarWrap, activeTab === 'profile' && { borderColor: colors.text }]}>
                 <Image source={{ uri: currentUser.photoURL }} style={styles.navAvatar} />
               </View>
             ) : (
               <Ionicons name={activeTab === 'profile' ? "person" : "person-outline"} size={28} color={activeTab === 'profile' ? colors.text : colors.mutedText} />
             )}
           </TouchableOpacity>

           <TouchableOpacity 
             style={[styles.webNavItem, activeTab === 'private' && { backgroundColor: colors.secondary }]} 
             onPress={handlePrivateMode}
           >
             <Ionicons name={activeTab === 'private' ? "shield-checkmark" : "shield-checkmark-outline"} size={28} color={activeTab === 'private' ? colors.text : colors.mutedText} />
           </TouchableOpacity>
        </View>

        {/* Dynamic Content Area based on current screen */}
        <View style={[styles.webMainArea, { backgroundColor: colors.background }]}>
           {currentScreen === 'call' && callData ? (
             <CallScreen
               peerId={callData.peerId}
               peerName={callData.peerName}
               peerAvatar={callData.peerAvatar}
               callType={callData.callType}
               incoming={callData.incoming}
               callId={callData.callId}
               userID={currentUser.id}
               userName={currentUser.displayName}
               onBack={handleBackFromCall}
             />
           ) : null}

           {(activeTab === 'users' || activeTab === 'chat') && currentScreen !== 'call' ? (
             <View style={{ flex: 1, flexDirection: 'row' }}>
               <View style={[styles.webSidebar, { borderRightColor: colors.border }, selectedUser ? styles.webSidebarHidden : {}]}>
                  <UsersListScreen
                    currentUser={currentUser}
                    onSelectUser={handleSelectUser}
                    onViewProfile={handleViewProfile}
                    onLogout={handleLogout}
                    onPrivateMode={handlePrivateMode}
                    onProfile={handleProfile}
                    onFeed={handleFeed}
                    onChats={handleBackToUsers}
                    showTabBar={false}
                    refreshToken={usersListRefreshToken}
                  />
               </View>
               <View style={[styles.webContent, { backgroundColor: colors.background }, !selectedUser && currentScreen !== 'userProfile' ? styles.webContentEmpty : {}]}>
                 {currentScreen === 'userProfile' && selectedProfileUser ? (
                   <UserProfileScreen
                     currentUser={currentUser}
                     user={selectedProfileUser}
                     onBack={handleBackFromUserProfile}
                     onMessage={(user) => {
                       setSelectedProfileUser(null);
                       handleSelectUser(user);
                     }}
                   />
                 ) : selectedUser ? (
                  <ChatScreen
                    currentUser={currentUser}
                    otherUser={selectedUser}
                    onBack={handleBackFromChat}
                    onStartCall={handleStartCall}
                  />
                ) : (
                  <View style={styles.emptyState}>
                     <Ionicons name="chatbubbles-outline" size={80} color={colors.mutedText} style={{ opacity: 0.5, marginBottom: 20 }} />
                     <Text style={{ fontSize: 20, color: colors.text, fontWeight: '600' }}>Your Messages</Text>
                     <Text style={{ fontSize: 14, color: colors.mutedText, marginTop: 10 }}>Select a chat from the left to start messaging.</Text>
                  </View>
                )}
               </View>
             </View>
           ) : null}

           {activeTab === 'feed' && currentScreen !== 'call' && (
             <FeedScreen
               currentUser={currentUser}
               onChats={handleBackToUsers}
               onPrivate={handlePrivateMode}
               onProfile={handleProfile}
               showTabBar={false}
             />
           )}
           
           {activeTab === 'profile' && currentScreen !== 'call' && (
             <ProfileScreen
               currentUser={currentUser}
               onChats={handleBackToUsers}
               onFeed={handleFeed}
               onPrivate={handlePrivateMode}
               onDeleteAccount={handleDeleteAccount}
               onUserUpdated={(user) => setCurrentUser(user)}
               showTabBar={false}
              onLogout={handleLogout}
             />
           )}

           {activeTab === 'private' && currentScreen !== 'call' && (
             <PrivateModeScreen onExit={handleExitPrivateMode} />
           )}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 20, color: colors.text }}>Connecting to secure server...</Text>
        <Text style={{ marginTop: 10, color: colors.mutedText, fontSize: 12 }}>This may take up to 60s on free tier.</Text>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} {...panResponder.panHandlers}>
      {currentScreen === 'login' && (
        Platform.OS === 'web' ? (
          <ViteLoginWeb onLogin={handleLogin} />
        ) : (
          <LoginScreen onLogin={handleLogin} />
        )
      )}
      
      {currentScreen === 'completeProfile' && currentUser && (
        <CompleteProfileScreen currentUser={currentUser} onComplete={handleProfileComplete} />
      )}
      
      {/* Responsive Layout for Web/Tablet */}
      {Platform.OS === 'web' && currentUser && currentScreen !== 'completeProfile' && renderWebLayout()}

      {/* Mobile Layout (Standard Stack) */}
      {Platform.OS !== 'web' && (
        <>
          {currentScreen === 'users' && currentUser && (
            <UsersListScreen
              currentUser={currentUser}
              onSelectUser={handleSelectUser}
              onViewProfile={handleViewProfile}
              onLogout={handleLogout}
              onPrivateMode={handlePrivateMode}
              onProfile={handleProfile}
              onFeed={handleFeed}
              onChats={handleBackToUsers}
              refreshToken={usersListRefreshToken}
            />
          )}
          
          {currentScreen === 'createGroup' && currentUser && (
            <CreateGroupScreen onBack={handleBackToUsers} />
          )}
          
          {currentScreen === 'call' && callData && (
            <CallScreen
              peerId={callData.peerId}
              peerName={callData.peerName}
              peerAvatar={callData.peerAvatar}
              callType={callData.callType}
              incoming={callData.incoming}
              callId={callData.callId}
              userID={currentUser.id}
              userName={currentUser.displayName}
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

          {currentScreen === 'userProfile' && currentUser && selectedProfileUser && (
            <UserProfileScreen
              currentUser={currentUser}
              user={selectedProfileUser}
              onBack={handleBackFromUserProfile}
              onMessage={(user) => {
                setSelectedProfileUser(null);
                handleSelectUser(user);
              }}
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
              onDeleteAccount={handleDeleteAccount}
              onUserUpdated={(user) => setCurrentUser(user)}
            />
          )}

          {currentScreen === 'feed' && currentUser && (
            <FeedScreen
              currentUser={currentUser}
              onChats={handleBackToUsers}
              onPrivate={handlePrivateMode}
              onProfile={handleProfile}
            />
          )}
        </>
      )}
      
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    </View>
  );
}

import { SafeAreaProvider } from 'react-native-safe-area-context';

function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') {
    return undefined;
  }
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
    // Alert.alert('Must use physical device for Push Notifications');
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

export default Sentry.wrap(App);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webContainer: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    height: Platform.OS === 'web' ? ('100vh' as any) : '100%',
  },
  webNavRail: {
    width: 72,
    borderRightWidth: 1,
    alignItems: 'center',
    paddingTop: 20,
  },
  webNavItem: {
    padding: 12,
    marginBottom: 20,
    borderRadius: 8,
  },
  navAvatarWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  webMainArea: {
    flex: 1,
    flexDirection: 'row',
  },
  webSidebar: {
    width: 350,
    borderRightWidth: 1,
  },
  webSidebarHidden: {
    // On smaller web screens, we might hide sidebar if chat is open, 
    // but for desktop, we want both.
    // For now, let's keep it visible on large screens
    // display: 'none', 
  },
  webContent: {
    flex: 1,
  },
  webContentEmpty: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
