# Protege+ — Canal Nacional de Denúncias

Plataforma para registro e gestão de denúncias de violência, abuso e violação de direitos, com **canal anônimo para o cidadão** e um **painel inteligente para o gestor público** — Kanban, equipe, mapa, trilha de auditoria e o copiloto de IA **VigIA**.

Projeto desenvolvido para o **HackGov / Challenge FIAP**, em parceria com a EGESP.

**Gabriel Vasconcellos Gomes — RM 561601** · 2SIOA · Fase 5

---

## Como executar

Você precisa apenas de um **JDK 17 ou superior**. O Maven é baixado automaticamente na primeira execução.

### 1. Backend (API Java)

```bash
cd backend
.\build.cmd clean test     # Windows — roda os 24 testes
.\build.cmd run            # sobe a API em http://localhost:8080
```

No Linux ou macOS, use o Maven diretamente:

```bash
cd backend
mvn clean test
mvn spring-boot:run
```

Se preferir gerar o executável:

```bash
.\build.cmd clean package -DskipTests
java -jar target\protege-backend-1.0.0.jar
```

O banco padrão é o **H2 embutido**, criado automaticamente em `backend/data/`. Não exige instalação, serviço nem credencial — é o que permite executar o projeto logo após descompactar.

- **Documentação da API:** <http://localhost:8080/swagger-ui.html>
- **Console do banco:** <http://localhost:8080/h2-console> — JDBC URL `jdbc:h2:file:./data/protege`, usuário `sa`, sem senha

### 2. Front-end (portal + painel)

Sirva por HTTP — abrir o `index.html` com duplo clique faz o navegador bloquear as chamadas por CORS.

```bash
# Live Server no VS Code, ou:
python -m http.server 5500
```

Acesse <http://localhost:5500>. O front detecta o backend sozinho: se a API estiver no ar, usa o banco; se não, cai para o `localStorage` (plano B automático). O console do navegador informa qual modo está ativo.

### 3. IA (VigIA com Gemini) — opcional

```bash
export GEMINI_API_KEY="sua_chave"     # $env:GEMINI_API_KEY no Windows
```

Sem a chave, o VigIA continua funcionando por regras explicáveis. Cada análise declara sua origem (`GEMINI` ou `REGRAS`), para que a decisão automatizada seja auditável.

---

## Usuários de demonstração

Criados automaticamente na primeira execução. Existem quatro para que a **segregação de acesso possa ser verificada**, e não apenas descrita.

| E-mail | Senha | Perfil | Vê identificação | Vê auditoria |
|---|---|---|---|---|
| `admin@protege.gov.br` | `admin123` | ADMIN | sim | sim |
| `gestor@protege.gov.br` | `gestor123` | GESTOR | sim | **não** |
| `atendente@protege.gov.br` | `atendente123` | ATENDENTE | **não** | não |
| `auditor@protege.gov.br` | `auditor123` | AUDITOR | não | sim |

O gestor **não** consulta a trilha de auditoria: quem opera o sistema não fiscaliza o próprio uso dele.

---

## Arquitetura

| Camada | Tecnologia | Por quê |
|---|---|---|
| Front-end | HTML + CSS + JavaScript, React via CDN no formulário | Leve, sem build. Integra APIs públicas (IBGE para estados e cidades, OpenStreetMap para geolocalização) |
| Back-end | **Java 17 + Spring Boot 3.3.4** | Padrão de mercado para APIs corporativas e governamentais |
| Banco (demo) | **H2 embutido** | Zero instalação: o projeto roda ao ser descompactado |
| Banco (produção) | **PostgreSQL / Supabase**; modelo físico em **Oracle** | Scripts DDL, carga e consultas em `database/` |
| Segurança | Spring Security + JWT + BCrypt + RBAC | Perfis reais no token, CORS por lista de origens, limite de requisições por IP |
| Auditoria | Trilha encadeada por SHA-256 | Alteração em qualquer registro invalida a cadeia e é detectada |
| IA | Google Gemini com *fallback* por regras | Sem a chave, o sistema continua funcionando e explicando suas decisões |
| Documentação | Swagger / OpenAPI 3 | Botão *Authorize* permite executar as rotas protegidas pelo navegador |

---

## Endpoints

🔒 exige o cabeçalho `Authorization: Bearer <token>`.

