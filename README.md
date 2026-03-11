<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run the standalone extension app

This project builds as a Chrome/Edge Manifest V3 extension with a side panel UI.

## Build The Extension

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Build the extension:
   `npm run build`
3. In Chrome or Edge, open the extensions page, enable Developer Mode, choose `Load unpacked`, and select the generated `dist/` folder.

**Storage:**
- The app stores your Gemini API key, history, templates, and settings locally.
- Structured app state is saved in `chrome.storage.local`.
- Full generated images are saved in IndexedDB to avoid extension storage quota pressure.

## Local Development

- `npm run dev` still launches the UI in a normal browser tab for faster iteration.
- In Vite dev mode, the app falls back to browser `localStorage` for key/value persistence and local storage for generated image blobs.
- Extension-only behavior such as the side panel and `chrome.storage.local` should be validated from the built `dist/` package.

## Manual Verification

1. Build the extension and load `dist/` unpacked in Chrome or Edge.
2. Click the extension action and confirm the side panel opens.
3. Enter a valid Gemini API key and verify the app unlocks and shows only a masked key in the UI.
4. Generate an image, reload the browser, and confirm history, settings, templates, and the selected image still restore.
5. Open the settings modal, replace the API key, and confirm the new key is required for later generation requests.
