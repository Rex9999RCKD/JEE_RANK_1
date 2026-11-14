export function downloadJson(data, prefix = 'jee-rank-1-backup', platform = globalThis) {
  const blob = new platform.Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = platform.URL.createObjectURL(blob);
  const anchor = platform.document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  anchor.href = url;
  anchor.download = `${prefix}-${stamp}.json`;
  platform.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  platform.window.setTimeout(() => platform.URL.revokeObjectURL(url), 1000);
}

export function assertBackupAccount(backup, signedInUserId) {
  if (!signedInUserId || backup?.account?.userId !== signedInUserId) {
    throw new Error('This backup belongs to a different account. Sign in to the account that created it.');
  }
}

export async function replaceBackupCollections({ client, userId, incomingData, previousData, collections }) {
  const savedKeys = [];
  for (const item of collections) {
    const { error } = await client.from(item.table).upsert({
      user_id: userId,
      record_id: '__all__',
      data: incomingData[item.key]
    }, { onConflict: 'user_id,record_id' });

    if (!error) {
      savedKeys.push(item.key);
      continue;
    }

    let rollbackSucceeded = true;
    for (const savedKey of [...savedKeys].reverse()) {
      const previous = collections.find(collection => collection.key === savedKey);
      const rollback = await client.from(previous.table).upsert({
        user_id: userId,
        record_id: '__all__',
        data: previousData[savedKey]
      }, { onConflict: 'user_id,record_id' });
      if (rollback.error) rollbackSucceeded = false;
    }

    throw new Error(rollbackSucceeded
      ? `Restore failed while saving ${item.label}. Previously saved collections were rolled back; your safety backup was downloaded.`
      : `Restore failed while saving ${item.label}, and automatic rollback was incomplete. Use the downloaded pre-restore safety backup to recover your original data.`);
  }
}
