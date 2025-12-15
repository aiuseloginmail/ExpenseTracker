// =================================================================
// FIREBASE SETUP & INITIALIZATION
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
  updateDoc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// =================================================================
// FIREBASE CONFIG
// =================================================================
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
// GLOBAL STATE
// =================================================================
let currentUserId = null;
let transactions = [];
let unsubscribeSnapshot = null;

let filterFromDate = null;
let filterToDate = null;

let isIncome = true;
let editingId = null;
let amount = "";

// =================================================================
// AUTH UI
// =================================================================
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const googleLoginBtn = document.getElementById("googleLoginBtn");

// Email login
loginBtn.onclick = async () => {
  try {
    await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
  } catch (e) {
    alert(e.message);
  }
};

// Signup
signupBtn.onclick = async () => {
  try {
    await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
  } catch (e) {
    alert(e.message);
  }
};

// =================================================================
// GOOGLE LOGIN
// =================================================================
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

let googlePopupInProgress = false;

googleLoginBtn.onclick = async () => {
  if (googlePopupInProgress) return;

  googlePopupInProgress = true;
  googleLoginBtn.disabled = true;

  try {
    await signInWithPopup(auth, googleProvider);
  } catch (e) {
    alert(e.message || "Google sign-in failed");
  } finally {
    googlePopupInProgress = false;
    googleLoginBtn.disabled = false;
  }
};

// =================================================================
// LOGOUT
// =================================================================
function setupLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.onclick = () => signOut(auth);
}

// =================================================================
// AUTH STATE HANDLER
// =================================================================
onAuthStateChanged(auth, user => {
  if (unsubscribeSnapshot) unsubscribeSnapshot();

  if (user) {
    currentUserId = user.uid;
    setupLogout();

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
// FIRESTORE LISTENER (FIXED)
// =================================================================
function startFirestoreListener() {
  if (unsubscribeSnapshot) unsubscribeSnapshot();

  let constraints = [
    where("userId", "==", currentUserId),
    orderBy("date", "desc")
  ];

  if (filterFromDate) constraints.push(where("date", ">=", filterFromDate));
  if (filterToDate) constraints.push(where("date", "<=", filterToDate));

  const q = query(collection(db, "expenses"), ...constraints);

  unsubscribeSnapshot = onSnapshot(q, snap => {
    transactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderSummary();
    renderList();
  });
}

// =================================================================
// FILTER MODAL
// =================================================================
document.getElementById("filterBtn")?.onclick = () =>
  document.getElementById("filterModal").classList.remove("hidden");

document.getElementById("applyFilter")?.onclick = () => {
  const fromVal = document.getElementById("fromDate").value;
  const toVal = document.getElementById("toDate").value;

  filterFromDate = fromVal
    ? Timestamp.fromDate(new Date(fromVal))
    : null;

  filterToDate = toVal
    ? Timestamp.fromDate(new Date(toVal + "T23:59:59"))
    : null;

  document.getElementById("filterModal").classList.add("hidden");
  startFirestoreListener();
};

document.getElementById("clearFilter")?.onclick = () => {
  filterFromDate = null;
  filterToDate = null;
  document.getElementById("fromDate").value = "";
  document.getElementById("toDate").value = "";
  document.getElementById("filterModal").classList.add("hidden");
  startFirestoreListener();
};

// =================================================================
// UI ELEMENTS
// =================================================================
const list = document.getElementById("transactionList");
const emptyState = document.getElementById("emptyState");
const amountDisplay = document.getElementById("amountDisplay");
const descInput = document.getElementById("descriptionInput");
const toggleBg = document.getElementById("toggleBg");

// =================================================================
// RENDER SUMMARY
// =================================================================
function renderSummary() {
  let income = 0, expense = 0;
  transactions.forEach(t =>
    t.type === "income" ? income += t.amount : expense += t.amount
  );

  document.getElementById("totalIncome").textContent = `₹${income}`;
  document.getElementById("totalExpense").textContent = `₹${expense}`;
  document.getElementById("totalBalance").textContent = `₹${income - expense}`;
}

// =================================================================
// RENDER LIST
// =================================================================
function renderList() {
  list.innerHTML = "";
  emptyState.classList.toggle("hidden", transactions.length !== 0);

  transactions.forEach(t => {
    const row = document.createElement("div");
    const date = t.date.toDate();

    row.className = "bg-white p-3 rounded-xl shadow flex justify-between items-center";
    row.innerHTML = `
      <div>
        <p class="font-semibold">${t.description}</p>
        <p class="text-xs text-slate-400">${date.toLocaleString()}</p>
      </div>
      <p class="${t.type === "income" ? "text-emerald-500" : "text-rose-500"} font-semibold">
        ${t.type === "income" ? "+" : "-"}₹${t.amount}
      </p>
    `;
    list.appendChild(row);
  });
}

// =================================================================
// MODAL + NUMPAD (FIXED)
// =================================================================
document.getElementById("fab").onclick = () =>
  document.getElementById("transactionModal").classList.remove("hidden");

document.getElementById("closeModal").onclick = closeModal;

function closeModal() {
  document.getElementById("transactionModal").classList.add("hidden");
  amount = "";
  amountDisplay.textContent = "0";
  descInput.value = "";
  editingId = null;
  isIncome = true;
  toggleBg.className = "toggle-bg income";
}

// Numpad fix
document.querySelectorAll(".num").forEach(btn => {
  btn.onclick = () => {
    if (btn.textContent === "." && amount.includes(".")) return;
    if (amount.includes(".") && amount.split(".")[1]?.length >= 2) return;
    amount += btn.textContent;
    amountDisplay.textContent = amount;
  };
});

document.getElementById("backspace").onclick = () => {
  amount = amount.slice(0, -1);
  amountDisplay.textContent = amount || "0";
};

document.getElementById("incomeBtn").onclick = () => {
  isIncome = true;
  toggleBg.className = "toggle-bg income";
};

document.getElementById("expenseBtn").onclick = () => {
  isIncome = false;
  toggleBg.className = "toggle-bg expense";
};

// =================================================================
// SAVE TRANSACTION (FIXED)
// =================================================================
document.getElementById("saveTransaction").onclick = async () => {
  const value = parseFloat(amount);

  if (isNaN(value) || value <= 0 || !descInput.value.trim()) {
    alert("Enter valid amount and description");
    return;
  }

  const data = {
    userId: currentUserId,
    amount: value,
    description: descInput.value.trim(),
    type: isIncome ? "income" : "expense",
    date: Timestamp.now()
  };

  await addDoc(collection(db, "expenses"), data);
  closeModal();
};
