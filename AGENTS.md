# CourtReserve Project Rules

## Interface Iconography

- Do not use emoji or emoticons in UI elements, mockups, placeholder text, empty states, or other user-facing copy.
- Use `@phosphor-icons/react` for interface icons. Prefer the `Icon`-suffixed component exports and direct `dist/csr/<Icon>` imports so development builds do not load the full icon package.
- Theme icons to their context with `currentColor`, semantic color, and an appropriate Phosphor weight. Use `regular` by default, `bold` for compact emphasis, `duotone` for feature identity, and `fill` only for a selected or strongly semantic state.
- Party Fund uses `EqualizerIcon` as its feature and navigation icon because it carries the intended music association.
- Do not add new Lucide, React Icons, decorative image glyphs, emoji, or emoticons. When modifying a legacy surface that still uses Lucide, migrate the icons in that surface to Phosphor as part of the change.
