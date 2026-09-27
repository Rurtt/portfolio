(() => {
  const $ = (s, r = document) => r.querySelector(s);
  // *word* in data.js = highlight. Only for trusted site text, never attributes.
  // Thai has no spaces between words, so browsers may wrap mid-word (ผู้|ใช้). Each space-separated phrase up to 20 chars
  // is one unit (.ph) that only wraps inside itself if wider than the line; longer ones wrap normally. KEEP words never split. *x* = highlight.
  // ponytail: compound words the line breaker splits in our copy (found by a wrap audit at 320-1920px); add more if new text breaks badly
  const KEEP = /ผลงาน|ตรงไหน|พร้อมกัน|ร่วมกัน|โปรดักต์|โปรเจกต์|เสียบสาย|เวลาจำกัด|ผู้ใช้|ผู้ปกครอง|ผู้เชี่ยวชาญ|ต่างระบบ|ตัวแอป|ปัญหาจริง|ใช้จริง|ประเทศไทย|วิธีคิด|ทันที|เขียนโค้ด|บทบาท|เปิดแอป|ผจญภัย|มหาวิทยาลัย|ยากกว่า|ส่งงาน|เป้าหมาย|โครงงาน|ขั้นตอน|ความ(?:พยายาม|กดดัน|คาดหวัง)|ครั้งแรก|หน่วยเสียง|สิ่งจำเป็น|ต่างคนต่างทำ|คุณค่า|ลูกค้า|ข้อมูล|ละเอียดอ่อน|มิตรภาพ|จริงจัง|ใช้ได้จริง|แผนสำรอง|หลายส่วน|กลับบ้าน|กว่าที่คิด|เบื้องหลัง|ภาคกลาง|ของประเทศ|ของทั้งทีม/g;
  const hl = (s) => esc(s).split(/ (?=(?:[^*]*\*[^*]*\*)*[^*]*$)/).map((c) => ((c = c.replace(KEEP, '<span class="nw">$&</span>'), c.replace(/<[^>]+>/g, "").length <= 20 ? `<span class="ph">${c}</span>` : c)).replace(/\*(.+?)\*/g, '<b class="hl">$1</b>')).join(" ").replace(/\n/g, "<br>");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const RAR = { legendary: "Legendary", epic: "Epic", rare: "Rare" };
  const YEAR = { Ongoing: "Ongoing · ปัจจุบัน" };
  const Q = window.QUESTS || [];
  const T = (src) => src.replace("assets/", "assets/t/"); // 480px thumbnail of the same image
  const hud = $(".hud");

  // ---------- SFX: tiny synth (Web Audio, no files). Off until the viewer turns it on (browsers block sound before a tap); choice remembered.
  // Everything goes through one master gain + limiter so nothing jump-scares ----------
  let ac = null, out = null, sound = false;
  try { sound = localStorage.getItem("sfx") === "1"; } catch {}
  const tone = (f, at = 0, dur = 0.12, type = "square", vol = 0.05, f2 = f) => {
    const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.02);
  };
  // filtered noise, band sweeps f0 -> f1 (tears, whooshes, shutters, crackle)
  const noise = (dur = 0.3, vol = 0.08, at = 0, f0 = 1200, f1 = f0, q = 0.8) => {
    const t = ac.currentTime + at, b = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = b;
    bp.type = "bandpass";
    bp.Q.value = q;
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.05, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bp).connect(g).connect(out);
    s.start(t);
  };
  const arp = (fs, gap = 0.08, type = "square", vol = 0.04, at = 0) => fs.forEach((f, i) => tone(f, at + i * gap, gap * 1.8, type, vol));
  // brass-ish chord: two detuned saws per note through a lowpass that closes (walkout stabs)
  const stab = (fs, at = 0, dur = 0.9, vol = 0.05, cut0 = 3200, cut1 = 350) => {
    const t = ac.currentTime + at, lp = ac.createBiquadFilter(), g = ac.createGain();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(cut0, t);
    lp.frequency.exponentialRampToValueAtTime(cut1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * 0.56, t + 0.015); // -5 dB: user found the hits too loud
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    lp.connect(g).connect(out);
    fs.forEach((f) => [-7, 7].forEach((c) => { const o = ac.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.detune.value = c; o.connect(lp); o.start(t); o.stop(t + dur + 0.02); }));
  };
  const kick = (at = 0, vol = 0.17, f0 = 150, f1 = 38, dur = 0.5) => tone(f0, at, dur, "sine", vol, f1);
  const NOTES = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093, 2349]; // combos climb this scale
  const SFX = {
    key: () => { noise(0.03, 0.05, 0, 3500); tone(1600 + Math.random() * 400, 0, 0.02, "square", 0.01); },
    tick: () => tone(1800, 0, 0.03, "sine", 0.025),
    blip: () => tone(880, 0, 0.06, "square", 0.03),
    note: (i = 0) => tone(NOTES[i % NOTES.length], 0, 0.16, "triangle", 0.05),
    err: () => tone(160, 0, 0.22, "sawtooth", 0.035, 100),
    boom: () => { noise(0.45, 0.056, 0, 600, 120); tone(85, 0, 0.35, "sine", 0.056, 45); }, // soft thud, not a jump scare
    over: () => arp([440, 370, 311, 262], 0.2, "triangle", 0.05),
    ok: () => arp([523, 659, 784, 1047], 0.08, "sine", 0.06),
    start: () => arp([660, 880], 0.09, "square", 0.03),
    boot: () => { tone(220, 0, 0.5, "sine", 0.05, 880); arp([880, 1175], 0.07, "square", 0.025, 0.45); },
    crt: () => { noise(0.2, 0.05, 0, 7000, 2500, 2); tone(55, 0, 0.35, "sine", 0.06); },
    plug: () => { noise(0.04, 0.08, 0, 2500); tone(300, 0.06, 0.3, "sine", 0.05, 900); },
    coin: () => { tone(988, 0, 0.08, "square", 0.035); tone(1319, 0.08, 0.3, "square", 0.035); },
    flag: () => arp([784, 988, 1175, 1568], 0.07, "triangle", 0.05),
    win: () => arp([523, 523, 523, 698, 880, 1047], 0.11, "square", 0.03),
    whoosh: () => noise(0.5, 0.07, 0, 250, 2600, 0.6),
    swipe: () => noise(0.28, 0.05, 0, 1500, 6000, 0.7),
    flip: () => noise(0.14, 0.06, 0, 3200, 1200, 1.2),
    shutter: () => { noise(0.04, 0.09, 0, 4200, 4200, 2); noise(0.06, 0.07, 0.07, 2600, 2600, 2); },
    thud: () => { tone(120, 0, 0.16, "sine", 0.08, 60); noise(0.07, 0.04, 0, 500); },
    scan: () => tone(420, 0, 0.6, "sine", 0.025, 1700),
    glitch: () => { for (let i = 0; i < 6; i++) tone(200 + Math.random() * 1800, i * 0.035, 0.03, "square", 0.022); },
    snap: () => { tone(1000, 0, 0.05, "square", 0.035, 1500); tone(1500, 0.05, 0.1, "triangle", 0.04); },
    // "ปลา": a buzzy voice through a moving formant
    voice: () => {
      const t = ac.currentTime, o = ac.createOscillator(), bp = ac.createBiquadFilter(), g = ac.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(210, t);
      o.frequency.linearRampToValueAtTime(170, t + 0.45);
      bp.type = "bandpass";
      bp.Q.value = 5;
      bp.frequency.setValueAtTime(500, t);
      bp.frequency.linearRampToValueAtTime(1100, t + 0.4);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(bp).connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.52);
    },
    // pack intro: foil tearing, then walkout stingers, each beat a step higher
    tear: () => { noise(0.55, 0.07, 0, 1800, 7000, 1.4); for (let i = 0; i < 7; i++) noise(0.03, 0.09, 0.05 + Math.random() * 0.45, 5000 + Math.random() * 3000, 5000, 3); },
    // all treble, no bass (user): each beat a step higher, the card reveal highest
    beat: (i = 0) => {
      const r = [659, 880, 1175][i % 3];
      noise(0.1, 0.07, 0, 7000, 4000, 1);
      stab([r, r * 1.5, r * 2], 0, 0.7, 0.05, 9000, 2500);
      tone(r * 2, 0.02, 0.5, "sine", 0.04);
    },
    reveal: () => {
      noise(0.15, 0.08, 0, 9000, 5000, 1);
      stab([1319, 1661, 1976, 2637], 0, 1.4, 0.05, 11000, 3000);
      arp([1976, 2637, 3136, 3951], 0.07, "sine", 0.04, 0.1);
      noise(1.2, 0.025, 0.1, 9000, 7000, 1); // sparkle tail
    },
    // real slot machine: reels rattle high-low-high-low and slow down, each reel lands with a clunk, then the bell rings with coins dropping
    spin: (len = 1.8) => {
      for (let t = 0, gap = 0.05, i = 0; t < len; t += gap, gap *= 1.04, i++) {
        tone(i % 2 ? 660 : 440, t, 0.045, "square", 0.028);
        noise(0.02, 0.04, t, 3200, 3200, 2);
      }
    },
    lever: () => { for (let i = 0; i < 6; i++) noise(0.03, 0.08, i * 0.045, 2600, 2600, 3); kick(0.3, 0.14, 140, 60, 0.2); noise(0.06, 0.07, 0.3, 1200); },
    stop: () => { kick(0, 0.17, 200, 70, 0.14); noise(0.04, 0.09, 0, 2400, 2400, 1.5); tone(330, 0, 0.07, "square", 0.05); },
    payout: () => {
      for (let i = 0; i < 22; i++) { tone(i % 2 ? 1175 : 1568, i * 0.075, 0.12, "triangle", 0.05); tone(i % 2 ? 2350 : 3136, i * 0.075, 0.05, "sine", 0.03); }
      for (let i = 0; i < 16; i++) { const t = 0.1 + Math.random() * 1.5; tone(3200 + Math.random() * 2400, t, 0.06, "sine", 0.04); noise(0.03, 0.06, t, 6000, 6000, 3); }
    },
    curtain: () => { noise(0.7, 0.07, 0, 150, 1400, 0.5); kick(0.05, 0.1, 90, 40, 0.5); },
    rankup: () => { arp([392, 523, 659, 784, 1047], 0.07, "sawtooth", 0.025); noise(0.6, 0.02, 0.3, 8000, 6000); },
    page: () => noise(0.18, 0.06, 0, 2500, 5500, 0.7),
    quest: () => { noise(0.45, 0.05, 0, 300, 2400, 0.6); arp([659, 784, 988, 1319], 0.1, "triangle", 0.05, 1.1); },
    invite: () => { tone(1175, 0, 0.25, "sine", 0.06); tone(1568, 0.14, 0.45, "sine", 0.06); },
    slam: () => { tone(70, 0, 0.35, "sine", 0.056, 40); noise(0.2, 0.028, 0, 800, 200); },
  };
  const sfx = (name, i) => { if (sound && out && SFX[name]) try { SFX[name](i); } catch {} };
  const wake = () => {
    if (!ac) {
      const A = window.AudioContext || window.webkitAudioContext;
      if (!A) return;
      ac = new A();
      const lim = ac.createDynamicsCompressor();
      lim.threshold.value = -8;
      lim.knee.value = 4;
      lim.ratio.value = 12;
      out = ac.createGain();
      out.gain.value = 1.6; // user: everything was too quiet; the limiter still caps the loud hits
      out.connect(lim).connect(ac.destination);
    }
    if (ac.state === "suspended") ac.resume();
  };
  const sfxBtns = document.querySelectorAll(".sfx-btn");
  const paint = () => sfxBtns.forEach((b) => b.setAttribute("aria-pressed", sound));
  sfxBtns.forEach((b) => b.addEventListener("click", () => {
    sound = !sound;
    try { localStorage.setItem("sfx", sound ? "1" : "0"); } catch {}
    wake();
    paint();
    sfx("coin");
  }));
  // sound was on last visit: the audio context can only start on this visit's first tap/key
  if (sound) ["pointerdown", "keydown"].forEach((ev) => addEventListener(ev, wake, { once: true }));
  paint();

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
    const row = (s, i) => `
      <div class="skill${s.max ? " max" : ""}"${s.can ? ' tabindex="0"' : ""}${i < 8 ? ` data-n="${i}"` : ""}>
        <span class="name">${esc(s.name)}</span>
        <span class="lvbar" style="--lv:${s.lv}" role="img" aria-label="เลเวล ${s.max ? "สูงสุด" : s.lv + " จาก 10"}"></span>
        <span class="lvtxt">${s.max ? "LV MAX" : "LV " + s.lv}</span>
        ${s.can ? `<p class="can">${hl(s.can)}</p>` : ""}
      </div>`;
    // top 8 by level up front, the rest folded (sort is stable, so ties keep data.js order)
    const all = (window.SKILLS || []).flatMap((g) => g.items).sort((a, b) => b.lv - a.lv);
    skills.innerHTML = all.slice(0, 8).map(row).join("") +
      (all.length > 8 ? `<details class="sk-more"><summary>ดูทั้งหมด (${all.length})</summary>${all.slice(8).map((s) => row(s, 99)).join("")}</details>` : "");
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
      return `<circle class="hit" cx="${x}" cy="${y}" r="16" tabindex="0" role="img" data-i="${i}" aria-label="${esc(s.key)}: ${esc(s.can)}"/><circle class="pt" data-n="${i}" cx="${x}" cy="${y}" r="5"/>`;
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
      // keep the tip inside the chart box (right-edge points on phones pushed it off screen)
      const half = tip.offsetWidth / 2, W = wrap.width / z;
      tip.style.left = `${Math.min(W - half, Math.max(half, (box.left - wrap.left) / z + (el.cx.baseVal.value - vb.x) * k))}px`;
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
      try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = "คัดลอกแล้ว"; sfx("coin"); }
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
      let stage = 0, shown = null, held = null; // stage: 0 sealed, 1 opening, 2 card shown, 3 leaving; shown = centre pose the card was revealed at
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
        sfx("reveal");
        held = card.animate([{ ...c, opacity: 0, scale: `${c.scale * 0.4}` }, { ...c, opacity: 1 }], { duration: 700, easing: OUT, fill: "forwards" });
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
        sfx("whoosh");
        const moves = [$(".hero-copy", heroEl).animate([{ opacity: 0, transform: "translateY(18px)" }, { opacity: 1, transform: "none" }], { duration: 600, delay: from ? 300 : 0, easing: OUT, fill: "backwards" })];
        if (from) { held.cancel(); moves.push(card.animate([from, { translate: "0px 0px", scale: "1" }], { duration: 750, easing: INOUT })); }
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
        const live = [$(".pk-skip", pk), $(".pk-sfx", pk), stage === 0 && $(".pk-pack", pk), stage === 2 && $(".pk-enter", pk)].filter(Boolean);
        const i = live.indexOf(document.activeElement);
        e.preventDefault();
        live[(i + (e.shiftKey ? -1 : 1) + live.length) % live.length].focus();
      };
      $(".pk-pack", pk).addEventListener("click", () => {
        if (stage) return;
        stage = 1;
        pk.classList.add("opening");
        sfx("tear");
        $(".pk-skip", pk).focus(); // the pack bursts away; do not leave focus on an invisible button
        const calmPk = matchMedia("(prefers-reduced-motion: reduce)").matches;
        const jolt = (px) => calmPk || pk.animate([{ translate: "0 0" }, { translate: `${-px}px ${px / 2}px` }, { translate: `${px * 0.7}px ${-px * 0.6}px` }, { translate: `${-px * 0.4}px ${px * 0.3}px` }, { translate: "0 0" }], { duration: 320, easing: "ease-out" });
        [[850, "b1"], [1750, "b2"], [2650, "b3"]].forEach(([t, c], i) => {
          timers.push(setTimeout(() => {
            pk.classList.add(c);
            sfx("beat", i);
            jolt(6 + i * 4);
            if (!calmPk) $(".pk-flash", pk).animate([{ opacity: 0.25 + i * 0.1 }, { opacity: 0 }], { duration: 350, easing: "ease-out" });
          }, t));
        });
        timers.push(setTimeout(() => { reveal(); jolt(16); }, 3550));
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
    // each step is also a scroll scene (see "scroll scenes"): its media plays while the step crosses mid-screen, even when the media sits in the pinned stage
    steps.forEach((s, i) => { s.classList.add("scene", "step"); s.media = media[i]; });
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
    let stops = [];
    const roll = () => {
      stops.forEach(clearTimeout);
      stops = [];
      strips.forEach((s, k) => {
        s.getAnimations().forEach((a) => a.cancel());
        s.innerHTML = ["0", ...Array.from({ length: 12 }, () => (Math.random() * 10) | 0), digits[k]].map((d) => `<span>${d}</span>`).join("");
        if (calm) { s.style.transform = "translateY(-13em)"; return; }
        s.animate([{ transform: "translateY(0)" }, { transform: "translateY(-13em)" }], { duration: 900 + k * 220, easing: "cubic-bezier(.15,.8,.25,1)", fill: "forwards" });
        stops.push(setTimeout(() => sfx("stop"), 820 + k * 220));
      });
      if (!calm) sfx("spin", 1.75);
      clearTimeout(pulse);
      job.classList.remove("ping");
      machine.classList.remove("idle");
      pulse = setTimeout(() => { sfx("payout"); job.classList.add("ping"); if (!calm) machine.classList.add("idle"); }, calm ? 0 : 900 + 4 * 220);
    };
    // the media gets "seen" from the pinned-steps observer (step 4 in mid-screen), not from its own visibility (it sits hidden in the sticky stage)
    const slotM = $(".slot-m");
    if (calm || slotM.classList.contains("seen")) roll(); else slotM.addEventListener("seen", roll, { once: true });
    lever.addEventListener("click", () => {
      lever.classList.remove("pull"); void lever.offsetWidth; // restart the pull animation on every pull
      lever.classList.add("pull");
      sfx("lever");
      roll();
    });
  }

  // ---------- HUD: XP bar = scroll progress; link of the section in mid-screen gets aria-current ----------
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

  // ---------- results screen: quest tally straight from data.js ----------
  const rl = $("#res-list");
  if (rl) {
    const n = (r) => Q.filter((q) => q.rarity === r).length;
    rl.innerHTML = [["Quests Cleared", Q.length, ""], ["Main Quests", 2, "gold"], ["Legendary", n("legendary"), "rar-legendary"], ["Epic", n("epic"), "rar-epic"], ["Rare", n("rare"), "rar-rare"]]
      .map(([k, v, c], i) => `<div class="${c}" data-at="${(0.14 + i * 0.08).toFixed(2)}"><dt>${k}</dt><dd class="num">${v}</dd></div>`).join("");
  }

  // ---------- combos: a [data-seq="gap ms"] part lights its [data-n] children one by one when it turns on, each with a rising note (or data-seq-sfx);
  // [data-to] children count up to that number ----------
  const calmFx = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const countUp = (el) => {
    if (calmFx) return;
    const to = el.dataset.to, dec = (to.split(".")[1] || "").length, t0 = performance.now();
    const f = (t) => { const k = Math.min(1, (t - t0) / 700); el.textContent = (+to * (1 - (1 - k) ** 3)).toFixed(dec); if (k < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  };
  document.querySelectorAll("[data-seq]").forEach((host) => host.addEventListener("on", () => {
    [...host.querySelectorAll("[data-n]")].forEach((k, i) => setTimeout(() => {
      k.classList.add("on");
      sfx(host.dataset.seqSfx || "note", i);
      if (k.dataset.to) countUp(k);
    }, calmFx ? 0 : i * +host.dataset.seq));
  }, { once: true }));
  // typewriter: [data-typewrite] types its own text (key clicks) when its part turns on
  document.querySelectorAll("[data-typewrite]").forEach((el) => {
    const full = el.textContent;
    (el.closest("[data-at]") || el).addEventListener("on", () => {
      if (calmFx) return;
      let i = 0;
      const t = setInterval(() => { el.textContent = full.slice(0, ++i); if (i % 2) sfx("key"); if (i >= full.length) clearInterval(t); }, 45);
    }, { once: true });
  });

  // ---------- scroll scenes: .scene.pin pins its .stage on wide screens and scrubs --p 0-1 over the section; elsewhere --p runs while the scene rises into view.
  // [data-at] children get .on once --p passes that value (off again when scrolled back, sfx only going forward); [data-count="from,to,p0,p1"] counts with --p ----------
  const scenes = [...document.querySelectorAll(".scene")];
  if (scenes.length) {
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches, wide = matchMedia("(min-width: 861px) and (min-height: 700px)");
    const all = (s, q) => [...new Set([...s.querySelectorAll(q), ...(s.media ? s.media.querySelectorAll(q) : [])])];
    const parts = scenes.map((s) => [all(s, "[data-at]"), all(s, "[data-count]"), all(s, "[data-keys]"), all(s, "[data-type]")]);
    // [data-type="p0,p1"]: text types itself in (grapheme by grapheme, so Thai vowels/tone marks never dangle) as --p runs p0 -> p1.
    // Each grapheme becomes a .g span that is transparent until typed: layout never jumps, markup (<mark>, .nw) stays, screen readers still read it all
    const graphemes = (s) => (Intl.Segmenter ? [...new Intl.Segmenter("th", { granularity: "grapheme" }).segment(s)].map((g) => g.segment) : [...s]);
    document.querySelectorAll("[data-type]").forEach((el) => {
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), texts = [];
      while (w.nextNode()) texts.push(w.currentNode);
      texts.forEach((t) => t.replaceWith(...graphemes(t.data).map((g) => { if (!g.trim()) return g; const s = document.createElement("span"); s.className = "g"; s.textContent = g; return s; })));
      el.gs = [...el.querySelectorAll(".g")];
      el.shown = -1;
      el.classList.add("typer");
    });
    const type = (el, p) => {
      const [a, z] = el.dataset.type.split(",").map(Number), n = Math.round(el.gs.length * Math.min(1, Math.max(0, (p - a) / (z - a))));
      if (n === el.shown) return;
      if (n > el.shown && el.shown >= 0 && el.closest(".words")) sfx("key");
      el.shown = n;
      el.gs.forEach((g, i) => { g.classList.toggle("in", i < n); g.classList.toggle("cur", i === n - 1 && n < el.gs.length); });
    };
    // curtain panels (hero > DoCode > WordFlow > words): the next section slides up over a .cover, which sinks, shrinks and dims under it
    const covers = [...document.querySelectorAll(".cover")];
    const curtain = (vh) => covers.forEach((c) => {
      const k = calm ? 0 : Math.min(1, Math.max(0, (vh - (c.getBoundingClientRect().bottom - (c.y0 || 0))) / vh));
      if (k > 0.02 && !c.hit && !c.hasAttribute("data-hush")) sfx("curtain");
      c.hit = k > 0.02;
      // fully covered (or not yet) = no transform, so #anchors from the nav still land on the real layout position
      c.y0 = k > 0 && k < 1 ? k * vh * 0.45 : 0;
      c.style.transform = c.y0 ? `translateY(${c.y0.toFixed(1)}px) scale(${(1 - k * 0.08).toFixed(4)})` : "";
      c.style.setProperty("--k", c.y0 ? k.toFixed(3) : 0);
    });
    // sideways tracks: chapters inside .htrack sit side by side; vertical scroll plays chapter i, then pans the row to chapter i+1 (PAN svh of scroll)
    const PAN = 70;
    const tracks = [...document.querySelectorAll(".htrack")].map((t) => {
      const ps = [...t.querySelectorAll(".hin > .scene")], play = ps.map((s) => parseFloat(s.style.getPropertyValue("--len")) - 90);
      t.style.setProperty("--th", play.reduce((a, b) => a + b, 0) + PAN * (ps.length - 1) + "svh");
      return { t, inn: $(".hin", t), ps, play, seg: 0 };
    });
    const stageOn = matchMedia("(min-width: 861px)");
    const hs = $(".scene.hs"), track = $("#side-list");
    // side quests: vertical scroll distance = how far the card row overflows, so it slides exactly to its end
    const size = () => { if (hs) { const dx = wide.matches && !calm ? Math.max(0, track.scrollWidth - track.clientWidth) : 0; hs.style.setProperty("--dx", dx + "px"); } };
    let q = 0;
    const run = () => {
      q = 0;
      const vh = innerHeight, top = hud ? hud.getBoundingClientRect().bottom : 0;
      curtain(vh);
      tracks.forEach((k) => {
        k.ps.forEach((s) => (s.hp = null));
        if (!wide.matches || calm) return k.inn.style.removeProperty("--shift");
        const y = (top - k.t.getBoundingClientRect().top) / (vh / 100);
        let s0 = 0, shift = 0;
        k.ps.forEach((s, i) => {
          s.hp = (y - s0) / k.play[i];
          if (y > s0 + k.play[i] && i < k.ps.length - 1) shift = i + Math.min(1, (y - s0 - k.play[i]) / PAN);
          s0 += k.play[i] + PAN;
        });
        k.inn.style.setProperty("--shift", shift.toFixed(4));
        const seg = Math.floor(shift + 0.9);
        if (seg > k.seg) sfx("whoosh");
        k.seg = seg;
      });
      scenes.forEach((s, i) => {
        const r = s.getBoundingClientRect(), pinned = s.classList.contains("pin") || s === hs;
        const raw = calm ? 1
          : s.hp != null ? s.hp
          : s.classList.contains("words") ? (top - r.top) / Math.max(1, r.height - vh + top) // own sticky stage on every screen
          : s.media ? (vh * (stageOn.matches ? 0.5 : 0.85) - r.top) / r.height // pinned-steps: 0 when the step reaches mid-screen (its media shows), 1 when it leaves
          : pinned && wide.matches ? (top - r.top) / Math.max(1, r.height - vh + top) : (vh * 0.9 - r.top) / (vh * 0.75);
        const p = Math.min(1, Math.max(0, raw));
        s.style.setProperty("--p", p.toFixed(4));
        if (s.media) s.media.style.setProperty("--p", p.toFixed(4));
        parts[i][0].forEach((b) => {
          const on = calm || (b.dataset.at === "auto" ? b.getBoundingClientRect().top < vh * 0.8 : p >= +b.dataset.at);
          if (on === b.classList.contains("on")) return;
          b.classList.toggle("on", on);
          if (on) { b.dispatchEvent(new Event("on")); sfx(b.dataset.sfx); }
        });
        parts[i][1].forEach((c) => {
          const [f, t, a, z] = c.dataset.count.split(",").map(Number), v = String(Math.round(f + (t - f) * Math.min(1, Math.max(0, (p - a) / (z - a)))));
          if (c.textContent !== v) { c.textContent = v; sfx("tick"); }
        });
        // typing driven by scroll ([data-keys="p0,p1"]): a key click every small step forward inside that range
        parts[i][2].forEach((el) => {
          const [a, z] = el.dataset.keys.split(",").map(Number), last = el.lp ?? p;
          if (p < last) el.lp = p;
          else if (p - last > 0.008) { el.lp = p; if (p > a && last < z) sfx("key"); }
        });
        parts[i][3].forEach((el) => type(el, p));
      });
    };
    addEventListener("scroll", () => { if (!q) q = requestAnimationFrame(run); }, { passive: true });
    addEventListener("resize", () => { size(); run(); });
    document.querySelectorAll(".filter").forEach((b) => b.addEventListener("click", () => { size(); run(); }));
    size();
    run();
  }

  // flag text decrypts from random glyphs when its beat turns on (once)
  document.querySelectorAll("[data-scramble]").forEach((el) => {
    const end = el.textContent, G = "!<>-_\\/[]{}=+*^?#abcdef0123456789";
    const go = () => {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const t0 = performance.now();
      const f = (t) => {
        const k = Math.min(1, (t - t0) / 900);
        el.textContent = [...end].map((c, i) => (i < k * end.length ? c : G[(Math.random() * G.length) | 0])).join("");
        if (k < 1) requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    };
    el.closest("[data-at]").addEventListener("on", go, { once: true });
  });

  // ---------- radar: tours its points by itself (tooltip hops stat to stat) until the viewer touches it ----------
  if (radar) {
    const hits = [...radar.querySelectorAll(".hit")];
    let k = 0, tour = 0;
    const stop = () => { clearInterval(tour); tour = -1; radar.classList.remove("touring"); hits.forEach((h) => h.classList.remove("cur")); };
    const step = () => { hits.forEach((h) => h.classList.remove("cur")); const h = hits[k++ % hits.length]; h.classList.add("cur"); h.dispatchEvent(new Event("pointerenter")); };
    radar.addEventListener("pointerdown", stop);
    hits.forEach((h) => { h.addEventListener("pointerenter", (e) => { if (e.isTrusted) stop(); }); h.addEventListener("focus", stop); });
    new IntersectionObserver(([e], o) => {
      if (!e.isIntersecting || tour) return;
      o.disconnect();
      radar.classList.add("touring");
      step();
      tour = setInterval(step, 2600);
    }, { threshold: 0.6 }).observe(radar);
  }

  // ---------- reveal on scroll (also triggers radar + skill bar fill) ----------
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("in")); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); sfx(en.target.dataset.sfx); }
  }), { rootMargin: "0px 0px -8% 0px" });
  els.forEach((el) => io.observe(el));
})();
