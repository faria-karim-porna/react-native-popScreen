import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PopScreenContent from './src/PopScreenContent';

export default function OverlayDemo() {
  return (
    <PopScreenContent>
      <View style={styles.box}>
        <Text style={styles.text}>🎈 Hello from the overlay!</Text>
        <Text style={styles.subtext}>This is arbitrary RN content.</Text>
      </View>
    </PopScreenContent>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: 'rgba(30, 30, 45, 0.95)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  text: { color: 'white', fontSize: 16, fontWeight: '600' },
  subtext: { color: '#a3a3a3', fontSize: 12, marginTop: 6 },
});
