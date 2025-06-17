(async function() {
  const config = {
    // Fallback comment text if the author's name is not found.
    commentText: "Good luck with your job search! Feel free to try using Loopcv.",
    myName: "George Lamdus",
    maxPosts: 100,
    minDelayBetweenPosts: 45000,  // 45 seconds
    maxDelayBetweenPosts: 90000,  // 90 seconds
    minActionDelay: 2000,
    maxActionDelay: 5000,
    retryAttempts: 3,
    retryDelay: 3000,
    scrollBetweenPosts: true,
    debugMode: true
  };

  // List of job search keywords used for filtering the posts.
  const jobSearchKeywords = [
    "i'm looking for",
    "i am looking for",
    "i am seeking",
    "i'm seeking",
    "looking for a new role",
    "looking for new opportunities",
    "actively looking for a job",
    "seeking new job opportunities",
    "searching for a new job",
    "on the job market",
    "open to new roles"
  ];

  // Utility: Sleep function (ms)
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Utility: Random delay between min and max (in ms)
  function randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Simulate human typing (character-by-character)
  async function typeHumanLike(el, text) {
    el.textContent = "";
    el.focus();
    for (let i = 0; i < text.length; i++) {
      await sleep(randomDelay(50, 150));
      el.textContent += text[i];
      const inputEvent = new Event("input", { bubbles: true });
      el.dispatchEvent(inputEvent);
    }
    await sleep(randomDelay(500, 1200));
  }

  // Smooth scroll to a given element
  async function smoothScrollTo(el) {
    if (!el || !config.scrollBetweenPosts) return;
    const rect = el.getBoundingClientRect();
    const targetY = window.pageYOffset + rect.top - 100;
    const startY = window.pageYOffset;
    const dist = targetY - startY;
    const duration = randomDelay(800, 1500);
    let startTime = null;
    return new Promise(resolve => {
      function step(ts) {
        if (!startTime) startTime = ts;
        const progress = ts - startTime;
        const percent = Math.min(progress / duration, 1);
        const easeOut = p => 1 - Math.pow(1 - p, 2);
        window.scrollTo(0, startY + dist * easeOut(percent));
        if (progress < duration) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(step);
    });
  }

  // Auto-scroll to load more posts (up to 20 iterations)
  async function autoScroll() {
    let previousHeight = document.body.scrollHeight;
    let iterations = 0;
    while (iterations < 20) {
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(3000);
      let newHeight = document.body.scrollHeight;
      if (newHeight === previousHeight) break;
      previousHeight = newHeight;
      iterations++;
      if (config.debugMode) console.log(`Auto-scroll iteration ${iterations}: new height = ${newHeight}`);
    }
  }

  // Click "Show more results" button if present (up to 10 times)
  async function loadAllResults() {
    for (let i = 0; i < 10; i++) {
      const showMoreBtn = Array.from(document.querySelectorAll("button")).find(b =>
        b.textContent.trim().toLowerCase().includes("show more results")
      );
      if (!showMoreBtn) {
        if (config.debugMode) console.log("No 'Show more results' button found.");
        break;
      }
      showMoreBtn.click();
      await sleep(randomDelay(2000, 3000));
      if (config.debugMode) console.log("Clicked 'Show more results' button.");
    }
  }

  // Function to extract the first name of the post's author using multiple selectors
  function getAuthorName(post) {
    let hiddenNameEl = post.querySelector('span[aria-hidden="true"]');
    if (hiddenNameEl) {
      let fullName = hiddenNameEl.textContent.trim();
      if (fullName) {
        let firstName = fullName.split(" ")[0];  // Extract first token
        if (config.debugMode) console.log("Author name (first name) found via aria-hidden:", firstName);
        return firstName;
      }
    }
    let authorEl = post.querySelector('.feed-shared-actor__name a, .feed-shared-actor__title a');
    if (!authorEl) {
      authorEl = post.querySelector('.feed-shared-actor__name');
    }
    if (!authorEl) {
      authorEl = post.querySelector('[data-control-name="actor"]');
    }
    if (authorEl) {
      let fullName = authorEl.textContent.trim();
      if (fullName) {
        let firstName = fullName.split(" ")[0];
        if (config.debugMode) console.log("Author name (first name) found via fallback:", firstName);
        return firstName;
      }
    }
    if (config.debugMode) console.log("Author name not found in this post.");
    return null;
  }

  // Check if you have already commented on the post by scanning the comment thread for your name or "(you)"
  async function checkIfICommentedAlready(post) {
    const commentButton =
      post.querySelector('button[aria-label="comment"]') ||
      post.querySelector('button[data-control-name="comment"]') ||
      Array.from(post.querySelectorAll("button")).find(b => {
        const t = b.textContent.trim().toLowerCase();
        return t.includes("comment");
      });
    if (!commentButton) {
      if (config.debugMode) console.log("No comment button found to open thread.");
      return false;
    }
    commentButton.click();
    await sleep(randomDelay(1500, 2500));
    for (let i = 0; i < 3; i++) {
      const loadMoreBtn = Array.from(post.querySelectorAll("button")).find(b =>
        /load more comments/i.test(b.textContent)
      );
      if (loadMoreBtn) {
        loadMoreBtn.click();
        await sleep(randomDelay(2000, 3000));
      } else {
        break;
      }
    }
    const allCommentItems = Array.from(
      post.querySelectorAll(".comments-comment-item, .feed-shared-comments-list__comment-item")
    );
    if (config.debugMode) console.log("Visible comment items:", allCommentItems.length);
    const myNameLower = config.myName.toLowerCase();
    return allCommentItems.some(item => {
      const text = item.textContent.toLowerCase();
      return text.includes(myNameLower) || text.includes("(you)");
    });
  }

  async function commentOnOpenToWorkPosts() {
    if (config.debugMode) console.log("Starting the commenting process...");

    await autoScroll();
    await loadAllResults();

    const allPosts = Array.from(document.querySelectorAll(".feed-shared-update-v2"));
    if (config.debugMode) console.log(`Found ${allPosts.length} posts total.`);
    if (!allPosts.length) return;

    let openToWorkPosts = [];
    for (const post of allPosts) {
      const txt = (post.textContent || "").toLowerCase();
      if (
        txt.includes("#opentowork") ||
        txt.includes("open to work") ||
        txt.includes("#open to work") ||
        txt.includes("#jobsearch") ||
        txt.includes("#job search") ||
        txt.includes("#jobapplications") ||
        txt.includes("job applications")
      ) {
        openToWorkPosts.push(post);
      }
    }
    if (config.debugMode) console.log(`Posts with filter keywords: ${openToWorkPosts.length}`);
    openToWorkPosts = openToWorkPosts.slice(0, config.maxPosts);

    let successCount = 0, failCount = 0;
    for (let i = 0; i < openToWorkPosts.length; i++) {
      const post = openToWorkPosts[i];
      if (config.debugMode) console.log(`Processing post ${i + 1}/${openToWorkPosts.length}`);

      // Expand the post text using "See more"/"...more" if available
      const seeMoreButton =
        post.querySelector('span.feed-shared-inline-show-more-text__see-more-link') ||
        post.querySelector('button[aria-label*="see more"]') ||
        post.querySelector('button[aria-label*="... more"]') ||
        post.querySelector('.feed-shared-inline-show-more-text__see-more-less-toggle') ||
        Array.from(post.querySelectorAll("button, span, a")).find(el =>
          el.textContent.trim().toLowerCase().includes("...more")
        );
      if (seeMoreButton) {
        seeMoreButton.click();
        await sleep(randomDelay(500, 1000));
      }
  
      let postTextRaw = post.textContent || "";
      let postTextLower = postTextRaw.replace(/[’‘`]/g, "'").toLowerCase();
  
      if (postTextLower.includes("only connections can comment on this post. you can still react or share it.")) {
        if (config.debugMode) console.log("Skip: Only connections restriction.");
        continue;
      }
  
      const foundJobKeyword = jobSearchKeywords.some(keyword => postTextLower.includes(keyword));
      if (!foundJobKeyword) {
        if (config.debugMode) console.log("Skip: No job-search keywords found.");
        continue;
      }
  
      await smoothScrollTo(post);
      await sleep(randomDelay(config.minActionDelay, config.maxActionDelay));
  
      const alreadyCommented = await checkIfICommentedAlready(post);
      if (alreadyCommented) {
        if (config.debugMode) console.log("Skip: I already commented on this post.");
        continue;
      }
  
      // Personalize comment only using the author's first name.
      const authorName = getAuthorName(post);
      let personalizedComment = authorName 
          ? `Good luck ${authorName} with your job search! Feel free to try using Loopcv.` 
          : config.commentText;
  
      let success = false;
      let attempts = 0;
      while (!success && attempts < config.retryAttempts) {
        attempts++;
        if (attempts > 1) {
          if (config.debugMode) console.log(`Retry attempt #${attempts}`);
          await sleep(config.retryDelay);
        }
        try {
          const commentBtn =
            post.querySelector('button[aria-label="comment"]') ||
            post.querySelector('button[data-control-name="comment"]') ||
            Array.from(post.querySelectorAll("button")).find(b => {
              const t = b.textContent.trim().toLowerCase();
              return t.includes("comment");
            });
          if (commentBtn) {
            commentBtn.click();
            await sleep(randomDelay(config.minActionDelay, config.maxActionDelay));
          }
          const field =
            post.querySelector('.ql-editor[data-placeholder="Add a comment…"]') ||
            post.querySelector(".comments-comment-box__input") ||
            post.querySelector('[contenteditable="true"]') ||
            post.querySelector(".ql-editor");
          if (!field) {
            if (config.debugMode) console.log("No comment field found. Skipping...");
            continue;
          }
          await typeHumanLike(field, personalizedComment);
          await sleep(500);
          let postBtn = post.querySelector("button.comments-comment-box__submit-button");
          if (!postBtn) {
            postBtn = Array.from(post.querySelectorAll("button")).find(b => {
              const t = b.textContent.trim().toLowerCase();
              return t.includes("post") || t.includes("δημοσίευση");
            });
          }
          if (!postBtn) {
            if (config.debugMode) console.log("No Post button found. Skipping...");
            continue;
          }
          postBtn.click();
          await sleep(randomDelay(config.minActionDelay, config.maxActionDelay));
          success = true;
          successCount++;
          if (config.debugMode) console.log("Comment posted successfully on this post.");
        } catch (err) {
          if (config.debugMode) console.log("Error while commenting:", err);
        }
      }
      if (!success) {
        failCount++;
      }
      if (i < openToWorkPosts.length - 1) {
        const waitTime = randomDelay(config.minDelayBetweenPosts, config.maxDelayBetweenPosts);
        if (config.debugMode) console.log(`Waiting ~${(waitTime/1000).toFixed(1)} seconds before the next post...`);
        await sleep(waitTime);
      }
    }
    if (config.debugMode) console.log(`Done. Successful comments: ${successCount}, Failures: ${failCount}`);
  }
  
  await commentOnOpenToWorkPosts();
})();
