import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * OverlayRoot — rendered inside the system overlay window.
 *
 * The whole point of this component: it updates itself on a timer,
 * entirely from JS, with NO native call telling Kotlin to "refresh."
 * If the overlay window visibly ticks once a second, the core
 * hypothesis is confirmed — RN re-renders flow into the overlay
 * window automatically once the surface is mounted.
 */
export default function OverlayRoot() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>PopScreen Spike</Text>
      <Text style={styles.tick}>Tick: {tick}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(20,20,30,0.92)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tick: {
    color: '#4ade80',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 8,
  },
});
