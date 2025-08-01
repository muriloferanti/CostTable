const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let store = JSON.parse(localStorage.getItem('financas-v2') || '{"years":{},"recurring":[]}');

function save() {
  localStorage.setItem('financas-v2', JSON.stringify(store));
}

function getYearData(y) {
  if(!store.years[y]) store.years[y] = {};
  return store.years[y];
}

function ensureRecurringTransactions(year, month, data) {
  let added = false;
  store.recurring.forEach(r=>{
    const start = new Date(r.startDate);
    const startIdx = start.getFullYear()*12 + start.getMonth();
    const targetIdx = year*12 + month;
    if(targetIdx >= startIdx) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(r.day).padStart(2,'0')}`;
      if(!data.transactions.some(t=>t.recurringId===r.id)) {
        data.transactions.push({
          id: Date.now()+Math.random(),
          date: dateStr,
          category: 'Receita',
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

function getMonthData(year, m) {
  const yearData = getYearData(year);
  if(!yearData[m]) yearData[m] = { initialBalance: 0, transactions: [] };
  const data = yearData[m];
  ensureRecurringTransactions(year, m, data);
  return data;
}

function formatMoney(v) {
  return 'R$ ' + Number(v).toFixed(2);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function renderYearSelect() {
  const select = document.getElementById('yearSelect');
  if(!select) return;
  select.innerHTML = '';
  for(let y=currentYear-5; y<=currentYear+5; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if(y===currentYear) opt.selected = true;
    select.appendChild(opt);
  }
  select.onchange = ()=> {
    currentYear = parseInt(select.value,10);
    render();
  };
}

function renderMonthButtons() {
  const container = document.getElementById('monthButtons');
  container.innerHTML = '';
  months.forEach((m,i)=>{
    const btn = document.createElement('button');
    btn.className = 'btn btn-outline-primary month-btn'+(i===currentMonth?' active':'');
    btn.textContent = m.toUpperCase();
    btn.dataset.month = i;
    btn.addEventListener('click', ()=>{
      currentMonth = i;
      render();
    });
    container.appendChild(btn);
  });
}

function renderTable() {
  const tbody = document.querySelector('#transactionTable tbody');
  tbody.innerHTML = '';
  const data = getMonthData(currentYear, currentMonth);
  const sorted = [...data.transactions].sort((a,b)=>new Date(a.date) - new Date(b.date));
  let balance = data.initialBalance;
  sorted.forEach(t=>{
    const tr = document.createElement('tr');
    if(!t.paid) tr.classList.add('not-paid');
    const value = Number(t.value);
    if(t.category === 'Receita') balance += value; else balance -= value;
    tr.innerHTML = `
      <td>${t.date}</td>
      <td>${t.category}</td>
      <td>${t.subcategory || ''}</td>
      <td>${t.description || ''}</td>
      <td>${t.payment || ''}</td>
      <td class="${t.category==='Receita'?'value-income':'value-expense'}">${formatMoney(value)}</td>
      <td class="text-center"><input type="checkbox" class="form-check-input paid-toggle" data-id="${t.id}" ${t.paid?'checked':''}></td>
      <td>${formatMoney(balance)}</td>
      <td><button class="btn btn-sm btn-outline-danger delete-btn" data-id="${t.id}"><i class="bi bi-trash"></i></button></td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('.delete-btn').forEach(b=>b.addEventListener('click', deleteTransaction));
  tbody.querySelectorAll('.paid-toggle').forEach(c=>c.addEventListener('change', togglePaid));
}

function recalc() {
  const data = getMonthData(currentYear, currentMonth);
  let receitas=0, investimentos=0, despesas=0, cartao=0;
  let receitasPagas=0, investimentosPagos=0, despesasPagas=0;
  data.transactions.forEach(t=>{
    const v = Number(t.value);
    if(t.category==='Receita') {
      receitas+=v; if(t.paid) receitasPagas+=v;
    } else if(t.category==='Investimento') {
      investimentos+=v; if(t.paid) investimentosPagos+=v;
    } else {
      despesas+=v; if(t.paid) despesasPagas+=v;
    }
    if(t.payment==='Cartão') cartao+=v;
  });
  const saldoMes = receitas - despesas - investimentos;
  const saldoPrevisto = data.initialBalance + saldoMes;
  const saldoAtual = data.initialBalance + receitasPagas - despesasPagas - investimentosPagos;

  setText('receitas', formatMoney(receitas));
  setText('investimentos', formatMoney(investimentos));
  setText('despesas', formatMoney(despesas));
  setText('saldoMes', formatMoney(saldoMes));
  setText('faturaCartao', formatMoney(cartao));

  setText('resumoReceitas', formatMoney(receitas));
  setText('resumoInvestimentos', formatMoney(investimentos));
  setText('resumoDespesas', formatMoney(despesas));
  setText('resumoCartao', formatMoney(cartao));
  setText('saldoAtual', formatMoney(saldoAtual));
  setText('saldoPrevisto', formatMoney(saldoPrevisto));

  const gastos = despesas + investimentos;
  const budget = receitas || 1;
  const percent = Math.min(100, (gastos / budget) * 100);
  const bar = document.getElementById('budgetProgress');
  if (bar) {
    bar.style.width = percent + '%';
    bar.textContent = percent.toFixed(0) + '%';
    bar.classList.toggle('bg-danger', percent >= 100);
  }
}

function addTransaction(e) {
  e.preventDefault();
  const form = e.target;
  if(form.payment.value === 'Cartão') {
    const total = parseFloat(form.value.value);
    const parcelas = parseInt(form.installments.value) || 1;
    const base = Math.floor((total / parcelas) * 100) / 100;
    let restante = total;
    for(let i=0;i<parcelas;i++) {
      const valor = i === parcelas-1 ? restante : base;
      restante -= base;
      const d = addMonths(form.date.value, i);
      const dateStr = d.toISOString().split('T')[0];
      const t = {
        id: Date.now()+i,
        date: dateStr,
        category: form.type.value,
        subcategory: form.subcategory.value,
        description: `${form.description.value || ''} (${i+1}/${parcelas})`,
        payment: form.payment.value,
        value: valor,
        paid: false
      };
      const dataMonth = getMonthData(d.getFullYear(), d.getMonth());
      dataMonth.transactions.push(t);
    }
  } else {
    let recurringId;
    if(form.recurring && form.recurring.checked && form.type.value==='Receita') {
      const recur = {
        id: Date.now(),
        startDate: form.date.value,
        day: new Date(form.date.value).getDate(),
        description: form.description.value,
        payment: form.payment.value,
        value: parseFloat(form.value.value),
        subcategory: form.subcategory.value
      };
      store.recurring.push(recur);
      recurringId = recur.id;
    }
    const t = {
      id: Date.now(),
      date: form.date.value,
      category: form.type.value,
      subcategory: form.subcategory.value,
      description: form.description.value,
      payment: form.payment.value,
      value: parseFloat(form.value.value),
      paid: form.paid.checked,
      ...(recurringId?{recurringId}: {})
    };
    const data = getMonthData(currentYear, currentMonth);
    data.transactions.push(t);
  }
  save();
  form.reset();
  handlePaymentChange();
  render();
}

function deleteTransaction(e) {
  const id = Number(e.currentTarget.dataset.id);
  const data = getMonthData(currentYear, currentMonth);
  const t = data.transactions.find(tr=>tr.id===id);
  if(t && t.recurringId) {
    store.recurring = store.recurring.filter(r=>r.id!==t.recurringId);
    Object.values(store.years).forEach(yearData=>{
      Object.values(yearData).forEach(monthData=>{
        monthData.transactions = monthData.transactions.filter(tr=>tr.recurringId!==t.recurringId);
      });
    });
  }
  data.transactions = data.transactions.filter(t=>t.id!==id);
  save();
  render();
}

function handlePaymentChange() {
  const installments = document.getElementById('installments');
  const value = document.getElementById('value');
  if(document.getElementById('payment').value === 'Cartão') {
    installments.classList.remove('d-none');
    installments.required = true;
    value.placeholder = 'Valor Total';
  } else {
    installments.classList.add('d-none');
    installments.required = false;
    installments.value = 1;
    value.placeholder = 'Valor';
  }
}

function togglePaid(e) {
  const id = Number(e.target.dataset.id);
  const data = getMonthData(currentYear, currentMonth);
  const t = data.transactions.find(t=>t.id===id);
  if(t){
    t.paid = e.target.checked;
    save();
    recalc();
  }
}

function init() {
  renderYearSelect();
  renderMonthButtons();
  document.getElementById('transactionForm').addEventListener('submit', addTransaction);
  document.getElementById('initialBalance').addEventListener('input', e=>{
    const data = getMonthData(currentYear, currentMonth);
    data.initialBalance = parseFloat(e.target.value)||0;
    save();
    render();
  });
  document.getElementById('payment').addEventListener('change', handlePaymentChange);
  handlePaymentChange();
  render();
}

function render() {
  const balanceInput = document.getElementById('initialBalance');
  if (balanceInput) balanceInput.value = getMonthData(currentYear, currentMonth).initialBalance;
  renderYearSelect();
  renderMonthButtons();
  renderTable();
  recalc();
}

document.addEventListener('DOMContentLoaded', init);
