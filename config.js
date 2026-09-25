/* MindPrint settings — the only file you need to edit to turn on the online database.
   Leave `firebase: null` to keep everything on each device (no admin page).
   See README.md → "Set up the online database". */
window.MINDPRINT_CONFIG = {
  // 1) Paste the firebaseConfig object from Firebase (Project settings → Your apps → Web app) here:
  firebase: {
  apiKey: "AIzaSyBgMZz_aeltAMQTbVAsG15jGA7pflJyybE",
  authDomain: "mindprint-53975.firebaseapp.com",
  projectId: "mindprint-53975",
  storageBucket: "mindprint-53975.firebasestorage.app",
  messagingSenderId: "856997144592",
  appId: "1:856997144592:web:2b30df50ad000b004d8295"
},
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
  adminUid: "0F8JbCd7Eda2irgaVzVfbRP0jMh1",
};
