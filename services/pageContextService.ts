export interface PageContext {
  title: string;
  url: string;
  pageText: string;
}

const MAX_PAGE_TEXT_LENGTH = 12000;

const isExtensionRuntimeAvailable = (): boolean =>
  typeof chrome !== 'undefined' &&
  Boolean(chrome.tabs?.query) &&
  Boolean(chrome.scripting?.executeScript);

const normalizePageText = (text: string): string =>
  text
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_PAGE_TEXT_LENGTH);

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
        reject(new Error('No active tab is available.'));
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
          reject(new Error(runtimeError.message));
          return;
        }

        const text = results?.[0]?.result;
        resolve(typeof text === 'string' ? text : '');
      },
    );
  });

export const getActivePageContext = async (): Promise<PageContext> => {
  if (!isExtensionRuntimeAvailable()) {
    throw new Error('Page placeholders only work inside the browser extension.');
  }

  const tab = await getActiveTab();
  const tabUrl = tab.url || '';

  if (!tabUrl || /^chrome:|^edge:|^about:|^chrome-extension:|^edge-extension:/.test(tabUrl)) {
    throw new Error('This page does not allow page context extraction. Open a regular website tab and try again.');
  }

  let pageText = '';

  try {
    pageText = normalizePageText(await readPageText(tab.id!));
  } catch (error) {
    console.error('Failed to read page text:', error);
    throw new Error('Could not read the current page. Try a regular webpage instead of a browser-internal or protected page.');
  }

  if (!pageText) {
    throw new Error('The current page did not provide readable text for template placeholders.');
  }

  return {
    title: tab.title || '',
    url: tabUrl,
    pageText,
  };
};
