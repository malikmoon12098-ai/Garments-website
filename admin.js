import { db, storage } from './firebase-config.js';
import { collection, doc, getDoc, getDocs, setDoc, query, onSnapshot, serverTimestamp, deleteDoc, limit, where, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { checkAuth, highlightSidebar, showToast, escapeHTML, showConfirm } from './admin-core.js';

// --- INITIALIZE PAGE ---
document.addEventListener('DOMContentLoaded', () => {
    // FORCE CHECK: If not logged in and NOT on lock page -> GO TO LOCK PAGE
    const isAuth = sessionStorage.getItem('adminAuth');
    const isLockPage = window.location.pathname.includes('admin-lock.html');

    if (!isAuth && !isLockPage) {
        window.location.replace('admin-lock.html'); // Use replace to prevent back button loop
        return; // Stop further execution
    }

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
        initEditProductForm();
    } else if (currentPage === 'admin-alerts.html') {
        loadAlerts();
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
            const id = btn.dataset.id;
            try {
                // 1. Get order details to find productId and qty
                const oSnap = await getDoc(doc(db, "orders", id));
                if (!oSnap.exists()) return;
                const order = oSnap.data();

                // 2. Update stock
                if (order.items && Array.isArray(order.items)) {
                    // Multi-item Cart Order
                    for (const item of order.items) {
                        const pRef = doc(db, "products", item.id);
                        const pSnap = await getDoc(pRef);
                        if (pSnap.exists()) {
                            const product = pSnap.data();
                            const newStock = Math.max(0, (product.stock || 0) - (item.qty || 1));
                            const updateData = { stock: newStock };
                            if (newStock === 0) updateData.inStock = false;
                            await updateDoc(pRef, updateData);
                        }
                    }
                } else if (order.productId) {
                    // Single Product Order
                    const pRef = doc(db, "products", order.productId);
                    const pSnap = await getDoc(pRef);
                    if (pSnap.exists()) {
                        const product = pSnap.data();
                        const newStock = Math.max(0, (product.stock || 0) - (order.qty || 1));
                        const updateData = { stock: newStock };
                        if (newStock === 0) updateData.inStock = false;
                        await updateDoc(pRef, updateData);
                    }
                }

                // 3. Mark order as completed
                await updateDoc(doc(db, "orders", id), { status: 'completed' });
                showToast("Order Completed & Stock Updated!", "success");
            } catch (e) {
                showToast(e.message, "error");
            }
        }
    });
    document.querySelectorAll('.delete-order-btn').forEach(btn => {
        btn.onclick = () => {
            const orderId = btn.dataset.id;
            showConfirm("Delete this order?", "This order will be permanently removed from the dashboard.", async () => {
                try {
                    await deleteDoc(doc(db, "orders", orderId));
                    showToast("Order Deleted Successfully!", "success");
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
            target: document.getElementById('pTarget').value,
            image: document.getElementById('pImage').value,
            description: document.getElementById('pDesc').value,
            stock: parseInt(document.getElementById('pStock').value) || 0,
            threshold: parseInt(document.getElementById('pThreshold').value) || 0,
            inStock: parseInt(document.getElementById('pStock').value) > 0,
            createdAt: serverTimestamp()
        };
        try { await addDoc(collection(db, "products"), product); showToast("Success!", "success"); form.reset(); } catch (e) { showToast(e.message, "error"); }
    };
}

// Direct Save (Base64) Image Logic
function initImageUpload() {
    const uploadBtn = document.getElementById('uploadBtn');
    const imageUpload = document.getElementById('imageUpload');
    const pImage = document.getElementById('pImage');
    const statusMsg = document.getElementById('uploadStatus');

    if (uploadBtn && imageUpload) {
        uploadBtn.onclick = () => imageUpload.click();

        imageUpload.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            statusMsg.style.display = 'block';
            statusMsg.style.color = '#ff9f43'; // Orange
            statusMsg.textContent = "Compressing & Saving...";

            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    // Resize Logic
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to Base64 (JPEG 70% Quality)
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

                    if (pImage) pImage.value = dataUrl;

                    statusMsg.style.color = '#28c76f'; // Green
                    statusMsg.textContent = "✅ Image Ready (Saved directly)";
                    showToast("Image processed successfully!", "success");
                };
            };
        };
    }
}

