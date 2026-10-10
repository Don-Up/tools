# Card Timer Sidebar

Edge/Chrome extension that shows [card-timer.html](https://don-up.github.io/tools/card-timer) on the right side of most web pages (see CSP caveat in Notes).

## Install (unpacked)

1. Open `edge://extensions/` (or `chrome://extensions/`).
2. Enable **Developer mode** (toggle in the extensions page).
3. Click **Load unpacked** and select this `card-timer-sidebar/` folder.
4. (Optional) Pin the extension from the toolbar.

## Usage

| Shortcut | Action |
| --- | --- |
| `Shift+O` | Toggle the card-timer sidebar |
| `Q` | Set the card-name input to the current text selection and focus it |
| `W` | Append `<br>{{selection}}` and auto-submit (creates the card) |
| `E` | Append `<br>{selection}` to the card input without submitting |

Q/W/E are skipped while typing in `INPUT` or `TEXTAREA` elements.

State (favorites, recent cards) lives in IndexedDB inside the iframe and persists across sidebar toggles.

## Notes

- First time you press `Shift+O`, Edge may show a one-time notice that the extension is controlling the shortcut.
- On page reload, the iframe is reinjected; in-progress card editing is lost (same behavior as the iframe embedded in `cn2en-json.html`).
- Some sites with strict `frame-src` CSP may block the iframe; that's a site policy, not an extension bug.
