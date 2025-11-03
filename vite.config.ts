import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // IMPORTANT: Replace 'your-repo-name' with your actual GitHub repository name!
  // For example, if your repo is at github.com/username/state-span-main
  // then use: base: process.env.NODE_ENV === 'production' ? '/state-span-main/' : '/',
  base: process.env.NODE_ENV === 'production' ? '/state-span/' : '/',
}));
