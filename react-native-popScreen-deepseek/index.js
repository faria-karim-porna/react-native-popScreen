import { registerRootComponent } from 'expo';
import App from './App';
import OverlaySwitcher from './OverlaySwitcher';
import { registerOverlaySurface } from './src/registerOverlaySurface';

registerRootComponent(App);

registerOverlaySurface(OverlaySwitcher);
