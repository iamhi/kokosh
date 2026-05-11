import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { urlToFilename } from './filename.js';

describe('urlToFilename', () => {
  it('produces a slug + 8-char hash with .md extension', () => {
    const name = urlToFilename('https://example.com/products/shoes');
    assert.match(name, /^example-com-products-shoes-[a-f0-9]{8}\.md$/);
  });

  it('strips a leading www. from the host', () => {
    const name = urlToFilename('https://www.example.com/');
    assert.match(name, /^example-com-[a-f0-9]{8}\.md$/);
  });

  it('produces a stable filename for the same URL (overwritable)', () => {
    const url = 'https://example.com/a/b';
    assert.equal(urlToFilename(url), urlToFilename(url));
  });

  it('produces different filenames for different URLs', () => {
    const a = urlToFilename('https://example.com/a');
    const b = urlToFilename('https://example.com/b');
    assert.notEqual(a, b);
  });

  it('falls back to a page- prefix when slug would be empty', () => {
    const name = urlToFilename('https://./');
    assert.match(name, /^(page|url)-[a-f0-9]{8}\.md$/);
  });

  it('falls back to a url- prefix for unparseable input', () => {
    const name = urlToFilename('not a url');
    assert.match(name, /^url-[a-f0-9]{8}\.md$/);
  });

  it('caps slug length so filenames stay reasonable', () => {
    const long = 'https://example.com/' + 'segment/'.repeat(40);
    const name = urlToFilename(long);
    const slugPart = name.replace(/-[a-f0-9]{8}\.md$/, '');
    assert.ok(slugPart.length <= 60, `slug too long: ${slugPart.length}`);
  });

  it('lowercases the slug', () => {
    const name = urlToFilename('https://EXAMPLE.com/PathPart');
    assert.match(name, /^example-com-pathpart-[a-f0-9]{8}\.md$/);
  });

  it('handles a URL without a path', () => {
    const name = urlToFilename('https://example.com');
    assert.match(name, /^example-com-[a-f0-9]{8}\.md$/);
  });
});
