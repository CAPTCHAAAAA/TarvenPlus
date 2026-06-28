import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

/**
 * Tarven++ hybrid build.
 * 目标：产出自包含 index.html，可从 file:///android_asset/ 直接加载
 * （运行时无 ES-module/fetch，file:// 不拦截）。base:'./' 保证资源 URL 相对。
 */
export default defineConfig({
  base: "./",
  plugins: [
    tailwindcss(),
    TanStackRouterVite(),
    viteReact(),
    tsConfigPaths(),
    viteSingleFile(),
  ],
  server: {
    host: "0.0.0.0",
    port: 3015,
    strictPort: true,
    allowedHosts: true,
    hmr: false,
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true,
  },
});
