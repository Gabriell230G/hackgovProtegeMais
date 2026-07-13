/**
 * anonimato.js — Anonimato Graduado + Elo de Mão Dupla
 *
 * O CORAÇÃO DO DIFERENCIAL DO PROTEGE+.
 *
 * 3 níveis de anonimato:
 *   1 = Anônimo total      → sem canal de retorno
 *   2 = Anônimo com canal  → código secreto permite conversa bidirecional anônima
 *   3 = Identificado       → nome + contato, autoridade fala direto
 *
 * O elo de mão dupla (nível 2) é o que nenhum canal oficial tem: a autoridade
 * pode pedir mais informação e a vítima responde, SEM nunca se identificar.
 */

const Anonimato = (() => {

  // ── Geração de código seguro ────────────────────────────────
  // Aleatório e imprevisível (ao contrário do protocolo, que é sequencial).
  // Sem caracteres ambíguos: 0/O, 1/I/L.
  const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  function gerarCodigo() {
    const c = (typeof crypto !== 'undefined' && crypto.getRandomValues)
      ? crypto : (window.crypto || window.msCrypto);
    const bloco = () => {
      let s = '';
      const arr = new Uint32Array(4);
      c.getRandomValues(arr);
      for (let i = 0; i < 4; i++) s += ALFABETO[arr[i] % ALFABETO.length];
      return s;
    };
    return `PROT-${bloco()}-${bloco()}`;
  }

  // ── Armazenamento (localStorage como fonte gravável) ───────
  // IMPORTANTE: getAllDenuncias() do main.js retorna [...denuncias, ...mocks],
  // uma cópia combinada. Para LER usamos a visão completa (acha mocks também),
  // mas para GRAVAR persistimos no localStorage e ressincronizamos o array real.
  function _lerCompleto() {
    const mapa = new Map();
    const add = (arr) => {
      (arr || []).forEach(d => {
        if (!d) return;
        const chave = d.id || d.codigoAcompanhamento;
        if (!chave) return;
        mapa.set(chave, d);   // adicionado depois sobrescreve (localStorage vence)
      });
    };
    if (typeof getAllDenuncias === 'function') {
      try { add(getAllDenuncias()); } catch (_) {}
    }
    try {
      let raw = JSON.parse(localStorage.getItem('denuncias') || '[]');
      // decifra os campos sensíveis se a camada LGPD estiver ativa
      if (typeof LGPD !== 'undefined' && LGPD.decifrarDenuncia) {
        raw = raw.map(d => LGPD.decifrarDenuncia(d));
      }
      add(raw);
    } catch (_) {}
    return Array.from(mapa.values());
  }

  function _getDenuncias() { return _lerCompleto(); }

  function _persistir(denunciaModificada) {
    // Atualiza/insere a denúncia modificada no localStorage real
    let lista = [];
    try { lista = JSON.parse(localStorage.getItem('denuncias') || '[]'); }
    catch { lista = []; }

    const idx = lista.findIndex(d =>
      (denunciaModificada.id && d.id === denunciaModificada.id) ||
      (denunciaModificada.codigoAcompanhamento &&
       d.codigoAcompanhamento === denunciaModificada.codigoAcompanhamento));

    if (idx >= 0) lista[idx] = denunciaModificada;
    else lista.push(denunciaModificada);  // era um mock — agora persiste

    localStorage.setItem('denuncias', JSON.stringify(lista));

    // Ressincroniza o array em memória do main.js, se existir
    if (typeof denuncias !== 'undefined' && Array.isArray(denuncias)) {
      const j = denuncias.findIndex(d =>
        (denunciaModificada.id && d.id === denunciaModificada.id) ||
        (denunciaModificada.codigoAcompanhamento &&
         d.codigoAcompanhamento === denunciaModificada.codigoAcompanhamento));
      if (j >= 0) denuncias[j] = denunciaModificada;
      else denuncias.push(denunciaModificada);
    }
  }

  // ── Migração: denúncias antigas (booleano) → níveis ─────────
  function migrar() {
    let lista = [];
    try { lista = JSON.parse(localStorage.getItem('denuncias') || '[]'); }
    catch { return; }
    let mudou = false;
    lista.forEach(d => {
      if (d.nivelAnonimato === undefined) {
        d.nivelAnonimato = d.anonimo ? 1 : 3;
        if (!('codigoAcompanhamento' in d)) d.codigoAcompanhamento = null;
        if (!('mensagens' in d)) d.mensagens = [];
        mudou = true;
      }
    });
    if (mudou) {
      localStorage.setItem('denuncias', JSON.stringify(lista));
      if (typeof denuncias !== 'undefined' && Array.isArray(denuncias)) {
        denuncias.length = 0; lista.forEach(d => denuncias.push(d));
      }
    }
  }

  // ── Consultas ───────────────────────────────────────────────
  function consultarPorCodigo(codigo) {
    if (!codigo) return null;
    const alvo = codigo.trim().toUpperCase();
    return _getDenuncias().find(d => d.codigoAcompanhamento === alvo) || null;
  }

  function consultarPorProtocolo(protocolo) {
    if (!protocolo) return null;
    let alvo = protocolo.trim();
    if (!alvo.startsWith('#')) alvo = '#' + alvo;
    return _getDenuncias().find(d => d.id === alvo) || null;
  }

  // ── Elo de mão dupla ────────────────────────────────────────
  function adicionarMensagem(identificador, autor, texto) {
    if (!texto || !texto.trim()) return false;
    const d = _lerCompleto().find(x =>
      x.codigoAcompanhamento === identificador || x.id === identificador);
    if (!d) return false;
    if (!Array.isArray(d.mensagens)) d.mensagens = [];

    const agora = new Date();
    d.mensagens.push({
      autor,                              // 'gestor' | 'cidadao'
      texto: texto.trim(),
      data: agora.toLocaleDateString('pt-BR'),
      hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      lida: false,
    });
    _persistir(d);
    return true;
  }

  function marcarMensagensLidas(identificador, porQuem) {
    const d = _lerCompleto().find(x =>
      x.codigoAcompanhamento === identificador || x.id === identificador);
    if (!d || !Array.isArray(d.mensagens)) return;
    const outro = porQuem === 'gestor' ? 'cidadao' : 'gestor';
    let mudou = false;
    d.mensagens.forEach(m => { if (m.autor === outro && !m.lida) { m.lida = true; mudou = true; } });
    if (mudou) _persistir(d);
  }

  function temPendencia(d, paraQuem) {
    if (!d || !Array.isArray(d.mensagens)) return false;
    const outro = paraQuem === 'gestor' ? 'cidadao' : 'gestor';
    return d.mensagens.some(m => m.autor === outro && !m.lida);
  }

  // ── Rótulos legíveis ────────────────────────────────────────
  const ROTULOS = {
    1: { nome: 'Anônimo total',            icon: '🕶️', cor: '#64748B' },
    2: { nome: 'Anônimo com canal seguro', icon: '🔐', cor: '#2563EB' },
    3: { nome: 'Identificado',             icon: '🪪', cor: '#16A34A' },
  };
  function rotulo(nivel) { return ROTULOS[nivel] || ROTULOS[1]; }

  function temCanal(d) {
    return d && (d.nivelAnonimato === 2 || d.nivelAnonimato === 3);
  }

  // ── Estado da seleção no formulário ─────────────────────────
  let nivelSelecionado = 2;
  function getNivelSelecionado() { return nivelSelecionado; }
  function setNivelSelecionado(n) { nivelSelecionado = n; }

  return {
    gerarCodigo, migrar,
    consultarPorCodigo, consultarPorProtocolo,
    adicionarMensagem, marcarMensagensLidas, temPendencia,
    rotulo, temCanal,
    getNivelSelecionado, setNivelSelecionado,
  };
})();

