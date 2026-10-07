# Storyboard guide

Every story of the app is an illustrated, narrated mini-film. A *scene* is a piece of narration (1 to 3
sentences, about 5 to 15 seconds). A scene is told over several **pictures** (beats) that follow each
other, each starting at a sentence or a clause of the text, so that **what is on screen is what is being
said, at the moment it is said**, and the whole episode flows like a film shot with a camera.

The pictures are paper-cut illustrations assembled from a fixed vocabulary: a sky, a ground (landscape)
and a list of objects (motifs). **A prophet, an angel, the Prophet ﷺ or a Companion is never drawn**: they
are told through light, a staff, a lamp, footprints, a path, what they leave behind. **Ordinary people** (the
notables who mock, the brothers, the crowd, travellers, workers, a caravan, a family) **are drawn as faceless
silhouettes** with the motifs `folk`, `crowd`, `walkers`, `workers`, `caravan` — and they must be, because
the story has to be alive.

## File format

One file per writer, `src/data/storyboards/part-<name>.ts` (see `part-nuh.ts`, the model):

```ts
import type { Storyboard } from '../types';
export const BOARD_X: Storyboard = {
  'nuh-1-3': [                      // "<storyId>-<episode>-<scene>", all numbers start at 0
    { at: '', sky: 'day', ground: 'plain', motifs: ['planks', 'ark'], focus: 'planks' },
    { at: 'Chaque fois que des notables passaient', motifs: ['ark', 'path', 'footprints'], focus: 'footprints' },
    { at: 'Il leur répondit que bientôt', sky: 'dusk', motifs: ['ark', 'dark-clouds'], focus: 'dark-clouds' },
  ],
};
```

Print the scenes to illustrate with `node scripts/print-scenes.mjs <storyId>...` (add `:<episode>` for a single
episode). The export name must be unique (`BOARD_<YOURNAME>`). **Every scene of your stories needs an entry**,
even if it has a single picture.

## A beat

- `at`: the exact words, copied from the scene text (same apostrophes ’ and punctuation), where this picture
  begins. `''` for the first picture. At least 6 characters, and at least 25 characters after the previous beat.
- `sky`: `dawn | day | dusk | night | storm`. `ground`: `desert | sea | mountains | valley | garden | city |
  river | plain | cave | none`. `motifs`: **everything visible in this picture** (it replaces the previous list;
  max 7, 3 to 5 is best). Any of these omitted keeps the previous beat's value (for the first beat: the scene's
  own value, which you can see when printing the scenes — but override it freely when it does not fit).
- `focus`: what the camera looks at first in this picture: one of the picture's motifs, or `'sky'`, `'ground'`,
  `'horizon'`. Pick what the sentence is about.
- `cut: true`: a deliberate jump to another place or time. Without it, **something must carry over** from the
  previous picture (same ground, or at least one same motif, or same non-day sky) — this is checked by the tests.
  Prefer carrying things over: an object that appeared stays until the text says it is gone; day turns into
  dusk then night in order; a place is left through a path or a door rather than by teleporting.

## Telling the story

1. **Illustrate what the words say, literally when you can, symbolically when you cannot.** "Il construisait
   l'arche" → `planks`/`ark`; "ils se moquaient" → people who passed by: `path`, `footprints`; "le châtiment" →
   `dark-clouds`, `lightning`; "Il implora" → `light` from the sky, a `lamp`; "il fut jeté dans le puits" →
   `well` with `rope`; "le feu" → `flames`.
2. **Change the picture when the sentence changes** (a new action, a new place, a new moment of the day,
   weather coming). A scene of 220+ characters needs at least 2 pictures; most scenes want 2 or 3; never
   more than 5, never a beat shorter than a clause.
3. **Continuity across scenes.** The first picture of a scene continues the last picture of the previous scene
   unless the story moves elsewhere (then `cut: true`). Think of the whole episode as one shot sequence:
   establish the place with a wide, calm first picture, then come closer to what matters, and end the episode on
   a picture that answers its first one.
4. **Time and weather evolve in order** (dawn → day → dusk → night; clear → clouds → dark-clouds → rain /
   lightning → storm → clearing). A storm never appears from nowhere: announce it with `clouds`/`dark-clouds`/`wind`.
5. **Scenes with a verse** (the printout shows the verse read aloud right after the text): the last picture of the
   scene stays on screen during the verse, so make it illustrate what the verse says.
6. **Respect the texts**: never show anything the narration does not say or that the Quran/Sunna does not
   report (no invented details such as a dove for Nûh). Keep it modest: no violence, no blood, no idols
   shown; for a prophet's act, show its consequence or the object involved.
7. Do not repeat the same picture twice in a row; vary `focus` so that the camera has something new to find.
8. **More pictures, more life.** Show a new picture about every 6 to 8 seconds of narration (one per ~100
   characters; the tests require `floor(length/110)+1` pictures for scenes longer than 110 characters, up to 5).
   Put something alive in most pictures (at least 60% overall): people as silhouettes (`folk` when a few talk,
   `crowd` for a gathering or an army of unbelievers, `walkers` for a journey on foot, `workers` for a building
   site, `caravan` for travellers with camels), and animals (`birds`, `dove`, `gulls` at sea, `fish`,
   `butterflies` in a garden, `bats` at night, `sheep`, `goat`, `horse`, `camel`, `dog`, `wolf`...). A person
   speaking to the prophet, a crowd answering him: show them; the prophet himself is the light, the staff,
   the footprints, never a figure. Keep the silhouettes for people the text speaks of, not as filler.

## Vocabulary

- sky: `sun`, `moon`, `crescent`, `stars`, `bright-star`, `clouds` (white), `dark-clouds`, `rain`, `lightning`, `wind`
- water: `flood` (water rising over the land), `sea-split` (sea parted in two walls), `ark` (wooden ship with a
  cabin), `boat`, `big-fish` (a whale), `spring` (water gushing)
- light and fire: `light` (rays from the sky), `fire` (campfire), `lamp`, `flames` (a big blaze)
- plants: `palm`, `palms`, `tree`, `withered` (dead tree), `wheat`, `gourd`, `dates`
- places: `kaaba`, `tent`, `house`, `palace`, `tower`, `ruins`, `pillars`, `wall`, `prison`, `well`, `cave-mouth`, `throne`
- animals: `camel`, `birds` (a flock), `hoopoe`, `ants`, `sheep`, `elephant`, `cows`, `dove`, `wolf`, `serpent`,
  `locusts`, `dog`, `raven`, `horse`, `goat`, `gulls` (sea birds), `fish` (jumping), `butterflies`, `bats`
- people (faceless silhouettes of ordinary people only): `folk` (a few people standing and talking), `crowd`
  (a packed gathering), `walkers` (a few people walking), `workers` (people building or carrying), `caravan`
  (camels and travellers crossing)
- objects: `staff`, `tablets`, `book`, `scroll`, `coins`, `gold`, `shirt`, `cradle`, `table`, `stones`, `path`,
  `footprints`, `key`, `planks` (a pile of planks, a hull under construction), `web` (spider web), `basket`,
  `scales` (a balance), `goblet`, `bread`, `rock` (a big boulder or rock face), `rope`, `jar` (water jar)

Look at `src/components/SceneArt.tsx` to see how each motif is drawn and where it sits.

## Check your work

`npx vitest run tests/storyboard.test.ts -t "entries|follows"` must pass for your keys (ignore failures that name
other writers' stories, and the "coverage" tests, which fail until everybody is done). Fix every message that
mentions your keys.
