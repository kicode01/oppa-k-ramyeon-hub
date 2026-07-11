// js/main.js

// --- Theme Toggler ---



document.addEventListener('DOMContentLoaded', () => {
    // Inject Cart HTML globally if it doesn't exist
    if (!document.getElementById('cart-sidebar')) {
        const cartHTML = `
            <div id="global-loader">
                <div class="spinner"></div>
                <h3 id="loader-text" style="color: var(--accent-yellow); margin-top: 20px;">Loading...</h3>
            </div>
            <div class="cart-overlay" id="cart-overlay" onclick="closeCart()"></div>
            <div class="cart-sidebar" id="cart-sidebar">
                <div class="cart-header">
                    <h2 class="cart-title">Your Bowl</h2>
                    <button class="close-cart" onclick="closeCart()">&times;</button>
                </div>
                <div class="cart-items" id="cart-items-container">
                    <!-- Items will be injected here by cart.js -->
                </div>
                <div class="cart-footer">
                    <div class="cart-total">
                        <span>Total:</span>
                        <span id="cart-total-amount">₱0</span>
                    </div>
                    <button class="btn btn-primary" style="width: 100%;" onclick="checkout()">Checkout & Get Receipt</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', cartHTML);
        if (typeof updateCartUI === 'function') updateCartUI();
    }

    // Inject Chat Widget globally (except on admin page)
    const isAdminPage = window.location.pathname.toLowerCase().includes('admin.html');
    if (!document.getElementById('chat-widget') && !isAdminPage) {
        const chatHTML = `
            <div class="chat-widget" id="chat-widget">
                <div class="chat-panel" id="chat-panel">
                    <div class="chat-header">Oppa Guide</div>
                    <div class="chat-messages" id="chat-messages">
                        <div class="msg msg-bot">Annyeong! I'm your Oppa Guide. How can I help you navigate the site today?</div>
                    </div>
                    <div class="chat-input">
                        <input type="text" id="chat-input-field" placeholder="Ask a question..." onkeypress="handleChatEnter(event)">
                        <button onclick="sendChatMessage()">Send</button>
                    </div>
                </div>
                <div class="chat-toggle" onclick="toggleChat()">
                    <svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', chatHTML);
    }
    
    // Mobile Menu Logic
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    if (mobileBtn && navLinks) {
        mobileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navLinks.classList.toggle('mobile-open');
        });

        document.addEventListener('click', (e) => {
            if (navLinks.classList.contains('mobile-open') && !navLinks.contains(e.target) && e.target !== mobileBtn) {
                navLinks.classList.remove('mobile-open');
            }
        });
    }

    // Cache Buster Logic (Triggered by Logo Click)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('bust')) {
        const bustValue = urlParams.get('bust');
        document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            let href = link.getAttribute('href');
            if (href) {
                link.href = href + (href.includes('?') ? '&' : '?') + 'bust=' + bustValue;
            }
        });
        console.log("Cache busted successfully!");
        // Remove bust param from URL without reloading
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
    }

    // Dynamic Auth Link Updater
    (async function updateAuthLinks() {
        try {
            const res = await fetch('api/auth_api.php?action=check_session', { credentials: 'include' });
            const data = await res.json();
            if (data.success && data.user) {
                // User is logged in, hide icon for customers, update for admins
                document.querySelectorAll('a[href="login.html"]').forEach(link => {
                    if (data.user.role === 'admin') {
                        link.href = 'admin.html';
                        link.title = 'Admin Dashboard';
                    } else {
                        link.href = 'passport.html';
                        link.title = 'My Passport & Profile';
                    }
                });
                
                // If they are on login.html or register.html, redirect them
                if (window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('register.html')) {
                    window.location.href = data.user.role === 'admin' ? 'admin.html' : 'passport.html';
                }
            }
        } catch (e) {
            console.error('Session check failed', e);
        }
    })();
});

// Handle Back-Forward Cache (bfcache) freezes
window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
        if (typeof hideLoading === 'function') hideLoading();
    }
});

// --- Loading Spinner UI ---
function showLoading(msg = 'Processing...') {
    const loader = document.getElementById('global-loader');
    if (loader) {
        document.getElementById('loader-text').innerText = msg;
        loader.classList.add('active');
    }
}

function hideLoading() {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.classList.remove('active');
    }
}

// --- Modals ---
function toggleChat() {
    document.getElementById('chat-panel').classList.toggle('open');
}

function handleChatEnter(e) {
    if (e.key === 'Enter') sendChatMessage();
}

