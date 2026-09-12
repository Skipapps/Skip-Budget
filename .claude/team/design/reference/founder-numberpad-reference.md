# Founder reference: number pad flow (screenshot shared 2026-09-12)

Dark-mode screenshot of a stepped "Add an expense" flow, described element by element:

- Top centre: screen title "Add an expense" (white, ~17px semibold).
- Below it: a step indicator of three dots; the current step is a wide pill (about 40x10), the other two are small dots. Light grey on the dark ground.
- Large gap, then a muted question "How much did you spend?" (~20px, grey).
- The figure: a small "$" prefix (~36px, grey) and a very large "0" (~72px, light grey when empty; presumably white once typed).
- Keypad: a 3x4 grid of wide rounded rectangles (radius ~16px), each a slightly lighter tile than the background (surface-on-surface, no border, no shadow), with the digit centred (~26px). Rows: 1 2 3 / 4 5 6 / 7 8 9 / . 0 backspace-icon. Tiles are about 250x110 in the 1208px-wide capture, i.e. roughly 3 equal columns with ~24px gutters, 12px vertical gaps.
- Bottom: a full-width pill button "Continue" (radius full, ~110px tall in the capture), rendered disabled (muted grey fill, dim label) while the amount is 0.
- Overall: Google Material 3 "expressive" tone in dark mode: no card borders, tonal surfaces, generous whitespace, one primary pill action.

Founder's instruction: design the number pad flow like this; improve all the add flows with calendar, clock and other pickers in the same style; use Google-style pills everywhere throughout the app.
