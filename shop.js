// Help prevent XSS
function escapeHTML(str) {
    if (!str) return "";
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
}

import { db } from './firebase-config.js';
import { collection, getDocs, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const shopGrid = document.getElementById('shopGrid');
const searchInput = document.getElementById('shopSearch');
const noResults = document.getElementById('noResults');

let allProducts = [];
let activeCategory = 'All';
let searchTerm = '';

// Load all products once
async function initShop() {
    try {
        // FIXED: Removed orderBy
        const q = query(collection(db, "products"));
        const querySnapshot = await getDocs(q);

        allProducts = [];
        querySnapshot.forEach((doc) => {
            allProducts.push({ id: doc.id, ...doc.data() });
        });

        // Client-side Sort
        allProducts.sort((a, b) => {
            const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
            const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
            return dateB - dateA;
        });

        setupCategoryDropdown();
        renderProducts();

    } catch (error) {
        console.error("Error initializing shop:", error);
        shopGrid.innerHTML = `<p style="text-align: center; color: red; padding: 20px;">
            <b>Failed to load products.</b><br>${error.message}
        </p>`;
    }
}

const categoryFilter = document.getElementById('categoryFilter');

// Generate Category Dropdown dynamically
function setupCategoryDropdown() {
    if (!categoryFilter) return;

    // Get unique categories from products
    const categories = [...new Set(allProducts.map(p => p.category))].sort();

    // Populate select options
    categoryFilter.innerHTML = `<option value="All">All Categories</option>` +
        categories.map(cat => `<option value="${escapeHTML(cat)}">${escapeHTML(cat)}</option>`).join('');

    // Add change event
    categoryFilter.addEventListener('change', (e) => {
        activeCategory = e.target.value;
        renderProducts();
    });
}

// Filter and Render Products
function renderProducts() {
    // 1. Filter by Category and Search Term
    const filtered = allProducts.filter(p => {
        const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.category.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // 2. Clear Grid
    shopGrid.innerHTML = '';

    // 3. Handle No Results
    if (filtered.length === 0) {
        noResults.style.display = 'block';
        return;
    }
    noResults.style.display = 'none';

    // 4. Inject Product Cards
    // 4. Inject Product Cards
    // 4. Inject Product Cards
    shopGrid.innerHTML = filtered.map(p => {
        const isOutOfStock = p.inStock === false;
        return `
        <div class="product-card fade-in">
            <a href="product.html?id=${p.id}" style="text-decoration: none; color: inherit;">
                <div class="product-img">
                    ${isOutOfStock ? '<div class="out-of-stock-badge">SOLD OUT</div>' : ''}
                    <img src="${p.image}" alt="${escapeHTML(p.name)}" onerror="this.src='https://via.placeholder.com/400x500'" 
                         style="${isOutOfStock ? 'filter: grayscale(100%); opacity: 0.7;' : ''}">
                </div>
                <div class="product-info">
                    <span class="category">${escapeHTML(p.category)}</span>
                    <h3 class="name">${escapeHTML(p.name)}</h3>
                    <span class="price">Rs. ${parseFloat(p.price).toLocaleString()}</span>
                </div>
            </a>
        </div>
    `}).join('');
}

// Live Search Listener
searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value;
    renderProducts();
});

initShop();
