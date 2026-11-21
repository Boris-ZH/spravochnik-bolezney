/**
 * Headless layout / behaviour audit for the landing page.
 * Drives Edge over the Chrome DevTools Protocol (no extra deps).
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9333;
const PAGE = "file:///" + resolve("index.html").replace(/\\/g, "/");
const profile = mkdtempSync(join(tmpdir(), "edge-audit-"));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = spawn(
  EDGE,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-sync",
    "--force-device-scale-factor=1",
    "about:blank"
  ],
  { stdio: "ignore" }
);

let ws;
let nextId = 1;
const pending = new Map();

function send(method, params = {}) {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((res, rej) => {
    pending.set(id, { res, rej });
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        rej(new Error(`timeout: ${method}`));
      }
    }, 15000);
  });
}

async function evaluate(expression) {
  const out = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  if (out.exceptionDetails) {
    throw new Error(out.exceptionDetails.text + " :: " + expression.slice(0, 120));
  }
  return out.result.value;
}

async function waitForBrowser() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) return;
    } catch {}
    await sleep(150);
  }
  throw new Error("browser did not start");
}

async function newTarget(url) {
  const r = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, {
    method: "PUT"
  });
  const t = await r.json();
  return t;
}

async function clickAt(x, y) {
  await send("Input.dispatchMouseEvent", {
    type: "mouseMoved", x, y, button: "none", clickCount: 0
  });
  await send("Input.dispatchMouseEvent", {
    type: "mousePressed", x, y, button: "left", clickCount: 1
  });
  await send("Input.dispatchMouseEvent", {
    type: "mouseReleased", x, y, button: "left", clickCount: 1
  });
}

async function main() {
  await waitForBrowser();
  const target = await newTarget(PAGE);
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
    }
  };

  await send("Page.enable");
  await send("Runtime.enable");

  const results = { url: PAGE, widths: [], modal: {}, consoleErrors: [] };

  let docReady = false;
  for (let i = 0; i < 60; i++) {
    docReady = await evaluate("document.readyState === 'complete' && !!document.querySelector('.card')");
    if (docReady) break;
    await sleep(200);
  }
  if (!docReady) throw new Error("page/cards did not render");
  await sleep(600);

  for (const width of [360, 390, 768, 1024, 1280, 1440]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: width < 600 ? 780 : 900,
      deviceScaleFactor: 1,
      mobile: width < 600
    });
    await evaluate("window.scrollTo(0,0)");
    await sleep(250);

    const info = await evaluate(`(() => {
      const el = (s) => document.querySelector(s);
      const box = (s) => { const n = el(s); if (!n) return null; const r = n.getBoundingClientRect(); return {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)}; };
      const links = [...document.querySelectorAll('.nav__link')];
      const cards = [...document.querySelectorAll('.card')];
      const gridStyle = getComputedStyle(el('.grid')).gridTemplateColumns.split(' ').filter(Boolean);
      const first = cards[0];
      const media = first.querySelector('.card__media');
      const cardImg = first.querySelector('.card__media img');
      return {
        width: window.innerWidth,
        docScrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        cards: cards.length,
        gridColumns: gridStyle.length,
        cardWidth: Math.round(first.getBoundingClientRect().width),
        cardHeight: Math.round(first.getBoundingClientRect().height),
        mediaHeight: Math.round(media.getBoundingClientRect().height),
        mediaRatio: +(media.getBoundingClientRect().width / Math.max(1, media.getBoundingClientRect().height)).toFixed(2),
        cardImgLoaded: cardImg.complete && cardImg.naturalWidth > 0,
        cardIsColumn: first.getBoundingClientRect().height > media.getBoundingClientRect().height + 40,
        brokenImages: [...document.images].filter(i => i.getAttribute('src') && (!i.complete || i.naturalWidth === 0)).map(i => i.currentSrc.split('/').pop()),
        header: box('.site-header'),
        navLinks: links.map(l => ({ text: l.textContent.trim(), w: Math.round(l.getBoundingClientRect().width), h: Math.round(l.getBoundingClientRect().height) })),
        navOnOneRow: links.every(l => Math.abs(l.getBoundingClientRect().top - links[0].getBoundingClientRect().top) < 2),
        heroTitle: box('.hero__title'),
        heroTitleFont: getComputedStyle(el('.hero__title')).fontSize,
        emblem: box('.emblem'),
        emblemBelowTitle: el('.emblem').getBoundingClientRect().top > el('.hero__title').getBoundingClientRect().bottom,
        heroBottom: Math.round(el('.hero').getBoundingClientRect().bottom),
        footerLink: (el('.site-footer__link') || {}).textContent,
        fontSize: getComputedStyle(document.body).fontSize
      };
    })()`);

    results.widths.push(info);
  }

  // ---- sticky header, anchor offsets, nav state ----
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1280, height: 900, deviceScaleFactor: 1, mobile: false
  });
  await evaluate("window.scrollTo(0,0)");
  await sleep(250);
  await evaluate("window.scrollTo(0, 700)");
  await sleep(350);
  results.sticky = await evaluate(`(() => {
    const h = document.querySelector('.site-header');
    const r = h.getBoundingClientRect();
    return {top: Math.round(r.top), height: Math.round(r.height), isScrolled: h.classList.contains('is-scrolled'), isSticky: getComputedStyle(h).position};
  })()`);

  await evaluate("location.hash = '#soderzhanie'");
  await sleep(1400);
  results.anchorCatalog = await evaluate(`(() => {
    const sec = document.getElementById('soderzhanie');
    const head = document.querySelector('.site-header');
    return {
      sectionTop: Math.round(sec.getBoundingClientRect().top),
      headerHeight: Math.round(head.getBoundingClientRect().height),
      activeNav: [...document.querySelectorAll('.nav__link.is-active')].map(l => l.textContent.trim())
    };
  })()`);

  await evaluate("location.hash = '#kontakty'");
  await sleep(1600);
  results.anchorContacts = await evaluate(`(() => ({
    sectionTop: Math.round(document.getElementById('kontakty').getBoundingClientRect().top),
    activeNav: [...document.querySelectorAll('.nav__link.is-active')].map(l => l.textContent.trim())
  }))()`);

  await evaluate("location.hash = ''; window.scrollTo(0,0)");
  await sleep(400);

  // ---- modal behaviour at desktop ----
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1280, height: 900, deviceScaleFactor: 1, mobile: false
  });
  await evaluate("window.scrollTo(0, document.getElementById('soderzhanie').offsetTop)");
  await sleep(300);

  const opened = await evaluate(`(() => {
    document.querySelectorAll('.card__hit')[2].click();
    const d = document.getElementById('disease-modal');
    const r = d.getBoundingClientRect();
    return {
      open: d.open,
      title: document.getElementById('modal-title').textContent,
      tag: document.getElementById('modal-tag').textContent,
      descParas: document.querySelectorAll('#modal-desc p').length,
      facts: document.querySelectorAll('#modal-facts li').length,
      imgLoaded: (() => { const i = document.getElementById('modal-img'); return i.complete && i.naturalWidth > 0; })(),
      imgSrc: document.getElementById('modal-img').currentSrc.split('/').slice(-2).join('/'),
      rect: {left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom)},
      viewport: {w: innerWidth, h: innerHeight},
      bodyOverflow: getComputedStyle(document.documentElement).overflow,
      panelDirection: getComputedStyle(document.querySelector('.modal__panel')).flexDirection,
      bodyScrollable: (() => { const b = document.querySelector('.modal__body'); return {h: b.clientHeight, sh: b.scrollHeight, oy: getComputedStyle(b).overflowY}; })(),
      activeElement: document.activeElement.className || document.activeElement.tagName
    };
  })()`);
  results.modal.desktopOpen = opened;
  await sleep(400);
  results.modal.desktopImg = await evaluate(
    `(() => { const i = document.getElementById('modal-img'); return {complete: i.complete, w: i.naturalWidth, h: i.naturalHeight}; })()`
  );

  // close via X (real mouse click)
  const closeRect = await evaluate(`(() => { const r = document.querySelector('.modal__close').getBoundingClientRect(); return {x: r.x + r.width/2, y: r.y + r.height/2}; })()`);
  await clickAt(closeRect.x, closeRect.y);
  await sleep(300);
  results.modal.closedByX = await evaluate("!document.getElementById('disease-modal').open");
  results.modal.bodyUnlocked = await evaluate("getComputedStyle(document.documentElement).overflow !== 'hidden'");

  // reopen, close via backdrop (click near the viewport corner)
  await evaluate("document.querySelectorAll('.card__hit')[0].click()");
  await sleep(300);
  await clickAt(6, 6);
  await sleep(300);
  results.modal.closedByBackdrop = await evaluate("!document.getElementById('disease-modal').open");

  // reopen, close via Escape
  await evaluate("document.querySelectorAll('.card__hit')[1].click()");
  await sleep(300);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await sleep(300);
  results.modal.closedByEscape = await evaluate("!document.getElementById('disease-modal').open");

  // ---- modal on a phone viewport ----
  await send("Emulation.setDeviceMetricsOverride", {
    width: 360, height: 760, deviceScaleFactor: 1, mobile: true
  });
  await sleep(250);
  const mobileModal = await evaluate(`(() => {
    document.querySelectorAll('.card__hit')[5].click();
    const d = document.getElementById('disease-modal');
    const r = d.getBoundingClientRect();
    const panel = document.querySelector('.modal__panel');
    return {
      open: d.open,
      rect: {left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom)},
      viewport: {w: innerWidth, h: innerHeight},
      panelScrollable: (() => { const b = document.querySelector('.modal__body'); return b.scrollHeight > b.clientHeight; })(),
      bodyOverflowY: getComputedStyle(document.querySelector('.modal__body')).overflowY,
      docOverflowX: document.documentElement.scrollWidth - innerWidth,
      mediaHeight: Math.round(document.querySelector('.modal__media').getBoundingClientRect().height)
    };
  })()`);
  results.modal.mobileOpen = mobileModal;
  await evaluate("document.getElementById('disease-modal').close()");

  // ---- horizontal scroll check at 320px (smallest common phone) ----
  await send("Emulation.setDeviceMetricsOverride", {
    width: 320, height: 640, deviceScaleFactor: 1, mobile: true
  });
  await sleep(250);
  results.narrow320 = await evaluate(`(() => ({
    overflowX: document.documentElement.scrollWidth - innerWidth,
    navFits: [...document.querySelectorAll('.nav__link')].every(l => l.scrollWidth <= l.clientWidth + 1),
    cardWidth: Math.round(document.querySelector('.card').getBoundingClientRect().width),
    gridColumns: getComputedStyle(document.querySelector('.grid')).gridTemplateColumns.split(' ').filter(Boolean).length
  }))()`);

  await evaluate("window.scrollTo(0, document.body.scrollHeight)");
  await sleep(300);

  console.log(JSON.stringify(results, null, 2));
}

main()
  .catch((e) => {
    console.error("AUDIT FAILED:", e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { ws && ws.close(); } catch {}
    browser.kill();
    await sleep(400);
    try { rmSync(profile, { recursive: true, force: true }); } catch {}
  });
