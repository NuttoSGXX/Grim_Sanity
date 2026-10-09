// Grim Sanity: wiring. Settings, the GM button, socket sync, and the flow of a duel.
import { MODULE_ID, SOCKET, MAX_TRAUMA, INSANITY_DICE, clamp, rollDice } from "./logic.js";
import { cardById, boonById, pickLine, openCards, drawCards, STAMPS, UNTIL } from "./cards.js";
import { get, set, lang, txt, sanity, party, tracked, applyOutcome, longRest, mend, crack, setCracked, clearCondition, mostCracked, endScene, inflict, clearMadness, expireMadness, burn } from "./store.js";
import { TIER_NAME } from "./madness.js";
import { play } from "./sfx.js";
import { Duel, banner } from "./duel.js";
import { Panel } from "./panel.js";
import { Hud } from "./hud.js";

const state = { duel: null, overlay: null, panel: null, hud: null, starting: false };
const emit = (data) => game.socket.emit(SOCKET, data);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hex = (c) => (/^#[0-9a-f]{3,8}$/i.test(c ?? "") ? c : null);

/* ---------- settings ---------- */
Hooks.once("init", () => {
  const redraw = () => state.hud?.schedule();
  const reg = (key, data) => game.settings.register(MODULE_ID, key, { onChange: redraw, ...data });
  reg("cardLang", { name: "Card language", hint: "The language of card names, board effects and symptoms. The controls stay in English.", scope: "world", config: true, type: String, choices: { th: "ไทย (Thai)", en: "English" }, default: "th" });
  reg("accent", { name: "Accent colour", hint: "Hex colour of the darkness, for everyone. Default is Grim red #c8141e.", scope: "world", config: true, type: String, default: "#c8141e" });
  reg("dim", { name: "Backdrop darkness (%)", hint: "How dark the screen fades during a duel. 82 keeps the scene faintly visible.", scope: "world", config: true, type: Number, range: { min: 40, max: 95, step: 1 }, default: 82 });
  reg("minDice", { name: "Fewest Sanity Dice", hint: "A character never starts with fewer dice than this.", scope: "world", config: true, type: Number, range: { min: 1, max: 4, step: 1 }, default: 2 });
  reg("maxDice", { name: "Most Sanity Dice", hint: "A character never starts with more dice than this. Dice = best of INT, WIS, CHA modifier + 1.", scope: "world", config: true, type: Number, range: { min: 3, max: 8, step: 1 }, default: 5 });
  reg("restDice", { name: "Dice mended by a long rest", hint: "0 turns off automatic mending.", scope: "world", config: true, type: Number, range: { min: 0, max: 5, step: 1 }, default: 1 });
  reg("inspiration", { name: "Inspiration for the unshaken", hint: "A character who wins every pair gains Inspiration, once per session.", scope: "world", config: true, type: Boolean, default: true });
  reg("madness", { name: "Madness", hint: "Losing pairs also brings a madness from the 5e tables: 1 pair short-term, 2 long-term, 3 or more long-term and indefinite. Playable leaves out results that take a character out of the game (paralysed, stunned, unconscious).", scope: "world", config: true, type: String, choices: { full: "Full tables", playable: "Playable results only", off: "Off" }, default: "full" });
  reg("frayed", { name: "Cracked dice weaken the mind", hint: "Each cracked Sanity Die is -1 to Intelligence, Wisdom and Charisma saving throws.", scope: "world", config: true, type: Boolean, default: true });
  reg("applyChanges", { name: "Symptoms change the sheet", hint: "Where dnd5e allows it, a symptom also applies its rule (for example disadvantage on Stealth). Turn off to keep symptoms as notes only.", scope: "world", config: true, type: Boolean, default: true });
  reg("hudPlayers", { name: "Players see the party strip", scope: "world", config: true, type: Boolean, default: true });
  reg("postToChat", { name: "Post results to chat", scope: "world", config: true, type: Boolean, default: true });
  reg("hudShow", { name: "Show the party strip", scope: "client", config: true, type: Boolean, default: true });
  reg("hudScale", { name: "Party strip size (%)", scope: "client", config: true, type: Number, range: { min: 70, max: 160, step: 5 }, default: 100 });
  reg("sound", { name: "Sound effects", scope: "client", config: true, type: Boolean, default: true });
  reg("volume", { name: "Sound effects volume (%)", hint: "Also follows Foundry's own Interface volume.", scope: "client", config: true, type: Number, range: { min: 0, max: 100, step: 5 }, default: 70 });
  reg("lowFx", { name: "Reduced effects", hint: "Turn off particles, fog and flashes on this computer if the screen stutters.", scope: "client", config: true, type: Boolean, default: false });
  reg("deck", { scope: "world", config: false, type: Object, default: { off: {}, suits: {}, cap: 3, preset: "travel" } });
  reg("hidden", { scope: "world", config: false, type: Object, default: {} });
  reg("ward", { scope: "world", config: false, type: Boolean, default: false });
  reg("hudPos", { scope: "client", config: false, type: Object, default: {} });
  reg("hudFolded", { scope: "client", config: false, type: Boolean, default: false });
  reg("panelPos", { scope: "client", config: false, type: Object, default: {} });

  game.keybindings.register(MODULE_ID, "open", {
    name: "Open Grim Sanity", hint: "GM only. Opens the Grim Sanity panel.",
    editable: [{ key: "KeyM", modifiers: ["Alt"] }], restricted: true,
    onDown: () => { openPanel(); return true; }
  });
});

Hooks.once("ready", () => {
  game.socket.on(SOCKET, onSocket);
  state.hud = new Hud({ onPanel: openPanel, onInsanity: insanityDie });
  state.hud.build();
  const mod = game.modules.get(MODULE_ID);
  if (mod) mod.api = {
    open: openPanel,
    /** Start a duel. { cardId } or { trauma, title }, plus optional actorIds. */
    startDuel: (o = {}) => game.user.isGM && startDuel({
      card: o.cardId ? { id: o.cardId, trauma: cardById(o.cardId)?.trauma ?? 1 } : { id: null, title: o.title ?? "The Unseen", trauma: clamp(Number(o.trauma) || 1, 1, MAX_TRAUMA) },
      actors: o.actorIds ?? tracked().map((p) => p.actor.id)
    }),
    /** Supply the Trauma Dice from outside (for example, rolled by viewers). */
    setTrauma: (values) => game.user.isGM && rollTrauma(values),
    shine: (actorId, col) => game.user.isGM && shine(actorId, col),
    seal: () => game.user.isGM && seal(),
    cancel: () => game.user.isGM && endDuel(),
    grant: (boonId, actorId) => game.user.isGM && grant(boonId, actorId),
    draw: (count = 3) => drawCards(get("deck"), count).map((c) => c.id),
    openCards: () => openCards(get("deck")).map((c) => c.id),
    /** Roll a fresh madness on a character: "short", "long" or "indef". */
    inflict: (actor, tier) => game.user.isGM && inflictAndShow(actor, tier),
    sanity, party, crack, mend, setCracked, clearCondition, clearMadness, endScene, state
  };
});

// GM button in the Token controls (Foundry V13+ uses a record, older cores an array)
Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.user?.isGM) return;
  const tool = { name: "grimSanity", title: "Grim Sanity", icon: "fa-solid fa-skull", button: true, visible: true };
  if (Array.isArray(controls)) {
    controls.find((c) => c.name === "token")?.tools?.push({ ...tool, onClick: openPanel });
  } else {
    const group = controls.tokens ?? controls.token;
    if (group?.tools) group.tools.grimSanity = { ...tool, order: Object.keys(group.tools).length, onChange: () => openPanel() };
  }
});

