// ===== ESTADO =====
let entradas = [];
let contador = 0;

const STATUS_LEAD = [
    'Sem resposta', 'Sem interesse', 'Visitou o imóvel',
    'Proposta enviada', 'Em negociação', 'Convertido', 'Sem procura', 'Outro'
];

const PORTAIS_LEAD = [
    'Não informado', 'Chaves na Mão', 'Chatwoot', 'Facebook', 'Google', 'Imovelweb',
    'Instagram', 'Mercado Livre', 'OLX', 'Site da imobiliária', 'Viva Real',
    'WhatsApp', 'Zap Imóveis', 'Indicação', 'Outro'
];

const ORDEM_PDF = [
    'Convertido', 'Em negociação', 'Proposta enviada',
    'Visitou o imóvel', 'Sem resposta', 'Sem interesse', 'Outro'
];

const CHAVE_RASCUNHO = 'feedback-leads-rascunho-v1';
const CHAVE_HISTORICO = 'feedback-leads-historico-v1';
let timerSalvamento;

function escaparHtml(valor) {
    return String(valor ?? '')
        .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function normalizarEntrada(e) {
    return {
        ...e,
        portalPadrao: e.portalPadrao || '',
        leads: (e.leads || []).map(l => ({
            portal: '', relatorio: '', obs: '', ...l
        }))
    };
}

function atualizarStatusSalvamento(texto) {
    const status = document.getElementById('autosave-status');
    if (status) status.textContent = texto;
}

function salvarRascunho() {
    try {
        localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify({
            entradas,
            contador,
            corretor: document.getElementById('fb-corretor').value,
            data: document.getElementById('fb-data').value,
            obsGeral: document.getElementById('fb-obs-geral').value
        }));
        atualizarStatusSalvamento('✓ Rascunho salvo');
    } catch (_) {
        atualizarStatusSalvamento('Não foi possível salvar');
    }
}

function agendarSalvamento() {
    atualizarStatusSalvamento('Salvando...');
    clearTimeout(timerSalvamento);
    timerSalvamento = setTimeout(salvarRascunho, 400);
}

function carregarRascunho() {
    try {
        return JSON.parse(localStorage.getItem(CHAVE_RASCUNHO) || 'null');
    } catch (_) {
        return null;
    }
}

function portalDoLead(lead) {
    return lead.portal === 'Outro' && lead.portalOutro
        ? lead.portalOutro.trim()
        : (lead.portal || 'Não informado');
}

function renderResumo() {
    const container = document.getElementById('fb-resumo');
    if (!container) return;
    const todos = entradas.flatMap(e => e.leads || []);
    const validos = todos.filter(l => l.status !== 'Sem procura');
    const convertidos = validos.filter(l => l.status === 'Convertido').length;
    const semResposta = validos.filter(l => l.status === 'Sem resposta').length;
    const negociando = validos.filter(l => l.status === 'Em negociação' || l.status === 'Proposta enviada').length;
    const taxa = validos.length ? Math.round((convertidos / validos.length) * 100) : 0;
    const portais = {};
    validos.forEach(l => {
        const portal = portalDoLead(l);
        portais[portal] = (portais[portal] || 0) + 1;
    });
    const ranking = Object.entries(portais).sort((a, b) => b[1] - a[1]);
    const maior = ranking[0]?.[1] || 1;

    container.innerHTML =
        '<div class="metricas-grid">' +
          '<div class="metrica"><span>Total de leads</span><strong>' + validos.length + '</strong></div>' +
          '<div class="metrica"><span>Convertidos</span><strong>' + convertidos + '</strong></div>' +
          '<div class="metrica"><span>Em andamento</span><strong>' + negociando + '</strong></div>' +
          '<div class="metrica"><span>Sem resposta</span><strong>' + semResposta + '</strong></div>' +
          '<div class="metrica destaque"><span>Conversão</span><strong>' + taxa + '%</strong></div>' +
        '</div>' +
        '<div class="ranking-portais">' +
          '<h3>Leads por portal</h3>' +
          (ranking.length
            ? ranking.map(item =>
                '<div class="portal-row"><span>' + escaparHtml(item[0]) + '</span>' +
                '<div class="portal-bar"><i style="width:' + Math.round((item[1] / maior) * 100) + '%"></i></div>' +
                '<strong>' + item[1] + '</strong></div>'
              ).join('')
            : '<p class="estado-vazio">Os dados aparecerão conforme os leads forem preenchidos.</p>') +
        '</div>';
}

