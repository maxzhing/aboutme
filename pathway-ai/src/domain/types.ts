/* ==========================================================================
   Pathway AI — domain types
   One student profile object; every AI feature reads from it.
   ========================================================================== */

export type ID = string;
/** ISO-8601 date, `YYYY-MM-DD`. */
export type ISODate = string;
/** ISO-8601 timestamp. */
export type ISOTime = string;

/* -------------------------------------------------------------------------
   Data reliability — never blur these categories (see docs/DATA-POLICY.md)
   ---------------------------------------------------------------------- */

export type ProvenanceKind =
  /** Copied from an official/authoritative source and checked on `lastVerified`. */
  | 'verified'
  /** Produced by Pathway AI's reasoning engine. Guidance, not fact. */
  | 'ai'
  /** Typed in by the student (or their parent). */
  | 'user'
  /** Realistic placeholder shipped for development. Not a factual claim. */
  | 'demo'
  /** Structure we believe is right but have not checked against the source. */
  | 'unverified';

export interface Source {
  label: string;
  url?: string;
  /** Publisher of record, e.g. "College Board", "IPEDS". */
  publisher?: string;
}

export interface Provenance {
  kind: ProvenanceKind;
  sources?: Source[];
  /** When a human last checked this against the source. */
  lastVerified?: ISODate;
  note?: string;
}

/** Anything catalog-shaped carries provenance. */
export interface Sourced {
  provenance: Provenance;
}

/* -------------------------------------------------------------------------
   Users & accounts
   ---------------------------------------------------------------------- */

export type UserRole = 'student' | 'parent' | 'admin';

export interface User {
  id: ID;
  email: string;
  name: string;
  role: UserRole;
  createdAt: ISOTime;
  lastActiveAt: ISOTime;
  /** PBKDF2-SHA256 digest. Never the password. */
  passwordHash: string;
  passwordSalt: string;
  /** Present only while a reset is pending. */
  resetToken?: { token: string; expiresAt: ISOTime };
  /** Auth provider — email today, designed for more later. */
  provider: 'email';
}

export interface Session {
  userId: ID;
  startedAt: ISOTime;
  expiresAt: ISOTime;
}

/* -------------------------------------------------------------------------
   Student profile — the single personalization object
   ---------------------------------------------------------------------- */

export type GradeLevel = 9 | 10 | 11 | 12;
export type GpaScale = '4.0' | '5.0' | '100' | 'other';

export interface AcademicRecord {
  grade: GradeLevel;
  graduationYear: number;
  school: string;
  country: string;
  state: string;
  gpa?: number;
  gpaScale: GpaScale;
  gpaWeighted?: boolean;
  classRank?: number;
  classSize?: number;
  /** Course ids or free text, current year. */
  currentCourses: string[];
  previousCourses: string[];
  /** Courses the school offers — constrains the AP planner. */
  schoolOffersAP: string[];
  /** Hours per week the student says they can study. */
  weeklyStudyHours?: number;
}

export type RigorTolerance = 'light' | 'balanced' | 'heavy';

export interface SubjectStrength {
  subject: string;
  /** 0–100, derived — never shown as a grade. */
  score: number;
  band: 'emerging' | 'developing' | 'strong' | 'very-strong';
  /** Plain-language evidence for the band. */
  evidence: string[];
}

export type MajorConfidence = 'firm' | 'leaning' | 'exploring' | 'undecided';

export interface MajorIntent {
  majorId: string;
  confidence: MajorConfidence;
  /** Student's own words, optional. */
  note?: string;
}

export type ActivityCategory =
  | 'club'
  | 'sport'
  | 'music'
  | 'art'
  | 'research'
  | 'volunteering'
  | 'competition'
  | 'leadership'
  | 'job'
  | 'internship'
  | 'project'
  | 'community'
  | 'family'
  | 'other';

export interface StudentActivity {
  id: ID;
  name: string;
  category: ActivityCategory;
  organization?: string;
  role?: string;
  /** Grades in which the student participated. */
  gradesInvolved: GradeLevel[];
  hoursPerWeek?: number;
  weeksPerYear?: number;
  /** Student's own description. Never AI-invented. */
  description?: string;
  /** Student-entered accomplishments. Never AI-invented. */
  accomplishments: string[];
  leadership?: boolean;
  /** Student's own words on why it matters to them. */
  personalConnection?: string;
  /** Include on the application activity list. */
  onApplicationList: boolean;
  createdAt: ISOTime;
  updatedAt: ISOTime;
}

