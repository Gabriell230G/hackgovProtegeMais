/**
 * main.js — Lógica principal do Protege+
 * Navegação entre páginas, formulário, status, dashboard, login.
 * v2.0 — Geolocalização, QR Code, Upload de Áudio, Filtros Avançados
 */

// ── Estado global ────────────────────────────────────────────
let denuncias = JSON.parse(localStorage.getItem('denuncias') || '[]')
  .filter(d => d && d.id && d.status && d.tipo);
let protocolCount = parseInt(localStorage.getItem('protocolCount') || localStorage.getItem('protocolCounter') || '0');
let lastProtocol  = '';

// ════════════════════════════════════════════════════════════
// DARK MODE
// ════════════════════════════════════════════════════════════
function initDarkMode() {
  const saved = localStorage.getItem('darkMode') === 'true';
  if (saved) document.documentElement.setAttribute('data-theme', 'dark');
  _atualizarBtnDark(saved);
}

function toggleDarkMode() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('darkMode', 'false');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('darkMode', 'true');
  }
  _atualizarBtnDark(!isDark);
}

function _atualizarBtnDark(isDark) {
  document.querySelectorAll('.btn-dark-toggle').forEach(btn => {
    btn.innerHTML = isDark
      ? '<i class="fa-solid fa-sun"></i>'
      : '<i class="fa-solid fa-moon"></i>';
    btn.title = isDark ? 'Modo Claro' : 'Modo Escuro';
  });
}

// ── Dados MOCK ───────────────────────────────────────────────
let mockDenuncias = [
  { id: '#2026-00451', tipo: 'violencia',     local: 'São Paulo, SP',       data: '2026-04-20', status: 'recebida',    desc: 'Relato de violência doméstica no bairro Jardim Paulista.',   anonimo: true,  score: 65, scoreLabel: 'medium', scoreTxt: 'Média',  criadoEm: '20/04/2026', endereco: 'Rua Paulista, 100 - Jardim Paulista',
    historico: [{ status: 'recebida', data: '20/04/2026', hora: '14:32' }] },
  { id: '#2026-00452', tipo: 'assedio',       local: 'Rio de Janeiro, RJ',  data: '2026-04-21', status: 'analise',     desc: 'Assédio no ambiente de trabalho relatado pelo denunciante.',  anonimo: false, score: 80, scoreLabel: 'high',   scoreTxt: 'Alta',   criadoEm: '21/04/2026', endereco: 'Av. Rio Branco, 500',
    historico: [{ status: 'recebida', data: '21/04/2026', hora: '09:10' }, { status: 'analise', data: '22/04/2026', hora: '11:45' }] },
  { id: '#2026-00453', tipo: 'abuso',         local: 'Salvador, BA',        data: '2026-04-22', status: 'encaminhada', desc: 'Abuso reportado na comunidade local.',                         anonimo: true,  score: 45, scoreLabel: 'medium', scoreTxt: 'Média',  criadoEm: '22/04/2026', endereco: 'Rua da Bahia, 200',
    historico: [{ status: 'recebida', data: '22/04/2026', hora: '08:05' }, { status: 'analise', data: '23/04/2026', hora: '14:20' }, { status: 'encaminhada', data: '24/04/2026', hora: '16:48' }] },
  { id: '#2026-00454', tipo: 'discriminacao', local: 'Recife, PE',          data: '2026-04-22', status: 'concluida',   desc: 'Discriminação racial em estabelecimento comercial.',            anonimo: false, score: 90, scoreLabel: 'high',   scoreTxt: 'Alta',   criadoEm: '22/04/2026', endereco: 'Av. Boa Viagem, 1200',
    historico: [{ status: 'recebida', data: '22/04/2026', hora: '10:00' }, { status: 'analise', data: '23/04/2026', hora: '09:15' }, { status: 'encaminhada', data: '24/04/2026', hora: '13:30' }, { status: 'concluida', data: '25/04/2026', hora: '11:20' }] },
  { id: '#2026-00455', tipo: 'violencia',     local: 'Belo Horizonte, MG',  data: '2026-04-23', status: 'recebida',    desc: 'Denúncia de violência física em via pública.',                 anonimo: true,  score: 20, scoreLabel: 'low',    scoreTxt: 'Baixa',  criadoEm: '23/04/2026', endereco: 'Rua Goiás, 800',
    historico: [{ status: 'recebida', data: '23/04/2026', hora: '17:55' }] },
];

// ════════════════════════════════════════════════════════════
// COMPARTILHAR PROTOCOLO POR LINK
// ════════════════════════════════════════════════════════════
function compartilharProtocolo(protocolo) {
  // Gera URL com o protocolo na hash
  const url = `${window.location.origin}${window.location.pathname}#status:${encodeURIComponent(protocolo)}`;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => {
      showToast('🔗 Link copiado! Cole no WhatsApp, e-mail ou onde quiser.');
    }).catch(() => _fallbackCopiar(url));
  } else {
    _fallbackCopiar(url);
  }
}

function _fallbackCopiar(texto) {
  const el = document.createElement('textarea');
  el.value = texto;
  el.style.position = 'fixed';
  el.style.opacity  = '0';
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
  showToast('🔗 Link copiado!');
}

// Verifica se tem protocolo na URL ao carregar
function verificarProtocoloURL() {
  const hash = window.location.hash;
  if (hash.startsWith('#status:')) {
    const protocolo = decodeURIComponent(hash.replace('#status:', ''));
    navigate('status');
    setTimeout(() => {
      const input = document.getElementById('protocolo-input');
      if (input) { input.value = protocolo; buscarProtocolo(); }
    }, 200);
  }
}

function getAllDenuncias() {
  return [...denuncias, ...mockDenuncias];
}

function extrairUF(local) {
  if (!local) return 'N/A';
  const partes = local.split(', ');
  const ufRaw  = partes[partes.length - 1];
  return ufRaw.split(' ')[0].trim();
}

// ── Navegação ────────────────────────────────────────────────
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');
  window.scrollTo(0, 0);

  if (page === 'dashboard') {
    ['backlog', 'status-d'].forEach(t => {
      const el = document.getElementById('tab-' + t);
      if (el) el.style.display = 'none';
    });
    const resumo = document.getElementById('tab-resumo');
    if (resumo) resumo.style.display = 'block';
    document.querySelectorAll('.sidebar-item').forEach((s, i) => s.classList.toggle('active', i === 0));
    updateKPIs();
    renderBacklog();
    renderStatusTable();
    setTimeout(initCharts, 150);
  }
}

function scrollToSection(id) {
  navigate('landing');
  setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 100);
}

// ── Formulário ───────────────────────────────────────────────
function selectTipo(tipo, evt) {
  document.querySelectorAll('.tipo-card').forEach(c => c.classList.remove('selected'));
  const card = evt?.currentTarget || document.querySelector(`.tipo-card[onclick*="${tipo}"]`);
  if (card) card.classList.add('selected');
  document.getElementById('f-tipo').value = tipo;
  scrollToSection('formulario');
}

function toggleAnon() {
  const isAnon  = document.getElementById('f-anonimo').checked;
  const section = document.getElementById('contato-section');
  if (section) {
    section.style.opacity       = isAnon ? '0.4' : '1';
    section.style.pointerEvents = isAnon ? 'none' : 'auto';
  }
}

