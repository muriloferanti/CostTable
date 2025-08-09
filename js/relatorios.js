import { months, currentYear, currentMonth, getYearData, getMonthData, renderYearSelect, renderMonthButtons } from './common.js';

let reportChart, reportSaldoChart, reportPieChart;

function renderReports(){
  const filterSelect = document.getElementById('typeFilter');
  if(!filterSelect) return;
  const filter = filterSelect.value;
  const yearData = getYearData(currentYear);
  const receitas = [], despesas = [], investimentos = [], saldos = [];
  for(let m=0; m<12; m++){
    const md = yearData[m];
    let r=0,d=0,i=0;
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

  const barCtx = document.getElementById('reportChart');
  if(barCtx){
    const datasets = [];
    if(filter==='Todos' || filter==='Receita') datasets.push({label:'Receitas', data:receitas, backgroundColor:'rgba(75, 192, 192, 0.5)'});
    if(filter==='Todos' || filter==='Despesa') datasets.push({label:'Despesas', data:despesas, backgroundColor:'rgba(255, 99, 132, 0.5)'});
    if(filter==='Todos' || filter==='Investimento') datasets.push({label:'Investimentos', data:investimentos, backgroundColor:'rgba(54, 162, 235, 0.5)'});
    if(reportChart) reportChart.destroy();
    reportChart = new Chart(barCtx, { type:'bar', data:{ labels: months, datasets } });
  }

  const lineCtx = document.getElementById('reportSaldoChart');
  if(lineCtx){
    let data, label;
    if(filter==='Receita'){ data = receitas; label = 'Receitas'; }
    else if(filter==='Despesa'){ data = despesas; label = 'Despesas'; }
    else if(filter==='Investimento'){ data = investimentos; label = 'Investimentos'; }
    else { data = saldos; label = 'Saldo'; }
    if(reportSaldoChart) reportSaldoChart.destroy();
    reportSaldoChart = new Chart(lineCtx, {
      type:'line',
      data:{ labels: months, datasets:[{ label, data, borderColor:'rgba(75, 192, 192, 1)', fill:false }] }
    });
  }

  const pieCtx = document.getElementById('reportPieChart');
  if(pieCtx){
    const monthData = getMonthData(currentYear, currentMonth);
    const catTotals = {};
    monthData.transactions.forEach(t=>{
      const v = Number(t.value);
      if(filter==='Todos'){
        if(t.category==='Despesa'){ const key=t.subcategory||'Outras'; catTotals[key]=(catTotals[key]||0)+v; }
      } else if(filter==='Despesa' && t.category==='Despesa'){
        const key=t.subcategory||'Outras'; catTotals[key]=(catTotals[key]||0)+v;
      } else if(filter==='Receita' && (t.category==='Receita' || t.category==='Receita Recorrente')){
        const key=t.subcategory||'Outras'; catTotals[key]=(catTotals[key]||0)+v;
      } else if(filter==='Investimento' && t.category==='Investimento'){
        const key=t.subcategory||'Outras'; catTotals[key]=(catTotals[key]||0)+v;
      }
    });
    const labels = Object.keys(catTotals);
    const values = Object.values(catTotals);
    const palette = ['#ff6384','#36a2eb','#ffce56','#4bc0c0','#9966ff','#ff9f40','#c9cbcf'];
    const colors = labels.map((_,i)=>palette[i%palette.length]);
    if(reportPieChart) reportPieChart.destroy();
    reportPieChart = new Chart(pieCtx, {
      type:'pie',
      data:{ labels, datasets:[{ data: values, backgroundColor: colors }] },
      options:{ plugins:{ legend:{ position:'bottom' } } }
    });
  }
}

function render(){
  renderYearSelect(render);
  renderMonthButtons(render);
  renderReports();
}

document.addEventListener('DOMContentLoaded', () => {
  const filterSelect = document.getElementById('typeFilter');
  if(filterSelect) filterSelect.addEventListener('change', render);
  render();
});
