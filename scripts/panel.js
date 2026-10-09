// Grim Sanity: the GM panel. Four tabs: call a duel, open and close the deck,
// tend the party's dice, and grant the Light's boons.
import { MAX_TRAUMA } from "./logic.js";
import { DARK, LIGHT, SUITS, PRESETS, UNTIL_SHORT, openCards, drawCards, presetDeck, cardById } from "./cards.js";
import { party, tracked, sanity, get, set, lang, crack, mend, setMax, clearCondition, clearMadness, endScene, newSession, mendAll } from "./store.js";
import { cardMarkup } from "./duel.js";
import { miniD6, miniD8 } from "./art.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const TABS = [["duel", "Duel"], ["deck", "Deck"], ["party", "Party"], ["light", "Light"]];

export class Panel {
  /** @param h { start(spec), grant(boonId, actorId), inflict(actor, tier), busy() } */
  constructor(h) {
    this.h = h; this.el = null;
    this.s = { tab: "duel", drawn: [], pick: null, custom: { title: "The Unseen", trauma: 1 }, who: {}, target: {} };
  }

  get open() { return !!this.el; }
  toggle() { this.open ? this.close() : this.show(); }
  close() { this.el?.remove(); this.el = null; }

  show() {
    if (this.el) return;
    const el = this.el = document.createElement("div");
    el.id = "grim-sanity-panel";
    el.className = "gsn-panel";
    const pos = get("panelPos") ?? {};
    el.style.left = `${Math.max(0, Math.min(window.innerWidth - 200, pos.left ?? 110))}px`;
    el.style.top = `${Math.max(0, Math.min(window.innerHeight - 120, pos.top ?? 70))}px`;
    document.body.appendChild(el);
    for (const p of tracked()) if (!(p.actor.id in this.s.who)) this.s.who[p.actor.id] = true;
    this.bind();
    this.render();
  }

  deck() { return get("deck") ?? {}; }
  async saveDeck(d) { await set("deck", d); this.render(); }

  /* ---------- tabs ---------- */
  duelTab() {
    const s = this.s, deck = this.deck(), open = openCards(deck), L = lang();
    if (s.pick && s.pick !== "custom" && !open.some((c) => c.id === s.pick)) s.pick = null;
    s.drawn = s.drawn.filter((id) => open.some((c) => c.id === id));
    const picked = s.pick && s.pick !== "custom" ? cardById(s.pick) : null;
    const tiles = s.drawn.map((id) => `<button type="button" class="gsn-tile${s.pick === id ? " on" : ""}" data-pick="${id}">${cardMarkup({ id }, L, { compact: true })}</button>`).join("");
    const options = [`<option value="">Choose a card…</option>`, ...open.map((c) => `<option value="${c.id}"${s.pick === c.id ? " selected" : ""}>${esc(c[L].name)} · ${c.trauma}</option>`),
      `<option value="custom"${s.pick === "custom" ? " selected" : ""}>No card: Trauma only</option>`].join("");
    const list = tracked().map(({ actor, user, online }) => {
      const st = sanity(actor), on = !!s.who[actor.id];
      return `
        <div class="gsn-prow${on ? " on" : ""}">
          <button type="button" class="gsn-check" data-who="${actor.id}" aria-pressed="${on}"></button>
          <img src="${esc(actor.img || "icons/svg/mystery-man.svg")}" alt="">
          <div class="gsn-who"><b>${esc(actor.name)}</b><span>${esc(user?.name ?? "No player")}${user && !online ? " · offline" : ""}</span></div>
          <span class="gsn-count${st.unhinged ? " is-insane" : ""}">${st.unhinged ? "2d8" : `${st.intact}d6`}</span>
        </div>`;
    }).join("");
    const count = tracked().filter((p) => s.who[p.actor.id]).length;
    const ward = !!get("ward");
    const trauma = picked?.trauma ?? s.custom.trauma;
    const why = this.h.busy?.() ? "A duel is already on screen" : !s.pick ? "Draw or choose a card" : !count ? "Choose at least one character" : "";
    return `
      <div class="gsn-drawrow">
        <button type="button" class="gsn-btn" data-draw>Draw 3</button>
        <select data-set="pick">${options}</select>
        <span class="gsn-open">${open.length} / ${DARK.length} open</span>
      </div>
      ${tiles ? `<div class="gsn-tiles">${tiles}</div>` : open.length ? "" : `<p class="gsn-hint">The deck is sealed. Open cards in the Deck tab, or call a duel with Trauma only.</p>`}
      ${picked ? `<div class="gsn-pick"><b>${esc(picked[L].name)}</b><span>${SUITS[picked.suit].en} · Trauma ${picked.trauma} · ${picked.who === "area" ? "those inside the area" : "the whole party"}</span><p>${esc(picked[L].board)}</p><p class="is-symptom">${esc(picked[L].symptom)}</p></div>` : ""}
      ${s.pick === "custom" ? `
        <div class="gsn-field"><label>Name</label><input type="text" data-custom="title" value="${esc(s.custom.title)}" maxlength="40"></div>
        <div class="gsn-field"><label>Trauma</label><div class="gsn-seg">${[1, 2, 3, 4, 5].slice(0, MAX_TRAUMA).map((n) => `<button type="button" class="${s.custom.trauma === n ? "on" : ""}" data-trauma="${n}">${n}</button>`).join("")}</div></div>
        <p class="gsn-hint">For the module's own madness saves: 1 for the unnatural, 2 to 3 for a demon lord's work, 4 to 5 for seeing one. No symptom is applied.</p>` : ""}
      <div class="gsn-listhead"><span>Who faces it</span><span>${count} chosen</span><button type="button" data-all="1">All</button><button type="button" data-all="">None</button></div>
      <div class="gsn-list">${list || `<div class="gsn-empty">No player-owned characters found. Give a player Owner permission on a character.</div>`}</div>
      <div class="gsn-foot">
        <button type="button" class="gsn-switch${ward ? " on" : ""}" data-ward title="Heart Ward: ties go to the players in the next duel"><i></i>Heart Ward</button>
        <span class="gsn-why">${esc(why)}</span>
        <button type="button" class="gsn-go" data-go ${why ? "disabled" : ""}>Unleash${s.pick ? ` · ${trauma}` : ""}</button>
      </div>`;
  }

