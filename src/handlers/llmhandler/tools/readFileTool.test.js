import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, unlinkSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readFileTool } from './readFileTool.js';

const tmp = join(tmpdir(), 'kokosh_readfile_test');

before(() => mkdirSync(tmp, { recursive: true }));
after(() => rmSync(tmp, { recursive: true, force: true }));

describe('readFileTool', () => {
  it('has the correct name', () => {
    assert.equal(readFileTool.name, 'read_file');
  });

  it('reads a file and returns numbered lines', async () => {
    const file = join(tmp, 'basic.txt');
    writeFileSync(file, 'hello\nworld');
    const result = await readFileTool.execute({ path: file });
    assert.match(result, /1\thello/);
    assert.match(result, /2\tworld/);
  });

  it('returns an error string when the file does not exist', async () => {
    const result = await readFileTool.execute({ path: join(tmp, 'no_such_file.txt') });
    assert.match(result, /Error/);
  });

  it('respects offset — starts from the given line', async () => {
    const file = join(tmp, 'offset.txt');
    writeFileSync(file, 'line1\nline2\nline3\nline4');
    const result = await readFileTool.execute({ path: file, offset: 3 });
    assert.doesNotMatch(result, /line1/);
    assert.doesNotMatch(result, /line2/);
    assert.match(result, /3\tline3/);
    assert.match(result, /4\tline4/);
  });

  it('respects limit — returns at most N lines', async () => {
    const file = join(tmp, 'limit.txt');
    writeFileSync(file, 'a\nb\nc\nd\ne');
    const result = await readFileTool.execute({ path: file, limit: 2 });
    assert.match(result, /1\ta/);
    assert.match(result, /2\tb/);
    assert.doesNotMatch(result, /3\tc/);
  });

  it('appends a truncation notice when file has more lines than limit', async () => {
    const file = join(tmp, 'trunc.txt');
    writeFileSync(file, 'a\nb\nc\nd\ne');
    const result = await readFileTool.execute({ path: file, limit: 2 });
    assert.match(result, /Truncated/);
    assert.match(result, /offset=3/);
  });

  it('does not append a truncation notice when all lines are returned', async () => {
    const file = join(tmp, 'full.txt');
    writeFileSync(file, 'a\nb\nc');
    const result = await readFileTool.execute({ path: file, limit: 10 });
    assert.doesNotMatch(result, /Truncated/);
  });

  it('combines offset and limit correctly', async () => {
    const file = join(tmp, 'combo.txt');
    writeFileSync(file, 'a\nb\nc\nd\ne');
    const result = await readFileTool.execute({ path: file, offset: 2, limit: 2 });
    assert.match(result, /2\tb/);
    assert.match(result, /3\tc/);
    assert.doesNotMatch(result, /1\ta/);
    assert.doesNotMatch(result, /4\td/);
  });
});
