// gRPC load-balancing toy: requests travel from the client to the pods.
// L4: kube-proxy picks a pod once per connection, and gRPC reuses one connection.
// L7: a mesh proxy picks a pod per request (round robin).
// The moving dots are the content, so they also run under prefers-reduced-motion.
document.querySelectorAll('[data-demo="grpc-load-balancing-kubernetes"]').forEach((root) => {
  if (root.dataset.initialized) return;
  root.dataset.initialized = "true";
  const toy = root.querySelector("[data-lb]");
  const NS = "http://www.w3.org/2000/svg";
  const routes = [...toy.querySelectorAll("[data-route]")];
  const conns = [...toy.querySelectorAll("[data-conn]")];
  const pods = [...toy.querySelectorAll("[data-pod]")];
  const dotLayer = toy.querySelector("[data-dots]");
  const buttons = [...toy.querySelectorAll("[data-mode]")];
  const caption = toy.querySelector("[data-lb-caption]");
  const list = [...toy.querySelectorAll("[data-lb-list] li")];
  const proxy = toy.querySelector("[data-lb-proxy]");
  const proxySub = toy.querySelector("[data-lb-proxy-sub]");

  const text = {
    l4: { name: "kube-proxy", sub: "picks per connection", caption: "One HTTP/2 connection. Every request goes to the same pod." },
    l7: { name: "istio proxy", sub: "picks per request", caption: "The proxy picks a pod for each request. The load spreads evenly." },
  };

  let mode = "l4", pinned = 0, rr = 0, counts = [0, 0, 0, 0], dots = [];

  const pick = () => (mode === "l4" ? pinned : (rr = (rr + 1) % pods.length));

  const renderCounts = () => {
    const max = Math.max(1, ...counts);
    const total = counts.reduce((a, b) => a + b, 0) || 1;
    pods.forEach((pod, i) => {
      pod.querySelector("[data-count]").textContent = counts[i];
      pod.querySelector("[data-bar]").setAttribute("width", (64 * counts[i] / max).toFixed(1));
      pod.classList.toggle("hot", counts[i] / total > 0.5 && counts[i] > 3);
      list[i].textContent = `pod-${"abcd"[i]}: ${counts[i]} requests`;
    });
  };

  const setMode = (next) => {
    mode = next;
    pinned = Math.floor(Math.random() * pods.length);
    counts = [0, 0, 0, 0];
    dots.forEach((d) => d.el.remove()); dots = [];
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
    conns.forEach((c, i) => c.classList.toggle("on", mode === "l7" || i === pinned));
    proxy.textContent = text[mode].name;
    proxySub.textContent = text[mode].sub;
    caption.textContent = text[mode].caption;
    renderCounts();
  };

  const land = (target) => { counts[target]++; renderCounts(); };

  const send = () => {
    const target = pick();
    const el = document.createElementNS(NS, "circle");
    el.setAttribute("r", "3.5"); el.setAttribute("class", "dot");
    dotLayer.append(el);
    dots.push({ el, path: routes[target], len: routes[target].getTotalLength(), t0: performance.now(), target });
  };

  const DURATION = 1100;
  const frame = (now) => {
    dots = dots.filter((d) => {
      const k = Math.min(1, (now - d.t0) / DURATION);
      const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const p = d.path.getPointAtLength(e * d.len);
      d.el.setAttribute("cx", p.x); d.el.setAttribute("cy", p.y);
      if (k < 1) return true;
      d.el.remove(); land(d.target); return false;
    });
    requestAnimationFrame(frame);
  };

  buttons.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
  setMode("l4");
  requestAnimationFrame(frame);
  // Pause while the tab is hidden, so counts do not jump on return.
  setInterval(() => { if (!document.hidden) send(); }, 260);
});
