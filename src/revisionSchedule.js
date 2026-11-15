// Date-safe spaced revision helpers. All intervals are measured from the
// date the individual question was actually reviewed, never from its log date.
export const addDays = (dateString, days) => {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

export const scheduleMistakeDecision = (mistake, extend3Days, reviewedDate) => {
  if (extend3Days) {
    return {
      ...mistake,
      reminderCount: (mistake.reminderCount || 0) + 1,
      lastReviewedDate: reviewedDate,
      nextReminderDate: addDays(reviewedDate, 3),
      status: 'Pending Revision'
    };
  }

  return {
    ...mistake,
    status: 'Long-term Revision',
    longTermStage: 0,
    masteredDate: reviewedDate,
    lastReviewedDate: reviewedDate,
    nextReminderDate: addDays(reviewedDate, 7),
    longTermHistory: []
  };
};

export const advanceLongTermReview = (mistake, reviewedDate) => {
  if (!mistake || mistake.status !== 'Long-term Revision') return mistake;

  const nextStage = (mistake.longTermStage || 0) + 1;
  if (nextStage >= 3) {
    return {
      ...mistake,
      status: 'Mastered',
      longTermStage: 3,
      nextReminderDate: null,
      masteredDate: reviewedDate,
      lastReviewedDate: reviewedDate,
      longTermHistory: [...(mistake.longTermHistory || []), reviewedDate]
    };
  }

  const intervals = [7, 15, 30];
  return {
    ...mistake,
    longTermStage: nextStage,
    lastReviewedDate: reviewedDate,
    nextReminderDate: addDays(reviewedDate, intervals[nextStage]),
    longTermHistory: [...(mistake.longTermHistory || []), reviewedDate]
  };
};

// Old builds stored cumulative offsets (16/31/61) from loggedDate. There is
// no reliable way to reconstruct when the user actually clicked "Mastered",
// so migrate active legacy long-term records from the migration date.
export const migrateMistakeSchedules = (mistakes, migrationDate) =>
  (mistakes || []).map(mistake => {
    if (mistake.scheduleVersion === 2) return mistake;

    if (mistake.status === 'Mastered' && mistake.longTermStage == null) {
      return {
        ...mistake,
        status: 'Long-term Revision',
        longTermStage: 0,
        masteredDate: migrationDate,
        lastReviewedDate: migrationDate,
        nextReminderDate: addDays(migrationDate, 7),
        longTermHistory: [],
        scheduleVersion: 2
      };
    }

    if (mistake.status === 'Long-term Revision') {
      const stage = Math.min(Math.max(mistake.longTermStage || 0, 0), 2);
      const intervals = [7, 15, 30];
      const lastReviewDate = Array.isArray(mistake.longTermHistory) && mistake.longTermHistory.length
        ? mistake.longTermHistory[mistake.longTermHistory.length - 1]
        : (mistake.masteredDate || migrationDate);
      return {
        ...mistake,
        longTermStage: stage,
        lastReviewedDate: lastReviewDate,
        nextReminderDate: addDays(lastReviewDate, intervals[stage]),
        scheduleVersion: 2
      };
    }

    return { ...mistake, scheduleVersion: 2 };
  });
