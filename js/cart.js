// js/cart.js
let cart = JSON.parse(localStorage.getItem('oppaCart')) || [];

function saveCart() {
    localStorage.setItem('oppaCart', JSON.stringify(cart));
    updateCartUI();
}

function addToCart(item, type = 'item') {
    const existingIndex = cart.findIndex(cartItem => {
        if (cartItem.id !== item.id) return false;
        if (cartItem.type !== type) return false;
        
        const addons1 = cartItem.addons ? cartItem.addons.map(a => a.id).sort().join(',') : '';
        const addons2 = item.addons ? item.addons.map(a => a.id).sort().join(',') : '';
        return addons1 === addons2;
    });

    if (existingIndex > -1) {
        cart[existingIndex].quantity = (cart[existingIndex].quantity || 1) + 1;
    } else {
        cart.push({ ...item, quantity: 1, cartId: Date.now() + Math.random(), type });
    }
    
    saveCart();
    openCart();
}

function removeFromCart(cartId) {
    cart = cart.filter(item => item.cartId !== cartId);
    saveCart();
}

function updateQuantity(cartId, delta) {
    const itemIndex = cart.findIndex(i => i.cartId === cartId);
    if (itemIndex > -1) {
        cart[itemIndex].quantity = (cart[itemIndex].quantity || 1) + delta;
        if (cart[itemIndex].quantity <= 0) {
            cart.splice(itemIndex, 1);
        }
        saveCart();
    }
}

function calculateTotal() {
    return cart.reduce((total, item) => total + ((item.price || 0) * (item.quantity || 1)), 0);
}

function updateCartUI() {
    const cartCountElements = document.querySelectorAll('.cart-badge');
    cartCountElements.forEach(el => {
        const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        el.textContent = totalItems;
        el.style.display = totalItems > 0 ? 'flex' : 'none';
    });

    const cartContainer = document.getElementById('cart-items-container');
    const cartTotalElement = document.getElementById('cart-total-amount');
    
    if (!cartContainer || !cartTotalElement) return;

    cartContainer.innerHTML = '';
    
    if (cart.length === 0) {
        cartContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center; margin-top: 20px;">Your bowl is empty!</p>';
    } else {
        cart.forEach(item => {
            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <img src="${item.image || 'images/store1.png'}" alt="${item.name}" class="cart-item-img">
                <div class="cart-item-info" style="flex: 1;">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">₱${item.price}</div>
                    <div style="display: flex; align-items: center; margin-top: 8px; gap: 10px;">
                        <button onclick="updateQuantity(${item.cartId}, -1)" style="background: var(--bg-dark); color: white; border: 1px solid var(--border-color); border-radius: 4px; width: 28px; height: 28px; cursor: pointer; display: flex; align-items: center; justify-content: center;">-</button>
                        <span style="font-weight: bold; font-size: 1rem;">${item.quantity || 1}</span>
                        <button onclick="updateQuantity(${item.cartId}, 1)" style="background: var(--accent-yellow); color: black; border: none; border-radius: 4px; width: 28px; height: 28px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold;">+</button>
                    </div>
                </div>
            `;
            cartContainer.appendChild(div);
        });
    }

    cartTotalElement.textContent = `₱${calculateTotal().toFixed(2)}`;
}

function openCart() {
    document.getElementById('cart-sidebar').classList.add('open');
    document.getElementById('cart-overlay').classList.add('open');
}

function closeCart() {
    document.getElementById('cart-sidebar').classList.remove('open');
    document.getElementById('cart-overlay').classList.remove('open');
}

async function checkout() {
    if (cart.length === 0) {
        if (typeof customAlert === 'function') customAlert('Empty Cart', 'Your cart is empty!');
        else alert('Cart is empty!');
        return;
    }
    
    const formData = new URLSearchParams();
    formData.append('cart', JSON.stringify(cart));

    if (typeof showLoading === 'function') showLoading('Cooking up your order...');

    try {
        const res = await fetch('api/checkout_api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });
        const data = await res.json();
        if (typeof hideLoading === 'function') hideLoading();

        if (data.success) {
            let msg = `Your digital receipt code is: ${data.receipt}\n\nPlease show this to the staff at Bangar.\n\n`;
            
            if (data.is_guest) {
                msg += `⚠️ You missed out on earning ${data.points_missed} points today! Create an account to start earning free ramen.`;
            } else {
                msg += `🍜 You just earned ${data.points_awarded} points! Check your Noodle Passport.`;
            }

            if (typeof customAlert === 'function') {
                customAlert('Order Placed!', msg);
            } else {
                alert('Order Placed!\n\n' + msg);
            }

            cart = [];
            saveCart();
            closeCart();
        } else {
            if (typeof customAlert === 'function') customAlert('Checkout Failed', data.error);
            else alert('Checkout Failed: ' + data.error);
        }
    } catch (err) {
        console.error(err);
        if (typeof hideLoading === 'function') hideLoading();
        if (typeof customAlert === 'function') customAlert('Error', 'Server connection error during checkout.');
        else alert('Server connection error during checkout.');
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', updateCartUI);
