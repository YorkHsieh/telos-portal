// profile.js
import { auth } from "./firebase.js";
import { updateProfile } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

export function initProfile() {
  console.log("Profile module init");

  const editBtn = document.getElementById("btn-edit-profile");
  const emailSpan = document.getElementById("profile-email");
  const nameInput = document.getElementById("profile-display-name");
  const bioInput = document.getElementById("profile-bio");
  const saveBtn = document.getElementById("btn-save-profile");
  const status = document.getElementById("profile-status");

  // 先把欄位設成唯讀，避免沒登入亂填
  function setDisabled(disabled) {
    nameInput.disabled = disabled;
    bioInput.disabled = disabled;
    saveBtn.disabled = disabled;
  }
  setDisabled(true);
  status.textContent = "請登入後再編輯個人頁。";

  // 等 auth.js 那邊登入後，這裡再用 currentUser 更新 UI
  // 簡單做法：每次點「個人頁」按鈕前手動同步
  document.addEventListener("click", () => {
    const user = auth.currentUser;
    if (!user) {
      emailSpan.textContent = "尚未登入";
      setDisabled(true);
      return;
    }
    emailSpan.textContent = user.email || "（無 email）";
    nameInput.value = user.displayName || "";
    setDisabled(false);
    status.textContent = "";
  });

  // 快速修改暱稱按鈕
  editBtn?.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return alert("請先登入。");

    const current = user.displayName || "";
    const newName = prompt("輸入新的暱稱：", current);
    if (newName === null) return;
    const trimmed = newName.trim();
    if (!trimmed) return alert("暱稱不能是空白。");

    try {
      await updateProfile(user, { displayName: trimmed });
      nameInput.value = trimmed;
      status.textContent = "暱稱已更新。";
    } catch (err) {
      console.error(err);
      status.textContent = "更新暱稱失敗。";
    }
  });

  // 「儲存個人頁」目前只更新暱稱（bio 先留著）
  saveBtn?.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return alert("請先登入。");

    const name = nameInput.value.trim();
    if (!name) return alert("暱稱不能是空白。");

    status.textContent = "儲存中…";
    try {
      await updateProfile(user, { displayName: name });
      status.textContent = "已儲存。";
    } catch (err) {
      console.error(err);
      status.textContent = "儲存失敗。";
    }
  });
}
