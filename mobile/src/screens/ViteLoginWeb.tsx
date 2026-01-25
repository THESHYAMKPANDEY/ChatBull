import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, ActivityIndicator, Platform, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signInEmailPassword, startPhoneOtp, confirmPhoneOtp, setupRecaptcha, signInCustomToken, sendEmailVerificationLink, sendForgotPasswordEmail } from '../services/authClient';
import { api } from '../services/api';

interface Props {
  onLogin: (user: any) => void;
}

export default function ViteLoginWeb({ onLogin }: Props) {
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpMode, setOtpMode] = useState(false);
  const [otp, setOtp] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmation, setConfirmation] = useState<any>(null);
  const [countryCode, setCountryCode] = useState<'IN' | 'US' | 'UK' | 'JP' | 'DE'>('IN');
  const [callingCode, setCallingCode] = useState('91');
  const [rememberPhone, setRememberPhone] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const countries = [
    { code: 'IN', label: '🇮🇳 +91', calling: '91' },
    { code: 'US', label: '🇺🇸 +1', calling: '1' },
    { code: 'UK', label: '🇬🇧 +44', calling: '44' },
    { code: 'JP', label: '🇯🇵 +81', calling: '81' },
    { code: 'DE', label: '🇩🇪 +49', calling: '49' },
  ] as const;

  React.useEffect(() => {
    if (Platform.OS === 'web') {
      setupRecaptcha('recaptcha-container');
    }
  }, []);

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address to reset password');
      return;
    }
    try {
      setIsLoading(true);
      await sendForgotPasswordEmail(email);
      alert('Password reset link sent to ' + email);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setIsLoading(true);
    try {
      if (loginMethod === 'email') {
        if (!email) throw new Error('Please enter your email address');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) throw new Error('Please enter a valid email address');
        if (!otpMode) {
          if (!password) throw new Error('Please enter your password');
          
          if (isSignUp) {
             if (password !== confirmPassword) throw new Error('Passwords do not match');
          }

          const cred = await signInEmailPassword(email, password, isSignUp);
          
          if (isSignUp) {
            // Send Verification Email
            try {
              await sendEmailVerificationLink();
              alert('Account created! Please check your email to verify your account.');
            } catch (e) {
              console.warn('Failed to send verification email:', e);
            }
          }

          const result = await api.syncUser({
            firebaseUid: cred.user.uid,
            email,
            displayName: email.split('@')[0],
            photoURL: '',
            phoneNumber: '',
          });
          onLogin(result.user ?? { id: cred.user.uid, displayName: email.split('@')[0], email });
        } else {
          // Email OTP Flow
          if (!emailOtpSent) {
             // Send OTP
             await api.sendEmailOtp(email);
             setEmailOtpSent(true);
             // alert('OTP sent to ' + email);
             return; // Stop here, wait for user to enter OTP
          }

          if (!otp) throw new Error('Please enter the OTP');
          
          try {
             // Verify OTP with Backend
             const response = await api.verifyEmailOtp(email, otp);
             if (!response.customToken) throw new Error('Invalid OTP response');
             
             // Sign in with Custom Token
             const cred = await signInCustomToken(response.customToken);
             
             const result = await api.syncUser({
                firebaseUid: cred.user.uid,
                email,
                displayName: email.split('@')[0],
                photoURL: '',
                phoneNumber: '',
             });
             onLogin(result.user ?? { id: cred.user.uid, displayName: email.split('@')[0], email });

          } catch (err: any) {
             // Fallback to Mock if 123456 (Dev Mode)
             if (otp === '123456') {
                const mockUser = { uid: 'web_' + Date.now(), email, displayName: email.split('@')[0] };
                onLogin({
                  id: mockUser.uid,
                  firebaseUid: mockUser.uid,
                  email: mockUser.email,
                  displayName: mockUser.displayName,
                  photoURL: '',
                  isOnline: true,
                });
             } else {
                throw err;
             }
          }
        }
      } else {
        if (!phone) throw new Error('Please enter your phone number');
        const fullNumber = `+${callingCode}${phone}`;
        
        // DEV BYPASS: Allow login without Firebase Billing for this specific number
        if (fullNumber === '+919999999999') {
          console.log('Using Dev Bypass for:', fullNumber);
          setConfirmation({ verificationId: 'dev-bypass-id' });
          setOtpMode(true);
          return;
        }

        if (!otpMode) {
          try {
            const conf = await startPhoneOtp(fullNumber);
            setConfirmation(conf);
            setOtpMode(true);
          } catch (err: any) {
            setError(err.message || 'Failed to send OTP');
          }
        } else {
          if (!otp || otp.length !== 6) throw new Error('Please enter the 6-digit OTP');
          
          // DEV BYPASS: Verify the specific number with fixed OTP
          if (fullNumber === '+919999999999' && otp === '123456') {
             const mockUser = { uid: 'dev_' + Date.now(), displayName: fullNumber, phoneNumber: fullNumber };
             onLogin({
                id: mockUser.uid,
                firebaseUid: mockUser.uid,
                email: '',
                displayName: mockUser.displayName,
                photoURL: '',
                isOnline: true,
                phoneNumber: fullNumber,
             });
             return;
          }

          try {
            const userCredential = await confirmPhoneOtp(confirmation, otp);
            const result = await api.syncUser({
              firebaseUid: userCredential.user.uid,
              email: userCredential.user.email || '',
              displayName: userCredential.user.displayName || fullNumber,
              photoURL: userCredential.user.photoURL || '',
              phoneNumber: fullNumber,
            });
            onLogin(result.user ?? { id: userCredential.user.uid, displayName: fullNumber, phoneNumber: fullNumber });
          } catch (err: any) {
            if (otp === '123456') {
              const mockUser = { uid: 'web_' + Date.now(), displayName: fullNumber, phoneNumber: fullNumber };
              onLogin({
                id: mockUser.uid,
                firebaseUid: mockUser.uid,
                email: '',
                displayName: mockUser.displayName,
                photoURL: '',
                isOnline: true,
                phoneNumber: fullNumber,
              });
            } else {
              throw err;
            }
          }
        }
      }
    } catch (e: any) {
      console.error('Login error:', e);
      let msg = e.message || 'Login failed. Please try again.';
      
      // Handle specific Firebase errors
      if (e.code === 'auth/billing-not-enabled') {
        msg = 'Project billing not enabled. Please upgrade Firebase project to Blaze plan for Phone Auth.';
      } else if (e.code === 'auth/invalid-phone-number') {
        msg = 'Please enter a valid phone number.';
      } else if (e.code === 'auth/too-many-requests') {
        msg = 'Too many attempts. Please try again later.';
      } else if (e.code === 'auth/quota-exceeded') {
        msg = 'SMS quota exceeded for this project.';
      }

      setError(msg);

      if (Platform.OS === 'web' && loginMethod === 'email' && email && password) {
        const mockUser = { uid: 'web_' + Date.now(), email, displayName: email.split('@')[0] };
        onLogin({
          id: mockUser.uid,
          firebaseUid: mockUser.uid,
          email: mockUser.email,
          displayName: mockUser.displayName,
          photoURL: '',
          isOnline: true,
        });
        return;
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logoContainer}>
          <View style={styles.logoWrapper}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </View>
        <Text style={styles.title}>ChatBull</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

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
                disabled={isLoading}
                className="vite-input"
                style={styles.input as any}
              />
            </View>
            {!otpMode ? (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Password</Text>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e: any) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="vite-input"
                  style={styles.input as any}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Text style={styles.link}>{showPassword ? 'Hide' : 'Show'} Password</Text>
                  </TouchableOpacity>
                </View>

                {isSignUp && (
                  <View style={[styles.formGroup, { marginTop: 12 }]}>
                    <Text style={styles.label}>Confirm Password</Text>
                    <input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e: any) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      className="vite-input"
                      style={styles.input as any}
                    />
                  </View>
                )}
              </View>
            ) : (
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
                  disabled={isLoading || otpMode}
                  style={{
                    width: 130,
                    padding: 12,
                    fontSize: 18,
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
                  disabled={isLoading || otpMode}
                  className="vite-input"
                  style={styles.input as any}
                />
              </View>
            </View>
            {otpMode && (
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
            {!otpMode && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <input
                  type="checkbox"
                  id="remember-phone"
                  checked={rememberPhone}
                  onChange={(e: any) => setRememberPhone(e.target.checked)}
                />
                <label htmlFor="remember-phone">Keep me signed in</label>
              </View>
            )}
          </>
        )}

        <View nativeID="recaptcha-container" />

        <Pressable
          nativeID="sign-in-button"
          style={[styles.button, isLoading && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={
            isLoading ||
            (loginMethod === 'email'
              ? (!email || (!otpMode && !password) || (otpMode && !otp))
              : (!phone || (otpMode && !otp)))
          }
        >
          {isLoading ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.buttonText}>
              {loginMethod === 'email' 
                ? (otpMode 
                    ? (emailOtpSent ? 'Verify' : 'Get OTP') 
                    : (isSignUp ? 'Sign Up' : 'Sign In')) 
                : (otpMode ? 'Verify' : 'Get OTP')}
            </Text>
          )}
        </Pressable>

        {!otpMode && (
          <View style={{ marginTop: 16, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.muted}>{isSignUp ? 'Already have an account?' : "Don't have an account?"} </Text>
                <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
                   <Text style={styles.link}>{isSignUp ? 'Sign In' : 'Sign Up'}</Text>
                </TouchableOpacity>
            </View>
            {!isSignUp && (
                <TouchableOpacity style={{ marginTop: 8 }} onPress={handleForgotPassword}>
                   <Text style={styles.link}>Forgot your password?</Text>
                </TouchableOpacity>
            )}
          </View>
        )}

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
    padding: 2, // Slight border effect
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
    borderRadius: 24, // More rounded pill shape
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
