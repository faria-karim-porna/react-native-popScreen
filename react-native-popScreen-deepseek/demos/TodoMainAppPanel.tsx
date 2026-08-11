import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePopScreen } from '../src/usePopScreen';
import type { TodoItem } from './TodoOverlayContent';

/**
 * Stable module-scope default (see TodoOverlayContent for why —
 * useSyncExternalStore snapshots must be referentially stable).
 */
const DEFAULT_TODOS: TodoItem[] = [];

/**
 * Todo Main App Panel — host-app side of the Todo demo.
 *
 * Reads the SAME shared `todos` key as TodoOverlayContent, so the
 * host app stays in sync with the floating overlay in real time
 * (add/toggle/delete from the bubble updates this panel instantly).
 */
export default function TodoMainAppPanel() {
  const [todos] = usePopScreen<TodoItem[]>('todos', DEFAULT_TODOS);
  const doneCount = todos.filter((todo) => todo.done).length;

  return (
    <View style={styles.panel}>
      <Text style={styles.label}>
        Main app sees {doneCount}/{todos.length} tasks done:
      </Text>
      {todos.length === 0 ? (
        <Text style={styles.empty}>No tasks yet</Text>
      ) : (
        todos.slice(0, 4).map((todo) => (
          <Text key={todo.id} style={[styles.item, todo.done && styles.itemDone]}>
            {todo.done ? '✓' : '○'} {todo.text}
          </Text>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { padding: 10, backgroundColor: '#1e293b', borderRadius: 10, minWidth: 220 },
  label: { color: '#94a3b8', fontSize: 12, marginBottom: 4 },
  empty: { color: '#64748b', fontSize: 12, fontStyle: 'italic' },
  item: { color: 'white', fontSize: 13, paddingVertical: 1 },
  itemDone: { textDecorationLine: 'line-through', color: '#64748b' },
});
