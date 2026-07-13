/**
 * equipe.js — Gestão de Equipe
 * O gestor cadastra membros (nome + papel + setor/região) que podem
 * ser atribuídos como responsáveis pelas denúncias no Kanban.
 * Persiste no localStorage.
 */

const Equipe = (() => {

  const CHAVE = 'protege_equipe';

  function _ler() {
    try { return JSON.parse(localStorage.getItem(CHAVE) || '[]'); }
    catch { return []; }
  }

  function _salvar(lista) {
    localStorage.setItem(CHAVE, JSON.stringify(lista));
  }

  function listar() { return _ler(); }

  function adicionar() {
    const nome  = (document.getElementById('eq-nome')?.value  || '').trim();
    const papel = (document.getElementById('eq-papel')?.value || '').trim();
    const setor = (document.getElementById('eq-setor')?.value || '').trim();

    if (!nome) {
      if (typeof showToast === 'function') showToast('⚠️ Informe ao menos o nome.');
      return;
    }

    const lista = _ler();
    lista.push({
      id: 'M' + Date.now().toString(36).toUpperCase(),
      nome, papel, setor,
    });
    _salvar(lista);

    // limpa campos
    ['eq-nome', 'eq-papel', 'eq-setor'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });

    render();
    if (typeof showToast === 'function') showToast('✅ Membro adicionado à equipe.');
  }

  function remover(id) {
    let lista = _ler().filter(m => m.id !== id);
    _salvar(lista);
    render();
    // Atualiza o kanban (cards que apontavam pra esse membro)
    if (typeof Kanban !== 'undefined') Kanban.render();
    if (typeof showToast === 'function') showToast('🗑️ Membro removido.');
  }

  function render() {
    const cont = document.getElementById('equipe-lista');
    if (!cont) return;
    const lista = _ler();

    if (lista.length === 0) {
      cont.innerHTML = `<div class="equipe-vazio">Nenhum membro cadastrado ainda.<br>Adicione membros para poder atribuí-los às denúncias.</div>`;
      return;
    }

    cont.innerHTML = lista.map(m => `
      <div class="equipe-card">
        <div class="eq-avatar">${_iniciais(m.nome)}</div>
        <div class="eq-info">
          <div class="eq-nome">${_esc(m.nome)}</div>
          <div class="eq-meta">${[m.papel, m.setor].filter(Boolean).map(_esc).join(' · ') || '—'}</div>
        </div>
        <button class="eq-remover" onclick="Equipe.remover('${m.id}')" title="Remover">✕</button>
      </div>`).join('');
  }

  /** Opções <option> para selects de atribuição */
  function opcoesSelect(selecionadoId) {
    const lista = _ler();
    const vazio = `<option value="">— Não atribuído —</option>`;
    return vazio + lista.map(m =>
      `<option value="${m.id}" ${m.id === selecionadoId ? 'selected' : ''}>${_esc(m.nome)}${m.papel ? ' (' + _esc(m.papel) + ')' : ''}</option>`
    ).join('');
  }

  function buscarPorId(id) {
    return _ler().find(m => m.id === id) || null;
  }

  function _iniciais(nome) {
    return nome.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
  }

  function _esc(s) {
    return String(s).replace(/[&<>"]/g, c =>
      ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
  }

  return { listar, adicionar, remover, render, opcoesSelect, buscarPorId };
})();