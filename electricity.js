let applianceChartInstance = null;
let currentAppliances = [];
let currentRate = 30; // PKR per kWh
let currentDays = 30;

document.addEventListener('DOMContentLoaded', () => {
  auth.onAuthStateChanged(user => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }
    loadElectricityData(user.uid);
    setupEventListeners();
  });
});

function setupEventListeners() {
  document.getElementById('logoutBtn').addEventListener('click', () => {
    auth.signOut().then(() => window.location.href = 'index.html');
  });
  
  document.getElementById('applianceForm').addEventListener('submit', saveAppliance);
  
  document.getElementById('unitRate').addEventListener('change', (e) => {
    currentRate = parseFloat(e.target.value) || 0;
    saveSettings();
    updateCalculations();
  });
  
  document.getElementById('daysInMonth').addEventListener('change', (e) => {
    currentDays = parseInt(e.target.value) || 30;
    saveSettings();
    updateCalculations();
  });
}

function loadElectricityData(uid) {
  const electricityRef = database.ref(`users/${uid}/electricity`);
  electricityRef.on('value', (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      currentAppliances = data.appliances || [];
      currentRate = data.rate || 30;
      currentDays = data.days || 30;
      document.getElementById('unitRate').value = currentRate;
      document.getElementById('daysInMonth').value = currentDays;
    } else {
      currentAppliances = [];
      currentRate = 30;
      currentDays = 30;
      document.getElementById('unitRate').value = currentRate;
      document.getElementById('daysInMonth').value = currentDays;
    }
    renderAppliances();
    updateCalculations();
  });
}

function saveSettings() {
  const user = auth.currentUser;
  if (!user) return;
  const electricityRef = database.ref(`users/${user.uid}/electricity`);
  electricityRef.update({
    rate: currentRate,
    days: currentDays
  }).catch(error => console.error('Error saving settings:', error));
}

function saveAppliance(e) {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return;
  
  const id = document.getElementById('applianceId').value;
  const name = document.getElementById('applianceName').value.trim();
  const watts = parseFloat(document.getElementById('applianceWatts').value);
  const hours = parseFloat(document.getElementById('applianceHours').value);
  
  if (!name || isNaN(watts) || watts <= 0 || isNaN(hours) || hours <= 0) {
    alert('Please fill all appliance fields correctly.');
    return;
  }
  
  const appliance = {
    id: id || generateId(),
    name,
    watts,
    hoursPerDay: hours
  };
  
  const electricityRef = database.ref(`users/${user.uid}/electricity/appliances`);
  electricityRef.once('value').then(snapshot => {
    let appliances = snapshot.val() || [];
    if (id) {
      appliances = appliances.map(item => item.id === id ? appliance : item);
    } else {
      appliances.push(appliance);
    }
    return electricityRef.set(appliances);
  }).then(() => {
    document.getElementById('applianceForm').reset();
    document.getElementById('applianceId').value = '';
    document.getElementById('saveApplianceBtn').textContent = 'Add Appliance';
  }).catch(error => {
    console.error('Error saving appliance:', error);
    alert('Failed to save appliance.');
  });
}

function renderAppliances() {
  const list = document.getElementById('applianceList');
  list.innerHTML = '';
  if (currentAppliances.length === 0) {
    list.innerHTML = '<li class="data-item">No appliances added yet.</li>';
    return;
  }
  currentAppliances.forEach(app => {
    const monthlyKwh = (app.watts * app.hoursPerDay * currentDays) / 1000;
    const cost = monthlyKwh * currentRate;
    const li = document.createElement('li');
    li.className = 'data-item';
    li.innerHTML = `
      <span class="item-name">${app.name} (${app.watts}W, ${app.hoursPerDay}h/day)</span>
      <span class="item-amount">${monthlyKwh.toFixed(2)} kWh / ${formatPKR(cost)}</span>
      <span class="item-actions">
        <button class="btn-icon" onclick="editAppliance('${app.id}')">✏️</button>
        <button class="btn-icon" onclick="deleteAppliance('${app.id}')">🗑️</button>
      </span>
    `;
    list.appendChild(li);
  });
}

function updateCalculations() {
  const totalKwh = currentAppliances.reduce((sum, app) => sum + (app.watts * app.hoursPerDay * currentDays) / 1000, 0);
  const totalCost = totalKwh * currentRate;
  
  document.getElementById('totalConsumption').textContent = totalKwh.toFixed(2) + ' kWh';
  document.getElementById('totalCost').textContent = formatPKR(totalCost);
  
  let highest = null;
  if (currentAppliances.length > 0) {
    highest = currentAppliances.reduce((max, app) => {
      const kwh = (app.watts * app.hoursPerDay * currentDays) / 1000;
      if (!max || kwh > max.kwh) return { name: app.name, kwh };
      return max;
    }, null);
    document.getElementById('highestConsumer').textContent = highest ? `${highest.name} (${highest.kwh.toFixed(2)} kWh)` : '-';
  } else {
    document.getElementById('highestConsumer').textContent = '-';
  }
  
  updateChart();
}

function updateChart() {
  const ctx = document.getElementById('applianceChart').getContext('2d');
  if (applianceChartInstance) applianceChartInstance.destroy();
  
  if (currentAppliances.length === 0) {
    applianceChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['No Appliances'],
        datasets: [{
          data: [1],
          backgroundColor: ['#e0e0e0']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
    return;
  }
  
  const labels = currentAppliances.map(a => a.name);
  const data = currentAppliances.map(a => (a.watts * a.hoursPerDay * currentDays) / 1000);
  
  applianceChartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#8BC34A', '#E91E63', '#00BCD4']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right' },
        tooltip: {
          callbacks: {
            label: function(context) {
              const kwh = context.parsed;
              const cost = kwh * currentRate;
              return `${context.label}: ${kwh.toFixed(2)} kWh (${formatPKR(cost)})`;
            }
          }
        }
      }
    }
  });
}

function editAppliance(id) {
  const app = currentAppliances.find(a => a.id === id);
  if (!app) return;
  document.getElementById('applianceId').value = app.id;
  document.getElementById('applianceName').value = app.name;
  document.getElementById('applianceWatts').value = app.watts;
  document.getElementById('applianceHours').value = app.hoursPerDay;
  document.getElementById('saveApplianceBtn').textContent = 'Update Appliance';
  window.scrollTo(0, 0);
}

function deleteAppliance(id) {
  if (!confirm('Delete this appliance?')) return;
  const user = auth.currentUser;
  if (!user) return;
  const electricityRef = database.ref(`users/${user.uid}/electricity/appliances`);
  electricityRef.once('value').then(snapshot => {
    let appliances = snapshot.val() || [];
    appliances = appliances.filter(item => item.id !== id);
    return electricityRef.set(appliances);
  }).catch(error => console.error(error));
}

// Expose functions
window.editAppliance = editAppliance;
window.deleteAppliance = deleteAppliance;
