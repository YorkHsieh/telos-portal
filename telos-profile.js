// telos-profile.js — Telos Profile 2.0（Account Center 完善版：穩定開關/登入防呆/即時預覽/表單提交）

import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  doc,
  getDoc,
  updateDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  arrayUnion,
  arrayRemove,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";


export function initProfileUI() {
  console.log("[Profile] initProfileUI 啟動");

  // ===== HTML 元件 =====
  const profileModalBackdrop = document.getElementById("profile-modal-backdrop");
  const profileClose = document.getElementById("profile-modal-close");

  const profileForm = document.getElementById("profile-form");
  const telosIdEl = document.getElementById("profile-userid");
  const nameInput = document.getElementById("profile-name");
  const genderSelect = document.getElementById("profile-gender");
  const avatarInput = document.getElementById("profile-avatar");
  const avatarPreview = document.getElementById("profile-avatar-preview");
  const bioTextarea = document.getElementById("profile-bio");
  const statusEl = document.getElementById("profile-status");
  const saveBtn = document.getElementById("profile-save-btn");

  const friendInput = document.getElementById("friend-id");
  const friendAddBtn = document.getElementById("friend-add-btn");
  const friendError = document.getElementById("friend-error");
  const friendsList = document.getElementById("friends-list");

  const postText = document.getElementById("post-text");
  const postSubmitBtn = document.getElementById("post-submit-btn");
  const postError = document.getElementById("post-error");
  const postsList = document.getElementById("posts-list");

  const friendModalBackdrop = document.getElementById("friend-modal-backdrop");
  const friendModalClose = document.getElementById("friend-modal-close");
  const friendModalName = document.getElementById("friend-modal-name");
  const friendModalAvatar = document.getElementById("friend-modal-avatar");
  const friendModalId = document.getElementById("friend-modal-id");
  const friendModalEmail = document.getElementById("friend-modal-email");
  const friendModalStatus = document.getElementById("friend-modal-status");
  const friendModalBio = document.getElementById("friend-modal-bio");

  if (!profileModalBackdrop || !telosIdEl || !profileForm) {
    console.error("[Profile] 缺少必要 DOM：profile-modal-backdrop / profile-userid / profile-form");
    return;
  }

  let currentUser = null;
  let userData = null;

  // 小快取：避免 renderFriendList 每次都狂查
  const userCacheByTelosId = new Map();

  // ===== Modal 開關 =====
  function openProfileModal() {
    profileModalBackdrop.classList.remove("hidden");
    profileModalBackdrop.style.display = "flex";
  }
  function closeProfileModal() {
    profileModalBackdrop.classList.add("hidden");
    profileModalBackdrop.style.display = "none";
  }

  profileClose?.addEventListener("click", closeProfileModal);
  profileModalBackdrop.addEventListener("click", (e) => {
    if (e.target === profileModalBackdrop) closeProfileModal();
  });

  // ESC 關閉（帳號中心跟好友 modal 都能關）
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!profileModalBackdrop.classList.contains("hidden")) closeProfileModal();
    if (friendModalBackdrop && !friendModalBackdrop.classList.contains("hidden")) closeFriendModal();
  });

  // 接收 open-profile（tools-panel / auth 會 dispatch）
  document.addEventListener("open-profile", () => {
    openProfileModal();
  });

  // ===== 好友 Modal 開關 =====
  function openFriendModal() {
    if (!friendModalBackdrop) return;
    friendModalBackdrop.classList.remove("hidden");
    friendModalBackdrop.style.display = "flex";
  }
  function closeFriendModal() {
    if (!friendModalBackdrop) return;
    friendModalBackdrop.classList.add("hidden");
    friendModalBackdrop.style.display = "none";
  }
  friendModalClose?.addEventListener("click", closeFriendModal);
  friendModalBackdrop?.addEventListener("click", (e) => {
    if (e.target === friendModalBackdrop) closeFriendModal();
  });

  // ===== UI 鎖定（未登入禁用）=====
  function setAccountEnabled(enabled) {
    const dis = !enabled;
    nameInput && (nameInput.disabled = dis);
    genderSelect && (genderSelect.disabled = dis);
    avatarInput && (avatarInput.disabled = dis);
    bioTextarea && (bioTextarea.disabled = dis);
    saveBtn && (saveBtn.disabled = dis);

    friendInput && (friendInput.disabled = dis);
    friendAddBtn && (friendAddBtn.disabled = dis);

    postText && (postText.disabled = dis);
    postSubmitBtn && (postSubmitBtn.disabled = dis);
  }

  // ===== 頭貼即時預覽 =====
  avatarInput?.addEventListener("change", () => {
    const file = avatarInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (avatarPreview) avatarPreview.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });

  // ===== 讀取使用者資料（集中管理）=====
  async function loadUserDoc(uid) {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() || null;
  }

  function resetUIForLoggedOut() {
    telosIdEl.textContent = "（請先登入）";
    if (nameInput) nameInput.value = "";
    if (genderSelect) genderSelect.value = "";
    if (bioTextarea) bioTextarea.value = "";
    if (avatarPreview) avatarPreview.src = "";
    friendsList && (friendsList.innerHTML = "");
    postsList && (postsList.innerHTML = "");
    statusEl && (statusEl.textContent = "");
    friendError && (friendError.textContent = "");
    postError && (postError.textContent = "");
  }

  // ===== 監聽登入 =====
  onAuthStateChanged(auth, async (user) => {
    currentUser = user || null;

    if (!currentUser) {
      userData = null;
      userCacheByTelosId.clear();
      setAccountEnabled(false);
      resetUIForLoggedOut();
      return;
    }

    setAccountEnabled(true);

    try {
      userData = await loadUserDoc(currentUser.uid);

      if (!userData) {
        telosIdEl.textContent = "（尚未建立資料）";
        return;
      }
          // ✅【補齊資料結構：只貼在這裡】
    userData.following = userData.following || [];
    userData.followers = userData.followers || [];
    userData.telosId = userData.telosId || "";
    telosIdEl.textContent = userData.telosId;
    renderFriendList();
    renderPosts();
  }catch (err) {
  console.error("[Profile] load user failed:", err);
}
});

      // 填 UI
      telosIdEl.textContent = userData.telosId || "（尚未分配）";
      if (nameInput) nameInput.value = userData.name || currentUser.displayName || currentUser.email || "";
      if (genderSelect) genderSelect.value = userData.gender || "";
      if (bioTextarea) bioTextarea.value = userData.bio || "";
      if (avatarPreview) avatarPreview.src = userData.avatarDataUrl || "";

      renderFriendList();
      renderPosts();

  // ===== 儲存個人資料（用 form submit 更穩）=====
  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser || !userData) return;

    statusEl.textContent = "儲存中…";

    try {
      let avatarDataUrl = userData.avatarDataUrl || "";

      // 如果有選新頭貼，取預覽的 src（已經是 dataURL）
      if (avatarPreview?.src) {
        avatarDataUrl = avatarPreview.src;
      }

      const ref = doc(db, "users", currentUser.uid);
      await updateDoc(ref, {
        name: (nameInput?.value || "").trim(),
        gender: genderSelect?.value || "",
        bio: (bioTextarea?.value || "").trim(),
        avatarDataUrl,
        updatedAt: serverTimestamp(),
      });

      // 重新抓一次，確保 UI/快取一致
      userData = await loadUserDoc(currentUser.uid);

      statusEl.textContent = "已儲存！";
      setTimeout(() => (statusEl.textContent = ""), 1200);

      // 也順便刷新好友/貼文（避免你改名後好友清單仍顯示舊名）
      userCacheByTelosId.clear();
      await renderFriendList();
      renderPosts();
    } catch (err) {
      console.error("[Profile] save error:", err);
      statusEl.textContent = "儲存失敗";
      setTimeout(() => (statusEl.textContent = ""), 1500);
    }
  });

  // ===== 好友列表 =====
  async function fetchUserByTelosId(telosId) {
    if (userCacheByTelosId.has(telosId)) return userCacheByTelosId.get(telosId);

    const usersRef = collection(db, "users");
    const qSnap = await getDocs(query(usersRef, where("telosId", "==", telosId)));
    if (qSnap.empty) return null;

    const data = qSnap.docs[0].data() || null;
    userCacheByTelosId.set(telosId, data);
    return data;
  }

