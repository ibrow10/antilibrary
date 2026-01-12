import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIGURATION - Replace with your Supabase credentials
// ============================================
const SUPABASE_URL = 'https://useriguacvbzucjddtke.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_waTr_uFc60uGxrGPDtClSw_UCuCxo8s';

// Chrome Extension ID - get this from chrome://extensions after installing the extension
// Look for the "ID" field under your AntiLibrary extension
const CHROME_EXTENSION_ID = 'lmdbclpgjpidnpmjnphcefplomafpbfj';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Sync session to Chrome extension
const syncSessionToExtension = (session) => {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage && CHROME_EXTENSION_ID !== 'YOUR_EXTENSION_ID_HERE') {
    try {
      chrome.runtime.sendMessage(
        CHROME_EXTENSION_ID,
        { type: 'SUPABASE_SESSION', session },
        (response) => {
          if (chrome.runtime.lastError) {
            console.log('Extension sync: Extension not installed or unreachable');
          } else if (response?.success) {
            console.log('Extension sync: Session synced successfully');
          }
        }
      );
    } catch (e) {
      console.log('Extension sync: Failed to communicate with extension');
    }
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

const detectContentType = (url) => {
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be') || lower.includes('vimeo.com') || lower.includes('video')) return 'video';
  if (lower.includes('podcast') || lower.includes('spotify.com/episode') || lower.includes('anchor.fm') || lower.includes('overcast.fm') || lower.includes('.mp3')) return 'podcast';
  if (lower.includes('twitter.com') || lower.includes('x.com')) return 'tweet';
  if (lower.includes('linkedin.com')) return 'linkedin';
  return 'article';
};

const extractDomain = (url) => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
};

const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

// ============================================
// ICONS
// ============================================

const TypeIcon = ({ type }) => {
  const icons = {
    article: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
    video: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
    podcast: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
      </svg>
    ),
    tweet: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    linkedin: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    other: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  };
  return icons[type] || icons.other;
};

const LoadingSpinner = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25" />
    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
  </svg>
);

// ============================================
// AUTH COMPONENT
// ============================================

const AuthScreen = ({ onAuth }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Check your email for the magic link!');
    }
    setLoading(false);
  };

  return (
    <div style={styles.authContainer}>
      <div style={styles.authCard}>
        <div style={styles.authHeader}>
          <h1 style={styles.authLogo}>AntiLibrary</h1>
          <p style={styles.authTagline}>Your unread collection awaits</p>
        </div>
        
        <form onSubmit={handleSubmit} style={styles.authForm}>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.authInput}
            required
          />
          <button type="submit" disabled={loading} style={styles.authButton}>
            {loading ? <LoadingSpinner /> : 'Send Magic Link'}
          </button>
        </form>
        
        {message && (
          <p style={{
            ...styles.authMessage,
            color: message.includes('Check') ? '#2d7d32' : '#c53030',
          }}>
            {message}
          </p>
        )}
        
        <p style={styles.authFooter}>
          No password needed. We'll email you a sign-in link.
        </p>
      </div>
    </div>
  );
};

// ============================================
// MAIN APP COMPONENT
// ============================================

