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
import AppHeader from '../components/AppHeader';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { auth } from '../config/firebase';
import { appConfig } from '../config/appConfig';
import { Ionicons } from '@expo/vector-icons';

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
  const [items, setItems] = useState<ChatItem[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  const data = useMemo(() => items, [items]);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const history = await api.getAIHistory();
      if (history && history.length > 0) {
        setItems(history.map((h: any) => ({
          id: h._id || h.id,
          role: h.role,
          text: h.content,
          createdAt: h.createdAt
        })).reverse()); // Reverse because list is inverted
      } else {
        setItems([{ id: 'welcome', role: 'ai', text: 'Hi, I’m JANEAI. Ask me anything.' }]);
      }
    } catch (error) {
      console.error('Failed to load AI history', error);
      setItems([{ id: 'welcome', role: 'ai', text: 'Hi, I’m JANEAI. Ask me anything.' }]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const sendMessage = async (message: string) => {
    if (!message.trim() || sending) return;

    const userItem: ChatItem = { id: `u_${Date.now()}`, role: 'user', text: message.trim() };
    setItems((prev) => [userItem, ...prev]);

    try {
      setSending(true);
      // Send full context if needed, but currently API might only take prompt.
      // Ideally, backend should handle context management or we send 'messages' array.
      // Assuming api.aiChat is updated or we just send prompt and backend stores it.
      
      const result = await api.aiChat(message.trim());
      const replyText = result?.reply || 'Okay.';
      const aiItem: ChatItem = { id: `a_${Date.now()}`, role: 'ai', text: replyText };
      setItems((prev) => [aiItem, ...prev]);
      
      if (ttsEnabled) {
        Speech.stop();
        Speech.speak(replyText, { rate: 1.0 });
      }
    } catch (error: any) {
      const aiItem: ChatItem = { id: `a_${Date.now()}`, role: 'ai', text: error.message || 'Failed to reply.' };
      setItems((prev) => [aiItem, ...prev]);
    } finally {
      setSending(false);
    }
  };

  const send = async () => {
    const message = text.trim();
    if (!message || sending) return;
    setText('');
    await sendMessage(message);
  };

  const startRecording = async () => {
    if (sending || isRecording) return;
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      setIsRecording(true);
    } catch (error) {
      setRecording(null);
      setIsRecording(false);
    }
  };

  const stopRecordingAndSend = async () => {
    if (!recording) return;
    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (!uri) return;

      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const token = await currentUser.getIdToken();
      const form = new FormData();
      form.append(
        'audio',
        {
          uri,
          name: 'audio.m4a',
          type: 'audio/mp4',
        } as any
      );

      setSending(true);
      const response = await fetch(`${appConfig.API_BASE_URL}/api/ai/transcribe`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      const data = (await response.json()) as any;
      if (!response.ok || !data?.success) {
        setSending(false);
        return;
      }

      const transcript = String(data.text || '').trim();
      setSending(false);
      if (transcript) {
        await sendMessage(transcript);
      }
    } catch (error) {
      setRecording(null);
      setIsRecording(false);
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
      <AppHeader title="JANEAI" />

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
          placeholder="Ask JANEAI…"
          placeholderTextColor={colors.mutedText}
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity
          style={[styles.iconBtn, { borderColor: colors.border }]}
          onPress={() => setTtsEnabled((v) => !v)}
          disabled={sending}
        >
          <Ionicons
            name={ttsEnabled ? 'volume-high-outline' : 'volume-mute-outline'}
            size={18}
            color={ttsEnabled ? colors.primary : colors.mutedText}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.iconBtn, { borderColor: colors.border }]}
          onPress={isRecording ? stopRecordingAndSend : startRecording}
          disabled={sending}
        >
          <Ionicons
            name={isRecording ? 'stop-circle-outline' : 'mic-outline'}
            size={18}
            color={isRecording ? colors.danger : colors.text}
          />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.primary }]} onPress={send} disabled={sending || isRecording}>
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
  iconBtn: {
    marginLeft: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
    fontWeight: '700',
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
