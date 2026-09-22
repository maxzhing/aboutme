import type { AccountState, GradeLevel, StudentProfile, UserPreferences } from '@/domain/types';
import { gradeToGradYear, nowISO, todayISO } from '@/lib/date';
import { uid } from '@/lib/id';

export const STATE_VERSION = 1;

export function emptyPreferences(): UserPreferences {
  return {
    theme: 'system',
    contrast: 'normal',
    fontScale: 'md',
    motion: 'system',
    acknowledgedDemoData: false,
    notifications: {
      deadlines: true,
      opportunities: true,
      studyReminders: true,
      testProgress: true,
      apProgress: true,
      collegeUpdates: true,
      weeklyReview: true,
      deadlineLeadDays: 30,
    },
  };
}

export function emptyProfile(userId: string, displayName: string, grade: GradeLevel = 11): StudentProfile {
  const now = nowISO();
  return {
    id: uid('profile'),
    userId,
    displayName,
    academics: {
      grade,
      graduationYear: gradeToGradYear(grade),
      school: '',
      country: 'United States',
      state: '',
      gpaScale: '4.0',
      currentCourses: [],
      previousCourses: [],
      schoolOffersAP: [],
    },
    interests: [],
    customInterests: [],
    majors: [],
    careers: [],
    customCareers: [],
    activities: [],
    awards: [],
    scores: [],
    plannedTests: [],
    collegePrefs: {
      regions: [],
      states: [],
      settings: [],
      sizes: [],
      control: 'no-preference',
      aidImportance: 3,
      priorities: [],
      avoidStates: [],
    },
    goals: { personalGoals: [] },
    rigorTolerance: 'balanced',
    onboardingStep: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function emptyAccountState(userId: string, displayName: string): AccountState {
  return {
    version: STATE_VERSION,
    profile: emptyProfile(userId, displayName),
    preferences: emptyPreferences(),
    collegeList: [],
    savedItems: [],
    feedback: [],
    learnedPreferences: [],
    attempts: [],
    practiceSessions: [],
    satScores: [],
    apUnitProgress: {},
    deadlines: [],
    calendarEvents: [],
    studyPlans: [],
    essays: [],
    recommendationPackets: [],
    chat: [],
    notifications: [],
    achievements: {},
    whatIfScenarios: [],
    share: {
      enabled: false,
      share: {
        deadlines: true,
        academics: true,
        majorPlanning: true,
        collegeList: true,
        financial: false,
        testing: false,
        activities: true,
        essays: false,
      },
    },
    contentRevisions: [],
    activityLog: [todayISO()],
    dismissedRecommendationIds: [],
  };
}

/**
 * Forward-compatible hydration: fills in any keys a stored state predates, so
 * an older saved account never crashes a newer build.
 */
export function hydrateAccountState(raw: unknown, userId: string, displayName: string): AccountState {
  const base = emptyAccountState(userId, displayName);
  if (!raw || typeof raw !== 'object') return base;
  const stored = raw as Partial<AccountState>;
  const merged: AccountState = {
    ...base,
    ...stored,
    version: STATE_VERSION,
    profile: { ...base.profile, ...(stored.profile ?? {}) },
    preferences: {
      ...base.preferences,
      ...(stored.preferences ?? {}),
      notifications: { ...base.preferences.notifications, ...(stored.preferences?.notifications ?? {}) },
    },
    share: {
      ...base.share,
      ...(stored.share ?? {}),
      share: { ...base.share.share, ...(stored.share?.share ?? {}) },
    },
  };
  // Nested objects inside profile also need field-level merging.
  merged.profile.academics = { ...base.profile.academics, ...(stored.profile?.academics ?? {}) };
  merged.profile.collegePrefs = { ...base.profile.collegePrefs, ...(stored.profile?.collegePrefs ?? {}) };
  merged.profile.goals = { ...base.profile.goals, ...(stored.profile?.goals ?? {}) };
  return merged;
}
