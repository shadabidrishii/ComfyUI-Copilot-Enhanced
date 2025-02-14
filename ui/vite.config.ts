import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { exec } from 'child_process';

const rewriteImportPlugin = ({ isDev }) => {
  return {
    name: "rewrite-import-plugin", // this name will show up in warnings and errors
    resolveId(source) {
      if (!isDev) {
        return;
      }
      if (source === "/scripts/app.js") {
        // Change the path to the new host
        return "http://127.0.0.1:8188/scripts/app.js";
      }
      if (source === "/scripts/api.js") {
        return "http://127.0.0.1:8188/scripts/api.js";
      }
      return null; // Other imports should not be affected
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  envDir: ".",
  build: {
    watch: mode === "development" ? {
      include: ["src/**"],
      buildStart() {
        // 只在开发模式下启动 Tailwind CSS watch 进程
        console.log("Starting Tailwind CSS watch process...");
        const tailwindProcess = exec(
          'npx tailwindcss -i ./src/input.css -o ./src/output.css --watch',
          (error, stdout, stderr) => {
            if (error) {
              console.error(`Tailwind CSS watch error: ${error}`);
              return;
            }
            if (stderr) {
              console.error(`Tailwind CSS stderr: ${stderr}`);
              return;
            }
            console.log(`Tailwind CSS stdout: ${stdout}`);
          }
        );

        // Cleanup process on build end
        process.on('exit', () => {
          tailwindProcess.kill();
        });
        console.log("Tailwind CSS watch process started.");
      }
    } : undefined,  // 在生产环境下不启用 watch
    // minify: false, // ___DEBUG__MODE only
    // sourcemap: true, // ___DEBUG___MODE only
    emptyOutDir: true,
    rollupOptions: {
      // externalize deps that shouldn't be bundled into your library
      external: ["/scripts/app.js", "/scripts/api.js"],
      input: {
        input: "/src/main.tsx",
      },
      output: {
        // Provide global variables to use in the UMD build for externalized deps
        globals: {
          app: "app",
          Litegraph: "LiteGraph",
        },
        dir: "../dist",
        // assetFileNames: "[name]-[hash][extname]",
        entryFileNames: "copilot_web/[name].js",
        chunkFileNames: `copilot_web/[name]-[hash].js`,
        assetFileNames: `copilot_web/assets/[name]-[hash].[ext]`,
      },
    },
  },
  plugins: [react(), rewriteImportPlugin({ isDev: mode === "development" })],
}));
