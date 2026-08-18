let currentStep = 1;
const predefinedCategories = ['Petrol', 'Gas', 'Electricity', 'Internet', 'Grocery', 'Water', 'Phone Bill'];

document.addEventListener('DOMContentLoaded', () => {
  auth.onAuthStateChanged(user => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }
    const monthKey = getMonthKey();
    getUserMonthRef(user.uid, monthKey).once('value').then(snapshot => {
      if (snapshot.exists()) {
        window.location.href = 'dashboard.html';
      }
    });
  });

  renderPredefinedCategories();
  setupEventListeners();
  showStep(1);
});

function setupEventListeners() {
  document.getElementById('addIncomeBtn').addEventListener('click', addIncomeRow);
  document.getElementById('incomeNext').addEventListener('click', validateIncomeAndNext);
  
  document.getElementById('addCustomCategoryBtn').addEventListener('click', addCustomCategoryRow);
  document.getElementById('expensesBack').addEventListener('click', () => showStep(1));
  document.getElementById('expensesNext').addEventListener('click', validateExpensesAndNext);
  
  document.querySelectorAll('input[name="hasChildren"]').forEach(radio => {
    radio.addEventListener('change', toggleChildrenDetails);
  });
  document.getElementById('numChildren').addEventListener('change', generateChildrenInputs);
  document.getElementById('childrenBack').addEventListener('click', () => showStep(2));
  document.getElementById('childrenNext').addEventListener('click', validateChildrenAndNext);
  
  document.getElementById('reviewBack').addEventListener('click', () => showStep(3));
  document.getElementById('saveBtn').addEventListener('click', saveData);
}

function showStep(step) {
  currentStep = step;
  document.querySelectorAll('.step-content').forEach(el => el.style.display = 'none');
  document.getElementById(`step${step}`).style.display = 'block';
  document.querySelectorAll('.progress-step').forEach(el => {
    const stepNum = parseInt(el.dataset.step);
    el.classList.toggle('active', stepNum === step);
    el.classList.toggle('completed', stepNum < step);
  });
  if (step === 4) generateReview();
}

function addIncomeRow() {
  const container = document.getElementById('incomeSourcesContainer');
  const row = document.createElement('div');
  row.className = 'income-row';
  row.innerHTML = `
    <input type="text" class="income-name" placeholder="Source name" required>
    <input type="number" class="income-amount" placeholder="Amount" min="0" step="0.01" required>
    <button class="btn btn-remove" onclick="removeIncomeRow(this)">✕</button>
  `;
  container.appendChild(row);
}

function removeIncomeRow(btn) {
  const rows = document.querySelectorAll('.income-row');
  if (rows.length > 1) {
    btn.parentElement.remove();
  } else {
    alert('At least one income source is required.');
  }
}

function validateIncomeAndNext() {
  const rows = document.querySelectorAll('.income-row');
  let valid = true;
  const incomes = [];
  rows.forEach(row => {
    const name = row.querySelector('.income-name').value.trim();
    const amount = parseFloat(row.querySelector('.income-amount').value);
    if (!name || isNaN(amount) || amount <= 0) {
      valid = false;
      row.classList.add('error');
    } else {
      row.classList.remove('error');
      incomes.push({ name, amount });
    }
  });
  if (!valid) {
    alert('Please fill all income fields with positive amounts.');
    return;
  }
  window.tempIncomes = incomes;
  showStep(2);
}

function renderPredefinedCategories() {
  const container = document.getElementById('expensesContainer');
  container.innerHTML = '';
  predefinedCategories.forEach(cat => {
    const row = document.createElement('div');
    row.className = 'expense-category-row';
    row.innerHTML = `
      <label class="checkbox-label">
        <input type="checkbox" class="expense-check" value="${cat}">
        <span>${cat}</span>
      </label>
      <input type="number" class="expense-amount" placeholder="Amount" min="0" step="0.01" disabled>
    `;
    container.appendChild(row);
  });
  document.querySelectorAll('.expense-check').forEach(check => {
    check.addEventListener('change', (e) => {
      const amountInput = e.target.closest('.expense-category-row').querySelector('.expense-amount');
      if (e.target.checked) {
        amountInput.disabled = false;
      } else {
        amountInput.disabled = true;
        amountInput.value = '';
      }
    });
  });
}

