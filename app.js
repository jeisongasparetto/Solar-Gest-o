// ===== TOAST =====
function toast(msg, type = "success", duration = 3000) {
  const container = document.getElementById("toast-container");
  const el = document.createElement("div");
  el.className = "toast" + (type !== "success" ? " " + type : "");
  el.textContent = msg;
  container.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("show")));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ===== ESTADO =====
let qtdCasas = 4;
let historicoEditandoIndex = null;

// ===== UTILITÁRIOS =====
function moeda(valor) {
  const n = Number(valor) || 0;
  return "R$ " + n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function numero(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  let v = String(el.value || "0").trim();
  v = v.replace(/R\$/gi, "").replace(/\s/g, "");
  if (v.includes(",")) {
    v = v.replace(/\./g, "").replace(",", ".");
  }
  v = v.replace(/[^0-9.\-]/g, "");
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function valor(id) {
  const el = document.getElementById(id);
  return el ? (el.value || "") : "";
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ===== LINHAS DA TABELA =====
function criarLinha(i) {
  const tr = document.createElement("tr");
  tr.setAttribute("data-row", i);
  tr.innerHTML = `
    <td><input id="casa${i}" value="Casa ${i}" /></td>
    <td><input id="uc${i}" placeholder="UC" /></td>
    <td><input id="inq${i}" placeholder="Nome" /></td>
    <td><input id="consumo${i}" class="money-input" placeholder="0,00" /></td>
    <td><input id="injetado${i}" class="money-input" placeholder="0,00" /></td>
    <td class="result" id="desconto${i}">R$ 0,00</td>
    <td class="result economy" id="economia${i}">R$ 0,00</td>
    <td class="result total" id="pagar${i}">R$ 0,00</td>
    <td><button class="btn small" data-msg="${i}">Copiar</button></td>
  `;
  tr.querySelectorAll("input").forEach(inp => inp.addEventListener("input", calcular));
  tr.querySelector("[data-msg]").addEventListener("click", () => copiarTexto(gerarMensagemCasa(i)));
  return tr;
}

function renderLinhas(dadosCasas) {
  const tbody = document.getElementById("casasTbody");
  tbody.innerHTML = "";
  for (let i = 1; i <= qtdCasas; i++) {
    tbody.appendChild(criarLinha(i));
  }
  if (dadosCasas) {
    dadosCasas.forEach((c, idx) => {
      const i = idx + 1;
      if (i > qtdCasas) return;
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ""; };
      set("casa" + i, c.casa || ("Casa " + i));
      set("uc" + i, c.uc);
      set("inq" + i, c.inquilino);
      set("consumo" + i, c.consumo);
      set("injetado" + i, c.injetado);
    });
  }
}

function adicionarCasa() {
  qtdCasas++;
  document.getElementById("casasTbody").appendChild(criarLinha(qtdCasas));
  calcular();
  toast("Casa " + qtdCasas + " adicionada.");
}

function removerCasa() {
  if (qtdCasas <= 1) { toast("Mínimo de 1 casa.", "warn"); return; }
  const tbody = document.getElementById("casasTbody");
  const rows = tbody.querySelectorAll("tr");
  if (rows.length) tbody.removeChild(rows[rows.length - 1]);
  qtdCasas--;
  calcular();
  toast("Casa " + (qtdCasas + 1) + " removida.");
}

// ===== CÁLCULO =====
function calcular() {
  const percentual = numero("desconto") / 100;
  let totalConsumo = 0, totalInjetado = 0, totalDesconto = 0, totalPagar = 0, totalEconomia = 0;

  for (let i = 1; i <= qtdCasas; i++) {
    const consumo  = numero("consumo" + i);
    const injetado = numero("injetado" + i);
    const desconto = injetado * percentual;
    const pagar    = injetado - desconto;
    const economia = desconto;

    totalConsumo   += consumo;
    totalInjetado  += injetado;
    totalDesconto  += desconto;
    totalPagar     += pagar;
    totalEconomia  += economia;

    setText("desconto" + i, moeda(desconto));
    setText("economia" + i, moeda(economia));
    setText("pagar" + i, moeda(pagar));
  }

  setText("kpiConsumo",  moeda(totalConsumo));
  setText("kpiInjetado", moeda(totalInjetado));
  setText("kpiReceber",  moeda(totalPagar));
  setText("kpiEconomia", moeda(totalEconomia));

  setText("totalConsumoTabela",  moeda(totalConsumo));
  setText("totalInjetadoTabela", moeda(totalInjetado));
  setText("totalDescontoTabela", moeda(totalDesconto));
  setText("totalEconomiaTabela", moeda(totalEconomia));
  setText("totalPagarTabela",    moeda(totalPagar));

  salvarAutomatico();
}

// ===== DADOS POR CASA =====
function dadosCasa(i) {
  const percentual = numero("desconto") / 100;
  const injetado   = numero("injetado" + i);
  const desconto   = injetado * percentual;
  const pagar      = injetado - desconto;

  return {
    casa:      valor("casa" + i) || ("Casa " + i),
    uc:        valor("uc" + i) || "não informada",
    inquilino: valor("inq" + i) || "",
    consumo:   numero("consumo" + i),
    injetado,
    desconto,
    economia:  desconto,
    pagar
  };
}

// ===== MENSAGENS WHATSAPP =====
function gerarMensagemCasa(i) {
  calcular();

  const mesBruto = valor("mes") || "";
  let mes = "mês não informado";

  if (mesBruto.includes("-")) {
    const [ano, numeroMes] = mesBruto.split("-");
    const meses = [
      "Janeiro", "Fevereiro", "Março", "Abril",
      "Maio", "Junho", "Julho", "Agosto",
      "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    mes = `${meses[Number(numeroMes) - 1]}/${ano}`;
  }

  const d = dadosCasa(i);
  const nome = d.inquilino ? d.inquilino : d.casa;

  return `☀️ ENERGIA SOLAR – ${mes}

Imóvel: ${nome.toUpperCase()}
Unidade consumidora: ${d.uc}

Consumo da fatura: ${moeda(d.consumo)}
Compensado pelo solar: ${moeda(d.injetado)}
Desconto concedido: ${moeda(d.economia)}

✅ Valor a pagar no aluguel: ${moeda(d.pagar)}`;
}

function gerarMensagemGeral() {
  calcular();
  const mesBruto = valor("mes") || "";

let mes = "mês não informado";

if (mesBruto.includes("-")) {
  const [ano, numeroMes] = mesBruto.split("-");

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril",
    "Maio", "Junho", "Julho", "Agosto",
    "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  mes = `${meses[Number(numeroMes) - 1]}/${ano}`;
}
  const desc = valor("desconto") || "10";
  let msg = `☀️ RESUMO ENERGIA SOLAR – ${mes}
Desconto aplicado: ${desc}%

`;

  for (let i = 1; i <= qtdCasas; i++) {
    const d    = dadosCasa(i);
    const nome = d.inquilino ? d.inquilino : d.casa;
    msg += `Imóvel: ${nome.toUpperCase()}
UC: ${d.uc}
Consumo da fatura: ${moeda(d.consumo)}
Compensado pelo solar: ${moeda(d.injetado)}
Desconto concedido: ${moeda(d.economia)}
✅ Valor a pagar no aluguel: ${moeda(d.pagar)}

`;
  }

 msg += `
━━━━━━━━━━━━━━

💰 TOTAL A RECEBER: ${document.getElementById("kpiReceber").textContent}
🎁 DESCONTO TOTAL CONCEDIDO: ${document.getElementById("kpiEconomia").textContent}`;

  document.getElementById("mensagem").value = msg;
}

// ===== COPIAR =====
async function copiarTexto(texto) {
  const area = document.getElementById("mensagem");
  area.value = texto;
  area.focus();
  area.select();

  let ok = false;
  try { ok = document.execCommand("copy"); } catch (e) {}
  if (navigator.clipboard && window.isSecureContext) {
    try { await navigator.clipboard.writeText(texto); ok = true; } catch (e) {}
  }

  toast(ok ? "✅ Texto copiado!" : "⚠️ Selecione o texto e copie manualmente.", ok ? "success" : "warn");
}

// ===== COLETAR / APLICAR DADOS =====
function coletarDados() {
 const dados = {
  mes: valor("mes"),
  desconto: valor("desconto"),
  qtdCasas: qtdCasas,
  casas: []
};
  for (let i = 1; i <= qtdCasas; i++) {
    dados.casas.push({
      casa:      valor("casa" + i),
      uc:        valor("uc" + i),
      inquilino: valor("inq" + i),
      consumo:   valor("consumo" + i),
      injetado:  valor("injetado" + i)
    });
  }
  return dados;
}

function aplicarDados(dados) {
  if (!dados) return;
  document.getElementById("mes").value      = dados.mes      || "";
  document.getElementById("desconto").value = dados.desconto || "10";

  if (dados.qtdCasas && dados.qtdCasas !== qtdCasas) {
    qtdCasas = Number(dados.qtdCasas) || 4;
  }

  renderLinhas(dados.casas);
  calcular();
}

// ===== PERSISTÊNCIA =====
function salvarAutomatico() {
  localStorage.setItem("solarGestaoDados", JSON.stringify(coletarDados()));
}

function salvarDados() {
  salvarAutomatico();
  toast("💾 Dados salvos neste aparelho.");
}

function carregarDados() {
  try {
    const dados = JSON.parse(localStorage.getItem("solarGestaoDados") || "null");
    if (dados) {
      if (dados.qtdCasas) qtdCasas = Number(dados.qtdCasas) || 4;
      aplicarDados(dados);
    } else {
      renderLinhas();
      calcular();
    }
  } catch (e) {
    renderLinhas();
    calcular();
  }
}

function limparDados() {
  if (!confirm("Deseja limpar todos os campos?")) return;
  localStorage.removeItem("solarGestaoDados");
  location.reload();
}

// ===== HISTÓRICO =====
function filtrarProducaoDoMes(mesHistorico) {
  const producao = JSON.parse(localStorage.getItem("producaoInjecaoSolar") || "[]");

  return producao.filter(p => p.mes === mesHistorico);
}
function salvarHistorico() {
  calcular();
  salvarProducaoInjecao(false);

  const historico = JSON.parse(localStorage.getItem("solarGestaoHistorico") || "[]");

  const percentual = numero("desconto") / 100;
  let totalPagarNum = 0;
  const casas = [];

  for (let i = 1; i <= qtdCasas; i++) {
    const d = dadosCasa(i);

    if (d.consumo > 0 || d.injetado > 0) {
      totalPagarNum += d.pagar;

      casas.push({
        nome: d.inquilino ? d.inquilino : d.casa,
        pagar: d.pagar
      });
    }
  }

  const mesAtual = valor("mes") || "sem mês";

  const registro = {
    id: Date.now(),
    data: new Date().toLocaleString("pt-BR"),
    mes: mesAtual,
    desconto: valor("desconto") || "10",
    receber: moeda(totalPagarNum),
    receberNum: totalPagarNum,
    economia: document.getElementById("kpiEconomia").textContent,
    casas,
    producao: filtrarProducaoDoMes(mesAtual),
    dadosCompletos: coletarDados()
  };

  if (historicoEditandoIndex !== null && historico[historicoEditandoIndex]) {
    const idAntigo = historico[historicoEditandoIndex].id;

    historico[historicoEditandoIndex] = {
      ...registro,
      id: idAntigo,
      data: new Date().toLocaleString("pt-BR") + " — alterado"
    };

    historicoEditandoIndex = null;
    toast("✅ Histórico alterado com sucesso.");
  } else {
    const indexMesmoMes = historico.findIndex(item => item.mes === mesAtual);

    if (indexMesmoMes >= 0) {
      historico[indexMesmoMes] = {
        ...registro,
        id: historico[indexMesmoMes].id,
        data: new Date().toLocaleString("pt-BR") + " — atualizado"
      };

      toast("🔄 Histórico do mês atualizado.");
    } else {
      historico.unshift(registro);
      toast("📅 Histórico salvo.");
    }
  }

  localStorage.setItem("solarGestaoHistorico", JSON.stringify(historico.slice(0, 36)));
  renderHistorico();
}

function renderHistorico() {
  const historico = JSON.parse(localStorage.getItem("solarGestaoHistorico") || "[]");
  const area = document.getElementById("historico");

  if (!historico.length) {
    area.innerHTML = `<p style="font-size:13px;color:var(--text2);">Nenhum histórico salvo ainda.</p>`;
    return;
  }

  const totalAcumulado = historico.reduce((acc, item) => acc + (item.receberNum || 0), 0);

  let html = `
    <div class="historico-total">
      <span>Total acumulado a receber (todos os meses)</span>
      <span class="historico-total-valor">${moeda(totalAcumulado)}</span>
    </div>
  `;

  html += historico.map((item, idx) => {
    const casasHtml = (item.casas && item.casas.length)
      ? `<div class="historico-casas">${item.casas.map(c =>
          `<div class="historico-casa">🏠 ${c.nome}: <strong>${moeda(c.pagar)}</strong></div>`
        ).join("")}</div>`
      : "";

    const producaoHtml = (item.producao && item.producao.length)
      ? `<div class="historico-casas" style="margin-top:8px;">
          <strong>Produção / Injeção:</strong>
          ${item.producao.map(p =>
            `<div class="historico-casa">⚡ ${p.inversor}: <strong>${p.kwhInjetado} kWh</strong> | ${p.potenciaKwp} kWp</div>`
          ).join("")}
        </div>`
      : "";

    return `
      <div class="history-item">
        <div class="history-item-header">
          <strong>${item.mes}</strong>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn secondary small" onclick="editarHistorico(${idx})">✏️ Editar</button>
            <button class="btn danger small" onclick="apagarItemHistorico(${idx})">🗑️ Apagar</button>
          </div>
        </div>
        <div class="history-item-meta">
          A receber: ${item.receber} &nbsp;|&nbsp; Economia: ${item.economia} &nbsp;|&nbsp; ${item.data}
        </div>
        ${casasHtml}
        ${producaoHtml}
      </div>
    `;
  }).join("");

  area.innerHTML = html;
}

function editarHistorico(idx) {
  const historico = JSON.parse(localStorage.getItem("solarGestaoHistorico") || "[]");
  const item = historico[idx];

  if (!item || !item.dadosCompletos) {
    toast("Dados completos não disponíveis.", "warn");
    return;
  }

  if (!confirm(`Carregar dados de "${item.mes}" para edição?`)) return;

  historicoEditandoIndex = idx;
  aplicarDados(item.dadosCompletos);

  window.scrollTo({ top: 0, behavior: "smooth" });
  toast(`✏️ Editando "${item.mes}". Após alterar, clique em "Salvar no histórico".`);
}

function apagarItemHistorico(idx) {
  const historico = JSON.parse(localStorage.getItem("solarGestaoHistorico") || "[]");
  const item = historico[idx];

  if (!item) return;
  if (!confirm(`Deseja apagar somente o histórico de "${item.mes}"?`)) return;

  historico.splice(idx, 1);
  localStorage.setItem("solarGestaoHistorico", JSON.stringify(historico));

  if (historicoEditandoIndex === idx) historicoEditandoIndex = null;

  renderHistorico();
  toast("🗑️ Histórico apagado.", "warn");
}

function apagarHistorico() {
  if (!confirm("Tem certeza que deseja apagar todo o histórico?")) return;
  localStorage.removeItem("solarGestaoHistorico");
  historicoEditandoIndex = null;
  renderHistorico();
  toast("Histórico apagado.", "warn");
}

// ===== BACKUP =====
function baixarBackup() {
  const backup = {
    dados: coletarDados(),
    historico: JSON.parse(localStorage.getItem("solarGestaoHistorico") || "[]"),
    producao: JSON.parse(localStorage.getItem("producaoInjecaoSolar") || "[]")
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "backup_solar_gestao.json";
  a.click();
  URL.revokeObjectURL(url);
  toast("⬇ Backup baixado.");
}

function importarBackup(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const backup = JSON.parse(e.target.result);
      if (backup.dados) {
        localStorage.setItem("solarGestaoDados", JSON.stringify(backup.dados));
        aplicarDados(backup.dados);
      }
      if (backup.historico) {
        localStorage.setItem("solarGestaoHistorico", JSON.stringify(backup.historico));
        renderHistorico();
      }
      if (backup.producao) {
  localStorage.setItem("producaoInjecaoSolar", JSON.stringify(backup.producao));
  carregarProducaoInjecao();
}
      toast("⬆ Backup importado com sucesso.");
    } catch (err) {
      toast("Arquivo inválido.", "error");
    }
  };
  reader.readAsText(file);
}

// ===== RELATÓRIO HISTÓRICO (PDF) =====
function gerarRelatorioHistorico() {
  const historico = JSON.parse(localStorage.getItem("solarGestaoHistorico") || "[]");

  if (!historico.length) {
    toast("Nenhum histórico salvo para gerar relatório.", "warn");
    return;
  }

  const historicoOrdenado = [...historico].reverse();

  const parseNum = v => parseFloat(String(v || "0").replace(/\./g, "").replace(",", ".")) || 0;

  const formatKwh = v => {
    const n = Number(v) || 0;
    return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + " kWh";
  };

  const mesBonito = mes => {
    if (!mes || !mes.includes("-")) return mes || "Sem mês";
    const [ano, m] = mes.split("-");
    const nomes = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
    return `${nomes[Number(m) - 1] || m}/${ano}`;
  };

  const totais = historico.reduce((acc, item) => {
    const desc = parseFloat(item.desconto || "10") / 100;

    let brutoMes = 0;
    let descontoMes = 0;

    (item.dadosCompletos?.casas || []).forEach(c => {
      const inj = parseNum(c.injetado);
      brutoMes += inj;
      descontoMes += inj * desc;
    });

    const producaoMes = (item.producao || []).reduce((s, p) => {
      return s + (Number(p.kwhInjetado) || 0);
    }, 0);

    acc.totalFaturado += brutoMes;
    acc.totalDesconto += descontoMes;
    acc.totalReceber += item.receberNum || (brutoMes - descontoMes);
    acc.totalProducao += producaoMes;

    return acc;
  }, {
    totalFaturado: 0,
    totalDesconto: 0,
    totalReceber: 0,
    totalProducao: 0
  });

  const totalMeses = historico.length;

  const dataGeracao = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric"
  });

  const detalhesMeses = historicoOrdenado.map(item => {
    const descPerc = parseFloat(item.desconto || "10") / 100;

    let totalFaturadoMes = 0;
    let totalDescontoMes = 0;
    let totalReceberMes = 0;

    const linhasCasas = (item.dadosCompletos?.casas || item.casas || []).map((c, idx) => {
      if (item.dadosCompletos?.casas) {
        const casa = item.dadosCompletos.casas[idx];
        if (!casa) return "";

        const inj = parseNum(casa.injetado);
        const cons = parseNum(casa.consumo);
        const desconto = inj * descPerc;
        const pagar = inj - desconto;
        const nome = casa.inquilino || casa.casa || ("Casa " + (idx + 1));

        if (inj === 0 && cons === 0) return "";

        totalFaturadoMes += inj;
        totalDescontoMes += desconto;
        totalReceberMes += pagar;

        return `
          <tr>
            <td>${nome}</td>
            <td>${casa.uc || "—"}</td>
            <td class="num">${moeda(cons)}</td>
            <td class="num">${moeda(inj)}</td>
            <td class="num">${moeda(desconto)}</td>
            <td class="num total-cell">${moeda(pagar)}</td>
          </tr>`;
      }

      totalReceberMes += Number(c.pagar) || 0;

      return `
        <tr>
          <td>${c.nome || "—"}</td>
          <td>—</td>
          <td class="num">—</td>
          <td class="num">—</td>
          <td class="num">—</td>
          <td class="num total-cell">${moeda(c.pagar)}</td>
        </tr>`;
    }).filter(Boolean).join("");

    const totalProducaoMes = (item.producao || []).reduce((s, p) => s + (Number(p.kwhInjetado) || 0), 0);

    const linhasProducao = (item.producao || []).map(p => {
      const kwh = Number(p.kwhInjetado) || 0;
      const kwp = Number(p.potenciaKwp) || 0;
      const participacao = totalProducaoMes > 0 ? ((kwh / totalProducaoMes) * 100).toFixed(1) : "0.0";

      return `
        <tr>
          <td>${p.inversor || "—"}</td>
          <td class="num">${kwp.toFixed(2)} kWp</td>
          <td class="num">${formatKwh(kwh)}</td>
          <td class="num">${kwp > 0 ? (kwh / kwp).toFixed(1) : "—"} kWh/kWp</td>
          <td class="num">${participacao}%</td>
        </tr>`;
    }).join("");

    const tabelaCasas = linhasCasas ? `
      <div class="table-section">
        <h4>Imóveis / Inquilinos</h4>
        <table>
          <thead>
            <tr>
              <th>Imóvel / Inquilino</th>
              <th>UC</th>
              <th class="num">Fatura</th>
              <th class="num">Compensado</th>
              <th class="num">Desconto</th>
              <th class="num">A receber</th>
            </tr>
          </thead>
          <tbody>${linhasCasas}</tbody>
        </table>
      </div>` : "";

    const tabelaProducao = linhasProducao ? `
      <div class="table-section">
        <h4>Produção / Injeção na rede</h4>
        <table>
          <thead>
            <tr>
              <th>Inversor</th>
              <th class="num">Potência</th>
              <th class="num">kWh injetado</th>
              <th class="num">Média</th>
              <th class="num">% do mês</th>
            </tr>
          </thead>
          <tbody>${linhasProducao}</tbody>
        </table>
      </div>` : "";

    return `
      <div class="mes-bloco">
        <div class="mes-topo">
          <div>
            <div class="mes-label">Detalhamento mensal</div>
            <div class="mes-titulo">${mesBonito(item.mes)}</div>
          </div>
          <div class="mes-desconto">Desconto aplicado: <strong>${item.desconto || "10"}%</strong></div>
        </div>

        <div class="mes-resumo">
          <div>
            <span>Produção injetada</span>
            <strong>${formatKwh(totalProducaoMes)}</strong>
          </div>
          <div>
            <span>Total faturado</span>
            <strong>${moeda(totalFaturadoMes)}</strong>
          </div>
          <div>
            <span>Desconto concedido</span>
            <strong>${moeda(totalDescontoMes)}</strong>
          </div>
          <div class="receber">
            <span>Total a receber</span>
            <strong>${moeda(totalReceberMes || item.receberNum || 0)}</strong>
          </div>
        </div>

        ${tabelaCasas}
        ${tabelaProducao}

        <div class="mes-rodape">
          Salvo em: ${item.data || "—"}
        </div>
      </div>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Relatório Solar Gestão</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #172033;
      background: #F4F7FA;
      padding: 26px 30px;
    }

    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 14px;
      border-bottom: 2px solid #0D1B2A;
    }

    .header-brand h1 {
      font-size: 21px;
      font-weight: 800;
      color: #0D1B2A;
      letter-spacing: -0.3px;
    }

    .header-brand p {
      font-size: 11px;
      color: #6b7280;
      margin-top: 3px;
    }

    .header-info {
      text-align: right;
      font-size: 10px;
      color: #6b7280;
      line-height: 1.7;
    }

    .kpis {
      display: flex;
      gap: 10px;
      margin-bottom: 22px;
      align-items: stretch;
    }

  .kpi-box {
  flex: 1;
  border: 1px solid #D8E3EC;
  background: #FFFFFF;
  border-radius: 10px;
  padding: 12px 13px;
  min-height: 72px;
  box-shadow: 0 2px 8px rgba(13,27,42,0.08);
}

    .kpi-box.destaque {
  background: linear-gradient(135deg,#0D1B2A,#1B5E20);
  border-color: #1B5E20;
  color: #ffffff;
}

    .kpi-box label {
      display: block;
      font-size: 8.5px;
      text-transform: uppercase;
      letter-spacing: 0.55px;
      color: inherit;
      opacity: 0.68;
      margin-bottom: 7px;
      line-height: 1.2;
    }

    .kpi-box strong {
      display: block;
      font-size: 15px;
      font-weight: 800;
      line-height: 1.15;
      white-space: nowrap;
    }

    .intro {
      background: #EEF7FF;
      border-left: 4px solid #1B5E20;
      padding: 10px 12px;
      border-radius: 8px;
      color: #4b5563;
      margin-bottom: 20px;
      line-height: 1.45;
    }

    h2 {
      font-size: 13px;
      font-weight: 800;
      color: #0D1B2A;
      margin: 18px 0 10px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    h4 {
      font-size: 9.5px;
      font-weight: 800;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.45px;
      margin: 12px 14px 6px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
  background: #12324A;
      color: #fff;
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 7px 8px;
      text-align: left;
      white-space: nowrap;
    }

    td {
      padding: 6px 8px;
      border-bottom: 1px solid #eef1f4;
      vertical-align: middle;
      color: #1f2937;
    }

    tr:nth-child(even) td {
      background: #fbfcfd;
    }

    .num {
      text-align: right;
      white-space: nowrap;
    }

    .total-cell {
      font-weight: 800;
      color: #0D1B2A;
    }

  .mes-bloco {
  margin-bottom: 18px;
  border: 1px solid #D6E4F0;
  border-radius: 12px;
  overflow: hidden;
  page-break-inside: avoid;
  background: #FFFFFF;
  box-shadow: 0 2px 10px rgba(13,27,42,0.06);
}

    .mes-topo {
      display: flex;
      align-items: center;
      justify-content: space-between;
     background: linear-gradient(90deg,#EAF4FF,#F2FFF6);
      padding: 12px 14px;
      border-bottom: 1px solid #dde4ec;
    }

    .mes-label {
      font-size: 8px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-bottom: 3px;
      font-weight: 700;
    }

    .mes-titulo {
      font-size: 15px;
      color: #0D1B2A;
      font-weight: 800;
    }

    .mes-desconto {
      font-size: 10px;
      color: #4b5563;
    }

    .mes-resumo {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0;
      border-bottom: 1px solid #eef1f4;
    }

    .mes-resumo div {
      padding: 10px 12px;
      border-right: 1px solid #eef1f4;
    }

    .mes-resumo div:last-child {
      border-right: 0;
    }

    .mes-resumo span {
      display: block;
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 0.45px;
      color: #6b7280;
      margin-bottom: 4px;
      font-weight: 700;
    }

    .mes-resumo strong {
      font-size: 12px;
      color: #111827;
      font-weight: 800;
      white-space: nowrap;
    }

  .mes-resumo .receber {
  background: #EAF7EF;
}

    .mes-resumo .receber strong {
      color: #0D1B2A;
      font-size: 13px;
    }

    .table-section {
      padding-bottom: 8px;
    }

    .table-section table {
      margin: 0;
    }

    .mes-rodape {
      padding: 8px 14px;
      background: #fbfcfd;
      border-top: 1px solid #eef1f4;
      color: #6b7280;
      font-size: 9px;
      text-align: right;
    }

    .footer {
      margin-top: 26px;
      padding-top: 10px;
      border-top: 1px solid #dde4ec;
      text-align: center;
      font-size: 9px;
      color: #9ca3af;
    }

    @media print {
      body {
        padding: 0;
      }

      .mes-bloco {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>

  <div class="header">
    <div class="header-brand">
      <h1>☀️ Solar Gestão</h1>
      <p>Relatório profissional de produção, compensação e cobrança</p>
    </div>
    <div class="header-info">
      <div>Gerado em: ${dataGeracao}</div>
      <div>Meses analisados: ${totalMeses}</div>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi-box">
      <label>Produção injetada</label>
      <strong>${formatKwh(totais.totalProducao)}</strong>
    </div>
    <div class="kpi-box">
      <label>Total faturado</label>
      <strong>${moeda(totais.totalFaturado)}</strong>
    </div>
    <div class="kpi-box">
      <label>Desconto concedido</label>
      <strong>${moeda(totais.totalDesconto)}</strong>
    </div>
    <div class="kpi-box destaque">
      <label>Total a receber</label>
      <strong>${moeda(totais.totalReceber)}</strong>
    </div>
  </div>

  <div class="intro">
    Este relatório consolida todos os meses salvos no Solar Gestão.
  </div>

  <h2>Detalhamento mês a mês</h2>

  ${detalhesMeses}

  <div class="footer">
    Solar Gestão — Desenvolvido por Jeison Z. Gasparetto &nbsp;|&nbsp; Relatório gerado em ${dataGeracao}
  </div>

  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;

  const janela = window.open("", "_blank");

  if (!janela) {
    toast("Permita pop-ups para gerar o relatório.", "warn");
    return;
  }

  janela.document.write(html);
  janela.document.close();
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  carregarDados();
  renderHistorico();

  document.getElementById("btnCalcular").addEventListener("click", calcular);
  document.getElementById("btnHistorico").addEventListener("click", salvarHistorico);
  document.getElementById("btnLimpar").addEventListener("click", limparDados);
  document.getElementById("btnBackup").addEventListener("click", baixarBackup);
  document.getElementById("btnImportar").addEventListener("click", () => document.getElementById("fileImport").click());
  document.getElementById("fileImport").addEventListener("change", e => importarBackup(e.target.files[0]));
  document.getElementById("btnTextoGeral").addEventListener("click", gerarMensagemGeral);
  document.getElementById("btnCopiarTexto").addEventListener("click", () => copiarTexto(document.getElementById("mensagem").value || ""));
  document.getElementById("btnLimparTexto").addEventListener("click", () => { document.getElementById("mensagem").value = ""; });
  document.getElementById("btnAdicionarCasa").addEventListener("click", adicionarCasa);
  document.getElementById("btnRemoverCasa").addEventListener("click", removerCasa);
  document.getElementById("btnRelatorio").addEventListener("click", gerarRelatorioHistorico);
  document.getElementById("btnExcel").addEventListener("click", exportarExcel);
  document.getElementById("btnToggleHistorico").addEventListener("click", () => {
  const box = document.getElementById("historicoWrapper");
  const btn = document.getElementById("btnToggleHistorico");

  const aberto = box.style.display !== "none";

  box.style.display = aberto ? "none" : "block";
  btn.textContent = aberto ? "▼" : "▲";
});
  
  ["mes", "desconto"].forEach(id => {
    document.getElementById(id).addEventListener("input", calcular);
  });
});


// ===== EXPORTAR EXCEL =====
function exportarExcel() {
  const historico = JSON.parse(localStorage.getItem("solarGestaoHistorico") || "[]");

  if (!historico.length) {
    toast("Nenhum histórico salvo para exportar.", "warn");
    return;
  }

  const historicoOrdenado = [...historico].reverse();

  const abaResumo = [["Mês","A receber (R$)","Economia gerada (R$)","Desconto (%)","Salvo em"]];
  historicoOrdenado.forEach(item => {
    const receber = item.receberNum || 0;
    const economia = item.dadosCompletos?.casas?.reduce((s,c) => {
      const inj = parseFloat(String(c.injetado||"0").replace(",","."))||0;
      const desc = parseFloat(item.desconto||"10")/100;
      return s+inj*desc;
    },0)||0;
    abaResumo.push([item.mes, parseFloat(receber.toFixed(2)), parseFloat(economia.toFixed(2)), parseFloat(item.desconto||"10"), item.data]);
  });
  const totalRec = historicoOrdenado.reduce((s,i)=>s+(i.receberNum||0),0);
  const totalEco = historicoOrdenado.reduce((s,i)=>s+(i.dadosCompletos?.casas?.reduce((sc,c)=>{
    const inj=parseFloat(String(c.injetado||"0").replace(",","."))||0;
    const desc=parseFloat(i.desconto||"10")/100;
    return sc+inj*desc;
  },0)||0),0);
  abaResumo.push([]);
  abaResumo.push(["TOTAL", parseFloat(totalRec.toFixed(2)), parseFloat(totalEco.toFixed(2)), "", ""]);

  const abaDetalhado = [["Mês","Imóvel / Inquilino","Unidade Consumidora","Fatura (R$)","Compensado (R$)","Desconto (R$)","A pagar (R$)"]];
  historicoOrdenado.forEach(item => {
    (item.dadosCompletos?.casas||[]).forEach((c,idx) => {
      const inj=parseFloat(String(c.injetado||"0").replace(",","."))||0;
      const cons=parseFloat(String(c.consumo||"0").replace(",","."))||0;
      if(inj===0 && cons===0) return;
      const desc=parseFloat(item.desconto||"10")/100;
      const eco=inj*desc;
      const pag=inj-eco;
      const nome=c.inquilino||c.casa||("Casa "+(idx+1));
      abaDetalhado.push([item.mes, nome, c.uc||"—", parseFloat(cons.toFixed(2)), parseFloat(inj.toFixed(2)), parseFloat(eco.toFixed(2)), parseFloat(pag.toFixed(2))]);
    });
  });

  const abaProducao = [["Mês","Inversor","Potência (kWp)","kWh Injetado","Média (kWh/kWp)"]];
  historicoOrdenado.forEach(item => {
    (item.producao||[]).forEach(p => {
      const media = p.potenciaKwp>0 ? parseFloat((p.kwhInjetado/p.potenciaKwp).toFixed(1)) : 0;
      abaProducao.push([item.mes, p.inversor||"—", parseFloat(p.potenciaKwp)||0, parseFloat(p.kwhInjetado)||0, media]);
    });
  });

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet(abaResumo);
  const ws2 = XLSX.utils.aoa_to_sheet(abaDetalhado);
  const ws3 = XLSX.utils.aoa_to_sheet(abaProducao);
  ws1["!cols"]=[{wch:18},{wch:18},{wch:22},{wch:14},{wch:24}];
  ws2["!cols"]=[{wch:18},{wch:22},{wch:22},{wch:14},{wch:16},{wch:16},{wch:14}];
  ws3["!cols"]=[{wch:18},{wch:20},{wch:16},{wch:16},{wch:18}];
  XLSX.utils.book_append_sheet(wb,ws1,"Resumo");
  XLSX.utils.book_append_sheet(wb,ws2,"Detalhado");
  XLSX.utils.book_append_sheet(wb,ws3,"Produção");
  const dataHoje = new Date().toLocaleDateString('pt-BR').split('/').join('-');
  XLSX.writeFile(wb,"solar_gestao_"+dataHoje+".xlsx");
  toast("📊 Excel exportado com sucesso!");
}
// Service Worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

const STORAGE_PRODUCAO_INJECAO = "producaoInjecaoSolar";

function carregarProducaoInjecao() {
  const dados = JSON.parse(localStorage.getItem(STORAGE_PRODUCAO_INJECAO)) || [];

  const tbody = document.getElementById("tabela-producao-injecao");
  if (!tbody) return;

  tbody.innerHTML = "";

  dados.forEach((item, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="month" onclick="this.showPicker()" value="${item.mes || ""}" data-index="${index}" data-campo="mes"></td>
      <td><input type="text" value="${item.inversor || ""}" placeholder="Ex: Sofar 5 kW" data-index="${index}" data-campo="inversor"></td>
      <td><input type="number" step="0.01" value="${item.potenciaKwp || ""}" placeholder="Ex: 5.85" data-index="${index}" data-campo="potenciaKwp"></td>
      <td><input type="number" step="1" min="0" value="${item.kwhInjetado || ""}" placeholder="Ex: 620" data-index="${index}" data-campo="kwhInjetado"></td>
      <td><button onclick="removerLinhaProducao(${index})">Remover</button></td>
    `;
    tbody.appendChild(tr);
  });

  atualizarResumoProducao();
}