  deckTab() {
    const deck = this.deck(), L = lang(), cap = Number(deck.cap) || 3;
    const presets = Object.entries(PRESETS).map(([k, p]) => `<button type="button" class="${deck.preset === k ? "on" : ""}" data-preset="${k}">${p.label}</button>`).join("");
    const suits = Object.entries(SUITS).map(([key, sdef]) => {
      const on = deck.suits?.[key] !== false;
      const cards = DARK.filter((c) => c.suit === key).map((c) => {
        const open = on && !deck.off?.[c.id] && c.trauma <= cap;
        return `<button type="button" class="gsn-dcard${open ? " on" : ""}${c.trauma > cap ? " is-capped" : ""}" data-card="${c.id}" ${on ? "" : "disabled"} title="${esc(c[L].symptom)}">
          <span class="gsn-dpips">${"<i></i>".repeat(c.trauma)}</span><b>${esc(c[L].name)}</b><small>${esc(c[L === "th" ? "en" : "th"].name)}</small></button>`;
      }).join("");
      return `<div class="gsn-suit${on ? "" : " is-off"}"><button type="button" class="gsn-switch${on ? " on" : ""}" data-suit="${key}"><i></i>${sdef.en}<small>${esc(sdef.th)}</small></button><div class="gsn-dcards">${cards}</div></div>`;
    }).join("");
    return `
      <div class="gsn-field"><label>Scene</label><div class="gsn-seg">${presets}</div></div>
      <div class="gsn-field"><label>Cap</label><div class="gsn-seg">${[1, 2, 3].map((n) => `<button type="button" class="${cap === n ? "on" : ""}" data-cap="${n}">${n === 3 ? "Any" : `Up to ${n}`}</button>`).join("")}</div></div>
      <div class="gsn-suits">${suits}</div>
      <p class="gsn-hint">Closed cards are never drawn. Change this at any time, even between scenes of one session.</p>`;
  }

