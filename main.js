(() => {
  const $ = (s, r = document) => r.querySelector(s);
  // *word* in data.js = highlight. Only for trusted site text, never attributes.
  // Thai has no spaces between words, so browsers may wrap mid-word (ผู้|ใช้). Each space-separated phrase up to 20 chars
  // is one unit (.ph) that only wraps inside itself if wider than the line; longer ones wrap normally. KEEP words never split. *x* = highlight.
  // ponytail: compound words the line breaker splits in our copy (found by a wrap audit at 320-1920px); add more if new text breaks badly
  const KEEP = /ผลงาน|ตรงไหน|พร้อมกัน|ร่วมกัน|โปรดักต์|โปรเจกต์|เสียบสาย|เวลาจำกัด|ผู้ใช้|ผู้ปกครอง|ผู้เชี่ยวชาญ|ต่างระบบ|ตัวแอป|ปัญหาจริง|ใช้จริง|ประเทศไทย|วิธีคิด|ทันที|เขียนโค้ด|บทบาท|เปิดแอป|ผจญภัย|มหาวิทยาลัย|ยากกว่า|ส่งงาน|เป้าหมาย|โครงงาน|ขั้นตอน|ความ(?:พยายาม|กดดัน|คาดหวัง)|ครั้งแรก|หน่วยเสียง|สิ่งจำเป็น|ต่างคนต่างทำ|คุณค่า|ลูกค้า|ข้อมูล|ละเอียดอ่อน|มิตรภาพ|จริงจัง|ใช้ได้จริง|แผนสำรอง|หลายส่วน|กลับบ้าน/g;
  const hl = (s) => esc(s).split(/ (?=(?:[^*]*\*[^*]*\*)*[^*]*$)/).map((c) => ((c = c.replace(KEEP, '<span class="nw">$&</span>'), c.replace(/<[^>]+>/g, "").length <= 20 ? `<span class="ph">${c}</span>` : c)).replace(/\*(.+?)\*/g, '<b class="hl">$1</b>')).join(" ").replace(/\n/g, "<br>");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const RAR = { legendary: "Legendary", epic: "Epic", rare: "Rare" };
  const YEAR = { Ongoing: "Ongoing · ปัจจุบัน" };
  const Q = window.QUESTS || [];
  const T = (src) => src.replace("assets/", "assets/t/"); // 480px thumbnail of the same image

  // ---------- home: timeline (newest first, grouped by year) ----------
  const tl = $("#timeline");
  if (tl) {
    let last = null, html = "";
    for (const q of Q) {
      if (q.year !== last) { html += `<div class="tl-year" data-year="${q.year}"><span>${esc(YEAR[q.year] || q.year)}</span></div>`; last = q.year; }
      html += `
        <a class="tl-item rar-${q.rarity} reveal${q.hero ? " is-main" : ""}" data-rarity="${q.rarity}" data-year="${q.year}" href="quest.html?q=${q.id}">
          <span class="tl-date">${esc(q.date)}</span>
          <span class="tl-rail" aria-hidden="true"></span>
          <div class="tl-card sheen">
            <div class="tl-thumb${q.fit === "contain" ? " contain" : ""}"><img src="${T(q.cover)}" alt="" loading="lazy" decoding="async" width="264" height="165"></div>
            <div>
              <div class="tl-tags"><span class="rar rar-${q.rarity}">${RAR[q.rarity]}</span>${q.hero ? '<span class="rar main">Main Quest</span>' : ""}</div>
              <h3>${esc(q.title)}</h3>
              <p class="event">${hl(q.event)}</p>
              <p class="result">${hl(q.result)}</p>
            </div>
            ${arrow}
          </div>
        </a>`;
    }
    tl.innerHTML = html;

    // rarity filter: hide non-matching rows, then year headers left empty
    document.querySelectorAll(".filter").forEach((btn) => btn.addEventListener("click", () => {
      const f = btn.dataset.filter;
      document.querySelectorAll(".filter").forEach((b) => { const on = b === btn; b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", on); });
      document.querySelectorAll(".tl-item, #side-list .mq-card").forEach((it) => { it.hidden = f !== "all" && it.dataset.rarity !== f; });
      tl.querySelectorAll(".tl-year").forEach((y) => { y.hidden = !tl.querySelector(`.tl-item[data-year="${y.dataset.year}"]:not([hidden])`); });
    }));
  }

  // ---------- home: side quests = every quest without its own chapter, ranked by rarity ----------
  const side = $("#side-list");
  if (side) {
    const CH = ["rov", "posn", "zeitop", "ctf", "wordflow", "docode"], ORDER = { legendary: 0, epic: 1, rare: 2 };
    side.innerHTML = Q.filter((q) => !CH.includes(q.id)).sort((a, b) => ORDER[a.rarity] - ORDER[b.rarity]).map((q, i) => `
      <a class="mq-card rar-${q.rarity} sheen reveal" data-rarity="${q.rarity}" href="quest.html?q=${q.id}">
        <span class="rank-no" aria-label="อันดับ ${i + 1}">#${i + 1}</span>
        <div class="tl-thumb${q.fit === "contain" ? " contain" : ""}"><img src="${T(q.cover)}" alt="" loading="lazy" decoding="async" width="400" height="250"></div>
        <div class="mq-card-body">
          <div class="tl-tags"><span class="rar rar-${q.rarity}">${RAR[q.rarity]}</span><span class="mq-date">${esc(q.date)}</span></div>
          <h3>${esc(q.title)}</h3>
          <span class="mq-ev">${hl(q.event)}</span>
          <p>${hl(q.result)}</p>
        </div>
      </a>`).join("");
  }

  // full timeline sits collapsed under side quests; links to #timeline-sec (e.g. quest page back link) open it
  const tlAll = $("#timeline-sec");
  const openTl = () => { if (tlAll && location.hash === "#timeline-sec") { tlAll.open = true; tlAll.scrollIntoView(); } };
  openTl();
  addEventListener("hashchange", openTl);

  // ---------- home: skills ----------
  const skills = $("#skills");
  if (skills) {
    const row = (s) => `
      <div class="skill${s.max ? " max" : ""}"${s.can ? ' tabindex="0"' : ""}>
        <span class="name">${esc(s.name)}</span>
        <span class="lvbar" style="--lv:${s.lv}" role="img" aria-label="เลเวล ${s.max ? "สูงสุด" : s.lv + " จาก 10"}"></span>
        <span class="lvtxt">${s.max ? "LV MAX" : "LV " + s.lv}</span>
        ${s.can ? `<p class="can">${hl(s.can)}</p>` : ""}
      </div>`;
    // top 8 by level up front, the rest folded (sort is stable, so ties keep data.js order)
    const all = (window.SKILLS || []).flatMap((g) => g.items).sort((a, b) => b.lv - a.lv);
    skills.innerHTML = all.slice(0, 8).map(row).join("") +
      (all.length > 8 ? `<details class="sk-more"><summary>ดูทั้งหมด (${all.length})</summary>${all.slice(8).map(row).join("")}</details>` : "");
  }

  // ---------- hero card: top 6 attributes as bars ----------
  const cs = $("#card-stats");
  if (cs) cs.innerHTML = [...(window.STATS || [])].sort((a, b) => b.value - a.value).slice(0, 6).map((s) =>
    `<li><span>${esc(s.key)}</span><b>${s.value}</b><i style="--v:${s.value}%"></i></li>`).join("");

  // ---------- home: radar ----------
  const radar = $("#radar");
  if (radar) {
    const S = window.STATS || [];
    const c = 210, R = 140, n = S.length;
    const at = (i, r) => {
      const a = (Math.PI * 2 * i) / n - Math.PI / 2;
      return [c + r * Math.cos(a), c + r * Math.sin(a)];
    };
    const poly = (r) => S.map((_, i) => at(i, r).map((v) => v.toFixed(1)).join(",")).join(" ");
    let svg = [0.25, 0.5, 0.75, 1].map((k) => `<polygon class="ring" points="${poly(R * k)}"/>`).join("");
    svg += S.map((_, i) => { const [x, y] = at(i, R); return `<line class="spoke" x1="${c}" y1="${c}" x2="${x}" y2="${y}"/>`; }).join("");
    svg += `<g class="shape"><polygon class="area" points="${S.map((s, i) => at(i, (R * s.value) / 100).join(",")).join(" ")}"/>`;
    svg += S.map((s, i) => {
      const [x, y] = at(i, (R * s.value) / 100);
      return `<circle class="hit" cx="${x}" cy="${y}" r="16" tabindex="0" role="img" data-i="${i}" aria-label="${esc(s.key)}: ${esc(s.can)}"/><circle class="pt" cx="${x}" cy="${y}" r="5"/>`;
    }).join("") + "</g>";
    svg += S.map((s, i) => {
      const [x, y] = at(i, R + 30);
      const dx = x - c;
      const anchor = Math.abs(dx) < 8 ? "middle" : dx > 0 ? "start" : "end";
      return `<text class="lbl" x="${x}" y="${y + 5}" text-anchor="${anchor}">${esc(s.key.toUpperCase())}</text>`;
    }).join("");
    radar.innerHTML = svg;
    radar.setAttribute("aria-label", "กราฟ Attribute: " + S.map((s) => s.key).join(", "));

    const tip = $("#radar-tip");
    const show = (el) => {
      const s = S[el.dataset.i];
      // rects are in zoomed (visual) px, style px get zoomed again -> divide by body zoom
      const z = parseFloat(getComputedStyle(document.body).zoom) || 1;
      const box = radar.getBoundingClientRect(), wrap = radar.parentElement.getBoundingClientRect();
      const vb = radar.viewBox.baseVal, k = box.width / vb.width / z;
      tip.innerHTML = `<b>${esc(s.key)}</b><br>${esc(s.can)}`;
      tip.style.left = `${(box.left - wrap.left) / z + (el.cx.baseVal.value - vb.x) * k}px`;
      tip.style.top = `${(box.top - wrap.top) / z + (el.cy.baseVal.value - vb.y) * k}px`;
      tip.classList.add("show");
    };
    const hide = () => tip.classList.remove("show");
    radar.querySelectorAll(".hit").forEach((h) => {
      h.addEventListener("pointerenter", () => show(h));
      h.addEventListener("focus", () => show(h));
      h.addEventListener("pointerleave", hide);
      h.addEventListener("blur", hide);
    });
  }

  // ---------- quest detail page ----------
  const root = $("#quest");
  if (root) {
    const id = new URLSearchParams(location.search).get("q");
    const i = Q.findIndex((q) => q.id === id);
    if (i < 0) {
      root.innerHTML = `<div class="container empty"><p class="eyebrow">404 · Quest not found</p><h1>ไม่พบภารกิจนี้</h1><p>อาจจะยังไม่ได้ปลดล็อก หรือลิงก์ผิด</p><a class="btn btn-primary" href="index.html#timeline-sec">กลับไปไทม์ไลน์</a></div>`;
    } else {
      const q = Q[i], newer = Q[i - 1], older = Q[i + 1];
      document.title = `${q.title} · ธนราชันย์ สุวรรณศรี`;
      root.classList.add(`rar-${q.rarity}`);
      const li = (arr) => arr.map((t) => `<li>${hl(t)}</li>`).join("");
      // 2+ pictures and no video: cover becomes an arrow slideshow instead of a screenshot grid
      const pics = !q.video && q.gallery.length > 1 ? q.gallery : null;
      const when = q.duration ? `${q.date} · ${q.duration}` : q.date;
      const meta = [["ผลงาน", q.result], ["ระดับ", q.level], ["บทบาท", q.role], ["ช่วงเวลา", when]];
      const back = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6"/></svg>`;
      root.innerHTML = `
        <header class="q-top">
          <div class="container">
            <a class="back" href="index.html#timeline-sec">${back} กลับไปไทม์ไลน์</a>
            <div class="q-head">
              <div>
                <div class="tl-tags"><span class="rar rar-${q.rarity}">${RAR[q.rarity]} Quest</span>${q.main ? '<span class="rar main">Main Quest</span>' : ""}</div>
                <h1>${esc(q.title)}</h1>
                <p class="event">${hl(q.event)}</p>
                <p class="summary">${hl(q.summary)}</p>
                ${q.live ? `<a class="btn btn-primary" href="${q.live}" target="_blank" rel="noopener">${q.liveLabel || "เปิดเว็บจริง"} ${back}</a>` : ""}
              </div>
              ${q.video ? `<div class="q-media"><div class="q-cover video"><video src="${q.video}" poster="${q.poster}" controls preload="metadata" playsinline aria-label="วิดีโอเดโม ${esc(q.title)}"></video></div></div>` : pics ? `<div class="q-media"><div class="q-cover slides">
                  <img id="slide" src="${pics[0].src}" alt="${esc(pics[0].cap)}" data-full="${pics[0].src}" data-cap="${esc(pics[0].cap)}" width="900" height="560">
                  <button class="sl-btn prev" type="button" data-step="-1" aria-label="รูปก่อนหน้า">${back}</button>
                  <button class="sl-btn" type="button" data-step="1" aria-label="รูปถัดไป">${back}</button>
                </div><p class="sl-cap"><span id="slide-cap">${esc(pics[0].cap)}</span><span id="slide-n">1 / ${pics.length}</span></p></div>`
                : `<div class="q-cover${q.fit === "contain" ? " contain" : ""}"><img src="${q.cover}" alt="${esc(q.title)}" width="900" height="560"></div>`}
            </div>
            <div class="meta">${meta.map(([k, v]) => `<div><small>${k}</small><b>${hl(v)}</b></div>`).join("")}</div>
          </div>
        </header>
        <div class="container">
          <div class="q-body">
            <div>
              <div class="panel reveal"><h2>Mission Brief</h2><ul class="list">${li(q.brief)}</ul></div>
              <div class="panel reveal"><h2>สิ่งที่ผมทำ</h2><ul class="list">${li(q.did)}</ul></div>
            </div>
            <div>
              <div class="panel reveal"><h2>Loadout</h2><div class="chips">${q.stack.map((s) => `<span class="chip">${esc(s)}</span>`).join("")}</div></div>
              <div class="panel reveal"><h2>บทเรียน</h2><ul class="list">${li(q.loot)}</ul></div>
              <div class="panel reveal"><p class="note"><small>บันทึกผู้เล่น</small>${hl(q.note)}</p></div>
            </div>
          </div>
          ${pics ? '<div style="padding-bottom:64px"></div>' : `<h2 class="eyebrow" style="margin-bottom:16px">Screenshots · หลักฐาน</h2>
          <div class="gallery">${q.gallery.map((g) => `
            <button class="shot reveal" type="button" data-full="${g.src}" data-cap="${esc(g.cap)}">
              <img src="${T(g.src)}" alt="${esc(g.cap)}" loading="lazy" decoding="async" width="480" height="360"><span>${esc(g.cap)}</span>
            </button>`).join("")}</div>`}
          <nav class="q-nav" aria-label="ภารกิจอื่น">
            ${newer ? `<a href="quest.html?q=${newer.id}"><small>← ภารกิจที่ใหม่กว่า</small><b>${esc(newer.title)}</b></a>` : "<span></span>"}
            ${older ? `<a class="next" href="quest.html?q=${older.id}"><small>ภารกิจก่อนหน้านั้น →</small><b>${esc(older.title)}</b></a>` : ""}
          </nav>
        </div>`;
    }
  }

  // ---------- scroll: quest path lights up as you pass each quest ----------
  const items = document.querySelectorAll(".tl-item");
  if (items.length) {
    let queued = false;
    const tick = () => {
      queued = false;
      const line = innerHeight * 0.6;
      items.forEach((it) => {
        const r = it.getBoundingClientRect();
        it.style.setProperty("--fill", Math.min(1, Math.max(0, (line - r.top) / r.height)).toFixed(3));
        it.classList.toggle("lit", r.top + 31 < line); // 31px = diamond centre
      });
    };
    addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(tick); } }, { passive: true });
    addEventListener("resize", tick);
    tick();
  }

  // ---------- quest cover slideshow: arrows step through q.gallery, auto-advance every 5s ----------
  const slide = $("#slide");
  if (slide) {
    const G = Q.find((q) => q.id === new URLSearchParams(location.search).get("q")).gallery;
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const step = (d) => {
      const i = (G.findIndex((g) => g.src === slide.dataset.full) + d + G.length) % G.length;
      slide.src = slide.dataset.full = G[i].src;
      slide.alt = slide.dataset.cap = $("#slide-cap").textContent = G[i].cap;
      $("#slide-n").textContent = `${i + 1} / ${G.length}`;
      if (!calm) slide.animate([{ transform: `translateX(${d * 40}%)`, opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 500, easing: "cubic-bezier(.2,.8,.2,1)" });
    };
    let timer;
    const play = () => { clearInterval(timer); if (!calm) timer = setInterval(() => document.hidden || step(1), 5000); };
    const box = slide.parentElement;
    box.addEventListener("click", (e) => { const b = e.target.closest("[data-step]"); if (b) { step(+b.dataset.step); play(); } });
    // pause while the viewer is looking at / using it
    box.addEventListener("pointerenter", () => clearInterval(timer));
    box.addEventListener("pointerleave", play);
    box.addEventListener("focusin", () => clearInterval(timer));
    box.addEventListener("focusout", play);
    play();
  }

  // ---------- lightbox ----------
  const dlg = $("#lightbox");
  if (dlg) {
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-full]");
      if (!b) return;
      $("img", dlg).src = b.dataset.full;
      $("img", dlg).alt = b.dataset.cap;
      $(".bar span", dlg).textContent = b.dataset.cap;
      dlg.showModal();
    });
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  }

  // ---------- video player: custom controls, ←/→ keys and double-tap sides skip 5s ----------
  const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  const I = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
    vol: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/></svg>',
    muted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9zm12.6 3 2.7-2.7-1.4-1.4-2.7 2.7-2.7-2.7-1.4 1.4 2.7 2.7-2.7 2.7 1.4 1.4 2.7-2.7 2.7 2.7 1.4-1.4z"/></svg>',
    fs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h5v2H7v3H5zm9 0h5v5h-2V7h-3zM5 14h2v3h3v2H5zm12 3v-3h2v5h-5v-2z"/></svg>',
  };
  document.querySelectorAll("video").forEach((v) => {
    v.controls = false; // native controls stay as the no-JS fallback
    const p = document.createElement("div");
    p.className = "player";
    p.tabIndex = 0;
    p.setAttribute("role", "group");
    p.setAttribute("aria-label", `${v.getAttribute("aria-label") || "วิดีโอ"} · Space เล่น/หยุด · ลูกศรซ้าย/ขวา ข้าม 5 วินาที`);
    v.replaceWith(p);
    p.innerHTML = `
      <button class="p-big" type="button" aria-label="เล่นวิดีโอ">${I.play}</button>
      <span class="p-flash p-flash-l" aria-hidden="true">« 5s</span>
      <span class="p-flash p-flash-r" aria-hidden="true">5s »</span>
      <div class="p-bar">
        <button class="p-play" type="button"></button>
        <span class="p-time">0:00 / 0:00</span>
        <input class="p-seek" type="range" min="0" max="0" step="0.1" value="0" aria-label="ตำแหน่งวิดีโอ">
        <button class="p-mute" type="button"></button>
        <button class="p-fs" type="button" aria-label="เต็มจอ">${I.fs}</button>
      </div>`;
    p.prepend(v);
    const q = (s) => p.querySelector(s);
    const seek = q(".p-seek"), time = q(".p-time"), play = q(".p-play"), mute = q(".p-mute");

    const sync = () => {
      const d = v.duration || 0;
      seek.max = d;
      seek.value = v.currentTime;
      seek.style.setProperty("--p", d ? `${(v.currentTime / d) * 100}%` : "0%");
      time.textContent = `${fmt(v.currentTime)} / ${fmt(d)}`;
      seek.setAttribute("aria-valuetext", fmt(v.currentTime));
    };
    const state = () => {
      p.classList.toggle("playing", !v.paused);
      if (!v.paused) p.classList.add("started");
      play.innerHTML = v.paused ? I.play : I.pause;
      play.setAttribute("aria-label", v.paused ? "เล่น" : "หยุดชั่วคราว");
      mute.innerHTML = v.muted ? I.muted : I.vol;
      mute.setAttribute("aria-label", v.muted ? "เปิดเสียง" : "ปิดเสียง");
    };
    const toggle = () => (v.paused ? v.play() : v.pause());
    const skip = (d) => {
      if (!v.duration) return;
      v.currentTime = Math.min(Math.max(v.currentTime + d, 0), v.duration);
      const f = q(d < 0 ? ".p-flash-l" : ".p-flash-r");
      f.classList.remove("on");
      void f.offsetWidth; // restart the flash animation
      f.classList.add("on");
      sync();
    };
    const fullscreen = () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (p.requestFullscreen) p.requestFullscreen();
      else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen(); // iOS
    };

    ["loadedmetadata", "timeupdate", "seeked"].forEach((e) => v.addEventListener(e, sync));
    ["play", "pause", "volumechange"].forEach((e) => v.addEventListener(e, state));
    seek.addEventListener("input", () => { v.currentTime = +seek.value; sync(); });
    play.addEventListener("click", toggle);
    q(".p-big").addEventListener("click", toggle);
    mute.addEventListener("click", () => (v.muted = !v.muted));
    q(".p-fs").addEventListener("click", fullscreen);

    // keyboard (works when the player or any of its controls has focus)
    p.addEventListener("keydown", (e) => {
      const act = { ArrowLeft: () => skip(-5), ArrowRight: () => skip(5), " ": toggle, k: toggle, m: () => (v.muted = !v.muted), f: fullscreen }[e.key];
      if (!act || (e.key === " " && e.target.tagName === "BUTTON")) return;
      e.preventDefault();
      act();
    });

    // tap/click on the picture: single = play/pause, double on left/right half = -5s/+5s
    let last = 0, timer;
    v.addEventListener("click", (e) => {
      const now = performance.now();
      if (now - last < 300) {
        clearTimeout(timer);
        last = 0;
        skip(e.offsetX < v.clientWidth / 2 ? -5 : 5);
        return;
      }
      last = now;
      timer = setTimeout(toggle, 260);
    });
    v.addEventListener("dblclick", (e) => e.preventDefault());

    state();
    sync();
  });

  // ---------- copy IGN ----------
  document.querySelectorAll("[data-copy]").forEach((b) => {
    b.addEventListener("click", async () => {
      const old = b.textContent;
      try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = "คัดลอกแล้ว"; }
      catch { b.textContent = "คัดลอกไม่ได้"; }
      setTimeout(() => (b.textContent = old), 1500);
    });
  });

  // ---------- hero: holo tilt + first-visit pack-opening intro ----------
  const heroEl = document.querySelector(".hero");
  if (heroEl) {
    const doc = document.documentElement;
    const card = heroEl.querySelector(".tilt");
    if (matchMedia("(hover: hover) and (pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      let raf = 0;
      heroEl.addEventListener("pointermove", (e) => {
        if (raf || doc.classList.contains("intro")) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const r = card.getBoundingClientRect();
          const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
          const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
          card.style.setProperty("--rx", (x - 0.5) * 16 + "deg");
          card.style.setProperty("--ry", (0.5 - y) * 16 + "deg");
          card.style.setProperty("--mx", x * 100 + "%");
          card.style.setProperty("--my", y * 100 + "%");
          heroEl.classList.add("hot");
        });
      });
      heroEl.addEventListener("pointerleave", () => {
        card.style.removeProperty("--rx");
        card.style.removeProperty("--ry");
        heroEl.classList.remove("hot");
      });
    }
    // first visit: FUT pack opening. pack > 3 walkout beats > real hero card flips in at screen centre > click card / button / skip / Esc to enter
    const pk = $("#pack");
    if (doc.classList.contains("intro") && pk) {
      try { sessionStorage.setItem("intro", "1"); } catch {}
      pk.hidden = false;
      const flip = $(".flip", card), OUT = "cubic-bezier(0.22, 1, 0.36, 1)", INOUT = "cubic-bezier(0.65, 0, 0.35, 1)";
      const timers = [];
      let stage = 0, shown = null; // stage: 0 sealed, 1 opening, 2 card shown, 3 leaving; shown = centre pose the card was revealed at
      // card rect is in screen px, but translate runs inside body{zoom} on big screens, so divide by zoom (as the tarot did)
      const center = () => {
        const r = card.getBoundingClientRect(), z = parseFloat(getComputedStyle(document.body).zoom) || 1, vw = doc.clientWidth, vh = innerHeight;
        const s = Math.min(1.1, (vh * 0.62) / r.height, (vw * 0.86) / r.width);
        return { translate: `${(vw / 2 - (r.left + r.width / 2)) / z}px ${(vh * 0.46 - (r.top + r.height / 2)) / z}px`, scale: `${s}` };
      };
      const reveal = () => {
        stage = 2;
        const c = (shown = center());
        doc.classList.add("go");
        pk.classList.add("revealed");
        card.animate([{ ...c, opacity: 0, scale: `${c.scale * 0.4}` }, { ...c, opacity: 1 }], { duration: 700, easing: OUT, fill: "forwards" });
        flip.animate([{ transform: "rotateY(180deg)" }, { transform: "rotateY(-360deg)" }], { duration: 900, easing: OUT });
        $(".pk-enter", pk).focus();
      };
      const enter = () => {
        if (stage === 3) return;
        const from = stage === 2 ? shown : null;
        stage = 3;
        timers.forEach(clearTimeout);
        doc.classList.add("go");
        pk.classList.add("pk-out");
        const moves = [$(".hero-copy", heroEl).animate([{ opacity: 0, transform: "translateY(18px)" }, { opacity: 1, transform: "none" }], { duration: 600, delay: from ? 300 : 0, easing: OUT, fill: "backwards" })];
        if (from) moves.push(card.animate([from, { translate: "0px 0px", scale: "1" }], { duration: 750, easing: INOUT }));
        Promise.all(moves.map((a) => a.finished)).then(() => {
          card.getAnimations().forEach((a) => a.cancel());
          pk.remove();
          doc.classList.remove("intro", "go");
          removeEventListener("keydown", onKey);
          $("#main").focus({ preventScroll: true });
        });
      };
      const onKey = (e) => {
        if (e.key === "Escape") return enter();
        if (e.key !== "Tab" || stage === 3) return;
        const live = [$(".pk-skip", pk), stage === 0 && $(".pk-pack", pk), stage === 2 && $(".pk-enter", pk)].filter(Boolean);
        const i = live.indexOf(document.activeElement);
        e.preventDefault();
        live[(i + (e.shiftKey ? -1 : 1) + live.length) % live.length].focus();
      };
      $(".pk-pack", pk).addEventListener("click", () => {
        if (stage) return;
        stage = 1;
        pk.classList.add("opening");
        $(".pk-skip", pk).focus(); // the pack bursts away; do not leave focus on an invisible button
        [[850, "b1"], [1750, "b2"], [2650, "b3"]].forEach(([t, c]) => timers.push(setTimeout(() => pk.classList.add(c), t)));
        timers.push(setTimeout(reveal, 3550));
      });
      $(".pk-skip", pk).addEventListener("click", enter);
      $(".pk-enter", pk).addEventListener("click", enter);
      card.addEventListener("click", () => { if (stage === 2) enter(); });
      addEventListener("keydown", onKey);
      $(".pk-pack", pk).focus();
    }
  }

  // ---------- pinned-steps chapters (DoCode, WordFlow): wide screens pin the media and the step in mid-screen picks it; phones keep media inside each step ----------
  document.querySelectorAll(".wf").forEach((wf) => {
    const stage = $(".wf-stage", wf), steps = [...wf.querySelectorAll(".wf-step")], media = steps.map((s) => $(".wf-m", s));
    const wide = matchMedia("(min-width: 861px)");
    const place = () => media.forEach((m, i) => (wide.matches ? stage.append(m) : steps[i].prepend(m)));
    place();
    wide.addEventListener("change", place);
    const vid = $("video", wf), calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pick = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      const i = steps.indexOf(e.target);
      media.forEach((m, j) => m.classList.toggle("on", j === i));
      // one-shot effects (payout roll, กา tiles) key off .seen / the "seen" event so they never replay
      if (!media[i].classList.contains("seen")) { media[i].classList.add("seen"); media[i].dispatchEvent(new Event("seen")); }
      if (vid && !calm) { if (media[i].contains(vid)) vid.play().catch(() => {}); else vid.pause(); }
    }), { rootMargin: "-45% 0px -45% 0px" });
    steps.forEach((s) => pick.observe(s));
    media[0].classList.add("on");
  });

  // ---------- DoCode payout: reels roll 00,000 → 1x,xxx when its step is first read; SPIN re-rolls but always lands on the real amount ----------
  const reels = $(".reels");
  if (reels) {
    const FACE = "1x,xxx", digits = FACE.replace(",", ""), calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    reels.innerHTML = [...FACE].map((c) => (c === "," ? '<span class="reel comma"><i><span>,</span></i></span>' : '<span class="reel"><i><span>0</span></i></span>')).join("");
    const strips = [...reels.querySelectorAll(".reel:not(.comma) i")], job = $(".next-job"), machine = $(".slot-machine"), lever = $(".sm-lever");
    let pulse = 0;
    const roll = () => {
      strips.forEach((s, k) => {
        s.getAnimations().forEach((a) => a.cancel());
        s.innerHTML = ["0", ...Array.from({ length: 12 }, () => (Math.random() * 10) | 0), digits[k]].map((d) => `<span>${d}</span>`).join("");
        if (calm) { s.style.transform = "translateY(-13em)"; return; }
        s.animate([{ transform: "translateY(0)" }, { transform: "translateY(-13em)" }], { duration: 900 + k * 220, easing: "cubic-bezier(.15,.8,.25,1)", fill: "forwards" });
      });
      clearTimeout(pulse);
      job.classList.remove("ping");
      machine.classList.remove("idle");
      pulse = setTimeout(() => { job.classList.add("ping"); if (!calm) machine.classList.add("idle"); }, calm ? 0 : 900 + 4 * 220);
    };
    // the media gets "seen" from the pinned-steps observer (step 4 in mid-screen), not from its own visibility (it sits hidden in the sticky stage)
    const slotM = $(".slot-m");
    if (calm || slotM.classList.contains("seen")) roll(); else slotM.addEventListener("seen", roll, { once: true });
    lever.addEventListener("click", () => {
      lever.classList.remove("pull"); void lever.offsetWidth; // restart the pull animation on every pull
      lever.classList.add("pull");
      roll();
    });
  }

  // ---------- HUD: XP bar = scroll progress; link of the section in mid-screen gets aria-current ----------
  const hud = $(".hud");
  if (hud) {
    const bar = $(".xp i", hud), links = [...hud.querySelectorAll(".nav-links a")];
    let tick = 0;
    const fill = () => { tick = 0; const h = document.documentElement; bar.style.transform = `scaleX(${h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)})`; };
    addEventListener("scroll", () => { if (!tick) tick = requestAnimationFrame(fill); }, { passive: true });
    fill();
    const cur = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => (a.hash === "#" + e.target.id ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
    }), { rootMargin: "-45% 0px -50% 0px" });
    links.forEach((a) => { const t = document.getElementById(a.hash.slice(1)); if (t) cur.observe(t); });
  }

  // ---------- reveal on scroll (also triggers radar + skill bar fill) ----------
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("in")); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
  }), { rootMargin: "0px 0px -8% 0px" });
  els.forEach((el) => io.observe(el));

  // story beats (e.g. battery boom) fire later, once well inside the screen, so the reader sees them happen
  const pop = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("in"); pop.unobserve(en.target); }
  }), { rootMargin: "0px 0px -30% 0px" });
  document.querySelectorAll(".pop").forEach((el) => pop.observe(el));
})();
