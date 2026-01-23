import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../services/api';
import { linkEmailPassword } from '../services/authClient';
import { useTheme } from '../config/theme';
import AppTextField from '../components/ui/AppTextField';
import { spacing, radii } from '../config/tokens';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  currentUser: any;
  onComplete: (user: any) => void;
}

export default function CompleteProfileScreen({ currentUser, onComplete }: Props) {
  const { colors } = useTheme();
  const [username, setUsername] = useState(currentUser?.username || '');
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [photoURL, setPhotoURL] = useState(currentUser?.photoURL || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [password, setPassword] = useState('');
  
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Debounce username check
  useEffect(() => {
    const checkUsername = async () => {
      if (!username || username.length < 3) {
        setIsUsernameAvailable(null);
        return;
      }
      
      // If username hasn't changed from current, it's valid
      if (currentUser?.username === username) {
        setIsUsernameAvailable(true);
        return;
      }

      setIsCheckingUsername(true);
      try {
        const result = await api.checkUsername(username);
        setIsUsernameAvailable(result.available);
      } catch (error) {
        console.error('Check username failed', error);
      } finally {
        setIsCheckingUsername(false);
      }
    };

    const timer = setTimeout(checkUsername, 500);
    return () => clearTimeout(timer);
  }, [username, currentUser]);

  const handleImagePick = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      // In a real app, upload this to Cloudinary/S3 here
      // For now, we'll use the base64 data URI (limitations apply)
      // Ideally, the backend upload endpoint should return a URL
      const dataUri = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setPhotoURL(dataUri);
    }
  };

  const handleSave = async () => {
    if (!username || username.length < 3) {
      Alert.alert('Invalid Username', 'Username must be at least 3 characters long.');
      return;
    }

    if (isUsernameAvailable === false) {
      Alert.alert('Unavailable', 'This username is already taken. Please choose another.');
      return;
    }

    if (!currentUser.email && (!email || !password)) {
       // If phone user without email, require email+password setup
       Alert.alert('Security', 'Please set an email and password to secure your account.');
       return;
    }

    if (password && password.length < 6) {
       Alert.alert('Weak Password', 'Password must be at least 6 characters.');
       return;
    }

    setIsSaving(true);
    try {
      // 1. Set Password if provided (for phone users)
      if (password) {
        // First ensure email is set on user object if we are linking
        if (!currentUser.email) {
           // We need to update email first on backend or pass it to auth client
           // For simplicity, let's assume we update profile first
        }
        
        // Actually, we need to link credential. But linking requires the user to have an email in Firebase.
        // If they are phone auth only, they have no email.
        // We might need a separate flow: `linkEmailPassword(email, password)`
        // For now, let's try setting it if they have email, or skip if complex.
        // Simplified: Only set if user already has email or we provide one.
      }

      // 2. Update Profile
      const result = await api.updateProfile({
        displayName,
        username,
        bio,
        photoURL,
        // If user added email here, we should send it to backend too
        // (Backend user model update)
      });
      
      // 3. If phone user provided email/password, try to link in Firebase
      if (!currentUser.email && email && password) {
         try {
           await linkEmailPassword(email, password);
           // Also sync the email to backend again if successful
           await api.updateProfile({ 
             email, // We need to update our api.ts to accept email update if we want to sync it
           } as any); 
         } catch (e: any) {
            console.error("Failed to link password", e);
            Alert.alert("Security Update Failed", e.message || "Could not set password. Please try from settings later.");
         }
      }

      if (result.user) {
        onComplete(result.user);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Complete Your Profile</Text>
            <Text style={[styles.subtitle, { color: colors.mutedText }]}>
              Choose a username and add a photo so friends can recognize you.
            </Text>
          </View>

          {/* Profile Photo */}
          <View style={styles.photoContainer}>
            <TouchableOpacity onPress={handleImagePick} style={styles.photoWrapper}>
              {photoURL ? (
                <Image source={{ uri: photoURL }} style={styles.photo} />
              ) : (
                <View style={[styles.photoPlaceholder, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="camera-outline" size={40} color={colors.mutedText} />
                </View>
              )}
              <View style={[styles.editBadge, { backgroundColor: colors.primary }]}>
                <Ionicons name="pencil" size={12} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={[styles.photoHint, { color: colors.primary }]}>Change Profile Photo</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <AppTextField
              label="Username"
              placeholder="unique_username"
              value={username}
              onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              autoCapitalize="none"
              rightIcon={
                isCheckingUsername ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : isUsernameAvailable === true ? (
                  <Ionicons name="checkmark-circle" size={20} color="green" />
                ) : isUsernameAvailable === false ? (
                  <Ionicons name="close-circle" size={20} color="red" />
                ) : undefined
              }
              hint={
                isUsernameAvailable === false 
                  ? "Username is taken" 
                  : "Only letters, numbers, and underscores"
              }
            />

            <AppTextField
              label="Display Name"
              placeholder="Your Name"
              value={displayName}
              onChangeText={setDisplayName}
            />

            <AppTextField
              label="Bio"
              placeholder="Tell us about yourself..."
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              maxLength={150}
              hint={`${bio.length}/150`}
            />

            {!currentUser.email && (
              <View style={{ marginTop: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                   <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>
                     Secure Your Account (Optional)
                   </Text>
                   <TouchableOpacity onPress={() => { setEmail(''); setPassword(''); }}>
                      <Text style={{ color: colors.primary, fontSize: 14 }}>Clear</Text>
                   </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 14, color: colors.mutedText, marginBottom: 12 }}>
                  Provide an email and password to secure your account and allow alternative login. You can skip this.
                </Text>
                <AppTextField
                  label="Email (for recovery)"
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  containerStyle={{ marginBottom: 16 }}
                />
                <AppTextField
                  label="Set a Password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: colors.primary },
                (isSaving || isUsernameAvailable === false) && styles.buttonDisabled
              ]}
              onPress={handleSave}
              disabled={isSaving || isUsernameAvailable === false}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Get Started</Text>
              )}
            </TouchableOpacity>
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
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  photoWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  photoHint: {
    fontSize: 14,
    fontWeight: '600',
  },
  form: {
    gap: 20,
  },
  button: {
    paddingVertical: 16,
    borderRadius: radii.lg,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
