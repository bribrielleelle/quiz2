# GHSQUI Visual Theme

The visual theme for the GHSQUI quiz app. This is a design reference only; implementation happens in later phases using plain HTML, CSS, and browser JavaScript.

## Brand

- **App name:** GHSQUI
- **Logo:** An emblem/badge — a shield or crest built around the GHSQUI initials with a retro-arcade flavor (pixel-edged badge, gold trim on navy).
- **Mood:** Nerdy and playful — a high-score arcade feel that stays appropriate for a teacher-approved school tool.
- **Audience:** High school classmates, casual and fun. Quiz-taking screens lean playful; history, CSV import, and the question editor stay clean and neutral.

## Colors

- **Primary — Navy blue:** main brand color for headers, buttons, and the dark-mode base.
- **Accent — Gold:** highlights, scores, leaderboard trophies, and emblem trim.
- **Modes:**
  - Light (default): light background, navy text, gold highlights.
  - Dark (toggleable): navy background, gold accents.

Define both palettes as CSS variables (e.g. `--navy`, `--gold`, `--bg`, `--text`) with a dark-mode override so the toggle is a single class change on the root element.

## Visual style

Retro arcade with pixel touches:

- Pixel-corner buttons and cards (via borders/box-shadows, no images).
- Chunky "PRESS START" style calls-to-action.
- 8-bit style score counters and progress bars.
- Effects used sparingly so forms and teacher tools stay readable.

## Typography

- **Headings:** Poppins (geometric, bold).
- **Body:** Inter.
- **Accent (optional):** a pixel font such as "Press Start 2P" only for scores, timers, and leaderboard headings.

Two font imports; system fallbacks for offline reliability.

## Implementation notes

- No heavy frameworks: the theme is achievable with CSS variables, two Google Fonts imports, and simple pixel effects via borders and box-shadows.
- Both light and dark palettes defined up front; dark mode is a toggle that swaps the CSS variable set.
- Leaderboards use gold for first place; ties render identically per the spec's deterministic sort.
