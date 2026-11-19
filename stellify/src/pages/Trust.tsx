'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { BRAND } from '@/lib/taxonomy';
import { CHANGELOG } from '@/data/changelog';

/** A plain reading page: serif headings, a 68-character measure, hairline rules between sections. */
function Doc({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-[68ch]" data-testid="trust-page">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-2 text-[34px] leading-tight sm:text-[40px]">{title}</h1>
      <p className="mt-3 text-[17px] leading-relaxed text-muted">{intro}</p>
      <div className="mt-8 space-y-8 text-[16px] leading-relaxed [&_h2]:mb-2 [&_h2]:text-[22px] [&_li]:mt-1.5 [&_section]:border-t [&_section]:border-line [&_section]:pt-6 [&_ul]:list-disc [&_ul]:pl-5">{children}</div>
    </article>
  );
}

export function AboutPage() {
  return (
    <Doc eyebrow="About" title="About Stellify" intro="Stellify is a free, independent study tool for the Digital SAT, with self-study courses for six AP subjects. It has no accounts, no ads and no paid tier.">
      <section>
        <h2>Who makes it</h2>
        <p data-testid="about-names">Names to be added by the owner.</p>
        <p className="mt-2 text-muted">This page will list the real people who write, check and maintain Stellify. Until then it lists no one, rather than inventing names.</p>
      </section>
      <section>
        <h2>What it is not</h2>
        <ul>
          <li>It is not the College Board, and it is not endorsed by the College Board. {BRAND.disclaimer}</li>
          <li>Its score estimates are estimates. They have never been checked against real students’ SAT score reports (see <Link className="text-accent underline" href="/methodology">Methodology</Link>).</li>
          <li>It is not a replacement for a teacher. The AP courses and Reading &amp; Writing questions have not been reviewed by an outside teacher or SAT expert yet.</li>
        </ul>
      </section>
      <section>
        <h2>Free, for good</h2>
        <p>There is no paywall, no trial and no premium version. All of it runs in your browser and keeps working without an internet connection.</p>
      </section>
    </Doc>
  );
}

export function MethodologyPage() {
  return (
    <Doc eyebrow="Methodology" title="How Stellify estimates, recommends and checks" intro="Every number Stellify shows is an estimate from your own answers on this device. This page says how each is made and how far it can be trusted.">
      <section>
        <h2>Score estimates</h2>
        <ul>
          <li>Built only from <b>first tries without hints</b>, weighted by question difficulty, and shown as an 80% range with a confidence label.</li>
          <li>Hidden until a section has 20 such answers. The page says how many more are needed.</li>
          <li>The range includes an allowance for model error. It has never been checked against real SAT results, so no claim is made about how well it predicts an actual score.</li>
        </ul>
      </section>
      <section>
        <h2>Module 2 routing</h2>
        <p>Module 1 answers are weighted by difficulty before routing. A simulation of 300 students per section (in the test suite) checks that strong students are rarely routed to the easier module. It checks internal consistency only, not agreement with the real SAT.</p>
      </section>
      <section>
        <h2>Mastery and stars</h2>
        <ul>
          <li><b>Proficient</b> needs 8 or more answers, 70% recent accuracy and at least 2 hard questions right. <b>Mastered</b> needs 12 or more answers, 85% recent accuracy, 4 hard or harder questions right (at least 2 of them very hard) and practice on 2 different days.</li>
          <li>Path stars (the same stars on Learn, the Path and the dashboard): ★1 learned (chapters, worked examples, the quick lesson with 2+ of its stars, or the skip check), ★2 practiced, ★3 retained (a correct answer in a mixed Gauntlet at least 7 days after ★2). Hints lower the credit of an answer but never block progress. Stars, once earned, are kept.</li>
        </ul>
      </section>
      <section id="score-lever">
        <h2>Score Lever</h2>
        <p>For each skill: points per study hour ≈ headroom × the skill’s share of the test × scaled points per extra right answer ÷ hours needed. Headroom is your target accuracy minus your current accuracy, shrunk toward a typical value when you have few answers. Shown as a low–high range. A skill with fewer than 6 answers says “needs a diagnostic” instead of a number.</p>
      </section>
      <section id="item-statistics">
        <h2>Question statistics</h2>
        <p>Item statistics (percent correct, point-biserial discrimination, distractor choices by ability group, response times) are computed only from first attempts, after removing rapid guesses (under 3 seconds or under 10% of the question’s median time), abandoned sessions and repeats. Every statistic is shown with its sample size, and no decision is made under 100 responses. Today this data stays on your device. Anonymous pooling is designed but switched off (see <Link className="text-accent underline" href="/privacy">Privacy</Link>).</p>
      </section>
      <section>
        <h2>Test facts</h2>
        <p>Module lengths and time limits (27 and 22 questions; 32 and 35 minutes) come from the College Board’s published test structure. Facts we could not verify against a current College Board page are labelled <b>needs verification</b> wherever they appear.</p>
      </section>
    </Doc>
  );
}

