const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const busboy = require('busboy');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

admin.initializeApp({
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || (process.env.GCLOUD_PROJECT + '.appspot.com')
});

const { getFirestore } = require("firebase-admin/firestore");
const db = getFirestore();
const { getStorage } = require("firebase-admin/storage");
const bucket = getStorage().bucket();

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const crypto = require('crypto');
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-firebase-deploy-please-change';

// Export the Express app as a Firebase Cloud Function
exports.api = functions.https.onRequest(app);

// ---------------------------------------------------------
// AUTHENTICATION API
// ---------------------------------------------------------
app.all('/api/auth_api.php', async (req, res) => {
    const action = req.query.action || req.body.action || '';

    try {
        if (action === 'login') {
            const { email, password } = req.body;
            if (!email || !password) return res.json({ success: false, error: 'Email and password are required.' });

            const usersRef = db.collection('users');
            const snapshot = await usersRef.where('email', '==', email).limit(1).get();

            if (snapshot.empty) return res.json({ success: false, error: 'Invalid email or password.' });

            const userDoc = snapshot.docs[0];
            const user = userDoc.data();

            if (await bcrypt.compare(password, user.password_hash)) {
                const token = jwt.sign({ user_id: userDoc.id, role: user.role, first_name: user.first_name }, JWT_SECRET, { expiresIn: '7d' });
                res.cookie('__session', token, { httpOnly: true, secure: false, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' });
                return res.json({ success: true, role: user.role, first_name: user.first_name });
            } else {
                return res.json({ success: false, error: 'Invalid email or password.' });
            }
        }


        else if (action === 'resend_code') {
            const { email } = req.body;
            if (!email) return res.json({ success: false, error: 'Email is required.' });

            const snap = await db.collection('users').where('email', '==', email).limit(1).get();
            if (snap.empty) return res.json({ success: false, error: 'Account not found.' });

            const userDoc = snap.docs[0];
            if (userDoc.data().is_verified === 1) return res.json({ success: false, error: 'Account is already verified.' });

            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const expires = Date.now() + 15 * 60 * 1000;

            await userDoc.ref.update({ verification_code: code, verification_expires: expires });
            // Fake mailer
            return res.json({ success: true });
        }
        else if (action === 'verify') {
            const { email, code } = req.body;
            if (!email || !code) return res.json({ success: false, error: 'Email and code are required.' });

            const snap = await db.collection('users').where('email', '==', email).limit(1).get();
            if (snap.empty) return res.json({ success: false, error: 'Invalid verification code.' });

            const userDoc = snap.docs[0];
            const user = userDoc.data();

            if (user.verification_code === code) {
                if (user.verification_expires > Date.now()) {
                    await userDoc.ref.update({ is_verified: 1, verification_code: null, verification_expires: null });
                    const token = jwt.sign({ user_id: userDoc.id, role: user.role, first_name: user.first_name }, JWT_SECRET, { expiresIn: '7d' });
                    res.cookie('__session', token, { httpOnly: true, secure: false, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' });
                    return res.json({ success: true });
                } else {
                    return res.json({ success: false, error: 'Verification code has expired. Please request a new one.' });
                }
            } else {
                return res.json({ success: false, error: 'Invalid verification code.' });
            }
        }
        else if (action === 'forgot_password') {
            const { email } = req.body;
            if (!email) return res.json({ success: false, error: 'Email is required.' });

            const snap = await db.collection('users').where('email', '==', email).limit(1).get();
            if (!snap.empty) {
                const userDoc = snap.docs[0];
                const code = Math.floor(100000 + Math.random() * 900000).toString();
                const expires = Date.now() + 15 * 60 * 1000;
                await userDoc.ref.update({ reset_code: code, reset_expires: expires });
                // Fake mailer
            }
            return res.json({ success: true });
        }
        else if (action === 'reset_password') {
            const { email, code, new_password } = req.body;
            if (!email || !code || !new_password) return res.json({ success: false, error: 'All fields are required.' });
            if (new_password.length < 6) return res.json({ success: false, error: 'Password must be at least 6 characters.' });

            const snap = await db.collection('users').where('email', '==', email).limit(1).get();
            if (snap.empty) return res.json({ success: false, error: 'Invalid reset code.' });

            const userDoc = snap.docs[0];
            const user = userDoc.data();

            if (user.reset_code === code) {
                if (user.reset_expires > Date.now()) {
                    const hash = await bcrypt.hash(new_password, 10);
                    await userDoc.ref.update({ password_hash: hash, reset_code: null, reset_expires: null });
                    return res.json({ success: true });
                } else {
                    return res.json({ success: false, error: 'Reset code has expired. Please request a new one.' });
                }
            } else {
                return res.json({ success: false, error: 'Invalid reset code.' });
            }
        }

        else if (action === 'register') {
            const { email, password, first_name, last_name } = req.body;
            if (!email || !password || !first_name) return res.json({ success: false, error: 'Please fill in all required fields.' });

            const usersRef = db.collection('users');
            const snapshot = await usersRef.where('email', '==', email).limit(1).get();

            if (!snapshot.empty) return res.json({ success: false, error: 'Email is already registered.' });

            const hash = await bcrypt.hash(password, 10);
            const role = 'customer';

            const newUser = {
                email,
                password_hash: hash,
                role,
                first_name,
                last_name: last_name || '',
                is_verified: 1,
                passport_points: 0,
                bowls_redeemed: 0,
                created_at: require("firebase-admin/firestore").FieldValue.serverTimestamp()
            };

            const docRef = await usersRef.add(newUser);
            const token = jwt.sign({ user_id: docRef.id, role, first_name }, JWT_SECRET, { expiresIn: '7d' });
            res.cookie('__session', token, { httpOnly: true, secure: false, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' });

            return res.json({ success: true, role, first_name });
        }

        else if (action === 'logout') {
            res.clearCookie('__session');
            return res.json({ success: true });
        }

        else if (action === 'check_session') {
            const token = req.cookies.__session;
            if (!token) return res.json({ success: false });

            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                const userDoc = await db.collection('users').doc(decoded.user_id).get();

                if (userDoc.exists) {
                    const userData = userDoc.data();
                    return res.json({
                        success: true,
                        user: {
                            id: userDoc.id,
                            first_name: userData.first_name,
                            last_name: userData.last_name,
                            role: userData.role,
                            passport_points: userData.passport_points || 0,
                            bowls_redeemed: userData.bowls_redeemed || 0
                        }
                    });
                } else {
                    res.clearCookie('__session');
                    return res.json({ success: false });
                }
            } catch (err) {
                res.clearCookie('__session');
                return res.json({ success: false });
            }
        }

        else {
            return res.json({ success: false, error: 'Unknown action.' });
        }
    } catch (e) {
        return res.json({ success: false, error: 'Server error: ' + e.message });
    }
});

// ---------------------------------------------------------
// DATA READ APIs
// ---------------------------------------------------------
app.all('/api/get_menu.php', async (req, res) => {
    try {
        const menuSnapshot = await db.collection('menu_items').get();
        const toppingsSnapshot = await db.collection('toppings').get();

        const data = {
            noodles: [],
            streetFoods: [],
            bingsu: [],
            drinks: [],
            snacks: [],
            toppings: [],
            gallery: [
                'images/store1.png',
                'images/store2.png',
                'images/store3.png',
                'images/logo.jpg'
            ],
            faqs: [
                { q: "Where exactly are you located in La Union?", a: "We are located right in the heart of Bangar, near the main plaza. Look for the glowing neon bowl!" },
                { q: "How the cook-it-yourself process works?", a: "Pick your ramen from the wall, select your toppings, checkout, and then head to our automated induction cookers. It boils perfect water every time!" },
                { q: "Is Bingsu available today?", a: "Yes! Our shaved ice machine is running all day. Mango and Injeolmi are available." }
            ]
        };

        toppingsSnapshot.forEach(doc => {
            const t = doc.data();
            t.id = doc.id;
            t.price = parseFloat(t.price);
            t.points = typeof t.points !== 'undefined' ? parseInt(t.points) : Math.floor(t.price / 10);
            data.toppings.push(t);
        });

        menuSnapshot.forEach(doc => {
            const item = doc.data();
            item.id = doc.id;
            item.price = parseFloat(item.price);
            item.points = typeof item.points !== 'undefined' ? parseInt(item.points) : Math.floor(item.price / 10);
            item.tags = !item.tags ? [] : (Array.isArray(item.tags) ? item.tags : item.tags.split(','));

            if (item.category === 'noodles') data.noodles.push(item);
            else if (item.category === 'streetFoods') data.streetFoods.push(item);
            else if (item.category === 'bingsu') data.bingsu.push(item);
            else if (item.category === 'drinks') data.drinks.push(item);
            else if (item.category === 'snacks') data.snacks.push(item);
        });

        res.json(data);
    } catch (e) {
        res.json({ error: e.message });
    }
});

app.all('/api/profile_api.php', async (req, res) => {
    const token = req.cookies.__session;
    if (!token) return res.json({ success: false, error: 'Not logged in.' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user_id = decoded.user_id;

        const ordersSnapshot = await db.collection('orders')
            .where('user_id', '==', user_id)
            .orderBy('created_at', 'desc')
            .limit(5)
            .get();

        const orders = [];
        ordersSnapshot.forEach(doc => {
            const o = doc.data();
            orders.push({
                receipt_code: o.receipt_code,
                total_price: o.total_price,
                points_earned: o.points_earned,
                created_at: o.created_at ? o.created_at.toDate().toISOString() : new Date().toISOString()
            });
        });

        const resSnapshot = await db.collection('reservations')
            .where('user_id', '==', user_id)
            .orderBy('res_date', 'desc')
            .orderBy('res_time', 'desc')
            .limit(5)
            .get();

        const reservations = [];
        resSnapshot.forEach(doc => {
            const r = doc.data();
            reservations.push({
                name: r.name,
                party_size: r.party_size,
                res_date: r.res_date,
                res_time: r.res_time,
                status: r.status
            });
        });

        res.json({
            success: true,
            orders,
            reservations
        });
    } catch (e) {
        res.json({ success: false, error: 'Database error: ' + e.message });
    }
});

// ---------------------------------------------------------
// CONTACT SUBMISSION API
// ---------------------------------------------------------
app.all('/api/submit_contact.php', async (req, res) => {
    if (req.method !== 'POST') return res.json({ success: false, error: 'Invalid request method.' });

    const data = req.body;

    if (data.type && data.name && data.content) {
        try {
            await db.collection('messages').add({
                type: data.type,
                name: data.name,
                content: data.content,
                created_at: require("firebase-admin/firestore").FieldValue.serverTimestamp()
            });
            res.json({ success: true, message: 'Message successfully saved to database.' });
        } catch (e) {
            res.json({ success: false, error: e.message });
        }
    } else {
        res.json({ success: false, error: 'Missing fields.' });
    }
});

// ---------------------------------------------------------
// RESERVATION SUBMISSION API
// ---------------------------------------------------------
app.all('/api/submit_reservation.php', async (req, res) => {
    if (req.method !== 'POST') return res.json({ success: false, error: 'Invalid request method.' });

    const data = req.body;

    if (data.name && data.party_size && data.res_date && data.res_time) {
        try {
            let user_id = null;
            const token = req.cookies.__session;
            if (token) {
                try {
                    const decoded = jwt.verify(token, JWT_SECRET);
                    user_id = decoded.user_id;
                } catch (e) { }
            }

            await db.collection('reservations').add({
                name: data.name,
                party_size: data.party_size,
                res_date: data.res_date,
                res_time: data.res_time,
                user_id: user_id,
                status: 'pending',
                created_at: require("firebase-admin/firestore").FieldValue.serverTimestamp()
            });

            res.json({ success: true, message: 'Reservation successfully saved to database.' });
        } catch (e) {
            res.json({ success: false, error: e.message });
        }
    } else {
        res.json({ success: false, error: 'Missing fields.' });
    }
});

// ---------------------------------------------------------
// CHECKOUT API
// ---------------------------------------------------------
app.all('/api/checkout_api.php', async (req, res) => {
    if (req.method !== 'POST') return res.json({ success: false, error: 'Invalid request method.' });

    let cart_data = [];
    try {
        cart_data = typeof req.body.cart === 'string' ? JSON.parse(req.body.cart) : (req.body.cart || []);
    } catch (e) {
        return res.json({ success: false, error: 'Invalid cart format.' });
    }

    if (!Array.isArray(cart_data) || cart_data.length === 0) {
        return res.json({ success: false, error: 'Cart is empty.' });
    }

    let total_points = 0;
    let total_price = 0;

    for (const item of cart_data) {
        const qty = item.quantity ? parseInt(item.quantity) : 1;
        const price = item.price ? parseFloat(item.price) : 0;
        total_price += price * qty;

        if (typeof item.points !== 'undefined' && item.points !== null) {
            total_points += parseInt(item.points) * qty;
        } else {
            total_points += Math.floor(price / 10) * qty;
        }
    }

    const crypto = require('crypto');
    const receipt_code = 'OPPA-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const cart_json = JSON.stringify(cart_data);

    let user_id = null;
    const token = req.cookies.__session;
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            user_id = decoded.user_id;
        } catch (e) {}
    }

    try {
        if (user_id) {
            const userRef = db.collection('users').doc(user_id);
            await db.runTransaction(async (t) => {
                const doc = await t.get(userRef);
                if (doc.exists) {
                    const currentPoints = doc.data().passport_points || 0;
                    t.update(userRef, { passport_points: currentPoints + total_points });
                }
            });

            await db.collection('orders').add({
                user_id: user_id,
                receipt_code: receipt_code,
                total_price: total_price,
                points_earned: total_points,
                cart_data: cart_json,
                created_at: require("firebase-admin/firestore").FieldValue.serverTimestamp()
            });

            return res.json({
                success: true,
                receipt: receipt_code,
                points_awarded: total_points,
                is_guest: false
            });
        } else {
            await db.collection('orders').add({
                user_id: null,
                receipt_code: receipt_code,
                total_price: total_price,
                points_earned: total_points,
                cart_data: cart_json,
                created_at: require("firebase-admin/firestore").FieldValue.serverTimestamp()
            });

            return res.json({
                success: true,
                receipt: receipt_code,
                points_missed: total_points,
                is_guest: true
            });
        }
    } catch (e) {
        return res.json({ success: false, error: 'Database error: ' + e.message });
    }
});

// ---------------------------------------------------------
// FILE UPLOADS API
// ---------------------------------------------------------
app.all('/api/upload_api.php', async (req, res) => {
    let role = null;
    const token = req.cookies.__session;
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            role = decoded.role;
        } catch (e) {}
    }

    if (role !== 'admin') {
        return res.json({ success: false, error: 'Unauthorized' });
    }

    if (req.method !== 'POST') return res.json({ success: false, error: 'Invalid request method.' });
    if (!req.headers['content-type'] || !req.headers['content-type'].includes('multipart/form-data')) {
        return res.json({ success: false, error: 'Must use multipart/form-data' });
    }

    const bb = busboy({ headers: req.headers });
    const fields = {};
    let fileUploadPromise = null;
    let targetFileName = null;
    let mime = null;

    bb.on('field', (name, val) => {
        fields[name] = val;
    });

    bb.on('file', (name, file, info) => {
        if (name === 'image') {
            mime = info.mimeType;
            const allowed = ['image/jpeg', 'image/png', 'image/webp'];
            if (!allowed.includes(mime)) {
                file.resume();
                return;
            }
            const os = require('os');
            const path = require('path');
            const fs = require('fs');
            targetFileName = Date.now() + '_' + info.filename;
            const tempFilePath = path.join(os.tmpdir(), targetFileName);

            fileUploadPromise = new Promise((resolve, reject) => {
                file.pipe(fs.createWriteStream(tempFilePath))
                .on('finish', () => resolve(tempFilePath))
                .on('error', reject);
            });
        } else {
            file.resume();
        }
    });

    bb.on('finish', async () => {
        if (fields.action === 'delete_hero') {
            try {
                await bucket.file('images/hero-bg.jpg').delete({ ignoreNotFound: true });
                return res.json({ success: true, message: 'Hero background deleted.' });
            } catch(e) {
                return res.json({ success: false, error: e.message });
            }
        }

        if (!fileUploadPromise) {
            return res.json({ success: false, error: 'No file uploaded or invalid file type.' });
        }

        const tempFilePath = await fileUploadPromise;
        const target = fields.target || '';
        const allowed_targets = ['hero-bg', 'gallery'];

        if (!allowed_targets.includes(target)) {
            return res.json({ success: false, error: 'Invalid target.' });
        }

        try {
            if (target === 'gallery') {
                const finalName = 'images/gallery_' + targetFileName + '.jpg';
                await bucket.upload(tempFilePath, {
                    destination: finalName,
                    metadata: { contentType: mime }
                });
                await bucket.file(finalName).makePublic();

                const snap = await db.collection('gallery').orderBy('sort_order', 'desc').limit(1).get();
                let max_sort = 0;
                if (!snap.empty) {
                    max_sort = snap.docs[0].data().sort_order || 0;
                }

                await db.collection('gallery').add({
                    image_url: 'https://storage.googleapis.com/' + bucket.name + '/' + finalName,
                    sort_order: max_sort + 1
                });
                return res.json({ success: true, message: 'Gallery image added successfully.' });
            } else {
                const finalName = 'images/' + target + '.jpg';
                await bucket.upload(tempFilePath, {
                    destination: finalName,
                    metadata: { contentType: mime, cacheControl: 'public, max-age=0' }
                });
                await bucket.file(finalName).makePublic();
                return res.json({ success: true, message: 'Image updated successfully.' });
            }
        } catch (e) {
            return res.json({ success: false, error: e.message });
        }
    });

    bb.end(req.rawBody);
});

// ---------------------------------------------------------
// GALLERY API
// ---------------------------------------------------------
app.all('/api/gallery_api.php', async (req, res) => {
    const action = req.query.action || req.body.action || '';

    let role = null;
    const token = req.cookies.__session;
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            role = decoded.role;
        } catch (e) {}
    }

    try {
        if (action === 'get') {
            const snap = await db.collection('gallery').orderBy('sort_order', 'asc').get();
            const gallery = [];
            snap.forEach(doc => {
                const data = doc.data();
                data.id = doc.id;
                gallery.push(data);
            });
            return res.json({ success: true, gallery });
        }
        else if (action === 'delete') {
            if (role !== 'admin') return res.json({ success: false, error: 'Unauthorized' });
            if (req.method !== 'POST') return res.json({ success: false, error: 'Invalid method' });

            const id = req.body.id;
            const docRef = db.collection('gallery').doc(id);
            const doc = await docRef.get();
            if (doc.exists) {
                let imgUrl = doc.data().image_url;
                if (imgUrl.includes('storage.googleapis.com')) {
                    const parts = imgUrl.split('/');
                    const filename = parts.slice(4).join('/');
                    await bucket.file(filename).delete({ ignoreNotFound: true });
                }
                await docRef.delete();
                return res.json({ success: true });
            } else {
                return res.json({ success: false, error: 'Image not found' });
            }
        }
        else if (action === 'reorder') {
            if (role !== 'admin') return res.json({ success: false, error: 'Unauthorized' });
            if (req.method !== 'POST') return res.json({ success: false, error: 'Invalid method' });

            let order = req.body.order;
            if (typeof order === 'string') order = JSON.parse(order);

            if (Array.isArray(order)) {
                const batch = db.batch();
                order.forEach((id, index) => {
                    const docRef = db.collection('gallery').doc(id);
                    batch.update(docRef, { sort_order: index + 1 });
                });
                await batch.commit();
                return res.json({ success: true });
            } else {
                return res.json({ success: false, error: 'Invalid order data' });
            }
        }
        else {
            return res.json({ success: false, error: 'Invalid action' });
        }
    } catch(e) {
        return res.json({ success: false, error: e.message });
    }
});

