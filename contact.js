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
                const instaLink = document.getElementById('displayInsta');
                instaLink.href = data.insta;
                instaLink.style.display = 'inline-block';
            }

            if (data.fb) {
                const fbLink = document.getElementById('displayFB');
                fbLink.href = data.fb;
                fbLink.style.display = 'inline-block';
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
