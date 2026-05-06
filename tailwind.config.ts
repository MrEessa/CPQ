import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Canvas
        "bg-base":     "var(--bg-base)",
        "bg-surface":  "var(--bg-surface)",
        "bg-elevated": "var(--bg-elevated)",
        "bg-subtle":   "var(--bg-subtle)",
        // Borders
        "border-default": "var(--border-default)",
        "border-subtle":  "var(--border-subtle)",
        "border-strong":  "var(--border-strong)",
        // Text
        "text-primary":   "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary":  "var(--text-tertiary)",
        // Brand
        "color-primary":        "var(--color-primary)",
        "color-primary-hover":  "var(--color-primary-hover)",
        "color-primary-subtle": "var(--color-primary-subtle)",
        "color-primary-text":   "var(--color-primary-text)",
        "color-accent":         "var(--color-accent)",
        "color-accent-subtle":  "var(--color-accent-subtle)",
        "color-accent-text":    "var(--color-accent-text)",
        // Status
        "color-success":        "var(--color-success)",
        "color-success-subtle": "var(--color-success-subtle)",
        "color-success-text":   "var(--color-success-text)",
        "color-warning":        "var(--color-warning)",
        "color-warning-subtle": "var(--color-warning-subtle)",
        "color-warning-text":   "var(--color-warning-text)",
        "color-danger":         "var(--color-danger)",
        "color-danger-subtle":  "var(--color-danger-subtle)",
        "color-danger-text":    "var(--color-danger-text)",
        "color-info":           "var(--color-info)",
        "color-info-subtle":    "var(--color-info-subtle)",
        "color-info-text":      "var(--color-info-text)",
      },
      fontFamily: {
        display: ["DM Sans", "sans-serif"],
        body:    ["IBM Plex Sans", "sans-serif"],
        mono:    ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
