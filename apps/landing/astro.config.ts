import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField, fontProviders } from "astro/config";
import { loadEnv } from "vite";

const DEFAULT_PLAY_URL = "https://play.gamemash.io";
const { PUBLIC_PLAY_URL } = loadEnv(process.env.NODE_ENV ?? "production", process.cwd(), "PUBLIC_");
const playOrigin = new URL(PUBLIC_PLAY_URL || DEFAULT_PLAY_URL).origin;

const fontVariant = (file: string, weight: number | string) => ({
  src: [`./node_modules/${file}`] as [string],
  weight,
  style: "normal" as const,
});

export default defineConfig({
  site: "https://gamemash.io",
  trailingSlash: "ignore",
  build: {
    inlineStylesheets: "always",
  },
  server: {
    port: 4321,
  },
  integrations: [sitemap()],
  env: {
    schema: {
      PUBLIC_PLAY_URL: envField.string({ context: "client", access: "public", default: DEFAULT_PLAY_URL }),
    },
  },
  fonts: [
    {
      name: "Bricolage Grotesque",
      cssVariable: "--font-bricolage",
      provider: fontProviders.local(),
      options: {
        variants: [
          fontVariant(
            "@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2",
            "200 800",
          ),
        ],
      },
      fallbacks: ["Trebuchet MS", "system-ui", "sans-serif"],
    },
    {
      name: "Atkinson Hyperlegible",
      cssVariable: "--font-atkinson",
      provider: fontProviders.local(),
      options: {
        variants: [
          fontVariant("@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-normal.woff2", 400),
          fontVariant("@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff2", 700),
        ],
      },
      fallbacks: ["system-ui", "sans-serif"],
    },
    {
      name: "Silkscreen",
      cssVariable: "--font-silkscreen",
      provider: fontProviders.local(),
      options: {
        variants: [
          fontVariant("@fontsource/silkscreen/files/silkscreen-latin-400-normal.woff2", 400),
          fontVariant("@fontsource/silkscreen/files/silkscreen-latin-700-normal.woff2", 700),
        ],
      },
      fallbacks: ["Courier New", "monospace"],
    },
  ],
  markdown: {
    syntaxHighlight: false,
  },
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "object-src 'none'",
        "base-uri 'self'",
        `form-action ${playOrigin}`,
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
