/**
 * panico.js — Botão de Pânico / Saída Rápida
 *
 * Reforça o diferencial do Protege+: proteger quem denuncia com medo.
 * Uma faixa sempre visível permite sair do site INSTANTANEAMENTE,
 * substituindo a página por um site neutro e tentando limpar o rastro.
 *
 * Atalhos:
 *   • Clique no botão "Sair agora"
 *   • Tecla ESC pressionada 2x rapidamente
 *
 * Diferença para o Modo Seguro: o Modo Seguro DISFARÇA a tela (vira um
 * buscador). O Pânico SAI de vez, levando para fora do site.
 */

const Panico = (() => {

  // Para onde a saída leva (site neutro e comum)
  const DESTINO = 'https://www.google.com';

  let escTimer = null;
  let escCount = 0;

  function init() {
    // injeta a faixa se ainda não existir
    if (!document.getElementById('panico-bar')) _injetarBarra();

    // Atalho de teclado: ESC 2x rápido
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      escCount++;
      if (escCount >= 2) { sair(); return; }
      clearTimeout(escTimer);
      escTimer = setTimeout(() => { escCount = 0; }, 600);
    });
  }

  function _injetarBarra() {
    const bar = document.createElement('div');
    bar.id = 'panico-bar';
    bar.innerHTML = `
      <span class="panico-txt">Precisa sair rápido? Ninguém saberá que você esteve aqui.</span>
      <button class="panico-btn" onclick="Panico.sair()">
        <span>✕ Sair agora</span>
      </button>
      <span class="panico-dica">ou aperte ESC duas vezes</span>
    `;
    document.body.appendChild(bar);
    document.body.classList.add('panico-ativo');   // landing começa visível
  }

  // Mostra a faixa (landing / área pública)
  function mostrar() {
    const bar = document.getElementById('panico-bar');
    if (bar) bar.style.display = 'flex';
    document.body.classList.add('panico-ativo');
  }

  // Esconde a faixa (painel do gestor — não faz sentido lá)
  function esconder() {
    const bar = document.getElementById('panico-bar');
    if (bar) bar.style.display = 'none';
    document.body.classList.remove('panico-ativo');
  }

  function sair() {
    // 1) Tenta substituir todo o conteúdo imediatamente (resposta visual instantânea)
    try {
      document.documentElement.innerHTML =
        '<body style="margin:0;font-family:sans-serif;background:#fff"></body>';
    } catch (_) {}

    // 2) Tenta apagar o rastro do histórico desta página
    try {
      // substitui a entrada atual do histórico antes de sair
      history.replaceState(null, '', DESTINO);
    } catch (_) {}

    // 3) Sai do site — replace() não deixa o site no botão "voltar"
    try {
      window.location.replace(DESTINO);
    } catch (_) {
      window.location.href = DESTINO;
    }
  }

  return { init, sair, mostrar, esconder };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (typeof Panico !== 'undefined') Panico.init();
});