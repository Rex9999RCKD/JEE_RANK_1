import test from 'node:test';
import assert from 'node:assert/strict';
import { assertBackupAccount, downloadJson, replaceBackupCollections } from '../src/backupOperations.js';

const collections = [
  { key: 'tasks', table: 'jee_tasks', label: 'Tasks' },
  { key: 'tests', table: 'jee_tests', label: 'Tests' },
  { key: 'mistakes', table: 'jee_mistakes', label: 'Mistakes' }
];

function makeClient(failAt = null, failRollback = false) {
  const calls = [];
  return {
    calls,
    from(table) {
      return { upsert: async (row, options) => {
        calls.push({ table, row, options });
        const isRollback = row.data?.[0]?.source === 'old';
        if (table === failAt && !isRollback) return { error: new Error('simulated write failure') };
        if (failRollback && table === 'jee_tasks' && isRollback) return { error: new Error('simulated rollback failure') };
        return { error: null };
      }};
    }
  };
}

test('rejects restoring a backup into a different signed-in account', () => {
  assert.throws(() => assertBackupAccount({ account: { userId: 'user-a' } }, 'user-b'), /different account/);
  assert.doesNotThrow(() => assertBackupAccount({ account: { userId: 'user-a' } }, 'user-a'));
});

test('writes all three collections for the authenticated user', async () => {
  const client = makeClient();
  const incoming = { tasks: [{ id: 'new' }], tests: [], mistakes: [] };
  await replaceBackupCollections({ client, userId: 'user-a', incomingData: incoming, previousData: {}, collections });
  assert.equal(client.calls.length, 3);
  assert.ok(client.calls.every(call => call.row.user_id === 'user-a' && call.row.record_id === '__all__'));
});

test('rolls back earlier collection writes after a later write fails', async () => {
  const client = makeClient('jee_tests');
  const previous = { tasks: [{ source: 'old' }], tests: [], mistakes: [] };
  await assert.rejects(
    replaceBackupCollections({ client, userId: 'user-a', incomingData: { tasks: [], tests: [], mistakes: [] }, previousData: previous, collections }),
    /rolled back/
  );
  assert.equal(client.calls.length, 3);
  assert.deepEqual(client.calls[2].row.data, previous.tasks);
});

test('reports incomplete rollback clearly', async () => {
  const client = makeClient('jee_tests', true);
  await assert.rejects(
    replaceBackupCollections({ client, userId: 'user-a', incomingData: { tasks: [], tests: [], mistakes: [] }, previousData: { tasks: [{ source: 'old' }] }, collections }),
    /rollback was incomplete/
  );
});

test('downloads a JSON file and revokes its object URL after the click', () => {
  const events = [];
  let timeoutCallback;
  const anchor = { click: () => events.push('click'), remove: () => events.push('remove') };
  const platform = {
    Blob: class { constructor(parts, options) { this.parts = parts; this.options = options; } },
    URL: { createObjectURL: blob => { events.push('create'); assert.equal(blob.options.type, 'application/json'); return 'blob:test'; }, revokeObjectURL: url => events.push('revoke:' + url) },
    document: { body: { appendChild: () => events.push('append') }, createElement: tag => { assert.equal(tag, 'a'); return anchor; } },
    window: { setTimeout: callback => { timeoutCallback = callback; } }
  };
  downloadJson({ hello: 'world' }, 'test-backup', platform);
  assert.deepEqual(events, ['create', 'append', 'click', 'remove']);
  assert.match(anchor.download, /^test-backup-.*\.json$/);
  assert.equal(anchor.href, 'blob:test');
  timeoutCallback();
  assert.equal(events.at(-1), 'revoke:blob:test');
});

test('serializes cloud writes and waits for an earlier write before the next', async () => {
  const queueRef = { current: Promise.resolve() };
  const events = [];
  let releaseFirst;
  const first = enqueueSerializedWrite(queueRef, async () => {
    events.push('first-start');
    await new Promise(resolve => { releaseFirst = resolve; });
    events.push('first-end');
  });
  const second = enqueueSerializedWrite(queueRef, async () => {
    events.push('second-start');
  });
  await Promise.resolve();
  assert.deepEqual(events, ['first-start']);
  releaseFirst();
  await Promise.all([first, second]);
  assert.deepEqual(events, ['first-start', 'first-end', 'second-start']);
});

test('a failed queued write is visible to the restore barrier and does not block later queued writes', async () => {
  const queueRef = { current: Promise.resolve() };
  const failure = new Error('cloud save failed');
  const first = enqueueSerializedWrite(queueRef, async () => { throw failure; });
  const second = enqueueSerializedWrite(queueRef, async () => 'later write completed');
  await assert.rejects(first, /cloud save failed/);
  assert.equal(await second, 'later write completed');
});
