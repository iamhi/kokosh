import { XMLParser } from 'fast-xml-parser';

/**
 * RSS Tool for discovery.
 * Parses RSS/Atom feeds and returns structured items.
 */
export const rssTool = {
  name: 'rss_fetch',
  description: `Fetch and parse an RSS or Atom feed from a URL.
Returns a list of titles, links, and publication dates for the items in the feed.
Use this for discovery and monitoring news sources.`,
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The absolute URL of the RSS or Atom feed.',
      },
    },
    required: ['url'],
  },
  execute: async ({ url }) => {
    if (typeof url !== 'string' || url.trim() === '') {
      return 'Error: "url" parameter is required and must be a non-empty string.';
    }

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; KokoshRSS/1.0)',
        },
      });

      if (!response.ok) {
        return `Error fetching feed: ${response.status} ${response.statusText}`;
      }

      const xmlData = await response.text();
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
      });
      const jsonObj = parser.parse(xmlData);

      // Extract items from common feed formats (RSS 2.0, Atom)
      let items = [];
      let feedTitle = 'Unknown Feed';

      if (jsonObj.rss?.channel) {
        // RSS 2.0
        feedTitle = jsonObj.rss.channel.title || feedTitle;
        const rawItems = jsonObj.rss.channel.item;
        items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
      } else if (jsonObj.feed) {
        // Atom
        feedTitle = jsonObj.feed.title || feedTitle;
        const rawItems = jsonObj.feed.entry;
        items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
      } else if (jsonObj['rdf:RDF']) {
        // RSS 1.0 / RDF
        feedTitle = jsonObj['rdf:RDF'].channel?.title || feedTitle;
        const rawItems = jsonObj['rdf:RDF'].item;
        items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
      } else {
        return 'Error: Unrecognized feed format. Could not find items.';
      }

      if (items.length === 0) {
        return `Feed "${feedTitle}" contains no items.`;
      }

      const formattedItems = items.map((item, index) => {
        const title = item.title || '(No Title)';
        const link = item.link?.['@_href'] || item.link || '(No Link)';
        const pubDate = item.pubDate || item.published || item.updated || '(No Date)';
        const description = item.description || item.summary || '';
        
        let entry = `${index + 1}. Title: ${title}\n   Link: ${link}\n   Date: ${pubDate}`;
        if (description) {
          // Clean description/summary if it's an object or too long
          let descText = typeof description === 'string' ? description : JSON.stringify(description);
          descText = descText.replace(/<[^>]*>?/gm, '').trim(); // Basic HTML strip
          if (descText.length > 200) descText = descText.substring(0, 200) + '...';
          if (descText) entry += `\n   Summary: ${descText}`;
        }
        return entry;
      });

      return `Feed Title: ${feedTitle}\nURL: ${url}\n\n${formattedItems.join('\n\n')}`;
    } catch (err) {
      return `Error processing RSS feed: ${err.message}`;
    }
  },
};
