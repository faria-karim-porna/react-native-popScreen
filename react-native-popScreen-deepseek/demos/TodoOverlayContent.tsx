import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from 'react-native';
import PopScreenContent from '../src/PopScreenContent';
import PopScreenHeader from '../src/PopScreenHeader';
import { usePopScreen } from '../src/usePopScreen';
import { OverlayDemoProps } from './CounterOverlayContent';

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

/**
 * Stable module-scope default. useExternalStore relies on
 * useSyncExternalStore, whose getSnapshot must return a cached
 * reference — an inline `[]` literal would be a NEW array on every
 * render and cause an infinite re-render loop.
 */
const DEFAULT_TODOS: TodoItem[] = [];

/**
 * Todo List Overlay Demo
 *
 * WHAT THIS DEMO PROVES: Shared ARRAY state across surfaces.
 *
 * The `todos` array lives in the shared module-scoped store via
 * `usePopScreen<TodoItem[]>('todos', [])`. TodoMainAppPanel (in the
 * host app's component tree) reads the SAME key, so every add, toggle
 * and delete you do here instantly appears in the main app — and vice
 * versa. No Context, no events, no bridge overhead.
 *
 * The two demos complement each other:
 *  - Counter demo        → shared `number` state
 *  - This Todo demo      → shared `array` (objects) state
 *  - Input Submit demo   → purely LOCAL `useState` (does not leak)
 */
export default function TodoOverlayContent({ shape, borderRadius, width, height, dragMode }: OverlayDemoProps = {}) {
  const [todos, setTodos] = usePopScreen<TodoItem[]>('todos', DEFAULT_TODOS);
  const [draft, setDraft] = useState('');

  const addTodo = () => {
    const trimmed = draft.trim();
    if (trimmed.length === 0) return;
    setTodos((prev) => [...prev, { id: `${Date.now()}`, text: trimmed, done: false }]);
    setDraft('');
  };

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo))
    );
  };

  const removeTodo = (id: string) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  const doneCount = todos.filter((todo) => todo.done).length;

  return (
    /**
     * With dragMode="header" (see the customizer panel) the whole header is
     * draggable. The native touch interceptor uses deferred (touch-slop)
     * interception, so taps on the header's Cancel / Back to Main App buttons
     * still land on the buttons while a real drag gesture moves the window —
     * unlike the old intercept-on-down behavior, which required disabling the
     * drag handle entirely (dragHandleHeight={0}).
     */
    <PopScreenContent dragMode={dragMode} shape={shape} borderRadius={borderRadius} width={width} height={height} scrollable={false}>
      <View style={styles.container}>
        {/* Header lives inside the dark container */}
        <PopScreenHeader title="Todo List" />

        <View style={styles.content}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Add a task…"
              placeholderTextColor="#666"
              onSubmitEditing={addTodo}
              returnKeyType="done"
            />
            <Pressable style={styles.addButton} onPress={addTodo}>
              <Text style={styles.addButtonText}>Add</Text>
            </Pressable>
          </View>

          <Text style={styles.progress}>
            {doneCount}/{todos.length} done
          </Text>

          <FlatList
            style={styles.list}
            contentContainerStyle={styles.listContent}
            data={todos}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Pressable style={styles.toggleButton} onPress={() => toggleTodo(item.id)}>
                  <Text style={[styles.checkbox, item.done && styles.checkboxChecked]}>
                    {item.done ? '✓' : '○'}
                  </Text>
                </Pressable>
                <Text
                  style={[styles.rowText, item.done && styles.rowTextDone]}
                  numberOfLines={1}
                >
                  {item.text}
                </Text>
                <Pressable style={styles.deleteButton} onPress={() => removeTodo(item.id)}>
                  <Text style={styles.deleteText}>✕</Text>
                </Pressable>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No tasks yet — add one above</Text>
            }
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </View>
    </PopScreenContent>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(30,30,45,0.95)' },
  content: { flex: 1, padding: 8, gap: 6 },
  inputRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: 'white',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 13,
  },
  addButton: { backgroundColor: '#c084fc', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, justifyContent: 'center' },
  addButtonText: { color: '#1a1030', fontWeight: '700', fontSize: 12 },
  progress: { color: '#94a3b8', fontSize: 11 },
  list: { flex: 1, marginTop: 2 },
  listContent: { paddingBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 4,
  },
  toggleButton: { width: 22, alignItems: 'center' },
  checkbox: { color: '#94a3b8', fontSize: 15 },
  checkboxChecked: { color: '#4ade80' },
  rowText: { flex: 1, color: '#e2e8f0', fontSize: 12 },
  rowTextDone: { textDecorationLine: 'line-through', color: '#64748b' },
  deleteButton: { width: 20, alignItems: 'center' },
  deleteText: { color: '#f87171', fontSize: 12, fontWeight: '700' },
  emptyText: { color: '#666', fontSize: 12, fontStyle: 'italic' },
});
