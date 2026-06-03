const QTD_CASAS = 4;

function moeda(valor){
  const n = Number(valor) || 0;
  return "R$ " + n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function numero(id){
  const el = document.getElementById(id);
  if(!el) return 0;
  let v = String(el.value || "0").trim();
  v = v.replace(/R\$/gi, "").replace(/\s/g, "");
  if(v.includes(",")){
    v = v.replace(/\./g, "").replace(",", ".");
  }
  v = v.replace(/[^0-9.\-]/g, "");
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function valor(id){
  const el = document.getElementById(id);
  return el ? (el.value || "") : "";
}

function setText(id, text){
  const el = document.getElementById(id);
  if(el) el.textContent = text;
}

function calcular(){
  const percentual = numero("desconto") / 100;
  let totalConsumo = 0;
  let totalInjetado = 0;
  let totalDesconto = 0;
  let totalPagar = 0;

  for(let i = 1; i <= QTD_CASAS; i++){
    const consumo = numero("consumo" + i);
    const injetado = numero("injetado" + i);
    const desconto = injetado * percentual;
    const pagar = injetado - desconto;

    totalConsumo += consumo;
    totalInjetado += injetado;
    totalDesconto += desconto;
    totalPagar += pagar;

    setText("desconto" + i, moeda(desconto));
    setText("economia" + i, moeda(desconto));
    setText("pagar" + i, moeda(pagar));
  }

  setText("kpiConsumo", moeda(totalConsumo));
  setText("kpiInjetado", moeda(totalInjetado));
  setText("kpiReceber", moeda(totalPagar));
  setText("kpiEconomia", moeda(totalDesconto));

  setText("totalConsumoTabela", moeda(totalConsumo));
  setText("totalInjetadoTabela", moeda(totalInjetado));
  setText("totalDescontoTabela", moeda(totalDesconto));
  setText("totalEconomiaTabela", moeda(totalDesconto));
  setText("totalPagarTabela", moeda(totalPagar));

  const investimento = numero("investimento");
  if(investimento > 0 && totalPagar > 0){
    const meses = investimento / totalPagar;
    setText("kpiPayback", meses.toFixed(1).replace(".", ",") + " meses");
  }else{
    setText("kpiPayback", "-");
  }

  salvarAutomatico();
}

function dadosCasa(i){
  const percentual = numero("desconto") / 100;
  const injetado = numero("injetado" + i);
  const desconto = injetado * percentual;
  const pagar = injetado - desconto;

  return {
    casa: valor("casa" + i) || ("Casa " + i),
    uc: valor("uc" + i) || "não informada",
    inquilino: valor("inq" + i) || "",
    consumo: numero("consumo" + i),
    injetado,
    desconto,
    economia: desconto,
    pagar
  };
}

// ALTERAÇÃO 1 + 2: novo template WhatsApp com emojis e "Valor a pagar no aluguel"
function gerarMensagemCasa(i){
  calcular();
  const mes = valor("mes") || "mês não informado";
  const d = dadosCasa(i);
  const nome = d.inquilino ? d.inquilino : d.casa;

  return `☀️ ENERGIA SOLAR – ${mes}

Imóvel: ${nome.toUpperCase()}
Unidade consumidora: ${d.uc}

Consumo da fatura: ${moeda(d.consumo)}
Compensado pelo solar: ${moeda(d.injetado)}
Desconto repassado: ${moeda(d.economia)}

✅ Valor a pagar no aluguel: ${moeda(d.pagar)}`;
}

function gerarMensagemGeral(){
  calcular();
  const mes = valor("mes") || "mês não informado";
  const desc = valor("desconto") || "10";
  let msg = `☀️ RESUMO ENERGIA SOLAR – ${mes}
Desconto aplicado: ${desc}%

`;

  for(let i = 1; i <= QTD_CASAS; i++){
    const d = dadosCasa(i);
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

async function copiarTexto(texto){
  const area = document.getElementById("mensagem");
  area.value = texto;
  area.focus();
  area.select();

  let ok = false;
  try{
    ok = document.execCommand("copy");
  }catch(e){}

  if(navigator.clipboard && window.isSecureContext){
    try{
      await navigator.clipboard.writeText(texto);
      ok = true;
    }catch(e){}
  }

  alert(ok ? "Texto copiado." : "Não copiou automático. Selecione o texto e copie manualmente.");
}

function coletarDados(){
  const dados = {
    mes: valor("mes"),
    desconto: valor("desconto"),
    investimento: valor("investimento"),
    casas: []
  };

  for(let i = 1; i <= QTD_CASAS; i++){
    dados.casas.push({
      casa: valor("casa" + i),
      uc: valor("uc" + i),
      inquilino: valor("inq" + i),
      consumo: valor("consumo" + i),
      injetado: valor("injetado" + i)
    });
  }

  return dados;
}

function aplicarDados(dados){
  if(!dados) return;

  document.getElementById("mes").value = dados.mes || "";
  document.getElementById("desconto").value = dados.desconto || "10";
  document.getElementById("investimento").value = dados.investimento || "15000";

  if(Array.isArray(dados.casas)){
    dados.casas.forEach((c, idx) => {
      const i = idx + 1;
      if(i > QTD_CASAS) return;
      document.getElementById("casa" + i).value = c.casa || ("Casa " + i);
      document.getElementById("uc" + i).value = c.uc || "";
      document.getElementById("inq" + i).value = c.inquilino || "";
      document.getElementById("consumo" + i).value = c.consumo || "";
      document.getElementById("injetado" + i).value = c.injetado || "";
    });
  }

  calcular();
}

function salvarAutomatico(){
  localStorage.setItem("solarGestaoDados", JSON.stringify(coletarDados()));
}

function salvarDados(){
  salvarAutomatico();
  alert("Dados salvos neste aparelho.");
}

function carregarDados(){
  try{
    const dados = JSON.parse(localStorage.getItem("solarGestaoDados") || "null");
    if(dados) aplicarDados(dados);
  }catch(e){}
}

function limparDados(){
  if(!confirm("Deseja limpar todos os campos?")) return;
  localStorage.removeItem("solarGestaoDados");
  location.reload();
}

// ALTERAÇÃO 3: histórico agora salva também os dados de cada casa
function salvarHistorico(){
  calcular();
  const historico = JSON.parse(localStorage.getItem("solarGestaoHistorico") || "[]");

  const casas = [];
  for(let i = 1; i <= QTD_CASAS; i++){
    const d = dadosCasa(i);
    if(d.consumo > 0 || d.injetado > 0){
      casas.push({
        nome: d.inquilino ? d.inquilino : d.casa,
        pagar: d.pagar
      });
    }
  }

  historico.unshift({
    id: Date.now(),
    data: new Date().toLocaleString("pt-BR"),
    mes: valor("mes") || "sem mês",
    desconto: valor("desconto") || "10",
    investimento: valor("investimento") || "",
    receber: document.getElementById("kpiReceber").textContent,
    receberNum: parseFloat(document.getElementById("kpiReceber").textContent.replace(/[^0-9,]/g,"").replace(",",".")),
    economia: document.getElementById("kpiEconomia").textContent,
    casas,
    dadosCompletos: coletarDados()
  });

  localStorage.setItem("solarGestaoHistorico", JSON.stringify(historico.slice(0, 36)));
  renderHistorico();
  alert("Histórico salvo.");
}

// ALTERAÇÃO 4 + 5: renderHistorico com dados das casas, botão editar e total acumulado
function renderHistorico(){
  const historico = JSON.parse(localStorage.getItem("solarGestaoHistorico") || "[]");
  const area = document.getElementById("historico");

  if(!historico.length){
    area.innerHTML = "<p>Nenhum histórico salvo ainda.</p>";
    return;
  }

  // Total acumulado
  const totalAcumulado = historico.reduce((acc, item) => {
    const v = parseFloat(String(item.receber || "0").replace(/[^0-9,]/g,"").replace(",",".")) || item.receberNum || 0;
    return acc + v;
  }, 0);

  let html = `
    <div class="historico-total">
      <strong>Total acumulado a receber (todos os meses):</strong>
      <span class="historico-total-valor">${moeda(totalAcumulado)}</span>
    </div>
  `;

  html += historico.map((item, idx) => {
    const casasHtml = (item.casas && item.casas.length)
      ? item.casas.map(c => `<div class="historico-casa">🏠 ${c.nome}: <strong>${moeda(c.pagar)}</strong></div>`).join("")
      : "";

    return `
      <div class="history-item">
        <div class="history-item-header">
          <strong>${item.mes}</strong>
          <button class="btn-editar-historico" onclick="editarHistorico(${idx})">✏️ Editar</button>
        </div>
        <div>Total a receber: ${item.receber} | Economia: ${item.economia}</div>
        ${casasHtml}
        <span>${item.data}</span>
      </div>
    `;
  }).join("");

  area.innerHTML = html;
}

// ALTERAÇÃO 4: função para editar um registro do histórico
function editarHistorico(idx){
  const historico = JSON.parse(localStorage.getItem("solarGestaoHistorico") || "[]");
  const item = historico[idx];
  if(!item || !item.dadosCompletos) return alert("Dados completos não disponíveis neste registro.");

  if(!confirm(`Deseja carregar os dados de "${item.mes}" para edição? Os campos atuais serão substituídos.`)) return;

  aplicarDados(item.dadosCompletos);
  window.scrollTo({ top: 0, behavior: "smooth" });
  alert(`Dados de "${item.mes}" carregados. Faça as alterações e salve novamente no histórico.`);
}

function baixarBackup(){
  const backup = {
    dados: coletarDados(),
    historico: JSON.parse(localStorage.getItem("solarGestaoHistorico") || "[]")
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "backup_solar_gestao.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importarBackup(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(event){
    try{
      const backup = JSON.parse(event.target.result);
      if(backup.dados){
        localStorage.setItem("solarGestaoDados", JSON.stringify(backup.dados));
        aplicarDados(backup.dados);
      }
      if(backup.historico){
        localStorage.setItem("solarGestaoHistorico", JSON.stringify(backup.historico));
        renderHistorico();
      }
      alert("Backup importado.");
    }catch(e){
      alert("Arquivo inválido.");
    }
  };
  reader.readAsText(file);
}

document.addEventListener("DOMContentLoaded", () => {
  carregarDados();
  calcular();
  renderHistorico();

  document.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", calcular);
  });

  document.querySelectorAll("[data-msg]").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = btn.getAttribute("data-msg");
      copiarTexto(gerarMensagemCasa(i));
    });
  });

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
  document.getElementById("btnLimparTexto").addEventListener("click", () => document.getElementById("mensagem").value = "");
});

if("serviceWorker" in navigator){
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

function apagarHistorico() {
  if (confirm("Tem certeza que deseja apagar todo o histórico?")) {
    localStorage.removeItem("solarGestaoHistorico");
    document.getElementById("historico").innerHTML = "<p>Nenhum histórico salvo ainda.</p>";
    alert("Histórico apagado com sucesso.");
  }
}

