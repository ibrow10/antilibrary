# AntiLibrary Setup Guide

Your personal read-it-later app with sync across all devices.

---

## Part 1: Supabase Setup (5 minutes)

### Step 1: Create a Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project" and sign up (GitHub login is fastest)
3. Create a new project:
   - **Name**: `antilibrary` (or whatever you like)
   - **Database Password**: Generate a strong one and save it somewhere
   - **Region**: Choose closest to you (e.g., London)
4. Wait ~2 minutes for the project to spin up

### Step 2: Create the Database Table

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New query**
3. Paste this entire SQL block and click **Run**:

```sql
-- Create the items table
CREATE TABLE items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'article',
  domain TEXT,
  tags TEXT[],
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX items_user_id_idx ON items(user_id);
CREATE INDEX items_saved_at_idx ON items(saved_at DESC);
CREATE INDEX items_tags_idx ON items USING GIN(tags);

-- Enable Row Level Security
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own items
CREATE POLICY "Users can view own items" ON items
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own items
CREATE POLICY "Users can insert own items" ON items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own items
CREATE POLICY "Users can update own items" ON items
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own items
CREATE POLICY "Users can delete own items" ON items
  FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for the items table
ALTER PUBLICATION supabase_realtime ADD TABLE items;
```

You should see "Success. No rows returned" - that's correct.

### Step 2b: Add Description and Tags (if upgrading)

If you already have the items table and want to add the new description and tags features, run this migration:

```sql
-- Add description column for link previews
ALTER TABLE items ADD COLUMN IF NOT EXISTS description TEXT;

-- Add tags column (array of text) for categorization
ALTER TABLE items ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Create index for faster tag filtering
CREATE INDEX IF NOT EXISTS items_tags_idx ON items USING GIN(tags);
```

### Step 3: Configure Authentication

1. Go to **Authentication** → **Providers** (left sidebar)
2. Email should already be enabled
3. Go to **Authentication** → **URL Configuration**
4. Under **Site URL**, enter where you'll host the app:
   - For testing: `http://localhost:3000`
   - For production: Your actual URL (e.g., `https://antilibrary.yourdomain.com`)

### Step 4: Get Your API Keys

1. Go to **Settings** → **API** (left sidebar)
2. Copy these two values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (the long string under "Project API keys")

### Step 5: Update the App

Open `app.jsx` and replace lines 8-9:

```javascript
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

---

## Part 2: Chrome Bookmarklet

This lets you save any page with one click from your bookmarks bar.

### Installation

1. Show your bookmarks bar (Cmd+Shift+B on Mac, Ctrl+Shift+B on Windows)
2. Right-click the bookmarks bar → "Add page..."
3. **Name**: `+ AntiLibrary`
4. **URL**: Paste this entire line (replace YOUR_APP_URL with your actual URL):

```javascript
javascript:(function(){window.open('YOUR_APP_URL?url='+encodeURIComponent(window.location.href)+'&title='+encodeURIComponent(document.title),'_blank')})();
```

**Example with a real URL:**
```javascript
javascript:(function(){window.open('https://antilibrary.vercel.app?url='+encodeURIComponent(window.location.href)+'&title='+encodeURIComponent(document.title),'_blank')})();
```

### Usage

1. Navigate to any article, video, or tweet you want to save
2. Click the bookmarklet in your bookmarks bar
3. AntiLibrary opens with the URL pre-filled
4. Click "Save to AntiLibrary"

---

## Part 3: iOS Shortcut (Safari Share Sheet)

This adds "Save to AntiLibrary" to your iPhone's share menu.

### Installation

1. Open the **Shortcuts** app on your iPhone
2. Tap **+** to create a new shortcut
3. Add these actions in order:

**Action 1: Receive Input**
- Tap "Add Action"
- Search for "Receive"
- Select "Receive **any** input from **Share Sheet**"

**Action 2: Get URLs**
- Tap "+"
- Search for "URLs"
- Select "Get URLs from Input"
- Set input to "Shortcut Input"

**Action 3: Open URL**
- Tap "+"
- Search for "Open URLs"
- For the URL field, tap and select "URL" from the variables
- Tap on the URL variable and change it to:

```
YOUR_APP_URL?url=[URL]
```

But actually, we need to construct the URL. Here's the better approach:

**Alternative Method (More Reliable):**

1. Tap "+" → Search "Text"
2. In the text field, type:
   ```
   YOUR_APP_URL?url=
   ```
3. After that text, tap "Select Variable" → "URLs"

4. Tap "+" → Search "Open URLs"
5. Set it to open the Text from step 2

### Finalize the Shortcut

1. Tap the shortcut name at top → Rename to "AntiLibrary"
2. Tap the icon → Choose 📚 or any icon you like
3. Tap "Share Sheet" toggle to ON (under "Show in Share Sheet")
4. Set "Share Sheet Types" to: URLs, Safari web pages

### Usage

1. In Safari (or Twitter, LinkedIn, etc.), tap the Share button
2. Scroll down and tap "AntiLibrary"
3. The app opens with the URL ready to save

---

## Part 4: Deployment Options

### Option A: Vercel (Recommended - Free)

1. Push the code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click "Import Project" and select your repo
4. Vercel auto-detects React and deploys
5. Your app is live at `https://your-project.vercel.app`

### Option B: Netlify (Also Free)

1. Go to [netlify.com](https://netlify.com)
2. Drag your build folder to deploy, or connect GitHub
3. Your app is live at `https://your-project.netlify.app`

### Option C: Run Locally

```bash
# If you have Node.js installed
npx create-react-app antilibrary
# Replace src/App.js with the app.jsx content
# Add Supabase: npm install @supabase/supabase-js
npm start
```

---

## Part 5: Final Checklist

- [ ] Supabase project created
- [ ] Database table and policies created (SQL ran successfully)
- [ ] API keys copied into app.jsx
- [ ] App deployed to Vercel/Netlify
- [ ] Updated Supabase Site URL to your deployed URL
- [ ] Chrome bookmarklet installed (with your app URL)
- [ ] iOS Shortcut created (with your app URL)
- [ ] Test: Save an article from Chrome
- [ ] Test: Save a tweet from iPhone Safari
- [ ] Test: Sign in on both devices, confirm sync works

---

## Troubleshooting

**"Invalid API key"**
- Double-check you copied the `anon` key, not the `service_role` key

**Magic link email not arriving**
- Check spam folder
- Supabase free tier has email limits; wait a few minutes

**Items not syncing between devices**
- Make sure you're signed into the same email on both
- Check browser console for errors

**Bookmarklet not working**
- Make sure you replaced YOUR_APP_URL with your actual deployed URL
- The URL must start with `https://`

**iOS Shortcut not showing in Share Sheet**
- Go to Settings → Shortcuts → toggle on "Allow Running Scripts"
- Make sure "Show in Share Sheet" is enabled in the shortcut settings

---

## Support

The app stores everything in your own Supabase database - you own your data completely. 

To export all your data: Supabase Dashboard → Table Editor → items → Export to CSV

Enjoy your AntiLibrary! 📚