export function HowWeWritePage() {
  return (
    <Doc eyebrow="Questions" title="How we write and check questions" intro="Every Stellify question is original. None is copied or adapted from College Board material.">
      <section>
        <h2>Writing</h2>
        <ul>
          <li>Each question targets one official skill, with the College Board’s skill wording for Reading &amp; Writing stems.</li>
          <li>Passages are 25–150 words. There are four choices with one key, and a rationale for every choice.</li>
          <li>Every wrong answer is tagged with the reasoning error it represents (for example, “goes beyond the text” or “comma splice”).</li>
        </ul>
      </section>
      <section>
        <h2>Checking, automatically</h2>
        <ul>
          <li>Every math key is recomputed by independent code before a question can ship.</li>
          <li>Reading &amp; Writing questions pass rule checks: official stem wording, length, no key that stands out by length, and parallel choices.</li>
          <li>A quality page flags possible duplicates, weak distractors and difficulty labels that disagree with results.</li>
        </ul>
      </section>
      <section>
        <h2>Checking, by people</h2>
        <p>Use <b>Report an error</b> on any question. Reports are saved with your data and appear on the quality page for whoever maintains your copy. No outside SAT expert has reviewed the bank yet. We say so rather than imply otherwise.</p>
      </section>
      <section>
        <h2>Life cycle</h2>
        <p>Draft → pretest → calibrated → live → flagged or retired. A question’s measured difficulty replaces its author’s estimate only once enough students have answered it.</p>
      </section>
    </Doc>
  );
}

export function PrivacyPage() {
  return (
    <Doc eyebrow="Privacy" title="Privacy" intro="Stellify keeps your study data on this device. Nothing about you is sent anywhere unless you turn a feature on yourself.">
      <section>
        <h2>What is stored, and where</h2>
        <ul>
          <li>Your answers, notes, settings and progress are stored in this browser (IndexedDB, with local storage as a fallback). There is no account and no server copy.</li>
          <li>Export, import and delete are in Settings. Automatic backups also stay on this device.</li>
        </ul>
      </section>
      <section>
        <h2>What can leave the device, and only if you choose it</h2>
        <ul>
          <li><b>AI tutor:</b> if you add your own Gemini key, your question to the tutor is sent to Google. The key is never included in exports or backups.</li>
          <li><b>Desmos calculator:</b> when you open it online, it loads from desmos.com, which sees a normal web request. Stellify does not see what you type into it.</li>
          <li><b>Anonymous research data:</b> designed, but switched off in this version. If it is ever switched on, it will ask first in plain words, send no name or email, use a random session ID, and be reviewed for student-privacy law (COPPA and FERPA) before launch.</li>
        </ul>
      </section>
      <section>
        <h2>What Stellify never does</h2>
        <ul>
          <li>No ads, no tracking scripts, no cookies for tracking, no selling of data.</li>
          <li>The page’s security policy blocks connections to anything except Google’s AI service (only when you turn the tutor on) and Desmos frames.</li>
        </ul>
      </section>
    </Doc>
  );
}

export function ChangelogPage() {
  return (
    <Doc eyebrow="Changelog" title="Changelog" intro="What changed, newest first.">
      {CHANGELOG.map((c) => (
        <section key={c.date + c.title}>
          <h2><time dateTime={c.date}>{c.date}</time> · {c.title}</h2>
          <ul>{c.items.map((i) => <li key={i}>{i}</li>)}</ul>
        </section>
      ))}
    </Doc>
  );
}
