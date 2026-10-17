# A little garden for Haivaan ♡

A personal, static apology-gift site adapted around the Infinite Garden starter concept. All page behavior lives in `index.html`; the photos are local assets and are not edited or AI-transformed.

## Preview locally

Open `index.html` in a browser, or run a simple static server:

```bash
python -m http.server 5500
```

Then open `http://localhost:5500`.

## Deploy on Vercel

Import this folder/repository as a static project on Vercel. It does not need a build command or output directory; the `index.html` at the root is the entry page.

## Personal settings

At the top of the script in `index.html`, edit `ACCEPTED_ANSWERS` to your exact accepted nickname spellings. The song embed is configured to start at 50 seconds. The uploaded images are kept as the exact original JPEG bytes in `assets/memory-01.jpeg` through `assets/memory-04.jpeg`.

The password is a fun client-side gate, not real security; visitors could inspect the page source. YouTube playback requires an internet connection and may require a tap if the browser blocks autoplay.

## Credit

The starting repository was forked from Krei Labs' `infinite-garden` project. This version substantially replaces the page experience for a personal gift. See the upstream project for its license and reuse notes: https://github.com/krei-labs/infinite-garden
