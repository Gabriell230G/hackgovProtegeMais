/**
 * detalhe.js — ficha completa de um caso, no painel do órgão (US26 / Parte 5).
 *
 * Por que esta tela precisava existir
 * ----------------------------------
 * Até aqui o botão de "ver" do backlog levava o servidor público para a
 * MESMA tela de consulta que o cidadão usa. Ele via situação e linha do
 * tempo — e mais nada. Nunca via o relato, nunca via o endereço, nunca via
 * o resumo da IA. Trabalhar o caso era, na prática, impossível.
 *
 * O efeito colateral era pior que a falta da tela: como nenhuma tela
 * chamava GET /api/denuncias/{id}, a ação CONSULTA_SENSIVEL nunca disparava
 * pela interface. O sistema afirmava auditar a leitura de dado sensível e
 * auditava um endpoint que a interface não usava.
 *
 * O que esta tela demonstra
 * -------------------------
 * O mascaramento é do SERVIDOR, não daqui. Abrir o mesmo caso como
 * ATENDENTE e como GESTOR devolve conteúdos diferentes: o endereço chega
 * como "[endereco protegido]" para quem não pode vê-lo. O front apenas
 * exibe o que recebeu — não há campo escondido esperando um F12.
 *
 * E cada abertura desta ficha vira uma linha na trilha de auditoria, com
 * usuário, perfil, recurso e hora.
 */
