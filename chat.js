// chat.js — 真・多人聊天室（Firestore 版）

import { auth, db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

export function initChat() {
  console.log("Chat module loaded (Firestore).");

  const chatFloat = document.getElementById("chat-float");
  const chatClose = document.getElementById("chat-close");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatMessages = document.getElementById("chat-messages");
  const chatToolBtn = document.querySelector('[data-tool="chat"]');

  // ====== 開啟/關閉聊天室 ======
  chatToolBtn?.addEventListener("click", () => {
    chatFloat.classList.toggle("open");
  });

  chatClose?.addEventListener("click", () => {
    chatFloat.classList.remove("open");
  });

  // ====== Firestore 訊息集合 ======
  const messagesRef = collection(db, "messages");

  // ====== 直播訊息 ======
  const q = query(messagesRef, orderBy("createdAt", "asc"));

  onSnapshot(q, (snapshot) => {
    chatMessages.innerHTML = ""; // 清空再重畫

    snapshot.forEach((doc) => {
      const msg = doc.data();
      const div = document.createElement("div");

      const isMe = auth.currentUser && msg.uid === auth.currentUser.uid;
      div.className = "chat-message" + (isMe ? " me" : "");

      const name = msg.name || "匿名";
      const text = msg.text || "";

      div.textContent = `${name}: ${text}`;
      chatMessages.appendChild(div);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
  });

  // ====== 發送訊息 ======
  chatForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) return alert("請登入後才能聊天");

    const text = chatInput.value.trim();
    if (!text) return;

    await addDoc(messagesRef, {
      uid: user.uid,
      name: user.displayName || user.email,
      text,
      createdAt: serverTimestamp()
    });

    chatInput.value = "";
  });
}
