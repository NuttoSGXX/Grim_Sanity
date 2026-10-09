// Grim Sanity: the rules, with no Foundry calls, so they can be tested alone.

export const MODULE_ID = "grim-sanity";
export const SOCKET = `module.${MODULE_ID}`;
export const MAX_TRAUMA = 5;
export const MAX_CRACKS_PER_DUEL = 3;
export const INSANITY_DICE = 2;

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const sortDesc = (a) => [...a].sort((x, y) => y - x);

/** Sanity Dice a character owns: best mental modifier + 1, inside the table's limits. */
export function maxDice(mods, { min = 2, max = 5 } = {}) {
  const best = Math.max(...mods.map((m) => (Number.isFinite(Number(m)) ? Number(m) : 0)));
  return clamp(best + 1, min, max);
}

/**
 * Pair dice column by column, highest against highest.
 * @param player  the player's dice, already sorted high to low
 * @param trauma  the Trauma Dice, already sorted high to low
 * @param over    { column: value } rerolls from "Shine", compared against the same Trauma die
 * @param tieToPlayer  true for unhinged characters and for Heart Ward
 */
export function resolve(player, trauma, { over = {}, tieToPlayer = false } = {}) {
  const n = Math.min(player.length, trauma.length);
  const pairs = [];
  let lost = 0;
  for (let i = 0; i < n; i++) {
    const p = over[i] ?? player[i], t = trauma[i];
    const win = p > t || (tieToPlayer && p === t);
    pairs.push({ p, t, win, tie: p === t, shone: over[i] != null });
    if (!win) lost++;
  }
  return { pairs, lost, won: n - lost };
}

/**
 * What a result does to a character.
 * @param lost      pairs lost
 * @param intact    Sanity Dice the character still had before the duel
 * @param unhinged  the character was already unhinged (rolled Insanity Dice)
 */
export function outcome(lost, { intact, unhinged }) {
  const until = lost >= 3 ? "full" : lost === 2 ? "rest" : lost === 1 ? "scene" : null;
  if (unhinged) return { key: lost ? "haunted" : "unshaken", cracks: 0, breaks: false, until, inspiration: lost === 0 };
  const cracks = Math.min(lost, MAX_CRACKS_PER_DUEL, intact);
  const breaks = cracks > 0 && intact - cracks <= 0;
  const key = breaks ? "unhinged" : ["unshaken", "shaken", "fractured", "broken"][Math.min(lost, 3)];
  return { key, cracks, breaks, until, inspiration: lost === 0 };
}

export const rollDice = (count, sides) => Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
