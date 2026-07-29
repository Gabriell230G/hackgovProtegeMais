/**
 * storage-guard.js — Proteção global de armazenamento.
 *
 * Alguns contextos (aba anônima em certos navegadores, cookies/armazenamento
 * bloqueados, políticas corporativas) fazem o localStorage LANÇAR exceção ao
 * ser lido ou gravado. Sem tratamento, isso derrubaria o site inteiro.
 *
 * Este guard testa o localStorage no início e, se ele não estiver disponível,
 * substitui por um armazenamento equivalente em memória (dura só a sessão).
 * Assim, todo o resto do código continua usando localStorage normalmente.
 *
 * DEVE ser o PRIMEIRO script carregado na página.
 */
(function () {
  'use strict';

  function disponivel() {
    try {
      var k = '__protege_test__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  }

  if (disponivel()) return; // tudo certo, usa o localStorage nativo

  console.warn('[Protege+] localStorage indisponível — usando armazenamento temporário em memória (não persiste após fechar a aba).');

  var mem = Object.create(null);
  var shim = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
    setItem: function (k, v) { mem[k] = String(v); },
    removeItem: function (k) { delete mem[k]; },
    clear: function () { mem = Object.create(null); },
    key: function (i) { return Object.keys(mem)[i] || null; },
    get length() { return Object.keys(mem).length; }
  };

  try {
    Object.defineProperty(window, 'localStorage', { value: shim, configurable: true, writable: false });
  } catch (e) {
    try { window.localStorage = shim; } catch (e2) { /* ultimo recurso: ignora */ }
  }
})();
