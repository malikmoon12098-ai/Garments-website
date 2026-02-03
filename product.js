import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const productId = params.get('id');

const loadingDiv = document.getElementById('loading');
const contentDiv = document.getElementById('productContent');

// DOM Elements
const imgEl = document.getElementById('displayImage');
const catEl = document.getElementById('displayCategory');
const titleEl = document.getElementById('displayTitle');
const priceEl = document.getElementById('displayPrice');
const descEl = document.getElementById('displayDesc');
const buyBtn = document.getElementById('buyNowBtn');
const cartBtn = document.getElementById('addToCartBtn');

let currentProduct = null;
let ownerPhone = '';

async function initProduct() {
    if (!productId) {
        window.location.href = 'shop.html';
        return;
    }

    try {
        // 1. Fetch Product Data
        const docRef = doc(db, "products", productId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            currentProduct = { id: docSnap.id, ...docSnap.data() };
            renderProduct(currentProduct);
        } else {
            loadingDiv.innerHTML = '<p>Product not found.</p>';
            return;
        }

        // 2. Fetch Owner Phone for WhatsApp (Legacy but keeping settings fetch)
        const settingsSnap = await getDoc(doc(db, "settings", "contact"));
        if (settingsSnap.exists()) {
            ownerPhone = settingsSnap.data().phone || '';
            ownerPhone = ownerPhone.replace(/\D/g, '');
        }

    } catch (error) {
        console.error("Error loading product:", error);
        loadingDiv.innerHTML = '<p>Error loading product details.</p>';
    }
}

function renderProduct(product) {
    imgEl.src = product.image;
    catEl.textContent = product.category;
    titleEl.textContent = product.name;
    priceEl.textContent = `Rs. ${parseFloat(product.price).toLocaleString()}`;
    descEl.textContent = product.description || "No description available for this product.";

    loadingDiv.style.display = 'none';
    contentDiv.style.display = 'grid'; // Restore grid layout

    // Checked Stock Status
    if (product.inStock === false) {
        // Disable Buttons
        buyBtn.disabled = true;
        buyBtn.textContent = "OUT OF STOCK";
        buyBtn.style.background = "#ccc";
        buyBtn.style.cursor = "not-allowed";

        cartBtn.disabled = true;
        cartBtn.textContent = "Unavailable";
        cartBtn.style.borderColor = "#ccc";
        cartBtn.style.color = "#ccc";
        cartBtn.style.cursor = "not-allowed";

        // Add Badge to price
        priceEl.innerHTML += ' <span style="color: red; font-size: 1rem; font-weight: bold; margin-left: 10px;">(SOLD OUT)</span>';
    }
}

// ACTION: Buy Now (Redirect to U-CHAT)
if (buyBtn) {
    buyBtn.addEventListener('click', () => {
        if (!currentProduct) return;

        const text = `*Order Request*\n\n*Product:* ${currentProduct.name}\n*Price:* Rs. ${currentProduct.price}\n*Link:* ${window.location.href}\n*Image:* ${currentProduct.image}\n\nI want to buy this. Please confirm.`;

        // Redirect to U-CHAT with parameters
        const uChatUrl = `U-CHAT/index.html?orderText=${encodeURIComponent(text)}&pId=${productId}&pName=${encodeURIComponent(currentProduct.name)}&pPrice=${currentProduct.price}`;
        window.location.href = uChatUrl;
    });
}

// ACTION: Add to Cart
if (cartBtn) {
    cartBtn.addEventListener('click', () => {
        if (!currentProduct) return;
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');

        // Check if already in cart
        const exists = cart.find(item => item.id === currentProduct.id);
        if (exists) {
            alert("Item is already in your cart!");
            return;
        }

        cart.push(currentProduct);
        localStorage.setItem('cart', JSON.stringify(cart));
        window.dispatchEvent(new Event('cartUpdated'));

        cartBtn.textContent = "Added to Cart ✓";
        cartBtn.style.background = "#121212";
        cartBtn.style.color = "white";

        setTimeout(() => {
            cartBtn.textContent = "Add to Cart";
            cartBtn.style.background = "transparent";
            cartBtn.style.color = "var(--primary)";
        }, 2000);
    });
}

initProduct();
