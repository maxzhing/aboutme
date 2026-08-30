/* Cadence · JARVIS — the way out to the internet.

   Everything before this file ran with no network at all, and JARVIS said so
   rather than pretending otherwise. This file is the actual connection.

   The constraint that shapes it: Cadence is one HTML file, usually opened from
   disk, so its page origin is `null`. That rules out anything needing a server,
   a secret key, or a permissive referrer. What is left — and it is a lot — is
   the set of public APIs that answer an anonymous cross-origin GET:

     wikipedia    search + article summaries          general knowledge
     wiktionary   definitions via dictionaryapi.dev   words
     open-meteo   forecast + place lookup, no key     weather, by place
     hn           Algolia's Hacker News index         technology news
     openlibrary  book search                         books
     frankfurter  ECB reference rates                 currency
     duckduckgo   instant answers                     facts, quick lookups
     reader       r.jina.ai renders any URL as text   the open web

   Two rules hold everywhere in here, and they are the reason to trust it:

   1. Nothing is invented. Every fact carries the URL it came from. A source
      that fails, times out, or returns a shape we do not recognise is reported
      as having failed — never smoothed over, never filled in from guesswork.
   2. Only the question ever leaves. Not the calendar, not the tasks, not the
      notes — the lookup sends a query string and nothing else, with no cookies
      and no credentials. One switch in the JARVIS panel turns it all off.

   A note on verification: these endpoints could not be reached from the machine
   this was written on, so the parsers are written against each API's documented
   shape and are defensive about everything else. `testAll()` exists so the
   answer to "does this actually work from your browser" is one click away
   rather than a promise. */
