/**
 * MindPrint — email results + save them to a Google Sheet.
 * Paste this whole file into Extensions → Apps Script of a Google Sheet, then Deploy → New deployment → Web app.
 * See README.md for step-by-step instructions.
 *
 * The email text is built HERE from the numeric scores only, so nobody can use your script
 * to send arbitrary messages. Each address can receive at most 3 reports per hour.
 */

var SITE_NAME = 'MindPrint';

var TRAITS = [
  ['risk', 'Risk tolerance', 'Careful', 'Bold', 'careful', 'bold',
    'You protect gains and avoid unnecessary losses. People trust you with things that must not go wrong.',
    'You push for bigger rewards and are comfortable acting under uncertainty.',
    ['Risk management', 'Audit & compliance', 'Operations', 'Quality assurance'], ['Trading', 'Entrepreneurship', 'Sales', 'Venture investing']],
  ['trust', 'Trust', 'Sceptical', 'Trusting', 'discerning', 'trusting',
    'You verify before you rely on others, which keeps you from being taken advantage of.',
    'You extend trust readily, which helps you build relationships and teams quickly.',
    ['Due diligence', 'Investigations', 'Procurement', 'Credit analysis'], ['Client relationships', 'Team leadership', 'Partnerships', 'Community building']],
  ['memory', 'Working memory', 'Big-picture', 'Detail-holding', 'big-picture', 'sharp',
    'You rely on notes and systems rather than holding details in your head — and focus on the big picture.',
    'You juggle lots of information at once and keep details straight under pressure.',
    ['Strategy', 'Creative direction', 'Vision-led roles'], ['Financial analysis', 'Engineering', 'Air-traffic-style ops', 'Accounting']],
  ['impulse', 'Self-control', 'Spontaneous', 'Controlled', 'spontaneous', 'disciplined',
    'You act fast and instinctively — great when speed matters more than perfection.',
    'You hold back automatic responses and act deliberately.',
    ['Emergency response', 'Live events', 'Fast-paced sales'], ['Compliance', 'Surgery-style precision work', 'Portfolio management', 'Editing']],
  ['attention', 'Focus & speed', 'Steady', 'Quick', 'steady', 'quick',
    'You take your time to react — steady and unhurried.',
    'You react quickly and stay alert through repetitive tasks.',
    ['Research', 'Writing', 'Long-form analysis'], ['Trading desk', 'Customer support', 'Operations control', 'Esports / gaming']],
  ['planning', 'Planning', 'Adaptive', 'Strategic', 'adaptive', 'strategic',
    'You figure things out by trying and adjusting rather than planning every step upfront.',
    'You think several steps ahead and find efficient paths to a goal.',
    ['Startups', 'Design prototyping', 'Field sales'], ['Project management', 'Consulting', 'Software architecture', 'Financial planning']],
  ['emotion', 'Emotional insight', 'Task-focused', 'People-reading', 'objective', 'empathetic',
    'You focus on facts and tasks more than on reading feelings.',
    'You read how people feel from context and cues — a big edge with clients and teams.',
    ['Data analysis', 'Engineering', 'Quant research'], ['Financial advising', 'HR & coaching', 'Counselling', 'Marketing']],
  ['effort', 'Drive', 'Efficient', 'Ambitious', 'efficient', 'driven',
    'You pick your battles and save energy for the moments that pay off.',
    'You go after the bigger reward even when it takes much more effort.',
    ['Process improvement', 'Automation', 'Operations'], ['Commission-based sales', 'Founding a business', 'Investment banking', 'Competitive roles']],
  ['patience', 'Patience', 'Now-focused', 'Long-term', 'action-oriented', 'patient',
    'You value results you can see now and keep momentum with quick wins.',
    'You are willing to wait for a bigger payoff later.',
    ['Short-term trading', 'Sales', 'Event management'], ['Long-term investing', 'Research', 'Wealth planning', 'Brand building']]
];

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var email = String(data.email || '').trim().slice(0, 120);
    var name = String(data.name || 'there').replace(/[<>]/g, '').trim().slice(0, 40);
    var site = /^https:\/\/[\w.-]+\.github\.io\//.test(data.site || '') ? String(data.site).slice(0, 200) : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply({ ok: false, error: 'bad email' });

    // Rate limit: 3 emails per address per hour
    var cache = CacheService.getScriptCache();
    var key = 'n_' + email.toLowerCase();
    var n = Number(cache.get(key) || 0);
    if (n >= 3) return reply({ ok: false, error: 'rate limited' });
    cache.put(key, String(n + 1), 3600);

    // Keep only known traits with numeric scores 0-100
    var have = [];
    TRAITS.forEach(function (t) {
      var v = Number(data.scores && data.scores[t[0]]);
      if (!isNaN(v)) have.push({ t: t, v: Math.max(0, Math.min(100, Math.round(v))) });
    });
    if (!have.length) return reply({ ok: false, error: 'no scores' });

    var profile = buildProfile(have);
    MailApp.sendEmail({
      to: email,
      subject: 'Your ' + SITE_NAME + ' profile: ' + profile.headline,
      htmlBody: buildHtml(name, profile, site),
      name: SITE_NAME
    });
    logToSheet(name, email, have, profile.headline);
    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  }
}

