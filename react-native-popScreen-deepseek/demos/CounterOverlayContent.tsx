import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import PopScreenContent from '../src/PopScreenContent';
import { usePopScreen } from '../src/usePopScreen';

/**
 * Counter Overlay Demo
 *
 * WHAT THIS DEMO PROVES: Cross-surface state sync.
 *
 * The `count` value is stored in the shared module-scoped store via
 * `usePopScreen('count', 0)`. The same key is read by CounterMainAppPanel
 * (in the host app's component tree). When you press + or − here, the
 * host app's panel updates instantly — no Context, no events, no bridge
 * overhead. Both surfaces read/write the exact same in-memory value
 * because they share the same JS process.
 *
 * Counter overlay is intentionally headerless — the native drag-handle
 * region (top 32dp by default) is kept so the entire top strip can be
 * used to drag the window. Set `dragMode="body"` to drag from anywhere.
 */
import { OverlayShape, DragMode } from '../src/PopScreen.types';

export interface OverlayDemoProps {
  shape?: OverlayShape;
  borderRadius?: number;
  width?: number;
  height?: number;
  dragMode?: DragMode;
}

export default function CounterOverlayContent({ shape, borderRadius, width, height, dragMode }: OverlayDemoProps = {}) {
  const [count, setCount] = usePopScreen<number>('count', 0);

  return (
    <PopScreenContent
      shape={shape}
      borderRadius={borderRadius}
      width={width}
      height={height}
      dragMode={dragMode}
      contentContainerStyle={styles.scrollContent}
    >
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
    </PopScreenContent>
  );
}

const styles = StyleSheet.create({
  // The background + centering live on the ScrollView content container so
  // the content stays naturally sized: when the overlay is smaller than the
  // content it grows and the body scrolls (both axes) instead of being cut,
  // and when there is room it centers and fills the window.
  scrollContent: { flexGrow: 1, justifyContent: 'center', backgroundColor: 'rgba(30,30,45,0.95)' },
  content: { alignItems: 'center', padding: 12, gap: 12 },
  countText: { color: 'white', fontSize: 36, fontWeight: '700' },
  buttonRow: { flexDirection: 'row', gap: 16, alignItems: 'center', justifyContent: 'center' },
  button: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  decrementButton: { backgroundColor: '#f87171' },
  incrementButton: { backgroundColor: '#4ade80' },
  buttonText: { color: 'white', fontSize: 24, fontWeight: '700' },
});
