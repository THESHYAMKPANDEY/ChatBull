import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
    { key: 'chats', label: 'Chats', icon: 'chatbubble', onPress: onChats },
    { key: 'feed', label: 'Feed', icon: 'compass', onPress: onFeed },
    { key: 'ai', label: 'AI', icon: 'hardware-chip', onPress: onAI },
    { key: 'profile', label: 'Profile', icon: 'person', onPress: onProfile },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={styles.tab}
          onPress={tab.onPress}
        >
          <Ionicons
            name={active === tab.key ? tab.icon : `${tab.icon}-outline` as any}
            size={24}
            color={active === tab.key ? '#007AFF' : '#000'}
            style={{ opacity: active === tab.key ? 1 : 0.5, marginBottom: 4 }}
          />
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
  label: {
    fontSize: 10,
    color: '#999',
  },
  activeLabel: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
});
