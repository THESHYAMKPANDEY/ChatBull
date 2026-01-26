import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../config/theme';

export interface BottomTabBarProps {
  active: string;
  onChats: () => void;
  onFeed: () => void;
  onPrivate: () => void;
  onProfile: () => void;
  profilePhotoUrl?: string;
}

export default function BottomTabBar({ active, onChats, onFeed, onPrivate, onProfile, profilePhotoUrl }: BottomTabBarProps) {
  const { colors } = useTheme();
  const tabs = [
    { key: 'feed', icon: 'home', onPress: onFeed }, // Feed first like Insta
    { key: 'chats', icon: 'chatbubble-ellipses', onPress: onChats }, // Messages
    { key: 'private', icon: 'shield-checkmark', onPress: onPrivate }, // Privacy mode
    { key: 'profile', icon: 'person-circle', onPress: onProfile }, // Profile
  ];

  const handlePress = (onPress: () => void) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (e) {
      // Ignore haptics error on unsupported platforms
    }
    onPress();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={styles.tab}
          onPress={() => handlePress(tab.onPress)}
          activeOpacity={0.7}
        >
          {tab.key === 'profile' ? (
            profilePhotoUrl ? (
              <View style={[styles.avatarWrap, active === tab.key && { borderColor: colors.text }]}>
                <Image source={{ uri: profilePhotoUrl }} style={styles.avatar} />
              </View>
            ) : (
              <Ionicons
                name={active === tab.key ? tab.icon : `${tab.icon}-outline` as any}
                size={28}
                color={active === tab.key ? colors.text : colors.mutedText}
              />
            )
          ) : (
            <Ionicons
              name={active === tab.key ? tab.icon : `${tab.icon}-outline` as any}
              size={28}
              color={active === tab.key ? colors.text : colors.mutedText}
            />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    paddingBottom: 25, // Adjust for safe area
    paddingTop: 12,
    height: 85,
    justifyContent: 'space-around',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
});
