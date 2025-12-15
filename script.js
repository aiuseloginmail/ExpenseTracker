// =================================================================
// 1. FIREBASE SETUP & INITIALIZATION
// =================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  deleteDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAQhPbt_oQj3_zNntl6U6VPnzpCnSygDDg",
  authDomain: "expense-tracker-28379.firebaseapp.com",
  projectId: "expense-tracker-28379",
  storageBucket: "expense-tracker-28379.firebasestorage.app",
  messagingSenderId: "469399193874",
  appId: "1:469399193874:web:753c79b5d2455d1fd2cbcb",
  measurementId: "G-M3XP8SJWL5"
};

const app = initializeApp(firebaseConfig);
getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// =================================================================
// AUTH UI
// =================================================================
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const googleLoginBtn = document.getElementById("googleLoginBtn");

loginBtn.onclick = async () => {
  try {
    await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
  } catch (e) {
    alert(e.message);
  }
};

signupBtn.onclick = async () => {
  try {
    await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
  } catch (e) {
    alert(e.message);
  }
};

// Google login (force account chooser)
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

googleLoginBtn.onclick = async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (e) {
    console.error("Google sign-in error:", e);
    alert(e.message || "Google sign-in failed");
  }
};

// =================================================================
// LOGOUT + AUTO LOGOUT
// =================================================================
function setupLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) return;
  logoutBtn.onclick = () => signOut(auth);
}

let inactivityTimer;
const AUTO_LOGOUT_TIME = 10 * 60 * 1000;

function resetInactivityTimer() {
  if (!currentUserId) return;
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    signOut(auth);
    alert("Logged out due to inactivity");
  }, AUTO_LOGOUT_TIME);
}

function setupAutoLogout() {
  ["click", "mousemove", "keydown", "touchstart"].forEach(evt =>
    document.addEventListener(evt, resetInactivityTimer)
  );
}

document.addEventListener("DOMContentLoaded", () => {
  setupLogout();
  setupAutoLogout();
});

// =================================================================
// GLOBAL STATE
// =================================================================
let currentUserId = null;
let transactions = [];
let unsubscribeSnapshot = null;

// 🔥 FILTER STATE
let filterFromDate = null;
let filterToDate = null;

// =================================================================
// AUTH STATE HANDLER
// =================================================================
onAuthStateChanged(auth, (user) => {
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }

  if (user) {
    currentUserId = user.uid;
    resetInactivityTimer();

    document.getElementById("authSection").classList.add("hidden");
    document.getElementById("appSection").classList.remove("hidden");

    startFirestoreListener();
  } else {
    currentUserId = null;

    document.getElementById("authSection").classList.remove("hidden");
    document.getElementById("appSection").classList.add("hidden");
  }
});

// =================================================================
// FIRESTORE LISTENER WITH DATE FILTER
// =================================================================
function startFirestoreListener() {
  if (!currentUserId) return;

  if (unsubscribeSnapshot) unsubscribeSnapshot();

  let constraints = [
    where("userId", "==", currentUserId),
    orderBy("date", "desc")
  ];

  if (filterFromDate) {
    constraints.push(where("date", ">=", filterFromDate));
  }

  if (filterToDate) {
    constraints.push(where("date", "<=", filterToDate));
  }

  const q = query(collection(db, "expenses"), ...constraints);

  unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
    transactions = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderSummary();
    renderList();
  });
}

// =================================================================
// FILTER MODAL LOGIC
// =================================================================
const filterModal = document.getElementById("filterModal");
const filterBtn = document.getElementById("filterBtn");

if (filterBtn) {
  filterBtn.onclick = () => filterModal.classList.remove("hidden");
}

document.getElementById("applyFilter")?.addEventListener("click", () => {
  const fromVal = document.getElementById("fromDate").value;
  const toVal = document.getElementById("toDate").value;

  filterFromDate = fromVal ? new Date(fromVal) : null;
  filterToDate = toVal ? new Date(toVal + "T23:59:59") : null;

  filterModal.classList.add("hidden");
  startFirestoreListener();
});

document.getElementById("clearFilter")?.addEventListener("click", () => {
  filterFromDate = null;
  filterToDate = null;

  document.getElementById("fromDate").value = "";
  document.getElementById("toDate").value = "";

  filterModal.classList.add("hidden");
  startFirestoreListener();
});

// =================================================================
// UI + CORE LOGIC (UNCHANGED)
// =================================================================
const list = document.getElementById("transactionList");
const emptyState = document.getElementById("emptyState");
const amountDisplay = document.getElementById("amountDisplay");
const descInput = document.getElementById("descriptionInput");
const toggleBg = document.getElementById("toggleBg");
const suggestionsContainer = document.getElementById("suggestions");

const DEFAULT_DESCRIPTIONS = ["Salary", "Food", "Auto", "Bus", "Train", "School Fee", "Medicine"];

let isIncome = true;
let editingId = null;
let amount = "";

function formatCurrency(v) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(v);
}

function renderSummary() {
  let income = 0, expense = 0;
  transactions.forEach(t => t.type === "income" ? income += t.amount : expense += t.amount);
  document.getElementById("totalIncome").textContent = formatCurrency(income);
  document.getElementById("totalExpense").textContent = formatCurrency(expense);
  document.getElementById("totalBalance").textContent = formatCurrency(income - expense);
}

function editTransaction(t) {
  editingId = t.id;
  amount = t.amount.toString();
  amountDisplay.textContent = amount;
  descInput.value = t.description;
  isIncome = t.type === "income";
  toggleBg.className = `toggle-bg ${isIncome ? "income" : "expense"}`;
  openModal();
}
/* Delete Transaction - Firestore */
async function deleteTransaction(id) {
  if (!currentUserId) return;

  const confirmDelete = confirm("Delete this transaction?");
  if (!confirmDelete) return;

  try {
    await deleteDoc(doc(db, "expenses", id));
    console.log("Document successfully deleted:", id);
    // UI auto-updates via Firestore listener
  } catch (error) {
    console.error("Error deleting document:", error);
    alert("Failed to delete transaction");
  }
}

function renderList() {
  list.innerHTML = "";
  if (!transactions.length) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  transactions.forEach(t => {
    const row = document.createElement("div");
    const date = t.date?.toDate ? t.date.toDate() : new Date(t.date);

    row.className = "bg-white p-3 rounded-xl shadow flex justify-between items-center";
    row.innerHTML = `
      <div>
        <p class="font-semibold">${t.description}</p>
        <p class="text-xs text-slate-400">${date.toLocaleString()}</p>
      </div>
      <div class="flex items-center gap-3">
        <p class="${t.type === "income" ? "text-emerald-500" : "text-rose-500"} font-semibold">
          ${t.type === "income" ? "+" : "-"}${formatCurrency(t.amount)}
        </p>
        <button class="edit-btn">✏️</button>
        <button class="delete-btn">🗑️</button>
      </div>
    `;

    row.querySelector(".edit-btn").onclick = () => editTransaction(t);
    row.querySelector(".delete-btn").onclick = () => deleteTransaction(t.id);
    list.appendChild(row);
  });
}

function renderSuggestions() {
  suggestionsContainer.innerHTML = "";
  DEFAULT_DESCRIPTIONS.forEach(text => {
    const chip = document.createElement("button");
    chip.className = "px-3 py-1 rounded-full bg-slate-200 text-sm";
    chip.textContent = text;
    chip.onclick = () => descInput.value = text;
    suggestionsContainer.appendChild(chip);
  });
}

renderSuggestions();

// (Remaining CRUD, modal, numpad, toggle, save logic