function sendChatMessage() {
    const input = document.getElementById('chat-input-field');
    const msg = input.value.trim();
    if (!msg) return;

    appendMessage(msg, 'user');
    input.value = '';

    // Advanced rule-based bot for Oppa Guide navigation
    setTimeout(() => {
        let reply = "I'm sorry, I didn't quite catch that! Try asking for our <strong>Menu</strong>, <strong>Reservations</strong>, <strong>Noodle Passport</strong>, or <strong>About Us</strong> page!";
        let navUrl = "";
        const lowerMsg = msg.toLowerCase();
        
        // Navigation Guide Logic
        if (lowerMsg.includes('menu') || lowerMsg.includes('food') || lowerMsg.includes('ramen')) {
            reply = "Taking you to the Menu Page... 🍜";
            navUrl = "menu.html";
        } else if (lowerMsg.includes('book') || lowerMsg.includes('reserv') || lowerMsg.includes('table')) {
            reply = "Taking you to the Reservations Page... 📅";
            navUrl = "reservations.html";
        } else if (lowerMsg.includes('passport') || lowerMsg.includes('stamp') || lowerMsg.includes('level') || lowerMsg.includes('discount')) {
            reply = "Taking you to the Noodle Passport Page... 🎟️";
            navUrl = "passport.html";
        } else if (lowerMsg.includes('about') || lowerMsg.includes('location') || lowerMsg.includes('contact') || lowerMsg.includes('find us') || lowerMsg.includes('address')) {
            reply = "Taking you to the About Us page... 📍";
            navUrl = "about.html";
        } else if (lowerMsg.includes('login') || lowerMsg.includes('register') || lowerMsg.includes('account')) {
            reply = "Taking you to the Login Page... 👤";
            navUrl = "login.html";
        } else if (typeof mockData !== 'undefined' && mockData.faqs) {
            // Fallback to original mockData if available
            for (let faq of mockData.faqs) {
                const keywords = faq.q.toLowerCase().split(' ').filter(w => w.length > 3);
                if (keywords.some(k => lowerMsg.includes(k))) {
                    reply = faq.a;
                    break;
                }
            }
        }
        
        appendMessage(reply, 'bot');
        if (navUrl) {
            setTimeout(() => {
                window.location.href = navUrl;
            }, 1200);
        }
    }, 500);
}

function appendMessage(text, sender) {
    const messages = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `msg msg-${sender}`;
    if (sender === 'bot') {
        msgDiv.innerHTML = text; // Allow links and bold tags for the bot
    } else {
        msgDiv.textContent = text; // Prevent XSS from user input
    }
    messages.appendChild(msgDiv);
    messages.scrollTop = messages.scrollHeight;
}

function customAlert(title, message) {
    const modalHTML = `
        <div class="modal open" id="custom-alert-modal" style="display: flex; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); align-items: center; justify-content: center; z-index: 99999;">
            <div class="modal-content" style="background: var(--bg-panel); padding: 30px; border-radius: 8px; width: 400px; max-width: 90%; border: 1px solid var(--accent-yellow); box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center;">
                <h2 style="color: var(--accent-yellow); margin-bottom: 15px;">${title}</h2>
                <p style="color: var(--text-main); margin-bottom: 25px; white-space: pre-wrap; font-size: 1.1rem;">${message}</p>
                <button class="btn btn-primary" onclick="document.getElementById('custom-alert-modal').remove()" style="width: 100%;">OK</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function customConfirm(title, message) {
    return new Promise((resolve) => {
        const modalHTML = `
            <div class="modal open" id="custom-confirm-modal" style="display: flex; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); align-items: center; justify-content: center; z-index: 99999;">
                <div class="modal-content" style="background: var(--bg-panel); padding: 30px; border-radius: 8px; width: 400px; max-width: 90%; border: 1px solid var(--accent-yellow); box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center;">
                    <h2 style="color: var(--accent-yellow); margin-bottom: 15px;">${title}</h2>
                    <p style="color: var(--text-main); margin-bottom: 25px; white-space: pre-wrap; font-size: 1.1rem;">${message}</p>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button class="btn btn-primary" id="custom-confirm-yes" style="flex: 1;">OK</button>
                        <button class="btn btn-outline" id="custom-confirm-no" style="flex: 1;">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.getElementById('custom-confirm-yes').addEventListener('click', () => {
            document.getElementById('custom-confirm-modal').remove();
            resolve(true);
        });
        document.getElementById('custom-confirm-no').addEventListener('click', () => {
            document.getElementById('custom-confirm-modal').remove();
            resolve(false);
        });
    });
}

// --- Progressive Web App (PWA) Setup ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').then(registration => {
            console.log('ServiceWorker registration successful');
        }).catch(err => {
            console.log('ServiceWorker registration failed: ', err);
        });
    });
}

if (!document.querySelector('link[rel="manifest"]')) {
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = 'manifest.json';
    document.head.appendChild(manifestLink);
}
