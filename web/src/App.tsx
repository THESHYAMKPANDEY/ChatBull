import { useState, useEffect, useRef } from 'react';
import { connectSocket, getSocket } from './lib/socket';
import { SignalManager } from './lib/signal/SignalManager';
import api from './lib/api';
import { CallModal } from './components/CallModal';
import { callManager } from './lib/CallManager';
import LoginPage from './components/LoginPage';
import './index.css';

function App() {
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState<'login' | 'chat'>('login');
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [recipientId, setRecipientId] = useState('');
  
  const signalManagerRef = useRef<SignalManager | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      const u = JSON.parse(savedUser);
      setUser(u);
      setStep('chat');
      connectSocket(token);
      initializeSignal(u.id);
    }
  }, []);

  const initializeSignal = async (userId: string) => {
    const manager = new SignalManager(userId);
    const keys = await manager.initialize();
    signalManagerRef.current = manager;
    
    // Upload keys to server
    try {
      await api.post('/keys', {
        userId,
        deviceId: 1,
        registrationId: keys.registrationId,
        identityKey: keys.identityKey,
        signedPreKey: keys.signedPreKey,
        oneTimePreKeys: keys.preKeys
      });
      console.log('Keys uploaded successfully');
    } catch (e) {
      console.error('Failed to upload keys', e);
    }
  };

  useEffect(() => {
    if (step === 'chat') {
      const socket = getSocket();
      if (socket) {
        socket.on('newMessage', async (msg: any) => {
          // Decrypt incoming message
          if (signalManagerRef.current) {
            const decryptedContent = await signalManagerRef.current.decryptMessage(msg.senderId, msg.content);
            setMessages(prev => [...prev, { ...msg, content: decryptedContent }]);
          } else {
            setMessages(prev => [...prev, msg]);
          }
        });

        socket.on('messageSent', async (_msg: any) => {
           // We already know what we sent, but for consistency we handle the ack
        });
      }
    }
  }, [step]);

  const handleLoginSuccess = (token: string, user: any) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    setStep('chat');
    connectSocket(token);
    initializeSignal(user.id);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setStep('login');
    const socket = getSocket();
    if (socket) socket.disconnect();
  };

  const sendMessage = async () => {
      if (!input.trim()) return;
      if (!recipientId) {
        alert('Please enter a recipient User ID to send a message (Simulating 1:1)');
        return;
      }

      const socket = getSocket();
      if (socket && signalManagerRef.current) {
        // Encrypt message
        const ciphertext = await signalManagerRef.current.encryptMessage(recipientId, input);

        socket.emit('sendMessage', {
          recipientId,
          content: ciphertext,
        });

        // Add to local UI immediately (plaintext)
        setMessages(prev => [...prev, { 
            id: Date.now(), 
            content: input, 
            senderId: user.id, 
            createdAt: new Date().toISOString() 
        }]);
      }
      setInput('');
  };

  const startVideoCall = () => {
    if (!recipientId) {
      alert('Please enter a recipient ID first');
      return;
    }
    callManager.startCall(recipientId, 'video');
  };

  const startAudioCall = () => {
    if (!recipientId) {
      alert('Please enter a recipient ID first');
      return;
    }
    callManager.startCall(recipientId, 'audio');
  };

  if (step === 'login') {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: '600px', margin: '0 auto', border: '1px solid #ccc' }}>
      <header style={{ padding: '10px', background: '#075e54', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3>ChatBull</h3>
          <small>Logged in as: {user?.displayName || user?.phoneNumber || user?.email} (ID: {user?.id})</small>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={startAudioCall} style={{ background: 'transparent', border: '1px solid white', color: 'white', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>
             📞 Audio
          </button>
          <button onClick={startVideoCall} style={{ background: 'transparent', border: '1px solid white', color: 'white', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>
             🎥 Video
          </button>
          <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid white', color: 'white', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </header>
      
      <CallModal />
      
      <div style={{ background: '#eee', padding: '10px' }}>
         <input 
           style={{ width: '100%', padding: '5px' }}
           placeholder="Recipient User ID (Copy from another tab/window)"
           value={recipientId}
           onChange={e => setRecipientId(e.target.value)}
         />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px', background: '#e5ddd5' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ 
            marginBottom: '10px', 
            padding: '8px 12px', 
            borderRadius: '8px',
            alignSelf: msg.senderId === user?.id ? 'flex-end' : 'flex-start',
            background: msg.senderId === user?.id ? '#dcf8c6' : 'white',
            marginLeft: msg.senderId === user?.id ? 'auto' : '0',
            marginRight: msg.senderId === user?.id ? '0' : 'auto',
            maxWidth: '70%',
            width: 'fit-content',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <span>{msg.content}</span>
            <small style={{ fontSize: '10px', color: '#999', alignSelf: 'flex-end' }}>
              {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : 'Just now'}
            </small>
          </div>
        ))}
      </div>

      <div style={{ padding: '10px', display: 'flex', gap: '10px', background: '#f0f0f0' }}>
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message" 
          style={{ flex: 1, padding: '10px', borderRadius: '20px', border: '1px solid #ddd' }}
        />
        <button onClick={sendMessage} style={{ padding: '10px 20px', borderRadius: '20px', border: 'none', background: '#128c7e', color: 'white', cursor: 'pointer' }}>
          Send
        </button>
      </div>
    </div>
  );
}

export default App;
