import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, unlinkSync } from 'node:fs';
import { readFileTool } from './readFileTool.js';

describe('readFileTool', () => {
  it('has the correct name', () => {
    assert.equal(readFileTool.name, 'read_file');
  });

  it('reads a file and returns its content', async () => {
    const tmp = '/tmp/kokosh_test_read.txt';
    writeFileSync(tmp, 'hello world');
    const result = await readFileTool.execute({ path: tmp });
    unlinkSync(tmp);
    assert.equal(result, 'hello world');
  });

  it('returns an error string when the file does not exist', async () => {
    const result = await readFileTool.execute({ path: '/tmp/no_such_file_kokosh.txt' });
    assert.match(result, /Error/);
  });
});
