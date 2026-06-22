import React, { useState } from 'react';
import { Shield, UserPlus, UserCheck, Plus, X, Edit3, AlertTriangle, ShieldAlert, 
Syringe, Activity, AlertCircle, CheckCircle, ClipboardSignature, Loader2, BrainCircuit, ClipboardList,
Droplets, Ambulance, Bandage, Milk, Droplet, Wind, ChevronDown, ChevronRight, TestTube, Podcast,
CheckCircle2, Printer, BriefcaseMedical } from 'lucide-react';
import { ESCALA_DOR, PRECAUCOES, CARACTERISTICAS_DIURESE } from '../../constants/clinicalLists';
import ModalChecklistEnfermagem from '../../components/modals/ModalChecklistEnfermagem';

const NursingDashboard = ({
  currentPatient,
  calculateAge,
  userProfile,
  isEditable,
  handleNursingAdmission,
  handleViewNursingAdmission,
  updateNested,
  handleBlurSave,
  addLesao,
  removeLesao,
  updateLesaoData,
  registrarEventoAdverso,
  generateNursingAI_Evolution,
  isNursingRole,
  isGeneratingNursingAI
}) => {

  const [showNursingChecklistModal, setShowNursingChecklistModal] = useState(false);
  const [showRegistrosDiarios, setShowRegistrosDiarios] = useState(false);
  const [modalCurativo, setModalCurativo] = useState({
    isOpen: false,
    data: '',
    horario: '',
    lesaoId: '',
    lesaoLocal: '',
    tipoCurativo: '',
    observacao: ''
  });

  const [modalAcessoPeriferico, setModalAcessoPeriferico] = useState({
    isOpen: false,
    horario: '',
    local: '',
    calibre: ''
  });

  const [modalCVC, setModalCVC] = useState({
    isOpen: false,
    horario: '',
    tipoCateter: '',
    indicacao: '',
    passagem: '',
    motivoTroca: '',
    localInserção: '',
    puncaoUnica: '',
    quantasPuncoes: '',
    dificuldades: [],
    barreiras: {
      higienizacao: false,
      gorro: false,
      avental: false,
      mascara: false,
      luvas: false,
      campos: false,
      assepsia: false,
      tecnicaAssptica: false,
      curativo24h: false
    }
  });

  const [modalManutencaoCVC, setModalManutencaoCVC] = useState({
    isOpen: false,
    horario: '',
    trocaCurativo: false,
    motivoTipo: '',
    motivoInfecao: '',
    motivoObstrucao: '',
    motivoTermino: '',
    motivoObito: '',
    motivoOutros: ''
  });

  const [modalSVD, setModalSVD] = useState({
    isOpen: false,
    horario: '',
    indicacao: '',
    justificativa: '',
    genero: '',
    itens: {
      privacidade: false,
      higienizacao: false,
      epi: false,
      higieneIntima: false,
      higienizacaoPosHigiene: false,
      pacoteAberto: false,
      luvasEsteris: false,
      antissepsia: false,
      xilocaina: false,
      xilocainaSeringa: false,
      campoFenestrado: false,
      introducao1op: false,
      tecnicaAssptica: false,
      insuflacaoBalao: false,
      fixacao: false,
      higienizacaoPos: false
    },
    observacao: ''
  });

  const [modalManutencaoSVD, setModalManutencaoSVD] = useState({
    isOpen: false,
    horario: '',
    unidadeInserção: '',
    tipoSonda: '',
    itens: {
      higieneMeato: false,
      uretraIntegra: false,
      fixacaoAdequada: false,
      fixacaoSemTracao: false,
      fluxoDesobstruido: false,
      nivelBolsa: false,
      bolsaAbaixoBexiga: false,
      drenagemFechado: false,
      aspectoUrina: false
    },
    observacao: ''
  });

  const [modalGasometria, setModalGasometria] = useState({
    isOpen: false,
    horario: '',
    tipo: ''
  });

    const [modalHemotransfusao, setModalHemotransfusao] = useState({
    isOpen: false,
    horarioInicio: '',
    hemocomponente: '',
    outroHemocomponente: '',
    numeroBolsa: '',
    grupoABO: '',
    rh: '',
    volume: '',
    validade: '',
    crossmatch: false,
    acessoVenoso: false,
    equipoFiltro: false,
    sinaisVitais: {
      pre: { pa: '', fc: '', fr: '', sat: '', temp: '' },
      min15: { pa: '', fc: '', fr: '', sat: '', temp: '' },
      min30: { pa: '', fc: '', fr: '', sat: '', temp: '' },
      min60: { pa: '', fc: '', fr: '', sat: '', temp: '' },
      final: { pa: '', fc: '', fr: '', sat: '', temp: '' }
    },
    reacao: '',
    reacaoDescricao: '',
    suspendeu: false,
    conduta: '',
    horarioTermino: '',
    volumeInfundido: '',
    observacao: ''
  });

  const [modalECG, setModalECG] = useState({
    isOpen: false,
    horario: '',
    posicionamentoV3R: false
  });

  const [modalFleetEnema, setModalFleetEnema] = useState({
    isOpen: false,
    horario: ''
  });

  const [modalNPT, setModalNPT] = useState({
    isOpen: false,
    horario: '',
    acessoCentralExclusivo: false
  });

  const [modalAspiracao, setModalAspiracao] = useState({
    isOpen: false,
    horario: '',
    viaAerea: '',
    quantidade: '',
    caracteristica: '',
    oxigenacaoPre: '',
    intercorrencias: ''
  });

  // === PULSADOR PARA MANUTENÇÃO ===
  const pulseRedStyle = document.createElement('style');
  pulseRedStyle.textContent = `
    @keyframes pulse-soft-red {
      0%, 100% { background-color: #fecaca; border-color: #fca5a5; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
      50% { background-color: #fca5a5; border-color: #ef4444; box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
    }
    .pulse-manutencao {
      animation: pulse-soft-red 1.5s ease-in-out infinite;
    }
  `;
  document.head.appendChild(pulseRedStyle);

  const precisaManutencaoHoje = (dataInsercao, historicoManutencao) => {
    if (!dataInsercao) return false;
    const hoje = new Date().toISOString().split('T')[0];
    const temManutencaoHoje = historicoManutencao?.some(m => m.data === hoje);
    return !temManutencaoHoje;
  };

  const svdPrecisaManut = precisaManutencaoHoje(
    currentPatient?.enfermagem?.svdData,
    currentPatient?.enfermagem?.historicoManutencaoSVD
  );

  const cvcPrecisaManut = precisaManutencaoHoje(
    currentPatient?.enfermagem?.cvcData,
    currentPatient?.enfermagem?.historicoManutencaoCVC
  );

  const shileyPrecisaManut = precisaManutencaoHoje(
    currentPatient?.enfermagem?.shileyData,
    currentPatient?.enfermagem?.historicoManutencaoShiley
  );

  // Placeholders para botões de Ação (Modais serão criados em seguida)
  const handleAcaoEnfermagem = (tipo) => {
    if (tipo === 'Curativo') {
      const hoje = new Date().toISOString().split('T')[0];
      setModalCurativo({ isOpen: true, data: hoje, horario: '', lesaoId: '', lesaoLocal: '', tipoCurativo: '', observacao: '' });
      return;
    }
    if (tipo === 'Acesso Periférico') {
      setModalAcessoPeriferico({ isOpen: true, horario: '', local: '', calibre: '' });
      return;
    }
    if (tipo === 'Inserção CVC') {
      setModalCVC({ isOpen: true, horario: '', tipoCateter: '', indicacao: '', passagem: '', motivoTroca: '', localInserção: '', puncaoUnica: '', quantasPuncoes: '', dificuldades: [], barreiras: { higienizacao: false, gorro: false, avental: false, mascara: false, luvas: false, campos: false, assepsia: false, tecnicaAssptica: false, curativo24h: false } });
      return;
    }
    if (tipo === 'Manutenção CVC') {
      setModalManutencaoCVC({ isOpen: true, horario: '', trocaCurativo: '', motivoInfecao: '', motivoObstrucao: '', motivoTermino: '', motivoObito: '', motivoOutros: '' });
      return;
    }
    if (tipo === 'SVD') {
      setModalSVD({ isOpen: true, horario: '', indicacao: '', justificativa: '', genero: '', observacao: '', itens: { privacidade: false, higienizacao: false, epi: false, higieneIntima: false, higienizacaoPosHigiene: false, pacoteAberto: false, luvasEsteris: false, antissepsia: false, xilocaina: false, xilocainaSeringa: false, campoFenestrado: false, introducao1op: false, tecnicaAssptica: false, insuflacaoBalao: false, fixacao: false, higienizacaoPos: false } });
      return;
    }
    if (tipo === 'Manutenção SVD') {
      setModalManutencaoSVD({
        isOpen: true, horario: '', unidadeInserção: '', tipoSonda: '', itens: { higieneMeato: false, uretraIntegra: false, fixacaoAdequada: false, fixacaoSemTracao: false, fluxoDesobstruido: false, nivelBolsa: false, bolsaAbaixoBexiga: false, drenagemFechado: false, aspectoUrina: false }, observacao: '' });
      return;
    }
    if (tipo === 'Gasometria') {
      setModalGasometria({ isOpen: true, horario: '', tipo: '' });
      return;
    }
    if (tipo === 'Hemotransfusão') {
      setModalHemotransfusao({
        isOpen: true,
        horarioInicio: '',
        hemocomponente: '',
        outroHemocomponente: '',
        numeroBolsa: '',
        grupoABO: '',
        rh: '',
        volume: '',
        validade: '',
        crossmatch: false,
        acessoVenoso: false,
        equipoFiltro: false,
        sinaisVitais: {
          pre: { pa: '', fc: '', fr: '', sat: '', temp: '' },
          min15: { pa: '', fc: '', fr: '', sat: '', temp: '' },
          min30: { pa: '', fc: '', fr: '', sat: '', temp: '' },
          min60: { pa: '', fc: '', fr: '', sat: '', temp: '' },
          final: { pa: '', fc: '', fr: '', sat: '', temp: '' }
        },
        reacao: '',
        reacaoDescricao: '',
        suspendeu: false,
        conduta: '',
        horarioTermino: '',
        volumeInfundido: '',
        observacao: ''
      });
      return;
    }
    if (tipo === 'ECG') {
      setModalECG({ isOpen: true, horario: '', posicionamentoV3R: false });
      return;
    }
    if (tipo === 'Fleet Enema') {
      setModalFleetEnema({ isOpen: true, horario: '' });
      return;
    }
    if (tipo === 'NPT') {
      setModalNPT({ isOpen: true, horario: '', acessoCentralExclusivo: false });
      return;
    }
    if (tipo === 'Aspiração Traqueal') {
      setModalAspiracao({
        isOpen: true,
        horario: '',
        viaAerea: '',
        quantidade: '',
        caracteristica: '',
        oxigenacaoPre: '',
        intercorrencias: ''
      });
      return;
    }
  };

  const salvarCurativo = () => {
    if (!modalCurativo.horario || !modalCurativo.lesaoId || !modalCurativo.tipoCurativo) return;
    
    const now = new Date();
    const dataRegistro = modalCurativo.data || `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    
    // Busca as lesões atuais
    const lesoes = [...(currentPatient.enfermagem?.lesoes || [])];
    
    // Atualiza o curativo da lesão selecionada
    const lesoesAtualizadas = lesoes.map(l => {
      if (l.id === modalCurativo.lesaoId) {
        const historico = l.historicoCurativos || [];
        return {
          ...l,
          curativo: modalCurativo.tipoCurativo,
          ultimoCurativoData: dataRegistro,
          ultimoCurativoHorario: modalCurativo.horario,
          observacaoCurativo: modalCurativo.observacao || l.observacaoCurativo || '',
          historicoCurativos: [
            ...historico,
            { data: dataRegistro, horario: modalCurativo.horario, tipo: modalCurativo.tipoCurativo, obs: modalCurativo.observacao }
          ]
        };
      }
      return l;
    });
    
    updateNested("enfermagem", "lesoes", lesoesAtualizadas);
    
    // 🔥 TAMBÉM salva em um histórico independente de curativos (para evolução)
    const registroCurativo = {
      tipo: 'Curativo',
      data: dataRegistro,
      horario: modalCurativo.horario,
      local: modalCurativo.lesaoLocal || modalCurativo.local || 'N/A',
      tipoCurativo: modalCurativo.tipoCurativo,
      observacao: modalCurativo.observacao || ''
    };
    const historicoCurativos = [...(currentPatient.enfermagem?.historicoCurativos || []), registroCurativo];
    updateNested("enfermagem", "historicoCurativos", historicoCurativos);
    
    handleBlurSave(`Enfermagem: Curativo realizado em ${modalCurativo.lesaoLocal} - ${modalCurativo.tipoCurativo}`);
    setModalCurativo({ ...modalCurativo, isOpen: false });
  };

  const salvarAcessoPeriferico = () => {
    if (!modalAcessoPeriferico.horario || !modalAcessoPeriferico.local || !modalAcessoPeriferico.calibre) return;

    updateNested("enfermagem", "avpLocal", modalAcessoPeriferico.local);
    updateNested("enfermagem", "avpCalibre", modalAcessoPeriferico.calibre);
    updateNested("enfermagem", "avpHorario", modalAcessoPeriferico.horario);
    const hoje = new Date();
    const dataISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    updateNested("enfermagem", "avpData", dataISO);
    handleBlurSave(`Enfermagem: Acesso Periférico em ${modalAcessoPeriferico.local} - ${modalAcessoPeriferico.calibre}`);
    setModalAcessoPeriferico({ ...modalAcessoPeriferico, isOpen: false });
  };

  const salvarCVC = () => {
    if (!modalCVC.horario || !modalCVC.tipoCateter || !modalCVC.localInserção) return;

    const hoje = new Date();
    const dataISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

    const barreirasArray = Object.entries(modalCVC.barreiras).map(([key, value]) => ({
      item: key,
      label: {
        higienizacao: 'Higienização das mãos',
        gorro: 'Gorro/Touca',
        avental: 'Avental Cirúrgico',
        mascara: 'Máscara',
        luvas: 'Luvas Estéreis',
        campos: 'Campos Estéreis Grandes',
        assepsia: 'Assepsia com Clorexidina Alcoólica 0,5%',
        tecnicaAssptica: 'Técnica Asséptica',
        curativo24h: 'Curativo com Gaze e Micropore a cada 24h'
      }[key] || key,
      cumprida: value
    }));

    const totalBarreiras = barreirasArray.length;
    const barreirasFeitas = barreirasArray.filter(b => b.cumprida).length;
    const todasBarreirasOK = barreirasFeitas === totalBarreiras;

    const registro = {
      tipo: 'Inserção CVC',
      data: dataISO,
      horario: modalCVC.horario,
      tipoCateter: modalCVC.tipoCateter,
      indicacao: modalCVC.indicacao,
      passagem: modalCVC.passagem,
      motivoTroca: modalCVC.motivoTroca || '',
      localInserção: modalCVC.localInserção,
      puncaoUnica: modalCVC.puncaoUnica,
      quantasPuncoes: modalCVC.quantasPuncoes || '',
      dificuldades: modalCVC.dificuldades,
      
      // ✅ ESTRUTURA PARA RELATÓRIO DE CONFORMIDADE
      barreiras: {
        itens: barreirasArray,
        total: totalBarreiras,
        cumpridas: barreirasFeitas,
        todasCumpridas: todasBarreirasOK,
        resumo: `${barreirasFeitas}/${totalBarreiras}${todasBarreirasOK ? ' ✅' : ' ❌'}`
      }
    };

    // Histórico do paciente
    const historico = [...(currentPatient.enfermagem?.historicoCVC || []), registro];
    updateNested("enfermagem", "historicoCVC", historico);
    updateNested("enfermagem", "ultimoCVC", registro);

    // Sincroniza com a nursingdashboard
    let localExibicao = modalCVC.localInserção;
    if (modalCVC.tipoCateter === 'Shiley') {
      const mapaShiley = {
        'Subclávia D': 'VSCD', 'Subclávia E': 'VSCE',
        'Jugular D': 'VJID', 'Jugular E': 'VJIE',
        'Femoral D': 'VFID', 'Femoral E': 'VFIE'
      };
      localExibicao = mapaShiley[modalCVC.localInserção] || modalCVC.localInserção;
      updateNested("enfermagem", "shileyLocal", localExibicao);
      updateNested("enfermagem", "shileyData", dataISO);
    } else {
      updateNested("enfermagem", "cvcLocal", modalCVC.localInserção);
      updateNested("enfermagem", "cvcData", dataISO);
    }

    handleBlurSave(`Enfermagem: Inserção ${modalCVC.tipoCateter} em ${modalCVC.localInserção} - Barreiras: ${barreirasFeitas}/${totalBarreiras}`);
    setModalCVC({ ...modalCVC, isOpen: false });
    
    const printWindow = window.open("", "_blank");
    const profNome = userProfile?.nome || "_____________________________";
    const profConselho = userProfile?.conselho || "CONSELHO";
    const profNumero = userProfile?.numeroConselho || "_________________";
    setTimeout(() => gerarPDF_CVC(registro, profNome, profConselho, profNumero, printWindow), 500);
  };

  const salvarManutencaoCVC = () => {
    if (!modalManutencaoCVC.horario) return;

    const hoje = new Date();
    const dataISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

    const manutencao = {
      tipo: 'Manutenção CVC',
      data: dataISO,
      horario: modalManutencaoCVC.horario,
      trocaCurativo: modalManutencaoCVC.trocaCurativo,
      motivo: {
        infeccao: modalManutencaoCVC.motivoInfecao,
        obstrucao: modalManutencaoCVC.motivoObstrucao,
        terminoTerapia: modalManutencaoCVC.motivoTermino,
        obito: modalManutencaoCVC.motivoObito,
        outros: modalManutencaoCVC.motivoOutros
      }
    };

    const historico = [...(currentPatient.enfermagem?.historicoManutencaoCVC || []), manutencao];
    updateNested("enfermagem", "historicoManutencaoCVC", historico);

    handleBlurSave(`Enfermagem: Manutenção CVC - Troca curativo: ${modalManutencaoCVC.trocaCurativo ? 'Sim' : 'Não'}`);
    setModalManutencaoCVC({ ...modalManutencaoCVC, isOpen: false });
  };

  const salvarSVD = () => {
    if (!modalSVD.horario) return;

    const hoje = new Date();
    const dataISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

    const itensArray = Object.entries(modalSVD.itens).map(([key, value]) => ({
      item: key,
      label: {
        privacidade: 'Privacidade do paciente garantida',
        higienizacao: 'Higienização das mãos',
        epi: 'Uso correto de EPI (gorro, máscara, luvas)',
        higieneIntima: 'Higiene íntima com água e sabão',
        higienizacaoPosHigiene: 'Higienização das mãos após higiene íntima',
        pacoteAberto: 'Pacote de cateterismo aberto corretamente',
        luvasEsteris: 'Luvas estéreis na técnica correta',
        antissepsia: 'Antissepsia da genitália com Clorexidina aquosa',
        xilocaina: 'Xilocaína estéril de uso único',
        xilocainaSeringa: 'Sondagem masculina (20ml xilocaína na seringa)',
        campoFenestrado: 'Campo estéril fenestrado entre MMII',
        introducao1op: 'Introdução da sonda na 1ª oportunidade',
        tecnicaAssptica: 'Inserção do cateter na técnica asséptica',
        insuflacaoBalao: 'Insuflação do balão',
        fixacao: 'Fixação da sonda',
        higienizacaoPos: 'Higienização das mãos pós-procedimento'
      }[key] || key,
      cumprida: value
    }));

    const total = itensArray.length;
    const cumpridos = itensArray.filter(i => i.cumprida).length;

    const registro = {
      tipo: 'Passagem SVD',
      data: dataISO,
      horario: modalSVD.horario,
      indicacao: modalSVD.indicacao,
      justificativa: modalSVD.justificativa,
      genero: modalSVD.genero,
      itens: {
        lista: itensArray,
        total,
        cumpridos,
        todosCumpridos: cumpridos === total,
        resumo: `${cumpridos}/${total}${cumpridos === total ? ' ✅' : ' ❌'}`
      },
      observacao: modalSVD.observacao
    };

    const historicoAntigo = currentPatient.enfermagem?.historicoSVD;
    const historicoArray = Array.isArray(historicoAntigo) ? historicoAntigo : [];
    const historico = [...historicoArray, registro];
    updateNested("enfermagem", "historicoSVD", historico); // CORRIGIDO
    updateNested("enfermagem", "ultimoSVD", registro);
    updateNested("enfermagem", "svdData", dataISO);

    handleBlurSave(`Enfermagem: Passagem SVD - ${cumpridos}/${total} itens`);
    setModalSVD({ ...modalSVD, isOpen: false });
    
    // 🔥 GERA PDF
    const nomeProf = userProfile?.nome || "_____________________________";
    const conselhoProf = userProfile?.conselho || "CONSELHO";
    const numConselho = userProfile?.numeroConselho || "_________________";
    const printWindow = window.open("", "_blank");
    setTimeout(() => gerarPDF_InsercaoSVD(registro, nomeProf, conselhoProf, numConselho, printWindow), 500);
  };

  const salvarManutencaoSVD = () => {
    if (!modalManutencaoSVD.horario) return;

    const hoje = new Date();
    const dataISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

    const itensArray = Object.entries(modalManutencaoSVD.itens).map(([key, value]) => ({
      item: key,
      label: {
        higieneMeato: 'Higiene do meato uretral',
        uretraIntegra: 'Uretra íntegra',
        fixacaoAdequada: 'Fixação em local adequado',
        fixacaoSemTracao: 'Fixação sem tração do cateter',
        fluxoDesobstruido: 'Fluxo de urina desobstruído',
        nivelBolsa: 'Nível da bolsa até 2/3 do volume total',
        bolsaAbaixoBexiga: 'Bolsa abaixo da altura da bexiga',
        drenagemFechado: 'Sistema de drenagem fechado',
        aspectoUrina: 'Aspecto da urina normal'
      }[key] || key,
      cumprida: value
    }));

    const total = itensArray.length;
    const cumpridos = itensArray.filter(i => i.cumprida).length;

    const registro = {
      tipo: 'Manutenção SVD',
      data: dataISO,
      horario: modalManutencaoSVD.horario,
      unidadeInserção: modalManutencaoSVD.unidadeInserção,
      tipoSonda: modalManutencaoSVD.tipoSonda,
      itens: {
        lista: itensArray,
        total,
        cumpridos,
        todosCumpridos: cumpridos === total,
        resumo: `${cumpridos}/${total}${cumpridos === total ? ' ✅' : ' ❌'}`
      },
      observacao: modalManutencaoSVD.observacao
    };

    const historico = [...(currentPatient.enfermagem?.historicoManutencaoSVD || []), registro];
    updateNested("enfermagem", "historicoManutencaoSVD", historico);
    updateNested("enfermagem", "ultimoManutencaoSVD", registro);

    handleBlurSave(`Enfermagem: Manutenção SVD - ${cumpridos}/${total} itens`);
    setModalManutencaoSVD({ ...modalManutencaoSVD, isOpen: false });
  };

  const salvarGasometria = () => {
    if (!modalGasometria.horario || !modalGasometria.tipo) return;

    const hoje = new Date();
    const dataISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

    const registro = {
      tipo: 'Gasometria',
      data: dataISO,
      horario: modalGasometria.horario,
      tipoGasometria: modalGasometria.tipo
    };

    const historico = [...(currentPatient.enfermagem?.historicoGasometria || []), registro];
    updateNested("enfermagem", "historicoGasometria", historico);
    updateNested("enfermagem", "ultimaGasometria", registro);

    handleBlurSave(`Enfermagem: Gasometria ${modalGasometria.tipo}`);
    setModalGasometria({ ...modalGasometria, isOpen: false });
  };

  const salvarHemotransfusao = () => {
    if (!modalHemotransfusao.horarioInicio || !modalHemotransfusao.hemocomponente) return;

    const hoje = new Date();
    const dataISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

    const registro = {
      tipo: 'Hemotransfusão',
      data: dataISO,
      horarioInicio: modalHemotransfusao.horarioInicio,
      hemocomponente: modalHemotransfusao.hemocomponente === 'Outro'
        ? `Outro: ${modalHemotransfusao.outroHemocomponente}`
        : modalHemotransfusao.hemocomponente,
      numeroBolsa: modalHemotransfusao.numeroBolsa,
      grupoABO: modalHemotransfusao.grupoABO,
      rh: modalHemotransfusao.rh,
      volume: modalHemotransfusao.volume,
      validade: modalHemotransfusao.validade,
      duplaChecagem: {
        crossmatch: modalHemotransfusao.crossmatch,
        consentimento: modalHemotransfusao.consentimento,
        acessoVenoso: modalHemotransfusao.acessoVenoso,
        equipoFiltro: modalHemotransfusao.equipoFiltro
      },
      sinaisVitais: modalHemotransfusao.sinaisVitais,
      reacao: modalHemotransfusao.reacao,
      reacaoDescricao: modalHemotransfusao.reacaoDescricao,
      suspendeu: modalHemotransfusao.suspendeu,
      conduta: modalHemotransfusao.conduta,
      horarioTermino: modalHemotransfusao.horarioTermino,
      volumeInfundido: modalHemotransfusao.volumeInfundido,
      observacao: modalHemotransfusao.observacao
    };

    const historico = [...(currentPatient.enfermagem?.historicoHemotransfusao || []), registro];
    updateNested("enfermagem", "historicoHemotransfusao", historico);
    updateNested("enfermagem", "ultimaHemotransfusao", registro);

    handleBlurSave(`Enfermagem: Hemotransfusão - ${modalHemotransfusao.hemocomponente}`);
    setModalHemotransfusao({ ...modalHemotransfusao, isOpen: false });
    
    // 🔥 GERA PDF
    const nomeProf = userProfile?.nome || "_____________________________";
    const conselhoProf = userProfile?.conselho || "CONSELHO";
    const numConselho = userProfile?.numeroConselho || "_________________";
    const printWindow = window.open("", "_blank");
    setTimeout(() => gerarPDF_Hemotransfusao(registro, nomeProf, conselhoProf, numConselho, printWindow), 500);
  };

  const salvarECG = () => {
    if (!modalECG.horario) return;

    const hoje = new Date();
    const dataISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

    const registro = {
      tipo: 'ECG',
      data: dataISO,
      horario: modalECG.horario,
      posicionamentoV3R: modalECG.posicionamentoV3R
    };

    const historico = [...(currentPatient.enfermagem?.historicoECG || []), registro];
    updateNested("enfermagem", "historicoECG", historico);
    updateNested("enfermagem", "ultimoECG", registro);

    handleBlurSave(`Enfermagem: ECG ${modalECG.horario}`);
    setModalECG({ ...modalECG, isOpen: false });
  };

  const salvarFleetEnema = () => {
    if (!modalFleetEnema.horario) return;

    const hoje = new Date();
    const dataISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

    const registro = {
      tipo: 'Fleet Enema',
      data: dataISO,
      horario: modalFleetEnema.horario
    };

    const historico = [...(currentPatient.enfermagem?.historicoFleetEnema || []), registro];
    updateNested("enfermagem", "historicoFleetEnema", historico);
    updateNested("enfermagem", "ultimoFleetEnema", registro);

    handleBlurSave(`Enfermagem: Fleet Enema ${modalFleetEnema.horario}`);
    setModalFleetEnema({ ...modalFleetEnema, isOpen: false });
  };

  const salvarNPT = () => {
    if (!modalNPT.horario) return;

    const hoje = new Date();
    const dataISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

    const registro = {
      tipo: 'NPT',
      data: dataISO,
      horario: modalNPT.horario,
      acessoCentralExclusivo: modalNPT.acessoCentralExclusivo
    };

    const historico = [...(currentPatient.enfermagem?.historicoNPT || []), registro];
    updateNested("enfermagem", "historicoNPT", historico);
    updateNested("enfermagem", "ultimoNPT", registro);

    handleBlurSave(`Enfermagem: NPT ${modalNPT.horario}`);
    setModalNPT({ ...modalNPT, isOpen: false });
  };

  const salvarAspiracao = () => {
    if (!modalAspiracao.horario || !modalAspiracao.quantidade || !modalAspiracao.caracteristica) return;

    const hoje = new Date();
    const dataISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

    const registro = {
      tipo: 'Aspiração Traqueal',
      data: dataISO,
      horario: modalAspiracao.horario,
      viaAerea: modalAspiracao.viaAerea,
      quantidade: modalAspiracao.quantidade,
      caracteristica: modalAspiracao.caracteristica,
      oxigenacaoPre: modalAspiracao.oxigenacaoPre,
      intercorrencias: modalAspiracao.intercorrencias
    };

    const historico = [...(currentPatient.enfermagem?.historicoAspiracao || []), registro];
    updateNested("enfermagem", "historicoAspiracao", historico);
    updateNested("enfermagem", "ultimaAspiracao", registro);

    handleBlurSave(`Enfermagem: Aspiração Traqueal - ${modalAspiracao.quantidade}/${modalAspiracao.caracteristica}`);
    setModalAspiracao({ ...modalAspiracao, isOpen: false });
  };

  // ==============================================================
  // GERADOR DE PDF — CHECKLIST INSERÇÃO CVC
  // ==============================================================
  const imprimirChecklistCVC = () => {
    if (!currentPatient) return;

    const ultimo = currentPatient.enfermagem?.ultimoCVC;
    if (!ultimo) {
      alert("Nenhum registro de inserção de CVC encontrado para imprimir.");
      return;
    }

    const idade = calculateAge(currentPatient.dataNascimento) || "__";
    const hoje = new Date().toLocaleDateString('pt-BR');
    const dataProcedimento = ultimo.data?.split('-').reverse().join('/') || hoje;

    // Dados do profissional logado
    const nomeProf = userProfile?.nome || "_____________________________";
    const conselhoProf = userProfile?.conselho || "CONSELHO";
    const numConselho = userProfile?.numeroConselho || "_________________";

    // Barreiras
    const barreiras = ultimo.barreiras?.itens || [];
    const totalBarreiras = ultimo.barreiras?.total || 0;
    const cumpridas = ultimo.barreiras?.cumpridas || 0;
    const todasOK = ultimo.barreiras?.todasCumpridas || false;

    // Motivo da troca (se houver)
    const motivosTroca = [];
    if (ultimo.motivoTroca === 'Infiltração') motivosTroca.push('Infiltração');
    if (ultimo.motivoTroca === 'Obstrução') motivosTroca.push('Obstrução');
    if (ultimo.motivoTroca === 'Suspeita de Infecção') motivosTroca.push('Suspeita de Infecção');
    if (ultimo.motivoTroca === 'Término de Terapia') motivosTroca.push('Término de Terapia');
    if (ultimo.motivoTroca === 'Óbito') motivosTroca.push('Óbito');
    if (ultimo.motivoTroca === 'Outros') motivosTroca.push('Outros');

    const printWindow = window.open("", "_blank");

    let html = `<!DOCTYPE html>
<html><head><title>Checklist Inserção CVC - ${currentPatient.nome}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #222; }
  .header { border-bottom: 3px solid #1a5276; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
  .header h1 { font-size: 16px; color: #1a5276; margin: 0 0 5px 0; text-transform: uppercase; }
  .header-info { font-size: 11px; color: #555; line-height: 1.6; }
  .paciente-box { background: #f0f4f8; border-left: 4px solid #1a5276; padding: 10px 15px; margin-bottom: 20px; border-radius: 0 6px 6px 0; }
  .paciente-box table { width: 100%; font-size: 12px; border-collapse: collapse; }
  .paciente-box td { padding: 3px 8px; }
  .paciente-box .label { font-weight: bold; color: #1a5276; width: 100px; }
  .section-title { font-size: 13px; font-weight: bold; color: #1a5276; margin: 18px 0 10px 0; padding-bottom: 4px; border-bottom: 1px solid #ddd; text-transform: uppercase; }
  .info-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px; }
  .info-item { background: #f9f9f9; border: 1px solid #ddd; border-radius: 6px; padding: 8px 12px; flex: 1; min-width: 140px; }
  .info-item .tag { font-size: 9px; text-transform: uppercase; color: #888; font-weight: bold; display: block; margin-bottom: 2px; }
  .info-item .value { font-size: 13px; font-weight: bold; color: #333; }
  table.checklist { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
  table.checklist th, table.checklist td { border: 1px solid #ccc; padding: 6px 8px; font-size: 11px; text-align: left; }
  table.checklist th { background: #1a5276; color: white; font-size: 10px; text-transform: uppercase; }
  table.checklist tr:nth-child(even) td { background: #f7f9fc; }
  .status-ok { color: #27ae60; font-weight: bold; }
  .status-no { color: #e74c3c; font-weight: bold; }
  .resultado-box { background: ${todasOK ? '#eafaf1' : '#fdedec'}; border: 2px solid ${todasOK ? '#27ae60' : '#e74c3c'}; border-radius: 8px; padding: 12px 15px; text-align: center; margin: 15px 0; }
  .resultado-box .big { font-size: 18px; font-weight: bold; color: ${todasOK ? '#27ae60' : '#e74c3c'}; }
  .resultado-box .small { font-size: 11px; color: #555; margin-top: 2px; }
  .observacao { background: #fffbf0; border: 1px solid #f0dca0; border-radius: 6px; padding: 10px 12px; margin: 15px 0; font-size: 11px; line-height: 1.5; }
  .assinatura { margin-top: 40px; border-top: 2px solid #333; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px; }
  .assinatura div { text-align: center; flex: 1; }
  .assinatura .linha { margin-top: 35px; border-top: 1px solid #333; padding-top: 5px; font-weight: bold; }
  .footer { margin-top: 25px; font-size: 9px; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 8px; }
</style></head><body>

  <div class="header">
    <div>
      <h1>Checklist de Inserção de CVC</h1>
      <div class="header-info">Data da impressão: ${hoje}</div>
    </div>
  </div>

  <div class="paciente-box">
    <table>
      <tr><td class="label">Paciente:</td><td><strong>${currentPatient.nome?.toUpperCase() || "___________________"}</strong></td><td class="label">Leito:</td><td><strong>${currentPatient.leito}</strong></td></tr>
      <tr><td class="label">Idade:</td><td>${idade} anos</td><td class="label">Data do Procedimento:</td><td><strong>${dataProcedimento}</strong></td></tr>
      <tr><td class="label">Sexo:</td><td>${currentPatient.sexo === 'F' ? 'Feminino' : 'Masculino'}</td><td class="label">Horário:</td><td><strong>${ultimo.horario || "__________"}</strong></td></tr>
    </table>
  </div>

  <div class="section-title">Dados do Procedimento</div>
  <div class="info-grid">
    <div class="info-item">
      <span class="tag">Tipo de Cateter</span>
      <span class="value">${ultimo.tipoCateter || "__________"}</span>
    </div>
    <div class="info-item">
      <span class="tag">Local de Inserção</span>
      <span class="value">${ultimo.localInserção || "__________"}</span>
    </div>
    <div class="info-item">
      <span class="tag">Indicação</span>
      <span class="value">${ultimo.indicacao || "__________"}</span>
    </div>
    <div class="info-item">
      <span class="tag">Passagem</span>
      <span class="value">${ultimo.passagem || "__________"}</span>
    </div>
    <div class="info-item">
      <span class="tag">Punção Única</span>
      <span class="value">${ultimo.puncaoUnica ? 'Sim ✅' : 'Não ❌'}</span>
    </div>
    ${ultimo.quantasPuncoes ? `<div class="info-item"><span class="tag">Nº de Pungões</span><span class="value">${ultimo.quantasPuncoes}</span></div>` : ''}
    ${ultimo.dificuldades ? `<div class="info-item" style="flex:2"><span class="tag">Dificuldades</span><span class="value">${ultimo.dificuldades}</span></div>` : ''}
    ${motivosTroca.length > 0 ? `<div class="info-item" style="flex:2"><span class="tag">Motivo da Troca</span><span class="value">${motivosTroca.join(', ')}</span></div>` : ''}
  </div>

  <div class="section-title">Barreiras de Prevenção — Conformidade</div>
  <table class="checklist">
    <thead><tr><th style="width:30px">#</th><th>Item</th><th style="width:100px;text-align:center">Cumprida</th></tr></thead>
    <tbody>
      ${barreiras.map((b, i) => `
        <tr>
          <td style="text-align:center">${i + 1}</td>
          <td>${b.label || b.item || 'Item'}</td>
          <td style="text-align:center">${b.cumprida ? '<span class="status-ok">✅ Sim</span>' : '<span class="status-no">❌ Não</span>'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="resultado-box">
    <div class="big">${cumpridas} / ${totalBarreiras} — ${todasOK ? '✅ CONFORME' : '❌ NÃO CONFORME'}</div>
    <div class="small">Barreiras de prevenção de infecção relacionada a CVC</div>
  </div>

  ${ultimo.motivoTroca ? `<div class="section-title">Motivo da Troca</div><div class="info-grid"><div class="info-item" style="flex:3"><span class="tag">Motivo</span><span class="value">${ultimo.motivoTroca}</span></div></div>` : ''}

  <div class="section-title">Assinatura do Profissional</div>
  <div class="assinatura">
    <div>
      <div class="linha">${nomeProf}</div>
      <div style="font-size:10px;color:#666;margin-top:3px;">Enfermeiro(a) Responsável</div>
    </div>
    <div>
      <div class="linha">${conselhoProf} ${numConselho}</div>
      <div style="font-size:10px;color:#666;margin-top:3px;">Nº do Conselho Profissional</div>
    </div>
    <div>
      <div class="linha">${dataProcedimento}</div>
      <div style="font-size:10px;color:#666;margin-top:3px;">Data do Procedimento</div>
    </div>
  </div>

  <div class="footer">
    Documento gerado pelo Sys4U - UTI Municipal de Ariquemes | ${hoje}
  </div>

</body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);
  };

  // ==========================================
  // GERAR PDF DO CHECKLIST CVC (usada após salvar)
  // ==========================================
  const gerarPDF_CVC = (registro, nomeProf, conselhoProf, numConselho, printWindow) => {
    if (!currentPatient || !registro) return;

    const idade = calculateAge(currentPatient.dataNascimento) || "__";
    const hoje = new Date().toLocaleDateString('pt-BR');
    const dataProcedimento = registro.data?.split('-').reverse().join('/') || hoje;

    const barreiras = registro.barreiras?.itens || [];
    const totalBarreiras = registro.barreiras?.total || 0;
    const cumpridas = registro.barreiras?.cumpridas || 0;
    const todasOK = registro.barreiras?.todasCumpridas || false;

    let html = `<!DOCTYPE html>
<html><head><title>Checklist Inserção CVC - ${currentPatient.nome}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #222; }
  .header { border-bottom: 3px solid #1a5276; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
  .header h1 { font-size: 16px; color: #1a5276; margin: 0 0 5px 0; text-transform: uppercase; }
  .header-info { font-size: 11px; color: #555; line-height: 1.6; }
  .paciente-box { background: #f0f4f8; border-left: 4px solid #1a5276; padding: 10px 15px; margin-bottom: 20px; border-radius: 0 6px 6px 0; }
  .paciente-box table { width: 100%; font-size: 12px; border-collapse: collapse; }
  .paciente-box td { padding: 3px 8px; }
  .paciente-box .label { font-weight: bold; color: #1a5276; width: 100px; }
  .section-title { font-size: 13px; font-weight: bold; color: #1a5276; margin: 18px 0 10px 0; padding-bottom: 4px; border-bottom: 1px solid #ddd; text-transform: uppercase; }
  .info-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px; }
  .info-item { background: #f9f9f9; border: 1px solid #ddd; border-radius: 6px; padding: 8px 12px; flex: 1; min-width: 140px; }
  .info-item .tag { font-size: 9px; text-transform: uppercase; color: #888; font-weight: bold; display: block; margin-bottom: 2px; }
  .info-item .value { font-size: 13px; font-weight: bold; color: #333; }
  table.checklist { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
  table.checklist th, table.checklist td { border: 1px solid #ccc; padding: 6px 8px; font-size: 11px; text-align: left; }
  table.checklist th { background: #1a5276; color: white; font-size: 10px; text-transform: uppercase; }
  table.checklist tr:nth-child(even) td { background: #f7f9fc; }
  .status-ok { color: #27ae60; font-weight: bold; }
  .status-no { color: #e74c3c; font-weight: bold; }
  .resultado-box { background: ${todasOK ? '#eafaf1' : '#fdedec'}; border: 2px solid ${todasOK ? '#27ae60' : '#e74c3c'}; border-radius: 8px; padding: 12px 15px; text-align: center; margin: 15px 0; }
  .resultado-box .big { font-size: 18px; font-weight: bold; color: ${todasOK ? '#27ae60' : '#e74c3c'}; }
  .resultado-box .small { font-size: 11px; color: #555; margin-top: 2px; }
  .assinatura { margin-top: 40px; border-top: 2px solid #333; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px; }
  .assinatura div { text-align: center; flex: 1; }
  .assinatura .linha { margin-top: 35px; border-top: 1px solid #333; padding-top: 5px; font-weight: bold; }
  .footer { margin-top: 25px; font-size: 9px; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 8px; }
</style></head><body>

  <div class="header">
    <div>
      <h1>Checklist de Inserção de CVC</h1>
      <div class="header-info">Data da impressão: ${hoje}</div>
    </div>
  </div>

  <div class="paciente-box">
    <table>
      <tr><td class="label">Paciente:</td><td><strong>${currentPatient.nome?.toUpperCase() || "___________________"}</strong></td><td class="label">Leito:</td><td><strong>${currentPatient.leito}</strong></td></tr>
      <tr><td class="label">Idade:</td><td>${idade} anos</td><td class="label">Data do Procedimento:</td><td><strong>${dataProcedimento}</strong></td></tr>
      <tr><td class="label">Sexo:</td><td>${currentPatient.sexo === 'F' ? 'Feminino' : 'Masculino'}</td><td class="label">Horário:</td><td><strong>${registro.horario || "__________"}</strong></td></tr>
    </table>
  </div>

  <div class="section-title">Dados do Procedimento</div>
  <div class="info-grid">
    <div class="info-item">
      <span class="tag">Tipo de Cateter</span>
      <span class="value">${registro.tipoCateter || "__________"}</span>
    </div>
    <div class="info-item">
      <span class="tag">Local de Inserção</span>
      <span class="value">${registro.localInserção || "__________"}</span>
    </div>
    <div class="info-item">
      <span class="tag">Indicação</span>
      <span class="value">${registro.indicacao || "__________"}</span>
    </div>
    <div class="info-item">
      <span class="tag">Passagem</span>
      <span class="value">${registro.passagem || "__________"}</span>
    </div>
    <div class="info-item">
      <span class="tag">Punção Única</span>
      <span class="value">${registro.puncaoUnica ? 'Sim ✅' : 'Não ❌'}</span>
    </div>
    ${registro.quantasPuncoes ? `<div class="info-item"><span class="tag">Nº de Pungões</span><span class="value">${registro.quantasPuncoes}</span></div>` : ''}
    ${registro.dificuldades ? `<div class="info-item" style="flex:2"><span class="tag">Dificuldades</span><span class="value">${registro.dificuldades}</span></div>` : ''}
  </div>

  <div class="section-title">Barreiras de Prevenção — Conformidade</div>
  <table class="checklist">
    <thead><tr><th style="width:30px">#</th><th>Item</th><th style="width:100px;text-align:center">Cumprida</th></tr></thead>
    <tbody>
      ${barreiras.map((b, i) => `
        <tr>
          <td style="text-align:center">${i + 1}</td>
          <td>${b.label || b.item || 'Item'}</td>
          <td style="text-align:center">${b.cumprida ? '<span class="status-ok">✅ Sim</span>' : '<span class="status-no">❌ Não</span>'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="resultado-box">
    <div class="big">${cumpridas} / ${totalBarreiras} — ${todasOK ? '✅ CONFORME' : '❌ NÃO CONFORME'}</div>
    <div class="small">Barreiras de prevenção de infecção relacionada a CVC</div>
  </div>

  <div class="section-title">Assinatura do Profissional</div>
  <div class="assinatura">
    <div>
      <div class="linha">${nomeProf}</div>
      <div style="font-size:10px;color:#666;margin-top:3px;">Enfermeiro(a) Responsável</div>
    </div>
    <div>
      <div class="linha">${conselhoProf} ${numConselho}</div>
      <div style="font-size:10px;color:#666;margin-top:3px;">Nº do Conselho Profissional</div>
    </div>
    <div>
      <div class="linha">${dataProcedimento}</div>
      <div style="font-size:10px;color:#666;margin-top:3px;">Data do Procedimento</div>
    </div>
  </div>

  <div class="footer">
    Documento gerado pelo Sys4U - UTI Municipal de Ariquemes | ${hoje}
  </div>

</body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);
  };

  const gerarPDF_InsercaoSVD = (registro, nomeProf, conselhoProf, numConselho, printWindow) => {
    if (!currentPatient || !registro) return;
    const idade = calculateAge(currentPatient.dataNascimento) || "__";
    const hoje = new Date().toLocaleDateString('pt-BR');
    const dataProcedimento = registro.data?.split('-').reverse().join('/') || hoje;

    const itens = registro.itens?.lista || [];
    const total = registro.itens?.total || 0;
    const cumpridos = registro.itens?.cumpridos || 0;
    const todasOK = registro.itens?.todosCumpridos || false;

    const html = `<!DOCTYPE html>
<html><head><title>Passagem SVD - ${currentPatient.nome}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #222; }
  .header { border-bottom: 3px solid #e67e22; padding-bottom: 10px; margin-bottom: 20px; }
  .header h1 { font-size: 16px; color: #e67e22; margin: 0 0 5px 0; text-transform: uppercase; }
  .header-info { font-size: 11px; color: #555; }
  .paciente-box { background: #fef9f0; border-left: 4px solid #e67e22; padding: 10px 15px; margin-bottom: 20px; border-radius: 0 6px 6px 0; }
  .paciente-box table { width: 100%; font-size: 12px; border-collapse: collapse; }
  .paciente-box td { padding: 3px 8px; }
  .paciente-box .label { font-weight: bold; color: #e67e22; width: 100px; }
  .section-title { font-size: 13px; font-weight: bold; color: #e67e22; margin: 18px 0 10px 0; padding-bottom: 4px; border-bottom: 1px solid #ddd; text-transform: uppercase; }
  .info-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px; }
  .info-item { background: #f9f9f9; border: 1px solid #ddd; border-radius: 6px; padding: 8px 12px; flex: 1; min-width: 140px; }
  .info-item .tag { font-size: 9px; text-transform: uppercase; color: #888; font-weight: bold; display: block; margin-bottom: 2px; }
  .info-item .value { font-size: 13px; font-weight: bold; color: #333; }
  table.checklist { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10px; }
  table.checklist th, table.checklist td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
  table.checklist th { background: #e67e22; color: white; font-size: 9px; text-transform: uppercase; }
  table.checklist tr:nth-child(even) td { background: #fef9f0; }
  .status-ok { color: #27ae60; font-weight: bold; } .status-no { color: #e74c3c; font-weight: bold; }
  .resultado-box { background: ${todasOK ? '#eafaf1' : '#fdedec'}; border: 2px solid ${todasOK ? '#27ae60' : '#e74c3c'}; border-radius: 8px; padding: 12px 15px; text-align: center; margin: 15px 0; }
  .resultado-box .big { font-size: 18px; font-weight: bold; color: ${todasOK ? '#27ae60' : '#e74c3c'}; }
  .resultado-box .small { font-size: 11px; color: #555; margin-top: 2px; }
  .obs-box { background: #fffbf0; border: 1px solid #f0dca0; border-radius: 6px; padding: 10px 12px; margin: 15px 0; font-size: 11px; }
  .assinatura { margin-top: 40px; border-top: 2px solid #333; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px; }
  .assinatura div { text-align: center; flex: 1; }
  .assinatura .linha { margin-top: 35px; border-top: 1px solid #333; padding-top: 5px; font-weight: bold; }
  .footer { margin-top: 25px; font-size: 9px; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 8px; }
</style></head><body>
  <div class="header"><div><h1>Checklist de Passagem de SVD</h1><div class="header-info">Data da impressão: ${hoje}</div></div></div>
  <div class="paciente-box"><table>
    <tr><td class="label">Paciente:</td><td><strong>${currentPatient.nome?.toUpperCase() || "___________________"}</strong></td><td class="label">Leito:</td><td><strong>${currentPatient.leito}</strong></td></tr>
    <tr><td class="label">Idade:</td><td>${idade} anos</td><td class="label">Data do Procedimento:</td><td><strong>${dataProcedimento}</strong></td></tr>
    <tr><td class="label">Sexo:</td><td>${currentPatient.sexo === 'F' ? 'Feminino' : 'Masculino'}</td><td class="label">Horário:</td><td><strong>${registro.horario || "__________"}</strong></td></tr>
  </table></div>
  <div class="section-title">Dados do Procedimento</div>
  <div class="info-grid">
    ${registro.indicacao ? `<div class="info-item" style="flex:2"><span class="tag">Indicação</span><span class="value">${registro.indicacao}</span></div>` : ''}
    ${registro.justificativa ? `<div class="info-item" style="flex:2"><span class="tag">Justificativa</span><span class="value">${registro.justificativa}</span></div>` : ''}
    <div class="info-item"><span class="tag">Gênero</span><span class="value">${registro.genero || 'N/A'}</span></div>
  </div>
  <div class="section-title">Lista de Verificação — Conformidade</div>
  <table class="checklist"><thead><tr><th style="width:30px">#</th><th>Item</th><th style="width:100px;text-align:center">Cumprida</th></tr></thead><tbody>
    ${itens.map((b, i) => `<tr><td style="text-align:center">${i+1}</td><td>${b.label || b.item}</td><td style="text-align:center">${b.cumprida ? '<span class="status-ok">✅ Sim</span>' : '<span class="status-no">❌ Não</span>'}</td></tr>`).join('')}
  </tbody></table>
  <div class="resultado-box"><div class="big">${cumpridos} / ${total} — ${todasOK ? '✅ CONFORME' : '❌ NÃO CONFORME'}</div><div class="small">Checklist de passagem de SVD</div></div>
  ${registro.observacao ? `<div class="section-title">Observações</div><div class="obs-box">${registro.observacao}</div>` : ''}
  <div class="section-title">Assinatura do Profissional</div>
  <div class="assinatura">
    <div><div class="linha">${nomeProf}</div><div style="font-size:10px;color:#666;margin-top:3px;">Enfermeiro(a) Responsável</div></div>
    <div><div class="linha">${conselhoProf} ${numConselho}</div><div style="font-size:10px;color:#666;margin-top:3px;">Nº do Conselho Profissional</div></div>
    <div><div class="linha">${dataProcedimento}</div><div style="font-size:10px;color:#666;margin-top:3px;">Data do Procedimento</div></div>
  </div>
  <div class="footer">Documento gerado pelo Sys4U - UTI Municipal de Ariquemes | ${hoje}</div>
</body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => { printWindow.focus(); printWindow.print(); }, 300);
  };

  const gerarPDF_Hemotransfusao = (registro, nomeProf, conselhoProf, numConselho, printWindow) => {
    if (!currentPatient || !registro) return;
    const idade = calculateAge(currentPatient.dataNascimento) || "__";
    const hoje = new Date().toLocaleDateString('pt-BR');
    const dataProcedimento = registro.data?.split('-').reverse().join('/') || hoje;

    const dc = registro.duplaChecagem || {};

    const html = `<!DOCTYPE html>
<html><head><title>Hemotransfusão - ${currentPatient.nome}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #222; }
  .header { border-bottom: 3px solid #c0392b; padding-bottom: 10px; margin-bottom: 20px; }
  .header h1 { font-size: 16px; color: #c0392b; margin: 0 0 5px 0; text-transform: uppercase; }
  .header-info { font-size: 11px; color: #555; }
  .paciente-box { background: #fef5f3; border-left: 4px solid #c0392b; padding: 10px 15px; margin-bottom: 20px; border-radius: 0 6px 6px 0; }
  .paciente-box table { width: 100%; font-size: 12px; border-collapse: collapse; }
  .paciente-box td { padding: 3px 8px; }
  .paciente-box .label { font-weight: bold; color: #c0392b; width: 100px; }
  .section-title { font-size: 13px; font-weight: bold; color: #c0392b; margin: 18px 0 10px 0; padding-bottom: 4px; border-bottom: 1px solid #ddd; text-transform: uppercase; }
  .info-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px; }
  .info-item { background: #f9f9f9; border: 1px solid #ddd; border-radius: 6px; padding: 8px 12px; flex: 1; min-width: 140px; }
  .info-item .tag { font-size: 9px; text-transform: uppercase; color: #888; font-weight: bold; display: block; margin-bottom: 2px; }
  .info-item .value { font-size: 13px; font-weight: bold; color: #333; }
  table.checklist { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10px; }
  table.checklist th, table.checklist td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
  table.checklist th { background: #c0392b; color: white; font-size: 9px; text-transform: uppercase; }
  .status-ok { color: #27ae60; font-weight: bold; } .status-no { color: #e74c3c; font-weight: bold; }
  .obs-box { background: #fffbf0; border: 1px solid #f0dca0; border-radius: 6px; padding: 10px 12px; margin: 15px 0; font-size: 11px; }
  .assinatura { margin-top: 40px; border-top: 2px solid #333; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px; }
  .assinatura div { text-align: center; flex: 1; }
  .assinatura .linha { margin-top: 35px; border-top: 1px solid #333; padding-top: 5px; font-weight: bold; }
  .footer { margin-top: 25px; font-size: 9px; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 8px; }
</style></head><body>
  <div class="header"><div><h1>Registro de Hemotransfusão</h1><div class="header-info">Data da impressão: ${hoje}</div></div></div>
  <div class="paciente-box"><table>
    <tr><td class="label">Paciente:</td><td><strong>${currentPatient.nome?.toUpperCase() || "___________________"}</strong></td><td class="label">Leito:</td><td><strong>${currentPatient.leito}</strong></td></tr>
    <tr><td class="label">Idade:</td><td>${idade} anos</td><td class="label">Data:</td><td><strong>${dataProcedimento}</strong></td></tr>
  </table></div>
  <div class="section-title">Dados do Hemocomponente</div>
  <div class="info-grid">
    <div class="info-item"><span class="tag">Hemocomponente</span><span class="value">${registro.hemocomponente || "__________"}</span></div>
    <div class="info-item"><span class="tag">Nº da Bolsa</span><span class="value">${registro.numeroBolsa || "__________"}</span></div>
    <div class="info-item"><span class="tag">Grupo ABO</span><span class="value">${registro.grupoABO || "__________"}</span></div>
    <div class="info-item"><span class="tag">RH</span><span class="value">${registro.rh || "__________"}</span></div>
    <div class="info-item"><span class="tag">Volume</span><span class="value">${registro.volume || "__________"} mL</span></div>
    <div class="info-item"><span class="tag">Validade</span><span class="value">${registro.validade || "__________"}</span></div>
    <div class="info-item"><span class="tag">Início</span><span class="value">${registro.horarioInicio || "__________"}</span></div>
    ${registro.horarioTermino ? `<div class="info-item"><span class="tag">Término</span><span class="value">${registro.horarioTermino}</span></div>` : ''}
    ${registro.volumeInfundido ? `<div class="info-item"><span class="tag">Volume Infundido</span><span class="value">${registro.volumeInfundido} mL</span></div>` : ''}
  </div>
  <div class="section-title">Dupla Checagem</div>
  <table class="checklist"><thead><tr><th>Item</th><th style="width:100px;text-align:center">Conferido</th></tr></thead><tbody>
    <tr><td>Crossmatch</td><td style="text-align:center">${dc.crossmatch ? '<span class="status-ok">✅</span>' : '<span class="status-no">❌</span>'}</td></tr>
    <tr><td>Acesso Venoso Pérvio</td><td style="text-align:center">${dc.acessoVenoso ? '<span class="status-ok">✅</span>' : '<span class="status-no">❌</span>'}</td></tr>
    <tr><td>Equipo com Filtro</td><td style="text-align:center">${dc.equipoFiltro ? '<span class="status-ok">✅</span>' : '<span class="status-no">❌</span>'}</td></tr>
  </tbody></table>
  ${registro.reacao ? `<div class="section-title">Reação Transfusional</div><div class="info-grid"><div class="info-item" style="flex:2"><span class="tag">Reação</span><span class="value">${registro.reacao}</span></div>${registro.reacaoDescricao ? `<div class="info-item" style="flex:2"><span class="tag">Descrição</span><span class="value">${registro.reacaoDescricao}</span></div>` : ''}${registro.suspendeu ? `<div class="info-item"><span class="tag">Suspensa</span><span class="value">Sim ⚠️</span></div>` : ''}${registro.conduta ? `<div class="info-item" style="flex:2"><span class="tag">Conduta</span><span class="value">${registro.conduta}</span></div>` : ''}</div>` : ''}
  ${registro.observacao ? `<div class="section-title">Observações</div><div class="obs-box">${registro.observacao}</div>` : ''}
  <div class="section-title">Assinatura do Profissional</div>
  <div class="assinatura">
    <div><div class="linha">${nomeProf}</div><div style="font-size:10px;color:#666;margin-top:3px;">Enfermeiro(a) Responsável</div></div>
    <div><div class="linha">${conselhoProf} ${numConselho}</div><div style="font-size:10px;color:#666;margin-top:3px;">Nº do Conselho Profissional</div></div>
    <div><div class="linha">${dataProcedimento}</div><div style="font-size:10px;color:#666;margin-top:3px;">Data do Procedimento</div></div>
  </div>
  <div class="footer">Documento gerado pelo Sys4U - UTI Municipal de Ariquemes | ${hoje}</div>
</body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => { printWindow.focus(); printWindow.print(); }, 300);
  };

return (
    <div className="space-y-6 animate-fadeIn text-left">
      {/* 1. SE A ADMISSÃO NÃO FOI FEITA, MOSTRAMOS O BOTÃO LIVRE DO FIELDSET */}
      {!currentPatient.admissaoEnfermagem ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-xl border-2 border-dashed border-orange-200 shadow-sm print:hidden">
          <AlertTriangle size={64} className="text-orange-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-700 mb-2 text-center">Admissão de Enfermagem Pendente</h3>
          <p className="text-sm text-slate-500 mb-6 text-center max-w-md">
            O paciente já foi alocado no leito, mas a avaliação inicial de enfermagem (Escalas de Braden e Morse) ainda não foi realizada.
          </p>
          
          <button
            onClick={(e) => { 
              e.preventDefault(); 
              handleNursingAdmission(); 
            }}
            disabled={!isEditable} 
            className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
              isEditable 
                ? "bg-green-600 text-white shadow-lg hover:bg-green-700 transform hover:scale-105" 
                : "bg-slate-300 text-slate-500 cursor-not-allowed"
            }`}
          >
            <UserPlus size={20} /> Iniciar Admissão de Enfermagem
          </button>
          
          {!isEditable && (
             <p className="text-xs text-red-500 mt-3">Somente o perfil "Enfermeiro" pode iniciar a admissão.</p>
          )}
        </div>
      ) : (
        /* 2. SE A ADMISSÃO JÁ FOI FEITA, AÍ SIM ABRIMOS O FIELDSET PARA OS DADOS */
        <fieldset disabled={!isEditable} className="min-w-0 border-0 p-0 m-0">
        <>
          {/* ======================================================== */}
          {/* CABEÇALHO DA ABA: IDENTIFICAÇÃO E BOTÃO REABRIR          */}
          {/* ======================================================== */}
          <div className="flex justify-end mb-2 mt-4 print:hidden">
            
            {/* BOTÃO DE REABRIR/VER ADMISSÃO DA ENFERMAGEM */}
            <button
              onClick={(e) => { e.preventDefault(); handleViewNursingAdmission(); }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-bold shadow-sm transition-colors print:hidden"
            >
              <ClipboardSignature size={16} /> Ver Admissão de Enfermagem
            </button>

          </div>

          {/* ======================================================== */}
          {/* REGISTROS DIÁRIOS (RETRÁTIL) + BOTÕES DE AÇÃO            */}
          {/* ======================================================== */}
          <div className="mb-4 p-4 bg-white border border-slate-200 rounded-xl print:hidden">
            
            {/* BOTÃO QUE ABRE/FECHA A SEÇÃO */}
            <button 
              onClick={() => setShowRegistrosDiarios(!showRegistrosDiarios)} 
              className="flex items-center gap-2 font-bold text-slate-700 w-full text-left"
            >
              {showRegistrosDiarios ? <ChevronDown size={20} className="text-indigo-600" /> : <ChevronRight size={20} className="text-slate-400" />} 
              <ClipboardList className={showRegistrosDiarios ? "text-indigo-600" : "text-slate-400"} size={18} />
              Registros Diários
            </button>

            {showRegistrosDiarios && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">

                  <button onClick={() => handleAcaoEnfermagem('Inserção CVC')} className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all">
                    <Syringe size={20} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase leading-tight text-center">Inserção<br/>CVC</span>
                  </button>

                  <button onClick={() => handleAcaoEnfermagem('Manutenção CVC')} className={`flex flex-col items-center justify-center gap-1.5 p-3 border rounded-xl transition-all ${
                    cvcPrecisaManut
                      ? 'pulse-manutencao bg-red-100 border-red-300 text-red-700'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                  }`}>
                    <BriefcaseMedical size={20} className={`${cvcPrecisaManut ? 'text-red-600' : 'text-slate-400'}`} />
                    <span className="text-[10px] font-bold uppercase leading-tight text-center">Manutenção<br/>CVC</span>
                  </button>

                  <button onClick={() => handleAcaoEnfermagem('SVD')} className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all">
                    <Droplets size={20} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase leading-tight text-center">Inserção SVD</span>
                  </button>

                  <button onClick={() => handleAcaoEnfermagem('Manutenção SVD')} className={`flex flex-col items-center justify-center gap-1.5 p-3 border rounded-xl transition-all ${
                    svdPrecisaManut
                      ? 'pulse-manutencao bg-red-100 border-red-300 text-red-700'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                  }`}>
                    <BriefcaseMedical size={20} className={`${svdPrecisaManut ? 'text-red-600' : 'text-slate-400'}`} />
                    <span className="text-[10px] font-bold uppercase leading-tight text-center">Manutenção<br/>SVD</span>
                  </button>

                  <button onClick={() => handleAcaoEnfermagem('Carrinho de EMG')} className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all">
                    <Ambulance size={20} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase leading-tight text-center">Carrinho<br/>de EMG</span>
                  </button>

                  <button onClick={() => handleAcaoEnfermagem('Curativo')} className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all">
                    <Bandage size={20} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase leading-tight text-center">Curativo</span>
                  </button>

                  <button onClick={() => handleAcaoEnfermagem('Gasometria')} className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all">
                    <TestTube size={20} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase leading-tight text-center">Gasometria</span>
                  </button>

                  <button onClick={() => handleAcaoEnfermagem('Hemotransfusão')} className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all">
                    <Droplet size={20} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase leading-tight text-center">Hemotransfusão</span>
                  </button>

                  <button onClick={() => handleAcaoEnfermagem('ECG')} className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all">
                    <Activity size={20} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase leading-tight text-center">ECG</span>
                  </button>

                  <button onClick={() => handleAcaoEnfermagem('Acesso Periférico')} className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all">
                    <Syringe size={20} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase leading-tight text-center">Acesso<br/>Periférico</span>
                  </button>

                  <button onClick={() => handleAcaoEnfermagem('Fleet Enema')} className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all">
                    <Podcast size={20} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase leading-tight text-center">Fleet<br/>Enema</span>
                  </button>

                  <button onClick={() => handleAcaoEnfermagem('NPT')} className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all">
                    <Milk size={20} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase leading-tight text-center">NPT</span>
                  </button>

                  <button onClick={() => handleAcaoEnfermagem('Aspiração Traqueal')} className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all">
                    <Wind size={20} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase leading-tight text-center">Aspiração<br/>Traqueal</span>
                  </button>

                </div>
              </div>
            )}

          </div>

          {(() => {
            const reqBraden = ["braden_percepcao", "braden_umidade", "braden_atividade", "braden_mobilidade", "braden_nutricao", "braden_friccao"];
            const reqMorse = ["morse_historico", "morse_diagnostico", "morse_auxilio", "morse_terapiaIV", "morse_marcha", "morse_estadoMental"];
          
            const bradenSum = reqBraden.reduce((s, k) => s + parseInt(currentPatient.enfermagem?.[k] || 0), 0);
            let bradenRisk = "";
            if (bradenSum > 0) {
              if (bradenSum <= 9) bradenRisk = "Risco Altíssimo";
              else if (bradenSum <= 12) bradenRisk = "Risco Alto";
              else if (bradenSum <= 14) bradenRisk = "Risco Moderado";
              else if (bradenSum <= 18) bradenRisk = "Risco Leve";
              else bradenRisk = "Sem Risco"; 
            }
          
            const morseSum = reqMorse.reduce((s, k) => s + parseInt(currentPatient.enfermagem?.[k] || 0), 0);
            let morseRisk = "";
            if (currentPatient.enfermagem?.morse_historico !== undefined && currentPatient.enfermagem?.morse_historico !== "") {
              if (morseSum <= 24) morseRisk = "Risco Baixo";
              else if (morseSum <= 44) morseRisk = "Risco Moderado";
              else morseRisk = "Risco Alto";
            }
          
                        // --- LÓGICA PARA BUSCAR O ÚLTIMO VALOR DAS ESCALAS ---
            let displayBradenScore = bradenSum > 0 ? bradenSum : "-";
            let displayBradenRisk = bradenRisk || "Não Avaliado";
            let displayMorseScore = currentPatient?.enfermagem?.morse_historico !== undefined || morseSum >= 0 ? morseSum : "-";
            let displayMorseRisk = morseRisk || "Não Avaliado";

            // Se existir histórico diário, pega a data mais recente e substitui os valores
            if (currentPatient?.enfermagem?.escalas_diarias) {
              const datas = Object.keys(currentPatient.enfermagem.escalas_diarias).sort((a, b) => new Date(b) - new Date(a));
              if (datas.length > 0) {
                const ultimaData = datas[0];
                const ultimaEscala = currentPatient.enfermagem.escalas_diarias[ultimaData];
                
                if (ultimaEscala?.braden?.score !== undefined) {
                  displayBradenScore = ultimaEscala.braden.score;
                  displayBradenRisk = ultimaEscala.braden.risco;
                }
                if (ultimaEscala?.morse?.score !== undefined) {
                  displayMorseScore = ultimaEscala.morse.score;
                  displayMorseRisk = ultimaEscala.morse.risco;
                }
              }
            }
            // -----------------------------------------------------

            return (
              <div className="grid grid-cols-2 gap-4 mb-2 mt-4">
                <div className="flex flex-col items-center justify-center p-4 border border-orange-200 rounded-xl bg-orange-50/50 text-center">
                  <h4 className="text-xs font-bold text-orange-800 uppercase mb-3 flex items-center justify-center gap-1">
                    <AlertTriangle size={14} /> Escala de Braden
                  </h4>
                  <div className="text-4xl font-black text-orange-600 leading-none">
                    {displayBradenScore}
                  </div>
                  <div className={`mt-3 px-3 py-1.5 text-[11px] font-bold rounded-lg leading-tight shadow-sm max-w-[90%] break-words ${displayBradenScore !== "-" && displayBradenScore <= 12 ? "bg-red-200 text-red-900" : "bg-orange-200 text-orange-900"}`}>
                    {displayBradenRisk}
                  </div>
                </div>
          
                <div className="flex flex-col items-center justify-center p-4 border border-blue-200 rounded-xl bg-blue-50/50 text-center">
                  <h4 className="text-xs font-bold text-blue-800 uppercase mb-3 flex items-center justify-center gap-1">
                    <AlertTriangle size={14} /> Escala de Morse
                  </h4>
                  <div className="text-4xl font-black text-blue-600 leading-none">
                    {displayMorseScore}
                  </div>
                  <div className={`mt-3 px-3 py-1.5 text-[11px] font-bold rounded-lg leading-tight shadow-sm max-w-[90%] break-words ${displayMorseScore !== "-" && displayMorseScore >= 45 ? "bg-red-200 text-red-900" : "bg-blue-200 text-blue-900"}`}>
                    {displayMorseRisk}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* CUIDADOS GERAIS */}
          <div className="p-4 border rounded-xl bg-orange-50/20">
            <h4 className="font-bold text-orange-800 mb-4 flex items-center gap-2"><Shield size={16} /> Cuidados Gerais</h4>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Escala de Dor</label>
            <select 
              className="w-full p-2 border rounded mb-4" 
              value={currentPatient.enfermagem?.dor || ""} 
              onChange={(e) => updateNested("enfermagem", "dor", e.target.value)}
              onBlur={() => handleBlurSave("Enfermagem: Avaliou Escala de Dor")}
            >
              <option value="">Selecione...</option>
              {ESCALA_DOR.map((o) => <option key={o}>{o}</option>)}
            </select>

            <label className="flex items-center gap-2 mb-4 font-bold">
              <input 
                type="checkbox" 
                // Para a visualização, checamos se ALGUM dos dois marcou:
                checked={currentPatient.enfermagem?.hemodialise || currentPatient.medical?.hemodialise || false} 
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  // Atualiza as duas abas simultaneamente!
                  updateNested("enfermagem", "hemodialise", isChecked);
                  updateNested("medical", "hemodialise", isChecked);
                }} 
                onBlur={() => handleBlurSave("Enfermagem: Alterou status de Hemodiálise")}
              /> 
              Hemodiálise
            </label>
            
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Precauções</label>
            <select 
              className="w-full p-2 border rounded" 
              value={currentPatient.enfermagem?.precaucao || ""} 
              onChange={(e) => updateNested("enfermagem", "precaucao", e.target.value)}
              onBlur={() => handleBlurSave("Enfermagem: Alterou Precauções")}
            >
              <option value="">Selecione...</option>
              {PRECAUCOES.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>

          {/* INVASIVOS E DISPOSITIVOS */}
          <div className="p-4 border rounded-xl bg-orange-50/20">
            <h4 className="font-bold text-orange-800 mb-4 flex items-center gap-2"><Syringe size={16} /> Dispositivos Invasivos</h4>
            
            {/* GRADE 1: ACESSOS VENOSOS (AVP, CVC, SHILEY) */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 items-start">
              
              {/* 1. AVP */}
              <div>
                <label className="text-xs font-bold text-gray-500">AVP (Local/Data)</label>
                <div className="flex gap-2">
                  {/* 🔥 SUBSTITUÍDO O INPUT DE TEXTO POR UM SELECT */}
                  <select 
                    className="w-full p-2 border rounded text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white" 
                    value={currentPatient.enfermagem?.avpLocal || ""} 
                    onChange={(e) => updateNested("enfermagem", "avpLocal", e.target.value)} 
                    onBlur={() => handleBlurSave("Enfermagem: Editou AVP (Local)")}
                  >
                    <option value="">Selecione o local...</option>
                    <option value="MSD">MSD</option>
                    <option value="MSE">MSE</option>
                    <option value="MID">MID</option>
                    <option value="MIE">MIE</option>
                    <option value="Jugular Externa D">Jugular Externa D</option>
                    <option value="Jugular Externa E">Jugular Externa E</option>
                  </select>
                  
                  <input 
                    type="date" 
                    className="w-32 p-2 border rounded shrink-0 text-sm outline-none focus:ring-2 focus:ring-blue-100" 
                    value={currentPatient.enfermagem?.avpData || ""} 
                    onChange={(e) => updateNested("enfermagem", "avpData", e.target.value)} 
                    onBlur={() => handleBlurSave("Enfermagem: Editou AVP (Data)")}
                  />
                </div>
              </div>

              {/* 2. CVC/PICC */}
              <div>
                <label className="text-xs font-bold text-gray-500">CVC/PICC (Inserção)</label>
                <div className="flex gap-2">
                  {/* 🔥 SUBSTITUÍDO O INPUT DE TEXTO POR UM SELECT */}
                  <select 
                    className="w-full p-2 border rounded text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white" 
                    value={currentPatient.enfermagem?.cvcLocal || ""} 
                    onChange={(e) => updateNested("enfermagem", "cvcLocal", e.target.value)} 
                    onBlur={() => handleBlurSave("Enfermagem: Editou CVC/PICC (Local)")}
                  >
                    <option value="">Selecione o local...</option>
                    <optgroup label="Acesso Central (CVC)">
                      <option value="Subclávia D">Subclávia D</option>
                      <option value="Subclávia E">Subclávia E</option>
                      <option value="Jugular Interna D">Jugular Interna D</option>
                      <option value="Jugular Interna E">Jugular Interna E</option>
                      <option value="Femoral D">Femoral D</option>
                      <option value="Femoral E">Femoral E</option>
                    </optgroup>
                    <optgroup label="PICC">
                      <option value="PICC MSD">PICC MSD</option>
                      <option value="PICC MSE">PICC MSE</option>
                    </optgroup>
                  </select>

                  <input 
                    type="date" 
                    className="w-32 p-2 border rounded shrink-0 text-sm outline-none focus:ring-2 focus:ring-blue-100" 
                    value={currentPatient.enfermagem?.cvcData || ""} 
                    onChange={(e) => updateNested("enfermagem", "cvcData", e.target.value)} 
                    onBlur={(e) => {
                      handleBlurSave("Enfermagem: Editou CVC/PICC (Data Inserção)");
                      if (typeof registrarLogAuditoria === "function") {
                        registrarLogAuditoria("DISPOSITIVO: CVC/PICC", `Data de inserção alterada para: ${e.target.value || "Vazio"}`, currentPatient.id, currentPatient.nome);
                      }
                    }}
                  />
                </div>
                
                {currentPatient.enfermagem?.cvcLocal && (
                  <div className="mt-2 animate-fadeIn">
                    <label className="block text-[10px] font-bold text-red-500 uppercase">Data de Retirada (CVC/PICC)</label>
                    <input 
                      type="date" 
                      className="w-full p-2 border border-red-200 rounded bg-red-50 focus:ring-2 focus:ring-red-500 outline-none text-sm" 
                      value={currentPatient.enfermagem?.cvcRetiradaData || ""} 
                      onChange={(e) => updateNested("enfermagem", "cvcRetiradaData", e.target.value)} 
                      onBlur={(e) => {
                        handleBlurSave("Enfermagem: Registrou retirada do CVC/PICC");
                        if (typeof registrarLogAuditoria === "function") {
                          registrarLogAuditoria("DISPOSITIVO: CVC/PICC", `Data de retirada registada para: ${e.target.value || "Vazio"}`, currentPatient.id, currentPatient.nome);
                        }
                      }}
                      disabled={!isEditable} 
                    />
                  </div>
                )}
              </div>

              {/* 3. SHILEY (HEMODIÁLISE) */}
              <div>
                <label className="text-xs font-bold text-gray-500">Cateter de Shiley (Inserção)</label>
                <div className="flex gap-2">
                  <select 
                    className="w-full p-2 border rounded bg-white outline-none" 
                    value={currentPatient.enfermagem?.shileyLocal || ""} 
                    onChange={(e) => updateNested("enfermagem", "shileyLocal", e.target.value)} 
                    onBlur={() => handleBlurSave("Enfermagem: Editou Shiley (Local)")}
                  >
                    <option value="">Local...</option>
                    <option value="VJID">VJID</option>
                    <option value="VJIE">VJIE</option>
                    <option value="VSCD">VSCD</option>
                    <option value="VSCE">VSCE</option>
                    <option value="VFID">VFID</option>
                    <option value="VFIE">VFIE</option>
                  </select>
                  <input 
                    type="date" 
                    className="w-32 p-2 border rounded shrink-0" 
                    value={currentPatient.enfermagem?.shileyData || ""} 
                    onChange={(e) => updateNested("enfermagem", "shileyData", e.target.value)} 
                    onBlur={(e) => {
                      handleBlurSave("Enfermagem: Editou Shiley (Data Inserção)");
                      if (typeof registrarLogAuditoria === "function") {
                        registrarLogAuditoria("DISPOSITIVO: SHILEY", `Data de inserção alterada para: ${e.target.value || "Vazio"}`, currentPatient.id, currentPatient.nome);
                      }
                    }}
                  />
                </div>
                
                {currentPatient.enfermagem?.shileyLocal && (
                  <div className="mt-2">
                    <label className="block text-[10px] font-bold text-red-500 uppercase">Data de Retirada (Shiley)</label>
                    <input 
                      type="date" 
                      className="w-full p-2 border border-red-200 rounded bg-red-50 focus:ring-2 focus:ring-red-500 outline-none" 
                      value={currentPatient.enfermagem?.shileyRetiradaData || ""} 
                      onChange={(e) => updateNested("enfermagem", "shileyRetiradaData", e.target.value)} 
                      onBlur={(e) => {
                        handleBlurSave("Enfermagem: Registrou retirada do Shiley");
                        if (typeof registrarLogAuditoria === "function") {
                          registrarLogAuditoria("DISPOSITIVO: SHILEY", `Data de retirada registada para: ${e.target.value || "Vazio"}`, currentPatient.id, currentPatient.nome);
                        }
                      }}
                      disabled={!isEditable} 
                    />
                  </div>
                )}
              </div>

            </div>
            
            {/* GRADE 2: OUTROS DISPOSITIVOS (SVD, DIURESE, SNE, DRENOS) */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
              
              {/* SVD (Sem Checkbox) */}
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1">
                  SVD (Sonda Vesical / Inserção)
                </label>
                <div className="space-y-2">
                  <input 
                    type="date" 
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-orange-500 outline-none" 
                    value={currentPatient.enfermagem?.svdData || ""} 
                    onChange={(e) => updateNested("enfermagem", "svdData", e.target.value)} 
                    onBlur={(e) => {
                      handleBlurSave("Enfermagem: Editou SVD (Data Inserção)");
                      if (typeof registrarLogAuditoria === "function") {
                        registrarLogAuditoria("DISPOSITIVO: SVD", `Data de inserção alterada para: ${e.target.value || "Vazio"}`, currentPatient.id, currentPatient.nome);
                      }
                    }}
                    disabled={!isEditable} 
                  />
                  
                  {/* Só mostra a data de retirada se a SVD tiver uma data de inserção */}
                  {currentPatient.enfermagem?.svdData && (
                    <div className="mt-2">
                      <label className="block text-[10px] font-bold text-red-500 uppercase">Data de Retirada (SVD)</label>
                      <input 
                        type="date" 
                        className="w-full p-2 border border-red-200 rounded bg-red-50 focus:ring-2 focus:ring-red-500 outline-none" 
                        value={currentPatient.enfermagem?.svdRetiradaData || ""} 
                        onChange={(e) => updateNested("enfermagem", "svdRetiradaData", e.target.value)} 
                        onBlur={(e) => {
                          handleBlurSave("Enfermagem: Registrou retirada da SVD");
                          if (typeof registrarLogAuditoria === "function") {
                            registrarLogAuditoria("DISPOSITIVO: SVD", `Data de retirada registada para: ${e.target.value || "Vazio"}`, currentPatient.id, currentPatient.nome);
                          }
                        }}
                        disabled={!isEditable} 
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Aspecto da Diurese</label>
                <select 
                  className="w-full p-2 border rounded bg-white" 
                  value={currentPatient.enfermagem?.diureseCaracteristica || ""} 
                  onChange={(e) => updateNested("enfermagem", "diureseCaracteristica", e.target.value)}
                  onBlur={() => handleBlurSave("Enfermagem: Alterou Aspecto da Diurese")}
                >
                  <option value="">Selecione...</option>
                  {CARACTERISTICAS_DIURESE.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">SNE (Fixação cm / Data)</label>
                <div className="flex gap-2">
                  <input 
                    className="w-full p-2 border rounded" 
                    placeholder="cm" 
                    value={currentPatient.enfermagem?.sneCm || ""} 
                    onChange={(e) => updateNested("enfermagem", "sneCm", e.target.value)} 
                    onBlur={() => handleBlurSave("Enfermagem: Editou SNE (Fixação)")}
                  />
                  <input 
                    type="date" 
                    className="w-32 p-2 border rounded" 
                    value={currentPatient.enfermagem?.sneData || ""} 
                    onChange={(e) => updateNested("enfermagem", "sneData", e.target.value)} 
                    onBlur={() => handleBlurSave("Enfermagem: Editou SNE (Data)")}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Drenos (Tipo/Características)</label>
                <input 
                  className="w-full p-2 border rounded" 
                  value={currentPatient.enfermagem?.drenoTipo || ""} 
                  onChange={(e) => updateNested("enfermagem", "drenoTipo", e.target.value)} 
                  onBlur={() => handleBlurSave("Enfermagem: Editou Drenos")}
                />
              </div>
            </div>
          </div>

          {/* PELE E CURATIVOS */}
          <div className="p-4 border rounded-xl bg-blue-50/30 mt-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-blue-800 flex items-center gap-2">
                <ShieldAlert size={16} /> Integridade Cutânea e Curativos
              </h4>
              <button 
                onClick={addLesao}
                className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
              >
                <Plus size={14} /> Adicionar Lesão
              </button>
            </div>

            <div className="space-y-4">
              {(!currentPatient.enfermagem?.lesoes || currentPatient.enfermagem?.lesoes.length === 0) && (
                <p className="text-sm text-slate-400 italic text-center py-2">Nenhuma lesão registrada. Pele íntegra.</p>
              )}

              {currentPatient.enfermagem?.lesoes?.map((lesao) => (
                <div key={lesao.id} className="bg-white border border-blue-100 p-4 rounded-xl shadow-sm relative">
                  <button 
                    onClick={() => removeLesao(lesao.id)}
                    className="absolute top-2 right-2 text-slate-300 hover:text-red-500"
                  >
                    <X size={16} />
                  </button>

                  <div className="grid md:grid-cols-4 gap-4">
                    {/* Origem da Lesão */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Origem</label>
                      <select 
                        className={`w-full p-2 border rounded text-sm font-bold ${lesao.origem === 'incidencia' ? 'text-red-600 bg-red-50' : 'text-slate-600'}`}
                        value={lesao.origem}
                        onChange={(e) => updateLesaoData(lesao.id, "origem", e.target.value)}
                      >
                        <option value="prevalencia">Prévia (Prevalência)</option>
                        <option value="incidencia">Adquirida na UTI (Incidência)</option>
                      </select>
                    </div>

                    {/* Localização e Estágio */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Localização / Estágio</label>
                      <input 
                        type="text"
                        placeholder="Ex: Sacra - Estágio II"
                        className="w-full p-2 border rounded text-sm"
                        value={lesao.localizacao}
                        onChange={(e) => updateLesaoData(lesao.id, "localizacao", e.target.value)}
                        onBlur={() => handleBlurSave("Enfermagem: Atualizou local da lesão")}
                      />
                    </div>

                    {/* Tipo de Curativo */}
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Curativo / Conduta</label>
                      <input 
                        type="text"
                        placeholder="Ex: Placa de Hidrocoloide / AGE"
                        className="w-full p-2 border border-emerald-200 bg-emerald-50/30 rounded text-sm"
                        value={lesao.curativo}
                        onChange={(e) => updateLesaoData(lesao.id, "curativo", e.target.value)}
                        onBlur={() => handleBlurSave("Enfermagem: Atualizou curativo")}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* INTERCORRÊNCIAS E CONDUTAS */}
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="p-4 bg-white border rounded-xl shadow-sm">
              <h4 className="font-bold text-slate-700 mb-2 text-sm flex items-center gap-2"><AlertCircle size={16} className="text-orange-500" /> Intercorrências</h4>
              <textarea 
                className="w-full p-3 border rounded-lg h-24 text-sm outline-none focus:ring-2 focus:ring-orange-100 bg-slate-50 focus:bg-white transition-colors whitespace-pre-wrap" 
                placeholder="Relate as intercorrências do plantão aqui..." 
                value={currentPatient.enfermagem?.intercorrencias || ""} 
                onChange={(e) => updateNested("enfermagem", "intercorrencias", e.target.value)} 
                onBlur={() => handleBlurSave("Enfermagem: Editou Intercorrências")}
              />
            </div>
            <div className="p-4 bg-white border rounded-xl shadow-sm">
              <h4 className="font-bold text-slate-700 mb-2 text-sm flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Condutas</h4>
              <textarea 
                className="w-full p-3 border rounded-lg h-24 text-sm outline-none focus:ring-2 focus:ring-green-100 bg-slate-50 focus:bg-white transition-colors whitespace-pre-wrap" 
                placeholder="Plano de cuidados e condutas tomadas..." 
                value={currentPatient.enfermagem?.condutas || ""} 
                onChange={(e) => updateNested("enfermagem", "condutas", e.target.value)} 
                onBlur={() => handleBlurSave("Enfermagem: Editou Condutas")}
              />
            </div>
          </div>

          {/* EVOLUÇÃO IA / PRIVATIVO */}
          <div className="p-4 bg-white border rounded-xl shadow-sm mt-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-slate-700 flex items-center gap-2"><Edit3 size={16} className="text-slate-400" /> Evolução de Enfermagem (Privativo)</h4>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setShowNursingChecklistModal(true); }}
                disabled={!isNursingRole || isGeneratingNursingAI}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm print:hidden ${isGeneratingNursingAI ? "bg-slate-200 text-slate-500 cursor-not-allowed" : "bg-blue-100 text-blue-700 hover:bg-blue-200"} ${!isNursingRole ? "opacity-50 cursor-not-allowed" : ""}`}
                title="Usar Inteligência Artificial para gerar evolução"
              >
                {isGeneratingNursingAI ? <><Loader2 className="animate-spin" size={14} /> Gerando...</> : <><BrainCircuit size={14} /> Evolução por IA</>}
              </button>
            </div>
            <textarea 
              className="w-full p-3 border rounded-lg h-64 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-slate-50 focus:bg-white transition-colors whitespace-pre-wrap" 
              placeholder="Clique no botão acima para gerar a evolução baseada nos dados clínicos, ou digite aqui..." 
              value={currentPatient.enfermagem?.anotacoes || ""} 
              onChange={(e) => updateNested("enfermagem", "anotacoes", e.target.value)} 
              onBlur={() => handleBlurSave("Enfermagem: Editou Evolução de Enfermagem")}
            />
          </div>
        </>
        
      </fieldset>
      )}

      {/* MODAL DE CHECKLIST DA ENFERMAGEM */}
      <ModalChecklistEnfermagem
        isOpen={showNursingChecklistModal}
        onClose={() => setShowNursingChecklistModal(false)}
        currentPatient={currentPatient}
        updateNested={updateNested}
        handleBlurSave={handleBlurSave}
        onGenerateAI={generateNursingAI_Evolution}
      />
      
      {/* ======================================================== */}
      {/* MODAL: CURATIVO                                           */}
      {/* ======================================================== */}
      {modalCurativo.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-emerald-500/20 my-auto">
            <div className="bg-emerald-600 p-5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><Bandage size={20} /></div>
                <h2 className="text-lg font-black tracking-wide leading-tight">Curativo</h2>
              </div>
              <button onClick={() => setModalCurativo({ ...modalCurativo, isOpen: false })} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"><X size={24} /></button>
            </div>

            <div className="p-6 bg-slate-50 space-y-6 overflow-y-auto max-h-[70vh]">

              {/* DATA */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Data do Curativo</label>
                <input 
                  type="date" 
                  value={modalCurativo.data}
                  onChange={(e) => setModalCurativo({ ...modalCurativo, data: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-emerald-300 font-bold text-center"
                />
              </div>

              {/* HORÁRIO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Horário do Curativo</label>
                <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-emerald-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalCurativo.horario ? modalCurativo.horario.split(':')[0] : "00"} onChange={(e) => setModalCurativo({ ...modalCurativo, horario: `${e.target.value}:${modalCurativo.horario ? modalCurativo.horario.split(':')[1] : '00'}` })}>
                    {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}h</option>)}
                  </select>
                  <span className="text-3xl font-black text-slate-300 pb-1">:</span>
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-emerald-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalCurativo.horario ? modalCurativo.horario.split(':')[1] : "00"} onChange={(e) => setModalCurativo({ ...modalCurativo, horario: `${modalCurativo.horario ? modalCurativo.horario.split(':')[0] : '00'}:${e.target.value}` })}>
                    {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* LOCAL DA LESÃO — GRID OU LESÃO EXISTENTE */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Local da Lesão</label>
                
              {/* GRID DE LOCAIS PRÉ-DEFINIDOS */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {['Ferida Operatória', 'Acesso Periférico', 'Acesso Central', 'Cateter de HD', 'Dreno de Tórax', 'Dreno Abdominal', 'MSD', 'MSE', 'MID', 'MIE', 'Cabeça', 'Dorso'].map(local => (
                    <button key={local} onClick={() => setModalCurativo({ ...modalCurativo, lesaoLocal: local, lesaoId: `novo_${local}` })} className={`p-2.5 rounded-xl border-2 font-bold text-[11px] uppercase tracking-wide transition-all ${modalCurativo.lesaoLocal === local ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-200'}`}>{local}</button>
                  ))}
                </div>

                {/* DIVISÓRIA "OU" */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-slate-200"></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ou selecione uma lesão existente</span>
                  <div className="flex-1 h-px bg-slate-200"></div>
                </div>

                {/* LESÕES EXISTENTES */}
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(currentPatient?.enfermagem?.lesoes || []).length === 0 ? (
                    <p className="text-sm text-slate-400 italic text-center py-2">Nenhuma lesão registrada.</p>
                  ) : (
                    currentPatient?.enfermagem?.lesoes?.map(lesao => (
                      <button 
                        key={lesao.id} 
                        onClick={() => setModalCurativo({ ...modalCurativo, lesaoId: lesao.id, lesaoLocal: lesao.localizacao })} 
                        className={`w-full p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all text-left ${modalCurativo.lesaoId === lesao.id ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-200'}`}
                      >
                        <span className="block text-[10px] font-bold text-slate-400">{lesao.origem === 'incidencia' ? 'ADQUIRIDA NA UTI' : 'PRÉVIA'}</span>
                        <span className="block text-sm">{lesao.localizacao}</span>
                        {lesao.curativo && <span className="block text-[10px] text-slate-400 mt-1">Último curativo: {lesao.curativo}</span>}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* TIPO DE CURATIVO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Tipo de Curativo</label>
                <div className="grid grid-cols-2 gap-2">
                  {['AGE', 'Hidrocoloide', 'Hidrogel', 'Alginato', 'Carvão Ativado', 'Filme Transparente', 'Espuma', 'Soro Fisiológico', 'Papaina', 'Colagenase', 'Óleo de Girassol', 'Sulfadiazina', 'Outro'].map(tipo => (
                    <button key={tipo} onClick={() => setModalCurativo({ ...modalCurativo, tipoCurativo: tipo })} className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalCurativo.tipoCurativo === tipo ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-200'}`}>{tipo}</button>
                  ))}
                </div>
              </div>

              {/* OBSERVAÇÃO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Observação (opcional)</label>
                <textarea 
                  value={modalCurativo.observacao}
                  onChange={(e) => setModalCurativo({ ...modalCurativo, observacao: e.target.value })}
                  placeholder="Ex: Aspecto da lesão, bordas, exsudato..."
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-emerald-300 text-sm resize-none h-20"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 shrink-0">
                <button onClick={() => setModalCurativo({ ...modalCurativo, isOpen: false })} className="px-4 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">Cancelar</button>
                <button disabled={!modalCurativo.horario || !modalCurativo.lesaoLocal || !modalCurativo.tipoCurativo} onClick={salvarCurativo} className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"><CheckCircle2 size={18} /> Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ACESSO PERIFÉRICO (Enfermagem)                     */}
      {/* ======================================================== */}
      {modalAcessoPeriferico.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-indigo-500/20 my-auto">
            <div className="bg-indigo-600 p-5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><Syringe size={20} /></div>
                <h2 className="text-lg font-black tracking-wide leading-tight">Acesso Periférico</h2>
              </div>
              <button onClick={() => setModalAcessoPeriferico({ ...modalAcessoPeriferico, isOpen: false })} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"><X size={24} /></button>
            </div>

            <div className="p-6 bg-slate-50 space-y-6 overflow-y-auto max-h-[70vh]">
              {/* HORÁRIO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Horário da Punção</label>
                <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalAcessoPeriferico.horario ? modalAcessoPeriferico.horario.split(':')[0] : "00"} onChange={(e) => setModalAcessoPeriferico({ ...modalAcessoPeriferico, horario: `${e.target.value}:${modalAcessoPeriferico.horario ? modalAcessoPeriferico.horario.split(':')[1] : '00'}` })}>
                    {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}h</option>)}
                  </select>
                  <span className="text-3xl font-black text-slate-300 pb-1">:</span>
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalAcessoPeriferico.horario ? modalAcessoPeriferico.horario.split(':')[1] : "00"} onChange={(e) => setModalAcessoPeriferico({ ...modalAcessoPeriferico, horario: `${modalAcessoPeriferico.horario ? modalAcessoPeriferico.horario.split(':')[0] : '00'}:${e.target.value}` })}>
                    {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* LOCAL */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Local da Punção</label>
                <div className="grid grid-cols-2 gap-2">
                  {['MSD', 'MSE', 'MID', 'MIE', 'Jugular Externa D', 'Jugular Externa E'].map(local => (
                    <button key={local} onClick={() => setModalAcessoPeriferico({ ...modalAcessoPeriferico, local })} className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalAcessoPeriferico.local === local ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-200'}`}>{local}</button>
                  ))}
                </div>
              </div>

              {/* CALIBRE */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Calibre do Jelco</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: '14G', cor: 'bg-orange-500' }, { val: '16G', cor: 'bg-gray-400' }, 
                    { val: '18G', cor: 'bg-green-500' }, { val: '20G', cor: 'bg-pink-400' }, 
                    { val: '22G', cor: 'bg-blue-500' }, { val: '24G', cor: 'bg-yellow-400' }
                  ].map(cal => (
                    <button key={cal.val} onClick={() => setModalAcessoPeriferico({ ...modalAcessoPeriferico, calibre: cal.val })} className={`relative p-3 rounded-xl border-2 font-black text-sm transition-all overflow-hidden ${modalAcessoPeriferico.calibre === cal.val ? 'border-indigo-500 text-indigo-800 shadow-md scale-105' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200'}`}>
                      <div className={`absolute top-0 left-0 w-full h-1 ${cal.cor}`}></div>
                      {cal.val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 shrink-0">
                <button onClick={() => setModalAcessoPeriferico({ ...modalAcessoPeriferico, isOpen: false })} className="px-4 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">Cancelar</button>
                <button disabled={!modalAcessoPeriferico.horario || !modalAcessoPeriferico.local || !modalAcessoPeriferico.calibre} onClick={salvarAcessoPeriferico} className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"><CheckCircle2 size={18} /> Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: INSERÇÃO CVC                                       */}
      {/* ======================================================== */}
      {modalCVC.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-blue-500/20 my-auto">
            <div className="bg-blue-600 p-5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><Syringe size={20} /></div>
                <h2 className="text-lg font-black tracking-wide leading-tight">Inserção CVC</h2>
              </div>
              <button onClick={() => setModalCVC({ ...modalCVC, isOpen: false })} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"><X size={24} /></button>
            </div>

            <div className="p-6 bg-slate-50 space-y-5 overflow-y-auto max-h-[70vh]">

              {/* HORÁRIO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Horário do Procedimento</label>
                <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-blue-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalCVC.horario ? modalCVC.horario.split(':')[0] : "00"} onChange={(e) => setModalCVC({ ...modalCVC, horario: `${e.target.value}:${modalCVC.horario ? modalCVC.horario.split(':')[1] : '00'}` })}>
                    {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}h</option>)}
                  </select>
                  <span className="text-3xl font-black text-slate-300 pb-1">:</span>
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-blue-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalCVC.horario ? modalCVC.horario.split(':')[1] : "00"} onChange={(e) => setModalCVC({ ...modalCVC, horario: `${modalCVC.horario ? modalCVC.horario.split(':')[0] : '00'}:${e.target.value}` })}>
                    {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* TIPO DE CATETER */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Tipo de Cateter</label>
                <div className="grid grid-cols-3 gap-2">
                  {['CVC Duplo Lúmen', 'CVC Triplo Lúmen', 'Shiley'].map(tipo => (
                    <button key={tipo} onClick={() => setModalCVC({ ...modalCVC, tipoCateter: tipo })} className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalCVC.tipoCateter === tipo ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200'}`}>{tipo}</button>
                  ))}
                </div>
              </div>

              {/* INDICAÇÃO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Indicação</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Hemodiálise', 'DVA', 'NPT', 'Monitorização', 'Difícil Acesso'].map(ind => (
                    <button key={ind} onClick={() => setModalCVC({ ...modalCVC, indicacao: ind })} className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalCVC.indicacao === ind ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200'}`}>{ind}</button>
                  ))}
                </div>
              </div>

              {/* PASSAGEM */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Tipo de Passagem</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {['Nova Punção', 'Troca'].map(p => (
                    <button key={p} onClick={() => setModalCVC({ ...modalCVC, passagem: p, motivoTroca: p === 'Nova Punção' ? '' : modalCVC.motivoTroca })} className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalCVC.passagem === p ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200'}`}>{p}</button>
                  ))}
                </div>
                {modalCVC.passagem === 'Troca' && (
                  <input 
                    type="text" 
                    placeholder="Motivo da troca..."
                    value={modalCVC.motivoTroca}
                    onChange={(e) => setModalCVC({ ...modalCVC, motivoTroca: e.target.value })}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-blue-300 text-sm"
                  />
                )}
              </div>

              {/* LOCAL DA INSERÇÃO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Local da Inserção</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Subclávia D', val: 'Subclávia D' },
                    { label: 'Subclávia E', val: 'Subclávia E' },
                    { label: 'Jugular D', val: 'Jugular D' },
                    { label: 'Jugular E', val: 'Jugular E' },
                    { label: 'Femoral D', val: 'Femoral D' },
                    { label: 'Femoral E', val: 'Femoral E' }
                  ].map(local => (
                    <button key={local.val} onClick={() => setModalCVC({ ...modalCVC, localInserção: local.val })} className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalCVC.localInserção === local.val ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200'}`}>{local.label}</button>
                  ))}
                </div>
              </div>

              {/* MEDIDAS DE BARREIRA */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Medidas de Barreira</label>
                <div className="space-y-2">
                  {[
                    { key: 'higienizacao', label: 'Higienização das mãos' },
                    { key: 'gorro', label: 'Gorro/Touca' },
                    { key: 'avental', label: 'Avental Cirúrgico' },
                    { key: 'mascara', label: 'Máscara' },
                    { key: 'luvas', label: 'Luvas Estéreis' },
                    { key: 'campos', label: 'Campos Estéreis Grandes' },
                    { key: 'assepsia', label: 'Assepsia com Clorexidina Alcoólica 0,5%' },
                    { key: 'tecnicaAssptica', label: 'Técnica Asséptica' },
                    { key: 'curativo24h', label: 'Curativo com Gaze e Micropore a cada 24h' }
                  ].map(item => (
                    <button 
                      key={item.key} 
                      onClick={() => setModalCVC({ ...modalCVC, barreiras: { ...modalCVC.barreiras, [item.key]: !modalCVC.barreiras[item.key] } })}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border-2 text-sm font-bold transition-all ${modalCVC.barreiras[item.key] ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200'}`}
                    >
                      <span>{item.label}</span>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${modalCVC.barreiras[item.key] ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                        {modalCVC.barreiras[item.key] ? '✓' : ''}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* PUNÇÃO ÚNICA */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Punção Única</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {['Sim', 'Não'].map(p => (
                    <button key={p} onClick={() => setModalCVC({ ...modalCVC, puncaoUnica: p })} className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalCVC.puncaoUnica === p ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200'}`}>{p}</button>
                  ))}
                </div>
                {modalCVC.puncaoUnica === 'Não' && (
                  <input 
                    type="number" 
                    min="1"
                    placeholder="Quantas punções?"
                    value={modalCVC.quantasPuncoes}
                    onChange={(e) => setModalCVC({ ...modalCVC, quantasPuncoes: e.target.value })}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-blue-300 text-sm text-center"
                  />
                )}
              </div>

              {/* DIFICULDADES */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Dificuldades</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Anatomia', 'Material', 'Técnica', 'Consentimento', 'Sem dificuldades'].map(d => {
                    const isSelected = modalCVC.dificuldades.includes(d);
                    return (
                      <button key={d} onClick={() => {
                        if (d === 'Sem dificuldades') {
                          setModalCVC({ ...modalCVC, dificuldades: isSelected ? [] : ['Sem dificuldades'] });
                        } else {
                          let novas = isSelected 
                            ? modalCVC.dificuldades.filter(item => item !== d)
                            : [...modalCVC.dificuldades.filter(item => item !== 'Sem dificuldades'), d];
                          setModalCVC({ ...modalCVC, dificuldades: novas });
                        }
                      }} className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${isSelected ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-amber-200'}`}>{d}</button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 shrink-0">
                <button onClick={() => setModalCVC({ ...modalCVC, isOpen: false })} className="px-4 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">Cancelar</button>
                <button disabled={!modalCVC.horario || !modalCVC.tipoCateter || !modalCVC.localInserção} onClick={salvarCVC} className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"><CheckCircle2 size={18} /> Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: MANUTENÇÃO CVC                                     */}
      {/* ======================================================== */}
      {modalManutencaoCVC.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-sky-500/20 my-auto">
            <div className="bg-sky-600 p-5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><Syringe size={20} /></div>
                <h2 className="text-lg font-black tracking-wide leading-tight">Manutenção CVC</h2>
              </div>
              <button onClick={() => setModalManutencaoCVC({ ...modalManutencaoCVC, isOpen: false })} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"><X size={24} /></button>
            </div>

            <div className="p-6 bg-slate-50 space-y-5 overflow-y-auto max-h-[70vh]">

              {/* HORÁRIO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Horário da Manutenção</label>
                <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-sky-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalManutencaoCVC.horario ? modalManutencaoCVC.horario.split(':')[0] : "00"} onChange={(e) => setModalManutencaoCVC({ ...modalManutencaoCVC, horario: `${e.target.value}:${modalManutencaoCVC.horario ? modalManutencaoCVC.horario.split(':')[1] : '00'}` })}>
                    {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}h</option>)}
                  </select>
                  <span className="text-3xl font-black text-slate-300 pb-1">:</span>
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-sky-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalManutencaoCVC.horario ? modalManutencaoCVC.horario.split(':')[1] : "00"} onChange={(e) => setModalManutencaoCVC({ ...modalManutencaoCVC, horario: `${modalManutencaoCVC.horario ? modalManutencaoCVC.horario.split(':')[0] : '00'}:${e.target.value}` })}>
                    {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* TROCA DE CURATIVO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Troca de Curativo</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { label: 'Gaze e micropore', val: 'Gaze e micropore' },
                    { label: 'Filme transparente', val: 'Filme transparente' },
                    { label: 'Curativo estéril oclusivo', val: 'Curativo estéril oclusivo' }
                  ].map(tipo => (
                    <button key={tipo.val} onClick={() => setModalManutencaoCVC({ ...modalManutencaoCVC, trocaCurativo: tipo.val })} className={`w-full p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalManutencaoCVC.trocaCurativo === tipo.val ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-sky-200'}`}>{tipo.label}</button>
                  ))}
                </div>
              </div>

              {/* TIPO: MANUTENÇÃO OU RETIRADA */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Tipo de Registro</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setModalManutencaoCVC({ ...modalManutencaoCVC, motivoTipo: 'Manutenção' })} className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalManutencaoCVC.motivoTipo === 'Manutenção' ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-sky-200'}`}>
                    🔧 Manutenção
                  </button>
                  <button onClick={() => setModalManutencaoCVC({ ...modalManutencaoCVC, motivoTipo: 'Retirada' })} className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalManutencaoCVC.motivoTipo === 'Retirada' ? 'border-red-500 bg-red-50 text-red-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-red-200'}`}>
                    🚫 Motivo da Retirada
                  </button>
                </div>
              </div>

              {/* ===== CAMPOS QUE SÓ APARECEM SE FOR "RETIRADA" ===== */}
              {modalManutencaoCVC.motivoTipo === 'Retirada' && (
                <>
                  {/* SUSPEITA DE INFECÇÃO */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Suspeita de Infecção</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Sim', 'Não'].map(r => (
                        <button key={r} onClick={() => setModalManutencaoCVC({ ...modalManutencaoCVC, motivoInfecao: r })} className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalManutencaoCVC.motivoInfecao === r ? 'border-red-500 bg-red-50 text-red-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-red-200'}`}>{r === 'Sim' ? '⚠️ Sim' : '✅ Não'}</button>
                      ))}
                    </div>
                  </div>

                  {/* OBSTRUÇÃO */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Obstrução</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Sim', 'Não'].map(r => (
                        <button key={r} onClick={() => setModalManutencaoCVC({ ...modalManutencaoCVC, motivoObstrucao: r })} className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalManutencaoCVC.motivoObstrucao === r ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-amber-200'}`}>{r === 'Sim' ? '🔴 Sim' : '✅ Não'}</button>
                      ))}
                    </div>
                  </div>

                  {/* TÉRMINO DA TERAPIA IV */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Término da Terapia IV</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Sim', 'Não'].map(r => (
                        <button key={r} onClick={() => setModalManutencaoCVC({ ...modalManutencaoCVC, motivoTermino: r })} className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalManutencaoCVC.motivoTermino === r ? 'border-green-500 bg-green-50 text-green-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-green-200'}`}>{r === 'Sim' ? '✅ Sim' : '— Não'}</button>
                      ))}
                    </div>
                  </div>

                  {/* ÓBITO */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Óbito</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Sim', 'Não'].map(r => (
                        <button key={r} onClick={() => setModalManutencaoCVC({ ...modalManutencaoCVC, motivoObito: r })} className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalManutencaoCVC.motivoObito === r ? 'border-gray-700 bg-gray-100 text-gray-800 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-gray-300'}`}>{r === 'Sim' ? '⚫ Sim' : '— Não'}</button>
                      ))}
                    </div>
                  </div>

                  {/* OUTROS */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Outros Motivos</label>
                    <input 
                      type="text" 
                      placeholder="Descreva o motivo..."
                      value={modalManutencaoCVC.motivoOutros}
                      onChange={(e) => setModalManutencaoCVC({ ...modalManutencaoCVC, motivoOutros: e.target.value })}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-sky-300 text-sm"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-200 shrink-0">
                <button onClick={() => setModalManutencaoCVC({ ...modalManutencaoCVC, isOpen: false })} className="px-4 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">Cancelar</button>
                <button disabled={!modalManutencaoCVC.horario} onClick={salvarManutencaoCVC} className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"><CheckCircle2 size={18} /> Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: SVD (SONDA VESICAL DE DEMORA)                     */}
      {/* ======================================================== */}
      {modalSVD.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-orange-500/20 my-auto">
            <div className="bg-orange-600 p-5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><Droplets size={20} /></div>
                <h2 className="text-lg font-black tracking-wide leading-tight">Sonda Vesical de Demora</h2>
              </div>
              <button onClick={() => setModalSVD({ ...modalSVD, isOpen: false })} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"><X size={24} /></button>
            </div>

            <div className="p-6 bg-slate-50 space-y-5 overflow-y-auto max-h-[70vh]">

              {/* HORÁRIO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Horário do Procedimento</label>
                <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-orange-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalSVD.horario ? modalSVD.horario.split(':')[0] : "00"} onChange={(e) => setModalSVD({ ...modalSVD, horario: `${e.target.value}:${modalSVD.horario ? modalSVD.horario.split(':')[1] : '00'}` })}>
                    {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}h</option>)}
                  </select>
                  <span className="text-3xl font-black text-slate-300 pb-1">:</span>
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-orange-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalSVD.horario ? modalSVD.horario.split(':')[1] : "00"} onChange={(e) => setModalSVD({ ...modalSVD, horario: `${modalSVD.horario ? modalSVD.horario.split(':')[0] : '00'}:${e.target.value}` })}>
                    {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* INDICAÇÃO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Indicação</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Retenção Urinária', 'Monitorização Débito Urinário', 'Cirurgia', 'Lesão Renal Aguda', 'Incontinência', 'Outra'].map(ind => (
                    <button key={ind} onClick={() => setModalSVD({ ...modalSVD, indicacao: ind })} className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalSVD.indicacao === ind ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-orange-200'}`}>{ind}</button>
                  ))}
                </div>
              </div>

              {/* SEXO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Sexo do Paciente</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Masculino', 'Feminino'].map(g => (
                    <button key={g} onClick={() => setModalSVD({ ...modalSVD, genero: g })} className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalSVD.genero === g ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-orange-200'}`}>{g}</button>
                  ))}
                </div>
              </div>

              {/* CHECKLIST DE SEGURANÇA */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Checklist de Segurança</label>
                <div className="space-y-2">
                  {[
                    { key: 'privacidade', label: 'Privacidade do paciente garantida' },
                    { key: 'higienizacao', label: 'Higienização das mãos' },
                    { key: 'epi', label: 'Uso correto de EPI (gorro, máscara, luvas)' },
                    { key: 'higieneIntima', label: 'Higiene íntima com água e sabão' },
                    { key: 'higienizacaoPosHigiene', label: 'Higienização das mãos após higiene íntima' },
                    { key: 'pacoteAberto', label: 'Pacote de cateterismo aberto corretamente' },
                    { key: 'luvasEsteris', label: 'Luvas estéreis na técnica correta' },
                    { key: 'antissepsia', label: 'Antissepsia da genitália com Clorexidina aquosa' },
                    { key: 'xilocaina', label: 'Xilocaína estéril de uso único' },
                    { key: 'xilocainaSeringa', label: 'Sondagem masc: 20ml xilocaína na seringa' },
                    { key: 'campoFenestrado', label: 'Campo estéril fenestrado entre MMII' },
                    { key: 'introducao1op', label: 'Introdução da sonda na 1ª oportunidade' },
                    { key: 'tecnicaAssptica', label: 'Inserção do cateter na técnica asséptica' },
                    { key: 'insuflacaoBalao', label: 'Insuflação do balão' },
                    { key: 'fixacao', label: 'Fixação da sonda' },
                    { key: 'higienizacaoPos', label: 'Higienização das mãos pós-procedimento' }
                  ].map(item => (
                    <button 
                      key={item.key} 
                      onClick={() => setModalSVD({ ...modalSVD, itens: { ...modalSVD.itens, [item.key]: !modalSVD.itens[item.key] } })}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border-2 text-sm font-bold transition-all ${modalSVD.itens[item.key] ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 bg-white text-slate-500 hover:border-orange-200'}`}
                    >
                      <span>{item.label}</span>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${modalSVD.itens[item.key] ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                        {modalSVD.itens[item.key] ? '✓' : ''}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* JUSTIFICATIVA (só aparece se "Outra") */}
              {modalSVD.indicacao === 'Outra' && (
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Descreva a justificativa</label>
                  <input 
                    type="text" 
                    placeholder="Descreva a justificativa..."
                    value={modalSVD.justificativa}
                    onChange={(e) => setModalSVD({ ...modalSVD, justificativa: e.target.value })}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-orange-300 text-sm"
                  />
                </div>
              )}

              {/* OBSERVAÇÃO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Observações (opcional)</label>
                <textarea 
                  value={modalSVD.observacao}
                  onChange={(e) => setModalSVD({ ...modalSVD, observacao: e.target.value })}
                  placeholder="Intercorrências, dificuldades..."
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-orange-300 text-sm resize-none h-16"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 shrink-0">
                <button onClick={() => setModalSVD({ ...modalSVD, isOpen: false })} className="px-4 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">Cancelar</button>
                <button disabled={!modalSVD.horario} onClick={salvarSVD} className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"><CheckCircle2 size={18} /> Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*  */}
      {/* MODAL: MANUTENÇÃO SVD (SONDA VESICAL DE DEMORA) */}
      {/*  */}
      {modalManutencaoSVD.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-amber-500/20 my-auto">
            <div className="bg-amber-600 p-5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><Droplets size={20} /></div>
                <h2 className="text-lg font-black tracking-wide leading-tight">Manutenção SVD</h2>
              </div>
              <button onClick={() => setModalManutencaoSVD({ ...modalManutencaoSVD, isOpen: false })} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"><X size={24} /></button>
            </div>

            <div className="p-6 bg-slate-50 space-y-5 overflow-y-auto max-h-[70vh]">

              {/* HORÁRIO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Horário da Avaliação</label>
                <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-amber-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalManutencaoSVD.horario ? modalManutencaoSVD.horario.split(':')[0] : "00"} onChange={(e) => setModalManutencaoSVD({ ...modalManutencaoSVD, horario: `${e.target.value}:${modalManutencaoSVD.horario ? modalManutencaoSVD.horario.split(':')[1] : '00'}` })}>
                    {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}h</option>)}
                  </select>
                  <span className="text-3xl font-black text-slate-300 pb-1">:</span>
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-amber-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalManutencaoSVD.horario ? modalManutencaoSVD.horario.split(':')[1] : "00"} onChange={(e) => setModalManutencaoSVD({ ...modalManutencaoSVD, horario: `${modalManutencaoSVD.horario ? modalManutencaoSVD.horario.split(':')[0] : '00'}:${e.target.value}` })}>
                    {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* UNIDADE DE INSERÇÃO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Unidade onde foi inserido</label>
                <div className="grid grid-cols-4 gap-2">
                  {['UTI', 'UPA', 'HMA', 'Outro'].map(un => (
                    <button key={un} onClick={() => setModalManutencaoSVD({ ...modalManutencaoSVD, unidadeInserção: un })} className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalManutencaoSVD.unidadeInserção === un ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-amber-200'}`}>{un}</button>
                  ))}
                </div>
              </div>

              {/* TIPO DE SONDA */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Tipo de Sonda</label>
                <div className="grid grid-cols-2 gap-2">
                  {['2 vias', '3 vias'].map(t => (
                    <button key={t} onClick={() => setModalManutencaoSVD({ ...modalManutencaoSVD, tipoSonda: t })} className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalManutencaoSVD.tipoSonda === t ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-amber-200'}`}>{t}</button>
                  ))}
                </div>
              </div>

              {/* CHECKLIST DE MANUTENÇÃO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Checklist de Manutenção</label>
                <div className="space-y-2">
                  {[
                    { key: 'higieneMeato', label: 'Higiene do meato uretral' },
                    { key: 'uretraIntegra', label: 'Uretra íntegra' },
                    { key: 'fixacaoAdequada', label: 'Fixação em local adequado' },
                    { key: 'fixacaoSemTracao', label: 'Fixação sem tração do cateter' },
                    { key: 'fluxoDesobstruido', label: 'Fluxo de urina desobstruído' },
                    { key: 'nivelBolsa', label: 'Nível da bolsa até 2/3 do volume total' },
                    { key: 'bolsaAbaixoBexiga', label: 'Bolsa abaixo da altura da bexiga' },
                    { key: 'drenagemFechado', label: 'Sistema de drenagem fechado' },
                    { key: 'aspectoUrina', label: 'Aspecto da urina normal' }
                  ].map(item => (
                    <button 
                      key={item.key} 
                      onClick={() => setModalManutencaoSVD({ ...modalManutencaoSVD, itens: { ...modalManutencaoSVD.itens, [item.key]: !modalManutencaoSVD.itens[item.key] } })}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border-2 text-sm font-bold transition-all ${modalManutencaoSVD.itens[item.key] ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 bg-white text-slate-500 hover:border-amber-200'}`}
                    >
                      <span>{item.label}</span>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${modalManutencaoSVD.itens[item.key] ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                        {modalManutencaoSVD.itens[item.key] ? '✓' : ''}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* OBSERVAÇÕES */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Observações</label>
                <textarea value={modalManutencaoSVD.observacao} onChange={(e) => setModalManutencaoSVD({ ...modalManutencaoSVD, observacao: e.target.value })} placeholder="Intercorrências, aspectos relevantes..." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-amber-300 text-sm resize-none h-16" />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 shrink-0">
                <button onClick={() => setModalManutencaoSVD({ ...modalManutencaoSVD, isOpen: false })} className="px-4 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">Cancelar</button>
                <button disabled={!modalManutencaoSVD.horario} onClick={salvarManutencaoSVD} className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"><CheckCircle2 size={18} /> Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*  */}
      {/* MODAL: GASOMETRIA */}
      {/*  */}
      {modalGasometria.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-lime-500/20 my-auto">
            <div className="bg-lime-600 p-5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><Activity size={20} /></div>
                <h2 className="text-lg font-black tracking-wide">Gasometria</h2>
              </div>
              <button onClick={() => setModalGasometria({ ...modalGasometria, isOpen: false })} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"><X size={24} /></button>
            </div>

            <div className="p-6 bg-slate-50 space-y-6">

              {/* HORÁRIO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Horário da Coleta</label>
                <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-lime-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalGasometria.horario ? modalGasometria.horario.split(':')[0] : "00"} onChange={(e) => setModalGasometria({ ...modalGasometria, horario: `${e.target.value}:${modalGasometria.horario ? modalGasometria.horario.split(':')[1] : '00'}` })}>
                    {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}h</option>)}
                  </select>
                  <span className="text-3xl font-black text-slate-300 pb-1">:</span>
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-lime-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalGasometria.horario ? modalGasometria.horario.split(':')[1] : "00"} onChange={(e) => setModalGasometria({ ...modalGasometria, horario: `${modalGasometria.horario ? modalGasometria.horario.split(':')[0] : '00'}:${e.target.value}` })}>
                    {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* TIPO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Tipo de Gasometria</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Arterial', 'Venosa Central', 'Pareada'].map(t => (
                    <button key={t} onClick={() => setModalGasometria({ ...modalGasometria, tipo: t })} className={`p-4 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalGasometria.tipo === t ? 'border-lime-500 bg-lime-50 text-lime-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-lime-200'}`}>{t}</button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 shrink-0">
                <button onClick={() => setModalGasometria({ ...modalGasometria, isOpen: false })} className="px-4 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">Cancelar</button>
                <button disabled={!modalGasometria.horario || !modalGasometria.tipo} onClick={salvarGasometria} className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"><CheckCircle2 size={18} /> Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*  */}
      {/* MODAL: HEMOTRANSFUSÃO */}
      {/*  */}
      {modalHemotransfusao.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-red-500/20 my-auto">
            <div className="bg-red-700 p-5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><Droplets size={20} /></div>
                <h2 className="text-lg font-black tracking-wide leading-tight">Hemotransfusão</h2>
              </div>
              <button onClick={() => setModalHemotransfusao({ ...modalHemotransfusao, isOpen: false })} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"><X size={24} /></button>
            </div>

            <div className="p-6 bg-slate-50 space-y-5 overflow-y-auto max-h-[70vh]">

              {/* HORÁRIO DE INÍCIO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Horário de Início</label>
                <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-red-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalHemotransfusao.horarioInicio ? modalHemotransfusao.horarioInicio.split(':')[0] : "00"} onChange={(e) => setModalHemotransfusao({ ...modalHemotransfusao, horarioInicio: `${e.target.value}:${modalHemotransfusao.horarioInicio ? modalHemotransfusao.horarioInicio.split(':')[1] : '00'}` })}>
                    {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}h</option>)}
                  </select>
                  <span className="text-3xl font-black text-slate-300 pb-1">:</span>
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-red-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalHemotransfusao.horarioInicio ? modalHemotransfusao.horarioInicio.split(':')[1] : "00"} onChange={(e) => setModalHemotransfusao({ ...modalHemotransfusao, horarioInicio: `${modalHemotransfusao.horarioInicio ? modalHemotransfusao.horarioInicio.split(':')[0] : '00'}:${e.target.value}` })}>
                    {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* HEMOCOMPONENTE */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Hemocomponente</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'Concentrado de Hemácias', label: 'CH' },
                    { key: 'Plasma Fresco Congelado', label: 'PFC' },
                    { key: 'Concentrado de Plaquetas', label: 'Plaquetas' },
                    { key: 'Crioprecipitado', label: 'Crioprecipitado' }
                  ].map(item => (
                    <button key={item.key} onClick={() => setModalHemotransfusao({ ...modalHemotransfusao, hemocomponente: item.key, outroHemocomponente: '' })} className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalHemotransfusao.hemocomponente === item.key ? 'border-red-500 bg-red-50 text-red-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-red-200'}`}>{item.label}</button>
                  ))}
                  <button onClick={() => setModalHemotransfusao({ ...modalHemotransfusao, hemocomponente: 'Outro' })} className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalHemotransfusao.hemocomponente === 'Outro' ? 'border-red-500 bg-red-50 text-red-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-red-200'}`}>Outro</button>
                </div>
                {modalHemotransfusao.hemocomponente === 'Outro' && (
                  <input type="text" placeholder="Especificar hemocomponente..." value={modalHemotransfusao.outroHemocomponente} onChange={(e) => setModalHemotransfusao({ ...modalHemotransfusao, outroHemocomponente: e.target.value })} className="w-full p-2.5 mt-2 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-red-300 text-sm" />
                )}
              </div>

              {/* DADOS DA BOLSA */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                <label className="text-xs font-bold text-slate-600 block text-center uppercase tracking-wider">Dados da Bolsa</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nº da Bolsa</label>
                    <input type="text" value={modalHemotransfusao.numeroBolsa} onChange={(e) => setModalHemotransfusao({ ...modalHemotransfusao, numeroBolsa: e.target.value })} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-red-300 text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Volume (ml)</label>
                    <input type="text" value={modalHemotransfusao.volume} onChange={(e) => setModalHemotransfusao({ ...modalHemotransfusao, volume: e.target.value })} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-red-300 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Grupo ABO</label>
                    <select value={modalHemotransfusao.grupoABO} onChange={(e) => setModalHemotransfusao({ ...modalHemotransfusao, grupoABO: e.target.value })} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-red-300 text-sm">
                      <option value="">--</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="AB">AB</option>
                      <option value="O">O</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rh</label>
                    <div className="grid grid-cols-2 gap-1">
                      {['Positivo', 'Negativo'].map(r => (
                        <button key={r} onClick={() => setModalHemotransfusao({ ...modalHemotransfusao, rh: r })} className={`p-2 rounded-xl border-2 font-bold text-xs transition-all ${modalHemotransfusao.rh === r ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>{r === 'Positivo' ? '+' : '−'}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Validade</label>
                    <input type="date" value={modalHemotransfusao.validade} onChange={(e) => setModalHemotransfusao({ ...modalHemotransfusao, validade: e.target.value })} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-red-300 text-sm" />
                  </div>
                </div>
              </div>

              {/* CHECKLIST DE SEGURANÇA - DUPLA CHECAGEM */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Dupla Checagem de Segurança</label>
                <div className="space-y-2">
                  {[
                    { key: 'crossmatch', label: 'Teste de compatibilidade (crossmatch) realizado' },
                    { key: 'acessoVenoso', label: 'Acesso venoso calibroso e pérvio' },
                    { key: 'equipoFiltro', label: 'Equipo de infusão com filtro para hemocomponente' }
                  ].map(item => (
                    <button key={item.key} onClick={() => setModalHemotransfusao({ ...modalHemotransfusao, [item.key]: !modalHemotransfusao[item.key] })} className={`w-full flex items-center justify-between p-2.5 rounded-xl border-2 text-sm font-bold transition-all ${modalHemotransfusao[item.key] ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 bg-white text-slate-500 hover:border-red-200'}`}>
                      <span>{item.label}</span>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${modalHemotransfusao[item.key] ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'}`}>{modalHemotransfusao[item.key] ? '✓' : ''}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* SINAIS VITAIS */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Sinais Vitais</label>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-200">
                        <th className="p-2 font-bold text-slate-600 text-left">Momento</th>
                        <th className="p-2 font-bold text-slate-600">PA</th>
                        <th className="p-2 font-bold text-slate-600">FC</th>
                        <th className="p-2 font-bold text-slate-600">FR</th>
                        <th className="p-2 font-bold text-slate-600">SatO₂</th>
                        <th className="p-2 font-bold text-slate-600">Temp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { key: 'pre', label: 'Pré-transfusional' },
                        { key: 'min15', label: '15 min' },
                        { key: 'min30', label: '30 min' },
                        { key: 'min60', label: '1 hora' },
                        { key: 'final', label: 'Final' }
                      ].map(momento => (
                        <tr key={momento.key} className="border-b border-slate-100">
                          <td className="p-1.5 font-bold text-slate-600 text-left">{momento.label}</td>
                          {['pa','fc','fr','sat','temp'].map(campo => (
                            <td key={campo} className="p-1">
                              <input type="text" value={modalHemotransfusao.sinaisVitais[momento.key][campo] || ''} onChange={(e) => setModalHemotransfusao({ ...modalHemotransfusao, sinaisVitais: { ...modalHemotransfusao.sinaisVitais, [momento.key]: { ...modalHemotransfusao.sinaisVitais[momento.key], [campo]: e.target.value } } })} className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 outline-none focus:ring-1 focus:ring-red-300 text-center text-xs" placeholder="—" />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* REAÇÕES ADVERSAS */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Reações Adversas</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Febre', 'Calafrios', 'Urticária', 'Dispneia', 'Hipotensão', 'Dor Lombar', 'Cianose', 'Náuseas'].map(r => (
                    <button key={r} onClick={() => setModalHemotransfusao({ ...modalHemotransfusao, reacao: modalHemotransfusao.reacao === r ? '' : r, reacaoDescricao: modalHemotransfusao.reacao === r ? '' : modalHemotransfusao.reacaoDescricao })} className={`p-2.5 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalHemotransfusao.reacao === r ? 'border-red-500 bg-red-50 text-red-700 shadow-md' : 'border-slate-200 bg-white text-slate-500 hover:border-red-200'}`}>{r}</button>
                  ))}
                  <button onClick={() => setModalHemotransfusao({ ...modalHemotransfusao, reacao: 'Outra' })} className={`p-2.5 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalHemotransfusao.reacao === 'Outra' ? 'border-red-500 bg-red-50 text-red-700 shadow-md' : 'border-slate-200 bg-white text-slate-500 hover:border-red-200'}`}>Outra</button>
                </div>
                {modalHemotransfusao.reacao && (
                  <div className="mt-3 space-y-3">
                    {modalHemotransfusao.reacao === 'Outra' && (
                      <input type="text" placeholder="Descreva a reação..." value={modalHemotransfusao.reacaoDescricao} onChange={(e) => setModalHemotransfusao({ ...modalHemotransfusao, reacaoDescricao: e.target.value })} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-red-300 text-sm" />
                    )}
                    <div className="flex items-center gap-3">
                      <button onClick={() => setModalHemotransfusao({ ...modalHemotransfusao, suspendeu: !modalHemotransfusao.suspendeu })} className={`px-4 py-2.5 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalHemotransfusao.suspendeu ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-500'}`}>Suspendeu a Transfusão?</button>
                      <input type="text" placeholder="Conduta adotada..." value={modalHemotransfusao.conduta} onChange={(e) => setModalHemotransfusao({ ...modalHemotransfusao, conduta: e.target.value })} className="flex-1 p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-red-300 text-sm" />
                    </div>
                  </div>
                )}
              </div>

              {/* TÉRMINO */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                <label className="text-xs font-bold text-slate-600 block text-center uppercase tracking-wider">Término</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Horário de Término</label>
                    <div className="flex items-center justify-center gap-1 bg-slate-50 p-1 border border-slate-200 rounded-xl">
                      <select className="w-16 p-2 bg-white border border-slate-200 rounded-lg text-slate-700 outline-none focus:ring-1 focus:ring-red-300 font-bold text-center text-lg" value={modalHemotransfusao.horarioTermino ? modalHemotransfusao.horarioTermino.split(':')[0] : "00"} onChange={(e) => setModalHemotransfusao({ ...modalHemotransfusao, horarioTermino: `${e.target.value}:${modalHemotransfusao.horarioTermino ? modalHemotransfusao.horarioTermino.split(':')[1] : '00'}` })}>
                        {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <span className="text-2xl font-black text-slate-300">:</span>
                      <select className="w-16 p-2 bg-white border border-slate-200 rounded-lg text-slate-700 outline-none focus:ring-1 focus:ring-red-300 font-bold text-center text-lg" value={modalHemotransfusao.horarioTermino ? modalHemotransfusao.horarioTermino.split(':')[1] : "00"} onChange={(e) => setModalHemotransfusao({ ...modalHemotransfusao, horarioTermino: `${modalHemotransfusao.horarioTermino ? modalHemotransfusao.horarioTermino.split(':')[0] : '00'}:${e.target.value}` })}>
                        {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Volume Infundido (ml)</label>
                    <input type="text" value={modalHemotransfusao.volumeInfundido} onChange={(e) => setModalHemotransfusao({ ...modalHemotransfusao, volumeInfundido: e.target.value })} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-red-300 text-sm" />
                  </div>
                </div>
              </div>

              {/* OBSERVAÇÕES */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Observações</label>
                <textarea value={modalHemotransfusao.observacao} onChange={(e) => setModalHemotransfusao({ ...modalHemotransfusao, observacao: e.target.value })} placeholder="Intercorrências, evolução, resposta clínica..." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-red-300 text-sm resize-none h-16" />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 shrink-0">
                <button onClick={() => setModalHemotransfusao({ ...modalHemotransfusao, isOpen: false })} className="px-4 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">Cancelar</button>
                <button disabled={!modalHemotransfusao.horarioInicio || !modalHemotransfusao.hemocomponente} onClick={salvarHemotransfusao} className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"><CheckCircle2 size={18} /> Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*  */}
      {/* MODAL: ECG */}
      {/*  */}
      {modalECG.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-violet-500/20 my-auto">
            <div className="bg-violet-600 p-5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><Activity size={20} /></div>
                <h2 className="text-lg font-black tracking-wide">ECG</h2>
              </div>
              <button onClick={() => setModalECG({ ...modalECG, isOpen: false })} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"><X size={24} /></button>
            </div>

            <div className="p-6 bg-slate-50 space-y-6">

              {/* HORÁRIO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Horário da Realização</label>
                <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-violet-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalECG.horario ? modalECG.horario.split(':')[0] : "00"} onChange={(e) => setModalECG({ ...modalECG, horario: `${e.target.value}:${modalECG.horario ? modalECG.horario.split(':')[1] : '00'}` })}>
                    {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}h</option>)}
                  </select>
                  <span className="text-3xl font-black text-slate-300 pb-1">:</span>
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-violet-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalECG.horario ? modalECG.horario.split(':')[1] : "00"} onChange={(e) => setModalECG({ ...modalECG, horario: `${modalECG.horario ? modalECG.horario.split(':')[0] : '00'}:${e.target.value}` })}>
                    {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* POSICIONAMENTO V3R/V4R */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Posicionamento Especial</label>
                <button 
                  onClick={() => setModalECG({ ...modalECG, posicionamentoV3R: !modalECG.posicionamentoV3R })}
                  className={`w-full flex items-center justify-center gap-3 p-4 rounded-xl border-2 font-bold text-sm uppercase tracking-wide transition-all ${
                    modalECG.posicionamentoV3R 
                      ? 'border-violet-500 bg-violet-50 text-violet-700 shadow-md' 
                      : 'border-slate-200 bg-white text-slate-500 hover:border-violet-200'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                    modalECG.posicionamentoV3R ? 'bg-violet-500 text-white' : 'bg-slate-200 text-slate-400'
                  }`}>
                    {modalECG.posicionamentoV3R ? '✓' : ''}
                  </span>
                  Com V3R / V4R
                </button>
                <p className="text-[10px] text-slate-400 text-center mt-2">
                  {modalECG.posicionamentoV3R 
                    ? 'ECG realizado com derivações direitas (V3R e V4R)' 
                    : 'Clique se houve posicionamento V3R e V4R'}
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 shrink-0">
                <button onClick={() => setModalECG({ ...modalECG, isOpen: false })} className="px-4 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">Cancelar</button>
                <button disabled={!modalECG.horario} onClick={salvarECG} className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"><CheckCircle2 size={18} /> Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*  */}
      {/* MODAL: FLEET ENEMA */}
      {/*  */}
      {modalFleetEnema.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-orange-500/20 my-auto">
            <div className="bg-orange-600 p-5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><Activity size={20} /></div>
                <h2 className="text-lg font-black tracking-wide">Fleet Enema</h2>
              </div>
              <button onClick={() => setModalFleetEnema({ ...modalFleetEnema, isOpen: false })} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"><X size={24} /></button>
            </div>

            <div className="p-6 bg-slate-50 space-y-6">

              {/* HORÁRIO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Horário da Administração</label>
                <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-orange-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalFleetEnema.horario ? modalFleetEnema.horario.split(':')[0] : "00"} onChange={(e) => setModalFleetEnema({ ...modalFleetEnema, horario: `${e.target.value}:${modalFleetEnema.horario ? modalFleetEnema.horario.split(':')[1] : '00'}` })}>
                    {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}h</option>)}
                  </select>
                  <span className="text-3xl font-black text-slate-300 pb-1">:</span>
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-orange-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalFleetEnema.horario ? modalFleetEnema.horario.split(':')[1] : "00"} onChange={(e) => setModalFleetEnema({ ...modalFleetEnema, horario: `${modalFleetEnema.horario ? modalFleetEnema.horario.split(':')[0] : '00'}:${e.target.value}` })}>
                    {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 shrink-0">
                <button onClick={() => setModalFleetEnema({ ...modalFleetEnema, isOpen: false })} className="px-4 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">Cancelar</button>
                <button disabled={!modalFleetEnema.horario} onClick={salvarFleetEnema} className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"><CheckCircle2 size={18} /> Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*  */}
      {/* MODAL: NPT (NUTRIÇÃO PARENTERAL TOTAL) */}
      {/*  */}
      {modalNPT.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-purple-500/20 my-auto">
            <div className="bg-purple-700 p-5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><Droplets size={20} /></div>
                <h2 className="text-lg font-black tracking-wide">NPT</h2>
              </div>
              <button onClick={() => setModalNPT({ ...modalNPT, isOpen: false })} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"><X size={24} /></button>
            </div>

            <div className="p-6 bg-slate-50 space-y-6">

              {/* HORÁRIO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Horário da Instalação</label>
                <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-purple-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalNPT.horario ? modalNPT.horario.split(':')[0] : "00"} onChange={(e) => setModalNPT({ ...modalNPT, horario: `${e.target.value}:${modalNPT.horario ? modalNPT.horario.split(':')[1] : '00'}` })}>
                    {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}h</option>)}
                  </select>
                  <span className="text-3xl font-black text-slate-300 pb-1">:</span>
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-purple-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalNPT.horario ? modalNPT.horario.split(':')[1] : "00"} onChange={(e) => setModalNPT({ ...modalNPT, horario: `${modalNPT.horario ? modalNPT.horario.split(':')[0] : '00'}:${e.target.value}` })}>
                    {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* CONFIRMAÇÃO ACESSO CENTRAL EXCLUSIVO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Acesso Central Exclusivo</label>
                <button 
                  onClick={() => setModalNPT({ ...modalNPT, acessoCentralExclusivo: !modalNPT.acessoCentralExclusivo })}
                  className={`w-full flex items-center justify-center gap-3 p-4 rounded-xl border-2 font-bold text-sm uppercase tracking-wide transition-all ${
                    modalNPT.acessoCentralExclusivo 
                      ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-md' 
                      : 'border-slate-200 bg-white text-slate-500 hover:border-purple-200'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                    modalNPT.acessoCentralExclusivo ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-400'
                  }`}>
                    {modalNPT.acessoCentralExclusivo ? '✓' : ''}
                  </span>
                  Acesso Central / Via Exclusiva
                </button>
                <p className="text-[10px] text-slate-400 text-center mt-2">
                  {modalNPT.acessoCentralExclusivo 
                    ? 'Confirmado: NPT em acesso central com via exclusiva' 
                    : 'Confirme se a NPT está sendo infundida em acesso central com via exclusiva'}
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 shrink-0">
                <button onClick={() => setModalNPT({ ...modalNPT, isOpen: false })} className="px-4 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">Cancelar</button>
                <button disabled={!modalNPT.horario} onClick={salvarNPT} className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"><CheckCircle2 size={18} /> Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*  */}
      {/* MODAL: ASPIRAÇÃO TRAQUEAL */}
      {/*  */}
      {modalAspiracao.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-cyan-500/20 my-auto">
            <div className="bg-cyan-700 p-5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><Wind size={20} /></div>
                <h2 className="text-lg font-black tracking-wide">Aspiração Traqueal</h2>
              </div>
              <button onClick={() => setModalAspiracao({ ...modalAspiracao, isOpen: false })} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"><X size={24} /></button>
            </div>

            <div className="p-6 bg-slate-50 space-y-5">

              {/* HORÁRIO DA ASPIRAÇÃO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Horário da Aspiração</label>
                <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalAspiracao.horario ? modalAspiracao.horario.split(':')[0] : "00"} onChange={(e) => setModalAspiracao({ ...modalAspiracao, horario: `${e.target.value}:${modalAspiracao.horario ? modalAspiracao.horario.split(':')[1] : '00'}` })}>
                    {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}h</option>)}
                  </select>
                  <span className="text-3xl font-black text-slate-300 pb-1">:</span>
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalAspiracao.horario ? modalAspiracao.horario.split(':')[1] : "00"} onChange={(e) => setModalAspiracao({ ...modalAspiracao, horario: `${modalAspiracao.horario ? modalAspiracao.horario.split(':')[0] : '00'}:${e.target.value}` })}>
                    {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* VIA AÉREA */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Via Aérea</label>
                <div className="grid grid-cols-3 gap-2">
                  {['TOT', 'TQT', 'Cânula'].map(via => (
                    <button key={via} onClick={() => setModalAspiracao({ ...modalAspiracao, viaAerea: via })} className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalAspiracao.viaAerea === via ? 'border-cyan-500 bg-cyan-50 text-cyan-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-cyan-200'}`}>{via}</button>
                  ))}
                </div>
              </div>

              {/* QUANTIDADE DE SECREÇÃO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Quantidade de Secreção</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'Pouca', icon: '●○○' },
                    { key: 'Moderada', icon: '●●○' },
                    { key: 'Abundante', icon: '●●●' }
                  ].map(item => (
                    <button key={item.key} onClick={() => setModalAspiracao({ ...modalAspiracao, quantidade: item.key })} className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all flex flex-col items-center gap-1 ${modalAspiracao.quantidade === item.key ? 'border-cyan-500 bg-cyan-50 text-cyan-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-cyan-200'}`}>
                      <span className="text-[10px] tracking-widest">{item.icon}</span>
                      <span>{item.key}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* CARACTERÍSTICA */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Característica</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Fluida', 'Espessa', 'Sanguinol.'].map(c => (
                    <button key={c} onClick={() => setModalAspiracao({ ...modalAspiracao, caracteristica: c })} className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalAspiracao.caracteristica === c ? 'border-cyan-500 bg-cyan-50 text-cyan-700 shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-cyan-200'}`}>{c}</button>
                  ))}
                </div>
              </div>

              {/* OXIGENAÇÃO PRÉVIA */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Oximetria (SatO₂ Pré)</label>
                <div className="flex items-center justify-center gap-3">
                  <input type="text" value={modalAspiracao.oxigenacaoPre} onChange={(e) => setModalAspiracao({ ...modalAspiracao, oxigenacaoPre: e.target.value })} placeholder="Ex: 95%" className="w-32 p-3 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300 text-center text-lg font-bold" />
                  <span className="text-xs font-bold text-slate-400 uppercase">%</span>
                </div>
              </div>

              {/* INTERCORRÊNCIAS */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Intercorrências</label>
                <textarea value={modalAspiracao.intercorrencias} onChange={(e) => setModalAspiracao({ ...modalAspiracao, intercorrencias: e.target.value })} placeholder="Tosse, desconforto, sangramento, etc." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300 text-sm resize-none h-16" />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 shrink-0">
                <button onClick={() => setModalAspiracao({ ...modalAspiracao, isOpen: false })} className="px-4 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">Cancelar</button>
                <button disabled={!modalAspiracao.horario || !modalAspiracao.quantidade || !modalAspiracao.caracteristica} onClick={salvarAspiracao} className="flex-1 py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"><CheckCircle2 size={18} /> Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default NursingDashboard;