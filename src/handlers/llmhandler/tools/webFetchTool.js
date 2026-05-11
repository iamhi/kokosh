import { mkdirSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import { checkDirectoryAccess } from '../permissions/directoryGuard.js';
import { renderPage } from './web/pageRenderer.js';
import { urlToFilename } from './web/filename.js';

const DEFAULT_OUTPUT_DIR = 'scratch/web';

const resolveOutputDir = () => {
  const configured = process.env.WEB_FETCH_OUTPUT_DIR || DEFAULT_OUTPUT_DIR;
  return isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
};

const isValidHttpUrl = (input) => {
  try {
    const u = new URL(input);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

const formatLinks = (links, totalLinks) => {
  if (links.length === 0) return 'No links found on page.';

  const lines = [`Links found (deduped, max ${links.length === totalLinks ? totalLinks : 100}):`];
  for (const { url, description } of links) {
    lines.push(
      `- (url: ${url}, description: ${description || '(no description)'})`
    );
  }
  if (totalLinks > links.length) {
    lines.push(
      `[Showing first ${links.length} of ${totalLinks} links — fetch a more specific page if you need the rest.]`
    );
  } else {
    lines.push(`[${links.length} link${links.length === 1 ? '' : 's'} total]`);
  }
  return lines.join('\n');
};

const buildPreamble = (url, title) => {
  const header = title ? `# ${title}\n\n` : '';
  return `${header}Source: ${url}\nFetched: ${new Date().toISOString()}\n\n---\n\n`;
};

export const webFetchTool = {
  name: 'fetch_url',
  description: `Fetches a web page using a headless browser (renders JavaScript), converts the rendered HTML to Markdown, writes the result to a .md file, and returns the file path together with the hyperlinks found on the page so you can decide which links to follow next.

Use this when you need to read the content of a web page or discover what's linked from it.

The output directory is configurable via the WEB_FETCH_OUTPUT_DIR environment variable (default: scratch/web/ inside the project). Each URL produces a deterministic filename (slug + short hash), so re-fetching the same URL overwrites the previous .md file.

Parameters:
- url (required): An absolute http(s) URL to fetch.

Returns a string in the form:
  Saved page to: <absolute path to .md file>
  Title: <page title>
  Links found (deduped, max 100):
  - (url: https://..., description: ...)
  ...

If the fetch fails (invalid URL, navigation timeout, network error, page produces no extractable text), returns an error message string and does not write any file.`,
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'Absolute http(s) URL to fetch.',
      },
    },
    required: ['url'],
  },
  execute: async ({ url }) => {
    if (typeof url !== 'string' || url.trim() === '') {
      return 'Error: "url" parameter is required and must be a non-empty string.';
    }
    if (!isValidHttpUrl(url)) {
      return `Error: "${url}" is not a valid http(s) URL.`;
    }

    const outputDir = resolveOutputDir();

    const denied = checkDirectoryAccess(outputDir);
    if (denied) return denied;

    try {
      mkdirSync(outputDir, { recursive: true });
    } catch (err) {
      return `Error creating output directory "${outputDir}": ${err.message}`;
    }

    let rendered;
    try {
      rendered = await renderPage(url);
    } catch (err) {
      return `Error fetching "${url}": ${err.message}`;
    }

    const { title, cleanedHtml, links, totalLinks } = rendered;

    let markdownBody;
    try {
      markdownBody = new NodeHtmlMarkdown().translate(cleanedHtml || '');
    } catch (err) {
      return `Error converting page to markdown for "${url}": ${err.message}`;
    }

    if (!markdownBody.trim() && links.length === 0) {
      return `Error: page at "${url}" produced no extractable text content.`;
    }

    const fullMarkdown = buildPreamble(url, title) + markdownBody;
    const filepath = join(outputDir, urlToFilename(url));

    try {
      writeFileSync(filepath, fullMarkdown, 'utf8');
    } catch (err) {
      return `Error writing markdown to "${filepath}": ${err.message}`;
    }

    const titleLine = title ? `Title: ${title}\n\n` : '';
    return `Saved page to: ${filepath}\n\n${titleLine}${formatLinks(links, totalLinks)}`;
  },
};
