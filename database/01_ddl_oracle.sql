-- =============================================================================
--  PROTEGE+ | Canal Nacional de Denuncias
--  Script 01 - MODELO FISICO (DDL)
--
--  HackGov / FIAP - Fase 5
--  Gabriel Vasconcellos Gomes - RM 561601
--
--  SGBD alvo : Oracle Database 19c        Encoding : AL32UTF8
--
--  ORDEM DE EXECUCAO
--    01_ddl_oracle.sql   -> estrutura (este arquivo)
--    02_dml_carga.sql    -> dominios e massa de teste
--    03_consultas.sql    -> consultas analiticas e de auditoria
--
-- -----------------------------------------------------------------------------
--  DECISAO 1 - CHAVE NATURAL NAS TABELAS DE DOMINIO
--
--  TIPO_DENUNCIA, STATUS_DENUNCIA e PERFIL usam a propria sigla como chave
--  primaria, em vez de um id numerico artificial. Tres razoes:
--
--   a) O dominio e pequeno (4 a 5 linhas), fechado e estavel. O argumento
--      classico a favor da chave artificial - "o codigo pode mudar" - nao
--      se aplica: renomear o status 'concluida' quebraria a API publica
--      antes de quebrar o banco.
--   b) As consultas ficam legiveis sem JOIN. "WHERE status = 'analise'" diz
--      o que faz; "WHERE id_status = 2" exige consultar outra tabela.
--   c) E o que torna este script executavel pela aplicacao. As entidades JPA
--      gravam 'violencia' e 'analise' como texto; com chave natural, essas
--      colunas SAO as chaves estrangeiras. O modelo fisico documentado aqui
--      e o mesmo que a aplicacao usa - nao um diagrama paralelo.
--
-- -----------------------------------------------------------------------------
--  DECISAO 2 - TIPAGEM EXPLICITA
--
--  Toda coluna numerica declara precisao. NUMBER sem precisao aceita 38
--  digitos e nao expressa regra nenhuma; score NUMBER(3) com CHECK BETWEEN
--  0 AND 100 documenta a regra na estrutura e permite ao banco recusar o
--  valor invalido antes que a aplicacao seja consultada.
--
--  A descricao usa VARCHAR2(4000) e nao CLOB: o teto de 4000 caracteres e
--  regra de negocio (o formulario o impoe) e VARCHAR2 e indexavel e
--  comparavel sem as restricoes do CLOB.
--
-- -----------------------------------------------------------------------------
--  CORRESPONDENCIA COM AS CLASSES JAVA
--
--    DENUNCIA ................ br.gov.protege.model.Denuncia
--    DENUNCIA_HISTORICO ...... br.gov.protege.model.HistoricoItem (@ElementCollection)
--    MEMBRO_EQUIPE ........... br.gov.protege.model.Membro
--    SERVIDOR_PUBLICO ........ br.gov.protege.model.Usuario
--    AUDITORIA_LOG ........... br.gov.protege.model.AuditoriaLog
--    PERFIL .................. br.gov.protege.model.PerfilUsuario (enum)
--    TIPO_DENUNCIA ........... dominio validado por @Pattern em DenunciaRequest
--    STATUS_DENUNCIA ......... dominio validado por @Pattern em AtualizarStatusRequest
--
--  CIDADAO, EVIDENCIA, NOTIFICACAO e CHATBOT_INTERACAO integram o modelo
--  completo do sistema e ainda nao possuem entidade JPA correspondente:
--  estao previstas nas user stories US28 a US30 do backlog. Ficam aqui
--  porque o modelo fisico descreve o sistema projetado, e o texto declara
--  o que ja esta implementado - o contrario seria omitir o planejamento.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- LIMPEZA (permite reexecutar o script do zero)
-- -----------------------------------------------------------------------------
BEGIN
  FOR t IN (SELECT table_name FROM user_tables
            WHERE table_name IN ('AUDITORIA_LOG','CHATBOT_INTERACAO','NOTIFICACAO',
                                 'DENUNCIA_HISTORICO','EVIDENCIA','DENUNCIA',
                                 'MEMBRO_EQUIPE','SERVIDOR_PUBLICO','CIDADAO',
                                 'PERFIL','TIPO_DENUNCIA','STATUS_DENUNCIA'))
  LOOP
    EXECUTE IMMEDIATE 'DROP TABLE ' || t.table_name || ' CASCADE CONSTRAINTS';
  END LOOP;
END;
/


