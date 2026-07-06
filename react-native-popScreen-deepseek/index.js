import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';
import App from './App';
import OverlayRoot from './OverlayRoot';

// Normal app registration (unchanged)
registerRootComponent(App);

// Second surface — this is what the OverlayService attaches to the
// system overlay window. Name must match OverlayService.SURFACE_NAME.
AppRegistry.registerComponent('PopScreenSpikeOverlay', () => OverlayRoot);
