# 葉葉跳跳 · Leaf Leap

A side-scrolling platformer for the browser in the spirit of the classic 8-bit plumber games: bop blocks, stomp baddies, kick shells, and grab the **Super Leaf** to swing your tail and fly. Easy mode, built in blocky 3D with three.js.

橫向卷軸平台遊戲：頂方塊、踩敵人、踢龜殼，吃下**神奇葉子**甩尾巴、在天上飛。簡單模式。

**Play:** https://ywchen0711.github.io/leaf-leap/

## The game

- **A world map** with a path to walk: six levels, a Mushroom House, a fortress, and the Turtle King's castle. Levels on the path open up as you clear them.
- **Power-ups:** the Mushroom makes you big, the Fire Flower throws bouncing fireballs, and the Super Leaf gives you a tail. Swing the tail to knock out enemies and break bricks, tap jump in the air to float down slowly, or fill the P-meter by running and then fly.
- **Enemies:** Mushlings, winged Mushlings, turtles whose shells you can kick, and biting plants in pipes. There are two bosses that each take three stomps.
- **Blocks:** ? blocks, bricks, note blocks that bounce you, one-way clouds, coins, and pipes.
- **Goal cards:** touch the spinning box at the end of each level to win a card (mushroom, flower or star). Three cards give extra lives, and three of a kind give even more.
- **Items:** pick a chest at the Mushroom House and use the item on the map before a level.
- **Easy mode:** five lives, a checkpoint in every level, no timer, and a game over just sends you back to the map with five fresh lives.
- Saves automatically. In Chinese and English.

## Controls

| | Keyboard | Controller | Touch |
|---|---|---|---|
| Move | ← → (A D) | Stick / D-pad | ◀ ▶ |
| Jump (tap in the air with the leaf to fly) | Space, Z or ↑ | A | A |
| Run, throw fire, swing the tail | Shift or X | B / X | B |
| Map: walk / enter / items | Arrows / Space / X | D-pad / A / Y | ◀▶▲▼ / A / B |
| Menu | Esc | Start | ❚❚ |

## Code

Plain ES modules and [three.js](https://threejs.org/) from a CDN, with no build step. Block textures are 16×16 pixel art drawn on canvases, and all sound is synthesized with Web Audio.

- `js/game.js`: the rules: tiles, running, jumping and flying physics, enemies, blocks, power-ups and goals (no DOM)
- `js/levels.js`: the eight levels, built with small helpers, and the world map
- `js/view.js`: meshes for the blocks, backdrops, characters, items and effects
- `js/main.js`: title, map, levels, HUD, panels, input and the save
- `tools/test.mjs`: `npm test` runs a simple bot through every level (small and big) and checks stomping, shells, blocks, power-ups, flight and bosses
