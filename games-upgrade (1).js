/* games-upgrade.js — additive. Loads after index.html's own script and takes over
   only the two mini-games (#flowerCanvas and #rageArena). Nothing else is touched. */
(function () {
  'use strict';
  document.querySelectorAll('.typed-line').forEach(function (l) {
    if (l.dataset.line) l.dataset.line = l.dataset.line.replace(/\s*[—–]\s*/g, ', ');
  });
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var easeOutCubic = function (t) { return 1 - Math.pow(1 - t, 3); };
  var easeOutBack = function (t) { var c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

  /* =====================================================================
     GAME 1 — BLOOM GARDEN (canvas)
     Tap anywhere: a stem grows from the ground up to the spot you tapped,
     then the flower opens with a springy bloom, sparkles and falling petals.
     Flowers sway in the wind and lean away from your finger/cursor.
     ===================================================================== */
  var stage = document.getElementById('flowerCanvas');
  if (stage) {
    var cvs = document.createElement('canvas');
    cvs.className = 'gu-canvas';
    stage.appendChild(cvs);
    var hint = document.createElement('div');
    hint.className = 'gu-hint';
    hint.textContent = 'tap anywhere — the stem grows to where you tap';
    stage.appendChild(hint);
    var ctx = cvs.getContext('2d');
    var W = 0, H = 0, dpr = 1;
    var flowers = [], bits = [];
    var seed = '🌷';
    var pointer = { x: -999, y: -999 };

    var TYPES = {
      '🌷': { n: 5, arc: 2.1, up: true, len: 30, wid: 15, cols: ['#e58aa0', '#f2a9b9'], core: '#f7d77a', coreR: 5, stem: '#6f9468' },
      '🌼': { n: 14, arc: 6.283, len: 24, wid: 5.5, cols: ['#fffaf0', '#fdf0e0'], core: '#f0c84b', coreR: 8, stem: '#7aa070' },
      '🌸': { n: 5, arc: 6.283, len: 22, wid: 14, cols: ['#f6b6c6', '#fad0da'], core: '#f0d37a', coreR: 4.5, stem: '#78996e' },
      '🌻': { n: 22, arc: 6.283, len: 27, wid: 6.5, cols: ['#f5c030', '#f9d658'], core: '#6b4a32', coreR: 13, stem: '#5f8a56', seeds: true }
    };

    function resize() {
      var r = stage.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
    else window.addEventListener('resize', resize);

    function plant(x, y) {
      var t = TYPES[seed];
      var groundY = H * (0.8 + Math.random() * 0.05);
      var top = clamp(y, 34, groundY - 60);
      var f = { type: t, x: clamp(x, 18, W - 18), baseY: groundY, headY: top, born: performance.now(),
        phase: rand(0, 6.28), rot: rand(0, 6.28), lean: 0, burst: false, scale: rand(.9, 1.15),
        leaf: rand(.35, .6), leafSide: Math.random() < .5 ? -1 : 1 };
      flowers.push(f);
      if (flowers.length > 40) flowers.shift();
      stage.classList.add('has-bloom');
      var el = document.getElementById('bloomGameResponse');
      if (el) {
        var c = flowers.length;
        el.textContent = c === 1 ? 'your first bloom. 🌱' : c < 6 ? c + ' little blooms, growing just fine.' : c < 15 ? 'you’re making a real meadow. 🌷' : 'this garden is overflowing with you. ♡';
      }
    }

    function burst(f, hx, hy) {
      var n = reduce ? 0 : 14;
      for (var i = 0; i < n; i++) {
        var a = rand(0, 6.28), s = rand(40, 130);
        bits.push({ x: hx, y: hy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0, max: rand(.9, 1.6),
          col: f.type.cols[i % 2], size: rand(2, 4.5), petal: i % 3 !== 0, rot: rand(0, 6.28), spin: rand(-4, 4) });
      }
    }

    function drawPetal(len, wid, col, tulip) {
      ctx.beginPath();
      if (tulip) {
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(wid, -len * .2, wid * 1.1, -len * .85, 0, -len);
        ctx.bezierCurveTo(-wid * 1.1, -len * .85, -wid, -len * .2, 0, 0);
      } else {
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(wid, -len * .25, wid, -len * .9, 0, -len);
        ctx.bezierCurveTo(-wid, -len * .9, -wid, -len * .25, 0, 0);
      }
      ctx.fillStyle = col; ctx.fill();
      ctx.strokeStyle = 'rgba(120,70,80,.18)'; ctx.lineWidth = .8; ctx.stroke();
    }

    function drawFlower(f, now, time) {
      var age = (now - f.born) / 1000;
      var grow = reduce ? 1 : easeOutCubic(clamp(age / 1.0, 0, 1));
      var open = reduce ? 1 : clamp((age - .8) / .9, 0, 1);
      var oe = open <= 0 ? 0 : easeOutBack(open);
      if (open > 0 && !f.burst) { f.burst = true; burst(f, f.x, f.headY); }

      // wind + pointer lean
      var wind = Math.sin(time * 1.3 + f.phase) * 5 + Math.sin(time * .6 + f.phase * 2) * 3;
      var dx = f.x - pointer.x, dy = f.headY - pointer.y, d = Math.hypot(dx, dy);
      var push = d < 110 ? (1 - d / 110) * 34 * Math.sign(dx || 1) : 0;
      f.lean += ((wind + push) - f.lean) * .12;

      var curH = f.baseY - (f.baseY - f.headY) * grow;
      var hx = f.x + f.lean * grow, hy = curH;
      var cx = f.x + f.lean * .1, cy = (f.baseY + hy) / 2;

      // stem
      ctx.lineCap = 'round';
      ctx.strokeStyle = f.type.stem; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(f.x, f.baseY); ctx.quadraticCurveTo(cx, cy, hx, hy); ctx.stroke();

      // leaf
      if (grow > .35) {
        var lt = f.leaf, lx = (1 - lt) * (1 - lt) * f.x + 2 * (1 - lt) * lt * cx + lt * lt * hx;
        var ly = (1 - lt) * (1 - lt) * f.baseY + 2 * (1 - lt) * lt * cy + lt * lt * hy;
        var ls = easeOutCubic(clamp((grow - .35) / .5, 0, 1));
        ctx.save(); ctx.translate(lx, ly); ctx.rotate(f.leafSide * (1.0 + f.lean * .01)); ctx.scale(ls, ls);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(11 * f.leafSide, -16, 0, -30);
        ctx.quadraticCurveTo(-11 * f.leafSide, -16, 0, 0); ctx.fillStyle = f.type.stem; ctx.globalAlpha = .9; ctx.fill(); ctx.restore();
      }

      // bud / bloom
      var t = f.type, sc = f.scale * (grow < 1 ? .25 + .0 : 1);
      if (open <= 0) {
        ctx.fillStyle = t.stem; ctx.beginPath(); ctx.arc(hx, hy, 4.2 * grow, 0, 6.283); ctx.fill();
        return;
      }
      ctx.save(); ctx.translate(hx, hy);
      ctx.rotate(f.lean * .012 + (t.up ? 0 : f.rot + Math.sin(time * .5 + f.phase) * .05));
      ctx.scale(f.scale * oe, f.scale * oe);
      var start = t.up ? -t.arc / 2 : 0, step = t.up ? t.arc / (t.n - 1) : t.arc / t.n;
      for (var i = 0; i < t.n; i++) {
        var a = start + i * step;
        ctx.save(); ctx.rotate(a);
        drawPetal(t.len * (t.up && (i === 0 || i === t.n - 1) ? .82 : 1), t.wid, t.cols[i % 2], t.up);
        ctx.restore();
      }
      if (!t.up) {
        ctx.fillStyle = t.core; ctx.beginPath(); ctx.arc(0, 0, t.coreR, 0, 6.283); ctx.fill();
        if (t.seeds) {
          ctx.fillStyle = 'rgba(40,24,12,.55)';
          for (var k = 0; k < 22; k++) { var r = Math.sqrt(k / 22) * (t.coreR - 2), th = k * 2.4;
            ctx.beginPath(); ctx.arc(Math.cos(th) * r, Math.sin(th) * r, 1.1, 0, 6.283); ctx.fill(); }
        }
      }
      ctx.restore();
    }

    var last = performance.now();
    function loop(now) {
      var dt = Math.min((now - last) / 1000, .05); last = now;
      ctx.clearRect(0, 0, W, H);
      var time = now / 1000;
      for (var i = 0; i < flowers.length; i++) drawFlower(flowers[i], now, time);
      for (var j = bits.length - 1; j >= 0; j--) {
        var b = bits[j]; b.life += dt;
        if (b.life > b.max) { bits.splice(j, 1); continue; }
        b.vy += 160 * dt; b.vx *= .985; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.spin * dt;
        ctx.globalAlpha = 1 - b.life / b.max; ctx.fillStyle = b.col;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot);
        ctx.beginPath();
        if (b.petal) ctx.ellipse(0, 0, b.size * 1.5, b.size * .8, 0, 0, 6.283); else ctx.arc(0, 0, b.size * .6, 0, 6.283);
        ctx.fill(); ctx.restore(); ctx.globalAlpha = 1;
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    function local(e) { var r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    stage.addEventListener('pointerdown', function (e) { var p = local(e); pointer = p; plant(p.x, p.y); });
    stage.addEventListener('pointermove', function (e) { pointer = local(e); });
    stage.addEventListener('pointerleave', function () { pointer = { x: -999, y: -999 }; });

    var seedBtns = document.querySelectorAll('.seed-picker [data-seed]');
    function markSeed() { seedBtns.forEach(function (b) { b.classList.toggle('gu-active', b.dataset.seed === seed); }); }
    seedBtns.forEach(function (b) {
      b.addEventListener('click', function () { seed = b.dataset.seed; markSeed(); });
    });
    markSeed();
    var clr = document.getElementById('clearFlowers');
    if (clr) clr.addEventListener('click', function () { flowers.length = 0; bits.length = 0; stage.classList.remove('has-bloom'); });
  }

  /* =====================================================================
     GAME 2 — RAGE METER (smooth, springy, impossible to hit)
     Spring physics + flee-on-approach + squash/stretch + motion trail.
     Every attempt (hover-close or tap-near) shows a cute plea bubble.
     ===================================================================== */
  var arena = document.getElementById('rageArena');
  if (arena) {
    var rageCard = arena.closest('.game-card');
    if (rageCard) rageCard.classList.add('game-card-wide', 'gu-rage-card');
    var MESSAGES = [
      'please be gentle with a human like me 🥺',
      'leave a poor little human alone ♡',
      'a human like me is very fragile, okay? 😭',
      'spare a human like me, i’m trying my best!',
      'one tiny human, many apologies ♡',
      'be kind to a human like me… i’m sorry! 🥹',
      'a human like me can’t take a hit that cute 😳',
      'mercy for this very sorry human ♡'
    ];
    var av = document.createElement('div');
    av.className = 'gu-avatar';
    av.innerHTML = '<div class="gu-body"><img class="gu-boy" src="boy.png" alt="" draggable="false"><span class="gu-sweat">💦</span><span class="gu-flag">🏳️</span></div>';
    var shadow = document.createElement('div'); shadow.className = 'gu-shadow';
    var bubble = document.createElement('div'); bubble.className = 'gu-bubble';
    arena.appendChild(shadow); arena.appendChild(av); arena.appendChild(bubble);
    var body = av.firstChild;

    var aw = 0, ah = 0;
    function measure() { aw = arena.clientWidth; ah = arena.clientHeight; }
    measure();
    if (window.ResizeObserver) new ResizeObserver(measure).observe(arena); else window.addEventListener('resize', measure);

    var P = { x: aw / 2, y: ah * .44, vx: 0, vy: 0 };
    var T = { x: P.x, y: P.y };
    var mouse = { x: -999, y: -999, in: false };
    var surrendered = false, lastAttempt = 0, bubbleTimer = 0, scaredUntil = 0, ghostAcc = 0;
    var MARGIN = 56;

    function pickTarget(fromX, fromY) {
      var best = null, bestScore = -1;
      for (var i = 0; i < 14; i++) {
        var c = { x: rand(MARGIN, aw - MARGIN), y: rand(MARGIN, ah - 58) };
        var score = Math.hypot(c.x - fromX, c.y - fromY) + Math.hypot(c.x - P.x, c.y - P.y) * .4 + rand(0, 40);
        if (score > bestScore) { bestScore = score; best = c; }
      }
      return best;
    }

    function dodge(fromX, fromY) {
      if (surrendered) return;
      var t = pickTarget(fromX, fromY);
      T.x = t.x; T.y = t.y;
      var dx = t.x - P.x, dy = t.y - P.y, d = Math.hypot(dx, dy) || 1;
      if (reduce) { P.x = T.x; P.y = T.y; P.vx = P.vy = 0; return; }
      P.vx += dx / d * 900; P.vy += dy / d * 900;     // instant burst, then the spring takes over
      scaredUntil = performance.now() + 700;
    }

    function say(text) {
      bubble.textContent = text;
      bubble.style.left = clamp(P.x, 105, aw - 105) + 'px';
      bubble.style.top = Math.max(P.y - 58, 52) + 'px';
      bubble.classList.remove('show'); void bubble.offsetWidth; bubble.classList.add('show');
      clearTimeout(bubbleTimer);
      bubbleTimer = setTimeout(function () { bubble.classList.remove('show'); }, 1900);
      var r = document.getElementById('rageResponse'); if (r) r.textContent = text;
    }

    function hearts(x, y) {
      for (var i = 0; i < 9; i++) {
        var h = document.createElement('span'); h.className = 'gu-heart'; h.textContent = '♡';
        h.style.left = x + 'px'; h.style.top = y + 'px'; h.style.fontSize = rand(14, 26) + 'px';
        h.style.setProperty('--dx', rand(-70, 70) + 'px'); h.style.setProperty('--dy', rand(-90, -30) + 'px');
        arena.appendChild(h); setTimeout(function (n) { n.remove(); }.bind(null, h), 1400);
      }
    }

    function attempt(kind, x, y) {
      var now = performance.now();
      if (now - lastAttempt < 500) return;
      lastAttempt = now;
      if (surrendered) return;
      if (typeof updateRage === 'function') updateRage(1);
      arena.classList.remove('gu-shake'); void arena.offsetWidth; arena.classList.add('gu-shake');
      if (typeof rage !== 'undefined' && rage >= 100) { surrender(); return; }
      say(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
      dodge(x, y);
    }

    function surrender() {
      surrendered = true; av.classList.add('surrender');
      T.x = aw / 2; T.y = ah * .44;
      say('okay okay… you win. i’m so sorry, my human ♡');
      hearts(T.x, T.y);
    }

    function local2(e) { var r = arena.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }

    arena.addEventListener('pointermove', function (e) {
      var p = local2(e); mouse.x = p.x; mouse.y = p.y; mouse.in = true;
      if (e.pointerType === 'mouse' && !surrendered && Math.hypot(p.x - P.x, p.y - P.y) < 90) attempt('hover', p.x, p.y);
    });
    arena.addEventListener('pointerleave', function () { mouse.in = false; });
    arena.addEventListener('pointerdown', function (e) {
      var p = local2(e);
      var rp = document.createElement('span'); rp.className = 'gu-ripple'; rp.style.left = p.x + 'px'; rp.style.top = p.y + 'px';
      arena.appendChild(rp); setTimeout(function () { rp.remove(); }, 600);
      if (Math.hypot(p.x - P.x, p.y - P.y) < 130) attempt('tap', p.x, p.y);
    });

    var rb = document.getElementById('rageButton');
    if (rb) {
      var rb2 = rb.cloneNode(true); rb.parentNode.replaceChild(rb2, rb);
      rb2.addEventListener('click', function () { attempt('btn', P.x, P.y); });
    }
    var fsReq = arena.requestFullscreen || arena.webkitRequestFullscreen;
    var actions = rageCard && rageCard.querySelector('.rage-actions');
    if (fsReq && actions) {
      var fb = document.createElement('button'); fb.type = 'button'; fb.className = 'btn ghost small'; fb.textContent = 'full screen';
      fb.addEventListener('click', function () {
        if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        else fsReq.call(arena);
      });
      actions.appendChild(fb);
    }
    var rs = document.getElementById('resetRage');
    if (rs) rs.addEventListener('click', function () {
      surrendered = false; av.classList.remove('surrender'); bubble.classList.remove('show');
      P.x = T.x = aw / 2; P.y = T.y = ah * .44; P.vx = P.vy = 0;
    });

    // Blink every few seconds.
    setInterval(function () { av.classList.add('blink'); setTimeout(function () { av.classList.remove('blink'); }, 130); }, 2600);

    var prev = performance.now();
    function tick(now) {
      var dt = Math.min((now - prev) / 1000, .033); prev = now;
      if (!reduce) {
        var k = 150, c = 2 * Math.sqrt(k) * .72;          // slightly underdamped = springy, never jittery
        P.vx += ((T.x - P.x) * k - P.vx * c) * dt;
        P.vy += ((T.y - P.y) * k - P.vy * c) * dt;
        P.x += P.vx * dt; P.y += P.vy * dt;
      }
      P.x = clamp(P.x, 30, aw - 30); P.y = clamp(P.y, 30, ah - 50);
      var sp = Math.hypot(P.vx, P.vy);
      var bob = surrendered || sp > 40 ? 0 : Math.sin(now / 420) * 3;
      var stretch = Math.min(sp / 2600, .28), ang = Math.atan2(P.vy, P.vx);
      var tilt = clamp(P.vx * .018, -16, 16);
      av.style.transform = 'translate(' + P.x.toFixed(1) + 'px,' + (P.y + bob).toFixed(1) + 'px)';
      body.style.transform = 'rotate(' + tilt.toFixed(1) + 'deg) rotate(' + ang.toFixed(3) + 'rad) scale(' + (1 + stretch).toFixed(3) + ',' + (1 - stretch * .8).toFixed(3) + ') rotate(' + (-ang).toFixed(3) + 'rad)';
      shadow.style.transform = 'translate(' + P.x.toFixed(1) + 'px,' + (P.y + 40).toFixed(1) + 'px) scale(' + (1 - Math.min(sp / 2500, .3)).toFixed(2) + ')';
      av.classList.toggle('scared', now < scaredUntil);
      if (sp > 260 && !reduce) {
        ghostAcc += dt;
        if (ghostAcc > .03) {
          ghostAcc = 0;
          var g = document.createElement('span'); g.className = 'gu-ghost';
          g.style.setProperty('--t', 'translate(' + P.x.toFixed(0) + 'px,' + P.y.toFixed(0) + 'px)');
          arena.appendChild(g); setTimeout(function (n) { n.remove(); }.bind(null, g), 430);
        }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
})();

/* =====================================================================
   GAME 3 — UNTANGLE US  (placed between the bloom game and the rage meter)
   Boy and girl are joined by 10 knotted strings. Drag the pearls until no
   string crosses another. At 100% the strings turn into the word "sorry".
   Idea: planarity-style crossing detection (as in bokan96/untangle and
   tantalo's Planarity), written from scratch, with a bead-morph finale.
   ===================================================================== */
(function () {
  'use strict';
  var rageEl = document.getElementById('rageArena');
  var oldSection = document.getElementById('bloomGarden');
  var rageCard = rageEl && rageEl.closest('.game-card');
  if (!oldSection && !rageCard) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var N = 10, KN = 2, SAMPLES = 10;
  var COLS = ['#d89da7', '#8fae96', '#e2b36f', '#c27a8a', '#6f9a82', '#d9967a', '#b98aa0', '#9fb87f', '#e0a3a0', '#7fa3a6'];
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

  var card = document.createElement('article');
  card.className = 'game-card game-card-wide ut-card';
  card.innerHTML =
    '<p class="ut-intro">Ten strings, all knotted up between us. Drag the pearls until no string crosses another. Every red dot is a knot still waiting. I’ll be holding my end.</p>' +
    '<div class="ut-stage"><canvas class="ut-canvas" aria-label="Untangle the strings by dragging the pearls"></canvas></div>' +
    '<div class="ut-hud"><div class="ut-bar" role="progressbar" aria-label="Untangled" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="ut-fill"></div></div><div class="ut-stat"></div></div>' +
    '<div class="game-response ut-msg" aria-live="polite"></div>' +
    '<div class="ut-actions"><button class="btn ghost small" type="button">tangle it again</button></div>';
  if (oldSection) {
    var sec = document.createElement('section');
    sec.className = 'games-section ut-section'; sec.id = 'untangleUs';
    sec.innerHTML = '<div class="section-head"><div class="section-kicker">a little knot to undo</div><h2>untangle us</h2><p>For when words get all twisted up. Take your time, nothing here is timed.</p></div><div class="games-grid"></div>';
    sec.querySelector('.games-grid').appendChild(card);
    oldSection.parentNode.insertBefore(sec, oldSection);
  } else rageCard.parentNode.insertBefore(card, rageCard);

  var cvs = card.querySelector('canvas'), ctx = cvs.getContext('2d');
  var fill = card.querySelector('.ut-fill'), bar = card.querySelector('.ut-bar');
  var stat = card.querySelector('.ut-stat'), msg = card.querySelector('.ut-msg');
  var boyImg = new Image(), girlImg = new Image(); boyImg.src = 'boy.png'; girlImg.src = 'girl.png';

  var W = 0, H = 0, dpr = 1, G = {};            // size + layout
  var K = [];                                    // knots, normalised 0..1: K[i][j] = {x,y}
  var paths = [], cross = [], C0 = 1, state = 'tangled', drag = null, milestone = 0;
  var beads = [], winStart = 0, wordPts = null, visible = false, looping = false;

  function layout() {
    var avH = clamp(Math.min(H * .56, W * .22), 70, 190);
    var bw = avH * 420 / 476, gw = avH * 420 / 450;
    var cy = H - avH * .5, sp = clamp(avH * .5 / (N - 1) * 1.7, 8, 17);
    G = { avH: avH, bw: bw, gw: gw, lx: 8 + bw + 6, rx: W - 8 - gw - 6, cy: cy, sp: sp };
  }
  function slot(i, right) { return { x: right ? G.rx : G.lx, y: G.cy + (i - (N - 1) / 2) * G.sp }; }
  function knotXY(k) { return { x: G.lx + 20 + k.x * (G.rx - G.lx - 40), y: 18 + k.y * (H - 36) }; }

  function buildPath(i) {
    var pts = [slot(i, false), knotXY(K[i][0]), knotXY(K[i][1]), slot(i, true)], out = [];
    for (var j = 0; j < 3; j++) {
      var p0 = pts[Math.max(j - 1, 0)], p1 = pts[j], p2 = pts[j + 1], p3 = pts[Math.min(j + 2, 3)];
      for (var s = 0; s < SAMPLES; s++) {
        var t = s / SAMPLES, t2 = t * t, t3 = t2 * t;
        out.push({
          x: .5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
          y: .5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
        });
      }
    }
    out.push(pts[3]); return out;
  }
  function segHit(a, b, c, d) {
    var d1x = b.x - a.x, d1y = b.y - a.y, d2x = d.x - c.x, d2y = d.y - c.y, den = d1x * d2y - d1y * d2x;
    if (Math.abs(den) < 1e-9) return null;
    var t = ((c.x - a.x) * d2y - (c.y - a.y) * d2x) / den, u = ((c.x - a.x) * d1y - (c.y - a.y) * d1x) / den;
    return (t > 0 && t < 1 && u > 0 && u < 1) ? { x: a.x + t * d1x, y: a.y + t * d1y } : null;
  }
  function recompute() {
    if (!K.length) return 0;
    paths = []; for (var i = 0; i < N; i++) paths.push(buildPath(i));
    var pts = [];
    for (var a = 0; a < N; a++) for (var b = a + 1; b < N; b++) {
      var A = paths[a], B = paths[b];
      for (var s = 0; s < A.length - 1; s++) for (var r = 0; r < B.length - 1; r++) {
        var h = segHit(A[s], A[s + 1], B[r], B[r + 1]);
        if (h && !pts.some(function (q) { return Math.hypot(q.x - h.x, q.y - h.y) < 7; })) pts.push(h);
      }
    }
    cross = pts; return pts.length;
  }

  function scramble() {
    var best = null, bestC = 1e9;   // a messy start, but not an impossible one
    for (var tries = 0; tries < 40; tries++) {
      K = []; for (var i = 0; i < N; i++) K.push([{ x: rand(0, 1), y: rand(0, 1) }, { x: rand(0, 1), y: rand(0, 1) }]);
      var c = recompute(); if (c >= 25 && c < bestC) { bestC = c; best = K; }
    }
    if (best) K = best; recompute();
    C0 = Math.max(cross.length, 1);
  }

  function hud() {
    var C = cross.length, pct = C === 0 ? 100 : Math.min(99, Math.round((1 - C / C0) * 100));
    fill.style.width = pct + '%'; bar.setAttribute('aria-valuenow', pct);
    stat.innerHTML = '<b>' + pct + '%</b> untangled · <b>' + C + '</b> knot' + (C === 1 ? '' : 's') + ' left';
    var steps = [[85, 'almost there. one or two stubborn knots left ♡'], [60, 'look at that, it’s starting to breathe.'], [30, 'a few knots gone already. keep going, haivaan.']];
    if (state === 'tangled') for (var k = 0; k < steps.length; k++) if (pct >= steps[k][0] && milestone < steps[k][0]) { milestone = steps[k][0]; msg.textContent = steps[k][1]; break; }
  }

  function resize() {
    var r = cvs.getBoundingClientRect(); if (!r.width) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2); W = r.width; H = r.height;
    cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layout(); recompute(); if (state === 'tangled') hud(); else if (state === 'win') prepareWin(true);
  }

  /* ---------- drawing ---------- */
  function drawAvatar(img, x, w, right) {
    var y = H - G.avH + 8;
    if (img.complete && img.naturalWidth) ctx.drawImage(img, x, y, w, G.avH);
    else { ctx.fillStyle = '#f5c8a7'; ctx.beginPath(); ctx.arc(x + w / 2, y + G.avH / 2, w / 2.4, 0, 6.283); ctx.fill(); }
  }
  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    var t = state === 'win' ? (now - winStart) / 1000 : 0;
    drawAvatar(boyImg, 8, G.bw); drawAvatar(girlImg, W - 8 - G.gw, G.gw);
    // thread bars
    [G.lx, G.rx].forEach(function (x, side) {
      ctx.fillStyle = '#ead8cd'; ctx.strokeStyle = '#d9c3b7'; ctx.lineWidth = 1;
      var y0 = slot(0, side).y - 9, y1 = slot(N - 1, side).y + 9;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 4, y0, 8, y1 - y0, 4) : ctx.rect(x - 4, y0, 8, y1 - y0); ctx.fill(); ctx.stroke();
    });
    var sa = state === 'win' ? 1 - clamp(t / .9, 0, 1) : 1;
    if (sa > 0) {
      ctx.globalAlpha = sa; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (var pass = 0; pass < 2; pass++) for (var i = 0; i < N; i++) {
        var P = paths[i]; ctx.beginPath(); ctx.moveTo(P[0].x, P[0].y + (pass ? 0 : 2.5));
        for (var s = 1; s < P.length; s++) ctx.lineTo(P[s].x, P[s].y + (pass ? 0 : 2.5));
        ctx.strokeStyle = pass ? COLS[i] : 'rgba(80,50,40,.14)'; ctx.lineWidth = pass ? 3.2 : 5; ctx.stroke();
      }
      // pearls
      for (var a = 0; a < N; a++) for (var b = 0; b < KN; b++) {
        var p = knotXY(K[a][b]), on = drag && drag.i === a && drag.j === b, r = on ? 12 : 9;
        ctx.beginPath(); ctx.arc(p.x, p.y + 2, r, 0, 6.283); ctx.fillStyle = 'rgba(80,50,40,.15)'; ctx.fill();
        var g = ctx.createRadialGradient(p.x - 3, p.y - 3, 1, p.x, p.y, r);
        g.addColorStop(0, '#fffefb'); g.addColorStop(1, '#f1e2d8');
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.283); ctx.fillStyle = g; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = COLS[a]; ctx.stroke();
      }
      // knots that still need fixing
      if (state === 'tangled') cross.forEach(function (c, n) {
        var pulse = reduce ? 0 : Math.sin(now / 260 + n) * 1.8;
        ctx.beginPath(); ctx.arc(c.x, c.y, 9 + pulse, 0, 6.283); ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(200,70,90,.55)'; ctx.stroke();
        ctx.beginPath(); ctx.arc(c.x, c.y, 3.6, 0, 6.283); ctx.fillStyle = '#c8465a'; ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
    if (state === 'win') drawWin(t);
  }

  /* ---------- the "sorry" finale ---------- */
  function wordPoints(nTarget) {
    var x0 = G.lx + 14, x1 = G.rx - 14, aw = x1 - x0, off = document.createElement('canvas');
    off.width = Math.round(W); off.height = Math.round(H); var o = off.getContext('2d');
    var fs = 220, font = function (s) { return 'italic 600 ' + s + 'px "Playfair Display", Georgia, serif'; };
    o.font = font(fs); fs = Math.min(fs * (aw * .94) / o.measureText('sorry').width, H * .56); o.font = font(fs);
    o.textAlign = 'center'; o.textBaseline = 'middle'; o.fillStyle = '#000';
    var cx = (x0 + x1) / 2, cy = H * .46; o.fillText('sorry', cx, cy);
    var d = o.getImageData(0, 0, off.width, off.height).data, pts = [], step = 3;
    for (var y = 0; y < off.height; y += step) for (var x = 0; x < off.width; x += step) if (d[(y * off.width + x) * 4 + 3] > 128) pts.push({ x: x, y: y });
    while (pts.length < nTarget) pts.push(pts[Math.floor(Math.random() * pts.length)]);
    for (var i = pts.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), tmp = pts[i]; pts[i] = pts[j]; pts[j] = tmp; }
    pts = pts.slice(0, nTarget).sort(function (a, b) { return a.x - b.x || a.y - b.y; });
    return { pts: pts, font: font(fs), cx: cx, cy: cy };
  }
  function prepareWin(keepClock) {
    var per = 70, list = [];
    for (var i = 0; i < N; i++) { var P = paths[i]; for (var k = 0; k < per; k++) { var f = k / (per - 1) * (P.length - 1), a = Math.floor(f), b = Math.min(a + 1, P.length - 1), m = f - a; list.push({ x: P[a].x + (P[b].x - P[a].x) * m, y: P[a].y + (P[b].y - P[a].y) * m, c: COLS[i] }); } }
    list.sort(function (a, b) { return a.x - b.x; });
    wordPts = wordPoints(list.length);
    beads = list.map(function (b, n) { var T = wordPts.pts[n]; return { sx: b.x, sy: b.y, tx: T.x, ty: T.y, c: b.c, d: n / list.length * .75 + Math.random() * .15, sw: rand(-22, 22) }; });
    if (!keepClock) winStart = performance.now() - (reduce ? 6000 : 0);
  }
  function drawWin(t) {
    var fa = clamp((t - 1.9) / 1.2, 0, 1);
    if (fa > 0 && wordPts) { ctx.font = wordPts.font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(173,104,119,' + (fa * .32).toFixed(3) + ')'; ctx.fillText('sorry', wordPts.cx, wordPts.cy); }
    for (var i = 0; i < beads.length; i++) {
      var b = beads[i], u = clamp((t * 1 - .35 - b.d) / 1.15, 0, 1), e = ease(u), sw = Math.sin(u * Math.PI) * b.sw;
      var x = b.sx + (b.tx - b.sx) * e, y = b.sy + (b.ty - b.sy) * e + sw;
      ctx.beginPath(); ctx.arc(x, y, u < 1 ? 2.6 : 2.4 + (reduce ? 0 : Math.sin(t * 3 + i) * .4), 0, 6.283); ctx.fillStyle = b.c; ctx.globalAlpha = .95; ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function win() {
    state = 'win'; drag = null; cvs.classList.remove('drag'); hud();
    msg.textContent = 'there. nothing left between us but this…';
    prepareWin(false);
    setTimeout(function () { if (state === 'win') msg.textContent = 'sorry. truly, haivaan. thank you for untangling this with me ♡'; }, reduce ? 0 : 2600);
    kick();
  }

  /* ---------- input ---------- */
  function pos(e) { var r = cvs.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function hit(px, py, touch) {
    var best = null, bd = touch ? 34 : 24;
    for (var i = 0; i < N; i++) for (var j = 0; j < KN; j++) { var p = knotXY(K[i][j]), d = Math.hypot(p.x - px, p.y - py); if (d < bd) { bd = d; best = { i: i, j: j }; } }
    return best;
  }
  function moveKnot(px, py) {
    var k = K[drag.i][drag.j];
    k.x = clamp((px - G.lx - 20) / (G.rx - G.lx - 40), 0, 1); k.y = clamp((py - 18) / (H - 36), 0, 1);
    recompute(); hud(); if (cross.length === 0) win();
  }
  cvs.addEventListener('pointerdown', function (e) {
    if (state !== 'tangled') return; var p = pos(e), h = hit(p.x, p.y, e.pointerType === 'touch');
    if (!h) return; drag = h; cvs.setPointerCapture(e.pointerId); cvs.classList.add('drag'); moveKnot(p.x, p.y); e.preventDefault();
  });
  cvs.addEventListener('pointermove', function (e) { if (drag) { var p = pos(e); moveKnot(p.x, p.y); } });
  function end() { drag = null; cvs.classList.remove('drag'); }
  cvs.addEventListener('pointerup', end); cvs.addEventListener('pointercancel', end);
  cvs.addEventListener('touchstart', function (e) { var t = e.touches[0], r = cvs.getBoundingClientRect(); if (state === 'tangled' && hit(t.clientX - r.left, t.clientY - r.top, true)) e.preventDefault(); }, { passive: false });
  cvs.addEventListener('touchmove', function (e) { if (drag) e.preventDefault(); }, { passive: false });

  card.querySelector('.ut-actions .btn').addEventListener('click', function () {
    state = 'tangled'; beads = []; milestone = 0; scramble(); hud(); msg.textContent = 'Fresh knots. Drag the pearls apart, one string at a time ♡';
  });

  /* ---------- loop only while on screen ---------- */
  function frame(now) { if (!visible) { looping = false; return; } draw(now); requestAnimationFrame(frame); }
  function kick() { if (!looping) { looping = true; requestAnimationFrame(frame); } }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) { resize(); kick(); } }, { threshold: .05 }).observe(card);
  else { visible = true; kick(); }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(cvs); else window.addEventListener('resize', resize);

  resize(); scramble(); hud();
  msg.textContent = 'Drag the pearls. Where two strings cross, a red ring marks the knot.';
  if (document.fonts && document.fonts.load) document.fonts.load('italic 600 80px "Playfair Display"');
})();
