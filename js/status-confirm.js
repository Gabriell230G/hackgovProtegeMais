/**
 * status-confirm.js — Modal de confirmação de mudança de status (gestor)
 *
 * Envolve a função atualizarStatus() do main.js sem reescrevê-la.
 * O botão "Salvar" passa a pedir confirmação mostrando a transição,
 * evitando mudanças acidentais. Registra quem mudou e quando já é
 * feito pela atualizarStatus original (histórico com data/hora).
 */

const StatusConfirm = (() => {

  const LABELS = { recebida: 'Recebida', analise: 'Em Análise', encaminhada: 'Encaminhada', concluida: 'Concluída' };
  let pendente = null;   // { id, key, novoStatus, statusAtual }

  /** Substitui a chamada direta do botão. Mostra o modal antes de aplicar. */
  function solicitar(id, key) {
    const sel = document.getElementById('ns-' + key);
    if (!sel) return;
    const novoStatus = sel.value;

    // Descobre o status atual a partir da linha
    const all = (typeof getAllDenuncias === 'function') ? getAllDenuncias() : [];
    const atual = all.find(d => d.id === id);
    const statusAtual = atual ? atual.status : null;

    // Se não mudou nada, nem abre o modal
    if (statusAtual === novoStatus) {
      if (typeof showToast === 'function') showToast('ℹ️ O status selecionado é o mesmo atual.');
      return;
    }

    pendente = { id, key, novoStatus, statusAtual };

    const box = document.getElementById('status-confirm-overlay');
    if (!box) { // fallback: aplica direto se o modal não existir
      if (typeof atualizarStatus === 'function') atualizarStatus(id, key);
      return;
    }

    document.getElementById('sc-protocolo').textContent = id;
    document.getElementById('sc-de').textContent   = LABELS[statusAtual] || statusAtual || '—';
    document.getElementById('sc-para').textContent = LABELS[novoStatus] || novoStatus;
    box.classList.add('active');
  }

  function confirmar() {
    if (pendente && typeof atualizarStatus === 'function') {
      atualizarStatus(pendente.id, pendente.key);   // usa a função original do main.js
    }
    cancelar();
  }

  function cancelar() {
    document.getElementById('status-confirm-overlay')?.classList.remove('active');
    // Reverte o select pro status anterior se cancelado
    if (pendente && pendente.statusAtual) {
      const sel = document.getElementById('ns-' + pendente.key);
      if (sel) sel.value = pendente.statusAtual;
    }
    pendente = null;
  }

  return { solicitar, confirmar, cancelar };
})();