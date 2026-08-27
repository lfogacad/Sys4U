import React, { useState, useEffect, useRef } from 'react';
import { getTempoVMText, calculateCreatinineClearance } from '../../utils/core';
import { CONSISTENCIA_ALIMENTAR, FORMULAS_ENTERAIS, NUTRI_ENTERAL_INFO, NUTRI_PARENTERAL_INFO } from '../../constants/clinicalLists';

/* ============================================================
   VisitaMultiTab — Visita Multidisciplinar (Sys4U / UTI)
   ------------------------------------------------------------
   • Cada profissional preenche a sua aba (campos fixos + observações)
   • Painel "Metas do Dia" COMPARTILHADO, visível em TODAS as abas
   • Metas automáticas (análise clínica da aba do Técnico) ficam
     "aguardando" até o Médico RT ou o Médico Plantonista confirmar
     ou rejeitar
   • Metas canceladas (com justificativa) e não cumpridas aparecem
     na visita do dia seguinte
   • Persistência: currentPatient.visita[dataISO] via save()
   ============================================================ */

const obterSexoPaciente = (p) => String(p?.sexo || p?.genero || '').toUpperCase();

const criarVisitaVazia = () => ({
  medicoRotina: {
    planoTerapeutico: '', sedacaoAnalgesia: '', antibiotico: '',
    desmameVentilatorio: '', diretivas: '', observacoes: '',
    profilaxias: {
      tvp: { fatoresRisco: {}, contraindicacoes: {}, indicada: false, tipo: 'farmacologica', farmaco: '' },
      ulceraEstresse: { fatoresRisco: {}, indicada: false, farmaco: '' }
    },
    tot: {
      manterTOT: true, conduta: '',
      criteriosDespertar: { semSedacaoContinua: false, semBloqueioNeuromuscular: false, semAtividadeEpileptica: false, semIsquemiaMiocardica: false, semPicElevada: false, semVasopressorAltaDose: false, semHipoxemiaGrave: false, motivoNao: '' },
      tre: { causaIpraEmResolucao: false, pao2Fio2Adequado: false, semVasopressorOuBaixaDose: false, semSedacaoContinua: false, esforcoInspiratorioPresente: false, semAcidoseRespiratoria: false, semSecrecoesExcessivas: false, semInstabilidadeNeurologica: false, motivoNao: '' }
    }
  },
  medicoPlantonista: { evolucaoPlantao: '', intercorrencias24h: '', condutasPlantao: '', observacoes: '' },
  enfermeiroPlantonista: {
    balancoHidrico: '', escalas: { braden: '', morse: '' },
    dispositivos: { svd: { presente: false, indicacaoManter: false }, sng: { presente: false }, cvc: { presente: false }, acessoHD: { shiley: { presente: false } } },
    higieneOral: { realizada3x: false }, lesoesPressao: { presente: false, estagio: null },
    curativos: '', observacoes: ''
  },
  fisioterapeutaPlantonista: {
    ventilacaoMecanica: { modo: '', fio2: '', peep: '' },
    desmame: '', mobilizacaoPrecoce: '', observacoes: '',
    sincronismo: '',
    tre: {
      causaIpraEmResolucao: false, pao2Fio2Adequado: false,
      semVasopressorOuBaixaDose: false, semSedacaoContinua: false,
      esforcoInspiratorioPresente: false, semAcidoseRespiratoria: false,
      semSecrecoesExcessivas: false, semInstabilidadeNeurologica: false,
      motivoNao: ''
    }
  },
  nutricionista: { viaAcesso: '', dieta: '', metaCalorica: '', metaProteica: '', suplementacao: '', reavaliacao: '', observacoes: '' },
  tecnicoEnfermagem: { retornoSNE: '', observacoes: '' },
  metas: []
});

// ------------------- CHECKLISTS FECHADOS -------------------
const CRITERIOS_TVP = [
  { id: 'imobilidade', label: 'Imobilidade' },
  { id: 'vmMais48h', label: 'VM > 48h' },
  { id: 'idadeMais60', label: 'Idade > 60' },
  { id: 'obesidadeImc30', label: 'Obesidade (IMC ≥ 30)' },
  { id: 'tvpPrevia', label: 'TVP prévia' },
  { id: 'neoplasiaAtiva', label: 'Neoplasia ativa' },
  { id: 'sepse', label: 'Sepse' },
  { id: 'trauma', label: 'Trauma' },
  { id: 'cirurgiaRecente', label: 'Cirurgia recente' },
  { id: 'cateterVenosoCentral', label: 'Cateter venoso central' },
  { id: 'insufCardiacaRespiratoria', label: 'ICC / IRpA' },
  { id: 'hormonioterapia', label: 'Hormonioterapia' },
  { id: 'trombofilia', label: 'Trombofilia' }
];
const CONTRA_TVP = [
  { id: 'sangramentoAtivo', label: 'Sangramento ativo' },
  { id: 'coagulopatia', label: 'Coagulopatia' },
  { id: 'hdaRecente', label: 'HDA recente' },
  { id: 'avcHemorragicoRecente', label: 'AVC hemorrágico recente' },
  { id: 'neurocirurgiaRecente', label: 'Neurocirurgia recente' },
  { id: 'traumaRaquimedular', label: 'Trauma raquimedular' }
];
const CRITERIOS_ULCERA = [
  { id: 'vmMais48h', label: 'VM > 48h' },
  { id: 'coagulopatia', label: 'Coagulopatia' },
  { id: 'iraTrs', label: 'IRA / TRS' },
  { id: 'corticoideAltaDose', label: 'Corticoide alta dose' },
  { id: 'hdaUlceraPrevia12m', label: 'HDA/úlcera prévia (12m)' },
  { id: 'choque', label: 'Choque' },
  { id: 'queimaduras', label: 'Queimaduras' },
  { id: 'tce', label: 'TCE' },
  { id: 'sepse', label: 'Sepse' }
];
const CRITERIOS_DESPERTAR = [
  { id: 'semSedacaoContinua', label: 'Sem sedação contínua obrigatória' },
  { id: 'semBloqueioNeuromuscular', label: 'Sem bloqueio neuromuscular' },
  { id: 'semAtividadeEpileptica', label: 'Sem atividade epiléptica' },
  { id: 'semIsquemiaMiocardica', label: 'Sem isquemia miocárdica ativa' },
  { id: 'semPicElevada', label: 'Sem PIC elevada' },
  { id: 'semVasopressorAltaDose', label: 'Sem vasopressor em dose alta' },
  { id: 'semHipoxemiaGrave', label: 'Sem hipoxemia grave' }
];
const CRITERIOS_TRE = [
  { id: 'causaIpraEmResolucao', label: 'Causa da IRpA em resolução' },
  { id: 'pao2Fio2Adequado', label: 'PaO2/FiO2 ≥ 150-200 (PEEP ≤ 5-8)' },
  { id: 'semVasopressorOuBaixaDose', label: 'Sem vasopressor ou dose baixa' },
  { id: 'semSedacaoContinua', label: 'Sem sedação contínua' },
  { id: 'esforcoInspiratorioPresente', label: 'Esforço inspiratório presente' },
  { id: 'semAcidoseRespiratoria', label: 'Sem acidose respiratória' },
  { id: 'semSecrecoesExcessivas', label: 'Sem secreções excessivas' },
  { id: 'semInstabilidadeNeurologica', label: 'Sem instabilidade neurológica' }
];
const CATEGORIAS = [
  { id: 'medicoRotina', label: 'Médico RT', cor: 'teal' },
  { id: 'medicoPlantonista', label: 'Médico Plantão', cor: 'blue' },
  { id: 'enfermeiroPlantonista', label: 'Enfermagem', cor: 'emerald' },
  { id: 'fisioterapeutaPlantonista', label: 'Fisioterapia', cor: 'violet' },
  { id: 'nutricionista', label: 'Nutrição', cor: 'amber' },
  { id: 'tecnicoEnfermagem', label: 'Téc. Enfermagem', cor: 'rose' }
];
const METAS_MOBILIZACAO = [
  'Mobilização precoce no leito',
  'Sedestação à beira do leito',
  'Transferência para cadeira',
  'Deambulação assistida',
  'Exercícios ativos de MMSS/MMII',
  'Alongamentos',
  'Condicionamento funcional'
];
const VIAS_DIETA = ['Oral', 'Enteral', 'Parenteral', 'Zero', 'Mista'];
const VIAS_ADICIONAR = ['Oral', 'Enteral', 'Parenteral'];
const CARACTERISTICAS_DIETA = [
  'Normocalórica', 'Hipercalórica', 'Hipocalórica',
  'Normoproteica', 'Hiperproteica', 'Hipoproteica',
  'Normoglicídica', 'Hiperglicídica', 'Hipoglicídica',
  'Normossódica', 'Hipossódica',
  'Normolipídica', 'Hiperlipídica'
];

// ------------------- HELPERS (sem dependência externa) -------------------
const safeNum = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

const temPerdaNoBH = (bh, nome) => {
  if (!bh || !bh.losses) return false;
  return Object.keys(bh.losses).some((h) => {
    const val = String(bh.losses[h]?.[nome] || '').trim().toLowerCase();
    const numVal = parseFloat(val);
    return ['sim', 's'].includes(val) || val.includes('+') || (!isNaN(numVal) && numVal > 0);
  });
};

const diasDesde = (dataStr) => {
  if (!dataStr) return null;
  const partes = String(dataStr).split('-');
  let d;
  if (partes.length === 3 && partes[0].length === 4) d = new Date(`${partes[0]}-${partes[1]}-${partes[2]}`);
  else if (partes.length === 3) d = new Date(`${partes[2]}-${partes[1]}-${partes[0]}`);
  else d = new Date(dataStr);
  if (isNaN(d)) return null;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(d); alvo.setHours(0, 0, 0, 0);
  return Math.round((hoje - alvo) / 86400000);
};

