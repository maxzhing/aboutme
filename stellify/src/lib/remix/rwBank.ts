import type { Genre } from '@/data/questions/genres';

/**
 * Original content for Reading & Writing remixes, written for Stellify. Researchers, authors, works, places
 * and figures in it are ILLUSTRATIVE (invented for practice), so no passage reproduces or paraphrases any
 * published text, College Board passage or other prep material. Every piece is tagged so the validator can
 * check that exactly one answer is defensible.
 */
export interface Study {
  id: string; genre: Genre; lvl: number;
  /** four sentences: background, claim, method/evidence, result */
  s: [string, string, string, string];
  main: string; infer: string;
  support: string; weaken: string; off: [string, string];
  beyond: string; reversed: string; detail: string;
}
export const STUDIES: Study[] = [
  { id: 'st-frogs', genre: 'science', lvl: 2,
    s: ['Male tree frogs on the island of Vela call loudly at night to attract mates.', 'Biologist Ines Moravec hypothesized that females choose mates mainly by the pitch of their calls rather than by their size.', 'She played recordings of low- and high-pitched calls from hidden speakers placed beside models of small and large frogs.', 'Females approached the low-pitched recordings far more often, whatever the size of the model beside them.'],
    main: 'Female tree frogs on Vela appear to choose mates based on call pitch rather than body size.', infer: 'pitch matters more than size when these females choose a mate',
    support: 'Females that heard only low-pitched calls mated sooner than females that heard only high-pitched calls.', weaken: 'When call pitch was held constant, females consistently approached the larger frog models.',
    off: ['Male tree frogs on Vela call more often on humid nights than on dry nights.', 'Tree frogs on nearby islands have longer legs than tree frogs on Vela.'],
    beyond: 'Female tree frogs everywhere ignore every physical trait when choosing mates.', reversed: 'Female tree frogs on Vela choose mates by size and ignore the pitch of their calls.', detail: 'Moravec hid speakers beside models of small and large frogs.' },
  { id: 'st-moss', genre: 'science', lvl: 3,
    s: ['Mosses can survive months without water by drying out almost completely and then reviving when rain returns.', 'Botanist Tomas Lindqvist suspected that a sugar called trehalose protects moss cells while they are dry.', 'He compared ordinary mosses with mosses bred to produce very little trehalose, drying both for six weeks.', 'After rewatering, nearly all the ordinary mosses revived, but fewer than a third of the low-trehalose mosses did.'],
    main: 'Trehalose appears to help mosses survive long periods without water.', infer: 'trehalose helps protect moss cells during long dry periods',
    support: 'Low-trehalose mosses that were given extra trehalose before drying revived as often as ordinary mosses.', weaken: 'Low-trehalose mosses revived just as often as ordinary mosses when they were dried for only one week.',
    off: ['Mosses grow more slowly in shade than in direct sunlight.', 'Some mosses can live on bare rock with no soil at all.'],
    beyond: 'Trehalose is the only substance that allows any plant to survive drought.', reversed: 'Trehalose makes mosses less likely to survive drying out.', detail: 'Lindqvist dried both kinds of moss for six weeks before rewatering them.' },
  { id: 'st-coral', genre: 'science', lvl: 4,
    s: ['Reef corals depend on algae living in their tissues, and they often expel those algae when the water grows too warm.', 'Marine ecologist Priya Anand proposed that corals exposed to brief, mild warming become more resistant to later heat waves.', 'Her team warmed some coral fragments slightly for a few days each month and left matching fragments at normal temperatures.', 'During a later simulated heat wave, the pre-warmed fragments kept far more of their algae than the others did.'],
    main: 'Brief, mild warming appears to make corals better able to withstand later heat waves.', infer: 'mild warming in advance may help corals withstand a later heat wave',
    support: 'Pre-warmed fragments also recovered their color faster after the simulated heat wave ended.', weaken: 'Pre-warmed fragments lost just as many algae as the others when the heat wave lasted longer than a week.',
    off: ['Corals grow fastest in clear, shallow water.', 'Some reef fish feed on the algae that live on dead coral.'],
    beyond: 'Warming the oceans slightly would protect every coral reef from future damage.', reversed: 'Mild warming in advance makes corals lose more of their algae during heat waves.', detail: 'Anand\'s team warmed some fragments for a few days each month.' },
  { id: 'st-wages', genre: 'history-social', lvl: 3,
    s: ['In the town of Corvel, a new rail line in 1882 connected local farms to distant city markets for the first time.', 'Economic historian Lena Ostrova argues that the railroad raised farm wages by giving farmers more buyers for their crops.', 'She compared wage records from Corvel with records from a similar town that the railroad bypassed.', 'Over the next decade, farm wages rose sharply in Corvel but stayed nearly flat in the bypassed town.'],
    main: 'The arrival of the railroad appears to have raised farm wages in Corvel.', infer: 'the railroad, not some change shared by both towns, drove the rise in wages',
    support: 'Corvel\'s farmers sold most of their crops to city buyers within five years of the line opening.', weaken: 'Wages had already begun rising sharply in Corvel several years before the railroad arrived.',
    off: ['The bypassed town built a new school in 1885.', 'Corvel\'s railroad station was designed by a well-known architect.'],
    beyond: 'Railroads raised wages in every town they reached during the nineteenth century.', reversed: 'Farm wages rose faster in the bypassed town than in Corvel.', detail: 'Ostrova compared records from a town the railroad bypassed.' },
  { id: 'st-library', genre: 'history-social', lvl: 2,
    s: ['In 2016, the city of Harlow began keeping its public libraries open until midnight on weekdays.', 'Sociologist Daniel Achebe expected the later hours to draw students who had no quiet place to study at home.', 'He surveyed visitors arriving after 9 p.m. during the first year of the new schedule.', 'Most late visitors were high school and college students, and most said their homes were too crowded to study.'],
    main: 'Harlow\'s later library hours seem to serve students who lack a quiet place to study at home.', infer: 'the later hours filled a real need for students without quiet study space',
    support: 'Visits by students rose after 9 p.m. but changed little during the daytime hours.', weaken: 'Most late visitors were adults who came to use the libraries\' free internet for work.',
    off: ['Harlow\'s libraries added new children\'s books in 2016.', 'Library visits in Harlow drop slightly every summer.'],
    beyond: 'Every city should keep its public libraries open until midnight on weekdays.', reversed: 'Students rarely used Harlow\'s libraries after 9 p.m., even once the later hours began.', detail: 'Achebe surveyed the visitors who arrived at Harlow\'s libraries after 9 p.m.' },
  { id: 'st-voting', genre: 'history-social', lvl: 4,
    s: ['Many towns mail reminders to residents before local elections.', 'Political scientist Maria Kessler argues that reminders naming a specific polling place raise turnout more than general reminders do.', 'Before an election, she randomly assigned households to receive a general reminder, a reminder naming their polling place, or no reminder.', 'Turnout was highest among households that received the polling-place reminder and lowest among those that received nothing.'],
    main: 'Reminders that name a specific polling place appear to increase turnout more than general reminders.', infer: 'telling voters exactly where to go makes them more likely to vote',
    support: 'When the study was repeated in another town, households that received the polling-place reminder again voted at the highest rate.', weaken: 'In a second election, households receiving each kind of reminder voted at the same rate.',
    off: ['Turnout in local elections is usually lower than in national elections.', 'Some towns print reminders in several languages.'],
    beyond: 'Mailed reminders are the most effective way to increase turnout in every election.', reversed: 'General reminders raised turnout more than reminders naming a polling place.', detail: 'Kessler randomly assigned households to one of three groups before the election.' },
  { id: 'st-murals', genre: 'humanities', lvl: 2,
    s: ['The painter Ruth Okoye covered the walls of a city market with murals in the 1970s.', 'Art historian Selma Varga argues that Okoye designed the murals to be read from a moving crowd rather than from a fixed spot.', 'Varga notes that each scene repeats its key figure several times along the wall.', 'She also shows that the scenes make sense in sequence when viewed while walking at an ordinary pace.'],
    main: 'Okoye appears to have designed her market murals for viewers walking past them.', infer: 'Okoye expected her viewers to be in motion',
    support: 'Okoye\'s sketchbooks show her pacing out the length of the market wall before she painted.', weaken: 'Okoye\'s letters describe placing benches in front of the murals so visitors could study a single scene.',
    off: ['Okoye later taught painting at a college in another city.', 'The market was rebuilt with a new roof in the 1990s.'],
    beyond: 'All murals painted in the 1970s were meant to be viewed while walking.', reversed: 'Okoye intended each mural to be studied from a single fixed position.', detail: 'Each scene repeats its key figure several times.' },
  { id: 'st-dialect', genre: 'humanities', lvl: 3,
    s: ['Speakers in the coastal villages of the Arn region use several words for fog that inland speakers do not.', 'Linguist Pavel Novak argues that these words developed because accurately describing fog mattered for fishing.', 'He found that older fishers use the fog words most often and can explain fine differences between them.', 'Younger villagers who do not fish use only one or two of the words and often treat them as synonyms.'],
    main: 'The many fog words of Arn\'s coastal villages appear to be tied to the practical needs of fishing.', infer: 'the fog words may fade as fewer villagers fish',
    support: 'The fog words appear most often in old fishing logs, alongside notes about whether boats went out.', weaken: 'Inland farming villages in the same region use just as many words for fog.',
    off: ['The coastal villages hold a music festival every summer.', 'Arn\'s inland speakers have several words for snow.'],
    beyond: 'Every language develops many words for the weather its speakers work in.', reversed: 'Younger villagers use more fog words than older fishers do.', detail: 'Older fishers can explain fine differences between the words.' },
  { id: 'st-chairs', genre: 'humanities', lvl: 4,
    s: ['Historians of design have long praised the 1950s furniture maker Hal Brandt for chairs that look light and simple.', 'Design scholar Ama Osei argues that Brandt\'s simplicity was driven as much by cost as by taste.', 'She examined his workshop accounts, which list prices for wood, labor and finishing for each model.', 'Brandt\'s plainest chairs used the fewest and cheapest joints, and his most ornate designs were rarely produced.'],
    main: 'Brandt\'s simple furniture designs appear to reflect concerns about cost as well as style.', infer: 'cost shaped which designs Brandt actually put into production',
    support: 'Brandt\'s letters to suppliers repeatedly ask how to cut the number of joints in a chair.', weaken: 'Brandt\'s plainest chairs were his most expensive to make and sold for the highest prices.',
    off: ['Brandt\'s chairs are now displayed in several museums.', 'Brandt often worked with oak and walnut.'],
    beyond: 'All simple furniture of the 1950s was designed mainly to save money.', reversed: 'Brandt\'s most ornate chairs were the ones he produced most often.', detail: 'Osei examined the accounts that Brandt kept for his workshop.' },
  { id: 'st-novel', genre: 'literature', lvl: 2,
    s: ['The novelist Clara Weston published her first novel, The Long Field, in 1931.', 'Literary scholar Joel Mendes argues that Weston rewrote the ending to make her heroine less dependent on others.', 'Mendes compared the published novel with an early draft found among Weston\'s papers.', 'In the draft, the heroine is rescued by her brother; in the published version, she finds her own way home.'],
    main: 'Weston appears to have revised her novel\'s ending to make its heroine more independent.', infer: 'Weston chose to give her heroine more control over her fate',
    support: 'Weston\'s notes on the draft say the heroine "must not be carried home."', weaken: 'Weston\'s editor wrote that he, not Weston, insisted on changing the ending.',
    off: ['The Long Field sold more copies in its second year than in its first.', 'Weston grew up on a farm much like the one in the novel.'],
    beyond: 'Every novelist of the 1930s rewrote endings to show more independent heroines.', reversed: 'In the published version, the heroine depends on her brother to get home.', detail: 'Mendes found an early draft among Weston\'s papers.' },
  { id: 'st-poems', genre: 'literature', lvl: 3,
    s: ['The poet Elias Brandvold wrote most of his early poems about the city where he worked as a clerk.', 'Critic Sofia Ruiz argues that Brandvold\'s later shift to poems about the sea reflects his move to a fishing town, not a change in his ideas about poetry.', 'Ruiz shows that the later poems use the same short lines and plain words as the early ones.', 'Only the settings change: streets and offices give way to harbors and boats.'],
    main: 'Brandvold\'s move to the sea changed the setting of his poems more than his style.', infer: 'Brandvold\'s approach to writing poetry stayed largely the same after his move',
    support: 'Brandvold\'s letters from the fishing town say he is "writing as I always have, about what is in front of me."', weaken: 'Brandvold\'s sea poems use long, ornate lines that never appear in his city poems.',
    off: ['Brandvold\'s city poems were translated into three languages.', 'The fishing town had a small bookshop that sold Brandvold\'s work.'],
    beyond: 'Poets who move to the sea always change their style.', reversed: 'Brandvold\'s style changed completely after he moved to the fishing town.', detail: 'Brandvold worked as a clerk in the city.' },
  { id: 'st-letters', genre: 'literature', lvl: 4,
    s: ['Readers have long assumed that the narrator of Ida Fenn\'s 1902 novel, a lonely governess, speaks for Fenn herself.', 'Literary historian Kwame Mensah argues that Fenn built the narrator as a character readers should question.', 'He points out that the narrator\'s account of events often conflicts with letters quoted within the novel.', 'Fenn\'s own notes describe the narrator as "honest in feeling but mistaken in fact."'],
    main: 'Fenn appears to have designed her narrator as someone whose account readers should doubt.', infer: 'Fenn did not intend her narrator\'s account to be taken at face value',
    support: 'Early drafts show Fenn adding the conflicting letters after the narrator\'s account was written.', weaken: 'Fenn\'s notes say she wanted readers to trust the narrator completely.',
    off: ['Fenn worked as a governess for two years before writing the novel.', 'The novel was adapted for the stage in 1910.'],
    beyond: 'Every narrator in early twentieth-century fiction is meant to be doubted.', reversed: 'Fenn intended the narrator\'s account to be the reliable truth of the novel.', detail: 'The novel quotes letters that conflict with the narrator.' },
];

