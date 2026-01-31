import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, setDoc, getDoc, updateDoc, onSnapshot, where, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

console.log("Admin Script Loaded"); // Debugging

// DOM Elements with safe checks
const form = document.getElementById('addProductForm');
const contactForm = document.getElementById('contactSettingsForm');
const statusDiv = document.getElementById('status');
const productList = document.getElementById('productList');

const activeSessionCount = document.getElementById('activeSessionCount');

// --- ADMIN SECURITY PIN LOGIC ---
const PIN = "4321";
const authOverlay = document.getElementById('adminAuthOverlay');
const mainContent = document.getElementById('adminMainContent');
const pinInput = document.getElementById('adminPin');
const loginBtn = document.getElementById('loginBtn');
const authError = document.getElementById('authError');
const logoutBtn = document.getElementById('logoutBtn');

// Auth Check
function checkAuth() {
    if (sessionStorage.getItem('adminAuthenticated') === 'true') {
        if (authOverlay) authOverlay.style.display = 'none';
        if (mainContent) mainContent.style.display = 'block';
        startSessionTracking();
    }
}

// Login
if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        if (pinInput && pinInput.value === PIN) {
            sessionStorage.setItem('adminAuthenticated', 'true');
            if (authOverlay) authOverlay.style.display = 'none';
            if (mainContent) mainContent.style.display = 'block';

            startSessionTracking();
        } else {
            if (authError) authError.style.display = 'block';
            if (pinInput) pinInput.value = '';
        }
    });
}

// Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('adminAuthenticated');
        location.reload();
    });
}

// Enter Key for Login
if (pinInput) {
    pinInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && loginBtn) loginBtn.click();
    });
}



function startSessionTracking() {
    const sessionId = Date.now().toString();
    const sessionRef = doc(db, "active_sessions", sessionId);
    setDoc(sessionRef, { lastSeen: serverTimestamp() }).catch(e => console.log(e));

    setInterval(() => {
        setDoc(sessionRef, { lastSeen: serverTimestamp() }).catch(e => console.log(e));
    }, 10000);

    if (activeSessionCount) {
        const q = query(collection(db, "active_sessions"));
        onSnapshot(q, (snapshot) => {
            const now = Date.now();
            let count = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.lastSeen) {
                    const lastSeenTime = data.lastSeen.toDate().getTime();
                    if (now - lastSeenTime < 30000) count++;
                }
            });
            activeSessionCount.textContent = `🟢 Active Admins: ${count}`;
        });
    }

}

checkAuth();

// --- PWA ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Admin App ready.'))
            .catch(err => console.log('PWA error', err));
    });
}

// --- TOAST NOTIFICATIONS ---
const toastContainer = document.getElementById('toastContainer');

function showToast(msg, type = 'success') {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Choose icon based on type
    let icon = '✔';
    if (type === 'error') icon = '✖';
    if (type === 'info') icon = 'ℹ';

    toast.innerHTML = `<span>${icon}</span> <span>${msg}</span>`;
    toastContainer.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Keep showStatus for compatibility but route to Toast
function showStatus(msg, type) {
    showToast(msg, type);
}

// --- CONTACT FORM ---
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showStatus("Updating contact info...", "success");

        const contactData = {
            phone: document.getElementById('cPhone') ? document.getElementById('cPhone').value : '',
            email: document.getElementById('cEmail') ? document.getElementById('cEmail').value : '',
            address: document.getElementById('cAddress') ? document.getElementById('cAddress').value : '',
            insta: document.getElementById('cInsta') ? document.getElementById('cInsta').value : '',
            fb: document.getElementById('cFB') ? document.getElementById('cFB').value : '',
            uChatCode: document.getElementById('cUchatCode') ? document.getElementById('cUchatCode').value : '',
            updatedAt: serverTimestamp()
        };

        try {
            await setDoc(doc(db, "settings", "contact"), contactData);
            showStatus("Contact details updated successfully!", "success");
        } catch (error) {
            console.error("Error updating contact:", error);
            showStatus("Failed to update contact info: " + error.message, "error");
        }
    });
}

// Load Contact Info
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
            if (document.getElementById('cUchatCode')) document.getElementById('cUchatCode').value = data.uChatCode || '';
        }
    } catch (error) {
        console.log("No previous settings found.");
    }
}

// --- IMAGE UPLOAD LOGIC ---
const uploadBtn = document.getElementById('uploadBtn');
const imageUpload = document.getElementById('imageUpload');
const uploadStatus = document.getElementById('uploadStatus');
const pImage = document.getElementById('pImage');

