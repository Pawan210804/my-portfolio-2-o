# Pawan Rai — Portfolio

Personal portfolio site for Pawan Rai (Full Stack & AI/ML Engineer). Static HTML/CSS/JS site served by a small Express server for local development, deployed as a static site on Vercel.

## Run Locally

**Prerequisites:** Node.js

```
npm install
npm run dev
```

Then open http://localhost:3000.

## Project structure

- `index.html` — the entire site (single page)
- `server.js` — local dev server (Express) with security headers and rate limiting; not used in production, since the Vercel deployment serves the files statically
- `sitemap.xml` / `robots.txt` — SEO files, served directly by Vercel (see `vercel.json` for their headers)
- `resume.pdf`, `og-image.png`, `favicon-*.png`, `favicon.svg`, `lock-screen.mp4` — static assets
