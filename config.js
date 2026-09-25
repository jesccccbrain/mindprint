/* MindPrint settings — the only file you need to edit to turn on the online database.
   Leave `firebase: null` to keep everything on each device (no admin page).
   See README.md → "Set up the online database". */
window.MINDPRINT_CONFIG = {
  // 1) Paste the firebaseConfig object from Firebase (Project settings → Your apps → Web app) here:
  firebase: null,
  // e.g.
  // firebase: {
  //   apiKey: "AIza...",
  //   authDomain: "mindprint-xxxx.firebaseapp.com",
  //   projectId: "mindprint-xxxx",
  //   storageBucket: "mindprint-xxxx.firebasestorage.app",
  //   messagingSenderId: "1234567890",
  //   appId: "1:1234567890:web:abc123"
  // },

  // 2) Paste YOUR admin account's User UID (Firebase → Authentication → Users) here:
  adminUid: "",
};
