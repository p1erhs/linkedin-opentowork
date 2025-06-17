/* LinkedIn Loopcv Auto‑Commenter – content.js */
/* global chrome */

(() => {
  // ─── 0) Toggle guard: μόνο αν είναι enabled τρέχει το bot ─────────
  chrome.storage.sync.get({ botEnabled: true }, ({ botEnabled }) => {
    if (!botEnabled) {
      console.log("🛑 Loopcv bot is disabled – aborting.");
      return;
    }
    // τρέχει το bot
    runBot();
  });

  // ─── 1) Wrapper που περιέχει όλο τον αλγόριθμο ─────────────────
  async function runBot() {
    // — Helper functions —
    const sleep  = ms => new Promise(r => setTimeout(r, ms));
    const rDelay = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

    async function typeHumanLike(el, text) {
      el.textContent = "";
      el.focus();
      for (const ch of text) {
        await sleep(rDelay(50, 150));
        el.textContent += ch;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
      await sleep(rDelay(500, 1200));
    }

    async function smoothScrollTo(el) {
      if (!el) return;
      const rect   = el.getBoundingClientRect();
      const start  = window.pageYOffset;
      const target = start + rect.top - 100;
      const dist   = target - start;
      const dur    = rDelay(800, 1500);
      let startT   = null;
      return new Promise(res => {
        function step(ts) {
          if (!startT) startT = ts;
          const p = Math.min((ts - startT) / dur, 1);
          window.scrollTo(0, start + dist * (1 - Math.pow(1 - p, 2)));
          p < 1 ? requestAnimationFrame(step) : res();
        }
        requestAnimationFrame(step);
      });
    }

    async function autoScroll() {
      let prev = document.body.scrollHeight;
      for (let i = 0; i < 20; i++) {
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(3000);
        const now = document.body.scrollHeight;
        if (now === prev) break;
        prev = now;
        console.log(`Auto‑scroll #${i+1}: ${now}px`);
      }
    }

    async function clickShowMoreResults() {
      for (let i = 0; i < 10; i++) {
        const btn = [...document.querySelectorAll("button")].find(b =>
          b.textContent.trim().toLowerCase().includes("show more results")
        );
        if (!btn) break;
        btn.click();
        await sleep(rDelay(2000, 3000));
        console.log("Clicked Show more results");
      }
    }

    function getAuthorName(post) {
      let el = post.querySelector('span[aria-hidden="true"]');
      if (el && el.textContent.trim()) return el.textContent.trim().split(" ")[0];
      el = post.querySelector('.feed-shared-actor__name a, .feed-shared-actor__title a')
         || post.querySelector('.feed-shared-actor__name')
         || post.querySelector('[data-control-name="actor"]');
      if (el && el.textContent.trim()) return el.textContent.trim().split(" ")[0];
      return null;
    }

    async function checkIfICommentedAlready(post, myName) {
      const btn = post.querySelector('button[aria-label="comment"]')
                 || post.querySelector('button[data-control-name="comment"]')
                 || [...post.querySelectorAll("button")].find(b =>
                      b.textContent.toLowerCase().includes("comment")
                    );
      if (!btn) return false;
      btn.click();
      await sleep(rDelay(1500, 2500));

      for (let i = 0; i < 3; i++) {
        const more = [...post.querySelectorAll("button")].find(b =>
          /load more comments/i.test(b.textContent)
        );
        if (!more) break;
        more.click();
        await sleep(rDelay(2000, 3000));
      }

      return [...post.querySelectorAll(
        ".comments-comment-item, .feed-shared-comments-list__comment-item"
      )].some(item => {
        const txt = item.textContent.toLowerCase();
        return txt.includes(myName.toLowerCase()) || txt.includes("(you)");
      });
    }

    // — Core bot function —
    async function commentOnOpenToWork() {
      console.log("▶ Loopcv bot starting…");

      const config = {
        commentText: "Good luck with your job search! Feel free to try using Loopcv.",
        myName: "George Lamdus",
        maxPosts: 100,
        minDelayBetweenPosts: 45000,
        maxDelayBetweenPosts: 90000,
        minActionDelay: 2000,
        maxActionDelay: 5000,
        retryAttempts: 3,
        retryDelay: 3000
      };

      const keywords = [
        "i'm looking for", "i am looking for", "i am seeking", "i'm seeking",
        "looking for a new role", "looking for new opportunities",
        "actively looking for a job", "seeking new job opportunities",
        "searching for a new job", "on the job market", "open to new roles"
      ];

      //περιορισμός στο σωστό URL
      if (!/\/search\/results\/content\/\?keywords=%23opentowork/.test(location.href)) {
        console.log("✋ Not on #opentowork search → abort.");
        return;
      }

      await autoScroll();
      await clickShowMoreResults();

      const all = [...document.querySelectorAll(".feed-shared-update-v2")];
      console.log("Found posts:", all.length);

      let posts = all.filter(p => {
        const t = p.textContent.toLowerCase();
        return (
          t.includes("#opentowork") ||
          t.includes("open to work") ||
          t.includes("#jobsearch") ||
          t.includes("job applications")
        );
      });
      console.log("Filtered:", posts.length);
      posts = posts.slice(0, config.maxPosts);

      let ok = 0, fail = 0;
      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        console.log(`\n[${i+1}/${posts.length}]`);

        const moreBtn = post.querySelector(
          'span.feed-shared-inline-show-more-text__see-more-link,' +
          'button[aria-label*="see more"],.feed-shared-inline-show-more-text__see-more-less-toggle'
        ) || [...post.querySelectorAll("button, span, a")].find(e =>
          e.textContent.toLowerCase().includes("...more")
        );
        if (moreBtn) {
          moreBtn.click();
          await sleep(rDelay(500, 1000));
        }

        const txt = post.textContent.replace(/[’‘`]/g, "'").toLowerCase();
        if (txt.includes("only connections can comment")) {
          console.log("Skip: connections-only");
          continue;
        }
        if (!keywords.some(k => txt.includes(k))) {
          console.log("Skip: no keywords");
          continue;
        }

        await smoothScrollTo(post);
        await sleep(rDelay(config.minActionDelay, config.maxActionDelay));

        if (await checkIfICommentedAlready(post, config.myName)) {
          console.log("Skip: already commented");
          continue;
        }

        const first = getAuthorName(post);
        const message = first
          ? `Good luck ${first} with your job search! Feel free to try using Loopcv.`
          : config.commentText;

        let done = false;
        for (let attempt = 1; attempt <= config.retryAttempts && !done; attempt++) {
          try {
            const cBtn = post.querySelector('button[aria-label="comment"]')
                       || post.querySelector('button[data-control-name="comment"]')
                       || [...post.querySelectorAll("button")].find(b =>
                            b.textContent.toLowerCase().includes("comment")
                          );
            if (cBtn) {
              cBtn.click();
              await sleep(rDelay(config.minActionDelay, config.maxActionDelay));
            }

            const field = post.querySelector(
              '.ql-editor[data-placeholder="Add a comment…"]'
            ) || post.querySelector(".comments-comment-box__input")
              || post.querySelector('[contenteditable="true"]')
              || post.querySelector(".ql-editor");
            if (!field) throw new Error("no field");

            await typeHumanLike(field, message);
            await sleep(500);

            const pBtn = post.querySelector("button.comments-comment-box__submit-button")
                       || [...post.querySelectorAll("button")].find(b =>
                            ["post","δημοσίευση"].some(w =>
                              b.textContent.toLowerCase().includes(w)
                            )
                          );
            if (!pBtn) throw new Error("no post button");

            pBtn.click();
            await sleep(rDelay(config.minActionDelay, config.maxActionDelay));
            console.log("✓ Comment posted");
            ok++;
            done = true;
          } catch (err) {
            console.log(`Attempt ${attempt} failed: ${err.message}`);
            await sleep(config.retryDelay);
          }
        }
        if (!done) fail++;

        if (i < posts.length - 1) {
          const wait = rDelay(config.minDelayBetweenPosts, config.maxDelayBetweenPosts);
          console.log(`Waiting ${(wait/1000).toFixed(1)}s…`);
          await sleep(wait);
        }
      }

      console.log(`\nDone. Success: ${ok}, Fail: ${fail}`);
    }

    commentOnOpenToWork();

    const DAY = 24 * 60 * 60 * 1000;
    setInterval(() => {
      console.log("24h passed — rerunning bot…");
      commentOnOpenToWork();
    }, DAY);
  }
})();