// ════════════════════════════════════════════════════════════
// FUNCIONALIDADE 1 — GEOLOCALIZAÇÃO AUTOMÁTICA
// ════════════════════════════════════════════════════════════
function usarGeolocalizacao() {
  const btn = document.getElementById('btn-geolocalizacao');
  if (!navigator.geolocation) {
    showToast('⚠️ Geolocalização não suportada neste navegador');
    return;
  }

  if (btn) {
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Localizando...';
    btn.disabled = true;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=pt-BR`);
        const data = await res.json();

        const addr    = data.address || {};
        const estado  = addr.state || '';
        const cidade  = addr.city || addr.town || addr.village || '';
        const rua     = addr.road || '';
        const numero  = addr.house_number || '';
        const bairro  = addr.suburb || addr.neighbourhood || '';

        // Mapeia nome do estado para sigla via IBGE
        const ufMap = {
          'Acre':'AC','Alagoas':'AL','Amapá':'AP','Amazonas':'AM','Bahia':'BA',
          'Ceará':'CE','Distrito Federal':'DF','Espírito Santo':'ES','Goiás':'GO',
          'Maranhão':'MA','Mato Grosso':'MT','Mato Grosso do Sul':'MS','Minas Gerais':'MG',
          'Pará':'PA','Paraíba':'PB','Paraná':'PR','Pernambuco':'PE','Piauí':'PI',
          'Rio de Janeiro':'RJ','Rio Grande do Norte':'RN','Rio Grande do Sul':'RS',
          'Rondônia':'RO','Roraima':'RR','Santa Catarina':'SC','São Paulo':'SP',
          'Sergipe':'SE','Tocantins':'TO'
        };

        // Encontra a UF correspondente ao estado retornado
        const ufSigla = Object.keys(ufMap).find(k =>
          estado.toLowerCase().includes(k.toLowerCase())
        );
        const uf = ufSigla ? ufMap[ufSigla] : '';

        // Preenche o select de estado
        const estadoSelect = document.getElementById('f-estado');
        if (estadoSelect && uf) {
          const opt = Array.from(estadoSelect.options).find(o => o.value === uf);
          if (opt) {
            estadoSelect.value = uf;
            // Dispara o evento de change para carregar cidades
            estadoSelect.dispatchEvent(new Event('change'));

            // Aguarda o carregamento das cidades e então seleciona
            if (cidade) {
              setTimeout(() => {
                const cidadeSelect = document.getElementById('f-cidade');
                if (cidadeSelect) {
                  const cidadeOpt = Array.from(cidadeSelect.options)
                    .find(o => o.value.toLowerCase().includes(cidade.toLowerCase()));
                  if (cidadeOpt) cidadeSelect.value = cidadeOpt.value;
                }
              }, 2500);
            }
          }
        }

        // Preenche o endereço
        const enderecoEl = document.getElementById('f-endereco');
        if (enderecoEl) {
          const partes = [rua, numero, bairro].filter(Boolean);
          enderecoEl.value = partes.join(', ');
        }

        showToast('📍 Localização preenchida com sucesso!');
      } catch (err) {
        showToast('⚠️ Não foi possível obter o endereço. Tente preencher manualmente.');
      }

      if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-location-dot"></i> Usar minha localização';
        btn.disabled = false;
      }
    },
    (err) => {
      const msgs = {
        1: 'Permissão de localização negada. Ative nas configurações do navegador.',
        2: 'Posição indisponível. Verifique o GPS do dispositivo.',
        3: 'Tempo esgotado. Tente novamente.',
      };
      showToast('⚠️ ' + (msgs[err.code] || 'Erro ao obter localização.'));
      if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-location-dot"></i> Usar minha localização';
        btn.disabled = false;
      }
    },
    { timeout: 10000, enableHighAccuracy: true }
  );
}

// ════════════════════════════════════════════════════════════
// FUNCIONALIDADE 2 — UPLOAD DE ÁUDIO
// ════════════════════════════════════════════════════════════
let mediaRecorder = null;
let audioChunks   = [];
let audioBlob     = null;
let isRecording   = false;
let recordTimer   = null;
let recordSeconds = 0;

async function toggleGravacao() {
  const btn      = document.getElementById('btn-gravar');
  const statusEl = document.getElementById('audio-status');
  const playerEl = document.getElementById('audio-player');

  if (!isRecording) {
    // Iniciar gravação
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks   = [];

      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorder.onstop = () => {
        audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        if (playerEl) {
          playerEl.src = url;
          playerEl.style.display = 'block';
        }
        stream.getTracks().forEach(t => t.stop());
        showToast('🎙️ Áudio gravado! Será enviado junto com a denúncia.');
      };

      mediaRecorder.start();
      isRecording   = true;
      recordSeconds = 0;

      // Timer visual
      recordTimer = setInterval(() => {
        recordSeconds++;
        const m = String(Math.floor(recordSeconds / 60)).padStart(2, '0');
        const s = String(recordSeconds % 60).padStart(2, '0');
        if (statusEl) statusEl.textContent = `🔴 Gravando: ${m}:${s}`;
        // Limite de 2 minutos
        if (recordSeconds >= 120) toggleGravacao();
      }, 1000);

      if (btn)      btn.innerHTML    = '<i class="fa-solid fa-stop"></i> Parar gravação';
      if (statusEl) statusEl.textContent = '🔴 Gravando: 00:00';

    } catch (err) {
      showToast('⚠️ Permissão de microfone negada ou microfone não encontrado.');
    }

  } else {
    // Parar gravação
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    clearInterval(recordTimer);
    isRecording = false;
    if (btn)      btn.innerHTML    = '<i class="fa-solid fa-microphone"></i> Gravar relato em áudio';
    if (statusEl) statusEl.textContent = '✅ Gravação concluída';
  }
}

function descartarAudio() {
  audioBlob     = null;
  audioChunks   = [];
  isRecording   = false;
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  clearInterval(recordTimer);

  const playerEl = document.getElementById('audio-player');
  const statusEl = document.getElementById('audio-status');
  const btn      = document.getElementById('btn-gravar');

  if (playerEl) { playerEl.src = ''; playerEl.style.display = 'none'; }
  if (statusEl) statusEl.textContent = '';
  if (btn)      btn.innerHTML = '<i class="fa-solid fa-microphone"></i> Gravar relato em áudio';

  showToast('🗑️ Áudio descartado.');
}

// ════════════════════════════════════════════════════════════
// FUNCIONALIDADE 3 — QR CODE DO PROTOCOLO
// ════════════════════════════════════════════════════════════
function gerarQRCode(protocolo) {
  const container = document.getElementById('qrcode-container');
  if (!container) return;

  container.innerHTML = '';

  // Usa a API do QR Server (pública, sem chave)
  const texto  = `Protege+ Protocolo: ${protocolo}`;
  const url    = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(texto)}&color=1A4DA0&bgcolor=FFFFFF&margin=10`;

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'text-align:center;margin-top:16px;';

  const label = document.createElement('p');
  label.textContent = 'QR Code do Protocolo';
  label.style.cssText = 'font-size:13px;color:#64748b;margin-bottom:8px;font-weight:500;';

  const img = document.createElement('img');
  img.src   = url;
  img.alt   = 'QR Code do protocolo ' + protocolo;
  img.style.cssText = 'width:160px;height:160px;border:2px solid #e2e8f0;border-radius:12px;padding:6px;background:#fff;';

  const dica = document.createElement('p');
  dica.textContent = 'Salve esta imagem para consultar o status depois';
  dica.style.cssText = 'font-size:11px;color:#94a3b8;margin-top:8px;';

  const btnSalvar = document.createElement('button');
  btnSalvar.textContent = '💾 Salvar QR Code';
  btnSalvar.style.cssText = 'margin-top:10px;padding:8px 18px;background:#1A4DA0;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;';
  btnSalvar.onclick = () => {
    const a = document.createElement('a');
    a.href     = url;
    a.download = `QRCode_${protocolo.replace('#','')}.png`;
    a.target   = '_blank';
    a.click();
    showToast('📥 Baixando QR Code...');
  };

  wrapper.appendChild(label);
  wrapper.appendChild(img);
  wrapper.appendChild(dica);
  wrapper.appendChild(btnSalvar);
  container.appendChild(wrapper);
}

// ────────────────────────────────────────────────────────────
// Upload de arquivos
// ────────────────────────────────────────────────────────────
let uploadedFiles = [];

// ────────────────────────────────────────────────────────────
// Converte um File ou Blob para Base64
// ────────────────────────────────────────────────────────────
function toBase64(fileOrBlob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result); // "data:image/png;base64,..."
    reader.onerror = reject;
    reader.readAsDataURL(fileOrBlob);
  });
}

