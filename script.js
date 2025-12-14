// =================================================================
// 1. FIREBASE SETUP & INITIALIZATION
// =================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
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

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAQhPbt_oQj3_zNntl6U6VPnzpCnSygDDg",
  authDomain: "expense-tracker-28379.firebaseapp.com",
  projectId: "expense-tracker-28379",
  storageBucket: "expense-tracker-28379.firebasestorage.app",
  messagingSenderId: "469399193874",
  appId: "1:469399193874:web:753c79b5d2455d1fd2cbcb",
  measurementId: "G-M3XP8SJWL5"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// Global variables
let transactions = []; // Data will now be populated from Firestore
let currentUserId = null;

// =================================================================
// 2. AUTHENTICATION & DATA LISTENING
// =================================================================

// Function to start listening to Firestore data for the logged-in user
function setupFirestoreListener(userId) {
  const transactionsCollectionRef = collection(db, "expenses");
  
  // Create a query: filter by userId and order by timestamp
  const q = query(
    transactionsCollectionRef, 
    where("userId", "==", userId),
    orderBy("date", "desc") // Sort by latest date first
  );

  // Set up the real-time listener
  onSnapshot(q, (snapshot) => {
    transactions = [];
    snapshot.forEach((doc) => {
      // Map Firestore document data to your local transaction structure
      transactions.push({ ...doc.data(), id: doc.id }); 
    });
    console.log("Transactions updated from Firestore.");
    
    // Rerender the UI with the new data
    renderSummary();
    renderList();
  }, (error) => {
    console.error("Error listening to transactions:", error);
  });
}

// Handle authentication state change (sign in anonymously)
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in
    currentUserId = user.uid;
    console.log("Firebase user signed in:", currentUserId);
    // Start listening for their transactions
    setupFirestoreListener(currentUserId);
  } else {
    // User is signed out, so sign them in anonymously
    signInAnonymously(auth)
      .catch((error) => {
        console.error("Anonymous sign-in failed:", error.message);
        // You might want to show an error message to the user here
      });
  }
});


// =================================================================
// 3. CORE APPLICATION LOGIC (Adapted for Firebase)
// =================================================================

const DEFAULT_DESCRIPTIONS = [
  "Salary", "Food", "Auto", "Bus", "Train", "School Fee", "Medicine"
];

let suggestions = DEFAULT_DESCRIPTIONS;

let isIncome = true;
let editingId = null;
let amount = '';

const list = document.getElementById('transactionList');
const emptyState = document.getElementById('emptyState');
const amountDisplay = document.getElementById('amountDisplay');
const descInput = document.getElementById('descriptionInput');
const toggleBg = document.getElementById('toggleBg');
const suggestionsContainer = document.getElementById('suggestions');

/* Utilities */
// LocalStorage is no longer needed!

function formatCurrency(v) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(v);
}

/* Render Summary - Uses the 'transactions' array populated by the listener */
function renderSummary() {
  let income = 0, expense = 0;
  transactions.forEach(t =>
    t.type === 'income' ? income += t.amount : expense += t.amount
  );

  document.getElementById('totalIncome').textContent = formatCurrency(income);
  document.getElementById('totalExpense').textContent = formatCurrency(expense);
  document.getElementById('totalBalance').textContent =
    formatCurrency(income - expense);
}

/* Render Transactions - Uses the 'transactions' array populated by the listener */
function renderList() {
  list.innerHTML = '';

  if (!transactions.length) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  transactions.forEach(t => {
    const row = document.createElement('div');
    row.className =
      'bg-white p-3 rounded-xl shadow flex justify-between items-center';
    
    // Convert Firestore Timestamp/Date object to a readable string
    const dateValue = t.date?.toDate ? t.date.toDate() : new Date(t.date); 

    row.innerHTML = `
      <div>
        <p class="font-semibold">${t.description}</p>
        <p class="text-xs text-slate-400">${dateValue.toLocaleString()}</p>
      </div>

      <div class="flex items-center gap-3">
        <p class="${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'} font-semibold">
          ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
        </p>
        <button class="edit-btn">✏️</button>
        <button class="delete-btn">🗑️</button>
      </div>
    `;

    // Note: t.id is the Firestore Document ID now!
    row.querySelector('.edit-btn').onclick = () => editTransaction(t);
    row.querySelector('.delete-btn').onclick = () => deleteTransaction(t.id);

    list.appendChild(row);
  });
}

