// Grim Sanity: the duel screen. Everyone sees the same thing: the card, the Trauma Dice
// across the top, and one row of Sanity Dice per character, paired column by column.
import { resolve, outcome, sortDesc } from "./logic.js";
import { SUITS, TIER, TIER_LABEL, STAMPS, UNTIL, cardById } from "./cards.js";
import { Die } from "./dice.js";
import { Field } from "./fx.js";
import { sigil, eye, crackUrl } from "./art.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const INTRO_MS = 4600;

/** Card face markup, shared by the duel screen and the GM panel. */
export function cardMarkup(card, lang = "th", { compact = false } = {}) {
  const def = card.id ? cardById(card.id) : null;
  const PRICE = { th: "แพ้กี่คู่ เต๋าสติร้าวเท่านั้นลูก (สูงสุด 3) ไม่มีอาการติดตัว", en: "Each pair lost cracks one Sanity Die, three at most. No symptom follows." };
  const main = def ? def[lang] : { name: card.title, board: "", symptom: "", price: PRICE[lang] ?? PRICE.en };
  const other = def ? def[lang === "th" ? "en" : "th"].name : "The Abyss";
  const suit = def?.suit ?? "abyss";
  const trauma = card.trauma ?? def?.trauma ?? 1;
  const tier = TIER(trauma);
  const pipRow = Array.from({ length: Math.max(3, trauma) }, (_, i) => `<i class="${i < trauma ? "on" : ""}"></i>`).join("");
  const who = def ? (def.who === "area" ? "Those inside the area" : "The whole party") : "Chosen by the GM";
  return `
    <div class="gsn-card gsn-suit-${suit} gsn-tier-${tier}${compact ? " is-compact" : ""}" data-card="${esc(card.id ?? "")}">
      <div class="gsn-card-back">${sigil("abyss")}</div>
      <div class="gsn-card-face">
        <div class="gsn-card-top"><span class="gsn-card-suit">${esc(def ? SUITS[suit].en : "Abyss")}</span><span class="gsn-card-pips">${pipRow}</span></div>
        <div class="gsn-card-art">${sigil(suit)}</div>
        <div class="gsn-card-name">${esc(main.name)}</div>
        <div class="gsn-card-sub"><span>${esc(other)}</span></div>
        ${compact ? "" : `
        ${main.board ? `<div class="gsn-card-sec"><label>On the board</label><p>${esc(main.board)}</p></div>` : ""}
        ${main.symptom ? `<div class="gsn-card-sec is-symptom"><label>Symptom</label><p>${esc(main.symptom)}</p></div>` : ""}
        ${main.price ? `<div class="gsn-card-tier">${esc(TIER_LABEL[tier])}</div><div class="gsn-card-sec is-symptom"><label>The price</label><p>${esc(main.price)}</p></div>` : ""}`}
        <div class="gsn-card-foot"><b>Trauma ${trauma}</b><i></i><span>${esc(compact ? TIER_LABEL[tier] : who)}</span></div>
      </div>
    </div>`;
}

export class Duel {
  /**
   * @param duel  { id, card, trauma, line, ward, players: [{ actorId, userId, name, img, sub, color, count, sides, unhinged, intact }] }
   * @param h     { isGM, lang, dim, accent, low, canRoll(p), onTrauma(), onPlayer(p), onShine(actorId, col), onSeal(), onCancel(), onDismiss(), sound() }
   */
  constructor(duel, h) {
    this.duel = duel; this.h = h;
    this.trauma = null;            // sorted Trauma values
    this.tdice = [];               // Die objects in the top row
    this.rows = new Map();         // actorId -> { p, el, dice, values, over, res, out }
    this.shineUsed = false; this.shining = false; this.closed = false; this.timers = [];
    this.traumaLanded = new Promise((r) => { this.traumaDone = r; });
    this.build();
  }

