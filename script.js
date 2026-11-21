/* =========================================================
   Справочник болезней — данные и интерактивность
   ========================================================= */

const DISEASES = [
  {
    slug: "schizophrenia",
    name: "Шизофрения",
    category: "Психиатрия",
    teaser: "Эндогенное расстройство мышления, восприятия и воли.",
    desc: [
      "Эндогенное психическое расстройство, при котором страдают мышление, восприятие, эмоции и воля. Типичные проявления — слуховые галлюцинации, бред, разорванность речи, эмоциональная уплощённость и социальная изоляция. Болезнь обычно дебютирует в возрасте 16–30 лет.",
      "Биологическую основу связывают с нарушением дофаминовой и глутаматной передачи в мозге, а наследственность остаётся одним из главных факторов риска. Диагноз ставит врач-психиатр по клинической картине. Современная терапия сочетает антипсихотики с психосоциальной реабилитацией: при раннем начале помощи многие пациенты возвращаются к активной жизни."
    ],
    facts: [
      "Около 24 млн человек в мире живут с шизофренией (ВОЗ)",
      "Дебют чаще приходится на возраст 16–30 лет",
      "Лечение: антипсихотики и психосоциальная реабилитация"
    ]
  },
  {
    slug: "myocardial-infarction",
    name: "Инфаркт",
    category: "Кардиология",
    teaser: "Омертвение участка сердца из-за закупорки коронарной артерии.",
    desc: [
      "Острое состояние, при котором из-за прекращения кровотока в коронарной артерии погибает участок сердечной мышцы. Чаще всего причина — разрыв атеросклеротической бляшки и образование тромба.",
      "Классический симптом — давящая или жгучая боль за грудиной дольше 15–20 минут, отдающая в левую руку, шею или нижнюю челюсть, вместе с холодным потом, тошнотой и страхом. Диагноз подтверждают ЭКГ и рост тропонинов. Решающий фактор — время: восстановить кровоток нужно в первые часы с помощью чрескожного вмешательства или тромболизиса."
    ],
    facts: [
      "Ишемическая болезнь сердца — ведущая причина смерти в мире",
      "Кровоток важно восстановить в первые 90–120 минут",
      "После инфаркта обязательна вторичная профилактика"
    ]
  },
  {
    slug: "stroke",
    name: "Инсульт",
    category: "Неврология",
    teaser: "Острая гибель нейронов при нарушении мозгового кровотока.",
    desc: [
      "Острое нарушение мозгового кровообращения, при котором нейроны погибают без крови и кислорода. В 80–85 % случаев инсульт ишемический — сосуд закупоривает тромб или эмбол; остальные случаи геморрагические, связанные с разрывом сосуда.",
      "Симптомы появляются внезапно: слабость или онемение руки и ноги, асимметрия лица, невнятная речь, выпадение поля зрения, резкая головная боль. Диагноз уточняют с помощью нейровизуализации. Тромболизис эффективен в первые 4,5 часа, механическая тромбэктомия — до 24 часов при подходящих показаниях."
    ],
    facts: [
      "Вторая по частоте причина смерти в мире",
      "Тест FAST: лицо, рука, речь, время",
      "Реабилитация начинается уже в стационаре"
    ]
  },
  {
    slug: "throat-cancer",
    name: "Рак горла",
    category: "Онкология",
    teaser: "Злокачественные опухоли гортани и глотки.",
    desc: [
      "Собирательное название злокачественных новообразований гортани и глотки; чаще всего это плоскоклеточный рак. Главные факторы риска — курение и злоупотребление алкоголем, в части случаев — вирус папилломы человека.",
      "Ранние признаки легко принять за простуду: стойкая осиплость голоса, ощущение кома в горле, боль при глотании, покашливание, увеличенные лимфоузлы на шее. Диагноз ставят после ларингоскопии и биопсии. Лечение комбинированное — хирургия, лучевая и химиотерапия; при раннем выявлении прогноз значительно лучше и голос чаще удаётся сохранить."
    ],
    facts: [
      "Курение повышает риск в несколько раз",
      "Осиплость дольше 3 недель — повод к осмотру",
      "Вакцинация против ВПЧ относится к профилактике"
    ]
  },
  {
    slug: "gangrene",
    name: "Гангрена",
    category: "Хирургия",
    teaser: "Омертвение тканей при критической ишемии или инфекции.",
    desc: [
      "Некроз, то есть омертвение тканей, которые утратили жизнеспособность. Сухая гангрена развивается при постепенном нарушении кровоснабжения, обычно на пальцах и стопах; влажная возникает при остром тромбозе или присоединении инфекции и распространяется быстро.",
      "Причины — критическая ишемия при атеросклерозе и сахарном диабете, обморожения, травмы, сдавление сосудов. Характерны почернение кожи, отсутствие пульса, боль; при влажной форме — отёк и зловонный запах. Лечение хирургическое: антибиотики, восстановление кровотока, при необходимости ампутация."
    ],
    facts: [
      "Диабетическая стопа — частая причина гангрены",
      "Влажная гангрена требует неотложной помощи",
      "Профилактика: контроль глюкозы и осмотр стоп"
    ]
  },
  {
    slug: "blindness",
    name: "Слепота",
    category: "Офтальмология",
    teaser: "Полная или практическая утрата зрения.",
    desc: [
      "Полная или практическая утрата зрения, при которой человек не может ориентироваться без посторонней помощи. Обратимая слепота возникает при катаракте, кератитах и части форм глаукомы; необратимая — при поражении сетчатки и зрительного нерва: диабетической ретинопатии, возрастной макулярной дегенерации, отслойке сетчатки, травмах.",
      "По оценкам ВОЗ, нарушения зрения есть примерно у 2,2 млрд человек, и значительная часть случаев предотвратима. Ключевую роль играют регулярный скрининг, контроль уровня глюкозы и давления, защита глаз от травм, а также своевременное лечение катаракты."
    ],
    facts: [
      "До 80 % нарушений зрения предотвратимы или излечимы (ВОЗ)",
      "Диабетическая ретинопатия — ведущая предотвратимая причина",
      "Помогают трость, тифлотехника и обучение"
    ]
  },
  {
    slug: "prematurity",
    name: "Недоношенность",
    category: "Неонатология",
    teaser: "Рождение раньше 37-й недели и незрелость систем организма.",
    desc: [
      "Состояние ребёнка, рождённого ранее 37-й недели беременности. Незрелость органов определяет основные проблемы: дыхательные расстройства из-за дефицита сурфактанта, несовершенную терморегуляцию, слабый иммунитет, трудности с питанием.",
      "Чем меньше срок гестации и масса тела, тем выше потребность в интенсивной помощи. Выживание обеспечивают выхаживание в инкубаторе, респираторная поддержка, парентеральное питание и метод «кенгуру». При сроке 28–32 недели в странах с доступной медицинской помощью выживает более 90 % детей, но многим затем требуется наблюдение и реабилитация."
    ],
    facts: [
      "Около 15 млн детей рождаются недоношенными (ВОЗ)",
      "Метод «кенгуру» снижает смертность и риск инфекций",
      "Наблюдение за развитием продолжается до школы"
    ]
  },
  {
    slug: "emphysema",
    name: "Эмфизема лёгких",
    category: "Пульмонология",
    teaser: "Разрушение альвеол и потеря эластичности лёгких.",
    desc: [
      "Заболевание, при котором альвеолы перерастягиваются, а их стенки разрушаются. Лёгкие теряют эластичность и не могут полноценно выдыхать воздух, поэтому он задерживается в дыхательных путях.",
      "Чаще всего эмфизема развивается как часть ХОБЛ на фоне длительного курения и воздействия пыли; редкая форма связана с наследственным дефицитом альфа-1-антитрипсина. Одышка при нагрузке нарастает постепенно, появляются кашель и «бочкообразная» грудная клетка. Изменения необратимы, но отказ от курения, бронхолитики, дыхательная реабилитация и кислородотерапия замедляют прогрессирование."
    ],
    facts: [
      "ХОБЛ — третья причина смерти в мире (ВОЗ)",
      "Отказ от курения замедляет болезнь сильнее любого лекарства",
      "Вакцинация снижает частоту обострений"
    ]
  }
];