// --- INVENTORY LOGIC ---
let currentInventoryCategory = 'all';

async function loadProducts() {
    const productList = document.getElementById('productList');
    const backBtn = document.getElementById('backToCategories');
    if (!productList) return;
    productList.innerHTML = '<p>Loading inventory...</p>';

    try {
        const querySnapshot = await getDocs(query(collection(db, "products")));
        productList.innerHTML = '';

        const categoryData = {}; // To store { categoryName: { image: firstProductImage, count: count } }
        const productsOfSelectedCategory = [];

        querySnapshot.forEach(docSnap => {
            const product = docSnap.data();
            const cat = product.category || 'Uncategorized';

            // Collect platform data for grouping
            if (!categoryData[cat]) {
                categoryData[cat] = { image: product.image, count: 0 };
            }
            categoryData[cat].count++;

            // Collect products if a specific category is selected
            if (currentInventoryCategory !== 'all' && cat === currentInventoryCategory) {
                productsOfSelectedCategory.push({ id: docSnap.id, data: product });
            }
        });

        if (currentInventoryCategory === 'all') {
            if (backBtn) backBtn.style.display = 'none';
            renderCategoryCards(categoryData);
        } else {
            if (backBtn) {
                backBtn.style.display = 'block';
                backBtn.onclick = () => {
                    currentInventoryCategory = 'all';
                    loadProducts();
                };
            }
            renderProductList(productsOfSelectedCategory);
        }
        attachProductListeners();
    } catch (e) { console.error(e); }
}

function renderCategoryCards(groups) {
    const productList = document.getElementById('productList');
    productList.style.display = 'grid';
    productList.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
    productList.style.gap = '20px';
    productList.innerHTML = ''; // Clear previous content

    Object.keys(groups).sort().forEach(cat => {
        const data = groups[cat];
        const card = document.createElement('div');
        card.className = 'category-card';
        card.innerHTML = `
            <div class="category-img-container">
                <img src="${data.image}" onerror="this.src='https://via.placeholder.com/150'">
            </div>
            <div class="category-info">
                <h4>${escapeHTML(cat)}</h4>
                <p>${data.count} Products</p>
            </div>
        `;
        card.onclick = () => {
            currentInventoryCategory = cat;
            loadProducts();
        };
        productList.appendChild(card);
    });
}

