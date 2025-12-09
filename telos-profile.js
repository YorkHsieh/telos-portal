// telos-profile.js — 控制「個人資料」Modal，包含顯示 Telos ID

import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

export function initProfileUI() {
  console.log("[Profile] initProfileUI 進來了");

  const telosIdEl = document.getElementById("profile-telos-id");
  const displayNameInput = document.getElementById("profile-display-name");
  const genderSelect = document.getElementById("profile-gender");
  const bioTextarea = document.getElementById("profile-bio");

  if (!telosIdEl) {
    console.warn("[Profile] 找不到 #profile-telos-id，跳過 initProfileUI");
    return;
  }

  // 監聽登入狀態，一旦登入就抓 Firestore 的資料
  onAuthStateChanged(auth, async (user) => {
    console.log("[Profile] onAuthStateChanged user =", user?.uid || "null");

    if (!user) {
      telosIdEl.textContent = "（請先登入）";
      if (displayNameInput) displayNameInput.value = "";
      if (genderSelect) genderSelect.value = "";
      if (bioTextarea) bioTextarea.value = "";
      return;
    }

    try {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        // 理論上不會，telos-auth 那邊已經保證會建
        console.warn("[Profile] user doc 不存在");
        telosIdEl.textContent = "（尚未建立資料）";
        return;
      }

      const data = snap.data() || {};
      const telosId = data.telosId || "（尚未分配）";

      telosIdEl.textContent = telosId;

      if (displayNameInput) {
        displayNameInput.value =
          data.name || user.displayName || user.email || "";
      }
      if (genderSelect && data.gender !== undefined) {
        genderSelect.value = data.gender || "";
      }
      if (bioTextarea) {
        bioTextarea.value = data.bio || "";
      }
    } catch (err) {
      console.error("[Profile] 載入個人資料失敗：", err);
      telosIdEl.textContent = "（載入失敗）";
    }
  });

  // 如果你有「open-profile」事件（telos-auth.js 有 dispatch 那個），
  // 可以在這裡順便處理 Modal 顯示，但這段照你原本的就好。
  document.addEventListener("open-profile", () => {
    console.log("[Profile] 收到 open-profile 事件，可以在這裡打開 Modal");
    // 例：
    // const profileModal = document.getElementById("profile-modal");
    // profileModal.classList.remove("hidden");
  });
}
