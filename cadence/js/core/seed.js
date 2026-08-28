/* Cadence — sample data.
   Everything is generated relative to today, so a fresh install always looks
   like a real week in progress rather than a museum piece from 2023. */
(function (global) {
  'use strict';

  function at(dayOffset, hour, minute) {
    var d = T.startOfDay(T.addDays(T.nowWall(), dayOffset));
    d.setHours(hour, minute || 0, 0, 0);
    return T.iso(d);
  }
  function dayKey(offset) { return T.key(T.addDays(T.nowWall(), offset)); }

  function build() {
    var st = M.emptyState();
    // A first run gets a realistic week *and* the short setup over the top of
    // it, so the app is never an empty grid and never a blank questionnaire.
    st.settings.onboarded = false;
    st.settings.name = '';

    var goals = [
      M.makeGoal({
        name: 'Improve piano performance',
        description: 'Be ready to perform the Chopin nocturne from memory at the spring recital.',
        due: at(84, 19, 0),
        color: '#c2871f',
        milestones: [
          { id: M.uid('ms'), title: 'Learn the piece', done: true },
          { id: M.uid('ms'), title: 'Memorize it', done: true },
          { id: M.uid('ms'), title: 'Fix the technical passages', done: false },
          { id: M.uid('ms'), title: 'Practise performing it start to finish', done: false },
          { id: M.uid('ms'), title: 'Record the final performance', done: false }
        ]
      }),
      M.makeGoal({
        name: 'Strong first-semester grades',
        description: 'Keep every class at a B+ or better without cramming.',
        due: at(110, 17, 0),
        color: '#4a86d8',
        milestones: [
          { id: M.uid('ms'), title: 'Set up a weekly study rhythm', done: true },
          { id: M.uid('ms'), title: 'Get through midterms', done: false },
          { id: M.uid('ms'), title: 'Finish the science fair project', done: false }
        ]
      }),
      M.makeGoal({
        name: 'Get college applications done early',
        description: 'Submit everything two weeks before each deadline.',
        due: at(60, 23, 59),
        color: '#7a5cd8',
        milestones: [
          { id: M.uid('ms'), title: 'Shortlist schools', done: true },
          { id: M.uid('ms'), title: 'Draft the personal essay', done: false },
          { id: M.uid('ms'), title: 'Ask for recommendation letters', done: false },
          { id: M.uid('ms'), title: 'Submit the first application', done: false }
        ]
      })
    ];

    var projects = [
      M.makeProject({
        name: 'Science Fair Project',
        description: 'Testing how light wavelength affects the growth rate of basil seedlings.',
        color: '#3f9e77',
        due: at(21, 17, 0),
        goalId: goals[1].id,
        tags: ['school', 'science']
      }),
      M.makeProject({
        name: 'History Research Paper',
        description: 'Eight pages on the economics of the Silk Road.',
        color: '#d0764a',
        due: at(9, 23, 59),
        goalId: goals[1].id,
        tags: ['school', 'history']
      }),
      M.makeProject({
        name: 'College Applications',
        description: 'Essays, forms, recommendations and deadlines for six schools.',
        color: '#7a5cd8',
        due: at(58, 23, 59),
        goalId: goals[2].id,
        tags: ['college']
      })
    ];

    var deadlines = [
      M.makeDeadline({ title: 'History research paper', due: at(9, 23, 59), type: 'assignment', projectId: projects[1].id, tags: ['history'] }),
      M.makeDeadline({ title: 'Biology unit test', due: at(2, 9, 0), type: 'exam', hasDueTime: true, tags: ['biology'] }),
      M.makeDeadline({ title: 'Science fair submission', due: at(21, 17, 0), type: 'project', projectId: projects[0].id }),
      M.makeDeadline({ title: 'Early-action application', due: at(58, 23, 59), type: 'application', projectId: projects[2].id, tags: ['college'] }),
      M.makeDeadline({ title: 'Permission slip for the field trip', due: at(4, 15, 0), type: 'personal', hasDueTime: true })
    ];

    /* --- recurring classes --- */
    var classes = [
      { title: 'Biology', start: [8, 30], end: [9, 45], days: [1, 3, 5], room: 'Room 204' },
      { title: 'US History', start: [10, 0], end: [11, 15], days: [1, 3, 5], room: 'Room 118' },
      { title: 'Algebra II', start: [11, 30], end: [12, 30], days: [1, 2, 3, 4, 5], room: 'Room 301' },
      { title: 'English Literature', start: [13, 30], end: [14, 45], days: [2, 4], room: 'Room 210' },
      { title: 'Chemistry Lab', start: [13, 30], end: [15, 30], days: [3], room: 'Lab B' }
    ];

    // Anchor the series to the Monday of this week so instances land sensibly.
    var monday = T.startOfWeek(T.nowWall(), 1);
    var events = [];
    classes.forEach(function (c) {
      var start = new Date(monday);
      start.setDate(start.getDate() + (c.days[0] - 1));
      start.setHours(c.start[0], c.start[1], 0, 0);
      var end = new Date(start);
      end.setHours(c.end[0], c.end[1], 0, 0);
      events.push(M.makeEvent({
        title: c.title,
        start: T.iso(start),
        end: T.iso(end),
        calendarId: 'cal_school',
        categoryId: 'cat_school',
        location: c.room,
        recurrence: { freq: 'weekly', interval: 1, byDay: c.days, until: T.iso(T.addDays(T.nowWall(), 120)) },
        reminders: [10]
      }));
    });

    events.push(
      M.makeEvent({
        title: 'Piano lesson', start: at(1, 16, 30), end: at(1, 17, 30),
        calendarId: 'cal_personal', categoryId: 'cat_practice',
        location: 'Maple Street Music', travelMinutes: 20, goalId: goals[0].id,
        recurrence: { freq: 'weekly', interval: 1 }, reminders: [30]
      }),
      M.makeEvent({
        title: 'Soccer practice', start: at(0, 16, 0), end: at(0, 17, 30),
        calendarId: 'cal_personal', categoryId: 'cat_exercise',
        location: 'Sports Center', travelMinutes: 25,
        recurrence: { freq: 'weekly', interval: 1, byDay: [2, 4] }, reminders: [30]
      }),
      M.makeEvent({
        title: 'Study group — biology', start: at(1, 18, 0), end: at(1, 19, 30),
        calendarId: 'cal_school', categoryId: 'cat_study',
        location: 'Public Library',
        participants: [{ name: 'Sarah', rsvp: 'yes' }, { name: 'Marcus', rsvp: 'maybe' }]
      }),
      M.makeEvent({
        title: 'Dentist appointment', start: at(3, 15, 0), end: at(3, 16, 0),
        calendarId: 'cal_personal', categoryId: 'cat_health',
        location: 'Riverside Dental', travelMinutes: 15, reminders: [1440, 60]
      }),
      M.makeEvent({
        title: 'Meeting with Sarah — science fair', start: at(2, 16, 0), end: at(2, 17, 0),
        calendarId: 'cal_school', projectId: projects[0].id,
        participants: [{ name: 'Sarah', rsvp: 'yes' }]
      }),
      M.makeEvent({
        title: 'Family dinner', start: at(5, 18, 30), end: at(5, 20, 0),
        calendarId: 'cal_family', categoryId: 'cat_family'
      }),
      M.makeEvent({
        title: 'Grandma’s birthday', start: at(12, 0, 0), end: at(12, 23, 59),
        allDay: true, calendarId: 'cal_birthdays',
        recurrence: { freq: 'yearly', interval: 1 }
      }),
      M.makeEvent({
        title: 'Fall break', start: at(24, 0, 0), end: at(28, 23, 59),
        allDay: true, calendarId: 'cal_holidays'
      }),
      M.makeEvent({
        title: 'College visit — state university', start: at(16, 9, 0), end: at(17, 16, 0),
        calendarId: 'cal_personal', projectId: projects[2].id,
        location: 'State University', allDay: false
      }),
      M.makeEvent({
        title: 'Work on history paper', start: at(1, 19, 45), end: at(1, 21, 0),
        type: 'block', categoryId: 'cat_homework', projectId: projects[1].id
      })
    );

    var tasks = [
      M.makeTask({
        title: 'Study for biology test', due: at(1, 21, 0), hasDueTime: false,
        estimate: 120, priority: 'critical', status: 'planned',
        categoryId: 'cat_study', deadlineId: deadlines[1].id, tags: ['biology', 'school'],
        description: 'Chapters 4 and 5 — cell respiration and photosynthesis.',
        subtasks: [
          { id: M.uid('sub'), title: 'Re-read chapter 4', done: true },
          { id: M.uid('sub'), title: 'Make flashcards for the vocabulary', done: false },
          { id: M.uid('sub'), title: 'Do the practice questions', done: false }
        ]
      }),
      M.makeTask({
        title: 'Finish history essay outline', due: at(2, 23, 59),
        estimate: 60, priority: 'high', status: 'in-progress',
        projectId: projects[1].id, deadlineId: deadlines[0].id,
        categoryId: 'cat_homework', tags: ['history']
      }),
      M.makeTask({
        title: 'Draft the history paper introduction', due: at(5, 23, 59),
        estimate: 90, priority: 'high', status: 'inbox',
        projectId: projects[1].id, deadlineId: deadlines[0].id, categoryId: 'cat_homework'
      }),
      M.makeTask({
        title: 'Buy poster board', due: at(6, 23, 59),
        estimate: 30, priority: 'medium', status: 'inbox',
        projectId: projects[0].id, tags: ['errand']
      }),
      M.makeTask({
        title: 'Email Mr. Chen about the lab equipment',
        due: at(0, 23, 59), estimate: 15, priority: 'high', status: 'inbox',
        projectId: projects[0].id, tags: ['school']
      }),
      M.makeTask({
        title: 'Run the second trial for the basil experiment',
        due: at(4, 23, 59), estimate: 60, priority: 'high', status: 'inbox',
        projectId: projects[0].id, categoryId: 'cat_study'
      }),
      M.makeTask({
        title: 'Analyze the growth data', estimate: 90, priority: 'medium', status: 'inbox',
        projectId: projects[0].id
      }),
      M.makeTask({
        title: 'Build the science fair presentation', estimate: 120, priority: 'medium', status: 'inbox',
        projectId: projects[0].id, categoryId: 'cat_creative'
      }),
      M.makeTask({
        title: 'Practise the science fair presentation', estimate: 45, priority: 'low', status: 'inbox',
        projectId: projects[0].id
      }),
      M.makeTask({
        title: 'Draft the college personal essay', due: at(14, 23, 59),
        estimate: 120, priority: 'high', status: 'inbox',
        projectId: projects[2].id, goalId: goals[2].id, tags: ['college']
      }),
      M.makeTask({
        title: 'Ask Ms. Alvarez for a recommendation letter', due: at(7, 23, 59),
        estimate: 20, priority: 'critical', status: 'inbox',
        projectId: projects[2].id, goalId: goals[2].id, tags: ['college']
      }),
      M.makeTask({
        title: 'Return library books', due: at(-1, 23, 59),
        estimate: 20, priority: 'medium', status: 'inbox', tags: ['errand']
      }),
      M.makeTask({
        title: 'Fix the tricky passage in bar 32', estimate: 30, priority: 'medium',
        status: 'inbox', goalId: goals[0].id, categoryId: 'cat_practice'
      }),
      M.makeTask({
        title: 'Algebra problem set 7', due: at(2, 23, 59), estimate: 45,
        priority: 'high', status: 'inbox', categoryId: 'cat_homework', tags: ['math']
      }),
      M.makeTask({
        title: 'Read chapter 3 of the English novel', due: at(3, 23, 59),
        estimate: 40, priority: 'medium', status: 'inbox', categoryId: 'cat_homework'
      }),
      M.makeTask({
        title: 'Clean and reorganize desk', estimate: 30, priority: 'low', status: 'inbox'
      }),
      M.makeTask({
        title: 'Read chapter 2 of the English novel', estimate: 40, priority: 'medium',
        status: 'completed', completedAt: at(-1, 20, 0), categoryId: 'cat_homework'
      }),
      M.makeTask({
        title: 'Turn in the algebra homework', estimate: 15, priority: 'medium',
        status: 'completed', completedAt: at(-2, 12, 0), categoryId: 'cat_homework'
      }),
      M.makeTask({
        title: 'Set up the basil experiment', estimate: 90, priority: 'high',
        status: 'completed', completedAt: at(-3, 17, 0), projectId: projects[0].id
      })
    ];

    // Link the first task to the study block that already exists on the calendar.
    var studyBlock = M.makeEvent({
      title: 'Study for biology test',
      start: at(1, 15, 0), end: at(1, 16, 30),
      type: 'block', categoryId: 'cat_study', taskId: tasks[0].id
    });
    tasks[0].scheduledEventId = studyBlock.id;
    events.push(studyBlock);

    var habits = [
      M.makeHabit({
        name: 'Read 20 minutes', schedule: { type: 'daily', days: [0, 1, 2, 3, 4, 5, 6] },
        time: 21 * 60, duration: 20, color: '#5aa0b8',
        log: logFor([-1, -2, -3, -5, -6, -7, -8])
      }),
      M.makeHabit({
        name: 'Practise piano', schedule: { type: 'weekdays', days: [1, 2, 3, 4, 5] },
        time: 17 * 60, duration: 30, color: '#c2871f', goalId: goals[0].id,
        log: logFor([-1, -2, -3, -4, -7, -8])
      }),
      M.makeHabit({
        name: 'Review the day’s notes', schedule: { type: 'weekdays', days: [1, 2, 3, 4, 5] },
        time: 20 * 60, duration: 15, color: '#7a5cd8',
        log: logFor([-1, -3, -4])
      }),
      M.makeHabit({
        name: 'Exercise', schedule: { type: 'times-per-week', timesPerWeek: 3, days: [] },
        duration: 45, color: '#3f9e77',
        log: logFor([-2, -4, -6, -9])
      })
    ];

    var notes = [
      M.makeNote({
        title: 'Biology — cell respiration',
        type: 'study',
        body: 'Glycolysis happens in the cytoplasm, the Krebs cycle in the mitochondrial matrix.\n\nNet ATP from one glucose molecule: 36–38.\n\nAsk Mr. Chen whether the test covers the electron transport chain in detail.',
        tags: ['biology', 'school']
      }),
      M.makeNote({
        title: 'Science fair — experiment log',
        type: 'note',
        body: 'Trial 1: red light group grew 2.1 cm on average, blue 3.4 cm, control 2.8 cm over ten days.\n\nNeed a second trial to check whether the blue result holds.',
        projectId: projects[0].id,
        tags: ['science']
      }),
      M.makeNote({
        title: 'Essay ideas',
        type: 'idea',
        body: 'Personal essay angles worth trying:\n- The summer I rebuilt the bike from parts\n- Teaching my cousin to read music\n- Why I kept going back to the same three books',
        projectId: projects[2].id,
        pinned: true,
        tags: ['college']
      }),
      M.makeNote({
        title: 'Packing list for the college visit',
        type: 'checklist',
        checklist: [
          { id: M.uid('ck'), title: 'Notebook and questions', done: false },
          { id: M.uid('ck'), title: 'Comfortable shoes', done: false },
          { id: M.uid('ck'), title: 'Charger', done: false },
          { id: M.uid('ck'), title: 'Snacks for the drive', done: false }
        ],
        projectId: projects[2].id
      })
    ];

    var captures = [
      M.makeCapture({ text: 'Ask about the makeup lab for the day I missed' }),
      M.makeCapture({ text: 'Maybe start a study playlist' })
    ];

    var templates = [
      M.makeTemplate({ name: 'Study session', payload: { title: 'Study session', durationMinutes: 60, categoryId: 'cat_study', reminders: [10] } }),
      M.makeTemplate({ name: 'Workout', payload: { title: 'Workout', durationMinutes: 45, categoryId: 'cat_exercise' } }),
      M.makeTemplate({ name: 'Project work', payload: { title: 'Project work', durationMinutes: 90, categoryId: 'cat_homework' } }),
      M.makeTemplate({ name: 'Appointment', payload: { title: 'Appointment', durationMinutes: 30, travelMinutes: 20, reminders: [60] } })
    ];

    st.goals = goals;
    st.projects = projects;
    st.deadlines = deadlines;
    st.events = events;
    st.tasks = tasks;
    st.habits = habits;
    st.notes = notes;
    st.captures = captures;
    st.templates = templates;
    st.people = [
      M.makePerson({ name: 'Sarah', role: 'Science fair partner' }),
      M.makePerson({ name: 'Marcus', role: 'Study group' }),
      M.makePerson({ name: 'Mr. Chen', role: 'Biology teacher' }),
      M.makePerson({ name: 'Ms. Alvarez', role: 'History teacher' })
    ];
    return st;
  }

  function logFor(offsets) {
    var log = {};
    offsets.forEach(function (o) { log[dayKey(o)] = true; });
    return log;
  }

  global.SEED = { build: build };
})(window);
