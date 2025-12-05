//
// Image Search Service - mock-first with backend fallback
//
// PUBLIC_INTERFACE
export async function searchByImage(file, { altText = "", useBackendIfAvailable = true } = {}) {
  /**
   * This function accepts an image File and tries to find matching products either via backend
   * POST /api/search/image or, if unavailable or failing, via a mock heuristic that searches
   * mock products by filename/alt text keywords.
   *
   * Returns: Array of { product, score } objects sorted by score desc.
   */
  // Try backend if enabled
  if (useBackendIfAvailable) {
    try {
      const base = process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_BASE || "";
      if (base) {
        const url = `${base.replace(/\/$/, "")}/api/search/image`;
        const form = new FormData();
        form.append("file", file);
        if (altText) form.append("altText", altText);

        const res = await fetch(url, { method: "POST", body: form });
        if (res.ok) {
          const data = await res.json();
          // Expect data as [{ product, score }] or [{ product_id, score }]
          if (Array.isArray(data) && data.length) {
            return await normalizeBackendResults(data);
          }
        }
      }
    } catch (e) {
      // swallow and fallback to mock
      // console.warn("Backend image search failed, falling back to mock.", e);
    }
  }

  // Fallback to mock heuristic matcher
  return mockHeuristicMatch(file, altText);
}

async function normalizeBackendResults(data) {
  // Normalize potential backend results to { product, score }
  // If a result has product object, return as is; if has product_id, fetch product by id.
  const hasProductObjects = data.every((d) => d && d.product);
  if (hasProductObjects) {
    return data
      .map((d) => ({ product: d.product, score: d.score ?? 0.5 }))
      .sort((a, b) => b.score - a.score);
  }
  // If product_id, use productByIdService
  try {
    const { getProductById } = await import("./productByIdService");
    const resolved = [];
    for (const d of data) {
      if (d && (d.product_id || d.productId)) {
        const id = d.product_id ?? d.productId;
        const product = await getProductById(id);
        if (product) resolved.push({ product, score: d.score ?? 0.5 });
      }
    }
    return resolved.sort((a, b) => b.score - a.score);
  } catch {
    return [];
  }
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);
}

function keywordScore(keywords, text) {
  const lower = String(text || "").toLowerCase();
  let score = 0;
  for (const k of keywords) {
    if (!k) continue;
    if (lower.includes(k)) score += 1;
  }
  return score;
}

function guessKeywordsFromFilename(name) {
  const tokens = tokenize(name);
  // Common grocery keywords mapping e.g., apple -> apple, banana -> banana, milk, bread, egg, tomato, potato, onion, orange, grape, yogurt, cheese
  return tokens;
}

async function loadAllProducts() {
  // Prefer service, fallback to mock
  try {
    const { getProducts } = await import("./productsService");
    const products = await getProducts({ search: "", category: "", page: 1, page_size: 500 });
    if (Array.isArray(products) && products.length) return products;
  } catch {
    // ignore
  }
  const mock = await import("../mock/products");
  // Support both default export array or named export
  const products = mock.default || mock.products || [];
  return products;
}

function computeSimilarityScore(product, keywords) {
  // Simple weighted score using name and description
  const nameScore = keywordScore(keywords, product.name || "");
  const descScore = keywordScore(keywords, product.description || "");
  // weight name higher
  return nameScore * 2 + descScore * 1;
}

async function mockHeuristicMatch(file, altText) {
  const filename = file?.name || "";
  const keywords = [
    ...new Set([...guessKeywordsFromFilename(filename), ...tokenize(altText)]),
  ];
  const products = await loadAllProducts();
  const scored = products
    .map((p) => ({ product: p, score: computeSimilarityScore(p, keywords) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  // If nothing matched, try a loose fallback: if filename has category words
  if (!scored.length && keywords.length) {
    const loose = products
      .map((p) => ({
        product: p,
        score:
          keywordScore(keywords, p.category || "") * 1 +
          keywordScore(keywords, p.name || "") * 0.5,
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    return loose.slice(0, 10);
  }

  return scored.slice(0, 10);
}
