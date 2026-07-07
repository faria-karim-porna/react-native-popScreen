import React from 'react';
import { usePopScreen } from './src/usePopScreen';
import CounterOverlayContent from './demos/CounterOverlayContent';
import InputSubmitOverlayContent from './demos/InputSubmitOverlayContent';

export default function OverlaySwitcher() {
  const [activeDemo] = usePopScreen('activeDemo', 'counter');

  if (activeDemo === 'inputSubmit') {
    return <InputSubmitOverlayContent />;
  }
  return <CounterOverlayContent />;
}
