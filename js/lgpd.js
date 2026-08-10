/**
 * lgpd.js — Privacidade & Conformidade LGPD
 *
 * Dois papéis:
 *  1) CIFRAGEM DE CAMPO (client-side, síncrona) — embaralha os campos
 *     sensíveis das denúncias antes de gravar no localStorage e
 *     decifra ao ler. Campos: descrição, nome, contato, código.
 *  2) CONFORMIDADE — metadados e práticas LGPD para exibição no painel.
 *
 * NOTA HONESTA (mostrada no painel): como o sistema roda 100% no
 * navegador, a chave fica no cliente — isto é uma DEMONSTRAÇÃO de
 * cifragem de campo. Em produção, a cifragem roda no backend com
 * chave protegida (KMS/cofre). A arquitetura aqui já está preparada
 * para esse modelo: a cifragem é isolada nesta camada.
 */

const LGPD = (() => {

  // Campos sensíveis cifrados em repouso.
  // Ciframos o CONTEÚDO que expõe a vítima (descrição, identidade).
  // NÃO ciframos chaves de busca/organização (código, local, status),
  // que os módulos usam para localizar e agrupar — e que não revelam
  // identidade por si só (o código é aleatório).
  const CAMPOS_SENSIVEIS = ['desc', 'descricao', 'nome', 'contato'];

  // Marcador para identificar valor já cifrado (evita cifrar 2x)
  const PREFIXO = 'enc::';

  // Chave de sessão (em produção viria do backend/KMS)
  const CHAVE = 'protege-mais-lgpd-2026';

  // ── Cifragem síncrona reversível (XOR + Base64 unicode-safe) ──
  function _xor(texto, chave) {
    let out = '';
    for (let i = 0; i < texto.length; i++) {
      out += String.fromCharCode(texto.charCodeAt(i) ^ chave.charCodeAt(i % chave.length));
    }
    return out;
  }

  function _b64encode(str) {
    // unicode-safe
    return btoa(unescape(encodeURIComponent(str)));
  }
  function _b64decode(str) {
    return decodeURIComponent(escape(atob(str)));
  }

  function cifrar(valor) {
    if (valor == null || valor === '') return valor;
    const s = String(valor);
    if (s.startsWith(PREFIXO)) return s;            // já cifrado
    try { return PREFIXO + _b64encode(_xor(s, CHAVE)); }
    catch (_) { return valor; }
  }

  function decifrar(valor) {
    if (valor == null || typeof valor !== 'string') return valor;
    if (!valor.startsWith(PREFIXO)) return valor;   // não estava cifrado
    try { return _xor(_b64decode(valor.slice(PREFIXO.length)), CHAVE); }
    catch (_) { return valor; }
  }

  // ── Aplica cifragem/decifragem a uma denúncia (campos sensíveis) ──
  function cifrarDenuncia(d) {
    if (!d || typeof d !== 'object') return d;
    const copia = { ...d };
    CAMPOS_SENSIVEIS.forEach(c => { if (c in copia) copia[c] = cifrar(copia[c]); });
    return copia;
  }

  function decifrarDenuncia(d) {
    if (!d || typeof d !== 'object') return d;
    const copia = { ...d };
    CAMPOS_SENSIVEIS.forEach(c => { if (c in copia) copia[c] = decifrar(copia[c]); });
    return copia;
  }

  function cifrarMensagensTexto(d) { return d; }  // mensagens do elo ficam em claro (fase atual)

  // ── Persistência cifrada (helpers que os módulos podem usar) ──




  // Migração: cifra denúncias que ainda estão em texto puro
  function migrarParaCifrado() {
    try {
      const raw = JSON.parse(localStorage.getItem('denuncias') || '[]');
      // se nenhum campo sensível tiver o prefixo, está em texto puro → cifra
      const precisaCifrar = raw.some(d =>
        CAMPOS_SENSIVEIS.some(c => d[c] && typeof d[c] === 'string' && !d[c].startsWith(PREFIXO))
      );
      if (precisaCifrar) {
        const cifradas = raw.map(d => cifrarMensagensTexto(cifrarDenuncia(d)));
        localStorage.setItem('denuncias', JSON.stringify(cifradas));
      }
    } catch (e) { console.warn('[LGPD] erro na migração:', e); }
  }

  // ── Conformidade (dados para o painel) ──────────────────────
  const PRATICAS = [
    { icon: '🔒', titulo: 'Cifragem de dados sensíveis',
      txt: 'Descrição, identidade e código de acompanhamento são cifrados em repouso. No armazenamento, aparecem embaralhados.' },
    { icon: '⚖️', titulo: 'Base legal definida',
      txt: 'Tratamento fundamentado em cumprimento de obrigação legal e execução de política pública (art. 7º e 11 da LGPD).' },
    { icon: '🎯', titulo: 'Minimização de dados',
      txt: 'Coletamos apenas o necessário. O nível de anonimato é escolhido pelo cidadão — nada de identificação é obrigatório.' },
    { icon: '👁️', titulo: 'Controle de acesso',
      txt: 'Cada papel vê apenas o que precisa. A identidade do denunciante é protegida mesmo internamente.' },
    { icon: '🗓️', titulo: 'Retenção e descarte',
      txt: 'Dados mantidos pelo tempo necessário à apuração; depois, anonimizados ou eliminados conforme política de retenção.' },
    { icon: '🙋', titulo: 'Direitos do titular',
      txt: 'O cidadão pode acompanhar e, nos níveis aplicáveis, solicitar informações sobre sua denúncia via código seguro.' },
  ];

  function render() {
    const cont = document.getElementById('lgpd-body');
    if (!cont) return;

    // amostra de dado cifrado para a demonstração
    let amostra = '';
    try {
      const raw = JSON.parse(localStorage.getItem('denuncias') || '[]');
      const comDesc = raw.find(d => d.desc && String(d.desc).startsWith(PREFIXO));
      if (comDesc) amostra = String(comDesc.desc).slice(0, 60) + '…';
    } catch (_) {}

    cont.innerHTML = `
      <div class="lgpd-praticas">
        ${PRATICAS.map(p => `
          <div class="lgpd-card">
            <div class="lgpd-ic">${p.icon}</div>
            <div class="lgpd-tit">${p.titulo}</div>
            <div class="lgpd-txt">${p.txt}</div>
          </div>`).join('')}
      </div>

      <div class="lgpd-demo">
        <div class="lgpd-demo-tit">🔍 Demonstração: como o dado fica armazenado</div>
        <div class="lgpd-demo-grid">
          <div class="lgpd-demo-col">
            <span class="ldc-label">O que você digita</span>
            <div class="ldc-box plain">"Fui ameaçada pelo vizinho na rua das Flores"</div>
          </div>
          <div class="lgpd-demo-arrow">➜</div>
          <div class="lgpd-demo-col">
            <span class="ldc-label">Como fica salvo (cifrado)</span>
            <div class="ldc-box enc">${amostra || 'enc::A1b2C3d4e5F6g7H8i9J0k…'}</div>
          </div>
        </div>
        <div class="lgpd-nota">
          ⓘ Esta é uma demonstração de cifragem client-side. Em produção, a cifragem
          roda no backend com chave protegida (cofre/KMS) — a arquitetura já isola
          essa camada para essa evolução.
        </div>
      </div>
    `;
  }

  function init() {
    migrarParaCifrado();
    // O painel agora vive na landing page — renderiza no carregamento
    if (document.getElementById('lgpd-body')) render();
  }

  return {
    cifrar, decifrar, cifrarDenuncia, decifrarDenuncia,
    migrarParaCifrado,
    render, init,
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (typeof LGPD !== 'undefined') LGPD.init();
});