// Keep the strip and the panel in step with the world.
for (const hook of ["updateActor", "createActor", "deleteActor", "updateUser", "userConnected"]) {
  Hooks.on(hook, () => { state.hud?.schedule(); if (state.panel?.open && !state.panel.el.matches(":focus-within")) state.panel.render(); });
}

// Timed madness ends when world time passes it. One GM's computer does the bookkeeping.
Hooks.on("updateWorldTime", () => {
  const lead = game.users?.activeGM ? game.users.activeGM.id === game.user.id : game.user.isGM;
  if (lead) expireMadness().catch((e) => console.warn(`${MODULE_ID} | madness timer`, e));
});

// A long rest mends dice. The hook fires on the computer that ran the rest.
Hooks.on("dnd5e.restCompleted", (actor, result, config) => {
  const long = result?.longRest ?? (result?.type === "long" || config?.type === "long");
  if (long && Number(get("restDice")) > 0) longRest(actor).catch((e) => console.warn(`${MODULE_ID} | rest`, e));
});

function openPanel() {
  if (!game.user.isGM) return;
  if (game.system?.id !== "dnd5e") ui.notifications?.warn("Grim Sanity is built for the dnd5e system.");
  state.panel ??= new Panel({ start: startDuel, grant, inflict: inflictAndShow, busy: () => !!state.duel || state.starting });
  state.panel.toggle();
}