export interface Debate { id: string; genre: Genre; lvl: number; t1: string; t2: string; who2: string; topic: string; key: string; reversed: string; beyond: string; wrongText: string }
export const DEBATES: Debate[] = [
  { id: 'db-city', genre: 'history-social', lvl: 3, topic: 'the claim that wider roads ease traffic', who2: 'Ortega',
    t1: 'City planners often argue that adding lanes to busy roads reduces traffic. More lanes, they reason, give the same number of cars more room, so trips should become faster.',
    t2: 'Transportation researcher Elena Ortega finds that within a few years of a road being widened, traffic usually returns to its old level. Faster trips attract drivers who used to take other routes or travel at other times.',
    key: 'She would argue that the benefit is temporary because the added lanes attract more drivers.', reversed: 'She would agree that adding lanes permanently reduces traffic on busy roads.', beyond: 'She would argue that cities should remove existing lanes from all their roads.', wrongText: 'She would argue that planners underestimate how much widening a road costs.' },
  { id: 'db-novel', genre: 'literature', lvl: 4, topic: 'the reading of the novel\'s ending', who2: 'Hale',
    t1: 'Many readers see the ending of Mara Quint\'s novel The Glass Coast as hopeful: the heroine leaves her village, and the final chapter describes the open road ahead of her.',
    t2: 'Critic Dana Hale notes that the final chapter is narrated by the heroine years later, from the same village. For Hale, the open road is a memory of hope, not a sign that the heroine\'s hopes came true.',
    key: 'She would argue that the hopeful reading overlooks who narrates the ending and when.', reversed: 'She would agree that the final chapter shows the heroine\'s hopes being fulfilled.', beyond: 'She would argue that Quint\'s other novels also have unhappy endings.', wrongText: 'She would argue that the heroine never actually leaves her village in the novel.' },
  { id: 'db-sleep', genre: 'science', lvl: 3, topic: 'the explanation of why birds sleep in groups', who2: 'Tanaka',
    t1: 'Biologists have often explained that small birds roost together at night mainly to stay warm, since huddling reduces the heat each bird loses. On this view, the habit should be strongest on the coldest nights.',
    t2: 'Ecologist Ren Tanaka observed roosting sparrows on warm summer nights and found that they gathered just as closely as on cold nights. Birds in larger groups were also attacked less often by owls.',
    key: 'She would argue that warmth alone cannot explain the behavior, since protection from predators also seems to matter.', reversed: 'She would agree that staying warm is the only reason the birds roost together.', beyond: 'She would argue that all animals form groups to avoid predators.', wrongText: 'She would argue that sparrows sleep less on warm nights than on cold ones.' },
  { id: 'db-museum', genre: 'humanities', lvl: 2, topic: 'the view that museums should display objects without labels', who2: 'Baptiste',
    t1: 'Some curators argue that museums should display art with little or no written text, so that visitors respond to the objects themselves rather than to a curator\'s explanation.',
    t2: 'Museum researcher Leo Baptiste tracked visitors in two galleries and found that people spent twice as long with objects that had short labels. Visitors also remembered more about those objects a week later.',
    key: 'He would argue that short labels deepen visitors\' engagement rather than getting in the way of it.', reversed: 'He would agree that labels distract visitors from the objects on display.', beyond: 'He would argue that museums should replace objects with detailed written guides.', wrongText: 'He would argue that visitors prefer galleries with fewer objects.' },
];

