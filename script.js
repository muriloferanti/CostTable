const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let store = JSON.parse(localStorage.getItem('financas-v2') || '{"years":{},"recurring":[]}');
let editing = null;
let chartReceitasDespesas, chartSaldo, chartCategorias;

function save() {
  localStorage.setItem('financas-v2', JSON.stringify(store));
}

function exportData() {
  const blob = new Blob([JSON.stringify(store)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'financas.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importData(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data && data.years && data.recurring) {
        store = data;
        save();
        render();
      } else {
        alert('Arquivo inválido');
      }
    } catch (err) {
      alert('Erro ao importar');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
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
    const monthKey = `${year}-${String(month+1).padStart(2,'0')}`;
    if(targetIdx >= startIdx && !(r.exceptions && r.exceptions.includes(monthKey))) {
      const dateStr = `${monthKey}-${String(r.day).padStart(2,'0')}`;
      if(!data.transactions.some(t=>t.recurringId===r.id)) {
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
  if(!container) return;
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
  if(!tbody) return;
  tbody.innerHTML = '';
  const data = getMonthData(currentYear, currentMonth);
    const sorted = [...data.transactions].sort((a,b)=>new Date(a.date) - new Date(b.date));
    let balance = data.initialBalance;
    sorted.forEach(t=>{
      const tr = document.createElement('tr');
      if(!t.paid) tr.classList.add('not-paid');
      const value = Number(t.value);
      if(t.category === 'Receita' || t.category === 'Receita Recorrente') balance += value; else balance -= value;
      tr.innerHTML = `
      <td>${t.date}</td>
      <td>${t.category}</td>
      <td>${t.subcategory || ''}</td>
      <td>${t.description || ''}</td>
      <td>${t.payment || ''}</td>
      <td class="${(t.category==='Receita' || t.category==='Receita Recorrente')?'value-income':'value-expense'}">${formatMoney(value)}</td>
      <td class="text-center"><input type="checkbox" class="form-check-input paid-toggle" data-id="${t.id}" ${t.paid?'checked':''}></td>
      <td>${formatMoney(balance)}</td>
      <td>
        ${( (!t.recurringId && !t.installmentId && t.category==='Despesa') || t.category==='Receita Recorrente')
          ?`<button class="btn btn-sm btn-outline-secondary edit-btn" data-id="${t.id}"><i class="bi bi-pencil"></i></button>`:''}
        <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${t.id}"><i class="bi bi-trash"></i></button>
      </td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('.delete-btn').forEach(b=>b.addEventListener('click', deleteTransaction));
  tbody.querySelectorAll('.paid-toggle').forEach(c=>c.addEventListener('change', togglePaid));
  tbody.querySelectorAll('.edit-btn').forEach(b=>b.addEventListener('click', startEditTransaction));
}

function recalc() {
  const data = getMonthData(currentYear, currentMonth);
  let receitas=0, investimentos=0, despesas=0, cartao=0;
  let receitasPagas=0, investimentosPagos=0, despesasPagas=0;
  data.transactions.forEach(t=>{
    const v = Number(t.value);
    if(t.category==='Receita' || t.category==='Receita Recorrente') {
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

function renderDashboard() {
  const barCtx = document.getElementById('chartReceitasDespesas');
  if(!barCtx) return;

  const yearData = getYearData(currentYear);
  const receitas = [], despesas = [], investimentos = [], saldos = [];
  for(let m=0; m<12; m++){
    const md = yearData[m];
    let r=0, d=0, i=0;
    if(md){
      md.transactions.forEach(t=>{
        const v = Number(t.value);
        if(t.category==='Receita' || t.category==='Receita Recorrente') r+=v;
        else if(t.category==='Investimento') i+=v;
        else d+=v;
      });
    }
    receitas.push(r);
    despesas.push(d);
    investimentos.push(i);
    saldos.push(r - d - i);
  }

  if(chartReceitasDespesas) chartReceitasDespesas.destroy();
  chartReceitasDespesas = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        { label: 'Receitas', data: receitas, backgroundColor: 'rgba(75, 192, 192, 0.5)' },
        { label: 'Despesas', data: despesas, backgroundColor: 'rgba(255, 99, 132, 0.5)' },
        { label: 'Investimentos', data: investimentos, backgroundColor: 'rgba(54, 162, 235, 0.5)' }
      ]
    }
  });

  const lineCtx = document.getElementById('chartSaldo');
  if(lineCtx){
    if(chartSaldo) chartSaldo.destroy();
    chartSaldo = new Chart(lineCtx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{ label: 'Saldo', data: saldos, borderColor: 'rgba(75, 192, 192, 1)', fill: false }]
      }
    });
  }

  const pieCtx = document.getElementById('chartCategorias');
  if(pieCtx){
    const monthData = getMonthData(currentYear, currentMonth);
    const catTotals = {};
    monthData.transactions.forEach(t=>{
      if(t.category==='Despesa'){
        const key = t.subcategory || 'Outras';
        catTotals[key] = (catTotals[key]||0) + Number(t.value);
      }
    });
    const labels = Object.keys(catTotals);
    const values = Object.values(catTotals);
    const palette = ['#ff6384','#36a2eb','#ffce56','#4bc0c0','#9966ff','#ff9f40','#c9cbcf'];
    const colors = labels.map((_,i)=>palette[i%palette.length]);
    if(chartCategorias) chartCategorias.destroy();
    chartCategorias = new Chart(pieCtx, {
      type: 'pie',
      data: { labels, datasets: [{ data: values, backgroundColor: colors }] },
      options: { plugins: { legend: { position: 'bottom' } } }
    });
  }
}

function addTransaction(e) {
  e.preventDefault();
  const form = e.target;
  if(editing) {
    const { id, year, month } = editing;
    const oldData = getMonthData(year, month);
    const t = oldData.transactions.find(tr=>tr.id===id);
    if(t) {
      const newDate = new Date(form.date.value);
      const newYear = newDate.getFullYear();
      const newMonth = newDate.getMonth();
      Object.assign(t, {
        date: form.date.value,
        category: form.type.value,
        subcategory: form.subcategory.value,
        description: form.description.value,
        payment: form.payment.value,
        value: parseFloat(form.value.value),
        paid: form.paid.checked
      });
      if(newYear !== year || newMonth !== month) {
        oldData.transactions = oldData.transactions.filter(tr=>tr.id!==id);
        const newData = getMonthData(newYear, newMonth);
        newData.transactions.push(t);
      }
      save();
    }
    editing = null;
    form.reset();
    handlePaymentChange();
    const submitBtn = form.querySelector('button[type="submit"]');
    if(submitBtn) submitBtn.textContent = 'Adicionar';
    render();
    return;
  }
  const paymentType = form.payment.value;
  const total = parseFloat(form.value.value);
  const parcelas = parseInt(form.installments.value) || 1;
  const valorParcela = parseFloat(form.installmentValue.value);
  if((paymentType === 'Cartão' || paymentType === 'Emprestimo') && isNaN(total) && isNaN(valorParcela)) {
    alert('Informe o valor total ou da parcela');
    return;
  }
  if(paymentType !== 'Cartão' && paymentType !== 'Emprestimo' && isNaN(total)) {
    alert('Informe o valor');
    return;
  }
  if(paymentType === 'Cartão') {
    const groupId = Date.now();
    if(!isNaN(valorParcela)) {
      for(let i=0;i<parcelas;i++) {
        const d = addMonths(form.date.value, i + 1);
        const dateStr = d.toISOString().split('T')[0];
        const t = {
          id: groupId + i,
          date: dateStr,
          category: form.type.value,
          subcategory: form.subcategory.value,
          description: `${form.description.value || ''} (${i+1}/${parcelas})`,
          payment: paymentType,
          value: valorParcela,
          paid: false,
          installmentId: groupId,
          installmentNumber: i + 1,
          installments: parcelas
        };
        const dataMonth = getMonthData(d.getFullYear(), d.getMonth());
        dataMonth.transactions.push(t);
      }
    } else {
      const base = Math.floor((total / parcelas) * 100) / 100;
      let restante = total;
      for(let i=0;i<parcelas;i++) {
        const valor = i === parcelas-1 ? restante : base;
        restante -= base;
        const d = addMonths(form.date.value, i + 1);
        const dateStr = d.toISOString().split('T')[0];
        const t = {
          id: groupId + i,
          date: dateStr,
          category: form.type.value,
          subcategory: form.subcategory.value,
          description: `${form.description.value || ''} (${i+1}/${parcelas})`,
          payment: paymentType,
          value: valor,
          paid: false,
          installmentId: groupId,
          installmentNumber: i + 1,
          installments: parcelas
        };
        const dataMonth = getMonthData(d.getFullYear(), d.getMonth());
        dataMonth.transactions.push(t);
      }
    }
  } else if(paymentType === 'Emprestimo') {
    const groupId = Date.now();
    if(!isNaN(valorParcela)) {
      for(let i=0;i<parcelas;i++) {
        const d = addMonths(form.date.value, i + 1);
        const dateStr = d.toISOString().split('T')[0];
        const t = {
          id: groupId + i,
          date: dateStr,
          category: form.type.value,
          subcategory: form.subcategory.value,
          description: `${form.description.value || ''} (${i+1}/${parcelas})`,
          payment: paymentType,
          value: valorParcela,
          paid: false,
          installmentId: groupId,
          installmentNumber: i + 1,
          installments: parcelas
        };
        const dataMonth = getMonthData(d.getFullYear(), d.getMonth());
        dataMonth.transactions.push(t);
      }
    } else {
      const principal = total;
      const rate = parseFloat(form.interest.value) / 100 || 0;
      const monthly = rate ? principal * rate / (1 - Math.pow(1 + rate, -parcelas)) : principal / parcelas;
      let balance = principal;
      for(let i=0;i<parcelas;i++) {
        const interestPortion = Math.round(balance * rate * 100) / 100;
        let valor = Math.round(monthly * 100) / 100;
        if(i === parcelas-1) valor = Math.round((balance + interestPortion) * 100) / 100;
        balance = Math.round((balance + interestPortion - valor) * 100) / 100;
        const d = addMonths(form.date.value, i + 1);
        const dateStr = d.toISOString().split('T')[0];
        const t = {
          id: groupId + i,
          date: dateStr,
          category: form.type.value,
          subcategory: form.subcategory.value,
          description: `${form.description.value || ''} (${i+1}/${parcelas})`,
          payment: paymentType,
          value: valor,
          paid: false,
          installmentId: groupId,
          installmentNumber: i + 1,
          installments: parcelas
        };
        const dataMonth = getMonthData(d.getFullYear(), d.getMonth());
        dataMonth.transactions.push(t);
      }
    }
  } else {
    const data = getMonthData(currentYear, currentMonth);
    let recurringId;
    if(form.type.value==='Receita Recorrente') {
      const recur = {
        id: Date.now(),
        startDate: form.date.value,
        day: new Date(form.date.value).getDate(),
        description: form.description.value,
        payment: form.payment.value,
        value: parseFloat(form.value.value),
        subcategory: form.subcategory.value,
        exceptions: []
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
    data.transactions.push(t);
  }
  save();
  form.reset();
  handlePaymentChange();
  render();
}

function startEditTransaction(e) {
  const id = Number(e.currentTarget.dataset.id);
  const data = getMonthData(currentYear, currentMonth);
  const t = data.transactions.find(tr=>tr.id===id);
  if(!t) return;
  editing = { id, year: currentYear, month: currentMonth };
  const form = document.getElementById('transactionForm');
  if(!form) return;
  form.date.value = t.date;
  form.type.value = t.category;
  form.subcategory.value = t.subcategory || '';
  form.description.value = t.description || '';
  form.payment.value = t.payment || '';
  form.value.value = t.value;
  form.paid.checked = !!t.paid;
  handlePaymentChange();
  const submitBtn = form.querySelector('button[type="submit"]');
  if(submitBtn) submitBtn.textContent = 'Salvar';
}

function deleteTransaction(e) {
  const id = Number(e.currentTarget.dataset.id);
  const data = getMonthData(currentYear, currentMonth);
  const t = data.transactions.find(tr=>tr.id===id);
  if(!t) return;
  const monthKey = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}`;
  if(t.recurringId) {
    const removeAll = confirm('Excluir este lançamento recorrente de todos os meses? Clique em OK para todos, ou Cancelar para apenas este mês.');
    if(removeAll) {
      store.recurring = store.recurring.filter(r=>r.id!==t.recurringId);
      Object.values(store.years).forEach(yearData=>{
        Object.values(yearData).forEach(monthData=>{
          monthData.transactions = monthData.transactions.filter(tr=>tr.recurringId!==t.recurringId);
        });
      });
    } else {
      const duplicates = data.transactions.filter(tr=>tr.recurringId===t.recurringId);
      if(duplicates.length > 1) {
        data.transactions = data.transactions.filter(tr=>tr.id!==id);
      } else {
        const recur = store.recurring.find(r=>r.id===t.recurringId);
        if(recur) {
          if(!recur.exceptions) recur.exceptions = [];
          if(!recur.exceptions.includes(monthKey)) recur.exceptions.push(monthKey);
        }
        data.transactions = data.transactions.filter(tr=>tr.id!==id);
      }
    }
    save();
    render();
    return;
  }
  if(t.installmentId) {
    const removeAll = confirm('Excluir todas as parcelas desta despesa? Clique em OK para todas, ou Cancelar para apenas esta.');
    if(removeAll) {
      Object.values(store.years).forEach(yearData=>{
        Object.values(yearData).forEach(monthData=>{
          monthData.transactions = monthData.transactions.filter(tr=>tr.installmentId!==t.installmentId);
        });
      });
    } else {
      data.transactions = data.transactions.filter(tr=>tr.id!==id);
    }
    save();
    render();
    return;
  }
  data.transactions = data.transactions.filter(tr=>tr.id!==id);
  save();
  render();
}

function handlePaymentChange() {
  const installments = document.getElementById('installments');
  const installmentValue = document.getElementById('installmentValue');
  const value = document.getElementById('value');
  const interest = document.getElementById('interest');
  const payment = document.getElementById('payment').value;
  if(payment === 'Cartão' || payment === 'Emprestimo') {
    installments.classList.remove('d-none');
    installments.required = true;
    if(installmentValue) installmentValue.classList.remove('d-none');
    value.required = false;
    if(payment === 'Emprestimo') {
      if(interest){
        interest.classList.remove('d-none');
        interest.required = false;
      }
      value.placeholder = 'Valor do Empréstimo';
    } else {
      if(interest){
        interest.classList.add('d-none');
        interest.required = false;
        interest.value = '';
      }
      value.placeholder = 'Valor Total';
    }
  } else {
    installments.classList.add('d-none');
    installments.required = false;
    installments.value = 1;
    if(installmentValue){
      installmentValue.classList.add('d-none');
      installmentValue.value = '';
    }
    value.placeholder = 'Valor';
    value.required = true;
    if(interest){
      interest.classList.add('d-none');
      interest.required = false;
      interest.value = '';
    }
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
  const form = document.getElementById('transactionForm');
  if (form) form.addEventListener('submit', addTransaction);
  const balanceInput = document.getElementById('initialBalance');
  if (balanceInput) balanceInput.addEventListener('input', e=>{
    const data = getMonthData(currentYear, currentMonth);
    data.initialBalance = parseFloat(e.target.value)||0;
    save();
    render();
  });
  const paymentSelect = document.getElementById('payment');
  if (paymentSelect) paymentSelect.addEventListener('change', handlePaymentChange);
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) exportBtn.addEventListener('click', exportData);
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');
  if (importBtn && importFile) {
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', importData);
  }
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
  renderDashboard();
}

document.addEventListener('DOMContentLoaded', init);