// ---------------------------------------------------------
// ADMIN API
// ---------------------------------------------------------
app.all('/api/admin_api.php', async (req, res) => {
    let user_id = null;
    let role = null;
    const token = req.cookies.__session;
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            user_id = decoded.user_id;
            role = decoded.role;
        } catch (e) {}
    }

    let action = req.query.action;

    if (req.method === 'POST' && req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
        const bb = busboy({ headers: req.headers });
        const fields = {};
        let fileUploadPromise = null;
        let uploadedUrl = null;

        bb.on('field', (name, val) => {
            fields[name] = val;
        });

        bb.on('file', (name, file, info) => {
            if (name === 'image_file') {
                const filename = Date.now() + '_' + info.filename.replace(/[^a-zA-Z0-9.\\-_]/g, '');
                const fileRef = bucket.file('images/' + filename);

                fileUploadPromise = new Promise((resolve, reject) => {
                    file.pipe(fileRef.createWriteStream({
                        metadata: { contentType: info.mimeType }
                    }))
                    .on('finish', () => {
                        fileRef.makePublic().then(() => {
                            uploadedUrl = 'https://storage.googleapis.com/' + bucket.name + '/images/' + filename;
                            resolve();
                        }).catch(reject);
                    })
                    .on('error', reject);
                });
            } else {
                file.resume();
            }
        });

        bb.on('finish', async () => {
            if (fileUploadPromise) await fileUploadPromise;

            action = action || fields.action;
            if (action !== 'login' && (!user_id || role !== 'admin')) {
                return res.json({ success: false, error: 'Unauthorized. Admin access required.' });
            }
            await handleAdminAction(action, fields, uploadedUrl, res);
        });

        bb.end(req.rawBody);
    } else {
        action = action || req.body.action;
        if (action !== 'login' && (!user_id || role !== 'admin')) {
            return res.json({ success: false, error: 'Unauthorized. Admin access required.' });
        }
        await handleAdminAction(action, req.body, null, res);
    }
});

