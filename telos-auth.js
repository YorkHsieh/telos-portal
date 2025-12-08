// telos-profile.js — 個人資料 + Telos ID + 好友 + 貼文牆 + 好友個頁

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
  addDoc,
  orderBy,
  limit,
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

  const postText = document.getElementById("post-text");
  const postSubmitBtn = document.getElementById("post-submit-btn");
  const postError = document.getElementById("post-error");
  const postsList = document.getElementById("posts-list");

  // 好友個頁 modal
  const friendModalBackdrop = document.getElementById("friend-modal-backdrop");
  const friendModalClose = document.getElementById("friend-modal-close");
  const friendModalName = document.getElementById("friend-modal-name");
  const friendModalAvatar = document.getElementById("friend-modal-avatar");
  const friendModalId = document.getElementById("friend-modal-id");
  const friendModalEmail = document.getElementById("friend-modal-email");
  const friendModalStatus = document.getElementById("friend-modal-status");
  const friendModalBio = document.getElementById("friend-modal-bio");

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
    !friendsList ||
    !friendIdInput ||
    !friendAddBtn ||
    !postText ||
    !postSubmitBtn ||
    !postsList
  ) {
    console.warn("Profile DOM not ready.");
    return;
  }

  let currentAvatarDataUrl = "";
  let currentTelosId = "";

  // ===== Telos ID helper =====
  function generateTelosIdFromUid(uid) {
    const clean = uid.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    return "T" + clean.slice(0, 8);
  }

  // ===== 開 / 關 個人頁 modal =====
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
    postError.textContent = "";
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

  // ===== 好友個頁 modal =====
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

  async function loadFriendProfile(friendUid) {
    try {
      const friendRef = doc(db, "users", friendUid);
      const snap = await getDoc(friendRef);
      if (!snap.exists()) return;

      const data = snap.data();
      friendModalName.textContent = data.name || data.email || "好友";
      if (data.avatarDataUrl) {
        friendModalAvatar.src = data.avatarDataUrl;
      } else {
        friendModalAvatar.removeAttribute("src");
      }
      friendModalId.textContent = data.telosId
        ? `Telos ID：${data.telosId}`
        : "Telos ID：未設定";
      friendModalEmail.textContent = data.email
        ? `Email：${data.email}`
        : "";
      // 狀態
      let statusText = "狀態：離線";
      if (data.online) {
        statusText = "狀態：在線上";
      } else if (data.lastActiveAt && data.lastActiveAt.toDate) {
        const last = data.lastActiveAt.toDate();
        const diffMin = (Date.now() - last.getTime()) / 60000;
        if (diffMin < 10) {
          statusText = "狀態：剛剛來過";
        } else if (diffMin < 60) {
          statusText = `狀態：約 ${Math.round(diffMin)} 分鐘前在線`;
        } else {
          statusText = "狀態：離線";
        }
      }
      friendModalStatus.textContent = statusText;

      friendModalBio.textContent = data.bio
        ? `簡介：${data.bio}`
        : "尚未填寫簡介。";

      openFriendModal();
    } catch (err) {
      console.error("載入好友個頁失敗：", err);
    }
  }

  // ===== 載入自己的 profile =====
  async function loadUserProfile(user) {
    try {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      let data;
      if (snap.exists()) {
        data = snap.data();
      } else {
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

      // Telos ID：如果沒有，就產生一個
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
      await loadMyPosts(user);
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
      li.dataset.uid = f.uid || "";
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

      // 點好友 → 開啟好友個頁
      if (f.uid) {
        li.addEventListener("click", () => {
          loadFriendProfile(f.uid);
        });
      }

      friendsList.appendChild(li);
    });
  }

  // ===== 頭貼：讀檔 + 預覽 =====
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
      const qSnap = await getDocs(
        query(usersRef, where("telosId", "==", input))
      );

      if (qSnap.empty) {
        friendError.textContent = "找不到這個 Telos ID。";
        return;
      }

      const friendDoc = qSnap.docs[0];
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

      // 互相加好友
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

      await loadUserProfile(user);
    } catch (err) {
      console.error("加好友失敗：", err);
      friendError.textContent = "加好友失敗，稍後再試。";
    }
  });

  // ===== 貼文牆：載入自己的貼文 =====
  async function loadMyPosts(user) {
    try {
      const postsRef = collection(db, "users", user.uid, "posts");
      const qSnap = await getDocs(
        query(postsRef, orderBy("createdAt", "desc"), limit(20))
      );

      postsList.innerHTML = "";
      if (qSnap.empty) {
        const li = document.createElement("li");
        li.textContent = "目前還沒有貼文。";
        postsList.appendChild(li);
        return;
      }

      qSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const li = document.createElement("li");

        const meta = document.createElement("div");
        meta.className = "post-meta";
        if (data.createdAt && data.createdAt.toDate) {
          const d = data.createdAt.toDate();
          meta.textContent = d.toLocaleString();
        } else {
          meta.textContent = "";
        }

        const text = document.createElement("div");
        text.className = "post-text";
        text.textContent = data.text || "";

        li.appendChild(meta);
        li.appendChild(text);
        postsList.appendChild(li);
      });
    } catch (err) {
      console.error("載入貼文牆失敗：", err);
    }
  }

  // ===== 發布貼文 =====
  postSubmitBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("請先登入。");
      return;
    }

    const text = postText.value.trim();
    postError.textContent = "";

    if (!text) {
      postError.textContent = "貼文內容不能是空白。";
      return;
    }

    if (text.length > 500) {
      postError.textContent = "貼文太長了，先控制在 500 字以內。";
      return;
    }

    try {
      const postsRef = collection(db, "users", user.uid, "posts");
      await addDoc(postsRef, {
        text,
        createdAt: serverTimestamp(),
      });
      postText.value = "";
      await loadMyPosts(user);
    } catch (err) {
      console.error("發布貼文失敗：", err);
      postError.textContent = "發布貼文失敗，稍後再試。";
    }
  });
}
