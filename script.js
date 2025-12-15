// ======================================================
// FIREBASE IMPORTS
// ======================================================
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
  deleteDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ======================================================
// FIREBASE CONFIG
// ======================================================
const firebaseConfig = {
  apiKey: "AIzaSyAQhPbt_oQj3_zNntl6U6VPnzpCnSygDDg",
  authDomain: "expense-tracker-28379.firebaseapp.com",
  projectId: "expense-tracker-28379"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ======================================================
// GLOBAL STATE
// ======================================================
let currentUserId = null;
let transactions = [];
let isIncome = true;
let amount = "";
let editingId = null;

// ======================================================
// AUTH ELEMENTS
// ======================================================
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const logoutBtn = document.getElementById("logoutBtn");

// ======================================================
// EMAIL / PASSWORD LOGIN
// ======================================================
loginBtn.onclick = async () => {
  try {
    await signInWithEmailAndPassword(
      auth,
      emailInput.value,
      passwordInput.value
    );
  } catch (e) {
    alert(e.message);
  }
};

signupBtn.onclick = async () => {
  try {
    await createUserWithEmailAndPassword(
      auth,
      emailInput.value,
      passwordInput.value
    );
  } catch (e) {
    alert(e.message);
  }
};

// ======================================================
// GOOGLE LOGIN (FIXED & SAFE)
// ======================================================
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account"
});

let googlePopupInProgress = false;

googleLoginBtn.onclick = async () => {
  if (googlePopupInProgress) return;

  googlePopupInProgress = true;
  googleLoginBtn.disabled = true;

  try {
    await signInWithPopup(auth, googleProvider);
  } catch (e) {
    if (e.code !== "auth/cancelled-popup-request") {
      alert(e.message || "Google sign-in failed");
    }
  } finally {
    googlePopupInProgress = false;
    googleLoginBtn.disabled = false;
  }
};

// ======================================================
// LOGOUT
// ======================================================
logoutBtn.onclick = () => signOut(auth);

// ======================================================
// AUTH STATE CHANGE
// ======================================================
onAuthStateChanged(auth, user => {
  if (user) {
    currentUserId = user.uid;
    authSection.classList.add("hidden");
    appSection.classList.remove("hidden");
    startFirestoreListener();
  } else {
    currentUserId = null;
    authSection.classList.remove("hidden");
    appSection.classList.add("hidden");
  }
});

// ======================================================
// FIRESTORE LISTENER
// ======================================================
function startFirestoreListener() {
  const q = query(
    collection(db, "expenses"),
    where("userId", "==", currentUserId),
    orderBy("date", "desc")
  );

  onSnapshot(q, snap => {
    transactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  });
}

// ======================================================
// UI CONTROLS
// ======================================================
fab.onclick = () => transactionModal.classList.remove("hidden");
closeModal.onclick = resetModal;

function resetModal() {
  transactionModal.classList.add("hidden");
  amount = "";
  amountDisplay.textContent = "0";
  descriptionInput.value = "";
  editingId = null;
  isIncome = true;
  toggleBg.className = "toggle-bg income";
}

// Numpad validation
document.querySelectorAll(".num").forEach(btn => {
  btn.onclick = () => {
    if (btn.textContent === "." && amount.includes(".")) return;
    if (amount.includes(".") && amount.split(".")[1]?.length >= 2) return;
    amount += btn.textContent;
    amountDisplay.textContent = amount;
  };
});

backspace.onclick = () => {
  amount = amount.slice(0, -1);
  amountDisplay.textContent = amount || "0";
};

incomeBtn.onclick = () => {
  isIncome = true;
  toggleBg.className = "toggle-bg income";
};

expenseBtn.onclick = () => {
  isIncome = false;
  toggleBg.className = "toggle-bg expense";
};

// ======================================================
// SAVE TRANSACTION
// ======================================================
saveTransaction.onclick = async () => {
  const value = parseFloat(amount);

  if (isNaN(value) || value <= 0) {
    alert("Please enter a valid amount");
    return;
  }

  if (!descriptionInput.value.trim()) {
    alert("Please enter a description");
    return;
  }

  const data = {
    userId: currentUserId,
    amount: value,
    description: descriptionInput.value.trim(),
    type: isIncome ? "income" : "expense",
    date: new Date()
  };

  if (editingId) {
    await updateDoc(doc(db, "expenses", editingId), data);
  } else {
    await addDoc(collection(db, "expenses"), data);
  }

  resetModal();
};

// ======================================================
// RENDER
// ======================================================
function render() {
  transactionList.innerHTML = "";
  emptyState.classList.toggle("hidden", transactions.length !== 0);

  let income = 0, expense = 0;

  transactions.forEach(t => {
    t.type === "income" ? income += t.amount : expense += t.amount;

    const row = document.createElement("div");
    row.className =
      "bg-white p-3 rounded-xl shadow flex justify-between items-center";

    row.innerHTML = `
      <div>
        <p class="font-semibold">${t.description}</p>
        <p class="text-xs text-slate-400">
          ${t.date.toDate().toLocaleString()}
        </p>
      </div>
      <p class="${
        t.type === "income" ? "text-emerald-500" : "text-rose-500"
      } font-semibold">
        ${t.type === "income" ? "+" : "-"}₹${t.amount}
      </p>
    `;

    transactionList.appendChild(row);
  });

  totalIncome.textContent = `₹${income}`;
  totalExpense.textContent = `₹${expense}`;
  totalBalance.textContent = `₹${income - expense}`;
}
