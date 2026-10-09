// Grim Sanity: the three madness tables. The effects follow the 5e SRD madness rules
// (short-term, long-term, indefinite), reworded and translated here.
// w = share out of 100.  out = takes the character out of play (skipped in "playable" mode).
// statuses = dnd5e conditions to switch on.  changes = sheet rules to apply.

const mode = (path) => ({ key: `${path}.roll.mode`, value: "-1" });
const ABIL = ["str", "dex", "con", "int", "wis", "cha"];
const allChecks = ABIL.map((a) => mode(`system.abilities.${a}.check`));

export const TIERS = ["short", "long", "indef"];
export const TIER_NAME = {
  short: { th: "วิกลชั่วครู่", en: "Short-term madness" },
  long: { th: "วิกลเรื้อรัง", en: "Long-term madness" },
  indef: { th: "วิกลฝังลึก", en: "Indefinite madness" }
};

export const MADNESS = {
  short: [
    { id: "s-retreat", w: 20, out: true, statuses: ["paralyzed"], th: { name: "จมดิ่ง", text: "ถอยเข้าไปในใจตัวเองและเป็น paralyzed จบทันทีเมื่อได้รับ damage" }, en: { name: "Retreat", text: "Withdraws into their own mind and is paralyzed. Ends at once if they take damage." } },
    { id: "s-outburst", w: 10, out: true, statuses: ["incapacitated"], th: { name: "คลุ้มคลั่ง", text: "เป็น incapacitated ได้แต่กรีดร้อง หัวเราะ หรือร่ำไห้" }, en: { name: "Outburst", text: "Incapacitated, and can only scream, laugh or weep." } },
    { id: "s-flee", w: 10, statuses: ["frightened"], th: { name: "หนีสุดชีวิต", text: "เป็น frightened และต้องใช้ action กับ movement ทุกรอบเพื่อหนีจากต้นเหตุ" }, en: { name: "Flight", text: "Frightened, and must use action and movement each round to flee the source." } },
    { id: "s-babble", w: 10, th: { name: "พูดไม่เป็นภาษา", text: "พูดพล่ามไม่เป็นคำ พูดปกติหรือร่ายเวทไม่ได้" }, en: { name: "Babbling", text: "Babbles; cannot speak normally or cast spells." } },
    { id: "s-rampage", w: 10, th: { name: "อาละวาด", text: "ต้องใช้ action ทุกรอบโจมตีสิ่งมีชีวิตที่อยู่ใกล้ที่สุด" }, en: { name: "Rampage", text: "Must use their action each round to attack the nearest creature." } },
    { id: "s-visions", w: 10, changes: allChecks, th: { name: "ภาพหลอน", text: "เห็นภาพหลอนชัดเจน disadvantage กับ ability check ทั้งหมด" }, en: { name: "Visions", text: "Vivid hallucinations: disadvantage on all ability checks." } },
    { id: "s-pliant", w: 5, th: { name: "ว่าง่าย", text: "ทำตามที่ใครก็ตามสั่ง ถ้าไม่ใช่การทำร้ายตัวเองอย่างชัดเจน" }, en: { name: "Pliant", text: "Does whatever anyone says, unless it is plainly self-destructive." } },
    { id: "s-craving", w: 5, th: { name: "หิวประหลาด", text: "อยากกินของแปลก ๆ อย่างห้ามไม่อยู่ เช่น ดิน เมือก หรือเศษซาก" }, en: { name: "Strange Hunger", text: "An overpowering urge to eat something strange: dirt, slime or offal." } },
    { id: "s-stunned", w: 10, out: true, statuses: ["stunned"], th: { name: "ตะลึงงัน", text: "เป็น stunned" }, en: { name: "Stunned", text: "Stunned." } },
    { id: "s-faint", w: 10, out: true, statuses: ["unconscious"], th: { name: "หมดสติ", text: "ล้มลงหมดสติ" }, en: { name: "Faint", text: "Falls unconscious." } }
  ],
  long: [
    { id: "l-ritual", w: 10, th: { name: "ย้ำทำ", text: "ต้องทำสิ่งเดิมซ้ำแล้วซ้ำเล่า เช่น ล้างมือ แตะสิ่งของ สวดภาวนา หรือนับเหรียญ" }, en: { name: "Ritual", text: "Compelled to repeat one act over and over: washing hands, touching things, praying, counting coins." } },
    { id: "l-visions", w: 10, changes: allChecks, th: { name: "ภาพหลอนเรื้อรัง", text: "เห็นภาพหลอนชัดเจน disadvantage กับ ability check ทั้งหมด" }, en: { name: "Lingering Visions", text: "Vivid hallucinations: disadvantage on all ability checks." } },
    { id: "l-paranoia", w: 10, changes: [mode("system.abilities.wis.check"), mode("system.abilities.cha.check")], th: { name: "หวาดระแวง", text: "ระแวงทุกคนอย่างรุนแรง disadvantage กับ Wisdom check และ Charisma check" }, en: { name: "Paranoia", text: "Extreme paranoia: disadvantage on Wisdom and Charisma checks." } },
    { id: "l-revulsion", w: 10, th: { name: "ขยะแขยง", text: "รังเกียจต้นเหตุของความวิกลอย่างรุนแรง เหมือนโดนผล antipathy ของเวท Antipathy/Sympathy" }, en: { name: "Revulsion", text: "Regards the source of the madness with intense revulsion, as under the antipathy effect of Antipathy/Sympathy." } },
    { id: "l-delusion", w: 5, th: { name: "หลงผิด", text: "เชื่อสนิทใจว่าตัวเองกำลังอยู่ใต้ฤทธิ์ potion ชนิดหนึ่ง (DM เลือก)" }, en: { name: "Delusion", text: "Firmly believes they are under the effect of a potion (the GM chooses which)." } },
    { id: "l-charm", w: 10, th: { name: "ของขลัง", text: "ยึดติดกับคนหรือของชิ้นหนึ่งเป็นเครื่องราง ถ้าอยู่ห่างเกิน 30 ฟุต disadvantage กับ attack roll, ability check และ saving throw" }, en: { name: "Lucky Charm", text: "Clings to a person or object as a charm. More than 30 feet from it: disadvantage on attack rolls, ability checks and saving throws." } },
    { id: "l-senses", w: 10, pick: [["blinded", 25], ["deafened", 75]], th: { name: "ประสาทดับ", text: "ตาบอดหรือหูหนวก (blinded 25%, deafened 75%)" }, en: { name: "Dead Senses", text: "Blinded (25%) or deafened (75%)." } },
    { id: "l-tremor", w: 10, changes: [mode("system.abilities.str.check"), mode("system.abilities.dex.check"), mode("system.abilities.str.save"), mode("system.abilities.dex.save")], th: { name: "มือสั่น", text: "ตัวสั่นหรือกระตุกไม่หยุด disadvantage กับ attack roll, ability check และ saving throw ที่ใช้ Strength หรือ Dexterity" }, en: { name: "Tremors", text: "Uncontrollable tremors: disadvantage on attack rolls, ability checks and saving throws that use Strength or Dexterity." } },
    { id: "l-amnesia", w: 10, th: { name: "ความจำเลือน", text: "จำตัวเองและความสามารถได้ แต่จำคนอื่นและเรื่องก่อนหน้านี้ไม่ได้เลย" }, en: { name: "Lost Memory", text: "Knows who they are and keeps their abilities, but recognises no one and remembers nothing from before." } },
    { id: "l-confusion", w: 5, th: { name: "สับสน", text: "ทุกครั้งที่ได้รับ damage ต้องเซฟ Wisdom DC 15 ไม่ผ่านโดนผลเวท Confusion 1 นาที" }, en: { name: "Confusion", text: "Whenever they take damage: DC 15 Wisdom save or be affected as by Confusion for 1 minute." } },
    { id: "l-mute", w: 5, th: { name: "ไร้เสียง", text: "พูดไม่ได้" }, en: { name: "Voiceless", text: "Loses the ability to speak." } },
    { id: "l-coma", w: 5, out: true, statuses: ["unconscious"], th: { name: "หลับไม่ตื่น", text: "หมดสติ เขย่าหรือทำ damage ก็ไม่ตื่น" }, en: { name: "Deep Sleep", text: "Falls unconscious. No shaking or damage wakes them." } }
  ],
  // Indefinite madness is a new flaw to play, kept until every die has mended.
  indef: [
    { id: "i-drink", w: 15, th: { name: "ต้องเมาถึงจะนิ่ง", text: "\"ฉันต้องเมาเท่านั้นถึงจะคุมสติอยู่\"" }, en: { name: "Only Drink Steadies Me", text: "\"Being drunk keeps me sane.\"" } },
    { id: "i-hoard", w: 10, th: { name: "ของฉันทั้งหมด", text: "\"เจออะไรฉันก็เก็บไว้เป็นของตัวเอง\"" }, en: { name: "Mine", text: "\"I keep whatever I find.\"" } },
    { id: "i-mimic", w: 5, th: { name: "เงาของคนอื่น", text: "\"ฉันพยายามเป็นเหมือนคนคนหนึ่งที่รู้จัก ทั้งการแต่งตัว ท่าทาง และชื่อ\"" }, en: { name: "Someone Else's Shadow", text: "\"I try to become someone else I know: their dress, their manner, their name.\"" } },
    { id: "i-liar", w: 5, th: { name: "ปากไม่ตรงใจ", text: "\"ฉันต้องบิดความจริง พูดเกิน หรือโกหก เพื่อให้คนอื่นสนใจ\"" }, en: { name: "Bent Truth", text: "\"I must bend the truth, exaggerate or lie to be interesting.\"" } },
    { id: "i-goal", w: 10, th: { name: "เป้าหมายเดียว", text: "\"มีแต่เป้าหมายของฉันที่สำคัญ อย่างอื่นฉันไม่สนใจ\"" }, en: { name: "One Goal", text: "\"Reaching my goal is all that matters. I ignore everything else.\"" } },
    { id: "i-numb", w: 5, th: { name: "ชาด้าน", text: "\"ฉันแทบไม่รู้สึกอะไรกับสิ่งที่เกิดขึ้นรอบตัว\"" }, en: { name: "Numb", text: "\"I find it hard to care about anything around me.\"" } },
    { id: "i-judged", w: 5, th: { name: "ทุกคนตัดสินฉัน", text: "\"ฉันทนไม่ได้ที่ทุกคนเอาแต่ตัดสินฉัน\"" }, en: { name: "Judged", text: "\"I hate the way people judge me all the time.\"" } },
    { id: "i-grand", w: 15, th: { name: "เหนือใคร", text: "\"ฉันฉลาด แกร่ง เร็ว และงามที่สุดเท่าที่ฉันรู้จัก\"" }, en: { name: "Above Them All", text: "\"I am the smartest, strongest, fastest and most beautiful person I know.\"" } },
    { id: "i-hunted", w: 10, th: { name: "ถูกตามล่า", text: "\"ศัตรูผู้มีอำนาจกำลังล่าฉัน สายของมันอยู่ทุกที่ ฉันถูกจับตาอยู่เสมอ\"" }, en: { name: "Hunted", text: "\"Powerful enemies hunt me and their agents are everywhere. I am always watched.\"" } },
    { id: "i-friend", w: 5, th: { name: "เพื่อนที่มองไม่เห็น", text: "\"มีคนเดียวที่ฉันไว้ใจได้ และมีแต่ฉันที่มองเห็นเขา\"" }, en: { name: "The Unseen Friend", text: "\"There is one person I can trust, and only I can see them.\"" } },
    { id: "i-jest", w: 10, th: { name: "ขำไปหมด", text: "\"ฉันจริงจังกับอะไรไม่ได้ ยิ่งร้ายแรงฉันยิ่งขำ\"" }, en: { name: "All a Joke", text: "\"I cannot take anything seriously. The worse it is, the funnier I find it.\"" } },
    { id: "i-blood", w: 5, th: { name: "กระหายเลือด", text: "\"ฉันเพิ่งรู้ตัวว่าชอบการฆ่า\"" }, en: { name: "Bloodthirst", text: "\"I have found that I really like killing.\"" } }
  ]
};

