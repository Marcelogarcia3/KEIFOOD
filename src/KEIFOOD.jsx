import { useState, useEffect, useMemo, useCallback, useReducer } from "react";

// ============================================================
// UTILITIES
// ============================================================
const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

// ============================================================
// SEED DATA
const SEED = {
  restaurants: [{ id: "r1", name: "Osteria Milano", ownerId: "u1", taxRate: 0.08, defaultBillingMode: "joint" }],
  users: [
    { id: "u1", restaurantId: "r1", name: "Marco Rossi", role: "ADMIN", pin: "0000" },
    { id: "u2", restaurantId: "r1", name: "Sofia Chen", role: "WAITER", pin: "1234" },
    { id: "u3", restaurantId: "r1", name: "Luca Bianchi", role: "WAITER", pin: "5678" },
    { id: "c1", restaurantId: null, name: "Creador de App", role: "CREATOR", pin: "9999" },
  ],
  products: [
    { id: "p1", restaurantId: "r1", name: "Margherita Pizza", price: 14.9, category: "Mains", active: true },
    { id: "p2", restaurantId: "r1", name: "Tagliatelle al Ragù", price: 16.5, category: "Mains", active: true },
    { id: "p3", restaurantId: "r1", name: "Burrata & Prosciutto", price: 12.0, category: "Starters", active: true },
    { id: "p4", restaurantId: "r1", name: "Tiramisu", price: 8.5, category: "Desserts", active: true },
    { id: "p5", restaurantId: "r1", name: "Negroni", price: 11.0, category: "Drinks", active: true },
    { id: "p6", restaurantId: "r1", name: "Sparkling Water", price: 3.5, category: "Drinks", active: true },
    { id: "p7", restaurantId: "r1", name: "Risotto ai Funghi", price: 17.0, category: "Mains", active: true },
    { id: "p8", restaurantId: "r1", name: "Panna Cotta", price: 7.5, category: "Desserts", active: true },
  ],
  tables: [
    { id: "t1", restaurantId: "r1", name: "Table 1", status: "ocupada", waiterId: "u2" },
    { id: "t2", restaurantId: "r1", name: "Table 2", status: "ocupada", waiterId: "u2" },
    { id: "t3", restaurantId: "r1", name: "Table 3", status: "disponible", waiterId: null },
  ],
  customerSessions: [
    { id: "cs1", tableId: "t1", name: "Alice" },
    { id: "cs2", tableId: "t1", name: "Bob" },
    { id: "cs3", tableId: "t1", name: "Clara" },
    { id: "cs4", tableId: "t2", name: "David" },
    { id: "cs5", tableId: "t2", name: "Emma" },
  ],
  orders: [
    { id: "o1", tableId: "t1", status: "open", createdAt: now(), waiterId: "u2" },
    { id: "o2", tableId: "t2", status: "open", createdAt: now(), waiterId: "u2" },
  ],
  orderItems: [
    { id: "oi1", orderId: "o1", productId: "p1", assignedTo: "cs1", status: "served", price: 14.9 },
    { id: "oi2", orderId: "o1", productId: "p2", assignedTo: "cs2", status: "served", price: 16.5 },
    { id: "oi3", orderId: "o1", productId: "p3", assignedTo: "cs3", status: "served", price: 12.0 },
    { id: "oi4", orderId: "o1", productId: "p5", assignedTo: "cs1", status: "served", price: 11.0 },
    { id: "oi5", orderId: "o1", productId: "p4", assignedTo: "cs2", status: "served", price: 8.5 },
    { id: "oi6", orderId: "o2", productId: "p7", assignedTo: "cs4", status: "served", price: 17.0 },
    { id: "oi7", orderId: "o2", productId: "p6", assignedTo: "cs5", status: "served", price: 3.5 },
    { id: "oi8", orderId: "o2", productId: "p1", assignedTo: "cs4", status: "served", price: 14.9 },
  ],
};

// ============================================================
// PERSISTENCE
// ============================================================
const STORAGE_KEY = "keifood_state_v1";

const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { }
  return null;
};

const saveState = (state) => {
  try {
    const { view, waiterPin, currentWaiter, assignModal, customerSession, ...persist } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persist));
  } catch { }
};

const buildInitialState = () => ({
  restaurants: SEED.restaurants,
  users: SEED.users,
  products: SEED.products,
  tables: SEED.tables,
  customerSessions: SEED.customerSessions,
  orders: SEED.orders,
  orderItems: SEED.orderItems,
});

// ============================================================
// REDUCER
// ============================================================
function reducer(state, action) {
  switch (action.type) {
    case "OVERWRITE_STATE": return { ...state, ...action.payload };
    case "RESET_DEMO": return buildInitialState();
    case "ADD_RESTAURANT": {
      const r = { id: uid(), active: true, ...action.payload };
      return { ...state, restaurants: [...state.restaurants, r] };
    }
    case "SET_RESTAURANT": return { 
      ...state, 
      restaurants: state.restaurants.map(r => r.id === action.payload.id ? { ...r, ...action.payload } : r) 
    };

    case "ADD_PRODUCT": {
      const p = { id: uid(), active: true, ...action.payload };
      return { ...state, products: [...state.products, p] };
    }
    case "UPDATE_PRODUCT": return {
      ...state,
      products: state.products.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p),
    };
    case "DELETE_PRODUCT": return { ...state, products: state.products.filter(p => p.id !== action.payload) };

    case "ADD_TABLE": {
      const t = { id: uid(), status: "disponible", waiterId: null, ...action.payload };
      return { ...state, tables: [...state.tables, t] };
    }
    case "UPDATE_TABLE": return {
      ...state,
      tables: state.tables.map(t => t.id === action.payload.id ? { ...t, ...action.payload } : t),
    };
    case "DELETE_TABLE": return { ...state, tables: state.tables.filter(t => t.id !== action.payload) };

    case "CLAIM_TABLE": return {
      ...state,
      tables: state.tables.map(t => t.id === action.payload.tableId ? { ...t, waiterId: action.payload.waiterId } : t),
      orders: state.orders.map(o => o.tableId === action.payload.tableId && o.status === "open" ? { ...o, waiterId: action.payload.waiterId } : o),
    };

    case "ADD_STAFF": {
      const u = { id: uid(), role: "WAITER", ...action.payload };
      return { ...state, users: [...state.users, u] };
    }
    case "REMOVE_STAFF": return { ...state, users: state.users.filter(u => u.id !== action.payload) };

    case "JOIN_TABLE": {
      const existing = state.customerSessions.find(
        cs => cs.tableId === action.payload.tableId && cs.name.toLowerCase() === action.payload.name.toLowerCase()
      );
      if (existing) return state;
      const cs = { id: uid(), ...action.payload };
      const table = state.tables.find(t => t.id === action.payload.tableId);
      const order = state.orders.find(o => o.tableId === action.payload.tableId && o.status === "open");
      const newOrder = order ? {} : { orders: [...state.orders, { id: uid(), tableId: action.payload.tableId, status: "open", createdAt: now(), waiterId: table?.waiterId }] };
      return {
        ...state,
        customerSessions: [...state.customerSessions, cs],
        tables: state.tables.map(t => t.id === action.payload.tableId ? { ...t, status: "ocupada" } : t),
        ...newOrder,
      };
    }

    case "ADD_ORDER_ITEM": {
      const { tableId, productId, assignedTo, price } = action.payload;
      const order = state.orders.find(o => o.tableId === tableId && o.status === "open");
      if (!order) return state;
      const item = { id: uid(), orderId: order.id, productId, assignedTo, status: "served", price };
      return { ...state, orderItems: [...state.orderItems, item] };
    }

    case "ASSIGN_ITEM": return {
      ...state,
      orderItems: state.orderItems.map(i => i.id === action.payload.itemId ? { ...i, assignedTo: action.payload.sessionId } : i),
    };

    case "MARK_PAID": return {
      ...state,
      orderItems: state.orderItems.map(i =>
        action.payload.includes(i.id) ? { ...i, status: "paid" } : i
      ),
    };

    case "CLOSE_TABLE": {
      const { tableId } = action.payload;
      return {
        ...state,
        tables: state.tables.map(t => t.id === tableId ? { ...t, status: "disponible", waiterId: null } : t),
        orders: state.orders.map(o => o.tableId === tableId && o.status === "open" ? { ...o, status: "closed" } : o),
        customerSessions: state.customerSessions.filter(cs => cs.tableId !== tableId),
      };
    }

    default: return state;
  }
}

// ============================================================
// ICONS (inline SVG)
// ============================================================
const Icon = ({ name, size = 16, color = "currentColor" }) => {
  const paths = {
    home: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
    menu: "M3 6h18M3 12h18M3 18h18",
    users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
    table: "M3 3h18v18H3z M3 9h18M3 15h18M9 3v18M15 3v18",
    settings: "M12 2a10 10 0 100 20 10 10 0 000-20z M12 8v4l3 3",
    plus: "M12 5v14M5 12h14",
    trash: "M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6",
    check: "M20 6L9 17l-5-5",
    x: "M18 6L6 18M6 6l12 12",
    edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z",
    receipt: "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z M9 7h6M9 11h6M9 15h4",
    chart: "M18 20V10M12 20V4M6 20v-6",
    logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
    refresh: "M1 4v6h6M23 20v-6h-6 M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15",
    dollar: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
    arrow: "M5 12h14M12 5l7 7-7 7",
    eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 100 6 3 3 0 000-6z",
    lock: "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z M7 11V7a5 5 0 0110 0v4",
    star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z",
    coffee: "M18 8h1a4 4 0 010 8h-1 M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4z M6 1v3M10 1v3M14 1v3",
    pizza: "M12 2a10 10 0 100 20 10 10 0 000-20z M12 2C6.5 2 2 6.5 2 12",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {(paths[name] || "").split(" M").map((d, i) => (
        <path key={i} d={i === 0 ? d : "M" + d} />
      ))}
    </svg>
  );
};

