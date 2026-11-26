import type { Lesson } from './lessons-math';

export const LESSONS_RW: Lesson[] = [
  {
    skill: 'cid',
    intro: 'Central Ideas and Details questions ask what a text is mainly about, or what it says about a particular point. The answer is always a paraphrase of something on the page.',
    detail: [
      'A main idea covers the whole text. In an informational passage it is usually a claim plus the explanation or evidence for it. In a literary passage it is often what the details reveal about a character or situation.',
      'Detail questions ("According to the text ...") point to a specific line. Find the line first, then match a choice to it. Comparative phrases such as "less X than Y" tell you exactly which detail matters.',
      'Passages built as "common view, then a scholar who complicates it" have the scholar\'s revised view as the main idea. Passages with "It depends on ..." have a qualified main idea; extreme versions of it are wrong.',
    ],
    rules: [
      'Summarize the text in your own words before reading the choices.',
      'Every part of the correct choice must be supported by the text.',
      'Match the text\'s strength: "may," "suggests," and "some" are not "proves," "always," and "all."',
      'Details illustrate the main idea; a single detail is not the main idea.',
    ],
    examples: [
      { q: 'A text says a study "found little support" for an assumption and that "what changed was the kind of work people chose to do." What is the main idea?', a: 'The study suggests the intervention changed the type of work, not the amount. It does not say the assumption has been abandoned by everyone, and it does not add effects the text never mentions.' },
      { q: 'A narrator says a character was "less troubled by the missing money than by the idea that her records were hiding something." What troubles her most?', a: 'The sense that her trusted records are hiding something. The comparison ranks the two worries for you.' },
    ],
    mistakes: [
      'Choosing a statement that is true in the real world but not stated in the text.',
      'Choosing a choice that covers only one sentence of the passage.',
      'Upgrading a hedge ("poorly understood") into a certainty ("identified").',
      'Turning a description of a problem into a recommendation.',
    ],
    shortcuts: [
      'The last sentence often restates the point in plain words. Use it as an anchor.',
      'Eliminate on a single wrong word. One unsupported word makes the whole choice wrong.',
      'Look for pivots ("but," "however," "yet"). What follows is usually what matters.',
    ],
  },
  {
    skill: 'coet',
    intro: 'Command of Evidence (Textual) questions give you a claim or hypothesis and ask which finding or quotation would support it, weaken it, or illustrate it.',
    detail: [
      'Restate the claim as "If X, then Y." Supporting evidence shows Y happening under condition X. Weakening evidence shows that Y does not happen, or that Y happens without X (pointing to another cause).',
      'When a hypothesis rejects one explanation and proposes another ("not because of A but because of B"), the strongest support rules out A and confirms B.',
      'For quotation questions, split the claim into its key terms. The quotation must show every term: the right subject and the right quality. If the claim has a contrast ("outwardly obedient but privately resistant"), find evidence for the part after "but."',
    ],
    rules: [
      'Relevance first: the evidence must involve the same variables as the claim.',
      'Direction second: it must point the way the question asks (support or weaken).',
      'A control or comparison group is the classic way to support or undermine a causal claim.',
      'Evidence that fits both rival explanations supports neither.',
    ],
    examples: [
      { q: 'Hypothesis: fish cheat less when other fish are watching. What supports it?', a: 'A finding that cheating occurs significantly less often when observers are present than when they are absent. It includes both the condition and the predicted result.' },
      { q: 'Claim: a bike-share program caused a drop in car traffic. What most undermines it?', a: 'Traffic fell just as much in similar cities with no bike-share program. The effect occurs without the supposed cause.' },
    ],
    mistakes: [
      'Picking a finding on the right topic that never mentions the key variable.',
      'Choosing evidence that would be true whether or not the hypothesis is correct.',
      'For quotations: choosing the most emotional line rather than the one that shows the claimed quality.',
      'Supporting the uncontroversial half of a two-part claim.',
    ],
    shortcuts: [
      'Before reading choices, predict what ideal evidence would look like.',
      'Ask of each choice: would this be surprising if the claim were false? If not, it is weak.',
      'For "weaken," look for an alternative cause or a counterexample.',
    ],
  },
  {
    skill: 'coeq',
    intro: 'Command of Evidence (Quantitative) questions pair a short text with a table or graph. You choose the data that supports or completes the statement in the text.',
    detail: [
      'Most choices are accurate descriptions of the data. The task is to find the one that is relevant to the specific claim. Decide what comparison the claim needs before looking at the choices.',
      'An effect is a difference: with versus without, after versus before. A claim that an effect "varied," "grew," or "was weakest" requires comparing differences, not final levels.',
      'A claim about a trend across categories needs values from several categories. A claim about timing ("lagged," "first") needs an early period and a later one. An "although A, B" claim needs evidence for B.',
    ],
    rules: [
      'Check each choice twice: is it accurate, and does it support this claim?',
      'Effect = treated − control (or after − before).',
      'Use the rows and columns the claim names; ignore the rest.',
      'A two-part claim needs two-part evidence.',
    ],
    examples: [
      { q: 'Claim: a program\'s effect varied from town to town. Which data support it?', a: 'One town\'s rate rising 16 points while another\'s rose 2 points. "Every town improved" is accurate but shows what the towns share, not how they differ.' },
      { q: 'Claim: the treatment speeds germination but does not increase the final total. Which data?', a: 'A large gap between treated and untreated seeds at 7 days and almost no gap at 21 days.' },
    ],
    mistakes: [
      'Selecting a choice because its numbers are accurate.',
      'Confusing the lowest final value with the smallest change.',
      'Citing data about a different group or treatment than the one in the claim.',
      'Missing one inaccurate word such as "only."',
    ],
    shortcuts: [
      'Do the subtraction for each row before reading the choices when the claim is about change.',
      'Read the words immediately before the blank; they tell you which series and what direction.',
    ],
  },
  {
    skill: 'inf',
    intro: 'Inference questions end with a blank and ask which choice most logically completes the text. The answer is the conclusion the evidence requires: nothing less, and nothing more.',
    detail: [
      'An inference is different from an assumption. An inference follows from what is stated; an assumption brings in something the text never mentions (a future plan, a motive, a comparison with today).',
      'Texts often rule out alternatives for you. Phrases such as "even though," "the same conditions," and "of the same length" eliminate explanations, and the conclusion is what remains.',
      'Match the strength of the evidence. One study or one case supports "may," "suggests," or "depends on," not "always" or "never." When two findings point in different directions, the correct inference accounts for both.',
    ],
    rules: [
      'The completion must be driven by the sentence right before the blank.',
      'Identify what differed and what was held constant; the inference is about what differed.',
      'A single counterexample disproves "always" but does not prove "never."',
      'Keep stages separate: evidence about recovery supports conclusions about recovery, not about the original cause.',
    ],
    examples: [
      { q: 'Birds flew less consistently on cloudy nights than on clear ones, with similar wind. This suggests that ...', a: '... the birds rely at least partly on the stars to orient themselves. Not "cannot migrate when cloudy" (too strong) and not "wind determines direction" (ruled out).' },
      { q: 'A pigment made after 1838 appears in a painting, but only on top of an older varnish layer. So the pigment ...', a: '... shows only that the painting was retouched in or after 1838, not when it was first painted.' },
    ],
    mistakes: [
      'Choosing an extreme version of a reasonable idea.',
      'Choosing an explanation the text specifically ruled out.',
      'Predicting what happens next when the text gives no basis.',
      'Reversing cause and effect.',
    ],
    shortcuts: [
      'Trace the logic as a chain with arrows; the blank is the last link.',
      'Prefer modest wording when evidence is limited.',
      'Words like "therefore" and "consequently" before the blank mean: restate the passage\'s own reasoning.',
    ],
  },
  {
    skill: 'wic',
    intro: 'Words in Context questions ask for the most logical and precise word for a blank, or for what a word means as it is used in the text. The sentence itself always defines the word.',
    detail: [
      'Every blank comes with a clue: a restatement after a colon or dash, an appositive after a comma, a result clause ("so ___ that ..."), or a contrast ("although," "rather than," "far from"). Find the clue and predict your own word before reading the choices.',
      'Precision means matching the exact shade of meaning. Two choices can point in the same general direction ("careless" and "ruthless" both involve heavy cutting) while only one fits every detail.',
      'For "most nearly means" questions, common words often carry secondary meanings ("qualified" = limited; "cool" = unfriendly). Substitute each choice and test it against the surrounding details.',
    ],
    rules: [
      'A colon, dash, or semicolon after the blank usually introduces its definition.',
      '"Rather than X, Y" and "far from X" make the blank the opposite of what actually happened.',
      'When a clue has two parts joined by "but," the answer must fit both.',
      'Track whose view the blank expresses (early critics versus recent research).',
    ],
    examples: [
      { q: 'The weather is notoriously ______; a clear morning can give way to hail within the hour.', a: 'Capricious (changeable and unpredictable). The clause after the semicolon defines it.' },
      { q: 'The discovery did not so much overturn the theory as ______ it: the framework survived, but some assumptions were adjusted.', a: 'Refine. "Refute" and "abandon" conflict with "the framework survived"; "validate" conflicts with "assumptions were adjusted."' },
    ],
    mistakes: [
      'Choosing a word associated with the topic that does not fit the sentence\'s logic.',
      'Picking the word that matches the other viewpoint in a contrast.',
      'Rejecting an unfamiliar word in favor of a familiar one that is wrong.',
      'Taking the most common meaning of a word without checking the context.',
    ],
    shortcuts: [
      'Cover the choices and predict.',
      'Eliminate what you know is wrong; the leftover unfamiliar word is often right.',
      'Check connotation: positive details need a positive word.',
    ],
  },
  {
    skill: 'tsp',
    intro: 'Text Structure and Purpose questions ask what a text or a sentence is doing: its main purpose, its overall structure, or the function of an underlined part.',
    detail: [
      'Purpose is about action: explain, argue, compare, describe, illustrate, question, qualify. Label each sentence with a verb, then choose the purpose that fits all the labels.',
      'The function of a sentence is its job relative to its neighbors: it may introduce a puzzle, mark a shift, give an example of the previous claim, state a complication, or supply the detail a scholar then interprets.',
      'Common structures: long-held view → new evidence; observation → puzzle → proposed explanation; claim → concession → qualification; question → method → result → conclusion. In literary texts, tone words ("cheerfully," "obstinate") reveal the attitude.',
    ],
    rules: [
      'Describe what the sentence does, not what it mentions.',
      'Check every part of a structure description, including the order.',
      'A sentence starting with "But" signals a shift or a complication; decide which by reading what follows.',
      'Complicate is not the same as contradict.',
    ],
    examples: [
      { q: 'A text states that octopuses match colors, then that their eyes should make them colorblind, then a scientist\'s "resolution." What is the function of the second sentence?', a: 'It introduces a puzzle that the proposal in the next sentence addresses.' },
      { q: 'A memoir describes a father who collected maps but never used them and was "lost, cheerfully." What is the purpose?', a: 'To portray, with affection, a contradiction in his character. The tone words rule out "criticize."' },
    ],
    mistakes: [
      'Mistaking background sentences for the main purpose.',
      'Choosing a structure with the right elements in the wrong order.',
      'Accepting an overstated verb such as "conclusively disproves" when the text says "open question."',
      'Calling a described flaw a criticism when the tone is warm.',
    ],
    shortcuts: [
      'Find the pivot word and label what comes before and after.',
      'Signal words: "curiously" (puzzle), "for instance" (example), "yet" (shift), "then" (next stage).',
    ],
  },
  {
    skill: 'ctc',
    intro: 'Cross-Text Connections questions give two short texts on the same topic and ask how they relate, usually how the author of one would respond to the other.',
    detail: [
      'Summarize each text in a phrase, then name the relationship: agree, disagree, qualify ("yes, but"), explain, or extend. Do this before reading the choices.',
      'Find each author\'s core principle and apply it to the other text\'s specific claim. Authors respond from their stated positions; do not make them more extreme than the text does.',
      'Researchers who disagree about an explanation often agree about the observation being explained. For "both would agree" questions, test each choice against each text separately.',
    ],
    rules: [
      'Answer from the second author\'s point of view.',
      'Match the author\'s degree of caution ("may be" → "possibly").',
      'The correct choice names the exact point of difference.',
      'In "judgment, because reason" choices, both halves must match the text.',
    ],
    examples: [
      { q: 'Text 1: officials say planting trees cools cities. Text 2: an ecologist agrees but finds many planted trees die without maintenance. How would she respond?', a: 'She would agree that trees can cool neighborhoods while stressing that planting alone does not guarantee the benefit.' },
      { q: 'Text 1 cites patent records to show inventions come from lone inventors. Text 2 says patents record who got legal credit. How would Text 2\'s author describe that evidence?', a: 'As misleading, because it shows who received credit rather than who contributed.' },
    ],
    mistakes: [
      'Treating a qualification as a full disagreement.',
      'Choosing "supports" because both texts share a topic.',
      'Picking a statement only one author would accept on a "both agree" question.',
      'Reading the second text through the first text\'s assumptions.',
    ],
    shortcuts: [
      'Look for the sentence in Text 2 that explains why Text 1\'s view arose.',
      'Write two words for each author\'s priority; the response follows from them.',
    ],
  },
  {
    skill: 'tra',
    intro: 'Transition questions ask for the word or phrase that correctly connects two ideas. The skill is naming the relationship between the ideas, not memorizing lists.',
    detail: [
      'Read the sentence before the blank and the sentence containing it. Summarize each in a few words and decide the relationship. Then find the transition that expresses it.',
      'The main relationships: addition (moreover, furthermore), contrast (however, by contrast), concession (nevertheless, that said), cause and effect (therefore, consequently, in turn), sequence (next, then, finally), example (for example), restatement (that is, in other words), specification (specifically), emphasis (in fact, indeed), replacement (instead, rather), alternative (alternatively), similarity (similarly, likewise), purpose (to that end).',
      'Fine distinctions decide hard questions. "For example" picks one case of several; "specifically" names the exact thing just mentioned. "Rather" follows a negation and gives the correct idea. "In fact" confirms the previous statement and goes further. "In turn" marks the next link in a chain of effects.',
    ],
    rules: [
      'The transition links its sentence to the one immediately before it.',
      'Ignore connectors already inside the sentence (such as "because") when choosing.',
      'A new subject does not automatically mean contrast.',
      'An exception to a general statement takes a contrast word, not "for example."',
    ],
    examples: [
      { q: 'Electric buses cost more to buy. ______ they can cost less over their lifetimes.', a: 'Nevertheless. The second point holds in spite of the first: a concession.' },
      { q: 'The report identified a single cause. ______ the contractor ordered the beams late.', a: 'Specifically. The sentence names the one cause; it is not one example among many.' },
    ],
    mistakes: [
      'Choosing "for example" whenever a detail follows a general statement.',
      'Linking the blank to an earlier sentence instead of the one right before it.',
      'Choosing "thus" for a correction that needs "rather."',
      'Reading parallel "may have ... may have" statements as addition instead of alternatives.',
    ],
    shortcuts: [
      'Insert a test phrase: "because of that," "despite that," "in the same way," "one case of this is."',
      'Label each sentence + or − for direction; same signs add, opposite signs contrast.',
    ],
  },
  {
    skill: 'syn',
    intro: 'Rhetorical Synthesis questions show a student\'s notes and a goal. You choose the sentence that uses the notes to accomplish that goal. Every choice is accurate; only one does the job.',
    detail: [
      'The goal is the question. Underline it and identify what it requires: a difference or a similarity, a result or an explanation, an introduction for an unfamiliar audience, the significance of a finding.',
      'Goals often have two parts ("contrast the costs while noting what the plants share"; "explain an advantage to an audience familiar with the term"). The answer must do both.',
      'Distinguish the parts of research: question, method, result, explanation, significance. Distinguish a claim ("some researchers argue") from evidence ("analyses show"). To explain how something works, a sentence must give the steps, not just the name of the process.',
    ],
    rules: [
      'Eliminate any choice that does not address the goal, however well written.',
      'Similarity needs "both" or "like"; difference needs "whereas," "while," or "unlike."',
      'Familiar audience: use the term without defining it. Unfamiliar audience: introduce or define it.',
      'Significance answers "So what?"',
    ],
    examples: [
      { q: 'Goal: emphasize how recently a species became known to science.', a: 'Choose the sentence built on the note with the date of first description ("was not described until 1992").' },
      { q: 'Goal: present evidence that supports one side of a debate.', a: 'Choose the sentence that states a finding and names the side it supports, not one that merely states a position.' },
    ],
    mistakes: [
      'Choosing the most detailed or most interesting sentence.',
      'Completing only half of a two-part goal.',
      'Giving a difference in the wrong feature (age when the goal says design).',
      'Naming a process when the goal asks you to explain it.',
    ],
    shortcuts: [
      'Do not read the notes closely first. Read the goal, then scan the choices for the one that meets it.',
      'Turn the goal into a checklist and tick each requirement.',
    ],
  },
  {
    skill: 'bnd',
    intro: 'Boundaries questions test punctuation between and within sentences: where one clause ends, how clauses are joined, and how extra information is set off.',
    detail: [
      'An independent clause can stand alone as a sentence. Two independent clauses must be joined by a period, a semicolon, a colon (when the second explains the first), or a comma plus a coordinating conjunction (for, and, nor, but, or, yet, so). A comma alone is a comma splice; nothing at all is a run-on.',
      'A clause that begins with a subordinating word (although, because, when, if, since, while) is dependent. When it comes first, follow it with a comma. It can never be separated from its main clause by a period or semicolon.',
      'Nonessential information (it can be removed without breaking the sentence) is enclosed by a matching pair: two commas, two dashes, or parentheses. Essential information takes no punctuation. A label before a name ("biologist Rachel Carson") is essential.',
      'A colon needs a complete sentence before it and introduces a list or explanation; never use one after "including" or "such as." Conjunctive adverbs (however, therefore) between two sentences need a semicolon or period before them and a comma after. Lists whose items contain commas use semicolons between items.',
    ],
    rules: [
      'Sentence + sentence: period, semicolon, colon, or comma + FANBOYS.',
      'Semicolon: a complete sentence on both sides.',
      'Colon: a complete sentence before it.',
      'Nonessential elements: matching punctuation on both sides.',
      'No punctuation between subject and verb or verb and object.',
    ],
    examples: [
      { q: 'The glacier has retreated since 1950 ___ leaving behind a valley of boulders.', a: 'A comma. "Leaving behind ..." is a participial phrase, not a sentence, so a period or semicolon is impossible.' },
      { q: 'Honeybees have tiny brains ___ they can recognize faces.', a: '"; however," The two independent clauses need a semicolon, and "however" introduces the contrasting second clause.' },
    ],
    mistakes: [
      'Joining two sentences with only a comma.',
      'Opening a nonessential phrase with a comma or dash and not closing it with the same mark.',
      'Putting a colon after an incomplete clause.',
      'Adding a comma wherever you would pause when speaking.',
      'Using a semicolon before a list or a dependent clause.',
    ],
    shortcuts: [
      'Test both sides of the blank: could each stand alone as a sentence?',
      'Delete the interrupting phrase and reread to see what the main sentence needs.',
      'Check the far end of a clause: commas around it come in pairs.',
    ],
  },
  {
    skill: 'fss',
    intro: 'Form, Structure, and Sense questions test whether words take the right form: verbs agree with subjects and use the right tense, pronouns match their nouns, modifiers sit next to what they describe, and apostrophes show possession.',
    detail: [
      'Subject–verb agreement: find the true subject by crossing out prepositional phrases and interrupting clauses. A gerund phrase ("Restoring the wetlands") and "each" are singular; subjects joined by "and" are plural; "as well as" does not make a subject plural. In inverted sentences the subject follows the verb.',
      'Verb tense and form: match the time frame of the surrounding verbs. Use past perfect ("had passed") for the earlier of two past actions, present perfect ("have risen") with "since," and "would have" in the result of an unreal past condition. Every sentence needs a finite verb; -ing and "to" forms cannot be the main verb.',
      'Pronouns agree in number with their antecedents. "Its" and "their" are possessive; "it\'s" and "they\'re" are contractions. Collective nouns acting as a unit are singular.',
      'Modifiers: an introductory phrase describes the noun that immediately follows the comma. Possessives: singular adds \'s; plural ending in s adds only an apostrophe; plain plurals take no apostrophe. Items in a list share one grammatical form. Compare like with like ("that of").',
    ],
    rules: [
      'The subject is never inside a prepositional phrase.',
      'After an opening modifier, the next noun must be what it describes (a possessive does not count).',
      'Earlier past action: had + participle.',
      'One owner: \'s. Several owners: s\'. No ownership: no apostrophe.',
      '"The number of" is singular; "a number of" is plural.',
    ],
    examples: [
      { q: 'The collection of rare maps ___ housed upstairs.', a: '"is." The subject is "collection," not "maps."' },
      { q: 'Trained as a chemist, ___', a: 'The person must come next: "Kaoru Ishida often features ..." "Kaoru Ishida\'s novels" would say the novels were trained as a chemist.' },
    ],
    mistakes: [
      'Agreeing the verb with the nearest noun.',
      'Using an -ing form where a main verb is required.',
      'Confusing its/it\'s and their/there/they\'re.',
      'Preferring an active sentence that leaves a modifier dangling.',
      'Putting an apostrophe on every noun that ends in s.',
    ],
    shortcuts: [
      'Shrink the sentence to subject + verb.',
      'Expand contractions to test them ("it is base"?).',
      'Ask "who or what?" of every opening modifier.',
    ],
  },
];
