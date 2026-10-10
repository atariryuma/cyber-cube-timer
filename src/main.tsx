import { render } from 'preact';
import '@fontsource/orbitron/latin-700.css';
import '@fontsource/orbitron/latin-900.css';
import '@fontsource/rajdhani/latin-500.css';
import '@fontsource/rajdhani/latin-700.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import './styles/main.css';
import { App } from './App';
import { init } from './state';

void init();
render(<App />, document.getElementById('app')!);
