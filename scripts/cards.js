// Grim Sanity: the Darkness deck, the Light boons, presets and flavour lines.
// Card text is kept in Thai and English; a world setting picks which one is shown.

export const SUITS = {
  frenzy: { th: "คลุ้มคลั่ง", en: "Frenzy" },
  spores: { th: "สปอร์", en: "Spores" },
  ooze: { th: "เมือก", en: "Ooze" }
};

const A = (key, value) => ({ key, value: String(value) });
const dis = (skill) => A(`system.skills.${skill}.roll.mode`, -1);

/** who: "party" = everyone, "area" = only characters inside the affected area. */
export const DARK = [
  {
    id: "two-voices", suit: "frenzy", trauma: 1, who: "party",
    th: { name: "เสียงสองเสียง", board: "NPC ทุกตัวในซีนพูดเป็นสองเสียงซ้อนกันชั่วครู่ แสงทุกดวงหรี่เป็น dim light 1 รอบ", symptom: "ได้ยินเสียงที่สองแทรกทุกบทสนทนา: disadvantage กับ Perception ที่ใช้การฟัง" },
    en: { name: "Two Voices", board: "Every NPC in the scene speaks in two overlapping voices for a moment. All light drops to dim for 1 round.", symptom: "A second voice cuts into every conversation: disadvantage on Perception checks that rely on hearing." }
  },
  {
    id: "deep-drums", suit: "frenzy", trauma: 2, who: "party",
    th: { name: "กลองจากเบื้องลึก", board: "เสียงกลองดังก้องทั้งถ้ำ ใครคง concentration อยู่ต้องเซฟ DC 10 และทอย random encounter ทันที", symptom: "จังหวะกลองไม่ออกจากหัว: long rest ถัดไปไม่ได้ Hit Dice คืน" },
    en: { name: "Drums from the Deep", board: "Drums echo through the cavern. Anyone concentrating makes a DC 10 save, and a random encounter is rolled at once.", symptom: "The rhythm will not leave your head: your next long rest restores no Hit Dice." }
  },
  {
    id: "frenzied-herd", suit: "frenzy", trauma: 2, who: "party", changes: [dis("ste")],
    th: { name: "ฝูงคลั่ง", board: "สัตว์ Underdark ใกล้เคียงแตกตื่น เพิ่มศัตรู CR ต่ำ 1d4 ตัวเข้าซีน หรือศัตรูที่มีอยู่ได้ +2 damage 3 รอบ", symptom: "กระสับกระส่าย หายใจแรง: disadvantage กับ Stealth" },
    en: { name: "The Frenzied Herd", board: "Nearby Underdark beasts stampede. Add 1d4 low-CR enemies, or the enemies present deal +2 damage for 3 rounds.", symptom: "Restless, breathing hard: disadvantage on Stealth." }
  },
  {
    id: "two-headed-shadow", suit: "frenzy", trauma: 3, who: "party", changes: [dis("ins")],
    th: { name: "เงาสองหัว", board: "เงามหึมาสองหัวพาดผ่านผนังถ้ำ NPC ร่วมทางทุกตัวเซฟ WIS DC 12 ไม่ผ่านชะงักหรือหนี 1 รอบ", symptom: "ระแวงทุกอย่างที่มาเป็นคู่: disadvantage กับ Insight" },
    en: { name: "The Two-Headed Shadow", board: "A vast two-headed shadow sweeps across the cavern wall. Every companion NPC makes a DC 12 Wisdom save or freezes or flees for 1 round.", symptom: "You distrust anything that comes in pairs: disadvantage on Insight." }
  },
  {
    id: "bloom", suit: "spores", trauma: 1, who: "area",
    th: { name: "ดอกเห็ดบาน", board: "เห็ดเรืองแสงงอกขึ้น 3 จุด จุดละ 10 ฟุต เป็น difficult terrain และซ่อนตัวในนั้นไม่ได้", symptom: "รู้สึกว่าเห็ดหันตามตัวเอง: disadvantage กับเซฟต้านพิษและสปอร์" },
    en: { name: "The Bloom", board: "Glowing fungus erupts in three 10-foot patches. They are difficult terrain and nothing can hide inside them.", symptom: "The mushrooms seem to turn and follow you: disadvantage on saves against poison and spores." }
  },
  {
    id: "roots-beneath", suit: "spores", trauma: 2, who: "party", changes: [A("system.attributes.concentration.roll.mode", -1)],
    th: { name: "รากใต้ผิว", board: "เสบียงขึ้นรา ปาร์ตี้เสียอาหาร 1d4 วัน", symptom: "เหมือนมีอะไรไชอยู่ใต้ผิวหนัง: disadvantage กับเซฟ concentration" },
    en: { name: "Roots Beneath the Skin", board: "The rations turn to mould. The party loses 1d4 days of food.", symptom: "Something seems to burrow under your skin: disadvantage on concentration saves." }
  },
  {
    id: "drowsing-spores", suit: "spores", trauma: 2, who: "area", changes: [dis("inv")],
    th: { name: "สปอร์เคลิ้ม", board: "เมฆสปอร์รัศมี 20 ฟุต อยู่ 1 นาที ข้างในเป็น heavily obscured เข้าไปต้องเซฟ CON DC 12 ไม่ผ่าน poisoned 1 รอบ", symptom: "เห็นใบหน้าคนรู้จักในดงเห็ด: disadvantage กับ Investigation" },
    en: { name: "Drowsing Spores", board: "A 20-foot-radius spore cloud lingers for 1 minute. It is heavily obscured; entering it calls for a DC 12 Constitution save or be poisoned for 1 round.", symptom: "You see familiar faces among the fungus: disadvantage on Investigation." }
  },
  {
    id: "brides-song", suit: "spores", trauma: 3, who: "party", changes: [dis("ste")],
    th: { name: "เพลงเจ้าสาว", board: "สิ่งมีชีวิตเชื้อราทุกตัวในซีนฮัมเพลงเดียวกัน อีก 3 รอบ spore servant 1d4 ตัวเดินเข้ามา", symptom: "เผลอฮัมทำนองที่ไม่เคยได้ยิน: disadvantage กับ Stealth" },
    en: { name: "The Bride's Song", board: "Every fungal creature in the scene hums the same tune. In 3 rounds, 1d4 spore servants walk in.", symptom: "You catch yourself humming a tune you have never heard: disadvantage on Stealth." }
  },
  {
    id: "dripping-ceiling", suit: "ooze", trauma: 1, who: "area", changes: [A("system.attributes.init.roll.mode", -1)],
    th: { name: "เพดานหยด", board: "กรดหยดลง 3 ช่องสุ่ม ใครเริ่มเทิร์นในช่องนั้นโดน 1d4 acid อยู่ 3 รอบ", symptom: "สะดุ้งทุกครั้งที่มีอะไรหยดใส่: disadvantage กับ Initiative ครั้งถัดไป" },
    en: { name: "The Dripping Ceiling", board: "Acid drips onto 3 random squares for 3 rounds. A creature starting its turn there takes 1d4 acid damage.", symptom: "You flinch whenever something drips on you: disadvantage on your next Initiative roll." }
  },
  {
    id: "liquid-floor", suit: "ooze", trauma: 2, who: "area", changes: [A("system.attributes.movement.walk", -5)],
    th: { name: "พื้นเหลว", board: "พื้นรัศมี 20 ฟุตกลายเป็นเมือก เป็น difficult terrain เข้าไปต้องเซฟ DEX DC 12 ไม่ผ่านล้ม prone", symptom: "รู้สึกว่าร่างกายตัวเองหนืด: speed ลด 5 ฟุต" },
    en: { name: "The Liquid Floor", board: "The floor in a 20-foot radius turns to slime. It is difficult terrain; entering it calls for a DC 12 Dexterity save or fall prone.", symptom: "Your own body feels thick and slow: speed reduced by 5 feet." }
  },
  {
    id: "lightswallow", suit: "ooze", trauma: 2, who: "party",
    th: { name: "กลืนแสง", board: "เมือกคลุมแหล่งแสงที่ไม่ใช่เวทมนตร์ทั้งหมด มืดสนิท 1 รอบ ต้องใช้ action จุดใหม่", symptom: "ไม่ไว้ใจแสงไฟ: disadvantage กับ Perception ที่ใช้สายตาเมื่ออยู่ใน bright light" },
    en: { name: "Lightswallow", board: "Slime smothers every non-magical light source. Total darkness for 1 round; relighting takes an action.", symptom: "You no longer trust the light: disadvantage on sight-based Perception while in bright light." }
  },
  {
    id: "faceless-thing", suit: "ooze", trauma: 3, who: "party", changes: [dis("ath")],
    th: { name: "สิ่งที่ไร้หน้า", board: "ooze หนึ่งตัวไหลออกจากรอยแยกใกล้ปาร์ตี้ (gray ooze หรือ ochre jelly ตามเลเวล)", symptom: "ขยะแขยงทุกอย่างที่เปียกลื่น: disadvantage กับ Athletics" },
    en: { name: "The Faceless Thing", board: "An ooze pours out of a crack near the party (a gray ooze or an ochre jelly, by level).", symptom: "Anything wet and slick revolts you: disadvantage on Athletics." }
  }
];

