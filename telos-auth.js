// telos-auth.js — 登入 / 註冊 Modal + Firebase Auth

import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

export function initAuthUI() {
  const loginBtn = document.getElementById("btn-login");
  const logoutBtn = document.getElementById("btn-logout");

  const modalBackdrop = document.getElementById("auth-modal-backdrop");
  const modal = document.getElementById("auth-modal");
  const closeBtn = document.getElementById("auth-modal-close");
  const title = document.getElementById("auth-modal-title");

  const emailInput = document.getElementById("auth-email");
  const passwordInput = document.getElementById("auth-password");
  const displayNameInput = document.getElementById("auth-display-name");

  const signupExtra = document.getElementById("signup-extra");
  const errorMsg = document.getElementById("auth-error");
  const submitBtn = document.getElementById("auth-submit");

  const switchSignup = document.getElementById("auth-switch-to-signup");
  const switchLogin = document.getElementById("auth-switch-to-login");

  let mode = "login";

  function openModal() {
    modalBackdrop.classList.remove("hidden");
    modalBackdrop.style.display = "flex";
    errorMsg.textContent = "";
  }

  function closeModal() {
    modalBackdrop.classList.add("hidden");
    modalBackdrop.style.display = "none";
  }

  loginBtn?.addEventListener("click", openModal);
  closeBtn?.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) closeModal();
  });

  switchSignup.addEventListener("click", () => {
    mode = "signup";
    title.textContent = "建立帳號";
    signupExtra.classList.remove("hidden");
    switchSignup.classList.add("hidden");
    switchLogin.classList.remove("hidden");
    submitBtn.textContent = "註冊";
  });

  switchLogin.addEventListener("click", () => {
    mode = "login";
    title.textContent = "登入 Telos";
    signupExtra.classList.add("hidden");
    switchSignup.classList.remove("hidden");
    switchLogin.classList.add("hidden");
    submitBtn.textContent = "登入";
  });

  submitBtn.addEventListener("submit", (e) => e.preventDefault());

  // 登入 / 註冊提交
  submitBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const displayName = displayNameInput.value.trim();

    errorMsg.textContent = "";

    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
        closeModal();
        return;
      }

      const cred = await createUserWithEmailAndPassword(auth, email, password);

      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }

      await setDoc(doc(db, "users", cred.user.uid), {
        email,
        name: displayName || "",
        gender: "",
        bio: "",
        avatarDataUrl: "",
        friends: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      closeModal();
    } catch (err) {
      errorMsg.textContent = err.message;
    }
  });

  logoutBtn?.addEventListener("click", async () => {
    await signOut(auth);
  });

  // login/logout UI 更新
  onAuthStateChanged(auth, (user) => {
    if (user) {
      loginBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
      return;
    }
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
  });
}
