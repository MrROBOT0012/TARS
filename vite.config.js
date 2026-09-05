import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // Supabase REST/Auth responses carry financial data and session
        // tokens — never cached, not even briefly. NetworkOnly is explicit
        // about that so a future runtimeCaching addition doesn't silently
        // start caching them again.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/audjnwaqrleujseorzcd\.supabase\.co\/(rest|auth)\/.*/i,
            handler: 'NetworkOnly'
          }
        ]
      },
      devOptions: { enabled: false }
    })
  ],
  server: {
    port: 5173,
    host: true
  }
})
