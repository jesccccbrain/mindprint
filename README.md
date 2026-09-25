# MindPrint

A pymetrics-style self-discovery site: 8 short behavioural games that build a profile of 9 traits and suggest work that tends to fit.

| Game | What it looks at |
|---|---|
| 🎈 Balloon Pump | Risk tolerance |
| 🤝 Money Exchange | Trust |
| 🔢 Number Memory | Working memory |
| 🚦 Stop & Go | Self-control, focus & speed |
| 🗼 Tower Builder | Planning |
| 🎭 Read the Room | Emotional insight |
| ⚡ Tap Challenge | Drive / effort |
| ⏳ Now or Later | Patience |

Plain HTML/CSS/JS — no build step, no server, no database. Results are saved in the visitor's own browser.

## Put it on GitHub Pages (free)

1. Create a new **public** repository on GitHub, e.g. `mindprint`.
2. Click **Add file → Upload files**, drag in `index.html`, `style.css`, `app.js` (and this README), then **Commit changes**.
3. Go to **Settings → Pages**. Under *Build and deployment*, set **Source: Deploy from a branch**, **Branch: `main`**, folder **`/ (root)`**, then **Save**.
4. Wait about a minute. Your site will be live at `https://<your-username>.github.io/mindprint/`.

To update: edit or re-upload the files and commit — Pages redeploys automatically.

## Customise

- **Currency:** change `const CUR = '$'` at the top of `app.js` (e.g. `'RM'`).
- **Trait descriptions / role ideas:** edit the `TRAITS` list in `app.js`.
- **Games:** each game is one object in the `GAMES` list with `steps` (instructions) and a `run()` function that returns `scores`.

## Note

This is for self-reflection and fun. It is not a validated psychometric test and shouldn't be used for hiring decisions.
