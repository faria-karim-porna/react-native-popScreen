import React from 'react';
import { usePopScreen } from './src/usePopScreen';
import CounterOverlayContent from './demos/CounterOverlayContent';
import InputSubmitOverlayContent from './demos/InputSubmitOverlayContent';
import TodoOverlayContent from './demos/TodoOverlayContent';

export default function OverlaySwitcher() {
  const [activeDemo] = usePopScreen<string>('activeDemo', 'counter');

  if (activeDemo === 'inputSubmit') {
    return <InputSubmitOverlayContent />;
  }
  if (activeDemo === 'todo') {
    return <TodoOverlayContent />;
  }
  return <CounterOverlayContent />;
}
