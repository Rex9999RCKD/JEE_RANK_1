import test from 'node:test';
import assert from 'node:assert/strict';
import { BACKUP_FORMAT, BACKUP_VERSION, validateBackup } from '../src/backupValidation.js';

const validBackup = () => ({
  format: BACKUP_FORMAT,
  version: BACKUP_VERSION,
  exportedAt: '2026-11-14T10:00:00.000Z',
  account: { userId: 'user-123' },
  data: { tasks: [{ id: 't1' }], tests: [], mistakes: [{ id: 'm1' }] }
});

test('accepts a valid backup with all three collections', () => {
  assert.equal(validateBackup(validBackup()).data.tasks.length, 1);
});

test('rejects unsupported format or version', () => {
  const backup = validBackup();
  backup.version = 99;
  assert.throws(() => validateBackup(backup), /supported/);
});

test('rejects missing account, date, or collection', () => {
  const noAccount = validBackup(); delete noAccount.account;
  assert.throws(() => validateBackup(noAccount), /account/);
  const noDate = validBackup(); noDate.exportedAt = 'not-a-date';
  assert.throws(() => validateBackup(noDate), /date/);
  const noMistakes = validBackup(); delete noMistakes.data.mistakes;
  assert.throws(() => validateBackup(noMistakes), /incomplete/);
});

test('rejects non-object records and duplicate IDs', () => {
  const invalidRecord = validBackup(); invalidRecord.data.tasks = [null];
  assert.throws(() => validateBackup(invalidRecord), /invalid entry/);
  const duplicate = validBackup(); duplicate.data.tasks = [{ id: 'same' }, { id: 'same' }];
  assert.throws(() => validateBackup(duplicate), /duplicate/);
});

test('rejects invalid ID types', () => {
  const backup = validBackup(); backup.data.tests = [{ id: {} }];
  assert.throws(() => validateBackup(backup), /invalid record ID/);
});

test('rejects backups exceeding the record safety limit', () => {
  const backup = validBackup();
  backup.data.tasks = Array.from({ length: 100001 }, (_, id) => ({ id }));
  assert.throws(() => validateBackup(backup), /too many records/);
});
