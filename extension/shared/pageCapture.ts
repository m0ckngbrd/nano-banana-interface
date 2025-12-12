const MIN_CAPTURE_CHARS = 40;
const MAX_CAPTURE_CHARS = 120_000;

function normalizeText(input: string): string {
  return input.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function isRestrictedUrl(url: string | undefined): boolean {
  if (!url) return true;
  return (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:")
  );
}

async function getActiveTabId(): Promise<number> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) throw new Error("No active tab found.");
  return tab.id;
}

export async function captureActiveTabText(tabId?: number): Promise<{
  title: string;
  url: string;
  text: string;
  method: "pageText" | "selection";
}> {
  const id = tabId ?? (await getActiveTabId());

  const tab = await chrome.tabs.get(id);
  if (isRestrictedUrl(tab.url)) {
    throw new Error(
      "This page can’t be accessed by extensions (Chrome internal page / built-in PDF viewer). Try a normal webpage or open the PDF in a regular tab if possible."
    );
  }

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: id },
    func: () => {
      const title = document.title || "";
      const url = location.href || "";

      const selection = window.getSelection?.()?.toString?.() ?? "";
      const bodyText = (document.body && (document.body as HTMLElement).innerText) || "";

      // Primary: page text; fallback: selection
      const primary = bodyText && bodyText.trim().length > 0 ? bodyText : "";
      const fallback = selection && selection.trim().length > 0 ? selection : "";

      const text = primary || fallback || "";
      const method = primary ? "pageText" : "selection";

      return { title, url, text, method };
    },
  });

  const title = result?.title ?? "";
  const url = result?.url ?? tab.url ?? "";
  let text = normalizeText(result?.text ?? "");
  const method = (result?.method ?? "pageText") as "pageText" | "selection";

  if (!text) {
    // Common cause: file:// without allow-file-urls enabled.
    if (url.startsWith("file://")) {
      throw new Error(
        "Couldn’t capture text from a file URL. In Chrome Extensions settings, enable “Allow access to file URLs” for this extension, then try again."
      );
    }
    throw new Error("No readable text found on this page.");
  }

  if (text.length < MIN_CAPTURE_CHARS) {
    // Still allow, but hint to user upstream via UI.
  }

  if (text.length > MAX_CAPTURE_CHARS) {
    text = text.slice(0, MAX_CAPTURE_CHARS);
  }

  return { title, url, text, method };
}


