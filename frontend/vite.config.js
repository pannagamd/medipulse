import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const rootDir = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(rootDir, 'src'),
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (id.includes('react-router-dom'))
                            return 'router';
                        if (id.includes('framer-motion'))
                            return 'motion';
                        if (id.includes('axios'))
                            return 'http';
                        if (id.includes('zustand'))
                            return 'state';
                        if (id.includes('sonner'))
                            return 'toast';
                        if (id.includes('@radix-ui'))
                            return 'radix';
                        if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform/resolvers'))
                            return 'forms';
                        if (id.includes('lucide-react'))
                            return 'icons';
                        return 'vendor';
                    }
                },
            },
        },
    },
});
