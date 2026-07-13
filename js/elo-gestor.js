/**
 * elo-gestor.js — Elo de Mão Dupla (lado do GESTOR)
 *
 * Permite que a autoridade abra o canal seguro de uma denúncia,
 * veja a conversa e faça perguntas ao denunciante anônimo.
 * Usa Anonimato.* para ler/gravar as mensagens.
 */

const EloGestor = (() => {

  let idAtual = null;   // codigoAcompanhamento ou id da denúncia aberta

  /** Abre o modal do canal para uma denúncia (por código ou protocolo). */
  function abrir(identificador) {
    const d = Anonimato.consultarPorCodigo(identificador) ||
              Anonimato.consultarPorProtocolo(identificador);
    if (!d) {
      if (typeof showToast === 'function') showToast('❌ Denúncia não encontrada.');
      return;
    }
    if (!Anonimato.temCanal(d)) {
      if (typeof showToast === 'function')
        showToast('🕶️ Esta denúncia é anônima total — não possui canal de retorno.');
      return;
    }

    idAtual = d.codigoAcompanhamento || d.id;
    Anonimato.marcarMensagensLidas(idAtual, 'gestor');

    document.getElementById('elo-gestor-proto').textContent =
      `${d.id}${d.codigoAcompanhamento ? ' · ' + d.codigoAcompanhamento : ''}`;
    _render(d);
    document.getElementById('elo-gestor-overlay')?.classList.add('active');

    // Atualiza a tabela (remove o badge de pendência ao abrir)
    if (typeof renderStatusTable === 'function') setTimeout(renderStatusTable, 50);
  }

  function fechar() {
    document.getElementById('elo-gestor-overlay')?.classList.remove('active');
    idAtual = null;
  }

  function enviar() {
    const input = document.getElementById('elo-input-gestor');
    if (!input || !idAtual) return;
    const texto = input.value.trim();
    if (!texto) return;

    Anonimato.adicionarMensagem(idAtual, 'gestor', texto);
    input.value = '';

    const d = Anonimato.consultarPorCodigo(idAtual) || Anonimato.consultarPorProtocolo(idAtual);
    if (d) _render(d);
    if (typeof showToast === 'function') showToast('✅ Pergunta enviada ao denunciante.');
  }

  function _render(d) {
    const box = document.getElementById('elo-msgs-gestor');
    if (!box) return;
    const msgs = Array.isArray(d.mensagens) ? d.mensagens : [];

    box.innerHTML = msgs.length === 0
      ? `<div class="elo-vazio">Nenhuma mensagem ainda.<br>Faça uma pergunta para pedir mais informações ao denunciante, mantendo o anonimato dele.</div>`
      : msgs.map(m => `
          <div class="elo-msg ${m.autor === 'gestor' ? 'cidadao' : 'gestor'}">
            <div class="elo-autor">${m.autor === 'gestor' ? '🏛️ Você (autoridade)' : '🙋 Denunciante'}</div>
            ${_esc(m.texto)}
            <div class="elo-meta">${m.data} ${m.hora}</div>
          </div>`).join('');
    setTimeout(() => { box.scrollTop = box.scrollHeight; }, 50);
  }

  function _esc(s) {
    return String(s).replace(/[&<>"]/g, c =>
      ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
  }

  return { abrir, fechar, enviar };
})();