# GM Crypto — Setup Guide
## For Complete Beginners — No Coding Experience Needed

This guide will take you from zero to a live crypto news website in about 1 hour.
You will use 3 free tools: GitHub, Sanity, and Vercel.

---

## What You're Building

- **Your website**: gmcrypto.vercel.app (free domain from Vercel, or connect your own)
- **Your CMS (where you write articles)**: yourproject.sanity.studio (free)
- **Your code storage**: github.com/yourusername/gm-crypto (free)

---

## STEP 1 — Create a GitHub Account (5 min)

1. Go to **github.com** and sign up (free)
2. Create a new repository called `gm-crypto`
3. Set it to **Public**
4. Upload ALL the files from this project folder into that repository
   - Click "uploading an existing file" on GitHub
   - Drag and drop ALL the files from this folder
   - Click "Commit changes"

---

## STEP 2 — Set Up Sanity (your article editor) (10 min)

Sanity is where you'll write and publish your articles.

1. Go to **sanity.io** and sign up (free)
2. Click "Create new project"
3. Name it **GM Crypto**
4. Choose the **Free plan**
5. After creation, click on your project
6. Go to **Settings → API**
7. Copy your **Project ID** (looks like: `abc123de`) — save this, you'll need it!
8. Under "CORS Origins", click "Add new origin" and add: `http://localhost:3000`
   - Also add your future Vercel URL later (like `https://gm-crypto.vercel.app`)

### Add the Post Schema to Sanity

Sanity needs to know what fields your articles have.

1. In your Sanity project, click **"Manage"** → **"Schema"**
2. Or install Sanity Studio locally:
   - In terminal: `npm create sanity@latest -- --project YOUR_PROJECT_ID --dataset production`
   - Copy the content from the `sanity/post.schema.js` file in this project
   - Add it to your Sanity Studio schema

> **Easiest option**: Use Sanity's online Studio. After creating your project,
> go to `https://YOUR_PROJECT_ID.sanity.studio` and you can write articles there directly.

---

## STEP 3 — Connect Sanity to your website (2 min)

1. In this project folder, find the file called `.env.example`
2. Create a copy of it and name the copy: `.env.local`
3. Open `.env.local` and replace `your_project_id_here` with your actual Sanity Project ID

It should look like:
```
NEXT_PUBLIC_SANITY_PROJECT_ID=abc123de
NEXT_PUBLIC_SANITY_DATASET=production
```

---

## STEP 4 — Deploy to Vercel (get your live website) (10 min)

Vercel will host your website for free.

1. Go to **vercel.com** and sign up with your GitHub account
2. Click **"Add New Project"**
3. Find and select your `gm-crypto` repository
4. Before clicking "Deploy", click **"Environment Variables"**
5. Add these two variables:
   - Name: `NEXT_PUBLIC_SANITY_PROJECT_ID` | Value: `your_project_id`
   - Name: `NEXT_PUBLIC_SANITY_DATASET` | Value: `production`
6. Click **Deploy**
7. Wait ~2 minutes — your site is live! 🎉

You'll get a free URL like: `gm-crypto.vercel.app`

---

## STEP 5 — Write Your First Article (5 min)

1. Go to `https://YOUR_PROJECT_ID.sanity.studio`
2. Click **"Post"** → **"Create new post"**
3. Fill in:
   - **Title**: Your article headline
   - **Slug**: Click "Generate" (creates the URL automatically)
   - **Category**: Choose from the dropdown (Markets, Bitcoin, etc.)
   - **Published At**: Set today's date
   - **Excerpt**: 1-2 sentence summary
   - **Main Image**: Upload a cover image
   - **Body**: Write your article content
4. Click **"Publish"**
5. Wait ~1 minute, then refresh your website — the article appears automatically!

---

## STEP 6 — Connect a Custom Domain (optional, ~$10/year)

If you want `gmcrypto.com` instead of `gmcrypto.vercel.app`:

1. Buy a domain from **Namecheap** or **GoDaddy** (~$10/year)
2. In Vercel → your project → **Settings → Domains**
3. Add your domain name
4. Follow Vercel's instructions to update your DNS settings
5. Done! (takes up to 24 hours to fully activate)

---

## STEP 7 — Keeping Your Site Updated

Whenever you want to publish a new article:
1. Go to your Sanity Studio URL
2. Write and publish the article
3. Your website updates automatically within 60 seconds ✓

Whenever you want to change the website design:
1. Edit the files in GitHub directly (or hire a developer)
2. Vercel re-deploys automatically whenever you save changes to GitHub ✓

---

## Your Free Stack Summary

| Tool | What it does | Cost |
|------|-------------|------|
| GitHub | Stores your code | Free |
| Sanity | Where you write articles | Free (up to 3 users, 20GB) |
| Vercel | Hosts your website | Free (hobby tier) |
| **Total** | | **$0/month** |

---

## Need Help?

- Vercel docs: vercel.com/docs
- Sanity docs: sanity.io/docs
- Next.js docs: nextjs.org/docs

---

## What's Included in This Project

```
gm-crypto/
├── pages/
│   ├── index.js          ← Homepage
│   ├── post/[slug].js    ← Individual article pages
│   └── category/[cat].js ← Category pages (Markets, DeFi, etc.)
├── components/
│   ├── Navbar.js         ← Top navigation
│   ├── Ticker.js         ← Price ticker bar
│   ├── Sidebar.js        ← Markets widget + newsletter + categories
│   └── Footer.js         ← Site footer
├── lib/
│   ├── sanity.js         ← Sanity connection
│   └── queries.js        ← Database queries
├── styles/
│   └── globals.css       ← All styling
├── sanity/
│   └── post.schema.js    ← Article structure for Sanity
└── .env.example          ← Environment variables template
```

---

*Built with Next.js 14 + Sanity CMS. Designed for GM Crypto.*