// Verifica se o localStorage tem espaço suficiente (~4MB livre)
function localStorageDisponivel(extraKB = 0) {
  try {
    const total = JSON.stringify(localStorage).length;
    return (total + extraKB * 1024) < 4 * 1024 * 1024; // limite conservador de 4MB
  } catch { return false; }
}

function handleFiles(files) {
  uploadedFiles = Array.from(files);
  const list = document.getElementById('file-list');

  // Aviso se arquivo muito grande
  const grandes = uploadedFiles.filter(f => f.size > 1.5 * 1024 * 1024);
  if (grandes.length > 0) {
    showToast('⚠️ Arquivos acima de 1.5MB podem não ser salvos. Use fotos menores para garantir.');
  }

  if (list) list.innerHTML = uploadedFiles.map(f => {
    const icon = f.type.startsWith('image/') ? 'fa-image' :
                 f.type.startsWith('video/') ? 'fa-video' :
                 f.type.startsWith('audio/') ? 'fa-music' : 'fa-file';
    const tam  = f.size > 1024*1024
      ? `${(f.size/1024/1024).toFixed(1)}MB`
      : `${Math.round(f.size/1024)}KB`;
    return `<span style="display:flex;align-items:center;gap:6px;margin:2px 0">
      <i class="fa-solid ${icon}" style="color:var(--blue-light)"></i>
      ${f.name} <span style="color:#94a3b8;font-size:11px">(${tam})</span>
    </span>`;
  }).join('');
}

// ────────────────────────────────────────────────────────────
// Enviar denúncia — com Base64 real dos arquivos
// ────────────────────────────────────────────────────────────
async function enviarDenuncia() {
  const tipo      = document.getElementById('f-tipo')?.value;
  const descricao = document.getElementById('f-descricao')?.value;

  if (!tipo)                               { showToast('Selecione o tipo de denúncia'); return; }
  if (!descricao || descricao.length < 10) { showToast('Descreva melhor o ocorrido'); return; }

  // Botão de loading enquanto converte arquivos
  const btnEnviar = document.querySelector('[onclick="enviarDenuncia()"]');
  if (btnEnviar) { btnEnviar.disabled = true; btnEnviar.innerHTML = '⏳ Processando...'; }

  protocolCount++;
  localStorage.setItem('protocolCount',   protocolCount);
  localStorage.setItem('protocolCounter', protocolCount);

  const id = '#2026-0' + String(protocolCount).padStart(4, '0');
  lastProtocol = id;

  const cidadeEl  = document.getElementById('f-cidade');
  const cidadeVal = cidadeEl?.value || 'Não informado';
  const estadoEl  = document.getElementById('f-estado');
  const estadoRaw = estadoEl?.value || 'N/A';
  const estadoUF  = estadoRaw.split(' ')[0].trim();

  // ── Converte arquivos para Base64 ──────────────────────────
  const anexosSalvos = [];
  for (const file of uploadedFiles) {
    try {
      // Pula arquivos muito grandes (acima de 1.5MB)
      if (file.size > 1.5 * 1024 * 1024) {
        anexosSalvos.push({
          nome: file.name,
          tipo: file.type,
          tamanho: file.size,
          base64: null,
          erro: 'Arquivo muito grande para armazenar localmente'
        });
        continue;
      }
      const base64 = await toBase64(file);
      anexosSalvos.push({
        nome:    file.name,
        tipo:    file.type,
        tamanho: file.size,
        base64,
      });
    } catch (e) {
      console.warn('Erro ao converter arquivo:', file.name, e);
    }
  }

  // ── Converte áudio para Base64 ─────────────────────────────
  let audioSalvo = null;
  if (audioBlob) {
    try {
      if (audioBlob.size <= 2 * 1024 * 1024) { // até 2MB
        const base64Audio = await toBase64(audioBlob);
        audioSalvo = {
          tipo:    audioBlob.type,
          tamanho: audioBlob.size,
          base64:  base64Audio,
          duracao: recordSeconds,
        };
      } else {
        audioSalvo = { tipo: audioBlob.type, tamanho: audioBlob.size, base64: null, erro: 'Áudio muito longo' };
      }
    } catch (e) {
      console.warn('Erro ao converter áudio:', e);
    }
  }

  const denuncia = {
    id,
    tipo,
    local:     `${cidadeVal}, ${estadoUF}`,
    data:      document.getElementById('f-data')?.value || new Date().toISOString().split('T')[0],
    status:    'recebida',
    desc:      descricao,
    anonimo:   document.getElementById('f-anonimo')?.checked || false,
    endereco:  document.getElementById('f-endereco')?.value || '',
    nome:      document.getElementById('f-nome')?.value    || '',
    contato:   document.getElementById('f-contato')?.value || '',
    criadoEm:  new Date().toLocaleDateString('pt-BR'),
    temAnexos: anexosSalvos.length > 0,
    temAudio:  audioSalvo !== null,
    anexos:    anexosSalvos,   // ← arquivos em Base64
    audio:     audioSalvo,     // ← áudio em Base64
    historico: [{
      status: 'recebida',
      data:   new Date().toLocaleDateString('pt-BR'),
      hora:   new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }],
  };

  // Score
  const resultado = typeof ScoreSystem !== 'undefined'
    ? ScoreSystem.calcular({
        tipo: denuncia.tipo, estado: estadoUF, cidade: cidadeVal,
        endereco: denuncia.endereco, data: denuncia.data, descricao: denuncia.desc,
        temAnexos: denuncia.temAnexos || denuncia.temAudio,
        nome: denuncia.nome, contato: denuncia.contato,
      })
    : { score: 0, label: 'low', classificacao: '—' };
  denuncia.score      = resultado.score;
  denuncia.scoreLabel = resultado.label;
  denuncia.scoreTxt   = resultado.classificacao;

  // Tenta salvar — verifica espaço disponível
  try {
    denuncias.push(denuncia);
    localStorage.setItem('denuncias', JSON.stringify(denuncias));
  } catch (e) {
    // localStorage cheio — salva sem os arquivos mas mantém os metadados
    console.warn('localStorage cheio, salvando sem Base64:', e);
    denuncia.anexos = anexosSalvos.map(a => ({ ...a, base64: null, erro: 'Sem espaço no armazenamento' }));
    denuncia.audio  = audioSalvo ? { ...audioSalvo, base64: null, erro: 'Sem espaço no armazenamento' } : null;
    localStorage.setItem('denuncias', JSON.stringify(denuncias));
    showToast('⚠️ Espaço de armazenamento cheio. Metadados salvos, mas arquivos não puderam ser armazenados.');
  }

  // Modal
  document.getElementById('modal-protocol-num').textContent = id;
  const scoreBadgeEl = document.getElementById('modal-score-badge');
  if (scoreBadgeEl && typeof ScoreSystem !== 'undefined') {
    scoreBadgeEl.innerHTML = ScoreSystem.renderBadge(resultado);
  }
  gerarQRCode(id);
  document.getElementById('modal-protocolo').classList.add('active');

  // Reset botão
  if (btnEnviar) { btnEnviar.disabled = false; btnEnviar.innerHTML = '📤 Enviar Denúncia'; }

  // Reset form
  ['f-tipo', 'f-estado', 'f-endereco', 'f-descricao', 'f-nome', 'f-contato', 'f-data'].forEach(fid => {
    const el = document.getElementById(fid);
    if (el) el.value = '';
  });
  if (cidadeEl) {
    if (cidadeEl.tagName === 'SELECT') {
      cidadeEl.innerHTML = '<option value="">Selecione o estado primeiro</option>';
    } else { cidadeEl.value = ''; }
  }
  const anonEl = document.getElementById('f-anonimo');
  if (anonEl) anonEl.checked = false;
  const fileList = document.getElementById('file-list');
  if (fileList) fileList.innerHTML = '';
  uploadedFiles = [];
  descartarAudio();
}

