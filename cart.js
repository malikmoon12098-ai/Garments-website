import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const cartList = document.getElementById('cartList');
const cartSummary = document.getElementById('cartSummary');
const cartTotalEl = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const cartCountHeader = document.getElementById('cartCountHeader');

let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let ownerPhone = '';
let ownerInsta = '';
let ownerFB = '';

// Load Owner Phone
async function loadSettings() {
    try {
        const docSnap = await getDoc(doc(db, "settings", "contact"));
        if (docSnap.exists()) {
            const sData = docSnap.data();
            ownerPhone = sData.phone || '';
            ownerPhone = ownerPhone.replace(/\D/g, '');
            ownerInsta = sData.insta || '';
            ownerFB = sData.fb || '';
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

// ACTION: Checkout (Open Modal)
const orderModal = document.getElementById('orderModal');
const closeModal = document.getElementById('closeModal');

if (checkoutBtn && orderModal) {
    checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) return alert("Cart is empty!");
        orderModal.style.display = 'flex';
    });
}

if (closeModal) {
    closeModal.addEventListener('click', () => {
        orderModal.style.display = 'none';
    });
}

window.addEventListener('click', (e) => {
    if (e.target === orderModal) orderModal.style.display = 'none';
});

// SOCIAL INDIVIDUAL ACTIONS
const shareWA = document.getElementById('shareWA');
const shareFB = document.getElementById('shareFB');
const shareIG = document.getElementById('shareIG');

function getCartText() {
    let message = `*New Order Request*\n`;
    let total = 0;

    cart.forEach(item => {
        message += `- ${item.name} (Rs. ${item.price})\n`;
        total += parseFloat(item.price);
    });

    message += `\n*Total Bill:* Rs. ${total}\n\nI want to order these items. Please confirm.`;
    return message;
}

if (shareWA) {
    shareWA.addEventListener('click', () => {
        const text = encodeURIComponent(getCartText());
        const url = `https://wa.me/${ownerPhone}?text=${text}`;
        window.open(url, '_blank');
        orderModal.style.display = 'none';
    });
}

if (shareFB) {
    shareFB.addEventListener('click', () => {
        const text = getCartText();
        navigator.clipboard.writeText(text).then(() => {
            alert("Order details copied! Please paste it in Messenger.");
            const fbHandle = ownerFB.split('/').pop();
            const url = `https://m.me/${fbHandle}`;
            window.open(url, '_blank');
        });
        orderModal.style.display = 'none';
    });
}

if (shareIG) {
    shareIG.addEventListener('click', () => {
        const text = getCartText();
        navigator.clipboard.writeText(text).then(() => {
            alert("Order details copied! Please paste it in Instagram DM.");
            let handle = ownerInsta.replace('@', '').split('/').pop();
            const url = `https://www.instagram.com/${handle}/`;
            window.open(url, '_blank');
        });
        orderModal.style.display = 'none';
    });
}

// Init
loadSettings();
renderCart();
