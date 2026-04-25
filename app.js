/* ==========================================
   Manon Bakery — Client App
   localStorage-backed "database"
   ========================================== */

const DB = {
    get: (key, fallback) => {
        try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
        catch { return fallback; }
    },
    set: (key, val) => localStorage.setItem(key, JSON.stringify(val))
};

const fmt = n => `${Number(n).toFixed(2)} EGP`;
const SHIPPING = 35;

const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

/* ----- Toast ----- */
function toast(msg, type = 'success') {
    const container = $('#toast-container');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '!' : 'i'}</span>
        <span>${msg}</span>
    `;
    container.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 300);
    }, 3000);
}

/* ----- Overlay & Modal control ----- */
const overlay = $('#overlay');
function openPanel(id) {
    overlay.classList.add('open');
    $(id).classList.add('open');
    $(id).setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}
function closeAll() {
    overlay.classList.remove('open');
    $$('.cart-drawer, .modal').forEach(el => {
        el.classList.remove('open');
        el.setAttribute('aria-hidden', 'true');
    });
    document.body.style.overflow = '';
}
overlay.addEventListener('click', closeAll);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });

/* ==========================================
   CART
   ========================================== */
const Cart = {
    items: DB.get('cart', []),

    save() { DB.set('cart', this.items); this.render(); },

    add(product) {
        const existing = this.items.find(i => i.id === product.id);
        if (existing) {
            existing.qty += 1;
            toast(`${product.name} qty increased`);
        } else {
            this.items.push({ ...product, qty: 1 });
            toast(`${product.name} added to cart`);
        }
        this.save();
    },

    remove(id) {
        this.items = this.items.filter(i => i.id !== id);
        this.save();
        toast('Item removed', 'info');
    },

    updateQty(id, delta) {
        const item = this.items.find(i => i.id === id);
        if (!item) return;
        item.qty = Math.max(1, item.qty + delta);
        this.save();
    },

    clear() { this.items = []; this.save(); },

    subtotal() { return this.items.reduce((s, i) => s + i.price * i.qty, 0); },
    count() { return this.items.reduce((s, i) => s + i.qty, 0); },

    render() {
        $('#cart-badge').textContent = this.count();
        $('#cart-count').textContent = `(${this.count()})`;

        const empty = $('#cart-empty');
        const itemsBox = $('#cart-items');
        const foot = $('#cart-foot');

        if (this.items.length === 0) {
            empty.style.display = 'flex';
            itemsBox.style.display = 'none';
            foot.style.display = 'none';
            return;
        }
        empty.style.display = 'none';
        itemsBox.style.display = 'block';
        foot.style.display = 'block';

        itemsBox.innerHTML = this.items.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <img src="${item.img}" alt="${item.name}">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p class="cart-item-price">${fmt(item.price)}</p>
                    <div class="qty-control">
                        <button data-act="dec">−</button>
                        <span>${item.qty}</span>
                        <button data-act="inc">+</button>
                    </div>
                </div>
                <div class="cart-item-side">
                    <button class="cart-remove" data-act="rm" aria-label="Remove">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2"/></svg>
                    </button>
                    <p class="cart-line-total">${fmt(item.price * item.qty)}</p>
                </div>
            </div>
        `).join('');

        const sub = this.subtotal();
        $('#cart-subtotal').textContent = fmt(sub);
        $('#cart-total').textContent = fmt(sub + SHIPPING);
    }
};

/* Cart item interactions */
$('#cart-items').addEventListener('click', e => {
    const itemEl = e.target.closest('.cart-item');
    if (!itemEl) return;
    const id = itemEl.dataset.id;
    const act = e.target.closest('button')?.dataset.act;
    if (act === 'dec') Cart.updateQty(id, -1);
    if (act === 'inc') Cart.updateQty(id, 1);
    if (act === 'rm') Cart.remove(id);
});

/* ==========================================
   WISHLIST
   ========================================== */
