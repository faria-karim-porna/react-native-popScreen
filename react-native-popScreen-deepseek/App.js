import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Button, StyleSheet, NativeModules, NativeEventEmitter } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const { PopScreen } = NativeModules;
const eventEmitter = PopScreen ? new NativeEventEmitter(PopScreen) : null;

export default function App() {
  const [hasPermission, setHasPermission] = useState(false);
  const [overlayRunning, setOverlayRunning] = useState(false);
  const [archInfo, setArchInfo] = useState('checking...');
  const [lastDragEvent, setLastDragEvent] = useState('none yet');
  const [lastResizeEvent, setLastResizeEvent] = useState('none yet');

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

    const dragSub = eventEmitter?.addListener('onDragUpdate', (e) => {
      setLastDragEvent(JSON.stringify(e));
    });
    const resizeSub = eventEmitter?.addListener('onResizeUpdate', (e) => {
      setLastResizeEvent(JSON.stringify(e));
    });
    return () => {
      dragSub?.remove();
      resizeSub?.remove();
    };
  }, [checkPermission]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PopScreen — Milestone 4 Verification</Text>
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

      <View style={styles.infoRow}>
        <Text style={styles.label}>Last drag event: </Text>
        <Text style={styles.eventText} numberOfLines={1}>{lastDragEvent}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Last resize event: </Text>
        <Text style={styles.eventText} numberOfLines={1}>{lastResizeEvent}</Text>
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
        Resize from the ⤡ corner. Drag from the ≡ strip. Tap Minimize in the overlay.
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
    flexWrap: 'wrap',
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
  eventText: {
    fontSize: 13,
    color: '#7c3aed',
    fontWeight: '500',
    maxWidth: 200,
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
