import React from 'react';

type PopScreenContentProps = {
  children: React.ReactNode;
};

/**
 * Wraps whatever arbitrary RN content the developer wants shown in the
 * floating overlay. This component itself does nothing clever — its
 * importance is purely structural: it's the component registered as the
 * root of the "PopScreenOverlay" surface, separating the developer's
 * overlay UI from the main app's UI by registration, not by any special
 * native awareness of this component's existence.
 */
export default function PopScreenContent({ children }: PopScreenContentProps) {
  return <>{children}</>;
}