function renderProductList(items) {
    const productList = document.getElementById('productList');
    productList.style.display = 'grid'; // Maintain grid or switch to row if preferred
    productList.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))'; // Adjust as needed for product items
    productList.style.gap = '20px';
    productList.innerHTML = ''; // Clear previous content

    if (items.length === 0) {
        productList.innerHTML = '<p>No products found in this category.</p>';
        return;
    }

    items.forEach(item => {
        const product = item.data;
        const id = item.id;
        const inStock = product.inStock !== false;
        const div = document.createElement('div');
        div.className = 'admin-item';
        div.innerHTML = `
            <img src="${product.image}" onerror="this.src='https://via.placeholder.com/150'">
            <h4>${escapeHTML(product.name)}</h4>
            <p><strong>Price:</strong> Rs. ${parseFloat(product.price).toLocaleString()}<br>
            <strong>Stock:</strong> ${product.stock || 0} (Limit: ${product.threshold || 0})<br>
            <span style="color: ${inStock ? '#25D366' : '#ff4d4d'}; font-weight: bold;">${inStock ? '● In Stock' : '● Out of Stock'}</span></p>
            <div style="display: flex; gap: 5px; margin-top: 10px;">
                <button class="edit-product" data-id="${id}" style="background:var(--accent); color:white; border:none; padding:8px; border-radius:6px; cursor:pointer; flex:1; font-weight:600;">Edit</button>
                <button class="toggle-stock" data-id="${id}" data-status="${inStock}" style="background:#333; color:white; border:none; padding:8px; border-radius:6px; cursor:pointer; flex:1;">${inStock ? 'Mark Out' : 'Mark In'}</button>
                <button class="delete-product" data-id="${id}" style="background:rgba(255,77,77,0.1); color:#ff4d4d; border:1px solid #ff4d4d; padding:8px; border-radius:6px; cursor:pointer; flex:0.5;">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;
        productList.appendChild(div);
    });
}

function attachProductListeners() {
    document.querySelectorAll('.edit-product').forEach(btn => {
        btn.onclick = () => openEditModal(btn.dataset.id);
    });

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
            showConfirm("Remove Product?", "This product will be permanently deleted from your shop.", async () => {
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
        const q = query(collection(db, "inquiries"), limit(50));
        // Using onSnapshot for real-time updates
        onSnapshot(q, (snapshot) => {
            inquiriesList.innerHTML = '';
            if (snapshot.empty) { inquiriesList.innerHTML = '<p>No inquiries yet.</p>'; return; }

            snapshot.forEach(docSnap => {
                const item = docSnap.data();
                const id = docSnap.id;
                // Only show if not converted (optional, or show status)
                // if (item.status === 'converted') return; 

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
                div.style.marginBottom = '10px';
                div.style.padding = '15px';
                div.style.background = 'rgba(255, 255, 255, 0.05)';
                div.style.borderRadius = '12px';

                div.innerHTML = `
                    <div style="flex: 1;">
                        <strong style="font-size: 1.1rem;"><span style="color: ${platformColor}">${item.platform}</span> Inquiry</strong>
                        <p style="margin: 5px 0; color: #fff;">${escapeHTML(item.productName)} (Qty: ${item.qty})</p>
                        <span style="font-size:0.8rem; color:#888;">${date}</span>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                         <button class="open-app-btn" data-url="${getAppUrl(item)}" 
                            style="background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 10px; border-radius: 8px; cursor: pointer; transition: 0.3s;" title="Open Chat">
                            Chat ↗
                        </button>
                        <button class="convert-order" 
                            data-id="${id}" 
                            data-product="${escapeHTML(item.productName)}" 
                            data-qty="${item.qty}"
                            data-pid="${item.productId}"
                            style="background: rgba(37, 211, 102, 0.1); border: 1px solid #25D366; color: #25D366; padding: 10px 15px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: 0.3s; font-weight: 600;">
                            Convert to Order
                        </button>
                        <button class="delete-inquiry" data-id="${id}" 
                            style="background: rgba(234, 84, 85, 0.1); border: 1px solid #ea5455; color: #ea5455; padding: 10px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.3s;">
                            ✕
                        </button>
                    </div>
                `;
                inquiriesList.appendChild(div);
            });
        });
    } catch (e) { console.error(e); }
}

function getAppUrl(item) {
    // Basic helper to try and open app, relies on stored preferences or standard URLs
    // Since we don't store customer phone in inquiry (it's unknown), we just open the general app or business page
    // Ideally we would want to know WHO sent it, but that's hard without auth.
    // So this just opens the business app to check messages.
    return item.platform === 'WhatsApp' ? 'https://web.whatsapp.com' :
        item.platform === 'Facebook' ? 'https://business.facebook.com/latest/inbox' :
            'https://www.instagram.com/direct/inbox/';
}

// Global listener for inquiry actions
let activeInquiry = null; // Store for FAB re-opening

document.addEventListener('click', async (e) => {
    const delBtn = e.target.closest('.delete-inquiry');
    const convertBtn = e.target.closest('.convert-order');
    const chatBtn = e.target.closest('.open-app-btn');
    const fabBtn = e.target.closest('#quickOrderFloater');
    const modalChatBtn = e.target.closest('#modalOpenChatBtn');

    if (chatBtn) {
        window.open(chatBtn.dataset.url, '_blank');
    }

    if (fabBtn) {
        if (activeInquiry) {
            openConvertModal(activeInquiry);
        } else {
            showToast("Koi active order nahi hai!", "info");
        }
    }

    if (modalChatBtn) {
        const url = document.getElementById('convChatUrl').value;
        if (url) window.open(url, '_blank');
        else showToast("Chat URL missing", "error");
    }

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
                    showToast("Delete failed.", "error");
                }
            }
        );
    }

    if (convertBtn) {
        const inquiryData = {
            id: convertBtn.dataset.id,
            pid: convertBtn.dataset.pid,
            product: convertBtn.dataset.product,
            qty: convertBtn.dataset.qty,
            url: getAppUrl({ platform: convertBtn.dataset.platform }) // Need to pass platform or store it
        };
        // We need platform to generate URL. Let's fix getAppUrl or logic.
        // Quick fix: Grab the platform from the list item text or pass it in data attr.
        // Better: Pass platform in data attribute.
        // Let's assume we update the render function to include data-platform.

        // RE-READING DOM to find platform from parent if not in button
        const itemDiv = convertBtn.closest('.admin-item');
        const platformSpan = itemDiv.querySelector('strong span');
        const platform = platformSpan ? platformSpan.innerText.trim() : 'WhatsApp';
        inquiryData.url = getAppUrl({ platform: platform });

        activeInquiry = inquiryData;
        openConvertModal(inquiryData);
    }
});

function openConvertModal(data) {
    const modal = document.getElementById('convertInquiryModal');
    if (!modal) return;

    // Fill fields
    document.getElementById('convInquiryId').value = data.id;
    document.getElementById('convProductId').value = data.pid;
    document.getElementById('convProductName').value = data.product;
    document.getElementById('convQty').value = data.qty;
    // document.getElementById('convChatUrl').value = data.url; // REMOVED: Element deleted from HTML

    // Show modal
    modal.style.display = 'flex';
    document.body.classList.add('stop-scroll');
}

// Inquiry Modal Close
const closeConvModal = document.getElementById('closeConvModal');
if (closeConvModal) {
    closeConvModal.onclick = () => {
        document.getElementById('convertInquiryModal').style.display = 'none';
        document.body.classList.remove('stop-scroll');
    };
}

// Inquiry Form Submission
const convertInquiryForm = document.getElementById('convertInquiryForm');
if (convertInquiryForm) {
    convertInquiryForm.onsubmit = async (e) => {
        e.preventDefault();

        const id = document.getElementById('convInquiryId').value;
        const productId = document.getElementById('convProductId').value;
        const productName = document.getElementById('convProductName').value;
        const qty = document.getElementById('convQty').value;

        const name = document.getElementById('convCustName').value.trim();
        const phone = document.getElementById('convCustPhone').value.trim();
        const city = document.getElementById('convCustCity').value.trim();
        const address = document.getElementById('convCustAddress').value.trim();

        if (!name || !phone || !city || !address) {
            showToast("Please fill in all details!", "error");
            return;
        }

        const confirmBtn = convertInquiryForm.querySelector('button[type="submit"]');
        confirmBtn.disabled = true;
        confirmBtn.textContent = "Creating...";

        try {
            // Get product price
            let price = 0;
            // Handle edge case where product might be deleted
            if (productId) {
                const pSnap = await getDoc(doc(db, "products", productId));
                if (pSnap.exists()) price = pSnap.data().price;
            }

            const orderData = {
                customerName: name,
                customerPhone: phone,
                customerAddress: address,
                customerCity: city,
                productId: productId || 'unknown',
                productName: productName,
                qty: parseInt(qty),
                totalPrice: price * parseInt(qty),
                summary: `${productName} (Qty: ${qty})`,
                status: 'pending',
                timestamp: serverTimestamp()
            };

            // 1. Create Order
            await addDoc(collection(db, "orders"), orderData);
            // 2. Delete Inquiry (since it's converted)
            await deleteDoc(doc(db, "inquiries", id));

            showToast("Order Created Successfully!", "success");
            document.getElementById('convertInquiryModal').style.display = 'none';
            document.body.classList.remove('stop-scroll');
        } catch (err) {
            console.error(err);
            showToast("Order banane mein masla hua.", "error");
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Banayein (Create Order)";
        }
    };
}

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
        let insta = document.getElementById('cInsta').value.trim();
        let fb = document.getElementById('cFB').value.trim();

        // Auto-format Instagram
        if (insta && !insta.startsWith('http')) {
            if (insta.startsWith('@')) insta = insta.substring(1);
            insta = `https://instagram.com/${insta}`;
        }

        // Auto-format Facebook
        if (fb && !fb.startsWith('http')) {
            fb = `https://facebook.com/${fb}`;
        }

        const data = {
            phone: document.getElementById('cPhone').value,
            email: document.getElementById('cEmail').value,
            address: document.getElementById('cAddress').value,
            insta: insta,
            fb: fb,
            updatedAt: serverTimestamp()
        };
        try { await setDoc(doc(db, "settings", "contact"), data); showToast("Settings Updated!", "success"); } catch (e) { showToast(e.message, "error"); }
    };
}

