/* MindPrint — behavioural games that build a trait profile.
   Plain JavaScript, no build step. Results are saved in the browser (localStorage). */
(() => {
  'use strict';

  // ---------- Config ----------
  const CUR = '$';               // currency symbol shown in games (e.g. 'RM')
  const STORE_KEY = 'mindprint.v2';
  // Paste your Google Apps Script web-app URL here to email results automatically (see README).
  // Leave it empty and the "Email" button opens the participant's own email app instead.
  const EMAIL_ENDPOINT = '';

  // ---------- Helpers ----------
  const app = document.getElementById('app');
  const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
  const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const mean = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
  const money = (v) => CUR + v.toFixed(2);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, root = document) => root.querySelector(sel);

  // ---------- Storage: several participants per device ----------
  // db = { current: id | null, people: { id: { id, name, email, results, created } } }
  function saveDb() { try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) { /* storage unavailable */ } }
  function loadDb() { try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { return null; } }
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  let db = loadDb() || { current: null, people: {} };
  if (!db.people) db.people = {};
  try { // migrate the old single-profile format
    const old = JSON.parse(localStorage.getItem('mindprint.v1'));
    if (old && old.results && Object.keys(old.results).length) {
      const id = newId();
      db.people[id] = { id, name: old.name || 'Player', email: '', results: old.results, created: Date.now() };
    }
    localStorage.removeItem('mindprint.v1');
  } catch (e) { /* ignore */ }
  let state = db.people[db.current] || null;   // the participant currently playing
  const save = saveDb;
  function startPerson(name, email) {
    const id = newId();
    db.people[id] = { id, name, email, results: {}, created: Date.now() };
    db.current = id; state = db.people[id]; saveDb();
  }
  function switchTo(id) { db.current = id; state = db.people[id] || null; saveDb(); }
  function endSession() { db.current = null; state = null; saveDb(); }
  function deletePerson(id) { delete db.people[id]; if (db.current === id) endSession(); else saveDb(); }
  saveDb();

  // Every screen change bumps runId; running games notice and stop.
  let runId = 0;
  let listeners = [];
  function teardown() {
    runId++;
    listeners.forEach(([t, type, fn, opt]) => t.removeEventListener(type, fn, opt));
    listeners = [];
  }
  function makeCtx() {
    const my = runId;
    const alive = () => my === runId;
    return {
      alive,
      // Resolves after ms; never resolves if the user has left the game (so the game silently stops).
      wait: (ms) => new Promise((r) => setTimeout(() => { if (alive()) r(); }, ms)),
      listen(target, type, fn, opt) { target.addEventListener(type, fn, opt); listeners.push([target, type, fn, opt]); },
    };
  }
  // Waits for one click on any of the given elements; resolves with the element's data-v value.
  function choose(ctx, root, selector) {
    return new Promise((resolve) => {
      root.querySelectorAll(selector).forEach((b) => ctx.listen(b, 'click', () => { if (ctx.alive()) resolve(b.dataset.v); }));
    });
  }
  async function countdown(ctx, stage) {
    for (const n of [3, 2, 1]) { stage.innerHTML = `<div class="countdown">${n}</div>`; await ctx.wait(700); }
  }

  // ---------- Traits ----------
  // Each trait is a spectrum: neither end is "bad". Roles are loose suggestions for self-reflection.
  const TRAITS = [
    { id: 'risk', name: 'Risk tolerance', game: 'balloon', lowLabel: 'Careful', highLabel: 'Bold',
      low: 'You protect gains and avoid unnecessary losses. People trust you with things that must not go wrong.',
      high: 'You push for bigger rewards and are comfortable acting under uncertainty.',
      lowAdj: 'careful', highAdj: 'bold',
      lowRoles: ['Risk management', 'Audit & compliance', 'Operations', 'Quality assurance'],
      highRoles: ['Trading', 'Entrepreneurship', 'Sales', 'Venture investing'] },
    { id: 'trust', name: 'Trust', game: 'trust', lowLabel: 'Sceptical', highLabel: 'Trusting',
      low: 'You verify before you rely on others, which keeps you from being taken advantage of.',
      high: 'You extend trust readily, which helps you build relationships and teams quickly.',
      lowAdj: 'discerning', highAdj: 'trusting',
      lowRoles: ['Due diligence', 'Investigations', 'Procurement', 'Credit analysis'],
      highRoles: ['Client relationships', 'Team leadership', 'Partnerships', 'Community building'] },
    { id: 'memory', name: 'Working memory', game: 'memory', lowLabel: 'Big-picture', highLabel: 'Detail-holding',
      low: 'You rely on notes and systems rather than holding details in your head — and focus on the big picture.',
      high: 'You juggle lots of information at once and keep details straight under pressure.',
      lowAdj: 'big-picture', highAdj: 'sharp',
      lowRoles: ['Strategy', 'Creative direction', 'Vision-led roles'],
      highRoles: ['Financial analysis', 'Engineering', 'Air-traffic-style ops', 'Accounting'] },
    { id: 'impulse', name: 'Self-control', game: 'gonogo', lowLabel: 'Spontaneous', highLabel: 'Controlled',
      low: 'You act fast and instinctively — great when speed matters more than perfection.',
      high: 'You hold back automatic responses and act deliberately.',
      lowAdj: 'spontaneous', highAdj: 'disciplined',
      lowRoles: ['Emergency response', 'Live events', 'Fast-paced sales'],
      highRoles: ['Compliance', 'Surgery-style precision work', 'Portfolio management', 'Editing'] },
    { id: 'attention', name: 'Focus & speed', game: 'gonogo', lowLabel: 'Steady', highLabel: 'Quick',
      low: 'You take your time to react — steady and unhurried.',
      high: 'You react quickly and stay alert through repetitive tasks.',
      lowAdj: 'steady', highAdj: 'quick',
      lowRoles: ['Research', 'Writing', 'Long-form analysis'],
      highRoles: ['Trading desk', 'Customer support', 'Operations control', 'Esports / gaming'] },
    { id: 'planning', name: 'Planning', game: 'hanoi', lowLabel: 'Adaptive', highLabel: 'Strategic',
      low: 'You figure things out by trying and adjusting rather than planning every step upfront.',
      high: 'You think several steps ahead and find efficient paths to a goal.',
      lowAdj: 'adaptive', highAdj: 'strategic',
      lowRoles: ['Startups', 'Design prototyping', 'Field sales'],
      highRoles: ['Project management', 'Consulting', 'Software architecture', 'Financial planning'] },
    { id: 'emotion', name: 'Emotional insight', game: 'emotion', lowLabel: 'Task-focused', highLabel: 'People-reading',
      low: 'You focus on facts and tasks more than on reading feelings.',
      high: 'You read how people feel from context and cues — a big edge with clients and teams.',
      lowAdj: 'objective', highAdj: 'empathetic',
      lowRoles: ['Data analysis', 'Engineering', 'Quant research'],
      highRoles: ['Financial advising', 'HR & coaching', 'Counselling', 'Marketing'] },
    { id: 'effort', name: 'Drive', game: 'effort', lowLabel: 'Efficient', highLabel: 'Ambitious',
      low: 'You pick your battles and save energy for the moments that pay off.',
      high: 'You go after the bigger reward even when it takes much more effort.',
      lowAdj: 'efficient', highAdj: 'driven',
      lowRoles: ['Process improvement', 'Automation', 'Operations'],
      highRoles: ['Commission-based sales', 'Founding a business', 'Investment banking', 'Competitive roles'] },
    { id: 'patience', name: 'Patience', game: 'delay', lowLabel: 'Now-focused', highLabel: 'Long-term',
      low: 'You value results you can see now and keep momentum with quick wins.',
      high: 'You are willing to wait for a bigger payoff later.',
      lowAdj: 'action-oriented', highAdj: 'patient',
      lowRoles: ['Short-term trading', 'Sales', 'Event management'],
      highRoles: ['Long-term investing', 'Research', 'Wealth planning', 'Brand building'] },
  ];

  // ---------- Games ----------
  const GAMES = [
    {
      id: 'balloon', title: 'Balloon Pump', icon: '🎈', mins: 3,
      steps: [
        `Each pump adds ${money(0.05)} to the balloon.`,
        'Press <b>Collect</b> to bank the money and move to the next balloon.',
        'If the balloon pops, you lose the money in that balloon.',
        'Every balloon pops at a different point. There are 10 balloons.',
      ],
      async run(ctx, stage) {
        const N = 10, MAX = 32, PER = 0.05;
        let i = 0, bank = 0, pumps = 0, limit = randInt(1, MAX), busy = false;
        const kept = [], popped = [];
        stage.innerHTML = `
          <div class="hud"><span>Balloon <b id="bn">1</b>/${N}</span><span>In balloon <b id="cur">${money(0)}</b></span><span>Bank <b id="bank">${money(0)}</b></span></div>
          <div class="balloon-wrap"><div class="balloon" id="bal"></div></div>
          <div class="feedback" id="fb"></div>
          <div class="btn-row"><button class="btn primary big" id="pump">Pump</button><button class="btn big" id="collect">Collect</button></div>`;
        const bal = $('#bal', stage), fb = $('#fb', stage);
        const draw = () => {
          bal.style.transform = `scale(${0.45 + pumps * 0.035})`;
          $('#bn', stage).textContent = i + 1;
          $('#cur', stage).textContent = money(pumps * PER);
          $('#bank', stage).textContent = money(bank);
        };
        draw();
        return new Promise((resolve) => {
          const next = async () => {
            await ctx.wait(900);
            i++; fb.textContent = ''; fb.className = 'feedback';
            if (i >= N) {
              const adj = mean(kept);
              return resolve({
                scores: { risk: Math.round(clamp(adj * 5)) },
                raw: { 'Avg pumps (collected balloons)': adj.toFixed(1), 'Balloons popped': popped.length, 'Money earned': money(bank) },
              });
            }
            pumps = 0; limit = randInt(1, MAX); bal.classList.remove('popped'); busy = false; draw();
          };
          ctx.listen($('#pump', stage), 'click', () => {
            if (busy) return;
            pumps++;
            if (pumps >= limit) {
              busy = true; popped.push(pumps); bal.classList.add('popped');
              fb.textContent = 'Pop! That balloon is lost.'; fb.className = 'feedback bad';
              next();
            } else draw();
          });
          ctx.listen($('#collect', stage), 'click', () => {
            if (busy) return;
            busy = true; kept.push(pumps); bank += pumps * PER; draw();
            fb.textContent = `Banked ${money(pumps * PER)}`; fb.className = 'feedback good';
            next();
          });
        });
      },
    },
    {
      id: 'trust', title: 'Money Exchange', icon: '🤝', mins: 2,
      steps: [
        `Each round you get ${money(10)}. You can send any part of it to an anonymous partner.`,
        'Whatever you send is <b>tripled</b> before your partner receives it.',
        'Your partner then decides how much to send back to you — it could be a lot, or nothing.',
        'You keep whatever you did not send, plus whatever comes back. 6 rounds.',
      ],
      async run(ctx, stage) {
        const R = 6, returns = shuffle([0, 0.15, 0.33, 0.5, 0.5, 0.6]);
        const sent = []; let total = 0;
        for (let r = 0; r < R; r++) {
          stage.innerHTML = `
            <div class="hud"><span>Round <b>${r + 1}</b>/${R}</span><span>Total <b>${money(total)}</b></span></div>
            <h3>How much will you send?</h3>
            <div class="odds" id="amt">${money(5)}</div>
            <input type="range" min="0" max="10" step="1" value="5" class="slider" id="sl" aria-label="Amount to send">
            <p class="muted small" id="preview">Partner receives ${money(15)}</p>
            <div class="btn-row"><button class="btn primary big" id="send" data-v="1">Send</button></div>`;
          const sl = $('#sl', stage);
          const upd = () => { $('#amt', stage).textContent = money(+sl.value); $('#preview', stage).textContent = `Partner receives ${money(sl.value * 3)}`; };
          ctx.listen(sl, 'input', upd);
          await choose(ctx, stage, '#send');
          const s = +sl.value, back = Math.round(s * 3 * returns[r] * 100) / 100, round = 10 - s + back;
          sent.push(s); total += round;
          stage.innerHTML = `
            <div class="hud"><span>Round <b>${r + 1}</b>/${R}</span><span>Total <b>${money(total)}</b></span></div>
            <div class="flow"><span class="box">You sent ${money(s)}</span>→<span class="box">Partner got ${money(s * 3)}</span>→<span class="box">Returned ${money(back)}</span></div>
            <p>You earned <b>${money(round)}</b> this round.</p>
            <div class="btn-row"><button class="btn primary" id="nx" data-v="1">${r + 1 < R ? 'Next round' : 'Finish'}</button></div>`;
          await choose(ctx, stage, '#nx');
        }
        return {
          scores: { trust: Math.round(mean(sent) * 10) },
          raw: { 'Average sent': money(mean(sent)), 'Total earned': money(total) },
        };
      },
    },
    {
      id: 'memory', title: 'Number Memory', icon: '🔢', mins: 3,
      steps: [
        'Numbers will flash one at a time.',
        'When they finish, type the whole sequence in order.',
        'Each correct answer makes the next sequence one number longer.',
        'The game ends after two misses in a row.',
      ],
      async run(ctx, stage) {
        let len = 3, fails = 0, best = 2, trials = 0;
        while (true) {
          const seq = Array.from({ length: len }, () => randInt(0, 9));
          stage.innerHTML = `<div class="hud"><span>Length <b>${len}</b></span><span>Best <b>${best > 2 ? best : '–'}</b></span></div><div class="digit" id="d"></div><p class="muted">Watch carefully…</p>`;
          const d = $('#d', stage);
          await ctx.wait(700);
          for (const n of seq) { d.textContent = n; await ctx.wait(750); d.textContent = ''; await ctx.wait(250); }
          stage.innerHTML = `
            <div class="hud"><span>Length <b>${len}</b></span><span>Best <b>${best > 2 ? best : '–'}</b></span></div>
            <h3>Type the numbers in order</h3>
            <form id="f" autocomplete="off"><input class="input digit-input" id="in" inputmode="numeric" pattern="[0-9]*" maxlength="15" autofocus>
            <div class="btn-row"><button class="btn primary" type="submit">Submit</button></div></form>
            <div class="feedback" id="fb"></div>`;
          const inp = $('#in', stage); inp.focus();
          const answer = await new Promise((res) => ctx.listen($('#f', stage), 'submit', (e) => { e.preventDefault(); res(inp.value.replace(/\D/g, '')); }));
          trials++;
          const fb = $('#fb', stage);
          if (answer === seq.join('')) {
            best = len; len++; fails = 0; fb.textContent = 'Correct!'; fb.className = 'feedback good';
          } else {
            fails++; fb.textContent = `Not quite — it was ${seq.join(' ')}`; fb.className = 'feedback bad';
          }
          await ctx.wait(1200);
          if (fails >= 2 || len > 14) break;
        }
        return {
          scores: { memory: Math.round(clamp(((best - 2) / 7) * 100)) },
          raw: { 'Longest sequence recalled': best > 2 ? best : 'none', 'Attempts': trials },
        };
      },
    },
    {
      id: 'gonogo', title: 'Stop & Go', icon: '🚦', mins: 2,
      steps: [
        'Circles will appear one at a time.',
        'When the circle is <b style="color:var(--go)">GREEN</b>, press <b>Space</b> or tap the box as fast as you can.',
        'When it is <b style="color:var(--stop)">RED</b>, do nothing.',
        'There are 40 circles. Be fast, but careful.',
      ],
      async run(ctx, stage) {
        const types = shuffle([...Array(30).fill('go'), ...Array(10).fill('stop')]);
        await countdown(ctx, stage);
        stage.innerHTML = `<div class="hud"><span>Trial <b id="t">1</b>/${types.length}</span><span class="small">Space or tap</span></div><div class="gng-area" id="area"><span class="fix">+</span></div>`;
        const area = $('#area', stage);
        let cur = null;
        const flash = (cls) => { area.classList.add(cls); setTimeout(() => area.classList.remove(cls), 180); };
        const respond = () => {
          if (!cur || cur.rt != null) return;
          cur.rt = performance.now() - cur.t0;
          flash(cur.type === 'go' ? 'flash-good' : 'flash-bad');
        };
        ctx.listen(document, 'keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) respond(); } });
        ctx.listen(area, 'pointerdown', (e) => { e.preventDefault(); respond(); });
        const log = [];
        for (let k = 0; k < types.length; k++) {
          $('#t', stage).textContent = k + 1;
          area.innerHTML = '<span class="fix">+</span>';
          await ctx.wait(randInt(450, 950));
          cur = { type: types[k], t0: performance.now(), rt: null };
          area.innerHTML = `<div class="dot ${types[k]}"></div>`;
          await ctx.wait(650);
          log.push(cur); cur = null;
        }
        area.innerHTML = '<span class="fix">✓</span>';
        const go = log.filter((x) => x.type === 'go'), stop = log.filter((x) => x.type === 'stop');
        const hits = go.filter((x) => x.rt != null), falseAlarms = stop.filter((x) => x.rt != null);
        const hitRate = hits.length / go.length, faRate = falseAlarms.length / stop.length;
        const rt = hits.length ? mean(hits.map((x) => x.rt)) : 650;
        const speed = clamp(((600 - rt) / (600 - 250)) * 100);
        return {
          scores: { impulse: Math.round(clamp((1 - faRate) * 100)), attention: Math.round(clamp(hitRate * 60 + speed * 0.4)) },
          raw: { 'Green hits': `${hits.length}/${go.length}`, 'Red mistakes': `${falseAlarms.length}/${stop.length}`, 'Avg reaction time': `${Math.round(rt)} ms` },
        };
      },
    },
    {
      id: 'hanoi', title: 'Tower Builder', icon: '🗼', mins: 3,
      steps: [
        'Move the whole stack of discs to the peg marked <b>Target</b>.',
        'Tap a peg to pick up its top disc, then tap another peg to drop it.',
        'You can only move one disc at a time, and a bigger disc can never go on a smaller one.',
        'Try to use as few moves as possible. 2 puzzles.',
      ],
      async run(ctx, stage) {
        const puzzles = [3, 4];
        const colors = ['#6d5dfc', '#19b99a', '#f5a524', '#e5484d', '#3b9eff'];
        const eff = [], movesLog = [];
        for (let p = 0; p < puzzles.length; p++) {
          const n = puzzles[p], optimal = 2 ** n - 1;
          const pegs = [Array.from({ length: n }, (_, i) => n - i), [], []];
          let sel = null, moves = 0;
          const t0 = performance.now();
          const result = await new Promise((resolve) => {
            const render = () => {
              stage.innerHTML = `
                <div class="hud"><span>Puzzle <b>${p + 1}</b>/${puzzles.length}</span><span>Moves <b>${moves}</b></span><span>Best possible <b>${optimal}</b></span></div>
                <div class="hanoi">${pegs.map((peg, i) => `
                  <div class="peg ${sel === i ? 'selected' : ''} ${i === 2 ? 'target' : ''}" data-i="${i}">
                    ${peg.map((d) => `<div class="disc" style="width:${25 + d * 15}%;background:${colors[d - 1]}"></div>`).join('')}
                    <div class="base"></div>
                  </div>`).join('')}</div>
                <div class="btn-row"><button class="btn" id="skip">Skip puzzle</button></div>`;
              stage.querySelectorAll('.peg').forEach((el) => ctx.listen(el, 'click', () => clickPeg(+el.dataset.i, el)));
              ctx.listen($('#skip', stage), 'click', () => resolve({ moves, skipped: true }));
            };
            const clickPeg = (i, el) => {
              if (sel === null) { if (pegs[i].length) { sel = i; render(); } return; }
              if (sel === i) { sel = null; render(); return; }
              const disc = pegs[sel][pegs[sel].length - 1], top = pegs[i][pegs[i].length - 1];
              if (top !== undefined && top < disc) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); return; }
              pegs[i].push(pegs[sel].pop()); moves++; sel = null; render();
              if (pegs[2].length === n) resolve({ moves, skipped: false });
            };
            render();
          });
          const secs = (performance.now() - t0) / 1000;
          eff.push(result.skipped ? 0 : optimal / result.moves);
          movesLog.push(result.skipped ? `skipped` : `${result.moves} moves (best ${optimal}), ${Math.round(secs)}s`);
          stage.innerHTML = `<h3>${result.skipped ? 'Puzzle skipped' : 'Solved!'}</h3><p>${result.skipped ? '' : `You used ${result.moves} moves. The minimum is ${optimal}.`}</p>
            <div class="btn-row"><button class="btn primary" id="nx">${p + 1 < puzzles.length ? 'Next puzzle' : 'Finish'}</button></div>`;
          await choose(ctx, stage, '#nx');
        }
        return {
          scores: { planning: Math.round(clamp(mean(eff) * 100)) },
          raw: Object.fromEntries(movesLog.map((m, i) => [`Puzzle ${i + 1}`, m])),
        };
      },
    },
    {
      id: 'emotion', title: 'Read the Room', icon: '🎭', mins: 2,
      steps: [
        'You will read short situations about different people.',
        'Pick the emotion the person is <b>most likely</b> feeling.',
        'Go with your gut — there are 12 situations.',
      ],
      async run(ctx, stage) {
        const items = shuffle([
          ['Aisha’s exam, which she had been dreading all week, is cancelled an hour before it starts.', 'Relieved', ['Proud', 'Surprised', 'Guilty']],
          ['Ben’s teammate presents Ben’s idea to the manager as his own.', 'Angry', ['Embarrassed', 'Afraid', 'Sad']],
          ['Chloe’s best friend wins the scholarship Chloe also applied for. Chloe forces a smile.', 'Jealous', ['Proud', 'Relieved', 'Grateful']],
          ['Daniel accidentally sends a private complaint about his boss to the whole team chat.', 'Embarrassed', ['Angry', 'Jealous', 'Sad']],
          ['Elena’s grandmother, who raised her, moves permanently to another country.', 'Sad', ['Angry', 'Relieved', 'Guilty']],
          ['Farid crosses the finish line of his first marathon after a year of training.', 'Proud', ['Relieved', 'Surprised', 'Grateful']],
          ['Grace’s colleague stays late, unasked, to help her fix a mistake before a deadline.', 'Grateful', ['Guilty', 'Proud', 'Relieved']],
          ['Hari hears footsteps following him on an empty street late at night.', 'Afraid', ['Angry', 'Surprised', 'Embarrassed']],
          ['Ivy forgot her friend’s birthday. The friend mentions she spent it alone.', 'Guilty', ['Sad', 'Embarrassed', 'Afraid']],
          ['Jon takes a big sip of milk and realises it has gone sour.', 'Disgusted', ['Angry', 'Surprised', 'Sad']],
          ['Kai walks into his flat and his friends jump out for a party he knew nothing about.', 'Surprised', ['Grateful', 'Embarrassed', 'Afraid']],
          ['Lena is waiting for important medical test results that arrive tomorrow.', 'Anxious', ['Sad', 'Angry', 'Guilty']],
        ]);
        let correct = 0; const rts = [];
        for (let k = 0; k < items.length; k++) {
          const [text, ans, others] = items[k];
          const opts = shuffle([ans, ...others]);
          stage.innerHTML = `
            <div class="hud"><span>Situation <b>${k + 1}</b>/${items.length}</span></div>
            <p class="scenario">${esc(text)}</p>
            <div class="choices">${opts.map((o) => `<button class="btn" data-v="${o}">${o}</button>`).join('')}</div>`;
          const t0 = performance.now();
          const pick = await choose(ctx, stage, '.choices .btn');
          rts.push(performance.now() - t0);
          if (pick === ans) correct++;
          await ctx.wait(150);
        }
        return {
          scores: { emotion: Math.round((correct / items.length) * 100) },
          raw: { 'Matched most-likely emotion': `${correct}/${items.length}`, 'Avg time per item': `${(mean(rts) / 1000).toFixed(1)} s` },
        };
      },
    },
    {
      id: 'effort', title: 'Tap Challenge', icon: '⚡', mins: 3,
      steps: [
        `Each round, choose an <b>Easy</b> task (${money(1)}) or a <b>Hard</b> task (bigger reward).`,
        'Easy: 15 taps in 6 seconds. Hard: 45 taps in 15 seconds.',
        'Tap the big button or press <b>Space</b>.',
        'Each round shows the chance of actually getting paid if you finish. 6 rounds.',
      ],
      async run(ctx, stage) {
        const probs = shuffle([0.88, 0.88, 0.5, 0.5, 0.12, 0.12]);
        const log = []; let total = 0;
        for (let r = 0; r < probs.length; r++) {
          const p = probs[r], hardReward = Math.round((2 + Math.random() * 2.5) * 100) / 100;
          stage.innerHTML = `
            <div class="hud"><span>Round <b>${r + 1}</b>/${probs.length}</span><span>Earned <b>${money(total)}</b></span></div>
            <p>Chance of getting paid this round</p><div class="odds">${Math.round(p * 100)}%</div>
            <div class="effort-options" style="margin-top:14px">
              <button class="btn" data-v="easy">Easy<small>15 taps · ${money(1)}</small></button>
              <button class="btn primary" data-v="hard">Hard<small style="color:inherit;opacity:.85">45 taps · ${money(hardReward)}</small></button>
            </div>`;
          const pick = await choose(ctx, stage, '.effort-options .btn');
          const need = pick === 'hard' ? 45 : 15, secs = pick === 'hard' ? 15 : 6;
          await countdown(ctx, stage);
          stage.innerHTML = `
            <div class="hud"><span>${pick === 'hard' ? 'Hard' : 'Easy'} task</span><span>Time <b id="tm">${secs}</b>s</span></div>
            <button class="btn primary press-btn" id="press">TAP</button>
            <div class="bar"><div id="bar" style="width:0%"></div></div><p class="muted small"><span id="cnt">0</span>/${need}</p>`;
          let count = 0, done = false;
          const tap = () => {
            if (done) return; count++;
            $('#bar', stage).style.width = `${(count / need) * 100}%`; $('#cnt', stage).textContent = count;
          };
          ctx.listen($('#press', stage), 'pointerdown', (e) => { e.preventDefault(); tap(); });
          ctx.listen(document, 'keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) tap(); } });
          const start = performance.now();
          while (count < need && performance.now() - start < secs * 1000) {
            await ctx.wait(100);
            $('#tm', stage).textContent = Math.max(0, Math.ceil(secs - (performance.now() - start) / 1000));
          }
          done = true;
          const completed = count >= need, paid = completed && Math.random() < p;
          const reward = pick === 'hard' ? hardReward : 1;
          if (paid) total += reward;
          log.push({ p, pick, completed });
          stage.innerHTML = `<h3>${completed ? (paid ? `You won ${money(reward)}!` : 'Finished — but no payout this time.') : 'Time ran out.'}</h3>
            <div class="btn-row"><button class="btn primary" id="nx">${r + 1 < probs.length ? 'Next round' : 'Finish'}</button></div>`;
          await choose(ctx, stage, '#nx');
        }
        const hard = log.filter((x) => x.pick === 'hard');
        const byP = (v) => { const g = log.filter((x) => x.p === v); return `${g.filter((x) => x.pick === 'hard').length}/${g.length}`; };
        return {
          scores: { effort: Math.round((hard.length / log.length) * 100) },
          raw: { 'Hard chosen at 88%': byP(0.88), 'Hard chosen at 50%': byP(0.5), 'Hard chosen at 12%': byP(0.12), 'Tasks completed': `${log.filter((x) => x.completed).length}/${log.length}`, 'Earned': money(total) },
        };
      },
    },
    {
      id: 'delay', title: 'Now or Later', icon: '⏳', mins: 1,
      steps: [
        'You will make a series of choices between money today and more money later.',
        'There are no right answers — pick what you would really choose.',
        '12 choices.',
      ],
      async run(ctx, stage) {
        // [today, later, days]
        const items = shuffle([[54, 55, 117], [55, 75, 61], [19, 25, 53], [31, 85, 7], [14, 25, 19], [47, 50, 160],
          [15, 35, 13], [25, 60, 14], [78, 80, 192], [40, 55, 62], [11, 30, 7], [67, 75, 119]]);
        let later = 0;
        const fmtDays = (d) => d < 14 ? `${d} days` : d < 60 ? `${Math.round(d / 7)} weeks` : `${Math.round(d / 30)} months`;
        for (let k = 0; k < items.length; k++) {
          const [a, b, d] = items[k];
          stage.innerHTML = `
            <div class="hud"><span>Choice <b>${k + 1}</b>/${items.length}</span></div>
            <h3>Which would you rather have?</h3>
            <div class="dd-choices">
              <button class="btn" data-v="now">${CUR}${a}<small>today</small></button>
              <button class="btn" data-v="later">${CUR}${b}<small>in ${fmtDays(d)}</small></button>
            </div>`;
          if ((await choose(ctx, stage, '.dd-choices .btn')) === 'later') later++;
          await ctx.wait(120);
        }
        return {
          scores: { patience: Math.round((later / items.length) * 100) },
          raw: { 'Chose to wait': `${later}/${items.length}` },
        };
      },
    },
  ];


  // ---------- Screens ----------
  const needsPerson = ['hub', 'intro', 'play', 'results'];
  function show(name, arg) {
    teardown();
    window.scrollTo(0, 0);
    if (needsPerson.includes(name) && !state) name = 'home';
    ({ home, hub, intro, play, results })[name](arg);
  }
  const doneCount = (p) => GAMES.filter((g) => p.results[g.id]).length;
  const validEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

  function home() {
    const people = Object.values(db.people).sort((a, b) => b.created - a.created);
    app.innerHTML = `
      <section class="hero">
        <h1>Discover how you think,<br>decide and work.</h1>
        <p class="lead">Play ${GAMES.length} short games based on behavioural science. There are no right or wrong answers — just a clearer picture of your natural traits and the work that fits them.</p>
        <form class="start-form" id="start">
          <input class="input" id="name" placeholder="Your name" maxlength="40" required aria-label="Your name">
          <input class="input" id="email" type="email" placeholder="Email (to receive your results)" maxlength="120" aria-label="Your email">
          <button class="btn primary big" type="submit">Start the games</button>
        </form>
        <p class="muted small" style="margin-top:12px">About 20 minutes in total · play in any order · each new person gets a fresh profile</p>
      </section>
      ${people.length ? `
      <section class="section">
        <h2>Profiles on this device</h2>
        <div class="people">
          ${people.map((p) => `
            <div class="card person">
              <div><b>${esc(p.name)}</b><div class="muted small">${doneCount(p)}/${GAMES.length} games · ${new Date(p.created).toLocaleDateString()}</div></div>
              <div class="person-actions">
                <button class="btn" data-act="open" data-id="${p.id}">${doneCount(p) === GAMES.length ? 'View profile' : 'Continue'}</button>
                <button class="link" data-act="del" data-id="${p.id}" aria-label="Delete ${esc(p.name)}">Delete</button>
              </div>
            </div>`).join('')}
        </div>
      </section>` : ''}
      <section class="steps">
        <div class="card step"><div class="num">1</div><h3>Play the games</h3><p class="muted">Pump balloons, remember numbers, build towers and make money decisions.</p></div>
        <div class="card step"><div class="num">2</div><h3>See your traits</h3><p class="muted">Your choices map onto 9 traits like risk tolerance, planning, patience and emotional insight.</p></div>
        <div class="card step"><div class="num">3</div><h3>Get your report</h3><p class="muted">See your profile, role ideas that fit your pattern, and email the report to yourself.</p></div>
      </section>`;
    const ctx = makeCtx();
    ctx.listen($('#start'), 'submit', (e) => {
      e.preventDefault();
      const name = $('#name').value.trim(), email = $('#email').value.trim();
      if (!name) return;
      if (email && !validEmail(email)) { $('#email').focus(); $('#email').setCustomValidity('Please enter a valid email'); $('#email').reportValidity(); return; }
      startPerson(name, email); show('hub');
    });
    ctx.listen($('#email'), 'input', () => $('#email').setCustomValidity(''));
    app.querySelectorAll('[data-act]').forEach((b) => ctx.listen(b, 'click', () => {
      const p = db.people[b.dataset.id];
      if (b.dataset.act === 'open') { switchTo(p.id); show(doneCount(p) === GAMES.length ? 'results' : 'hub'); }
      else if (confirm(`Delete ${p.name}'s profile?`)) { deletePerson(p.id); show('home'); }
    }));
  }

  function hub() {
    const done = doneCount(state);
    app.innerHTML = `
      <div class="hub-head">
        <div><h2>Hi ${esc(state.name)}, pick a game</h2>
        <p class="muted">${done}/${GAMES.length} completed. Finish all of them for the fullest profile.</p></div>
        <button class="btn ${done ? 'primary' : ''}" id="toProfile" ${done ? '' : 'disabled'}>See my profile</button>
      </div>
      <div class="progress"><div style="width:${(done / GAMES.length) * 100}%"></div></div>
      <div class="game-grid">
        ${GAMES.map((g) => `
          <button class="card game-card" data-id="${g.id}">
            <span class="icon">${g.icon}</span>
            <h3>${g.title}</h3>
            <div class="meta"><span class="muted small">~${g.mins} min</span>
            <span class="pill ${state.results[g.id] ? 'done' : ''}">${state.results[g.id] ? 'Done · replay' : 'Not played'}</span></div>
          </button>`).join('')}
      </div>
      <div class="btn-row"><button class="link" id="notme">Not ${esc(state.name)}? Start as someone else</button></div>`;
    const ctx = makeCtx();
    app.querySelectorAll('.game-card').forEach((c) => ctx.listen(c, 'click', () => show('intro', c.dataset.id)));
    ctx.listen($('#toProfile'), 'click', () => show('results'));
    ctx.listen($('#notme'), 'click', () => { endSession(); show('home'); });
  }

  function intro(id) {
    const g = GAMES.find((x) => x.id === id);
    app.innerHTML = `
      <div class="game-shell"><div class="card">
        <div class="game-title"><span class="icon">${g.icon}</span><div><h2 style="margin:0">${g.title}</h2><span class="muted small">~${g.mins} min</span></div></div>
        <div class="instructions"><b>How to play</b><ul>${g.steps.map((s) => `<li>${s}</li>`).join('')}</ul></div>
        <div class="btn-row"><button class="btn" id="back">Back</button><button class="btn primary big" id="go">Start</button></div>
      </div></div>`;
    const ctx = makeCtx();
    ctx.listen($('#back'), 'click', () => show('hub'));
    ctx.listen($('#go'), 'click', () => show('play', id));
  }

  async function play(id) {
    const g = GAMES.find((x) => x.id === id);
    const player = state;
    app.innerHTML = `
      <div class="game-shell"><div class="card">
        <div class="game-title"><span class="icon">${g.icon}</span><h2 style="margin:0">${g.title}</h2></div>
        <div class="stage" id="stage"></div>
      </div>
      <div class="btn-row no-print"><button class="link" id="quit">Quit game</button></div></div>`;
    const ctx = makeCtx();
    ctx.listen($('#quit'), 'click', () => show('hub'));
    const stage = $('#stage');
    const res = await g.run(ctx, stage);
    if (!ctx.alive() || state !== player) return;
    state.results[id] = { ...res, at: Date.now() };
    save();
    const next = GAMES.find((x) => !state.results[x.id]);
    const traitNames = Object.keys(res.scores).map((t) => TRAITS.find((x) => x.id === t).name).join(' and ');
    stage.innerHTML = `
      <div style="font-size:3rem">✅</div>
      <h2>Nice work!</h2>
      <p class="muted">This game looked at your <b>${traitNames}</b>.</p>
      <div class="btn-row">
        ${next ? `<button class="btn primary big" id="next">Next: ${next.title}</button>` : `<button class="btn primary big" id="res">See my profile</button>`}
        <button class="btn" id="hubb">All games</button>
      </div>`;
    const ctx2 = makeCtx();
    if (next) ctx2.listen($('#next'), 'click', () => show('intro', next.id));
    else ctx2.listen($('#res'), 'click', () => show('results'));
    ctx2.listen($('#hubb'), 'click', () => show('hub'));
  }

  // ---------- Profile building ----------
  function traitScores(p) {
    const out = {};
    for (const g of Object.values(p.results)) Object.assign(out, g.scores);
    return out;
  }
  function describe(t) {
    return t.v >= 60 ? t.high : t.v <= 40 ? t.low
      : `You sit in the balanced middle — you can lean ${t.lowLabel.toLowerCase()} or ${t.highLabel.toLowerCase()} depending on the situation.`;
  }
  function buildProfile(p) {
    const scores = traitScores(p);
    const have = TRAITS.filter((t) => scores[t.id] != null).map((t) => ({ ...t, v: scores[t.id] }));
    if (!have.length) return null;
    const strongest = [...have].sort((a, b) => Math.abs(b.v - 50) - Math.abs(a.v - 50));
    const adj = (t) => (t.v >= 50 ? t.highAdj : t.lowAdj);
    const cap = (s) => s[0].toUpperCase() + s.slice(1);
    const headline = strongest.length >= 2 ? `${cap(adj(strongest[0]))} & ${adj(strongest[1])}` : cap(adj(strongest[0]));
    const roleW = {};
    for (const t of have) {
      const dist = Math.abs(t.v - 50);
      if (dist < 12) continue;
      for (const r of (t.v > 50 ? t.highRoles : t.lowRoles)) roleW[r] = (roleW[r] || 0) + dist;
    }
    const roles = Object.entries(roleW).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([r]) => r);
    return { scores, have, strongest, headline, roles, missing: GAMES.filter((g) => !p.results[g.id]) };
  }
  function plainTextReport(p, prof) {
    const lines = [
      `${p.name}'s MindPrint profile: ${prof.headline}`, '',
      ...prof.have.map((t) => `${t.name}: ${t.v}/100 (${t.lowLabel} ← → ${t.highLabel})\n  ${describe(t)}`), '',
    ];
    if (prof.roles.length) lines.push(`Work that tends to fit: ${prof.roles.join(', ')}`, '');
    lines.push(`Play again: ${location.href.split('#')[0]}`, '', 'MindPrint is for self-reflection only, not a validated psychometric test.');
    return lines.join('\n');
  }
  async function sendEmail(p, prof, to) {
    if (EMAIL_ENDPOINT) {
      const payload = { name: p.name, email: to, scores: prof.scores, site: location.href.split('#')[0] };
      // text/plain avoids a CORS preflight; Apps Script reads e.postData.contents
      await fetch(EMAIL_ENDPOINT, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
      return 'sent';
    }
    const subject = encodeURIComponent(`My MindPrint profile: ${prof.headline}`);
    const body = encodeURIComponent(plainTextReport(p, prof));
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${subject}&body=${body}`;
    return 'mailto';
  }

  function radarSVG(items) {
    const size = 340, c = size / 2, R = 115, n = items.length;
    if (n < 3) return '';
    const pt = (i, v) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
      return [c + Math.cos(a) * R * v, c + Math.sin(a) * R * v];
    };
    const rings = [0.25, 0.5, 0.75, 1].map((f) => `<polygon class="grid" points="${items.map((_, i) => pt(i, f).join(',')).join(' ')}"/>`).join('');
    const axes = items.map((_, i) => { const [x, y] = pt(i, 1); return `<line class="axis" x1="${c}" y1="${c}" x2="${x}" y2="${y}"/>`; }).join('');
    const area = `<polygon class="area" points="${items.map((t, i) => pt(i, Math.max(0.04, t.v / 100)).join(',')).join(' ')}"/>`;
    const dots = items.map((t, i) => { const [x, y] = pt(i, Math.max(0.04, t.v / 100)); return `<circle class="pt" cx="${x}" cy="${y}" r="3.5"/>`; }).join('');
    const labels = items.map((t, i) => {
      const [x, y] = pt(i, 1.2);
      const anchor = Math.abs(x - c) < 10 ? 'middle' : x > c ? 'start' : 'end';
      return `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="middle">${esc(t.name)}</text>`;
    }).join('');
    return `<svg class="radar" viewBox="-95 -10 ${size + 190} ${size + 20}" role="img" aria-label="Trait radar chart">${rings}${axes}${area}${dots}${labels}</svg>`;
  }

  function results() {
    const prof = buildProfile(state);
    if (!prof) { show('hub'); return; }
    const { have, strongest, headline, roles, missing, scores } = prof;

    app.innerHTML = `
      <div class="results-head">
        <div>
          <p class="muted" style="margin:0">${esc(state.name)}’s MindPrint</p>
          <div class="headline">${esc(headline)}</div>
          <p class="muted" style="margin-top:10px">Your most distinctive traits are <b>${esc(strongest[0].name.toLowerCase())}</b>${strongest[1] ? ` and <b>${esc(strongest[1].name.toLowerCase())}</b>` : ''}. Each trait is a spectrum — both ends are strengths in the right setting.</p>
          ${missing.length ? `<p class="small">Profile is partial: ${missing.length} game${missing.length > 1 ? 's' : ''} left (${missing.map((g) => g.title).join(', ')}).</p>` : ''}
          <div class="btn-row no-print" style="justify-content:flex-start">
            ${missing.length ? `<button class="btn primary" id="more">Play remaining games</button>` : ''}
            <button class="btn" id="dl">Download</button>
            <button class="btn" id="pr">Print / PDF</button>
          </div>
        </div>
        <div class="card">${have.length >= 3 ? radarSVG(have) : '<p class="muted">Play at least 3 games to see your trait map.</p>'}</div>
      </div>

      <section class="card section no-print email-card">
        <h3>📧 Email my results</h3>
        <form id="mailf" class="start-form" style="justify-content:flex-start">
          <input class="input" id="to" type="email" required placeholder="you@example.com" value="${esc(state.email || '')}" aria-label="Email address">
          <button class="btn primary" type="submit" id="sendb">Send report</button>
        </form>
        <div class="feedback" id="mailfb"></div>
      </section>

      ${roles.length ? `<section class="section"><h2>Work that tends to fit</h2>
        <p class="muted">People with a similar trait pattern often enjoy these areas. Treat them as ideas to explore, not a verdict.</p>
        <div class="chips">${roles.map((r) => `<span class="chip">${esc(r)}</span>`).join('')}</div></section>` : ''}

      <section class="section"><h2>Your traits</h2>
        <div class="trait-list">
          ${have.map((t) => `
            <div class="card trait">
              <div class="trait-top"><h3 style="margin:0">${esc(t.name)}</h3><span class="muted small">${t.v}/100</span></div>
              <div class="spectrum"><div class="marker" style="left:${t.v}%"></div></div>
              <div class="ends"><span>${esc(t.lowLabel)}</span><span>${esc(t.highLabel)}</span></div>
              <p style="margin:10px 0 0">${esc(describe(t))}</p>
            </div>`).join('')}
        </div>
      </section>

      <details class="card section"><summary>Game-by-game details</summary>
        ${GAMES.filter((g) => state.results[g.id]).map((g) => `
          <h3 style="margin-top:14px">${g.icon} ${g.title}</h3>
          <table>${Object.entries(state.results[g.id].raw || {}).map(([k, v]) => `<tr><td>${esc(k)}</td><td><b>${esc(v)}</b></td></tr>`).join('')}</table>`).join('')}
      </details>

      <section class="card section no-print finish-card">
        <div><h3 style="margin:0">All done?</h3><p class="muted small" style="margin:4px 0 0">Hand the device to the next person. ${esc(state.name)}'s profile stays saved under “Profiles on this device”.</p></div>
        <div class="btn-row" style="margin:0">
          <button class="btn primary" id="nextp">Finish &amp; next person</button>
          <button class="link" id="delp">Delete my profile</button>
        </div>
      </section>`;

    const ctx = makeCtx();
    if (missing.length) ctx.listen($('#more'), 'click', () => show('intro', missing[0].id));
    ctx.listen($('#pr'), 'click', () => window.print());
    ctx.listen($('#dl'), 'click', () => {
      const blob = new Blob([JSON.stringify({ name: state.name, traits: scores, games: state.results, exported: new Date().toISOString() }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `mindprint-${state.name.toLowerCase().replace(/\W+/g, '-')}.json`;
      document.body.appendChild(a); a.click(); a.remove();
    });
    ctx.listen($('#mailf'), 'submit', async (e) => {
      e.preventDefault();
      const to = $('#to').value.trim(), fb = $('#mailfb'), btn = $('#sendb');
      if (!validEmail(to)) { fb.textContent = 'Please enter a valid email.'; fb.className = 'feedback bad'; return; }
      state.email = to; save();
      btn.disabled = true; fb.className = 'feedback'; fb.textContent = 'Sending…';
      try {
        const how = await sendEmail(state, prof, to);
        fb.className = 'feedback good';
        fb.textContent = how === 'sent' ? `Sent to ${to}. Check your inbox (and spam folder) in a minute.` : 'Your email app should open with the report ready — just press Send.';
      } catch (err) {
        fb.className = 'feedback bad'; fb.textContent = 'Could not send right now. Please try again, or use Download / Print.';
      }
      btn.disabled = false;
    });
    ctx.listen($('#nextp'), 'click', () => { endSession(); show('home'); });
    ctx.listen($('#delp'), 'click', () => {
      if (!confirm('Delete your profile from this device?')) return;
      deletePerson(state.id); show('home');
    });
  }

  // ---------- Nav ----------
  $('#brand').addEventListener('click', (e) => { e.preventDefault(); show('home'); });
  $('#nav-games').addEventListener('click', () => show('hub'));
  $('#nav-profile').addEventListener('click', () => show(state && doneCount(state) ? 'results' : 'hub'));

  show(state ? 'hub' : 'home');
})();
