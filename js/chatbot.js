/**
 * chatbot.js — VigIA Assistente Virtual
 * Árvore completa de menus e submenus, lógica de navegação,
 * typing indicator, quick-replies.
 */

const Chatbot = (() => {

  // ── Estado ──────────────────────────────────────────────────
  let isOpen    = false;
  let inited    = false;
  let currentMenu = 'main'; // controla onde o usuário está

  // ── Dados: árvore de conteúdo ────────────────────────────────
  const TREE = {

    greeting: 'Olá, eu sou o VigIA. Como posso te ajudar?',

    main: {
      label: 'Menu principal',
      items: [
        { id: '1', icon: 'fa-file-pen',        label: 'Quero fazer uma denúncia' },
        { id: '2', icon: 'fa-circle-question',  label: 'Dúvidas sobre o formulário' },
        { id: '3', icon: 'fa-list',             label: 'Tipos de denúncia' },
        { id: '4', icon: 'fa-shield-halved',    label: 'Anonimato e segurança' },
        { id: '5', icon: 'fa-magnifying-glass', label: 'Acompanhar denúncia' },
        { id: '6', icon: 'fa-triangle-exclamation', label: 'Situação de emergência' },
        { id: '7', icon: 'fa-address-book',     label: 'Contatos' },
      ]
    },

    // ── Opção 1 ─────────────────────────────────────────────────
    '1': {
      type: 'text',
      text: 'Perfeito, vou te ajudar. Você pode iniciar sua denúncia pelo formulário na página. Se tiver dúvidas, posso te orientar também.',
      action: { label: 'Ir para o formulário', fn: () => { Chatbot.close(); scrollToSection('formulario'); } }
    },

    // ── Opção 2 — Dúvidas sobre o formulário ────────────────────
    '2': {
      type: 'submenu',
      label: 'Dúvidas sobre o formulário',
      items: [
        { id: '2.1', label: 'Não sei o local exato do ocorrido' },
        { id: '2.2', label: 'Não tenho todas as informações' },
        { id: '2.3', label: 'O ocorrido foi há muito tempo' },
        { id: '2.4', label: 'Tenho medo de escrever errado' },
        { id: '2.5', label: 'Preciso me identificar?' },
        { id: '2.6', label: 'O que acontece depois do envio?' },
        { id: '2.7', label: 'Posso anexar provas?' },
      ]
    },

    '2.1': { type: 'text', text: 'Não tem problema. Você não precisa saber o endereço exato.\nInforme o que lembrar: bairro, ponto de referência, rua aproximada ou descreva com suas palavras.\nExemplo: "casa azul na esquina perto de um bar".\nO importante é não deixar de denunciar.' },
    '2.2': { type: 'text', text: 'Você não precisa ter tudo.\nEnvie o que souber: o que aconteceu, quando e onde.\nMesmo incompleto já ajuda.' },
    '2.3': { type: 'text', text: 'Sim, ainda pode denunciar.\nAjuda a identificar padrões e proteger outras pessoas.' },
    '2.4': { type: 'text', text: 'Escreva do seu jeito.\nNão precisa ser formal, só claro e verdadeiro.' },
    '2.5': { type: 'text', text: 'Não. A denúncia pode ser totalmente anônima.' },
    '2.6': { type: 'text', text: 'Etapas:\nRecebida → Em análise → Encaminhada → Concluída\nVocê acompanha pelo protocolo.' },
    '2.7': { type: 'text', text: 'Sim. Pode enviar fotos, vídeos ou documentos.\nMas não é obrigatório.' },

    // ── Opção 3 — Tipos de denúncia ─────────────────────────────
    '3': {
      type: 'submenu',
      label: 'Tipos de denúncia',
      items: [
        { id: '3.1', label: 'Violência doméstica' },
        { id: '3.2', label: 'Assédio' },
        { id: '3.3', label: 'Abuso' },
        { id: '3.4', label: 'Discriminação' },
        { id: '3.5', label: 'Não sei qual escolher' },
      ]
    },

    '3.1': { type: 'text', text: 'Acontece em relações próximas.\nInclui agressões, ameaças, controle e humilhação.' },
    '3.2': { type: 'text', text: 'Comportamentos insistentes ou constrangedores.\nSe causa desconforto, pode ser assédio.' },
    '3.3': { type: 'text', text: 'Ultrapassa limites e causa dano físico ou emocional.' },
    '3.4': { type: 'text', text: 'Tratamento injusto por raça, gênero, religião, etc.' },
    '3.5': { type: 'text', text: 'Você pode descrever com suas palavras.\nO sistema classifica depois.' },

    // ── Opção 4 — Anonimato e segurança ─────────────────────────
    '4': {
      type: 'submenu',
      label: 'Anonimato e segurança',
      items: [
        { id: '4.1', label: 'Meus dados estão seguros?' },
        { id: '4.2', label: 'Quem pode acessar meus dados?' },
        { id: '4.3', label: 'Posso confiar nesse sistema?' },
        { id: '4.4', label: 'O que acontece com denúncia falsa?' },
      ]
    },

    '4.1': { type: 'text', text: 'Sim. O sistema protege suas informações.' },
    '4.2': { type: 'text', text: 'Apenas equipes autorizadas.' },
    '4.3': { type: 'text', text: 'O sistema foi criado com foco em segurança e privacidade.' },
    '4.4': { type: 'text', text: 'Há análise para identificar padrões suspeitos.' },

    // ── Opção 5 — Acompanhar denúncia ───────────────────────────
    '5': {
      type: 'submenu',
      label: 'Acompanhar denúncia',
      items: [
        { id: '5.1', label: 'Como consultar minha denúncia?' },
        { id: '5.2', label: 'O que significa cada status?' },
        { id: '5.3', label: 'Quanto tempo demora?' },
        { id: '5.4', label: 'Perdi meu protocolo' },
      ]
    },

    '5.1': {
      type: 'text',
      text: 'Acesse a área de consulta e informe o protocolo.',
      action: { label: 'Ver status', fn: () => { Chatbot.close(); navigate('status'); } }
    },
    '5.2': { type: 'text', text: 'Recebida — registrada no sistema.\nEm análise — sendo avaliada.\nEncaminhada — enviada ao órgão responsável.\nConcluída — processo finalizado.' },
    '5.3': { type: 'text', text: 'Depende da complexidade do caso.' },
    '5.4': { type: 'text', text: 'Não é possível recuperar. Guarde com cuidado.' },

    // ── Opção 6 — Emergência ─────────────────────────────────────
    '6': {
      type: 'submenu',
      label: 'Situação de emergência',
      items: [
        { id: '6.1', label: 'Estou em perigo agora' },
        { id: '6.2', label: 'Urgente, mas não imediato' },
        { id: '6.3', label: 'Não sei se é emergência' },
      ]
    },

    '6.1': { type: 'emergency', text: 'Procure ajuda imediata:', numbers: [
      { num: '190', desc: 'Polícia Militar' },
      { num: '192', desc: 'SAMU' },
      { num: '193', desc: 'Corpo de Bombeiros' },
    ]},
    '6.2': { type: 'text', text: 'Registre a denúncia e procure apoio.' },
    '6.3': { type: 'text', text: 'Na dúvida, trate como emergência e ligue para 190.' },

    // ── Opção 7 — Contatos ───────────────────────────────────────
    '7': { type: 'emergency', text: 'Se você precisa de ajuda direta, aqui estão alguns contatos importantes:', numbers: [
      { num: '190', desc: 'Polícia Militar' },
      { num: '192', desc: 'SAMU' },
      { num: '193', desc: 'Bombeiros' },
      { num: '100', desc: 'Disque Direitos Humanos' },
    ]},
  };

  // ── Helpers de DOM ───────────────────────────────────────────

  /** Adiciona mensagem do bot */
  function addBotMsg(html, extraClass = '') {
    const msgs = document.getElementById('chatbot-messages');
    if (!msgs) return;
    const div = document.createElement('div');
    div.className = `chat-msg bot ${extraClass}`;
    div.innerHTML = `
      <div class="msg-avatar"><i class="fa-solid fa-shield-halved"></i></div>
      <div class="msg-bubble">${html}</div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  /** Adiciona mensagem do usuário */
  function addUserMsg(text) {
    const msgs = document.getElementById('chatbot-messages');
    if (!msgs) return;
    const div = document.createElement('div');
    div.className = 'chat-msg user';
    div.innerHTML = `
      <div class="msg-bubble">${text}</div>
      <div class="msg-avatar"><i class="fa-solid fa-user"></i></div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  /** Mostra indicador de digitação e remove após delay */
  function showTyping(delay, callback) {
    const msgs = document.getElementById('chatbot-messages');
    if (!msgs) return;
    const ind = document.createElement('div');
    ind.className = 'typing-indicator';
    ind.id = 'typing-ind';
    ind.innerHTML = `
      <div class="msg-avatar"><i class="fa-solid fa-shield-halved"></i></div>
      <div class="typing-dots"><span></span><span></span><span></span></div>`;
    msgs.appendChild(ind);
    msgs.scrollTop = msgs.scrollHeight;
    setTimeout(() => {
      ind.remove();
      callback();
    }, delay);
  }

  // ── Render de nós da árvore ──────────────────────────────────

  function renderNode(nodeId) {
    const node = TREE[nodeId];
    if (!node) { renderMain(); return; }

    currentMenu = nodeId;

    if (node.type === 'text') {
      _renderText(node);
    } else if (node.type === 'submenu') {
      _renderSubmenu(node, nodeId);
    } else if (node.type === 'emergency') {
      _renderEmergency(node);
    }
  }

  function _renderText(node) {
    let html = node.text.replace(/\n/g, '<br>');
    if (node.action) {
      html += `<div class="chat-options" style="margin-top:10px">
        <button class="chat-opt-btn" onclick="Chatbot.handleAction('${node.action.label}')">${node.action.label}</button>
        <button class="chat-opt-btn" onclick="Chatbot.renderMain()">Menu principal</button>
      </div>`;
    } else {
      html += `<div class="chat-options" style="margin-top:10px">
        <button class="chat-opt-btn" onclick="Chatbot.renderMain()">Menu principal</button>
        <button class="chat-opt-btn" onclick="Chatbot.back()">Voltar</button>
      </div>`;
    }
    showTyping(500, () => addBotMsg(html));
  }

  function _renderSubmenu(node, parentId) {
    const btns = node.items.map(item => `
      <button class="chat-menu-btn" onclick="Chatbot.select('${item.id}', '${item.label}', '${parentId}')">
        <span class="menu-num">${item.id}</span>
        <span>${item.label}</span>
      </button>`).join('');

    const html = `<strong>${node.label}</strong>
      <div class="chat-menu">${btns}</div>
      <div class="chat-options" style="margin-top:8px">
        <button class="chat-opt-btn" onclick="Chatbot.renderMain()">Menu principal</button>
      </div>`;
    showTyping(400, () => addBotMsg(html));
  }

  function _renderEmergency(node) {
    const rows = node.numbers.map(n => `
      <div class="emergency-number-row">
        <span class="emergency-num">${n.num}</span>
        <span class="emergency-desc">${n.desc}</span>
      </div>`).join('');

    const html = `${node.text}
      <div class="chat-emergency-card">
        <div class="emergency-title"><i class="fa-solid fa-triangle-exclamation"></i> Canais de emergência</div>
        ${rows}
      </div>
      <div class="chat-options" style="margin-top:10px">
        <button class="chat-opt-btn" onclick="Chatbot.renderMain()">Menu principal</button>
      </div>`;
    showTyping(400, () => addBotMsg(html));
  }

  // ── API pública ──────────────────────────────────────────────

  function renderMain() {
    currentMenu = 'main';
    const { items } = TREE.main;
    const btns = items.map(item => `
      <button class="chat-menu-btn" onclick="Chatbot.select('${item.id}', '${item.label}', 'main')">
        <span class="menu-num">${item.id}</span>
        <i class="fa-solid ${item.icon}"></i>
        <span>${item.label}</span>
      </button>`).join('');

    const html = `Como posso te ajudar?
      <div class="chat-menu">${btns}</div>`;
    showTyping(300, () => addBotMsg(html));
  }

  function select(id, label, parentId) {
    addUserMsg(label);
    currentMenu = id;
    // Guarda parent para voltar
    select._parent = parentId;
    setTimeout(() => renderNode(id), 200);
  }

  function back() {
    const parent = select._parent || 'main';
    if (parent === 'main') {
      renderMain();
    } else {
      renderNode(parent);
    }
  }

  function handleAction(label) {
    if (label === 'Ir para o formulário') {
      close();
      scrollToSection('formulario');
    } else if (label === 'Ver status') {
      close();
      navigate('status');
    }
  }

  // Input livre do usuário — tenta mapear para item do menu
  function processInput(text) {
    const t = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (/^[1-7]$/.test(t.trim())) {
      const id = t.trim();
      const node = TREE.main.items.find(i => i.id === id);
      if (node) { select(id, node.label, 'main'); return; }
    }

    // Keywords
    if (t.includes('denuncia') || t.includes('formulario') || t.includes('fazer'))     { select('1', 'Quero fazer uma denúncia', 'main'); return; }
    if (t.includes('anonimo') || t.includes('seguranca') || t.includes('seguro'))      { select('4', 'Anonimato e segurança', 'main'); return; }
    if (t.includes('status') || t.includes('protocolo') || t.includes('acompanhar'))   { select('5', 'Acompanhar denúncia', 'main'); return; }
    if (t.includes('emergencia') || t.includes('perigo') || t.includes('urgente'))     { select('6', 'Situação de emergência', 'main'); return; }
    if (t.includes('tipo') || t.includes('violencia') || t.includes('assedio'))        { select('3', 'Tipos de denúncia', 'main'); return; }
    if (t.includes('contato') || t.includes('telefone') || t.includes('190'))          { select('7', 'Contatos', 'main'); return; }

    // Fallback
    showTyping(400, () => addBotMsg(`Não entendi completamente. Veja o menu abaixo para me orientar.
      <div class="chat-options" style="margin-top:8px">
        <button class="chat-opt-btn" onclick="Chatbot.renderMain()">Ver menu</button>
      </div>`));
  }

  function init() {
    const btn   = document.getElementById('chatbot-btn');
    const input = document.getElementById('chat-input');
    const send  = document.querySelector('.chatbot-send');

    if (btn)   btn.addEventListener('click', toggle);
    if (send)  send.addEventListener('click', submitInput);
    if (input) input.addEventListener('keypress', e => { if (e.key === 'Enter') submitInput(); });

    document.getElementById('chat-menu-btn')?.addEventListener('click', renderMain);
    document.getElementById('chat-close-btn')?.addEventListener('click', close);
  }

  function toggle() {
    isOpen ? close() : open();
  }

  function open() {
    isOpen = true;
    const win   = document.getElementById('chatbot-window');
    const badge = document.getElementById('chat-badge');
    if (win)   win.classList.add('open');
    if (badge) badge.style.display = 'none';

    if (!inited) {
      inited = true;
      addBotMsg(TREE.greeting);
      setTimeout(renderMain, 700);
    }
  }

  function close() {
    isOpen = false;
    document.getElementById('chatbot-window')?.classList.remove('open');
  }

  function submitInput() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    addUserMsg(text);
    setTimeout(() => processInput(text), 200);
  }

  return { init, toggle, open, close, renderMain, renderNode, select, back, handleAction, processInput, submitInput };
})();