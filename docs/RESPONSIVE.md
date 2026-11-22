# Tablets and phones first

Kids use GIO on tablets and phones more than on computers. This page explains how the layout adapts, why it was built this way, and how `npm run check:devices` keeps it working.

## Window classes

`src/ui/responsive/window-class.ts` sorts the app's own viewport width into four classes, after Material 3 and Apple size classes. It measures the window, not the device, so iPad Split View, Stage Manager and foldables get the class of the space they really have. `useWindowClass` (mounted once in `App.tsx`) writes the result to `<html>` as `data-width`, `data-layout`, `data-pointer` and `data-perf`. CSS switches layouts on those attributes.

| Class | Width | Typical device | Studio layout |
|---|---|---|---|
| compact | under 600 px | phone portrait, narrow Split View | stack: stage on top, code below, fixed action dock (Run, Step, Ask Gio, I'm stuck, Save) at the bottom, header buttons in a More sheet |
| medium | 600 to 839 px | iPad mini and Android tablet portrait, large phone landscape | stack, Ask box inline, stage controls under the stage |
| expanded | 840 to 1199 px | iPad landscape, iPad Pro portrait | split: code left, square stage right, Ask box as a popover |
| large | 1200 px and up | iPad Pro landscape, desktop | split, Ask box always open, quest target preview beside the quest |

A window that is 600 px or wider but 500 px or shorter (a phone on its side) also uses split, with a shorter header, the blocks palette as one swipe row and the quest card and skill-check banner trimmed so Run stays on screen.

## Decisions and reasons

- **Media attributes for the shell, container queries for panes.** The overall layout depends on the window, so it is driven by `data-width` and `data-layout` on `<html>`. Panes that live in different places (the blocks editor, the map list, sheets) use container queries (`blocks`, `maplist`, `sheet`) so they adapt to the space they get, whichever layout holds them.
- **One fixed-height shell.** From expanded up, and in short landscape, the studio fills `100dvh` and each pane scrolls inside itself. The stage side is `min(pane width, pane height minus the controls)`, so Run is never pushed below the fold on a 1280x800 tablet.
- **dnd-kit for blocks.** `@dnd-kit/core` handles mouse, pen, touch and keyboard with screen reader announcements, and it lives only in the lazy BlocksEditor chunk. Touch uses `TouchSensor` with a 150 ms press and 8 px tolerance, so a quick swipe still scrolls; mouse and pen use a custom sensor that ignores touch. Drop slots grow to 56 px while dragging on touch. Tap-to-add, Move up/down and Remove still work for children who do not drag.
- **Block groups are data.** `PALETTE_GROUPS` in BlocksEditor holds Draw, Music and Movie. A tab strip picks the group; in short landscape one swipe row carries every group's tiles, because there is no room for tabs.
- **Keyboard on iOS and Android.** `index.html` sets `interactive-widget=resizes-content`, so Android Chrome shrinks the layout and `bottom: 0` is already above its keyboard. iOS Safari overlays the keyboard and only shrinks the visual viewport, so `useKeyboardInset` writes `--kb` (the covered part) and `--vvh`. Both set `html[data-keyboard=open]`. With the keyboard up the stage collapses to 30 % of the visible height, the command key row (`FD`, `RT`, `REPEAT`, `[ ]`, numbers, Run) sits above the keyboard, and the editor ends above the key row.
- **Hardware keyboards.** On iPads with a keyboard, arrows move the caret in the editor and steer the game turtle elsewhere; the game key handler ignores keys from inside the editor. Tab indents and Escape leaves the editor.
- **Full screen.** The stage's full-screen mode is a CSS overlay first (`data-focus` on the pane), because iPhone Safari has no Fullscreen API for elements. Where `requestFullscreen` exists it is added on top as a best effort. Escape and the browser's own exit both leave it, and focus returns to the button.
- **Vibration.** `haptic()` gives a short buzz on block snap, game key press and a win. It is silent on iOS (no Vibration API), under reduced motion, and before the first tap (browsers refuse and log an error).
- **Lite mode.** Devices with 4 or fewer cores, 2 GB or less memory or Save-Data get `data-perf=lite`: no backdrop blur, half the confetti, no ring and hop animations. Reduced motion removes sheet slides and stage easing.
- **Sheets.** `Sheet.tsx` is the one overlay: a bottom sheet with a swipe-down handle on phones, a centred dialog on tablets, a drawer for the garden, a full page for the map and the mastery moment. Centred sheets pad by the safe-area insets. The Save menu keeps its own popover and is pinned to the screen in short landscape.
- **Heavy parts load late.** CodeMirror, dnd-kit, the map, the garden, the friend and mastery dialogs, the replay dialog, the certificate and privacy pages are separate chunks. The map chunk preloads when the browser is idle.
- **One text floor.** Captions and badges use 14 px at least. Only `.eyebrow` labels (uppercase, bold, letter-spaced) and the note letters on the stage keys stay at 12 to 14 px.

## What CDP can and cannot simulate

`check:devices` drives headless Edge or Chrome over the DevTools protocol with device metrics, touch emulation, `pointer: coarse` and safe-area insets. It can test layout, target sizes, text sizes, safe areas, real touch drags and pinches, Android-style keyboard resizes and layout shift. It cannot shrink only the visual viewport the way the iOS keyboard does in this Edge build (the check says so and the `keyboardInset` unit tests cover it), cannot vibrate, cannot enter native full screen, and does not run Safari's WebKit. Buttons pressed with `element.click()` do not count as user input for layout shift, so the harness marks those taps itself. Headless touch emulation can also misfire after many earlier touch screens in one long run: `block-drag` has failed once in a full run on iPhone portrait (the drop landed one slot later) and passes when rerun with `SCREEN=block-drag DEVICE=iphone`. That is a harness limit, not an app bug; rerun the screen alone before changing the app.

## Running check:devices

Build, start the server, then run the check against it:

```bash
npm run build
PORT=3501 AI_DAILY_LIMIT=50 node dist/api/server.js
GIO_URL=http://localhost:3501 npm run check:devices
```

| Variable | Meaning |
|---|---|
| `GIO_URL` | Server to test (default `http://localhost:3001`) |
| `DEVICE` | One device id: `android-small`, `iphone`, `ipad-mini`, `ipad`, `ipad-pro`, `android-tablet`, `desktop` |
| `ORIENTATION` | `portrait` or `landscape` |
| `SCREEN` or `SCREENS` | Comma list of screen ids from `scripts/lib/screens.ts` |
| `GIO_SHOTS_DIR` | Where screenshots and `index.md`/`index.json` go (default: the temp folder, `gio-device-shots`) |

A full run is 403 visits (6 touch devices in both orientations plus desktop, 31 screens) and takes about 75 minutes. It exits 0 only when every visit passes: no horizontal overflow, 48 px targets 8 px apart, text 14 px or more, nothing in the safe areas, the stage filling its pane with Run on screen, dialogs inside the screen with a reachable close button and bottom-anchored on phones, no console errors and layout shift under 0.1. Screenshots never go into the repository.

## 44 px exceptions

`TOUCH_ALLOWLIST` in `scripts/lib/devices.ts`:

| Target | Reason |
|---|---|
| The "Privacy" link | Inline footer link in a line of text; 44 px is the Apple minimum and a larger box would break the line. Since FEAT-004 the link is 48 px anyway; the entry stays as a guard. |

There are no other exceptions. The garden shell spots are 48 px boxes around 44 px art.

## Reviewed screenshots

Last full `check:devices` run on the final FEAT-005 build: 403 visits, 402 pass, 1 fail (block-drag on iPhone portrait, a harness touch flake described below; it passes 3 of 3 when run alone). In the matrix, pass means every assertion passed, and "seen" means the screenshot was also opened and judged by eye against Apple HIG and Material 3 adaptive guidance.

| Screen | A360 P | A360 L | iPh P | iPh L | mini P | mini L | iPad P | iPad L | Pro P | Pro L | ATab P | ATab L | Desk |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| mode-picker | pass | pass | pass, seen | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| little-empty | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass, seen | pass |
| little-blocks | pass | pass | pass | pass | pass | pass | pass | pass, seen | pass | pass | pass | pass | pass |
| coder-logo | pass | pass | pass, seen | pass | pass | pass | pass, seen | pass | pass | pass | pass | pass | pass |
| coder-python | pass | pass | pass, seen | pass | pass | pass | pass | pass, seen | pass | pass | pass | pass | pass |
| coder-javascript | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| music-blocks | pass | pass | pass, seen | pass, seen | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| coder-error | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| quest-active | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| skill-check | pass | pass, seen | pass | pass, seen | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| game | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| save-menu | pass | pass | pass, seen | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| friend-dialog | pass | pass | pass, seen | pass, seen | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| garden-sheet | pass | pass | pass | pass, seen | pass | pass | pass, seen | pass | pass | pass | pass | pass | pass |
| map-list | pass | pass | pass, seen | pass | pass | pass | pass | pass, seen | pass | pass | pass | pass | pass |
| island-sheet | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| mastery-moment | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| certificate | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| privacy | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| not-found | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| replay-dialog | pass | pass, seen | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| more-menu | pass | pass, seen | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| ask-sheet | pass | pass, seen | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| sheet-gestures | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| long-code | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| watch-mode | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| game-focus | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| block-drag | pass | pass | FAIL | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| stage-pinch | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| keyboard-editor | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |
| hardware-keys | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass | pass |

Notes from the screenshots that were opened:

| Screen | Device | Verdict |
|---|---|---|
| coder-logo | iPhone portrait | Good. Header icons and More sheet 48 px, stage square and large, thumb dock at the bottom. Fixed: the dock was 95 % opaque so the "Explain my code" row showed through it; the dock is now solid white. |
| music-blocks | iPhone portrait, landscape | Good. Draw/Music/Movie tabs, note picker keys 8 px apart (were 6). Fixed: in phone landscape the tabs pushed the tiles out of the palette and a drag landed in the wrong slot; short windows now show one swipe row with every group's tiles and no tabs. |
| coder-python | iPhone portrait, iPad landscape | Good. Python consent and loading state sit inside the Python tab, Copy 48 px. Long lines scroll inside the code box, not the page. |
| save-menu | iPhone portrait | Good. Bottom sheet with handle and Close, rows 56 px+. |
| map-list | iPhone portrait, iPad landscape | Good. Full-screen map on phones; two panes with the live garden on iPad landscape. Captions now 14 px. |
| mode-picker | iPhone portrait | Good. Cards stack and scroll; nothing under the home bar once scrolled. |
| friend-dialog | iPhone portrait, landscape | Good on portrait (bottom sheet). Fixed: on iPhone landscape the centred card ran into the home-bar inset; centred sheets now pad by all four safe-area insets. |
| garden-sheet | iPad portrait, iPhone landscape | Good. Drawer leaves a scrim strip; sticker grid auto-fills. Shell spots 48 px. |
| skill-check | iPhone and Android landscape | Fixed: the banner text, quest eyebrow, trophy and target preview pushed Run under the fold. In short landscape they fold away (the faint target is still on the stage). |
| more-menu | Android landscape | Fixed: the Save popover was cut off by the scrolling pane; in short landscape it is pinned to the screen corner. |
| ask-sheet | Android landscape | Good. The Ask popover covers the code tabs on purpose while open; it closes with Close or Escape. |
| replay-dialog | Android landscape | Good. Close stays on screen; the movie scrolls inside the sheet. |
| little-empty | Android tablet landscape | Fixed: the first-drawing offer overflowed the stage onto Run and Step; it now scrolls inside the stage. |
| little-blocks, coder-logo | iPad landscape, portrait | Good. Split layout with a big stage on landscape; stack with a 1200 px square stage on portrait; no dead space. |

## Rules for new UI

Every new screen, button or dialog must:

1. Work at 360 px wide with no horizontal scrolling, and in a 390 px tall phone landscape window.
2. Give every tap target at least 48x48 px and 8 px of space to its neighbours (the `.btn`, `.chip` and `.segmented` classes do this under `pointer: coarse`).
3. Use `Sheet` for overlays, so phones get a bottom sheet with a handle and tablets a centred dialog.
4. Never need hover: anything shown on hover must also show on tap or focus.
5. Keep clear of notches and the home bar: pad fixed and full-screen parts with `--safe-top`, `--safe-bottom`, `--safe-left` and `--safe-right`.
6. Respect `prefers-reduced-motion` and `data-perf=lite` (animate transform and opacity only).
7. Use 14 px or larger text, apart from `.eyebrow` labels.
8. Add a `SCREENS` entry in `scripts/lib/screens.ts` that opens it, and pass `npm run check:devices` with exit 0.
