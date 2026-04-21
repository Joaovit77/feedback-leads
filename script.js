// ===== ESTADO =====
let entradas = [];
let contador = 0;

const STATUS_LEAD = [
    'Sem resposta', 'Sem interesse', 'Visitou o imóvel',
    'Proposta enviada', 'Em negociação', 'Convertido', 'Sem procura', 'Outro'
];

const ORDEM_PDF = [
    'Convertido', 'Em negociação', 'Proposta enviada',
    'Visitou o imóvel', 'Sem resposta', 'Sem interesse', 'Outro'
];

// ===== INIT =====
function init() {
    document.getElementById('fb-data').value = new Date().toISOString().split('T')[0];
    adicionarEntrada();
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
    entradas.push({ id: contador, ref: '', finalidade: 'Locação', situacao: 'ativo', motivo: '', leads: [] });
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
    e.leads.push({ id: Date.now() + Math.random(), nome: '', status: 'Sem resposta', obs: '' });
    renderEntradas();
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
}

function onSituacaoChange(sel, entradaId) {
    const e = entradas.find(x => x.id === entradaId);
    if (e) { e.situacao = sel.value; renderEntradas(); }
}

function onFinalidadeChange(sel, entradaId) {
    const e = entradas.find(x => x.id === entradaId);
    if (e) e.finalidade = sel.value;
}

function onStatusLeadChange(sel, entradaId, leadId) {
    atualizarLead(entradaId, leadId, 'status', sel.value);
    // mostra/esconde campo "Outro"
    const item = sel.closest('.fb-lead-item');
    const outro = item.querySelector('.campo-outro');
    if (outro) outro.style.display = sel.value === 'Outro' ? 'block' : 'none';
}

// ===== RENDER =====
function renderEntradas() {
    const container = document.getElementById('fb-entradas');
    if (!entradas.length) {
        container.innerHTML = '<p style="font-size:13px;color:var(--hint);padding:0.5rem 0 1rem;">Nenhum imóvel. Clique em "+ Adicionar imóvel".</p>';
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

      <div class="fb-leads-titulo">Leads (${e.leads.length})</div>

      ${e.leads.map(l => `
        <div class="fb-lead-item">
          <input type="text" placeholder="Nome do lead (opcional)"
            value="${l.nome}"
            oninput="atualizarLead(${e.id},${l.id},'nome',this.value)" />
          <select onchange="onStatusLeadChange(this,${e.id},${l.id})">
            ${STATUS_LEAD.map(s => `<option value="${s}" ${l.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
          <button class="btn-remover" onclick="removerLead(${e.id},${l.id})" title="Remover lead">×</button>
          <div class="campo-outro" style="display:${l.status === 'Outro' ? 'block' : 'none'}">
            <input type="text" placeholder="Descreva o feedback..."
              value="${l.obs || ''}"
              oninput="atualizarLead(${e.id},${l.id},'obs',this.value)" />
          </div>
        </div>`).join('')}

      <button class="btn-add-lead" onclick="adicionarLead(${e.id})">+ Adicionar lead</button>
    </div>`;
    }).join('');
}

// ===== LIMPAR =====
function limpar() {
    if (!confirm('Limpar tudo?')) return;
    entradas = []; contador = 0;
    document.getElementById('fb-corretor').value = '';
    document.getElementById('fb-obs-geral').value = '';
    document.getElementById('fb-data').value = new Date().toISOString().split('T')[0];
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
    const totalLeads = entradas.reduce((acc, e) => acc + e.leads.filter(l => l.status !== 'Sem procura').length, 0);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(0);
    doc.text(`Imoveis: ${entradas.length}   |   Leads: ${totalLeads}`, mL, y);
    y += 12;

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

    // Rodapé
    const tp = doc.getNumberOfPages();
    for (let i = 1; i <= tp; i++) {
        doc.setPage(i); doc.setFontSize(8); doc.setTextColor(170, 170, 170);
        doc.text(`Pagina ${i} de ${tp}`, mL, 290);
        doc.text(new Date().toLocaleString('pt-BR'), pW - mL, 290, { align: 'right' });
    }

    doc.save(`feedback_${dataVal || 'relatorio'}.pdf`);
    toast('PDF gerado com sucesso!');
}

// ===== START =====
init();