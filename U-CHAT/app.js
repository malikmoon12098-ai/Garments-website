// DOM Elements
const app = document.getElementById('app');
// Screens
const screenWelcome = document.getElementById('welcome-screen');
const screenHome = document.getElementById('home-screen');
const screenChat = document.getElementById('chat-screen');
// Home Elements
// Home Elements
const headerUserName = document.getElementById('header-username');
// DOM Elements (additions)
const btnProfilePic = document.getElementById('btn-profile-pic');
const fileProfilePic = document.getElementById('file-profile-pic');
const avatarInitials = document.getElementById('avatar-initials');
const avatarImg = document.getElementById('avatar-img');
const displayUserCode = document.getElementById('display-user-code');
// const btnCopyCode removed
const chatListContainer = document.getElementById('chat-list');

// ... (Rest of top section)

// Helper: Generate Color from Name
function getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + "00000".substring(0, 6 - c.length) + c;
}

const GEMINI_API_KEY = "AIzaSyD_MBj7nbv0T45pZEGd1noCIPlwcMRS50I"; // Gemini AI Key

// Function Update: loadUserProfile
function loadUserProfile() {
    if (myName) headerUserName.innerText = myName;
    if (myUserCode) displayUserCode.innerText = myUserCode;

    // Set Header Avatar
    const bgCol = getAvatarColor(myName || 'U');
    const btnAvatar = document.querySelector('.profile-avatar');
    if (btnAvatar) btnAvatar.style.backgroundColor = bgCol;

    if (myPhoto) {
        avatarImg.src = myPhoto;
        avatarImg.classList.remove('hidden');
        avatarInitials.classList.add('hidden');
    } else {
        avatarImg.classList.add('hidden');
        avatarInitials.classList.remove('hidden');
        avatarInitials.innerText = (myName || 'U').charAt(0).toUpperCase();
    }

    // GUEST RESTRICTIONS: Hide search and logout for guests
    if (myUserCode && myUserCode.startsWith('G-')) {
        if (btnShowAddUser) btnShowAddUser.style.display = 'none';
        if (chatSearchInput) chatSearchInput.parentElement.style.display = 'none';
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) logoutBtn.style.display = 'none';
        // Auto-hide chat list and stay in chat
        const homeList = document.getElementById('chat-list');
        if (homeList) homeList.style.display = 'none';
        const guestNote = document.getElementById('guest-note');
        if (!guestNote) {
            const note = document.createElement('div');
            note.id = 'guest-note';
            note.style.cssText = "padding:20px;text-align:center;color:#888;font-size:14px;";
            note.innerText = "Order conversation with Store";
            const chatListParent = document.querySelector('.list-container');
            if (chatListParent) chatListParent.parentNode.insertBefore(note, chatListParent);
        }
    }
}

const btnShowAddUser = document.getElementById('btn-show-add-user');
// Register Elements
const formRegister = document.getElementById('register-form');
// Chat Elements
const btnBackHome = document.getElementById('btn-back-home');
const btnSendMessage = document.getElementById('btn-send-message');
const messageInput = document.getElementById('message-input');
const messagesContainer = document.getElementById('messages-container');
const chatUserNameHeader = document.getElementById('chat-user-name');
// Modal Elements
const modalAddUser = document.getElementById('add-user-modal');
const inputSearchUser = document.getElementById('search-user-code');
const btnSearchUser = document.getElementById('btn-search-user');
const btnCloseModal = document.getElementById('btn-close-modal');
const searchResultBox = document.getElementById('search-result');
const resultName = document.getElementById('result-name');
const resultBio = document.getElementById('result-bio');
const btnAddChat = document.getElementById('btn-add-chat');

// Chat Options Modal Elements
const modalChatOptions = document.getElementById('chat-options-modal');
const btnCloseOptions = document.getElementById('btn-close-options');
const customChatNameInput = document.getElementById('custom-chat-name-input');
const btnSaveChatName = document.getElementById('btn-save-chat-name');
const btnToggleBlock = document.getElementById('btn-toggle-block');

// New Header/Profile Elements
const chatHeaderClickable = document.getElementById('chat-header-clickable');
const btnChatOptions = document.getElementById('btn-chat-options');
const modalUserProfile = document.getElementById('user-profile-modal');
const btnCloseProfile = document.getElementById('btn-close-profile');
const profileModalImg = document.getElementById('profile-modal-img');
const profileModalInitials = document.getElementById('profile-modal-initials');
const profileModalName = document.getElementById('profile-modal-name');
const profileModalBio = document.getElementById('profile-modal-bio');
const profileModalId = document.getElementById('profile-modal-id');

// Context Menu Elements
const chatContextMenu = document.getElementById('chat-context-menu');
const ctxPinUnpin = document.getElementById('ctx-pin-unpin');
const ctxToggleBlockChat = document.getElementById('ctx-toggle-block-chat');
const ctxDeleteChat = document.getElementById('ctx-delete-chat');

// Naye context menu elements
const chatOptionsContextMenu = document.getElementById('chat-options-context-menu');
const ctxToggleBlock = document.getElementById('ctx-toggle-block');
const messageContextMenu = document.getElementById('message-context-menu');
const ctxDeleteMsg = document.getElementById('ctx-delete-msg');

// State
// Consolidated State retrieval
function getStoredUserId() {
    return localStorage.getItem('uchat_userid') ||
        localStorage.getItem('uchat_user_id') ||
        localStorage.getItem('userId'); // Old keys cleanup
}

let myUserId = getStoredUserId();
let myUserCode = localStorage.getItem('uchat_usercode');
let myName = localStorage.getItem('uchat_username');
let myPhoto = localStorage.getItem('uchat_userphoto');
let currentChatId = null;
let currentChatUnsubscribe = null;
let chatsListUnsubscribe = null;
let foundUserForChat = null; // Storing temporary search result
let selectedChatForOptions = null; // Track chat being modified in options
let contextMenuTargetChatId = null; // Track chat for context menu
let contextMenuTargetData = null;
let msgContextMenuTargetId = null;
let msgContextMenuTargetChatId = null;

// --- Initialization ---
let db;
let isDemoMode = false;

