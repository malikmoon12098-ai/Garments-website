import { db } from './firebase-config.js';
import { doc, getDoc, collection, addDoc, query, where, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showToast, openSocialApp, showConfirm } from './ui-utils.js';

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
const buyNowBtn = document.getElementById('buyNowBtn');
const cartBtn = document.getElementById('addToCartBtn');

// Qty Elements
const qtyInput = document.getElementById('pQty');
const qtyPlus = document.getElementById('qtyPlus');
const qtyMinus = document.getElementById('qtyMinus');

// Modal Elements
const orderModal = document.getElementById('orderModal');
const closeModal = document.getElementById('closeModal');
const directOrderForm = document.getElementById('directOrderForm');
const orderFormContainer = document.getElementById('orderFormContainer');
const orderSuccess = document.getElementById('orderSuccess');
const successProductName = document.getElementById('successProductName');
const phoneError = document.getElementById('phoneError');

// Social Modal Elements
const socialModal = document.getElementById('socialContactModal');
const closeSocialModal = document.getElementById('closeSocialModal');
const btnWA = document.getElementById('buyWhatsApp');
const btnDirect = document.getElementById('buyDirect');


let currentProduct = null;
let contactSettings = null; // Store settings globally

async function initProduct() {
    if (!productId) {
        window.location.href = 'shop.html';
        return;
    }

    try {
        const docRef = doc(db, "products", productId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            currentProduct = { id: docSnap.id, ...docSnap.data() };
            renderProduct(currentProduct);
        } else {
            loadingDiv.innerHTML = '<p>Product not found.</p>';
            return;
        }

        // Pre-load contact settings
        try {
            const contactSnap = await getDoc(doc(db, "settings", "contact"));
            if (contactSnap.exists()) {
                contactSettings = contactSnap.data();
            }
        } catch (e) {
            console.error("Error loading settings:", e);
        }
    } catch (error) {
        console.error("Error loading product:", error);
        loadingDiv.innerHTML = '<p>Error loading product details.</p>';
    }
}

function renderProduct(product) {
    imgEl.src = product.image;
    catEl.textContent = product.category;
    const targetEl = document.getElementById('displayTarget');
    if (targetEl) targetEl.textContent = product.target || 'MEN';
    titleEl.textContent = product.name;
    priceEl.textContent = `Rs. ${parseFloat(product.price).toLocaleString()}`;
    descEl.textContent = product.description || "No description available for this product.";

    loadingDiv.style.display = 'none';
    contentDiv.style.display = 'grid';

    if (product.inStock === false) {
        buyNowBtn.disabled = true;
        buyNowBtn.textContent = "OUT OF STOCK";
        buyNowBtn.style.background = "#ccc";
        buyNowBtn.style.cursor = "not-allowed";

        cartBtn.disabled = true;
        cartBtn.textContent = "Unavailable";
        cartBtn.style.borderColor = "#ccc";
        cartBtn.style.color = "#ccc";
        cartBtn.style.cursor = "not-allowed";

        priceEl.innerHTML += ' <span style="color: red; font-size: 1rem; font-weight: bold; margin-left: 10px;">(SOLD OUT)</span>';
    }
}

// Qty Controls
if (qtyPlus) {
    qtyPlus.onclick = () => {
        let val = parseInt(qtyInput.value);
        if (val < 99) qtyInput.value = val + 1;
    }
}
if (qtyMinus) {
    qtyMinus.onclick = () => {
        let val = parseInt(qtyInput.value);
        if (val > 1) qtyInput.value = val - 1;
    }
}

