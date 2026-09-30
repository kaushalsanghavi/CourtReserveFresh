# CourtReserve - project conventions

## Design & UX

- Never use emoji or emoticons in UI elements, mockups, placeholder text, empty states, or user-facing copy.
- Use `@phosphor-icons/react` for interface iconography. Prefer `Icon`-suffixed exports and direct `dist/csr/<Icon>` imports. Do not add new Lucide or React Icons usage.
- Theme Phosphor icons to their context using `currentColor`, semantic color, and appropriate weights: `regular` by default, `bold` for compact emphasis, `duotone` for feature identity, and `fill` only for selected or strongly semantic states.
- Party Fund always uses `EqualizerIcon` as its feature and navigation icon because it carries the intended music association.
- When modifying a legacy surface that still uses Lucide, migrate the icons in that surface to Phosphor as part of the change.
- The product should look refined and polished, in keeping with the Ramp-inspired design system.