if (uploadBtn && imageUpload) {
    uploadBtn.addEventListener('click', () => imageUpload.click());

    imageUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validations
        if (file.size > 5 * 1024 * 1024) {
            showToast("File is too large (Max 5MB)", "error");
            return;
        }

        // Show uploading status
        if (uploadStatus) {
            uploadStatus.style.display = 'block';
            uploadStatus.textContent = "Uploading to Gallery... (Please wait)";
            uploadStatus.style.color = "#2196f3"; // Blue for loading
        }

        const formData = new FormData();
        formData.append('image', file);

        // Helper to fetch with timeout
        const fetchWithTimeout = async (url, options, timeout = 15000) => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            try {
                const response = await fetch(url, { ...options, signal: controller.signal });
                clearTimeout(id);
                return response;
            } catch (error) {
                clearTimeout(id);
                throw error;
            }
        };

        try {
            // Updated Priority: Try the backup key first as it might be more reliable
            let apiKeys = [
                '3cff7299a912e742886f3438ed22c60e', // Key 1
                '6d207e02198a847aa98d0a2a901485a5', // Key 2
                'f9c32a7a40232d3e52e464c8d1052609'  // Key 3 (Deep backup)
            ];

            let result = null;
            let success = false;

            // Try keys sequentially
            for (let getKey of apiKeys) {
                try {
                    console.log("Trying upload with key: " + getKey.substring(0, 5) + "...");
                    let response = await fetchWithTimeout(`https://api.imgbb.com/1/upload?key=${getKey}`, {
                        method: 'POST',
                        body: formData
                    });

                    let data = await response.json();
                    if (data.success) {
                        result = data;
                        success = true;
                        break; // Stop loop if successful
                    }
                } catch (innerErr) {
                    console.warn("Key failed or timed out:", innerErr);
                    // Continue to next key
                }
            }

            if (success && result) {
                const directUrl = result.data.url;
                if (pImage) pImage.value = directUrl;
                showToast("Image uploaded successfully!", "success");
                if (uploadStatus) {
                    uploadStatus.textContent = "✓ Upload Complete";
                    uploadStatus.style.color = "#25D366";
                }
            } else {
                throw new Error("All upload keys failed. Please try a different image or check internet.");
            }
        } catch (err) {
            console.error("Upload error:", err);
            showToast("Upload failed: " + err.message, "error");
            if (uploadStatus) {
                uploadStatus.textContent = "✘ Upload Failed: " + err.message;
                uploadStatus.style.color = "#ff4d4d";
            }
        }
    });
}

// --- ADD PRODUCT FORM ---
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log("Form submitting...");

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

        try {
            await addDoc(collection(db, "products"), product);
            showStatus("Product added successfully!", "success");
            form.reset();
            loadProducts();
        } catch (error) {
            console.error("Error adding product: ", error);
            showStatus("Failed to add product: " + error.message, "error");
        }
    });
} else {
    console.error("Critical: Add Product Form not found in DOM");
}

// --- LOAD PRODUCTS ---
async function loadProducts() {
    if (!productList) return;
    productList.innerHTML = '<p>Refreshing inventory...</p>';

    try {
        // Fetch ALL products (Client-side sorting)
        const q = query(collection(db, "products"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            productList.innerHTML = '<p>No products found in database.</p>';
            return;
        }

        const products = [];
        querySnapshot.forEach((docSnap) => {
            products.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Client-side Sort (Newest First)
        products.sort((a, b) => {
            const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
            const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
            return dateB - dateA;
        });

        productList.innerHTML = '';
        products.forEach((product) => {
            const id = product.id;
            const inStock = product.inStock !== false;

            const div = document.createElement('div');
            div.className = 'admin-item';
            div.innerHTML = `
                <img src="${product.image}" onerror="this.src='https://via.placeholder.com/150'">
                <h4>${product.name}</h4>
                <p>
                    ${product.category} - Rs. ${parseFloat(product.price).toLocaleString()} <br>
                    <span style="font-weight: bold; color: ${inStock ? 'green' : 'red'};">
                        ${inStock ? '● In Stock' : '● Out of Stock'}
                    </span>
                </p>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button class="toggle-stock-btn" data-id="${id}" data-status="${inStock}" 
                        style="background: #333; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; flex: 1;">
                        ${inStock ? 'Mark Out of Stock' : 'Mark In Stock'}
                    </button>
                    <button class="delete-btn" data-id="${id}" style="flex: 1;">Remove</button>
                </div>
            `;
            productList.appendChild(div);
        });

        // Re-attach listeners after render
        attachItemListeners();

    } catch (error) {
        console.error("Error loading products: ", error);
        productList.innerHTML = `<p class="error" style="color: red; padding: 20px; border: 1px solid red;">
            <b>Error Loading Inventory:</b><br>${error.message}<br><br>
            If it says "Missing or insufficient permissions" or "Client is offline", 
            check your Firebase Console Rules or Internet Connection.
        </p>`;
    }
}

function attachItemListeners() {
    // 1. Stock Toggle
    document.querySelectorAll('.toggle-stock-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            const currentStatus = e.target.getAttribute('data-status') === 'true';
            try {
                await updateDoc(doc(db, "products", id), { inStock: !currentStatus });
                loadProducts();
            } catch (err) {
                alert("Failed to update stock status: " + err.message);
            }
        });
    });

    // 2. Delete
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            if (confirm("Are you sure you want to remove this product?")) {
                await deleteDoc(doc(db, "products", id));
                loadProducts();
            }
        });
    });
}