const Detalhe = (() => {

  function T(chave, padrao) {
    return (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(chave) : padrao;
  }

  const TIPOS = {
    violencia: 'Violência Doméstica', assedio: 'Assédio', abuso: 'Abuso',
    discriminacao: 'Discriminação', outros: 'Outras Ocorrências',
  };
  const STATUS = {
    recebida: 'Recebida', analise: 'Em Análise',
    encaminhada: 'Encaminhada', concluida: 'Concluída',
  };

  let caso = null;      // resposta da API
  let editando = false;

  function esc(t) {
    const d = document.createElement('div');
    d.textContent = t == null ? '' : String(t);
    return d.innerHTML;
  }

  function dataHora(v) {
    return String(v || '').replace('T', ' ').slice(0, 16) || '—';
  }

  function montar() {
    if (document.getElementById('det-overlay')) return;
    const div = document.createElement('div');
    div.id = 'det-overlay';
    div.className = 'det-overlay';
    div.innerHTML = '<div class="det-box" id="det-box"></div>';
    div.addEventListener('click', e => { if (e.target === div) fechar(); });
    document.body.appendChild(div);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') fechar();
    });
  }

  /**
   * Abre a ficha.
   *
   * @param apiId  id numérico do banco. Sem ele não há como consultar o
   *               detalhe — é o caso do modo local, e aí a ficha avisa em
   *               vez de mostrar uma tela vazia.
   */
  async function abrir(apiId, protocolo) {
    montar();
    editando = false;
    document.getElementById('det-overlay').classList.add('active');
    const box = document.getElementById('det-box');
    box.innerHTML = `<div class="det-carregando">${esc(T('det.carregando', 'Carregando o caso…'))}</div>`;

    if (apiId == null) {
      box.innerHTML = `<div class="det-carregando erro">
        ${esc(T('det.local', 'A ficha completa é servida pela API. No modo local só a situação e a linha do tempo estão disponíveis.'))}
        <div class="det-acoes"><button class="fluxo-btn secundario" onclick="Detalhe.fechar()">${esc(T('emerg.fechar','Fechar'))}</button></div>
      </div>`;
      return;
    }

    try {
      caso = await Backend.detalharDenuncia(apiId);
    } catch (e) {
      box.innerHTML = `<div class="det-carregando erro">${e.status === 403 ? '🚫 ' : '❌ '}${esc(e.message)}
        <div class="det-acoes"><button class="fluxo-btn secundario" onclick="Detalhe.fechar()">${esc(T('emerg.fechar','Fechar'))}</button></div>
      </div>`;
      return;
    }
    if (!caso) {
      box.innerHTML = `<div class="det-carregando erro">${esc(T('det.nao_encontrado','Caso não encontrado.'))}</div>`;
      return;
    }
    render();
    if (typeof Evidencias !== 'undefined') carregarAnexos();
  }

  function fechar() {
    document.getElementById('det-overlay')?.classList.remove('active');
    caso = null;
  }

  /** O endereço protegido chega assim do servidor; a tela só o destaca. */
  function enderecoHtml() {
    const v = caso.endereco;
    if (!v) return `<span class="det-vazio">${esc(T('det.sem_endereco','não informado'))}</span>`;
    if (String(v).includes('protegido')) {
      return `<span class="det-protegido" title="${esc(T('det.mascara_dica','O servidor não enviou o endereço para o seu perfil'))}">🔒 ${esc(v)}</span>`;
    }
    return esc(v);
  }

  function podeExcluir() {
    const p = (typeof Backend !== 'undefined' && Backend.perfilAtual()) || '';
    return p === 'GESTOR' || p === 'ADMIN';
  }

  function render() {
    const box = document.getElementById('det-box');
    const linha = (rot, val) => `<div class="det-linha"><span>${esc(rot)}</span><div>${val}</div></div>`;

    box.innerHTML = `
      <div class="det-topo">
        <div>
          <div class="det-proto">${esc(caso.protocolo)}</div>
          <div class="det-sub">${esc(TIPOS[caso.tipo] || caso.tipo)} · ${esc(caso.local || '—')}</div>
        </div>
        <button class="det-fechar" onclick="Detalhe.fechar()" title="${esc(T('emerg.fechar','Fechar'))}">✕</button>
      </div>

      <div class="det-tags">
        <span class="det-tag status-${esc(caso.status)}">${esc(STATUS[caso.status] || caso.status)}</span>
        <span class="det-tag">${esc(T('det.score','score'))} ${caso.score} · ${esc(caso.scoreTxt || '')}</span>
        ${caso.urgenciaIa ? `<span class="det-tag urg">${esc(T('det.urgencia','urgência'))} ${esc(caso.urgenciaIa)}</span>` : ''}
        <span class="det-tag ${caso.anonimo ? 'anon' : ''}">${caso.anonimo
            ? '🕵️ ' + esc(T('det.anonima','anônima'))
            : '👤 ' + esc(T('det.identificada','identificada'))}</span>
      </div>

      ${editando ? formulario() : `
        <div class="det-bloco">
          <h4>${esc(T('det.relato','Relato'))}</h4>
          <p class="det-relato">${esc(caso.descricao) || `<span class="det-vazio">${esc(T('det.sem_relato','sem relato registrado'))}</span>`}</p>
        </div>
        ${linha(T('det.endereco','Endereço'), enderecoHtml())}
      `}

      ${linha(T('det.registrada','Registrada em'), esc(dataHora(caso.criadoEm)))}
      ${caso.concluidaEm ? linha(T('det.concluida','Concluída em'), esc(dataHora(caso.concluidaEm))) : ''}

      ${caso.resumoIa ? `
        <div class="det-bloco ia">
          <h4>🤖 ${esc(T('det.resumo_ia','Leitura do VigIA'))}
            <span class="det-origem">${esc(T('det.origem','origem'))}: ${esc(caso.origemAnalise || '—')}</span>
          </h4>
          <p>${esc(caso.resumoIa)}</p>
          <div class="det-nota">${esc(T('det.origem_nota','A origem da análise é persistida: decisão automatizada precisa ter fundamento declarado e rastreável.'))}</div>
        </div>` : ''}

      <div class="det-bloco">
        <h4>📎 ${esc(T('det.anexos','Anexos'))}</h4>
        <div class="evid-lista" id="det-anexos"></div>
      </div>

      <div class="det-bloco">
        <h4>🕒 ${esc(T('status.hist','Histórico de Atualizações'))}</h4>
        <div class="det-timeline">
          ${(caso.historico || []).map(h => `
            <div class="det-passo">
              <span class="det-passo-st">${esc(STATUS[h.status] || h.status)}</span>
              <span class="det-passo-dt">${esc(h.data || '')} ${esc(h.hora || '')}</span>
            </div>`).join('') || `<span class="det-vazio">${esc(T('det.sem_historico','sem eventos registrados'))}</span>`}
        </div>
      </div>

      <div class="det-acoes">
        ${editando
          ? `<button class="fluxo-btn primario" onclick="Detalhe.salvar()">${esc(T('det.salvar','Salvar alterações'))}</button>
             <button class="fluxo-btn secundario" onclick="Detalhe.cancelarEdicao()">${esc(T('sc.cancelar','Cancelar'))}</button>`
          : `<button class="fluxo-btn secundario" onclick="Detalhe.reanalisar()">🤖 ${esc(T('det.reanalisar','Reanalisar'))}</button>
             <button class="fluxo-btn secundario" onclick="Detalhe.editar()">✏️ ${esc(T('det.editar','Editar'))}</button>
             ${podeExcluir()
                ? `<button class="fluxo-btn perigo" onclick="Detalhe.excluir()">🗑 ${esc(T('det.excluir','Excluir'))}</button>`
                : ''}
             <button class="fluxo-btn secundario" onclick="Detalhe.fechar()">${esc(T('emerg.fechar','Fechar'))}</button>`}
      </div>

      <div class="det-rodape">${esc(T('det.auditoria','Esta leitura foi registrada na trilha de auditoria com o seu usuário, perfil e horário.'))}</div>
    `;
  }

  function formulario() {
    return `
      <div class="det-bloco">
        <h4>${esc(T('det.editando','Editando o caso'))}</h4>
        <label class="det-rot">${esc(T('form.tipo_label','Tipo'))}</label>
        <select id="det-tipo">
          ${Object.entries(TIPOS).map(([v, r]) =>
            `<option value="${v}" ${v === caso.tipo ? 'selected' : ''}>${esc(r)}</option>`).join('')}
        </select>
        <label class="det-rot">${esc(T('det.relato','Relato'))}</label>
        <textarea id="det-descricao" rows="5">${esc(caso.descricao || '')}</textarea>
        <label class="det-rot">${esc(T('det.endereco','Endereço'))}</label>
        <input type="text" id="det-endereco" value="${esc(String(caso.endereco || '').includes('protegido') ? '' : (caso.endereco || ''))}">
        <div class="det-nota">${esc(T('det.editar_nota','A alteração é gravada pelo servidor e registrada na trilha como ALTERACAO_DADOS.'))}</div>
      </div>`;
  }

  function editar() { editando = true; render(); }
  function cancelarEdicao() { editando = false; render(); }

  async function salvar() {
    const corpo = {
      tipo: document.getElementById('det-tipo').value,
      descricao: document.getElementById('det-descricao').value,
      estado: caso.estado,
      cidade: caso.cidade,
      endereco: document.getElementById('det-endereco').value,
      anonimo: caso.anonimo,
    };
    try {
      await Backend.atualizarDenuncia(caso.id, corpo);
      caso = await Backend.detalharDenuncia(caso.id);
      editando = false;
      render();
      if (typeof Evidencias !== 'undefined') carregarAnexos();
      if (typeof Sincronia !== 'undefined') Sincronia.recarregar();
      if (typeof showToast === 'function') showToast(T('det.salvo', '✅ Caso atualizado. A alteração está na trilha de auditoria.'));
    } catch (e) {
      if (typeof showToast === 'function') showToast((e.status === 403 ? '🚫 ' : '❌ ') + e.message);
    }
  }

  /**
   * Exclusão lógica com motivo obrigatório.
   *
   * O aviso é explícito de propósito: o relato e o endereço são destruídos,
   * o registro permanece. É o equilíbrio entre o direito de eliminação
   * (LGPD, art. 18, VI) e o dever de rastreabilidade da administração
   * pública — e quem clica precisa saber qual dos dois está exercendo.
   */
  async function excluir() {
    const motivo = prompt(T('det.motivo',
      'Motivo da exclusão (obrigatório).\n\nO relato e o endereço serão destruídos. O registro permanece, com motivo e data, para preservar a rastreabilidade.'));
    if (motivo === null) return;
    try {
      await Backend.excluirDenuncia(caso.id, motivo);
      fechar();
      if (typeof Sincronia !== 'undefined') Sincronia.recarregar();
      if (typeof showToast === 'function') showToast(T('det.excluido', '🗑 Caso excluído e anonimizado. A operação está na trilha de auditoria.'));
    } catch (e) {
      if (typeof showToast === 'function') showToast((e.status === 403 ? '🚫 ' : '❌ ') + e.message);
    }
  }

  /**
   * Pede ao VigIA que releia o caso.
   *
   * Existe por dois motivos. O operacional: depois de editar o relato, a
   * urgencia atribuida antes pode nao valer mais. E o de governanca: a acao
   * REANALISE_IA e uma das que a Parte 5 lista como geradoras de trilha, e
   * ate aqui nenhuma tela a disparava - uma decisao automatizada pode ser
   * refeita, e quem a refez precisa ficar registrado.
   */
  async function reanalisar() {
    try {
      await Backend.reanalisar(caso.id);
      caso = await Backend.detalharDenuncia(caso.id);
      render();
      if (typeof Evidencias !== 'undefined') carregarAnexos();
      if (typeof Sincronia !== 'undefined') Sincronia.recarregar();
      if (typeof showToast === 'function') {
        showToast(T('det.reanalisado', '🤖 Caso reanalisado. A reanálise ficou registrada na trilha.'));
      }
    } catch (e) {
      if (typeof showToast === 'function') showToast((e.status === 403 ? '🚫 ' : '❌ ') + e.message);
    }
  }

  async function carregarAnexos() {
    const alvo = document.getElementById('det-anexos');
    if (!alvo) return;
    let lista = [];
    try { lista = await Backend.listarEvidencias(caso.id); } catch (_) { lista = []; }
    if (!lista.length) {
      alvo.innerHTML = `<div class="evid-vazio">${esc(T('evid.vazio', 'Nenhum arquivo anexado a esta denúncia.'))}</div>`;
      return;
    }
    alvo.innerHTML = lista.map(e => `
      <div class="evid-item">
        <span class="evid-ic">📎</span>
        <div class="evid-corpo">
          <div class="evid-nome">${esc(e.nomeOriginal)}</div>
          <div class="evid-meta">${esc(e.tipoConteudo)} · ${(e.tamanhoBytes / 1024).toFixed(0)} KB</div>
          <div class="evid-hash">${esc((e.hashSha256 || '').slice(0, 24))}…</div>
        </div>
        <button class="fluxo-btn secundario" onclick="Evidencias.baixar(${e.id})">⬇</button>
      </div>`).join('');
  }

  return { abrir, fechar, editar, cancelarEdicao, salvar, excluir, reanalisar };
})();

window.Detalhe = Detalhe;