/** auto: what the module can do by itself when the boon is granted. */
export const LIGHT = [
  { id: "warning-call", th: { name: "เสียงเตือน", effect: "ปาร์ตี้ไม่ถูก surprise ใน encounter ถัดไป", told: "เสียงหินร่วงดังขึ้นก่อนเวลาอันควร" }, en: { name: "Warning Call", effect: "The party cannot be surprised in the next encounter.", told: "A stone falls a moment too early." } },
  { id: "clear-water", th: { name: "น้ำใส", effect: "เจอแหล่งน้ำและอาหารพอสำหรับ 1 วัน", told: "ตาน้ำเล็ก ๆ ที่มีเห็ดกินได้ขึ้นรอบ" }, en: { name: "Clear Water", effect: "The party finds water and food for 1 day.", told: "A small spring, ringed with edible fungus." } },
  { id: "faint-glimmer", auto: "restore", th: { name: "แสงริบหรี่", effect: "ตัวละครที่เต๋าร้าวมากที่สุดได้เต๋าคืน 1 ลูก", told: "แสงอุ่นวูบหนึ่งที่ไม่มีที่มา" }, en: { name: "Faint Glimmer", effect: "The character with the most cracked dice mends 1 die.", told: "A warm flicker of light with no source." } },
  { id: "lifting-fog", auto: "cleanse", th: { name: "ล้างหมอก", effect: "ตัวละครหนึ่งตัวหายจากอาการที่ติดอยู่", told: "เสียงในหัวเงียบลงเป็นครั้งแรก" }, en: { name: "Lifting Fog", effect: "One character is freed from their symptom.", told: "For the first time, the voice in your head goes quiet." } },
  { id: "second-breath", th: { name: "ลมหายใจ", effect: "ตัวละครทุกตัวฟื้น HP เท่ากับ Hit Die 1 ลูก โดยไม่เสีย Hit Die", told: "ลมเย็นพัดมาจากทางที่ไม่ควรมีลม" }, en: { name: "Second Breath", effect: "Every character regains HP equal to one Hit Die, without spending it.", told: "A cool wind blows from where no wind should be." } },
  { id: "glowing-tracks", th: { name: "รอยเท้าเรือง", effect: "advantage กับการทอยนำทางครั้งถัดไป", told: "ไลเคนเรืองแสงเรียงเป็นแนว" }, en: { name: "Glowing Tracks", effect: "Advantage on the next navigation roll.", told: "Glowing lichen grows in a line." } },
  { id: "shortcut", th: { name: "ทางลัด", effect: "ย่นการเดินทางครึ่งวัน", told: "ช่องแคบที่ไม่อยู่ในแผนที่ของใคร" }, en: { name: "The Shortcut", effect: "Half a day is cut from the journey.", told: "A narrow passage on no one's map." } },
  { id: "heart-ward", auto: "ward", th: { name: "เกราะใจ", effect: "การดวลเต๋าครั้งถัดไป เสมอผู้เล่นชนะ", told: "ความทรงจำดี ๆ ผุดขึ้นมาพร้อมกันทั้งกลุ่ม" }, en: { name: "Heart Ward", effect: "In the next duel, ties go to the players.", told: "A good memory rises in all of you at once." } }
];

