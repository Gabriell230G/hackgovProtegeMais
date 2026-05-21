<div align="center">

# PROTEGE+
### Sistema Inteligente de Denúncias para Proteção do Cidadão

[![Deploy](https://img.shields.io/badge/🌐_Site_ao_vivo-GitHub_Pages-1B5E20?style=for-the-badge)](https://gabriell230g.github.io/protegePlus/)
[![Repositório](https://img.shields.io/badge/💻_Código_Fonte-GitHub-1565C0?style=for-the-badge)](https://github.com/Gabriell230G/protege-plus-hackgov)
[![HackGov](https://img.shields.io/badge/🏛️_HackGov-Fase_4-F9A825?style=for-the-badge)](#)
[![FIAP](https://img.shields.io/badge/🎓_FIAP-2026-red?style=for-the-badge)](#)

**Solução GovTech desenvolvida para o Enterprise Challenge EGESP — HackGov**  
Canal digital seguro, acessível e inteligente para transformar denúncias em inteligência pública.

</div>

---

## 🗂️ Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Funcionalidades](#-funcionalidades)
- [Componente React — Fase 4](#-componente-react--fase-4)
- [ScoreSystem](#-scoresystem-de-confiabilidade)
- [Segurança da Informação](#-segurança-da-informação)
- [Blockchain](#-reflexão-sobre-blockchain)
- [Banco de Dados Oracle](#-banco-de-dados-oracle)
- [Tecnologias](#-tecnologias-utilizadas)
- [Como Executar](#-como-executar)
- [Acesso Administrativo](#-acesso-administrativo)
- [Roadmap](#-roadmap)
- [Desenvolvedor](#-desenvolvedor)

---

## 🛡️ Sobre o Projeto

O Brasil enfrenta um grave problema de **subnotificação de violência**. Estudos apontam que **61% dos casos de violência contra a mulher não são registrados** — não porque o problema não existe, mas porque as vítimas têm medo: de serem descobertas, de não serem levadas a sério, de um sistema lento e burocrático.

O **Protege+** é uma plataforma GovTech desenvolvida para mudar esse cenário. Não é apenas um formulário online, é um sistema que **transforma denúncias em inteligência pública**, fornecendo dados estratégicos para que gestores tomem decisões mais rápidas e eficazes.

### O sistema atende denúncias de:

| Categoria | Categoria |
|-----------|-----------|
| 🏠 Violência doméstica | 👶 Violência contra crianças e idosos |
| 😰 Assédio moral e sexual | ⚡ Situações de risco e emergência |
| 🚫 Discriminação | 🔴 Abuso e maus-tratos |

---

## ⚙️ Funcionalidades

### 👤 Área do Cidadão

| Funcionalidade | Descrição |
|----------------|-----------|
| 📋 **Registro de denúncias** | Formulário com validação guiada e score em tempo real |
| 🕵️ **Anonimato total** | Campos de identificação ocultados e desabilitados — nenhum dado transmitido |
| 📍 **Geolocalização automática** | Preenchimento via GPS + Nominatim (OpenStreetMap) |
| 🎙️ **Gravação de áudio** | MediaRecorder API com timer, limite de 2 min e prévia antes de enviar |
| 📎 **Upload de evidências** | Fotos, documentos e vídeos convertidos para Base64 (limite 1,5 MB) |
| 🔖 **QR Code do protocolo** | Gerado automaticamente via API QR Server para acompanhamento pelo celular |
| 🔗 **Compartilhamento por link** | URL com hash do protocolo para familiar ou advogado acompanhar |
| 📅 **Timeline de status** | Histórico completo de mudanças com data e hora de cada evento |
| 🌙 **Dark mode** | Alternância sol/lua com preferência salva em localStorage |
| 🌐 **PT/EN** | 74+ elementos traduzidos via atributos `data-i18n` e arquivo `i18n.js` modular |
| 🛡️ **Fake Page de emergência** | Modo seguro que disfarça o sistema como buscador genérico (ativa com 1 clique, desativa com ESC) |
| 🤖 **Chatbot VigIA** | Assistente 24h para guiar o preenchimento e responder dúvidas |

### 🏛️ Área Administrativa

| Funcionalidade | Descrição |
|----------------|-----------|
| 📊 **Dashboard analítico** | 4 gráficos Chart.js: barras por tipo, barras por estado, linha mensal e donut por status |
| 🗺️ **Mapa de calor SVG** | 27 estados do Brasil coloridos por intensidade — clique filtra o backlog automaticamente |
| 🔍 **Filtros avançados** | 6 dimensões simultâneas: tipo, status, score, estado (API IBGE), data início e data fim |
| 📌 **Ícones de evidências** | Colunas 📷 📎 🎙️ indicam presença de foto, documento ou áudio em cada denúncia |
| 🕓 **Histórico de status** | Cada atualização registra data, hora e ID do servidor responsável no array `historico[]` |
| 🔐 **Controle de acesso** | Login com credenciais; erros genéricos para evitar enumeração de usuários |

---

## ⚛️ Componente React — Fase 4

O arquivo **`formulario-react.html`** implementa o formulário de denúncia em **React 18 via CDN**, sem necessidade de Node.js, npm ou processo de build.

### Componentes reutilizáveis

| Componente | Props | Responsabilidade |
|------------|-------|-----------------|
| `FormField` | `label, required, error, children` | Agrupa label, campo e mensagem de erro com layout consistente |
| `StateBanner` | `state, message` | Exibe estado `loading / success / error` com ícone e cor semântica |
| `ScoreBar` | `score (0–100)` | Barra de progresso colorida que recalcula a cada `input` |
| `ModalProtocolo` | `protocolo, score, onClose` | Modal de confirmação com protocolo, classificação e QR Code |

### Módulo ApiClient

Centraliza todas as chamadas HTTP, separando lógica de integração da lógica de interface:

```javascript
ApiClient.getEstados()          // API IBGE — integração real
ApiClient.getCidades(uf)        // API IBGE — integração real
ApiClient.enviarDenuncia(dados) // Simulação Spring Boot (1.2s de latência, 10% chance de erro)
```

### Diferenciais técnicos

- ✅ Validação com mínimo de 20 caracteres e mensagens de erro **inline** (sem `alert()`)
- ✅ Score recalcula a cada caractere digitado — feedback imediato ao cidadão
- ✅ Toggle de anonimato com animação CSS suave
- ✅ Contrato de integração documentado no próprio código (request/response do `POST /v1/denúncias`)
- ✅ Pronto para migração para ambiente React completo (Vite, Next.js) sem refatoração significativa

---

## 📊 ScoreSystem de Confiabilidade

Cada denúncia recebe automaticamente uma **pontuação de 0 a 100** calculada com base em 8 atributos ponderados:

```
Score = Σ (peso_i × atributo_i)

Atributos: descrição detalhada, localização informada, evidências anexadas,
           dados de contato, tipo de ocorrência, horário, anonimato, completude geral
```

| Faixa | Classificação | Ação sugerida |
|-------|---------------|---------------|
| 🟢 70–100 | Alta confiabilidade | Prioridade máxima de atendimento |
| 🟡 40–69 | Média confiabilidade | Análise com solicitação de complemento |
| 🔴 0–39 | Baixa confiabilidade | Triagem adicional necessária |

O score é exibido em tempo real no componente React (`ScoreBar`) e no backlog do painel administrativo.

---

## 🔐 Segurança da Informação

Práticas de segurança implementadas **desde o design** — não como adição posterior:

### 1. Validação e Sanitização de Entradas (Anti-XSS)
Dados do usuário são inseridos no DOM exclusivamente via `textContent` ou `value` — **nunca via `innerHTML`**. Previne ataques de Cross-Site Scripting onde um agressor poderia injetar scripts maliciosos via campos de texto.

### 2. Controle de Acesso por Perfis (RBAC)
Segregação de funções entre **Cidadão** e **Servidor Público**. Tentativas de login inválidas exibem mensagem genérica, sem revelar se o usuário existe ou se a senha está errada (anti-enumeração de usuários).

### 3. Anonimato por Design
Dados armazenados **exclusivamente no `localStorage`** do dispositivo do usuário — zero transmissão para servidores externos. Em denúncias anônimas, nenhum dado identificável é armazenado em nenhuma camada.

### 4. Fake Page de Emergência (Segurança Física)
Em contextos de violência doméstica, a vítima frequentemente usa o dispositivo na presença do agressor. O Modo Seguro substitui instantaneamente a interface por um buscador genérico. Qualquer busca redireciona para o Google real.

```
Ativar:   botão "Modo Seguro" → interface muda em < 100ms
Desativar: tecla ESC ou botão "Voltar ao sistema"
```

> 📋 **Conformidade:** Alinhado à LGPD (Arts. 6°, IX e 46, §2°) e ao OWASP Top 10 (A02:2021 – Cryptographic Failures / A03:2021 – Injection).

---

## ⛓️ Reflexão sobre Blockchain

### Por que blockchain em um sistema de denúncias?

Em um sistema centralizado, o administrador do banco de dados tem poder técnico para **modificar ou excluir qualquer registro**. Em casos de denúncias contra autoridades, isso representa um conflito de interesses estrutural.

### Evento crítico para registro imutável

> **O momento do envio inicial da denúncia** — registrar o hash SHA-256 da denúncia num bloco imutável torna qualquer alteração posterior detectável por qualquer auditoria independente.

### O que registrar (e o que não registrar)

| ✅ Registrar na blockchain | ❌ Não registrar |
|---------------------------|-----------------|
| Hash SHA-256 do conteúdo | Texto completo da descrição |
| Protocolo único de envio | Nome do denunciante |
| Timestamp do registro | Localização exata |
| Hash de cada mudança de status | Evidências em Base64 |
| ID anonimizado do servidor | Dados de contato |

### Arquitetura proposta

**Hyperledger Fabric** (blockchain privada permissionada) — acesso restrito a órgãos autorizados (Ministério da Justiça, Ouvidorias, Ministério Público), mantendo imutabilidade sem expor dados publicamente.

> **Referência:** TSE — [Blockchain no processo eleitoral brasileiro (2022)](https://www.tse.jus.br/eleicoes/eleicoes-2022/documentacao-tecnica-eleitoral/blockchain-no-tse)

---

## 🗄️ Banco de Dados Oracle

Modelagem relacional com **9 tabelas**, PKs, FKs, constraints `CHECK`, `UNIQUE`, `DEFAULT` e **8 índices de performance**. DDL gerado via Oracle SQL Developer Data Modeler.

```sql
-- Principais tabelas
DENUNCIA        -- registro central com score, status e timestamps
HISTORICO       -- log imutável de cada mudança de status
EVIDENCIA       -- metadados das evidências em Base64
SERVIDOR        -- perfis administrativos com controle de acesso
TIPO_DENUNCIA   -- categorias de ocorrências
```

---

## 🛠️ Tecnologias Utilizadas

### Frontend
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript_ES6+-F7DF1E?style=flat&logo=javascript&logoColor=black)
![React](https://img.shields.io/badge/React_18-61DAFB?style=flat&logo=react&logoColor=black)
![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=flat&logo=chartdotjs&logoColor=white)

### Backend & Dados
![Java](https://img.shields.io/badge/Java_17-ED8B00?style=flat&logo=openjdk&logoColor=white)
![Oracle](https://img.shields.io/badge/Oracle_SQL-F80000?style=flat&logo=oracle&logoColor=white)

### APIs & Integrações
![IBGE](https://img.shields.io/badge/API_IBGE-1B5E20?style=flat)
![Nominatim](https://img.shields.io/badge/Nominatim_OpenStreetMap-7EBC6F?style=flat)
![QR Server](https://img.shields.io/badge/API_QR_Server-333?style=flat)
![MediaRecorder](https://img.shields.io/badge/MediaRecorder_API-blueviolet?style=flat)

### Tecnologias planejadas
![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=flat&logo=springboot&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.12-3776AB?style=flat&logo=python&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?style=flat&logo=scikit-learn&logoColor=white)
![Claude](https://img.shields.io/badge/API_Anthropic_(Claude)-CC785C?style=flat)
![Hyperledger](https://img.shields.io/badge/Hyperledger_Fabric-2F3134?style=flat&logo=hyperledger&logoColor=white)

---

## 🚀 Como Executar

O projeto roda **diretamente no navegador**, sem necessidade de servidor, npm ou instalação.

```bash
# Clone o repositório
git clone https://github.com/Gabriell230G/protege-plus-hackgov.git

# Acesse a pasta
cd protege-plus-hackgov

# Abra no navegador
# Basta abrir index.html diretamente no browser
# Ou use o Live Server do VS Code para melhor experiência
```

> **Deploy:** O sistema está em produção em [gabriell230g.github.io/protegePlus](https://gabriell230g.github.io/protegePlus/) — acesse diretamente sem instalar nada.

---

## 🔐 Acesso Administrativo

Para acessar o painel do servidor público:

| Campo | Valor |
|-------|-------|
| Usuário | `admin` |
| Senha | `admin123` |

> ⚠️ Credenciais de demonstração. Em produção real, autenticação JWT/OAuth2 seria implementada.

---

## 🤖 VigIA — Chatbot de Suporte

Assistente virtual disponível 24h para:

- Guiar o cidadão durante o preenchimento da denúncia
- Responder dúvidas sobre anonimato e segurança
- Direcionar casos de emergência
- Reduzir erros de preenchimento

**Próxima evolução:** integração com NLP via **API Anthropic (Claude)** para classificação automática de urgência e identificação de palavras de risco.

---

## 📋 Roadmap

```
✅ Fase 1 — Prototipação inicial e User Stories
✅ Fase 2 — Sprint Backlog, métricas ágeis e backend Java
✅ Fase 3 — Wireframes, testes com usuários, deploy em produção
✅ Fase 4 — React 18, segurança da informação, blockchain

🔜 Próximas evoluções
   ├── Migração completa para React + Vite
   ├── API REST com Spring Boot
   ├── NLP com API Anthropic (Claude)
   ├── Machine Learning com Python + scikit-learn
   ├── Autenticação JWT / OAuth2
   ├── Banco Oracle em nuvem
   ├── Hyperledger Fabric para imutabilidade de registros
   └── Integração com ouvidorias e órgãos públicos
```

---

## 👨‍💻 Desenvolvedor

<div align="center">

**Gabriel Vasconcellos Gomes**  
FIAP — Sistemas de Informação · 2026

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Conectar-0077B5?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/gabriel-vasconcellos-gomes-76a246246/)
[![Email](https://img.shields.io/badge/Email-Contato-D14836?style=for-the-badge&logo=gmail)](mailto:gabriel.gomes0410@gmail.com)
[![GitHub](https://img.shields.io/badge/GitHub-Perfil-181717?style=for-the-badge&logo=github)](https://github.com/Gabriell230G)

</div>

---

<div align="center">

**PROTEGE+** · HackGov — Enterprise Challenge EGESP · FIAP 2026

*Transformando dados em inteligência pública. Transformando denúncias em proteção real.*

</div>