(function (global) {
  'use strict';

  var JV = global.JV = global.JV || {};
  var S = global.S;

  var DEFAULT_TIMEOUT = 12000;

  /* ------------------------------------------------------------ settings */

  var DEFAULTS = {
    enabled: true,         // on — the switch below turns it off
    timeout: DEFAULT_TIMEOUT,
    reader: true,          // allow the r.jina.ai reader for arbitrary URLs
    place: ''              // remembered location for weather, if the user gives one
  };

  function config() {
    var s = {};
    try { s = (S.settings().jarvisWeb) || {}; } catch (err) { /* pre-boot */ }
    var out = {};
    Object.keys(DEFAULTS).forEach(function (k) {
      out[k] = s[k] === undefined ? DEFAULTS[k] : s[k];
    });
    return out;
  }

  function setConfig(patch) {
    var next = Object.assign({}, config(), patch || {});
    S.setSetting('jarvisWeb', next);
    return next;
  }

  function enabled() { return !!config().enabled; }

  /* An error that carries which source failed and why, so the console can say
     something truthful instead of a generic shrug. */
  function WebError(source, message, cause) {
    this.name = 'WebError';
    this.source = source;
    this.message = message;
    this.cause = cause || null;
  }
  WebError.prototype = Object.create(Error.prototype);

  /* ------------------------------------------------------------ fetching */

  /* One place where every request goes out, so the timeout, the abort and the
     "is this switched on" check cannot be forgotten at a call site. */
  function request(source, url, opts) {
    opts = opts || {};
    if (!opts.force && !enabled()) {
      return Promise.reject(new WebError(source,
        'Going online is switched off — turn it on in the JARVIS panel and I will look it up.'));
    }
    if (typeof global.fetch !== 'function') {
      return Promise.reject(new WebError(source, 'This browser has no fetch support.'));
    }

    var ms = opts.timeout || config().timeout || DEFAULT_TIMEOUT;
    var controller = typeof global.AbortController === 'function' ? new global.AbortController() : null;
    var timer = null;
    var timedOut = false;

    var p = new Promise(function (resolve, reject) {
      timer = global.setTimeout(function () {
        timedOut = true;
        if (controller) controller.abort();
        reject(new WebError(source, 'took longer than ' + Math.round(ms / 1000) + 's and I gave up'));
      }, ms);

      global.fetch(url, {
        method: 'GET',
        signal: controller ? controller.signal : undefined,
        // No cookies, no credentials — the query is the only thing that goes.
        credentials: 'omit',
        redirect: 'follow',
        headers: opts.headers || {}
      }).then(function (res) {
        if (!res.ok) throw new WebError(source, 'answered ' + res.status + ' ' + (res.statusText || ''));
        return opts.text ? res.text() : res.json();
      }).then(resolve, function (err) {
        if (timedOut) return;                       // already rejected above
        if (err instanceof WebError) return reject(err);
        // A cross-origin refusal arrives as an opaque TypeError with no detail,
        // so name the likely cause rather than leaving the user with "failed".
        reject(new WebError(source,
          /abort/i.test(err && err.name || '') ? 'was cancelled'
            : 'could not be reached (no connection, or the browser blocked the request)', err));
      });
    });

    return p.then(function (v) { global.clearTimeout(timer); return v; },
      function (e) { global.clearTimeout(timer); throw e; });
  }

  function enc(s) { return encodeURIComponent(String(s == null ? '' : s)); }

  /* Strip the HTML MediaWiki puts in search snippets. */
  function detag(s) {
    return String(s || '').replace(/<[^>]*>/g, '').replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&#\d+;/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function clip(s, n) {
    s = String(s || '').trim();
    if (s.length <= n) return s;
    var cut = s.slice(0, n);
    var stop = cut.lastIndexOf('. ');
    return (stop > n * 0.5 ? cut.slice(0, stop + 1) : cut.trim() + '…');
  }

  /* ----------------------------------------------------------- wikipedia */

  var WIKI = 'https://en.wikipedia.org';

  function wikiSearch(query, limit) {
    var url = WIKI + '/w/api.php?action=query&list=search&srsearch=' + enc(query) +
      '&srlimit=' + (limit || 5) + '&format=json&origin=*';
    return request('Wikipedia', url).then(function (data) {
      var hits = data && data.query && data.query.search;
      if (!Array.isArray(hits)) throw new WebError('Wikipedia', 'returned something I could not read');
      return hits.map(function (h) {
        return {
          source: 'Wikipedia',
          title: h.title,
          snippet: detag(h.snippet),
          url: WIKI + '/wiki/' + enc(String(h.title).replace(/ /g, '_'))
        };
      });
    });
  }

  function wikiSummary(title) {
    var url = WIKI + '/api/rest_v1/page/summary/' + enc(String(title).replace(/ /g, '_'));
    return request('Wikipedia', url).then(function (d) {
      if (!d || typeof d.extract !== 'string') {
        throw new WebError('Wikipedia', 'has no article summary for “' + title + '”');
      }
      return {
        source: 'Wikipedia',
        title: d.title || title,
        description: d.description || '',
        extract: d.extract,
        thumb: d.thumbnail && d.thumbnail.source || null,
        url: (d.content_urls && d.content_urls.desktop && d.content_urls.desktop.page) ||
          (WIKI + '/wiki/' + enc(String(title).replace(/ /g, '_')))
      };
    });
  }

  /* Search, then read the best article. Two round trips, but it means a loose
     phrase ("how do black holes form") lands on a real page. */
  function wikiLookup(query) {
    return wikiSearch(query, 3).then(function (hits) {
      if (!hits.length) throw new WebError('Wikipedia', 'has nothing on “' + query + '”');
      return wikiSummary(hits[0].title).then(function (sum) {
        sum.alternatives = hits.slice(1);
        return sum;
      });
    });
  }

  /* ---------------------------------------------------------- dictionary */

  function define(word) {
    var w = String(word || '').trim().split(/\s+/)[0];
    var url = 'https://api.dictionaryapi.dev/api/v2/entries/en/' + enc(w);
    return request('the dictionary', url).then(function (data) {
      var entry = Array.isArray(data) ? data[0] : null;
      if (!entry || !Array.isArray(entry.meanings)) {
        throw new WebError('the dictionary', 'has no entry for “' + w + '”');
      }
      var senses = [];
      entry.meanings.forEach(function (mn) {
        (mn.definitions || []).slice(0, 2).forEach(function (d) {
          if (d && d.definition) {
            senses.push({ part: mn.partOfSpeech || '', text: d.definition, example: d.example || '' });
          }
        });
      });
      if (!senses.length) throw new WebError('the dictionary', 'returned no definitions for “' + w + '”');
      return {
        source: 'Wiktionary via dictionaryapi.dev',
        word: entry.word || w,
        phonetic: entry.phonetic || (entry.phonetics || []).map(function (p) { return p.text; })
          .filter(Boolean)[0] || '',
        senses: senses.slice(0, 4),
        url: (entry.sourceUrls || [])[0] || 'https://en.wiktionary.org/wiki/' + enc(w)
      };
    });
  }

  /* ------------------------------------------------------------- weather */

  /* WMO weather interpretation codes, as published with the Open-Meteo API. */
  var WMO = {
    0: 'clear', 1: 'mainly clear', 2: 'partly cloudy', 3: 'overcast',
    45: 'foggy', 48: 'freezing fog', 51: 'light drizzle', 53: 'drizzle',
    55: 'heavy drizzle', 56: 'freezing drizzle', 57: 'freezing drizzle',
    61: 'light rain', 63: 'rain', 65: 'heavy rain', 66: 'freezing rain',
    67: 'freezing rain', 71: 'light snow', 73: 'snow', 75: 'heavy snow',
    77: 'snow grains', 80: 'light showers', 81: 'showers', 82: 'heavy showers',
    85: 'snow showers', 86: 'heavy snow showers', 95: 'thunderstorms',
    96: 'thunderstorms with hail', 99: 'thunderstorms with hail'
  };
  function wmo(code) {
    var k = Number(code);
    return WMO[k] !== undefined ? WMO[k] : 'unsettled';
  }
  /* Would you want to be outside in it? Used to warn about outdoor events. */
  function wet(code) {
    var k = Number(code);
    return (k >= 51 && k <= 67) || (k >= 80 && k <= 86) || k >= 95;
  }

  function geocode(place) {
    var url = 'https://geocoding-api.open-meteo.com/v1/search?name=' + enc(place) +
      '&count=1&language=en&format=json';
    return request('the place lookup', url).then(function (d) {
      var r = d && Array.isArray(d.results) ? d.results[0] : null;
      if (!r) throw new WebError('the place lookup', 'could not find anywhere called “' + place + '”');
      return {
        name: r.name,
        label: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
        lat: r.latitude, lon: r.longitude, timezone: r.timezone || 'auto'
      };
    });
  }

  function forecastAt(lat, lon, label, days) {
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + enc(lat) +
      '&longitude=' + enc(lon) +
      '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
      '&forecast_days=' + (days || 7) + '&timezone=auto';
    return request('the weather service', url).then(function (d) {
      if (!d || !d.daily || !Array.isArray(d.daily.time)) {
        throw new WebError('the weather service', 'returned something I could not read');
      }
      var unit = (d.current_units && d.current_units.temperature_2m) || '°C';
      var out = {
        source: 'Open-Meteo',
        place: label || (Number(lat).toFixed(2) + ', ' + Number(lon).toFixed(2)),
        unit: unit,
        url: 'https://open-meteo.com/',
        now: d.current ? {
          temp: d.current.temperature_2m,
          feels: d.current.apparent_temperature,
          text: wmo(d.current.weather_code),
          wind: d.current.wind_speed_10m
        } : null,
        days: []
      };
      d.daily.time.forEach(function (iso, i) {
        var code = d.daily.weather_code ? d.daily.weather_code[i] : null;
        out.days.push({
          date: iso,
          text: wmo(code),
          wet: wet(code),
          max: d.daily.temperature_2m_max ? d.daily.temperature_2m_max[i] : null,
          min: d.daily.temperature_2m_min ? d.daily.temperature_2m_min[i] : null,
          rain: d.daily.precipitation_probability_max ? d.daily.precipitation_probability_max[i] : null
        });
      });
      return out;
    });
  }

  /* Weather needs a place, and JARVIS is not allowed to guess one. If the user
     has not said where they are, it asks — §21, never pretend to know. */
  function weather(place, days) {
    var where = String(place || '').trim() || config().place;
    if (!where) {
      return Promise.reject(new WebError('the weather service',
        'I do not know where you are — tell me a place ("weather in Leeds") and I will remember it.'));
    }
    return geocode(where).then(function (g) {
      return forecastAt(g.lat, g.lon, g.label, days).then(function (f) {
        if (!config().place) setConfig({ place: g.label });
        return f;
      });
    });
  }

  /* ---------------------------------------------------------------- news */

  function news(query, limit) {
    var q = String(query || '').trim();
    var url = 'https://hn.algolia.com/api/v1/' + (q ? 'search?query=' + enc(q) : 'search?tags=front_page') +
      (q ? '&tags=story' : '') + '&hitsPerPage=' + (limit || 6);
    return request('Hacker News', url).then(function (d) {
      var hits = d && Array.isArray(d.hits) ? d.hits : null;
      if (!hits) throw new WebError('Hacker News', 'returned something I could not read');
      return hits.filter(function (h) { return h && h.title; }).map(function (h) {
        return {
          source: 'Hacker News',
          title: h.title,
          url: h.url || ('https://news.ycombinator.com/item?id=' + h.objectID),
          points: h.points, comments: h.num_comments, when: h.created_at
        };
      });
    });
  }

  /* --------------------------------------------------------------- books */

  function books(query, limit) {
    var url = 'https://openlibrary.org/search.json?q=' + enc(query) +
      '&limit=' + (limit || 5) + '&fields=title,author_name,first_publish_year,key';
    return request('Open Library', url).then(function (d) {
      var docs = d && Array.isArray(d.docs) ? d.docs : null;
      if (!docs) throw new WebError('Open Library', 'returned something I could not read');
      if (!docs.length) throw new WebError('Open Library', 'has nothing for “' + query + '”');
      return docs.map(function (b) {
        return {
          source: 'Open Library',
          title: b.title,
          author: (b.author_name || []).slice(0, 2).join(', '),
          year: b.first_publish_year || null,
          url: 'https://openlibrary.org' + (b.key || '')
        };
      });
    });
  }

  /* ------------------------------------------------------------ currency */

  function rate(amount, from, to) {
    var url = 'https://api.frankfurter.app/latest?amount=' + enc(amount || 1) +
      '&from=' + enc(String(from).toUpperCase()) + '&to=' + enc(String(to).toUpperCase());
    return request('the exchange rate service', url).then(function (d) {
      var v = d && d.rates && d.rates[String(to).toUpperCase()];
      if (typeof v !== 'number') {
        throw new WebError('the exchange rate service', 'does not cover ' + from + '→' + to);
      }
      return {
        source: 'Frankfurter (ECB reference rates)',
        amount: d.amount, from: d.base, to: String(to).toUpperCase(),
        value: v, date: d.date, url: 'https://www.frankfurter.app/'
      };
    });
  }

  /* ------------------------------------------------- instant answers */

  function instant(query) {
    var url = 'https://api.duckduckgo.com/?q=' + enc(query) +
      '&format=json&no_html=1&skip_disambig=1&t=cadence';
    return request('DuckDuckGo', url).then(function (d) {
      if (!d) throw new WebError('DuckDuckGo', 'returned nothing');
      var text = d.AbstractText || d.Answer || d.Definition || '';
      var related = (d.RelatedTopics || []).filter(function (r) { return r && r.Text && r.FirstURL; })
        .slice(0, 4).map(function (r) {
          return { source: 'DuckDuckGo', title: r.Text, url: r.FirstURL };
        });
      if (!text && !related.length) throw new WebError('DuckDuckGo', 'had no instant answer for that');
      return {
        source: d.AbstractSource ? ('DuckDuckGo · ' + d.AbstractSource) : 'DuckDuckGo',
        heading: d.Heading || query,
        text: text,
        url: d.AbstractURL || ('https://duckduckgo.com/?q=' + enc(query)),
        related: related
      };
    });
  }

  /* ------------------------------------------------------- reading a URL */

  /* r.jina.ai fetches a page server-side and hands back readable text, which is
     what makes "read this link" possible from a file:// page at all — a direct
     fetch of an arbitrary site would be refused by the browser. It means the URL
     being read is visible to that service, so it is a separate switch. */
  function read(url) {
    var target = String(url || '').trim();
    if (!/^https?:\/\//i.test(target)) target = 'https://' + target.replace(/^\/+/, '');
    if (!config().reader) {
      return Promise.reject(new WebError('the page reader',
        'is switched off — turn on “read full pages” in the JARVIS panel.'));
    }
    return request('the page reader', 'https://r.jina.ai/' + target, { text: true, timeout: 20000 })
      .then(function (txt) {
        var body = String(txt || '').trim();
        if (!body) throw new WebError('the page reader', 'got an empty page back');
        var title = (body.match(/^Title:\s*(.+)$/m) || [])[1] || target;
        return {
          source: 'r.jina.ai reader', title: title.trim(), url: target,
          text: body.replace(/^(Title|URL Source|Published Time|Markdown Content):.*$/gm, '').trim()
        };
      });
  }

  /* ------------------------------------------------------------- search */

  /* There is no free, keyless, cross-origin general web search. What there is:
     several good sources that each answer part of the question. So ask the ones
     that suit the query, in parallel, and report exactly which ones answered —
     including, honestly, when none of them did. */
  function search(query, opts) {
    opts = opts || {};
    var q = String(query || '').trim();
    if (!q) return Promise.reject(new WebError('search', 'needs something to look for'));

    var jobs = [];
    function attempt(name, promise) {
      jobs.push(promise.then(
        function (value) { return { name: name, ok: true, value: value }; },
        function (err) { return { name: name, ok: false, error: err && err.message || 'failed' }; }
      ));
    }

    attempt('wikipedia', wikiLookup(q));
    attempt('instant', instant(q));
    if (opts.news !== false && /\b(news|latest|today|release|launch|announce|update)\b/i.test(q)) {
      attempt('news', news(q, 4));
    }

    return Promise.all(jobs).then(function (results) {
      var got = results.filter(function (r) { return r.ok; });
      var failed = results.filter(function (r) { return !r.ok; });

      if (!got.length) {
        var why = failed.map(function (f) { return f.name + ' (' + f.error + ')'; }).join('; ');
        throw new WebError('search', 'none of my sources could answer that — ' + why);
      }

      var out = { query: q, sources: [], passages: [], links: [], failed: failed };
      got.forEach(function (r) {
        if (r.name === 'wikipedia') {
          out.sources.push('Wikipedia');
          out.passages.push({ source: 'Wikipedia', title: r.value.title, text: r.value.extract, url: r.value.url });
          (r.value.alternatives || []).forEach(function (a) { out.links.push(a); });
        } else if (r.name === 'instant') {
          out.sources.push(r.value.source);
          if (r.value.text) {
            out.passages.push({ source: r.value.source, title: r.value.heading, text: r.value.text, url: r.value.url });
          }
          (r.value.related || []).forEach(function (a) { out.links.push(a); });
        } else if (r.name === 'news') {
          out.sources.push('Hacker News');
          r.value.forEach(function (n) { out.links.push(n); });
        }
      });
      return out;
    });
  }

  /* ---------------------------------------------------- connection test */

  /* The honest answer to "is this actually working". Each source is called for
     real with a known-good query and reports back what happened. */
  var PROBES = [
    { id: 'wikipedia', label: 'Wikipedia', run: function () { return wikiSummary('Cat'); } },
    { id: 'dictionary', label: 'Dictionary', run: function () { return define('calendar'); } },
    { id: 'weather', label: 'Weather', run: function () { return geocode('London'); } },
    { id: 'news', label: 'Hacker News', run: function () { return news('', 1); } },
    { id: 'books', label: 'Open Library', run: function () { return books('dune', 1); } },
    { id: 'currency', label: 'Exchange rates', run: function () { return rate(1, 'USD', 'EUR'); } },
    { id: 'instant', label: 'DuckDuckGo', run: function () { return instant('everest height'); } },
    { id: 'reader', label: 'Page reader', run: function () { return read('example.com'); } }
  ];

  function testAll(onEach) {
    return Promise.all(PROBES.map(function (p) {
      var started = Date.now();
      return p.run().then(function () {
        var row = { id: p.id, label: p.label, ok: true, ms: Date.now() - started };
        if (onEach) onEach(row);
        return row;
      }, function (err) {
        var row = {
          id: p.id, label: p.label, ok: false, ms: Date.now() - started,
          error: (err && err.message) || 'failed'
        };
        if (onEach) onEach(row);
        return row;
      });
    }));
  }

  JV.WEB = {
    config: config, setConfig: setConfig, enabled: enabled, DEFAULTS: DEFAULTS,
    WebError: WebError, request: request,
    search: search, wikiSearch: wikiSearch, wikiSummary: wikiSummary, wikiLookup: wikiLookup,
    define: define, weather: weather, geocode: geocode, forecastAt: forecastAt,
    news: news, books: books, rate: rate, instant: instant, read: read,
    testAll: testAll, PROBES: PROBES,
    wmo: wmo, wet: wet, clip: clip
  };
})(window);
