// telos-auth.js — 登入 / 註冊 UI + Firebase Auth + 建立 / 修補 Firestore 使用者文件（含 Telos ID）

import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ================== Telos ID 產生器 ==================

function generateTelosIdFromUid(uid) {
  // 簡單：T + UID 前 7 碼（大寫）
  return "T" + (uid || "").slice(0, 7).toUpperCase();
}

/**
 * 確保 Firestore 裡有 users/{uid} 文件，沒有就建立，
 * 有但沒 telosId 就補上，順便更新基本資料。
 */
async function ensureUserDoc(user, extra = {}) {
  if (!user) return;

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  const base = {
    email: user.email || "",
    name: user.displayName || "",
    gender: "",
    bio: "",
    avatarDataUrl: "",
    friends: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (!snap.exists()) {
    // 全新使用者：直接建一筆，順便給 Telos ID
    const telosId = generateTelosIdFromUid(user.uid);
    await setDoc(userRef, {
      ...base,
      telosId,
      ...extra,
    });
    console.log("[Auth] Firestore user doc created, telosId =", telosId);
  } else {
    // 已存在：只更新必要欄位 & 補 telosId
    const data = snap.data() || {};
    const updatePayload = {
      updatedAt: serverTimestamp(),
      ...extra,
    };

    if (!data.telosId) {
      updatePayload.telosId = generateTelosIdFromUid(user.uid);
    }

    // 如果 Firestore 內 name / email 是空的，可以用現在的覆蓋
    if (!data.name && user.displayName) {
      updatePayload.name = user.displayName;
    }
    if (!data.email && user.email) {
      updatePayload.email = user.email;
    }

    if (Object.keys(updatePayload).length > 1) {
      // 至少有 updatedAt + 其他東西才真的 update
      await updateDoc(userRef, updatePayload);
      console.log("[Auth] Firestore user doc updated");
    } else {
      console.log("[Auth] Firestore user doc already ok");
    }
  }
}

// ================== 主進入點 ==================

export function initAuthUI() {
  console.log("[Auth] initAuthUI() 進來了");

  // ===== 頂部帳號區 =====
  const btnLogin = document.getElementById("btn-login");
  const btnLogout = document.getElementById("btn-logout");
  const userStatus = document.getElementById("user-status");
  const btnEditProfile = document.getElementById("btn-edit-profile");

  // ===== Auth Modal 元件 =====
  const authModalBackdrop = document.getElementById("auth-modal-backdrop");
  const authModal = document.getElementById("auth-modal");
  const authModalClose = document.getElementById("auth-modal-close");
  const authModalTitle = document.getElementById("auth-modal-title");

  const authForm = document.getElementById("auth-form");
  const authEmail = document.getElementById("auth-email");
  const authPassword = document.getElementById("auth-password");
  const authDisplayName = document.getElementById("auth-display-name");
  const signupExtra = document.getElementById("signup-extra");
  const authSubmit = document.getElementById("auth-submit");
  const authError = document.getElementById("auth-error");
  const switchToSignup = document.getElementById("auth-switch-to-signup");
  const switchToLogin = document.getElementById("auth-switch-to-login");

  // 防呆：DOM 沒載好就不要動
  if (
    !btnLogin ||
    !btnLogout ||
    !userStatus ||
    !authModalBackdrop ||
    !authModal ||
    !authModalTitle ||
    !authForm ||
    !authEmail ||
    !authPassword ||
    !authSubmit ||
    !authError ||
    !switchToSignup ||
    !switchToLogin
  ) {
    console.warn("[Auth] DOM not ready, skip initAuthUI");
    return;
  }

  // 關掉瀏覽器預設驗證
  authForm.setAttribute("novalidate", "true");

  let mode = "login"; // "login" 或 "signup"

  // ===== 打開 / 關閉 Modal =====
  function openAuthModal(nextMode = "login") {
    mode = nextMode;
    authError.textContent = "";

    console.log("[Auth] openAuthModal mode =", mode);

    if (mode === "login") {
      authModalTitle.textContent = "登入 Telos";
      authSubmit.textContent = "登入";
      signupExtra?.classList.add("hidden");
      switchToSignup.classList.remove("hidden");
      switchToLogin.classList.add("hidden");
    } else {
      authModalTitle.textContent = "建立 Telos 帳號";
      authSubmit.textContent = "註冊";
      signupExtra?.classList.remove("hidden");
      switchToSignup.classList.add("hidden");
      switchToLogin.classList.remove("hidden");
    }

    authModalBackdrop.classList.remove("hidden");
    authModalBackdrop.style.display = "flex";
  }

  function closeAuthModal() {
    console.log("[Auth] closeAuthModal()");
    authModalBackdrop.classList.add("hidden");
    authModalBackdrop.style.display = "none";
  }

  // ===== 頂部按鈕行為 =====
  btnLogin.addEventListener("click", () => openAuthModal("login"));

  btnLogout.addEventListener("click", async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("登出失敗：", err);
    }
  });

  authModalClose?.addEventListener("click", closeAuthModal);
  authModalBackdrop.addEventListener("click", (e) => {
    if (e.target === authModalBackdrop) closeAuthModal();
  });

  switchToSignup.addEventListener("click", () => openAuthModal("signup"));
  switchToLogin.addEventListener("click", () => openAuthModal("login"));

  // ===== 表單送出（登入 / 註冊） =====
  authForm.addEventListener("submit", async (e) => {
    console.log("[Auth] form submit event 觸發");
    e.preventDefault();
    authError.textContent = "";

    const email = authEmail.value.trim();
    const password = authPassword.value;
    const displayName = authDisplayName ? authDisplayName.value.trim() : "";

    if (!email || !password) {
      authError.textContent = "請輸入 Email 與密碼。";
      return;
    }

    authSubmit.disabled = true;
    console.log("[Auth] mode =", mode, "email =", email);

    try {
      if (mode === "login") {
        // ===== 登入 =====
        const cred = await signInWithEmailAndPassword(auth, email, password);
        console.log("[Auth] login success, uid =", cred.user.uid);

        // ⭐ 登入時也順便確保 Firestore user doc + Telos ID 存在
        await ensureUserDoc(cred.user);

        closeAuthModal();
      } else {
        // ===== 註冊 =====
        const cred = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        console.log("[Auth] signup success, uid =", cred.user.uid);

        if (displayName) {
          await updateProfile(cred.user, { displayName });
        }

        // ⭐ 新註冊的一定建立 / 補好 Firestore user doc + Telos ID
        await ensureUserDoc(cred.user, {
          name: displayName || cred.user.displayName || "",
        });

        closeAuthModal();
      }
    } catch (err) {
      console.error("Auth error:", err);
      let msg = "發生錯誤，請稍後再試。";

      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password"
      ) {
        msg = "帳號或密碼錯誤。";
      } else if (err.code === "auth/user-not-found") {
        msg = "找不到這個帳號。";
      } else if (err.code === "auth/email-already-in-use") {
        msg = "這個 Email 已經註冊過了。";
      } else if (err.code === "auth/weak-password") {
        msg = "密碼至少 6 碼。";
      }

      authError.textContent = msg;
    } finally {
      authSubmit.disabled = false;
    }

    return false;
  });

  // ===== 快速修改暱稱 → 直接打開 Profile Modal =====
  btnEditProfile?.addEventListener("click", () => {
    const ev = new Event("open-profile");
    document.dispatchEvent(ev);
  });

  // ===== 監聽登入狀態，更新 UI =====
  onAuthStateChanged(auth, async (user) => {
    console.log("[Auth] onAuthStateChanged, user =", user?.uid || "null");

    if (!user) {
      btnLogin.classList.remove("hidden");
      btnLogout.classList.add("hidden");
      btnEditProfile?.classList.add("hidden");
      userStatus.textContent =
        "目前為遊客模式。登入之後可以聊天、管理個人資料，之後也可以接電子郵件。";
      return;
    }

    // 保險：只要偵測到登入，就再確保 user doc & Telos ID 好好的
    await ensureUserDoc(user);

    btnLogin.classList.add("hidden");
    btnLogout.classList.remove("hidden");
    btnEditProfile?.classList.remove("hidden");

    const name = user.displayName || user.email || "使用者";
    userStatus.textContent = `Hi，${name}，歡迎回到 Telos。`;
  });
}
