const MIN_CAPTURE_CHARS = 40;
const MAX_CAPTURE_CHARS = 120_000;

function normalizeText(input: string): string {
  return input.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function isPdfUrl(url: string | undefined): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  
  // Check for .pdf file extension
  if (lowerUrl.endsWith(".pdf") || 
      lowerUrl.includes(".pdf?") ||
      lowerUrl.includes(".pdf#")) {
    return true;
  }
  
  // Check for common PDF URL patterns (arxiv, research papers, etc.)
  if (lowerUrl.includes("/pdf/") || 
      lowerUrl.includes("/pdfs/") ||
      lowerUrl.match(/\/pdf$/)) {
    return true;
  }
  
  return false;
}

function isRestrictedUrl(url: string | undefined): boolean {
  if (!url) return true;
  // PDFs are handled separately, so don't block them here
  if (isPdfUrl(url)) return false;
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
  method: "pageText" | "selection" | "pdf";
}> {
  const id = tabId ?? (await getActiveTabId());

  const tab = await chrome.tabs.get(id);
  if (isRestrictedUrl(tab.url)) {
    throw new Error(
      "This page can't be accessed by extensions (Chrome internal page). Try a normal webpage."
    );
  }

  // Handle PDF extraction separately
  if (isPdfUrl(tab.url)) {
    try {
      const [{ result: pdfResult }] = await chrome.scripting.executeScript({
        target: { tabId: id },
        func: () => {
          const title = document.title || "";
          const url = location.href || "";
          
          // Try 1: Access Chrome PDF viewer's text layer
          const textLayer = document.querySelector('.textLayer');
          if (textLayer && textLayer.textContent) {
            const text = textLayer.textContent;
            if (text.trim().length > 0) {
              return { title, url, text, method: "pdf", success: true };
            }
          }
          
          // Try 2: Check for embedded PDF
          const embed = document.querySelector('embed[type="application/pdf"]');
          if (embed || document.contentType === 'application/pdf') {
            // Try to get any selected text first
            const selection = window.getSelection?.()?.toString?.() ?? "";
            if (selection.trim().length > 0) {
              return { title, url, text: selection, method: "pdf", success: true };
            }
            
            // Try programmatic selection (may not work in all PDF viewers)
            try {
              document.execCommand('selectAll');
              const allText = window.getSelection?.()?.toString?.() ?? "";
              window.getSelection?.()?.removeAllRanges();
              if (allText.trim().length > 0) {
                return { title, url, text: allText, method: "pdf", success: true };
              }
            } catch (e) {
              // execCommand might fail, that's okay
            }
          }
          
          return { title, url, text: "", method: "pdf", success: false };
        },
      });

      if (pdfResult?.success && pdfResult.text) {
        const title = pdfResult.title || tab.title?.replace(/\.pdf$/i, '') || "PDF Document";
        const url = pdfResult.url || tab.url || "";
        let text = normalizeText(pdfResult.text);
        
        if (text.length < MIN_CAPTURE_CHARS) {
          throw new Error(
            "Only extracted a small amount of text from this PDF. Please select the text you want to capture manually, then try again."
          );
        }
        
        if (text.length > MAX_CAPTURE_CHARS) {
          text = text.slice(0, MAX_CAPTURE_CHARS);
        }
        
        return { title, url, text, method: "pdf" };
      }
    } catch (e: any) {
      // If extraction fails, provide helpful error
      if (e.message && !e.message.includes("Only extracted")) {
        throw new Error(
          "Unable to extract text from this PDF automatically. Please select the text you want to capture, then try again."
        );
      }
      throw e;
    }
    
    // No text extracted
    throw new Error(
      "Unable to extract text from this PDF automatically. Please select the text you want to capture, then try again."
    );
  }

  // Regular webpage extraction
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


