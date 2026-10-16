/**
 * Brand-asset authoring pipeline (session-24, F-K/F-K2 — one-time renders,
 * re-runnable). Renders the shipped SVG mark (src/app/icon.svg) and the OG
 * card into the committed binaries:
 *
 *   src/app/favicon.ico            (16/32/48, PNG-in-ICO via Pillow)
 *   src/app/apple-icon.png         (180×180)
 *   public/icons/icon-192.png      (PWA manifest, F-L)
 *   public/icons/icon-512.png
 *   src/app/opengraph-image.png    (1200×630 share card, F-K2)
 *
 * The fonts come from public/fonts (file:// URLs) so the card renders in the
 * real Cormorant Garamond / Montserrat. Idempotent: re-running overwrites
 * the same outputs. Requires: playwright (chromium), Pillow (venv python3).
 */
const { chromium } = require("playwright");
const { spawnSync } = require("child_process");
const { readFileSync, writeFileSync, mkdirSync, unlinkSync } = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SVG = readFileSync(path.join(ROOT, "src/app/icon.svg"), "utf8");
const TMP = path.join(ROOT, ".brand-tmp");

const PNG_JOBS = [
  { file: "src/app/apple-icon.png", size: 180 },
  { file: "public/icons/icon-192.png", size: 192 },
  { file: "public/icons/icon-512.png", size: 512 },
];

async function renderSvgPng(page, size, outPath, circleOnly = true) {
  // Render the square mark at the exact size. For apple icons the circle is
  // the app tile; transparency outside the circle is preserved (PNG).
  const svg = circleOnly ? SVG : SVG;
  const html = `<!doctype html><html><body style="margin:0;background:transparent">
    <div style="width:${size}px;height:${size}px">${svg.replace(
      'viewBox="0 0 1024 1024"',
      `viewBox="0 0 1024 1024" width="${size}" height="${size}"`
    )}</div>
  </body></html>`;
  await page.setContent(html);
  const el = page.locator("div");
  await el.screenshot({ path: outPath, omitBackground: true });
}

const OG_HTML = `<!doctype html><html><head><style>
  @font-face { font-family: "Cormorant Garamond"; src: url("file://${ROOT}/public/fonts/cormorant-garamond-300.woff2") format("woff2"); font-weight: 300; }
  @font-face { font-family: "Cormorant Garamond"; src: url("file://${ROOT}/public/fonts/cormorant-garamond-400.woff2") format("woff2"); font-weight: 400; }
  @font-face { font-family: "Montserrat"; src: url("file://${ROOT}/public/fonts/montserrat-400.woff2") format("woff2"); font-weight: 400; }
  @font-face { font-family: "Montserrat"; src: url("file://${ROOT}/public/fonts/montserrat-500.woff2") format("woff2"); font-weight: 500; }
  * { margin: 0; }
  body { width: 1200px; height: 630px; overflow: hidden; }
  .card {
    width: 1200px; height: 630px; background: #F8F7F6;
    display: flex; align-items: center; justify-content: center; gap: 72px;
  }
  .mark { width: 300px; height: 300px; }
  .type { display: flex; flex-direction: column; align-items: flex-start; }
  .kicker { font: 500 22px "Montserrat"; letter-spacing: 0.5em; color: rgb(120,113,108); text-transform: uppercase; margin-bottom: 18px; }
  .name { font: 300 128px "Cormorant Garamond"; color: rgb(23,20,17); letter-spacing: 0.08em; line-height: 1; }
  .rule { width: 120px; height: 1px; background: rgb(23,20,17); opacity: 0.35; margin: 26px 0; }
  .tagline { font: 400 17px "Montserrat"; letter-spacing: 0.32em; color: rgb(87,83,78); text-transform: uppercase; }
</style></head><body>
  <div class="card">
    <div class="mark">${SVG.replace('viewBox="0 0 1024 1024"', 'viewBox="0 0 1024 1024" width="300" height="300"')}</div>
    <div class="type">
      <div class="kicker">Maison de Couture</div>
      <div class="name">AURELIA</div>
      <div class="rule"></div>
      <div class="tagline">Paris · Milan · New York</div>
    </div>
  </div>
</body></html>`;

async function main() {
  mkdirSync(TMP, { recursive: true });
  mkdirSync(path.join(ROOT, "public/icons"), { recursive: true });
  const browser = await chromium.launch();

  // 1. The OG card (fixed 1200×630).
  {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    await page.setContent(OG_HTML, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(ROOT, "src/app/opengraph-image.png") });
    await page.close();
    console.log("[assets] opengraph-image.png 1200×630 ✓");
  }

  // 2. The square PNG renders.
  {
    const page = await browser.newPage();
    for (const job of PNG_JOBS) {
      const out = path.join(ROOT, job.file);
      await renderSvgPng(page, job.size, out);
      console.log(`[assets] ${job.file} ${job.size}×${job.size} ✓`);
    }
    // favicon sizes 16/32/48 land in tmp for the ICO wrapper
    for (const size of [16, 32, 48]) {
      await renderSvgPng(page, size, path.join(TMP, `favicon-${size}.png`));
    }
    await page.close();
    console.log("[assets] favicon PNGs 16/32/48 ✓");
  }

  await browser.close();

  // 3. Wrap the ICO with Pillow (PNG-in-ICO; Vista+).
  const py = spawnSync(
    "/home/z/.venv/bin/python3",
    [path.join(__dirname, "png-to-ico.py"), TMP, path.join(ROOT, "src/app/favicon.ico")],
    { stdio: "inherit" }
  );
  if (py.status !== 0) {
    console.error("[assets] ICO wrap FAILED");
    process.exit(1);
  }
  console.log("[assets] src/app/favicon.ico (16/32/48) ✓");
}

main().catch((e) => {
  console.error("[assets] FAILED", e);
  process.exit(1);
});
