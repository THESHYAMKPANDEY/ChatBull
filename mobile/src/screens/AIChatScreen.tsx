import React, { useMemo, useState, useEffect } from 'react';
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
import { t } from '../i18n';

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
  showTabBar?: boolean;
};

export default function AIChatScreen({ onChats, onFeed, onPrivate, onProfile, showTabBar = true }: AIChatScreenProps) {
  const { colors } = useTheme();
  const [items, setItems] = useState<ChatItem[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

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
      
      const result = await api.aiChat(message.trim());
      const replyText = result?.reply || 'Okay.';
      const aiItem: ChatItem = { id: `a_${Date.now()}`, role: 'ai', text: replyText };
      setItems((prev) => [aiItem, ...prev]);
      
      if (ttsEnabled || voiceMode) {
        setIsSpeaking(true);
        Speech.stop();
        Speech.speak(replyText, { 
          rate: 0.9, 
          pitch: 1.1,
          onDone: () => setIsSpeaking(false),
          onStopped: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false)
        });
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
    if (sending || recording) return;
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
    } catch (error) {
      setRecording(null);
    }
  };

  const stopRecordingAndSend = async () => {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (!uri) return;

      const currentUser = auth.currentUser;
      if (!currentUser) return;

      setSending(true);
      const token = await currentUser.getIdToken();
      const form = new FormData();

      // On web, we need to handle Blob properly if URI is a blob URL
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        form.append('audio', blob, 'audio.webm');
      } else {
        form.append('audio', {
          uri,
          name: 'audio.m4a',
          type: 'audio/mp4',
        } as any);
      }

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
      <AppHeader 
        title={t('aiTitle')} 
        rightIcon={null} // Voice mode disabled for production
        onRightPress={() => {}}
      />

      {voiceMode ? (
        <View style={[styles.voiceContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.orbContainer, isSpeaking && styles.orbSpeaking, !!recording && styles.orbListening]}>
             <View style={[styles.orb, { backgroundColor: !!recording ? colors.danger : isSpeaking ? colors.primary : colors.card }]}>
                <Ionicons 
                  name={isSpeaking ? "volume-high" : !!recording ? "mic" : "mic-outline"} 
                  size={64} 
                  color="#fff" 
                />
             </View>
          </View>
          
          <Text style={[styles.voiceStatus, { color: colors.text }]}>
            {isSpeaking ? t('speaking') : !!recording ? t('listening') : t('tapToTalk')}
          </Text>

          <TouchableOpacity 
             style={[styles.voiceButton, { backgroundColor: !!recording ? colors.danger : colors.primary }]}
             onPress={!!recording ? stopRecordingAndSend : startRecording}
             disabled={isSpeaking || sending}
             accessibilityLabel={t('aiTitle')}
          >
             <Ionicons name={!!recording ? "stop" : "mic"} size={32} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <>
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
              placeholder={t('askJaneAiPlaceholder')}
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
    
            {/* Voice recording disabled for production */}
            {/* <TouchableOpacity
              style={[styles.iconBtn, { borderColor: colors.border }]}
              onPress={!!recording ? stopRecordingAndSend : startRecording}
              disabled={sending}
            >
              <Ionicons
                name={!!recording ? 'stop-circle-outline' : 'mic-outline'}
                size={18}
                color={!!recording ? colors.danger : colors.text}
              />
            </TouchableOpacity> */}
    
            <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.primary }]} onPress={send} disabled={sending || !!recording}>
              {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>{t('send')}</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}

      {showTabBar && (
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
      )}
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
  voiceContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  orbContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
    marginBottom: 40,
  },
  orb: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  orbSpeaking: {
    transform: [{ scale: 1.1 }],
    opacity: 0.9,
  },
  orbListening: {
    transform: [{ scale: 1.05 }],
  },
  voiceStatus: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 40,
  },
  voiceButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
});
