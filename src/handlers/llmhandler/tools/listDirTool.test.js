import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { listDirTool } from './listDirTool.js';

const tmp = join(process.cwd(), '.tmp_listdir_test');

before(() => {
  mkdirSync(tmp, { recursive: true });
  mkdirSync(join(tmp, 'subdir'));
  writeFileSync(join(tmp, 'file1.txt'), 'content');
  writeFileSync(join(tmp, 'file2.txt'), 'content');
});

after(() => rmSync(tmp, { recursive: true, force: true }));

describe('listDirTool', () => {
  it('has the correct name', () => {
    assert.equal(listDirTool.name, 'list_directory');
  });

  it('lists directory contents with [DIR] and [FILE] markers', async () => {
    const result = await listDirTool.execute({ path: tmp });
    assert.match(result, /\[DIR\]\tsubdir/);
    assert.match(result, /\[FILE\]\tfile1\.txt/);
    assert.match(result, /\[FILE\]\tfile2\.txt/);
  });

  it('returns an error for non-existent directories', async () => {
    const result = await listDirTool.execute({ path: join(tmp, 'missing') });
    assert.match(result, /Error listing directory/);
  });

  it('identifies empty directories', async () => {
    const emptyDir = join(tmp, 'empty');
    mkdirSync(emptyDir);
    const result = await listDirTool.execute({ path: emptyDir });
    assert.match(result, /is empty/);
  });
});
