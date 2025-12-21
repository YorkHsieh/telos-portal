// telos-profile.js — Telos Profile 2.0（完全匹配 index.html）

import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

export function initProfileUI() {
  console.log("[Profile] initProfileUI 啟動");

  // ===== 取得所有 HTML 元件 =====
  const profileModalBackdrop = document.getElementById("profile-modal-backdrop");
  const profileModal = document.getElementById("profile-modal");
  const profileClose = document.getElementById("profile-modal-close");

  const telosIdEl = document.getElementById("profile-userid");
  const nameInput = document.getElementById("profile-name");
  const genderSelect = document.getElementById("profile-gender");
  const avatarInput = document.getElementById("profile-avatar");
  const avatarPreview = document.getElementById("profile-avatar-preview");
  const bioTextarea = document.getElementById("profile-bio");

  const saveBtn = document.getElementById("profile-save-btn");
  const statusEl = document.getElementById("profile-status");

  const friendInput = document.getElementById("friend-id");
  const friendAddBtn = document.getElementById("friend-add-btn");
  const friendError = document.getElementById("friend-error");
  const friendsList = document.getElementById("friends-list");

  const postText = document.getElementById("post-text");
  const postSubmitBtn = document.getElementById("post-submit-btn");
  const postError = document.getElementById("post-error");
  const postsList = document.getElementById("posts-list");

  const friendModalBackdrop = document.getElementById("friend-modal-backdrop");
  const friendModal = document.getElementById("friend-modal");
  const friendModalClose = document.getElementById("friend-modal-close");

  const friendModalName = document.getElementById("friend-modal-name");
  const friendModalAvatar = document.getElementById("friend-modal-avatar");
  const friendModalId = document.getElementById("friend-modal-id");
  const friendModalEmail = document.getElementById("friend-modal-email");
  const friendModalStatus = document.getElementById("friend-modal-status");
  const friendModalBio = document.getElementById("friend-modal-bio");

  if (!telosIdEl) {
    console.error("[Profile] index.html 與 JS 不匹配：找不到 profile-userid");
    return;
  }

  let currentUser = null;
  let userData = null;

  // ===== 工具：打開 / 關閉 Modal =====
  function openProfileModal() {
    profileModalBackdrop.classList.remove("hidden");
    profileModalBackdrop.style.display = "flex";
  }

  function closeProfileModal() {
    profileModalBackdrop.classList.add("hidden");
    profileModalBackdrop.style.display = "none";
  }

  profileClose?.addEventListener("click", closeProfileModal);
  profileModalBackdrop?.addEventListener("click", (e) => {
    if (e.target === profileModalBackdrop) closeProfileModal();
  });

  // 打開好友資料 modal
  function openFriendModal() {
    friendModalBackdrop.classList.remove("hidden");
    friendModalBackdrop.style.display = "flex";
  }

  function closeFriendModal() {
    friendModalBackdrop.classList.add("hidden");
    friendModalBackdrop.style.display = "none";
  }

  friendModalClose?.addEventListener("click", closeFriendModal);
  friendModalBackdrop?.addEventListener("click", (e) => {
    if (e.target === friendModalBackdrop) closeFriendModal();
  });

  // ===== 接收 open-profile 事件（從 tools-panel / auth 呼叫）=====
  document.addEventListener("open-profile", () => {
    openProfileModal();
  });

  // ===== 監聽登入狀態 =====
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    if (!user) {
      telosIdEl.textContent = "（請先登入）";
      nameInput.value = "";
      genderSelect.value = "";
      bioTextarea.value = "";
      avatarPreview.src = "";
      friendsList.innerHTML = "";
      postsList.innerHTML = "";
      return;
    }

    // 讀取 Firestore 資料
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      console.warn("[Profile] Firestore user doc 不存在");
      telosIdEl.textContent = "（尚未建立資料）";
      return;
    }

    userData = snap.data() || {};

    // ===== 填入資料 =====
    telosIdEl.textContent = userData.telosId || "（尚未分配）";
    nameInput.value =
      userData.name || user.displayName || user.email || "";
    genderSelect.value = userData.gender || "";
    bioTextarea.value = userData.bio || "";

    if (userData.avatarDataUrl) {
      avatarPreview.src = userData.avatarDataUrl;
    }

    // ===== 好友列表 =====
    renderFriendList();

    // ===== 貼文 =====
    renderPosts();
  });

  // ===== 儲存個人資料 =====
  saveBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    statusEl.textContent = "儲存中…";

    let avatarDataUrl = userData.avatarDataUrl || "";

    // 如果選了頭貼
    const file = avatarInput.files?.[0];
    if (file) {
      const reader = new FileReader();
      avatarDataUrl = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    }

    const ref = doc(db, "users", currentUser.uid);

    await updateDoc(ref, {
      name: nameInput.value.trim(),
      gender: genderSelect.value,
      bio: bioTextarea.value.trim(),
      avatarDataUrl,
      updatedAt: serverTimestamp(),
    });

    statusEl.textContent = "已儲存！";
    setTimeout(() => (statusEl.textContent = ""), 1500);
  });

  // ===== 好友系統 =====
  async function renderFriendList() {
    friendsList.innerHTML = "";

    const friendIds = userData.friends || [];
    if (friendIds.length === 0) {
      const li = document.createElement("li");
      li.textContent = "目前還沒有好友。";
      friendsList.appendChild(li);
      return;
    }

    for (const telosId of friendIds) {
      const usersRef = collection(db, "users");
      const qSnap = await getDocs(query(usersRef, where("telosId", "==", telosId)));

      if (qSnap.empty) continue;

      const docSnap = qSnap.docs[0];
      const data = docSnap.data();

      const li = document.createElement("li");
      li.innerHTML = `
        <span class="friend-name">${data.name || data.telosId}</span>
        <span class="friend-email">${data.email || ""}</span>
      `;

      li.addEventListener("click", () => showFriendModal(data));

      friendsList.appendChild(li);
    }
  }

  function showFriendModal(data) {
    friendModalName.textContent = data.name || data.telosId;
    friendModalAvatar.src = data.avatarDataUrl || "";
    friendModalId.textContent = data.telosId;
    friendModalEmail.textContent = data.email || "";
    friendModalStatus.textContent = "";
    friendModalBio.textContent = data.bio || "";

    openFriendModal();
  }

