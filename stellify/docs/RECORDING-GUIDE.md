# Recording a lesson yourself (one page)

A human voice replaces the computer voice line by line, with no other change.

1. **Get the script.** Each lesson's lines are in its transcript (open the lesson, press Transcript), numbered from
   000 in order. Silent pauses and countdowns are not recorded.
2. **Record one WAV per line**: `content/recordings/<lesson id>/<NNN>.wav` (for example
   `content/recordings/sys-w1/004.wav`). Mono or stereo, any sample rate (it is converted). Start speaking right away
   and stop when the line ends: the build adds the pauses.
3. **Rebuild**: `node scripts/lessons/build.mjs` (with `FORCE_ENCODE=1` and the lesson's entry removed from
   `.lesson-cache/wav/timing.json`). Captions and animation follow your timing automatically.

**Reading style** (keep it the same as the rest): "x squared", "negative three" for a negative number (and "minus"
only for subtraction), "f of x", "the quantity x plus two, squared". Short sentences, about 140–160 words a minute, a
short breath after each key result.

**Microphone tips**: a quiet room with soft things around (a closet full of clothes works); phone or USB mic about a
hand-width from your mouth, slightly off to the side to avoid pops; record a few seconds of silence first to check for
hum; keep the level so your loudest words stay well below the top of the meter. Loudness is evened out by the build.
