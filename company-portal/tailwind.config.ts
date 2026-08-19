import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "../shared/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "base-layer":               "#050505",
        "surface-layer":            "#0A0A0A",
        "border-tech":              "#1A1A1A",

        "background":               "#131313",
        "surface":                  "#131313",
        "surface-dim":              "#131313",
        "surface-bright":           "#3a3939",
        "surface-container-lowest": "#0e0e0e",
        "surface-container-low":    "#1c1b1b",
        "surface-container":        "#201f1f",
        "surface-container-high":   "#2a2a2a",
        "surface-container-highest":"#353534",
        "surface-variant":          "#353534",
        "surface-tint":             "#00e639",

        "on-background":            "#e5e2e1",
        "on-surface":               "#e5e2e1",
        "on-surface-variant":       "#b9ccb2",
        "inverse-surface":          "#e5e2e1",
        "inverse-on-surface":       "#313030",

        "outline":                  "#84967e",
        "outline-variant":          "#3b4b37",

        "primary":                  "#ebffe2",
        "on-primary":               "#003907",
        "primary-container":        "#00ff41",
        "on-primary-container":     "#007117",
        "inverse-primary":          "#006e16",
        "primary-fixed":            "#72ff70",
        "primary-fixed-dim":        "#00e639",
        "on-primary-fixed":         "#002203",
        "on-primary-fixed-variant": "#00530e",

        "secondary":                "#c8c6c5",
        "on-secondary":             "#313030",
        "secondary-container":      "#474746",
        "on-secondary-container":   "#b7b5b4",
        "secondary-fixed":          "#e5e2e1",
        "secondary-fixed-dim":      "#c8c6c5",
        "on-secondary-fixed":       "#1c1b1b",
        "on-secondary-fixed-variant":"#474746",

        "tertiary":                 "#fcf8f8",
        "on-tertiary":              "#313030",
        "tertiary-container":       "#dfdcdb",
        "on-tertiary-container":    "#626060",
        "tertiary-fixed":           "#e5e2e1",
        "tertiary-fixed-dim":       "#c9c6c5",
        "on-tertiary-fixed":        "#1c1b1b",
        "on-tertiary-fixed-variant":"#474646",

        "error":                    "#ffb4ab",
        "on-error":                 "#690005",
        "error-container":          "#93000a",
        "on-error-container":       "#ffdad6",
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        sm:      "0.125rem",
        md:      "0.25rem",
        lg:      "0.25rem",
        xl:      "0.5rem",
        full:    "0.75rem",
      },
      spacing: {
        grid_unit: "20px",
        margin_sm: "20px",
        margin_md: "40px",
        margin_lg: "80px",
        gutter:    "1px",
      },
      fontFamily: {
        "display-xl":         ["Geist", "sans-serif"],
        "headline-lg":        ["Geist", "sans-serif"],
        "headline-lg-mobile": ["Geist", "sans-serif"],
        "body-md":            ["Geist", "sans-serif"],
        "label-caps":         ["JetBrains Mono", "monospace"],
        "code-sm":            ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        "display-xl":         ["48px",  { lineHeight: "1.1",  letterSpacing: "-0.04em", fontWeight: "700" }],
        "headline-lg":        ["32px",  { lineHeight: "1.2",  letterSpacing: "-0.02em", fontWeight: "600" }],
        "headline-lg-mobile": ["24px",  { lineHeight: "1.2",  fontWeight: "600" }],
        "body-md":            ["16px",  { lineHeight: "1.6",  fontWeight: "400" }],
        "label-caps":         ["11px",  { lineHeight: "1",    letterSpacing: "0.1em",   fontWeight: "600" }],
        "code-sm":            ["13px",  { lineHeight: "1.5",  fontWeight: "400" }],
      },
      backgroundImage: {
        "grid-pattern": "linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)",
        "grid-sharp":   "linear-gradient(#1A1A1A 1px, transparent 1px), linear-gradient(90deg, #1A1A1A 1px, transparent 1px)",
      },
      backgroundSize: {
        "grid-20": "20px 20px",
      },
      boxShadow: {
        "tech-glow":  "0 0 10px rgba(0, 255, 65, 0.1)",
        "hard":       "2px 2px 0 #000",
      },
    },
  },
  plugins: [],
};

export default config;