export interface DataCard { id: string; genre: Genre; who: string; intro: string; measure: string; unit: string; names: string[]; years: [string, string]; topic: string }
export const DATA_CARDS: DataCard[] = [
  { id: 'dc-birds', genre: 'science', who: 'Ecologist Nora Field', intro: 'counted nesting pairs of four shorebird species on the same stretch of coast in two years', measure: 'nesting pairs', unit: 'pairs', names: ['Sandpipers', 'Plovers', 'Terns', 'Oystercatchers'], years: ['2012', '2022'], topic: 'some shorebird species have done well while others have struggled' },
  { id: 'dc-transit', genre: 'history-social', who: 'Urban planner Sam Ito', intro: 'recorded the average number of daily riders on four bus routes before and after a fare change', measure: 'daily riders', unit: 'riders', names: ['Route 2', 'Route 5', 'Route 9', 'Route 14'], years: ['2019', '2023'], topic: 'the fare change affected routes differently' },
  { id: 'dc-museum', genre: 'humanities', who: 'Arts researcher Mei Larsen', intro: 'tracked yearly visitors, in thousands, to four small museums', measure: 'visitors (thousands)', unit: 'thousand visitors', names: ['Harbor Gallery', 'Folk Art House', 'Clock Museum', 'Textile Hall'], years: ['2018', '2023'], topic: 'interest in small museums has shifted rather than simply grown or declined' },
  { id: 'dc-books', genre: 'literature', who: 'Publishing analyst Ken Oduya', intro: 'compared sales, in thousands of copies, of four kinds of books at an independent bookstore chain', measure: 'copies sold (thousands)', unit: 'thousand copies', names: ['Poetry', 'Short stories', 'Historical novels', 'Graphic novels'], years: ['2015', '2024'], topic: 'readers\' tastes have shifted between kinds of books' },
];

