-- =====================================================================
--  Dados de exemplo (idempotente - so insere se ainda nao existir).
--  Deixa o painel do gestor / Kanban populado para a demonstracao.
-- =====================================================================

INSERT INTO denuncia (protocolo, tipo, localidade, estado, cidade, endereco, descricao, status, anonimo, score, score_label, score_txt, urgencia_ia, resumo_ia, criado_em)
SELECT '#2026-00451', 'violencia', 'Sao Paulo, SP', 'SP', 'Sao Paulo', 'Rua Paulista, 100 - Jardim Paulista', 'Relato de violencia domestica no bairro Jardim Paulista, com ameacas frequentes.', 'recebida', TRUE, 65, 'medium', 'Media', 'ALTA', 'Violencia domestica recorrente. Priorizar contato com a rede de protecao.', TIMESTAMP '2026-04-20 14:32:00'
WHERE NOT EXISTS (SELECT 1 FROM denuncia WHERE protocolo = '#2026-00451');

INSERT INTO denuncia (protocolo, tipo, localidade, estado, cidade, endereco, descricao, status, anonimo, score, score_label, score_txt, urgencia_ia, resumo_ia, criado_em)
SELECT '#2026-00452', 'assedio', 'Rio de Janeiro, RJ', 'RJ', 'Rio de Janeiro', 'Av. Rio Branco, 500', 'Assedio no ambiente de trabalho relatado pelo denunciante identificado.', 'analise', FALSE, 80, 'high', 'Alta', 'MEDIA', 'Assedio laboral com denunciante identificado. Boa verificabilidade.', TIMESTAMP '2026-04-21 09:10:00'
WHERE NOT EXISTS (SELECT 1 FROM denuncia WHERE protocolo = '#2026-00452');

INSERT INTO denuncia (protocolo, tipo, localidade, estado, cidade, endereco, descricao, status, anonimo, score, score_label, score_txt, urgencia_ia, resumo_ia, criado_em)
SELECT '#2026-00453', 'abuso', 'Salvador, BA', 'BA', 'Salvador', 'Rua da Bahia, 200', 'Abuso reportado na comunidade local envolvendo pessoa vulneravel.', 'encaminhada', TRUE, 45, 'medium', 'Media', 'ALTA', 'Abuso contra vulneravel. Encaminhar ao orgao de protecao competente.', TIMESTAMP '2026-04-22 08:05:00'
WHERE NOT EXISTS (SELECT 1 FROM denuncia WHERE protocolo = '#2026-00453');

INSERT INTO denuncia (protocolo, tipo, localidade, estado, cidade, endereco, descricao, status, anonimo, score, score_label, score_txt, urgencia_ia, resumo_ia, criado_em)
SELECT '#2026-00454', 'discriminacao', 'Recife, PE', 'PE', 'Recife', 'Av. Boa Viagem, 1200', 'Discriminacao racial em estabelecimento comercial, com testemunhas.', 'concluida', FALSE, 90, 'high', 'Alta', 'MEDIA', 'Discriminacao com testemunhas. Caso concluido com encaminhamento.', TIMESTAMP '2026-04-22 10:00:00'
WHERE NOT EXISTS (SELECT 1 FROM denuncia WHERE protocolo = '#2026-00454');

INSERT INTO denuncia (protocolo, tipo, localidade, estado, cidade, endereco, descricao, status, anonimo, score, score_label, score_txt, urgencia_ia, resumo_ia, criado_em)
SELECT '#2026-00455', 'violencia', 'Belo Horizonte, MG', 'MG', 'Belo Horizonte', 'Rua Goias, 800', 'Denuncia de violencia fisica em via publica agora, pedido de socorro.', 'recebida', TRUE, 30, 'low', 'Baixa', 'CRITICA', 'Violencia em curso com termos de risco. Acionar resposta imediata.', TIMESTAMP '2026-04-23 17:55:00'
WHERE NOT EXISTS (SELECT 1 FROM denuncia WHERE protocolo = '#2026-00455');

-- Historico (linha do tempo) das denuncias acima
INSERT INTO denuncia_historico (denuncia_id, ordem, status, data, hora)
SELECT d.id, 0, 'recebida', '20/04/2026', '14:32' FROM denuncia d
WHERE d.protocolo = '#2026-00451' AND NOT EXISTS (SELECT 1 FROM denuncia_historico h WHERE h.denuncia_id = d.id);

INSERT INTO denuncia_historico (denuncia_id, ordem, status, data, hora)
SELECT d.id, 0, 'recebida', '21/04/2026', '09:10' FROM denuncia d
WHERE d.protocolo = '#2026-00452' AND NOT EXISTS (SELECT 1 FROM denuncia_historico h WHERE h.denuncia_id = d.id);
INSERT INTO denuncia_historico (denuncia_id, ordem, status, data, hora)
SELECT d.id, 1, 'analise', '22/04/2026', '11:45' FROM denuncia d
WHERE d.protocolo = '#2026-00452' AND NOT EXISTS (SELECT 1 FROM denuncia_historico h WHERE h.denuncia_id = d.id AND h.ordem = 1);

INSERT INTO denuncia_historico (denuncia_id, ordem, status, data, hora)
SELECT d.id, 0, 'recebida', '22/04/2026', '08:05' FROM denuncia d
WHERE d.protocolo = '#2026-00453' AND NOT EXISTS (SELECT 1 FROM denuncia_historico h WHERE h.denuncia_id = d.id);

-- Equipe do gestor
INSERT INTO membro (nome, cargo, email)
SELECT 'Ana Souza', 'Analista de Denuncias', 'ana.souza@protege.gov.br'
WHERE NOT EXISTS (SELECT 1 FROM membro WHERE email = 'ana.souza@protege.gov.br');
INSERT INTO membro (nome, cargo, email)
SELECT 'Carlos Lima', 'Coordenador', 'carlos.lima@protege.gov.br'
WHERE NOT EXISTS (SELECT 1 FROM membro WHERE email = 'carlos.lima@protege.gov.br');
