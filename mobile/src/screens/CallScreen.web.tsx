import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { connectSocket } from '../services/socket';
import { useTheme } from '../config/theme';

type CallScreenProps = {
  peerId: string;
  peerName?: string;
  peerAvatar?: string;
  callType: 'audio' | 'video';
  userID: string;
  userName: string;
  incoming?: boolean;
  callId?: string;
  onBack: () => void;
};

type CallState = 'incoming' | 'calling' | 'connecting' | 'active' | 'ended' | 'error';

const VideoTag: any = 'video';
const remoteVideoStyle: any = { width: '100%', height: '100%', objectFit: 'cover' };
const localVideoStyle: any = { width: '100%', height: '100%', objectFit: 'cover' };

type IceCandidateEvent = { candidate: any | null };
type TrackEvent = { streams: any[] };
type MediaTrack = { stop?: () => void; enabled?: boolean };

export default function CallScreen({
  peerId,
  peerName,
  peerAvatar,
  callType,
  userID,
  incoming = false,
  callId: initialCallId,
  onBack,
}: CallScreenProps) {
  const { colors } = useTheme();
  const [callState, setCallState] = useState<CallState>(incoming ? 'incoming' : 'calling');
  const [callId, setCallId] = useState<string | undefined>(initialCallId);
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<any | null>(null);
  const [remoteStream, setRemoteStream] = useState<any | null>(null);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);

  const socketRef = useRef<any>(null);
  const pcRef = useRef<any>(null);
  const localStreamRef = useRef<any>(null);
  const remoteStreamRef = useRef<any>(null);
  const callIdRef = useRef<string | undefined>(initialCallId);
  const localVideoRef = useRef<any>(null);
  const remoteVideoRef = useRef<any>(null);

  useEffect(() => {
    callIdRef.current = callId;
  }, [callId]);

  const displayName = useMemo(() => peerName || 'Unknown', [peerName]);

  const attachStream = (videoEl: any, stream: any, mutedVideo: boolean) => {
    if (!videoEl) return;
    if (!stream) {
      videoEl.srcObject = null;
      return;
    }
    videoEl.srcObject = stream;
    videoEl.muted = mutedVideo;
    videoEl.playsInline = true;
    videoEl.autoplay = true;
    videoEl.onloadedmetadata = () => {
      videoEl.play().catch(() => {});
    };
  };

  useEffect(() => {
    attachStream(localVideoRef.current, localStream, true);
  }, [localStream]);

  useEffect(() => {
    attachStream(remoteVideoRef.current, remoteStream, false);
  }, [remoteStream]);

  const ensureLocalStream = async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const nav = (globalThis as any).navigator;
    if (!nav?.mediaDevices?.getUserMedia) {
      setError('Camera or microphone access is not supported on this browser.');
      setCallState('error');
      throw new Error('media_not_supported');
    }
    const stream = await nav.mediaDevices.getUserMedia({
      audio: true,
      video: callType === 'video',
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  };

  const ensurePeerConnection = async () => {
    if (pcRef.current) return pcRef.current;
    const PeerConnection = (globalThis as any).RTCPeerConnection;
    if (!PeerConnection) {
      setError('WebRTC is not supported on this browser.');
      setCallState('error');
      throw new Error('webrtc_not_supported');
    }

    const pc = new PeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
      ],
    });

    pc.onicecandidate = (event: IceCandidateEvent) => {
      if (!event.candidate || !socketRef.current) return;
      socketRef.current.emit('call:signal', {
        targetId: peerId,
        signal: { type: 'ice', candidate: event.candidate },
      });
    };

    pc.ontrack = (event: TrackEvent) => {
      const [stream] = event.streams;
      if (stream) {
        remoteStreamRef.current = stream;
        setRemoteStream(stream);
        setCallState('active');
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setCallState('ended');
        cleanup(false);
      }
    };

    const stream = await ensureLocalStream();
    stream.getTracks().forEach((track: MediaTrack) => pc.addTrack(track, stream));

    pcRef.current = pc;
    return pc;
  };

  const startOffer = async () => {
    const pc = await ensurePeerConnection();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketRef.current?.emit('call:signal', {
      targetId: peerId,
      signal: { type: 'offer', sdp: offer.sdp },
    });
  };

  const handleSignal = async (signal: any) => {
    const pc = await ensurePeerConnection();
    if (signal.type === 'offer' && signal.sdp) {
      await pc.setRemoteDescription({ type: 'offer', sdp: signal.sdp } as any);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current?.emit('call:signal', {
        targetId: peerId,
        signal: { type: 'answer', sdp: answer.sdp },
      });
      setCallState('connecting');
      return;
    }

    if (signal.type === 'answer' && signal.sdp) {
      await pc.setRemoteDescription({ type: 'answer', sdp: signal.sdp } as any);
      setCallState('active');
      return;
    }

    if (signal.type === 'ice' && signal.candidate) {
      try {
        await pc.addIceCandidate(signal.candidate);
      } catch {
        // ignore ICE errors
      }
    }
  };

  const cleanup = (notify: boolean) => {
    if (notify && socketRef.current) {
      socketRef.current.emit('call:end', { callId: callIdRef.current, targetId: peerId });
    }

    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track: MediaTrack) => track.stop?.());
      localStreamRef.current = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track: MediaTrack) => track.stop?.());
      remoteStreamRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
  };

  const handleEnd = () => {
    setCallState('ended');
    cleanup(true);
    onBack();
  };

  const handleReject = () => {
    socketRef.current?.emit('call:reject', { callId: callIdRef.current, callerId: peerId });
    setCallState('ended');
    cleanup(false);
    onBack();
  };

  const handleAccept = async () => {
    if (!socketRef.current || !callIdRef.current) {
      setError('Unable to accept the call. Please try again.');
      setCallState('error');
      return;
    }
    setCallState('connecting');
    socketRef.current.emit('call:accept', { callId: callIdRef.current, callerId: peerId });
    await ensurePeerConnection();
  };

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((track: MediaTrack) => {
      track.enabled = muted;
    });
    setMuted((prev) => !prev);
  };

  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((track: MediaTrack) => {
      track.enabled = videoOff;
    });
    setVideoOff((prev) => !prev);
  };

  useEffect(() => {
    let active = true;
    let socket: any = null;

    const setup = async () => {
      socket = await connectSocket();
      if (!active || !socket) return;
      socketRef.current = socket;

      socket.emit('user:join', userID);

      socket.on('call:started', (data: { callId: string }) => {
        if (!active) return;
        setCallId(data.callId);
      });

      socket.on('call:accepted', async () => {
        if (!active) return;
        setCallState('connecting');
        await startOffer();
      });

      socket.on('call:rejected', () => {
        if (!active) return;
        setCallState('ended');
        cleanup(false);
        onBack();
      });

      socket.on('call:signal', async (data: { signal: any }) => {
        if (!active || !data?.signal) return;
        await handleSignal(data.signal);
      });

      socket.on('call:ended', () => {
        if (!active) return;
        setCallState('ended');
        cleanup(false);
        onBack();
      });

      if (!incoming) {
        try {
          await ensureLocalStream();
          socket.emit('call:start', { receiverId: peerId, type: callType });
          setCallState('calling');
        } catch (err: any) {
          setError('Failed to start call. Please allow microphone/camera access.');
          setCallState('error');
        }
      }
    };

    setup();

    return () => {
      active = false;
      if (socket) {
        socket.off('call:started');
        socket.off('call:accepted');
        socket.off('call:rejected');
        socket.off('call:signal');
        socket.off('call:ended');
      }
      cleanup(false);
    };
  }, [incoming, peerId, callType, userID]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleEnd} style={styles.backButton}>
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>{displayName}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedText }]}>
            {callState === 'incoming' && 'Incoming call'}
            {callState === 'calling' && 'Calling...'}
            {callState === 'connecting' && 'Connecting...'}
            {callState === 'active' && (callType === 'video' ? 'Video call' : 'Voice call')}
            {callState === 'error' && 'Call error'}
          </Text>
        </View>
      </View>

      <View style={styles.stage}>
        {callType === 'video' && remoteStream ? (
          <VideoTag ref={remoteVideoRef} style={remoteVideoStyle} />
        ) : (
          <View style={[styles.placeholder, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {peerAvatar ? (
              <Image source={{ uri: peerAvatar }} style={styles.placeholderAvatar} />
            ) : (
              <Text style={[styles.placeholderText, { color: colors.text }]}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            )}
            <Text style={[styles.placeholderLabel, { color: colors.mutedText }]}>
              {callType === 'video' ? 'Waiting for video' : 'Voice call'}
            </Text>
          </View>
        )}

        {callType === 'video' && localStream && (
          <View style={styles.localPreview}>
            <VideoTag ref={localVideoRef} style={localVideoStyle} />
          </View>
        )}
      </View>

      {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}

      {callState === 'incoming' ? (
        <View style={styles.controls}>
          <TouchableOpacity style={[styles.controlButton, styles.rejectButton]} onPress={handleReject}>
            <Ionicons name="call" size={20} color="#fff" />
            <Text style={styles.controlText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlButton, styles.acceptButton]} onPress={handleAccept}>
            <Ionicons name="call" size={20} color="#fff" />
            <Text style={styles.controlText}>Accept</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, styles.secondaryButton]}
            onPress={toggleMute}
          >
            <Ionicons name={muted ? 'mic-off' : 'mic'} size={20} color="#fff" />
            <Text style={styles.controlText}>{muted ? 'Unmute' : 'Mute'}</Text>
          </TouchableOpacity>
          {callType === 'video' && (
            <TouchableOpacity
              style={[styles.controlButton, styles.secondaryButton]}
              onPress={toggleVideo}
            >
              <Ionicons name={videoOff ? 'videocam-off' : 'videocam'} size={20} color="#fff" />
              <Text style={styles.controlText}>{videoOff ? 'Start Video' : 'Stop Video'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.controlButton, styles.hangupButton]} onPress={handleEnd}>
            <Ionicons name="call" size={20} color="#fff" />
            <Text style={styles.controlText}>End</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  stage: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  localPreview: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 140,
    height: 200,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: '#111',
  },
  placeholder: {
    width: '72%',
    maxWidth: 320,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  placeholderAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 8,
  },
  placeholderLabel: {
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
    flexWrap: 'wrap',
  },
  controlButton: {
    minWidth: 120,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 30,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  controlText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  acceptButton: {
    backgroundColor: '#19b36b',
  },
  rejectButton: {
    backgroundColor: '#d73838',
  },
  hangupButton: {
    backgroundColor: '#d73838',
  },
  secondaryButton: {
    backgroundColor: '#2e2f36',
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 12,
  },
});