export type Rel = 'contrast' | 'result' | 'addition' | 'example' | 'sequence' | 'similarity';
export const TRANSITIONS: Record<Rel, string[]> = {
  contrast: ['However,', 'By contrast,', 'In contrast,'],
  result: ['Therefore,', 'Consequently,', 'As a result,', 'Thus,'],
  addition: ['Moreover,', 'In addition,', 'Furthermore,', 'Additionally,'],
  example: ['For example,', 'For instance,'],
  sequence: ['Later,', 'Afterward,', 'Subsequently,', 'Eventually,'],
  similarity: ['Similarly,', 'Likewise,'],
};
/** relations too close to use as distractors for each other */
export const NEAR: Record<Rel, Rel[]> = { contrast: [], result: [], addition: ['similarity', 'example'], example: ['addition'], sequence: ['result'], similarity: ['addition'] };
export interface Pair { genre: Genre; rel: Rel; lvl: number; a: string; b: string }
export const PAIRS: Pair[] = [
  { genre: 'science', rel: 'contrast', lvl: 2, a: 'Most desert plants store water in thick, fleshy leaves that swell after rare rains.', b: 'the creosote bush has small, waxy leaves and survives droughts by slowing its growth almost to a stop.' },
  { genre: 'history-social', rel: 'contrast', lvl: 3, a: 'The town council expected the new market hall to draw crowds from the surrounding farms when it opened in 1890.', b: 'attendance in its first year was so low that several of its stalls stood empty for months.' },
  { genre: 'literature', rel: 'contrast', lvl: 3, a: 'Critics praised the novelist Anya Kral\'s early books for their crowded, noisy city scenes.', b: 'her final novel takes place almost entirely in a silent farmhouse with only two characters.' },
  { genre: 'humanities', rel: 'contrast', lvl: 2, a: 'Many of the composer\'s early works were written for large orchestras with dozens of players.', b: 'her later pieces call for a single violin or, at most, a small group of strings.' },
  { genre: 'science', rel: 'result', lvl: 2, a: 'The lake\'s surface froze unusually early that winter, cutting off sunlight to the water below for several months.', b: 'the algae that the lake\'s small fish depend on declined sharply before spring.' },
  { genre: 'history-social', rel: 'result', lvl: 3, a: 'The new bridge cut the trip from the island to the mainland from an hour by ferry to ten minutes by car.', b: 'many families who had worked on the island for generations began commuting to jobs in the city.' },
  { genre: 'humanities', rel: 'result', lvl: 3, a: 'The theater\'s old wooden stage could not support heavy sets, so designers relied on painted backdrops and lighting.', b: 'productions there became known for their inventive use of light rather than elaborate scenery.' },
  { genre: 'literature', rel: 'result', lvl: 4, a: 'The poet lost much of her eyesight in her forties and began composing her poems aloud rather than on paper.', b: 'her later work relies heavily on rhythm and repeated sounds that are easy to hold in memory.' },
  { genre: 'science', rel: 'addition', lvl: 2, a: 'Honeybees use a "waggle dance" to tell other bees the direction of a food source.', b: 'the length of the dance tells them roughly how far away the food is.' },
  { genre: 'history-social', rel: 'addition', lvl: 3, a: 'The city\'s first public schools offered free lessons in reading and arithmetic to children of every background.', b: 'they provided a hot midday meal, which for many students was the most filling meal of the day.' },
  { genre: 'humanities', rel: 'addition', lvl: 3, a: 'The architect designed the library\'s reading room with tall windows to fill it with natural light.', b: 'she placed the shelves along the inner walls so that direct sunlight would not fade the books.' },
  { genre: 'literature', rel: 'addition', lvl: 4, a: 'Readers soon learn not to trust the novel\'s narrator, who often misremembers the dates of important events in her family\'s history.', b: 'she contradicts herself about who was present at her brother\'s wedding.' },
  { genre: 'science', rel: 'example', lvl: 2, a: 'Some animals change color with the seasons to stay hidden from predators.', b: 'the snowshoe hare grows a white coat in winter and a brown coat in summer.' },
  { genre: 'history-social', rel: 'example', lvl: 3, a: 'Many nineteenth-century towns were named after the industries that first brought settlers to them.', b: 'the town of Millbrook took its name from the grain mill built beside its creek in 1832.' },
  { genre: 'humanities', rel: 'example', lvl: 2, a: 'Some painters work with materials found in their surroundings instead of store-bought paints.', b: 'the artist Ola Benn mixes her pigments from clays she collects along the riverbank near her studio.' },
  { genre: 'literature', rel: 'example', lvl: 3, a: 'The playwright often gives minor characters the most memorable lines.', b: 'in his best-known comedy, the only line most audiences quote belongs to a gardener who appears in a single scene.' },
  { genre: 'science', rel: 'sequence', lvl: 2, a: 'The volcanic island first appeared above the ocean\'s surface in 1963 as a mound of ash and rock.', b: 'mosses, grasses and even small shrubs took root on its slopes as seabirds brought seeds there.' },
  { genre: 'history-social', rel: 'sequence', lvl: 3, a: 'The union began in 1902 as a small club where dock workers met to share news about wages.', b: 'it grew into an organization that negotiated contracts for workers at every port in the region.' },
  { genre: 'humanities', rel: 'sequence', lvl: 3, a: 'The sculptor first shaped each figure in wax, working out every fold of its clothing.', b: 'she covered the wax in clay, melted it out, and poured bronze into the hollow it left behind.' },
  { genre: 'literature', rel: 'sequence', lvl: 2, a: 'The novelist wrote the first draft of her book in a single summer at her family\'s cabin.', b: 'she spent three years revising it, cutting nearly half of the original chapters.' },
  { genre: 'science', rel: 'similarity', lvl: 3, a: 'Some desert beetles collect drinking water by tilting their bumpy backs into the morning fog, so that droplets gather and roll toward their mouths.', b: 'certain cacti channel dew along the ridges of their stems, guiding each drop down to their shallow roots.' },
  { genre: 'history-social', rel: 'similarity', lvl: 3, a: 'Early settlers in the valley built their homes from the stones they cleared out of their fields.', b: 'settlers along the coast built with driftwood that washed up on the nearby beaches.' },
  { genre: 'humanities', rel: 'similarity', lvl: 4, a: 'The jazz pianist built many of her solos by slowly varying a single short phrase.', b: 'the painter in the same circle filled entire canvases by repeating one shape in slightly different colors.' },
  { genre: 'literature', rel: 'similarity', lvl: 4, a: 'In the poet\'s early collection, each poem ends by returning to the image it began with.', b: 'the chapters of her only novel close on the same scene that opens them.' },
];

