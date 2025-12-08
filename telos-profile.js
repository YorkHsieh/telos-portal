// telos-profile.js — 個人資料 + 好友系統（Telos ID 版）

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
  const idDisplay = document.getElementById("profile-id");
  const nameInput = document.getElementById("profile-name");
  const genderSelect = document.getElementById("profile-gender");
  const avatarInput = document.getElementById("profile-avatar");
  const avatarPreview = document.getElementById("profile-avatar-preview");
  const bioInput = document.getElementById("profile-bio");
  const saveBtn = document.getElementById("profile-save-btn");
  const status = document.getElementById("profile-status");

  const friendIdInput = document.getElementById("friend-id");
  const friendAddBtn = document.getElementById("friend-add-btn");
  const friendError = document.getElementById("friend-error");
  const friendsList = document.getElementById("friends-list");

  if (
    !backdrop ||
    !modal ||
    !form ||
    !idDisplay ||
    !nameInput ||
    !genderSelect ||
    !avatarInput ||
    !avatarPreview ||
    !bioInput ||
    !saveBtn ||
    !friendIdInput ||
    !friendAddBtn ||
    !friendsList
  ) {
    console.warn("Profile DOM not ready.");
    return;
  }

  let currentAvatarDataUrl = "";
  let currentTelosId = "";

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
    friendError.textContent = "";
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

  // ===== 產生 Telos ID（用 uid 做 deterministic ID）=====
  function generateTelosIdFromUid(uid) {
    // 去掉奇怪字元，只留英數，截 8 碼，再加 T 前綴
    const clean = uid.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    return "T" + clean.slice(0, 8);
  }

  // ===== 載入 Firestore 裡的 user profile =====
  async function loadUserProfile(user) {
    try {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      let data;
      if (snap.exists()) {
        data = snap.data();
      } else {
        // 第一次登入，先塞一份基本資料
        data = {
          email: user.email || "",
          name: user.displayName || "",
          gender: "",
          bio: "",
          avatarDataUrl: "",
          friends: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(userRef, data, { merge: true });
      }

      // Telos ID：如果沒有，就用 uid 生成一個後存回去
      let telosId = data.telosId;
      if (!telosId) {
        telosId = generateTelosIdFromUid(user.uid);
        await setDoc(
          userRef,
          { telosId, updatedAt: serverTimestamp() },
          { merge: true }
        );
      }
      currentTelosId = telosId;
      idDisplay.textContent = telosId;

      nameInput.value = data.name || user.displayName || "";
      genderSelect.value = data.gender || "";
      bioInput.value = data.bio || "";

      currentAvatarDataUrl = data.avatarDataUrl || "";
      if (currentAvatarDataUrl) {
        avatarPreview.src = currentAvatarDataUrl;
      } else {
        avatarPreview.removeAttribute("src");
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
      li.textContent = "目前還沒有好友。可以用 Telos ID 加好友。";
      friendsList.appendChild(li);
      return;
    }

    friends.forEach((f) => {
      const li = document.createElement("li");

      const nameSpan = document.createElement("span");
      nameSpan.className = "friend-name";
      nameSpan.textContent = f.name || f.email || "(無名稱)";

      const emailSpan = document.createElement("span");
      emailSpan.className = "friend-email";
      const parts = [];
      if (f.telosId) parts.push(f.telosId);
      if (f.email) parts.push(f.email);
      emailSpan.textContent = parts.join(" · ");

      li.appendChild(nameSpan);
      li.appendChild(emailSpan);
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
      await setDoc(
        userRef,
        {
          email: user.email || "",
          telosId: currentTelosId || generateTelosIdFromUid(user.uid),
          name,
          gender,
          bio,
          avatarDataUrl: currentAvatarDataUrl || "",
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      status.textContent = "已儲存。";
    } catch (err) {
      console.error("儲存 profile 失敗：", err);
      status.textContent = "儲存失敗。";
    } finally {
      saveBtn.disabled = false;
    }
  });

  // ===== 好友功能：用 Telos ID 加好友 =====
  friendAddBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("請先登入。");
      return;
    }

    const input = friendIdInput.value.trim().toUpperCase();
    friendError.textContent = "";

    if (!input) {
      friendError.textContent = "請輸入對方的 Telos ID。";
      return;
    }

    if (input === currentTelosId) {
      friendError.textContent = "不能加自己當好友啦。";
      return;
    }

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("telosId", "==", input));
      const snap = await getDocs(q);

      if (snap.empty) {
        friendError.textContent = "找不到這個 Telos ID。";
        return;
      }

      const friendDoc = snap.docs[0];
      const friendData = friendDoc.data();
      const friendRef = doc(db, "users", friendDoc.id);
      const myRef = doc(db, "users", user.uid);

      const myDisplayName =
        nameInput.value.trim() ||
        user.displayName ||
        user.email ||
        "使用者";

      const myTelosId =
        currentTelosId || generateTelosIdFromUid(user.uid);

      const friendTelosId =
        friendData.telosId || generateTelosIdFromUid(friendDoc.id);

      // 互相加到好友清單（簡單版：arrayUnion）
      await updateDoc(myRef, {
        friends: arrayUnion({
          uid: friendDoc.id,
          email: friendData.email || "",
          name: friendData.name || friendData.displayName || friendData.email || input,
          telosId: friendTelosId,
        }),
        updatedAt: serverTimestamp(),
      });

      await updateDoc(friendRef, {
        friends: arrayUnion({
          uid: user.uid,
          email: user.email || "",
          name: myDisplayName,
          telosId: myTelosId,
        }),
        updatedAt: serverTimestamp(),
      });

      friendIdInput.value = "";
      friendError.textContent = "";
      status.textContent = "已加入好友。";

      // 重新載入好友列表
      await loadUserProfile(user);
    } catch (err) {
      console.error("加好友失敗：", err);
      friendError.textContent = "加好友失敗，稍後再試。";
    }
  });
}