export interface Award {
  id: ID;
  name: string;
  level: 'school' | 'regional' | 'state' | 'national' | 'international' | 'other';
  year?: number;
  note?: string;
}

export interface TestScore {
  id: ID;
  kind: 'SAT' | 'ACT' | 'PSAT' | 'AP' | 'other';
  /** For AP: the course name. For others: blank. */
  subject?: string;
  date?: ISODate;
  /** SAT total / ACT composite / AP 1-5 / PSAT total. */
  total?: number;
  sections?: { label: string; score: number }[];
  /** Official score report vs. a practice test. */
  official: boolean;
  label?: string;
}

export interface PlannedTest {
  id: ID;
  kind: 'SAT' | 'ACT' | 'PSAT' | 'AP';
  subject?: string;
  date?: ISODate;
  targetScore?: number;
  note?: string;
}

export type CampusSetting = 'urban' | 'suburban' | 'rural' | 'no-preference';
export type SchoolSize = 'small' | 'medium' | 'large' | 'no-preference';
export type Control = 'public' | 'private' | 'no-preference';

export interface CollegePreferences {
  regions: string[];
  states: string[];
  settings: CampusSetting[];
  sizes: SchoolSize[];
  control: Control;
  /** Max comfortable annual out-of-pocket, USD. */
  budgetPerYear?: number;
  aidImportance: 1 | 2 | 3 | 4 | 5;
  /** Miles; undefined means no constraint. */
  maxDistanceMiles?: number;
  /** Culture / opportunity priorities, keyed to college attributes. */
  priorities: string[];
  avoidStates: string[];
  notes?: string;
}

export interface Goals {
  /** Free text from onboarding step 8. */
  idealExperience?: string;
  /** Short goals the student sets themselves. */
  personalGoals: { id: ID; text: string; done: boolean; createdAt: ISOTime }[];
  /** Derived themes from `idealExperience`, with the phrases they came from. */
  derivedThemes?: { theme: string; evidence: string }[];
}

export interface StudentProfile {
  id: ID;
  userId: ID;
  displayName: string;
  academics: AcademicRecord;
  /** Subject ids from the interest catalog, plus any custom ones. */
  interests: string[];
  customInterests: string[];
  majors: MajorIntent[];
  careers: string[];
  customCareers: string[];
  activities: StudentActivity[];
  awards: Award[];
  scores: TestScore[];
  plannedTests: PlannedTest[];
  collegePrefs: CollegePreferences;
  goals: Goals;
  rigorTolerance: RigorTolerance;
  /** Set once onboarding finishes. */
  onboardedAt?: ISOTime;
  /** Highest onboarding step reached, so the wizard can resume. */
  onboardingStep: number;
  createdAt: ISOTime;
  updatedAt: ISOTime;
}

/* -------------------------------------------------------------------------
   Preference learning — "I don't want this"
   ---------------------------------------------------------------------- */

export type FeedbackKind =
  | 'not-interested'
  | 'too-expensive'
  | 'too-far'
  | 'too-time-consuming'
  | 'already-doing'
  | 'not-ready'
  | 'interested'
  | 'saved'
  | 'completed';

export interface Feedback {
  id: ID;
  /** Entity the student reacted to. */
  targetType: 'college' | 'opportunity' | 'scholarship' | 'research' | 'project' | 'ap-course' | 'major' | 'recommendation';
  targetId: string;
  kind: FeedbackKind;
  note?: string;
  createdAt: ISOTime;
}

/** Constraints the engine learns and the student can edit. */
export interface LearnedPreference {
  id: ID;
  /** Human-readable rule, shown in Settings → What the AI remembers. */
  statement: string;
  kind: 'exclude-state' | 'exclude-region' | 'max-cost' | 'max-hours' | 'exclude-category' | 'exclude-tag' | 'note';
  value?: string | number;
  source: 'onboarding' | 'feedback' | 'chat' | 'manual';
  active: boolean;
  createdAt: ISOTime;
}

/* -------------------------------------------------------------------------
   Catalog: colleges
   ---------------------------------------------------------------------- */

export interface CollegeDeadline {
  kind: 'ED' | 'ED2' | 'EA' | 'REA' | 'RD' | 'Rolling' | 'Priority' | 'Transfer';
  date?: ISODate;
  note?: string;
}

