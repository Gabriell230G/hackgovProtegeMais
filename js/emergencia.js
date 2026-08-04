/**
 * emergencia.js — Fluxo de Emergência Rápido
 * Modal de 3 toques: tipo → localização (GPS) → enviar.
 * Reaproveita ScoreSystem, denuncias[] e protocolCount do main.js.
 *
 * A denúncia de emergência entra com flag de prioridade máxima,
 * mesmo com score baixo — velocidade > completude.
 */

const Emergencia = (() => {

  let tipoSelecionado = null;
  let coords = null;          // { lat, lon }
  let enderecoGPS = '';
  let cidadeGPS = '';
  let ufGPS = '';

  const TIPOS = [
    { id: 'violencia',     emoji: '🏠', labelKey: 'tipo.viol', subKey: 'tipo.viol.sub' },
    { id: 'assedio',       emoji: '⚠️', labelKey: 'tipo.ass',  subKey: 'tipo.ass.sub'  },
    { id: 'abuso',         emoji: '🚨', labelKey: 'tipo.abu',  subKey: 'tipo.abu.sub'  },
    { id: 'discriminacao', emoji: '⚖️', labelKey: 'tipo.disc', subKey: 'tipo.disc.sub' },
    { id: 'outros',        emoji: '📋', labelKey: 'tipo.out',  subKey: 'tipo.out.sub'  },
  ];

  // Helper de tradução — usa I18n se existir, senão cai no texto PT padrão
  function _t(chave, fallback) {
    return (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(chave) : (fallback || chave);
  }

  function abrir() {
    _reset();
    const ov = document.getElementById('emergencia-overlay');
    if (ov) ov.classList.add('active');
    // Já dispara o GPS em paralelo enquanto a pessoa escolhe o tipo
    _capturarLocalizacao();
  }

  function fechar() {
    document.getElementById('emergencia-overlay')?.classList.remove('active');
  }

  function _reset() {
    tipoSelecionado = null;
    coords = null;
    enderecoGPS = cidadeGPS = ufGPS = '';
    _renderForm();
  }

  function selecionarTipo(id, el) {
    tipoSelecionado = id;
    document.querySelectorAll('.emerg-tipo-btn').forEach(b => b.classList.remove('selected'));
    el?.classList.add('selected');
    _atualizarBotaoEnviar();
  }

  function _capturarLocalizacao() {
    const statusEl = document.getElementById('emerg-loc-status');
    if (!navigator.geolocation) {
      if (statusEl) {
        statusEl.className = 'emerg-loc-status fail';
        statusEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> GPS indisponível — será enviado sem localização exata.';
      }
      return;
    }
    if (statusEl) {
      statusEl.className = 'emerg-loc-status';
      statusEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${_t('emerg.localizando', 'Obtendo sua localização...')}`;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        try {
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lon}&format=json&accept-language=pt-BR`);
          const data = await res.json();
          const a = data.address || {};
          cidadeGPS   = a.city || a.town || a.village || '';
          ufGPS       = _nomeParaUF(a.state || '');
          enderecoGPS = [a.road, a.house_number, a.suburb || a.neighbourhood].filter(Boolean).join(', ');
        } catch (_) {}

        if (statusEl) {
          statusEl.className = 'emerg-loc-status ok';
          const txt = [enderecoGPS, cidadeGPS, ufGPS].filter(Boolean).join(', ');
          statusEl.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${_t('emerg.loc_ok', 'Localização capturada')}${txt ? ': ' + txt : ' (GPS)'}`;
        }
        _atualizarBotaoEnviar();
      },
      () => {
        if (statusEl) {
          statusEl.className = 'emerg-loc-status fail';
          statusEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${_t('emerg.loc_fail', 'Não foi possível obter o GPS — será enviado sem localização exata.')}`;
        }
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }

  function _atualizarBotaoEnviar() {
    const btn = document.getElementById('emerg-btn-enviar');
    if (btn) btn.disabled = !tipoSelecionado;
  }

  function enviar() {
    if (!tipoSelecionado) return;

    // Usa o contador global do main.js
    if (typeof protocolCount === 'undefined') { window.protocolCount = 0; }
    protocolCount++;
    localStorage.setItem('protocolCount', protocolCount);
    localStorage.setItem('protocolCounter', protocolCount);

    const id = '#2026-0' + String(protocolCount).padStart(4, '0');
    const agora = new Date();

    const denuncia = {
      id,
      tipo: tipoSelecionado,
      local: `${cidadeGPS || 'Não informado'}, ${ufGPS || 'N/A'}`,
      data: agora.toISOString().split('T')[0],
      status: 'recebida',
      desc: '[DENÚNCIA DE EMERGÊNCIA] Registro rápido sem descrição detalhada. Localização capturada via GPS.',
      anonimo: true,
      endereco: enderecoGPS || '',
      nome: '', contato: '',
      criadoEm: agora.toLocaleDateString('pt-BR'),
      temAnexos: false, temAudio: false, anexos: [], audio: null,
      // ── Flags de emergência ──
      emergencia: true,
      prioridade: 'maxima',
      coordenadas: coords,   // { lat, lon } para o gestor localizar no mapa
      historico: [{
        status: 'recebida',
        data: agora.toLocaleDateString('pt-BR'),
        hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      }],
    };

    // Score (será baixo — e tudo bem)
    if (typeof ScoreSystem !== 'undefined') {
      const r = ScoreSystem.calcular({
        tipo: denuncia.tipo, estado: ufGPS, cidade: cidadeGPS,
        endereco: denuncia.endereco, data: denuncia.data,
        descricao: denuncia.desc, temAnexos: false, nome: '', contato: '',
      });
      denuncia.score = r.score;
      denuncia.scoreLabel = r.label;
      denuncia.scoreTxt = r.classificacao;
    }

    // Salva reaproveitando o array global do main.js
    try {
      if (typeof denuncias !== 'undefined') {
        denuncias.push(denuncia);
        localStorage.setItem('denuncias', JSON.stringify(denuncias));
      } else {
        const arr = JSON.parse(localStorage.getItem('denuncias') || '[]');
        arr.push(denuncia);
        localStorage.setItem('denuncias', JSON.stringify(arr));
      }
    } catch (e) {
      console.warn('Erro ao salvar emergência:', e);
    }

    _renderSucesso(id);
  }

  function irParaCompleto() {
    fechar();
    if (typeof scrollToSection === 'function') scrollToSection('formulario');
    // Pré-seleciona o tipo no formulário completo, se houver
    if (tipoSelecionado && typeof selectTipo === 'function') {
      setTimeout(() => {
        const card = document.querySelector(`.tipo-card[onclick*="${tipoSelecionado}"]`);
        if (card) selectTipo(tipoSelecionado, { currentTarget: card });
      }, 250);
    }
  }

  // ── Renderização ──────────────────────────────────────────
  function _renderForm() {
    const body = document.getElementById('emerg-body');
    if (!body) return;

    body.innerHTML = `
      <div class="emerg-aviso">
        <div class="ico">📞</div>
        <div class="txt">
          <strong>${_t('emerg.aviso_titulo', 'Risco de vida agora? Ligue 190.')}</strong>
          ${_t('emerg.aviso_sub', 'Este canal registra a denúncia, mas não substitui o atendimento de emergência da polícia.')}
          <a class="call-190" href="tel:190"><i class="fa-solid fa-phone"></i> ${_t('emerg.ligar', 'Ligar 190')}</a>
        </div>
      </div>

      <div class="emerg-step-label"><span class="num">1</span> ${_t('emerg.passo1', 'O que está acontecendo?')}</div>
      <div class="emerg-tipos">
        ${TIPOS.map(t => `
          <button class="emerg-tipo-btn" onclick="Emergencia.selecionarTipo('${t.id}', this)">
            <span class="emoji">${t.emoji}</span>
            <span class="emerg-tipo-label">${_t(t.labelKey)}</span>
            <span class="emerg-tipo-sub">${_t(t.subKey)}</span>
          </button>`).join('')}
      </div>

      <div class="emerg-step-label"><span class="num">2</span> ${_t('emerg.passo2', 'Sua localização')}</div>
      <div id="emerg-loc-status" class="emerg-loc-status">
        <i class="fa-solid fa-spinner fa-spin"></i> ${_t('emerg.localizando', 'Obtendo sua localização...')}
      </div>

      <div class="emerg-step-label"><span class="num">3</span> ${_t('emerg.passo3', 'Enviar agora')}</div>
      <button id="emerg-btn-enviar" class="emerg-btn-enviar" disabled onclick="Emergencia.enviar()">
        <i class="fa-solid fa-paper-plane"></i> ${_t('emerg.enviar', 'Enviar denúncia de emergência')}
      </button>

      <a class="emerg-completo-link" onclick="Emergencia.irParaCompleto()">
        ${_t('emerg.completo', 'Tenho tempo para detalhar → usar formulário completo')}
      </a>
    `;
  }

  function _renderSucesso(id) {
    const body = document.getElementById('emerg-body');
    if (!body) return;
    body.innerHTML = `
      <div class="emerg-sucesso">
        <div class="check">✅</div>
        <h3>${_t('emerg.suc_titulo', 'Denúncia registrada com prioridade máxima')}</h3>
        <div class="proto">${id}</div>
        <p>${_t('emerg.suc_sub', 'Guarde este número para acompanhar o status.')}<br>
        ${_t('emerg.suc_risco', 'Se houver risco imediato, ligue agora:')}</p>
        <a class="call-190" style="margin-top:12px;display:inline-flex" href="tel:190">
          <i class="fa-solid fa-phone"></i> ${_t('emerg.ligar', 'Ligar 190')}
        </a>
        <a class="emerg-completo-link" onclick="Emergencia.fechar()" style="margin-top:16px">${_t('emerg.fechar', 'Fechar')}</a>
      </div>
    `;
  }

  function _nomeParaUF(estado) {
    const m = {
      'Acre':'AC','Alagoas':'AL','Amapá':'AP','Amazonas':'AM','Bahia':'BA','Ceará':'CE',
      'Distrito Federal':'DF','Espírito Santo':'ES','Goiás':'GO','Maranhão':'MA',
      'Mato Grosso':'MT','Mato Grosso do Sul':'MS','Minas Gerais':'MG','Pará':'PA',
      'Paraíba':'PB','Paraná':'PR','Pernambuco':'PE','Piauí':'PI','Rio de Janeiro':'RJ',
      'Rio Grande do Norte':'RN','Rio Grande do Sul':'RS','Rondônia':'RO','Roraima':'RR',
      'Santa Catarina':'SC','São Paulo':'SP','Sergipe':'SE','Tocantins':'TO'
    };
    const k = Object.keys(m).find(k => estado.toLowerCase().includes(k.toLowerCase()));
    return k ? m[k] : '';
  }

  return { abrir, fechar, selecionarTipo, enviar, irParaCompleto };
})();