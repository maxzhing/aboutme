/* Cadence · JARVIS — voice in and voice out.

   Both halves use the Web Speech API, which is built into the browser. Nothing
   is installed, no key is needed and no third-party service is added by
   Cadence — which is what makes this the honest "free" option.

   One thing worth being straight about: speech *recognition* in Chrome and
   Edge is not local. The browser streams the audio to Google's servers and
   sends text back. That is a real departure for an app whose own copy says
   nothing leaves the page, so it is off until you turn it on, the console says
   so plainly next to the switch, and turning it off stops it completely.

   Speech *synthesis* — JARVIS talking back — does run locally, on voices the
   operating system already has. It sends nothing anywhere. */
(function (global) {
  'use strict';

  var JV = global.JV = global.JV || {};

  var Recognition = global.SpeechRecognition || global.webkitSpeechRecognition || null;
  var synth = global.speechSynthesis || null;

  /* ------------------------------------------------------------ support */

  function canListen() { return !!Recognition; }
  function canSpeak() { return !!(synth && typeof global.SpeechSynthesisUtterance === 'function'); }

  /* Firefox has no SpeechRecognition at all, and a file:// page cannot use the
     microphone in some browsers. Saying which is more useful than a dead button. */
  function listenUnavailableReason() {
    if (Recognition) return null;
    var ua = global.navigator.userAgent || '';
    if (/Firefox/i.test(ua)) {
      return 'Firefox does not support in-browser speech recognition. Chrome, Edge or Safari do.';
    }
    return 'This browser does not support speech recognition. Chrome, Edge or Safari do.';
  }

  /* --------------------------------------------------------- listening */

  function Listener(opts) {
    opts = opts || {};
    this.onPartial = opts.onPartial || function () {};
    this.onFinal = opts.onFinal || function () {};
    this.onState = opts.onState || function () {};
    this.onError = opts.onError || function () {};
    this.active = false;
    this.rec = null;
    this.finalText = '';
  }

  Listener.prototype.start = function () {
    if (!Recognition || this.active) return false;

    var self = this;
    var rec = this.rec = new Recognition();
    rec.lang = (global.navigator.language || 'en-US');
    rec.interimResults = true;
    rec.continuous = false;      // one utterance per press; stops on a natural pause
    rec.maxAlternatives = 1;

    this.finalText = '';

    rec.onstart = function () {
      self.active = true;
      self.onState('listening');
    };

    rec.onresult = function (event) {
      var interim = '';
      for (var i = event.resultIndex; i < event.results.length; i++) {
        var chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) self.finalText += chunk;
        else interim += chunk;
      }
      self.onPartial((self.finalText + ' ' + interim).trim());
    };

    rec.onerror = function (event) {
      self.active = false;
      var code = event && event.error;
      // "aborted" and "no-speech" are ordinary outcomes, not failures worth
      // shouting about.
      if (code === 'aborted' || code === 'no-speech') { self.onState('idle'); return; }
      self.onError(describeError(code));
      self.onState('idle');
    };

    rec.onend = function () {
      self.active = false;
      self.onState('idle');
      var text = self.finalText.trim();
      if (text) self.onFinal(text);
    };

    try {
      rec.start();
      return true;
    } catch (err) {
      this.active = false;
      this.onError('Could not start the microphone: ' + (err && err.message ? err.message : err));
      return false;
    }
  };

  Listener.prototype.stop = function () {
    if (!this.rec) return;
    try { this.rec.stop(); } catch (err) { /* already stopped */ }
  };

  Listener.prototype.abort = function () {
    this.finalText = '';
    if (!this.rec) return;
    try { this.rec.abort(); } catch (err) { /* already stopped */ }
  };

  function describeError(code) {
    switch (code) {
      case 'not-allowed':
      case 'service-not-allowed':
        return 'Microphone access was blocked. Allow it for this page and try again.';
      case 'audio-capture':
        return 'No microphone was found.';
      case 'network':
        return 'Speech recognition needs a network connection and could not reach it.';
      default:
        return 'The microphone stopped unexpectedly' + (code ? ' (' + code + ')' : '') + '.';
    }
  }

  /* ---------------------------------------------------------- speaking */

  var voicePref = null;

  /* Prefer a natural-sounding local voice in the user's language, but never
     hard-fail if the platform has nothing matching. */
  function pickVoice() {
    if (!canSpeak()) return null;
    var voices = synth.getVoices() || [];
    if (!voices.length) return null;

    if (voicePref) {
      var saved = voices.filter(function (v) { return v.name === voicePref; })[0];
      if (saved) return saved;
    }

    var lang = (global.navigator.language || 'en-US').toLowerCase();
    var base = lang.split('-')[0];
    var sameLang = voices.filter(function (v) {
      return (v.lang || '').toLowerCase().indexOf(base) === 0;
    });
    var pool = sameLang.length ? sameLang : voices;

    // These read markedly better than the default robotic fallbacks.
    var preferred = ['samantha', 'daniel', 'karen', 'moira', 'google uk english',
      'google us english', 'microsoft aria', 'microsoft guy', 'natural'];
    for (var i = 0; i < preferred.length; i++) {
      var hit = pool.filter(function (v) {
        return v.name.toLowerCase().indexOf(preferred[i]) >= 0;
      })[0];
      if (hit) return hit;
    }
    var local = pool.filter(function (v) { return v.localService; })[0];
    return local || pool[0];
  }

  function voices() {
    return canSpeak() ? (synth.getVoices() || []) : [];
  }

  function setVoice(name) { voicePref = name || null; }
  function getVoice() { return voicePref; }

  /* Strip the things that are fine to read but wrong to hear. */
  function speakable(text) {
    return String(text || '')
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')   // emoji
      .replace(/[“”„]/g, '')
      .replace(/[·•—–]/g, ', ')
      .replace(/\s*\n+\s*/g, '. ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function speak(text, opts) {
    opts = opts || {};
    if (!canSpeak()) return false;
    var body = speakable(text);
    if (!body) return false;

    // Never let two replies talk over each other.
    cancel();

    var utter = new global.SpeechSynthesisUtterance(body);
    var voice = pickVoice();
    if (voice) { utter.voice = voice; utter.lang = voice.lang; }
    utter.rate = opts.rate || 1.02;
    utter.pitch = opts.pitch || 1;
    utter.volume = opts.volume === undefined ? 1 : opts.volume;
    if (opts.onStart) utter.onstart = opts.onStart;
    if (opts.onEnd) { utter.onend = opts.onEnd; utter.onerror = opts.onEnd; }

    try {
      synth.speak(utter);
      return true;
    } catch (err) {
      return false;
    }
  }

  function cancel() {
    if (!canSpeak()) return;
    try { synth.cancel(); } catch (err) { /* nothing to cancel */ }
  }

  function isSpeaking() {
    return !!(canSpeak() && (synth.speaking || synth.pending));
  }

  // Voices load asynchronously on most platforms; this keeps the list fresh.
  if (canSpeak() && typeof synth.addEventListener === 'function') {
    synth.addEventListener('voiceschanged', function () { /* re-read on demand */ });
  }

  // A page that is torn down mid-sentence should not keep talking.
  global.addEventListener('pagehide', cancel);
  global.addEventListener('beforeunload', cancel);

  JV.VOICE = {
    canListen: canListen,
    canSpeak: canSpeak,
    listenUnavailableReason: listenUnavailableReason,
    Listener: Listener,
    speak: speak,
    cancel: cancel,
    isSpeaking: isSpeaking,
    voices: voices,
    setVoice: setVoice,
    getVoice: getVoice,
    speakable: speakable
  };
})(window);
