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
    buyNowBtn.onclick = () => {
        orderModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

if (closeModal) {
    closeModal.onclick = () => {
        orderModal.style.display = 'none';
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
