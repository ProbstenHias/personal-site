// gRPC load-balancing toy: requests travel from the client to the pods.
// L4: kube-proxy picks a pod once per connection, and gRPC reuses one connection.
// L7: Istio's proxy picks a pod per request (round robin).
// Each dot is a batch of requests. The dots are the content, so they also run
// under prefers-reduced-motion. Only the landing rings are decoration.
document.querySelectorAll('[data-demo="grpc-load-balancing-kubernetes"]').forEach((root) => {
  if (root.dataset.initialized) return;
  root.dataset.initialized = "true";
  const toy = root.querySelector("[data-lb]");
  const NS = "http://www.w3.org/2000/svg";
  const routes = [...toy.querySelectorAll("[data-route]")];
  const conns = [...toy.querySelectorAll("[data-conn]")];
  const pods = [...toy.querySelectorAll("[data-pod]")];
  const dotLayer = toy.querySelector("[data-dots]");
  const fxLayer = toy.querySelector("[data-fx]");
  const total = toy.querySelector(".total");
  const buttons = [...toy.querySelectorAll("[data-mode]")];
  const caption = toy.querySelector("[data-lb-caption]");
  const list = [...toy.querySelectorAll("[data-lb-list] li")];
  const proxy = toy.querySelector("[data-lb-proxy]");
  const proxySub = toy.querySelector("[data-lb-proxy-sub]");
  const calm = matchMedia("(prefers-reduced-motion: reduce)");

  const BATCH = 300, PER_SEC = 10, CAPACITY = 1000, BAR_MAX = 3000, BAR_W = 64;
  const DURATION = 1100, WINDOW = 1500;
  const text = {
    l4: { name: "kube-proxy", sub: "picks per connection", caption: "One HTTP/2 connection. Every request goes to the same pod, and it falls over." },
    l7: { name: "istio proxy", sub: "picks per request", caption: "The proxy picks a pod for each request. Every pod stays under capacity." },
  };

  let mode = "l4", pinned = 0, rr = 0, dots = [], fx = [], nextAt = 0, last = 0, listAt = 0;
  const landed = pods.map(() => []), sent = [], shown = pods.map(() => 0);
  let shownTotal = 0;

  const svg = (tag, attrs, parent) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    parent.append(el);
    return el;
  };
  const fmt = (r) => (r < 5 ? "0" : r < 950 ? String(Math.round(r / 10) * 10) : (r / 1000).toFixed(1) + "k");
  const rate = (times, now) => {
    while (times.length && now - times[0] > WINDOW) times.shift();
    return times.length * BATCH * 1000 / WINDOW;
  };
  const setText = (el, s) => { if (el.textContent !== s) el.textContent = s; };

  const setMode = (next) => {
    mode = next;
    pinned = Math.floor(Math.random() * pods.length);
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
    conns.forEach((c, i) => c.classList.toggle("on", mode === "l7" || i === pinned));
    proxy.textContent = text[mode].name;
    proxySub.textContent = text[mode].sub;
    caption.textContent = text[mode].caption;
  };

  const send = (now) => {
    const target = mode === "l4" ? pinned : (rr = (rr + 1) % pods.length);
    const g = svg("g", {}, dotLayer);
    const trail = svg("line", { class: "trail" }, g);
    const dot = svg("circle", { class: "dot", r: 3 }, g);
    const path = routes[target];
    dots.push({ g, trail, dot, path, len: path.getTotalLength(), t0: now, target });
    sent.push(now);
  };

  // Rings and drop marks: short-lived SVG nodes driven by draw(k, el) for k in 0..1.
  const spawn = (el, ms, draw) => fx.push({ el, t0: performance.now(), ms, draw });

  const land = (d, now) => {
    landed[d.target].push(now);
    const end = d.path.getPointAtLength(d.len);
    const overloaded = shown[d.target] > CAPACITY;
    if (overloaded && Math.random() < 0.6) {
      // The pod cannot keep up: this batch fails and drifts back as an ×.
      const y = end.y + (Math.random() - .5) * 26, x = end.x - 6;
      const el = svg("path", { class: "drop", d: "M-3 -3 L3 3 M3 -3 L-3 3" }, fxLayer);
      spawn(el, 900, (k) => {
        el.setAttribute("transform", `translate(${x - 22 * k} ${y})`);
        el.setAttribute("opacity", 1 - k);
      });
    } else if (!calm.matches) {
      const el = svg("circle", { class: "ring", cx: end.x, cy: end.y }, fxLayer);
      spawn(el, 450, (k) => { el.setAttribute("r", 3 + 9 * k); el.setAttribute("opacity", 1 - k); });
    }
  };

  const moveDot = (d, now) => {
    const k = Math.min(1, (now - d.t0) / DURATION);
    const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const p = d.path.getPointAtLength(e * d.len);
    const q = d.path.getPointAtLength(Math.max(0, e * d.len - 16));
    d.dot.setAttribute("cx", p.x); d.dot.setAttribute("cy", p.y);
    d.trail.setAttribute("x1", q.x); d.trail.setAttribute("y1", q.y);
    d.trail.setAttribute("x2", p.x); d.trail.setAttribute("y2", p.y);
    if (k < 1) return true;
    d.g.remove(); land(d, now);
    return false;
  };

  const render = (now) => {
    pods.forEach((pod, i) => {
      shown[i] += (rate(landed[i], now) - shown[i]) * 0.08;
      const hot = shown[i] > CAPACITY;
      setText(pod.querySelector("[data-count]"), fmt(shown[i]));
      setText(pod.querySelector("[data-status]"), hot ? "overloaded" : shown[i] < 5 ? "idle" : "healthy");
      pod.querySelector("[data-bar]").setAttribute("width", Math.min(BAR_W, BAR_W * shown[i] / BAR_MAX).toFixed(1));
      pod.classList.toggle("hot", hot);
    });
    shownTotal += (rate(sent, now) - shownTotal) * 0.08;
    setText(total.firstChild, fmt(shownTotal) + " ");
    if (now - listAt > 1000) {
      listAt = now;
      list.forEach((li, i) => setText(li, `pod-${"abcd"[i]}: ${fmt(shown[i])} requests per second, ${pods[i].querySelector("[data-status]").textContent}`));
    }
  };

  const frame = (now) => {
    // After a hidden tab, skip the backlog instead of firing a burst.
    if (now - last > 500) nextAt = now;
    last = now;
    while (now >= nextAt) { send(now); nextAt += (1000 / PER_SEC) * (0.6 + Math.random() * 0.8); }
    dots = dots.filter((d) => moveDot(d, now));
    fx = fx.filter((f) => {
      const k = Math.min(1, (now - f.t0) / f.ms);
      f.draw(k);
      if (k < 1) return true;
      f.el.remove();
      return false;
    });
    render(now);
    requestAnimationFrame(frame);
  };

  buttons.forEach((b) => b.addEventListener("click", () => { if (b.dataset.mode !== mode) setMode(b.dataset.mode); }));
  setMode("l4");
  requestAnimationFrame(frame);
});
