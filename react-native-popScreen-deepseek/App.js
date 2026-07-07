import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Button, StyleSheet, NativeModules } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const { PopScreen } = NativeModules;

export default function App() {
  const [hasPermission, setHasPermission] = useState(false);
  const [overlayRunning, setOverlayRunning] = useState(false);
  const [archInfo, setArchInfo] = useState('checking...');

  const checkPermission = useCallback(() => {
    PopScreen?.hasOverlayPermission().then(setHasPermission);
  }, []);

  useEffect(() => {
    checkPermission();
    PopScreen?.getReactArchitectureInfo().then((info) => {
      setArchInfo(
        `${info.architecture}${info.isNewArchitecture ? ' (New Arch)' : ' (Old Arch)'}`
      );
    }).catch(() => {
      setArchInfo('UNKNOWN (detection failed)');
    });
  }, [checkPermission]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PopScreen — Milestone 2 Verification</Text>
      <StatusBar style="auto" />

      <View style={styles.infoRow}>
        <Text style={styles.label}>Overlay permission: </Text>
        <Text style={hasPermission ? styles.granted : styles.denied}>
          {String(hasPermission)}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Architecture: </Text>
        <Text style={styles.archText}>{archInfo}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Overlay running: </Text>
        <Text style={overlayRunning ? styles.granted : styles.denied}>
          {String(overlayRunning)}
        </Text>
      </View>

      <View style={styles.buttonGroup}>
        <Button
          title="Request Overlay Permission"
          onPress={() => PopScreen?.requestOverlayPermission()}
        />
        <View style={styles.spacer} />
        <Button
          title="Re-check Permission"
          onPress={checkPermission}
        />
        <View style={styles.spacer} />
        <Button
          title="Show Overlay"
          disabled={!hasPermission}
          onPress={() => {
            setOverlayRunning(true);
            PopScreen?.show();
          }}
        />
        <View style={styles.spacer} />
        <Button
          title="Hide Overlay"
          disabled={!overlayRunning}
          onPress={() => {
            setOverlayRunning(false);
            PopScreen?.hide();
          }}
        />
      </View>

      <Text style={styles.hint}>
        Press Show, then go to home screen. Look for the floating overlay!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    color: '#374151',
  },
  archText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  granted: {
    color: '#16a34a',
    fontWeight: 'bold',
  },
  denied: {
    color: '#dc2626',
    fontWeight: 'bold',
  },
  buttonGroup: {
    marginTop: 16,
    width: '100%',
    maxWidth: 280,
  },
  spacer: {
    height: 8,
  },
  hint: {
    marginTop: 24,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});
