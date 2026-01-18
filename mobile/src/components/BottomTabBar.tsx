import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../config/theme';

export interface BottomTabBarProps {
  active: string;
  onChats: () => void;
  onFeed: () => void;
  onPrivate: () => void;
  onAI: () => void;
  onProfile: () => void;
}

export default function BottomTabBar({ active, onChats, onFeed, onPrivate, onAI, onProfile }: BottomTabBarProps) {
  const { colors } = useTheme();
  const tabs = [
    { key: 'feed', icon: 'home', onPress: onFeed }, // Feed first like Insta
    { key: 'chats', icon: 'chatbubble-ellipses', onPress: onChats }, // Messages
    { key: 'ai', icon: 'sparkles', onPress: onAI }, // AI in center
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
          <Ionicons
            name={active === tab.key ? tab.icon : `${tab.icon}-outline` as any}
            size={28}
            color={active === tab.key ? colors.text : colors.mutedText}
          />
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
});
