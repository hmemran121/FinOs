import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isProd = mode === 'production';

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'apple-touch-icon.png'],
        manifest: {
          name: 'FinOS - Premium Financial Operating System',
          short_name: 'FinOS',
          description: 'Advanced offline-first financial management application',
          theme_color: '#3b82f6',
          background_color: '#0a0a0a',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // Increase limit to 5MB for SQLite WASM
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 // 24 hours
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || ""),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ""),
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || "")
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      // Optimize bundle size
      target: 'es2015',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProd, // Remove console.logs in production
          drop_debugger: true,
          pure_funcs: isProd ? ['console.log', 'console.info', 'console.debug'] : []
        },
        format: {
          comments: false // Remove comments
        }
      },
      // Code splitting configuration
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks - separate large libraries
            'react-vendor': ['react', 'react-dom'],
            'charts': ['recharts'],
            'date-utils': ['date-fns'],
            'icons': ['lucide-react'],

            // Database & Storage
            'database': ['@capacitor-community/sqlite', 'jeep-sqlite', 'sql.js'],

            // Backend services
            'supabase': ['@supabase/supabase-js'],
            'ai': ['@google/genai'],

            // Capacitor plugins
            'capacitor': [
              '@capacitor/core',
              '@capacitor/app',
              '@capacitor/device',
              '@capacitor/network',
              '@capacitor/preferences',
              '@capgo/capacitor-native-biometric'
            ]
          },
          // Optimize chunk file names
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      },
      // Increase chunk size warning limit (temporary)
      chunkSizeWarningLimit: 600,
      // Source maps only in development
      sourcemap: !isProd,
      // Optimize CSS
      cssCodeSplit: true,
      // Report compressed size
      reportCompressedSize: true
    },
    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        '@supabase/supabase-js',
        'date-fns'
      ],
      exclude: ['jeep-sqlite']
    }
  };
});
