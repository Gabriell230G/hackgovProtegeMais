/**
 * score.js — Sistema de Score de Confiabilidade
 * Calcula a pontuação de uma denúncia com base nos campos preenchidos.
 */

const ScoreSystem = (() => {

  /**
   * Calcula o score de uma denúncia.
   * @param {Object} data - Objeto com os campos do formulário
   * @returns {{ score: number, classificacao: string, label: string }}
   */
  function calcular(data) {
    let score = 0;

    // Campos obrigatórios preenchidos (tipo + descrição)
    if (data.tipo && data.descricao && data.descricao.trim().length > 0) {
      score += 20;
    }

    // Estado selecionado
    if (data.estado && data.estado !== '') score += 5;

    // Cidade informada
    if (data.cidade && data.cidade.trim() !== '') score += 5;

    // Endereço preenchido
    if (data.endereco && data.endereco.trim() !== '') score += 10;

    // Data da ocorrência preenchida
    if (data.data && data.data !== '') score += 10;

    // Descrição — escalonado por tamanho
    const descLen = data.descricao ? data.descricao.trim().length : 0;
    if (descLen > 0 && descLen <= 200) {
      score += 10;
    } else if (descLen > 200 && descLen <= 500) {
      score += 20;
    } else if (descLen > 500) {
      score += 30;
    }

    // Anexos enviados
    if (data.temAnexos) score += 20;

    // Informações de contato (opcionais)
    if ((data.nome && data.nome.trim() !== '') || (data.contato && data.contato.trim() !== '')) {
      score += 10;
    }

    // Classificação
    let classificacao, label;
    if (score <= 30) {
      classificacao = 'Baixa';
      label = 'low';
    } else if (score <= 70) {
      classificacao = 'Média';
      label = 'medium';
    } else {
      classificacao = 'Alta';
      label = 'high';
    }

    return { score, classificacao, label };
  }

  /**
   * Gera HTML de badge para exibição.
   * @param {{ score: number, classificacao: string, label: string }} resultado
   */
  function renderBadge(resultado) {
    const icons = { high: 'fa-circle-check', medium: 'fa-circle-minus', low: 'fa-circle-xmark' };
    return `<span class="score-badge ${resultado.label}">
      <i class="fa-solid ${icons[resultado.label]}"></i>
      ${resultado.score}pts — ${resultado.classificacao} confiabilidade
    </span>`;
  }

  return { calcular, renderBadge };
})();