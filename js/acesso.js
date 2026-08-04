/**
 * acesso.js — Controle de Acesso por Papéis (Gestor Master)
 *
 * Demonstra o princípio LGPD "cada papel vê apenas o que precisa".
 * Dois papéis:
 *   • MASTER   → vê tudo: identidade do denunciante, painel LGPD, equipe.
 *   • ANALISTA → trabalha as denúncias (kanban, status, resumo), mas
 *                NÃO vê a identidade de quem denunciou nem o painel LGPD.
 *
 * A identidade é protegida mesmo internamente — coerente com o
 * diferencial do Protege+ de proteger quem denuncia.
 */

const Acesso = (() => {

  let papelAtual = 'master';

  const PERMISSOES = {
    master:   { verIdentidade: true,  abas: ['resumo','backlog','status-d','kanban','equipe','mapa'], label: 'Gestor Master' },
    analista: { verIdentidade: false, abas: ['resumo','backlog','status-d','kanban','mapa'],                  label: 'Analista' },
  };

  function papel() { return papelAtual; }
  function pode(acao) { return !!PERMISSOES[papelAtual]?.[acao]; }
  function podeVerAba(aba) { return PERMISSOES[papelAtual]?.abas.includes(aba); }

  function definir(novoPapel, btn) {
    if (!PERMISSOES[novoPapel]) return;
    papelAtual = novoPapel;

    // botões
    document.querySelectorAll('.papel-opt').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    // rótulo do usuário
    const lbl = document.getElementById('user-role-label');
    if (lbl) lbl.textContent = PERMISSOES[novoPapel].label + ' • SP';

    aplicar();

    if (typeof showToast === 'function') {
      showToast(novoPapel === 'master'
        ? '🛡️ Acesso Master — visão completa.'
        : '👁️ Acesso Analista — identidade protegida.');
    }
  }

  // Esconde abas não permitidas e re-renderiza a tela atual
  function aplicar() {
    // esconde/mostra itens do menu conforme o papel
    document.querySelectorAll('.sidebar-item').forEach(item => {
      const onclick = item.getAttribute('onclick') || '';
      const m = onclick.match(/showDashTab\('([^']+)'/);
      if (m) {
        const aba = m[1];
        item.style.display = podeVerAba(aba) ? '' : 'none';
      }
    });

    // se a aba aberta não é mais permitida, volta pro resumo
    const abaAtiva = document.querySelector('.sidebar-item.active');
    if (abaAtiva) {
      const m = (abaAtiva.getAttribute('onclick') || '').match(/showDashTab\('([^']+)'/);
      if (m && !podeVerAba(m[1])) {
        if (typeof showDashTab === 'function') {
          const resumoItem = document.querySelector(".sidebar-item[onclick*=\"'resumo'\"]");
          showDashTab('resumo', resumoItem);
        }
      }
    }

    // re-renderiza telas que mostram identidade
    if (typeof renderStatusTable === 'function') renderStatusTable();
    if (typeof renderBacklog === 'function') renderBacklog();
    if (typeof Kanban !== 'undefined') Kanban.render();
  }

  /**
   * Mascara a identidade de uma denúncia conforme o papel.
   * Para o analista, nome/contato viram "[protegido]".
   * A descrição NÃO é mascarada (é o conteúdo do caso, necessário ao trabalho).
   */
  function mascarar(denuncia) {
    if (!denuncia) return denuncia;
    if (pode('verIdentidade')) return denuncia;   // master vê tudo
    const copia = { ...denuncia };
    if (copia.nome)    copia.nome = '🔒 [protegido]';
    if (copia.contato) copia.contato = '🔒 [protegido]';
    return copia;
  }

  function init() {
    aplicar();
  }

  return { papel, pode, podeVerAba, definir, aplicar, mascarar, init };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (typeof Acesso !== 'undefined') setTimeout(() => Acesso.init(), 100);
});