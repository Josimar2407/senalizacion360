// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/senalizacion360/",        // ruta del repo para GH Pages
  build: { outDir: "docs" },        // el build se publica en /docs
});
