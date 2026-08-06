/**
 * fluxo.js — Fila de priorização e pilha de ações (US20 e US21).
 *
 * Torna visíveis, na interface, as duas estruturas de dados avançadas que
 * sustentam o fluxo de atendimento no servidor:
 *
 *   FILA  — heap binário. Ordena por urgência do VigIA, depois score de
 *           confiabilidade e, por fim, antiguidade. O último critério evita
 *           que casos de baixa urgência fiquem indefinidamente sem atendimento.
 *
 *   PILHA — LIFO por servidor. Desfazer reverte sempre a ação mais recente;
 *           é impossível, por construção, desfazer uma ação do meio do
 *           histórico e deixar o caso num estado que nunca existiu.
 *
 * Desfazer NÃO reescreve a linha do tempo da denúncia: acrescenta um evento
 * novo restaurando o status anterior. Num sistema público, poder apagar a
 * própria pegada anularia a rastreabilidade.
 */
const Fluxo = (() => {

  const ROTULO_URGENCIA = {
    CRITICA: { txt: 'Crítica', cor: '#DC2626' },
    ALTA:    { txt: 'Alta',    cor: '#EA580C' },
    MEDIA:   { txt: 'Média',   cor: '#D97706' },
    BAIXA:   { txt: 'Baixa',   cor: '#0891B2' },
  };

  function aviso(msg) {
    if (typeof showToast === 'function') showToast(msg);
    else console.log('[Fluxo]', msg);
  }

  function esc(t) {
    const d = document.createElement('div');
    d.textContent = t == null ? '' : String(t);
    return d.innerHTML;
  }

  // ── FILA ────────────────────────────────────────────────────
  async function carregarFila() {
    const alvo = document.getElementById('fila-conteudo');
    if (!alvo) return;
    alvo.innerHTML = '<div class="fluxo-vazio">Carregando a fila…</div>';

    let dados;
    try {
      dados = await Backend.consultarFila(8);
    } catch (e) {
      alvo.innerHTML = `<div class="fluxo-vazio erro">Não foi possível consultar a fila. ${esc(e.message)}</div>`;
      return;
    }
    if (!dados) {
      alvo.innerHTML = '<div class="fluxo-vazio">A fila de priorização exige a API no ar. '
                     + 'No modo local ela não está disponível.</div>';
      return;
    }

    const meta = document.getElementById('fila-meta');
    if (meta) {
      meta.innerHTML = `<span><b>${dados.totalNaFila}</b> em aberto</span>`
        + `<span>mais antigo há <b>${dados.diasDeEsperaDoMaisAntigo}</b> dia(s)</span>`
        + `<span class="fluxo-estrutura">${esc(dados.estrutura)}</span>`;
    }

    if (!dados.proximos || dados.proximos.length === 0) {
      alvo.innerHTML = '<div class="fluxo-vazio">Nenhum caso aguardando atendimento.</div>';
      const btn = document.getElementById('btn-atender');
      if (btn) btn.disabled = true;
      return;
    }

    const btn = document.getElementById('btn-atender');
    if (btn) btn.disabled = false;

    alvo.innerHTML = dados.proximos.map((d, i) => {
      const u = ROTULO_URGENCIA[d.urgenciaIa] || { txt: d.urgenciaIa || '—', cor: '#64748B' };
      return `<div class="fila-item ${i === 0 ? 'topo' : ''}">
        <div class="fila-pos">${i + 1}º</div>
        <div class="fila-corpo">
          <div class="fila-linha1">
            <span class="fila-proto">${esc(d.protocolo)}</span>
            <span class="fila-urg" style="background:${u.cor}1a;color:${u.cor}">${esc(u.txt)}</span>
          </div>
          <div class="fila-linha2">
            <span>${esc(d.tipo)}</span> · <span>${esc(d.local || '—')}</span>
            · <span>score ${d.score}</span>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  async function atenderProximo() {
    const btn = document.getElementById('btn-atender');
    if (btn) { btn.disabled = true; btn.textContent = 'Atendendo…'; }
    try {
      const caso = await Backend.atenderProximo();
      aviso(`✅ Caso ${caso.protocolo} assumido para análise.`);
      await Promise.all([carregarFila(), carregarPilha()]);
      if (typeof Kanban !== 'undefined' && Kanban.render) Kanban.render();
    } catch (e) {
      aviso('❌ ' + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '▶ Atender próximo'; }
    }
  }

  // ── PILHA ───────────────────────────────────────────────────
  async function carregarPilha() {
    const alvo = document.getElementById('pilha-conteudo');
    if (!alvo) return;

    let dados;
    try {
      dados = await Backend.consultarPilha();
    } catch (_) {
      dados = null;
    }
    const btn = document.getElementById('btn-desfazer');

    if (!dados || !dados.acoes || dados.acoes.length === 0) {
      alvo.innerHTML = '<div class="fluxo-vazio">Nenhuma ação recente para desfazer.</div>';
      if (btn) btn.disabled = true;
      return;
    }
    if (btn) btn.disabled = false;

    const meta = document.getElementById('pilha-meta');
    if (meta) {
      meta.innerHTML = `<span><b>${dados.tamanho}</b> de ${dados.profundidadeMaxima}</span>`
        + `<span class="fluxo-estrutura">${esc(dados.estrutura)}</span>`;
    }

    alvo.innerHTML = dados.acoes.map((a, i) => `
      <div class="pilha-item ${i === 0 ? 'topo' : ''}">
        ${i === 0 ? '<span class="pilha-tag">topo</span>' : ''}
        <div class="pilha-desc">${esc(a.descricao)}</div>
        <div class="pilha-hora">${esc((a.quando || '').replace('T', ' ').slice(0, 16))}</div>
      </div>`).join('');
  }

  async function desfazer() {
    const btn = document.getElementById('btn-desfazer');
    if (btn) { btn.disabled = true; btn.textContent = 'Desfazendo…'; }
    try {
      const caso = await Backend.desfazerUltima();
      aviso(`↩️ ${caso.protocolo} voltou para "${caso.status}". O histórico registra o retorno como evento novo.`);
      await Promise.all([carregarFila(), carregarPilha()]);
      if (typeof Kanban !== 'undefined' && Kanban.render) Kanban.render();
    } catch (e) {
      aviso('❌ ' + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '↩ Desfazer última'; }
    }
  }

  async function atualizar() {
    await Promise.all([carregarFila(), carregarPilha()]);
  }

  return { atualizar, carregarFila, carregarPilha, atenderProximo, desfazer };
})();

window.Fluxo = Fluxo;