/** One-click deck presets. `only` lists the cards left open; `cap` is the highest Trauma allowed. */
export const PRESETS = {
  travel: { label: "Travel", cap: 3, only: null },
  combat: { label: "Combat", cap: 2, only: ["two-voices", "bloom", "drowsing-spores", "dripping-ceiling", "liquid-floor", "lightswallow"] },
  town: { label: "Town", cap: 1, only: ["two-voices", "bloom", "dripping-ceiling"] },
  camp: { label: "Camp", cap: 2, only: ["two-voices", "roots-beneath", "lightswallow", "dripping-ceiling"] },
  sealed: { label: "Sealed", cap: 3, only: [] }
};

export const TIER = (trauma) => (trauma >= 3 ? "inconceivable" : trauma === 2 ? "scarring" : "jarring");
export const TIER_LABEL = { jarring: "Jarring", scarring: "Scarring", inconceivable: "Inconceivable" };

const LINES = {
  jarring: [
    "Something shifts at the edge of the light.", "It is only the dark. It is only the dark.", "Did the stone just breathe?",
    "A sound that should not have an echo.", "Keep walking. Do not look twice.", "The silence leans a little closer."
  ],
  scarring: [
    "The dark has learned your name.", "You will carry this one out with you.", "Something down here is paying attention.",
    "The walls remember what they have seen.", "Do not listen to what answers.", "It knows which of you is afraid."
  ],
  inconceivable: [
    "There are no words for it. There never were.", "The abyss opens one more eye.", "What you see cannot be unseen.",
    "Hold on to your name. It is all you have.", "The deep turns its whole weight toward you.", "Pray that it only looks."
  ]
};