// Check if Firebase Config is valid (not placeholders)
// We assume firebaseConfig is globally available from firebase-config.js
if (typeof firebaseConfig === 'undefined' || firebaseConfig.apiKey === "YOUR_API_KEY") {
    console.warn("Firebase config missing or invalid. Switching to DEMO MODE (LocalStorage).");
    isDemoMode = true;
    db = new MockFirestore();

    // Show a visual indicator
    const demoBanner = document.createElement('div');
    demoBanner.style.cssText = "position:fixed;top:0;left:0;right:0;background:#ff9800;color:black;text-align:center;font-size:12px;padding:2px;z-index:9999;";
    demoBanner.innerText = "DEMO MODE (Offline) - Setup Firebase to go live";
    document.body.appendChild(demoBanner);

} else if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig); // Initialize App first!
    db = firebase.firestore();
} else {
    console.error("Firebase SDK not loaded.");
}

async function getOwnerCode() {
    try {
        const snap = await db.collection('settings').doc('contact').get();
        if (snap.exists) return snap.data().uChatCode || null;
    } catch (e) { console.error("Error fetching owner code", e); }
    return null;
}

// Ensure init runs and repairs session if needed
async function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const orderText = urlParams.get('orderText');

    // 1. Force state refresh from storage
    myUserId = getStoredUserId();
    console.log("UCHAT Init - ID:", myUserId, "Order:", !!orderText);

    // 2. Handle First-Time Guest arriving with an order
    if (!myUserId && orderText) {
        showToast("Starting Guest Session...");
        const guestCode = "G-" + Math.floor(100000 + Math.random() * 900000);
        try {
            const userRef = db.collection('users').doc();
            const userData = {
                userId: userRef.id,
                firstName: "Guest",
                lastName: "User",
                description: "Customer from Shop",
                userCode: guestCode,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            await userRef.set(userData);

            // Save immediately
            localStorage.setItem('uchat_userid', userRef.id);
            localStorage.setItem('uchat_usercode', guestCode);
            localStorage.setItem('uchat_username', "Guest User");

            myUserId = userRef.id;
            myUserCode = guestCode;
            myName = "Guest User";
            console.log("Guest Registered:", myUserId);
        } catch (e) {
            console.error("Guest registration failed", e);
            showToast("Login error. Please try again.");
            return;
        }
    }

    // 3. Main Application Start
    if (myUserId) {
        // Repair Mode: If name is missing but ID exists
        if (!myName || myName === "undefined" || myName === "null") {
            try {
                const docSnap = await db.collection('users').doc(myUserId).get();
                if (docSnap.exists) {
                    const data = docSnap.data();
                    myName = (data.firstName || "Guest") + " " + (data.lastName || "User");
                    myUserCode = data.userCode;
                    localStorage.setItem('uchat_username', myName);
                    localStorage.setItem('uchat_usercode', myUserCode);
                }
            } catch (e) { console.error("Session Repair Failed", e); }
        }

        showScreen('home');
        loadUserProfile();
        listenToChats();
        updatePresence(true);
        cleanupOldMessages();

        if (orderText) {
            // Give Firebase a moment to sync the message listener before opening
            setTimeout(() => handleAutoOrder(orderText), 500);
        }
    } else {
        showScreen('welcome');
    }
}

async function handleAutoOrder(text) {
    console.log("Handling Auto Order...");
    showToast("Connecting to Shop...");
    try {
        // 1. Find Owner
        let ownerCode = await getOwnerCode();
        if (!ownerCode) {
            showToast("Error: Store ID not found in settings.");
            return;
        }
        ownerCode = ownerCode.trim().toUpperCase();
        console.log("Searching for Owner Code:", ownerCode);
        showToast("Finding Store: " + ownerCode);

        const snapshot = await db.collection('users').where('userCode', '==', ownerCode).get();
        if (snapshot.empty) {
            console.error("Owner Not Found in DB for code:", ownerCode);
            showToast("Store Account Not Found! Please check Admin code.");
            return;
        }

        const ownerData = snapshot.docs[0].data();
        const ownerId = ownerData.userId;
        console.log("Owner Found! ID:", ownerId);
        showToast("Store Found! Opening Chat...");

        // 2. Setup Chat
        const uids = [myUserId, ownerId].sort();
        const chatId = `${uids[0]}_${uids[1]}`;
        const chatRef = db.collection('chats').doc(chatId);
        const chatDoc = await chatRef.get();

        const timestamp = firebase.firestore.FieldValue.serverTimestamp();

        if (!chatDoc.exists) {
            await chatRef.set({
                participants: uids,
                lastMessage: text,
                lastMessageTime: timestamp,
                lastSenderId: myUserId,
                participantData: {
                    [myUserId]: { name: myName, code: myUserCode, photo: myPhoto || null },
                    [ownerId]: { name: ownerData.firstName + " " + ownerData.lastName, code: ownerData.userCode, photo: ownerData.photoBase64 || null }
                }
            });

            // Initial message
            await chatRef.collection('messages').add({
                senderId: myUserId,
                text: text,
                timestamp: timestamp
            });
        } else {
            // Append new order message to existing chat
            await chatRef.update({
                lastMessage: text,
                lastMessageTime: timestamp,
                lastSenderId: myUserId
            });
            await chatRef.collection('messages').add({
                senderId: myUserId,
                text: text,
                timestamp: timestamp
            });
        }

        // 3. Switch to Chat Screen
        openChat(chatId, ownerData.firstName + " " + ownerData.lastName, ownerId);

        // 4. Trigger AI
        setTimeout(() => triggerAIResponse(chatId, "NEW_ORDER_START"), 1500);

    } catch (e) {
        console.error("Auto-order fail:", e);
        showToast("Error connecting to store.");
    }
}

