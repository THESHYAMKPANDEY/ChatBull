import React, { useMemo, useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Image, Linking } from 'react-native';

type StoryAuthor = {
  _id: string;
  displayName: string;
  photoURL?: string;
};

export type Story = {
  _id: string;
  author: StoryAuthor;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  createdAt: string;
};

type StoryViewerProps = {
  visible: boolean;
  stories: Story[];
  initialStoryId: string;
  onClose: () => void;
};

export default function StoryViewer({ visible, stories, initialStoryId, onClose }: StoryViewerProps) {
  const initialIndex = useMemo(() => {
    const idx = stories.findIndex((s) => s._id === initialStoryId);
    return idx >= 0 ? idx : 0;
  }, [stories, initialStoryId]);

  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (visible) setIndex(initialIndex);
  }, [visible, initialIndex]);

  const story = stories[index];

  if (!story) return null;

  const authorName = story.author?.displayName || 'User';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.header}>
          <Text style={styles.headerText}>{authorName}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {story.mediaType === 'image' ? (
            <Image source={{ uri: story.mediaUrl }} style={styles.image} resizeMode="contain" />
          ) : (
            <TouchableOpacity style={styles.videoCard} onPress={() => Linking.openURL(story.mediaUrl)}>
              <Text style={styles.videoTitle}>Video Story</Text>
              <Text style={styles.videoOpen}>Open</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            onPress={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
          >
            <Text style={[styles.navText, index === 0 && styles.navDisabled]}>Prev</Text>
          </TouchableOpacity>
          <Text style={styles.counterText}>
            {index + 1}/{stories.length}
          </Text>
          <TouchableOpacity
            onPress={() => setIndex((i) => Math.min(stories.length - 1, i + 1))}
            disabled={index === stories.length - 1}
          >
            <Text style={[styles.navText, index === stories.length - 1 && styles.navDisabled]}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeText: {
    color: '#fff',
    fontSize: 18,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  videoCard: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#111',
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  videoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  videoOpen: {
    color: '#0095f6',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  navText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  navDisabled: {
    color: '#666',
  },
  counterText: {
    color: '#bbb',
    fontSize: 13,
  },
});

