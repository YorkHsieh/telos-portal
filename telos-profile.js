// telos-profile.js — 個人資料 + 好友系統（用 Telos ID 或 Email 加好友）

import { auth, db } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where,
  arrayUnion,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { updateProfile } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

export function initProfile() {
  console.log("Profile module init");

  const backdrop = document.getElementById("profile-modal-backdrop");
  const modal = document.getElementById("profile-modal");
  const closeBtn = document.getElementById("profile-modal-close");

  const form = document.getElementById("profile-form");
  const nameInput = document.getElementById("profile-name");
  const genderSelect = document.getElementById("profile-gender");
  const avatarInput = document.getElementById("profile-avatar");
  const avatarPreview = document.getElementById("profile-avatar-preview");
  const bioInput = document.getElementById("profile-bio");
  const saveBtn = document.getElementById("profile-save-btn");
  const status = document.getElementById("profile-status");

  const friendIdInput = document.getElementById("friend-email"); // 這個 input 你可以把 label 改成「Telos ID 或 Email」
  const friendAddBtn = document.getElementById("friend-add-btn");
  const friendError = document.getElementById("friend-error");
  const friendsList = document.getElementById("friends-list");

  const userIdSpan = document.getElementById("profile-userid"); // 如果 HTML 有這個就會顯示 Telos ID

  if (
    !backdrop ||
    !modal ||
    !form ||
    !nameInput ||
    !genderSelect ||
    !avatarInput ||
    !avatarPreview ||
    !bioInput ||
    !saveBtn ||
    !friendsList
  ) {
    console.warn("Profile DOM not ready.");
    return;
  }

  let currentAvatarDataUrl = "";

  // ===== 開 / 關 modal =====
  function openProfileModal() {
    const user = auth.currentUser;
    if (!user) {
      alert("請先登入後再編輯個人資料。");
      return;
    }
    backdrop.classList.remove("hidden");
    backdrop.style.display = "flex";
    status.textContent = "";
    if (friendError) friendError.textContent = "";
    loadUserProfile(user);
  }

  function closeProfileModal() {
    backdrop.classList.add("hidden");
    backdrop.style.display = "none";
  }

  // tools 模組會發這個事件
  document.addEventListener("open-profile", openProfileModal);
  closeBtn?.addEventListener("click", closeProfileModal);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeProfileModal();
  });

  // ===== 產生 Telos ID（第一次用、或舊帳號沒 userId 時用） =====
  function generateTelosId(uid) {
    // 簡單一點：uid 前 6 碼 + 隨機三位數
    const head = uid.slice(0, 6).toUpperCase();
    const rand = Math.floor(100 + Math.random() * 900); // 100–999
    return `${head}${rand}`;
  }

  // ===== 載入 Firestore 裡的 user profile =====
  async function loadUserProfile(user) {
    try {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      let data;
      if (snap.exists()) {
        data = snap.data();
        // 如果舊資料還沒有 userId，就補一個
        if (!data.userId) {
          const newId = generateTelosId(user.uid);
          await updateDoc(userRef, {
            userId: newId,
            updatedAt: serverTimestamp(),
          });
          data.userId = newId;
        }
      } else {
        // 第一次登入，先塞一份基本資料
        const newId = generateTelosId(user.uid);
        data = {
          email: user.email || "",
          name: user.displayName || "",
          gender: "",
          bio: "",
          avatarDataUrl: "",
          friends: [],
          userId: newId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(userRef, data);
      }

      nameInput.value = data.name || user.displayName || "";
      genderSelect.value = data.gender || "";
      bioInput.value = data.bio || "";
      currentAvatarDataUrl = data.avatarDataUrl || "";
      if (currentAvatarDataUrl) {
        avatarPreview.src = currentAvatarDataUrl;
      } else {
        avatarPreview.removeAttribute("src");
      }

      if (userIdSpan) {
        userIdSpan.textContent = data.userId || "(尚未產生)";
      }

      renderFriends(data.friends || []);
    } catch (err) {
      console.error(err);
      status.textContent = "載入個人資料失敗。";
    }
  }

  function renderFriends(friends) {
    friendsList.innerHTML = "";
    if (!friends || friends.length === 0) {
      const li = document.createElement("li");
      li.textContent = "目前還沒有好友。可以用 Telos ID 或 Email 加好友。";
      friendsList.appendChild(li);
      return;
    }

    friends.forEach((f) => {
      const li = document.createElement("li");

      const nameSpan = document.createElement("span");
      nameSpan.className = "friend-name";
      nameSpan.textContent = f.name || f.email || "(無名稱)";

      const idSpan = document.createElement("span");
      idSpan.className = "friend-id";
      idSpan.textContent = f.userId ? `ID: ${f.userId}` : "";

      const emailSpan = document.createElement("span");
      emailSpan.className = "friend-email";
      emailSpan.textContent = f.email || "";

      li.appendChild(nameSpan);
      if (f.userId) li.appendChild(idSpan);
      if (f.email) li.appendChild(emailSpan);
      friendsList.appendChild(li);
    });
  }

  // ===== 頭貼：讀檔 + 預覽（存 base64 到 Firestore） =====
  avatarInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("頭貼檔案太大，請小於 2MB。");
      avatarInput.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      currentAvatarDataUrl = reader.result;
      avatarPreview.src = currentAvatarDataUrl;
    };
    reader.readAsDataURL(file);
  });

  // ===== 儲存個人資料 =====
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      alert("請先登入。");
      return;
    }

    const name = nameInput.value.trim();
    const gender = genderSelect.value;
    const bio = bioInput.value.trim();

    if (!name) {
      alert("顯示名稱不能是空白。");
      return;
    }

    status.textContent = "儲存中…";
    saveBtn.disabled = true;

    try {
      // 更新 Firebase Auth 的 displayName
      await updateProfile(user, { displayName: name });

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        name,
        gender,
        bio,
        avatarDataUrl: currentAvatarDataUrl || "",
        updatedAt: serverTimestamp(),
      });

      status.textContent = "已儲存。";
    } catch (err) {
      console.error(err);
      status.textContent = "儲存失敗。";
    } finally {
      saveBtn.disabled = false;
    }
  });

  // ===== 好友功能：用 Telos ID 或 Email 加好友 =====
  friendAddBtn?.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("請先登入。");
      return;
    }

    if (!friendIdInput) return;
    const input = friendIdInput.value.trim();
    if (friendError) friendError.textContent = "";

    if (!input) {
      if (friendError) friendError.textContent = "請輸入對方的 Telos ID 或 Email。";
      return;
    }

    // 不要加自己
    if (input === (user.email || "")) {
      if (friendError) friendError.textContent = "不能加自己當好友啦。";
      return;
    }

    try {
      const usersRef = collection(db, "users");
      let q;

      // 粗暴判斷：有 @ 就當 Email，用 Email 找；沒有就當 userId 找
      if (input.includes("@")) {
        q = query(usersRef, where("email", "==", input));
      } else {
        q = query(usersRef, where("userId", "==", input));
      }

      const snap = await getDocs(q);
      if (snap.empty) {
        if (friendError) friendError.textContent = "找不到這個使用者。請確認 Telos ID / Email 是否正確。";
        return;
      }

      const friendDoc = snap.docs[0];
      const friendData = friendDoc.data();

      // 防止用 ID 找到自己
      if (friendDoc.id === user.uid) {
        if (friendError) friendError.textContent = "不能加自己當好友啦。";
        return;
      }

      const myRef = doc(db, "users", user.uid);
      const friendRef = doc(db, "users", friendDoc.id);

      const myDisplayName =
        nameInput.value.trim() ||
        user.displayName ||
        user.email ||
        "使用者";

      const mySnap = await getDoc(myRef);
      const myData = mySnap.exists() ? mySnap.data() : {};

      // 互相加好友
      await updateDoc(myRef, {
        friends: arrayUnion({
          uid: friendDoc.id,
          email: friendData.email || "",
          name: friendData.name || friendData.displayName || friendData.email || "(未命名)",
          userId: friendData.userId || "",
        }),
        updatedAt: serverTimestamp(),
      });

      await updateDoc(friendRef, {
        friends: arrayUnion({
          uid: user.uid,
          email: user.email || "",
          name: myDisplayName,
          userId: myData.userId || "",
        }),
        updatedAt: serverTimestamp(),
      });

      friendIdInput.value = "";
      if (friendError) friendError.textContent = "";
      status.textContent = "已加入好友。";

      // 重新載入好友列表
      await loadUserProfile(user);
    } catch (err) {
      console.error(err);
      if (friendError) friendError.textContent = "加好友失敗，稍後再試。";
    }
  });
}