-- =============================================================================
--  BLOCO 1 - TABELAS DE DOMINIO
--
--  Valores fechados vivem em tabela propria e nao como texto repetido. Isso
--  garante integridade referencial - nao existe denuncia com status
--  inexistente -, permite descrever cada valor e mantem o dado normalizado.
-- =============================================================================

CREATE TABLE STATUS_DENUNCIA (
    status       VARCHAR2(20)   NOT NULL,
    descricao    VARCHAR2(60)   NOT NULL,
    ordem_fluxo  NUMBER(2)      NOT NULL,
    CONSTRAINT status_denuncia_pk  PRIMARY KEY (status),
    CONSTRAINT status_ordem_uk     UNIQUE (ordem_fluxo),
    CONSTRAINT ck_status_ordem     CHECK (ordem_fluxo BETWEEN 1 AND 10)
);

COMMENT ON TABLE  STATUS_DENUNCIA             IS 'Estados do fluxo de atendimento';
COMMENT ON COLUMN STATUS_DENUNCIA.status      IS 'Chave natural, gravada pela aplicacao em DENUNCIA.status';
COMMENT ON COLUMN STATUS_DENUNCIA.ordem_fluxo IS 'Posicao no fluxo; permite detectar transicoes fora de ordem';

-- -----------------------------------------------------------------------------
CREATE TABLE TIPO_DENUNCIA (
    tipo            VARCHAR2(20)   NOT NULL,
    nome            VARCHAR2(50)   NOT NULL,
    descricao       VARCHAR2(200),
    peso_gravidade  NUMBER(1)      DEFAULT 2 NOT NULL,
    CONSTRAINT tipo_denuncia_pk   PRIMARY KEY (tipo),
    CONSTRAINT ck_tipo_gravidade  CHECK (peso_gravidade BETWEEN 1 AND 5)
);

COMMENT ON COLUMN TIPO_DENUNCIA.peso_gravidade IS 'Peso usado pelo VigIA na fila de prioridade (1 a 5)';

-- -----------------------------------------------------------------------------
CREATE TABLE PERFIL (
    perfil          VARCHAR2(20)  NOT NULL,
    descricao       VARCHAR2(120) NOT NULL,
    ve_identidade   CHAR(1)       DEFAULT 'N' NOT NULL,
    ve_auditoria    CHAR(1)       DEFAULT 'N' NOT NULL,
    CONSTRAINT perfil_pk            PRIMARY KEY (perfil),
    CONSTRAINT ck_perfil_identidade CHECK (ve_identidade IN ('S','N')),
    CONSTRAINT ck_perfil_auditoria  CHECK (ve_auditoria  IN ('S','N'))
);

COMMENT ON TABLE  PERFIL               IS 'Perfis de acesso e o que cada um enxerga (espelha o enum PerfilUsuario)';
COMMENT ON COLUMN PERFIL.ve_identidade IS 'S = pode ver dado identificavel do denunciante';
COMMENT ON COLUMN PERFIL.ve_auditoria  IS 'S = pode consultar a trilha de auditoria';


-- =============================================================================
--  BLOCO 2 - ENTIDADES INDEPENDENTES
-- =============================================================================

CREATE TABLE MEMBRO_EQUIPE (
    id      NUMBER(10)     GENERATED BY DEFAULT AS IDENTITY,
    nome    VARCHAR2(100)  NOT NULL,
    cargo   VARCHAR2(80),
    email   VARCHAR2(150),
    CONSTRAINT membro_equipe_pk  PRIMARY KEY (id),
    CONSTRAINT membro_email_uk   UNIQUE (email)
);

COMMENT ON TABLE MEMBRO_EQUIPE IS 'Servidores que podem ser designados responsaveis por um caso';

-- -----------------------------------------------------------------------------
CREATE TABLE SERVIDOR_PUBLICO (
    id           NUMBER(10)     GENERATED BY DEFAULT AS IDENTITY,
    email        VARCHAR2(150)  NOT NULL,
    senha_hash   VARCHAR2(120)  NOT NULL,
    nome         VARCHAR2(100),
    perfil       VARCHAR2(20)   NOT NULL,
    CONSTRAINT servidor_publico_pk  PRIMARY KEY (id),
    CONSTRAINT servidor_email_uk    UNIQUE (email),
    CONSTRAINT servidor_perfil_fk   FOREIGN KEY (perfil) REFERENCES PERFIL (perfil),
    -- Um hash BCrypt tem 60 caracteres. O CHECK impede que uma senha em
    -- texto puro seja gravada nesta coluna por engano.
    CONSTRAINT ck_servidor_hash     CHECK (LENGTH(senha_hash) >= 55)
);