/* Suggestions */
function renderSuggestions() {
  suggestionsContainer.innerHTML = '';
  suggestions.forEach(text => {
    const chip = document.createElement('button');
    chip.className =
      'px-3 py-1 rounded-full bg-slate-200 text-sm';
    chip.textContent = text;
    chip.onclick = () => descInput.value = text;
    suggestionsContainer.appendChild(chip);
  });
}

/* Edit */
function editTransaction(t) {
  editingId = t.id; // Firestore ID
  amount = t.amount.toString();
  amountDisplay.textContent = amount;
  descInput.value = t.description;
  isIncome = t.type === 'income';
  toggleBg.className = `toggle-bg ${isIncome ? 'income' : 'expense'}`;
  openModal();
}

/* Delete Transaction - Now deletes from Firestore */
async function deleteTransaction(id) {
  if (!currentUserId) return;
  if (!confirm('Delete this transaction?')) return;
  
  try {
    const docRef = doc(db, "expenses", id);
    await deleteDoc(docRef);
    console.log("Document successfully deleted:", id);
    // UI update happens automatically via the onSnapshot listener
  } catch (error) {
    console.error("Error removing document: ", error);
  }
}

/* Modal and UI event handlers (Unchanged) */
function openModal() {
  document.getElementById('transactionModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('transactionModal').classList.add('hidden');
  amount = '';
  amountDisplay.textContent = '0';
  descInput.value = '';
  editingId = null;
}

document.getElementById('fab').onclick = openModal;
document.getElementById('closeModal').onclick = closeModal;

/* Numpad (Unchanged) */
document.querySelectorAll('.num').forEach(btn => {
  btn.onclick = () => {
    amount += btn.textContent;
    amountDisplay.textContent = amount;
  };
});

document.getElementById('backspace').onclick = () => {
  amount = amount.slice(0, -1);
  amountDisplay.textContent = amount || '0';
};

/* Toggle (Unchanged) */
document.getElementById('incomeBtn').onclick = () => {
  isIncome = true;
  toggleBg.className = 'toggle-bg income';
};
document.getElementById('expenseBtn').onclick = () => {
  isIncome = false;
  toggleBg.className = 'toggle-bg expense';
};

/* Save Transaction - Now saves/updates in Firestore */
document.getElementById('saveTransaction').onclick = async () => {
  if (!amount || !descInput.value || !currentUserId) return;

  const txData = {
    userId: currentUserId, // Crucial for security rules
    amount: parseFloat(amount),
    description: descInput.value.trim(),
    type: isIncome ? 'income' : 'expense',
    date: new Date(), // Firestore automatically handles Date objects
  };

  try {
    if (editingId) {
      // UPDATE existing document
      const docRef = doc(db, "expenses", editingId);
      await updateDoc(docRef, txData);
      console.log("Document successfully updated:", editingId);
    } else {
      // ADD new document
      await addDoc(collection(db, "expenses"), txData);
      console.log("New document added.");
    }
    
    // UI update happens automatically via the onSnapshot listener
    closeModal();
  } catch (e) {
    console.error("Error saving document: ", e);
  }
};

/* Init - Only render suggestions, list and summary are handled by the listener */
renderSuggestions();

// NOTE: Since the rendering is now handled by the onAuthStateChanged listener, 
// we don't call renderSummary() and renderList() here directly.
// =================================================================