async function renderFriendList() {
  if (!friendsList) return;
  friendsList.innerHTML = "";

  const followingUids = userData?.following || [];

  if (followingUids.length === 0) {
    const li = document.createElement("li");
    li.textContent = "目前還沒有追蹤任何人。";
    friendsList.appendChild(li);
    return;
  }

  for (const uid of followingUids) {
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (!snap.exists()) continue;

      const data = snap.data();

      const li = document.createElement("li");
      li.classList.add("friend-item");

      li.innerHTML = `
        <img class="friend-avatar" src="${data.avatarDataUrl || ""}" alt="avatar" />
        <div class="friend-info">
          <div class="friend-name">${data.name || data.telosId || "使用者"}</div>
          <div class="friend-email">${data.email || ""}</div>
        </div>
      `;

      li.addEventListener("click", () => showFriendModal(data));
      friendsList.appendChild(li);
    } catch (e) {
      console.warn("[Profile] renderFriendList getDoc failed:", e);
    }
  }
}

  // ===== 好友資料 Modal =====

  function showFriendModal(data) {
    if (!friendModalName) return;
    friendModalName.textContent = data.name || data.telosId || "好友資料";
    if (friendModalAvatar) friendModalAvatar.src = data.avatarDataUrl || "";
    if (friendModalId) friendModalId.textContent = data.telosId || "";
    if (friendModalEmail) friendModalEmail.textContent = data.email || "";
    if (friendModalStatus) friendModalStatus.textContent =
  `追蹤中 ${data.following?.length || 0} · 粉絲 ${data.followers?.length || 0}`;

    if (friendModalBio) friendModalBio.textContent = data.bio || "";
    openFriendModal();
  }

  // ===== 加好友（你剛修好的雙向版：這裡先不動）=====