function salvarProducaoInjecao(mostrarToast = true) {
  const linhas = document.querySelectorAll("#tabela-producao-injecao tr");
  const dados = [];

  linhas.forEach(linha => {
    const inputs = linha.querySelectorAll("input");
    const item = { mes: "", inversor: "", potenciaKwp: 0, kwhInjetado: 0 };

    inputs.forEach(input => {
      const campo = input.dataset.campo;
      if (campo === "potenciaKwp" || campo === "kwhInjetado") {
        item[campo] = Number(String(input.value).replace(",", ".")) || 0;
      } else {
        item[campo] = input.value;
      }
    });

    if (item.mes || item.inversor || item.potenciaKwp || item.kwhInjetado) {
      dados.push(item);
    }
  });

  localStorage.setItem(STORAGE_PRODUCAO_INJECAO, JSON.stringify(dados));
  carregarProducaoInjecao();
  if (mostrarToast) {
  toast("✅ Produção salva com sucesso.");
}
}

function adicionarLinhaProducao() {
  const dados = JSON.parse(localStorage.getItem(STORAGE_PRODUCAO_INJECAO)) || [];

  dados.push({
    mes: valor("mes") || "",
    inversor: "",
    potenciaKwp: "",
    kwhInjetado: ""
  });

  localStorage.setItem(STORAGE_PRODUCAO_INJECAO, JSON.stringify(dados));
  carregarProducaoInjecao();
}

