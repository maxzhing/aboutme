/* Cadence — entity definitions, factories and defaults.
   Seven top-level concepts stay deliberately distinct: EVENT (happens at a time),
   TASK (must get done), DEADLINE (a point by which something must be done),
   NOTE (information), PROJECT (a body of work), GOAL (a long-term outcome),
   HABIT (something repeated). Nothing here blurs them together. */
(function (global) {
  'use strict';

  var counter = 0;
  function uid(prefix) {
    counter++;
    return (prefix || 'id') + '_' + Date.now().toString(36) + counter.toString(36) +
      Math.floor(Math.random() * 1296).toString(36);
  }

  var PRIORITIES = [
    { id: 'critical', label: 'Critical', rank: 0, color: '#e0524a' },
    { id: 'high', label: 'High', rank: 1, color: '#e08a3c' },
    { id: 'medium', label: 'Medium', rank: 2, color: '#4a86d8' },
    { id: 'low', label: 'Low', rank: 3, color: '#7b8496' }
  ];
  var PRIORITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

  var STATUSES = [
    { id: 'inbox', label: 'Inbox' },
    { id: 'planned', label: 'Planned' },
    { id: 'in-progress', label: 'In progress' },
    { id: 'waiting', label: 'Waiting' },
    { id: 'completed', label: 'Completed' },
    { id: 'archived', label: 'Archived' }
  ];

  var DEADLINE_KINDS = [
    { id: 'assignment', label: 'Assignment' },
    { id: 'application', label: 'Application' },
    { id: 'project', label: 'Project' },
    { id: 'personal', label: 'Personal' },
    { id: 'exam', label: 'Exam' },
    { id: 'other', label: 'Other' }
  ];

  var NOTE_KINDS = [
    { id: 'note', label: 'Note' },
    { id: 'idea', label: 'Idea' },
    { id: 'checklist', label: 'Checklist' },
    { id: 'meeting', label: 'Meeting notes' },
    { id: 'study', label: 'Study notes' },
    { id: 'braindump', label: 'Brain dump' }
  ];

  /* Time-block categories double as the app's colour vocabulary. */
  var DEFAULT_CATEGORIES = [
    { id: 'cat_school', name: 'School', color: '#4a86d8', block: true },
    { id: 'cat_homework', name: 'Homework', color: '#5b6fd8', block: true },
    { id: 'cat_study', name: 'Studying', color: '#7a5cd8', block: true },
    { id: 'cat_exercise', name: 'Exercise', color: '#3f9e77', block: true },
    { id: 'cat_practice', name: 'Practice', color: '#c2871f', block: true },
    { id: 'cat_creative', name: 'Creative work', color: '#c4569a', block: true },
    { id: 'cat_personal', name: 'Personal', color: '#5aa0b8', block: true },
    { id: 'cat_family', name: 'Family', color: '#d0764a', block: true },
    { id: 'cat_relax', name: 'Relaxation', color: '#6f9e5b', block: true },
    { id: 'cat_sleep', name: 'Sleep', color: '#5c6478', block: true },
    { id: 'cat_travel', name: 'Travel', color: '#8b8578', block: true },
    { id: 'cat_health', name: 'Health', color: '#2f9e8f', block: false }
  ];

  var DEFAULT_CALENDARS = [
    { id: 'cal_personal', name: 'Personal', color: '#4a86d8', visible: true },
    { id: 'cal_school', name: 'School', color: '#7a5cd8', visible: true },
    { id: 'cal_work', name: 'Work', color: '#2f9e8f', visible: true },
    { id: 'cal_family', name: 'Family', color: '#d0764a', visible: true },
    { id: 'cal_birthdays', name: 'Birthdays', color: '#c4569a', visible: true },
    { id: 'cal_holidays', name: 'Holidays', color: '#6f9e5b', visible: true }
  ];

  /* Non-calendar layers the user can toggle independently. */
  var LAYERS = [
    { id: 'tasks', label: 'Tasks' },
    { id: 'habits', label: 'Habits' },
    { id: 'deadlines', label: 'Deadlines' }
  ];

  var REMINDER_OPTIONS = [
    { value: 0, label: 'At time of event' },
    { value: 5, label: '5 minutes before' },
    { value: 10, label: '10 minutes before' },
    { value: 15, label: '15 minutes before' },
    { value: 30, label: '30 minutes before' },
    { value: 60, label: '1 hour before' },
    { value: 120, label: '2 hours before' },
    { value: 1440, label: '1 day before' },
    { value: 2880, label: '2 days before' }
  ];

  function defaultSettings() {
    return {
      name: '',
      theme: 'system',              // light | dark | system
      density: 'comfortable',       // comfortable | compact
      accent: 'indigo',
      use24Hour: false,
      firstDayOfWeek: 0,
      showWeekNumbers: false,
      timezone: 'local',
      workingHours: { start: 8 * 60, end: 18 * 60 },
      workingDays: [1, 2, 3, 4, 5],
      showWeekends: true,
      dayStartHour: 6,
      dayEndHour: 23,
      defaultEventDuration: 60,
      defaultTaskEstimate: 45,
      defaultView: 'week',
      lastView: 'week',
      defaultReminders: { event: [10], task: [], deadline: [1440], habit: [0] },
      notificationsEnabled: true,
      desktopNotifications: false,
      travelTimeEnabled: true,
      suggestionsEnabled: true,
      breakMinutes: 15,
      bufferMinutes: 10,
      maxFocusBlock: 90,
      minFreeMinutesPerDay: 90,
      reduceMotion: false,
      highContrast: false,
      largeText: false,
      onboarded: false,
      layers: { tasks: true, habits: true, deadlines: true },
      purposes: []
    };
  }

  function baseFields(o) {
    var now = new Date().toISOString();
    o.id = o.id || uid(o.__p || 'x');
    o.createdAt = o.createdAt || now;
    o.updatedAt = now;
    delete o.__p;
    return o;
  }

  function makeEvent(p) {
    p = p || {};
    var start = p.start || new Date().toISOString();
    var end = p.end || new Date(new Date(start).getTime() + 60 * 60000).toISOString();
    return baseFields({
      __p: 'evt',
      id: p.id, createdAt: p.createdAt,
      kind: 'event',
      type: p.type || 'event',          // event | block | birthday | holiday
      title: p.title || 'Untitled event',
      start: start,
      end: end,
      allDay: !!p.allDay,
      multiDay: !!p.multiDay,
      calendarId: p.calendarId || 'cal_personal',
      categoryId: p.categoryId || null,
      color: p.color || null,
      location: p.location || '',
      description: p.description || '',
      participants: p.participants || [],
      tags: p.tags || [],
      priority: p.priority || null,
      recurrence: p.recurrence || null,
      seriesId: p.seriesId || null,      // set on generated instances
      exdates: p.exdates || [],
      projectId: p.projectId || null,
      goalId: p.goalId || null,
      taskId: p.taskId || null,
      habitId: p.habitId || null,
      travelMinutes: p.travelMinutes || 0,
      reminders: p.reminders || null,
      attachments: p.attachments || [],
      links: p.links || [],
      tz: p.tz || null,
      status: p.status || 'confirmed',
      done: !!p.done
    });
  }

  function makeTask(p) {
    p = p || {};
    return baseFields({
      __p: 'tsk',
      id: p.id, createdAt: p.createdAt,
      kind: 'task',
      title: p.title || 'Untitled task',
      description: p.description || '',
      due: p.due || null,                 // ISO instant or null
      hasDueTime: !!p.hasDueTime,
      estimate: p.estimate == null ? null : p.estimate, // minutes
      priority: p.priority || 'medium',
      status: p.status || 'inbox',
      categoryId: p.categoryId || null,
      projectId: p.projectId || null,
      goalId: p.goalId || null,
      deadlineId: p.deadlineId || null,
      tags: p.tags || [],
      subtasks: p.subtasks || [],
      dependsOn: p.dependsOn || [],
      recurrence: p.recurrence || null,
      attachments: p.attachments || [],
      links: p.links || [],
      notes: p.notes || '',
      scheduledEventId: p.scheduledEventId || null,
      completedAt: p.completedAt || null,
      order: p.order == null ? Date.now() : p.order,
      important: p.important == null ? null : p.important
    });
  }

  function makeDeadline(p) {
    p = p || {};
    return baseFields({
      __p: 'dln',
      id: p.id, createdAt: p.createdAt,
      kind: 'deadline',
      title: p.title || 'Untitled deadline',
      due: p.due || new Date().toISOString(),
      hasDueTime: p.hasDueTime !== false,
      type: p.type || 'other',
      description: p.description || '',
      projectId: p.projectId || null,
      goalId: p.goalId || null,
      calendarId: p.calendarId || 'cal_personal',
      tags: p.tags || [],
      color: p.color || null,
      reminders: p.reminders || null,
      done: !!p.done,
      completedAt: p.completedAt || null
    });
  }

  function makeNote(p) {
    p = p || {};
    return baseFields({
      __p: 'not',
      id: p.id, createdAt: p.createdAt,
      kind: 'note',
      title: p.title || '',
      body: p.body || '',
      type: p.type || 'note',
      checklist: p.checklist || [],
      tags: p.tags || [],
      projectId: p.projectId || null,
      goalId: p.goalId || null,
      eventId: p.eventId || null,
      taskId: p.taskId || null,
      pinned: !!p.pinned,
      color: p.color || null,
      attachments: p.attachments || [],
      archived: !!p.archived
    });
  }

  function makeProject(p) {
    p = p || {};
    return baseFields({
      __p: 'prj',
      id: p.id, createdAt: p.createdAt,
      kind: 'project',
      name: p.name || 'Untitled project',
      description: p.description || '',
      color: p.color || '#4a86d8',
      due: p.due || null,
      status: p.status || 'active',      // active | on-hold | done | archived
      goalId: p.goalId || null,
      tags: p.tags || [],
      startedAt: p.startedAt || new Date().toISOString(),
      attachments: p.attachments || [],
      links: p.links || []
    });
  }

  function makeGoal(p) {
    p = p || {};
    return baseFields({
      __p: 'gol',
      id: p.id, createdAt: p.createdAt,
      kind: 'goal',
      name: p.name || 'Untitled goal',
      description: p.description || '',
      due: p.due || null,
      color: p.color || '#7a5cd8',
      milestones: p.milestones || [],
      tags: p.tags || [],
      status: p.status || 'active',
      archived: !!p.archived
    });
  }

  function makeHabit(p) {
    p = p || {};
    return baseFields({
      __p: 'hab',
      id: p.id, createdAt: p.createdAt,
      kind: 'habit',
      name: p.name || 'Untitled habit',
      schedule: p.schedule || { type: 'daily', days: [0, 1, 2, 3, 4, 5, 6], timesPerWeek: 7 },
      time: p.time == null ? null : p.time,   // minutes from midnight, optional
      duration: p.duration || 20,
      color: p.color || '#3f9e77',
      goalId: p.goalId || null,
      categoryId: p.categoryId || null,
      log: p.log || {},                        // { 'YYYY-MM-DD': true }
      notes: p.notes || '',
      archived: !!p.archived
    });
  }

  function makeCapture(p) {
    p = p || {};
    return baseFields({
      __p: 'cap',
      id: p.id, createdAt: p.createdAt,
      kind: 'capture',
      text: p.text || '',
      processed: !!p.processed
    });
  }

  function makePerson(p) {
    p = p || {};
    return baseFields({
      __p: 'per',
      id: p.id, createdAt: p.createdAt,
      kind: 'person',
      name: p.name || '',
      contact: p.contact || '',
      role: p.role || ''
    });
  }

  function makeTemplate(p) {
    p = p || {};
    return baseFields({
      __p: 'tpl',
      id: p.id, createdAt: p.createdAt,
      kind: 'template',
      name: p.name || 'Template',
      icon: p.icon || '',
      payload: p.payload || {}
    });
  }

  function emptyState() {
    return {
      version: 1,
      settings: defaultSettings(),
      calendars: DEFAULT_CALENDARS.map(function (c) { return Object.assign({}, c); }),
      categories: DEFAULT_CATEGORIES.map(function (c) { return Object.assign({}, c); }),
      events: [],
      tasks: [],
      deadlines: [],
      notes: [],
      projects: [],
      goals: [],
      habits: [],
      captures: [],
      people: [],
      templates: [],
      dismissed: {},          // suggestion id -> timestamp
      reminderLog: {},        // "eventId@iso" -> true, so we never double-fire
      focus: null             // active focus session
    };
  }

  global.M = {
    uid: uid,
    PRIORITIES: PRIORITIES, PRIORITY_RANK: PRIORITY_RANK, STATUSES: STATUSES,
    DEADLINE_KINDS: DEADLINE_KINDS, NOTE_KINDS: NOTE_KINDS, LAYERS: LAYERS,
    DEFAULT_CATEGORIES: DEFAULT_CATEGORIES, DEFAULT_CALENDARS: DEFAULT_CALENDARS,
    REMINDER_OPTIONS: REMINDER_OPTIONS,
    defaultSettings: defaultSettings, emptyState: emptyState,
    makeEvent: makeEvent, makeTask: makeTask, makeDeadline: makeDeadline,
    makeNote: makeNote, makeProject: makeProject, makeGoal: makeGoal,
    makeHabit: makeHabit, makeCapture: makeCapture, makePerson: makePerson,
    makeTemplate: makeTemplate
  };
})(window);