function obterHistorico() {
    try {
        return JSON.parse(localStorage.getItem(CHAVE_HISTORICO) || '[]');
    } catch (_) {
        return [];
    }
}

function renderHistorico() {
    const container = document.getElementById('fb-historico');
    if (!container) return;
    const historico = obterHistorico();
    if (!historico.length) {
        container.innerHTML = '<p class="estado-vazio">Nenhum relatório gerado ainda.</p>';
        return;
    }
    container.innerHTML = historico.map(item => {
        const total = item.entradas.reduce((soma, e) => soma + (e.leads || []).length, 0);
        const quando = new Date(item.salvoEm).toLocaleString('pt-BR');
        return '<div class="historico-item">' +
          '<div><strong>' + escaparHtml(item.corretor || 'Não informado') + '</strong>' +
          '<span>' + escaparHtml(quando) + ' · ' + item.entradas.length + ' imóveis · ' + total + ' leads</span></div>' +
          '<div class="historico-acoes">' +
            '<button onclick="carregarDoHistorico(' + item.id + ')">Carregar</button>' +
            '<button class="perigo" onclick="excluirDoHistorico(' + item.id + ')">Excluir</button>' +
          '</div></div>';
    }).join('');
}

function salvarNoHistorico(dados) {
    const historico = obterHistorico();
    historico.unshift({
        id: Date.now(),
        salvoEm: new Date().toISOString(),
        corretor: dados.corretor,
        data: dados.dataVal,
        obsGeral: dados.obsGeral,
        entradas: JSON.parse(JSON.stringify(entradas))
    });
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(historico.slice(0, 20)));
    renderHistorico();
}

function carregarDoHistorico(id) {
    const item = obterHistorico().find(x => x.id === id);
    if (!item || !confirm('Carregar este relatório? O formulário atual será substituído.')) return;
    entradas = item.entradas.map(normalizarEntrada);
    contador = entradas.reduce((maior, e) => Math.max(maior, Number(e.id) || 0), 0);
    document.getElementById('fb-corretor').value = item.corretor || '';
    document.getElementById('fb-data').value = item.data || new Date().toISOString().split('T')[0];
    document.getElementById('fb-obs-geral').value = item.obsGeral || '';
    renderEntradas();
    salvarRascunho();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast('Relatório carregado do histórico.');
}

function excluirDoHistorico(id) {
    if (!confirm('Excluir este relatório do histórico?')) return;
    const historico = obterHistorico().filter(x => x.id !== id);
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(historico));
    renderHistorico();
    toast('Relatório excluído.', '#6B7280');
}

function duplicarEntrada(id) {
    const indice = entradas.findIndex(e => e.id === id);
    if (indice < 0) return;
    const copia = JSON.parse(JSON.stringify(entradas[indice]));
    copia.id = ++contador;
    copia.ref = copia.ref ? copia.ref + ' - cópia' : '';
    copia.leads = copia.leads.map(l => ({ ...l, id: Date.now() + Math.random() }));
    entradas.splice(indice + 1, 0, copia);
    renderEntradas();
    toast('Imóvel duplicado.');
}

function duplicarLead(entradaId, leadId) {
    const entrada = entradas.find(e => e.id === entradaId);
    if (!entrada) return;
    const indice = entrada.leads.findIndex(l => l.id === leadId);
    if (indice < 0) return;
    const copia = { ...entrada.leads[indice], id: Date.now() + Math.random() };
    entrada.leads.splice(indice + 1, 0, copia);
    renderEntradas();
    toast('Lead duplicado.');
}
// ===== INIT =====
function init() {
    const rascunho = carregarRascunho();
    if (rascunho && Array.isArray(rascunho.entradas) && rascunho.entradas.length) {
        entradas = rascunho.entradas.map(normalizarEntrada);
        contador = rascunho.contador || entradas.reduce((maior, e) => Math.max(maior, Number(e.id) || 0), 0);
        document.getElementById('fb-corretor').value = rascunho.corretor || '';
        document.getElementById('fb-data').value = rascunho.data || new Date().toISOString().split('T')[0];
        document.getElementById('fb-obs-geral').value = rascunho.obsGeral || '';
        renderEntradas();
        setTimeout(() => toast('Rascunho recuperado.'), 100);
    } else {
        document.getElementById('fb-data').value = new Date().toISOString().split('T')[0];
        adicionarEntrada();
    }
    document.addEventListener('input', agendarSalvamento);
    document.addEventListener('change', agendarSalvamento);
    renderResumo();
    renderHistorico();
}

