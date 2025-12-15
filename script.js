// ================================================================
// FIREBASE SETUP
// ================================================================
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

// ================================================================
// CONFIG
// ================================================================
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

// ================================================================
// GLOBAL STATE
// ================================================================
let currentUserId = null;
let unsubscribeSnapshot = null;
let transactions = [];

let filterFromDate = null;
let filterToDate = null;

let amount = "";
let isIncome = true;

// ================================================================
// AUTH ELEMENTS
// ================================================================
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const googleLoginBtn = document.getElementById("googleLoginBtn");

// ================================================================
// AUTH ACTIONS
// ================================================================
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

// ================================================================
// GOOGLE LOGIN
// ================================================================
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

googleLoginBtn.onclick = async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (e) {
    alert(e.message || "Google login failed");
  }
};

// ================================================================
// AUTH STATE
// ================================================================
onAuthStateChanged(auth, user => {
  if (unsubscribeSnapshot) unsubscribeSnapshot();

  if (user) {
    currentUserId = user.uid;
    document.getElementById("authSection").classList.add("hidden");
    document.getElementById("appSection").classList.remove("hidden");
    setupLogout();
    startListener();
  } else {
    currentUserId = null;
    document.getElementById("authSection").classList.remove("hidden");
    document.getElementById("appSection").classList.add("hidden");
  }
});

function setupLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.onclick = () => signOut(auth);
  }
}

// ================================================================
// FIRESTORE LISTENER
// ================================================================
function startListener() {
  if (unsubscribeSnapshot) unsubscribeSnapshot();

  const constraints = [
    where("userId", "==", currentUserId),
    orderBy("date", "desc")
  ];

  if (filterFromDate) constraints.push(where("date", ">=", filterFromDate));
  if (filterToDate) constraints.push(where("date", "<=", filterToDate));

  const q = query(collection(db, "expenses"), ...constraints);

  unsubscribeSnapshot = onSnapshot(q, snap => {
    transactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  });
}

// ================================================================
// FILTER HANDLING
// ================================================================
const filterBtn = document.getElementById("filterBtn");
const filterModal = document.getElementById("filterModal");

if (filterBtn) {
  filterBtn.onclick = () => filterModal.classList.remove("hidden");
}

document.getElementById("applyFilter").onclick = () => {
  const from = document.getElementById("fromDate").value;
  const to = document.getElementById("toDate").value;

  filterFromDate = from ? Timestamp.fromDate(new Date(from)) : null;
  filterToDate = to ? Timestamp.fromDate(new Date(to + "T23:59:59")) : null;

  filterModal.classList.add("hidden");
  startListener();
};

document.getElementById("clearFilter").onclick = () => {
  filterFromDate = null;
  filterToDate = null;
  document.getElementById("fromDate").value = "";
  document.getElementById("toDate").value = "";
  filterModal.classList.add("hidden");
  startListener();
};

// ================================================================
// UI ELEMENTS
// ================================================================
const list = document.getElementById("transactionList");
const emptyState = document.getElementById("emptyState");
const amountDisplay = document.getElementById("amountDisplay");
const descInput = document.getElementById("descriptionInput");
const toggleBg = document.getElementById("toggleBg");

// ================================================================
// RENDER
// ================================================================
function render() {
  list.innerHTML = "";

  if (transactions.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  let income = 0;
  let expense = 0;

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

  document.getElementById("totalIncome").textContent = `₹${income}`;
  document.getElementById("totalExpense").textContent = `₹${expense}`;
  document.getElementById("totalBalance").textContent = `₹${income - expense}`;
}

// ================================================================
// MODAL + NUMPAD
// ================================================================
document.getElementById("fab").onclick = () =>
  document.getElementById("transactionModal").classList.remove("hidden");

document.getElementById("closeModal").onclick = () => {
  document.getElementById("transactionModal").classList.add("hidden");
  amount = "";
  amountDisplay.textContent = "0";
  descInput.value = "";
  isIncome = true;
  toggleBg.className = "toggle-bg income";
};

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

// ================================================================
// SAVE TRANSACTION
// ================================================================
document.getElementById("saveTransaction").onclick = async () => {
  const value = parseFloat(amount);

  if (isNaN(value) || value <= 0 || !descInput.value.trim()) {
    alert("Enter valid amount and description");
    return;
  }

  await addDoc(collection(db, "expenses"), {
    userId: currentUserId,
    amount: value,
    description: descInput.value.trim(),
    type: isIncome ? "income" : "expense",
    date: Timestamp.now()
  });

  document.getElementById("transactionModal").classList.add("hidden");
};
