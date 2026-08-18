let currentMonthKey = getMonthKey();
let currentMonthData = null;
let summaryChartInstance = null;
let expenseChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  auth.onAuthStateChanged(user => {
    if (!user) return;
    currentMonthKey = getMonthKey();
    document.getElementById('monthPicker').value = currentMonthKey;
    updateMonthLabel();
    loadMonthData();
    setupDashboardEvents();
  });
});

function setupDashboardEvents() {
  document.getElementById('prevMonthBtn').addEventListener('click', () => changeMonth(-1));
  document.getElementById('nextMonthBtn').addEventListener('click', () => changeMonth(1));
  document.getElementById('monthPicker').addEventListener('change', (e) => {
    currentMonthKey = e.target.value;
    updateMonthLabel();
    loadMonthData();
  });
  
  document.getElementById('logoutBtn').addEventListener('click', () => {
    auth.signOut().then(() => window.location.href = 'index.html');
  });
  
  document.getElementById('addIncomeBtnDash').addEventListener('click', () => openIncomeModal());
  document.getElementById('addExpenseBtnDash').addEventListener('click', () => openExpenseModal());
  document.getElementById('addChildBtnDash').addEventListener('click', () => openChildModal());
  
  document.querySelectorAll('.close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.modal;
      document.getElementById(modalId).style.display = 'none';
    });
  });
  
  document.getElementById('incomeForm').addEventListener('submit', saveIncome);
  document.getElementById('expenseForm').addEventListener('submit', saveExpense);
  document.getElementById('childForm').addEventListener('submit', saveChild);
}

function changeMonth(delta) {
  const [year, month] = currentMonthKey.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  currentMonthKey = getMonthKey(date);
  document.getElementById('monthPicker').value = currentMonthKey;
  updateMonthLabel();
  loadMonthData();
}

function updateMonthLabel() {
  document.getElementById('monthLabel').textContent = getMonthLabel(currentMonthKey);
}

function loadMonthData() {
  const user = auth.currentUser;
  if (!user) return;
  const monthRef = getUserMonthRef(user.uid, currentMonthKey);
  monthRef.on('value', (snapshot) => {
    if (snapshot.exists()) {
      currentMonthData = snapshot.val();
    } else {
      currentMonthData = null;
    }
    renderDashboard();
  });
}

function renderDashboard() {
  const totalIncome = calculateTotalIncome();
  const totalExpenses = calculateTotalExpenses();
  const savings = totalIncome - totalExpenses;
  document.getElementById('totalIncome').textContent = formatCurrency(totalIncome);
  document.getElementById('totalExpenses').textContent = formatCurrency(totalExpenses);
  document.getElementById('totalSavings').textContent = formatCurrency(savings);
  
  const hasData = currentMonthData && (currentMonthData.income?.length || currentMonthData.expenses?.length || currentMonthData.children?.length);
  document.getElementById('emptyState').style.display = hasData ? 'none' : 'block';
  
  renderIncomeList();
  renderExpensesList();
  renderChildrenList();
  
  updateCharts(totalIncome, totalExpenses, savings);
}

function calculateTotalIncome() {
  if (!currentMonthData || !currentMonthData.income) return 0;
  return currentMonthData.income.reduce((sum, item) => sum + (item.amount || 0), 0);
}

function calculateTotalExpenses() {
  let total = 0;
  if (currentMonthData) {
    if (currentMonthData.expenses) {
      total += currentMonthData.expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    }
    if (currentMonthData.children) {
      total += currentMonthData.children.reduce((sum, child) => sum + (child.schoolFees || 0) + (child.otherExpenses || 0), 0);
    }
  }
  return total;
}

function renderIncomeList() {
  const list = document.getElementById('incomeList');
  list.innerHTML = '';
  if (currentMonthData && currentMonthData.income) {
    currentMonthData.income.forEach(item => {
      const li = document.createElement('li');
      li.className = 'data-item';
      li.innerHTML = `
        <span class="item-name">${item.name}</span>
        <span class="item-amount">${formatCurrency(item.amount)}</span>
        <span class="item-actions">
          <button class="btn-icon" onclick="editIncome('${item.id}')">✏️</button>
          <button class="btn-icon" onclick="deleteIncome('${item.id}')">🗑️</button>
        </span>
      `;
      list.appendChild(li);
    });
  }
}

function renderExpensesList() {
  const list = document.getElementById('expensesList');
  list.innerHTML = '';
  if (currentMonthData && currentMonthData.expenses) {
    currentMonthData.expenses.forEach(item => {
      const li = document.createElement('li');
      li.className = 'data-item';
      li.innerHTML = `
        <span class="item-name">${item.category}</span>
        <span class="item-amount">${formatCurrency(item.amount)}</span>
        <span class="item-actions">
          <button class="btn-icon" onclick="editExpense('${item.id}')">✏️</button>
          <button class="btn-icon" onclick="deleteExpense('${item.id}')">🗑️</button>
        </span>
      `;
      list.appendChild(li);
    });
  }
}

