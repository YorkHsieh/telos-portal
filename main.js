// Firebase CDN modular imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

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
const db = getFirestore(app);

// ================= DOM Ready =================

document.addEventListener("DOMContentLoaded", () => {
  const splash = document.getElementById("splash");
  const appMain = document.getElementById("app-main");

  setTimeout(() => {
    splash?.classList.add("hidden");
    appMain?.classList.add("ready");
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
  const chatThreadList = document.getElementById("chat-thread-list");
  const chatMainEmpty = document.getElementById("chat-main-empty");
  const chatWindow = document.getElementById("chat-window");
  const btnNewChat = document.getElementById("btn-new-chat");

  // Profile
  const profileEmail = document.getElementById("profile-email");
  const profileDisplayName = document.getElementById("profile-display-name");
  const profileBio = document.getElementById("profile-bio");
  const btnSaveProfile = document.getElementById("btn-save-profile");
  const profileStatus = document.getElementById("profile-status");

  // Auth Modal
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

  // 新對話 Modal
  const chatNewBackdrop = document.getElementById("chat-new-modal-backdrop");
  const chatNewClose = document.getElementById("chat-new-close");
  const chatNewSubmit = document.getElementById("chat-new-submit");
  const chatNewError = document.getElementById("chat-new-error");
  const chatTypeRadios = document.querySelectorAll("input[name='chat-type']");
  const chatTargetInput = document.getElementById("chat-target");
  const chatGroupNameRow = document.getElementById("chat-group-name-row");
  const chatGroupNameInput = document.getElementById("chat-group-name");
  const chatTargetLabel = document.getElementById("chat-target-label");

  let authMode = "login"; // "login" | "signup"
  let threadsUnsub = null;
  let messagesUnsub = null;
  let activeChatId = null;
  let activeChatTitle = "";

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
      closeNewChatModal();
    }
  });

  // ================= Auth Modal 開關 =================

  function openAuthModal(mode = "login") {
    authMode = mode;
    if (!authModalBackdrop) return;

    authModalBackdrop.classList.remove("hidden");
    authModalBackdrop.style.display = "flex";
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
    console.log("closeAuthModal: hiding auth modal");
    authModalBackdrop.classList.add("hidden");
    authModalBackdrop.style.display = "none";
  }

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

  // ================= 新對話 Modal =================

  function openNewChatModal() {
    if (!chatNewBackdrop) return;
    chatNewBackdrop.classList.remove("hidden");
    chatNewBackdrop.style.display = "flex";
    chatNewError.textContent = "";
    chatTargetInput.value = "";
    chatGroupNameInput.value = "";
  }

  function closeNewChatModal() {
    if (!chatNewBackdrop) return;
    chatNewBackdrop.classList.add("hidden");
    chatNewBackdrop.style.display = "none";
  }

  if (btnNewChat) {
    btnNewChat.addEventListener("click", () => {
      const user = auth.currentUser;
      if (!user) {
        alert("請先登入再建立對話。");
        return;
      }
      openNewChatModal();
    });
  }

  if (chatNewClose) {
    chatNewClose.addEventListener("click", closeNewChatModal);
  }

  if (chatNewBackdrop) {
    chatNewBackdrop.addEventListener("click", (e) => {
      if (e.target === chatNewBackdrop) closeNewChatModal();
    });
  }

  // chat type 切換
  if (chatTypeRadios) {
    chatTypeRadios.forEach((r) => {
      r.addEventListener("change", () => {
        const type = getSelectedChatType();
        if (type === "group") {
          chatGroupNameRow.style.display = "flex";
          chatTargetLabel.textContent = "成員 Email（用逗號分隔）";
        } else {
          chatGroupNameRow.style.display = "none";
          chatTargetLabel.textContent = "對方 Email";
        }
      });
    });
  }

  function getSelectedChatType() {
    const checked = document.querySelector("input[name='chat-type']:checked");
    return checked ? checked.value : "direct";
  }

  // ================= Auth UI 狀態 =================

  function updateAuthUI(user) {
    if (!userStatus || !loginBtn || !logoutBtn || !chatInput || !chatForm) return;

    if (user) {
      const name = user.displayName || user.email || "已登入使用者";
      userStatus.textContent = `已登入：${name}`;
      loginBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
      editProfileBtn?.classList.remove("hidden");
      chatInput.disabled = activeChatId ? false : true;
      chatForm.querySelector("button").disabled = activeChatId ? false : true;
      chatInput.placeholder = activeChatId
        ? "輸入訊息並按 Enter 或點送出"
        : "請先選擇對話";
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

  // 建立 / 載入 Firestore 裡的使用者文件
  async function ensureUserDoc(user) {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        email: user.email || null,
        displayName: user.displayName || null,
        createdAt: serverTimestamp(),
        bio: "",
      });
    }
  }

  async function loadProfile(user) {
    if (!profileEmail || !profileDisplayName || !profileBio) return;

    if (!user) {
      profileEmail.textContent = "尚未登入";
      profileDisplayName.value = "";
      profileBio.value = "";
      profileDisplayName.disabled = true;
      profileBio.disabled = true;
      btnSaveProfile.disabled = true;
      profileStatus.textContent = "登入後可以設定個人頁。";
      return;
    }

    profileEmail.textContent = user.email || "(無 email)";
    profileDisplayName.disabled = false;
    profileBio.disabled = false;
    btnSaveProfile.disabled = false;

    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      profileDisplayName.value =
        data.displayName || user.displayName || "" || "";
      profileBio.value = data.bio || "";
    } else {
      profileDisplayName.value = user.displayName || "";
      profileBio.value = "";
    }
    profileStatus.textContent = "";
  }

  // 監聽登入狀態
  onAuthStateChanged(auth, async (user) => {
    console.log("Auth state changed:", user?.email || "未登入");
    updateAuthUI(user);
    await ensureUserDoc(user);
    await loadProfile(user);
    subscribeThreads(user);
    if (user) closeAuthModal();
    if (!user) {
      // 清除聊天室狀態
      activeChatId = null;
      activeChatTitle = "";
      chatMessages.innerHTML = "";
      chatMainEmpty.style.display = "flex";
      chatWindow.classList.remove("active");
    }
  });

  // ================= Auth 表單 =================

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

  // ================= 快速改暱稱（沿用原本邏輯） =================

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
        await setDoc(
          doc(db, "users", user.uid),
          {
            displayName: trimmed,
          },
          { merge: true }
        );
        updateAuthUI(auth.currentUser);
        await loadProfile(auth.currentUser);
      } catch (err) {
        console.error(err);
        alert("更新暱稱失敗，可以稍後再試。");
      }
    });
  }

  // ================= 儲存個人頁 =================

  if (btnSaveProfile) {
    btnSaveProfile.addEventListener("click", async () => {
      const user = auth.currentUser;
      if (!user) {
        alert("請先登入再儲存個人頁。");
        return;
      }
      const name = profileDisplayName.value.trim();
      const bio = profileBio.value.trim();

      profileStatus.textContent = "儲存中…";
      btnSaveProfile.disabled = true;

      try {
        if (name) {
          await updateProfile(user, { displayName: name });
        }
        await setDoc(
          doc(db, "users", user.uid),
          {
            email: user.email || null,
            displayName: name || user.displayName || null,
            bio,
          },
          { merge: true }
        );
        profileStatus.textContent = "已儲存。";
        updateAuthUI(auth.currentUser);
      } catch (err) {
        console.error(err);
        profileStatus.textContent = "儲存失敗，稍後再試。";
      } finally {
        btnSaveProfile.disabled = false;
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

  // ================= 聊天室：對話列表訂閱 =================

  function clearThreadsUI() {
    if (chatThreadList) chatThreadList.innerHTML = "";
  }

  function subscribeThreads(user) {
    if (threadsUnsub) {
      threadsUnsub();
      threadsUnsub = null;
    }
    clearThreadsUI();

    if (!user) return;

    const qThreads = query(
      collection(db, "chats"),
      where("memberIds", "array-contains", user.uid),
      orderBy("lastMessageAt", "desc")
    );

    threadsUnsub = onSnapshot(
      qThreads,
      (snapshot) => {
        clearThreadsUI();
        if (snapshot.empty) {
          const div = document.createElement("div");
          div.className = "chat-thread-item";
          div.textContent = "尚無對話，按＋開始一個吧。";
          div.style.cursor = "default";
          chatThreadList.appendChild(div);
          return;
        }
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const li = document.createElement("button");
          li.className = "chat-thread-item";
          li.dataset.chatId = docSnap.id;

          const titleDiv = document.createElement("div");
          titleDiv.className = "chat-thread-title";
          titleDiv.textContent = data.title || "(未命名對話)";

          const metaDiv = document.createElement("div");
          metaDiv.className = "chat-thread-meta";
          metaDiv.textContent =
            data.type === "group" ? "群組" : "個人對話";

          li.appendChild(titleDiv);
          li.appendChild(metaDiv);

          if (docSnap.id === activeChatId) {
            li.classList.add("active");
          }

          li.addEventListener("click", () => {
            openChatThread(docSnap.id, data);
          });

          chatThreadList.appendChild(li);
        });
      },
      (err) => {
        console.error("subscribeThreads error:", err);
      }
    );
  }

  // ================= 打開某一個對話 =================

  function setActiveChatUI(chatId, title) {
    activeChatId = chatId;
    activeChatTitle = title;
    if (chatMainEmpty) chatMainEmpty.style.display = "none";
    if (chatWindow) chatWindow.classList.add("active");

    // enable input
    const user = auth.currentUser;
    if (user && chatInput && chatForm) {
      chatInput.disabled = false;
      chatForm.querySelector("button").disabled = false;
      chatInput.placeholder = "輸入訊息並按 Enter 或點送出";
    }

    // thread list active 標記
    const items = document.querySelectorAll(".chat-thread-item");
    items.forEach((el) => {
      if (el.dataset.chatId === chatId) el.classList.add("active");
      else el.classList.remove("active");
    });
  }

  function subscribeMessages(chatId) {
    if (messagesUnsub) {
      messagesUnsub();
      messagesUnsub = null;
    }
    chatMessages.innerHTML = "";

    if (!chatId) return;

    const msgsCol = collection(db, "chats", chatId, "messages");
    const qMsgs = query(msgsCol, orderBy("createdAt", "asc"));

    messagesUnsub = onSnapshot(
      qMsgs,
      (snapshot) => {
        chatMessages.innerHTML = "";
        if (snapshot.empty) {
          const div = document.createElement("div");
          div.className = "chat-message system";
          div.textContent = "還沒有訊息，說點什麼吧。";
          chatMessages.appendChild(div);
          return;
        }
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const msgEl = document.createElement("div");
          const user = auth.currentUser;
          const isMe = user && data.senderId === user.uid;

          msgEl.className = "chat-message " + (isMe ? "me" : "other");

          const senderDiv = document.createElement("div");
          senderDiv.className = "sender";
          senderDiv.textContent = data.senderName || "某人";

          const textDiv = document.createElement("div");
          textDiv.className = "text";
          textDiv.textContent = data.text || "";

          msgEl.appendChild(senderDiv);
          msgEl.appendChild(textDiv);
          chatMessages.appendChild(msgEl);
        });

        chatMessages.scrollTop = chatMessages.scrollHeight;
      },
      (err) => {
        console.error("subscribeMessages error:", err);
      }
    );
  }

  function openChatThread(chatId, data) {
    setActiveChatUI(chatId, data.title || "");
    subscribeMessages(chatId);
  }

  // ================= 建立新對話 =================

  if (chatNewSubmit) {
    chatNewSubmit.addEventListener("click", async () => {
      const user = auth.currentUser;
      if (!user) {
        alert("請先登入。");
        return;
      }

      const type = getSelectedChatType();
      const rawTarget = chatTargetInput.value.trim();
      const groupName = chatGroupNameInput.value.trim();
      chatNewError.textContent = "";

      if (!rawTarget) {
        chatNewError.textContent = "請輸入 Email。";
        return;
      }

      let emails = rawTarget
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e.length > 0);

      // 個人對話只取第一個
      if (type === "direct") {
        emails = [emails[0]];
      }

      // 不能只自己
      emails = emails.filter((e) => e.toLowerCase() !== (user.email || "").toLowerCase());

      if (emails.length === 0) {
        chatNewError.textContent = "請輸入至少一個不是自己的 Email。";
        return;
      }

      try {
        // 找出這些 email 對應的使用者
        const memberIds = [user.uid];
        const memberInfos = [
          {
            uid: user.uid,
            email: user.email || "",
            displayName: user.displayName || "",
          },
        ];

        for (const email of emails) {
          const qUser = query(
            collection(db, "users"),
            where("email", "==", email)
          );
          const snap = await getDocs(qUser);
          if (!snap.empty) {
            const docSnap = snap.docs[0];
            const d = docSnap.data();
            memberIds.push(docSnap.id);
            memberInfos.push({
              uid: docSnap.id,
              email: d.email || email,
              displayName: d.displayName || d.email || email,
            });
          }
        }

        const uniqueIds = [...new Set(memberIds)];
        if (uniqueIds.length < 2) {
          chatNewError.textContent =
            "找不到其他有效使用者，確認對方是否也有註冊。";
          return;
        }

        let title = "";
        if (type === "group") {
          title =
            groupName ||
            memberInfos
              .map((m) => m.displayName || m.email)
              .join("、")
              .slice(0, 20);
        } else {
          const other = memberInfos.find((m) => m.uid !== user.uid);
          title = other?.displayName || other?.email || "個人對話";
        }

        const chatRef = await addDoc(collection(db, "chats"), {
          type,
          title,
          memberIds: uniqueIds,
          createdAt: serverTimestamp(),
          lastMessageAt: serverTimestamp(),
          lastMessageText: "",
        });

        closeNewChatModal();
        // 打開剛建好的對話
        openChatThread(chatRef.id, { title, type });
      } catch (err) {
        console.error(err);
        chatNewError.textContent = "建立對話失敗，稍後再試。";
      }
    });
  }

  // ================= 聊天室訊息送出 =================

  if (chatClose && chatFloat) {
    chatClose.addEventListener("click", () => {
      chatFloat.classList.remove("open");
    });
  }

  if (chatForm && chatInput && chatMessages) {
    chatForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const user = auth.currentUser;
      if (!user) {
        alert("請先登入再聊天。");
        return;
      }
      if (!activeChatId) {
        alert("請先選擇一個對話或建立新的對話。");
        return;
      }

      const text = chatInput.value.trim();
      if (!text) return;

      try {
        const msgRef = collection(db, "chats", activeChatId, "messages");
        await addDoc(msgRef, {
          senderId: user.uid,
          senderName: user.displayName || user.email || "我",
          text,
          createdAt: serverTimestamp(),
        });

        await updateDoc(doc(db, "chats", activeChatId), {
          lastMessageText: text,
          lastMessageAt: serverTimestamp(),
        });

        chatInput.value = "";
      } catch (err) {
        console.error(err);
        alert("送出訊息失敗，稍後再試。");
      }
    });
  }
});