function removerLinhaProducao(index) {
  const dados = JSON.parse(localStorage.getItem(STORAGE_PRODUCAO_INJECAO)) || [];

  dados.splice(index, 1);

  localStorage.setItem(STORAGE_PRODUCAO_INJECAO, JSON.stringify(dados));
  carregarProducaoInjecao();
}

function atualizarResumoProducao() {
  const linhas = document.querySelectorAll("#tabela-producao-injecao tr");
  let totalKwh = 0, totalKwp = 0;

  linhas.forEach(linha => {
    const potenciaInput = linha.querySelector('input[data-campo="potenciaKwp"]');
    const kwhInput      = linha.querySelector('input[data-campo="kwhInjetado"]');
    const potencia = Number((potenciaInput?.value || "0").replace(",", ".")) || 0;
    const kwh      = Number((kwhInput?.value      || "0").replace(",", ".")) || 0;
    totalKwp += potencia;
    totalKwh += kwh;
  });

  const media = totalKwp > 0 ? totalKwh / totalKwp : 0;
  document.getElementById("total-kwh-injetado").textContent  = Math.round(totalKwh);
  document.getElementById("total-potencia-kwp").textContent  = totalKwp.toFixed(2);
  document.getElementById("media-kwh-kwp").textContent       = media.toFixed(0);
}

document.addEventListener("input", function (event) {
  if (event.target.closest("#producao-injecao")) {
    atualizarResumoProducao();

    clearTimeout(window.timerSalvarProducao);
    window.timerSalvarProducao = setTimeout(() => {
      salvarProducaoInjecao(false);
    }, 500);
  }
});

document.addEventListener("DOMContentLoaded", carregarProducaoInjecao);
