const enableSidePanel = async (): Promise<void> => {
  if (!chrome.sidePanel?.setPanelBehavior) {
    return;
  }

  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (error) {
    console.error('Failed to enable side panel behavior:', error);
  }
};

void enableSidePanel();

chrome.runtime.onInstalled.addListener(() => {
  void enableSidePanel();
});

chrome.runtime.onStartup.addListener(() => {
  void enableSidePanel();
});
