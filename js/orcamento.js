import { currentYear, currentMonth, save, getMonthData, getBudgetData, renderYearSelect, renderMonthButtons, formatMoney } from './common.js';

function render(){
  renderYearSelect(render);
  renderMonthButtons(render);
  renderTable();
}

function renderTable(){
  const tbody = document.querySelector('#budgetTable tbody');
  if(!tbody) return;
  tbody.innerHTML = '';
  const budgets = getBudgetData(currentYear, currentMonth);
  const transactions = getMonthData(currentYear, currentMonth).transactions;
  budgets.forEach(b => {
    const gasto = transactions.filter(t => t.category === b.category && (t.subcategory || '') === (b.subcategory || ''))
      .reduce((sum, t) => sum + Number(t.value), 0);
    const percent = b.amount ? Math.min(100, (gasto / b.amount) * 100) : 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.category}</td>
      <td>${b.subcategory || ''}</td>
      <td>${formatMoney(b.amount)}</td>
      <td>
        <div class="progress">
          <div class="progress-bar ${percent>=100?'bg-danger':''}" style="width:${percent}%">
            ${formatMoney(gasto)}
          </div>
        </div>
      </td>
      <td><button class="btn btn-sm btn-outline-danger delete-btn" data-id="${b.id}"><i class="bi bi-trash"></i></button></td>
    `;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', deleteBudget));
}

function addBudget(e){
  e.preventDefault();
  const form = e.target;
  const budgets = getBudgetData(currentYear, currentMonth);
  budgets.push({
    id: Date.now(),
    category: form.category.value,
    subcategory: form.subcategory.value,
    amount: parseFloat(form.amount.value) || 0
  });
  save();
  form.reset();
  renderTable();
}

function deleteBudget(e){
  const id = Number(e.target.closest('button').dataset.id);
  const budgets = getBudgetData(currentYear, currentMonth);
  const idx = budgets.findIndex(b => b.id === id);
  if(idx >= 0){
    budgets.splice(idx,1);
    save();
    renderTable();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  render();
  const form = document.getElementById('budgetForm');
  if(form) form.addEventListener('submit', addBudget);
});
