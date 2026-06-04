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
    const economia = desconto; // economia do inquilino = desconto aplicado

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

// ===== MENSAGENS WHATSAPP (mantidas exatamente como estavam) =====
function gerarMensagemCasa(i) {
  calcular();
  const mes = valor("mes") || "mês não informado";
  const d   = dadosCasa(i);
  const nome = d.inquilino ? d.inquilino : d.casa;

  return `☀️ ENERGIA SOLAR – ${mes}

Imóvel: ${nome.toUpperCase()}
Unidade consumidora: ${d.uc}

Consumo da fatura: ${moeda(d.consumo)}
Compensado pelo solar: ${moeda(d.injetado)}
Desconto repassado: ${moeda(d.economia)}

✅ Valor a pagar no aluguel: ${moeda(d.pagar)}`;
}

function gerarMensagemGeral() {
  calcular();
  const mes  = valor("mes") || "mês não informado";
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
Desconto repassado: ${moeda(d.economia)}
✅ Valor a pagar no aluguel: ${moeda(d.pagar)}

`;
  }

  msg += `TOTAL A RECEBER: ${document.getElementById("kpiReceber").textContent}
ECONOMIA TOTAL: ${document.getElementById("kpiEconomia").textContent}`;

  document.getElementById("mensagem").value = msg;
}

// ===== COPIAR (toast no lugar de alert) =====
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
    mes:        valor("mes"),
    desconto:   valor("desconto"),

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
  document.getElementById("mes").value         = dados.mes          || "";
  document.getElementById("desconto").value    = dados.desconto     || "10";


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
function salvarHistorico() {
  calcular();
  const historico = JSON.parse(localStorage.getItem("solarGestaoHistorico") || "[]");

  // Calcula totalPagar como número diretamente (sem parsing de texto formatado)
  const percentual = numero("desconto") / 100;
  let totalPagarNum = 0;
  const casas = [];
  for (let i = 1; i <= qtdCasas; i++) {
    const injetado = numero("injetado" + i);
    const pagar    = injetado - injetado * percentual;
    totalPagarNum += pagar;
    const d = dadosCasa(i);
    if (d.consumo > 0 || d.injetado > 0) {
      casas.push({ nome: d.inquilino ? d.inquilino : d.casa, pagar });
    }
  }

  historico.unshift({
    id:           Date.now(),
    data:         new Date().toLocaleString("pt-BR"),
    mes:          valor("mes") || "sem mês",
    desconto:     valor("desconto") || "10",

    receber:      document.getElementById("kpiReceber").textContent,
    receberNum:   totalPagarNum, // número puro, sem parsing de texto
    economia:     document.getElementById("kpiEconomia").textContent,
    casas,
    dadosCompletos: coletarDados()
  });

  localStorage.setItem("solarGestaoHistorico", JSON.stringify(historico.slice(0, 36)));
  renderHistorico();
  toast("📅 Histórico salvo.");
}

function renderHistorico() {
  const historico = JSON.parse(localStorage.getItem("solarGestaoHistorico") || "[]");
  const area      = document.getElementById("historico");

  if (!historico.length) {
    area.innerHTML = `<p style="font-size:13px;color:var(--text2);">Nenhum histórico salvo ainda.</p>`;
    return;
  }

  // Usa receberNum (número puro) como fonte primária
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

    return `
      <div class="history-item">
        <div class="history-item-header">
          <strong>${item.mes}</strong>
          <button class="btn secondary small" onclick="editarHistorico(${idx})">✏️ Editar</button>
        </div>
        <div class="history-item-meta">
          A receber: ${item.receber} &nbsp;|&nbsp; Economia: ${item.economia} &nbsp;|&nbsp; ${item.data}
        </div>
        ${casasHtml}
      </div>
    `;
  }).join("");

  area.innerHTML = html;
}

function editarHistorico(idx) {
  const historico = JSON.parse(localStorage.getItem("solarGestaoHistorico") || "[]");
  const item = historico[idx];
  if (!item || !item.dadosCompletos) { toast("Dados completos não disponíveis.", "warn"); return; }
  if (!confirm(`Carregar dados de "${item.mes}" para edição?`)) return;
  aplicarDados(item.dadosCompletos);
  window.scrollTo({ top: 0, behavior: "smooth" });
  toast(`✏️ Dados de "${item.mes}" carregados.`);
}

function apagarHistorico() {
  if (!confirm("Tem certeza que deseja apagar todo o histórico?")) return;
  localStorage.removeItem("solarGestaoHistorico");
  renderHistorico();
  toast("Histórico apagado.", "warn");
}

// ===== BACKUP =====
function baixarBackup() {
  const backup = {
    dados:     coletarDados(),
    historico: JSON.parse(localStorage.getItem("solarGestaoHistorico") || "[]")
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
      toast("⬆ Backup importado com sucesso.");
    } catch (err) {
      toast("Arquivo inválido.", "error");
    }
  };
  reader.readAsText(file);
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  carregarDados();
  renderHistorico();

  document.getElementById("btnCalcular").addEventListener("click", calcular);
  document.getElementById("btnSalvar").addEventListener("click", salvarDados);
  document.getElementById("btnHistorico").addEventListener("click", salvarHistorico);
  document.getElementById("btnLimpar").addEventListener("click", limparDados);
  document.getElementById("btnBackup").addEventListener("click", baixarBackup);
  document.getElementById("btnImportar").addEventListener("click", () => document.getElementById("fileImport").click());
  document.getElementById("fileImport").addEventListener("change", e => importarBackup(e.target.files[0]));
  document.getElementById("btnImprimir").addEventListener("click", () => window.print());
  document.getElementById("btnTextoGeral").addEventListener("click", gerarMensagemGeral);
  document.getElementById("btnCopiarTexto").addEventListener("click", () => copiarTexto(document.getElementById("mensagem").value || ""));
  document.getElementById("btnLimparTexto").addEventListener("click", () => { document.getElementById("mensagem").value = ""; });
  document.getElementById("btnAdicionarCasa").addEventListener("click", adicionarCasa);
  document.getElementById("btnRemoverCasa").addEventListener("click", removerCasa);

  // inputs de configuração recalculam automaticamente
  ["mes", "desconto"].forEach(id => {
    document.getElementById(id).addEventListener("input", calcular);
  });
});

// Service Worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
