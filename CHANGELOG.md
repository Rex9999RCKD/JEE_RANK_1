# Changelog

## 2026-11-14
- Serialized cloud autosaves and made restore wait for pending writes — `src/App.jsx` (`tasks`, `tests`, and `mistakes` autosave effects); `src/backupOperations.js` (`enqueueSerializedWrite`); `src/BackupRestoreView.jsx` (restore handler); `tests/backupOperations.test.js` (queue tests) — bug fix: an autosave already in flight could finish after restore began and overwrite restored data.
