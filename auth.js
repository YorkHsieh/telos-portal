import { auth } from "./firebase.js";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

export function initAuthUI() {
  console.log("Auth module loaded.");

  // 元件
  const loginBtn = document.getElementById("btn-login");
  const logoutBtn = document.getElementById("btn-logout");
  const editProfileBtn = document.getElementById("btn-edit-profile");
  const userStatus = document.getElementById("user-status");

  const authModal = document.getElementById("auth-modal-backdrop");
  const authClose = document.getElementById("auth-modal-close");
  const authForm = document.getElementById("auth-form");
  const authTitle = document.getElementById("auth-modal-title");
  const authSubmit = document.getElementById("auth-submit");
  const authError = document.getElementById("auth-error");

  const emailInput = document.getElementById("auth-email");
  const passInput = document.getElementById("auth-password");
  const nameInput = document.getElementById("auth-display-name");

  const switchToSignup = document.getElementById("auth-switch-to-signup");
  const switchToLogin = document.getElementById("auth-switch-to-login");
  const signupExtra = document.getElementById("signup-extra");

  let mode = "login";

  // ====== Modal ======
  function openModal(type = "login") {
    mode = type;
    authModal.classList.remove("hidden");
    authError.textContent = "";
    authForm.reset();

    if (type === "login") {
      authTitle.textContent = "登入 Telos";
      signupExtra.classList.add("hidden");
      switchToSignup.classList.remove("hidden");
      switchToLogin.classList.add("hidden");
      authSubmit.textContent = "登入";
    } else {
      authTitle.textContent = "註冊帳號";
      signupExtra.classList.remove("hidden");
      switchToSignup.classList.add("hidden");
      switchToLogin.classList.remove("hidden");
      authSubmit.textContent = "註冊";
    }
  }

  function closeModal() {
    authModal.classList.add("hidden");
    authModal.style.display = "none";  // 強制關閉
  }

  loginBtn?.addEventListener("click", () => openModal("login"));
  authClose?.addEventListener("click", closeModal);

  authModal?.addEventListener("click", (e) => {
    if (e.target === authModal) closeModal();
  });

  switchToSignup?.addEventListener("click", () => openModal("signup"));
  switchToLogin?.addEventListener("click", () => openModal("login"));

  // ====== UI 狀態 ======
  function updateUI(user) {
    if (!user) {
      userStatus.textContent = "目前為遊客模式";
      loginBtn.classList.remove("hidden");
      logoutBtn.classList.add("hidden");
      editProfileBtn.classList.add("hidden");
      return;
    }

    const name = user.displayName || user.email;
    userStatus.textContent = `已登入：${name}`;

    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    editProfileBtn.classList.remove("hidden");
  }

  onAuthStateChanged(auth, (user) => {
    updateUI(user);
    if (user) closeModal();
  });

  // ====== 登出 ======
  logoutBtn?.addEventListener("click", () => signOut(auth));

  // ====== 表單提交 ======
  authForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const pass = passInput.value.trim();
    const displayName = nameInput?.value.trim();

    authError.textContent = "";
    authSubmit.disabled = true;

    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, pass);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        if (displayName) {
          await updateProfile(cred.user, { displayName });
        }
      }
    } catch (err) {
      authError.textContent = "錯誤：" + err.code;
    }

    authSubmit.disabled = false;
  });
}
