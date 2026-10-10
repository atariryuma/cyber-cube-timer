/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

// GitHub Pages はサブパス（/<repo>/）で配信されるため、相対パスでビルドする
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    preact(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icon.svg', 'icon-maskable.svg'],
      manifest: {
        name: 'Cyber Cube Timer',
        short_name: 'CubeTimer',
        description: 'Eスポーツ風スピードキューブタイマー（WCA公式スクランブル・統計・CPU対戦）',
        lang: 'ja',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#05070f',
        theme_color: '#05070f',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // cubing.js のスクランブル用ワーカー・WASM もオフラインで使えるよう事前キャッシュする
        globPatterns: ['**/*.{js,css,html,svg,woff2,wasm}'],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
    // cubing.js のスクランブル用 Web Worker は Vite のプリロード補助関数を import する。
    // 補助関数がアプリ本体のチャンクに入ると Worker 内でアプリ（document 参照）が実行されて
    // 起動に失敗するため、補助関数を独立したチャンクに分け、Worker から document を触らせない。
    modulePreload: false,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('vite/preload-helper')) return 'preload-helper';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
