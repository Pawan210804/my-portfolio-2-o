(function () {
  'use strict';

  /* ============================================================
     UTILITIES & BOOT SEQUENCE 
  ============================================================ */
  const PREFERS_REDUCED_MOTION = false;
  const IS_MOBILE = window.matchMedia('(max-width: 768px)').matches;
  const IS_FINE_POINTER = window.matchMedia('(pointer: fine)').matches;

  window.addEventListener('load', () => {
    const bootScreen = document.getElementById('boot-screen');
    const lockVideo = document.getElementById('lock-video');
    const barFill = document.getElementById('lock-bar-fill');
    const statusEl = document.getElementById('lock-status');
    const pctEl = document.getElementById('lock-pct');
    let unlocked = false;

    const statusLines = ['Verifying identity…', 'Loading type engine…', 'Mounting assets…', 'Almost there…'];
    let statusIdx = 0;

    function unlock() {
      if (unlocked) return;
      unlocked = true;
      if (statusEl) statusEl.textContent = 'Access granted';
      if (barFill) barFill.style.width = '100%';
      if (pctEl) pctEl.textContent = '100%';
      if (bootScreen) bootScreen.classList.add('hidden');
      document.body.classList.remove('lock-active');
      setTimeout(() => textScramble(document.getElementById('hero-line1'), 'PAWAN', 800), 200);
      setTimeout(() => textScramble(document.getElementById('hero-line2'), 'RAI', 600), 700);
      // stop video after the transition so it isn't decoding in the background
      setTimeout(() => { if (lockVideo) { lockVideo.pause(); lockVideo.removeAttribute('src'); lockVideo.load(); } }, 800);
    }

    if (!bootScreen) return;

    if (PREFERS_REDUCED_MOTION) {
      // skip the video entirely, jump straight in
      bootScreen.style.display = 'none';
      setTimeout(() => textScramble(document.getElementById('hero-line1'), 'PAWAN', 800), 100);
      setTimeout(() => textScramble(document.getElementById('hero-line2'), 'RAI', 400), 400);
      return;
    }

    document.body.classList.add('lock-active');

    // Safety net: if the video can't load/play (blocked autoplay, slow network), unlock anyway after 6s
    const safetyTimer = setTimeout(unlock, 6000);

    if (lockVideo) {
      lockVideo.addEventListener('timeupdate', () => {
        if (!lockVideo.duration) return;
        const pct = Math.min(100, Math.round((lockVideo.currentTime / lockVideo.duration) * 100));
        if (barFill) barFill.style.width = pct + '%';
        if (pctEl) pctEl.textContent = pct + '%';
        const stage = Math.min(statusLines.length - 1, Math.floor((pct / 100) * statusLines.length));
        if (stage !== statusIdx && statusEl) { statusIdx = stage; statusEl.textContent = statusLines[stage]; }
      });
      lockVideo.addEventListener('ended', () => { clearTimeout(safetyTimer); unlock(); });
      lockVideo.addEventListener('error', () => { clearTimeout(safetyTimer); unlock(); });
      // Some mobile browsers block autoplay even when muted; catch and unlock via the safety timer if so
      lockVideo.play().catch(() => { /* safety timer will cover it */ });
    }
  });

  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function showToast(message, duration = 2200) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), duration);
  }

  /* ============================================================
     SCROLL PROGRESS BAR
  ============================================================ */
  let scrollTicking = false;
  function updateScrollProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    const bar = document.getElementById('scroll-progress');
    if (bar) bar.style.width = progress + '%';
    scrollTicking = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollTicking) {
      requestAnimationFrame(updateScrollProgress);
      scrollTicking = true;
    }
  }, { passive: true, capture: false });

  /* ============================================================
     DARK / LIGHT MODE TOGGLE
  ============================================================ */
  const themeToggle = document.getElementById('theme-toggle');
  let isDark = false;
  try {
    isDark = localStorage.getItem('pr-theme') === 'dark';
  } catch (e) { }

  function applyTheme(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    if (themeToggle) themeToggle.textContent = dark ? '☀️' : '🌙';
    const bgAnim = document.querySelector('.bg-anim');
    if (bgAnim) bgAnim.style.background = dark ? '#0d0d0d' : '#F4F0EA';
  }
  applyTheme(isDark);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      isDark = !isDark;
      applyTheme(isDark);
      try { localStorage.setItem('pr-theme', isDark ? 'dark' : 'light'); } catch (e) {}
      fireConfetti(themeToggle);
    });
  }



  /* ============================================================
     CONFETTI ENGINE
  ============================================================ */
  const confCanvas = document.getElementById('confetti-canvas');
  const confCtx = confCanvas ? confCanvas.getContext('2d') : null;
  const MAX_CONFETTI = PREFERS_REDUCED_MOTION ? 0 : (IS_MOBILE ? 150 : 400);
  const CONF_COLORS = ['#FF2D6B', '#1A4FFF', '#FFE500', '#00C853', '#ffffff', '#000000'];
  let confParticles = [];
  let confAnimRunning = false;
  let confAnimId = null;

  function resizeConfCanvas() {
    if (!confCanvas) return;
    confCanvas.width = window.innerWidth;
    confCanvas.height = window.innerHeight;
  }
  resizeConfCanvas();
  window.addEventListener('resize', debounce(resizeConfCanvas, 150));

  class ConfParticle {
    constructor(x, y) {
      this.x = x; this.y = y;
      this.vx = (Math.random() - 0.5) * 14;
      this.vy = Math.random() * -12 - 4;
      this.gravity = 0.45;
      this.color = CONF_COLORS[Math.floor(Math.random() * CONF_COLORS.length)];
      this.size = Math.random() * 10 + 4;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.3;
      this.life = 1;
      this.decay = Math.random() * 0.015 + 0.012;
      this.shape = Math.random() > 0.5 ? 'rect' : 'circle';
    }
    update() {
      this.x += this.vx; this.y += this.vy;
      this.vy += this.gravity; this.vx *= 0.98;
      this.rotation += this.rotSpeed; this.life -= this.decay;
    }
    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.life);
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.fillStyle = this.color;
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#000';
      if (this.shape === 'rect') {
        ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
        ctx.strokeRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
      } else { 
        ctx.beginPath(); ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    }
  }

  function fireConfetti(el) {
    if (!confCtx || MAX_CONFETTI === 0) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    if (confParticles.length > MAX_CONFETTI) confParticles = confParticles.slice(-Math.floor(MAX_CONFETTI * 0.7));
    const burst = IS_MOBILE ? 30 : 55;
    for (let i = 0; i < burst; i++) confParticles.push(new ConfParticle(cx, cy));
    if (!confAnimRunning) animateConf();
  }

  function animateConf() {
    confAnimRunning = true;
    confCtx.clearRect(0, 0, confCanvas.width, confCanvas.height);
    confParticles = confParticles.filter(p => p.life > 0);
    confParticles.forEach(p => { p.update(); p.draw(confCtx); });
    if (confParticles.length > 0) {
      confAnimId = requestAnimationFrame(animateConf);
    } else {
      confAnimRunning = false;
      confCtx.clearRect(0, 0, confCanvas.width, confCanvas.height);
    }
  }

  document.querySelectorAll('.confetti-btn').forEach(btn => {
    btn.addEventListener('click', () => fireConfetti(btn));
  });

  /* ============================================================
     CUSTOM CURSOR
  ============================================================ */
  const cursorDot = document.getElementById('cursor-dot');
  const cursorRing = document.getElementById('cursor-ring');
  let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
  let ringX = mouseX, ringY = mouseY;
  let cursorAnimId = null;

  if (IS_FINE_POINTER && !PREFERS_REDUCED_MOTION && cursorDot && cursorRing) {
    document.addEventListener('mousemove', e => {
      mouseX = e.clientX; mouseY = e.clientY;
      cursorDot.style.left = mouseX + 'px';
      cursorDot.style.top = mouseY + 'px';
    }, { passive: true });

    function animateCursorRing() {
      ringX += (mouseX - ringX) * 0.15;
      ringY += (mouseY - ringY) * 0.15;
      cursorRing.style.left = ringX + 'px';
      cursorRing.style.top = ringY + 'px';
      cursorAnimId = requestAnimationFrame(animateCursorRing);
    }
    animateCursorRing();

    const interactiveSelector = 'a, button, .btn, .skill-square, .project-card, .contact-link, .filter-btn, #theme-toggle, .copy-btn';
    document.addEventListener('mouseover', e => {
      if (e.target.closest(interactiveSelector)) cursorRing.classList.add('hover');
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest(interactiveSelector)) cursorRing.classList.remove('hover');
    });
    document.addEventListener('mousedown', () => cursorRing.classList.add('click'));
    document.addEventListener('mouseup', () => cursorRing.classList.remove('click'));
  } else {
    if (cursorDot) cursorDot.style.display = 'none';
    if (cursorRing) cursorRing.style.display = 'none';
  }

  /* ============================================================
     CYBERPUNK NEON CURSOR TRAIL (desktop only)
  ============================================================ */
  if (IS_FINE_POINTER && !PREFERS_REDUCED_MOTION) {
    const trailCanvas = document.createElement('canvas');
    trailCanvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9995;';
    trailCanvas.width = window.innerWidth;
    trailCanvas.height = window.innerHeight;
    document.body.appendChild(trailCanvas);
    const trailCtx = trailCanvas.getContext('2d');
    const trail = [];
    const TRAIL_LEN = 18;
    let trailX = mouseX, trailY = mouseY;

    window.addEventListener('resize', () => {
      trailCanvas.width = window.innerWidth;
      trailCanvas.height = window.innerHeight;
    }, { passive: true });

    function drawTrail() {
      requestAnimationFrame(drawTrail);
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (!dark) { trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height); return; }

      trail.push({ x: mouseX, y: mouseY });
      if (trail.length > TRAIL_LEN) trail.shift();

      trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
      for (let i = 1; i < trail.length; i++) {
        const alpha = (i / trail.length) * 0.35;
        const w = (i / trail.length) * 3;
        trailCtx.beginPath();
        trailCtx.moveTo(trail[i - 1].x, trail[i - 1].y);
        trailCtx.lineTo(trail[i].x, trail[i].y);
        trailCtx.strokeStyle = `rgba(0,245,255,${alpha})`;
        trailCtx.lineWidth = w;
        trailCtx.lineCap = 'round';
        trailCtx.shadowColor = '#00F5FF';
        trailCtx.shadowBlur = 8;
        trailCtx.stroke();
      }
    }
    drawTrail();
  }

  /* ============================================================
     CANVAS PARTICLE NETWORK
  ============================================================ */
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  let particles = [];
  let particleAnimRunning = false;
  let particleAnimId = null;
  let pageVisible = true;

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', debounce(resizeCanvas, 150));

  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width; this.y = Math.random() * canvas.height;
      this.vx = (Math.random() - 0.5) * 0.4; this.vy = (Math.random() - 0.5) * 0.4;
      this.size = Math.random() * 2 + 1;
      this.baseX = this.x; this.baseY = this.y;
    }
    update() {
      this.x += this.vx; this.y += this.vy;
      const dx = this.x - mouseX, dy = this.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) { const f = (120 - dist) / 120; this.x += dx * f * 0.02; this.y += dy * f * 0.02; }
      this.vx += (this.baseX - this.x) * 0.0003; this.vy += (this.baseY - this.y) * 0.0003;
      this.vx *= 0.99; this.vy *= 0.99;
      if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
      if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    }
    draw() {
      ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? 'rgba(244,240,234,0.15)' : 'rgba(10,10,10,0.15)';
      ctx.fill();
    }
  }

  const PARTICLE_COUNT = PREFERS_REDUCED_MOTION ? 0 : (IS_MOBILE ? 18 : Math.min(60, Math.floor(window.innerWidth / 25)));
  for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = isDark ? `rgba(244,240,234,${0.06 * (1 - dist / 150)})` : `rgba(10,10,10,${0.06 * (1 - dist / 150)})`;
          ctx.lineWidth = 1; ctx.stroke();
        }
      }
    }
  }

  function animateParticles() {
    if (!particleAnimRunning || !pageVisible) { particleAnimId = null; return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    drawConnections();
    particleAnimId = requestAnimationFrame(animateParticles);
  }

  if (PARTICLE_COUNT > 0 && ctx) {
    particleAnimRunning = true;
    animateParticles();
  }

  document.addEventListener('visibilitychange', () => {
    pageVisible = !document.hidden;
    if (pageVisible && particleAnimRunning && !particleAnimId) animateParticles();
  });

  window.addEventListener('pagehide', () => {
    particleAnimRunning = false;
    if (particleAnimId) cancelAnimationFrame(particleAnimId);
    if (cursorAnimId) cancelAnimationFrame(cursorAnimId);
    if (confAnimId) cancelAnimationFrame(confAnimId);
  });

  /* ============================================================
     TEXT DECODE (hero name)
  ============================================================ */
  function textScramble(element, finalText, duration = 1200) {
    if (!element) return;
    if (PREFERS_REDUCED_MOTION) { element.textContent = finalText; return; }
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&';
    let step = 0; const steps = 12; const interval = duration / steps;
    const timer = setInterval(() => {
      let display = ''; const progress = step / steps;
      for (let i = 0; i < finalText.length; i++) {
        if (i < Math.floor(progress * finalText.length)) display += finalText[i];
        else if (finalText[i] === ' ') display += ' ';
        else display += chars[Math.floor(Math.random() * chars.length)];
      }
      element.textContent = display; step++;
      if (step > steps) { clearInterval(timer); element.textContent = finalText; }
    }, interval);
  }
  
  /* ============================================================
     STAT COUNTER
  ============================================================ */
  function animateCounters() {
    document.querySelectorAll('.stat-num').forEach(counter => {
      const target = parseInt(counter.dataset.target, 10) || 0;
      if (PREFERS_REDUCED_MOTION) { counter.textContent = target; return; }
      const duration = 1500; const start = performance.now();
      function update(now) {
        const elapsed = now - start; const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        counter.textContent = Math.floor(eased * target);
        if (progress < 1) requestAnimationFrame(update);
      }
      requestAnimationFrame(update);
    });
  }
  const statsObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { animateCounters(); statsObserver.unobserve(entry.target); }
    });
  }, { threshold: 0.5 });
  const statRow = document.querySelector('.stat-row');
  if (statRow) statsObserver.observe(statRow);

  /* ============================================================
     PROJECT FILTER
  ============================================================ */
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true');
      const filter = btn.dataset.filter;
      document.querySelectorAll('.project-card').forEach(card => {
        const cats = card.dataset.category || '';
        const show = filter === 'all' || cats.includes(filter);
        card.classList.toggle('hidden', !show);
        card.style.display = show ? '' : 'none';
      });
      fireConfetti(btn);
    });
  });

  /* ============================================================
     SCROLL REVEALS
  ============================================================ */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), (i % 4) * 100);
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal, .reveal-left, .reveal-scale').forEach(el => revealObserver.observe(el));

  /* ============================================================
     SMOOTH NAV
  ============================================================ */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      if (href.length <= 1) return;
      const target = document.querySelector(href);
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: PREFERS_REDUCED_MOTION ? 'auto' : 'smooth' }); }
    });
  });

  /* ============================================================
     COPY TO CLIPBOARD (email)
  ============================================================ */
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault(); e.stopPropagation();
      const text = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
        showToast('✓ Email copied to clipboard');
      } catch (err) {
        showToast('Could not copy — please copy manually');
      }
    });
  });

  /* ============================================================
     CONTACT FORM (WITH DELAYED MELTDOWN ANIMATION)
  ============================================================ */
  const formName = document.getElementById('form-name');
  const formEmail = document.getElementById('form-email');
  const formMsg = document.getElementById('form-msg');
  const formSubmit = document.getElementById('form-submit');

  function validateField(input, errorEl, validatorFn) {
    const valid = validatorFn(input.value.trim());
    input.classList.toggle('error', !valid);
    if (errorEl) errorEl.classList.toggle('show', !valid);
    return valid;
  }

  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  if (formSubmit) {
    formSubmit.addEventListener('click', () => {
      const nameValid = validateField(formName, document.getElementById('form-name-error'), v => v.length > 0);
      const emailValid = validateField(formEmail, document.getElementById('form-email-error'), isValidEmail);
      const msgValid = validateField(formMsg, document.getElementById('form-msg-error'), v => v.length > 0);

      if (!nameValid || !emailValid || !msgValid) {
        showToast('Please fix the highlighted fields');
        return;
      }

      const name = formName.value.trim();
      const email = formEmail.value.trim();
      const msg = formMsg.value.trim();
      const subject = encodeURIComponent(`Portfolio Contact from ${name}`);
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${msg}`);
      const mailtoLink = `mailto:Pawanrai210804@gmail.com?subject=${subject}&body=${body}`;

      // 1. TRIGGER THE MELTDOWN EFFECT FIRST
      document.body.classList.add('meltdown-active');
      document.getElementById('main-content').classList.add('melting');
      document.querySelector('.ticker-wrap').classList.add('melting');
      document.querySelector('footer').classList.add('melting');
      document.getElementById('thank-you-overlay').classList.add('active');

      fireConfetti(formSubmit);

      // Clean up fields silently in the background
      formName.value = ''; formEmail.value = ''; formMsg.value = '';
      [formName, formEmail, formMsg].forEach(f => f.classList.remove('error'));

      // 2. FIRE EMAIL CLIENT ONLY AFTER THE MELT HAS REACHED ITS PEAK (2.5 SECONDS)
      setTimeout(() => {
        window.location.href = mailtoLink;
      }, 2500);

      // 3. REVERT THE MELTDOWN AFTER 7 SECONDS
      setTimeout(() => {
        document.body.classList.remove('meltdown-active');
        document.getElementById('main-content').classList.remove('melting');
        document.querySelector('.ticker-wrap').classList.remove('melting');
        document.querySelector('footer').classList.remove('melting');
        document.getElementById('thank-you-overlay').classList.remove('active');
      }, 7000);
    });
  }

})();

/* ============================================================
   NOISE FLASH ON THEME TOGGLE
============================================================ */
(function(){
  const noiseFlash = document.getElementById('noise-flash');
  const themeToggle = document.getElementById('theme-toggle');
  if (!noiseFlash || !themeToggle) return;
  const origClick = themeToggle.onclick;
  themeToggle.addEventListener('click', () => {
    noiseFlash.classList.remove('flash');
    void noiseFlash.offsetWidth; // reflow
    noiseFlash.classList.add('flash');
    setTimeout(() => noiseFlash.classList.remove('flash'), 400);
  });
})();

/* ============================================================
   MAGNETIC BUTTONS
============================================================ */
(function(){
  if (window.matchMedia('(pointer: coarse)').matches) return;
  const PREFERS_REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (PREFERS_REDUCED) return;
  document.querySelectorAll('.btn').forEach(btn => {
    const wrap = document.createElement('span');
    wrap.className = 'magnetic';
    btn.parentNode.insertBefore(wrap, btn);
    wrap.appendChild(btn);
    const STRENGTH = 0.35;
    wrap.addEventListener('mousemove', e => {
      const rect = wrap.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) * STRENGTH;
      const dy = (e.clientY - cy) * STRENGTH;
      wrap.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    wrap.addEventListener('mouseleave', () => {
      wrap.style.transform = 'translate(0,0)';
    });
  });
})();

/* ============================================================
   3D TILT on HERO CARD
============================================================ */
(function(){
  const card = document.querySelector('.hero-card');
  if (!card) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;
  const PREFERS_REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (PREFERS_REDUCED) return;
  const heroRight = document.querySelector('.hero-right');
  if (!heroRight) return;
  heroRight.addEventListener('mousemove', e => {
    const rect = heroRight.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `rotate(${-y * 14}deg) rotateY(${x * 14}deg) scale(1.04)`;
    card.style.transition = 'transform 0.08s linear';
  });
  heroRight.addEventListener('mouseleave', () => {
    card.style.transform = '';
    card.style.transition = 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)';
  });
})();

/* ============================================================
   TEXT SCRAMBLE ON SECTION TITLES (scroll-triggered)
============================================================ */
(function(){
  const PREFERS_REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (PREFERS_REDUCED) return;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ01!@#%&?';
  function scramble(el, finalText, duration) {
    const steps = 14; const interval = duration / steps; let step = 0;
    const timer = setInterval(() => {
      let out = ''; const prog = step / steps;
      for (let i = 0; i < finalText.length; i++) {
        if (finalText[i] === ' ') out += ' ';
        else if (i < Math.floor(prog * finalText.length)) out += finalText[i];
        else out += chars[Math.floor(Math.random() * chars.length)];
      }
      el.textContent = out; step++;
      if (step > steps) { clearInterval(timer); el.textContent = finalText; }
    }, interval);
  }

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const finalText = el.dataset.final || el.textContent.trim();
      el.dataset.final = finalText;
      scramble(el, finalText, 900);
      obs.unobserve(el);
    });
  }, { threshold: 0.2 });

  document.querySelectorAll('.section-title').forEach(el => {
    el.dataset.final = el.textContent.trim();
    el.classList.add('scramble-title');
    obs.observe(el);
  });
})();

/* ============================================================
   STAGGERED SKILL SQUARE REVEAL
============================================================ */
(function(){
  const squares = document.querySelectorAll('.skill-square');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      squares.forEach((sq, i) => {
        setTimeout(() => sq.classList.add('visible'), i * 80);
        sq.style.opacity = '0';
        sq.style.transform = 'scale(0.8) translateY(24px)';
        sq.style.transition = `opacity 0.5s cubic-bezier(0.34,1.56,0.64,1) ${i*80}ms, transform 0.5s cubic-bezier(0.34,1.56,0.64,1) ${i*80}ms`;
        setTimeout(() => {
          sq.style.opacity = '1';
          sq.style.transform = '';
        }, i * 80 + 50);
      });
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.1 });
  const skillsSection = document.getElementById('skills');
  if (skillsSection) obs.observe(skillsSection);
})();

/* ============================================================
   SKILL VU-METER LED TRACKS (retro stereo level-meter build + sweep)
============================================================ */
(function(){
  const tracks = document.querySelectorAll('.skill-meter-led-track');
  if (!tracks.length) return;
  const LED_COUNT_DESKTOP = 20, LED_COUNT_MOBILE = 14;
  const isMobile = window.matchMedia('(max-width: 480px)').matches;
  const ledCount = isMobile ? LED_COUNT_MOBILE : LED_COUNT_DESKTOP;

  tracks.forEach(track => {
    const level = Math.max(0, Math.min(100, parseInt(track.dataset.level, 10) || 0));
    const litCount = Math.round((level / 100) * ledCount);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < ledCount; i++) {
      const led = document.createElement('span');
      if (i < litCount) {
        led.classList.add('lit-pending');
        // last 2 lit LEDs read as the "peak" hot zone, like a VU meter redlining
        if (i >= litCount - 2) led.dataset.peak = '1';
      }
      frag.appendChild(led);
    }
    track.appendChild(frag);
  });

  const meterObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const rows = entry.target.querySelectorAll('.skill-meter-led-track');
      rows.forEach((track, rowIdx) => {
        const leds = track.querySelectorAll('span.lit-pending');
        leds.forEach((led, i) => {
          setTimeout(() => {
            led.classList.remove('lit-pending');
            led.classList.add('lit');
            if (led.dataset.peak) led.classList.add('peak');
          }, rowIdx * 120 + i * 22);
        });
      });
      meterObs.unobserve(entry.target);
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.skill-square').forEach(sq => meterObs.observe(sq));
})();

/* ============================================================
   AVAILABILITY STICKY BANNER
============================================================ */
(function(){
  const banner = document.getElementById('avail-banner');
  const closeBtn = document.getElementById('avail-banner-close');
  if (!banner) return;
  let dismissed = false;
  try { dismissed = localStorage.getItem('pr-avail-dismissed') === '1'; } catch(e){}
  if (dismissed) return;
  // Show after 3 seconds
  setTimeout(() => banner.classList.add('visible'), 3000);
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      banner.classList.remove('visible');
      try { localStorage.setItem('pr-avail-dismissed', '1'); } catch(e) {}
    });
  }
})();

/* ============================================================
   EASTER EGG PANEL (terminal 'secret' command)
============================================================ */
window._showEasterEgg = function() {
  const panel = document.getElementById('easter-panel');
  if (!panel) return;
  panel.classList.add('active');
  panel.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
};
(function(){
  const panel = document.getElementById('easter-panel');
  const closeBtn = document.getElementById('easter-close');
  if (!panel || !closeBtn) return;
  closeBtn.addEventListener('click', () => {
    panel.classList.remove('active');
    panel.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && panel.classList.contains('active')) {
      panel.classList.remove('active');
      panel.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  });
})();

/* ============================================================
   TERMINAL EASTER EGG (WITH NEW MUSIC COMMAND)
============================================================ */
(function(){
  const input = document.getElementById('term-input');
  const output = document.getElementById('term-output');
  const body = document.getElementById('term-body');
  if(!input) return;

  const commands = {
    help: () => `Available commands:
  <span style="color:var(--pink)">whoami</span>    — About me
  <span style="color:var(--pink)">skills</span>    — Tech stack
  <span style="color:var(--pink)">experience</span>— Work history
  <span style="color:var(--pink)">projects</span>  — Featured projects
  <span style="color:var(--pink)">music</span>     — See what's playing
  <span style="color:var(--pink)">contact</span>   — Get in touch
  <span style="color:var(--pink)">resume</span>    — Download CV
  <span style="color:var(--pink)">clear</span>     — Clear terminal
  <span style="color:var(--pink)">neofetch</span>  — System info`,

    whoami: () => `<span style="color:var(--green)">Pawan Rai</span>
  B.Tech CSE student at DSMNRU, Lucknow
  AI/ML Engineer · Full-Stack Developer · AI Agent Builder
  4 internships · 15 certifications · 1 publication
  Based in Delhi, India`,

    skills: () => `<span style="color:var(--blue)">Frontend:</span>  React/Next.js, HTML/CSS/JS, GSAP, Tailwind
<span style="color:var(--blue)">Backend:</span>   Node.js, Express, Python, FastAPI
<span style="color:var(--blue)">Database:</span>  MongoDB, PostgreSQL
<span style="color:var(--blue)">AI/ML:</span>     PyTorch, Scikit-learn, LLMs, AI Agents
<span style="color:var(--blue)">Tools:</span>     Git, Termux, Linux, Docker`,

    experience: () => `<span style="color:var(--yellow)">Jul 2025</span>          Data Science Intern @ SkillCraft Technology
<span style="color:var(--yellow)">Jun–Jul 2025</span>       AI / ML Intern @ Edunet Foundation – AICTE
<span style="color:var(--yellow)">Jun–Jul 2025</span>       Web Developer Intern @ Intern Pro`,

    projects: () => `<span style="color:var(--green)">Employee Salary Prediction</span> — ML pipeline 72% → 85%+ accuracy
<span style="color:var(--green)">YouTube Data Dashboard</span>     — Auto-update pipeline + Power BI
<span style="color:var(--green)">PawanPutra Travel</span>          — Live business site w/ Razorpay
<span style="color:var(--green)">Portfolio</span>                  — This site`,

    music: () => `<span style="color:var(--pink)">[♫] CURRENTLY ON LOOP:</span>
- Guldasta (Seedhe Maut)
- Namastute (Seedhe Maut)
- Choliya Ke Hook Raja Ji

<span style="color:var(--muted)">"Indian Hip-Hop & Regional Anthems"</span>`,

    contact: () => `Email:    <a href="mailto:Pawanrai210804@gmail.com" style="color:var(--green);text-decoration:underline">Pawanrai210804@gmail.com</a>
GitHub:   <a href="https://github.com/Pawan210804" target="_blank" rel="noopener" style="color:var(--green);text-decoration:underline">github.com/Pawan210804</a>
LinkedIn: <a href="https://www.linkedin.com/in/pawan-rai-idgf/" target="_blank" rel="noopener" style="color:var(--green);text-decoration:underline">linkedin.com/in/pawan-rai</a>
Location: Delhi, India
Response: Within 24 hours`,

    resume: () => `<span style="color:var(--green)">Opening resume...</span>
<a href="https://pawan-rai.vercel.app/resume.pdf" target="_blank" rel="noopener nofollow" style="color:var(--green);text-decoration:underline">Click here if it didn't open</a>`,

    neofetch: () => `<span style="color:var(--blue)">OS:</span>       PawanOS 4.0
<span style="color:var(--blue)">Kernel:</span>   B.Tech CSE
<span style="color:var(--blue)">Uptime:</span>   4+ years coding
<span style="color:var(--blue)">Shell:</span>    zsh / Termux
<span style="color:var(--blue)">WM:</span>       React + GSAP
<span style="color:var(--blue)">Theme:</span>    Neo-Brutalist [${document.documentElement.getAttribute('data-theme')==='dark'?'Dark':'Light'}]
<span style="color:var(--blue)">CPU:</span>      Curiosity @ 100%
<span style="color:var(--blue)">GPU:</span>      Creativity RTX`,

    clear: () => { output.innerHTML = ''; return ''; }
  };

  function escapeHTML(str){
    return str
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  input.addEventListener('keydown', e => {
    if(e.key !== 'Enter') return;
    const cmd = input.value.trim().toLowerCase();
    if(!cmd) return;

    const line = document.createElement('div');
    line.style.display = 'flex'; line.style.gap = '.5rem'; line.style.flexWrap = 'wrap';
    line.innerHTML = `<span style="color:var(--green);white-space:nowrap">pawan@portfolio:~$</span> <span style="color:#e4e4e7">${escapeHTML(cmd)}</span>`;
    output.appendChild(line);

    if(commands[cmd]){
      const res = commands[cmd]();
      if(res){
        const out = document.createElement('div');
        out.style.marginBottom = '.8rem'; out.style.whiteSpace = 'pre-wrap'; out.style.color = '#FFF';
        out.innerHTML = res; 
        output.appendChild(out);
      }
    } else {
      const err = document.createElement('div');
      err.style.marginBottom = '.8rem'; err.style.color = '#FFF';
      err.innerHTML = `<span style="color:var(--pink)">${escapeHTML(cmd)}</span>: command not found. Type <span style="color:var(--pink)">help</span> for available commands.`;
      output.appendChild(err);
    }

    input.value = '';
    body.scrollTop = body.scrollHeight;
  });

  const termSection = document.getElementById('terminal');
  if(termSection) termSection.addEventListener('click', () => input.focus());
})();

/* ============================================================
   PROJECT CAROUSEL - DRAG & SWIPE GESTURES WITH GSAP & INERTIA
 ============================================================ */
(function(){
  const grid = document.querySelector('.projects-grid');
  const dotsWrap = document.getElementById('project-dots');
  if(!grid || !dotsWrap) return;

  function getVisibleCards(){
    return Array.from(grid.querySelectorAll('.project-card')).filter(c => c.style.display !== 'none' && !c.classList.contains('hidden'));
  }

  let isPointerDown = false;
  let isDragging = false;
  let startX = 0;
  let startScrollLeft = 0;
  let lastX = 0;
  let lastTime = 0;
  let velocity = 0;
  let currentActiveIndex = 0;

  function buildDots(){
    dotsWrap.innerHTML = '';
    const cards = getVisibleCards();
    cards.forEach((card, i) => {
      const dot = document.createElement('button');
      dot.className = 'project-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', 'Go to project ' + (i + 1));
      dot.addEventListener('click', () => {
        scrollToCard(i);
      });
      dotsWrap.appendChild(dot);
    });
    syncActiveDot();
  }

  function getCardX(index) {
    const cards = getVisibleCards();
    if (!cards.length || index < 0 || index >= cards.length) return 0;
    const card = cards[index];
    const gridRect = grid.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const targetScroll = grid.scrollLeft + (cardRect.left - gridRect.left) - (gridRect.width - cardRect.width) / 2;
    return Math.max(0, Math.min(grid.scrollWidth - grid.clientWidth, targetScroll));
  }

  function scrollToCard(index, duration = 0.6) {
    const cards = getVisibleCards();
    if (!cards.length) return;
    index = Math.max(0, Math.min(cards.length - 1, index));
    currentActiveIndex = index;
    const targetScroll = getCardX(index);

    grid.style.scrollSnapType = 'none';

    gsap.killTweensOf(grid);
    gsap.to(grid, {
      scrollLeft: targetScroll,
      duration: duration,
      ease: "power2.out",
      onUpdate: syncActiveDot,
      onComplete: () => {
        grid.style.scrollSnapType = 'x mandatory';
      }
    });

    cards.forEach((card, idx) => {
      gsap.to(card, {
        scale: idx === index ? 1 : 0.94,
        rotationY: idx === index ? 0 : (idx < index ? 8 : -8),
        duration: duration,
        ease: "power2.out"
      });
    });
  }

  function syncActiveDot(){
    const cards = getVisibleCards();
    if(!cards.length) return;
    const gridRect = grid.getBoundingClientRect();
    const center = gridRect.left + gridRect.width / 2;
    let closest = 0, closestDist = Infinity;
    cards.forEach((card, i) => {
      const r = card.getBoundingClientRect();
      const dist = Math.abs((r.left + r.width / 2) - center);
      if(dist < closestDist){ closestDist = dist; closest = i; }
    });
    currentActiveIndex = closest;
    const dots = dotsWrap.querySelectorAll('.project-dot');
    dots.forEach((d, i) => {
      d.classList.toggle('active', i === closest);
      if (i === closest) {
        gsap.to(d, { width: 28, borderRadius: 6, background: 'var(--pink)', duration: 0.3, ease: 'power2.out' });
      } else {
        gsap.to(d, { width: 12, borderRadius: '50%', background: 'transparent', duration: 0.3, ease: 'power2.out' });
      }
    });
  }

  grid.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    isPointerDown = true;
    isDragging = false;
    startX = e.clientX;
    startScrollLeft = grid.scrollLeft;
    lastX = e.clientX;
    lastTime = Date.now();
    velocity = 0;

    gsap.killTweensOf(grid);
    grid.style.scrollSnapType = 'none';
  });

  grid.addEventListener('pointermove', (e) => {
    if (!isPointerDown) return;
    const dx = e.clientX - startX;
    
    if (!isDragging && Math.abs(dx) > 10) {
      isDragging = true;
      grid.classList.add('dragging');
      grid.style.cursor = 'grabbing';
    }

    if (isDragging) {
      e.preventDefault();
      
      let targetScroll = startScrollLeft - dx;
      const maxScroll = grid.scrollWidth - grid.clientWidth;
      if (targetScroll < 0) {
        targetScroll = targetScroll * 0.3;
      } else if (targetScroll > maxScroll) {
        targetScroll = maxScroll + (targetScroll - maxScroll) * 0.3;
      }

      grid.scrollLeft = targetScroll;

      const now = Date.now();
      const dt = now - lastTime;
      if (dt > 10) {
        velocity = (e.clientX - lastX) / dt;
        lastX = e.clientX;
        lastTime = now;
      }

      const cards = getVisibleCards();
      const dragFactor = Math.min(1.5, Math.max(-1.5, velocity * 4));
      cards.forEach(card => {
        gsap.to(card, {
          scale: 0.96,
          rotationY: dragFactor * -12,
          duration: 0.2,
          overwrite: "auto"
        });
      });
    }
  });

  grid.addEventListener('pointerup', (e) => {
    if (!isPointerDown) return;
    isPointerDown = false;
    grid.style.cursor = '';
    
    if (isDragging) {
      isDragging = false;
      grid.classList.remove('dragging');

      const cards = getVisibleCards();
      let targetIndex = currentActiveIndex;

      if (Math.abs(velocity) > 0.3) {
        if (velocity < 0) {
          targetIndex = Math.min(cards.length - 1, currentActiveIndex + 1);
        } else {
          targetIndex = Math.max(0, currentActiveIndex - 1);
        }
      } else {
        const gridRect = grid.getBoundingClientRect();
        const center = gridRect.left + gridRect.width / 2;
        let closest = 0, closestDist = Infinity;
        cards.forEach((card, i) => {
          const r = card.getBoundingClientRect();
          const dist = Math.abs((r.left + r.width / 2) - center);
          if(dist < closestDist){ closestDist = dist; closest = i; }
        });
        targetIndex = closest;
      }

      scrollToCard(targetIndex, 0.5);
    } else {
      grid.style.scrollSnapType = 'x mandatory';
    }
  });

  grid.addEventListener('pointerleave', () => {
    if (isPointerDown) {
      isPointerDown = false;
      isDragging = false;
      grid.classList.remove('dragging');
      grid.style.cursor = '';
      scrollToCard(currentActiveIndex, 0.5);
    }
  });

  let scrollTimeout;
  grid.addEventListener('scroll', () => {
    if (isDragging) return;
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(syncActiveDot, 80);
  }, { passive: true });

  window.addEventListener('resize', buildDots, { passive: true });

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setTimeout(() => {
        grid.scrollLeft = 0;
        buildDots();
        scrollToCard(0, 0.4);
      }, 50);
    });
  });

  buildDots();
})();
/* ============================================================
   THREE.JS RETRO SYNTHWAVE + CYBERPUNK SCENE (hero-right background)
============================================================ */
(function(){
  const canvas = document.getElementById('retro-canvas');
  if(!canvas || typeof THREE === 'undefined') return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const heroRight = document.querySelector('.hero-right');
  if(!heroRight) return;

  const IS_LOW_POWER = window.matchMedia('(max-width: 768px)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !IS_LOW_POWER });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, IS_LOW_POWER ? 1 : 2));

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000011, IS_LOW_POWER ? 0.055 : 0.04);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 120);
  camera.position.set(0, 1.8, 5.0);
  camera.lookAt(0, 0.6, 0);

  // ── Retro grid floor (two-tone cyberpunk) ──
  const gridColor1 = new THREE.Color('#FF2D6B');
  const grid = new THREE.GridHelper(30, 38, gridColor1, gridColor1);
  grid.position.y = -0.7;
  grid.material.transparent = true;
  grid.material.opacity = 0.5;
  scene.add(grid);

  // Second grid layer — cyan for cyberpunk depth
  const gridColor2 = new THREE.Color('#00F5FF');
  const grid2 = new THREE.GridHelper(30, 19, gridColor2, gridColor2);
  grid2.position.y = -0.68;
  grid2.material.transparent = true;
  grid2.material.opacity = IS_LOW_POWER ? 0 : 0.12;
  scene.add(grid2);

  // ── Glowing retro sun with cyberpunk ring colours ──
  const sunGroup = new THREE.Group();
  const ringData = [
    { inner: 0.88, outer: 0.99, color: '#FFE500', opacity: 0.9 },
    { inner: 0.72, outer: 0.84, color: '#FF2D6B', opacity: 0.85 },
    { inner: 0.56, outer: 0.68, color: '#FF2D6B', opacity: 0.8 },
    { inner: 0.40, outer: 0.52, color: '#1A4FFF', opacity: 0.8 },
    { inner: 0.24, outer: 0.36, color: '#00F5FF', opacity: 0.75 },
    { inner: 0.00, outer: 0.20, color: '#FF00FF', opacity: 0.6 },
  ];
  ringData.forEach(r => {
    const geo = new THREE.RingGeometry(r.inner, r.outer, IS_LOW_POWER ? 32 : 56);
    const mat = new THREE.MeshBasicMaterial({ color: r.color, transparent: true, opacity: r.opacity, side: THREE.DoubleSide });
    sunGroup.add(new THREE.Mesh(geo, mat));
  });
  sunGroup.position.set(0, 1.1, -4);
  // Clip lower half (retro sun over horizon) using a large black disc
  const sunClip = new THREE.Mesh(
    new THREE.CircleGeometry(1.2, 48),
    new THREE.MeshBasicMaterial({ color: 0x000011, transparent: false })
  );
  sunClip.position.set(0, -0.5, 0.01);
  sunGroup.add(sunClip);
  scene.add(sunGroup);

  // ── NEW: Live neural network — nodes, synapses, and looping data pulses ──
  // Layered like a real network (input → hidden → hidden → output), which
  // fits the AI/ML theme far better than generic floating primitives.
  const netGroup = new THREE.Group();
  netGroup.position.set(0.1, 1.0, -0.4);
  scene.add(netGroup);

  const LAYER_COLORS = ['#00F5FF', '#1A4FFF', '#FF2D6B', '#FFE500'];
  const layerSizes = IS_LOW_POWER ? [3, 4, 2] : [4, 6, 6, 3];
  const layerSpacingX = 1.15;
  const totalWidth = (layerSizes.length - 1) * layerSpacingX;

  const nodes = [];      // flat list of { mesh, layer, basePos, phase }
  const nodesByLayer = [];
  const nodeGeo = new THREE.IcosahedronGeometry(0.045, 1);
  const glowGeo = new THREE.IcosahedronGeometry(0.09, 1);

  layerSizes.forEach((count, li) => {
    const layerNodes = [];
    const x = -totalWidth / 2 + li * layerSpacingX;
    const color = LAYER_COLORS[li % LAYER_COLORS.length];
    for (let i = 0; i < count; i++) {
      const y = (i - (count - 1) / 2) * 0.42;
      const z = (Math.random() - 0.5) * 0.35;
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
      const node = new THREE.Mesh(nodeGeo, mat);
      node.position.set(x, y, z);
      netGroup.add(node);

      // Soft glow shell around each node (cheap fake-bloom via additive blend)
      const glowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      node.add(glow);

      const entry = { mesh: node, layer: li, basePos: node.position.clone(), phase: Math.random() * Math.PI * 2 };
      nodes.push(entry);
      layerNodes.push(entry);
    }
    nodesByLayer.push(layerNodes);
  });

  // Synapses: connect each node to a limited set in the next layer (denser on desktop)
  const maxLinksPerNode = IS_LOW_POWER ? 2 : 3;
  const edges = []; // { a, b }
  const linePositions = [];
  for (let li = 0; li < nodesByLayer.length - 1; li++) {
    const from = nodesByLayer[li];
    const to = nodesByLayer[li + 1];
    from.forEach(a => {
      const shuffled = [...to].sort(() => Math.random() - 0.5).slice(0, Math.min(maxLinksPerNode, to.length));
      shuffled.forEach(b => {
        edges.push({ a, b });
        linePositions.push(a.basePos.x, a.basePos.y, a.basePos.z, b.basePos.x, b.basePos.y, b.basePos.z);
      });
    });
  }

  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  const lineMat = new THREE.LineBasicMaterial({ color: '#1A4FFF', transparent: true, opacity: 0.28 });
  const synapseLines = new THREE.LineSegments(lineGeo, lineMat);
  netGroup.add(synapseLines);

  // Traveling "data pulses" — small bright spheres that flow along random
  // edges from input toward output, respawning endlessly (the network keeps firing).
  const PULSE_COUNT = IS_LOW_POWER ? 4 : 9;
  const pulseGeo = new THREE.IcosahedronGeometry(0.03, 1);
  const pulses = [];
  function spawnPulse(p) {
    p.edge = edges[Math.floor(Math.random() * edges.length)];
    p.t = 0;
    p.speed = 0.55 + Math.random() * 0.5;
    p.mesh.material.color.copy(p.edge.a.mesh.material.color);
  }
  for (let i = 0; i < PULSE_COUNT; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: '#FFE500', transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    const mesh = new THREE.Mesh(pulseGeo, mat);
    netGroup.add(mesh);
    const p = { mesh, edge: null, t: 0, speed: 0.6 };
    spawnPulse(p);
    p.t = Math.random(); // desync starting points so pulses don't all fire in sync
    pulses.push(p);
  }

  // Gentle mouse parallax on the whole network group
  let targetRotX = 0, targetRotY = 0;
  heroRight.addEventListener('mousemove', (e) => {
    const rect = heroRight.getBoundingClientRect();
    targetRotY = ((e.clientX - rect.left) / rect.width - 0.5) * 0.35;
    targetRotX = ((e.clientY - rect.top) / rect.height - 0.5) * -0.25;
  });

  function resize(){
    const w = heroRight.clientWidth || 1;
    const h = heroRight.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(heroRight);

  let raf;
  let visible = true;
  const io = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible && !raf) animate();
  }, { threshold: 0.02 });
  io.observe(heroRight);

  const clock = new THREE.Clock();
  function animate(){
    if(!visible) { raf = null; return; }
    raf = requestAnimationFrame(animate);
    // NOTE: getDelta() also advances clock.elapsedTime internally, so read
    // elapsedTime *after* getDelta() rather than calling getElapsedTime()
    // separately (that would consume the delta twice and stall the clock).
    const dt = Math.min(clock.getDelta(), 0.1); // clamp to avoid huge jumps on tab refocus
    const t = clock.elapsedTime;

    // Scroll grid — z-wrap for infinite road feel
    const step = 30 / 38;
    grid.position.z = (t * 0.7) % step;
    grid2.position.z = grid.position.z;

    sunGroup.rotation.z = t * 0.04;
    sunGroup.position.y = 1.1 + Math.sin(t * 0.45) * 0.09;

    // Neural network: gentle node bob + slow group rotation + mouse parallax
    netGroup.rotation.y += (targetRotY - netGroup.rotation.y) * 0.04;
    netGroup.rotation.x += (targetRotX - netGroup.rotation.x) * 0.04;
    netGroup.rotation.y += Math.sin(t * 0.12) * 0.0006; // slow idle drift

    nodes.forEach(n => {
      n.mesh.position.y = n.basePos.y + Math.sin(t * 0.6 + n.phase) * 0.035;
      n.mesh.position.z = n.basePos.z + Math.cos(t * 0.5 + n.phase) * 0.035;
      const pulse = 0.85 + Math.sin(t * 2 + n.phase) * 0.15;
      n.mesh.scale.setScalar(pulse);
    });

    // Data pulses travel A → B, then respawn on a new random edge — an
    // endless "signal keeps firing" loop, which is the whole point of a net.
    pulses.forEach(p => {
      p.t += dt * p.speed;
      if (p.t >= 1) { spawnPulse(p); }
      const a = p.edge.a.mesh.position, b = p.edge.b.mesh.position;
      p.mesh.position.lerpVectors(a, b, p.t);
      p.mesh.material.opacity = 0.5 + Math.sin(p.t * Math.PI) * 0.5; // fade in/out along the path
    });

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('pagehide', () => {
    raf = null;
    renderer.dispose();
    resizeObserver.disconnect();
  });
})();

