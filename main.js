(() => {
  const $ = (s, r = document) => r.querySelector(s);
  // *word* in data.js = highlight. Only for trusted site text, never attributes.
  const hl = (s) => esc(s).replace(/\*(.+?)\*/g, '<b class="hl">$1</b>');
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
        <a class="tl-item rar-${q.rarity} reveal${q.main ? " is-main" : ""}" data-rarity="${q.rarity}" data-year="${q.year}" href="quest.html?q=${q.id}">
          <span class="tl-date">${esc(q.date)}</span>
          <span class="tl-rail" aria-hidden="true"></span>
          <div class="tl-card sheen">
            <div class="tl-thumb${q.fit === "contain" ? " contain" : ""}"><img src="${T(q.cover)}" alt="" loading="lazy" decoding="async" width="264" height="165"></div>
            <div>
              <div class="tl-tags"><span class="rar rar-${q.rarity}">${RAR[q.rarity]}</span>${q.main ? '<span class="rar main">Main Quest</span>' : ""}</div>
              <h3>${esc(q.title)}</h3>
              <p class="event">${esc(q.event)}</p>
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
      tl.querySelectorAll(".tl-item").forEach((it) => { it.hidden = f !== "all" && it.dataset.rarity !== f; });
      tl.querySelectorAll(".tl-year").forEach((y) => { y.hidden = !tl.querySelector(`.tl-item[data-year="${y.dataset.year}"]:not([hidden])`); });
    }));
  }

  // ---------- home: other main quests ----------
  const side = $("#side-mains");
  if (side) {
    side.innerHTML = Q.filter((q) => q.main && !q.hero).sort((a, b) => a.main - b.main).map((q) => `
      <a class="mq-card rar-${q.rarity} sheen reveal" href="quest.html?q=${q.id}">
        <div class="tl-thumb${q.fit === "contain" ? " contain" : ""}"><img src="${T(q.cover)}" alt="" loading="lazy" decoding="async" width="400" height="250"></div>
        <div class="mq-card-body">
          <div class="tl-tags"><span class="rar rar-${q.rarity}">${RAR[q.rarity]}</span><span class="mq-date">${esc(q.date)}</span></div>
          <h3>${esc(q.title)}</h3>
          <span class="mq-ev">${esc(q.event)}</span>
          <p>${hl(q.result)}</p>
        </div>
      </a>`).join("");
  }

  // ---------- home: gaming ----------
  const gg = $("#gaming-grid");
  if (gg) {
    gg.innerHTML = (window.GAMING || []).map((g) => `
      <article class="gcard sheen reveal">
        <button class="shot-btn" type="button" data-full="${g.img}" data-cap="${esc(g.cap)}" aria-label="ดูรูป ${esc(g.cap)}">
          <img src="${g.img}" alt="${esc(g.cap)}" loading="lazy" width="1400" height="700" style="${g.fit ? `object-fit:${g.fit};` : ""}${g.pos ? `object-position:${g.pos};` : ""}">
        </button>
        <div class="gbody">
          <span class="game">${esc(g.game)}</span>
          <span class="rank">${esc(g.rank)}</span>
          <p class="sub">${esc(g.sub)}</p>
          ${g.ign ? `<div class="ign"><span><small>IGN</small><b>${esc(g.ign)}</b></span><button class="copy" type="button" data-copy="${esc(g.ign)}" aria-label="คัดลอกชื่อในเกม ${esc(g.game)}">คัดลอก</button></div>` : ""}
        </div>
      </article>`).join("");
  }

  // ---------- home: skills ----------
  const skills = $("#skills");
  if (skills) {
    skills.innerHTML = (window.SKILLS || []).map((g) => `
      <div class="skill-group">
        <h4>${esc(g.group)}</h4>
        ${g.items.map((s) => `
          <div class="skill${s.max ? " max" : ""}"${s.can ? ' tabindex="0"' : ""}>
            <span class="name">${esc(s.name)}</span>
            <span class="lvbar" style="--lv:${s.lv}" role="img" aria-label="เลเวล ${s.max ? "สูงสุด" : s.lv + " จาก 10"}"></span>
            <span class="lvtxt">${s.max ? "LV MAX" : "LV " + s.lv}</span>
            ${s.can ? `<p class="can">${hl(s.can)}</p>` : ""}
          </div>`).join("")}
      </div>`).join("");
  }

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
      return `<circle class="hit" cx="${x}" cy="${y}" r="16" tabindex="0" data-i="${i}" aria-label="${esc(s.key)}: ${esc(s.can)}"/><circle class="pt" cx="${x}" cy="${y}" r="5"/>`;
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
      const li = (arr) => arr.map((t) => `<li>${esc(t)}</li>`).join("");
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
                <p class="event">${esc(q.event)}</p>
                <p class="summary">${esc(q.summary)}</p>
                ${q.live ? `<a class="btn btn-primary" href="${q.live}" target="_blank" rel="noopener">เปิดเว็บจริง ${back}</a>` : ""}
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
              ${q.origin ? `<div class="panel reveal"><h2>จุดเริ่มต้น</h2>${q.origin.map((t) => `<p class="loot">${esc(t)}</p>`).join("")}</div>` : ""}
              <div class="panel reveal"><h2>Mission Brief</h2><ul class="list">${li(q.brief)}</ul></div>
              <div class="panel reveal"><h2>สิ่งที่ผมทำ</h2><ul class="list">${li(q.did)}</ul></div>
            </div>
            <div>
              <div class="panel reveal"><h2>Loadout</h2><div class="chips">${q.stack.map((s) => `<span class="chip">${esc(s)}</span>`).join("")}</div></div>
              <div class="panel reveal"><h2>บทเรียน</h2><p class="loot">${esc(q.loot)}</p></div>
              <div class="panel reveal"><p class="note"><small>บันทึกผู้เล่น</small>${esc(q.note)}</p></div>
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
      if (!calm) slide.animate([{ transform: `translateX(${d * 40}%)`, opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 400, easing: "cubic-bezier(.2,.8,.2,1)" });
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

  // ---------- reveal on scroll (also triggers radar + skill bar fill) ----------
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("in")); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
  }), { rootMargin: "0px 0px -8% 0px" });
  els.forEach((el) => io.observe(el));
})();
