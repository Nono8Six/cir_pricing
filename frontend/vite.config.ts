import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '..'));
  // Force a different port to avoid conflict
  const port = Number(process.env.PORT || env.VITE_DEV_PORT || 5176);
  const previewPort = Number(process.env.PREVIEW_PORT || env.VITE_PREVIEW_PORT || 4173);
  const disableHmr = (process.env.VITE_DISABLE_HMR || env.VITE_DISABLE_HMR) === '1';

  return {
    plugins: [react()],
    envDir: path.resolve(__dirname, '..'),
    server: {
      port,
      host: true,
      hmr: disableHmr ? false : undefined,
    },
    preview: {
      port: previewPort,
      host: true,
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