/* ============================================================
   MINI 3D BADGE — small spinning wireframe next to section titles
============================================================ */
(function(){
  if(typeof THREE === 'undefined') return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function mountMiniBadge(canvasId, color){
    const canvas = document.getElementById(canvasId);
    if(!canvas) return;
    const size = canvas.clientWidth || 64;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(size, size, false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10);
    camera.position.z = 3.2;

    const geo = new THREE.TorusKnotGeometry(0.55, 0.18, 80, 10);
    const mat = new THREE.MeshBasicMaterial({ color, wireframe: true });
    const knot = new THREE.Mesh(geo, mat);
    scene.add(knot);

    let visible = true;
    const io = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }, { threshold: 0.05 });
    io.observe(canvas);

    function loop(){
      requestAnimationFrame(loop);
      if(!visible) return;
      knot.rotation.x += 0.012;
      knot.rotation.y += 0.018;
      renderer.render(scene, camera);
    }
    loop();

    window.addEventListener('resize', () => {
      const s = canvas.clientWidth || 64;
      renderer.setSize(s, s, false);
    });
  }

  mountMiniBadge('mini-badge-skills', '#FF2D6B');
})();


/* ============================================================
   GSAP BOUNCE / ELASTIC ANIMATIONS (neo-brutalist pop-in)
============================================================ */
(function(){
  if(typeof gsap === 'undefined') return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduceMotion) return;
  if(gsap.registerPlugin && typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);

  // Hero card: drops in with a heavy elastic bounce on load
  const heroCard = document.getElementById('hero-card');
  if(heroCard){
    gsap.fromTo(heroCard,
      { y: -120, opacity: 0, rotate: -4 },
      { y: 0, opacity: 1, rotate: -4, duration: 1.1, ease: 'bounce.out', delay: 0.4 }
    );
  }

  // Stat chips: staggered punch-bounce once hero card lands
  gsap.utils.toArray('.stat').forEach((el, i) => {
    gsap.fromTo(el,
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)', delay: 1.3 + i * 0.12 }
    );
  });

  if(typeof ScrollTrigger !== 'undefined'){
    // Skill squares: bounce up into place, staggered
    gsap.utils.toArray('.skill-square').forEach((el, i) => {
      gsap.fromTo(el,
        { y: 80, opacity: 0, scale: 0.85 },
        {
          y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(2.2)',
          delay: i * 0.08,
          scrollTrigger: { trigger: el, start: 'top 88%' }
        }
      );
    });

    // Project cards: scale-bounce entrance, staggered by column
    gsap.utils.toArray('.project-card').forEach((el, i) => {
      gsap.fromTo(el,
        { y: 60, opacity: 0, scale: 0.9, rotate: -2 },
        {
          y: 0, opacity: 1, scale: 1, rotate: 0, duration: 0.7, ease: 'back.out(2.4)',
          delay: (i % 2) * 0.1,
          scrollTrigger: { trigger: el, start: 'top 90%' }
        }
      );
    });

    // Section titles: snap in with overshoot
    gsap.utils.toArray('.section-title').forEach((el) => {
      gsap.fromTo(el,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: 'back.out(1.8)', scrollTrigger: { trigger: el, start: 'top 90%' } }
      );
    });

    // Edu / testimonial / research cards: pop in
    gsap.utils.toArray('.edu-card, .testimonial-card, .research-card').forEach((el, i) => {
      gsap.fromTo(el,
        { scale: 0.8, opacity: 0, y: 40 },
        { scale: 1, opacity: 1, y: 0, duration: 0.7, ease: 'back.out(2)', delay: i * 0.06, scrollTrigger: { trigger: el, start: 'top 90%' } }
      );
    });
  }

  // Buttons: elastic "press" punch on click — works alongside existing confetti handler
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('pointerdown', () => {
      gsap.fromTo(btn, { scale: 1 }, { scale: 0.88, duration: 0.12, ease: 'power1.out' });
    });
    btn.addEventListener('pointerup', () => {
      gsap.to(btn, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    });
    btn.addEventListener('pointerleave', () => {
      gsap.to(btn, { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.4)' });
    });
  });

  // Skill squares: playful bounce-tilt on hover
  document.querySelectorAll('.skill-square').forEach(sq => {
    sq.addEventListener('pointerenter', () => {
      gsap.to(sq, { y: -8, rotate: -1.5, duration: 0.4, ease: 'elastic.out(1, 0.4)' });
    });
    sq.addEventListener('pointerleave', () => {
      gsap.to(sq, { y: 0, rotate: 0, duration: 0.5, ease: 'elastic.out(1, 0.35)' });
    });
  });

  // Hero stickers: bounce in late, then wobble idly forever
  const stickerCfg = [
    { sel: '.sticker-1', rot: 8,  delay: 2.0, wobbleDur: 2.6 },
    { sel: '.sticker-2', rot: -6, delay: 2.3, wobbleDur: 3.1 },
    { sel: '.sticker-3', rot: 5,  delay: 2.6, wobbleDur: 2.9 }
  ];
  stickerCfg.forEach(cfg => {
    const el = document.querySelector(cfg.sel);
    if(!el) return;
    gsap.fromTo(el,
      { scale: 0, opacity: 0, rotate: cfg.rot * 4 },
      {
        scale: 1, opacity: 1, rotate: cfg.rot, duration: 0.9, ease: 'elastic.out(1, 0.45)', delay: cfg.delay,
        onComplete: () => {
          gsap.to(el, {
            y: -7, rotate: cfg.rot * -1, duration: cfg.wobbleDur, ease: 'sine.inOut',
            repeat: -1, yoyo: true
          });
        }
      }
    );
  });

  // Magnetic buttons — pull toward cursor, spring back on leave
  document.querySelectorAll('.btn').forEach(btn => {
    const moveX = gsap.quickTo(btn, 'x', { duration: 0.35, ease: 'power3' });
    const moveY = gsap.quickTo(btn, 'y', { duration: 0.35, ease: 'power3' });
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      const relX = e.clientX - (r.left + r.width / 2);
      const relY = e.clientY - (r.top + r.height / 2);
      moveX(relX * 0.25);
      moveY(relY * 0.3);
    });
    btn.addEventListener('pointerleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.35)' });
    });
  });

  // Project cards — 3D tilt that follows the cursor (retro arcade-card feel)
  if(window.matchMedia('(pointer: fine)').matches){
    document.querySelectorAll('.project-card').forEach(card => {
      card.style.transformStyle = 'preserve-3d';
      card.style.perspective = '800px';
      const rotX = gsap.quickTo(card, 'rotationX', { duration: 0.4, ease: 'power3' });
      const rotY = gsap.quickTo(card, 'rotationY', { duration: 0.4, ease: 'power3' });
      const liftZ = gsap.quickTo(card, 'z', { duration: 0.4, ease: 'power3' });
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        rotX(py * -10);
        rotY(px * 10);
        liftZ(20);
      });
      card.addEventListener('pointerleave', () => {
        gsap.to(card, { rotationX: 0, rotationY: 0, z: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      });
    });
  }
})();


