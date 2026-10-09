// Grim Sanity: everything that reads or writes Foundry data (actor flags, effects, settings).
// Written defensively so a change between dnd5e or core versions degrades instead of breaking.
import { MODULE_ID, maxDice, clamp } from "./logic.js";
import { cardById, UNTIL } from "./cards.js";

export const get = (k) => game.settings.get(MODULE_ID, k);
export const set = (k, v) => game.settings.set(MODULE_ID, k, v);
export const lang = () => (get("cardLang") === "en" ? "en" : "th");
export const txt = (card) => card?.[lang()] ?? card?.th ?? card?.en ?? {};
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const ICON = (name) => `modules/${MODULE_ID}/assets/${name}.svg`;

/* ---------- reading ---------- */
export function sanity(actor) {
  const f = actor?.getFlag?.(MODULE_ID, "state") ?? {};
  const ab = actor?.system?.abilities ?? {};
  const natural = maxDice([ab.int?.mod, ab.wis?.mod, ab.cha?.mod], { min: num(get("minDice")) || 2, max: num(get("maxDice")) || 5 });
  const max = f.max ? clamp(num(f.max), 1, 8) : natural;
  const cracked = clamp(num(f.cracked), 0, max);
  return { max, natural, cracked, intact: max - cracked, unhinged: cracked >= max, cond: f.cond ?? null, insp: !!f.insp, custom: !!f.max };
}

/** Player characters the module tracks, each with the user who rolls for them. */
export function party() {
  const hidden = get("hidden") ?? {};
  const users = game.users?.filter?.((u) => !u.isGM) ?? [];
  const out = [];
  for (const actor of game.actors ?? []) {
    if (actor.type !== "character") continue;
    let user = users.find((u) => u.character?.id === actor.id);
    user ??= users.find((u) => { try { return actor.testUserPermission(u, "OWNER"); } catch (e) { return false; } });
    if (!user && !actor.hasPlayerOwner) continue;
    out.push({ actor, user: user ?? null, assigned: !!user && user.character?.id === actor.id, online: !!user?.active, hidden: !!hidden[actor.id] });
  }
  return out.sort((a, b) => (b.assigned - a.assigned) || a.actor.name.localeCompare(b.actor.name));
}
export const tracked = () => party().filter((p) => !p.hidden);

/* ---------- writing (GM, or the owner of the actor) ---------- */
const save = (actor, patch) => actor.setFlag(MODULE_ID, "state", { ...(actor.getFlag(MODULE_ID, "state") ?? {}), ...patch });
const effectsOf = (actor, kind) => (actor.effects?.filter?.((e) => e.getFlag?.(MODULE_ID, "kind") === kind) ?? []);

async function dropEffects(actor, kind) {
  const ids = effectsOf(actor, kind).map((e) => e.id);
  if (ids.length) { try { await actor.deleteEmbeddedDocuments("ActiveEffect", ids); } catch (e) { console.warn(`${MODULE_ID} | could not remove effect`, e); } }
}

async function addEffect(actor, data, changes = []) {
  const base = { ...data, disabled: false, transfer: false };
  // Core V14 names the change operation `type`; earlier cores use a numeric `mode`. Send both.
  const rules = get("applyChanges") ? changes.map((c) => ({ key: c.key, value: c.value, mode: 2, type: "add", priority: 20 })) : [];
  try { return await actor.createEmbeddedDocuments("ActiveEffect", [{ ...base, changes: rules }]); }
  catch (e) {
    console.warn(`${MODULE_ID} | effect rules rejected, adding the effect as a note only`, e);
    try { return await actor.createEmbeddedDocuments("ActiveEffect", [base]); } catch (e2) { console.warn(`${MODULE_ID} | effect failed`, e2); }
  }
}