### Canal do cidadão — público

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/denuncias` | Registra denúncia. Devolve `201` com `Location`, protocolo, score e análise da IA |
| `GET` | `/api/denuncias/protocolo/{protocolo}` | Consulta o andamento. Não expõe relato nem endereço |
| `GET` | `/api/vigia/status` | Informa se a IA está em modo Gemini ou Regras |
| `POST` | `/api/auth/login` | Autentica o servidor e devolve o token JWT |

### Painel do órgão

| Método | Rota | Perfil | Descrição |
|---|---|---|---|
| `GET` | `/api/denuncias` | 🔒 | Lista paginada com filtros de status, tipo e UF. **Sem relato e sem endereço** |
| `GET` | `/api/denuncias/{id}` | 🔒 | Detalhe do caso. Consulta sensível: gera auditoria |
| `PUT` | `/api/denuncias/{id}` | 🔒 | Atualiza os dados descritivos |
| `PATCH` | `/api/denuncias/{id}/status` | 🔒 | Muda o status e registra na linha do tempo |
| `PATCH` | `/api/denuncias/{id}/responsavel` | 🔒 | Atribui responsável |
| `DELETE` | `/api/denuncias/{id}?motivo=` | GESTOR, ADMIN | Exclusão lógica com anonimização. Exige motivo |
| `GET/POST/PUT/DELETE` | `/api/equipe` | 🔒 / GESTOR | Gestão da equipe |
| `GET` | `/api/stats` | 🔒 | Totais por status, tipo, urgência e UF |

### Fluxo de atendimento — estruturas de dados

| Método | Rota | Estrutura | Descrição |
|---|---|---|---|
| `GET` | `/api/fluxo/fila` | `PriorityQueue` | Ordem de atendimento: urgência → score → antiguidade |
| `POST` | `/api/fluxo/fila/atender` | heap, `poll` O(log n) | Assume o caso do topo |
| `GET` | `/api/fluxo/pilha` | `ArrayDeque` LIFO | Histórico reversível do servidor |
| `POST` | `/api/fluxo/desfazer` | pilha, `pop` O(1) | Restaura o status anterior sem reescrever o histórico |

### Auditoria

| Método | Rota | Perfil | Descrição |
|---|---|---|---|
| `GET` | `/api/auditoria` | AUDITOR, ADMIN | Trilha paginada, com filtros de período, usuário e ação |
| `GET` | `/api/auditoria/integridade` | AUDITOR, ADMIN | Recalcula a cadeia de hashes e aponta onde foi rompida |
| `GET` | `/api/auditoria/acoes` | AUDITOR, ADMIN | Catálogo das operações auditadas |

### VigIA

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/vigia/analisar/{id}` | 🔒 Reanalisa a urgência de um caso |
| `POST` | `/api/vigia/perguntar` | 🔒 Pergunta livre do gestor. O contexto enviado à IA não contém relatos |

---

## Funcionalidades

**Cidadão** — denúncia com anonimato graduado em três níveis, incluindo canal de retorno anônimo bidirecional; consulta por protocolo; botão de emergência com geolocalização; **Modo Seguro**, que disfarça a tela como um buscador; botão de pânico com saída imediata; múltiplos idiomas; chatbot de atendimento.

**Gestor** — login com perfil, Kanban das denúncias, gestão de equipe, mapa coroplético com limiar de privacidade, score de confiabilidade, painel de estatísticas, fila de priorização automática e o **VigIA**, copiloto que classifica urgência e resume relatos.

**Segurança e privacidade** — JWT com perfil real, mascaramento de dados por perfil, cifragem de campo em repouso, exclusão lógica com anonimização, trilha de auditoria imutável e k-anonimato no mapa (municípios com menos de 3 denúncias não são detalhados, para impedir reidentificação).

---

## Banco de dados

A pasta `database/` traz o modelo físico completo em Oracle:

| Arquivo | Conteúdo |
|---|---|
| `01_ddl_oracle.sql` | 12 tabelas, 10 chaves estrangeiras, 27 restrições CHECK, 13 índices — comentado bloco a bloco |
| `02_dml_carga.sql` | Domínios, equipe, servidores e 120 denúncias geradas deterministicamente |
| `03_consultas.sql` | Consultas analíticas do relatório e consultas de auditoria |

As tabelas de domínio usam **chave natural**: a sigla é a própria chave primária. Por isso as colunas `tipo` e `status` que a aplicação grava **são** as chaves estrangeiras — o modelo documentado é o mesmo que a aplicação usa, e não um diagrama paralelo.

A massa de 120 denúncias é determinística (semente 561601) e serve à análise estatística do relatório. É diferente do `data.sql` do backend, que carrega 5 denúncias apenas para a navegação da demonstração.

---

## Testes

```bash
cd backend
.\build.cmd clean test
```

**24 testes** cobrindo: regras do score, classificação de urgência do VigIA, ordenação da fila de prioridade, comportamento LIFO da pilha e detecção de adulteração da trilha de auditoria — incluindo testes que alteram e removem registros de propósito e exigem que o sistema aponte onde a cadeia quebrou.

---

## Estrutura

```
.
├── index.html
├── css/                    6 folhas de estilo
├── js/                     20 módulos
│   ├── backend.js          ponte com a API (JWT + fallback localStorage)
│   ├── anonimato.js        anonimato graduado e elo de mão dupla
│   ├── acesso.js           controle de acesso por papéis no painel
│   ├── lgpd.js             cifragem de campo e painel de conformidade
│   ├── mapa-gestor.js      mapa com k-anonimato
│   └── ...
├── database/               modelo físico Oracle
└── backend/
    ├── build.cmd           bootstrap: baixa o Maven se necessário
    ├── pom.xml
    └── src/
        ├── main/java/br/gov/protege/
        │   ├── audit/        @Auditavel e o interceptador da trilha
        │   ├── config/       OpenAPI
        │   ├── controller/   endpoints e tratamento de erros
        │   ├── dto/          contratos de entrada e saída
        │   ├── exception/    exceções de domínio
        │   ├── mapper/       entidade → resposta, por perfil
        │   ├── model/        entidades JPA
        │   ├── repository/   Spring Data JPA
        │   ├── security/     JWT, RBAC, CORS, limite por origem
        │   ├── service/      score, IA, fila, pilha e auditoria
        │   └── util/         mascaramento de dados pessoais
        └── test/java/...     24 testes JUnit
```

---

## Links

- 🎥 **Vídeo do pitch:** _(a inserir)_
- 💻 **Repositório:** <https://github.com/Gabriell230G/hackgovProtegeMais>
