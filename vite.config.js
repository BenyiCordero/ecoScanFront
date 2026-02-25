import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                tomarFoto: resolve(__dirname, 'tomarFoto.html'),
                subirFoto: resolve(__dirname, 'subirFoto.html')
            }
        }
    }
})