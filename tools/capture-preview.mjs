/**
 * Captures preview screenshots of the landing page via headless Edge.
 * Output: preview/*.png
 */
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9337;
const PAGE = "file:///" + resolve("index.html").replace(/\\/g, "/");
const OUT = resolve("preview");
const profile = mkdtempSync(join(tmpdir(), "edge-shot-"));

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
        rej(new Error("timeout " + method));
      }
    }, 20000);
  });
}

const evaluate = async (expression) => {
  const out = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (out.exceptionDetails) throw new Error(out.exceptionDetails.text);
  return out.result.value;
};

async function shot(name) {
  const { data } = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  const file = join(OUT, name);
  writeFileSync(file, Buffer.from(data, "base64"));
  console.log("saved", file);
}

async function main() {
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break;
    } catch {}
    await sleep(150);
  }
  const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(PAGE)}`, { method: "PUT" })).json();
  ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
    }
  };

  await send("Page.enable");
  await send("Runtime.enable");

  for (let i = 0; i < 60; i++) {
    if (await evaluate("document.readyState === 'complete' && !!document.querySelector('.card')")) break;
    await sleep(200);
  }
  await evaluate("document.fonts.ready.then(() => true)");
  await sleep(900);

  mkdirSync(OUT, { recursive: true });

  // desktop hero
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await evaluate("window.scrollTo(0,0)");
  await sleep(700);
  await shot("desktop-hero.png");

  // catalog
  await evaluate("window.scrollTo(0, document.getElementById('soderzhanie').offsetTop - 40)");
  await sleep(900);
  await shot("desktop-catalog.png");

  // modal
  await evaluate("document.querySelectorAll('.card__hit')[2].click()");
  await sleep(900);
  await shot("desktop-modal.png");
  await evaluate("document.getElementById('disease-modal').close()");
  await sleep(300);

  // contacts
  await evaluate("window.scrollTo(0, document.getElementById('kontakty').offsetTop - 40)");
  await sleep(700);
  await shot("desktop-contacts.png");

  // mobile hero
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate("window.scrollTo(0,0)");
  await sleep(800);
  await shot("mobile-hero.png");

  // mobile catalog + modal
  await evaluate("window.scrollTo(0, document.getElementById('soderzhanie').offsetTop - 20)");
  await sleep(800);
  await shot("mobile-catalog.png");

  await evaluate("document.querySelectorAll('.card__hit')[4].click()");
  await sleep(900);
  await shot("mobile-modal.png");
}

main()
  .catch((e) => {
    console.error("CAPTURE FAILED:", e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { ws && ws.close(); } catch {}
    browser.kill();
    await sleep(400);
    try { rmSync(profile, { recursive: true, force: true }); } catch {}
  });