(function(){
  const graph = document.getElementById('github-graph');
  if(!graph) return;
  const weeks = 53, days = 7;
  const frag = document.createDocumentFragment();
  for(let w=0; w<weeks; w++){
    for(let d=0; d<days; d++){
      const cell = document.createElement('div');
      cell.style.aspectRatio = '1';
      cell.style.border = '2px solid #222';
      cell.style.minWidth = '12px';
      const rand = Math.random();
      if(rand > .85) cell.style.background = 'rgba(0,200,83,1)';
      else if(rand > .7) cell.style.background = 'rgba(0,200,83,.8)';
      else if(rand > .55) cell.style.background = 'rgba(0,200,83,.6)';
      else if(rand > .4) cell.style.background = 'rgba(0,200,83,.4)';
      else cell.style.background = 'rgba(0,0,0,.08)';
      frag.appendChild(cell);
    }
  }
  graph.appendChild(frag);
})();

/* ============================================================
   FEATURE 1: THREE.JS FULL-BLEED CYBERPUNK PARTICLE/GRID FIELD
============================================================ */
(function(){
  const canvas = document.getElementById('threejs-bg');
  if (!canvas || typeof THREE === 'undefined') return;
  const PREFERS_REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (PREFERS_REDUCED) return;

  const IS_MOBILE = window.innerWidth < 768;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_MOBILE ? 1 : 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(
    -window.innerWidth / 2, window.innerWidth / 2,
    window.innerHeight / 2, -window.innerHeight / 2,
    0.1, 100
  );
  camera.position.z = 10;

  // Theme colors — now includes cyberpunk cyan in dark mode
  function getThemeColor() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return dark
      ? { particle: 0x00F5FF, line: 0x1A4FFF, particleOpacity: 0.55, lineOpacity: 0.18, secondary: 0xFF00FF }
      : { particle: 0xFF2D6B, line: 0xFF2D6B, particleOpacity: 0.35, lineOpacity: 0.08, secondary: 0xFF2D6B };
  }

  // Grid dots — sparse 80px grid across full viewport
  const GRID_STEP = 80;
  const cols = Math.ceil(window.innerWidth / GRID_STEP) + 2;
  const rows = Math.ceil(window.innerHeight / GRID_STEP) + 2;
  const gridPositions = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      gridPositions.push(
        c * GRID_STEP - window.innerWidth / 2,
        r * GRID_STEP - window.innerHeight / 2,
        0
      );
    }
  }
  const gridGeo = new THREE.BufferGeometry();
  gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridPositions, 3));
  const tc = getThemeColor();
  const gridMat = new THREE.PointsMaterial({
    color: tc.particle, size: 2.5, transparent: true, opacity: tc.particleOpacity * 0.5,
    sizeAttenuation: false
  });
  const gridPoints = new THREE.Points(gridGeo, gridMat);
  scene.add(gridPoints);

  // Floating particles
  const PARTICLE_N = IS_MOBILE ? 12 : 28;
  const floatPositions = new Float32Array(PARTICLE_N * 3);
  const floatVelocities = [];
  for (let i = 0; i < PARTICLE_N; i++) {
    floatPositions[i * 3]     = (Math.random() - 0.5) * window.innerWidth;
    floatPositions[i * 3 + 1] = (Math.random() - 0.5) * window.innerHeight;
    floatPositions[i * 3 + 2] = 0;
    floatVelocities.push(
      (Math.random() - 0.5) * 0.22,
      (Math.random() - 0.5) * 0.22
    );
  }
  const floatGeo = new THREE.BufferGeometry();
  floatGeo.setAttribute('position', new THREE.Float32BufferAttribute(floatPositions, 3));
  const floatMat = new THREE.PointsMaterial({
    color: tc.particle, size: 3.5, transparent: true, opacity: tc.particleOpacity,
    sizeAttenuation: false
  });
  const floatPoints = new THREE.Points(floatGeo, floatMat);
  scene.add(floatPoints);

  // Secondary cyberpunk neon particles (magenta/cyan in dark)
  const SEC_N = IS_MOBILE ? 0 : 12;
  const secPositions = new Float32Array(SEC_N * 3);
  const secVelocities = [];
  for (let i = 0; i < SEC_N; i++) {
    secPositions[i * 3]     = (Math.random() - 0.5) * window.innerWidth;
    secPositions[i * 3 + 1] = (Math.random() - 0.5) * window.innerHeight;
    secPositions[i * 3 + 2] = 0;
    secVelocities.push((Math.random() - 0.5) * 0.18, (Math.random() - 0.5) * 0.18);
  }
  const secGeo = new THREE.BufferGeometry();
  secGeo.setAttribute('position', new THREE.Float32BufferAttribute(secPositions, 3));
  const secMat = new THREE.PointsMaterial({
    color: tc.secondary, size: 2.5, transparent: true, opacity: tc.particleOpacity * 0.6,
    sizeAttenuation: false
  });
  const secPoints = new THREE.Points(secGeo, secMat);
  scene.add(secPoints);

  // Connection lines
  const lineGeo = new THREE.BufferGeometry();
  const linePositionsBuf = new Float32Array(PARTICLE_N * PARTICLE_N * 6);
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositionsBuf, 3));
  const lineMat = new THREE.LineBasicMaterial({ color: tc.line, transparent: true, opacity: tc.lineOpacity });
  const lineSegs = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(lineSegs);

  const CONNECT_DIST = 160;
  let lineCount = 0;

  function updateThreeColors() {
    const col = getThemeColor();
    gridMat.color.setHex(col.particle);
    gridMat.opacity = col.particleOpacity * 0.5;
    floatMat.color.setHex(col.particle);
    floatMat.opacity = col.particleOpacity;
    lineMat.color.setHex(col.line);
    lineMat.opacity = col.lineOpacity;
    secMat.color.setHex(col.secondary);
    secMat.opacity = col.particleOpacity * 0.6;
  }

  window._threeUpdateColors = updateThreeColors;

  let animId = null;
  let running = true;
  let frameCount = 0;

  function animate() {
    if (!running) return;
    animId = requestAnimationFrame(animate);
    frameCount++;

    // On mobile, skip every other frame to save battery
    if (IS_MOBILE && frameCount % 2 !== 0) return;

    const pos = floatGeo.attributes.position.array;
    const hw = window.innerWidth / 2, hh = window.innerHeight / 2;
    for (let i = 0; i < PARTICLE_N; i++) {
      pos[i * 3]     += floatVelocities[i * 2];
      pos[i * 3 + 1] += floatVelocities[i * 2 + 1];
      if (pos[i * 3] >  hw)  pos[i * 3] = -hw;
      if (pos[i * 3] < -hw)  pos[i * 3] =  hw;
      if (pos[i * 3 + 1] >  hh) pos[i * 3 + 1] = -hh;
      if (pos[i * 3 + 1] < -hh) pos[i * 3 + 1] =  hh;
    }
    floatGeo.attributes.position.needsUpdate = true;

    // Update secondary particles
    if (SEC_N > 0) {
      const sp = secGeo.attributes.position.array;
      for (let i = 0; i < SEC_N; i++) {
        sp[i * 3]     += secVelocities[i * 2];
        sp[i * 3 + 1] += secVelocities[i * 2 + 1];
        if (sp[i * 3] >  hw)  sp[i * 3] = -hw;
        if (sp[i * 3] < -hw)  sp[i * 3] =  hw;
        if (sp[i * 3 + 1] >  hh) sp[i * 3 + 1] = -hh;
        if (sp[i * 3 + 1] < -hh) sp[i * 3 + 1] =  hh;
      }
      secGeo.attributes.position.needsUpdate = true;
    }

    // Connection lines — skip on mobile for perf
    if (!IS_MOBILE) {
      const linePos = lineGeo.attributes.position.array;
      lineCount = 0;
      for (let a = 0; a < PARTICLE_N; a++) {
        for (let b = a + 1; b < PARTICLE_N; b++) {
          const dx = pos[a * 3] - pos[b * 3];
          const dy = pos[a * 3 + 1] - pos[b * 3 + 1];
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST && lineCount < PARTICLE_N * PARTICLE_N * 2) {
            linePos[lineCount * 6]     = pos[a * 3];
            linePos[lineCount * 6 + 1] = pos[a * 3 + 1];
            linePos[lineCount * 6 + 2] = 0;
            linePos[lineCount * 6 + 3] = pos[b * 3];
            linePos[lineCount * 6 + 4] = pos[b * 3 + 1];
            linePos[lineCount * 6 + 5] = 0;
            lineCount++;
          }
        }
      }
      lineGeo.attributes.position.needsUpdate = true;
      lineGeo.setDrawRange(0, lineCount * 2);
    }

    renderer.render(scene, camera);
  }

  animate();

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.left   = -window.innerWidth / 2;
    camera.right  =  window.innerWidth / 2;
    camera.top    =  window.innerHeight / 2;
    camera.bottom = -window.innerHeight / 2;
    camera.updateProjectionMatrix();
  }, { passive: true });

  window.addEventListener('pagehide', () => { running = false; if (animId) cancelAnimationFrame(animId); });
})();

