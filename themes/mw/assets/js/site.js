// Theme toggle: flips between light and dark and remembers the choice.
(() => {
  const root = document.documentElement;
  const btn = document.querySelector(".theme-toggle");
  if (!btn) return;
  const isDark = () => root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  const sync = () => btn.setAttribute("aria-pressed", String(isDark()));
  // Store an override only when it differs from the system setting; otherwise follow the system again.
  btn.addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    const system = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    try {
      if (next === system) { delete root.dataset.theme; localStorage.removeItem("theme"); }
      else { root.dataset.theme = next; localStorage.setItem("theme", next); }
    } catch (e) { root.dataset.theme = next; }
    sync();
  });
  sync();
})();