// AI & Order Automation
async function triggerAIResponse(chatId, customerMsg) {
    if (GEMINI_API_KEY === "REPLACE_WITH_YOUR_GEMINI_KEY" || !GEMINI_API_KEY) return;

    console.log("AI Triggered for:", customerMsg);
    showToast("Shop Assistant thinking...");

    try {
        // 1. Get History (Simplify query to avoid index errors)
        const msgsSnapshot = await db.collection('chats').doc(chatId).collection('messages')
            .limit(20)
            .get();

        let history = [];
        msgsSnapshot.forEach(doc => history.push(doc.data()));

        // Sort manually
        history.sort((a, b) => {
            const tA = (a.timestamp && a.timestamp.toMillis) ? a.timestamp.toMillis() : 0;
            const tB = (b.timestamp && b.timestamp.toMillis) ? b.timestamp.toMillis() : 0;
            return tA - tB;
        });

        // CHECK IF CUSTOMER JUST SAID "CONFIRM"
        if (customerMsg.trim().toUpperCase() === "CONFIRM") {
            // Check if AI previously asked for it
            const lastAI = [...history].reverse().find(m => m.senderId !== myUserId);
            if (lastAI && lastAI.text.includes("CONFIRM")) {
                saveOrderToFirestore(chatId, "Order Confirmed by Customer.\n\n" + history.map(m => m.text).join('\n'));
                // Let AI acknowledge
                customerMsg = "I HAVE TYPED CONFIRM";
            }
        }

        // 2. Ask Gemini
        const aiResponse = await askAI(customerMsg, history);
        if (!aiResponse) return;

        // 3. Find Owner ID dynamically
        let ownerCode = await getOwnerCode();
        if (!ownerCode) {
            console.error("AI Error: No owner code");
            return;
        }
        ownerCode = ownerCode.trim().toUpperCase();

        const snapshot = await db.collection('users').where('userCode', '==', ownerCode).get();
        if (snapshot.empty) {
            console.error("AI Error: Owner not found in DB");
            showToast("AI Error: Store Account (" + ownerCode + ") not found!");
            return;
        }
        const ownerId = snapshot.docs[0].id;

        // 4. Send AI Response
        const batch = db.batch();
        const msgRef = db.collection('chats').doc(chatId).collection('messages').doc();
        batch.set(msgRef, {
            senderId: ownerId,
            text: aiResponse,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        const chatRef = db.collection('chats').doc(chatId);
        batch.update(chatRef, {
            lastMessage: aiResponse,
            lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
            lastSenderId: ownerId
        });
        await batch.commit();
        console.log("AI Replied:", aiResponse);
        showToast("New message from Store!");

        // 5. Detect PWA Prompt (Fixed Reference Error)
        const pwaPrompt = document.getElementById('pwa-prompt-banner');
        if (pwaPrompt && aiResponse.includes("CONFIRM") && !aiResponse.includes("EK DAFA CONFIRM")) {
            pwaPrompt.style.display = 'flex';
        }
    } catch (e) {
        console.error("AI Trigger Error", e);
        // showToast("AI Error. Check console."); 
    }
}

async function askAI(message, history) {
    const prompt = `You are a professional sales assistant for "KHADER Garments Store".
    
    STRICT RULES:
    1. If message is "NEW_ORDER_START", greet nicely in Roman Urdu and ask for: 
       - 1. Name
       - 2. Phone Number
       - 3. Address
    2. If customer provides details, summarize them and say EXACTLY: "EK DAFA CONFIRM LIKH DEN TAKE ORDER CONFIRM HO JAE."
    3. If customer says "CONFIRM", say "Shukriya! Apka order received ho gaya he. Hamara staff jald hi apse rabta karega."
    4. If customer asks any questions after confirmation, answer them in very simple words ("asan lafzoon me").
    5. LANGUAGE: 
       - Initial must be Roman Urdu.
       - If user speaks Urdu (script), reply in Urdu (script).
       - If user speaks English, reply in English.
       - Otherwise, stay in Roman Urdu.

    History:
    ${history.map(m => (m.senderId === myUserId ? "Customer: " : "Store: ") + m.text).join('\n')}
    
    Response:`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();

        if (data.error) {
            console.error("Gemini API Error:", data.error.message);
            showToast("AI Error: " + data.error.message);
            return null;
        }

        if (!data.candidates || data.candidates.length === 0) {
            showToast("AI Error: No response from Gemini.");
            return null;
        }

        return data.candidates[0].content.parts[0].text;
    } catch (e) {
        console.error("AI Fetch error:", e);
        showToast("AI Network Error. Check connection.");
        return null;
    }
}

async function saveOrderToFirestore(chatId, summary) {
    try {
        await db.collection('orders').add({
            chatId: chatId,
            customerName: myName,
            customerCode: myUserCode,
            summary: summary,
            status: 'pending',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast("Order placed successfully!");
    } catch (e) {
        console.error("Order save error", e);
        showToast("Could not save order log.");
    }
}

// Auto-Delete Old Messages (1 week)
async function cleanupOldMessages() {
    if (isDemoMode) return; // Skip in demo mode

    // Throttle: Only run once per day
    const lastCleanup = localStorage.getItem('uchat_last_cleanup');
    const now = Date.now();
    if (lastCleanup && (now - parseInt(lastCleanup)) < 24 * 60 * 60 * 1000) {
        console.log("Cleanup skipped (ran < 24h ago)");
        return;
    }

    console.log("Running message cleanup...");
    const cutoffTime = now - (7 * 24 * 60 * 60 * 1000); // 7 days ago

    try {
        // Get all chats user is part of
        const chatsSnapshot = await db.collection('chats')
            .where('participants', 'array-contains', myUserId)
            .get();

        let deletedCount = 0;
        const batch = db.batch();

        for (const chatDoc of chatsSnapshot.docs) {
            const messagesSnapshot = await db.collection('chats')
                .doc(chatDoc.id)
                .collection('messages')
                .get();

            messagesSnapshot.forEach(msgDoc => {
                const msgData = msgDoc.data();
                if (msgData.timestamp && msgData.timestamp.toMillis() < cutoffTime) {
                    batch.delete(msgDoc.ref);
                    deletedCount++;
                }
            });
        }

        if (deletedCount > 0) {
            await batch.commit();
            console.log(`Deleted ${deletedCount} old messages`);
        }

        localStorage.setItem('uchat_last_cleanup', now.toString());
    } catch (error) {
        console.error("Cleanup error:", error);
    }
}

// Presence Logic
function updatePresence(isOnline) {
    if (!myUserId || isDemoMode) return;
    const userRef = db.collection('users').doc(myUserId);
    userRef.update({
        isOnline: isOnline,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(e => console.log("Presence err", e));
}

document.addEventListener('visibilitychange', () => {
    updatePresence(document.visibilityState === 'visible');
});
window.addEventListener('beforeunload', () => {
    updatePresence(false);
});

// === DEMO MODE DATA ===
function MockFirestore() {
    this.data = JSON.parse(localStorage.getItem('uchat_db') || '{"users":{}, "chats":{}}');

    this.save = () => localStorage.setItem('uchat_db', JSON.stringify(this.data));

    this.collection = (collName) => {
        return new MockCollection(this, collName);
    };

    this.batch = () => {
        return {
            set: (ref, data) => ref.set(data),
            update: (ref, data) => ref.update(data),
            commit: async () => true
        };
    }
}

function MockCollection(dbInstance, collName) {
    this.db = dbInstance;
    this.name = collName;

    this.doc = (id) => {
        const docId = id || 'mock_' + Date.now() + Math.random().toString(36).substr(2, 5);
        return new MockDoc(this.db, this.name, docId);
    };

    this.where = (field, op, value) => {
        return {
            get: async () => {
                const results = [];
                const collection = this.db.data[this.name] || {};
                for (const key in collection) {
                    if (collection[key][field] === value) {
                        results.push({ id: key, data: () => collection[key], exists: true });
                    }
                }
                return { empty: results.length === 0, docs: results };
            },
            orderBy: () => this.where(field, op, value), // chain support
            onSnapshot: (cb) => {
                this.where(field, op, value).get().then(cb);
                // Mock realtime: just poll
                const interval = setInterval(() => {
                    this.where(field, op, value).get().then(cb);
                }, 1000);
                return () => clearInterval(interval);
            }
        };
    };
}

function MockDoc(dbInstance, collName, docId) {
    this.db = dbInstance;
    this.coll = collName;
    this.id = docId;

    this.set = async (data) => {
        if (!this.db.data[this.coll]) this.db.data[this.coll] = {};
        this.db.data[this.coll][this.id] = data;
        this.db.save();
    };

    this.get = async () => {
        const data = this.db.data[this.coll] ? this.db.data[this.coll][this.id] : null;
        return { exists: !!data, data: () => data, id: this.id };
    };

    this.update = async (data) => {
        if (this.db.data[this.coll] && this.db.data[this.coll][this.id]) {
            Object.assign(this.db.data[this.coll][this.id], data);
            this.db.save();
        }
    };

    this.collection = (subCollName) => {
        // Mock subcollection: store as "chats_messages_chatId" in root for simplicity or nested
        // Let's use a flat key convention: "sub_chats_messages_chatId"
        const flatKey = `sub_${this.coll}_${subCollName}_${this.id}`;
        return {
            doc: () => new MockDoc(this.db, flatKey, 'msg_' + Date.now()),
            orderBy: () => ({
                onSnapshot: (cb) => {
                    const getDocs = () => {
                        const res = [];
                        const sub = this.db.data[flatKey] || {};
                        Object.keys(sub).sort().forEach(k => {
                            res.push({ data: () => sub[k], id: k });
                        });
                        return { forEach: (fn) => res.forEach(fn), empty: res.length === 0 };
                    };
                    cb(getDocs());
                    const interval = setInterval(() => cb(getDocs()), 1000);
                    return () => clearInterval(interval);
                }
            })
        }
    }
}
// --- End Mock Firestore ---

// --- Functions ---
function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('Active'));
    if (name === 'welcome') screenWelcome.classList.add('Active');
    if (name === 'home') screenHome.classList.add('Active');
    if (name === 'chat') screenChat.classList.add('Active');
}

// 1. Registration
formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fname = document.getElementById('reg-firstname').value.trim();
    const lname = document.getElementById('reg-lastname').value.trim();
    const bio = document.getElementById('reg-bio').value.trim();

    if (!fname || !lname) return;

    // Generate User Code
    const code = "U-" + Math.floor(100000 + Math.random() * 900000);

    // Create User Object
    // We'll use a random doc ID for security, or we can use the code if unique.
    // Let's use Firestore Auto-ID for userId
    try {
        const userRef = db.collection('users').doc();
        const userData = {
            userId: userRef.id,
            firstName: fname,
            lastName: lname,
            description: bio,
            userCode: code,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await userRef.set(userData);

        // Save locally
        localStorage.setItem('uchat_userid', userRef.id);
        localStorage.setItem('uchat_usercode', code);
        localStorage.setItem('uchat_username', fname + " " + lname);

        myUserId = userRef.id;
        myUserCode = code;
        myName = fname + " " + lname;

        // Reset form
        formRegister.reset();

        // Go Home
        showScreen('home');
        displayUserCode.innerText = myUserCode;
        listenToChats(); // Start listening

    } catch (error) {
        console.error("Error creating account:", error);
        showToast("Error creating account. Check console.");
    }
});

// Old loadUserProfile removed (logic is now at top/handled)
// Old btnCopyCode listener removed

btnShowAddUser.addEventListener('click', () => {
    modalAddUser.style.display = 'flex';
    inputSearchUser.value = '';
    searchResultBox.classList.add('hidden');
    foundUserForChat = null;
});

btnCloseModal.addEventListener('click', () => {
    modalAddUser.style.display = 'none';
});

btnSearchUser.addEventListener('click', async () => {
    const codeToSearch = inputSearchUser.value.trim().toUpperCase();
    if (!codeToSearch) {
        showToast("Please enter a User Code!");
        return;
    }

    // Feedback
    resultName.innerText = "Searching...";
    searchResultBox.classList.remove('hidden');

    if (codeToSearch === myUserCode) {
        showToast("You cannot chat with yourself!");
        searchResultBox.classList.add('hidden');
        return;
    }

    try {
        const snapshot = await db.collection('users').where('userCode', '==', codeToSearch).get();
        if (snapshot.empty) {
            showToast("User not found!");
            searchResultBox.classList.add('hidden');
            foundUserForChat = null;
        } else {
            const userDoc = snapshot.docs[0];
            const userData = userDoc.data();
            foundUserForChat = userData;

            resultName.innerText = `${userData.firstName} ${userData.lastName}`;
            resultBio.innerText = userData.description || "No bio";
            // Removed hidden class above
        }
    } catch (error) {
        console.error("Search error:", error);
        showToast("Search Error");
    }
});

btnAddChat.addEventListener('click', async () => {
    if (!foundUserForChat) {
        showToast("Please search for a user first!");
        return;
    }

    // Create Chat ID (Sort UIDs to make it deterministic: user1 < user2)
    const uids = [myUserId, foundUserForChat.userId].sort();
    const chatId = `${uids[0]}_${uids[1]}`;

    try {
        // Check if chat exists, if not create
        const chatRef = db.collection('chats').doc(chatId);
        const doc = await chatRef.get();

        if (!doc.exists) {
            await chatRef.set({
                participants: uids,
                lastMessage: "Chat started",
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                participantData: {
                    [myUserId]: { name: myName, code: myUserCode, photo: myPhoto || null },
                    [foundUserForChat.userId]: {
                        name: `${foundUserForChat.firstName} ${foundUserForChat.lastName}`,
                        code: foundUserForChat.userCode,
                        photo: foundUserForChat.photoBase64 || null
                    }
                }
            });
            showToast("New Chat Started!"); // Feedback
        } else {
            showToast("Chat already exists!");
        }

        modalAddUser.style.display = 'none';
        // Does not auto-open chat, just appears in list (realtime listener will catch it)
    } catch (error) {
        console.error("Error adding chat:", error);
        showToast("Failed to create chat");
    }
});

// 3. Home: List Chats
function listenToChats() {
    if (chatsListUnsubscribe) chatsListUnsubscribe();

    console.log("Listening for chats for user:", myUserId);

    chatsListUnsubscribe = db.collection('chats')
        .where('participants', 'array-contains', myUserId)
        .onSnapshot(snapshot => {
            console.log("Snapshot received. Docs:", snapshot.size);
            chatListContainer.innerHTML = '';
            if (snapshot.empty) {
                chatListContainer.innerHTML = '<div class="empty-state">No chats yet.</div>';
                return;
            }

            // Client-side Sort
            let docs = [];
            snapshot.forEach(doc => docs.push({ id: doc.id, data: doc.data() }));

            docs.sort((a, b) => {
                const tA = (a.data.lastMessageTime && a.data.lastMessageTime.toMillis) ? a.data.lastMessageTime.toMillis() : 0;
                const tB = (b.data.lastMessageTime && b.data.lastMessageTime.toMillis) ? b.data.lastMessageTime.toMillis() : 0;
                return tB - tA; // Descending
            });

            docs.forEach(item => {
                const data = item.data;
                const chatId = item.id;

                // Identify Other User
                const otherUid = data.participants.find(uid => uid !== myUserId);
                if (!otherUid) return;

                // Check if chat is blocked by current user
                const isBlocked = data.blockedBy && data.blockedBy[myUserId];

                const otherUser = data.participantData ? data.participantData[otherUid] : { name: 'Unknown', code: '???' };
                const bgCol = getAvatarColor(otherUser.name || 'User');

                // Get custom name if set (stored per user)
                const customNames = data.customNames || {};
                const displayName = customNames[myUserId] || otherUser.name;

                // NOTIFICATION LOGIC
                // Check if this chat has a new message NOT from me
                // We rely on 'lastSenderId' added to chat metadata (need to update sendMessage first)
                // For legacy chats without lastSenderId, this might skip, which is fine.
                if (data.lastSenderId && data.lastSenderId !== myUserId) {
                    // It's an incoming message
                    // Only notify if we are NOT in this chat currently OR app is hidden
                    const isChatOpen = (currentChatId === chatId && document.visibilityState === 'visible');

                    // Specific check: Is this a "fresh" update? 
                    // snapshot.docChanges() would be better but for this simple list rebuild:
                    // We can check a local timestamp tracker or simplified approach:
                    // Since this runs on every update, we need to be careful not to spam.
                    // Ideally we use docChanges(). Let's quick-fix logic below to use docChange if possible or simple guard.
                    // Valid Hack: Browser prevents duplicate notifications often, but let's be cleaner.
                }

                const div = document.createElement('div');
                div.className = 'chat-item';
                if (isBlocked) div.classList.add('blocked');

                // Avatar Logic
                let avatarHTML = `<div class="chat-avatar-text" style="background-color: ${bgCol}">${(otherUser.name || 'U').charAt(0)}</div>`;
                if (otherUser.photo) {
                    avatarHTML = `<img class="chat-avatar-img" src="${otherUser.photo}" alt="dp">`;
                }

                div.innerHTML = `
                    <div class="chat-avatar-container">
                        ${avatarHTML}
                    </div>
                    <div class="chat-details">
                        <h4>${displayName}</h4>
                        <p>${data.lastMessage || '...'}</p>
                    </div>
                    <button class="chat-options-btn">⋮</button>
                `;

                // Avatar Click: View DP
                const avatarContainer = div.querySelector('.chat-avatar-container');
                avatarContainer.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent chat from opening
                    viewProfilePicture(otherUser.photo || null, otherUser.name);
                });

                // Options Button Click
                const optionsBtn = div.querySelector('.chat-options-btn');
                optionsBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent chat from opening
                    openChatOptions(chatId, data, displayName, isBlocked);
                });

                // Chat click - only open if not blocked
                div.onclick = () => {
                    if (!isBlocked) {
                        openChat(chatId, displayName, otherUid);
                    } else {
                        showToast("This chat is blocked. Unblock to view messages.");
                    }
                };

                // Long Press / Right Click for Chat Context Menu
                div.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    showChatContextMenu(e.clientX, e.clientY, chatId, data);
                });

                let chatPressTimer;
                div.addEventListener('touchstart', (e) => {
                    chatPressTimer = setTimeout(() => {
                        if (navigator.vibrate) navigator.vibrate(50);
                        const touch = e.touches[0];
                        showChatContextMenu(touch.clientX, touch.clientY, chatId, data);
                    }, 600);
                });
                div.addEventListener('touchend', () => clearTimeout(chatPressTimer));
                div.addEventListener('touchmove', () => clearTimeout(chatPressTimer));

                chatListContainer.appendChild(div);
            });

            // BETTER NOTIFICATION HANDLER via docChanges if available in this SDK version (Compat)
            snapshot.docChanges().forEach(change => {
                if (change.type === "modified" || change.type === "added") {
                    const data = change.doc.data();
                    const chatId = change.doc.id;

                    // If message is from someone else (not me)
                    if (data.lastSenderId && data.lastSenderId !== myUserId) {
                        const timeDiff = Date.now() - (data.lastMessageTime ? data.lastMessageTime.toMillis() : 0);

                        // Only notify if message is recent (< 30s to catch delayed syncs)
                        if (timeDiff < 30000) {
                            // Show notification if:
                            // 1. App is hidden/minimized OR
                            // 2. User is on a different chat OR
                            // 3. User is on home screen
                            const shouldNotify = document.hidden || currentChatId !== chatId || currentChatId === null;

                            if (shouldNotify) {
                                // Send Notification
                                if ("Notification" in window && Notification.permission === "granted") {
                                    // Switch to Service Worker notification for mobile reliability
                                    navigator.serviceWorker.ready.then(registration => {
                                        const otherUid = data.participants.find(u => u !== myUserId);
                                        const name = data.participantData && data.participantData[otherUid] ? data.participantData[otherUid].name : "Someone";
                                        const icon = data.participantData && data.participantData[otherUid] && data.participantData[otherUid].photo
                                            ? data.participantData[otherUid].photo
                                            : 'https://cdn-icons-png.flaticon.com/512/1041/1041916.png';

                                        registration.showNotification(name, {
                                            body: data.lastMessage || "New message",
                                            icon: icon,
                                            badge: 'https://cdn-icons-png.flaticon.com/512/1041/1041916.png',
                                            tag: 'uchat-' + chatId,
                                            data: { chatId: chatId, name: name, otherUid: otherUid }, // For clicking logic in SW
                                            vibrate: [200, 100, 200]
                                        });
                                    });
                                } else if ("Notification" in window && Notification.permission === "default") {
                                    // Auto-request permission on first message
                                    Notification.requestPermission().then(permission => {
                                        if (permission === "granted") {
                                            // Retry showing notification
                                            const otherUid = data.participants.find(u => u !== myUserId);
                                            const name = data.participantData && data.participantData[otherUid] ? data.participantData[otherUid].name : "Someone";
                                            new Notification(`${name}`, {
                                                body: data.lastMessage || "New message",
                                                icon: 'https://cdn-icons-png.flaticon.com/512/1041/1041916.png'
                                            });
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
            });
        }, error => {
            console.error("Req failed", error);
            // showToast("Error Loading Chats"); // Optional check
        });
}

// 4. Chat Interface
function openChat(chatId, userName, otherUid) {
    currentChatId = chatId;
    chatUserNameHeader.innerText = userName;
    messagesContainer.innerHTML = ''; // clear previous
    showScreen('chat');

    // Subscribe to messages
    if (currentChatUnsubscribe) currentChatUnsubscribe();

    // LISTEN TO USER PRESENCE
    if (otherUid) {
        db.collection('users').doc(otherUid).onSnapshot(doc => {
            if (doc.exists) {
                const d = doc.data();
                const statusSpan = document.getElementById('chat-user-status');
                if (d.isOnline) {
                    statusSpan.innerText = "Online";
                    statusSpan.style.color = "#00E676";
                } else {
                    // Show Last Seen if available
                    let lastSeen = "Offline";
                    if (d.lastSeen) {
                        const date = d.lastSeen.toDate();
                        // Simple formatting
                        // If today, show time
                        const now = new Date();
                        const isToday = now.toDateString() === date.toDateString();
                        // 12-Hour format for Last Seen
                        let hours = date.getHours();
                        const minutes = String(date.getMinutes()).padStart(2, '0');
                        const ampm = hours >= 12 ? 'PM' : 'AM';
                        hours = hours % 12 || 12;
                        const timeStr = hours + ":" + minutes + " " + ampm;
                        lastSeen = isToday ? `Last seen today at ${timeStr}` : `Last seen ${date.toLocaleDateString()}`;
                    }
                    statusSpan.innerText = lastSeen;
                    statusSpan.style.color = "#AAAAAA";
                }
            }
        });
    }

    currentChatUnsubscribe = db.collection('chats').doc(chatId).collection('messages')
        .onSnapshot(snapshot => {
            messagesContainer.innerHTML = '';

            // Client-side Sort
            let msgs = [];
            snapshot.forEach(doc => msgs.push({ id: doc.id, ...doc.data() }));

            msgs.sort((a, b) => {
                const tA = (a.timestamp && a.timestamp.toMillis) ? a.timestamp.toMillis() : 0;
                const tB = (b.timestamp && b.timestamp.toMillis) ? b.timestamp.toMillis() : 0;
                return tA - tB;
            });

            msgs.forEach(msg => {
                appendMessage(msg.text, msg.senderId === myUserId, msg.timestamp, msg.id, chatId);
            });
            scrollToBottom();
        }, error => {
            console.error("Messages list error:", error);
            showToast("Error loading messages. Check console.");
        });
}

btnBackHome.addEventListener('click', () => {
    if (currentChatUnsubscribe) currentChatUnsubscribe();
    currentChatId = null;
    showScreen('home');
});

// 3-dots Menu Listener
btnChatOptions.addEventListener('click', (e) => {
    e.stopPropagation();
    // Reusing the same openChatOptions function
    // We need to fetch current chat data if not globally available
    if (currentChatId) {
        db.collection('chats').doc(currentChatId).get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                const isBlocked = data.blockedBy && data.blockedBy[myUserId];

                const rect = btnChatOptions.getBoundingClientRect();
                showChatOptionsMenu(rect.left - 100, rect.bottom + 5, isBlocked);
            }
        });
    }
});

// Profile View Listener
chatHeaderClickable.addEventListener('click', () => {
    if (currentChatId) {
        db.collection('chats').doc(currentChatId).get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                const otherUid = data.participants.find(u => u !== myUserId);
                viewUserProfile(otherUid, data);
            }
        });
    }
});