friendAddBtn.addEventListener("click", async () => {
  friendError.textContent = "";

  if (!currentUser || !userData) {
    friendError.textContent = "請先登入。";
    return;
  }

  const targetTelosId = friendInput.value.trim().toUpperCase();
  if (!targetTelosId) {
    friendError.textContent = "請輸入 Telos ID。";
    return;
  }

  if (targetTelosId === userData.telosId) {
    friendError.textContent = "不能加自己。";
    return;
  }

  try {
    // 1. 找對方
    const usersRef = collection(db, "users");
    const qSnap = await getDocs(
      query(usersRef, where("telosId", "==", targetTelosId))
    );

    if (qSnap.empty) {
      friendError.textContent = "找不到此 Telos ID。";
      return;
    }

    const targetDoc = qSnap.docs[0];
    const targetUid = targetDoc.id;

    // 2. 重新抓最新資料（不要信 userData）
    const myRef = doc(db, "users", currentUser.uid);
    const targetRef = doc(db, "users", targetUid);

    const [mySnap, targetSnap] = await Promise.all([
      getDoc(myRef),
      getDoc(targetRef),
    ]);

    if (!mySnap.exists() || !targetSnap.exists()) {
      friendError.textContent = "使用者資料異常，請重試。";
      return;
    }

    const myFriends = mySnap.data().friends || [];
    const targetFriends = targetSnap.data().friends || [];

    // 3. 防止重複
    if (myFriends.includes(targetTelosId)) {
      friendError.textContent = "你們已經是好友了。";
      return;
    }

    // 4. 雙向加入
    await Promise.all([
      updateDoc(myRef, {
        friends: [...myFriends, targetTelosId],
        updatedAt: serverTimestamp(),
      }),
      updateDoc(targetRef, {
        friends: [...targetFriends, userData.telosId],
        updatedAt: serverTimestamp(),
      }),
    ]);

    // 5. 更新本地狀態 + UI
    userData.friends = [...myFriends, targetTelosId];
    friendInput.value = "";
    renderFriendList();
  } catch (err) {
    console.error("加好友失敗：", err);
    friendError.textContent = "加好友失敗，請稍後再試。";
  }
});


  // ===== 貼文牆 =====
  function renderPosts() {
    postsList.innerHTML = "";
    const posts = userData.posts || [];

    if (posts.length === 0) {
      const li = document.createElement("li");
      li.textContent = "目前沒有貼文。";
      postsList.appendChild(li);
      return;
    }

    posts.forEach((p) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="post-meta">${p.createdAt || ""}</div>
        <div class="post-text">${p.text || ""}</div>
      `;
      postsList.appendChild(li);
    });
  }

  postSubmitBtn.addEventListener("click", async () => {
    postError.textContent = "";
    const text = postText.value.trim();

    if (!text) {
      postError.textContent = "請輸入內容。";
      return;
    }
    if (!currentUser) {
      postError.textContent = "請先登入。";
      return;
    }

    const ref = doc(db, "users", currentUser.uid);
    const newPost = {
      text,
      createdAt: new Date().toLocaleString(),
    };

    const posts = [...(userData.posts || []), newPost];

    await updateDoc(ref, {
      posts,
      updatedAt: serverTimestamp(),
    });

    userData.posts = posts;
    postText.value = "";
    renderPosts();
  });
}
