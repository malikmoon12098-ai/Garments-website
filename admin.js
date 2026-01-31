import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, setDoc, getDoc, updateDoc, onSnapshot, where, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

console.log("Admin Script Loaded"); // Debugging

// DOM Elements with safe checks
const form = document.getElementById('addProductForm');
const contactForm = document.getElementById('contactSettingsForm');
const statusDiv = document.getElementById('status');
const productList = document.getElementById('productList');
const accessLogList = document.getElementById('accessLogList');
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
            logAccess();
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

// --- SECURITY TRACKING ---
async function logAccess() {
    try {
        await addDoc(collection(db, "access_logs"), {
            timestamp: serverTimestamp(),
            userAgent: navigator.userAgent,
            type: 'LOGIN'
        });
        if (accessLogList) loadAccessLogs();
    } catch (e) { console.error("Log error", e); }
}

async function loadAccessLogs() {
    if (!accessLogList) return;
    try {
        const q = query(collection(db, "access_logs"), limit(10));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            accessLogList.innerHTML = '';
            snapshot.forEach(doc => {
                const data = doc.data();
                const date = data.timestamp ? data.timestamp.toDate().toLocaleString() : 'Just now';
                let device = "Unknown Device";
                if (data.userAgent.includes("Mobile")) device = "Mobile";
                else if (data.userAgent.includes("Windows")) device = "Windows PC";
                else if (data.userAgent.includes("Mac")) device = "Mac";

                const div = document.createElement('div');
                div.style.borderBottom = "1px solid #333";
                div.style.padding = "5px 0";
                div.innerHTML = `<span style="color: #25D366;">● Login</span> - ${date} <br> <span style="color: #888;">${device}</span>`;
                accessLogList.appendChild(div);
            });
        });
    } catch (e) {
        if (accessLogList) accessLogList.innerHTML = "Error loading logs.";
    }
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
    if (accessLogList) loadAccessLogs();
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

// --- UTILS ---
function showStatus(msg, type) {
    if (!statusDiv) return;
    statusDiv.textContent = msg;
    statusDiv.className = `status-msg ${type}`;
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.className = 'status-msg';
        }, 5000);
    }
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

// --- ADD PRODUCT FORM ---
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // CRITICAL: Prevents reload
        console.log("Form submitting...");

        showStatus("Adding product...", "success");

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
                        <span style="font-weight: bold; color: #666;">ID: ${order.customerCode}</span>
                        <span style="font-size: 0.8rem; color: #999;">${date}</span>
                    </div>
                    <p><strong>Customer:</strong> ${order.customerName}</p>
                    <div style="background: #fdfdfd; padding: 10px; border: 1px dashed #ddd; margin: 10px 0; font-size: 0.9rem; white-space: pre-line;">
                        ${order.summary}
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 10px;">
                        ${currentOrderFilter === 'pending' ?
                        `<button class="complete-order-btn" data-id="${id}" style="background: #4caf50; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; flex: 1;">Mark Complete</button>` :
                        `<button class="delete-order-btn" data-id="${id}" style="background: #ff4d4d; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; flex: 1;">Delete Log</button>`
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
            } catch (err) { alert(err.message); }
        };
    });

    document.querySelectorAll('.delete-order-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const id = e.target.dataset.id;
            if (confirm("Delete this order log permanently?")) {
                try {
                    await deleteDoc(doc(db, "orders", id));
                    showStatus("Order log deleted.", "success");
                } catch (err) { alert(err.message); }
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

// Initial Load
loadProducts();
loadContactInfo();
loadOrders();