btnCloseProfile.addEventListener('click', () => {
    modalUserProfile.style.display = 'none';
});

function appendMessage(text, isMe, timestamp, messageDocId, chatId) {
    const div = document.createElement('div');
    div.className = `message-bubble ${isMe ? 'sent' : 'received'}`;

    // Format Time: 12-Hour (AM/PM)
    let timeStr = "";
    if (timestamp) {
        const date = timestamp.toDate();
        let hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        timeStr = hours + ":" + minutes + " " + ampm;
    }

    div.innerHTML = `
        ${text}
        <span class="msg-time">${timeStr}</span>
    `;

    // DELETE FEATURE: Long Press / Right Click for ALL messages
    // Right Click (Desktop)
    div.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showMsgContextMenu(e.clientX, e.clientY, messageDocId, chatId);
    });

    // Long Press (Mobile)
    let pressTimer;
    div.addEventListener('touchstart', (e) => {
        // Only trigger if one finger is touching
        if (e.touches.length > 1) return;
        pressTimer = setTimeout(() => {
            if (navigator.vibrate) navigator.vibrate(50);
            const touch = e.touches[0];
            showMsgContextMenu(touch.clientX, touch.clientY, messageDocId, chatId);
        }, 600);
    }, { passive: true });
    div.addEventListener('touchend', () => clearTimeout(pressTimer));
    div.addEventListener('touchmove', () => {
        // If user scrolls, cancel the delete menu
        clearTimeout(pressTimer);
    });

    messagesContainer.appendChild(div);
}

