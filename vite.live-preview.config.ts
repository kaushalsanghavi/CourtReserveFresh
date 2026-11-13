// Local-only preview: real data from the live site, read-only. Not committed.
import base from "./vite.config";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import path from "path";
process.chdir(import.meta.dirname);
export default {
  ...base,
  css: { postcss: { plugins: [tailwindcss({ config: path.join(import.meta.dirname, "tailwind.config.ts") }), autoprefixer] } },
  server: {
    ...base.server,
    port: 4180,
    proxy: {
      "/api": {
        target: "https://sunny-court-reserve.vercel.app",
        changeOrigin: true,
        bypass(req: any, res: any) {
          if (req.method !== "GET") {
            res.statusCode = 403;
            res.end(JSON.stringify({ message: "Read-only preview" }));
            return false;
          }
        },
      },
    },
  },
};