function buildProfile(have) {
  var strongest = have.slice().sort(function (a, b) { return Math.abs(b.v - 50) - Math.abs(a.v - 50); });
  var adj = function (x) { return x.v >= 50 ? x.t[5] : x.t[4]; };
  var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
  var headline = strongest.length >= 2 ? cap(adj(strongest[0])) + ' & ' + adj(strongest[1]) : cap(adj(strongest[0]));
  var w = {};
  have.forEach(function (x) {
    var d = Math.abs(x.v - 50);
    if (d < 12) return;
    (x.v > 50 ? x.t[9] : x.t[8]).forEach(function (r) { w[r] = (w[r] || 0) + d; });
  });
  var roles = Object.keys(w).sort(function (a, b) { return w[b] - w[a]; }).slice(0, 8);
  return { have: have, headline: headline, roles: roles };
}

function describe(x) {
  var t = x.t;
  if (x.v >= 60) return t[7];
  if (x.v <= 40) return t[6];
  return 'You sit in the balanced middle — you can lean ' + t[2].toLowerCase() + ' or ' + t[3].toLowerCase() + ' depending on the situation.';
}

function buildHtml(name, p, site) {
  var accent = '#6d5dfc';
  var traits = p.have.map(function (x) {
    var t = x.t;
    return '<tr><td style="padding:14px 0;border-bottom:1px solid #eee">' +
      '<div style="font-weight:700;font-size:15px">' + t[1] + ' <span style="color:#888;font-weight:400">· ' + x.v + '/100</span></div>' +
      '<table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px"><tr>' +
      '<td style="background:' + accent + ';height:8px;width:' + Math.max(x.v, 2) + '%;border-radius:4px 0 0 4px"></td>' +
      '<td style="background:#e9e7f7;height:8px;border-radius:0 4px 4px 0"></td></tr></table>' +
      '<div style="font-size:12px;color:#888">' + t[2] + ' ← → ' + t[3] + '</div>' +
      '<div style="font-size:14px;color:#333;margin-top:6px">' + describe(x) + '</div></td></tr>';
  }).join('');
  var roles = p.roles.length ? '<h3 style="margin:24px 0 8px">Work that tends to fit</h3><p>' +
    p.roles.map(function (r) { return '<span style="display:inline-block;background:#ebe8ff;color:' + accent + ';padding:5px 12px;border-radius:99px;margin:0 6px 6px 0;font-size:13px;font-weight:600">' + r + '</span>'; }).join('') + '</p>' : '';
  return '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#17162b">' +
    '<p style="color:#888;margin:0">' + name + '’s ' + SITE_NAME + '</p>' +
    '<h1 style="margin:4px 0 12px;font-size:28px">' + p.headline + '</h1>' +
    '<p style="color:#555">Thanks for playing! Each trait below is a spectrum — both ends are strengths in the right setting.</p>' +
    roles +
    '<h3 style="margin:24px 0 0">Your traits</h3><table width="100%" cellpadding="0" cellspacing="0">' + traits + '</table>' +
    (site ? '<p style="margin-top:24px"><a href="' + site + '" style="background:' + accent + ';color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:600">Visit ' + SITE_NAME + '</a></p>' : '') +
    '<p style="color:#999;font-size:12px;margin-top:24px">' + SITE_NAME + ' is for self-reflection only. It is not a validated psychometric or hiring assessment.</p></div>';
}

function logToSheet(name, email, have, headline) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Time', 'Name', 'Email', 'Headline'].concat(TRAITS.map(function (t) { return t[1]; })));
  }
  var byId = {};
  have.forEach(function (x) { byId[x.t[0]] = x.v; });
  sheet.appendRow([new Date(), name, email, headline].concat(TRAITS.map(function (t) { return byId[t[0]] != null ? byId[t[0]] : ''; })));
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Run this once from the editor (select "testEmail" → Run) to grant permissions and send yourself a sample.
function testEmail() {
  var me = Session.getActiveUser().getEmail();
  doPost({ postData: { contents: JSON.stringify({ name: 'Test', email: me, scores: { risk: 72, trust: 40, memory: 60, planning: 85, patience: 30 }, site: '' }) } });
}
