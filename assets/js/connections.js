(async function () {
  const container = document.getElementById("page-connections");
  if (!container) return;

  const stripQuotes = (val) =>
    String(val ?? "").replace(/^"+|"+$/g, "").trim();

  const normalizePath = (url) => {
    const clean = decodeURIComponent(stripQuotes(url))
      .split("#")[0]
      .split("?")[0]
      .toLowerCase();
    return clean.length > 1 ? clean.replace(/\/+$/, "") : clean;
  };

  const currentPath = normalizePath(container.dataset.pageUrl);
  const backlinksEl = document.getElementById("backlinks-list");
  if (!backlinksEl) return;

  try {
    const res = await fetch("/graph.json", { cache: "default" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const nodeById = new Map();
    const nodeByFile = new Map();

    for (const raw of data.nodes || []) {
      const id = stripQuotes(raw.id);
      const file = normalizePath(raw.file);
      const title = stripQuotes(raw.title) || file || id;
      const node = { id, file, title };
      if (id) nodeById.set(id, node);
      if (file) nodeByFile.set(file, node);
    }

    const currentNode = nodeByFile.get(currentPath);
    if (!currentNode) {
      backlinksEl.innerHTML = "<li>No backlinks yet.</li>";
      return;
    }

    const resolveRef = (ref) => {
      const cleaned = stripQuotes(ref);
      return nodeById.get(cleaned) || nodeByFile.get(normalizePath(cleaned));
    };

    const links = (data.links || [])
      .map((l) => ({
        source: resolveRef(l.source),
        target: resolveRef(l.target),
      }))
      .filter((l) => l.source && l.target);

    const backlinks = [
      ...new Map(
        links
          .filter((l) => l.target.id === currentNode.id && l.source.id !== currentNode.id)
          .map((l) => [l.source.id, l.source])
      ).values(),
    ];

    backlinksEl.innerHTML = "";
    if (!backlinks.length) {
      const li = document.createElement("li");
      li.textContent = "No backlinks yet.";
      backlinksEl.appendChild(li);
      return;
    }

    for (const item of backlinks) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = item.file;
      a.textContent = item.title;
      li.appendChild(a);
      backlinksEl.appendChild(li);
    }
  } catch (err) {
    backlinksEl.innerHTML = "<li>Could not load backlinks.</li>";
    console.error("Graph load failed:", err);
  }
})();