// Content script that runs on the AntiLibrary web app
// This bridges communication between the web page and the extension

// Listen for session updates from the web page
window.addEventListener('message', (event) => {
  // Only accept messages from the same origin
  if (event.origin !== window.location.origin) return;
  
  if (event.data && event.data.type === 'ANTILIBRARY_SESSION') {
    // Forward to background script
    chrome.runtime.sendMessage({
      type: 'SUPABASE_SESSION',
      session: event.data.session
    });
  }
});

// Check localStorage for existing session and sync it
const syncExistingSession = () => {
  try {
    // Supabase stores session in localStorage with a key pattern
    const keys = Object.keys(localStorage);
    const supabaseKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    
    if (supabaseKey) {
      const sessionData = JSON.parse(localStorage.getItem(supabaseKey));
      if (sessionData && sessionData.access_token) {
        chrome.runtime.sendMessage({
          type: 'SUPABASE_SESSION',
          session: sessionData
        });
        console.log('AntiLibrary Extension: Session synced from localStorage');
      }
    }
  } catch (e) {
    console.log('AntiLibrary Extension: Could not sync session', e);
  }
};

// Sync on page load
syncExistingSession();

// Also sync periodically in case of token refresh
setInterval(syncExistingSession, 30000);
