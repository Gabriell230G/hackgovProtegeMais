/**
 * equipe.js — Gestão da equipe do órgão, agora sobre a API.
 *
 * Antes os membros viviam no localStorage: cada navegador tinha a sua
 * equipe, e o responsável atribuído a um caso não existia para mais ninguém.
 * Agora o cadastro é servido por /api/equipe, e as operações de escrita
 * exigem perfil GESTOR ou ADMIN — um atendente recebe 403 ao tentar cadastrar.
 *
 * Detalhe de projeto: o Kanban consulta `buscarPorId` e `opcoesSelect` de
 * forma síncrona, dentro da renderização de cada card. Trocar isso por
 * chamadas assíncronas exigiria reescrever o Kanban inteiro. A solução é um
 * cache em memória, atualizado a cada sincronização com a API: as leituras
 * continuam síncronas e as escritas passam pelo servidor.
 */
const Equipe = (() => {

  const CHAVE_LOCAL = 'protege_equipe';   // usado apenas quando a API está fora
  let cache = [];

  // ── Persistência local (plano B) ─────────────────────────────
  function _lerLocal() {
    try { return JSON.parse(localStorage.getItem(CHAVE_LOCAL) || '[]'); }
    catch (_) { return []; }
  }
  function _salvarLocal(lista) {
    try { localStorage.setItem(CHAVE_LOCAL, JSON.stringify(lista)); } catch (_) {}
  }

  function _normalizar(m) {
    return {
      id: m.id,
      nome: m.nome || '',
      cargo: m.cargo || m.papel || '',
      email: m.email || '',
    };
  }

  // ── Sincronização com a API ──────────────────────────────────
  async function sincronizar() {
    try {
      if (await Backend.estaOnline()) {
        const lista = await Backend.listarEquipe();
        cache = (lista || []).map(_normalizar);
        return cache;
      }
    } catch (_) { /* cai para o local */ }
    cache = _lerLocal().map(_normalizar);
    return cache;
  }

  // ── Leituras síncronas, servidas pelo cache ──────────────────
  function listar() { return cache; }

  function buscarPorId(id) {
    if (id == null) return null;
    return cache.find(m => String(m.id) === String(id)) || null;
  }

  function opcoesSelect(selecionadoId) {
    const vazio = '<option value="">— Não atribuído —</option>';
    return vazio + cache.map(m =>
      `<option value="${m.id}" ${String(m.id) === String(selecionadoId) ? 'selected' : ''}>` +
      `${_esc(m.nome)}${m.cargo ? ' (' + _esc(m.cargo) + ')' : ''}</option>`
    ).join('');
  }

  // ── Escritas ─────────────────────────────────────────────────
  async function adicionar() {
    const v = id => ((document.getElementById(id) || {}).value || '').trim();
    const membro = { nome: v('eq-nome'), cargo: v('eq-cargo'), email: v('eq-email') };

    if (!membro.nome) { _aviso('⚠️ Informe ao menos o nome.'); return; }

    try {
      if (await Backend.estaOnline()) {
        await Backend.salvarMembro(membro);
      } else {
        const lista = _lerLocal();
        lista.push(Object.assign({ id: 'M' + Date.now().toString(36).toUpperCase() }, membro));
        _salvarLocal(lista);
      }
    } catch (e) {
      _aviso('❌ ' + e.message);
      return;
    }

    ['eq-nome', 'eq-cargo', 'eq-email'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    await render();
    _aviso('✅ Membro adicionado à equipe.');
  }

  async function remover(id) {
    try {
      if (await Backend.estaOnline()) {
        await Backend.removerMembro(id);
      } else {
        _salvarLocal(_lerLocal().filter(m => String(m.id) !== String(id)));
      }
    } catch (e) {
      _aviso('❌ ' + e.message);
      return;
    }
    await render();
    if (typeof Kanban !== 'undefined') Kanban.render();
    _aviso('🗑️ Membro removido.');
  }

  // ── Renderização ─────────────────────────────────────────────
  async function render() {
    await sincronizar();
    const cont = document.getElementById('equipe-lista');
    if (!cont) return;

    if (cache.length === 0) {
      cont.innerHTML = '<div class="equipe-vazio">Nenhum membro cadastrado ainda.<br>' +
                       'Adicione membros para poder atribuí-los às denúncias.</div>';
      return;
    }

    cont.innerHTML = cache.map(m => `
      <div class="equipe-card">
        <div class="eq-avatar">${_iniciais(m.nome)}</div>
        <div class="eq-info">
          <div class="eq-nome">${_esc(m.nome)}</div>
          <div class="eq-meta">${[m.cargo, m.email].filter(Boolean).map(_esc).join(' · ') || '—'}</div>
        </div>
        <button class="eq-remover" onclick="Equipe.remover('${m.id}')" title="Remover">✕</button>
      </div>`).join('');
  }

  // ── Utilidades ───────────────────────────────────────────────
  function _iniciais(nome) {
    return String(nome).trim().split(/\s+/).slice(0, 2).map(p => p[0] || '').join('').toUpperCase();
  }
  function _esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, c =>
      ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
  }
  function _aviso(msg) {
    if (typeof showToast === 'function') showToast(msg);
    else console.log('[Equipe]', msg);
  }

  // Carrega o cache assim que a página abre, para que o Kanban já encontre
  // os nomes dos responsáveis na primeira renderização.
  document.addEventListener('DOMContentLoaded', () => { setTimeout(sincronizar, 300); });

  return { listar, adicionar, remover, render, sincronizar, opcoesSelect, buscarPorId };
})();

window.Equipe = Equipe;
