// MV3 background service worker (module)
import { handleMessage } from "./shared/messages";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then((result) => sendResponse({ ok: true, result }))
    .catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      sendResponse({ ok: false, error: msg });
    });
  return true; // keep the message channel open for async responses
});


