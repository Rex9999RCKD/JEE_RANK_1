import React, { useRef, useState } from 'react';
import { Download, Upload, ShieldCheck, AlertTriangle, CheckCircle2, Database } from 'lucide-react';
import { supabase } from './supabase';
import { BACKUP_FORMAT, BACKUP_VERSION, BACKUP_COLLECTIONS, validateBackup } from './backupValidation';
const COLLECTIONS = BACKUP_COLLECTIONS.map(item => ({ ...item, table: `jee_${item.key}` }));

function downloadJson(data, prefix = 'jee-rank-1-backup') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  anchor.href = url;
  anchor.download = `${prefix}-${stamp}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke after the browser has had time to begin the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function BackupRestoreView({ tasks, tests, mistakes, setTasks, setTests, setMistakes, cloudReady }) {
  const fileInputRef = useRef(null);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [backupError, setBackupError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);

  const currentData = { tasks, tests, mistakes };

  const createBackup = async () => {
    setBackupError('');
    setStatus('');
    try {
      if (!cloudReady) throw new Error('Cloud data is not ready yet. Please wait and try again.');
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) throw new Error('Please sign in again before creating a backup.');
      const backup = {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        app: 'JEE RANK 1',
        exportedAt: new Date().toISOString(),
        account: { userId: user.id },
        data: currentData
      };
      downloadJson(backup);
      setStatus('Backup downloaded successfully. Keep this file somewhere safe.');
    } catch (error) {
      setBackupError(error.message || 'Could not create the backup.');
    }
  };

  const readBackup = async (file) => {
    setSelectedBackup(null);
    setConfirmRestore(false);
    setBackupError('');
    setStatus('');
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('Backup file is larger than 10 MB.');
      const parsed = validateBackup(JSON.parse(await file.text()));
      setSelectedBackup(parsed);
    } catch (error) {
      setBackupError(error.message || 'Could not read this backup file.');
    }
  };

  const restoreBackup = async () => {
    setBackupError('');
    setStatus('');
    if (!selectedBackup) return;
    setBusy(true);
    try {
      if (!cloudReady) throw new Error('Cloud data is not ready. Please wait and try again.');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Please sign in again before restoring.');
      if (selectedBackup.account.userId !== user.id) {
        throw new Error('This backup belongs to a different account. Sign in to the account that created it.');
      }

      // Download a safety copy of the currently loaded data before replacing anything.
      const safetyBackup = {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        app: 'JEE RANK 1',
        exportedAt: new Date().toISOString(),
        account: { userId: user.id },
        data: currentData,
        note: 'Automatically created immediately before a restore.'
      };
      downloadJson(safetyBackup, 'jee-rank-1-pre-restore-safety');

      const savedKeys = [];
      for (const item of COLLECTIONS) {
        const { error } = await supabase.from(item.table).upsert({
          user_id: user.id,
          record_id: '__all__',
          data: selectedBackup.data[item.key]
        }, { onConflict: 'user_id,record_id' });
        if (error) {
          let rollbackSucceeded = true;
          for (const savedKey of savedKeys.reverse()) {
            const previous = COLLECTIONS.find(collection => collection.key === savedKey);
            const rollback = await supabase.from(previous.table).upsert({
              user_id: user.id,
              record_id: '__all__',
              data: currentData[savedKey]
            }, { onConflict: 'user_id,record_id' });
            if (rollback.error) rollbackSucceeded = false;
          }
          throw new Error(rollbackSucceeded
            ? `Restore failed while saving ${item.label}. Previously saved collections were rolled back; your safety backup was downloaded.`
            : `Restore failed while saving ${item.label}, and automatic rollback was incomplete. Use the downloaded pre-restore safety backup to recover your original data.`);
        }
        savedKeys.push(item.key);
      }

      setTasks(selectedBackup.data.tasks);
      setTests(selectedBackup.data.tests);
      setMistakes(selectedBackup.data.mistakes);
      setStatus('Restore completed. Your pre-restore safety backup was also downloaded. Keep both files safe.');
      setSelectedBackup(null);
      setConfirmRestore(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      setBackupError(error.message || 'Restore failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Backup & Restore</h2>
        <p className="text-sm text-slate-500 mt-1">Download a copy of your JEE RANK 1 records or restore them from a previous backup.</p>
      </div>

      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-700"><Download className="w-5 h-5" /></div>
          <div><h3 className="font-bold text-slate-900">Create a backup</h3><p className="text-xs text-slate-500">Download your current data as a JSON file.</p></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {COLLECTIONS.map(item => <div key={item.key} className="rounded-lg bg-slate-50 p-3"><Database className="w-4 h-4 text-slate-500 mb-1" /><strong>{item.label}</strong><p className="text-slate-500 mt-1">{currentData[item.key].length} records</p></div>)}
        </div>
        <button onClick={createBackup} disabled={!cloudReady || busy} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm px-4 py-2.5">
          <Download className="w-4 h-4" /> Download JSON Backup
        </button>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700"><Upload className="w-5 h-5" /></div>
          <div><h3 className="font-bold text-slate-900">Restore from a backup</h3><p className="text-xs text-slate-500">Choose a JEE RANK 1 JSON backup to inspect it before restoring.</p></div>
        </div>
        <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={e => readBackup(e.target.files?.[0])} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold" />
        {selectedBackup && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-900"><ShieldCheck className="w-4 h-4" /> Backup file validated</div>
            <p className="text-emerald-800">Created: {new Date(selectedBackup.exportedAt).toLocaleString()}</p>
            <p className="text-emerald-800">Tasks: {selectedBackup.data.tasks.length} · Tests: {selectedBackup.data.tests.length} · Mistakes: {selectedBackup.data.mistakes.length}</p>
            <p className="text-emerald-800">Restoration replaces these three collections in the currently signed-in account.</p>
            {!confirmRestore ? (
              <button onClick={() => setConfirmRestore(true)} className="mt-2 rounded-lg bg-emerald-700 px-4 py-2 font-bold text-white">Continue to restore</button>
            ) : (
              <div className="space-y-2">
                <p className="font-bold text-rose-800">Final confirmation: your current tasks, tests and mistakes will be replaced by this backup. A safety backup of your current data will download first.</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={restoreBackup} disabled={busy} className="rounded-lg bg-rose-700 px-4 py-2 font-bold text-white disabled:opacity-50">{busy ? 'Restoring…' : 'Yes, replace my data'}</button>
                  <button onClick={() => setConfirmRestore(false)} disabled={busy} className="rounded-lg border border-slate-300 px-4 py-2 font-bold text-slate-700">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <p>Keep downloaded backups private. They contain your study records. Restore only files you trust, and use the same account that created the backup.</p>
      </div>
      {status && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 flex gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" />{status}</div>}
      {backupError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{backupError}</div>}
    </div>
  );
}
