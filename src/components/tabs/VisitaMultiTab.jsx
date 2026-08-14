import React, { useState, useEffect, useRef } from 'react';

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

// ⚠️ AJUSTE AQUI: nome do(s) campo(s) de sexo do paciente no seu Firestore
// (ex: "sexo", "genero"...). Usado apenas para concordância de gênero
// nas frases de SSVV (eucárdica/eucárdico, hipotensa/hipotenso...).
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
    desmame: '', mobilizacaoPrecoce: '', observacoes: ''
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

  const [visita, setVisita] = useState(() => {
    const existente = currentPatient?.visita?.[dataISO];
    const base = criarVisitaVazia();
    return existente ? { ...base, ...existente, metas: existente.metas || base.metas } : base;
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

  // ---------- METAS COMPARTILHADAS ----------
  const metas = visita.metas || [];
  const metasAguardando = metas.filter(m => m.status === 'aguardando');
  const metasAtivas = metas.filter(m => m.status === 'aguardando' || m.status === 'pendente');
  const metasOntem = currentPatient?.visita?.[ontemISO]?.metas || [];
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

  const podeConfirmarMedico = categoriaAtiva === 'medicoRotina' || categoriaAtiva === 'medicoPlantonista';

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
            <ChecklistCard titulo="TOT — Critérios para TRE" descricao="Se todos ok → sugere tentativa de TRE" itens={CRITERIOS_TRE} valores={visita.medicoRotina.tot.tre} onToggle={(id, v) => updateDeep('medicoRotina', ['tot', 'tre', id], v)} cor="indigo" />
            <CampoTexto label="TRE realizado? (motivo se não)" valor={visita.medicoRotina.tot.tre.motivoNao} onChange={v => updateDeep('medicoRotina', ['tot', 'tre', 'motivoNao'], v)} />
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
            <div className="grid grid-cols-3 gap-3">
              <CampoTexto label="Modo VM" valor={visita.fisioterapeutaPlantonista.ventilacaoMecanica.modo} onChange={v => updateDeep('fisioterapeutaPlantonista', ['ventilacaoMecanica', 'modo'], v)} />
              <CampoTexto label="FiO2 (%)" valor={visita.fisioterapeutaPlantonista.ventilacaoMecanica.fio2} onChange={v => updateDeep('fisioterapeutaPlantonista', ['ventilacaoMecanica', 'fio2'], v)} />
              <CampoTexto label="PEEP" valor={visita.fisioterapeutaPlantonista.ventilacaoMecanica.peep} onChange={v => updateDeep('fisioterapeutaPlantonista', ['ventilacaoMecanica', 'peep'], v)} />
            </div>
            <CampoTexto label="Desmame" valor={visita.fisioterapeutaPlantonista.desmame} onChange={v => updateDeep('fisioterapeutaPlantonista', ['desmame'], v)} />
            <CampoTexto label="Mobilização Precoce" valor={visita.fisioterapeutaPlantonista.mobilizacaoPrecoce} onChange={v => updateDeep('fisioterapeutaPlantonista', ['mobilizacaoPrecoce'], v)} />
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
            <div className="grid grid-cols-2 gap-3">
              <CampoTexto label="Via de Acesso" valor={visita.nutricionista.viaAcesso} onChange={v => updateDeep('nutricionista', ['viaAcesso'], v)} />
              <CampoTexto label="Meta Calórica (kcal)" valor={visita.nutricionista.metaCalorica} onChange={v => updateDeep('nutricionista', ['metaCalorica'], v)} />
              <CampoTexto label="Meta Proteica (g)" valor={visita.nutricionista.metaProteica} onChange={v => updateDeep('nutricionista', ['metaProteica'], v)} />
              <CampoTexto label="Suplementação" valor={visita.nutricionista.suplementacao} onChange={v => updateDeep('nutricionista', ['suplementacao'], v)} />
            </div>
            <CampoTexto label="Dieta" valor={visita.nutricionista.dieta} onChange={v => updateDeep('nutricionista', ['dieta'], v)} />
            <CampoTexto label="Reavaliação" valor={visita.nutricionista.reavaliacao} onChange={v => updateDeep('nutricionista', ['reavaliacao'], v)} />
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
                  {m.status === 'aguardando' && podeConfirmarMedico && (
                    <>
                      <button onClick={() => confirmarMeta(m.id)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">✓ Confirmar</button>
                      <button onClick={() => setModalCancelamento({ id: m.id, justificativa: '', acao: 'rejeitar' })} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors">✗ Rejeitar</button>
                    </>
                  )}
                  {m.status === 'pendente' && (
                    <>
                      <button onClick={() => marcarRealizado(m.id)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors">✓ Marcar realizado</button>
                      <button onClick={() => setModalCancelamento({ id: m.id, justificativa: '', acao: 'cancelar' })} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors">✗ Cancelar</button>
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
                disabled={!modalCancelamento.justificativa.trim()}
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