// Replica EXATAMENTE a lógica da evolução médica (ModuloUTI)
const gerarResumoSSVV = (patient, isFem, bhAlvo) => {
  const vitals = bhAlvo?.vitals || patient?.bh?.vitals || {};
  let tempMax = 0, hasSpo2 = false;
  let epFebre = 0, epHipotermia = 0, epTaquicardia = 0, epBradicardia = 0;
  let epTaquipneia = 0, epBradipneia = 0, epHipotensao = 0, epHipertensao = 0;
  let epSpo2Rasa = 0, epSpo2Baixa = 0;
  Object.values(vitals).forEach((v) => {
    if (!v) return;
    const t = safeNum(v['Temp (ºC)']);
    if (t > tempMax) tempMax = t;
    if (t >= 37.8) epFebre++;
    if (t > 0 && t < 35.0) epHipotermia++;
    const s = safeNum(v['SpO2 (%)']);
    if (s > 0) { hasSpo2 = true; if (s >= 89 && s <= 92) epSpo2Rasa++; if (s < 89) epSpo2Baixa++; }
    const fc = safeNum(v['FC (bpm)']);
    if (fc > 0) { if (fc > 100) epTaquicardia++; if (fc < 60) epBradicardia++; }
    const pas = safeNum(v['PAS']);
    if (pas > 0) { if (pas < 90) epHipotensao++; if (pas > 160) epHipertensao++; }
    const fr = safeNum(v['FR (ipm)']) || safeNum(v['FR (irpm)']) || safeNum(v['FR']);
    if (fr > 0) { if (fr > 20) epTaquipneia++; if (fr < 12) epBradipneia++; }
  });
  const build = (ep, singular, multi, normal) => (ep === 0 ? normal : ep === 1 ? `apresentou um episódio de ${singular}` : multi);

  let tempStatus;
  if (epFebre === 0 && epHipotermia === 0) tempStatus = 'afebril';
  else {
    const parts = [];
    if (epFebre > 0) parts.push(build(epFebre, 'febre', 'febril', ''));
    if (epHipotermia > 0) parts.push(build(epHipotermia, 'hipotermia', isFem ? 'hipotérmica' : 'hipotérmico', ''));
    tempStatus = parts.join(' e ');
  }

  let spo2Status = 'sem registro de SpO2';
  if (hasSpo2) {
    if (epSpo2Rasa === 0 && epSpo2Baixa === 0) spo2Status = 'mantendo boa SpO2';
    else {
      const parts = [];
      if (epSpo2Baixa > 0) parts.push(build(epSpo2Baixa, 'baixa SpO2', 'com baixa SpO2', ''));
      if (epSpo2Rasa > 0) parts.push(build(epSpo2Rasa, 'SpO2 rasa', 'com SpO2 rasa', ''));
      spo2Status = parts.join(' e ');
    }
  }

  let fcStatus;
  if (epTaquicardia === 0 && epBradicardia === 0) fcStatus = isFem ? 'eucárdica' : 'eucárdico';
  else {
    const parts = [];
    if (epTaquicardia > 0) parts.push(build(epTaquicardia, 'taquicardia', isFem ? 'taquicárdica' : 'taquicárdico', ''));
    if (epBradicardia > 0) parts.push(build(epBradicardia, 'bradicardia', isFem ? 'bradicárdica' : 'bradicárdico', ''));
    fcStatus = parts.join(' e ');
  }

  let paStatus;
  if (epHipotensao === 0 && epHipertensao === 0) paStatus = 'com bom controle pressórico';
  else {
    const parts = [];
    if (epHipotensao > 0) parts.push(build(epHipotensao, 'hipotensão', isFem ? 'hipotensa' : 'hipotenso', ''));
    if (epHipertensao > 0) parts.push(build(epHipertensao, 'hipertensão', isFem ? 'hipertensa' : 'hipertenso', ''));
    paStatus = parts.join(' e ');
  }

  let frStatus = '';
  if (epTaquipneia > 0 || epBradipneia > 0) {
    const parts = [];
    if (epTaquipneia > 0) parts.push(build(epTaquipneia, 'taquipneia', isFem ? 'taquipneica' : 'taquipneico', ''));
    if (epBradipneia > 0) parts.push(build(epBradipneia, 'bradipneia', isFem ? 'bradipneica' : 'bradipneico', ''));
    frStatus = parts.join(' e ');
  }

  return { tempStatus, spo2Status, fcStatus, paStatus, frStatus, epHipertensao };
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
const VisitaMultiTab = ({ currentPatient, save, userProfile, calculateDiurese12hMlKgH }) => {
  const hoje = new Date();
  const dataISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  const ontem = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
  const ontemISO = `${ontem.getFullYear()}-${String(ontem.getMonth() + 1).padStart(2, '0')}-${String(ontem.getDate()).padStart(2, '0')}`;
  const fmtBR = (iso) => { const [a, m, d] = String(iso).split('-'); return `${d}-${m}-${a}`; };
  const dataBR = fmtBR(dataISO);
  const ontemBR = fmtBR(ontemISO);

  // ===== MAPEIA O CARGO DO PROFISSIONAL PARA A SUB-ABA INICIAL =====
  const cargoParaCategoria = (cargo) => {
    const mapa = {
      'Médico': 'medicoPlantonista',
      'RT Médico': 'medicoRotina',
      'Desenvolvedor': 'medicoRotina',
      'Enfermeiro': 'enfermeiroPlantonista',
      'Gerente de Enfermagem': 'enfermeiroPlantonista',
      'Téc. em Enf.': 'tecnicoEnfermagem',
      'Nutricionista': 'nutricionista',
      'Fisioterapeuta': 'fisioterapeutaPlantonista',
      'RT da Fisioterapia': 'fisioterapeutaPlantonista'
    };
    return mapa[cargo] || 'medicoRotina'; // qualquer outro cai no Médico RT
  };
  const [categoriaAtiva, setCategoriaAtiva] = useState(() => cargoParaCategoria(userProfile?.cargoLocal));
  const [modalCancelamento, setModalCancelamento] = useState(null);
  const [novaMeta, setNovaMeta] = useState({ tipo: 'SVD', descricao: '' });
  const jaGeradasRef = useRef(false);
  

  const [mobilizacaoSelecionada, setMobilizacaoSelecionada] = useState([]);
  const [metasSugeridas, setMetasSugeridas] = useState([]);

  // Enfermeiro: checklists de retirada de dispositivos
  const [checklistCVC, setChecklistCVC] = useState({});
  const [checklistShiley, setChecklistShiley] = useState(false);
  const [checklistSVD, setChecklistSVD] = useState({});
  // Enfermeiro: curativo selecionado para lesão
  const [curativoSelecionado, setCurativoSelecionado] = useState({});

  // ================= MÉDICO RT — ESTADOS =================
  const [checklistPadua, setChecklistPadua] = useState({});
  const [checklistCaprini, setChecklistCaprini] = useState({});
  const [checklistUlcera, setChecklistUlcera] = useState({});
  const [checklistVOPrejudicada, setChecklistVOPrejudicada] = useState({});
  const [planoAberto, setPlanoAberto] = useState(null); // qual grupo de opções está aberto
  const [planoSelecao, setPlanoSelecao] = useState({}); // { grupo: [opções selecionadas] }

  // ================= MÉDICO RT — HELPERS =================
  const sugerirMetaRT = (texto, origem) => {
    sugerirMeta(texto, origem);
    setMetasSugeridas(prev => prev.includes(origem) ? prev : [...prev, origem]);
  };
  const metaAtivaRT = (origem) => metasSugeridas.includes(origem);

  // ================= MÉDICO RT — PROFILAXIA DE TVP =================
  const motivoAdmissao = String(currentPatient?.admissionData?.saps_motivo || '');
  const ehCirurgico = /cirúrgic|cirurgic/i.test(motivoAdmissao);
  const usarCaprini = ehCirurgico;

  // Escala de Pádua (clínica)
  const PADUA_ITENS = [
    { id: 'pad_cancer', label: 'Câncer ativo', pontos: 3 },
    { id: 'pad_tvp_prev', label: 'TVP/TEP prévia (exclui trombose superficial)', pontos: 3 },
    { id: 'pad_mobilidade', label: 'Mobilidade reduzida (≥ 3 dias de repouso no leito)', pontos: 3 },
    { id: 'pad_trombofilia', label: 'Trombofilia conhecida', pontos: 3 },
    { id: 'pad_trauma_cirurgia', label: 'Trauma e/ou cirurgia recente (≤ 1 mês)', pontos: 2 },
    { id: 'pad_idade', label: 'Idade ≥ 70 anos', pontos: 1 },
    { id: 'pad_ic_ir', label: 'Insuficiência cardíaca e/ou respiratória', pontos: 1 },
    { id: 'pad_iam_avc', label: 'IAM ou AVC isquêmico agudo', pontos: 1 },
    { id: 'pad_infeccao', label: 'Infecção aguda e/ou doença reumática', pontos: 1 },
    { id: 'pad_obesidade', label: 'Obesidade (IMC ≥ 30)', pontos: 1 },
    { id: 'pad_hormonio', label: 'Tratamento hormonal em curso', pontos: 1 }
  ];
  const scorePadua = PADUA_ITENS.reduce((s, i) => s + (checklistPadua[i.id] ? i.pontos : 0), 0);

  // Escala de Caprini (cirúrgica) — versão prática
  const CAPRINI_ITENS = [
    { id: 'cap_idade_41_60', label: 'Idade 41-60 anos', pontos: 1 },
    { id: 'cap_idade_61_74', label: 'Idade 61-74 anos', pontos: 2 },
    { id: 'cap_idade_75', label: 'Idade ≥ 75 anos', pontos: 3 },
    { id: 'cap_cirurgia_menor', label: 'Cirurgia planejada menor', pontos: 1 },
    { id: 'cap_cirurgia_grande', label: 'Cirurgia de grande porte (> 45 min)', pontos: 2 },
    { id: 'cap_imc_25', label: 'IMC > 25', pontos: 1 },
    { id: 'cap_edema', label: 'Edema de membros inferiores', pontos: 1 },
    { id: 'cap_varizes', label: 'Veias varicosas', pontos: 1 },
    { id: 'cap_hist_tvp', label: 'História de TVP/TEP', pontos: 3 },
    { id: 'cap_familia_tvp', label: 'História familiar de TVP/TEP', pontos: 1 },
    { id: 'cap_cancer', label: 'Câncer (atual ou prévio)', pontos: 2 },
    { id: 'cap_sepse', label: 'Sepse (< 1 mês)', pontos: 1 },
    { id: 'cap_pneumonia', label: 'Pneumonia', pontos: 1 },
    { id: 'cap_imobilizacao', label: 'Imobilização (> 72h) ou gesso', pontos: 2 },
    { id: 'cap_acesso_central', label: 'Acesso venoso central', pontos: 2 },
    { id: 'cap_ic', label: 'Insuficiência cardíaca (< 1 mês)', pontos: 1 },
    { id: 'cap_imobilidade', label: 'Mobilidade reduzida (≤ 1 dia pós-op)', pontos: 1 },
    { id: 'cap_anticoag', label: 'Uso de anticoagulante (pré-op)', pontos: 1 }
  ];
  const scoreCaprini = CAPRINI_ITENS.reduce((s, i) => s + (checklistCaprini[i.id] ? i.pontos : 0), 0);
  const riscoTVPAltoClinico = !usarCaprini && scorePadua >= 4;
  const riscoTVPAltoCirurgico = usarCaprini ? scoreCaprini >= 3 : false;
  const riscoTVPAlto = riscoTVPAltoClinico || riscoTVPAltoCirurgico;

  // Contraindicação à profilaxia medicamentosa (sangramento)
  const [contraTVPMedicamentosa, setContraTVPMedicamentosa] = useState(false);

  // Clearance de creatinina (mesma calculadora do médico plantonista)
  const clearanceRT = calculateCreatinineClearance(currentPatient);
  const clearanceRTNum = clearanceRT !== '---' ? Number(clearanceRT) : null;
  const medicamentoTVP = clearanceRTNum !== null && clearanceRTNum < 30
    ? 'HNF 5000UI 12/12h'
    : 'Clexane 40mg/d';

  // ================= MÉDICO RT — ÚLCERA DE ESTRESSE =================
  const ULCERA_CRITERIOS = [
    { id: 'ulc_coagulopatia', label: 'Coagulopatia (plaquetas < 50.000, INR > 1,5, TTPa > 2x)' },
    { id: 'ulc_vm', label: 'Ventilação mecânica > 48 horas' },
    { id: 'ulc_hda', label: 'HDA nos últimos 12 meses' },
    { id: 'ulc_trm_queimadura', label: 'TRM ou queimaduras extensas (> 35%)' },
    { id: 'ulc_tce', label: 'TCE grave' },
    { id: 'ulc_sepse', label: 'Sepse' },
    { id: 'ulc_choque', label: 'Choque' },
    { id: 'ulc_lra_trs', label: 'LRA/TRS' },
    { id: 'ulc_corticoide', label: 'Corticoide alta dose (Hidrocortisona > 250mg/d)' }
  ];
  const ULCERA_VO_PREJUDICADA = [
    { id: 'vo_sangramento', label: 'Sangramento GI ativo' },
    { id: 'vo_sem_acesso', label: 'Paciente sem acesso enteral (jejum absoluto, íleo paralítico, obstrução, pós-operatório de cirurgia gastrointestinal com anastomose)' },
    { id: 'vo_ma_absorcao', label: 'Má absorção significativa' },
    { id: 'vo_degluticao', label: 'Incapacidade de deglutir / risco de aspiração' }
  ];
  const temCriterioUlcera = ULCERA_CRITERIOS.some(i => checklistUlcera[i.id]);
  const temVOPrejudicada = ULCERA_VO_PREJUDICADA.some(i => checklistVOPrejudicada[i.id]);
  const sangramentoGIA = checklistVOPrejudicada['vo_sangramento'] || false;

  // ================= MÉDICO RT — PLANO TERAPÊUTICO (opções) =================
  const PLANO_OPCOES = {
    tc: { titulo: 'Solicitar TC de', opcoes: ['Tórax', 'Crânio', 'Abdome'] },
    us: { titulo: 'Solicitar US de', opcoes: ['Abdome', 'Rins'] },
    culturas: { titulo: 'Solicitar Culturas', opcoes: ['Hemocultura', 'Urocultura', 'Secreção Traqueal'] },
    hemocomponente: { titulo: 'Transfusão de Hemocomponente', opcoes: ['Concentrado de Hemácias', 'Plaquetas', 'Plasma Fresco Congelado', 'Crioprecipitado'] }
  };
  const PLANO_ACAO_UNICA = [
    { id: 'rx_torax', label: 'Solicitar Rx de Tórax', meta: 'Solicitar Rx de Tórax' },
    { id: 'pocus', label: 'Realizar POCUS pulmonar/cardíaco', meta: 'Realizar POCUS pulmonar/cardíaco' },
    { id: 'desmame_dobuta', label: 'Desmame de Dobuta', meta: 'Desmame de Dobutamina' },
    { id: 'trocar_atb', label: 'Trocar ATB', meta: 'Trocar antibiótico' },
    { id: 'suspender_atb', label: 'Suspender ATB', meta: 'Suspender antibiótico' },
    { id: 'nefrologia', label: 'Avaliação da Nefrologia', meta: 'Avaliação da Nefrologia' },
    { id: 'corrigir_nak', label: 'Corrigir Na/K', meta: 'Corrigir Na/K' },
    { id: 'suspender_dieta', label: 'Suspender Dieta', meta: 'Suspender dieta' },
    { id: 'suspender_anticoag', label: 'Suspender anticoag.', meta: 'Suspender anticoagulante' },
    { id: 'trocar_svd', label: 'Trocar SVD', meta: 'Trocar SVD' },
    { id: 'trocar_cvc', label: 'Trocar CVC', meta: 'Trocar CVC' }
  ];

  // ================= MÉDICO PLANTONISTA — ESTADOS =================
const [checklistSedacao, setChecklistSedacao] = useState({});

// ================= MÉDICO PLANTONISTA — CHECKLIST DESMAME DE SEDAÇÃO (ABCDEF / SAT) =================
const CHECKLIST_SEDACAO = [
  { id: 'sed_dor_controlada', label: 'Dor controlada (CPOT ≤ 2 ou BPS ≤ 5)' },
  { id: 'sed_sem_sedacao_profunda', label: 'Sem necessidade de sedação profunda contínua (SDRA, HIC, mal epiléptico)' },
  { id: 'sed_hemodinamica', label: 'Estabilidade hemodinâmica' },
  { id: 'sed_oxigenacao', label: 'Oxigenação adequada (sem sedação profunda)' },
  { id: 'sed_sem_agressividade', label: 'Sem agitação grave ou risco iminente de autoextubação' },
  { id: 'sed_neurologico', label: 'Estado neurológico avaliável (sem HIC/convulsões em curso)' }
];

// ================= MÉDICO PLANTONISTA — HELPERS =================
const formatarDataBR = (dataStr) => {
  if (!dataStr) return '—';
  const partes = String(dataStr).split('-');
  if (partes.length === 3) return `${partes[2]}-${partes[1]}-${partes[0]}`;
  return dataStr;
};
const sugerirMetaMedico = (texto, origem) => {
  sugerirMeta(texto, origem);
  setMetasSugeridas(prev => prev.includes(origem) ? prev : [...prev, origem]);
};
const metaAtivaMed = (origem) => metasSugeridas.includes(origem);

// ================= MÉDICO PLANTONISTA — CÁLCULOS =================
// Sedação
const sedado = currentPatient?.neuro?.sedacao === true;
const drogasSedacao = currentPatient?.neuro?.drogasSedacao || [];
const rass = currentPatient?.neuro?.rass || '';

// DVAs
const emDVA = currentPatient?.cardio?.dva === true;
const drogasDVA = currentPatient?.cardio?.drogasDVA || [];

// Antibióticos (em uso = com nome preenchido)
const antibioticosEmUso = (currentPatient?.antibiotics || [])
  .filter(a => a && a.name && String(a.name).trim() !== '');

// Exames do dia anterior (examHistory)
const examesOntem = currentPatient?.examHistory?.[ontemISO] || {};
const EXAMES_RELEVANTES = ['Hemoglobina', 'Leucócitos', 'Plaquetas', 'Ureia', 'Creatinina', 'Na (Sódio)', 'K (Potássio)', 'PCR'];
const examesRelevantes = EXAMES_RELEVANTES
  .map(nome => ({ nome, valor: examesOntem[nome] || '—' }))
  .filter(e => e.valor !== '—');

// Clearance de creatinina (função de core.js)
const clearanceCreat = calculateCreatinineClearance(currentPatient);
const clearanceBaixo = clearanceCreat !== '---' && Number(clearanceCreat) < 30;
const valorK = examesOntem['K (Potássio)'];
const kBaixo = valorK && String(valorK).trim() !== '' && Number(String(valorK).replace(',', '.')) < 3;

// Metas de imagem do dia anterior (Rx/TC) — solicitações registradas ontem
const metasSolicitacaoImg = (currentPatient?.visita?.[ontemISO]?.metas || [])
  .filter(m => m.status === 'realizado' || m.status === 'pendente' || m.status === 'cancelado')
  .filter(m => /rx|raio\s*x|tc|tomografia|radiografia/i.test(m.descricao || m.texto || ''));

// NOVO GATILHO: registros de Raio-X feitos pelo técnico no dia anterior (botão do TechDashboard → enfermagem.historico_raio_x)
// REGRA DE DEDUPE: só usa o registro do técnico quando NÃO existe nenhuma meta de imagem já gerada para o dia
const raioXOntem = metasSolicitacaoImg.length === 0
  ? (currentPatient?.enfermagem?.historico_raio_x || [])
      .filter(h => {
        const dt = h.dataHoraRegistro ? new Date(h.dataHoraRegistro) : null;
        return dt && !isNaN(dt.getTime()) && dt >= inicioDiaCalendario && dt < fimDiaCalendario;
      })
      .map((h, idx) => ({
        id: `raio_x_${h.dataHoraRegistro || idx}`,
        descricao: h.horario ? `Raio-X realizado às ${h.horario}` : 'Raio-X realizado',
        texto: h.horario ? `Raio-X realizado às ${h.horario}` : 'Raio-X realizado',
        status: 'pendente',
        origem: 'auto_raio_x_tecnico'
      }))
  : [];

const metasOntemImg = [...metasSolicitacaoImg, ...raioXOntem];

  // ---------- ENFERMEIRO: ESCALAS DO DIA ANTERIOR ----------
  const escalaOntem = currentPatient?.enfermagem?.escalas_diarias?.[ontemISO] || null;
  const bradenOntem = escalaOntem?.braden || null;
  const morseOntem = escalaOntem?.morse || null;

  // ---------- ENFERMEIRO: DISPOSITIVOS (CVC / SHILEY / SVD) ----------
  const cvcAtivo = currentPatient?.enfermagem?.cvcData && !currentPatient?.enfermagem?.cvcRetiradaData;
  const shileyAtivo = currentPatient?.enfermagem?.shileyData && !currentPatient?.enfermagem?.shileyRetiradaData;
  const svdAtivo = currentPatient?.enfermagem?.svdData && !currentPatient?.enfermagem?.svdRetiradaData;

  // ---------- ENFERMEIRO: LESÕES / CURATIVOS ----------
  const lesoes = currentPatient?.enfermagem?.lesoes || [];

  // ---------- ENFERMEIRO: BH DO DIA ANTERIOR (janela 07h ontem → 06h hoje) ----------
  const bhPrev = currentPatient?.bh_previous || null;
  const somarMapaBH = (obj) => Object.values(obj || {}).reduce((s, v) => {
    if (v && typeof v === 'object') return s + Object.values(v).reduce((s2, x) => s2 + (Number(x) || 0), 0);
    return s + (Number(v) || 0);
  }, 0);
  const totalGanhosBH = Math.round(somarMapaBH(bhPrev?.gains) + (bhPrev?.customGains || []).reduce((s, x) => s + (Number(x) || 0), 0));
  const totalPerdasBaseBH = Math.round(somarMapaBH(bhPrev?.losses) + (bhPrev?.customLosses || []).reduce((s, x) => s + (Number(x) || 0), 0));
  const piBH = (bhPrev?.insensibleLoss !== undefined && bhPrev?.insensibleLoss !== "" && bhPrev?.insensibleLoss !== 0)
    ? Number(bhPrev.insensibleLoss)
    : (Number(currentPatient?.nutri?.peso) > 0 ? Math.round(Number(currentPatient.nutri.peso) * 12) : 0);
  const totalPerdasBH = Math.round(totalPerdasBaseBH + piBH);
  const balanco24hBH = Math.round(totalGanhosBH - totalPerdasBH);
  const totalAtualBH = Math.round((bhPrev?.accumulated || 0) + balanco24hBH);

  // ---------- ENFERMEIRO: HIGIENE ORAL (dia calendário anterior) ----------
  const inicioDiaCalendario = new Date();
  inicioDiaCalendario.setDate(inicioDiaCalendario.getDate() - 1);
  inicioDiaCalendario.setHours(0, 0, 0, 0);
  const fimDiaCalendario = new Date();
  fimDiaCalendario.setHours(0, 0, 0, 0);
  const higieneOralOntem = (currentPatient?.enfermagem?.historico_higiene_oral || [])
    .filter(h => {
      const dt = h.dataHoraRegistro ? new Date(h.dataHoraRegistro) : null;
      return dt && !isNaN(dt.getTime()) && dt >= inicioDiaCalendario && dt < fimDiaCalendario;
    });
  const qtdHigieneOral = higieneOralOntem.length;
  const higieneIntimaOntem = (currentPatient?.enfermagem?.historico_higiene_intima || [])
    .filter(h => {
      const dt = h.dataHoraRegistro ? new Date(h.dataHoraRegistro) : null;
      return dt && !isNaN(dt.getTime()) && dt >= inicioDiaCalendario && dt < fimDiaCalendario;
    });
  const qtdHigieneIntima = higieneIntimaOntem.length;  

  const SIGNIFICADO_BRADEN = {
    'Altíssimo': 'Risco altíssimo de desenvolver LPP',
    'Alto': 'Alto risco de desenvolver LPP',
    'Moderado': 'Risco moderado de desenvolver LPP',
    'Baixo': 'Baixo risco de desenvolver LPP'
  };
  const SIGNIFICADO_MORSE = {
    'Sem Risco': 'Sem risco de queda',
    'Baixo': 'Baixo risco de queda',
    'Médio': 'Risco médio de queda',
    'Alto': 'Alto risco de queda'
  };

  // Checklist de retirada de CVC (baseado em diretrizes de manejo de acesso venoso central)
  const CHECKLIST_CVC = {
    necessarios: [
      { id: 'cvc_sem_dvas', label: 'Sem DVAs' },
      { id: 'cvc_sem_npt', label: 'Sem NPT' },
      { id: 'cvc_sem_monitorizacao', label: 'Sem necessidade de monitorização hemodinâmica invasiva (PVC, SvO₂)' },
      { id: 'cvc_avp_adequado', label: 'Possui AVP adequado' }
    ],
    suficientes: [
      { id: 'cvc_sepse', label: 'Sepse relacionada ao cateter confirmada' },
      { id: 'cvc_bacteremia', label: 'Bacteremia por S. aureus, Candida spp. ou fungemia' },
      { id: 'cvc_tvp', label: 'TVP relacionada ao cateter' },
      { id: 'cvc_extravasamento', label: 'Extravasamento, lesão tecidual ou oclusão' },
      { id: 'cvc_infeccao_local', label: 'Sinais locais de infecção' }
    ]
  };

  // Checklist de retirada de SVD (baseado em critérios de CAUTI e Trial Without Catheter)
  const CHECKLIST_SVD = {
    necessarios: [
      { id: 'svd_sem_monitorizacao', label: 'Sem necessidade de monitorização do débito urinário (choque, IRA, balanço hídrico rigoroso)' },
      { id: 'svd_sem_obstrucao', label: 'Não há obstrução do trato urinário (bexiga neurogênica, hiperplasia prostática com retenção, tumores)' },
      { id: 'svd_sem_ferida', label: 'Ausência de ferida sacral/perineal' },
      { id: 'svd_sem_irrigacao', label: 'Sem necessidade de irrigação contínua da bexiga' }
    ],
    suficientes: [
      { id: 'svd_ituac', label: 'ITU-AC confirmada' },
      { id: 'svd_obstrucao_recorrente', label: 'Obstrução recorrente ou vazamento' },
      { id: 'svd_lesao_uretral', label: 'Lesão uretral' }
    ]
  };

  const sugerirMetaEnfermeiro = (texto, origem) => {
    sugerirMeta(texto, origem);
    setMetasSugeridas(prev => prev.includes(origem) ? prev : [...prev, origem]);
  };
  const metaAtivaEnf = (origem) => metasSugeridas.includes(origem);

  // Sugere meta de nutri e marca o botão correspondente como ativo
  const sugerirMetaNutri = (texto, origem) => {
    sugerirMeta(texto, origem);
    setMetasSugeridas(prev => prev.includes(origem) ? prev : [...prev, origem]);
  };
  const metaAtiva = (origem) => metasSugeridas.includes(origem);

  const confirmarCaracteristicas = () => {
    if (caracteristicasSelecionadas.length === 0) return;
    const frase = `Mudar características da dieta para: ${caracteristicasSelecionadas.join(', ')}`;
    sugerirMetaNutri(frase, 'auto_mudar_caracteristicas');
    setCaracteristicasSelecionadas([]);
  };

  // Nutri: campo digitável da vazão
  const [novaVazao, setNovaVazao] = useState('');
  // Nutri: características selecionadas para montar uma única meta
  const [caracteristicasSelecionadas, setCaracteristicasSelecionadas] = useState([]);
  const [enteralSelecionada, setEnteralSelecionada] = useState('');
  const [novaVazaoEnteral, setNovaVazaoEnteral] = useState('');
  const [novaVazaoParenteral, setNovaVazaoParenteral] = useState('');

  const [visita, setVisita] = useState(() => {
    const existente = currentPatient?.visita?.[dataISO];
    const base = criarVisitaVazia();
    if (!existente) return base;
    // Mescla profunda por categoria: garante que campos novos (ex: tre, sincronismo)
    // existam mesmo quando o dado salvo é de uma versão anterior
    const mesclado = { ...base };
    Object.keys(base).forEach(k => {
      if (existente[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
        mesclado[k] = { ...base[k], ...existente[k] };
      } else if (existente[k] !== undefined) {
        mesclado[k] = existente[k];
      }
    });
    return mesclado;
  });

  // ---------- PERSISTÊNCIA ----------
  const salvarVisita = (novaVisita) => {
    if (!save || !currentPatient) return;
    const pacienteAtualizado = {
      ...currentPatient,
      visita: { ...(currentPatient.visita || {}), [dataISO]: novaVisita }
    };
    save(pacienteAtualizado, `Visita Multi ${dataBR}`);
  };

  // Atualizador genérico profundo: caminho = array de chaves (ex: ['profilaxias','tvp','farmaco'])
  const updateDeep = (categoria, caminho, valor) => {
    setVisita(prev => {
      const cat = JSON.parse(JSON.stringify(prev[categoria] || {}));
      let alvo = cat;
      for (let i = 0; i < caminho.length - 1; i++) {
        if (!alvo[caminho[i]] || typeof alvo[caminho[i]] !== 'object') alvo[caminho[i]] = {};
        alvo = alvo[caminho[i]];
      }
      alvo[caminho[caminho.length - 1]] = valor;
      const nova = { ...prev, [categoria]: cat };
      salvarVisita(nova);
      return nova;
    });
  };

  // ---------- ANÁLISE CLÍNICA (aba do Técnico) ----------
  const bhAnterior = currentPatient?.bh_previous ||
    (currentPatient?.historico_bh?.length ? currentPatient.historico_bh[currentPatient.historico_bh.length - 1] : null);

  const calcularAnalise = () => {
    const sexo = obterSexoPaciente(currentPatient);
    const isFem = sexo === 'F' || sexo === 'FEM' || sexo === 'FEMININO';
    const resumo = gerarResumoSSVV(currentPatient, isFem, bhAnterior);

    const diurese12h = typeof calculateDiurese12hMlKgH === 'function' ? calculateDiurese12hMlKgH(currentPatient) : '---';
    const diureseNum = parseFloat(String(diurese12h).replace(',', '.'));
    const diureseBaixa = !isNaN(diureseNum) && diureseNum < 0.5;

    const totalDiurese24h = Object.values(bhAnterior?.losses || {}).reduce((acc, per) => acc + safeNum(per?.['Diurese']), 0);

    const diarreiaHoje = temPerdaNoBH(currentPatient?.bh, 'Diarreia');
    const diarreiaOntem = temPerdaNoBH(bhAnterior, 'Diarreia');
    const diarreiaText = diarreiaHoje && diarreiaOntem ? 'Hoje e Ontem' : diarreiaHoje ? 'Hoje' : diarreiaOntem ? 'Ontem' : '';

    const vomitoHoje = temPerdaNoBH(currentPatient?.bh, 'Vômitos') || temPerdaNoBH(currentPatient?.bh, 'Vômito');
    const vomitoOntem = temPerdaNoBH(bhAnterior, 'Vômitos') || temPerdaNoBH(bhAnterior, 'Vômito');
    const vomitoText = vomitoHoje && vomitoOntem ? 'Hoje e Ontem' : vomitoHoje ? 'Hoje' : vomitoOntem ? 'Ontem' : '';

    const evacHojeBH = temPerdaNoBH(currentPatient?.bh, 'Evacuação') || temPerdaNoBH(currentPatient?.bh, 'Evacuacao') || temPerdaNoBH(currentPatient?.bh, 'Fezes');
    const evacOntemBH = temPerdaNoBH(bhAnterior, 'Evacuação') || temPerdaNoBH(bhAnterior, 'Evacuacao') || temPerdaNoBH(bhAnterior, 'Fezes');
    let evacResult = '';
    let isConstipado = false;
    if (evacHojeBH || diarreiaHoje) evacResult = 'Hoje';
    else if (evacOntemBH || diarreiaOntem) evacResult = 'Ontem';
    else {
      const dias = diasDesde(currentPatient?.gastro?.dataUltimaEvacuacao);
      if (dias === null) evacResult = 'Não registrado';
      else if (dias <= 0) evacResult = 'Hoje';
      else if (dias === 1) evacResult = 'Ontem';
      else { evacResult = `Há ${dias} dias`; if (dias > 2) isConstipado = true; }
    }

    return { resumo, diurese12h, diureseNum, diureseBaixa, totalDiurese24h, diarreiaText, vomitoText, evacResult, isConstipado };
  };

  const analise = calcularAnalise();

  // ---------- NUTRI: CONSUMO ORAL (média) ----------
  const historicoDietaVO = currentPatient?.enfermagem?.historico_dieta_vo || [];
  const consumosSolida = historicoDietaVO.filter(r => r.tiposOferecidos?.solida);
  const consumosLiquida = historicoDietaVO.filter(r => r.tiposOferecidos?.liquida);
  const mediaSolida = consumosSolida.length ? Math.round(consumosSolida.reduce((a, r) => a + safeNum(r.consumo?.solida), 0) / consumosSolida.length) : 0;
  const mediaLiquida = consumosLiquida.length ? Math.round(consumosLiquida.reduce((a, r) => a + safeNum(r.consumo?.liquida), 0) / consumosLiquida.length) : 0;

  // ===== NUTRI — BLOCO A: aporte nutricional da dieta enteral (dia anterior) =====
  const formulaEnteral = currentPatient?.nutri?.tipoDietaEnteral || '';
  const infoFormula = NUTRI_ENTERAL_INFO[formulaEnteral] || null;
  // Soma o volume de "Dieta SNE/GTT" registrado nos ganhos do BH do dia anterior
  const volumeDietaEnteral = Object.values(bhPrev?.gains || {}).reduce((s, horario) => {
    return s + safeNum(horario?.['Dieta SNE/GTT']);
  }, 0);
  const kcalEnteral = infoFormula ? Math.round(volumeDietaEnteral * infoFormula.kcal) : null;
  const ptnEnteral  = infoFormula ? Math.round(volumeDietaEnteral * infoFormula.ptn)  : null;
  const aguaEnteral = infoFormula ? Math.round(volumeDietaEnteral * infoFormula.agua) : null;

  // ===== NUTRI — BLOCO B: via da dieta =====
  const viaNutri = currentPatient?.nutri?.via || '';
  const viasMistasNutri = currentPatient?.nutri?.viasMistas || [];
  const temEnteral = viaNutri === 'Enteral' || (viaNutri === 'Mista' && viasMistasNutri.includes('Enteral'));
  const temOral = viaNutri === 'Oral' || (viaNutri === 'Mista' && viasMistasNutri.includes('Oral'));
  const parenteralIsolada = viaNutri === 'Parenteral';

    // ===== NUTRI — BLOCO A2: aporte nutricional da dieta parenteral (dia anterior) =====
  const temParenteral = viaNutri === 'Parenteral' || (viaNutri === 'Mista' && viasMistasNutri.includes('Parenteral'));
  // Soma o volume de "NPT" registrado nos ganhos do BH do dia anterior
  const volumeDietaParenteral = Object.values(bhPrev?.gains || {}).reduce((s, horario) => {
    return s + safeNum(horario?.['NPT']);
  }, 0);
  const kcalParenteral = volumeDietaParenteral > 0 ? Math.round(volumeDietaParenteral * NUTRI_PARENTERAL_INFO.kcal) : null;
  const ptnParenteral  = volumeDietaParenteral > 0 ? Math.round(volumeDietaParenteral * NUTRI_PARENTERAL_INFO.ptn)  : null;
  const aguaParenteral = volumeDietaParenteral > 0 ? Math.round(volumeDietaParenteral * NUTRI_PARENTERAL_INFO.agua) : null;

  // ---------- NUTRI: INSULINAS ----------
  const inicioJanela = new Date(ontem);
  inicioJanela.setHours(7, 0, 0, 0);
  const fimJanela = new Date();
  fimJanela.setHours(6, 0, 0, 0);
  const insulinasJanela = (currentPatient?.enfermagem?.historico_insulina || [])
    .filter(ins => {
      const dt = new Date(ins.dataHoraRegistro);
      return !isNaN(dt.getTime()) && dt >= inicioJanela && dt < fimJanela;
    })
    .sort((a, b) => new Date(a.dataHoraRegistro) - new Date(b.dataHoraRegistro));

  // ---------- NUTRI: GLICEMIA DO DIA ANTERIOR (HGT) ----------
  const hgtOntem = Object.entries(bhAnterior?.vitals || {})
    .map(([hora, v]) => ({ hora, valor: v?.['HGT (mg/dL)'] }))
    .filter(x => x.valor && String(x.valor).trim() !== '')
    .sort((a, b) => {
      // Converte HH:MM em minutos desde as 07h (horários < 07h pertencem ao dia seguinte)
      const minutosDesde7h = (h) => {
        const [hh, mm] = h.split(':').map(Number);
        const total = hh * 60 + mm;
        return total < 420 ? total + 1440 : total; // 420 = 07:00
      };
      return minutosDesde7h(a.hora) - minutosDesde7h(b.hora);
    });

  // Flag: houve hipo (< 70) ou hiperglicemia (> 180) no dia anterior
  const temAlteracaoGlicemica = hgtOntem.some(g => {
    const num = safeNum(g.valor);
    return num > 0 && (num < 70 || num > 180);
  });

  // ---------- NUTRI: METAS CALÓRICAS/PROTEICAS ----------
  const metaCalDiaria = currentPatient?.nutri?.metaCalDiaria;
  const metaCalTotal = currentPatient?.nutri?.metaCalTotal;
  const metaProtDiaria = currentPatient?.nutri?.metaProtDiaria;
  const metaProtTotal = currentPatient?.nutri?.metaProtTotal;
  const calDiariaNaoAtingida = metaCalDiaria && !currentPatient?.nutri?.metaCalDiariaAtingida;
  const calTotalNaoAtingida = metaCalTotal && !currentPatient?.nutri?.metaCalTotalAtingida;
  const protDiariaNaoAtingida = metaProtDiaria && !currentPatient?.nutri?.metaProtDiariaAtingida;
  const protTotalNaoAtingida = metaProtTotal && !currentPatient?.nutri?.metaProtTotalAtingida;
  const calNaoAtingida = calDiariaNaoAtingida || calTotalNaoAtingida;
  const protNaoAtingida = protDiariaNaoAtingida || protTotalNaoAtingida;

  useEffect(() => {
    if (calNaoAtingida) sugerirMetaNutri('Aumentar aporte calórico', 'auto_aumentar_calorico');
    if (protNaoAtingida) sugerirMetaNutri('Aumentar aporte proteico', 'auto_aumentar_proteico');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calNaoAtingida, protNaoAtingida]);

  // ---------- FISIO: GASOMETRIA DO DIA ANTERIOR (todas por horário) ----------
  const ontemGasoKey = `${String(ontem.getDate()).padStart(2, '0')}/${String(ontem.getMonth() + 1).padStart(2, '0')}/${ontem.getFullYear()}`;
  const gasometriasOntem = Object.entries(currentPatient?.gasometriaHistory || {})
    .filter(([chave]) => chave.startsWith(ontemGasoKey))
    .map(([chave, dados]) => ({
      chave,
      hora: dados?._hora || (chave.split(' - ')[1] || ''),
      dados: dados || {}
    }))
    .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));

  // ---------- FISIO: IMS DO DIA ANTERIOR ----------
  const imsOntem = currentPatient?.physio?.icuMobilityScale?.[ontemGasoKey] ||
    currentPatient?.physio?.icuMobilityScale?.ims || '';

  // ---------- FISIO: SUPORTE VENTILATÓRIO + ÚLTIMA COLUNA DO MAPA ----------
  const suporteAtual = currentPatient?.physio?.suporte || '';
  const fio2Atual = currentPatient?.physio?.fiO2 || '';
  const vmFlowsheet = currentPatient?.physio?.vmFlowsheet || [];
  const ultimaVM = vmFlowsheet.length ? vmFlowsheet[vmFlowsheet.length - 1] : null;
  const pesoPredito = currentPatient?.nutri?.pesoPredito;
  const vcMlKg = ultimaVM?.vc && pesoPredito ? Math.round(ultimaVM.vc / pesoPredito) : null;

  // ---------- FISIO: GERA META DE TRE SE TODOS OS CRITÉRIOS OK ----------
  const treCriterios = visita.fisioterapeutaPlantonista?.tre || {};
  const treTodosOk = CRITERIOS_TRE.every(c => treCriterios[c.id] === true);
  useEffect(() => {
    if (treTodosOk) sugerirMeta('Tentativa de TRE', 'auto_tre_criterios');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treTodosOk]);

  // ---------- FISIO: CONFIRMA META DE MOBILIZAÇÃO ----------
  const confirmarMetaMobilizacao = () => {
    if (mobilizacaoSelecionada.length === 0) return;
    adicionarMetaManual('', mobilizacaoSelecionada.join(' + '));
    setMobilizacaoSelecionada([]);
  };  

  // ---------- METAS COMPARTILHADAS ----------
  const metas = visita.metas || [];
  const metasAguardando = metas.filter(m => m.status === 'aguardando');
  const metasAtivas = metas.filter(m => m.status === 'aguardando' || m.status === 'pendente');
  const metasOntem = (currentPatient?.visita?.[ontemISO]?.metas || [])
    .filter(m => m.status === 'realizado' || m.status === 'pendente' || m.status === 'cancelado');
  const cumpridasOntem = metasOntem.filter(m => m.status === 'realizado');
  const naoCumpridasOntem = metasOntem.filter(m => m.status === 'pendente');
  const canceladasOntem = metasOntem.filter(m => m.status === 'cancelado');

  // updater funcional: encadeia corretamente várias mudanças no mesmo instante
  const atualizarMetas = (updater) => {
    setVisita(prev => {
      const novasMetas = updater(prev.metas || []);
      return { ...prev, metas: novasMetas };
    });
  };

  // Persiste a visita sempre que ela mudar (efeito colateral fora do updater do setVisita)
  useEffect(() => {
    salvarVisita(visita);
  }, [visita]);

  const sugerirMeta = (descricao, origem) => {
    atualizarMetas(lista => {
      const ativa = lista.some(m =>
        (m.descricao === descricao || m.origem === origem) &&
        (m.status === 'aguardando' || m.status === 'pendente')
      );
      if (ativa) return lista;
      return [...lista, {
        id: `meta_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        descricao, origem, status: 'aguardando', criadoEm: dataISO,
        confirmadoPor: null, dataConfirmacao: null,
        dataRealizado: null, marcadoPor: null, marcadoEm: null,
        dataCancelamento: null, canceladoPor: null, justificativaCancelamento: null
      }];
    });
  };

  const adicionarMetaManual = (tipo, descricao) => {
    if (!descricao.trim()) return;
    atualizarMetas(lista => [...lista, {
      id: `meta_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      descricao: tipo && tipo !== 'Outro' ? `${tipo} — ${descricao}` : descricao,
      origem: 'manual', status: 'pendente', criadoEm: dataISO, adicionadoPor: categoriaAtiva,
      confirmadoPor: null, dataConfirmacao: null,
      dataRealizado: null, marcadoPor: null, marcadoEm: null,
      dataCancelamento: null, canceladoPor: null, justificativaCancelamento: null
    }]);
  };

  const confirmarMeta = (id) => {
    atualizarMetas(lista => lista.map(m =>
      m.id === id ? {
        ...m,
        status: 'pendente',
        confirmadoPor: userProfile?.nome || categoriaAtiva,  // nome real, com fallback para a aba
        dataConfirmacao: dataISO
      } : m
    ));
  };

  const rejeitarMeta = (id, justificativa) => {
    atualizarMetas(lista => lista.map(m => {
      if (m.id !== id) return m;
      const ehAutomatica = (m.origem || '').startsWith('auto_');
      return {
        ...m,
        status: ehAutomatica ? 'rejeitada' : 'cancelado',
        dataCancelamento: dataISO,
        canceladoPor: categoriaAtiva,
        justificativaCancelamento: justificativa
          ? `Rejeitada: ${justificativa}`
          : ehAutomatica
            ? 'Rejeitada (meta automática)'
            : 'Rejeitada pela equipe médica'
      };
    }));
  };

  const marcarRealizado = (id) => {
    atualizarMetas(lista => lista.map(m =>
      m.id === id ? { ...m, status: 'realizado', dataRealizado: dataISO, marcadoPor: categoriaAtiva, marcadoEm: new Date().toISOString() } : m
    ));
  };

  const cancelarMeta = (id, justificativa) => {
    atualizarMetas(lista => lista.map(m =>
      m.id === id ? { ...m, status: 'cancelado', dataCancelamento: dataISO, canceladoPor: categoriaAtiva, justificativaCancelamento: justificativa || 'Cancelada sem justificativa' } : m
    ));
  };

  // Gera as sugestões automáticas UMA vez ao montar (dedup por descrição/origem = idempotente)
  useEffect(() => {
    if (jaGeradasRef.current) return;
    jaGeradasRef.current = true;
    const a = calcularAnalise();
    if (a.resumo.epHipertensao > 0) sugerirMeta('Controle pressório', 'auto_ssvv_hipertensao');
    if (a.diureseBaixa) sugerirMeta('Estimular diurese', 'auto_diurese_baixa');
    if (a.isConstipado) sugerirMeta('Medidas laxativas', 'auto_evacuacao_atrasada');
    if (a.diarreiaText) sugerirMeta('Medidas constipantes', 'auto_diarreia');
    if (a.vomitoText) sugerirMeta('Estimular esvaziamento gástrico', 'auto_vomitos');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

const ORIGENS_NUTRI = [
  'auto_mudar_via',
  'auto_adicionar_via',
  'auto_mudar_consistencia',
  'auto_mudar_caracteristica',
  'auto_ajustar_vazao',
  'auto_aumentar_calorico',
  'auto_aumentar_proteico'
];
const podeConfirmarMeta = (meta) => {
  const cargo = userProfile?.cargoLocal;
  // Médicos (RT, plantonista, nefro) confirmam qualquer meta automática
  if (cargo === 'RT Médico' || cargo === 'Médico') return true;
  // Nutri confirma APENAS as metas geradas na própria aba
  if (cargo === 'Nutricionista') {
    return ORIGENS_NUTRI.some(prefixo => (meta.origem || '').startsWith(prefixo));
  }
  return false;
};

  // ============================================================
  return (
    <div className="space-y-4">
      {/* CABEÇALHO */}
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-teal-800">Visita Multi — {currentPatient?.nome}</h3>
          <p className="text-xs text-teal-600 mt-0.5">Leito {currentPatient?.leito} · {dataBR} · Cada profissional preenche a sua seção</p>
        </div>
        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-teal-600 text-white">Salvando automaticamente</span>
      </div>

      {/* ABAS POR CATEGORIA */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIAS.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategoriaAtiva(cat.id)}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
              categoriaAtiva === cat.id ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* CONTEÚDO DA CATEGORIA ATIVA */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">

        {/* ============ MÉDICO RT ============ */}
        {categoriaAtiva === 'medicoRotina' && (
          <>
            <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Médico RT</h4>

            {/* 1. PROFILAXIA DE TVP */}
            <div className="border border-violet-200 rounded-xl p-4 bg-violet-50">
              <h5 className="font-bold text-sm text-violet-800 mb-1">🩸 Profilaxia de TVP</h5>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-3">
                Escala: {usarCaprini ? 'Caprini (admissão cirúrgica)' : 'Pádua (admissão clínica)'} — motivo: {motivoAdmissao || 'não informado'}
              </p>

              {/* Escala conforme o motivo */}
              <div className="space-y-1.5 mb-3">
                {usarCaprini
                  ? CAPRINI_ITENS.map(item => (
                      <label key={item.id} className="flex items-start gap-2 cursor-pointer text-xs text-slate-700">
                        <input type="checkbox" checked={checklistCaprini[item.id] || false} onChange={e => setChecklistCaprini(prev => ({ ...prev, [item.id]: e.target.checked }))} className="mt-0.5 w-4 h-4 accent-violet-600" />
                        <span>{item.label} <span className="text-violet-500 font-bold">(+{item.pontos})</span></span>
                      </label>
                    ))
                  : PADUA_ITENS.map(item => (
                      <label key={item.id} className="flex items-start gap-2 cursor-pointer text-xs text-slate-700">
                        <input type="checkbox" checked={checklistPadua[item.id] || false} onChange={e => setChecklistPadua(prev => ({ ...prev, [item.id]: e.target.checked }))} className="mt-0.5 w-4 h-4 accent-violet-600" />
                        <span>{item.label} <span className="text-violet-500 font-bold">(+{item.pontos})</span></span>
                      </label>
                    ))}
              </div>

              {/* Score */}
              <div className="p-2 bg-white border border-violet-200 rounded-lg mb-3">
                <span className="text-xs font-bold text-slate-600">Score {usarCaprini ? 'Caprini' : 'Pádua'}: </span>
                <span className={`text-base font-black ${riscoTVPAlto ? 'text-red-600' : 'text-slate-700'}`}>{usarCaprini ? scoreCaprini : scorePadua}</span>
                <span className="text-xs text-slate-400 ml-2">({usarCaprini ? 'alto risco ≥ 3' : 'alto risco ≥ 4'})</span>
              </div>

              {/* Contraindicação à profilaxia medicamentosa */}
              <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-700 mb-3">
                <input type="checkbox" checked={contraTVPMedicamentosa} onChange={e => setContraTVPMedicamentosa(e.target.checked)} className="mt-0.5 w-4 h-4 accent-violet-600" />
                <span>Contraindicação à profilaxia medicamentosa (Sangramento ativo; Plqt &lt; 30.000; INR &gt; 2; TTPa &gt; 2x)</span>
              </label>

              {/* Sugestão de meta */}
              {riscoTVPAlto && (
                <div className="p-3 bg-white border border-violet-200 rounded-lg">
                  {contraTVPMedicamentosa ? (
                    <>
                      <p className="text-xs font-bold text-slate-600 mb-2">Contraindicação à profilaxia medicamentosa → profilaxia mecânica</p>
                      <button onClick={() => sugerirMetaRT('Profilaxia mecânica para TVP', 'auto_tvp_mecanica')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${metaAtivaRT('auto_tvp_mecanica') ? 'bg-violet-600 text-white border border-violet-600' : 'bg-violet-600 hover:bg-violet-700 text-white'}`}>{metaAtivaRT('auto_tvp_mecanica') ? '✓ Meta: Profilaxia mecânica para TVP' : '✓ Profilaxia mecânica para TVP'}</button>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-bold text-slate-600 mb-2">Profilaxia indicada: <span className="text-violet-700">{medicamentoTVP}</span> (Clearance de creatinina: {clearanceRT} mL/min)</p>
                      <button onClick={() => sugerirMetaRT(`Profilaxia de TVP com ${medicamentoTVP}`, `auto_tvp_${medicamentoTVP.replace(/\s+/g, '_')}`)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${metaAtivaRT(`auto_tvp_${medicamentoTVP.replace(/\s+/g, '_')}`) ? 'bg-violet-600 text-white border border-violet-600' : 'bg-violet-600 hover:bg-violet-700 text-white'}`}>{metaAtivaRT(`auto_tvp_${medicamentoTVP.replace(/\s+/g, '_')}`) ? '✓ Meta: Profilaxia de TVP' : `✓ Profilaxia de TVP com ${medicamentoTVP}`}</button>
                    </>
                  )}
                </div>
              )}
              {!riscoTVPAlto && (
                <p className="text-xs text-slate-400 italic">Sem critério de profilaxia de TVP pelo score atual.</p>
              )}
            </div>

            {/* 2. ÚLCERA DE ESTRESSE */}
            <div className="border border-violet-200 rounded-xl p-4 bg-violet-50">
              <h5 className="font-bold text-sm text-violet-800 mb-3">🛡️ Profilaxia de Úlcera de Estresse</h5>

              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Critérios de indicação:</p>
              <div className="space-y-1.5 mb-3">
                {ULCERA_CRITERIOS.map(item => (
                  <label key={item.id} className="flex items-start gap-2 cursor-pointer text-xs text-slate-700">
                    <input type="checkbox" checked={checklistUlcera[item.id] || false} onChange={e => setChecklistUlcera(prev => ({ ...prev, [item.id]: e.target.checked }))} className="mt-0.5 w-4 h-4 accent-violet-600" />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>

              {temCriterioUlcera && (
                <>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Impossibilidade de VO:</p>
                  <div className="space-y-1.5 mb-3">
                    {ULCERA_VO_PREJUDICADA.map(item => (
                      <label key={item.id} className="flex items-start gap-2 cursor-pointer text-xs text-slate-700">
                        <input type="checkbox" checked={checklistVOPrejudicada[item.id] || false} onChange={e => setChecklistVOPrejudicada(prev => ({ ...prev, [item.id]: e.target.checked }))} className="mt-0.5 w-4 h-4 accent-violet-600" />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Sangramento GI ativo → IBP dose terapêutica */}
                  {sangramentoGIA && (
                    <div className="p-3 bg-white border border-red-200 rounded-lg mb-2">
                      <button onClick={() => sugerirMetaRT('Iniciar IBP em dose terapêutica', 'auto_ibp_terapeutico')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${metaAtivaRT('auto_ibp_terapeutico') ? 'bg-red-600 text-white border border-red-600' : 'bg-red-600 hover:bg-red-700 text-white'}`}>{metaAtivaRT('auto_ibp_terapeutico') ? '✓ Meta: Iniciar IBP em dose terapêutica' : '✓ Iniciar IBP em dose terapêutica'}</button>
                    </div>
                  )}

                  {/* Profilaxia EV ou VO */}
                  <div className="p-3 bg-white border border-violet-200 rounded-lg">
                    {temVOPrejudicada ? (
                      <>
                        <p className="text-xs font-bold text-slate-600 mb-2">VO prejudicada → profilaxia EV</p>
                        <button onClick={() => sugerirMetaRT('Profilaxia de úlcera de estresse EV', 'auto_ulcera_ev')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${metaAtivaRT('auto_ulcera_ev') ? 'bg-violet-600 text-white border border-violet-600' : 'bg-violet-600 hover:bg-violet-700 text-white'}`}>{metaAtivaRT('auto_ulcera_ev') ? '✓ Meta: Profilaxia de úlcera de estresse EV' : '✓ Profilaxia de úlcera de estresse EV'}</button>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-bold text-slate-600 mb-2">VO preservada → profilaxia VO</p>
                        <button onClick={() => sugerirMetaRT('Profilaxia de úlcera de estresse VO', 'auto_ulcera_vo')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${metaAtivaRT('auto_ulcera_vo') ? 'bg-violet-600 text-white border border-violet-600' : 'bg-violet-600 hover:bg-violet-700 text-white'}`}>{metaAtivaRT('auto_ulcera_vo') ? '✓ Meta: Profilaxia de úlcera de estresse VO' : '✓ Profilaxia de úlcera de estresse VO'}</button>
                      </>
                    )}
                  </div>
                </>
              )}
              {!temCriterioUlcera && (
                <p className="text-xs text-slate-400 italic">Sem critério de profilaxia de úlcera de estresse.</p>
              )}
            </div>

            {/* 3. PLANO TERAPÊUTICO — AÇÕES RÁPIDAS */}
            <div className="border border-violet-200 rounded-xl p-4 bg-violet-50">
              <h5 className="font-bold text-sm text-violet-800 mb-3">📋 Plano Terapêutico</h5>

              {/* Ações de seleção única */}
              <div className="flex flex-wrap gap-2 mb-3">
                {PLANO_ACAO_UNICA.map(acao => (
                  <button key={acao.id} onClick={() => sugerirMetaRT(acao.meta, `auto_plano_${acao.id}`)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${metaAtivaRT(`auto_plano_${acao.id}`) ? 'bg-violet-600 text-white border border-violet-600' : 'bg-white border border-violet-300 text-violet-700 hover:bg-violet-100'}`}>{metaAtivaRT(`auto_plano_${acao.id}`) ? '✓ ' : ''}{acao.label}</button>
                ))}
              </div>

              {/* Ações com múltiplas opções */}
              <div className="space-y-3">
                {Object.entries(PLANO_OPCOES).map(([grupo, cfg]) => (
                  <div key={grupo} className="p-3 bg-white border border-violet-200 rounded-lg">
                    <button onClick={() => setPlanoAberto(planoAberto === grupo ? null : grupo)} className="w-full text-left text-xs font-bold text-violet-700 flex justify-between items-center">
                      <span>{cfg.titulo}</span>
                      <span className="text-violet-400">{planoAberto === grupo ? '▲' : '▼'}</span>
                    </button>
                    {planoAberto === grupo && (
                      <>
                        <div className="mt-2 space-y-1.5">
                          {cfg.opcoes.map(op => (
                            <label key={op} className="flex items-start gap-2 cursor-pointer text-xs text-slate-700">
                              <input type="checkbox" checked={(planoSelecao[grupo] || []).includes(op)} onChange={e => setPlanoSelecao(prev => {
                                const atuais = prev[grupo] || [];
                                return { ...prev, [grupo]: e.target.checked ? [...atuais, op] : atuais.filter(x => x !== op) };
                              })} className="mt-0.5 w-4 h-4 accent-violet-600" />
                              <span>{op}</span>
                            </label>
                          ))}
                        </div>
                        <button onClick={() => {
                          (planoSelecao[grupo] || []).forEach(op => {
                            const metaTexto = grupo === 'tc' ? `Solicitar TC de ${op}` : grupo === 'us' ? `Solicitar US de ${op}` : grupo === 'culturas' ? `Solicitar ${op}` : `Transfusão de ${op}`;
                            sugerirMetaRT(metaTexto, `auto_plano_${grupo}_${op.replace(/\s+/g, '_')}`);
                          });
                          setPlanoAberto(null);
                        }} disabled={(planoSelecao[grupo] || []).length === 0} className="mt-3 px-4 py-2 rounded-lg text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50">Criar meta(s)</button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ============ MÉDICO PLANTONISTA ============ */}
        {categoriaAtiva === 'medicoPlantonista' && (
          <>
            <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Médico Plantonista</h4>

            {/* 1. SEDAÇÃO — DESMAME */}
            <div className="border border-indigo-200 rounded-xl p-4 bg-indigo-50">
              <h5 className="font-bold text-sm text-indigo-800 mb-3">💤 Sedação — Critérios de Desmame</h5>
              {sedado ? (
                <>
                  <div className="mb-3 p-3 bg-white border border-indigo-200 rounded-lg">
                    <p className="text-xs font-bold text-slate-700 mb-1">Paciente sedado</p>
                    {drogasSedacao.length > 0 && (
                      <p className="text-xs text-slate-600 mb-2">
                        Drogas em uso: <span className="font-bold text-indigo-700">{drogasSedacao.join(', ')}</span>
                      </p>
                    )}
                    <div className="p-1.5 bg-slate-50 rounded text-xs">
                      <span className="font-bold text-slate-500">RASS:</span> <span className="font-bold text-indigo-700">{rass || '—'}</span>
                    </div>
                  </div>

                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Critérios para desmame de sedação:</p>
                  <div className="space-y-1.5">
                    {CHECKLIST_SEDACAO.map(item => (
                      <label key={item.id} className="flex items-start gap-2 cursor-pointer text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={checklistSedacao[item.id] || false}
                          onChange={e => setChecklistSedacao(prev => ({ ...prev, [item.id]: e.target.checked }))}
                          className="mt-0.5 w-4 h-4 accent-indigo-600"
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                  {Object.values(checklistSedacao).filter(Boolean).length === CHECKLIST_SEDACAO.length && (
                    <button
                      onClick={() => sugerirMetaMedico('Desmame de sedação', 'auto_desmame_sedacao')}
                      className="mt-3 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                    >{metaAtivaMed('auto_desmame_sedacao') ? '✓ Meta: Desmame de sedação' : '✓ Desmame de sedação'}</button>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-400 italic">Paciente não está sedado.</p>
              )}
            </div>

            {/* 2. DVAs EM USO */}
            <div className="border border-indigo-200 rounded-xl p-4 bg-indigo-50">
              <h5 className="font-bold text-sm text-indigo-800 mb-3">💉 Drogas Vasoativas (DVAs)</h5>
              {emDVA ? (
                <>
                  {drogasDVA.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {drogasDVA.map(d => (
                        <span key={d} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white">{d}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Em uso de DVA (verificar vazão na bomba no momento da visita).</p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-2 italic">Vazão: verificar na bomba de infusão no momento da visita.</p>
                </>
              ) : (
                <p className="text-sm text-slate-400 italic">Sem DVA em uso.</p>
              )}
            </div>

            {/* 3. ANTIBIÓTICOS EM USO */}
            <div className="border border-indigo-200 rounded-xl p-4 bg-indigo-50">
              <h5 className="font-bold text-sm text-indigo-800 mb-3">💊 Antibióticos em Uso</h5>
              {antibioticosEmUso.length > 0 ? (
                <div className="space-y-2">
                  {antibioticosEmUso.map((atb, idx) => {
                    const diasUso = atb.date ? Math.max(1, Math.round((new Date() - new Date(atb.date)) / 86400000) + 1) : null;
                    return (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-white border border-indigo-200 rounded-lg">
                        <span className="text-sm font-bold text-slate-700">{atb.name}</span>
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                          {diasUso ? `${diasUso}º dia de uso (início ${formatarDataBR(atb.date)})` : 'Data de início não informada'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">Nenhum antibiótico em uso.</p>
              )}
            </div>

            {/* 4. EXAMES DE RELEVÂNCIA (dia anterior) */}
            <div className="border border-indigo-200 rounded-xl p-4 bg-indigo-50">
              <h5 className="font-bold text-sm text-indigo-800 mb-3">🧪 Exames de Relevância (Dia Anterior)</h5>
              {examesRelevantes.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {examesRelevantes.map(ex => (
                      <div key={ex.nome} className="p-2 bg-white border border-indigo-200 rounded-lg text-center">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">{ex.nome}</p>
                        <p className="text-base font-black text-indigo-700">{ex.valor}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-2.5 bg-white border border-indigo-200 rounded-lg flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">Clearance de Creatinina (Cockcroft-Gault)</span>
                    <span className="text-base font-black text-indigo-700">{clearanceCreat} mL/min</span>
                  </div>
                  {/* Clearance < 30 → sugerir avaliação da Nefrologia */}
                  {clearanceBaixo && (
                    <div className="mt-3 p-3 bg-white border border-amber-300 rounded-lg">
                      <p className="text-xs font-bold text-amber-800 mb-2">
                        ⚠️ Clearance de creatinina &lt; 30 mL/min — considerar avaliação da Nefrologia
                      </p>
                      <button
                        onClick={() => sugerirMetaMedico('Avaliação da Nefrologia', 'auto_nefrologia')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${metaAtivaMed('auto_nefrologia') ? 'bg-indigo-600 text-white border border-indigo-600' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                      >{metaAtivaMed('auto_nefrologia') ? '✓ Meta: Avaliação da Nefrologia' : '✓ Avaliação da Nefrologia'}</button>
                    </div>
                  )}
                  {/* K < 3 → sugerir reposição de potássio */}
                  {kBaixo && (
                    <div className="mt-3 p-3 bg-white border border-amber-300 rounded-lg">
                      <p className="text-xs font-bold text-amber-800 mb-2">
                        ⚠️ Potássio (K) &lt; 3 mEq/L — considerar reposição de potássio
                      </p>
                      <button
                        onClick={() => sugerirMetaMedico('Repor K', 'auto_repor_k')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${metaAtivaMed('auto_repor_k') ? 'bg-indigo-600 text-white border border-indigo-600' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                      >{metaAtivaMed('auto_repor_k') ? '✓ Meta: Repor K' : '✓ Repor K'}</button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-400 italic">Nenhum exame de relevância registrado no dia anterior.</p>
              )}
            </div>

            {/* 5. EXAMES DE IMAGEM (meta do dia anterior) */}
            <div className="border border-indigo-200 rounded-xl p-4 bg-indigo-50">
              <h5 className="font-bold text-sm text-indigo-800 mb-3">🖥️ Exames de Imagem</h5>
              {metasOntemImg.length > 0 ? (
                <div className="space-y-2">
                  {metasOntemImg.map(m => (
                    <div key={m.id} className="p-2.5 bg-white border border-indigo-200 rounded-lg">
                      <p className="text-xs font-bold text-slate-700">{m.descricao || m.texto || 'Exame de imagem'}</p>
                      <button
                        onClick={() => sugerirMetaMedico(`Descreva tal exame realizado ontem: ${m.descricao || m.texto || ''}`, `auto_descrever_exame_${m.id}`)}
                        className="mt-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                      >{metaAtivaMed(`auto_descrever_exame_${m.id}`) ? '✓ Meta: Descrever exame' : 'Descreva tal exame realizado ontem'}</button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">Nenhuma meta de exame de imagem (Rx/TC) no dia anterior.</p>
              )}
            </div>
          </>
        )}

        {/* ============ ENFERMEIRO PLANTONISTA ============ */}
        {categoriaAtiva === 'enfermeiroPlantonista' && (
          <>
            <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Enfermeiro Plantonista</h4>

            {/* 1. RISCO DE QUEDA E LPP (escalas do dia anterior — só o significado) */}
            <div className="border border-sky-200 rounded-xl p-4 bg-sky-50">
              <h5 className="font-bold text-sm text-sky-800 mb-3">🛡️ Risco de Queda e LPP</h5>
              {escalaOntem && (
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                  Escalas preenchidas em {formatarDataBR(ontemISO)}
                </p>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Escala de Braden (LPP)</p>
                  {bradenOntem?.risco ? (
                    <span className="inline-block text-xs font-bold px-3 py-1.5 rounded-lg bg-sky-600 text-white">
                      {SIGNIFICADO_BRADEN[bradenOntem.risco] || bradenOntem.risco}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400 italic">Sem registro ontem</span>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Escala de Morse (Queda)</p>
                  {morseOntem?.risco ? (
                    <span className="inline-block text-xs font-bold px-3 py-1.5 rounded-lg bg-sky-600 text-white">
                      {SIGNIFICADO_MORSE[morseOntem.risco] || morseOntem.risco}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400 italic">Sem registro ontem</span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. DISPOSITIVOS — CVC / SHILEY / SVD */}
            <div className="border border-sky-200 rounded-xl p-4 bg-sky-50">
              <h5 className="font-bold text-sm text-sky-800 mb-3">🩺 Dispositivos — Critérios de Retirada</h5>

              {/* CVC */}
              {cvcAtivo && (
                <div className="mb-4 p-3 bg-white border border-sky-200 rounded-lg">
                  <p className="text-xs font-bold text-slate-700 mb-2">
                    CVC: {currentPatient?.enfermagem?.cvcLocal || 'Local não informado'} — inserido em {formatarDataBR(currentPatient?.enfermagem?.cvcData)}
                  </p>

                  {/* Critérios necessários (todos devem ser cumpridos) */}
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Critérios para a Retirada:</p>
                  <div className="space-y-1.5">
                    {CHECKLIST_CVC.necessarios.map(item => (
                      <label key={item.id} className="flex items-start gap-2 cursor-pointer text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={checklistCVC[item.id] || false}
                          onChange={e => setChecklistCVC(prev => ({ ...prev, [item.id]: e.target.checked }))}
                          className="mt-0.5 w-4 h-4 accent-sky-600"
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Critérios suficientes (qualquer um justifica a retirada) */}
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-3 mb-2">Critérios suficientes (qualquer um justifica a retirada):</p>
                  <div className="space-y-1.5">
                    {CHECKLIST_CVC.suficientes.map(item => (
                      <label key={item.id} className="flex items-start gap-2 cursor-pointer text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={checklistCVC[item.id] || false}
                          onChange={e => setChecklistCVC(prev => ({ ...prev, [item.id]: e.target.checked }))}
                          className="mt-0.5 w-4 h-4 accent-sky-600"
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Botão: todos os necessários OU qualquer suficiente */}
                  {(() => {
                    const todosNecessarios = CHECKLIST_CVC.necessarios.every(i => checklistCVC[i.id]);
                    const algumSuficiente = CHECKLIST_CVC.suficientes.some(i => checklistCVC[i.id]);
                    return (todosNecessarios || algumSuficiente) && (
                      <button
                        onClick={() => sugerirMetaEnfermeiro('Sacar CVC', 'auto_sacar_cvc')}
                        className="mt-3 px-4 py-2 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white transition-colors"
                      >{metaAtivaEnf('auto_sacar_cvc') ? '✓ Meta: Sacar CVC' : '✓ Sacar CVC'}</button>
                    );
                  })()}
                </div>
              )}

              {/* SHILEY (cateter de HD) — critério único: sem necessidade de TRS */}
              {shileyAtivo && (
                <div className="mb-4 p-3 bg-white border border-sky-200 rounded-lg">
                  <p className="text-xs font-bold text-slate-700 mb-2">
                    Shiley (cateter de HD): {currentPatient?.enfermagem?.shileyLocal || 'Local não informado'} — inserido em {formatarDataBR(currentPatient?.enfermagem?.shileyData)}
                  </p>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Critérios para retirada:</p>
                  <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={checklistShiley}
                      onChange={e => setChecklistShiley(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-sky-600"
                    />
                    <span>Sem necessidade de TRS (Terapia Renal Substitutiva)</span>
                  </label>
                  {checklistShiley && (
                    <button
                      onClick={() => sugerirMetaEnfermeiro('Sacar Shiley (cateter de HD)', 'auto_sacar_shiley')}
                      className="mt-3 px-4 py-2 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white transition-colors"
                    >{metaAtivaEnf('auto_sacar_shiley') ? '✓ Meta: Sacar Shiley' : '✓ Sacar Shiley'}</button>
                  )}
                </div>
              )}

              {/* SVD */}
              {svdAtivo && (
                <div className="p-3 bg-white border border-sky-200 rounded-lg">
                  <p className="text-xs font-bold text-slate-700 mb-2">
                    SVD — inserido em {formatarDataBR(currentPatient?.enfermagem?.svdData)}
                  </p>

                  {/* Critérios necessários (todos devem ser cumpridos) */}
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Critérios para a Retirada:</p>
                  <div className="space-y-1.5">
                    {CHECKLIST_SVD.necessarios.map(item => (
                      <label key={item.id} className="flex items-start gap-2 cursor-pointer text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={checklistSVD[item.id] || false}
                          onChange={e => setChecklistSVD(prev => ({ ...prev, [item.id]: e.target.checked }))}
                          className="mt-0.5 w-4 h-4 accent-sky-600"
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Critérios suficientes (qualquer um justifica a retirada) */}
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-3 mb-2">Critérios suficientes (qualquer um justifica a retirada):</p>
                  <div className="space-y-1.5">
                    {CHECKLIST_SVD.suficientes.map(item => (
                      <label key={item.id} className="flex items-start gap-2 cursor-pointer text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={checklistSVD[item.id] || false}
                          onChange={e => setChecklistSVD(prev => ({ ...prev, [item.id]: e.target.checked }))}
                          className="mt-0.5 w-4 h-4 accent-sky-600"
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Botão: todos os necessários OU qualquer suficiente */}
                  {(() => {
                    const todosNecessarios = CHECKLIST_SVD.necessarios.every(i => checklistSVD[i.id]);
                    const algumSuficiente = CHECKLIST_SVD.suficientes.some(i => checklistSVD[i.id]);
                    return (todosNecessarios || algumSuficiente) && (
                      <button
                        onClick={() => sugerirMetaEnfermeiro('Sacar SVD', 'auto_sacar_svd')}
                        className="mt-3 px-4 py-2 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white transition-colors"
                      >{metaAtivaEnf('auto_sacar_svd') ? '✓ Meta: Sacar SVD' : '✓ Sacar SVD'}</button>
                    );
                  })()}
                </div>
              )}

              {!cvcAtivo && !shileyAtivo && !svdAtivo && (
                <p className="text-sm text-slate-400 italic">Nenhum dispositivo ativo (sem data de retirada pendente).</p>
              )}
            </div>

            {/* 3. LESÕES CUTÂNEAS / CURATIVOS */}
            {lesoes.length > 0 && (
              <div className="border border-sky-200 rounded-xl p-4 bg-sky-50">
                <h5 className="font-bold text-sm text-sky-800 mb-3">🩹 Lesões Cutâneas / Curativos</h5>
                <div className="space-y-3">
                  {lesoes.map(lesao => {
                    const localizacao = lesao.localizacao || 'não informada';
                    return (
                      <div key={lesao.id ?? JSON.stringify(lesao)} className="p-3 bg-white border border-sky-200 rounded-lg">
                        <p className="text-xs font-bold text-slate-700 mb-2">
                          {lesao.localizacao || 'Local não informado'}
                          {lesao.estagio ? ` — ${lesao.estagio}` : ''}
                          {lesao.curativo ? ` (curativo atual: ${lesao.curativo})` : ''}
                        </p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Selecionar curativo:</p>
                        <div className="flex flex-wrap gap-2">
                          {['Carvão ativado', 'Alginato', 'Hidrocoloide', 'Filme transparente', 'Espuma', 'Gaze úmida', 'Colagenase', 'Papaina'].map(cur => {
                            const ativo = curativoSelecionado[lesao.id] === cur;
                            return (
                              <button
                                key={cur}
                                onClick={() => {
                                  setCurativoSelecionado(prev => ({ ...prev, [lesao.id]: cur }));
                                  sugerirMetaEnfermeiro(`Curativo com ${cur} em lesão da região ${localizacao}`, `auto_curativo_${lesao.id}_${cur}`);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${ativo ? 'bg-sky-600 text-white border border-sky-600' : 'bg-white border border-sky-300 text-sky-700 hover:bg-sky-100'}`}
                              >{cur}</button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. BH DO DIA ANTERIOR (janela 07h de ontem → 06h de hoje) */}
            <div className="border border-sky-200 rounded-xl p-4 bg-sky-50">
              <h5 className="font-bold text-sm text-sky-800 mb-3">⚖️ Balanço Hídrico (Dia Anterior — 07h às 06h)</h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-2 bg-white border border-sky-200 rounded-lg">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Total Ganhos</p>
                  <p className="text-lg font-black text-green-700">+{totalGanhosBH}</p>
                </div>
                <div className="p-2 bg-white border border-sky-200 rounded-lg">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Total Perdas (+PI {piBH})</p>
                  <p className="text-lg font-black text-red-600">-{totalPerdasBH}</p>
                </div>
                <div className="p-2 bg-white border border-sky-200 rounded-lg">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Balanço 24h</p>
                  <p className={`text-lg font-black ${balanco24hBH >= 0 ? 'text-sky-700' : 'text-amber-600'}`}>{balanco24hBH > 0 ? '+' : ''}{balanco24hBH}</p>
                </div>
                <div className="p-2 bg-white border border-sky-200 rounded-lg">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">BH ACUMULADO</p>
                  <p className="text-lg font-black text-slate-700">{totalAtualBH > 0 ? '+' : ''}{totalAtualBH}</p>
                </div>
              </div>
            </div>

            {/* 5. HIGIENE ORAL (dia calendário anterior) */}
            <div className="border border-sky-200 rounded-xl p-4 bg-sky-50">
              <h5 className="font-bold text-sm text-sky-800 mb-3">🪥 Higiene Oral — Dia Anterior</h5>
              <p className="text-sm text-slate-700">
                Registros de higiene oral feitos pelos técnicos no dia anterior:{' '}
                <span className="font-black text-sky-700">{qtdHigieneOral} {qtdHigieneOral === 1 ? 'registro' : 'registros'}</span>{' '}
                (meta: 3x/dia)
                {qtdHigieneOral >= 3 && (
                  <span className="ml-2 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-lg px-2 py-1">✓ Meta atingida</span>
                )}
                {qtdHigieneOral > 0 && qtdHigieneOral < 3 && (
                  <span className="ml-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">⚠ Abaixo da meta</span>
                )}
                {qtdHigieneOral === 0 && (
                  <span className="ml-2 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1">Nenhum registro</span>
                )}
              </p>

              {/* Meta automática: menos de 3 registros no dia anterior */}
              {qtdHigieneOral < 3 && (
                <div className="mt-3 p-3 bg-white border border-sky-200 rounded-lg">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Higiene oral abaixo da meta (3x/dia)</p>
                  <button
                    onClick={() => sugerirMetaEnfermeiro('Realizar Higiene Oral 3x/d', 'auto_higiene_oral')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${metaAtivaEnf('auto_higiene_oral') ? 'bg-sky-600 text-white border border-sky-600' : 'bg-sky-600 hover:bg-sky-700 text-white'}`}
                  >{metaAtivaEnf('auto_higiene_oral') ? '✓ Meta: Realizar Higiene Oral 3x/d' : '✓ Realizar Higiene Oral 3x/d'}</button>
                </div>
              )}
            </div>

            {/* 6. HIGIENE ÍNTIMA (dia calendário anterior) */}
            <div className="border border-indigo-200 rounded-xl p-4 bg-indigo-50">
              <h5 className="font-bold text-sm text-indigo-800 mb-3">🚿 Higiene Íntima — Dia Anterior</h5>
              <p className="text-sm text-slate-700">
                Registros de higiene íntima feitos pelos técnicos no dia anterior:{' '}
                <span className="font-black text-indigo-700">{qtdHigieneIntima} {qtdHigieneIntima === 1 ? 'registro' : 'registros'}</span>{' '}
                (meta: 3x/dia)
                {qtdHigieneIntima >= 3 && (
                  <span className="ml-2 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-lg px-2 py-1">✓ Meta atingida</span>
                )}
                {qtdHigieneIntima > 0 && qtdHigieneIntima < 3 && (
                  <span className="ml-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">⚠ Abaixo da meta</span>
                )}
                {qtdHigieneIntima === 0 && (
                  <span className="ml-2 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1">Nenhum registro</span>
                )}
              </p>

              {/* Meta automática: menos de 3 registros no dia anterior */}
              {qtdHigieneIntima < 3 && (
                <div className="mt-3 p-3 bg-white border border-indigo-200 rounded-lg">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Higiene íntima abaixo da meta (3x/dia)</p>
                  <button
                    onClick={() => sugerirMetaEnfermeiro('Realizar Higiene Íntima 3x/d', 'auto_higiene_intima')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${metaAtivaEnf('auto_higiene_intima') ? 'bg-indigo-600 text-white border border-indigo-600' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                  >{metaAtivaEnf('auto_higiene_intima') ? '✓ Meta: Realizar Higiene Íntima 3x/d' : '✓ Realizar Higiene Íntima 3x/d'}</button>
                </div>
              )}
            </div>

            {/* 7. OBSERVAÇÕES */}
            <CampoTexto label="Observações" valor={visita.enfermeiroPlantonista.observacoes} onChange={v => updateDeep('enfermeiroPlantonista', ['observacoes'], v)} />
          </>
        )}

        {/* ============ FISIOTERAPEUTA PLANTONISTA ============ */}
        {categoriaAtiva === 'fisioterapeutaPlantonista' && (
          <>
            <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Fisioterapeuta Plantonista</h4>

            {/* BLOCO A — SUPORTE VENTILATÓRIO */}
            <div className="border border-cyan-200 rounded-xl p-4 bg-cyan-50">
              <h5 className="font-bold text-sm text-cyan-800 mb-3">🫁 Suporte Ventilatório</h5>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                <LinhaInfo rotulo="Suporte" valor={suporteAtual || 'Não informado'} />
                <LinhaInfo rotulo="FiO2" valor={fio2Atual ? `${fio2Atual}%` : '—'} />
              </div>
              {suporteAtual === 'VM' && (
                <div className="mt-3 grid sm:grid-cols-3 gap-x-6 gap-y-1.5 text-sm border-t border-cyan-200 pt-3">
                  <LinhaInfo rotulo="Tempo de VM" valor={typeof getTempoVMText === 'function' ? getTempoVMText(currentPatient) : '—'} />
                  <LinhaInfo rotulo="FiO2" valor={ultimaVM?.fio2 ? `${ultimaVM.fio2}%` : '—'} />
                  <LinhaInfo rotulo="PEEP" valor={ultimaVM?.peep || '—'} />
                  <LinhaInfo rotulo="Vc (mL/kg)" valor={vcMlKg !== null ? vcMlKg : '—'} />
                  <LinhaInfo rotulo="P platô" valor={ultimaVM?.pPlato || '—'} />
                  <LinhaInfo rotulo="Driving Pressure" valor={ultimaVM?.dp || '—'} />
                </div>
              )}
              {/* Sincronismo (campo novo do fisio) */}
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <span className="text-sm font-bold text-slate-600">Sincronismo:</span>
                {['Boa', 'Razoável', 'Ruim'].map(op => (
                  <button
                    key={op}
                    onClick={() => updateDeep('fisioterapeutaPlantonista', ['sincronismo'], op)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                      visita.fisioterapeutaPlantonista.sincronismo === op
                        ? 'bg-cyan-600 text-white'
                        : 'bg-white border border-slate-300 text-slate-600 hover:bg-cyan-100'
                    }`}
                  >{op}</button>
                ))}
              </div>
            </div>

            {/* BLOCO B — CRITÉRIOS PARA TRE (movido do Médico RT) */}
            <ChecklistCard
              titulo="Critérios para TRE"
              descricao="Se todos ok → sugere tentativa de TRE"
              itens={CRITERIOS_TRE}
              valores={visita.fisioterapeutaPlantonista.tre}
              onToggle={(id, v) => updateDeep('fisioterapeutaPlantonista', ['tre', id], v)}
              cor="indigo"
            />
            {treTodosOk && (
              <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                🎯 Todos os critérios de TRE presentes — meta sugerida: <b>Tentativa de TRE</b> (aguardando confirmação médica)
              </p>
            )}

            {/* BLOCO C — SECREÇÃO E TOSSE (auto de physio, sem meta) */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
              <h5 className="font-bold text-sm text-slate-700 mb-3">🫁 Secreção e Tosse</h5>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                <LinhaInfo rotulo="Tosse" valor={currentPatient?.physio?.tosse || '—'} />
                <LinhaInfo rotulo="Secreção" valor={currentPatient?.physio?.secrecao ? 'Presente' : 'Ausente'} />
              </div>
              {currentPatient?.physio?.secrecao && (
                <div className="mt-2 grid sm:grid-cols-3 gap-x-6 gap-y-1.5 text-sm border-t border-slate-200 pt-2">
                  <LinhaInfo rotulo="Aspecto" valor={currentPatient?.physio?.secrecaoAspecto || '—'} />
                  <LinhaInfo rotulo="Coloração" valor={currentPatient?.physio?.secrecaoColoracao || '—'} />
                  <LinhaInfo rotulo="Quantidade" valor={currentPatient?.physio?.secrecaoQtd || '—'} />
                </div>
              )}
            </div>

            {/* BLOCO D — GASOMETRIA DO DIA ANTERIOR */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
              <h5 className="font-bold text-sm text-slate-700 mb-3">🧪 Gasometria do dia anterior ({ontemBR})</h5>
              {gasometriasOntem.length === 0 ? (
                <p className="text-sm text-slate-400 italic">Nenhuma gasometria registrada no dia anterior.</p>
              ) : (
                <div className="space-y-3">
                  {gasometriasOntem.map(g => (
                    <div key={g.chave} className="border border-slate-200 rounded-lg bg-white p-3">
                      <p className="text-xs font-bold text-slate-500 mb-2">🕐 {g.hora || 'Horário indefinido'}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1.5 text-sm">
                        <LinhaInfo rotulo="pH" valor={g.dados.pH || '—'} />
                        <LinhaInfo rotulo="pCO2" valor={g.dados.pCO2 || '—'} />
                        <LinhaInfo rotulo="PaO2" valor={g.dados.PaO2 || '—'} />
                        <LinhaInfo rotulo="HCO3" valor={g.dados.HCO3 || '—'} />
                        <LinhaInfo rotulo="BE" valor={g.dados.BE || '—'} />
                        <LinhaInfo rotulo="SatO2" valor={g.dados.SatO2 || '—'} />
                        <LinhaInfo rotulo="FiO2" valor={g.dados.FiO2 || '—'} />
                        <LinhaInfo rotulo="P/F" valor={g.dados['P/F'] || '—'} destaque={g.dados['P/F'] && parseFloat(String(g.dados['P/F']).replace(',', '.')) < 150} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {gasometriasOntem.some(g => g.dados['P/F'] && parseFloat(String(g.dados['P/F']).replace(',', '.')) < 150) && (
                <p className="mt-3 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  🎯 P/F &lt; 150 detectado — meta sugerida: <b>Otimizar oxigenação / revisar suporte</b> (aguardando confirmação médica)
                </p>
              )}
            </div>

            {/* BLOCO E — IMS DO DIA ANTERIOR + METAS DE MOBILIZAÇÃO */}
            <div className="border border-purple-200 rounded-xl p-4 bg-purple-50">
              <h5 className="font-bold text-sm text-purple-800 mb-3">🚶 IMS do dia anterior + Metas de Mobilização</h5>
              <LinhaInfo rotulo="IMS (dia anterior)" valor={imsOntem || '—'} />
              <div className="mt-3 border-t border-purple-200 pt-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Metas de mobilização do dia</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {METAS_MOBILIZACAO.map(op => (
                    <label key={op} className="flex items-center gap-2 cursor-pointer bg-white border border-slate-200 rounded-lg px-3 py-2">
                      <input
                        type="checkbox"
                        checked={mobilizacaoSelecionada.includes(op)}
                        onChange={e => {
                          if (e.target.checked) setMobilizacaoSelecionada(prev => [...prev, op]);
                          else setMobilizacaoSelecionada(prev => prev.filter(x => x !== op));
                        }}
                        className="w-4 h-4 accent-purple-600"
                      />
                      <span className="text-sm font-semibold text-slate-700">{op}</span>
                    </label>
                  ))}
                </div>
                {mobilizacaoSelecionada.length > 0 && (
                  <div className="mt-3 bg-white border border-purple-200 rounded-lg p-3">
                    <p className="text-xs text-slate-500 font-semibold mb-1">Meta a ser criada:</p>
                    <p className="text-sm font-bold text-purple-800">"{mobilizacaoSelecionada.join(' + ')}"</p>
                    <button
                      onClick={confirmarMetaMobilizacao}
                      className="mt-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm transition-colors"
                    >
                      ✓ Confirmar meta
                    </button>
                  </div>
                )}
              </div>
            </div>

            <CampoTexto label="Observações" valor={visita.fisioterapeutaPlantonista.observacoes} onChange={v => updateDeep('fisioterapeutaPlantonista', ['observacoes'], v)} />
          </>
        )}

        {/* ============ NUTRICIONISTA ============ */}
        {categoriaAtiva === 'nutricionista' && (
          <>
            <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Nutricionista</h4>

            {/* BLOCO A — VIA DA DIETA */}
            <div className="border border-lime-200 rounded-xl p-4 bg-lime-50">
              <h5 className="font-bold text-sm text-lime-800 mb-3">🍽️ Via da Dieta</h5>
              <LinhaInfo rotulo="Via atual" valor={currentPatient?.nutri?.via || 'Não informada'} />
              <div className="mt-3 border-t border-lime-200 pt-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mudar para...</p>
                <div className="flex flex-wrap gap-2">
                  {VIAS_DIETA.filter(v => v !== currentPatient?.nutri?.via).map(v => {
                    const origem = `auto_mudar_via_${v}`;
                    return (
                      <button key={v} onClick={() => sugerirMetaNutri(`Mudar via da dieta para ${v}`, origem)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${metaAtiva(origem) ? 'bg-lime-600 text-white border border-lime-600 shadow-sm' : 'bg-white border border-lime-300 text-lime-700 hover:bg-lime-100'}`}>
                        {v}
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-3 mb-2">Adicionar via de alimentação...</p>
                <div className="flex flex-wrap gap-2">
                  {VIAS_ADICIONAR.map(v => {
                    const origem = `auto_adicionar_via_${v}`;
                    return (
                      <button key={v} onClick={() => sugerirMetaNutri(`Adicionar via ${v.toLowerCase()} de alimentação`, origem)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${metaAtiva(origem) ? 'bg-lime-600 text-white border border-lime-600 shadow-sm' : 'bg-white border border-lime-300 text-lime-700 hover:bg-lime-100'}`}>
                        + {v}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* BLOCO A — APORTE NUTRICIONAL DA DIETA ENTERAL (dia anterior) */}
            {temEnteral && (
              <div className="border border-lime-200 rounded-xl p-4 bg-lime-50">
                <h5 className="font-bold text-sm text-lime-800 mb-3">🍼 Aporte da Dieta Enteral — {ontemBR}</h5>
                {!infoFormula ? (
                  <p className="text-sm text-slate-400 italic">Selecione a fórmula enteral para calcular o aporte.</p>
                ) : volumeDietaEnteral <= 0 ? (
                  <p className="text-sm text-slate-400 italic">Nenhum registro de dieta enteral no BH do dia anterior.</p>
                ) : (
                  <>
                    <p className="text-xs font-bold text-slate-500 mb-2">
                      Fórmula: <span className="text-lime-800">{formulaEnteral}</span> · Volume: <span className="text-lime-800">{volumeDietaEnteral} ml</span>
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 bg-white border border-lime-200 rounded-lg text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Calorias</p>
                        <p className="text-lg font-black text-lime-700">{kcalEnteral} <span className="text-xs font-bold text-slate-400">kcal</span></p>
                      </div>
                      <div className="p-2 bg-white border border-lime-200 rounded-lg text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Proteínas</p>
                        <p className="text-lg font-black text-lime-700">{ptnEnteral} <span className="text-xs font-bold text-slate-400">g</span></p>
                      </div>
                      <div className="p-2 bg-white border border-lime-200 rounded-lg text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Água</p>
                        <p className="text-lg font-black text-lime-700">{aguaEnteral} <span className="text-xs font-bold text-slate-400">ml</span></p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* BLOCO A2 — APORTE DA DIETA PARENTERAL (dia anterior) */}
            {temParenteral && (
              <div className="border border-violet-200 rounded-xl p-4 bg-violet-50">
                <h5 className="font-bold text-sm text-violet-800 mb-3">💉 Aporte da Dieta Parenteral — {ontemBR}</h5>
                {volumeDietaParenteral <= 0 ? (
                  <p className="text-sm text-slate-400 italic">Nenhum registro de dieta parenteral (NPT) no BH do dia anterior.</p>
                ) : (
                  <>
                    <p className="text-xs font-bold text-slate-500 mb-2">
                      Volume: <span className="text-violet-800">{volumeDietaParenteral} ml</span>
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 bg-white border border-violet-200 rounded-lg text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Calorias</p>
                        <p className="text-lg font-black text-violet-700">{kcalParenteral} <span className="text-xs font-bold text-slate-400">kcal</span></p>
                      </div>
                      <div className="p-2 bg-white border border-violet-200 rounded-lg text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Proteínas</p>
                        <p className="text-lg font-black text-violet-700">{ptnParenteral} <span className="text-xs font-bold text-slate-400">g</span></p>
                      </div>
                      <div className="p-2 bg-white border border-violet-200 rounded-lg text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Água</p>
                        <p className="text-lg font-black text-violet-700">{aguaParenteral} <span className="text-xs font-bold text-slate-400">ml</span></p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* BLOCO B — CONSISTÊNCIA / CARACTERÍSTICAS / NOME */}
            {!parenteralIsolada && (
              <div className="border border-lime-200 rounded-xl p-4 bg-lime-50">
                <h5 className="font-bold text-sm text-lime-800 mb-3">🥣 Consistência / Características / Nome</h5>

                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                  {temOral && <LinhaInfo rotulo="Consistência (Fono)" valor={currentPatient?.fono?.consistencia || '—'} />}
                  {temEnteral && <LinhaInfo rotulo="Nome (dieta enteral)" valor={currentPatient?.nutri?.tipoDietaEnteral || '—'} />}
                </div>

                {temOral && (
                  <>
                    <p className="text-xs font-bold text-slate-500 mt-2 mb-1">Características atuais:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(currentPatient?.nutri?.caracteristicasDieta || []).length === 0
                        ? <span className="text-sm text-slate-400 italic">Nenhuma</span>
                        : (currentPatient?.nutri?.caracteristicasDieta || []).map(c => (
                            <span key={c} className="text-xs font-bold bg-white border border-lime-300 text-lime-700 px-2 py-0.5 rounded-lg">{c}</span>
                          ))}
                    </div>
                  </>
                )}

                <div className="mt-3 border-t border-lime-200 pt-3">
                  {/* DIETA ENTERAL → mudar fórmula */}
                  {temEnteral && (
                    <div className="mb-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mudar dieta enteral para...</p>
                      <select
                        className="w-full p-2.5 border-2 border-lime-200 rounded-lg font-bold text-slate-700 outline-none focus:border-lime-500 bg-white"
                        value={enteralSelecionada}
                        onChange={(e) => setEnteralSelecionada(e.target.value)}
                      >
                        <option value="">Selecione a fórmula enteral...</option>
                        {FORMULAS_ENTERAIS.map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>

                      {/* Botão de confirmação — só aparece quando há uma fórmula selecionada */}
                      {enteralSelecionada && (
                        <div className="mt-3 bg-white border border-lime-200 rounded-lg p-3">
                          <p className="text-xs text-slate-500 font-semibold mb-1">Meta a ser criada:</p>
                          <p className="text-sm font-bold text-lime-800">"Mudar dieta enteral para {enteralSelecionada}"</p>
                          <button
                            onClick={() => {
                              sugerirMetaNutri(`Mudar dieta enteral para ${enteralSelecionada}`, `auto_mudar_enteral_${enteralSelecionada}`);
                              setEnteralSelecionada('');
                            }}
                            className="mt-2 px-4 py-2 rounded-lg bg-lime-600 hover:bg-lime-700 text-white font-bold text-sm transition-colors"
                          >✓ Confirmar meta</button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* DIETA ORAL → consistência + características */}
                  {temOral && (
                    <>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mudar consistência para...</p>
                      <div className="flex flex-wrap gap-2">
                        {CONSISTENCIA_ALIMENTAR.filter(c => c !== currentPatient?.fono?.consistencia).map(c => {
                          const origem = `auto_mudar_consistencia_${c}`;
                          return (
                            <button key={c} onClick={() => sugerirMetaNutri(`Mudar consistência da dieta para ${c}`, origem)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${metaAtiva(origem) ? 'bg-lime-600 text-white border border-lime-600 shadow-sm' : 'bg-white border border-lime-300 text-lime-700 hover:bg-lime-100'}`}>
                              {c}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-3 mb-2">Mudar características para... (clique para selecionar)</p>
                      <div className="flex flex-wrap gap-2">
                        {CARACTERISTICAS_DIETA.map(c => {
                          const ativa = caracteristicasSelecionadas.includes(c);
                          return (
                            <button
                              key={c}
                              onClick={() => setCaracteristicasSelecionadas(prev =>
                                prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
                              )}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                ativa
                                  ? 'bg-lime-600 text-white border border-lime-600 shadow-sm'
                                  : 'bg-white border border-lime-300 text-lime-700 hover:bg-lime-100'
                              }`}
                            >{c}</button>
                          );
                        })}
                      </div>
                      {caracteristicasSelecionadas.length > 0 && (
                        <div className="mt-3 bg-white border border-lime-200 rounded-lg p-3">
                          <p className="text-xs text-slate-500 font-semibold mb-1">Meta a ser criada:</p>
                          <p className="text-sm font-bold text-lime-800">"{caracteristicasSelecionadas.join(', ')}"</p>
                          <button
                            onClick={confirmarCaracteristicas}
                            className="mt-2 px-4 py-2 rounded-lg bg-lime-600 hover:bg-lime-700 text-white font-bold text-sm transition-colors"
                          >✓ Confirmar meta</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* BLOCO C — CONSUMO ORAL */}
            <div className="border border-lime-200 rounded-xl p-4 bg-lime-50">
              <h5 className="font-bold text-sm text-lime-800 mb-3">📊 Monitoramento do Consumo Oral</h5>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-xs font-bold text-slate-600 uppercase">Alimentos (Média)</span>
                    <span className="text-lg font-black text-lime-700">{mediaSolida}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-lime-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${mediaSolida}%` }}></div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 text-right">{consumosSolida.length} refeições registradas</p>
                </div>
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-xs font-bold text-slate-600 uppercase">Suplementos (Média)</span>
                    <span className="text-lg font-black text-lime-700">{mediaLiquida}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-lime-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${mediaLiquida}%` }}></div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 text-right">{consumosLiquida.length} refeições registradas</p>
                </div>
              </div>
            </div>

            {/* BLOCO D — METAS CALÓRICAS E PROTEICAS */}
            <div className="border border-lime-200 rounded-xl p-4 bg-lime-50">
              <h5 className="font-bold text-sm text-lime-800 mb-3">🎯 Metas Calóricas e Proteicas</h5>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                <LinhaInfo rotulo="Meta Cal. Diária" valor={currentPatient?.nutri?.metaCalDiaria ? `${currentPatient.nutri.metaCalDiaria} kcal` : '—'} destaque={calDiariaNaoAtingida} />
                <LinhaInfo rotulo="Meta Prot. Diária" valor={currentPatient?.nutri?.metaProtDiaria ? `${currentPatient.nutri.metaProtDiaria} g` : '—'} destaque={protDiariaNaoAtingida} />
                <LinhaInfo rotulo="Meta Cal. Total" valor={currentPatient?.nutri?.metaCalTotal ? `${currentPatient.nutri.metaCalTotal} kcal` : '—'} destaque={calTotalNaoAtingida} />
                <LinhaInfo rotulo="Meta Prot. Total" valor={currentPatient?.nutri?.metaProtTotal ? `${currentPatient.nutri.metaProtTotal} g` : '—'} destaque={protTotalNaoAtingida} />
              </div>
              {calNaoAtingida && (
                <p className="mt-3 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  🎯 Meta calórica não atingida — meta sugerida: <b>Aumentar aporte calórico</b> (aguardando confirmação)
                </p>
              )}
              {protNaoAtingida && (
                <p className="mt-3 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  🎯 Meta proteica não atingida — meta sugerida: <b>Aumentar aporte proteico</b> (aguardando confirmação)
                </p>
              )}
            </div>

            {/* BLOCO E — VAZÃO DA DIETA */}
            {(currentPatient?.nutri?.via === 'Enteral' || currentPatient?.nutri?.via === 'Parenteral' || currentPatient?.nutri?.via === 'Mista') && (
              <div className="border border-lime-200 rounded-xl p-4 bg-lime-50">
                <h5 className="font-bold text-sm text-lime-800 mb-3">💧 Vazão da Dieta</h5>

                {currentPatient?.nutri?.via === 'Mista' ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {(currentPatient?.nutri?.viasMistas || []).includes('Enteral') && (
                      <div>
                        <LinhaInfo rotulo="Vazão Enteral atual" valor={currentPatient?.nutri?.vazaoEnteral ? `${currentPatient.nutri.vazaoEnteral} ml/h` : '—'} />
                        <div className="mt-2 flex items-end gap-2 flex-wrap">
                          <input
                            type="number"
                            value={novaVazaoEnteral}
                            onChange={e => setNovaVazaoEnteral(e.target.value)}
                            placeholder="ex: 40"
                            className="flex-1 min-w-[120px] p-2 border border-lime-300 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-lime-300 bg-white"
                          />
                          <button
                            onClick={() => { if (novaVazaoEnteral) { sugerirMetaNutri(`Ajustar vazão enteral para ${novaVazaoEnteral} ml/h`, 'auto_ajustar_vazao_enteral'); setNovaVazaoEnteral(''); } }}
                            disabled={!novaVazaoEnteral}
                            className="px-3 py-2 rounded-lg text-xs font-bold bg-lime-600 hover:bg-lime-700 text-white disabled:opacity-40 transition-colors"
                          >Programar</button>
                        </div>
                      </div>
                    )}
                    {(currentPatient?.nutri?.viasMistas || []).includes('Parenteral') && (
                      <div>
                        <LinhaInfo rotulo="Vazão Parenteral atual" valor={currentPatient?.nutri?.vazaoParenteral ? `${currentPatient.nutri.vazaoParenteral} ml/h` : '—'} />
                        <div className="mt-2 flex items-end gap-2 flex-wrap">
                          <input
                            type="number"
                            value={novaVazaoParenteral}
                            onChange={e => setNovaVazaoParenteral(e.target.value)}
                            placeholder="ex: 30"
                            className="flex-1 min-w-[120px] p-2 border border-lime-300 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-lime-300 bg-white"
                          />
                          <button
                            onClick={() => { if (novaVazaoParenteral) { sugerirMetaNutri(`Ajustar vazão parenteral para ${novaVazaoParenteral} ml/h`, 'auto_ajustar_vazao_parenteral'); setNovaVazaoParenteral(''); } }}
                            disabled={!novaVazaoParenteral}
                            className="px-3 py-2 rounded-lg text-xs font-bold bg-lime-600 hover:bg-lime-700 text-white disabled:opacity-40 transition-colors"
                          >Programar</button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : currentPatient?.nutri?.via === 'Enteral' ? (
                  <div>
                    <LinhaInfo rotulo="Vazão Enteral atual" valor={currentPatient?.nutri?.vazaoEnteral ? `${currentPatient.nutri.vazaoEnteral} ml/h` : '—'} />
                    <div className="mt-3 border-t border-lime-200 pt-3 flex items-end gap-3 flex-wrap">
                      <div className="flex-1 min-w-[160px]">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Programar nova vazão enteral (ml/h)</label>
                        <input
                          type="number"
                          value={novaVazaoEnteral}
                          onChange={e => setNovaVazaoEnteral(e.target.value)}
                          placeholder="ex: 40"
                          className="w-full p-2 border border-lime-300 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-lime-300 bg-white"
                        />
                      </div>
                      <button
                        onClick={() => { if (novaVazaoEnteral) { sugerirMetaNutri(`Ajustar vazão enteral para ${novaVazaoEnteral} ml/h`, 'auto_ajustar_vazao_enteral'); setNovaVazaoEnteral(''); } }}
                        disabled={!novaVazaoEnteral}
                        className="px-4 py-2 rounded-lg text-xs font-bold bg-lime-600 hover:bg-lime-700 text-white disabled:opacity-40 transition-colors"
                      >Programar vazão</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <LinhaInfo rotulo="Vazão Parenteral atual" valor={currentPatient?.nutri?.vazaoParenteral ? `${currentPatient.nutri.vazaoParenteral} ml/h` : '—'} />
                    <div className="mt-3 border-t border-lime-200 pt-3 flex items-end gap-3 flex-wrap">
                      <div className="flex-1 min-w-[160px]">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Programar nova vazão parenteral (ml/h)</label>
                        <input
                          type="number"
                          value={novaVazaoParenteral}
                          onChange={e => setNovaVazaoParenteral(e.target.value)}
                          placeholder="ex: 30"
                          className="w-full p-2 border border-lime-300 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-lime-300 bg-white"
                        />
                      </div>
                      <button
                        onClick={() => { if (novaVazaoParenteral) { sugerirMetaNutri(`Ajustar vazão parenteral para ${novaVazaoParenteral} ml/h`, 'auto_ajustar_vazao_parenteral'); setNovaVazaoParenteral(''); } }}
                        disabled={!novaVazaoParenteral}
                        className="px-4 py-2 rounded-lg text-xs font-bold bg-lime-600 hover:bg-lime-700 text-white disabled:opacity-40 transition-colors"
                      >Programar vazão</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* BLOCO F — GLICEMIA DO DIA ANTERIOR */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
              <h5 className="font-bold text-sm text-slate-700 mb-3">🩸 Glicemia do dia anterior ({ontemBR})</h5>
              {hgtOntem.length === 0 ? (
                <p className="text-sm text-slate-400 italic">Nenhum registro de HGT no dia anterior.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {hgtOntem.map((g, i) => {
                    const num = safeNum(g.valor);
                    const anormal = num > 0 && (num < 70 || num > 180);
                    return (
                      <span key={i} className={`text-xs font-bold px-2 py-1 rounded-lg border ${anormal ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-200 text-slate-700'}`}>
                        {g.hora} — {g.valor} mg/dL {anormal && (num < 70 ? '⬇' : '⬆')}
                      </span>
                    );
                  })}
                </div>
              )}
              {/* Alteração glicêmica → sugerir Controle glicêmico */}
              {temAlteracaoGlicemica && (
                <div className="mt-3 p-3 bg-white border border-amber-300 rounded-lg">
                  <p className="text-xs font-bold text-amber-800 mb-2">
                    ⚠️ Registro de hipo ou hiperglicemia no dia anterior — considerar controle glicêmico
                  </p>
                  <button
                    onClick={() => sugerirMetaNutri('Controle glicêmico', 'auto_controle_glicemico')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${metaAtiva('auto_controle_glicemico') ? 'bg-amber-600 text-white border border-amber-600' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}
                  >{metaAtiva('auto_controle_glicemico') ? '✓ Meta: Controle glicêmico' : '✓ Controle glicêmico'}</button>
                </div>
              )}
            </div>

            {/* BLOCO G — INSULINAS (janela 07h ontem → 06h hoje) */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
              <h5 className="font-bold text-sm text-slate-700 mb-3">💉 Insulinas Aplicadas (07h ontem → 06h hoje)</h5>
              {insulinasJanela.length === 0 ? (
                <p className="text-sm text-slate-400 italic">Nenhuma insulina registrada na janela.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {insulinasJanela.map((ins, i) => (
                    <span key={i} className="text-xs font-bold bg-white border border-slate-200 text-slate-700 px-2 py-1 rounded-lg">
                      {ins.horario} — {ins.tipo} {ins.dose} UI
                    </span>
                  ))}
                </div>
              )}
            </div>

            <CampoTexto label="Observações" valor={visita.nutricionista.observacoes} onChange={v => updateDeep('nutricionista', ['observacoes'], v)} />
          </>
        )}

        {/* ============ TÉCNICO EM ENFERMAGEM (NOVO) ============ */}
        {categoriaAtiva === 'tecnicoEnfermagem' && (
          <>
            <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Técnico em Enfermagem</h4>

            {/* BLOCO A — SSVV do dia anterior */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
              <h5 className="font-bold text-sm text-slate-700 mb-3">🩺 SSVV do dia anterior</h5>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                <LinhaInfo rotulo="Temperatura" valor={analise.resumo.tempStatus} />
                <LinhaInfo rotulo="SpO2" valor={analise.resumo.spo2Status} />
                <LinhaInfo rotulo="FC" valor={analise.resumo.fcStatus} />
                <LinhaInfo rotulo="PA" valor={analise.resumo.paStatus} />
                <LinhaInfo rotulo="FR" valor={analise.resumo.frStatus || '—'} />
              </div>
              {analise.resumo.epHipertensao > 0 && (
                <p className="mt-3 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  🎯 Hipertensão detectada — meta sugerida: <b>Controle pressório</b> (aguardando confirmação médica)
                </p>
              )}
            </div>

            {/* BLOCO B — Diurese */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
              <h5 className="font-bold text-sm text-slate-700 mb-3">💧 Diurese</h5>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                <LinhaInfo rotulo="Total diurese 24h (dia anterior)" valor={`${analise.totalDiurese24h} ml`} />
                <LinhaInfo rotulo="Diurese Últimas 12h" valor={`${analise.diurese12h} ml/kg/h`} destaque={analise.diureseBaixa} />
              </div>
              {analise.diureseBaixa && (
                <p className="mt-3 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  🎯 Diurese &lt; 0,5 ml/kg/h — meta sugerida: <b>Estimular diurese</b> (aguardando confirmação médica)
                </p>
              )}
            </div>

            {/* BLOCO C — Eliminações */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
              <h5 className="font-bold text-sm text-slate-700 mb-3">🚻 Eliminações</h5>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                <LinhaInfo rotulo="Últ. evacuação" valor={analise.evacResult} destaque={analise.isConstipado} />
                <LinhaInfo rotulo="Diarreia" valor={analise.diarreiaText || 'Não registrada'} />
                <LinhaInfo rotulo="Vômitos" valor={analise.vomitoText || 'Não registrados'} />
              </div>
              {analise.isConstipado && (
                <p className="mt-3 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  🎯 Sem evacuar há mais de 2 dias — meta sugerida: <b>Medidas laxativas</b> (aguardando confirmação médica)
                </p>
              )}
              {analise.diarreiaText && (
                <p className="mt-2 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  🎯 Diarreia presente — meta sugerida: <b>Medidas constipantes</b> (aguardando confirmação médica)
                </p>
              )}
              {analise.vomitoText && (
                <p className="mt-2 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  🎯 Vômitos presentes — meta sugerida: <b>Estimular esvaziamento gástrico</b> (aguardando confirmação médica)
                </p>
              )}

              {/* Retorno por SNE/SNG */}
              <div className="mt-3 flex items-center gap-3">
                <span className="text-sm font-bold text-slate-600">Retorno por SNE/SNG?</span>
                <button
                  onClick={() => { updateDeep('tecnicoEnfermagem', ['retornoSNE'], 'S'); sugerirMeta('Estimular esvaziamento gástrico', 'auto_retorno_sne'); }}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${visita.tecnicoEnfermagem.retornoSNE === 'S' ? 'bg-teal-600 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'}`}
                >Sim</button>
                <button
                  onClick={() => updateDeep('tecnicoEnfermagem', ['retornoSNE'], 'N')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${visita.tecnicoEnfermagem.retornoSNE === 'N' ? 'bg-slate-600 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'}`}
                >Não</button>
              </div>
              {visita.tecnicoEnfermagem.retornoSNE === 'S' && (
                <p className="mt-2 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  🎯 Retorno por SNE/SNG presente — meta sugerida: <b>Estimular esvaziamento gástrico</b> (aguardando confirmação médica)
                </p>
              )}
            </div>

            {/* BLOCO D — Perguntas-lembrete */}
            <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-white">
              <h5 className="font-bold text-sm text-slate-500 mb-2">💡 Lembretes do plantão</h5>
              <ul className="space-y-1 text-sm text-slate-600">
                <li>• Parou dieta enteral? <b>Qual o motivo?</b></li>
                <li>• O paciente possui drenos? <b>Onde? Qual o débito?</b></li>
                <li>• <b>Realizou HD ontem?</b></li>
              </ul>
            </div>

            <CampoTexto label="Observações" valor={visita.tecnicoEnfermagem.observacoes} onChange={v => updateDeep('tecnicoEnfermagem', ['observacoes'], v)} />
          </>
        )}
      </div>

      {/* ================================================================ */}
      {/* PAINEL METAS DO DIA — VISÍVEL EM TODAS AS ABAS                  */}
      {/* ================================================================ */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider">
            🎯 Metas do Dia ({metasAtivas.length} em aberto)
          </h4>
        </div>

        {/* METAS DE ONTEM (canceladas + não cumpridas) */}
        {metasOntem.length > 0 && (
          <div className="mb-4 bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Metas de Ontem ({ontemBR})</p>
            {cumpridasOntem.length > 0 && <p className="text-xs text-green-700 font-semibold mb-1">✓ Cumpridas: {cumpridasOntem.length}</p>}
            {naoCumpridasOntem.map(m => (
              <div key={m.id} className="flex items-start gap-2 py-1">
                <span className="text-red-600 font-bold text-sm">✗</span>
                <div className="text-sm">
                  <span className="font-semibold text-slate-700">{m.descricao}</span>
                  <span className="text-red-600 font-bold text-xs ml-2">NÃO CUMPRIDA</span>
                </div>
              </div>
            ))}
            {canceladasOntem.map(m => (
              <div key={m.id} className="py-1">
                <div className="flex items-start gap-2">
                  <span className="text-red-600 font-bold text-sm">✗</span>
                  <div className="text-sm">
                    <span className="font-semibold text-slate-700 line-through">{m.descricao}</span>
                    <span className="text-red-600 font-bold text-xs ml-2">CANCELADA</span>
                    <p className="text-xs text-slate-500 italic">Justificativa: {m.justificativaCancelamento}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ADICIONAR META (todos podem) */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Adicionar meta</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={novaMeta.descricao}
              onChange={e => setNovaMeta({ ...novaMeta, descricao: e.target.value })}
              placeholder="Descreva a meta (ex: manter SVD, RX tórax controle...)"
              className="flex-1 p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-300"
            />
            <button
              onClick={() => { adicionarMetaManual('', novaMeta.descricao); setNovaMeta({ ...novaMeta, descricao: '' }); }}
              disabled={!novaMeta.descricao.trim()}
              className="px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm disabled:opacity-50 transition-colors"
            >
              + Adicionar
            </button>
          </div>
        </div>

        {/* LISTA DE METAS */}
        {metas.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Nenhuma meta para hoje.</p>
        ) : (
          <div className="space-y-2">
            {metas.map(m => (
              <div key={m.id} className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <BadgeStatusMeta status={m.status} />
                  <span className="text-sm font-semibold text-slate-700">{m.descricao}</span>
                  {m.status === 'aguardando' && <span className="text-[10px] text-amber-600 italic">sugerida automaticamente</span>}
                  {m.status === 'cancelado' && (
                    <span className="text-xs text-slate-500 italic w-full">Justificativa: {m.justificativaCancelamento}</span>
                  )}
                  {m.status === 'realizado' && m.marcadoPor && (
                    <span className="text-[10px] text-slate-400">por {m.marcadoPor}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {m.status === 'aguardando' && podeConfirmarMeta(m) && (
                    <>
                      <button onClick={() => confirmarMeta(m.id)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">✓ Confirmar</button>
                      <button onClick={() => {
                        if ((m.origem || '').startsWith('auto_')) {
                          rejeitarMeta(m.id, '');
                        } else {
                          setModalCancelamento({ id: m.id, justificativa: '', acao: 'rejeitar', exigeJustificativa: true });
                        }
                      }} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors">✗ Rejeitar</button>
                    </>
                  )}
                  {m.status === 'pendente' && (
                    <>
                      <button onClick={() => marcarRealizado(m.id)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors">✓ Marcar realizado</button>
                      <button onClick={() => setModalCancelamento({ id: m.id, justificativa: '', acao: 'cancelar', exigeJustificativa: true })} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors">✗ Cancelar</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE CANCELAR / REJEITAR COM JUSTIFICATIVA */}
      {modalCancelamento && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-lg text-slate-800 mb-4">
              {modalCancelamento.acao === 'rejeitar' ? 'Rejeitar Meta Sugerida' : 'Cancelar Meta'}
            </h3>
            <textarea
              value={modalCancelamento.justificativa}
              onChange={e => setModalCancelamento({ ...modalCancelamento, justificativa: e.target.value })}
              placeholder={modalCancelamento.acao === 'rejeitar' ? 'Motivo da rejeição (obrigatório)...' : 'Justificativa do cancelamento (obrigatória)...'}
              className="w-full p-3 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-300 mb-4"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setModalCancelamento(null)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 font-bold text-sm">Voltar</button>
              <button
                onClick={() => {
                  if (modalCancelamento.acao === 'rejeitar') rejeitarMeta(modalCancelamento.id, modalCancelamento.justificativa);
                  else cancelarMeta(modalCancelamento.id, modalCancelamento.justificativa);
                  setModalCancelamento(null);
                }}
                disabled={modalCancelamento.exigeJustificativa && !modalCancelamento.justificativa.trim()}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-sm disabled:opacity-50"
              >
                {modalCancelamento.acao === 'rejeitar' ? 'Confirmar Rejeição' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================
const CampoTexto = ({ label, valor, onChange }) => (
  <div>
    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">{label}</label>
    <textarea
      value={valor || ''}
      onChange={e => onChange(e.target.value)}
      className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-300"
      rows={2}
    />
  </div>
);

const ToggleRow = ({ label, valor, onChange }) => (
  <label className="flex items-center gap-3 cursor-pointer bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
    <input type="checkbox" checked={!!valor} onChange={e => onChange(e.target.checked)} className="w-4 h-4 accent-teal-600" />
    <span className="text-sm font-semibold text-slate-700">{label}</span>
  </label>
);

const LinhaInfo = ({ rotulo, valor, destaque }) => (
  <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-1.5">
    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{rotulo}</span>
    <span className={`text-sm font-bold ${destaque ? 'text-red-600' : 'text-slate-700'}`}>{valor}</span>
  </div>
);

const BadgeStatusMeta = ({ status }) => {
  const cores = {
    aguardando: 'bg-amber-100 text-amber-700',
    pendente: 'bg-blue-100 text-blue-700',
    realizado: 'bg-green-100 text-green-700',
    cancelado: 'bg-red-100 text-red-700'
  };
  const labels = {
    aguardando: 'Aguardando confirmação',
    pendente: 'Pendente',
    realizado: 'Realizado',
    cancelado: 'Cancelado'
  };
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cores[status] || cores.pendente}`}>{labels[status] || status}</span>;
};

const ChecklistCard = ({ titulo, descricao, itens, valores, onToggle, cor }) => {
  const cores = {
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    violet: 'border-violet-200 bg-violet-50 text-violet-800',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-800'
  };
  return (
    <div className={`border rounded-xl p-4 ${cores[cor] || cores.cyan}`}>
      <h5 className="font-bold text-sm mb-0.5">{titulo}</h5>
      {descricao && <p className="text-xs opacity-80 mb-3">{descricao}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {itens.map(item => (
          <label key={item.id} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!(valores && valores[item.id])}
              onChange={e => onToggle(item.id, e.target.checked)}
              className="w-4 h-4 accent-teal-600"
            />
            <span className="text-sm">{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default VisitaMultiTab;