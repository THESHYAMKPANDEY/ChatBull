type ChatContext = {
  message: string;
  history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
};

type BotReply = {
  reply: string;
  confidence: number;
};

const normalize = (s: string) => s.trim().toLowerCase();

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

const containsAny = (text: string, needles: string[]) => needles.some((n) => text.includes(n));

const buildHelp = () =>
  [
    'I can help with ChatBull features:',
    '• Feed: posting, likes, comments, saving posts',
    '• Private Mode: secure chat, burn-after-read',
    '• Groups: creating groups and adding members',
    'Ask a question like “How do I save a post?”',
  ].join('\n');

export const generateChatbullReply = ({ message, history }: ChatContext): BotReply => {
  const text = normalize(message);
  const lastAssistant = history.slice().reverse().find((m) => m.role === 'assistant')?.content || '';

  if (!text) return { reply: 'Say something and I’ll help.', confidence: 0.2 };

  if (containsAny(text, ['hello', 'hi', 'hey', 'good morning', 'good evening'])) {
    return { reply: pick(['Hi! What can I help you with?', 'Hey! Ask me anything about ChatBull.', 'Hello! What do you want to do today?']), confidence: 0.9 };
  }

  if (containsAny(text, ['help', 'what can you do', 'commands'])) {
    return { reply: buildHelp(), confidence: 0.9 };
  }

  if (containsAny(text, ['save post', 'saved post', 'bookmark'])) {
    return {
      reply:
        'On a post, tap the bookmark icon to save it. In Profile, open the Saved tab to see saved posts.',
      confidence: 0.95,
    };
  }

  if (containsAny(text, ['comment', 'comments', 'reply on post'])) {
    return {
      reply:
        'On a post, tap the chat bubble to open comments. Type your comment and tap Post.',
      confidence: 0.95,
    };
  }

  if (containsAny(text, ['like', 'likes', 'heart'])) {
    return {
      reply:
        'Tap the heart icon under a post to like/unlike it. The count updates instantly.',
      confidence: 0.9,
    };
  }

  if (containsAny(text, ['post', 'upload']) && containsAny(text, ['image', 'photo', 'video', 'media'])) {
    return {
      reply:
        'Go to Feed, create a post, attach your photo/video, add a caption, then publish. If upload fails, check your connection and try again.',
      confidence: 0.85,
    };
  }

  if (containsAny(text, ['private mode', 'secure', 'encrypted', 'e2ee', 'burn'])) {
    return {
      reply:
        'Private Mode uses a secure session and can auto-burn messages. Enter it from the lock icon, authenticate, then use Lobby or DM.',
      confidence: 0.9,
    };
  }

  if (containsAny(text, ['group', 'create group', 'new group'])) {
    return {
      reply:
        'To create a group: open Create Group, select members, tap Next, enter group name, then Create Group.',
      confidence: 0.9,
    };
  }

  if (containsAny(text, ['history', 'remember', 'memory'])) {
    return {
      reply:
        'I remember the recent messages in this chat so I can answer follow-ups. Ask your question and I’ll keep context.',
      confidence: 0.8,
    };
  }

  if (containsAny(text, ['error', 'bug', 'crash', 'not working', 'broken'])) {
    return {
      reply:
        'Tell me what screen you’re on, what you tapped, and the exact error message. I’ll help you pinpoint the cause.',
      confidence: 0.7,
    };
  }

  if (lastAssistant.includes('Tell me what screen') && text.length > 5) {
    return {
      reply:
        'Got it. If you can also share whether this happens on web or mobile, I can narrow it down faster.',
      confidence: 0.55,
    };
  }

  return {
    reply:
      'I can help, but I need a bit more detail. Are you asking about Feed, Private Mode, Groups, or Profile?',
    confidence: 0.3,
  };
};

