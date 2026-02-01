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
const directOrderForm = document.getElementById('directOrderForm');
const orderSuccessDiv = document.getElementById('orderSuccess');

if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) return alert("Cart is empty!");

        // Generate Summary for AI
        let itemsStr = cart.map(item => item.name).join(', ');
        let total = cart.reduce((sum, item) => sum + parseFloat(item.price), 0);

        const msg = `BUY_NOW: ${itemsStr} - Total Rs. ${total.toLocaleString()}`;
        window.location.href = `U-CHAT/index.html?orderText=${encodeURIComponent(msg)}`;
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

// DIRECT ORDER SUBMISSION (DARAZ STYLE)
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

if (directOrderForm) {
    directOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (cart.length === 0) return;

        const btn = document.getElementById('confirmOrderBtn');
        btn.disabled = true;
        btn.textContent = "Processing...";

        try {
            let itemsSummary = `*Cart Order*\n`;
            let total = 0;
            cart.forEach(item => {
                itemsSummary += `- ${item.name} (Rs. ${item.price})\n`;
                total += parseFloat(item.price);
            });

            const orderData = {
                customerName: document.getElementById('custName').value,
                customerPhone: document.getElementById('custPhone').value,
                customerAddress: document.getElementById('custAddress').value,
                customerCity: document.getElementById('custCity').value,
                customerCode: document.getElementById('custPhone').value,
                summary: itemsSummary,
                totalPrice: total,
                status: 'pending',
                timestamp: serverTimestamp()
            };

            await addDoc(collection(db, "orders"), orderData);

            // Hide form and show success
            directOrderForm.style.display = 'none';
            orderSuccessDiv.style.display = 'block';

        } catch (error) {
            console.error("Order error:", error);
            alert("Failed to place order. Please try again.");
            btn.disabled = false;
            btn.textContent = "Confirm Direct Order";
        }
    });
}

// Init
loadSettings();
renderCart();
