// firebase.js
// 專門管 Firebase 初始化，其他檔案只要 import auth 就好

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// 你的專案設定
const firebaseConfig = {
  apiKey: "AIzaSyCFk0JLo3sAfd1ZCMJ7hb6Sm1MpWmjPpJ0",
  authDomain: "telos-77f73.firebaseapp.com",
  projectId: "telos-77f73",
  storageBucket: "telos-77f73.firebasestorage.app",
  messagingSenderId: "1044293157158",
  appId: "1:1044293157158:web:c8afab30025d01fe0e41e7",
  measurementId: "G-EWYGTL47MV",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };
