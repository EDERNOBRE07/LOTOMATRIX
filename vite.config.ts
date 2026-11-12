import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import net from 'net';
import { defineConfig } from 'vite';

/**
 * Verifica se a porta informada está disponível no host indicado
 */
function checkPortAvailable(port: number, host: string = '0.0.0.0'): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err: any) => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

export default defineConfig(async () => {
  const host = '0.0.0.0';

  // Verificação de disponibilidade da porta 3000 com fallback automático para 3001
  const isPort3000Free = await checkPortAvailable(3000, host);
  let targetPort = 3000;

  if (isPort3000Free) {
    console.log('[Vite Server Diagnóstico] Porta principal 3000 verificada e disponível com sucesso (host: 0.0.0.0, strictPort: true).');
  } else {
    targetPort = 3001;
    console.warn(
      '[Vite Server Diagnóstico] Aviso: Porta 3000 já está em uso! Alternando automaticamente para a porta 3001 para diagnóstico do desenvolvedor.'
    );
  }

  // Ativa usePolling explicitamente apenas em ambientes de desenvolvimento específicos do AI Studio
  const isAIStudioDev = Boolean(
    process.env.AI_STUDIO ||
    process.env.AISTUDIO ||
    process.env.CLOUD_WORKSTATIONS ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.AI_STUDIO_DEV === 'true' ||
    (process.env.NODE_ENV !== 'production' && Boolean(process.env.PORT))
  );

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
        onwarn(warning: any, warn: any) {
          if (warning.code === 'EMPTY_BUNDLE' || warning.code === 'CIRCULAR_DEPENDENCY') return;
          warn(warning);
        },
      },
    },
    server: {
      port: targetPort,
      host: '0.0.0.0',
      strictPort: true,
      // Força o modo de servidor para ignorar HMR e prevenir conflitos de socket
      hmr: false,
      watch: {
        usePolling: isAIStudioDev,
        interval: isAIStudioDev ? 1000 : undefined,
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

