# State Sync with PopScreen

PopScreen renders your overlay content as a *second, independent* React
Native surface alongside your main app screen. They share the same JS
engine, but are separate component trees with separate roots — so React
Context providers wrapped around one will not be visible to the other.

## Sharing state between your app and the overlay

Use the `usePopScreen(key, defaultValue)` hook anywhere in either
surface. Both surfaces reading/writing the same key are reading/writing
the exact same underlying value — there is no synchronization delay,
network call, or serialization step involved; it's the same in-memory
store, because both surfaces run in the same JS process.

```tsx
// In your overlay content:
const [count, setCount] = usePopScreen('count', 0);

// In your main app screen:
const [count] = usePopScreen('count', 0);
```

## Keeping state LOCAL to the overlay

If state should only exist inside your floating bubble — form drafts,
scroll position, anything not meaningful to your main app — just use
ordinary `useState`/`useReducer` inside your `<PopScreenContent>` tree,
exactly as you would on any other screen. Don't route everything through
`usePopScreen()` by default; only use it for state that genuinely needs
to be visible from both surfaces.
