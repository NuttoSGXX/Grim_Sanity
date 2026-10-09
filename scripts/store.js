// Grim Sanity: everything that reads or writes Foundry data (actor flags, effects, settings).
// Written defensively so a change between dnd5e or core versions degrades instead of breaking.
import { MODULE_ID, maxDice, clamp } from "./logic.js";
import { cardById, UNTIL } from "./cards.js";
import { TIERS, TIER_NAME, madnessById, rollMadness, spanText } from "./madness.js";

export const get = (k) => game.settings.get(MODULE_ID, k);
export const set = (k, v) => game.settings.set(MODULE_ID, k, v);
export const lang = () => (get("cardLang") === "en" ? "en" : "th");
export const txt = (card) => card?.[lang()] ?? card?.th ?? card?.en ?? {};
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const ICON = (name) => `modules/${MODULE_ID}/assets/${name}.svg`;
const worldTime = () => num(game.time?.worldTime);

/* ---------- reading ---------- */
export function sanity(actor) {
  const f = actor?.getFlag?.(MODULE_ID, "state") ?? {};
  const ab = actor?.system?.abilities ?? {};
  const natural = maxDice([ab.int?.mod, ab.wis?.mod, ab.cha?.mod], { min: num(get("minDice")) || 2, max: num(get("maxDice")) || 5 });
  const max = f.max ? clamp(num(f.max), 1, 8) : natural;
  const cracked = clamp(num(f.cracked), 0, max);
  const mad = TIERS.map((t) => f.mad?.[t]).filter(Boolean);
  return { max, natural, cracked, intact: max - cracked, unhinged: cracked >= max, cond: f.cond ?? null, mad, insp: !!f.insp, custom: !!f.max };
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

async function addEffect(actor, data, changes = [], statuses = []) {
  const base = { ...data, disabled: false, transfer: false };
  const on = !!get("applyChanges");
  // Core V14 names the change operation `type`; earlier cores use a numeric `mode`. Send both.
  const rules = on ? changes.map((c) => ({ key: c.key, value: c.value, mode: 2, type: "add", priority: 20 })) : [];
  try { return await actor.createEmbeddedDocuments("ActiveEffect", [{ ...base, changes: rules, statuses: on ? statuses : [] }]); }
  catch (e) {
    console.warn(`${MODULE_ID} | effect rules rejected, adding the effect as a note only`, e);
    try { return await actor.createEmbeddedDocuments("ActiveEffect", [base]); } catch (e2) { console.warn(`${MODULE_ID} | effect failed`, e2); }
  }
}

/* ---------- the card's symptom ---------- */
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

/* ---------- madness: one per tier at a time; a new one replaces the old ---------- */
export async function setMadness(actor, rolled) {
  if (!rolled?.entry) return null;
  const { tier, entry, seconds, status } = rolled, t = txt(entry);
  const until = seconds == null ? null : worldTime() + seconds;
  const rec = { id: entry.id, tier, name: t.name, text: t.text, until, span: spanText(tier, seconds), status: status ?? null };
  await dropEffects(actor, `mad-${tier}`);
  await save(actor, { mad: { [tier]: rec } });
  await addEffect(actor, {
    name: `${t.name}`, img: ICON("madness"),
    description: `<p><strong>${TIER_NAME[tier].en}.</strong> ${t.text}</p><p><em>Grim Sanity: ${tier === "indef" ? "lasts until every Sanity Die has mended" : `lasts ${rec.span}`}.</em></p>`,
    flags: { [MODULE_ID]: { kind: `mad-${tier}` } }
  }, entry.changes ?? [], [...(entry.statuses ?? []), ...(status ? [status] : [])]);
  return rec;
}

export async function clearMadness(actor, tier = null) {
  // Foundry merges flag updates, so leaving a key out does not remove it. Write null over it instead.
  const cur = actor.getFlag(MODULE_ID, "state")?.mad ?? {}, patch = {};
  for (const t of tier ? [tier] : TIERS) { await dropEffects(actor, `mad-${t}`); if (cur[t]) patch[t] = null; }
  if (Object.keys(patch).length) await save(actor, { mad: patch });
}

/** Inflict a fresh madness of one tier (duel result, Insanity Die, or the GM's button). */
export async function inflict(actor, tier) {
  const m = get("madness"); if (m === "off") return null;
  return setMadness(actor, rollMadness(tier, { playable: m === "playable" }));
}

/** Drop any timed madness whose time has run out. The GM's computer runs this when world time moves. */
export async function expireMadness() {
  const now = worldTime();
  for (const p of party()) for (const m of sanity(p.actor).mad) if (m.until != null && m.until <= now) await clearMadness(p.actor, m.tier);
}

/* ---------- the standing cost of cracked dice ---------- */
async function syncStrain(actor) {
  const s = sanity(actor);
  // Frayed: each cracked die is -1 to Intelligence, Wisdom and Charisma saving throws.
  const want = get("frayed") ? s.cracked : 0, cur = effectsOf(actor, "frayed")[0];
  if ((cur?.getFlag?.(MODULE_ID, "n") ?? 0) !== want) {
    await dropEffects(actor, "frayed");
    if (want > 0) await addEffect(actor, {
      name: `Frayed (−${want})`, img: ICON("symptom"),
      description: `<p>${want} Sanity ${want === 1 ? "Die is" : "Dice are"} cracked: −${want} to Intelligence, Wisdom and Charisma saving throws.</p>`,
      flags: { [MODULE_ID]: { kind: "frayed", n: want } }
    }, ["int", "wis", "cha"].map((a) => ({ key: `system.abilities.${a}.bonuses.save`, value: `-${want}` })));
  }
  const has = effectsOf(actor, "unhinged").length > 0;
  if (s.unhinged && !has) {
    await addEffect(actor, {
      name: "Unhinged", img: ICON("unhinged"),
      description: "<p>Every Sanity Die is cracked. You hold 2 Insanity Dice (d8), and have disadvantage on Wisdom and Charisma checks.</p><p><strong>Insanity Die:</strong> once per turn add 1d8 to one attack or damage roll. You take psychic damage equal to the roll, and on a 1 a short-term madness takes hold.</p><p><strong>Duel:</strong> you roll 2d8 and win ties, but every pair lost brings a long-term madness, and two or more an indefinite one.</p>",
      flags: { [MODULE_ID]: { kind: "unhinged" } }
    }, [{ key: "system.abilities.wis.check.roll.mode", value: "-1" }, { key: "system.abilities.cha.check.roll.mode", value: "-1" }]);
  } else if (!s.unhinged && has) await dropEffects(actor, "unhinged");
}

/** Set how many dice are cracked, then keep Frayed, Unhinged and "all dice" effects in step. */
export async function setCracked(actor, cracked) {
  const s = sanity(actor);
  const next = clamp(Math.round(cracked), 0, s.max);
  if (next !== s.cracked) await save(actor, { cracked: next });
  await syncStrain(actor);
  if (next === 0) {
    const now = sanity(actor);
    if (now.cond?.until === "full") await clearCondition(actor);
    if (now.mad.some((m) => m.tier === "indef")) await clearMadness(actor, "indef");
  }
  return next;
}
export const crack = (actor, n = 1) => setCracked(actor, sanity(actor).cracked + n);
export const mend = (actor, n = 1) => setCracked(actor, sanity(actor).cracked - n);

export async function setMax(actor, max) {
  await save(actor, { max: max ? clamp(Math.round(max), 1, 8) : null });
  await setCracked(actor, Math.min(sanity(actor).cracked, sanity(actor).max));
}

/** Apply a sealed duel result. `o` comes from logic.outcome(). Returns what happened, for the chat card and banner. */
export async function applyOutcome(actor, o, card) {
  if (o.cracks) await crack(actor, o.cracks);
  const def = card?.id ? cardById(card.id) : null;
  if (o.until && def) await setCondition(actor, def, o.until);
  const mad = [];
  for (const tier of o.madness ?? []) { const m = await inflict(actor, tier); if (m) mad.push(m); }
  let inspired = false;
  if (o.inspiration && !sanity(actor).insp && get("inspiration")) {
    try {
      if (!actor.system?.attributes?.inspiration) { await actor.update({ "system.attributes.inspiration": true }); inspired = true; }
      await save(actor, { insp: true });
    } catch (e) { console.warn(`${MODULE_ID} | inspiration failed`, e); }
  }
  return { inspired, mad };
}

/** Psychic damage from using an Insanity Die. Returns true when the sheet was changed. */
export async function burn(actor, amount) {
  try {
    if (typeof actor.applyDamage === "function") { await actor.applyDamage([{ value: amount, type: "psychic" }]); return true; }
    const hp = actor.system?.attributes?.hp;
    if (hp && Number.isFinite(hp.value)) { await actor.update({ "system.attributes.hp.value": Math.max(0, hp.value - amount) }); return true; }
  } catch (e) { console.warn(`${MODULE_ID} | could not apply psychic damage`, e); }
  return false;
}

export async function longRest(actor) {
  if (!actor?.isOwner || actor.type !== "character") return;
  const s = sanity(actor);
  const until = s.cond?.until;
  if (until === "rest" || until === "scene") await clearCondition(actor);
  if (s.mad.some((m) => m.tier === "short")) await clearMadness(actor, "short");
  if (s.cracked > 0) await mend(actor, num(get("restDice")) || 1);
}

export async function endScene() {
  for (const p of party()) if (sanity(p.actor).cond?.until === "scene") await clearCondition(p.actor);
}
export async function newSession() {
  for (const p of party()) if (sanity(p.actor).insp) await save(p.actor, { insp: false });
}
export async function mendAll() {
  for (const p of party()) { await setCracked(p.actor, 0); await clearMadness(p.actor); }
}

/** The tracked character with the most cracked dice (for Faint Glimmer). */
export function mostCracked() {
  return tracked().map((p) => ({ p, c: sanity(p.actor).cracked })).filter((x) => x.c > 0).sort((a, b) => b.c - a.c)[0]?.p ?? null;
}

export { madnessById };
