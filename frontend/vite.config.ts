import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import Components from 'unplugin-vue-components/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
    Components({
      // Gera declarações TS para os componentes auto-importados
      dts: 'src/components.d.ts',

      // Onde procurar seus componentes locais
      dirs: ['src/components'],

      // Extensões/arquivos considerados
      include: [/\.vue$/, /\.vue\?vue/],

      // Mantém import assíncrono (lazy) desativado para evitar flicker
      // (ajuste se quiser code-splitting por componente)
      resolvers: [],

      // Procura recursivamente nas subpastas (padrão já é true)
      // deep: true,
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@tinymce/tinymce-vue': fileURLToPath(new URL('./src/lib/tinymce-vue.ts', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5177,
    allowedHosts: ['gruponm.qyvia.com.br']
  },
})