export interface College extends Sourced {
  id: string;
  name: string;
  shortName?: string;
  city: string;
  state: string;
  region: string;
  country: string;
  control: 'public' | 'private';
  setting: 'urban' | 'suburban' | 'rural';
  undergradEnrollment: number;
  sizeBand: 'small' | 'medium' | 'large';
  /** Percent, 0–100. */
  acceptanceRate?: number;
  /** Percent, 0–100. */
  graduationRate?: number;
  studentFacultyRatio?: string;
  testPolicy: 'required' | 'optional' | 'blind' | 'flexible';
  /** Middle-50% ranges where published. */
  sat25?: number;
  sat75?: number;
  act25?: number;
  act75?: number;
  gpaAvg?: number;
  tuitionInState?: number;
  tuitionOutState?: number;
  roomAndBoard?: number;
  avgNetPrice?: number;
  meetsFullNeed?: boolean;
  noLoanAid?: boolean;
  pctReceivingAid?: number;
  /** Merit aid available to first-year students. */
  meritAid?: boolean;
  deadlines: CollegeDeadline[];
  /** Major ids offered (catalog ids). */
  majors: string[];
  /** Programs the college is genuinely known for — drives academic fit. */
  strengths: string[];
  /** Named signature programs/institutes worth mentioning. */
  signaturePrograms: { name: string; description: string; relatedMajors: string[] }[];
  apCreditPolicy?: string;
  opportunities: {
    undergradResearch?: string;
    studyAbroad?: string;
    internships?: string;
    entrepreneurship?: string;
    coop?: string;
  };
  studentLife: {
    housing?: string;
    greekLife?: string;
    athletics?: string;
    music?: string;
    clubsCount?: number;
    culture: string[];
  };
  applicationRequirements: string[];
  website?: string;
  admissionsUrl?: string;
  netPriceCalculatorUrl?: string;
  /** Attribute tags matched against `CollegePreferences.priorities`. */
  tags: string[];
  blurb: string;
}

/* -------------------------------------------------------------------------
   Catalog: majors & careers
   ---------------------------------------------------------------------- */

export interface Major extends Sourced {
  id: string;
  name: string;
  /** Broad family, e.g. "Engineering". */
  family: string;
  summary: string;
  whatYouStudy: string[];
  typicalCourses: string[];
  skills: string[];
  /** Career ids. */
  careers: string[];
  /** Interest ids that point toward this major. */
  interestSignals: string[];
  /** AP course ids that build genuine preparation. */
  recommendedAP: string[];
  usefulAP: string[];
  competitions: string[];
  researchDirections: string[];
  projectIdeas: string[];
  relatedMajors: string[];
  exampleProgramColleges: string[];
  /** Quantitative load, 1–5. Used for honest preparation checks. */
  mathIntensity: 1 | 2 | 3 | 4 | 5;
  writingIntensity: 1 | 2 | 3 | 4 | 5;
  labIntensity: 1 | 2 | 3 | 4 | 5;
}

export interface Career extends Sourced {
  id: string;
  name: string;
  summary: string;
  dayToDay: string[];
  skills: string[];
  /** Major ids. */
  relatedMajors: string[];
  typicalEducation: string;
  industries: string[];
  highSchoolPrep: string[];
  extracurriculars: string[];
  /** Honest note: no major or college guarantees a career. */
  pathNote: string;
}

export interface InterestSubject {
  id: string;
  name: string;
  /** Grouping shown in the interest picker. */
  cluster: 'STEM' | 'Social Sciences' | 'Humanities' | 'Arts' | 'Professional' | 'Health' | 'Other';
  /** Subject strengths this interest maps onto. */
  strengthKeys: string[];
}

/* -------------------------------------------------------------------------
   Catalog: AP
   ---------------------------------------------------------------------- */

export interface APExamSection {
  name: string;
  questionCount?: number;
  minutes?: number;
  weightPct?: number;
  description: string;
  calculator?: string;
}

export interface APUnit {
  id: string;
  courseId: string;
  number: number;
  title: string;
  /** College Board publishes approximate exam weighting per unit. */
  examWeight?: string;
  description: string;
  bigIdeas: string[];
  concepts: string[];
  vocabulary: { term: string; definition: string }[];
  skills: string[];
}

