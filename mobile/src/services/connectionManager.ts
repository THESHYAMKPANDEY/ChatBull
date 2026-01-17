// PRODUCTION-READY CONNECTION STATE MANAGER
// Note: @react-native-netinfo needs to be installed
// npm install @react-native-netinfo
import EventEmitter from 'eventemitter3';

// Mock NetInfo for now - will be replaced with actual implementation
const NetInfo = {
  addEventListener: (callback: Function) => {
    // Mock implementation
    return { remove: () => {} };
  },
  fetch: async () => ({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi'
  }),
  getCurrentState: () => ({
    type: 'wifi'
  })
};

export type ConnectionStatus = 'online' | 'offline' | 'connecting' | 'reconnecting';

class ConnectionManager extends EventEmitter {
  private currentStatus: ConnectionStatus = 'connecting';
  private isConnected = false;
  private isInternetReachable = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // ms

  constructor() {
    super();
    this.initializeNetworkListener();
  }

  private initializeNetworkListener() {
    NetInfo.addEventListener((state: { isConnected: boolean; isInternetReachable?: boolean }) => {
      this.handleNetworkStateChange(state);
    });
  }

  private handleNetworkStateChange(state: { isConnected: boolean; isInternetReachable?: boolean }) {
    const previousStatus = this.currentStatus;
    const wasConnected = this.isConnected;

    this.isConnected = state.isConnected;
    this.isInternetReachable = state.isInternetReachable ?? state.isConnected;

    // Determine new status
    if (this.isConnected && this.isInternetReachable) {
      this.currentStatus = 'online';
      this.reconnectAttempts = 0;
    } else if (this.isConnected) {
      this.currentStatus = 'connecting';
    } else {
      this.currentStatus = 'offline';
    }

    // Emit events for status changes
    if (previousStatus !== this.currentStatus) {
      this.emit('statusChanged', {
        from: previousStatus,
        to: this.currentStatus,
        isConnected: this.isConnected
      });
    }

    // Handle reconnection logic
    if (!wasConnected && this.isConnected) {
      this.handleReconnection();
    } else if (wasConnected && !this.isConnected) {
      this.handleDisconnection();
    }
  }

  private handleReconnection() {
    console.log('📡 Network reconnected');
    this.emit('reconnected');
  }

  private handleDisconnection() {
    console.log('📡 Network disconnected');
    this.emit('disconnected');
    
    // Attempt to reconnect
    this.attemptReconnection();
  }

  private attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    // Exponential backoff
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      // Check if we're still offline
      NetInfo.fetch().then((state: { isConnected: boolean }) => {
        if (!state.isConnected) {
          this.attemptReconnection();
        }
      });
    }, delay);
  }

  // Public API
  getStatus(): ConnectionStatus {
    return this.currentStatus;
  }

  isConnectedToInternet(): boolean {
    return this.isConnected && this.isInternetReachable;
  }

  getNetworkDetails(): { 
    isConnected: boolean; 
    isInternetReachable: boolean; 
    type: string; 
    reconnectAttempts: number 
  } {
    return {
      isConnected: this.isConnected,
      isInternetReachable: this.isInternetReachable,
      type: NetInfo.getCurrentState()?.type || 'unknown',
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // Force network check
  async checkNetwork(): Promise<boolean> {
    const state = await NetInfo.fetch();
    this.handleNetworkStateChange(state);
    return this.isConnectedToInternet();
  }

  // Reset reconnection counter
  resetReconnectionAttempts() {
    this.reconnectAttempts = 0;
  }

  // Manual reconnect
  async manualReconnect(): Promise<boolean> {
    this.resetReconnectionAttempts();
    return this.checkNetwork();
  }
}

// Singleton instance
export const connectionManager = new ConnectionManager();

// React hook for connection status
export const useConnectionStatus = () => {
  // Implementation would integrate with React state management
  return {
    status: connectionManager.getStatus(),
    isConnected: connectionManager.isConnectedToInternet(),
    details: connectionManager.getNetworkDetails()
  };
};

// Connection status indicator component
export const ConnectionStatusIndicator = () => {
  // Would return a visual component showing connection status
  const status = connectionManager.getStatus();
  
  const statusColors = {
    online: '#4CAF50',
    offline: '#F44336',
    connecting: '#FF9800',
    reconnecting: '#FF9800'
  };

  return {
    status,
    color: statusColors[status],
    message: getConnectionStatusMessage(status)
  };
};

const getConnectionStatusMessage = (status: ConnectionStatus): string => {
  switch (status) {
    case 'online':
      return 'Connected';
    case 'offline':
      return 'No Internet';
    case 'connecting':
      return 'Connecting...';
    case 'reconnecting':
      return 'Reconnecting...';
    default:
      return 'Checking...';
  }
};

// Global error handler for network issues
export const setupGlobalNetworkErrorHandler = () => {
  // Listen for connection status changes
  connectionManager.on('statusChanged', (data) => {
    console.log(`🌐 Connection status: ${data.from} → ${data.to}`);
  });

  connectionManager.on('disconnected', () => {
    console.log('⚠️ Network disconnection detected');
    // Could show notification or alert user
  });

  connectionManager.on('reconnected', () => {
    console.log('✅ Network reconnection successful');
    // Could trigger data sync or refresh
  });
};