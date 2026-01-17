import React from 'react';
import { View, StyleSheet, SafeAreaView, Text, TouchableOpacity } from 'react-native';
import { ZegoUIKitPrebuiltCall, ONE_ON_ONE_VIDEO_CALL_CONFIG } from '@zegocloud/zego-uikit-prebuilt-call-rn';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function CallScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { callID, userID, userName } = route.params as { callID: string; userID: string; userName: string };

  // Use environment variables or fallbacks (ensure you updated .env)
  const appId = Number(process.env.EXPO_PUBLIC_ZEGO_APP_ID);
  const appSign = process.env.EXPO_PUBLIC_ZEGO_APP_SIGN || '';

  if (!appId || !appSign) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Missing ZegoCloud Configuration.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
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
            navigation.goBack();
          },
          onHangUp: () => {
            navigation.goBack();
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
