/* Cadence · JARVIS — the assistant facade.

   One object the rest of the app talks to. It owns the memory, the tool belt,
   the four agents and the orchestrator, keeps the conversation, and persists
   what it has learned to localStorage beside Cadence's own state.

   Mirrors jarvis/api/sdk.py: ask(), remember(), recall(), status(). */
(function (global) {
  'use strict';

  var JV = global.JV = global.JV || {};
  var KEY = 'cadence.jarvis.v1';

  function Assistant() {
    this.memory = new JV.LongTermMemory();
    this.working = new JV.WorkingMemory(60);
    this.reasoner = new JV.LocalReasoner();
    this.remote = new JV.RemoteProvider(this.remoteConfig());
    this.tools = JV.buildToolbelt();

    var deps = { reasoner: this.reasoner, tools: this.tools, longTerm: this.memory };
    this.planner = new JV.PlannerAgent(deps);
    this.executor = new JV.ExecutorAgent(deps);
    this.reflection = new JV.ReflectionAgent(deps);
    this.memoryAgent = new JV.MemoryAgent(deps);

    this.orchestrator = new JV.Orchestrator({
      planner: this.planner,
      executor: this.executor,
      reflection: this.reflection,
      longTerm: this.memory
    });

    this.conversation = [];      // {role, text, run?, at}
    this.autoApply = false;      // when true, write tools commit without asking
    this.memoryEnabled = true;   // §23: memory is a feature the user can switch off
    this.state = 'ready';        // ready | thinking | scheduling | waiting | error
    this.listeners = [];
    this.load();
  }

  /* The console mirrors this; it is what makes JARVIS look connected to what
     it is actually doing rather than showing a generic spinner. */
  Assistant.prototype.setState = function (state, note) {
    this.state = state;
    this.note = note || '';
    this.listeners.forEach(function (fn) {
      try { fn(state, note); } catch (err) { /* a UI error must not stop a run */ }
    });
  };

  Assistant.prototype.onState = function (fn) { this.listeners.push(fn); };

  /* ---------------------------------------------------------- settings */

  Assistant.prototype.remoteConfig = function () {
    var s = {};
    try { s = S.settings().jarvisRemote || {}; } catch (err) { /* pre-boot */ }
    return s;
  };

  Assistant.prototype.refreshRemote = function () {
    this.remote = new JV.RemoteProvider(this.remoteConfig());
  };

  /* ------------------------------------------------------- persistence */

  Assistant.prototype.load = function () {
    var raw = null;
    try { raw = global.localStorage.getItem(KEY); } catch (err) { return; }
    if (!raw) return;
    try {
      var data = JSON.parse(raw);
      this.memory.load(data.memory);
      if (typeof data.autoApply === 'boolean') this.autoApply = data.autoApply;
      if (typeof data.memoryEnabled === 'boolean') this.memoryEnabled = data.memoryEnabled;
      if (Array.isArray(data.conversation)) {
        // Replay text only — a stored run's closures cannot survive a reload.
        this.conversation = data.conversation.slice(-40).map(function (m) {
          return { role: m.role, text: m.text, at: m.at, replayed: true };
        });
      }
    } catch (err) {
      // A corrupt blob should cost the user their assistant history, not their
      // calendar. Drop it and carry on.
      try { global.localStorage.removeItem(KEY); } catch (e2) { /* ignore */ }
    }
  };

  Assistant.prototype.persist = function () {
    var self = this;
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(function () {
      try {
        global.localStorage.setItem(KEY, JSON.stringify({
          v: 1,
          memory: self.memory.toJSON(),
          autoApply: self.autoApply,
          memoryEnabled: self.memoryEnabled,
          conversation: self.conversation.slice(-40).map(function (m) {
            return { role: m.role, text: m.text, at: m.at };
          })
        }));
      } catch (err) { /* quota or private mode — the app still works */ }
    }, 400);
  };

  /* --------------------------------------------------------------- ask */

  /* Run one request. Resolves with the orchestrator's result; the run is also
     appended to the conversation so the console can re-render from state. */
  Assistant.prototype.ask = function (text, options) {
    options = options || {};
    var self = this;
    var goal = String(text || '').trim();
    if (!goal) return Promise.resolve(null);

    this.working.addUser(goal);
    this.conversation.push({ role: 'user', text: goal, at: JV.nowTs() });

    // Auto-apply mode runs write tools for real; otherwise they propose first.
    this.executor.dryRun = !this.autoApply;
    this.setState('thinking');

    return this.orchestrator.run(goal, {
      onTrace: function (entry, trace) {
        // Reflect the phase so the console can show what is happening now.
        if (entry.phase === 'plan') self.setState('thinking', 'Working out the steps');
        else if (entry.phase === 'execute') self.setState('scheduling', entry.detail.split(' →')[0]);
        else if (entry.phase === 'clarify') self.setState('waiting', entry.detail);
        if (options.onTrace) options.onTrace(entry, trace);
      }
    })
      .then(function (result) {
        self.working.addAssistant(result.answer);
        self.conversation.push({
          role: 'assistant', text: result.answer, run: result, at: JV.nowTs()
        });
        self.setState(
          result.status === 'needs_clarification' ? 'waiting'
            : (result.proposals && result.proposals.length) ? 'waiting'
              : result.status === 'failed' ? 'error' : 'ready'
        );
        self.persist();
        return result;
      })
      .catch(function (err) {
        var message = 'Something went wrong: ' + (err && err.message ? err.message : String(err));
        self.conversation.push({ role: 'assistant', text: message, error: true, at: JV.nowTs() });
        self.setState('error', message);
        self.persist();
        throw err;
      });
  };

  /* Apply one pending proposal, then read the data back before calling it a
     success. A caught exception only proves nothing threw; verification is
     what makes "done" mean the calendar actually changed. */
  Assistant.prototype.apply = function (proposal) {
    var out, verdict;
    try {
      out = proposal.commit();
    } catch (err) {
      return {
        ok: false,
        detail: (err && err.message ? err.message : String(err)) +
          ' — nothing was changed.',
        threw: true
      };
    }

    verdict = proposal.verify ? proposal.verify(out) : { ok: true, detail: 'Applied.' };
    if (verdict.ok) {
      this.memory.recordEvent('Approved: ' + proposal.title, { kind: 'approval' });
      this.persist();
    }
    return { ok: verdict.ok, detail: verdict.detail, output: out };
  };

  /* Apply one change out of a bulk proposal, verified the same way. */
  Assistant.prototype.applyChange = function (change) {
    try {
      var out = change.apply();
      var verdict = change.verify ? change.verify(out) : { ok: true, detail: 'Applied.' };
      return { ok: verdict.ok, detail: verdict.detail, output: out };
    } catch (err) {
      return { ok: false, detail: (err && err.message ? err.message : String(err)), threw: true };
    }
  };

  /* ---------------------------------------------------- the model path */

  /* JARVIS's standing instructions. The first line is the whole point: work
     out what the person means and answer it. Nothing here asks the model to
     match a command, and nothing lets it claim it changed the calendar —
     writes only ever happen through the verified tool pipeline. */
  Assistant.prototype.systemPrompt = function () {
    return [
      'You are JARVIS, the assistant built into Cadence, a personal calendar and planner.',
      '',
      'Your primary objective is to understand what the user means and respond appropriately.',
      'Do not require the user\'s message to correspond to a predefined command. If the message',
      'is conversational, respond conversationally. If they ask for an action, say what you will',
      'do. Never reply with "not detected", "unknown command", or anything of that shape.',
      '',
      'You are talking to someone about their life and their schedule. Be warm, brief and real.',
      'Match their energy: if they are excited, be excited with them; if they are tired, do not',
      'be relentlessly upbeat. Two or three sentences is usually right. Ask a follow-up when a',
      'person naturally would.',
      '',
      'You have live access to their calendar, summarised below. Use it when it genuinely helps',
      'and ignore it when it does not — not every message is about scheduling.',
      '',
      'Important: the app performs calendar changes itself, through its own verified tools.',
      'Never claim to have created, moved or deleted anything. If they want something scheduled,',
      'say so plainly and the app will offer them the action.'
    ].join('\n');
  };

  /* A compact, current picture of the calendar plus the recent conversation. */
  Assistant.prototype.chatContext = function (message) {
    var lines = [];
    try {
      var now = T.nowWall();
      var counts = Q.counts();
      var today = Q.eventsOnDay(now, { ignoreLayers: true })
        .filter(function (e) { return !e.allDay; })
        .sort(function (a, b) { return a.startWall - b.startWall; });

      lines.push('Today is ' + T.fmtDateLong(now) + ', the time is ' + T.fmtTime(now, S.settings().use24Hour) + '.');
      lines.push(today.length
        ? 'Today: ' + today.map(function (e) {
            return e.title + ' at ' + T.fmtTime(e.startWall, S.settings().use24Hour);
          }).join('; ')
        : 'Nothing scheduled today.');
      if (counts.overdue) lines.push(counts.overdue + ' task(s) overdue.');

      var deadlines = Q.upcomingDeadlines(3, now);
      if (deadlines.length) {
        lines.push('Next deadlines: ' + deadlines.map(function (d) {
          return d.title + ' (' + T.relativeDay(T.w(d.due)) + ')';
        }).join('; '));
      }

      var facts = this.memoryEnabled ? this.memory.semantic.retrieve(message, 3, false) : [];
      if (facts.length) {
        lines.push('Things you have been told about them: ' +
          facts.map(function (h) { return h.doc.text; }).join(' | '));
      }
    } catch (err) {
      lines.push('(calendar context unavailable)');
    }

    var recent = this.conversation.slice(-6).map(function (m) {
      return (m.role === 'user' ? 'User: ' : 'You: ') + m.text;
    });

    return [
      'CALENDAR CONTEXT',
      lines.join('\n'),
      '',
      recent.length ? 'RECENT CONVERSATION\n' + recent.join('\n') : '',
      '',
      'Their latest message: ' + message
    ].filter(Boolean).join('\n');
  };

  /* ------------------------------------------------------------- memory */

  Assistant.prototype.remember = function (text, meta) {
    var msg = JV.message('user', 'memory', JV.MessageKind.REQUEST, text, { meta: meta || {} });
    var self = this;
    return this.memoryAgent.handle(msg).then(function (reply) {
      self.persist();
      return reply;
    });
  };

  Assistant.prototype.recall = function (query, k) {
    return this.memory.retrieveAll(query, k || 4);
  };

  /* Everything JARVIS holds, newest first, so the user can read it all rather
     than trust a count. §23: memory you cannot inspect is not a feature. */
  Assistant.prototype.memoryList = function () {
    var out = [];
    [['fact', this.memory.semantic], ['episode', this.memory.episodic], ['skill', this.memory.procedural]]
      .forEach(function (pair) {
        pair[1].all().forEach(function (doc) {
          out.push({
            id: doc.id, kind: pair[0], store: pair[1],
            text: doc.text, at: doc.createdAt,
            source: (doc.metadata && doc.metadata.source) || null
          });
        });
      });
    // Facts and skills are what a person actually wants to review and correct;
    // episodes are a long tail of "asked X". Rank by usefulness, then recency.
    var weight = { fact: 0, skill: 1, episode: 2 };
    return out.sort(function (a, b) {
      if (weight[a.kind] !== weight[b.kind]) return weight[a.kind] - weight[b.kind];
      return b.at - a.at;
    });
  };

  Assistant.prototype.forget = function (entry) {
    var ok = entry.store.forget(entry.id);
    if (ok) this.persist();
    return ok;
  };

  Assistant.prototype.editMemory = function (entry, text) {
    var doc = entry.store.store.get(entry.id);
    if (!doc) return false;
    doc.text = text;
    doc.vector = entry.store.store.embedder.embed(text);
    this.persist();
    return true;
  };

  Assistant.prototype.setMemoryEnabled = function (on) {
    this.memoryEnabled = !!on;
    // Detach long-term memory from the agents entirely when it is off, so
    // "disabled" means nothing is read or written — not merely hidden.
    var mem = this.memoryEnabled ? this.memory : null;
    [this.planner, this.executor, this.reflection, this.memoryAgent].forEach(function (a) {
      a.longTerm = mem;
    });
    this.orchestrator.longTerm = mem;
    this.persist();
  };

  Assistant.prototype.forgetAll = function () {
    this.memory = new JV.LongTermMemory();
    [this.planner, this.executor, this.reflection, this.memoryAgent].forEach(function (a) {
      a.longTerm = this.memory;
    }, this);
    this.orchestrator.longTerm = this.memory;
    this.persist();
  };

  Assistant.prototype.clearConversation = function () {
    this.conversation = [];
    this.working.clear();
    this.persist();
  };

  /* ------------------------------------------------------------- status */

  Assistant.prototype.status = function () {
    return {
      agents: [this.planner, this.executor, this.reflection, this.memoryAgent]
        .map(function (a) { return a.status(); }),
      tools: this.tools.size(),
      toolNames: this.tools.names(),
      memory: this.memory.stats(),
      metrics: JV.METRICS.snapshot(),
      autoApply: this.autoApply,
      memoryEnabled: this.memoryEnabled,
      state: this.state,
      remote: this.remote.available()
    };
  };

  /* Non-mutating observations about the schedule, for the console to surface. */
  Assistant.prototype.insights = function () {
    try { return JV.OPTIMIZE.insights(); } catch (err) { return []; }
  };

  /* Opening suggestions, drawn from the user's real state so the assistant
     starts with something true rather than a generic greeting. */
  Assistant.prototype.openers = function () {
    var out = [];
    try {
      var counts = Q.counts();
      if (counts.overdue) out.push({ label: 'What is overdue?', text: 'what is overdue' });
      if (counts.captures) out.push({ label: 'Sort my inbox', text: 'organize my inbox' });
      out.push({ label: 'Morning briefing', text: 'give me my morning briefing' });
      out.push({ label: 'Optimize my schedule', text: 'optimize my schedule this week' });
      out.push({ label: 'What should I do now?', text: 'what should I do now' });
      out.push({ label: 'Plan my day', text: 'plan my day' });
      out.push({ label: 'How busy am I?', text: 'how busy is my week' });
    } catch (err) {
      out.push({ label: 'What should I do now?', text: 'what should I do now' });
    }
    return out.slice(0, 5);
  };

  JV.Assistant = Assistant;
  JV.boot = function () {
    if (!JV.assistant) JV.assistant = new Assistant();
    return JV.assistant;
  };
})(window);