function renderChildrenList() {
  const list = document.getElementById('childrenList');
  list.innerHTML = '';
  if (currentMonthData && currentMonthData.children) {
    currentMonthData.children.forEach(item => {
      // Combine school fees and other expenses into one total
      const childTotal = (item.schoolFees || 0) + (item.otherExpenses || 0);
      const li = document.createElement('li');
      li.className = 'data-item';
      li.innerHTML = `
        <span class="item-name">${item.name}</span>
        <span class="item-amount">${formatCurrency(childTotal)}</span>
        <span class="item-actions">
          <button class="btn-icon" onclick="editChild('${item.id}')">✏️</button>
          <button class="btn-icon" onclick="deleteChild('${item.id}')">🗑️</button>
        </span>
      `;
      list.appendChild(li);
    });
  }
}

// Generate distinct colors using HSL
function generateDistinctColors(count) {
  const colors = [];
  for (let i = 0; i < count; i++) {
    const hue = Math.floor((i * 360) / count);
    // Vary lightness and saturation slightly to avoid repetition
    const saturation = 70 + (i % 3) * 10; // 70%, 80%, 90%
    const lightness = 45 + (i % 3) * 10;  // 45%, 55%, 65%
    colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
  }
  return colors;
}

function updateCharts(totalIncome, totalExpenses, savings) {
  // Summary chart (bar) - unchanged
  const summaryCtx = document.getElementById('summaryChart').getContext('2d');
  if (summaryChartInstance) summaryChartInstance.destroy();
  summaryChartInstance = new Chart(summaryCtx, {
    type: 'bar',
    data: {
      labels: ['Income', 'Expenses', 'Savings'],
      datasets: [{
        label: 'Amount',
        data: [totalIncome, totalExpenses, savings],
        backgroundColor: ['#4CAF50', '#F44336', '#2196F3'],
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) { return '$' + value; }
          }
        }
      }
    }
  });
  
  // Expense breakdown chart (doughnut) - updated to combine child expenses and use distinct colors
  const expenseCtx = document.getElementById('expenseChart').getContext('2d');
  if (expenseChartInstance) expenseChartInstance.destroy();
  
  let expenseLabels = [];
  let expenseData = [];
  
  // Aggregate regular expenses
  if (currentMonthData && currentMonthData.expenses) {
    const catMap = {};
    currentMonthData.expenses.forEach(exp => {
      catMap[exp.category] = (catMap[exp.category] || 0) + exp.amount;
    });
    expenseLabels = Object.keys(catMap);
    expenseData = Object.values(catMap);
  }
  
  // Combine child expenses: one category per child with total
  if (currentMonthData && currentMonthData.children && currentMonthData.children.length > 0) {
    currentMonthData.children.forEach(child => {
      const childTotal = (child.schoolFees || 0) + (child.otherExpenses || 0);
      if (childTotal > 0) {
        expenseLabels.push(child.name);
        expenseData.push(childTotal);
      }
    });
  }
  
  // Generate distinct colors for all categories
  const colors = generateDistinctColors(expenseLabels.length);
  
  if (expenseLabels.length > 0) {
    expenseChartInstance = new Chart(expenseCtx, {
      type: 'doughnut',
      data: {
        labels: expenseLabels,
        datasets: [{
          data: expenseData,
          backgroundColor: colors,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 15,
              padding: 10
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.parsed;
                return `${context.label}: ${formatCurrency(value)}`;
              }
            }
          }
        }
      }
    });
  } else {
    // No data, show empty state
    expenseChartInstance = new Chart(expenseCtx, {
      type: 'doughnut',
      data: {
        labels: ['No Expenses'],
        datasets: [{
          data: [1],
          backgroundColor: ['#e0e0e0']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
}

function openIncomeModal(id = null) {
  const modal = document.getElementById('incomeModal');
  const form = document.getElementById('incomeForm');
  form.reset();
  document.getElementById('incomeId').value = id || '';
  document.getElementById('incomeModalTitle').textContent = id ? 'Edit Income' : 'Add Income';
  if (id && currentMonthData && currentMonthData.income) {
    const item = currentMonthData.income.find(i => i.id === id);
    if (item) {
      document.getElementById('incomeName').value = item.name;
      document.getElementById('incomeAmount').value = item.amount;
    }
  }
  modal.style.display = 'block';
}

function openExpenseModal(id = null) {
  const modal = document.getElementById('expenseModal');
  const form = document.getElementById('expenseForm');
  form.reset();
  document.getElementById('expenseId').value = id || '';
  document.getElementById('expenseModalTitle').textContent = id ? 'Edit Expense' : 'Add Expense';
  if (id && currentMonthData && currentMonthData.expenses) {
    const item = currentMonthData.expenses.find(e => e.id === id);
    if (item) {
      document.getElementById('expenseCategory').value = item.category;
      document.getElementById('expenseAmount').value = item.amount;
    }
  }
  modal.style.display = 'block';
}

function openChildModal(id = null) {
  const modal = document.getElementById('childModal');
  const form = document.getElementById('childForm');
  form.reset();
  document.getElementById('childId').value = id || '';
  document.getElementById('childModalTitle').textContent = id ? 'Edit Child' : 'Add Child';
  if (id && currentMonthData && currentMonthData.children) {
    const item = currentMonthData.children.find(c => c.id === id);
    if (item) {
      document.getElementById('childName').value = item.name;
      document.getElementById('childSchoolFees').value = item.schoolFees || 0;
      document.getElementById('childOtherExpenses').value = item.otherExpenses || 0;
    }
  }
  modal.style.display = 'block';
}

function saveIncome(e) {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return;
  const id = document.getElementById('incomeId').value;
  const name = document.getElementById('incomeName').value.trim();
  const amount = parseFloat(document.getElementById('incomeAmount').value);
  if (!name || isNaN(amount) || amount <= 0) {
    alert('Please enter valid income details.');
    return;
  }
  const monthRef = getUserMonthRef(user.uid, currentMonthKey);
  const newIncome = { id: id || generateId(), name, amount };
  
  monthRef.child('income').once('value').then(snapshot => {
    let incomes = snapshot.val() || [];
    if (id) {
      incomes = incomes.map(item => item.id === id ? newIncome : item);
    } else {
      incomes.push(newIncome);
    }
    return monthRef.update({ income: incomes });
  }).then(() => {
    document.getElementById('incomeModal').style.display = 'none';
  }).catch(error => {
    console.error('Error saving income:', error);
    alert('Failed to save income.');
  });
}

function saveExpense(e) {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return;
  const id = document.getElementById('expenseId').value;
  const category = document.getElementById('expenseCategory').value.trim();
  const amount = parseFloat(document.getElementById('expenseAmount').value);
  if (!category || isNaN(amount) || amount <= 0) {
    alert('Please enter valid expense details.');
    return;
  }
  const monthRef = getUserMonthRef(user.uid, currentMonthKey);
  const newExpense = { id: id || generateId(), category, amount };
  
  monthRef.child('expenses').once('value').then(snapshot => {
    let expenses = snapshot.val() || [];
    if (id) {
      expenses = expenses.map(item => item.id === id ? newExpense : item);
    } else {
      expenses.push(newExpense);
    }
    return monthRef.update({ expenses });
  }).then(() => {
    document.getElementById('expenseModal').style.display = 'none';
  }).catch(error => {
    console.error('Error saving expense:', error);
    alert('Failed to save expense.');
  });
}

function saveChild(e) {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return;
  const id = document.getElementById('childId').value;
  const name = document.getElementById('childName').value.trim();
  const schoolFees = parseFloat(document.getElementById('childSchoolFees').value) || 0;
  const otherExpenses = parseFloat(document.getElementById('childOtherExpenses').value) || 0;
  if (!name || schoolFees < 0 || otherExpenses < 0) {
    alert('Please enter valid child details.');
    return;
  }
  const monthRef = getUserMonthRef(user.uid, currentMonthKey);
  const newChild = { id: id || generateId(), name, schoolFees, otherExpenses };
  
  monthRef.child('children').once('value').then(snapshot => {
    let children = snapshot.val() || [];
    if (id) {
      children = children.map(item => item.id === id ? newChild : item);
    } else {
      children.push(newChild);
    }
    return monthRef.update({ children });
  }).then(() => {
    document.getElementById('childModal').style.display = 'none';
  }).catch(error => {
    console.error('Error saving child:', error);
    alert('Failed to save child.');
  });
}

function deleteIncome(id) {
  if (!confirm('Delete this income source?')) return;
  const user = auth.currentUser;
  if (!user) return;
  const monthRef = getUserMonthRef(user.uid, currentMonthKey);
  monthRef.child('income').once('value').then(snapshot => {
    let incomes = snapshot.val() || [];
    incomes = incomes.filter(item => item.id !== id);
    return monthRef.update({ income: incomes });
  }).catch(error => console.error(error));
}

function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  const user = auth.currentUser;
  if (!user) return;
  const monthRef = getUserMonthRef(user.uid, currentMonthKey);
  monthRef.child('expenses').once('value').then(snapshot => {
    let expenses = snapshot.val() || [];
    expenses = expenses.filter(item => item.id !== id);
    return monthRef.update({ expenses });
  }).catch(error => console.error(error));
}

function deleteChild(id) {
  if (!confirm('Delete this child?')) return;
  const user = auth.currentUser;
  if (!user) return;
  const monthRef = getUserMonthRef(user.uid, currentMonthKey);
  monthRef.child('children').once('value').then(snapshot => {
    let children = snapshot.val() || [];
    children = children.filter(item => item.id !== id);
    return monthRef.update({ children });
  }).catch(error => console.error(error));
}

// Expose functions to global scope for inline onclick
window.editIncome = openIncomeModal;
window.editExpense = openExpenseModal;
window.editChild = openChildModal;
window.deleteIncome = deleteIncome;
window.deleteExpense = deleteExpense;
window.deleteChild = deleteChild;
