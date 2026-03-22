const path = require('path');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;
const FALLBACK_DATE_ISO = '2027-05-02';
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

const SCRAPE_SOURCES = [
  'https://neet.nta.nic.in/',
  'https://www.nta.ac.in/',
  'https://www.nta.ac.in/NoticeBoardArchive',
  'https://www.nta.ac.in/ExaminationServices'
];

const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
};

let cachedDate = FALLBACK_DATE_ISO;
let cachedSource = 'fallback-default';
let lastUpdatedAt = null;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const MONTH_MAP = {
  january: '01',
  february: '02',
  march: '03',
  april: '04',
  may: '05',
  june: '06',
  july: '07',
  august: '08',
  september: '09',
  october: '10',
  november: '11',
  december: '12'
};

function convertDatePartsToISO(day, month, year) {
  const normalizedDay = String(day).padStart(2, '0');
  const normalizedMonth = String(month).padStart(2, '0');
  return `${year}-${normalizedMonth}-${normalizedDay}`;
}

function extractDateFromText(text) {
  if (!text) {
    return null;
  }

  const normalizedText = text.replace(/\s+/g, ' ').trim().toLowerCase();

  if (!normalizedText.includes('neet')) {
    return null;
  }

  const monthNamesPattern = Object.keys(MONTH_MAP).join('|');

  const dayMonthYearPattern = new RegExp(
    `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthNamesPattern})\\s*,?\\s*(20\\d{2})\\b`,
    'i'
  );

  const monthDayYearPattern = new RegExp(
    `\\b(${monthNamesPattern})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*,?\\s*(20\\d{2})\\b`,
    'i'
  );

  const numericDatePattern = /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](20\d{2})\b/;

  let match = normalizedText.match(dayMonthYearPattern);
  if (match) {
    const [, day, monthName, year] = match;
    const month = MONTH_MAP[monthName.toLowerCase()];
    if (year === '2027' && month) {
      return convertDatePartsToISO(day, month, year);
    }
  }

  match = normalizedText.match(monthDayYearPattern);
  if (match) {
    const [, monthName, day, year] = match;
    const month = MONTH_MAP[monthName.toLowerCase()];
    if (year === '2027' && month) {
      return convertDatePartsToISO(day, month, year);
    }
  }

  match = normalizedText.match(numericDatePattern);
  if (match) {
    const [, day, month, year] = match;
    if (year === '2027') {
      return convertDatePartsToISO(day, month, year);
    }
  }

  return null;
}

function collectLikelySubLinks(baseUrl, $) {
  const links = new Set();

  $('a[href]').each((_, element) => {
    const rawHref = ($(element).attr('href') || '').trim();
    if (!rawHref) {
      return;
    }

    try {
      const normalizedUrl = new URL(rawHref, baseUrl).toString();
      if (/neet|notice|archive|bulletin|information|exam/i.test(normalizedUrl)) {
        links.add(normalizedUrl);
      }
    } catch (_error) {
      // Ignore malformed URLs from page markup.
    }
  });

  return Array.from(links).slice(0, 8);
}

function parseDateFromDom($) {
  const pageText = $('body').text();
  const directDate = extractDateFromText(pageText);
  if (directDate) {
    return directDate;
  }

  const candidates = [];
  $('body *').each((_, element) => {
    const elementText = $(element).text();
    if (elementText && /neet/i.test(elementText) && /2027/.test(elementText)) {
      candidates.push(elementText);
    }
  });

  for (const candidate of candidates) {
    const parsedDate = extractDateFromText(candidate);
    if (parsedDate) {
      return parsedDate;
    }
  }

  return null;
}

async function fetchUrlText(url) {
  const response = await axios.get(url, {
    timeout: 15000,
    headers: REQUEST_HEADERS
  });
  return response.data;
}

async function scrapeDateFromSource(sourceUrl) {
  const html = await fetchUrlText(sourceUrl);
  const $ = cheerio.load(html);

  const parsedOnPrimary = parseDateFromDom($);
  if (parsedOnPrimary) {
    return { date: parsedOnPrimary, source: sourceUrl };
  }

  const linkedPages = collectLikelySubLinks(sourceUrl, $);
  for (const linkedUrl of linkedPages) {
    try {
      const linkedHtml = await fetchUrlText(linkedUrl);
      const $$ = cheerio.load(linkedHtml);
      const parsedOnLinkedPage = parseDateFromDom($$);
      if (parsedOnLinkedPage) {
        return { date: parsedOnLinkedPage, source: linkedUrl };
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Linked page scrape failed (${linkedUrl}): ${error.message}`);
    }
  }

  throw new Error('Unable to locate NEET 2027 exam date in this source.');
}

async function resolveNeetDateFromInternet() {
  for (const sourceUrl of SCRAPE_SOURCES) {
    try {
      return await scrapeDateFromSource(sourceUrl);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Source scrape failed (${sourceUrl}): ${error.message}`);
    }
  }

  return { date: FALLBACK_DATE_ISO, source: 'fallback-default' };
}

async function refreshCachedDate() {
  const resolved = await resolveNeetDateFromInternet();
  cachedDate = resolved.date;
  cachedSource = resolved.source;
  lastUpdatedAt = new Date().toISOString();
  console.log(`[${lastUpdatedAt}] Cached NEET date updated: ${cachedDate} (source: ${cachedSource})`);
}

app.get('/api/neet-date', (_req, res) => {
  res.json({
    date: cachedDate,
    source: cachedSource,
    lastUpdatedAt
  });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

refreshCachedDate();
setInterval(refreshCachedDate, REFRESH_INTERVAL_MS);

app.listen(PORT, () => {
  console.log(`NEET countdown server running on http://localhost:${PORT}`);
});