export interface APCourse extends Sourced {
  id: string;
  name: string;
  /** Subject family for grouping. */
  family: string;
  summary: string;
  /** Typical placement, used by the planner. */
  typicalGrades: GradeLevel[];
  /** Course ids or plain prerequisites. */
  prerequisites: string[];
  /** 1–5 workload estimate. */
  workload: 1 | 2 | 3 | 4 | 5;
  examSections: APExamSection[];
  examTotalMinutes?: number;
  questionTypes: string[];
  calculatorPolicy?: string;
  units: APUnit[];
  studyResources: { label: string; url?: string; kind: 'official' | 'community' | 'in-app' }[];
  /** Major ids this course meaningfully prepares a student for. */
  supportsMajors: string[];
}

/* -------------------------------------------------------------------------
   Questions (AP + SAT) — all original, practice-only
   ---------------------------------------------------------------------- */

export type Difficulty = 'easy' | 'medium' | 'hard';

export type QuestionFormat =
  | 'multiple-choice'
  | 'short-answer'
  | 'free-response'
  | 'data-analysis'
  | 'graph-interpretation'
  | 'source-analysis'
  | 'calculation'
  | 'conceptual';

export interface Choice {
  id: string;
  text: string;
  /** Why this distractor is tempting, and what mistake picks it. */
  why?: string;
}

export interface PracticeQuestion {
  id: string;
  /** Always true in this app: original, Pathway-written practice items. */
  original: true;
  exam: 'AP' | 'SAT';
  /** AP course id, or SAT section. */
  courseId?: string;
  unitId?: string;
  satSection?: 'math' | 'reading-writing';
  domain: string;
  skill: string;
  format: QuestionFormat;
  difficulty: Difficulty;
  /** Passage / stimulus / data table, when the item needs one. */
  stimulus?: string;
  stimulusKind?: 'passage' | 'data' | 'graph' | 'scenario';
  prompt: string;
  choices?: Choice[];
  correctChoiceId?: string;
  /** For free-response / short-answer items. */
  rubric?: { points: number; criteria: string[] };
  sampleResponse?: string;
  explanation: string;
  /** Worked steps, shown one at a time by the tutor. */
  steps?: string[];
  hint?: string;
  /** Concept the item tests, used by the weakness tracker. */
  concept: string;
  /** Seconds a well-prepared student should need. */
  timeTargetSec: number;
  /** Common error the item is designed to expose. */
  commonError?: string;
  tags: string[];
}

export interface QuestionAttempt {
  id: ID;
  questionId: string;
  exam: 'AP' | 'SAT';
  /** Chosen option id, or free-text response. */
  response?: string;
  correct: boolean | null;
  /** Self-graded score for open responses. */
  selfScore?: number;
  elapsedSec: number;
  usedHint: boolean;
  viewedExplanation: boolean;
  /** Which practice surface produced the attempt. */
  mode: 'drill' | 'adaptive' | 'timed' | 'test' | 'unit' | 'review' | 'daily' | 'diagnostic';
  sessionId?: ID;
  createdAt: ISOTime;
}

export interface PracticeSession {
  id: ID;
  exam: 'AP' | 'SAT';
  mode: QuestionAttempt['mode'];
  label: string;
  /** AP course id or SAT section scope. */
  scope?: string;
  targetMinutes?: number;
  questionIds: string[];
  startedAt: ISOTime;
  completedAt?: ISOTime;
}

export interface SatScoreEntry {
  id: ID;
  date: ISODate;
  label: string;
  math: number;
  readingWriting: number;
  total: number;
  /** Official report vs. practice test. */
  official: boolean;
  note?: string;
}

/** An observed, evidence-backed error pattern. */
export interface ErrorPattern {
  id: string;
  statement: string;
  scope: string;
  /** Attempt ids supporting the claim. */
  evidenceAttemptIds: ID[];
  confidence: 'low' | 'medium' | 'high';
}

/* -------------------------------------------------------------------------
   Catalog: opportunities, scholarships, research
   ---------------------------------------------------------------------- */

export type OpportunityCategory =
  | 'research'
  | 'competition'
  | 'volunteering'
  | 'internship'
  | 'summer-program'
  | 'club'
  | 'stem'
  | 'business'
  | 'music'
  | 'arts'
  | 'leadership'
  | 'entrepreneurship'
  | 'community-service'
  | 'academic-program'
  | 'hackathon'
  | 'olympiad'
  | 'sports';