const Wishlist = {
    items: DB.get('wishlist', []),
    save() { DB.set('wishlist', this.items); this.render(); },
    toggle(product) {
        const idx = this.items.findIndex(i => i.id === product.id);
        if (idx >= 0) {
            this.items.splice(idx, 1);
            toast(`${product.name} removed from favorites`, 'info');
        } else {
            this.items.push(product);
            toast(`${product.name} added to favorites`);
        }
        this.save();
    },
    has(id) { return this.items.some(i => i.id === id); },
    render() {
        $('#wishlist-badge').textContent = this.items.length;
        $('#fav-count').textContent = this.items.length;
        // Update heart icons
        $$('.product').forEach(p => {
            const id = p.dataset.id;
            p.querySelector('.fav-btn')?.classList.toggle('active', this.has(id));
        });
        // Render wishlist modal
        const body = $('#wishlist-body');
        if (!body) return;
        if (this.items.length === 0) {
            body.innerHTML = `<div class="cart-empty"><h4>No favorites yet</h4><p>Tap the heart on any product to save it here.</p></div>`;
            return;
        }
        body.innerHTML = this.items.map(item => `
            <div class="wish-item" data-id="${item.id}">
                <img src="${item.img}" alt="${item.name}">
                <div class="wish-info">
                    <h4>${item.name}</h4>
                    <p>${fmt(item.price)}</p>
                </div>
                <div class="wish-actions">
                    <button class="add-btn" data-act="add">Add</button>
                    <button class="cart-remove" data-act="rm" aria-label="Remove">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6"/></svg>
                    </button>
                </div>
            </div>
        `).join('');
    }
};

$('#wishlist-body').addEventListener('click', e => {
    const itemEl = e.target.closest('.wish-item');
    if (!itemEl) return;
    const id = itemEl.dataset.id;
    const item = Wishlist.items.find(i => i.id === id);
    const act = e.target.closest('button')?.dataset.act;
    if (act === 'add' && item) Cart.add(item);
    if (act === 'rm' && item) Wishlist.toggle(item);
});

/* ==========================================
   AUTH
   ========================================== */
const Auth = {
    user: DB.get('user', null),
    users: DB.get('users', []),

    register({ name, email, password }) {
        if (this.users.find(u => u.email === email)) {
            toast('Email already registered', 'error');
            return false;
        }
        const user = { name, email, password, joined: Date.now() };
        this.users.push(user);
        DB.set('users', this.users);
        this.user = { name, email };
        DB.set('user', this.user);
        this.render();
        toast(`Welcome to Manon, ${name}!`);
        return true;
    },

    login({ email, password }) {
        const user = this.users.find(u => u.email === email && u.password === password);
        if (!user) {
            toast('Invalid email or password', 'error');
            return false;
        }
        this.user = { name: user.name, email: user.email };
        DB.set('user', this.user);
        this.render();
        toast(`Welcome back, ${user.name}!`);
        return true;
    },

    logout() {
        this.user = null;
        DB.set('user', null);
        this.render();
        toast('Signed out', 'info');
    },

    render() {
        const orders = DB.get('orders', []).filter(o => !this.user || o.email === this.user.email);
        if (this.user) {
            $('#auth-view').hidden = true;
            $('#account-view').hidden = false;
            $('#account-name').textContent = this.user.name;
            $('#account-email').textContent = this.user.email;
            $('#account-avatar').textContent = this.user.name.charAt(0).toUpperCase();
            $('#orders-count').textContent = orders.length;
            $('#spent-amount').textContent = orders.reduce((s, o) => s + o.total, 0).toFixed(0);
        } else {
            $('#auth-view').hidden = false;
            $('#account-view').hidden = true;
        }
    }
};

/* Auth tab switching */
$$('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        $$('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const which = tab.dataset.tab;
        $('#login-form').hidden = which !== 'login';
        $('#register-form').hidden = which !== 'register';
    });
});

$('#login-form').addEventListener('submit', e => {
    e.preventDefault();
    const ok = Auth.login({
        email: $('#login-email').value.trim(),
        password: $('#login-password').value
    });
    if (ok) { closeAll(); e.target.reset(); }
});

$('#register-form').addEventListener('submit', e => {
    e.preventDefault();
    const ok = Auth.register({
        name: $('#reg-name').value.trim(),
        email: $('#reg-email').value.trim(),
        password: $('#reg-password').value
    });
    if (ok) { closeAll(); e.target.reset(); }
});

/* ==========================================
   SEARCH
   ========================================== */
const allProducts = [...$$('.product')].map(p => ({
    id: p.dataset.id,
    name: p.dataset.name,
    price: parseFloat(p.dataset.price),
    cat: p.dataset.cat,
    img: p.querySelector('img').src
}));