const grid = document.getElementById("disease-grid");
const modal = document.getElementById("disease-modal");
const modalImg = document.getElementById("modal-img");
const modalTag = document.getElementById("modal-tag");
const modalIndex = document.getElementById("modal-index");
const modalTitle = document.getElementById("modal-title");
const modalDesc = document.getElementById("modal-desc");
const modalFacts = document.getElementById("modal-facts");

const pad = (n) => String(n).padStart(2, "0");
const thumbSrc = (slug) => `images/thumbs/${slug}.webp`;
const largeSrc = (slug) => `images/large/${slug}.webp`;

/* ---------- Рендер каталога ---------- */

function renderCards() {
  const html = DISEASES.map((d, i) => {
    const number = pad(i + 1);
    return `
      <article class="card">
        <div class="card__media">
          <img src="${thumbSrc(d.slug)}" alt="Иллюстрация заболевания «${d.name}»"
               width="760" height="700" loading="lazy" decoding="async">
          <span class="card__num" aria-hidden="true">${number}</span>
          <span class="card__tag">${d.category}</span>
        </div>
        <div class="card__body">
          <h3 class="card__title">${d.name}</h3>
          <p class="card__teaser">${d.teaser}</p>
          <span class="card__hint">
            Читать описание
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
              <path d="M3 8h10M8.5 3.5 13 8l-4.5 4.5" stroke="currentColor" stroke-width="1.5"
                    stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </div>
        <button class="card__hit" type="button" data-index="${i}"
                aria-label="Открыть описание: ${d.name}" aria-haspopup="dialog"></button>
      </article>`;
  }).join("");

  grid.innerHTML = html;
}

