# Design System Document: Delivery PWA

## 1. Overview & Creative North Star
**Creative North Star: "The Architectural Courier"**

This design system moves away from the generic, transactional feel of standard delivery apps toward an editorial, high-end logistics experience. We aim for "Architectural Courier"—a philosophy that values structural integrity, rhythmic whitespace, and a sense of calm authority. 

By leveraging the deep heritage of our forest greens and the clarity of Manrope and Inter typography, we create an interface that feels less like a "utility" and more like a "service." We reject the "template" look by using intentional asymmetry, overlapping layers that mimic physical paper, and a strict adherence to tonal depth over structural lines.

## 2. Colors
Our palette is rooted in a deep, authoritative green, supported by a sophisticated range of architectural neutrals.

### Color Tokens
- **Primary / Action:** `primary` (#003418) and `primary_container` (#004d26).
- **Surface Neutrals:** `surface` (#f8faf4) to `surface_container_highest` (#e0e3dd).
- **Accents:** `tertiary` (#531620) used sparingly for high-attention alerts.

### The "No-Line" Rule
To achieve a premium, editorial feel, **prohibit the use of 1px solid borders for sectioning.** Boundaries must be defined solely through background color shifts. For example, a card should be differentiated from the background by placing a `surface_container_lowest` (#ffffff) element on a `surface_container_low` (#f2f4ee) background.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the surface-container tiers to define importance:
1. **Base Level:** `surface` (#f8faf4).
2. **Structural Sections:** `surface_container_low` (#f2f4ee).
3. **Elevated Content (Cards):** `surface_container_lowest` (#ffffff).
4. **Active/Pressed States:** `surface_container_high` (#e6e9e3).

### The "Glass & Gradient" Rule
For floating mobile elements (like a bottom navigation bar or a tracking modal), use **Glassmorphism**. Apply `surface` with 80% opacity and a `backdrop-blur` of 12px-16px. This ensures the app feels native to the mobile environment and physically integrated.

### Signature Textures
Avoid flat `primary` blocks for large areas. Instead, use subtle linear gradients from `primary` (#003418) to `primary_container` (#004d26) at a 135-degree angle. This adds "soul" and prevents the green from appearing muddy on OLED screens.

## 3. Typography
We use a dual-font strategy to balance editorial character with functional clarity.

*   **Display & Headlines (Manrope):** Chosen for its geometric precision and modern "open" feel. Large scale differences (e.g., `display-lg` vs `title-md`) should be used to create an intentional visual rhythm that guides the eye.
*   **Body & UI (Inter):** Chosen for its exceptional legibility at small sizes on mobile screens. 

**Hierarchy Principle:**
- **Authority:** Use `headline-lg` in `on_surface` for major section headers to establish trust.
- **Utility:** Use `label-md` in `on_surface_variant` for metadata (e.g., "Estimated Arrival") to reduce visual noise.

## 4. Elevation & Depth
Depth in this system is achieved through **Tonal Layering**, not structural shadows.

### The Layering Principle
Stacking surfaces is the primary method of elevation. A map-tracking component should sit as a `surface_container_lowest` sheet on top of the map background, creating a soft, natural lift.

### Ambient Shadows
When a "floating" effect is mandatory (e.g., a "Request Delivery" FAB), use shadows that are extra-diffused:
- **Blur:** 24px+
- **Opacity:** 4% to 8%
- **Color:** Use a tinted version of `on_surface` (a very dark, desaturated green-grey) rather than pure black to maintain a natural, ambient light feel.

### The "Ghost Border" Fallback
If a border is required for accessibility (e.g., in high-contrast mode), use a **Ghost Border**: the `outline_variant` token (#c0c9be) at 20% opacity. Never use 100% opaque, high-contrast borders.

## 5. Components

### Buttons
- **Primary:** Rounded `xl` (1.5rem), using the `primary` to `primary_container` gradient. Text is `on_primary` (#ffffff).
- **Secondary:** `surface_container_high` background with `on_surface` text. No border.
- **States:** On `hover` or `press`, shift the gradient brightness or increase the surface elevation by one tier (e.g., from `low` to `lowest`).

### Input Fields
- **Container:** `surface_container_low` with a `md` (0.75rem) corner radius.
- **Interaction:** On focus, transition the background to `surface_container_lowest` and add a 1px "Ghost Border" using `primary`.
- **Labels:** Use `label-md` floating above the input, never inside as a placeholder.

### Cards & Lists
- **The Divider Ban:** Explicitly forbid 1px divider lines between list items. Separate items using 8px or 12px of vertical whitespace or by alternating very subtle background tints (`surface` vs `surface_container_low`).
- **Corner Radius:** Use `lg` (1rem) for content cards to maintain the "friendly yet professional" feel.

### Delivery Progress Tracker
- Use a custom-designed vertical stepper. The "active" path should be a thick 4px line in `primary`, while the "upcoming" path is a 2px `outline_variant` line.

## 6. Do's and Don'ts

### Do
- **Do** use large, intentional whitespace (the "Editorial Gap") to separate high-level sections.
- **Do** use `rounded-xl` for large containers and `rounded-full` for chips and small action buttons.
- **Do** prioritize `on_surface_variant` (#404941) for secondary text to keep the interface soft and readable.
- **Do** use Glassmorphism for mobile navigation overlays to maintain context.

### Don't
- **Don't** use pure #000000 for text; use `on_surface` (#191d19) for a softer, premium look.
- **Don't** use standard Material Design "Drop Shadows." Stick to Tonal Layering or Ambient Shadows.
- **Don't** use sharp corners (0px). Everything in the logistics world—from vehicles to packages—has a radius; the UI should reflect that physical reality.
- **Don't** use high-saturation reds for errors. Use the `error` (#ba1a1a) and `error_container` (#ffdad6) tokens to ensure the "professional" tone is maintained even during friction.