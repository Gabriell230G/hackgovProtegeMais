/**
 * evidencias.js — anexos de uma denúncia, no painel do servidor (US28–US30).
 *
 * A lista mostra apenas METADADO: nome, tipo confirmado pela assinatura do
 * arquivo, tamanho e o hash SHA-256 do conteúdo recebido. O binário só sai
 * pelo botão de baixar, um arquivo por vez — e cada download gera registro
 * na trilha de auditoria.
 *
 * Trazer os arquivos junto da listagem seria mais cômodo e destruiria a
 * auditoria: abrir a tela baixaria tudo de uma vez, sem que uma única
 * leitura ficasse registrada. É a mesma razão pela qual o relato não vem na
 * listagem de denúncias.
 *
 * O hash é exibido de propósito. Ele é o que permite a quem investiga
 * afirmar que o arquivo em mãos é o mesmo que o cidadão enviou — e o
 * servidor o reconfere a cada download, recusando a entrega se o arquivo
 * tiver sido trocado no disco.
 */
const Evidencias = (() => {

  function T(chave, padrao) {
    return (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(chave) : padrao;
  }

  const ICONE = {
    'image/jpeg': '🖼️', 'image/png': '🖼️', 'image/webp': '🖼️',
    'application/pdf': '📄',
    'audio/mpeg': '🎵', 'audio/ogg': '🎵', 'audio/webm': '🎵',
    'video/mp4': '🎬',
  };

  let idAtual = null;

  function esc(t) {
    const d = document.createElement('div');
    d.textContent = t == null ? '' : String(t);
    return d.innerHTML;
  }

  function tamanho(bytes) {
    return bytes >= 1024 * 1024
      ? (bytes / 1024 / 1024).toFixed(1) + ' MB'
      : Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }

  /**
   * O servidor devolve o tipo ja em linguagem humana ("imagem JPEG"), entao
   * o icone e escolhido pelo rotulo. ICONE cobre o caso de o endpoint um dia
   * voltar a devolver o MIME cru.
   */
  function icone(rotulo) {
    if (ICONE[rotulo]) return ICONE[rotulo];
    if (/imagem/i.test(rotulo)) return '🖼️';
    if (/PDF|documento/i.test(rotulo)) return '📄';
    if (/audio|áudio/i.test(rotulo)) return '🎵';
    if (/video|vídeo/i.test(rotulo)) return '🎬';
    return '📎';
  }

  function montarModal() {
    if (document.getElementById('evid-overlay')) return;
    const div = document.createElement('div');
    div.id = 'evid-overlay';
    div.className = 'evid-overlay';
    div.innerHTML = `
      <div class="evid-box">
        <div class="ico">📎</div>
        <h3 data-i18n="evid.titulo">Anexos da denúncia</h3>
        <p><span data-i18n="sc.protocolo">Protocolo</span> <strong id="evid-proto"></strong></p>
        <div class="evid-lista" id="evid-lista"></div>
        <div class="evid-acoes">
          <button class="fluxo-btn secundario" onclick="Evidencias.fechar()"
                  data-i18n="emerg.fechar">Fechar</button>
        </div>
      </div>`;
    document.body.appendChild(div);
    div.addEventListener('click', e => { if (e.target === div) fechar(); });
  }

  async function abrir(apiId, protocolo) {
    montarModal();
    idAtual = apiId;
    document.getElementById('evid-proto').textContent = protocolo;
    document.getElementById('evid-overlay').classList.add('active');
    await carregar();
  }

  function fechar() {
    document.getElementById('evid-overlay')?.classList.remove('active');
  }

  async function carregar() {
    const alvo = document.getElementById('evid-lista');
    if (!alvo) return;
    alvo.innerHTML = `<div class="evid-vazio">${esc(T('evid.carregando', 'Carregando…'))}</div>`;

    let lista;
    try {
      lista = await Backend.listarEvidencias(idAtual);
    } catch (e) {
      alvo.innerHTML = `<div class="evid-vazio">❌ ${esc(e.message)}</div>`;
      return;
    }
    if (!lista.length) {
      alvo.innerHTML = `<div class="evid-vazio">${esc(T('evid.vazio', 'Nenhum arquivo anexado a esta denúncia.'))}</div>`;
      return;
    }

    alvo.innerHTML = lista.map(e => `
      <div class="evid-item">
        <span class="evid-ic">${icone(e.tipoConteudo)}</span>
        <div class="evid-corpo">
          <div class="evid-nome">${esc(e.nomeOriginal)}</div>
          <div class="evid-meta">${esc(e.tipoConteudo)} · ${tamanho(e.tamanhoBytes)}
            · ${esc(String(e.enviadoEm || '').replace('T', ' ').slice(0, 16))}</div>
          <div class="evid-hash" title="SHA-256 do conteúdo recebido">${esc((e.hashSha256 || '').slice(0, 24))}…</div>
        </div>
        <button class="fluxo-btn secundario" onclick="Evidencias.baixar(${e.id})"
                data-i18n="evid.baixar">⬇ Baixar</button>
        <button class="fluxo-btn secundario" onclick="Evidencias.remover(${e.id})"
                data-i18n="evid.remover">🗑 Remover</button>
      </div>`).join('');
  }

  async function baixar(id) {
    const item = document.querySelector(`[onclick="Evidencias.baixar(${id})"]`);
    const nome = item?.closest('.evid-item')?.querySelector('.evid-nome')?.textContent;
    try {
      await Backend.baixarEvidencia(id, nome);
      if (typeof showToast === 'function') {
        showToast(T('evid.baixado', '⬇ Download iniciado. A leitura foi registrada na trilha de auditoria.'));
      }
    } catch (e) {
      if (typeof showToast === 'function') {
        showToast((e.status === 403 ? '🚫 ' : '❌ ') + e.message);
      }
    }
  }

  async function remover(id) {
    const motivo = prompt(T('evid.motivo', 'Motivo da remoção (obrigatório):'));
    if (motivo === null) return;
    try {
      await Backend.removerEvidencia(id, motivo);
      if (typeof showToast === 'function') showToast(T('evid.removido', '🗑 Anexo removido.'));
      await carregar();
    } catch (e) {
      if (typeof showToast === 'function') {
        showToast((e.status === 403 ? '🚫 ' : '❌ ') + e.message);
      }
    }
  }

  return { abrir, fechar, carregar, baixar, remover };
})();

window.Evidencias = Evidencias;
