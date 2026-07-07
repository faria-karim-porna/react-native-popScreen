import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import PopScreenContent from './src/PopScreenContent';

export default function OverlayDemo() {
  const [tapCount, setTapCount] = useState(0);

  return (
    <PopScreenContent>
      <View style={styles.container}>
        {/* 
          This top strip visually represents the drag-handle region.
          Height matches DRAG_HANDLE_HEIGHT_DP (32) from the Kotlin side.
        */}
        <View style={styles.dragHandle}>
          <Text style={styles.dragHandleText}>≡ drag here</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.text}>Tap the button below:</Text>
          <Pressable
            style={styles.button}
            onPress={() => setTapCount((c) => c + 1)}
          >
            <Text style={styles.buttonText}>Tapped {tapCount} times</Text>
          </Pressable>
        </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  text: { color: 'white', fontSize: 14, marginBottom: 10 },
  button: {
    backgroundColor: '#4ade80',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buttonText: { color: '#0a2e1a', fontWeight: '700' },
});