export async function setCondition(actor, card, until) {
  await dropEffects(actor, "symptom");
  if (!card) return save(actor, { cond: null });
  const t = txt(card);
  await save(actor, { cond: { id: card.id ?? null, name: t.name, text: t.symptom, until } });
  await addEffect(actor, {
    name: `${t.name}`, img: ICON("symptom"),
    description: `<p>${t.symptom}</p><p><em>Grim Sanity: lasts ${UNTIL[until] ?? ""}.</em></p>`,
    flags: { [MODULE_ID]: { kind: "symptom", until } }
  }, card.changes ?? []);
}

export async function clearCondition(actor) {
  await dropEffects(actor, "symptom");
  if (sanity(actor).cond) await save(actor, { cond: null });
}

async function syncUnhinged(actor) {
  const s = sanity(actor), has = effectsOf(actor, "unhinged").length > 0;
  if (s.unhinged && !has) {
    await addEffect(actor, {
      name: "Unhinged", img: ICON("unhinged"),
      description: "<p>Every Sanity Die is cracked. You hold 2 Insanity Dice (d8).</p><p><strong>Attack:</strong> once per turn add 1d8 to one attack or damage roll; attacks against you then have advantage until the start of your next turn.</p><p><strong>Duel:</strong> you roll 2d8 and win ties. Losing cracks nothing more.</p>",
      flags: { [MODULE_ID]: { kind: "unhinged" } }
    });
  } else if (!s.unhinged && has) await dropEffects(actor, "unhinged");
}

/** Set how many dice are cracked, then keep the Unhinged marker and "all dice" symptoms in step. */
export async function setCracked(actor, cracked) {
  const s = sanity(actor);
  const next = clamp(Math.round(cracked), 0, s.max);
  if (next !== s.cracked) await save(actor, { cracked: next });
  await syncUnhinged(actor);
  if (next === 0 && sanity(actor).cond?.until === "full") await clearCondition(actor);
  return next;
}
export const crack = (actor, n = 1) => setCracked(actor, sanity(actor).cracked + n);
export const mend = (actor, n = 1) => setCracked(actor, sanity(actor).cracked - n);

export async function setMax(actor, max) {
  await save(actor, { max: max ? clamp(Math.round(max), 1, 8) : null });
  await setCracked(actor, Math.min(sanity(actor).cracked, sanity(actor).max));
}

/** Apply a sealed duel result. `o` comes from logic.outcome(). */
export async function applyOutcome(actor, o, card) {
  if (o.cracks) await crack(actor, o.cracks);
  const def = card?.id ? cardById(card.id) : null;
  if (o.until && def) await setCondition(actor, def, o.until);
  let inspired = false;
  if (o.inspiration && !sanity(actor).insp && get("inspiration")) {
    try {
      if (!actor.system?.attributes?.inspiration) { await actor.update({ "system.attributes.inspiration": true }); inspired = true; }
      await save(actor, { insp: true });
    } catch (e) { console.warn(`${MODULE_ID} | inspiration failed`, e); }
  }
  return { inspired };
}

export async function longRest(actor) {
  if (!actor?.isOwner || actor.type !== "character") return;
  const s = sanity(actor);
  const until = s.cond?.until;
  if (until === "rest" || until === "scene") await clearCondition(actor);
  if (s.cracked > 0) await mend(actor, num(get("restDice")) || 1);
}

export async function endScene() {
  for (const p of party()) if (sanity(p.actor).cond?.until === "scene") await clearCondition(p.actor);
}
export async function newSession() {
  for (const p of party()) if (sanity(p.actor).insp) await save(p.actor, { insp: false });
}
export async function mendAll() {
  for (const p of party()) { await setCracked(p.actor, 0); }
}

/** The tracked character with the most cracked dice (for Faint Glimmer). */
export function mostCracked() {
  return tracked().map((p) => ({ p, c: sanity(p.actor).cracked })).filter((x) => x.c > 0).sort((a, b) => b.c - a.c)[0]?.p ?? null;
}
