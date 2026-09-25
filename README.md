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

Plain HTML/CSS/JS — no build step. Profiles are PIN-protected and saved in the visitor's browser — no server needed.

## Put it on GitHub Pages (free)

1. Create a new **public** repository on GitHub, e.g. `mindprint`.
2. Click **Add file → Upload files**, drag in `index.html`, `style.css`, `app.js` (and this README), then **Commit changes**.
3. Go to **Settings → Pages**. Under *Build and deployment*, set **Source: Deploy from a branch**, **Branch: `main`**, folder **`/ (root)`**, then **Save**.
4. Wait about a minute. Your site will be live at `https://<your-username>.github.io/mindprint/`.

To update: edit or re-upload the files and commit — Pages redeploys automatically.

## Private profiles

- **New profile:** name + 4–6 digit PIN. Names must be unique (not case-sensitive); a new profile always starts empty.
- **Log in:** name + PIN. You only ever see your own profile — there is no list of other people.
- **Log out** from the top bar or the results page. Closing the tab also logs you out.
- **Delete my profile** on the results page removes it permanently.

Profiles are stored in the browser on that device (no server). So a profile made on your phone won't appear on
your laptop, and name uniqueness is checked per device. PINs are stored hashed, which keeps profiles private from
other people using the site, but it isn't bank-grade security. A forgotten PIN can't be recovered.

## Customise

- **Currency:** change `const CUR = '$'` at the top of `app.js` (e.g. `'RM'`).
- **Trait descriptions / role ideas:** edit the `TRAITS` list in `app.js`.
- **Games:** each game is one object in the `GAMES` list with `steps` (instructions) and a `run()` function that returns `scores`.

## Note

This is for self-reflection and fun. It is not a validated psychometric test and shouldn't be used for hiring decisions.
