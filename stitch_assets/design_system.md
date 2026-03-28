# Design System Strategy: FamilyQuest

## 1. Overview & Creative North Star
**The Creative North Star: "Playful Precision"**

This design system is built to bridge the gap between a high-energy game and a high-utility productivity tool. We are moving away from the "cluttered toy box" aesthetic and toward a sophisticated, editorial-inspired gamification. 

The system breaks the "template" look through **intentional asymmetry**—where cards might have slightly varied padding or overlapping decorative elements—and a **high-contrast typography scale**. We use "Breathing Room" as a functional element; by utilizing large whitespace and tonal layering instead of rigid borders, we create an interface that feels expansive for children and organized for parents.

---

## 2. Colors & Visual Soul
The palette is rooted in vibrant Indigo and Gold, but its sophistication comes from how we layer these tones.

### Surface Hierarchy & The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to define sections.
Boundaries must be created through background shifts. A `surface-container-low` card sitting on a `surface` background provides all the separation needed. This "Soft Boundary" approach makes the PWA feel like a native, premium OS.

*   **Nesting Depth:** Treat the UI as stacked sheets of frosted glass.
    *   **Level 0 (Base):** `surface` (#f4f6ff)
    *   **Level 1 (Sections):** `surface-container-low` (#eaf1ff)
    *   **Level 2 (Interactive Cards):** `surface-container-lowest` (#ffffff)
*   **The \"Glass & Gradient\" Rule:** Floating elements (like navigation bars or active task overlays) should use a backdrop-blur (12px–20px) with 80% opacity of the `surface` color.
*   **Signature Textures:** Use a subtle linear gradient for Primary CTAs: `primary` (#4647d3) to `primary-container` (#9396ff) at a 135° angle. This adds \"soul\" and a tactile, convex feel to buttons.

---

## 3. Typography: Editorial Gamification
We pair the structural stability of **Be Vietnam Pro** with the expressive, modern character of **Plus Jakarta Sans**.

*   **Display & Headlines (Plus Jakarta Sans):** Used for quest titles, point totals, and celebratory moments. The generous x-height and open curves feel friendly yet authoritative.
    *   *Display-LG (3.5rem):* Reserved for major \"Level Up\" or \"Quest Complete\" screens.
*   **Titles & Body (Be Vietnam Pro):** Used for task descriptions and parent settings. It provides maximum legibility during quick mobile scans.
*   **Hierarchy Note:** Use `headline-sm` for task titles but drop to `body-md` for metadata (due dates/rewards). This contrast ensures the \"What\" is always more important than the \"When.\"

---

## 4. Elevation & Depth
In this system, depth is a product of light and layering, not artificial \"dropshadow\" presets.

*   **The Layering Principle:** Always stack from darkest/most recessed to lightest/most prominent. A `surface-container-lowest` card is our \"highest\" point of interaction because it reflects the most light.
*   **Ambient Shadows:** For floating action buttons or modal cards, use a \"Cloud Shadow\":
    *   `Y: 10px, Blur: 30px, Color: on-surface (8% opacity)`.
    *   This mimics natural light, making the UI feel like it's hovering over the phone screen.
*   **The Ghost Border:** If a container lacks contrast (e.g., on a specific image background), use a \"Ghost Border\": `outline-variant` (#a0aec5) at **15% opacity**. Never use a 100% opaque border.

---

## 5. Signature Components

### Tactile Buttons
Buttons must feel \"pressable.\" 
*   **Primary:** Gradient fill (`primary` to `primary-container`), `rounded-md` (1.5rem), with a subtle 2px bottom inner-shadow to simulate a physical key.
*   **Secondary:** No fill. Use `surface-container-high` background with `on-surface` text.

### Quest Cards (Tasks)
*   **Layout:** Forbid divider lines. Use `spacing-4` (1rem) as the internal gutter.
*   **Interaction:** Use `surface-container-lowest` as the card base. To show a \"Completed\" state, transition the card background to `secondary-container` (#6bff8f) and reduce the opacity of the text—do not just use a checkbox.

### Point Badges & Avatars
*   **Badges:** Use `tertiary-container` (#fdc425) with `on-tertiary-container` text. Apply `rounded-full` and a subtle 5-degree tilt to give it a \"sticker\" feel.
*   **Avatars:** Always wrap avatars in a thick `surface-container-lowest` ring. If the user is \"Active,\" add a `primary\" glow using a soft ambient shadow.

### Input Fields
*   **Style:** Minimalist. No bottom line. Use `surface-container-low` as a pill-shaped container (`rounded-full`). 
*   **Focus State:** The background shifts to `surface-container-highest`, and the label color moves to `primary`.

---

## 6. Do's and Don'ts

### Do:
*   **Use Asymmetric Padding:** Give more \"top\" breathing room to headlines (`spacing-8`) than bottom room (`spacing-4`) than bottom room (`spacing-4`) to create an editorial flow.
*   **Micro-interactions:** Animate card entries with a subtle \"spring\" (stiffness: 300, damping: 20).
*   **Color as Meaning:** Use `tertiary` (Gold) exclusively for rewards and `secondary` (Green) for completion.

### Don't:
*   **Don't use Pure Black:** Use `on-surface` (#212f42) for text to keep the \"friendly\" vibe.
*   **Don't use 1px Dividers:** Use a `spacing-6` (1.5rem) vertical gap or a subtle color shift in the `surface-container` tier.
*   **Don't Over-Round Everything:** Stick to the scale. Use `md` (1.5rem) for cards and `full` for buttons. Mixing `sm\" and `xl\" corners creates visual \"noise.\"

### Accessibility Note:
Ensure that all text on `primary` backgrounds uses `on-primary` (#f4f1ff) to maintain a high contrast ratio for parents with visual fatigue and children in varying lighting conditions.