// ════════════════════════════════════════════════════════════
// UI — Seleção de nível no formulário
// ════════════════════════════════════════════════════════════
function selecionarNivel(nivel, el) {
  Anonimato.setNivelSelecionado(nivel);
  document.querySelectorAll('.anon-card').forEach(c => c.classList.remove('selected'));
  if (el) el.classList.add('selected');

  const hid = document.getElementById('f-nivel-anonimato');
  if (hid) hid.value = String(nivel);
  const chk = document.getElementById('f-anonimo');
  if (chk) chk.checked = (nivel !== 3);

  const contato = document.getElementById('contato-section');
  if (contato) contato.style.display = (nivel === 3) ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof Anonimato !== 'undefined') Anonimato.migrar();
  const rec = document.querySelector('.anon-card[data-nivel="2"]');
  if (rec) selecionarNivel(2, rec);
});

// ── Copiar / baixar o código de acompanhamento ────────────────
function copiarCodigo() {
  const codigo = window._ultimoCodigo;
  if (!codigo) return;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(codigo).then(
      () => { if (typeof showToast === 'function') showToast('📋 Código copiado!'); },
      () => _copiarFallback(codigo)
    );
  } else { _copiarFallback(codigo); }
}

function _copiarFallback(texto) {
  const ta = document.createElement('textarea');
  ta.value = texto; document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); if (typeof showToast === 'function') showToast('📋 Código copiado!'); }
  catch (_) {}
  document.body.removeChild(ta);
}

