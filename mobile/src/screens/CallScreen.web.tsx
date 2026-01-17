import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity } from 'react-native';

type CallScreenProps = {
  callID: string;
  userID: string;
  userName: string;
  onBack: () => void;
};

export default function CallScreen({ onBack }: CallScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Calls are not supported on web.</Text>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>Go Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 16,
    color: '#111',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '700',
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});

