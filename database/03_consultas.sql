-- =============================================================================
--  PROTEGE+ | Script 03 - CONSULTAS ANALITICAS E DE AUDITORIA
--
--  HackGov / FIAP - Fase 5 | Gabriel Vasconcellos Gomes - RM 561601
--
--  Executar DEPOIS de 01_ddl_oracle.sql e 02_dml_carga.sql
--
--  Cada consulta abaixo reproduz, no banco, um numero apresentado no
--  relatorio. O objetivo e que a analise possa ser conferida na origem,
--  e nao apenas lida.
-- =============================================================================

-- =============================================================================
--  1. INDICADOR CENTRAL: LEAD TIME (tempo de resposta)
--
--  Definicao: intervalo entre o registro da denuncia e a sua conclusao.
--  Casos em aberto sao EXCLUIDOS do calculo e reportados a parte - inclui-los
--  como se fossem zero rebaixaria artificialmente a media.
-- =============================================================================

-- 1.1 Estatistica descritiva completa
--
--     METODO DOS QUARTIS: PERCENTILE_CONT, que interpola linearmente entre os
--     valores vizinhos. E o mesmo metodo usado nos calculos apresentados no
--     relatorio, para que os numeros conferem entre o PDF e o banco. O metodo
--     alternativo (mediana das metades, usado no calculo manual de sala) da
--     resultados ligeiramente diferentes e NAO e o adotado aqui.
SELECT
    COUNT(*)                                                      AS n,
    ROUND(MIN (dias), 2)                                          AS minimo,
    ROUND(MAX (dias), 2)                                          AS maximo,
    ROUND(AVG (dias), 2)                                          AS media,
    ROUND(MEDIAN (dias), 2)                                       AS mediana,
    ROUND(VARIANCE (dias), 2)                                     AS variancia,
    ROUND(STDDEV (dias), 2)                                       AS desvio_padrao,
    ROUND(STDDEV (dias) / AVG (dias) * 100, 1)                    AS coef_variacao_pct,
    ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY dias), 2)  AS q1,
    ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY dias), 2)  AS q3
FROM (
    SELECT (CAST(concluida_em AS DATE) - CAST(criado_em AS DATE)) AS dias
    FROM DENUNCIA
    WHERE excluida = 0 AND concluida_em IS NOT NULL
);

-- 1.2 Lead time por tipo de denuncia
--     Responde: o canal atende os casos mais graves com mais rapidez?
SELECT
    t.nome                                        AS tipo,
    t.peso_gravidade                              AS gravidade,
    COUNT(*)                                      AS n,
    ROUND(AVG (dias), 2)                          AS media_dias,
    ROUND(MEDIAN (dias), 2)                       AS mediana_dias,
    ROUND(STDDEV (dias), 2)                       AS desvio,
    ROUND(STDDEV (dias) / AVG (dias) * 100, 1)    AS cv_pct
FROM (
    SELECT d.tipo, (CAST(d.concluida_em AS DATE) - CAST(d.criado_em AS DATE)) AS dias
    FROM DENUNCIA d
    WHERE d.excluida = 0 AND d.concluida_em IS NOT NULL
) v
JOIN TIPO_DENUNCIA t ON t.tipo = v.tipo
GROUP BY t.nome, t.peso_gravidade
ORDER BY media_dias;

-- 1.3 Lead time por urgencia atribuida pelo VigIA
--     Valida na pratica se a priorizacao automatica esta surtindo efeito.
SELECT
    urgencia_ia,
    COUNT(*)               AS n,
    ROUND(AVG (dias), 2)   AS media_dias
FROM (
    SELECT urgencia_ia, (CAST(concluida_em AS DATE) - CAST(criado_em AS DATE)) AS dias
    FROM DENUNCIA
    WHERE excluida = 0 AND concluida_em IS NOT NULL
)
GROUP BY urgencia_ia
ORDER BY DECODE(urgencia_ia, 'CRITICA', 1, 'ALTA', 2, 'MEDIA', 3, 'BAIXA', 4);

