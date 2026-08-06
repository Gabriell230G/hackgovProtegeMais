/**
 * auditoria.js — Consulta da trilha de auditoria (US19 e US25).
 *
 * Só os perfis AUDITOR e ADMIN acessam. Se o perfil atual não tiver
 * permissão, a API responde 403 e esta tela mostra a recusa explicitamente,
 * em vez de esconder a aba — a recusa é a demonstração de que a segregação
 * de acesso está funcionando, e ela própria fica registrada na trilha.
 *
 * A verificação de integridade recalcula toda a cadeia de hashes e aponta
 * o primeiro elo rompido, distinguindo conteúdo alterado de registro
 * removido ou inserido. Não impede adulteração: impede que ela passe
 * despercebida.
 */
const Auditoria = (() => {

  const COR_ACAO = {
    LOGIN: '#16A34A', LOGIN_NEGADO: '#DC2626',
    CONSULTA_SENSIVEL: '#7C3AED', ALTERACAO_STATUS: '#2563EB',
    ALTERACAO_DADOS: '#2563EB', ATRIBUICAO: '#0891B2',
    EXCLUSAO: '#DC2626', EXPORTACAO: '#EA580C',
    REANALISE_IA: '#D97706', ALTERACAO_EQUIPE: '#0891B2',
    ACESSO_AUDITORIA: '#64748B',
  };

  let pagina = 0;
  const TAMANHO = 25;

  function esc(t) {
    const d = document.createElement('div');
    d.textContent = t == null ? '' : String(t);
    return d.innerHTML;
  }

  function filtros() {
    const v = id => (document.getElementById(id) || {}).value || '';
    return {
      usuario: v('aud-f-usuario'),
      acao: v('aud-f-acao'),
      inicio: v('aud-f-inicio') ? v('aud-f-inicio') + 'T00:00:00' : '',
      fim: v('aud-f-fim') ? v('aud-f-fim') + 'T23:59:59' : '',
      pagina,
      tamanho: TAMANHO,
    };
  }

  async function carregar(novaPagina) {
    if (typeof novaPagina === 'number') pagina = Math.max(0, novaPagina);
    const corpo = document.getElementById('aud-tbody');
    const info = document.getElementById('aud-info');
    if (!corpo) return;

    corpo.innerHTML = '<tr><td colspan="7" class="aud-vazio">Carregando…</td></tr>';

    let page;
    try {
      page = await Backend.consultarAuditoria(filtros());
    } catch (e) {
      const negado = e.status === 403;
      corpo.innerHTML = `<tr><td colspan="7" class="aud-vazio ${negado ? 'negado' : 'erro'}">
        ${negado ? '🚫 <b>Acesso negado.</b> ' : '❌ '}${esc(e.message)}
        ${negado ? '<br><span class="aud-nota">Esta tentativa foi registrada na própria trilha de auditoria.</span>' : ''}
      </td></tr>`;
      if (info) info.textContent = '';
      return;
    }

    if (info) {
      info.textContent = `${page.totalItens} registro(s) · página ${page.pagina + 1} de ${Math.max(page.totalPaginas, 1)}`;
    }
    const ant = document.getElementById('aud-ant');
    const prox = document.getElementById('aud-prox');
    if (ant) ant.disabled = page.pagina === 0;
    if (prox) prox.disabled = !page.temProxima;

    if (!page.conteudo.length) {
      corpo.innerHTML = '<tr><td colspan="7" class="aud-vazio">Nenhum registro de auditoria para os filtros selecionados.</td></tr>';
      return;
    }

    corpo.innerHTML = page.conteudo.map(a => {
      const cor = COR_ACAO[a.acao] || '#64748B';
      const negado = a.resultado !== 'PERMITIDO';
      return `<tr class="${negado ? 'aud-negado' : ''}">
        <td class="aud-dh">${esc((a.dataHora || '').replace('T', ' ').slice(0, 19))}</td>
        <td>${esc(a.usuario || '—')}<div class="aud-perfil">${esc(a.perfil || '')}</div></td>
        <td><span class="aud-acao" style="background:${cor}1a;color:${cor}">${esc(a.acao)}</span></td>
        <td>${esc(a.recurso || '—')}${a.recursoId ? ' <b>#' + esc(a.recursoId) + '</b>' : ''}</td>
        <td><span class="aud-result ${negado ? 'neg' : 'ok'}">${esc(a.resultado)}</span></td>
        <td class="aud-ip">${esc(a.origemIp || '—')}</td>
        <td class="aud-hash" title="hash anterior: ${esc(a.hashAnterior)}&#10;hash: ${esc(a.hash)}">
          ${esc((a.hashAnterior || '').slice(0, 8))} → ${esc((a.hash || '').slice(0, 8))}
        </td>
      </tr>`;
    }).join('');
  }

  async function verificarIntegridade() {
    const painel = document.getElementById('aud-integridade');
    if (!painel) return;
    painel.className = 'aud-integridade verificando';
    painel.innerHTML = 'Recalculando a cadeia de hashes…';
    try {
      const r = await Backend.verificarIntegridade();
      if (r.integra) {
        painel.className = 'aud-integridade ok';
        painel.innerHTML = `✅ <b>Cadeia íntegra.</b> Os ${r.totalDeRegistros} registros foram
          recalculados e todos os elos conferem.`;
      } else {
        painel.className = 'aud-integridade falha';
        painel.innerHTML = `🚨 <b>Cadeia rompida no registro #${r.rompidoNoRegistro}.</b> ${esc(r.motivo)}`;
      }
    } catch (e) {
      painel.className = 'aud-integridade falha';
      painel.innerHTML = '❌ ' + esc(e.message);
    }
  }

  async function popularAcoes() {
    const sel = document.getElementById('aud-f-acao');
    if (!sel || sel.dataset.pronto) return;
    try {
      const acoes = await Backend.acoesAuditadas();
      Object.keys(acoes).sort().forEach(a => {
        const o = document.createElement('option');
        o.value = a;
        o.textContent = a.replace(/_/g, ' ').toLowerCase();
        o.title = acoes[a];
        sel.appendChild(o);
      });
      sel.dataset.pronto = '1';
    } catch (_) { /* perfil sem acesso: o filtro fica só com "todas" */ }
  }

  function limpar() {
    ['aud-f-usuario', 'aud-f-acao', 'aud-f-inicio', 'aud-f-fim']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    carregar(0);
  }

  async function abrir() {
    await popularAcoes();
    await carregar(0);
  }

  return {
    abrir, carregar, limpar, verificarIntegridade,
    anterior: () => carregar(pagina - 1),
    proxima:  () => carregar(pagina + 1),
  };
})();

window.Auditoria = Auditoria;
