import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import PopScreenContent from '../src/PopScreenContent';
import { usePopScreen } from '../src/usePopScreen';

export default function CounterOverlayContent() {
  const [count, setCount] = usePopScreen('count', 0);

  return (
    <PopScreenContent>
      <View style={styles.container}>
        <View style={styles.dragHandle}>
          <Text style={styles.dragHandleText}>≡ Counter</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.countText}>{count}</Text>
          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.button, styles.decrementButton]}
              onPress={() => setCount((c) => c - 1)}
            >
              <Text style={styles.buttonText}>−</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.incrementButton]}
              onPress={() => setCount((c) => c + 1)}
            >
              <Text style={styles.buttonText}>+</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </PopScreenContent>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(30,30,45,0.95)', borderRadius: 20, overflow: 'hidden' },
  dragHandle: { height: 32, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  dragHandleText: { color: '#888', fontSize: 11 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
  countText: { color: 'white', fontSize: 40, fontWeight: '700' },
  buttonRow: { flexDirection: 'row', gap: 16 },
  button: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  decrementButton: { backgroundColor: '#f87171' },
  incrementButton: { backgroundColor: '#4ade80' },
  buttonText: { color: 'white', fontSize: 24, fontWeight: '700' },
});
