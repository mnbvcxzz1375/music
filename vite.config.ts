import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      host: '127.0.0.1',
      strictPort: true,
      watch: {
        ignored: ['**/src-tauri/**'],
      },
    },
    envPrefix: ['VITE_', 'TAURI_'],
    build: {
      target: ['es2021', 'chrome100', 'safari13'],
      minify: isProduction ? 'esbuild' : false,
      sourcemap: !isProduction,
      cssMinify: isProduction,
      reportCompressedSize: isProduction,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'zustand-vendor': ['zustand'],
            'osmd-vendor': ['opensheetmusicdisplay'],
            'audio': [
              './src/audio/AudioCapture',
              './src/audio/detection/PitchDetector',
              './src/audio/rhythm/OnsetDetector',
            ],
            'services': [
              './src/services/auth/AuthStore',
              './src/services/statistics/StatisticsStore',
              './src/services/piece/PieceStore',
              './src/services/subscription/SubscriptionStore',
            ],
            'components': [
              './src/components/UI',
              './src/components/Theme',
            ],
          },
          chunkFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'react-vendor') {
              return 'assets/vendor/react-[hash].js';
            }
            if (chunkInfo.name === 'zustand-vendor') {
              return 'assets/vendor/zustand-[hash].js';
            }
            if (chunkInfo.name === 'osmd-vendor') {
              return 'assets/vendor/osmd-[hash].js';
            }
            if (chunkInfo.name?.includes('vendor')) {
              return 'assets/vendor/[name]-[hash].js';
            }
            return 'assets/[name]-[hash].js';
          },
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.css')) {
              return 'assets/css/[name]-[hash][extname]';
            }
            if (assetInfo.name?.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
              return 'assets/images/[name]-[hash][extname]';
            }
            if (assetInfo.name?.match(/\.(woff|woff2|eot|ttf|otf)$/)) {
              return 'assets/fonts/[name]-[hash][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
        },
      },
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug'],
        },
        format: {
          comments: false,
        },
      } : undefined,
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'zustand', 'opensheetmusicdisplay'],
      exclude: [],
    },
    preview: {
      port: 4173,
      strictPort: true,
    },
  };
})