import { db } from './firebase-config.js';
import { doc, getDoc, collection, addDoc, query, where, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

                const logInquiry = async (platform) => {
                    try {
                        await addDoc(collection(db, "inquiries"), {
                            productName: currentProduct.name,
                            platform: platform,
                            timestamp: serverTimestamp(),
                            productId: currentProduct.id,
                            qty: qtyInput.value
                        });
                    } catch (e) { console.error("Error logging inquiry", e); }
                };

                if (data.phone) {
                    btnWA.style.display = 'block';
                    showCount++;
                    btnWA.onclick = () => {
                        logInquiry('WhatsApp');
                        const cleanPhone = data.phone.replace(/\D/g, ''); // Remove non-digits
                        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(productDetails)}`;
                        window.open(url, '_blank');
                    };
                } else { btnWA.style.display = 'none'; }

                if (data.fb) {
                    btnFB.style.display = 'block';
                    showCount++;
                    btnFB.onclick = () => {
                        logInquiry('Facebook');
                        // Extract Page ID or Username from FB URL
                        let pageId = data.fb.trim();
                        if (pageId.includes('facebook.com/')) {
                            pageId = pageId.split('facebook.com/')[1].split('/')[0].split('?')[0];
                        }
                        const url = `https://m.me/${pageId}?text=${encodeURIComponent(productDetails)}`;
                        window.open(url, '_blank');
                    };
                } else { btnFB.style.display = 'none'; }

                if (data.insta) {
                    btnIG.style.display = 'block';
                    showCount++;
                    btnIG.onclick = () => {
                        logInquiry('Instagram');
                        // Instagram doesn't support pre-fill text via URL, so we copy to clipboard
                        navigator.clipboard.writeText(productDetails).then(() => {
                            alert("Bhai, product details copy ho gayi hain! Instagram pe ja kar bas 'Paste' kar den.");
                            window.open(data.insta, '_blank');
                        }).catch(() => {
                            window.open(data.insta, '_blank');
                        });
                    };
                } else { btnIG.style.display = 'none'; }

                if (showCount > 0) {
                    socialModal.style.display = 'flex';
                    document.body.style.overflow = 'hidden';
                } else {
                    // Fallback to original order modal if no social details
                    orderModal.style.display = 'flex';
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
        if (!currentProduct) return;
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const totalQty = parseInt(qtyInput.value);

        const existsIndex = cart.findIndex(item => item.id === currentProduct.id);
        if (existsIndex > -1) {
            // Update quantity if exists
            cart[existsIndex].qty = (cart[existsIndex].qty || 1) + totalQty;
        } else {
            cart.push({ ...currentProduct, qty: totalQty });
        }

        localStorage.setItem('cart', JSON.stringify(cart));
        window.dispatchEvent(new Event('cartUpdated'));

        cartBtn.textContent = "Added to Cart ✓";
        setTimeout(() => cartBtn.textContent = "Add to Cart", 2000);
    });
}

initProduct();
