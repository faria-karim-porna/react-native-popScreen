import React from 'react';
import { usePopScreen } from './src/usePopScreen';
import CounterOverlayContent from './demos/CounterOverlayContent';
import InputSubmitOverlayContent from './demos/InputSubmitOverlayContent';
import TodoOverlayContent from './demos/TodoOverlayContent';
import { OverlayShape } from './src/PopScreen.types';

export default function OverlaySwitcher() {
  const [activeDemo] = usePopScreen<string>('activeDemo', 'counter');
  const [shape] = usePopScreen<OverlayShape>('overlayShape', 'rounded');
  const [borderRadius] = usePopScreen<number | undefined>('overlayRadius', undefined);
  const [width] = usePopScreen<number | undefined>('overlayWidth', undefined);
  const [height] = usePopScreen<number | undefined>('overlayHeight', undefined);

  if (activeDemo === 'inputSubmit') {
    return <InputSubmitOverlayContent shape={shape} borderRadius={borderRadius} width={width} height={height} />;
  }
  if (activeDemo === 'todo') {
    return <TodoOverlayContent shape={shape} borderRadius={borderRadius} width={width} height={height} />;
  }
  return <CounterOverlayContent shape={shape} borderRadius={borderRadius} width={width} height={height} />;
}
