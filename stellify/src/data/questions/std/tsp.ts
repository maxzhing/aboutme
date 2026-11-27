/**
 * Text Structure and Purpose (tsp), brought to the Stellify question standard as patches on the original questions
 * (same ids, stems and teaching notes). Questions whose passages already reported real work keep their passages,
 * with any inaccuracy corrected; those built on invented researchers were rebuilt around real studies, and the
 * literary passages are now exact excerpts from public-domain works (checked by tests/sources.test.ts).
 */
import type { RawQuestion } from '@/lib/types';
import type { TrapCode } from '../distractors';

const CHECKED = '2026-11-27';
const BIAS = 'AI bias and clarity pass (Stellify): the passage supplies all needed context, no outside knowledge or cultural, regional or income assumptions are required, and the wording is plain with no double negatives.';
type Patch = Partial<RawQuestion> & { id: string; tags?: (TrapCode | null)[] };
const meta = (cite: string, url: string, teacher: string) => ({
  source: { cite, url, checked: CHECKED },
  review: { teacher: `AI teacher pass (Stellify): ${teacher}`, bias: BIAS, date: CHECKED },
});
const WS = {
  magi: 'https://en.wikisource.org/wiki/The_Four_Million/The_Gift_of_the_Magi',
  gatsby: 'https://en.wikisource.org/wiki/The_Great_Gatsby_(1925)/Chapter_1',
  hour: 'https://en.wikisource.org/wiki/The_Story_of_an_Hour',
  frome: 'https://en.wikisource.org/wiki/Ethan_Frome_(Scribners_1911)/Chapter_1',
  sympathy: 'https://en.wikisource.org/wiki/Caroling_Dusk/Sympathy',
};

