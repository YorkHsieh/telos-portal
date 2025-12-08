// tools.js
export function initToolsPanel() {
  const toolsBtn = document.getElementById("tools-button");
  const toolsPanel = document.getElementById("tools-panel");

  if (!toolsBtn || !toolsPanel) return;

  toolsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toolsPanel.classList.toggle("open");
  });

  toolsPanel.addEventListener("click", (e) => e.stopPropagation());

  document.addEventListener("click", () => {
    toolsPanel.classList.remove("open");
  });

  // tool-item 的額外行為（帳號中心）
  document.querySelectorAll(".tool-item[data-tool='account']").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById("user-panel")?.scrollIntoView({
        behavior: "smooth",
      });
    });
  });
}