COMMENT ON COLUMN SERVIDOR_PUBLICO.senha_hash IS 'Hash BCrypt. Senha em texto puro nunca e persistida';
COMMENT ON COLUMN SERVIDOR_PUBLICO.perfil     IS 'FK natural para PERFIL; e a claim role do token JWT';

-- -----------------------------------------------------------------------------
--  Reservada para denuncias identificadas (nivel 3 do anonimato graduado).
--  A aplicacao atual grava apenas o indicador DENUNCIA.anonimo; o vinculo com
--  esta tabela e criado quando o cidadao opta por se identificar.
CREATE TABLE CIDADAO (
    id          NUMBER(10)     GENERATED BY DEFAULT AS IDENTITY,
    nome        VARCHAR2(100),
    email       VARCHAR2(150),
    telefone    VARCHAR2(20),
    criado_em   TIMESTAMP(3)   DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT cidadao_pk  PRIMARY KEY (id),
    -- Nao adianta guardar a linha se ela nao identifica ninguem.
    CONSTRAINT ck_cidadao_contato CHECK (email IS NOT NULL OR telefone IS NOT NULL)
);

COMMENT ON TABLE CIDADAO IS 'Denunciante identificado. Denuncia anonima nao gera linha aqui (LGPD, art. 6, III)';


-- =============================================================================
--  BLOCO 3 - ENTIDADE CENTRAL
--
--  As colunas abaixo correspondem exatamente aos campos da classe
--  br.gov.protege.model.Denuncia. As colunas tipo e status sao, ao mesmo
--  tempo, o valor que a aplicacao grava e a chave estrangeira do dominio.
-- =============================================================================

CREATE TABLE DENUNCIA (
    id                NUMBER(10)      GENERATED BY DEFAULT AS IDENTITY,
    protocolo         VARCHAR2(20)    NOT NULL,
    cidadao_id        NUMBER(10),

    tipo              VARCHAR2(20)    NOT NULL,
    status            VARCHAR2(20)    DEFAULT 'recebida' NOT NULL,
    responsavel_id    NUMBER(10),

    descricao         VARCHAR2(4000),
    estado            CHAR(2),
    cidade            VARCHAR2(80),
    localidade        VARCHAR2(120),
    endereco          VARCHAR2(200),

    score             NUMBER(3)       DEFAULT 0 NOT NULL,
    score_label       VARCHAR2(10),
    score_txt         VARCHAR2(10),

    urgencia_ia       VARCHAR2(10),
    resumo_ia         VARCHAR2(2000),
    origem_analise    VARCHAR2(10),

    anonimo           NUMBER(1)       DEFAULT 1 NOT NULL,
    criado_em         TIMESTAMP(3)    DEFAULT SYSTIMESTAMP NOT NULL,
    concluida_em      TIMESTAMP(3),

    excluida          NUMBER(1)       DEFAULT 0 NOT NULL,
    motivo_exclusao   VARCHAR2(300),
    excluida_em       TIMESTAMP(3),

    CONSTRAINT denuncia_pk           PRIMARY KEY (id),
    CONSTRAINT denuncia_protocolo_uk UNIQUE (protocolo),

    CONSTRAINT denuncia_tipo_fk        FOREIGN KEY (tipo)           REFERENCES TIPO_DENUNCIA (tipo),
    CONSTRAINT denuncia_status_fk      FOREIGN KEY (status)         REFERENCES STATUS_DENUNCIA (status),
    CONSTRAINT denuncia_responsavel_fk FOREIGN KEY (responsavel_id) REFERENCES MEMBRO_EQUIPE (id),
    CONSTRAINT denuncia_cidadao_fk     FOREIGN KEY (cidadao_id)     REFERENCES CIDADAO (id),

    CONSTRAINT ck_denuncia_protocolo  CHECK (REGEXP_LIKE (protocolo, '^#[0-9]{4}-[0-9]{5}$')),
    CONSTRAINT ck_denuncia_score      CHECK (score BETWEEN 0 AND 100),
    CONSTRAINT ck_denuncia_score_lbl  CHECK (score_label IN ('low','medium','high')),
    CONSTRAINT ck_denuncia_score_txt  CHECK (score_txt   IN ('Baixa','Media','Alta')),
    CONSTRAINT ck_denuncia_urgencia   CHECK (urgencia_ia IN ('BAIXA','MEDIA','ALTA','CRITICA')),
    CONSTRAINT ck_denuncia_origem     CHECK (origem_analise IN ('GEMINI','REGRAS')),
    CONSTRAINT ck_denuncia_anonimo    CHECK (anonimo  IN (0,1)),
    CONSTRAINT ck_denuncia_excluida   CHECK (excluida IN (0,1)),
    CONSTRAINT ck_denuncia_estado     CHECK (REGEXP_LIKE (estado, '^[A-Z]{2}$')),

    -- Coerencia temporal: nao se conclui antes de registrar.
    CONSTRAINT ck_denuncia_conclusao  CHECK (concluida_em IS NULL OR concluida_em >= criado_em),

    -- Denuncia anonima nao pode ter denunciante vinculado. A regra que
    -- protege a vitima e imposta pelo banco, e nao so pela aplicacao.
    CONSTRAINT ck_denuncia_anonimato  CHECK (anonimo = 0 OR cidadao_id IS NULL),

    -- Exclusao logica exige motivo, data e eliminacao do conteudo sensivel.
    -- Atende ao direito de eliminacao (LGPD, art. 18, VI) sem destruir a
    -- rastreabilidade exigida da administracao publica.
    CONSTRAINT ck_denuncia_exclusao   CHECK (
        excluida = 0
        OR (motivo_exclusao IS NOT NULL AND excluida_em IS NOT NULL
            AND descricao IS NULL AND endereco IS NULL)
    )
);

