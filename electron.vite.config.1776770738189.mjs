// electron.vite.config.ts
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import { resolve } from "path";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: "electron/main/index.ts"
      },
      rollupOptions: {
        external: ["sharp", "onnxruntime-node", "node-machine-id"]
      }
    },
    resolve: {
      alias: {
        "@main": resolve("electron/main"),
        "@shared": resolve("src/shared")
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: "electron/preload/index.ts"
      },
      rollupOptions: {
        output: { format: "cjs" }
      }
    }
  },
  renderer: {
    root: ".",
    build: {
      rollupOptions: {
        input: {
          index: "index.html"
        }
      }
    },
    plugins: [react()],
    css: {
      postcss: {
        plugins: [tailwindcss(), autoprefixer()]
      }
    },
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer"),
        "@shared": resolve("src/shared")
      }
    },
    define: {
      // Needed for Framer Motion
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development")
    }
  }
});
export {
  electron_vite_config_default as default
};