async function handleAdminAction(action, body, uploadedUrl, res) {
    try {
        if (action === 'get_all') {
            const items = [];
            const menuSnap = await db.collection('menu_items').get();
            menuSnap.forEach(doc => {
                const data = doc.data();
                data.id = doc.id;
                items.push(data);
            });

            const topSnap = await db.collection('toppings').get();
            topSnap.forEach(doc => {
                const data = doc.data();
                data.id = doc.id;
                data.category = 'toppings';
                data.description = '';
                items.push(data);
            });

            const resSnap = await db.collection('reservations').orderBy('res_date', 'desc').orderBy('res_time', 'desc').get();
            const reservations = [];
            resSnap.forEach(doc => {
                const data = doc.data();
                data.id = doc.id;
                reservations.push(data);
            });

            const msgSnap = await db.collection('messages').orderBy('created_at', 'desc').get();
            const messages = [];
            msgSnap.forEach(doc => {
                const data = doc.data();
                data.id = doc.id;
                messages.push(data);
            });

            const userSnap = await db.collection('users').orderBy('created_at', 'desc').get();
            const users = [];
            userSnap.forEach(doc => {
                const data = doc.data();
                data.id = doc.id;
                delete data.password_hash;
                users.push(data);
            });

            return res.json({ success: true, items, reservations, messages, users });
        }

        else if (action === 'add_item') {
            const collection = body.category === 'toppings' ? 'toppings' : 'menu_items';
            const data = {
                name: body.name || '',
                price: parseFloat(body.price) || 0,
                points: body.points ? parseInt(body.points) : null
            };

            if (uploadedUrl) {
                data.image_url = uploadedUrl;
            }

            if (collection === 'menu_items') {
                data.category = body.category;
                data.tags = body.tags || '';
                data.description = body.description || '';
            }

            await db.collection(collection).add(data);
            return res.json({ success: true });
        }

        else if (action === 'edit_item') {
            const id = body.id;
            const collection = body.category === 'toppings' ? 'toppings' : 'menu_items';
            const data = {
                name: body.name || '',
                price: parseFloat(body.price) || 0,
                points: body.points ? parseInt(body.points) : null
            };

            if (uploadedUrl) {
                data.image_url = uploadedUrl;
            }

            if (collection === 'menu_items') {
                data.category = body.category;
                data.tags = body.tags || '';
                data.description = body.description || '';
            }

            await db.collection(collection).doc(id).update(data);
            return res.json({ success: true });
        }

        else if (action === 'delete_item') {
            const id = body.id;
            const cat = body.category;
            const collection = cat === 'toppings' ? 'toppings' : 'menu_items';
            await db.collection(collection).doc(id).delete();
            return res.json({ success: true });
        }
        else if (action === 'update_reservation') {
            await db.collection('reservations').doc(body.id).update({
                status: body.status
            });
            return res.json({ success: true });
        }

        else if (action === 'edit_user') {
            const data = {
                first_name: body.first_name,
                last_name: body.last_name,
                email: body.email,
                role: body.role,
                passport_points: parseInt(body.passport_points) || 0,
                bowls_redeemed: parseInt(body.bowls_redeemed) || 0,
                is_verified: parseInt(body.is_verified) || 0
            };
            await db.collection('users').doc(body.id).update(data);
            return res.json({ success: true });
        }

        else if (action === 'delete_user') {
            await db.collection('users').doc(body.id).delete();
            return res.json({ success: true });
        }

        else if (action === 'add_admin') {
            const { first_name, last_name, email, password } = body;
            if (!email || !password || !first_name) {
                return res.json({ success: false, error: 'Missing required fields.' });
            }
            const snap = await db.collection('users').where('email', '==', email).limit(1).get();
            if (!snap.empty) {
                return res.json({ success: false, error: 'Email already exists.' });
            }
            const hash = await bcrypt.hash(password, 10);
            await db.collection('users').add({
                email,
                password_hash: hash,
                first_name,
                last_name: last_name || '',
                role: 'admin',
                is_verified: 1,
                passport_points: 0,
                bowls_redeemed: 0,
                created_at: require("firebase-admin/firestore").FieldValue.serverTimestamp()
            });
            return res.json({ success: true });
        }
        else {
            return res.json({ success: false, error: 'Unknown admin action.' });
        }
    } catch (e) {
        return res.json({ success: false, error: e.message });
    }
}
