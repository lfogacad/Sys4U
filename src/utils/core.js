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
    
    // Pega o Peso Predito (Aba nutrição/calculado) ou o peso de admissão.
    const peso = safeNumber(patient.nutri?.pesoRealAdmissao || patient.nutri?.pesoPredito);
    const doubleDose = patient.sofa_data_technical?.noraDoubleDoseToday || false;
    const rate = safeNumber(mlHour);
    const concentration = doubleDose ? 128 : 64; // µg/mL
  
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

  const age = calculateAge(patient.dataNascimento) || 0;
  if (age >= 80) { score += 18; details.push(`Idade ${age} anos: +18`); }
  else if (age >= 70) { score += 13; details.push(`Idade ${age} anos: +13`); }
  else if (age >= 60) { score += 9; details.push(`Idade ${age} anos: +9`); }
  else if (age >= 40) { score += 5; details.push(`Idade ${age} anos: +5`); }

  const comorb = s3.comorbidades || [];
  if (comorb.includes("Câncer Sólido")) { score += 10; details.push("Câncer Sólido: +10"); }
  if (comorb.includes("Hemato-onco")) { score += 12; details.push("Hemato-onco: +12"); }
  if (comorb.includes("Cirrose")) { score += 10; details.push("Cirrose: +10"); }
  if (comorb.includes("AIDS")) { score += 12; details.push("AIDS: +12"); }
  if (comorb.includes("IC NYHA IV")) { score += 10; details.push("IC NYHA IV: +10"); }
  if (s3.imunossupressao) { score += 3; details.push("Imunossupressão: +3"); }

  if (s3.diasHospital === "≥28 dias") { score += 7; details.push("Internação pré-UTI ≥ 28 dias: +7"); }
  else if (s3.diasHospital === "14 a 27 dias") { score += 6; details.push("Internação pré-UTI 14-27 dias: +6"); }

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

  const razao = s3.sistemaRazao || "";
  if (razao === "Gastrointestinal / Digestivo") { score += 12; details.push("Razão (Gastro/Digestivo): +12"); }
  else if (razao === "Cardiovascular" || razao === "Respiratório") { score += 10; details.push(`Razão (${razao}): +10`); }
  else if (razao === "Geniturinário / Renal") { score += 8; details.push("Razão (Renal): +8"); }
  else if (razao === "Neurológico") { score += 7; details.push("Razão (Neurológico): +7"); }
  else if (razao === "Hematológico") { score += 6; details.push("Razão (Hematológico): +6"); }
  else if (razao === "Trauma (Não-Neurológico)" || razao === "Outros / Diversos") { score += 5; details.push(`Razão (${razao}): +5`); }
  else if (razao === "Metabólico / Endócrino") { score += 4; details.push("Razão (Metabólico/Endócrino): +4"); }

  const isSedated = patient.neuro?.sedacao === true || (patient.neuro?.rass && patient.neuro.rass !== "" && patient.neuro.rass !== "NT");
  let glasgow = 0;

  if (isSedated) {
    const getVal = (s) => parseInt(s?.split(" ")[0]) || 0;
    const ao = getVal(patient.neuro?.glasgowBasalAO);
    const rv = patient.neuro?.glasgowBasalRV?.startsWith("T") ? 1 : getVal(patient.neuro?.glasgowBasalRV);
    const rm = getVal(patient.neuro?.glasgowBasalRM);
    const basalTotal = ao + rv + rm;
    glasgow = basalTotal > 0 ? basalTotal : calculateGlasgowTotal(patient);
    if (basalTotal > 0) details.push(`Paciente Sedado -> Usando Glasgow Basal (${glasgow})`);
  } else {
    glasgow = calculateGlasgowTotal(patient);
  }

  if (glasgow > 0) {
    if (glasgow <= 6) { score += 15; details.push(`Glasgow (${glasgow}): +15`); }
    else if (glasgow <= 12) { score += 7; details.push(`Glasgow (${glasgow}): +7`); }
    else if (glasgow <= 14) { score += 2; details.push(`Glasgow (${glasgow}): +2`); }
  }

  const bil = getPrimeiroExameSAPS(patient, "Bilirrubina Total", "");
  if (bil >= 6.0) { score += 5; details.push(`Bilirrubina Total (≥ 6.0): +5`); }
  else if (bil >= 2.0) { score += 4; details.push(`Bilirrubina Total (2.0-5.9): +4`); }

  const creat = getPrimeiroExameSAPS(patient, "Creatinina", "creat");
  if (creat >= 3.5) { score += 8; details.push(`Creatinina (≥ 3.5): +8`); }
  else if (creat >= 2.0) { score += 7; details.push(`Creatinina (2.0-3.4): +7`); }
  else if (creat >= 1.2) { score += 2; details.push(`Creatinina (1.2-1.9): +2`); }

  let fcMax = 0;
  if (patient.bh?.vitals) {
    Object.values(patient.bh.vitals).forEach((v) => {
      const fc = safeNumber(v["FC (bpm)"]);
      if (fc > fcMax) fcMax = fc;
    });
  }
  if (fcMax >= 160) { score += 7; details.push(`Frequência Cardíaca (≥ 160): +7`); }
  else if (fcMax >= 120) { score += 5; details.push(`Frequência Cardíaca (120-159): +5`); }

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

  let pasMin = 999;
  if (patient.bh?.vitals) {
    Object.values(patient.bh.vitals).forEach((v) => {
      const pas = safeNumber(v["PAS"]);
      if (pas > 0 && pas < pasMin) pasMin = pas;
    });
  }
  if (pasMin < 999) {
    if (pasMin < 70) { score += 11; details.push(`PA Sistólica (< 70): +11`); }
    else if (pasMin < 90) { score += 5; details.push(`PA Sistólica (70-89): +5`); }
    else if (pasMin < 120) { score += 2; details.push(`PA Sistólica (90-119): +2`); }
  }

  const pf = getPrimeiraGasometriaSAPS(patient, "P/F");
  if (pf !== null && pf > 0) {
    if (pf < 100) { score += 11; details.push(`PaO2/FiO2 (< 100): +11`); }
    else if (pf < 250) { score += 7; details.push(`PaO2/FiO2 (100-249): +7`); }
  }

  let tempMin = 99;
  if (patient.bh?.vitals) {
    Object.values(patient.bh.vitals).forEach((v) => {
      const t = safeNumber(v["Temp (ºC)"]);
      if (t > 0 && t < tempMin) tempMin = t;
    });
  }
  if (tempMin > 0 && tempMin < 35.0) { score += 5; details.push(`Temperatura (< 35.0ºC): +5`); }

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
  nutri: { peso: "", tipoMedicaoPeso: "", pesoPredito: "", altura: "", via: "", tipoDieta: "", caracteristicasDieta: [], vazao: "", vomito: false, diarreia: false, residuo: "", metaCal: "", metaProt: "", atingido: "", atingidoAnotacoes: "", risco_nutricional: "", dataUltimaEvacuacao: "", anotacoes: "" },
  fono: { consistencia: "", utensilioAgua: "", toleraAgua: false, nivel_consciencia: "", blue_dye: "", degluticao: "", voz: "", conduta: "", compreensao: "", expressao_oral: "", expressao_oral_detalhe: "", inapto_vo: [] },
  enfermagem: { dor: "", hemodialise: false, lesaoLocal: "", lesaoEstagio: "", curativoTipo: "", curativoData: "", avpLocal: "", avpData: "", cvcLocal: "", cvcData: "", svd: false, svdData: "", sneCm: "", sneData: "", drenoTipo: "", drenoAspecto: "", drenoDebito: "", precaucao: "", anotacoes: "", braden_percepcao: "", braden_umidade: "", braden_atividade: "", braden_mobilidade: "", braden_nutricao: "", braden_friccao: "", morse_historico: "", morse_diagnostico: "", morse_auxilio: "", morse_terapiaIV: "", morse_marcha: "", morse_estadoMental: "" },
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
  const p = JSON.parse(JSON.stringify(patient));
  const mapFullToShort = { Leucócitos: "leuco", Ureia: "ureia", Creatinina: "creat", "Na (Sódio)": "na", "K (Potássio)": "k" };
  const today = getManausDateStr();
  const yest = subtractDays(today, 1);
  const dbef = subtractDays(today, 2);

  p.labs = { today: { date: today }, yesterday: { date: yest }, dayBefore: { date: dbef } };
  ["today", "yesterday", "dayBefore"].forEach((per) => {
    Object.keys(mapFullToShort).forEach((k) => p.labs[per][mapFullToShort[k]] = "");
  });

  const periods = [{ k: "today", d: today }, { k: "yesterday", d: yest }, { k: "dayBefore", d: dbef }];
  periods.forEach((per) => {
    if (p.examHistory && p.examHistory[per.d]) {
      Object.entries(mapFullToShort).forEach(([full, short]) => {
        const v = p.examHistory[per.d][full];
        if (v !== undefined && v !== null && v !== "") p.labs[per.k][short] = v;
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

export const calculateTotals = (bh) => {
  if (!bh) return { totalGains: 0, totalLosses: 0, totalIrrigation: 0, dailyBalance: 0, accumulated: 0 };
  let totalGains = 0; let totalLosses = 0; let totalIrrigation = 0;
  if (bh.irrigation) Object.values(bh.irrigation).forEach((v) => (totalIrrigation += safeNumber(v)));
  if (bh.gains) Object.values(bh.gains).forEach((h) => Object.values(h).forEach((v) => (totalGains += safeNumber(v))));
  if (bh.losses) Object.values(bh.losses).forEach((h) => Object.values(h).forEach((v) => (totalLosses += safeNumber(v))));
  const adjustedTotalLosses = totalLosses - totalIrrigation;
  const insensible = safeNumber(bh.insensibleLoss);
  const dailyBalance = totalGains - (adjustedTotalLosses + insensible);
  const accumulated = safeNumber(bh.accumulated) + dailyBalance;
  return { totalGains, totalLosses: adjustedTotalLosses, totalIrrigation, dailyBalance, accumulated };
};

export const calculateDiurese12hMlKgH = (patient) => {
  const weight = safeNumber(patient.nutri?.peso);
  if (!weight || weight <= 0) return "---";
  const safePatient = ensureBHStructure(patient);
  const currentHourStr = String(new Date().getHours()).padStart(2, "0") + ":00";
  let currentIndex = BH_HOURS.indexOf(currentHourStr);
  if (currentIndex === -1) currentIndex = 0;

  let diureseBruta = 0; let irrigacao = 0;
  for (let i = 0; i < 12; i++) {
    let checkIndex = currentIndex - i;
    let targetBH = safePatient.bh;
    if (checkIndex < 0) { targetBH = safePatient.bh_previous; checkIndex = BH_HOURS.length + checkIndex; }
    if (targetBH) {
      const hourStr = BH_HOURS[checkIndex];
      if (targetBH.losses && targetBH.losses[hourStr]) diureseBruta += safeNumber(targetBH.losses[hourStr]["Diurese (Total Coletado)"]);
      if (targetBH.irrigation && targetBH.irrigation[hourStr]) irrigacao += safeNumber(targetBH.irrigation[hourStr]);
    }
  }
  const result = (diureseBruta - irrigacao) / weight / 12;
  return result.toFixed(1);
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
  const ab = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument(ab).promise;
  let txt = "";
  for (let j = 1; j <= pdf.numPages; j++) {
    const p = await pdf.getPage(j);
    const c = await p.getTextContent();
    txt += c.items.map((i) => i.str).join(" ");
  }
  return txt;
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
  const prompt = `Você é um assistente médico especialista... 
  REGRAS: 1. EXAMES NÃO REALIZADOS NÃO INCLUIR. 5. APENAS NÚMEROS...
  CHAVES: ${EXAM_ROWS.join(", ")}
  TEXTO: """${text.substring(0, 50000)}"""
  JSON: { "patientName": "", "date": "YYYY-MM-DD", "results": {} }`;

  let lastErrorMsg = "Erro desconhecido";
  const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro"];;

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const currentKey = apiKey || window.apiKey || "";
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
        );
        const d = await r.json();
        if (d.error) {
          lastErrorMsg = d.error.message || JSON.stringify(d.error);
          if (d.error.code === 400 || d.error.code === 403) break;
          continue;
        }
        let rawText = d.candidates[0].content.parts[0].text;
        const startIdx = rawText.indexOf("{");
        const endIdx = rawText.lastIndexOf("}");
        if (startIdx !== -1 && endIdx !== -1) rawText = rawText.substring(startIdx, endIdx + 1);
        return JSON.parse(rawText);
      } catch (e) {
        lastErrorMsg = e.message || String(e);
      }
    }
    if (lastErrorMsg.includes("Chave de API")) break;
  }
  console.error("Fallback Manual Ativado. Erro final:", lastErrorMsg);
  const manual = parseManual(text);
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
  
  // --- DETETIVE DO GLASGOW ---
  export const getBestGlasgowForSOFA = (p) => {
    if (!p.neuro?.sedacao) return { valor: safeNumber(p.neuro?.glasgow || 15), origem: "Atual" };
    if (p.neuro?.glasgowPreSedacao) return { valor: safeNumber(p.neuro?.glasgowPreSedacao), origem: "Pré-Sedação" };
    if (p.saps3?.glasgow || p.admissionData?.glasgow) {
      const gcsSaps = safeNumber(p.saps3?.glasgow || p.admissionData?.glasgow);
      return { valor: gcsSaps, origem: "Admissão (SAPS3)" };
    }
    if (p.history && Array.isArray(p.history)) {
      const lastAwake = p.history.slice().reverse().find(evo => !evo.neuro?.sedacao && evo.neuro?.glasgow);
      if (lastAwake) return { valor: safeNumber(lastAwake.neuro.glasgow), origem: "Histórico UTI" };
    }
    return { valor: 15, origem: "Presumido" };
  };
  
  // --- MOTOR PRINCIPAL SOFA-2 (CORRIGIDO E OTIMIZADO) ---
  export const getAutoSOFA2 = (p) => {
    let score = 0;
    if (!p.sofa_data_technical) p.sofa_data_technical = {};
  
    // SUTURA 1: Função robusta que aceita variações de nome e corrige a VÍRGULA brasileira
    const buscarUltimoLab = (nomesPossiveis) => {
      const parseBr = (val) => {
        if (!val) return null;
        const clean = val.toString().trim().replace(',', '.'); // Converte 1,5 para 1.5
        return clean === "" ? null : parseFloat(clean);
      };

      const nomes = Array.isArray(nomesPossiveis) ? nomesPossiveis : [nomesPossiveis];
      
      // Procura primeiro nos exames de hoje
      for (let nome of nomes) {
        const val = parseBr(p.labs?.today?.[nome]);
        if (val !== null && !isNaN(val)) return val;
      }
      
      // Se não achar hoje, varre o histórico do mais recente pro mais antigo
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
      for (let h of BH_HOURS.slice().reverse()) {
        const pam = p.bh?.vitals?.[h]?.["PAM"];
        // Correção de vírgula aqui também por segurança
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
  
    const neuroData = getBestGlasgowForSOFA(p);
    const gcs = neuroData.valor;
    p.sofa_data_technical.glasgowOrigem = neuroData.origem;
  
    if (gcs <= 5) score += 4;
    else if (gcs <= 8) score += 3;
    else if (gcs <= 12) score += 2;
    else if (gcs <= 14) score += 1;
  
    const pfRatio = buscarUltimoPF();
    const isVM = p.physio?.suporte === "VM" || p.physio?.suporte === "VNI";
    
    if (pfRatio && pfRatio > 0) {
      p.sofa_data_technical.lastPF = Math.round(pfRatio); 
      if (pfRatio <= 75 && isVM) score += 4;
      else if (pfRatio <= 150 && isVM) score += 3;
      else if (pfRatio <= 225) score += 2;
      else if (pfRatio <= 300) score += 1;
    } else {
      p.sofa_data_technical.lastPF = null;
    }
  
    const bhGains = p.bh?.gains || {};
    const lastHour = BH_HOURS.slice().reverse().find(h => bhGains[h]?.["Noradrenalina"]);
    const lastNoraML = lastHour ? bhGains[lastHour]["Noradrenalina"] : null;
    const noraDose = parseFloat(calculateNoraDose(p, lastNoraML) || 0);
    
    const ultimaPAM = buscarUltimaPAM();
    p.sofa_data_technical.lastPAM = ultimaPAM;
  
    if (noraDose > 0.4) score += 4;
    else if (noraDose > 0.2) score += 3;
    else if (noraDose > 0) score += 2;
    else if (ultimaPAM !== null && ultimaPAM < 70) score += 1;
  
    // SUTURA 2: Passando um Array com variações de nomes para garantir que ele ache!
    const bili = buscarUltimoLab(["Bilirrubina Total", "Bilirrubina", "BT", "Bili"]);
    if (bili > 12) score += 4;
    else if (bili > 6) score += 3;
    else if (bili > 3) score += 2;
    else if (bili >= 1.2) score += 1;
  
    // Buscando a Creatinina de forma blindada
    const creat = buscarUltimoLab(["Creatinina", "Creat", "Cr", "Cr."]);
    p.sofa_data_technical.lastCreat = creat; 
    const isDialysis = p.medical?.dialise || false;
    
    if (isDialysis) score += 4;
    else if (creat > 3.5) score += 3;
    else if (creat >= 2.0) score += 2;
    else if (creat >= 1.2) score += 1;
  
    // Buscando as Plaquetas
    const plat = buscarUltimoLab(["Plaquetas", "Plat", "PLT", "Plaq"]);
    p.sofa_data_technical.lastPlat = plat; 
    if (plat && plat <= 50) score += 4;
    else if (plat && plat <= 80) score += 3;
    else if (plat && plat <= 100) score += 2;
    else if (plat && plat <= 150) score += 1;
  
    return score;
  };