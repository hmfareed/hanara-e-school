---
name: Modern Academic Enterprise
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434655'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#784b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#996100'
  on-tertiary-container: '#ffeedd'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  title-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style
The design system is engineered for a premium, enterprise-grade educational experience. It balances the high-utility requirements of administrative software with the sleek, approachable aesthetics of modern SaaS leaders. The brand personality is authoritative yet frictionless, evoking a sense of organized intelligence and forward-thinking institutional management.

The visual style is **Corporate Modern** with a strong emphasis on **Minimalism** and **Tonal Depth**. Drawing inspiration from elite developer tools and fintech platforms, it utilizes expansive white space, precise typography, and subtle optical effects like backdrop blurs and soft shadows to create a workspace that feels calm even under heavy data loads.

## Colors
The palette is centered around "Royal Blue" to convey trust and stability, supported by "Emerald" for growth-oriented actions and "Amber" for critical highlights. 

### Color Application
- **Primary:** Used for main actions, active states, and brand recognition.
- **Secondary/Success:** Used for positive financial indicators, attendance marking, and completions.
- **Surface Strategy:** In light mode, surfaces use pure white against a cool-gray background to create a distinct sense of "floating" modules. In dark mode, depth is achieved by shifting from the deep navy background to a lighter slate surface.
- **Grayscale:** We use a refined slate scale (Slate 50 to Slate 950) for text and borders to maintain a cool, professional temperature throughout the UI.

## Typography
The system relies exclusively on **Inter**, a typeface designed for highly functional interfaces. The hierarchy is characterized by high contrast between large, bold display headings and clean, airy body text.

- **Weight Strategy:** Use Semibold (600) for titles to ensure they anchor the page sections. Use Medium (500) for UI labels and button text to improve legibility at smaller scales.
- **Readability:** Body text uses a generous 1.6x line-height to maintain comfort during long reading sessions (e.g., student reports or curriculum planning).
- **Scale:** On mobile devices, headline sizes scale down aggressively to prevent awkward word wrapping in data-rich views.

## Layout & Spacing
This design system utilizes an **8pt Spacing System** to ensure mathematical consistency across all components and layouts. 

- **Grid Model:** A 12-column fluid grid is used for desktop layouts with a 24px gutter. For complex dashboards, a sidebar-heavy layout is preferred, where the sidebar is fixed at 280px and the main content area remains fluid.
- **Responsive Behavior:** 
    - **Desktop (1280px+):** Full 12-column grid, 40px outer margins.
    - **Tablet (768px - 1279px):** 8-column grid, 24px outer margins. Sidebars collapse into a hamburger menu or icon-only rail.
    - **Mobile (Up to 767px):** 4-column grid, 16px outer margins. Cards stack vertically, and tables transition to list-style cards or horizontally scrollable containers.

## Elevation & Depth
Depth is signaled through **Ambient Shadows** and tonal shifts rather than harsh borders. This mimics the physical layering of paper and documents, appropriate for a school management context.

- **Level 1 (Default Surface):** Low-contrast 1px border (#E2E8F0) with no shadow. Used for secondary containers or inactive cards.
- **Level 2 (Active Cards):** A soft, multi-layered shadow: `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`. Used for the main dashboard widgets.
- **Level 3 (Overlay/Modals):** High-diffusion shadow: `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`. Used for dropdowns, popovers, and dialogs.
- **Dark Mode Adjustment:** In dark mode, shadows are replaced by subtle inner borders and "Elevation Overlays" where higher elevation surfaces receive a slightly lighter gray tint (Slate 800 vs Slate 900).

## Shapes
The shape language is friendly and contemporary, utilizing **Rounded (16px)** corners for primary containers. This "soft-square" aesthetic reduces the visual tension often found in dense enterprise software.

- **Small Components (Buttons, Inputs):** 12px radius.
- **Medium Components (Cards, Modals):** 16px radius.
- **Large Components (Large Hero Sections):** 24px radius.
- **Interactive States:** Hovering over a card may increase its shadow intensity, but the corner radius remains constant to maintain grid integrity.

## Components
Consistent implementation of these core components ensures a unified user experience across the entire management suite.

### Buttons
- **Primary:** Solid Royal Blue with a subtle top-to-bottom gradient (Primary to Primary-Dark). 12px border radius.
- **Ghost:** No background, Primary color text. On hover, a soft Slate-50 background appears.
- **Transitions:** All buttons use a `200ms ease-in-out` transition for background color and transform (slight scale down on click).

### Input Fields
- **Style:** 1px border (Slate-200), white background.
- **Focus State:** 2px ring in Primary Blue with 4px offset. 
- **Helper Text:** Positioned below the input in `body-sm` Slate-500.

### Tables (The Enterprise Workhorse)
- **Design:** Borderless rows with 1px Slate-100 bottom dividers. 
- **Header:** Sticky header with `label-md` typography and a faint Slate-50 background.
- **Density:** 16px vertical padding for "Comfortable" view; 8px for "Compact" view.
- **Row Hover:** A subtle Slate-50 tint to highlight the active data row.

### Cards
- **Padding:** Always 24px (Spacing LG) to ensure content has room to breathe.
- **Header:** Cards should include a 1px bottom divider if they contain a title and action (like a "View All" link).

### Icons
- **System:** Lucide Icons.
- **Weight:** 2px stroke width for standard icons; 1.5px for large illustrative icons.
- **Sizing:** Default at 20x20px within a 24px bounding box.