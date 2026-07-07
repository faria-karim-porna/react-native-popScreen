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
  const [showDebug, setShowDebug] = useState(false);

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
    }).catch(() => setArchInfo('UNKNOWN'));

    const windowSub = eventEmitter?.addListener('onWindowStateChange', (e) =>
      setWindowState(`${e.state}${e.reason ? ` (${e.reason})` : ''}`)
    );
    const permSub = eventEmitter?.addListener('onPermissionResult', (e) => {
      setPermEvent(`granted=${e.granted}${e.reason ? ` reason=${e.reason}` : ''}`);
      setHasPermission(e.granted);
    });
    return () => { windowSub?.remove(); permSub?.remove(); };
  }, [checkPermission]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PopScreen Example</Text>
      <StatusBar style="auto" />

      <Text style={styles.sectionTitle}>Demos</Text>
      <View style={styles.demoSwitch}>
        <Button title="Counter Demo" onPress={() => setActiveDemo('counter')} />
        <Button title="Input Submit Demo" onPress={() => setActiveDemo('inputSubmit')} />
      </View>
      <Text style={styles.demoLabel}>Active: {activeDemo}</Text>

      {activeDemo === 'counter' && <CounterMainAppPanel />}

      <View style={styles.buttonGroup}>
        <Button title="Show Overlay" disabled={!hasPermission}
          onPress={() => { setOverlayRunning(true); PopScreen?.show(); }} />
        <View style={styles.spacer} />
        <Button title="Hide Overlay" disabled={!overlayRunning}
          onPress={() => { setOverlayRunning(false); PopScreen?.hide(); }} />
        <View style={styles.spacer} />
        <Button title="Destroy Overlay" disabled={!overlayRunning}
          onPress={() => { setOverlayRunning(false); PopScreen?.destroy(); }} />
      </View>

      <Text style={styles.hint}>
        Tap Show, then go to home screen to see the floating overlay.
      </Text>

      <Button title={showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
        onPress={() => setShowDebug(!showDebug)} />

      {showDebug && (
        <View style={styles.debugPanel}>
          <Text style={styles.debugTitle}>Debug Info</Text>
          <Text style={styles.debugText}>Permission: {String(hasPermission)}</Text>
          <Text style={styles.debugText}>Battery exemption: {String(hasBattery)}</Text>
          <Text style={styles.debugText}>Architecture: {archInfo}</Text>
          <Text style={styles.debugText}>Window state: {windowState}</Text>
          <Text style={styles.debugText}>Perm event: {permEvent}</Text>
          <Button title="Request Permission" onPress={() => PopScreen?.requestOverlayPermission()} />
          <Button title="Request Battery Exemption" onPress={() => PopScreen?.requestBatteryOptimizationExemption()} />
          <Button title="Re-check Permission" onPress={checkPermission} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, textAlign: 'center', color: '#1e293b' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 },
  demoSwitch: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  demoLabel: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  buttonGroup: { marginTop: 8, width: '100%', maxWidth: 260 },
  spacer: { height: 6 },
  hint: { marginTop: 12, fontSize: 12, color: '#6b7280', textAlign: 'center', fontStyle: 'italic' },
  debugPanel: { marginTop: 12, padding: 10, backgroundColor: '#f1f5f9', borderRadius: 8, width: '100%', maxWidth: 300 },
  debugTitle: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 },
  debugText: { fontSize: 11, color: '#64748b', marginBottom: 2 },
});
