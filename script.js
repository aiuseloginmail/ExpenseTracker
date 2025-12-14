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
  storageBucket: "expense-tracker-28379.appspot.com",
  messagingSenderId: "469399193874",
  appId: "1:469399193874:web:753c79b5d2455d1fd2cbcb",
  measurementId: "G-M3XP8SJWL5"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
try { getAnalytics(app); } catch (e) {}
const auth = getAuth(app);
const db = getFirestore(app);

// =================================================================
// GLOBAL STATE
// =================================================================
let currentUserId = null;
let transactions = [];
let unsubscribeSnapshot = null;

// =================================================================
// 2. DOM READY
// =================================================================
document.addEventListener("DOMContentLoaded", () => {

  // ================= AUTH UI =================
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

  const googleProvider = new GoogleAuthProvider();
  googleLoginBtn.onclick = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      alert(e.message);
    }
  };

  renderSuggestions();
});

// =================================================================
// 3. AUTH STATE HANDLER
// =================================================================
onAuthStateChanged(auth, (user) => {
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }

  if (user) {
    currentUserId = user.uid;
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
// 4. FIRESTORE LISTENER
// =================================================================
function startFirestoreListener() {
  if (!currentUserId) return;

  const q = query(
    collection(db, "expenses"),
    where("userId", "==", currentUserId),
    orderBy("date", "desc")
  );

  unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
    transactions = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderSummary();
    renderList();
  });
}

// =================================================================
// 5. UI ELEMENTS
// =================================================================
const list = document.getElementById("transactionList");
const emptyState = document.getElementById("emptyState");
const amountDisplay = document.getElementById("amountDisplay");
const descInput = document.getElementById("descriptionInput");
const toggleBg = document.getElementById("toggleBg");
const suggestionsContainer = document.getElementById("suggestions");

let isIncome = true;
let editingId = null;
let amount = "";

// =================================================================
// 6. HELPERS
// =================================================================
function formatCurrency(v) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR"
  }).format(v);
}

// =================================================================
// 7. RENDER SUMMARY
// =================================================================
function renderSummary() {
  let income = 0, expense = 0;
  transactions.forEach(t =>
    t.type === "income" ? income += t.amount : expense += t.amount
  );

  document.getElementById("totalIncome").textContent = formatCurrency(income);
  document.getElementById("totalExpense").textContent = formatCurrency(expense);
  document.getElementById("totalBalance").textContent =
    formatCurrency(income - expense);
}

// =================================================================
// 8. RENDER LIST
// =================================================================
function renderList() {
  list.innerHTML = "";
  if (!transactions.length) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  transactions.forEach(t => {
    const row = document.createElement("div");
    row.className = "bg-white p-3 rounded-xl shadow flex justify-between items-center";

    const date = t.date?.toDate ? t.date.toDate() : new Date(t.date);

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

// =================================================================
// 9. SUGGESTIONS
// =================================================================
const DEFAULT_DESCRIPTIONS = ["Salary", "Food", "Auto", "Bus", "Train", "School Fee", "Medicine]()_
