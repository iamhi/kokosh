import { getBrowser } from './browserPool.js';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const BLOCKED_RESOURCE_TYPES = ['image', 'font', 'media', 'stylesheet'];
const NAV_TIMEOUT_MS = 45000;
const MAX_LINKS = 100;
const MAX_DESCRIPTION_LENGTH = 200;

const extractInPage = (maxLinks, maxDescLen) => {
  let title = (document.title || '').trim();
  if (!title) {
    const og = document.querySelector('meta[property="og:title"]');
    title = (og?.getAttribute('content') || '').trim();
  }

  const links = [];
  const seen = new Set();
  let totalLinks = 0;

  for (const a of document.querySelectorAll('a[href]')) {
    const raw = a.getAttribute('href');
    if (!raw) continue;

    let abs;
    try {
      abs = new URL(raw, document.baseURI).href;
    } catch {
      continue;
    }

    if (!/^https?:\/\//i.test(abs)) continue;

    totalLinks++;

    if (seen.has(abs)) continue;
    seen.add(abs);

    if (links.length >= maxLinks) continue;

    let description = (a.textContent || '').replace(/\s+/g, ' ').trim();
    if (!description) description = (a.getAttribute('title') || '').trim();
    if (!description) description = (a.getAttribute('aria-label') || '').trim();
    if (!description) {
      const img = a.querySelector('img');
      if (img) description = (img.getAttribute('alt') || '').trim();
    }
    if (description.length > maxDescLen) {
      description = description.slice(0, maxDescLen) + '...';
    }

    links.push({ url: abs, description });
  }

  document
    .querySelectorAll('script, style, svg, noscript, iframe')
    .forEach((el) => el.remove());

  const cleanedHtml = document.body?.innerHTML || '';

  return { title, cleanedHtml, links, totalLinks };
};

export const renderPage = async (url) => {
  let page = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    await page.setUserAgent(USER_AGENT);

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (BLOCKED_RESOURCE_TYPES.includes(req.resourceType())) req.abort();
      else req.continue();
    });

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: NAV_TIMEOUT_MS,
    });

    return await page.evaluate(
      extractInPage,
      MAX_LINKS,
      MAX_DESCRIPTION_LENGTH
    );
  } finally {
    if (page) await page.close().catch(() => {});
  }
};

export const RENDERER_LIMITS = {
  MAX_LINKS,
  MAX_DESCRIPTION_LENGTH,
  NAV_TIMEOUT_MS,
};