export interface Opportunity extends Sourced {
  id: string;
  name: string;
  organization?: string;
  category: OpportunityCategory;
  description: string;
  eligibility: string[];
  grades: GradeLevel[];
  minAge?: number;
  /** Rolling / annual text when no fixed date is published. */
  deadlineText?: string;
  deadlineMonth?: number;
  cost: 'free' | 'stipend' | 'low' | 'moderate' | 'high' | 'varies';
  costNote?: string;
  format: 'online' | 'in-person' | 'hybrid';
  location?: string;
  state?: string;
  website?: string;
  /** 1–5 commitment and 1–5 selectivity/difficulty. */
  commitment: 1 | 2 | 3 | 4 | 5;
  difficulty: 1 | 2 | 3 | 4 | 5;
  hoursPerWeek?: string;
  durationText?: string;
  /** Interest ids / major ids this fits. */
  interestTags: string[];
  majorTags: string[];
  suggestedPrep: string[];
  skillsBuilt: string[];
}

export interface Scholarship extends Sourced {
  id: string;
  name: string;
  sponsor: string;
  description: string;
  amountMin?: number;
  amountMax?: number;
  amountText: string;
  renewable?: boolean;
  grades: GradeLevel[];
  /** Eligibility rules in plain language. */
  eligibility: string[];
  academicRequirements?: string[];
  activityRequirements?: string[];
  states?: string[];
  majorTags: string[];
  deadlineText: string;
  deadlineMonth?: number;
  website?: string;
  essayRequired?: boolean;
  recommendationsRequired?: number;
}

export interface ResearchProgram extends Sourced {
  id: string;
  name: string;
  host: string;
  kind: 'university-program' | 'lab-placement' | 'competition' | 'independent' | 'summer-research' | 'mentorship';
  subjects: string[];
  description: string;
  grades: GradeLevel[];
  format: 'online' | 'in-person' | 'hybrid';
  location?: string;
  state?: string;
  paid: 'paid' | 'unpaid' | 'stipend' | 'varies';
  cost?: string;
  deadlineText: string;
  deadlineMonth?: number;
  commitment: string;
  selectivity: 1 | 2 | 3 | 4 | 5;
  eligibility: string[];
  website?: string;
  majorTags: string[];
}

export interface ProjectTemplate {
  id: string;
  title: string;
  objective: string;
  /** Interest/major id pairs that produce this idea. */
  majorTags: string[];
  interestTags: string[];
  skills: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  estimatedWeeks: number;
  hoursPerWeek: number;
  tools: string[];
  milestones: string[];
  finalProduct: string[];
  /** How to take it further if it goes well. */
  extensions: string[];
}

/* -------------------------------------------------------------------------
   Student-owned records
   ---------------------------------------------------------------------- */

export type ListStage =
  | 'exploring'
  | 'considering'
  | 'application-planning'
  | 'applying'
  | 'applied'
  | 'decision';

export interface CollegeListEntry {
  id: ID;
  collegeId: string;
  stage: ListStage;
  /** User-defined stage label overriding the standard set. */
  customStage?: string;
  intendedMajorId?: string;
  applicationRound?: CollegeDeadline['kind'];
  notes?: string;
  /** Checklist item ids that are complete. */
  checklist: Record<string, boolean>;
  decision?: 'accepted' | 'waitlisted' | 'deferred' | 'denied' | 'withdrawn';
  addedAt: ISOTime;
  updatedAt: ISOTime;
}

export type DeadlineCategory =
  | 'college-application'
  | 'scholarship'
  | 'test-registration'
  | 'exam'
  | 'program'
  | 'competition'
  | 'school'
  | 'personal';

export interface Deadline {
  id: ID;
  title: string;
  date: ISODate;
  category: DeadlineCategory;
  /** Link back to the entity it came from. */
  refType?: 'college' | 'scholarship' | 'opportunity' | 'research' | 'test' | 'ap';
  refId?: string;
  notes?: string;
  done: boolean;
  /** Where the date came from — a catalog date is only as good as its source. */
  provenance: Provenance;
  createdAt: ISOTime;
}

export type CalendarEventKind =
  | 'study'
  | 'exam'
  | 'deadline'
  | 'activity'
  | 'assignment'
  | 'goal'
  | 'test'
  | 'other';