const searchInput = $('#search-input');
const searchResults = $('#search-results');

function renderSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
        searchResults.innerHTML = `<p class="search-hint">Start typing to find your favorite bake</p>`;
        return;
    }
    const matches = allProducts.filter(p =>
        p.name.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q)
    );
    if (matches.length === 0) {
        searchResults.innerHTML = `<p class="search-hint">No results for "${q}"</p>`;
        return;
    }
    searchResults.innerHTML = `
        <div class="search-list">
            ${matches.map(m => `
                <div class="search-item" data-id="${m.id}">
                    <img src="${m.img}" alt="${m.name}">
                    <div class="search-info">
                        <h4>${m.name}</h4>
                        <p>${fmt(m.price)}</p>
                    </div>
                    <button class="add-btn" data-act="add">Add</button>
                </div>
            `).join('')}
        </div>
    `;
}

searchInput.addEventListener('input', e => renderSearch(e.target.value));

searchResults.addEventListener('click', e => {
    if (e.target.closest('[data-act="add"]')) {
        const id = e.target.closest('.search-item').dataset.id;
        const product = allProducts.find(p => p.id === id);
        if (product) Cart.add(product);
    }
});

/* ==========================================
   FILTERS
   ========================================== */
const filters = { sort: 'default', cat: 'all', maxPrice: 200 };

function applyFilters() {
    let visible = [...$$('.product')];
    visible.forEach(el => {
        const price = parseFloat(el.dataset.price);
        const cat = el.dataset.cat;
        const matchCat = filters.cat === 'all' || cat === filters.cat;
        const matchPrice = price <= filters.maxPrice;
        el.style.display = (matchCat && matchPrice) ? '' : 'none';
    });

    const grid = $('#product-grid');
    const items = [...grid.querySelectorAll('.product')].filter(el => el.style.display !== 'none');

    if (filters.sort !== 'default') {
        items.sort((a, b) => {
            const pa = parseFloat(a.dataset.price);
            const pb = parseFloat(b.dataset.price);
            const na = a.dataset.name;
            const nb = b.dataset.name;
            if (filters.sort === 'price-asc') return pa - pb;
            if (filters.sort === 'price-desc') return pb - pa;
            if (filters.sort === 'name') return na.localeCompare(nb);
            return 0;
        });
        items.forEach(el => grid.appendChild(el));
    }

    const visibleCount = items.length;
    $('#empty-state').hidden = visibleCount > 0;
}

$('#sort-by').addEventListener('change', e => { filters.sort = e.target.value; applyFilters(); });
$('#category-filter').addEventListener('change', e => { filters.cat = e.target.value; applyFilters(); });
$('#price-range').addEventListener('input', e => {
    filters.maxPrice = parseFloat(e.target.value);
    $('#price-display').textContent = `${filters.maxPrice} EGP`;
    applyFilters();
});

/* ==========================================
   CHECKOUT
   ========================================== */
$('#checkout-form').addEventListener('submit', e => {
    e.preventDefault();
    if (Cart.items.length === 0) {
        toast('Your cart is empty', 'error');
        return;
    }
    const order = {
        id: 'M' + Date.now().toString().slice(-7),
        date: new Date().toISOString(),
        name: $('#ck-name').value.trim(),
        phone: $('#ck-phone').value.trim(),
        address: $('#ck-address').value.trim(),
        city: $('#ck-city').value.trim(),
        payment: $('#ck-payment').value,
        items: [...Cart.items],
        subtotal: Cart.subtotal(),
        shipping: SHIPPING,
        total: Cart.subtotal() + SHIPPING,
        email: Auth.user?.email || null
    };
    const orders = DB.get('orders', []);
    orders.push(order);
    DB.set('orders', orders);

    $('#order-id').textContent = order.id;
    $('#checkout-step-1').hidden = true;
    $('#checkout-step-2').hidden = false;

    Cart.clear();
    e.target.reset();
    Auth.render();
});

function openCheckout() {
    if (Cart.items.length === 0) {
        toast('Cart is empty', 'error');
        return;
    }
    $('#ck-items').textContent = Cart.count();
    $('#ck-subtotal').textContent = fmt(Cart.subtotal());
    $('#ck-total').textContent = fmt(Cart.subtotal() + SHIPPING);
    if (Auth.user) {
        $('#ck-name').value = Auth.user.name || '';
    }
    $('#checkout-step-1').hidden = false;
    $('#checkout-step-2').hidden = true;
    closeAll();
    setTimeout(() => openPanel('#checkout-modal'), 100);
}