function addCustomCategoryRow() {
  const container = document.getElementById('expensesContainer');
  const row = document.createElement('div');
  row.className = 'expense-category-row custom-category';
  row.innerHTML = `
    <input type="text" class="custom-category-name" placeholder="Category name">
    <input type="number" class="expense-amount" placeholder="Amount" min="0" step="0.01">
    <button class="btn btn-remove" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(row);
}

function validateExpensesAndNext() {
  const rows = document.querySelectorAll('.expense-category-row');
  let valid = true;
  const expenses = [];
  rows.forEach(row => {
    const checkbox = row.querySelector('.expense-check');
    const amountInput = row.querySelector('.expense-amount');
    if (checkbox) {
      if (checkbox.checked) {
        const category = checkbox.value;
        const amount = parseFloat(amountInput.value);
        if (isNaN(amount) || amount <= 0) {
          valid = false;
          row.classList.add('error');
        } else {
          row.classList.remove('error');
          expenses.push({ category, amount });
        }
      }
    } else {
      const nameInput = row.querySelector('.custom-category-name');
      const amount = parseFloat(amountInput.value);
      const name = nameInput ? nameInput.value.trim() : '';
      if (!name || isNaN(amount) || amount <= 0) {
        valid = false;
        row.classList.add('error');
      } else {
        row.classList.remove('error');
        expenses.push({ category: name, amount });
      }
    }
  });
  if (!valid || expenses.length === 0) {
    alert('Please select at least one expense and enter valid amounts.');
    return;
  }
  window.tempExpenses = expenses;
  showStep(3);
}

function toggleChildrenDetails() {
  const hasChildren = document.getElementById('hasChildrenYes').checked;
  document.getElementById('childrenDetails').style.display = hasChildren ? 'block' : 'none';
  if (hasChildren) generateChildrenInputs();
}

function generateChildrenInputs() {
  const num = parseInt(document.getElementById('numChildren').value) || 1;
  const container = document.getElementById('childrenContainer');
  container.innerHTML = '';
  for (let i = 0; i < num; i++) {
    const div = document.createElement('div');
    div.className = 'child-row';
    div.innerHTML = `
      <h4>Child ${i+1}</h4>
      <input type="text" class="child-name" placeholder="Child name" required>
      <input type="number" class="child-school-fees" placeholder="School fees" min="0" step="0.01" required>
      <input type="number" class="child-other-expenses" placeholder="Other expenses" min="0" step="0.01" required>
    `;
    container.appendChild(div);
  }
}

function validateChildrenAndNext() {
  const hasChildren = document.getElementById('hasChildrenYes').checked;
  let children = [];
  if (hasChildren) {
    const rows = document.querySelectorAll('.child-row');
    let valid = true;
    rows.forEach(row => {
      const name = row.querySelector('.child-name').value.trim();
      const schoolFees = parseFloat(row.querySelector('.child-school-fees').value) || 0;
      const otherExpenses = parseFloat(row.querySelector('.child-other-expenses').value) || 0;
      if (!name || schoolFees < 0 || otherExpenses < 0) {
        valid = false;
        row.classList.add('error');
      } else {
        row.classList.remove('error');
        children.push({ name, schoolFees, otherExpenses });
      }
    });
    if (!valid || children.length === 0) {
      alert('Please fill child details correctly.');
      return;
    }
  }
  window.tempChildren = children;
  showStep(4);
}

function generateReview() {
  const incomes = window.tempIncomes || [];
  const expenses = window.tempExpenses || [];
  const children = window.tempChildren || [];
  const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0) + 
    children.reduce((sum, child) => sum + child.schoolFees + child.otherExpenses, 0);
  const savings = totalIncome - totalExpenses;
  
  let html = `<div class="review-summary">
    <p><strong>Total Income:</strong> ${formatCurrency(totalIncome)}</p>
    <p><strong>Total Expenses:</strong> ${formatCurrency(totalExpenses)}</p>
    <p><strong>Savings:</strong> ${formatCurrency(savings)}</p>
  </div>`;
  
  html += '<h3>Income Sources</h3><ul>';
  incomes.forEach(inc => html += `<li>${inc.name}: ${formatCurrency(inc.amount)}</li>`);
  html += '</ul>';
  
  html += '<h3>Bill Expenses</h3><ul>';
  expenses.forEach(exp => html += `<li>${exp.category}: ${formatCurrency(exp.amount)}</li>`);
  html += '</ul>';
  
  if (children.length > 0) {
    html += '<h3>Children</h3><ul>';
    children.forEach(child => {
      html += `<li>${child.name} - School Fees: ${formatCurrency(child.schoolFees)}, Other: ${formatCurrency(child.otherExpenses)}</li>`;
    });
    html += '</ul>';
  }
  
  document.getElementById('reviewSummary').innerHTML = html;
}

function saveData() {
  const user = auth.currentUser;
  if (!user) return;
  
  const monthKey = getMonthKey();
  const monthRef = getUserMonthRef(user.uid, monthKey);
  
  const incomes = window.tempIncomes || [];
  const expenses = window.tempExpenses || [];
  const children = window.tempChildren || [];
  
  const incomeData = incomes.map(inc => ({
    id: generateId(),
    name: inc.name,
    amount: inc.amount
  }));
  const expenseData = expenses.map(exp => ({
    id: generateId(),
    category: exp.category,
    amount: exp.amount
  }));
  const childrenData = children.map(child => ({
    id: generateId(),
    name: child.name,
    schoolFees: child.schoolFees,
    otherExpenses: child.otherExpenses
  }));
  
  monthRef.set({
    income: incomeData,
    expenses: expenseData,
    children: childrenData
  }).then(() => {
    window.location.href = 'dashboard.html';
  }).catch(error => {
    console.error('Save error:', error);
    alert('Failed to save data. Please try again.');
  });
}