-- 1.4 Distribuicao de frequencia em classes (base do histograma)
SELECT
    faixa,
    COUNT(*)                                                        AS frequencia,
    ROUND(COUNT(*) * 100 / SUM(COUNT(*)) OVER (), 1)                AS pct,
    ROUND(SUM(COUNT(*)) OVER (ORDER BY faixa) * 100
          / SUM(COUNT(*)) OVER (), 1)                               AS pct_acumulado
FROM (
    SELECT CASE
             WHEN dias <  3 THEN '1) 0  |-- 3'
             WHEN dias <  6 THEN '2) 3  |-- 6'
             WHEN dias <  9 THEN '3) 6  |-- 9'
             WHEN dias < 12 THEN '4) 9  |-- 12'
             WHEN dias < 15 THEN '5) 12 |-- 15'
             ELSE                '6) 15 ou mais'
           END AS faixa
    FROM (
        SELECT (CAST(concluida_em AS DATE) - CAST(criado_em AS DATE)) AS dias
        FROM DENUNCIA WHERE excluida = 0 AND concluida_em IS NOT NULL
    )
)
GROUP BY faixa
ORDER BY faixa;

-- 1.5 Casos atipicos pelo criterio de Tukey (acima de Q3 + 1,5 x IQR)
--     Sao os casos que merecem revisao individual do processo de atendimento.
WITH base AS (
    SELECT id, protocolo, tipo,
           (CAST(concluida_em AS DATE) - CAST(criado_em AS DATE)) AS dias
    FROM DENUNCIA WHERE excluida = 0 AND concluida_em IS NOT NULL
), limites AS (
    SELECT PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY dias) AS q1,
           PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY dias) AS q3
    FROM base
)
SELECT b.protocolo, t.nome AS tipo, ROUND(b.dias, 2) AS dias,
       ROUND(l.q3 + 1.5 * (l.q3 - l.q1), 2) AS limite_superior
FROM base b
CROSS JOIN limites l
JOIN TIPO_DENUNCIA t ON t.tipo = b.tipo
WHERE b.dias > l.q3 + 1.5 * (l.q3 - l.q1)
ORDER BY b.dias DESC;

-- =============================================================================
--  2. PANORAMA OPERACIONAL
-- =============================================================================

-- 2.1 Situacao atual da fila
SELECT s.descricao AS status, COUNT(*) AS total,
       ROUND(COUNT(*) * 100 / SUM(COUNT(*)) OVER (), 1) AS pct
FROM DENUNCIA d
JOIN STATUS_DENUNCIA s ON s.status = d.status
WHERE d.excluida = 0
GROUP BY s.descricao, s.ordem_fluxo
ORDER BY s.ordem_fluxo;

-- 2.2 Concentracao geografica
--     LIMIAR DE PRIVACIDADE: unidades com menos de 3 denuncias nao sao
--     detalhadas, para nao permitir reidentificacao em municipio pequeno.
SELECT estado, COUNT(*) AS total,
       ROUND(AVG (score), 1) AS score_medio
FROM DENUNCIA
WHERE excluida = 0
GROUP BY estado
HAVING COUNT(*) >= 3
ORDER BY total DESC;

-- 2.3 Serie temporal mensal (volume e tempo de resposta)
SELECT TO_CHAR(criado_em, 'YYYY-MM')                          AS mes,
       COUNT(*)                                               AS registradas,
       COUNT(concluida_em)                                    AS concluidas,
       ROUND(AVG (CAST(concluida_em AS DATE)
                - CAST(criado_em AS DATE)), 2)                AS lead_medio
FROM DENUNCIA
WHERE excluida = 0
GROUP BY TO_CHAR(criado_em, 'YYYY-MM')
ORDER BY mes;

