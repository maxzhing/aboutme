/**
 * Transitions (tra), brought to the Stellify question standard as patches on the original questions (same ids,
 * stems, choices and keys). Each passage now describes a real, documented subject: a study checked against its
 * Crossref or PubMed record, or a public-domain text saved in content/sources. Passages that already reported real
 * work keep their wording, with any overstatement corrected; those built on invented towns, councils, products or
 * people were rebuilt around real cases that call for the same transition.
 */
import type { RawQuestion } from '@/lib/types';

const CHECKED = '2026-11-27';
const BIAS = 'AI bias and clarity pass (Stellify): the passage supplies all needed context, no outside knowledge or cultural, regional or income assumptions are required, and the wording is plain with no double negatives.';
type Patch = Partial<RawQuestion> & { id: string };
const meta = (cite: string, url: string, teacher: string) => ({
  source: { cite, url, checked: CHECKED },
  review: { teacher: `AI teacher pass (Stellify): ${teacher}`, bias: BIAS, date: CHECKED },
});
/** A patch that keeps the original passage and explanations and only records the checked source. */
const src = (id: string, cite: string, url: string, teacher: string, extra: Partial<Patch> = {}): Patch => ({ id, ...extra, meta: meta(cite, url, teacher) });

export const TRA_STD: Patch[] = [
  {
    id: 'r-tra-01',
    passage: 'In almost every animal that carries its developing young inside its body, it is the female that does the carrying. The male seahorse, ______ carries its developing young in a pouch on its belly until they emerge as tiny, fully formed seahorses.',
    steps: [
      'Sentence 1: in almost every animal that carries its young, the female does it. Sentence 2: in seahorses, the male does.',
      'The second sentence describes an exception to the usual pattern, so the relationship is contrast.',
      '"By contrast" signals that difference.',
    ],
    why: [
      '"For example" would make the male seahorse an instance of females carrying the young, but it is a male doing so.',
      '"As a result" would mean the seahorse carries its young because females usually do. No cause-and-effect link is stated.',
      'Correct. The sentence sets an unusual arrangement against the typical one.',
      '"Similarly" would claim the seahorse follows the usual pattern, when it reverses it.',
    ],
    meta: meta('Stölting, K. N., and A. B. Wilson. “Male pregnancy in seahorses and pipefish: beyond the mammalian model.” BioEssays 29 (2007).', 'https://doi.org/10.1002/bies.20626', 'the male’s brooding of the embryos in a specialized structure follows the review; one relationship (contrast with the usual pattern) is defensible.'),
  },
  {
    id: 'r-tra-02',
    passage: 'The 1991 eruption of Mount Pinatubo in the Philippines blasted millions of tons of sulfur gas high into the atmosphere, where it formed a thin haze that reflected sunlight back into space. ______ average temperatures across the globe fell by about half a degree Celsius over the following year.',
    steps: [
      'Sentence 1: the eruption put a haze into the atmosphere that reflected sunlight. Sentence 2: global temperatures fell.',
      'With less sunlight reaching the surface, the planet cooled, so the second event is a result of the first.',
      '"Consequently" expresses a result.',
    ],
    why: [
      'Correct. The cooling follows from the haze reflecting sunlight away.',
      '"Nevertheless" signals something unexpected given the first sentence. Cooling is exactly what a sunlight-reflecting haze would cause.',
      '"For instance" introduces an example. The cooling is not an example of an eruption; it is an effect of one.',
      '"Likewise" signals similarity. An eruption and a drop in temperature are not parallel events.',
    ],
    trap: 'Picking a contrast word because the two sentences mention different things (a volcano, the temperature).',
    meta: meta('Soden, B. J., R. T. Wetherald, G. L. Stenchikov, and A. Robock. “Global cooling after the eruption of Mount Pinatubo: a test of climate feedback by water vapor.” Science 296, no. 5568 (2002): 727–730.', 'https://doi.org/10.1126/science.296.5568.727', 'the observed global cooling after the 1991 eruption is the subject of the paper; the cause-and-effect link is the only reading the text supports.'),
  },
  {
    id: 'r-tra-03',
    passage: 'Some major scientific discoveries were made by accident. ______ in 1965 the radio astronomers Arno Penzias and Robert Wilson were trying to eliminate a faint, steady noise from an antenna built for other observations when they found that the noise came equally from every direction in the sky; physicists soon identified it as radiation left over from the early universe.',
    steps: [
      'Sentence 1 makes a general claim: some discoveries were made by accident.',
      'Sentence 2 gives one specific case of such an accidental discovery.',
      '"For example" introduces a specific instance of a general claim.',
    ],
    why: [
      '"However" would signal that the antenna discovery contradicts the claim, but it supports it.',
      '"Therefore" would make the discovery a consequence of the general claim, which reverses the logic.',
      '"In other words" introduces a restatement. The second sentence adds a specific case rather than rephrasing the first.',
      'Correct. The antenna noise is one instance of an accidental discovery.',
    ],
    meta: meta('Penzias, A. A., and R. W. Wilson. “A Measurement of Excess Antenna Temperature at 4080 Mc/s.” Astrophysical Journal 142 (1965): 419–421.', 'https://doi.org/10.1086/148307', 'the unexplained, direction-independent excess noise is what the 1965 paper reports; the second sentence is a single instance of the general claim.'),
  },
  {
    id: 'r-tra-04',
    passage: 'In a famous 1958 experiment, Matthew Meselson and Franklin Stahl first grew bacteria for many generations on food containing a heavy form of nitrogen, which became part of the bacteria’s DNA. ______ they moved the bacteria to food containing ordinary nitrogen and measured how heavy the DNA of each new generation was.',
    steps: [
      'Sentence 1 describes the first step of the experiment ("first grew bacteria").',
      'Sentence 2 describes the following step (moving the bacteria to ordinary nitrogen).',
      '"Next" marks the following step in a sequence.',
    ],
    why: [
      '"Instead" would mean the second step replaces the first. Both steps are carried out, one after the other.',
      'Correct. Moving the bacteria follows growing them on the heavy nitrogen.',
      '"In conclusion" introduces a summary, not another step in the experiment.',
      '"For example" introduces an illustration. Moving the bacteria is a step in the experiment, not an example of growing them.',
    ],
    meta: meta('Meselson, M., and F. W. Stahl. “The replication of DNA in Escherichia coli.” Proceedings of the National Academy of Sciences 44, no. 7 (1958): 671–682.', 'https://doi.org/10.1073/pnas.44.7.671', 'the two steps (growth in heavy nitrogen, transfer to ordinary nitrogen and density measurement) follow the paper’s method.'),
  },
  {
    id: 'r-tra-05',
    passage: 'Lecturing has long been the conventional method of instruction in introductory science courses at universities, partly because a single instructor can efficiently present substantial amounts of material to hundreds of students simultaneously. ______ a 2014 meta-analysis of 225 studies led by biologist Scott Freeman found that students in traditional lecture courses were approximately 1.5 times more likely to fail than students in courses incorporating active learning, such as collaborative problem solving.',
    steps: [
      'Sentence 1: lecturing is standard and efficient (a point in its favor).',
      'Sentence 2: students in lecture courses failed more often (a point against it that holds despite the first).',
      'The second idea runs against the first, so a concession transition such as "nevertheless" fits.',
    ],
    why: [
      'Correct. "Nevertheless" accepts the efficiency of lecturing and then presents evidence that weighs against it.',
      '"Furthermore" adds a point in the same direction. Higher failure rates in lectures run against the case for lecturing.',
      '"Specifically" introduces detail about the previous statement. The second sentence is a contrasting finding, not a detail of how lectures work.',
      '"Accordingly" means "as a result." Higher failure rates are not a result of lectures being efficient.',
    ],
    trap: 'Treating a study result as extra support simply because it also concerns lectures. Ask whether it helps or hurts the case made in the first sentence.',
    remember: 'An advantage followed by a weightier disadvantage calls for a concession word.',
    meta: meta('Freeman, S., S. L. Eddy, M. McDonough, M. K. Smith, N. Okoroafor, H. Jordt, and M. P. Wenderoth. “Active learning increases student performance in science, engineering, and mathematics.” Proceedings of the National Academy of Sciences 111, no. 23 (2014): 8410–8415.', 'https://pubmed.ncbi.nlm.nih.gov/24821756/', 'the 225 studies and the 1.5-times failure rate under lecturing are from the abstract; the concession is the only fitting relationship.'),
  },
  {
    id: 'r-tra-06',
    passage: 'The 1987 Montreal Protocol has sharply reduced the worldwide production and release of chlorofluorocarbons and other chemicals that destroy the stratospheric ozone layer, which shields living things from harmful ultraviolet radiation. ______ because many of those chemicals are also powerful greenhouse gases, the treaty has slowed climate change: a 2007 analysis by Guus Velders and colleagues concluded that its climate benefits already far exceeded the emission reductions targeted by the Kyoto Protocol.',
    steps: [
      'Sentence 1: one benefit of the treaty (less ozone destruction).',
      'Sentence 2: a second benefit (slower climate change).',
      'Two points in the same direction call for an addition transition: "moreover."',
    ],
    why: [
      '"In contrast" signals opposition, but both sentences describe benefits of the treaty.',
      '"For instance" would make the climate benefit an example of reduced ozone damage. It is a separate benefit.',
      '"Otherwise" means "if not," which does not connect two benefits of the same treaty.',
      'Correct. "Moreover" adds a second advantage to the first.',
    ],
    meta: meta('Velders, G. J. M., S. O. Andersen, J. S. Daniel, D. W. Fahey, and M. McFarland. “The importance of the Montreal Protocol in protecting climate.” Proceedings of the National Academy of Sciences 104, no. 12 (2007): 4814–4819.', 'https://doi.org/10.1073/pnas.0610328104', 'both benefits and the comparison with the Kyoto target follow the abstract.'),
  },
  {
    id: 'r-tra-07',
    passage: 'Wood frogs, which inhabit regions as far north as Alaska and northern Canada, survive the prolonged winters there in an extraordinary physiological condition that the biologist Kenneth Storey documented extensively in the 1980s. The species is freeze tolerant; ______ it can survive the freezing of a substantial proportion of its body water, remaining frozen, with its heartbeat suspended, for days or weeks before it thaws and resumes ordinary activity.',
    steps: [
      'The first clause uses a technical term, "freeze tolerant."',
      'The second clause explains what the term means: the frog survives the freezing of much of its body water.',
      'A transition that introduces a definition or restatement is needed: "that is."',
    ],
    why: [
      '"However" signals contrast. Surviving the freezing of its body water is what "freeze tolerant" means, not something opposed to it.',
      'Correct. "That is" introduces a clarification of the term just used.',
      '"In addition" would present surviving the freeze as a separate fact, but it is the meaning of the term.',
      '"As a result" would make surviving the freeze an effect of being freeze tolerant, when the two are the same thing stated twice.',
    ],
    meta: meta('Storey, K. B. “Freeze tolerance in the frog, Rana sylvatica.” Experientia 40 (1984).', 'https://doi.org/10.1007/bf01946664', 'the freeze tolerance of the wood frog is the subject of Storey’s work; the second clause defines the term.'),
  },
  {
    id: 'r-tra-08',
    passage: 'Bats navigate in darkness by emitting high-pitched calls and interpreting the echoes that return from surrounding objects, a technique known as echolocation that allows many species to detect and capture small flying insects. ______ dolphins produce rapid clicks and interpret the returning sound to locate prey in murky water, an ability that, according to a 2013 genetic analysis by Joe Parker and colleagues, evolved independently in the two groups.',
    meta: meta('Parker, J., G. Tsagkogeorga, J. A. Cotton, Y. Liu, P. Provero, E. Stupka, and S. J. Rossiter. “Genome-wide signatures of convergent evolution in echolocating mammals.” Nature 502 (2013): 228–231.', 'https://doi.org/10.1038/nature12511', 'echolocation in bats and dolphins and its independent (convergent) evolution follow the paper; the earlier insect-size claim was removed as unsourced.'),
  },
  {
    id: 'r-tra-09',
    passage: 'Working from the standard assumption that people act mainly in their own financial interest, many professional economists surveyed by Alain Cohn and colleagues predicted that people who found a lost wallet would be less likely to return it if it contained money. ______ in field experiments involving more than 17,000 wallets turned in across 40 countries, recipients were more likely to contact the owners of wallets that contained money than of wallets that contained none.',
    steps: [
      'Sentence 1: what was predicted (wallets with money returned less often).',
      'Sentence 2: what happened (wallets with money returned more often), the opposite of the prediction.',
      '"Instead" replaces the expected outcome with the actual one.',
    ],
    why: [
      '"Therefore" would mean wallets with money were returned more often because economists predicted the opposite.',
      '"In addition" adds a point in the same direction. The result contradicts the prediction.',
      '"For example" introduces an illustration, but the second sentence reports a contrary result.',
      'Correct. "Instead" marks that a different outcome occurred in place of the expected one.',
    ],
    trap: 'Reading the second sentence as a logical outcome of the first because both concern the same wallets.',
    meta: meta('Cohn, A., M. A. Maréchal, D. Tannenbaum, and C. L. Zünd. “Civic honesty around the globe.” Science 365 (2019): 70–73.', 'https://pubmed.ncbi.nlm.nih.gov/31221770/', 'the 40 countries, the more than 17,000 wallets, the higher return rate with money and the economists’ wrong prediction are from the abstract.'),
  },
  {
    id: 'r-tra-10',
    passage: 'Before reporting the results of his 1963 obedience experiment, in which volunteers were told to give increasingly severe electric shocks to another person, psychologist Stanley Milgram asked fourteen Yale psychology students to predict how many participants would continue to the most dangerous level, and on average they predicted that only about one percent would. They were wrong. ______ 26 of the 40 men in the experiment, nearly two-thirds, obeyed until the very end, continuing to the highest level on the shock generator despite the victim’s apparent protests and eventual silence.',
    steps: [
      'The transition must connect "They were wrong" to the result that 26 of 40 men obeyed to the end.',
      'The last sentence confirms and strengthens "They were wrong": the students were not just mistaken, they were off by a huge margin.',
      '"In fact" introduces a statement that reinforces the previous one with a stronger detail.',
    ],
    why: [
      '"Nevertheless" would signal a contrast with "They were wrong." The obedience figure agrees with that sentence; it does not oppose it.',
      'Correct. "In fact" emphasizes just how wrong the students were.',
      '"For example" introduces one case among several. The obedience figure is the single result that shows the students were wrong, not one example of it.',
      '"Meanwhile" signals something happening at the same time elsewhere, which is not the relationship here.',
    ],
    meta: meta('Milgram, S. “Behavioral study of obedience.” Journal of Abnormal and Social Psychology 67, no. 4 (1963): 371–378.', 'https://doi.org/10.1037/h0040525', 'the fourteen Yale students’ prediction (about 1 percent) and the 26 of 40 fully obedient participants are as reported; the shocks were simulated, which “apparent” signals.'),
  },
  {
    id: 'r-tra-11',
    passage: 'After systematically mapping the deaths in an 1854 cholera outbreak that killed hundreds of people in London’s Soho district, the physician John Snow concluded that the epidemic originated from a single contaminated source rather than from the foul atmosphere that many of his contemporaries blamed. ______ most of the victims had obtained their drinking water from one public pump on Broad Street, and Snow persuaded skeptical local authorities to remove the pump’s handle.',
    steps: [
      'Sentence 1 says the epidemic came from "a single source" without saying what it was.',
      'Sentence 2 names that source precisely: one pump on Broad Street.',
      '"Specifically" introduces the exact detail that a general statement pointed to.',
    ],
    why: [
      'Correct. The second sentence specifies the single source mentioned in the first.',
      '"For example" implies one instance among several. Snow traced the outbreak to "a single source," so the pump is that source, not an example of it.',
      '"Similarly" compares two like things. The second sentence identifies the source; it does not compare it with anything.',
      '"However" signals contrast, but the second sentence supplies what the first sentence promised.',
    ],
    meta: meta('Snow, J. On the Mode of Communication of Cholera. 2nd ed. London: John Churchill, 1855; reviewed and reprinted in International Journal of Epidemiology 42 (2013).', 'https://doi.org/10.1093/ije/dyt193', 'the Broad Street pump, the rival “bad air” explanation and the removal of the handle follow Snow’s account.'),
  },
  {
    id: 'r-tra-12',
    passage: 'Trials of the four-day workweek have been encouraging: analyzing surveys from nearly 2,900 employees at 141 organizations that cut working hours without cutting pay, sociologists Wen Fan, Juliet Schor, and colleagues reported in 2025 that workers experienced less burnout and greater job satisfaction. ______ the organizations had volunteered to take part, so it remains uncertain whether the same benefits would appear in companies that adopted the schedule reluctantly or in workplaces with very different demands.',
    steps: [
      'Sentence 1 presents positive results.',
      'Sentence 2 points out a limitation of those results (the organizations volunteered, so others might differ).',
      'A transition is needed that accepts the first point while introducing a reservation: "that said."',
    ],
    remember: 'Good news followed by "but it may not apply to ..." needs a qualifier.',
    meta: meta('Fan, W., J. B. Schor, O. Kelly, and G. Gu. “Work time reduction via a 4-day workweek finds improvements in workers’ well-being.” Nature Human Behaviour (2025).', 'https://doi.org/10.1038/s41562-025-02259-6', 'the 141 organizations, the nearly 2,900 employees and the well-being outcomes are as published; the self-selection caution is a limitation the study acknowledges.'),
  },
  {
    id: 'r-tra-13',
    passage: 'After wolves were reintroduced to Yellowstone National Park in the mid-1990s, elk browsed less intensively along some streams, and willows in those riparian areas grew considerably taller, according to a 2012 review by ecologists William Ripple and Robert Beschta examining the first fifteen years following the predators’ return. ______ the taller willows provided nourishment and construction material for beavers, whose colonies multiplied, creating ponds that substantially altered the surrounding wetland habitat.',
    steps: [
      'The text describes a chain: wolves return → elk browse less → willows grow taller → beavers increase.',
      'The last sentence is the next link: the effect (taller willows) becomes the cause of a further effect (more beavers).',
      '"In turn" marks the next step in a chain of effects.',
    ],
    meta: meta('Ripple, W. J., and R. L. Beschta. “Trophic cascades in Yellowstone: the first 15 years after wolf reintroduction.” Biological Conservation 145, no. 1 (2012): 205–213.', 'https://doi.org/10.1016/j.biocon.2011.11.005', 'the chain from wolves to elk browsing, willow height and beaver colonies is the review’s; the passage attributes it to the authors rather than stating it as settled.'),
  },
  {
    id: 'r-tra-14',
    passage: 'Researchers remain divided about how the remains of at least fifteen individuals of the extinct human relative Homo naledi came to rest in the Dinaledi Chamber, a nearly inaccessible, permanently dark space deep within South Africa’s Rising Star cave system. The bodies may have been carried there deliberately by other members of the species, an interpretation that geologist Paul Dirks and colleagues judged consistent with their preliminary evidence. ______ the individuals may have entered the chamber on their own and become trapped there.',
    steps: [
      'Sentence 2 offers one possible explanation (other members of the species placed the bodies there).',
      'Sentence 3 offers a different, competing explanation (the individuals entered on their own and were trapped).',
      '"Alternatively" introduces another possibility.',
    ],
    meta: meta('Dirks, P. H. G. M., L. R. Berger, E. M. Roberts, et al. “Geological and taphonomic context for the new hominin species Homo naledi from the Dinaledi Chamber, South Africa.” eLife 4 (2015): e09561.', 'https://doi.org/10.7554/eLife.09561', 'the at least 15 individuals, the always-dark chamber and the authors’ preliminary support for deliberate disposal are from the abstract; the trapping scenario is one of the alternatives the paper weighs.'),
  },
  {
    id: 'r-tra-15',
    passage: 'Rereading a textbook chapter is not the most effective strategy for remembering its contents over the long term, according to experiments that psychologists Henry Roediger and Jeffrey Karpicke reported in 2006. ______ the more durable technique is retrieval practice: students who completed a practice test on a prose passage remembered considerably more of it a week afterward than students who spent an equivalent amount of time studying it again.',
    steps: [
      'Sentence 1 denies an idea: rereading is not the most effective way to remember.',
      'Sentence 2 supplies the better method in its place: retrieval practice.',
      'After a negative statement, "rather" introduces what is true instead.',
    ],
    why: [
      '"Moreover" adds another point in the same direction. The second sentence replaces the rejected idea; it does not add a further negative.',
      '"Thus" would present the second sentence as a conclusion drawn from the first. But "rereading is not the best method" does not by itself lead to "testing is better"; the second sentence is the replacement claim, supported by its own evidence.',
      'Correct. "Not X. Rather, Y" is the standard pattern for replacing a mistaken idea with the right one.',
      '"Likewise" signals similarity, which does not fit a correction.',
    ],
    meta: meta('Roediger, H. L., and J. D. Karpicke. “Test-enhanced learning: taking memory tests improves long-term retention.” Psychological Science 17, no. 3 (2006): 249–255.', 'https://pubmed.ncbi.nlm.nih.gov/16507066/', 'testing beat restudying on the one-week test, as the abstract reports; “not X; rather, Y” is the only fitting pattern.'),
  },
  {
    id: 'r-tra-16',
    passage: 'In the 1790s, the English physician Edward Jenner wanted to investigate a belief, widespread among dairy workers in the countryside, that people who had contracted cowpox, a comparatively mild disease, were thereby protected against smallpox, one of the deadliest infections of the era. ______ in 1796 he deliberately infected a boy named James Phipps with material extracted from a cowpox lesion on a milkmaid’s hand and, weeks afterward, exposed the boy to smallpox, which he did not develop.',
    steps: [
      'Sentence 1 states a goal: to test whether cowpox protects against smallpox.',
      'Sentence 2 describes the action Jenner took in order to reach that goal.',
      '"To that end" means "for that purpose" and links a goal to the steps taken toward it.',
    ],
    why: [
      'Correct. Infecting the boy and then exposing him to smallpox was the test Jenner designed to check the belief.',
      '"Even so" signals that the second sentence is surprising given the first. Carrying out a test is exactly what someone who wants to test a belief would do.',
      '"In comparison" would set two things side by side. A goal and the action serving it are not being compared.',
      '"For example" introduces an instance of the previous statement. The experiment is not an example of wanting to test a belief; it is the means of doing so.',
    ],
    trap: 'Choosing "for example" because a specific action is described.',
    meta: meta('Riedel, S. “Edward Jenner and the history of smallpox and vaccination.” Proceedings (Baylor University Medical Center) 18, no. 1 (2005): 21–25.', 'https://doi.org/10.1080/08998280.2005.11928028', 'the dairy workers’ belief, the 1796 inoculation of James Phipps from a milkmaid’s cowpox lesion and his later exposure to smallpox follow the history.'),
  },
  {
    id: 'r-br-tra-01',
    passage: 'Readers of Willa Cather’s 1913 novel *O Pioneers!* frequently remember it as an affectionate celebration of the Nebraska prairie, which its determined heroine, Alexandra Bergson, eventually transforms into prosperous farmland. ______ the novel’s opening chapters portray the same landscape as harsh and nearly unworkable: after eleven years on it, Alexandra’s father has lost cattle to a blizzard, hogs to cholera, and crop after crop, and the narrator calls the land “a wild thing that had its ugly moods.”',
    steps: [
      'Sentence 1: readers remember the novel as celebrating the prairie. Sentence 2: the opening chapters show the land as harsh.',
      'The second idea goes against the familiar image in the first, so the relationship is contrast.',
    ],
    meta: meta('Cather, W. O Pioneers! Boston: Houghton Mifflin, 1913. Part I, “The Wild Land,” chapter II.', 'https://en.wikisource.org/wiki/O_Pioneers!/The_Wild_Land,_II', 'the losses (cattle in a blizzard, hogs to cholera, failed crops) and the quoted description are in chapter II as saved; the unsourced claim about anthologies was removed.'),
  },
  src('r-br-tra-02', 'Johnson, T. H., and T. Ward, eds. The Letters of Emily Dickinson. 3 vols. Cambridge, MA: Harvard University Press, 1958 (letter to T. W. Higginson, 1866); reviewed by C. R. Anderson, American Literature 30 (1958).', 'https://doi.org/10.2307/2922197', 'the 1866 newspaper printing of “A narrow Fellow in the Grass” with altered punctuation and her complaint to Higginson that it “was robbed of me” are in the collected letters.'),
  {
    id: 'r-br-tra-03',
    passage: 'Most Gothic cathedrals took generations to build, and their designs often changed substantially as one master builder succeeded another, producing structures that combine incompatible architectural styles; Salisbury Cathedral in England is a notable exception. ______ apart from its spire and a few details, it was begun and completed within a single period, between 1220 and 1266, so the building follows one unusually consistent design.',
    meta: meta('“Salisbury.” Encyclopædia Britannica, 11th ed., vol. 24. Cambridge: Cambridge University Press, 1911.', 'https://en.wikisource.org/wiki/1911_Encyclop%C3%A6dia_Britannica/Salisbury', 'the dates now follow the source (begun and completed, save the spire and a few details, within 1220–1266), replacing an unsourced 38-year figure.'),
  },
  {
    id: 'r-br-tra-04',
    passage: 'For years, physicians advised the parents of infants at high risk of peanut allergy to avoid peanut products entirely, but a 2015 randomized trial led by George Du Toit found that high-risk infants who regularly consumed peanut-containing foods from early in life were substantially less likely to develop the allergy by age five. The finding undermined the reasoning behind the earlier recommendation, which had assumed that early exposure made an allergy more likely. ______ an expert panel sponsored by the National Institute of Allergy and Infectious Diseases issued guidelines in 2017 recommending that peanut products be introduced to many infants as early as four to six months of age.',
    steps: [
      'Sentences 1 and 2 establish that a trial overturned the reasoning behind the old advice.',
      'Sentence 3 describes experts responding to that evidence by changing the advice: a consequence of the facts just given.',
    ],
    why: [
      'Correct. Because the trial undercut the old advice, the panel issued new guidelines: "accordingly" signals that consequence.',
      '"Even so" would mean the panel changed the advice despite the trial, but the trial is the reason for the change.',
      '"By contrast" would set the panel against the evidence just given, but its guidelines follow from that evidence.',
      '"In other words" would make the last sentence a restatement of the second, but it adds how experts responded.',
    ],
    trap: '"Even so" can feel right because the passage mixes old and new advice. Check what the last sentence is a response to: the trial’s finding.',
    meta: meta('Du Toit, G., et al. “Randomized trial of peanut consumption in infants at risk for peanut allergy.” New England Journal of Medicine 372 (2015): 803–813; Togias, A., et al. “Addendum guidelines for the prevention of peanut allergy in the United States.” Journal of Allergy and Clinical Immunology 139, no. 1 (2017): 29–44.', 'https://doi.org/10.1016/j.jaci.2016.10.010', 'the trial and the 2017 NIAID-sponsored addendum recommending early introduction (about four to six months, by risk level) are both checked; the invented dam figures were replaced.'),
  },
  {
    id: 'r-x-tra-01',
    passage: 'Ignaz Semmelweis’s records from the Vienna General Hospital in the 1840s leave little doubt that requiring doctors to wash their hands in a chlorine solution before examining patients sharply reduced deaths from childbed fever in his clinic. Because the germ theory of disease had not yet been established, however, he could offer no convincing explanation of why the practice worked, and many of his colleagues dismissed his conclusions. ______ Semmelweis continued to insist, with mounting bitterness, that physicians’ unwashed hands were spreading the disease, publishing his findings in a book in 1861.',
    steps: [
      'Sentence 2: Semmelweis could not explain why handwashing worked, and colleagues dismissed his conclusions.',
      'Sentence 3: he kept insisting that unwashed hands spread the disease, which goes against that rejection.',
      'His persistence comes in spite of the rejection, so a concession transition is needed: "Nevertheless."',
    ],
    why: [
      '"Accordingly" would mean Semmelweis insisted because his colleagues dismissed him, but he insisted in spite of their dismissal.',
      'His continued insistence is not an example of his colleagues’ rejection or of his inability to explain the results.',
      '"Similarly" would present his insistence as parallel to his colleagues’ rejection, when it runs against it.',
      'Correct. Despite the rejection, Semmelweis held to his conclusion.',
    ],
    trap: 'Misreading his insistence as a response caused by the rejection and choosing "Accordingly."',
    meta: meta('Semmelweis, I. Die Ätiologie, der Begriff und die Prophylaxis des Kindbettfiebers. Pest, 1861; Best, M., and D. Neuhauser. “Ignaz Semmelweis and the birth of infection control.” Quality and Safety in Health Care 13 (2004): 233–234.', 'https://pubmed.ncbi.nlm.nih.gov/15175497/', 'the chlorine handwashing, the fall in deaths, the colleagues’ rejection and the 1861 book follow the history; the vaccine passage it replaces made claims no single source supported.'),
  },
  {
    id: 'r-x-tra-02',
    passage: 'Fruit flies and human beings could hardly appear more different: one is a winged insect a few millimeters long that completes its life cycle in roughly two weeks, while the other is a large, long-lived mammal that requires nearly two decades to reach adulthood. ______ the two species share a remarkable amount at the genetic level; a 2001 analysis led by Lawrence Reiter determined that approximately three-quarters of the human genes known to be associated with disease have a recognizable counterpart in the fruit fly’s genome.',
    steps: [
      'Sentence 1 describes how different fruit flies and humans are.',
      'Sentence 2 says they are alike in an important way despite those differences: many shared disease-related genes.',
      '"Despite that" means "in spite of all that," which fits.',
    ],
    choices: ['For that reason,', 'Despite that,', 'In that case,', 'At that point,'],
    trap: 'Being misled by four phrases built on "that." Their meanings differ completely.',
    remember: 'Despite that = nevertheless.',
    concept: 'Concession phrases (despite that, even so, all the same) mean "despite what was just said."',
    why: [
      '"For that reason" would make the shared genes a result of the differences just described, which is illogical.',
      'Correct. Despite their great differences, the two species share many disease-related genes.',
      '"In that case" introduces a consequence of a condition. No condition has been stated.',
      '"At that point" refers to a moment in time, but the sentence describes a general fact about the two species.',
    ],
    meta: meta('Reiter, L. T., L. Potocki, S. Chien, M. Gribskov, and E. Bier. “A systematic analysis of human disease-associated gene sequences in Drosophila melanogaster.” Genome Research 11, no. 6 (2001): 1114–1125.', 'https://doi.org/10.1101/gr.169101', '“about three-quarters” reflects the abstract’s 714 of 929 disease genes (77 percent) with fly matches; the invented author was replaced.'),
  },
  {
    id: 'r-c-tra-01',
    passage: 'Before the James Webb Space Telescope could be launched in December 2021, its 6.6-meter primary mirror, wider than the rocket that would transport it, had to be folded like an elaborate piece of origami so that it would fit inside the rocket’s protective nose cone. ______ once the spacecraft reached its destination, the mirror was unfolded, and its eighteen hexagonal segments were individually aligned with one another using a technique that analyzes images of distant starlight.',
    meta: meta('McElwain, M. W., L. D. Feinberg, M. D. Perrin, et al. “The James Webb Space Telescope Mission: Optical Telescope Element Design, Development, and Performance.” Publications of the Astronomical Society of the Pacific 135 (2023).', 'https://doi.org/10.1088/1538-3873/acada0', 'the 6.6-meter mirror and its 18 hexagonal segments aligned in orbit by image-based wavefront sensing follow the abstract; unsourced timing and precision figures were removed.'),
  },
  src('r-s-tra-01', 'Hanlon, R. “Cephalopod dynamic camouflage.” Current Biology 17, no. 11 (2007): R400–R404.', 'https://doi.org/10.1016/j.cub.2007.03.034', 'rapid color and texture change in octopuses and cuttlefish is the subject of the review.', {
    why: [
      '"However" signals a contrast, but the second sentence describes the same ability.',
      'Cuttlefish are not an example of octopuses; they are a second animal with a similar ability.',
      'Correct. The second sentence describes a matching ability in a related animal.',
      '"As a result" would mean the octopus’s ability causes the cuttlefish’s, which it does not.',
    ],
  }),
  {
    id: 'r-s-tra-02',
    passage: 'The Large Hadron Collider got off to an embarrassing start: nine days after its first beams circulated in September 2008, a faulty electrical connection between two of its superconducting magnets triggered an accident that shut the enormous machine down for more than a year of repairs. ______ in 2012 physicists analyzing the collider’s data announced the discovery of a new particle consistent with the Higgs boson, which theorists had predicted nearly fifty years earlier.',
    steps: [
      'Sentence 1 describes the collider’s early accident and long shutdown; sentence 2 describes a major success.',
      'The writer accepts the setback but presents a strong achievement anyway: Even so.',
    ],
    why: [
      'Correct. "Even so" acknowledges the accident and delay and then presents the success that outweighs them.',
      'The particle discovery is not an example of the collider’s early problems.',
      'The discovery was not a result of the accident or of the long repairs.',
      'The second sentence does not restate the first; it presents the opposite side.',
    ],
    trap: 'Choosing a cause-and-effect transition because both sentences mention the collider.',
    meta: meta('Rossi, L. “Superconductivity: its role, its success and its setbacks in the Large Hadron Collider of CERN.” Superconductor Science and Technology 23 (2010): 034001; ATLAS Collaboration. “Observation of a new particle in the search for the Standard Model Higgs boson with the ATLAS detector at the LHC.” Physics Letters B 716 (2012): 1–29.', 'https://doi.org/10.1088/0953-2048/23/3/034001', 'the 2008 splice failure and year-long repair and the 2012 observation of a Higgs-like particle are from the two papers; the invented subway line was replaced.'),
  },
  src('r-s-tra-03', 'Czarnowski, M. S., and J. L. Olszewski. “Rainfall interception by a forest canopy.” Oikos 19 (1968).', 'https://doi.org/10.2307/3565020', 'canopy interception and evaporation of light rain are the paper’s subject; the second sentence restates the first.'),
  {
    id: 'r-s-tra-04',
    passage: 'In 2020, researchers led by Jonathan Stokes reported that a machine-learning model had helped them identify halicin, a compound that killed a broad range of bacteria in laboratory tests, including strains resistant to many existing antibiotics, and that cleared drug-resistant infections in mice. ______ a compound that works in mice must pass several further rounds of testing, including trials in people, before it can be prescribed, and many promising candidates fail at those stages because of toxicity or instability.',
    why: [
      'The caution is not a result of the compound’s success in mice; it qualifies that success.',
      'Correct. "Still" introduces a reservation that tempers the promising finding.',
      '"Specifically" would introduce details of the experiments, not a caution about the stages ahead.',
      '"Likewise" signals similarity, but the second sentence pushes in the opposite direction.',
    ],
    meta: meta('Stokes, J. M., K. Yang, K. Swanson, et al. “A deep learning approach to antibiotic discovery.” Cell 180, no. 4 (2020): 688–702.', 'https://doi.org/10.1016/j.cell.2020.01.021', 'halicin’s discovery by a neural network, its broad activity against resistant pathogens and its success in mouse infections are from the abstract; the second sentence is a general caution, not a claim about halicin’s later trials.'),
  },
  {
    id: 'r-s-tra-05',
    passage: 'A 2019 study challenged a familiar assumption that the costly illuminated manuscripts of medieval Europe were produced almost entirely by men, and that ultramarine, a brilliant blue pigment made from lapis lazuli, was rarely available there before the later Middle Ages. ______ archaeologist Anita Radini and colleagues found particles of lapis lazuli, a stone then mined only in Afghanistan, in the dental plaque of a religious woman buried in Germany in the eleventh or early twelfth century, suggesting that she had worked with the pigment.',
    steps: [
      'Sentence 1 makes a general claim: the study challenged an assumption about who made manuscripts and when the pigment was available.',
      'Sentence 2 gives the concrete evidence showing how (the pigment in a woman’s teeth): Specifically.',
    ],
    why: [
      'Correct. The second sentence names exactly what the researchers found that challenged the assumption.',
      '"Nevertheless" signals contrast, but the second sentence supports the first rather than opposing it.',
      '"Instead" would mean the study did something other than what sentence 1 says, but sentence 2 explains sentence 1.',
      '"Finally" signals the last item in a sequence, and no sequence is under way.',
    ],
    trap: 'Choosing "Instead" because sentence 1 mentions an assumption being challenged.',
    meta: meta('Radini, A., M. Tromp, A. Beach, et al. “Medieval women’s early involvement in manuscript production suggested by lapis lazuli identification in dental calculus.” Science Advances 5, no. 1 (2019): eaau7126.', 'https://doi.org/10.1126/sciadv.aau7126', 'the pigment in the dental calculus of an 11th- or early 12th-century religious woman and the challenged assumptions (availability, gendered production) are from the abstract; the invented museum exhibit was replaced.'),
  },
  {
    id: 'r-s-tra-06',
    passage: 'Naked mole-rats inhabit crowded underground colonies where oxygen can become extremely scarce, and in 2017 physiologist Thomas Park and colleagues reported that, when deprived of oxygen, the animals switch to an oxygen-independent form of metabolism fueled by fructose, a sugar that their brains can break down rapidly. ______ in experiments, naked mole-rats survived 18 minutes without any oxygen, apparently without injury, a feat that would quickly kill a laboratory mouse.',
    steps: [
      'Sentence 1 describes an ability (switching to fructose-fueled metabolism without oxygen).',
      'Sentence 2 describes what that ability allows (surviving 18 minutes without oxygen): As a result.',
    ],
    meta: meta('Park, T. J., J. Reznick, B. L. Peterson, et al. “Fructose-driven glycolysis supports anoxia resistance in the naked mole-rat.” Science 356, no. 6335 (2017): 307–311.', 'https://doi.org/10.1126/science.aab3896', 'the 18 minutes of anoxia without apparent injury and the switch to fructose-fueled anaerobic metabolism are from the abstract.'),
  },
  {
    id: 'r-tra-n3',
    passage: 'A honeybee that has found food returns to the hive and performs a waggle dance whose direction tells other bees which way to fly. ______ the length of each waggle run tells them how far away the food is.',
    steps: [
      'Sentence 1: the dance’s direction tells bees which way to fly. Sentence 2: the waggle run’s length tells them how far.',
      'The second adds another piece of information, so the transition must signal addition.',
    ],
    why: [
      '"However" signals contrast, but both sentences describe information the dance gives.',
      '"For instance" would make distance an example of direction, which it is not.',
      'Correct. Distance is a second, separate piece of information.',
      '"Therefore" signals a result, but the dance’s direction does not cause its length to show distance.',
    ],
    meta: meta('Riley, J. R., U. Greggers, A. D. Smith, D. R. Reynolds, and R. Menzel. “The flight paths of honeybees recruited by the waggle dance.” Nature 435 (2005): 205–207.', 'https://doi.org/10.1038/nature03526', 'the dance’s direction and distance information, tested by tracking recruited bees, follow the paper; the invented library was replaced.'),
  },
  {
    id: 'r-tra-n4',
    passage: 'In 2013, NASA’s Kepler space telescope lost the second of its four reaction wheels, the spinning devices that had kept it pointed precisely at a single patch of sky, and the malfunction ended the planet-hunting survey for which the spacecraft had been designed. ______ engineers devised a way to balance the telescope against the gentle pressure of sunlight, and in a new mission called K2 it resumed scientific observations of unfamiliar fields of stars, as astronomer Steve Howell and colleagues reported in 2014.',
    steps: [
      'The first sentence describes a failure that ended the original mission. The second reports a recovery.',
      'The recovery comes despite the failure: a concession, signaled by "Still."',
    ],
    why: [
      'The failure did not cause the recovery, so a cause-and-effect transition does not fit.',
      'Correct. "Still" sets the recovery against the failure: despite it, the telescope kept working.',
      '"Moreover" adds a similar point, but the second sentence turns from failure to recovery.',
      '"Specifically" introduces details of the first sentence, but the second sentence is about a solution, not the failure.',
    ],
    meta: meta('Howell, S. B., C. Sobeck, M. Haas, et al. “The K2 Mission: Characterization and Early Results.” Publications of the Astronomical Society of the Pacific 126 (2014): 398–408.', 'https://doi.org/10.1086/676406', 'the loss of the second reaction wheel and the solar-pressure balancing that made K2 possible follow the paper; the invented museum wing was replaced.'),
  },
  {
    id: 'r-tra-n5',
    passage: 'Many coastal communities are now planting or restoring mangrove forests to protect their shorelines from storm surges, an approach that a 2014 review led by marine scientist Mark Spalding described as a promising complement or alternative to engineered defenses such as concrete seawalls. ______ the trees’ dense, tangled roots slow incoming waves and trap sediment that gradually raises the shore, so that the natural barrier can build itself up over time rather than deteriorating.',
    meta: meta('Spalding, M. D., S. Ruffo, C. Lacambra, I. Meliane, L. Z. Hale, C. C. Shepard, and M. W. Beck. “The role of ecosystems in coastal protection: Adapting to climate change and coastal hazards.” Ocean & Coastal Management 90 (2014).', 'https://doi.org/10.1016/j.ocecoaman.2013.09.007', 'wave attenuation and sediment trapping by mangroves are discussed in the review; the claim is attributed rather than stated as engineers’ consensus.'),
  },
  {
    id: 'r-tra-n6',
    passage: 'In 1918, as influenza spread through the United States, officials in Philadelphia permitted an enormous parade to proceed and waited more than two weeks after the first reported cases before closing schools, churches, and theaters, and the city’s mortality rate soon climbed to one of the highest in the country. ______ officials in St. Louis closed public gathering places within days of the city’s first reported cases, and its peak death rate was considerably lower, according to a 2007 analysis by physician Richard Hatchett and colleagues.',
    steps: [
      'Sentence 1: Philadelphia delayed its closures and suffered a very high death rate. Sentence 2: St. Louis closed quickly and fared far better.',
      'The two sentences are opposed, so the transition must signal contrast.',
    ],
    why: [
      '"Similarly" signals likeness, but St. Louis acted quickly while Philadelphia delayed.',
      'St. Louis is not an example of Philadelphia’s slow response; it responded in the opposite way.',
      '"As a result" would mean Philadelphia’s delay caused St. Louis’s quick response, which it did not.',
      'Correct. St. Louis’s quick closures and lower death rate contrast with Philadelphia’s delay.',
    ],
    trap: 'Choosing "as a result" for two cities described one after the other.',
    meta: meta('Hatchett, R. J., C. E. Mecher, and M. Lipsitch. “Public health interventions and epidemic intensity during the 1918 influenza pandemic.” Proceedings of the National Academy of Sciences 104, no. 18 (2007): 7582–7587.', 'https://pubmed.ncbi.nlm.nih.gov/17416679/', 'the paper contrasts Philadelphia’s late measures with St. Louis’s early ones and links early action to lower peak death rates; the invented novelist was replaced.'),
  },
  {
    id: 'r-tra-n7',
    passage: 'On paper, London’s Millennium Bridge was an elegant solution: a slender steel footbridge across the Thames supported by unusually shallow suspension cables, designed so that pedestrians would enjoy an uninterrupted view of the city. ______ when the bridge opened in June 2000, it began to sway noticeably from side to side as crowds walked across it, and it was closed two days later for nearly two years of modifications.',
    steps: [
      'The first sentence describes the bridge’s elegant design on paper; the second describes what happened when people used it.',
      'Moving from the plan to real-world problems is a contrast between design and practice.',
    ],
    why: [
      'The swaying is not an example of the elegant design.',
      'The swaying is not similar to the elegance of the design; it cuts against it.',
      '"As a result" would present the swaying as the expected outcome of an elegant design, but the text sets the two against each other.',
      'Correct. It contrasts the design on paper with how the bridge behaved in use.',
    ],
    meta: meta('Strogatz, S. H., D. M. Abrams, A. McRobie, B. Eckhardt, and E. Ott. “Crowd synchrony on the Millennium Bridge.” Nature 438 (2005): 43–44.', 'https://doi.org/10.1038/438043a', 'the June 2000 opening, the sideways swaying under crowds and the closure for modifications follow the paper; the invented museum was replaced.'),
  },
  src('r-tra-n8', 'Hanlon, R. T., and J. B. Messenger. Cephalopod Behaviour. 2nd ed. Cambridge: Cambridge University Press, 2018.', 'https://doi.org/10.1017/9780511843600', 'the boneless body, the hard beak and squeezing through small openings are standard cephalopod biology covered in the book.'),
  {
    id: 'r-tra-n9',
    passage: 'When Barry Marshall and Robin Warren reported in 1984 that curved bacteria were present in the stomachs of most patients with gastritis and peptic ulcers, many gastroenterologists doubted that the organisms could be responsible, since the stomach’s acid was widely considered to make it too inhospitable an environment for bacteria to colonize. ______ within a decade, a 1994 panel convened by the National Institutes of Health recommended that ulcer patients infected with the bacterium receive antibiotic treatment.',
    steps: [
      'The first sentence gives the specialists’ doubts about the bacteria; the second shows the idea being officially accepted.',
      'An outcome that happens despite the first idea calls for a concession: "Even so."',
    ],
    why: [
      'Correct. Despite the doubts, the bacterial explanation won official acceptance.',
      '"Similarly" signals a parallel idea, but the panel’s recommendation contrasts with the doubts.',
      '"In other words" signals a restatement, but the second sentence reverses the first.',
      '"Specifically" introduces a detail of the first idea, not its opposite.',
    ],
    meta: meta('Marshall, B. J., and J. R. Warren. “Unidentified curved bacilli in the stomach of patients with gastritis and peptic ulceration.” The Lancet 323 (1984): 1311–1315; NIH Consensus Development Panel on Helicobacter pylori in Peptic Ulcer Disease. “Helicobacter pylori in peptic ulcer disease.” JAMA 272, no. 1 (1994): 65–69.', 'https://doi.org/10.1016/s0140-6736(84)91816-6', 'the 1984 report and the 1994 NIH consensus recommending antimicrobial treatment for infected ulcer patients are both checked records; the invented composer was replaced.'),
  },
  {
    id: 'r-tra-n10',
    passage: 'In 1974, psychologists Elizabeth Loftus and John Palmer wanted to determine whether the wording of a question could alter what eyewitnesses report about an incident they had personally observed. ______ they showed university students films of automobile accidents and asked some participants how fast the vehicles were traveling when they “smashed into” each other and others how fast the vehicles were traveling when they “hit” each other, then compared the resulting speed estimates.',
    steps: [
      'The first sentence states a goal: to learn whether a question’s wording changes eyewitness reports.',
      'The second sentence describes an action taken to reach that goal, so the transition should signal purpose.',
    ],
    why: [
      '"Instead" signals a replacement, but the experiment does not replace the goal; it serves it.',
      '"Still" signals contrast or persistence despite something, which does not fit a step taken toward a goal.',
      '"Meanwhile" signals something happening at the same time, not an action taken for the goal.',
      'Correct. "To that end" means "to achieve that goal."',
    ],
    meta: meta('Loftus, E. F., and J. C. Palmer. “Reconstruction of automobile destruction: An example of the interaction between language and memory.” Journal of Verbal Learning and Verbal Behavior 13, no. 5 (1974): 585–589.', 'https://doi.org/10.1016/s0022-5371(74)80011-3', 'the films of car accidents and the “smashed”/“hit” wording follow the study; the invented bridge was replaced.'),
  },
  {
    id: 'r-tra-n11',
    passage: 'Beginning in 1977, researchers released brown anole lizards from a single island onto fourteen small islands in the Bahamas whose vegetation consisted mostly of narrower branches and stems, and when Jonathan Losos and colleagues later measured the new populations, they found that the lizards’ relative hindlimb length corresponded to the thickness of the vegetation on each island, with shorter legs where the perches were narrower. ______ the populations had changed measurably within little more than a decade, showing that adaptive differences can arise remarkably quickly.',
    steps: [
      'The first sentence reports differences in leg length that appeared after the lizards were moved to new islands.',
      'The second sentence says the same thing more simply: the populations changed measurably within about a decade. That is a restatement.',
    ],
    meta: meta('Losos, J. B., K. I. Warheit, and T. W. Schoener. “Adaptive differentiation following experimental island colonization in Anolis lizards.” Nature 387 (1997): 70–73.', 'https://doi.org/10.1038/387070a0', 'the experimental introductions and the link between hindlimb length and vegetation diameter follow the paper; the time span is stated loosely to avoid overstating precision.'),
  },
  {
    id: 'r-tra-n12',
    passage: 'Night-migrating songbirds such as the European robin can find their direction by the pattern of the stars. ______ they can use Earth’s magnetic field, an ability that Wolfgang and Roswitha Wiltschko demonstrated in robins in 1972 and that lets the birds hold their course even when clouds hide the sky.',
    steps: [
      'The first sentence gives one way to navigate (the stars); the second gives a different way (the magnetic field).',
      'Presenting another possible method calls for "Alternatively."',
    ],
    why: [
      'Using the magnetic field is not a result of using the stars.',
      'Using the magnetic field is not an example of using the stars.',
      'Correct. It introduces a second, different way of finding direction.',
      'The second sentence adds a new method rather than summarizing the first.',
    ],
    trap: 'Choosing a cause-and-effect word for two separate methods.',
    remember: 'Another option or method → "alternatively."',
    meta: meta('Wiltschko, W., and R. Wiltschko. “Magnetic compass of European robins.” Science 176, no. 4030 (1972): 62–64.', 'https://doi.org/10.1126/science.176.4030.62', 'the robins’ magnetic compass is the paper’s finding; star orientation in night migrants is general background, and the invented city flood plan was replaced.'),
  },
  {
    id: 'r-tra-n13',
    passage: 'A severe drought in 1977 on the Galápagos island of Daphne Major transformed its population of medium ground finches in ways that the biologists Peter Boag and Peter Grant were subsequently able to quantify precisely. ______ the birds that survived were, on average, larger and possessed deeper beaks than those that perished, because only large-beaked finches could successfully crack the large, extremely hard seeds that remained once the softer, more accessible seeds had been consumed.',
    steps: [
      'The first sentence says the drought changed the population in measurable ways, without saying how.',
      'The second sentence names exactly how: survivors were larger, with deeper beaks. That is a specification.',
    ],
    why: [
      'Correct. It introduces the specific way the drought changed the population.',
      '"Regardless" signals disregarding something, which does not fit a sentence that explains the first.',
      '"Instead" signals a replacement, but the survivors’ larger beaks are the change itself.',
      '"Even so" signals a contrast with what came before, but the second sentence supports it.',
    ],
    meta: meta('Boag, P. T., and P. R. Grant. “Intense natural selection in a population of Darwin’s finches (Geospizinae) in the Galápagos.” Science 214, no. 4516 (1981): 82–85.', 'https://doi.org/10.1126/science.214.4516.82', 'nonrandom survival of large, large-beaked birds that could crack the hard seeds is the abstract’s finding; the invented library plan was replaced.'),
  },
  {
    id: 'r-tra-n14',
    passage: 'In a nine-month experiment at Ctrip, a large Chinese travel agency, call-center employees who volunteered and were randomly assigned to work from home completed about 13 percent more work than colleagues who remained in the office, according to economist Nicholas Bloom and colleagues. ______ the home workers reported greater satisfaction with their jobs, and the rate at which they left the company fell by half.',
    steps: [
      'Both sentences describe benefits of working from home in the experiment.',
      'The second adds further benefits (satisfaction, fewer departures), so an addition transition fits.',
    ],
    why: [
      '"Nevertheless" signals something despite the first idea, but greater satisfaction does not conflict with higher productivity.',
      '"As a result" would make the workers’ satisfaction a consequence of completing more work, which the text does not claim.',
      '"In contrast" signals opposing ideas, but greater satisfaction is a second benefit of working from home, added to higher productivity.',
      'Correct. It adds further benefits to the first.',
    ],
    trap: 'Choosing a cause-and-effect transition for two separate findings of the same study.',
    remember: 'Another benefit → "in addition."',
    meta: meta('Bloom, N., J. Liang, J. Roberts, and Z. J. Ying. “Does Working from Home Work? Evidence from a Chinese Experiment.” Quarterly Journal of Economics 130, no. 1 (2015): 165–218.', 'https://doi.org/10.1093/qje/qju032', 'the 13 percent performance gain, the improved satisfaction and the halved attrition are from the abstract; the invented library card program was replaced.'),
  },
  {
    id: 'r-tra-n15',
    passage: 'In 2015, psychologists Jaap Murre and Joeri Dros reported a successful replication of Hermann Ebbinghaus’s famous forgetting curve, first published in 1885, finding that memory for lists of nonsense syllables declined over the following month in much the way Ebbinghaus had described. ______ the replication, like the original study, relied on a single participant, so its results should be confirmed with a larger and more varied group of learners.',
    steps: [
      'The first sentence reports a successful replication; the second raises a limitation.',
      'Moving from a success to a limitation calls for a concession: "That said."',
    ],
    why: [
      'The single participant is not an example of the successful replication.',
      'Correct. It qualifies the praise with a limitation.',
      '"Accordingly" signals a result that follows from the first idea, but the limitation works against it.',
      '"In fact" signals emphasis or a stronger version of the first idea, not a limitation.',
    ],
    meta: meta('Murre, J. M. J., and J. Dros. “Replication and Analysis of Ebbinghaus’ Forgetting Curve.” PLOS ONE 10, no. 7 (2015): e0120644.', 'https://doi.org/10.1371/journal.pone.0120644', 'the successful single-subject replication of the 1885 curve is the paper’s report; the invented back-pain trial was replaced.'),
  },
  {
    id: 'r-tra-n16',
    passage: 'In his experiments with pea plants, Gregor Mendel first crossed plants that had purple flowers with plants that had white flowers. Next, he let the offspring, all of which had purple flowers, pollinate themselves. ______ he counted the flowers in the new generation and found about three purple-flowered plants for every white-flowered one.',
    steps: [
      'The text describes steps in order: "first," "next."',
      'Counting the new generation is the last step, so "Finally" fits.',
    ],
    why: [
      'The last step does not contrast with the earlier ones.',
      'Counting the plants is a step, not an example of letting them pollinate themselves.',
      'Correct. It marks the final step in the sequence.',
      'Counting is not similar to the previous step; it follows it.',
    ],
    meta: meta('Mendel, G. “Versuche über Pflanzen-Hybriden.” Verhandlungen des naturforschenden Vereines in Brünn 4 (1866): 3–47; discussed in A. Franklin, What Makes a Good Experiment? (University of Pittsburgh Press, 2016).', 'https://doi.org/10.2307/j.ctt1f89t46.5', 'the cross, self-pollination and roughly 3 : 1 ratio of flower colors follow Mendel’s results; the papermaking description had no source.'),
  },
  {
    id: 'r-tra-n17',
    passage: 'In 1929, the astronomer Edwin Hubble reported that the more distant a galaxy is from Earth, the faster it appears to be moving away, a relationship he drew from comparing estimated distances to two dozen galaxies with the velocities indicated by their light. ______ astronomers came to interpret the observation as evidence that the universe itself is expanding, carrying galaxies farther apart over time.',
    steps: [
      'The first sentence gives a finding: farther galaxies move away faster.',
      'The second sentence draws a conclusion from it: the universe is expanding. That is a logical consequence.',
    ],
    why: [
      'Correct. The conclusion about expansion follows from the distance-velocity relationship.',
      '"Still" signals a contrast, but the second sentence follows from the first.',
      '"Meanwhile" signals something happening at the same time, not a conclusion.',
      'The second sentence is a conclusion drawn from the first, not an example of it.',
    ],
    trap: 'Choosing "Still" because the conclusion sounds surprising.',
    meta: meta('Hubble, E. “A relation between distance and radial velocity among extra-galactic nebulae.” Proceedings of the National Academy of Sciences 15, no. 3 (1929): 168–173.', 'https://doi.org/10.1073/pnas.15.3.168', 'the distance-velocity relation from 24 nebulae is the paper’s; the passage credits the expansion reading to later astronomers, not to Hubble’s paper.'),
  },
  {
    id: 'r-tra-n18',
    passage: 'Many desert plants survive prolonged dry seasons by storing water in thick, fleshy stems that swell dramatically after each rain and gradually contract as the accumulated moisture is consumed. ______ some Australian desert frogs survive drought by storing water in their bodies and burrowing underground, where they enclose themselves in protective cocoons made of layers of shed skin until the seasonal rains return.',
    meta: meta('Withers, P. C. “Cocoon formation and structure in the estivating Australian desert frogs, Neobatrachus and Cyclorana.” Australian Journal of Zoology 43 (1995).', 'https://doi.org/10.1071/zo9950429', 'burrowing and cocoons of shed skin in Australian desert frogs follow the paper; an unsourced multi-year figure was removed.'),
  },
  {
    id: 'r-tra-n19',
    passage: 'Contrary to the assumptions of many earlier naturalists, the black-and-white stripes of zebras may not serve chiefly to camouflage the animals from lions, hyenas, and other large predators on the open African savanna. ______ experiments by biologist Tim Caro and colleagues suggest that the stripes deter biting flies: horseflies flew toward striped coats but often failed to land on them.',
    steps: [
      'The first sentence says what the stripes may not be for.',
      'The second gives a likelier purpose, replacing the rejected one. "Rather" introduces a correction after a negative.',
    ],
    why: [
      '"Additionally" adds a point; here the second sentence replaces the first.',
      'Deterring flies is not similar to the rejected camouflage purpose.',
      'Deterring flies is not an example of camouflage against predators.',
      'Correct. "Not X…; rather, Y" corrects the purpose.',
    ],
    meta: meta('Caro, T., et al. “Benefits of zebra stripes: Behaviour of tabanid flies around zebras and horses.” PLOS ONE 14, no. 2 (2019): e0210831.', 'https://pubmed.ncbi.nlm.nih.gov/30785882/', 'horseflies approaching but failing to land on striped coats is the study’s finding; “may not” and “suggest” keep the claim as strong as the evidence; the invented library policy was replaced.'),
  },
  {
    id: 'r-tra-n20',
    passage: 'Near the summit of Mount Everest, the atmosphere holds only about a third of the oxygen available at sea level, and climbers confront extreme temperatures, unpredictable storms, and debilitating exhaustion, hazards that have killed hundreds of people since the first expeditions to the mountain in the 1920s. ______ hundreds of mountaineers attempt to reach the summit annually, and records analyzed by biologist Raymond Huey and colleagues encompassed more than 5,800 climbers making their first attempt since 1990.',
    steps: [
      'The first sentence stresses how dangerous Everest is.',
      'The second reports something surprising given that danger: hundreds of climbers still attempt it every year. That calls for a concession.',
    ],
    why: [
      '"Moreover" adds a point in the same direction, but the second sentence runs against the first.',
      'Correct. Despite the dangers, hundreds of climbers make the attempt.',
      'The dangers do not cause people to attempt the climb.',
      'Attempting the climb is not similar to the mountain’s being dangerous.',
    ],
    trap: 'Choosing an addition transition because both sentences describe the mountain.',
    meta: meta('Huey, R. B., C. Carroll, R. Salisbury, and J.-L. Wang. “Mountaineers on Mount Everest: Effects of age, sex, experience, and crowding on rates of success and death.” PLOS ONE 15, no. 8 (2020): e0236919.', 'https://doi.org/10.1371/journal.pone.0236919', '“hundreds of mountaineers attempt to summit Everest each year” and the 2,211 plus 3,620 first-time climbers are from the abstract; the invented trail was replaced.'),
  },
  {
    id: 'r-tra-n21',
    passage: 'Some bird species have adapted to urban environments in surprising ways, exploiting artificial structures, abundant prey, and even artificial light that their ancestors never encountered. ______ peregrine falcons, which traditionally nest on cliff ledges, now breed on buildings in many cities, and a 2026 study of thirty urban nest sites in the United Kingdom found that parents fed their chicks at night in more than a third of the nesting attempts observed, aided by artificial lighting.',
    meta: meta('Drewitt, E. J. A., B. Mak, R. J. Thomas, and I. C. Cuthill. “Night-time nestling provisioning in urban peregrine falcons.” Royal Society Open Science (2026).', 'https://doi.org/10.1098/rsos.252277', 'the 30 urban UK nest sites, night feeding in 28 of 66 nesting attempts and the role of artificial light are from the abstract.'),
  },
  src('r-tra-n22', 'Harland, D. P., D. Li, and R. R. Jackson. “How jumping spiders see the world.” In How Animals See the World, edited by O. F. Lazareva, T. Shimizu, and E. A. Wasserman. Oxford: Oxford University Press, 2012.', 'https://doi.org/10.1093/acprof:oso/9780195334654.003.0010', 'jumping spiders’ vision-guided stalking and leaping, as opposed to web building, is the chapter’s subject.'),
  {
    id: 'r-tra-n23',
    passage: 'Bumblebees tested by Olli Loukola and colleagues in 2017 proved considerably more inventive than researchers had anticipated of an insect with such a miniature brain. ______ after watching a demonstrator move a small ball to the center of a platform to earn a sugary reward, the observers mastered the unfamiliar task quickly and frequently improved on it, selecting the ball positioned closest to the center rather than the distant one their demonstrator had moved.',
    steps: [
      'The first sentence says the bees were more inventive than expected.',
      'The second gives striking evidence that strengthens that claim. "Indeed" emphasizes and confirms it.',
    ],
    why: [
      '"Nevertheless" signals something despite the first idea, but the second sentence supports it.',
      '"Instead" signals a replacement, which does not fit a sentence that supports the first.',
      'Correct. It confirms and emphasizes how inventive the bees were.',
      '"Otherwise" signals what would happen if something were not true.',
    ],
    trap: 'Choosing a concession because the bees’ ability was unexpected.',
    meta: meta('Loukola, O. J., C. Solvi, L. Coscos, and L. Chittka. “Bumblebees show cognitive flexibility by improving on an observed complex behavior.” Science 355, no. 6327 (2017): 833–836.', 'https://doi.org/10.1126/science.aag2360', 'observers learning the ball task and choosing the ball closest to the target instead of copying are from the abstract; the invented theater revival was replaced.'),
  },
  {
    id: 'r-tra-n24',
    passage: 'In the late 1950s and early 1960s, thalidomide was widely prescribed to pregnant women to relieve nausea, until physicians recognized that the drug was causing severe birth defects in thousands of children whose mothers had taken it. ______ regulatory agencies in the United States and other countries strengthened their requirements for testing new drugs for toxicity, a turning point that toxicologists James Kim and Anthony Scialli traced in a 2011 review.',
    steps: [
      'The first sentence describes a problem: a drug that caused severe birth defects.',
      'The second describes the response caused by it: stricter drug-testing requirements.',
    ],
    why: [
      'Correct. The stricter testing requirements are a result of the birth defects.',
      '"Nevertheless" signals something despite the first idea, but the new requirements follow from it.',
      '"Similarly" signals a parallel point, but stricter rules are not like the tragedy; they are the response it caused.',
      '"For example" introduces an instance of a general point, but the new rules are not an example of birth defects; they are a result of them.',
    ],
    meta: meta('Kim, J. H., and A. R. Scialli. “Thalidomide: the tragedy of birth defects and the effective treatment of disease.” Toxicological Sciences 122, no. 1 (2011): 1–6.', 'https://doi.org/10.1093/toxsci/kfr088', 'the use for nausea, the birth defects in thousands of children and the resulting change in regulatory toxicity testing are from the abstract; the invented bridge was replaced.'),
  },
  {
    id: 'r-tra-n25',
    passage: 'Crops genetically engineered to produce insect-killing proteins from the bacterium Bacillus thuringiensis, known as Bt crops, have clear advantages: they kill some major insect pests and have allowed many farmers to reduce their use of sprayed insecticides. ______ a 2013 review by Bruce Tabashnik and colleagues found that some populations of 5 of the 13 major pest species examined had evolved resistance that reduced the crops’ effectiveness, compared with only one species in 2005.',
    steps: [
      'The first sentence lists advantages of Bt crops.',
      'The second raises a drawback that stands despite those advantages: a contrast that qualifies the praise.',
    ],
    why: [
      'The resistance does not follow from the crops’ strengths.',
      'Insect resistance is not similar to the crops’ strengths; it works against them.',
      'The second sentence adds a new point rather than restating the first.',
      'Correct. Despite the advantages, there is a growing problem.',
    ],
    remember: 'Strengths, even so, a drawback.',
    meta: meta('Tabashnik, B. E., T. Brévault, and Y. Carrière. “Insect resistance to Bt crops: lessons from the first billion acres.” Nature Biotechnology 31, no. 6 (2013): 510–521.', 'https://doi.org/10.1038/nbt.2597', 'the 5 of 13 species (one in 2005) with field-evolved resistance is from the abstract; the invented curriculum was replaced.'),
  },
  {
    id: 'r-tra-n26',
    passage: 'In England, Charles Darwin spent the 1840s and 1850s quietly gathering evidence for his theory of natural selection, sharing his ideas with only a few trusted colleagues and repeatedly postponing publication. ______ thousands of kilometers away in the Malay Archipelago, the naturalist Alfred Russel Wallace was collecting specimens, and in 1858 he arrived independently at a similar theory, which he promptly described in an essay that he mailed to Darwin.',
    steps: [
      'The first sentence describes what Darwin was doing in England; the second, what Wallace was doing far away during the same years.',
      '"Meanwhile" signals events happening at the same time in different places.',
    ],
    why: [
      'Wallace’s work was not caused by Darwin’s delays in publishing.',
      'Correct. The two naturalists’ work went on during the same period in different places.',
      'Wallace’s work is not an example of Darwin’s quiet evidence gathering.',
      '"Similarly" would mean Wallace was also delaying publication, but he wrote up his theory and sent it off at once.',
    ],
    meta: meta('Darwin, C., and A. Wallace. “On the tendency of species to form varieties; and on the perpetuation of varieties and species by natural means of selection.” Journal of the Proceedings of the Linnean Society of London, Zoology 3 (1858): 45–62.', 'https://doi.org/10.1111/j.1096-3642.1858.tb02500.x', 'the joint 1858 paper presents Darwin’s long-unpublished work alongside the essay Wallace sent him; the invented council meeting was replaced.'),
  },
  {
    id: 'r-tra-n27',
    passage: 'The first known fossils of the giant predatory dinosaur Spinosaurus, described by the German paleontologist Ernst Stromer in 1915, were destroyed in 1944, when a bombing raid during World War II struck the Munich museum that housed them. ______ in 2014 a team led by Nizar Ibrahim reconstructed the animal’s skeleton by combining newly discovered fossils from Morocco with Stromer’s surviving descriptions and photographs.',
    steps: [
      'The first sentence describes an obstacle: the original fossils were destroyed.',
      'The second reports success despite it, so a concession transition fits.',
    ],
    why: [
      '"Consequently" says the destruction of the fossils made the reconstruction possible, but it was an obstacle; the reconstruction happened in spite of it.',
      '"In addition" would add another point of the same kind, but the reconstruction is not another loss; it contrasts with the loss.',
      'Correct. Despite the destruction of the original fossils, the skeleton was reconstructed.',
      'The second sentence does not restate the first; it reports what happened later.',
    ],
    meta: meta('Ibrahim, N., P. C. Sereno, C. Dal Sasso, et al. “Semiaquatic adaptations in a giant predatory dinosaur.” Science 345, no. 6204 (2014): 1613–1616.', 'https://doi.org/10.1126/science.1258750', 'the wartime loss of Stromer’s type specimen and the new Moroccan fossils are from the paper and its summary; the invented riverbank fossil was replaced.'),
  },
  {
    id: 'r-tra-n28',
    passage: 'In Walter Mischel’s studies of self-control, a researcher first showed a young child two treats and explained that the child could have the preferred treat by waiting for the researcher to return, or a lesser one at any time by ringing a bell. ______ the researcher left the room and timed how long the child waited.',
    steps: [
      'The first sentence gives the first step ("first showed a young child two treats").',
      'The second gives the following step, so "Next" fits.',
    ],
    why: [
      'Leaving the room does not contrast with explaining the choice to the child.',
      'Correct. It marks the next step in the procedure.',
      'Leaving the room is not an example of explaining the choice.',
      '"In contrast" signals opposing ideas, but the steps of the procedure are not opposed; the second step simply follows the first.',
    ],
    meta: meta('Mischel, W., E. B. Ebbesen, and A. R. Zeiss. “Cognitive and attentional mechanisms in delay of gratification.” Journal of Personality and Social Psychology 21, no. 2 (1972): 204–218.', 'https://doi.org/10.1037/h0032198', 'the delay procedure (preferred reward for waiting, lesser reward by ringing a bell, the researcher leaving) follows the study; the invented chef was replaced.'),
  },
  {
    id: 'r-tra-n29',
    passage: 'Stockholm’s congestion charge, introduced experimentally in 2006 and made permanent in 2007, does not prohibit private automobiles from entering the center of the Swedish capital. ______ it charges motorists a fee each time they cross into the inner city on weekdays, with higher rates during rush hours, and a 2009 analysis by transportation economist Jonas Eliasson found that traffic across the charging boundary declined by approximately a fifth.',
    steps: [
      'The first sentence says what the charge does not do.',
      'The second says what it actually does: charge a fee. "Rather" introduces that correction.',
    ],
    why: [
      'Correct. Not a ban; rather, a fee.',
      'A fee is not similar to a ban; it replaces the idea of a ban.',
      'The fee is not an example of not banning cars.',
      '"Moreover" adds a point, but the second sentence corrects the first.',
    ],
    meta: meta('Eliasson, J. “A cost–benefit analysis of the Stockholm congestion charging system.” Transportation Research Part A: Policy and Practice 43 (2009).', 'https://doi.org/10.1016/j.tra.2008.11.014', 'the 2006 trial, permanent charge from 2007, time-varying weekday fee and roughly 20 percent traffic reduction follow the paper; the invented council plan was replaced.'),
  },
  {
    id: 'r-tra-n30',
    passage: 'For several years, Johannes Kepler tried to fit Tycho Brahe’s precise observations of Mars to orbits built from circles, the shape that astronomers since antiquity had assumed planetary motion must follow, but each of his models disagreed with the observations by small yet persistent amounts. ______ he concluded that Mars travels in an ellipse, with the Sun at one focus, a result that he published in 1609.',
    steps: [
      'The first sentence describes years of trying circular orbits that did not fit.',
      'The second describes the final conclusion, so "Ultimately" fits.',
    ],
    why: [
      'The ellipse is not an example of the failed circular models.',
      'The ellipse is not similar to the circular models; it replaces them.',
      'The conclusion does not simply contrast with the earlier work; it is where that work led.',
      'Correct. It marks the final outcome of years of effort.',
    ],
    meta: meta('Wilson, C. “Kepler’s derivation of the elliptical path.” Isis 59 (1968).', 'https://doi.org/10.1086/350331', 'Kepler’s years of circle-based models for Mars, the residual errors and the elliptical orbit published in Astronomia Nova (1609) follow the history; the invented library committee was replaced.'),
  },
  {
    id: 'r-tra-n31',
    passage: 'Unlike most satellites, which pass rapidly overhead and remain observable from a particular location for only minutes, GOES-16, a weather satellite launched by the United States in 2016, travels in a geostationary orbit. ______ it circles Earth once a day, matching the planet’s rotation, so that it remains above the same point on the equator and can continuously monitor developing hurricanes throughout the Americas.',
    meta: meta('Schmit, T. J., P. Griffith, M. M. Gunshor, J. M. Daniels, S. J. Goodman, and W. J. Lebair. “A closer look at the ABI on the GOES-R series.” Bulletin of the American Meteorological Society 98, no. 4 (2017): 681–698.', 'https://doi.org/10.1175/BAMS-D-15-00230.1', 'GOES-16, the first GOES-R series geostationary weather satellite, and its continuous monitoring are described in the paper; an unnamed satellite was replaced with a real one.'),
  },
  src('r-tra-n32', 'Canup, R. M., and E. Asphaug. “Origin of the Moon in a giant impact near the end of the Earth’s formation.” Nature 412 (2001): 708–712.', 'https://doi.org/10.1038/35089010', 'the giant-impact origin and the problems with capture are standard and consistent with the paper.'),
  {
    id: 'r-tra-n33',
    passage: 'Early investigations of the urban heat island effect relied almost entirely on measurements of air temperature recorded at meteorological stations, many of them located in parks or airports far from densely populated neighborhoods. ______ more recent research, aided by satellite and airborne instruments, measures the surface temperatures of pavement and rooftops, which on summer afternoons can be far hotter than the air above them and which more directly affect the comfort of pedestrians.',
    meta: meta('Voogt, J. A., and T. R. Oke. “Thermal remote sensing of urban climates.” Remote Sensing of Environment 86, no. 3 (2003): 370–384.', 'https://doi.org/10.1016/s0034-4257(03)00079-8', 'the shift from air-temperature stations to remotely sensed surface temperatures is the review’s subject; an unsourced “20 °C” figure was softened.'),
  },
  src('r-tra-n34', 'Hollien, H., and H. Rothman. Underwater Sound Localization in Humans. Technical report, 1971 (Defense Technical Information Center AD0722373).', 'https://doi.org/10.21236/ad0722373', 'faster sound underwater, smaller arrival-time differences between the ears and poorer localization by divers are the report’s subject.'),
  {
    id: 'r-tra-n35',
    passage: 'The 2020 trial of the Pfizer–BioNTech COVID-19 vaccine enrolled more than 43,000 participants, and the vaccine’s efficacy of approximately 95 percent was consistent across the age groups, sexes, and racial and ethnic categories examined, as physician Fernando Polack and colleagues reported. ______ participants had been monitored for a median of only about two months following their second injection when the results were published, so the trial could not determine how long the protection would persist.',
    why: [
      'The short follow-up does not follow from the trial’s strengths.',
      'The short follow-up is not an example of the trial’s strengths.',
      'Correct. Despite its strengths, the trial has a limitation.',
      'The limitation is not similar to the strengths; it works against them.',
    ],
    meta: meta('Polack, F. P., S. J. Thomas, N. Kitchin, et al. “Safety and efficacy of the BNT162b2 mRNA Covid-19 vaccine.” New England Journal of Medicine 383 (2020): 2603–2615.', 'https://doi.org/10.1056/NEJMoa2034577', 'the 43,548 participants, 95 percent efficacy, similar efficacy across subgroups and median two-month follow-up are from the published trial; the unnamed trial was replaced.'),
  },
  {
    id: 'r-tra-n36',
    passage: 'Some birds have demonstrated cognitive abilities once attributed exclusively to great apes and a few other mammals with exceptionally large brains, from manipulating tools to remembering where and when particular events took place. ______ Eurasian magpies, birds whose brains are considerably smaller than those of apes and organized quite differently, have passed the standard mirror test by attempting to remove colored marks that they could perceive only in a mirror, as Helmut Prior and colleagues reported in 2008.',
    steps: [
      'The first sentence makes a general claim: some birds show abilities once credited only to apes and a few mammals.',
      'The second highlights a striking case, magpies passing the mirror test, that supports and sharpens the claim.',
    ],
    meta: meta('Prior, H., A. Schwarz, and O. Güntürkün. “Mirror-induced behavior in the magpie (Pica pica): evidence of self-recognition.” PLoS Biology 6, no. 8 (2008): e202.', 'https://doi.org/10.1371/journal.pbio.0060202', 'tool use and episodic-like memory in birds and the magpies’ mark-directed behavior are from the abstract; the earlier claim that “several” bird species pass the test was corrected.'),
  },
  {
    id: 'r-tra-n37',
    passage: 'Over six years of monitoring a parking lot near Seattle, Washington, hydrologists Benjamin Brattebo and Derek Booth found that sections paved with permeable materials allowed almost all of the rain that fell on them to soak into the ground, producing far less surface runoff than conventional asphalt, which sends stormwater rushing into drains. ______ the water that drained through the permeable sections contained substantially lower concentrations of copper, zinc, and motor oil than runoff from the asphalt.',
    steps: [
      'The first sentence gives one benefit (less runoff); the second gives another (cleaner water).',
      'Adding a second benefit calls for "Moreover."',
    ],
    why: [
      'The second benefit does not contrast with the first.',
      'Correct. It adds a further benefit.',
      '"In contrast" signals opposing ideas, but cleaner water is a second benefit of permeable pavement, added to reduced runoff.',
      'Cleaner drainage water is not a result of reduced runoff.',
    ],
    meta: meta('Brattebo, B. O., and D. B. Booth. “Long-term stormwater quantity and quality performance of permeable pavement systems.” Water Research 37, no. 18 (2003): 4369–4376.', 'https://doi.org/10.1016/s0043-1354(03)00410-x', 'the six-year monitoring, near-total infiltration and lower copper, zinc and motor oil in the infiltrate follow the paper.'),
  },
  {
    id: 'r-tra-n38',
    passage: 'Penicillin was discovered largely by chance: in 1928, Alexander Fleming noticed that a mold that had accidentally contaminated one of his bacterial cultures was killing the bacteria growing around it. ______ many of the antibiotics introduced over the following decades were found through systematic screening, in which researchers such as Selman Waksman tested thousands of soil microbes one by one for compounds that inhibit bacterial growth.',
    steps: [
      'The first sentence describes a discovery made by chance; the second describes discovery by systematic screening.',
      'Two different methods are contrasted.',
    ],
    meta: meta('Hutchings, M. I., A. W. Truman, and B. Wilkinson. “Antibiotics: past, present and future.” Current Opinion in Microbiology 51 (2019): 72–80.', 'https://doi.org/10.1016/j.mib.2019.10.008', 'penicillin’s 1928 discovery and the later systematic screening of soil microbes are covered in the review; “the first antibiotics” was narrowed to penicillin, since the review dates salvarsan, found by screening, to 1910.'),
  },
  src('r-tra-n39', 'Hansen, D. H. “Physiology and microclimate in a hemiparasite Castilleja chromosa (Scrophulariaceae).” American Journal of Botany 66 (1979).', 'https://doi.org/10.1002/j.1537-2197.1979.tb06249.x', 'Indian paintbrush as a photosynthesizing hemiparasite that takes water and nutrients from host roots is the paper’s subject.'),
  {
    id: 'r-tra-n40',
    passage: 'For most of history, scholars who studied how a language’s vocabulary changed had to read texts one at a time, a painstaking method that limited any single researcher to a small sample of the written record. ______ researchers can analyze millions of digitized books at once: in 2011, Jean-Baptiste Michel and colleagues tracked word frequencies across more than five million books, roughly 4 percent of all books ever printed.',
    steps: [
      'The first sentence describes the traditional method (reading texts one by one).',
      'The second describes a modern method that analyzes millions of books at once, a contrast in time and technique.',
    ],
    why: [
      'Analyzing millions of books at once is not similar to reading texts one at a time.',
      'Reading texts one at a time does not lead to computer analysis as a result.',
      'Computer analysis of millions of books is not an example of the older method.',
      'Correct. It contrasts present practice with past practice.',
    ],
    meta: meta('Michel, J.-B., Y. K. Shen, A. P. Aiden, et al. “Quantitative analysis of culture using millions of digitized books.” Science 331, no. 6014 (2011): 176–182.', 'https://doi.org/10.1126/science.1199644', 'the corpus of over five million books (about 4 percent of all books printed) is the paper’s; the unsourced claim about sculptors was replaced.'),
  },
  {
    id: 'r-tra-n41',
    passage: 'After the 1989 Loma Prieta earthquake damaged the Embarcadero Freeway, a double-deck elevated highway that had cut San Francisco’s downtown off from its waterfront for three decades, the city decided not to repair or rebuild the structure. ______ it tore the freeway down and replaced it with a ground-level boulevard lined with palm trees, wide sidewalks, and a streetcar line, changes that urban planner Robert Cervero and colleagues later linked to rising property values nearby.',
    steps: [
      'The city rejected one option (rebuilding the freeway).',
      'It chose a different option (a boulevard) in its place: "Instead."',
    ],
    why: [
      'A ground-level boulevard is not similar to the elevated freeway.',
      'Correct. The boulevard replaced the freeway the city chose not to rebuild.',
      'The boulevard is not an example of the decision not to rebuild.',
      '"Moreover" would add a point in the same direction, but the second sentence describes what was done in place of rebuilding.',
    ],
    meta: meta('Cervero, R., J. Kang, and K. Shively. “From elevated freeways to surface boulevards: neighborhood and housing price impacts in San Francisco.” Journal of Urbanism 2 (2009).', 'https://doi.org/10.1080/17549170902833899', 'the quake-damaged Embarcadero Freeway, its replacement by a surface boulevard and the nearby price gains follow the paper; the invented Main Street plan was replaced.'),
  },
  src('r-tra-n42', 'Bates, H. W. “Contributions to an insect fauna of the Amazon valley. Lepidoptera: Heliconidae.” Transactions of the Linnean Society of London 23 (1862): 495–566.', 'https://doi.org/10.1111/j.1096-3642.1860.tb00146.x', 'Bates’s paper is the original description of harmless species mimicking protected ones; warning coloration is standard background.'),
  {
    id: 'r-tra-n43',
    passage: 'In 1954, more than a million American schoolchildren participated in a nationwide field trial of Jonas Salk’s inactivated polio vaccine, which a team led by the epidemiologist Thomas Francis Jr. then evaluated in painstaking detail over the following year. ______ after the evaluation demonstrated that the vaccine was safe and substantially reduced paralytic polio, it was licensed in April 1955 and offered to millions of children across the country within weeks.',
    steps: [
      'The first sentence describes a trial; the second describes what happened later.',
      'A later step in a sequence calls for "Subsequently."',
    ],
    why: [
      'Correct. It marks the next event in time.',
      'The licensing does not oppose the trial; it followed from the trial’s success.',
      'The licensing is a later step, not a similar one.',
      'The second sentence adds new events rather than restating the first.',
    ],
    meta: meta('Francis, T., Jr. “Evaluation of the 1954 poliomyelitis vaccine field trial.” Journal of the American Medical Association 158, no. 14 (1955): 1266–1270.', 'https://doi.org/10.1001/jama.1955.02960140028004', 'the 1954 field trial, its evaluation by Francis and the vaccine’s effectiveness against paralytic polio follow the report; the April 1955 licensing is the standard date; the invented traffic signals were replaced.'),
  },
  src('r-tra-n44', 'Ball, P. “Water: an enduring mystery.” Nature 452 (2008): 291–292.', 'https://doi.org/10.1038/452291a', 'ice’s lower density, hydrogen bonding and lakes freezing from the top are standard and consistent with the article.'),
  {
    id: 'r-tra-n45',
    passage: 'Psychologists John Darley and Daniel Batson found in 1973 that seminary students who had just been asked to deliver a presentation on the parable of the Good Samaritan, a story about assisting a stranger in distress, were not significantly more likely to help a groaning, apparently distressed man slumped in a doorway than students preparing remarks on an unrelated occupational topic. ______ several participants who were hurrying to deliver their presentation on the parable literally stepped over the man on their way into the building.',
    steps: [
      'The first sentence says the parable students were no more likely to help.',
      'The second gives a more extreme instance, intensifying the point: "In fact."',
    ],
    why: [
      'The second sentence does not happen despite the first; it intensifies it.',
      'Correct. It adds a more extreme example of the students’ failure to help.',
      'Stepping over the man was not caused by the study’s finding; it is part of that finding.',
      'Stepping over the man does not contrast with the failure to help; it is an extreme form of it.',
    ],
    meta: meta('Darley, J. M., and C. D. Batson. “‘From Jerusalem to Jericho’: A study of situational and dispositional variables in helping behavior.” Journal of Personality and Social Psychology 27, no. 1 (1973): 100–108.', 'https://doi.org/10.1037/h0034449', 'the parable versus other-topic talks, the slumped victim and students literally stepping over him are reported in the paper; the invented manuscript rejection was replaced.'),
  },
  src('r-tra-n46', 'Mercer, L. J. “Land grants to American railroads: social cost or social benefit?” Business History Review 43 (1969).', 'https://doi.org/10.2307/3112269', 'federal land grants and government bonds for the first transcontinental line, set against private financing, follow the paper’s subject.'),
  {
    id: 'r-tra-n47',
    passage: 'In a 2018 laboratory study, a gene drive, a genetic element engineered to spread through a population far faster than ordinary inheritance allows, reached every mosquito in caged populations of a malaria-carrying species within seven to eleven generations and caused those populations to collapse completely, as Kyros Kyrou and colleagues reported. ______ a laboratory cage cannot reproduce the size, variety, and shifting conditions of wild populations, so larger and more realistic trials are needed before any release.',
    why: [
      'The caution does not follow from the strong result; it qualifies it.',
      '"In other words" introduces a restatement, but the second sentence adds a limitation (cages are not the wild) to an encouraging result.',
      'Correct. "Still" introduces a limitation despite the good result.',
      'Sentence 2 does not add another point in support of the gene drive.',
    ],
    meta: meta('Kyrou, K., A. M. Hammond, R. Galizi, et al. “A CRISPR–Cas9 gene drive targeting doublesex causes complete population suppression in caged Anopheles gambiae mosquitoes.” Nature Biotechnology 36 (2018): 1062–1066.', 'https://doi.org/10.1038/nbt.4245', '100 percent prevalence within 7 to 11 generations and total collapse of caged populations are from the abstract; the second sentence is a general caution; the invented coating was replaced.'),
  },
  src('r-tra-n48', 'Alerstam, T. “Flight by night or day? Optimal daily timing of bird migration.” Journal of Theoretical Biology 258 (2009).', 'https://doi.org/10.1016/j.jtbi.2009.01.020', 'night migration in most songbirds and day migration in soaring and aerial-feeding species are the paper’s subject.'),
  {
    id: 'r-tra-n49',
    passage: 'When the World Health Organization launched its intensified campaign to eradicate smallpox in 1967, many experts doubted that a disease that had afflicted humanity for thousands of years could ever be eliminated. Over the following decade, health workers pursued the virus across dozens of countries, persisting through floods, civil wars, famines, and bureaucratic delays. ______ the disease had been driven out of every country where it had once spread naturally, and the World Health Organization formally declared smallpox eradicated in 1980.',
    steps: [
      'The text traces the campaign over time: 1967, then a decade of work.',
      'The last sentence describes the situation at the end of that decade: "By then."',
    ],
    why: [
      'Correct. "By then" points to the end of that decade of work.',
      'The last sentence continues the story of the campaign rather than contrasting with it.',
      'Nothing in the last sentence happens despite the campaign’s efforts.',
      'The last sentence is not a comparison with the campaign’s efforts.',
    ],
    trap: 'Choosing "Even so" because the obstacles were so great.',
    meta: meta('Henderson, D. A. “The eradication of smallpox – An overview of the past, present, and future.” Vaccine 29, suppl. 4 (2011): D7–D9.', 'https://doi.org/10.1016/j.vaccine.2011.06.080', 'the decade-long campaign begun amid skepticism, the floods, civil war, famine and bureaucratic obstacles, and the 1980 declaration follow the abstract; the unnamed subway was replaced.'),
  },
  {
    id: 'r-tra-n50',
    passage: 'Engineers have developed ultra-high-temperature ceramics that remain solid above 3,000 °C, far hotter than the melting points of most metals, because their atoms are held together by exceptionally strong chemical bonds. ______ these ceramics are being developed for the leading edges of hypersonic aircraft and other components that must withstand the intense heat generated at extreme speeds, according to a 2017 review by materials scientists William Fahrenholtz and Greg Hilmas.',
    steps: [
      'Sentence 1: the ceramics withstand extreme heat.',
      'Sentence 2: they are being developed for parts that face extreme heat. The first explains the second.',
    ],
    why: [
      'Correct. Heat resistance is the reason for the use.',
      'The use does not happen despite the heat resistance.',
      '"Instead" signals a replacement, but nothing is being replaced; the use in hypersonic aircraft follows from the heat resistance just described.',
      '"By contrast" signals opposing ideas, but the second sentence is a consequence of the first: heat-resistant ceramics are used where heat is extreme.',
    ],
    meta: meta('Fahrenholtz, W. G., and G. E. Hilmas. “Ultra-high temperature ceramics: Materials for extreme environment applications.” Scripta Materialia 129 (2017): 94–99.', 'https://doi.org/10.1016/j.scriptamat.2016.10.018', 'melting points above 3,000 °C, strong bonding and hypersonic leading-edge applications are the review’s subject; the earlier claim that they already shield reentering spacecraft was corrected.'),
  },
  {
    id: 'r-tra-n51',
    passage: 'Retailers confronted with a new tax on sugary beverages could, in principle, absorb the cost themselves by keeping shelf prices unchanged, which would leave consumers with little incentive to purchase fewer of the drinks. ______ when Mexico introduced such a tax in 2014, a study led by M. Arantxa Colchero found that the tax was passed along to consumers in the form of higher prices, and that prices of carbonated beverages increased by even more than the tax itself.',
    steps: [
      'Sentence 1: a possibility (sellers absorb the tax; prices stay the same).',
      'Sentence 2: what actually happened (prices rose). "In reality" contrasts possibility and outcome.',
    ],
    why: [
      'The price increase was not caused by the possibility described in the first sentence.',
      'The second sentence contradicts the first rather than adding to it.',
      'The second sentence does not give details of the possibility; it shows what actually happened.',
      'Correct. "In reality" sets the actual result against the possibility.',
    ],
    remember: 'Possibility or prediction vs result → "In reality."',
    meta: meta('Colchero, M. A., J. C. Salgado, M. Unar-Munguía, M. Molina, S. Ng, and J. A. Rivera-Dommarco. “Changes in prices after an excise tax to sweetened sugar beverages was implemented in Mexico: evidence from urban areas.” PLOS ONE 10, no. 12 (2015): e0144408.', 'https://doi.org/10.1371/journal.pone.0144408', 'full pass-through for sugary drinks and overshifting for carbonated ones are from the abstract; the unsourced claim about economists’ predictions was replaced.'),
  },
];
