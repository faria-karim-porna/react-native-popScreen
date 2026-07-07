import { registerRootComponent } from 'expo';
import App from './App';
import OverlayDemo from './OverlayDemo';
import { registerOverlaySurface } from './src/registerOverlaySurface';

// Normal app registration (unchanged)
registerRootComponent(App);

// Second surface — this is what OverlayService attaches to the
// system overlay window. Name must match OverlayService.SURFACE_NAME.
registerOverlaySurface(OverlayDemo);
