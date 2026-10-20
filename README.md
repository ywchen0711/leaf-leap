# 葉葉跳跳 3D · Leaf Leap 3D

A 3D platformer for the browser in the spirit of Super Mario Bros. 3 and its 3D "Land" homage. Run freely through blocky 3D courses, wear the **Tanooki Suit** to fly and turn to stone, swim the bay in the **Frog Suit**, play the spade cards, raid the Mushroom Houses, and storm the airship. Easy mode, built with three.js.

向超級瑪利歐兄弟 3 致敬的 3D 平台遊戲：穿上**狸貓裝**飛上天、變成石像，穿上**青蛙裝**在海底游泳，翻黑桃卡、逛蘑菇小屋，最後登上飛行船。簡單模式。

**Play:** https://ywchen0711.github.io/leaf-leap/

## The game

- **A world map** with a path to walk: seven courses (one of them under the sea), two Mushroom Houses, a spade card game, a fortress, and the airship. Levels on the path open up as you clear them.
- **3D courses** made of blocks: meadows, terraces, floating sky islands, a pipe grove, a cave, and lava halls. You can move side to side as well as forward, and the edges of every course are safe walls.
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
| Map: walk / enter / items | Arrows / Space / X | D-pad / A / Y | Arrows / A / B |
| Menu | Esc | Start | ❚❚ |

## Code

Plain ES modules and [three.js](https://threejs.org/) from a CDN, with no build step. Block textures are 16×16 pixel art drawn on canvases, and all sound is synthesized with Web Audio.

- `js/game.js`: the rules: a 3D block grid, running, jumping, pounding and flying, enemies, blocks, power-ups and goals (no DOM)
- `js/levels.js`: the eight 3D levels, built with small helpers, and the world map
- `js/view.js`: meshes for the blocks (only the visible ones), round pipes, scenery, characters, items and effects
- `js/main.js`: title, map, levels, the follow camera, HUD, panels, input and the save
- `tools/test.mjs`: `npm test` sends a simple bot along every level (small and big) and checks movement in depth, stomping, shells, blocks, the ground pound, power-ups, flight and bosses
