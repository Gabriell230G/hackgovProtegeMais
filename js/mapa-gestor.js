/**
 * mapa-gestor.js — Mapa Coroplético de Denúncias (São Paulo)
 *
 * PRIVACIDADE POR DESIGN:
 * - Granularidade mínima = município inteiro (nunca ponto/endereço individual).
 * - Municípios com menos de MIN_EXIBICAO denúncias ficam neutros (cinza),
 *   evitando reidentificação em cidades pequenas.
 *
 * Requer Leaflet já carregado na página.
 * Agrega a partir de getAllDenuncias() (main.js) ou do localStorage.
 */

const MapaGestor = (() => {

  const MIN_EXIBICAO = 3;                 // limiar de privacidade
  const COD_SP = 35;                       // código IBGE de São Paulo
  const MALHA_URL = `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${COD_SP}?formato=application/vnd.geo+json&intrarregiao=municipio&qualidade=intermediaria`;

  // Escala de cor (claro → vermelho institucional)
  const ESCALA = ['#FEE2E2', '#FCA5A5', '#F87171', '#EF4444', '#DC2626', '#991B1B'];

  let map = null;
  let geoLayer = null;
  let contagem = {};      // { nomeNormalizado: total }
  let inicializado = false;

  const TIPO_LABELS = {
    violencia: 'Violência', assedio: 'Assédio', abuso: 'Abuso',
    discriminacao: 'Discriminação', outros: 'Outras', emergencia: 'Emergência'
  };

  function _normalizar(nome) {
    return (nome || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // remove acentos
      .toLowerCase().trim();
  }

  /**
   * Detecta o nome do município nas propriedades do feature,
   * independente da versão da API do IBGE (nome / NOME / name / NM_MUN...).
   */
  function _nomeMunicipio(props) {
    if (!props) return '';
    const candidatos = ['nome', 'NOME', 'name', 'NM_MUN', 'NM_MUNICIP', 'municipio', 'MUNICIPIO'];
    for (const c of candidatos) {
      if (props[c]) return String(props[c]);
    }
    // Último recurso: primeira propriedade textual não-numérica
    for (const k of Object.keys(props)) {
      const v = props[k];
      if (typeof v === 'string' && isNaN(Number(v)) && v.length > 1) return v;
    }
    return '';
  }

  function _coletarDenuncias() {
    let lista = [];
    if (typeof getAllDenuncias === 'function') {
      lista = getAllDenuncias();
    } else {
      lista = JSON.parse(localStorage.getItem('denuncias') || '[]');
    }
    return lista.filter(d => d && d.local);
  }

  /** Agrega por município (apenas denúncias de SP) e por tipo */
  function _agregar() {
    contagem = {};
    const porTipo = {};
    _coletarDenuncias().forEach(d => {
      const partes = d.local.split(',').map(s => s.trim());
      const uf = (partes[partes.length - 1] || '').toUpperCase();
      if (uf !== 'SP') return;                       // só São Paulo
      const cidade = _normalizar(partes[0]);
      if (!cidade || cidade === 'nao informado') return;
      contagem[cidade] = (contagem[cidade] || 0) + 1;
      porTipo[cidade] = porTipo[cidade] || {};
      porTipo[cidade][d.tipo] = (porTipo[cidade][d.tipo] || 0) + 1;
    });
    return porTipo;
  }

  function _corPara(total) {
    if (total < MIN_EXIBICAO) return '#F1F5F9';      // neutro (privacidade)
    if (total >= 30) return ESCALA[5];
    if (total >= 20) return ESCALA[4];
    if (total >= 12) return ESCALA[3];
    if (total >= 7)  return ESCALA[2];
    return ESCALA[1];
  }

  async function init() {
    if (inicializado) { setTimeout(refresh, 100); return; }
    const el = document.getElementById('mapa-gestor');
    if (!el || typeof L === 'undefined') {
      console.warn('[MapaGestor] Leaflet ou container ausente.');
      return;
    }

    map = L.map('mapa-gestor', { zoomControl: true, scrollWheelZoom: false })
           .setView([-22.4, -48.6], 7);   // centro aproximado de SP

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap, © CARTO', maxZoom: 12, minZoom: 6
    }).addTo(map);

    const porTipo = _agregar();

    try {
      const res = await fetch(MALHA_URL);
      const geojson = await res.json();
      _desenhar(geojson, porTipo);
    } catch (e) {
      console.error('[MapaGestor] Erro ao carregar malha IBGE:', e);
      el.innerHTML = '<div style="padding:40px;text-align:center;color:#94A3B8">Não foi possível carregar o mapa do IBGE. Verifique a conexão.</div>';
    }

    inicializado = true;
  }

  function _desenhar(geojson, porTipo) {
    if (geoLayer) { map.removeLayer(geoLayer); }

    geoLayer = L.geoJSON(geojson, {
      style: (feature) => {
        const nome = _normalizar(_nomeMunicipio(feature.properties));
        const total = contagem[nome] || 0;
        return {
          fillColor: _corPara(total),
          weight: 0.6, color: '#fff', fillOpacity: 0.85,
        };
      },
      onEachFeature: (feature, layer) => {
        const nomeReal = _nomeMunicipio(feature.properties) || 'Município';
        const nome = _normalizar(nomeReal);
        const total = contagem[nome] || 0;

        layer.on({
          mouseover: (e) => e.target.setStyle({ weight: 2, color: '#0F172A', fillOpacity: 1 }),
          mouseout:  (e) => geoLayer.resetStyle(e.target),
          click: () => {
            let html = `<div class="mapa-info-popup"><h4>${nomeReal}</h4>`;
            if (total < MIN_EXIBICAO) {
              html += `<div class="suprimido">Menos de ${MIN_EXIBICAO} denúncias — detalhe suprimido por privacidade.</div>`;
            } else {
              html += `<div class="total">${total}</div><div style="font-size:11px;color:#64748B">denúncias agregadas</div>`;
              const tipos = porTipo[nome] || {};
              const linhas = Object.entries(tipos)
                .map(([t, n]) => `${TIPO_LABELS[t] || t}: <strong>${n}</strong>`).join('<br>');
              if (linhas) html += `<div class="breakdown">${linhas}</div>`;
            }
            html += `</div>`;
            layer.bindPopup(html).openPopup();
          }
        });
      }
    }).addTo(map);
  }

  /** Recalcula a contagem e repinta (chamar após nova denúncia / mudança) */
  async function refresh() {
    if (!map || !geoLayer) { return init(); }
    const porTipo = _agregar();
    geoLayer.setStyle((feature) => {
      const nome = _normalizar(_nomeMunicipio(feature.properties));
      const total = contagem[nome] || 0;
      return { fillColor: _corPara(total), weight: 0.6, color: '#fff', fillOpacity: 0.85 };
    });
    // Reatribui breakdown nos cliques
    geoLayer.eachLayer(layer => {
      const f = layer.feature;
      const nomeReal = _nomeMunicipio(f.properties) || 'Município';
      const nome = _normalizar(nomeReal);
      const total = contagem[nome] || 0;
      layer.off('click');
      layer.on('click', () => {
        let html = `<div class="mapa-info-popup"><h4>${nomeReal}</h4>`;
        if (total < MIN_EXIBICAO) {
          html += `<div class="suprimido">Menos de ${MIN_EXIBICAO} denúncias — detalhe suprimido por privacidade.</div>`;
        } else {
          html += `<div class="total">${total}</div><div style="font-size:11px;color:#64748B">denúncias agregadas</div>`;
          const tipos = porTipo[nome] || {};
          const linhas = Object.entries(tipos).map(([t, n]) => `${TIPO_LABELS[t] || t}: <strong>${n}</strong>`).join('<br>');
          if (linhas) html += `<div class="breakdown">${linhas}</div>`;
        }
        html += `</div>`;
        layer.bindPopup(html).openPopup();
      });
    });
  }

  return { init, refresh, MIN_EXIBICAO };
})();