export const madnessById = (id) => { for (const t of TIERS) { const m = MADNESS[t].find((x) => x.id === id); if (m) return { ...m, tier: t }; } return null; };

/**
 * Roll one madness. `playable` skips results that take the character out of play.
 * Returns { tier, entry, seconds, status } - seconds is null for indefinite madness.
 */
export function rollMadness(tier, { playable = false, rand = Math.random } = {}) {
  const pool = (MADNESS[tier] ?? []).filter((m) => !(playable && m.out));
  if (!pool.length) return null;
  let r = rand() * pool.reduce((a, m) => a + m.w, 0), entry = pool[pool.length - 1];
  for (const m of pool) { r -= m.w; if (r < 0) { entry = m; break; } }
  const d10 = 1 + Math.floor(rand() * 10);
  const seconds = tier === "short" ? d10 * 60 : tier === "long" ? d10 * 10 * 3600 : null;
  let status = null;
  if (entry.pick) { let x = rand() * 100; for (const [s, w] of entry.pick) { x -= w; if (x < 0) { status = s; break; } } status ??= entry.pick[entry.pick.length - 1][0]; }
  return { tier, entry, seconds, status };
}

export const spanText = (tier, seconds) => (tier === "short" ? `${Math.round(seconds / 60)} min` : tier === "long" ? `${Math.round(seconds / 3600)} h` : "until every die mends");
