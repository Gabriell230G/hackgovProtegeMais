/**
 * faq.js — Interação do FAQ (accordion)
 * Gerencia abertura/fechamento das perguntas frequentes.
 */

const FAQ = (() => {

  /**
   * Inicializa os event listeners do FAQ.
   * Chamado após o DOM estar pronto.
   */
  function init() {
    document.querySelectorAll('.faq-item').forEach(item => {
      item.querySelector('.faq-question')
          ?.addEventListener('click', () => toggle(item));
    });
  }

  /**
   * Alterna o estado aberto/fechado de um item do FAQ.
   * @param {HTMLElement} item
   */
  function toggle(item) {
    const isOpen = item.classList.contains('open');

    // Fecha todos antes (comportamento accordion)
    document.querySelectorAll('.faq-item.open').forEach(el => {
      if (el !== item) el.classList.remove('open');
    });

    item.classList.toggle('open', !isOpen);
  }

  return { init, toggle };
})();