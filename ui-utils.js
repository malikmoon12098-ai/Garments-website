/**
 * KHADER Premium UI Utilities
 * Shared helper functions for glassy toasts and confirmation modals.
 */

// --- TOAST NOTIFICATIONS ---

export function showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Add icon based on type
    let icon = '🔔';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'info') icon = 'ℹ️';

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-msg">${message}</span>
    `;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// --- CONFIRMATION MODALS ---

export function showConfirm(title, message, callback) {
    const overlay = document.createElement('div');
    overlay.className = 'glass-modal-overlay';

    overlay.innerHTML = `
        <div class="glass-modal">
            <h3>${title}</h3>
            <p>${message}</p>
            <div class="glass-modal-actions">
                <button class="btn-cancel">Nahin</button>
                <button class="btn-confirm">Haan, Bilkul</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    const close = () => {
        overlay.remove();
        document.body.style.overflow = '';
    };

    overlay.querySelector('.btn-cancel').onclick = close;
    overlay.querySelector('.btn-confirm').onclick = () => {
        callback();
        close();
    };

    // Close on click outside
    overlay.onclick = (e) => {
        if (e.target === overlay) close();
    };
}

// --- SOCIAL DEEP LINKING ---

export function openSocialApp(platform, webUrl, appUri, fallbackCallback) {
    let appOpened = false;

    // Function to handle visibility change
    const handleVisibilityChange = () => {
        if (document.hidden) {
            appOpened = true;
        }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 1. Attempt to open via Custom URI Scheme (Deep Link)
    if (appUri) {
        window.location.href = appUri;
    }

    // 2. Fallback after a delay
    setTimeout(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);

        if (!appOpened && !document.hidden) {
            if (fallbackCallback) {
                fallbackCallback();
            } else if (webUrl) {
                window.open(webUrl, '_blank');
            }
        }
    }, 1200);
}

