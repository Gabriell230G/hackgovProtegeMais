/**
 * acesso.js — Controle de acesso por perfil (US24).
 *
 * O seletor de perfil deixou de ser uma simulação de interface: trocar de
 * perfil aqui faz um LOGIN REAL na API com credenciais diferentes, e o token
 * emitido carrega a role correspondente. A partir daí, quem decide o que cada
 * um pode fazer é o servidor — o front apenas reflete a decisão.
 *
 * Isso importa porque esconder um botão não é controle de acesso. Se a
 * restrição vivesse só aqui, bastaria abrir o console do navegador para
 * contorná-la. Ao trocar para Atendente e abrir a Trilha de Auditoria, a API
 * responde 403 e a própria tentativa fica registrada na trilha.
 *
 * Quatro perfis demonstráveis:
 *   ADMIN     → acesso pleno, integralmente auditado.
 *   GESTOR    → coordena o atendimento e vê identificação. NÃO vê a auditoria.
 *   ATENDENTE → trabalha os casos sem acesso a dado identificável.
 *   AUDITOR   → fiscaliza o uso do sistema, sem ver o relato das denúncias.
 */
const Acesso = (() => {

  let papelAtual = 'master';

  const PERMISSOES = {
    master: {
      label: 'Administrador',
      verIdentidade: true,
      abas: ['resumo','backlog','status-d','kanban','equipe','mapa','estatistica','auditoria'],
      credenciais: { email: 'admin@protege.gov.br', senha: 'admin123' },
      aviso: '🛡️ Perfil Administrador — acesso pleno, integralmente auditado.',
    },
    gestor: {
      label: 'Gestor',
      verIdentidade: true,
      abas: ['resumo','backlog','status-d','kanban','equipe','mapa','estatistica','auditoria'],
      credenciais: { email: 'gestor@protege.gov.br', senha: 'gestor123' },
      aviso: '👔 Perfil Gestor — vê identificação, mas a trilha de auditoria é negada pela API.',
    },
    analista: {
      label: 'Atendente',
      verIdentidade: false,
      abas: ['resumo','backlog','status-d','kanban','mapa','estatistica','auditoria'],
      credenciais: { email: 'atendente@protege.gov.br', senha: 'atendente123' },
      aviso: '👁️ Perfil Atendente — identidade e endereço protegidos pelo servidor.',
    },
    auditor: {
      label: 'Auditor',
      verIdentidade: false,
      abas: ['resumo','auditoria'],
      credenciais: { email: 'auditor@protege.gov.br', senha: 'auditor123' },
      aviso: '🔎 Perfil Auditor — fiscaliza o uso do sistema, sem ver o relato das denúncias.',
    },
  };

  function papel() { return papelAtual; }
  function pode(acao) { return !!(PERMISSOES[papelAtual] && PERMISSOES[papelAtual][acao]); }
  function podeVerAba(aba) {
    return !!(PERMISSOES[papelAtual] && PERMISSOES[papelAtual].abas.indexOf(aba) >= 0);
  }
  function perfilServidor() {
    return (typeof Backend !== 'undefined' && Backend.perfilAtual()) || null;
  }

  async function definir(novoPapel, btn) {
    const cfg = PERMISSOES[novoPapel];
    if (!cfg) return;
    papelAtual = novoPapel;

    document.querySelectorAll('.papel-opt').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    // Login real na API. O perfil efetivo passa a ser o que o token declara.
    let perfilReal = null;
    if (typeof Backend !== 'undefined' && await Backend.estaOnline()) {
      Backend.logout();
      const dados = await Backend.login(cfg.credenciais.email, cfg.credenciais.senha);
      perfilReal = dados ? dados.role : null;
    }

    const lbl = document.getElementById('user-role-label');
    if (lbl) {
      lbl.textContent = perfilReal ? (cfg.label + ' • ' + perfilReal)
                                   : (cfg.label + ' • modo local');
    }
    const nome = document.querySelector('.user-name');
    if (nome) nome.textContent = cfg.credenciais.email;

    aplicar();

    if (typeof showToast === 'function') {
      showToast(cfg.aviso + (perfilReal ? '' : ' (API fora do ar: restrição apenas local)'));
    }
  }

  /**
   * Esconde do menu as abas que o perfil não usa e volta ao resumo se a aba
   * aberta deixou de ser permitida.
   *
   * A aba de auditoria permanece VISÍVEL para os perfis operacionais de
   * propósito: é ao abri-la e receber 403 que a segregação de acesso fica
   * demonstrada. Esconder o botão pareceria segurança sem sê-la.
   */
  function aplicar() {
    document.querySelectorAll('.sidebar-item').forEach(item => {
      const onclick = item.getAttribute('onclick') || '';
      const m = onclick.match(/showDashTab\('([^']+)'/);
      if (m) item.style.display = podeVerAba(m[1]) ? '' : 'none';
    });

    const abaAtiva = document.querySelector('.sidebar-item.active');
    if (abaAtiva) {
      const m = (abaAtiva.getAttribute('onclick') || '').match(/showDashTab\('([^']+)'/);
      if (m && !podeVerAba(m[1]) && typeof showDashTab === 'function') {
        showDashTab('resumo', document.querySelector(".sidebar-item[onclick*=\"'resumo'\"]"));
      }
    }

    if (typeof renderStatusTable === 'function') renderStatusTable();
    if (typeof renderBacklog === 'function') renderBacklog();
    if (typeof Kanban !== 'undefined') Kanban.render();
  }

  /**
   * Mascaramento no cliente, para os dados que vivem no modo local.
   *
   * Quando a API está no ar o mascaramento já vem pronto do servidor — que é
   * onde ele precisa acontecer. Este aqui cobre o plano B e mantém a tela
   * coerente nos dois modos.
   */
  function mascarar(denuncia) {
    if (!denuncia) return denuncia;
    if (pode('verIdentidade')) return denuncia;
    const copia = Object.assign({}, denuncia);
    if (copia.nome)     copia.nome = '🔒 [protegido]';
    if (copia.contato)  copia.contato = '🔒 [protegido]';
    if (copia.endereco) copia.endereco = '🔒 [endereço protegido]';
    return copia;
  }

  /** Traduz a role que o token declara para o papel usado nesta tela. */
  const POR_ROLE = {
    ADMIN: 'master', GESTOR: 'gestor', ATENDENTE: 'analista', AUDITOR: 'auditor',
  };

  /**
   * Aplica o perfil de quem acabou de se autenticar na tela de login.
   *
   * Diferente de definir(), nao faz login: o token ja existe. Quem manda e a
   * role que o SERVIDOR colocou no token, nao o que o usuario digitou nem o
   * que esta tela imagina. Um e-mail desconhecido cai no perfil mais restrito
   * em vez de no mais permissivo - errar para o lado de negar acesso.
   */
  function aplicarAutenticado(role, email) {
    papelAtual = POR_ROLE[String(role).toUpperCase()] || 'analista';
    const cfg = PERMISSOES[papelAtual];

    document.querySelectorAll('.papel-opt').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('papel-' + (papelAtual === 'analista' ? 'analista' : papelAtual));
    if (btn) btn.classList.add('active');

    const lbl = document.getElementById('user-role-label');
    if (lbl) lbl.textContent = cfg.label + ' • ' + role;
    const nome = document.querySelector('.user-name');
    if (nome && email) nome.textContent = email;

    aplicar();
    return papelAtual;
  }

  function init() { aplicar(); }

  return { papel, pode, podeVerAba, perfilServidor, definir, aplicarAutenticado,
           aplicar, mascarar, init, PERMISSOES };
})();

window.Acesso = Acesso;

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => Acesso.init(), 100);
});
