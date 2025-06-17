# Marketing‑Automation – LinkedIn “Open‑to‑Work” Bot

This repo contains **two ways** to run our Loopcv auto‑comment bot on LinkedIn:

1. **One‑off script** – copy‑paste in DevTools Console  
2. **Chrome extension** – runs automatically every time you browse LinkedIn

---

## ① One‑off Script (DevTools Console)

1. Open LinkedIn search for `#opentowork`  
   <https://www.linkedin.com/search/results/content/?keywords=%23opentowork&origin=GLOBAL_SEARCH_HEADER&sid=bu%40>

2. Press **F12** (or **Ctrl + Shift + I**) to open Developer Tools → **Console**.

3. Copy the entire contents of `linkedin-script/index.js` and **paste** it in the console → **Enter**.

The script will:

* auto‑scroll & click **Show more results** to load extra posts  
* expand each post (**…more**) to read the full text  
* skip posts that don’t contain job‑search keywords  
* detect the author’s **first name**  
* post a personalised comment, e.g.


## ② Chrome extension

1. Go to **`chrome://extensions`**  
– Toggle **Developer mode** ON  
– Click **Load unpacked** → select `marketing-automation/`.

### Use it

1. An icon labelled **Loopcv Bot** appears in the toolbar.  
Click → tick **Enable bot**.
2. Visit the `#opentowork` search URL.  
When enabled, the extension injects `content.js` on every LinkedIn page and runs exactly the same logic as the console script.
3. Untick the checkbox to disable the bot. If you want to pause the program you can just refresh the page.

### The extension bot is working only when you are navigated to `#opentowork` search URL, so make sure you are in the right link (you can copy-paste the link above). 
### Also there is a timer that counts for 24 hours, so when this time is passed it reruns the `auto - comment bot `. This requires to let the tab opened.