export interface CalendarEvent {
  id: ID;
  title: string;
  date: ISODate;
  startTime?: string;
  minutes?: number;
  kind: CalendarEventKind;
  /** Subject or scope, e.g. "AP Biology" or "SAT Math". */
  scope?: string;
  notes?: string;
  done: boolean;
  /** Generated by the study planner (regenerable) vs. student-created. */
  generated: boolean;
  createdAt: ISOTime;
}

export interface StudyPlanBlock {
  day: number; // 0 = Sunday
  scope: string;
  minutes: number;
  focus: string;
  reason: string;
}

export interface StudyPlan {
  id: ID;
  label: string;
  /** Week the plan covers. */
  weekOf: ISODate;
  blocks: StudyPlanBlock[];
  totalMinutes: number;
  /** Inputs the plan was built from, so it can be explained. */
  inputs: {
    weeklyMinutes: number;
    commitments: { label: string; minutes: number }[];
    priorities: { scope: string; weight: number; reason: string }[];
  };
  createdAt: ISOTime;
  /** Student edits, tracked so regeneration can respect them. */
  edited: boolean;
}

export interface ApplicationTask {
  id: string;
  label: string;
  /** Standard tasks appear for every college. */
  standard: boolean;
  group: 'core' | 'testing' | 'essays' | 'recommendations' | 'financial' | 'other';
}

export interface EssayDraft {
  id: ID;
  title: string;
  promptText: string;
  collegeId?: string;
  wordLimit?: number;
  /** The student's own writing. */
  body: string;
  /** Brainstorm output, kept separate from the student's draft. */
  brainstorm?: BrainstormResult;
  authenticityChecks: AuthenticityResult[];
  updatedAt: ISOTime;
  createdAt: ISOTime;
}

export interface BrainstormResult {
  id: ID;
  generatedAt: ISOTime;
  stories: { title: string; seed: string; whyItWorks: string; fromProfile: string }[];
  themes: string[];
  structures: { name: string; outline: string[] }[];
  questions: string[];
  cautions: string[];
}

export interface AuthenticityResult {
  id: ID;
  runAt: ISOTime;
  wordCount: number;
  /** 0–100; higher means more specific/personal. */
  specificityScore: number;
  genericPhrases: { phrase: string; suggestion: string }[];
  unsupportedClaims: string[];
  profileConnections: string[];
  suggestions: string[];
}

export interface RecommendationPacket {
  id: ID;
  recommenderName: string;
  relationship: string;
  courseOrContext?: string;
  requestedAt?: ISODate;
  dueDate?: ISODate;
  status: 'planned' | 'asked' | 'confirmed' | 'submitted';
  /** Student-selected items to include. */
  includeActivityIds: ID[];
  includeAwardIds: ID[];
  /** Student's own words. */
  memories: string[];
  goalsNote?: string;
  createdAt: ISOTime;
}

export interface SavedItem {
  id: ID;
  targetType: 'college' | 'opportunity' | 'scholarship' | 'research' | 'project' | 'ap-course' | 'major' | 'career' | 'question';
  targetId: string;
  status: 'saved' | 'interested' | 'completed' | 'dismissed';
  note?: string;
  createdAt: ISOTime;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  /** Emoji-free glyph key rendered as an icon. */
  icon: string;
  earnedAt?: ISOTime;
  /** Progress toward the goal. */
  progress?: { current: number; target: number };
  category: 'testing' | 'academics' | 'colleges' | 'activities' | 'consistency' | 'projects';
}

/* -------------------------------------------------------------------------
   AI outputs
   ---------------------------------------------------------------------- */

/** Every recommendation carries its reasoning. Section 43. */
export interface Explanation {
  whyThis: string;
  whyNow: string;
  connection: string;
  requires: string;
  alternatives: string[];
  /** Honest statement of what the engine does not know. */
  uncertainty?: string;
  /** Evidence drawn from the profile, quoted back. */
  evidence: string[];
}

export type RecommendationPriority = 'important' | 'useful' | 'optional';