// Modal Toggle
if (buyNowBtn) {
    buyNowBtn.onclick = () => {
        if (!currentProduct) return;

        const originalText = buyNowBtn.textContent;
        // Check pre-loaded settings
        const data = contactSettings;

        try {
            if (data) {
                const productDetails = `Assalam o Alaikum! I'm interested in buying this product:\n\n*Product:* ${currentProduct.name}\n*Price:* Rs. ${currentProduct.price}\n*Qty:* ${qtyInput.value}\n*Link:* ${window.location.href}`;

                // Helper to log inquiry (Fire and forget - no await)
                const logInquiry = (platform) => {
                    const inquiry = {
                        productId: currentProduct.id,
                        productName: currentProduct.name,
                        productPrice: currentProduct.price,
                        productImage: currentProduct.image,
                        platform: platform,
                        status: 'new',
                        timestamp: serverTimestamp(),
                        qty: parseInt(qtyInput.value) || 1
                    };
                    addDoc(collection(db, "inquiries"), inquiry).catch(e => console.error("Error logging inquiry", e));
                };

                if (data.phone) {
                    btnWA.onclick = () => {
                        logInquiry('WhatsApp');

                        let cleanPhone = data.phone.replace(/\D/g, '');
                        if (cleanPhone.startsWith('0')) cleanPhone = '92' + cleanPhone.substring(1);
                        else if (!cleanPhone.startsWith('92')) cleanPhone = '92' + cleanPhone;

                        const text = encodeURIComponent(productDetails);
                        const webUrl = `https://wa.me/${cleanPhone}?text=${text}`;
                        const appUri = `whatsapp://send?phone=${cleanPhone}&text=${text}`;

                        // Fallback to Direct Order if WhatsApp app is not found
                        openSocialApp('WhatsApp', null, appUri, () => {
                            showToast("WhatsApp app not found. Switching to Direct Order Form...", "info");
                            socialModal.style.display = 'none';
                            orderModal.style.display = 'flex';
                        });
                    };
                }

                // Direct Order Button
                if (btnDirect) {
                    btnDirect.onclick = () => {
                        socialModal.style.display = 'none';
                        orderModal.style.display = 'flex';
                    };
                }

                socialModal.style.display = 'flex';
                document.body.style.overflow = 'hidden';

            } else {
                // If no settings loaded, fallback to direct order modal
                orderModal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }
        } catch (err) {
            console.error(err);
            buyNowBtn.textContent = originalText;
            buyNowBtn.disabled = false;
            orderModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }
}

if (closeModal) {
    closeModal.onclick = () => {
        orderModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

if (closeSocialModal) {
    closeSocialModal.onclick = () => {
        socialModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Helper to save order
async function saveOrder(orderData, confirmBtn) {
    try {
        await addDoc(collection(db, "orders"), orderData);
        // Success UI
        successProductName.textContent = currentProduct.name;
        orderFormContainer.style.display = 'none';
        orderSuccess.style.display = 'block';
    } catch (err) {
        console.error(err);
        showToast("Order failed: " + err.message, "error");
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Place Order Now";
    }
}

// Form Submission
if (directOrderForm) {
    directOrderForm.onsubmit = async (e) => {
        e.preventDefault();
        const confirmBtn = document.getElementById('confirmOrderBtn');
        const phone = document.getElementById('custPhone').value.trim();
        const name = document.getElementById('custName').value.trim();
        const address = document.getElementById('custAddress').value.trim();
        const city = document.getElementById('custCity').value.trim();
        const qty = parseInt(qtyInput.value);

        if (!currentProduct) return;

        confirmBtn.disabled = true;
        confirmBtn.textContent = "Checking Order History...";
        phoneError.style.display = 'none';

        try {
            // Check for existing orders with this phone for this product
            const q = query(collection(db, "orders"),
                where("customerPhone", "==", phone),
                where("productId", "==", currentProduct.id)
            );

            const querySnapshot = await getDocs(q);
            let hasPending = false;
            let hasCompleted = false;

            querySnapshot.forEach(doc => {
                const status = doc.data().status;
                if (status === 'pending') hasPending = true;
                if (status === 'completed') hasCompleted = true;
            });

            if (hasPending) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = "Place Order Now";
                phoneError.style.display = 'block';
                return;
            }

            const orderData = {
                customerName: name,
                customerPhone: phone,
                customerAddress: address,
                customerCity: city,
                productId: currentProduct.id,
                productName: currentProduct.name,
                productPrice: currentProduct.price,
                qty: qty,
                totalPrice: currentProduct.price * qty,
                status: 'pending',
                timestamp: serverTimestamp(),
                summary: `${qty}x ${currentProduct.name} (Rs. ${currentProduct.price}/ea)`
            };

            if (hasCompleted) {
                showConfirm("Re-order Confirmation", "You have previously ordered this product. Would you like to place this order again?", async () => {
                    await saveOrder(orderData, confirmBtn);
                });
                confirmBtn.disabled = false;
                confirmBtn.textContent = "Place Order Now";
                return;
            }

            // Save Order Directly if no previous order
            await saveOrder(orderData, confirmBtn);

        } catch (err) {
            console.error(err);
            showToast("Order failed: " + err.message, "error");
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Place Order Now";
        }
    }
}

// Add to Cart Logic (Unchanged but updated for qty if needed, keeping it simple for now as requested)
if (cartBtn) {
    cartBtn.addEventListener('click', () => {
        console.log("Add to Cart clicked");
        if (!currentProduct) {
            console.error("No currentProduct found");
            return;
        }
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        console.log("Current Cart:", cart);
        const totalQty = parseInt(qtyInput.value);

        const existsIndex = cart.findIndex(item => item.id === currentProduct.id);
        if (existsIndex > -1) {
            // Update quantity if exists
            cart[existsIndex].qty = (cart[existsIndex].qty || 1) + totalQty;
        } else {
            cart.push({ ...currentProduct, qty: totalQty });
        }

        console.log("New Cart:", cart);
        localStorage.setItem('cart', JSON.stringify(cart));
        window.dispatchEvent(new Event('cartUpdated'));

        cartBtn.textContent = "Added to Cart ✓";
        setTimeout(() => cartBtn.textContent = "Add to Cart", 2000);
    });
}

initProduct();