  /* ---------- build ---------- */
  build() {
    const { duel, h } = this;
    const n = duel.players.length;
    const cols = Math.max(duel.trauma, ...duel.players.map((p) => p.count));
    const el = this.el = document.createElement("div");
    el.id = "grim-sanity-duel";
    el.className = `gsn-duel gsn-tier-${TIER(duel.trauma)} gsn-n${Math.min(n, 8)} is-intro${h.isGM ? " is-gm" : ""}${h.low ? " is-low" : ""}`;
    el.style.setProperty("--gsn-dim", String((h.dim ?? 82) / 100));
    if (h.accent) el.style.setProperty("--gsn-base", h.accent);
    el.style.setProperty("--gsn-cols", String(cols));
    el.style.setProperty("--gsn-crack", crackUrl);

    const cells = (count) => Array.from({ length: cols }, (_, i) => `<div class="gsn-cell${i < count ? "" : " is-void"}" data-col="${i}"></div>`).join("");
    const rows = duel.players.map((p, i) => `
      <div class="gsn-row gsn-prow${p.unhinged ? " is-insane" : ""}" data-actor="${esc(p.actorId)}" style="--i:${i};--gsn-user:${esc(p.color || "#c8141e")}">
        <div class="gsn-who"><img src="${esc(p.img || "icons/svg/mystery-man.svg")}" alt=""><div><b>${esc(p.name)}</b><span>${esc(p.unhinged ? "Unhinged · 2 Insanity Dice" : p.sub)}</span></div></div>
        <div class="gsn-cells">${cells(p.count)}</div>
        <div class="gsn-end"><div class="gsn-prompt">${p.unhinged ? "Roll the Insanity Dice" : "Roll your Sanity"}</div><div class="gsn-stamp"></div><div class="gsn-note"></div></div>
      </div>`).join("");

    el.innerHTML = `
      <div class="gsn-veil"></div>
      <div class="gsn-fog"><i></i><i></i><i></i></div>
      <div class="gsn-eye">${eye}</div>
      <canvas class="gsn-fx"></canvas>
      <div class="gsn-flash"></div>
      <div class="gsn-head">
        <div class="gsn-line">${esc(duel.line)}</div>
        <div class="gsn-title"><span>Trial of Sanity</span></div>
      </div>
      <div class="gsn-main">
        <div class="gsn-cardslot">${cardMarkup(duel.card, h.lang)}</div>
        <div class="gsn-stage">
          <div class="gsn-row gsn-trow">
            <div class="gsn-who gsn-who-dark"><div class="gsn-glyph">${sigil("abyss")}</div><div><b>Trauma</b><span>The Darkness · ${duel.trauma} ${duel.trauma === 1 ? "die" : "dice"}</span></div></div>
            <div class="gsn-cells">${cells(duel.trauma)}</div>
            <div class="gsn-end"><div class="gsn-prompt">${h.isGM ? "Roll the Trauma" : "The dark gathers"}</div>${duel.ward ? `<div class="gsn-ward">Heart Ward · ties go to the players</div>` : `<div class="gsn-tie">Ties go to the dark</div>`}</div>
          </div>
          <div class="gsn-rule"><i></i></div>
          <div class="gsn-rows">${rows}</div>
          <div class="gsn-beams"></div>
        </div>
      </div>
      <div class="gsn-bar">${h.isGM ? `
        <button type="button" data-act="trauma" class="gsn-b-dark">Roll Trauma</button>
        <button type="button" data-act="rest" disabled>Roll Remaining</button>
        <button type="button" data-act="shine" class="gsn-b-light" disabled>Shine</button>
        <button type="button" data-act="seal" class="gsn-b-go" disabled>Seal Fate</button>
        <button type="button" data-act="cancel">Cancel</button>` : `<button type="button" data-act="dismiss" class="gsn-b-ghost">Hide</button>`}
      </div>`;
    document.body.appendChild(el);

    this.fx = new Field(el.querySelector(".gsn-fx"), { low: h.low });
    this.fx.hold = true; // no flames while the dice are still hidden behind the card
    this.stage = el.querySelector(".gsn-stage");
    this.trow = el.querySelector(".gsn-trow");
    this.layout = () => this.size();
    window.addEventListener("resize", this.layout);
    this.size();

    // dice
    for (const cell of this.trow.querySelectorAll(".gsn-cell:not(.is-void)")) { const d = new Die("trauma", 6); cell.appendChild(d.el); this.tdice.push(d); }
    for (const p of duel.players) {
      const rowEl = el.querySelector(`.gsn-prow[data-actor="${CSS.escape(p.actorId)}"]`);
      const dice = [];
      for (const cell of rowEl.querySelectorAll(".gsn-cell:not(.is-void)")) { const d = new Die(p.unhinged ? "insane" : "sanity", p.sides); cell.appendChild(d.el); dice.push(d); }
      if (h.canRoll?.(p)) rowEl.classList.add("can-roll");
      if (p.unhinged) for (const d of dice) this.fx.flame(d.el);
      this.rows.set(p.actorId, { p, el: rowEl, dice, values: null, over: {}, res: null, out: null });
    }

    el.addEventListener("click", (ev) => this.onClick(ev));
    requestAnimationFrame(() => el.classList.add("is-open"));
    this.timers.push(setTimeout(() => this.endIntro(), INTRO_MS));
  }

