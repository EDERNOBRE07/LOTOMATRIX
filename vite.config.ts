import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    base: '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    build: {
      outDir: path.resolve(import.meta.dirname, 'dist'),
      chunkSizeWarningLimit: 1600,
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: path.resolve(import.meta.dirname, 'index.html'),
        },
        onwarn(warning, warn) {
          // Suppress non-critical entry resolution warnings
          if (warning.code === 'EMPTY_BUNDLE' || warning.code === 'CIRCULAR_DEPENDENCY') return;
          warn(warning);
        },
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      strictPort: true,
      // Explicitly disable HMR WebSocket server in AI Studio environment to prevent port 24678 conflicts
      hmr: false,
      // File watch configuration: ignore heavy and build directories to avoid CPU spikes during edits
      watch: process.env.DISABLE_HMR === 'true'
        ? null
        : {
            usePolling: false,
            ignored: [
              '**/node_modules/**',
              '**/dist/**',
              '**/.git/**',
              '**/backups_mysql/**',
              '**/*.json',
            ],
          },
    },
  };
});
