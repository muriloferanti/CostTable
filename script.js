let saldoInicial = 3300;
let lancamentos = JSON.parse(localStorage.getItem("lancamentos")) || [];

function atualizarResumo() {
    let receitas = 0;
    let despesas = 0;

    lancamentos.forEach(l => {
        let valor = parseFloat(l.valor);
        if (valor > 0) receitas += valor;
        else despesas += Math.abs(valor);
    });

    document.getElementById("receitas").innerText = `R$ ${receitas.toFixed(2)}`;
    document.getElementById("despesas").innerText = `R$ ${despesas.toFixed(2)}`;
    document.getElementById("saldoAtual").innerText = `R$ ${(saldoInicial + receitas - despesas).toFixed(2)}`;
}

function renderTabela() {
    let tbody = document.getElementById("tabelaLancamentos");
    tbody.innerHTML = "";
    let saldo = saldoInicial;

    lancamentos.forEach((l, index) => {
        saldo += parseFloat(l.valor);

        let tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${l.data}</td>
            <td>${l.categoria}</td>
            <td>${l.subcategoria}</td>
            <td>${l.descricao}</td>
            <td>${l.formaPagamento}</td>
            <td>R$ ${parseFloat(l.valor).toFixed(2)}</td>
            <td>${l.pago}</td>
            <td>R$ ${saldo.toFixed(2)}</td>
            <td><button class="btn btn-danger btn-sm" onclick="removerLancamento(${index})">Excluir</button></td>
        `;
        tbody.appendChild(tr);
    });

    atualizarResumo();
}

function adicionarLancamento() {
    let data = document.getElementById("data").value;
    let categoria = document.getElementById("categoria").value;
    let subcategoria = document.getElementById("subcategoria").value;
    let descricao = document.getElementById("descricao").value;
    let formaPagamento = document.getElementById("formaPagamento").value;
    let valor = document.getElementById("valor").value;
    let pago = document.getElementById("pago").value;

    if (!data || !valor) {
        alert("Preencha pelo menos a data e o valor.");
        return;
    }

    lancamentos.push({ data, categoria, subcategoria, descricao, formaPagamento, valor, pago });
    localStorage.setItem("lancamentos", JSON.stringify(lancamentos));

    renderTabela();

    document.querySelectorAll("input, select").forEach(el => el.value = "");
}

function removerLancamento(index) {
    lancamentos.splice(index, 1);
    localStorage.setItem("lancamentos", JSON.stringify(lancamentos));
    renderTabela();
}

renderTabela();
