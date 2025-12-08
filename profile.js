import { auth } from "./firebase.js";

export function initProfile() {
  const editBtn = document.getElementById("btn-edit-profile");

  editBtn?.addEventListener("click", () => {
    const user = auth.currentUser;
    if (!user) return alert("請先登入");

    const current = user.displayName || "";
    const name = prompt("輸入新暱稱：", current);
    if (!name) return;

    user.updateProfile({ displayName: name.trim() });
    alert("暱稱已更新");
  });
}
