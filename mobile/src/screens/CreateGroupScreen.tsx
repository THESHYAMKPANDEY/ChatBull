import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppHeader from '../components/AppHeader';
import { useTheme } from '../config/theme';

const CreateGroupScreen = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="Create Group" showBack />
      <Text style={{ color: colors.text, textAlign: 'center', marginTop: 20 }}>Create Group Screen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default CreateGroupScreen;
