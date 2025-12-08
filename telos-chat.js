// telos-chat.js — 私訊 + 群組聊天室（threads + messages）

import { auth, db } from "./firebase.js";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

export function initChat() {
  console.log("Chat module init");

  const chatFloat = document.getElementById("chat-float");
  const chatClose = document.getElementById("chat-close");
  const chatHeaderTitle = document.getElementById("chat-header-title");

  const chatThreadList = document.getElementById("chat-thread-list");
  const chatMainEmpty = document.getElementById("chat-main-empty");
  const chatWindow = document.getElementById("chat-window");
  const chatMessages = document.getElementById("chat-messages");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");

  const toolsChatBtn = document.querySelector('[data-tool="chat"]');
  const newChatBtn = document.getElementById("btn-new-chat");

  // 新對話 modal
  const chatNewBackdrop = document.getElementById("chat-new-modal-backdrop");
  const chatNewClose = document.getElementById("chat-new-close");
  const chatNewSubmit = document.getElementById("chat-new-submit");
  const chatNewError = document.getElementById("chat-new-error");
  const chatTypeRadios = document.querySelectorAll("input[name='chat-type']");
  const chatTargetInput = document.getElementById("chat-target");
  const chatGroupNameRow = document.getElementById("chat-group-name-row");
  const chatGroupNameInput = document.getElementById("chat-group-name");

  if (
    !chatFloat ||
    !chatHeaderTitle ||
    !chatThreadList ||
    !chatMainEmpty ||
    !chatWindow ||
    !chatMessages ||
    !chatForm ||
    !chatInput
  ) {
    console.warn("Chat DOM not ready.");
    return;
  }

  const submitBtn = chatForm.querySelector("button");

  let currentThreadId = null;
  let threadsUnsub = null;
  let messagesUnsub = null;
  let currentUser = null;

  function setChatEnabled(enabled) {
    chatInput.disabled = !enabled;
    submitBtn.disabled = !enabled;
    if (!enabled) {
      chatInput.placeholder = "請先登入並選擇對話";
    } else {
      chatInput.placeholder = "輸入訊息並按 Enter 或點送出";
    }
  }

  setChatEnabled(false);

  // ===== 開關聊天室視窗 =====
  toolsChatBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    chatFloat.classList.toggle("open");
  });

  chatClose?.addEventListener("click", () => {
    chatFloat.classList.remove("open");
  });

  // ===== 新對話 Modal =====
  function openNewChatModal() {
    if (!currentUser) {
      alert("請先登入才能建立對話。");
      return;
    }
    chatNewBackdrop.classList.remove("hidden");
    chatNewBackdrop.style.display = "flex";
    chatNewError.textContent = "";
    chatTargetInput.value = "";
    chatGroupNameInput.value = "";
  }

  function closeNewChatModal() {
    chatNewBackdrop.classList.add("hidden");
    chatNewBackdrop.style.display = "none";
  }

  newChatBtn?.addEventListener("click", openNewChatModal);
  chatNewClose?.addEventListener("click", closeNewChatModal);
  chatNewBackdrop?.addEventListener("click", (e) => {
    if (e.target === chatNewBackdrop) closeNewChatModal();
  });

  // 切換 direct / group UI
  function getChatType() {
    const checked = Array.from(chatTypeRadios).find((r) => r.checked);
    return checked ? checked.value : "direct";
  }

  chatTypeRadios.forEach((r) => {
    r.addEventListener("change", () => {
      const t = getChatType();
      if (t === "group") {
        chatGroupNameRow.style.display = "block";
      } else {
        chatGroupNameRow.style.display = "none";
      }
    });
  });

  // ===== 監聽登入狀態 → 載入 threads =====
  onAuthStateChanged(auth, (user) => {
    currentUser = user || null;

    if (threadsUnsub) {
      threadsUnsub();
      threadsUnsub = null;
    }
    if (messagesUnsub) {
      messagesUnsub();
      messagesUnsub = null;
    }

    chatThreadList.innerHTML = "";
    chatMessages.innerHTML = "";
    chatMainEmpty.style.display = "flex";
    chatWindow.classList.remove("active");
    chatHeaderTitle.textContent = "Telos 訊息";
    currentThreadId = null;
    setChatEnabled(false);

    if (!user) {
      return;
    }

    setChatEnabled(false); // 先鎖，等選 thread 再開

    const threadsRef = collection(db, "threads");
    const qThreads = query(
      threadsRef,
      where("participantUids", "array-contains", user.uid),
      orderBy("updatedAt", "desc")
    );

    threadsUnsub = onSnapshot(
      qThreads,
      (snapshot) => {
        renderThreads(snapshot.docs, user);
      },
      (err) => {
        console.error("threads onSnapshot error:", err);
      }
    );
  });

  // ===== 渲染 thread 列表 =====
  function renderThreads(docs, user) {
    chatThreadList.innerHTML = "";
    if (docs.length === 0) {
      const span = document.createElement("div");
      span.style.fontSize = "0.8rem";
      span.style.color = "#6b7280";
      span.style.padding = "6px 8px";
      span.textContent = "目前沒有對話，按「＋」建立新對話。";
      chatThreadList.appendChild(span);
      return;
    }

    docs.forEach((docSnap) => {
      const data = docSnap.data();
      const btn = document.createElement("button");
      btn.className = "chat-thread-item";
      btn.dataset.threadId = docSnap.id;

      let title = data.title || "";
      if (!title && data.type === "direct") {
        const parts = data.participantSummaries || [];
        const other =
          parts.find((p) => p.uid !== user.uid) ||
          { name: "(私人對話)" };
        title = other.name || other.telosId || "(私人對話)";
      } else if (!title) {
        title = "(未命名對話)";
      }

      const titleDiv = document.createElement("div");
      titleDiv.className = "chat-thread-title";
      titleDiv.textContent = title;

      const metaDiv = document.createElement("div");
      metaDiv.className = "chat-thread-meta";
      if (data.lastMessageText) {
        const sender = data.lastSenderName || "";
        metaDiv.textContent =
          (sender ? sender + ": " : "") +
          data.lastMessageText.slice(0, 30);
      } else {
        metaDiv.textContent =
          data.type === "group" ? "群組對話" : "私人對話";
      }

      btn.appendChild(titleDiv);
      btn.appendChild(metaDiv);

      btn.addEventListener("click", () => {
        selectThread(docSnap.id, data, user);
        // active 樣式
        document
          .querySelectorAll(".chat-thread-item.active")
          .forEach((el) => el.classList.remove("active"));
        btn.classList.add("active");
      });

      chatThreadList.appendChild(btn);
    });
  }

  // ===== 選擇 thread → 監聽訊息 =====
  function selectThread(threadId, threadData, user) {
    if (messagesUnsub) {
      messagesUnsub();
      messagesUnsub = null;
    }
    currentThreadId = threadId;
    setChatEnabled(true);

    let title = threadData.title || "";
    if (!title && threadData.type === "direct") {
      const parts = threadData.participantSummaries || [];
      const other =
        parts.find((p) => p.uid !== user.uid) ||
        { name: "(私人對話)" };
      title = other.name || other.telosId || "(私人對話)";
    } else if (!title) {
      title = "(未命名對話)";
    }

    chatHeaderTitle.textContent = title;
    chatMainEmpty.style.display = "none";
    chatWindow.classList.add("active");
    chatMessages.innerHTML = "";

    const msgsRef = collection(db, "threads", threadId, "messages");
    const qMsgs = query(msgsRef, orderBy("createdAt", "asc"));

    messagesUnsub = onSnapshot(
      qMsgs,
      (snapshot) => {
        chatMessages.innerHTML = "";
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const div = document.createElement("div");

          const isMe =
            user && data.senderUid === user.uid;

          div.className =
            "chat-message " + (isMe ? "me" : "other");

          const senderEl = document.createElement("div");
          senderEl.className = "sender";
          senderEl.textContent = isMe
            ? "我"
            : data.senderName || "對方";

          const textEl = document.createElement("div");
          textEl.className = "text";
          textEl.textContent = data.text || "";

          div.appendChild(senderEl);
          div.appendChild(textEl);
          chatMessages.appendChild(div);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
      },
      (err) => {
        console.error("messages onSnapshot error:", err);
      }
    );
  }

  // ===== 送出訊息 =====
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      alert("請先登入再聊天。");
      return;
    }
    if (!currentThreadId) {
      alert("請先選擇一個對話或建立新對話。");
      return;
    }

    const text = chatInput.value.trim();
    if (!text) return;

    try {
      const threadRef = doc(db, "threads", currentThreadId);
      const msgsRef = collection(threadRef, "messages");

      await addDoc(msgsRef, {
        senderUid: user.uid,
        senderName: user.displayName || user.email || "使用者",
        text,
        createdAt: serverTimestamp(),
      });

      // 更新 thread 的 last message
      await setDoc(
        threadRef,
        {
          lastMessageText: text,
          lastSenderName: user.displayName || user.email || "使用者",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      chatInput.value = "";
    } catch (err) {
      console.error("送出訊息失敗：", err);
      alert("送出訊息失敗，可以稍後再試。");
    }
  });

  // ===== 新對話建立（direct / group）=====
  chatNewSubmit.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("請先登入。");
      return;
    }

    const type = getChatType();
    const targetValue = chatTargetInput.value.trim().toUpperCase();
    const groupName = chatGroupNameInput.value.trim();
    chatNewError.textContent = "";

    if (!targetValue) {
      chatNewError.textContent = "請輸入對象的 Telos ID。";
      return;
    }

    if (type === "group" && !groupName) {
      chatNewError.textContent = "請輸入群組名稱。";
      return;
    }

    // Telos ID 可能是用逗號分隔多個
    const idList = targetValue
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    // 不可以把自己只加成一個 direct
    if (idList.length === 1 && idList[0] === "") {
      chatNewError.textContent = "請輸入有效的 Telos ID。";
      return;
    }

    try {
      const usersRef = collection(db, "users");
      const participantDocs = [];

      for (const id of idList) {
        if (!id) continue;
        const qSnap = await getDocs(
          query(usersRef, where("telosId", "==", id))
        );
        if (qSnap.empty) {
          chatNewError.textContent = `找不到 Telos ID：${id}`;
          return;
        }
        participantDocs.push(qSnap.docs[0]);
      }

      // 自己也要加進 participants
      const myRef = doc(db, "users", user.uid);
      const mySnap = await getDoc(myRef);
      const myData = mySnap.exists() ? mySnap.data() : {};

      const participants = [];
      const participantUids = [];
      const participantSummaries = [];

      // 自己
      participants.push(user.uid);
      participantUids.push(user.uid);
      participantSummaries.push({
        uid: user.uid,
        email: user.email || "",
        name: myData.name || user.displayName || user.email || "我",
        telosId: myData.telosId || "",
      });

      // 對方們
      for (const d of participantDocs) {
        const data = d.data();
        participants.push(d.id);
        participantUids.push(d.id);
        participantSummaries.push({
          uid: d.id,
          email: data.email || "",
          name: data.name || data.displayName || data.email || data.telosId,
          telosId: data.telosId || "",
        });
      }

      const threadsRef = collection(db, "threads");

      let title = groupName;
      if (type === "direct" && participantSummaries.length === 2) {
        const other = participantSummaries.find(
          (p) => p.uid !== user.uid
        );
        title =
          other?.name || other?.telosId || "(私人對話)";
      } else if (!title) {
        title = "(未命名對話)";
      }

      const threadDoc = await addDoc(threadsRef, {
        type,
        title,
        participantUids,
        participantSummaries,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessageText: "",
        lastSenderName: "",
      });

      closeNewChatModal();

      // 立即選到這個 thread
      const threadData = {
        type,
        title,
        participantUids,
        participantSummaries,
      };
      selectThread(threadDoc.id, threadData, user);

      // 刷新列表會在 threads onSnapshot 自動來
    } catch (err) {
      console.error("建立新對話失敗：", err);
      chatNewError.textContent = "建立新對話失敗，稍後再試。";
    }
  });
}
