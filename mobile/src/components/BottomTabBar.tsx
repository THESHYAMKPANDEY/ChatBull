import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export interface BottomTabBarProps {
  active: string;
  onChats: () => void;
  onFeed: () => void;
  onPrivate: () => void;
  onAI: () => void;
  onProfile: () => void;
}

export default function BottomTabBar({ active, onChats, onFeed, onPrivate, onAI, onProfile }: BottomTabBarProps) {
  const tabs = [
    { key: 'chats', label: 'Chats', icon: '💬', onPress: onChats },
    { key: 'feed', label: 'Feed', icon: '📱', onPress: onFeed },
    { key: 'ai', label: 'AI', icon: '🤖', onPress: onAI },
    { key: 'profile', label: 'Profile', icon: '👤', onPress: onProfile },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={styles.tab}
          onPress={tab.onPress}
        >
          <Text style={[styles.icon, active === tab.key && styles.activeIcon]}>
            {tab.icon}
          </Text>
          <Text style={[styles.label, active === tab.key && styles.activeLabel]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingBottom: 20,
    paddingTop: 10,
    height: 80,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 24,
    marginBottom: 4,
    opacity: 0.5,
    color: '#000',
  },
  activeIcon: {
    opacity: 1,
    color: '#007AFF',
  },
  label: {
    fontSize: 10,
    color: '#999',
  },
  activeLabel: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
});
