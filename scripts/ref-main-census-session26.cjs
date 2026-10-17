/**
 * Session-26 investigation: the reference's <main> children went 10 -> 11.
 * Enumerate the children (tag/class/height/text-head) on BOTH viewports to
 * classify the new child (structure drift vs a zero-height non-visual).
 */
const { chromium } = require("playwright");

const REF = "https://pastel-aurelia-fashion-edit.base44.app/";

(async () => {
  const browser = await chromium.launch();
  const out = {};
  for (const [name, viewport] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await page.goto(REF, { waitUntil: "load", timeout: 45000 });
    // gentle scroll so lazy sections settle, then back up (the sweep ritual)
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let y = 0;
        const step = () => {
          y += 700;
          window.scrollTo(0, y);
          if (y < document.body.scrollHeight) setTimeout(step, 90);
          else { window.scrollTo(0, 0); setTimeout(resolve, 350); }
        };
        step();
      });
    });
    await page.waitForLoadState("networkidle").catch(() => {});
    out[name] = await page.evaluate(`(function(){
      const main = document.querySelector('main');
      const kids = [...main.children].map((c, i) => {
        const b = c.getBoundingClientRect();
        return {
          i,
          tag: c.tagName.toLowerCase(),
          cls: (c.className || '').toString().slice(0, 80),
          h: Math.round(b.height),
          text: (c.textContent || '').trim().slice(0, 60),
        };
      });
      return { mainKids: kids.length, kids };
    })()`);
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(out, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
