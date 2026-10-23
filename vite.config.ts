import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' makes the built game work from any web address,
// including GitHub Pages (yourname.github.io/pocketvale/).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173 },
});
