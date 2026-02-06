import { db, storage } from './firebase-config.js';
import { doc, serverTimestamp, query, setDoc, onSnapshot, collection } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- ADMIN SECURITY PIN LOGIC ---
const PIN = "4321";
const authOverlay = document.getElementById('adminAuthOverlay');
const mainContent = document.getElementById('adminMainContent');
const pinInput = document.getElementById('adminPin');
const loginBtn = document.getElementById('loginBtn');
const authError = document.getElementById('authError');
const logoutBtn = document.getElementById('logoutBtn');
const activeSessionCountLabel = document.getElementById('activeSessionCount');

export function checkAuth() {
    if (sessionStorage.getItem('adminAuthenticated') === 'true') {
        if (authOverlay) authOverlay.style.display = 'none';
        if (mainContent) mainContent.style.display = 'block';
        startSessionTracking();
    } else {
        if (authOverlay) authOverlay.style.display = 'flex';
        if (mainContent) mainContent.style.display = 'none';
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
        location.href = 'admin.html'; // Go back to main admin or login
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

    if (activeSessionCountLabel) {
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
            activeSessionCountLabel.textContent = `🟢 Active Admins: ${count}`;
        });
    }
}

// Highlight active sidebar link
export function highlightSidebar() {
    const currentPage = window.location.pathname.split('/').pop();
    const sidebarLinks = document.querySelectorAll('.admin-sidebar a');
    sidebarLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Export Toast/Status
export function showToast(msg, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = '✔';
    if (type === 'error') icon = '✖';
    if (type === 'info') icon = 'ℹ';

    toast.innerHTML = `<span>${icon}</span> <span>${msg}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Help prevent XSS
export function escapeHTML(str) {
    if (!str) return "";
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
}