function confirmDelete(msgId, chatId) {
    if (confirm("Delete this message?")) { // Keeping native confirm for safety
        db.collection('chats').doc(chatId).collection('messages').doc(msgId).delete()
            .then(() => showToast("Message deleted"))
            .catch(err => showToast("Could not delete"));
    }
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 5. Send Message
btnSendMessage.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentChatId) return;

    messageInput.value = '';

    try {
        const batch = db.batch();

        // 1. Add message to subcollection
        const msgRef = db.collection('chats').doc(currentChatId).collection('messages').doc();
        batch.set(msgRef, {
            senderId: myUserId,
            text: text,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 2. Update chat metadata (last message)
        const chatRef = db.collection('chats').doc(currentChatId);
        batch.update(chatRef, {
            lastMessage: text,
            lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
            lastSenderId: myUserId // TRACK SENDER FOR NOTIFICATIONS
        });

        await batch.commit();

        // TRIGGER AI IF GUEST
        if (myUserCode.startsWith('G-')) {
            triggerAIResponse(currentChatId, text);
        }

    } catch (error) {
        console.error("Send failed:", error);
    }
}

// Search Filter Logic
const chatSearchInput = document.getElementById('chat-search-input');
if (chatSearchInput) {
    chatSearchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const items = document.querySelectorAll('.chat-item');

        items.forEach(item => {
            const name = item.querySelector('h4').innerText.toLowerCase();
            if (name.includes(term)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });
}

btnProfilePic.addEventListener('click', () => fileProfilePic.click());

// Toast Helper
function showToast(msg) {
    let toast = document.getElementById('toast-msg');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-msg';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// View Profile Picture
function viewProfilePicture(photoUrl, name) {
    const modal = document.getElementById('image-viewer-modal');
    const img = document.getElementById('preview-img');
    const caption = document.getElementById('preview-caption');

    if (!photoUrl) {
        showToast("No profile picture available");
        return;
    }

    img.src = photoUrl;
    caption.innerText = name || "Profile Picture";
    modal.style.display = 'flex';

    // Close on click
    modal.onclick = () => {
        modal.style.display = 'none';
    };
}

fileProfilePic.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Compress & Save
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Resize to max 150px
            const MAX_SIZE = 150;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
            } else {
                if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

            // Save to DB
            if (myUserId) {
                db.collection('users').doc(myUserId).update({ photoBase64: dataUrl })
                    .then(() => {
                        myPhoto = dataUrl;
                        localStorage.setItem('uchat_userphoto', dataUrl);
                        loadUserProfile(); // update header
                    })
                    .catch(err => console.error("Upload failed", err));
            }
        }
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// Logout / Reset
const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        // Keeping confirm for destructive logout
        if (confirm("Logout logic: Clear data?")) {
            localStorage.clear();
            location.reload();
        }
    });
}


