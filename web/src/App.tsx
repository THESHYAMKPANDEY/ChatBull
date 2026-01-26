import { useState, useEffect, useRef } from 'react';
import { authApi } from './lib/api';
import { connectSocket, getSocket } from './lib/socket';
import { SignalManager } from './lib/signal/SignalManager';
import api from './lib/api';
import { CallModal } from './components/CallModal';
import LoginPage from './components/LoginPage';
import { callManager } from './lib/CallManager';
import './App.css';

function App() {
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState<'phone' | 'otp' | 'chat'>('phone');
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('email');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [remoteTyping, setRemoteTyping] = useState(false);
  const showOnlyLogin = false;
  
  // Search/New Chat State
  const [sidebarSearch, setSidebarSearch] = useState('');

  const signalManagerRef = useRef<SignalManager | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, remoteTyping]);

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

  // Chat Socket Listeners
  useEffect(() => {
    if (step === 'chat') {
      const socket = getSocket();
      if (!socket) return;

      // Message Receive
      socket.on('message:receive', async (msg: any) => {
        // Prevent double messages: Check if sender is self
        const senderId = typeof msg.sender === 'object' ? msg.sender._id : msg.sender;
        if (senderId === user?.id) return;

        // Decrypt incoming message
        let content = msg.content;
        try {
          if (signalManagerRef.current && msg.isPrivate !== false) {
             const decrypted = await signalManagerRef.current.decryptMessage(senderId, msg.content);
             content = decrypted;
          }
        } catch (e) {
           console.log('Decryption failed or message plain:', e);
        }

        setMessages(prev => {
          if (prev.some(m => m._id === msg._id)) return prev;
          return [...prev, { ...msg, content }];
        });
        
        // Send read receipt if we are looking at this chat
        if (senderId === recipientId) {
             socket.emit('messages:read', { senderId, receiverId: user.id });
        }
      });

      // Message Sent Confirmation
      socket.on('message:sent', (msg: any) => {
        console.log('Message sent confirmed:', msg);
      });
      
      // History
      socket.on('messages:history', async (historyMessages: any[]) => {
        const processedMessages = await Promise.all(historyMessages.map(async (msg) => {
            let content = msg.content;
            const senderId = typeof msg.sender === 'object' ? msg.sender._id : msg.sender;
            try {
              if (signalManagerRef.current && senderId !== user?.id) {
                 content = await signalManagerRef.current.decryptMessage(senderId, msg.content);
              }
            } catch (e) {
                // content remains as is
            }
            return { ...msg, content };
        }));
        setMessages(processedMessages);
      });

      // Typing
      socket.on('typing:start', (senderId: string) => {
        if (senderId === recipientId) {
          setRemoteTyping(true);
        }
      });

      socket.on('typing:stop', (senderId: string) => {
        if (senderId === recipientId) {
          setRemoteTyping(false);
        }
      });
      
      // Read Receipts
      socket.on('messages:read', (readByUserId: string) => {
         if (readByUserId === recipientId) {
             setMessages(prev => prev.map(m => 
                 (typeof m.sender === 'object' ? m.sender._id : m.sender) === user?.id 
                 ? { ...m, isRead: true } 
                 : m
             ));
         }
      });

      return () => {
        socket.off('message:receive');
        socket.off('message:sent');
        socket.off('messages:history');
        socket.off('typing:start');
        socket.off('typing:stop');
        socket.off('messages:read');
      };
    }
  }, [step, user, recipientId]);

  // Fetch history when recipient changes
  useEffect(() => {
    if (step === 'chat' && recipientId && user) {
        const socket = getSocket();
        if (socket) {
            setMessages([]); // Clear previous
            socket.emit('messages:get', { otherUserId: recipientId });
        }
    }
  }, [recipientId, step, user]);

  const handleLogin = async () => {
    if (!phone) return;
    setLoading(true);
    try {
      const res = await authApi.login(phone);
      console.log('OTP Sent:', res.data);
      alert(`OTP Sent! (Dev Code: ${res.data.devOtp})`);
      setStep('otp');
    } catch (err) {
      console.error(err);
      alert('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!otp) return;
    setLoading(true);
    try {
      const res = await authApi.verifyOtp(phone, otp, 'temp_id_key', 'temp_reg_id');
      const { access_token, user } = res.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      setStep('chat');
      connectSocket(access_token);
      initializeSignal(user.id);
    } catch (err) {
      console.error(err);
      alert('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setStep('phone');
    setPhone('');
    setOtp('');
    const socket = getSocket();
    if (socket) socket.disconnect();
  };

  const sendMessage = async () => {
      if (!input.trim()) return;
      if (!recipientId) {
        alert('Please select a user to chat with');
        return;
      }

      const socket = getSocket();
      if (socket && signalManagerRef.current) {
        let contentToSend = input;
        try {
            const ciphertext = await signalManagerRef.current.encryptMessage(recipientId, input);
            contentToSend = ciphertext;
        } catch (e) {
            console.error("Encryption failed, sending plain", e);
        }

        socket.emit('message:send', {
          receiverId: recipientId,
          content: contentToSend,
          isPrivate: true
        });

        setMessages(prev => [...prev, { 
            _id: 'temp-' + Date.now(), 
            content: input, 
            sender: user,
            senderId: user.id,
            createdAt: new Date().toISOString(),
            isRead: false
        }]);
        
        socket.emit('typing:stop', { receiverId: recipientId });
        setIsTyping(false);
      }
      setInput('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInput(e.target.value);
      
      if (!isTyping && recipientId) {
          setIsTyping(true);
          getSocket()?.emit('typing:start', { receiverId: recipientId });
      }
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
          if (recipientId) getSocket()?.emit('typing:stop', { receiverId: recipientId });
      }, 2000);
  };

  const startVideoCall = () => {
    if (!recipientId) return;
    callManager.startCall(recipientId, 'video');
  };

  const startAudioCall = () => {
    if (!recipientId) return;
    callManager.startCall(recipientId, 'audio');
  };

  const handleSidebarSearchSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && sidebarSearch.trim()) {
      setRecipientId(sidebarSearch.trim());
      setSidebarSearch('');
    }
  };

  if (showOnlyLogin) {
    return (
      <LoginPage 
        onLoginSuccess={(token, user) => {
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          setUser(user);
          setStep('chat');
          connectSocket(token);
          initializeSignal(user.id);
        }}
      />
    );
  }

  // Login UI
  if (step === 'phone') {
    if (loginMethod === 'email') {
      return (
        <LoginPage 
          onLoginSuccess={(token, user) => {
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            setUser(user);
            setStep('chat');
            connectSocket(token);
            initializeSignal(user.id);
          }} 
        />
      );
    }

    return (
      <div style={styles.container}>
        <h2>ChatBull Login</h2>
        <input 
          style={styles.input}
          placeholder="Phone Number" 
          value={phone} 
          onChange={e => setPhone(e.target.value)} 
        />
        <button style={styles.button} onClick={handleLogin} disabled={loading}>
          {loading ? 'Sending...' : 'Next'}
        </button>
        <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <button 
              onClick={() => setLoginMethod('email')}
              style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Switch to Email Login
            </button>
        </div>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <div style={styles.container}>
        <h2>Enter OTP</h2>
        <p>Sent to {phone}</p>
        <input 
          style={styles.input}
          placeholder="6-digit code" 
          value={otp} 
          onChange={e => setOtp(e.target.value)} 
        />
        <button style={styles.button} onClick={handleVerify} disabled={loading}>
          {loading ? 'Verifying...' : 'Verify & Login'}
        </button>
      </div>
    );
  }

  // Chat UI
  return (
    <div className="app-container">
      <CallModal />

      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="user-profile">
            <div className="avatar" style={{ backgroundColor: '#00a884' }}>
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
            </div>
            <span>{user?.displayName || 'Me'}</span>
          </div>
          <div className="sidebar-actions">
            <button title="Logout" onClick={handleLogout}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M16 13v-2H7V8l-5 4 5 4v-3z"></path><path d="M20 3h-9c-1.103 0-2 .897-2 2v4h2V5h9v14h-9v-4H9v4c0 1.103.897 2 2 2h9c1.103 0 2-.897 2-2V5c0-1.103-.897-2-2-2z"></path></svg>
            </button>
          </div>
        </div>

        <div className="search-bar">
          <div className="search-input-wrapper">
             <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--text-secondary)">
                <path d="M10 18a7.952 7.952 0 0 0 4.897-1.688l4.396 4.396 1.414-1.414-4.396-4.396A7.952 7.952 0 0 0 10 2C5.589 2 2 5.589 2 10s3.589 8 8 8zm0-14c3.309 0 6 2.691 6 6s-2.691 6-6 6-6-2.691-6-6 2.691-6 6-6z"></path>
             </svg>
             <input 
               className="search-input" 
               placeholder="Enter User ID to chat" 
               value={sidebarSearch}
               onChange={(e) => setSidebarSearch(e.target.value)}
               onKeyDown={handleSidebarSearchSubmit}
             />
          </div>
        </div>

        <div className="chat-list">
           {recipientId ? (
             <div className="chat-item active">
               <div className="avatar">
                  {recipientId.charAt(0).toUpperCase()}
               </div>
               <div className="chat-info">
                  <div className="chat-name">User: {recipientId.slice(0, 8)}...</div>
                  <div className="chat-last-msg">
                    {messages.length > 0 ? messages[messages.length - 1].content : 'Click to start chatting'}
                  </div>
               </div>
             </div>
           ) : (
             <div style={{ padding: '20px', textAlign: 'center', color: '#888', fontSize: '14px' }}>
               Type a User ID above and press Enter to connect.
             </div>
           )}
        </div>
      </div>

      {/* Main Chat Area */}
      {recipientId ? (
        <div className="main-chat">
          <header className="chat-header">
             <div className="chat-header-info">
                <div className="avatar">
                   {recipientId.charAt(0).toUpperCase()}
                </div>
                <div className="chat-header-text">
                   <div className="chat-header-name">User: {recipientId}</div>
                   <div className="chat-header-status">
                      {remoteTyping ? 'typing...' : 'online'}
                   </div>
                </div>
             </div>
             <div className="chat-header-actions">
                <button className="icon-button" onClick={startAudioCall} title="Voice Call">
                   <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20.012 15.51c-1.932 0-3.76-.73-5.132-2.102l-1.09-1.09c-.27-.27-.7-.27-.97 0l-1.55 1.55c-1.48-1.08-2.67-2.27-3.75-3.75l1.55-1.55c.27-.27.27-.7 0-.97l-1.09-1.09C6.46 5.05 4.63 4.32 2.7 4.32c-.96 0-1.74.78-1.74 1.74v1.75c0 9.09 7.41 16.5 16.5 16.5h1.75c.96 0 1.74-.78 1.74-1.74V17.25c0-.96-.78-1.74-1.74-1.74z"></path></svg>
                </button>
                <button className="icon-button" onClick={startVideoCall} title="Video Call">
                   <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M18 7c0-1.103-.897-2-2-2H4c-1.103 0-2 .897-2 2v10c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-3.333L22 17V7l-4 3.333V7z"></path></svg>
                </button>
             </div>
          </header>

          <div className="messages-area">
             {messages.map((msg, idx) => {
               const isMe = (typeof msg.sender === 'object' ? msg.sender._id : (msg.sender || msg.senderId)) === user?.id;
               return (
                 <div key={idx} className={`message ${isMe ? 'outgoing' : 'incoming'}`}>
                   <div className="message-content">{msg.content}</div>
                   <div className="message-meta">
                     <span>
                       {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                     </span>
                     {isMe && (
                        <span className={`read-status ${msg.isRead ? '' : 'unread'}`}>
                          {msg.isRead ? (
                            <svg viewBox="0 0 16 11" width="16" height="11" fill="currentColor"><path d="M10.854 8.146l4-4a.5.5 0 0 1 .708.708l-4.354 4.354a.5.5 0 0 1-.708 0l-2-2a.5.5 0 0 1 .708-.708l1.646 1.646zm-5.708 0l4-4a.5.5 0 0 1 .708.708l-4.354 4.354a.5.5 0 0 1-.708 0l-2-2a.5.5 0 0 1 .708-.708l1.646 1.646z"></path></svg>
                          ) : (
                            <svg viewBox="0 0 16 15" width="12" height="11" fill="currentColor"><path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.283a.533.533 0 0 0 .859-.007l6.294-7.782a.417.417 0 0 0-.063-.51zM11.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.666 9.879a.32.32 0 0 1-.484.033L1.863 7.629a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l2.652 2.578a.533.533 0 0 0 .859-.007l6.294-7.782a.417.417 0 0 0-.063-.51z"></path></svg>
                          )}
                        </span>
                     )}
                   </div>
                 </div>
               );
             })}
             {remoteTyping && (
               <div className="typing-indicator">typing...</div>
             )}
             <div ref={messagesEndRef} />
          </div>

          <div className="input-area">
             <div className="input-wrapper">
                <input 
                  className="chat-input" 
                  value={input} 
                  onChange={handleInputChange}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message" 
                />
             </div>
             <button className="icon-button send-button" onClick={sendMessage}>
               <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
             </button>
          </div>
        </div>
      ) : (
        <div className="empty-state">
           <img src="/logo.png" alt="Chatbull" width="100" style={{ marginBottom: '20px', opacity: 0.8 }} onError={(e) => e.currentTarget.style.display='none'}/>
           <h2>Welcome to Chatbull Web</h2>
           <p>Send and receive messages without keeping your phone online.<br/>Use Chatbull on up to 4 linked devices and 1 phone.</p>
           <div style={{ marginTop: '20px', fontSize: '12px', color: '#888' }}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style={{ marginRight: '5px', verticalAlign: 'middle' }}><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"></path></svg>
              End-to-end encrypted
           </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '400px',
    margin: '50px auto',
    padding: '20px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px'
  },
  input: {
    padding: '10px',
    fontSize: '16px',
    borderRadius: '4px',
    border: '1px solid #ccc'
  },
  button: {
    padding: '10px',
    fontSize: '16px',
    borderRadius: '4px',
    border: 'none',
    background: '#128c7e',
    color: 'white',
    cursor: 'pointer'
  }
};

export default App;
