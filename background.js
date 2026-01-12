const ANTILIBRARY_URL = 'https://antilibrary.netlify.app';

// Listen for messages from the web app to sync auth
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.type === 'SUPABASE_SESSION') {
    chrome.storage.local.set({ supabase_session: message.session }, () => {
      sendResponse({ success: true });
    });
    return true; // Keep channel open for async response
  }
});

// Also listen for internal messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SUPABASE_SESSION') {
    chrome.storage.local.set({ supabase_session: message.session }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});
