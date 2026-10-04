# CardTimer Dock

An Anki 25.x addon that embeds `card-timer.html` as a persistent right-side dock and forwards manually-pushed card names from Anki cards to CardTimer.

## Install

1. Locate your Anki addons directory. In Anki, go to **Tools → Add-ons**, then click the **View Files** button. The directory is usually:
   - macOS/Linux: `~/Anki/addons21/`
   - Windows: `%APPDATA%\Anki2\addons21\`
2. Copy this addon folder into `addons21/`:
   ```bash
   # macOS/Linux
   cp -r cardtimer_for_anki ~/Anki/addons21/
   # Windows (PowerShell)
   xcopy /E /I cardtimer_for_anki %APPDATA%\Anki2\addons21\cardtimer_for_anki
   ```
3. Restart Anki. A new dock labeled **CardTimer** appears on the right side, showing the CardTimer UI.

## Usage

### Add a "Send to CardTimer" button to your cards

Open any note in the editor, switch to the **Cards…** template, and add this snippet to the **Back** template (or Front — wherever you want the button):

```html
<button onclick="pycmd('cardtimer:push:' + encodeURIComponent('{{Front}}'))">
  Send to CardTimer
</button>
```

`{{Front}}` is replaced by Anki with the card's front text before render.

### Send a card name to CardTimer

1. Review a card. Click **Show Answer** so the Back is rendered.
2. Click the **Send to CardTimer** button.
3. The dock's `cardNameInput` is filled with the card's Front text and receives focus.
4. Pick a duration (e.g., 2 min) and click **Confirm**. The timer starts.

### Toggle the dock

The dock can be hidden or shown via Anki's **View** menu (or the dock's close button). If hidden when you click the Send button, the dock reappears and the input is filled.

## Restart persistence

The dock position and visibility are saved automatically by Qt and restored on next Anki launch. Timers are stored in IndexedDB inside the dock's webview; they reload with the dock.

## Notes

- **One-way only.** This addon pushes card names from Anki to CardTimer. It does not change Anki card state when timers end.
- **Single profile.** The dock is created once per Anki session. If you switch profiles mid-session, behavior is undefined.
- **Bundled `card-timer.html`.** The addon ships its own copy of `card-timer.html` under `web/`. The root project's standalone copy is unaffected.

## Troubleshooting

- **Dock doesn't appear after install.** Confirm the folder is named exactly `cardtimer_for_anki` and is directly under `addons21/`. Restart Anki (not just reopen the window).
- **Click does nothing.** Open Anki with `--debug` from a terminal and check the output for errors. Confirm the button's `pycmd` call uses the exact `cardtimer:push:` prefix.
- **Multiple rapid clicks show only the last card.** This is intentional — the latest push overwrites the input. No errors expected.
