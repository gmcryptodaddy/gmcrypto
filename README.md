

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
