"""Dated hooks an outreach lead can actually plan around.

Every entry here recurs on a RULE, not on a date somebody typed in. The page
resolves each rule against the real calendar when it loads, so the dates are
always for the next occurrence and never go stale. The rule is shown next to the
date so you can check it yourself.

Rule forms (resolved in JS by nextDate()):
  ("fixed", month, day)            a calendar date, e.g. Pi Day
  ("nth", month, n, weekday)       nth weekday of a month; n = -1 means last
  ("weekOf", month, day)           the Sun-Sat week containing that date
  ("fullWeek", month, n)           the nth full Sun-Sat week of a month
  ("month", month)                 a whole month
  ("range", m1, d1, m2, d2)        an explicit span, may cross a year end
  ("nthAfter", month, n, weekday, offsetDays)   e.g. Giving Tuesday
weekday: 0=Sunday .. 6=Saturday

Fields: key, name, rule, run by, url, what it is, what a robotics team does with
it, lead time in weeks, venue keys it suits, category, audience, hours, reach.
"""

EVENTS = [
("kickoff", "FIRST Kickoff", ("nth", 1, 1, 6), "FIRST", "https://www.firstinspires.org",
 "The Saturday the new FRC game is revealed worldwide and build season starts.",
 "Host a public watch party. Invite rookie teams, sponsors, press and families -- it is the one day of the year outsiders understand what you do.",
 4, ["highschool","cc","univ","library","museum","maker","media","chamber"], "Community", "All ages", 12, 80),

("mentormonth", "National Mentoring Month", ("month", 1), "MENTOR", "https://www.mentoring.org",
 "The national month for recruiting and recognising mentors.",
 "The month schools and clubs are most receptive to a mentoring offer. Send your FLL mentoring pitch in the first week of January.",
 3, ["elem","middle","bgc","ymca","afterschool","fll","fourh","title1"], "Mentoring", "Elementary (K-5)", 20, 15),

("mlkday", "MLK Day of Service", ("nth", 1, 3, 1), "AmeriCorps", "https://americorps.gov/newsroom/events/mlk-day",
 "The federal holiday designated as a national day of service.",
 "Every food bank, shelter and community centre runs a project and is short of hands. Register in December; sites fill.",
 5, ["foodbank","habitat","shelterfam","housing","faith","city","parks","bgc"], "Community Service", "All ages", 10, 60),

("iwgs", "International Day of Women and Girls in Science", ("fixed", 2, 11), "United Nations", "https://www.un.org/en/observances/women-and-girls-in-science-day",
 "A UN observance marking the gap between women's and men's participation in science.",
 "A dated, named reason for a school to say yes to a girls-in-STEM session. Pitch it in December.",
 8, ["middle","elem","gs","library","museum","univ","cc","title1","bilingual"], "Equity", "Middle school (6-8)", 16, 45),

("scoutweek", "Scouting Anniversary Week", ("weekOf", 2, 8), "Scouting America", "https://www.scouting.org",
 "The week around the movement's founding, when troops run special programming.",
 "Troops want a merit-badge-shaped activity that week. Offer the Robotics merit badge requirements.",
 4, ["scouts","faith","parks","library"], "Workshop", "Middle school (6-8)", 10, 25),

("kindness", "Random Acts of Kindness Day", ("fixed", 2, 17), "Random Acts of Kindness Foundation", "https://www.randomactsofkindness.org",
 "A dated observance schools use for service-learning.",
 "Pair it with a toy-adaptation build or an assistive-device build, which is kindness with an engineering budget.",
 5, ["elem","middle","sped","hospital","library","faith","shelterfam"], "Accessibility", "Family", 12, 20),

("eweek", "Engineers Week", ("weekOf", 2, 22), "DiscoverE", "https://discovere.org",
 "The national week of engineering outreach, built around Washington's birthday.",
 "Free ready-made event kits with a national date attached. The fixed date is what gets a school to commit.",
 8, ["elem","middle","highschool","library","museum","cc","univ","manuf","tech","chamber","title1"], "Workshop", "Middle school (6-8)", 14, 90),

("girlday", "Introduce a Girl to Engineering Day", ("thuOfWeekOf", 2, 22), "DiscoverE", "https://discovere.org/girl-day",
 "The Thursday of Engineers Week, dedicated to girls in engineering.",
 "Bring women mentors and alumnae onto the floor. The mentors matter more than the activity.",
 8, ["middle","elem","gs","library","museum","univ","cc","title1","bilingual","housing"], "Equity", "Middle school (6-8)", 18, 50),

("iwd", "International Women's Day", ("fixed", 3, 8), "United Nations", "https://www.un.org/en/observances/womens-day",
 "A global observance widely marked by schools and employers.",
 "Sponsors and local employers run events this day and need speakers. Send two students.",
 6, ["tech","manuf","chamber","univ","cc","middle","highschool","media"], "Speaking", "Adults", 8, 70),

("gsweek", "Girl Scout Week", ("weekOf", 3, 12), "Girl Scouts of the USA", "https://www.girlscouts.org",
 "The week containing the Girl Scout birthday, when troops run badge activities.",
 "Troops are actively booking badge sessions. The robotics badges already exist -- you are helping them earn something specific.",
 6, ["gs","library","elem","middle","parks","faith"], "Equity", "Elementary (K-5)", 14, 30),

("piday", "Pi Day", ("fixed", 3, 14), "widely observed", "https://www.nctm.org",
 "The maths observance every school already marks.",
 "The easiest single-day school booking of the year. Bring a wheel-circumference demo and let kids measure the robot.",
 4, ["elem","middle","highschool","library","museum","homeschool","afterschool"], "Demo", "Elementary (K-5)", 6, 120),

("readacross", "Read Across America Day", ("fixed", 3, 2), "National Education Association", "https://www.nea.org/readacross",
 "The national school reading day.",
 "Elementary schools open their doors to visitors that day. Read an engineering picture book, then show the robot.",
 5, ["elem","library","title1","bilingual","afterschool","homeschool"], "Speaking", "Elementary (K-5)", 6, 80),

("autism", "World Autism Awareness Day", ("fixed", 4, 2), "United Nations", "https://www.un.org/en/observances/autism-day",
 "A UN observance marked by schools and disability organisations.",
 "Time an adaptive-controller or sensory-friendly demo to it, planned with the special-education staff, not for them.",
 10, ["sped","hospital","library","museum","dhh","shelterfam"], "Accessibility", "Family", 16, 25),

("roboweek", "National Robotics Week", ("fullWeek", 4, 1), "National Robotics Week", "https://www.nationalroboticsweek.org",
 "The national week of robotics events, first full week of April.",
 "Register your own event on the national map. It costs nothing and it reads well in an Impact Award submission.",
 6, ["library","museum","elem","middle","highschool","cc","univ","maker","city","chamber","media","parks"], "Demo", "All ages", 18, 300),

("libweek", "National Library Week", ("fullWeek", 4, 2), "American Library Association", "https://www.ala.org/conferencesevents/celebrationweeks/natlibraryweek",
 "The ALA's national week, when branches run extra public programming.",
 "Branches are looking for programming that week and have a budget line for it. Ask in January.",
 8, ["library","homeschool","afterschool","title1","bilingual"], "Demo", "All ages", 8, 60),

("youngchild", "Week of the Young Child", ("fullWeek", 4, 1), "NAEYC", "https://www.naeyc.org/events/woyc",
 "The early-childhood sector's national week.",
 "Pre-K and kindergarten programmes run family events. A simple push-button robot lands better here than the competition bot.",
 6, ["elem","library","bgc","ymca","housing","afterschool","title1"], "Workshop", "Family", 10, 45),

("volweek", "National Volunteer Week", ("fullWeek", 4, 3), "Points of Light", "https://www.pointsoflight.org/national-volunteer-week",
 "The national week recognising volunteers.",
 "Nonprofits schedule group projects this week and publicise them. Easy to book a whole-team service day.",
 4, ["foodbank","habitat","shelter","shelterfam","city","parks","faith","housing"], "Community Service", "All ages", 12, 50),

("gysd", "Global Youth Service Day", ("fullWeek", 4, 3), "Youth Service America", "https://ysa.org",
 "The largest service event focused specifically on young people.",
 "Youth-led is the point, so students plan it. Grants are sometimes attached -- check in January.",
 8, ["city","parks","foodbank","housing","faith","bgc","afterschool","title1"], "Community Service", "High school (9-12)", 14, 60),

("earthday", "Earth Day", ("fixed", 4, 22), "EarthDay.org", "https://www.earthday.org",
 "The global environmental observance.",
 "Cities and parks run events and want exhibitors. Bring a robot with a recycling-sort demo and it fits the theme honestly.",
 8, ["city","parks","museum","library","elem","middle","fourh","market"], "Demo", "All ages", 10, 200),

("arborday", "Arbor Day", ("nth", 4, -1, 5), "Arbor Day Foundation", "https://www.arborday.org",
 "The last Friday of April, marked by tree-planting projects.",
 "A straightforward whole-team service day that parks departments organise for you.",
 4, ["parks","city","fourh","faith","habitat"], "Community Service", "All ages", 8, 30),

("teacherweek", "Teacher Appreciation Week", ("fullWeek", 5, 1), "National PTA", "https://www.pta.org",
 "The national week recognising teachers.",
 "The week to run teacher professional development, or simply to thank the teachers who host you. Both pay off.",
 6, ["elem","middle","highschool","title1","rural","cc","bilingual"], "Workshop", "Adults", 12, 30),

("memorial", "Memorial Day parades", ("nth", 5, -1, 1), "city and town governments", "https://www.usa.gov/local-governments",
 "The last Monday of May; nearly every town runs a parade.",
 "Parade entries are usually free for youth groups and applications close weeks ahead. Robot on a trailer, students handing out flyers.",
 8, ["city","parks","chamber","faith","rotary"], "Community", "All ages", 12, 500),

("worldenv", "World Environment Day", ("fixed", 6, 5), "United Nations", "https://www.unep.org/events/un-day/world-environment-day",
 "The UN's principal environmental observance, marked worldwide.",
 "Useful outside the United States, where the American observances do not apply.",
 6, ["city","parks","museum","library","market","fourh"], "Demo", "All ages", 10, 120),

("juneteenth", "Juneteenth", ("fixed", 6, 19), "widely observed", "https://www.usa.gov/local-governments",
 "A federal holiday with large community festivals in many cities.",
 "Community festivals want family activities. Ask the organising committee, usually run through the city or a community group.",
 10, ["city","parks","faith","housing","chamber","library"], "Community", "Family", 12, 250),

("july4", "Fourth of July parades and festivals", ("fixed", 7, 4), "city and town governments", "https://www.usa.gov/local-governments",
 "Independence Day; parades and festivals in nearly every town.",
 "The biggest single audience of the year for most teams. Applications typically close in May.",
 10, ["city","parks","chamber","fair","faith","rotary"], "Community", "All ages", 14, 800),

("nno", "National Night Out", ("nth", 8, 1, 2), "National Association of Town Watch", "https://natw.org",
 "A community-police block-party night held in early August in most places.",
 "Neighbourhood events desperate for a kid-friendly activity. Contact the police community liaison, not the city.",
 6, ["city","parks","housing","faith","bgc","library"], "Demo", "Family", 10, 150),

("hispanic", "Hispanic Heritage Month", ("range", 9, 15, 10, 15), "widely observed", "https://www.hispanicheritagemonth.gov",
 "A federal observance running mid-September to mid-October.",
 "If your team has Spanish speakers, this is the month to run a bilingual family night. Translated handouts count as outreach too.",
 8, ["bilingual","title1","refugee","library","elem","middle","housing","faith"], "Equity", "Family", 14, 100),

("911day", "9/11 Day of Service", ("fixed", 9, 11), "9/11 Day", "https://911day.org",
 "The federally recognised day of service and remembrance.",
 "Food banks run their largest packing events of the year. Book a whole-team shift.",
 5, ["foodbank","shelterfam","habitat","city","faith","housing"], "Community Service", "All ages", 10, 50),

("mfgday", "Manufacturing Day", ("nth", 10, 1, 5), "The Manufacturing Institute", "https://www.creatorswanted.org",
 "The first Friday of October, when manufacturers open their doors to students.",
 "Your sponsors and prospective sponsors are already running tours that day. Ask to co-host, and bring the robot they helped fund.",
 8, ["manuf","tech","cc","highschool","chamber","media"], "Fundraising", "High school (9-12)", 10, 60),

("fourhweek", "National 4-H Week", ("fullWeek", 10, 1), "National 4-H Council", "https://4-h.org/about/national-4-h-week",
 "4-H's national week, when county programmes run showcase events.",
 "County agents plan this months ahead and will slot in a robotics demo if you ask by August.",
 8, ["fourh","rural","library","fair","parks","title1"], "Demo", "Family", 10, 80),

("worldspace", "World Space Week", ("range", 10, 4, 10, 10), "United Nations", "https://www.worldspaceweek.org",
 "A UN-declared week, 4-10 October every year, marked worldwide.",
 "Works internationally. Pair the robot with anything space-themed and schools will book it.",
 6, ["museum","library","elem","middle","highschool","univ","cc","homeschool"], "Demo", "All ages", 10, 120),

("earthsci", "Earth Science Week", ("fullWeek", 10, 2), "American Geosciences Institute", "https://www.earthsciweek.org",
 "A national week with free classroom materials.",
 "Rovers and sensors fit the theme without stretching. Free kits are ordered in August.",
 6, ["elem","middle","museum","library","parks","homeschool"], "Workshop", "Middle school (6-8)", 10, 45),

("ada", "Ada Lovelace Day", ("nth", 10, 2, 2), "Finding Ada", "https://findingada.com",
 "The second Tuesday of October, celebrating women in STEM.",
 "A dated hook for a girls-in-computing session, and it works internationally.",
 6, ["gs","middle","highschool","library","cc","univ","tech"], "Equity", "High school (9-12)", 12, 40),

("chemweek", "National Chemistry Week", ("fullWeek", 10, 3), "American Chemical Society", "https://www.acs.org/education/outreach/ncw.html",
 "The ACS's national week, run through local sections with free materials.",
 "Your local ACS section runs a public event and needs exhibitors. Co-exhibiting costs you nothing.",
 6, ["museum","library","cc","univ","elem","middle","market"], "Demo", "Family", 8, 90),

("ndeam", "Disability Employment Awareness Month", ("month", 10), "US Department of Labor", "https://www.dol.gov/agencies/odep/initiatives/ndeam",
 "The federal observance month for disability inclusion.",
 "The month to run an assistive-technology build and to talk about it publicly. Plan it with disabled people, not about them.",
 10, ["sped","dhh","hospital","univ","maker","library","shelterfam"], "Accessibility", "All ages", 20, 40),

("halloween", "Trunk-or-Treat and Halloween events", ("fixed", 10, 31), "schools, churches and city parks", "https://www.usa.gov/local-governments",
 "Community trunk-or-treat events, held on or near 31 October.",
 "A genuinely underrated slot: hundreds of families in two hours, and a robot handing out sweets is the best stall there.",
 5, ["faith","parks","city","elem","housing","bgc","library"], "Demo", "Family", 8, 300),

("familylit", "National Family Literacy Day", ("fixed", 11, 1), "National Center for Families Learning", "https://www.familieslearning.org",
 "A dated observance schools and libraries use for family events.",
 "Pair reading with building. Families who will not come to a robotics night will come to a literacy night.",
 6, ["library","elem","title1","bilingual","housing","afterschool"], "Community", "Family", 10, 70),

("native", "Native American Heritage Month", ("month", 11), "widely observed", "https://www.bie.edu",
 "The federal heritage month.",
 "Approach through the tribal education director, well ahead, and follow their lead on what is wanted. Do not arrive with a plan.",
 14, ["tribal","rural","library","museum","title1"], "Equity", "All ages", 20, 50),

("stemday", "National STEM/STEAM Day", ("fixed", 11, 8), "widely observed", "https://www.nsta.org",
 "An informal but widely marked school observance on 8 November.",
 "Low-stakes and easy to book, because teachers are looking for something to do that day anyway.",
 4, ["elem","middle","highschool","library","afterschool","homeschool","title1"], "Demo", "Elementary (K-5)", 6, 100),

("veterans", "Veterans Day", ("fixed", 11, 11), "city and town governments", "https://www.va.gov",
 "The federal holiday, with parades and school assemblies.",
 "Military base youth programmes and veterans' organisations run events. Route through the School Liaison Officer.",
 8, ["military","city","faith","senior","elem","middle"], "Community", "All ages", 8, 150),

("giving", "Giving Tuesday", ("nthAfter", 11, 4, 4, 5), "GivingTuesday", "https://www.givingtuesday.org",
 "The Tuesday after Thanksgiving, the largest online giving day of the year.",
 "The single best day to run your team's fundraiser. Set the page up in October, not the week before.",
 6, ["tech","manuf","chamber","rotary","city","media","faith"], "Fundraising", "Adults", 14, 400),

("csedweek", "Computer Science Education Week", ("weekOf", 12, 9), "Code.org", "https://hourofcode.com",
 "The week containing Grace Hopper's birthday; the Hour of Code runs inside it.",
 "The easiest first event a team can run. Curriculum is written, free and translated. Bring a robot so it is not just a browser tab.",
 8, ["elem","middle","highschool","library","bgc","afterschool","housing","title1","bilingual","refugee","juvenile"], "Workshop", "Elementary (K-5)", 8, 80),

("disability", "International Day of Persons with Disabilities", ("fixed", 12, 3), "United Nations", "https://www.un.org/en/observances/day-of-persons-with-disabilities",
 "A UN observance marked worldwide.",
 "A dated reason to deliver the adapted toys you built, and it works outside the United States.",
 10, ["sped","dhh","hospital","shelterfam","library","museum"], "Accessibility", "Family", 14, 35),

("summerread", "Library Summer Reading Programme", ("range", 6, 1, 8, 15), "public library systems", "https://www.publiclibraries.com/",
 "The June-to-August programme every public library system runs.",
 "The single most reliable booking on this board, and the one teams miss every year: slots are assigned in January and February.",
 20, ["library","housing","bgc","parks","title1","bilingual"], "Demo", "Elementary (K-5)", 8, 60),

("fllseason", "FIRST LEGO League season opens", ("fixed", 8, 1), "FIRST", "https://www.firstinspires.org/team-event-search",
 "The FLL season opens in August; qualifiers run November to January.",
 "August is when local FLL teams discover they have no technical mentor. Email your Program Delivery Partner then, not in October.",
 4, ["fll","elem","middle","library","afterschool","fourh","title1","rural"], "Mentoring", "Elementary (K-5)", 24, 15),
]
