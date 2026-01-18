import Post from '../models/Post';

export type ChatHistoryItem = { role: 'user' | 'assistant' | 'system'; content: string };

export type ChatUserContext = {
  id: string;
  displayName?: string;
  username?: string;
  savedPostsCount?: number;
  savedPostIds?: string[];
};

export type ChatContext = {
  message: string;
  history: ChatHistoryItem[];
  user?: ChatUserContext;
};

export type BotReply = {
  reply: string;
  confidence: number;
  intent?: string;
};

const normalize = (s: string) => s.trim().toLowerCase();

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'to',
  'of',
  'in',
  'on',
  'for',
  'with',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'it',
  'this',
  'that',
  'i',
  'me',
  'my',
  'you',
  'your',
  'we',
  'our',
  'can',
  'could',
  'should',
  'please',
  'tell',
  'show',
  'how',
  'what',
  'why',
  'when',
  'where',
]);

const tokenize = (text: string) =>
  normalize(text)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !STOPWORDS.has(t));

const containsPhrase = (text: string, phrase: string) => normalize(text).includes(normalize(phrase));

const anyPhrase = (text: string, phrases: string[]) => phrases.some((p) => containsPhrase(text, p));

const scoreText = (text: string, keywords: string[], phrases: string[]) => {
  let score = 0;
  const tokens = tokenize(text);
  const tokenSet = new Set(tokens);
  for (const k of keywords) {
    if (tokenSet.has(k)) score += 1;
  }
  for (const p of phrases) {
    if (containsPhrase(text, p)) score += 2.5;
  }
  return score;
};

const isFollowUp = (text: string) => {
  const t = normalize(text);
  if (t.length <= 12) return true;
  if (anyPhrase(t, ['what about', 'how about', 'and then', 'also', 'then', 'ok', 'okay'])) return true;
  if (anyPhrase(t, ['it', 'that', 'this', 'him', 'her', 'them', 'those', 'these', 'there'])) return true;
  return false;
};

const resolvedMessage = (message: string, history: ChatHistoryItem[]) => {
  const text = normalize(message);
  if (!text) return text;
  if (!isFollowUp(text)) return text;
  const prevUser = history.slice().reverse().find((m) => m.role === 'user')?.content;
  if (!prevUser) return text;
  const prev = normalize(prevUser);
  if (!prev || prev === text) return text;
  return `${prev} ${text}`;
};

const buildHelp = () =>
  [
    'Try any of these:',
    '• “How do I save a post?”',
    '• “How do I comment?”',
    '• “How many posts do I have?”',
    '• “How do I create a group?”',
    '• “Private mode: how does it work?”',
    '• “How do I edit my profile?”',
    '• “How do I delete my account?”',
  ].join('\n');

type Intent = {
  id: string;
  keywords: string[];
  phrases: string[];
  handler: (ctx: { raw: string; text: string; tokens: string[]; user?: ChatUserContext }) => Promise<string> | string;
};