// --- MANAGE ORDERS ---
const ordersList = document.getElementById('ordersList');
const btnPending = document.getElementById('viewPendingOrders');
const btnCompleted = document.getElementById('viewCompletedOrders');
let currentOrderFilter = 'pending';

async function loadOrders() {
    if (!ordersList) return;
    ordersList.innerHTML = '<p>Loading orders...</p>';

    try {
        const q = query(collection(db, "orders"), where("status", "==", currentOrderFilter));
        onSnapshot(q, (snapshot) => {
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
                div.style.gridTemplateColumns = '1fr';
                div.style.padding = '1.5rem';
                div.style.borderLeft = currentOrderFilter === 'pending' ? '5px solid #ff9800' : '5px solid #4caf50';

                div.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span style="font-weight: bold; color: #121212; font-size: 1.1rem;">${order.customerName}</span>
                        <span style="font-size: 0.8rem; color: #999;">${date}</span>
                    </div>
                    <p style="margin-bottom: 5px;"><strong>Phone:</strong> ${order.customerPhone}</p>
                    <p style="margin-bottom: 5px;"><strong>Address:</strong> ${order.customerAddress}, ${order.customerCity}</p>
                    
                    <div style="background: #f9f9f9; padding: 12px; border: 1px solid #eee; border-radius: 8px; margin: 15px 0; font-size: 0.95rem; white-space: pre-line; color: #333;">
                        <strong style="display: block; margin-bottom: 5px; color: #666;">Items:</strong>
                        ${order.summary}
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 10px;">
                        ${currentOrderFilter === 'pending' ?
                        `<button class="complete-order-btn" data-id="${id}" style="background: #4caf50; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; flex: 1; font-weight: 600;">Mark Shipped / Complete</button>` :
                        `<button class="delete-order-btn" data-id="${id}" style="background: #ff4d4d; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; flex: 1; font-weight: 600;">Delete Permanently</button>`
                    }
                    </div>
                `;
                ordersList.appendChild(div);
            });

            attachOrderListeners();
        });
    } catch (err) {
        ordersList.innerHTML = "Error loading orders.";
        console.error(err);
    }
}

function attachOrderListeners() {
    document.querySelectorAll('.complete-order-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const id = e.target.dataset.id;
            try {
                await updateDoc(doc(db, "orders", id), { status: 'completed' });
                showStatus("Order marked as complete!", "success");
            } catch (err) { showToast(err.message, "error"); }
        };
    });

    document.querySelectorAll('.delete-order-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const id = e.target.dataset.id;
            // Native confirm is still fine for destructive actions, but we use Toast for result
            if (confirm("Delete this order log permanently?")) {
                try {
                    await deleteDoc(doc(db, "orders", id));
                    showToast("Order log deleted.", "success");
                } catch (err) { showToast(err.message, "error"); }
            }
        };
    });
}

if (btnPending) {
    btnPending.onclick = () => {
        currentOrderFilter = 'pending';
        btnPending.style.background = '#333'; btnPending.style.color = '#fff';
        btnCompleted.style.background = '#eee'; btnCompleted.style.color = '#333';
        loadOrders();
    };
}

if (btnCompleted) {
    btnCompleted.onclick = () => {
        currentOrderFilter = 'completed';
        btnCompleted.style.background = '#333'; btnCompleted.style.color = '#fff';
        btnPending.style.background = '#eee'; btnPending.style.color = '#333';
        loadOrders();
    };
}

// --- SIDEBAR NAVIGATION ---
const sidebarBtns = document.querySelectorAll('.sidebar-btn');
const adminSections = document.querySelectorAll('.admin-section');

if (sidebarBtns.length > 0) {
    sidebarBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target');
            if (!target) return; // For the "View Website" link

            // Update Active Button
            sidebarBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Show Target Section
            adminSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === target) {
                    section.classList.add('active');
                }
            });

            // Auto-refresh data if needed
            if (target === 'section-orders') loadOrders();
            if (target === 'section-inventory') loadProducts();

        });
    });
}

// Initial Load
loadProducts();
loadContactInfo();
loadOrders();
