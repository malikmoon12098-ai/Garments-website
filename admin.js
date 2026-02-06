import { db, storage } from './firebase-config.js';
import { collection, doc, getDoc, getDocs, setDoc, query, onSnapshot, serverTimestamp, deleteDoc, limit, where, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { checkAuth, highlightSidebar, showToast, escapeHTML, showConfirm } from './admin-core.js';

// --- INITIALIZE PAGE ---
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    highlightSidebar();

    const currentPage = window.location.pathname.split('/').pop();

    // Page-specific initializers
    if (currentPage === 'admin-orders.html' || currentPage === 'admin.html') {
        loadOrders();
        attachOrderFilters();
    } else if (currentPage === 'admin-add-product.html') {
        initAddProductForm();
        initImageUpload();
    } else if (currentPage === 'admin-inventory.html') {
        loadProducts();
    } else if (currentPage === 'admin-messages.html') {
        loadInquiries();
    } else if (currentPage === 'admin-settings.html') {
        loadContactInfo();
        initSettingsForm();
    }
});

// --- ORDERS LOGIC ---
let currentOrderFilter = 'pending';
let unsubscribeOrders = null;

async function loadOrders() {
    const ordersList = document.getElementById('ordersList');
    if (!ordersList) return;
    ordersList.innerHTML = '<p>Loading orders...</p>';

    if (unsubscribeOrders) { unsubscribeOrders(); unsubscribeOrders = null; }

    try {
        const q = query(collection(db, "orders"), where("status", "==", currentOrderFilter));
        unsubscribeOrders = onSnapshot(q, (snapshot) => {
            ordersList.innerHTML = '';
            if (snapshot.empty) {
                ordersList.innerHTML = `<p>No ${currentOrderFilter} orders found.</p>`;
                return;
            }

            snapshot.forEach(docSnap => {
                const order = docSnap.data();
                const id = docSnap.id;
                const date = order.timestamp ? order.timestamp.toDate().toLocaleString() : 'Just now';

                const div = document.createElement('div');
                div.className = 'admin-item';
                div.style.borderLeft = currentOrderFilter === 'pending' ? '5px solid #ff9800' : '5px solid #4caf50';

                div.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span style="font-weight: bold; color: white;">${escapeHTML(order.customerName)}</span>
                        <span style="font-size: 0.8rem; color: #888;">${date}</span>
                    </div>
                    <p><strong>Phone:</strong> ${escapeHTML(order.customerPhone)}</p>
                    <p><strong>Address:</strong> ${escapeHTML(order.customerAddress)}, ${escapeHTML(order.customerCity)}</p>
                    <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; margin: 10px 0;">
                        ${escapeHTML(order.summary)}<br>
                        <strong>Total: Rs. ${parseFloat(order.totalPrice || 0).toLocaleString()}</strong>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        ${currentOrderFilter === 'pending' ?
                        `<button class="complete-btn" data-id="${id}" style="background: #25D366; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer; flex: 1;">Complete</button>` :
                        `<button class="delete-order-btn" data-id="${id}" style="background: rgba(255,77,77,0.2); color: #ff4d4d; border: 1px solid #ff4d4d; padding: 10px; border-radius: 4px; cursor: pointer; flex: 1;">Delete</button>`}
                    </div>
                `;
                ordersList.appendChild(div);
            });
            attachOrderListeners();
        });
    } catch (err) { console.error(err); }
}

function attachOrderFilters() {
    const btnPending = document.getElementById('viewPendingOrders');
    const btnCompleted = document.getElementById('viewCompletedOrders');

    const setStyles = () => {
        if (currentOrderFilter === 'pending') {
            if (btnPending) { btnPending.style.background = '#ff9800'; btnPending.style.color = '#000'; btnPending.style.border = 'none'; }
            if (btnCompleted) { btnCompleted.style.background = 'rgba(255,255,255,0.05)'; btnCompleted.style.color = '#888'; btnCompleted.style.border = '1px solid rgba(255,255,255,0.1)'; }
        } else {
            if (btnPending) { btnPending.style.background = 'rgba(255,255,255,0.05)'; btnPending.style.color = '#888'; btnPending.style.border = '1px solid rgba(255,255,255,0.1)'; }
            if (btnCompleted) { btnCompleted.style.background = '#4caf50'; btnCompleted.style.color = '#fff'; btnCompleted.style.border = 'none'; }
        }
    };

    if (btnPending) btnPending.onclick = () => { currentOrderFilter = 'pending'; setStyles(); loadOrders(); };
    if (btnCompleted) btnCompleted.onclick = () => { currentOrderFilter = 'completed'; setStyles(); loadOrders(); };

    setStyles(); // Run once to set initial state
}

function attachOrderListeners() {
    document.querySelectorAll('.complete-btn').forEach(btn => {
        btn.onclick = async () => {
            try { await updateDoc(doc(db, "orders", btn.dataset.id), { status: 'completed' }); showToast("Order Completed!", "success"); } catch (e) { showToast(e.message, "error"); }
        }
    });
    document.querySelectorAll('.delete-order-btn').forEach(btn => {
        btn.onclick = () => {
            const orderId = btn.dataset.id;
            showConfirm("Kya aap waqai delete karna chahte hain?", "Ye order dashboard se hamesha ke liye khatam ho jaye ga.", async () => {
                try {
                    await deleteDoc(doc(db, "orders", orderId));
                    showToast("Order Delete Ho Gaya!", "success");
                } catch (e) {
                    showToast(e.message, "error");
                }
            });
        }
    });
}

// --- ADD PRODUCT LOGIC ---
function initAddProductForm() {
    const form = document.getElementById('addProductForm');
    if (!form) return;
    form.onsubmit = async (e) => {
        e.preventDefault();
        showToast("Adding product...", "info");
        const product = {
            name: document.getElementById('pName').value,
            price: parseFloat(document.getElementById('pPrice').value),
            category: document.getElementById('pCategory').value,
            image: document.getElementById('pImage').value,
            description: document.getElementById('pDesc').value,
            inStock: true,
            createdAt: serverTimestamp()
        };
        try { await addDoc(collection(db, "products"), product); showToast("Success!", "success"); form.reset(); } catch (e) { showToast(e.message, "error"); }
    };
}

function initImageUpload() {
    const uploadBtn = document.getElementById('uploadBtn');
    const imageUpload = document.getElementById('imageUpload');
    const pImage = document.getElementById('pImage');
    if (uploadBtn && imageUpload) {
        uploadBtn.onclick = () => imageUpload.click();
        imageUpload.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            showToast("Uploading...", "info");
            try {
                const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
                const snapshot = await uploadBytes(storageRef, file);
                const url = await getDownloadURL(snapshot.ref);
                if (pImage) pImage.value = url;
                showToast("Uploaded!", "success");
            } catch (e) { showToast(e.message, "error"); }
        };
    }
}

// --- INVENTORY LOGIC ---
async function loadProducts() {
    const productList = document.getElementById('productList');
    if (!productList) return;
    productList.innerHTML = '<p>Loading inventory...</p>';
    try {
        const querySnapshot = await getDocs(query(collection(db, "products")));
        productList.innerHTML = '';
        querySnapshot.forEach(docSnap => {
            const product = docSnap.data();
            const id = docSnap.id;
            const inStock = product.inStock !== false;
            const div = document.createElement('div');
            div.className = 'admin-item';
            div.innerHTML = `
                <img src="${product.image}" onerror="this.src='https://via.placeholder.com/150'">
                <h4>${escapeHTML(product.name)}</h4>
                <p>${escapeHTML(product.category)} - Rs. ${parseFloat(product.price).toLocaleString()}<br>
                <span style="color: ${inStock ? '#25D366' : '#ff4d4d'};">${inStock ? '● In Stock' : '● Out of Stock'}</span></p>
                <div style="display: flex; gap: 5px; margin-top: 10px;">
                    <button class="toggle-stock" data-id="${id}" data-status="${inStock}" style="background:#333; color:white; border:none; padding:5px; border-radius:4px; cursor:pointer; flex:1;">${inStock ? 'Mark Out' : 'Mark In'}</button>
                    <button class="delete-product" data-id="${id}" style="background:rgba(255,77,77,0.1); color:#ff4d4d; border:1px solid #ff4d4d; padding:5px; border-radius:4px; cursor:pointer; flex:1;">Remove</button>
                </div>
`;
            productList.appendChild(div);
        });
        attachProductListeners();
    } catch (e) { console.error(e); }
}

function attachProductListeners() {
    document.querySelectorAll('.toggle-stock').forEach(btn => {
        btn.onclick = async () => {
            const id = btn.dataset.id;
            const current = btn.dataset.status === 'true';
            try {
                await updateDoc(doc(db, "products", id), { inStock: !current });
                loadProducts();
                showToast("Stock Status Updated!", "success");
            } catch (e) {
                showToast(e.message, "error");
            }
        }
    });
    document.querySelectorAll('.delete-product').forEach(btn => {
        btn.onclick = () => {
            showConfirm("Product Remove Karen?", "Ye item aapki shop se gayab ho jaye ga.", async () => {
                try {
                    await deleteDoc(doc(db, "products", btn.dataset.id));
                    loadProducts();
                    showToast("Product Removed Successfully!", "success");
                } catch (e) {
                    showToast(e.message, "error");
                }
            });
        }
    });
}

// --- MESSAGES LOGIC ---
async function loadInquiries() {
    const inquiriesList = document.getElementById('inquiriesList');
    if (!inquiriesList) return;
    try {
        onSnapshot(query(collection(db, "inquiries"), limit(50)), (snapshot) => {
            inquiriesList.innerHTML = '';
            if (snapshot.empty) { inquiriesList.innerHTML = '<p>No inquiries yet.</p>'; return; }
            snapshot.forEach(docSnap => {
                const item = docSnap.data();
                const id = docSnap.id;
                const date = item.timestamp ? item.timestamp.toDate().toLocaleString() : 'Just now';
                const div = document.createElement('div');
                div.className = 'admin-item';
                const platformColor = item.platform === 'WhatsApp' ? '#25D366' :
                    item.platform === 'Facebook' ? '#1877F2' :
                        '#E1306C'; // Instagram pink

                div.style.borderLeft = `5px solid ${platformColor}`;
                div.style.display = 'flex';
                div.style.justifyContent = 'space-between';
                div.style.alignItems = 'center';

                div.innerHTML = `
                    <div style="flex: 1;">
                        <strong><span style="color: ${platformColor}">${item.platform}</span> inquiry!</strong>
                        <p style="margin: 5px 0;">${escapeHTML(item.productName)} (Qty: ${item.qty})</p>
                        <span style="font-size:0.8rem; color:#888;">${date}</span>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button class="convert-order" 
                            data-id="${id}" 
                            data-product="${escapeHTML(item.productName)}" 
                            data-qty="${item.qty}"
                            data-pid="${item.productId}"
                            style="background: rgba(37, 211, 102, 0.1); border: 1px solid #25D366; color: #25D366; padding: 10px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: 0.3s;">
                            🛒 Order
                        </button>
                        <button class="delete-inquiry" data-id="${id}" 
                            style="background: rgba(234, 84, 85, 0.1); border: 1px solid #ea5455; color: #ea5455; padding: 10px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.3s;">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                `;
                inquiriesList.appendChild(div);
            });
        });
    } catch (e) { console.error(e); }
}

// Global listener for inquiry actions
document.addEventListener('click', async (e) => {
    const delBtn = e.target.closest('.delete-inquiry');
    const convertBtn = e.target.closest('.convert-order');

    if (delBtn) {
        const id = delBtn.dataset.id;
        showConfirm(
            "Inquiry Delete Karen?",
            "Kya aap waqai is inquiry ko hamesha ke liye khatam karna chahte hain?",
            async () => {
                try {
                    await deleteDoc(doc(db, "inquiries", id));
                    showToast("Inquiry Deleted!", "success");
                } catch (err) {
                    showToast("Khatam karne mein masla hua.", "error");
                }
            }
        );
    }

    if (convertBtn) {
        const id = convertBtn.dataset.id;
        const productName = convertBtn.dataset.product;
        const qty = convertBtn.dataset.qty;
        const productId = convertBtn.dataset.pid;

        // Ask for Customer Details
        const name = prompt("Customer Name?");
        if (!name) return;
        const phone = prompt("Customer Phone Number?");
        if (!phone) return;
        const city = prompt("City?");
        if (!city) return;
        const address = prompt("Full Address?");
        if (!address) return;

        showToast("Converting to Order...", "info");

        try {
            // Get product price to calculate total (fallback if not available)
            let price = 0;
            const pSnap = await getDoc(doc(db, "products", productId));
            if (pSnap.exists()) price = pSnap.data().price;

            const orderData = {
                customerName: name,
                customerPhone: phone,
                customerAddress: address,
                customerCity: city,
                productId: productId,
                productName: productName,
                qty: parseInt(qty),
                totalPrice: price * parseInt(qty),
                summary: `${productName} (Qty: ${qty})`,
                status: 'pending',
                timestamp: serverTimestamp()
            };

            // 1. Create Order
            await addDoc(collection(db, "orders"), orderData);
            // 2. Delete Inquiry
            await deleteDoc(doc(db, "inquiries", id));

            showToast("Order Created Successfully!", "success");
        } catch (err) {
            console.error(err);
            showToast("Order banane mein masla hua.", "error");
        }
    }
});

// --- SETTINGS LOGIC ---
async function loadContactInfo() {
    try {
        const docSnap = await getDoc(doc(db, "settings", "contact"));
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (document.getElementById('cPhone')) document.getElementById('cPhone').value = data.phone || '';
            if (document.getElementById('cEmail')) document.getElementById('cEmail').value = data.email || '';
            if (document.getElementById('cAddress')) document.getElementById('cAddress').value = data.address || '';
            if (document.getElementById('cInsta')) document.getElementById('cInsta').value = data.insta || '';
            if (document.getElementById('cFB')) document.getElementById('cFB').value = data.fb || '';
        }
    } catch (e) { }
}

function initSettingsForm() {
    const form = document.getElementById('contactSettingsForm');
    if (!form) return;
    form.onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            phone: document.getElementById('cPhone').value,
            email: document.getElementById('cEmail').value,
            address: document.getElementById('cAddress').value,
            insta: document.getElementById('cInsta').value,
            fb: document.getElementById('cFB').value,
            updatedAt: serverTimestamp()
        };
        try { await setDoc(doc(db, "settings", "contact"), data); showToast("Settings Updated!", "success"); } catch (e) { showToast(e.message, "error"); }
    };
}
