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

Plain HTML/CSS/JS — no build step. Profiles are saved in the visitor's browser; optional emailing uses a free Google Apps Script.

## Put it on GitHub Pages (free)

1. Create a new **public** repository on GitHub, e.g. `mindprint`.
2. Click **Add file → Upload files**, drag in `index.html`, `style.css`, `app.js` (plus this README and `google-apps-script.gs`), then **Commit changes**.
3. Go to **Settings → Pages**. Under *Build and deployment*, set **Source: Deploy from a branch**, **Branch: `main`**, folder **`/ (root)`**, then **Save**.
4. Wait about a minute. Your site will be live at `https://<your-username>.github.io/mindprint/`.

To update: edit or re-upload the files and commit — Pages redeploys automatically.

## Participants

Each new person enters their name (and optionally email) on the home page and gets a fresh profile.
Earlier profiles stay listed under **Profiles on this device** (Continue / Delete). The results page has
**Finish & next person** to hand the device to someone else.

## Email results (free, via your Gmail)

Without setup, **Send report** opens the participant's own email app with the report pre-filled.
To send a nicely formatted email automatically **and** collect everyone's results in a Google Sheet:

1. Go to sheets.google.com and create a blank sheet named `MindPrint results`.
2. In the sheet: **Extensions → Apps Script**. Delete the sample code, paste in all of `google-apps-script.gs`, click 💾 Save.
3. In the function dropdown at the top pick **testEmail**, click **Run**, and approve the permissions
   (Google shows "unverified app" → **Advanced → Go to project (unsafe)** → **Allow** — it's your own script).
   You should get a sample email and a new row in the sheet.
4. **Deploy → New deployment** → gear icon → **Web app**. Set *Execute as*: **Me**, *Who has access*: **Anyone**. Click **Deploy** and copy the **Web app URL** (ends in `/exec`).
5. In GitHub, open `app.js` → ✏️ edit → find `const EMAIL_ENDPOINT = '';` and paste the URL between the quotes → **Commit changes**.

Limits: Gmail accounts can send about 100 emails/day this way. Each address gets at most 3 reports per hour.
If you later edit the script, use **Deploy → Manage deployments → ✏️ → Version: New version** so the URL stays the same.

## Customise

- **Currency:** change `const CUR = '$'` at the top of `app.js` (e.g. `'RM'`).
- **Trait descriptions / role ideas:** edit the `TRAITS` list in `app.js`.
- **Games:** each game is one object in the `GAMES` list with `steps` (instructions) and a `run()` function that returns `scores`.

## Note

This is for self-reflection and fun. It is not a validated psychometric test and shouldn't be used for hiring decisions.
