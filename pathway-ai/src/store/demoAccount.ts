import type { AccountState } from '@/domain/types';
import { emptyAccountState } from './defaults';
import { addDays, nowISO, todayISO, toISODate, gradeToGradYear } from '@/lib/date';
import { uid } from '@/lib/id';
import { demo } from '@/data/provenance';

/**
 * A fully populated example account so the product can be explored without
 * typing a profile first. Everything here is fictional and labelled as demo
 * data in the UI. Section 74.
 */
export function buildDemoAccount(userId: string): AccountState {
  const state = emptyAccountState(userId, 'Maya Okonkwo');
  const today = todayISO();
  const p = state.profile;

  p.displayName = 'Maya Okonkwo';
  p.academics = {
    grade: 11,
    graduationYear: gradeToGradYear(11),
    school: 'Riverside High School',
    country: 'United States',
    state: 'NC',
    gpa: 3.87,
    gpaScale: '4.0',
    gpaWeighted: false,
    classRank: 18,
    classSize: 312,
    currentCourses: [
      'AP Calculus AB',
      'AP Computer Science A',
      'AP US History',
      'Honors Physics',
      'Spanish IV',
      'Music Theory (school course)',
    ],
    previousCourses: ['Algebra II', 'Honors Chemistry', 'Honors Biology', 'Spanish III', 'World History'],
    schoolOffersAP: [
      'ap-calculus-ab',
      'ap-calculus-bc',
      'ap-computer-science-a',
      'ap-computer-science-principles',
      'ap-statistics',
      'ap-physics-1',
      'ap-physics-c-mech',
      'ap-biology',
      'ap-chemistry',
      'ap-environmental-science',
      'ap-us-history',
      'ap-world-history',
      'ap-english-language',
      'ap-english-literature',
      'ap-macroeconomics',
      'ap-microeconomics',
      'ap-psychology',
      'ap-us-government',
      'ap-music-theory',
      'ap-spanish-language',
      'ap-human-geography',
      'ap-art-and-design',
    ],
    weeklyStudyHours: 9,
  };
  p.interests = ['computer-science', 'music', 'mathematics', 'economics', 'design', 'community-service'];
  p.customInterests = ['audio production'];
  p.majors = [
    { majorId: 'computer-science', confidence: 'leaning', note: 'I like building things people actually use.' },
    { majorId: 'music-technology', confidence: 'exploring', note: 'Not sure if this is a career or a hobby yet.' },
    { majorId: 'economics', confidence: 'exploring' },
  ];
  p.careers = ['software-engineer', 'audio-engineer', 'entrepreneur', 'product-manager'];
  p.customCareers = [];
  p.rigorTolerance = 'balanced';

  p.activities = [
    {
      id: uid('act'),
      name: 'Riverside Robotics (FRC Team 4417)',
      category: 'competition',
      organization: 'Riverside High School',
      role: 'Software lead',
      gradesInvolved: [9, 10, 11],
      hoursPerWeek: 12,
      weeksPerYear: 20,
      description:
        'Write and maintain the robot control code each season. I moved from writing autonomous routines to leading a three-person software subteam in grade 11.',
      accomplishments: [
        'Rebuilt the autonomous routine, which raised our reliable scoring rate across the 2024 season',
        'Wrote onboarding documentation the team still uses',
      ],
      leadership: true,
      personalConnection:
        'I joined because I wanted to see code move something physical. I stayed because I like teaching the new members.',
      onApplicationList: true,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    },
    {
      id: uid('act'),
      name: 'Piano — private study and recitals',
      category: 'music',
      role: 'Student performer',
      gradesInvolved: [9, 10, 11],
      hoursPerWeek: 8,
      weeksPerYear: 48,
      description:
        'Weekly lessons since age seven, working through advanced repertoire. Two recitals a year plus a regional festival.',
      accomplishments: ['Superior rating at the state solo festival, grade 10'],
      leadership: false,
      personalConnection: 'This is the thing I would keep doing even if nobody ever saw it.',
      onApplicationList: true,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    },
    {
      id: uid('act'),
      name: 'Code Club at Maple Street Library',
      category: 'community',
      organization: 'Maple Street Public Library',
      role: 'Founder and instructor',
      gradesInvolved: [10, 11],
      hoursPerWeek: 3,
      weeksPerYear: 30,
      description:
        'I started a free Saturday coding club for middle school students at our local library. I write the curriculum and now coordinate two other volunteer tutors.',
      accomplishments: [
        'Grew from 4 to 19 regular attendees over two years',
        'Trained two younger volunteers who now teach sessions independently',
      ],
      leadership: true,
      personalConnection:
        'My cousin could not get into a summer camp because of cost, so I wanted something free and close by.',
      onApplicationList: true,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    },
    {
      id: uid('act'),
      name: 'Part-time job — Bright Sound Music Shop',
      category: 'job',
      organization: 'Bright Sound Music',
      role: 'Sales and repairs assistant',
      gradesInvolved: [10, 11],
      hoursPerWeek: 9,
      weeksPerYear: 40,
      description: 'Weekend shifts helping customers, restringing instruments and doing basic setup work.',
      accomplishments: [],
      leadership: false,
      personalConnection: 'It pays for my lessons, and I learned to do basic instrument repair.',
      onApplicationList: true,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    },
    {
      id: uid('act'),
      name: 'Family responsibilities',
      category: 'family',
      role: 'Caregiver for younger sibling',
      gradesInvolved: [9, 10, 11],
      hoursPerWeek: 10,
      weeksPerYear: 52,
      description: 'I collect my younger brother from school and look after him until a parent is home.',
      accomplishments: [],
      leadership: false,
      onApplicationList: true,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    },
  ];

  p.awards = [
    { id: uid('award'), name: 'State Solo & Ensemble — Superior rating', level: 'state', year: 2024, note: 'Piano, Class A repertoire' },
    { id: uid('award'), name: 'Regional FRC Innovation in Control Award (team)', level: 'regional', year: 2024 },
    { id: uid('award'), name: 'AP Scholar', level: 'national', year: 2024 },
  ];

  p.scores = [
    { id: uid('score'), kind: 'PSAT', date: addDays(today, -280), total: 1290, sections: [{ label: 'Math', score: 660 }, { label: 'Reading & Writing', score: 630 }], official: true, label: 'PSAT/NMSQT grade 10' },
    { id: uid('score'), kind: 'AP', subject: 'AP World History: Modern', date: addDays(today, -140), total: 4, official: true },
    { id: uid('score'), kind: 'AP', subject: 'AP Computer Science Principles', date: addDays(today, -140), total: 5, official: true },
  ];

  p.plannedTests = [
    { id: uid('pt'), kind: 'SAT', date: addDays(today, 86), targetScore: 1450, note: 'First official attempt' },
    { id: uid('pt'), kind: 'AP', subject: 'AP Calculus AB', date: addDays(today, 150) },
    { id: uid('pt'), kind: 'AP', subject: 'AP Computer Science A', date: addDays(today, 152) },
    { id: uid('pt'), kind: 'AP', subject: 'AP US History', date: addDays(today, 148) },
  ];

  p.collegePrefs = {
    regions: ['South', 'Mid-Atlantic', 'New England'],
    states: [],
    settings: ['urban', 'suburban'],
    sizes: ['medium', 'large'],
    control: 'no-preference',
    budgetPerYear: 25000,
    aidImportance: 5,
    maxDistanceMiles: 900,
    priorities: ['music-strong', 'internship-access', 'research-heavy', 'need-met', 'affordable', 'interdisciplinary'],
    avoidStates: [],
    notes: 'I need strong financial aid. I would rather be somewhere I can keep playing seriously.',
  };

  p.goals = {
    idealExperience:
      'I want to be somewhere I can keep playing piano seriously without majoring in it, and still take real computer science courses. I would like small enough classes that professors know me, but a city nearby so I can find internships. Cost matters a lot — my family cannot take on large loans, so aid is the thing I worry about most. I would like to graduate having built something that people outside my school actually use.',
    personalGoals: [
      { id: uid('goal'), text: 'Raise SAT to 1450 before the spring test date', done: false, createdAt: nowISO() },
      { id: uid('goal'), text: 'Finish the music visualiser project and put it online', done: false, createdAt: nowISO() },
      { id: uid('goal'), text: 'Ask Ms. Herrera about a recommendation letter', done: true, createdAt: nowISO() },
    ],
  };
  p.onboardedAt = nowISO();
  p.onboardingStep = 8;

  /* --- College list ------------------------------------------------------ */
  const list: [string, AccountState['collegeList'][number]['stage']][] = [
    ['unc', 'application-planning'],
    ['cmu', 'considering'],
    ['michigan', 'considering'],
    ['rice', 'exploring'],
    ['northeastern', 'exploring'],
    ['gatech', 'considering'],
    ['spelman', 'exploring'],
  ];
  state.collegeList = list.map(([collegeId, stage], i) => ({
    id: uid('list'),
    collegeId,
    stage,
    intendedMajorId: collegeId === 'cmu' ? 'music-technology' : 'computer-science',
    notes: collegeId === 'unc' ? 'In-state. Morehead-Cain is a long shot but the application is worth it.' : undefined,
    checklist: (collegeId === 'unc'
      ? { 'common-app': true, transcript: true, recommendations: true }
      : {}) as Record<string, boolean>,
    addedAt: addDays(today, -40 + i * 4) + 'T12:00:00.000Z',
    updatedAt: nowISO(),
  }));

  /* --- Practice history -------------------------------------------------- */
  const satAttempts: [string, boolean, number][] = [
    ['sm-alg-001', true, 38],
    ['sm-alg-002', true, 52],
    ['sm-alg-003', false, 142],
    ['sm-alg-004', false, 71],
    ['sm-alg-005', true, 64],
    ['sm-alg-006', false, 88],
    ['sm-adv-001', true, 66],
    ['sm-adv-002', false, 151],
    ['sm-adv-003', true, 79],
    ['sm-adv-004', false, 168],
    ['sm-adv-005', true, 61],
    ['sm-adv-006', true, 49],
    ['sm-psda-001', true, 63],
    ['sm-psda-002', true, 35],
    ['sm-psda-003', true, 84],
    ['sm-psda-004', false, 96],
    ['sm-psda-005', true, 72],
    ['sm-psda-006', true, 55],
    ['sm-geo-001', true, 31],
    ['sm-geo-002', true, 58],
    ['sm-geo-003', false, 92],
    ['sm-geo-004', false, 121],
    ['sv-info-001', true, 74],
    ['sv-info-002', false, 118],
    ['sv-info-003', true, 65],
    ['sv-info-004', true, 91],
    ['sv-craft-001', true, 48],
    ['sv-craft-002', false, 104],
    ['sv-craft-003', false, 131],
    ['sv-craft-004', true, 87],
    ['sv-expr-001', true, 42],
    ['sv-expr-002', false, 112],
    ['sv-expr-003', true, 58],
    ['sv-conv-001', true, 44],
    ['sv-conv-002', true, 51],
    ['sv-conv-003', true, 47],
    ['sv-conv-004', false, 83],
    ['sv-conv-005', true, 55],
  ];
  state.attempts = satAttempts.map(([questionId, correct, elapsedSec], i) => ({
    id: uid('att'),
    questionId,
    exam: 'SAT' as const,
    correct,
    elapsedSec,
    usedHint: !correct && i % 3 === 0,
    viewedExplanation: !correct,
    mode: (i < 12 ? 'diagnostic' : i < 26 ? 'drill' : 'adaptive') as 'diagnostic' | 'drill' | 'adaptive',
    createdAt: addDays(today, -(38 - i)) + 'T17:30:00.000Z',
  }));

  const apAttempts: [string, boolean, number][] = [
    ['apcab-u2-001', true, 58],
    ['apcab-u6-001', true, 70],
    ['apcab-u5-001', false, 240],
    ['apcsa-u1-001', true, 41],
    ['apcsa-u3-001', true, 66],
    ['apcsa-u4-001', false, 118],
    ['apcsa-u7-001', false, 145],
    ['apcsa-u9-001', true, 80],
    ['apush-p5-001', false, 122],
    ['apush-p7-001', true, 390],
  ];
  state.attempts.push(
    ...apAttempts.map(([questionId, correct, elapsedSec], i) => ({
      id: uid('att'),
      questionId,
      exam: 'AP' as const,
      correct,
      elapsedSec,
      usedHint: false,
      viewedExplanation: !correct,
      mode: 'unit' as const,
      createdAt: addDays(today, -(20 - i * 2)) + 'T20:00:00.000Z',
    })),
  );

  state.satScores = [
    { id: uid('sat'), date: addDays(today, -62), label: 'Practice Test 1 (diagnostic)', math: 660, readingWriting: 620, total: 1280, official: false, note: 'Ran out of time on the second math module.' },
    { id: uid('sat'), date: addDays(today, -34), label: 'Practice Test 2', math: 690, readingWriting: 650, total: 1340, official: false },
    { id: uid('sat'), date: addDays(today, -9), label: 'Practice Test 3', math: 710, readingWriting: 670, total: 1380, official: false, note: 'Better pacing. Still losing points on inference questions.' },
  ];

  state.apUnitProgress = {
    'ap-calculus-ab:ap-calculus-ab-u1': 100,
    'ap-calculus-ab:ap-calculus-ab-u2': 100,
    'ap-calculus-ab:ap-calculus-ab-u3': 90,
    'ap-calculus-ab:ap-calculus-ab-u4': 65,
    'ap-calculus-ab:ap-calculus-ab-u5': 30,
    'ap-computer-science-a:ap-computer-science-a-u1': 100,
    'ap-computer-science-a:ap-computer-science-a-u2': 100,
    'ap-computer-science-a:ap-computer-science-a-u3': 100,
    'ap-computer-science-a:ap-computer-science-a-u4': 85,
    'ap-computer-science-a:ap-computer-science-a-u5': 70,
    'ap-computer-science-a:ap-computer-science-a-u6': 50,
    'ap-us-history:ap-us-history-u1': 100,
    'ap-us-history:ap-us-history-u2': 100,
    'ap-us-history:ap-us-history-u3': 100,
    'ap-us-history:ap-us-history-u4': 80,
    'ap-us-history:ap-us-history-u5': 45,
  };

  /* --- Deadlines and calendar ------------------------------------------- */
  state.deadlines = [
    { id: uid('dl'), title: 'SAT registration closes', date: addDays(today, 24), category: 'test-registration', refType: 'test', done: false, provenance: demo(), createdAt: nowISO(), notes: 'Late registration costs extra.' },
    { id: uid('dl'), title: 'Morehead-Cain Scholarship nomination', date: addDays(today, 41), category: 'scholarship', refType: 'college', refId: 'unc', done: false, provenance: demo(), createdAt: nowISO() },
    { id: uid('dl'), title: 'Summer research programme applications', date: addDays(today, 58), category: 'program', done: false, provenance: demo(), createdAt: nowISO(), notes: 'Several close the same week. Start the essay early.' },
    { id: uid('dl'), title: 'AP exam registration through school', date: addDays(today, 12), category: 'exam', refType: 'ap', done: false, provenance: demo(), createdAt: nowISO() },
    { id: uid('dl'), title: 'Regional FRC competition', date: addDays(today, 33), category: 'competition', done: false, provenance: demo(), createdAt: nowISO() },
  ];

  state.calendarEvents = [
    { id: uid('ev'), title: 'Piano lesson', date: addDays(today, 2), startTime: '16:30', minutes: 60, kind: 'activity', scope: 'Piano', done: false, generated: false, createdAt: nowISO() },
    { id: uid('ev'), title: 'AP Calculus unit 4 test', date: addDays(today, 5), kind: 'exam', scope: 'AP Calculus AB', done: false, generated: false, createdAt: nowISO() },
    { id: uid('ev'), title: 'Code Club session', date: addDays(today, 4), startTime: '10:00', minutes: 90, kind: 'activity', scope: 'Code Club', done: false, generated: false, createdAt: nowISO() },
    { id: uid('ev'), title: 'APUSH DBQ practice', date: addDays(today, 1), minutes: 45, kind: 'study', scope: 'AP US History', done: false, generated: false, createdAt: nowISO() },
  ];

  /* --- Saved items and learned preferences ------------------------------ */
  state.savedItems = [
    { id: uid('saved'), targetType: 'opportunity', targetId: 'opp-local-lab-outreach', status: 'interested', createdAt: nowISO() },
    { id: uid('saved'), targetType: 'opportunity', targetId: 'opp-hackathon-local', status: 'completed', createdAt: nowISO() },
    { id: uid('saved'), targetType: 'scholarship', targetId: 'sch-local-community-foundation', status: 'saved', createdAt: nowISO() },
    { id: uid('saved'), targetType: 'project', targetId: 'proj-music-visualizer', status: 'interested', createdAt: nowISO() },
    { id: uid('saved'), targetType: 'college', targetId: 'unc', status: 'saved', createdAt: nowISO() },
  ];

  state.learnedPreferences = [
    { id: uid('pref'), statement: 'Keep annual out-of-pocket cost under $25,000', kind: 'max-cost', value: 25000, source: 'onboarding', active: true, createdAt: nowISO() },
    { id: uid('pref'), statement: 'Not interested in programmes that cost more than $1,000', kind: 'note', value: 'high-cost programmes', source: 'feedback', active: true, createdAt: nowISO() },
    { id: uid('pref'), statement: 'Already leading a tutoring programme — do not suggest starting one', kind: 'exclude-tag', value: 'tutoring', source: 'feedback', active: true, createdAt: nowISO() },
  ];

  state.feedback = [
    { id: uid('fb'), targetType: 'opportunity', targetId: 'opp-summer-research-university', kind: 'too-expensive', note: 'The paid ones only', createdAt: nowISO() },
    { id: uid('fb'), targetType: 'opportunity', targetId: 'opp-tutoring-program', kind: 'already-doing', createdAt: nowISO() },
  ];

  state.essays = [
    {
      id: uid('essay'),
      title: 'Personal statement — working draft',
      promptText:
        'Some students have a background, identity, interest, or talent that is so meaningful they believe their application would be incomplete without it. Share your story.',
      wordLimit: 650,
      body:
        'The first thing I ever programmed was a metronome, because the one on my phone annoyed me. It was forty lines long and it drifted about a beat every two minutes, which I did not notice until my piano teacher pointed out that I had been practising a Chopin étude slightly slower each week.\n\nThat is roughly how both halves of my life have gone since.',
      authenticityChecks: [],
      createdAt: nowISO(),
      updatedAt: nowISO(),
    },
  ];

  state.recommendationPackets = [
    {
      id: uid('rec'),
      recommenderName: 'Ms. Herrera',
      relationship: 'AP Computer Science A teacher',
      courseOrContext: 'AP CSA, grade 11; robotics software mentor',
      requestedAt: addDays(today, -14),
      dueDate: addDays(today, 200),
      status: 'confirmed',
      includeActivityIds: [],
      includeAwardIds: [],
      memories: [
        'The week I rewrote the autonomous routine three times and you let me use the lab after school',
        'When you told me my code worked but nobody else could read it',
      ],
      goalsNote: 'Applying to computer science programmes, hoping to keep music seriously alongside it.',
      createdAt: nowISO(),
    },
  ];

  state.achievements = {
    'first-sat-practice': addDays(today, -62) + 'T18:00:00.000Z',
    'hundred-questions': addDays(today, -6) + 'T19:00:00.000Z',
    'first-college-saved': addDays(today, -40) + 'T15:00:00.000Z',
    'first-diagnostic': addDays(today, -62) + 'T18:00:00.000Z',
  };

  state.preferences.acknowledgedDemoData = true;

  state.share = {
    enabled: true,
    parentName: 'Adaeze Okonkwo',
    parentEmail: 'parent@example.com',
    share: {
      deadlines: true,
      academics: true,
      majorPlanning: true,
      collegeList: true,
      financial: true,
      testing: true,
      activities: true,
      essays: false,
    },
  };

  // Activity log: mostly-consistent study days over the last five weeks.
  const log: string[] = [];
  for (let i = 40; i >= 0; i--) {
    if (i % 7 === 3) continue;
    log.push(toISODate(new Date(Date.now() - i * 86_400_000)));
  }
  state.activityLog = log;

  return state;
}