function closeModal() {
  document.getElementById('modal-protocolo')?.classList.remove('active');
}

function acompanharDenuncia() {
  closeModal();
  navigate('status');
  document.getElementById('protocolo-input').value = lastProtocol;
  buscarProtocolo();
}

// ── Status ───────────────────────────────────────────────────
function buscarProtocolo() {
  const input     = document.getElementById('protocolo-input')?.value.trim();
  const container = document.getElementById('status-result');
  if (!container) return;

  if (!input) { container.innerHTML = ''; return; }

  const normalizar = s => (s || '').replace(/^#/, '').trim().toLowerCase();
  const found = getAllDenuncias().find(d => d.id && normalizar(d.id) === normalizar(input));

  if (!found) {
    container.innerHTML = `
      <div style="background:white;border:1.5px solid var(--gray-200);border-radius:var(--radius-xl);padding:48px 40px;text-align:center;box-shadow:var(--shadow)">
        <div style="font-size:56px;margin-bottom:16px">🔎</div>
        <h3 style="color:var(--gray-700);margin-bottom:10px;font-size:20px;font-family:'Sora',sans-serif">Protocolo não identificado</h3>
        <p style="color:var(--gray-500);font-size:14px;line-height:1.7;max-width:420px;margin:0 auto 20px">
          Não foi possível localizar nenhuma denúncia com este número.<br>
          Verifique se o protocolo foi digitado corretamente, incluindo o <strong style="color:var(--blue-dark)">#</strong> no início e os zeros.
        </p>
        <div style="background:var(--gray-50);border:1.5px dashed var(--gray-300);border-radius:10px;padding:12px 24px;display:inline-block;font-size:13px;color:var(--gray-600);margin-bottom:20px">
          Formato correto: <strong style="color:var(--blue-dark);font-size:15px">#2026-00001</strong>
        </div>
        <div style="font-size:12px;color:var(--gray-400)">
          Protocolos de teste: <strong>#2026-00451</strong> · <strong>#2026-00452</strong> · <strong>#2026-00453</strong>
        </div>
      </div>`;
    return;
  }

  const i = typeof I18n !== 'undefined' ? I18n : null;
  const MAP   = { recebida: 0, analise: 1, encaminhada: 2, concluida: 3 };
  const STEPS = [
    { key: 'recebida',    label: i ? i.t('status.rec') : 'Recebida',    icon: '📩' },
    { key: 'analise',     label: i ? i.t('status.ana') : 'Em Análise',  icon: '🔍' },
    { key: 'encaminhada', label: i ? i.t('status.enc') : 'Encaminhada', icon: '📤' },
    { key: 'concluida',   label: i ? i.t('status.con') : 'Concluída',   icon: '✅' },
  ];
  const cur = MAP[found.status] ?? 0;
  const TIPO_LABELS = { violencia: 'Violência Doméstica', assedio: 'Assédio', abuso: 'Abuso', discriminacao: 'Discriminação', outros: 'Outras Ocorrências' };

  // Busca data de cada step no histórico se disponível
  function dataStep(key) {
    if (!found.historico) return null;
    const entry = found.historico.find(h => h.status === key);
    return entry ? `${entry.data} ${entry.hora}` : null;
  }

  const stepsHTML = STEPS.map((s, idx) => {
    const cls    = idx < cur ? 'done' : idx === cur ? 'active' : '';
    const dataSt = dataStep(s.key);
    const sub    = dataSt
      ? dataSt
      : idx < cur ? (i ? i.t('status.conc_sub') : 'Concluído')
      : idx === cur ? (i ? i.t('status.and_sub') : 'Em andamento')
      : (i ? i.t('status.pend_sub') : 'Pendente');
    return `<div class="status-step ${cls}">
      <div class="status-step-icon">${idx <= cur ? s.icon : '○'}</div>
      <div class="status-step-label">${s.label}</div>
      <div class="status-step-date">${sub}</div>
    </div>`;
  }).join('');

  // ── TIMELINE DO HISTÓRICO ──────────────────────────────────
  const STATUS_META = {
    recebida:    { icon: '📩', cor: '#2563EB', label: 'Denúncia Recebida' },
    analise:     { icon: '🔍', cor: '#D97706', label: 'Em Análise' },
    encaminhada: { icon: '📤', cor: '#7C3AED', label: 'Encaminhada ao Órgão' },
    concluida:   { icon: '✅', cor: '#16A34A', label: 'Processo Concluído' },
  };

  let timelineHTML = '';
  if (found.historico && found.historico.length > 0) {
    const itens = found.historico.map((h, i) => {
      const meta   = STATUS_META[h.status] || { icon: '📋', cor: '#64748b', label: h.status };
      const ultimo = i === found.historico.length - 1;
      return `
        <div style="display:flex;gap:14px;align-items:flex-start;position:relative;">
          <!-- Linha vertical conectora -->
          ${!ultimo ? `<div style="position:absolute;left:19px;top:38px;width:2px;height:calc(100% - 10px);background:linear-gradient(${meta.cor},#e2e8f0);"></div>` : ''}
          <!-- Ícone -->
          <div style="width:38px;height:38px;border-radius:50%;background:${meta.cor};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;box-shadow:0 2px 8px ${meta.cor}44;">
            ${meta.icon}
          </div>
          <!-- Conteúdo -->
          <div style="flex:1;padding-bottom:20px;">
            <div style="font-size:14px;font-weight:700;color:#1e293b;">${meta.label}</div>
            <div style="font-size:12px;color:#64748b;margin-top:2px;">
              📅 ${h.data} às ${h.hora}
            </div>
          </div>
        </div>`;
    }).join('');

    timelineHTML = `
      <div style="margin-top:20px;">
        <h4 style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:16px;display:flex;align-items:center;gap:8px;">
          <span>🕐</span> Histórico de Atualizações
        </h4>
        <div style="padding:4px 0;">${itens}</div>
      </div>`;
  }

  // ── NOTIFICAÇÕES ───────────────────────────────────────────
  const notifs = [
    `<div class="notification-item"><div class="notification-dot"></div><span>${found.criadoEm || found.data} — Denúncia recebida no sistema</span></div>`,
    cur >= 1 ? `<div class="notification-item"><div class="notification-dot"></div><span>Em análise pelo responsável</span></div>` : '',
    cur >= 2 ? `<div class="notification-item"><div class="notification-dot"></div><span>Encaminhada ao órgão competente</span></div>` : '',
    cur >= 3 ? `<div class="notification-item"><div class="notification-dot" style="background:var(--green)"></div><span>Processo concluído</span></div>` : '',
  ].join('');

  container.innerHTML = `
    <div class="denuncia-card">
      <div class="denuncia-header">
        <div>
          <h2>Acompanhe sua Denúncia</h2>
          <div class="protocol-id">${found.id}</div>
        </div>
        <!-- BOTÃO COMPARTILHAR -->
        <button onclick="compartilharProtocolo('${found.id}')"
          style="display:flex;align-items:center;gap:8px;padding:10px 18px;background:#f0f7ff;color:#1A4DA0;border:1.5px solid #1A4DA0;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap;transition:all .2s;"
          onmouseover="this.style.background='#1A4DA0';this.style.color='white'"
          onmouseout="this.style.background='#f0f7ff';this.style.color='#1A4DA0'">
          <i class="fa-solid fa-share-nodes"></i> Compartilhar
        </button>
      </div>
      <div class="denuncia-meta">
        <div class="meta-item"><span>Tipo:</span><strong>${TIPO_LABELS[found.tipo] || found.tipo}</strong></div>
        <div class="meta-item"><span>Data:</span><strong>${found.data}</strong></div>
        <div class="meta-item"><span>📍 Local:</span><strong>${found.local}</strong></div>
      </div>
      <div class="status-tracker">${stepsHTML}</div>
      <div class="denuncia-details">
        <div class="detail-section">
          <h4>Detalhes da Denúncia</h4>
          <div class="detail-row"><strong>Descrição:</strong> <span>${found.desc}</span></div>
          <div class="detail-row"><strong>Endereço:</strong> <span>${found.endereco || '—'}</span></div>
          <div class="detail-row"><strong>Anônima:</strong> <span>${found.anonimo ? 'Sim' : 'Não'}</span></div>
          ${_renderAnexos(found)}
        </div>
        <div class="detail-section">
          ${timelineHTML ||
            `<h4>Histórico de Atualizações</h4>
            <div class="notification-item"><div class="notification-dot"></div><span>${found.criadoEm || found.data} — Denúncia recebida no sistema</span></div>
            ${cur >= 1 ? '<div class="notification-item"><div class="notification-dot"></div><span>Em análise pelo responsável</span></div>' : ''}
            ${cur >= 2 ? '<div class="notification-item"><div class="notification-dot"></div><span>Encaminhada ao órgão competente</span></div>' : ''}
            ${cur >= 3 ? '<div class="notification-item"><div class="notification-dot" style="background:var(--green)"></div><span>Processo concluído</span></div>' : ''}`
          }
          <div style="margin-top:12px;padding:12px;background:var(--gray-50);border-radius:8px;font-size:13px;color:var(--gray-500)">
            💬 Se precisarmos de mais informações entraremos em contato por esse canal.
          </div>
        </div>
      </div>
    </div>`;
}

// ── Renderiza anexos reais (Base64) na página de status ──────
function _renderAnexos(denuncia) {
  const partes = [];

  // Arquivos
  if (denuncia.anexos && denuncia.anexos.length > 0) {
    const itens = denuncia.anexos.map(a => {
      if (a.base64 && a.tipo?.startsWith('image/')) {
        // Imagem — mostra preview clicável
        return `<div style="display:inline-block;margin:4px;">
          <a href="${a.base64}" target="_blank" title="${a.nome}">
            <img src="${a.base64}" alt="${a.nome}"
              style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:2px solid #e2e8f0;cursor:pointer;"
              onmouseover="this.style.borderColor='#1A4DA0'"
              onmouseout="this.style.borderColor='#e2e8f0'">
          </a>
          <div style="font-size:10px;color:#94a3b8;text-align:center;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${a.nome}</div>
        </div>`;
      } else if (a.base64) {
        // Outros arquivos — link de download
        const tam = a.tamanho > 1024*1024
          ? `${(a.tamanho/1024/1024).toFixed(1)}MB`
          : `${Math.round(a.tamanho/1024)}KB`;
        return `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f8faff;border:1.5px solid #e2e8f0;border-radius:8px;margin:4px 0;">
          <i class="fa-solid fa-file" style="color:#1A4DA0;"></i>
          <span style="font-size:13px;color:#1e293b;">${a.nome}</span>
          <span style="font-size:11px;color:#94a3b8;">(${tam})</span>
          <a href="${a.base64}" download="${a.nome}"
            style="margin-left:auto;padding:4px 10px;background:#1A4DA0;color:white;border-radius:6px;font-size:11px;text-decoration:none;font-weight:600;">
            ⬇️ Baixar
          </a>
        </div>`;
      } else {
        // Arquivo sem Base64 (muito grande)
        return `<div style="font-size:12px;color:#94a3b8;padding:4px 0;">
          📎 ${a.nome} <span style="color:#f59e0b;">(${a.erro || 'não armazenado'})</span>
        </div>`;
      }
    }).join('');

    partes.push(`<div class="detail-row">
      <strong>📎 Anexos (${denuncia.anexos.length}):</strong>
      <div style="margin-top:8px;">${itens}</div>
    </div>`);
  }

  // Áudio
  if (denuncia.audio) {
    if (denuncia.audio.base64) {
      const dur = denuncia.audio.duracao
        ? `${Math.floor(denuncia.audio.duracao/60)}:${String(denuncia.audio.duracao%60).padStart(2,'0')}`
        : '—';
      partes.push(`<div class="detail-row">
        <strong>🎙️ Relato em Áudio (${dur}):</strong>
        <audio controls src="${denuncia.audio.base64}"
          style="width:100%;margin-top:8px;border-radius:8px;"></audio>
      </div>`);
    } else {
      partes.push(`<div class="detail-row">
        <strong>🎙️ Áudio:</strong>
        <span style="color:#f59e0b;">${denuncia.audio.erro || 'Não armazenado'}</span>
      </div>`);
    }
  }

  return partes.join('');
}

// ── Login ────────────────────────────────────────────────────
function fazerLogin() {
  const user = document.getElementById('login-user')?.value;
  const pass = document.getElementById('login-pass')?.value;
  const err  = document.getElementById('login-error');
  if (user === 'admin' && pass === 'admin123') {
    if (err) err.style.display = 'none';
    navigate('dashboard');
  } else {
    if (err) err.style.display = 'block';
  }
}

function fazerLogout() {
  navigate('landing');
  if (document.getElementById('login-user')) document.getElementById('login-user').value = '';
  if (document.getElementById('login-pass')) document.getElementById('login-pass').value = '';
}

// ── Dashboard ────────────────────────────────────────────────
function showDashTab(tab, el) {
  ['resumo', 'backlog', 'status-d'].forEach(t => {
    const tabEl = document.getElementById('tab-' + t);
    if (tabEl) tabEl.style.display = 'none';
  });
  const target = document.getElementById('tab-' + tab);
  if (target) target.style.display = 'block';

  document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('active'));
  if (el) el.classList.add('active');

  if (tab === 'resumo')   { updateKPIs(); setTimeout(initCharts, 50); }
  if (tab === 'backlog')  { renderBacklog(); }
  if (tab === 'status-d') { renderStatusTable(); }
}

