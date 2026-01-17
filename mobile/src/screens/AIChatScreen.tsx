import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { api } from '../services/api';
import BottomTabBar from '../components/BottomTabBar';
import { useTheme } from '../config/theme';

type ChatItem = {
  id: string;
  role: 'user' | 'ai';
  text: string;
};

type AIChatScreenProps = {
  onChats: () => void;
  onFeed: () => void;
  onPrivate: () => void;
  onProfile: () => void;
};

export default function AIChatScreen({ onChats, onFeed, onPrivate, onProfile }: AIChatScreenProps) {
  const { colors } = useTheme();
  const [items, setItems] = useState<ChatItem[]>([
    { id: 'welcome', role: 'ai', text: 'Hi, I’m ChatBull AI. Ask me anything.' },
  ]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const data = useMemo(() => items, [items]);

  const send = async () => {
    const message = text.trim();
    if (!message || sending) return;

    const userItem: ChatItem = { id: `u_${Date.now()}`, role: 'user', text: message };
    setItems((prev) => [userItem, ...prev]);
    setText('');

    try {
      setSending(true);
      const result = await api.aiChat(message);
      const replyText = result?.reply || 'Okay.';
      const aiItem: ChatItem = { id: `a_${Date.now()}`, role: 'ai', text: replyText };
      setItems((prev) => [aiItem, ...prev]);
    } catch (error: any) {
      const aiItem: ChatItem = { id: `a_${Date.now()}`, role: 'ai', text: error.message || 'Failed to reply.' };
      setItems((prev) => [aiItem, ...prev]);
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: ChatItem }) => {
    const isUser = item.role === 'user';
    return (
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.aiBubble,
          {
            backgroundColor: isUser ? colors.primary : colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.bubbleText, { color: isUser ? '#fff' : colors.text }]}>{item.text}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>MetaAI</Text>
        <View />
      </View>

      <FlatList
        data={data}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        inverted
        showsVerticalScrollIndicator={false}
      />

      <View style={[styles.composer, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Ask ChatBull AI…"
          placeholderTextColor={colors.mutedText}
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.primary }]} onPress={send} disabled={sending}>
          {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>Send</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <BottomTabBar
          active="ai"
          onChats={onChats}
          onFeed={onFeed}
          onPrivate={onPrivate}
          onAI={() => {}}
          onProfile={onProfile}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 56,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  list: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderWidth: 0,
  },
  aiBubble: {
    alignSelf: 'flex-start',
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 18,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    paddingBottom: 66,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    fontSize: 15,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  sendBtn: {
    marginLeft: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: {
    color: '#fff',
    fontWeight: '700',
  },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});

