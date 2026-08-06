/**
 * backend.js — Ponte entre o frontend Protege+ e a API Java (Spring Boot).
 *
 * - Se o backend estiver no ar, usa a API real (PostgreSQL/Supabase ou H2).
 * - Se estiver fora, cai automaticamente para o localStorage (plano B da demo).
 * - Rotas do painel exigem login (JWT), obtido via Backend.login() ou por
 *   auto-login com o gestor padrão durante a demonstração.
 *
 * Contrato da API a partir da Fase 5:
 *   • POST   /api/denuncias                    → 201 + Location, corpo público
 *   • GET    /api/denuncias?…&pagina=&tamanho= → envelope de página
 *   • GET    /api/denuncias/{id}               → detalhe (consulta sensível)
 *   • PUT    /api/denuncias/{id}               → atualização completa
 *   • DELETE /api/denuncias/{id}?motivo=…      → 204, exclusão lógica
 */
const Backend = (() => {

  // Configurável por ambiente: window.PROTEGE_API_URL definido antes deste
  // script sobrescreve o padrão. Evita ter localhost fixo no código.
  const BASE = (typeof window !== 'undefined' && window.PROTEGE_API_URL)
    ? String(window.PROTEGE_API_URL).replace(/\/+$/, '')
    : 'http://localhost:8080/api';

  // Credenciais do gestor padrão (apenas para facilitar a demonstração).
  const DEMO_ADMIN = { email: 'admin@protege.gov.br', senha: 'admin123' };

  let online = null;
  let token = null;
  let perfil = null;

  // ── Saúde do backend ─────────────────────────────────────────
  async function estaOnline() {
    if (online !== null) return online;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 1500);
      const res = await fetch(`${BASE}/vigia/status`, { signal: ctrl.signal });
      clearTimeout(t);
      online = res.ok;
    } catch (_) {
      online = false;
    }
    console.log(`[Backend] ${online ? 'API Java ONLINE' : 'API offline — usando localStorage'}`);
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('protege:conexao', { detail: { online } }));
    }
    return online;
  }

  /** Permite forçar nova checagem (usado pelo indicador de conexão da UI). */
  function reavaliarConexao() { online = null; return estaOnline(); }

  // ── Autenticação (JWT) ───────────────────────────────────────
  async function login(email, senha) {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    token = data.token;
    perfil = data.role;
    return data;
  }

  function logout() { token = null; perfil = null; }
  function perfilAtual() { return perfil; }

  async function garantirLogin() {
    if (token) return token;
    const data = await login(DEMO_ADMIN.email, DEMO_ADMIN.senha);
    return data ? data.token : null;
  }

  function authHeaders(extra = {}) {
    return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
  }

  /** Chama uma rota protegida, fazendo auto-login e 1 retry em caso de 401. */
  async function protegido(fn) {
    await garantirLogin();
    let res = await fn();
    if (res.status === 401) {
      token = null;
      await garantirLogin();
      res = await fn();
    }
    return res;
  }

  /** Extrai a mensagem padronizada de erro devolvida pela API. */
  async function erroDa(res) {
    try {
      const corpo = await res.json();
      return corpo.mensagem || corpo.erro || `Erro ${res.status}`;
    } catch (_) {
      return `Erro ${res.status}`;
    }
  }

  // ── localStorage (fallback) ──────────────────────────────────
  function lsGet() {
    try { return JSON.parse(localStorage.getItem('denuncias') || '[]'); }
    catch (_) { return []; }
  }
  function lsSet(lista) { localStorage.setItem('denuncias', JSON.stringify(lista)); }

  // ── Denúncias ────────────────────────────────────────────────
  async function criarDenuncia(dados) {
    if (await estaOnline()) {
      const res = await fetch(`${BASE}/denuncias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      });
      if (res.ok) return res.json();                 // 201 Created
      if (res.status === 400) throw new Error(await erroDa(res));
    }
    const lista = lsGet();
    const nova = {
      id: '#' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 99999)).padStart(5, '0'),
      ...dados,
      status: 'recebida',
      criadoEm: new Date().toLocaleDateString('pt-BR'),
      historico: [{ status: 'recebida', data: new Date().toLocaleDateString('pt-BR'), hora: new Date().toLocaleTimeString('pt-BR').slice(0, 5) }],
    };
    nova.protocolo = nova.id;
    lista.push(nova);
    lsSet(lista);
    return nova;
  }

  /**
   * Lista denúncias. A API agora devolve um envelope de página; esta função
   * continua entregando um ARRAY para não quebrar quem já a consumia.
   * Use listarPagina() quando precisar dos metadados de paginação.
   */
  async function listarDenuncias(filtros = {}) {
    const page = await listarPagina({ tamanho: 100, ...filtros });
    return page.conteudo;
  }

  async function listarPagina(filtros = {}) {
    if (await estaOnline()) {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== '' && v != null))
      ).toString();
      const res = await protegido(() =>
        fetch(`${BASE}/denuncias${qs ? '?' + qs : ''}`, { headers: authHeaders() }));
      if (res.ok) return res.json();
    }
    const lista = lsGet();
    return { conteudo: lista, pagina: 0, tamanho: lista.length, totalItens: lista.length, totalPaginas: 1, temProxima: false };
  }

  /** Detalhe do caso — traz o relato. Leitura registrada em auditoria. */
  async function detalharDenuncia(id) {
    if (await estaOnline()) {
      const res = await protegido(() =>
        fetch(`${BASE}/denuncias/${id}`, { headers: authHeaders() }));
      if (res.ok) return res.json();
      if (res.status === 404) return null;
    }
    return lsGet().find(d => d.id === id) || null;
  }

  async function buscarProtocolo(protocolo) {
    if (await estaOnline()) {
      const res = await fetch(`${BASE}/denuncias/protocolo/${encodeURIComponent(protocolo)}`);
      if (res.ok) return res.json();
      return null;
    }
    return lsGet().find(d => d.protocolo === protocolo || d.id === protocolo) || null;
  }

  async function atualizarDenuncia(id, dados) {
    if (await estaOnline()) {
      const res = await protegido(() => fetch(`${BASE}/denuncias/${id}`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(dados),
      }));
      if (res.ok) return res.json();
      throw new Error(await erroDa(res));
    }
    const lista = lsGet();
    const d = lista.find(x => x.id === id);
    if (d) { Object.assign(d, dados); lsSet(lista); }
    return d;
  }

  /** Exclusão lógica com motivo obrigatório. */
  async function excluirDenuncia(id, motivo) {
    if (!motivo || !motivo.trim()) throw new Error('Informe o motivo da exclusão.');
    if (await estaOnline()) {
      const res = await protegido(() =>
        fetch(`${BASE}/denuncias/${id}?motivo=${encodeURIComponent(motivo)}`, {
          method: 'DELETE',
          headers: authHeaders(),
        }));
      if (res.status === 204) return true;
      throw new Error(await erroDa(res));
    }
    lsSet(lsGet().filter(d => d.id !== id));
    return true;
  }

  async function mudarStatus(id, status, observacao) {
    if (await estaOnline()) {
      const res = await protegido(() => fetch(`${BASE}/denuncias/${id}/status`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status, observacao: observacao || null }),
      }));
      if (res.ok) return res.json();
      throw new Error(await erroDa(res));
    }
    const lista = lsGet();
    const d = lista.find(x => x.id === id || x.protocolo === id);
    if (d) { d.status = status; lsSet(lista); }
    return d;
  }

  async function atribuirResponsavel(id, responsavelId) {
    if (await estaOnline()) {
      const res = await protegido(() => fetch(`${BASE}/denuncias/${id}/responsavel`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ responsavelId }),
      }));
      if (res.ok) return res.json();
      throw new Error(await erroDa(res));
    }
    const lista = lsGet();
    const d = lista.find(x => x.id === id);
    if (d) { d.responsavelId = responsavelId; lsSet(lista); }
    return d;
  }

  // ── Equipe ───────────────────────────────────────────────────
  async function listarEquipe() {
    if (await estaOnline()) {
      const res = await protegido(() => fetch(`${BASE}/equipe`, { headers: authHeaders() }));
      if (res.ok) return res.json();
    }
    try { return JSON.parse(localStorage.getItem('protege_equipe') || '[]'); }
    catch (_) { return []; }
  }

  async function salvarMembro(membro) {
    if (await estaOnline()) {
      const editando = !!membro.id;
      const res = await protegido(() =>
        fetch(`${BASE}/equipe${editando ? '/' + membro.id : ''}`, {
          method: editando ? 'PUT' : 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ nome: membro.nome, cargo: membro.cargo, email: membro.email }),
        }));
      if (res.ok) return res.json();
      throw new Error(await erroDa(res));
    }
    return membro;
  }

  async function removerMembro(id) {
    if (await estaOnline()) {
      const res = await protegido(() =>
        fetch(`${BASE}/equipe/${id}`, { method: 'DELETE', headers: authHeaders() }));
      if (res.status === 204) return true;
      throw new Error(await erroDa(res));
    }
    return true;
  }

  // ── Estatísticas (dashboard) ─────────────────────────────────
  async function estatisticas() {
    if (await estaOnline()) {
      const res = await protegido(() => fetch(`${BASE}/stats`, { headers: authHeaders() }));
      if (res.ok) return res.json();
    }
    const lista = lsGet();
    return { total: lista.length, porStatus: {}, porTipo: {}, offline: true };
  }

  /**
   * Relatorio estatistico completo (Parte 4).
   *
   * Devolve null quando a API esta fora do ar, em vez de inventar um
   * substituto local. Media e desvio calculados sobre o punhado de
   * denuncias que por acaso estao neste navegador nao descreveriam o
   * canal - e a tela ficaria indistinguivel de uma que descreve.
   */
  async function relatorioAnalitico() {
    if (!(await estaOnline())) return null;
    const res = await protegido(() => fetch(`${BASE}/stats/analitico`, { headers: authHeaders() }));
    if (res.ok) return res.json();
    throw Object.assign(new Error(await erroDa(res)), { status: res.status });
  }

  // ── VigIA (IA) ───────────────────────────────────────────────
  async function perguntarVigia(pergunta) {
    if (await estaOnline()) {
      const res = await protegido(() => fetch(`${BASE}/vigia/perguntar`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ pergunta }),
      }));
      if (res.ok) return (await res.json()).resposta;
    }
    return 'VigIA em modo local: priorize denúncias de violência e abuso e as paradas há mais tempo.';
  }

  async function reanalisar(id) {
    if (await estaOnline()) {
      const res = await protegido(() =>
        fetch(`${BASE}/vigia/analisar/${id}`, { method: 'POST', headers: authHeaders() }));
      if (res.ok) return res.json();
    }
    return null;
  }

  async function statusIa() {
    if (await estaOnline()) {
      const res = await fetch(`${BASE}/vigia/status`);
      if (res.ok) return res.json();
    }
    return { iaAtiva: false, modo: 'Local' };
  }

  // ── Fluxo de atendimento: fila de prioridade e pilha de ações ──
  async function consultarFila(limite = 10) {
    if (await estaOnline()) {
      const res = await protegido(() =>
        fetch(`${BASE}/fluxo/fila?limite=${limite}`, { headers: authHeaders() }));
      if (res.ok) return res.json();
      throw new Error(await erroDa(res));
    }
    return null;
  }

  async function atenderProximo() {
    const res = await protegido(() =>
      fetch(`${BASE}/fluxo/fila/atender`, { method: 'POST', headers: authHeaders() }));
    if (res.ok) return res.json();
    throw new Error(await erroDa(res));
  }

  async function consultarPilha() {
    if (await estaOnline()) {
      const res = await protegido(() => fetch(`${BASE}/fluxo/pilha`, { headers: authHeaders() }));
      if (res.ok) return res.json();
    }
    return null;
  }

  async function desfazerUltima() {
    const res = await protegido(() =>
      fetch(`${BASE}/fluxo/desfazer`, { method: 'POST', headers: authHeaders() }));
    if (res.ok) return res.json();
    throw new Error(await erroDa(res));
  }

  // ── Trilha de auditoria (perfis AUDITOR e ADMIN) ──
  async function consultarAuditoria(filtros = {}) {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== '' && v != null))
    ).toString();
    const res = await protegido(() =>
      fetch(`${BASE}/auditoria${qs ? '?' + qs : ''}`, { headers: authHeaders() }));
    if (res.status === 403) {
      const e = new Error('Seu perfil não tem permissão para consultar a trilha de auditoria.');
      e.status = 403;
      throw e;
    }
    if (res.ok) return res.json();
    throw new Error(await erroDa(res));
  }

  async function verificarIntegridade() {
    const res = await protegido(() => fetch(`${BASE}/auditoria/integridade`, { headers: authHeaders() }));
    if (res.ok) return res.json();
    throw new Error(await erroDa(res));
  }

  async function acoesAuditadas() {
    const res = await protegido(() => fetch(`${BASE}/auditoria/acoes`, { headers: authHeaders() }));
    if (res.ok) return res.json();
    return {};
  }

  return {
    BASE, estaOnline, reavaliarConexao,
    login, logout, perfilAtual,
    criarDenuncia, listarDenuncias, listarPagina, detalharDenuncia, buscarProtocolo,
    atualizarDenuncia, excluirDenuncia, mudarStatus, atribuirResponsavel,
    listarEquipe, salvarMembro, removerMembro,
    consultarFila, atenderProximo, consultarPilha, desfazerUltima,
    consultarAuditoria, verificarIntegridade, acoesAuditadas,
    estatisticas, relatorioAnalitico, perguntarVigia, reanalisar, statusIa,
  };
})();

window.Backend = Backend;
