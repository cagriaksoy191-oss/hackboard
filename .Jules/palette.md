## 2026-04-22 - Added ARIA labels to icon-only buttons
**Learning:** Found an accessibility issue pattern specific to this app's components, where icon-only buttons lacked aria-labels. Adding them improves screen reader accessibility and overall UX.
**Action:** Always verify that icon-only buttons and inputs have appropriate aria-labels and titles to ensure full accessibility.

## 2026-05-05 - Added `htmlFor` to form labels
**Learning:** The forms in this app lack explicit `htmlFor` properties to associate `label` tags with their respective input elements. Adding this association improves screen reader support and expands the click target for inputs, which is particularly helpful for UX and accessibility.
**Action:** When working on form inputs, always make sure there is an explicit link between a `label` element and its associated `input`, `textarea`, or `select` via `htmlFor` and `id` properties.
## 2024-05-24 - Accessibility on Icon-Only Buttons
**Learning:** Icon-only buttons (like menu toggles, close buttons, logout icons) are frequently missing `aria-label` attributes, which makes them inaccessible to screen readers. This seems to be a common pattern in this project when buttons are created using raw SVGs.
**Action:** When reviewing new UI components or auditing existing ones, systematically search for `<button>` tags that only contain `<svg>` or `<icon>` children and ensure they have both `title` (for mouse hover) and `aria-label` (for screen readers) attributes.
