# Nano Banana Interface (Chrome Extension)

This repo builds a **Chrome Manifest V3 extension** that:
- Captures the current tab’s text content
- Wraps it with a selected **prompt template**
- Submits the prompt to Nano Banana (via `@google/genai`)
- Shows the resulting image and allows download

## Develop

1. Install deps:
   - `npm install`
2. Build the extension:
   - `npm run build`
3. Load unpacked in Chrome:
   - Go to `chrome://extensions`
   - Enable **Developer mode**
   - Click **Load unpacked**
   - Select the `dist/` folder

## Notes
- Capturing text from `file://` PDFs requires enabling **“Allow access to file URLs”** for the extension in `chrome://extensions`.