export const TSP_STD: Patch[] = [
  {
    id: 'r-tsp-01',
    choices: [
      'To argue that all coastal development should be prohibited near the seagrass meadows that remain',
      'To explain why seagrass meadows are valuable and to note that they are under threat',
      'To compare seagrass with the many other kinds of plants that grow in the ocean',
      'To describe how scientists measure the amount of carbon that is stored in marine sediments',
    ],
    meta: meta('Fourqurean, J. W., et al. “Seagrass ecosystems as a globally significant carbon stock.” Nature Geoscience 5 (2012): 505–509; Waycott, M., et al. “Accelerating loss of seagrasses across the globe threatens coastal ecosystems.” Proceedings of the National Academy of Sciences 106, no. 30 (2009): 12377–12381.', 'https://doi.org/10.1038/ngeo1477', 'the small area, large carbon share, nursery and wave roles, and decline from coastal development and poor water quality follow the two papers.'),
  },
  {
    id: 'r-tsp-02',
    passage: 'The following text is from O. Henry’s 1905 short story “The Gift of the Magi.” Della has sold her long hair to buy her husband, Jim, a Christmas present, and Jim has just come home and seen her.\n\nJim stopped inside the door, as immovable as a setter at the scent of quail. His eyes were fixed upon Della, and there was an expression in them that she could not read, and it terrified her. __It was not anger, nor surprise, nor disapproval, nor horror, nor any of the sentiments that she had been prepared for.__ He simply stared at her fixedly with that peculiar expression on his face.',
    choices: [
      'It emphasizes that Jim’s reaction is unlike the responses that Della had expected.',
      'It explains why Della decided to sell her hair before Christmas.',
      'It reveals that Jim is angry with Della for selling her hair.',
      'It describes the room where Jim and Della are standing.',
    ],
    tags: [null, 'beyond', 'reversed', 'detail'],
    why: [
      'Correct. The sentence lists the reactions Della had prepared for and says Jim showed none of them, deepening the mystery.',
      'The sentence is about Jim’s expression, not about Della’s reasons for selling her hair.',
      'The sentence says his expression “was not anger,” so it rules anger out.',
      'The sentence describes Jim’s expression, not the room around them.',
    ],
    steps: ['The sentence before says Della could not read Jim’s expression.', 'The underlined sentence rules out every reaction she had expected.', 'So it stresses how unexpected his reaction is: choice A.'],
    meta: meta('O. Henry. “The Gift of the Magi.” The Four Million. 1906 (first published 1905).', WS.magi, 'excerpt copied exactly; the context line states facts given earlier in the story.'),
  },
  {
    id: 'r-tsp-03',
    passage: 'For decades, a standard account held that the first farmers of southwestern Asia abandoned hunting almost as soon as they began cultivating grain, as though agriculture had been an immediate and decisive revolution. Excavations at Abu Hureyra, an early village beside the Euphrates in Syria, told a considerably more gradual story. Archaeologists Anthony Legge and Peter Rowley-Conwy found that for roughly a thousand years after its inhabitants began cultivating cereals, the meat they ate still came overwhelmingly from wild gazelle, which they hunted in great numbers during the animals’ annual migrations. Farming, it seems, was added to an older way of life long before it replaced it.',
    steps: [
      'Sentence 1 gives “a standard account.” Sentence 2 says the excavations told “a considerably more gradual story.”',
      'Sentence 3 gives the evidence (gazelle hunting continued for about a thousand years), and sentence 4 states the revised view.',
      'Structure: established view, then evidence that revises it: choice C.',
    ],
    meta: meta('Legge, A. J., and P. A. Rowley-Conwy. “Gazelle Killing in Stone Age Syria.” Scientific American 257, no. 2 (1987): 88–95.', 'https://doi.org/10.1038/scientificamerican0887-88', 'the continued dependence on migrating gazelle after the start of cultivation at Abu Hureyra follows the article.'),
  },
  {
    id: 'r-tsp-04',
    passage: 'Octopuses and their relatives can change the color of their skin in a fraction of a second, matching their backgrounds with astonishing precision. __Curiously, their eyes contain only one type of light receptor, which should make them colorblind.__ Alexander Stubbs and Christopher Stubbs propose a resolution: the animals’ unusual U-shaped and dumbbell-shaped pupils, combined with the way a lens focuses different colors at slightly different distances, may allow them to distinguish colors even with a single type of receptor, an explanation that would reconcile the two observations.',
    choices: [
      'It provides experimental evidence that directly supports the proposal the Stubbses offer in the next sentence.',
      'It summarizes the main finding of the Stubbses’ research on the pupils of octopuses and their relatives.',
      'It questions the accuracy of the claim about octopus camouflage made in the first sentence of the text.',
      'It introduces a puzzle that the proposal in the next sentence is meant to address and resolve.',
    ],
    why: [
      'The underlined sentence creates the problem; it is not evidence for the solution, which concerns pupil shape.',
      'The Stubbses’ contribution comes after the underlined sentence, which states a fact that precedes their proposal.',
      'The text does not doubt that these animals change color; it asks how they manage it.',
      'Correct. “Curiously” flags something puzzling, and “propose a resolution” shows that the next sentence responds to it.',
    ],
    steps: [
      'Sentence 1: the animals match colors expertly. Underlined sentence: yet their eyes should make them colorblind.',
      'The next sentence calls the Stubbses’ idea “a resolution,” meaning it answers that contradiction.',
      'So the underlined sentence introduces the puzzle the proposal addresses: choice D.',
    ],
    meta: meta('Stubbs, A. L., and C. W. Stubbs. “Spectral discrimination in color blind animals via chromatic aberration and pupil shape.” Proceedings of the National Academy of Sciences 113, no. 29 (2016): 8206–8211.', 'https://pubmed.ncbi.nlm.nih.gov/27382180/', 'the single photoreceptor type and the pupil-shape and chromatic-aberration proposal follow the abstract.'),
  },
  {
    id: 'r-tsp-05',
    passage: 'The following text is from Matthew Arnold’s poem “Dover Beach,” published in 1867. The speaker, listening at night to waves dragging pebbles back from the shore, has been reflecting on the sound.\n\nThe sea of faith\nWas once, too, at the full, and round earth’s shore\nLay like the folds of a bright girdle furled.\nBut now I only hear\nIts melancholy, long, withdrawing roar,\nRetreating, to the breath\nOf the night-wind, down the vast edges drear\nAnd naked shingles of the world.',
    choices: [
      'To describe in precise detail the appearance of the English coastline as the tide goes out at night',
      'To explain how the speaker first came to notice the sound of the waves on the beach below',
      'To use the image of a retreating tide to convey a sense that religious faith has been withdrawing from the world',
      'To criticize the people who once held religious beliefs for having abandoned them so quickly',
    ],
    tags: ['literal', 'beyond', null, 'beyond'],
    why: [
      'The tide is a metaphor for “the sea of faith”; the lines are not a literal description of the coast.',
      'The context line says the speaker has already been listening; the lines say nothing about how he first noticed the sound.',
      'Correct. Faith, once “at the full,” is now heard only as a “melancholy, long, withdrawing roar.”',
      'The speaker mourns the loss of faith but does not blame anyone for it.',
    ],
    steps: ['The lines speak of “the sea of faith,” once “at the full.”', 'Now the speaker hears only its “withdrawing roar.”', 'The ebbing tide stands for fading faith: choice C.'],
    meta: meta('Arnold, Matthew. “Dover Beach.” New Poems. London: Macmillan, 1867.', 'https://en.wikisource.org/wiki/The_poetical_works_of_Matthew_Arnold/Dover_Beach', 'eight lines copied exactly; the context line summarizes the opening stanzas.'),
  },

  {
    id: 'r-tsp-06',
    passage: 'In the 1920s, a sociologist’s survey method was straightforward: knock on doors and ask residents questions, recording their answers by hand in notebooks. Today’s researchers can analyze millions of social media posts in an afternoon, using software that identifies patterns no individual could detect. Yet computer scientists Derek Ruths and Jürgen Pfeffer warn against assuming that more data necessarily means better answers. People who use a given platform, they observe, differ systematically from those who do not, and what users post is shaped by the platform’s own design, including the features it uses to encourage and reward attention.',
    choices: [
      'To present researchers’ caution about a significant limitation of a modern research method',
      'To trace the historical development of survey methods in sociology from the 1920s to today',
      'To argue that door-to-door surveys produce more accurate results than analyses of online data',
      'To explain how social media companies collect and analyze information about the people who use them',
    ],
    why: [
      'Correct. Everything after “Yet” is Ruths and Pfeffer’s warning and its justification.',
      'The 1920s method is a brief point of contrast, not a history of survey methods.',
      'The researchers say more data is not automatically better; the text never claims the old method is more accurate.',
      'The text is about how researchers use posts, not how companies gather data.',
    ],
    steps: [
      'The first two sentences contrast old and new methods only to set up the main point.',
      '“Yet” introduces the researchers’ warning, and the last sentence gives their reasons: platform users are unrepresentative, and platform design shapes posts.',
      'The purpose is to present their caution about social media data: choice A.',
    ],
    meta: meta('Ruths, D., and J. Pfeffer. “Social media for large studies of behavior.” Science 346, no. 6213 (2014): 1063–1064.', 'https://pubmed.ncbi.nlm.nih.gov/25430759/', 'the warnings about population bias and platform design are the article’s main points.'),
  },
  {
    id: 'r-tsp-07',
    passage: 'The following text is from F. Scott Fitzgerald’s 1925 novel The Great Gatsby. The narrator, Nick Carraway, is visiting his cousin Daisy, who has just greeted him.\n\nShe laughed again, as if she said something very witty, and held my hand for a moment, looking up into my face, promising that there was no one in the world she so much wanted to see. __That was a way she had.__ She hinted in a murmur that the surname of the balancing girl was Baker. (I’ve heard it said that Daisy’s murmur was only to make people lean toward her; an irrelevant criticism that made it no less charming.)',
    choices: [
      'It explains why Daisy laughs at the narrator’s remarks, which she considers especially witty and clever.',
      'It introduces a character who will become important in the scenes that follow in the novel’s story.',
      'It suggests that Daisy rarely shows warmth toward anyone other than the cousin she is greeting.',
      'It indicates that Daisy’s flattering attention is a characteristic habit rather than a response singling out the narrator.',
    ],
    tags: ['reversed', 'detail', 'reversed', null],
    why: [
      'Daisy laughs “as if she said something very witty”; the wit is hers, not the narrator’s.',
      'The sentence concerns Daisy’s manner; Miss Baker is introduced in the next sentence.',
      'Calling it “a way she had” implies she behaves like this generally, the opposite of rare warmth.',
      'Correct. “A way she had” turns her intense welcome into a habit, so it is not special to the narrator.',
    ],
    steps: ['Daisy promises that no one in the world is more welcome.', '“That was a way she had” calls this a habit.', 'So her warmth is habitual, not personal: choice D.'],
    meta: meta('Fitzgerald, F. Scott. The Great Gatsby, chapter 1. 1925.', WS.gatsby, 'excerpt copied exactly; the work entered the US public domain in 2021.'),
  },
  {
    id: 'r-tsp-08',
    passage: 'It is tempting to interpret the peacock’s tail as a straightforward advertisement of quality: only a vigorous male, the reasoning goes, could afford such an extravagant ornament. Studying a captive population in England, biologist Marion Petrie found that peahens preferred males whose trains bore more eyespots and that the offspring of such males grew and survived better. But in a seven-year study of a free-ranging population in Japan, Mariko Takahashi and colleagues found no evidence that peahens preferred males with more elaborate trains. If the tail is a signal, what it communicates to prospective mates remains an open and surprisingly persistent question.',
    why: [
      '“Conclusively disproves” is too strong: one study found support and another did not, so the question remains open.',
      'Correct. The text gives an appealing reading, a study supporting it, and a study that did not, so the reading is unconfirmed.',
      'Only peafowl are discussed; no other bird species appears, so the text cannot be contrasting two species.',
      'The text ends by saying the question is open; it does not take a side.',
    ],
    steps: [
      'Sentence 1: an appealing interpretation (“It is tempting to interpret …”). Sentence 2: support from Petrie’s study.',
      'Sentence 3: a study that found no preference. Sentence 4: the question stays open.',
      'Interpretation, partial support, reason it is unconfirmed: choice B.',
    ],
    meta: meta('Petrie, M. “Improved growth and survival of offspring of peacocks with more elaborate trains.” Nature 371 (1994): 598–599; Takahashi, M., H. Arita, M. Hiraiwa-Hasegawa, and T. Hasegawa. “Peahens do not prefer peacocks with more elaborate trains.” Animal Behaviour 75, no. 4 (2008): 1209–1219.', 'https://doi.org/10.1016/j.anbehav.2007.10.004', 'the passage now reports both studies accurately; the earlier version misstated the offspring findings.'),
  },
  {
    id: 'r-tsp-09',
    passage: 'Calls to replace lectures with “active learning” rest on substantial evidence: a meta-analysis of 225 studies by biologist Scott Freeman and colleagues found that students in undergraduate science courses built around active learning outperformed, on average, those in traditional lectures. __But averages can conceal as much as they reveal.__ A later analysis led by Elli Theobald found that active learning raised the performance of students from underrepresented groups and from low-income backgrounds more than that of other students, narrowing achievement gaps. The case for active learning, then, may be strongest precisely where it is least often made: as a tool for making courses more equitable.',
    why: [
      'The text calls the evidence “substantial” and goes on to refine it; it does not reject it.',
      'No term is defined; the sentence makes a general observation about averages.',
      'The sentence is about statistics, not about a classroom technique.',
      'Correct. It moves the passage from the overall result to a closer look at who benefits most.',
    ],
    steps: [
      'The first sentence reports a general result based on an average. The underlined sentence warns that averages can hide things.',
      'The next sentence shows what the average hid: larger gains for underrepresented and low-income students.',
      'So the underlined sentence signals a complication of the general finding: choice D.',
    ],
    meta: meta('Freeman, S., et al. “Active learning increases student performance in science, engineering, and mathematics.” Proceedings of the National Academy of Sciences 111, no. 23 (2014): 8410–8415; Theobald, E. J., et al. “Active learning narrows achievement gaps for underrepresented students in undergraduate science, technology, engineering, and math.” Proceedings of the National Academy of Sciences 117, no. 12 (2020): 6476–6483.', 'https://pubmed.ncbi.nlm.nih.gov/32152114/', 'the 225-study meta-analysis and the narrowing of gaps for underrepresented and low-income students follow the two papers.'),
  },
  {
    id: 'r-tsp-10',
    passage: 'The following text is from F. Scott Fitzgerald’s 1925 novel The Great Gatsby. The narrator, Nick Carraway, is describing his family background.\n\nMy family have been prominent, well-to-do people in this Middle Western city for three generations. The Carraways are something of a clan, and we have a tradition that we’re descended from the Dukes of Buccleuch, but the actual founder of my line was my grandfather’s brother, who came here in fifty-one, sent a substitute to the Civil War, and started the wholesale hardware business that my father carries on to-day.',
    choices: [
      'To convey, with gentle irony, the gap between the family’s lofty tradition about its origins and its more ordinary actual beginnings',
      'To criticize the narrator’s father for continuing a business that the family considers unworthy of its position',
      'To explain how the narrator first learned the true history of his family from documents kept by his grandfather',
      'To argue that the family’s wealth was acquired dishonestly by an ancestor who avoided serving in the Civil War',
    ],
    tags: [null, 'beyond', 'beyond', 'beyond'],
    why: [
      'Correct. A claimed descent from dukes is set against a great-uncle who started a hardware business, a contrast the narrator states wryly.',
      'The father simply “carries on” the business; the text expresses no criticism of him.',
      'The text gives the family history but never says how or from what documents the narrator learned it.',
      'Sending a substitute is mentioned, but nothing in the text says the family’s wealth was gained dishonestly.',
    ],
    steps: ['The family has “a tradition” of descent from dukes.', '“But the actual founder” started a hardware business.', 'The contrast is gently ironic: choice A.'],
    meta: meta('Fitzgerald, F. Scott. The Great Gatsby, chapter 1. 1925.', WS.gatsby, 'excerpt copied exactly; the work entered the US public domain in 2021.'),
  },
  {
    id: 'r-tsp-11',
    passage: 'Andrew Carnegie, who financed more than 1,600 public library buildings in the United States between 1886 and 1919, characterized the free public library as an institution accessible to everyone who aspired to improve himself through reading. __In numerous Southern communities, however, the libraries that his donations helped construct admitted exclusively white patrons.__ Historian Cheryl Knott argues that such exclusions, sometimes followed by separate and inadequately funded branches for Black readers, reveal the considerable distance between the democratic rhetoric of the library movement and the institutions it actually established.',
    choices: [
      'It explains why Carnegie decided to fund public library buildings in cities and towns across the country.',
      'It states the conclusion that Knott draws from her research on public libraries in the South.',
      'It provides a specific detail that contrasts with the ideal expressed in the previous sentence.',
      'It offers evidence that the libraries were popular with many different residents of the towns.',
    ],
    why: [
      'The sentence describes whom the libraries admitted, not Carnegie’s reasons for funding them.',
      'Knott’s conclusion is in the final sentence; the underlined sentence is the fact she interprets.',
      'Correct. Whites-only admission is a specific practice that conflicts with the ideal of a library open to everyone.',
      'Nothing in the sentence concerns how popular the libraries were.',
    ],
    steps: [
      'Sentence 1 gives the ideal: a library open to everyone.',
      'The underlined sentence, with “however,” reports that many Southern libraries admitted only white patrons.',
      'It is a concrete detail set against the stated ideal, which Knott then interprets: choice C.',
    ],
    meta: meta('Knott, C. Not Free, Not for All: Public Libraries in the Age of Jim Crow. Amherst: University of Massachusetts Press, 2015.', 'https://doi.org/10.2307/j.ctt1hd1917', 'Carnegie’s library philanthropy, segregated Southern libraries and separate branches for Black readers are the subject of the book; the earlier version used an invented historian.'),
  },
  {
    id: 'r-tsp-12',
    passage: 'The following text is from F. Scott Fitzgerald’s 1925 novel The Great Gatsby. The narrator, Nick Carraway, is listening to his cousin Daisy.\n\nI looked back at my cousin, who began to ask me questions in her low, thrilling voice. It was the kind of voice that the ear follows up and down, __as if each speech is an arrangement of notes that will never be played again__.',
    choices: [
      'It suggests that Daisy is a trained singer who often performs for the guests who visit her home in the evenings.',
      'It suggests that Daisy’s voice captivates listeners partly because each thing she says seems fleeting and unrepeatable.',
      'It indicates that the narrator has difficulty hearing his cousin because she speaks so quietly to him.',
      'It reveals that Daisy rarely speaks, preferring to listen in silence while other people carry on the conversation.',
    ],
    tags: ['literal', null, 'beyond', 'reversed'],
    why: [
      'The comparison to music describes how her speech sounds; nothing says she sings or performs.',
      'Correct. Comparing each speech to notes “that will never be played again” makes her voice feel precious and fleeting.',
      'Her voice is “low,” but the ear “follows” it easily; nothing suggests trouble hearing her.',
      'She “began to ask me questions,” so she is speaking, not silent.',
    ],
    steps: ['The ear “follows” Daisy’s voice up and down.', 'Each speech is like music “that will never be played again.”', 'So her voice fascinates because it seems unrepeatable: choice B.'],
    meta: meta('Fitzgerald, F. Scott. The Great Gatsby, chapter 1. 1925.', WS.gatsby, 'the first two sentences of the paragraph, copied exactly.'),
  },
  {
    id: 'r-tsp-13',
    passage: 'To learn whether city-dwelling birds cope differently with stress than their forest relatives, ornithologists Jesko Partecke, Ingrid Schwabl, and Eberhard Gwinner compared European blackbirds from the city of Munich with blackbirds from a nearby forest. They first confirmed that the two populations differed in their hormonal responses to a standard stressful handling procedure. They then hand-raised nestlings from both populations under identical conditions; as adults, the city-born birds still showed a weaker stress response than the forest-born birds. The difference, they concluded, appears to be at least partly inherited rather than simply learned from repeated exposure to city life.',
    why: [
      'The text reports no objections from other researchers; it ends with the researchers’ own conclusion.',
      'All the work described was done by one team studying one species, not two researchers comparing methods.',
      'The method worked: the hand-raised birds still differed, which supported the researchers’ conclusion.',
      'Correct. The text asks a question, describes a comparison and a hand-rearing experiment, and states the conclusion.',
    ],
    meta: meta('Partecke, J., I. Schwabl, and E. Gwinner. “Stress and the city: urbanization and its effects on the stress physiology in European blackbirds.” Ecology 87, no. 8 (2006): 1945–1952.', 'https://doi.org/10.1890/0012-9658(2006)87[1945:SATCUA]2.0.CO;2', 'urban and forest blackbirds hand-raised under identical conditions and the persistence of the reduced stress response are as published; the earlier version used an invented researcher.'),
  },
  {
    id: 'r-x-tsp-01',
    meta: meta('Eisenstein, E. L. The Printing Press as an Agent of Change: Communications and Cultural Transformations in Early-Modern Europe. Cambridge: Cambridge University Press, 1979.', 'https://doi.org/10.1017/cbo9781107049963', 'the argument that print’s first effect was the standardization and preservation of texts is Eisenstein’s; the passage states it as an argument, not as settled fact.'),
  },
  {
    id: 'r-x-tsp-02',
    passage: 'The notion that bilingual children enjoy a general cognitive advantage was greeted with enthusiasm when early studies reported it, and psychologists Angela de Bruin, Barbara Treccani, and Sergio Della Sala later found that studies supporting the advantage had been considerably more likely to be published than studies that did not. Larger subsequent studies have frequently failed to reproduce the effect. Some researchers conclude that the advantage was an artifact of small samples; others maintain that it is real but appears only under particular conditions, such as when both languages are used every day. What the dispute has made plain is that “bilingualism” names too many different experiences to be treated as a single variable.',
    meta: meta('de Bruin, A., B. Treccani, and S. Della Sala. “Cognitive advantage in bilingualism: an example of publication bias?” Psychological Science 26, no. 1 (2015): 99–107.', 'https://pubmed.ncbi.nlm.nih.gov/25475825/', 'the publication-bias finding follows the abstract; the passage now attributes it rather than asserting researchers’ motives.'),
  },
  {
    id: 'r-cb-tsp-01',
    passage: 'Wondering how night-migrating songbirds choose their heading, biologists William Cochran, Henrik Mouritsen, and Martin Wikelski exposed Catharus thrushes to an artificially rotated magnetic field during the twilight period before takeoff and then followed them by radio for up to 1,100 kilometers. Instead of heading north, the experimental birds flew westward, and on subsequent nights they resumed a northward course. __The pattern resembled that of a navigator who checks a ship’s compass against the setting sun each evening and then steers by the compass through the night__, suggesting to the team that the birds recalibrate a magnetic compass daily using twilight cues.',
    choices: [
      'It offers a parallel case that lends support to the interpretation that the team ultimately reached.',
      'It presents an unexpected result that conflicts with the team’s initial assumption about navigation.',
      'It describes the method that the team used to fit the thrushes with transmitters and track them.',
      'It notes a practical application of the team’s finding for ships that navigate during the night.',
    ],
    why: [
      'Correct. The navigator is a parallel case, and the match with the birds backs up the team’s interpretation.',
      'The team began with a question (“wondering how”), not an assumption that the result overturns.',
      'The tracking method is described in the first sentence; the underlined part compares and interprets a result.',
      'Nothing about using the finding in practice is mentioned; the navigator is a comparison, not an application.',
    ],
    steps: [
      'Read what follows the underlined part: “suggesting to the team that the birds recalibrate a magnetic compass daily.”',
      'The underlined part compares the birds to a navigator who checks a compass against the sunset and then steers by it.',
      'That comparable case makes the interpretation more convincing: choice A.',
    ],
    meta: meta('Cochran, W. W., H. Mouritsen, and M. Wikelski. “Migrating songbirds recalibrate their magnetic compass daily from twilight cues.” Science 304 (2004): 405–408.', 'https://pubmed.ncbi.nlm.nih.gov/15087541/', 'the rotated field at twilight, westward flight, later northward flight and the daily recalibration follow the abstract; the ship comparison is the passage’s own analogy.'),
  },
  {
    id: 'r-c-tsp-01',
    passage: 'When the Pruitt-Igoe public housing project in St. Louis was demolished in the 1970s, less than two decades after it opened, many critics treated its failure as conclusive proof that modernist architecture, with its isolated high-rise slabs, was itself to blame. Architectural historian Katharine Bristol is not persuaded by that explanation. She acknowledges that the design had genuine shortcomings, but she argues that the project was undermined principally by declining public funding for maintenance, a shrinking tenant population, and housing policies that concentrated poverty, factors that the architectural explanation conveniently leaves out.',
    choices: [
      'It presents a common explanation for a project’s failure, then describes a scholar’s view that partly accepts it while stressing causes it overlooks.',
      'It describes the history of a building, then explains why critics have recently begun to praise its design.',
      'It compares two buildings in the same city and argues that one of them was better designed than the other.',
      'It presents a scholar’s argument about a building, then offers evidence that undermines that argument.',
    ],
    tags: [null, 'reversed', 'beyond', 'reversed'],
    why: [
      'Correct. The critics blame the design; Bristol grants some flaws but stresses funding, tenancy and policy.',
      'The text says the project failed and was demolished; it describes no recent praise.',
      'The text discusses one housing project, not a comparison of two buildings.',
      'The text presents Bristol’s argument favorably and offers nothing that undermines it.',
    ],
    steps: ['Critics blamed modernist design.', 'Bristol grants design flaws but points to funding, tenancy and policy.', 'Criticism, then a partial concession with overlooked causes: choice A.'],
    meta: meta('Bristol, K. G. “The Pruitt-Igoe Myth.” Journal of Architectural Education 44, no. 3 (1991): 163–171.', 'https://doi.org/10.1080/10464883.1991.11102687', 'the architectural blame and Bristol’s emphasis on funding, tenancy and policy follow the article; the earlier version used an invented scholar.'),
  },
  {
    id: 'r-c-tsp-02',
    meta: meta('Clarke, D., H. Whitney, G. Sutton, and D. Robert. “Detection and learning of floral electric fields by bumblebees.” Science 340 (2013): 66–69.', 'https://pubmed.ncbi.nlm.nih.gov/23429701/', 'discrimination of charged artificial flowers and the change in floral charge after a bee’s visit follow the abstract.'),
  },
  {
    id: 'r-s-tsp-01',
    meta: meta('Jönsson, K. I., et al. “Tardigrades survive exposure to space in low Earth orbit.” Current Biology 18, no. 17 (2008): R729–R731.', 'https://pubmed.ncbi.nlm.nih.gov/18786368/', 'the tun state and survival of cold, radiation and the 2007 exposure to space are documented.'),
  },
  {
    id: 'r-s-tsp-02',
    passage: 'Art critics have often described Jackson Pollock’s drip paintings as spontaneous and chaotic, the record of paint flung at a canvas with little control over where it landed. __Yet physicist Richard Taylor and colleagues, analyzing the paintings mathematically, found that their tangled patterns are fractal, repeating similar structures at many scales, and that the patterns grew more intricate over the course of Pollock’s career.__ Such findings suggest that the appearance of chaos in his work was, at least in part, the product of a deliberately refined technique.',
    choices: [
      'It presents evidence that complicates the common description of how Pollock created his drip paintings.',
      'It explains why mathematical analysis has become increasingly popular among professional art historians.',
      'It offers an example that supports the claim that Pollock’s paintings were made with little control.',
      'It introduces a painting technique that Pollock invented and that other painters later imitated.',
    ],
    why: [
      'Correct. “Yet” signals a challenge, and the fractal analysis complicates the picture of uncontrolled painting.',
      'The sentence uses mathematical analysis; it does not explain why such analysis is popular.',
      'This reverses the sentence’s role: refined, repeating patterns undercut the idea of little control.',
      'Nothing suggests that other painters copied Pollock’s technique; this goes beyond the text.',
    ],
    steps: [
      'Sentence 1: the common view is spontaneous, chaotic painting.',
      'The underlined sentence (“Yet …”) reports patterns that repeat across scales and grew more intricate over time.',
      'The last sentence draws the conclusion, so the underlined sentence supplies evidence against the common view: choice A.',
    ],
    meta: meta('Taylor, R. P., A. P. Micolich, and D. Jonas. “Fractal analysis of Pollock’s drip paintings.” Nature 399 (1999): 422.', 'https://doi.org/10.1038/20833', 'the fractal patterns and their development over Pollock’s career are as reported; the earlier version made unsupported claims about x-rays of Monet.'),
  },
  {
    id: 'r-s-tsp-03',
    meta: meta('Corliss, J. B., et al. “Submarine thermal springs on the Galápagos Rift.” Science 203 (1979): 1073–1083.', 'https://pubmed.ncbi.nlm.nih.gov/17776033/', 'the 1977 Alvin dives and the vent communities supported by chemosynthetic bacteria are as reported.'),
  },
  {
    id: 'r-s-tsp-04',
    passage: 'The following text is from Kate Chopin’s 1894 short story “The Story of an Hour.” Louise Mallard has just been told that her husband has died, and she is sitting alone in her room.\n\nShe was young, with a fair, calm face, whose lines bespoke repression and even a certain strength. But now there was a dull stare in her eyes, whose gaze was fixed away off yonder on one of those patches of blue sky. __It was not a glance of reflection, but rather indicated a suspension of intelligent thought.__\n\nThere was something coming to her and she was waiting for it, fearfully. What was it? She did not know; it was too subtle and elusive to name. But she felt it, creeping out of the sky, reaching toward her through the sounds, the scents, the color that filled the air.',
    choices: [
      'It shows that Louise, overwhelmed by grief, has fallen asleep in her chair and stopped noticing her surroundings.',
      'It suggests that Louise is not yet reasoning about her situation, preparing for a feeling she is not yet able to name.',
      'It explains that Louise is carefully reflecting on what her husband’s death will mean for her future.',
      'It indicates that Louise has decided to leave her room and tell her family what she has realized.',
    ],
    tags: ['beyond', null, 'reversed', 'beyond'],
    why: [
      'She has a “dull stare” and is “waiting,” which shows she is awake, not asleep.',
      'Correct. Her thought is suspended, and the next paragraph shows a feeling approaching that she cannot “name.”',
      'The sentence says it “was not a glance of reflection,” so she is not reflecting carefully.',
      'Nothing in the excerpt describes her leaving the room or speaking to anyone.',
    ],
    steps: ['Louise’s stare is “not a glance of reflection.”', 'Next, “something” approaches that she cannot name.', 'So the sentence sets up a feeling arriving before thought: choice B.'],
    meta: meta('Chopin, Kate. “The Story of an Hour.” Vogue, 19 April 1894 (as “The Dream of an Hour”).', WS.hour, 'two consecutive paragraphs copied exactly; the context line states facts given earlier in the story.'),
  },
  {
    id: 'r-s-tsp-05',
    passage: 'A popular story holds that the ancient Library of Alexandria met its end in 642, when the conquering Arab general ‘Amr ibn al-‘As was supposedly ordered by the caliph Umar to incinerate its manuscripts. In a scholarly volume examining the library’s fate, historian Bernard Lewis traced that story to chroniclers writing more than five centuries after the events it describes and discovered no mention of it in earlier sources. Lewis concluded that the tale is a subsequent invention; by the seventh century, other contributors to the volume observe, the great library had probably disappeared long before through earlier conflagrations, warfare, and institutional neglect.',
    choices: [
      'To explain how the Library of Alexandria acquired its large collection of ancient texts over many centuries',
      'To argue that the Library of Alexandria never suffered serious damage from fire at any point in its history',
      'To describe the daily work of the scholars who studied and copied texts at the Library of Alexandria',
      'To present a historian’s view that a popular account of the library’s destruction is a later invention',
    ],
    tags: ['beyond', 'qualifier', 'beyond', null],
    why: [
      'The text concerns how the library ended, not how it acquired its books.',
      'The text mentions earlier fires as a likely cause of the library’s disappearance.',
      'The text says nothing about the scholars’ daily work.',
      'Correct. Lewis traces the story to much later writers and calls it a myth.',
    ],
    steps: ['A popular story blames a single burning in 642.', 'Lewis finds the story only in much later sources.', 'He calls it a myth: choice D.'],
    meta: meta('Lewis, B. “The Arab Destruction of the Library of Alexandria: Anatomy of a Myth.” In What Happened to the Ancient Library of Alexandria?, edited by M. El-Abbadi and O. M. Fathallah, 213–217. Leiden: Brill, 2008.', 'https://doi.org/10.1163/ej.9789004165458.i-259.50', 'Lewis’s tracing of the 642 story to much later sources is the subject of his chapter; the earlier version used an invented historian.'),
  },
  {
    id: 'r-tsp-n1',
    passage: 'In the 1930s, engineers confident in new methods of calculation built suspension bridges with increasingly slender, flexible decks. The collapse of the Tacoma Narrows Bridge in Washington State in 1940 changed that view: in a steady wind, the bridge’s thin deck began twisting back and forth until it tore apart. Engineers later explained the failure as aerodynamic flutter, in which the wind and the twisting deck reinforce each other. Since then, designers have tested deck shapes in wind tunnels and built decks that are stiffer and shaped to let wind pass smoothly around them.',
    why: [
      'The text never blames the engineers; it describes how the collapse changed thinking.',
      'Correct. Assumption, challenge, explanation and response, in that order.',
      'The text says that later decks were made stiffer, the opposite of stiff decks being dismissed, and it compares no two designs.',
      'No list of surviving bridges appears in the text.',
    ],
    steps: [
      'Sentence 1: an older confidence in slender, flexible decks. Sentence 2: an event that challenged it (the collapse).',
      'Sentences 3 and 4: the explanation and how designs changed afterward.',
      'Only choice B gives those parts in that order.',
    ],
    meta: meta('Billah, K. Y., and R. H. Scanlan. “Resonance, Tacoma Narrows bridge failure, and undergraduate physics textbooks.” American Journal of Physics 59, no. 2 (1991): 118–124.', 'https://doi.org/10.1119/1.16590', 'the 1940 collapse and the engineers’ flutter explanation follow the article; the earlier version reversed the history of deck stiffness.'),
  },
  {
    id: 'r-tsp-n2',
    meta: meta('Leavitt, H. S., and E. C. Pickering. “Periods of 25 Variable Stars in the Small Magellanic Cloud.” Harvard College Observatory Circular 173 (1912); reprinted in A Source Book in Astronomy and Astrophysics, 1900–1975 (Harvard University Press, 1979).', 'https://doi.org/10.4159/harvard.9780674366688.c63', 'the link between brightness and period in Cepheid variables and its use for distance are as Leavitt reported.'),
  },
  {
    id: 'r-tsp-n3',
    meta: meta('Petit, J. R., et al. “Climate and atmospheric history of the past 420,000 years from the Vostok ice core, Antarctica.” Nature 399 (1999): 429–436.', 'https://doi.org/10.1038/20859', 'trapped air bubbles and the carbon dioxide record over hundreds of thousands of years follow the paper.'),
  },
  {
    id: 'r-tsp-n4',
    passage: 'It is frequently asserted that consumers purchase less of a product when its price rises and more when it falls. Economists Robert Jensen and Nolan Miller identify an exception: when they subsidized the price of rice for impoverished households in China’s Hunan province, many households purchased less rice, not more, because the savings allowed them to buy more of the comparatively expensive foods they preferred. Jensen and Miller emphasize, however, that such behavior depended substantially on the severity of a household’s poverty, appearing among poor households but not among the very poorest or the comparatively prosperous.',
    choices: [
      'To argue that lowering the price of a staple food always reduces how much of it households buy',
      'To explain why most households buy more of a food when its price falls',
      'To compare the views of two economists about how food subsidies should be designed',
      'To describe a case in which a common pattern does not hold and to note the limits of that case',
    ],
    tags: ['qualifier', 'off-target', 'beyond', null],
    why: [
      '“Always” contradicts the text, which describes an exception limited to certain households.',
      'The text mentions the usual pattern only to set up an exception; it does not explain the pattern.',
      'Only one pair of economists appears, and they report one study; there is no second view to compare.',
      'Correct. It presents an exception to a common pattern and then notes the limits of that exception.',
    ],
    steps: [
      'The text states a common pattern, gives Jensen and Miller’s exception, then limits it to certain households.',
      'Its purpose covers both moves: an exception to a pattern, and its limits: choice D.',
    ],
    meta: meta('Jensen, R. T., and N. H. Miller. “Giffen Behavior and Subsistence Consumption.” American Economic Review 98, no. 4 (2008): 1553–1577.', 'https://pubmed.ncbi.nlm.nih.gov/21031158/', 'the rice subsidy in Hunan and the dependence on the severity of poverty follow the abstract; the earlier version used an invented economist.'),
  },
  {
    id: 'r-tsp-n5',
    passage: 'Psychologists Pam Mueller and Daniel Oppenheimer compared students who took notes on laptops with students who took notes by hand during identical lectures. __They proposed that because handwriting is comparatively slow, students cannot transcribe every word and must instead summarize the lecturer’s ideas in their own words.__ Consistent with that explanation, laptop users produced more nearly verbatim notes and performed worse on questions requiring conceptual understanding, even when their laptops were used exclusively for note taking.',
    choices: [
      'It introduces a criticism of handwritten notes that the last sentence of the text then answers.',
      'It describes how the students’ instructors typically reacted when reviewing their notes.',
      'It gives the researchers’ explanation for the difference that the rest of the text describes.',
      'It presents evidence that typed notes are generally more complete and accurate than handwritten notes.',
    ],
    why: [
      'The underlined sentence is not a criticism; it is the researchers’ proposed explanation.',
      'The text never mentions instructors or how they reacted to notes.',
      'Correct. It gives the researchers’ reason for the difference between laptop and handwritten notes.',
      'The text says laptop notes were more nearly verbatim, not more accurate, and that they led to weaker understanding.',
    ],
    steps: [
      'Sentence 1 introduces the comparison. The underlined sentence proposes why handwriting might help.',
      'The last sentence reports results that fit that explanation.',
      'So the underlined sentence gives the researchers’ explanation: choice C.',
    ],
    meta: meta('Mueller, P. A., and D. M. Oppenheimer. “The pen is mightier than the keyboard: advantages of longhand over laptop note taking.” Psychological Science 25, no. 6 (2014): 1159–1168.', 'https://pubmed.ncbi.nlm.nih.gov/24760141/', 'verbatim laptop notes and weaker conceptual performance follow the abstract; the earlier version used an invented novelist.'),
  },
  {
    id: 'r-tsp-n6',
    passage: 'For years, the decline of frog populations in Central America was widely attributed to the destruction and degradation of their forest habitats. Ecologist Karen Lips and colleagues noticed, however, that frogs were also vanishing from protected forests such as those near El Copé, Panama, where the habitat remained intact. They traced the decline to a pathogenic chytrid fungus whose arrival at the site coincided with the rapid disappearance of many amphibian species there.',
    why: [
      'The text recommends no policy, and its evidence undercuts the first explanation rather than supporting it.',
      'The text discusses frogs in general, not two species, and it moves from an accepted explanation to a new one.',
      'The text reports findings; it lists no limitations of a method.',
      'Correct. Accepted explanation (habitat loss), observation that does not fit (losses in protected forests), new explanation (a fungus).',
    ],
    steps: [
      'Sentence 1: the accepted explanation (habitat destruction). Sentence 2: losses even in intact, protected forests.',
      'Sentence 3: a new explanation that fits all the evidence (a chytrid fungus).',
      'So: accepted view, misfit, alternative: choice D.',
    ],
    meta: meta('Lips, K. R., et al. “Emerging infectious disease and the loss of biodiversity in a Neotropical amphibian community.” Proceedings of the National Academy of Sciences 103, no. 9 (2006): 3165–3170.', 'https://pubmed.ncbi.nlm.nih.gov/16481617/', 'the arrival of Batrachochytrium dendrobatidis and the loss of amphibian species at El Copé follow the abstract; the earlier version used an invented ecologist and species.'),
  },
  {
    id: 'r-tsp-n7',
    meta: meta('Fauser, A., and R. Orledge. “Boulanger, (Marie-Juliette Olga) Lili.” Grove Music Online. Oxford University Press, 2001.', 'https://doi.org/10.1093/gmo/9781561592630.article.03704', 'the 1913 Prix de Rome, her ill health and death at twenty-four in 1918, and her choral works, songs and psalm settings are documented.'),
  },
  {
    id: 'r-tsp-n8',
    meta: meta('Schmidt-Nielsen, K., and B. Schmidt-Nielsen. “Water Metabolism of Desert Mammals.” Physiological Reviews 32, no. 2 (1952): 135–166.', 'https://doi.org/10.1152/physrev.1952.32.2.135', 'the kangaroo rat’s reliance on metabolic water from dry seeds without drinking is the classic finding reviewed here.'),
  },
  {
    id: 'r-tsp-n9',
    passage: 'In the mid-1800s, many physicians and officials believed that cholera spread through poisonous air rising from accumulated filth, a theory known as miasma. Physician John Snow, skeptical of this explanation, suspected contaminated drinking water instead. During an 1854 outbreak in London, he gathered the addresses of people who had died and discovered that most had drawn water from a single pump on Broad Street. The pump’s handle was removed while the outbreak was already waning, and Snow’s investigation became a founding example of epidemiology, the study of how diseases spread.',
    steps: [
      'Sentence 1: a common belief (poisonous air). Sentences 2 and 3: Snow doubts it and investigates.',
      'Sentence 4: the result and the lasting importance of his investigation.',
      'So: belief, challenge, lasting importance: choice D.',
    ],
    meta: meta('Brody, H., M. R. Rip, P. Vinten-Johansen, N. Paneth, and S. Rachman. “Map-making and myth-making in Broad Street: the London cholera epidemic, 1854.” The Lancet 356 (2000): 64–68.', 'https://pubmed.ncbi.nlm.nih.gov/10892779/', 'Snow’s water hypothesis and the Broad Street pump are documented; the passage now notes that the outbreak was already waning, as the article explains.'),
  },
  {
    id: 'r-tsp-n10',
    passage: 'The following text is from Edith Wharton’s 1911 novel Ethan Frome. Ethan lives on a farm outside the village of Starkfield with his wife, Zeena.\n\nFrome was in the habit of walking into Starkfield to fetch home his wife’s cousin, Mattie Silver, on the rare evenings when some chance of amusement drew her to the village. It was his wife who had suggested, when the girl came to live with them, that such opportunities should be put in her way. Mattie Silver came from Stamford, and when she entered the Fromes’ household to act as her cousin Zeena’s aid it was thought best, as she came without pay, not to let her feel too sharp a contrast between the life she had left and the isolation of a Starkfield farm. __But for this—as Frome sardonically reflected—it would hardly have occurred to Zeena to take any thought for the girl’s amusement.__',
    choices: [
      'It suggests that Zeena’s apparent kindness toward Mattie has a practical motive, as Ethan privately recognizes.',
      'It reveals that Mattie is unhappy living on the farm and wishes to return to her former life in Stamford.',
      'It explains why Ethan enjoys walking into the village of Starkfield on winter evenings by himself.',
      'It indicates that Zeena and Mattie have quarreled over how Mattie should spend her free evenings.',
    ],
    tags: [null, 'beyond', 'beyond', 'beyond'],
    why: [
      'Correct. Without the need to keep an unpaid helper content, Ethan thinks, Zeena would never have considered the girl’s amusement.',
      'The text describes efforts to soften the contrast for Mattie, but it never says that she is unhappy or wishes to leave.',
      'Ethan walks in to “fetch home” Mattie, not to enjoy walks alone, and the sentence concerns Zeena’s motives.',
      'The text describes no quarrel; it gives Ethan’s private, sardonic view of Zeena’s reasons.',
    ],
    steps: ['Zeena suggested that Mattie be given chances for amusement.', 'The reason given: Mattie works “without pay.”', 'Ethan’s sardonic thought exposes Zeena’s practical motive: choice A.'],
    meta: meta('Wharton, Edith. Ethan Frome, chapter 1. New York: Scribner’s, 1911.', WS.frome, 'paragraph copied exactly; the context line states facts given earlier in the chapter.'),
  },
  {
    id: 'r-tsp-n11',
    choices: [
      'It describes the history of comic books and then predicts how the form will change over the coming decades.',
      'It presents a dismissive view of a form, gives an example that challenges it, and notes a change in how such works are studied.',
      'It compares two graphic novels and argues that one is more serious than the other in its treatment of history.',
      'It explains how graphic novels are made and why readers of many different ages find them so appealing.',
    ],
    meta: meta('Pettitt, J. “Art Spiegelman: Maus.” In Handbook of Comics and Graphic Narratives, edited by S. Aldama, 438–450. Berlin: De Gruyter, 2021.', 'https://doi.org/10.1515/9783110446968-026', 'Maus, its subject and the special Pulitzer Prize of 1992 are documented.'),
  },
  {
    id: 'r-tsp-n12',
    meta: meta('Bybee, S. M., et al. “UV photoreceptors and UV-yellow wing pigments in Heliconius butterflies allow a color signal to serve both mimicry and intraspecific communication.” American Naturalist 179, no. 1 (2012): 38–51.', 'https://pubmed.ncbi.nlm.nih.gov/22173459/', 'the UV-reflecting yellow pigment and duplicated UV opsins follow the abstract.'),
  },
  {
    id: 'r-tsp-n13',
    meta: meta('Joughin, I., B. E. Smith, D. E. Shean, and D. Floricioiu. “Brief Communication: Further summer speedup of Jakobshavn Isbræ.” The Cryosphere 8 (2014): 209–214.', 'https://doi.org/10.5194/tc-8-209-2014', 'summer speeds of Greenland’s fastest glacier exceed 30 meters a day in the reported record.'),
  },
  {
    id: 'r-tsp-n14',
    passage: 'Why do zebras have stripes? For more than a century, scientists proposed explanations ranging from camouflage and confusing predators to regulating body temperature and recognizing other members of the herd. Biologist Tim Caro and his colleagues systematically evaluated many of these hypotheses by comparing the striping of zebras and their relatives with the environments those animals inhabit, and they found the strongest support for one explanation: stripes discourage biting flies. Subsequent observations by Caro’s team demonstrated that flies approach striped surfaces but frequently fail to land on them.',
    meta: meta('Caro, T., A. Izzo, R. C. Reiner, H. Walker, and T. Stankowich. “The function of zebra stripes.” Nature Communications 5 (2014): 3535; Caro, T., et al. “Benefits of zebra stripes: Behaviour of tabanid flies around zebras and horses.” PLOS ONE 14, no. 2 (2019): e0210831.', 'https://pubmed.ncbi.nlm.nih.gov/24691390/', 'the systematic test of explanations and the later observations of flies failing to land follow the two papers.'),
  },
  {
    id: 'r-tsp-n15',
    passage: 'Music educators Robert Duke, Amy Simmons, and Carla Davis Cash observed seventeen advanced piano students practicing a difficult passage from a Shostakovich concerto until each felt ready to play it accurately the following day. How long the students practiced, and how many times they repeated the passage, did not predict how well they performed the next day. What distinguished the best performers was how they practiced: they addressed errors as soon as they occurred, slowed down to play difficult spots correctly, and repeated the passage accurately before moving on.',
    choices: [
      'To describe a study of how skilled musicians practice and what distinguished the most successful of them',
      'To argue that all musicians should practice every new piece of music for a set number of hours each day',
      'To compare the practice methods of pianists with the methods used by violinists and other musicians',
      'To explain why some pieces of music by Shostakovich are especially difficult for pianists to play quickly',
    ],
    why: [
      'Correct. The text reports what the researchers observed and what set the best performers apart.',
      'The text found that practice time did not predict success, so it does not recommend a set number of hours.',
      'Only pianists are studied; no other musicians appear in the text.',
      'The passage is described as difficult, but the text is about practice habits, not why the music is hard.',
    ],
    steps: [
      'The text describes a study of pianists practicing one passage.',
      'Time and repetitions did not predict success; the way of practicing did.',
      'So its purpose is to describe the study and its key finding: choice A.',
    ],
    meta: meta('Duke, R. A., A. L. Simmons, and C. D. Cash. “It’s Not How Much; It’s How: Characteristics of Practice Behavior and Retention of Performance Skills.” Journal of Research in Music Education 56, no. 4 (2009): 310–321.', 'https://doi.org/10.1177/0022429408328851', 'the seventeen pianists, the Shostakovich passage and the practice behaviors that predicted performance follow the abstract; the earlier version used an invented pianist.'),
  },
  {
    id: 'r-tsp-n16',
    meta: meta('Newton, I. “A Letter of Mr. Isaac Newton … containing his New Theory about Light and Colors.” Philosophical Transactions of the Royal Society 6 (1672): 3075–3087.', 'https://doi.org/10.1098/rstl.1671.0072', 'chromatic aberration and Newton’s turn to a reflecting telescope are described in his letter.'),
  },
  {
    id: 'r-tsp-n17',
    passage: 'Although the ocean covers about 70 percent of Earth’s surface, only a small fraction of the seafloor had been mapped in high resolution when an international project called Seabed 2030 was launched in 2017, and most of the rest was known only from approximate estimates based on satellite measurements of the ocean’s surface. The project, a collaboration between the Nippon Foundation and the General Bathymetric Chart of the Oceans, aims to map the entire ocean floor in high resolution by 2030, gathering data from governments, universities, and commercial ships.',
    why: [
      'The text says satellite data give only approximate estimates; it does not argue that sonar is less accurate.',
      'Sonar is not even described in the text, let alone in technical detail.',
      'Animals are never mentioned; the text is about how little of the seafloor has been mapped and a project to change that.',
      'Correct. A gap in knowledge and a project to fill it.',
    ],
    steps: [
      'The text states that only a small fraction of the seafloor had been mapped in detail.',
      'It ends with Seabed 2030’s goal of mapping the whole seafloor by 2030.',
      'So: a gap, and an effort to close it: choice D.',
    ],
    meta: meta('Mayer, L., et al. “The Nippon Foundation—GEBCO Seabed 2030 Project: The Quest to See the World’s Oceans Completely Mapped by 2030.” Geosciences 8, no. 2 (2018): 63.', 'https://doi.org/10.3390/geosciences8020063', 'the small mapped fraction and the goal of complete mapping by 2030 follow the abstract.'),
  },
  {
    id: 'r-tsp-n18',
    meta: meta('Dudley, S. A., and A. L. File. “Kin recognition in an annual plant.” Biology Letters 3, no. 4 (2007): 435–438.', 'https://pubmed.ncbi.nlm.nih.gov/17567552/', 'greater root allocation among strangers than among siblings in Cakile edentula follows the abstract.'),
  },
  {
    id: 'r-tsp-n19',
    passage: 'Some critics have charged that Jane Austen’s novels ignore the momentous events of her time, since the wars against Napoleonic France, which continued throughout most of her writing career, are almost never described directly. __In fact, two of her brothers served as officers in the Royal Navy throughout those wars, and her correspondence follows their ships, engagements, and promotions attentively.__ Literary historian Brian Southam argues that the navy is present throughout her fiction, most conspicuously in Persuasion, whose naval officers return home enriched by the conflict, even when the war itself is not placed in the foreground.',
    choices: [
      'It supports the critics’ view that Austen knew little about the wars that took place during her lifetime.',
      'It explains in Austen’s own words why she chose not to describe the battles of the wars directly.',
      'It provides evidence that challenges the critics’ assumption that the omission reflected a lack of awareness.',
      'It summarizes the plot of Persuasion, the novel in which the navy appears most visibly.',
    ],
    why: [
      'It shows that Austen followed the wars closely, the opposite of knowing little about them.',
      'The sentence draws on her letters and her brothers’ careers; it does not quote her explanation of her choices.',
      'Correct. Her close knowledge of the war undercuts the idea that she ignored it out of unawareness.',
      'No plot is summarized; Persuasion is mentioned only in the last sentence, as an example.',
    ],
    steps: [
      'Critics say Austen ignored the wars.',
      'The underlined sentence shows that she followed them closely through her brothers.',
      'That evidence challenges the critics’ assumption: choice C.',
    ],
    meta: meta('Southam, B. Jane Austen and the Navy. London: Hambledon and London, 2000; reviewed by D. F. Bittner, Journal of Military History 66 (2002).', 'https://doi.org/10.2307/3093376', 'Austen’s naval brothers, her letters and the navy’s presence in her fiction are the subject of Southam’s book; the earlier version used an invented novelist.'),
  },
  {
    id: 'r-tsp-n20',
    choices: [
      'To explain how undersea volcanic eruptions can form entirely new islands in the ocean',
      'To describe how scientists used a new island to study how life settles on bare land',
      'To argue that every island near Iceland should be closed to visitors from now on',
      'To compare Surtsey with the older islands that lie in the waters near Iceland',
    ],
    meta: meta('Magnússon, B., S. H. Magnússon, E. Ólafsson, and B. D. Sigurdsson. “Plant colonization, succession and ecosystem development on Surtsey with reference to neighbouring islands.” Biogeosciences 11 (2014): 5521–5537.', 'https://doi.org/10.5194/bg-11-5521-2014', 'the 1963 eruption, protected status and colonization by plants and seabirds follow the abstract.'),
  },
  {
    id: 'r-tsp-n21',
    passage: 'For decades, economists modeling household spending assumed that people treat all money as interchangeable, so that a dollar from a tax refund is spent no differently than a dollar of regular wages. Behavioral economist Richard Thaler challenged this assumption, documenting how people sort money into separate “mental accounts” and spend unexpected gains far more freely than earned income. The idea of mental accounting has since become a standard concept in behavioral economics and appears in many models of consumer behavior.',
    choices: [
      'It offers an example that illustrates the assumption about household spending described in the first sentence.',
      'It summarizes the later research described in the third sentence of the text.',
      'It introduces research that undermines the assumption described in the first sentence.',
      'It presents a criticism of the models of consumer behavior mentioned in the third sentence.',
    ],
    why: [
      'Thaler’s findings contradict the assumption; they do not illustrate it.',
      'The third sentence describes the later influence of Thaler’s idea; the second sentence does not summarize it.',
      'Correct. It presents the challenge to the earlier assumption.',
      'The second sentence criticizes an assumption in earlier models, not the models that later adopted mental accounting.',
    ],
    steps: [
      'Sentence 1 states an assumption (money is interchangeable). Sentence 2 reports Thaler’s findings that contradict it.',
      'Sentence 3 says his idea has since become standard.',
      'So sentence 2 introduces research that undermines the assumption: choice C.',
    ],
    meta: meta('Thaler, R. “Mental Accounting and Consumer Choice.” Marketing Science 4, no. 3 (1985): 199–214.', 'https://doi.org/10.1287/mksc.4.3.199', 'the fungibility assumption and mental accounts follow Thaler’s article; the passage no longer makes unsourced claims about specific later studies.'),
  },
  {
    id: 'r-tsp-n22',
    meta: meta('Stigler, G. J. “Notes on the History of the Giffen Paradox.” Journal of Political Economy 55, no. 2 (1947): 152–156.', 'https://doi.org/10.1086/256487', 'the report attributing the bread observation to Giffen and the subsistence explanation are traced in Stigler’s history.'),
  },
  {
    id: 'r-tsp-n23',
    passage: 'Neuroscientists have long recognized that young animals calibrate some of their senses during sensitive periods early in life, after which recalibration becomes considerably more difficult. Eric Knudsen and Phyllis Knudsen fitted young barn owls with prisms that displaced their visual field, an alteration that compelled the owls to readjust how they localized sounds, and initiated the prism experience at ages ranging from 10 to 272 days. Owls that began wearing prisms by 21 days of age adjusted their sound localization by approximately 20 degrees, whereas one that began at 102 days adjusted by merely 6. The investigation thus helps define the boundaries of a sensitive period in this species.',
    choices: [
      'To describe a study that clarifies when young barn owls are able to recalibrate how they locate sounds',
      'To argue that barn owls locate sounds differently from every other species of bird that hunts at night',
      'To explain why adult barn owls gradually lose the ability to see clearly as they grow older',
      'To compare the hearing of wild barn owls with the hearing of barn owls raised in captivity',
    ],
    why: [
      'Correct. The study pins down when the owls can recalibrate how they locate sounds.',
      'The text does not compare barn owls with other birds.',
      'The prisms shifted the owls’ vision, but the text is about locating sounds, not about eyesight weakening with age.',
      'No comparison of wild and captive owls is made.',
    ],
    steps: [
      'The text gives background (sensitive periods) and describes the prism study.',
      'Young owls adjusted a great deal; an older owl adjusted much less.',
      'So the study defines when recalibration is possible: choice A.',
    ],
    meta: meta('Knudsen, E. I., and P. F. Knudsen. “Sensitive and critical periods for visual calibration of sound localization by barn owls.” Journal of Neuroscience 10, no. 1 (1990): 222–232.', 'https://pubmed.ncbi.nlm.nih.gov/2299394/', 'the prism ages, the 20-degree adjustment by 21 days and the 6-degree adjustment at 102 days follow the abstract; the earlier version gave unsupported figures for zebra finches.'),
  },
  {
    id: 'r-tsp-n24',
    meta: meta('Penzias, A. A., and R. W. Wilson. “A Measurement of Excess Antenna Temperature at 4080 Mc/s.” Astrophysical Journal 142 (1965): 419–421; Wilson, R. W. “The cosmic microwave background radiation.” Reviews of Modern Physics 51 (1979): 433–445.', 'https://doi.org/10.1086/148307', 'the persistent excess noise, the cleaning of the antenna (including pigeon droppings, described in Wilson’s Nobel lecture) and the later interpretation are documented.'),
  },
  {
    id: 'r-tsp-n25',
    meta: meta('Mellor, A. K. Mary Shelley: Her Life, Her Fiction, Her Monsters. New York: Routledge, 1988 (reissued 2012).', 'https://doi.org/10.4324/9780203435588', 'the reading of Victor’s failure as a failure of parental care is Mellor’s; the passage presents it as an alternative reading.'),
  },
  {
    id: 'r-tsp-n26',
    meta: meta('Taboada, C., et al. “Glassfrogs conceal blood in their liver to maintain transparency.” Science 378 (2022): 1315–1320.', 'https://pubmed.ncbi.nlm.nih.gov/36548427/', 'the removal of most red blood cells from circulation into the liver during sleep follows the published study.'),
  },
  {
    id: 'r-tsp-n27',
    passage: 'Since the nineteenth century, scholars have debated whether the Iliad and the Odyssey were composed by a single poet named Homer. In the late 1920s, Milman Parry demonstrated that the Homeric poems are constructed from formulaic phrases that fit the poetic meter, and in the 1930s he studied oral poets in Yugoslavia who composed lengthy epics as they performed them, relying on similar formulas. His work suggested that the Homeric poems emerged from a tradition of oral composition, redirecting the debate from the identity of an individual author to the characteristics of a collective tradition.',
    why: [
      'Parry’s findings come in the second and third sentences, not the first, which states the question his research reframed.',
      'The oral poets appear in the second sentence; the first sentence introduces the authorship debate.',
      'The first sentence presents a debate, not evidence for one side of it.',
      'Correct. It sets up the question that the final sentence says Parry’s work redirected.',
    ],
    steps: [
      'Sentence 1 states a debate about authorship. Sentence 2 describes Parry’s research.',
      'Sentence 3 says his work shifted the debate.',
      'So sentence 1 introduces the question Parry reframed: choice D.',
    ],
    meta: meta('Parry, M. “Studies in the Epic Technique of Oral Verse-Making. I. Homer and Homeric Style.” Harvard Studies in Classical Philology 41 (1930): 73–147.', 'https://doi.org/10.2307/310626', 'the formulaic analysis of Homer and the later Yugoslav fieldwork are documented; the passage now gives them in the right order.'),
  },
  {
    id: 'r-tsp-n28',
    passage: 'Medieval Icelandic sagas describe Norse voyages to a land called Vinland, west of Greenland. For centuries, scholars debated whether these voyages had actually taken place. In 1960, explorers Helge and Anne Stine Ingstad identified the remains of Norse-style buildings at L’Anse aux Meadows in Newfoundland, and in 2021 scientists analyzing tree rings in wood cut with metal tools there showed that Norse settlers were working at the site in 1021 CE, roughly five centuries before Columbus.',
    meta: meta('Kuitems, M., et al. “Evidence for European presence in the Americas in AD 1021.” Nature 601 (2022): 388–391.', 'https://pubmed.ncbi.nlm.nih.gov/34671168/', 'the 1960 identification and the 1021 date from wood cut with metal tools follow the published study.'),
  },
  {
    id: 'r-tsp-n29',
    passage: 'Many observers have predicted that computers would sharply reduce employment in the occupations that use them, since software performs tasks that once required a person. Examining detailed occupations in the United States since 1980, economist James Bessen found instead that occupations that use computers have grown faster, not slower, even among routine and middle-wage jobs, although computerized occupations have drawn employment away from other occupations and required new skills. Bessen suggests that automation often changes what workers do, and which jobs grow, more than it eliminates work outright.',
    why: [
      'The text does not explain how computers work.',
      'Only one study is described, and its methods are not evaluated.',
      'The text does not call the debate unresolvable; it offers a conclusion.',
      'Correct. Prediction, complicating research, broader conclusion.',
    ],
    steps: [
      'Sentence 1: a prediction that computers would cut jobs. Sentence 2: research that found something different.',
      'Sentence 3: a general lesson about automation.',
      'So: prediction, complicating research, broader conclusion: choice D.',
    ],
    meta: meta('Bessen, J. E. “How Computer Automation Affects Occupations: Technology, Jobs, and Skills.” Boston University School of Law, Law and Economics Research Paper No. 15-49 (2015).', 'https://doi.org/10.2139/ssrn.2690435', 'faster growth of computer-using occupations and the shifting of employment and skills follow the abstract; the earlier version described an unsourced self-checkout study.'),
  },
  {
    id: 'r-tsp-n30',
    meta: meta('Best, M., and D. Neuhauser. “Ignaz Semmelweis and the birth of infection control.” Quality and Safety in Health Care 13, no. 3 (2004): 233–234.', 'https://pubmed.ncbi.nlm.nih.gov/15175497/', 'the two clinics, the autopsy link and the fall in mortality after chlorine handwashing are documented.'),
  },
  {
    id: 'r-tsp-n31',
    meta: meta('Alerstam, T. “Flight by night or day? Optimal daily timing of bird migration.” Journal of Theoretical Biology 258, no. 4 (2009): 530–536.', 'https://doi.org/10.1016/j.jtbi.2009.01.020', 'night migration and the trade-off between flight conditions and daytime foraging are the subject of the article.'),
  },
  {
    id: 'r-tsp-n32',
    meta: meta('Marcus, G. F., et al. “Overregularization in Language Acquisition.” Monographs of the Society for Research in Child Development 57, no. 4 (1992): i–178.', 'https://doi.org/10.2307/1166115', 'overregularizations such as “goed” and the rule-based account are the subject of the monograph.'),
  },
  {
    id: 'r-tsp-n33',
    passage: 'Since 1979, orbiting satellites have systematically measured the extent of Arctic sea ice each September, when the ice reaches its annual minimum. The measurements demonstrate that September ice extent has declined by roughly 12 percent per decade throughout that period. Because sea ice reflects most of the sunlight that strikes it, whereas open water absorbs most of it, this progressive disappearance of ice allows the Arctic Ocean to absorb additional heat, which in turn melts more ice, a self-reinforcing process that climatologists describe as a feedback.',
    meta: meta('Stroeve, J. C., et al. “The Arctic’s rapidly shrinking sea ice cover: a research synthesis.” Climatic Change 110 (2012): 1005–1027.', 'https://doi.org/10.1007/s10584-011-0101-1', 'the satellite record, the September decline of about 12 percent per decade and the albedo feedback are reviewed in the synthesis.'),
  },
  {
    id: 'r-tsp-n34',
    passage: 'For decades, many scholars assumed that the Voynich Manuscript, a fifteenth-century book written in an undeciphered script, was the work of a single scribe or author. Paleographer Lisa Fagin Davis, however, compared the letterforms throughout the manuscript and identified five distinct scribal hands, each with its own characteristic ways of forming the script. Davis concludes that the book was most likely produced by a group of scribes working together, perhaps in a workshop or religious community.',
    why: [
      'The text describes a researcher’s finding and conclusion, not a debate that cannot be resolved.',
      'The text says nothing about restoring the manuscript or evaluating a restoration of it.',
      'Correct. A single-scribe view, then evidence of five hands, then a conclusion that several scribes made it.',
      'Davis’s own conclusion is supported, not undermined, and she does not abandon it.',
    ],
    meta: meta('Davis, L. F. “How Many Glyphs and How Many Scribes? Digital Paleography and the Voynich Manuscript.” Manuscript Studies 5, no. 1 (2020): 164–180.', 'https://doi.org/10.1353/mns.2020.0011', 'the five scribal hands and the collaborative-production conclusion are as Davis reports; the earlier version used an invented manuscript and scholar.'),
  },
  {
    id: 'r-tsp-n35',
    why: [
      'Correct. Needing to feed almost continuously explains why cold nights without food are a problem that torpor solves.',
      'The rest of the text builds on the first sentence; it never questions it.',
      'The first sentence describes metabolism; torpor is defined only in the second sentence and illustrated in the third.',
      'The text never mentions cold-blooded animals or compares them with hummingbirds.',
    ],
    meta: meta('Wolf, B. O., et al. “Extreme and variable torpor among high-elevation Andean hummingbird species.” Biology Letters 16, no. 9 (2020): 20200428.', 'https://pubmed.ncbi.nlm.nih.gov/32898456/', 'deep torpor with body temperatures falling as low as 3.26°C follows the abstract.'),
  },
  {
    id: 'r-tsp-n36',
    passage: 'Much of the literature written since the 1918 influenza pandemic has favored the view that the disease was socially neutral, killing rich and poor alike. Demographer Svenn-Erik Mamelund instead examined individual records from two socially contrasting parishes in Kristiania, now Oslo, and found that mortality was considerably higher in the poorer parish and among people living in smaller apartments. Mamelund argues that the pandemic’s unequal toll has been obscured partly because earlier studies measured mortality for whole cities rather than for the different groups within them.',
    choices: [
      'To explain why death rates from the 1918 pandemic were higher in Norway than in other European countries',
      'To argue that wealthy residents of Kristiania were better prepared for the pandemic than residents of other cities',
      'To describe the methods that historians use to estimate death rates from early twentieth-century pandemics',
      'To present a scholar’s view that a common characterization of the pandemic has obscured its unequal effects',
    ],
    why: [
      'The text concerns Kristiania alone and makes no comparison with other countries.',
      'The text says the poorer parish suffered more; it says nothing about how well prepared anyone was.',
      'The text does not describe historians’ methods for estimating death rates.',
      'Correct. Mamelund argues that the “socially neutral” view hid the pandemic’s unequal toll.',
    ],
    steps: [
      'The text gives the common view that the disease struck rich and poor alike.',
      'Mamelund’s records show higher mortality among the poor.',
      'His point is that the common view obscured unequal effects: choice D.',
    ],
    meta: meta('Mamelund, S.-E. “A socially neutral disease? Individual social class, household wealth and mortality from Spanish influenza in two socially contrasting parishes in Kristiania 1918–19.” Social Science & Medicine 62, no. 4 (2006): 923–940.', 'https://pubmed.ncbi.nlm.nih.gov/16084634/', 'the socially neutral view and the higher mortality in the poorer parish and smaller apartments follow the published study; the earlier version used an invented historian.'),
  },
  {
    id: 'r-tsp-n37',
    meta: meta('Peakall, D. B. “Conservation of web proteins in the spider, Araneus diadematus.” Journal of Experimental Zoology 176, no. 3 (1971): 257–264.', 'https://pubmed.ncbi.nlm.nih.gov/5548869/', 'the recycling of silk protein from eaten webs into new webs follows the abstract.'),
  },
  {
    id: 'r-tsp-n38',
    passage: 'For much of the twentieth century, historians described medieval Europe as a period of scientific stagnation between the achievements of antiquity and those of the Renaissance. Over the past several decades, however, scholars have documented substantial medieval advances in optics, mechanical clockmaking, and mathematics, and historian Edward Grant has argued that medieval universities laid the foundations of modern science. Many historians trace the older view to Renaissance humanists, who, eager to present their own age as a rebirth of learning, portrayed the preceding centuries as barren.',
    why: [
      'Correct. View, counterevidence, explanation of why the view lasted.',
      'No historian’s argument is presented and then opposed; the last sentence explains the old view’s origin.',
      'Only one historian is named, and no debate between two historians is described.',
      'The advances are mentioned briefly; their later influence is not traced one by one.',
    ],
    steps: [
      'Sentence 1: the old view (stagnation). Sentence 2: evidence against it.',
      'Sentence 3: why the old view arose and lasted.',
      'So: view, counterevidence, explanation: choice A.',
    ],
    meta: meta('Grant, E. The Foundations of Modern Science in the Middle Ages: Their Religious, Institutional, and Intellectual Contexts. Cambridge: Cambridge University Press, 1996.', 'https://doi.org/10.1017/cbo9780511817908', 'Grant’s thesis on medieval foundations and the humanist origin of the “dark ages” image are standard in the historiography; the earlier version used an invented historian.'),
  },
  {
    id: 'r-tsp-n39',
    passage: 'Library designers confront a persistent conflict: readers appreciate daylight, but prolonged sunlight gradually fades paper and deteriorates bindings. Positioning the book stacks alongside the windows, where browsers could consult volumes in natural illumination, would have exposed the collection to the very radiation that damages it. For the library at Phillips Exeter Academy, completed in 1971, architect Louis Kahn instead arranged individual reading carrels in an outer ring adjacent to the windows and the book stacks in an inner ring, surrounding a towering central hall illuminated from above.',
    choices: [
      'It describes the architectural solution that the designer of the library ultimately adopted.',
      'It provides background information about the history of the school where the library was built.',
      'It explains why an obvious way of arranging the library would have proved unsatisfactory.',
      'It presents a criticism of the finished library made by the students who use its reading rooms.',
    ],
    why: [
      'The adopted solution comes in the third sentence; the second sentence explains why the obvious arrangement would fail.',
      'The text names the school only to identify the library; it never discusses the school’s history.',
      'Correct. It rules out the obvious option of placing stacks by the windows.',
      'The sentence describes a rejected arrangement, not users’ reactions to the finished building.',
    ],
    steps: [
      'Sentence 1: the conflict between daylight for readers and protecting books from sunlight.',
      'Sentence 2: why stacks along the windows would fail. Sentence 3: Kahn’s actual solution.',
      'So the second sentence rules out the obvious design: choice C.',
    ],
    meta: meta('Mattern, S. “Geometries of Reading, Light of Learning: Louis I. Kahn’s Library at Phillips Exeter.” In Geometries of Rhetoric, 89–118. Basel: Birkhäuser, 2010.', 'https://doi.org/10.1007/978-3-0346-0522-9_4', 'Kahn’s separation of daylit carrels from the book stacks is the subject of the chapter; the earlier version described an invented library.'),
  },
];
