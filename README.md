# 葉葉跳跳 3D · Leaf Leap 3D

A 3D platformer for the browser in the spirit of Super Mario Bros. 3 and its 3D "Land" homage. Run freely through blocky 3D courses, wear the **Tanooki Suit** to fly and turn to stone, swim the bay in the **Frog Suit**, play the spade cards, raid the Mushroom Houses, and storm the airship. Easy mode, built with three.js.

向超級瑪利歐兄弟 3 致敬的 3D 平台遊戲：穿上**狸貓裝**飛上天、變成石像，穿上**青蛙裝**在海底游泳，翻黑桃卡、逛蘑菇小屋，最後登上飛行船。簡單模式。

**Play:** https://ywchen0711.github.io/leaf-leap/

## The game

- **One huge open world.** All of Leafy Land is a single 3D island, 576 × 576 blocks, to roam freely. In the middle-west lies the old heartland (meadows, hills, voxel trees you can climb onto, the mountain, the Lava Castle and Coral Bay), with every course of the old world map set where it belongs:
  - **1-1 Meadow Path, 1-2 Rolling Hills, 1-4 Pipe Grove** run across the land;
  - **1-3 Cloud Bridges** and **1-6 Sky Gym** float in the sky (cloud stairs climb up to them, and falling off lands you in the meadow below);
  - **1-W Coral Bay** lies under the sea; **1-5 Underground Cave** tunnels through the mountain; **1-F Stone Fortress** is inside the Lava Castle;
  - **1-A The Airship** waits above the sea; a cloud stair to it only appears once the fortress has fallen.
- **Five more lands** around it, each with its own sky, music, baddies and landmarks: **Frostpeak Snowfields** (a frozen lake that is slippery underfoot, an ice mountain with a cave, an igloo, sharp peaks), the **Giant Mushroom Forest** (caps to climb; blue ones bounce you), the **Sunsand Desert** (a stepped pyramid, an oasis, a desert town with a third Mushroom House, a cactus maze, a mesa), **Mount Ember** (a crater lake of lava, a lava tube full of bats, an obsidian tower) and the **Southern Isles** (a lighthouse with a spiral stair, a shipwreck, a sunken ring of pillars).
- **45 secret stars** hidden everywhere: invisible blocks you only find by jumping into them, an X on the ground to ground-pound, sets of eight red coins, cracked brick doors to swing your tail at, unmarked pipes down to bonus vaults, the tallest treetop, the highest peak, the sea floor. Old stone tablets whisper riddles when you stand next to them; the map counts what is left in each land, and every fifth star brings a gift.
- **Comic-book characters:** everyone is drawn in a bold manga look: cel shading with hard shadow steps and a thick black ink line round every part. The hero has a big head, spiky black hair under a yellow headband, huge round eyes that blink and change with what he is doing (a grin at full run, wide eyes when falling, a wince when hurt), rosy cheeks, round gloves and chunky boots. The Mushlings scowl and grin, dressed for each land; turtles have plated shells and friendly eyes; spinies you must not stomp, bats that swoop, cactus stacks that lose a piece to each stomp, biting plants with jagged teeth, and bosses with horns and crowns.
- **Mushroom Village** in the west: walk in at a Mushroom House door to pick a chest, step onto the green spade panel to play the card game (both restock each time you win a new star), and use the row of **warp pipes**: each one opens once you have been to its course, and every course has a pipe home. Stand on a pipe and press the pound button.
- **Stars:** cross a course's finish line (or beat its boss) for its card and a star; nine to find. Checkpoint flags and course starts are where you come back after a fall.
- **The map** (M) shows the whole island, every course, which are done and which pipes are open. Each area has its own music and sky; the cave and the fortress are dark, and the sea turns blue around you.
- **Items** can be used any time from your bag (Tab, or tap it); the P-wing gives a minute of free flight.
- Knocked-out baddies come back after a while, when you are far away, and wander the open land too.
- **Power-ups:** the Mushroom makes you big, the Fire Flower throws bouncing fireballs the way you face, and the Super Leaf gives you a raccoon tail. Spin the tail all around you, tap jump in the air to float down slowly, or fill the P-meter by running and then fly.
- **Tanooki Suit:** everything the tail does, and hold the pound button on the ground to turn into a stone statue that nothing can hurt.
- **Frog Suit:** the fastest swimmer: swim in any direction, hold jump to rise and pound to dive. On land it hops along slowly.
- **P-Wing:** use it on the map and the P-meter never runs out for one whole level.
- **Water:** in the sea you sink slowly and stroke up with jump; leap out at the surface. Fish chase you there.
- **The airship:** a wooden ship in the sky with cannons whose balls you can stomp, and a little turtle prince who throws magic rings.
- **Ground pound:** press the pound button in the air to slam down, breaking bricks and knocking out enemies around you.
- **Enemies:** Mushlings that turn towards you, winged Mushlings, turtles whose shells you can kick in any direction, biting plants in round pipes, and fish. There are two bosses that each take three stomps.
- **Goal cards:** cross the finish line under the spinning card box to win a card (mushroom, flower or star). Three cards give extra lives, and three of a kind give even more.
- **Items:** pick a chest at a Mushroom House (they hold the suits and the P-wing), or win items in the spade card game, and use them on the map before a level.
- **Easy mode:** five lives, a checkpoint in every level, no timer, and a game over just sends you back to the map with five fresh lives.
- Saves automatically. In Chinese and English. Add `?fx=low` to the address to turn shadows off on slow machines.

## Controls

| | Keyboard and mouse | Controller | Touch |
|---|---|---|---|
| Move | Arrows / WASD | Left stick | Arrow buttons |
| Camera | Q / E, drag, wheel | Right stick | Drag the screen |
| Jump (tap in the air with the leaf to fly) | Space or Z | A | A |
| Run, throw fire, swing the tail | Shift or X | B / X | B |
| Ground pound (in the air) · Tanooki statue (hold on the ground) · Frog dive | C | Y / LT | ⤓ |
| Items · Map | Tab / I · M | Back · LB | tap the bag |
| Go down a warp pipe | C (standing on it) | Y | ⤓ |
| Menu | Esc | Start | ❚❚ |

## Code

Plain ES modules and [three.js](https://threejs.org/) from a CDN, with no build step. The world is meshed in 16 × 16 chunks that hold only visible faces (one texture atlas, with ambient occlusion), built nearest-first a few chunks a frame and dropped again once far behind. `npm test` runs every course on its own and again inside the world. Block textures are 16×16 pixel art drawn on canvases, and all sound is synthesized with Web Audio.

- `js/game.js`: the rules: a 3D block grid, running, jumping, pounding and flying, enemies, blocks, power-ups and goals (no DOM)
- `js/levels.js`: the eight 3D levels, built with small helpers, and the world map
- `js/view.js`: meshes for the blocks (only the visible ones), round pipes, scenery, characters, items and effects
- `js/main.js`: title, map, levels, the follow camera, HUD, panels, input and the save
- `tools/test.mjs`: `npm test` sends a simple bot along every level (small and big) and checks movement in depth, stomping, shells, blocks, the ground pound, power-ups, flight and bosses
