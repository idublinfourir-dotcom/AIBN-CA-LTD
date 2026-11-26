/* Performance budget for the homepage hero media in public/. Runs in CI with
   `npm test`. The first clip and poster are on the homepage's critical path,
   so a heavier replacement fails here instead of slowing the live page.
   Re-encode a new clip with:
   ffmpeg -i in.mp4 -map 0:v:0 -an -vf scale=1280:720 -c:v libx264 -preset slow
     -crf 26 -maxrate 1000k -bufsize 2000k -pix_fmt yuv420p -movflags +faststart out.mp4 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { statSync } from "node:fs";

const KiB = 1024;
const size = (f: string) => statSync(new URL(`../../public/${f}`, import.meta.url)).size;

test("first hero clip and poster stay small (they load before anything else)", () => {
  assert.ok(size("hero-1.mp4") <= 800 * KiB, `hero-1.mp4 is ${Math.round(size("hero-1.mp4") / KiB)} KiB`);
  assert.ok(size("hero-1.jpg") <= 80 * KiB, `hero-1.jpg is ${Math.round(size("hero-1.jpg") / KiB)} KiB`);
});

test("every hero clip and poster is within budget", () => {
  for (const n of [1, 2, 3]) {
    assert.ok(size(`hero-${n}.mp4`) <= 1600 * KiB, `hero-${n}.mp4 is ${Math.round(size(`hero-${n}.mp4`) / KiB)} KiB`);
    assert.ok(size(`hero-${n}.jpg`) <= 160 * KiB, `hero-${n}.jpg is ${Math.round(size(`hero-${n}.jpg`) / KiB)} KiB`);
  }
});
