/* games-upgrade.js — additive. Loads after index.html's own script and takes over
   only the two mini-games (#flowerCanvas and #rageArena). Nothing else is touched. */
(function () {
  'use strict';
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
    av.innerHTML = '<div class="gu-body"><span class="boy-face" aria-hidden="true"><span class="boy-brow left"></span><span class="boy-brow right"></span><span class="boy-eye left"></span><span class="boy-eye right"></span><span class="boy-nose"></span><span class="boy-mouth"></span></span><span class="gu-sweat">💦</span><span class="gu-flag">🏳️</span></div>';
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
    var MARGIN = 44;

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
      bubble.style.top = Math.max(P.y - 46, 44) + 'px';
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
      if (now - lastAttempt < 450) return;
      lastAttempt = now;
      if (surrendered) return;
      if (typeof updateRage === 'function') updateRage(kind === 'tap' ? 12 : 6);
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
      if (e.pointerType === 'mouse' && !surrendered && Math.hypot(p.x - P.x, p.y - P.y) < 78) attempt('hover', p.x, p.y);
    });
    arena.addEventListener('pointerleave', function () { mouse.in = false; });
    arena.addEventListener('pointerdown', function (e) {
      var p = local2(e);
      var rp = document.createElement('span'); rp.className = 'gu-ripple'; rp.style.left = p.x + 'px'; rp.style.top = p.y + 'px';
      arena.appendChild(rp); setTimeout(function () { rp.remove(); }, 600);
      if (Math.hypot(p.x - P.x, p.y - P.y) < 120) attempt('tap', p.x, p.y);
    });

    var rb = document.getElementById('rageButton');
    if (rb) rb.addEventListener('click', function () {
      if (typeof rage !== 'undefined' && rage >= 100) surrender(); else if (!surrendered) { dodge(P.x, P.y); say(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]); }
    });
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
