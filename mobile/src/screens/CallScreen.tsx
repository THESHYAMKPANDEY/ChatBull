import React from 'react';
import { View, StyleSheet, SafeAreaView, Text, TouchableOpacity } from 'react-native';
import { ZegoUIKitPrebuiltCall, ONE_ON_ONE_VIDEO_CALL_CONFIG } from '@zegocloud/zego-uikit-prebuilt-call-rn';
import i18n from '../i18n';

type CallScreenProps = {
  callID: string;
  userID: string;
  userName: string;
  onBack: () => void;
};

export default function CallScreen({ callID, userID, userName, onBack }: CallScreenProps) {

  // Use environment variables or fallbacks (ensure you updated .env)
  const appId = Number(process.env.EXPO_PUBLIC_ZEGO_APP_ID);
  const appSign = process.env.EXPO_PUBLIC_ZEGO_APP_SIGN || '';

  if (!appId || !appSign) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>{i18n.t('missingConfig')}</Text>
        <TouchableOpacity 
          onPress={onBack} 
          style={styles.backButton}
          accessibilityLabel={i18n.t('goBack')}
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>{i18n.t('goBack')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ZegoUIKitPrebuiltCall
        appID={appId}
        appSign={appSign}
        userID={userID}
        userName={userName}
        callID={callID}
        config={{
          ...ONE_ON_ONE_VIDEO_CALL_CONFIG,
          onOnlySelfInRoom: () => {
            onBack();
          },
          onHangUp: () => {
            onBack();
          },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    marginBottom: 20,
  },
  backButton: {
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