/* ============================================================
   FEATURE 2: 3D FLIP CARDS (Education)
============================================================ */
(function(){
  document.querySelectorAll('.edu-flip-scene').forEach(scene => {
    function toggle() {
      scene.classList.toggle('flipped');
    }
    scene.addEventListener('click', toggle);
    scene.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
})();

/* ============================================================
   FEATURE 3: CRT POWER-ON THEME TRANSITION
============================================================ */
(function(){
  const crtEl = document.getElementById('crt-transition');
  const themeToggle = document.getElementById('theme-toggle');
  if (!crtEl || !themeToggle) return;

  const PREFERS_REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  themeToggle.addEventListener('click', () => {
    if (PREFERS_REDUCED) return;

    // Read theme AFTER applyTheme() has already run (it runs first since it's in the earlier IIFE)
    const nowDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const lineColor = nowDark ? '#1A4FFF' : '#FF2D6B';
    crtEl.style.setProperty('--crt-line-color', lineColor);

    // Update Three.js colors after theme switch
    if (window._threeUpdateColors) window._threeUpdateColors();

    // Trigger CRT animation
    crtEl.classList.remove('crt-firing');
    void crtEl.offsetWidth; // reflow
    crtEl.classList.add('crt-firing');
    setTimeout(() => crtEl.classList.remove('crt-firing'), 750);
  });
})();

/* ============================================================
   FEATURE 4: WEBGL RIPPLE SHADER ON HERO AVATAR
============================================================ */
(function(){
  const canvas = document.getElementById('avatar-webgl');
  const avatarWrap = document.getElementById('hero-avatar-wrap');
  if (!canvas || !avatarWrap) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const SIZE = 90;
  canvas.width = SIZE; canvas.height = SIZE;

  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return;

  const vsSource = `
    attribute vec2 aPos;
    varying vec2 vUv;
    void main() {
      vUv = aPos * 0.5 + 0.5;
      gl_Position = vec4(aPos, 0.0, 1.0);
    }
  `;

  const fsSource = `
    precision mediump float;
    uniform float uTime;
    uniform float uHover;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;
      vec2 center = vec2(0.5, 0.5);
      float dist = length(uv - center);

      // Ripple distortion
      float ripple = sin(dist * 28.0 - uTime * 4.0) * 0.015 * uHover;
      vec2 displaced = uv + normalize(uv - center) * ripple;

      // Circular mask
      float mask = smoothstep(0.5, 0.47, dist);
      if (mask < 0.01) discard;

      // Yellow base color (#FFE500) with pink ripple shimmer
      vec3 yellow = vec3(1.0, 0.898, 0.0);
      vec3 pink   = vec3(1.0, 0.176, 0.42);
      float shimmer = sin(displaced.x * 12.0 + uTime * 3.0) * 0.5 + 0.5;
      vec3 col = mix(yellow, pink, shimmer * 0.45 * uHover);

      // Edge vignette
      float edge = smoothstep(0.5, 0.38, dist);
      col *= edge;

      // Black text "PR" approximation — a cross-hatch center mark
      float px = abs(displaced.x - 0.5);
      float py = abs(displaced.y - 0.5);
      float letterMask = step(0.18, max(px, py)); // keep outer ring colorful
      col = mix(col * 0.0, col, letterMask);

      gl_FragColor = vec4(col, mask * 0.92);
    }
  `;

  function compileShader(src, type) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    return s;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, compileShader(vsSource, gl.VERTEX_SHADER));
  gl.attachShader(prog, compileShader(fsSource, gl.FRAGMENT_SHADER));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const quad = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uTime  = gl.getUniformLocation(prog, 'uTime');
  const uHover = gl.getUniformLocation(prog, 'uHover');

  gl.viewport(0, 0, SIZE, SIZE);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  let t = 0, hoverVal = 0, targetHover = 0, animId = null, running = false;

  function render() {
    animId = requestAnimationFrame(render);
    t += 0.016;
    hoverVal += (targetHover - hoverVal) * 0.08;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uTime, t);
    gl.uniform1f(uHover, hoverVal);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (hoverVal < 0.01 && targetHover === 0 && running) {
      running = false;
      cancelAnimationFrame(animId);
    }
  }

  avatarWrap.addEventListener('mouseenter', () => {
    targetHover = 1;
    if (!running) { running = true; render(); }
  });
  avatarWrap.addEventListener('mouseleave', () => {
    targetHover = 0;
    if (!running) { running = true; render(); }
  });
})();

