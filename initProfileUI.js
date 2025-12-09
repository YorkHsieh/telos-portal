import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

export function initProfileUI() {
  const telosIdEl = document.getElementById("my-telos-id");

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      if (telosIdEl) telosIdEl.textContent = "(請先登入)";
      return;
    }

    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) {
      if (telosIdEl) telosIdEl.textContent = "(尚未建立資料)";
      return;
    }

    const data = snap.data();
    if (telosIdEl) {
      telosIdEl.textContent = data.telosId || "(尚未分配)";
    }
  });
}
