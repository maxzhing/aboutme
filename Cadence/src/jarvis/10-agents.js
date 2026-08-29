/* Cadence · JARVIS — the agents.

   Ported from jarvis/agents/*.py. Each agent has a role, its own tool
   registry, a working-memory context window, access to long-term memory, a
   health status and a confidence score it updates as it works — so the
   orchestrator can react by retrying, asking, or reassigning.

   Agents never call each other. They return AgentMessage envelopes and the
   orchestrator routes them, which is what makes every hand-off inspectable in
   the console's trace. */
(function (global) {
  'use strict';

  var JV = global.JV = global.JV || {};
  var K = JV.MessageKind;

  var Health = { OK: 'ok', DEGRADED: 'degraded', FAILED: 'failed' };

  /* ---------------------------------------------------------------- base */

  function Agent(config, deps) {
    deps = deps || {};
    this.config = config;
    this.name = config.name;
    this.reasoner = deps.reasoner;
    this.tools = deps.tools || new JV.ToolRegistry();
    this.longTerm = deps.longTerm || null;
    this.memory = new JV.WorkingMemory(20);
    this.health = Health.OK;
    this.confidence = 1;
  }

  Agent.prototype.status = function () {
    return {
      name: this.name,
      role: this.config.role,
      health: this.health,
      confidence: this.confidence,
      tools: this.tools.names()
    };
  };

  Agent.prototype.context = function () {
    return new JV.ToolContext({
      granted: this.config.permissions || [],
      dryRun: this.dryRun
    });
  };

  Agent.prototype.useTool = function (name, args) {
    var self = this;
    if (!this.tools.has(name)) {
      return Promise.resolve({
        tool: name, ok: false, error: 'tool "' + name + '" is not available to ' + this.name
      });
    }
    return this.tools.invoke(name, this.context(), args || {}).then(function (result) {
      if (!result.ok) self.health = Health.DEGRADED;
      return result;
    });
  };

  Agent.prototype.recall = function (query, k) {
    if (!this.longTerm) return [];
    return this.longTerm.retrieveAll(query, k || 3).map(function (h) { return h.doc.text; });
  };

  /* ------------------------------------------------------------- planner */

  function PlannerAgent(deps) {
    Agent.call(this, {
      name: 'planner',
      role: 'Decompose a request into the smallest correct plan',
      objectives: ['produce the smallest correct plan', 'flag ambiguity early'],
      permissions: []
    }, deps);
  }
  PlannerAgent.prototype = Object.create(Agent.prototype);

  PlannerAgent.prototype.handle = function (message) {
    var plan = this.reasoner.plan(message.content, message.payload.context);
    this.confidence = JV.confidence(plan.confidence);

    if (plan.clarify) {
      this.health = Health.OK;
      return Promise.resolve(message.reply(plan.clarify, K.CLARIFY, {
        steps: plan.steps, matched: plan.matched, confidence: this.confidence
      }));
    }
    if (!plan.steps.length) {
      this.confidence = JV.confidence(0.2);
      return Promise.resolve(message.reply(
        'I could not turn that into anything actionable.', K.CLARIFY,
        { steps: [], confidence: this.confidence }));
    }
    return Promise.resolve(message.reply(
      plan.steps.map(function (s, i) { return (i + 1) + '. ' + s.text; }).join('\n'),
      K.RESULT,
      { steps: plan.steps, matched: plan.matched, confidence: this.confidence }
    ));
  };

  /* ------------------------------------------------------------ executor */

  function ExecutorAgent(deps) {
    Agent.call(this, {
      name: 'executor',
      role: 'Carry out one plan step, invoking a tool when the step names one',
      permissions: [
        'calendar.read', 'calendar.write', 'tasks.read', 'tasks.write',
        'notes.write', 'memory.read', 'memory.write'
      ]
    }, deps);
    this.dryRun = true;
  }
  ExecutorAgent.prototype = Object.create(Agent.prototype);

  ExecutorAgent.prototype.handle = function (message) {
    var self = this;
    var step = message.payload.step || {};

    if (!step.tool) {
      // A reasoning-only step. Nothing to run, so report it honestly rather
      // than dressing it up as work performed.
      this.confidence = JV.confidence(0.6);
      return Promise.resolve(message.reply(step.text || message.content, K.RESULT, {
        confidence: this.confidence, output: null
      }));
    }

    return this.useTool(step.tool, step.args).then(function (result) {
      if (!result.ok) {
        self.confidence = JV.confidence(0.3);
        return message.reply(result.error || 'The step failed.', K.ERROR, {
          confidence: self.confidence, tool: step.tool, error: result.error
        });
      }
      self.health = Health.OK;
      var output = result.output;
      var proposal = JV.isProposal(output) ? output : null;
      self.confidence = JV.confidence(proposal ? 0.8 : 0.9);
      return message.reply(
        proposal ? proposal.title : (output && output.headline) || 'Done.',
        K.RESULT,
        {
          confidence: self.confidence,
          tool: step.tool,
          output: output,
          proposal: proposal,
          latencyMs: result.latencyMs
        }
      );
    });
  };

  /* ---------------------------------------------------------- reflection */

  /* Scores the run, extracts a lesson, and writes durable lessons into
     procedural memory — the loop that makes the assistant sharper the more you
     use it rather than merely older. */
  function ReflectionAgent(deps) {
    Agent.call(this, {
      name: 'reflection',
      role: 'Evaluate the outcome and capture what to do differently',
      permissions: []
    }, deps);
  }
  ReflectionAgent.prototype = Object.create(Agent.prototype);

  ReflectionAgent.prototype.handle = function (message) {
    var results = message.payload.results || [];
    var goal = message.payload.goal || message.content;
    var failures = results.filter(function (r) { return r.status === 'failed'; });
    var empties = results.filter(function (r) {
      return r.status === 'done' && r.output && Array.isArray(r.output.lines) && !r.output.lines.length;
    });

    var quality = 1;
    if (failures.length) quality -= 0.5 * (failures.length / Math.max(1, results.length));
    if (empties.length) quality -= 0.15;
    quality = JV.confidence(quality);

    var issues = [];
    var lessons = [];
    failures.forEach(function (f) {
      issues.push(f.description + ': ' + (f.error || 'failed'));
      if (/could not find an open task/i.test(f.error || '')) {
        lessons.push('When a task name does not resolve, ask which task was meant instead of guessing.');
      }
    });
    if (empties.length && !failures.length) {
      lessons.push('A question about “' + goal + '” returned nothing; the underlying data may be empty.');
    }

    if (this.longTerm && lessons.length) {
      var lt = this.longTerm;
      lessons.forEach(function (lesson) {
        lt.procedural.remember(lesson, { source: 'reflection', goal: goal });
      });
    }

    this.confidence = quality;
    var report = { quality: quality, issues: issues, lessons: lessons };
    return Promise.resolve(message.reply(
      'quality=' + quality.toFixed(2), K.RESULT,
      { report: report, quality: quality, confidence: quality }
    ));
  };

  /* -------------------------------------------------------------- memory */

  /* Writes durable facts, skipping near-duplicates so repeating yourself does
     not slowly poison retrieval. Mirrors jarvis/agents/memory_agent.py. */
  function MemoryAgent(deps) {
    Agent.call(this, {
      name: 'memory',
      role: 'Store and retrieve durable knowledge',
      permissions: ['memory.read', 'memory.write']
    }, deps);
  }
  MemoryAgent.prototype = Object.create(Agent.prototype);

  MemoryAgent.prototype.isDuplicate = function (text, threshold) {
    if (!this.longTerm) return false;
    var hits = this.longTerm.semantic.retrieve(text, 1, false);
    return !!(hits.length && hits[0].relevance >= (threshold || 0.97));
  };

  MemoryAgent.prototype.handle = function (message) {
    var action = message.payload.action || 'store';
    var text = message.content;
    if (!this.longTerm) {
      this.confidence = JV.confidence(0.2);
      return Promise.resolve(message.reply('No memory attached', K.ERROR, { stored: false }));
    }
    if (action === 'episode') {
      this.longTerm.recordEvent(text, message.payload.meta || {});
      this.confidence = JV.confidence(0.9);
      return Promise.resolve(message.reply('Recorded', K.RESULT, { stored: true, confidence: 0.9 }));
    }
    if (action === 'learn_skill') {
      this.longTerm.learnSkill(message.payload.skill || 'unnamed', message.payload.steps || []);
      this.confidence = JV.confidence(0.9);
      return Promise.resolve(message.reply('Learned', K.RESULT, { stored: true, confidence: 0.9 }));
    }
    if (this.isDuplicate(text)) {
      this.confidence = JV.confidence(0.6);
      return Promise.resolve(message.reply('Skipped near-duplicate fact', K.RESULT, {
        stored: false, confidence: 0.6
      }));
    }
    this.longTerm.semantic.remember(text, message.payload.meta || {});
    this.confidence = JV.confidence(0.9);
    return Promise.resolve(message.reply('Stored', K.RESULT, { stored: true, confidence: 0.9 }));
  };

  JV.Health = Health;
  JV.Agent = Agent;
  JV.PlannerAgent = PlannerAgent;
  JV.ExecutorAgent = ExecutorAgent;
  JV.ReflectionAgent = ReflectionAgent;
  JV.MemoryAgent = MemoryAgent;
})(window);