-- 2.4 Correlacao entre score de confiabilidade e tempo de resposta
--     Testa a hipotese: denuncia mais bem preenchida e resolvida mais rapido?
SELECT ROUND(CORR (score, dias), 3) AS correlacao_pearson
FROM (
    SELECT score, (CAST(concluida_em AS DATE) - CAST(criado_em AS DATE)) AS dias
    FROM DENUNCIA WHERE excluida = 0 AND concluida_em IS NOT NULL
);

-- 2.5 Casos represados: em aberto ha mais de 7 dias, dos mais graves primeiro
SELECT d.protocolo, t.nome AS tipo, d.urgencia_ia, d.score,
       ROUND(CAST(SYSTIMESTAMP AS DATE) - CAST(d.criado_em AS DATE)) AS dias_parada
FROM DENUNCIA d
JOIN TIPO_DENUNCIA t ON t.tipo = d.tipo
WHERE d.excluida = 0
  AND d.concluida_em IS NULL
  AND CAST(SYSTIMESTAMP AS DATE) - CAST(d.criado_em AS DATE) > 7
ORDER BY DECODE(d.urgencia_ia, 'CRITICA', 1, 'ALTA', 2, 'MEDIA', 3, 'BAIXA', 4),
         dias_parada DESC;

-- =============================================================================
--  3. GOVERNANCA E AUDITORIA
-- =============================================================================

-- 3.1 Volume por tipo de acao registrada
SELECT acao, resultado, COUNT(*) AS total
FROM AUDITORIA_LOG
GROUP BY acao, resultado
ORDER BY total DESC;

-- 3.2 Consultas sensiveis por servidor
--     Quem esta lendo relatos de denuncia, e com que frequencia.
SELECT usuario, perfil, COUNT(*) AS consultas,
       MIN(data_hora) AS primeira, MAX(data_hora) AS ultima
FROM AUDITORIA_LOG
WHERE acao = 'CONSULTA_SENSIVEL'
GROUP BY usuario, perfil
ORDER BY consultas DESC;

-- 3.3 Tentativas recusadas - o material de investigacao de acesso indevido
SELECT data_hora, usuario, acao, origem_ip, detalhe
FROM AUDITORIA_LOG
WHERE resultado = 'NEGADO'
ORDER BY data_hora DESC;

-- 3.4 Verificacao do encadeamento por hash
--     Lista os registros cujo hash_anterior NAO corresponde ao hash do
--     antecessor imediato. Resultado vazio = cadeia integra.
SELECT id, data_hora, acao, usuario,
       hash_anterior AS aponta_para,
       anterior_real AS deveria_apontar_para
FROM (
    SELECT a.*,
           LAG(hash) OVER (ORDER BY id) AS anterior_real
    FROM AUDITORIA_LOG a
)
WHERE anterior_real IS NOT NULL
  AND hash_anterior <> anterior_real;

-- 3.5 Denuncias excluidas logicamente
--     Confirma que o conteudo sensivel foi de fato eliminado.
SELECT protocolo, excluida_em, motivo_exclusao,
       CASE WHEN descricao IS NULL AND endereco IS NULL
            THEN 'Conteudo eliminado'
            ELSE 'ATENCAO: conteudo ainda presente' END AS situacao
FROM DENUNCIA
WHERE excluida = 1
ORDER BY excluida_em DESC;

-- 3.6 Matriz de perfis: o que cada um enxerga
SELECT p.perfil, p.descricao,
       CASE p.ve_identidade WHEN 'S' THEN 'Sim' ELSE 'Nao' END AS acessa_dado_pessoal,
       CASE p.ve_auditoria  WHEN 'S' THEN 'Sim' ELSE 'Nao' END AS consulta_auditoria,
       COUNT(s.id) AS servidores
FROM PERFIL p
LEFT JOIN SERVIDOR_PUBLICO s ON s.perfil = p.perfil
GROUP BY p.perfil, p.descricao, p.ve_identidade, p.ve_auditoria
ORDER BY DECODE(p.perfil, 'CIDADAO',1, 'ATENDENTE',2, 'GESTOR',3, 'AUDITOR',4, 'ADMIN',5);
