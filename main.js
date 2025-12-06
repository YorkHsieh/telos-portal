// Firebase CDN modular imports（版本會更新，這裡用文件上的範例寫法）
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// ================= Firebase 初始化 =================

const firebaseConfig = {
  apiKey: "AIzaSyCFk0JLo3sAfd1ZCMJ7hb6Sm1MpWmjPpJ0",
  authDomain: "telos-77f73.firebaseapp.com",
  projectId: "telos-77f73",
  storageBucket: "telos-77f73.firebasestorage.app",
  messagingSenderId: "1044293157158",
  appId: "1:1044293157158:web:c8afab30025d01fe0e41e7",
  measurementId: "G-EWYGTL47MV",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ================= DOM Ready =================

document.addEventListener("DOMContentLoaded", () => {
  const splash = document.getElementById("splash");
  const appMain = document.getElementById("app-main");

  // 開場動畫結束 → 顯示主內容
  setTimeout(() => {
    if (splash) {
      splash.classList.add("hidden");
    }
    if (appMain) {
      appMain.classList.add("ready");
    }
  }, 2300);

  const toolsButton = document.getElementById("tools-button");
  const toolsPanel = document.getElementById("tools-panel");
  const chatFloat = document.getElementById("chat-float");
  const chatClose = document.getElementById("chat-close");
  const toolItems = document.querySelectorAll(".tool-item[data-tool]");

  const loginBtn = document.getElementById("btn-login");
  const logoutBtn = document.getElementById("btn-logout");
  const userStatus = document.getElementById("user-status");
  const editProfileBtn = document.getElementById("btn-edit-profile");

  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatMessages = document.getElementById("chat-messages");

  // Auth Modal 元件
  const authModalBackdrop = document.getElementById("auth-modal-backdrop");
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

  let authMode = "login"; // "login" | "signup"

  // ================= 工具按鈕 / 面板 =================

  if (toolsButton && toolsPanel) {
    toolsButton.addEventListener("click", (e) => {
      e.stopPropagation();
      toolsPanel.classList.toggle("open");
    });

    toolsPanel.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    document.addEventListener("click", () => {
      toolsPanel.classList.remove("open");
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      toolsPanel?.classList.remove("open");
      chatFloat?.classList.remove("open");
      closeAuthModal();
    }
  });

  // ================= Auth UI 狀態 =================

  function updateAuthUI(user) {
    if (!userStatus || !loginBtn || !logoutBtn || !chatInput || !chatForm)
      return;

    if (user) {
      const name = user.displayName || user.email || "已登入使用者";
      userStatus.textContent = `已登入：${name}`;
      loginBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
      editProfileBtn?.classList.remove("hidden");
      chatInput.disabled = false;
      chatForm.querySelector("button").disabled = false;
      chatInput.placeholder = "輸入訊息並按 Enter 或點送出";
    } else {
      userStatus.textContent =
        "目前為遊客模式。登入之後可以聊天、管理個人資料，之後也可以接電子郵件。";
      loginBtn.classList.remove("hidden");
      logoutBtn.classList.add("hidden");
      editProfileBtn?.classList.add("hidden");
      chatInput.disabled = true;
      chatForm.querySelector("button").disabled = true;
      chatInput.placeholder = "請先登入（右上角）才能發送訊息";
    }
  }

  onAuthStateChanged(auth, (user) => {
    updateAuthUI(user);
  });

  // ================= Auth Modal 開關 =================

  function openAuthModal(mode = "login") {
    authMode = mode;
    if (!authModalBackdrop) return;

    authModalBackdrop.classList.remove("hidden");
    authError.textContent = "";
    authForm.reset();

    if (authMode === "login") {
      authModalTitle.textContent = "登入 Telos";
      authSubmit.textContent = "登入";
      signupExtra.classList.add("hidden");
      switchToSignup.classList.remove("hidden");
      switchToLogin.classList.add("hidden");
    } else {
      authModalTitle.textContent = "註冊 Telos 帳號";
      authSubmit.textContent = "註冊";
      signupExtra.classList.remove("hidden");
      switchToSignup.classList.add("hidden");
      switchToLogin.classList.remove("hidden");
    }
  }

  function closeAuthModal() {
    if (!authModalBackdrop) return;
    authModalBackdrop.classList.add("hidden");
  }

  // 開啟 / 關閉 Modal 事件
  if (loginBtn) {
    loginBtn.addEventListener("click", () => openAuthModal("login"));
  }

  if (authModalClose) {
    authModalClose.addEventListener("click", () => {
      closeAuthModal();
    });
  }

  if (authModalBackdrop) {
    authModalBackdrop.addEventListener("click", (e) => {
      if (e.target === authModalBackdrop) {
        closeAuthModal();
      }
    });
  }

  if (switchToSignup) {
    switchToSignup.addEventListener("click", () => openAuthModal("signup"));
  }

  if (switchToLogin) {
    switchToLogin.addEventListener("click", () => openAuthModal("login"));
  }

  // ================= 註冊 / 登入提交 =================

  if (authForm) {
    authForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!authEmail || !authPassword) return;

      const email = authEmail.value.trim();
      const password = authPassword.value.trim();
      const displayName =
        authDisplayName && authDisplayName.value.trim()
          ? authDisplayName.value.trim()
          : null;

      authError.textContent = "";
      authSubmit.disabled = true;
      authSubmit.textContent = authMode === "login" ? "登入中…" : "註冊中…";

      try {
        if (authMode === "login") {
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
        closeAuthModal();
      } catch (err) {
        console.error(err);
        authError.textContent = translateAuthError(err.code);
      } finally {
        authSubmit.disabled = false;
        authSubmit.textContent = authMode === "login" ? "登入" : "註冊";
      }
    });
  }

  function translateAuthError(code) {
    switch (code) {
      case "auth/email-already-in-use":
        return "這個 email 已經被註冊過了。";
      case "auth/invalid-email":
        return "電子郵件格式不正確。";
      case "auth/weak-password":
        return "密碼太弱，請至少 6 碼以上。";
      case "auth/user-not-found":
      case "auth/wrong-password":
        return "帳號或密碼錯誤。";
      case "auth/network-request-failed":
        return "網路連線失敗，請確認網路狀態。";
      default:
        return "登入 / 註冊失敗：" + (code || "未知錯誤");
    }
  }

  // ================= 登出 =================

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await signOut(auth);
      } catch (err) {
        console.error(err);
        alert("登出時出錯，可以再試一次。");
      }
    });
  }

  // ================= 編輯個人資料（暱稱） =================

  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", async () => {
      const user = auth.currentUser;
      if (!user) {
        alert("請先登入。");
        return;
      }
      const currentName = user.displayName || "";
      const newName = prompt("輸入新的暱稱：", currentName);
      if (newName === null) return;
      const trimmed = newName.trim();
      if (!trimmed) {
        alert("暱稱不能是空白。");
        return;
      }
      try {
        await updateProfile(user, { displayName: trimmed });
        updateAuthUI(auth.currentUser);
      } catch (err) {
        console.error(err);
        alert("更新暱稱失敗，可以稍後再試。");
      }
    });
  }

  // ================= 工具項目點擊行為 =================

  toolItems.forEach((item) => {
    item.addEventListener("click", () => {
      const tool = item.dataset.tool;

      if (tool === "chat") {
        chatFloat.classList.toggle("open");
      } else if (tool === "account") {
        document.getElementById("user-panel")?.scrollIntoView({
          behavior: "smooth",
        });
      } else if (tool === "settings") {
        alert("之後可以在這裡做 Telos 設定頁。");
      }

      toolsPanel.classList.remove("open");
    });
  });

  // ================= 聊天室邏輯（目前本機訊息） =================

  if (chatClose && chatFloat) {
    chatClose.addEventListener("click", () => {
      chatFloat.classList.remove("open");
    });
  }

  if (chatForm && chatInput && chatMessages) {
    chatForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const user = auth.currentUser;
      if (!user) {
        alert("請先登入再聊天。");
        return;
      }

      const text = chatInput.value.trim();
      if (!text) return;

      const div = document.createElement("div");
      div.className = "chat-message me";
      const name = user.displayName || user.email || "我";
      div.textContent = `${name}: ${text}`;
      chatMessages.appendChild(div);

      chatInput.value = "";
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
  }
});