  partyTab() {
    const rows = party().map(({ actor, hidden }) => {
      const s = sanity(actor);
      const dice = s.unhinged
        ? `<i class="gsn-mini is-d8">${miniD8}</i><i class="gsn-mini is-d8">${miniD8}</i>`
        : Array.from({ length: s.max }, (_, i) => `<i class="gsn-mini${i >= s.intact ? " is-cracked" : ""}">${miniD6}</i>`).join("");
      return `
        <div class="gsn-prow gsn-party${hidden ? "" : " on"}${s.unhinged ? " is-unhinged" : ""}">
          <button type="button" class="gsn-check" data-track="${actor.id}" aria-pressed="${!hidden}" title="Track this character"></button>
          <img src="${esc(actor.img || "icons/svg/mystery-man.svg")}" alt="">
          <div class="gsn-who"><b>${esc(actor.name)}</b>
            <span>${s.unhinged ? "Unhinged" : `${s.intact} of ${s.max} dice`}${s.custom ? " · set by hand" : ""}${s.insp ? " · inspired" : ""}</span></div>
          <div class="gsn-pdice">${dice}</div>
          <div class="gsn-steps">
            <button type="button" data-crack="${actor.id}" title="Crack a die" ${s.cracked >= s.max ? "disabled" : ""}>Crack</button>
            <button type="button" data-mend="${actor.id}" title="Mend a die" ${s.cracked <= 0 ? "disabled" : ""}>Mend</button>
            <button type="button" data-max="${actor.id}" data-d="-1" title="One die fewer">−</button>
            <button type="button" data-max="${actor.id}" data-d="1" title="One die more">+</button>
          </div>
          <div class="gsn-madrow"><label>Madness</label>
            ${s.mad.map((m) => `<span class="gsn-madchip is-${m.tier}" title="${esc(m.text)}"><em>${esc(m.name)}</em><small>${esc(m.tier === "indef" ? "until mended" : m.span)}</small><button type="button" data-unmad="${actor.id}" data-tier="${m.tier}" title="Remove this madness">×</button></span>`).join("")}
            <span class="gsn-steps"><button type="button" data-mad="${actor.id}" data-tier="short" title="Roll a short-term madness (1d10 minutes)">+ Short</button><button type="button" data-mad="${actor.id}" data-tier="long" title="Roll a long-term madness (1d10 x 10 hours)">+ Long</button><button type="button" data-mad="${actor.id}" data-tier="indef" title="Roll an indefinite madness (a flaw, until every die has mended)">+ Indef</button></span>
          </div>
          ${s.cond ? `<div class="gsn-cond"><em>${esc(s.cond.name)}</em><small>${esc(UNTIL_SHORT[s.cond.until] ?? "")}</small><span>${esc(s.cond.text)}</span><button type="button" data-clear="${actor.id}" title="Remove the symptom">×</button></div>` : ""}
        </div>`;
    }).join("");
    return `
      <div class="gsn-list gsn-list-tall">${rows || `<div class="gsn-empty">No player-owned characters found.</div>`}</div>
      <div class="gsn-foot gsn-foot-3">
        <button type="button" class="gsn-btn" data-scene title="Remove symptoms that last until the scene ends">End Scene</button>
        <button type="button" class="gsn-btn" data-session title="Let each character earn Inspiration from a duel again">New Session</button>
        <button type="button" class="gsn-btn" data-mendall title="Mend every die of every character">Mend All</button>
      </div>`;
  }

  lightTab() {
    const L = lang(), list = tracked();
    const rows = LIGHT.map((b) => {
      const t = b[L];
      const pickers = b.auto === "cleanse"
        ? `<select data-target="${b.id}">${list.filter((p) => sanity(p.actor).cond).map((p) => `<option value="${p.actor.id}"${this.s.target[b.id] === p.actor.id ? " selected" : ""}>${esc(p.actor.name)}</option>`).join("") || `<option value="">No one has a symptom</option>`}</select>` : "";
      return `
        <div class="gsn-boon${b.auto ? " is-auto" : ""}">
          <div class="gsn-who"><b>${esc(t.name)}</b><span>${esc(t.effect)}</span></div>
          ${pickers}
          <button type="button" class="gsn-btn gsn-btn-light" data-grant="${b.id}">Grant</button>
        </div>`;
    }).join("");
    return `<p class="gsn-hint">Granting a boon shows it to everyone. The three marked boons are also applied by the module.</p><div class="gsn-list gsn-list-tall">${rows}</div>`;
  }

  /* ---------- rendering ---------- */
  render() {
    if (!this.el) return;
    const s = this.s;
    const scroll = this.el.querySelector(".gsn-list")?.scrollTop ?? 0;
    const body = s.tab === "deck" ? this.deckTab() : s.tab === "party" ? this.partyTab() : s.tab === "light" ? this.lightTab() : this.duelTab();
    this.el.innerHTML = `
      <div class="gsn-panel-head" data-drag><span class="gsn-mark"></span><h2>Grim Sanity</h2><button type="button" class="gsn-x" data-close title="Close">×</button></div>
      <div class="gsn-tabs">${TABS.map(([k, l]) => `<button type="button" class="${s.tab === k ? "on" : ""}" data-tab="${k}">${l}</button>`).join("")}</div>
      <div class="gsn-panel-body gsn-tab-${s.tab}">${body}</div>`;
    const list = this.el.querySelector(".gsn-list"); if (list) list.scrollTop = scroll;
  }