function updateKPIs() {
  const all = getAllDenuncias();
  const g   = id => document.getElementById(id);
  if (g('kpi-total')) g('kpi-total').textContent = all.length;
  if (g('kpi-prior')) g('kpi-prior').textContent = all.filter(d => d.tipo === 'abuso' || d.tipo === 'violencia').length;
  if (g('kpi-and'))   g('kpi-and').textContent   = all.filter(d => d.status === 'recebida' || d.status === 'analise').length;
}

function initCharts() {
  if (typeof Chart === 'undefined') return;
  const all = getAllDenuncias();

  const tipos = { violencia: 0, assedio: 0, abuso: 0, discriminacao: 0, outros: 0 };
  all.forEach(d => { if (tipos[d.tipo] !== undefined) tipos[d.tipo]++; else tipos.outros++; });

  _createChart('chart-tipos', 'bar', {
    labels: ['Violência Dom.', 'Assédio', 'Abuso', 'Discriminação', 'Outros'],
    datasets: [{ data: Object.values(tipos), backgroundColor: ['#1A4DA0','#DC2626','#F5A623','#7C3AED','#16A34A'], borderRadius: 6, borderSkipped: false }]
  });

  const estadoCount = {};
  all.forEach(d => {
    const uf = extrairUF(d.local);
    estadoCount[uf] = (estadoCount[uf] || 0) + 1;
  });
  const topEstados = Object.entries(estadoCount)
    .filter(([uf]) => uf !== 'N/A' && uf.length <= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // ── Mapa SVG interativo do Brasil ─────────────────────────
  _renderMapaBrasil(estadoCount);

  const MESES       = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const mensalCount = new Array(12).fill(0);
  all.forEach(d => {
    if (d.data) {
      const m = new Date(d.data + 'T00:00:00').getMonth();
      if (!isNaN(m)) mensalCount[m]++;
    }
  });
  const hoje     = new Date();
  const ultimos6 = Array.from({ length: 6 }, (_, i) => (hoje.getMonth() - 5 + i + 12) % 12);
  _createChart('chart-mensal', 'line', {
    labels:   ultimos6.map(m => MESES[m]),
    datasets: [{ label: 'Denúncias', data: ultimos6.map(m => mensalCount[m]), borderColor: '#2563EB', backgroundColor: 'rgba(37,99,235,.1)', tension: .4, fill: true, pointBackgroundColor: '#2563EB', pointRadius: 4 }]
  });

  const st = { recebida: 0, analise: 0, encaminhada: 0, concluida: 0 };
  all.forEach(d => { if (st[d.status] !== undefined) st[d.status]++; });
  _createChart('chart-status', 'doughnut', {
    labels:   ['Recebida', 'Em Análise', 'Encaminhada', 'Concluída'],
    datasets: [{ data: Object.values(st), backgroundColor: ['#2563EB','#F5A623','#7C3AED','#16A34A'], borderWidth: 0 }]
  });
}

// ════════════════════════════════════════════════════════════
// MAPA INTERATIVO DO BRASIL
// ════════════════════════════════════════════════════════════
function _renderMapaBrasil(estadoCount) {
  const container = document.getElementById('chart-estados');
  if (!container) return;

  const max    = Math.max(...Object.values(estadoCount), 1);
  const parent = container.parentElement;

  // Cores por intensidade
  function cor(uf) {
    const v = estadoCount[uf] || 0;
    if (v === 0) return '#e2e8f0';
    const t = v / max;
    if (t < 0.25) return '#bfdbfe';
    if (t < 0.5)  return '#60a5fa';
    if (t < 0.75) return '#2563eb';
    return '#1e3a8a';
  }

  // Paths simplificados dos estados brasileiros (coordenadas SVG)
  const estados = {
    AC: { path: 'M 60 260 L 100 245 L 120 255 L 115 275 L 75 280 Z', cx: 88, cy: 263 },
    AM: { path: 'M 100 170 L 200 155 L 220 175 L 210 230 L 185 245 L 120 255 L 100 245 L 95 210 Z', cx: 157, cy: 205 },
    RR: { path: 'M 155 100 L 205 90 L 215 130 L 195 155 L 165 160 L 148 135 Z', cx: 182, cy: 128 },
    PA: { path: 'M 200 155 L 300 140 L 330 170 L 310 215 L 270 230 L 220 230 L 210 200 Z', cx: 262, cy: 188 },
    AP: { path: 'M 295 100 L 330 95 L 338 130 L 310 140 L 295 125 Z', cx: 316, cy: 117 },
    TO: { path: 'M 300 215 L 340 200 L 355 240 L 340 280 L 300 285 L 285 255 Z', cx: 320, cy: 248 },
    MA: { path: 'M 310 155 L 370 145 L 385 175 L 360 205 L 330 210 L 310 190 Z', cx: 347, cy: 178 },
    PI: { path: 'M 370 155 L 410 150 L 420 185 L 400 210 L 370 205 L 360 180 Z', cx: 390, cy: 180 },
    CE: { path: 'M 410 140 L 450 138 L 458 165 L 430 180 L 408 175 Z', cx: 433, cy: 160 },
    RN: { path: 'M 452 138 L 485 140 L 488 158 L 460 162 L 450 150 Z', cx: 469, cy: 149 },
    PB: { path: 'M 455 162 L 490 158 L 495 175 L 465 178 L 452 170 Z', cx: 473, cy: 169 },
    PE: { path: 'M 400 178 L 495 175 L 498 193 L 415 198 L 400 190 Z', cx: 448, cy: 186 },
    AL: { path: 'M 465 195 L 498 193 L 500 210 L 468 212 Z', cx: 483, cy: 202 },
    SE: { path: 'M 455 210 L 480 208 L 482 225 L 456 226 Z', cx: 468, cy: 217 },
    BA: { path: 'M 360 205 L 455 195 L 465 260 L 420 310 L 365 305 L 340 265 Z', cx: 405, cy: 255 },
    MG: { path: 'M 330 285 L 420 275 L 430 330 L 390 370 L 335 360 L 315 325 Z', cx: 372, cy: 325 },
    ES: { path: 'M 422 295 L 450 290 L 455 330 L 428 335 Z', cx: 438, cy: 313 },
    RJ: { path: 'M 385 355 L 435 345 L 440 370 L 390 375 Z', cx: 413, cy: 362 },
    SP: { path: 'M 295 320 L 385 310 L 395 360 L 340 375 L 285 358 Z', cx: 340, cy: 343 },
    PR: { path: 'M 275 360 L 355 350 L 360 390 L 295 400 L 268 385 Z', cx: 314, cy: 375 },
    SC: { path: 'M 278 398 L 360 388 L 362 412 L 282 420 Z', cx: 320, cy: 405 },
    RS: { path: 'M 265 418 L 355 410 L 360 455 L 300 470 L 255 450 Z', cx: 307, cy: 440 },
    MS: { path: 'M 225 295 L 300 285 L 310 340 L 270 360 L 215 345 Z', cx: 262, cy: 322 },
    MT: { path: 'M 185 220 L 290 210 L 305 270 L 240 290 L 175 270 Z', cx: 240, cy: 250 },
    GO: { path: 'M 290 255 L 350 248 L 360 300 L 305 315 L 275 298 Z', cx: 318, cy: 282 },
    DF: { path: 'M 325 278 L 342 276 L 344 290 L 326 292 Z', cx: 335, cy: 284 },
    RO: { path: 'M 125 230 L 185 220 L 190 265 L 155 275 L 122 260 Z', cx: 157, cy: 248 },
    AC2: null,
  };
  delete estados.AC2;

  // Tooltip
  let tooltipEl = document.getElementById('mapa-tooltip');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'mapa-tooltip';
    tooltipEl.style.cssText = 'position:fixed;background:#1e293b;color:white;padding:8px 14px;border-radius:8px;font-size:13px;pointer-events:none;z-index:9999;display:none;font-family:inherit;box-shadow:0 4px 20px rgba(0,0,0,.3);';
    document.body.appendChild(tooltipEl);
  }

  const svgPaths = Object.entries(estados).map(([uf, info]) => {
    if (!info) return '';
    const qtd   = estadoCount[uf] || 0;
    const fill  = cor(uf);
    const title = `${uf}: ${qtd} denúncia${qtd !== 1 ? 's' : ''}`;
    return `<path d="${info.path}" fill="${fill}" stroke="white" stroke-width="1.5"
      style="cursor:pointer;transition:all .2s;"
      data-uf="${uf}" data-qtd="${qtd}"
      onmouseover="document.getElementById('mapa-tooltip').style.display='block';document.getElementById('mapa-tooltip').innerHTML='<strong>${uf}</strong>: ${qtd} denúncia${qtd !== 1 ? 's' : ''}';"
      onmousemove="var t=document.getElementById('mapa-tooltip');t.style.left=(event.clientX+14)+'px';t.style.top=(event.clientY-10)+'px';"
      onmouseleave="document.getElementById('mapa-tooltip').style.display='none';"
      onclick="filtrarPorEstado('${uf}')"
    />
    <text x="${info.cx}" y="${info.cy}" font-size="8"
      fill="${fill === '#e2e8f0' || fill === '#bfdbfe' ? '#475569' : 'white'}"
      text-anchor="middle" font-weight="600"
      style="pointer-events:none;">${uf}</text>`;
  }).join('');

  // Escala de cores
  const escala = `
    <text x="10" y="485" font-size="10" fill="#64748b">Sem dados</text>
    <rect x="75" y="475" width="16" height="12" fill="#e2e8f0" rx="2"/>
    <rect x="93" y="475" width="16" height="12" fill="#bfdbfe" rx="2"/>
    <rect x="111" y="475" width="16" height="12" fill="#60a5fa" rx="2"/>
    <rect x="129" y="475" width="16" height="12" fill="#2563eb" rx="2"/>
    <rect x="147" y="475" width="16" height="12" fill="#1e3a8a" rx="2"/>
    <text x="167" y="485" font-size="10" fill="#64748b">Muitas</text>`;

  parent.style.position = 'relative';
  parent.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <h3 style="margin:0;font-size:15px;color:#1e293b;">Ocorrências por Estado</h3>
      <span style="font-size:11px;color:#94a3b8;">Clique no estado para filtrar</span>
    </div>
    <svg viewBox="0 0 540 500" style="width:100%;max-height:340px;" xmlns="http://www.w3.org/2000/svg">
      ${svgPaths}
      ${escala}
    </svg>`;
}

// Filtra backlog pelo estado clicado no mapa
function filtrarPorEstado(uf) {
  showDashTab('backlog', document.querySelector('.sidebar-item:nth-child(2)'));
  setTimeout(() => {
    const filtroUF = document.getElementById('filtro-uf');
    if (filtroUF) {
      filtroUF.value = uf;
      aplicarFiltrosAvancados();
      showToast(`🗺️ Filtrando denúncias de ${uf}`);
    }
  }, 100);
}

function _createChart(id, type, data) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();
  const isDonut = type === 'doughnut';
  new Chart(canvas, {
    type, data,
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: isDonut, position: 'bottom', labels: { padding: 12, font: { size: 11 } } } },
      scales: isDonut ? {} : {
        y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f1f5f9' } },
        x: { grid: { display: false } }
      }
    }
  });
}

// ════════════════════════════════════════════════════════════
// FUNCIONALIDADE 4 — FILTROS AVANÇADOS DO BACKLOG
// ════════════════════════════════════════════════════════════
function aplicarFiltrosAvancados() {
  const filtroTipo   = document.getElementById('filtro-tipo')?.value   || 'all';
  const filtroStatus = document.getElementById('filtro-status')?.value || 'all';
  const filtroScore  = document.getElementById('filtro-score')?.value  || 'all';
  const filtroData1  = document.getElementById('filtro-data1')?.value  || '';
  const filtroData2  = document.getElementById('filtro-data2')?.value  || '';
  // filtro-uf agora é um select — o value já é a sigla (ex: "SP")
  const filtroUF     = document.getElementById('filtro-uf')?.value     || '';

  renderBacklog('all', { tipo: filtroTipo, status: filtroStatus, score: filtroScore, data1: filtroData1, data2: filtroData2, uf: filtroUF });
}

function limparFiltros() {
  ['filtro-tipo','filtro-status','filtro-score','filtro-data1','filtro-data2','filtro-uf'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  renderBacklog();
}

// ── Backlog ───────────────────────────────────────────────────
function renderBacklog(filter = 'all', filtrosAvancados = null) {
  let all = getAllDenuncias();

  const TIPO_LABELS   = { violencia: 'Violência Dom.', assedio: 'Assédio', abuso: 'Abuso', discriminacao: 'Discriminação', outros: 'Outros' };
  const STATUS_BADGES = {
    recebida:    '<span class="badge badge-blue"><i class="fa-solid fa-envelope"></i> Recebida</span>',
    analise:     '<span class="badge badge-yellow"><i class="fa-solid fa-magnifying-glass"></i> Em Análise</span>',
    encaminhada: '<span class="badge badge-purple"><i class="fa-solid fa-paper-plane"></i> Encaminhada</span>',
    concluida:   '<span class="badge badge-green"><i class="fa-solid fa-circle-check"></i> Concluída</span>',
  };

  const tbody = document.getElementById('backlog-tbody');
  if (!tbody) return;

  let valid = all.filter(d => d && d.id && d.status && d.tipo);

  // Filtro simples (botões)
  if (filter !== 'all') valid = valid.filter(d => d.tipo === filter);

  // Filtros avançados
  if (filtrosAvancados) {
    const { tipo, status, score, data1, data2, uf } = filtrosAvancados;

    if (tipo   && tipo   !== 'all') valid = valid.filter(d => d.tipo === tipo);
    if (status && status !== 'all') valid = valid.filter(d => d.status === status);
    if (uf)                         valid = valid.filter(d => extrairUF(d.local) === uf.toUpperCase());

    if (score && score !== 'all') {
      valid = valid.filter(d => {
        if (score === 'high')   return (d.score ?? 0) > 70;
        if (score === 'medium') return (d.score ?? 0) > 30 && (d.score ?? 0) <= 70;
        if (score === 'low')    return (d.score ?? 0) <= 30;
        return true;
      });
    }

    if (data1) valid = valid.filter(d => d.data && d.data >= data1);
    if (data2) valid = valid.filter(d => d.data && d.data <= data2);
  }

  // Contador de resultados
  const contador = document.getElementById('backlog-contador');
  if (contador) contador.textContent = `${valid.length} denúncia${valid.length !== 1 ? 's' : ''} encontrada${valid.length !== 1 ? 's' : ''}`;

  if (valid.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--gray-400)">Nenhuma denúncia encontrada com os filtros aplicados.</td></tr>`;
    return;
  }

  tbody.innerHTML = valid.map(d => {
    // Ícones de anexos
    const icones = [];
    if (d.temAnexos && d.anexos?.length > 0) {
      const fotos = d.anexos.filter(a => a.tipo?.startsWith('image/')).length;
      const docs  = d.anexos.filter(a => !a.tipo?.startsWith('image/') && !a.tipo?.startsWith('audio/')).length;
      if (fotos > 0) icones.push(`<span title="${fotos} foto(s)">📷${fotos > 1 ? ` ${fotos}` : ''}</span>`);
      if (docs  > 0) icones.push(`<span title="${docs} documento(s)">📎${docs  > 1 ? ` ${docs}`  : ''}</span>`);
    }
    if (d.temAudio) icones.push(`<span title="Áudio gravado">🎙️</span>`);
    const iconesHTML = icones.length > 0
      ? `<div style="display:flex;gap:4px;font-size:13px;margin-top:2px">${icones.join('')}</div>`
      : '';

    return `
    <tr data-tipo="${d.tipo}">
      <td><strong>${d.id}</strong>${iconesHTML}</td>
      <td>${TIPO_LABELS[d.tipo] || d.tipo}</td>
      <td>${d.local}</td>
      <td>${d.data}</td>
      <td>${STATUS_BADGES[d.status] || d.status}</td>
      <td>${typeof ScoreSystem !== 'undefined' ? ScoreSystem.renderBadge({ score: d.score ?? 0, classificacao: d.scoreTxt || d.scoreLabel || '—', label: d.scoreLabel || 'low' }) : ''}</td>
      <td><button class="btn btn-primary btn-sm" onclick="verDetalhes('${d.id}')"><i class="fa-solid fa-eye"></i></button></td>
    </tr>`;
  }).join('');
}

