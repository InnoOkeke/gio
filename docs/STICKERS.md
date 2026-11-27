# WhatsApp stickers

The Picture menu has a "WhatsApp sticker" row. One tap draws the current drawing again from its events as a sticker and either opens the phone's share menu or saves a file.

## What GIO makes

| Rule | Value | Where it is enforced |
|---|---|---|
| Size | exactly 512 x 512 px | `STICKER_SIZE` in `src/ui/export/sticker.ts` |
| Format | WebP (lossy with transparency). Quality steps down from 0.92 to 0.2 until the file fits | `makeSticker` |
| File size | 100 KB (102,400 bytes) or less | `STICKER_MAX_BYTES` |
| Background | transparent, with a 6 px clear margin around the outline | `addStickerOutline` |
| Outline | white, 10 px (WhatsApp recommends about 8 px), also filling closed shapes so lines stay readable on dark chats | `addStickerOutline` |

The drawing is drawn again at up to 4 px per turtle step (not copied from the screen), so a small drawing stays sharp.

**Safari on iPhone and iPad cannot make WebP in a canvas** (it hands back a PNG). There GIO makes a PNG of the same size, and reduces the colours step by step until it is under 100 KB. WhatsApp's iOS guide accepts PNG or WebP.

Known limit: a line drawn in white is invisible on the white outline.

## What WhatsApp needs (from WhatsApp's own sticker guides)

Sources: the [Android guide](https://github.com/WhatsApp/stickers/blob/main/Android/README.md) and the [iOS guide](https://github.com/WhatsApp/stickers/blob/main/iOS/README.md) in github.com/WhatsApp/stickers.

Both platforms, for one static sticker image:

- A transparent background.
- Exactly 512 x 512 pixels.
- At most 100 KB (animated stickers: 500 KB).
- A white outline of about 8 px is recommended, because stickers show on white, black, coloured and patterned chats.

Format: WebP on Android. iOS accepts PNG or WebP.

Adding a sticker to the sticker tray is different from sending an image:

- WhatsApp has no public way for a website to add a single sticker. The official route is a sticker pack, added by an Android app (a `ContentProvider` and an `ENABLE_STICKER_PACK` intent) or an iOS app (pasteboard data and the `whatsapp://stickerPack` link). A pack needs 3 to 30 stickers and a 96 x 96 px tray icon of 50 KB or less.
- So a web app cannot put a sticker in the tray. GIO shares or downloads the finished image. How WhatsApp treats a shared WebP file (as a sticker or as a picture) is up to the WhatsApp version and is not documented. **This was not tested on a real phone with WhatsApp installed.** What was tested is the file: see below.

## Sharing

- Web Share API Level 2 (`navigator.canShare({ files })` then `navigator.share({ files })`). The file is shared alone, with no text or link, so WhatsApp gets only the image.
- Closing the share menu (AbortError) does nothing. Any other failure, or a browser without file sharing, saves the file instead ("Sticker saved! Send it in WhatsApp.").
- The share needs the tap that opened it. The sticker takes well under a second to make, so the tap is still fresh.

## Tests

- `tests/sticker.test.ts`: the limits (512 x 512, 102,400 bytes, WebP and PNG headers read from real files), the outline (corners and border stay transparent, white outline and paper inside closed shapes, open shapes stay open), and the fit.
- `npm run check:sticker` (real Edge or Chrome against a production server): makes stickers from two drawings, reads the downloaded `.webp`, and checks it is real WebP, 512 x 512, under 100 KB, with transparent corners, a white outline and dark lines. A busy 120-line star came to about 85 KB, near the limit.
- Headless browsers have no share sheet, so this check covers the download path. The share path is the same file.