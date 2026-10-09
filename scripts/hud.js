// Grim Sanity: the party strip. Shows every tracked character's Sanity Dice at a glance.
import { tracked, sanity, get, set } from "./store.js";
import { UNTIL_SHORT } from "./cards.js";
import { miniD6, miniD8 } from "./art.js";
import { INSANITY_DICE } from "./logic.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export class Hud {
  /** @param h { onPanel(), onInsanity(actor) } */
  constructor(h) { this.h = h; this.el = null; this.prev = new Map(); this.queued = false; }

  build() {
    if (this.el) return;
    const el = this.el = document.createElement("div");
    el.id = "grim-sanity-hud";
    el.className = "gsn-hud";
    document.body.appendChild(el);
    el.addEventListener("click", (ev) => {
      if (ev.target.closest("[data-panel]")) return this.h.onPanel?.();
      if (ev.target.closest("[data-fold]")) return Promise.resolve(set("hudFolded", !get("hudFolded"))).then(() => this.refresh());
      const d8 = ev.target.closest(".gsn-hud-dice.is-insane");
      if (d8) { const a = game.actors.get(d8.closest("[data-actor]")?.dataset.actor); if (a?.isOwner) this.h.onInsanity?.(a); }
    });
    this.#drag();
    window.addEventListener("resize", () => this.place());
    this.refresh();
  }

  /** Coalesce bursts of document updates into one redraw. */
  schedule() {
    if (this.queued) return;
    this.queued = true;
    requestAnimationFrame(() => { this.queued = false; this.refresh(); });
  }

  refresh() {
    const el = this.el; if (!el) return;
    const show = game.user.isGM || get("hudPlayers");
    const list = show && get("hudShow") ? tracked() : [];
    el.hidden = !list.length;
    if (!list.length) return;
    const folded = !!get("hudFolded");
    el.classList.toggle("is-folded", folded);
    el.style.setProperty("--gsn-hud-scale", String((Number(get("hudScale")) || 100) / 100));
    const accent = get("accent");
    if (/^#[0-9a-f]{3,8}$/i.test(accent ?? "")) el.style.setProperty("--gsn-base", accent);

    const tiles = list.map(({ actor }) => {
      const s = sanity(actor), was = this.prev.get(actor.id);
      const dice = s.unhinged
        ? Array.from({ length: INSANITY_DICE }, () => `<i class="gsn-mini is-d8">${miniD8}</i>`).join("")
        : Array.from({ length: s.max }, (_, i) => {
          const cracked = i >= s.intact;
          const fresh = was && !was.unhinged && (cracked ? i < was.intact : i >= was.intact);
          return `<i class="gsn-mini${cracked ? " is-cracked" : ""}${fresh ? (cracked ? " just-cracked" : " just-mended") : ""}">${miniD6}</i>`;
        }).join("");
      const turned = was && was.unhinged !== s.unhinged;
      this.prev.set(actor.id, { intact: s.intact, unhinged: s.unhinged });
      const cond = s.cond ? `<span class="gsn-hud-cond" data-tooltip="${esc(s.cond.text)}"><em>${esc(s.cond.name)}</em><small>${esc(UNTIL_SHORT[s.cond.until] ?? "")}</small></span>` : "";
      return `
        <div class="gsn-hud-pc${s.unhinged ? " is-unhinged" : ""}${turned ? " just-turned" : ""}${s.cracked ? " is-hurt" : ""}" data-actor="${esc(actor.id)}">
          <div class="gsn-hud-face"><img src="${esc(actor.img || "icons/svg/mystery-man.svg")}" alt=""></div>
          <div class="gsn-hud-body">
            <b>${esc(actor.name)}</b>
            <div class="gsn-hud-dice${s.unhinged ? " is-insane" : ""}" ${s.unhinged ? 'data-tooltip="Unhinged: click to roll an Insanity Die"' : `data-tooltip="${s.intact} of ${s.max} Sanity Dice"`}>${dice}${s.unhinged ? "<span>Unhinged</span>" : ""}</div>
            ${cond}
          </div>
        </div>`;
    }).join("");

    el.innerHTML = `
      <div class="gsn-hud-head" data-drag>
        <span class="gsn-mark"></span><b>Sanity</b>
        ${game.user.isGM ? `<button type="button" data-panel data-tooltip="Open Grim Sanity"><i class="fa-solid fa-skull" inert></i></button>` : ""}
        <button type="button" data-fold data-tooltip="${folded ? "Show" : "Hide"}">${folded ? "+" : "−"}</button>
      </div>
      <div class="gsn-hud-list">${tiles}</div>`;
    this.place();
  }

  place() {
    const el = this.el; if (!el || el.hidden) return;
    const pos = get("hudPos") ?? {};
    const r = el.getBoundingClientRect();
    // first run: centred near the bottom, clear of the hotbar; after that, wherever it was dragged
    const left = Number.isFinite(pos.left) ? pos.left : (window.innerWidth - r.width) / 2;
    const top = Number.isFinite(pos.top) ? pos.top : window.innerHeight - r.height - 130;
    el.style.left = `${Math.max(0, Math.min(window.innerWidth - 60, left))}px`;
    el.style.top = `${Math.max(0, Math.min(window.innerHeight - 30, top))}px`;
  }

  #drag() {
    const el = this.el;
    el.addEventListener("pointerdown", (ev) => {
      if (!ev.target.closest("[data-drag]") || ev.target.closest("button")) return;
      const r = el.getBoundingClientRect(), ox = ev.clientX - r.left, oy = ev.clientY - r.top;
      const move = (e) => {
        el.style.left = `${Math.max(0, Math.min(window.innerWidth - 60, e.clientX - ox))}px`;
        el.style.top = `${Math.max(0, Math.min(window.innerHeight - 30, e.clientY - oy))}px`;
      };
      const up = () => {
        window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
        set("hudPos", { left: parseInt(el.style.left, 10), top: parseInt(el.style.top, 10) });
      };
      window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
      ev.preventDefault();
    });
  }
}