  /* ---------- events ---------- */
  bind() {
    const el = this.el;
    el.addEventListener("click", async (ev) => {
      const t = ev.target.closest("button"); if (!t || t.disabled) return;
      const d = t.dataset, s = this.s, actor = (id) => game.actors.get(id);
      if ("close" in d) return this.close();
      if (d.tab) { s.tab = d.tab; return this.render(); }
      // duel
      if ("draw" in d) { s.drawn = drawCards(this.deck(), 3).map((c) => c.id); s.pick = s.drawn[0] ?? s.pick; return this.render(); }
      if (d.pick) { s.pick = d.pick; return this.render(); }
      if (d.trauma) { s.custom.trauma = Number(d.trauma); return this.render(); }
      if (d.who) { s.who[d.who] = !s.who[d.who]; return this.render(); }
      if ("all" in d) { for (const p of tracked()) s.who[p.actor.id] = !!d.all; return this.render(); }
      if ("ward" in d) { await set("ward", !get("ward")); return this.render(); }
      if ("go" in d) return this.start();
      // deck
      if (d.preset) return this.saveDeck(presetDeck(d.preset));
      if (d.cap) return this.saveDeck({ ...this.deck(), cap: Number(d.cap), preset: null });
      if (d.suit) { const k = this.deck(); return this.saveDeck({ ...k, suits: { ...(k.suits ?? {}), [d.suit]: k.suits?.[d.suit] === false }, preset: null }); }
      if (d.card) { const k = this.deck(), off = { ...(k.off ?? {}) }; if (off[d.card]) delete off[d.card]; else off[d.card] = true; return this.saveDeck({ ...k, off, preset: null }); }
      // party
      if (d.track) { const h = { ...(get("hidden") ?? {}) }; if (h[d.track]) delete h[d.track]; else h[d.track] = true; await set("hidden", h); return this.render(); }
      if (d.crack) { await crack(actor(d.crack), 1); return this.render(); }
      if (d.mend) { await mend(actor(d.mend), 1); return this.render(); }
      if (d.max) { const a = actor(d.max); await setMax(a, sanity(a).max + Number(d.d)); return this.render(); }
      if (d.clear) { await clearCondition(actor(d.clear)); return this.render(); }
      if (d.mad) { await this.h.inflict?.(actor(d.mad), d.tier); return this.render(); }
      if (d.unmad) { await clearMadness(actor(d.unmad), d.tier); return this.render(); }
      if ("scene" in d) { await endScene(); return this.render(); }
      if ("session" in d) { await newSession(); ui.notifications?.info("Grim Sanity: Inspiration can be earned from a duel again."); return this.render(); }
      if ("mendall" in d) { await mendAll(); return this.render(); }
      // light
      if (d.grant) { await this.h.grant?.(d.grant, s.target[d.grant] || el.querySelector(`select[data-target="${d.grant}"]`)?.value || null); return this.render(); }
    });
    el.addEventListener("change", (ev) => {
      const t = ev.target, d = t.dataset;
      if (d.set === "pick") { this.s.pick = t.value || null; return this.render(); }
      if (d.custom === "title") { this.s.custom.title = t.value.trim() || "The Unseen"; return; }
      if (d.target) { this.s.target[d.target] = t.value; }
    });
    el.addEventListener("pointerdown", (ev) => {
      if (!ev.target.closest("[data-drag]") || ev.target.closest("button")) return;
      const r = el.getBoundingClientRect(), ox = ev.clientX - r.left, oy = ev.clientY - r.top;
      const move = (e) => {
        el.style.left = `${Math.max(0, Math.min(window.innerWidth - 80, e.clientX - ox))}px`;
        el.style.top = `${Math.max(0, Math.min(window.innerHeight - 40, e.clientY - oy))}px`;
      };
      const up = () => {
        window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
        set("panelPos", { left: parseInt(el.style.left, 10), top: parseInt(el.style.top, 10) });
      };
      window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
      ev.preventDefault();
    });
  }

  start() {
    const s = this.s;
    const actors = tracked().filter((p) => s.who[p.actor.id]).map((p) => p.actor.id);
    if (!s.pick || !actors.length || this.h.busy?.()) return;
    const card = s.pick === "custom" ? { id: null, title: s.custom.title, trauma: s.custom.trauma } : { id: s.pick, trauma: cardById(s.pick).trauma };
    s.drawn = []; s.pick = null;
    this.close();
    this.h.start?.({ card, actors });
  }
}
