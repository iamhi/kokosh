import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { writeFileTool } from './writeFileTool.js';

const tmp = join(process.cwd(), '.tmp_writefile_test');

before(() => {});
after(() => rmSync(tmp, { recursive: true, force: true }));

describe('writeFileTool', () => {
  it('has the correct name', () => {
    assert.equal(writeFileTool.name, 'write_file');
  });

  it('writes content to a file', async () => {
    const file = join(tmp, 'test.txt');
    const content = 'hello research';
    const result = await writeFileTool.execute({ path: file, content });
    assert.match(result, /Successfully wrote/);
    assert.equal(readFileSync(file, 'utf8'), content);
  });

  it('creates parent directories automatically', async () => {
    const file = join(tmp, 'nested/dir/structure/note.txt');
    const content = 'nested content';
    const result = await writeFileTool.execute({ path: file, content });
    assert.match(result, /Successfully wrote/);
    assert.ok(existsSync(file));
    assert.equal(readFileSync(file, 'utf8'), content);
  });

  it('overwrites existing files', async () => {
    const file = join(tmp, 'overwrite.txt');
    await writeFileTool.execute({ path: file, content: 'first' });
    await writeFileTool.execute({ path: file, content: 'second' });
    assert.equal(readFileSync(file, 'utf8'), 'second');
  });
});