/** Boundaries. `w` is the word before the blank; `lead` is the text before it; `rest` follows the blank. */
export type BoundaryKind = 'ic-ic' | 'appositive' | 'intro' | 'subject-verb';
export interface BFrame { kind: BoundaryKind; genre: Genre; lead: string; w: string; rest: string; after: string }
export const BOUNDARIES: BFrame[] = [
  { kind: 'ic-ic', genre: 'science', lead: 'The oldest trees in the grove are more than two thousand years', w: 'old', rest: 'some were already tall when the nearby city was founded.', after: 'Researchers date them by counting growth rings in thin samples taken from their trunks.' },
  { kind: 'ic-ic', genre: 'history-social', lead: 'The canal took eleven years to finish and cost far more than its planners', w: 'predicted', rest: 'within a decade, though, tolls had repaid the entire debt.', after: 'Its success encouraged neighboring towns to propose canals of their own.' },
  { kind: 'ic-ic', genre: 'literature', lead: 'The novelist wrote her first book by hand in a series of school', w: 'notebooks', rest: 'she typed the final draft only after a publisher asked to see it.', after: 'Those notebooks are now kept in a university library.' },
  { kind: 'ic-ic', genre: 'humanities', lead: 'The choir rehearses in an old stone church with remarkable', w: 'acoustics', rest: 'even a whisper from the altar can be heard at the back.', after: 'Visiting musicians often ask to record there.' },
  { kind: 'appositive', genre: 'science', lead: 'The axolotl—a salamander that keeps its gills and other juvenile features throughout its', w: 'life', rest: 'can regrow lost limbs and even parts of its heart.', after: 'Scientists study it in hopes of learning how such healing works.' },
  { kind: 'appositive', genre: 'history-social', lead: 'The Dunmore Library—built in 1889 with money raised entirely by the town\'s factory', w: 'workers', rest: 'remains one of the oldest public libraries in the region.', after: 'Its reading room still has its original oak tables.' },
  { kind: 'appositive', genre: 'literature', lead: 'The poet Lena Marr—whose first collection was rejected by eleven', w: 'publishers', rest: 'later won the region\'s most important literary prize.', after: 'She often told young writers to keep every rejection letter.' },
  { kind: 'appositive', genre: 'humanities', lead: 'The weaver Tomas Reyes—known for patterns that combine traditional designs with bright modern', w: 'colors', rest: 'opened a workshop to teach his methods to local students.', after: 'Several of his former students now sell their own work.' },
  { kind: 'intro', genre: 'science', lead: 'Because the moth\'s wings are covered in tiny scales that scatter', w: 'light', rest: 'they shimmer blue when seen from some angles and brown from others.', after: 'The effect may help the moth confuse predators in flight.' },
  { kind: 'intro', genre: 'history-social', lead: 'Although the town\'s first newspaper printed only a few hundred copies a', w: 'week', rest: 'its reports were read aloud in shops and passed from hand to hand.', after: 'Historians now use its pages to reconstruct daily life in the town.' },
  { kind: 'intro', genre: 'literature', lead: 'When the playwright revised her comedy for its second', w: 'production', rest: 'she cut the opening scene and added a new final act.', after: 'Most later productions have used this revised version.' },
  { kind: 'intro', genre: 'humanities', lead: 'After the museum moved its collection of maps to a larger', w: 'gallery', rest: 'visitors could finally see the oldest maps displayed side by side.', after: 'The new arrangement shows how the coastline was redrawn over three centuries.' },
  { kind: 'subject-verb', genre: 'science', lead: 'The team of researchers studying the migration routes of monarch', w: 'butterflies', rest: 'attached tiny tags to more than two thousand insects.', after: 'The tags revealed stopover sites that no one had recorded before.' },
  { kind: 'subject-verb', genre: 'history-social', lead: 'The letters exchanged between the two founders of the town\'s first', w: 'bank', rest: 'reveal frequent disagreements about how much to lend to local farmers.', after: 'The letters were donated to the town archive in 1975.' },
  { kind: 'subject-verb', genre: 'literature', lead: 'A collection of short stories set in the fishing villages of the northern', w: 'coast', rest: 'won the prize for the best first book of the year.', after: 'Its author had worked on fishing boats for a decade.' },
  { kind: 'subject-verb', genre: 'humanities', lead: 'The photographs that the architect took of her buildings during', w: 'construction', rest: 'show how often she changed her plans as the work went on.', after: 'Some of her final designs differ greatly from her first drawings.' },
];