COMMENT ON TABLE  DENUNCIA                IS 'Entidade central do canal';
COMMENT ON COLUMN DENUNCIA.protocolo      IS 'Codigo publico no formato #AAAA-NNNNN';
COMMENT ON COLUMN DENUNCIA.localidade     IS 'Cidade e UF concatenadas para exibicao. Denormalizacao deliberada: evita concatenar em toda listagem do painel. LOCAL seria o nome natural, mas e palavra reservada em SQL';
COMMENT ON COLUMN DENUNCIA.concluida_em   IS 'Base do calculo de lead time (tempo de resposta)';
COMMENT ON COLUMN DENUNCIA.origem_analise IS 'GEMINI ou REGRAS: torna auditavel a origem da decisao automatizada';
COMMENT ON COLUMN DENUNCIA.anonimo        IS 'Mapeado de boolean Java; 1 = anonima';
COMMENT ON COLUMN DENUNCIA.excluida       IS 'Exclusao logica: o registro permanece, o conteudo sensivel nao';


-- =============================================================================
--  BLOCO 4 - LINHA DO TEMPO
--
--  Corresponde a colecao historico da entidade Denuncia (@ElementCollection
--  com @OrderColumn). A ordem e propriedade do banco, e nao convencao do
--  codigo - por isso a UNIQUE composta.
--
--  Somente insercao: uma correcao entra como evento novo, nunca reescrevendo
--  o anterior. E o que sustenta a rastreabilidade exigida pela US12.
-- =============================================================================

CREATE TABLE DENUNCIA_HISTORICO (
    denuncia_id  NUMBER(10)    NOT NULL,
    ordem        NUMBER(3)     NOT NULL,
    status       VARCHAR2(20)  NOT NULL,
    data         VARCHAR2(10)  NOT NULL,
    hora         VARCHAR2(5)   NOT NULL,
    CONSTRAINT denuncia_historico_pk PRIMARY KEY (denuncia_id, ordem),
    CONSTRAINT historico_denuncia_fk FOREIGN KEY (denuncia_id) REFERENCES DENUNCIA (id) ON DELETE CASCADE,
    CONSTRAINT historico_status_fk   FOREIGN KEY (status)      REFERENCES STATUS_DENUNCIA (status),
    CONSTRAINT ck_historico_data     CHECK (REGEXP_LIKE (data, '^[0-9]{2}/[0-9]{2}/[0-9]{4}$')),
    CONSTRAINT ck_historico_hora     CHECK (REGEXP_LIKE (hora, '^[0-9]{2}:[0-9]{2}$'))
);

COMMENT ON COLUMN DENUNCIA_HISTORICO.ordem IS 'Posicao na linha do tempo; parte da chave primaria composta';
COMMENT ON COLUMN DENUNCIA_HISTORICO.data  IS 'Formato dd/MM/yyyy, exibido diretamente ao cidadao na consulta por protocolo';


