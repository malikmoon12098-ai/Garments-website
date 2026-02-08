import { db } from './firebase-config.js';
import { doc, getDoc, collection, addDoc, query, where, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showToast } from './ui-utils.js';

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
const btnFB = document.getElementById('buyFacebook');
const btnIG = document.getElementById('buyInstagram');
const btnDirect = document.getElementById('buyDirect');

let currentProduct = null;

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
    buyNowBtn.onclick = async () => {
        if (!currentProduct) return;

        // Show loading state on button
        const originalText = buyNowBtn.textContent;
        buyNowBtn.textContent = "Connecting...";
        buyNowBtn.disabled = true;

        try {
            const contactSnap = await getDoc(doc(db, "settings", "contact"));
            buyNowBtn.textContent = originalText;
            buyNowBtn.disabled = false;

            if (contactSnap.exists()) {
                const data = contactSnap.data();
                let showCount = 0;

                const productDetails = `Assalam o Alaikum! I'm interested in buying this product:\n\n*Product:* ${currentProduct.name}\n*Price:* Rs. ${currentProduct.price}\n*Qty:* ${qtyInput.value}\n*Link:* ${window.location.href}`;

                // Helper to log inquiry
                const logInquiry = async (platform) => {
                    try {
                        const inquiry = {
                            productId: currentProduct.id,
                            productName: currentProduct.name,
                            productPrice: currentProduct.price,
                            productImage: currentProduct.image,
                            platform: platform,
                            status: 'new', // new | converted
                            timestamp: serverTimestamp(),
                            qty: parseInt(qtyInput.value) || 1
                        };
                        console.log("Logging inquiry:", inquiry);
                        await addDoc(collection(db, "inquiries"), inquiry);
                    } catch (e) {
                        console.error("Error logging inquiry", e);
                    }
                };

                if (data.phone) {
                    btnWA.style.display = 'block';
                    showCount++;
                    btnWA.onclick = async () => {
                        await logInquiry('WhatsApp');
                        let cleanPhone = data.phone.replace(/\D/g, '');
                        if (cleanPhone.startsWith('0')) {
                            cleanPhone = '92' + cleanPhone.substring(1);
                        } else if (!cleanPhone.startsWith('92')) {
                            cleanPhone = '92' + cleanPhone;
                        }
                        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(productDetails)}`;
                        window.open(url, '_blank');
                    };
                } else { btnWA.style.display = 'block'; /* Show anyway for consistent UX, defaulting to log only or error if no phone? user asked for buttons. Assuming phone is set. */ }

                // Force display buttons as per user request, even if contact settings missing (fallback to just logging or partial fail)
                // Actually, let's keep the check but ensure elements are visible if data exists.
                // The user's request implies these should ALWAYS work.

                // RE-BINDING CLICK HANDLERS WITH LOGGING

                btnWA.onclick = async () => {
                    await logInquiry('WhatsApp');
                    if (data.phone) {
                        let cleanPhone = data.phone.replace(/\D/g, '');
                        if (cleanPhone.startsWith('0')) cleanPhone = '92' + cleanPhone.substring(1);
                        else if (!cleanPhone.startsWith('92')) cleanPhone = '92' + cleanPhone;
                        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(productDetails)}`;
                        window.open(url, '_blank');
                    } else {
                        alert("WhatsApp number not set in Admin Settings!");
                    }
                };

                btnFB.onclick = async () => {
                    await logInquiry('Facebook');
                    navigator.clipboard.writeText(productDetails).then(() => {
                        showToast("Details copied! Paste in Messenger.", "success");
                        if (data.fb) {
                            let pageId = data.fb.trim();
                            if (pageId.includes('facebook.com/')) {
                                pageId = pageId.split('facebook.com/')[1].split('/')[0].split('?')[0];
                            }
                            const url = `https://m.me/${pageId}`;
                            window.open(url, '_blank');
                        } else {
                            window.open("https://facebook.com", "_blank");
                        }
                    });
                };

                btnIG.onclick = async () => {
                    await logInquiry('Instagram');
                    navigator.clipboard.writeText(productDetails).then(() => {
                        showToast("Details copied! Paste in Instagram.", "success");
                        const url = data.insta ? data.insta : "https://instagram.com";
                        window.open(url, '_blank');
                    });
                };

                // Direct Order Button in Social Modal
                if (btnDirect) {
                    btnDirect.onclick = () => {
                        socialModal.style.display = 'none';
                        orderModal.style.display = 'flex';
                        // Keep body overflow hidden
                    };
                }

                if (true) { // Always show modal
                    socialModal.style.display = 'flex';
                    document.body.style.overflow = 'hidden';
                }
            } else {
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

            if (hasCompleted) {
                const reorder = confirm("Aap ye product pehle order kar chuke hain. Kia aap dubara wahi order karna chahte hain?");
                if (!reorder) {
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = "Place Order Now";
                    return;
                }
            }

            // Save Order
            const orderData = {
                customerName: name,
                customerPhone: phone,
                customerAddress: address,
                customerCity: city,
                productId: currentProduct.id,
                productName: currentProduct.name,
                productPrice: currentProduct.price,
                quantity: qty,
                totalPrice: currentProduct.price * qty,
                status: 'pending',
                timestamp: serverTimestamp(),
                summary: `${qty}x ${currentProduct.name} (Rs. ${currentProduct.price}/ea)`
            };

            await addDoc(collection(db, "orders"), orderData);

            // Success UI
            successProductName.textContent = currentProduct.name;
            orderFormContainer.style.display = 'none';
            orderSuccess.style.display = 'block';

        } catch (err) {
            console.error(err);
            alert("Order failed: " + err.message);
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
