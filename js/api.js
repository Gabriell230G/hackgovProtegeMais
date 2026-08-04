/**
 * api.js — Integração com API do IBGE
 * Carrega estados e cidades dinamicamente.
 */

const IbgeAPI = (() => {

  const BASE = 'https://servicodados.ibge.gov.br/api/v1/localidades';

  /**
   * Carrega todos os estados e popula um <select>.
   * @param {string} selectId - ID do elemento select de estados
   */
  async function carregarEstados(selectId) {
    const el = document.getElementById(selectId);
    if (!el) return;

    try {
      el.innerHTML = '<option value="">Carregando...</option>';
      const res  = await fetch(`${BASE}/estados?orderBy=nome`);
      const data = await res.json();

      el.innerHTML = '<option value="">Selecione o estado</option>';
      data.forEach(estado => {
        const opt = document.createElement('option');
        opt.value       = estado.sigla;
        opt.textContent = `${estado.sigla} — ${estado.nome}`;
        opt.dataset.id  = estado.id;
        el.appendChild(opt);
      });
    } catch (err) {
      console.error('[IbgeAPI] Erro ao carregar estados:', err);
      el.innerHTML = _fallbackEstados();
    }
  }

  /**
   * Carrega municípios de um estado e popula um <select>.
   * @param {string} uf         - Sigla do estado (ex: "SP")
   * @param {string} selectId   - ID do elemento select de cidades
   */
  async function carregarCidades(uf, selectId) {
    const el = document.getElementById(selectId);
    if (!el || !uf) return;

    // Busca o id do estado pelo select de estados
    const estadoSelect = document.getElementById('f-estado');
    const estadoOpt    = estadoSelect
      ? Array.from(estadoSelect.options).find(o => o.value === uf)
      : null;

    let estadoId = estadoOpt ? estadoOpt.dataset.id : null;

    // Se não tiver id, pede da API
    if (!estadoId) {
      try {
        const res  = await fetch(`${BASE}/estados?orderBy=nome`);
        const data = await res.json();
        const found = data.find(e => e.sigla === uf);
        if (found) estadoId = found.id;
      } catch (_) {}
    }

    if (!estadoId) {
      el.innerHTML = '<option value="">Estado não encontrado</option>';
      return;
    }

    try {
      el.innerHTML = '<option value="">Carregando cidades...</option>';
      const res  = await fetch(`${BASE}/estados/${estadoId}/municipios?orderBy=nome`);
      const data = await res.json();

      el.innerHTML = '<option value="">Selecione a cidade</option>';
      data.forEach(cidade => {
        const opt       = document.createElement('option');
        opt.value       = cidade.nome;
        opt.textContent = cidade.nome;
        el.appendChild(opt);
      });
    } catch (err) {
      console.error('[IbgeAPI] Erro ao carregar cidades:', err);
      el.innerHTML = '<option value="">Erro ao carregar cidades</option>';
    }
  }

  /**
   * Fallback estático para quando a API falhar.
   * @private
   */
  function _fallbackEstados() {
    const ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
                 'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
                 'SP','SE','TO'];
    return '<option value="">Selecione o estado</option>' +
      ufs.map(uf => `<option value="${uf}">${uf}</option>`).join('');
  }

  /**
   * Carrega estados em um <select> simples (só sigla no value).
   * Usado no filtro do backlog.
   * @param {string} selectId
   */
  async function carregarEstadosSelect(selectId) {
    const el = document.getElementById(selectId);
    if (!el) return;
    try {
      const res  = await fetch(`${BASE}/estados?orderBy=nome`);
      const data = await res.json();
      // mantém o option vazio inicial
      data.forEach(estado => {
        const opt = document.createElement('option');
        opt.value       = estado.sigla;          // só a sigla — "SP"
        opt.textContent = `${estado.sigla} — ${estado.nome}`;
        el.appendChild(opt);
      });
    } catch (err) {
      console.error('[IbgeAPI] Erro ao carregar estados (select):', err);
    }
  }

  return { carregarEstados, carregarCidades, carregarEstadosSelect };
})();