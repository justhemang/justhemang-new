

'use strict';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const lerp = (a, b, t) => a + (b - a) * t;

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const IS_HOME = !document.body.classList.contains('page-sub');

function initHero() {
  if (!IS_HOME) return;
  const canvas = $('#heroCanvas');
  const hero = $('#hero');
  if (!canvas || !hero || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, hero.clientWidth / hero.clientHeight, 0.1, 100);
  camera.position.z = 4;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(hero.clientWidth, hero.clientHeight);

  const textureLoader = new THREE.TextureLoader();
  const logoTexture = textureLoader.load('Logo Transparent.png');
  const logoMat = new THREE.MeshBasicMaterial({
    map: logoTexture, transparent: true, opacity: 0.4,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const logoGeo = new THREE.PlaneGeometry(2.2, 2.2);
  const logoMesh = new THREE.Mesh(logoGeo, logoMat);
  scene.add(logoMesh);

  const ringGeo = new THREE.RingGeometry(1.6, 1.63, 64);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x66d9ef, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  scene.add(ring);

  const outerGeo = new THREE.RingGeometry(2.1, 2.13, 64);
  const outerMat = new THREE.MeshBasicMaterial({ color: 0x3399ff, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
  const outer = new THREE.Mesh(outerGeo, outerMat);
  scene.add(outer);

  let mouseX = 0, mouseY = 0;
  let running = !REDUCED;

  hero.addEventListener('pointermove', (e) => {
    const rect = hero.getBoundingClientRect();
    mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  }, { passive: true });

  function resize() {
    const w = hero.clientWidth, h = hero.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  addEventListener('resize', resize);

  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);
    const t = performance.now() * 0.0003;
    logoMesh.rotation.y = t * 0.3 + mouseX * 0.2;
    logoMesh.rotation.x = Math.sin(t) * 0.08 + mouseY * 0.1;
    logoMesh.position.y = Math.sin(t * 1.5) * 0.06;
    ring.rotation.z = t * 0.15;
    ring.position.y = Math.sin(t * 1.5) * 0.06;
    outer.rotation.z = -t * 0.1;
    outer.position.y = Math.sin(t * 1.5) * 0.06;
    renderer.render(scene, camera);
  }

  if (REDUCED) { logoMesh.rotation.y = 0.2; renderer.render(scene, camera); return; }

  new IntersectionObserver((entries) => {
    const visible = entries[0].isIntersecting;
    if (visible && !running) { running = true; animate(); }
    if (!visible) running = false;
  }, { root: null }).observe(hero);

  animate();
}

function initCursor() {
  if (!FINE_POINTER || REDUCED) return;
  document.body.classList.add('has-cursor');
  const dot = $('#cursorDot');
  const ring = $('#cursorRing');
  if (!dot) return;
  let mx = 0, my = 0, rx = 0, ry = 0;
  addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px)`;
  }, { passive: true });
  if (ring) {
    (function loop() {
      rx += (mx - rx) * 0.15;
      ry += (my - ry) * 0.15;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(loop);
    })();
  }
}

function initMenu() {
  const fab = $('#menuBtn') || $('#menuFab');
  const overlay = $('#menuOverlay');
  if (!fab || !overlay) return;
  const links = $$('.menu-overlay__link', overlay);

  const toggle = (open) => {
    fab.classList.toggle('open', open);
    fab.setAttribute('aria-expanded', String(open));
    overlay.classList.toggle('open', open);
    overlay.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open && typeof gsap !== 'undefined') {
      gsap.from(links, { opacity: 0, y: 60, stagger: 0.06, duration: 0.6, ease: 'power3.out', delay: 0.15 });
    }
  };

  fab.addEventListener('click', () => toggle(!overlay.classList.contains('open')));
  links.forEach((a) => a.addEventListener('click', () => toggle(false)));
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) toggle(false);
  });
}

function initScrollProgress() {
  const progress = $('#scrollProgress');
  if (!progress) return;
  window.addEventListener('scroll', () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
  }, { passive: true });
}

function initCounters() {
  if (REDUCED || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  $$('.stat__num').forEach((el) => {
    const raw = el.textContent.trim();
    const match = raw.match(/^(\d+)(.*)/);
    if (!match) return;
    const target = parseInt(match[1], 10);
    const suffix = match[2] || '';
    const obj = { val: 0 };
    gsap.to(obj, {
      val: target,
      duration: 1.5,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
      onUpdate: () => { el.textContent = Math.round(obj.val) + suffix; },
    });
  });
}

function initHorizontalScroll() {
  if (REDUCED || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  $$('.hscroll').forEach((section) => {
    const track = section.querySelector('.hscroll__track');
    if (!track) return;

    const items = $$('.hscroll__item', track);
    if (items.length < 2) return;

    const getScrollWidth = () => track.scrollWidth - section.clientWidth;

    gsap.to(track, {
      x: () => -getScrollWidth(),
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => '+=' + getScrollWidth(),
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

    items.forEach((item, i) => {
      gsap.from(item, {
        opacity: 0, y: 40, rotateY: 15,
        duration: 0.8, delay: i * 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: item, start: 'left 85%' },
      });
    });
  });
}

function initAnimations() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  if (REDUCED) {
    $$('.anim-clip,.anim-scale,.anim-slide-left,.anim-slide-right,.anim-slide-up,.anim-rotate,.anim-blur').forEach((el) => {
      el.style.clipPath = 'none';
      el.style.transform = 'none';
      el.style.opacity = '1';
      el.style.filter = 'none';
    });
    return;
  }

  if (IS_HOME) {
    const tl = gsap.timeline({ delay: 0.3 });
    tl.from('.hero__typewriter', { opacity: 0, y: -20, duration: 0.8, ease: 'power3.out' })
      .from('.hero__pre', { opacity: 0, y: -20, duration: 0.8, ease: 'power3.out' }, '-=0.4')
      .from('.hero__line--top', { opacity: 0, x: -80, skewX: -8, duration: 0.9, ease: 'power4.out' }, '-=0.4')
      .from('.hero__char', { opacity: 0, y: 80, stagger: 0.06, duration: 0.9, ease: 'back.out(1.4)' }, '-=0.5')
      .from('#hero .accent-line', { scaleX: 0, duration: 0.8, ease: 'power3.inOut' }, '-=0.4')
      .from('.hero__tagline', { opacity: 0, y: 30, duration: 0.8, ease: 'power3.out' }, '-=0.3')
      .from('.nav__menu-btn', { opacity: 0, scale: 0, duration: 0.5, ease: 'back.out(2)' }, '-=0.4');
  } else {
    gsap.from('.nav__menu-btn', { opacity: 0, scale: 0, duration: 0.5, ease: 'back.out(2)', delay: 0.2 });
  }

  $$('.tw-type').forEach((el) => {
    const originalHTML = el.innerHTML;
    el.setAttribute('aria-label', el.textContent);
    const parts = [];
    function extractText(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        parts.push({ type: 'text', value: node.textContent });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === 'BR') { parts.push({ type: 'br' }); return; }
        [...node.childNodes].forEach(extractText);
      }
    }
    [...el.childNodes].forEach(extractText);
    el.innerHTML = '';
    el.classList.add('tw-active');
    let pi = 0, ci = 0;
    function typeChar() {
      if (pi >= parts.length) { el.classList.add('tw-done'); return; }
      const part = parts[pi];
      if (part.type === 'br') {
        el.appendChild(document.createElement('br'));
        pi++;
        setTimeout(typeChar, 60);
        return;
      }
      if (ci < part.value.length) {
        el.appendChild(document.createTextNode(part.value[ci] === ' ' ? '\u00A0' : part.value[ci]));
        ci++;
        setTimeout(typeChar, 28 + Math.random() * 22);
      } else {
        pi++;
        ci = 0;
        setTimeout(typeChar, 10);
      }
    }
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => setTimeout(typeChar, 100),
    });
  });

  $$('.accent-line').forEach((el) => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 90%' },
      scaleX: 0, duration: 0.8, ease: 'power3.inOut',
    });
  });

  $$('.anim-clip').forEach((el) => {
    gsap.to(el, {
      scrollTrigger: { trigger: el, start: 'top 88%' },
      clipPath: 'inset(0 0 0 0)', duration: 0.9, ease: 'power3.inOut',
    });
  });

  $$('.anim-scale').forEach((el) => {
    gsap.to(el, {
      scrollTrigger: { trigger: el, start: 'top 88%' },
      scale: 1, opacity: 1, duration: 0.8, ease: 'back.out(1.4)',
    });
  });

  $$('.anim-slide-left').forEach((el) => {
    gsap.to(el, {
      scrollTrigger: { trigger: el, start: 'top 88%' },
      x: 0, opacity: 1, duration: 0.8, ease: 'power3.out',
    });
  });

  $$('.anim-slide-right').forEach((el) => {
    gsap.to(el, {
      scrollTrigger: { trigger: el, start: 'top 88%' },
      x: 0, opacity: 1, duration: 0.8, ease: 'power3.out',
    });
  });

  $$('.anim-slide-up').forEach((el) => {
    gsap.to(el, {
      scrollTrigger: { trigger: el, start: 'top 88%' },
      y: 0, opacity: 1, duration: 0.8, ease: 'power3.out',
    });
  });

  $$('.anim-rotate').forEach((el) => {
    gsap.to(el, {
      scrollTrigger: { trigger: el, start: 'top 88%' },
      rotation: 0, scale: 1, opacity: 1, duration: 0.9, ease: 'power3.out',
    });
  });

  $$('.anim-blur').forEach((el) => {
    gsap.to(el, {
      scrollTrigger: { trigger: el, start: 'top 88%' },
      filter: 'blur(0px)', opacity: 1, duration: 0.8, ease: 'power2.out',
    });
  });

  $$('.work__item').forEach((item, i) => {
    gsap.from(item, {
      scrollTrigger: { trigger: item, start: 'top 88%' },
      opacity: 0, y: 40, rotateX: 8,
      duration: 0.8, delay: i * 0.1, ease: 'power3.out',
    });
  });

  $$('.service-item').forEach((item, i) => {
    gsap.from(item, {
      scrollTrigger: { trigger: item, start: 'top 88%' },
      opacity: 0, x: -50, rotateY: -5,
      duration: 0.8, delay: i * 0.08, ease: 'power3.out',
    });
  });

  $$('.pricing__card').forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: { trigger: card, start: 'top 88%' },
      opacity: 0, y: 40, scale: 0.95, rotateY: 5,
      duration: 0.7, delay: i * 0.1, ease: 'back.out(1.3)',
    });
  });

  $$('.process__step').forEach((step, i) => {
    gsap.from(step, {
      scrollTrigger: { trigger: step, start: 'top 88%' },
      opacity: 0, x: -40, rotateY: -3,
      duration: 0.7, delay: i * 0.1, ease: 'power3.out',
    });
  });

  $$('.capability').forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: { trigger: card, start: 'top 88%' },
      opacity: 0, y: 30, scale: 0.95,
      duration: 0.6, delay: i * 0.08, ease: 'back.out(1.3)',
    });
  });

  $$('.stat').forEach((stat, i) => {
    gsap.from(stat, {
      scrollTrigger: { trigger: stat, start: 'top 88%' },
      opacity: 0, y: 30, scale: 0.9,
      duration: 0.6, delay: i * 0.1, ease: 'back.out(1.5)',
    });
  });

  $$('.contact-links__item').forEach((item) => {
    gsap.from(item, {
      scrollTrigger: { trigger: item, start: 'top 88%' },
      opacity: 0, x: 40, rotateY: 3,
      duration: 0.8, ease: 'power3.out',
    });
  });

  $$('.team__group').forEach((group, i) => {
    gsap.from(group, {
      scrollTrigger: { trigger: group, start: 'top 85%' },
      opacity: 0, y: 40, scale: 0.9,
      duration: 0.8, delay: i * 0.12, ease: 'back.out(1.3)',
    });
  });

  $$('.cta__heading, .page-cta h2').forEach((el) => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 85%' },
      opacity: 0, y: 80, scale: 0.85, skewY: 3,
      duration: 1.2, ease: 'power4.out',
    });
  });

  $$('.cta__btn').forEach((el) => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 90%' },
      opacity: 0, y: 30, scale: 0.8,
      duration: 0.7, ease: 'back.out(2.5)',
    });
  });

  $$('.section__eyebrow').forEach((el) => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 90%' },
      opacity: 0, x: -30, duration: 0.6, ease: 'power3.out',
    });
  });

  $$('.section__heading').forEach((el) => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 88%' },
      opacity: 0, y: 50, scale: 0.95, duration: 1, ease: 'power3.out',
    });
  });

  $$('.statement__text').forEach((el) => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 85%' },
      clipPath: 'inset(0 100% 0 0)', duration: 1.2, ease: 'power3.inOut',
    });
  });

  const footerLogo = $('.footer__logo');
  if (footerLogo) {
    gsap.from(footerLogo, {
      scrollTrigger: { trigger: footerLogo, start: 'top 95%' },
      opacity: 0, rotation: -180, scale: 0.3,
      duration: 1, ease: 'back.out(1.5)',
    });
  }

  const footerLinks = $$('.footer__links a');
  if (footerLinks.length) {
    gsap.from(footerLinks, {
      scrollTrigger: { trigger: '.footer__links', start: 'top 95%' },
      opacity: 0, y: 20, stagger: 0.08, duration: 0.5, ease: 'power2.out',
    });
  }

  $$('.section').forEach((el) => {
    gsap.to(el, {
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1.5 },
      y: -30, ease: 'none',
    });
  });

  const marquee = $('.marquee');
  if (marquee) {
    gsap.from(marquee, {
      scrollTrigger: { trigger: marquee, start: 'top 92%' },
      opacity: 0, scaleX: 0.8, duration: 1, ease: 'power3.out',
    });
  }

  $$('.work__num').forEach((el) => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 88%' },
      opacity: 0, scale: 2, duration: 0.6, ease: 'back.out(2)',
    });
  });

  const reel = $('.reel__wrap');
  if (reel) {
    gsap.from(reel, {
      scrollTrigger: { trigger: reel, start: 'top 88%' },
      opacity: 0, y: 40, scale: 0.98, rotateX: 5,
      duration: 1, ease: 'power3.out',
    });
  }

  $$('.aero-window').forEach((win, i) => {
    gsap.from(win, {
      scrollTrigger: { trigger: win, start: 'top 88%' },
      opacity: 0, y: 50, scale: 0.96,
      duration: 0.8, delay: i * 0.1, ease: 'power3.out',
    });
  });

  const progress = $('#scrollProgress');
  if (progress) {
    ScrollTrigger.create({
      trigger: document.body, start: 'top top', end: 'bottom bottom',
      onUpdate: (self) => {
        progress.style.boxShadow = self.progress > 0.95
          ? '0 0 12px 2px rgba(42, 122, 122, 0.5)'
          : 'none';
      }
    });
  }
}

function initMagnetic() {
  if (!FINE_POINTER || REDUCED) return;
  $$('.cta__btn, .nav__menu-btn').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      el.style.transform = el.classList.contains('nav__menu-btn')
        ? `translate(${x * 0.25}px, ${y * 0.25}px)`
        : `translate(${x * 0.25}px, ${y * 0.25}px)`;
    }, { passive: true });
    el.addEventListener('mouseleave', () => {
      gsap.to(el, {
        x: 0, y: 0, duration: 0.4, ease: 'elastic.out(1, 0.5)',
        onComplete: () => { if (el.classList.contains('nav__menu-btn')) el.style.transform = ''; }
      });
    });
  });
}

function initHoverTilt() {
  if (!FINE_POINTER || REDUCED) return;
  $$('.work__item, .service-item, .pricing__card').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transform = `perspective(800px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg) translateZ(8px)`;
    }, { passive: true });
    el.addEventListener('mouseleave', () => {
      gsap.to(el, { transform: 'perspective(800px) rotateY(0) rotateX(0) translateZ(0)', duration: 0.5, ease: 'elastic.out(1, 0.5)' });
    });
  });
}

function initHeroChars() {
  if (!FINE_POINTER || REDUCED || !IS_HOME) return;
  const chars = $$('.hero__char');
  if (!chars.length) return;
  const hero = $('#hero');
  hero.addEventListener('pointermove', (e) => {
    const mx = e.clientX, my = e.clientY;
    chars.forEach((ch) => {
      const cr = ch.getBoundingClientRect();
      const cx = cr.left + cr.width / 2;
      const cy = cr.top + cr.height / 2;
      const dist = Math.hypot(mx - cx, my - cy);
      if (dist < 200) {
        const s = (1 - dist / 200) * 18;
        gsap.to(ch, { x: (mx - cx) / dist * s, y: (my - cy) / dist * s, duration: 0.3, ease: 'power2.out' });
      } else {
        gsap.to(ch, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      }
    });
  }, { passive: true });
  hero.addEventListener('pointerleave', () => {
    chars.forEach((ch) => gsap.to(ch, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)' }));
  });
}

function initMarquee() {
  const track = $('#marqueeTrack');
  if (!track || REDUCED) return;
  const unitHTML = track.innerHTML;
  let safety = 0;
  while (track.scrollWidth < innerWidth * 2.5 && safety < 20) { track.innerHTML += unitHTML; safety++; }
  let x = 0;
  (function loop() {
    x -= 0.5;
    const unitW = track.firstElementChild ? track.firstElementChild.offsetWidth * (track.children.length / 4) : 1000;
    if (Math.abs(x) > unitW) x = 0;
    track.style.transform = `translateX(${x}px)`;
    requestAnimationFrame(loop);
  })();
}

function initPageTransition() {
  const overlay = $('#pageTransition');
  if (!overlay) return;
  if (REDUCED) { overlay.style.display = 'none'; return; }

  const bars = $$('.pt-bar', overlay);
  const circle = $('.pt-circle', overlay);
  gsap.set(bars, { xPercent: 0 });
  if (circle) gsap.set(circle, { scale: 0 });

  const tl = gsap.timeline({ delay: 0.15 });
  tl.to(bars, { xPercent: -100, stagger: 0.06, duration: 0.6, ease: 'power4.inOut' });
  if (circle) tl.to(circle, { scale: 80, duration: 0.5, ease: 'power2.in' }, '-=0.3');

  $$('a[href]').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('http') || link.target === '_blank') return;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const url = new URL(href, location.href).href;
      if (url === location.href) return;
      const fab = $('#menuBtn') || $('#menuFab');
      const overlayEl = $('#menuOverlay');
      if (fab && overlayEl && overlayEl.classList.contains('open')) {
        fab.classList.remove('open');
        overlayEl.classList.remove('open');
        overlayEl.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }
      gsap.set(bars, { xPercent: 0 });
      if (circle) gsap.set(circle, { scale: 0 });
      const tlIn = gsap.timeline();
      tlIn.to(bars, { xPercent: 0, stagger: 0.05, duration: 0.5, ease: 'power4.inOut' });
      if (circle) tlIn.to(circle, { scale: 80, duration: 0.4, ease: 'power2.in' }, '-=0.2');
      tlIn.call(() => { location.href = url; });
    });
  });
}

function initToolkit() {
  if (REDUCED || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  $$('.toolkit__card').forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: { trigger: card, start: 'top 88%' },
      opacity: 0, y: 40, scale: 0.9,
      duration: 0.6, delay: i * 0.08, ease: 'back.out(1.3)',
    });
  });
}

function initTimecode() {
  const el = $('#timecodeValue');
  if (!el) return;
  const start = performance.now();
  (function loop() {
    const elapsed = performance.now() - start;
    const totalFrames = Math.floor(elapsed / (1000 / 24));
    const f = totalFrames % 24;
    const totalSec = Math.floor(elapsed / 1000);
    const s = totalSec % 60;
    const m = Math.floor(totalSec / 60) % 60;
    const h = Math.floor(totalSec / 3600);
    el.textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + ':' + String(f).padStart(2, '0');
    requestAnimationFrame(loop);
  })();
}

function initFilmstrip() {
  if (REDUCED) return;
  const track = $('#filmstripTrack');
  if (!track) return;
  const clone = track.innerHTML;
  track.innerHTML += clone;
}

function initTypewriter() {
  const el = $('#heroTypewriter');
  if (!el || !IS_HOME) return;
  const phrases = [
    'Freelance Video Editor',
    'Frontend Developer',
    'President of OPCODE',
    'Founder of Kaelor Media',
    'Creative Director',
    'Motion Graphics Artist',
    'Color Grading Specialist',
  ];
  let pi = 0, ci = 0, deleting = false, delay = 80;
  el.innerHTML = '<span class="tw-cursor"></span>';
  const cursor = el.querySelector('.tw-cursor');
  function tick() {
    const current = phrases[pi];
    if (!deleting) {
      ci++;
      if (ci > current.length) { deleting = true; delay = 1800; }
    } else {
      ci--;
      if (ci < 0) { ci = 0; deleting = false; pi = (pi + 1) % phrases.length; delay = 200; }
    }
    el.textContent = current.substring(0, ci);
    el.appendChild(cursor);
    setTimeout(tick, deleting ? 35 : delay);
  }
  setTimeout(tick, 1200);
}

function initTechChars() {
  const container = $('#techChars');
  if (!container) return;
  const chars = ['{0,1}', '</>', '0xFF', '>>>', '&&', '===', 'npm', 'git', '{}', '[]', '=>', '##', '@@', '**', '++', '--', '&&', '||', '!'];
  for (let i = 0; i < 18; i++) {
    const span = document.createElement('span');
    span.className = 'tech-char';
    span.textContent = chars[Math.floor(Math.random() * chars.length)];
    span.style.left = Math.random() * 100 + '%';
    span.style.animationDuration = (6 + Math.random() * 10) + 's';
    span.style.animationDelay = (Math.random() * 12) + 's';
    span.style.fontSize = (.5 + Math.random() * .5) + 'rem';
    container.appendChild(span);
  }
}

function initLiveClock() {
  const el = $('#liveClock');
  if (!el) return;
  function update() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    el.textContent = h + ':' + m + ':' + s;
  }
  update();
  setInterval(update, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
  initHero();
  initCursor();
  initScrollProgress();
  initMenu();
  initAnimations();
  initCounters();
  initHorizontalScroll();
  initMagnetic();
  initHoverTilt();
  initHeroChars();
  initMarquee();
  initPageTransition();
  initToolkit();
  initTimecode();
  initFilmstrip();
  initTypewriter();
  initTechChars();
  initLiveClock();
});

