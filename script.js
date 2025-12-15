// ================= FIREBASE =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } 
from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import { getFirestore, collection, addDoc, onSnapshot,
  query, where, orderBy, deleteDoc, doc, updateDoc }
from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAQhPbt_oQj3_zNntl6U6VPnzpCnSygDDg",
  authDomain: "expense-tracker-28379.firebaseapp.com",
  projectId: "expense-tracker-28379"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ================= STATE =================
let currentUserId = null;
let transactions = [];
let isIncome = true;
let amount = "";
let editingId = null;

// ================= AUTH =================
loginBtn.onclick = () =>
  signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
  .catch(e => alert(e.message));

signupBtn.onclick = () =>
  createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
  .catch(e => alert(e.message));

googleLoginBtn.onclick = () =>
  signInWithPopup(auth, new GoogleAuthProvider());

logoutBtn.onclick = () => signOut(auth);

onAuthStateChanged(auth, user => {
  if (!user) return;
  currentUserId = user.uid;
  authSection.classList.add("hidden");
  appSection.classList.remove("hidden");
  startListener();
});

// ================= FIRESTORE =================
function startListener() {
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

// ================= UI =================
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

// Numpad fix
document.querySelectorAll(".num").forEach(btn => {
  btn.onclick = () => {
    if (btn.textContent === "." && amount.includes(".")) return;
    if (amount.includes(".") && amount.split(".")[1].length >= 2) return;
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

// ================= SAVE =================
saveTransaction.onclick = async () => {
  const value = parseFloat(amount);

  if (isNaN(value) || value <= 0) {
    alert("Enter a valid amount");
    return;
  }

  if (!descriptionInput.value.trim()) {
    alert("Enter description");
    return;
  }

  const data = {
    userId: currentUserId,
    amount: value,
    description: descriptionInput.value.trim(),
    type: isIncome ? "income" : "expense",
    date: new Date()
  };

  if (editingId)
    await updateDoc(doc(db, "expenses", editingId), data);
  else
    await addDoc(collection(db, "expenses"), data);

  resetModal();
};

// ================= RENDER =================
function render() {
  transactionList.innerHTML = "";
  if (!transactions.length) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  let income = 0, expense = 0;

  transactions.forEach(t => {
    t.type === "income" ? income += t.amount : expense += t.amount;

    const div = document.createElement("div");
    div.className = "bg-white p-3 rounded-xl shadow flex justify-between";
    div.innerHTML = `
      <div>
        <p class="font-semibold">${t.description}</p>
        <p class="text-xs text-slate-400">${t.date.toDate().toLocaleString()}</p>
      </div>
      <div class="${t.type === "income" ? "text-emerald-500" : "text-rose-500"}">
        ${t.type === "income" ? "+" : "-"}₹${t.amount}
      </div>
    `;
    transactionList.appendChild(div);
  });

  totalIncome.textContent = `₹${income}`;
  totalExpense.textContent = `₹${expense}`;
  totalBalance.textContent = `₹${income - expense}`;
}
