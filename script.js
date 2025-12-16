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
  updateDoc, 
  deleteDoc,  
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp
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
// DOM ELEMENTS
// ======================================================
const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");

const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const fab = document.getElementById("fab");
const modal = document.getElementById("transactionModal");
const closeModal = document.getElementById("closeModal");
const saveBtn = document.getElementById("saveTransaction");

const amountDisplay = document.getElementById("amountDisplay");
const descInput = document.getElementById("descriptionInput");
// ======================================================
// QUICK CATEGORY SELECTION
// ======================================================
document.querySelectorAll(".category-btn").forEach(btn => {
  btn.onclick = () => {
    // Remove emoji and use clean text if needed
    const text = btn.textContent.replace(/^[^\w]+/, "").trim();
    descInput.value = text;
  };
});
const numButtons = document.querySelectorAll(".num");
const backspace = document.getElementById("backspace");

const incomeBtn = document.getElementById("incomeBtn");
const expenseBtn = document.getElementById("expenseBtn");
const toggleBg = document.getElementById("toggleBg");

const filterBtn = document.getElementById("filterBtn");
const filterModal = document.getElementById("filterModal");
const applyFilter = document.getElementById("applyFilter");
const clearFilter = document.getElementById("clearFilter");

const list = document.getElementById("transactionList");
const emptyState = document.getElementById("emptyState");
const totalIncome = document.getElementById("totalIncome");
const totalExpense = document.getElementById("totalExpense");
const totalBalance = document.getElementById("totalBalance");

// ======================================================
// STATE
// ======================================================
let currentUserId = null;
let unsubscribe = null;
let transactions = [];

let amount = "";
let isIncome = true;
let filterFrom = null;
let filterTo = null;
let editingId = null;

// ======================================================
// AUTH
// ======================================================
loginBtn.onclick = () =>
  signInWithEmailAndPassword(
    auth,
    emailInput.value,
    passwordInput.value
  ).catch(e => alert(e.message));

signupBtn.onclick = () =>
  createUserWithEmailAndPassword(
    auth,
    emailInput.value,
    passwordInput.value
  ).catch(e => alert(e.message));

googleLoginBtn.onclick = () =>
  signInWithPopup(auth, new GoogleAuthProvider())
    .catch(e => alert(e.message));

logoutBtn.onclick = () => signOut(auth);

// ======================================================
// AUTH STATE
// ======================================================
onAuthStateChanged(auth, user => {
  if (unsubscribe) unsubscribe();

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

// ======================================================
// FIRESTORE LISTENER
// ======================================================
function startListener() {
  let constraints = [
    where("userId", "==", currentUserId),
    orderBy("date", "desc")
  ];

  if (filterFrom) constraints.push(where("date", ">=", filterFrom));
  if (filterTo) constraints.push(where("date", "<=", filterTo));

  unsubscribe = onSnapshot(
    query(collection(db, "expenses"), ...constraints),
    snap => {
      transactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      render();
    }
  );
}

// ======================================================
// RENDER
// ======================================================
function render() {
  list.innerHTML = "";
  let income = 0, expense = 0;

  if (!transactions.length) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  transactions.forEach(t => {
    t.type === "income" ? income += t.amount : expense += t.amount;

    const div = document.createElement("div");
    div.className = "bg-white p-3 rounded-xl shadow flex justify-between";

    div.innerHTML = `
      <div>
        <p class="font-semibold">${t.description}</p>
        <p class="text-xs text-slate-400">${t.date.toDate().toLocaleString()}</p>
      </div>
    
      <div class="flex items-center gap-3">
        <p class="${t.type === "income" ? "text-emerald-500" : "text-rose-500"} font-semibold">
          ${t.type === "income" ? "+" : "-"}₹${t.amount}
        </p>
    
        <button class="edit-btn" data-id="${t.id}">✏️</button>
        <button class="delete-btn" data-id="${t.id}">🗑️</button>
      </div>
    `;

    list.appendChild(div);
  });

  totalIncome.textContent = `₹${income}`;
  totalExpense.textContent = `₹${expense}`;
  totalBalance.textContent = `₹${income - expense}`;
}

// ======================================================
// EDIT TRANSACTION
// ======================================================
document.addEventListener("click", e => {
  if (!e.target.classList.contains("edit-btn")) return;

  const id = e.target.dataset.id;
  const txn = transactions.find(t => t.id === id);
  if (!txn) return;

   // 4️⃣ Store ID for SAVE logic (THIS IS STEP C ⭐)
  editingId = id;

  // Open modal
  modal.classList.remove("hidden");

  // 6️⃣ Fill modal fields with existing data
  amount = txn.amount.toString();
  amountDisplay.textContent = amount;
  descInput.value = txn.description;
  // 7️⃣ Set income / expense toggle
  isIncome = txn.type === "income";
  toggleBg.className = isIncome ? "toggle-bg income" : "toggle-bg expense";
});

// ======================================================
// DELETE TRANSACTION
// ======================================================
document.addEventListener("click", async e => {
  if (!e.target.classList.contains("delete-btn")) return;

  const id = e.target.dataset.id;

  if (!confirm("Delete this transaction?")) return;

  await deleteDoc(doc(db, "expenses", id));
});


// ======================================================
// MODAL + NUMPAD (FIXED)
// ======================================================
fab.onclick = () => modal.classList.remove("hidden");
closeModal.onclick = resetModal;

numButtons.forEach(btn => {
  btn.onclick = () => {
    if (btn.textContent === "." && amount.includes(".")) return;
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
// SAVE TRANSACTION (WORKING)
// ======================================================
saveBtn.onclick = async () => {
  const value = parseFloat(amountDisplay.textContent);

  if (isNaN(value) || value <= 0) {
    alert("Please enter a valid amount");
    return;
  }

  if (!descInput.value.trim()) {
    alert("Please enter a description");
    return;
  }

  const data = {
    userId: currentUserId,
    amount: value,
    description: descInput.value.trim(),
    type: isIncome ? "income" : "expense",
    date: Timestamp.now()
  };

  try {
    if (editingId) {
      // ✏️ UPDATE existing transaction
      await updateDoc(doc(db, "expenses", editingId), data);
      editingId = null;
    } else {
      // ➕ CREATE new transaction
      await addDoc(collection(db, "expenses"), data);
    }

    resetModal();
  } catch (e) {
    alert("Failed to save expense: " + e.message);
  }
};

function resetModal() {
  modal.classList.add("hidden");
  amount = "";
  amountDisplay.textContent = "0";
  descInput.value = "";
  isIncome = true;
  toggleBg.className = "toggle-bg income";
  editingId = null;
}

// ======================================================
// FILTER (WORKING)
// ======================================================
filterBtn.onclick = () => filterModal.classList.remove("hidden");

applyFilter.onclick = () => {
  filterFrom = fromDate.value
    ? Timestamp.fromDate(new Date(fromDate.value))
    : null;

  filterTo = toDate.value
    ? Timestamp.fromDate(new Date(toDate.value + "T23:59:59"))
    : null;

  filterModal.classList.add("hidden");
  startListener();
};

clearFilter.onclick = () => {
  filterFrom = null;
  filterTo = null;
  filterModal.classList.add("hidden");
  startListener();
};





