// vite.config.ts
import { resolve } from "path";
import { defineConfig } from "vite";
import { chromeExtension } from "vite-plugin-chrome-extension";

export default defineConfig({
    resolve: {
        alias: {
            "@": resolve(__dirname, "src"),
        },
    },
    build: {
        rollupOptions: {
            input: "src/manifest.json",
            output: {
                dir: 'dist',
                entryFileNames: '[name].js',
                chunkFileNames: '[name].js',
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name.endsWith('.png')) {
                        return 'icons/[name][extname]';
                    }
                    return '[name].[ext]';
                }
            }
        },
        outDir: 'dist',
        emptyOutDir: true,
        // Development mode settings
        minify: false, // Disable minification
        sourcemap: true, // Enable source maps
        target: 'esnext', // Use modern JavaScript features
        // Keep code readable
        terserOptions: {
            compress: false, // Disable compression
            mangle: false, // Disable mangling
            format: {
                beautify: true // Beautify the output
            }
        }
    },
    plugins: [
        chromeExtension()
    ],
    publicDir: 'src'
})