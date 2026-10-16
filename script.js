const API_URL = "https://dummyjson.com/products?limit=30&select=title,price,category,thumbnail";
const TIMEOUT_MS = 10000;
const PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><rect width='300' height='300' fill='#cbd5e1'/>" +
  "<text x='150' y='156' font-family='sans-serif' font-size='18' text-anchor='middle' fill='#475569'>No image</text></svg>"
);

const grid = document.getElementById("grid");
const statusBox = document.getElementById("status");
const searchInput = document.getElementById("search");
const categorySelect = document.getElementById("category");
const stats = document.getElementById("stats");
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

let allProducts = [];

// Fetch products with async/await. Throws a readable Error on any failure.
async function fetchProducts() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(API_URL, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`The server responded with status ${response.status}.`);
    }
    const data = await response.json();
    if (!data || !Array.isArray(data.products)) {
      throw new Error("The API returned data in an unexpected format.");
    }
    return data.products;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("The request timed out. Check your connection and try again.");
    }
    if (err instanceof TypeError) {
      throw new Error("Could not reach the API. You may be offline or the request was blocked.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function showLoading() {
  statusBox.innerHTML = "";
  grid.innerHTML = "";
  for (let i = 0; i < 8; i++) {
    const s = document.createElement("div");
    s.className = "skeleton";
    grid.appendChild(s);
  }
}

function showError(message) {
  grid.innerHTML = "";
  stats.hidden = true;
  statusBox.innerHTML = "";
  const box = document.createElement("div");
  box.className = "message error";
  box.setAttribute("role", "alert");
  const p = document.createElement("p");
  p.textContent = "Products failed to load. " + message;
  const retry = document.createElement("button");
  retry.textContent = "Try again";
  retry.addEventListener("click", loadDashboard);
  box.append(p, retry);
  statusBox.appendChild(box);
}

function createCard(product) {
  const card = document.createElement("article");
  card.className = "card";

  const img = document.createElement("img");
  img.src = product.thumbnail || PLACEHOLDER;
  img.alt = product.title;
  img.loading = "lazy";
  img.addEventListener("error", () => { img.src = PLACEHOLDER; }, { once: true });

  const body = document.createElement("div");
  body.className = "body";

  const name = document.createElement("h2");
  name.className = "name";
  name.textContent = product.title;

  const cat = document.createElement("span");
  cat.className = "cat";
  cat.textContent = String(product.category).replace(/-/g, " ");

  const price = document.createElement("div");
  price.className = "price";
  price.textContent = money.format(product.price);

  body.append(name, cat, price);
  card.append(img, body);
  return card;
}

function render() {
  const term = searchInput.value.trim().toLowerCase();
  const cat = categorySelect.value;
  const visible = allProducts.filter(p =>
    (cat === "all" || p.category === cat) && p.title.toLowerCase().includes(term)
  );

  grid.innerHTML = "";
  statusBox.innerHTML = "";
  visible.forEach(p => grid.appendChild(createCard(p)));

  if (visible.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No products match your search. Try a different name or category.";
    statusBox.appendChild(empty);
  }

  const avg = visible.length ? visible.reduce((sum, p) => sum + p.price, 0) / visible.length : 0;
  document.getElementById("statCount").textContent = visible.length;
  document.getElementById("statCats").textContent = new Set(visible.map(p => p.category)).size;
  document.getElementById("statAvg").textContent = money.format(avg);
  stats.hidden = false;
}

function fillCategories() {
  const cats = [...new Set(allProducts.map(p => p.category))].sort();
  categorySelect.length = 1;
  cats.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c.replace(/-/g, " ");
    categorySelect.appendChild(opt);
  });
}

async function loadDashboard() {
  showLoading();
  searchInput.disabled = categorySelect.disabled = true;
  try {
    allProducts = await fetchProducts();
    fillCategories();
    searchInput.disabled = categorySelect.disabled = false;
    render();
  } catch (err) {
    console.error("Product fetch failed:", err);
    showError(err.message);
  }
}

searchInput.addEventListener("input", render);
categorySelect.addEventListener("change", render);
loadDashboard();
