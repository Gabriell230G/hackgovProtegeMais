/**
 * backend.js — Ponte entre o frontend Protege+ e a API Java (Spring Boot).
 *
 * - Se o backend estiver no ar, usa a API real (PostgreSQL/Supabase).
 * - Se estiver fora, cai automaticamente para o localStorage (plano B da demo).
 * - Rotas do gestor exigem login (JWT). O token e obtido via Backend.login()
 *   ou, para a demo, por auto-login com o gestor padrao.
 *
 * Exemplos:
 *   await Backend.login('admin@protege.gov.br', 'admin123');
 *   const nova = await Backend.criarDenuncia({ tipo, descricao, estado, cidade, endereco, anonimo });
 *   const lista = await Backend.listarDenuncias();
 *   const stats = await Backend.estatisticas();
 *   const r = await Backend.perguntarVigia('Quais denuncias priorizar?');
 */
const Backend = (() => {

  const BASE = 'http://localhost:8080/api';

  // Credenciais do gestor padrao (apenas para facilitar a demonstracao).
  const DEMO_ADMIN = { email: 'admin@protege.gov.br', senha: 'admin123' };

  let online = null;
  let token = null;

  // ── Saude do backend ─────────────────────────────────────────
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
    return online;
  }

  // ── Autenticacao (JWT) ───────────────────────────────────────
  async function login(email, senha) {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    token = data.token;
    return data;
  }

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

  // ── localStorage (fallback) ──────────────────────────────────
  function lsGet() {
    try { return JSON.parse(localStorage.getItem('denuncias') || '[]'); }
    catch (_) { return []; }
  }
  function lsSet(lista) { localStorage.setItem('denuncias', JSON.stringify(lista)); }

  // ── Denuncias ────────────────────────────────────────────────
  async function criarDenuncia(dados) {
    if (await estaOnline()) {
      const res = await fetch(`${BASE}/denuncias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      });
      if (res.ok) return res.json();
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

  async function listarDenuncias(filtros = {}) {
    if (await estaOnline()) {
      const qs = new URLSearchParams(filtros).toString();
      const res = await protegido(() =>
        fetch(`${BASE}/denuncias${qs ? '?' + qs : ''}`, { headers: authHeaders() }));
      if (res.ok) return res.json();
    }
    return lsGet();
  }

  async function buscarProtocolo(protocolo) {
    if (await estaOnline()) {
      const res = await fetch(`${BASE}/denuncias/protocolo/${encodeURIComponent(protocolo)}`);
      if (res.ok) return res.json();
      return null;
    }
    return lsGet().find(d => d.protocolo === protocolo || d.id === protocolo) || null;
  }

  async function mudarStatus(id, status) {
    if (await estaOnline()) {
      const res = await protegido(() => fetch(`${BASE}/denuncias/${id}/status`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status }),
      }));
      if (res.ok) return res.json();
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
    }
    const lista = lsGet();
    const d = lista.find(x => x.id === id);
    if (d) { d.responsavelId = responsavelId; lsSet(lista); }
    return d;
  }

  // ── Estatisticas (dashboard) ─────────────────────────────────
  async function estatisticas() {
    if (await estaOnline()) {
      const res = await protegido(() => fetch(`${BASE}/stats`, { headers: authHeaders() }));
      if (res.ok) return res.json();
    }
    const lista = lsGet();
    return { total: lista.length, porStatus: {}, porTipo: {}, offline: true };
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
    return 'VigIA em modo local: priorize denuncias de violencia e abuso e as paradas ha mais tempo.';
  }

  async function statusIa() {
    if (await estaOnline()) {
      const res = await fetch(`${BASE}/vigia/status`);
      if (res.ok) return res.json();
    }
    return { iaAtiva: false, modo: 'Local' };
  }

  return {
    estaOnline, login, criarDenuncia, listarDenuncias, buscarProtocolo,
    mudarStatus, atribuirResponsavel, estatisticas, perguntarVigia, statusIa,
  };
})();

window.Backend = Backend;
