import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  confirmPhoneOtp,
  signInCustomToken,
  signInEmailPassword,
  startPhoneOtp,
} from '../services/authClient';
import { api } from '../services/api';

interface LoginScreenProps {
  onLogin: (user: any) => void;
}

import i18n from '../i18n';

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [authMode, setAuthMode] = useState<'emailPassword' | 'emailOtp' | 'phoneOtp'>('emailPassword');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneConfirmation, setPhoneConfirmation] = useState<any>(null);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const recaptchaContainerId = 'recaptcha-container';

  React.useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setIsBiometricSupported(compatible && enrolled);
    
    // Auto-prompt if previously logged in
    const lastLogin = await AsyncStorage.getItem('last_login_email');
    if (lastLogin && compatible && enrolled) {
      handleBiometricAuth(lastLogin);
    }
  };

  const handleBiometricAuth = async (savedEmail: string) => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: i18n.t('loginTitle'),
        fallbackLabel: 'Use Passcode',
      });

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // In a real app, we would securely retrieve the password from Keychain
        // For this demo, we'll auto-fill email and focus password
        setEmail(savedEmail);
        setAuthMode('emailPassword');
        Alert.alert(i18n.t('welcomeBack'), 'Please enter your password to continue.');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAuth = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    try {
      if (authMode === 'emailPassword') {
        if (!email || !password) {
          Alert.alert(i18n.t('error'), i18n.t('enterEmailPass'));
          return;
        }

        const userCredential = await signInEmailPassword(email, password, isSignUp);

        const firebaseUser = userCredential.user;

        const result = await api.syncUser({
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || email.split('@')[0],
          photoURL: firebaseUser.photoURL || '',
          phoneNumber: (firebaseUser as any).phoneNumber || '',
        });

        if (result?.user) {
          if (authMode === 'emailPassword') {
            await AsyncStorage.setItem('last_login_email', email);
          }
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onLogin(result.user);
          return;
        }

        throw new Error(result?.error || 'Backend sync failed');
      }

      if (authMode === 'emailOtp') {
        if (!email) {
          Alert.alert(i18n.t('error'), i18n.t('enterEmail'));
          return;
        }

        if (!emailOtp) {
          await api.sendEmailOtp(email);
          Alert.alert(i18n.t('otpSent'), i18n.t('checkEmailOtp'));
          return;
        }

        const verify = await api.verifyEmailOtp(email, emailOtp);
        const token = verify?.customToken;
        if (!token) throw new Error('Invalid OTP response');

        const userCredential = await signInCustomToken(token);
        const firebaseUser = userCredential.user;

        const result = await api.syncUser({
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email || email,
          displayName: firebaseUser.displayName || email.split('@')[0],
          photoURL: firebaseUser.photoURL || '',
          phoneNumber: (firebaseUser as any).phoneNumber || '',
        });

        if (result?.user) {
          onLogin(result.user);
          return;
        }

        throw new Error(result?.error || 'Backend sync failed');
      }

      if (authMode === 'phoneOtp') {
        if (!phoneConfirmation) {
          if (!phoneNumber || !phoneNumber.startsWith('+')) {
            Alert.alert(i18n.t('error'), i18n.t('enterPhone'));
            return;
          }

          const confirmation =
            Platform.OS === 'web'
              ? await (startPhoneOtp as any)(phoneNumber, recaptchaContainerId)
              : await (startPhoneOtp as any)(phoneNumber);
          setPhoneConfirmation(confirmation);
          Alert.alert(i18n.t('otpSent'), i18n.t('checkSmsOtp'));
          return;
        }

        if (!phoneOtp || phoneOtp.length !== 6) {
          Alert.alert(i18n.t('error'), i18n.t('enterCode'));
          return;
        }

        const userCredential = await confirmPhoneOtp(phoneConfirmation, phoneOtp);
        if (!userCredential?.user) {
          throw new Error(i18n.t('phoneVerifyFailed'));
        }
        const firebaseUser = userCredential.user;

        const result = await api.syncUser({
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || (firebaseUser.phoneNumber || phoneNumber),
          photoURL: firebaseUser.photoURL || '',
          phoneNumber: firebaseUser.phoneNumber || phoneNumber,
        });

        if (result?.user) {
          onLogin(result.user);
          return;
        }

        throw new Error(result?.error || 'Backend sync failed');
      }
    } catch (error: any) {
      // Better error messages for users
      let displayMessage = i18n.t('authFailed');
      
      if (error.code) {
        switch(error.code) {
          case 'auth/invalid-credential':
          case 'auth/user-not-found':
          case 'auth/wrong-password':
            displayMessage = i18n.t('invalidCreds');
            break;
          case 'auth/email-already-in-use':
            displayMessage = i18n.t('emailInUse');
            break;
          case 'auth/invalid-email':
            displayMessage = i18n.t('invalidEmail');
            break;
          case 'auth/weak-password':
            displayMessage = i18n.t('weakPassword');
            break;
          case 'auth/network-request-failed':
            displayMessage = i18n.t('networkError');
            break;
          default:
            displayMessage = error.message || displayMessage;
        }
      } else if (error.message?.includes('Network')) {
        displayMessage = i18n.t('networkError');
      } else if (error.message?.includes('sync')) {
        displayMessage = i18n.t('syncError');
      }
      
      Alert.alert(i18n.t('error'), displayMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={styles.headerContainer}>
        <View style={styles.logoContainer}>
          <Ionicons name="chatbubble-ellipses" size={40} color="#fff" />
        </View>
        <Text style={styles.title}>{i18n.t('loginTitle')}</Text>
        <Text style={styles.subtitle}>{isSignUp ? i18n.t('createAccount') : i18n.t('welcomeBack')}</Text>
      </View>

      <View style={styles.formContainer}>
        {isBiometricSupported && (
          <TouchableOpacity 
            style={styles.bioButton} 
            onPress={() => {
              AsyncStorage.getItem('last_login_email').then(e => {
                if (e) handleBiometricAuth(e);
              });
            }}
            accessibilityLabel={i18n.t('tapToLogin')}
            accessibilityRole="button"
          >
            <Ionicons name="finger-print" size={40} color="#007AFF" />
            <Text style={styles.bioText}>{i18n.t('tapToLogin')}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.modeSwitch}>
          <TouchableOpacity
            style={[styles.modeButton, authMode === 'emailPassword' && styles.modeButtonActive]}
            onPress={() => {
              setAuthMode('emailPassword');
              setEmailOtp('');
              setPhoneOtp('');
              setPhoneConfirmation(null);
            }}
            accessibilityLabel={i18n.t('switchEmail')}
            accessibilityRole="tab"
            accessibilityState={{ selected: authMode === 'emailPassword' }}
          >
            <Text style={[styles.modeButtonText, authMode === 'emailPassword' && styles.modeButtonTextActive]}>
              {i18n.t('switchEmail')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, authMode === 'emailOtp' && styles.modeButtonActive]}
            onPress={() => {
              setAuthMode('emailOtp');
              setPassword('');
              setPhoneOtp('');
              setPhoneConfirmation(null);
            }}
            accessibilityLabel={i18n.t('switchEmailOtp')}
            accessibilityRole="tab"
            accessibilityState={{ selected: authMode === 'emailOtp' }}
          >
            <Text style={[styles.modeButtonText, authMode === 'emailOtp' && styles.modeButtonTextActive]}>
              {i18n.t('switchEmailOtp')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, authMode === 'phoneOtp' && styles.modeButtonActive]}
            onPress={() => {
              setAuthMode('phoneOtp');
              setPassword('');
              setEmailOtp('');
              setPhoneConfirmation(null);
            }}
            accessibilityLabel={i18n.t('switchPhoneOtp')}
            accessibilityRole="tab"
            accessibilityState={{ selected: authMode === 'phoneOtp' }}
          >
            <Text style={[styles.modeButtonText, authMode === 'phoneOtp' && styles.modeButtonTextActive]}>
              {i18n.t('switchPhoneOtp')}
            </Text>
          </TouchableOpacity>
        </View>

        {authMode !== 'phoneOtp' && (
        <TextInput
          style={styles.input}
          placeholder={i18n.t('email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#999"
          accessibilityLabel={i18n.t('email')}
        />
        )}

        {authMode === 'emailPassword' && (
          <TextInput
            style={styles.input}
            placeholder={i18n.t('password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#999"
            accessibilityLabel={i18n.t('password')}
          />
        )}

        {authMode === 'emailOtp' && (
          <TextInput
            style={styles.input}
            placeholder={i18n.t('sixDigitCode')}
            value={emailOtp}
            onChangeText={setEmailOtp}
            keyboardType="number-pad"
            placeholderTextColor="#999"
            accessibilityLabel={i18n.t('sixDigitCode')}
          />
        )}

        {authMode === 'phoneOtp' && (
          <>
            {Platform.OS === 'web' ? React.createElement('div', { id: recaptchaContainerId }) : null}
            <TextInput
              style={styles.input}
              placeholder={i18n.t('phoneNumber')}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoCapitalize="none"
              placeholderTextColor="#999"
              accessibilityLabel={i18n.t('phoneNumber')}
            />
            {phoneConfirmation && (
              <TextInput
                style={styles.input}
                placeholder={i18n.t('sixDigitCode')}
                value={phoneOtp}
                onChangeText={setPhoneOtp}
                keyboardType="number-pad"
                placeholderTextColor="#999"
                accessibilityLabel={i18n.t('sixDigitCode')}
              />
            )}
          </>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={handleAuth}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel={authMode === 'emailPassword' ? (isSignUp ? i18n.t('signUp') : i18n.t('login')) : (emailOtp || phoneConfirmation ? i18n.t('verifyCode') : i18n.t('sendCode'))}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {authMode === 'emailPassword'
                ? (isSignUp ? i18n.t('signUp') : i18n.t('login'))
                : authMode === 'emailOtp'
                ? (emailOtp ? i18n.t('verifyCode') : i18n.t('sendCode'))
                : (phoneConfirmation ? i18n.t('verifyCode') : i18n.t('sendCode'))}
            </Text>
          )}
        </TouchableOpacity>

        {authMode === 'emailPassword' && (
          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsSignUp(!isSignUp)}
            accessibilityRole="button"
            accessibilityLabel={isSignUp ? i18n.t('haveAccount') : i18n.t('noAccount')}
          >
            <Text style={styles.switchText}>
              {isSignUp
                ? i18n.t('haveAccount')
                : i18n.t('noAccount')}
            </Text>
          </TouchableOpacity>
        )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerContainer: {
    height: 300, // Fixed height instead of flex for ScrollView
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  bioButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  bioText: {
    color: '#007AFF',
    marginTop: 5,
    fontWeight: '600',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  logoIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  formContainer: {
    // flex: 0.6, // Removed flex
    padding: 24,
  },
  modeSwitch: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e4e8',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  modeButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0,122,255,0.08)',
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },
  modeButtonTextActive: {
    color: '#007AFF',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e4e8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    color: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  switchText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
