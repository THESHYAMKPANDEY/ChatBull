import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, ActivityIndicator, Platform, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  signInEmailPassword,
  signInCustomToken,
  sendForgotPasswordEmail,
  startPhoneOtp,
  confirmPhoneOtp,
  setupRecaptcha,
  updateUserPassword,
  getCurrentUser,
} from '../services/authClient';
import { api } from '../services/api';

interface Props {
  onLogin: (user: any) => void;
}

type SignUpStep = 0 | 1 | 2;

export default function ViteLoginWeb({ onLogin }: Props) {
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmation, setConfirmation] = useState<any>(null);
  const [countryCode, setCountryCode] = useState<'IN' | 'US' | 'UK' | 'JP' | 'DE'>('IN');
  const [callingCode, setCallingCode] = useState('91');
  const [isSignUp, setIsSignUp] = useState(false);
  const [signUpStep, setSignUpStep] = useState<SignUpStep>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const countries = [
    { code: 'IN', label: 'IN +91', calling: '91' },
    { code: 'US', label: 'US +1', calling: '1' },
    { code: 'UK', label: 'UK +44', calling: '44' },
    { code: 'JP', label: 'JP +81', calling: '81' },
    { code: 'DE', label: 'DE +49', calling: '49' },
  ] as const;

  useEffect(() => {
    if (Platform.OS === 'web') {
      setupRecaptcha('recaptcha-container');
    }
  }, []);

  useEffect(() => {
    setError('');
    setOtp('');
    setPassword('');
    setConfirmPassword('');
    setSignUpStep(0);
  }, [isSignUp, loginMethod]);

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address to reset password.');
      return;
    }
    try {
      setIsLoading(true);
      await sendForgotPasswordEmail(email);
      setError('');
      alert(`Password reset link sent to ${email}`);
    } catch (e: any) {
      setError(e.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email) throw new Error('Please enter your email address');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) throw new Error('Please enter a valid email address');

    if (!isSignUp) {
      if (!password) throw new Error('Please enter your password');
      const cred = await signInEmailPassword(email, password, false);
      const result = await api.syncUser({
        firebaseUid: cred.user.uid,
        email,
        displayName: cred.user.displayName || email.split('@')[0],
        photoURL: cred.user.photoURL || '',
        phoneNumber: cred.user.phoneNumber || '',
      });
      onLogin(result.user ?? { id: cred.user.uid, displayName: email.split('@')[0], email });
      return;
    }

    // Sign up flow: OTP -> verify -> set password
    if (signUpStep === 0) {
      await api.sendEmailOtp(email);
      setSignUpStep(1);
      return;
    }

    if (signUpStep === 1) {
      if (!otp || otp.length !== 6) throw new Error('Please enter the 6-digit OTP');
      const response = await api.verifyEmailOtp(email, otp);
      if (!response?.customToken) throw new Error('Invalid OTP response');
      await signInCustomToken(response.customToken);
      setSignUpStep(2);
      return;
    }

    if (signUpStep === 2) {
      if (!password) throw new Error('Please set a password');
      if (password !== confirmPassword) throw new Error('Passwords do not match');
      const user = getCurrentUser();
      if (!user) throw new Error('Session expired. Please verify email again.');
      await updateUserPassword(user, password);
      const result = await api.syncUser({
        firebaseUid: user.uid,
        email,
        displayName: user.displayName || email.split('@')[0],
        photoURL: user.photoURL || '',
        phoneNumber: user.phoneNumber || '',
      });
      onLogin(result.user ?? { id: user.uid, displayName: email.split('@')[0], email });
    }
  };

  const handlePhoneLogin = async () => {
    if (!phone) throw new Error('Please enter your phone number');
    const fullNumber = `+${callingCode}${phone}`;

    if (!confirmation) {
      const conf = await startPhoneOtp(fullNumber);
      setConfirmation(conf);
      return;
    }

    if (!otp || otp.length !== 6) throw new Error('Please enter the 6-digit OTP');

    const userCredential = await confirmPhoneOtp(confirmation, otp);
    const result = await api.syncUser({
      firebaseUid: userCredential.user.uid,
      email: userCredential.user.email || '',
      displayName: userCredential.user.displayName || fullNumber,
      photoURL: userCredential.user.photoURL || '',
      phoneNumber: fullNumber,
    });
    onLogin(result.user ?? { id: userCredential.user.uid, displayName: fullNumber, phoneNumber: fullNumber });
  };

  const handleSubmit = async () => {
    setError('');
    setIsLoading(true);
    try {
      if (loginMethod === 'email') {
        await handleEmailLogin();
      } else {
        await handlePhoneLogin();
      }
    } catch (e: any) {
      let msg = e.message || 'Login failed. Please try again.';
      if (e.code === 'auth/invalid-phone-number') msg = 'Please enter a valid phone number.';
      if (e.code === 'auth/too-many-requests') msg = 'Too many attempts. Please try again later.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const buttonLabel = () => {
    if (loginMethod === 'phone') return confirmation ? 'Verify' : 'Send OTP';
    if (!isSignUp) return 'Sign In';
    if (signUpStep === 0) return 'Send Verification Code';
    if (signUpStep === 1) return 'Verify Email';
    return 'Create Account';
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logoContainer}>
          <View style={styles.logoWrapper}>
            <Image source={require('../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
          </View>
        </View>
        <Text style={styles.title}>ChatBull</Text>
        <Text style={styles.subtitle}>{isSignUp ? 'Create your account' : 'Sign in to your account'}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, loginMethod === 'email' && styles.tabActive]}
            onPress={() => setLoginMethod('email')}
          >
            <Text style={[styles.tabText, loginMethod === 'email' && styles.tabTextActive]}>Email</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, loginMethod === 'phone' && styles.tabActive]}
            onPress={() => setLoginMethod('phone')}
          >
            <Text style={[styles.tabText, loginMethod === 'phone' && styles.tabTextActive]}>Phone</Text>
          </TouchableOpacity>
        </View>

        {loginMethod === 'email' ? (
          <>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email Address</Text>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e: any) => setEmail(e.target.value)}
                disabled={isLoading || (isSignUp && signUpStep > 0)}
                className="vite-input"
                style={styles.input as any}
              />
            </View>

            {!isSignUp && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Password</Text>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e: any) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="vite-input"
                  style={styles.input as any}
                />
              </View>
            )}

            {isSignUp && signUpStep === 1 && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Enter Verification Code</Text>
                <input
                  id="otp"
                  type="tel"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e: any) => setOtp(e.target.value.replace(/\D/g, ''))}
                  disabled={isLoading}
                  className="vite-input"
                  style={styles.input as any}
                />
              </View>
            )}

            {isSignUp && signUpStep === 2 && (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Set Password</Text>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e: any) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="vite-input"
                    style={styles.input as any}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e: any) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    className="vite-input"
                    style={styles.input as any}
                  />
                </View>
              </>
            )}
          </>
        ) : (
          <>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Mobile Number</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <select
                  value={countryCode}
                  onChange={(e: any) => {
                    const val = e.target.value as typeof countryCode;
                    const found = countries.find(c => c.code === val)!;
                    setCountryCode(val);
                    setCallingCode(found.calling);
                  }}
                  disabled={isLoading || !!confirmation}
                  style={{
                    width: 130,
                    padding: 12,
                    fontSize: 16,
                    borderWidth: 1,
                    borderColor: '#e9edef',
                    borderRadius: 8,
                    backgroundColor: '#f0f2f5',
                  } as any}
                >
                  {countries.map(c => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
                <input
                  id="phone"
                  type="tel"
                  placeholder="Mobile number"
                  value={phone}
                  onChange={(e: any) => setPhone(e.target.value.replace(/\D/g, ''))}
                  disabled={isLoading || !!confirmation}
                  className="vite-input"
                  style={styles.input as any}
                />
              </View>
            </View>
            {confirmation && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Enter OTP</Text>
                <input
                  id="otp"
                  type="tel"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e: any) => setOtp(e.target.value.replace(/\D/g, ''))}
                  disabled={isLoading}
                  className="vite-input"
                  style={styles.input as any}
                />
              </View>
            )}
          </>
        )}

        <View nativeID="recaptcha-container" />

        <Pressable
          nativeID="sign-in-button"
          style={[styles.button, isLoading && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.buttonText}>{buttonLabel()}</Text>
          )}
        </Pressable>

        {loginMethod === 'email' && !isSignUp && (
          <TouchableOpacity style={{ marginTop: 12 }} onPress={handleForgotPassword}>
            <Text style={styles.link}>Forgot your password?</Text>
          </TouchableOpacity>
        )}

        <View style={{ marginTop: 16, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.muted}>{isSignUp ? 'Already have an account?' : "Don't have an account?"} </Text>
            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
              <Text style={styles.link}>{isSignUp ? 'Sign In' : 'Sign Up'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialRow}>
          <TouchableOpacity style={styles.socialBtn}>
            <Ionicons name="logo-google" size={20} color="#DB4437" />
            <Text style={styles.socialBtnText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: '100vh' as any,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f2f5',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 420,
    padding: 32,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)' as any,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoWrapper: {
    backgroundColor: '#fff',
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    padding: 2,
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 22,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#128c7e',
    textAlign: 'center',
    marginTop: 16,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#54656f',
    marginTop: 8,
    marginBottom: 32,
    textAlign: 'center',
    fontWeight: '400',
  },
  error: {
    backgroundColor: '#fce8e8',
    color: '#ea0038',
    padding: 10,
    borderRadius: 6,
    fontSize: 14,
    marginBottom: 10,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#f0f2f5',
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)' as any,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#54656f',
  },
  tabTextActive: {
    color: '#128c7e',
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111b21',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#d1d7db',
    borderRadius: 8,
    backgroundColor: '#fff',
    color: '#111b21',
  },
  muted: {
    color: '#8696a0',
    fontSize: 14,
  },
  link: {
    color: '#128c7e',
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#128c7e',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    minHeight: 52,
    shadowColor: '#128c7e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e9edef',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#5f6368',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  socialRow: {
    marginTop: 12,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#dadce0',
    borderRadius: 24,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  socialBtnText: {
    marginLeft: 10,
    color: '#3c4043',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});
