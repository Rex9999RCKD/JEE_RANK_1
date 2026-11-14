export const BACKUP_FORMAT = 'jee-rank-1-backup';
export const BACKUP_VERSION = 1;
export const BACKUP_COLLECTIONS = [
  { key: 'tasks', label: 'Tasks & schedules' },
  { key: 'tests', label: 'Test records' },
  { key: 'mistakes', label: 'Mistake logbook' }
];

export function validateBackup(parsed) {
  if (!parsed || parsed.format !== BACKUP_FORMAT || parsed.version !== BACKUP_VERSION) {
    throw new Error('This is not a supported JEE RANK 1 backup file.');
  }
  if (typeof parsed.account?.userId !== 'string' || !parsed.account.userId.trim()) {
    throw new Error('The backup is missing its account information.');
  }
  if (!parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data) ||
      !BACKUP_COLLECTIONS.every(({ key }) => Array.isArray(parsed.data[key]))) {
    throw new Error('The backup is incomplete or has an invalid structure.');
  }
  if (typeof parsed.exportedAt !== 'string' || !Number.isFinite(Date.parse(parsed.exportedAt))) {
    throw new Error('The backup date is missing or invalid.');
  }

  const total = BACKUP_COLLECTIONS.reduce((sum, item) => sum + parsed.data[item.key].length, 0);
  if (total > 100000) throw new Error('The backup contains too many records to restore safely.');

  for (const collection of BACKUP_COLLECTIONS) {
    const seenIds = new Set();
    for (const record of parsed.data[collection.key]) {
      if (!record || typeof record !== 'object' || Array.isArray(record)) {
        throw new Error(`The backup contains an invalid entry in ${collection.label}.`);
      }
      if (record.id !== undefined && record.id !== null) {
        if (typeof record.id !== 'string' && typeof record.id !== 'number') {
          throw new Error(`The backup contains an invalid record ID in ${collection.label}.`);
        }
        const normalizedId = String(record.id);
        if (seenIds.has(normalizedId)) {
          throw new Error(`The backup contains duplicate record IDs in ${collection.label}.`);
        }
        seenIds.add(normalizedId);
      }
    }
  }
  return parsed;
}