/** Form, structure and sense. */
export interface AgreeFrame { genre: Genre; sg: string; pl: string; mid: string; pred: string; verb: 'be' | 'have'; after: string }
export const AGREE: AgreeFrame[] = [
  { genre: 'science', sg: 'The population', pl: 'The populations', mid: 'of salmon in the river\'s upper branches', pred: 'larger now than at any time in the past twenty years.', verb: 'be', after: 'Biologists credit the removal of two old dams downstream.' },
  { genre: 'history-social', sg: 'The diary', pl: 'The diaries', mid: 'of the mill workers who organized the town\'s first strike', pred: 'kept in a climate-controlled room at the historical society today.', verb: 'be', after: 'Researchers must request permission from the society\'s archivist before reading.' },
  { genre: 'literature', sg: 'The final chapter', pl: 'The final chapters', mid: 'of the novelist\'s celebrated trilogy about three sisters', pred: 'puzzled readers for decades with an unexpected shift in tone.', verb: 'have', after: 'Several critics have proposed new readings in recent years.' },
  { genre: 'humanities', sg: 'The collection', pl: 'The collections', mid: 'of hand-painted tiles from the old railway station', pred: 'on display in the city museum this year.', verb: 'be', after: 'Each tile shows a different town along the line.' },
  { genre: 'science', sg: 'The nest', pl: 'The nests', mid: 'of the weaver birds in the acacia trees near the river', pred: 'withstood several strong storms without falling apart.', verb: 'have', after: 'The birds knot each strand of grass by hand, or rather by beak.' },
  { genre: 'literature', sg: 'The narrator', pl: 'The narrators', mid: 'of the author\'s strange and dreamlike early stories', pred: 'often unsure whether the events described really happened.', verb: 'be', after: 'That uncertainty became a mark of the author\'s style.' },
];
export interface PronFrame { genre: Genre; text: string; number: 'sg' | 'pl'; after: string }
export const PRONOUN: PronFrame[] = [
  { genre: 'science', text: 'The octopus can change the color and texture of ______ skin in a fraction of a second.', number: 'sg', after: 'Researchers think this ability helps it hide from predators and surprise its prey on the reef.' },
  { genre: 'history-social', text: 'In 1921, the town\'s two newspapers merged and combined ______ printing presses in a single building.', number: 'pl', after: 'The new paper was soon the largest in the region and stayed in print for decades.' },
  { genre: 'literature', text: 'Readers of the novel often notice that the story never names ______ main setting, a small river town.', number: 'sg', after: 'Scholars have proposed several real towns as models for this unnamed place.' },
  { genre: 'humanities', text: 'The two architects built ______ reputations on schools and libraries that let in as much daylight as possible.', number: 'pl', after: 'Many of their buildings are still in use today and remain bright and comfortable.' },
];
export interface ModFrame { genre: Genre; mod: string; agent: string; wrong: [string, string, string]; after: string }
export const MODIFIER: ModFrame[] = [
  { genre: 'science', mod: 'After studying the river\'s water samples for two years,', agent: 'the scientists concluded that the new filters were working.', wrong: ['the conclusion was that the new filters were working.', 'the new filters were shown by the scientists to be working.', 'the samples showed the scientists that the new filters were working.'], after: 'They recommended installing the same filters in two other towns along the river, where the water had shown similar problems.' },
  { genre: 'history-social', mod: 'Searching through boxes of old shipping records,', agent: 'the historian found the name of the ship that had carried her great-grandparents.', wrong: ['the name of the ship that had carried her great-grandparents was found by the historian.', 'the ship that had carried her great-grandparents was named in a record the historian found.', 'a record naming the ship that had carried her great-grandparents turned up for the historian.'], after: 'The discovery opened a new line of research for her, and she soon traced the family\'s route across the ocean.' },
  { genre: 'literature', mod: 'Writing late at night after long days at the factory,', agent: 'the poet completed his first collection in less than a year.', wrong: ['the first collection was completed by the poet in less than a year.', 'the poet\'s first collection took less than a year to complete.', 'less than a year was all the poet needed to complete his first collection.'], after: 'The collection describes the lives of his fellow workers and the long shifts they shared on the factory floor.' },
  { genre: 'humanities', mod: 'Restored to its original colors,', agent: 'the mural now shows details that had been hidden for a century.', wrong: ['visitors can now see details in the mural that had been hidden for a century.', 'the restorers revealed details in the mural that had been hidden for a century.', 'details hidden for a century can now be seen in the mural.'], after: 'The faces of the workers painted in its background, long lost under layers of smoke and grime, are visible once again for the first time in decades.' },
];

