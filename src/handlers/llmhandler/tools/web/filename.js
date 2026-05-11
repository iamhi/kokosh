import { createHash } from 'node:crypto';

const MAX_SLUG_LENGTH = 60;
const HASH_LENGTH = 8;

const shortHash = (input) =>
  createHash('sha1').update(input).digest('hex').slice(0, HASH_LENGTH);

const slugify = (host, pathname) => {
  const cleanHost = host.replace(/^www\./i, '');
  const cleanPath = pathname.replace(/\/+$/, '');
  return `${cleanHost}${cleanPath}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/, '');
};

export const urlToFilename = (url) => {
  const hash = shortHash(url);
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return `url-${hash}.md`;
  }
  const slug = slugify(parsed.hostname, parsed.pathname);
  return slug ? `${slug}-${hash}.md` : `page-${hash}.md`;
};
