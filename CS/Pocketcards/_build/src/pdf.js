import { readdirSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import pc from "picocolors";
import puppeteer from "puppeteer";

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DIST_DIR = resolve(here, "..", "..", "dist");

export async function runPdf(opts = {}) {
  const { distDir = DEFAULT_DIST_DIR, only = null, verbose = false } = opts;

  const htmlDir = join(distDir, "html");
  const pdfDir = join(distDir, "pdf");
  mkdirSync(pdfDir, { recursive: true });

  if (!existsSync(htmlDir)) {
    throw new Error(
      `HTML directory not found: ${htmlDir}. Run 'npm run build' first.`,
    );
  }

  const htmlFiles = readdirSync(htmlDir)
    .filter((f) => f.endsWith(".html") && f !== "index.html")
    .filter((f) => !only || f === `${only}.html`);

  if (htmlFiles.length === 0) {
    if (verbose) console.log(pc.yellow("No HTML files to convert."));
    return { generated: 0, failed: 0 };
  }

  const browser = await puppeteer.launch({ headless: true });
  let generated = 0;
  let failed = 0;

  try {
    for (const file of htmlFiles) {
      const id = file.replace(/\.html$/, "");
      const inputUrl = pathToFileURL(join(htmlDir, file)).toString();
      const outPath = join(pdfDir, `${id}.pdf`);
      const page = await browser.newPage();
      try {
        await page.goto(inputUrl, { waitUntil: "load", timeout: 20_000 });
        await page.pdf({
          path: outPath,
          format: "A5",
          printBackground: true,
          margin: { top: "8mm", bottom: "8mm", left: "8mm", right: "8mm" },
        });
        generated++;
        if (verbose) console.log(pc.green(`✓ PDF ${id}`));
      } catch (e) {
        failed++;
        console.error(pc.red(`✗ PDF ${id}: ${e.message}`));
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  return { generated, failed };
}
