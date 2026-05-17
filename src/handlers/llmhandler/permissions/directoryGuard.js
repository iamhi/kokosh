import { readFileSync, statSync } from 'node:fs';
import { resolve, normalize, sep, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CONFIG_PATH = join(dirname(fileURLToPath(import.meta.url)), '../../../../permissions.json');

function loadAllowedDirs() {
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf8');
    const config = JSON.parse(raw);
    return config.directories ?? [];
  } catch {
    return [];
  }
}

function isUnder(childPath, parentPattern) {
  const child = normalize(resolve(childPath));

  if (parentPattern.startsWith('*')) {
    // Treat as suffix match: e.g. "*/kokosh" -> matches ".../kokosh" or ".../kokosh/..."
    const suffix = normalize(parentPattern.replace(/^\*/, ''));
    return child.endsWith(suffix) || child.includes(suffix + sep);
  }

  const parent = normalize(resolve(parentPattern));
  return child === parent || child.startsWith(parent + sep);
}

function suggestDir(resolvedPath) {
  try {
    if (statSync(resolvedPath).isFile()) return dirname(resolvedPath);
  } catch {
    // path may not exist yet; treat as directory
  }
  return resolvedPath;
}

// Returns null if access is allowed, or a denial message string if not.
export function checkDirectoryAccess(targetPath) {
  const resolved = normalize(resolve(targetPath));
  const allowed = loadAllowedDirs();

  if (allowed.some((dir) => isUnder(resolved, dir))) return null;

  const suggested = suggestDir(resolved);
  return (
    `Access denied: "${resolved}" is outside the accessible directories.\n` +
    `To allow access, add "${suggested}" to the "directories" list in permissions.json`
  );
}
