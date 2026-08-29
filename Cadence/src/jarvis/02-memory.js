/* Cadence · JARVIS — embeddings, vector store and the three long-term memories.

   Ported from jarvis/memory/*.py. Semantic memory holds durable facts about
   how you work; episodic memory holds time-stamped events and decays; and
   procedural memory holds reusable skills the reflection agent writes back.

   Retrieval is recency-weighted: cosine similarity multiplied by an
   exponential decay on age, so a fresh memory outranks a stale one of equal
   match. Reading a memory reinforces it, which is how retention becomes
   use-based rather than arbitrary. */
(function (global) {
  'use strict';

  var JV = global.JV = global.JV || {};
  var TOKEN_RE = /[a-z0-9']+/g;

  /* ----------------------------------------------------------- embeddings */

  /* Feature hashing ("the hashing trick"): no model, no network, deterministic.
     Not semantically deep, but it reliably separates the vocabulary of a
     calendar app, which is all retrieval here has to do. */
  function HashingEmbedder(dim) {
    this.dim = dim || 192;
  }

  HashingEmbedder.prototype.tokens = function (text) {
    return String(text || '').toLowerCase().match(TOKEN_RE) || [];
  };

  /* A cheap 32-bit string hash (FNV-1a). We need spread, not cryptography. */
  HashingEmbedder.prototype.hash = function (token) {
    var h = 0x811c9dc5;
    for (var i = 0; i < token.length; i++) {
      h ^= token.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h >>> 0;
  };

  HashingEmbedder.prototype.embed = function (text) {
    var vec = new Array(this.dim);
    for (var i = 0; i < this.dim; i++) vec[i] = 0;
    var toks = this.tokens(text);
    for (var j = 0; j < toks.length; j++) {
      var h = this.hash(toks[j]);
      var index = h % this.dim;
      // A second bit decides the sign, which cancels some collision bias.
      var sign = (h & 0x10000) ? 1 : -1;
      vec[index] += sign;
    }
    return l2(vec);
  };

  function l2(vec) {
    var norm = 0;
    for (var i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
    norm = Math.sqrt(norm);
    if (!norm) return vec;
    for (var j = 0; j < vec.length; j++) vec[j] /= norm;
    return vec;
  }

  function cosine(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    var dot = 0;
    for (var i = 0; i < a.length; i++) dot += a[i] * b[i];
    return dot;
  }

  /* --------------------------------------------------------- vector store */

  function VectorStore(embedder) {
    this.embedder = embedder || new HashingEmbedder();
    this.docs = [];
  }

  VectorStore.prototype.add = function (text, metadata) {
    var doc = {
      id: JV.uid('doc'),
      text: String(text || ''),
      metadata: metadata || {},
      createdAt: JV.nowTs(),
      vector: this.embedder.embed(text)
    };
    this.docs.push(doc);
    return doc.id;
  };

  VectorStore.prototype.get = function (id) {
    for (var i = 0; i < this.docs.length; i++) if (this.docs[i].id === id) return this.docs[i];
    return null;
  };

  VectorStore.prototype.remove = function (id) {
    var before = this.docs.length;
    this.docs = this.docs.filter(function (d) { return d.id !== id; });
    return this.docs.length !== before;
  };

  VectorStore.prototype.search = function (query, k) {
    var qv = this.embedder.embed(query);
    var scored = this.docs.map(function (doc) {
      return { doc: doc, score: cosine(qv, doc.vector) };
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, k || 5);
  };

  VectorStore.prototype.size = function () { return this.docs.length; };

  /* ------------------------------------------------------- decaying store */

  function DecayingStore(kind, halfLifeS, embedder) {
    this.kind = kind;
    this.halfLifeS = halfLifeS;
    this.store = new VectorStore(embedder);
  }

  DecayingStore.prototype.remember = function (text, metadata) {
    metadata = metadata || {};
    if (metadata.kind === undefined) metadata.kind = this.kind;
    if (metadata.lastAccess === undefined) metadata.lastAccess = JV.nowTs();
    return this.store.add(text, metadata);
  };

  DecayingStore.prototype.decay = function (ageS) {
    if (this.halfLifeS <= 0) return 1;
    return Math.pow(0.5, ageS / this.halfLifeS);
  };

  DecayingStore.prototype.retrieve = function (query, k, reinforce) {
    k = k || 5;
    if (reinforce === undefined) reinforce = true;
    // Pull a wider candidate set, then re-rank with the decay factor.
    var candidates = this.store.search(query, Math.max(k * 3, k));
    var now = JV.nowTs();
    var self = this;
    var hits = candidates.map(function (c) {
      var last = Number(c.doc.metadata.lastAccess || c.doc.createdAt || now);
      var weight = self.decay(Math.max(0, now - last));
      return { doc: c.doc, relevance: c.score, adjusted: c.score * weight };
    });
    hits.sort(function (a, b) { return b.adjusted - a.adjusted; });
    var top = hits.slice(0, k);
    if (reinforce) top.forEach(function (h) { h.doc.metadata.lastAccess = now; });
    return top;
  };

  DecayingStore.prototype.forget = function (id) { return this.store.remove(id); };
  DecayingStore.prototype.size = function () { return this.store.size(); };
  DecayingStore.prototype.all = function () { return this.store.docs.slice(); };

  var YEAR = 365 * 24 * 3600;
  var WEEK = 7 * 24 * 3600;

  /* ------------------------------------------------------------ long term */

  function LongTermMemory(embedder) {
    embedder = embedder || new HashingEmbedder();
    // Facts and skills barely decay; episodes fade over about a week.
    this.semantic = new DecayingStore('semantic', YEAR, embedder);
    this.episodic = new DecayingStore('episodic', WEEK, embedder);
    this.procedural = new DecayingStore('procedural', YEAR, embedder);
  }

  LongTermMemory.prototype.recordEvent = function (description, metadata) {
    metadata = metadata || {};
    metadata.eventTime = JV.nowTs();
    return this.episodic.remember(description, metadata);
  };

  LongTermMemory.prototype.learnSkill = function (name, steps) {
    var body = 'Skill: ' + name + '\n' + (steps || []).map(function (s) {
      return '- ' + s;
    }).join('\n');
    return this.procedural.remember(body, { skill: name, steps: steps || [] });
  };

  LongTermMemory.prototype.retrieveAll = function (query, k) {
    k = k || 3;
    var hits = [];
    [this.semantic, this.episodic, this.procedural].forEach(function (store) {
      hits = hits.concat(store.retrieve(query, k));
    });
    hits.sort(function (a, b) { return b.adjusted - a.adjusted; });
    // A weak match is worse than no context at all — it makes the assistant
    // sound like it is free-associating. Drop anything near-orthogonal.
    return hits.filter(function (h) { return h.relevance > 0.12; }).slice(0, k);
  };

  LongTermMemory.prototype.stats = function () {
    return {
      semantic: this.semantic.size(),
      episodic: this.episodic.size(),
      procedural: this.procedural.size()
    };
  };

  /* Serialization keeps text + metadata only; vectors are recomputed on load
     so a change to the embedder can never desync the index from the corpus. */
  LongTermMemory.prototype.toJSON = function () {
    function dump(store) {
      return store.all().map(function (d) {
        return { t: d.text, m: d.metadata, c: d.createdAt };
      });
    }
    return {
      v: 1,
      semantic: dump(this.semantic),
      episodic: dump(this.episodic),
      procedural: dump(this.procedural)
    };
  };

  LongTermMemory.prototype.load = function (data) {
    if (!data) return this;
    var self = this;
    [['semantic', this.semantic], ['episodic', this.episodic], ['procedural', this.procedural]]
      .forEach(function (pair) {
        var rows = data[pair[0]];
        if (!Array.isArray(rows)) return;
        rows.forEach(function (row) {
          var id = pair[1].remember(row.t, row.m || {});
          var doc = pair[1].store.get(id);
          if (doc && row.c) doc.createdAt = row.c;
        });
      });
    return self;
  };

  /* ---------------------------------------------------------- short term */

  /* The assistant's RAM: a bounded window of the conversation plus a
     scratchpad the reasoning loop writes intermediate notes into. */
  function WorkingMemory(maxMessages) {
    this.maxMessages = maxMessages || 40;
    this.messages = [];
    this.scratch = {};
  }

  WorkingMemory.prototype.add = function (role, content) {
    this.messages.push({ role: role, content: content, at: JV.nowTs() });
    while (this.messages.length > this.maxMessages) this.messages.shift();
  };

  WorkingMemory.prototype.addUser = function (t) { this.add('user', t); };
  WorkingMemory.prototype.addAssistant = function (t) { this.add('assistant', t); };
  WorkingMemory.prototype.history = function () { return this.messages.slice(); };
  WorkingMemory.prototype.lastUser = function () {
    for (var i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === 'user') return this.messages[i].content;
    }
    return '';
  };
  WorkingMemory.prototype.note = function (k, v) { this.scratch[k] = v; };
  WorkingMemory.prototype.recall = function (k, d) {
    return this.scratch[k] === undefined ? (d || '') : this.scratch[k];
  };
  WorkingMemory.prototype.clear = function () { this.messages = []; this.scratch = {}; };

  JV.HashingEmbedder = HashingEmbedder;
  JV.VectorStore = VectorStore;
  JV.DecayingStore = DecayingStore;
  JV.LongTermMemory = LongTermMemory;
  JV.WorkingMemory = WorkingMemory;
  JV.cosine = cosine;
})(window);