/* ==========================================
   GLOBAL EVENT DELEGATION
   ========================================== */
document.addEventListener('click', e => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;

    switch (action) {
        case 'open-cart':
            closeAll();
            openPanel('#cart-drawer');
            break;
        case 'close-cart': closeAll(); break;
        case 'open-search':
            closeAll();
            openPanel('#search-modal');
            setTimeout(() => searchInput.focus(), 200);
            break;
        case 'close-search': closeAll(); break;
        case 'open-account':
            closeAll();
            openPanel('#account-modal');
            break;
        case 'close-account': closeAll(); break;
        case 'open-wishlist':
            closeAll();
            openPanel('#wishlist-modal');
            break;
        case 'close-wishlist': closeAll(); break;
        case 'logout': Auth.logout(); break;
        case 'toggle-filters':
            $('#filter-panel').classList.toggle('open');
            break;
        case 'clear-filters':
            filters.sort = 'default';
            filters.cat = 'all';
            filters.maxPrice = 200;
            $('#sort-by').value = 'default';
            $('#category-filter').value = 'all';
            $('#price-range').value = 200;
            $('#price-display').textContent = '200 EGP';
            applyFilters();
            toast('Filters cleared', 'info');
            break;
        case 'add-to-cart': {
            const p = e.target.closest('.product');
            Cart.add({
                id: p.dataset.id,
                name: p.dataset.name,
                price: parseFloat(p.dataset.price),
                img: p.querySelector('img').src
            });
            const btn = e.target.closest('.add-btn');
            btn.classList.add('added');
            btn.textContent = 'Added ✓';
            setTimeout(() => {
                btn.classList.remove('added');
                btn.textContent = 'Add to Cart';
            }, 1200);
            break;
        }
        case 'toggle-fav': {
            const p = e.target.closest('.product');
            Wishlist.toggle({
                id: p.dataset.id,
                name: p.dataset.name,
                price: parseFloat(p.dataset.price),
                img: p.querySelector('img').src,
                cat: p.dataset.cat
            });
            break;
        }
        case 'checkout': openCheckout(); break;
        case 'close-checkout': closeAll(); break;
        case 'careers':
            e.preventDefault();
            toast('Careers page coming soon — email careers@manon.eg', 'info');
            break;
        case 'scroll-explore': {
            const grid = $('#explore-grid');
            grid.scrollBy({ left: 300, behavior: 'smooth' });
            break;
        }
    }
});

/* ==========================================
   CATEGORY FILTER FROM MENU TILES
   ========================================== */
$$('.category').forEach(cat => {
    cat.addEventListener('click', e => {
        const target = cat.dataset.cat;
        const known = ['bread', 'pastry', 'croissant'];
        if (known.includes(target)) {
            filters.cat = target;
            $('#category-filter').value = target;
            applyFilters();
            $('#filter-panel').classList.add('open');
            toast(`Showing ${target}s`, 'info');
        } else {
            e.preventDefault();
            toast(`${cat.querySelector('h4').textContent} — coming soon!`, 'info');
        }
    });
});

/* ==========================================
   NEWSLETTER
   ========================================== */
$('#newsletter-form').addEventListener('submit', e => {
    e.preventDefault();
    const email = $('#newsletter-email').value.trim();
    const subs = DB.get('subscribers', []);
    if (subs.includes(email)) {
        toast('You are already subscribed!', 'info');
        return;
    }
    subs.push(email);
    DB.set('subscribers', subs);
    toast('Subscribed! Check your inbox for the welcome offer.', 'success');
    e.target.reset();
});

/* ==========================================
   MOBILE MENU
   ========================================== */
const toggle = $('.menu-toggle');
const navLinks = $('.nav-links');
toggle?.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    toggle.classList.toggle('active');
});

/* Nav active link */
$$('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        $$('.nav-links a').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        navLinks.classList.remove('open');
    });
});

/* ==========================================
   INIT
   ========================================== */
Cart.render();
Wishlist.render();
Auth.render();
applyFilters();