// === NEW HELPER FUNCTIONS ===

// Show Context Menu for Chat Item
function showChatContextMenu(x, y, chatId, chatData) {
    contextMenuTargetChatId = chatId;
    contextMenuTargetData = chatData;

    const isPinned = chatData.pinnedBy && chatData.pinnedBy[myUserId];
    ctxPinUnpin.innerText = isPinned ? 'Unpin Chat' : 'Pin Chat';

    const isBlocked = chatData.blockedBy && chatData.blockedBy[myUserId];
    ctxToggleBlockChat.innerText = isBlocked ? 'Unblock Chat' : 'Block Chat';
    ctxToggleBlockChat.style.color = isBlocked ? '#00E676' : '';

    // Position and show
    chatContextMenu.style.left = `${x}px`;
    chatContextMenu.style.top = `${y}px`;
    chatContextMenu.classList.remove('hidden');

    // Click outside to close
    const closeMenu = () => {
        chatContextMenu.classList.add('hidden');
        document.removeEventListener('click', closeMenu);
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 10);
}

// Context Menu Actions
ctxPinUnpin.addEventListener('click', () => {
    if (contextMenuTargetChatId) togglePinChat(contextMenuTargetChatId, contextMenuTargetData);
});

ctxToggleBlockChat.addEventListener('click', async () => {
    if (contextMenuTargetChatId) {
        const isBlocked = contextMenuTargetData.blockedBy && contextMenuTargetData.blockedBy[myUserId];
        try {
            await db.collection('chats').doc(contextMenuTargetChatId).update({
                [`blockedBy.${myUserId}`]: !isBlocked
            });
            showToast(isBlocked ? 'Chat unblocked' : 'Chat blocked');
        } catch (e) { console.error(e); }
    }
});

