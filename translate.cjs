const fs = require('fs');

const path = "c:/Users/marce/Documents/Restaurant/KEIFOOD/KEIFKEIFOOD
let content = fs.readFileSync(path, 'utf8');

const translations = {
  // Landing
  "Real-time split billing for modern restaurants. Choose your role to get started.": "Facturación dividida en tiempo real para restaurantes modernos. Elige tu rol para comenzar.",
  "Manage menu, tables & staff": "Gestiona menú, mesas y personal",
  "Take orders & assign items": "Toma órdenes y asigna platillos",
  "Join table & pay your part": "Únete a la mesa y paga tu parte",
  "App Creator": "Creador de App",
  "Manage linked restaurants": "Gestiona restaurantes vinculados",
  "Reset Demo": "Reiniciar Demo",
  "Demo PINs:": "PINs de Demo:",
  "Enter Admin PIN": "Ingresar PIN de Administrador",
  "Incorrect PIN": "PIN Incorrecto",
  "Back": "Volver",
  "Enter your 4-digit PIN": "Ingresa tu PIN de 4 dígitos",
  "Waiter Login": "Acceso Meseros",
  "Creator Admin": "Admin Creador",
  "Platform": "Plataforma",
  "Restaurants Network": "Red de Restaurantes",
  "Manage multi-tenancy": "Gestión multi-restaurante",
  "New Restaurant": "Nuevo Restaurante",
  "Restaurant Name": "Nombre Restaurante",
  "Admin Name": "Nombre Administrador",
  "Admin PIN": "PIN Administrador",
  "Cancel": "Cancelar",
  "Register Restaurant": "Registrar Restaurante",
  "Restaurant": "Restaurante",

  // Admin Sidebar
  "Dashboard": "Panel",
  "Menu Items": "Menú",
  "Tables": "Mesas",
  "Staff": "Personal",
  "Logout": "Salir",

  // Admin Dashboard
  "Total Revenue": "Ingresos Totales",
  "Active Tables": "Mesas Activas",
  "Items Ordered": "Artículos Pedidos",
  "Open Orders": "Órdenes Abiertas",
  "Live orders": "Órdenes en vivo",
  "of": "de",
  "total": "total",
  "across all tables": "en todas las mesas",
  "being served now": "siendo atendidas",
  "Revenue by Item": "Ingresos por Artículo",
  "Revenue by Waiter": "Ingresos por Mesero",
  "No orders yet": "Aún no hay órdenes",
  "No waiter sales": "Sin ventas de meseros",

  // Tables
  "Table Management": "Gestión de Mesas",
  "Add Table": "Agregar Mesa",
  "Table Name": "Nombre de la Mesa",
  "Capacity": "Capacidad",
  "Name": "Nombre",
  "Status": "Estado",
  "Guests": "Invitados",
  "Current Bill": "Cuenta Actual",
  "Waiter": "Mesero",
  "available": "disponible",
  "occupied": "ocupada",
  "Close": "Cerrar",
  "No tables yet": "No hay mesas",
  "Add tables to get started": "Agrega mesas para comenzar",

  // Staff
  "Waiters": "Meseros",
  "Plus 1 admin account": "Más 1 cuenta de administrador",
  "Add Waiter": "Agregar Mesero",
  "Full Name": "Nombre Completo",
  "4-digit PIN": "PIN de 4 dígitos",
  "Role": "Rol",
  "Total Sales": "Ventas Totales",

  // Waiter Interface
  "Select Table": "Seleccionar Mesa",
  "Reset": "Reiniciar",
  "Logged in as": "Sesión iniciada como",
  "No tables configured": "No hay mesas configuradas",
  "Add tables in admin panel": "Agrega mesas en el panel",
  "guests": "personas",
  "items": "artículos",
  "Waiting for customers...": "Esperando clientes...",
  "Customers can join via the Customer view": "Los clientes pueden unirse desde la vista de Comensal",
  "Current Order": "Orden Actual",
  "Split": "Dividida",
  "Joint": "Junta",
  "Add Item": "Agregar Artículo",
  "No items": "Sin artículos",
  "No products in this category": "No hay productos en esta categoría",
  "Adding to order": "Agregando a la orden",
  "Who is this for?": "¿Para quién es esto?",
  "Add to Order": "Agregar a la Orden",
  "Free Table": "Liberar Mesa",

  // Customer Interface
  "Join Your Table": "Únete a tu Mesa",
  "Enter your name to see your bill": "Ingresa tu nombre para ver tu cuenta",
  "Your Name": "Tu Nombre",
  "Leave": "Salir",
  "My Items": "Mis Artículos",
  "Table Bill": "Cuenta de la Mesa",
  "No items yet": "Aún sin artículos",
  "Your waiter will assign items to you": "El mesero te asignará artículos",
  "My Bill": "Mi Cuenta",
  "incl.": "incluye",
  "tax": "impuesto",
  "Table Total": "Total de la Mesa",
  "you": "tú",
  "No guests yet": "No hay invitados",
  "Pay My Part": "Pagar Mi Parte",
  "All paid — Enjoy!": "Todo pagado — ¡Disfruta!"
};

for (const [en, es] of Object.entries(translations)) {
  // Global replace using split/join to avoid regex escaping hell, ignoring some specific code words if necessary
  content = content.split(`>${en}<`).join(`>${es}<`); // Replace typical text nodes
  content = content.split(`"${en}"`).join(`"${es}"`); // Replace strings and placeholders
  content = content.split(`'${en}'`).join(`'${es}'`); // Replace single quotes
  content = content.split(` ${en} `).join(` ${es} `); // Replace spaced nodes

  // Custom case handlers
  content = content.replace(new RegExp(`placeholder="${en}"`, 'g'), `placeholder="${es}"`);
  content = content.replace(new RegExp(`{${en}}`, 'g'), `{${es}}`);
  content = content.replace(/'admin-login'/g, "'admin-login'");
  content = content.replace(/'waiter-login'/g, "'waiter-login'");
}

// Special case text replacements:
content = content.replace(/>Admin Login</g, ">Acceso Administrador<");
content = content.replace(/>Waiter Login</g, ">Acceso Mesero<");
content = content.replace(/>Customer</g, ">Comensal<");
content = content.replace(/>Admin</g, ">Administrador<");
content = content.replace(/>App Creator Login</g, ">Acceso Creador<");
content = content.replace(/of \{state.tables.length\} total/g, "de {state.tables.length} en total");
content = content.replace(/across all tables/g, "en todas las mesas");

fs.writeFileSync(path, content, 'utf8');
console.log("Translation applied!");
