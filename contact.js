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

            const instaLink = document.getElementById('displayInsta');
            if (data.insta && data.insta.trim() !== "") {
                instaLink.href = data.insta;
                try {
                    const url = new URL(data.insta);
                    const handle = url.pathname.replace(/\//g, '');
                    instaLink.textContent = handle ? `@${handle}` : 'Visit Instagram';
                } catch (e) {
                    instaLink.textContent = 'Visit Instagram';
                }
            } else {
                instaLink.textContent = 'Not linked';
                instaLink.href = '#';
            }

            const fbLink = document.getElementById('displayFB');
            if (data.fb && data.fb.trim() !== "") {
                fbLink.href = data.fb;
                fbLink.textContent = 'Chat on Facebook';
            } else {
                fbLink.textContent = 'Not linked';
                fbLink.href = '#';
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
