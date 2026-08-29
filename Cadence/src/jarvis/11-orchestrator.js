/* Cadence · JARVIS — the task tree and the orchestrator.

   Ported from jarvis/orchestrator/*.py. The orchestrator runs the canonical
   loop — understand → plan → clarify → execute → verify → reflect → deliver —
   delegating each phase to an agent and keeping a full trace. The console
   renders that trace verbatim, so what you see is the run, not a summary of it. */
(function (global) {
  'use strict';

  var JV = global.JV = global.JV || {};
  var K = JV.MessageKind;

  var TaskStatus = {
    PENDING: 'pending',
    RUNNING: 'running',
    DONE: 'done',
    FAILED: 'failed',
    BLOCKED: 'blocked',
    NEEDS_CLARIFICATION: 'needs_clarification'
  };

  /* ---------------------------------------------------------- task tree */

  function Task(description, opts) {
    opts = opts || {};
    this.id = JV.uid('task');
    this.description = description;
    this.parentId = opts.parentId || null;
    this.status = opts.status || TaskStatus.PENDING;
    this.priority = opts.priority === undefined ? 5 : opts.priority;
    this.dependsOn = opts.dependsOn || [];
    this.step = opts.step || null;
    this.confidence = 0;
    this.result = null;
    this.output = null;
    this.proposal = null;
    this.error = null;
  }

  function TaskTree(root) {
    this.tasks = {};
    this.rootId = root.id;
    this.add(root);
  }

  TaskTree.prototype.add = function (task) { this.tasks[task.id] = task; return task; };
  TaskTree.prototype.get = function (id) { return this.tasks[id]; };
  TaskTree.prototype.all = function () {
    var self = this;
    return Object.keys(this.tasks).map(function (k) { return self.tasks[k]; });
  };
  Object.defineProperty(TaskTree.prototype, 'root', {
    get: function () { return this.tasks[this.rootId]; }
  });
  TaskTree.prototype.children = function (id) {
    return this.all().filter(function (t) { return t.parentId === id; });
  };
  TaskTree.prototype.addChild = function (parentId, description, opts) {
    opts = opts || {};
    opts.parentId = parentId;
    return this.add(new Task(description, opts));
  };

  /* Pending leaves whose dependencies are all done, in priority order. This is
     where dependency ordering — and any future parallelism — is expressed. */
  TaskTree.prototype.readyTasks = function () {
    var self = this;
    return this.all().filter(function (t) {
      if (t.status !== TaskStatus.PENDING) return false;
      if (self.children(t.id).length) return false;
      return t.dependsOn.every(function (d) {
        return !self.tasks[d] || self.tasks[d].status === TaskStatus.DONE;
      });
    }).sort(function (a, b) { return a.priority - b.priority; });
  };

  TaskTree.prototype.isComplete = function () {
    var self = this;
    return this.all().every(function (t) {
      if (self.children(t.id).length) return true;
      return t.status === TaskStatus.DONE || t.status === TaskStatus.FAILED;
    });
  };

  TaskTree.prototype.summary = function () {
    var byStatus = {};
    this.all().forEach(function (t) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    });
    return { total: this.all().length, byStatus: byStatus };
  };

  /* -------------------------------------------------------- orchestrator */

  function Orchestrator(opts) {
    this.planner = opts.planner;
    this.executor = opts.executor;
    this.reflection = opts.reflection || null;
    this.longTerm = opts.longTerm || null;
    this.config = Object.assign({
      maxSubtasks: 8,
      maxRetries: 1,
      clarifyBelowConfidence: 0.35
    }, opts.config || {});
  }

  /* Run the loop for one goal. `onTrace` is called as each phase lands so the
     console can stream the reasoning instead of blocking on the whole run. */
  Orchestrator.prototype.run = function (goal, options) {
    options = options || {};
    var self = this;
    var trace = [];
    var onTrace = options.onTrace || function () {};

    function push(phase, detail, confidence) {
      var entry = { phase: phase, detail: detail, confidence: confidence === undefined ? 1 : confidence };
      trace.push(entry);
      try { onTrace(entry, trace); } catch (err) { /* a UI error must not kill the run */ }
      return entry;
    }

    // 1. UNDERSTAND — recall anything relevant we already know.
    var recalled = this.longTerm ? this.longTerm.retrieveAll(goal, 3) : [];
    var context = recalled.map(function (h) { return h.doc.text; }).join('\n');
    push('understand', recalled.length
      ? 'Recalled ' + recalled.length + ' relevant memor' + (recalled.length === 1 ? 'y' : 'ies')
      : 'No prior context');

    // 2. PLAN
    var planRequest = JV.message('orchestrator', this.planner.name, K.REQUEST, goal, { context: context });

    return this.planner.handle(planRequest).then(function (planMsg) {
      var steps = planMsg.payload.steps || [];
      push('plan', steps.length + ' step' + (steps.length === 1 ? '' : 's') + ': ' +
        steps.map(function (s) { return s.text; }).join(' → '), planMsg.confidence);

      // 3. CLARIFY — stop and ask rather than act on a guess.
      if (planMsg.kind === K.CLARIFY || planMsg.confidence < self.config.clarifyBelowConfidence) {
        var question = planMsg.kind === K.CLARIFY
          ? planMsg.content
          : 'I need a little more detail before I act on that.';
        push('clarify', question, planMsg.confidence);
        var ctree = new TaskTree(new Task(goal, { status: TaskStatus.NEEDS_CLARIFICATION }));
        return {
          goal: goal, answer: question, status: 'needs_clarification',
          tree: ctree, trace: trace, clarification: question,
          proposals: [], confidence: planMsg.confidence
        };
      }

      // Build the tree. Steps run in sequence by default.
      var tree = new TaskTree(new Task(goal, { status: TaskStatus.RUNNING }));
      var previousId = null;
      steps.slice(0, self.config.maxSubtasks).forEach(function (step, index) {
        var child = tree.addChild(tree.rootId, step.text, {
          priority: index + 1,
          dependsOn: previousId ? [previousId] : [],
          step: step
        });
        previousId = child.id;
      });

      // 4-6. EXECUTE + VERIFY.
      return self._executeTree(tree, context, push).then(function () {
        var proposals = [];
        var results = [];
        tree.children(tree.rootId).forEach(function (t) {
          if (t.proposal) proposals.push({ task: t, proposal: t.proposal });
          results.push({
            description: t.description, status: t.status,
            output: t.output, error: t.error, confidence: t.confidence
          });
        });

        var hasFailures = tree.all().some(function (t) { return t.status === TaskStatus.FAILED; });
        var answer = self._compose(goal, tree);
        tree.root.status = hasFailures ? TaskStatus.FAILED : TaskStatus.DONE;
        tree.root.result = answer;

        // 7. REFLECT
        var reflectPromise = self.reflection
          ? self.reflection.handle(JV.message('orchestrator', self.reflection.name, K.REQUEST, goal, {
            goal: goal, results: results
          }))
          : Promise.resolve(null);

        return reflectPromise.then(function (reflectMsg) {
          var report = reflectMsg ? reflectMsg.payload.report : null;
          if (report) push('reflect', 'quality=' + report.quality.toFixed(2), report.quality);

          // Record the episode so tomorrow's run knows what today asked.
          if (self.longTerm) {
            self.longTerm.recordEvent('Asked: ' + goal, { status: hasFailures ? 'failed' : 'ok' });
          }

          // 8. DELIVER
          push('deliver', answer, planMsg.confidence);
          return {
            goal: goal,
            answer: answer,
            status: hasFailures ? 'failed' : 'delivered',
            tree: tree,
            trace: trace,
            proposals: proposals,
            results: results,
            reflection: report,
            confidence: planMsg.confidence
          };
        });
      });
    });
  };

  Orchestrator.prototype._executeTree = function (tree, context, push) {
    var self = this;

    function loop() {
      if (tree.isComplete()) return Promise.resolve();
      var ready = tree.readyTasks();
      if (!ready.length) return Promise.resolve();
      // Sequential by design: a scheduling step often depends on the state the
      // previous one left behind.
      return self._runTask(ready[0], context, push).then(loop);
    }
    return loop();
  };

  Orchestrator.prototype._runTask = function (task, context, push) {
    var self = this;
    var attempts = 0;

    function attempt() {
      attempts++;
      task.status = TaskStatus.RUNNING;
      var request = JV.message('orchestrator', self.executor.name, K.REQUEST, task.description, {
        context: context, step: task.step
      });
      return self.executor.handle(request).then(function (response) {
        task.confidence = response.confidence;
        if (response.kind !== K.ERROR) {
          task.status = TaskStatus.DONE;
          task.result = response.content;
          task.output = response.payload.output || null;
          task.proposal = response.payload.proposal || null;
          push('execute', task.description + ' → ' + response.content, response.confidence);
          return;
        }
        task.error = response.content;
        if (attempts <= self.config.maxRetries) {
          push('execute', task.description + ' → retry ' + attempts + ': ' + response.content, response.confidence);
          return attempt();
        }
        task.status = TaskStatus.FAILED;
        push('execute', task.description + ' → failed: ' + response.content, response.confidence);
      });
    }
    return attempt();
  };

  /* Assemble the delivered answer from the completed steps. Tool outputs carry
     their own headline and lines, so the answer is the tools' own words rather
     than a paraphrase that could drift from the data. */
  Orchestrator.prototype._compose = function (goal, tree) {
    var done = tree.children(tree.rootId).filter(function (t) { return t.status === TaskStatus.DONE; });
    var failed = tree.children(tree.rootId).filter(function (t) { return t.status === TaskStatus.FAILED; });

    var parts = [];
    done.forEach(function (t) {
      if (t.proposal) {
        parts.push(t.proposal.title + (t.proposal.detail ? ' — ' + t.proposal.detail : ''));
      } else if (t.output && t.output.headline) {
        parts.push(t.output.headline);
      } else if (t.result) {
        parts.push(t.result);
      }
    });

    if (!parts.length && failed.length) {
      return failed.map(function (t) { return t.error || (t.description + ' failed'); }).join(' ');
    }
    if (!parts.length) return 'Nothing to report.';
    if (failed.length) {
      parts.push('I could not finish: ' + failed.map(function (t) {
        return t.error || t.description;
      }).join('; '));
    }
    return parts.join(' ');
  };

  JV.Task = Task;
  JV.TaskTree = TaskTree;
  JV.TaskStatus = TaskStatus;
  JV.Orchestrator = Orchestrator;
})(window);
