"""
Voices every narration line with Kokoro (open-weight text-to-speech, Apache-2.0) and lays out each video's sound
track: a short lead-in, each line followed by a pause, a longer pause where the scene changes, and a silent
countdown before each pause-and-try answer. Writes <out>/<skill>.wav and <out>/timing.json (where each shot starts).

  python voice.py shots.json <model.onnx> <voices.npz> <out-dir> [voice] [skills,...]
"""
import json, sys, os
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

shots_file, model, voices, out = sys.argv[1:5]
voice = sys.argv[5] if len(sys.argv) > 5 else 'af_heart'
only = set(sys.argv[6].split(',')) if len(sys.argv) > 6 else None
COUNTDOWN, LEAD, GAP, SCENE_GAP, TAIL = 5.0, 0.6, 0.45, 0.6, 1.2
os.makedirs(out, exist_ok=True)
k = Kokoro(model, voices)
shots = json.load(open(shots_file))
tf = os.path.join(out, 'timing.json')
timing = json.load(open(tf)) if os.path.exists(tf) else {}
for skill, list_ in shots.items():
    if only and skill not in only: continue
    sr = 24000
    pieces, starts, t = [np.zeros(int(LEAD * sr), np.float32)], [], LEAD
    for i, s in enumerate(list_):
        if i and s['scene'] != list_[i - 1]['scene']:
            pieces.append(np.zeros(int(SCENE_GAP * sr), np.float32)); t += SCENE_GAP
        starts.append(round(t, 3))
        if s['phase'] == 'countdown':
            audio = np.zeros(int(COUNTDOWN * sr), np.float32)
        else:
            audio, sr2 = k.create(s['say'], voice=voice, speed=1.0, lang='en-us')
            assert sr2 == sr
            audio = np.concatenate([audio.astype(np.float32), np.zeros(int(GAP * sr), np.float32)])
        pieces.append(audio); t += len(audio) / sr
    pieces.append(np.zeros(int(TAIL * sr), np.float32)); t += TAIL
    sf.write(os.path.join(out, f'{skill}.wav'), np.concatenate(pieces), sr)
    timing[skill] = {'duration': round(t, 3), 'starts': starts}
    json.dump(timing, open(tf, 'w'), indent=1)
    print(skill, round(t, 1), 's', flush=True)