/** Words in context: a sense, words with that sense, and frames whose clue requires it. */
export const LEXICON: Record<string, string[]> = {
  doubtful: ['skeptical', 'doubtful', 'unconvinced'],
  confirm: ['corroborate', 'confirm', 'substantiate'],
  brief: ['fleeting', 'transient', 'short-lived'],
  plentiful: ['abundant', 'plentiful', 'ample'],
  scarce: ['scarce', 'sparse', 'meager'],
  praise: ['laud', 'commend', 'acclaim'],
  criticize: ['criticize', 'disparage', 'fault'],
  hide: ['conceal', 'obscure', 'mask'],
  reveal: ['reveal', 'expose', 'disclose'],
  careful: ['meticulous', 'painstaking', 'scrupulous'],
  careless: ['haphazard', 'careless', 'slapdash'],
  lasting: ['enduring', 'durable', 'lasting'],
  new: ['novel', 'innovative', 'unprecedented'],
  common: ['commonplace', 'ordinary', 'routine'],
};
export interface WicFrame { genre: Genre; sense: string; lvl: number; text: string }
export const WIC: WicFrame[] = [
  { genre: 'science', sense: 'doubtful', lvl: 3, text: 'When the young astronomer first reported a faint new moon around the planet, many of her colleagues were ______: they suspected that the spot in her images was only a flaw in the telescope\'s lens.' },
  { genre: 'science', sense: 'confirm', lvl: 3, text: 'The first team\'s measurements suggested that the glacier was shrinking faster than expected, and a second team using a different method later produced results that ______ the original finding.' },
  { genre: 'humanities', sense: 'brief', lvl: 2, text: 'The artist builds sculptures out of ice and leaves them outdoors, where they melt within hours. She says the ______ nature of her work reminds viewers that nothing lasts.' },
  { genre: 'science', sense: 'plentiful', lvl: 2, text: 'In years when the oak trees produce ______ acorns, the forest\'s mice have so much food that their numbers can double by the following spring. In lean years, by contrast, many go hungry.' },
  { genre: 'history-social', sense: 'scarce', lvl: 3, text: 'Because paper was ______ in the colony during the war, clerks wrote their records in tiny script and reused the backs of old letters. Some ledgers from those years have writing in every margin.' },
  { genre: 'literature', sense: 'praise', lvl: 3, text: 'Reviewers who had dismissed the poet\'s early work went on to ______ her final collection, calling it the finest book of the decade. Several of them admitted that they had misjudged her from the start.' },
  { genre: 'history-social', sense: 'criticize', lvl: 3, text: 'The mayor\'s plan had many supporters, but some residents were quick to ______ it for ignoring neighborhoods that had no bus service at all. They argued that those areas needed help first.' },
  { genre: 'science', sense: 'hide', lvl: 2, text: 'The flounder\'s mottled skin helps it ______ itself against the sandy seafloor, so passing predators rarely notice it. The fish can even shift its pattern slightly to match a new patch of sand or gravel.' },
  { genre: 'history-social', sense: 'reveal', lvl: 3, text: 'For decades, the company\'s early history was known only through its own advertisements, but letters found in an attic ______ how close it came to failing in its first year.' },
  { genre: 'humanities', sense: 'careful', lvl: 4, text: 'Restorers spent three years on the damaged tapestry, matching each repaired thread to the original in color and thickness. Their ______ work left no visible trace of the tears.' },
  { genre: 'humanities', sense: 'careless', lvl: 3, text: 'Earlier owners had stored the paintings in a ______ way, stacking them in a damp basement with no protection, and several were badly warped. The museum that later bought them spent years repairing the damage.' },
  { genre: 'literature', sense: 'lasting', lvl: 3, text: 'Although the novel sold poorly when it appeared, its ______ influence is clear: writers still borrow its structure more than a century later. Few books from its decade are read as widely today.' },
  { genre: 'science', sense: 'new', lvl: 4, text: 'Earlier bridges in the region relied on heavy stone arches, so the engineer\'s design, which hung the roadway from thin steel cables, was considered truly ______ when it was unveiled.' },
  { genre: 'history-social', sense: 'common', lvl: 3, text: 'Today the town\'s annual river festival is ______, an event most residents attend without a second thought, but its first organizers had to fight for permission to hold it.' },
];

