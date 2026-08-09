/**
 * estatistica.js — Relatorio estatistico do canal (Parte 4).
 *
 * Consome GET /api/stats/analitico e desenha cinco graficos. Cada um vem
 * acompanhado de uma LEITURA em texto, gerada a partir dos proprios numeros
 * recebidos - nao de frases fixas. Um grafico sem leitura transfere para o
 * gestor o trabalho de interpretar, e e justamente esse trabalho que o
 * painel deveria estar fazendo por ele.
 *
 * Nada aqui e calculado no navegador. Media, desvio, quartis e correlacao
 * vem prontos do servidor, pelo mesmo motivo que o score veio: dois lugares
 * calculando a mesma coisa e uma divergencia esperando para acontecer.
 */
const Estatistica = (() => {

  function T(chave, padrao) {
    return (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(chave) : padrao;
  }

  const COR = {
    principal: '#1D4ED8', clara: 'rgba(29,78,216,.15)',
    critica: '#DC2626', alta: '#EA580C', media: '#D97706', baixa: '#0891B2',
    violencia: '#DC2626', abuso: '#EA580C', assedio: '#D97706',
    discriminacao: '#7C3AED', outros: '#64748B',
    aberto: '#B45309', neutra: '#94A3B8',
  };

  let dados = null;
  const graficos = {};

  function esc(t) {
    const d = document.createElement('div');
    d.textContent = t == null ? '' : String(t);
    return d.innerHTML;
  }

  const num = (v, casas) => Number(v).toLocaleString(
    (typeof I18n !== 'undefined' && I18n.atual() === 'en') ? 'en-US' : 'pt-BR',
    { minimumFractionDigits: casas === undefined ? 2 : casas,
      maximumFractionDigits: casas === undefined ? 2 : casas });

  function desenhar(id, tipo, data, extra) {
    const canvas = document.getElementById(id);
    if (!canvas || typeof Chart === 'undefined') return;
    if (graficos[id]) graficos[id].destroy();
    graficos[id] = new Chart(canvas, {
      type: tipo,
      data,
      options: Object.assign({
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#EEF2F7' } },
          x: { grid: { display: false } },
        },
      }, extra || {}),
    });
  }

  function cartao(rotulo, valor, nota) {
    return `<div class="est-cartao">
      <div class="est-cartao-vlr">${esc(valor)}</div>
      <div class="est-cartao-rot">${esc(rotulo)}</div>
      ${nota ? `<div class="est-cartao-nota">${esc(nota)}</div>` : ''}
    </div>`;
  }

  // ── Cabecalho: universo e medidas de posicao e dispersao ──────
  function resumo() {
    const l = dados.leadTime, u = dados.universo;
    const alvo = document.getElementById('est-cartoes');
    if (!alvo) return;
    alvo.innerHTML =
      cartao(T('est.card.universo', 'denúncias na base'), u.total,
             `${u.concluidas} ${T('est.card.concluidas', 'concluídas')} · ${u.emAberto} ${T('est.card.abertas', 'em aberto')}`) +
      cartao(T('est.card.media', 'dias em média até concluir'), num(l.media),
             `${T('est.card.mediana', 'mediana')} ${num(l.mediana)}`) +
      cartao(T('est.card.desvio', 'desvio-padrão, em dias'), num(l.desvio),
             `CV ${num(l.cv, 1)}%`) +
      cartao(T('est.card.p90', 'dias no percentil 90'), num(dados.percentisLeadTime.p90),
             T('est.card.p90nota', '9 em cada 10 casos fecham até aqui')) +
      cartao(T('est.card.assimetria', 'assimetria de Pearson'), num(l.assimetria),
             l.assimetria > 0 ? T('est.card.cauda_dir', 'cauda à direita')
                              : T('est.card.cauda_esq', 'cauda à esquerda'));

    const ref = document.getElementById('est-referencia');
    if (ref) {
      ref.textContent = T('est.referencia', 'Data de referência da base:') + ' '
        + String(dados.dataReferencia || '').replace('T', ' ').slice(0, 16)
        + ' — ' + T('est.referencia_nota',
            'as esperas dos casos em aberto são contadas a partir daqui, e não do relógio de hoje, para que o painel e o relatório devolvam sempre o mesmo número.');
    }
  }

  function leitura(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  // ── 1. Histograma do tempo de conclusao ──────────────────────
  function histograma() {
    const h = dados.histogramaLeadTime;
    desenhar('est-histograma', 'bar', {
      labels: h.map(f => f.rotulo),
      datasets: [{ data: h.map(f => f.n), backgroundColor: COR.principal, borderRadius: 4 }],
    });

    const l = dados.leadTime;
    const dominante = h.reduce((a, b) => (b.n > a.n ? b : a), h[0]);
    leitura('est-leitura-histograma',
      `${T('est.hist.1', 'A distribuição não é simétrica: a maior parte dos casos se concentra na faixa de')}
       <b>${esc(dominante.rotulo)} ${T('est.dias', 'dias')}</b>,
       ${T('est.hist.2', 'mas uma cauda de casos lentos se estende até')}
       <b>${num(l.maximo)} ${T('est.dias', 'dias')}</b>.
       ${T('est.hist.3', 'É por isso que a média') } (<b>${num(l.media)}</b>)
       ${T('est.hist.4', 'fica acima da mediana')} (<b>${num(l.mediana)}</b>)
       — ${T('est.hist.5', 'assimetria de')} <b>${num(l.assimetria)}</b>.
       ${l.outliers.length
          ? `${T('est.hist.6', 'A regra de Tukey aponta')} <b>${l.outliers.length}</b>
             ${T('est.hist.7', 'caso(s) fora da cerca de')} <b>${num(l.cercaSup)} ${T('est.dias', 'dias')}</b>.`
          : T('est.hist.8', 'Nenhum caso ultrapassa a cerca de Tukey.')}`);
  }

  // ── 2. Tempo por tipo de denuncia ────────────────────────────
  function porTipo() {
    const r = dados.leadPorTipo;
    desenhar('est-tipo', 'bar', {
      labels: r.map(x => T('tipo.' + x.chave, x.chave)),
      datasets: [{ data: r.map(x => x.media),
                   backgroundColor: r.map(x => COR[x.chave] || COR.neutra), borderRadius: 4 }],
    }, { indexAxis: 'y', scales: { x: { beginAtZero: true }, y: { grid: { display: false } } } });

    if (!r.length) return;
    const rapido = r.reduce((a, b) => (b.media < a.media ? b : a));
    const lento = r.reduce((a, b) => (b.media > a.media ? b : a));
    leitura('est-leitura-tipo',
      `${T('est.tipo.1', 'A ordem acompanha a gravidade:')}
       <b>${esc(T('tipo.' + rapido.chave, rapido.chave))}</b> ${T('est.tipo.2', 'fecha em')}
       <b>${num(rapido.media)}</b> ${T('est.dias', 'dias')},
       ${T('est.tipo.3', 'enquanto')} <b>${esc(T('tipo.' + lento.chave, lento.chave))}</b>
       ${T('est.tipo.4', 'leva')} <b>${num(lento.media)}</b> —
       <b>${num(lento.media / rapido.media, 1)}×</b> ${T('est.tipo.5', 'mais tempo')}.
       ${T('est.tipo.6', 'A triagem por gravidade está funcionando nos casos que chegam ao fim.')}`);
  }

  // ── 3. Tempo por urgencia atribuida pela IA ──────────────────
  function porUrgencia() {
    const r = dados.leadPorUrgencia;
    desenhar('est-urgencia', 'bar', {
      labels: r.map(x => T('urg.' + x.chave.toLowerCase(), x.chave)),
      datasets: [{ data: r.map(x => x.media),
                   backgroundColor: r.map(x => COR[x.chave.toLowerCase()] || COR.neutra), borderRadius: 4 }],
    });

    if (r.length < 2) return;
    const crescente = r.every((x, i) => i === 0 || x.media >= r[i - 1].media);
    leitura('est-leitura-urgencia',
      crescente
        ? `${T('est.urg.1', 'O tempo cresce à medida que a urgência cai — de')}
           <b>${num(r[0].media)}</b> ${T('est.dias', 'dias')}
           ${T('est.urg.2', 'na urgência mais alta a')} <b>${num(r[r.length - 1].media)}</b>
           ${T('est.urg.3', 'na mais baixa. A classificação automática do VigIA está, na prática, orientando a ordem de atendimento.')}`
        : T('est.urg.4', 'O tempo de atendimento não acompanha a urgência atribuída pela IA — a classificação automática não está guiando a fila.'));
  }

  // ── 4. Espera dos casos AINDA em aberto ──────────────────────
  function esperaAberto() {
    const r = dados.esperaEmAbertoPorUrgencia;
    desenhar('est-aberto', 'bar', {
      labels: r.map(x => T('urg.' + x.chave.toLowerCase(), x.chave)),
      datasets: [{ data: r.map(x => x.media),
                   backgroundColor: r.map(x => COR[x.chave.toLowerCase()] || COR.aberto), borderRadius: 4 }],
    });

    if (!r.length) return;
    const pior = r.reduce((a, b) => (b.media > a.media ? b : a));
    const critica = r.find(x => x.chave === 'CRITICA');
    const alerta = critica && pior.chave === 'CRITICA';
    leitura('est-leitura-aberto',
      `${T('est.ab.1', 'Este gráfico contradiz o anterior, e a contradição é o achado.')}
       ${T('est.ab.2', 'Entre os casos ainda não concluídos, quem mais espera é a urgência')}
       <b>${esc(T('urg.' + pior.chave.toLowerCase(), pior.chave))}</b>:
       <b>${num(pior.media)}</b> ${T('est.dias', 'dias')} ${T('est.ab.3', 'em média, com um caso parado há')}
       <b>${num(pior.maximo, 0)}</b>.
       ${alerta
          ? `<span class="est-alerta">${T('est.ab.4', 'Olhar apenas para os casos concluídos é viés de sobrevivência: eles são justamente os que não ficaram presos. O backlog mostra o que a média esconde.')}</span>`
          : T('est.ab.5', 'A fila de priorização existe para que esta ordem acompanhe a urgência.')}`);
  }

  // ── 5. Dispersao score x tempo ───────────────────────────────
  function dispersao() {
    const p = dados.dispersaoScoreLead;
    desenhar('est-dispersao', 'scatter', {
      datasets: [{
        data: p.map(x => ({ x: x.score, y: x.dias })),
        backgroundColor: 'rgba(29,78,216,.55)',
        pointRadius: 4,
      }],
    }, {
      scales: {
        x: { title: { display: true, text: T('est.disp.x', 'score de confiabilidade') }, beginAtZero: true },
        y: { title: { display: true, text: T('est.disp.y', 'dias até concluir') }, beginAtZero: true },
      },
    });

    const c = dados.correlacaoScoreLead;
    leitura('est-leitura-dispersao',
      `${T('est.disp.1', 'A nuvem não tem direção:')} <b>r = ${num(c.r)}</b>
       (r² = ${num(c.r2)}) — ${esc(T(c.leitura, c.leitura))}.
       ${T('est.disp.2', 'O score de confiabilidade praticamente não influencia o tempo de conclusão: uma denúncia bem documentada não é atendida mais rápido por ser bem documentada.')}
       ${T('est.disp.3', 'Vale lembrar que correlação não é causalidade, e que ausência de correlação linear não exclui outras formas de relação.')}`);
  }

  // ── 6. Cumprimento de prazo (candidatos a SLA) ───────────────
  function prazos() {
    const r = dados.cumprimentoDePrazo;
    desenhar('est-prazo', 'bar', {
      labels: r.map(x => x.dias + ' ' + T('est.dias', 'dias')),
      datasets: [{ data: r.map(x => x.percentual), backgroundColor: COR.principal, borderRadius: 4 }],
    }, { scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } },
                   x: { grid: { display: false } } } });

    const media = dados.leadTime.media;
    const noPrazoDaMedia = r.find(x => x.dias >= media);
    leitura('est-leitura-prazo',
      `${T('est.prazo.1', 'Prometer o prazo da média seria promessa quebrada.')}
       ${T('est.prazo.2', 'A média é de')} <b>${num(media)}</b> ${T('est.dias', 'dias')},
       ${noPrazoDaMedia
          ? `${T('est.prazo.3', 'mas apenas')} <b>${num(noPrazoDaMedia.percentual, 1)}%</b>
             ${T('est.prazo.4', 'dos casos fecham em até')} <b>${noPrazoDaMedia.dias}</b> ${T('est.dias', 'dias')}.`
          : ''}
       ${T('est.prazo.5', 'Um SLA honesto se compromete com o percentil 90')}
       (<b>${num(dados.percentisLeadTime.p90)}</b> ${T('est.dias', 'dias')}),
       ${T('est.prazo.6', 'que descreve o que o cidadão de fato encontra, e não o caso médio que quase ninguém vive.')}`);
  }

  // ── Carga ────────────────────────────────────────────────────
  async function carregar() {
    const aviso = document.getElementById('est-aviso');
    if (aviso) {
      aviso.className = 'est-aviso';
      aviso.textContent = T('est.carregando', 'Calculando o relatório no servidor…');
    }
    try {
      dados = await Backend.relatorioAnalitico();
    } catch (e) {
      if (aviso) {
        aviso.className = 'est-aviso erro';
        aviso.textContent = (e.status === 403 ? '🚫 ' : '❌ ') + e.message;
      }
      return;
    }
    if (!dados) {
      if (aviso) {
        aviso.className = 'est-aviso erro';
        aviso.textContent = T('est.offline',
          'O relatório estatístico é calculado no servidor. Sem a API no ar não há o que exibir — média e desvio das poucas denúncias guardadas neste navegador não descreveriam o canal.');
      }
      return;
    }
    if (aviso) aviso.className = 'est-aviso oculto';

    resumo();
    histograma();
    porTipo();
    porUrgencia();
    esperaAberto();
    dispersao();
    prazos();
  }

  document.addEventListener('protege:idioma', () => {
    const painel = document.getElementById('tab-estatistica');
    if (painel && painel.style.display !== 'none' && dados) carregar();
  });

  return { carregar, dados: () => dados };
})();

window.Estatistica = Estatistica;
