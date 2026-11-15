import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  scheduleMistakeDecision,
  advanceLongTermReview,
  migrateMistakeSchedules
} from '../src/revisionSchedule.js';

test('Yes schedules the next 3-day reminder from the date answered', () => {
  const mistake = { id: 'm1', loggedDate: '2026-11-01', reminderCount: 2, status: 'Pending Revision' };
  const next = scheduleMistakeDecision(mistake, true, '2026-11-15');
  assert.equal(next.nextReminderDate, '2026-11-18');
  assert.equal(next.reminderCount, 3);
  assert.equal(next.status, 'Pending Revision');
});

test('No starts the 7-day cycle from the actual mastered date, not log date or prior 3-day reminders', () => {
  const mistake = { id: 'm1', loggedDate: '2026-11-01', reminderCount: 3, status: 'Pending Revision' };
  const next = scheduleMistakeDecision(mistake, false, '2026-11-15');
  assert.equal(next.status, 'Long-term Revision');
  assert.equal(next.longTermStage, 0);
  assert.equal(next.masteredDate, '2026-11-15');
  assert.equal(next.nextReminderDate, '2026-11-22');
});

test('long-term reviews use 7, then 15, then 30 days from each completed review date', () => {
  const first = scheduleMistakeDecision({ id: 'm1', status: 'Pending Revision' }, false, '2026-11-15');
  const second = advanceLongTermReview(first, '2026-11-22');
  assert.equal(second.nextReminderDate, '2026-12-07');
  assert.equal(second.longTermStage, 1);
  const third = advanceLongTermReview(second, '2026-12-07');
  assert.equal(third.nextReminderDate, '2027-01-06');
  assert.equal(third.longTermStage, 2);
  const finished = advanceLongTermReview(third, '2027-01-06');
  assert.equal(finished.status, 'Mastered');
  assert.equal(finished.nextReminderDate, null);
});

test('each mistake has independent dates and changing one does not affect another', () => {
  const a = scheduleMistakeDecision({ id: 'a', status: 'Pending Revision' }, false, '2026-11-15');
  const b = scheduleMistakeDecision({ id: 'b', status: 'Pending Revision' }, false, '2026-11-18');
  assert.equal(a.nextReminderDate, '2026-11-22');
  assert.equal(b.nextReminderDate, '2026-11-25');
});

test('legacy long-term schedules migrate to an independent next interval', () => {
  const migrated = migrateMistakeSchedules([
    { id: 'legacy', status: 'Long-term Revision', longTermStage: 1, loggedDate: '2026-11-01', nextReminderDate: '2026-12-02' },
    { id: 'already', status: 'Pending Revision', scheduleVersion: 2, nextReminderDate: '2026-11-20' }
  ], '2026-11-15');
  assert.equal(migrated[0].nextReminderDate, '2026-11-30');
  assert.equal(migrated[0].scheduleVersion, 2);
  assert.equal(migrated[1].nextReminderDate, '2026-11-20');
});

test('date helper crosses month and year boundaries', () => {
  assert.equal(addDays('2026-12-25', 15), '2027-01-09');
});
