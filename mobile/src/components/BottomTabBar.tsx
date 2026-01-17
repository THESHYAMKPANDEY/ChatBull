import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../config/theme';

type TabKey = 'chats' | 'feed' | 'private' | 'ai' | 'profile';

type BottomTabBarProps = {
  active: TabKey;
  onChats: () => void;
  onFeed: () => void;
  onPrivate: () => void;
  onAI: () => void;
  onProfile: () => void;
};

export default function BottomTabBar({
  active,
  onChats,
  onFeed,
  onPrivate,
  onAI,
  onProfile,
}: BottomTabBarProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      <TouchableOpacity style={styles.tab} onPress={onChats}>
        <Text style={[styles.icon, { color: active === 'chats' ? colors.text : colors.mutedText }]}>🏠</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tab} onPress={onFeed}>
        <Text style={[styles.icon, { color: active === 'feed' ? colors.text : colors.mutedText }]}>📰</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tab} onPress={onPrivate}>
        <Text style={[styles.icon, { color: active === 'private' ? colors.text : colors.mutedText }]}>🔒</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tab} onPress={onAI}>
        <Text style={[styles.icon, { color: active === 'ai' ? colors.text : colors.mutedText }]}>✨</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tab} onPress={onProfile}>
        <Text style={[styles.icon, { color: active === 'profile' ? colors.text : colors.mutedText }]}>👤</Text>
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
  },
  tab: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 24,
  },
});
