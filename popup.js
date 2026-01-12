// ============================================
// CONFIGURATION
// ============================================
const SUPABASE_URL = 'https://useriguacvbzucjddtke.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_waTr_uFc60uGxrGPDtClSw_UCuCxo8s';
const ANTILIBRARY_URL = 'https://antilibrary.netlify.app';

// ============================================
// STATE
// ============================================
let currentTab = null;
let session = null;
let selectedTags = [];
let allTags = [];

// ============================================
// UTILITIES
// ============================================
const detectContentType = (url) => {
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be') || lower.includes('vimeo.com')) return 'video';
  if (lower.includes('podcast') || lower.includes('spotify.com/episode') || lower.includes('anchor.fm')) return 'podcast';
  if (lower.includes('twitter.com') || lower.includes('x.com')) return 'tweet';
  if (lower.includes('linkedin.com')) return 'linkedin';
  return 'article';
};

const extractDomain = (url) => {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return ''; }
};

// ============================================
// SUPABASE API
// ============================================
const supabaseHeaders = () => ({
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${session?.access_token}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal'
});

const checkSession = async () => {
  // Try to get session from storage
  const stored = await chrome.storage.local.get(['supabase_session']);
  if (stored.supabase_session) {
    session = stored.supabase_session;
    
    // Check if session is expired
    const expiresAt = session.expires_at * 1000;
    if (Date.now() < expiresAt) {
      return session;
    }
    
    // Try to refresh
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: session.refresh_token })
      });
      
      if (response.ok) {
        session = await response.json();
        await chrome.storage.local.set({ supabase_session: session });
        return session;
      }
    } catch (e) {
      console.error('Refresh failed:', e);
    }
  }
  
  session = null;
  return null;
};

const fetchExistingTags = async () => {
  if (!session) return;
  
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/items?select=tags&user_id=eq.${session.user.id}`,
      { headers: supabaseHeaders() }
    );
    
    if (response.ok) {
      const data = await response.json();
      const tagSet = new Set();
      data.forEach(item => {
        if (item.tags && Array.isArray(item.tags)) {
          item.tags.forEach(tag => tagSet.add(tag));
        }
      });
      allTags = Array.from(tagSet).sort();
    }
  } catch (e) {
    console.error('Failed to fetch tags:', e);
  }
};

const saveItem = async (url, title) => {
  if (!session) throw new Error('Not authenticated');
  
  const response = await fetch(`${SUPABASE_URL}/rest/v1/items`, {
    method: 'POST',
    headers: supabaseHeaders(),
    body: JSON.stringify({
      user_id: session.user.id,
      url: url,
      title: title || extractDomain(url),
      type: detectContentType(url),
      domain: extractDomain(url),
      tags: selectedTags.length > 0 ? selectedTags : null,
      saved_at: new Date().toISOString(),
      is_read: false,
      is_archived: false
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to save');
  }
  
  return true;
};

// ============================================
// UI
// ============================================
const $ = (sel) => document.querySelector(sel);
const show = (el) => el.classList.remove('hidden');
const hide = (el) => el.classList.add('hidden');

const showStatus = (text, type = 'success') => {
  const status = $('#status');
  status.textContent = text;
  status.className = `status ${type}`;
  show(status);
};

const renderTags = () => {
  const wrapper = $('#tags-wrapper');
  const input = $('#tags-input');
  
  // Remove existing chips
  wrapper.querySelectorAll('.tag-chip').forEach(el => el.remove());
  
  // Add chips before input
  selectedTags.forEach(tag => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.innerHTML = `${tag}<span class="tag-remove" data-tag="${tag}">×</span>`;
    wrapper.insertBefore(chip, input);
  });
};

const showSuggestions = (query) => {
  const container = $('#suggestions');
  const q = query.toLowerCase().trim();
  
  if (!q) {
    container.className = 'suggestions';
    return;
  }
  
  const matching = allTags.filter(tag => 
    tag.toLowerCase().includes(q) && !selectedTags.includes(tag)
  );
  
  const exactMatch = allTags.some(tag => tag.toLowerCase() === q);
  const alreadySelected = selectedTags.some(tag => tag.toLowerCase() === q);
  
  let html = matching.slice(0, 5).map(tag => 
    `<div class="suggestion" data-tag="${tag}">${tag}</div>`
  ).join('');
  
  if (!exactMatch && !alreadySelected && q.length > 0) {
    html += `<div class="suggestion suggestion-new" data-tag="${q}">+ Create "${q}"</div>`;
  }
  
  if (html) {
    container.innerHTML = html;
    container.className = 'suggestions visible';
  } else {
    container.className = 'suggestions';
  }
};

const addTag = (tag) => {
  const normalized = tag.trim().toLowerCase();
  if (normalized && !selectedTags.includes(normalized)) {
    selectedTags.push(normalized);
    renderTags();
  }
  $('#tags-input').value = '';
  $('#suggestions').className = 'suggestions';
};

const removeTag = (tag) => {
  selectedTags = selectedTags.filter(t => t !== tag);
  renderTags();
};

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;
  
  // Show preview
  $('#preview-title').textContent = tab.title || 'Untitled';
  $('#preview-url').textContent = extractDomain(tab.url);
  
  // Check auth
  const hasSession = await checkSession();
  
  if (hasSession) {
    show($('#main-section'));
    await fetchExistingTags();
  } else {
    show($('#auth-section'));
  }
  
  // Event: Open app button
  $('#open-app-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: ANTILIBRARY_URL });
    window.close();
  });
  
  // Event: Settings link
  $('#settings-link').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: ANTILIBRARY_URL });
    window.close();
  });
  
  // Event: Tag input
  $('#tags-input').addEventListener('input', (e) => {
    showSuggestions(e.target.value);
  });
  
  $('#tags-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const value = e.target.value.trim();
      if (value) addTag(value);
    } else if (e.key === 'Backspace' && !e.target.value && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1]);
    }
  });
  
  // Event: Click on tags wrapper
  $('#tags-wrapper').addEventListener('click', (e) => {
    if (e.target.classList.contains('tag-remove')) {
      removeTag(e.target.dataset.tag);
    } else {
      $('#tags-input').focus();
    }
  });
  
  // Event: Click on suggestion
  $('#suggestions').addEventListener('click', (e) => {
    const suggestion = e.target.closest('.suggestion');
    if (suggestion) {
      addTag(suggestion.dataset.tag);
    }
  });
  
  // Event: Save button
  $('#save-btn').addEventListener('click', async () => {
    const btn = $('#save-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Saving...';
    
    try {
      await saveItem(currentTab.url, currentTab.title);
      
      btn.className = 'save-btn success';
      btn.innerHTML = '✓ Saved!';
      
      // Close popup after delay
      setTimeout(() => window.close(), 1000);
      
    } catch (error) {
      console.error('Save error:', error);
      showStatus(error.message, 'error');
      btn.disabled = false;
      btn.innerHTML = 'Save to AntiLibrary';
    }
  });
});

// ============================================
// MESSAGE LISTENER (for auth from web app)
// ============================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SUPABASE_SESSION') {
    session = message.session;
    chrome.storage.local.set({ supabase_session: session });
    sendResponse({ success: true });
  }
});
