import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function loadContactPage() {
    try {
        const docSnap = await getDoc(doc(db, "settings", "contact"));

        if (docSnap.exists()) {
            const data = docSnap.data();

            document.getElementById('displayPhone').textContent = data.phone || 'Not available';
            document.getElementById('displayEmail').textContent = data.email || 'Not available';
            document.getElementById('displayAddress').textContent = data.address || 'Not available';

            if (data.insta) {
                document.getElementById('itemInsta').style.display = 'block';
                const instaLink = document.getElementById('displayInsta');
                instaLink.href = data.insta;

                // Try to extract handle for a cleaner look
                try {
                    const url = new URL(data.insta);
                    const handle = url.pathname.replace(/\//g, '');
                    if (handle) instaLink.textContent = `@${handle}`;
                } catch (e) {
                    instaLink.textContent = 'Visit Instagram';
                }
            }

            if (data.fb) {
                document.getElementById('itemFB').style.display = 'block';
                const fbLink = document.getElementById('displayFB');
                fbLink.href = data.fb;
                fbLink.textContent = 'Chat on Facebook';
            }
        } else {
            document.getElementById('displayPhone').textContent = 'Contact details coming soon';
            document.getElementById('displayEmail').textContent = '';
            document.getElementById('displayAddress').textContent = '';
        }
    } catch (error) {
        console.error("Error loading contact info:", error);
    }
}

loadContactPage();
