import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const configured = loadEnv(mode, process.cwd(), 'VITE_');
  if (mode === 'production') {
    const missing = ['VITE_API_URL', 'VITE_SOCKET_URL'].filter(
      (key) => !(process.env[key] || configured[key]),
    );
    if (missing.length) {
      throw new Error(`Missing frontend production environment variables: ${missing.join(', ')}`);
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
    },
  };
});
