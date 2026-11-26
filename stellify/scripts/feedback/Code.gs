/**
 * Stellify reports → email. A Google Apps Script web app that runs on the stellifyprep@gmail.com account:
 * the website sends each "Report a problem" here, and this emails it to the team. Setup: README.md in this folder.
 * Free; Gmail lets an Apps Script send about 100 emails a day.
 */
const TO = 'stellifyprep@gmail.com';
const MAX_PER_HOUR = 60; // a cap, so a flood of junk can't use up the day's email allowance

function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const clip = (s, n) => String(s == null ? '' : s).trim().slice(0, n);
    const message = clip(d.message, 4000);
    if (!message) return reply('empty');
    const cache = CacheService.getScriptCache();
    const sent = Number(cache.get('sent') || 0);
    if (sent >= MAX_PER_HOUR) return reply('busy');
    cache.put('sent', String(sent + 1), 3600);

    const kind = clip(d.kind, 60) || 'Report';
    const replyTo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clip(d.replyTo, 200)) ? clip(d.replyTo, 200) : '';
    const body = [
      message, '', '—',
      'About: ' + kind,
      d.qid ? 'Question: ' + clip(d.qid, 80) : null,
      'Page: ' + (clip(d.page, 200) || '(not given)'),
      'Reply to: ' + (replyTo || '(no email given)'),
      'Sent: ' + (clip(d.at, 40) || new Date().toISOString()),
      'Browser: ' + clip(d.browser, 300),
    ].filter((line) => line !== null).join('\n');
    const options = { to: TO, subject: '[Stellify report] ' + kind + ': ' + message.slice(0, 60).replace(/\s+/g, ' '), body: body, name: 'Stellify reports' };
    if (replyTo) options.replyTo = replyTo;
    MailApp.sendEmail(options);
    return reply('ok');
  } catch (err) {
    return reply('error');
  }
}

/** Opening the address in a browser just says it's working. */
function doGet() { return reply('Stellify reports are on.'); }

function reply(text) { return ContentService.createTextOutput(text); }
