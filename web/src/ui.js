// DOM overlay: brand, glass info panel, chapter bar, hotspots projected from 3D, language switch.
import * as THREE from 'three';
import { CHAPTERS, STRINGS, PANELS, HOTSPOTS, SCREEN_LABELS } from './content.js';

const $ = (id) => document.getElementById(id);

// "twin squares" mark: a solid tile and its offset translucent twin
const LOGO_SVG = `<svg viewBox="0 0 30 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<rect x="1" y="2" width="15" height="15" rx="3.2" fill="#1b6a98"/><rect x="10" y="7" width="15" height="15" rx="3.2" fill="#58a8cf" fill-opacity="0.85"/>
</svg><b>Twin<span>Campus</span></b>`;

export function chapterOf(state) {
  if (state === 'campus') return 'campus';
  if (state === 'hq') return 'hq';
  if (state === 'twin' || state.startsWith('b-')) return 'twin';
  if (state === 'iot' || state.startsWith('d-')) return 'iot';
  return 'ai';
}

export class UI {
  constructor(app) {
    this.app = app;
    this.lang = 'en';
    this.state = null;
    this.panelClosed = false;
    this.hs = [];
    this.v = new THREE.Vector3();
    $('brand').innerHTML = LOGO_SVG;
    $('brand2').innerHTML = LOGO_SVG;
    this.buildChapters();
    $('lang').addEventListener('click', () => this.setLang(this.lang === 'en' ? 'zh' : 'en'));
    $('panelClose').addEventListener('click', () => { this.panelClosed = true; this.refreshPanel(); });
    $('reopen').addEventListener('click', () => { this.panelClosed = false; this.refreshPanel(); });
    $('back').addEventListener('click', () => app.back());
    $('skip').addEventListener('click', () => app.director.skip());
    $('story').addEventListener('click', () => app.toggleStory());
    $('mode').addEventListener('click', () => app.toggleExplore());
    $('infoBtn').addEventListener('click', () => $('info').classList.toggle('hidden'));
    $('fsBtn').addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.();
    });
    this.setLang('en');
  }

  s(k) { return STRINGS[this.lang][k]; }

  buildChapters() {
    const nav = $('chapters');
    nav.innerHTML = '';
    this.chapterBtns = {};
    for (const c of CHAPTERS) {
      const b = document.createElement('button');
      b.innerHTML = `<i>${c.n}</i><span></span>`;
      b.addEventListener('click', () => this.app.go(c.id));
      nav.appendChild(b);
      this.chapterBtns[c.id] = b;
    }
  }

  setLang(l) {
    this.lang = l;
    document.documentElement.lang = l;
    document.querySelectorAll('#lang em').forEach((e) => e.classList.toggle('on', e.dataset.l === l));
    for (const c of CHAPTERS) this.chapterBtns[c.id].querySelector('span').textContent = c[l];
    document.querySelectorAll('[data-t]').forEach((e) => { e.textContent = this.s(e.dataset.t); });
    $('info').innerHTML = `<b>${this.s('infoTitle')}</b>${this.s('infoBody')}`;
    this.refreshMode();
    this.refreshPanel();
    this.buildHotspots(this.hsState);
    this.setHint(this.hintMode, this.hintArg);
    this.app.screen?.select(this.app.screen.selected, l);
  }

  refreshMode() {
    const ex = this.app.director?.explore;
    $('mode').innerHTML = `<span style="opacity:.55">◌</span>${ex ? this.s('explore') : this.s('guided')}`;
    $('mode').classList.toggle('on', !!ex);
    $('story').classList.toggle('on', !!this.app.story);
  }

  setHint(mode, arg) {
    this.hintMode = mode;
    this.hintArg = arg;
    const h = $('hint');
    if (mode === 'travel') {
      const c = CHAPTERS.find((x) => x.id === arg);
      h.textContent = this.s('travelling') + (c ? c[this.lang] : '');
    } else h.textContent = this.s('hintIdle');
  }

  // ---------------------------------------------------------------- panel
  setState(state, { travelling = false } = {}) {
    this.state = state;
    const ch = chapterOf(state);
    for (const [id, b] of Object.entries(this.chapterBtns)) b.classList.toggle('on', id === ch);
    $('skip').classList.toggle('hidden', !travelling);
    this.setHint(travelling ? 'travel' : 'idle', ch);
    this.travelling = travelling;
    if (travelling) {
      $('panel').classList.add('hidden');
      this.buildHotspots(null);
    } else {
      this.panelClosed = false;
      this.refreshPanel();
      this.buildHotspots(state);
    }
    const back = $('back').querySelector('[data-t]');
    back.textContent = this.s('back');
  }

  refreshPanel() {
    const p = PANELS[this.state];
    const el = $('panel');
    if (!p || this.travelling) { el.classList.add('hidden'); $('reopen').classList.add('hidden'); return; }
    const t = p[this.lang];
    el.classList.toggle('wide', !!p.wide);
    el.classList.toggle('right', !!p.right);
    el.classList.toggle('compact', !!p.compact);
    $('pEyebrow').textContent = t.eyebrow;
    $('pTitle').innerHTML = t.title;
    $('pBody').textContent = t.body;
    const act = $('pAction');
    act.innerHTML = '';
    if (t.action) {
      const b = document.createElement('button');
      b.className = 'cta';
      b.textContent = t.action;
      b.addEventListener('click', () => this.app.go(p.go));
      act.appendChild(b);
    } else if (t.link) {
      const b = document.createElement('button');
      b.className = 'link';
      b.textContent = t.link;
      b.addEventListener('click', () => this.app.go(p.back));
      act.appendChild(b);
    }
    $('pFoot').innerHTML = t.foot || '';
    $('pFoot').style.display = t.foot ? '' : 'none';
    el.classList.toggle('hidden', this.panelClosed);
    $('reopen').classList.toggle('hidden', !this.panelClosed);
  }

  // ---------------------------------------------------------------- hotspots
  buildHotspots(state) {
    this.hsState = state;
    const root = $('hotspots');
    root.innerHTML = '';
    this.hs = [];
    if (!state) return;
    const defs = [...(HOTSPOTS[state] || [])];
    const add = (d, getPos, extraCls = '') => {
      const el = document.createElement('div');
      el.className = 'hs ' + (d.side === 'left' ? 'flip ' : '') + extraCls + ' ' + (d.cls || '');
      const label = d[this.lang];
      const num = d.n ? `<i>${d.n}</i>` : '';
      el.innerHTML = (d.side === 'none' ? '' : '<span class="dot"></span>') + `<button class="pill glass">${num}${label}</button>`;
      if (d.go) el.querySelector('.pill').addEventListener('click', () => this.app.go(d.go));
      else el.querySelector('.pill').style.cursor = 'default';
      root.appendChild(el);
      this.hs.push({ el, d, getPos });
    };
    for (const d of defs) add(d, () => this.app.anchor(d.anchor));
    if (state === 'twin' || state.startsWith('b-')) {
      const scr = this.app.screen;
      for (const L of SCREEN_LABELS) {
        const uv = scr.labelUV[L.id];
        if (!uv) continue;
        add({ ...L, go: L.id, side: 'right' }, () => scr.uvToWorld(uv[0], uv[1]), 'screen');
      }
    }
  }

  updateHotspots(camera, w, h) {
    for (const o of this.hs) {
      const p = o.getPos();
      if (!p) { o.el.classList.add('hide'); continue; }
      this.v.copy(p).project(camera);
      const behind = this.v.z > 1 || this.v.z < -1;
      const x = (this.v.x * 0.5 + 0.5) * w, y = (1 - (this.v.y * 0.5 + 0.5)) * h;
      const out = x < -50 || x > w + 50 || y < -50 || y > h + 50;
      o.el.classList.toggle('hide', behind || out);
      const off = o.d.off || [0, 0];
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const dot = 0.425 * rem;
      if (o.d.side === 'left') {
        const ww = o.el.offsetWidth;
        o.el.style.transform = `translate(${x - ww + dot + off[0]}px, ${y - o.el.offsetHeight / 2 + off[1]}px)`;
      } else if (o.d.side === 'none') {
        o.el.style.transform = `translate(${x - o.el.offsetWidth / 2 + off[0]}px, ${y - o.el.offsetHeight / 2 + off[1]}px)`;
      } else {
        o.el.style.transform = `translate(${x - dot + off[0]}px, ${y - o.el.offsetHeight / 2 + off[1]}px)`;
      }
    }
  }

  setVeil(v) { $('veil').style.opacity = v.toFixed(3); }
  setFade(v) { $('fade').style.opacity = v.toFixed(3); }
  progress(p) { $('loadbar').style.width = Math.round(p * 100) + '%'; }
  loaded() { $('loader').classList.add('done'); }
}