/* ============================================================
   GITHUB LIVE STATS
============================================================ */
(function(){
  const reposEl = document.getElementById('gh-repos');
  const starsEl = document.getElementById('gh-stars');
  const ghSection = document.getElementById('github');
  if(!reposEl || !starsEl || !ghSection) return;

  const ghObserver = new IntersectionObserver((entries)=>{
    if(!entries[0].isIntersecting) return;
    ghObserver.disconnect();
    Promise.all([
      fetch('https://api.github.com/users/Pawan210804').then(r=>r.json()),
      fetch('https://api.github.com/users/Pawan210804/repos?per_page=100').then(r=>r.json())
    ]).then(([user, repos])=>{
      if(user && user.public_repos !== undefined) reposEl.textContent = user.public_repos;
      if(Array.isArray(repos)){
        const stars = repos.reduce((s,r) => s + (r.stargazers_count||0), 0);
        starsEl.textContent = stars;
      }
    }).catch(()=>{}); 
  },{threshold:.1});
  ghObserver.observe(ghSection);
})();

/* ============================================================
   ANIME.JS — HERO NAME LOOPING GLOW WAVE
   Runs independently of GSAP (only touches text-shadow/opacity on
   per-letter spans, properties GSAP never touches on this element)
   so the two animation engines never fight over the same value.
============================================================ */
(function(){
  if (typeof anime === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function splitToLetters(el){
    const text = el.textContent;
    el.textContent = '';
    const frag = document.createDocumentFragment();
    [...text].forEach(ch => {
      const span = document.createElement('span');
      span.textContent = ch;
      span.style.display = 'inline-block';
      span.style.willChange = 'text-shadow, opacity';
      frag.appendChild(span);
    });
    el.appendChild(frag);
    return el.querySelectorAll('span');
  }

  const targets = ['#hero-line1 .glitch-wrap', '#hero-line2 .glitch-wrap']
    .map(sel => document.querySelector(sel))
    .filter(Boolean);

  targets.forEach((el, idx) => {
    const letters = splitToLetters(el);
    if (!letters.length) return;
    const glowColor = idx === 0 ? '255, 45, 107' : '0, 245, 255'; // pink / cyan, matches palette
    anime({
      targets: letters,
      textShadow: [
        { value: `0 0 0px rgba(${glowColor}, 0)` },
        { value: `0 0 18px rgba(${glowColor}, 0.9)` },
        { value: `0 0 0px rgba(${glowColor}, 0)` }
      ],
      easing: 'easeInOutSine',
      duration: 2200,
      delay: anime.stagger(90, { start: 600 }),
      loop: true, // keeps firing indefinitely — the "goal" is a living, breathing headline
    });
  });
})();

/* ============================================================
   ANIME.JS — BUTTON CLICK RIPPLE
   One-shot burst on click; only animates a freshly-created overlay
   element, never the button's own transform/x/y (those belong to
   GSAP's magnetic-button effect), so there's zero property overlap.
============================================================ */
(function(){
  if (typeof anime === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.querySelectorAll('.btn').forEach(btn => {
    // .btn already sets position:relative + overflow:hidden in CSS, so the
    // ripple clips correctly without any inline style overrides here.
    btn.addEventListener('click', (e) => {
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2.2;
      const ripple = document.createElement('span');
      ripple.setAttribute('aria-hidden', 'true');
      ripple.style.position = 'absolute';
      ripple.style.left = `${e.clientX - rect.left}px`;
      ripple.style.top = `${e.clientY - rect.top}px`;
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.marginLeft = `${-size / 2}px`;
      ripple.style.marginTop = `${-size / 2}px`;
      ripple.style.borderRadius = '50%';
      ripple.style.background = 'rgba(255,255,255,0.55)';
      ripple.style.mixBlendMode = 'overlay';
      ripple.style.pointerEvents = 'none';
      btn.appendChild(ripple);

      anime({
        targets: ripple,
        scale: [0, 1],
        opacity: [0.7, 0],
        easing: 'easeOutExpo',
        duration: 650,
        complete: () => ripple.remove(),
      });
    });
  });
})();
/* ============================================================
   FEATURE: THREE.JS INTERACTIVE BENTO CARD - CYBER HYPER-CUBE
 ============================================================ */
(function(){
  const canvas = document.getElementById('bento-3d-canvas');
  if(!canvas || typeof THREE === 'undefined') return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const bentoCard = canvas.closest('.skills-3d-bento');
  if(!bentoCard) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
  camera.position.set(0, 0, 7.5);

  const group = new THREE.Group();
  scene.add(group);

  // 1. Inner core (mesh glowing sphere)
  const coreGeo = new THREE.IcosahedronGeometry(0.7, 1);
  const coreMat = new THREE.MeshBasicMaterial({
    color: '#FFE500',
    wireframe: true,
    transparent: true,
    opacity: 0.75
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);

  // 2. Middle octahedron cage
  const midGeo = new THREE.OctahedronGeometry(1.4, 0);
  const midMat = new THREE.MeshBasicMaterial({
    color: '#00F5FF',
    wireframe: true,
    transparent: true,
    opacity: 0.55
  });
  const midCage = new THREE.Mesh(midGeo, midMat);
  group.add(midCage);

  // 3. Outer hyper-cube cage
  const outerGeo = new THREE.BoxGeometry(2.3, 2.3, 2.3);
  const outerMat = new THREE.MeshBasicMaterial({
    color: '#FF2D6B',
    wireframe: true,
    transparent: true,
    opacity: 0.35
  });
  const outerCage = new THREE.Mesh(outerGeo, outerMat);
  group.add(outerCage);

  // 4. Orbiting rings with tiny satellites
  const satGroup = new THREE.Group();
  group.add(satGroup);

  const satCount = 12;
  const satGeo = new THREE.IcosahedronGeometry(0.06, 0);
  const sats = [];
  
  for(let i=0; i<satCount; i++){
    const satMat = new THREE.MeshBasicMaterial({ color: '#00F5FF' });
    const mesh = new THREE.Mesh(satGeo, satMat);
    const angle = (i / satCount) * Math.PI * 2;
    const radius = 2.0;
    mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, (Math.random() - 0.5) * 0.8);
    satGroup.add(mesh);
    sats.push({ mesh, angle, radius, speed: 0.4 + Math.random() * 0.5 });
  }

  // CONFIG AND CONTROL STATE
  const config = {
    baseSpeedX: 0.005,
    baseSpeedY: 0.007,
    speedMultiplier: 1.5,
    colorMode: 0,
    pulseScale: 1.0
  };

  const btnSpin = document.getElementById('bento-ctrl-spin');
  const btnColor = document.getElementById('bento-ctrl-color');
  const btnPulse = document.getElementById('bento-ctrl-pulse');

  const spinModes = [
    { label: 'SLOW', mult: 0.5 },
    { label: 'FAST', mult: 1.5 },
    { label: 'TURBO', mult: 4.5 },
    { label: 'STATIC', mult: 0.0 }
  ];
  let currentSpinIdx = 1;

  if(btnSpin){
    btnSpin.addEventListener('click', () => {
      currentSpinIdx = (currentSpinIdx + 1) % spinModes.length;
      const mode = spinModes[currentSpinIdx];
      
      const badge = btnSpin.querySelector('.btn-badge');
      if(badge) badge.textContent = mode.label;

      gsap.to(config, {
        speedMultiplier: mode.mult,
        duration: 0.6,
        ease: "power2.out"
      });

      gsap.fromTo(btnSpin, { scale: 0.95 }, { scale: 1, duration: 0.3, ease: "elastic.out(1, 0.4)" });
    });
  }

  const colorModes = [
    { label: 'PINK/CYAN', core: '#FFE500', mid: '#00F5FF', outer: '#FF2D6B', sats: '#00F5FF' },
    { label: 'GOLD/BLUE', core: '#1A4FFF', mid: '#FFE500', outer: '#1A4FFF', sats: '#FFE500' },
    { label: 'TOXIC GREEN', core: '#FFFFFF', mid: '#00C853', outer: '#FFE500', sats: '#00C853' }
  ];

  if(btnColor){
    btnColor.addEventListener('click', () => {
      config.colorMode = (config.colorMode + 1) % colorModes.length;
      const palette = colorModes[config.colorMode];

      const badge = btnColor.querySelector('.btn-badge');
      if(badge) badge.textContent = palette.label;

      gsap.to(coreMat.color, { r: new THREE.Color(palette.core).r, g: new THREE.Color(palette.core).g, b: new THREE.Color(palette.core).b, duration: 0.8 });
      gsap.to(midMat.color, { r: new THREE.Color(palette.mid).r, g: new THREE.Color(palette.mid).g, b: new THREE.Color(palette.mid).b, duration: 0.8 });
      gsap.to(outerMat.color, { r: new THREE.Color(palette.outer).r, g: new THREE.Color(palette.outer).g, b: new THREE.Color(palette.outer).b, duration: 0.8 });
      
      sats.forEach(sat => {
        gsap.to(sat.mesh.material.color, { r: new THREE.Color(palette.sats).r, g: new THREE.Color(palette.sats).g, b: new THREE.Color(palette.sats).b, duration: 0.8 });
      });

      gsap.fromTo(btnColor, { scale: 0.95 }, { scale: 1, duration: 0.3, ease: "elastic.out(1, 0.4)" });
    });
  }

  if(btnPulse){
    btnPulse.addEventListener('click', () => {
      gsap.fromTo(outerCage.scale,
        { x: 1, y: 1, z: 1 },
        { x: 1.5, y: 1.5, z: 1.5, duration: 0.2, ease: "power2.out", yoyo: true, repeat: 1 }
      );
      gsap.fromTo(midCage.scale,
        { x: 1, y: 1, z: 1 },
        { x: 1.3, y: 1.3, z: 1.3, duration: 0.25, ease: "power2.out", yoyo: true, repeat: 1 }
      );
      gsap.fromTo(core.scale,
        { x: 1, y: 1, z: 1 },
        { x: 1.7, y: 1.7, z: 1.7, duration: 0.15, ease: "power1.out", yoyo: true, repeat: 1 }
      );

      group.rotation.x += (Math.random() - 0.5) * 2.5;
      group.rotation.y += (Math.random() - 0.5) * 2.5;
      group.rotation.z += (Math.random() - 0.5) * 2.5;

      const oldCoreOpacity = coreMat.opacity;
      gsap.fromTo(coreMat, 
        { opacity: 1.0 }, 
        { opacity: oldCoreOpacity, duration: 0.8, ease: "power1.out" }
      );

      if (window.confetti) {
        window.confetti({
          particleCount: 20,
          spread: 30,
          origin: { y: 0.8 }
        });
      }
    });
  }

  let mouseX = 0, mouseY = 0;
  bentoCard.addEventListener('mousemove', (e) => {
    const rect = bentoCard.getBoundingClientRect();
    mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 1.2;
    mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 1.2;
  });
  bentoCard.addEventListener('mouseleave', () => {
    mouseX = 0; mouseY = 0;
  });

  function resize(){
    const w = canvas.clientWidth || 300;
    const h = canvas.clientHeight || 300;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  let raf;
  let visible = true;
  const io = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible && !raf) animate();
  }, { threshold: 0.05 });
  io.observe(canvas);

  const clock = new THREE.Clock();
  function animate(){
    if(!visible) { raf = null; return; }
    raf = requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.elapsedTime;

    group.rotation.x += config.baseSpeedX * config.speedMultiplier;
    group.rotation.y += config.baseSpeedY * config.speedMultiplier;

    midCage.rotation.x -= 0.01 * config.speedMultiplier;
    midCage.rotation.y -= 0.015 * config.speedMultiplier;

    outerCage.rotation.z += 0.003 * config.speedMultiplier;

    const breathe = 1.0 + Math.sin(t * 1.8) * 0.05;
    core.scale.setScalar(breathe);

    sats.forEach(sat => {
      sat.angle += sat.speed * dt * config.speedMultiplier;
      sat.mesh.position.x = Math.cos(sat.angle) * sat.radius;
      sat.mesh.position.y = Math.sin(sat.angle) * sat.radius;
      sat.mesh.position.z = Math.sin(sat.angle * 1.5) * 0.5;
    });

    group.position.x += (mouseX - group.position.x) * 0.06;
    group.position.y += (-mouseY - group.position.y) * 0.06;

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('pagehide', () => {
    raf = null;
    renderer.dispose();
    resizeObserver.disconnect();
  });
})();