const intents: Intent[] = [
  {
    id: 'greeting',
    keywords: ['hello', 'hi', 'hey'],
    phrases: ['good morning', 'good evening'],
    handler: ({ user }) => pick([`Hi${user?.displayName ? `, ${user.displayName}` : ''}! What can I help you with?`, 'Hey! What do you want to do in ChatBull?', 'Hello! Ask me anything about the app.']),
  },
  {
    id: 'identity',
    keywords: ['who', 'janeai', 'you', 'name'],
    phrases: ['who are you', 'what are you'],
    handler: () => 'I’m JANEAI, your ChatBull assistant. I can guide you through posting, comments, saving posts, groups, and private mode.',
  },
  {
    id: 'about_app',
    keywords: ['chatbull', 'app', 'platform'],
    phrases: ['what is chatbull', 'about chatbull'],
    handler: () => 'ChatBull is a social chat app with a feed, comments, saved posts, groups, and a private mode for secure conversations.',
  },
  {
    id: 'help',
    keywords: ['help', 'commands'],
    phrases: ['what can you do'],
    handler: () => buildHelp(),
  },
  {
    id: 'how_save',
    keywords: ['save', 'saved', 'bookmark'],
    phrases: ['save post', 'save a post', 'saved posts', 'bookmark a post', 'bookmark post'],
    handler: () =>
      'Tap the bookmark icon on a post to save it. In Profile, open the Saved tab to view saved posts.',
  },
  {
    id: 'how_comment',
    keywords: ['comment', 'comments', 'reply'],
    phrases: ['reply on post', 'add a comment', 'comment on a post', 'comment on post'],
    handler: () =>
      'Tap the chat bubble under a post to open comments, type your comment, then tap Post.',
  },
  {
    id: 'how_like',
    keywords: ['like', 'likes', 'heart'],
    phrases: ['like a post', 'unlike'],
    handler: () => 'Tap the heart icon under a post to like/unlike it. The count updates instantly.',
  },
  {
    id: 'how_post_media',
    keywords: ['post', 'upload', 'image', 'photo', 'video', 'media'],
    phrases: ['post a photo', 'post a video', 'upload image', 'upload video'],
    handler: () =>
      'Go to Feed, create a post, attach your photo/video, add a caption, then publish. If it fails, check connection and try again.',
  },
  {
    id: 'how_share',
    keywords: ['share', 'send'],
    phrases: ['share post', 'send post'],
    handler: () => 'On a post, tap the paper-plane icon to share.',
  },
  {
    id: 'private_mode',
    keywords: ['private', 'secure', 'encrypted', 'e2ee', 'burn'],
    phrases: ['private mode', 'burn after read'],
    handler: () =>
      'Private Mode creates a secure session and can auto-burn messages. Use Lobby for public chat or DM for 1:1.',
  },
  {
    id: 'create_group',
    keywords: ['group', 'groups', 'members'],
    phrases: ['create group', 'new group'],
    handler: () =>
      'To create a group: open Create Group, select members, tap Next, set name, then Create Group.',
  },
  {
    id: 'my_stats',
    keywords: ['many', 'count', 'posts', 'saved'],
    phrases: ['how many posts', 'how many saved', 'saved count', 'posts count'],
    handler: async ({ text, user }) => {
      const wantsPosts = anyPhrase(text, ['how many posts', 'post count', 'posts count']) || text.includes('posts');
      const wantsSaved = anyPhrase(text, ['how many saved', 'saved count']) || text.includes('saved') || text.includes('bookmark');

      const parts: string[] = [];
      if (wantsPosts && user?.id) {
        const count = await Post.countDocuments({ author: user.id });
        parts.push(`You have ${count} post${count === 1 ? '' : 's'}.`);
      }
      if (wantsSaved) {
        const saved = user?.savedPostsCount ?? 0;
        parts.push(`You have ${saved} saved post${saved === 1 ? '' : 's'}.`);
      }
      if (parts.length === 0) return 'Do you want your post count or your saved post count?';
      return parts.join(' ');
    },
  },
  {
    id: 'edit_profile',
    keywords: ['edit', 'profile', 'bio', 'username', 'name', 'photo', 'avatar'],
    phrases: ['edit profile', 'change bio', 'change username', 'update profile', 'change profile picture'],
    handler: () =>
      'Go to Profile → Edit profile. From there you can change your name, username, bio, website, phone, and profile photo.',
  },
  {
    id: 'toggle_theme',
    keywords: ['theme', 'dark', 'light', 'mode'],
    phrases: ['dark mode', 'light mode', 'change theme'],
    handler: () => 'Go to Profile → Dark mode, and toggle it on/off.',
  },
  {
    id: 'delete_account',
    keywords: ['delete', 'remove', 'account'],
    phrases: ['delete my account', 'remove my account'],
    handler: () =>
      'Go to Profile → Delete account. Confirm the prompt (this is permanent).',
  },
  {
    id: 'login_signup',
    keywords: ['login', 'sign', 'signup', 'register', 'otp', 'code'],
    phrases: ['log in', 'sign up', 'create account', 'verification code'],
    handler: () =>
      'Use the Login screen to sign in. If you use email OTP, request the code, then enter it to verify and continue.',
  },
  {
    id: 'my_latest_post',
    keywords: ['latest', 'last', 'recent', 'post'],
    phrases: ['my last post', 'my latest post', 'recent post'],
    handler: async ({ user }) => {
      if (!user?.id) return 'Log in first, then I can pull your latest post.';
      const latest = await Post.findOne({ author: user.id }).sort({ createdAt: -1 }).select('content mediaType createdAt');
      if (!latest) return 'You don’t have any posts yet.';
      const content = String((latest as any).content || '').trim();
      const mediaType = (latest as any).mediaType ? String((latest as any).mediaType) : '';
      const prefix = mediaType ? `Latest post (${mediaType}):` : 'Latest post:';
      return `${prefix} ${content ? content.slice(0, 120) : '(no caption)'}`.trim();
    },
  },
  {
    id: 'my_latest_saved',
    keywords: ['latest', 'last', 'recent', 'saved', 'bookmark'],
    phrases: ['my last saved', 'my latest saved', 'latest saved post'],
    handler: async ({ user }) => {
      const ids = user?.savedPostIds || [];
      if (ids.length === 0) return 'You don’t have any saved posts yet.';
      const latest = await Post.findOne({ _id: { $in: ids } }).sort({ createdAt: -1 }).select('content mediaType createdAt');
      if (!latest) return 'Your saved posts list is empty.';
      const content = String((latest as any).content || '').trim();
      const mediaType = (latest as any).mediaType ? String((latest as any).mediaType) : '';
      const prefix = mediaType ? `Latest saved (${mediaType}):` : 'Latest saved:';
      return `${prefix} ${content ? content.slice(0, 120) : '(no caption)'}`.trim();
    },
  },
  {
    id: 'profile',
    keywords: ['profile', 'username', 'bio'],
    phrases: ['my profile', 'my username'],
    handler: ({ user }) => {
      if (!user) return 'I can help with your profile once you’re logged in.';
      const u = user.username ? `@${user.username}` : '';
      return `Profile: ${user.displayName || 'User'} ${u}`.trim();
    },
  },
  {
    id: 'voice_mode',
    keywords: ['voice', 'talk', 'speaking', 'mic', 'microphone'],
    phrases: ['voice mode', 'talk to janeai'],
    handler: () =>
      'Open AI Chat and tap the mic icon in the header to switch to Voice Mode. If voice input is unavailable, you can still type your question.',
  },
  {
    id: 'troubleshoot',
    keywords: ['error', 'bug', 'crash', 'broken'],
    phrases: ['not working'],
    handler: () =>
      'Tell me what screen you’re on, what you tapped, and the exact error text. I’ll narrow it down fast.',
  },
];

