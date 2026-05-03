import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const SKIP_DIRS = new Set(['node_modules', '.git', '.svn', '.hg', '.bzr']);

export function walkDir(root) {
  const files = [];

  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
        walk(join(dir, entry.name));
      } else if (entry.isFile()) {
        files.push(join(dir, entry.name));
      }
    }
  }

  walk(root);
  return files;
}

// Converts a glob pattern to a RegExp that matches forward-slash-separated relative paths.
// Handles: ** (any path segments), * (within one segment), ? (single char).
export function globToRegex(pattern) {
  const normalized = pattern.replace(/\\/g, '/');
  let regexStr = '';
  let i = 0;

  while (i < normalized.length) {
    const ch = normalized[i];

    if (ch === '*' && normalized[i + 1] === '*') {
      if (normalized[i + 2] === '/') {
        // **/ — zero or more path segments followed by /
        regexStr += '(?:.+/)?';
        i += 3;
      } else {
        // ** at end of pattern — anything
        regexStr += '.*';
        i += 2;
      }
    } else if (ch === '*') {
      regexStr += '[^/]*';
      i++;
    } else if (ch === '?') {
      regexStr += '[^/]';
      i++;
    } else {
      // Escape regex metacharacters
      regexStr += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
      i++;
    }
  }

  return new RegExp(`^${regexStr}$`);
}
