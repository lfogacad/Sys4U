import React, { useState, useEffect, useRef } from 'react';
import { getTempoVMText } from '../../utils/core';
import { CONSISTENCIA_ALIMENTAR } from '../../constants/clinicalLists';

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
  gerenteEnfermagem: { recursos: '', padronizacoes: '', observacoes: '' },
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
  coordenadorFisioterapia: { indicadores: '', observacoes: '' },
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
const TIPOS_INDICACAO = ['SVD', 'CVC', 'Dieta/SNG', 'Cultura', 'Raio-X', 'Profilaxia TVP', 'Profilaxia úlcera', 'Outro'];
const CATEGORIAS = [
  { id: 'medicoRotina', label: 'Médico RT', cor: 'teal' },
  { id: 'medicoPlantonista', label: 'Médico Plantão', cor: 'blue' },
  { id: 'enfermeiroPlantonista', label: 'Enfermagem', cor: 'emerald' },
  { id: 'gerenteEnfermagem', label: 'Ger. Enfermagem', cor: 'green' },
  { id: 'fisioterapeutaPlantonista', label: 'Fisioterapia', cor: 'violet' },
  { id: 'coordenadorFisioterapia', label: 'Coord. Fisio', cor: 'purple' },
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
const VisitaMultiTab = ({ currentPatient, save, calculateDiurese12hMlKgH }) => {
  const hoje = new Date();
  const dataISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  const ontem = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
  const ontemISO = `${ontem.getFullYear()}-${String(ontem.getMonth() + 1).padStart(2, '0')}-${String(ontem.getDate()).padStart(2, '0')}`;
  const fmtBR = (iso) => { const [a, m, d] = String(iso).split('-'); return `${d}-${m}-${a}`; };
  const dataBR = fmtBR(dataISO);
  const ontemBR = fmtBR(ontemISO);

  // começa no Técnico para facilitar o teste — troque para 'medicoRotina' se preferir
  const [categoriaAtiva, setCategoriaAtiva] = useState('tecnicoEnfermagem');
  const [modalCancelamento, setModalCancelamento] = useState(null); // { id, justificativa, acao: 'cancelar' | 'rejeitar' }
  const [novaMeta, setNovaMeta] = useState({ tipo: 'SVD', descricao: '' });
  const jaGeradasRef = useRef(false);

  const [mobilizacaoSelecionada, setMobilizacaoSelecionada] = useState([]);

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

  // Nutri: controla quais metas já foram sugeridas (para o botão mudar de cor)
  const [metasSugeridas, setMetasSugeridas] = useState([]);
  // Nutri: campo digitável da vazão
  const [novaVazao, setNovaVazao] = useState('');
  // Nutri: características selecionadas para montar uma única meta
  const [caracteristicasSelecionadas, setCaracteristicasSelecionadas] = useState([]);
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
      const nova = { ...prev, metas: novasMetas };
      salvarVisita(nova);
      return nova;
    });
  };

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
      m.id === id ? { ...m, status: 'pendente', confirmadoPor: categoriaAtiva, dataConfirmacao: dataISO } : m
    ));
  };

  const rejeitarMeta = (id, justificativa) => {
    atualizarMetas(lista => lista.map(m =>
      m.id === id ? {
        ...m, status: 'cancelado', dataCancelamento: dataISO, canceladoPor: categoriaAtiva,
        justificativaCancelamento: justificativa ? `Rejeitada: ${justificativa}` : 'Rejeitada pela equipe médica'
      } : m
    ));
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
  // Médicos confirmam qualquer meta automática
  if (categoriaAtiva === 'medicoRotina' || categoriaAtiva === 'medicoPlantonista') return true;
  // Nutri confirma APENAS as metas geradas na própria aba
  if (categoriaAtiva === 'nutricionista') {
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
            <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Médico da Rotina / RT</h4>
            {metasAguardando.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-sm font-semibold">
                ⚠️ {metasAguardando.length} meta(s) automática(s) aguardando confirmação médica — role até o painel "Metas do Dia" abaixo.
              </div>
            )}
            <CampoTexto label="Plano Terapêutico" valor={visita.medicoRotina.planoTerapeutico} onChange={v => updateDeep('medicoRotina', ['planoTerapeutico'], v)} />
            <CampoTexto label="Sedação / Analgesia" valor={visita.medicoRotina.sedacaoAnalgesia} onChange={v => updateDeep('medicoRotina', ['sedacaoAnalgesia'], v)} />
            <CampoTexto label="Antibiótico" valor={visita.medicoRotina.antibiotico} onChange={v => updateDeep('medicoRotina', ['antibiotico'], v)} />
            <CampoTexto label="Desmame Ventilatório" valor={visita.medicoRotina.desmameVentilatorio} onChange={v => updateDeep('medicoRotina', ['desmameVentilatorio'], v)} />
            <CampoTexto label="Diretivas" valor={visita.medicoRotina.diretivas} onChange={v => updateDeep('medicoRotina', ['diretivas'], v)} />

            <ChecklistCard titulo="Profilaxia de TVP" descricao="Indicada se ≥1 fator de risco E nenhuma contraindicação" itens={CRITERIOS_TVP} valores={visita.medicoRotina.profilaxias.tvp.fatoresRisco} onToggle={(id, v) => updateDeep('medicoRotina', ['profilaxias', 'tvp', 'fatoresRisco', id], v)} cor="cyan" />
            <ChecklistCard titulo="Contraindicações à profilaxia de TVP" itens={CONTRA_TVP} valores={visita.medicoRotina.profilaxias.tvp.contraindicacoes} onToggle={(id, v) => updateDeep('medicoRotina', ['profilaxias', 'tvp', 'contraindicacoes', id], v)} cor="rose" />
            <div className="grid grid-cols-2 gap-3">
              <CampoTexto label="Tipo (farmacológica/mecânica)" valor={visita.medicoRotina.profilaxias.tvp.tipo} onChange={v => updateDeep('medicoRotina', ['profilaxias', 'tvp', 'tipo'], v)} />
              <CampoTexto label="Fármaco (ex: Enoxaparina 40mg)" valor={visita.medicoRotina.profilaxias.tvp.farmaco} onChange={v => updateDeep('medicoRotina', ['profilaxias', 'tvp', 'farmaco'], v)} />
            </div>

            <ChecklistCard titulo="Profilaxia de Úlcera de Estresse" descricao="Indicada se ≥1 fator de risco" itens={CRITERIOS_ULCERA} valores={visita.medicoRotina.profilaxias.ulceraEstresse.fatoresRisco} onToggle={(id, v) => updateDeep('medicoRotina', ['profilaxias', 'ulceraEstresse', 'fatoresRisco', id], v)} cor="amber" />
            <CampoTexto label="Fármaco (ex: Omeprazol 40mg)" valor={visita.medicoRotina.profilaxias.ulceraEstresse.farmaco} onChange={v => updateDeep('medicoRotina', ['profilaxias', 'ulceraEstresse', 'farmaco'], v)} />

            <ChecklistCard titulo="TOT — Critérios para Despertar (SAT)" descricao="Se todos ok → sugere pausar sedação e testar despertar" itens={CRITERIOS_DESPERTAR} valores={visita.medicoRotina.tot.criteriosDespertar} onToggle={(id, v) => updateDeep('medicoRotina', ['tot', 'criteriosDespertar', id], v)} cor="violet" />
            <CampoTexto label="SAT realizado? (motivo se não)" valor={visita.medicoRotina.tot.criteriosDespertar.motivoNao} onChange={v => updateDeep('medicoRotina', ['tot', 'criteriosDespertar', 'motivoNao'], v)} />
            <CampoTexto label="Conduta do TOT" valor={visita.medicoRotina.tot.conduta} onChange={v => updateDeep('medicoRotina', ['tot', 'conduta'], v)} />

            <CampoTexto label="Observações" valor={visita.medicoRotina.observacoes} onChange={v => updateDeep('medicoRotina', ['observacoes'], v)} />
          </>
        )}

        {/* ============ MÉDICO PLANTONISTA ============ */}
        {categoriaAtiva === 'medicoPlantonista' && (
          <>
            <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Médico Plantonista</h4>
            {metasAguardando.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-sm font-semibold">
                ⚠️ {metasAguardando.length} meta(s) automática(s) aguardando confirmação médica — role até o painel "Metas do Dia" abaixo.
              </div>
            )}
            <CampoTexto label="Evolução do Plantão" valor={visita.medicoPlantonista.evolucaoPlantao} onChange={v => updateDeep('medicoPlantonista', ['evolucaoPlantao'], v)} />
            <CampoTexto label="Intercorrências 24h" valor={visita.medicoPlantonista.intercorrencias24h} onChange={v => updateDeep('medicoPlantonista', ['intercorrencias24h'], v)} />
            <CampoTexto label="Condutas do Plantão" valor={visita.medicoPlantonista.condutasPlantao} onChange={v => updateDeep('medicoPlantonista', ['condutasPlantao'], v)} />
            <CampoTexto label="Observações" valor={visita.medicoPlantonista.observacoes} onChange={v => updateDeep('medicoPlantonista', ['observacoes'], v)} />
          </>
        )}

        {/* ============ ENFERMEIRO PLANTONISTA ============ */}
        {categoriaAtiva === 'enfermeiroPlantonista' && (
          <>
            <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Enfermeiro Plantonista</h4>
            <div className="grid grid-cols-2 gap-3">
              <CampoTexto label="Balanço Hídrico (ml)" valor={visita.enfermeiroPlantonista.balancoHidrico} onChange={v => updateDeep('enfermeiroPlantonista', ['balancoHidrico'], v)} />
              <CampoTexto label="Braden" valor={visita.enfermeiroPlantonista.escalas.braden} onChange={v => updateDeep('enfermeiroPlantonista', ['escalas', 'braden'], v)} />
              <CampoTexto label="Morse" valor={visita.enfermeiroPlantonista.escalas.morse} onChange={v => updateDeep('enfermeiroPlantonista', ['escalas', 'morse'], v)} />
            </div>
            <ToggleRow label="Higiene oral realizada 3x/dia" valor={visita.enfermeiroPlantonista.higieneOral.realizada3x} onChange={v => updateDeep('enfermeiroPlantonista', ['higieneOral', 'realizada3x'], v)} />
            <ToggleRow label="SVD presente / manter" valor={visita.enfermeiroPlantonista.dispositivos.svd.indicacaoManter} onChange={v => updateDeep('enfermeiroPlantonista', ['dispositivos', 'svd', 'indicacaoManter'], v)} />
            <CampoTexto label="Curativos" valor={visita.enfermeiroPlantonista.curativos} onChange={v => updateDeep('enfermeiroPlantonista', ['curativos'], v)} />
            <CampoTexto label="Observações" valor={visita.enfermeiroPlantonista.observacoes} onChange={v => updateDeep('enfermeiroPlantonista', ['observacoes'], v)} />
          </>
        )}

        {/* ============ GERENTE DE ENFERMAGEM ============ */}
        {categoriaAtiva === 'gerenteEnfermagem' && (
          <>
            <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Gerente de Enfermagem</h4>
            <CampoTexto label="Recursos" valor={visita.gerenteEnfermagem.recursos} onChange={v => updateDeep('gerenteEnfermagem', ['recursos'], v)} />
            <CampoTexto label="Padronizações" valor={visita.gerenteEnfermagem.padronizacoes} onChange={v => updateDeep('gerenteEnfermagem', ['padronizacoes'], v)} />
            <CampoTexto label="Observações" valor={visita.gerenteEnfermagem.observacoes} onChange={v => updateDeep('gerenteEnfermagem', ['observacoes'], v)} />
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

        {/* ============ COORDENADOR DA FISIOTERAPIA ============ */}
        {categoriaAtiva === 'coordenadorFisioterapia' && (
          <>
            <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Coordenador da Fisioterapia</h4>
            <CampoTexto label="Indicadores" valor={visita.coordenadorFisioterapia.indicadores} onChange={v => updateDeep('coordenadorFisioterapia', ['indicadores'], v)} />
            <CampoTexto label="Observações" valor={visita.coordenadorFisioterapia.observacoes} onChange={v => updateDeep('coordenadorFisioterapia', ['observacoes'], v)} />
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

            {/* BLOCO B — CONSISTÊNCIA / CARACTERÍSTICAS / NOME */}
            <div className="border border-lime-200 rounded-xl p-4 bg-lime-50">
              <h5 className="font-bold text-sm text-lime-800 mb-3">🥣 Consistência / Características / Nome</h5>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                <LinhaInfo rotulo="Consistência (Fono)" valor={currentPatient?.fono?.consistencia || '—'} />
                <LinhaInfo rotulo="Nome (se enteral)" valor={currentPatient?.nutri?.tipoDietaEnteral || '—'} />
              </div>
              <p className="text-xs font-bold text-slate-500 mt-2 mb-1">Características atuais:</p>
              <div className="flex flex-wrap gap-1.5">
                {(currentPatient?.nutri?.caracteristicasDieta || []).length === 0
                  ? <span className="text-sm text-slate-400 italic">Nenhuma</span>
                  : (currentPatient?.nutri?.caracteristicasDieta || []).map(c => (
                      <span key={c} className="text-xs font-bold bg-white border border-lime-300 text-lime-700 px-2 py-0.5 rounded-lg">{c}</span>
                    ))}
              </div>
              <div className="mt-3 border-t border-lime-200 pt-3">
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
              </div>
            </div>

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
            <select
              value={novaMeta.tipo}
              onChange={e => setNovaMeta({ ...novaMeta, tipo: e.target.value })}
              className="p-2.5 border border-slate-300 rounded-lg bg-white text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-teal-300 sm:w-44"
            >
              {TIPOS_INDICACAO.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              type="text"
              value={novaMeta.descricao}
              onChange={e => setNovaMeta({ ...novaMeta, descricao: e.target.value })}
              placeholder="Descreva a meta (ex: manter SVD, RX tórax controle...)"
              className="flex-1 p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-300"
            />
            <button
              onClick={() => { adicionarMetaManual(novaMeta.tipo, novaMeta.descricao); setNovaMeta({ tipo: novaMeta.tipo, descricao: '' }); }}
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
                      <button onClick={() => setModalCancelamento({ id: m.id, justificativa: '', acao: 'rejeitar', exigeJustificativa: !(m.origem || '').startsWith('auto_') })} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors">✗ Rejeitar</button>
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