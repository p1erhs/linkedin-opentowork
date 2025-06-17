/**
 * Reddit Auto‑Comment Bot
 * -----------------------
 * 1. Κάνει login στο Reddit με .env credentials
 * 2. Μεταβαίνει σε SEARCH_URL (π.χ. αναζήτηση "jobs")
 * 3. Ανοίγει έως maxPosts post‑links, γράφει σχόλιο και προχωρά
 */

require("dotenv").config();
const puppeteer = require("puppeteer");

// ---------- παραμετροποίηση ----------
const USER_DATA_DIR =
  "C:/Users/pierg/AppData/Local/Google/Chrome/User Data/Default";

const {
  REDDIT_USERNAME,
  REDDIT_PASSWORD,
  SEARCH_URL = "https://www.reddit.com/search?q=jobs",
} = process.env;

const cfg = {
  searchUrl: SEARCH_URL,
  maxPosts: 10,
  jobKeywords: [
    "job",
    "hiring",
    "career",
    "position",
    "employment",
    "vacancy",
    "looking for",
    "job search",
  ],
  defaultComment:
    "Good luck with your job search! Feel free to try using Loopcv.",
  debug: true,
};

// ---------- helper‑functions ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

async function typeSlow(page, sel, txt) {
  await page.focus(sel);
  for (const ch of txt) {
    await page.keyboard.type(ch, { delay: 50 + Math.random() * 100 });
  }
  await sleep(400 + Math.random() * 600);
}
const firstName = (x) => x.replace(/^u\//, "").trim().split(/\s+/)[0];

// ---------- main ----------
(async () => {
  // ⬇ εκκίνηση Puppeteer με το υπάρχον Chrome profile
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [`--user-data-dir=${USER_DATA_DIR}`],
  });
  const page = await browser.newPage();

  // -------------------------------------------------
  // 1) Login (αν χρειάζεται)
  // -------------------------------------------------
  await page.goto("https://www.reddit.com/login", {
    waitUntil: "domcontentloaded",
  });

  // αποδοχή cookie‑banner
  try {
    const cookieBtn = await page.$(
      'button[data-testid="accept-privacy-policy"]'
    );
    if (cookieBtn) await cookieBtn.click({ delay: 50 });
  } catch (_) {}

  // poly‑selectors
  const USER_SEL =
    'input#loginUsername, input[name="username"], input[id^="login-username"]';
  const PASS_SEL =
    'input#loginPassword, input[name="password"], input[id^="login-password"]';
  const SUBMIT_SEL = 'button[type="submit"]';

  // αν δεν βρίσκει username πεδίο, πιθανότατα είμαστε ήδη logged‑in
  const needsLogin = await page.$(USER_SEL);
  if (needsLogin) {
    if (cfg.debug) console.log("→ Typing credentials…");
    await page.type(USER_SEL, REDDIT_USERNAME, { delay: 60 });
    await page.type(PASS_SEL, REDDIT_PASSWORD, { delay: 60 });
    await page.click(SUBMIT_SEL);
    await page.waitForNavigation({ waitUntil: "networkidle2" });
  }

  // απλή επιβεβαίωση: υπάρχει avatar;
  const avatar = await page.$('img[alt="User avatar"]');
  if (!avatar) {
    console.error("❌ Login failed – δεν εντοπίστηκε avatar. Διακόπτω.");
    await browser.close();
    return;
  }
  if (cfg.debug) console.log("✅ Logged in!");

  // -------------------------------------------------
  // 2) Μετάβαση στη σελίδα αναζήτησης
  // -------------------------------------------------
  await page.goto(cfg.searchUrl, { waitUntil: "networkidle2" });

  // scroll μερικές φορές για επιπλέον αποτελέσματα
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(2500);
  }

  // συλλογή links
  const postLinks = await page.evaluate(() => {
    const a = Array.from(document.querySelectorAll('a[href*="/comments/"]'));
    return [...new Set(a.map((x) => x.href))];
  });
  if (cfg.debug) console.log("🔗 found links:", postLinks.length);

  // -------------------------------------------------
  // 3) loop σε κάθε post
  // -------------------------------------------------
  for (let i = 0; i < Math.min(cfg.maxPosts, postLinks.length); i++) {
    const url = postLinks[i];
    console.log(`\n[${i + 1}/${cfg.maxPosts}] ${url}`);

    const p = await browser.newPage();
    await p.goto(url, { waitUntil: "networkidle2" });

    // μικρό scroll
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(1500);

    // keyword filter
    const bodyText = (await p.content()).toLowerCase();
    if (!cfg.jobKeywords.some((kw) => bodyText.includes(kw))) {
      if (cfg.debug) console.log("– No job keyword, skip.");
      await p.close();
      continue;
    }

    // author
    let author = await p.evaluate(() => {
      const u = document.querySelector('a[href*="/user/"]');
      return u ? u.textContent.trim() : null;
    });
    const comment = author
      ? `Good luck ${firstName(author)} with your job search! Feel free to try using Loopcv.`
      : cfg.defaultComment;

    // γράψιμο σχολίου
    try {
      const BOX_SEL =
        'div[role="textbox"][contenteditable="true"], textarea[name="comment"]';
      await p.waitForSelector(BOX_SEL, { timeout: 12000 });
      await typeSlow(p, BOX_SEL, comment);
      await p.click('button[type="submit"]');
      console.log("✓ comment posted");
    } catch (e) {
      console.log("× could not comment:", e.message);
    }

    await p.close();
    const delay = 30000 + rand(0, 15000); // 30‑45 s
    console.log(`wait ${(delay / 1000).toFixed(1)} s…`);
    await sleep(delay);
  }

  console.log("\n🚀 All done!");
  await browser.close();
})();
