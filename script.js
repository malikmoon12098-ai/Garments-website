document.addEventListener('DOMContentLoaded', () => {
    const header = document.getElementById('header');

    // Header Scroll Effect
    window.addEventListener('scroll', () => {
        if (header) { // Keep the check for header existence
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        }
    });

    // Mobile Menu Toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            mobileMenuBtn.classList.toggle('active');
        });
    }



    // Featured Products Logic (Minimal fetch for Home)
    const featuredGrid = document.getElementById('featuredGrid');
    if (featuredGrid) {
        async function loadFeatured() {
            try {
                const { db } = await import('./firebase-config.js');
                const { collection, getDocs, limit, query } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

                const q = query(collection(db, "products"), limit(4));
                const querySnapshot = await getDocs(q);

                featuredGrid.innerHTML = '';
                querySnapshot.forEach((doc) => {
                    const p = { id: doc.id, ...doc.data() };
                    featuredGrid.innerHTML += `
                        <div class="product-card fade-in">
                            <a href="product.html?id=${p.id}" style="text-decoration: none; color: inherit;">
                                <div class="product-img">
                                    <img src="${p.image}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/400x500'">
                                </div>
                                <div class="product-info">
                                    <span class="category">${p.category}</span>
                                    <h3 class="name">${p.name}</h3>
                                    <span class="price">Rs. ${parseFloat(p.price).toLocaleString()}</span>
                                </div>
                            </a>
                        </div>
                    `;
                });
            } catch (error) {
                console.error("Error loading featured products:", error);
                featuredGrid.innerHTML = '<p style="text-align: center; width: 100%;">Discover our collection in the shop.</p>';
            }
        }
        loadFeatured();
    }

    // Cart Badge Update Logic
    function updateCartBadge() {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const badges = document.querySelectorAll('#cartBadge');
        badges.forEach(badge => {
            badge.textContent = cart.length;
            badge.style.display = cart.length > 0 ? 'flex' : 'none';
        });
    }

    // Initial check
    updateCartBadge();

    // Listen for storage changes (if shopping in multiple tabs)
    window.addEventListener('storage', updateCartBadge);

    // Add to cart events (if any on this page)
    window.addEventListener('cartUpdated', updateCartBadge);
});
