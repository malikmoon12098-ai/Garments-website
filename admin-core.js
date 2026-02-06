import { db, storage } from './firebase-config.js';
import { doc, serverTimestamp, query, setDoc, onSnapshot, collection } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showToast, showConfirm } from './ui-utils.js';
export { showToast, showConfirm };

// --- ADMIN SECURITY PIN LOGIC ---
const PIN = "4321";
const authOverlay = document.getElementById('adminAuthOverlay');
const mainContent = document.getElementById('adminMainContent');
const pinInput = document.getElementById('adminPin');
const loginBtn = document.getElementById('loginBtn');
const authError = document.getElementById('authError');

export function checkAuth() {
    if (sessionStorage.getItem('adminAuthenticated') === 'true') {
        if (authOverlay) authOverlay.style.display = 'none';
        if (mainContent) mainContent.style.display = 'block';
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
        } else {
            if (authError) authError.style.display = 'block';
            if (pinInput) pinInput.value = '';
        }
    });
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

// showToast and showConfirm are now imported and exported from ui-utils.js

// Help prevent XSS
export function escapeHTML(str) {
    if (!str) return "";
    const p = document.createElement('p');
    p.textContent = str;
    return p.innerHTML;
}
