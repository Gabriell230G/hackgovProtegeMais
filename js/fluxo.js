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
 *
 * Todo texto visível sai do I18n (US14). Como estes painéis são montados por
 * JavaScript, data-i18n não os alcança na troca de idioma: eles escutam o
 * evento 'protege:idioma' e se redesenham.
 */
const Fluxo = (() => {

  // Fallback: se o i18n.js falhar, o painel continua em português em vez de
  // exibir a chave crua na tela do gestor.
  function T(chave, padrao) {
    return (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(chave) : padrao;
  }

  const ROTULO_URGENCIA = {
    CRITICA: { chave: 'urg.critica', padrao: 'Crítica', cor: '#DC2626' },
    ALTA:    { chave: 'urg.alta',    padrao: 'Alta',    cor: '#EA580C' },
    MEDIA:   { chave: 'urg.media',   padrao: 'Média',   cor: '#D97706' },
    BAIXA:   { chave: 'urg.baixa',   padrao: 'Baixa',   cor: '#0891B2' },
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
    alvo.innerHTML = `<div class="fluxo-vazio">${esc(T('fluxo.fila.carregando', 'Carregando a fila…'))}</div>`;

    let dados;
    try {
      dados = await Backend.consultarFila(8);
    } catch (e) {
      alvo.innerHTML = `<div class="fluxo-vazio erro">${esc(T('fluxo.fila.erro', 'Não foi possível consultar a fila.'))} ${esc(e.message)}</div>`;
      return;
    }
    if (!dados) {
      alvo.innerHTML = `<div class="fluxo-vazio">${esc(T('fluxo.fila.offline',
        'A fila de priorização exige a API no ar. No modo local ela não está disponível.'))}</div>`;
      return;
    }

    const meta = document.getElementById('fila-meta');
    if (meta) {
      meta.innerHTML = `<span><b>${dados.totalNaFila}</b> ${esc(T('fluxo.fila.aberto', 'em aberto'))}</span>`
        + `<span>${esc(T('fluxo.fila.mais_antigo', 'mais antigo há'))} <b>${dados.diasDeEsperaDoMaisAntigo}</b> ${esc(T('fluxo.fila.dias', 'dia(s)'))}</span>`
        + `<span class="fluxo-estrutura">${esc(dados.estrutura)}</span>`;
    }

    if (!dados.proximos || dados.proximos.length === 0) {
      alvo.innerHTML = `<div class="fluxo-vazio">${esc(T('fluxo.fila.vazia', 'Nenhum caso aguardando atendimento.'))}</div>`;
      const btn = document.getElementById('btn-atender');
      if (btn) btn.disabled = true;
      return;
    }

    const btn = document.getElementById('btn-atender');
    if (btn) btn.disabled = false;

    alvo.innerHTML = dados.proximos.map((d, i) => {
      const r = ROTULO_URGENCIA[d.urgenciaIa];
      const u = r ? { txt: T(r.chave, r.padrao), cor: r.cor }
                  : { txt: d.urgenciaIa || '—', cor: '#64748B' };
      return `<div class="fila-item ${i === 0 ? 'topo' : ''}">
        <div class="fila-pos">${i + 1}º</div>
        <div class="fila-corpo">
          <div class="fila-linha1">
            <span class="fila-proto">${esc(d.protocolo)}</span>
            <span class="fila-urg" style="background:${u.cor}1a;color:${u.cor}">${esc(u.txt)}</span>
          </div>
          <div class="fila-linha2">
            <span>${esc(d.tipo)}</span> · <span>${esc(d.local || '—')}</span>
            · <span>${esc(T('fluxo.score', 'score'))} ${d.score}</span>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  async function atenderProximo() {
    const btn = document.getElementById('btn-atender');
    if (btn) { btn.disabled = true; btn.textContent = T('fluxo.fila.atendendo', 'Atendendo…'); }
    try {
      const caso = await Backend.atenderProximo();
      aviso(`✅ ${caso.protocolo} ${T('fluxo.assumido', 'assumido para análise.')}`);
      await Promise.all([carregarFila(), carregarPilha()]);
      if (typeof Kanban !== 'undefined' && Kanban.render) Kanban.render();
    } catch (e) {
      aviso('❌ ' + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = T('fluxo.fila.atender', '▶ Atender próximo'); }
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
      alvo.innerHTML = `<div class="fluxo-vazio">${esc(T('fluxo.pilha.vazia', 'Nenhuma ação recente para desfazer.'))}</div>`;
      if (btn) btn.disabled = true;
      return;
    }
    if (btn) btn.disabled = false;

    const meta = document.getElementById('pilha-meta');
    if (meta) {
      meta.innerHTML = `<span><b>${dados.tamanho}</b> ${esc(T('fluxo.pilha.de', 'de'))} ${dados.profundidadeMaxima}</span>`
        + `<span class="fluxo-estrutura">${esc(dados.estrutura)}</span>`;
    }

    alvo.innerHTML = dados.acoes.map((a, i) => `
      <div class="pilha-item ${i === 0 ? 'topo' : ''}">
        ${i === 0 ? `<span class="pilha-tag">${esc(T('fluxo.pilha.topo', 'topo'))}</span>` : ''}
        <div class="pilha-desc">${esc(a.descricao)}</div>
        <div class="pilha-hora">${esc((a.quando || '').replace('T', ' ').slice(0, 16))}</div>
      </div>`).join('');
  }

  async function desfazer() {
    const btn = document.getElementById('btn-desfazer');
    if (btn) { btn.disabled = true; btn.textContent = T('fluxo.pilha.desfazendo', 'Desfazendo…'); }
    try {
      const caso = await Backend.desfazerUltima();
      aviso(`↩️ ${caso.protocolo} ${T('fluxo.pilha.voltou', 'voltou para')} "${caso.status}". `
          + T('fluxo.pilha.nota', 'O histórico registra o retorno como evento novo.'));
      await Promise.all([carregarFila(), carregarPilha()]);
      if (typeof Kanban !== 'undefined' && Kanban.render) Kanban.render();
    } catch (e) {
      aviso('❌ ' + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = T('fluxo.pilha.desfazer', '↩ Desfazer última'); }
    }
  }

  async function atualizar() {
    await Promise.all([carregarFila(), carregarPilha()]);
  }

  // Redesenha na troca de idioma, mas so se o painel estiver na tela:
  // recarregar a fila com a aba fechada seria uma chamada de API desperdicada.
  document.addEventListener('protege:idioma', () => {
    const painel = document.getElementById('tab-kanban');
    if (painel && painel.style.display !== 'none') atualizar();
  });

  return { atualizar, carregarFila, carregarPilha, atenderProximo, desfazer };
})();

window.Fluxo = Fluxo;
