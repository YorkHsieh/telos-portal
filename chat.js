import { auth } from "./firebase.js";

export function initChat() {
  const chatFloat = document.getElementById("chat-float");
  const chatClose = document.getElementById("chat-close");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatMessages = document.getElementById("chat-messages");

  const chatToolBtn = document.querySelector('[data-tool="chat"]');

  // 打開聊天室
  chatToolBtn?.addEventListener("click", () => {
    chatFloat.classList.toggle("open");
  });

  chatClose?.addEventListener("click", () => {
    chatFloat.classList.remove("open");
  });

  // 發送訊息（本地版）
  chatForm?.addEventListener("submit", (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      alert("請登入後才能聊天");
      return;
    }

    const text = chatInput.value.trim();
    if (!text) return;

    const msg = document.createElement("div");
    msg.className = "chat-message me";
    msg.textContent = `${user.displayName || user.email}: ${text}`;

    chatMessages.appendChild(msg);
    chatInput.value = "";
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}
