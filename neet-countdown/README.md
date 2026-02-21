# NEET 2027 Countdown

A production-ready Node.js + Express website that displays an aesthetic live countdown to the NEET 2027 exam date.

## Features

- Live countdown timer for days, hours, minutes, and seconds.
- Timer updates every second.
- Backend scrapes the latest date from multiple internet sources (official NTA NEET and NTA pages).
- Exam date is converted to ISO format (`YYYY-MM-DD`).
- Cached date refreshes automatically every 24 hours.
- Fallback date (`2027-05-02`) is used if scraping fails.
- API endpoint available at `GET /api/neet-date`.
- Responsive, mobile-optimized, dark glassmorphism UI.

## Project Structure

```bash
neet-countdown/
├── server.js
├── package.json
├── README.md
└── public/
    ├── index.html
    ├── style.css
    └── script.js
```

## Installation

```bash
npm install
```

## Run Locally

```bash
node server.js
```

Then open: `http://localhost:3000`

## API

### `GET /api/neet-date`

Returns:

```json
{
  "date": "YYYY-MM-DD"
}
```

Example response:

```json
{
  "date": "2027-05-02",
  "source": "fallback-default",
  "lastUpdatedAt": "2026-01-01T12:00:00.000Z"
}
```

## Deployment

### Render

1. Create a new **Web Service** from this repo.
2. Build command: `npm install`
3. Start command: `node server.js`
4. Set environment variable (optional): `PORT`

### Railway

1. Create a new project from GitHub.
2. Railway auto-detects Node.js.
3. Set start command to `node server.js` if required.

### Vercel

Vercel is optimized for serverless functions. For a persistent Express server, prefer Render or Railway. If using Vercel, wrap Express with a serverless adapter and deploy accordingly.

## Notes

- Scraping depends on the current content structure of `https://neet.nta.nic.in/`.
- If date format changes or the site blocks scraping, fallback date is returned safely.
- Server logs scraping errors without crashing.
