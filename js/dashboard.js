import { months, currentYear, currentMonth, getYearData, getMonthData, renderYearSelect, renderMonthButtons } from './common.js';

let chartReceitasDespesas, chartSaldo, chartCategorias;

function renderDashboard(){
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

function render(){
  renderYearSelect(render);
  renderMonthButtons(render);
  renderDashboard();
}

document.addEventListener('DOMContentLoaded', render);
