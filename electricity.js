let applianceChartInstance = null;
let currentAppliances = [];   // Array of {id, name, watts, hoursPerDay, quantity}
let currentRate = 30;        // PKR per kWh
let currentDays = 30;        // days in month
let dirty = false;           // track unsaved changes

// Default appliance list (common items)
const defaultAppliances = [
  { id: 'light_bulb', name: 'Light Bulb', watts: 60, hoursPerDay: 5, quantity: 0 },
  { id: 'fan', name: 'Fan', watts: 75, hoursPerDay: 10, quantity: 0 },
  { id: 'ac', name: 'AC', watts: 1500, hoursPerDay: 8, quantity: 0 },
  { id: 'fridge', name: 'Fridge', watts: 200, hoursPerDay: 12, quantity: 0 },
  { id: 'computer', name: 'Computer', watts: 200, hoursPerDay: 6, quantity: 0 },
  { id: 'exhaust_fan', name: 'Exhaust Fan', watts: 40, hoursPerDay: 4, quantity: 0 },
  { id: 'tv', name: 'TV', watts: 100, hoursPerDay: 6, quantity: 0 },
  { id: 'washing_machine', name: 'Washing Machine', watts: 500, hoursPerDay: 1, quantity: 0 },
  { id: 'microwave', name: 'Microwave', watts: 1200, hoursPerDay: 0.5, quantity: 0 },
  { id: 'iron', name: 'Iron', watts: 1000, hoursPerDay: 0.5, quantity: 0 }
];

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

  document.getElementById('unitRate').addEventListener('input', (e) => {
    currentRate = parseFloat(e.target.value) || 0;
    updateCalculations();
  });

  document.getElementById('daysInMonth').addEventListener('input', (e) => {
    currentDays = parseInt(e.target.value) || 30;
    updateCalculations();
  });

  document.getElementById('saveElectricityBtn').addEventListener('click', saveData);
}

function loadElectricityData(uid) {
  const electricityRef = database.ref(`users/${uid}/electricity`);
  electricityRef.on('value', (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      currentRate = data.rate || 30;
      currentDays = data.days || 30;
      // Merge with defaults to ensure all appliance types exist
      currentAppliances = data.appliances || [];
      // Fill missing default types
      defaultAppliances.forEach(def => {
        if (!currentAppliances.find(a => a.id === def.id)) {
          currentAppliances.push({ ...def });
        }
      });
      // Remove any custom appliances not in defaults? (keep them)
    } else {
      currentAppliances = defaultAppliances.map(a => ({ ...a }));
      currentRate = 30;
      currentDays = 30;
    }
    document.getElementById('unitRate').value = currentRate;
    document.getElementById('daysInMonth').value = currentDays;
    renderApplianceList();
    updateCalculations();
  });
}

function renderApplianceList() {
  const container = document.getElementById('applianceListContainer');
  container.innerHTML = '';
  if (!currentAppliances.length) {
    container.innerHTML = '<p>No appliances defined.</p>';
    return;
  }
  currentAppliances.forEach(app => {
    const row = document.createElement('div');
    row.className = 'appliance-row';
    row.innerHTML = `
      <div class="appliance-info">
        <span class="appliance-name">${app.name}</span>
      </div>
      <div class="appliance-fields">
        <label>Watts</label>
        <input type="number" class="appliance-watts" value="${app.watts}" min="0" step="1" data-id="${app.id}">
        <label>Hours/day</label>
        <input type="number" class="appliance-hours" value="${app.hoursPerDay}" min="0" step="0.5" data-id="${app.id}">
        <label>Quantity</label>
        <input type="number" class="appliance-quantity" value="${app.quantity}" min="0" step="1" data-id="${app.id}">
      </div>
    `;
    container.appendChild(row);
  });

  // Attach input listeners to update local data and recalc
  container.querySelectorAll('.appliance-watts, .appliance-hours, .appliance-quantity').forEach(input => {
    input.addEventListener('input', (e) => {
      const id = e.target.dataset.id;
      const app = currentAppliances.find(a => a.id === id);
      if (!app) return;
      const field = e.target.classList.contains('appliance-watts') ? 'watts' :
                    e.target.classList.contains('appliance-hours') ? 'hoursPerDay' : 'quantity';
      app[field] = parseFloat(e.target.value) || 0;
      updateCalculations();
    });
  });
}

function updateCalculations() {
  let totalKwh = 0;
  let highest = null;
  const breakdown = []; // For chart

  currentAppliances.forEach(app => {
    const kwh = (app.watts * app.hoursPerDay * app.quantity * currentDays) / 1000;
    totalKwh += kwh;
    breakdown.push({ name: app.name, kwh });
    if (!highest || kwh > highest.kwh) {
      highest = { name: app.name, kwh };
    }
  });

  const totalCost = totalKwh * currentRate;

  document.getElementById('totalConsumption').textContent = totalKwh.toFixed(2) + ' kWh';
  document.getElementById('totalCost').textContent = formatPKR(totalCost);
  document.getElementById('highestConsumer').textContent = highest && highest.kwh > 0 ? `${highest.name} (${highest.kwh.toFixed(2)} kWh)` : '-';

  updateChart(breakdown);
}

function updateChart(breakdown) {
  const ctx = document.getElementById('applianceChart').getContext('2d');
  if (applianceChartInstance) applianceChartInstance.destroy();

  const labels = breakdown.map(b => b.name);
  const data = breakdown.map(b => b.kwh);
  const colors = generateDistinctColors(labels.length);

  if (data.every(v => v === 0)) {
    applianceChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['No Consumption'],
        datasets: [{ data: [1], backgroundColor: ['#e0e0e0'] }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
    return;
  }

  applianceChartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        hoverOffset: 4
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

// Generate distinct colors (reuse from dashboard, but we can copy here)
function generateDistinctColors(count) {
  const colors = [];
  for (let i = 0; i < count; i++) {
    const hue = Math.floor((i * 360) / count);
    const saturation = 70 + (i % 3) * 10;
    const lightness = 45 + (i % 3) * 10;
    colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
  }
  return colors;
}

function saveData() {
  const user = auth.currentUser;
  if (!user) return;
  const electricityRef = database.ref(`users/${user.uid}/electricity`);
  electricityRef.set({
    rate: currentRate,
    days: currentDays,
    appliances: currentAppliances
  }).then(() => {
    alert('Electricity data saved successfully!');
  }).catch(error => {
    console.error('Error saving electricity data:', error);
    alert('Failed to save data.');
  });
}
