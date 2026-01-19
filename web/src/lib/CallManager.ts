import { getSocket } from './socket';

export type CallType = 'audio' | 'video';
export type CallStatus = 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';

export interface CallState {
  status: CallStatus;
  callerId?: string;
  callerName?: string;
  callId?: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  isRecording: boolean;
  networkQuality: 'good' | 'poor' | 'bad' | 'unknown';
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

type CallStateListener = (state: CallState) => void;

class CallManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private listeners: CallStateListener[] = [];
  private statsInterval: NodeJS.Timeout | null = null;
  
  private state: CallState = {
    status: 'idle',
    isVideoEnabled: true,
    isAudioEnabled: true,
    isScreenSharing: false,
    isRecording: false,
    networkQuality: 'unknown',
    localStream: null,
    remoteStream: null,
  };

  private config: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ]
  };

  constructor() {
    this.setupSocketListeners();
  }

  private updateState(newState: Partial<CallState>) {
    this.state = { ...this.state, ...newState };
    this.notifyListeners();
  }

  public subscribe(listener: CallStateListener) {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l(this.state));
  }

  private setupSocketListeners() {
    const socket = getSocket();
    if (!socket) return; 

    socket.on('call:incoming', async (data: { callId: string; callerId: string; callerName: string; type: CallType }) => {
      this.updateState({
        status: 'incoming',
        callId: data.callId,
        callerId: data.callerId,
        callerName: data.callerName,
        isVideoEnabled: data.type === 'video'
      });
    });

    socket.on('call:accepted', async (data: { callId: string; responderId: string }) => {
      this.updateState({ status: 'connected' });
      this.startStatsMonitoring();
    });

    socket.on('call:rejected', () => this.endCall(false));
    socket.on('call:ended', () => this.endCall(false));

    socket.on('call:signal', async (data: { senderId: string; signal: any }) => {
      if (!this.peerConnection) return;
      
      try {
        const signal = data.signal;
        if (signal.type === 'offer') {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);
          getSocket()?.emit('call:signal', { targetId: data.senderId, signal: answer });
        } else if (signal.type === 'answer') {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
        } else if (signal.candidate) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.error('Signaling error:', err);
      }
    });
  }

  public async startCall(receiverId: string, type: CallType) {
    try {
      this.updateState({ status: 'calling', isVideoEnabled: type === 'video' });
      await this.initializePeerConnection(receiverId, true);
      
      const socket = getSocket();
      socket?.emit('call:start', { receiverId, type });
    } catch (err) {
      console.error('Failed to start call:', err);
      this.endCall();
    }
  }

  public async acceptCall() {
    if (!this.state.callerId || !this.state.callId) return;
    
    try {
      await this.initializePeerConnection(this.state.callerId, false);
      this.updateState({ status: 'connected' });
      this.startStatsMonitoring();
      
      getSocket()?.emit('call:accept', { 
        callId: this.state.callId, 
        callerId: this.state.callerId 
      });
    } catch (err) {
      console.error('Failed to accept call:', err);
      this.endCall();
    }
  }

  public rejectCall() {
    if (!this.state.callerId || !this.state.callId) return;
    getSocket()?.emit('call:reject', { 
      callId: this.state.callId, 
      callerId: this.state.callerId 
    });
    this.endCall(false);
  }

  public endCall(notifyRemote = true) {
    this.stopStatsMonitoring();
    this.stopRecording();
    this.stopScreenShare();

    if (notifyRemote && this.state.callId && this.state.callerId) {
      getSocket()?.emit('call:end', { 
        callId: this.state.callId, 
        targetId: this.state.callerId 
      });
    }

    this.localStream?.getTracks().forEach(track => track.stop());
    this.peerConnection?.close();
    
    this.peerConnection = null;
    this.localStream = null;
    
    this.updateState({
      status: 'idle',
      callId: undefined,
      callerId: undefined,
      localStream: null,
      remoteStream: null,
      networkQuality: 'unknown'
    });
  }

  // --- Screen Sharing ---
  public async startScreenShare() {
    try {
      if (!this.peerConnection) return;

      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      this.screenStream = stream;
      
      const videoTrack = stream.getVideoTracks()[0];
      
      // Replace video track in sender
      const senders = this.peerConnection.getSenders();
      const videoSender = senders.find(s => s.track?.kind === 'video');
      
      if (videoSender) {
        await videoSender.replaceTrack(videoTrack);
      } else {
        this.peerConnection.addTrack(videoTrack, stream);
      }

      this.updateState({ isScreenSharing: true });

      // Handle stream end (user clicks "Stop sharing" in browser UI)
      videoTrack.onended = () => {
        this.stopScreenShare();
      };

    } catch (err) {
      console.error('Screen share failed:', err);
    }
  }

  public async stopScreenShare() {
    if (!this.state.isScreenSharing) return;

    this.screenStream?.getTracks().forEach(track => track.stop());
    this.screenStream = null;

    // Revert to camera
    if (this.peerConnection && this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      const senders = this.peerConnection.getSenders();
      const videoSender = senders.find(s => s.track?.kind === 'video');
      
      if (videoSender && videoTrack) {
        await videoSender.replaceTrack(videoTrack);
      }
    }

    this.updateState({ isScreenSharing: false });
  }

  // --- Recording ---
  public startRecording() {
    if (!this.state.remoteStream) return;
    
    this.recordedChunks = [];
    // Combine local and remote audio? Usually we just record remote or a mixed stream.
    // For simplicity, recording remote stream.
    this.mediaRecorder = new MediaRecorder(this.state.remoteStream);
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.style.display = 'none';
      a.href = url;
      a.download = `call-recording-${Date.now()}.webm`;
      a.click();
      window.URL.revokeObjectURL(url);
    };

    this.mediaRecorder.start();
    this.updateState({ isRecording: true });
  }

  public stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.updateState({ isRecording: false });
    }
  }

  // --- Network Quality ---
  private startStatsMonitoring() {
    this.statsInterval = setInterval(async () => {
      if (!this.peerConnection) return;
      
      const stats = await this.peerConnection.getStats();
      let quality: CallState['networkQuality'] = 'good';

      stats.forEach(report => {
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          if (report.currentRoundTripTime > 0.5) quality = 'bad';
          else if (report.currentRoundTripTime > 0.2) quality = 'poor';
        }
      });

      if (this.state.networkQuality !== quality) {
        this.updateState({ networkQuality: quality });
      }
    }, 2000);
  }

  private stopStatsMonitoring() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  private async initializePeerConnection(remoteUserId: string, isInitiator: boolean) {
    this.peerConnection = new RTCPeerConnection(this.config);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        getSocket()?.emit('call:signal', {
          targetId: remoteUserId,
          signal: { candidate: event.candidate }
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      this.updateState({ remoteStream: event.streams[0] });
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: this.state.isVideoEnabled
      });
      
      this.localStream = stream;
      this.updateState({ localStream: stream });

      stream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, stream);
      });

      if (isInitiator) {
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        getSocket()?.emit('call:signal', {
          targetId: remoteUserId,
          signal: offer
        });
      }

    } catch (err) {
      console.error('Media access error:', err);
      throw err;
    }
  }

  public toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.updateState({ isAudioEnabled: audioTrack.enabled });
      }
    }
  }

  public toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        this.updateState({ isVideoEnabled: videoTrack.enabled });
      }
    }
  }
}

export const callManager = new CallManager();