export default function AntiLibrary() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [filter, setFilter] = useState('unread');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState('');

  // Check for URL params (for bookmarklet/shortcut)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get('url');
    const titleParam = params.get('title');
    
    if (urlParam) {
      setNewUrl(decodeURIComponent(urlParam));
      if (titleParam) setNewTitle(decodeURIComponent(titleParam));
      setIsAdding(true);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchItems();
        // Sync session to Chrome extension
        syncSessionToExtension(session);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchItems();
        // Sync session to Chrome extension on login or token refresh
        syncSessionToExtension(session);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch items from Supabase
  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('saved_at', { ascending: false });

    if (error) {
      console.error('Error fetching items:', error);
      showToast('Failed to load items');
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('items_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'items', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setItems(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setItems(prev => prev.map(item => item.id === payload.new.id ? payload.new : item));
          } else if (payload.eventType === 'DELETE') {
            setItems(prev => prev.filter(item => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [user]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 2500);
  };

  // Add new item
  const addItem = async () => {
    if (!newUrl.trim()) return;
    
    let url = newUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    setSyncing(true);
    const { error } = await supabase.from('items').insert({
      user_id: user.id,
      url,
      title: newTitle.trim() || extractDomain(url),
      type: detectContentType(url),
      domain: extractDomain(url),
      saved_at: new Date().toISOString(),
      is_read: false,
      is_archived: false,
    });

    if (error) {
      showToast('Failed to save');
      console.error(error);
    } else {
      showToast('Saved to AntiLibrary');
      setNewUrl('');
      setNewTitle('');
      setIsAdding(false);
    }
    setSyncing(false);
  };

  // Update item
  const updateItem = async (id, updates) => {
    const { error } = await supabase
      .from('items')
      .update(updates)
      .eq('id', id);

    if (error) {
      showToast('Failed to update');
      console.error(error);
    }
  };

  // Delete item
  const deleteItem = async (id) => {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', id);

    if (error) {
      showToast('Failed to delete');
      console.error(error);
    } else {
      showToast('Deleted');
    }
  };

  // Share item
  const shareItem = async (item) => {
    const shareData = { title: item.title, url: item.url };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (e) {
        if (e.name !== 'AbortError') copyToClipboard(item.url);
      }
    } else {
      copyToClipboard(item.url);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Link copied!');
  };

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut();
    setItems([]);
  };

  // Filter items
  const filteredItems = items.filter(item => {
    if (filter === 'unread' && (item.is_read || item.is_archived)) return false;
    if (filter === 'archived' && !item.is_archived) return false;
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return item.title?.toLowerCase().includes(query) || 
             item.url?.toLowerCase().includes(query) ||
             item.domain?.toLowerCase().includes(query);
    }
    return true;
  });

  const stats = {
    total: items.length,
    unread: items.filter(i => !i.is_read && !i.is_archived).length,
    archived: items.filter(i => i.is_archived).length,
  };

  // Show auth screen if not logged in
  if (!user && !loading) {
    return <AuthScreen />;
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>
          <LoadingSpinner />
          <span style={{ marginLeft: 12 }}>Loading your AntiLibrary...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } }
        input:focus, select:focus { border-color: #1a1a1a !important; outline: none; }
        button:hover { opacity: 0.85; }
        .item-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); transform: translateY(-1px); }
        .action-btn:hover { background-color: #e8e6e3 !important; color: #1a1a1a !important; }
      `}</style>

      {/* Toast */}
      {toast && <div style={styles.toast}>{toast}</div>}

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <div>
            <h1 style={styles.logo}>AntiLibrary</h1>
            <p style={styles.userEmail}>{user?.email}</p>
          </div>
          <div style={styles.headerActions}>
            {syncing && <LoadingSpinner />}
            <button onClick={() => setIsAdding(!isAdding)} style={styles.addButton}>
              {isAdding ? '×' : '+'}
            </button>
            <button onClick={signOut} style={styles.signOutButton}>
              Sign out
            </button>
          </div>
        </div>

        {/* Add form */}
        {isAdding && (
          <div style={styles.addForm}>
            <input
              type="url"
              placeholder="Paste URL here..."
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !newTitle && addItem()}
              style={styles.input}
              autoFocus
            />
            <input
              type="text"
              placeholder="Title (optional - we'll use the domain)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addItem()}
              style={styles.input}
            />
            <button onClick={addItem} disabled={syncing} style={styles.saveButton}>
              {syncing ? 'Saving...' : 'Save to AntiLibrary'}
            </button>
          </div>
        )}

        {/* Search */}
        <div style={styles.searchBox}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={styles.searchIcon}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search your library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {/* Filters */}
        <div style={styles.filters}>
          <div style={styles.filterGroup}>
            {['unread', 'all', 'archived'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  ...styles.filterButton,
                  ...(filter === f ? styles.filterButtonActive : {}),
                }}
              >
                {f === 'unread' ? `Unread (${stats.unread})` : 
                 f === 'archived' ? `Archived (${stats.archived})` : 
                 `All (${stats.total})`}
              </button>
            ))}
          </div>
          <div style={styles.filterGroup}>
            {['all', 'article', 'video', 'podcast', 'tweet', 'linkedin'].map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                style={{
                  ...styles.typeButton,
                  ...(typeFilter === t ? styles.typeButtonActive : {}),
                }}
                title={t}
              >
                {t === 'all' ? 'All' : <TypeIcon type={t} />}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main style={styles.main}>
        {filteredItems.length === 0 ? (
          <div style={styles.emptyState}>
            {items.length === 0 ? (
              <>
                <div style={styles.emptyIcon}>📚</div>
                <p style={styles.emptyTitle}>Your AntiLibrary is empty</p>
                <p style={styles.emptySubtitle}>
                  The books you haven't read are more valuable than the ones you have.
                  <br />Start saving articles, videos, and podcasts.
                </p>
              </>
            ) : (
              <p style={styles.emptyTitle}>No items match your filters</p>
            )}
          </div>
        ) : (
          <ul style={styles.list}>
            {filteredItems.map(item => (
              <li key={item.id} className="item-card" style={styles.item}>
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    ...styles.itemLink,
                    ...(item.is_read ? styles.itemLinkRead : {}),
                  }}
                  onClick={() => !item.is_read && updateItem(item.id, { is_read: true })}
                >
                  <div style={styles.itemHeader}>
                    <span style={{
                      ...styles.typeBadge,
                      ...styles[`typeBadge_${item.type}`] || styles.typeBadge_other,
                    }}>
                      <TypeIcon type={item.type} />
                      <span>{item.type}</span>
                    </span>
                    <span style={styles.itemDate}>{formatDate(item.saved_at)}</span>
                  </div>
                  <h3 style={styles.itemTitle}>{item.title}</h3>
                  <p style={styles.itemDomain}>{item.domain}</p>
                </a>
                
                <div style={styles.itemActions}>
                  <select
                    value={item.type}
                    onChange={(e) => updateItem(item.id, { type: e.target.value })}
                    style={styles.typeSelect}
                  >
                    <option value="article">Article</option>
                    <option value="video">Video</option>
                    <option value="podcast">Podcast</option>
                    <option value="tweet">Tweet</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="other">Other</option>
                  </select>
                  
                  <button
                    className="action-btn"
                    onClick={() => updateItem(item.id, { is_read: !item.is_read })}
                    style={styles.actionButton}
                    title={item.is_read ? 'Mark unread' : 'Mark read'}
                  >
                    {item.is_read ? '◉' : '○'}
                  </button>
                  
                  <button
                    className="action-btn"
                    onClick={() => shareItem(item)}
                    style={styles.actionButton}
                    title="Share"
                  >
                    ↗
                  </button>
                  
                  <button
                    className="action-btn"
                    onClick={() => updateItem(item.id, { is_archived: !item.is_archived })}
                    style={styles.actionButton}
                    title={item.is_archived ? 'Unarchive' : 'Archive'}
                  >
                    {item.is_archived ? '↩' : '✓'}
                  </button>
                  
                  <button
                    className="action-btn"
                    onClick={() => deleteItem(item.id)}
                    style={styles.actionButton}
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer style={styles.footer}>
        AntiLibrary • The unread shapes who you are
      </footer>
    </div>
  );
}

// ============================================
// STYLES
// ============================================

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8f7f4',
    fontFamily: "'Newsreader', 'Source Serif Pro', Georgia, serif",
    color: '#1a1a1a',
  },
  loadingState: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    color: '#666',
    fontStyle: 'italic',
  },
  toast: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: "'Inter', -apple-system, sans-serif",
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease',
  },
  
  // Auth styles
  authContainer: {
    minHeight: '100vh',
    backgroundColor: '#f8f7f4',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  authCard: {
    backgroundColor: '#fff',
    padding: '48px 40px',
    borderRadius: '16px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center',
  },
  authHeader: {
    marginBottom: '32px',
  },
  authLogo: {
    fontSize: '32px',
    fontWeight: '600',
    margin: '0 0 8px',
    letterSpacing: '-1px',
  },
  authTagline: {
    color: '#666',
    margin: 0,
    fontSize: '16px',
    fontStyle: 'italic',
  },
  authForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  authInput: {
    padding: '16px',
    fontSize: '16px',
    border: '2px solid #e8e6e3',
    borderRadius: '10px',
    fontFamily: "'Inter', -apple-system, sans-serif",
    textAlign: 'center',
  },
  authButton: {
    padding: '16px',
    fontSize: '16px',
    fontWeight: '600',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontFamily: "'Inter', -apple-system, sans-serif",
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  authMessage: {
    marginTop: '16px',
    fontSize: '14px',
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  authFooter: {
    marginTop: '24px',
    fontSize: '13px',
    color: '#999',
    fontFamily: "'Inter', -apple-system, sans-serif",
  },

  // Header styles
  header: {
    padding: '24px 24px 0',
    maxWidth: '800px',
    margin: '0 auto',
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  logo: {
    fontSize: '28px',
    fontWeight: '600',
    margin: 0,
    letterSpacing: '-0.5px',
  },
  userEmail: {
    fontSize: '12px',
    color: '#888',
    margin: '4px 0 0',
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  addButton: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    fontSize: '24px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutButton: {
    padding: '10px 16px',
    fontSize: '13px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: '#fff',
    color: '#666',
    cursor: 'pointer',
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  addForm: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    border: '1px solid #e8e6e3',
    animation: 'slideIn 0.2s ease',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    fontSize: '16px',
    border: '1px solid #e8e6e3',
    borderRadius: '8px',
    marginBottom: '12px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  saveButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  searchBox: {
    position: 'relative',
    marginBottom: '16px',
  },
  searchIcon: {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#999',
  },
  searchInput: {
    width: '100%',
    padding: '14px 14px 14px 44px',
    fontSize: '16px',
    border: '1px solid #e8e6e3',
    borderRadius: '10px',
    backgroundColor: '#fff',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  filters: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '8px',
  },
  filterGroup: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap',
  },
  filterButton: {
    padding: '8px 14px',
    fontSize: '13px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#666',
    cursor: 'pointer',
    borderRadius: '6px',
    fontFamily: "'Inter', -apple-system, sans-serif",
    transition: 'all 0.15s',
  },
  filterButtonActive: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
  },
  typeButton: {
    padding: '8px 10px',
    fontSize: '13px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#666',
    cursor: 'pointer',
    borderRadius: '6px',
    fontFamily: "'Inter', -apple-system, sans-serif",
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.15s',
  },
  typeButtonActive: {
    backgroundColor: '#e8e6e3',
    color: '#1a1a1a',
  },

  // Main content
  main: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '16px 24px 100px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '18px',
    color: '#666',
    margin: '0 0 8px',
  },
  emptySubtitle: {
    fontSize: '14px',
    color: '#999',
    margin: 0,
    lineHeight: 1.6,
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  item: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    marginBottom: '12px',
    border: '1px solid #e8e6e3',
    overflow: 'hidden',
    transition: 'box-shadow 0.2s, transform 0.2s',
  },
  itemLink: {
    display: 'block',
    padding: '20px',
    textDecoration: 'none',
    color: 'inherit',
  },
  itemLinkRead: {
    opacity: 0.55,
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  typeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontFamily: "'Inter', -apple-system, sans-serif",
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  typeBadge_article: { backgroundColor: '#e8f4f8', color: '#0077a3' },
  typeBadge_video: { backgroundColor: '#fce8e8', color: '#c53030' },
  typeBadge_podcast: { backgroundColor: '#e8f8e8', color: '#2d7d32' },
  typeBadge_tweet: { backgroundColor: '#e8e8e8', color: '#1a1a1a' },
  typeBadge_linkedin: { backgroundColor: '#e8f0f8', color: '#0a66c2' },
  typeBadge_other: { backgroundColor: '#f0f0f0', color: '#666' },
  itemDate: {
    fontSize: '12px',
    color: '#999',
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  itemTitle: {
    fontSize: '18px',
    fontWeight: '600',
    margin: '0 0 6px',
    lineHeight: 1.35,
    letterSpacing: '-0.2px',
  },
  itemDomain: {
    fontSize: '13px',
    color: '#888',
    margin: 0,
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  itemActions: {
    display: 'flex',
    gap: '4px',
    padding: '10px 16px',
    borderTop: '1px solid #f0f0f0',
    backgroundColor: '#fafafa',
    alignItems: 'center',
  },
  typeSelect: {
    padding: '6px 10px',
    fontSize: '12px',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    backgroundColor: '#fff',
    fontFamily: "'Inter', -apple-system, sans-serif",
    cursor: 'pointer',
    marginRight: 'auto',
  },
  actionButton: {
    width: '32px',
    height: '32px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#888',
    cursor: 'pointer',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    transition: 'all 0.15s',
  },
  footer: {
    textAlign: 'center',
    padding: '24px',
    color: '#aaa',
    fontSize: '12px',
    fontFamily: "'Inter', -apple-system, sans-serif",
    fontStyle: 'italic',
  },
};