friendAddBtn.addEventListener("click", async () => {
  friendError.textContent = "";

  if (!currentUser) {
    friendError.textContent = "請先登入。";
    return;
  }

  const inputTelosId = friendInput.value.trim().toUpperCase();
  if (!inputTelosId) {
    friendError.textContent = "請輸入 Telos ID。";
    return;
  }

  if (inputTelosId === (userData?.telosId || "")) {
    friendError.textContent = "不能追蹤自己。";
    return;
  }

  // 先用 Telos ID 找到對方 uid
  const usersRef = collection(db, "users");
  const qSnap = await getDocs(query(usersRef, where("telosId", "==", inputTelosId)));

  if (qSnap.empty) {
    friendError.textContent = "找不到此 Telos ID。";
    return;
  }

  const targetDoc = qSnap.docs[0];
  const targetUid = targetDoc.id;

  const myRef = doc(db, "users", currentUser.uid);
  const targetRef = doc(db, "users", targetUid);

  const isFollowing = (userData?.following || []).includes(targetUid);

  try {
    if (isFollowing) {
      // ===== 取消追蹤：我 following 移除對方uid / 對方 followers 移除我uid =====
      await Promise.all([
        updateDoc(myRef, { following: arrayRemove(targetUid), updatedAt: serverTimestamp() }),
        updateDoc(targetRef, { followers: arrayRemove(currentUser.uid), updatedAt: serverTimestamp() }),
      ]);

      // 本地同步（不重抓也能更新 UI）
      userData.following = (userData.following || []).filter((u) => u !== targetUid);
    } else {
      // ===== 追蹤：我 following 加對方uid / 對方 followers 加我uid =====
      await Promise.all([
        updateDoc(myRef, { following: arrayUnion(targetUid), updatedAt: serverTimestamp() }),
        updateDoc(targetRef, { followers: arrayUnion(currentUser.uid), updatedAt: serverTimestamp() }),
      ]);

      userData.following = [...(userData.following || []), targetUid];
    }

    friendInput.value = "";
    renderFriendList();
  } catch (err) {
    console.error("[Profile] follow/unfollow failed:", err);
    friendError.textContent = "操作失敗，稍後再試。";
  }
});


  // ===== 貼文牆（你目前是存 users/{uid}.posts array：先維持不改結構）=====
  function renderPosts() {
    if (!postsList) return;
    postsList.innerHTML = "";
    const posts = userData?.posts || [];

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

  postSubmitBtn?.addEventListener("click", async () => {
    postError.textContent = "";
    if (!currentUser || !userData) {
      postError.textContent = "請先登入。";
      return;
    }

    const text = (postText?.value || "").trim();
    if (!text) {
      postError.textContent = "請輸入內容。";
      return;
    }

    try {
      const ref = doc(db, "users", currentUser.uid);
      const newPost = {
        text,
        createdAt: new Date().toLocaleString(),
      };
      const posts = [...(userData.posts || []), newPost];

      await updateDoc(ref, { posts, updatedAt: serverTimestamp() });

      userData = await loadUserDoc(currentUser.uid);
      postText.value = "";
      renderPosts();
    } catch (err) {
      console.error("發貼文失敗：", err);
      postError.textContent = "發布失敗，稍後再試。";
    }
  });
}
// ===== 帳號中心分頁切換 =====
document.querySelectorAll(".account-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;

    document.querySelectorAll(".account-tab").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".account-panel").forEach(p => p.classList.remove("active"));

    btn.classList.add("active");
    document.querySelector(`.account-panel[data-panel="${tab}"]`)?.classList.add("active");
  });
});