export interface Recommendation {
  id: ID;
  kind:
    | 'college'
    | 'ap-course'
    | 'opportunity'
    | 'project'
    | 'research'
    | 'scholarship'
    | 'action'
    | 'study'
    | 'major'
    | 'blind-spot'
    | 'summer';
  title: string;
  summary: string;
  priority: RecommendationPriority;
  /** Entity the recommendation points at. */
  refType?: SavedItem['targetType'] | 'route';
  refId?: string;
  route?: string;
  explanation: Explanation;
  /** 0–100 relevance for ordering, never presented as an admission chance. */
  relevance: number;
  createdAt: ISOTime;
  /** Student feedback on this recommendation. */
  feedback?: FeedbackKind;
}

export type FitBand = 'strong' | 'good' | 'moderate' | 'limited' | 'unclear';

export interface FitDimension {
  key: 'academic' | 'personal' | 'opportunity' | 'financial';
  label: string;
  /** 0–100 fit, explicitly not an admission probability. */
  score: number;
  band: FitBand;
  reasons: string[];
  gaps: string[];
  /** Data we would need to say more. */
  unknowns: string[];
}

export interface CollegeMatch {
  collegeId: string;
  dimensions: FitDimension[];
  overallBand: FitBand;
  /** Ordering only. Never framed as a chance of admission. */
  rank: number;
  headline: string;
  /** Academic-profile context, framed as preparation not probability. */
  academicContext: {
    gpaNote?: string;
    testNote?: string;
    /** Honest framing string shown next to every selectivity figure. */
    disclaimer: string;
  };
  matchedPrograms: { name: string; description: string }[];
  matchedOpportunities: string[];
  concerns: string[];
}

export interface APPlanItem {
  courseId: string;
  grade: GradeLevel;
  tier: 'recommended' | 'useful' | 'optional' | 'not-necessary';
  explanation: Explanation;
  /** Honest readiness read. */
  readiness: 'ready' | 'likely-ready' | 'build-first' | 'unknown';
  readinessNote: string;
  workload: number;
}

export interface APPlan {
  id: ID;
  generatedAt: ISOTime;
  byGrade: Record<number, APPlanItem[]>;
  /** Total workload per grade, so the plan stays realistic. */
  loadByGrade: Record<number, number>;
  /** Courses actually planned per grade, excluding listed alternatives. */
  plannedByGrade: Record<number, number>;
  notes: string[];
  warnings: string[];
}

export interface BlindSpot {
  id: string;
  area: 'academics' | 'testing' | 'activities' | 'colleges' | 'deadlines' | 'exploration' | 'applications';
  title: string;
  finding: string;
  priority: RecommendationPriority;
  /** Concrete, proportionate next step. */
  action: string;
  route?: string;
  evidence: string[];
}

export interface WhatIfScenario {
  id: ID;
  label: string;
  changes: {
    satTotal?: number;
    gpa?: number;
    addMajorId?: string;
    replaceMajorId?: string;
    addAPCourseIds?: string[];
    summerPath?: string;
    restrictRegions?: string[];
    budgetPerYear?: number;
  };
  createdAt: ISOTime;
}

export interface WhatIfResult {
  scenarioId: ID;
  /** Changes framed as shifts in options and preparation. */
  effects: {
    area: 'college-options' | 'academic-preparation' | 'activities' | 'planning' | 'financial';
    before: string;
    after: string;
    delta: string;
  }[];
  collegeShifts: { collegeId: string; beforeBand: FitBand; afterBand: FitBand; note: string }[];
  caveat: string;
}

export interface ChatMessage {
  id: ID;
  role: 'user' | 'assistant';
  content: string;
  createdAt: ISOTime;
  /** Profile fields the answer used, surfaced for transparency. */
  citedProfileFields?: string[];
  /** Follow-up chips. */
  suggestions?: string[];
  /** In-app links the answer points to. */
  links?: { label: string; route: string }[];
  /** Preferences the turn recorded. */
  learned?: string[];
}

export interface DailyBriefing {
  date: ISODate;
  greeting: string;
  priorities: { label: string; detail: string; route?: string; minutes?: number }[];
  oneThingToKnow: { text: string; source?: Source };
  oneOpportunity?: { id: string; name: string; why: string; route: string };
  oneDeadline?: { id: ID; title: string; date: ISODate; daysAway: number; route: string };
  recommendedAction: { label: string; route: string };
}

export interface WeeklyReview {
  weekOf: ISODate;
  accomplished: string[];
  improved: string[];
  unfinished: string[];
  patterns: string[];
  nextWeek: string[];
  /** Counts the review is built from, so nothing is exaggerated. */
  stats: { label: string; value: string }[];
}