-- =============================================================================
--  BLOCO 5 - TRILHA DE AUDITORIA
--
--  Tabela somente de insercao. Nao ha UPDATE nem DELETE previsto no sistema,
--  e o encadeamento por hash torna qualquer alteracao detectavel.
--
--  Nao armazena o conteudo do relato: registra QUE a denuncia 42 foi
--  consultada, nao o que estava escrito nela. Do contrario a trilha viraria
--  uma segunda base de dados sensiveis - um vazamento a mais para proteger.
-- =============================================================================

CREATE TABLE AUDITORIA_LOG (
    id              NUMBER(10)     GENERATED BY DEFAULT AS IDENTITY,
    data_hora       TIMESTAMP(3)   NOT NULL,
    usuario         VARCHAR2(150),
    perfil          VARCHAR2(20),
    acao            VARCHAR2(40)   NOT NULL,
    recurso         VARCHAR2(40),
    recurso_id      VARCHAR2(60),
    resultado       VARCHAR2(12)   NOT NULL,
    origem_ip       VARCHAR2(45),
    user_agent      VARCHAR2(200),
    detalhe         VARCHAR2(300),
    hash_anterior   CHAR(64)       NOT NULL,
    hash            CHAR(64)       NOT NULL,
    CONSTRAINT auditoria_log_pk    PRIMARY KEY (id),
    CONSTRAINT auditoria_hash_uk   UNIQUE (hash),
    CONSTRAINT ck_auditoria_result CHECK (resultado IN ('PERMITIDO','NEGADO','ERRO')),
    CONSTRAINT ck_auditoria_acao   CHECK (acao IN (
        'LOGIN','LOGIN_NEGADO','CONSULTA_SENSIVEL','ALTERACAO_STATUS',
        'ALTERACAO_DADOS','ATRIBUICAO','EXCLUSAO','EXPORTACAO',
        'REANALISE_IA','ALTERACAO_EQUIPE','ACESSO_AUDITORIA')),
    -- CHAR(64) e o tamanho exato de um SHA-256 em hexadecimal.
    CONSTRAINT ck_auditoria_hash   CHECK (REGEXP_LIKE (hash,          '^[0-9a-f]{64}$')),
    CONSTRAINT ck_auditoria_hant   CHECK (REGEXP_LIKE (hash_anterior, '^[0-9a-f]{64}$'))
);

COMMENT ON TABLE  AUDITORIA_LOG               IS 'Trilha imutavel de acoes sensiveis, encadeada por SHA-256';
COMMENT ON COLUMN AUDITORIA_LOG.hash_anterior IS 'Hash do registro anterior; 64 zeros no primeiro (genese)';
COMMENT ON COLUMN AUDITORIA_LOG.resultado     IS 'Tentativa recusada tambem e registrada: NEGADO';
COMMENT ON COLUMN AUDITORIA_LOG.detalhe       IS 'Descricao curta e NAO sensivel. O relato da denuncia jamais entra aqui';


-- =============================================================================
--  BLOCO 6 - MODELO COMPLETO (previsto no backlog, sem entidade JPA ainda)
--
--  EVIDENCIA cobre as US28 a US30: upload de anexos pela API, substituindo o
--  armazenamento em Base64 no localStorage da Fase 4, que esbarrava no teto
--  de aproximadamente 5 MB por origem do navegador.
-- =============================================================================

CREATE TABLE EVIDENCIA (
    id             NUMBER(10)     GENERATED BY DEFAULT AS IDENTITY,
    denuncia_id    NUMBER(10)     NOT NULL,
    tipo_arquivo   VARCHAR2(10)   NOT NULL,
    nome_original  VARCHAR2(150)  NOT NULL,
    caminho        VARCHAR2(300)  NOT NULL,
    tamanho_bytes  NUMBER(10)     NOT NULL,
    mime_type      VARCHAR2(80)   NOT NULL,
    data_upload    TIMESTAMP(3)   DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT evidencia_pk          PRIMARY KEY (id),
    CONSTRAINT evidencia_denuncia_fk FOREIGN KEY (denuncia_id) REFERENCES DENUNCIA (id) ON DELETE CASCADE,
    CONSTRAINT ck_evidencia_tipo     CHECK (tipo_arquivo IN ('FOTO','DOCUMENTO','VIDEO','AUDIO')),
    -- Teto de 5 MB por arquivo, imposto tambem no banco.
    CONSTRAINT ck_evidencia_tamanho  CHECK (tamanho_bytes BETWEEN 1 AND 5242880)
);

