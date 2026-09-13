/**
 * conexao.js — Indicador da origem dos dados (US22).
 *
 * O painel pode estar lendo da API Java ou do localStorage. Do ponto de
 * vista de quem toma decisão com base naquela tela, a diferença é enorme:
 * no modo local os dados existem só naquele navegador. Deixar isso implícito
 * seria esconder do gestor uma informação que muda o valor do que ele vê.
 *
 * O indicador escuta o evento 'protege:conexao', disparado pelo backend.js
 * quando o health check da API é concluído.
 *
 * Os rótulos passam pelo I18n (US14). Em vez de reescrever o texto a cada
 * troca de idioma, o elemento carrega a chave em data-i18n: quem redesenha
 * é o próprio I18n.aplicar(), que já varre a página inteira.
 */
const Conexao = (() => {

  let elemento = null;
  let estado = null;   // null = verificando, true = online, false = offline

  // Fallback para o caso de o i18n.js nao ter carregado: o painel continua legivel.
  function T(chave, padrao) {
    return (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(chave) : padrao;
  }

  function montar() {
    if (elemento) return elemento;
    elemento = document.createElement('button');
    elemento.id = 'conexao-badge';
    elemento.className = 'conexao-badge verificando';
    elemento.type = 'button';
    elemento.innerHTML = '<span class="conexao-ponto"></span><span class="conexao-txt"></span>';
    elemento.addEventListener('click', () => {
      pintar(null);
      Backend.reavaliarConexao();
    });
    return elemento;
  }

  const ESTILO = {
    'null':  { classe: 'verificando', txt: ['conexao.verificando', 'verificando…'],  dica: ['conexao.verificando_dica', 'Consultando a API…'] },
    'true':  { classe: 'online',      txt: ['conexao.online', 'API conectada'],      dica: ['conexao.online_dica', 'Os dados vêm do banco, pela API Java.'] },
    'false': { classe: 'offline',     txt: ['conexao.offline', 'modo local'],        dica: ['conexao.offline_dica', 'A API está fora do ar. Os dados vêm deste navegador.'] },
  };

  function pintar(online) {
    if (!elemento) return;
    estado = online;
    const e = ESTILO[String(online)];
    const txt = elemento.querySelector('.conexao-txt');

    elemento.classList.remove('online', 'offline', 'verificando');
    elemento.classList.add(e.classe);

    // Chave no atributo => a proxima troca de idioma reescreve sozinha.
    txt.setAttribute('data-i18n', e.txt[0]);
    txt.textContent = T(e.txt[0], e.txt[1]);

    elemento.setAttribute('data-i18n', e.dica[0]);
    elemento.setAttribute('data-i18n-prop', 'title');
    // Mostra QUAL servidor esta respondendo. Num ambiente com homologacao e
    // producao lado a lado, "API conectada" sozinho nao diz o que importa.
    const endereco = (typeof Backend !== 'undefined' && Backend.BASE) ? '\n' + Backend.BASE : '';
    elemento.title = T(e.dica[0], e.dica[1]) + endereco;
  }

  function instalar(container) {
    const alvo = typeof container === 'string' ? document.getElementById(container) : container;
    if (!alvo) return;
    alvo.appendChild(montar());
    pintar(null);
    if (typeof Backend !== 'undefined') Backend.estaOnline().then(pintar);
  }

  document.addEventListener('protege:conexao', e => pintar(e.detail.online));
  document.addEventListener('protege:idioma', () => pintar(estado));

  /**
   * Aviso de abertura por duplo clique (protocolo file://).
   *
   * Quem descompacta o ZIP e abre o index.html direto nao ve um erro: ve uma
   * pagina que carrega e quase funciona. O navegador bloqueia as chamadas a
   * API por politica de origem, o site cai no modo local e a pessoa conclui
   * que o sistema esta quebrado - quando o que falta e um servidor HTTP.
   *
   * Uma falha silenciosa que parece defeito e pior do que uma mensagem clara.
   */
  function avisarAberturaLocal() {
    if (location.protocol !== 'file:') return;
    if (sessionStorage.getItem('protege_aviso_file') === 'fechado') return;

    const barra = document.createElement('div');
    barra.className = 'aviso-file';
    barra.innerHTML =
      '<span class="aviso-file-ic">!</span>'
    + '<span class="aviso-file-txt"><b>Aberto direto do arquivo.</b> '
    +   'O navegador bloqueia as chamadas à API, então o sistema roda só com o armazenamento local.</span>'
    + '<button type="button" class="aviso-file-btn" data-acao="abrir">Como servir por HTTP</button>'
    + '<button type="button" class="aviso-file-x" data-acao="fechar" aria-label="Fechar aviso">&times;</button>'
    + '<div class="aviso-file-det" hidden>'
    +   '<span>na raiz do projeto&nbsp; <code>python -m http.server 5500</code></span>'
    +   '<span>na pasta <code>backend</code>&nbsp; <code>.\\build.cmd run</code></span>'
    +   '<span>depois abra <code>http://localhost:5500</code></span>'
    +   '<span class="aviso-file-nota">Instruções completas no README.md.</span>'
    + '</div>';

    barra.addEventListener('click', ev => {
      const acao = ev.target.getAttribute && ev.target.getAttribute('data-acao');
      if (acao === 'fechar') {
        barra.remove();
        try { sessionStorage.setItem('protege_aviso_file', 'fechado'); } catch (_) {}
      }
      if (acao === 'abrir') {
        const det = barra.querySelector('.aviso-file-det');
        const aberto = !det.hidden;
        det.hidden = aberto;
        ev.target.textContent = aberto ? 'Como servir por HTTP' : 'Esconder';
      }
    });

    document.body.insertBefore(barra, document.body.firstChild);
  }

  document.addEventListener('DOMContentLoaded', () => {
    avisarAberturaLocal();
    setTimeout(() => instalar('sidebar-conexao'), 150);
  });

  return { instalar, pintar };
})();

window.Conexao = Conexao;