// ===== TOAST =====
function toast(msg, cor) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.style.background = cor || '#16A34A';
    t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2500);
}

// ===== ENTRADAS =====
function adicionarEntrada() {
    contador++;
    entradas.push({
        id: contador, ref: '', finalidade: 'Locação', situacao: 'ativo',
        motivo: '', portalPadrao: '', leads: []
    });
    renderEntradas();
    adicionarLead(contador);
}

function removerEntrada(id) {
    entradas = entradas.filter(e => e.id !== id);
    renderEntradas();
}

function adicionarLead(entradaId) {
    const e = entradas.find(x => x.id === entradaId);
    if (!e) return;
    e.leads.push({
        id: Date.now() + Math.random(),
        nome: '', portal: e.portalPadrao || '', status: 'Sem resposta',
        relatorio: '', obs: ''
    });
    renderEntradas();
}

function adicionarLeadsEmLote(entradaId) {
    const e = entradas.find(x => x.id === entradaId);
    const campo = document.getElementById(`qtd-leads-${entradaId}`);
    if (!e || !campo) return;

    const quantidade = Math.min(Math.max(parseInt(campo.value, 10) || 1, 1), 50);
    for (let i = 0; i < quantidade; i++) {
        e.leads.push({
            id: Date.now() + Math.random(),
            nome: '', portal: e.portalPadrao || '', status: 'Sem resposta',
            relatorio: '', obs: ''
        });
    }
    renderEntradas();
    toast(`${quantidade} lead${quantidade !== 1 ? 's adicionados' : ' adicionado'}.`);
}

function removerLead(entradaId, leadId) {
    const e = entradas.find(x => x.id === entradaId);
    if (!e) return;
    e.leads = e.leads.filter(l => l.id !== leadId);
    renderEntradas();
}

function atualizarLead(entradaId, leadId, campo, valor) {
    const e = entradas.find(x => x.id === entradaId);
    if (!e) return;
    const l = e.leads.find(l => l.id === leadId);
    if (l) l[campo] = valor;
    renderResumo();
    agendarSalvamento();
}

function onSituacaoChange(sel, entradaId) {
    const e = entradas.find(x => x.id === entradaId);
    if (e) { e.situacao = sel.value; renderEntradas(); }
}

function onFinalidadeChange(sel, entradaId) {
    const e = entradas.find(x => x.id === entradaId);
    if (e) e.finalidade = sel.value;
    agendarSalvamento();
}

function onStatusLeadChange(sel, entradaId, leadId) {
    atualizarLead(entradaId, leadId, 'status', sel.value);
    // mostra/esconde campo "Outro"
    const item = sel.closest('.fb-lead-item');
    const outro = item.querySelector('.campo-outro');
    if (outro) outro.style.display = sel.value === 'Outro' ? 'block' : 'none';
}

function onPortalLeadChange(sel, entradaId, leadId) {
    atualizarLead(entradaId, leadId, 'portal', sel.value);
    const item = sel.closest('.fb-lead-item');
    const outro = item.querySelector('.campo-portal-outro');
    if (outro) outro.style.display = sel.value === 'Outro' ? 'block' : 'none';
}

function onPortalPadraoChange(sel, entradaId) {
    const e = entradas.find(x => x.id === entradaId);
    if (!e) return;
    e.portalPadrao = sel.value;
    e.leads.forEach(l => { if (!l.portal) l.portal = sel.value; });
    renderEntradas();
}

