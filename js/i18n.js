/**
 * i18n.js — Sistema de Tradução do Protege+
 * Suporte: Português (pt) e English (en)
 * Botão de bandeira 🇧🇷/🇺🇸 alterna entre os dois idiomas
 */

const I18n = (() => {

  const TRADUCOES = {
    pt: {
      'nav.tipos':'Tipos de denúncia','nav.como':'Como funciona','nav.fazer':'Fazer Denúncia',
      'nav.status':'Status da Denúncia','nav.servidor':'Área do Servidor',
      'nav.servidor_btn':'🏛 Área do Servidor','nav.seguro':' Modo Seguro',
      'hero.badge':'🏛 Canal Nacional Oficial','hero.titulo':'Canal Nacional de Denúncias',
      'hero.sub':'Faça o registro de situações de violência, abuso e risco de forma segura e, se desejar, de maneira anônima.',
      'hero.btn':'📝 Fazer denúncia','hero.btn2':'🔍 Ver Status da Denúncia',
      'feat.dados':'Proteção de Dados','feat.dados.sub':'✓ Sigilo garantido',
      'feat.canal':'Canal Oficial','feat.canal.sub':'✓ Canal direto com autoridades',
      'feat.anon':'Denúncia Anônima','feat.anon.sub':'✓ Envio sem identificação',
      'feat.acomp':'Acompanhamento','feat.acomp.sub':'✓ Consulta o status da solicitação',
      'tipos.titulo':'Tipos de Denúncia',
      'tipo.viol':'Violência Doméstica','tipo.viol.sub':'Agressões físicas, psicológicas ou ameaças no ambiente familiar',
      'tipo.ass':'Assédio','tipo.ass.sub':'Condutas abusivas que causam constrangimento ou intimidação',
      'tipo.abu':'Abuso','tipo.abu.sub':'Violência contra crianças, adolescentes, idosos ou pessoas vulneráveis',
      'tipo.disc':'Discriminação','tipo.disc.sub':'Casos de preconceito ou tratamento desigual contra pessoa ou grupo',
      'tipo.out':'Outras Ocorrências','tipo.out.sub':'Qualquer situação que represente risco ou violação de direitos',
      'como.titulo':'Como Funciona',
      'como.1.titulo':'Faça o Registro','como.1.sub':'Preencha o formulário com as informações disponíveis',
      'como.2.titulo':'Envio Seguro','como.2.sub':'A denúncia é registrada de forma protegida no sistema',
      'como.3.titulo':'Encaminhamento','como.3.sub':'Os dados são analisados e direcionados aos órgãos responsáveis',
      'form.titulo':'Fazer Denúncia','form.tipo_label':'Tipo de Denúncia *','form.select_ph':'Selecione...',
      'form.estado':'Estado do Local','form.cidade':'Cidade do Local',
      'form.endereco':'Endereço do Local','form.endereco_ph':'Rua, número, bairro',
      'form.data':'Data da Ocorrência',
      'form.desc_label':'Descreva o ocorrido com o máximo de informação possível *',
      'form.desc.ph':'Descreva data/local/horário/pessoas envolvidas/etc. Quanto mais detalhes, melhor...',
      'form.anon_title':'Denúncia Anônima','form.anon_sub':'Sua identidade não será solicitada nem armazenada',
      'form.nome':'Nome (opcional)','form.nome_ph':'Seu nome',
      'form.contato':'Contato (opcional)','form.contato_ph':'E-mail ou telefone',
      'form.upload':'Upload de Evidências','form.upload.sub':'Fotos, documentos, vídeos',
      'form.opcional':'(opcional)',
      'form.audio':'🎙️ Relato em Áudio','form.audio_opt':'(opcional)',
      'form.audio.sub':'Prefere falar? Grave um áudio descrevendo o ocorrido.',
      'form.gravar':'🎙️ Gravar relato em áudio','form.parar':'⏹️ Parar gravação',
      'form.descartar':'🗑️ Descartar',
      'form.geo':'📍 Usar minha localização',
      'form.geo_sub':'Preenche estado, cidade e endereço automaticamente via GPS',
      'form.enviar':'📤 Enviar Denúncia',
      'faq.titulo':'Perguntas Frequentes',
      'faq.q1':'Minhas informações são protegidas?',
      'faq.a1':'Sim. O sistema Protege+ foi desenvolvido para garantir a segurança das informações enviadas. Seus dados são armazenados de forma segura e utilizados apenas para o encaminhamento da denúncia aos órgãos responsáveis.',
      'faq.q2':'Posso fazer uma denúncia anônima?',
      'faq.a2':'Sim. O Protege+ permite o envio de denúncias anônimas. Nesse caso, nenhuma informação pessoal será solicitada ou armazenada.',
      'faq.q3':'Quem recebe a denúncia enviada?',
      'faq.a3':'As denúncias são registradas no sistema e encaminhadas para análise da equipe responsável ou dos órgãos competentes, de acordo com o tipo de ocorrência informada.',
      'faq.q4':'O que devo fazer depois de enviar a denúncia?',
      'faq.a4':'Após o envio, o sistema irá gerar um número de protocolo. Guarde esse número para acompanhar o status da denúncia na área de consulta do site.',
      'faq.q5':'Quanto tempo demora para analisar uma denúncia?',
      'faq.a5':'O tempo de análise pode variar dependendo da complexidade da denúncia e da demanda do sistema. Após o envio, você poderá acompanhar o andamento utilizando o número de protocolo gerado.',
      'emer.titulo':'Canais de emergência',
      'emer.pol':'Polícia Militar','emer.pol.sub':'Para emergências e situações de risco imediato',
      'emer.bom':'Corpo de Bombeiros','emer.bom.sub':'Para incêndios, resgates e acidentes',
      'emer.mul':'Atendimento à Mulher','emer.mul.sub':'Denúncias de violência contra a mulher',
      'emer.dh':'Disque Direitos Humanos','emer.dh.sub':'Para denúncias de violações de direitos humanos',
      'emer.samu':'SAMU','emer.samu.sub':'Atendimento médico de urgência',
      'status.titulo':'Acompanhe sua Denúncia',
      'status.ph':'Digite o número do protocolo (ex: #2026-00001)',
      'status.buscar':'Buscar','status.comp':'Compartilhar',
      'status.rec':'Recebida','status.ana':'Em Análise','status.enc':'Encaminhada','status.con':'Concluída',
      'status.conc_sub':'Concluído','status.and_sub':'Em andamento','status.pend_sub':'Pendente',
      'status.det':'Detalhes da Denúncia','status.hist':'Histórico de Atualizações',
      'footer.priv':'Política de Privacidade','footer.dir':'Diretrizes e Uso Ético',
      'footer.copy':'Projeto acadêmico de inovação em GovTech. Todos os direitos reservados.',
    },

    en: {
      'nav.tipos':'Report Types','nav.como':'How it works','nav.fazer':'Make a Report',
      'nav.status':'Report Status','nav.servidor':'Staff Area',
      'nav.servidor_btn':'🏛 Staff Area','nav.seguro':' Safe Mode',
      'hero.badge':'🏛 Official National Channel','hero.titulo':'National Reporting Channel',
      'hero.sub':'Register situations of violence, abuse and risk safely and, if desired, anonymously.',
      'hero.btn':'📝 Make a report','hero.btn2':'🔍 Check Report Status',
      'feat.dados':'Data Protection','feat.dados.sub':'✓ Privacy guaranteed',
      'feat.canal':'Official Channel','feat.canal.sub':'✓ Direct line to authorities',
      'feat.anon':'Anonymous Report','feat.anon.sub':'✓ Submit without identification',
      'feat.acomp':'Tracking','feat.acomp.sub':'✓ Check your request status',
      'tipos.titulo':'Report Types',
      'tipo.viol':'Domestic Violence','tipo.viol.sub':'Physical, psychological or emotional abuse in the family environment',
      'tipo.ass':'Harassment','tipo.ass.sub':'Abusive conduct causing embarrassment or intimidation',
      'tipo.abu':'Abuse','tipo.abu.sub':'Violence against children, elderly or vulnerable people',
      'tipo.disc':'Discrimination','tipo.disc.sub':'Cases of prejudice or unequal treatment against a person or group',
      'tipo.out':'Other Occurrences','tipo.out.sub':'Any situation representing a risk or violation of rights',
      'como.titulo':'How It Works',
      'como.1.titulo':'Register','como.1.sub':'Fill out the form with the available information',
      'como.2.titulo':'Secure Submission','como.2.sub':'The report is securely registered in the system',
      'como.3.titulo':'Forwarding','como.3.sub':'Data is analyzed and forwarded to the responsible authorities',
      'form.titulo':'Make a Report','form.tipo_label':'Report Type *','form.select_ph':'Select...',
      'form.estado':'State','form.cidade':'City',
      'form.endereco':'Location Address','form.endereco_ph':'Street, number, neighborhood',
      'form.data':'Date of Occurrence',
      'form.desc_label':'Describe what happened in as much detail as possible *',
      'form.desc.ph':'Describe the date, location, time, people involved, etc. The more details, the better...',
      'form.anon_title':'Anonymous Report','form.anon_sub':'Your identity will not be requested or stored',
      'form.nome':'Name (optional)','form.nome_ph':'Your name',
      'form.contato':'Contact (optional)','form.contato_ph':'Email or phone',
      'form.upload':'Upload Evidence','form.upload.sub':'Photos, documents, videos',
      'form.opcional':'(optional)',
      'form.audio':'🎙️ Audio Report','form.audio_opt':'(optional)',
      'form.audio.sub':'Prefer to speak? Record an audio describing what happened.',
      'form.gravar':'🎙️ Record audio report','form.parar':'⏹️ Stop recording',
      'form.descartar':'🗑️ Discard',
      'form.geo':'📍 Use my location',
      'form.geo_sub':'Automatically fills state, city and address via GPS',
      'form.enviar':'📤 Submit Report',
      'faq.titulo':'Frequently Asked Questions',
      'faq.q1':'Is my information protected?',
      'faq.a1':'Yes. The Protege+ system was developed to ensure the security of submitted information. Your data is stored securely and used only for forwarding the report to the responsible authorities.',
      'faq.q2':'Can I make an anonymous report?',
      'faq.a2':'Yes. Protege+ allows anonymous reports. In this case, no personal information will be requested or stored.',
      'faq.q3':'Who receives the submitted report?',
      'faq.a3':'Reports are registered in the system and forwarded for review by the responsible team or competent authorities, according to the type of occurrence reported.',
      'faq.q4':'What should I do after submitting a report?',
      'faq.a4':'After submission, the system will generate a protocol number. Keep this number to track the status of your report in the inquiry area of the site.',
      'faq.q5':'How long does it take to review a report?',
      'faq.a5':'Review time may vary depending on the complexity of the report and system demand. After submission, you can track progress using the generated protocol number.',
      'emer.titulo':'Emergency Contacts',
      'emer.pol':'Military Police','emer.pol.sub':'For emergencies and immediate risk situations',
      'emer.bom':'Fire Department','emer.bom.sub':'For fires, rescues and accidents',
      'emer.mul':'Women\'s Support Line','emer.mul.sub':'Reports of violence against women',
      'emer.dh':'Human Rights Hotline','emer.dh.sub':'For reports of human rights violations',
      'emer.samu':'SAMU','emer.samu.sub':'Emergency medical care',
      'status.titulo':'Track your Report',
      'status.ph':'Enter protocol number (e.g. #2026-00001)',
      'status.buscar':'Search','status.comp':'Share',
      'status.rec':'Received','status.ana':'Under Review','status.enc':'Forwarded','status.con':'Concluded',
      'status.conc_sub':'Completed','status.and_sub':'In progress','status.pend_sub':'Pending',
      'status.det':'Report Details','status.hist':'Update History',
      'footer.priv':'Privacy Policy','footer.dir':'Guidelines and Ethics',
      'footer.copy':'Academic innovation project in GovTech. All rights reserved.',
    }
  };

  let idiomaAtual = localStorage.getItem('idioma') || 'pt';

  const BANDEIRAS = { pt: '🇧🇷', en: '🇺🇸' };
  const PROXIMO   = { pt: 'en',  en: 'pt'  };

  function t(chave) {
    return TRADUCOES[idiomaAtual]?.[chave] || TRADUCOES['pt'][chave] || chave;
  }

  function alternar() { mudar(PROXIMO[idiomaAtual] || 'pt'); }

  function mudar(idioma) {
    if (!TRADUCOES[idioma]) return;
    idiomaAtual = idioma;
    localStorage.setItem('idioma', idioma);
    aplicar();
    _atualizarBotao();
  }

  function aplicar() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const chave = el.getAttribute('data-i18n');
      const prop  = el.getAttribute('data-i18n-prop') || 'textContent';
      const valor = t(chave);
      if      (prop === 'placeholder') el.placeholder = valor;
      else if (prop === 'title')       el.title = valor;
      else                             el.textContent = valor;
    });
    document.documentElement.lang = idiomaAtual;
  }

  function _atualizarBotao() {
    const btn = document.getElementById('btn-idioma');
    if (!btn) return;
    btn.textContent = BANDEIRAS[idiomaAtual] || '🌐';
    btn.title = idiomaAtual === 'pt' ? 'Switch to English' : 'Mudar para Português';
  }

  function init() { aplicar(); _atualizarBotao(); }
  function atual() { return idiomaAtual; }

  return { t, mudar, alternar, aplicar, init, atual };
})();