/* ---------- a duel, GM side ---------- */
async function startDuel(spec) {
  // `starting` closes the gap between this check and the first await, so two calls cannot both pass
  if (state.duel || state.starting) { ui.notifications?.warn("Grim Sanity: a duel is already on screen."); return; }
  state.starting = true;
  try { await launchDuel(spec); } finally { state.starting = false; }
}

async function launchDuel({ card, actors }) {
  const def = card.id ? cardById(card.id) : null;
  const trauma = clamp(Number(card.trauma) || def?.trauma || 1, 1, MAX_TRAUMA);
  const byId = new Map(party().map((p) => [p.actor.id, p]));
  const players = actors.map((id) => byId.get(id)).filter(Boolean).slice(0, 8).map(({ actor, user }) => {
    const s = sanity(actor);
    return {
      actorId: actor.id, userId: user?.id ?? null, name: actor.name, img: actor.img,
      color: hex(user?.color?.css ?? String(user?.color ?? "")) ?? "#c8141e",
      sub: `${s.intact} of ${s.max} Sanity Dice`, unhinged: s.unhinged, intact: s.intact,
      count: s.unhinged ? INSANITY_DICE : s.intact, sides: s.unhinged ? 8 : 6
    };
  });
  if (!players.length) { ui.notifications?.warn("Grim Sanity: no character to duel."); return; }
  const ward = !!get("ward");
  if (ward) await set("ward", false);
  const duel = {
    id: foundry.utils.randomID?.() ?? Math.random().toString(36).slice(2),
    card: { id: card.id ?? null, title: card.title ?? null, trauma }, trauma, line: pickLine(trauma), ward, players,
    dim: get("dim"), accent: hex(get("accent")), lang: lang()
  };
  emit({ t: "start", duel });
  await begin(duel);
}

async function rollValues(count, sides) {
  try {
    const r = await new Roll(`${count}d${sides}`).evaluate({ allowInteractive: false });
    const v = r.dice[0].results.map((x) => x.result);
    if (v.length === count) return v;
  } catch (e) { console.warn(`${MODULE_ID} | Roll failed, using fallback`, e); }
  return rollDice(count, sides);
}

async function rollTrauma(given) {
  const d = state.duel; if (!d || state.overlay?.trauma) return;
  const ok = Array.isArray(given) && given.length === d.trauma && given.every((v) => Number.isInteger(v) && v >= 1 && v <= 6);
  const values = ok ? given : await rollValues(d.trauma, 6);
  if (state.duel?.id !== d.id) return;
  emit({ t: "trauma", id: d.id, values });
  state.overlay?.setTrauma(values);
}

async function rollPlayer(p) {
  const d = state.duel; if (!d) return;
  const values = await rollValues(p.count, p.sides);
  if (state.duel?.id !== d.id) return;
  emit({ t: "proll", id: d.id, actorId: p.actorId, values });
  state.overlay?.setPlayer(p.actorId, values);
}