function verDetalhes(id) {
  navigate('status');
  document.getElementById('protocolo-input').value = id;
  buscarProtocolo();
}

function filterTable(filter, el) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  // Limpa filtros avançados ao usar filtros simples
  limparFiltros();
  renderBacklog(filter);
}

// ── Atualizar Status ──────────────────────────────────────────
function renderStatusTable() {
  const all        = getAllDenuncias();
  const OPTS       = ['recebida', 'analise', 'encaminhada', 'concluida'];
  const OPT_LABELS = { recebida: 'Recebida', analise: 'Em Análise', encaminhada: 'Encaminhada', concluida: 'Concluída' };
  const STATUS_COLORS = { recebida: '#2563EB', analise: '#D97706', encaminhada: '#7C3AED', concluida: '#16A34A' };
  const tbody = document.getElementById('status-tbody');
  if (!tbody) return;

  tbody.innerHTML = all.filter(d => d.id && d.status && d.tipo).map(d => {
    const key   = d.id.replace(/[^a-zA-Z0-9]/g, '');
    const color = STATUS_COLORS[d.status] || '#64748B';
    return `<tr id="row-${key}">
      <td><strong>${d.id}</strong></td>
      <td>${d.tipo}</td>
      <td><span style="color:${color};font-weight:600">${OPT_LABELS[d.status] || d.status}</span></td>
      <td>
        <select id="ns-${key}" style="padding:6px 10px;font-size:12px;border-radius:6px;border:1.5px solid var(--gray-200);font-family:'DM Sans',sans-serif;cursor:pointer">
          ${OPTS.map(s => `<option value="${s}" ${s === d.status ? 'selected' : ''}>${OPT_LABELS[s]}</option>`).join('')}
        </select>
      </td>
      <td><button class="btn btn-primary btn-sm" onclick="atualizarStatus('${d.id}','${key}')">💾 Salvar</button></td>
    </tr>`;
  }).join('');
}

