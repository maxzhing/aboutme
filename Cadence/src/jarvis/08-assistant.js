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

    this.conversation = [];   // {role, text, run?, at}
    this.autoApply = false;   // when true, write tools commit without asking
    this.load();
  }

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

    return this.orchestrator.run(goal, { onTrace: options.onTrace })
      .then(function (result) {
        self.working.addAssistant(result.answer);
        self.conversation.push({
          role: 'assistant', text: result.answer, run: result, at: JV.nowTs()
        });
        self.persist();
        return result;
      })
      .catch(function (err) {
        var message = 'Something went wrong: ' + (err && err.message ? err.message : String(err));
        self.conversation.push({ role: 'assistant', text: message, error: true, at: JV.nowTs() });
        self.persist();
        throw err;
      });
  };

  /* Apply one pending proposal and report what happened. */
  Assistant.prototype.apply = function (proposal) {
    var out = proposal.commit();
    this.memory.recordEvent('Approved: ' + proposal.title, { kind: 'approval' });
    this.persist();
    return out;
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
      remote: this.remote.available()
    };
  };

  /* Opening suggestions, drawn from the user's real state so the assistant
     starts with something true rather than a generic greeting. */
  Assistant.prototype.openers = function () {
    var out = [];
    try {
      var counts = Q.counts();
      if (counts.overdue) out.push({ label: 'What is overdue?', text: 'what is overdue' });
      if (counts.captures) out.push({ label: 'Sort my inbox', text: 'organize my inbox' });
      out.push({ label: 'What should I do now?', text: 'what should I do now' });
      out.push({ label: 'Plan my day', text: 'plan my day' });
      out.push({ label: 'Find me an hour', text: 'find me an hour this week' });
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
