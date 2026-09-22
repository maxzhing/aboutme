import { create } from 'zustand';
import type {
  AccountState,
  Achievement,
  CalendarEvent,
  ChatMessage,
  CollegeListEntry,
  ContentRevision,
  Deadline,
  EssayDraft,
  Feedback,
  ID,
  LearnedPreference,
  ListStage,
  Notification,
  PracticeSession,
  QuestionAttempt,
  RecommendationPacket,
  SatScoreEntry,
  SavedItem,
  ShareSettings,
  StudentActivity,
  StudentProfile,
  StudyPlan,
  User,
  UserPreferences,
  WhatIfScenario,
} from '@/domain/types';
import { repository } from './repository';
import { emptyAccountState } from './defaults';
import { nowISO, todayISO } from '@/lib/date';
import { uid } from '@/lib/id';
import { uniq } from '@/lib/format';

export type Status = 'booting' | 'anonymous' | 'ready';

interface Toast {
  id: string;
  message: string;
  tone?: 'default' | 'ok' | 'warn' | 'danger' | 'ai';
}

interface AppState {
  status: Status;
  user?: User;
  state: AccountState;
  toasts: Toast[];
  /** Global command palette visibility. */
  paletteOpen: boolean;

  /* --- lifecycle --- */
  boot: () => Promise<void>;
  signUp: (input: { name: string; email: string; password: string }) => Promise<{ ok: boolean; error?: string }>;
  logIn: (input: { email: string; password: string }) => Promise<{ ok: boolean; error?: string }>;
  logOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  /** Seeds a fully populated example account so the product can be explored immediately. */
  loadDemoAccount: () => Promise<void>;

  /* --- generic mutation --- */
  patch: (fn: (draft: AccountState) => void) => void;
  updateProfile: (fn: (p: StudentProfile) => void) => void;

  /* --- preferences & UI --- */
  setPreferences: (patch: Partial<UserPreferences>) => void;
  toast: (message: string, tone?: Toast['tone']) => void;
  dismissToast: (id: string) => void;
  setPaletteOpen: (open: boolean) => void;

  /* --- activities & awards --- */
  addActivity: (activity: Omit<StudentActivity, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateActivity: (id: ID, patch: Partial<StudentActivity>) => void;
  removeActivity: (id: ID) => void;

  /* --- colleges --- */
  addToCollegeList: (collegeId: string, stage?: ListStage) => void;
  updateCollegeEntry: (id: ID, patch: Partial<CollegeListEntry>) => void;
  removeCollegeEntry: (id: ID) => void;
  toggleApplicationTask: (entryId: ID, taskId: string) => void;

  /* --- saved items & feedback --- */
  toggleSaved: (targetType: SavedItem['targetType'], targetId: string, status?: SavedItem['status']) => void;
  setSavedStatus: (targetType: SavedItem['targetType'], targetId: string, status: SavedItem['status']) => void;
  recordFeedback: (input: Omit<Feedback, 'id' | 'createdAt'>) => void;
  addLearnedPreference: (input: Omit<LearnedPreference, 'id' | 'createdAt' | 'active'>) => void;
  setLearnedPreferenceActive: (id: ID, active: boolean) => void;
  removeLearnedPreference: (id: ID) => void;

  /* --- practice --- */
  recordAttempt: (attempt: Omit<QuestionAttempt, 'id' | 'createdAt'>) => void;
  startPracticeSession: (session: Omit<PracticeSession, 'id' | 'startedAt'>) => ID;
  completePracticeSession: (id: ID) => void;
  addSatScore: (entry: Omit<SatScoreEntry, 'id'>) => void;
  removeSatScore: (id: ID) => void;
  setUnitProgress: (courseId: string, unitId: string, pct: number) => void;

  /* --- planner --- */
  addDeadline: (deadline: Omit<Deadline, 'id' | 'createdAt'>) => void;
  updateDeadline: (id: ID, patch: Partial<Deadline>) => void;
  removeDeadline: (id: ID) => void;
  addCalendarEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => void;
  updateCalendarEvent: (id: ID, patch: Partial<CalendarEvent>) => void;
  removeCalendarEvent: (id: ID) => void;
  saveStudyPlan: (plan: StudyPlan) => void;

  /* --- applications & writing --- */
  addEssay: (essay: Omit<EssayDraft, 'id' | 'createdAt' | 'updatedAt' | 'authenticityChecks'>) => ID;
  updateEssay: (id: ID, patch: Partial<EssayDraft>) => void;
  removeEssay: (id: ID) => void;
  addRecommendationPacket: (packet: Omit<RecommendationPacket, 'id' | 'createdAt'>) => void;
  updateRecommendationPacket: (id: ID, patch: Partial<RecommendationPacket>) => void;
  removeRecommendationPacket: (id: ID) => void;

  /* --- counselor --- */
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'createdAt'>) => void;
  clearChat: () => void;

