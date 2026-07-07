import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePopScreen } from '../src/usePopScreen';

export default function CounterMainAppPanel() {
  const [count] = usePopScreen('count', 0);

  return (
    <View style={styles.panel}>
      <Text style={styles.label}>Main app sees count as:</Text>
      <Text style={styles.value}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { alignItems: 'center', padding: 10, backgroundColor: '#1e293b', borderRadius: 10 },
  label: { color: '#94a3b8', fontSize: 12 },
  value: { color: 'white', fontSize: 24, fontWeight: '700' },
});