export interface StudentDNA {
  generatedAt: ISOTime;
  academicStrengths: SubjectStrength[];
  interestProfile: { cluster: string; weight: number; subjects: string[] }[];
  majorMatches: {
    majorId: string;
    tier: 'strong-match' | 'possible-match' | 'exploration';
    why: string[];
    relevance: number;
  }[];
  careerPaths: { careerId: string; viaMajorIds: string[]; why: string }[];
  profileStrengths: { title: string; detail: string; evidence: string[] }[];
  developmentOpportunities: { title: string; detail: string; priority: RecommendationPriority; route?: string }[];
  /** Data the profile is missing, stated plainly rather than guessed. */
  missingInputs: string[];
}

/* -------------------------------------------------------------------------
   Sharing / parent view
   ---------------------------------------------------------------------- */

export interface ShareSettings {
  enabled: boolean;
  parentName?: string;
  parentEmail?: string;
  share: {
    deadlines: boolean;
    academics: boolean;
    majorPlanning: boolean;
    collegeList: boolean;
    financial: boolean;
    testing: boolean;
    activities: boolean;
    essays: boolean;
  };
}

/* -------------------------------------------------------------------------
   Settings & notifications
   ---------------------------------------------------------------------- */

export interface UserPreferences {
  theme: 'system' | 'light' | 'dark';
  contrast: 'normal' | 'high';
  fontScale: 'sm' | 'md' | 'lg' | 'xl';
  motion: 'system' | 'reduced' | 'full';
  /** Accepted the demo-data disclosure. */
  acknowledgedDemoData: boolean;
  notifications: {
    deadlines: boolean;
    opportunities: boolean;
    studyReminders: boolean;
    testProgress: boolean;
    apProgress: boolean;
    collegeUpdates: boolean;
    weeklyReview: boolean;
    /** Days before a deadline to start warning. */
    deadlineLeadDays: number;
  };
  /** Manual location when the browser API is not used. */
  location?: { label: string; state?: string; lat?: number; lon?: number; source: 'manual' | 'geolocation' };
}

export interface Notification {
  id: ID;
  kind:
    | 'deadline'
    | 'opportunity'
    | 'study'
    | 'sat-progress'
    | 'ap-progress'
    | 'college'
    | 'saved-deadline'
    | 'achievement'
    | 'system';
  title: string;
  body: string;
  route?: string;
  createdAt: ISOTime;
  read: boolean;
  /** Deduplication key so the same nudge is not re-created daily. */
  dedupeKey: string;
}

/* -------------------------------------------------------------------------
   Admin / content management
   ---------------------------------------------------------------------- */

export interface ContentRevision {
  id: ID;
  entity: 'college' | 'ap-course' | 'opportunity' | 'scholarship' | 'research' | 'major' | 'sat-content';
  entityId: string;
  field: string;
  previousValue: string;
  newValue: string;
  source: string;
  verifiedOn: ISODate;
  editedBy: string;
  editedAt: ISOTime;
  note?: string;
}

/* -------------------------------------------------------------------------
   Persisted account state — the shape the repository stores
   ---------------------------------------------------------------------- */

export interface AccountState {
  version: number;
  profile: StudentProfile;
  preferences: UserPreferences;
  collegeList: CollegeListEntry[];
  savedItems: SavedItem[];
  feedback: Feedback[];
  learnedPreferences: LearnedPreference[];
  attempts: QuestionAttempt[];
  practiceSessions: PracticeSession[];
  satScores: SatScoreEntry[];
  /** AP unit study progress: `courseId:unitId` → 0–100. */
  apUnitProgress: Record<string, number>;
  deadlines: Deadline[];
  calendarEvents: CalendarEvent[];
  studyPlans: StudyPlan[];
  essays: EssayDraft[];
  recommendationPackets: RecommendationPacket[];
  chat: ChatMessage[];
  notifications: Notification[];
  achievements: Record<string, ISOTime>;
  whatIfScenarios: WhatIfScenario[];
  share: ShareSettings;
  contentRevisions: ContentRevision[];
  /** Days the student was active, for streaks. */
  activityLog: ISODate[];
  /** Cached briefing so it is stable within a day. */
  briefingCache?: { date: ISODate; briefing: DailyBriefing };
  dismissedRecommendationIds: string[];
}