ctxDeleteChat.addEventListener('click', () => {
    if (contextMenuTargetChatId) deleteChat(contextMenuTargetChatId);
});

// Toggle Pin/Unpin
async function togglePinChat(chatId, data) {
    const isPinned = data.pinnedBy && data.pinnedBy[myUserId];
    try {
        await db.collection('chats').doc(chatId).update({
            [`pinnedBy.${myUserId}`]: !isPinned
        });
        showToast(isPinned ? "Chat Unpinned" : "Chat Pinned");
    } catch (e) {
        console.error("Pin error", e);
    }
}

// Delete Chat
async function deleteChat(chatId) {
    if (confirm("Are you sure you want to delete this chat and all messages?")) {
        try {
            // In MockFirestore or real Firestore, we should ideally delete messages first
            // but for simplicity we'll just delete the chat doc (realtime listener handles UI)
            await db.collection('chats').doc(chatId).delete();
            showToast("Chat deleted");
        } catch (e) {
            console.error("Delete error", e);
        }
    }
}

// View Other User Profile
async function viewUserProfile(otherUid) {
    try {
        const doc = await db.collection('users').doc(otherUid).get();
        if (doc.exists) {
            const userData = doc.data();

            profileModalName.innerText = `${userData.firstName} ${userData.lastName}`;
            profileModalBio.innerText = userData.description || "No bio available";
            profileModalId.innerText = userData.userCode;

            const bgCol = getAvatarColor(userData.firstName + " " + userData.lastName);
            modalUserProfile.querySelector('.profile-avatar').style.backgroundColor = bgCol;

            if (userData.photoBase64) {
                profileModalImg.src = userData.photoBase64;
                profileModalImg.classList.remove('hidden');
                profileModalInitials.classList.add('hidden');
            } else {
                profileModalImg.classList.add('hidden');
                profileModalInitials.classList.remove('hidden');
                profileModalInitials.innerText = userData.firstName.charAt(0).toUpperCase();
            }

            modalUserProfile.style.display = 'flex';
        }
    } catch (e) {
        console.error("Profile view error", e);
    }
}
// === CHAT OPTIONS FUNCTIONALITY ===

