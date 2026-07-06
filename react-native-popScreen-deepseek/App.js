import React from 'react';
import { View, Text, Button, StyleSheet, NativeModules } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const { OverlaySpikeModule } = NativeModules;

export default function App() {
  const [hasPermission, setHasPermission] = React.useState(false);
  const [overlayRunning, setOverlayRunning] = React.useState(false);

  React.useEffect(() => {
    OverlaySpikeModule.hasOverlayPermission().then(setHasPermission);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PopScreen Spike — Host App</Text>
      <StatusBar style="auto" />

      <View style={styles.infoRow}>
        <Text>Overlay permission: </Text>
        <Text style={hasPermission ? styles.granted : styles.denied}>
          {String(hasPermission)}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Text>Overlay running: </Text>
        <Text style={overlayRunning ? styles.granted : styles.denied}>
          {String(overlayRunning)}
        </Text>
      </View>

      <View style={styles.buttonGroup}>
        <Button
          title="Request Overlay Permission"
          onPress={() => OverlaySpikeModule.requestOverlayPermission()}
        />
        <View style={styles.spacer} />
        <Button
          title="Start Overlay"
          disabled={!hasPermission}
          onPress={() => {
            setOverlayRunning(true);
            OverlaySpikeModule.startOverlay();
          }}
        />
        <View style={styles.spacer} />
        <Button
          title="Stop Overlay"
          disabled={!overlayRunning}
          onPress={() => {
            setOverlayRunning(false);
            OverlaySpikeModule.stopOverlay();
          }}
        />
      </View>

      <Text style={styles.hint}>
        Press Start, then go to home screen. Look for the floating overlay!
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
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