async function shine(actorId, col) {
  const d = state.duel, p = d?.players.find((x) => x.actorId === actorId); if (!p || state.overlay?.shineUsed) return;
  const [value] = await rollValues(1, p.sides);
  if (state.duel?.id !== d.id) return;
  emit({ t: "shine", id: d.id, actorId, col, value });
  state.overlay?.shine(actorId, col, value);
}

async function seal() {
  const d = state.duel, o = state.overlay; if (!d || !o) return;
  const results = o.results();
  sfx("seal");
  endDuel();
  const lines = [];
  for (const r of results) {
    const actor = game.actors.get(r.actorId); if (!actor) continue;
    let extra = {};
    try { extra = await applyOutcome(actor, r.out, d.card); } catch (e) { console.warn(`${MODULE_ID} | could not apply result`, e); }
    lines.push({ ...r, inspired: !!extra.inspired, mad: extra.mad ?? [] });
  }
  if (get("postToChat") && lines.length) postChat(d, o.trauma, lines);
  const rows = lines.filter((r) => r.mad.length).map((r) => ({ name: r.name, mad: r.mad.map(madLine) }));
  if (rows.length) setTimeout(() => { const msg = { t: "mad", rows }; emit(msg); showMad(msg); }, 900);
}

function endDuel() {
  if (!state.duel) return;
  emit({ t: "close", id: state.duel.id });
  finish();
}

/* ---------- shared flow ---------- */
async function begin(duel) {
  await finish();
  state.duel = duel;
  const isGM = game.user.isGM;
  state.overlay = new Duel(duel, {
    isGM, lang: duel.lang ?? lang(), dim: duel.dim, accent: duel.accent, low: get("lowFx"),
    canRoll: (p) => isGM || p.userId === game.user.id || !!game.actors.get(p.actorId)?.isOwner,
    onTrauma: () => isGM && rollTrauma(), onPlayer: rollPlayer, onShine: (a, c) => isGM && shine(a, c),
    onSeal: seal, onCancel: endDuel, onDismiss: finish, sfx
  });
}

async function finish() {
  const o = state.overlay;
  state.overlay = null; state.duel = null;
  if (o) await o.close();
  if (state.panel?.open) state.panel.render();
}

function onSocket(msg) {
  if (!msg?.t) return;
  if (msg.t === "start") return begin(msg.duel);
  if (msg.t === "boon") return showBoon(msg);
  if (msg.t === "mad") return showMad(msg);
  if (!state.duel || msg.id !== state.duel.id) return;
  if (msg.t === "trauma") state.overlay?.setTrauma(msg.values);
  else if (msg.t === "proll") state.overlay?.setPlayer(msg.actorId, msg.values);
  else if (msg.t === "shine") state.overlay?.shine(msg.actorId, msg.col, msg.value);
  else if (msg.t === "close") finish();
}

/* ---------- the Light ---------- */
async function grant(boonId, actorId) {
  const b = boonById(boonId); if (!b) return;
  let who = null;
  if (b.auto === "restore") { const p = mostCracked(); if (p) { await mend(p.actor, 1); who = p.actor.name; } }
  else if (b.auto === "cleanse") { const a = game.actors.get(actorId); if (a && sanity(a).cond) { await clearCondition(a); who = a.name; } }
  else if (b.auto === "ward") await set("ward", true);
  const msg = { t: "boon", id: boonId, who };
  emit(msg); showBoon(msg);
  if (get("postToChat")) {
    const t = txt(b);
    ChatMessage.create({ content: `<div class="gsn-chat is-light"><div class="gsn-chat-kicker">The Light answers</div><div class="gsn-chat-title">${esc(t.name)}</div><p>${esc(t.effect)}${who ? ` <b>${esc(who)}</b>` : ""}</p><p class="gsn-chat-told">${esc(t.told)}</p></div>` });
  }
}

function showBoon(msg) {
  const b = boonById(msg.id); if (!b) return;
  const t = txt(b);
  banner({ kind: "light", sub: "The Light answers", title: t.name, text: `${t.effect}${msg.who ? ` (${msg.who})` : ""}`, low: get("lowFx") });
  sfx("boon");
}

/* ---------- madness ---------- */
const madLine = (m) => ({ tier: m.tier, name: m.name, text: m.text, span: m.span });

