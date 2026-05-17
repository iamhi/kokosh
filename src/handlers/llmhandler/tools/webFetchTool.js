import { mkdir, writeFile } from 'node:fs/promises';
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
  description: `Download and read a webpage from the internet.
Extracts the main text content, converts it to Markdown format, and saves it locally.
Use this for web research, reading articles, or gathering data from websites.
It returns the local path to the saved document and a list of links found on the page.`,
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
      await mkdir(outputDir, { recursive: true });
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
      await writeFile(filepath, fullMarkdown, 'utf8');
    } catch (err) {
      return `Error writing markdown to "${filepath}": ${err.message}`;
    }

    const titleLine = title ? `Title: ${title}\n\n` : '';
    return `Saved page to: ${filepath}\n\n${titleLine}${formatLinks(links, totalLinks)}`;
  },
};
