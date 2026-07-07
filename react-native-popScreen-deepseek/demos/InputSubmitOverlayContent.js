import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from 'react-native';
import PopScreenContent from '../src/PopScreenContent';

/**
 * Input Submit Overlay Demo
 *
 * WHAT THIS DEMO PROVES: Local state in the overlay.
 *
 * Unlike the Counter demo, this uses plain `useState` — no
 * `usePopScreen()` at all. It proves that ordinary React state
 * (form drafts, submission history) works inside the overlay
 * exactly as it does on any other screen, and does NOT leak into
 * the shared store or the host app's component tree.
 *
 * This is the recommended pattern for state that only matters
 * inside the floating bubble (form drafts, scroll position, etc.).
 * Reserve `usePopScreen()` for state that genuinely needs to be
 * visible in both surfaces.
 *
 * It also proves that TextInput with IME (soft keyboard) works
 * inside a `FLAG_NOT_FOCUSABLE` overlay — the library temporarily
 * clears the flag when the input receives focus, and restores it
 * on blur.
 */
export default function InputSubmitOverlayContent() {
  const [draft, setDraft] = useState('');
  const [submissions, setSubmissions] = useState([]);

  const handleSubmit = () => {
    const trimmed = draft.trim();
    if (trimmed.length === 0) return;
    setSubmissions((prev) => [trimmed, ...prev]);
    setDraft('');
  };

  return (
    <PopScreenContent>
      <View style={styles.container}>
        <View style={styles.dragHandle}>
          <Text style={styles.dragHandleText}>≡ Input Submit</Text>
        </View>
        <View style={styles.content}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Type something…"
              placeholderTextColor="#666"
              onSubmitEditing={handleSubmit}
              returnKeyType="done"
            />
            <Pressable style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Submit</Text>
            </Pressable>
          </View>

          <FlatList
            style={styles.list}
            data={submissions}
            keyExtractor={(item, index) => `${index}-${item}`}
            renderItem={({ item }) => (
              <Text style={styles.listItem}>• {item}</Text>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No submissions yet</Text>}
          />
        </View>
      </View>
    </PopScreenContent>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(30,30,45,0.95)', borderRadius: 20, overflow: 'hidden' },
  dragHandle: { height: 32, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  dragHandleText: { color: '#888', fontSize: 11 },
  content: { flex: 1, padding: 10, gap: 8 },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: 'white',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  submitButton: { backgroundColor: '#60a5fa', borderRadius: 8, paddingHorizontal: 12, justifyContent: 'center' },
  submitButtonText: { color: '#0a1a2e', fontWeight: '700' },
  list: { flex: 1, marginTop: 4 },
  listItem: { color: '#cbd5e1', fontSize: 13, paddingVertical: 3 },
  emptyText: { color: '#666', fontSize: 12, fontStyle: 'italic' },
});
