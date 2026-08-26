import { EXAM_ROWS, BH_HOURS } from "../constants/clinicalLists";

// Chaves de API da Inteligência Artificial
const apiKeyMed = import.meta.env.VITE_GEMINI_API_KEY_MED;
const apiKeyEnf = import.meta.env.VITE_GEMINI_API_KEY_ENF;
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

export const safeNumber = (val) => {
  if (val === null || val === undefined || val === "") return 0;
  let str = String(val).trim();
  if (str.includes('.') && str.includes(',')) str = str.replace(/\./g, '');
  else if (str.includes('.') && !str.includes(',')) {
    const parts = str.split('.');
    if (parts[parts.length - 1].length === 3) str = str.replace(/\./g, '');
  }
  const cleaned = str.replace(",", ".").replace(/[^\d.-]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

export const getManausDateStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// ===== CHAVE CONTÍNUA DE HORÁRIO REAL (NORA — horário corrido) =====
// Converte (data do plantão, hora da grade 07h–06h) → chave real contínua "YYYY-MM-DDTHH:00".
// Madrugada (00h–06h) pertence ao dia real seguinte: grade 26/08 às 04h = "2026-08-27T04:00".
export const getHoraRealKey = (dataPlantao, hora) => {
  if (!dataPlantao || !hora) return null;
  const horaNum = parseInt(hora.split(":")[0], 10);
  const d = new Date(`${dataPlantao}T12:00:00`); // meio-dia local evita bug de fuso
  if (horaNum < 7) d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}T${hora}`;
};

export const parseLocalDate = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
};

export const subtractDays = (s, days) => {
  if (!s) return "";
  const d = parseLocalDate(s);
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const formatDateDDMM = (s) => {
  if (!s) return "...";
  const [y, m, d] = s.split("-");
  return `${d}/${m}`;
};

export const calculateAge = (d) => {
  if (!d) return "";
  const b = parseLocalDate(d);
  const t = parseLocalDate(getManausDateStr());
  let a = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
  return a;
};

export const calculateDaysDiff = (s, isD1) => {
  if (!s) return "-";
  const st = parseLocalDate(s);
  const td = parseLocalDate(getManausDateStr());
  const df = td - st;
  let d = Math.floor(df / 86400000);
  if (isD1) d += 1;
  if (d < 0) return "Err";
  if (!isD1 && d === 0) return "D0";
  return `D${d}`;
};

export const getDaysD0 = (d) => calculateDaysDiff(d, false);
export const getDaysD1 = (d) => calculateDaysDiff(d, true);

export const calculateNoraDose = (patient, mlHour) => {
  if (!patient) return null;

  // 1. FUNÇÃO CAÇADORA DE PESO (Com as gavetas corretas)
  const buscarPesoValido = () => {
    const tentativas = [
      patient.nutri?.peso,              // 1º Peso Atual (Balança)
      patient.nutri?.pesoRealAdmissao,  // 2º Peso Admissão Nutri
      patient.nutri?.pesoPredito,       // 3º Peso Predito (Aba Fisio, mas salva na Nutri)
      patient.physio?.peso,             // 4º Plano B Fisio
      patient.admissoes?.peso,          // 5º Plano B Admissão
      patient.medical?.peso             // 6º Plano B Médico
    ];

    for (let p of tentativas) {
      if (p) {
        // Limpa a vírgula do texto e transforma em matemática pura
        const n = parseFloat(String(p).replace(',', '.'));
        if (!isNaN(n) && n > 0) return n;
      }
    }
    return 0; // Não achou nenhum peso válido
  };

  const peso = buscarPesoValido();
  const rate = parseFloat(String(mlHour || 0).replace(',', '.'));
  const doubleDose = patient.sofa_data_technical?.noraDoubleDoseToday || false;
  const concentration = doubleDose ? 128 : 64; // µg/mL

  // Só calcula se tiver infusão (>0) e se tiver peso (>0)
  if (rate > 0 && peso > 0) {
    const doseMcgKgMin = ((rate * concentration) / 60) / peso;
    return doseMcgKgMin.toFixed(3);
  }
  
  return null;
};

export const normalizeName = (n) =>
  n ? n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim() : "";

export const formatExamName = (n) => {
  if (n === "Bilirrubina Total") return "Bil. T";
  if (n === "Bilirrubina Direta") return "Bil. D";
  if (n === "Bilirrubina Indireta") return "Bil. I";
  return n;
};

export const getPendingText = (p) => {
  if (!p?.checklist) return "...";
  const items = { f: "Dieta", a: "Analgesia", s: "Sedação", t: "TVP", h: "Cabeceira", u: "Gástrica", g: "Glicemia" };
  const pend = Object.entries(p.checklist).filter(([_, v]) => v === false).map(([k]) => items[k]);
  return pend.length === 0
    ? Object.values(p.checklist).every((v) => v === true) ? "✅ Completo" : "⚠️ Incompleto"
    : `🔴 ${pend.join(" • ")}`;
};

export const renderValue = (val) => {
  if (Array.isArray(val)) return val.join(", ");
  if (val === null || val === undefined) return "";
  return val;
};

export const getPrimeiroExameSAPS = (patient, keyFull, keyShort) => {
  const dataAdmissao = patient.dataInternacao;
  if (dataAdmissao && patient.examHistory?.[dataAdmissao]?.[keyFull]) return safeNumber(patient.examHistory[dataAdmissao][keyFull]);
  const datasHistorico = Object.keys(patient.examHistory || {}).sort();
  for (let data of datasHistorico) {
    if (data >= dataAdmissao && patient.examHistory[data][keyFull]) return safeNumber(patient.examHistory[data][keyFull]);
  }
  if (patient.labs?.dayBefore?.[keyShort]) return safeNumber(patient.labs.dayBefore[keyShort]);
  if (patient.labs?.yesterday?.[keyShort]) return safeNumber(patient.labs.yesterday[keyShort]);
  if (patient.labs?.today?.[keyShort]) return safeNumber(patient.labs.today[keyShort]);
  return 0;
};

export const getPrimeiraGasometriaSAPS = (patient, param) => {
  const colunasGaso = Object.keys(patient.gasometriaHistory || {}).sort();
  for (let col of colunasGaso) {
    if (patient.gasometriaHistory[col][param]) return safeNumber(patient.gasometriaHistory[col][param]);
  }
  return null;
};

export const calculateGlasgowTotal = (p) => {
  if (!p.neuro) return 0;
  const getVal = (s) => parseInt(s?.split(" ")[0]) || 0;
  const ao = getVal(p.neuro.glasgowAO);
  const rv = p.neuro.glasgowRV?.startsWith("T") ? 1 : getVal(p.neuro.glasgowRV);
  const rm = getVal(p.neuro.glasgowRM);
  return ao + rv + rm;
};

// ===== CÁLCULOS ANTROPOMÉTRICOS E NRS 2002 =====
export const safeNum = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

export const calcularIdade = (dataNasc) => {
  if (!dataNasc) return null;
  const [a, m, d] = String(dataNasc).split('-').map(Number);
  if (!a || !m || !d) return null;
  const nasc = new Date(a, m - 1, d);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const mAtual = hoje.getMonth() - nasc.getMonth();
  if (mAtual < 0 || (mAtual === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade >= 0 ? idade : null;
};

export const AMPUTACAO_PESO = { mao: 0.007, antebraco: 0.016, braco: 0.05, pe: 0.015, perna_abaixo_joelho: 0.059, perna_inteira: 0.16 };
export const AMPUTACAO_ESTATURA = { mao: 0.01, antebraco: 0.03, braco: 0.06, pe: 0.018, perna_abaixo_joelho: 0.05, perna_inteira: 0.10 };

export const NRS_INICIAL = [
  { id: 'imc', label: 'IMC < 18,5?' },
  { id: 'perda_peso', label: 'Perda de peso não intencional nos últimos 3 meses?' },
  { id: 'ingesta', label: 'Redução da ingesta alimentar na última semana?' },
  { id: 'doenca_grave', label: 'Paciente gravemente enfermo (ex.: UTI)?' }
];
export const NRS_ESTADO_NUTRICIONAL = [
  { id: 'normal', label: 'Normal', pontos: 0 },
  { id: 'leve', label: 'Leve (perda 5% em 3 meses, ingesta 50–75%)', pontos: 1 },
  { id: 'moderado', label: 'Moderado (perda 5% em 2 meses, IMC 18,5–20,5, ingesta 25–50%)', pontos: 2 },
  { id: 'grave', label: 'Grave (perda >5% em 1 mês, IMC <18,5, ingesta 0–25%)', pontos: 3 }
];
export const NRS_GRAVIDADE = [
  { id: 'ausente', label: 'Ausente', pontos: 0 },
  { id: 'leve', label: 'Leve (ex.: fratura, cirurgia eletiva)', pontos: 1 },
  { id: 'moderada', label: 'Moderada (ex.: pneumonia, cirurgia abdominal)', pontos: 2 },
  { id: 'grave', label: 'Grave (ex.: UTI, ventilação mecânica)', pontos: 3 }
];

// Calcula todos os valores derivados a partir dos dados de entrada + dados do paciente
export const calcularNutricaoDerivada = (entrada, paciente) => {
  const sexoPaciente = String(paciente?.sexo || '').toUpperCase();
  const isFem = sexoPaciente === 'F' || sexoPaciente === 'FEM' || sexoPaciente === 'FEMININO';
  const idadePaciente = calcularIdade(paciente?.dataNascimento);

  // Estatura — Chumlea (1985)
  const alturaJoelho = safeNum(entrada.alturaJoelho);
  const estaturaEstimada = (alturaJoelho > 0 && idadePaciente !== null)
    ? (isFem ? 84.88 - (0.24 * idadePaciente) + (1.83 * alturaJoelho)
             : 64.19 - (0.04 * idadePaciente) + (2.02 * alturaJoelho))
    : null;

  // Peso estimado — Chumlea (1988): AJ + CB
  const circBraco = safeNum(entrada.circBraco);
  const pesoEstimado = (alturaJoelho > 0 && circBraco > 0)
    ? (isFem
        ? (1.86 * alturaJoelho) + (2.37 * circBraco) - 65.51
        : (2.02 * alturaJoelho) + (2.68 * circBraco) - 78.56)
    : null;

  // Correção por amputação
  const AMPUTACOES_MEMBRO_INFERIOR = ['pe', 'perna_abaixo_joelho', 'perna_inteira'];
  const amputacoes = entrada.amputacoes || [];
  const fatorPeso = amputacoes.reduce((s, a) => s + (AMPUTACAO_PESO[a] || 0), 0);
  const fatorEstatura = amputacoes
    .filter(a => AMPUTACOES_MEMBRO_INFERIOR.includes(a))
    .reduce((s, a) => s + (AMPUTACAO_ESTATURA[a] || 0), 0);
  const pesoCorrigido = pesoEstimado !== null ? pesoEstimado * (1 - fatorPeso) : null;
  const estaturaCorrigida = estaturaEstimada !== null ? estaturaEstimada * (1 - fatorEstatura) : null;

  // NRS 2002
  const nrsInicial = entrada.nrsInicial || [];
  const nrsInicialSim = NRS_INICIAL.some(q => nrsInicial.includes(q.id));
  const nrsEstadoPontos = NRS_ESTADO_NUTRICIONAL.find(e => e.id === entrada.nrsEstado)?.pontos || 0;
  const nrsGravidadePontos = NRS_GRAVIDADE.find(g => g.id === entrada.nrsGravidade)?.pontos || 0;
  const nrsIdadePontos = (idadePaciente !== null && idadePaciente >= 70) ? 1 : 0;
  const nrsEscore = nrsInicialSim ? (nrsEstadoPontos + nrsGravidadePontos + nrsIdadePontos) : 0;
  const nrsRisco = nrsEscore >= 3;
  const nrsClassificacao = !nrsInicialSim
    ? 'Sem risco aparente — reavaliar em 7 dias'
    : (nrsRisco ? 'Risco nutricional — iniciar suporte nutricional' : 'Sem risco nutricional — reavaliar semanalmente');
  
  // ===== AVALIAÇÃO ANTROPOMÉTRICA DO BRAÇO (PCT + CMB + AMB) =====
  const circBracoCm = safeNum(entrada.circBraco);
  const pctMm = safeNum(entrada.pct);
  const idx = indiceFaixaReferencia(idadePaciente);
  const sexoRef = isFem ? 'M' : 'H';
  const pctRef = PCT_REF[sexoRef][idx];
  const cmbRef = CMB_REF[sexoRef][idx];
  const ambRef = AMB_REF[sexoRef][idx];

  const cmb = (circBracoCm > 0 && pctMm > 0) ? circBracoCm - (Math.PI * pctMm / 10) : null;
  const amb = (cmb !== null) ? (cmb * cmb) / (4 * Math.PI) : null;

  const adequacaoPCT = (pctMm > 0 && pctRef > 0) ? (pctMm / pctRef) * 100 : null;
  const adequacaoCMB = (cmb !== null && cmbRef > 0) ? (cmb / cmbRef) * 100 : null;
  const adequacaoAMB = (amb !== null && ambRef > 0) ? (amb / ambRef) * 100 : null;

  const classificacaoPCT = classificarAdequacao(adequacaoPCT);
  const classificacaoCMB = classificarAdequacao(adequacaoCMB);
  const classificacaoAMB = classificarAdequacao(adequacaoAMB);

  // IMC (prioriza a altura digitada no campo Altura; senão usa a estatura estimada/corrigida)
  const pesoUsado = safeNum(entrada.peso) > 0 ? safeNum(entrada.peso) : (pesoCorrigido || null);
  const alturaDigitada = safeNum(entrada.altura);
  const estaturaUsada = alturaDigitada > 0 ? alturaDigitada : (estaturaCorrigida || estaturaEstimada);
  const imc = (pesoUsado && estaturaUsada) ? pesoUsado / Math.pow(estaturaUsada / 100, 2) : null;
  const classificacaoIMC = classificarIMC(imc, idadePaciente);

  // ===== RASTREIO DE SARCOPENIA — EWGSOP2 (2019) =====
  // CP < 31 cm = screening positivo (baixa massa muscular)
  const circPanturrilha = safeNum(entrada.circPanturrilha);
  const sarcopeniaRisco = circPanturrilha > 0 ? circPanturrilha < 31 : null;
  const classificacaoSarcopenia = sarcopeniaRisco === null
    ? null
    : (sarcopeniaRisco
        ? 'Risco de sarcopenia — CP < 31 cm'
        : 'Sem risco aparente de sarcopenia — CP ≥ 31 cm');

  return {
    idadePaciente, isFem, estaturaEstimada, estaturaCorrigida,
    pesoEstimado, pesoCorrigido, nrsEscore, nrsRisco, nrsClassificacao,
    fatorPeso, fatorEstatura, pctMm, sarcopeniaRisco, classificacaoSarcopenia,
    cmb, amb, adequacaoPCT, adequacaoCMB, adequacaoAMB,
    classificacaoPCT, classificacaoCMB, classificacaoAMB,
    imc, classificacaoIMC
  };
};

// ===== REFERÊNCIAS ANTROPOMÉTRICAS DO BRAÇO (Frisancho, 1981 — percentil 50) =====
// Faixas: [18-24.9, 25-34.9, 35-44.9, 45-54.9, 55-64.9, 65-74.9]
export const PCT_REF = { H: [12, 12, 12, 11, 11, 11], M: [16, 18, 20, 22, 23, 23] };
export const CMB_REF = { H: [27.1, 28.4, 29.2, 28.9, 28.3, 27.3], M: [22.0, 22.7, 23.7, 24.7, 25.2, 25.2] };
export const AMB_REF = { H: [58.4, 64.2, 67.8, 66.4, 63.7, 59.3], M: [38.5, 41.0, 44.7, 48.5, 50.5, 50.4] };

// Índice da faixa etária de referência (0 a 5)
export const indiceFaixaReferencia = (idade) => {
  if (idade === null || idade === undefined) return 0;
  if (idade < 25) return 0;
  if (idade < 35) return 1;
  if (idade < 45) return 2;
  if (idade < 55) return 3;
  if (idade < 65) return 4;
  return 5;
};

// Classificação por adequação (Blackburn & Thornton, 1979)
export const classificarAdequacao = (percent) => {
  if (percent === null || percent === undefined) return null;
  if (percent < 70) return 'Desnutrição grave';
  if (percent < 80) return 'Desnutrição moderada';
  if (percent < 90) return 'Desnutrição leve';
  if (percent <= 110) return 'Eutrofia';
  if (percent <= 120) return 'Sobrepeso';
  return 'Obesidade';
};

// Classificação do IMC por idade (OMS adulto / Lipschitz idoso)
export const classificarIMC = (imc, idade) => {
  if (imc === null || imc === undefined) return null;
  if (idade !== null && idade >= 60) {
    if (imc < 22) return 'Baixo peso';
    if (imc <= 27) return 'Eutrofia';
    return 'Sobrepeso/Obesidade';
  }
  if (imc < 18.5) return 'Baixo peso';
  if (imc < 25) return 'Eutrofia';
  if (imc < 30) return 'Sobrepeso';
  return 'Obesidade';
};

// ===== METAS NUTRICIONAIS AUTOMÁTICAS =====
export const FATOR_CALORICO_POR_CLASSIFICACAO = {
  'Baixo peso': 30,          // desnutrido
  'Eutrofia': 25,            // não obeso
  'Sobrepeso': 25,           // não obeso
  'Obesidade': 20,           // obeso
  'Sobrepeso/Obesidade': 20  // obeso (idoso, Lipschitz)
};

export const calcularMetasNutricionais = (peso, classificacaoIMC, aumentarPeso) => {
  const pesoNum = safeNum(peso);
  if (pesoNum <= 0 || !classificacaoIMC) {
    return { metaProteicaTotal: null, metaCaloricaTotal: null, fatorCalorico: null };
  }
  const fatorCalorico = FATOR_CALORICO_POR_CLASSIFICACAO[classificacaoIMC] || 25;
  const metaProteicaTotal = pesoNum * 0.8;
  let metaCaloricaTotal = pesoNum * fatorCalorico;
  if (aumentarPeso) metaCaloricaTotal *= 1.25;
  return { metaProteicaTotal, metaCaloricaTotal, fatorCalorico };
};

export const limparHDMedica = (e) => {
  if (e) e.preventDefault();
  if (!window.confirm("ATENÇÃO: Deseja apagar toda a Prescrição Médica e a Evolução da Nefrologia?")) return;

  // Faz a cópia oficial igual ao Balanço Hídrico
  const up = [...patients];
  const p = { ...up[activeTab] };

  // Zera a prescrição com o objeto padrão vazio
  p.hd_prescricao = {
    duracao: "", temperatura: "", uf: "", anticoagulacao: "", priming: "",
    sodio: "", fluxo_sangue: "", fluxo_dialisato: "", dialisador: "", obs: "",
    nefro: "", tec_nefro: "", plant_m: "", plant_t: "", plant_n: ""
  };

  // Zera só a evolução do médico
  if (!p.hd_anotacoes) p.hd_anotacoes = {};
  p.hd_anotacoes.nefro_texto = "";

  // Atualiza a tela e SALVA NO FIREBASE (A Mágica!)
  up[activeTab] = p;
  setPatients(up);
  save(p); 
};

export const limparHDTecnico = (e) => {
  if (e) e.preventDefault();
  if (!window.confirm("ATENÇÃO: Deseja apagar todos os Controles, Balanço, Acessos e Insumos da enfermagem?")) return;

  // Faz a cópia oficial igual ao Balanço Hídrico
  const up = [...patients];
  const p = { ...up[activeTab] };

  // Zera tudo do técnico usando os objetos padrões vazios
  p.hd_monitoramento = {};
  p.hd_balanco = { entradas: "", final: "" };
  p.hd_acesso = {
    fav_local: "", fremito: "", puncao: "", cateter_tipo: "", cateter_local: "",
    insercao: "", previo: "", fluxo: "", curativo: [], intercorrencias: ""
  };
  p.hd_insumos = {};

  // Mantém o texto do médico, mas limpa as anotações do técnico
  if (!p.hd_anotacoes) p.hd_anotacoes = {};
  p.hd_anotacoes.inicio = "";
  p.hd_anotacoes.termino = "";
  p.hd_anotacoes.texto = "";
  p.hd_anotacoes.tecnico = "";

  // Atualiza a tela e SALVA NO FIREBASE (A Mágica!)
  up[activeTab] = p;
  setPatients(up);
  save(p);
};

export const getMissingSAPS3 = (patient) => {
  const missing = [];
  const s3 = patient.saps3 || {};

  if (!calculateAge(patient.dataNascimento)) missing.push("Idade (Admissão)");
  if (!s3.diasHospital) missing.push("Dias Pré-UTI (Admissão)");
  if (!s3.origemMapped) missing.push("Origem (Admissão)");
  if (!s3.motivoAdmissao) missing.push("Tipo Admissão (Admissão)");
  if (!s3.sistemaRazao) missing.push("Sistema/Razão (Admissão)");
  if (!s3.infeccaoAdmissao) missing.push("Infecção Prévia (Admissão)");

  const isSedatedMissing = patient.neuro?.sedacao === true || (patient.neuro?.rass && patient.neuro.rass !== "" && patient.neuro.rass !== "NT");
  if (isSedatedMissing) {
    const getValM = (s) => parseInt(s?.split(" ")[0]) || 0;
    const basalTotalM = getValM(patient.neuro?.glasgowBasalAO) + (patient.neuro?.glasgowBasalRV?.startsWith("T") ? 1 : getValM(patient.neuro?.glasgowBasalRV)) + getValM(patient.neuro?.glasgowBasalRM);
    if (basalTotalM === 0 && calculateGlasgowTotal(patient) === 0) missing.push("Glasgow Basal (Pré-Sedação)");
  } else {
    if (calculateGlasgowTotal(patient) === 0) missing.push("Glasgow Atual");
  }

  let hasVitals = false;
  if (patient.bh?.vitals) {
    Object.values(patient.bh.vitals).forEach(v => {
      if (safeNumber(v["FC (bpm)"]) > 0 || safeNumber(v["PAS"]) > 0 || safeNumber(v["Temp (ºC)"]) > 0) hasVitals = true;
    });
  }
  if (!hasVitals) missing.push("Sinais Vitais (Balanço)");

  if (getPrimeiroExameSAPS(patient, "Bilirrubina Total", "") === 0) missing.push("Bilirrubina (Exames)");
  if (getPrimeiroExameSAPS(patient, "Creatinina", "creat") === 0) missing.push("Creatinina (Exames)");
  if (getPrimeiroExameSAPS(patient, "Leucócitos", "leuco") === 0) missing.push("Leucócitos (Exames)");
  if (getPrimeiroExameSAPS(patient, "Plaquetas", "plaq") === 0) missing.push("Plaquetas (Exames)");

  if (getPrimeiraGasometriaSAPS(patient, "pH") === null) missing.push("pH (Gasometria)");
  if (getPrimeiraGasometriaSAPS(patient, "P/F") === null) missing.push("P/F (Gasometria)");

  return missing;
};

export const calculateSAPS3Score = (patient) => {
  if (!patient.nome) return { score: 0, prob: "---", details: [] };
  
  if (patient.saps3?.isLocked) {
    return {
      score: patient.saps3.lockedScore,
      prob: patient.saps3.lockedProb,
      details: patient.saps3.lockedDetails || []
    };
  }

  let score = 0;
  let details = [];
  const s3 = patient.saps3 || {};

  // 1. IDADE
  const age = calculateAge(patient.dataNascimento) || 0;
  if (age >= 80) { score += 18; details.push(`Idade ${age} anos: +18`); }
  else if (age >= 70) { score += 13; details.push(`Idade ${age} anos: +13`); }
  else if (age >= 60) { score += 9; details.push(`Idade ${age} anos: +9`); }
  else if (age >= 40) { score += 5; details.push(`Idade ${age} anos: +5`); }

  // 2. COMORBIDADES
  const comorb = s3.comorbidades || [];
  if (comorb.includes("Câncer Sólido")) { score += 10; details.push("Câncer Sólido: +10"); }
  if (comorb.includes("Hemato-onco")) { score += 12; details.push("Hemato-onco: +12"); }
  if (comorb.includes("Cirrose")) { score += 10; details.push("Cirrose: +10"); }
  if (comorb.includes("AIDS")) { score += 12; details.push("AIDS: +12"); }
  if (comorb.includes("IC NYHA IV")) { score += 10; details.push("IC NYHA IV: +10"); }
  if (s3.imunossupressao) { score += 3; details.push("Imunossupressão: +3"); }

  // 3. TEMPO DE HOSPITALIZAÇÃO PRÉ-UTI
  if (s3.diasHospital === "≥28 dias") { score += 7; details.push("Internação pré-UTI ≥ 28 dias: +7"); }
  else if (s3.diasHospital === "14 a 27 dias") { score += 6; details.push("Internação pré-UTI 14-27 dias: +6"); }

  // 4. ORIGEM E TIPO DE ADMISSÃO
  if (s3.origemMapped === "Enfermarias") { score += 6; details.push("Origem (Enfermaria): +6"); }
  else if (s3.origemMapped === "Recuperação Pós-Anestésica") { score += 2; details.push("Origem (RPA): +2"); }

  if (s3.motivoAdmissao === "Cirúrgica Eletiva") { score -= 2; details.push("Admissão Cirúrgica Eletiva: -2"); }
  else if (s3.motivoAdmissao === "Cirúrgica de Urgência") { score += 2; details.push("Admissão Cirúrgica Urgência: +2"); }
  if (s3.cirurgiaUrgente) { score += 5; details.push("Cirurgia Urgente: +5"); }

  if (s3.infeccaoAdmissao === "Sim") {
    score += 5; details.push("Infecção Presente: +5");
    if (s3.sitioInfeccao === "Respiratório") { score += 6; details.push("Sítio Infeccioso (Respiratório): +6"); }
    else if (s3.sitioInfeccao === "Outros focos") { score += 3; details.push("Sítio Infeccioso (Outro): +3"); }
  }

  // 5. RAZÃO DA ADMISSÃO (SISTEMA)
  const razao = s3.sistemaRazao || "";
  if (razao === "Gastrointestinal / Digestivo") { score += 12; details.push("Razão (Gastro/Digestivo): +12"); }
  else if (razao === "Cardiovascular" || razao === "Respiratório") { score += 10; details.push(`Razão (${razao}): +10`); }
  else if (razao === "Geniturinário / Renal") { score += 8; details.push("Razão (Renal): +8"); }
  else if (razao === "Neurológico") { score += 7; details.push("Razão (Neurológico): +7"); }
  else if (razao === "Hematológico") { score += 6; details.push("Razão (Hematológico): +6"); }
  else if (razao === "Trauma (Não-Neurológico)" || razao === "Outros / Diversos") { score += 5; details.push(`Razão (${razao}): +5`); }
  else if (razao === "Metabólico / Endócrino") { score += 4; details.push("Razão (Metabólico/Endócrino): +4"); }

  // 6. GLASGOW (CONSIDERANDO SEDAÇÃO)
  const isSedated = patient.neuro?.sedacao === true || (patient.neuro?.rass && patient.neuro.rass !== "" && patient.neuro.rass !== "NT");
  let glasgow = 0;
  let tipoGlasgow = "Glasgow Atual"; // Rótulo padrão

  if (isSedated) {
    const getVal = (s) => parseInt(s?.split(" ")[0]) || 0;
    const ao = getVal(patient.neuro?.glasgowBasalAO);
    const rv = patient.neuro?.glasgowBasalRV?.startsWith("T") ? 1 : getVal(patient.neuro?.glasgowBasalRV);
    const rm = getVal(patient.neuro?.glasgowBasalRM);
    const basalTotal = ao + rv + rm;
    
    if (basalTotal > 0) {
        glasgow = basalTotal;
        tipoGlasgow = "Glasgow Basal (Sedado)"; // Muda o rótulo se achou o basal
    } else {
        glasgow = calculateGlasgowTotal(patient);
    }
  } else {
    glasgow = calculateGlasgowTotal(patient);
  }

  // Faz a pontuação e anota em uma linha única e clara!
  if (glasgow > 0) {
    if (glasgow <= 6) { score += 15; details.push(`${tipoGlasgow} (${glasgow}): +15`); }
    else if (glasgow <= 12) { score += 7; details.push(`${tipoGlasgow} (${glasgow}): +7`); }
    else if (glasgow <= 14) { score += 2; details.push(`${tipoGlasgow} (${glasgow}): +2`); }
    // Opcional: Se o Glasgow for 15, o SAPS 3 dá 0 pontos, mas o senhor pode querer ver que foi avaliado:
    else if (glasgow === 15) { details.push(`${tipoGlasgow} (15): +0`); }
  }

  // 7. EXAMES LABORATORIAIS (PRIMEIRA COLETA)
  const bil = getPrimeiroExameSAPS(patient, "Bilirrubina Total", "");
  if (bil >= 6.0) { score += 5; details.push(`Bilirrubina Total (≥ 6.0): +5`); }
  else if (bil >= 2.0) { score += 4; details.push(`Bilirrubina Total (2.0-5.9): +4`); }

  const creat = getPrimeiroExameSAPS(patient, "Creatinina", "creat");
  if (creat >= 3.5) { score += 8; details.push(`Creatinina (≥ 3.5): +8`); }
  else if (creat >= 2.0) { score += 7; details.push(`Creatinina (2.0-3.4): +7`); }
  else if (creat >= 1.2) { score += 2; details.push(`Creatinina (1.2-1.9): +2`); }

  const leuco = getPrimeiroExameSAPS(patient, "Leucócitos", "leuco");
  if (leuco > 0) {
    if (leuco < 4000) { score += 5; details.push(`Leucócitos (< 4.000): +5`); }
    else if (leuco >= 20000) { score += 3; details.push(`Leucócitos (≥ 20.000): +3`); }
  }

  const ph = getPrimeiraGasometriaSAPS(patient, "pH");
  if (ph !== null && ph > 0 && ph < 7.25) { score += 3; details.push(`pH Arterial (< 7.25): +3`); }

  const plaq = getPrimeiroExameSAPS(patient, "Plaquetas", "plaq");
  if (plaq > 0) {
    if (plaq < 50000) { score += 8; details.push(`Plaquetas (< 50.000): +8`); }
    else if (plaq < 100000) { score += 5; details.push(`Plaquetas (50.000-99.999): +5`); }
  }

  const pf = getPrimeiraGasometriaSAPS(patient, "P/F");
  if (pf !== null && pf > 0) {
    if (pf < 100) { score += 11; details.push(`PaO2/FiO2 (< 100): +11`); }
    else if (pf < 250) { score += 7; details.push(`PaO2/FiO2 (100-249): +7`); }
  }

  // 8. SINAIS VITAIS (PRIMEIRO REGISTRO DA ADMISSÃO / 1ª HORA)
  let fcInicial = 0;
  let pasInicial = 0;
  let tempInicial = 0;

  // Coleta todos os BHs (histórico + atual) e ordena do mais antigo para o mais recente
  // O BH de admissão é o MAIS ANTIGO
  const todosBHs = [
    ...(patient.historico_bh || []),
    patient.bh
  ].filter(bh => bh && bh.vitals && bh.date)
   .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  // Pega o BH mais antigo (admissão)
  const bhAdmissao = todosBHs[0];

  if (bhAdmissao?.vitals) {
    const horarios = Object.keys(bhAdmissao.vitals).sort();
    
    for (let h of horarios) {
      const v = bhAdmissao.vitals[h];
      const fc = safeNumber(v["FC (bpm)"]);
      const pas = safeNumber(v["PAS"]);
      const t = safeNumber(v["Temp (ºC)"]);
      
      if (fc > 0 && fcInicial === 0) fcInicial = fc;
      if (pas > 0 && pasInicial === 0) pasInicial = pas;
      if (t > 0 && tempInicial === 0) tempInicial = t;
      
      if (fcInicial > 0 && pasInicial > 0 && tempInicial > 0) break;
    }
  }

  // Pontuação FC Inicial
  if (fcInicial >= 160) { score += 7; details.push(`FC Inicial (${fcInicial}): +7`); }
  else if (fcInicial >= 120) { score += 5; details.push(`FC Inicial (${fcInicial}): +5`); }

  // Pontuação PAS Inicial
  if (pasInicial > 0) {
    if (pasInicial < 70) { score += 11; details.push(`PAS Inicial (${pasInicial}): +11`); }
    else if (pasInicial < 90) { score += 5; details.push(`PAS Inicial (${pasInicial}): +5`); }
    else if (pasInicial < 120) { score += 2; details.push(`PAS Inicial (${pasInicial}): +2`); }
  }

  // Pontuação Temperatura Inicial
  if (tempInicial > 0) {
    if (tempInicial < 35.0) { score += 5; details.push(`Temp. Inicial (< 35.0ºC): +5`); }
    else if (tempInicial >= 39.0) { score += 3; details.push(`Temp. Inicial (≥ 39.0ºC): +3`); } 
  }

  // 9. USO DE DROGAS VASOATIVAS (Vinculado exclusivamente ao Checkbox da Admissão)
  if (patient.cardio?.dva || patient.admissaoMedica?.dva) {
    score += 3;
    details.push(`Uso de Vasoativo na Admissão: +3`);
  }

  // 10. CÁLCULO DA PROBABILIDADE (LOGIT)
  const logit = -32.6659 + 7.3068 * Math.log(Math.max(score, 1) + 20.5958);
  const prob = ((Math.exp(logit) / (1 + Math.exp(logit))) * 100).toFixed(1);

  return { score, prob, details };
};

export const getTempoVMText = (p) => {
  if (!p.physio) return "-";
  const diasPrevios = p.physio.diasAcumuladosVM ? parseInt(p.physio.diasAcumuladosVM) : 0;
  if (!p.dataIntubacao) return diasPrevios > 0 ? `${diasPrevios} d (Prévios)` : "-";

  const start = parseLocalDate(p.dataIntubacao);
  let endStr = getManausDateStr();
  if (p.dataDecanulacao) endStr = p.dataDecanulacao;
  else if (p.dataExtubacao && !p.dataTQT) endStr = p.dataExtubacao;

  const end = parseLocalDate(endStr);
  const diff = Math.max(0, Math.floor((end - start) / 86400000));
  const tempoAtual = diff + 1;
  const tempoTotal = diasPrevios + tempoAtual;

  if (p.dataDecanulacao) return `${tempoTotal} d (Decanulado)`;
  if (p.dataTQT) return `${tempoTotal} d (TQT)`;
  if (p.dataExtubacao) return `${tempoTotal} d (Extubado)`;
  if (p.physio.suporte !== "VM") return `${tempoTotal} d (Pausado/Desmame)`;
  if (diasPrevios > 0) return `D${tempoTotal} (D${tempoAtual} da Reintubação)`;
  return `D${tempoTotal}`;
};

// Função exclusiva para o Painel Gestor: Devolve APENAS O NÚMERO de dias de VM
export const getTempoVMNumber = (p) => {
  if (!p.physio) return 0;
  const diasPrevios = p.physio.diasAcumuladosVM ? parseInt(p.physio.diasAcumuladosVM) : 0;
  if (!p.dataIntubacao) return diasPrevios; // Se não tem intubação atual, retorna os prévios

  const start = parseLocalDate(p.dataIntubacao);
  // Usa o dia de hoje, a menos que ele já tenha sido extubado/decanulado antes da alta
  let endStr = getManausDateStr(); 
  if (p.dataDecanulacao) endStr = p.dataDecanulacao;
  else if (p.dataExtubacao && !p.dataTQT) endStr = p.dataExtubacao;

  const end = parseLocalDate(endStr);
  const diff = Math.max(0, Math.floor((end - start) / 86400000));
  const tempoAtual = diff + 1;
  
  return diasPrevios + tempoAtual; // Retorna matemática pura! Ex: 10
};

export const calcularHDEntradas = (p) => {
  if (!p || !p.hd_monitoramento) return 0;
  let total = 0;
  Object.values(p.hd_monitoramento).forEach((hora) => {
    const sf = parseFloat(hora.sf?.toString().replace(",", ".")) || 0;
    const gh = parseFloat(hora.gh?.toString().replace(",", ".")) || 0;
    total += (sf + gh);
  });
  return total;
};

export const calcularHDBalancoFinal = (p) => {
  const entradas = calcularHDEntradas(p);
  const ufRealizada = parseFloat(p?.hd_balanco?.uf_realizada?.toString().replace(",", ".")) || 0;
  return entradas - ufRealizada; 
};

export const defaultPatient = (id) => ({
  id, leito: id + 1, nome: "", dataNascimento: "", sexo: "", procedencia: "",
  diagnostico: "", historiaClinica: "", comorbidades: "", dataInternacao: "",
  dataIntubacao: "", dataExtubacao: "", dataTQT: "", dataDecanulacao: "", peso: "",
  saps3: { origemMapped: "", diasHospital: "", vasopressorPre: false, motivoAdmissao: "", infeccaoAdmissao: "", comorbidades: [] },
  neuro: { glasgowAO: "", glasgowRV: "", glasgowRM: "", rass: "", sedacao: false, drogasSedacao: [] },
  cardio: { dva: false, drogasDVA: [] },
  physio: { suporte: "", parametro: "", fiO2: "", peep: "", totNumero: "", totRima: "", cuff: "", secrecao: false, secrecaoAspecto: "", secrecaoColoracao: "", secrecaoQtd: "", mobilizacao: [], mrcScore: "", icuMobilityScale: "", anotacoes: "", diasAcumuladosVM: 0, vmLastStart: "" },
  resp: { suporte: "", parametro: "" },
  
  // 👇 GAVETA DA NUTRIÇÃO TOTALMENTE ATUALIZADA 👇
  nutri: { 
    admitido: false, 
    peso: "", tipoMedicaoPeso: "", pesoPredito: "", altura: "", 
    via: "", tipoDieta: "", caracteristicasDieta: [], vazao: "", residuo: "", 
    aceitacao: "", sintomasTGI: [],
    metaCalTotal: "", metaCalDiaria: "", metaProtTotal: "",
    metaCalDiariaAtingida: false, metaCalTotalAtingida: false, metaProtAtingida: false, 
    atingidoAnotacoes: "", risco_nutricional: "", anotacoes: "" 
  },
  
  // 👇 GAVETA DA FONO COM A ÁGUA "AGUARDANDO AVALIAÇÃO" 👇
  fono: { consistencia: "", utensilioAgua: "", toleraAgua: "", nivel_consciencia: "", blue_dye: "", degluticao: "", voz: "", conduta: "", compreensao: "", expressao_oral: "", expressao_oral_detalhe: "", inapto_vo: [] },
  
  enfermagem: { dor: "", hemodialise: false, lesaoLocal: "", lesaoEstagio: "", curativoTipo: "", curativoData: "", avpLocal: "", avpData: "", cvcLocal: "", cvcData: "", svd: false, svdData: "", sneCm: "", sneData: "", drenoTipo: "", drenoAspecto: "", drenoDebito: "", precaucao: "", anotacoes: "", braden_percepcao: "", braden_umidade: "", braden_atividade: "", braden_mobilidade: "", braden_nutricao: "", braden_friccao: "", morse_historico: "", morse_diagnostico: "", morse_auxilio: "", morse_terapiaIV: "", morse_marcha: "", morse_estadoMental: "" },
  
  // A data de evacuação fica unificada aqui
  gastro: { dataUltimaEvacuacao: "" },
  
  antibiotics: [{ name: "", date: "" }, { name: "", date: "" }, { name: "", date: "" }],
  antibioticsHistory: [],
  labs: { today: { date: "" }, yesterday: { date: "" }, dayBefore: { date: "" } },
  examHistory: {}, gasometriaHistory: {}, customGasometriaCols: [], customExamRows: [],
  anotacoes: "",
  checklist: { f: null, a: null, s: null, t: null, h: null, u: null, g: null },
  bh: { date: getManausDateStr(), accumulated: 0, insensibleLoss: 0, irrigation: {}, gains: {}, losses: {}, vitals: {}, customGains: [], customLosses: [] },
  bh_previous: null,
  hd_prescricao: { duracao: "", temperatura: "", uf: "", anticoagulacao: "", priming: "", sodio: "", fluxo_sangue: "", fluxo_dialisato: "", dialisador: "", obs: "", nefro: "", tec_nefro: "", plant_m: "", plant_t: "", plant_n: "" },
  hd_monitoramento: {}, hd_balanco: { entradas: "", final: "" }, hd_acesso: { fav_local: "", fremito: "", puncao: "", cateter_tipo: "", cateter_local: "", insercao: "", previo: "", fluxo: "", curativo: [], intercorrencias: "" }, hd_anotacoes: { inicio: "", termino: "", texto: "", tecnico: "", nefro_texto: "" }, hd_insumos: {}
});

export const mergePatientData = (def, db) => {
  const m = { ...def, ...db };
  ["saps3", "neuro", "resp", "cardio", "renal", "gastro", "pele", "dispositivos", "seguranca", "fono", "bh", "physio", "nutri", "enfermagem"].forEach((k) => {
    const currentData = db[k] || {};
    if (k === "physio" && currentData.mobilizacao && typeof currentData.mobilizacao === "string") m[k] = { ...def[k] };
    else m[k] = { ...def[k], ...currentData };
  });
  if (m.nutri && m.nutri.pesoIdeal && !m.nutri.pesoPredito) m.nutri.pesoPredito = m.nutri.pesoIdeal;
  if (!m.examHistory) m.examHistory = {};
  if (!m.gasometriaHistory) m.gasometriaHistory = {};
  if (!m.customGasometriaCols) m.customGasometriaCols = [];
  if (!m.labs) m.labs = { today: {}, yesterday: {}, dayBefore: {} };
  if (!m.antibiotics || m.antibiotics.length < 3) m.antibiotics = def.antibiotics;
  if (!m.antibioticsHistory) m.antibioticsHistory = [];
  if (!m.hd_prescricao) m.hd_prescricao = def.hd_prescricao;
  if (!m.hd_monitoramento) m.hd_monitoramento = def.hd_monitoramento;
  if (!m.hd_balanco) m.hd_balanco = def.hd_balanco;
  if (!m.hd_acesso) m.hd_acesso = def.hd_acesso;
  if (!m.hd_anotacoes) m.hd_anotacoes = def.hd_anotacoes;
  if (!m.hd_insumos) m.hd_insumos = def.hd_insumos;
  return m;
};

export const syncLabsFromHistory = (patient) => {
  // Cópia profunda para evitar mutações acidentais
  const p = JSON.parse(JSON.stringify(patient));
  
  const mapFullToShort = { 
    "Hemoglobina": "hb", 
    "Leucócitos": "leuco", 
    "Ureia": "ureia", 
    "Creatinina": "creat", 
    "Na (Sódio)": "na", 
    "K (Potássio)": "k" 
  };
  
  // Pega as datas corretas usando a função global
  const today = getManausDateStr();
  const yest = subtractDays(today, 1);
  const dbef = subtractDays(today, 2);

  // Inicializa a estrutura base
  p.labs = { 
    today: { date: today }, 
    yesterday: { date: yest }, 
    dayBefore: { date: dbef } 
  };
  
  // Zera todos os campos para não herdar lixo
  ["today", "yesterday", "dayBefore"].forEach((per) => {
    Object.keys(mapFullToShort).forEach((k) => p.labs[per][mapFullToShort[k]] = "");
  });

  // Preenche com os dados do histórico
  const periods = [
    { k: "today", d: today }, 
    { k: "yesterday", d: yest }, 
    { k: "dayBefore", d: dbef }
  ];
  
  periods.forEach((per) => {
    if (p.examHistory && p.examHistory[per.d]) {
      Object.entries(mapFullToShort).forEach(([full, short]) => {
        const v = p.examHistory[per.d][full];
        if (v !== undefined && v !== null && v !== "") {
          p.labs[per.k][short] = v;
        }
      });
    }
  });
  
  return p;
};

export const ensureBHStructure = (p) => {
  const safeP = { ...p };
  const bh = safeP.bh || {};
  safeP.bh = {
    date: bh.date || getManausDateStr(), accumulated: bh.accumulated || 0, insensibleLoss: bh.insensibleLoss || 0,
    irrigation: bh.irrigation || {}, gains: bh.gains || {}, losses: bh.losses || {}, vitals: bh.vitals || {}, customGains: bh.customGains || [], customLosses: bh.customLosses || []
  };
  if (safeP.bh_previous === undefined) safeP.bh_previous = null;
  return safeP;
};

export const calculateTotals = (bh, peso = 0) => {
  if (!bh) return { totalGains: 0, totalLosses: 0, totalIrrigation: 0, dailyBalance: 0, accumulated: 0, insensible: 0 };
  
  let totalGains = 0; 
  let totalLosses = 0; 
  let totalIrrigation = 0;
  
  if (bh.irrigation) Object.values(bh.irrigation).forEach((v) => (totalIrrigation += safeNumber(v)));
  if (bh.gains) Object.values(bh.gains).forEach((h) => Object.values(h).forEach((v) => (totalGains += safeNumber(v))));
  if (bh.losses) Object.values(bh.losses).forEach((h) => Object.values(h).forEach((v) => (totalLosses += safeNumber(v))));
  
  const adjustedTotalLosses = totalLosses - totalIrrigation;
  
  // A MÁGICA DA PI
  let insensible = safeNumber(bh.insensibleLoss);
  const pesoNum = safeNumber(String(peso).replace(",", "."));
  
  if (insensible === 0 && pesoNum > 0) {
    insensible = Math.round(pesoNum * 12);
  }

  // 👇 O CONSERTO ESTÁ AQUI 👇
  // Somamos a Perda Insensível ao Total de Perdas antes de devolver para a tela!
  const finalTotalLosses = adjustedTotalLosses + insensible;
  // 👆 ======================= 👆

  const dailyBalance = totalGains - finalTotalLosses;
  const accumulated = safeNumber(bh.accumulated) + dailyBalance;
  
  return { 
    totalGains, 
    totalLosses: finalTotalLosses, // Agora a tela vai receber o valor com a PI somada!
    totalIrrigation, 
    dailyBalance, 
    accumulated,
    insensible // Devolvendo a PI calculada também, caso precise exibir
  };
};

export const calculateDiurese12hMlKgH = (patient) => {
  const weight = safeNumber(patient.nutri?.peso);
  if (!weight || weight <= 0) return "---";
  const safePatient = ensureBHStructure(patient);

  const bhAtual = safePatient.bh;
  // Busca o BH anterior: primeiro tenta bh_previous, depois o último item do historico_bh
  const historicoBH = patient.historico_bh || [];
  const bhPrev = safePatient.bh_previous || (historicoBH.length > 0 ? historicoBH[historicoBH.length - 1] : null);

  const currentHourStr = String(new Date().getHours()).padStart(2, "0") + ":00";
  let currentIndex = BH_HOURS.indexOf(currentHourStr);
  if (currentIndex === -1) currentIndex = 0;

  const currentHourNum = new Date().getHours();
  const HORA_VIRADA_BH = 7; // O BH vira às 07h

  let diureseBruta = 0;
  let crossedVirada = false;

  for (let i = 0; i < 12; i++) {
    let checkIndex = currentIndex - i;
    if (checkIndex < 0) checkIndex = BH_HOURS.length + checkIndex;

    const hourStr = BH_HOURS[checkIndex];
    const hourNumAtCheck = parseInt(hourStr.split(":")[0]);

    let targetBH = bhAtual;

    if (currentHourNum >= HORA_VIRADA_BH) {
      if (hourNumAtCheck < HORA_VIRADA_BH) crossedVirada = true;
      if (crossedVirada) targetBH = bhPrev;
    }

    if (targetBH) {
      if (targetBH.losses && targetBH.losses[hourStr]) {
        diureseBruta += safeNumber(targetBH.losses[hourStr]["Diurese"]);
      }
    }
  }

  const result = diureseBruta / weight / 12;
  return result.toFixed(1);
};

export const analyzeOliguriaForSOFA = (patient) => {
  // 1. Busca o peso com a mesma prioridade do SOFA
  const pesoNutri = patient.nutri?.peso;
  const pesoFisio = patient.physio?.pesoPredito || patient.physio?.peso;
  const pesoAdmissao = patient.admissoes?.peso || patient.medical?.peso || patient.peso;
  const weight = safeNumber(pesoNutri || pesoFisio || pesoAdmissao);

  // Se não tiver peso, devolve um aviso visual
  if (!weight || weight <= 0) {
    return { oliguria6h: false, oliguria12h: false, oliguria24h: false, anuria12h: false, ml6: 0, ml12: 0, ml24: 0, hasWeight: false };
  }

  const safePatient = ensureBHStructure(patient);

  // 2. Busca o BH anterior em historico_bh (onde a automação às 07h realmente salva)
  const bhAtual = safePatient.bh;
  const historicoBH = patient.historico_bh || [];
  const bhPrev = safePatient.bh_previous || (historicoBH.length > 0 ? historicoBH[historicoBH.length - 1] : null);

  const currentHourNum = new Date().getHours();
  let currentIndex = BH_HOURS.findIndex(h => h.startsWith(String(currentHourNum).padStart(2, '0')));
  if (currentIndex === -1) currentIndex = BH_HOURS.length - 1;

  const HORA_VIRADA_BH = 7; // O BH vira às 07h

  let diurese6 = 0, diurese12 = 0, diurese24 = 0;

  // 3. Varre as últimas 24 horas
  let crossedVirada = false;

  for (let i = 0; i < 24; i++) {
    let checkIndex = currentIndex - i;
    if (checkIndex < 0) checkIndex = BH_HOURS.length + checkIndex;

    const hourStr = BH_HOURS[checkIndex];
    const hourNumAtCheck = parseInt(hourStr.split(":")[0]);

    let targetBH = bhAtual;

    if (currentHourNum >= HORA_VIRADA_BH) {
      // BH já virou às 07h — ao cruzar para antes das 07h, tudo abaixo é bhPrev
      if (hourNumAtCheck < HORA_VIRADA_BH) crossedVirada = true;
      if (crossedVirada) targetBH = bhPrev;
    }

    if (targetBH) {
      const diureseHora = targetBH.losses?.[hourStr] ? safeNumber(targetBH.losses[hourStr]["Diurese"]) : 0;
      diurese24 += diureseHora;
      if (i < 12) diurese12 += diureseHora;
      if (i < 6) diurese6 += diureseHora;
    }
  }
  // 4. Calcula o ml/kg/h
  const mlKgH_6 = diurese6 / weight / 6;
  const mlKgH_12 = diurese12 / weight / 12;
  const mlKgH_24 = diurese24 / weight / 24;

  // 5. Devolve as bandeiras para o SOFA e os valores reais para a tela
  return {
    oliguria6h: mlKgH_6 < 0.5,
    oliguria12h: mlKgH_12 < 0.5,
    oliguria24h: mlKgH_24 < 0.3,
    anuria12h: diurese12 <= 0,
    ml6: mlKgH_6.toFixed(2),
    ml12: mlKgH_12.toFixed(2),
    ml24: mlKgH_24.toFixed(2),
    hasWeight: true
  };
};

export const calculateCreatinineClearance = (p) => {
  const age = calculateAge(p.dataNascimento);
  const weight = safeNumber(p.nutri?.peso);
  let creat = safeNumber(p.labs?.today?.creat);
  if (!creat || creat <= 0) creat = safeNumber(p.labs?.yesterday?.creat);
  if (!creat || creat <= 0) creat = safeNumber(p.labs?.dayBefore?.creat);
  if (!age || !weight || !creat || creat <= 0) return "---";
  if (!p.sexo) return "Falta Sexo";
  let crcl = ((140 - age) * weight) / (72 * creat);
  if (p.sexo === "F") crcl *= 0.85;
  return crcl.toFixed(1);
};

export const calculateEvacDays = (dateStr) => {
  if (!dateStr) return "-";
  const diff = calculateDaysDiff(dateStr, false);
  if (diff === "D0") return "Hoje";
  return diff.replace("D", "") + " dias";
};

export const calculatePesoPredito = (altura, sexo) => {
  const h = safeNumber(altura);
  if (h <= 0 || !sexo) return "";
  const hCm = h < 3 ? h * 100 : h;
  let predito = 0;
  if (sexo === "M") predito = 50 + 0.91 * (hCm - 152.4);
  else if (sexo === "F") predito = 45.5 + 0.91 * (hCm - 152.4);
  return predito > 0 ? predito.toFixed(1) : "";
};

export const extractTextFromPdf = async (file) => {
  try {
    // 1. Injeta o leitor de PDF no navegador automaticamente caso não exista
    if (typeof window.pdfjsLib === 'undefined') {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
        script.onload = () => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
          resolve();
        };
        script.onerror = () => reject(new Error("Falha ao carregar a biblioteca de leitura de PDF."));
        document.head.appendChild(script);
      });
    }

    // 2. Transforma o arquivo em dados binários
    const arrayBuffer = await file.arrayBuffer();
    
    // 3. Lê o PDF usando a biblioteca garantida
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    
    // 4. Extrai o texto página por página
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(" ");
      fullText += pageText + "\n";
    }
    
    return fullText;
  } catch (error) {
    console.error("Erro interno ao extrair PDF:", error);
    throw new Error("Não foi possível ler o arquivo PDF. Verifique se ele não está corrompido ou protegido por senha.");
  }
};

export const parseManual = (text) => {
  const res = {};
  const clean = text.replace(/[$~]/g, "").replace(/θ/g, "0");
  const dMatch = clean.match(/Data\s*Requisi(?:ção|cao)[\s.:]*(\d{2})[\/-](\d{2})[\/-](\d{4})/i);
  let date = getManausDateStr();
  if (dMatch) {
    const [_, d, m, y] = dMatch;
    date = `${y}-${m}-${d}`;
  }
  const nMatch = clean.match(/Nome(?:\s*do\s*Paciente)?\s*:\s*([A-Z\s]+)/i);
  const name = nMatch ? nMatch[1].trim() : "Paciente";
  EXAM_ROWS.forEach((ex) => {
    const k = ex.split("(")[0].trim();
    const r = new RegExp(`${k}.*?([0-9]{1,3}(?:\\.[0-9]{3})*(?:,[0-9]+)?)`, "i");
    const m = clean.match(r);
    if (m) res[ex] = m[1];
  });
  return { patientName: name, date, results: res };
};

export const analyzeTextWithGemini = async (text) => {
  const prompt = `
      Você é um assistente médico especializado na extração de dados de laudos laboratoriais.
      Sua tarefa é analisar o texto do laudo abaixo e extrair o nome do paciente, a data de liberação e os resultados.

      REGRAS CRÍTICAS DE SEGURANÇA:
      1. EXAMES NÃO REALIZADOS: Se um exame não constar no laudo atual, NÃO O INCLUA no JSON.
      2. EFEITO PAPAGAIO: JAMAIS invente valores ou preencha com dados de exemplo. Se não achar, omita a chave.
      3. HISTÓRICO: Capture EXCLUSIVAMENTE o resultado atual. Ignore colunas de exames anteriores ou valores de referência.
      4. NÃO REAGENTE: Se o resultado for "não reagente", "ausente" ou "amostra não reagente", use "ÑR".
      5. NÚMEROS: Extraia apenas o valor numérico final, mantendo a vírgula (ex: "12,5" ou "148").
      6. DHL: Frequentemente listado no laudo como "L.D.H. - DESIDROGENASE LÁCTICA". Capture o valor e use a chave "DHL".
      7. URINÁLISE/EAS: Ao ler a seção de Urinálise (Urina Tipo I), procure apenas a contagem de leucócitos (ou piócitos) e use a chave "EAS (Leuco/c)".

      CHAVES PERMITIDAS (use exatamente estes nomes se encontrar o exame):
      "Hemoglobina", "Hematócrito", "Leucócitos", "Basófilos", "Eosinófilos", "Bastões", "Segmentados", "Linfócitos", "Monócitos", "Plaquetas", "PCR", "Ureia", "Creatinina", "Na (Sódio)", "K (Potássio)", "TGO (AST)", "TGP (ALT)", "GamaGT", "Bilirrubina Total", "Bilirrubina Direta", "Bilirrubina Indireta", "Amilase", "Lipase", "Fosfatase Alcalina", "Troponina", "CPK Total", "CK-MB", "RNI", "TTPA", "Proteínas Totais", "Albumina", "Ácido úrico", "Ferritina", "DHL", "EAS (Leuco/c)", "HBV", "HCV", "HIV", "VDRL"
      
      TEXTO DO LAUDO: 
      """${text.substring(0, 50000)}"""
      
      RETORNE APENAS UM JSON VÁLIDO NO FORMATO ABAIXO:
      {
        "patientName": "Nome do Paciente",
        "date": "YYYY-MM-DD",
        "results": {
          "Chave Encontrada": "Valor Extraído"
        }
      }`;

  let lastErrorMsg = "Erro desconhecido";
  const modelsToTry = ["gemini-2.5-flash"];

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        // CORREÇÃO: Adicionada a leitura do .env (Vite/Vercel)
        const currentKey = apiKey || window.apiKey || import.meta.env.VITE_GEMINI_API_KEY || "";
        
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          }
        );
        const d = await r.json();

        if (d.error) {
          lastErrorMsg = d.error.message || JSON.stringify(d.error);
          if (d.error.code === 400 || d.error.code === 403) {
            lastErrorMsg = "Chave de API inválida ou ausente. Verifique o .env ou o Vercel.";
            break;
          }
          if (lastErrorMsg.includes("not found") || d.error.code === 404) break;
          
          // Pausa VIP adicionada
          await new Promise((res) => setTimeout(res, 500));
          continue;
        }

        if (!d.candidates || !d.candidates[0] || !d.candidates[0].content) {
          lastErrorMsg = "Resposta da IA veio vazia.";
          await new Promise((res) => setTimeout(res, 500));
          continue;
        }

        let rawText = d.candidates[0].content.parts[0].text;
        const startIdx = rawText.indexOf("{");
        const endIdx = rawText.lastIndexOf("}");
        
        if (startIdx !== -1 && endIdx !== -1) {
          rawText = rawText.substring(startIdx, endIdx + 1);
        }
        
        return JSON.parse(rawText);
      } catch (e) {
        lastErrorMsg = e.message || String(e);
        await new Promise((res) => setTimeout(res, 500));
      }
    }
    if (lastErrorMsg.includes("Chave de API")) break;
  }

  console.error("Fallback Manual Ativado. Erro final:", lastErrorMsg);
  const manual = typeof parseManual === 'function' ? parseManual(text) : { results: {} };
  manual.isFallback = true;
  manual.errorReason = lastErrorMsg;
  return manual;
};

export const getLast10Days = () => {
  const d = [];
  const t = getManausDateStr();
  for (let i = 0; i < 10; i++) d.push(subtractDays(t, i));
  return d;
};

// --- TRADUTOR DE MORTALIDADE SOFA-2 ---
export const getSOFAMortality = (score) => {
    if (score <= 1) return "Mínima";
    if (score >= 2 && score <= 6) return "< 10%";
    if (score >= 7 && score <= 9) return "15 - 20%";
    if (score >= 10 && score <= 12) return "40 - 50%";
    if (score >= 13 && score <= 14) return "50 - 60%";
    if (score >= 15) return "> 80%";
    return "N/A";
  };
  
// --- DETETIVE DO GLASGOW (AGORA SOMA AS FRAÇÕES) ---
export const getBestGlasgowForSOFA = (p) => {
  // Mini-motor para somar o Glasgow corretamente (inclusive reconhecendo o Tubo "T")
  const somarFraçoes = (ao, rvStr, rm) => {
    const valAO = parseInt(ao) || 0;
    const valRM = parseInt(rm) || 0;
    let valRV = parseInt(rvStr) || 0;
    
    // Se tiver 'T' ou '1 - T', a resposta verbal vale 1
    if (typeof rvStr === "string" && (rvStr.startsWith("T") || rvStr.startsWith("1 - T"))) {
      valRV = 1;
    }
    
    const total = valAO + valRM + valRV;
    return total > 0 ? total : null;
  };

  // 0. Verifica se está sedado (Checkbox do round ou RASS ativado)
  const isSedated = p.neuro?.sedacao || (p.neuro?.rass && !String(p.neuro?.rass).toLowerCase().includes("sedado"));

  // 1. Tenta montar o Glasgow atual do Round (Se NÃO estiver sedado)
  if (!isSedated) {
    const somaAtual = somarFraçoes(p.neuro?.glasgowAO, p.neuro?.glasgowRV, p.neuro?.glasgowRM);
    if (somaAtual) return { valor: somaAtual, origem: "Atual (Round)" };
    
    if (p.neuro?.glasgow) return { valor: safeNumber(p.neuro.glasgow), origem: "Atual" };
  }

  // 2. Se está sedado (ou não achou o atual), procura o Pré-Sedação do Round (A nossa gangorra)
  if (p.neuro?.glasgowPreSedacao) {
    return { valor: safeNumber(p.neuro?.glasgowPreSedacao), origem: "Pré-Sedação (Round)" };
  }
  
  // 3. Busca o Pré-Sedação da ADMISSÃO MÉDICA (Agora somando as frações basais!)
  const somaBasalAdmissao = somarFraçoes(p.admissionData?.ecg_basal_ao, p.admissionData?.ecg_basal_rv, p.admissionData?.ecg_basal_rm);
  if (somaBasalAdmissao) {
    return { valor: somaBasalAdmissao, origem: "Pré-Sedação (Admissão)" };
  }

  // 4. Busca o Glasgow normal da Admissão Médica (Somando as frações normais ecg_ao, rv, rm)
  const somaAdmissaoNormal = somarFraçoes(p.admissionData?.ecg_ao, p.admissionData?.ecg_rv, p.admissionData?.ecg_rm);
  if (somaAdmissaoNormal) {
    return { valor: somaAdmissaoNormal, origem: "Admissão" };
  }

  // Fallback de segurança para dados antigos (SAPS3 ou total antigo)
  const gcsAdmissaoAntigo = p.saps3?.glasgow || p.admissionData?.glasgow;
  if (gcsAdmissaoAntigo) {
    return { valor: safeNumber(gcsAdmissaoAntigo), origem: "Admissão (Antigo)" };
  }
  
  // 5. Histórico: Procura a última evolução em que não estava sedado
  if (p.history && Array.isArray(p.history)) {
    const lastAwake = p.history.slice().reverse().find(evo => !evo.neuro?.sedacao && (evo.neuro?.glasgow || evo.neuro?.glasgowAO));
    if (lastAwake) {
      const somaHistorico = somarFraçoes(lastAwake.neuro?.glasgowAO, lastAwake.neuro?.glasgowRV, lastAwake.neuro?.glasgowRM);
      const valorHistorico = somaHistorico || safeNumber(lastAwake.neuro?.glasgow);
      if (valorHistorico > 0) return { valor: valorHistorico, origem: "Histórico UTI" };
    }
  }
  
  // Se absolutamente nada for encontrado, assume 15 para não quebrar a calculadora
  return { valor: 15, origem: "Presumido" };
};

// --- MOTOR PRINCIPAL SOFA-2 (REVISADO E INTEGRADO) ---
export const getAutoSOFA2 = (p) => {
  let score = 0;
  if (!p.sofa_data_technical) p.sofa_data_technical = {};

  const buscarUltimoLab = (nomesPossiveis) => {
    const parseBr = (val) => {
      if (!val) return null;
      const clean = val.toString().trim().replace(',', '.');
      return clean === "" ? null : parseFloat(clean);
    };
    const nomes = Array.isArray(nomesPossiveis) ? nomesPossiveis : [nomesPossiveis];
    for (let nome of nomes) {
      const val = parseBr(p.labs?.today?.[nome]);
      if (val !== null && !isNaN(val)) return val;
    }
    const datas = Object.keys(p.examHistory || {}).sort().reverse();
    for (let d of datas) {
      for (let nome of nomes) {
        const val = parseBr(p.examHistory[d]?.[nome]);
        if (val !== null && !isNaN(val)) return val;
      }
    }
    return null;
  };

  const buscarUltimaPAM = () => {
    const horas = typeof BH_HOURS !== "undefined" ? BH_HOURS : ["07h","08h","09h","10h","11h","12h","13h","14h","15h","16h","17h","18h","19h","20h","21h","22h","23h","00h","01h","02h","03h","04h","05h","06h"];
    for (let h of horas.slice().reverse()) {
      const pam = p.bh?.vitals?.[h]?.["PAM"];
      if (pam) return parseFloat(pam.toString().replace(',', '.')); 
    }
    return null;
  };

  const buscarUltimoPF = () => {
    const colunas = Object.keys(p.gasometriaHistory || {}).reverse();
    for (let col of colunas) {
      const gaso = p.gasometriaHistory[col];
      if (!gaso) continue;
      const pfDireto = gaso["P/F"] || gaso["PF"] || gaso["Relação P/F"] || gaso["Relacao P/F"] || gaso["PaO2/FiO2"];
      if (pfDireto) return parseFloat(pfDireto.toString().replace(',', '.'));
      const pao2 = gaso["PaO2"] || gaso["pO2"];
      let fio2Gaso = gaso["FiO2"];
      if (pao2 && fio2Gaso) {
        fio2Gaso = parseFloat(fio2Gaso.toString().replace(',', '.'));
        const pao2Float = parseFloat(pao2.toString().replace(',', '.'));
        const fio2Decimal = fio2Gaso > 1 ? fio2Gaso / 100 : fio2Gaso;
        return pao2Float / fio2Decimal;
      }
    }
    return null;
  };

  // 1. SNC
  const neuroData = getBestGlasgowForSOFA(p);
  const gcs = neuroData.valor;
  p.sofa_data_technical.glasgowOrigem = neuroData.origem;
  if (gcs <= 5) score += 4;
  else if (gcs <= 8) score += 3;
  else if (gcs <= 12) score += 2;
  else if (gcs <= 14) score += 1;

  // 2. RESPIRATÓRIO (Ajustado conforme pedido)
  const pfRatio = buscarUltimoPF();
  const isVM = p.physio?.suporte === "VM" || p.physio?.suporte === "VNI";
  if (pfRatio && pfRatio > 0) {
    p.sofa_data_technical.lastPF = Math.round(pfRatio); 
    if (pfRatio <= 75 && isVM) score += 4;
    else if (pfRatio > 75 && pfRatio <= 150 && isVM) score += 3;
    else if (pfRatio <= 225) score += 2;
    else if (pfRatio > 225 && pfRatio <= 300) score += 1;
  }

  // 3. CARDIOVASCULAR (Ajustado com Vaso/Dobuta)
  let noraDose = 0;
  let hasVasoOrDobuta = false;
  if (p.bh?.gains) {
    let lastNoraVal = 0;
    const horas = typeof BH_HOURS !== "undefined" ? BH_HOURS : ["07h","08h","09h","10h","11h","12h","13h","14h","15h","16h","17h","18h","19h","20h","21h","22h","23h","00h","01h","02h","03h","04h","05h","06h"];
    horas.forEach(h => {
      const valNora = p.bh.gains[h]?.["Noradrenalina"];
      if (valNora) lastNoraVal = parseFloat(String(valNora).replace(',', '.'));
      const vaso = parseFloat(String(p.bh.gains[h]?.["Vasopressina"] || 0).replace(',', '.'));
      const dobuta = parseFloat(String(p.bh.gains[h]?.["Dobutamina"] || 0).replace(',', '.'));
      if (vaso > 0 || dobuta > 0) hasVasoOrDobuta = true;
    });
    const peso = parseFloat(String(p.nutri?.peso || p.physio?.pesoPredito || p.medical?.peso || 0).replace(',', '.'));
    if (lastNoraVal > 0 && peso > 0) {
      const mcgPerMl = p.sofa_data_technical?.noraDoubleDoseToday ? 128 : 64; 
      noraDose = (lastNoraVal * mcgPerMl) / (peso * 60);
    }
  }
  p.sofa_data_technical.lastNoraDose = noraDose > 0 ? parseFloat(noraDose.toFixed(2)) : null;
  const ultimaPAM = buscarUltimaPAM();
  if (noraDose > 0.4 || (noraDose > 0.2 && hasVasoOrDobuta)) score += 4;
  else if (noraDose > 0.2 || (noraDose > 0 && hasVasoOrDobuta)) score += 3;
  else if (noraDose > 0) score += 2;
  else if (ultimaPAM !== null && ultimaPAM < 70) score += 1;

  // 4. HEPÁTICO (Ajustado: >1.2 a 3.0 = 1 ponto)
  const bili = buscarUltimoLab(["Bilirrubina Total", "Bilirrubina", "BT", "Bili"]);
  if (bili > 12) score += 4;
  else if (bili > 6) score += 3;
  else if (bili > 3) score += 2;
  else if (bili > 1.2) score += 1;

  // 5. RENAL (Ajustado com Critério de Anúria e Identificador de Motivo)
  const creat = buscarUltimoLab(["Creatinina", "Creat", "Cr", "Cr."]);
  p.sofa_data_technical.lastCreat = creat; 
  
  const isHD = p.medical?.hemodialise || false;
  const statusDiurese = analyzeOliguriaForSOFA(p);

  if (isHD) {
    score += 4;
    p.sofa_data_technical.renalReason = "Hemodiálise";
  } 
  else if (creat > 3.5 || statusDiurese.oliguria24h || statusDiurese.anuria12h) {
    score += 3;
    if (statusDiurese.anuria12h) p.sofa_data_technical.renalReason = "Anúria (>12h)";
    else if (statusDiurese.oliguria24h) p.sofa_data_technical.renalReason = "Oligúria (>24h)";
    else p.sofa_data_technical.renalReason = `Creatinina ${creat}`;
  } 
  else if (creat > 2.0 || statusDiurese.oliguria12h) {
    score += 2;
    if (statusDiurese.oliguria12h) p.sofa_data_technical.renalReason = "Oligúria (>12h)";
    else p.sofa_data_technical.renalReason = `Creatinina ${creat}`;
  } 
  else if (creat > 1.2 || statusDiurese.oliguria6h) {
    score += 1;
    if (statusDiurese.oliguria6h) p.sofa_data_technical.renalReason = "Oligúria (>6h)";
    else p.sofa_data_technical.renalReason = `Creatinina ${creat}`;
  } else {
    p.sofa_data_technical.renalReason = creat ? `Creatinina ${creat}` : "S/ Disfunção";
  }

  // 6. HEMATOLÓGICO (Ajustado e corrigido para valores altos)
  let plat = buscarUltimoLab(["Plaquetas", "Plat", "PLT", "Plaq"]);
  if (plat !== null) {
    if (plat > 1000) plat = plat / 1000; // Converte 150000 para 150
    if (plat <= 50) score += 4;
    else if (plat > 50 && plat <= 80) score += 3;
    else if (plat > 80 && plat <= 100) score += 2;
    else if (plat > 100 && plat <= 150) score += 1;
  }

  return score;
};

  // Função para formatar datas na Recepção (YYYY-MM-DD para DD/MM/YYYY)
export const formatarDataBR = (data) => {
  if (!data) return "";
  // Verifica se a data já vem com hífen (padrão do input type="date")
  if (data.includes("-")) {
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  }
  return data;
};