// Open Chat Options Modal
function openChatOptions(chatId, chatData, currentDisplayName, isBlocked) {
    selectedChatForOptions = { chatId, chatData, isBlocked };

    const customNames = chatData.customNames || {};
    const customName = customNames[myUserId] || '';
    customChatNameInput.value = customName;

    btnToggleBlock.innerText = isBlocked ? 'Unblock Chat' : 'Block Chat';
    btnToggleBlock.style.backgroundColor = isBlocked ? '#00E676' : '#d32f2f';

    modalChatOptions.style.display = 'flex';
}

btnCloseOptions.addEventListener('click', () => {
    modalChatOptions.style.display = 'none';
    selectedChatForOptions = null;
});

btnSaveChatName.addEventListener('click', async () => {
    if (!selectedChatForOptions) return;
    const { chatId } = selectedChatForOptions;
    const customName = customChatNameInput.value.trim();

    try {
        await db.collection('chats').doc(chatId).update({
            [`customNames.${myUserId}`]: customName || firebase.firestore.FieldValue.delete()
        });
        showToast(customName ? 'Custom name saved!' : 'Name reset');
        modalChatOptions.style.display = 'none';
    } catch (error) {
        console.error('Save name error:', error);
    }
});

btnToggleBlock.addEventListener('click', async () => {
    if (!selectedChatForOptions) return;
    const { chatId, isBlocked } = selectedChatForOptions;
    try {
        await db.collection('chats').doc(chatId).update({
            [`blockedBy.${myUserId}`]: !isBlocked
        });
        showToast(isBlocked ? 'Chat unblocked' : 'Chat blocked');
        modalChatOptions.style.display = 'none';
    } catch (error) {
        console.error('Block error:', error);
    }
});
// Show Chat Options Context Menu (3-dots)
function showChatOptionsMenu(x, y, isBlocked) {
    ctxToggleBlock.innerText = isBlocked ? 'Unblock Chat' : 'Block Chat';
    ctxToggleBlock.style.color = isBlocked ? '#00E676' : '#d32f2f';

    chatOptionsContextMenu.style.left = `${x}px`;
    chatOptionsContextMenu.style.top = `${y}px`;
    chatOptionsContextMenu.classList.remove('hidden');

    const closeMenu = () => {
        chatOptionsContextMenu.classList.add('hidden');
        document.removeEventListener('click', closeMenu);
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 10);
}

// Show Message Context Menu
function showMsgContextMenu(x, y, msgId, chatId) {
    msgContextMenuTargetId = msgId;
    msgContextMenuTargetChatId = chatId;

    messageContextMenu.style.left = `${x}px`;
    messageContextMenu.style.top = `${y}px`;
    messageContextMenu.classList.remove('hidden');

    const closeMenu = () => {
        messageContextMenu.classList.add('hidden');
        document.removeEventListener('click', closeMenu);
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 10);
}

// Context Menu Listeners
ctxToggleBlock.addEventListener('click', async () => {
    if (!currentChatId) return;
    try {
        const chatRef = db.collection('chats').doc(currentChatId);
        const doc = await chatRef.get();
        if (doc.exists) {
            const data = doc.data();
            const isBlocked = data.blockedBy && data.blockedBy[myUserId];
            await chatRef.update({
                [`blockedBy.${myUserId}`]: !isBlocked
            });
            showToast(isBlocked ? 'Chat unblocked' : 'Chat blocked');
        }
    } catch (e) { console.error(e); }
});

ctxDeleteMsg.addEventListener('click', () => {
    if (msgContextMenuTargetId && msgContextMenuTargetChatId) {
        deleteMessage(msgContextMenuTargetId, msgContextMenuTargetChatId);
    }
});

function deleteMessage(msgId, chatId) {
    if (confirm("Delete this message?")) {
        db.collection('chats').doc(chatId).collection('messages').doc(msgId).delete()
            .then(() => showToast("Message deleted"))
            .catch(err => showToast("Could not delete"));
    }
}

// Start the application
init();

