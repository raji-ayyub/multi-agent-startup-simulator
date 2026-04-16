import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("recharts")) return "vendor-recharts";
          if (id.includes("@tiptap")) return "vendor-tiptap";
          if (id.includes("react") || id.includes("react-dom") || id.includes("react-router")) return "vendor-react";
        },
      },
    },
  },
})
