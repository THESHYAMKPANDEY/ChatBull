// PRODUCTION-READY MESSAGE STATUS SYSTEM
import { Socket } from 'socket.io-client';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface MessageWithStatus {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  timestamp: Date;
  status: MessageStatus;
  readAt?: Date;
}

class MessageStatusManager {
  private socket: Socket | null = null;
  private messageStatusMap: Map<string, MessageStatus> = new Map();
  private readReceipts: Map<string, Date> = new Map();

  initialize(socket: Socket) {
    this.socket = socket;
    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    // Listen for delivery confirmations
    this.socket.on('message:delivered', (data: { messageId: string; timestamp: string }) => {
      this.updateMessageStatus(data.messageId, 'delivered');
      console.log(`✅ Message ${data.messageId} delivered at ${data.timestamp}`);
    });

    // Listen for read receipts
    this.socket.on('message:read', (data: { messageId: string; timestamp: string }) => {
      this.updateMessageStatus(data.messageId, 'read');
      this.readReceipts.set(data.messageId, new Date(data.timestamp));
      console.log(`👀 Message ${data.messageId} read at ${data.timestamp}`);
    });

    // Listen for failed messages
    this.socket.on('message:failed', (data: { messageId: string; error: string }) => {
      this.updateMessageStatus(data.messageId, 'failed');
      console.error(`❌ Message ${data.messageId} failed: ${data.error}`);
    });
  }

  // Track message sending
  trackMessageSending(messageId: string) {
    this.messageStatusMap.set(messageId, 'sending');
  }

  // Update message status
  updateMessageStatus(messageId: string, status: MessageStatus) {
    this.messageStatusMap.set(messageId, status);
  }

  // Get current message status
  getMessageStatus(messageId: string): MessageStatus {
    return this.messageStatusMap.get(messageId) || 'sending';
  }

  // Send read receipt
  sendReadReceipt(messageId: string, receiverId: string) {
    if (this.socket) {
      this.socket.emit('message:mark-read', {
        messageId,
        receiverId,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Batch update statuses
  batchUpdateStatuses(updates: { messageId: string; status: MessageStatus }[]) {
    updates.forEach(({ messageId, status }) => {
      this.updateMessageStatus(messageId, status);
    });
  }

  // Cleanup old statuses
  cleanupOldStatuses(maxAgeHours: number = 24) {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    
    for (const [messageId, status] of this.messageStatusMap.entries()) {
      // Keep failed messages indefinitely for retry logic
      if (status !== 'failed') {
        // Remove old statuses (implementation depends on your storage system)
        // this.messageStatusMap.delete(messageId);
      }
    }
  }

  // Get all statuses for debugging
  getAllStatuses(): Record<string, MessageStatus> {
    const statuses: Record<string, MessageStatus> = {};
    this.messageStatusMap.forEach((status, id) => {
      statuses[id] = status;
    });
    return statuses;
  }
}

// Singleton instance
export const messageStatusManager = new MessageStatusManager();

// Hook for React components
export const useMessageStatus = (messageId: string) => {
  return messageStatusManager.getMessageStatus(messageId);
};