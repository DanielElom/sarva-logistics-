/**
 * Stitch HTML → Next.js TSX Conversion Rules
 *
 * Apply these rules mechanically to every screen from the Stitch export before
 * wiring any interactivity.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * RULE 1 — File rename
 *   code.html  →  page.tsx  (or ComponentName.tsx for reusable components)
 *
 * RULE 2 — Component shell
 *   Wrap the <body> content in a named export default function:
 *
 *     export default function ScreenName() {
 *       return (
 *         <>
 *           paste body children here
 *         </>
 *       )
 *     }
 *
 * RULE 3 — class= → className=
 *   Global find-replace: class=" → className="
 *   (VS Code: Ctrl+H, check "Use Regular Expression", find: class=, replace: className=)
 *
 * RULE 4 — for= → htmlFor=
 *   Global find-replace: for=" → htmlFor="
 *
 * RULE 5 — Self-closing tags
 *   HTML void elements must be self-closed in JSX:
 *     <img …>   →  <img … />
 *     <input …> →  <input … />
 *     <br>      →  <br />
 *     <hr>      →  <hr />
 *     <meta …>  →  <meta … />
 *     <link …>  →  <link … />
 *
 * RULE 6 — Remove CDN Tailwind script
 *   Delete this entire tag (tokens are in globals.css):
 *     <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
 *
 * RULE 7 — Remove font <link> tags
 *   Delete Google Fonts <link> tags for Manrope, Inter, and Material Symbols
 *   (already loaded globally in app/layout.tsx).
 *
 * RULE 8 — Remove inline tailwind.config script
 *   Delete the entire <script id="tailwind-config">…</script> block
 *   (all tokens are in globals.css @theme).
 *
 * RULE 9 — Images
 *   Option A (dev): keep <img> with the lh3.googleusercontent.com src — domain
 *                   is whitelisted in next.config.ts.
 *   Option B (prod): replace with Next.js <Image> from 'next/image':
 *     import Image from 'next/image'
 *     <Image src="…" alt="…" width={400} height={300} />
 *   Always provide meaningful alt text.
 *
 * RULE 10 — Client directive
 *   Add 'use client' as the very first line of the file when the screen needs:
 *     - useState / useReducer
 *     - useEffect / useRef
 *     - onClick, onChange, or any event handler
 *     - Zustand store access
 *   Static/display-only screens can stay as Server Components (no directive).
 *
 * RULE 11 — Wrapper components
 *   Wrap every converted screen in the appropriate layout wrapper:
 *     User / Rider screens  →  <ScreenWrapper>…</ScreenWrapper>
 *     Admin screens         →  <AdminWrapper>…</AdminWrapper>
 *   Import from '@/components/layout/ScreenWrapper' or '@/components/layout/AdminWrapper'.
 *
 * RULE 12 — Inline <style> blocks
 *   Move any per-file <style> utility classes (e.g. .editorial-gradient,
 *   .glass-nav, .scrim-overlay) into globals.css or a CSS Module if they are
 *   reused across screens. Delete the <style> tag from the component.
 *
 * RULE 13 — SVG noise texture
 *   The shared noise-texture <div> at the bottom of each screen can be
 *   extracted into a <NoiseOverlay /> component and imported once.
 *
 * RULE 14 — Boolean HTML attributes
 *   JSX requires explicit boolean values:
 *     readonly  →  readOnly={true}  (or just readOnly)
 *     disabled  →  disabled={true}  (or just disabled)
 *     checked   →  defaultChecked={true}
 *
 * RULE 15 — HTML comments
 *   HTML comments <!-- … --> are valid in JSX as-is — no change needed.
 *   If you want to remove them, do so; they are not required.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * QUICK CHECKLIST (paste into PR description for each screen)
 * ─────────────────────────────────────────────────────────────────────────────
 *  [ ] Renamed to .tsx
 *  [ ] Wrapped in export default function
 *  [ ] class= → className= (all instances)
 *  [ ] for= → htmlFor= (all instances)
 *  [ ] Void elements self-closed
 *  [ ] CDN tailwind script removed
 *  [ ] Font <link> tags removed
 *  [ ] tailwind-config script removed
 *  [ ] Images: kept as <img> OR replaced with <Image>
 *  [ ] 'use client' added if interactive
 *  [ ] Wrapped in ScreenWrapper or AdminWrapper
 *  [ ] Inline <style> block moved to globals.css or CSS Module
 *  [ ] TypeScript compiles without errors (pnpm build)
 */

export {}
