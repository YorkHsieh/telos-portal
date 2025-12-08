// telos-tools.js — 九宮格工具面板

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

  document.querySelectorAll(".tool-item[data-tool='account']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ev = new Event("open-profile");
      document.dispatchEvent(ev);
      toolsPanel.classList.remove("open");
    });
  });
}
