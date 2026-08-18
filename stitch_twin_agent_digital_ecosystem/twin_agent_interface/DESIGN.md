---
name: Twin Agent Interface
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#b9ccb2'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#84967e'
  outline-variant: '#3b4b37'
  surface-tint: '#00e639'
  primary: '#ebffe2'
  on-primary: '#003907'
  primary-container: '#00ff41'
  on-primary-container: '#007117'
  inverse-primary: '#006e16'
  secondary: '#c8c6c5'
  on-secondary: '#313030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#fcf8f8'
  on-tertiary: '#313030'
  tertiary-container: '#dfdcdb'
  on-tertiary-container: '#626060'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#72ff70'
  primary-fixed-dim: '#00e639'
  on-primary-fixed: '#002203'
  on-primary-fixed-variant: '#00530e'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c9c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474646'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-xl:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  grid_unit: 20px
  gutter: 1px
  margin_sm: 20px
  margin_md: 40px
  margin_lg: 80px
---

## Brand & Style
The design system is a high-performance "Twin Agent" interface designed for technical users, developers, and security professionals. The brand personality is precise, clinical, and futuristic, evoking the feeling of an advanced command-and-control center. It utilizes a **Dark-Tech Minimalism** style, blending the raw utility of a terminal with the sophisticated layering of modern glassmorphism.

The aesthetic avoids the "soft" tropes of consumer SaaS. Instead, it leans into high-contrast accents against abyssal backgrounds, using ultra-fine lines and geometric rigor to suggest a state of constant surveillance and computational power. The user should feel like they are operating a critical piece of infrastructure, not just a chat application.

## Colors
The palette is rooted in absolute depth. **#050505 (Deep Black)** serves as the primary canvas, ensuring no light pollution interferes with the data. **#0A0A0A** is used for nested containers and secondary surfaces to create subtle hierarchical separation.

**Electric Thunder Green (#00FF41)** is the primary activator. It is used sparingly but with high intensity for interactive states, agent status, and critical path data. When used for text or icons, it often carries a subtle `0 0 8px rgba(0, 255, 65, 0.4)` glow to simulate CRT or holographic phosphor. Secondary accents are kept to **Graphite (#1A1A1A)** to maintain a low-profile, "stealth" appearance.

## Typography
Typography is split between two functional roles: **Geist** handles the structural interface—headlines and primary body copy—providing a clean, geometric, and modern feel. **JetBrains Mono** is utilized for all technical metadata, agent logs, and "Twin" status updates.

This duality clearly separates human-oriented intent (Geist) from machine-generated output (JetBrains Mono). Letter spacing is tight for headlines to feel "engineered" and loose for labels to ensure legibility in high-density data views.

## Layout & Spacing
This design system utilizes a **Fixed Grid** philosophy. A strict 20px base grid pattern is visible as a background texture (using 1px lines at 5% opacity). All elements must snap to this 20px increment to maintain mathematical harmony.

Layouts are divided by 1px solid borders in #1A1A1A rather than wide gutters. On desktop, sidebars are fixed at 12 grid units (240px). On mobile, the grid collapses into a single column, but the 20px margin remains absolute to preserve the "framed" aesthetic. Components should use internal padding of 20px (1 unit) to ensure content never touches the technical borders.

## Elevation & Depth
Depth is achieved through **Dark Glass** and **Tonal Layering** rather than traditional shadows. Surfaces use `backdrop-filter: blur(12px)` combined with semi-transparent fills of #0A0A0A.

1.  **Base Layer:** #050505 with a 20px faint grid.
2.  **Surface Layer:** #0A0A0A with a 1px solid border of #1A1A1A.
3.  **Active/Floating Layer:** #0A0A0A with a 1px solid border of #00FF41 and a very soft, tight outer glow (0px 0px 10px rgba(0, 255, 65, 0.1)).

Shadows, if used at all, are "Hard Shadows" with 0 blur, offset by 2px to give a brutalist, tactile feel to interactive elements.

## Shapes
Shapes are aggressive and precise. The standard corner radius is **4px (0.25rem)**, providing a "Soft-Sharp" finish that feels premium and industrial. Large containers may use up to 8px, but never more. Interactive elements like buttons and input fields should maintain the 4px radius. Avoid completely circular elements (pills) unless they are status indicators or small badges.

## Components
-   **Buttons:** Primary buttons are Solid #00FF41 with black text. Secondary buttons are transparent with 1px #1A1A1A borders and white text, shifting to #00FF41 borders on hover.
-   **Twin Agent Logs:** A specialized list component using JetBrains Mono. Each log entry begins with a timestamp and an "Agent ID" in Electric Thunder Green.
-   **Input Fields:** Ghost style. 1px border (#1A1A1A) on three sides, with a high-intensity 2px #00FF41 bottom border when focused.
-   **Cards:** No drop shadows. Use 1px borders and the dark glass effect. Headers should be separated from body content by a 1px horizontal rule.
-   **Status Chips:** Small, rectangular (2px radius). Use monospace text. Active state: Green background, black text. Inactive: Dark grey background, light grey text.
-   **Data Visualizations:** Use 1px stroke widths for all charts. No fills, or use low-opacity green gradients (10% to 0%) for area charts.