import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    { key: 'chats', onPress: onChats, icon: { active: 'chatbubble', inactive: 'chatbubble-outline' } as const },
    { key: 'feed', onPress: onFeed, icon: { active: 'home', inactive: 'home-outline' } as const },
    { key: 'ai', onPress: onAI, icon: { active: 'sparkles', inactive: 'sparkles-outline' } as const },
    { key: 'profile', onPress: onProfile, icon: { active: 'person', inactive: 'person-outline' } as const },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={styles.tab}
          onPress={tab.onPress}
          accessibilityRole="button"
          accessibilityLabel={tab.key}
        >
          <Ionicons
            name={active === tab.key ? (tab.icon.active as any) : (tab.icon.inactive as any)}
            size={26}
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
    borderTopWidth: 1,
    paddingBottom: 18,
    paddingTop: 10,
    height: 72,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
