import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type TabKey = 'chats' | 'feed' | 'private' | 'profile';

type BottomTabBarProps = {
  active: TabKey;
  onChats: () => void;
  onFeed: () => void;
  onPrivate: () => void;
  onProfile: () => void;
};

export default function BottomTabBar({
  active,
  onChats,
  onFeed,
  onPrivate,
  onProfile,
}: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.tab} onPress={onChats}>
        <Text style={[styles.icon, active === 'chats' && styles.iconActive]}>🏠</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tab} onPress={onFeed}>
        <Text style={[styles.icon, active === 'feed' && styles.iconActive]}>📰</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tab} onPress={onPrivate}>
        <Text style={[styles.icon, active === 'private' && styles.iconActive]}>🔒</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tab} onPress={onProfile}>
        <Text style={[styles.icon, active === 'profile' && styles.iconActive]}>👤</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#efefef',
    backgroundColor: '#fff',
  },
  tab: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 24,
    color: '#8e8e8e',
  },
  iconActive: {
    color: '#000',
  },
});