function baixarCodigo() {
  const codigo = window._ultimoCodigo;
  const protocolo = window._ultimoProtocolo || '';
  if (!codigo) return;
  const conteudo =
`PROTEGE+ — Comprovante de Denúncia
=====================================

Protocolo (status): ${protocolo}
Código secreto (canal seguro): ${codigo}

GUARDE ESTE CÓDIGO COM SEGURANÇA.
Ele é a única forma de voltar e conversar com a autoridade
sobre sua denúncia, sem precisar se identificar.

Por segurança, não é possível recuperar este código se perdido.

Para acompanhar: Protege+ > Acompanhar Denúncia > Código seguro.`;
  const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Protege+_${(protocolo || 'denuncia').replace('#','')}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
  if (typeof showToast === 'function') showToast('💾 Comprovante baixado!');
}

// ════════════════════════════════════════════════════════════
// UI — Consulta por código + Elo de mensagens (lado do CIDADÃO)
// ════════════════════════════════════════════════════════════
let _eloCidadaoCodigo = null;

function consultarCodigoSeguro() {
  const input = document.getElementById('consulta-codigo-input');
  const painel = document.getElementById('consulta-resultado');
  if (!input || !painel) return;

  const codigo = input.value.trim().toUpperCase();
  if (!codigo) { painel.innerHTML = ''; return; }

  const d = Anonimato.consultarPorCodigo(codigo);
  if (!d) {
    painel.innerHTML = `<div class="consulta-erro">❌ Código não encontrado. Verifique e tente novamente.</div>`;
    return;
  }

  _eloCidadaoCodigo = codigo;
  Anonimato.marcarMensagensLidas(codigo, 'cidadao');
  painel.innerHTML = _renderEloCidadao(d);
  _scrollEloFundo();
}

function _renderEloCidadao(d) {
  const r = Anonimato.rotulo(d.nivelAnonimato);
  const statusLabels = {
    recebida: 'Recebida', analise: 'Em Análise',
    encaminhada: 'Encaminhada', concluida: 'Concluída',
  };
  const msgs = Array.isArray(d.mensagens) ? d.mensagens : [];

  const chat = msgs.length === 0
    ? `<div class="elo-vazio">Nenhuma mensagem ainda.<br>Se a autoridade precisar de mais informações, aparecerá aqui.</div>`
    : msgs.map(m => `
        <div class="elo-msg ${m.autor}">
          <div class="elo-autor">${m.autor === 'gestor' ? '🏛️ Autoridade' : '🙋 Você'}</div>
          ${_esc(m.texto)}
          <div class="elo-meta">${m.data} ${m.hora}</div>
        </div>`).join('');

  return `
    <div class="consulta-info-denuncia">
      <div class="cid-status-badge cid-${d.status}">${statusLabels[d.status] || d.status}</div>
      <div class="cid-protocolo">Protocolo <strong>${d.id}</strong></div>
      <div class="nivel-badge" style="color:${r.cor}">${r.icon} ${r.nome}</div>
    </div>

    <div class="elo-chat">
      <div class="elo-chat-head">
        <span class="elo-ic">🔐</span>
        <div>
          <h4>Canal seguro com a autoridade</h4>
          <div class="elo-sub">Você continua anônimo. Sua identidade nunca é revelada.</div>
        </div>
      </div>
      <div class="elo-msgs" id="elo-msgs-cidadao">${chat}</div>
      <div class="elo-input-row">
        <input type="text" id="elo-input-cidadao" placeholder="Escreva sua resposta..."
               onkeypress="if(event.key==='Enter')enviarMensagemCidadao()">
        <button onclick="enviarMensagemCidadao()">Enviar</button>
      </div>
    </div>`;
}

function enviarMensagemCidadao() {
  const input = document.getElementById('elo-input-cidadao');
  if (!input || !_eloCidadaoCodigo) return;
  const texto = input.value.trim();
  if (!texto) return;

  Anonimato.adicionarMensagem(_eloCidadaoCodigo, 'cidadao', texto);
  input.value = '';

  const d = Anonimato.consultarPorCodigo(_eloCidadaoCodigo);
  const painel = document.getElementById('consulta-resultado');
  if (painel && d) { painel.innerHTML = _renderEloCidadao(d); _scrollEloFundo(); }
  if (typeof showToast === 'function') showToast('✅ Resposta enviada com segurança.');
}

function _scrollEloFundo() {
  setTimeout(() => {
    const box = document.getElementById('elo-msgs-cidadao');
    if (box) box.scrollTop = box.scrollHeight;
  }, 50);
}

// Alterna abas da tela de consulta (protocolo vs código)
function trocarAbaConsulta(aba) {
  document.querySelectorAll('.consulta-tab').forEach(t => t.classList.remove('active'));
  const tab = document.getElementById('tab-consulta-' + aba);
  if (tab) tab.classList.add('active');
  const porProto = document.getElementById('consulta-por-protocolo');
  const porCodigo = document.getElementById('consulta-por-codigo');
  if (porProto)  porProto.style.display  = (aba === 'protocolo') ? 'block' : 'none';
  if (porCodigo) porCodigo.style.display = (aba === 'codigo') ? 'block' : 'none';
}

function _esc(s) {
  return String(s).replace(/[&<>"]/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
}