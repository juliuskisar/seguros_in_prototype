const { chromium } = require("playwright");
const path = require("path");

const base = "http://localhost:8080";
const out = path.join(__dirname);

const viewports = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-320", width: 320, height: 740 }
];

(async () => {
  const browser = await chromium.launch();
  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto(base + "/index.html", { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(out, "landing-" + vp.name + ".png"), fullPage: true });
    await page.close();
  }

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(base + "/index.html");
  await page.click('[data-action="open-quote"][data-product-id="auto"]');
  await page.waitForSelector("#lead-dialog[open]");
  await page.screenshot({ path: path.join(out, "form-dialog.png") });

  await page.goto(base + "/proxima-etapa.html?fluxo=cotacao&produto=auto");
  await page.screenshot({ path: path.join(out, "next-step-cotacao.png") });

  await page.goto(base + "/proxima-etapa.html?fluxo=invalido&produto=xyz");
  await page.screenshot({ path: path.join(out, "next-step-invalid.png") });

  await browser.close();
  console.log("Screenshots saved to qa/");
})();
