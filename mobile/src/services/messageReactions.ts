// PRODUCTION-READY MESSAGE REACTIONS SYSTEM
import { Socket } from 'socket.io-client';

export interface MessageReaction {
  messageId: string;
  userId: string;
  reaction: string; // emoji
  timestamp: Date;
}

export interface ReactionSummary {
  [reaction: string]: {
    count: number;
    users: string[];
  };
}

class MessageReactionManager {
  private socket: Socket | null = null;
  private reactions: Map<string, MessageReaction[]> = new Map(); // messageId -> reactions
  private reactionSummaries: Map<string, ReactionSummary> = new Map(); // messageId -> summary

  initialize(socket: Socket) {
    this.socket = socket;
    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    // Listen for incoming reactions
    this.socket.on('message:reaction:add', (data: {
      messageId: string;
      userId: string;
      reaction: string;
      timestamp: string;
      displayName: string;
    }) => {
      this.addReaction(data.messageId, {
        messageId: data.messageId,
        userId: data.userId,
        reaction: data.reaction,
        timestamp: new Date(data.timestamp)
      });
      
      console.log(`😊 Reaction added: ${data.reaction} to message ${data.messageId}`);
    });

    // Listen for reaction removal
    this.socket.on('message:reaction:remove', (data: {
      messageId: string;
      userId: string;
      reaction: string;
    }) => {
      this.removeReaction(data.messageId, data.userId, data.reaction);
      console.log(`❌ Reaction removed: ${data.reaction} from message ${data.messageId}`);
    });
  }

  // Add a reaction to a message
  addReaction(messageId: string, reaction: MessageReaction) {
    if (!this.reactions.has(messageId)) {
      this.reactions.set(messageId, []);
    }
    
    const reactions = this.reactions.get(messageId)!;
    // Check if user already reacted with this emoji
    const existingIndex = reactions.findIndex(r => 
      r.userId === reaction.userId && r.reaction === reaction.reaction
    );
    
    if (existingIndex >= 0) {
      // Update timestamp if already exists
      reactions[existingIndex].timestamp = reaction.timestamp;
    } else {
      // Add new reaction
      reactions.push(reaction);
    }
    
    this.updateReactionSummary(messageId);
  }

  // Remove a reaction from a message
  removeReaction(messageId: string, userId: string, reaction: string) {
    const reactions = this.reactions.get(messageId);
    if (!reactions) return;

    const filtered = reactions.filter(r => 
      !(r.userId === userId && r.reaction === reaction)
    );
    
    this.reactions.set(messageId, filtered);
    this.updateReactionSummary(messageId);
  }

  // Toggle a reaction (add/remove)
  toggleReaction(messageId: string, userId: string, reaction: string, displayName: string) {
    if (!this.socket) return;

    const reactions = this.reactions.get(messageId) || [];
    const existingIndex = reactions.findIndex(r => 
      r.userId === userId && r.reaction === reaction
    );

    if (existingIndex >= 0) {
      // Remove existing reaction
      this.socket.emit('message:reaction:remove', {
        messageId,
        userId,
        reaction
      });
    } else {
      // Add new reaction
      this.socket.emit('message:reaction:add', {
        messageId,
        userId,
        reaction,
        timestamp: new Date().toISOString(),
        displayName
      });
    }
  }

  // Get reactions for a message
  getMessageReactions(messageId: string): MessageReaction[] {
    return this.reactions.get(messageId) || [];
  }

  // Get reaction summary for a message
  getReactionSummary(messageId: string): ReactionSummary {
    return this.reactionSummaries.get(messageId) || {};
  }

  // Update reaction summary
  private updateReactionSummary(messageId: string) {
    const reactions = this.reactions.get(messageId) || [];
    const summary: ReactionSummary = {};

    reactions.forEach(reaction => {
      if (!summary[reaction.reaction]) {
        summary[reaction.reaction] = {
          count: 0,
          users: []
        };
      }
      
      summary[reaction.reaction].count++;
      if (!summary[reaction.reaction].users.includes(reaction.userId)) {
        summary[reaction.reaction].users.push(reaction.userId);
      }
    });

    this.reactionSummaries.set(messageId, summary);
  }

  // Get user's reaction to a message
  getUserReaction(messageId: string, userId: string): string | null {
    const reactions = this.reactions.get(messageId) || [];
    const userReaction = reactions.find(r => r.userId === userId);
    return userReaction ? userReaction.reaction : null;
  }

  // Get all reactions by user
  getUserReactions(userId: string): MessageReaction[] {
    const allReactions: MessageReaction[] = [];
    for (const [, reactions] of this.reactions) {
      allReactions.push(...reactions.filter(r => r.userId === userId));
    }
    return allReactions;
  }

  // Clear reactions for a message
  clearMessageReactions(messageId: string) {
    this.reactions.delete(messageId);
    this.reactionSummaries.delete(messageId);
  }

  // Get popular reactions
  getPopularReactions(limit: number = 5): string[] {
    const allReactions: { [key: string]: number } = {};
    
    for (const [, reactions] of this.reactions) {
      reactions.forEach(reaction => {
        allReactions[reaction.reaction] = (allReactions[reaction.reaction] || 0) + 1;
      });
    }

    return Object.entries(allReactions)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([emoji]) => emoji);
  }
}

// Singleton instance
export const messageReactionManager = new MessageReactionManager();

// Default reactions
export const DEFAULT_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];