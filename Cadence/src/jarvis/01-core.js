/* Cadence · JARVIS — core value types.

   The JARVIS agent framework, ported from the Python reference implementation
   in /Jarvis and rehomed on Cadence's data model. Everything here is
   dependency-free and deterministic so the whole assistant runs offline, in
   the page, with no API key and nothing leaving the browser.

   Three things live in this file: identifiers and clocks, the confidence
   scalar the orchestrator reasons about, and the AgentMessage envelope agents
   pass through the orchestrator instead of calling each other directly. */
(function (global) {
  'use strict';

  var JV = global.JV = global.JV || {};

  var counter = 0;
  function uid(prefix) {
    counter++;
    return (prefix || 'id') + '_' + Date.now().toString(36) + counter.toString(36) +
      Math.floor(Math.random() * 1296).toString(36);
  }

  function nowTs() { return Date.now() / 1000; }

  /* ----------------------------------------------------------- confidence */

  /* A probability-like score in [0,1]. The orchestrator reads `isLow` to decide
     whether to stop and ask rather than guess, so the buckets are part of the
     contract, not decoration. */
  function confidence(value) {
    var v = Number(value);
    if (!isFinite(v)) v = 0;
    return Math.max(0, Math.min(1, v));
  }
  confidence.isLow = function (v) { return v < 0.4; };
  confidence.isHigh = function (v) { return v >= 0.75; };
  confidence.label = function (v) {
    if (v >= 0.75) return 'high';
    if (v >= 0.4) return 'moderate';
    return 'low';
  };

  /* -------------------------------------------------------------- message */

  var MessageKind = {
    REQUEST: 'request',   // "do this"
    RESULT: 'result',     // "here is the outcome"
    CLARIFY: 'clarify',   // "I need more information"
    ERROR: 'error'        // "I failed, and here is why"
  };

  function AgentMessage(sender, recipient, kind, content, payload, conf) {
    this.id = uid('amsg');
    this.sender = sender;
    this.recipient = recipient;
    this.kind = kind || MessageKind.REQUEST;
    this.content = content || '';
    this.payload = payload || {};
    this.confidence = conf === undefined ? 1 : confidence(conf);
    this.createdAt = nowTs();
  }

  /* Build a response addressed back to this message's sender. Confidence is
     taken from the payload when not passed explicitly, so the envelope always
     reflects what the responder actually believed. */
  AgentMessage.prototype.reply = function (content, kind, payload) {
    payload = payload || {};
    var conf = payload.confidence !== undefined ? payload.confidence : 1;
    return new AgentMessage(
      this.recipient, this.sender, kind || MessageKind.RESULT,
      content, payload, conf
    );
  };

  function message(sender, recipient, kind, content, payload, conf) {
    return new AgentMessage(sender, recipient, kind, content, payload, conf);
  }

  /* -------------------------------------------------------------- metrics */

  /* A tiny in-memory counter set. The console's diagnostics panel reads this;
     nothing is transmitted. */
  var METRICS = {
    counters: {},
    timings: {},
    incr: function (name, by) {
      this.counters[name] = (this.counters[name] || 0) + (by === undefined ? 1 : by);
    },
    observe: function (name, ms) {
      var t = this.timings[name] || (this.timings[name] = { n: 0, total: 0, max: 0 });
      t.n++; t.total += ms; t.max = Math.max(t.max, ms);
    },
    snapshot: function () {
      var out = { counters: {}, timings: {} };
      var self = this;
      Object.keys(this.counters).forEach(function (k) { out.counters[k] = self.counters[k]; });
      Object.keys(this.timings).forEach(function (k) {
        var t = self.timings[k];
        out.timings[k] = { calls: t.n, avgMs: t.n ? t.total / t.n : 0, maxMs: t.max };
      });
      return out;
    },
    reset: function () { this.counters = {}; this.timings = {}; }
  };

  JV.uid = uid;
  JV.nowTs = nowTs;
  JV.confidence = confidence;
  JV.MessageKind = MessageKind;
  JV.AgentMessage = AgentMessage;
  JV.message = message;
  JV.METRICS = METRICS;
})(window);
