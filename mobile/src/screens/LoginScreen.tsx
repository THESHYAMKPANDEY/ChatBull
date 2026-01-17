import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  reload,
  linkWithPhoneNumber,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { api } from '../services/api';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { firebaseConfig } from '../config/firebase';

interface LoginScreenProps {
  onLogin: (user: any) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [step, setStep] = useState<'auth' | 'verifyEmail' | 'verifyPhone'>('auth');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [confirmation, setConfirmation] = useState<any>(null);
  const recaptchaVerifier = React.useRef<FirebaseRecaptchaVerifierModal>(null);

  const syncAndLogin = async (firebaseUser: any) => {
    const result = await api.syncUser({
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email || email,
      displayName: firebaseUser.displayName || (firebaseUser.email || email).split('@')[0],
      photoURL: firebaseUser.photoURL || '',
      phoneNumber: firebaseUser.phoneNumber || undefined,
    });

    if (result.success === false) {
      throw new Error(result.error || 'Backend sync failed');
    }

    if (result.user) {
      onLogin(result.user);
      return;
    }

    throw new Error('Backend sync did not return user data');
  };

  const handleAuth = async () => {
    console.log('LOGIN START:', isSignUp ? 'SIGNUP' : 'LOGIN');
    
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setIsLoading(true);
    try {
      let userCredential;
      
      console.log('Attempting', isSignUp ? 'sign up' : 'login', 'for email:', email);
      
      if (isSignUp) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }

      const firebaseUser = userCredential.user;
      console.log('Firebase login success for user:', firebaseUser.uid);

      await reload(firebaseUser);
      // Temporarily disabled email verification check for development
      // if (!firebaseUser.emailVerified) {
      //   setStep('verifyEmail');
      //   return;
      // }

      if (!firebaseUser.phoneNumber) {
        setStep('verifyPhone');
        return;
      }

      await syncAndLogin(firebaseUser);
    } catch (error: any) {
      console.error('❌ FULL AUTH ERROR:', error);
      console.error('Error stack:', error.stack);
      
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

  const checkEmailVerified = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setIsLoading(true);
    try {
      await reload(user);
      if (!user.emailVerified) {
        Alert.alert('Not verified yet', 'Please verify your email, then tap "I Verified".');
        return;
      }
      if (!user.phoneNumber) {
        setStep('verifyPhone');
        return;
      }
      await syncAndLogin(user);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to verify');
    } finally {
      setIsLoading(false);
    }
  };

  const resendEmailVerification = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setIsLoading(true);
    try {
      await sendEmailVerification(user);
      Alert.alert('Sent', 'Verification email sent. Please check your inbox/spam.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend');
    } finally {
      setIsLoading(false);
    }
  };

  const sendPhoneOtp = async () => {
    const user = auth.currentUser;
    if (!user) return;
    if (!phoneNumber.trim().startsWith('+')) {
      Alert.alert('Phone format', 'Use E.164 format like +919999999999');
      return;
    }
    setIsLoading(true);
    try {
      const result = await linkWithPhoneNumber(user, phoneNumber.trim(), recaptchaVerifier.current as any);
      setConfirmation(result);
      Alert.alert('OTP sent', 'Enter the SMS code to verify your phone.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPhoneOtp = async () => {
    const user = auth.currentUser;
    if (!user) return;
    if (!confirmation) {
      Alert.alert('Send OTP first', 'Tap "Send OTP" first.');
      return;
    }
    if (!otpCode.trim()) {
      Alert.alert('Enter code', 'Please enter the SMS OTP code.');
      return;
    }
    setIsLoading(true);
    try {
      await confirmation.confirm(otpCode.trim());
      await reload(user);
      await syncAndLogin(auth.currentUser);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to verify OTP');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={firebaseConfig as any}
      />

      <View style={styles.headerContainer}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>💬</Text>
        </View>
        <Text style={styles.title}>ChatBull</Text>
        <Text style={styles.subtitle}>
          {step === 'auth'
            ? isSignUp
              ? 'Create Account'
              : 'Welcome Back'
            : step === 'verifyEmail'
              ? 'Verify Email'
              : 'Verify Phone'}
        </Text>
      </View>

      <View style={styles.formContainer}>
        {step === 'verifyEmail' && (
          <>
            <Text style={styles.helperText}>
              We sent a verification link to your email. Open it, then come back.
            </Text>

            <TouchableOpacity style={styles.button} onPress={checkEmailVerified} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>I Verified</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.switchButton} onPress={resendEmailVerification} disabled={isLoading}>
              <Text style={styles.switchText}>Resend verification email</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'verifyPhone' && (
          <>
            <Text style={styles.helperText}>
              Verify your phone with OTP (SMS). Use format like +919999999999.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Phone number (+countrycode...)"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoCapitalize="none"
              placeholderTextColor="#999"
            />

            <TouchableOpacity style={styles.button} onPress={sendPhoneOtp} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send OTP</Text>}
            </TouchableOpacity>

            {confirmation && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Enter OTP"
                  value={otpCode}
                  onChangeText={setOtpCode}
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  placeholderTextColor="#999"
                />

                <TouchableOpacity style={styles.button} onPress={verifyPhoneOtp} disabled={isLoading}>
                  {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify OTP</Text>}
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.switchButton}
              onPress={async () => {
                try {
                  const user = auth.currentUser;
                  if (user) {
                    await syncAndLogin(user);
                  }
                } catch (error: any) {
                  Alert.alert('Error', error.message || 'Failed to continue');
                }
              }}
              disabled={isLoading}
            >
              <Text style={styles.switchText}>Skip for now</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'auth' && (
          <>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#999"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#999"
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleAuth}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isSignUp ? 'Sign Up' : 'Login'}
            </Text>
          )}
        </TouchableOpacity>

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
          </>
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
  helperText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
    lineHeight: 18,
  },
  formContainer: {
    flex: 0.6,
    padding: 24,
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
