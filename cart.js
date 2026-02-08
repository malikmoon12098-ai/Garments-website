import { db } from './firebase-config.js';
import { doc, getDoc, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showToast } from './ui-utils.js';

const cartList = document.getElementById('cartList');
const cartSummary = document.getElementById('cartSummary');
const cartTotalEl = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const cartCountHeader = document.getElementById('cartCountHeader');

// Modal Elements
const orderModal = document.getElementById('orderModal');
const closeModal = document.getElementById('closeModal');
const directOrderForm = document.getElementById('directOrderForm');
const orderSuccess = document.getElementById('orderSuccess');

let cart = JSON.parse(localStorage.getItem('cart') || '[]');

function renderCart() {
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
        const qty = item.qty || 1;
        const itemTotal = parseFloat(item.price) * qty;
        total += itemTotal;
        return `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/80'">
            <div class="item-details">
                <h4>${item.name}</h4>
                <div class="item-price">Rs. ${parseFloat(item.price).toLocaleString()} x ${qty}</div>
            </div>
            <button class="remove-btn" data-index="${index}">Remove</button>
        </div>
        `;
    }).join('');

    cartTotalEl.textContent = `Rs. ${total.toLocaleString()}`;
    cartSummary.style.display = 'block';

    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.onclick = (e) => {
            const index = parseInt(e.target.dataset.index);
            removeItem(index);
        };
    });
}

function removeItem(index) {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    renderCart();
}

// Modal Toggle
if (checkoutBtn) {
    checkoutBtn.onclick = () => {
        if (cart.length === 0) return;
        orderModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    };
}

// WhatsApp Checkout
const checkoutWhatsAppBtn = document.getElementById('checkoutWhatsAppBtn');
if (checkoutWhatsAppBtn) {
    checkoutWhatsAppBtn.onclick = async () => {
        if (cart.length === 0) return;

        checkoutWhatsAppBtn.textContent = "Connecting...";
        checkoutWhatsAppBtn.disabled = true;

        try {
            const contactSnap = await getDoc(doc(db, "settings", "contact"));
            checkoutWhatsAppBtn.textContent = "Checkout via WhatsApp";
            checkoutWhatsAppBtn.disabled = false;

            if (contactSnap.exists()) {
                const data = contactSnap.data();
                if (data.phone) {
                    let totalBill = 0;
                    let summaryString = "Assalam o Alaikum! I want to order these items from my cart:\n\n";

                    cart.forEach((item, index) => {
                        const qty = item.qty || 1;
                        const price = parseFloat(item.price);
                        totalBill += price * qty;
                        summaryString += `${index + 1}. *${item.name}*\n   Qty: ${qty} | Price: Rs. ${price.toLocaleString()}\n\n`;
                    });

                    summaryString += `*Total Amount: Rs. ${totalBill.toLocaleString()}*`;

                    let cleanPhone = data.phone.replace(/\D/g, '');
                    if (cleanPhone.startsWith('0')) {
                        cleanPhone = '92' + cleanPhone.substring(1);
                    } else if (!cleanPhone.startsWith('92')) {
                        cleanPhone = '92' + cleanPhone;
                    }

                    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(summaryString)}`;
                    window.open(url, '_blank');
                } else {
                    showToast("Store WhatsApp number not set.", "error");
                }
            }
        } catch (err) {
            console.error(err);
            checkoutWhatsAppBtn.textContent = "Checkout via WhatsApp";
            checkoutWhatsAppBtn.disabled = false;
        }
    };
}

// Facebook & Instagram Checkout Logic
const checkoutFacebookBtn = document.getElementById('checkoutFacebookBtn');
const checkoutInstagramBtn = document.getElementById('checkoutInstagramBtn');

async function handleSocialCheckout(platform) {
    if (cart.length === 0) return;

    const btn = platform === 'Facebook' ? checkoutFacebookBtn : checkoutInstagramBtn;
    const originalText = btn.textContent;
    btn.textContent = "Processing...";
    btn.disabled = true;

    try {
        const contactSnap = await getDoc(doc(db, "settings", "contact"));
        btn.textContent = originalText;
        btn.disabled = false;

        let totalBill = 0;
        let summaryString = "Assalam o Alaikum! I want to order these items from my cart:\n\n";

        cart.forEach((item, index) => {
            const qty = item.qty || 1;
            const price = parseFloat(item.price);
            totalBill += price * qty;
            summaryString += `${index + 1}. *${item.name}*\n   Qty: ${qty} | Price: Rs. ${price.toLocaleString()}\n\n`;
        });

        summaryString += `*Total Amount: Rs. ${totalBill.toLocaleString()}*`;

        // Copy to clipboard
        await navigator.clipboard.writeText(summaryString);
        showToast("Order copied! Paste it in chat.", "success");

        if (contactSnap.exists()) {
            const data = contactSnap.data();
            if (platform === 'Facebook') {
                if (data.fb) {
                    let pageId = data.fb.trim();
                    if (pageId.includes('facebook.com/')) {
                        pageId = pageId.split('facebook.com/')[1].split('/')[0].split('?')[0];
                    }
                    window.open(`https://m.me/${pageId}`, '_blank');
                } else {
                    window.open("https://facebook.com", "_blank");
                }
            } else if (platform === 'Instagram') {
                const url = data.insta ? data.insta : "https://instagram.com";
                window.open(url, '_blank');
            }
        } else {
            // Fallback
            window.open(platform === 'Facebook' ? "https://facebook.com" : "https://instagram.com", "_blank");
        }

    } catch (err) {
        console.error(err);
        showToast("Error processing request", "error");
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

if (checkoutFacebookBtn) {
    checkoutFacebookBtn.onclick = () => handleSocialCheckout('Facebook');
}
if (checkoutInstagramBtn) {
    checkoutInstagramBtn.onclick = () => handleSocialCheckout('Instagram');
}
if (closeModal) {
    closeModal.onclick = () => {
        orderModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    };
}


// Direct Order Submission
if (directOrderForm) {
    directOrderForm.onsubmit = async (e) => {
        e.preventDefault();
        const confirmBtn = document.getElementById('confirmOrderBtn');
        const name = document.getElementById('custName').value.trim();
        const phone = document.getElementById('custPhone').value.trim();
        const address = document.getElementById('custAddress').value.trim();
        const city = document.getElementById('custCity').value.trim();

        confirmBtn.disabled = true;
        confirmBtn.textContent = "Placing Order...";

        try {
            let totalBill = 0;
            let summaryString = "";

            cart.forEach(item => {
                const qty = item.qty || 1;
                const price = parseFloat(item.price);
                totalBill += price * qty;
                summaryString += `- ${qty}x ${item.name} (Rs. ${price})\n`;
            });

            const orderData = {
                customerName: name,
                customerPhone: phone,
                customerAddress: address,
                customerCity: city,
                items: cart, // Store full cart for reference
                totalPrice: totalBill,
                status: 'pending',
                timestamp: serverTimestamp(),
                summary: summaryString
            };

            await addDoc(collection(db, "orders"), orderData);

            // Success UI
            directOrderForm.style.display = 'none';
            orderSuccess.style.display = 'block';

        } catch (err) {
            console.error(err);
            showToast("Order failed: " + err.message, "error");
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Confirm Order";
        }
    };
}

// Listen for updates from other pages or same page
window.addEventListener('cartUpdated', () => {
    cart = JSON.parse(localStorage.getItem('cart') || '[]');
    renderCart();
});

window.addEventListener('storage', () => {
    cart = JSON.parse(localStorage.getItem('cart') || '[]');
    renderCart();
});

renderCart();