  /** Fit the dice to the screen: fewer characters, bigger dice. */
  size() {
    const n = this.duel.players.length, cols = Number(this.el.style.getPropertyValue("--gsn-cols")) || 3;
    const W = window.innerWidth, H = window.innerHeight;
    // each row is about 1.32 dice tall; the stage may use about 62% of the screen height
    let d = Math.floor(Math.min(108, (H * 0.62) / ((n + 1) * 1.32)));
    // then shrink until card + names + dice + results fit across the screen (mirrors the CSS widths)
    const card = Math.min(H * 0.31, W * 0.22);
    for (; d > 30; d -= 2) {
      const font = Math.max(12, Math.min(18, d / 4.6));
      if (card + W * 0.04 + font * 36 + cols * d * 1.2 <= W * 0.93) break;
    }
    this.el.style.setProperty("--gsn-d", `${d}px`);
  }

  endIntro() {
    if (this.closed || !this.el.classList.contains("is-intro")) return;
    this.el.classList.remove("is-intro");
    this.el.classList.add("is-live");
    this.timers.push(setTimeout(() => { if (this.fx) this.fx.hold = false; }, 1100));
  }

  /* ---------- input ---------- */
  onClick(ev) {
    const btn = ev.target.closest("button[data-act]");
    if (btn) {
      const a = btn.dataset.act;
      if (a === "trauma") { this.endIntro(); this.h.onTrauma?.(); }
      else if (a === "rest") { for (const r of this.rows.values()) if (!r.values && !r.pending) { r.pending = true; this.h.onPlayer?.(r.p); } }
      else if (a === "shine") { this.shining = !this.shining; this.el.classList.toggle("is-shining", this.shining); btn.classList.toggle("on", this.shining); }
      else if (a === "seal") this.h.onSeal?.();
      else if (a === "cancel") this.h.onCancel?.();
      else if (a === "dismiss") this.h.onDismiss?.();
      return;
    }
    if (this.el.classList.contains("is-intro")) { if (this.h.isGM) this.endIntro(); return; }
    const rowEl = ev.target.closest(".gsn-prow"), cell = ev.target.closest(".gsn-cell");
    if (this.h.isGM && ev.target.closest(".gsn-trow .gsn-cells") && !this.trauma) return this.h.onTrauma?.();
    if (!rowEl) return;
    const r = this.rows.get(rowEl.dataset.actor); if (!r) return;
    if (this.shining && this.h.isGM && cell && r.res && !this.shineUsed) {
      const col = Number(cell.dataset.col);
      if (r.res.pairs[col] && !r.res.pairs[col].win) { this.shining = false; this.el.classList.remove("is-shining"); this.h.onShine?.(r.p.actorId, col); }
      return;
    }
    if (!this.trauma || r.values || r.pending || !this.h.canRoll?.(r.p)) return;
    r.pending = true; rowEl.classList.add("is-busy");
    this.h.onPlayer?.(r.p);
  }

  /* ---------- the Trauma Dice ---------- */
  async setTrauma(values) {
    if (this.trauma || this.closed) return;
    this.endIntro();
    this.trauma = sortDesc(values);
    this.el.classList.add("has-trauma");
    this.btn("trauma", true);
    this.h.sound?.();
    await Promise.all(this.tdice.map((d, i) => d.roll(this.trauma[i], { dur: 1.5 + i * 0.12, delay: i * 90 })));
    if (this.closed) return;
    this.trow.classList.add("is-rolled");
    for (const d of this.tdice) this.fx.at(d.el, "ember", 10);
    this.btn("rest", false);
    this.traumaDone();
  }

