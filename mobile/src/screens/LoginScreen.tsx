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
} from 'react-native';
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
  const recaptchaContainerId = 'recaptcha-container';

  const handleAuth = async () => {
    setIsLoading(true);
    try {
      if (authMode === 'emailPassword') {
        if (!email || !password) {
          Alert.alert('Error', 'Please enter email and password');
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
          onLogin(result.user);
          return;
        }

        throw new Error(result?.error || 'Backend sync failed');
      }

      if (authMode === 'emailOtp') {
        if (!email) {
          Alert.alert('Error', 'Please enter email');
          return;
        }

        if (!emailOtp) {
          await api.sendEmailOtp(email);
          Alert.alert('OTP Sent', 'Check your email for the 6-digit code.');
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
            Alert.alert('Error', 'Enter phone number in international format (e.g. +15551234567)');
            return;
          }

          const confirmation =
            Platform.OS === 'web'
              ? await (startPhoneOtp as any)(phoneNumber, recaptchaContainerId)
              : await (startPhoneOtp as any)(phoneNumber);
          setPhoneConfirmation(confirmation);
          Alert.alert('OTP Sent', 'Check your SMS for the 6-digit code.');
          return;
        }

        if (!phoneOtp || phoneOtp.length !== 6) {
          Alert.alert('Error', 'Please enter the 6-digit code');
          return;
        }

        const userCredential = await confirmPhoneOtp(phoneConfirmation, phoneOtp);
        if (!userCredential?.user) {
          throw new Error('Phone verification failed');
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
      let displayMessage = 'Authentication failed. Please try again.';
      
      if (error.code) {
        switch(error.code) {
          case 'auth/invalid-credential':
          case 'auth/user-not-found':
          case 'auth/wrong-password':
            displayMessage = 'Invalid email or password.';
            break;
          case 'auth/email-already-in-use':
            displayMessage = 'This email is already registered. Please login instead.';
            break;
          case 'auth/invalid-email':
            displayMessage = 'Please enter a valid email address.';
            break;
          case 'auth/weak-password':
            displayMessage = 'Password should be at least 6 characters.';
            break;
          case 'auth/network-request-failed':
            displayMessage = 'Network error. Please check your internet connection.';
            break;
          default:
            displayMessage = error.message || displayMessage;
        }
      } else if (error.message?.includes('Network')) {
        displayMessage = 'Cannot reach backend. Check WiFi and API URL.';
      } else if (error.message?.includes('sync')) {
        displayMessage = 'Login successful but failed to connect to server. Please try again.';
      }
      
      Alert.alert('Login Failed', displayMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>💬</Text>
        </View>
        <Text style={styles.title}>ChatBull</Text>
        <Text style={styles.subtitle}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.modeSwitch}>
          <TouchableOpacity
            style={[styles.modeButton, authMode === 'emailPassword' && styles.modeButtonActive]}
            onPress={() => {
              setAuthMode('emailPassword');
              setEmailOtp('');
              setPhoneOtp('');
              setPhoneConfirmation(null);
            }}
          >
            <Text style={[styles.modeButtonText, authMode === 'emailPassword' && styles.modeButtonTextActive]}>
              Email
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
          >
            <Text style={[styles.modeButtonText, authMode === 'emailOtp' && styles.modeButtonTextActive]}>
              Email OTP
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
          >
            <Text style={[styles.modeButtonText, authMode === 'phoneOtp' && styles.modeButtonTextActive]}>
              Phone OTP
            </Text>
          </TouchableOpacity>
        </View>

        {authMode !== 'phoneOtp' && (
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#999"
        />
        )}

        {authMode === 'emailPassword' && (
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#999"
          />
        )}

        {authMode === 'emailOtp' && (
          <TextInput
            style={styles.input}
            placeholder="6-digit code"
            value={emailOtp}
            onChangeText={setEmailOtp}
            keyboardType="number-pad"
            placeholderTextColor="#999"
          />
        )}

        {authMode === 'phoneOtp' && (
          <>
            {Platform.OS === 'web' ? React.createElement('div', { id: recaptchaContainerId }) : null}
            <TextInput
              style={styles.input}
              placeholder="+15551234567"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoCapitalize="none"
              placeholderTextColor="#999"
            />
            {phoneConfirmation && (
              <TextInput
                style={styles.input}
                placeholder="6-digit code"
                value={phoneOtp}
                onChangeText={setPhoneOtp}
                keyboardType="number-pad"
                placeholderTextColor="#999"
              />
            )}
          </>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={handleAuth}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {authMode === 'emailPassword'
                ? (isSignUp ? 'Sign Up' : 'Login')
                : authMode === 'emailOtp'
                ? (emailOtp ? 'Verify Code' : 'Send Code')
                : (phoneConfirmation ? 'Verify Code' : 'Send Code')}
            </Text>
          )}
        </TouchableOpacity>

        {authMode === 'emailPassword' && (
          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsSignUp(!isSignUp)}
          >
            <Text style={styles.switchText}>
              {isSignUp
                ? 'Already have an account? Login'
                : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerContainer: {
    flex: 0.4,
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
    flex: 0.6,
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