// ============================================================
// STYLES
// ============================================================
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');
  
  :root {
    --primary: #db6b30;
    --primary-hover: #c55722;
    --primary-bg-soft: rgba(219, 107, 48, 0.1);
    --primary-border-soft: rgba(219, 107, 48, 0.2);
    
    --bg-main: #0f0e0d;
    --bg-card: #171514;
    --bg-input: #211e1d;
    
    --border: #332b27;
    
    --text-main: #f5ede8;
    --text-muted: #a69790;
    --text-muted-dark: #6e615b;
    
    --text-green: #4d9a71;
    --text-green-bg: rgba(77, 154, 113, 0.1);
    --text-green-border: rgba(77, 154, 113, 0.2);
  }
  
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  
  body, #root { 
    font-family: 'DM Sans', -apple-system, sans-serif; 
    background: var(--bg-main);
    color: var(--text-main);
    min-height: 100vh;
    font-size: 14px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  .app-layout { display: flex; min-height: 100vh; }
  
  /* SIDEBAR */
  .sidebar {
    width: 220px;
    background: var(--bg-card);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    position: fixed;
    height: 100vh;
    z-index: 50;
  }
  .sidebar-logo {
    padding: 24px 20px 20px;
    border-bottom: 1px solid var(--border);
  }
  .logo-mark {
    display: flex; align-items: center; gap: 10px;
  }
  .logo-icon {
    width: 32px; height: 32px;
    background: linear-gradient(135deg, var(--primary), var(--primary-hover));
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px;
    box-shadow: 0 0 20px var(--primary-border-soft);
  }
  .logo-text { font-size: 15px; font-weight: 600; color: var(--text-main); letter-spacing: -0.3px; }
  .logo-sub { font-size: 11px; color: var(--text-muted-dark); margin-top: 1px; }
  
  .sidebar-nav { flex: 1; padding: 12px 10px; overflow-y: auto; }
  .nav-section-label {
    font-size: 10px; font-weight: 600; color: var(--text-muted-dark);
    text-transform: uppercase; letter-spacing: 1px;
    padding: 16px 10px 6px;
  }
  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 12px;
    border-radius: 8px;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 13.5px;
    font-weight: 400;
    transition: all 150ms;
    border: none; background: none; width: 100%; text-align: left;
  }
  .nav-item:hover { background: var(--bg-input); color: var(--text-main); }
  .nav-item.active { background: var(--primary-bg-soft); color: var(--primary); font-weight: 500; }
  .nav-item.active svg { stroke: var(--primary); }
  
  .sidebar-footer { padding: 12px 10px; border-top: 1px solid var(--border); }
  .role-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--primary-bg-soft); color: var(--primary);
    border: 1px solid var(--primary-border-soft);
    border-radius: 20px; padding: 4px 10px; font-size: 11px; font-weight: 500;
  }
  
  /* MAIN */
  .main-content { margin-left: 220px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }
  
  .topbar {
    background: var(--bg-main);
    border-bottom: 1px solid var(--border);
    padding: 0 32px;
    height: 60px;
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; z-index: 40;
  }
  .topbar-title { font-size: 18px; font-weight: 600; color: var(--text-main); letter-spacing: -0.4px; }
  .topbar-right { display: flex; align-items: center; gap: 12px; }
  
  .page { padding: 32px; }
  
  /* CARDS */
  .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 14px;
    overflow: hidden;
  }
  .card-header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .card-title { font-size: 14px; font-weight: 600; color: var(--text-main); }
  .card-body { padding: 20px 24px; }
  
  /* METRICS */
  .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
  .metric-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 20px 24px;
    transition: border-color 200ms;
  }
  .metric-card:hover { border-color: var(--bg-input); }
  .metric-label { font-size: 11.5px; color: var(--text-muted-dark); font-weight: 500; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px; }
  .metric-value { font-size: 28px; font-weight: 600; color: var(--text-main); letter-spacing: -0.8px; font-variant-numeric: tabular-nums; }
  .metric-sub { font-size: 12px; color: var(--text-green); margin-top: 4px; }
  
  /* BUTTONS */
  .btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 8px 16px;
    border-radius: 9px;
    font-size: 13px; font-weight: 500;
    cursor: pointer;
    transition: all 150ms;
    border: none;
    font-family: inherit;
  }
  .btn:active { transform: scale(0.97); }
  .btn-primary { background: var(--primary); color: #fff; }
  .btn-primary:hover { background: var(--primary-hover); }
  .btn-secondary { background: var(--bg-input); color: var(--text-muted); border: 1px solid var(--border); }
  .btn-secondary:hover { background: var(--border); color: var(--text-main); }
  .btn-danger { background: rgba(239,68,68,0.08); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }
  .btn-danger:hover { background: rgba(239,68,68,0.15); }
  .btn-ghost { background: transparent; color: var(--text-muted); }
  .btn-ghost:hover { color: var(--text-main); background: var(--bg-input); }
  .btn-sm { padding: 6px 12px; font-size: 12px; }
  .btn-lg { padding: 12px 24px; font-size: 15px; }
  .btn-icon { padding: 8px; }
  
  /* INPUTS */
  input, select, textarea {
    font-family: 'DM Sans', sans-serif;
    background: var(--bg-input);
    border: 1px solid var(--border);
    border-radius: 9px;
    color: var(--text-main);
    font-size: 13.5px;
    padding: 9px 14px;
    width: 100%;
    outline: none;
    transition: border-color 150ms;
  }
  input:focus, select:focus, textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-bg-soft); }
  input::placeholder { color: var(--text-muted-dark); }
  select option { background: var(--bg-input); }
  
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
  .form-label { font-size: 12px; font-weight: 500; color: var(--text-muted); }
  
  /* BADGES */
  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 8px; border-radius: 20px;
    font-size: 11px; font-weight: 500;
  }
  .badge-green { background: var(--text-green-bg); color: var(--text-green); border: 1px solid var(--text-green-border); }
  .badge-red { background: rgba(239,68,68,0.08); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }
  .badge-amber { background: rgba(245,158,11,0.08); color: #f59e0b; border: 1px solid rgba(245,158,11,0.2); }
  .badge-blue { background: rgba(59,130,246,0.08); color: #3b82f6; border: 1px solid rgba(59,130,246,0.2); }
  .badge-gray { background: var(--bg-input); color: var(--text-muted); border: 1px solid var(--border); }
  
  /* TABLE */
  .data-table { width: 100%; border-collapse: collapse; }
  .data-table th {
    text-align: left; padding: 10px 16px;
    font-size: 11px; font-weight: 600; color: var(--text-muted-dark);
    text-transform: uppercase; letter-spacing: 0.8px;
    border-bottom: 1px solid var(--border);
  }
  .data-table td {
    padding: 13px 16px;
    border-bottom: 1px solid var(--bg-input);
    color: var(--text-muted); font-size: 13.5px;
  }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: var(--bg-card); }
  .data-table td.primary { color: var(--text-main); font-weight: 500; }
  
  /* GRID */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  
  /* INLINE EDIT ROW */
  .inline-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px;
    border-radius: 10px;
    border: 1px solid transparent;
    transition: all 150ms;
    gap: 12px;
  }
  .inline-row:hover { background: var(--bg-input); border-color: var(--border); }
  .inline-row-actions { display: flex; gap: 6px; opacity: 0; transition: opacity 150ms; }
  .inline-row:hover .inline-row-actions { opacity: 1; }
  
  /* PRODUCT GRID */
  .product-card {
    background: var(--bg-input);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px;
    cursor: pointer;
    transition: all 200ms;
    position: relative;
    overflow: hidden;
  }
  .product-card:hover { border-color: var(--primary); transform: translateY(-2px); }
  .product-card.selected { border-color: var(--primary); background: var(--primary-bg-soft); }
  .product-name { font-size: 14px; font-weight: 500; color: var(--text-main); margin-bottom: 4px; }
  .product-price { font-size: 18px; font-weight: 600; color: var(--primary); font-variant-numeric: tabular-nums; }
  .product-cat { font-size: 11px; color: var(--text-muted-dark); margin-top: 4px; }
  
  /* CUSTOMER CARDS */
  .customer-chip {
    display: flex; align-items: center; gap: 8px;
    background: var(--bg-input);
    border: 2px solid var(--border);
    border-radius: 10px;
    padding: 10px 14px;
    cursor: pointer;
    transition: all 150ms;
    font-size: 13px; font-weight: 500; color: var(--text-muted);
  }
  .customer-chip:hover { border-color: var(--primary); color: var(--primary); }
  .customer-chip.selected { border-color: var(--primary); background: var(--primary-bg-soft); color: var(--primary); }
  .customer-avatar {
    width: 28px; height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary), var(--primary-hover));
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 600; color: #fff;
    flex-shrink: 0;
  }
  
  /* BILL ITEM */
  .bill-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid var(--bg-input);
  }
  .bill-item:last-child { border-bottom: none; }
  .bill-item-name { font-size: 13.5px; color: var(--text-main); }
  .bill-item-price { font-size: 13.5px; font-weight: 500; color: var(--text-main); font-variant-numeric: tabular-nums; }
  .bill-item.paid { opacity: 0.4; text-decoration: line-through; }
  
  /* MODAL */
  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    z-index: 100; padding: 24px;
  }
  .modal {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 18px;
    width: 100%; max-width: 440px;
    max-height: 85vh;
    overflow-y: auto;
    box-shadow: 0 25px 80px rgba(0,0,0,0.6);
    animation: modalIn 200ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .modal-header {
    padding: 24px 24px 16px;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .modal-title { font-size: 16px; font-weight: 600; color: var(--text-main); }
  .modal-body { padding: 24px; }
  .modal-footer {
    padding: 16px 24px;
    border-top: 1px solid var(--border);
    display: flex; justify-content: flex-end; gap: 10px;
  }
  
  @keyframes modalIn { from { opacity:0; transform: scale(0.95) translateY(8px); } to { opacity:1; transform: none; } }
  
  /* PIN PAD */
  .pin-display {
    display: flex; justify-content: center; gap: 10px; margin: 20px 0;
  }
  .pin-dot {
    width: 14px; height: 14px;
    border-radius: 50%;
    border: 2px solid var(--text-muted-dark);
    transition: all 200ms;
  }
  .pin-dot.filled { background: var(--primary); border-color: var(--primary); }
  .pin-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .pin-key {
    aspect-ratio: 1; border-radius: 12px;
    background: var(--bg-input); border: 1px solid var(--border);
    font-size: 20px; font-weight: 500; color: var(--text-main);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 150ms;
    font-family: 'DM Mono', monospace;
  }
  .pin-key:hover { background: var(--border); border-color: var(--bg-input); transform: scale(1.04); }
  .pin-key:active { transform: scale(0.96); }
  .pin-key.delete { color: var(--text-muted); }
  
  /* CHART */
  .chart-bar-wrapper { display: flex; flex-direction: column; gap: 8px; }
  .chart-bar-row { display: flex; align-items: center; gap: 10px; }
  .chart-bar-label { font-size: 12px; color: var(--text-muted); width: 80px; text-align: right; }
  .chart-bar-track { flex: 1; height: 28px; background: var(--bg-input); border-radius: 6px; overflow: hidden; }
  .chart-bar-fill { height: 100%; border-radius: 6px; background: linear-gradient(90deg, var(--primary), var(--primary-hover)); transition: width 800ms cubic-bezier(0.16,1,0.3,1); display: flex; align-items: center; padding: 0 10px; }
  .chart-bar-val { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.7); }
  
  /* EMPTY STATE */
  .empty-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 56px 24px; text-align: center;
    color: var(--text-muted-dark);
  }
  .empty-icon { font-size: 40px; margin-bottom: 12px; opacity: 0.5; }
  .empty-title { font-size: 15px; font-weight: 500; color: var(--text-muted); margin-bottom: 6px; }
  .empty-sub { font-size: 13px; color: var(--text-muted-dark); }
  
  /* MOBILE VIEWS */
  .mobile-shell {
    min-height: 100vh;
    background: var(--bg-main);
    display: flex; flex-direction: column;
  }
  .mobile-header {
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
    padding: 16px 20px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .mobile-title { font-size: 17px; font-weight: 600; color: var(--text-main); }
  .mobile-body { flex: 1; padding: 20px; overflow-y: auto; }
  .mobile-bottom {
    background: var(--bg-card);
    border-top: 1px solid var(--border);
    padding: 12px 20px;
    display: flex; gap: 10px;
  }
  
  /* TAB NAV */
  .tabs { display: flex; background: var(--bg-input); border-radius: 10px; padding: 3px; margin-bottom: 20px; }
  .tab {
    flex: 1; text-align: center; padding: 7px 12px;
    border-radius: 8px; font-size: 13px; font-weight: 500;
    cursor: pointer; color: var(--text-muted); transition: all 150ms;
    border: none; background: none; font-family: inherit;
  }
  .tab.active { background: var(--bg-card); color: var(--primary); border: 1px solid var(--border); }
  
  /* ROLE SELECTOR */
  .role-card {
    background: var(--bg-card); border: 2px solid var(--border);
    border-radius: 16px; padding: 28px;
    cursor: pointer; transition: all 200ms; text-align: center;
  }
  .role-card:hover { border-color: var(--primary); transform: translateY(-3px); }
  .role-card-icon { font-size: 36px; margin-bottom: 12px; }
  .role-card-title { font-size: 16px; font-weight: 600; color: var(--text-main); margin-bottom: 4px; }
  .role-card-sub { font-size: 13px; color: var(--text-muted); }
  
  /* TABLE GRID */
  .table-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
  .table-tile {
    background: var(--bg-input); border: 2px solid var(--border);
    border-radius: 14px; padding: 20px 16px;
    cursor: pointer; transition: all 200ms; text-align: center;
  }
  .table-tile:hover { border-color: var(--border); transform: translateY(-2px); }
  .table-tile.occupied { border-color: rgba(219, 107, 48, 0.4); }
  .table-tile-name { font-size: 14px; font-weight: 600; color: var(--text-main); margin-bottom: 6px; }
  .table-tile-status { font-size: 11px; }
  
  /* RECEIPT */
  .receipt {
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 14px; overflow: hidden;
  }
  .receipt-header {
    background: linear-gradient(135deg, #241611, #1a100a);
    padding: 20px;
    border-bottom: 1px solid var(--border);
  }
  .receipt-total-label { font-size: 11px; color: var(--primary); text-transform: uppercase; letter-spacing: 1px; }
  .receipt-total { font-size: 32px; font-weight: 600; color: var(--text-main); letter-spacing: -1px; font-variant-numeric: tabular-nums; }
  .receipt-body { padding: 16px 20px; }
  .receipt-footer { padding: 16px 20px; border-top: 1px solid var(--border); }
  
  /* WAITER ORDER */
  .order-step {
    animation: fadeSlide 200ms cubic-bezier(0.16,1,0.3,1);
  }
  @keyframes fadeSlide { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: none; } }
  
  /* DIVIDER */
  .divider { height: 1px; background: var(--border); margin: 16px 0; }
  
  /* CHIP */
  .chip {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 20px;
    font-size: 12px; font-weight: 500;
    background: var(--bg-input); color: var(--text-muted);
    border: 1px solid var(--border);
  }
  
  /* FLEX UTILS */
  .flex { display: flex; }
  .flex-col { display: flex; flex-direction: column; }
  .items-center { align-items: center; }
  .items-start { align-items: flex-start; }
  .justify-between { justify-content: space-between; }
  .justify-end { justify-content: flex-end; }
  .gap-2 { gap: 8px; }
  .gap-3 { gap: 12px; }
  .gap-4 { gap: 16px; }
  .flex-1 { flex: 1; }
  .mb-4 { margin-bottom: 16px; }
  .mb-5 { margin-bottom: 20px; }
  .mb-6 { margin-bottom: 24px; }
  .mt-4 { margin-top: 16px; }
  .w-full { width: 100%; }
  .text-sm { font-size: 12px; color: var(--text-muted); }
  .font-semibold { font-weight: 600; }
  .text-primary { color: var(--text-main); }
  .text-muted { color: var(--text-muted); }
  .text-green { color: var(--text-green); }
  .text-red { color: #ef4444; }
`;

// ============================================================
// CHART COMPONENT (No recharts, pure CSS)
// ============================================================
const BarChart = ({ data }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="chart-bar-wrapper">
      {data.map((d, i) => (
        <div key={i} className="chart-bar-row">
          <div className="chart-bar-label">{d.label}</div>
          <div className="chart-bar-track">
            <div className="chart-bar-fill" style={{ width: `${(d.value / max) * 100}%` }}>
              {d.value > 0 && <span className="chart-bar-val">${d.value.toFixed(0)}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================================
// MAIN APP
// ============================================================
export default function KEIFOOD() {
  const persisted = loadState();
  const [state, dispatch] = useReducer(reducer, persisted || buildInitialState());
  const [view, setView] = useState("landing"); // landing | admin | waiter | customer
  const [adminSection, setAdminSection] = useState("dashboard");
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [currentWaiter, setCurrentWaiter] = useState(null);
  const [currentCustomer, setCurrentCustomer] = useState(null); // { session, tableId }
  const [waiterPin, setWaiterPin] = useState("");
  const [waiterTable, setWaiterTable] = useState(null);

  useEffect(() => { saveState(state); }, [state]);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        try {
          if (e.newValue) {
            dispatch({ type: "OVERWRITE_STATE", payload: JSON.parse(e.newValue) });
          }
        } catch (err) {}
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const reset = () => { dispatch({ type: "RESET_DEMO" }); setView("landing"); setCurrentWaiter(null); setCurrentCustomer(null); };

  return (
    <>
      <style>{css}</style>
      {view === "landing" && <LandingView setView={setView} reset={reset} />}
      {view === "creator-login" && (
        <CreatorLogin
          pin={waiterPin}
          setPin={setWaiterPin}
          onSuccess={() => setView("creator")}
          setView={setView}
        />
      )}
      {view === "creator" && (
        <CreatorLayout
          state={state}
          dispatch={dispatch}
          setView={setView}
        />
      )}
      {view === "admin-login" && (
        <AdminLogin
          state={state}
          pin={waiterPin}
          setPin={setWaiterPin}
          onSuccess={(user) => { setCurrentAdmin(user); setView("admin"); }}
          setView={setView}
        />
      )}
      {view === "admin" && (
        <AdminLayout
          currentAdmin={currentAdmin}
          state={state}
          dispatch={dispatch}
          section={adminSection}
          setSection={setAdminSection}
          setView={setView}
          reset={reset}
        />
      )}
      {view === "waiter-login" && (
        <WaiterLogin
          state={state}
          pin={waiterPin}
          setPin={setWaiterPin}
          onSuccess={(user) => { setCurrentWaiter(user); setView("waiter"); }}
          setView={setView}
        />
      )}
      {view === "waiter" && (
        <WaiterInterface
          state={state}
          dispatch={dispatch}
          waiter={currentWaiter}
          tableId={waiterTable}
          setTableId={setWaiterTable}
          setView={setView}
          reset={reset}
        />
      )}
      {view === "customer" && (
        <CustomerInterface
          state={state}
          dispatch={dispatch}
          session={currentCustomer}
          setSession={setCurrentCustomer}
          setView={setView}
        />
      )}
    </>
  );
}

// ============================================================
// LANDING
// ============================================================
function LandingView({ setView, reset }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", background: "#0a0b0f" }}>
      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 16 }}>
          <div className="logo-icon" style={{ width: 44, height: 44, fontSize: 22 }}>⚡</div>
          <span style={{ fontSize: 28, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.8px" }}>KEIFOOD</span>
        </div>
        <p style={{ fontSize: 16, color: "#4b5563", maxWidth: 400, lineHeight: 1.7 }}>
          Real-time split billing for modern restaurants. Choose your role to get started.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 220px)", gap: 16, marginBottom: 40 }}>
        <div className="role-card" onClick={() => setView("admin-login")}>
          <div className="role-card-icon">🏛️</div>
          <div className="role-card-title">Administrador</div>
          <div className="role-card-sub">Gestiona menú, mesas y personal</div>
        </div>
        <div className="role-card" onClick={() => setView("waiter-login")}>
          <div className="role-card-icon">🍽️</div>
          <div className="role-card-title">Mesero</div>
          <div className="role-card-sub">Toma órdenes y asigna platillos</div>
        </div>
        <div className="role-card" onClick={() => setView("customer")}>
          <div className="role-card-icon">👤</div>
          <div className="role-card-title">Comensal</div>
          <div className="role-card-sub">Únete a la mesa y paga tu parte</div>
        </div>
        <div className="role-card" onClick={() => setView("creator-login")}>
          <div className="role-card-icon">🛠️</div>
          <div className="role-card-title">Creador de App</div>
          <div className="role-card-sub">Gestiona restaurantes vinculados</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button className="btn btn-secondary" onClick={reset}>
          <Icon name="refresh" size={14} /> Reiniciar Demo
        </button>
        <span style={{ fontSize: 12, color: "#374151" }}>Demo PINs: Creator=9999 · Admin=0000 · Waiters=1234, 5678</span>
      </div>
    </div>
  );
}

// ============================================================
// ADMIN LAYOUT
// ============================================================
const ADMIN_NAV = [
  { id: "dashboard", label: "Panel", icon: "home" },
  { id: "menu", label: "Menu", icon: "pizza" },
  { id: "tables", label: "Mesas", icon: "table" },
  { id: "staff", label: "Personal", icon: "users" },
];

function AdminLayout({ currentAdmin, state, dispatch, section, setSection, setView, reset }) {
  const restId = currentAdmin?.restaurantId;
  const currentRestaurant = state.restaurants.find(r => r.id === restId) || {};

  const myTables = state.tables.filter(t => t.restaurantId === restId);
  const myTableIds = new Set(myTables.map(t => t.id));
  const mySessions = state.customerSessions.filter(cs => myTableIds.has(cs.tableId));
  const myOrders = state.orders.filter(o => myTableIds.has(o.tableId));
  const myOrderIds = new Set(myOrders.map(o => o.id));
  const myOrderItems = state.orderItems.filter(i => myOrderIds.has(i.orderId));
  const myProducts = state.products.filter(p => p.restaurantId === restId);
  const myUsers = state.users.filter(u => u.restaurantId === restId);

  const localState = {
    ...state,
    users: myUsers,
    products: myProducts,
    tables: myTables,
    customerSessions: mySessions,
    orders: myOrders,
    orderItems: myOrderItems,
  };

  const localDispatch = (action) => {
    if (["ADD_PRODUCT", "ADD_TABLE", "ADD_STAFF"].includes(action.type)) {
      action.payload.restaurantId = restId;
    }
    dispatch(action);
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">
            <div className="logo-icon">⚡</div>
            <div>
              <div className="logo-text">KEIFOOD</div>
              <div className="logo-sub">{currentRestaurant.name}</div>
            </div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section-label">Management</div>
          {ADMIN_NAV.map(item => (
            <button key={item.id} className={`nav-item ${section === item.id ? "active" : ""}`} onClick={() => setSection(item.id)}>
              <Icon name={item.icon} size={15} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="role-badge"><Icon name="star" size={11} /> Admin</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={reset}>
              <Icon name="refresh" size={12} /> Reset
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setView("landing")}>
              <Icon name="logout" size={12} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <div className="topbar">
          <span className="topbar-title">
            {ADMIN_NAV.find(n => n.id === section)?.label}
          </span>
          <div className="topbar-right">
            <span className="chip">🏛️ {currentAdmin?.name}</span>
          </div>
        </div>
        <div className="page">
          {section === "dashboard" && <AdminDashboard state={localState} />}
          {section === "menu" && <AdminMenu state={localState} dispatch={localDispatch} />}
          {section === "tables" && <AdminTables state={localState} dispatch={localDispatch} />}
          {section === "staff" && <AdminStaff state={localState} dispatch={localDispatch} />}
        </div>
      </main>
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================
function AdminDashboard({ state }) {
  const metrics = useMemo(() => {
    const paidItems = state.orderItems.filter(i => i.status === "paid");
    const allItems = state.orderItems;
    const totalRevenue = allItems.reduce((s, i) => s + i.price, 0);
    const activeTables = state.tables.filter(t => t.status === "ocupada").length;
    const openOrders = state.orders.filter(o => o.status === "open").length;

    // Sales by product
    const byProduct = {};
    allItems.forEach(oi => {
      const p = state.products.find(p => p.id === oi.productId);
      if (p) byProduct[p.name] = (byProduct[p.name] || 0) + oi.price;
    });
    const chartData = Object.entries(byProduct).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value }));

    // By category
    const byCat = {};
    allItems.forEach(oi => {
      const p = state.products.find(p => p.id === oi.productId);
      if (p) byCat[p.category] = (byCat[p.category] || 0) + 1;
    });

    // By waiter
    const byWaiter = {};
    allItems.forEach(oi => {
      const order = state.orders.find(o => o.id === oi.orderId);
      if (order && order.waiterId) {
        const waiter = state.users.find(u => u.id === order.waiterId);
        const wName = waiter ? waiter.name : "Unknown";
        byWaiter[wName] = (byWaiter[wName] || 0) + oi.price;
      }
    });
    const waiterChartData = Object.entries(byWaiter).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));

    return { totalRevenue, activeTables, openOrders, totalItems: allItems.length, chartData, byCat, waiterChartData };
  }, [state.orderItems, state.orders, state.tables, state.products]);

  return (
    <div>
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Ingresos Totales</div>
          <div className="metric-value">${metrics.totalRevenue.toFixed(2)}</div>
          <div className="metric-sub">↑ Live orders</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Mesas Activas</div>
          <div className="metric-value">{metrics.activeTables}</div>
          <div className="metric-sub">de {state.tables.length} en total</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Artículos Pedidos</div>
          <div className="metric-value">{metrics.totalItems}</div>
          <div className="metric-sub">en todas las mesas</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Órdenes Abiertas</div>
          <div className="metric-value">{metrics.openOrders}</div>
          <div className="metric-sub">siendo atendidas</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Ingresos por Artículo</span>
            <span className="badge badge-green">Live</span>
          </div>
          <div className="card-body">
            {metrics.chartData.length > 0
              ? <BarChart data={metrics.chartData} />
              : <div className="empty-state"><div className="empty-title">Aún no hay órdenes</div></div>
            }
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Ingresos por Mesero</span>
          </div>
          <div className="card-body">
            {metrics.waiterChartData.length > 0
              ? <BarChart data={metrics.waiterChartData} />
              : <div className="empty-state"><div className="empty-title">Sin ventas de meseros</div></div>
            }
          </div>
        </div>

        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="card-header">
            <span className="card-title">Mesas Activas</span>
          </div>
          <div className="card-body">
            {state.tables.map(table => {
              const sessions = state.customerSessions.filter(cs => cs.tableId === table.id);
              const order = state.orders.find(o => o.tableId === table.id && o.status === "open");
              const items = order ? state.orderItems.filter(i => i.orderId === order.id) : [];
              const revenue = items.reduce((s, i) => s + i.price, 0);
              return (
                <div key={table.id} className="inline-row" style={{ marginBottom: 4 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#e2e8f0", marginBottom: 2 }}>
                      {table.name}
                      {table.waiterId && <span style={{ fontSize: 11, color: "var(--primary)", marginLeft: 8 }}>• Waiter: {state.users.find(u => u.id === table.waiterId)?.name}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "#4b5563" }}>{sessions.length} personas · {items.length} items</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "var(--primary)", fontVariantNumeric: "tabular-nums" }}>${revenue.toFixed(2)}</span>
                    <span className={`badge ${table.status === "ocupada" ? "badge-green" : "badge-gray"}`}>{table.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MENU MANAGEMENT
// ============================================================
function AdminMenu({ state, dispatch }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", price: "", category: "Mains" });
  const [showAdd, setShowAdd] = useState(false);

  const categories = [...new Set(state.products.map(p => p.category))];
  const grouped = categories.reduce((acc, cat) => {
    acc[cat] = state.products.filter(p => p.category === cat);
    return acc;
  }, {});

  const save = () => {
    if (!form.name || !form.price) return;
    if (editing) {
      dispatch({ type: "UPDATE_PRODUCT", payload: { id: editing, ...form, price: parseFloat(form.price) } });
      setEditing(null);
    } else {
      dispatch({ type: "ADD_PRODUCT", payload: { ...form, price: parseFloat(form.price) } });
    }
    setForm({ name: "", price: "", category: "Mains" });
    setShowAdd(false);
  };

  const startEdit = (p) => { setEditing(p.id); setForm({ name: p.name, price: p.price.toString(), category: p.category }); setShowAdd(true); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#f1f5f9", marginBottom: 2 }}>{state.products.length} Products</div>
          <div className="text-sm">{categories.length} categories</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowAdd(true); setEditing(null); setForm({ name: "", price: "", category: "Mains" }); }}>
          <Icon name="plus" size={14} /> Add Product
        </button>
      </div>

      {showAdd && (
        <div className="card mb-5">
          <div className="card-header">
            <span className="card-title">{editing ? "Edit Product" : "New Product"}</span>
            <button className="btn btn-ghost btn-icon" onClick={() => { setShowAdd(false); setEditing(null); }}>
              <Icon name="x" size={14} />
            </button>
          </div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Product Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Margherita Pizza" />
              </div>
              <div className="form-group">
                <label className="form-label">Price ($)</label>
                <input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="14.90" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {["Starters", "Mains", "Desserts", "Drinks"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => { setShowAdd(false); setEditing(null); }}>Cancelar</button>
              <button className="btn btn-primary" onClick={save}>{editing ? "Update" : "Add Product"}</button>
            </div>
          </div>
        </div>
      )}

      {Object.entries(grouped).map(([cat, products]) => (
        <div key={cat} className="card mb-4">
          <div className="card-header">
            <span className="card-title">{cat}</span>
            <span className="badge badge-gray">{products.length}</span>
          </div>
          <table className="data-table">
            <thead>
              <tr><th>Nombre</th><th>Price</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td className="primary">{p.name}</td>
                  <td style={{ color: "var(--primary)", fontWeight: 500 }}>${p.price.toFixed(2)}</td>
                  <td><span className={`badge ${p.active ? "badge-green" : "badge-gray"}`}>{p.active ? "Active" : "Hidden"}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => startEdit(p)}><Icon name="edit" size={13} /></button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => dispatch({ type: "DELETE_PRODUCT", payload: p.id })}><Icon name="trash" size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {state.products.length === 0 && (
        <div className="card"><div className="empty-state"><div className="empty-icon">🍽️</div><div className="empty-title">No products yet</div><div className="empty-sub">Add your first menu item above</div></div></div>
      )}
    </div>
  );
}

// ============================================================
// TABLES MANAGEMENT
// ============================================================
function AdminTables({ state, dispatch }) {
  const [form, setForm] = useState({ name: "" });
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#f1f5f9", marginBottom: 2 }}>{state.tables.length} Tables</div>
          <div className="text-sm">{state.tables.filter(t => t.status === "ocupada").length} occupied</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Icon name="plus" size={14} /> Add Table
        </button>
      </div>

      {showAdd && (
        <div className="card mb-5">
          <div className="card-body">
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">Nombre de la Mesa</label>
                <input value={form.name} onChange={e => setForm({ name: e.target.value })} placeholder="e.g. Table 4, Terrace 1" />
              </div>
              <button className="btn btn-primary" onClick={() => { if (form.name) { dispatch({ type: "ADD_TABLE", payload: form }); setForm({ name: "" }); setShowAdd(false); } }}>Add</button>
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <table className="data-table">
          <thead><tr><th>Table</th><th>Estado</th><th>Invitados</th><th>Revenue</th><th></th></tr></thead>
          <tbody>
            {state.tables.map(t => {
              const sessions = state.customerSessions.filter(cs => cs.tableId === t.id);
              const order = state.orders.find(o => o.tableId === t.id && o.status === "open");
              const items = order ? state.orderItems.filter(i => i.orderId === order.id) : [];
              const rev = items.reduce((s, i) => s + i.price, 0);
              return (
                <tr key={t.id}>
                  <td className="primary">
                    {t.name}
                    {t.waiterId && <div style={{ fontSize: 11, color: "var(--primary)", marginTop: 2 }}>Waiter: {state.users.find(u => u.id === t.waiterId)?.name}</div>}
                  </td>
                  <td><span className={`badge ${t.status === "ocupada" ? "badge-green" : "badge-gray"}`}>{t.status}</span></td>
                  <td>{sessions.length > 0 ? sessions.map(s => s.name).join(", ") : <span className="text-muted">—</span>}</td>
                  <td style={{ color: "var(--primary)", fontWeight: 500 }}>{rev > 0 ? `$${rev.toFixed(2)}` : "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      {t.status === "ocupada" && (
                        <button className="btn btn-secondary btn-sm" onClick={() => dispatch({ type: "CLOSE_TABLE", payload: { tableId: t.id } })}>Cerrar</button>
                      )}
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => dispatch({ type: "DELETE_TABLE", payload: t.id })}><Icon name="trash" size={13} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {state.tables.length === 0 && <div className="empty-state"><div className="empty-icon">🪑</div><div className="empty-title">No hay mesas</div><div className="empty-sub">Agrega mesas para comenzar</div></div>}
      </div>
    </div>
  );
}

// ============================================================
// STAFF MANAGEMENT
// ============================================================
function AdminStaff({ state, dispatch }) {
  const [form, setForm] = useState({ name: "", pin: "" });
  const [showAdd, setShowAdd] = useState(false);
  const waiters = state.users.filter(u => u.role === "WAITER");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#f1f5f9", marginBottom: 2 }}>{waiters.length} Waiters</div>
          <div className="text-sm">Más 1 cuenta de administrador</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={14} /> Add Waiter</button>
      </div>

      {showAdd && (
        <div className="card mb-5">
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nombre Completo</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Anna Greco" />
              </div>
              <div className="form-group">
                <label className="form-label">PIN de 4 dígitos</label>
                <input maxLength={4} value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, "") }))} placeholder="e.g. 9012" style={{ fontFamily: "DM Mono, monospace", letterSpacing: "4px" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => { if (form.name && form.pin.length === 4) { dispatch({ type: "ADD_STAFF", payload: form }); setForm({ name: "", pin: "" }); setShowAdd(false); } }}>Agregar Mesero</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <table className="data-table">
          <thead><tr><th>Nombre</th><th>Rol</th><th>PIN</th><th>Ventas Totales</th><th></th></tr></thead>
          <tbody>
            {state.users.map(u => {
              const sales = state.orderItems.filter(oi => {
                const order = state.orders.find(o => o.id === oi.orderId);
                return order && order.waiterId === u.id;
              }).reduce((sum, oi) => sum + oi.price, 0);

              return (
                <tr key={u.id}>
                  <td className="primary">{u.name}</td>
                  <td><span className={`badge ${u.role === "ADMIN" ? "badge-amber" : "badge-blue"}`}>{u.role}</span></td>
                  <td><span style={{ fontFamily: "DM Mono, monospace", color: "#6b7280", letterSpacing: "2px" }}>{"•".repeat(u.pin.length)}</span></td>
                  <td style={{ color: "var(--primary)", fontWeight: 600 }}>{u.role === "WAITER" ? `$${sales.toFixed(2)}` : "-"}</td>
                  <td>
                    {u.role === "WAITER" && (
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => dispatch({ type: "REMOVE_STAFF", payload: u.id })}><Icon name="trash" size={13} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// SETTINGS
// ============================================================
function AdminSettings({ state, dispatch }) {
  const [form, setForm] = useState({ name: state.restaurant.name, taxRate: state.restaurant.taxRate * 100, defaultBillingMode: state.restaurant.defaultBillingMode });
  const [saved, setSaved] = useState(false);

  const save = () => {
    dispatch({ type: "SET_RESTAURANT", payload: { name: form.name, taxRate: form.taxRate / 100, defaultBillingMode: form.defaultBillingMode } });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="card">
        <div className="card-header"><span className="card-title">Restaurant Settings</span></div>
        <div className="card-body">
          <div className="form-group">
            <label className="form-label">Nombre Restaurante</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Tax Rate (%)</label>
            <input type="number" step="0.5" min="0" max="30" value={form.taxRate} onChange={e => setForm(f => ({ ...f, taxRate: parseFloat(e.target.value) }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Default Billing Mode</label>
            <select value={form.defaultBillingMode} onChange={e => setForm(f => ({ ...f, defaultBillingMode: e.target.value }))}>
              <option value="joint">Joint Bill (entire table)</option>
              <option value="split">Split Bill (individual)</option>
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <button className="btn btn-primary" onClick={save}>
              {saved ? <><Icon name="check" size={14} /> Saved!</> : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CREATOR VIEWS
// ============================================================
function CreatorLogin({ pin, setPin, onSuccess, setView }) {
  const [error, setError] = useState(false);
  const press = (k) => {
    if (k === "del") { setPin(p => p.slice(0, -1)); setError(false); return; }
    if (pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 4) {
      if (next === "9999") { setError(false); setTimeout(() => onSuccess(), 200); }
      else { setError(true); setTimeout(() => { setPin(""); setError(false); }, 1000); }
    }
  };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0b0f" }}>
      <div style={{ width: 320 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div className="logo-icon" style={{ width: 48, height: 48, fontSize: 24, margin: "0 auto 16px" }}>⚡</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#f1f5f9", marginBottom: 4 }}>Creador de App</div>
          <div style={{ fontSize: 13, color: "#4b5563" }}>Enter Creator PIN</div>
        </div>
        <div className="pin-display">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`pin-dot ${i < pin.length ? "filled" : ""}`} style={error ? { borderColor: "#ef4444", background: i < pin.length ? "#ef4444" : "transparent" } : {}} />
          ))}
        </div>
        {error && <div style={{ textAlign: "center", color: "#ef4444", fontSize: 12, marginBottom: 8 }}>PIN Incorrecto</div>}
        <div className="pin-grid" style={{ marginBottom: 16 }}>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k, i) => (
            k === "" ? <div key={i} /> :
              <button key={i} className={`pin-key ${k === "del" ? "delete" : ""}`} onClick={() => press(k)}>
                {k === "del" ? "⌫" : k}
              </button>
          ))}
        </div>
        <button className="btn btn-ghost w-full" onClick={() => setView("landing")} style={{ justifyContent: "center" }}>
          <Icon name="arrow" size={13} style={{ transform: "rotate(180deg)" }} /> Back
        </button>
      </div>
    </div>
  );
}

function CreatorLayout({ state, dispatch, setView }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", adminName: "", adminPin: "" });

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark"><div className="logo-icon">⚡</div><div><div className="logo-text">Admin Creador</div><div className="logo-sub">Plataforma</div></div></div>
        </div>
        <div className="sidebar-footer" style={{ marginTop: "auto", display: "flex", gap: 10 }}>
          <button className="btn btn-ghost w-full" onClick={() => setView("landing")}><Icon name="logout" size={13} /> Logout</button>
        </div>
      </aside>
      <main className="main-content">
        <div className="topbar">
          <span className="topbar-title">Red de Restaurantes</span>
        </div>
        <div className="page" style={{ maxWidth: 800 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#f1f5f9", marginBottom: 2 }}>{state.restaurants.length} Restaurants</div>
              <div className="text-sm">Gestión multi-restaurante</div>
            </div>
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={14} /> New Restaurant</button>
          </div>

          {showAdd && (
            <div className="card mb-5">
              <div className="card-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Nombre Restaurante</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Sushi Bar" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nombre Administrador</label>
                    <input value={form.adminName} onChange={e => setForm(f => ({ ...f, adminName: e.target.value }))} placeholder="e.g. John Doe" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">PIN Administrador</label>
                    <input value={form.adminPin} maxLength={4} onChange={e => setForm(f => ({ ...f, adminPin: e.target.value.replace(/\D/g, "") }))} placeholder="1111" />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancelar</button>
                  <button className="btn btn-primary" onClick={() => {
                    if (form.name && form.adminName && form.adminPin.length === 4) {
                      const newRestId = "r" + Math.random().toString().slice(2, 6);
                      dispatch({ type: "ADD_RESTAURANT", payload: { id: newRestId, name: form.name, taxRate: 0.1, defaultBillingMode: "split" } });
                      dispatch({ type: "ADD_STAFF", payload: { role: "ADMIN", name: form.adminName, pin: form.adminPin, restaurantId: newRestId } });
                      setForm({ name: "", adminName: "", adminPin: "" });
                      setShowAdd(false);
                    }
                  }}>Registrar Restaurante</button>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <table className="data-table">
              <thead><tr><th>Restaurante</th><th>Nombre Administrador</th><th>PIN Administrador</th></tr></thead>
              <tbody>
                {state.restaurants.map(r => {
                  const rAdmin = state.users.find(u => u.restaurantId === r.id && u.role === "ADMIN");
                  return (
                    <tr key={r.id}>
                      <td className="primary">{r.name}</td>
                      <td>{rAdmin?.name || "-"}</td>
                      <td style={{ fontFamily: "monospace", letterSpacing: "1px" }}>{rAdmin?.pin || "-"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

// ============================================================
// ADMIN LOGIN (PIN)
// ============================================================
function AdminLogin({ state, pin, setPin, onSuccess, setView }) {
  const [error, setError] = useState(false);

  const press = (k) => {
    if (k === "del") { setPin(p => p.slice(0, -1)); setError(false); return; }
    if (pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 4) {
      const user = state.users.find(u => u.role === "ADMIN" && u.pin === next);
      if (user) { setError(false); setTimeout(() => onSuccess(user), 200); }
      else { setError(true); setTimeout(() => { setPin(""); setError(false); }, 1000); }
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0b0f" }}>
      <div style={{ width: 320 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div className="logo-icon" style={{ width: 48, height: 48, fontSize: 24, margin: "0 auto 16px" }}>⚡</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#f1f5f9", marginBottom: 4 }}>Acceso Administrador</div>
          <div style={{ fontSize: 13, color: "#4b5563" }}>Ingresar PIN de Administrador</div>
        </div>

        <div className="pin-display">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`pin-dot ${i < pin.length ? "filled" : ""}`} style={error ? { borderColor: "#ef4444", background: i < pin.length ? "#ef4444" : "transparent" } : {}} />
          ))}
        </div>
        {error && <div style={{ textAlign: "center", color: "#ef4444", fontSize: 12, marginBottom: 8 }}>PIN Incorrecto</div>}

        <div className="pin-grid" style={{ marginBottom: 16 }}>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k, i) => (
            k === "" ? <div key={i} /> :
              <button key={i} className={`pin-key ${k === "del" ? "delete" : ""}`} onClick={() => press(k)}>
                {k === "del" ? "⌫" : k}
              </button>
          ))}
        </div>

        <button className="btn btn-ghost w-full" onClick={() => setView("landing")} style={{ justifyContent: "center" }}>
          <Icon name="arrow" size={13} style={{ transform: "rotate(180deg)" }} /> Back
        </button>
      </div>
    </div>
  );
}

// ============================================================
// WAITER LOGIN (PIN)
// ============================================================
function WaiterLogin({ state, pin, setPin, onSuccess, setView }) {
  const [error, setError] = useState(false);

  const press = (k) => {
    if (k === "del") { setPin(p => p.slice(0, -1)); setError(false); return; }
    if (pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 4) {
      const user = state.users.find(u => u.pin === next && u.role === "WAITER");
      if (user) { setError(false); setTimeout(() => onSuccess(user), 200); }
      else { setError(true); setTimeout(() => { setPin(""); setError(false); }, 1000); }
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0b0f" }}>
      <div style={{ width: 320 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div className="logo-icon" style={{ width: 48, height: 48, fontSize: 24, margin: "0 auto 16px" }}>⚡</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#f1f5f9", marginBottom: 4 }}>Acceso Meseros</div>
          <div style={{ fontSize: 13, color: "#4b5563" }}>Ingresa tu PIN de 4 dígitos</div>
        </div>

        <div className="pin-display">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`pin-dot ${i < pin.length ? "filled" : ""}`} style={error ? { borderColor: "#ef4444", background: i < pin.length ? "#ef4444" : "transparent" } : {}} />
          ))}
        </div>
        {error && <div style={{ textAlign: "center", color: "#ef4444", fontSize: 12, marginBottom: 8 }}>PIN Incorrecto</div>}

        <div className="pin-grid" style={{ marginBottom: 16 }}>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k, i) => (
            k === "" ? <div key={i} /> :
              <button key={i} className={`pin-key ${k === "del" ? "delete" : ""}`} onClick={() => press(k)}>
                {k === "del" ? "⌫" : k}
              </button>
          ))}
        </div>

        <button className="btn btn-ghost w-full" onClick={() => setView("landing")} style={{ justifyContent: "center" }}>
          <Icon name="arrow" size={13} style={{ transform: "rotate(180deg)" }} /> Back
        </button>
      </div>
    </div>
  );
}

// ============================================================
// WAITER INTERFACE
// ============================================================
function WaiterInterface({ state, dispatch, waiter, tableId, setTableId, setView, reset }) {
  const [step, setStep] = useState("select-table"); // select-table | select-product | assign-customer
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [billingMode, setBillingMode] = useState("split");
  const [filterCat, setFilterCat] = useState("All");

  const table = tableId ? state.tables.find(t => t.id === tableId) : null;
  const sessions = tableId ? state.customerSessions.filter(cs => cs.tableId === tableId) : [];
  const order = tableId ? state.orders.find(o => o.tableId === tableId && o.status === "open") : null;
  const orderItems = order ? state.orderItems.filter(i => i.orderId === order.id) : [];

  const myTables = state.tables.filter(t => t.restaurantId === waiter?.restaurantId);
  const myProducts = state.products.filter(p => p.restaurantId === waiter?.restaurantId);

  const categories = ["All", ...new Set(myProducts.filter(p => p.active).map(p => p.category))];
  const products = myProducts.filter(p => p.active && (filterCat === "All" || p.category === filterCat));

  const addItem = () => {
    if (!selectedProduct || !selectedCustomer) return;
    dispatch({ type: "ADD_ORDER_ITEM", payload: { tableId, productId: selectedProduct.id, assignedTo: selectedCustomer, price: selectedProduct.price } });
    setStep("select-product");
    setSelectedProduct(null);
    setSelectedCustomer(null);
  };

  const selectTable = (t) => {
    setTableId(t.id);
    if (!t.waiterId) dispatch({ type: "CLAIM_TABLE", payload: { tableId: t.id, waiterId: waiter.id } });
    setStep("select-product");
  };

  if (step === "select-table") {
    return (
      <div className="mobile-shell">
        <div className="mobile-header">
          <div className="mobile-title">Seleccionar Mesa</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={reset}><Icon name="refresh" size={12} /> Reset</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setView("landing")}><Icon name="logout" size={13} /></button>
          </div>
        </div>
        <div className="mobile-body">
          <div style={{ marginBottom: 12, fontSize: 13, color: "#4b5563" }}>Logged in as <strong style={{ color: "#e2e8f0" }}>{waiter?.name}</strong></div>
          {myTables.length === 0
            ? <div className="empty-state"><div className="empty-icon">🪑</div><div className="empty-title">No hay mesas configuradas</div><div className="empty-sub">Agrega mesas en el panel</div></div>
            : <div className="table-grid">
              {myTables.map(t => (
                <div key={t.id} className={`table-tile ${t.status === "ocupada" ? "ocupada" : ""}`} onClick={() => selectTable(t)}>
                  <div className="table-tile-name">{t.name}</div>
                  <span className={`badge ${t.status === "ocupada" ? "badge-green" : "badge-gray"}`} style={{ display: "inline-block" }}>{t.status}</span>
                  {t.status === "ocupada" && (
                    <div style={{ fontSize: 11, color: "#4b5563", marginTop: 6 }}>
                      {state.customerSessions.filter(cs => cs.tableId === t.id).length} guests
                    </div>
                  )}
                </div>
              ))}
            </div>
          }
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-shell">
      <div className="mobile-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => { setStep("select-table"); setTableId(null); }}>
            <Icon name="arrow" size={15} style={{ transform: "rotate(180deg)" }} />
          </button>
          <div>
            <div className="mobile-title">{table?.name}</div>
            <div style={{ fontSize: 11, color: "#4b5563" }}>{sessions.length} personas · {orderItems.length} items</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => {
            dispatch({ type: "CLOSE_TABLE", payload: { tableId } });
            setTableId(null);
            setStep("select-table");
          }}><Icon name="check" size={12} /> Free Table</button>
        </div>
      </div>

      <div className="mobile-body">
        {sessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <div className="empty-title">Esperando clientes...</div>
            <div className="empty-sub">Los clientes pueden unirse desde la vista de Comensal</div>
          </div>
        ) : (
          <>
            {/* ORDER SUMMARY */}
            {orderItems.length > 0 && (
              <div className="card mb-4">
                <div className="card-header" style={{ paddingBottom: 12 }}>
                  <span className="card-title">Orden Actual</span>
                  <div className="tabs" style={{ margin: 0, width: "auto" }}>
                    <button className={`tab ${billingMode === "split" ? "active" : ""}`} onClick={() => setBillingMode("split")} style={{ padding: "5px 12px" }}>Dividida</button>
                    <button className={`tab ${billingMode === "joint" ? "active" : ""}`} onClick={() => setBillingMode("joint")} style={{ padding: "5px 12px" }}>Junta</button>
                  </div>
                </div>
                <div className="card-body" style={{ paddingTop: 12, paddingBottom: 12 }}>
                  <BillView state={state} orderItems={orderItems} sessions={sessions} mode={billingMode} showPay={false} />
                </div>
              </div>
            )}

            {/* STEP: SELECT PRODUCT */}
            {step === "select-product" && (
              <div className="order-step">
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 10 }}>Agregar Artículo</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {categories.map(c => (
                      <button key={c} className={`btn btn-sm ${filterCat === c ? "btn-primary" : "btn-secondary"}`} onClick={() => setFilterCat(c)}>{c}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {products.map(p => (
                    <div key={p.id} className={`product-card ${selectedProduct?.id === p.id ? "selected" : ""}`} onClick={() => { setSelectedProduct(p); setStep("assign-customer"); }}>
                      <div className="product-name">{p.name}</div>
                      <div className="product-price">${p.price.toFixed(2)}</div>
                      <div className="product-cat">{p.category}</div>
                    </div>
                  ))}
                </div>
                {products.length === 0 && <div className="empty-state"><div className="empty-title">Sin artículos</div><div className="empty-sub">No hay productos en esta categoría</div></div>}
              </div>
            )}

            {/* STEP: ASSIGN CUSTOMER */}
            {step === "assign-customer" && selectedProduct && (
              <div className="order-step card">
                <div className="card-header">
                  <div>
                    <div style={{ fontSize: 13, color: "#4b5563", marginBottom: 2 }}>Agregando a la orden</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>{selectedProduct.name}</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "var(--primary)" }}>${selectedProduct.price.toFixed(2)}</div>
                  </div>
                  <button className="btn btn-ghost btn-icon" onClick={() => { setStep("select-product"); setSelectedProduct(null); }}>
                    <Icon name="x" size={14} />
                  </button>
                </div>
                <div className="card-body">
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#6b7280", marginBottom: 12 }}>¿Para quién es esto?</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {sessions.map(cs => (
                      <div key={cs.id} className={`customer-chip ${selectedCustomer === cs.id ? "selected" : ""}`} onClick={() => setSelectedCustomer(cs.id)}>
                        <div className="customer-avatar">{cs.name[0]}</div>
                        {cs.name}
                        {selectedCustomer === cs.id && <Icon name="check" size={14} style={{ marginLeft: "auto", color: "var(--primary)" }} />}
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-primary w-full mt-4" style={{ justifyContent: "center" }} onClick={addItem} disabled={!selectedCustomer}>
                    <Icon name="plus" size={14} /> Add to Order
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// CUSTOMER INTERFACE
// ============================================================
function CustomerInterface({ state, dispatch, session, setSession, setView }) {
  const [joinForm, setJoinForm] = useState({ name: "", tableId: state.tables.find(t => t.status === "ocupada")?.id || state.tables[0]?.id || "" });
  const [tab, setTab] = useState("mine");

  if (!session) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 360 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg, var(--primary), var(--primary-hover))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 16px", boxShadow: "0 8px 32px var(--primary-border-soft)" }}>⚡</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Únete a tu Mesa</div>
            <div style={{ fontSize: 14, color: "#64748b" }}>Ingresa tu nombre para ver tu cuenta</div>
          </div>

          <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e2e8f0", padding: 28, boxShadow: "0 4px 32px rgba(0,0,0,0.06)" }}>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6, display: "block" }}>Tu Nombre</label>
              <input
                style={{ background: "#f8fafc", color: "#0f172a", borderColor: "#e2e8f0" }}
                value={joinForm.name}
                onChange={e => setJoinForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Alice, Bob..."
                onKeyDown={e => e.key === "Enter" && joinTable()}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6, display: "block" }}>Seleccionar Mesa</label>
              <select style={{ background: "#f8fafc", color: "#0f172a", borderColor: "#e2e8f0" }} value={joinForm.tableId} onChange={e => setJoinForm(f => ({ ...f, tableId: e.target.value }))}>
                {state.tables.map(t => <option key={t.id} value={t.id}>{t.name} ({t.status})</option>)}
              </select>
            </div>
            <button className="btn btn-primary w-full btn-lg" style={{ justifyContent: "center" }} onClick={joinTable}>
              Join Table
            </button>
          </div>

          <button className="btn btn-ghost w-full mt-4" style={{ justifyContent: "center", color: "#64748b" }} onClick={() => setView("landing")}>
            ← Back
          </button>
        </div>
      </div>
    );

    function joinTable() {
      if (!joinForm.name.trim() || !joinForm.tableId) return;
      dispatch({ type: "JOIN_TABLE", payload: { tableId: joinForm.tableId, name: joinForm.name.trim() } });
      const cs = state.customerSessions.find(cs => cs.tableId === joinForm.tableId && cs.name.toLowerCase() === joinForm.name.trim().toLowerCase())
        || { id: "pending", tableId: joinForm.tableId, name: joinForm.name.trim() };
      // Find or create session after dispatch
      setTimeout(() => {
        const found = state.customerSessions.find(s => s.tableId === joinForm.tableId && s.name.toLowerCase() === joinForm.name.trim().toLowerCase());
        setSession({ tableId: joinForm.tableId, name: joinForm.name.trim() });
      }, 50);
    }
  }

  // Find session
  const cs = session && state.customerSessions.find(s => s.tableId === session.tableId && s.name.toLowerCase() === session.name.toLowerCase());
  const order = session && state.orders.find(o => o.tableId === session.tableId && o.status === "open");
  const allItems = order ? state.orderItems.filter(i => i.orderId === order.id) : [];
  const myItems = cs ? allItems.filter(i => i.assignedTo === cs.id) : [];
  const sessions = session ? state.customerSessions.filter(s => s.tableId === session.tableId) : [];

  const myTotal = myItems.filter(i => i.status !== "paid").reduce((s, i) => s + i.price, 0);
  const tableObj = state.tables.find(t => t.id === session?.tableId);
  const restaurantObj = state.restaurants.find(r => r.id === tableObj?.restaurantId) || {};
  const taxRate = restaurantObj.taxRate || 0.08;
  const myTotalWithTax = myTotal * (1 + taxRate);

  const payMyPart = () => {
    const unpaid = myItems.filter(i => i.status !== "paid").map(i => i.id);
    if (unpaid.length > 0) dispatch({ type: "MARK_PAID", payload: unpaid });
  };

  const allPaid = myItems.length > 0 && myItems.every(i => i.status === "paid");

  // Light theme for customer view
  const lightCard = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" };
  const lightText = { color: "#0f172a" };

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>Hi, {session.name}!</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{state.tables.find(t => t.id === session.tableId)?.name}</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setSession(null)} style={{ color: "#64748b", borderColor: "#e2e8f0", background: "#f8fafc" }}>Salir</button>
      </div>

      <div style={{ padding: "16px 20px 0" }}>
        <div style={{ display: "flex", background: "#e2e8f0", borderRadius: 10, padding: 3, marginBottom: 16 }}>
          {["mine", "table"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none", transition: "all 150ms", background: tab === t ? "#fff" : "transparent", color: tab === t ? "var(--primary)" : "#64748b", boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none", fontFamily: "inherit" }}>
              {t === "mine" ? "Mis Artículos" : "Cuenta de la Mesa"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, padding: "0 20px 100px", overflowY: "auto" }}>
        {tab === "mine" && (
          <div>
            {myItems.length === 0
              ? <div style={{ textAlign: "center", padding: "56px 0", color: "#94a3b8" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🍽️</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: "#475569", marginBottom: 4 }}>No artículos yet</div>
                <div style={{ fontSize: 13 }}>Your waiter will assign artículos to you</div>
              </div>
              : <div style={lightCard}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 4 }}>Mi Cuenta</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.8px" }}>${myTotalWithTax.toFixed(2)}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>incl. {(taxRate * 100).toFixed(0)}% tax</div>
                </div>
                <div style={{ padding: "12px 20px" }}>
                  {myItems.map(item => {
                    const p = state.products.find(p => p.id === item.productId);
                    return (
                      <div key={item.id} className={`bill-item ${item.status === "paid" ? "paid" : ""}`} style={{ color: "#0f172a" }}>
                        <div style={{ fontSize: 14, color: item.status === "paid" ? "#94a3b8" : "#1e293b" }}>{p?.name}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {item.status === "paid" && <span style={{ fontSize: 11, color: "var(--text-green)", fontWeight: 500 }}>PAID</span>}
                          <span style={{ fontSize: 14, fontWeight: 500, color: item.status === "paid" ? "#94a3b8" : "#0f172a" }}>${item.price.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            }
          </div>
        )}

        {tab === "table" && (
          <div style={lightCard}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 4 }}>Total de la Mesa</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.8px" }}>${(allItems.filter(i => i.status !== "paid").reduce((s, i) => s + i.price, 0) * (1 + taxRate)).toFixed(2)}</div>
            </div>
            <div style={{ padding: "12px 20px" }}>
              {sessions.map(s => {
                const sItems = allItems.filter(i => i.assignedTo === s.id);
                const sTotal = sItems.filter(i => i.status !== "paid").reduce((sum, i) => sum + i.price, 0);
                return (
                  <div key={s.id} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: s.name === session.name ? "linear-gradient(135deg, var(--primary), var(--primary-hover))" : "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: s.name === session.name ? "#fff" : "#64748b" }}>{s.name[0]}</div>
                        <span style={{ fontSize: 14, fontWeight: 500, color: "#1e293b" }}>{s.name}{s.name === session.name && " (you)"}</span>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>${(sTotal * (1 + taxRate)).toFixed(2)}</span>
                    </div>
                    {sItems.map(item => {
                      const p = state.products.find(p => p.id === item.productId);
                      return (
                        <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0 6px 36px", borderBottom: "1px solid #f8fafc", opacity: item.status === "paid" ? 0.4 : 1 }}>
                          <span style={{ fontSize: 13, color: "#475569" }}>{p?.name}</span>
                          <span style={{ fontSize: 13, color: "#64748b" }}>${item.price.toFixed(2)}</span>
                        </div>
                      );
                    })}
                    {sItems.length === 0 && <div style={{ fontSize: 12, color: "#94a3b8", paddingLeft: 36 }}>No artículos yet</div>}
                  </div>
                );
              })}
              {sessions.length === 0 && <div style={{ textAlign: "center", padding: 24, color: "#94a3b8", fontSize: 13 }}>No personas yet</div>}
            </div>
          </div>
        )}
      </div>

      {tab === "mine" && myItems.filter(i => i.status !== "paid").length > 0 && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #e2e8f0", padding: "16px 20px" }}>
          <button
            onClick={payMyPart}
            style={{ width: "100%", padding: "14px", borderRadius: 12, background: "linear-gradient(135deg, var(--primary), var(--primary-hover))", color: "#fff", fontSize: 15, fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit", boxShadow: "0 4px 20px var(--primary-border-soft)" }}>
            <Icon name="dollar" size={16} color="#fff" />
            Pagar Mi Parte · ${myTotalWithTax.toFixed(2)}
          </button>
        </div>
      )}

      {allPaid && myItems.length > 0 && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #e2e8f0", padding: "16px 20px" }}>
          <div style={{ width: "100%", padding: 14, borderRadius: 12, background: "var(--text-green-bg)", border: "1px solid var(--text-green-border)", color: "var(--text-green)", fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Icon name="check" size={16} color="var(--text-green)" /> All paid — Enjoy!
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// BILL VIEW (shared)
// ============================================================
function BillView({ state, orderItems, sessions, mode, showPay, onPay }) {
  const products = useMemo(() => {
    const map = {};
    state.products.forEach(p => map[p.id] = p);
    return map;
  }, [state.products]);

  if (mode === "joint") {
    const total = orderItems.reduce((s, i) => s + i.price, 0);
    return (
      <div>
        {orderItems.length === 0
          ? <div className="empty-state" style={{ padding: 24 }}><div className="empty-title">No artículos yet</div></div>
          : orderItems.map(item => (
            <div key={item.id} className={`bill-item ${item.status === "paid" ? "paid" : ""}`}>
              <div>
                <div className="bill-item-name">{products[item.productId]?.name}</div>
                <div style={{ fontSize: 11, color: "#4b5563" }}>
                  → {sessions.find(s => s.id === item.assignedTo)?.name || "Unassigned"}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {item.status === "paid" && <span className="badge badge-green" style={{ fontSize: 10 }}>PAID</span>}
                <span className="bill-item-price">${item.price.toFixed(2)}</span>
              </div>
            </div>
          ))
        }
        {orderItems.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, marginTop: 6, borderTop: "1px solid #1e2130" }}>
            <span style={{ fontWeight: 600, color: "#e2e8f0" }}>Total</span>
            <span style={{ fontWeight: 600, color: "var(--primary)", fontSize: 16 }}>${total.toFixed(2)}</span>
          </div>
        )}
      </div>
    );
  }

  // Dividida mode
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {sessions.map(s => {
        const sItems = orderItems.filter(i => i.assignedTo === s.id);
        const sTotal = sItems.reduce((sum, i) => sum + i.price, 0);
        return (
          <div key={s.id} style={{ background: "#131622", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: sItems.length > 0 ? "1px solid #1e2130" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="customer-avatar">{s.name[0]}</div>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#e2e8f0" }}>{s.name}</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--primary)" }}>${sTotal.toFixed(2)}</span>
            </div>
            <div style={{ padding: "0 14px" }}>
              {sItems.map(item => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #0d0f17", opacity: item.status === "paid" ? 0.4 : 1 }}>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>{products[item.productId]?.name}</span>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>${item.price.toFixed(2)}</span>
                </div>
              ))}
              {sItems.length === 0 && <div style={{ fontSize: 12, color: "#374151", padding: "8px 0" }}>No artículos yet</div>}
            </div>
          </div>
        );
      })}
      {sessions.length === 0 && <div className="empty-state" style={{ padding: 24 }}><div className="empty-title">No personas at this table</div></div>}
    </div>
  );
}
