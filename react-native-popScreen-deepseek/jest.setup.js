// React Native expects __DEV__ and other globals in test environments.
// Without a preset, we define them here as setupFiles runs before all other code.
global.__DEV__ = true;
