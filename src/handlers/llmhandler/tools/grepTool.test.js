import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { grepTool } from './grepTool.js';

// Fixture tree:
//   root/
//     alpha.js   — contains "hello world" and "foo bar"
//     beta.ts    — contains "hello typescript"
//     gamma.txt  — contains "no match here"
//     binary.bin — binary file (should be skipped)

const root = join(tmpdir(), 'kokosh_grep_test');

before(() => {
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, 'alpha.js'), 'hello world\nfoo bar\n');
  writeFileSync(join(root, 'beta.ts'), 'hello typescript\n');
  writeFileSync(join(root, 'gamma.txt'), 'no match here\n');
  // Binary file: contains a null byte
  const bin = Buffer.alloc(16, 0);
  bin.write('data', 0);
  writeFileSync(join(root, 'binary.bin'), bin);
});

after(() => rmSync(root, { recursive: true, force: true }));

describe('grepTool', () => {
  it('has the correct name', () => {
    assert.equal(grepTool.name, 'grep_files');
  });

  it('returns files containing a match in files_with_matches mode', async () => {
    const result = await grepTool.execute({ pattern: 'hello', path: root });
    assert.match(result, /alpha\.js/);
    assert.match(result, /beta\.ts/);
    assert.doesNotMatch(result, /gamma\.txt/);
  });

  it('does not return files with no match', async () => {
    const result = await grepTool.execute({ pattern: 'hello', path: root });
    assert.doesNotMatch(result, /gamma\.txt/);
  });

  it('skips binary files', async () => {
    const result = await grepTool.execute({ pattern: 'data', path: root });
    assert.doesNotMatch(result, /binary\.bin/);
  });

  it('content mode returns matching lines with file and line number', async () => {
    const result = await grepTool.execute({
      pattern: 'hello',
      path: root,
      output_mode: 'content',
    });
    assert.match(result, /alpha\.js:1: hello world/);
    assert.match(result, /beta\.ts:1: hello typescript/);
  });

  it('content mode does not include non-matching lines', async () => {
    const result = await grepTool.execute({
      pattern: 'hello',
      path: root,
      output_mode: 'content',
    });
    assert.doesNotMatch(result, /foo bar/);
    assert.doesNotMatch(result, /no match/);
  });

  it('include filter restricts which files are searched', async () => {
    const result = await grepTool.execute({
      pattern: 'hello',
      path: root,
      include: '*.js',
    });
    assert.match(result, /alpha\.js/);
    assert.doesNotMatch(result, /beta\.ts/);
  });

  it('returns a no-match message when nothing is found', async () => {
    const result = await grepTool.execute({ pattern: 'xyzzy_not_found', path: root });
    assert.match(result, /No matches found/);
  });

  it('returns an error for an invalid regex', async () => {
    const result = await grepTool.execute({ pattern: '[invalid', path: root });
    assert.match(result, /Error/);
  });

  it('respects limit and appends truncation notice', async () => {
    const result = await grepTool.execute({
      pattern: 'hello',
      path: root,
      limit: 1,
    });
    assert.match(result, /Results capped/);
  });

  it('appends match count when not truncated', async () => {
    const result = await grepTool.execute({ pattern: 'hello', path: root });
    assert.match(result, /files found/);
  });
});
