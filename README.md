# MindPrint

A pymetrics-style self-discovery site: 8 short behavioural games that build a profile of 9 traits and suggest work that tends to fit.

| Game | What it looks at |
|---|---|
| 🎈 Balloon Pump | Risk tolerance |
| 🤝 Money Exchange | Trust |
| 🔢 Number Memory | Working memory |
| 🚦 Stop & Go | Self-control, focus & speed |
| 🗼 Tower Builder | Planning |
| 🎭 Read the Room | Emotional insight (12 random situations from a pool of 66, no repeats until all are seen) |
| ⚡ Tap Challenge | Drive / effort |
| ⏳ Now or Later | Patience |

Plain HTML/CSS/JS — no build step. Profiles are PIN-protected. Results are stored online in a free Firebase database (or on the device until you set that up).

## Put it on GitHub Pages (free)

1. Create a new **public** repository on GitHub, e.g. `mindprint`.
2. Click **Add file → Upload files**, drag in all the files (`index.html`, `style.css`, `app.js`, `config.js`, `firestore.rules`, `README.md`), then **Commit changes**.
3. Go to **Settings → Pages**. Under *Build and deployment*, set **Source: Deploy from a branch**, **Branch: `main`**, folder **`/ (root)`**, then **Save**.
4. Wait about a minute. Your site will be live at `https://<your-username>.github.io/mindprint/`.

To update: edit or re-upload the files and commit — Pages redeploys automatically.

## How profiles work

- **New profile:** name + 4–6 digit PIN. Names are unique (not case-sensitive). A new profile always starts empty.
- **Log in:** name + PIN. Participants only ever see their own profile.
- **Each game can be played once.** After that its result is locked. Nobody can change or delete it through the website — not the participant, and not the admin.
- **Log out** from the top bar or results page. Closing the tab also logs out.

## Set up the online database (free, ~15 minutes)

Without this, profiles are stored only on each device and there is no admin page.
With it, every result is saved online, names are unique across all devices, and you get a view-only
**admin page** listing every participant.

**A. Create the Firebase project**
1. Go to **console.firebase.google.com** and sign in with your Google account.
2. **Create a project** → name it `mindprint` → you can turn **off** Google Analytics → **Create project**.

**B. Turn on logins**
3. Left menu **Build → Authentication → Get started**.
4. **Sign-in method** tab → **Email/Password** → switch on **Email/Password** (first switch only) → **Save**.
5. **Settings** tab → **Authorized domains** → **Add domain** → `jesccccbrain.github.io` → Add.
6. **Users** tab → **Add user** → type *your* email and a strong password → **Add user**.
   This is your admin login. **Copy the long “User UID”** shown next to it — you need it twice below.

**C. Create the database**
7. Left menu **Build → Firestore Database → Create database**.
8. Location: **asia-southeast1 (Singapore)** → Next → **Start in production mode** → **Create**.
9. Open the **Rules** tab. Delete everything there and paste the whole of `firestore.rules`.
   Replace `PASTE_ADMIN_UID_HERE` with your User UID (keep the quote marks) → **Publish**.

**D. Connect the website**
10. Click the ⚙️ gear (top left) → **Project settings** → scroll to **Your apps** → click the **`</>`** (Web) icon.
    Nickname `mindprint` → **Register app** (no hosting needed).
11. You'll see `const firebaseConfig = { apiKey: ..., ... };`. Copy the part from `{` to `}`.
12. In GitHub open `config.js` → ✏️ edit:
    - replace `firebase: null,` with `firebase: { ...what you copied... },`
    - paste your User UID between the quotes in `adminUid: ""`
    - **Commit changes**.

**E. Use it**
- Participants: `https://jesccccbrain.github.io/mindprint/`
- You (admin): `https://jesccccbrain.github.io/mindprint/#admin` → log in with the email/password from step 6.
  You can search participants, open any profile, and **Export CSV** for Excel. The admin page is view-only.

Notes
- The Firebase free plan (Spark) allows 50,000 reads and 20,000 writes a day — plenty for this site.
- The `apiKey` in `config.js` is meant to be public; security comes from the rules in step 9.
- Profiles made before you connected the database stay only on the device they were made on.
- If a participant forgets their PIN, they can't log in again, but you can still see their results on the admin page.
- As the Firebase project owner you *could* still edit data by hand in the Firebase console. The website itself never can.

## Customise

- **Currency:** change `const CUR = '$'` at the top of `app.js` (e.g. `'RM'`).
- **Trait descriptions / role ideas:** edit the `TRAITS` list in `app.js`.
- **Games:** each game is one object in the `GAMES` list with `steps` (instructions) and a `run()` function that returns `scores`.

## Note

This is for self-reflection and fun. It is not a validated psychometric test and shouldn't be used for hiring decisions.