async function loadAlerts() {
    const alertsList = document.getElementById('alertsList');
    if (!alertsList) return;
    alertsList.innerHTML = '<p>Loading alerts...</p>';
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        alertsList.innerHTML = '';
        let count = 0;
        querySnapshot.forEach(docSnap => {
            const product = docSnap.data();
            const id = docSnap.id;
            const stock = product.stock || 0;
            const threshold = product.threshold || 0;

            if (stock <= threshold) {
                count++;
                const div = document.createElement('div');
                div.className = 'admin-item';
                div.style.borderLeft = '5px solid #ff4d4d';
                div.innerHTML = `
                    <div style="display: flex; gap: 15px; align-items: flex-start;">
                        <img src="${product.image}" style="width: 50px; height: 65px; border-radius: 8px; object-fit: cover; flex-shrink: 0;">
                        <div style="flex: 1; min-width: 0;">
                            <h4 style="margin:0; font-size: 1.1rem; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(product.name)}</h4>
                            <p style="margin:4px 0; color: #ffb8b8; font-size: 0.85rem; line-height: 1.2;">⚠️ Restock this product, it's about to finish!</p>
                            <div style="display: flex; gap: 8px; font-size: 0.85rem; color: #888; margin-top: 5px;">
                                <span style="white-space: nowrap;">Stock: <b style="color: #fff;">${stock}</b></span>
                                <span>|</span>
                                <span style="white-space: nowrap;">Threshold: <b style="color: #fff;">${threshold}</b></span>
                            </div>
                        </div>
                    </div>
                `;
                alertsList.appendChild(div);
            }
        });
        if (count === 0) alertsList.innerHTML = '<p>✅ All products are well-stocked. No alerts.</p>';
    } catch (e) { console.error(e); }
}
async function openEditModal(id) {
    const modal = document.getElementById('editProductModal');
    if (!modal) return;
    try {
        const docSnap = await getDoc(doc(db, "products", id));
        if (docSnap.exists()) {
            const product = docSnap.data();
            document.getElementById('editProdId').value = id;
            document.getElementById('editName').value = product.name || '';
            document.getElementById('editPrice').value = product.price || 0;
            document.getElementById('editCategory').value = product.category || '';
            document.getElementById('editTarget').value = product.target || 'MEN';
            document.getElementById('editImage').value = product.image || '';
            document.getElementById('editStock').value = product.stock || 0;
            document.getElementById('editThreshold').value = product.threshold || 0;
            modal.style.display = 'flex';
            document.body.classList.add('stop-scroll');
        }
    } catch (e) { showToast("Error loading product", "error"); }
}

function initEditProductForm() {
    const form = document.getElementById('editProductForm');
    const closeBtn = document.getElementById('closeEditModal');
    if (closeBtn) {
        closeBtn.onclick = () => {
            document.getElementById('editProductModal').style.display = 'none';
            document.body.classList.remove('stop-scroll');
        };
    }
    if (!form) return;
    form.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('editProdId').value;
        const stock = parseInt(document.getElementById('editStock').value) || 0;
        const updateData = {
            name: document.getElementById('editName').value,
            price: parseFloat(document.getElementById('editPrice').value),
            category: document.getElementById('editCategory').value,
            target: document.getElementById('editTarget').value,
            image: document.getElementById('editImage').value,
            stock: stock,
            threshold: parseInt(document.getElementById('editThreshold').value) || 0,
            inStock: stock > 0
        };
        try {
            await updateDoc(doc(db, "products", id), updateData);
            showToast("Product Updated!", "success");
            document.getElementById('editProductModal').style.display = 'none';
            document.body.classList.remove('stop-scroll');
            loadProducts();
        } catch (e) { showToast(e.message, "error"); }
    };
}
