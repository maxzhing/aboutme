import type { APCourse } from '@/domain/types';
import { course, G } from './shared';

/** Arts and world language AP courses. */
export const AP_ARTS: APCourse[] = [
  course({
    id: 'ap-music-theory',
    name: 'AP Music Theory',
    family: 'Arts',
    summary:
      'A first-year college music theory course covering notation, harmony, voice leading, form and aural skills, with sight-singing performed on the exam.',
    typicalGrades: G(10, 11, 12),
    prerequisites: ['Ability to read music; performance experience strongly recommended'],
    workload: 4,
    examSections: [
      { name: 'Section I: Multiple Choice', questionCount: 75, minutes: 80, weightPct: 45, description: 'Aural questions using recorded excerpts and non-aural questions on notated scores.' },
      { name: 'Section II: Free Response (written)', questionCount: 7, minutes: 70, weightPct: 45, description: 'Melodic and harmonic dictation, part writing from a figured bass and from a Roman numeral progression, and harmonisation of a melody.' },
      { name: 'Section II: Sight-Singing', questionCount: 2, minutes: 10, weightPct: 10, description: 'Two recorded sight-singing melodies with a brief practice period for each.' },
    ],
    examTotalMinutes: 160,
    questionTypes: ['Multiple choice', 'Aural dictation', 'Part writing', 'Harmonisation', 'Sight-singing', 'Score analysis'],
    supportsMajors: ['music', 'music-technology', 'education', 'film-media'],
    units: [
      { number: 1, title: 'Music Fundamentals I: Pitch, Major Scales and Keys, Rhythm, Meter', examWeight: '15–20%', description: 'Notation, scales, key signatures, rhythm and metre.', bigIdeas: ['Pitch', 'Rhythm'], concepts: ['Staff notation and clefs', 'Major scales and key signatures', 'Circle of fifths', 'Note values and rests', 'Simple and compound metre', 'Rhythmic notation and beaming'], vocabulary: [{ term: 'Circle of fifths', definition: 'An arrangement of keys by fifths that organises key signatures and relationships.' }, { term: 'Compound metre', definition: 'Metre where the beat divides into three, such as 6/8.' }], skills: ['Notate rhythm accurately', 'Identify keys instantly from signatures'] },
      { number: 2, title: 'Music Fundamentals II: Minor Scales and Keys, Melody, Timbre, Texture', examWeight: '20–25%', description: 'Minor modes, intervals, melodic analysis and texture.', bigIdeas: ['Pitch', 'Musical Design'], concepts: ['Natural, harmonic and melodic minor', 'Relative and parallel keys', 'Interval identification and inversion', 'Melodic contour and motive', 'Timbre and instrumentation', 'Monophonic, homophonic, polyphonic texture'], vocabulary: [{ term: 'Relative minor', definition: 'The minor key sharing a key signature with a given major key.' }, { term: 'Imitative polyphony', definition: 'Texture where voices enter successively with the same material.' }], skills: ['Identify intervals by sight and ear', 'Describe texture precisely'] },
      { number: 3, title: 'Music Fundamentals III: Triads and Seventh Chords', examWeight: '10–15%', description: 'Chord construction, inversions and figured bass.', bigIdeas: ['Pitch', 'Harmony'], concepts: ['Triad qualities', 'Seventh chord types', 'Inversions and figured bass symbols', 'Roman numeral analysis', 'Diatonic chords in major and minor'], vocabulary: [{ term: 'Figured bass', definition: 'Numerals under a bass line indicating intervals above it, encoding the harmony.' }, { term: 'First inversion', definition: 'A chord with its third in the bass, notated with a 6.' }], skills: ['Spell and identify chords fluently', 'Translate between figured bass and Roman numerals'] },
      { number: 4, title: 'Harmony and Voice Leading I: Chord Function, Cadence, Phrase', examWeight: '10–15%', description: 'Tonic, dominant and predominant functions, cadences and phrase structure.', bigIdeas: ['Harmony', 'Musical Design'], concepts: ['Harmonic function', 'Cadence types', 'Phrase and period structure', 'Soprano-bass counterpoint', 'Voice leading rules'], vocabulary: [{ term: 'Half cadence', definition: 'A phrase ending on V, creating an open, unresolved effect.' }, { term: 'Parallel fifths', definition: 'Consecutive perfect fifths between two voices, avoided in common-practice voice leading.' }], skills: ['Identify cadences by ear and on the page', 'Write correct four-part voice leading'] },
      { number: 5, title: 'Harmony and Voice Leading II: Chord Progressions and Predominant Function', examWeight: '10–15%', description: 'Standard progressions, inversions in context and predominant chords.', bigIdeas: ['Harmony'], concepts: ['Common progressions', 'Inversions in progressions', 'Predominant chords: ii, IV', 'Cadential six-four', 'Embellishing tones'], vocabulary: [{ term: 'Cadential six-four', definition: 'A tonic chord in second inversion that functions as dominant preparation.' }, { term: 'Passing tone', definition: 'A non-chord tone filling the space between two chord tones by step.' }], skills: ['Harmonise a melody idiomatically', 'Recognise embellishing tones in analysis'] },
      { number: 6, title: 'Harmony and Voice Leading III: Embellishments, Motives, and Melodic Devices', examWeight: '10–15%', description: 'Non-chord tones, motivic transformation and melodic construction.', bigIdeas: ['Musical Design'], concepts: ['Non-chord tone types', 'Motive and sequence', 'Melodic transformation', 'Melodic and harmonic dictation strategies'], vocabulary: [{ term: 'Suspension', definition: 'A non-chord tone held from the previous chord and resolved downward by step.' }, { term: 'Sequence', definition: 'Repetition of a melodic pattern at a different pitch level.' }], skills: ['Take accurate melodic dictation', 'Label non-chord tones correctly'] },
      { number: 7, title: 'Harmony and Voice Leading IV: Secondary Function', examWeight: '7–12%', description: 'Secondary dominants, tonicisation and modulation.', bigIdeas: ['Harmony'], concepts: ['Secondary dominant chords', 'Secondary leading-tone chords', 'Tonicisation vs modulation', 'Pivot chord modulation', 'Analysis of chromatic harmony'], vocabulary: [{ term: 'Secondary dominant', definition: 'A dominant chord of a key other than the tonic, written V/x.' }, { term: 'Pivot chord', definition: 'A chord functional in both the old and new key, smoothing a modulation.' }], skills: ['Spot and label secondary function', 'Analyse a modulation and name the new key'] },
      { number: 8, title: 'Modes and Form', examWeight: '5–10%', description: 'Modal scales and standard formal designs.', bigIdeas: ['Musical Design'], concepts: ['Church modes', 'Modal melody characteristics', 'Binary and ternary form', 'Rounded binary', 'Strophic and through-composed forms', 'Twelve-bar blues'], vocabulary: [{ term: 'Dorian mode', definition: 'A minor-sounding mode with a raised sixth degree.' }, { term: 'Rounded binary', definition: 'A two-part form in which the opening material returns at the end of the second part.' }], skills: ['Identify modes from melodic content', 'Diagram formal structure from a score'] },
    ],
  }),
  course({
    id: 'ap-art-and-design',
    name: 'AP Art and Design (2-D, 3-D, Drawing)',
    family: 'Arts',
    summary:
      'A portfolio course rather than an exam course. Students develop a sustained investigation and submit a portfolio of works and written evidence of their inquiry.',
    typicalGrades: G(10, 11, 12),
    prerequisites: ['Prior studio art coursework strongly recommended'],
    workload: 4,
    examSections: [
      { name: 'Sustained Investigation', questionCount: 15, weightPct: 60, description: 'Fifteen digital images documenting a sustained investigation guided by inquiry, with written evidence of practice, experimentation and revision.' },
      { name: 'Selected Works', questionCount: 5, weightPct: 40, description: 'Five works demonstrating skilful synthesis of materials, processes and ideas, with written statements. Drawing and 2-D submit images; 3-D submits images of physical works.' },
    ],
    questionTypes: ['Portfolio submission', 'Written inquiry statements', 'Documentation of process'],
    supportsMajors: ['art', 'design', 'architecture', 'film-media', 'music-technology'],
    units: [
      { number: 1, title: 'Inquiry and Investigation', examWeight: 'Assessed throughout the portfolio', description: 'Developing a question worth sustaining across a body of work.', bigIdeas: ['Investigate', 'Practice'], concepts: ['Forming a guiding inquiry', 'Research and visual sources', 'Sketchbook practice', 'Avoiding a theme that is merely a subject'], vocabulary: [{ term: 'Sustained investigation', definition: 'A body of work driven by a question that evolves through experimentation and revision.' }, { term: 'Inquiry', definition: 'The question or problem driving the work, which should generate more work rather than close it down.' }], skills: ['Write an inquiry that is specific and generative', 'Document decisions as you work'] },
      { number: 2, title: 'Materials, Processes and Ideas', examWeight: 'Assessed throughout the portfolio', description: 'Technical skill and the relationship between how work is made and what it means.', bigIdeas: ['Practice', 'Synthesis'], concepts: ['Material experimentation', 'Technical skill development', 'Process documentation', 'Synthesis of idea and material'], vocabulary: [{ term: 'Synthesis', definition: 'The integration of materials, processes and ideas so they reinforce one another.' }], skills: ['Experiment deliberately rather than randomly', 'Match material choice to intent'] },
      { number: 3, title: 'Revision and Critique', examWeight: 'Assessed throughout the portfolio', description: 'Iteration, critique and demonstrating growth across the portfolio.', bigIdeas: ['Practice', 'Investigate'], concepts: ['Critique methods', 'Revision as evidence of thinking', 'Documenting change over time', 'Selecting work for submission'], vocabulary: [{ term: 'Revision', definition: 'Reworking based on reflection, which the portfolio must visibly demonstrate.' }], skills: ['Take critique without defensiveness', 'Show a clear arc of development'] },
      { number: 4, title: 'Presentation and Academic Integrity', examWeight: 'Assessed throughout the portfolio', description: 'Photographing work well, writing statements and citing sources honestly.', bigIdeas: ['Synthesis'], concepts: ['Photographing 2-D and 3-D work', 'Writing concise statements', 'Citing appropriated imagery', 'Academic integrity in portfolio work'], vocabulary: [{ term: 'Appropriation', definition: 'Using existing imagery in new work, which must be cited and significantly transformed.' }], skills: ['Document work at professional quality', 'Cite sources in the portfolio correctly'] },
    ],
  }),
  course({
    id: 'ap-spanish-language',
    name: 'AP Spanish Language and Culture',
    family: 'World Languages',
    summary:
      'A course conducted in Spanish developing interpersonal, interpretive and presentational communication across six cultural themes, at roughly a third-year college level.',
    typicalGrades: G(10, 11, 12),
    prerequisites: ['Three or more years of Spanish, or heritage proficiency'],
    workload: 3,
    examSections: [
      { name: 'Section I Part A: Interpretive Reading', questionCount: 30, minutes: 40, weightPct: 25, description: 'Print texts with multiple-choice questions.' },
      { name: 'Section I Part B: Interpretive Reading and Listening', questionCount: 35, minutes: 55, weightPct: 25, description: 'Combined audio and print sources, plus audio-only sources.' },
      { name: 'Section II Part A: Written Presentational and Interpersonal', questionCount: 2, minutes: 85, weightPct: 25, description: 'An email reply and an argumentative essay drawing on three sources.' },
      { name: 'Section II Part B: Spoken Interpersonal and Presentational', questionCount: 2, minutes: 18, weightPct: 25, description: 'A simulated conversation and a cultural comparison presentation.' },
    ],
    examTotalMinutes: 180,
    questionTypes: ['Multiple choice', 'Email reply', 'Argumentative essay', 'Simulated conversation', 'Cultural comparison'],
    supportsMajors: ['languages', 'international-relations', 'linguistics', 'education', 'public-health', 'nursing', 'political-science'],
    units: [
      { number: 1, title: 'Families and Communities', examWeight: 'Themes recur across the exam', description: 'Family structures, customs, education and community life.', bigIdeas: ['Interpersonal Communication', 'Cultural Comparison'], concepts: ['Family structures across Spanish-speaking regions', 'Traditions and celebrations', 'Education systems', 'Community roles'], vocabulary: [{ term: 'Comparación cultural', definition: 'A structured comparison between your community and one in the Spanish-speaking world.' }], skills: ['Sustain a conversation on familiar topics', 'Compare cultural practices with specific examples'] },
      { number: 2, title: 'Personal and Public Identities', examWeight: 'Themes recur across the exam', description: 'Identity, beliefs, heroes and self-image.', bigIdeas: ['Cultural Comparison'], concepts: ['Individual and collective identity', 'National identity and symbols', 'Language and identity', 'Stereotypes'], vocabulary: [{ term: 'Identidad', definition: 'Identity — a recurring exam theme linking language, nation and self-concept.' }], skills: ['Discuss abstract topics in the target language'] },
      { number: 3, title: 'Beauty and Aesthetics', examWeight: 'Themes recur across the exam', description: 'Art, architecture, music, literature and definitions of beauty.', bigIdeas: ['Cultural Comparison'], concepts: ['Artistic movements in the Spanish-speaking world', 'Music and dance traditions', 'Architecture and heritage', 'Literary voices'], vocabulary: [{ term: 'Patrimonio cultural', definition: 'Cultural heritage — the shared inheritance of a community.' }], skills: ['Describe and evaluate cultural products'] },
      { number: 4, title: 'Science and Technology', examWeight: 'Themes recur across the exam', description: 'Innovation, ethics, health care and the digital world.', bigIdeas: ['Interpretive Communication'], concepts: ['Technology and social change', 'Health and medicine', 'Ethical questions in innovation', 'Access and inequality'], vocabulary: [{ term: 'Brecha digital', definition: 'Digital divide — unequal access to technology.' }], skills: ['Read technical and journalistic texts in Spanish'] },
      { number: 5, title: 'Contemporary Life', examWeight: 'Themes recur across the exam', description: 'Education, work, leisure, travel and social customs.', bigIdeas: ['Interpersonal Communication'], concepts: ['Work and career', 'Leisure and sport', 'Travel and hospitality', 'Social rituals and etiquette'], vocabulary: [{ term: 'Ocio', definition: 'Leisure — a common exam topic linking daily life and culture.' }], skills: ['Write a formal email with correct register'] },
      { number: 6, title: 'Global Challenges', examWeight: 'Themes recur across the exam', description: 'Environment, human rights, migration, economy and public health.', bigIdeas: ['Presentational Communication'], concepts: ['Environmental issues', 'Migration and diaspora', 'Human rights', 'Economic development', 'Public health'], vocabulary: [{ term: 'Desarrollo sostenible', definition: 'Sustainable development — meeting present needs without compromising the future.' }], skills: ['Build an argumentative essay from multiple sources in Spanish'] },
    ],
  }),
  course({
    id: 'ap-chinese-language',
    name: 'AP Chinese Language and Culture',
    family: 'World Languages',
    summary:
      'A course conducted in Mandarin developing interpersonal, interpretive and presentational communication across six cultural themes. The exam is administered entirely on computer.',
    typicalGrades: G(10, 11, 12),
    prerequisites: ['Roughly four years of Mandarin study, or heritage proficiency'],
    workload: 4,
    examSections: [
      { name: 'Section I Part A: Listening', questionCount: 25, minutes: 20, weightPct: 25, description: 'Multiple-choice questions on rejoinders and listening selections.' },
      { name: 'Section I Part B: Reading', questionCount: 35, minutes: 60, weightPct: 25, description: 'Multiple-choice questions on authentic reading passages.' },
      { name: 'Section II Part A: Writing', questionCount: 2, minutes: 30, weightPct: 25, description: 'A story narration and a response to an email, typed in Chinese characters.' },
      { name: 'Section II Part B: Speaking', questionCount: 2, minutes: 10, weightPct: 25, description: 'A simulated conversation and a cultural presentation, recorded.' },
    ],
    examTotalMinutes: 120,
    questionTypes: ['Multiple choice', 'Story narration', 'Email response', 'Simulated conversation', 'Cultural presentation'],
    calculatorPolicy: 'Not applicable. The exam is computer-based and requires typing Chinese characters using an input method.',
    supportsMajors: ['languages', 'linguistics', 'international-relations', 'business-administration', 'political-science'],
    units: [
      { number: 1, title: 'Families and Communities', examWeight: 'Themes recur across the exam', description: 'Family, customs, education and community in Chinese-speaking regions.', bigIdeas: ['Interpersonal Communication'], concepts: ['Family relationships and terms', 'Festivals and customs', 'School life', 'Community structures'], vocabulary: [{ term: '\u5bb6\u5ead (jiātíng)', definition: 'Family — a core theme vocabulary set covering relationship terms.' }], skills: ['Sustain conversation on daily topics', 'Type Chinese characters fluently'] },
      { number: 2, title: 'Personal and Public Identities', examWeight: 'Themes recur across the exam', description: 'Identity, values, heroes and self-presentation.', bigIdeas: ['Cultural Comparison'], concepts: ['Personal values', 'National symbols', 'Role models', 'Language and identity'], vocabulary: [{ term: '\u6587\u5316 (wénhuà)', definition: 'Culture — used constantly in the cultural presentation task.' }], skills: ['Present a cultural comparison in Mandarin'] },
      { number: 3, title: 'Beauty and Aesthetics', examWeight: 'Themes recur across the exam', description: 'Art, calligraphy, music, literature and architecture.', bigIdeas: ['Cultural Comparison'], concepts: ['Calligraphy and visual art', 'Traditional and modern music', 'Classical literature references', 'Architecture and gardens'], vocabulary: [{ term: '\u4e66\u6cd5 (shūfǎ)', definition: 'Calligraphy — a frequent cultural presentation topic.' }], skills: ['Describe and evaluate cultural products'] },
      { number: 4, title: 'Science and Technology', examWeight: 'Themes recur across the exam', description: 'Innovation, digital life, health and the environment.', bigIdeas: ['Interpretive Communication'], concepts: ['Technology in daily life', 'Health and medicine', 'Environmental issues', 'Scientific vocabulary'], vocabulary: [{ term: '\u73af\u5883 (huánjìng)', definition: 'Environment — high-frequency in reading passages.' }], skills: ['Read authentic informational texts'] },
      { number: 5, title: 'Contemporary Life', examWeight: 'Themes recur across the exam', description: 'Work, travel, food, leisure and social media.', bigIdeas: ['Interpersonal Communication'], concepts: ['Careers and work life', 'Travel and transport', 'Food culture', 'Social media use'], vocabulary: [{ term: '\u65c5\u884c (lǚxíng)', definition: 'Travel — common in conversation and email tasks.' }], skills: ['Write an appropriate email response with correct register'] },
      { number: 6, title: 'Global Challenges', examWeight: 'Themes recur across the exam', description: 'Population, environment, economic development and public health.', bigIdeas: ['Presentational Communication'], concepts: ['Population and urbanisation', 'Economic development', 'Public health', 'International cooperation'], vocabulary: [{ term: '\u53ef\u6301\u7eed\u53d1\u5c55 (kě chíxù fāzhǎn)', definition: 'Sustainable development — a common presentation topic.' }], skills: ['Build a structured presentation on an abstract topic'] },
    ],
  }),
  course({
    id: 'ap-latin',
    name: 'AP Latin',
    family: 'World Languages',
    summary:
      "A course centred on Vergil's Aeneid and Caesar's Gallic War in Latin and in English, developing translation, analysis and contextual understanding.",
    typicalGrades: G(11, 12),
    prerequisites: ['Three years of Latin, including grammar and syntax'],
    workload: 4,
    examSections: [
      { name: 'Section I: Multiple Choice', questionCount: 50, minutes: 60, weightPct: 50, description: 'Syllabus and sight passages from Latin prose and poetry.' },
      { name: 'Section II: Free Response', questionCount: 5, minutes: 120, weightPct: 50, description: 'Two translations, one analytical essay, and short-answer questions on syllabus passages.' },
    ],
    examTotalMinutes: 180,
    questionTypes: ['Multiple choice', 'Translation', 'Literary analysis essay', 'Short answer', 'Scansion'],
    supportsMajors: ['classics', 'history', 'english', 'linguistics', 'philosophy', 'political-science'],
    units: [
      { number: 1, title: 'Vergil, Aeneid Books 1–2', examWeight: 'Syllabus divided across units', description: 'The storm, Dido, and the fall of Troy.', bigIdeas: ['Literary Analysis', 'Roman Values'], concepts: ['Epic conventions', 'Pietas and furor', 'Dactylic hexameter', 'Narrative framing', 'Simile analysis'], vocabulary: [{ term: 'Pietas', definition: 'Duty to gods, family and country — the defining virtue of Aeneas.' }, { term: 'Dactylic hexameter', definition: 'The six-foot metre of Latin epic poetry.' }], skills: ['Translate literally and accurately', 'Scan hexameter lines'] },
      { number: 2, title: 'Vergil, Aeneid Books 4, 6, 8, 12', examWeight: 'Syllabus divided across units', description: 'Dido’s tragedy, the underworld, the shield and the final duel.', bigIdeas: ['Literary Analysis', 'Roman Values'], concepts: ['Tragic structure', 'Prophecy and Roman destiny', 'Ekphrasis', 'Closure and ambiguity'], vocabulary: [{ term: 'Ekphrasis', definition: 'A vivid verbal description of a visual artwork, as with the shield of Aeneas.' }], skills: ['Build a literary argument from Latin text'] },
      { number: 3, title: 'Caesar, Gallic War Books 1, 4, 5, 6', examWeight: 'Syllabus divided across units', description: 'Caesar’s prose style, military narrative and ethnographic passages.', bigIdeas: ['Literary Analysis', 'Roman Values'], concepts: ['Caesar’s third-person narration', 'Indirect discourse', 'Ablative absolute', 'Ethnography as persuasion', 'Military vocabulary'], vocabulary: [{ term: 'Ablative absolute', definition: 'A participial phrase in the ablative expressing attendant circumstance.' }, { term: 'Oratio obliqua', definition: 'Indirect speech, extremely common in Caesar.' }], skills: ['Handle indirect discourse confidently', 'Analyse Caesar’s self-presentation'] },
      { number: 4, title: 'Sight Reading and Context', examWeight: 'Assessed throughout', description: 'Reading unseen Latin and situating both authors historically.', bigIdeas: ['Contextualization'], concepts: ['Strategies for sight passages', 'Late Republic history', 'Augustan Rome', 'Reception of the Aeneid'], vocabulary: [{ term: 'Principate', definition: 'The early imperial system established by Augustus.' }], skills: ['Read unseen Latin under time pressure', 'Place texts in historical context'] },
    ],
  }),
];
