// vite.config.ts
import { defineConfig } from "@tanstack/start/config";
import tsConfigPaths from "vite-tsconfig-paths";
var vite_config_default = defineConfig({
  vite: {
    plugins: [tsConfigPaths()]
  },
  server: {
    preset: "node-server"
  }
});
export {
  vite_config_default as default
};