/** Research notes for rhetorical synthesis. */
export interface NoteCard { id: string; genre: Genre; notes: { id: string; tag: string; text: string }[]; sentences: { text: string; facts: string[] }[]; goals: { text: string; requires: string[] }[] }
export const NOTE_CARDS: NoteCard[] = [
  { id: 'nc-bridge', genre: 'humanities',
    notes: [{ id: 'a1', tag: 'what', text: 'The Arlen Bridge is a footbridge over the Tessa River.' }, { id: 'a2', tag: 'when', text: 'It was completed in 1998.' }, { id: 'a3', tag: 'who', text: 'It was designed by the engineer Ruth Maki.' }, { id: 'a4', tag: 'feature', text: 'Its deck hangs from a single tilted arch.' }, { id: 'a5', tag: 'effect', text: 'The arch casts no shadow on the river at midday, protecting fish that feed near the surface.' }],
    sentences: [{ text: 'Completed in 1998, the Arlen Bridge is a footbridge over the Tessa River.', facts: ['a1', 'a2'] }, { text: 'The engineer Ruth Maki designed the Arlen Bridge, whose deck hangs from a single tilted arch.', facts: ['a3', 'a4'] }, { text: 'Because its single tilted arch casts no shadow at midday, the Arlen Bridge protects fish that feed near the river\'s surface.', facts: ['a4', 'a5'] }, { text: 'The Arlen Bridge, designed by Ruth Maki, crosses the Tessa River.', facts: ['a1', 'a3'] }],
    goals: [{ text: 'The student wants to explain how the bridge\'s design benefits the river\'s fish.', requires: ['feature', 'effect'] }, { text: 'The student wants to emphasize when the bridge was completed.', requires: ['when'] }, { text: 'The student wants to identify the bridge\'s designer and describe its structure.', requires: ['who', 'feature'] }] },
  { id: 'nc-bees', genre: 'science',
    notes: [{ id: 'b1', tag: 'what', text: 'The mason bee is a solitary bee that nests in small holes in wood or stone.' }, { id: 'b2', tag: 'feature', text: 'Unlike honeybees, mason bees do not live in hives or make honey.' }, { id: 'b3', tag: 'effect', text: 'A single mason bee can pollinate as many flowers in a day as dozens of honeybees.' }, { id: 'b4', tag: 'use', text: 'Orchard growers place nesting tubes near fruit trees to attract them.' }, { id: 'b5', tag: 'when', text: 'Mason bees are active only for a few weeks each spring.' }],
    sentences: [{ text: 'Mason bees, which nest in small holes rather than hives, do not make honey.', facts: ['b1', 'b2'] }, { text: 'Because one mason bee can pollinate as many flowers as dozens of honeybees, orchard growers place nesting tubes near fruit trees to attract them.', facts: ['b3', 'b4'] }, { text: 'Mason bees, which nest in small holes in wood or stone, are active for only a few weeks each spring.', facts: ['b1', 'b5'] }, { text: 'The mason bee is a solitary bee that builds its nest in a small hole in a piece of wood or stone.', facts: ['b1'] }],
    goals: [{ text: 'The student wants to explain why orchard growers try to attract mason bees.', requires: ['effect', 'use'] }, { text: 'The student wants to emphasize a difference between mason bees and honeybees.', requires: ['feature'] }, { text: 'The student wants to emphasize how briefly mason bees are active.', requires: ['when'] }] },
  { id: 'nc-strike', genre: 'history-social',
    notes: [{ id: 'c1', tag: 'what', text: 'In 1912, textile workers in the town of Ravel went on strike.' }, { id: 'c2', tag: 'cause', text: 'The mill owners had cut wages by ten percent.' }, { id: 'c3', tag: 'length', text: 'The strike lasted nine weeks.' }, { id: 'c4', tag: 'result', text: 'The owners restored the original wages and agreed to a shorter workweek.' }, { id: 'c5', tag: 'who', text: 'Most of the strikers were young women.' }],
    sentences: [{ text: 'Textile workers in Ravel went on strike in 1912 after the mill owners cut wages by ten percent.', facts: ['c1', 'c2'] }, { text: 'After a nine-week strike, Ravel\'s mill owners restored the original wages and agreed to a shorter workweek.', facts: ['c3', 'c4'] }, { text: 'Most of the workers who went on strike in Ravel in 1912 were young women.', facts: ['c1', 'c5'] }, { text: 'The strike that textile workers in Ravel began in 1912 lasted for nine weeks.', facts: ['c1', 'c3'] }],
    goals: [{ text: 'The student wants to explain what caused the strike.', requires: ['cause'] }, { text: 'The student wants to emphasize what the strike achieved.', requires: ['result'] }, { text: 'The student wants to identify who most of the strikers were.', requires: ['who'] }] },
  { id: 'nc-novel', genre: 'literature',
    notes: [{ id: 'd1', tag: 'what', text: 'The Salt Kitchen is a novel by the writer Ines Okafor.' }, { id: 'd2', tag: 'when', text: 'It was published in 2009.' }, { id: 'd3', tag: 'feature', text: 'Each chapter is narrated by a different member of one family.' }, { id: 'd4', tag: 'setting', text: 'The story takes place in a restaurant over a single night.' }, { id: 'd5', tag: 'reception', text: 'It won a national prize for first novels.' }],
    sentences: [{ text: 'Ines Okafor\'s 2009 novel The Salt Kitchen won a national prize for first novels.', facts: ['d1', 'd2', 'd5'] }, { text: 'In The Salt Kitchen, each chapter is narrated by a different member of a single family.', facts: ['d1', 'd3'] }, { text: 'Ines Okafor\'s novel The Salt Kitchen takes place in a restaurant over a single night.', facts: ['d1', 'd4'] }, { text: 'The Salt Kitchen, by Ines Okafor, was published in 2009.', facts: ['d1', 'd2'] }],
    goals: [{ text: 'The student wants to describe how the novel is narrated.', requires: ['feature'] }, { text: 'The student wants to emphasize the novel\'s critical success.', requires: ['reception'] }, { text: 'The student wants to describe where and when the story takes place.', requires: ['setting'] }] },
];
