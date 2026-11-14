import React, { useRef, useState } from 'react';
import { Download, Upload, ShieldCheck, AlertTriangle, CheckCircle2, Database } from 'lucide-react';
import { supabase } from './supabase';
import { BACKUP_FORMAT, BACKUP_VERSION, BACKUP_COLLECTIONS, validateBackup } from './backupValidation';
import { downloadJson, assertBackupAccount, replaceBackupCollections } from './backupOperations';
const COLLECTIONS = BACKUP_COLLECTIONS.map(item => ({ ...item, table: `jee_${item.key}` }));

export default function BackupRestoreView({ tasks, tests, mistakes, setTasks, setTests, setMistakes, cloudReady, restoreInProgressRef, remoteSyncRef, cloudWriteQueueRef }) {
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
      setStatus('Backup download was started. Check your browser downloads and keep the file somewhere safe.');
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
      if (!restoreInProgressRef || !remoteSyncRef) throw new Error('Restore synchronization safeguards are unavailable. Please reload and try again.');
      if (!cloudWriteQueueRef) throw new Error('Cloud save coordination is unavailable. Please reload and try again.');

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Please sign in again before restoring.');
      assertBackupAccount(selectedBackup, user.id);

      // Pause new autosaves, then wait for every already-queued cloud write
      // to settle before taking the safety copy or replacing any collection.
      restoreInProgressRef.current = true;
      await cloudWriteQueueRef.current;

      // Create a safety copy belonging to the verified signed-in account only
      // after pending writes have completed.
      const safetyBackup = {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        app: 'JEE RANK 1',
        exportedAt: new Date().toISOString(),
        account: { userId: user.id },
        data: currentData,
        note: 'Safety copy created before a restore attempt.'
      };
      downloadJson(safetyBackup, 'jee-rank-1-pre-restore-safety');

      await replaceBackupCollections({
        client: supabase,
        userId: user.id,
        incomingData: selectedBackup.data,
        previousData: currentData,
        collections: COLLECTIONS
      });

      // Mark the incoming values as remote-originated so the normal autosave effects
      // do not race the restore with redundant writes after React applies state.
      remoteSyncRef.current.tasks = selectedBackup.data.tasks;
      remoteSyncRef.current.tests = selectedBackup.data.tests;
      remoteSyncRef.current.mistakes = selectedBackup.data.mistakes;
      setTasks(selectedBackup.data.tasks);
      setTests(selectedBackup.data.tests);
      setMistakes(selectedBackup.data.mistakes);
      setStatus('Restore completed. A pre-restore safety-backup download was started; check your browser downloads. Keep both files safe.');
      setSelectedBackup(null);
      setConfirmRestore(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      setBackupError(error.message || 'Restore failed.');
    } finally {
      if (restoreInProgressRef) restoreInProgressRef.current = false;
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