/* Cadenza — doing long work without freezing the page.
 *
 * Analysing a few minutes of audio is tens of seconds of arithmetic.  Run
 * straight through, it holds the one thread a browser gives a page, and the
 * browser eventually offers to kill the tab — which is what happens if you
 * look away while it works.  Worse, the progress list cannot repaint while it
 * runs, so the one thing that would tell you it is still working is the one
 * thing the work prevents.
 *
 * The heavy stages are therefore written as generators that stop at natural
 * boundaries — a segment analysed, a pass completed.  What drives them decides
 * what that pause is for: the tests run them straight through, and the app
 * hands the thread back so the page stays alive and the progress list moves.
 * The arithmetic is identical either way; only the pauses differ.
 */

/** Run a generator to its return value without pausing. */
export function runSync(iter) {
  let step = iter.next();
  while (!step.done) step = iter.next();
  return step.value;
}

/**
 * Run a generator, handing the thread back at every pause.
 *
 * `onStep` is called with whatever the stage yielded, which is how the panel
 * knows how far along it is.  `cancelled` is checked at every pause so that
 * closing the panel stops the work rather than leaving it running unseen.
 */
export async function runYielding(iter, opts = {}) {
  const { onStep = null, cancelled = null, slice = 24 } = opts;
  let step = iter.next();
  let since = Date.now();
  while (!step.done) {
    if (onStep) onStep(step.value);
    /* Pause on a clock rather than every iteration: a yield costs about a
     * millisecond, and a short segment does not need one. */
    if (Date.now() - since >= slice) {
      await new Promise((resolve) => { setTimeout(resolve, 0); });
      since = Date.now();
      if (cancelled && cancelled()) throw new CancelledError();
    }
    step = iter.next();
  }
  return step.value;
}

/** Thrown when the panel is closed while a transcription is running. */
export class CancelledError extends Error {
  constructor() {
    super('Transcription cancelled');
    this.name = 'CancelledError';
    this.cancelled = true;
  }
}