function showMad(msg) {
  const rows = (msg.rows ?? []).slice(0, 8); if (!rows.length) return;
  banner({ kind: "dark", sub: "Madness takes hold", title: rows.length === 1 ? rows[0].name : "The Mind Gives Way", rows, low: get("lowFx"), ms: 5200 + rows.length * 1400 });
  sfx("madness");
}

async function inflictAndShow(actor, tier) {
  const m = await inflict(actor, tier); if (!m) return null;
  const msg = { t: "mad", rows: [{ name: actor.name, mad: [madLine(m)] }] };
  emit(msg); showMad(msg);
  return m;
}

/* ---------- small things ---------- */
/** An unhinged character spends an Insanity Die: +1d8 to a roll, paid for in psychic damage. */
async function insanityDie(actor) {
  const [v] = await rollValues(1, 8);
  const burned = await burn(actor, v);
  let mad = null;
  if (v === 1) {
    // Only the GM may change another player's sheet beyond damage, but an owner can change their own character.
    try { mad = await inflict(actor, "short"); } catch (e) { console.warn(`${MODULE_ID} | madness`, e); }
    if (mad) { const msg = { t: "mad", rows: [{ name: actor.name, mad: [madLine(mad)] }] }; emit(msg); showMad(msg); }
  }
  sfx("crack");
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="gsn-chat is-insane"><div class="gsn-chat-kicker">Insanity Die</div><div class="gsn-chat-total">+${v}</div><p>Add it to one attack or damage roll this turn. ${esc(actor.name)} takes <b>${v} psychic damage</b>${burned ? "" : " (apply it by hand)"}.</p>${v === 1 ? `<p class="gsn-chat-told">A 1: ${mad ? `${esc(TIER_NAME.short.en)}: <b>${esc(mad.name)}</b>. ${esc(mad.text)}` : "a short-term madness takes hold."}</p>` : ""}</div>`
  });
}

function sfx(name) {
  if (!get("sound")) return;
  let ui = 1;
  try { ui = Number(game.settings.get("core", "globalInterfaceVolume")); if (!Number.isFinite(ui)) ui = 1; } catch (e) { /* older or newer core: use our own volume alone */ }
  play(name, (Number(get("volume")) / 100) * ui);
}

function postChat(duel, trauma, lines) {
  try {
    const def = duel.card.id ? cardById(duel.card.id) : null;
    const t = def ? txt(def) : { name: duel.card.title ?? "The Unseen", symptom: "" };
    const rows = lines.map((r) => {
      const dice = r.res.pairs.map((p) => `<span class="${p.win ? "ok" : "no"}">${p.p}<small>v${p.t}</small></span>`).join("");
      const bits = [];
      if (r.out.cracks) bits.push(`${r.out.cracks} cracked`);
      if (r.out.until && def) bits.push(UNTIL[r.out.until]);
      if (r.inspired) bits.push("Inspiration");
      const mad = (r.mad ?? []).map((m) => `<small class="gsn-chat-mad"><b>${esc(TIER_NAME[m.tier].en)} · ${esc(m.name)}</b> (${esc(m.span)}) ${esc(m.text)}</small>`).join("");
      return `<div class="gsn-chat-row is-${r.out.key}"><b>${esc(r.name)}</b><span class="gsn-chat-dice">${dice}</span><em>${STAMPS[r.out.key]}</em>${bits.length ? `<small>${esc(bits.join(" · "))}</small>` : ""}${mad}</div>`;
    }).join("");
    ChatMessage.create({
      content: `<div class="gsn-chat"><div class="gsn-chat-kicker">Trial of Sanity · Trauma ${duel.trauma}</div><div class="gsn-chat-title">${esc(t.name)}</div>
        <div class="gsn-chat-trauma">${(trauma ?? []).map((v) => `<i>${v}</i>`).join("")}</div>${rows}${t.symptom ? `<p class="gsn-chat-told">${esc(t.symptom)}</p>` : ""}</div>`
    });
  } catch (e) { console.warn(`${MODULE_ID} | chat card failed`, e); }
}
