/**
 * Runs script.js against a tiny DOM stub to catch runtime errors in
 * renderCards() / openModal() without a browser.
 */
import { readFileSync } from "node:fs";
import vm from "node:vm";

const errors = [];
const listeners = { doc: [], modal: [] };

class El {
  constructor(name = "") {
    this.name = name;
    this.innerHTML = "";
    this.textContent = "";
    this.open = false;
    this.dataset = {};
    this.scrollTop = 0;
    this.attrs = {};
    this.classList = {
      add: () => {},
      remove: () => {},
      toggle: () => {}
    };
    this.style = {};
  }
  addEventListener(type, fn) {
    if (this.name === "modal" && type === "click") listeners.modal.push(fn);
  }
  querySelector() {
    return new El("inner");
  }
  showModal() {
    this.open = true;
  }
  close() {
    this.open = false;
    if (this.onclose) this.onclose();
  }
  focus() {}
  removeAttribute() {}
  setAttribute(k, v) {
    this.attrs[k] = v;
  }
  removeAttribute(k) {
    delete this.attrs[k];
  }
}

const ids = new Map();
const idsNeeded = [
  "disease-grid", "disease-modal", "modal-img", "modal-tag", "modal-index",
  "modal-title", "modal-desc", "modal-facts"
];
for (const id of idsNeeded) ids.set(id, new El(id));
ids.get("disease-modal").name = "modal";

const grid = ids.get("disease-grid");
grid.addEventListener = (type, fn) => {
  if (type === "click") listeners.gridClick = fn;
  if (type === "pointerover" || type === "focusin") listeners[type] = fn;
};

const documentElement = new El("html");
documentElement.addEventListener = (type, fn) => {
  if (type === "click") listeners.doc.push(fn);
};

const documentStub = {
  documentElement,
  getElementById: (id) => ids.get(id) || null,
  querySelector: (sel) => {
    if (sel === ".site-header") return new El("header");
    return null;
  },
  querySelectorAll: () => [],
  addEventListener: documentElement.addEventListener,
  body: { scrollWidth: 1200 }
};

const windowStub = {
  scrollY: 0,
  innerHeight: 900,
  matchMedia: () => ({ matches: false, addEventListener: () => {} }),
  addEventListener: () => {},
  requestAnimationFrame: (cb) => cb(),
  Image: class {
    constructor() {
      this.src = "";
    }
  }
};

const sandbox = {
  window: windowStub,
  document: documentStub,
  HTMLDialogElement: class {},
  Image: windowStub.Image,
  console,
  setTimeout,
  getComputedStyle: () => ({ overflow: "" })
};
sandbox.globalThis = sandbox;

const code = readFileSync("script.js", "utf8");

try {
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: "script.js" });
} catch (e) {
  errors.push("script.js threw: " + e.message);
}

// --- assertions on rendered markup ---
const html = grid.innerHTML;
const cards = (html.match(/<article class="card">/g) || []).length;
if (cards !== 8) errors.push(`rendered ${cards} cards, expected 8`);

for (const piece of ["Шизофрения", "Инфаркт", "Инсульт", "Рак горла", "Гангрена", "Слепота", "Недоношенность", "Эмфизема лёгких"]) {
  if (!html.includes(piece)) errors.push(`missing disease name: ${piece}`);
}
for (const piece of ["images/thumbs/emphysema.webp", 'aria-haspopup="dialog"', "card__hit"]) {
  if (!html.includes(piece)) errors.push(`markup missing: ${piece}`);
}

// --- simulate a card click through the delegated handler ---
const card = { dataset: { index: "2" }, closest: (sel) => (sel === "[data-index]" ? card : null) };
try {
  listeners.doc.forEach((fn) => fn({ target: card }));
} catch (e) {
  errors.push("card click handler threw: " + e.message);
}

const modal = ids.get("disease-modal");
if (!modal.open) errors.push("dialog did not open on card click");
if (ids.get("modal-title").textContent !== "Инсульт") {
  errors.push(`modal title = ${JSON.stringify(ids.get("modal-title").textContent)}`);
}
if (ids.get("modal-tag").textContent !== "Неврология") {
  errors.push(`modal tag = ${JSON.stringify(ids.get("modal-tag").textContent)}`);
}
if ((ids.get("modal-desc").innerHTML.match(/<p>/g) || []).length !== 2) {
  errors.push("modal description should have 2 paragraphs");
}
if ((ids.get("modal-facts").innerHTML.match(/<li>/g) || []).length !== 3) {
  errors.push("modal facts should have 3 items");
}
if (!String(ids.get("modal-img").src).includes("images/large/stroke.webp")) {
  errors.push(`modal image src = ${ids.get("modal-img").src}`);
}
if (ids.get("modal-index").textContent !== "Заболевание 03 из 08") {
  errors.push(`modal index = ${JSON.stringify(ids.get("modal-index").textContent)}`);
}

// --- close through the dialog's own click handler (backdrop) ---
try {
  listeners.modal.forEach((fn) => fn({ target: modal }));
} catch (e) {
  errors.push("modal click handler threw: " + e.message);
}
if (modal.open) errors.push("dialog did not close on backdrop click");

if (errors.length) {
  console.error("SMOKE FAILED:");
  errors.forEach((e) => console.error(" ✗ " + e));
  process.exit(1);
}
console.log(`SMOKE OK: ${cards} cards rendered, modal open/close works`);