  /* --- notifications & achievements --- */
  pushNotification: (n: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markNotificationRead: (id: ID) => void;
  markAllNotificationsRead: () => void;
  grantAchievement: (achievement: Achievement['id']) => void;

  /* --- what-if & sharing --- */
  addScenario: (scenario: Omit<WhatIfScenario, 'id' | 'createdAt'>) => ID;
  removeScenario: (id: ID) => void;
  setShareSettings: (patch: Partial<ShareSettings>) => void;

  /* --- admin --- */
  addContentRevision: (rev: Omit<ContentRevision, 'id' | 'editedAt'>) => void;

  dismissRecommendation: (id: string) => void;
}

const PLACEHOLDER_STATE = emptyAccountState('anonymous', 'Student');

export const useAppStore = create<AppState>((set, get) => {
  /** Applies a mutation to account state and persists it. */
  function mutate(fn: (draft: AccountState) => void): void {
    const { state, user } = get();
    const next: AccountState = structuredClone(state);
    fn(next);
    next.profile.updatedAt = nowISO();
    const today = todayISO();
    if (!next.activityLog.includes(today)) next.activityLog = [...next.activityLog, today].slice(-400);
    set({ state: next });
    if (user) repository.saveState(user.id, next);
  }

  return {
    status: 'booting',
    state: PLACEHOLDER_STATE,
    toasts: [],
    paletteOpen: false,

    async boot() {
      const session = repository.currentSession();
      if (!session) {
        set({ status: 'anonymous', state: PLACEHOLDER_STATE, user: undefined });
        return;
      }
      const users = await repository.listUsers();
      const user = users.find((u) => u.id === session.userId);
      if (!user) {
        await repository.logOut();
        set({ status: 'anonymous', state: PLACEHOLDER_STATE, user: undefined });
        return;
      }
      const state = await repository.loadState(user.id, user.name);
      set({ status: 'ready', user, state });
    },

    async signUp(input) {
      const res = await repository.signUp(input);
      if (!res.ok || !res.user) return { ok: false, error: res.error };
      const state = await repository.loadState(res.user.id, res.user.name);
      set({ status: 'ready', user: res.user, state });
      return { ok: true };
    },

    async logIn(input) {
      const res = await repository.logIn(input);
      if (!res.ok || !res.user) return { ok: false, error: res.error };
      const state = await repository.loadState(res.user.id, res.user.name);
      set({ status: 'ready', user: res.user, state });
      return { ok: true };
    },

    async logOut() {
      await repository.logOut();
      set({ status: 'anonymous', user: undefined, state: PLACEHOLDER_STATE, toasts: [] });
    },

    async deleteAccount() {
      const { user } = get();
      if (user) await repository.deleteAccount(user.id);
      set({ status: 'anonymous', user: undefined, state: PLACEHOLDER_STATE });
    },

    async loadDemoAccount() {
      const { buildDemoAccount } = await import('./demoAccount');
      const email = 'demo@pathway.ai';
      const password = 'PathwayDemo1';
      let res = await repository.logIn({ email, password });
      if (!res.ok) {
        res = await repository.signUp({ name: 'Maya Okonkwo', email, password });
      }
      if (!res.ok || !res.user) {
        get().toast('Could not open the example account.', 'danger');
        return;
      }
      const state = buildDemoAccount(res.user.id);
      repository.saveState(res.user.id, state);
      set({ status: 'ready', user: res.user, state });
    },

    patch(fn) {
      mutate(fn);
    },

    updateProfile(fn) {
      mutate((draft) => fn(draft.profile));
    },

    setPreferences(patch) {
      mutate((draft) => {
        draft.preferences = { ...draft.preferences, ...patch };
      });
    },

    toast(message, tone = 'default') {
      const id = uid('toast');
      set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
      setTimeout(() => get().dismissToast(id), 4200);
    },

    dismissToast(id) {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    },

    setPaletteOpen(open) {
      set({ paletteOpen: open });
    },

    addActivity(activity) {
      mutate((draft) => {
        draft.profile.activities.push({
          ...activity,
          id: uid('act'),
          createdAt: nowISO(),
          updatedAt: nowISO(),
        });
      });
    },

    updateActivity(id, patch) {
      mutate((draft) => {
        const found = draft.profile.activities.find((a) => a.id === id);
        if (found) Object.assign(found, patch, { updatedAt: nowISO() });
      });
    },

    removeActivity(id) {
      mutate((draft) => {
        draft.profile.activities = draft.profile.activities.filter((a) => a.id !== id);
      });
    },

    addToCollegeList(collegeId, stage = 'exploring') {
      mutate((draft) => {
        if (draft.collegeList.some((e) => e.collegeId === collegeId)) return;
        draft.collegeList.push({
          id: uid('list'),
          collegeId,
          stage,
          checklist: {},
          addedAt: nowISO(),
          updatedAt: nowISO(),
        });
      });
    },

    updateCollegeEntry(id, patch) {
      mutate((draft) => {
        const found = draft.collegeList.find((e) => e.id === id);
        if (found) Object.assign(found, patch, { updatedAt: nowISO() });
      });
    },

    removeCollegeEntry(id) {
      mutate((draft) => {
        draft.collegeList = draft.collegeList.filter((e) => e.id !== id);
      });
    },

    toggleApplicationTask(entryId, taskId) {
      mutate((draft) => {
        const entry = draft.collegeList.find((e) => e.id === entryId);
        if (!entry) return;
        entry.checklist[taskId] = !entry.checklist[taskId];
        entry.updatedAt = nowISO();
      });
    },

    toggleSaved(targetType, targetId, status = 'saved') {
      mutate((draft) => {
        const idx = draft.savedItems.findIndex((s) => s.targetType === targetType && s.targetId === targetId);
        if (idx >= 0) draft.savedItems.splice(idx, 1);
        else draft.savedItems.push({ id: uid('saved'), targetType, targetId, status, createdAt: nowISO() });
      });
    },

    setSavedStatus(targetType, targetId, status) {
      mutate((draft) => {
        const found = draft.savedItems.find((s) => s.targetType === targetType && s.targetId === targetId);
        if (found) found.status = status;
        else draft.savedItems.push({ id: uid('saved'), targetType, targetId, status, createdAt: nowISO() });
      });
    },

    recordFeedback(input) {
      mutate((draft) => {
        draft.feedback.push({ ...input, id: uid('fb'), createdAt: nowISO() });
      });
    },

    addLearnedPreference(input) {
      mutate((draft) => {
        const duplicate = draft.learnedPreferences.some(
          (p) => p.kind === input.kind && String(p.value ?? '') === String(input.value ?? ''),
        );
        if (duplicate) return;
        draft.learnedPreferences.push({ ...input, id: uid('pref'), active: true, createdAt: nowISO() });
      });
    },

    setLearnedPreferenceActive(id, active) {
      mutate((draft) => {
        const found = draft.learnedPreferences.find((p) => p.id === id);
        if (found) found.active = active;
      });
    },

    removeLearnedPreference(id) {
      mutate((draft) => {
        draft.learnedPreferences = draft.learnedPreferences.filter((p) => p.id !== id);
      });
    },

    recordAttempt(attempt) {
      mutate((draft) => {
        draft.attempts.push({ ...attempt, id: uid('att'), createdAt: nowISO() });
      });
    },

    startPracticeSession(session) {
      const id = uid('sess');
      mutate((draft) => {
        draft.practiceSessions.push({ ...session, id, startedAt: nowISO() });
      });
      return id;
    },

    completePracticeSession(id) {
      mutate((draft) => {
        const found = draft.practiceSessions.find((s) => s.id === id);
        if (found) found.completedAt = nowISO();
      });
    },

    addSatScore(entry) {
      mutate((draft) => {
        draft.satScores.push({ ...entry, id: uid('sat') });
        draft.satScores.sort((a, b) => a.date.localeCompare(b.date));
      });
    },

    removeSatScore(id) {
      mutate((draft) => {
        draft.satScores = draft.satScores.filter((s) => s.id !== id);
      });
    },

    setUnitProgress(courseId, unitId, pct) {
      mutate((draft) => {
        draft.apUnitProgress[`${courseId}:${unitId}`] = Math.max(0, Math.min(100, Math.round(pct)));
      });
    },

    addDeadline(deadline) {
      mutate((draft) => {
        const duplicate = draft.deadlines.some(
          (d) => d.title === deadline.title && d.date === deadline.date && d.refId === deadline.refId,
        );
        if (duplicate) return;
        draft.deadlines.push({ ...deadline, id: uid('dl'), createdAt: nowISO() });
        draft.deadlines.sort((a, b) => a.date.localeCompare(b.date));
      });
    },

    updateDeadline(id, patch) {
      mutate((draft) => {
        const found = draft.deadlines.find((d) => d.id === id);
        if (found) Object.assign(found, patch);
      });
    },

    removeDeadline(id) {
      mutate((draft) => {
        draft.deadlines = draft.deadlines.filter((d) => d.id !== id);
      });
    },

    addCalendarEvent(event) {
      mutate((draft) => {
        draft.calendarEvents.push({ ...event, id: uid('ev'), createdAt: nowISO() });
      });
    },

    updateCalendarEvent(id, patch) {
      mutate((draft) => {
        const found = draft.calendarEvents.find((e) => e.id === id);
        if (found) Object.assign(found, patch);
      });
    },

    removeCalendarEvent(id) {
      mutate((draft) => {
        draft.calendarEvents = draft.calendarEvents.filter((e) => e.id !== id);
      });
    },

    saveStudyPlan(plan) {
      mutate((draft) => {
        draft.studyPlans = [plan, ...draft.studyPlans.filter((p) => p.weekOf !== plan.weekOf)].slice(0, 26);
        // Replace generated events for that week; keep anything the student made.
        draft.calendarEvents = draft.calendarEvents.filter(
          (e) => !(e.generated && e.date >= plan.weekOf && e.date < addDays(plan.weekOf, 7)),
        );
        for (const block of plan.blocks) {
          draft.calendarEvents.push({
            id: uid('ev'),
            title: block.focus,
            date: addDays(plan.weekOf, block.day),
            minutes: block.minutes,
            kind: 'study',
            scope: block.scope,
            notes: block.reason,
            done: false,
            generated: true,
            createdAt: nowISO(),
          });
        }
      });
    },

    addEssay(essay) {
      const id = uid('essay');
      mutate((draft) => {
        draft.essays.push({
          ...essay,
          id,
          authenticityChecks: [],
          createdAt: nowISO(),
          updatedAt: nowISO(),
        });
      });
      return id;
    },

    updateEssay(id, patch) {
      mutate((draft) => {
        const found = draft.essays.find((e) => e.id === id);
        if (found) Object.assign(found, patch, { updatedAt: nowISO() });
      });
    },

    removeEssay(id) {
      mutate((draft) => {
        draft.essays = draft.essays.filter((e) => e.id !== id);
      });
    },

    addRecommendationPacket(packet) {
      mutate((draft) => {
        draft.recommendationPackets.push({ ...packet, id: uid('rec'), createdAt: nowISO() });
      });
    },

    updateRecommendationPacket(id, patch) {
      mutate((draft) => {
        const found = draft.recommendationPackets.find((p) => p.id === id);
        if (found) Object.assign(found, patch);
      });
    },

    removeRecommendationPacket(id) {
      mutate((draft) => {
        draft.recommendationPackets = draft.recommendationPackets.filter((p) => p.id !== id);
      });
    },

    addChatMessage(message) {
      mutate((draft) => {
        draft.chat.push({ ...message, id: uid('msg'), createdAt: nowISO() });
        if (draft.chat.length > 400) draft.chat = draft.chat.slice(-400);
      });
    },

    clearChat() {
      mutate((draft) => {
        draft.chat = [];
      });
    },

    pushNotification(n) {
      mutate((draft) => {
        if (draft.notifications.some((x) => x.dedupeKey === n.dedupeKey)) return;
        draft.notifications.unshift({ ...n, id: uid('note'), createdAt: nowISO(), read: false });
        draft.notifications = draft.notifications.slice(0, 120);
      });
    },

    markNotificationRead(id) {
      mutate((draft) => {
        const found = draft.notifications.find((n) => n.id === id);
        if (found) found.read = true;
      });
    },

    markAllNotificationsRead() {
      mutate((draft) => {
        draft.notifications = draft.notifications.map((n) => ({ ...n, read: true }));
      });
    },

    grantAchievement(id) {
      const { state } = get();
      if (state.achievements[id]) return;
      mutate((draft) => {
        draft.achievements[id] = nowISO();
      });
    },

    addScenario(scenario) {
      const id = uid('what');
      mutate((draft) => {
        draft.whatIfScenarios.unshift({ ...scenario, id, createdAt: nowISO() });
        draft.whatIfScenarios = draft.whatIfScenarios.slice(0, 20);
      });
      return id;
    },

    removeScenario(id) {
      mutate((draft) => {
        draft.whatIfScenarios = draft.whatIfScenarios.filter((s) => s.id !== id);
      });
    },

    setShareSettings(patch) {
      mutate((draft) => {
        draft.share = { ...draft.share, ...patch, share: { ...draft.share.share, ...(patch.share ?? {}) } };
      });
    },

    addContentRevision(rev) {
      const full: ContentRevision = { ...rev, id: uid('rev'), editedAt: nowISO() };
      mutate((draft) => {
        draft.contentRevisions = [full, ...draft.contentRevisions].slice(0, 200);
      });
      void repository.addContentRevision(full);
    },

    dismissRecommendation(id) {
      mutate((draft) => {
        draft.dismissedRecommendationIds = uniq([...draft.dismissedRecommendationIds, id]).slice(-300);
      });
    },
  };
});

/** Local copy to avoid a circular import with lib/date in the store module graph. */
function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
