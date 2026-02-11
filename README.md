# Etsy Mentor

Listing-only Etsy SEO mentor app. Capture Etsy listing pages, run SEO audit with OpenAI, and view results in the sidebar.

## Requirements

- Node.js 18+
- **Windows:** Visual Studio Build Tools (Desktop development with C++) for `better-sqlite3` native build. If `npm install` fails with node-gyp errors, install [Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) then run `npm install` again.

## Setup and run

```bash
npm install
npm run dev
```

- **New Session** — Start a browsing session and open the in-app browser (BrowserView).
- **URL bar** — Enter an Etsy listing URL (e.g. `https://www.etsy.com/listing/...`) and click **Go**.
- **Capture** — Saves the current page HTML and screenshot to local storage.
- **Analyze** — Runs OpenAI SEO audit on the last capture (requires API key in Settings).
- **Settings** — Store your OpenAI API key (saved in local SQLite).

Data is stored locally: SQLite in app user data and assets under `data/assets/`.

---

## Gate 1: How to test

1. **App opens to Portfolio Dashboard**  
   Run `npm run dev`. The app should open directly to the Portfolio Dashboard (left: store cards, right: Mentor panel). No other view should appear first.

2. **Store cards show dummy data**  
   You should see at least 2 store cards (e.g. "Vintage Tee Co", "Minimal Quote Shop"), each with: Store name, niche summary (theme / emotion / buyer), level badge (Beginner/Growing/Stable/Risky), "Aktif görev: 0", and buttons "Enter Store" and "Profile".

3. **Mentor is silent by default**  
   The right-hand Mentor panel should show the Chat tab with no messages and the text: "Mentor sessiz. Bir mağazaya girmek için sol taraftan \"Enter Store\" seçin." Tasks and History tabs can be placeholders.

4. **Enter Store activates mentor and shows one greeting**  
   Click **Enter Store** on any store card. The mentor should become active and post exactly one contextual message in Turkish, e.g.:  
   "Bu mağaza için konuşabilirim. İstersen önce hedefini netleştirelim; sonra birlikte ilerleriz."  
   No automatic tasks should be created.

5. **Profile button**  
   Click **Profile** on a store card. A placeholder modal should open (e.g. "Placeholder. Profile content will be added in a later gate."). Close it with the button.

6. **No background jobs, no browsing**  
   Confirm there are no automatic tasks, no BrowserView/content loading until you leave the dashboard (e.g. by navigating to a session in a later gate). Hot reload should work when changing front-end code.
