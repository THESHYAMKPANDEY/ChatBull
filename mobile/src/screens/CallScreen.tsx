import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
// import { RTCView, mediaDevices, RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } from 'react-native-webrtc';
// NOTE: react-native-webrtc requires a development build (EAS Build) and does not work in Expo Go.
// For now, we mock the UI and signaling logic.

interface CallScreenProps {
  currentUser: any;
  otherUser: any;
  isIncoming: boolean;
  isVideo: boolean;
  onEndCall: () => void;
  socket: any; // Passed from parent or context
}

export default function CallScreen({
  currentUser,
  otherUser,
  isIncoming,
  isVideo,
  onEndCall,
  socket
}: CallScreenProps) {
  const [status, setStatus] = useState(isIncoming ? 'Incoming Call...' : 'Calling...');
  const [isConnected, setIsConnected] = useState(false);
  
  // Ref for PeerConnection
  const peerConnection = useRef<any>(null);

  useEffect(() => {
    // Initialize WebRTC (Mocked for safety if lib is missing)
    startCall();

    return () => {
      // Cleanup
      if (peerConnection.current) {
        peerConnection.current.close();
      }
    };
  }, []);

  const startCall = async () => {
    // In a real app:
    // 1. Get local stream: const stream = await mediaDevices.getUserMedia({ audio: true, video: isVideo });
    // 2. Set local stream to state
    // 3. Create PeerConnection
    // 4. Add stream tracks to PeerConnection
    
    if (!isIncoming) {
      // Initiate offer
      // const offer = await peerConnection.current.createOffer();
      // await peerConnection.current.setLocalDescription(offer);
      // socket.emit('call:offer', { targetId: otherUser.id, sdp: offer });
    }
  };

  const handleAccept = async () => {
    setStatus('Connecting...');
    setIsConnected(true);
    // In a real app:
    // 1. Create Answer
    // 2. Set Local Description
    // 3. Emit 'call:answer'
  };

  const handleHangup = () => {
    socket.emit('call:hangup', { targetId: otherUser.id });
    onEndCall();
  };

  return (
    <View style={styles.container}>
      <View style={styles.remoteStream}>
        <Text style={styles.remoteText}>
          {isConnected ? 'Remote Stream Placeholder' : ''}
        </Text>
        {!isConnected && (
          <View style={styles.infoContainer}>
            <View style={styles.avatarPlaceholder} />
            <Text style={styles.name}>{otherUser.displayName}</Text>
            <Text style={styles.status}>{status}</Text>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        {isIncoming && !isConnected ? (
          <>
            <TouchableOpacity style={[styles.button, styles.rejectButton]} onPress={handleHangup}>
              <Text style={styles.buttonText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.acceptButton]} onPress={handleAccept}>
              <Text style={styles.buttonText}>Accept</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={[styles.button, styles.hangupButton]} onPress={handleHangup}>
            <Text style={styles.buttonText}>End Call</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#222',
  },
  remoteStream: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteText: {
    color: '#fff',
  },
  infoContainer: {
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#555',
    marginBottom: 20,
  },
  name: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  status: {
    color: '#ccc',
    fontSize: 16,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingBottom: 50,
    paddingHorizontal: 20,
  },
  button: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#4CD964',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  hangupButton: {
    backgroundColor: '#FF3B30',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