  /* ---------- a character's dice ---------- */
  async setPlayer(actorId, values) {
    const r = this.rows.get(actorId);
    if (!r || r.values || this.closed) return;
    r.values = sortDesc(values); r.pending = true;
    await this.traumaLanded;
    if (this.closed) return;
    r.el.classList.add("is-busy", "is-rolling");
    this.h.sound?.();
    await Promise.all(r.dice.map((d, i) => d.roll(r.values[i], { dur: 1.4 + i * 0.1, delay: i * 80 })));
    if (this.closed) return;
    r.el.classList.remove("is-rolling");
    await this.judge(r, true);
  }

  /** Compare a row against the Trauma Dice, one column at a time. */
  async judge(r, animate) {
    const tie = !!this.duel.ward || r.p.unhinged;
    r.res = resolve(r.values, this.trauma, { over: r.over, tieToPlayer: tie });
    r.out = outcome(r.res.lost, { intact: r.p.intact, unhinged: r.p.unhinged });
    for (let i = 0; i < r.dice.length; i++) {
      const d = r.dice[i], pair = r.res.pairs[i];
      if (!pair) { d.mark("is-spared"); continue; }
      if (animate) { await wait(360); if (this.closed) return; this.beam(this.tdice[i].el, d.el, pair.win); await wait(170); if (this.closed) return; }
      d.el.classList.remove("is-win", "is-lose");
      d.mark(pair.win ? "is-win" : "is-lose");
      d.el.classList.toggle("is-tie", pair.tie);
      const hit = this.tdice[i].el; hit.classList.remove("is-hit"); void hit.offsetWidth; hit.classList.add("is-hit");
      if (animate) {
        if (pair.win) this.fx.at(d.el, "gold", 22);
        else { this.fx.at(d.el, r.p.unhinged ? "violet" : "shard", r.p.unhinged ? 20 : 30); this.fx.at(d.el, "ember", 14); this.flash("dark"); }
      }
    }
    this.finishRow(r, animate);
  }

  finishRow(r, animate) {
    const o = r.out, row = r.el;
    row.classList.remove("is-busy", "can-roll");
    row.classList.add("is-done");
    for (const k of Object.keys(STAMPS)) row.classList.remove(`is-${k}`);
    row.classList.add(`is-${o.key}`);
    row.querySelector(".gsn-stamp").textContent = STAMPS[o.key];
    const bits = [];
    if (o.cracks) bits.push(`${o.cracks} ${o.cracks === 1 ? "die cracks" : "dice crack"}`);
    if (o.until && this.duel.card?.id) bits.push(`symptom ${UNTIL[o.until]}`);
    if (o.inspiration) bits.push("Inspiration");
    if (o.breaks) bits.push("2 Insanity Dice");
    row.querySelector(".gsn-note").textContent = bits.join(" · ");
    if (animate && o.breaks) { this.flash("violet"); for (const d of r.dice) { this.fx.at(d.el, "violet", 40); this.fx.flame(d.el); } }
    if (animate && o.key === "unshaken") this.flash("light");
    this.refreshBar();
  }

  /** "Shine": the light rerolls one losing die against the same Trauma die. */
  async shine(actorId, col, value) {
    const r = this.rows.get(actorId);
    if (!r?.res || this.closed) return;
    this.shineUsed = true; this.shining = false; this.el.classList.remove("is-shining");
    this.el.querySelector('.gsn-bar [data-act="shine"]')?.classList.remove("on");
    const d = r.dice[col]; if (!d) return;
    r.over[col] = value;
    d.mark("is-shone");
    this.flash("light"); this.fx.at(d.el, "gold", 40);
    this.h.sound?.();
    await d.roll(value, { dur: 1.3 });
    if (this.closed) return;
    d.mark("is-shone");
    const tie = !!this.duel.ward || r.p.unhinged;
    r.res = resolve(r.values, this.trauma, { over: r.over, tieToPlayer: tie });
    r.out = outcome(r.res.lost, { intact: r.p.intact, unhinged: r.p.unhinged });
    const pair = r.res.pairs[col];
    this.beam(this.tdice[col].el, d.el, pair.win);
    await wait(170);
    d.el.classList.remove("is-win", "is-lose"); d.mark(pair.win ? "is-win" : "is-lose");
    d.el.classList.toggle("is-tie", pair.tie);
    this.fx.at(d.el, pair.win ? "gold" : "shard", 30);
    this.finishRow(r, true);
  }

