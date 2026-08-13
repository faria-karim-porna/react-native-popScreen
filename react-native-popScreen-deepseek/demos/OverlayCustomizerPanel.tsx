import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { usePopScreen } from '../src/usePopScreen';
import { OverlayShape } from '../src/PopScreen.types';

const SHAPES: OverlayShape[] = ['rounded', 'circle', 'square', 'pill', 'rectangle'];

const RADIUS_OPTIONS = [
  { label: 'Default', value: undefined },
  { label: '0dp', value: 0 },
  { label: '12dp', value: 12 },
  { label: '24dp', value: 24 },
  { label: '40dp', value: 40 },
];

const SIZE_OPTIONS = [
  { label: 'Default', width: undefined, height: undefined },
  { label: '220×220', width: 220, height: 220 },
  { label: '300×400', width: 300, height: 400 },
  { label: '360×240', width: 360, height: 240 },
];

export default function OverlayCustomizerPanel() {
  const [shape, setShape] = usePopScreen<OverlayShape>('overlayShape', 'rounded');
  const [radius, setRadius] = usePopScreen<number | undefined>('overlayRadius', undefined);
  const [width, setWidth] = usePopScreen<number | undefined>('overlayWidth', undefined);
  const [height, setHeight] = usePopScreen<number | undefined>('overlayHeight', undefined);

  const applySize = (w?: number, h?: number) => {
    setWidth(w);
    setHeight(h);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Overlay Shape & Customization</Text>

      {/* Shape Selector */}
      <Text style={styles.subtitle}>Shape:</Text>
      <View style={styles.buttonRow}>
        {SHAPES.map((s) => (
          <Pressable
            key={s}
            style={[styles.chip, shape === s && styles.chipActive]}
            onPress={() => setShape(s)}
          >
            <Text style={[styles.chipText, shape === s && styles.chipTextActive]}>
              {s}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Corner Radius Selector */}
      <Text style={styles.subtitle}>Corner Radius:</Text>
      <View style={styles.buttonRow}>
        {RADIUS_OPTIONS.map((opt) => (
          <Pressable
            key={opt.label}
            style={[styles.chip, radius === opt.value && styles.chipActive]}
            onPress={() => setRadius(opt.value)}
          >
            <Text style={[styles.chipText, radius === opt.value && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Window Size Selector */}
      <Text style={styles.subtitle}>Dimensions (W×H):</Text>
      <View style={styles.buttonRow}>
        {SIZE_OPTIONS.map((opt) => {
          const isSelected = width === opt.width && height === opt.height;
          return (
            <Pressable
              key={opt.label}
              style={[styles.chip, isSelected && styles.chipActive]}
              onPress={() => applySize(opt.width, opt.height)}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    width: '100%',
    maxWidth: 360,
  },
  title: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  subtitle: { fontSize: 12, fontWeight: '600', color: '#475569', marginTop: 6, marginBottom: 4 },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#3b82f6',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: '#ffffff',
  },
});
