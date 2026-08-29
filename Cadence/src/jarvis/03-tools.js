/* Cadence · JARVIS — the tool framework.

   Ported from jarvis/tools/base.py and registry.py. A tool declares a name, a
   description agents use to choose it, a light JSON-schema-ish input schema
   validated before it runs, a permission string, and timeout/retry policy.
   Authors implement `run`; the framework wraps it with validation, permission
   checks, timeouts, retries and metrics, so each tool stays tiny.

   One addition Cadence earns over the Python original: `mutates`. Cadence's
   assistant surfaces have always proposed and waited for a yes, and JARVIS
   does not get to break that. A mutating tool invoked in dry-run mode returns
   a *proposal* — a human-readable description plus a commit closure — instead
   of changing anything. The console renders the proposal and only calls commit
   when you approve it. */
(function (global) {
  'use strict';

  var JV = global.JV = global.JV || {};

  var TYPES = {
    string: function (v) { return typeof v === 'string'; },
    number: function (v) { return typeof v === 'number' && isFinite(v); },
    integer: function (v) { return typeof v === 'number' && v % 1 === 0; },
    boolean: function (v) { return typeof v === 'boolean'; },
    array: function (v) { return Array.isArray(v); },
    object: function (v) { return v && typeof v === 'object' && !Array.isArray(v); }
  };

  function ToolError(message, code) {
    this.name = 'ToolError';
    this.message = message;
    this.code = code || 'tool_error';
  }
  ToolError.prototype = Object.create(Error.prototype);

  /* ------------------------------------------------------------- context */

  function ToolContext(opts) {
    opts = opts || {};
    this.granted = opts.granted || [];
    this.dryRun = !!opts.dryRun;
    this.state = opts.state || {};
  }
  ToolContext.prototype.has = function (permission) {
    return !permission || this.granted.indexOf(permission) >= 0;
  };

  /* --------------------------------------------------------------- tool */

  function Tool(spec) {
    this.name = spec.name;
    this.description = spec.description || '';
    this.inputSchema = spec.inputSchema || {};
    this.permission = spec.permission || '';
    this.timeoutMs = spec.timeoutMs || 8000;
    this.retries = spec.retries || 0;
    this.mutates = !!spec.mutates;
    this.summary = spec.summary || null;   // (args) -> human sentence, for proposals
    this._run = spec.run;
  }

  Tool.prototype.validate = function (args) {
    var schema = this.inputSchema || {};
    var self = this;
    Object.keys(schema).forEach(function (field) {
      var rule = schema[field];
      if (args[field] === undefined || args[field] === null) {
        if (rule.required) {
          throw new ToolError(self.name + ': missing required argument "' + field + '"', 'validation');
        }
        return;
      }
      var check = TYPES[rule.type];
      if (check && !check(args[field])) {
        throw new ToolError(
          self.name + ': argument "' + field + '" must be ' + rule.type, 'validation');
      }
      if (rule.enum && rule.enum.indexOf(args[field]) < 0) {
        throw new ToolError(
          self.name + ': argument "' + field + '" must be one of ' + rule.enum.join(', '), 'validation');
      }
    });
    var known = Object.keys(schema);
    var unknown = Object.keys(args).filter(function (k) { return known.indexOf(k) < 0; });
    if (known.length && unknown.length) {
      throw new ToolError(this.name + ': unexpected arguments ' + unknown.join(', '), 'validation');
    }
  };

  /* Never rejects for tool-level failure — resolves a result envelope with
     ok:false. Framework misuse (bad args, denied permission) still rejects, so
     a programming error surfaces loudly instead of looking like a bad answer. */
  Tool.prototype.invoke = function (context, args) {
    var self = this;
    context = context || new ToolContext();
    args = args || {};

    return new Promise(function (resolve, reject) {
      try {
        self.validate(args);
      } catch (err) { return reject(err); }

      if (self.permission && !context.has(self.permission)) {
        return reject(new ToolError(
          self.name + ': requires permission "' + self.permission + '"', 'permission'));
      }

      var started = (global.performance || Date).now();
      var attempts = 0;

      function attempt() {
        attempts++;
        var settled = false;
        var timer = setTimeout(function () {
          if (settled) return;
          settled = true;
          onFailure('timed out after ' + self.timeoutMs + 'ms');
        }, self.timeoutMs);

        function onFailure(errText) {
          clearTimeout(timer);
          if (attempts <= self.retries) return attempt();
          JV.METRICS.incr('tool.errors');
          resolve({
            tool: self.name, ok: false, output: null, error: errText,
            latencyMs: (global.performance || Date).now() - started,
            attempts: attempts, callId: JV.uid('call')
          });
        }

        var value;
        try {
          value = self._run(context, args);
        } catch (err) {
          if (settled) return;
          settled = true;
          return onFailure(String(err && err.message ? err.message : err));
        }

        Promise.resolve(value).then(function (output) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          var latency = (global.performance || Date).now() - started;
          JV.METRICS.incr('tool.calls');
          JV.METRICS.observe('tool.latency_ms', latency);
          resolve({
            tool: self.name, ok: true, output: output, error: null,
            latencyMs: latency, attempts: attempts, callId: JV.uid('call')
          });
        }, function (err) {
          if (settled) return;
          settled = true;
          onFailure(String(err && err.message ? err.message : err));
        });
      }

      attempt();
    });
  };

  Tool.prototype.spec = function () {
    return {
      name: this.name,
      description: this.description,
      inputSchema: this.inputSchema,
      permission: this.permission || null,
      mutates: this.mutates
    };
  };

  /* ----------------------------------------------------------- registry */

  /* An agent holds a registry scoped to exactly the tools it may call — which
     is how the permission model composes with agent design. An agent without
     the write tools simply cannot change your calendar. */
  function ToolRegistry(tools) {
    this.tools = {};
    (tools || []).forEach(this.register, this);
  }

  ToolRegistry.prototype.register = function (tool) {
    this.tools[tool.name] = tool;
    return tool;
  };

  ToolRegistry.prototype.define = function (spec) {
    return this.register(new Tool(spec));
  };

  ToolRegistry.prototype.unregister = function (name) { delete this.tools[name]; };
  ToolRegistry.prototype.has = function (name) {
    return Object.prototype.hasOwnProperty.call(this.tools, name);
  };
  ToolRegistry.prototype.get = function (name) {
    if (!this.has(name)) throw new ToolError('No tool named "' + name + '"', 'not_found');
    return this.tools[name];
  };
  ToolRegistry.prototype.names = function () { return Object.keys(this.tools).sort(); };
  ToolRegistry.prototype.specs = function () {
    var self = this;
    return this.names().map(function (n) { return self.tools[n].spec(); });
  };
  ToolRegistry.prototype.describe = function () {
    var self = this;
    return this.names().map(function (n) {
      return '- ' + n + ': ' + self.tools[n].description;
    }).join('\n');
  };
  ToolRegistry.prototype.invoke = function (name, context, args) {
    return this.get(name).invoke(context, args);
  };
  ToolRegistry.prototype.size = function () { return this.names().length; };

  /* A proposal is what a mutating tool returns under dry-run. `commit` is the
     real effect, deferred until the person says yes. */
  function proposal(spec) {
    return {
      __proposal: true,
      title: spec.title,
      detail: spec.detail || '',
      items: spec.items || [],
      commit: spec.commit,
      undoable: spec.undoable !== false
    };
  }

  function isProposal(v) { return !!(v && v.__proposal); }

  JV.Tool = Tool;
  JV.ToolContext = ToolContext;
  JV.ToolRegistry = ToolRegistry;
  JV.ToolError = ToolError;
  JV.proposal = proposal;
  JV.isProposal = isProposal;
})(window);
