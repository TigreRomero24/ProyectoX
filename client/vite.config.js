import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true, // Crucial para engañar al backend y evitar CORS
        secure: false, // Por si en algún momento usas HTTPS localmente
      },
    },
  },
});