// ===== RENDER =====
function renderEntradas() {
    const container = document.getElementById('fb-entradas');
    if (!entradas.length) {
        container.innerHTML = '<p style="font-size:13px;color:var(--hint);padding:0.5rem 0 1rem;">Nenhum imóvel. Clique em "+ Adicionar imóvel".</p>';
        renderResumo();
        agendarSalvamento();
        return;
    }

    container.innerHTML = entradas.map((e, idx) => {
        const mostrarMotivo = e.situacao === 'locado' || e.situacao === 'baixado';
        const labelMotivo = e.situacao === 'locado'
            ? 'Detalhes da locação (ex: R$ 1.800/mês, contrato 12 meses...)'
            : 'Motivo da baixa (ex: proprietário desistiu, vendido...)';

        return `
    <div class="fb-entrada" id="ent-${e.id}">
      <div class="fb-header">
        <div class="fb-num">${idx + 1}</div>
        <input class="fb-ref-input" type="text" placeholder="Referência (ex: 02486.001)"
          value="${e.ref}"
          oninput="entradas.find(x=>x.id===${e.id}).ref=this.value" />
        <button class="btn-duplicar" onclick="duplicarEntrada(${e.id})" title="Duplicar imóvel">Duplicar</button>
        <button class="btn-remover" onclick="removerEntrada(${e.id})" title="Remover">×</button>
      </div>

      <div class="fb-meta">
        <div class="field">
          <label>Tipo de negócio</label>
          <select onchange="onFinalidadeChange(this,${e.id})">
            <option value="Locação"  ${e.finalidade === 'Locação' ? 'selected' : ''}>Locação</option>
            <option value="Compra"   ${e.finalidade === 'Compra' ? 'selected' : ''}>Venda</option>
          </select>
        </div>
        <div class="field">
          <label>Situação</label>
          <select onchange="onSituacaoChange(this,${e.id})">
            <option value="ativo"   ${e.situacao === 'ativo' ? 'selected' : ''}>Ativo</option>
            <option value="locado"  ${e.situacao === 'locado' ? 'selected' : ''}>Locado</option>
            <option value="baixado" ${e.situacao === 'baixado' ? 'selected' : ''}>Baixado</option>
          </select>
        </div>
      </div>

      ${mostrarMotivo ? `
      <div class="fb-motivo">
        <div class="field">
          <label>${labelMotivo}</label>
          <input type="text" placeholder="Descreva..."
            value="${e.motivo || ''}"
            oninput="entradas.find(x=>x.id===${e.id}).motivo=this.value" />
        </div>
      </div>` : ''}

      <div class="fb-leads-heading">
        <div>
          <div class="fb-leads-titulo">Leads (${e.leads.length})</div>
          <p>Escolha o portal uma vez e adicione vários leads de uma só vez.</p>
        </div>
      </div>

      <div class="fb-add-leads">
        <div class="field fb-portal-padrao">
          <label>Portal dos novos leads</label>
          <select onchange="onPortalPadraoChange(this,${e.id})">
            <option value="" disabled ${!e.portalPadrao ? 'selected' : ''}>Selecione o portal</option>
            ${PORTAIS_LEAD.map(p => `<option value="${p}" ${e.portalPadrao === p ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>
        <div class="field fb-quantidade">
          <label>Quantidade</label>
          <input id="qtd-leads-${e.id}" type="number" min="1" max="50" value="1" />
        </div>
        <button class="btn-batch" onclick="adicionarLeadsEmLote(${e.id})">+ Adicionar</button>
      </div>

      ${e.leads.map((l, leadIdx) => `
        <div class="fb-lead-item">
          <div class="fb-lead-top">
            <span>Lead ${leadIdx + 1}</span>
            <div class="fb-lead-actions">
              <button class="btn-duplicar-lead" onclick="duplicarLead(${e.id},${l.id})">Duplicar</button>
              <button class="btn-remover" onclick="removerLead(${e.id},${l.id})" title="Remover lead">×</button>
            </div>
          </div>
          <div class="fb-lead-grid">
            <div class="field">
              <label>Nome do lead</label>
              <input type="text" placeholder="Opcional" value="${l.nome}"
                oninput="atualizarLead(${e.id},${l.id},'nome',this.value)" />
            </div>
            <div class="field">
              <label>Portal de origem</label>
              <select onchange="onPortalLeadChange(this,${e.id},${l.id})">
                <option value="" disabled ${!l.portal ? 'selected' : ''}>Selecione</option>
                ${PORTAIS_LEAD.map(p => `<option value="${p}" ${l.portal === p ? 'selected' : ''}>${p}</option>`).join('')}
              </select>
            </div>
            <div class="field">
              <label>Status</label>
              <select onchange="onStatusLeadChange(this,${e.id},${l.id})">
                ${STATUS_LEAD.map(s => `<option value="${s}" ${l.status === s ? 'selected' : ''}>${s}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="campo-portal-outro" style="display:${l.portal === 'Outro' ? 'block' : 'none'}">
            <div class="field"><label>Outro portal ou origem</label>
              <input type="text" placeholder="Informe o nome" value="${l.portalOutro || ''}"
                oninput="atualizarLead(${e.id},${l.id},'portalOutro',this.value)" />
            </div>
          </div>
          <div class="campo-relatorio">
            <div class="field"><label>Relatório do atendimento</label>
              <textarea rows="2" placeholder="Contato, retorno, preferência e próximos passos..."
                oninput="atualizarLead(${e.id},${l.id},'relatorio',this.value)">${l.relatorio || ''}</textarea>
            </div>
          </div>
          <div class="campo-outro" style="display:${l.status === 'Outro' ? 'block' : 'none'}">
            <div class="field"><label>Outro feedback</label>
              <input type="text" placeholder="Descreva o resultado" value="${l.obs || ''}"
                oninput="atualizarLead(${e.id},${l.id},'obs',this.value)" />
            </div>
          </div>
        </div>`).join('')}

      <button class="btn-add-lead" onclick="adicionarLead(${e.id})">+ Adicionar mais 1 lead</button>
    </div>`;
    }).join('');
    renderResumo();
    agendarSalvamento();
}

// ===== LIMPAR =====
function limpar() {
    if (!confirm('Limpar tudo?')) return;
    entradas = []; contador = 0;
    document.getElementById('fb-corretor').value = '';
    document.getElementById('fb-obs-geral').value = '';
    document.getElementById('fb-data').value = new Date().toISOString().split('T')[0];
    localStorage.removeItem(CHAVE_RASCUNHO);
    adicionarEntrada();
    toast('Formulário limpo.', '#6B7280');
}

// ===== GERAR PDF =====
function gerarPDF() {
    // sincroniza refs do DOM
    entradas.forEach(e => {
        const el = document.querySelector(`#ent-${e.id} .fb-ref-input`);
        if (el) e.ref = el.value.trim();
    });

    if (!entradas.length) { toast('Adicione ao menos um imóvel.', '#DC2626'); return; }

    const corretor = document.getElementById('fb-corretor').value.trim() || 'Não informado';
    const dataVal = document.getElementById('fb-data').value;
    const dataF = dataVal
        ? new Date(dataVal + 'T12:00:00').toLocaleDateString('pt-BR')
        : new Date().toLocaleDateString('pt-BR');
    const obsGeral = document.getElementById('fb-obs-geral').value.trim();

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const mL = 20, pW = 210, cW = pW - mL * 2;
    let y = 20;

    // --- Cabeçalho ---
    doc.setFillColor(26, 26, 24);
    doc.rect(0, 0, pW, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text('Relatorio de Feedback de Leads', mL, 10);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(`Corretor: ${corretor}   |   Data: ${dataF}`, mL, 17);
    y = 34;

    // --- Obs geral ---
    if (obsGeral) {
        doc.setFontSize(9); doc.setFont('helvetica', 'italic'); doc.setTextColor(107, 107, 104);
        doc.splitTextToSize(`Obs: ${obsGeral}`, cW).forEach(l => { doc.text(l, mL, y); y += 5; });
        y += 4;
    }

    // --- Totais ---
    const leadsDoRelatorio = entradas.flatMap(e => e.leads).filter(l => l.status !== 'Sem procura');
    const totalLeads = leadsDoRelatorio.length;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(0);
    doc.text(`Imoveis: ${entradas.length}   |   Leads: ${totalLeads}`, mL, y);
    y += 12;

    // --- Resumo geral, igual ao painel ao vivo ---
    const totalConvertidos = leadsDoRelatorio.filter(l => l.status === 'Convertido').length;
    const totalEmAndamento = leadsDoRelatorio.filter(l =>
        l.status === 'Em negociação' || l.status === 'Proposta enviada').length;
    const totalSemResposta = leadsDoRelatorio.filter(l => l.status === 'Sem resposta').length;
    const taxaConversao = totalLeads ? Math.round((totalConvertidos / totalLeads) * 100) : 0;

    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 26, 24);
    doc.text('RESUMO GERAL', mL, y); y += 5;
    doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.4);
    doc.line(mL, y, pW - mL, y); y += 7;

    const metricasPDF = [
        ['Total de leads', totalLeads],
        ['Convertidos', totalConvertidos],
        ['Em andamento', totalEmAndamento],
        ['Sem resposta', totalSemResposta],
        ['Conversao', `${taxaConversao}%`]
    ];
    const gapMetrica = 2;
    const larguraMetrica = (cW - gapMetrica * 4) / 5;

    metricasPDF.forEach(([label, valor], indice) => {
        const x = mL + indice * (larguraMetrica + gapMetrica);
        const destaque = indice === metricasPDF.length - 1;
        if (destaque) {
            doc.setFillColor(240, 253, 244);
            doc.setDrawColor(187, 247, 208);
        } else {
            doc.setFillColor(250, 250, 249);
            doc.setDrawColor(226, 226, 223);
        }
        doc.roundedRect(x, y, larguraMetrica, 18, 2, 2, 'FD');
        doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 107, 104);
        doc.text(label, x + 2.5, y + 5);
        doc.setFontSize(13); doc.setFont('helvetica', 'bold');
        doc.setTextColor(destaque ? 22 : 26, destaque ? 101 : 26, destaque ? 52 : 24);
        doc.text(String(valor), x + 2.5, y + 14);
    });
    y += 25;

    // --- Distribuição dos leads por portal ---
    const origensPDF = {};
    leadsDoRelatorio.forEach(lead => {
        const portal = portalDoLead(lead);
        origensPDF[portal] = (origensPDF[portal] || 0) + 1;
    });
    const rankingOrigensPDF = Object.entries(origensPDF)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

    if (rankingOrigensPDF.length) {
        if (y > 245) { doc.addPage(); y = 20; }
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 26, 24);
        doc.text('DE ONDE OS LEADS ESTAO VINDO', mL, y); y += 6;

        rankingOrigensPDF.forEach(([portal, quantidade]) => {
            if (y > 267) { doc.addPage(); y = 20; }
            const percentual = totalLeads ? Math.round((quantidade / totalLeads) * 100) : 0;
            const larguraBarra = Math.max(2, (cW - 58) * (quantidade / totalLeads));

            doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(76, 76, 72);
            doc.text(portal, mL, y);
            doc.setFillColor(229, 231, 235);
            doc.roundedRect(mL + 43, y - 3, cW - 58, 3.2, 1.4, 1.4, 'F');
            doc.setFillColor(37, 99, 235);
            doc.roundedRect(mL + 43, y - 3, larguraBarra, 3.2, 1.4, 1.4, 'F');
            doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 26, 24);
            doc.text(`${quantidade} (${percentual}%)`, pW - mL, y, { align: 'right' });
            y += 7;
        });
        y += 5;
    }

    // --- Grupos Locação / Venda ---
    const locacao = entradas.filter(e => e.finalidade === 'Locação');
    const venda = entradas.filter(e => e.finalidade === 'Compra');

    function renderGrupo(lista, titulo) {
        if (!lista.length) return;
        if (y > 250) { doc.addPage(); y = 20; }

        // Título do grupo
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 26, 24);
        doc.text(titulo, mL, y); y += 5;
        doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.4);
        doc.line(mL, y, pW - mL, y); y += 8;

        lista.forEach((e, idx) => {
            if (y > 265) { doc.addPage(); y = 20; }

            const ref = e.ref || `Imovel ${idx + 1}`;
            const sit = e.situacao;

            // Linha da referência
            doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 26, 24);
            doc.text(ref, mL, y);

            // Tag de situação à direita
            if (sit === 'locado') {
                doc.setTextColor(255, 0, 0);
                doc.text('LOCADO', pW - mL, y, { align: 'right' });
            } else if (sit === 'baixado') {
                doc.setTextColor(0, 0, 0);
                doc.text('BAIXADO', pW - mL, y, { align: 'right' });
            }
            y += 6;

            // Motivo (locado ou baixado)
            if ((sit === 'locado' || sit === 'baixado') && e.motivo) {
                doc.setFontSize(9); doc.setFont('helvetica', 'italic'); doc.setTextColor(107, 107, 104);
                const label = sit === 'locado' ? 'Locacao' : 'Motivo da baixa';
                doc.splitTextToSize(`${label}: ${e.motivo}`, cW - 8)
                    .forEach(l => { if (y > 270) { doc.addPage(); y = 20; } doc.text(l, mL + 4, y); y += 5; });
            }

            // Leads
            const leadsValidos = e.leads.filter(l => l.status !== 'Sem procura');

            if (!leadsValidos.length) {
                doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(180, 180, 180);
                doc.text('Sem leads registrados.', mL + 4, y); y += 7;
            } else {
                // Contagem total
                doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 107, 104);
                doc.text(`${leadsValidos.length} lead${leadsValidos.length !== 1 ? 's' : ''}`, mL + 4, y); y += 5;

                // Agrupamento por status
                const resumo = {};
                leadsValidos.forEach(l => {
                    let s = (l.status || '').trim();
                    if (s === 'Outro' && l.obs) s = `Outro: ${l.obs}`;
                    resumo[s] = (resumo[s] || 0) + 1;
                });

                doc.setTextColor(26, 26, 24);
                ORDEM_PDF.forEach(s => {
                    if (!resumo[s]) return;
                    if (y > 270) { doc.addPage(); y = 20; }
                    doc.text(`${resumo[s]}x  ${s}`, mL + 8, y); y += 5;
                });
                // "Outro: ..." que não bate com a ordem padrão
                Object.keys(resumo).filter(k => k.startsWith('Outro:')).forEach(k => {
                    if (y > 270) { doc.addPage(); y = 20; }
                    doc.text(`${resumo[k]}x  ${k}`, mL + 8, y); y += 5;
                });


                y += 2;
            }

            // Separador leve
            doc.setDrawColor(230, 230, 228); doc.setLineWidth(0.2);
            doc.line(mL, y, pW - mL, y); y += 6;
        });
    }

    renderGrupo(locacao, 'IMOVEIS DE LOCACAO');
    if (venda.length) {
        if (y > 210) { doc.addPage(); y = 20; } else { y += 8; }
        renderGrupo(venda, 'IMOVEIS DE VENDA');
    }

    // --- Relatórios detalhados no final do arquivo ---
    const relatorios = entradas.flatMap(e => e.leads
        .filter(l => l.relatorio && l.relatorio.trim())
        .map(l => ({ entrada: e, lead: l })));

    if (relatorios.length) {
        doc.addPage(); y = 20;
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 26, 24);
        doc.text('RELATORIOS DOS ATENDIMENTOS', mL, y); y += 5;
        doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.4);
        doc.line(mL, y, pW - mL, y); y += 9;

        relatorios.forEach(({ entrada, lead }) => {
            if (y > 250) { doc.addPage(); y = 20; }
            const portal = lead.portal === 'Outro' && lead.portalOutro
                ? lead.portalOutro.trim()
                : (lead.portal || 'Não informado');
            const ref = entrada.ref || 'Imovel sem referencia';
            const nome = lead.nome || 'Lead sem nome';

            doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 26, 24);
            doc.text(`${ref} | ${nome}`, mL, y); y += 5;
            doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 107, 104);
            doc.text(`Portal: ${portal}   |   Status: ${lead.status}`, mL, y); y += 6;
            doc.setFontSize(9); doc.setTextColor(26, 26, 24);
            doc.splitTextToSize(lead.relatorio.trim(), cW).forEach(linha => {
                if (y > 270) { doc.addPage(); y = 20; }
                doc.text(linha, mL, y); y += 5;
            });
            y += 3;
            doc.setDrawColor(230, 230, 228); doc.setLineWidth(0.2);
            doc.line(mL, y, pW - mL, y); y += 7;
        });
    }
    // Rodapé
    const tp = doc.getNumberOfPages();
    for (let i = 1; i <= tp; i++) {
        doc.setPage(i); doc.setFontSize(8); doc.setTextColor(170, 170, 170);
        doc.text(`Pagina ${i} de ${tp}`, mL, 290);
        doc.text(new Date().toLocaleString('pt-BR'), pW - mL, 290, { align: 'right' });
    }

    salvarNoHistorico({ corretor, dataVal, obsGeral });
    doc.save(`feedback_${dataVal || 'relatorio'}.pdf`);
    toast('PDF gerado com sucesso!');
}

// ===== START =====
init();