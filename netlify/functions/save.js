// Netlify serverless function for iOS Shortcut quick-save
// This handles auth refresh and saving in one request

const SUPABASE_URL = 'https://useriguacvbzucjddtke.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_waTr_uFc60uGxrGPDtClSw_UCuCxo8s';

const detectContentType = (url) => {
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be') || lower.includes('vimeo.com')) return 'video';
  if (lower.includes('podcast') || lower.includes('spotify.com/episode') || lower.includes('anchor.fm')) return 'podcast';
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

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { refresh_token, user_id, url, title, tags } = body;

    // Validate required fields
    if (!refresh_token || !user_id || !url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: refresh_token, user_id, url' }),
      };
    }

    // Step 1: Refresh the access token
    const tokenResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Failed to refresh token. Please re-authenticate in the app.', details: err }),
      };
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Step 2: Save the item
    const itemUrl = url.startsWith('http') ? url : `https://${url}`;
    const itemData = {
      user_id,
      url: itemUrl,
      title: title || extractDomain(itemUrl),
      type: detectContentType(itemUrl),
      domain: extractDomain(itemUrl),
      tags: tags && tags.length > 0 ? tags : null,
      saved_at: new Date().toISOString(),
      is_read: false,
      is_archived: false,
    };

    const saveResponse = await fetch(`${SUPABASE_URL}/rest/v1/items`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(itemData),
    });

    if (!saveResponse.ok) {
      const err = await saveResponse.text();
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to save item', details: err }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Saved to AntiLibrary',
        // Return new refresh token if it was rotated
        new_refresh_token: tokenData.refresh_token !== refresh_token ? tokenData.refresh_token : null,
      }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server error', details: error.message }),
    };
  }
};
