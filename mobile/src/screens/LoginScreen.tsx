import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import CountryPicker, { CountryCode, Country } from 'react-native-country-picker-modal';

import {
  confirmPhoneOtp,
  signInCustomToken,
  signInEmailPassword,
  startPhoneOtp,
  resetRecaptcha,
  setupRecaptcha,
} from '../services/authClient';
import { api } from '../services/api';
import { useTheme } from '../config/theme';
import i18n from '../i18n';
import AppTextField from '../components/ui/AppTextField';
import { spacing, radii } from '../config/tokens';

// Refresh tokens
interface LoginScreenProps {
  onLogin: (user: any) => void;
}

const { width } = Dimensions.get('window');

// Password Strength Helper
const calculateStrength = (pass: string) => {
  let score = 0;
  if (!pass) return 0;
  if (pass.length > 6) score++;
  if (pass.length > 10) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  return Math.min(score, 5); // Max score 5
};

const PasswordStrengthMeter = ({ password }: { password: string }) => {
  const score = calculateStrength(password);
  const { colors } = useTheme();
  
  if (!password) return null;

  const getColor = () => {
    if (score <= 2) return colors.danger;
    if (score <= 3) return '#FFC107'; // Warning/Yellow
    return '#4CAF50'; // Success/Green
  };

  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];

  return (
    <View style={{ marginTop: 5, marginBottom: 15 }}>
      <View style={{ flexDirection: 'row', height: 4, width: '100%', backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' }}>
        <View style={{ width: `${(score / 5) * 100}%`, backgroundColor: getColor(), height: '100%' }} />
      </View>
      <Text style={{ fontSize: 11, color: getColor(), marginTop: 4, alignSelf: 'flex-end' }}>
        {labels[score]}
      </Text>
    </View>
  );
};

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const { colors, theme, toggleTheme } = useTheme();
  
  // Unified state for input
  const [inputValue, setInputValue] = useState('');
  const [inputType, setInputType] = useState<'email' | 'phone'>('email');
  const [countryCode, setCountryCode] = useState<CountryCode>('US');
  const [callingCode, setCallingCode] = useState('1');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [otp, setOtp] = useState('');
  const [confirmation, setConfirmation] = useState<any>(null);
  const [otpSent, setOtpSent] = useState(false);
  
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const recaptchaContainerId = 'sign-in-button';

  // Animation for smooth mode switching
  const fadeAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    checkBiometrics();
  }, []);

  // Dynamic input type detection
  useEffect(() => {
    if (/^\d+$/.test(inputValue.replace(/\s/g, ''))) {
      setInputType('phone');
    } else {
      setInputType('email');
    }
  }, [inputValue]);

  const checkBiometrics = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setIsBiometricSupported(compatible && enrolled);
    
    // Auto-prompt if previously logged in
    const lastLogin = await AsyncStorage.getItem('last_login_email');
    if (lastLogin && compatible && enrolled) {
      // Optional: Prompt immediately or wait for user action
      // handleBiometricAuth(lastLogin); 
    }
  };

  const handleBiometricAuth = async (savedEmail?: string) => {
    try {
      const emailToUse = savedEmail || await AsyncStorage.getItem('last_login_email');
      if (!emailToUse) {
        Alert.alert('No saved login found', 'Please log in with password first.');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: i18n.t('loginTitle'),
        fallbackLabel: 'Use Passcode',
      });

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setInputValue(emailToUse);
        setInputType('email');
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
      // CASE 1: PHONE NUMBER LOGIN (OTP)
      if (inputType === 'phone') {
        const fullPhoneNumber = `+${callingCode}${inputValue}`;
        
        if (!otpSent) {
          if (!inputValue) {
             Alert.alert(i18n.t('error'), i18n.t('enterPhone'));
             setIsLoading(false);
             return;
          }
          
          const confirmationResult = Platform.OS === 'web'
            ? await (startPhoneOtp as any)(fullPhoneNumber, recaptchaContainerId)
            : await (startPhoneOtp as any)(fullPhoneNumber);
            
          setConfirmation(confirmationResult);
          setOtpSent(true);
          Alert.alert(i18n.t('otpSent'), i18n.t('checkSmsOtp'));
          setIsLoading(false);
          return;
        } else {
          // Verify OTP
          if (!otp || otp.length !== 6) {
            Alert.alert(i18n.t('error'), i18n.t('enterCode'));
            setIsLoading(false);
            return;
          }
          
          const userCredential = await confirmPhoneOtp(confirmation, otp);
          if (!userCredential?.user) throw new Error(i18n.t('phoneVerifyFailed'));
          
          await syncAndLogin(userCredential.user, fullPhoneNumber, 'phone');
          return;
        }
      } 
      
      // CASE 2: EMAIL LOGIN (PASSWORD OR OTP)
      else {
        if (!inputValue) {
          Alert.alert(i18n.t('error'), i18n.t('enterEmail'));
          setIsLoading(false);
          return;
        }

        // Check if we are using OTP for email (optional feature, but defaulting to password for unified flow)
        // For this unified flow, we will assume Email + Password unless it's sign up
        
        if (!password) {
          Alert.alert(i18n.t('error'), i18n.t('enterEmailPass'));
          setIsLoading(false);
          return;
        }

        const userCredential = await signInEmailPassword(inputValue, password, isSignUp);
        await syncAndLogin(userCredential.user, inputValue, 'email');
      }
    } catch (error: any) {
      handleError(error);
      if (Platform.OS === 'web' && inputType === 'email' && inputValue && password) {
        const mockUser = { uid: 'web_' + Date.now(), email: inputValue, displayName: inputValue.split('@')[0] };
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

  const syncAndLogin = async (firebaseUser: any, identifier: string, method: 'email' | 'phone') => {
    try {
      const result = await api.syncUser({
        firebaseUid: firebaseUser.uid,
        email: method === 'email' ? identifier : (firebaseUser.email || ''),
        displayName: firebaseUser.displayName || (method === 'email' ? identifier.split('@')[0] : identifier),
        photoURL: firebaseUser.photoURL || '',
        phoneNumber: method === 'phone' ? identifier : (firebaseUser.phoneNumber || ''),
      });

      if (result?.user) {
        if (method === 'email') {
          await AsyncStorage.setItem('last_login_email', identifier);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onLogin(result.user);
      } else {
        throw new Error(result?.error || 'Backend sync failed');
      }
    } catch (e: any) {
      throw e;
    }
  };

  const handleError = (error: any) => {
      let displayMessage = i18n.t('authFailed');
      if (error.code === 'auth/invalid-credential') displayMessage = i18n.t('invalidCreds');
      else if (error.code === 'auth/email-already-in-use') displayMessage = i18n.t('emailInUse');
      else if (error.code === 'auth/weak-password') displayMessage = i18n.t('weakPassword');
      else displayMessage = error.message || displayMessage;
      
      Alert.alert(i18n.t('error'), displayMessage);
      if (Platform.OS === 'web') resetRecaptcha();
  };

  const onSelectCountry = (country: Country) => {
    setCountryCode(country.cca2);
    setCallingCode(country.callingCode[0]);
    setShowCountryPicker(false);
  };

  const toggleLang = () => {
    i18n.locale = i18n.locale === 'en' ? 'es' : 'en'; 
    Alert.alert('Language', `Switched to ${i18n.locale.toUpperCase()} (Requires reload to fully apply)`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={toggleTheme} style={styles.iconButton}>
              <Ionicons name={theme === 'dark' ? 'sunny' : 'moon'} size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleLang} style={styles.iconButton}>
              <Ionicons name="globe-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../assets/icon.png')} 
                style={{ width: 100, height: 100, borderRadius: 20 }} 
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>ChatBull</Text>
            <Text style={[styles.subtitle, { color: colors.mutedText }]}>
              {isSignUp ? 'Create an account to get started' : 'Welcome back, please log in'}
            </Text>
          </View>

          {/* Main Card */}
          <Animated.View style={[styles.card, { backgroundColor: colors.card, opacity: fadeAnim, borderColor: colors.border }]}>
            
            {/* Form Fields */}
            <View style={styles.formSpace}>
              
              {/* Unified Input Field */}
              <View>
                <AppTextField
                  placeholder={i18n.t('email') + " or Phone Number"}
                  value={inputValue}
                  onChangeText={(text) => {
                    setInputValue(text);
                    // Reset OTP state if input changes
                    if (otpSent) {
                      setOtpSent(false);
                      setOtp('');
                    }
                  }}
                  keyboardType={inputType === 'phone' ? 'phone-pad' : 'email-address'}
                  autoCapitalize="none"
                  leftIcon={
                    inputType === 'phone' ? (
                      <TouchableOpacity 
                        onPress={() => setShowCountryPicker(true)}
                        style={{ flexDirection: 'row', alignItems: 'center', marginRight: 5 }}
                      >
                        <CountryPicker
                          visible={showCountryPicker}
                          onClose={() => setShowCountryPicker(false)}
                          onSelect={onSelectCountry}
                          countryCode={countryCode}
                          withFilter
                          withFlag
                          withCallingCode
                          withEmoji
                          containerButtonStyle={{ marginRight: 5 }}
                        />
                        <Text style={{ color: colors.text, fontWeight: '600' }}>+{callingCode}</Text>
                        <Ionicons name="chevron-down" size={12} color={colors.mutedText} style={{ marginLeft: 2 }} />
                      </TouchableOpacity>
                    ) : (
                      <Ionicons name="mail-outline" size={20} color={colors.mutedText} />
                    )
                  }
                  containerStyle={styles.field}
                />
              </View>

              {/* Password Field (Only for Email) */}
              {inputType === 'email' && (
                <Animated.View style={{ opacity: fadeAnim }}>
                  <AppTextField
                    placeholder={i18n.t('password')}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    leftIcon={<Ionicons name="lock-closed-outline" size={20} color={colors.mutedText} />}
                    rightIcon={
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.mutedText} />
                      </TouchableOpacity>
                    }
                    containerStyle={styles.field}
                  />
                  {isSignUp && <PasswordStrengthMeter password={password} />}
                  
                  {!isSignUp && (
                    <TouchableOpacity style={styles.forgotPass}>
                      <Text style={{ color: colors.primary, fontSize: 13 }}>Forgot Password?</Text>
                    </TouchableOpacity>
                  )}
                </Animated.View>
              )}

              {/* OTP Field (Only for Phone after sending) */}
              {inputType === 'phone' && otpSent && (
                <View>
                  {Platform.OS === 'web' && <div id={recaptchaContainerId} />}
                  <AppTextField
                    placeholder={i18n.t('sixDigitCode')}
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    leftIcon={<Ionicons name="keypad-outline" size={20} color={colors.mutedText} />}
                    containerStyle={styles.field}
                  />
                </View>
              )}

              {/* Recaptcha Container for Web (Always render hidden to be safe) - REMOVED as we use button */}
              {/* {Platform.OS === 'web' && inputType === 'phone' && !otpSent && (
                 <div id={recaptchaContainerId} style={{ display: 'none' }} />
              )} */}

              {/* Action Button */}
              <Pressable
                nativeID="sign-in-button"
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={handleAuth}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {inputType === 'email' 
                      ? (isSignUp ? i18n.t('signUp') : i18n.t('login')) 
                      : (otpSent ? i18n.t('verifyCode') : i18n.t('sendCode'))}
                  </Text>
                )}
              </Pressable>

              {/* Biometrics */}
              {isBiometricSupported && !isSignUp && inputType === 'email' && (
                <TouchableOpacity 
                  style={[styles.bioButton, { borderColor: colors.border }]} 
                  onPress={() => handleBiometricAuth()}
                >
                  <Ionicons name="finger-print-outline" size={20} color={colors.primary} />
                  <Text style={{ marginLeft: 8, color: colors.text, fontSize: 14 }}>Log in with Biometrics</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Toggle Login/Signup */}
            {inputType === 'email' && (
              <View style={styles.footerAction}>
                <Text style={{ color: colors.mutedText }}>
                  {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                </Text>
                <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
                  <Text style={{ color: colors.primary, fontWeight: 'bold' }}>
                    {isSignUp ? i18n.t('login') : i18n.t('signUp')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>

          {/* Social Login */}
          <View style={styles.socialSection}>
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '80%', marginBottom: 20 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              <Text style={{ marginHorizontal: 10, color: colors.mutedText, fontSize: 12 }}>OR CONTINUE WITH</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            </View>
            <View style={styles.socialButtons}>
              {['logo-google', 'logo-apple', 'logo-facebook'].map((icon, i) => (
                <TouchableOpacity key={i} style={[styles.socialBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name={icon as any} size={24} color={colors.text} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 10,
  },
  iconButton: {
    padding: 8,
    marginLeft: 10,
  },
  header: {
    alignItems: 'center',
    marginVertical: 30,
  },
  logoContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  card: {
    borderRadius: radii.xl,
    padding: 32,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  formSpace: {
    gap: 20,
  },
  field: {
    marginBottom: 0,
  },
  forgotPass: {
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: radii.lg,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bioButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: radii.lg,
    marginTop: 10,
  },
  footerAction: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  socialSection: {
    alignItems: 'center',
    marginTop: 30,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 20,
  },
  socialBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});