export const generateChatbullReply = async ({ message, history, user }: ChatContext): Promise<BotReply> => {
  const raw = message || '';
  const text = resolvedMessage(raw, history);
  if (!normalize(text)) return { reply: 'Say something and I’ll help.', confidence: 0.2, intent: 'empty' };

  const tokens = tokenize(text);

  const scored = intents
    .map((i) => ({
      intent: i,
      score: scoreText(text, i.keywords, i.phrases),
    }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || best.score < 1.5) {
    const suggestions = scored
      .filter((s) => s.score > 0)
      .slice(0, 3)
      .map((s) => s.intent.id)
      .join(', ');

    const shortHelp = pick([
      'Which area is this about: Feed, Profile, Groups, or Private Mode?',
      'Tell me what you’re trying to do (post, comment, save, group, private mode).',
      'What screen are you on and what do you want to achieve?',
    ]);

    const hint = suggestions ? `Closest topics I detected: ${suggestions}.` : '';
    return { reply: [shortHelp, hint].filter(Boolean).join(' '), confidence: 0.3, intent: 'unknown' };
  }

  const reply = await best.intent.handler({ raw, text, tokens, user });
  const confidence = Math.min(0.98, 0.45 + best.score / 10);
  return { reply, confidence, intent: best.intent.id };
};
