import React, { useEffect, useRef, useState } from 'react';
import { callManager, CallState } from '../lib/CallManager';

export const CallModal = () => {
  const [state, setState] = useState<CallState | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const unsubscribe = callManager.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (state?.localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = state.localStream;
    }
    // Handle screen share stream specifically if needed, or just rely on localStream update
    // CallManager updates localStream to include screen share track.
    
    if (state?.remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = state.remoteStream;
    }
  }, [state?.localStream, state?.remoteStream]);

  if (!state || state.status === 'idle') return null;

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'good': return '#4CAF50';
      case 'poor': return '#FFC107';
      case 'bad': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        {/* Call Status Header */}
        <div style={styles.header}>
          <h3>
            {state.status === 'incoming' ? 'Incoming Call...' : 
             state.status === 'calling' ? 'Calling...' : 
             'Connected'}
          </h3>
          <p>{state.callerName || 'Unknown User'}</p>
          {state.status === 'connected' && (
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginTop: '5px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getQualityColor(state.networkQuality) }} />
                <small style={{ color: '#ccc' }}>Network: {state.networkQuality}</small>
             </div>
          )}
        </div>

        {/* Video Area */}
        <div style={styles.videoContainer}>
          {state.remoteStream ? (
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              style={styles.remoteVideo} 
            />
          ) : (
            <div style={styles.placeholder}>
              {state.status === 'connected' ? 'Waiting for video...' : 'Connecting...'}
            </div>
          )}
          
          {state.localStream && (
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              style={state.remoteStream ? styles.localVideoSmall : styles.localVideoLarge} 
            />
          )}
        </div>

        {/* Controls */}
        <div style={styles.controls}>
          {state.status === 'incoming' ? (
            <>
              <button onClick={() => callManager.acceptCall()} style={{...styles.button, ...styles.acceptBtn}}>
                Accept
              </button>
              <button onClick={() => callManager.rejectCall()} style={{...styles.button, ...styles.rejectBtn}}>
                Reject
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
               <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  <button onClick={() => callManager.toggleMute()} style={{...styles.button, backgroundColor: state.isAudioEnabled ? '#eee' : '#ff9800', color: 'black'}}>
                    {state.isAudioEnabled ? '🎤 Mute' : '🎤 Unmute'}
                  </button>
                  <button onClick={() => callManager.toggleVideo()} style={{...styles.button, backgroundColor: state.isVideoEnabled ? '#eee' : '#ff9800', color: 'black'}}>
                    {state.isVideoEnabled ? '📹 Stop Video' : '📹 Start Video'}
                  </button>
               </div>
               
               <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  <button onClick={() => state.isScreenSharing ? callManager.stopScreenShare() : callManager.startScreenShare()} style={styles.button}>
                    {state.isScreenSharing ? 'Stop Share' : '🖥️ Share Screen'}
                  </button>
                  <button onClick={() => state.isRecording ? callManager.stopRecording() : callManager.startRecording()} style={{...styles.button, color: state.isRecording ? 'red' : 'black' }}>
                    {state.isRecording ? '⏺️ Stop Rec' : '⏺️ Record'}
                  </button>
               </div>

               <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                  <button onClick={() => callManager.endCall()} style={{...styles.button, ...styles.rejectBtn}}>
                    End Call
                  </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  container: {
    width: '90%',
    maxWidth: '500px',
    backgroundColor: '#222',
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    color: 'white',
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
  },
  header: {
    textAlign: 'center',
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    height: '350px',
    backgroundColor: '#000',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  localVideoLarge: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)', // Mirror effect
  },
  localVideoSmall: {
    position: 'absolute',
    bottom: '15px',
    right: '15px',
    width: '120px',
    height: '160px',
    objectFit: 'cover',
    borderRadius: '8px',
    border: '2px solid rgba(255,255,255,0.8)',
    transform: 'scaleX(-1)', // Mirror effect
    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: '#666',
    fontSize: '1.2rem',
  },
  controls: {
    display: 'flex',
    justifyContent: 'center',
    gap: '15px',
  },
  button: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    backgroundColor: '#eee',
    color: '#333',
    transition: 'all 0.2s',
  },
  acceptBtn: {
    backgroundColor: '#4CAF50',
    color: 'white',
    padding: '12px 30px',
    fontSize: '16px',
  },
  rejectBtn: {
    backgroundColor: '#F44336',
    color: 'white',
    padding: '12px 30px',
    fontSize: '16px',
  }
};
