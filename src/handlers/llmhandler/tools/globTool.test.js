import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { globTool } from './globTool.js';

// Fixture tree:
//   root/
//     a.js
//     b.ts
//     sub/
//       c.js
//       d.txt
//     node_modules/
//       ignored.js

const root = join(process.cwd(), '.tmp_glob_test');

before(() => {
  mkdirSync(join(root, 'sub'), { recursive: true });
  mkdirSync(join(root, 'node_modules'), { recursive: true });
  writeFileSync(join(root, 'a.js'), '');
  writeFileSync(join(root, 'b.ts'), '');
  writeFileSync(join(root, 'sub', 'c.js'), '');
  writeFileSync(join(root, 'sub', 'd.txt'), '');
  writeFileSync(join(root, 'node_modules', 'ignored.js'), '');
});

after(() => rmSync(root, { recursive: true, force: true }));

describe('globTool', () => {
  it('has the correct name', () => {
    assert.equal(globTool.name, 'glob_files');
  });

  it('matches all .js files with **/*.js', async () => {
    const result = await globTool.execute({ pattern: '**/*.js', path: root });
    assert.match(result, /a\.js/);
    assert.match(result, /sub\/c\.js/);
  });

  it('does not include node_modules', async () => {
    const result = await globTool.execute({ pattern: '**/*.js', path: root });
    assert.doesNotMatch(result, /node_modules/);
    assert.doesNotMatch(result, /ignored/);
  });

  it('matches only .ts files', async () => {
    const result = await globTool.execute({ pattern: '**/*.ts', path: root });
    assert.match(result, /b\.ts/);
    assert.doesNotMatch(result, /\.js/);
  });

  it('matches files in root only with *.js (no subdirectory)', async () => {
    const result = await globTool.execute({ pattern: '*.js', path: root });
    assert.match(result, /a\.js/);
    assert.doesNotMatch(result, /sub/);
  });

  it('returns a no-match message when pattern finds nothing', async () => {
    const result = await globTool.execute({ pattern: '**/*.go', path: root });
    assert.match(result, /No files matched/);
  });

  it('respects limit and appends truncation notice', async () => {
    const result = await globTool.execute({ pattern: '**/*.js', path: root, limit: 1 });
    assert.match(result, /Results capped/);
  });

  it('appends file count when not truncated', async () => {
    const result = await globTool.execute({ pattern: '**/*.ts', path: root });
    assert.match(result, /1 file matched/);
  });
});