export const pickLine = (trauma) => { const l = LINES[TIER(trauma)]; return l[Math.floor(Math.random() * l.length)]; };

export const STAMPS = {
  unshaken: "Unshaken", shaken: "Shaken", fractured: "Fractured", broken: "Broken", unhinged: "Unhinged", haunted: "Haunted"
};
export const UNTIL = { scene: "until the scene ends", rest: "until the next long rest", full: "until every die has mended" };
export const UNTIL_SHORT = { scene: "Scene", rest: "Long rest", full: "All dice" };

export const cardById = (id) => DARK.find((c) => c.id === id) ?? null;
export const boonById = (id) => LIGHT.find((c) => c.id === id) ?? null;

/** Cards the GM has left open. deck = { off: {id:true}, suits: {suit:false}, cap } */
export function openCards(deck = {}) {
  const cap = Number(deck.cap) || 3;
  return DARK.filter((c) => !deck.off?.[c.id] && deck.suits?.[c.suit] !== false && c.trauma <= cap);
}

export function drawCards(deck, count = 3) {
  const pool = [...openCards(deck)];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, count);
}

export function presetDeck(key) {
  const p = PRESETS[key]; if (!p) return null;
  const off = {};
  if (p.only) for (const c of DARK) if (!p.only.includes(c.id)) off[c.id] = true;
  return { off, suits: {}, cap: p.cap, preset: key };
}
