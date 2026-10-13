# GHSQUI Visual Theme

The visual theme for the GHSQUI quiz app, implemented with plain HTML, CSS, and browser JavaScript. The palette below is the source of truth; it replaced the original navy + gold design.

## Brand

- **App name:** GHSQUI
- **Logo:** An emblem/badge — a shield or crest built around the GHSQUI initials with a retro-arcade flavor (pixel-edged badge, blush-pink trim on espresso brown).
- **Mood:** Nerdy and playful — a high-score arcade feel that stays appropriate for a teacher-approved school tool.
- **Audience:** High school classmates, casual and fun. Quiz-taking screens lean playful; history, CSV import, and the question editor stay clean and neutral.

## Colors

Four core colors; every other shade on screen is a tint or shade of these:

- **Primary — Espresso brown `#31261c`:** text, borders, nav bar, and the dark-mode base.
- **Accent — Blush pink `#fbd1e6`:** buttons, badges, highlights, scores, and leaderboard first place.
- **Background — Cream `#fffdee`:** the light-mode page background.
- **Muted — Warm gray `#878787`:** secondary text.
- **Modes:**
  - Light (default): cream background, espresso text, blush-pink highlights.
  - Dark (toggleable): deep espresso background, cream text, blush-pink accents.

Define both palettes as CSS variables (e.g. `--navy`, `--gold`, `--bg`, `--text`) with a dark-mode override so the toggle is a single attribute change on the root element. The `--navy`/`--gold` variable names are historical; they now hold espresso brown and blush pink.

## Visual style

Retro arcade with pixel touches:

- Pixel-corner buttons and cards (via borders/box-shadows, no images).
- Chunky "PRESS START" style calls-to-action.
- 8-bit style score counters and progress bars.
- Effects used sparingly so forms and teacher tools stay readable.

## Typography

- **Headings:** Poppins (geometric, bold).
- **Body:** Inter.
- **Accent:** "Press Start 2P" only for scores, timers, and result headers.

Two font imports; system fallbacks for offline reliability.

## Implementation notes

- No heavy frameworks: the theme is achievable with CSS variables, two Google Fonts imports, and simple pixel effects via borders and box-shadows.
- Both light and dark palettes defined up front; dark mode is a toggle that swaps the CSS variable set.
- Leaderboards use blush pink for first place; ties render identically per the spec's deterministic sort.
