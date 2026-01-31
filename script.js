document.addEventListener('DOMContentLoaded', () => {
    const header = document.getElementById('header');

    // Sticky Header Logic
    window.addEventListener('scroll', () => {
        if (header) {
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

    // Redirect to Home on Refresh
    try {
        const perfEntries = performance.getEntriesByType("navigation");
        if (perfEntries.length > 0 && perfEntries[0].type === "reload") {
            if (!window.location.pathname.endsWith("index.html") && window.location.pathname !== "/") {
                window.location.href = "index.html";
            }
        }
    } catch (e) {
        console.log("Navigation API not supported");
    }
});