COMMENT ON COLUMN EVIDENCIA.caminho IS 'Caminho no armazenamento. O binario nao fica na tabela';

-- -----------------------------------------------------------------------------
CREATE TABLE NOTIFICACAO (
    id            NUMBER(10)     GENERATED BY DEFAULT AS IDENTITY,
    denuncia_id   NUMBER(10)     NOT NULL,
    mensagem      VARCHAR2(500)  NOT NULL,
    canal         VARCHAR2(10)   DEFAULT 'SISTEMA' NOT NULL,
    data_envio    TIMESTAMP(3)   DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT notificacao_pk          PRIMARY KEY (id),
    CONSTRAINT notificacao_denuncia_fk FOREIGN KEY (denuncia_id) REFERENCES DENUNCIA (id) ON DELETE CASCADE,
    CONSTRAINT ck_notificacao_canal    CHECK (canal IN ('EMAIL','SMS','SISTEMA'))
);

-- -----------------------------------------------------------------------------
CREATE TABLE CHATBOT_INTERACAO (
    id            NUMBER(10)     GENERATED BY DEFAULT AS IDENTITY,
    denuncia_id   NUMBER(10),
    no_id         VARCHAR2(10)   NOT NULL,
    entrada_user  VARCHAR2(200),
    resposta_bot  VARCHAR2(500)  NOT NULL,
    data_hora     TIMESTAMP(3)   DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT chatbot_interacao_pk PRIMARY KEY (id),
    CONSTRAINT chatbot_denuncia_fk  FOREIGN KEY (denuncia_id) REFERENCES DENUNCIA (id) ON DELETE SET NULL
);


-- =============================================================================
--  BLOCO 7 - INDICES
--
--  Cada indice corresponde a uma consulta real do sistema. Indice sem
--  consulta que o use e custo de escrita sem beneficio de leitura.
-- =============================================================================

-- Painel do gestor: filtros de DenunciaRepository.buscarComFiltros
CREATE INDEX idx_denuncia_status    ON DENUNCIA (status);
CREATE INDEX idx_denuncia_tipo      ON DENUNCIA (tipo);
CREATE INDEX idx_denuncia_estado    ON DENUNCIA (estado);

-- Listagem ordenada por data e series temporais dos relatorios
CREATE INDEX idx_denuncia_criado    ON DENUNCIA (criado_em DESC);

-- Lead time: so interessam as concluidas
CREATE INDEX idx_denuncia_concluida ON DENUNCIA (concluida_em);

-- Fila de prioridade (FilaAtendimentoService): urgencia, score e antiguidade
CREATE INDEX idx_denuncia_fila      ON DENUNCIA (urgencia_ia, score DESC, criado_em);

-- Kanban por responsavel
CREATE INDEX idx_denuncia_respons   ON DENUNCIA (responsavel_id);

-- Navegacao das entidades dependentes
CREATE INDEX idx_evidencia_denuncia ON EVIDENCIA (denuncia_id);
CREATE INDEX idx_notificacao_denunc ON NOTIFICACAO (denuncia_id);
CREATE INDEX idx_chatbot_denuncia   ON CHATBOT_INTERACAO (denuncia_id);

-- Consulta da trilha: por periodo, por usuario e por tipo de acao
CREATE INDEX idx_auditoria_data     ON AUDITORIA_LOG (data_hora DESC);
CREATE INDEX idx_auditoria_usuario  ON AUDITORIA_LOG (usuario);
CREATE INDEX idx_auditoria_acao     ON AUDITORIA_LOG (acao);


-- =============================================================================
--  RESUMO
--
--    CREATE TABLE ....... 12
--    PRIMARY KEY ........ 12   (1 composta: DENUNCIA_HISTORICO)
--    FOREIGN KEY ........ 10
--    UNIQUE .............  5
--    CHECK .............. 27
--    CREATE INDEX ....... 13
--    COMMENT ............ 25
--
--  Evolucao desde a Fase 3: 9 tabelas -> 12 (entram PERFIL, MEMBRO_EQUIPE,
--  DENUNCIA_HISTORICO e AUDITORIA_LOG; sai HISTORICO_STATUS, absorvida pela
--  primeira). CHECK: 5 -> 27. Indices: 8 -> 13. Toda coluna numerica passou a
--  declarar precisao, e a coluna DENUNCIA.tipo deixou de ser texto solto para
--  se tornar chave estrangeira do dominio.
-- =============================================================================