/* ---------- Попап ---------- */

let lastTrigger = null;

function openModal(index) {
  const d = DISEASES[index];
  if (!d) return;

  modalImg.src = largeSrc(d.slug);
  modalImg.alt = `Иллюстрация заболевания «${d.name}»`;
  modalTag.textContent = d.category;
  modalIndex.textContent = `Заболевание ${pad(index + 1)} из ${pad(DISEASES.length)}`;
  modalTitle.textContent = d.name;
  modalDesc.innerHTML = d.desc.map((p) => `<p>${p}</p>`).join("");
  modalFacts.innerHTML = d.facts.map((f) => `<li>${f}</li>`).join("");

  const body = modal.querySelector(".modal__body");
  const panel = modal.querySelector(".modal__panel");
  if (body) body.scrollTop = 0;
  if (panel) panel.scrollTop = 0;

  document.documentElement.classList.add("modal-open");
  modal.showModal();
}

function closeModal() {
  if (modal.open) modal.close();
}

document.documentElement.addEventListener("click", (e) => {
  const openBtn = e.target.closest("[data-index]");
  if (openBtn) {
    lastTrigger = openBtn;
    openModal(Number(openBtn.dataset.index));
    return;
  }

  if (e.target.closest("[data-modal-close]")) {
    closeModal();
  }
});

// закрытие по клику (тапу) вне попапа: клик по фону целится в сам <dialog>
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

modal.addEventListener("close", () => {
  document.documentElement.classList.remove("modal-open");
  if (lastTrigger) {
    lastTrigger.focus({ preventScroll: true });
    lastTrigger = null;
  }
});

/* ---------- Предзагрузка крупных изображений ---------- */

const preloaded = new Set();
function preloadLarge(slug) {
  if (preloaded.has(slug)) return;
  preloaded.add(slug);
  const img = new Image();
  img.src = largeSrc(slug);
}

const hoverCapable = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
if (hoverCapable) {
  grid.addEventListener("pointerover", (e) => {
    const btn = e.target.closest(".card__hit");
    if (!btn) return;
    const d = DISEASES[Number(btn.dataset.index)];
    if (d) preloadLarge(d.slug);
  });

  grid.addEventListener("focusin", (e) => {
    const btn = e.target.closest(".card__hit");
    if (!btn) return;
    const d = DISEASES[Number(btn.dataset.index)];
    if (d) preloadLarge(d.slug);
  });
}

/* ---------- Шапка и подсветка навигации ---------- */

const header = document.querySelector(".site-header");
const navLinks = Array.from(document.querySelectorAll("[data-nav]"));
const sections = [
  { id: "soderzhanie", el: document.getElementById("soderzhanie") },
  { id: "kontakty", el: document.getElementById("kontakty") }
].filter((s) => s.el);

function setActive(id) {
  navLinks.forEach((link) => {
    const isActive = link.dataset.nav === id;
    link.classList.toggle("is-active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "true");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  window.requestAnimationFrame(() => {
    const y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 8);

    const probe = y + window.innerHeight * 0.35;
    let current = "top";
    sections.forEach((s) => {
      if (s.el.offsetTop <= probe) current = s.id;
    });
    // «Контакты» становятся активными только у самого низа страницы
    if (current === "kontakty" && y + window.innerHeight < document.documentElement.scrollHeight - 40) {
      current = "soderzhanie";
    }
    setActive(current);

    ticking = false;
  });
}

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll, { passive: true });

renderCards();
onScroll();
