export interface PageContext {
  title: string;
  url: string;
  pageText: string;
}

export type PageCaptureErrorCode =
  | 'NOT_EXTENSION'
  | 'NO_ACTIVE_TAB'
  | 'UNSUPPORTED_PAGE'
  | 'SCRIPT_ACCESS'
  | 'NO_TEXT';

export class PageCaptureError extends Error {
  code: PageCaptureErrorCode;

  constructor(code: PageCaptureErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export interface PageCaptureResult {
  context: PageContext;
  truncated: boolean;
  capturedAt: number;
}

const MAX_PAGE_TEXT_LENGTH = 12000;

const isExtensionRuntimeAvailable = (): boolean =>
  typeof chrome !== 'undefined' &&
  Boolean(chrome.tabs?.query) &&
  Boolean(chrome.scripting?.executeScript);

const normalizePageText = (text: string): { text: string; truncated: boolean } => {
  const normalized = text.replace(/\s+/g, ' ').trim();

  if (normalized.length <= MAX_PAGE_TEXT_LENGTH) {
    return { text: normalized, truncated: false };
  }

  return {
    text: normalized.slice(0, MAX_PAGE_TEXT_LENGTH),
    truncated: true,
  };
};

const extractPageText = (): string => {
  const rawText = document.body?.innerText || document.documentElement?.innerText || '';
  return rawText;
};

const getActiveTab = async (): Promise<chrome.tabs.Tab> =>
  new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      const runtimeError = chrome.runtime?.lastError;
      if (runtimeError) {
        reject(new Error(runtimeError.message));
        return;
      }

      const activeTab = tabs[0];
      if (!activeTab?.id) {
        reject(new PageCaptureError('NO_ACTIVE_TAB', 'No active tab is available.'));
        return;
      }

      resolve(activeTab);
    });
  });

const readPageText = async (tabId: number): Promise<string> =>
  new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        func: extractPageText,
      },
      (results) => {
        const runtimeError = chrome.runtime?.lastError;
        if (runtimeError) {
          reject(new PageCaptureError('SCRIPT_ACCESS', runtimeError.message));
          return;
        }

        const text = results?.[0]?.result;
      resolve(typeof text === 'string' ? text : '');
      },
    );
  });

export const captureActivePageContext = async (): Promise<PageCaptureResult> => {
  if (!isExtensionRuntimeAvailable()) {
    throw new PageCaptureError('NOT_EXTENSION', 'Page capture only works inside the browser extension.');
  }

  const tab = await getActiveTab();
  const tabUrl = tab.url || '';

  if (!tabUrl || /^chrome:|^edge:|^about:|^chrome-extension:|^edge-extension:/.test(tabUrl)) {
    throw new PageCaptureError(
      'UNSUPPORTED_PAGE',
      'This page does not allow page context extraction. Open a regular website tab and try again.',
    );
  }

  let normalizedPageText: { text: string; truncated: boolean };

  try {
    normalizedPageText = normalizePageText(await readPageText(tab.id!));
  } catch (error) {
    console.error('Failed to read page text:', error);
    if (error instanceof PageCaptureError) {
      throw new PageCaptureError(
        error.code,
        'Could not read the current page. Try a regular webpage instead of a browser-internal or protected page.',
      );
    }

    throw new PageCaptureError(
      'SCRIPT_ACCESS',
      'Could not read the current page. Try a regular webpage instead of a browser-internal or protected page.',
    );
  }

  if (!normalizedPageText.text) {
    throw new PageCaptureError(
      'NO_TEXT',
      'The current page did not provide readable text for template placeholders.',
    );
  }

  return {
    context: {
      title: tab.title || '',
      url: tabUrl,
      pageText: normalizedPageText.text,
    },
    truncated: normalizedPageText.truncated,
    capturedAt: Date.now(),
  };
};
