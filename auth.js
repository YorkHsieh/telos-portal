// auth.js
import { auth } from "./firebase.js";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

export function initAuthUI() {
  console.log("Auth module init");

  const loginBtn = document.getElementById("btn-login");
  const logoutBtn = document.getElementById("btn-logout");
  const editProfileBtn = document.getElementById("btn-edit-profile");
  const userStatus = document.getElementById("user-status");

  const modalBackdrop = document.getElementById("auth-modal-backdrop");
  const modalClose = document.getElementById("auth-modal-close");
  const modalTitle = document.getElementById("auth-modal-title");
  const authForm = document.getElementById("auth-form");
  const authEmail = document.getElementById("auth-email");
  const authPassword = document.getElementById("auth-password");
  const authDisplayName = document.getElementById("auth-display-name");
  const signupExtra = document.getElementById("signup-extra");
  const authSubmit = document.getElementById("auth-submit");
  const authError = document.getElementById("auth-error");
  const switchToSignup = document.getElementById("auth-switch-to-signup");
  const switchToLogin = document.getElementById("auth-switch-to-login");

  let mode = "login"; // login | signup

  // ===== Modal 開關 =====
  function openModal(m = "login") {
    mode = m;
    modalBackdrop.classList.remove("hidden");
    modalBackdrop.style.display = "flex";
    authError.textContent = "";
    authForm.reset();

    if (mode === "login") {
      modalTitle.textContent = "登入 Telos";
      authSubmit.textContent = "登入";
      signupExtra.classList.add("hidden");
      switchToSignup.classList.remove("hidden");
      switchToLogin.classList.add("hidden");
    } else {
      modalTitle.textContent = "註冊 Telos 帳號";
      authSubmit.textContent = "註冊";
      signupExtra.classList.remove("hidden");
      switchToSignup.classList.add("hidden");
      switchToLogin.classList.remove("hidden");
    }
  }

  function closeModal() {
    modalBackdrop.classList.add("hidden");
    modalBackdrop.style.display = "none";
  }

  loginBtn?.addEventListener("click", () => openModal("login"));
  modalClose?.addEventListener("click", closeModal);
  modalBackdrop?.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) closeModal();
  });
  switchToSignup?.addEventListener("click", () => openModal("signup"));
  switchToLogin?.addEventListener("click", () => openModal("login"));

  // ===== Auth 狀態 UI =====
  function updateAuthUI(user) {
    if (!user) {
      userStatus.textContent = "目前為遊客模式。登入後可使用更多功能。";
      loginBtn?.classList.remove("hidden");
      logoutBtn?.classList.add("hidden");
      editProfileBtn?.classList.add("hidden");
      return;
    }
    const name = user.displayName || user.email || "已登入使用者";
    userStatus.textContent = `已登入：${name}`;
    loginBtn?.classList.add("hidden");
    logoutBtn?.classList.remove("hidden");
    editProfileBtn?.classList.remove("hidden");
  }

  onAuthStateChanged(auth, (user) => {
    console.log("Auth state:", user?.email || "未登入");
    updateAuthUI(user);
    if (user) closeModal();
  });

  // ===== 登出 =====
  logoutBtn?.addEventListener("click", async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
      alert("登出失敗，稍後再試。");
    }
  });

  // ===== 表單提交（登入 / 註冊） =====
  authForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = authEmail.value.trim();
    const password = authPassword.value.trim();
    const displayName =
      authDisplayName && authDisplayName.value.trim()
        ? authDisplayName.value.trim()
        : null;

    authError.textContent = "";
    authSubmit.disabled = true;
    authSubmit.textContent = mode === "login" ? "登入中…" : "註冊中…";

    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        if (displayName) {
          await updateProfile(cred.user, { displayName });
        }
      }
    } catch (err) {
      console.error(err);
      authError.textContent = translateAuthError(err.code);
    } finally {
      authSubmit.disabled = false;
      authSubmit.textContent = mode === "login" ? "登入" : "註冊";
    }
  });

  function translateAuthError(code) {
    switch (code) {
      case "auth/email-already-in-use":
        return "這個 email 已被註冊。";
      case "auth/invalid-email":
        return "電子郵件格式錯誤。";
      case "auth/weak-password":
        return "密碼太弱（至少 6 碼）。";
      case "auth/user-not-found":
      case "auth/wrong-password":
        return "帳號或密碼錯誤。";
      default:
        return "登入 / 註冊失敗：" + (code || "未知錯誤");
    }
  }
}
