// chat.js — Firestore 公共聊天室 + 依登入狀態啟用/關閉輸入

import { auth, db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import {
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

export function initChat() {
  console.log("Chat module init");

  const chatFloat = document.getElementById("chat-float");
  const chatClose = document.getElementById("chat-close");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatMessages = document.getElementById("chat-messages");
  const chatToolBtn = document.querySelector('[data-tool="chat"]');

  if (!chatFloat || !chatForm || !chatInput || !chatMessages) {
    console.warn("Chat DOM elements not found.");
    return;
  }

  const submitBtn = chatForm.querySelector("button");

  // ===== 依登入狀態啟用 / 關閉聊天室輸入 =====
  onAuthStateChanged(auth, (user) => {
    if (user) {
      chatInput.disabled = false;
      submitBtn.disabled = false;
      chatInput.placeholder = "輸入訊息並按 Enter 或點送出";
    } else {
      chatInput.disabled = true;
      submitBtn.disabled = true;
      chatInput.placeholder = "請先登入才能聊天";
    }
  });

  // ===== 開啟 / 關閉浮動視窗 =====
  chatToolBtn?.addEventListener("click", () => {
    chatFloat.classList.toggle("open");
  });

  chatClose?.addEventListener("click", () => {
    chatFloat.classList.remove("open");
  });

  // ===== Firestore 集合：messages（公共聊天室） =====
  const msgsRef = collection(db, "messages");
  const q = query(msgsRef, orderBy("createdAt", "asc"));

  // 即時監聽訊息
  onSnapshot(q, (snapshot) => {
    chatMessages.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const div = document.createElement("div");

      const isMe =
        auth.currentUser && data.uid === auth.currentUser.uid;

      div.className = "chat-message" + (isMe ? " me" : "");
      const name = data.name || "匿名";
      const text = data.text || "";
      div.textContent = `${name}: ${text}`;
      chatMessages.appendChild(div);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
  });

  // ===== 送出訊息 =====
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;

    if (!user) {
      alert("請先登入再聊天。");
      return;
    }

    const text = chatInput.value.trim();
    if (!text) return;

    try {
      await addDoc(msgsRef, {
        uid: user.uid,
        name: user.displayName || user.email || "使用者",
        text,
        createdAt: serverTimestamp(),
      });
      chatInput.value = "";
    } catch (err) {
      console.error(err);
      alert("送出訊息失敗，可以稍後再試。");
    }
  });
}
