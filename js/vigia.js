/**
 * vigia.js — VigIA: análise inteligente por regras (sem API)
 *
 * Lê o conjunto de denúncias e produz:
 *   • LEITURAS    → o que está acontecendo (volume, tipo em alta, concentração)
 *   • RECOMENDAÇÕES → o que priorizar (paradas há muito tempo, focos, emergências)
 *
 * Tudo explicável: cada recomendação diz POR QUE foi gerada.
 * É um copiloto do gestor, não um vidente — nada de "previsão".
 */

const VigIA = (() => {

  // Gravidade relativa por tipo (peso na priorização)
  const GRAVIDADE = {
    violencia: 5, abuso: 5, assedio: 3, discriminacao: 3, outros: 2,
  };
  const TIPO_LABEL = {
    violencia: 'Violência Doméstica', abuso: 'Abuso', assedio: 'Assédio',
    discriminacao: 'Discriminação', outros: 'Outras Ocorrências',
  };
  const DIAS_PARADO_ALERTA = 5;   // denúncia parada além disso = atenção

  function _denuncias() {
    const mapa = new Map();
    const add = (arr) => (arr || []).forEach(d => { if (d && d.id) mapa.set(d.id, d); });
    if (typeof getAllDenuncias === 'function') { try { add(getAllDenuncias()); } catch (_) {} }
    try { add(JSON.parse(localStorage.getItem('denuncias') || '[]')); } catch (_) {}
    return Array.from(mapa.values());
  }

  function _diasDesde(dataStr) {
    // dataStr pode ser ISO (yyyy-mm-dd) ou pt-BR (dd/mm/aaaa)
    if (!dataStr) return 0;
    let d;
    if (dataStr.includes('/')) {
      const [dia, mes, ano] = dataStr.split('/');
      d = new Date(`${ano}-${mes}-${dia}`);
    } else {
      d = new Date(dataStr);
    }
    if (isNaN(d)) return 0;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  }

  function _cidade(local) {
    return (local || '').split(',')[0].trim();
  }

  // ── LEITURAS (métricas estruturadas para cards) ─────────────
  function _leituras(lista) {
    const total = lista.length;
    if (total === 0) {
      return [{ icon: 'ℹ️', valor: '0', rotulo: 'Denúncias', sub: 'Nada para analisar ainda', cor: '#94A3B8' }];
    }
    const out = [];

    // Total
    out.push({ icon: '📊', valor: String(total), rotulo: 'Denúncias no sistema', sub: 'Total registrado', cor: '#2563EB' });

    // Tipo mais frequente
    const porTipo = {};
    lista.forEach(d => { porTipo[d.tipo] = (porTipo[d.tipo] || 0) + 1; });
    const topTipo = Object.entries(porTipo).sort((a, b) => b[1] - a[1])[0];
    if (topTipo) {
      const pct = Math.round((topTipo[1] / total) * 100);
      out.push({ icon: '🏷️', valor: `${pct}%`, rotulo: TIPO_LABEL[topTipo[0]] || topTipo[0], sub: 'Tipo mais frequente', cor: '#7C3AED' });
    }

    // Concentração geográfica
    const porCidade = {};
    lista.forEach(d => { const c = _cidade(d.local); if (c) porCidade[c] = (porCidade[c] || 0) + 1; });
    const topCidade = Object.entries(porCidade).sort((a, b) => b[1] - a[1])[0];
    if (topCidade && topCidade[1] > 1) {
      out.push({ icon: '📍', valor: String(topCidade[1]), rotulo: topCidade[0], sub: 'Maior concentração', cor: '#D97706' });
    }

    // Andamento
    const concluidas = lista.filter(d => d.status === 'concluida').length;
    const pctConcl = Math.round((concluidas / total) * 100);
    out.push({ icon: '✅', valor: `${pctConcl}%`, rotulo: 'Concluídas', sub: `${concluidas} de ${total}`, cor: '#16A34A' });

    return out;
  }

  // ── RECOMENDAÇÕES ───────────────────────────────────────────
  function _recomendacoes(lista) {
    const recs = [];

    // 1. Emergências não concluídas → topo absoluto
    const emerg = lista.filter(d => d.emergencia && d.status !== 'concluida');
    if (emerg.length) {
      recs.push({
        nivel: 'alta',
        icon: '🚨',
        titulo: `${emerg.length} denúncia${emerg.length > 1 ? 's' : ''} de emergência em aberto`,
        porque: 'Marcadas como emergência e ainda não concluídas. Exigem ação imediata.',
        ids: emerg.map(d => d.id),
      });
    }

    // 2. Denúncias graves paradas há muito tempo
    const paradas = lista.filter(d =>
      d.status !== 'concluida' &&
      (GRAVIDADE[d.tipo] || 0) >= 4 &&
      _diasDesde(d.data || d.criadoEm) >= DIAS_PARADO_ALERTA
    );
    if (paradas.length) {
      recs.push({
        nivel: 'alta',
        icon: '⏰',
        titulo: `${paradas.length} denúncia${paradas.length > 1 ? 's' : ''} grave${paradas.length > 1 ? 's' : ''} parada${paradas.length > 1 ? 's' : ''} há ${DIAS_PARADO_ALERTA}+ dias`,
        porque: `Tipos de alta gravidade (violência/abuso) sem conclusão há mais de ${DIAS_PARADO_ALERTA} dias.`,
        ids: paradas.map(d => d.id),
      });
    }

    // 3. Foco geográfico (concentração que merece equipe)
    const porCidade = {};
    lista.forEach(d => { if (d.status !== 'concluida') { const c = _cidade(d.local); if (c) (porCidade[c] = porCidade[c] || []).push(d); } });
    const foco = Object.entries(porCidade).filter(([, arr]) => arr.length >= 3)
                        .sort((a, b) => b[1].length - a[1].length)[0];
    if (foco) {
      recs.push({
        nivel: 'media',
        icon: '📍',
        titulo: `Foco em ${foco[0]}: ${foco[1].length} denúncias ativas`,
        porque: 'Concentração de casos abertos na mesma localidade — considere designar uma equipe dedicada.',
        ids: foco[1].map(d => d.id),
      });
    }

    // 4. Convergência: mesmo tipo + mesma cidade (possível caso relacionado)
    const grupos = {};
    lista.forEach(d => {
      if (d.status === 'concluida') return;
      const chave = `${d.tipo}@@${_cidade(d.local)}`;
      (grupos[chave] = grupos[chave] || []).push(d);
    });
    const conv = Object.entries(grupos).filter(([, arr]) => arr.length >= 3)
                        .sort((a, b) => b[1].length - a[1].length)[0];
    if (conv) {
      const [tipo, cidade] = conv[0].split('@@');
      recs.push({
        nivel: 'media',
        icon: '🔗',
        titulo: `${conv[1].length} denúncias de ${TIPO_LABEL[tipo] || tipo} em ${cidade}`,
        porque: 'Várias denúncias independentes do mesmo tipo no mesmo local podem indicar um caso relacionado. Vale verificação cruzada.',
        ids: conv[1].map(d => d.id),
      });
    }

    // 5. Sem responsável atribuído (denúncias ativas órfãs)
    const semResp = lista.filter(d => d.status !== 'concluida' && !d.responsavelId);
    if (semResp.length >= 3) {
      recs.push({
        nivel: 'baixa',
        icon: '👤',
        titulo: `${semResp.length} denúncias ativas sem responsável`,
        porque: 'Sem responsável atribuído, o acompanhamento fica disperso. Atribua pelo Kanban.',
        ids: semResp.map(d => d.id),
      });
    }

    if (recs.length === 0) {
      recs.push({
        nivel: 'ok', icon: '✅',
        titulo: 'Nenhum ponto crítico no momento',
        porque: 'Não há emergências em aberto, casos graves parados ou focos de concentração.',
        ids: [],
      });
    }

    // Ordena por nível (alta > media > baixa > ok)
    const ordem = { alta: 0, media: 1, baixa: 2, ok: 3 };
    return recs.sort((a, b) => ordem[a.nivel] - ordem[b.nivel]);
  }

  // ── Render ──────────────────────────────────────────────────
  function analisar() {
    const body = document.getElementById('vigia-body');
    if (!body) return;
    const lista = _denuncias();

    const leituras = _leituras(lista);
    const recs = _recomendacoes(lista);

    const agora = new Date();
    const carimbo = `${agora.toLocaleDateString('pt-BR')} ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    body.innerHTML = `
      <div class="vigia-secao-tit">📖 O que está acontecendo</div>
      <div class="vigia-metricas">
        ${leituras.map(l => `
          <div class="vigia-metrica" style="--mc:${l.cor}">
            <div class="vm-ic">${l.icon}</div>
            <div class="vm-valor">${l.valor}</div>
            <div class="vm-rotulo">${l.rotulo}</div>
            <div class="vm-sub">${l.sub}</div>
          </div>`).join('')}
      </div>

      <div class="vigia-secao-tit" style="margin-top:20px">🎯 Recomendações de ação</div>
      <div class="vigia-recs">
        ${recs.map(r => `
          <div class="vigia-rec ${r.nivel}">
            <div class="vr-top"><span class="vr-ic">${r.icon}</span><span class="vr-tit">${r.titulo}</span></div>
            <div class="vr-porque">${r.porque}</div>
            ${r.ids.length ? `<div class="vr-ids">${r.ids.slice(0, 6).map(id => `<span>${id}</span>`).join('')}${r.ids.length > 6 ? ` <span class="vr-mais">+${r.ids.length - 6}</span>` : ''}</div>` : ''}
          </div>`).join('')}
      </div>
      <div class="vigia-carimbo">Última análise: ${carimbo} · ${lista.length} denúncia(s) avaliada(s)</div>
    `;
  }

  return { analisar };
})();