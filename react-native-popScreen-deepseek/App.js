import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Button, StyleSheet, NativeModules, NativeEventEmitter } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { usePopScreen } from './src/usePopScreen';
import CounterMainAppPanel from './demos/CounterMainAppPanel';

const { PopScreen } = NativeModules;
const eventEmitter = PopScreen ? new NativeEventEmitter(PopScreen) : null;

export default function App() {
  const [hasPermission, setHasPermission] = useState(false);
  const [hasBattery, setHasBattery] = useState(null);
  const [overlayRunning, setOverlayRunning] = useState(false);
  const [archInfo, setArchInfo] = useState('checking...');
  const [activeDemo, setActiveDemo] = usePopScreen('activeDemo', 'counter');
  const [windowState, setWindowState] = useState('idle');
  const [permEvent, setPermEvent] = useState('none');

  const checkPermission = useCallback(() => {
    PopScreen?.hasOverlayPermission().then(setHasPermission);
    PopScreen?.hasBatteryOptimizationExemption().then(setHasBattery);
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

    const windowSub = eventEmitter?.addListener('onWindowStateChange', (e) =>
      setWindowState(`${e.state}${e.reason ? ` (${e.reason})` : ''}`)
    );
    const permSub = eventEmitter?.addListener('onPermissionResult', (e) => {
      setPermEvent(`granted=${e.granted}${e.reason ? ` reason=${e.reason}` : ''}`);
      setHasPermission(e.granted);
    });

    return () => {
      windowSub?.remove();
      permSub?.remove();
    };
  }, [checkPermission]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PopScreen — Milestone 6 Verification</Text>
      <StatusBar style="auto" />

      <View style={styles.infoRow}>
        <Text style={styles.label}>Permission: </Text>
        <Text style={hasPermission ? styles.granted : styles.denied}>{String(hasPermission)}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Battery exemption: </Text>
        <Text style={styles.archText}>{String(hasBattery)}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Window state: </Text>
        <Text style={styles.archText}>{windowState}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Permission event: </Text>
        <Text style={styles.eventText} numberOfLines={1}>{permEvent}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Architecture: </Text>
        <Text style={styles.archText}>{archInfo}</Text>
      </View>

      <Text style={styles.sectionTitle}>Demos</Text>
      <View style={styles.demoSwitch}>
        <Button title="Counter" onPress={() => setActiveDemo('counter')} />
        <Button title="Input Submit" onPress={() => setActiveDemo('inputSubmit')} />
      </View>

      {activeDemo === 'counter' && <CounterMainAppPanel />}

      <View style={styles.buttonGroup}>
        <Button title="Request Overlay Permission" onPress={() => PopScreen?.requestOverlayPermission()} />
        <View style={styles.spacer} />
        <Button title="Request Battery Exemption" onPress={() => PopScreen?.requestBatteryOptimizationExemption()} />
        <View style={styles.spacer} />
        <Button title="Re-check Permission" onPress={checkPermission} />
        <View style={styles.spacer} />
        <Button
          title="Show Overlay"
          disabled={!hasPermission}
          onPress={() => { setOverlayRunning(true); PopScreen?.show(); }}
        />
        <View style={styles.spacer} />
        <Button
          title="Hide Overlay"
          disabled={!overlayRunning}
          onPress={() => { setOverlayRunning(false); PopScreen?.hide(); }}
        />
        <View style={styles.spacer} />
        <Button
          title="Destroy Overlay"
          disabled={!overlayRunning}
          onPress={() => { setOverlayRunning(false); PopScreen?.destroy(); }}
        />
      </View>

      <Text style={styles.hint}>
        Revoke permission mid-session to test detection. Try Destroy vs Hide.
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
  title: { fontSize: 14, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' },
  label: { fontSize: 13, color: '#374151' },
  archText: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  eventText: { fontSize: 12, color: '#7c3aed', fontWeight: '500', maxWidth: 200 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 8, marginBottom: 4 },
  demoSwitch: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  granted: { color: '#16a34a', fontWeight: 'bold' },
  denied: { color: '#dc2626', fontWeight: 'bold' },
  buttonGroup: { marginTop: 8, width: '100%', maxWidth: 280 },
  spacer: { height: 6 },
  hint: { marginTop: 12, fontSize: 12, color: '#6b7280', textAlign: 'center' },
});
