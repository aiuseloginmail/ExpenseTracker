const STORAGE_KEY = 'account_book_transactions';

const DEFAULT_DESCRIPTIONS = [
  "Salary", "Food", "Auto", "Bus", "Train", "School Fee", "Medicine"
];

let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
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
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function formatCurrency(v) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(v);
}

/* Render Summary */
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

/* Render Transactions */
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

    row.innerHTML = `
      <div>
        <p class="font-semibold">${t.description}</p>
        <p class="text-xs text-slate-400">${new Date(t.date).toLocaleString()}</p>
      </div>

      <div class="flex items-center gap-3">
        <p class="${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'} font-semibold">
          ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
        </p>
        <button class="edit-btn">✏️</button>
        <button class="delete-btn">🗑️</button>
      </div>
    `;

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
  editingId = t.id;
  amount = t.amount.toString();
  amountDisplay.textContent = amount;
  descInput.value = t.description;
  isIncome = t.type === 'income';
  toggleBg.className = `toggle-bg ${isIncome ? 'income' : 'expense'}`;
  openModal();
}

/* Delete */
function deleteTransaction(id) {
  if (!confirm('Delete this transaction?')) return;
  transactions = transactions.filter(t => t.id !== id);
  saveData();
  renderSummary();
  renderList();
}

/* Modal */
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

/* Numpad */
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

/* Toggle */
document.getElementById('incomeBtn').onclick = () => {
  isIncome = true;
  toggleBg.className = 'toggle-bg income';
};
document.getElementById('expenseBtn').onclick = () => {
  isIncome = false;
  toggleBg.className = 'toggle-bg expense';
};

/* Save */
document.getElementById('saveTransaction').onclick = () => {
  if (!amount || !descInput.value) return;

  const tx = {
    id: editingId || Date.now(),
    amount: parseFloat(amount),
    description: descInput.value.trim(),
    type: isIncome ? 'income' : 'expense',
    date: new Date().toISOString()
  };

  if (editingId) {
    transactions = transactions.map(t => t.id === editingId ? tx : t);
  } else {
    transactions.unshift(tx);
  }

  saveData();
  renderSummary();
  renderList();
  closeModal();
};

/* Init */
renderSummary();
renderList();
renderSuggestions();
