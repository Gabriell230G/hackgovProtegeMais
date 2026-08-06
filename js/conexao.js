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
 */
const Conexao = (() => {

  let elemento = null;

  function montar() {
    if (elemento) return elemento;
    elemento = document.createElement('button');
    elemento.id = 'conexao-badge';
    elemento.className = 'conexao-badge verificando';
    elemento.type = 'button';
    elemento.title = 'Clique para verificar novamente';
    elemento.innerHTML = '<span class="conexao-ponto"></span><span class="conexao-txt">verificando…</span>';
    elemento.addEventListener('click', () => {
      pintar(null);
      Backend.reavaliarConexao();
    });
    return elemento;
  }

  function pintar(online) {
    if (!elemento) return;
    const txt = elemento.querySelector('.conexao-txt');
    elemento.classList.remove('online', 'offline', 'verificando');
    if (online === null) {
      elemento.classList.add('verificando');
      txt.textContent = 'verificando…';
      elemento.title = 'Consultando a API…';
    } else if (online) {
      elemento.classList.add('online');
      txt.textContent = 'API conectada';
      elemento.title = 'Os dados vêm do banco, pela API Java. Clique para verificar novamente.';
    } else {
      elemento.classList.add('offline');
      txt.textContent = 'modo local';
      elemento.title = 'A API está fora do ar. Os dados exibidos vêm do armazenamento deste navegador.';
    }
  }

  function instalar(container) {
    const alvo = typeof container === 'string' ? document.getElementById(container) : container;
    if (!alvo) return;
    alvo.appendChild(montar());
    if (typeof Backend !== 'undefined') Backend.estaOnline().then(pintar);
  }

  document.addEventListener('protege:conexao', e => pintar(e.detail.online));

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => instalar('sidebar-conexao'), 150);
  });

  return { instalar, pintar };
})();

window.Conexao = Conexao;