  /* ---------- small effects ---------- */
  beam(from, to, win) {
    const host = this.el.querySelector(".gsn-beams"), a = from.getBoundingClientRect(), b = to.getBoundingClientRect(), s = this.stage.getBoundingClientRect();
    const i = document.createElement("i");
    i.className = `gsn-beam ${win ? "is-win" : "is-lose"}`;
    const y0 = a.bottom - s.top - a.height * 0.2, y1 = b.top - s.top + b.height * 0.2;
    i.style.left = `${a.left + a.width / 2 - s.left}px`; i.style.top = `${y0}px`; i.style.height = `${Math.max(4, y1 - y0)}px`;
    host.appendChild(i);
    setTimeout(() => i.remove(), 700);
  }

  flash(kind) {
    if (this.h.low) return;
    const f = this.el.querySelector(".gsn-flash");
    f.className = "gsn-flash"; void f.offsetWidth; f.className = `gsn-flash is-${kind}`;
    if (kind === "dark") { this.stage.classList.remove("is-shake"); void this.stage.offsetWidth; this.stage.classList.add("is-shake"); }
  }

  btn(act, disabled) { const b = this.el.querySelector(`.gsn-bar [data-act="${act}"]`); if (b) b.disabled = disabled; }

  refreshBar() {
    const rows = [...this.rows.values()], done = rows.filter((r) => r.res);
    this.btn("rest", !this.trauma || done.length === rows.length);
    this.btn("seal", done.length === 0);
    this.btn("shine", this.shineUsed || !done.some((r) => r.res.lost > 0));
    if (done.length === rows.length) this.el.classList.add("is-complete");
  }

  /** Results for every character that has rolled, for the GM to apply. */
  results() {
    return [...this.rows.values()].filter((r) => r.res).map((r) => ({ actorId: r.p.actorId, name: r.p.name, values: r.values.map((v, i) => r.over[i] ?? v), res: r.res, out: r.out }));
  }

  async close() {
    if (this.closed) return;
    this.closed = true; this.traumaDone();
    for (const t of this.timers) clearTimeout(t);
    window.removeEventListener("resize", this.layout);
    this.el.classList.add("is-closing"); this.el.classList.remove("is-open");
    await wait(650);
    for (const d of this.tdice) d.destroy();
    for (const r of this.rows.values()) for (const d of r.dice) d.destroy();
    this.fx.destroy();
    this.el.remove();
  }
}

/** A short full-screen banner, used when the Light grants a boon. */
export function banner({ title, sub, text, kind = "light", low = false, ms = 5200 }) {
  document.getElementById("grim-sanity-banner")?.remove();
  const el = document.createElement("div");
  el.id = "grim-sanity-banner";
  el.className = `gsn-banner is-${kind}${low ? " is-low" : ""}`;
  el.innerHTML = `
    <div class="gsn-banner-rays"></div><canvas class="gsn-fx"></canvas>
    <div class="gsn-banner-box">
      <div class="gsn-banner-art">${sigil(kind === "light" ? "light" : "abyss")}</div>
      <div class="gsn-banner-kicker"><span>${esc(sub ?? "")}</span></div>
      <div class="gsn-banner-title">${esc(title)}</div>
      <div class="gsn-banner-text">${esc(text ?? "")}</div>
    </div>`;
  document.body.appendChild(el);
  const fx = new Field(el.querySelector(".gsn-fx"), { low: true });
  fx.ambient = 0;
  requestAnimationFrame(() => {
    el.classList.add("is-open");
    if (!low) { const r = el.querySelector(".gsn-banner-art").getBoundingClientRect(); fx.low = false; fx.burst(kind === "light" ? "gold" : "ember", r.left + r.width / 2, r.top + r.height / 2, 120, 90); }
  });
  const end = () => { el.classList.add("is-closing"); setTimeout(() => { fx.destroy(); el.remove(); }, 800); };
  const t = setTimeout(end, ms);
  el.addEventListener("click", () => { clearTimeout(t); end(); });
}
