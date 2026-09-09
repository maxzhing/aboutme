"""Exactly how to apply, per venue type.

steps  -- what you actually do, in order
asks   -- what they will want from you before they say yes
reply  -- how long a reply normally takes, and what to do when it doesn't come
gotcha -- the thing that kills these bookings
"""

HOWTO = {
"library": (
 ["Open the library system's site and find the branch nearest you, then its Programming or Youth Services page.",
  "Email the Youth Services or Programming Librarian directly. Do not use the general contact form -- it goes to circulation.",
  "Propose two or three specific dates and a length. Librarians book in slots, so 'a Tuesday in March, 4-5.30pm' beats 'sometime in spring'.",
  "Ask whether they publicise it or you do. They almost always do, and their mailing list is larger than yours.",
  "Confirm table count, floor space and whether you can use a power outlet."],
 "A one-paragraph description for their newsletter, an age range, a headcount cap, and whether adults must stay.",
 "3-10 days. Branch librarians are on desk shifts; a polite follow-up after a week is normal and expected.",
 "Summer slots are assigned in January and February. Ask in June and the answer is no, however good your pitch."),

"elem": (
 ["Search NCES for schools near you and note the district each belongs to.",
  "Email the principal AND the science or STEM lead in the same message -- the principal approves, the teacher hosts.",
  "Offer to fit an existing slot: an assembly, a STEM night, a career day, or one class period repeated.",
  "Expect a district volunteer form and possibly a background check for any adult mentor.",
  "Send a one-page flyer the school can put in its own newsletter."],
 "Proof of adult supervision, a district volunteer form, sometimes a certificate of insurance, and a photo-release plan.",
 "1-3 weeks in term time, longer near report cards. Nothing moves in the last two weeks of a term.",
 "Emailing only the front office. It stops there. Name a teacher in the subject line."),

"middle": (
 ["Find the school on NCES, then find the science department chair on the staff directory.",
  "Email the chair, copying the principal, offering a specific class period rather than an assembly.",
  "Ask which unit they are teaching; tie the robot to it (simple machines, forces, energy transfer).",
  "Offer to repeat the session across every period that day -- it costs you one day and reaches the whole grade.",
  "Ask them to introduce you to the after-school coordinator while you are there."],
 "A lesson outline, the standards it touches, adult supervision, and a district volunteer form.",
 "1-2 weeks. Teachers answer in the evening, so do not read a same-day silence as a no.",
 "Turning up with a competition robot and no activity. Middle schoolers need to touch something within five minutes."),

"highschool": (
 ["Find schools near you on NCES that have no robotics team.",
  "Email the CTE coordinator or engineering pathway teacher, not the principal.",
  "Lead with what you will give them, not what you want: equipment, a startup checklist, an offer to host their build.",
  "Ask to present at a club fair or an assembly before proposing a team.",
  "Introduce them to your FIRST Program Delivery Partner, who handles registration and grants."],
 "Evidence you will still be there in six months. A named student and a named mentor beats a team email address.",
 "2-4 weeks. Teachers running CTE programmes are stretched; a second email is not rude.",
 "Proposing a whole new team on first contact. Offer one session first and build from there."),

"title1": (
 ["Search NCES with the Title I filter on to find qualifying schools near you.",
  "Contact the district's federal programmes or family engagement office, not individual schools.",
  "Ask what they already run and offer to join it. These schools have more offers than capacity.",
  "Commit to bringing everything, including materials, translation and transport if you can.",
  "Ask about their family engagement calendar -- that is where the slot usually is."],
 "That you will cover all costs, that materials go home with students, and that you will come back.",
 "2-4 weeks through the district office.",
 "One-off visits. These schools are visited by well-meaning groups constantly. Offer a series or nothing."),

"rural": (
 ["Search NCES with the locale filter set to Rural.",
  "Email the superintendent directly. In small districts they answer their own mail and can say yes on the spot.",
  "Propose combining several schools into one event, since travel is the real cost for both sides.",
  "Offer a whole day, not an hour -- if you are driving two hours, make the trip count.",
  "Ask whether the district will cover a bus to bring students to you instead."],
 "Travel plan, timing that fits bus schedules, and adult supervision.",
 "Often within days. Small districts are far faster than large ones.",
 "Underestimating drive time and arriving after the buses have gone. Rural schools empty at 3pm sharp."),

"bilingual": (
 ["Find the district's bilingual or dual-language programme coordinator on the district site.",
  "Write in both languages if you can, or say plainly which languages your team speaks.",
  "Offer translated handouts as part of the package -- that alone is often the reason you get in.",
  "Propose a family evening rather than a school-day session; parents are the audience here.",
  "Ask whether the district has interpreters you can work alongside."],
 "Materials in the family languages, and confirmation your students can communicate without an interpreter.",
 "2-4 weeks.",
 "Machine-translated handouts. Someone will notice, and it costs you the relationship."),

"museum": (
 ["Use the ASTC directory to find your nearest science centre.",
  "Find its Public Programs, Education or Community Engagement contact -- not the general enquiry address.",
  "Propose joining an existing event first. Museums run family science weekends and want fresh exhibits.",
  "Ask for the exhibitor pack: it names load-in times, insurance and floor requirements.",
  "Expect to supply a certificate of insurance. Your school or team's policy usually covers it -- ask your mentor early."],
 "Certificate of insurance, a floor-space and power spec, a load-in plan, and adult supervision ratios.",
 "3-6 weeks, and they plan public programmes 3-12 months ahead.",
 "Leaving insurance to the last week. It is the single most common reason a museum booking collapses."),

"cc": (
 ["Find community colleges near you through the AACC site or College Navigator.",
  "Contact the STEM outreach, dual-enrolment or community education office.",
  "Ask about their existing K-12 pipeline events rather than proposing something new.",
  "Offer your students as demonstrators for their recruitment events -- they need young faces.",
  "Ask about shop and machine access in return. This partnership usually runs both ways."],
 "A short description, insurance if you use their shop, and a named adult contact.",
 "2-4 weeks in term, much slower over the summer.",
 "Missing that community colleges often have exactly the machine tools you lack. Ask."),

"univ": (
 ["Open College Navigator, filter to engineering programmes within your travel radius.",
  "On the university site look for K-12 Outreach, Pre-College Programs, or Community Engagement.",
  "Email that office rather than a professor. Outreach offices exist to say yes to this.",
  "Offer two shapes: you run it and they host, or you supply the robotics half of something they run.",
  "Ask about their summer camps -- they often need instructors and sometimes pay."],
 "Adult supervision, a risk assessment for anything with tools, and sometimes a background check.",
 "3-6 weeks in term. August and late December are dead.",
 "Emailing a professor. They are the wrong door and they will not forward it."),

"bgc": (
 ["Use the club finder on bgca.org to find your nearest club.",
  "Email the club's Program Director directly. National office will only redirect you.",
  "Ask what age group has the thinnest programming, then build around that answer.",
  "Offer a series rather than a visit. Clubs value people who come back.",
  "Expect a background check for adult mentors and a signed volunteer agreement."],
 "Background checks for adults, a volunteer agreement, and a consistent day and time.",
 "1-2 weeks. Clubs are decisive because they decide locally.",
 "Summer is when clubs need you most and have fewest volunteers. Offer June to August."),

"ymca": (
 ["Find your branch through the locator on ymca.org.",
  "Ask for the Youth Development Director or the school-age care coordinator.",
  "Target their before- and after-school care programme, which runs all year and needs content.",
  "Propose a fixed weekly slot rather than a one-off.",
  "Complete their volunteer screening early; it is usually the slowest step."],
 "Volunteer screening for anyone over 18, a consistent schedule, and materials that stay on site.",
 "1-3 weeks.",
 "Assuming the branch runs on the national calendar. Everything here is decided locally."),

"gs": (
 ["Enter your postcode on girlscouts.org to reach your regional council.",
  "Contact the council's Program department, which schedules badge days across many troops.",
  "Name the specific badge you are helping girls earn. The robotics badges already exist.",
  "Ask to be listed in their programme catalogue, which reaches every troop in the region.",
  "For a single troop instead, ask a leader you already know -- far faster than the council."],
 "Which badge, the age level, adult-to-girl ratios, and background checks for adults.",
 "Councils: 6-8 weeks. A single troop: under two weeks.",
 "Offering a generic robotics session. Tie it to a named badge and it becomes easy to say yes to."),

"scouts": (
 ["Use BeAScout to find troops and packs near you.",
  "Email the Scoutmaster or Cubmaster; council offices are slower and will refer you anyway.",
  "Work from the published Robotics merit badge requirements -- they are specific and public.",
  "A registered adult must counsel the badge, but your students do the teaching.",
  "Ask the council about a merit badge midway, where you reach dozens at once."],
 "A registered merit badge counsellor, the requirement list, and two-deep adult leadership.",
 "1-2 weeks for a troop; 4-6 weeks for a council midway.",
 "Signing off requirements without a registered counsellor. It invalidates the badge."),

"fourh": (
 ["Find your county extension office through 4-h.org.",
  "Email the 4-H Youth Development Agent. This is a paid role whose job is connecting youth programmes.",
  "Ask them who needs you -- they know every club in the county and will route you.",
  "Ask about the county fair, where 4-H runs exhibits and you can get a booth.",
  "Offer to help with their existing robotics or SET projects rather than starting one."],
 "A volunteer application, sometimes a background check, and a project outline.",
 "1-2 weeks. Agents are responsive because outreach is their job.",
 "Going to individual clubs first. One email to the agent replaces twenty."),

"afterschool": (
 ["Find your state's after-school network through the Afterschool Alliance.",
  "Ask the network which 21st Century Community Learning Centers sites near you want STEM.",
  "Contact the site coordinator, not the grant holder.",
  "Propose six to eight weeks with the same students; these sites are graded on continuity.",
  "Leave the kits on site so the programme survives without you."],
 "A written curriculum, attendance data, and background checks. These sites report to a federal grant.",
 "2-4 weeks.",
 "Dropping in once. It gives the site nothing it can report and they know it."),

"camp": (
 ["Search the ACA camp finder for accredited camps in your area.",
  "Email the camp director in September for the following summer. Yes, that early.",
  "Offer a defined session -- a day, or an hour a day for a week -- not 'we could do something'.",
  "Ask about their counsellor training week in June; teaching counsellors multiplies your reach.",
  "Confirm their supervision ratios and whether your students count toward them (they usually do not)."],
 "A session plan, materials list, supervision ratios, and often background checks.",
 "2-6 weeks, but the calendar itself is set 6-9 months ahead.",
 "Contacting camps in spring. By March the summer programme is printed and paid for."),

"hospital": (
 ["Find your nearest children's hospital through the Children's Hospital Association.",
  "Contact Child Life Services. Never contact a ward, a nurse or a family directly.",
  "Expect a formal volunteer application, health screening and an orientation.",
  "Child Life leads the visit. You follow their instructions in every room, without exception.",
  "Bring a small, quiet, slow robot that can be wiped down. Leave the competition bot at home."],
 "Immunisation records, a background check, an orientation session, and infection-control clearance.",
 "10-16 weeks. There is no fast path and asking for one damages your case.",
 "Photographs. Do not take any unless Child Life arranges it, and never publish one."),

"sped": (
 ["Find your state's parent centre through the Parent Center Hub.",
  "Ask them which local special-education programmes want assistive-technology partnerships.",
  "Approach the Director of Special Services at district level, not a classroom teacher.",
  "Propose building for named, measured individuals rather than a generic demonstration.",
  "Involve an occupational or physical therapist from the first conversation."],
 "A therapist's involvement, safety documentation for anything a child will use, and a follow-up commitment.",
 "8-12 weeks.",
 "Building something that looks helpful but does not fit anyone. Measure first, build second."),

"dhh": (
 ["Reach state schools and outreach coordinators through the American Printing House network.",
  "Contact the outreach or transition coordinator, who handles external partnerships.",
  "Ask what accessibility your session needs before you propose it -- interpreters, captions, tactile materials.",
  "Budget for an interpreter, and ask the school who they use.",
  "Design for the access need from the start; do not adapt a session afterwards."],
 "Accessible materials, an interpreter where needed, and staff who know the students present.",
 "10-14 weeks.",
 "Assuming your usual session works with an interpreter bolted on. It generally does not."),

"shelterfam": (
 ["Search 211.org for family shelters and transitional housing near you.",
  "Contact the Family Services Director, never residents directly.",
  "Ask what they need. It is often not robotics -- take the answer seriously.",
  "Keep it low-key and unphotographed. Families here did not consent to being anyone's story.",
  "Offer take-home kits so children keep something when they move on."],
 "Background checks, absolute confidentiality, and no photography at all.",
 "4-8 weeks.",
 "Publicising it. If you cannot do this without posting about it, do not do it."),

"housing": (
 ["Find your local public housing authority in HUD's official contact list.",
  "Ask for Resident Services -- they run the community centres and after-school rooms.",
  "Propose using the community room on a fixed weekly evening.",
  "Ask residents' association representatives what they want before you fix the plan.",
  "Leave the equipment there if you possibly can."],
 "A background check, a consistent schedule, and materials that stay on site.",
 "3-6 weeks, and a phone call works better than email.",
 "Treating it as charity. Say what you are learning from being there, and mean it."),

"juvenile": (
 ["Work through your state's juvenile justice agency, reachable via OJJDP.",
  "Contact the education administrator for the facility, not the facility itself.",
  "Expect clearance, an interview, and rules about tools, phones and photographs.",
  "Design a session with no tool that could be a weapon and no component that could be pocketed.",
  "Commit to a series. Continuity matters more here than anywhere else on this board."],
 "Full background clearance, a tool inventory, and a curriculum reviewed in advance.",
 "12-20 weeks. Start in summer for a winter session.",
 "Assuming you can improvise. Every element is agreed in advance or it does not happen."),

"tribal": (
 ["Identify schools and programmes through the Bureau of Indian Education, or the tribe's own education department.",
  "Contact the Education Director and ask what is wanted. Do not arrive with a plan.",
  "Expect and respect a long timeline and a formal approval process.",
  "Ask about protocols before proposing dates -- the calendar may not be the one you assume.",
  "Plan for a multi-year relationship or do not start."],
 "Formal approval, a genuine long-term commitment, and cultural protocols followed properly.",
 "12-20 weeks or longer.",
 "One-off visits by outside groups are a well-worn pattern here, and they are not welcome."),

"military": (
 ["Find the School Liaison Officer for the installation through Military OneSource.",
  "Email the SLO. This role exists precisely to connect installation families to community programmes.",
  "Ask about the youth centre and the school-age care programme, which run year-round.",
  "Expect base access procedures -- photo ID for everyone, days in advance.",
  "Design for high turnover: families move constantly, so sessions must stand alone."],
 "Base access paperwork for every person, photo ID, and vehicle registration if you drive on.",
 "8-12 weeks including access clearance.",
 "Turning up without cleared access. Nobody can wave you through the gate."),

"refugee": (
 ["Find your state refugee programme through the Office of Refugee Resettlement.",
  "Ask which local agencies run youth or ESL programming, then contact their youth coordinator.",
  "Lead with what languages your team speaks. It is the most useful thing you can offer.",
  "Design for mixed ages and mixed English. Hands-on works; verbal instruction does not.",
  "Never photograph participants or name anyone publicly."],
 "Language capability, absolute confidentiality, and materials that work without fluent English.",
 "4-8 weeks.",
 "Building a session that depends on reading English instructions."),

"senior": (
 ["Search the Eldercare Locator by postcode for senior centres and area agencies on ageing.",
  "Phone rather than email. This is the one category where a call is genuinely faster.",
  "Ask for the Activities Director and offer a specific weekday morning.",
  "Run one student per two guests, and speak slowly. Bring large-type handouts.",
  "Finish by showing the robot so the session is not purely a technology help desk."],
 "A specific date and time, a headcount, and patience.",
 "Often same-week. Activity directors fill calendars constantly and welcome offers.",
 "Talking too fast and assuming no interest in the engineering. There is more than you expect."),

"parks": (
 ["Find your city or county parks and recreation department through NRPA or the city site.",
  "Contact the recreation programme coordinator, and ask for the events calendar.",
  "Join an existing community event rather than proposing your own.",
  "Ask about their summer camp programme -- they run large ones and need instructors.",
  "Expect a facility use form and possibly a small fee, often waived for youth groups."],
 "A facility use application, proof of insurance, and a supervision plan.",
 "4-8 weeks; summer programming is planned by February.",
 "Missing the fee waiver. Ask specifically -- most departments have one for youth groups."),

"city": (
 ["Find your city government through USA.gov's local government directory.",
  "Email your council member's office, not the general city address. Constituent services reply.",
  "Ask for three things: an event slot, a proclamation, and an introduction to the parks department.",
  "A proclamation recognising your team costs the city nothing and reads well in an Impact submission.",
  "Ask to present at a council meeting; public comment slots are open to anyone."],
 "A short written request, a date, and students willing to speak in public.",
 "2-6 weeks. Council offices are slower in budget season.",
 "Emailing the mayor. Council staff actually respond; the mayor's inbox does not."),

"chamber": (
 ["Find your local chamber through the US Chamber's directory or a web search for your city.",
  "Contact the membership or events director and ask about their calendar.",
  "Offer to present at a member breakfast. They need speakers monthly and rarely have interesting ones.",
  "Ask for their member list -- it is your sponsor prospect list, already sorted by locality.",
  "Follow up with every member who spoke to you, within two days."],
 "A short talk, students who can hold a conversation with adults, and a one-page leave-behind.",
 "2-4 weeks.",
 "Pitching for money in the room. Build the relationship first; ask later."),

"rotary": (
 ["Use the Rotary club finder for clubs and meeting times near you; Kiwanis and Lions have the same.",
  "Email the club's programme chair -- every club has one and they book speakers weekly.",
  "Offer a 20-minute student presentation. That is the standard slot.",
  "Bring the robot if the venue allows; ask, because many meet in restaurants.",
  "Clubs frequently vote small grants after a good presentation. Have a specific ask ready."],
 "A 20-minute talk led by students, and a specific, costed ask if you want funding.",
 "1-3 weeks. Programme chairs are usually looking for speakers.",
 "Not having a number ready when they ask what you need. They often decide that day."),

"manuf": (
 ["Find your state's MEP centre through nist.gov/mep, or search for manufacturers near you.",
  "Contact plant management or community relations, not the general enquiry form.",
  "Lead with the workforce pipeline. That is the problem they actually have.",
  "Ask for a plant tour first; the sponsorship conversation is easier after they have met your students.",
  "Have a tiered sponsorship sheet ready with what each level gets."],
 "A one-page budget, last year's outreach numbers, and students who lead the meeting.",
 "6-10 weeks; company budgets are usually set in the autumn.",
 "Letting the mentor do the talking. Companies fund students they have met, not adults."),

"tech": (
 ["Send the company's community relations contact the FIRST sponsorship page so they see the programme.",
  "Ask about matching gifts and volunteer grants. Many employees can direct company money to you.",
  "Find a parent or alumnus inside the company. An internal advocate beats any cold email.",
  "Offer employee engagement -- their staff mentoring your team is worth more to them than a logo.",
  "Submit before their fiscal year ends; unspent community budget disappears."],
 "Tax status, a budget, impact numbers, and often an online application form.",
 "8-12 weeks, and longer through a formal grants process.",
 "Missing the matching-gift programme. It is free money and most teams never ask."),

"faith": (
 ["Search JustServe or ask locally for congregations with active youth groups.",
  "Contact the youth minister or director.",
  "Offer a service-shaped activity: adapting toys, building for a family, a community night.",
  "Be clear you are there for the community, not to recruit. Say it explicitly.",
  "Ask about their hall for a family STEM night -- these are often the best free venues in town."],
 "A clear description, adult supervision, and respect for their calendar.",
 "1-3 weeks. Congregations decide quickly.",
 "Ignoring their calendar. Do not propose anything during a major religious season."),

"homeschool": (
 ["Find state and regional homeschool groups through HSLDA or a local search.",
  "Contact the co-op's enrichment coordinator.",
  "Offer a multi-week class. Co-ops build a timetable and want to fill slots.",
  "Expect mixed ages in one room; design for a wide span.",
  "Parents stay and help, which means better ratios than any school session."],
 "A course outline, a materials fee if any, and a fixed weekly time.",
 "1-3 weeks. Co-ops are informal and fast.",
 "Planning for a single grade level. You will get eight-year-olds and fifteen-year-olds together."),

"media": (
 ["Find your local public radio or TV station through the NPR station directory, plus the local paper.",
  "Email the assignment desk or community editor a two-paragraph pitch, not a press release.",
  "Lead with a hook: a deadline, a first, a student's story. 'We exist' is not news.",
  "Attach two good photographs you already have. No photos, no story.",
  "Have a parent's written permission before naming any student."],
 "A hook, photographs, a named contact who answers the phone, and permissions for minors.",
 "Days, if the hook is timely. Weeks or never if it is not.",
 "Sending a press release. Reporters delete those. Send a short human email."),

"foodbank": (
 ["Use Feeding America's locator to find your member food bank.",
  "Register your group through their volunteer page -- most have an online calendar.",
  "Book a sorting shift; they take 10-25 people at once, which few venues can.",
  "Check the minimum age. It varies and is usually 12-16.",
  "Book November and December shifts by October. They fill first."],
 "Signed waivers for minors, closed-toe shoes, and an accurate headcount.",
 "Often instant through the online calendar.",
 "Over-booking and under-delivering. They plan the shift around your numbers."),

"shelter": (
 ["Search Petfinder's shelter directory for shelters and rescues near you.",
  "Contact the volunteer manager and ask about group projects rather than animal handling.",
  "Offer what you are good at: building enclosures, repairing equipment, running their donation drive.",
  "Check age minimums, which are often 16 for animal contact and lower for other work.",
  "Ask about their fundraising events -- a robot draws a crowd to a fundraiser."],
 "Waivers, age minimums, and an orientation session.",
 "1-3 weeks.",
 "Assuming you will handle animals. Most of the useful work is not that."),

"habitat": (
 ["Find your local affiliate through habitat.org.",
  "Register a group through their volunteer services page.",
  "Check the age minimum for the build site, usually 16, versus the ReStore, which is often lower.",
  "Book a whole team onto one build day rather than sending individuals.",
  "Ask whether they need anything designed or built off-site; that is where your skills fit."],
 "Waivers, age minimums, closed-toe shoes, and a confirmed headcount.",
 "2-4 weeks.",
 "Bringing under-16s to a build site. They will be turned away at the gate."),

"maker": (
 ["Find your regional Maker Faire and its Call for Makers, or search for a local makerspace.",
  "Apply as a Maker, not a sponsor. Maker booths are normally free; sponsor booths are not.",
  "Describe what visitors will DO at your stand. Applications that say 'we will display our robot' get rejected.",
  "For a makerspace, just turn up on an open night and talk to whoever is running it.",
  "Ask makerspaces about tool access and mentoring; that trade usually runs both ways."],
 "A description of the hands-on element, space and power requirements, and a staffing plan.",
 "Faires: 4-8 weeks, and the Call for Makers closes early. Makerspaces: days.",
 "Applying as a passive exhibit. Faires select for interaction."),

"fair": (
 ["Find your county or state fair through the IAFE directory or the county site.",
  "Contact the exhibits or vendor coordinator and ask for the exhibitor pack.",
  "Ask specifically about a free non-profit or youth exhibitor space. It usually exists and is not advertised.",
  "Apply 4-6 months ahead. Fair layouts are fixed early and do not change.",
  "Plan a driver rotation. A fair day is long and hard on the same two students."],
 "An application, proof of insurance, a booth plan, and often a fee that a youth waiver removes.",
 "4-8 weeks to reply, but apply 4-6 months out.",
 "Missing the youth or non-profit rate and paying a commercial vendor fee you never needed to."),

"market": (
 ["Find markets near you in the USDA farmers market directory.",
  "Email the market manager, whose contact is usually in that listing.",
  "Ask for a community or non-profit table, which is normally free.",
  "Pick a market with a covered area or bring a weighted canopy.",
  "Go early in the season; managers fill community slots for the whole summer at once."],
 "A short description, a canopy and weights, and someone staffing it the whole session.",
 "1-2 weeks. Market managers are quick and informal.",
 "Bringing an unweighted canopy. One gust and you are the market's problem."),

"fll": (
 ["Search FIRST's team and event search for FLL and FTC teams near you.",
  "Also email your FIRST Program Delivery Partner -- they know which teams have no mentor.",
  "Contact the head coach and offer specific technical help, not general encouragement.",
  "Commit to a schedule you can actually keep through your own build season.",
  "Agree a boundary in writing: you advise, their students build. Judges ask about this."],
 "A named student mentor, a schedule, and often a background check through the host organisation.",
 "1-2 weeks; coaches are volunteers and answer in the evening.",
 "Doing the work for them. It fails the students and it fails inspection."),

"event": (
 ["Create a FIRST account and open the Volunteer Registration section of your dashboard.",
  "Complete the Youth Protection Program screening first. It takes several days and gates everything.",
  "Apply to specific events and specific roles; popular roles fill first.",
  "Check which roles accept students -- it varies by region, and Queuing and Field Reset usually do.",
  "Watch for the role assignment email around two weeks out, and confirm it immediately."],
 "A FIRST account, completed youth protection screening, and availability for a full day.",
 "Screening: 3-7 days. Role assignment: usually two weeks before the event.",
 "Registering late. Screening is not instant and you cannot volunteer without it."),
}
