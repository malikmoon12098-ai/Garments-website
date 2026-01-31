import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const cartList = document.getElementById('cartList');
const cartSummary = document.getElementById('cartSummary');
const cartTotalEl = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const cartCountHeader = document.getElementById('cartCountHeader');

let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let ownerPhone = '';

// Load Owner Phone
async function loadSettings() {
    try {
        const docSnap = await getDoc(doc(db, "settings", "contact"));
        if (docSnap.exists()) {
            ownerPhone = docSnap.data().phone || '';
            ownerPhone = ownerPhone.replace(/\D/g, '');
        }
    } catch (error) {
        console.error("Error loading settings:", error);
    }
}

function renderCart() {
    // Update Header Count
    if (cartCountHeader) {
        cartCountHeader.textContent = `(${cart.length})`;
    }

    if (cart.length === 0) {
        cartList.innerHTML = '<div class="empty-cart"><h3>Your cart is empty</h3><a href="shop.html" style="text-decoration: underline; margin-top: 10px; display: block;">Go to Shop</a></div>';
        cartSummary.style.display = 'none';
        return;
    }

    let total = 0;

    cartList.innerHTML = cart.map((item, index) => {
        total += parseFloat(item.price);
        return `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/80'">
            <div class="item-details">
                <h4>${item.name}</h4>
                <div class="item-price">Rs. ${parseFloat(item.price).toLocaleString()}</div>
            </div>
            <button class="remove-btn" data-index="${index}">Remove</button>
        </div>
        `;
    }).join('');

    cartTotalEl.textContent = `Rs. ${total.toLocaleString()}`;
    cartSummary.style.display = 'block';

    // Add Event Listeners for Remove Buttons
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'));
            removeItem(index);
        });
    });
}

function removeItem(index) {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
}

if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) return alert("Cart is empty!");

        let message = `*New Order Request*\n`;
        let total = 0;

        cart.forEach(item => {
            message += `- ${item.name} (Rs. ${item.price})\n`;
            total += parseFloat(item.price);
        });

        message += `\n*Total Bill:* Rs. ${total}\n\nI want to order these items. Please confirm.`;

        // Redirect to U-CHAT with parameters
        const uChatUrl = `U-CHAT/index.html?orderText=${encodeURIComponent(message)}`;
        window.location.href = uChatUrl;
    });
}

// Init
loadSettings();
renderCart();
