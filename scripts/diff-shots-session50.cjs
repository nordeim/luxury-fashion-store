#!/usr/bin/env node
// Session-50: pixel-diff the 2 differing screenshots vs the committed
// versions — confirm the deltas are the documented timing class (hero
// carousel position / live countdown), not a geometry change.
const { execSync } = require("child_process");
const fs = require("fs");

for (const name of ["clone-mobile-home", "clone-mobile-menu-open"]) {
  const path = `docs/screenshots/${name}.png`;
  const old = execSync(`git show HEAD:${path}`).toString("base64");
  fs.writeFileSync("/tmp/old.png", Buffer.from(old, "base64"));
  // Use node to compare via raw decode: fall back to a quick byte-level
  // chunk compare with playwright-free PNG parsing.
  const { PNG } = (() => {
    try { return require("pngjs"); } catch { return {}; }
  })();
  if (!PNG) {
    console.log(`${name}: pngjs unavailable — byte-size compare only`,
      "new:", fs.statSync(path).size, "old:", Buffer.from(old, "base64").length);
    continue;
  }
  const a = PNG.sync.read(fs.readFileSync("/tmp/old.png"));
  const b = PNG.sync.read(fs.readFileSync(path));
  if (a.width !== b.width || a.height !== b.height) {
    console.log(`${name}: DIMENSION CHANGE ${a.width}x${a.height} vs ${b.width}x${b.height}`);
    continue;
  }
  let diff = 0;
  let minY = 1e9, maxY = -1, minX = 1e9, maxX = -1;
  for (let y = 0; y < a.height; y++) {
    for (let x = 0; x < a.width; x++) {
      const i = (y * a.width + x) * 4;
      if (a.data[i] !== b.data[i] || a.data[i+1] !== b.data[i+1] || a.data[i+2] !== b.data[i+2]) {
        diff++;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
      }
    }
  }
  const total = a.width * a.height;
  console.log(`${name}: ${diff}/${total} pixels differ (${(100*diff/total).toFixed('3')}%) — bbox x[${minX}..${maxX}] y[${minY}..${maxY}] (viewport 390x844)`);
}
