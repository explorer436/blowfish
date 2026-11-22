(async function () {
  const container = document.getElementById("page-connections");
  if (!container) return;

  const normalize = (url) => {
    const clean = (url || "").split("#")[0].split("?")[0];
    return clean.length > 1 ? clean.replace(/\/+$/, "") : clean;
  };

  const currentUrl = normalize(container.dataset.pageUrl);
  const backlinksEl = document.getElementById("backlinks-list");
  const localGraphEl = document.getElementById("local-graph-list");

  try {
    const res = await fetch("/graph.json", { cache: "default" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const nodeByUrl = new Map(
      (data.nodes || []).map((n) => [normalize(n.url), { ...n, url: normalize(n.url) }])
    );
    const edges = (data.edges || []).map((e) => ({
      source: normalize(e.source),
      target: normalize(e.target),
    }));

    // 1. Incoming links (backlinks)
    const incomingUrls = [
      ...new Set(edges.filter((e) => e.target === currentUrl).map((e) => e.source)),
    ];

    // 2. Outgoing links + 1-hop neighbors (local graph)
    const outgoingUrls = [
      ...new Set(edges.filter((e) => e.source === currentUrl).map((e) => e.target)),
    ];
    const neighborUrls = [...new Set([...incomingUrls, ...outgoingUrls])].filter(
      (u) => u !== currentUrl
    );

    const renderList = (el, urls, emptyText) => {
      el.innerHTML = "";
      if (!urls.length) {
        const li = document.createElement("li");
        li.textContent = emptyText;
        el.appendChild(li);
        return;
      }
      for (const u of urls) {
        const node = nodeByUrl.get(u);
        if (!node) continue;
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = node.url;
        a.textContent = node.title || node.url;
        li.appendChild(a);
        el.appendChild(li);
      }
    };

    renderList(backlinksEl, incomingUrls, "No backlinks yet.");
    renderList(localGraphEl, neighborUrls, "No connected pages yet.");
  } catch (err) {
    backlinksEl.innerHTML = "<li>Could not load backlinks.</li>";
    localGraphEl.innerHTML = "<li>Could not load connections.</li>";
    console.error("Graph load failed:", err);
  }
})();