function atualizarStatus(id, key) {
  const sel = document.getElementById('ns-' + key);
  if (!sel) { showToast('Erro ao localizar campo'); return; }
  const newStatus = sel.value;
  const OPT_LABELS    = { recebida: 'Recebida', analise: 'Em Análise', encaminhada: 'Encaminhada', concluida: 'Concluída' };
  const STATUS_COLORS = { recebida: '#2563EB', analise: '#D97706', encaminhada: '#7C3AED', concluida: '#16A34A' };

  const agora = new Date();
  const entrada = {
    status: newStatus,
    data:   agora.toLocaleDateString('pt-BR'),
    hora:   agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  };

  // Atualiza denúncias reais (localStorage)
  const idxReal = denuncias.findIndex(d => d.id === id);
  if (idxReal >= 0) {
    denuncias[idxReal].status = newStatus;
    if (!denuncias[idxReal].historico) denuncias[idxReal].historico = [];
    denuncias[idxReal].historico.push(entrada);
    localStorage.setItem('denuncias', JSON.stringify(denuncias));
  }

  // Atualiza dados mock
  const idxMock = mockDenuncias.findIndex(d => d.id === id);
  if (idxMock >= 0) {
    mockDenuncias[idxMock].status = newStatus;
    if (!mockDenuncias[idxMock].historico) mockDenuncias[idxMock].historico = [];
    mockDenuncias[idxMock].historico.push(entrada);
  }

  const row = document.getElementById('row-' + key);
  if (row) {
    const cell = row.cells[2];
    if (cell) cell.innerHTML = `<span style="color:${STATUS_COLORS[newStatus]};font-weight:600">${OPT_LABELS[newStatus]}</span>`;
  }

  showToast('✅ Status de ' + id + ' → ' + OPT_LABELS[newStatus]);
  renderBacklog();
  updateKPIs();
}

// ── Toast ────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerHTML = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Dark mode
  initDarkMode();

  // Verifica protocolo na URL (link compartilhado)
  verificarProtocoloURL();

  const dateEl = document.getElementById('f-data');
  if (dateEl) dateEl.valueAsDate = new Date();

  if (typeof IbgeAPI !== 'undefined') {
    IbgeAPI.carregarEstados('f-estado');
    document.getElementById('f-estado')?.addEventListener('change', e => {
      IbgeAPI.carregarCidades(e.target.value, 'f-cidade');
    });
    // Carrega estados também no filtro do backlog
    IbgeAPI.carregarEstadosSelect('filtro-uf');
  }

  if (typeof Chatbot  !== 'undefined') Chatbot.init();
  if (typeof FAQ      !== 'undefined') FAQ.init();
  if (typeof SafeMode !== 'undefined') SafeMode.init();

  document.getElementById('login-user')?.addEventListener('keypress',     e => { if (e.key === 'Enter') fazerLogin(); });
  document.getElementById('login-pass')?.addEventListener('keypress',     e => { if (e.key === 'Enter') fazerLogin(); });
  document.getElementById('protocolo-input')?.addEventListener('keypress',e => { if (e.key === 'Enter') buscarProtocolo(); });
});