---
name: The Design System
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#45464d'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#5c5f60'
  on-secondary: '#ffffff'
  secondary-container: '#e1e3e4'
  on-secondary-container: '#626566'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#261900'
  on-tertiary-container: '#a17f3b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#e1e3e4'
  secondary-fixed-dim: '#c5c7c8'
  on-secondary-fixed: '#191c1d'
  on-secondary-fixed-variant: '#454748'
  tertiary-fixed: '#ffdea5'
  tertiary-fixed-dim: '#e9c176'
  on-tertiary-fixed: '#261900'
  on-tertiary-fixed-variant: '#5d4201'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  h1:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: '0'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  mono:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 32px
  xl: 64px
  gutter: 24px
  margin: 40px
---

## Brand & Style

This design system is anchored in high-end minimalism and functional precision. It is designed for professional environments where clarity, authority, and sophistication are paramount. The aesthetic rejects decorative excess in favor of a "flat but deep" approach—achieving complexity through rigorous alignment, generous whitespace, and hairline-thin structural elements.

The brand personality is intellectual and understated. It communicates trust through a "less is more" philosophy, where every pixel serves a purpose. The emotional response should be one of calm focus and perceived premium quality, akin to a high-end architectural firm or a specialized technology laboratory.

## Colors

The palette is dominated by a sophisticated contrast between an off-white foundation and deep, near-black navy. This high-contrast pairing ensures immediate legibility and a classic professional feel.

- **Primary:** A deep navy charcoal (#0F172A) used for primary text, structural headers, and high-emphasis action states.
- **Secondary/Background:** An off-white light gray (#F8F9FA) used for all major surfaces to reduce eye strain and provide a "gallery" feel.
- **Tertiary/Accent:** A muted gold (#C5A059) used sparingly for high-value highlights or premium status indicators.
- **Status:** A soft, muted mint (#D1E7DD) for positive states, ensuring the accent does not break the minimalist harmony.
- **Borders:** A specific hairline gray (#E2E8F0) designed to be visible but unobtrusive, acting as the primary tool for layout definition.

## Typography

This design system utilizes **Inter** exclusively to maintain a systematic, utilitarian, and modern appearance. The typographic hierarchy relies on weight and tracking rather than size alone to create distinction.

- **Headlines:** Use tighter letter-spacing and bold weights to ground the page.
- **Labels:** Small-scale caps with increased tracking (5%) should be used for metadata and eyebrow text.
- **Body Text:** Generous line-height (1.6) is required to maintain the "breathable" feel of the design.
- **Color:** Text should primarily use the deep navy color, with secondary information using a 60% opacity variant.

## Layout & Spacing

The layout is governed by a strict 12-column grid. The spacing philosophy is "generous but rhythmic," using a 4px base unit.

- **Margins & Gutters:** Large external margins (40px+) and wide gutters (24px) create the signature whitespace-heavy look.
- **Alignment:** All elements must align to the vertical grid lines. No element should sit "between" columns.
- **Padding:** Internal container padding should be substantial (min 32px) to prevent content from feeling crowded against the hairline borders.
- **Density:** This is a low-density design system. Information is grouped logically and separated by significant vertical gaps (64px+) between sections.

## Elevation & Depth

This system avoids traditional shadows in favor of a flat, architectural layering style. Depth is communicated through structural lines and tonal shifts rather than light source simulation.

- **Hairline Borders:** The primary method of separation. Use 1px solid borders in the neutral border color to define cards, sections, and inputs.
- **Z-Index Strategy:** When elements must overlap (e.g., modals or dropdowns), use a single, extremely subtle ambient shadow (0px 4px 20px rgba(0,0,0,0.04)) to provide just enough lift to distinguish the layer.
- **Surface Tones:** Use slight variations of the off-white background to define "nested" areas. For example, a card might be pure white (#FFFFFF) sitting on the light gray (#F8F9FA) background.

## Shapes

The shape language is sharp and precise. To maintain a high-end professional feel, the corner radius is kept to a minimum.

- **Primary Radius:** 4px for buttons, input fields, and small UI components.
- **Containers:** Large sections or cards may use 0px (sharp) corners to reinforce the grid-centric, architectural aesthetic.
- **Consistency:** Never mix pill-shaped elements with sharp elements. All interactive components must adhere to the 4px standard.

## Components

### Buttons
- **Primary:** Deep navy background, white text, 4px radius, no shadow.
- **Secondary:** Ghost style with a 1px hairline border and navy text.
- **Hover States:** Subtle background color shift (e.g., navy becomes slightly lighter) rather than a lift or shadow.

### Input Fields
- **Default:** Transparent or white background with a 1px hairline border.
- **Focus:** Border color transitions to primary navy. No outer glow.
- **Labels:** Use the `label-caps` typography style placed 8px above the field.

### Cards
- **Structure:** 1px hairline border, white background, no shadow.
- **Content:** Use the grid margins within the card to ensure content doesn't touch the borders.

### Chips/Status
- **Style:** Small, rectangular (4px radius), using the muted mint or gold backgrounds with dark text. 
- **Usage:** Used for tagging or status only; never as primary navigation elements.

### Lists
- **Separation:** Use horizontal 1px lines between items rather than alternating row colors.
- **Padding:** High vertical padding (16px) per list item to maintain the minimalist rhythm.