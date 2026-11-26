# Changelog

## 2026-11-27
- Use local calendar dates instead of UTC ISO dates for mistake logging, today comparisons, task defaults, cloud migration, and revision date arithmetic — `src/App.jsx` and `src/revisionSchedule.js`; add a local-date regression test — `tests/revisionSchedule.test.js` — bug fix: entries created shortly after midnight in UTC+ time zones could be saved under the previous calendar day.

## 2026-11-14
- Serialized cloud autosaves and made restore wait for pending writes — `src/App.jsx` (`tasks`, `tests`, and `mistakes` autosave effects); `src/backupOperations.js` (`enqueueSerializedWrite`); `src/BackupRestoreView.jsx` (restore handler); `tests/backupOperations.test.js` (queue tests) — bug fix: an autosave already in flight could finish after restore began and overwrite restored data.
