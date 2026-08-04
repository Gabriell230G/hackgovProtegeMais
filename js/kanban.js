/**
 * kanban.js — Kanban de Denúncias (gestor)
 *
 * 4 colunas = os status oficiais (recebida → analise → encaminhada → concluida).
 * Arrastar um card para outra coluna pede confirmação e muda o status real
 * (reusa atualizarStatus do main.js via um caminho dedicado).
 * Cada card permite atribuir um responsável (da Equipe).
 *
 * Campo de "fluxo interno" (fluxoTrabalho) já é preservado no modelo,
 * mas não exibido ainda — ativação futura.
 */

const Kanban = (() => {

  const COLUNAS = [
    { key: 'recebida',    label: 'Recebida',    cor: '#2563EB' },
    { key: 'analise',     label: 'Em Análise',  cor: '#D97706' },
    { key: 'encaminhada', label: 'Encaminhada', cor: '#7C3AED' },
    { key: 'concluida',   label: 'Concluída',   cor: '#16A34A' },
  ];

  const TIPO_LABELS = {
    violencia: 'Violência Doméstica', assedio: 'Assédio', abuso: 'Abuso',
    discriminacao: 'Discriminação', outros: 'Outras Ocorrências',
  };

  let arrastandoId = null;

  function _denuncias() {
    const mapa = new Map();
    const add = (arr) => (arr || []).forEach(d => {
      if (d && d.id && d.status) mapa.set(d.id, d);
    });
    if (typeof getAllDenuncias === 'function') {
      try { add(getAllDenuncias()); } catch (_) {}
    }
    try { add(JSON.parse(localStorage.getItem('denuncias') || '[]')); } catch (_) {}
    return Array.from(mapa.values());
  }

  function render() {
    const board = document.getElementById('kanban-board');
    if (!board) return;

    const todas = _denuncias();

    board.innerHTML = COLUNAS.map(col => {
      const cards = todas.filter(d => d.status === col.key);
      return `
        <div class="kanban-col" data-status="${col.key}"
             ondragover="Kanban._dragOver(event)"
             ondragleave="Kanban._dragLeave(event)"
             ondrop="Kanban._drop(event, '${col.key}')">
          <div class="kanban-col-head" style="border-top-color:${col.cor}">
            <span class="kc-titulo" style="color:${col.cor}">${col.label}</span>
            <span class="kc-count">${cards.length}</span>
          </div>
          <div class="kanban-col-body">
            ${cards.map(d => _card(d)).join('') ||
              '<div class="kanban-vazio">Sem denúncias</div>'}
          </div>
        </div>`;
    }).join('');
  }

  function _card(d) {
    const tipo = TIPO_LABELS[d.tipo] || d.tipo || 'Denúncia';
    const emerg = d.emergencia ? '<span class="kc-emerg">🚨 Emergência</span>' : '';

    // Nível de anonimato
    let nivel = '';
    if (typeof Anonimato !== 'undefined') {
      const r = Anonimato.rotulo(d.nivelAnonimato || (d.anonimo ? 1 : 3));
      nivel = `<span class="kc-nivel" style="color:${r.cor}">${r.icon} ${r.nome}</span>`;
    }

    // Responsável (select da equipe + confirmação)
    let atribuicao = '';
    if (typeof Equipe !== 'undefined') {
      const resp = d.responsavelId && Equipe.buscarPorId(d.responsavelId);
      const atualLabel = resp ? `👤 ${resp.nome}` : '';
      atribuicao = `
        <div class="kc-atrib">
          <select class="kc-resp" id="resp-${d.id.replace(/[^a-zA-Z0-9]/g,'')}"
                  onchange="Kanban._onSelectResp('${d.id}', this.value)"
                  onclick="event.stopPropagation()" ondragstart="event.preventDefault()">
            ${Equipe.opcoesSelect(d.responsavelId)}
          </select>
          <button class="kc-confirm-resp" id="confirm-${d.id.replace(/[^a-zA-Z0-9]/g,'')}"
                  style="display:none" onclick="event.stopPropagation();Kanban.confirmarResp('${d.id}')">✓ Confirmar</button>
          ${resp ? `<div class="kc-resp-atual">${atualLabel}</div>` : ''}
        </div>`;
    }

    return `
      <div class="kanban-card" draggable="true"
           ondragstart="Kanban._dragStart(event, '${d.id}')"
           ondragend="Kanban._dragEnd(event)">
        <div class="kc-top">
          <span class="kc-proto">${d.id}</span>
          ${emerg}
        </div>
        <div class="kc-tipo">${tipo}</div>
        <div class="kc-local">${_esc(d.local || '')}</div>
        <div class="kc-foot">${nivel}</div>
        ${atribuicao}
      </div>`;
  }

  // ── Drag and drop ───────────────────────────────────────────
  function _dragStart(ev, id) {
    arrastandoId = id;
    ev.dataTransfer.effectAllowed = 'move';
    ev.target.classList.add('dragging');
  }
  function _dragEnd(ev) {
    ev.target.classList.remove('dragging');
  }
  function _dragOver(ev) {
    ev.preventDefault();
    ev.currentTarget.classList.add('drag-over');
  }
  function _dragLeave(ev) {
    ev.currentTarget.classList.remove('drag-over');
  }
  function _drop(ev, novoStatus) {
    ev.preventDefault();
    ev.currentTarget.classList.remove('drag-over');
    if (!arrastandoId) return;

    const id = arrastandoId;
    arrastandoId = null;

    // Descobre status atual
    const d = _denuncias().find(x => x.id === id);
    if (!d) return;
    if (d.status === novoStatus) return;   // soltou na mesma coluna

    // Confirmação antes de mudar
    _confirmarMudanca(id, d.status, novoStatus);
  }

  // Usa o modal de confirmação de status já existente, adaptado ao kanban
  function _confirmarMudanca(id, statusAtual, novoStatus) {
    const LABELS = { recebida: 'Recebida', analise: 'Em Análise', encaminhada: 'Encaminhada', concluida: 'Concluída' };
    const overlay = document.getElementById('status-confirm-overlay');

    if (!overlay) {
      // sem modal: aplica direto
      _aplicar(id, novoStatus);
      return;
    }

    document.getElementById('sc-protocolo').textContent = id;
    document.getElementById('sc-de').textContent   = LABELS[statusAtual] || statusAtual;
    document.getElementById('sc-para').textContent = LABELS[novoStatus] || novoStatus;
    overlay.classList.add('active');

    // Religa os botões do modal para o contexto do kanban
    const btnSim = overlay.querySelector('.btn-confirm-sim');
    const btnNao = overlay.querySelector('.btn-confirm-nao');
    if (btnSim) btnSim.onclick = () => { _aplicar(id, novoStatus); overlay.classList.remove('active'); _restaurarBotoes(btnSim, btnNao); };
    if (btnNao) btnNao.onclick = () => { overlay.classList.remove('active'); render(); _restaurarBotoes(btnSim, btnNao); };
  }

  function _restaurarBotoes(btnSim, btnNao) {
    // devolve o comportamento padrão do StatusConfirm (aba Status)
    if (btnSim) btnSim.onclick = () => { if (typeof StatusConfirm !== 'undefined') StatusConfirm.confirmar(); };
    if (btnNao) btnNao.onclick = () => { if (typeof StatusConfirm !== 'undefined') StatusConfirm.cancelar(); };
  }

  function _aplicar(id, novoStatus) {
    _mudarStatusDireto(id, novoStatus);
    render();
    // Sincroniza outras telas
    if (typeof renderStatusTable === 'function') renderStatusTable();
    if (typeof renderBacklog === 'function') renderBacklog();
    if (typeof updateKPIs === 'function') updateKPIs();
    if (typeof showToast === 'function') showToast('✅ Status atualizado.');
  }

  // Muda status gravando direto (cobre denúncias reais e mocks)
  function _mudarStatusDireto(id, novoStatus) {
    const agora = new Date();
    const entrada = {
      status: novoStatus,
      data: agora.toLocaleDateString('pt-BR'),
      hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    // localStorage (denúncias reais)
    let lista = [];
    try { lista = JSON.parse(localStorage.getItem('denuncias') || '[]'); } catch (_) {}
    const i = lista.findIndex(d => d.id === id);
    if (i >= 0) {
      lista[i].status = novoStatus;
      if (!Array.isArray(lista[i].historico)) lista[i].historico = [];
      lista[i].historico.push(entrada);
      localStorage.setItem('denuncias', JSON.stringify(lista));
    }

    // array em memória do main + mocks
    if (typeof denuncias !== 'undefined' && Array.isArray(denuncias)) {
      const j = denuncias.findIndex(d => d.id === id);
      if (j >= 0) {
        denuncias[j].status = novoStatus;
        if (!Array.isArray(denuncias[j].historico)) denuncias[j].historico = [];
        denuncias[j].historico.push(entrada);
      }
    }
    if (typeof mockDenuncias !== 'undefined' && Array.isArray(mockDenuncias)) {
      const k = mockDenuncias.findIndex(d => d.id === id);
      if (k >= 0) {
        mockDenuncias[k].status = novoStatus;
        if (!Array.isArray(mockDenuncias[k].historico)) mockDenuncias[k].historico = [];
        mockDenuncias[k].historico.push(entrada);
      }
    }
  }

  // ── Atribuição de responsável (com confirmação) ─────────────
  let _pendentesResp = {};   // { idDenuncia: membroIdSelecionado }

  function _onSelectResp(id, membroId) {
    _pendentesResp[id] = membroId;
    const safe = id.replace(/[^a-zA-Z0-9]/g, '');
    const btn = document.getElementById('confirm-' + safe);
    if (!btn) return;
    // Mostra o confirmar só se mudou em relação ao já gravado
    const atual = _respAtual(id);
    if ((membroId || '') !== (atual || '')) {
      const m = (typeof Equipe !== 'undefined') ? Equipe.buscarPorId(membroId) : null;
      btn.textContent = membroId ? `✓ Confirmar ${m ? m.nome.split(' ')[0] : ''}` : '✓ Remover responsável';
      btn.style.display = 'inline-block';
    } else {
      btn.style.display = 'none';
    }
  }

  function confirmarResp(id) {
    const membroId = _pendentesResp[id];
    atribuir(id, membroId);
    delete _pendentesResp[id];
    render();   // redesenha mostrando o responsável atual e escondendo o botão
  }

  function _respAtual(id) {
    const d = _denuncias().find(x => x.id === id);
    return d ? (d.responsavelId || '') : '';
  }

  function atribuir(id, membroId) {
    // grava responsavelId na denúncia (localStorage + memória + mocks)
    let lista = [];
    try { lista = JSON.parse(localStorage.getItem('denuncias') || '[]'); } catch (_) {}
    const i = lista.findIndex(d => d.id === id);
    if (i >= 0) { lista[i].responsavelId = membroId || null; localStorage.setItem('denuncias', JSON.stringify(lista)); }

    [typeof denuncias !== 'undefined' ? denuncias : null,
     typeof mockDenuncias !== 'undefined' ? mockDenuncias : null].forEach(arr => {
      if (!Array.isArray(arr)) return;
      const j = arr.findIndex(d => d.id === id);
      if (j >= 0) arr[j].responsavelId = membroId || null;
    });

    if (typeof showToast === 'function') {
      const m = (typeof Equipe !== 'undefined') ? Equipe.buscarPorId(membroId) : null;
      showToast(m ? `👤 Atribuído a ${m.nome}.` : '👤 Atribuição removida.');
    }
  }

  function _esc(s) {
    return String(s).replace(/[&<>"]/g, c =>
      ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
  }

  return {
    render, atribuir, confirmarResp, _onSelectResp,
    _dragStart, _dragEnd, _dragOver, _dragLeave, _drop,
  };
})();