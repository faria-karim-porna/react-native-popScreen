import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import PopScreenContent from './src/PopScreenContent';
import { minimize, restore } from './src/minimizeRestore';

const FULL_RECT = { x: 80, y: 250, width: 500, height: 350 };

export default function OverlayDemo() {
  const [tapCount, setTapCount] = useState(0);
  const [minimized, setMinimized] = useState(false);

  const handleMinimize = async () => {
    await minimize(FULL_RECT);
    setMinimized(true);
  };

  const handleRestore = async () => {
    await restore();
    setMinimized(false);
  };

  return (
    <PopScreenContent>
      <View style={styles.container}>
        {/* Drag handle strip at top */}
        <View style={styles.dragHandle}>
          <Text style={styles.dragHandleText}>≡ drag here</Text>
        </View>

        {!minimized && (
          <View style={styles.content}>
            <Text style={styles.text}>Tap the button below:</Text>
            <Pressable style={styles.button} onPress={() => setTapCount((c) => c + 1)}>
              <Text style={styles.buttonText}>Tapped {tapCount} times</Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.minimizeButton]}
              onPress={handleMinimize}
            >
              <Text style={styles.buttonText}>Minimize</Text>
            </Pressable>
          </View>
        )}

        {minimized && (
          <Pressable style={styles.minimizedIcon} onPress={handleRestore}>
            <Text style={styles.minimizedIconText}>🎈</Text>
          </Pressable>
        )}

        {/* Visual resize handle indicator (bottom-right corner) */}
        {!minimized && (
          <View style={styles.resizeHandle}>
            <Text style={styles.resizeHandleText}>⤡</Text>
          </View>
        )}
      </View>
    </PopScreenContent>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(30, 30, 45, 0.95)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  dragHandle: {
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandleText: { color: '#888', fontSize: 11 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, gap: 10 },
  text: { color: 'white', fontSize: 14 },
  button: { backgroundColor: '#4ade80', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  minimizeButton: { backgroundColor: '#60a5fa' },
  buttonText: { color: '#0a2e1a', fontWeight: '700' },
  minimizedIcon: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  minimizedIconText: { fontSize: 28 },
  resizeHandle: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  resizeHandleText: { color: '#888', fontSize: 12 },
});
