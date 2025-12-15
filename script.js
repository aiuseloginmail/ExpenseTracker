// ================================================================
// FIREBASE SETUP
// ================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
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
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ================================================================
// CONFIG
// ================================================================
const firebaseConfig = {
  apiKey: "AIzaSyAQhPbt_oQj3_zNntl6U6VPnzpCnSygDDg",
  authDomain: "expense-tracker-28379.firebaseapp.com",
  projectId: "expense-tracker-28379"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ================================================================
// DOM ELEMENTS (DECLARE FIRST)
// ================================================================
const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");

const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const filterBtn = document.getElementById("filterBtn");
const filterModal = document.getElementById("filterModal");
const applyFilterBtn = document.getElementById("applyFilter");
const clearFilterBtn = document.getElementById("clearFilter");

const list = document.getElementById("transactionList");
const emptyState = document.getElementById("emptyState");
const totalIncomeEl = document.getElementById("totalIncome");
const totalExpenseEl = document.getElementById("totalExpense");
const totalBalanceEl = document.getElementById("totalBalance");

const fab = document.getElementById("fab");
const modal = document.getElementById("transactionModal");
const closeModalBtn = document.getElementById("closeModal");
const amountDisplay = document.getElementById("amountDisplay");
const descInput = document.getElementById("descriptionInput");
const backspaceBtn = document.getElementById("backspace");
const incomeBtn = document.getElementById("incomeBtn");
const expenseBtn = document.getElementById("expenseBtn");
const toggleBg = document.getElementById("toggleBg");
const saveBtn = document.getElementById("saveTransaction");

// ================================================================
// STATE
// ================================================================
let currentUserId = null;
let unsubscribeSnapshot = null;
let transactions = [];
let amount = "";
let isIncome = true;
let filterFromDate = null;
let filterToDate = null;

// ================================================================
// AUTH HANDLERS (SAFE)
// ================================================================
if (loginBtn) {
  loginBtn.onclick = () =>
    signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
      .catch(e => alert(e.message));
}

if (signupBtn) {
  signupBtn.onclick = () =>
    createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
      .catch(e => alert(e.message));
}

if (googleLoginBtn) {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  googleLoginBtn.onclick = () =>
    signInWithPopup(auth, provider)
      .catch(e => alert(e.message));
}

if (logoutBtn) {
  logoutBtn.onclick = () => signOut(auth);
}

// ================================================================
// AUTH STATE
// ================================================================
onAuthStateChanged(auth, user => {
  if (unsubscribeSnapshot) unsubscribeSnapshot();

  if (user) {
    currentUserId = user.uid;
    authSection.classList.add("hidden");
    appSection.classList.remove("hidden");
    startListener();
  } else {
    authSection.classList.remove("hidden");
    appSection.classList.add("hidden");
  }
});

// ================================================================
// FIRESTORE
// ================================================================
function startListener() {
  if (!currentUserId) return;
  if (unsubscribeSnapshot) unsubscribeSnapshot();

  const q = query(
    collection(db, "expenses"),
    where("userId", "==", currentUserId),
    orderBy("date", "desc")
  );

  unsubscribeSnapshot = onSnapshot(q, snap => {
    transactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  });
}

// ================================================================
// FILTERS (SAFE)
// ================================================================
if (filterBtn && filterModal) {
  filterBtn.onclick = () => filterModal.classList.remove("hidden");
}

if (applyFilterBtn) {
  applyFilterBtn.onclick = () => {
    const from = document.getElementById("fromDate").value;
    const to = document.getElementById("toDate").value;

    filterFromDate = from ? Timestamp.fromDate(new Date(from)) : null;
    filterToDate = to ? Timestamp.fromDate(new Date(to + "T23:59:59")) : null;

    filterModal.classList.add("hidden");
    startListener();
  };
}

if (clearFilterBtn) {
  clearFilterBtn.onclick = () => {
    filterFromDate = null;
    filterToDate = null;
    filterModal.classList.add("hidden");
    startListener();
  };
}

// ================================================================
// RENDER (SAFE)
// ================================================================
function render() {
  if (!list) return;

  list.innerHTML = "";
  let income = 0, expense = 0;

  if (transactions.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  transactions.forEach(t => {
    t.type === "income" ? income += t.amount : expense += t.amount;

    const row = document.createElement("div");
    row.className = "bg-white p-3 rounded-xl shadow flex justify-between";

    row.innerHTML = `
      <div>
        <p class="font-semibold">${t.description}</p>
        <p class="text-xs text-slate-400">${t.date.toDate().toLocaleString()}</p>
      </div>
      <p class="${t.type === "income" ? "text-emerald-500" : "text-rose-500"} font-semibold">
        ${t.type === "income" ? "+" : "-"}₹${t.amount}
      </p>
    `;

    list.appendChild(row);
  });

  totalIncomeEl.textContent = `₹${income}`;
  totalExpenseEl.textContent = `₹${expense}`;
  totalBalanceEl.textContent = `₹${income - expense}`;
}

// ================================================================
// MODAL + SAVE
// ================================================================
if (fab && modal) fab.onclick = () => modal.classList.remove("hidden");
if (closeModalBtn && modal) closeModalBtn.onclick = () => modal.classList.add("hidden");

document.querySelectorAll(".num").forEach(btn => {
  btn.onclick = () => {
    if (btn.textContent === "." && amount.includes(".")) return;
    amount += btn.textContent;
    amountDisplay.textContent = amount;
  };
});

if (backspaceBtn) {
  backspaceBtn.onclick = () => {
    amount = amount.slice(0, -1);
    amountDisplay.textContent = amount || "0";
  };
}

if (incomeBtn) incomeBtn.onclick = () => {
  isIncome = true;
  toggleBg.className = "toggle-bg income";
};

if (expenseBtn) expenseBtn.onclick = () => {
  isIncome = false;
  toggleBg.className = "toggle-bg expense";
};

if (saveBtn) {
  saveBtn.onclick = async () => {
    const value = parseFloat(amount);
    if (isNaN(value) || !descInput.value.trim()) return;

    await addDoc(collection(db, "expenses"), {
      userId: currentUserId,
      amount: value,
      description: descInput.value.trim(),
      type: isIncome ? "income" : "expense",
      date: Timestamp.now()
    });

    modal.classList.add("hidden");
    amount = "";
    amountDisplay.textContent = "0";
    descInput.value = "";
  };
}
