export const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
export let currentYear = new Date().getFullYear();
export let currentMonth = new Date().getMonth();
export let store = JSON.parse(localStorage.getItem('financas-v2') || '{"years":{},"recurring":[]}')
;

export function save(){
  localStorage.setItem('financas-v2', JSON.stringify(store));
}

export function exportData(){
  const blob = new Blob([JSON.stringify(store)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'financas.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

export function importData(e, renderCallback){
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if(data && data.years && data.recurring){
        store = data;
        save();
        if(typeof renderCallback === 'function') renderCallback();
      } else {
        alert('Arquivo inválido');
      }
    } catch(err){
      alert('Erro ao importar');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

export function getYearData(y){
  if(!store.years[y]) store.years[y] = {};
  return store.years[y];
}

export function ensureRecurringTransactions(year, month, data){
  let added = false;
  store.recurring.forEach(r => {
    const start = new Date(r.startDate);
    const startIdx = start.getFullYear()*12 + start.getMonth();
    const targetIdx = year*12 + month;
    const monthKey = `${year}-${String(month+1).padStart(2,'0')}`;
    if(targetIdx >= startIdx && !(r.exceptions && r.exceptions.includes(monthKey))){
      const dateStr = `${monthKey}-${String(r.day).padStart(2,'0')}`;
      if(!data.transactions.some(t=>t.recurringId===r.id)){
        data.transactions.push({
          id: Date.now()+Math.random(),
          date: dateStr,
          category: 'Receita Recorrente',
          subcategory: r.subcategory,
          description: r.description,
          payment: r.payment,
          value: r.value,
          paid: false,
          recurringId: r.id
        });
        added = true;
      }
    }
  });
  if(added) save();
}

export function getMonthData(year, m){
  const yearData = getYearData(year);
  if(!yearData[m]) yearData[m] = { initialBalance: 0, transactions: [] };
  const data = yearData[m];
  ensureRecurringTransactions(year, m, data);
  return data;
}

export function formatMoney(v){
  return 'R$ ' + Number(v).toFixed(2);
}

export function setText(id, text){
  const el = document.getElementById(id);
  if(el) el.textContent = text;
}

export function addMonths(date, monthsToAdd){
  const d = new Date(date);
  d.setMonth(d.getMonth() + monthsToAdd);
  return d;
}

export function renderYearSelect(render){
  const select = document.getElementById('yearSelect');
  if(!select) return;
  select.innerHTML = '';
  for(let y=currentYear-5; y<=currentYear+5; y++){
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if(y===currentYear) opt.selected = true;
    select.appendChild(opt);
  }
  select.onchange = () => {
    currentYear = parseInt(select.value, 10);
    render();
  };
}

export function renderMonthButtons(render){
  const container = document.getElementById('monthButtons');
  if(!container) return;
  container.innerHTML = '';
  months.forEach((m,i) => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-outline-primary month-btn' + (i===currentMonth ? ' active' : '');
    btn.textContent = m.toUpperCase();
    btn.dataset.month = i;
    btn.addEventListener('click', () => {
      currentMonth = i;
      render();
    });
    container.appendChild(btn);
  });
}

export function getBudgetData(year, month){
  const yearData = getYearData(year);
  if(!yearData.budgets) yearData.budgets = {};
  if(!yearData.budgets[month]) yearData.budgets[month] = [];
  return yearData.budgets[month];
}
