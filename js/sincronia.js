/**
 * sincronia.js — liga o site inteiro ao banco (US26).
 *
 * O problema que este modulo resolve
 * ----------------------------------
 * Ate aqui o portal e o painel eram a aplicacao da Fase 4: gravavam e liam
 * do localStorage. A API existia, era testada e ate ja alimentava as telas
 * novas (fila, pilha, auditoria, estatistica) - mas o fluxo principal nao
 * passava por ela. O resultado era uma contradicao dentro da MESMA tela: a
 * aba de estatistica descrevia 125 denuncias do banco enquanto o Kanban ao
 * lado mostrava as que existiam naquele navegador. Uma denuncia registrada
 * no portal nunca chegava ao painel do servidor.
 *
 * A estrategia: hidratar, nao reescrever
 * --------------------------------------
 * Em vez de reescrever cada tela para consumir a API, este modulo TRAZ os
 * dados da API para o mesmo lugar de onde as telas ja leem. O Kanban, o
 * backlog e a tabela de status continuam intactos - passam apenas a ver
 * dados do banco. Menos codigo tocado e menos regressao possivel.
 *
 * Escrita passa pela API primeiro
 * -------------------------------
 * Criar denuncia e mudar status vao ao servidor e so depois atualizam a
 * tela. O caminho inverso - gravar local e "sincronizar depois" - produz
 * telas que mostram algo que o banco nunca aceitou.
 *
 * Sem API, o comportamento antigo continua valendo, e a etiqueta de conexao
 * declara isso ao gestor.
 */
const Sincronia = (() => {

  let daApi = false;      // os dados em tela vieram do banco?
  let ultimaCarga = 0;

  function ativa() { return daApi; }

  /** low | medium | high a partir da classificacao textual do servidor. */
  function rotuloDoScore(txt, score) {
    if (txt === 'Alta')  return 'high';
    if (txt === 'Baixa') return 'low';
    if (txt === 'Media') return 'medium';
    return score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
  }

  /**
   * Converte a resposta da API para a forma que as telas ja esperam.
   *
   * O protocolo vira o `id` da tela porque e assim que o Kanban, o backlog e
   * a tabela de status identificam um caso desde a Fase 3. O id numerico do
   * banco fica em `apiId`, que e o que as chamadas de escrita precisam.
   *
   * `desc` e `endereco` vem vazios de proposito: a LISTAGEM da API nao
   * devolve relato nem endereco. Nao e omissao - e a decisao de privacidade
   * descrita na Parte 5. O conteudo aparece no detalhe, uma requisicao por
   * vez, e essa leitura gera registro de auditoria.
   */
  function paraTela(api) {
    const criado = api.criadoEm ? new Date(api.criadoEm) : null;
    return {
      id: api.protocolo,
      apiId: api.id,
      protocolo: api.protocolo,
      tipo: api.tipo,
      local: api.local || '—',
      status: api.status,
      anonimo: !!api.anonimo,
      score: api.score,
      scoreTxt: api.scoreTxt,
      scoreLabel: rotuloDoScore(api.scoreTxt, api.score),
      urgenciaIa: api.urgenciaIa,
      responsavelId: api.responsavelId,
      data: criado ? criado.toISOString().split('T')[0] : '',
      criadoEm: criado ? criado.toLocaleDateString('pt-BR') : '',
      desc: '',
      endereco: '',
      nome: '',
      contato: '',
      historico: [],
      origem: 'api',
    };
  }

  /**
   * Puxa as denuncias do banco para as telas.
   *
   * @param {boolean} forcar ignora a janela de 3 segundos entre cargas.
   *        Sem ela, abrir o painel dispararia quatro consultas identicas -
   *        uma por tela que se redesenha.
   */
  async function hidratar(forcar) {
    if (typeof Backend === 'undefined') return false;
    if (!forcar && Date.now() - ultimaCarga < 3000) return daApi;

    // A API limita a pagina a 100 itens - e faz bem: pagina sem teto e um
    // pedido de negacao de servico escrito na propria rota. Quem precisa da
    // base inteira pagina, e e isso que este laco faz.
    const TAMANHO = 100;
    const MAX_PAGINAS = 50;   // teto de seguranca: 5.000 casos
    const bruto = [];
    try {
      if (!(await Backend.estaOnline())) { daApi = false; return false; }
      let n = 0;
      while (n < MAX_PAGINAS) {
        const pagina = await Backend.listarPagina({ pagina: n, tamanho: TAMANHO });
        if (!pagina || !Array.isArray(pagina.conteudo)) break;
        bruto.push(...pagina.conteudo);
        if (!pagina.temProxima) break;
        n++;
      }
      if (n >= MAX_PAGINAS) {
        console.warn('[Sincronia] teto de paginas atingido: a tela mostra os primeiros '
                   + bruto.length + ' casos.');
      }
    } catch (e) {
      // Sem token ainda (o gestor nao entrou) ou API caiu no meio: mantem a
      // tela como esta em vez de esvazia-la.
      daApi = false;
      return false;
    }
    if (!bruto.length) { daApi = false; return false; }

    const lista = bruto.map(paraTela);
    window.denuncias = lista;
    try { localStorage.setItem('denuncias', JSON.stringify(lista)); } catch (_) {}

    daApi = true;
    ultimaCarga = Date.now();
    return true;
  }

  /** Redesenha as telas do painel depois de uma mudanca. */
  function redesenhar() {
    if (typeof renderStatusTable === 'function') renderStatusTable();
    if (typeof renderBacklog === 'function') renderBacklog();
    if (typeof updateKPIs === 'function') updateKPIs();
    if (typeof Kanban !== 'undefined' && Kanban.render) Kanban.render();
  }

  async function recarregar() {
    await hidratar(true);
    redesenhar();
  }

  /** Encontra o id numerico do banco a partir do protocolo exibido na tela. */
  function idApi(protocolo) {
    const lista = window.denuncias || [];
    const d = lista.find(x => x.id === protocolo || x.protocolo === protocolo);
    return d ? d.apiId : null;
  }

  /**
   * Muda o status pela API. Devolve true se o servidor aceitou.
   *
   * Quando devolve false, quem chamou mantem o caminho local antigo - e o
   * gestor ve pela etiqueta de conexao que esta em modo local.
   */
  async function mudarStatus(protocolo, novoStatus) {
    if (!daApi) return false;
    const id = idApi(protocolo);
    if (id == null) return false;
    try {
      await Backend.mudarStatus(id, novoStatus);
      await recarregar();
      return true;
    } catch (e) {
      if (typeof showToast === 'function') showToast('❌ ' + e.message);
      return false;
    }
  }

  async function atribuirResponsavel(protocolo, responsavelId) {
    if (!daApi) return false;
    const id = idApi(protocolo);
    if (id == null) return false;
    try {
      await Backend.atribuirResponsavel(id, responsavelId);
      await recarregar();
      return true;
    } catch (e) {
      if (typeof showToast === 'function') showToast('❌ ' + e.message);
      return false;
    }
  }

  return { ativa, hidratar, recarregar, redesenhar, mudarStatus, atribuirResponsavel, idApi, paraTela };
})();

window.Sincronia = Sincronia;
