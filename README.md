# Grim Sanity

Sanity Dice for **Foundry VTT V14** and the **dnd5e** system. Part of the Grim series (Grim Almanac, Grim Pulse, Grim FateRoll, Grim Theater of Mind, Grim Stage Pacer, Grim VN Stage, Grim Jukebox).

Every character holds a small row of Sanity Dice. When horror strikes, the GM plays a card; the screen fades, the card turns over, and each chosen player rolls their dice against the Trauma Dice, pair by pair, highest against highest. Dice crack, a symptom takes hold, and a character with no dice left goes unhinged. Nothing is lost for good: dice mend with rest.

It was written for a streamed *Out of the Abyss* campaign and replaces the book's madness saves, but the deck is plain data and the rules work in any dnd5e game.

## Install

Manifest URL:

```
https://github.com/NuttoSGXX/Grim_Sanity/releases/latest/download/module.json
```

## The rules in one minute

- **Sanity Dice (d6).** Each character has dice equal to their best INT, WIS or CHA modifier + 1, never fewer than 2 or more than 5.
- **Trauma Dice (d6).** A card has Trauma 1 to 3. Without a card the GM picks 1 to 5.
- **The duel.** Both sides sort high to low and compare in columns. The higher die wins the pair. **A tie goes to the dark.**
- **Losing.** Each pair lost cracks one die (three at most in one duel) and the card's symptom takes hold: 1 pair lost until the scene ends, 2 until the next long rest, 3 or more until every die has mended.
- **Winning every pair** earns Inspiration, once per session.
- **Unhinged.** With every die cracked a character holds 2 Insanity Dice (d8). In a duel they roll those instead, win ties, and cannot crack further. Once per turn they may add 1d8 to an attack or damage roll, and attacks against them then have advantage until their next turn starts.
- **Mending.** A long rest mends 1 die. The GM can mend or crack dice by hand at any time.
- **Shine.** Once per duel the GM can let the Light reroll one losing die against the same Trauma Die.

## How to use

Open the panel from the **skull button in the Token controls**, the skull on the party strip, or **Alt + M** (GM only, rebindable). A macro can call `game.modules.get("grim-sanity").api.open()`.

### Duel tab
1. **Draw 3** deals three open cards; click one. Or pick any open card from the list, or choose **No card: Trauma only** for a named horror with Trauma 1 to 5 and no symptom.
2. Tick **who faces it**. Cards that hit an area say so; tick only the characters inside it.
3. **Heart Ward** makes ties go to the players for this one duel.
4. **Unleash.**

On the duel screen the GM has **Roll Trauma**, **Roll Remaining** (rolls for anyone who has not clicked), **Shine**, **Seal Fate** (applies the results and closes) and **Cancel** (closes and changes nothing). Each player clicks their own row to roll. The GM can click any row.

### Deck tab
Decide which cards may be drawn, at any moment:
- **Scene** presets: Travel (everything), Combat, Town, Camp, Sealed (nothing).
- **Cap** on Trauma.
- Whole suits (Frenzy, Spores, Ooze) or single cards on and off.

### Party tab
Crack or mend a die, change how many dice a character has, remove a symptom, hide a character from the strip. **End Scene** clears symptoms that last for the scene. **New Session** lets Inspiration be earned again. **Mend All** restores everyone.

### Light tab
Eight boons to hand the party. Granting one shows a golden banner to everyone. Three are applied by the module: **Faint Glimmer** mends a die for the most cracked character, **Lifting Fog** removes one symptom, **Heart Ward** arms the next duel.

## The party strip

A small draggable strip shows every tracked character's dice, cracked dice, symptom and unhinged state. An unhinged character's owner can click the violet dice to roll an Insanity Die to chat.

## Symptoms on the sheet

A symptom is added to the character as an Active Effect with its text. Where dnd5e has a matching rule the effect also applies it (disadvantage on Stealth, Insight, Investigation, Athletics, concentration or Initiative, or speed reduced by 5 feet). Symptoms that depend on the situation, such as hearing-based Perception, stay as a note. Turn the rule changes off in settings if you prefer notes only.

## Settings

| Setting | Scope | Default |
| --- | --- | --- |
| Card language | World | Thai |
| Accent colour | World | `#c8141e` |
| Backdrop darkness (%) | World | 82 |
| Fewest / most Sanity Dice | World | 2 / 5 |
| Dice mended by a long rest | World | 1 |
| Inspiration for the unshaken | World | On |
| Symptoms change the sheet | World | On |
| Players see the party strip | World | On |
| Post results to chat | World | On |
| Show the party strip, strip size | Client | On, 100% |
| Dice sound | Client | On |
| Reduced effects | Client | Off |

## For other modules and macros

```js
const gs = game.modules.get("grim-sanity").api;
gs.startDuel({ cardId: "brides-song", actorIds: [...] });   // or { trauma: 4, title: "Demogorgon" }
gs.setTrauma([6, 4, 2]);        // supply the Trauma Dice from outside, for example rolled by viewers
gs.shine(actorId, column);      // reroll one losing die
gs.seal(); gs.cancel();
gs.grant("faint-glimmer");
gs.draw(3); gs.openCards();     // card ids the deck allows right now
gs.sanity(actor);               // { max, cracked, intact, unhinged, cond }
```

## Notes

- A player who joins or reloads while a duel is on screen will not see it. Cancel it and call it again.
- The dice are drawn by this module (CSS 3D) and spin in place. No Dice So Nice roll is thrown across the table.
- Fonts: Cinzel, Cormorant Garamond, Spectral and Noto Serif Thai, all under the SIL Open Font License.
