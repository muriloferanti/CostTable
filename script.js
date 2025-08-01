const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
let currentMonth = new Date().getMonth();
let store = JSON.parse(localStorage.getItem('financas-v1') || '{}');

function getMonthData(m) {
  if(!store[m]) store[m] = { initialBalance: 0, transactions: [] };
  return store[m];
}

function save() {
  localStorage.setItem('financas-v1', JSON.stringify(store));
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
  const data = getMonthData(currentMonth);
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
  const data = getMonthData(currentMonth);
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
      const dataMonth = getMonthData(d.getMonth());
      dataMonth.transactions.push(t);
    }
  } else {
    const t = {
      id: Date.now(),
      date: form.date.value,
      category: form.type.value,
      subcategory: form.subcategory.value,
      description: form.description.value,
      payment: form.payment.value,
      value: parseFloat(form.value.value),
      paid: form.paid.checked
    };
    const data = getMonthData(currentMonth);
    data.transactions.push(t);
  }
  save();
  form.reset();
  handlePaymentChange();
  render();
}

function deleteTransaction(e) {
  const id = Number(e.currentTarget.dataset.id);
  const data = getMonthData(currentMonth);
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
  const data = getMonthData(currentMonth);
  const t = data.transactions.find(t=>t.id===id);
  if(t){
    t.paid = e.target.checked;
    save();
    recalc();
  }
}

function init() {
  renderMonthButtons();
  document.getElementById('transactionForm').addEventListener('submit', addTransaction);
  document.getElementById('initialBalance').addEventListener('input', e=>{
    const data = getMonthData(currentMonth);
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
  if (balanceInput) balanceInput.value = getMonthData(currentMonth).initialBalance;
  renderMonthButtons();
  renderTable();
  recalc();
}

document.addEventListener('DOMContentLoaded', init);
