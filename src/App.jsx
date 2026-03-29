import React, { useState, useEffect } from "react";
import {
  ClipboardCheck,
  User,
  Stethoscope,
  Clock,
  Pill,
  Wifi,
  WifiOff,
  Activity,
  LogOut,
  Lock,
  Mail,
  Trash2,
  FileText,
  AlertTriangle,
  UserPlus,
  BadgeCheck,
  ShieldCheck,
  Key,
  X,
  CalendarX,
  Table,
  UploadCloud,
  BrainCircuit,
  Sparkles,
  Bot,
  FolderInput,
  CheckCircle,
  AlertCircle,
  Loader2,
  Wind,
  PlusCircle,
  MapPin,
  HeartPulse,
  Brain,
  Droplets,
  Utensils,
  Syringe,
  Shield,
  Edit3,
  Printer,
  RotateCcw,
  Thermometer,
  Scale,
  Gauge,
  Mic,
  FileCheck,
  ChevronRight,
  ChevronDown,
  Apple,
  Move,
  List,
  Filter,
  Copy,
  ShieldAlert,
  Bug,
  Target,
} from "lucide-react";

// Importações do Firebase
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updatePassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";

// --- ÍCONE PERSONALIZADO ---
function NurseCap(props) {
  return (
    <svg
      width={props.size || 24}
      height={props.size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 12h16v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3z" />
      <path d="M7 12V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v5" />
      <path d="M12 7v4" />
      <path d="M10 9h4" />
    </svg>
  );
}

// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyAl4mPSN5cFyoIloswM8Qv64jVo_VIzS_g",
  authDomain: "fasthug-c0c7e.firebaseapp.com",
  projectId: "fasthug-c0c7e",
  storageBucket: "fasthug-c0c7e.firebasestorage.app",
  messagingSenderId: "38672574925",
  appId: "1:38672574925:web:22dd6a9a88a0cbc8d5fc84",
  measurementId: "G-0BM706SM0H",
};

// Se hospedar externamente, coloque a sua API Key do Google AI Studio aqui dentro. No Canvas, deixe vazio.
const apiKeyMed = import.meta.env.VITE_GEMINI_API_KEY_MED;
const apiKeyEnf = import.meta.env.VITE_GEMINI_API_KEY_ENF;
const apiKey = import.meta.env.VITE_GEMINI_API_KEY; // Mantém para o leitor de PDF

let app, auth, db;
let firebaseError = null;
try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Falha ao inicializar Firebase:", error);
  firebaseError = error;
}

const PROFISSOES = [
  "Médico",
  "Enfermeiro",
  "Técnico em Enfermagem",
  "Fisioterapeuta",
  "Nutricionista",
  "Psicólogo",
  "Farmacêutico",
  "Gestor",
  "Administrador",
  "Fonoaudiólogo",
];
const CODIGO_MESTRE_RT = "UTI@ARIQUEMES";

const EXAM_ROWS = [
  "Hemoglobina",
  "Hematócrito",
  "Leucócitos",
  "Basófilos",
  "Eosinófilos",
  "Bastões",
  "Segmentados",
  "Linfócitos",
  "Monócitos",
  "Plaquetas",
  "PCR",
  "Ureia",
  "Creatinina",
  "Na (Sódio)",
  "K (Potássio)",
  "TGO (AST)",
  "TGP (ALT)",
  "Bilirrubina Total",
  "Bilirrubina Direta",
  "Bilirrubina Indireta",
  "Amilase",
  "Lipase",
  "GamaGT",
  "Fosfatase Alcalina",
  "Troponina",
  "CPK Total",
  "CK-MB",
  "RNI",
  "TTPA",
  "Proteínas Totais",
  "Albumina",
  "Ácido úrico",
  "Ferritina",
  "DHL",
  "EAS (Leuco/c)",
  "HBV",
  "HCV",
  "HIV",
  "VDRL",
];

const BH_HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = (i + 7) % 24;
  return h.toString().padStart(2, "0") + ":00";
});
const BH_GAINS = [
  "Dieta Oral",
  "Dieta SNE",
  "Água (VO/SNE)",
  "Soro Basal",
  "Diluição EV",
  "Volume",
  "Midazolam",
  "Fentanil",
  "Noradrenalina",
  "Dobutamina",
  "Hemocomponentes",
];
const BH_LOSSES = [
  "Diurese (Total Coletado)",
  "Drenos",
  "SNG/SNE",
  "HD (Perda)",
  "Vômitos",
  "Evacuação",
  "Diarreia", // <-- Nova linha adicionada aqui
];

const HD_TIMES = [
  "00:00",
  "00:15",
  "00:30",
  "00:45",
  "01:00",
  "01:15",
  "01:30",
  "01:45",
  "02:00",
  "02:15",
  "02:30",
  "02:45",
  "03:00",
  "03:15",
  "03:30",
  "03:45",
  "04:00",
  "04:15",
  "04:30",
  "04:45",
  "05:00",
];
const HD_SUPPLIES = [
  { id: "dialisador", label: "DIALISADOR" },
  { id: "seringa10", label: "SERINGA 10ML" },
  { id: "linha_v", label: "LINHA VENOSA" },
  { id: "seringa20", label: "SERINGA 20ML" },
  { id: "linha_a", label: "LINHA ARTERIAL" },
  { id: "agulha25", label: "AGULHA 25X7" },
  { id: "equipo", label: "EQUIPO" },
  { id: "agulha40", label: "AGULHA 40X12" },
  { id: "isolador", label: "ISOLADOR DE PRESSÃO" },
  { id: "luva_est", label: "LUVA ESTÉRIL" },
  { id: "sol_acida", label: "SOLUÇÃO ÁCIDA" },
  { id: "luva_proc", label: "LUVA DE PROCEDIMENTO" },
  { id: "sol_basica", label: "SOLUÇÃO BÁSICA" },
  { id: "mascara", label: "MÁSCARA" },
  { id: "sf500", label: "S.F. 0,9% 500 ML" },
  { id: "gorro", label: "GORRO" },
  { id: "sf1000", label: "S.F. 0,9% 1000 ML" },
  { id: "gaze", label: "GAZE" },
  { id: "heparina", label: "HEPARINA" },
  { id: "micropore", label: "MICROPORE" },
];

// --- LISTAS ---
const CARACTERISTICAS_DIURESE = [
  "Clara",
  "Amarelo Cítrico",
  "Concentrada",
  "Turva",
  "Colúria",
  "Hematúria",
  "Piúria"
];
const OPCOES_DVA = [
  "Noradrenalina",
  "Vasopressina",
  "Dobutamina",
  "Nipride",
  "Tridil",
  "Dopamina",
];
const OPCOES_SEDATIVOS = [
  "Midazolam",
  "Cetamina",
  "Propofol",
  "Precedex",
  "Fentanil",
  "Rocurônio",
];
const GLASGOW_AO = [
  "4 - Espontânea",
  "3 - Ao comando verbal",
  "2 - Ao estímulo doloroso",
  "1 - Ausente",
];
const GLASGOW_RV = [
  "5 - Orientado",
  "4 - Confuso",
  "3 - Palavras inaprop.",
  "2 - Sons incompreens.",
  "1 - Ausente",
  "T - Tubo/Traqueo",
];
const GLASGOW_RM = [
  "6 - Obedece comandos",
  "5 - Localiza dor",
  "4 - Flexão normal (retirada)",
  "3 - Flexão anormal (decorticação)",
  "2 - Extensão (descerebração)",
  "1 - Ausente",
];
const RASS_OPTS = [
  "+4 Combativo",
  "+3 Muito Agitado",
  "+2 Agitado",
  "+1 Inquieto",
  "0 Alerta e Calmo",
  "-1 Sonolento",
  "-2 Sedação Leve",
  "-3 Sedação Moderada",
  "-4 Sedação Profunda",
  "-5 Não Despertável",
];
const SUPORTE_RESP_OPTS = [
  "Ar Ambiente",
  "Cateter Nasal",
  "Venturi",
  "Máscara não reinalante",
  "VNI",
  "VM",
  "Macronebulização por TQT",
];
const MODOS_VM = ["PCV", "VCV", "PSV", "SIMV"];
const ASPECTO_SECRECAO = ["Fluído", "Espesso", "Rolhas"];
const COLORACAO_SECRECAO = [
  "Hialina",
  "Amarelada",
  "Esverdeada",
  "Purulenta",
  "Sanguinolenta",
];
const QTD_SECRECAO = ["Pouca", "Moderada", "Abundante"];
const MOBILIZACAO = [
  "Mudança de decúbito",
  "Sedestação beira leito",
  "Poltrona",
  "Ortostatismo",
  "Deambulação",
  "Exercícios passivos",
  "Exercícios ativos",
  "Exercícios ativos-assistidos",
  "Exercícios resistidos",
  "Cicloergômetro",
];
const CONSISTENCIA_ALIMENTAR = [
  "Livre",
  "Branda",
  "Leve",
  "Pastosa heterogênea",
  "Pastosa homogênea",
  "Líquida espessada",
  "Líquida",
  "Zero",
];
const CARACTERISTICAS_DIETA = [
  "Hipossódica",
  "DM",
  "Laxativa",
  "Hiperproteica",
  "Hipolipídica",
  "Constipante",
];
const UTENSILIOS_AGUA = [
  "Copo aberto",
  "Garrafa",
  "Garrafa controle fluxo",
  "Canudo",
];
const ESCALA_DOR = [
  "0 - Sem dor",
  "1-3 - Dor Leve",
  "4-6 - Dor Moderada",
  "7-10 - Dor Intensa",
  "Não comunicativo",
];
const PRECAUCOES = ["Padrão", "Contato", "Gotículas", "Aerossóis", "Reversa"];
const RISCO_NUTRICIONAL = ["1", "2", "3", "4", "5", "6", "7"];
const FONO_COMPREENSAO = [
  "Gestos",
  "Imagens/Objetos",
  "Palavras",
  "Frases Simples",
  "Frases Complexas",
];
const FONO_EXPRESSAO = ["Preservada", "Alterada"];
const FONO_EXPRESSAO_DETALHE = [
  "Mutismo",
  "Apraxia",
  "Disartria",
  "Agramatismo",
  "Ecolalia",
];
const FONO_INAPTO_VO = [
  "Escape oral anterior",
  "Tempo de trânsito oral aumentado",
  "Refluxo nasal",
  "Múltiplas deglutições",
  "Resíduo em cavidade oral após deglutição",
  "Elevação laríngea inadequada",
  "Ausculta cervical ruidosa",
  "Mudança na qualidade vocal",
  "Tosse",
  "Engasgo",
  "Cianose",
  "Alteração dos sinais vitais",
];
const ICU_MOBILITY_SCALE = [
  "0 - Nada (Passivo)",
  "1 - Sentado no leito / Exercícios no leito",
  "2 - Transferência passiva para cadeira",
  "3 - Sentado à beira do leito",
  "4 - Em pé",
  "5 - Transferência ativa para cadeira",
  "6 - Marcha no lugar",
  "7 - Marcha com auxílio (2+ pessoas)",
  "8 - Marcha com auxílio (1 pessoa)",
  "9 - Marcha independente com dispositivo",
  "10 - Marcha independente sem auxílio",
];

const GASOMETRIA_PARAMS = [
  "pH",
  "pCO2",
  "PaO2",
  "BE",
  "HCO3",
  "SatO2",
  "FiO2",
  "P/F",
];

const BRADEN_OPTIONS = {
  percepcao: [
    { value: 1, label: "1 - Totalmente limitado" },
    { value: 2, label: "2 - Muito limitado" },
    { value: 3, label: "3 - Levemente limitado" },
    { value: 4, label: "4 - Nenhuma limitação" },
  ],
  umidade: [
    { value: 1, label: "1 - Completamente molhado" },
    { value: 2, label: "2 - Muito molhado" },
    { value: 3, label: "3 - Ocasionalmente molhado" },
    { value: 4, label: "4 - Raramente molhado" },
  ],
  atividade: [
    { value: 1, label: "1 - Acamado" },
    { value: 2, label: "2 - Confinado à cadeira" },
    { value: 3, label: "3 - Caminha ocasionalmente" },
    { value: 4, label: "4 - Caminha frequentemente" },
  ],
  mobilidade: [
    { value: 1, label: "1 - Totalmente imóvel" },
    { value: 2, label: "2 - Bastante limitado" },
    { value: 3, label: "3 - Levemente limitado" },
    { value: 4, label: "4 - Nenhuma limitação" },
  ],
  nutricao: [
    { value: 1, label: "1 - Muito pobre" },
    { value: 2, label: "2 - Provavelmente inadequada" },
    { value: 3, label: "3 - Adequada" },
    { value: 4, label: "4 - Excelente" },
  ],
  friccao: [
    { value: 1, label: "1 - Problema" },
    { value: 2, label: "2 - Problema potencial" },
    { value: 3, label: "3 - Nenhum problema aparente" },
  ],
};

const MORSE_OPTIONS = {
  historico: [
    { value: 0, label: "0 - Não" },
    { value: 25, label: "25 - Sim" },
  ],
  diagnostico: [
    { value: 0, label: "0 - Não" },
    { value: 15, label: "15 - Sim" },
  ],
  auxilio: [
    { value: 0, label: "0 - Nenhum / Acamado / Auxiliado por profissional" },
    { value: 15, label: "15 - Muleta / Bengala / Andador" },
    { value: 30, label: "30 - Apoia-se em móveis" },
  ],
  terapiaIV: [
    { value: 0, label: "0 - Não" },
    { value: 20, label: "20 - Sim" },
  ],
  marcha: [
    { value: 0, label: "0 - Normal / Acamado / Cadeira de rodas" },
    { value: 10, label: "10 - Fraca" },
    { value: 20, label: "20 - Comprometida / Cambaleante" },
  ],
  estadoMental: [
    { value: 0, label: "0 - Orientado / Capaz" },
    { value: 15, label: "15 - Esquece limitações / Superestima capacidade" },
  ],
};

// --- FUNÇÕES UTILS ---

const safeNumber = (val) => {
  if (val === null || val === undefined || val === "") return 0;
  let str = String(val).trim();
  
  // Se tem ponto E vírgula (ex: 15.000,50), remove o ponto de milhar.
  if (str.includes('.') && str.includes(',')) {
    str = str.replace(/\./g, '');
  } 
  // Se só tem ponto e termina com exatos 3 dígitos (ex: 15.000), remove o ponto assumindo ser milhar.
  else if (str.includes('.') && !str.includes(',')) {
    const parts = str.split('.');
    if (parts[parts.length - 1].length === 3) {
      str = str.replace(/\./g, '');
    }
  }
  
  // Substitui a vírgula por ponto (para o decimal) e limpa letras
  const cleaned = str
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
    
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

const getManausDateStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const parseLocalDate = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
};

const subtractDays = (s, days) => {
  if (!s) return "";
  const d = parseLocalDate(s);
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatDateDDMM = (s) => {
  if (!s) return "...";
  const [y, m, d] = s.split("-");
  return `${d}/${m}`;
};

const calculateAge = (d) => {
  if (!d) return "";
  const b = parseLocalDate(d);
  const t = parseLocalDate(getManausDateStr());
  let a = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
  return a;
};

const calculateDaysDiff = (s, isD1) => {
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

const getDaysD0 = (d) => calculateDaysDiff(d, false);
const getDaysD1 = (d) => calculateDaysDiff(d, true);
const normalizeName = (n) =>
  n
    ? n
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .trim()
    : "";

const formatExamName = (n) => {
  if (n === "Bilirrubina Total") return "Bil. T";
  if (n === "Bilirrubina Direta") return "Bil. D";
  if (n === "Bilirrubina Indireta") return "Bil. I";
  return n;
};

const getPendingText = (p) => {
  if (!p?.checklist) return "...";
  const items = {
    f: "Dieta",
    a: "Analgesia",
    s: "Sedação",
    t: "TVP",
    h: "Cabeceira",
    u: "Gástrica",
    g: "Glicemia",
  };
  const pend = Object.entries(p.checklist)
    .filter(([_, v]) => v === false)
    .map(([k]) => items[k]);
  return pend.length === 0
    ? Object.values(p.checklist).every((v) => v === true)
      ? "✅ Completo"
      : "⚠️ Incompleto"
    : `🔴 ${pend.join(" • ")}`;
};

const renderValue = (val) => {
  if (Array.isArray(val)) return val.join(", ");
  if (val === null || val === undefined) return "";
  return val;
};

// --- HELPER DE EXAMES PARA SAPS 3 ---
const getPrimeiroExameSAPS = (patient, keyFull, keyShort) => {
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

const getPrimeiraGasometriaSAPS = (patient, param) => {
  const colunasGaso = Object.keys(patient.gasometriaHistory || {}).sort();
  for (let col of colunasGaso) {
    if (patient.gasometriaHistory[col][param]) return safeNumber(patient.gasometriaHistory[col][param]);
  }
  return null;
};

// --- CHANCELADOR DE PREENCHIMENTO ---
const getMissingSAPS3 = (patient) => {
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

// --- CÁLCULO SAPS 3 (ATUALIZADO CONFORME PLANILHA) ---
const calculateSAPS3Score = (patient) => {
  if (!patient.nome) return { score: 0, prob: "---", details: [] };
  
  // TRAVA DE OURO: Se já foi calculado e salvo, retorna o valor gravado e ignora flutuações!
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

  // 1. Idade
  const age = calculateAge(patient.dataNascimento) || 0;
  if (age >= 80) { score += 18; details.push(`Idade ${age} anos: +18`); }
  else if (age >= 70) { score += 13; details.push(`Idade ${age} anos: +13`); }
  else if (age >= 60) { score += 9; details.push(`Idade ${age} anos: +9`); }
  else if (age >= 40) { score += 5; details.push(`Idade ${age} anos: +5`); }

  // 2. Comorbidades e Imunossupressão
  const comorb = s3.comorbidades || [];
  if (comorb.includes("Câncer Sólido")) { score += 10; details.push("Câncer Sólido: +10"); }
  if (comorb.includes("Hemato-onco")) { score += 12; details.push("Hemato-onco: +12"); }
  if (comorb.includes("Cirrose")) { score += 10; details.push("Cirrose: +10"); }
  if (comorb.includes("AIDS")) { score += 12; details.push("AIDS: +12"); }
  if (comorb.includes("IC NYHA IV")) { score += 10; details.push("IC NYHA IV: +10"); }
  if (s3.imunossupressao) { score += 3; details.push("Imunossupressão: +3"); }

  // 3. Tempo de internação hospitalar pré-UTI
  if (s3.diasHospital === "≥28 dias") { score += 7; details.push("Internação pré-UTI ≥ 28 dias: +7"); }
  else if (s3.diasHospital === "14 a 27 dias") { score += 6; details.push("Internação pré-UTI 14-27 dias: +6"); }

  // 4. Local de Origem
  if (s3.origemMapped === "Enfermarias") { score += 6; details.push("Origem (Enfermaria): +6"); }
  else if (s3.origemMapped === "Recuperação Pós-Anestésica") { score += 2; details.push("Origem (RPA): +2"); }

  // 5. Tipo de Admissão e Cirurgia Urgente
  if (s3.motivoAdmissao === "Cirúrgica Eletiva") { score -= 2; details.push("Admissão Cirúrgica Eletiva: -2"); }
  else if (s3.motivoAdmissao === "Cirúrgica de Urgência") { score += 2; details.push("Admissão Cirúrgica Urgência: +2"); }
  if (s3.cirurgiaUrgente) { score += 5; details.push("Cirurgia Urgente: +5"); }

  // 6. Infecção na admissão
  if (s3.infeccaoAdmissao === "Sim") {
    score += 5; details.push("Infecção Presente: +5");
    if (s3.sitioInfeccao === "Respiratório") { score += 6; details.push("Sítio Infeccioso (Respiratório): +6"); }
    else if (s3.sitioInfeccao === "Outros focos") { score += 3; details.push("Sítio Infeccioso (Outro): +3"); }
  }

  // 7. Sistema / Razão da Admissão
  const razao = s3.sistemaRazao || "";
  if (razao === "Gastrointestinal / Digestivo") { score += 12; details.push("Razão (Gastro/Digestivo): +12"); }
  else if (razao === "Cardiovascular" || razao === "Respiratório") { score += 10; details.push(`Razão (${razao}): +10`); }
  else if (razao === "Geniturinário / Renal") { score += 8; details.push("Razão (Renal): +8"); }
  else if (razao === "Neurológico") { score += 7; details.push("Razão (Neurológico): +7"); }
  else if (razao === "Hematológico") { score += 6; details.push("Razão (Hematológico): +6"); }
  else if (razao === "Trauma (Não-Neurológico)" || razao === "Outros / Diversos") { score += 5; details.push(`Razão (${razao}): +5`); }
  else if (razao === "Metabólico / Endócrino") { score += 4; details.push("Razão (Metabólico/Endócrino): +4"); }

  // 8. Glasgow (Verifica Sedação e usa o Basal)
  const isSedated = patient.neuro?.sedacao === true || (patient.neuro?.rass && patient.neuro.rass !== "" && patient.neuro.rass !== "NT");
  let glasgow = 0;

  if (isSedated) {
    const getVal = (s) => parseInt(s?.split(" ")[0]) || 0;
    const ao = getVal(patient.neuro?.glasgowBasalAO);
    const rv = patient.neuro?.glasgowBasalRV?.startsWith("T") ? 1 : getVal(patient.neuro?.glasgowBasalRV);
    const rm = getVal(patient.neuro?.glasgowBasalRM);
    const basalTotal = ao + rv + rm;
    
    // Fallback: Se marcou sedado mas não preencheu o basal, cai para o atual para não zerar a pontuação
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

  // 9. Bilirrubina Total
  const bil = getPrimeiroExameSAPS(patient, "Bilirrubina Total", "");
  if (bil >= 6.0) { score += 5; details.push(`Bilirrubina Total (≥ 6.0): +5`); }
  else if (bil >= 2.0) { score += 4; details.push(`Bilirrubina Total (2.0-5.9): +4`); }

  // 10. Creatinina
  const creat = getPrimeiroExameSAPS(patient, "Creatinina", "creat");
  if (creat >= 3.5) { score += 8; details.push(`Creatinina (≥ 3.5): +8`); }
  else if (creat >= 2.0) { score += 7; details.push(`Creatinina (2.0-3.4): +7`); }
  else if (creat >= 1.2) { score += 2; details.push(`Creatinina (1.2-1.9): +2`); }

  // 11. Frequência Cardíaca
  let fcMax = 0;
  if (patient.bh?.vitals) {
    Object.values(patient.bh.vitals).forEach((v) => {
      const fc = safeNumber(v["FC (bpm)"]);
      if (fc > fcMax) fcMax = fc;
    });
  }
  if (fcMax >= 160) { score += 7; details.push(`Frequência Cardíaca (≥ 160): +7`); }
  else if (fcMax >= 120) { score += 5; details.push(`Frequência Cardíaca (120-159): +5`); }

  // 12. Leucócitos
  const leuco = getPrimeiroExameSAPS(patient, "Leucócitos", "leuco");
  if (leuco > 0) {
    if (leuco < 4000) { score += 5; details.push(`Leucócitos (< 4.000): +5`); }
    else if (leuco >= 20000) { score += 3; details.push(`Leucócitos (≥ 20.000): +3`); }
  }

  // 13. pH Arterial
  const ph = getPrimeiraGasometriaSAPS(patient, "pH");
  if (ph !== null && ph > 0 && ph < 7.25) { score += 3; details.push(`pH Arterial (< 7.25): +3`); }

  // 14. Plaquetas
  const plaq = getPrimeiroExameSAPS(patient, "Plaquetas", "plaq");
  if (plaq > 0) {
    if (plaq < 50000) { score += 8; details.push(`Plaquetas (< 50.000): +8`); }
    else if (plaq < 100000) { score += 5; details.push(`Plaquetas (50.000-99.999): +5`); }
  }

  // 15. PA Sistólica
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

  // 16. PaO2 / FiO2
  const pf = getPrimeiraGasometriaSAPS(patient, "P/F");
  if (pf !== null && pf > 0) {
    if (pf < 100) { score += 11; details.push(`PaO2/FiO2 (< 100): +11`); }
    else if (pf < 250) { score += 7; details.push(`PaO2/FiO2 (100-249): +7`); }
  }

  // 17. Temperatura
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

// --- LÓGICA DE VM TURBINADA (COM REINTUBAÇÃO, TQT E DECANULAÇÃO) ---
const getTempoVMText = (p) => {
  if (!p.physio) return "-";

  // Puxa os dias prévios (se houver)
  const diasPrevios = p.physio.diasAcumuladosVM ? parseInt(p.physio.diasAcumuladosVM) : 0;

  if (!p.dataIntubacao) {
    return diasPrevios > 0 ? `${diasPrevios} d (Prévios)` : "-";
  }

  const start = parseLocalDate(p.dataIntubacao);
  
  // A MÁGICA ESTÁ AQUI: Descobrir quando o relógio deve parar
  let endStr = getManausDateStr(); // Por padrão, o relógio corre até HOJE
  
  if (p.dataDecanulacao) {
    endStr = p.dataDecanulacao; // Se foi decanulado, o relógio para no dia da decanulação
  } else if (p.dataExtubacao && !p.dataTQT) {
    endStr = p.dataExtubacao;   // Se foi extubado E NÃO TEM TQT, o relógio para na extubação
  }
  // Repare: Se ele tem Extubação MAS TEM TQT, o relógio ignora a extubação e continua rodando até hoje!

  const end = parseLocalDate(endStr);
  const diff = Math.max(0, Math.floor((end - start) / 86400000));
  const tempoAtual = diff + 1;
  const tempoTotal = diasPrevios + tempoAtual;

  // 1. Decanulado (Sucesso absoluto)
  if (p.dataDecanulacao) {
    return `${tempoTotal} d (Decanulado)`;
  }

  // 2. Tem TQT (Continua contando os dias até hoje)
  if (p.dataTQT) {
    return `${tempoTotal} d (TQT)`;
  }

  // 3. Apenas Extubado (Sem TQT, relógio parado na data da extubação)
  if (p.dataExtubacao) {
    return `${tempoTotal} d (Extubado)`;
  }

  // 4. Se mudou para VNI ou Cateter (Fora da VM, mas sem extubação preenchida)
  if (p.physio.suporte !== "VM") {
    return `${tempoTotal} d (Pausado/Desmame)`;
  }

  // 5. Se está em VM e tem dias de uma intubação anterior (Reintubado)
  if (diasPrevios > 0) {
    return `D${tempoTotal} (D${tempoAtual} da Reintubação)`;
  }

  // 6. Fluxo normal (Primeira intubação, rodando até hoje)
  return `D${tempoTotal}`;
};

// ==========================================
  // FUNÇÕES PARA LIMPAR A HEMODIÁLISE (PADRÃO BALANÇO HÍDRICO)
  // ==========================================
  const limparHDMedica = (e) => {
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

  const limparHDTecnico = (e) => {
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

// ==========================================
  // CÁLCULOS AUTOMÁTICOS DA HEMODIÁLISE
  // ==========================================
  const calcularHDEntradas = (p) => {
    if (!p || !p.hd_monitoramento) return 0;
    let total = 0;
    
    // Varre todas as horas preenchidas e soma SF e GH
    Object.values(p.hd_monitoramento).forEach((hora) => {
      const sf = parseFloat(hora.sf?.toString().replace(",", ".")) || 0;
      const gh = parseFloat(hora.gh?.toString().replace(",", ".")) || 0;
      total += (sf + gh);
    });
    
    return total;
  };

  const calcularHDBalancoFinal = (p) => {
    const entradas = calcularHDEntradas(p);
    // Puxa o valor da UF REALIZADA preenchida pela enfermagem!
    const ufRealizada = parseFloat(p?.hd_balanco?.uf_realizada?.toString().replace(",", ".")) || 0;
    
    // O Balanço Final da diálise é o que Entrou menos o que Saiu de fato
    return entradas - ufRealizada; 
  };

const defaultPatient = (id) => ({
  id,
  leito: id + 1,
  nome: "",
  dataNascimento: "",
  sexo: "",
  procedencia: "",
  diagnostico: "",
  historiaClinica: "",
  comorbidades: "",
  dataInternacao: "",
  dataIntubacao: "",
  dataExtubacao: "",
  dataTQT: "",
  dataDecanulacao: "",
  peso: "",
  saps3: {
    origemMapped: "",
    diasHospital: "",
    vasopressorPre: false,
    motivoAdmissao: "",
    infeccaoAdmissao: "",
    comorbidades: [],
  },
  neuro: {
    glasgowAO: "",
    glasgowRV: "",
    glasgowRM: "",
    rass: "",
    sedacao: false,
    drogasSedacao: [],
  },
  cardio: { dva: false, drogasDVA: [] },
  physio: {
    suporte: "",
    parametro: "",
    fiO2: "",
    peep: "",
    totNumero: "",
    totRima: "",
    cuff: "",
    secrecao: false,
    secrecaoAspecto: "",
    secrecaoColoracao: "",
    secrecaoQtd: "",
    mobilizacao: [],
    mrcScore: "",
    icuMobilityScale: "",
    anotacoes: "",
    diasAcumuladosVM: 0,
    vmLastStart: "",
  },
  resp: { suporte: "", parametro: "" },
  nutri: {
    peso: "",
    tipoMedicaoPeso: "",
    pesoPredito: "",
    altura: "",
    via: "",
    tipoDieta: "",
    caracteristicasDieta: [],
    vazao: "",
    vomito: false,
    diarreia: false,
    residuo: "",
    metaCal: "",
    metaProt: "",
    atingido: "",
    atingidoAnotacoes: "",
    risco_nutricional: "",
    dataUltimaEvacuacao: "",
    anotacoes: "",
  },
  fono: {
    consistencia: "",
    utensilioAgua: "",
    toleraAgua: false,
    nivel_consciencia: "",
    blue_dye: "",
    degluticao: "",
    voz: "",
    conduta: "",
    compreensao: "",
    expressao_oral: "",
    expressao_oral_detalhe: "",
    inapto_vo: [],
  },
  enfermagem: {
    dor: "",
    hemodialise: false,
    lesaoLocal: "",
    lesaoEstagio: "",
    curativoTipo: "",
    curativoData: "",
    avpLocal: "",
    avpData: "",
    cvcLocal: "",
    cvcData: "",
    svd: false,
    svdData: "",
    sneCm: "",
    sneData: "",
    drenoTipo: "",
    drenoAspecto: "",
    drenoDebito: "",
    precaucao: "",
    anotacoes: "",
    braden_percepcao: "",
    braden_umidade: "",
    braden_atividade: "",
    braden_mobilidade: "",
    braden_nutricao: "",
    braden_friccao: "",
    morse_historico: "",
    morse_diagnostico: "",
    morse_auxilio: "",
    morse_terapiaIV: "",
    morse_marcha: "",
    morse_estadoMental: "",
  },
  gastro: { dataUltimaEvacuacao: "" },
  antibiotics: [
    { name: "", date: "" },
    { name: "", date: "" },
    { name: "", date: "" },
  ],
  antibioticsHistory: [],
  labs: {
    today: { date: "" },
    yesterday: { date: "" },
    dayBefore: { date: "" },
  },
  examHistory: {},
  gasometriaHistory: {},
  customGasometriaCols: [],
  customExamRows: [],
  anotacoes: "",
  checklist: { f: null, a: null, s: null, t: null, h: null, u: null, g: null },
  bh: {
    date: getManausDateStr(),
    accumulated: 0,
    insensibleLoss: 0,
    irrigation: {},
    gains: {},
    losses: {},
    vitals: {},
    customGains: [],
    customLosses: [],
  },
  bh_previous: null,
  hd_prescricao: {
    duracao: "",
    temperatura: "",
    uf: "",
    anticoagulacao: "",
    priming: "",
    sodio: "",
    fluxo_sangue: "",
    fluxo_dialisato: "",
    dialisador: "",
    obs: "",
    nefro: "",
    tec_nefro: "",
    plant_m: "",
    plant_t: "",
    plant_n: "",
  },
  hd_monitoramento: {},
  hd_balanco: { entradas: "", final: "" },
  hd_acesso: {
    fav_local: "",
    fremito: "",
    puncao: "",
    cateter_tipo: "",
    cateter_local: "",
    insercao: "",
    previo: "",
    fluxo: "",
    curativo: [],
    intercorrencias: "",
  },
  hd_anotacoes: {
    inicio: "",
    termino: "",
    texto: "",
    tecnico: "",
    nefro_texto: "",
  },
  hd_insumos: {},
});

const mergePatientData = (def, db) => {
  const m = { ...def, ...db };
  [
    "saps3",
    "neuro",
    "resp",
    "cardio",
    "renal",
    "gastro",
    "pele",
    "dispositivos",
    "seguranca",
    "fono",
    "bh",
    "physio",
    "nutri",
    "enfermagem",
  ].forEach((k) => {
    const currentData = db[k] || {};
    if (
      k === "physio" &&
      currentData.mobilizacao &&
      typeof currentData.mobilizacao === "string"
    ) {
      m[k] = { ...def[k] };
    } else {
      m[k] = { ...def[k], ...currentData };
    }
  });
  if (m.nutri && m.nutri.pesoIdeal && !m.nutri.pesoPredito) {
    m.nutri.pesoPredito = m.nutri.pesoIdeal;
  }
  if (!m.examHistory) m.examHistory = {};
  if (!m.gasometriaHistory) m.gasometriaHistory = {};
  if (!m.customGasometriaCols) m.customGasometriaCols = [];
  if (!m.labs) m.labs = { today: {}, yesterday: {}, dayBefore: {} };
  if (!m.antibiotics || m.antibiotics.length < 3)
    m.antibiotics = def.antibiotics;
  if (!m.antibioticsHistory) m.antibioticsHistory = [];

  // Merge new HD fields
  if (!m.hd_prescricao) m.hd_prescricao = def.hd_prescricao;
  if (!m.hd_monitoramento) m.hd_monitoramento = def.hd_monitoramento;
  if (!m.hd_balanco) m.hd_balanco = def.hd_balanco;
  if (!m.hd_acesso) m.hd_acesso = def.hd_acesso;
  if (!m.hd_anotacoes) m.hd_anotacoes = def.hd_anotacoes;
  if (!m.hd_insumos) m.hd_insumos = def.hd_insumos;

  return m;
};

const syncLabsFromHistory = (patient) => {
  const p = JSON.parse(JSON.stringify(patient));
  const mapFullToShort = {
    Leucócitos: "leuco",
    Ureia: "ureia",
    Creatinina: "creat",
    "Na (Sódio)": "na",
    "K (Potássio)": "k",
  };
  const today = getManausDateStr();
  const yest = subtractDays(today, 1);
  const dbef = subtractDays(today, 2);

  p.labs = {
    today: { date: today },
    yesterday: { date: yest },
    dayBefore: { date: dbef },
  };

  ["today", "yesterday", "dayBefore"].forEach((per) => {
    Object.keys(mapFullToShort).forEach((k) => {
      p.labs[per][mapFullToShort[k]] = "";
    });
  });

  const periods = [
    { k: "today", d: today },
    { k: "yesterday", d: yest },
    { k: "dayBefore", d: dbef },
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

const ensureBHStructure = (p) => {
  const safeP = { ...p };
  const bh = safeP.bh || {};
  safeP.bh = {
    date: bh.date || getManausDateStr(),
    accumulated: bh.accumulated || 0,
    insensibleLoss: bh.insensibleLoss || 0,
    irrigation: bh.irrigation || {},
    gains: bh.gains || {},
    losses: bh.losses || {},
    vitals: bh.vitals || {},
    customGains: bh.customGains || [],
    customLosses: bh.customLosses || [],
  };
  if (safeP.bh_previous === undefined) safeP.bh_previous = null;
  return safeP;
};

const calculateTotals = (bh) => {
  if (!bh)
    return {
      totalGains: 0,
      totalLosses: 0,
      totalIrrigation: 0,
      dailyBalance: 0,
      accumulated: 0,
    };
  let totalGains = 0;
  let totalLosses = 0;
  let totalIrrigation = 0;
  if (bh.irrigation)
    Object.values(bh.irrigation).forEach(
      (v) => (totalIrrigation += safeNumber(v))
    );
  if (bh.gains)
    Object.values(bh.gains).forEach((h) =>
      Object.values(h).forEach((v) => (totalGains += safeNumber(v)))
    );
  if (bh.losses)
    Object.values(bh.losses).forEach((h) =>
      Object.values(h).forEach((v) => (totalLosses += safeNumber(v)))
    );
  const adjustedTotalLosses = totalLosses - totalIrrigation;
  const insensible = safeNumber(bh.insensibleLoss);
  const dailyBalance = totalGains - (adjustedTotalLosses + insensible);
  const accumulated = safeNumber(bh.accumulated) + dailyBalance;
  return {
    totalGains,
    totalLosses: adjustedTotalLosses,
    totalIrrigation,
    dailyBalance,
    accumulated,
  };
};

const calculateGlasgowTotal = (p) => {
  if (!p.neuro) return 0;
  const getVal = (s) => parseInt(s?.split(" ")[0]) || 0;
  const ao = getVal(p.neuro.glasgowAO);
  const rv = p.neuro.glasgowRV?.startsWith("T") ? 1 : getVal(p.neuro.glasgowRV);
  const rm = getVal(p.neuro.glasgowRM);
  return ao + rv + rm;
};

// CÁLCULO DE DIURESE DAS ÚLTIMAS 12 HORAS CRUZANDO O RESET
const calculateDiurese12hMlKgH = (patient) => {
  const weight = safeNumber(patient.nutri?.peso);
  if (!weight || weight <= 0) return "---";

  const safePatient = ensureBHStructure(patient);
  const currentHourStr = String(new Date().getHours()).padStart(2, "0") + ":00";
  let currentIndex = BH_HOURS.indexOf(currentHourStr);
  if (currentIndex === -1) currentIndex = 0;

  let diureseBruta = 0;
  let irrigacao = 0;

  for (let i = 0; i < 12; i++) {
    let checkIndex = currentIndex - i;
    let targetBH = safePatient.bh;

    if (checkIndex < 0) {
      targetBH = safePatient.bh_previous;
      checkIndex = BH_HOURS.length + checkIndex;
    }

    if (targetBH) {
      const hourStr = BH_HOURS[checkIndex];
      if (targetBH.losses && targetBH.losses[hourStr]) {
        diureseBruta += safeNumber(
          targetBH.losses[hourStr]["Diurese (Total Coletado)"]
        );
      }
      if (targetBH.irrigation && targetBH.irrigation[hourStr]) {
        irrigacao += safeNumber(targetBH.irrigation[hourStr]);
      }
    }
  }

  const diureseLiquida = diureseBruta - irrigacao;
  const result = diureseLiquida / weight / 12;
  return result.toFixed(1);
};

// CÁLCULO DE CLEARANCE DE CREATININA (Cockcroft-Gault) COM BUSCA HISTÓRICA
const calculateCreatinineClearance = (p) => {
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

const calculateEvacDays = (dateStr) => {
  if (!dateStr) return "-";
  const diff = calculateDaysDiff(dateStr, false);
  if (diff === "D0") return "Hoje";
  return diff.replace("D", "") + " dias";
};

// CÁLCULO DE PESO PREDITO (ARDSNet)
const calculatePesoPredito = (altura, sexo) => {
  const h = safeNumber(altura);
  if (h <= 0 || !sexo) return "";
  const hCm = h < 3 ? h * 100 : h; // Aceita m (ex: 1.75) ou cm (ex: 175)
  let predito = 0;
  if (sexo === "M") predito = 50 + 0.91 * (hCm - 152.4);
  else if (sexo === "F") predito = 45.5 + 0.91 * (hCm - 152.4);
  return predito > 0 ? predito.toFixed(1) : "";
};

const extractTextFromPdf = async (file) => {
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

// IA INSISTENTE COM FILTRO ESTRITO ANTI-PAPAGAIO E ANTI-HISTÓRICO
const analyzeTextWithGemini = async (text) => {
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
      7. URINÁLISE/EAS: Ao ler a seção de Urinálise (Urina Tipo I), procure apenas a contagem de leucócitos (ou piócitos) e use a chave "EAS (Leuco/c)". Cuidado para não confundir com a chave "Leucócitos" do Hemograma.

      CHAVES PERMITIDAS (use exatamente estes nomes se encontrar o exame):
      "Hemoglobina", "Hematócrito", "Leucócitos", "Basófilos", "Eosinófilos", "Bastões", "Segmentados", "Linfócitos", "Monócitos", "Plaquetas", "PCR", "Ureia", "Creatinina", "Na (Sódio)", "K (Potássio)", "TGO (AST)", "TGP (ALT)", "GamaGT", "Bilirrubina Total", "Bilirrubina Direta", "Bilirrubina Indireta", "Amilase", "Lipase", "GamaGT", "Fosfatase Alcalina", "Troponina", "CPK Total", "CK-MB", "RNI", "TTPA", "Proteínas Totais", "Albumina", "Ácido úrico", "Ferritina", "DHL", "EAS (Leuco/c)", "HBV", "HCV", "HIV", "VDRL"
      
      TEXTO DO LAUDO: 
      """${text.substring(0, 50000)}"""
      
      RETORNE APENAS UM JSON VÁLIDO NO FORMATO ABAIXO (inclua em 'results' APENAS o que realmente encontrou hoje):
      {
        "patientName": "Nome do Paciente",
        "date": "YYYY-MM-DD",
        "results": {
          "Chave Encontrada": "Valor Extraído"
        }
      }`;

  let lastErrorMsg = "Erro desconhecido";

  const modelsToTry = [
    "gemini-2.5-flash-preview-09-2025",
    "gemini-2.5-flash",
    "gemini-1.5-flash",
  ];

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const currentKey = apiKey || window.apiKey || "";
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          }
        );
        const d = await r.json();

        if (d.error) {
          lastErrorMsg = d.error.message || JSON.stringify(d.error);
          if (d.error.code === 400 || d.error.code === 403) {
            lastErrorMsg =
              "Chave de API inválida ou ausente. O sistema precisa de uma API Key válida para conectar à IA.";
            break;
          }
          if (
            lastErrorMsg.includes("not found") ||
            lastErrorMsg.includes("unregistered callers") ||
            d.error.code === 404
          ) {
            break;
          }
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
  const manual = parseManual(text);
  manual.isFallback = true;
  manual.errorReason = lastErrorMsg;
  return manual;
};

const parseManual = (text) => {
  const res = {};
  const clean = text.replace(/[$~]/g, "").replace(/θ/g, "0");
  const dMatch = clean.match(
    /Data\s*Requisi(?:ção|cao)[\s.:]*(\d{2})[\/-](\d{2})[\/-](\d{4})/i
  );
  let date = getManausDateStr();
  if (dMatch) {
    const [_, d, m, y] = dMatch;
    date = `${y}-${m}-${d}`;
  }
  const nMatch = clean.match(/Nome(?:\s*do\s*Paciente)?\s*:\s*([A-Z\s]+)/i);
  const name = nMatch ? nMatch[1].trim() : "Paciente";
  EXAM_ROWS.forEach((ex) => {
    const k = ex.split("(")[0].trim();
    const r = new RegExp(
      `${k}.*?([0-9]{1,3}(?:\\.[0-9]{3})*(?:,[0-9]+)?)`,
      "i"
    );
    const m = clean.match(r);
    if (m) res[ex] = m[1];
  });
  return { patientName: name, date, results: res };
};

const getLast10Days = () => {
  const d = [];
  const t = getManausDateStr();
  for (let i = 0; i < 10; i++) d.push(subtractDays(t, i));
  return d;
};

// --- APP COMPONENT ---
const App = () => {
  const [pdfReady, setPdfReady] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // STATES
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState("overview");
  const [viewingPreviousBH, setViewingPreviousBH] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("Médico");
  const [newConselho, setNewConselho] = useState(""); // Guarda o CRM/COREN na hora do cadastro
  const [masterCodeInput, setMasterCodeInput] = useState("");
  const [authError, setAuthError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showForceChangePassword, setShowForceChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changePasswordError, setChangePasswordError] = useState(null);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showATBHistoryModal, setShowATBHistoryModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkUploadLogs, setBulkProgress] = useState([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [pdfProcessingStatus, setPdfProcessingStatus] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiEvolution, setAiEvolution] = useState("");
  const [showIndividualUploadModal, setShowIndividualUploadModal] =
    useState(false);
  const [pendingUploadData, setPendingUploadData] = useState(null);

  // NOVOS ESTADOS PARA ADMISSÃO DE PACIENTE
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [admissionData, setAdmissionData] = useState({});
  const [generatedAdmissionText, setGeneratedAdmissionText] = useState("");

  const [showNursingModal, setShowNursingModal] = useState(false);
  const [nursingData, setNursingData] = useState({});
  const [isGeneratingNursingAI, setIsGeneratingNursingAI] = useState(false);
  const [showSapsDetailsModal, setShowSapsDetailsModal] = useState(null);
  const [showPhysioModal, setShowPhysioModal] = useState(false);
  const [showVmFlowsheet, setShowVmFlowsheet] = useState(false);
  // Estados para o Modal da Evolução da Fisioterapia
  const [showPhysioEvoModal, setShowPhysioEvoModal] = useState(false);
  const [physioEvoText, setPhysioEvoText] = useState("");

  // ESTADOS DO TIMEOUT CLÍNICO (PRÉ-EVOLUÇÃO MÉDICA)
  const [showChecklistEvo, setShowChecklistEvo] = useState(false);
  const [checkData, setCheckData] = useState({ estadoGeral: "REG", usaDva: false, dvas: [], usaSedacao: false, sedativos: [], rass: "", glasgow: "", atbs: "" });

  // =========================================================================
  // PASSO 2: FUNÇÕES DO TIMEOUT CLÍNICO (ARQUITETURA POR SISTEMAS)
  // =========================================================================
  const abrirChecklistEvolucao = () => {
    // Agora olhamos o paciente inteiro, dividindo as gavetas corretamente
    const p = currentPatient || {};
    const med = p.medical || {};
    const cardio = p.cardio || {};
    const neuro = p.neuro || {};

    // 1. ANTIBIÓTICOS (Na raiz, perfeito para o Stewardship)
    let atbSalvo = "";
    if (Array.isArray(p.antibiotics) && p.antibiotics.length > 0) {
      atbSalvo = p.antibiotics
        .filter(a => a && a.name)
        .map(a => {
          try { return `${a.name} (${getDaysD0(a.date)})`; }
          catch(e) { return `${a.name} (Início: ${a.date})`; }
        })
        .join(" + ");
    }

    setCheckData({
      estadoGeral: med.estadoGeral || "REG",
      
      // 2. CARDIOVASCULAR (Lendo exatamente de onde você me mostrou)
      usaDva: cardio.dva || false,
      dvas: Array.isArray(cardio.drogasDVA) ? [...cardio.drogasDVA] : [],
      
      // 3. NEUROLÓGICO (Seguindo a sua lógica de sistemas)
      usaSedacao: neuro.sedacao || false,
      sedativos: Array.isArray(neuro.drogasSedacao) ? [...neuro.drogasSedacao] : [],
      rass: neuro.rass || "",
      glasgow: neuro.glasgow || "",
      
      atbs: atbSalvo
    });
    
    setShowChecklistEvo(true);
  };

  const confirmarEGerar = () => {
    // 1. Manda o sistema salvar nas gavetas (como já fazíamos)
    updateNested("medical", null, { ...currentPatient.medical, estadoGeral: checkData.estadoGeral, antibioticosTextoIA: checkData.atbs });
    updateNested("cardio", null, { ...currentPatient.cardio, dva: checkData.usaDva, drogasDVA: checkData.usaDva ? checkData.dvas : [] });
    updateNested("neuro", null, { ...currentPatient.neuro, sedacao: checkData.usaSedacao, drogasSedacao: checkData.usaSedacao ? checkData.sedativos : [], rass: checkData.usaSedacao ? checkData.rass : "", glasgow: !checkData.usaSedacao ? checkData.glasgow : "" });

    setShowChecklistEvo(false);
    
    // 2. A MÁGICA: Dispara a IA entregando a 'maleta' de dados (checkData) direto na mão dela!
    setTimeout(() => {
      generateAIEvolution(checkData); 
    }, 300);
  };
  // =========================================================================

  // Função que compila todos os dados e gera o texto da evolução
  const handleGeneratePhysioEvo = () => {
    const p = currentPatient;
    const physio = p.physio || {};
    const med = p.medical || {};

    // Função auxiliar para somar 7 dias à data de instalação
    const add7Days = (dateStr) => {
      if (!dateStr) return "___/___/___";
      const d = new Date(dateStr + "T12:00:00");
      d.setDate(d.getDate() + 7);
      return d.toLocaleDateString('pt-BR');
    };

    // Puxa a última gasometria registrada da tabela (se houver)
    let gasoText = "Nenhuma gasometria registrada no plantão atual.";
    
    // O seu sistema usa customGasometriaCols ou salva no gasometriaHistory
    const gasoCols = p.customGasometriaCols || Object.keys(p.gasometriaHistory || {});
    
    if (gasoCols.length > 0) {
      // Como o botão "+" (unshift) coloca a nova gasometria no início, pegamos a posição 0.
      const ultimaGasoCol = p.customGasometriaCols ? gasoCols[0] : gasoCols[gasoCols.length - 1];
      const gasoData = p.gasometriaHistory?.[ultimaGasoCol] || {};
      
      gasoText = `Referência: ${ultimaGasoCol}
pH: ${gasoData['pH'] || '--'} | pCO2: ${gasoData['pCO2'] || '--'} | PaO2: ${gasoData['PaO2'] || gasoData['pO2'] || '--'} | HCO3: ${gasoData['HCO3'] || '--'} | BE: ${gasoData['BE'] || '--'} | SatO2: ${gasoData['SatO2'] || '--'}%`;
      
      // Se você tiver lactato na tabela, descomente a linha abaixo e apague a de cima:
      // gasoText += ` | Lac: ${gasoData['Lactato'] || '--'}`;
    }

    // Monta a linha de parâmetros ventilatórios
    let paramText = `Modo: ${physio.parametro || '--'} | PEEP: ${physio.peep || '--'} | FiO2: ${physio.fiO2 || '--'}%`;
    if (physio.parametro === 'VCV') paramText += ` | Vt: ${physio.vt || '--'} ml`;
    if (physio.parametro === 'PCV') paramText += ` | PC: ${physio.pc || '--'} cmH2O`;
    if (physio.parametro === 'PSV') paramText += ` | PS: ${physio.ps || '--'} cmH2O`;

    // Constrói o texto completo
    const textoGerado = `EVOLUÇÃO FISIOTERAPÊUTICA

--- HISTÓRIA E DIAGNÓSTICOS ---
História Clínica: ${p.historiaClinica || med.historiaClinica || 'Não informada'}
Diagnósticos Agudos: ${med.diagnosticosAgudos || 'Não informados'}
Diagnósticos Crônicos: ${med.diagnosticosCronicos || 'Não informados'}

--- AVALIAÇÃO POR SISTEMAS ---
Neurológico: ${physio.sistemaNervoso || 'Sem alterações descritas'}
Respiratório: ${physio.sistemaRespiratorio || 'Sem alterações descritas'}
Cardiovascular: ${physio.sistemaCardiovascular || 'Sem alterações descritas'}
Gastrointestinal/Abdome: ${physio.sistemaDigestivo || 'Sem alterações descritas'}
Musculoesquelético: ${physio.sistemaMusculoesqueletico || 'Sem alterações descritas'}
Estado Geral: ${physio.estadoGeral || 'Não descrito'}

--- GASOMETRIA DO DIA ---
${gasoText}

--- SUPORTE VENTILATÓRIO ---
Suporte Atual: ${physio.suporte || 'Ar Ambiente'}
Tempo de VM: ${typeof getTempoVMText === 'function' ? getTempoVMText(p) : (p.physio?.tempoTotalVM || "Não calculado")}
Parâmetros: ${paramText}
Ajustes realizados: [ DIGITE AQUI OS AJUSTES REALIZADOS NO PLANTÃO ]

Filtro HMEF:
- Instalação: ${physio.dataTrocaHMEF ? new Date(physio.dataTrocaHMEF + "T12:00:00").toLocaleDateString('pt-BR') : '___/___/___'}
- Troca Prevista (7 dias): ${add7Days(physio.dataTrocaHMEF)}

Sistema Fechado de Aspiração (Trach Care):
- Instalação: ${physio.dataTrocaSistemaFechado ? new Date(physio.dataTrocaSistemaFechado + "T12:00:00").toLocaleDateString('pt-BR') : '___/___/___'}
- Troca Prevista (7 dias): ${add7Days(physio.dataTrocaSistemaFechado)}

Pressão do Cuff (cmH2O):
Manhã: ${physio.cuffM || '--'} | Tarde: ${physio.cuffT || '--'} | Noite: ${physio.cuffN || '--'}

--- CONDUTAS E PLANOS ---
Intercorrências:
${physio.intercorrencias || 'Nenhuma intercorrência no plantão.'}

Condutas Fisioterapêuticas:
${physio.condutas || 'Sem condutas descritas.'}

Planos e Metas (Próximo Plantão):
${p.physio?.planoMetas || "Sem planos descritos."}
`;
    
    setPhysioEvoText(textoGerado);
    setShowPhysioEvoModal(true);
  };

  // Função que cria uma nova coluna no Mapa puxando os dados atuais/admissão
  const handleAddVmEntry = () => {
    const flowsheet = Array.isArray(currentPatient.physio?.vmFlowsheet) 
      ? [...currentPatient.physio.vmFlowsheet] 
      : [];
      
    const now = new Date();
    const dataHora = `${now.toLocaleDateString('pt-BR')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // --- IMPORTAÇÃO DIRETA DAS FUNÇÕES NATIVAS (Fonte Única de Verdade) ---
    // Puxa o retorno exato das funções que você já utiliza no sistema
    const diasUtiImportado = typeof getDaysD1 === 'function' ? getDaysD1(currentPatient.dataInternacao) : "";
    const diasVmImportado = typeof getTempoVMText === 'function' ? getTempoVMText(currentPatient) : "";
    // ----------------------------------------------------------------------

    flowsheet.push({
      id: Date.now().toString(),
      dataHora: dataHora,
      diasUti: diasUtiImportado,
      diasVm: diasVmImportado,
      cuffM: currentPatient.physio?.cuffM || "",
      cuffT: currentPatient.physio?.cuffT || "",
      cuffN: currentPatient.physio?.cuffN || "",
      despertarS: false,
      despertarN: false,
      modo: currentPatient.physio?.parametro || "",
      fio2: currentPatient.physio?.fiO2 || "",
      pc: currentPatient.physio?.parametro === "PCV" ? currentPatient.physio?.pc : "",
      vc: currentPatient.physio?.parametro === "VCV" ? currentPatient.physio?.vt : "",
      vtPc: "",
      ps: currentPatient.physio?.parametro === "PSV" ? currentPatient.physio?.ps : "",
      vm: "",
      fluxoInsp: "",
      tInsp: "",
      ie: "",
      frSet: "",
      frTotal: "",
      peep: currentPatient.physio?.peep || "",
      pPico: "",
      pPlato: "",
      dp: "",
      cst: "",  
      cdin: "", 
      rva: "",
      autoPeep: ""
    });

    // Salva a nova coluna no banco de dados do paciente
    updateNested("physio", "vmFlowsheet", flowsheet);
  };

    // Função para atualizar uma célula específica da tabela E calcular DP/Compliância
  const updateVmEntry = (index, field, value) => {
    const flowsheet = [...(currentPatient.physio?.vmFlowsheet || [])];
    let updatedEntry = { ...flowsheet[index], [field]: value };

    // --- MÁGICA DOS CÁLCULOS AUTOMÁTICOS ---
    const plato = parseFloat(updatedEntry.pPlato);
    const peep = parseFloat(updatedEntry.peep);
    const vt = parseFloat(updatedEntry.vcv) || parseFloat(updatedEntry.vtPc); 

    if (!isNaN(plato) && !isNaN(peep)) {
      const dpCalculada = plato - peep;
      updatedEntry.dp = dpCalculada.toFixed(0); 

      if (!isNaN(vt) && dpCalculada > 0) {
        const cstCalculada = vt / dpCalculada;
        updatedEntry.cStDin = cstCalculada.toFixed(1); 
      } else {
        updatedEntry.cStDin = updatedEntry.cStDin || ""; 
      }
    } else {
      if (field === 'pPlato' || field === 'peep') {
        updatedEntry.dp = "";
        updatedEntry.cStDin = "";
      }
    }

    flowsheet[index] = updatedEntry;
    updateNested("physio", "vmFlowsheet", flowsheet);
  };
  const [physioData, setPhysioData] = useState({});
  const [generatedPhysioText, setGeneratedPhysioText] = useState("");

  const [patients, setPatients] = useState(
    Array(11)
      .fill(null)
      .map((_, i) => defaultPatient(i))
  );

  const rawPatient = patients[activeTab] || defaultPatient(0);
  const currentPatient = ensureBHStructure(rawPatient); 

  // VARIÁVEIS DO BALANÇO (ATUAL OU ANTERIOR)
  const displayedBH =
    viewingPreviousBH && currentPatient.bh_previous
      ? currentPatient.bh_previous
      : currentPatient.bh;
  const bhTotals = calculateTotals(displayedBH);

  // Lógica Colunas Gasometria Dinâmicas (Com Motor Cronológico)
  
  // 1. O FUNIL INFINITO: Puxa todo o histórico do paciente + datas customizadas + últimos 10 dias (para espaços em branco)
  const gasoCols = [
    ...Object.keys(currentPatient.gasometriaHistory || {}),
    ...(currentPatient.customGasometriaCols || []),
    ...getLast10Days()
  ];

  // 2. A BALANÇA DO TEMPO: Remove duplicatas e organiza da MAIS RECENTE para a MAIS ANTIGA
  const uniqueGasoCols = [...new Set(gasoCols)].sort((a, b) => {
    const parseDateString = (str) => {
      // A. Se for o formato Padrão do sistema (Ex: 2026-03-23) -> Assume 00:00 do dia
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return new Date(`${str}T00:00:00`).getTime();
      }
      
      // B. Se for o formato Customizado do usuário (Ex: 23/03 - 14h ou 23/03 - 14:30)
      const matchDate = str.match(/^(\d{2})\/(\d{2})/);
      if (matchDate) {
        const day = parseInt(matchDate[1], 10);
        const month = parseInt(matchDate[2], 10) - 1; // Mês no JS começa em 0
        const year = new Date().getFullYear();
        
        // Busca a hora se o usuário digitou (Ex: 14h ou 14:30)
        let hour = 23, min = 59; // Se digitar só o dia, joga pro final do dia para ficar junto
        const matchTime = str.match(/(\d{2})h|(\d{2}):(\d{2})/);
        if (matchTime) {
          if (matchTime[1]) {
            hour = parseInt(matchTime[1], 10); // Formato "14h"
            min = 0;
          } else if (matchTime[2] && matchTime[3]) {
            hour = parseInt(matchTime[2], 10); // Formato "14:30"
            min = parseInt(matchTime[3], 10);
          }
        }
        return new Date(year, month, day, hour, min).getTime();
      }
      return 0; // Se for uma palavra aleatória, joga para o final da fila
    };

    // 3. A INVERSÃO: Maior tempo (Mais novo) na esquerda, menor (Mais velho) na direita
    return parseDateString(b) - parseDateString(a);
  });

  useEffect(() => {
    try {
      const s1 = document.createElement("script");
      s1.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(s1);
      const s2 = document.createElement("script");
      s2.src =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
      s2.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
        setPdfReady(true);
      };
      document.head.appendChild(s2);
    } catch (e) {
      console.error("Erro ao carregar scripts externos:", e);
    }
  }, []);

  // Reseta a visualização do dia anterior se trocar de paciente ou aba
  useEffect(() => {
    setViewingPreviousBH(false);
    setAiEvolution("");
  }, [activeTab, viewMode]);

  // Handlers
  const updateBH = (hour, type, item, value) => {
    const up = [...patients];
    const safeP = ensureBHStructure(up[activeTab]);

    if (type === "vitals") {
      if (!safeP.bh.vitals[hour]) safeP.bh.vitals[hour] = {};
      safeP.bh.vitals[hour][item] = value;
    } else if (type === "irrigation") {
      safeP.bh.irrigation[hour] = value;
    } else {
      if (!safeP.bh[type][hour]) safeP.bh[type][hour] = {};
      safeP.bh[type][hour][item] = value;

      if (type === "losses" && item === "Evacuação") {
        const val = value.trim();
        if (["+", "++", "+++", "++++", "+++++"].includes(val)) {
          if (!safeP.gastro) safeP.gastro = {};
          safeP.gastro.dataUltimaEvacuacao =
            safeP.bh.date || getManausDateStr();
        }
      }

      if (type === "losses" && item === "Diarreia") {
        const val = value.trim().toLowerCase();
        const numVal = parseFloat(val);
        if (
          ["sim", "s"].includes(val) ||
          val.includes("+") ||
          (!isNaN(numVal) && numVal > 0)
        ) {
          if (!safeP.nutri) safeP.nutri = {};
          safeP.nutri.diarreia = true;
        } else if (["não", "nao", "n"].includes(val) || val === "0") {
          if (!safeP.nutri) safeP.nutri = {};
          safeP.nutri.diarreia = false;
        }
      }

      if (type === "losses" && item === "Vômitos") {
        const val = value.trim().toLowerCase();
        const numVal = parseFloat(val);
        if (
          ["sim", "s"].includes(val) ||
          val.includes("+") ||
          (!isNaN(numVal) && numVal > 0)
        ) {
          if (!safeP.nutri) safeP.nutri = {};
          safeP.nutri.vomito = true;
        } else if (["não", "nao", "n"].includes(val) || val === "0") {
          if (!safeP.nutri) safeP.nutri = {};
          safeP.nutri.vomito = false;
        }
      }
    }

    up[activeTab] = safeP;
    setPatients(up);
    if (user && db) setDoc(doc(db, "leitos_uti", `bed_${safeP.id}`), safeP);
  };

  const handleNextDayBH = () => {
    if (
      !window.confirm(
        "Deseja fechar o balanço atual e iniciar um novo dia? O balanço de hoje ficará salvo e acessível no botão do 'Dia Anterior'."
      )
    )
      return;
    const up = [...patients];
    const p = ensureBHStructure(up[activeTab]);
    const { accumulated } = calculateTotals(p.bh);

    p.bh_previous = JSON.parse(JSON.stringify(p.bh));

    p.bh = {
      date: getManausDateStr(),
      accumulated,
      insensibleLoss: p.bh.insensibleLoss,
      gains: {},
      losses: {},
      irrigation: {},
      vitals: {},
      customGains: p.bh.customGains || [],
      customLosses: p.bh.customLosses || [],
    };
    up[activeTab] = p;
    setPatients(up);
    if (user && db) setDoc(doc(db, "leitos_uti", `bed_${p.id}`), p);
  };

  const handlePrintBH = () => window.print();
  const handlePrintHistory = () => {
    const printWindow = window.open("", "_blank");
    const dates = getLast10Days();
    const patient = patients[activeTab];
    let html = `<html><head><title>Histórico</title><style>@page { size: A4 portrait; margin: 20mm 10mm 10mm 10mm; } body { font-family: Arial, sans-serif; font-size: 8px; margin: 0; padding: 0; } .header { display: flex; justify-content: space-between; border-bottom: 2px solid black; padding-bottom: 5px; margin-bottom: 5px; font-weight: bold; font-size: 11px; text-transform: uppercase; } table { width: 100%; border-collapse: collapse; table-layout: fixed; } th, td { border: 1px solid #444; padding: 1px 2px; text-align: center; height: 11px; overflow: hidden; white-space: nowrap; line-height: 1; } th { background-color: #f0f0f0; font-weight: bold; font-size: 8px; } td:first-child, th:first-child { text-align: left; width: 18%; } tr:nth-child(even) { background-color: #f9f9f9; }</style></head><body>`;
    html += `<div class="header"><span>PACIENTE: ${
      patient.nome || "___________________"
    }</span><span>LEITO: ${patient.leito}</span></div>`;
    html += "<table><thead><tr><th>EXAME</th>";
    dates.forEach((d) => (html += `<th>${formatDateDDMM(d)}</th>`));
    html += "</tr></thead><tbody>";
    EXAM_ROWS.forEach((exam) => {
      html += `<tr><td>${formatExamName(exam)}</td>`;
      dates.forEach((d) => {
        const val = patient.examHistory[d]?.[exam] || "";
        html += `<td>${val}</td>`;
      });
      html += "</tr>";
    });
    patient.customExamRows.forEach((exam) => {
      html += `<tr><td>${exam}</td>`;
      dates.forEach((d) => {
        const val = patient.examHistory[d]?.[exam] || "";
        html += `<td>${val}</td>`;
      });
      html += "</tr>";
    });
    html += "</tbody></table></body></html>";
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };

  const handlePrintGasometria = () => {
    const printWindow = window.open("", "_blank");
    const patient = patients[activeTab];
    let html = `<html><head><title>Gasometria Arterial</title><style>@page { size: A4 landscape; margin: 20mm 10mm 10mm 10mm; } body { font-family: Arial, sans-serif; font-size: 10px; margin: 0; padding: 0; } .header { display: flex; justify-content: space-between; border-bottom: 2px solid black; padding-bottom: 5px; margin-bottom: 10px; font-weight: bold; font-size: 12px; text-transform: uppercase; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #444; padding: 6px; text-align: center; } th { background-color: #f0f0f0; } td:first-child, th:first-child { text-align: left; width: 15%; }</style></head><body>`;
    html += `<div class="header"><span>PACIENTE: ${
      patient.nome || "___________________"
    }</span><span>LEITO: ${patient.leito}</span></div>`;
    html +=
      '<h3 style="text-align:center; margin: 5px 0 15px 0;">GASOMETRIA ARTERIAL</h3>';
    html += "<table><thead><tr><th>PARÂMETRO</th>";
    uniqueGasoCols.forEach((col) => {
      const displayCol = col.match(/^\d{4}-\d{2}-\d{2}$/)
        ? formatDateDDMM(col)
        : col;
      html += `<th>${displayCol}</th>`;
    });
    html += "</tr></thead><tbody>";
    GASOMETRIA_PARAMS.forEach((param) => {
      html += `<tr><td><strong>${param}</strong></td>`;
      uniqueGasoCols.forEach((col) => {
        const val = patient.gasometriaHistory?.[col]?.[param] || "";
        html += `<td>${val}</td>`;
      });
      html += "</tr>";
    });
    html += "</tbody></table></body></html>";
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };

  const handleAutoCalcInsensible = () => {
    const p = ensureBHStructure(patients[activeTab]);
    const w = safeNumber(p.nutri?.peso);
    if (!w) return alert("Preencha peso numérico na aba Nutrição");
    const base = w * 0.5 * 24;
    const up = [...patients];
    p.bh.insensibleLoss = Math.round(base);
    up[activeTab] = p;
    setPatients(up);
    if (user && db) setDoc(doc(db, "leitos_uti", `bed_${p.id}`), p);
  };

  const handlePdfUploadAI = async (e) => {
    const f = e.target.files[0];
    e.target.value = null;
    if (!f) return;
    if (!pdfReady) {
      alert("Aguarde sistema PDF...");
      return;
    }
    setPdfProcessingStatus("Lendo...");
    setTimeout(async () => {
      try {
        const txt = await extractTextFromPdf(f);
        const json = await analyzeTextWithGemini(txt);
        if (json.isFallback) {
          alert(
            `Atenção: A conexão com a Inteligência Artificial falhou.\n\nMotivo: ${json.errorReason}\n\nO sistema usou o leitor básico de emergência. Por favor, confira os resultados com atenção.`
          );
        }
        setPendingUploadData({
          date: json.date || getManausDateStr(),
          results: json.results || {},
          patientName: json.patientName || "Desconhecido",
          count: Object.keys(json.results || {}).length,
        });
        setShowIndividualUploadModal(true);
        setPdfProcessingStatus("");
      } catch (err) {
        setPdfProcessingStatus("");
        alert("Erro na leitura do arquivo.");
      }
    }, 100);
  };

  const confirmIndividualUpload = () => {
    if (!pendingUploadData) return;
    const up = [...patients];
    const d = pendingUploadData.date;
    if (!up[activeTab].examHistory[d]) up[activeTab].examHistory[d] = {};
    Object.keys(pendingUploadData.results).forEach((k) => {
      if (pendingUploadData.results[k])
        up[activeTab].examHistory[d][k] = pendingUploadData.results[k];
    });
    up[activeTab] = syncLabsFromHistory(up[activeTab]);
    setPatients(up);
    if (user && db)
      setDoc(doc(db, "leitos_uti", `bed_${up[activeTab].id}`), up[activeTab]);
    setShowIndividualUploadModal(false);
    setPendingUploadData(null);
  };

  const handleBulkUpload = async (e) => {
    const files = Array.from(e.target.files);
    e.target.value = null;
    if (files.length === 0) return;
    if (!pdfReady) {
      alert("Aguarde carregamento do PDF...");
      return;
    }
    setIsProcessingBulk(true);
    setShowBulkModal(true);
    setBulkProgress([]);
    setTimeout(async () => {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setBulkProgress((prev) => [
          ...prev,
          { status: "loading", msg: `Lendo ${file.name}...` },
        ]);
        try {
          const txt = await extractTextFromPdf(file);
          const json = await analyzeTextWithGemini(txt);
          const extName = normalizeName(json.patientName || "");
          const date = json.date || getManausDateStr();
          let matchIdx = -1;
          patients.forEach((p, idx) => {
            const bedName = normalizeName(p.nome);
            if (bedName.length > 3 && extName.length > 3) {
              if (extName.includes(bedName) || bedName.includes(extName)) {
                matchIdx = idx;
              } else {
                const parts = bedName.split(" ");
                if (
                  parts.length >= 2 &&
                  extName.includes(parts[0]) &&
                  extName.includes(parts[parts.length - 1])
                ) {
                  matchIdx = idx;
                }
              }
            }
          });

          if (matchIdx !== -1) {
            setPatients((curr) => {
              const list = [...curr];
              const target = list[matchIdx];
              if (!target.examHistory[date]) target.examHistory[date] = {};
              Object.keys(json.results || {}).forEach((k) => {
                if (json.results[k])
                  target.examHistory[date][k] = json.results[k];
              });
              list[matchIdx] = syncLabsFromHistory(target);
              if (user && db)
                setDoc(doc(db, "leitos_uti", `bed_${target.id}`), target);
              return list;
            });
            setBulkProgress((prev) => {
              const n = [...prev];
              n[n.length - 1] = {
                status: json.isFallback ? "error" : "success",
                msg: `${
                  json.isFallback
                    ? `⚠️ IA Offline (${json.errorReason}):`
                    : "✅"
                } ${json.patientName} (${formatDateDDMM(date)}) -> Leito ${
                  matchIdx + 1
                }`,
              };
              return n;
            });
          } else {
            setBulkProgress((prev) => {
              const n = [...prev];
              n[n.length - 1] = {
                status: "error",
                msg: `⚠️ ${json.patientName || "?"}: Não encontrado.`,
              };
              return n;
            });
          }
        } catch (e) {
          setBulkProgress((prev) => {
            const n = [...prev];
            n[n.length - 1] = { status: "error", msg: `❌ Erro ao ler PDF` };
            return n;
          });
        }
      }
      setIsProcessingBulk(false);
    }, 100);
  };

  // AUTH
  useEffect(() => {
    if (!auth) return;
    try {
      const u = onAuthStateChanged(auth, async (u) => {
        setUser(u);
        if (u && db) {
          const s = await getDoc(doc(db, "users_roles", u.uid));
          if (s.exists()) {
            setUserProfile(s.data());
            if (s.data().isFirstLogin) setShowForceChangePassword(true);
          }
        }
      });
      return () => u();
    } catch (e) {
      console.error("Erro Auth", e);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!auth) return setAuthError("Erro de comunicação com o servidor.");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setAuthError("Erro de acesso. Verifique seu email e senha.");
    }
  };
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!auth || !db) return setAuthError("Erro de sistema.");
    if (masterCodeInput !== CODIGO_MESTRE_RT)
      return setAuthError("Código Inválido");
    
    // Trava de segurança: obriga a digitar o conselho na hora de cadastrar a equipe
    if (!newConselho || newConselho.trim() === "")
      return setAuthError("Obrigatório informar o número do Conselho (Ex: CRM-RO 1234)");

    try {
      const c = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users_roles", c.user.uid), {
        name: newName,
        role: newRole,
        conselho: newConselho, // <--- A MÁGICA ENTRA AQUI!
        email,
        isFirstLogin: true,
      });
      await signOut(auth);
      setIsRegistering(false);
      setNewConselho(""); // Limpa o campo após cadastrar
      alert("Cadastrado com sucesso!");
    } catch {
      setAuthError("Erro ao registrar.");
    }
  };
  const handleForceChangePassword = async (e) => {
    e.preventDefault();
    if (!auth || !db) return;
    if (newPassword.length < 6) return;
    try {
      await updatePassword(user, newPassword);
      await setDoc(
        doc(db, "users_roles", user.uid),
        { isFirstLogin: false },
        { merge: true }
      );
      setShowForceChangePassword(false);
    } catch {}
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!auth) return setAuthError("Erro de comunicação com o servidor.");
    if (!email)
      return setAuthError(
        "Por favor, preencha o campo de Email acima antes de pedir a redefinição."
      );
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      alert(
        "Email de redefinição de senha enviado! Verifique sua caixa de entrada (e a pasta de Spam)."
      );
      setAuthError(null);
    } catch (error) {
      setAuthError(
        "Erro ao tentar enviar email de recuperação. Verifique se o email está correto e se a conta existe."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth); // Faz o logoff seguro no Firebase
      
      // Limpa a memória do aplicativo imediatamente
      setEmail("");
      setPassword("");
      
    } catch (error) {
      console.error("Erro ao sair do sistema:", error);
    }
  };

  useEffect(() => {
    if (!user || !db) return;
    return onSnapshot(collection(db, "leitos_uti"), (snap) => {
      const up = [...patients];
      let ch = false;
      snap.forEach((d) => {
        const dt = d.data();
        // A MÁGICA AQUI: Mudamos de < 10 para < 11 para incluir o Leito Teste!
        if (dt.id >= 0 && dt.id < 11) {
          const sp = mergePatientData(defaultPatient(dt.id), dt);
          up[dt.id] = syncLabsFromHistory(sp);
          ch = true;
        }
      });
      if (ch) setPatients(up);
    });
  }, [user]);

  // Updates
  const save = async (p) => {
    if (user && db) await setDoc(doc(db, "leitos_uti", `bed_${p.id}`), p);
  };
  const updateP = (f, v) => {
    const up = [...patients];
    up[activeTab][f] = v;

    // AUTO-CÁLCULO: Recalcular Peso Predito se o sexo for alterado e já houver altura
    if (f === "sexo") {
      const hVal = up[activeTab].nutri?.altura;
      if (hVal) {
        const pp = calculatePesoPredito(hVal, v);
        if (pp) {
          if (!up[activeTab].nutri) up[activeTab].nutri = {};
          up[activeTab].nutri.pesoPredito = pp;
        }
      }
    }

    setPatients(up);
    save(up[activeTab]);
  };

  const updateNested = (g, f, v) => {
    const up = [...patients];
    if (!up[activeTab][g]) up[activeTab][g] = {};
    up[activeTab][g][f] = v;

    // AUTO-CÁLCULO: Perdas Insensíveis ao inserir o peso
    if (g === "nutri" && f === "peso") {
      const wNum = safeNumber(v);
      if (!up[activeTab].bh) up[activeTab].bh = {};
      up[activeTab].bh.insensibleLoss =
        wNum > 0 ? Math.round(wNum * 0.5 * 24) : 0;
    }

    // AUTO-CÁLCULO: Peso Predito ao inserir a altura
    if (g === "nutri" && f === "altura") {
      const pp = calculatePesoPredito(v, up[activeTab].sexo);
      if (pp) {
        up[activeTab].nutri.pesoPredito = pp;
      } else if (!v) {
        up[activeTab].nutri.pesoPredito = ""; // Limpa se apagar a altura
      }
    }

    setPatients(up);
    save(up[activeTab]);
  };

  const updateHDMonitoramento = (hora, campo, valor) => {
    const up = [...patients];
    if (!up[activeTab].hd_monitoramento) up[activeTab].hd_monitoramento = {};
    if (!up[activeTab].hd_monitoramento[hora])
      up[activeTab].hd_monitoramento[hora] = {};
    up[activeTab].hd_monitoramento[hora][campo] = valor;
    setPatients(up);
    save(up[activeTab]);
  };

  const updateHDBalanco = (campo, valor) => {
    const up = [...patients];
    if (!up[activeTab].hd_balanco) up[activeTab].hd_balanco = {};
    up[activeTab].hd_balanco[campo] = valor;
    setPatients(up);
    save(up[activeTab]);
  };

  const toggleHDAcessoCurativo = (item) => {
    const up = [...patients];
    if (!up[activeTab].hd_acesso) up[activeTab].hd_acesso = { curativo: [] };
    let arr = up[activeTab].hd_acesso.curativo || [];
    if (arr.includes(item)) {
      arr = arr.filter((i) => i !== item);
    } else {
      arr.push(item);
    }
    up[activeTab].hd_acesso.curativo = arr;
    setPatients(up);
    save(up[activeTab]);
  };

  const handleSuporteChange = (newSuporte) => {
    const up = [...patients];
    const p = up[activeTab];
    if (!p.physio) p.physio = {};
    const oldSuporte = p.physio.suporte;

    if (oldSuporte === "VM" && newSuporte !== "VM") {
      let start = p.physio.vmLastStart;
      if (!start && !p.physio.diasAcumuladosVM && p.dataIntubacao) {
        start = p.dataIntubacao;
      } else if (!start) {
        start = getManausDateStr();
      }
      const a = parseLocalDate(start);
      const b = parseLocalDate(getManausDateStr());
      const diff = Math.max(0, Math.floor((b - a) / 86400000));

      p.physio.diasAcumuladosVM = safeNumber(p.physio.diasAcumuladosVM) + diff;
      p.physio.vmLastStart = "";
    } else if (oldSuporte !== "VM" && newSuporte === "VM") {
      p.physio.vmLastStart = getManausDateStr();
    }
    p.physio.suporte = newSuporte;
    setPatients(up);
    save(p);
  };

  const toggleArrayItem = (g, f, item) => {
    const up = [...patients];
    if (!up[activeTab][g]) up[activeTab][g] = {};
    let arr = up[activeTab][g][f];
    if (!Array.isArray(arr)) {
      arr = [];
    }
    if (arr.includes(item)) up[activeTab][g][f] = arr.filter((i) => i !== item);
    else up[activeTab][g][f] = [...arr, item];
    setPatients(up);
    save(up[activeTab]);
  };

  const updateLab = (per, f, v) => {
    const up = [...patients];
    const p = up[activeTab];
    if (!p.labs) p.labs = { today: {}, yesterday: {}, dayBefore: {} };
    if (!p.labs[per]) p.labs[per] = {};
    p.labs[per][f] = v;

    const dMap = {
      today: p.labs.today.date,
      yesterday: p.labs.yesterday.date,
      dayBefore: p.labs.dayBefore.date,
    };
    const td = dMap[per];

    if (td) {
      if (!p.examHistory[td]) p.examHistory[td] = {};
      const mapShortToFull = {
        leuco: "Leucócitos",
        ureia: "Ureia",
        creat: "Creatinina",
        na: "Na (Sódio)",
        k: "K (Potássio)",
      };
      const fullKey = mapShortToFull[f];
      if (fullKey) p.examHistory[td][fullKey] = v;
    }
    setPatients(up);
    save(p);
  };

  const updateAntibiotic = (i, f, v) => {
    const up = [...patients];
    up[activeTab].antibiotics[i][f] = v;
    setPatients(up);
    save(up[activeTab]);
  };

  const clearAntibiotic = (i) => {
    const up = [...patients];
    const p = up[activeTab];
    const atb = p.antibiotics[i];

    // Arquivar no histórico antes de limpar
    if (atb && atb.name) {
      if (!p.antibioticsHistory) p.antibioticsHistory = [];
      const dDiff = calculateDaysDiff(atb.date, true);
      const daysUsed = dDiff === "Err" ? "?" : dDiff.replace("D", "");
      p.antibioticsHistory.push({
        id: Date.now() + "_" + Math.random().toString(36).substr(2, 9),
        name: atb.name,
        startDate: atb.date,
        endDate: getManausDateStr(),
        duration: `${daysUsed} dia(s)`,
      });
    }

    p.antibiotics[i] = { name: "", date: "" };
    setPatients(up);
    save(p);
  };

  const deleteATBHistoryItem = (id) => {
    if (
      !window.confirm(
        "Excluir este antibiótico do histórico de forma permanente?"
      )
    )
      return;
    const up = [...patients];
    const p = up[activeTab];
    if (p.antibioticsHistory) {
      p.antibioticsHistory = p.antibioticsHistory.filter((h) => h.id !== id);
      setPatients(up);
      save(p);
    }
  };

  const updateChecklist = (i, v) => {
    const up = [...patients];
    up[activeTab].checklist[i] = v;
    setPatients(up);
    save(up[activeTab]);
  };
  const clearDate = (field) => {
    const up = [...patients];
    up[activeTab][field] = "";
    setPatients(up);
    save(up[activeTab]);
  };
  const handleClearData = () => {
    if (
      window.confirm(
        "Limpar leito? ATENÇÃO: Isso excluirá permanentemente os dados do paciente atual e disponibilizará o leito."
      )
    ) {
      const r = defaultPatient(activeTab);
      const up = [...patients];
      up[activeTab] = r;
      setPatients(up);
      save(r);
    }
  };

  const handleAdmitPatient = () => {
    setAdmissionData({
      nome: "",
      sexo: "",
      dataNascimento: "",
      origem: "",
      historia: "",
      exameGeral: "",
      exameACV: "",
      exameAR: "",
      exameABD: "",
      exameExtremidades: "",
      exameNeuro: "",
      ecg_ao: "",
      ecg_rv: "",
      ecg_rm: "",
      ecg_basal_ao: "",
      ecg_basal_rv: "",
      ecg_basal_rm: "",
      rass: "",
      pupilas: "",
      dva: false,
      drogasDVA: [],
      sedacao: false,
      drogasSedacao: [],
      medicamentos: "",
      conscienciaBasal: "",
      mobilidadeBasal: "",
      examesComplementares: "",
      diagAgudos: "",
      diagCronicos: "",
      conduta: "",
      // CAMPOS ATUALIZADOS DO SAPS 3
      saps_origem: "",
      saps_dias: "",
      saps_motivo: "",
      saps_sistema: "",
      saps_infeccao: "",
      saps_sitioInfeccao: "",
      saps_cirurgiaUrgente: false,
      saps_imunossupressao: false,
      saps_comorbidades: [],
    });
    setShowAdmissionModal(true);
  };

  const toggleSAPSComorbidade = (c) => {
    setAdmissionData((prev) => {
      const arr = prev.saps_comorbidades || [];
      if (arr.includes(c)) {
        return { ...prev, saps_comorbidades: arr.filter((i) => i !== c) };
      } else {
        return { ...prev, saps_comorbidades: [...arr, c] };
      }
    });
  };

  const handleFinalizeAdmission = () => {
    if (!admissionData.nome || !admissionData.nome.trim()) {
      return alert(
        "O preenchimento do NOME é obrigatório para admitir o paciente."
      );
    }

    const r = defaultPatient(activeTab);
    r.nome = admissionData.nome.trim().toUpperCase();
    r.sexo = admissionData.sexo || "";
    r.dataNascimento = admissionData.dataNascimento || "";
    r.dataInternacao = getManausDateStr();
    r.bh.date = getManausDateStr();
    r.procedencia = admissionData.origem;
    r.diagnostico = admissionData.diagAgudos;
    r.comorbidades = admissionData.diagCronicos;

    const getVal = (s) => parseInt(s?.split(" ")[0]) || 0;
    const ao = getVal(admissionData.ecg_ao);
    const rv = admissionData.ecg_rv?.startsWith("T")
      ? 1
      : getVal(admissionData.ecg_rv);
    const rm = getVal(admissionData.ecg_rm);
    const totalEcg =
      admissionData.ecg_ao || admissionData.ecg_rv || admissionData.ecg_rm
        ? ao + rv + rm
        : null;
    const ecgText =
      totalEcg !== null
        ? `${totalEcg} (AO:${ao} RV:${
            admissionData.ecg_rv?.startsWith("T") ? "T" : rv
          } RM:${rm})`
        : "-";

    r.neuro.glasgowAO = admissionData.ecg_ao;
    r.neuro.glasgowRV = admissionData.ecg_rv;
    r.neuro.glasgowRM = admissionData.ecg_rm;
    r.neuro.glasgowBasalAO = admissionData.ecg_basal_ao;
    r.neuro.glasgowBasalRV = admissionData.ecg_basal_rv;
    r.neuro.glasgowBasalRM = admissionData.ecg_basal_rm;
    r.neuro.rass = admissionData.rass;

    r.cardio.dva = admissionData.dva;
    r.cardio.drogasDVA = admissionData.drogasDVA || [];

    r.neuro.sedacao = admissionData.sedacao;
    r.neuro.drogasSedacao = admissionData.drogasSedacao || [];

    r.saps3 = {
      origemMapped: admissionData.saps_origem,
      diasHospital: admissionData.saps_dias,
      motivoAdmissao: admissionData.saps_motivo,
      sistemaRazao: admissionData.saps_sistema,
      infeccaoAdmissao: admissionData.saps_infeccao,
      sitioInfeccao: admissionData.saps_sitioInfeccao,
      cirurgiaUrgente: admissionData.saps_cirurgiaUrgente,
      imunossupressao: admissionData.saps_imunossupressao,
      comorbidades: admissionData.saps_comorbidades || [],
    };

    // Lógica para montar a linha do Glasgow Basal no texto
    const basalAo = parseInt(admissionData.ecg_basal_ao?.split(" ")[0]) || 0;
    const basalRv = admissionData.ecg_basal_rv?.startsWith("T") ? 1 : (parseInt(admissionData.ecg_basal_rv?.split(" ")[0]) || 0);
    const basalRm = parseInt(admissionData.ecg_basal_rm?.split(" ")[0]) || 0;
    const totalBasal = (basalAo || basalRv || basalRm) ? (basalAo + basalRv + basalRm) : null;
    
    const basalText = (admissionData.rass && totalBasal !== null) ? `  |  ECG Pré-Sedação: ${totalBasal}` : "";

    const text = `ADMISSÃO NA UTI
NOME: ${admissionData.nome?.toUpperCase() || "-"} (SEXO: ${admissionData.sexo || "-"})
ORIGEM: ${admissionData.origem || "-"}

HISTÓRIA CLÍNICA:
${admissionData.historia || "-"}

EXAME FÍSICO:
GERAL: ${admissionData.exameGeral || "-"}
ACV: ${admissionData.exameACV || "-"}
AR: ${admissionData.exameAR || "-"}
ABD.: ${admissionData.exameABD || "-"}
EXTREMIDADES: ${admissionData.exameExtremidades || "-"}
NEURO: ${admissionData.exameNeuro || "-"}  |  ECG Atual: ${ecgText}  |  RASS: ${admissionData.rass || "-"}${basalText}
PUPILAS: ${admissionData.pupilas || "-"}

SUPORTE:
SEDAÇÃO: ${admissionData.sedacao ? (admissionData.drogasSedacao?.length > 0 ? admissionData.drogasSedacao.join(", ") : "Sim (não especificadas)") : "Não"}
DVA: ${admissionData.dva ? (admissionData.drogasDVA?.length > 0 ? admissionData.drogasDVA.join(", ") : "Sim (não especificadas)") : "Não"}

MEDICAMENTOS DE USO HABITUAL:
${admissionData.medicamentos || "-"}

NÍVEL DE CONSCIÊNCIA BASAL: ${admissionData.conscienciaBasal || "-"}
NÍVEL DE MOBILIDADE BASAL: ${admissionData.mobilidadeBasal || "-"}

EXAMES COMPLEMENTARES:
${admissionData.examesComplementares || "-"}

DIAGNÓSTICOS AGUDOS:
${admissionData.diagAgudos || "-"}

DIAGNÓSTICOS CRÔNICOS:
${admissionData.diagCronicos || "-"}

CONDUTA:
${admissionData.conduta || "-"}`;

    r.historiaClinica = text;

    const up = [...patients];
    up[activeTab] = r;
    setPatients(up);
    save(r);

    setShowAdmissionModal(false);
    setGeneratedAdmissionText(text);
    setViewMode("medical");
  };

  const handleNursingAdmission = () => {
    const p = patients[activeTab].enfermagem || {};
    setNursingData({
      dor: p.dor || "",
      hemodialise: p.hemodialise || false,
      precaucao: p.precaucao || "",
      avpLocal: p.avpLocal || "",
      avpData: p.avpData || "",
      cvcLocal: p.cvcLocal || "",
      cvcData: p.cvcData || "",
      svd: p.svd || false,
      svdData: p.svdData || "",
      sneCm: p.sneCm || "",
      sneData: p.sneData || "",
      drenoTipo: p.drenoTipo || "",
      lesaoLocal: p.lesaoLocal || "",
      curativoTipo: p.curativoTipo || "",
      curativoData: p.curativoData || "",
      braden_percepcao: p.braden_percepcao ?? "",
      braden_umidade: p.braden_umidade ?? "",
      braden_atividade: p.braden_atividade ?? "",
      braden_mobilidade: p.braden_mobilidade ?? "",
      braden_nutricao: p.braden_nutricao ?? "",
      braden_friccao: p.braden_friccao ?? "",
      morse_historico: p.morse_historico ?? "",
      morse_diagnostico: p.morse_diagnostico ?? "",
      morse_auxilio: p.morse_auxilio ?? "",
      morse_terapiaIV: p.morse_terapiaIV ?? "",
      morse_marcha: p.morse_marcha ?? "",
      morse_estadoMental: p.morse_estadoMental ?? "",
    });
    setShowNursingModal(true);
  };

  const handleFinalizeNursingAdmission = () => {
    const reqBraden = [
      "braden_percepcao",
      "braden_umidade",
      "braden_atividade",
      "braden_mobilidade",
      "braden_nutricao",
      "braden_friccao",
    ];
    const reqMorse = [
      "morse_historico",
      "morse_diagnostico",
      "morse_auxilio",
      "morse_terapiaIV",
      "morse_marcha",
      "morse_estadoMental",
    ];

    for (let k of [...reqBraden, ...reqMorse]) {
      if (
        nursingData[k] === "" ||
        nursingData[k] === null ||
        nursingData[k] === undefined
      ) {
        alert(
          "O preenchimento de todos os fatores das Escalas de Braden e Morse é obrigatório para concluir a admissão."
        );
        return;
      }
    }

    const up = [...patients];
    const p = up[activeTab];
    if (!p.enfermagem) p.enfermagem = {};
    Object.keys(nursingData).forEach((k) => {
      p.enfermagem[k] = nursingData[k];
    });
    setPatients(up);
    save(p);

    const bradenSum = reqBraden.reduce(
      (s, k) => s + parseInt(nursingData[k]),
      0
    );
    let bradenRisk = "";
    if (bradenSum <= 9) bradenRisk = "Risco Altíssimo";
    else if (bradenSum <= 12) bradenRisk = "Risco Alto";
    else if (bradenSum <= 14) bradenRisk = "Risco Moderado";
    else if (bradenSum <= 18) bradenRisk = "Risco Leve";
    else bradenRisk = "Sem Risco / Risco Mínimo";

    const morseSum = reqMorse.reduce((s, k) => s + parseInt(nursingData[k]), 0);
    let morseRisk = "";
    if (morseSum <= 24) morseRisk = "Risco Baixo";
    else if (morseSum <= 44) morseRisk = "Risco Moderado";
    else morseRisk = "Risco Alto";

    const getLabel = (optArray, val) =>
      optArray.find((o) => String(o.value) === String(val))?.label ||
      String(val);

    let resumoMedico = "Não registrada pelo plantonista médico.";
    if (p.historiaClinica) {
      const match = p.historiaClinica.match(
        /HISTÓRIA CLÍNICA:\n([\s\S]*?)\n\nEXAME FÍSICO:/
      );
      if (match && match[1]) {
        resumoMedico = match[1].trim();
      } else {
        resumoMedico = p.historiaClinica; // Fallback caso o padrão mude
      }
    }

    const text = `ADMISSÃO DE ENFERMAGEM NA UTI
NOME: ${p.nome?.toUpperCase() || "-"}

--- HISTÓRIA CLÍNICA (Resumo Médico) ---
${resumoMedico}

--- DADOS DE ENFERMAGEM ---

CUIDADOS GERAIS:
Escala de Dor: ${nursingData.dor || "-"}
Hemodiálise: ${nursingData.hemodialise ? "Sim" : "Não"}
Precauções: ${nursingData.precaucao || "-"}

DISPOSITIVOS INVASIVOS:
AVP: ${nursingData.avpLocal || "-"} ${
      nursingData.avpData ? `(${formatDateDDMM(nursingData.avpData)})` : ""
    }
CVC/PICC: ${nursingData.cvcLocal || "-"} ${
      nursingData.cvcData ? `(${formatDateDDMM(nursingData.cvcData)})` : ""
    }
SVD: ${nursingData.svd ? `Sim (${formatDateDDMM(nursingData.svdData)})` : "Não"}
SNE: ${nursingData.sneCm ? `${nursingData.sneCm} cm` : "-"} ${
      nursingData.sneData ? `(${formatDateDDMM(nursingData.sneData)})` : ""
    }
Drenos: ${nursingData.drenoTipo || "-"}

PELE E CURATIVOS:
Lesões: ${nursingData.lesaoLocal || "-"}
Curativos: ${nursingData.curativoTipo || "-"} ${
      nursingData.curativoData
        ? `(${formatDateDDMM(nursingData.curativoData)})`
        : ""
    }

ESCALA DE BRADEN:
Percepção Sensorial: ${getLabel(
      BRADEN_OPTIONS.percepcao,
      nursingData.braden_percepcao
    )}
Umidade: ${getLabel(BRADEN_OPTIONS.umidade, nursingData.braden_umidade)}
Atividade: ${getLabel(BRADEN_OPTIONS.atividade, nursingData.braden_atividade)}
Mobilidade: ${getLabel(
      BRADEN_OPTIONS.mobilidade,
      nursingData.braden_mobilidade
    )}
Nutrição: ${getLabel(BRADEN_OPTIONS.nutricao, nursingData.braden_nutricao)}
Fricção e Cisalhamento: ${getLabel(
      BRADEN_OPTIONS.friccao,
      nursingData.braden_friccao
    )}
>> Total Braden: ${bradenSum} (${bradenRisk})

ESCALA DE MORSE:
Histórico de quedas: ${getLabel(
      MORSE_OPTIONS.historico,
      nursingData.morse_historico
    )}
Diagnóstico secundário: ${getLabel(
      MORSE_OPTIONS.diagnostico,
      nursingData.morse_diagnostico
    )}
Auxílio na marcha: ${getLabel(MORSE_OPTIONS.auxilio, nursingData.morse_auxilio)}
Terapia endovenosa: ${getLabel(
      MORSE_OPTIONS.terapiaIV,
      nursingData.morse_terapiaIV
    )}
Marcha: ${getLabel(MORSE_OPTIONS.marcha, nursingData.morse_marcha)}
Estado mental: ${getLabel(
      MORSE_OPTIONS.estadoMental,
      nursingData.morse_estadoMental
    )}
>> Total Morse: ${morseSum} (${morseRisk})`;

    setShowNursingModal(false);
    setGeneratedAdmissionText(text);
  };

  const handlePhysioAdmission = () => {
    const p = patients[activeTab].physio || {};
    setPhysioData({
      estadoGeral: p.admissao_estadoGeral || "BEG/REG/MEG,\nLOTE, cooperativo, sem queixas sistêmicas no momento da avaliação.",
      sistemaNervoso: p.admissao_sistemaNervoso || "Paciente sedado/sem sedação, sob protocolo de sedação contínua, em uso de xx em x ml/h e xx em x ml/h (BIC), RASS: xx/ escala de Coma de Glasgow: (AO: 4 – RV: 5 – RM:6) = 15T. Paciente consciente e orientado/ rebaixado. Pupilas: Isocóricas / anisocóricas, fotorreagentes / não fotorreagentes, simétricas ou assimétricas, reflexos preservados/ausentes.",
      sistemaRespiratorio: p.admissao_sistemaRespiratorio || "Paciente em ventilação mecânica invasiva, TOT/TQT, N° x, rima x / oxigenoterapia / ar ambiente. Padrão respiratório eupneico/taquipneico/bradipneico. Apresenta expansibilidade torácica simétrica/assimétrica, com predomínio costal/abdominal/misto. Ausculta pulmonar: murmúrio vesicular presente/abolido/diminuído bilateralmente, com presença de estertores crepitantes/roncos/sibilos em bases/apex/hemitorax D ou E. Apresenta tosse eficaz/ineficaz/ausente, com presença/ausência de secreção traqueobrônquica, de aspecto fluido/espesso, coloração clara/amarelada/esverdeada/purulenta/sanguinolenta, em pequena/média/grande quantidade. Paciente com uso/não uso de musculatura acessória, sem sinais de desconforto respiratório/ com sinais de desconforto respiratório (batimento de asa de nariz, tiragem intercostal). SpO₂ mantida em torno de xx%, com suporte ventilatório adequado no momento.",
      sistemaCardiovascular: p.admissao_sistemaCardiovascular || "Paciente sob monitorização cardíaca contínua, apresentando ritmo cardíaco regular/irregular. Estável/instável hemodinamicamente em uso/não uso de drogas vasoativas: xx em x ml/h (BIC) com FC em torno de x bpm,  PA: 95/76 mmHg, PAM: 98mmHg, Tº: 34.7°. Perfusão periférica adequada/reduzida, com extremidades aquecidas/frias, sem cianose, tempo de enchimento capilar </> 3 segundos. Presença/ausência de edema em membros inferiores/superiores (grau ___).",
      sistemaDigestivo: p.admissao_sistemaDigestivo || "Paciente com abdômen plano/globoso/distendido/flácido/semigloboso, indolor/doloroso à palpação. Ruídos hidroaéreos presentes/diminuídos/ausentes. Em uso de dieta oral/enteral/parenteral, por via oral/sonda nasoenteral/nasogástrica/gastrostomia. Paciente com risco baixo/moderado/alto para broncoaspiração, anictérico.",
      sistemaMusculoesqueletico: p.admissao_sistemaMusculoesqueletico || "Força muscular reduzida/preservada (avaliada quando possível). Tônus muscular normotônico/hipotônico/hipertônico. Amplitude de movimento preservada/reduzida em x. Presença de imobilidade no leito, com risco para fraqueza muscular adquirida na UTI. Sem/com sinais de retrações musculares. Independência prévia: x",
      funcionalidade: p.admissao_funcionalidade || "Paciente dependente parcialmente/dependente/independente para mudanças de decúbito e atividades funcionais no leito. Não deambula. Apresenta limitações funcionais decorrentes do estado clínico atual/tempo de internação em UTI.",
      mrcScore: p.mrcScore || "",
      ims: p.icuMobilityScale || "",
      gasoHora: "",
      gaso_pH: "",
      gaso_pCO2: "",
      gaso_PaO2: "",
      gaso_BE: "",
      gaso_HCO3: "",
      gaso_SatO2: "",
      gaso_FiO2: "",
      gaso_PF: "",
      suporte: p.suporte || "",
      parametro: p.parametro || "",
      peep: p.peep || "",
      fiO2: p.fiO2 || "",
      volCorrente: p.volCorrente || "",
      fr: p.fr || "",
      tIns: p.tIns || "",
      relIE: p.relIE || "",
      filtroHMEF: p.filtroHMEF || false,
      dataTrocaHMEF: p.dataTrocaHMEF || "",
      sistemaFechado: p.sistemaFechado || false,
      dataTrocaSistemaFechado: p.dataTrocaSistemaFechado || "",
      cuff: p.cuff || "",
      condutas: p.admissao_condutas || `CONDUTAS FISIOTERAPÊUTICAS:
• Monitorização contínua de sinais vitais e vigilância respiratória;
• Posicionamento funcional e terapêutico em leito com cabeceira a 30° a 45º;
• Avaliação de mecânica ventilatória e parâmetros do ventilador;
• Ajuste e monitorização de parâmetros ventilatórios (desmame/correção assincronias/correção gasometria);
• Higiene brônquica com vibração/compressão torácica/AFE/drenagem postural/estímulo de tosse/bag squeezing;
• Aspiração de vias aéreas sistema aberto/fechado, com retirada de secreção [descrever];
• Técnicas de reexpansão pulmonar com exercícios ventilatórios/EPAP/CPAP recrutamento;
• Mobilização [passiva/ativo-assistida/ativa] de MMSS e MMII (3x10 repetições);
• Sedestação no leito/à beira do leito/poltrona - ortostatismo/marcha assistida/deambulação;

Paciente apresentou boa tolerância às manobras, sem intercorrências hemodinâmicas. Melhora discreta da expansibilidade torácica e redução de secreção espessa em vias aéreas. Mantida estabilidade dos sinais vitais durante todo atendimento.`,
dataIntubacao: p.dataIntubacao || "",
      numeroTOT: p.totNumero || "",
      rimaFixacao: p.totRima || "",
      // --- PUXANDO OS DADOS DA SECREÇÃO BASAL SALVA ---
      secrecao: p.secrecao || false,
      secrecaoAspecto: p.secrecaoAspecto || "",
      secrecaoColoracao: p.secrecaoColoracao || "",
      secrecaoQtd: p.secrecaoQtd || ""
    });
    setShowPhysioModal(true);
  };

  const handleFinalizePhysioAdmission = () => {
    const up = [...patients];
    const p = up[activeTab];
    if (!p.physio) p.physio = {};
    
    p.physio.admissao_estadoGeral = physioData.estadoGeral;
    p.physio.admissao_sistemaNervoso = physioData.sistemaNervoso;
    p.physio.admissao_sistemaRespiratorio = physioData.sistemaRespiratorio;
    p.physio.admissao_sistemaCardiovascular = physioData.sistemaCardiovascular;
    p.physio.admissao_sistemaDigestivo = physioData.sistemaDigestivo;
    p.physio.admissao_sistemaMusculoesqueletico = physioData.sistemaMusculoesqueletico;
    p.physio.admissao_funcionalidade = physioData.funcionalidade;
    
    // Salva o MRC e o IMS no painel principal da fisio também!
    p.physio.mrcScore = physioData.mrcScore;
    p.physio.icuMobilityScale = physioData.ims;
    p.physio.suporte = physioData.suporte;
    p.physio.parametro = physioData.parametro;
    p.physio.peep = physioData.peep;
    p.physio.fiO2 = physioData.fiO2;
    p.physio.volCorrente = physioData.volCorrente;
    p.physio.fr = physioData.fr;
    p.physio.tIns = physioData.tIns;
    p.physio.relIE = physioData.relIE;
    p.physio.filtroHMEF = physioData.filtroHMEF;
    p.physio.dataTrocaHMEF = physioData.dataTrocaHMEF;
    p.physio.sistemaFechado = physioData.sistemaFechado;
    p.physio.dataTrocaSistemaFechado = physioData.dataTrocaSistemaFechado;
    p.physio.cuff = physioData.cuff;
    p.physio.admissao_condutas = physioData.condutas;
    p.dataIntubacao = physioData.dataIntubacao; 
    
    p.physio.totNumero = physioData.numeroTOT;
    p.physio.totRima = physioData.rimaFixacao;
    // Transferindo a avaliação por sistemas da Admissão para o Dia a Dia
    p.physio.estadoGeral = physioData.estadoGeral;
    p.physio.sistemaNervoso = physioData.sistemaNervoso;
    p.physio.sistemaRespiratorio = physioData.sistemaRespiratorio;
    p.physio.sistemaCardiovascular = physioData.sistemaCardiovascular;
    p.physio.sistemaDigestivo = physioData.sistemaDigestivo;
    p.physio.sistemaMusculoesqueletico = physioData.sistemaMusculoesqueletico;
    // --- TRANSFERINDO OS DADOS DA SECREÇÃO BASAL ---
    p.physio.secrecao = physioData.secrecao;
    p.physio.secrecaoAspecto = physioData.secrecaoAspecto;
    p.physio.secrecaoColoracao = physioData.secrecaoColoracao;
    p.physio.secrecaoQtd = physioData.secrecaoQtd;
    
    // --- MÁGICA DA GASOMETRIA AUTOMÁTICA ---
    if (physioData.gasoHora) {
      if (!p.gasometriaHistory) p.gasometriaHistory = {};
      if (!p.customGasometriaCols) p.customGasometriaCols = [];
      
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const colName = `${dd}/${mm} - ${physioData.gasoHora}`;
      
      // Cria a coluna nova na tabela de Gasometria
      if (!p.customGasometriaCols.includes(colName)) {
        p.customGasometriaCols.unshift(colName);
      }
      
      if (!p.gasometriaHistory[colName]) p.gasometriaHistory[colName] = {};
      
      // Injeta os valores
      if (physioData.gaso_pH) p.gasometriaHistory[colName]["pH"] = physioData.gaso_pH;
      if (physioData.gaso_pCO2) p.gasometriaHistory[colName]["pCO2"] = physioData.gaso_pCO2;
      if (physioData.gaso_PaO2) p.gasometriaHistory[colName]["PaO2"] = physioData.gaso_PaO2;
      if (physioData.gaso_BE) p.gasometriaHistory[colName]["BE"] = physioData.gaso_BE;
      if (physioData.gaso_HCO3) p.gasometriaHistory[colName]["HCO3"] = physioData.gaso_HCO3;
      if (physioData.gaso_SatO2) p.gasometriaHistory[colName]["SatO2"] = physioData.gaso_SatO2;
      if (physioData.gaso_FiO2) p.gasometriaHistory[colName]["FiO2"] = physioData.gaso_FiO2;
      if (physioData.gaso_PF) p.gasometriaHistory[colName]["P/F"] = physioData.gaso_PF;
    }

    setPatients(up);
    save(p);

    const mrcText = physioData.mrcScore ? `\nESCORE MRC: ${physioData.mrcScore}` : "";
    const imsText = physioData.ims ? `\nICU MOBILITY SCALE (IMS): ${physioData.ims}` : "";
    
    let suporteText = "";
    if (physioData.suporte) {
      if (physioData.suporte === "VM") {
        suporteText = `\n\nSUPORTE VENTILATÓRIO: ${physioData.suporte}\nModo: ${physioData.parametro || "-"} | Vol. Corrente: ${physioData.volCorrente || "-"}ml | PEEP: ${physioData.peep || "-"} | FR: ${physioData.fr || "-"} | T.ins: ${physioData.tIns || "-"} | I:E: ${physioData.relIE || "-"} | FiO2: ${physioData.fiO2 || "-"}%`;
      } else if (physioData.suporte === "VNI") {
        suporteText = `\n\nSUPORTE VENTILATÓRIO: ${physioData.suporte}\nModo: ${physioData.parametro || "-"} | FiO2: ${physioData.fiO2 || "-"}%`;
      } else if (physioData.suporte === "Venturi") {
        suporteText = `\n\nSUPORTE VENTILATÓRIO: ${physioData.suporte} - FiO2: ${physioData.fiO2 || "-"}%`;
      } else if (physioData.suporte === "Cateter Nasal" || physioData.suporte === "Máscara não reinalante" || physioData.suporte === "Tubo T") {
        suporteText = `\n\nSUPORTE VENTILATÓRIO: ${physioData.suporte} - Fluxo: ${physioData.parametro || "-"} L/min`;
      } else {
        suporteText = `\n\nSUPORTE VENTILATÓRIO: ${physioData.suporte}`;
      }
    }

    let airwayText = "";
    let itensAirway = [];
    
    // Injeta os dados do TOT se o paciente estiver em VM
    if (physioData.suporte === "VM") {
      if (physioData.dataIntubacao) itensAirway.push(`Intubação: ${physioData.dataIntubacao ? formatDateDDMM(physioData.dataIntubacao) : "-"}`);
      if (physioData.numeroTOT) itensAirway.push(`TOT Nº: ${physioData.numeroTOT}`);
      if (physioData.rimaFixacao) itensAirway.push(`Rima: ${physioData.rimaFixacao}cm`);
    }
    
    if (physioData.cuff) itensAirway.push(`Cuff: ${physioData.cuff} cmH2O`);
    if (physioData.filtroHMEF) itensAirway.push(`Filtro HMEF (Troca: ${physioData.dataTrocaHMEF ? formatDateDDMM(physioData.dataTrocaHMEF) : "Não informada"})`);
    if (physioData.sistemaFechado) itensAirway.push(`Sist. Fechado de Aspiração (Troca: ${physioData.dataTrocaSistemaFechado ? formatDateDDMM(physioData.dataTrocaSistemaFechado) : "Não informada"})`);
    
    if (itensAirway.length > 0) {
      airwayText = `\nVIA AÉREA E DISPOSITIVOS: ${itensAirway.join(" | ")}`;
    }
    
    const gasoText = physioData.gasoHora ? `\n\nGASOMETRIA DE ADMISSÃO (${physioData.gasoHora}):\npH: ${physioData.gaso_pH || "-"} | pCO2: ${physioData.gaso_pCO2 || "-"} | PaO2: ${physioData.gaso_PaO2 || "-"} | BE: ${physioData.gaso_BE || "-"} | HCO3: ${physioData.gaso_HCO3 || "-"} | SatO2: ${physioData.gaso_SatO2 || "-"} | FiO2: ${physioData.gaso_FiO2 || "-"} | P/F: ${physioData.gaso_PF || "-"}` : "";

    // --- BUSCANDO DADOS MÉDICOS DA ADMISSÃO ---
    const historiaMedica = p.historia || "Não descrita no sistema.";
    const diagAgudos = p.diagAgudos || "Não descritos no sistema.";
    const diagCronicos = p.diagCronicos || "Não descritos no sistema.";

    const text = `ADMISSÃO FISIOTERAPÊUTICA NA UTI
NOME: ${p.nome?.toUpperCase() || "-"}

HISTÓRIA CLÍNICA:
${historiaMedica}

DIAGNÓSTICOS AGUDOS:
${diagAgudos}

DIAGNÓSTICOS CRÔNICOS:
${diagCronicos}

ESTADO GERAL:
${physioData.estadoGeral}

SISTEMA NERVOSO:
${physioData.sistemaNervoso}

SISTEMA RESPIRATÓRIO:
${physioData.sistemaRespiratorio}

SISTEMA CARDIOVASCULAR:
${physioData.sistemaCardiovascular}

SISTEMA DIGESTIVO:
${physioData.sistemaDigestivo}

SISTEMA MUSCULOESQUELÉTICO:
${physioData.sistemaMusculoesqueletico}

FUNCIONALIDADE:
${physioData.funcionalidade}${mrcText}${imsText}${suporteText}${airwayText}${gasoText}

${physioData.condutas}`;

    setShowPhysioModal(false);
    setGeneratedPhysioText(text);
  };

  const copyToClipboardFallback = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
      alert("Evolução copiada com sucesso!");
    } catch (err) {
      alert(
        "Não foi possível copiar automaticamente. Selecione o texto e pressione Ctrl+C."
      );
    }
    document.body.removeChild(textArea);
  };

  const handleAddCustomExam = () => {
    const n = prompt("Nome do Novo Exame:");
    if (n) {
      const up = [...patients];
      if (!up[activeTab].customExamRows) up[activeTab].customExamRows = [];
      up[activeTab].customExamRows.push(n);
      setPatients(up);
      save(up[activeTab]);
    }
  };

  const handleLockSAPS3 = () => {
    const up = [...patients];
    const p = up[activeTab];
    const calc = calculateSAPS3Score(p);
    if (!p.saps3) p.saps3 = {};
    p.saps3.isLocked = true;
    p.saps3.lockedScore = calc.score;
    p.saps3.lockedProb = calc.prob;
    p.saps3.lockedDetails = calc.details;
    setPatients(up);
    save(p);
  };

  const handleUnlockSAPS3 = () => {
    if(!window.confirm("Atenção: Destravar o SAPS 3 fará com que a pontuação seja recalculada com os dados atuais de sinais e exames. Deseja continuar?")) return;
    const up = [...patients];
    const p = up[activeTab];
    if (p.saps3) {
      p.saps3.isLocked = false;
    }
    setPatients(up);
    save(p);
  };

  const generateAIEvolution = async (dadosDoTimeout = null) => {
    setIsGeneratingAI(true);
    let success = false;
    let lastError = "";

    const atbsText =
      currentPatient.antibiotics
        .map((a) => (a.name ? `${a.name} (${getDaysD0(a.date)})` : ""))
        .filter(Boolean)
        .join(", ") || "Nenhum";
    
    const sedativosText = currentPatient.neuro.sedacao
      ? renderValue(currentPatient.neuro.drogasSedacao)
      : "Sem sedação contínua";

      const vitals = currentPatient.bh?.vitals || {};
      let tempMax = 0;
      let spo2Min = 100;
      let hgtVals = [];
      let fcMax = 0;
      let fcMin = 999;
      let pasMax = 0;
      let pasMin = 999;
  
      Object.values(vitals).forEach((v) => {
        if (v && v["Temp (ºC)"]) {
          const t = safeNumber(v["Temp (ºC)"]);
          if (t > tempMax) tempMax = t;
        }
        if (v && v["SpO2 (%)"]) {
          const s = safeNumber(v["SpO2 (%)"]);
          if (s > 0 && s < spo2Min) spo2Min = s;
        }
        if (v && v["HGT (mg/dL)"]) hgtVals.push(safeNumber(v["HGT (mg/dL)"]));
        if (v && v["FC (bpm)"]) {
          const fc = safeNumber(v["FC (bpm)"]);
          if (fc > 0 && fc > fcMax) fcMax = fc;
          if (fc > 0 && fc < fcMin) fcMin = fc;
        }
        if (v && v["PAS"]) {
          const pas = safeNumber(v["PAS"]);
          if (pas > 0 && pas > pasMax) pasMax = pas;
          if (pas > 0 && pas < pasMin) pasMin = pas;
        }
      });
  
      // 1. SINAIS VITAIS STATUS
      const tempStatus = tempMax >= 37.8 ? "Febril" : "Afebril";
      const spo2Status = (spo2Min <= 92 && spo2Min > 0) ? "com baixa SpO2" : "mantendo boa SpO2";
  
      let fcStatus = "eucárdico";
      if (fcMax > 100) fcStatus = "taquicárdico";
      else if (fcMin < 60 && fcMin > 0) fcStatus = "bradicárdico";
  
      let paStatus = "com bom controle pressórico";
      if (pasMin < 90 && pasMin > 0) paStatus = "hipotenso";
      else if (pasMax > 160) paStatus = "hipertenso";
  
      // 2. LABORATÓRIO E INFECÇÃO
      const leucoVal = safeNumber(currentPatient.labs?.today?.leuco);
      let leucoStatus = "leucometria normal";
      if (leucoVal > 0) {
        if (leucoVal < 4000) leucoStatus = "leucopenia";
        else if (leucoVal > 11000) leucoStatus = "leucocitose";
      }
      
      // Lê o Antibiótico direto da maleta do Timeout
      const atbValidado = dadosDoTimeout?.atbs || currentPatient.medical?.antibioticosTextoIA || "";
      const atbsFinal = (!atbValidado || atbValidado.toLowerCase() === "nenhum") 
        ? "sem uso de antibióticos ativos" 
        : `em uso de ${atbValidado}`;

      // 3. DIURESE E FUNÇÃO RENAL
      const diureseNum = parseFloat(calculateDiurese12hMlKgH(currentPatient));
      let diureseStatus = "Diurese não quantificada";
      if (!isNaN(diureseNum)) {
        if (diureseNum < 0.5) diureseStatus = "Baixa diurese";
        else diureseStatus = "Boa diurese";
      }
  
      const crclNum = parseFloat(calculateCreatinineClearance(currentPatient));
      let renalStatus = "função renal não avaliada";
      if (!isNaN(crclNum)) {
        if (crclNum < 60) renalStatus = "função renal alterada";
        else renalStatus = "função renal preservada";
      }
  
      // 4. GASTROINTESTINAL
      const evacDaysStr = calculateEvacDays(currentPatient.gastro?.dataUltimaEvacuacao);
      let evacStatus = "";
      if (evacDaysStr !== "Hoje" && evacDaysStr !== "1 dias" && evacDaysStr !== "2 dias" && evacDaysStr !== "D0" && evacDaysStr !== "-") {
        evacStatus = `Há mais de 2 dias sem evacuar (${evacDaysStr}).`;
      }
  
      const vomito = currentPatient.nutri?.vomito;
      const diarreia = currentPatient.nutri?.diarreia;
      let tgiStatus = "sem episódios de vômito ou diarreia";
      if (vomito && diarreia) tgiStatus = "com episódios de vômito e diarreia";
      else if (vomito) tgiStatus = "com episódios de vômito";
      else if (diarreia) tgiStatus = "com episódios de diarreia";
  
      const viaDieta = currentPatient.nutri?.via ? currentPatient.nutri.via.toLowerCase() : "zero";
  
      // 5. ALTERAÇÕES LABORATORIAIS CRÍTICAS
      const todayStr = getManausDateStr();
      const exToday = currentPatient.examHistory?.[todayStr] || {};
      const hb = safeNumber(exToday["Hemoglobina"]);
      const na = safeNumber(currentPatient.labs?.today?.na);
      const k = safeNumber(currentPatient.labs?.today?.k);
      
      let labsAlterados = [];
      if (hb > 0 && hb < 7) labsAlterados.push("anemia (Hb < 7)");
      if (na > 0 && (na < 135 || na > 145)) labsAlterados.push("distúrbio de sódio");
      if (k > 0 && (k < 3.5 || k > 5.5)) labsAlterados.push("distúrbio de potássio");
      
      const labsText = labsAlterados.length > 0 ? ` Paciente apresenta ${labsAlterados.join(", ")} no laboratório de hoje.` : "";
  
      // 6. HEMODINÂMICA E DVA
      let hemodinamicaStatus = "Hemodinamicamente estável";
      if (currentPatient.bh?.gains) {
        let noraVals = [];
        BH_HOURS.forEach((h) => {
          const v = currentPatient.bh.gains[h]?.["Noradrenalina"];
          if (v !== undefined && v !== "") {
            const num = parseFloat(String(v).replace(",", "."));
            if (!isNaN(num)) noraVals.push(num);
          }
        });
        if (noraVals.length > 0) {
          const last3 = noraVals.slice(-3);
          let instavel = false;
          if (last3.length === 1) instavel = false;
          else if (last3.length === 2) instavel = last3[1] > last3[0];
          else if (last3.length >= 3) instavel = last3[2] > last3[1] || (last3[2] === last3[1] && last3[1] > last3[0]);
          hemodinamicaStatus = instavel ? "Hemodinamicamente instável" : "Hemodinamicamente estável";
        }
      }
  
      const dva = currentPatient.cardio?.dva;
      const drogasDvaList = currentPatient.cardio?.drogasDVA?.join(", ") || "";
      const dvaText = dva ? `em uso de DVA (${drogasDvaList})` : "sem uso de DVA";
  
      // 7. RESPIRATÓRIO E SEDAÇÃO
      const suporte = currentPatient.physio?.suporte || "ar ambiente";
      const parametro = currentPatient.physio?.parametro || "";
      let suporteText = "em ar ambiente";
      if (suporte === "VM") suporteText = "em VM por TOT";
      else if (suporte === "Cateter Nasal" || suporte === "Venturi" || suporte === "VNI" || suporte === "Tubo T") suporteText = `em uso de ${suporte} ${parametro}`;
  
      const sedacaoText = currentPatient.neuro?.sedacao ? "sedado" : "sem sedação";
  
      // --- MONTAGEM DO PROMPT ESTRITO ---
      // =========================================================
      // 1. TRADUÇÃO BLINDADA PARA A IA (Gênero e Estado Geral)
      // =========================================================
      // Ajuste de gênero 
      const sexoPaciente = currentPatient.admission?.sexo === "F" ? "Feminino" : "Masculino";
      const pronome = sexoPaciente === "Feminino" ? "A paciente" : "O paciente";
      
      // Lê o Estado Geral direto da maleta do Timeout (se não tiver, olha o prontuário)
      const egSalvo = dadosDoTimeout?.estadoGeral || currentPatient.medical?.estadoGeral || "REG";
      let egExtenso = "Regular Estado Geral (REG)";
      if (egSalvo === "BEG") egExtenso = "Bom Estado Geral (BEG)";
      if (egSalvo === "MEG") egExtenso = "Mau Estado Geral (MEG)";

      // =========================================================
      // 2. PROMPT DE EVOLUÇÃO (ORDEM DE FERRO)
      // =========================================================
      const promptText = `Você é um médico intensivista sênior redigindo uma evolução diária de UTI.
        Redija a evolução em texto corrido, formal e técnico, formando parágrafos perfeitos e contínuos, seguindo ESTRITAMENTE as regras e os dados abaixo. Não invente dados clínicos que não foram fornecidos.
        NÃO UTILIZE BULLET POINTS, NÚMEROS, OU TÍTULOS DE PARÁGRAFOS (como "Parágrafo 1", "Cardiovascular", etc). Escreva apenas o texto.

        REGRAS DE FORMATAÇÃO E CONDUTA:
        1. Gênero: O paciente é do sexo ${sexoPaciente}. Ajuste TODA a concordância nominal do texto (ex: sedado/sedada, taquicárdico/taquicárdica, mantido/mantida).
        2. Estado Geral: NUNCA escreva "Médio". Utilize rigorosamente a classificação fornecida.
        3. Antibioticoterapia: Utilize EXATAMENTE a seguinte informação sobre antimicrobianos: "${atbsFinal}". Não afirme que está sem antibióticos se houver drogas listadas aqui.
      
        [INÍCIO DO TEXTO]
        ${pronome} encontra-se em ${egExtenso}, ${sedacaoText}, ${suporteText}, ${spo2Status}.
        
        ${hemodinamicaStatus}, ${dvaText}, ${fcStatus}, ${paStatus}.
        
        ${diureseStatus}, com ${renalStatus}.${labsText}
        
        ${tempStatus}, com ${leucoStatus}, ${atbsFinal}.
        
        Dieta ${viaDieta}, ${tgiStatus}. ${evacStatus}
        [FIM DO TEXTO]
        
        Adicione EXATAMENTE esta assinatura no rodapé:
        "Documento gerado e validado eletronicamente por: ${userProfile?.name} - ${userProfile?.role} (${userProfile?.conselho})"
        
        REGRAS CRÍTICAS:
        - Limite-se a conectar e organizar as frases fornecidas no bloco [INÍCIO DO TEXTO] de forma culta e fluida.
        - É EXPRESSAMENTE PROIBIDO adicionar jargões soltos fora deste formato.
        - JAMAIS inclua valores absolutos de exames, pressão ou FC.`;

    const modelsToTry = [
      "gemini-2.5-flash-preview-09-2025",
      "gemini-2.5-flash",
      "gemini-1.5-flash",
    ];

    for (const model of modelsToTry) {
      try {
        const currentKey = apiKeyMed || apiKey || window.apiKey || "";
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptText }] }],
            }),
          }
        );
        const d = await r.json();
        if (d.error) {
          lastError = d.error.message;
          if (d.error.code === 400 || d.error.code === 403) {
            lastError =
              "Chave de API ausente ou inválida. Se estiver rodando o sistema externamente, insira a chave no código.";
            break;
          }
          if (
            lastError.includes("not found") ||
            lastError.includes("unregistered callers") ||
            d.error.code === 404
          ) {
            continue;
          }
          break;
        }
        setAiEvolution(
          d.candidates?.[0]?.content?.parts?.[0]?.text ||
            "Não foi possível gerar a evolução."
        );
        success = true;
        break;
      } catch (e) {
        lastError = e.message;
      }
    }

    if (!success) setAiEvolution(`Erro IA: ${lastError}`);
    setIsGeneratingAI(false);
  };

  // ==========================================
  // IA DA ENFERMAGEM (PROMPT E API)
  // ==========================================
  const buildNursingAIPrompt = (p) => {
    const vitals = p.bh?.vitals && Object.values(p.bh.vitals).length > 0
        ? Object.values(p.bh.vitals).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
        : { "PAS": "NT", "PAD": "NT", "FC (bpm)": "NT", "FR (irpm)": "NT", "SpO2 (%)": "NT", "Temp (ºC)": "NT" };
    
    const glasgowAO = p.neuro?.glasgowAO ? parseInt(p.neuro.glasgowAO) : 0;
    const glasgowRV = p.neuro?.glasgowRV?.startsWith("T") ? 1 : (parseInt(p.neuro?.glasgowRV) || 0);
    const glasgowRM = p.neuro?.glasgowRM ? parseInt(p.neuro.glasgowRM) : 0;
    const glasgowTotal = (glasgowAO + glasgowRV + glasgowRM) || "NT";
    const rass = p.neuro?.rass || "NT";
    const sedacao = p.neuro?.sedacao ? `SIM (${p.neuro?.drogasSedacao?.join(", ") || "N/A"})` : "NÃO";
    
    // REGRA DO NEURO: Define se vai mandar RASS ou Glasgow
    const neuroInfo = p.neuro?.sedacao 
        ? `Sedação: ${sedacao}. RASS: ${rass}` 
        : `Sem sedação contínua. Glasgow Total: ${glasgowTotal}`;

    // REGRA RESPIRATÓRIA: Foram removidos a FiO2 e PEEP da visualização da IA para evitar que ela descreva parâmetros
    const suporteVM = p.physio?.suporte || "Ar Ambiente";
    const secrecao = p.physio?.secrecao ? `SIM (${p.physio?.secrecaoAspecto || "N/A"}, ${p.physio?.secrecaoColoracao || "N/A"})` : "NÃO";
    
    const dva = p.cardio?.dva ? `SIM (${p.cardio?.drogasDVA?.join(", ") || "N/A"})` : "NÃO";
    const nutriVia = p.nutri?.via || "NT";
    const nutriDieta = p.nutri?.tipoDieta || "NT";
    const vomito = p.nutri?.vomito ? "SIM" : "NÃO";
    const diarreia = p.nutri?.diarreia ? "SIM" : "NÃO";
    const diureseTotal = p.bh?.bh?.losses?.["Diurese (Total Coletado)"] || "NT";
    const diureseAspecto = p.enfermagem?.diureseCaracteristica || "NT";

    const lesoes = p.enfermagem?.lesaoLocal || "Pele íntegra / Sem lesões relatadas";
    const curativos = p.enfermagem?.curativoTipo ? `${p.enfermagem.curativoTipo} (Data: ${p.enfermagem.curativoData || "NT"})` : "Nenhum curativo registrado";

    const intercorrencias = p.enfermagem?.intercorrencias || "Nenhuma intercorrência relatada.";
    const condutas = p.enfermagem?.condutas || "Cuidados de rotina de enfermagem mantidos.";

    let hemodinamicaStatus = "Estável hemodinamicamente (sem uso de DVA)";
    if (p.bh?.gains) {
      let noraVals = [];
      if (typeof BH_HOURS !== 'undefined') {
        BH_HOURS.forEach((h) => {
          const v = p.bh.gains[h]?.["Noradrenalina"];
          if (v !== undefined && v !== "") {
            const num = parseFloat(String(v).replace(",", "."));
            if (!isNaN(num)) noraVals.push(num);
          }
        });
      }
      if (noraVals.length > 0) {
        const last3 = noraVals.slice(-3);
        let instavel = false;
        if (last3.length === 1) {
          instavel = false;
        } else if (last3.length === 2) {
          instavel = last3[1] > last3[0];
        } else if (last3.length >= 3) {
          instavel = last3[2] > last3[1] || (last3[2] === last3[1] && last3[1] > last3[0]);
        }
        hemodinamicaStatus = instavel 
          ? "com Instabilidade Hemodinâmica" 
          : "Compensado hemodinamicamente";
      }
    }

    const dispositivos = [
      ...(p.physio?.suporte === "VM" && p.physio?.totNumero ? [`- Tubo Orotraqueal (TOT) #${p.physio.totNumero} (Fixação: ${p.physio.totRima}cm)`] : []),
      ...(p.enfermagem?.cvcLocal ? [`- Cateter Venoso Central (CVC) em ${p.enfermagem.cvcLocal}`] : []),
      ...(p.enfermagem?.avpLocal ? [`- Acesso Venoso Periférico (AVP) em ${p.enfermagem.avpLocal}`] : []),
      ...(p.enfermagem?.svd ? [`- Sonda Vesical de Demora (SVD)`] : []),
      ...(p.enfermagem?.sneData ? [`- Sonda Nasoenteral (SNE) ${p.enfermagem.sneCm ? `a ${p.enfermagem.sneCm}cm` : ""}`] : []),
      ...(p.enfermagem?.drenoTipo ? [`- Dreno ${p.enfermagem.drenoTipo}`] : []),
    ].filter(Boolean);

    return `
DADOS DO PACIENTE:
- Nome: ${p.nome}
- SINAIS VITAIS: PA: ${vitals["PAS"]}/${vitals["PAD"]}, FC: ${vitals["FC (bpm)"]} bpm, FR: ${vitals["FR (irpm)"]} irpm, SpO2: ${vitals["SpO2 (%)"]}%, Temp: ${vitals["Temp (ºC)"]}°C.
- NEURO: ${neuroInfo}.
- RESPIRATÓRIO: Suporte: ${suporteVM}. Secreção: ${secrecao}.
- CARDIO: DVA: ${dva}. STATUS HEMODINÂMICO: ${hemodinamicaStatus}
- GASTRO/NUTRI: Via: ${nutriVia}, Dieta: ${nutriDieta}, Vômito: ${vomito}, Diarréia: ${diarreia}.
- GENI: SVD: ${p.enfermagem?.svd ? "SIM" : "NÃO"}, Diurese Total: ${diureseTotal}, Aspecto da Diurese: ${diureseAspecto}.
- PELE: Lesões: ${lesoes}. Curativos: ${curativos}.
DISPOSITIVOS EM USO:
${dispositivos.length > 0 ? dispositivos.join("\n") : "- Nenhum."}

INSTRUÇÕES PARA A IA (Enfermeiro da UTI):
Escreva a AVALIAÇÃO DE ENFERMAGEM para evolução do plantão baseada nos dados acima. Use linguagem técnica e formal. 

REGRAS CRÍTICAS ESTRITAS:
1. NÃO MENCIONE valores exatos numéricos de PA, FC, FR ou SpO2. Mencione apenas o padrão clínico (ex: normocárdico, taquicárdico, normotenso, eupneico) ou se houve alterações críticas no plantão.
2. No Sistema Respiratório: NÃO MENCIONE o número do TOT, fixação ou parâmetros do ventilador (isso ficará na aba de dispositivos).
3. No Sistema Cardiovascular: NÃO MENCIONE os locais de acesso venoso periférico ou central (AVP/CVC). É OBRIGATÓRIO descrever o paciente exatamente como "${hemodinamicaStatus}".
4. No Sistema Neurológico: Mencione APENAS a escala fornecida no bloco de dados (RASS ou Glasgow), nunca as duas.
5. Não cite doses ou volumes da Noradrenalina.

FORMATO OBRIGATÓRIO:
AVALIAÇÃO ENFERMAGEM:
SISTEMA NEUROLÓGICO : [Texto]
SISTEMA RESPIRATÓRIO: [Texto]
SISTEMA CARDIOVASCULAR: [Texto]
SISTEMA DIGESTÓRIO: [Texto]
SISTEMA GENITURINÁRIO : [Texto]
SISTEMA TEGUMENTAR: [Texto]
DISPOSITIVOS EM USO:
[Exatamente a lista fornecida no bloco de dados, sem alterações]
INTERCORRÊNCIAS:
${intercorrencias}
CONDUTAS:
${condutas}`;
  };

  const generateNursingAI_Evolution = async () => {
    if (!currentPatient) return;
    if (isGeneratingNursingAI) return;
    if (!window.confirm("A Inteligência Artificial irá escrever a evolução baseada nos dados clínicos. Isso apagará o texto existente. Continuar?")) return;

    setIsGeneratingNursingAI(true);
    let success = false;
    let lastError = "";

    try {
      const promptText = buildNursingAIPrompt(currentPatient);
      const modelsToTry = ["gemini-2.5-flash-preview-09-2025", "gemini-2.5-flash", "gemini-1.5-flash"];

      for (const model of modelsToTry) {
        try {
          const currentKey = apiKeyEnf || apiKey || window.apiKey || "";
          const r = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] }),
            }
          );
          const d = await r.json();
          if (d.error) {
            lastError = d.error.message;
            if (d.error.code === 400 || d.error.code === 403) break;
            if (lastError.includes("not found") || d.error.code === 404) continue;
            break;
          }
          
          const aiResponse = d.candidates?.[0]?.content?.parts?.[0]?.text;
          if (aiResponse) {
            updateNested("enfermagem", "anotacoes", aiResponse);
            save(currentPatient);
          }
          success = true;
          break;
        } catch (e) {
          lastError = e.message;
        }
      }
      if (!success) alert(`Erro IA: ${lastError}`);
    } catch (e) {
      alert("Não foi possível gerar a evolução por IA no momento.");
    } finally {
      setIsGeneratingNursingAI(false);
    }
  };  

  const resetPhysio = () => {
    if (
      window.confirm(
        "Isso apagará os dados atuais de fisioterapia deste leito para evitar erros de leitura de registros muito antigos. Deseja continuar?"
      )
    ) {
      const up = [...patients];
      up[activeTab].physio = defaultPatient(activeTab).physio;
      setPatients(up);
      save(up[activeTab]);
    }
  };

  // ==========================================
  // FUNÇÕES PARA LIMPAR A HEMODIÁLISE (PADRÃO OFICIAL DO SISTEMA)
  // ==========================================
  const resetHDMedica = () => {
    if (window.confirm("ATENÇÃO: Deseja apagar a Prescrição Médica e a Evolução?")) {
      const up = [...patients];
      // Puxa o padrão vazio oficial do sistema
      up[activeTab].hd_prescricao = defaultPatient(activeTab).hd_prescricao;
      
      if (up[activeTab].hd_anotacoes) {
        up[activeTab].hd_anotacoes.nefro_texto = "";
      }
      setPatients(up);
      save(up[activeTab]);
    }
  };

  const resetHDTecnico = () => {
    if (window.confirm("ATENÇÃO: Deseja apagar Controles, Balanço e Insumos?")) {
      const up = [...patients];
      const def = defaultPatient(activeTab); // Padrão vazio oficial
      
      up[activeTab].hd_monitoramento = def.hd_monitoramento;
      up[activeTab].hd_balanco = def.hd_balanco;
      up[activeTab].hd_acesso = def.hd_acesso;
      up[activeTab].hd_insumos = def.hd_insumos;
      
      if (up[activeTab].hd_anotacoes) {
        up[activeTab].hd_anotacoes.inicio = "";
        up[activeTab].hd_anotacoes.termino = "";
        up[activeTab].hd_anotacoes.texto = "";
        up[activeTab].hd_anotacoes.tecnico = "";
      }
      setPatients(up);
      save(up[activeTab]);
    }
  };

  const navButtons = [
    { id: "overview", label: "Visita Multi", icon: <Activity size={16} /> },
    { id: "medical", label: "Médico", icon: <Stethoscope size={16} /> },
    { id: "nursing", label: "Enfermeiro", icon: <NurseCap size={16} /> },
    { id: "physio", label: "Fisioterapeuta", icon: <Wind size={16} /> },
    { id: "nutri", label: "Nutrição", icon: <Apple size={16} /> },
    { id: "speech", label: "Fonoaudiologia", icon: <Mic size={16} /> },
    { id: "tech", label: "Téc. em Enf.", icon: <Thermometer size={16} /> },
    { id: "hemodialysis", label: "Hemodiálise", icon: <Filter size={16} /> },
    ...(userProfile?.role === "Gestor" || userProfile?.role === "Administrador"
      ? [
          {
            id: "management",
            label: "Gestão da UTI",
            icon: <Gauge size={16} />,
          },
        ]
      : []),
  ];

  // RBAC - LOGICA DE PERMISSÕES
  const isDocRole =
    userProfile?.role === "Médico" ||
    userProfile?.role === "Gestor" ||
    userProfile?.role === "Administrador";
  const isNursingRole =
    userProfile?.role === "Enfermeiro" ||
    userProfile?.role === "Técnico em Enfermagem" ||
    userProfile?.role === "Gestor" ||
    userProfile?.role === "Administrador";
  
  const isAdmin = userProfile?.role === "Administrador";

  const isEditable = (() => {
    if (isDocRole) return true;
    switch (viewMode) {
      case "medical":
        return false;
      case "nursing":
        return userProfile?.role === "Enfermeiro";
      case "physio":
        return userProfile?.role === "Fisioterapeuta";
      case "nutri":
        return userProfile?.role === "Nutricionista";
      case "speech":
        return userProfile?.role === "Fonoaudiólogo";
      case "tech":
        return (
          userProfile?.role === "Técnico em Enfermagem" ||
          userProfile?.role === "Enfermeiro"
        );
      case "checklist":
        return userProfile?.role === "Enfermeiro";
      case "hemodialysis":
        return isDocRole || isNursingRole;
      case "overview":
        return false;
      case "management":
        return false;
      default:
        return false;
    }
  })();

  const isOverviewEditable = isDocRole;
  const canCloseDay = userProfile?.role === "Enfermeiro" || isOverviewEditable;
  const isBHReadOnly = viewingPreviousBH || !isEditable;

  // FILTRO DE ABAS PARA TÉCNICOS EM ENFERMAGEM
  const visibleNavButtons =
    userProfile?.role === "Técnico em Enfermagem"
      ? navButtons.filter(
          (btn) => btn.id === "tech" || btn.id === "hemodialysis"
        )
      : navButtons;

  // GARANTIR QUE O TÉCNICO NÃO FIQUE PRESO NUMA ABA INVISÍVEL
  useEffect(() => {
    if (
      userProfile?.role === "Técnico em Enfermagem" &&
      !["tech", "hemodialysis"].includes(viewMode)
    ) {
      setViewMode("tech");
    }
  }, [userProfile?.role, viewMode]);

  // FALLBACK SE FIREBASE NÃO INICIALIZOU CORRETAMENTE NO AMBIENTE
  if (firebaseError || !auth || !db) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md text-center border-t-4 border-red-500">
          <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
          <h1 className="text-xl font-bold text-slate-800 mb-2">
            Conexão Temporariamente Indisponível
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            Ocorreu uma falha ao tentar baixar as bibliotecas essenciais do
            servidor. Isto é um problema temporário na sua conexão ou no
            servidor. Pressione F5 para tentar novamente.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-md"
          >
            Recarregar a Página
          </button>
        </div>
      </div>
    );
  }

  if (!user)
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md">
          <h1 className="text-2xl font-bold text-center text-slate-800 mb-1">
            UTI Municipal de Ariquemes
          </h1>
          <p className="text-center text-slate-400 text-sm mb-6">
            Sys4U - Acesso Restrito
          </p>

          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            <button
              onClick={() => {
                setIsRegistering(false);
                setAuthError(null);
              }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg ${
                !isRegistering ? "bg-white shadow" : "text-slate-400"
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => {
                setIsRegistering(true);
                setAuthError(null);
              }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg ${
                isRegistering ? "bg-white shadow" : "text-slate-400"
              }`}
            >
              Cadastrar
            </button>
          </div>

          <form
            onSubmit={isRegistering ? handleRegister : handleLogin}
            className="space-y-4"
          >
            {isRegistering && (
              <>
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                  <input
                    type="password"
                    value={masterCodeInput}
                    onChange={(e) => setMasterCodeInput(e.target.value)}
                    placeholder="Código Mestre"
                    className="w-full bg-transparent outline-none text-sm text-center"
                    required
                  />
                </div>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nome Completo"
                  className="w-full p-3 border rounded-xl text-sm"
                  required
                />
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full p-3 border rounded-xl text-sm"
                >
                  {PROFISSOES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
                <input
                 type="text"
                 placeholder="Nome e Nº do Conselho (Ex: CRM-RO 1234)"
                 value={newConselho}
                 onChange={(e) => setNewConselho(e.target.value)}
                 className="w-full p-2 border rounded mb-3"
                />
              </>
            )}

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              placeholder="Email"
              className="w-full p-3 border rounded-xl"
              required
            />

            <div className="space-y-1">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Senha"
                className="w-full p-3 border rounded-xl"
                required={!isRegistering && !isLoading}
              />
              {!isRegistering && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={isLoading}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}
            </div>

            {authError && (
              <p className="text-red-500 text-xs text-center">{authError}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold"
            >
              {isLoading ? "..." : isRegistering ? "Cadastrar" : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-20 relative">
      <style>{`
          @media print {
            @page { size: ${
              showHistoryModal ? "portrait" : "portrait"
            }; margin: 10mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; background: white !important; }
            .print\\:hidden { display: none !important; }
            .print\\:flex { display: flex !important; }
            .print\\:block { display: block !important; }
            .print\\:break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
            main { width: 100% !important; padding: 0 !important; margin: 0 !important; max-width: none !important; }
            
            /* General Print Overrides */
            input, textarea, select { border: none !important; padding: 0 !important; font-weight: bold !important; background: transparent !important; resize: none !important; appearance: none !important; -webkit-appearance: none !important; }
            
            /* HD Print Mode specific rules */
            body.printing-hd .hd-print-container { display: block !important; width: 100% !important; background: white !important; padding: 0 !important; margin: 0 !important; }
            body.printing-hd #original-header, body.printing-hd .print\\:hidden { display: none !important; }
            body.printing-hd .hd-print-header { display: block !important; text-align: center; margin-bottom: 5px !important; font-weight: bold; font-size: 11px !important; line-height: 1.2; }
            body.printing-hd table { width: 100% !important; border-collapse: collapse; font-size: 9px !important; margin-bottom: 4px !important; }
            body.printing-hd th, body.printing-hd td { border: 1px solid black !important; padding: 1px !important; text-align: center; height: 14px !important; }
            body.printing-hd th { background-color: #f0f0f0 !important; }
            body.printing-hd .text-left { text-align: left !important; }
            body.printing-hd .section-title { background-color: #e0e0e0 !important; font-weight: bold; text-align: center; border: 1px solid black; padding: 2px !important; margin-top: 4px !important; margin-bottom: 2px !important; font-size: 10px !important; }
            body.printing-hd .border { border: 1px solid black !important; }
            body.printing-hd .rounded-xl, body.printing-hd .rounded-lg, body.printing-hd .shadow-sm { border-radius: 0 !important; box-shadow: none !important; }
            body.printing-hd input[type="checkbox"] { display: inline-block !important; width: 10px !important; height: 10px !important; border: 1px solid black !important; margin-right: 2px !important; }
            
            /* Default history/bh printing rules */
            td { height: 13px !important; vertical-align: middle; font-size: 8px !important; padding: 0 !important; overflow: visible !important; }
            th { font-size: 8px !important; padding: 0px !important; height: 13px !important; }
            #print-header { display: flex !important; width: 100%; border-bottom: 2px solid black; margin-bottom: 2px; padding-bottom: 2px; }
            .page-break { page-break-before: always; display: block; height: 1px; }
          }
        `}</style>

      <div
        id="original-header"
        className="bg-gradient-to-r from-blue-700 to-cyan-600 pb-28 pt-8 px-4 md:px-8 shadow-xl print:hidden"
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center text-white">
          <div className="flex items-center gap-4">
            <Activity className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                UTI Municipal de Ariquemes
              </h1>
              <p className="text-blue-100 text-sm font-medium opacity-90">
                Sys4U
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label
              className="bg-white/10 hover:bg-white/20 p-2 rounded-xl text-white transition-all border border-white/10 cursor-pointer"
              title="Upload Lote"
            >
              <FolderInput size={20} />
              <input
                type="file"
                multiple
                accept="application/pdf"
                className="hidden"
                onChange={handleBulkUpload}
              />
            </label>
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold">
                {userProfile?.name || user.email}
              </p>
              <p className="text-xs text-blue-200 bg-white/10 px-2 py-0.5 rounded inline-block">
                {userProfile?.role || "Acesso"}
              </p>
            </div>
            <button
              onClick={handleLogout} 
              className="bg-white/10 p-2 rounded-xl hover:bg-white/20"
              title="Sair do Sistema"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto -mt-20 px-2 md:px-4 print:mt-0 print:p-0">
        <div className="bg-white p-2 rounded-2xl shadow-lg mb-4 flex overflow-x-auto gap-2 scrollbar-hide print:hidden">
          {patients.map((p) => {
            // TRAVA DE SEGURANÇA DO LEITO 11 (SANDBOX)
            // IMPORTANTE: Troque 'isAdmin' pela variável que você usa para identificar o administrador
            if (p.leito === 11 && !isAdmin) return null;

            return (
              <button
                key={p.id}
                onClick={() => setActiveTab(p.id)}
                className={`flex-shrink-0 w-12 h-14 rounded-xl font-bold text-sm transition-all ${
                  activeTab === p.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                <span className="text-[10px] opacity-70 font-normal">Leito</span>
                <br />
                {p.leito}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 mb-6 print:hidden">
          {visibleNavButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setViewMode(btn.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${
                viewMode === btn.id
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-slate-700 text-white hover:bg-slate-600"
              }`}
            >
              {btn.icon} {btn.label}
            </button>
          ))}
        </div>

        <div
          id="original-header"
          className="sticky top-0 z-30 bg-white p-4 shadow-md border-b border-gray-100 print:hidden flex justify-between items-center"
        >
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            {currentPatient.nome || "Leito Disponível"}
            {currentPatient.nome && (userProfile?.role === "Médico" || isAdmin) && (
              <button
                onClick={handleClearData}
                className="text-gray-300 hover:text-red-500 ml-2 print:hidden"
                title="Excluir Paciente / Limpar Leito"
              >
                <Trash2 size={16} />
              </button>
            )}
            {currentPatient.nome && currentPatient.dataNascimento && (
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-lg">
                {calculateAge(currentPatient.dataNascimento)} anos
              </span>
            )}
          </h2>
          <span className="text-lg font-bold text-slate-600 bg-gray-100 px-3 py-1 rounded-lg">
            Leito {currentPatient.leito}
          </span>
        </div>

        <div className="bg-white p-6 rounded-b-3xl shadow-sm border border-gray-100 min-h-[500px] print:shadow-none print:border-none print:p-0 print:m-0 print:rounded-none">
          {!currentPatient.nome ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-500 print:hidden">
              <UserPlus size={64} className="mb-4 text-slate-300" />
              <h3 className="text-xl font-bold mb-2 text-slate-700">
                Leito Vazio
              </h3>
              <p className="text-sm mb-6 text-slate-400">
                Não há paciente internado neste leito no momento.
              </p>
              {(isDocRole || userProfile?.role === "Enfermeiro") && (
                <button
                  onClick={handleAdmitPatient}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md transition-all"
                >
                  <UserPlus size={20} /> Admitir Paciente
                </button>
              )}
            </div>
          ) : (
            <>
              {viewMode === "checklist" && (
                <fieldset
                  disabled={!isEditable}
                  className="min-w-0 border-0 p-0 m-0"
                >
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-blue-600 mb-4 flex items-center gap-2">
                      <ClipboardCheck /> Checklist de Segurança Diária
                    </h2>
                    <div className="grid gap-3">
                      {[
                        { id: "f", l: "Feeding", d: "Dieta adequada?" },
                        { id: "a", l: "Analgesia", d: "Dor controlada?" },
                        { id: "s", l: "Sedation", d: "Sedação leve?" },
                        { id: "t", l: "Thrombo", d: "Profilaxia TVP?" },
                        { id: "h", l: "Head", d: "Cabeceira elevada?" },
                        { id: "u", l: "Ulcer", d: "Prof. Gástrica?" },
                        { id: "g", l: "Glycemic", d: "Glicemia ok?" },
                      ].map((i) => (
                        <div
                          key={i.id}
                          className="flex justify-between items-center p-3 border rounded-lg hover:bg-slate-50"
                        >
                          <div>
                            <p className="font-bold">{i.l}</p>
                            <p className="text-xs text-gray-500">{i.d}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateChecklist(i.id, true)}
                              className={`px-3 py-1 rounded text-xs font-bold ${
                                currentPatient.checklist[i.id] === true
                                  ? "bg-green-500 text-white"
                                  : "bg-gray-100"
                              }`}
                            >
                              SIM
                            </button>
                            <button
                              onClick={() => updateChecklist(i.id, false)}
                              className={`px-3 py-1 rounded text-xs font-bold ${
                                currentPatient.checklist[i.id] === false
                                  ? "bg-red-500 text-white"
                                  : "bg-gray-100"
                              }`}
                            >
                              NÃO
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-3 bg-slate-100 rounded text-sm text-center font-bold">
                      {getPendingText(currentPatient)}
                    </div>
                  </div>
                </fieldset>
              )}

              {viewMode === "management" && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Gauge size={22} className="text-purple-600" /> Gestão da
                      UTI (Indicadores)
                    </h3>
                  </div>
                  <div className="overflow-x-auto border rounded-xl shadow-sm bg-white">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">Leito</th>
                          <th className="p-3">Paciente</th>
                          <th className="p-3 text-center">Dias UTI</th>
                          <th className="p-3 text-center">SAPS 3</th>
                          <th className="p-3 text-center">Mortalidade Esp.</th>
                          <th className="p-3 text-center">Tempo VM</th>
                          <th className="p-3 text-center">Diurese (12h)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patients
                          .filter((p) => p.leito !== 11) // PASSO 4: O filtro mágico que esconde o leito de teste!
                          .map((p) => {
                            if (!p.nome) return null;
                            const saps = calculateSAPS3Score(p);
                            return (
                              <tr
                                key={p.id}
                                className="border-b last:border-0 hover:bg-slate-50 transition-colors"
                              >
                                <td className="p-3 text-center font-bold text-slate-400 bg-slate-50">
                                  {p.leito}
                                </td>
                                <td className="p-3 font-bold text-blue-700">
                                  {p.nome}
                                </td>
                                <td className="p-3 text-center">
                                  {getDaysD1(p.dataInternacao)}
                                </td>
                                <td className="p-3 text-center font-bold text-slate-700">
                                  {p.saps3?.isLocked ? (
                                    <button
                                      onClick={() =>
                                        setShowSapsDetailsModal({
                                          patientName: p.nome,
                                          saps,
                                        })
                                      }
                                      className="flex items-center justify-center gap-1 mx-auto hover:text-purple-600 transition-colors px-2 py-1 rounded hover:bg-purple-50"
                                      title="Ver detalhes da pontuação"
                                    >
                                      {saps.score}{" "}
                                      <FileText
                                        size={14}
                                        className="text-slate-400 hover:text-purple-500"
                                      />
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded">PENDENTE</span>
                                  )}
                                </td>
                                <td className="p-3 text-center font-bold text-red-600 bg-red-50/50">
                                  {p.saps3?.isLocked ? `${saps.prob}%` : "-"}
                                </td>
                                <td className="p-3 text-center font-bold text-red-600 bg-red-50/50">
                                  {saps.prob}%
                                </td>
                                <td className="p-3 text-center font-medium text-cyan-700">
                                  {getTempoVMText(p)}
                                </td>
                                <td className="p-3 text-center font-medium">
                                  {calculateDiurese12hMlKgH(p)}
                                </td>
                              </tr>
                            );
                          })}
                        {!patients.filter((p) => p.leito !== 11).some((p) => p.nome) && (
                          <tr>
                            <td
                              colSpan={7}
                              className="p-6 text-center text-slate-500"
                            >
                              Nenhum paciente internado no momento.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl text-xs text-purple-800">
                    <strong>Nota sobre SAPS 3:</strong> O cálculo utiliza a
                    equação customizada para a América Central e do Sul. Ele
                    rastreia automaticamente o estado clínico inserido na aba
                    admissão, exames laboratoriais das primeiras 48h (D0/D1) e
                    os parâmetros vitais registados para estimar o risco no
                    momento da internação.
                  </div>
                </div>
              )}

              {viewMode === "overview" && (
                <div className="space-y-6 animate-fadeIn text-left">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                      <Activity className="text-blue-500" /> Resumo do Plantão
                    </h3>
                  </div>

                  <fieldset
                    disabled={!isOverviewEditable}
                    className="min-w-0 border-0 p-0 m-0"
                  >
                    {/* CARTÃO SAPS 3 NOVO NA VISITA MULTI */}
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 mb-4 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xs font-bold text-purple-800 uppercase flex items-center gap-2">
                          <Activity size={14} /> Índice de Gravidade (SAPS 3)
                        </h4>
                        {currentPatient.saps3?.isLocked && isOverviewEditable && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleUnlockSAPS3();
                            }}
                            className="text-[10px] bg-purple-200 text-purple-800 px-2 py-1 rounded hover:bg-purple-300 font-bold transition-colors"
                          >
                            Destravar
                          </button>
                        )}
                      </div>

                      {currentPatient.saps3?.isLocked ? (
                        <div className="flex gap-4 items-center">
                          <div className="bg-white px-4 py-2 rounded-lg border border-purple-200">
                            <span className="text-[10px] text-slate-500 font-bold uppercase block">
                              Pontuação
                            </span>
                            <span className="text-xl font-bold text-purple-700">
                              {currentPatient.saps3.lockedScore}
                            </span>
                          </div>
                          <div className="bg-white px-4 py-2 rounded-lg border border-red-200">
                            <span className="text-[10px] text-slate-500 font-bold uppercase block">
                              Mortalidade Esperada
                            </span>
                            <span className="text-xl font-bold text-red-600">
                              {currentPatient.saps3.lockedProb}%
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white p-3 rounded-lg border border-purple-200">
                          {(() => {
                            const missing = getMissingSAPS3(currentPatient);
                            const isReady = missing.length === 0;
                            return (
                              <div className="flex flex-col gap-2">
                                {!isReady ? (
                                  <>
                                    <p className="text-xs font-bold text-slate-600">
                                      Aguardando preenchimento nas primeiras 24h:
                                    </p>
                                    <p className="text-[10px] text-red-600 font-bold bg-red-50 p-2 rounded border border-red-100">
                                      Faltam: {missing.join(", ")}
                                    </p>
                                  </>
                                ) : (
                                  <p className="text-xs font-bold text-green-600 bg-green-50 p-2 rounded border border-green-100 text-center">
                                    Todos os dados clínicos de admissão presentes!
                                  </p>
                                )}
                                <button
                                  disabled={!isReady || !isOverviewEditable}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleLockSAPS3();
                                  }}
                                  className={`py-2 rounded-lg text-xs font-bold text-white transition-colors ${
                                    !isReady || !isOverviewEditable
                                      ? "bg-slate-300 cursor-not-allowed"
                                      : "bg-purple-600 hover:bg-purple-700 shadow-md"
                                  }`}
                                >
                                  {isReady ? "Calcular e Salvar SAPS 3 Definitivo" : "Aguardando Requisitos..."}
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-gray-400 block uppercase">
                          Diagnóstico Principal
                        </span>{" "}
                        <span className="font-medium text-slate-700">
                          {currentPatient.diagnostico || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-400 block uppercase">
                          Procedência
                        </span>{" "}
                        <span className="font-medium text-slate-700">
                          {currentPatient.procedencia || "-"}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 mt-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">
                        Comorbidades / HPP
                      </h4>
                      <p className="text-sm">
                        {currentPatient.comorbidades || "Nenhuma registrada."}
                      </p>
                      <div className="flex gap-4 mt-2 text-xs font-bold text-slate-500 border-t pt-2 border-slate-200">
                        <span>
                          Internação: {getDaysD1(currentPatient.dataInternacao)}
                        </span>
                        <span className="text-cyan-700">
                          Tempo de VM: {getTempoVMText(currentPatient)}
                        </span>
                      </div>
                    </div>
                  </fieldset>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 mt-4">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setHistoryOpen(!historyOpen);
                      }}
                      className="flex items-center gap-2 font-bold text-slate-700 w-full text-left"
                    >
                      {historyOpen ? (
                        <ChevronDown size={20} />
                      ) : (
                        <ChevronRight size={20} />
                      )}{" "}
                      História Clínica
                    </button>
                    {historyOpen && (
                      <div className="mt-3 p-3 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-700 whitespace-pre-wrap min-h-[60px] text-left">
                        {currentPatient.historiaClinica ||
                          "Nenhuma história clínica registrada."}
                      </div>
                    )}
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mt-4">
                    <div className="p-4 bg-cyan-50 border border-cyan-100 rounded-xl">
                      <h4 className="font-bold text-cyan-800 mb-2 flex items-center gap-2">
                        <Wind size={16} /> Ventilação
                      </h4>
                      <p className="text-sm">
                        Suporte:{" "}
                        <b>
                          {currentPatient.physio?.suporte || "Não informado"}
                        </b>
                      </p>
                      {currentPatient.physio?.suporte === "VM" && (
                        <div className="mt-1 text-xs text-cyan-700">
                          <span className="mr-2">
                            Modo:{" "}
                            <b>{currentPatient.physio?.parametro || "-"}</b>
                          </span>
                          <span>
                            PEEP: <b>{currentPatient.physio?.peep || "-"}</b>
                          </span>
                        </div>
                      )}
                      {currentPatient.physio?.fiO2 && (
                        <p className="text-xs text-cyan-600 mt-1">
                          FiO2: {currentPatient.physio.fiO2}%
                        </p>
                      )}
                    </div>

                    <div className="p-4 bg-lime-50 border border-lime-100 rounded-xl">
                      <h4 className="font-bold text-lime-800 mb-2 flex items-center gap-2">
                        <Utensils size={16} /> Nutrição
                      </h4>
                      <p className="text-sm">
                        Via: <b>{currentPatient.nutri?.via || "Zero"}</b>
                      </p>
                      {currentPatient.nutri?.via === "Oral" && (
                        <p className="text-xs text-lime-600 mt-1">
                          Consistência:{" "}
                          <b>{currentPatient.fono?.consistencia || "-"}</b>
                        </p>
                      )}
                      {(currentPatient.nutri?.via === "Enteral" ||
                        currentPatient.nutri?.via === "Parenteral") && (
                        <div className="text-xs text-lime-600 mt-1">
                          <p>
                            Fórmula:{" "}
                            <b>{currentPatient.nutri?.tipoDieta || "-"}</b>
                          </p>
                          <p>
                            Vazão:{" "}
                            <b>{currentPatient.nutri?.vazao || "-"} ml/h</b>
                          </p>
                        </div>
                      )}
                      {currentPatient.nutri?.via === "Mista" && (
                        <div className="text-xs text-lime-600 mt-1">
                          <p>
                            Fórmula (SNE):{" "}
                            <b>{currentPatient.nutri?.tipoDieta || "-"}</b>
                          </p>
                          <p>
                            Vazão:{" "}
                            <b>{currentPatient.nutri?.vazao || "-"} ml/h</b>
                          </p>
                          <p className="mt-1">
                            VO (Consistência):{" "}
                            <b>{currentPatient.fono?.consistencia || "-"}</b>
                          </p>
                        </div>
                      )}
                      {currentPatient.nutri?.caracteristicasDieta?.length >
                        0 && (
                        <div className="mt-1 pt-1 border-t border-lime-200">
                          <p className="text-[11px] text-lime-700 font-medium">
                            Caract.:{" "}
                            {currentPatient.nutri.caracteristicasDieta.join(
                              ", "
                            )}
                          </p>
                        </div>
                      )}
                    </div>

                    {(() => {
                      const checkLossBH = (bh, lossName) => {
                        if (!bh || !bh.losses) return false;
                        for (let h of BH_HOURS) {
                          const val = String(bh.losses[h]?.[lossName] || "")
                            .trim()
                            .toLowerCase();
                          const numVal = parseFloat(val);
                          if (
                            ["sim", "s"].includes(val) ||
                            val.includes("+") ||
                            (!isNaN(numVal) && numVal > 0)
                          )
                            return true;
                        }
                        return false;
                      };

                      const diarreiaHoje = checkLossBH(
                        currentPatient.bh,
                        "Diarreia"
                      );
                      const diarreiaOntem = checkLossBH(
                        currentPatient.bh_previous,
                        "Diarreia"
                      );
                      let diarreiaText = "";
                      if (diarreiaHoje && diarreiaOntem)
                        diarreiaText = "Hoje e Ontem";
                      else if (diarreiaHoje) diarreiaText = "Hoje";
                      else if (diarreiaOntem) diarreiaText = "Ontem";

                      const vomitoHoje = checkLossBH(
                        currentPatient.bh,
                        "Vômitos"
                      );
                      const vomitoOntem = checkLossBH(
                        currentPatient.bh_previous,
                        "Vômitos"
                      );
                      let vomitoText = "";
                      if (vomitoHoje && vomitoOntem)
                        vomitoText = "Hoje e Ontem";
                      else if (vomitoHoje) vomitoText = "Hoje";
                      else if (vomitoOntem) vomitoText = "Ontem";

                      // 1. Calculamos o resultado antes de desenhar a tela
                      const evacResult = calculateEvacDays(currentPatient.gastro?.dataUltimaEvacuacao);

                      // 2. Extraímos apenas os números da resposta (ex: "Há 3 dias" vira 3, "Hoje" vira vazio/NaN)
                      const diasSemEvacuar = parseInt(String(evacResult).replace(/\D/g, ""), 10);

                      // 3. O alerta dispara se for um número válido E maior que 2 (ignorando "hoje" ou "ontem")
                      const isConstipado = 
                        !isNaN(diasSemEvacuar) && 
                        diasSemEvacuar > 2 && 
                        !String(evacResult).toLowerCase().includes("hoje") && 
                        !String(evacResult).toLowerCase().includes("ontem");

                      return (
                        <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
                          <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                            <Activity size={16} /> Eliminações
                          </h4>
                          <p className="text-sm">
                            Últ. Evacuação:{" "}
                            {/* A MÁGICA VISUAL ESTÁ NESTA LINHA: */}
                            <b className={isConstipado ? "text-red-600 font-black bg-red-100 px-1.5 py-0.5 rounded border border-red-300" : "text-slate-800"}>
                              {evacResult}
                            </b>
                          </p>
                          {diarreiaText && (
                            <p className="text-sm mt-1">
                              Diarreia:{" "}
                              <b className="text-red-600">{diarreiaText}</b>
                            </p>
                          )}
                          {vomitoText && (
                            <p className="text-sm mt-1">
                              Vômitos:{" "}
                              <b className="text-red-600">{vomitoText}</b>
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                        <Brain size={14} /> Neurológico
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p>
                          Glasgow:{" "}
                          <b>
                            {currentPatient.neuro.glasgowAO
                              ? calculateGlasgowTotal(currentPatient)
                              : "-"}
                          </b>
                        </p>
                        <p>
                          RASS: <b>{currentPatient.neuro.rass || "-"}</b>
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                        <HeartPulse size={14} /> Cardiovascular
                      </h4>
                      <div className="text-sm">
                        <p>DVA: {currentPatient.cardio.dva ? "Sim" : "Não"}</p>
                        <p>
                          Drogas:{" "}
                          <span
                            className={
                              currentPatient.cardio.dva &&
                              currentPatient.cardio.drogasDVA?.length > 0
                                ? "text-red-600 font-bold"
                                : ""
                            }
                          >
                            {renderValue(currentPatient.cardio.drogasDVA)}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                        <Droplets size={14} /> Renal / BH
                      </h4>
                      <div className="flex flex-col gap-2 text-sm">
                        <p>
                          Diurese (Últ. 12h):{" "}
                          <b>{calculateDiurese12hMlKgH(currentPatient)}</b>{" "}
                          ml/kg/h
                        </p>
                        <p>
                          Clearance Cr:{" "}
                          <b>{calculateCreatinineClearance(currentPatient)}</b>{" "}
                          {calculateCreatinineClearance(currentPatient) !==
                            "Falta Sexo" &&
                          calculateCreatinineClearance(currentPatient) !== "---"
                            ? "ml/min"
                            : ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-xs font-bold text-orange-600 uppercase">
                        Antibióticos Ativos
                      </h4>
                      <button
                        onClick={() => setShowATBHistoryModal(true)}
                        className="text-[10px] bg-orange-200 text-orange-800 px-2 py-1 rounded hover:bg-orange-300 font-bold flex items-center gap-1 transition-colors"
                      >
                        <Clock size={12} /> ATBs Usados
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {currentPatient.antibiotics.map(
                        (a, i) =>
                          a.name && (
                            <span
                              key={i}
                              className="text-xs font-bold bg-white border border-orange-200 px-2 py-1 rounded-lg text-orange-700"
                            >
                              {a.name} ({getDaysD0(a.date)})
                            </span>
                          )
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-blue-800">Laboratório</h3>
                      <button
                        onClick={() => setShowHistoryModal(true)}
                        className="bg-gray-200 text-gray-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <Table size={14} /> Visualizar Histórico
                      </button>
                    </div>
                    <fieldset
                      disabled={!isOverviewEditable}
                      className="min-w-0 border-0 p-0 m-0"
                    >
                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div className="font-bold text-left pt-6">EXAME</div>
                        <div className="bg-slate-100 p-1 rounded font-bold text-slate-500">
                          {formatDateDDMM(currentPatient.labs.dayBefore.date)}
                        </div>
                        <div className="bg-slate-100 p-1 rounded font-bold text-slate-500">
                          {formatDateDDMM(currentPatient.labs.yesterday.date)}
                        </div>
                        <div className="bg-blue-100 p-1 rounded font-bold text-blue-600">
                          {formatDateDDMM(currentPatient.labs.today.date)}
                        </div>
                        {[
                          "Leucócitos",
                          "Ureia",
                          "Creatinina",
                          "Na (Sódio)",
                          "K (Potássio)",
                        ].map((ex) => {
                          const key =
                            ex === "Leucócitos"
                              ? "leuco"
                              : ex === "Ureia"
                              ? "ureia"
                              : ex === "Creatinina"
                              ? "creat"
                              : ex.includes("Na")
                              ? "na"
                              : "k";
                          return (
                            <React.Fragment key={ex}>
                              <div className="text-left py-2 font-medium">
                                {ex}
                              </div>
                              <div className="bg-slate-50 flex items-center justify-center border rounded">
                                {currentPatient.labs.dayBefore[key]}
                              </div>
                              <div className="bg-slate-50 flex items-center justify-center border rounded">
                                {currentPatient.labs.yesterday[key]}
                              </div>
                              <input
                                className="text-center border-2 border-blue-100 rounded focus:border-blue-500 outline-none"
                                value={currentPatient.labs.today[key] || ""}
                                onChange={(e) =>
                                  updateLab("today", key, e.target.value)
                                }
                              />
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </fieldset>
                    <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-xl">
                      <div className="flex justify-between mb-2">
                        <h4 className="text-xs font-bold text-yellow-600 uppercase">
                          Anotações / Pendências
                        </h4>
                        {userProfile?.role === "Médico" && (
                          <Edit3 size={12} className="text-yellow-600" />
                        )}
                      </div>
                      {userProfile?.role === "Médico" ? (
                        <textarea
                          value={currentPatient.anotacoes}
                          onChange={(e) => updateP("anotacoes", e.target.value)}
                          className="w-full bg-transparent border-0 outline-none text-sm text-slate-700 resize-y min-h-[100px] focus:ring-0"
                          placeholder="Digite aqui..."
                        />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap min-h-[50px] text-left">
                          {currentPatient.anotacoes || "Sem pendências."}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* --- MEDICAL --- */}
              {viewMode === "medical" && (
                <fieldset
                  disabled={!isEditable}
                  className="space-y-6 animate-fadeIn min-w-0 border-0 p-0 m-0"
                >
                  {/* EVOLUÇÃO IA */}
                  <div className="bg-white border border-indigo-100 rounded-xl p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-bold text-indigo-800 flex items-center gap-2">
                        <Sparkles size={16} /> Evolução Diária (IA)
                      </h3>
                      <div className="flex gap-2">
                        {aiEvolution && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              copyToClipboardFallback(aiEvolution);
                            }}
                            className="flex items-center gap-1 bg-white border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-indigo-50 transition"
                            title="Copiar texto gerado"
                          >
                            <ClipboardCheck size={14} /> Copiar
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            abrirChecklistEvolucao();
                          }}
                          className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow hover:bg-indigo-700 transition"
                        >
                          {isGeneratingAI ? (
                            <Loader2 className="animate-spin" size={14} />
                          ) : (
                            <Sparkles size={14} />
                          )}{" "}
                          Gerar Evolução
                        </button>
                      </div>
                    </div>
                    {aiEvolution && (
                      <textarea
                        className="w-full bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 text-sm text-slate-700 min-h-[150px] outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
                        value={aiEvolution}
                        onChange={(e) => setAiEvolution(e.target.value)}
                      />
                    )}
                  </div>

                  {/* DADOS CADASTRAIS */}
                  <div className="grid md:grid-cols-5 gap-4 bg-slate-50 p-4 rounded-xl">
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-gray-400">
                        Nome
                      </label>
                      <input
                        type="text"
                        value={currentPatient.nome || ""}
                        onChange={(e) => updateP("nome", e.target.value)}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400">
                        Nascimento
                      </label>
                      <input
                        type="date"
                        value={currentPatient.dataNascimento || ""}
                        onChange={(e) =>
                          updateP("dataNascimento", e.target.value)
                        }
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400">
                        Sexo
                      </label>
                      <select
                        value={currentPatient.sexo || ""}
                        onChange={(e) => updateP("sexo", e.target.value)}
                        className="w-full p-2 border rounded-lg"
                      >
                        <option value="">-</option>
                        <option value="M">M</option>
                        <option value="F">F</option>
                      </select>
                    </div>
                    <div className="md:col-span-1">
                      <label className="text-xs font-bold text-gray-400">
                        Procedência
                      </label>
                      <input
                        type="text"
                        value={currentPatient.procedencia || ""}
                        onChange={(e) => updateP("procedencia", e.target.value)}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                    <div className="md:col-span-5">
                      <label className="text-xs font-bold text-gray-400">
                        Diagnóstico Principal
                      </label>
                      <input
                        type="text"
                        value={currentPatient.diagnostico || ""}
                        onChange={(e) => updateP("diagnostico", e.target.value)}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                    <div className="md:col-span-5">
                      <label className="text-xs font-bold text-gray-400">
                        HPP / Comorbidades
                      </label>
                      <textarea
                        value={currentPatient.comorbidades || ""}
                        onChange={(e) =>
                          updateP("comorbidades", e.target.value)
                        }
                        className="w-full p-2 border rounded-lg h-24"
                      />
                    </div>
                  </div>

                  {/* SÓ DATA ADMISSÃO */}
                  <div>
                    <label className="text-xs font-bold text-gray-400 flex justify-between">
                      Data Admissão{" "}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          clearDate("dataInternacao");
                        }}
                        className={`${!isEditable ? "hidden" : ""}`}
                      >
                        <X size={12} />
                      </button>
                    </label>
                    <input
                      type="date"
                      value={currentPatient.dataInternacao || ""}
                      onChange={(e) =>
                        updateP("dataInternacao", e.target.value)
                      }
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>

                  {/* HISTÓRIA CLÍNICA (EDITÁVEL PELO MÉDICO) */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setHistoryOpen(!historyOpen);
                      }}
                      className="flex items-center gap-2 font-bold text-slate-700 w-full text-left"
                    >
                      {historyOpen ? (
                        <ChevronDown size={20} />
                      ) : (
                        <ChevronRight size={20} />
                      )}{" "}
                      História Clínica
                    </button>
                    {historyOpen && (
                      <textarea
                        value={currentPatient.historiaClinica || ""}
                        onChange={(e) =>
                          updateP("historiaClinica", e.target.value)
                        }
                        className="w-full mt-3 p-3 border border-slate-200 rounded-lg h-32 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-100"
                        placeholder="Digite a história clínica detalhada do paciente..."
                      />
                    )}
                  </div>

                  {/* CARDIO & NEURO */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-4 border rounded-xl bg-red-50/20">
                      <h4 className="font-bold text-red-800 mb-4 flex items-center gap-2">
                        <HeartPulse size={16} /> Cardiovascular
                      </h4>
                      <label className="flex items-center gap-2 mb-2 font-bold">
                        <input
                          type="checkbox"
                          checked={currentPatient.cardio.dva || false}
                          onChange={(e) =>
                            updateNested("cardio", "dva", e.target.checked)
                          }
                        />{" "}
                        DVA (Drogas Vasoativas)
                      </label>
                      {currentPatient.cardio.dva && (
                        <div className="grid grid-cols-2 gap-2 pl-4">
                          {OPCOES_DVA.map((d) => (
                            <label
                              key={d}
                              className="flex items-center gap-1 text-sm cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={currentPatient.cardio.drogasDVA?.includes(
                                  d
                                )}
                                onChange={() =>
                                  toggleArrayItem("cardio", "drogasDVA", d)
                                }
                              />{" "}
                              {d}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="p-4 border rounded-xl bg-indigo-50/20">
                      <h4 className="font-bold text-indigo-800 mb-4 flex items-center gap-2">
                        <Brain size={16} /> Neurológico
                      </h4>
                      <div className="grid md:grid-cols-3 gap-2 mb-2">
                        <select
                          className="p-2 border rounded text-xs"
                          value={currentPatient.neuro.glasgowAO || ""}
                          onChange={(e) =>
                            updateNested("neuro", "glasgowAO", e.target.value)
                          }
                        >
                          <option value="">AO</option>
                          {GLASGOW_AO.map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                        <select
                          className="p-2 border rounded text-xs"
                          value={currentPatient.neuro.glasgowRV || ""}
                          onChange={(e) =>
                            updateNested("neuro", "glasgowRV", e.target.value)
                          }
                        >
                          <option value="">RV</option>
                          {GLASGOW_RV.map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                        <select
                          className="p-2 border rounded text-xs"
                          value={currentPatient.neuro.glasgowRM || ""}
                          onChange={(e) =>
                            updateNested("neuro", "glasgowRM", e.target.value)
                          }
                        >
                          <option value="">RM</option>
                          {GLASGOW_RM.map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      </div>
                      <p className="text-sm font-bold text-blue-600 mb-3 text-right">
                        Total Glasgow: {calculateGlasgowTotal(currentPatient)}
                      </p>

                      <label className="block text-xs font-bold text-gray-500 mb-1">
                        RASS
                      </label>
                      <select
                        className="w-full p-2 border rounded mb-3"
                        value={currentPatient.neuro.rass || ""}
                        onChange={(e) =>
                          updateNested("neuro", "rass", e.target.value)
                        }
                      >
                        <option value="">Selecione...</option>
                        {RASS_OPTS.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>

                      <label className="flex items-center gap-2 mb-2 font-bold">
                        <input
                          type="checkbox"
                          checked={currentPatient.neuro.sedacao || false}
                          onChange={(e) =>
                            updateNested("neuro", "sedacao", e.target.checked)
                          }
                        />{" "}
                        Sedação Contínua
                      </label>
                      {currentPatient.neuro.sedacao && (
                        <div className="grid grid-cols-2 gap-2 pl-4">
                          {OPCOES_SEDATIVOS.map((d) => (
                            <label
                              key={d}
                              className="flex items-center gap-1 text-sm cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={currentPatient.neuro.drogasSedacao?.includes(
                                  d
                                )}
                                onChange={() =>
                                  toggleArrayItem("neuro", "drogasSedacao", d)
                                }
                              />{" "}
                              {d}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ATB */}
                  <div className="p-4 border border-orange-200 bg-orange-50 rounded-xl">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-bold text-orange-700">
                        Prescrição de Antimicrobianos
                      </h4>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setShowATBHistoryModal(true);
                        }}
                        className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded hover:bg-orange-300 font-bold flex items-center gap-1 transition-colors"
                      >
                        <Clock size={14} /> Histórico
                      </button>
                    </div>
                    {currentPatient.antibiotics.map((atb, idx) => {
                      // Verifica se já está fixado (pelo botão ou por ser dado antigo do BD)
                      const isFixed = atb.locked || (atb.name && atb.date && atb.locked !== false);

                      return (
                        <div key={idx} className="flex gap-2 mb-2">
                          {isFixed ? (
                            <>
                              {/* --- MODO FIXADO (SÓ LEITURA) --- */}
                              <div className="flex-1 flex items-center px-3 py-2 bg-orange-100/50 border border-orange-200 rounded-lg text-orange-900 font-bold uppercase overflow-hidden shadow-sm">
                                <Pill size={16} className="mr-2 text-orange-500 flex-shrink-0" />
                                <span className="truncate">{atb.name}</span>
                              </div>
                              <div className="w-32 flex items-center justify-center px-2 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm font-bold text-orange-800 shadow-sm">
                                {formatDateDDMM(atb.date)}
                              </div>
                              <div className="w-12 flex items-center justify-center font-bold text-orange-600 bg-white rounded-lg border border-orange-200 shadow-sm">
                                {getDaysD0(atb.date)}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  clearAntibiotic(idx);
                                }}
                                className={`flex items-center justify-center text-orange-400 hover:text-white hover:bg-red-500 transition-colors bg-white border border-orange-200 rounded-lg w-10 shadow-sm ${
                                  !isEditable ? "hidden" : ""
                                }`}
                                title="Excluir e arquivar no histórico"
                              >
                                <X size={18} strokeWidth={3} />
                              </button>
                            </>
                          ) : (
                            <>
                              {/* --- MODO EDIÇÃO --- */}
                              <input
                                type="text"
                                value={atb.name || ""}
                                onChange={(e) =>
                                  updateAntibiotic(idx, "name", e.target.value.toUpperCase())
                                }
                                placeholder={`Novo ATB ${idx + 1}`}
                                className="flex-1 p-2 rounded-lg border border-orange-300 focus:border-orange-500 outline-none font-bold text-slate-700 uppercase"
                              />
                              <input
                                type="date"
                                value={atb.date || ""}
                                onChange={(e) =>
                                  updateAntibiotic(idx, "date", e.target.value)
                                }
                                className="w-32 p-2 rounded-lg border border-orange-300 focus:border-orange-500 outline-none font-bold text-slate-700"
                              />
                              <div className="w-12 flex items-center justify-center font-bold text-orange-300 bg-slate-50 rounded-lg border border-orange-100">
                                -
                              </div>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (atb.name && atb.date) {
                                    updateAntibiotic(idx, "locked", true);
                                  } else {
                                    alert("Preencha o Nome e a Data do antibiótico para fixá-lo!");
                                  }
                                }}
                                className={`flex items-center justify-center text-green-600 hover:text-white hover:bg-green-500 transition-colors bg-green-50 border border-green-200 rounded-lg w-10 shadow-sm ${
                                  !isEditable ? "hidden" : ""
                                }`}
                                title="Confirmar e Fixar Antibiótico"
                              >
                                <CheckCircle size={18} strokeWidth={2.5} />
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              {/* --- NURSING --- */}
              {viewMode === "nursing" && (
                <fieldset
                  disabled={!isEditable}
                  className="space-y-6 animate-fadeIn min-w-0 border-0 p-0 m-0"
                >
                  {!currentPatient.enfermagem?.braden_percepcao ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-xl border-2 border-dashed border-orange-200 shadow-sm print:hidden">
                      <Shield size={64} className="text-orange-300 mb-4" />
                      <h3 className="text-xl font-bold text-slate-700 mb-2 text-center">
                        Admissão de Enfermagem Pendente
                      </h3>
                      <p className="text-sm text-slate-500 mb-6 text-center max-w-md">
                        O paciente já foi alocado no leito pela equipe médica,
                        mas a avaliação inicial de enfermagem (Escalas de Braden
                        e Morse) ainda não foi realizada.
                      </p>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleNursingAdmission();
                        }}
                        className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 flex items-center gap-2 transition-all transform hover:scale-105"
                      >
                        <UserPlus size={20} /> Iniciar Admissão de Enfermagem
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-end print:hidden">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleNursingAdmission();
                          }}
                          className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-300 flex items-center gap-2 transition-colors border border-slate-300"
                        >
                          <Edit3 size={16} /> Ver/Editar Escalas de Admissão
                        </button>
                      </div>

                      {(() => {
                        const reqBraden = [
                          "braden_percepcao",
                          "braden_umidade",
                          "braden_atividade",
                          "braden_mobilidade",
                          "braden_nutricao",
                          "braden_friccao",
                        ];
                        const reqMorse = [
                          "morse_historico",
                          "morse_diagnostico",
                          "morse_auxilio",
                          "morse_terapiaIV",
                          "morse_marcha",
                          "morse_estadoMental",
                        ];

                        const bradenSum = reqBraden.reduce(
                          (s, k) =>
                            s + parseInt(currentPatient.enfermagem?.[k] || 0),
                          0
                        );
                        let bradenRisk = "";
                        if (bradenSum > 0) {
                          if (bradenSum <= 9) bradenRisk = "Risco Altíssimo";
                          else if (bradenSum <= 12) bradenRisk = "Risco Alto";
                          else if (bradenSum <= 14)
                            bradenRisk = "Risco Moderado";
                          else if (bradenSum <= 18) bradenRisk = "Risco Leve";
                          else bradenRisk = "Sem Risco / Risco Mínimo";
                        }

                        const morseSum = reqMorse.reduce(
                          (s, k) =>
                            s + parseInt(currentPatient.enfermagem?.[k] || 0),
                          0
                        );
                        let morseRisk = "";
                        if (
                          currentPatient.enfermagem?.morse_historico !==
                            undefined &&
                          currentPatient.enfermagem?.morse_historico !== ""
                        ) {
                          if (morseSum <= 24) morseRisk = "Risco Baixo";
                          else if (morseSum <= 44) morseRisk = "Risco Moderado";
                          else morseRisk = "Risco Alto";
                        }

                        return (
                          <div className="grid grid-cols-2 gap-4 mb-2 mt-4">
                            <div className="p-4 border border-orange-200 rounded-xl bg-orange-50/50 flex flex-col justify-center">
                              <h4 className="text-xs font-bold text-orange-800 uppercase mb-2 flex items-center gap-1">
                                <AlertTriangle size={14} /> Escala de Braden
                              </h4>
                              <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-orange-600">
                                  {bradenSum > 0 ? bradenSum : "-"}
                                </span>
                                <span
                                  className={`text-xs font-bold px-2 py-1 rounded-lg ${
                                    bradenSum <= 12
                                      ? "bg-red-200 text-red-800"
                                      : "bg-orange-200 text-orange-800"
                                  }`}
                                >
                                  {bradenRisk}
                                </span>
                              </div>
                            </div>
                            <div className="p-4 border border-blue-200 rounded-xl bg-blue-50/50 flex flex-col justify-center">
                              <h4 className="text-xs font-bold text-blue-800 uppercase mb-2 flex items-center gap-1">
                                <AlertTriangle size={14} /> Escala de Morse
                              </h4>
                              <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-blue-600">
                                  {currentPatient.enfermagem
                                    ?.morse_historico !== undefined
                                    ? morseSum
                                    : "-"}
                                </span>
                                <span
                                  className={`text-xs font-bold px-2 py-1 rounded-lg ${
                                    morseSum >= 45
                                      ? "bg-red-200 text-red-800"
                                      : "bg-blue-200 text-blue-800"
                                  }`}
                                >
                                  {morseRisk}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="p-4 border rounded-xl bg-orange-50/20">
                        <h4 className="font-bold text-orange-800 mb-4 flex items-center gap-2">
                          <Shield size={16} /> Cuidados Gerais
                        </h4>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                          Escala de Dor
                        </label>
                        <select
                          className="w-full p-2 border rounded mb-4"
                          value={currentPatient.enfermagem?.dor || ""}
                          onChange={(e) =>
                            updateNested("enfermagem", "dor", e.target.value)
                          }
                        >
                          <option value="">Selecione...</option>
                          {ESCALA_DOR.map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>

                        <label className="flex items-center gap-2 mb-4 font-bold">
                          <input
                            type="checkbox"
                            checked={
                              currentPatient.enfermagem?.hemodialise || false
                            }
                            onChange={(e) =>
                              updateNested(
                                "enfermagem",
                                "hemodialise",
                                e.target.checked
                              )
                            }
                          />{" "}
                          Hemodiálise
                        </label>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                          Precauções
                        </label>
                        <select
                          className="w-full p-2 border rounded"
                          value={currentPatient.enfermagem?.precaucao || ""}
                          onChange={(e) =>
                            updateNested(
                              "enfermagem",
                              "precaucao",
                              e.target.value
                            )
                          }
                        >
                          <option value="">Selecione...</option>
                          {PRECAUCOES.map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      </div>

                      <div className="p-4 border rounded-xl bg-orange-50/20">
                        <h4 className="font-bold text-orange-800 mb-4 flex items-center gap-2">
                          <Syringe size={16} /> Invasivos e Dispositivos
                        </h4>
                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="text-xs font-bold text-gray-500">
                              AVP (Local/Data)
                            </label>
                            <div className="flex gap-2">
                              <input
                                className="w-full p-2 border rounded"
                                placeholder="Local"
                                value={
                                  currentPatient.enfermagem?.avpLocal || ""
                                }
                                onChange={(e) =>
                                  updateNested(
                                    "enfermagem",
                                    "avpLocal",
                                    e.target.value
                                  )
                                }
                              />
                              <input
                                type="date"
                                className="w-32 p-2 border rounded"
                                value={currentPatient.enfermagem?.avpData || ""}
                                onChange={(e) =>
                                  updateNested(
                                    "enfermagem",
                                    "avpData",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-500">
                              CVC/PICC (Local/Data)
                            </label>
                            <div className="flex gap-2">
                              <input
                                className="w-full p-2 border rounded"
                                placeholder="Local"
                                value={
                                  currentPatient.enfermagem?.cvcLocal || ""
                                }
                                onChange={(e) =>
                                  updateNested(
                                    "enfermagem",
                                    "cvcLocal",
                                    e.target.value
                                  )
                                }
                              />
                              <input
                                type="date"
                                className="w-32 p-2 border rounded"
                                value={currentPatient.enfermagem?.cvcData || ""}
                                onChange={(e) =>
                                  updateNested(
                                    "enfermagem",
                                    "cvcData",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>
                        {/* AQUI MUDAMOS DE 3 PARA 4 COLUNAS */}
                        {/* AQUI MUDAMOS DE 3 PARA 4 COLUNAS */}
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                          
                          {/* CAIXINHA 1: SVD */}
                          <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1">
                              <input
                                type="checkbox"
                                checked={
                                  currentPatient.enfermagem?.svd || false
                                }
                                onChange={(e) =>
                                  updateNested(
                                    "enfermagem",
                                    "svd",
                                    e.target.checked
                                  )
                                }
                              />{" "}
                              SVD (Sonda Vesical / Data)
                            </label>
                            <input
                              type="date"
                              className={`w-full p-2 border rounded ${
                                !currentPatient.enfermagem?.svd
                                  ? "bg-gray-100 opacity-50"
                                  : ""
                              }`}
                              value={currentPatient.enfermagem?.svdData || ""}
                              onChange={(e) =>
                                updateNested(
                                  "enfermagem",
                                  "svdData",
                                  e.target.value
                                )
                              }
                              disabled={
                                !currentPatient.enfermagem?.svd || !isEditable
                              }
                            />
                          </div>
                          
                          {/* CAIXINHA 2: ASPECTO DA DIURESE (NOVO!) */}
                          <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">
                              Aspecto da Diurese
                            </label>
                            <select
                              className="w-full p-2 border rounded bg-white"
                              value={currentPatient.enfermagem?.diureseCaracteristica || ""}
                              onChange={(e) =>
                                updateNested(
                                  "enfermagem",
                                  "diureseCaracteristica",
                                  e.target.value
                                )
                              }
                            >
                              <option value="">Selecione...</option>
                              {CARACTERISTICAS_DIURESE.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>

                          {/* CAIXINHA 3: SNE */}
                          <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">
                              SNE (Fixação cm / Data)
                            </label>
                            <div className="flex gap-2">
                              <input
                                className="w-full p-2 border rounded"
                                placeholder="cm"
                                value={currentPatient.enfermagem?.sneCm || ""}
                                onChange={(e) =>
                                  updateNested(
                                    "enfermagem",
                                    "sneCm",
                                    e.target.value
                                  )
                                }
                              />
                              <input
                                type="date"
                                className="w-32 p-2 border rounded"
                                value={currentPatient.enfermagem?.sneData || ""}
                                onChange={(e) =>
                                  updateNested(
                                    "enfermagem",
                                    "sneData",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                          </div>

                          {/* CAIXINHA 4: DRENOS */}
                          <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">
                              Drenos (Tipo/Característica)
                            </label>
                            <input
                              className="w-full p-2 border rounded"
                              value={currentPatient.enfermagem?.drenoTipo || ""}
                              onChange={(e) =>
                                updateNested(
                                  "enfermagem",
                                  "drenoTipo",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                          
                        </div>
                      </div>

                      <div className="p-4 border rounded-xl bg-orange-50/20">
                        <h4 className="font-bold text-orange-800 mb-4 flex items-center gap-2">
                          <Activity size={16} /> Pele e Curativos
                        </h4>
                        <textarea
                          placeholder="Lesões por pressão (Local / Estágio)..."
                          className="w-full p-2 border rounded mb-2 h-16"
                          value={currentPatient.enfermagem?.lesaoLocal || ""}
                          onChange={(e) =>
                            updateNested(
                              "enfermagem",
                              "lesaoLocal",
                              e.target.value
                            )
                          }
                        />
                        <div className="flex gap-2">
                          <input
                            className="flex-1 p-2 border rounded"
                            placeholder="Tipo de Curativo"
                            value={
                              currentPatient.enfermagem?.curativoTipo || ""
                            }
                            onChange={(e) =>
                              updateNested(
                                "enfermagem",
                                "curativoTipo",
                                e.target.value
                              )
                            }
                          />
                          <input
                            type="date"
                            className="w-32 p-2 border rounded"
                            value={
                              currentPatient.enfermagem?.curativoData || ""
                            }
                            onChange={(e) =>
                              updateNested(
                                "enfermagem",
                                "curativoData",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>

                      {/* ========================================== */}
                      {/* NOVOS CAMPOS: INTERCORRÊNCIAS E CONDUTAS */}
                      {/* ========================================== */}
                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        <div className="p-4 bg-white border rounded-xl shadow-sm">
                          <h4 className="font-bold text-slate-700 mb-2 text-sm flex items-center gap-2">
                            <AlertCircle size={16} className="text-orange-500" /> Intercorrências
                          </h4>
                          <textarea
                            className="w-full p-3 border rounded-lg h-24 text-sm outline-none focus:ring-2 focus:ring-orange-100 bg-slate-50 focus:bg-white transition-colors whitespace-pre-wrap"
                            placeholder="Relate as intercorrências do plantão aqui..."
                            value={currentPatient.enfermagem?.intercorrencias || ""}
                            onChange={(e) =>
                              updateNested("enfermagem", "intercorrencias", e.target.value)
                            }
                          />
                        </div>
                        <div className="p-4 bg-white border rounded-xl shadow-sm">
                          <h4 className="font-bold text-slate-700 mb-2 text-sm flex items-center gap-2">
                            <CheckCircle size={16} className="text-green-500" /> Condutas
                          </h4>
                          <textarea
                            className="w-full p-3 border rounded-lg h-24 text-sm outline-none focus:ring-2 focus:ring-green-100 bg-slate-50 focus:bg-white transition-colors whitespace-pre-wrap"
                            placeholder="Plano de cuidados e condutas tomadas..."
                            value={currentPatient.enfermagem?.condutas || ""}
                            onChange={(e) =>
                              updateNested("enfermagem", "condutas", e.target.value)
                            }
                          />
                        </div>
                      </div>
                      {/* ========================================== */}
                      <div className="p-4 bg-white border rounded-xl shadow-sm mt-4">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold text-slate-700 flex items-center gap-2">
                            <Edit3 size={16} className="text-slate-400" /> Evolução de Enfermagem (Privativo)
                          </h4>
                          <button
                            type="button"
                            onClick={generateNursingAI_Evolution}
                            disabled={!isNursingRole || isGeneratingNursingAI}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm print:hidden ${
                              isGeneratingNursingAI
                                ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                            } ${!isNursingRole ? "opacity-50 cursor-not-allowed" : ""}`}
                            title="Usar Inteligência Artificial para gerar evolução"
                          >
                            {isGeneratingNursingAI ? (
                              <>
                                <Loader2 className="animate-spin" size={14} /> Gerando...
                              </>
                            ) : (
                              <>
                                <BrainCircuit size={14} /> Evolução por IA
                              </>
                            )}
                          </button>
                        </div>
                        <textarea
                          className="w-full p-3 border rounded-lg h-64 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-slate-50 focus:bg-white transition-colors whitespace-pre-wrap"
                          placeholder="Clique no botão acima para gerar a evolução baseada nos dados clínicos, ou digite aqui..."
                          value={currentPatient.enfermagem?.anotacoes || ""}
                          onChange={(e) =>
                            updateNested(
                              "enfermagem",
                              "anotacoes",
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </>
                  )}
                </fieldset>
              )}

              {/* --- PHYSIO --- */}
              {viewMode === "physio" && (
                <div className="space-y-6 animate-fadeIn">

                  {/* === BOTÃO DE ADMISSÃO FISIO QUE VOCÊ VAI COLAR === */}
                  <div className="flex justify-end print:hidden">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handlePhysioAdmission();
                      }}
                      className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-cyan-700 flex items-center gap-2 transition-colors shadow-sm"
                    >
                      <UserPlus size={16} /> Admissão Fisioterapêutica
                    </button>
                  </div>
                  {/* === FIM DO BOTÃO === */}

                  <fieldset
                    disabled={!isEditable}
                    className="space-y-6 min-w-0 border-0 p-0 m-0"
                  >
                    <div className="grid md:grid-cols-4 gap-4 bg-cyan-50 p-4 rounded-xl border border-cyan-100">
                      <div>
                        <label className="text-xs font-bold text-cyan-700 flex justify-between">
                          Data Intubação{" "}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              clearDate("dataIntubacao");
                            }}
                            className={`${!isEditable ? "hidden" : ""}`}
                          >
                            <X size={12} />
                          </button>
                        </label>
                        <input
                          type="date"
                          className="w-full p-2 border rounded bg-white"
                          value={currentPatient.dataIntubacao || ""}
                          onChange={(e) =>
                            updateP("dataIntubacao", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-cyan-700 flex justify-between">
                          Data Extubação{" "}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              clearDate("dataExtubacao");
                            }}
                            className={`${!isEditable ? "hidden" : ""}`}
                          >
                            <X size={12} />
                          </button>
                        </label>
                        <input
                          type="date"
                          className="w-full p-2 border rounded bg-white"
                          value={currentPatient.dataExtubacao || ""}
                          onChange={(e) =>
                            updateP("dataExtubacao", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-cyan-700 flex justify-between">
                          Data TQT{" "}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              clearDate("dataTQT");
                            }}
                            className={`${!isEditable ? "hidden" : ""}`}
                          >
                            <X size={12} />
                          </button>
                        </label>
                        <input
                          type="date"
                          className="w-full p-2 border rounded bg-white"
                          value={currentPatient.dataTQT || ""}
                          onChange={(e) => updateP("dataTQT", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-cyan-700 flex justify-between">
                          Data Decanulação{" "}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              clearDate("dataDecanulacao");
                            }}
                            className={`${!isEditable ? "hidden" : ""}`}
                          >
                            <X size={12} />
                          </button>
                        </label>
                        <input
                          type="date"
                          className="w-full p-2 border rounded bg-white"
                          value={currentPatient.dataDecanulacao || ""}
                          onChange={(e) =>
                            updateP("dataDecanulacao", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    {/* Antropometria Sincronizada */}
                    <div className="grid md:grid-cols-2 gap-4 bg-lime-50/40 p-4 rounded-xl border border-lime-100 mb-6">
                      <div>
                        <label className="text-xs font-bold text-lime-700">
                          Altura (m/cm)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full p-2 border rounded bg-white"
                          value={currentPatient.nutri?.altura || ""}
                          onChange={(e) =>
                            updateNested("nutri", "altura", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-lime-700">
                          Peso Predito (kg)
                        </label>
                        <input
                          type="number"
                          className="w-full p-2 border rounded bg-white"
                          value={currentPatient.nutri?.pesoPredito || ""}
                          onChange={(e) =>
                            updateNested("nutri", "pesoPredito", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="p-4 border rounded-xl bg-white">
                      <div className="flex justify-between items-end mb-4">
                        <h4 className="font-bold text-cyan-800 flex items-center gap-2">
                          <Wind size={16} /> Suporte Ventilatório
                        </h4>
                        <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
  <div className="flex flex-col">
    <label className="text-xs font-semibold text-gray-700 mb-1">
      Dias Prévios (Reintubação):
    </label>
    <input
      type="number"
      className="w-full p-1 border border-cyan-300 rounded text-center font-bold text-cyan-700 outline-none focus:ring-2 focus:ring-cyan-500"
      value={currentPatient.physio?.diasAcumuladosVM || ""}
      onChange={(e) =>
        updateNested("physio", "diasAcumuladosVM", parseInt(e.target.value) || 0)
      }
      placeholder="Ex: 5"
    />
  </div>
  <div className="flex flex-col">
    <label className="text-xs font-semibold text-gray-700 mb-1">
      Tempo Total de VM:
    </label>
    <input
      type="text"
      readOnly
      className="w-full p-1 border border-gray-300 bg-gray-200 text-center font-bold text-red-600 rounded cursor-not-allowed"
      value={getTempoVMText(currentPatient)}
      title="Soma automática dos dias prévios com a intubação atual"
    />
  </div>
</div>
                      </div>

                      {/* BOTÃO DO MAPA DE VM - SÓ APARECE SE ESTIVER EM VM */}
                  {currentPatient.physio?.suporte === "VM" && (
                    <button
                      onClick={() => setShowVmFlowsheet(true)}
                      className="w-full mt-3 mb-4 p-2 bg-slate-800 text-white font-bold rounded-lg shadow flex justify-center items-center gap-2 hover:bg-slate-700 transition-colors uppercase text-xs"
                    >
                      <Wind size={16} className="text-cyan-400"/> Abrir Mapa de Ventilação Mecânica
                    </button>
                  )}

                      <select
                        className="w-full p-2 border rounded mb-4 font-bold"
                        value={currentPatient.physio?.suporte || ""}
                        onChange={(e) => handleSuporteChange(e.target.value)}
                      >
                        <option value="">Selecione o suporte...</option>
                        {SUPORTE_RESP_OPTS.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>

                      {(currentPatient.physio?.suporte === "Cateter Nasal" ||
                        currentPatient.physio?.suporte ===
                          "Máscara não reinalante") && (
                        <div className="mb-2">
                          <label className="text-xs font-bold">
                            Fluxo (L/min)
                          </label>
                          <input
                            type="number"
                            className="w-full p-2 border rounded"
                            placeholder="L/min"
                            value={currentPatient.physio?.parametro || ""}
                            onChange={(e) =>
                              updateNested(
                                "physio",
                                "parametro",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      )}
                      {currentPatient.physio?.suporte === "Venturi" && (
                        <div className="mb-2">
                          <label className="text-xs font-bold">
                            Porcentagem (%)
                          </label>
                          <input
                            type="number"
                            className="w-full p-2 border rounded"
                            placeholder="%"
                            value={currentPatient.physio?.fiO2 || ""}
                            onChange={(e) =>
                              updateNested("physio", "fiO2", e.target.value)
                            }
                          />
                        </div>
                      )}
                      {currentPatient.physio?.suporte === "Macronebulização por TQT" && (
                        <div className="mb-2">
                          <label className="text-xs font-bold text-cyan-800">
                            Fluxo (L/min) / FiO2 (%)
                          </label>
                          <input
                            type="text"
                            className="w-full p-2 border rounded"
                            placeholder="Ex: 10 L/min - 40%"
                            value={currentPatient.physio?.parametro || ""}
                            onChange={(e) =>
                              updateNested("physio", "parametro", e.target.value)
                            }
                          />
                        </div>
                      )}
                      {currentPatient.physio?.suporte === "VNI" && (
                        <div className="grid grid-cols-2 gap-4 mb-2">
                          <div>
                            <label className="text-xs font-bold">
                              Modo (CPAP/BIPAP)
                            </label>
                            <select
                              className="w-full p-2 border rounded"
                              value={currentPatient.physio?.parametro || ""}
                              onChange={(e) =>
                                updateNested(
                                  "physio",
                                  "parametro",
                                  e.target.value
                                )
                              }
                            >
                              <option value="CPAP">CPAP</option>
                              <option value="BIPAP">BIPAP</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold">
                              FiO2 (%)
                            </label>
                            <input
                              type="number"
                              className="w-full p-2 border rounded"
                              value={currentPatient.physio?.fiO2 || ""}
                              onChange={(e) =>
                                updateNested("physio", "fiO2", e.target.value)
                              }
                            />
                          </div>
                        </div>
                      )}
                      {currentPatient.physio?.suporte === "VM" && (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
    {/* 1. MODO VENTILATÓRIO */}
    <div>
      <label className="text-xs font-bold text-slate-700">Modo</label>
      <select
        className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-cyan-200"
        value={currentPatient.physio?.parametro || ""}
        onChange={(e) => updateNested("physio", "parametro", e.target.value)}
      >
        <option value="">...</option>
        {MODOS_VM.map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>
    </div>

    {/* 2. CAMPO DINÂMICO (MÁGICA ACONTECENDO AQUI) */}
    {currentPatient.physio?.parametro === "VCV" ? (
      <div className="animate-fadeIn">
        <label className="text-xs font-bold text-blue-700">Vt (ml)</label>
        <input
          type="number"
          className="w-full p-2 border border-blue-200 rounded bg-blue-50/30 outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Ex: 400"
          value={currentPatient.physio?.vt || ""}
          onChange={(e) => updateNested("physio", "vt", e.target.value)}
        />
      </div>
    ) : currentPatient.physio?.parametro === "PCV" ? (
      <div className="animate-fadeIn">
        <label className="text-xs font-bold text-emerald-700">PC (cmH2O)</label>
        <input
          type="number"
          className="w-full p-2 border border-emerald-200 rounded bg-emerald-50/30 outline-none focus:ring-2 focus:ring-emerald-400"
          placeholder="Ex: 15"
          value={currentPatient.physio?.pc || ""}
          onChange={(e) => updateNested("physio", "pc", e.target.value)}
        />
      </div>
    ) : currentPatient.physio?.parametro === "PSV" ? (
      <div className="animate-fadeIn">
        <label className="text-xs font-bold text-purple-700">PS (cmH2O)</label>
        <input
          type="number"
          className="w-full p-2 border border-purple-200 rounded bg-purple-50/30 outline-none focus:ring-2 focus:ring-purple-400"
          placeholder="Ex: 12"
          value={currentPatient.physio?.ps || ""}
          onChange={(e) => updateNested("physio", "ps", e.target.value)}
        />
      </div>
    ) : (
      /* Placeholder inativo se nenhum dos 3 modos principais estiver selecionado */
      <div className="opacity-60 pointer-events-none">
        <label className="text-xs font-bold text-slate-400">Parâmetro Alvo</label>
        <input
          type="text"
          disabled
          className="w-full p-2 border border-slate-200 rounded bg-slate-50"
          placeholder="Aguardando Modo..."
        />
      </div>
    )}

    {/* 3. PEEP */}
    <div>
      <label className="text-xs font-bold text-slate-700">PEEP</label>
      <input
        type="number"
        className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-cyan-200"
        value={currentPatient.physio?.peep || ""}
        onChange={(e) => updateNested("physio", "peep", e.target.value)}
      />
    </div>

    {/* 4. FiO2 */}
    <div>
      <label className="text-xs font-bold text-slate-700">FiO2 (%)</label>
      <input
        type="number"
        className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-cyan-200"
        value={currentPatient.physio?.fiO2 || ""}
        onChange={(e) => updateNested("physio", "fiO2", e.target.value)}
      />
    </div>
  </div>
)}
</div>

                    {/* ========================================== */}
                    {/* ANDAR SUPERIOR: DUAS COLUNAS LADO A LADO   */}
                    {/* ========================================== */}
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      
                      {/* --- COLUNA 1: VIA AÉREA E SECREÇÃO --- */}
                      <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col h-full">
                        <h4 className="font-bold text-slate-700 text-xs uppercase mb-4 flex items-center gap-2 shrink-0">
                          Via Aérea Artificial
                        </h4>
                        <div className="grid grid-cols-3 gap-2 mb-6 shrink-0">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                              TOT nº
                            </label>
                            <input
                              type="number" step="0.5"
                              placeholder="Ex: 8.0"
                              className="w-full p-2 border rounded text-xs text-center text-slate-700 outline-none focus:ring-2 focus:ring-cyan-200"
                              value={currentPatient.physio?.totNumero || ""}
                              onChange={(e) =>
                                updateNested("physio", "totNumero", e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                              Rima (cm)
                            </label>
                            <input
                              type="number"
                              placeholder="Ex: 22"
                              className="w-full p-2 border rounded text-xs text-center text-slate-700 outline-none focus:ring-2 focus:ring-cyan-200"
                              value={currentPatient.physio?.totRima || ""}
                              onChange={(e) =>
                                updateNested("physio", "totRima", e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block text-center" title="Pressão do Cuff: Manhã / Tarde / Noite">
                              Cuff (M | T | N)
                            </label>
                            <div className="flex gap-1">
                              <input
                                type="number"
                                placeholder="M"
                                title="Manhã"
                                className="w-1/3 p-2 border rounded text-[10px] text-center text-slate-700 outline-none focus:ring-2 focus:ring-cyan-200"
                                value={currentPatient.physio?.cuffM || ""}
                                onChange={(e) =>
                                  updateNested("physio", "cuffM", e.target.value)
                                }
                              />
                              <input
                                type="number"
                                placeholder="T"
                                title="Tarde"
                                className="w-1/3 p-2 border rounded text-[10px] text-center text-slate-700 outline-none focus:ring-2 focus:ring-cyan-200"
                                value={currentPatient.physio?.cuffT || ""}
                                onChange={(e) =>
                                  updateNested("physio", "cuffT", e.target.value)
                                }
                              />
                              <input
                                type="number"
                                placeholder="N"
                                title="Noite"
                                className="w-1/3 p-2 border rounded text-[10px] text-center text-slate-700 outline-none focus:ring-2 focus:ring-cyan-200"
                                value={currentPatient.physio?.cuffN || ""}
                                onChange={(e) =>
                                  updateNested("physio", "cuffN", e.target.value)
                                }
                              />
                            </div>
                          </div>
                        </div>

                        {/* Subdivisão: Secreção (Empurrada para o final do bloco) */}
                        <div className="pt-4 border-t border-slate-100 mt-auto shrink-0">
                          <h4 className="font-bold text-slate-700 text-xs uppercase mb-3">
                            Secreção
                          </h4>
                          <label className="flex items-center gap-2 mb-3 text-sm font-bold text-slate-600">
                            <input
                              type="checkbox"
                              className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                              checked={currentPatient.physio?.secrecao || false}
                              onChange={(e) =>
                                updateNested("physio", "secrecao", e.target.checked)
                              }
                            />{" "}
                            Apresentou Secreção?
                          </label>
                          {currentPatient.physio?.secrecao && (
                            <div className="grid grid-cols-3 gap-2 animate-fadeIn">
                              <select
                                className="p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                                value={currentPatient.physio?.secrecaoAspecto || ""}
                                onChange={(e) =>
                                  updateNested("physio", "secrecaoAspecto", e.target.value)
                                }
                              >
                                <option value="">Aspecto...</option>
                                {ASPECTO_SECRECAO.map((a) => (
                                  <option key={a}>{a}</option>
                                ))}
                              </select>
                              <select
                                className="p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                                value={currentPatient.physio?.secrecaoColoracao || ""}
                                onChange={(e) =>
                                  updateNested("physio", "secrecaoColoracao", e.target.value)
                                }
                              >
                                <option value="">Coloração...</option>
                                {COLORACAO_SECRECAO.map((c) => (
                                  <option key={c}>{c}</option>
                                ))}
                              </select>
                              <select
                                className="p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                                value={currentPatient.physio?.secrecaoQtd || ""}
                                onChange={(e) =>
                                  updateNested("physio", "secrecaoQtd", e.target.value)
                                }
                              >
                                <option value="">Qtd...</option>
                                {QTD_SECRECAO.map((q) => (
                                  <option key={q}>{q}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* --- COLUNA 2: MOBILIZAÇÃO --- */}
                      <div className="p-4 border border-cyan-100 rounded-xl bg-cyan-50/30 shadow-sm flex flex-col h-full">
                        <h4 className="font-bold text-cyan-800 text-xs uppercase mb-4 flex items-center gap-2 shrink-0">
                          <Move size={16} /> Mobilização / Conduta Motora
                        </h4>
                        <div className="grid grid-cols-2 gap-3 mb-6 flex-1">
                          {MOBILIZACAO.map((m) => {
                            const mobArray = Array.isArray(currentPatient.physio?.mobilizacao)
                              ? currentPatient.physio.mobilizacao
                              : [];
                            return (
                              <label
                                key={m}
                                className="flex items-center gap-2 text-xs font-semibold text-cyan-900 cursor-pointer hover:bg-cyan-100/50 p-1 rounded transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  className="w-3.5 h-3.5 text-cyan-600 rounded focus:ring-cyan-500"
                                  checked={mobArray.includes(m)}
                                  onChange={() =>
                                    toggleArrayItem("physio", "mobilizacao", m)
                                  }
                                />
                                {m}
                              </label>
                            );
                          })}
                        </div>
                        <div className="grid grid-cols-2 gap-4 border-t border-cyan-200 pt-4 mt-auto shrink-0">
                          <div>
                            <label className="block text-[10px] font-bold text-cyan-700 uppercase mb-1">
                              Escore MRC (0-60)
                            </label>
                            <input
                              type="text"
                              className="w-full p-2 border border-cyan-200 rounded bg-white text-xs text-center font-bold text-cyan-900 outline-none focus:ring-2 focus:ring-cyan-400"
                              placeholder="Ex: 48, NT"
                              value={currentPatient.physio?.mrcScore || ""}
                              onChange={(e) =>
                                updateNested("physio", "mrcScore", e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-cyan-700 uppercase mb-1">
                              IMS (Escala Mobilidade)
                            </label>
                            <select
                              className="w-full p-2 border border-cyan-200 rounded bg-white text-xs font-bold text-cyan-900 outline-none focus:ring-2 focus:ring-cyan-400"
                              value={currentPatient.physio?.icuMobilityScale || ""}
                              onChange={(e) =>
                                updateNested("physio", "icuMobilityScale", e.target.value)
                              }
                            >
                              <option value="">Selecione...</option>
                              {ICU_MOBILITY_SCALE.map((scale) => (
                                <option key={scale} value={scale}>
                                  {scale}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                    </div> {/* FECHAMENTO DO ANDAR SUPERIOR */}

                    {/* ========================================== */}
                    {/* ANDAR INFERIOR: LARGURA TOTAL DA TELA      */}
                    {/* ========================================== */}
                    <div className="w-full mb-6 p-4 border border-slate-200 rounded-xl bg-white shadow-sm">
                      <h4 className="font-bold text-slate-700 text-sm uppercase mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
                        <Activity size={18} className="text-cyan-600" /> Evolução Sistêmica e Plano Terapêutico
                      </h4>
                      
                      {/* Grid dos 6 Sistemas - Espalhados horizontalmente no computador */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {[
                          { id: "estadoGeral", label: "Estado Geral" },
                          { id: "sistemaNervoso", label: "Sistema Nervoso" },
                          { id: "sistemaRespiratorio", label: "Sistema Respiratório" },
                          { id: "sistemaCardiovascular", label: "Sistema Cardiovascular" },
                          { id: "sistemaDigestivo", label: "Sistema Digestivo" },
                          { id: "sistemaMusculoesqueletico", label: "Sis. Musculoesquelético" },
                        ].map((sys) => (
                          <div key={sys.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col">
                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">{sys.label}</label>
                            <textarea
                              className="w-full p-2 border rounded bg-white text-xs text-slate-700 outline-none focus:ring-2 focus:ring-cyan-200 flex-1 resize-y min-h-[80px]"
                              value={currentPatient.physio?.[sys.id] || ""}
                              onChange={(e) => updateNested("physio", sys.id, e.target.value)}
                              placeholder={`Evolução diária - ${sys.label}...`}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Campos Estratégicos (Intercorrências, Condutas, Metas) - Ocupando a linha toda */}
                      <div className="space-y-4 border-t border-slate-100 pt-6">
                        {/* Intercorrências */}
                        <div className="bg-red-50 p-4 rounded-lg border border-red-100 shadow-sm">
                          <label className="text-xs font-bold text-red-600 uppercase mb-2 block flex items-center gap-1">
                            <AlertTriangle size={14} /> Intercorrências do Plantão
                          </label>
                          <textarea
                            className="w-full p-3 border border-red-200 rounded bg-white text-xs text-slate-700 outline-none focus:ring-2 focus:ring-red-300 h-20 resize-y"
                            value={currentPatient.physio?.intercorrencias || ""}
                            onChange={(e) => updateNested("physio", "intercorrencias", e.target.value)}
                            placeholder="Descreva quedas de saturação, autoextubação, rolhas, instabilidade hemodinâmica nas manobras..."
                          />
                        </div>

                        {/* Condutas */}
                        <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-100 shadow-sm">
                          <label className="text-xs font-bold text-cyan-700 uppercase mb-2 block flex items-center gap-1">
                            <ClipboardCheck size={14} /> Condutas Fisioterapêuticas Realizadas
                          </label>
                          <textarea
                            className="w-full p-3 border border-cyan-200 rounded bg-white text-xs text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300 h-28 resize-y"
                            value={currentPatient.physio?.condutas || currentPatient.physio?.admissao_condutas || ""}
                            onChange={(e) => updateNested("physio", "condutas", e.target.value)}
                          />
                        </div>

                        {/* Metas para o Próximo Plantão */}
                        <div className="bg-green-50 p-4 rounded-lg border border-green-100 shadow-sm">
                          <label className="text-xs font-bold text-green-700 uppercase mb-2 block flex items-center gap-1">
                            <Target size={14} /> Plano / Metas para o Próximo Plantão
                          </label>
                          <textarea
                            className="w-full p-3 border border-green-200 rounded bg-white text-xs text-slate-700 outline-none focus:ring-2 focus:ring-green-300 h-24 resize-y"
                            value={currentPatient.physio?.planoMetas || ""}
                            onChange={(e) => updateNested("physio", "planoMetas", e.target.value)}
                            placeholder="Ex: Iniciar protocolo de desmame, tentar sedestação à beira leito amanhã de manhã, discutir extubação no round..."
                          />
                        </div>
                      </div>
                    </div>
                  </fieldset>

                  <div className="p-4 bg-slate-50 border rounded-xl border-slate-200">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold text-slate-700 flex items-center gap-2">
                        <Activity size={16} /> Gasometria Arterial
                      </h4>
                      <button
                        onClick={handlePrintGasometria}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 print:hidden"
                      >
                        <Printer size={14} /> Imprimir
                      </button>
                    </div>
                    <fieldset
                      disabled={!isEditable}
                      className="overflow-x-auto rounded-lg border border-slate-200 min-w-0 border-0 p-0 m-0"
                    >
                      <table className="w-full text-xs text-center border-collapse">
                        <thead>
                          <tr className="bg-slate-200 text-slate-700">
                            <th className="p-2 text-left sticky left-0 bg-slate-200 border-r border-slate-300 z-10">
                              PARÂMETRO
                            </th>
                            {uniqueGasoCols.map((col) => (
                              <th
                                key={col}
                                className="p-2 border-l border-slate-300 min-w-[80px]"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span>
                                    {col.match(/^\d{4}-\d{2}-\d{2}$/)
                                      ? formatDateDDMM(col)
                                      : col}
                                  </span>
                                  {currentPatient.customGasometriaCols?.includes(
                                    col
                                  ) &&
                                    isEditable && (
                                      <button
                                        onClick={() => {
                                          if (
                                            window.confirm(
                                              `Excluir a coluna "${col}"?`
                                            )
                                          ) {
                                            const up = [...patients];
                                            up[activeTab].customGasometriaCols =
                                              up[
                                                activeTab
                                              ].customGasometriaCols.filter(
                                                (c) => c !== col
                                              );
                                            if (up[activeTab].gasometriaHistory)
                                              delete up[activeTab]
                                                .gasometriaHistory[col];
                                            setPatients(up);
                                            save(up[activeTab]);
                                          }
                                        }}
                                        className="text-slate-400 hover:text-red-500"
                                        title="Excluir Coluna"
                                      >
                                        <X size={12} />
                                      </button>
                                    )}
                                </div>
                              </th>
                            ))}
                            {isEditable && (
                              <th className="p-0 border-l border-slate-300 bg-blue-100 min-w-[40px]">
                                <button
                                  onClick={() => {
                                    const n = prompt(
                                      "Identificação da nova gasometria (ex: 23/02 - 14h):"
                                    );
                                    if (n && n.trim()) {
                                      const up = [...patients];
                                      if (!up[activeTab].customGasometriaCols)
                                        up[activeTab].customGasometriaCols = [];
                                      if (
                                        !up[
                                          activeTab
                                        ].customGasometriaCols.includes(
                                          n.trim()
                                        )
                                      ) {
                                        up[
                                          activeTab
                                        ].customGasometriaCols.unshift(
                                          n.trim()
                                        );
                                        setPatients(up);
                                        save(up[activeTab]);
                                      }
                                    }
                                  }}
                                  className="text-blue-600 hover:text-blue-800 w-full h-full flex items-center justify-center p-2"
                                  title="Adicionar Gasometria extra"
                                >
                                  <PlusCircle size={18} />
                                </button>
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {GASOMETRIA_PARAMS.map((param) => (
                            <tr
                              key={param}
                              className="border-b last:border-0 hover:bg-slate-100 bg-white"
                            >
                              <td className="p-2 text-left font-bold text-slate-600 sticky left-0 bg-white border-r border-slate-200 z-10">
                                {param}
                              </td>
                              {uniqueGasoCols.map((col) => (
                                <td
                                  key={col}
                                  className="p-0 border-l border-slate-200"
                                >
                                  <input
                                    type="text"
                                    className="w-full h-full text-center outline-none bg-transparent focus:bg-blue-50 p-1.5"
                                    value={
                                      currentPatient.gasometriaHistory?.[col]?.[
                                        param
                                      ] || ""
                                    }
                                    onChange={(e) => {
                                      const up = [...patients];
                                      if (!up[activeTab].gasometriaHistory)
                                        up[activeTab].gasometriaHistory = {};
                                      if (!up[activeTab].gasometriaHistory[col])
                                        up[activeTab].gasometriaHistory[col] =
                                          {};
                                      up[activeTab].gasometriaHistory[col][
                                        param
                                      ] = e.target.value;
                                      setPatients(up);
                                    }}
                                    onBlur={() => save(patients[activeTab])}
                                  />
                                </td>
                              ))}
                              {isEditable && (
                                <td className="bg-slate-50 border-l border-slate-200"></td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </fieldset>
                  </div>

                  {/* --- BOTÃO GERADOR DE EVOLUÇÃO --- */}
                <div className="mt-8 mb-6 border-t-2 border-slate-200 pt-6">
                  <button
                    onClick={handleGeneratePhysioEvo}
                    className="w-full p-4 bg-gradient-to-r from-cyan-700 to-blue-800 text-white font-black rounded-xl shadow-lg hover:from-cyan-600 hover:to-blue-700 transition-all flex justify-center items-center gap-3 uppercase tracking-wider text-sm"
                  >
                    <FileText size={20} className="text-cyan-200" />
                    Gerar Evolução Diária
                  </button>
                </div>
                </div>
              )}

              {/* --- NUTRI --- */}
              {viewMode === "nutri" && (
                <fieldset
                  disabled={!isEditable}
                  className="space-y-6 animate-fadeIn min-w-0 border-0 p-0 m-0"
                >
                  <div className="p-4 border rounded-xl bg-lime-50/20">
                    <h4 className="font-bold text-lime-800 mb-4 flex items-center gap-2">
                      <Scale size={18} /> Antropometria e Metas
                    </h4>
                    <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                      <div className="lg:col-span-2">
                        <label className="text-xs font-bold text-gray-500">
                          Peso Atual (kg)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            className="w-full p-2 border rounded border-lime-300"
                            value={currentPatient.nutri?.peso || ""}
                            onChange={(e) =>
                              updateNested("nutri", "peso", e.target.value)
                            }
                          />
                          <select
                            className="p-2 border rounded text-xs bg-white"
                            value={currentPatient.nutri?.tipoMedicaoPeso || ""}
                            onChange={(e) =>
                              updateNested(
                                "nutri",
                                "tipoMedicaoPeso",
                                e.target.value
                              )
                            }
                          >
                            <option value="">Medição...</option>
                            <option value="Aferido">Aferido</option>
                            <option value="Referido">Referido</option>
                            <option value="Estimado">Estimado</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500">
                          Altura (m/cm)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full p-2 border rounded"
                          value={currentPatient.nutri?.altura || ""}
                          onChange={(e) =>
                            updateNested("nutri", "altura", e.target.value)
                          }
                        />
                      </div>
                      <div className="lg:col-span-2">
                        <label className="text-xs font-bold text-gray-500">
                          Peso Predito
                        </label>
                        <input
                          type="number"
                          className="w-full p-2 border rounded"
                          value={currentPatient.nutri?.pesoPredito || ""}
                          onChange={(e) =>
                            updateNested("nutri", "pesoPredito", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500">
                          Meta Calórica (kcal)
                        </label>
                        <input
                          type="number"
                          className="w-full p-2 border rounded"
                          value={currentPatient.nutri?.metaCal || ""}
                          onChange={(e) =>
                            updateNested("nutri", "metaCal", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500">
                          Meta Proteica (g)
                        </label>
                        <input
                          type="number"
                          className="w-full p-2 border rounded"
                          value={currentPatient.nutri?.metaProt || ""}
                          onChange={(e) =>
                            updateNested("nutri", "metaProt", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 bg-white p-3 rounded-lg border border-lime-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-bold text-lime-700">
                            Meta Atingida:
                          </span>
                          <input
                            type="text"
                            className="flex-1 p-1 border-b border-lime-500 outline-none text-sm bg-transparent"
                            value={currentPatient.nutri?.atingido || ""}
                            onChange={(e) =>
                              updateNested("nutri", "atingido", e.target.value)
                            }
                          />
                        </div>
                        <textarea
                          className="w-full text-xs p-2 border rounded outline-none h-12 bg-slate-50"
                          placeholder="Anotações sobre a meta atingida..."
                          value={currentPatient.nutri?.atingidoAnotacoes || ""}
                          onChange={(e) =>
                            updateNested(
                              "nutri",
                              "atingidoAnotacoes",
                              e.target.value
                            )
                          }
                        ></textarea>
                      </div>

                      <div className="flex items-center gap-2 bg-white p-4 rounded-lg border border-red-200 h-fit">
                        <span className="text-sm font-bold text-red-700">
                          Risco Nutricional (NRS 2002):
                        </span>
                        <select
                          className="p-1 border-b border-red-500 text-center outline-none bg-transparent"
                          value={currentPatient.nutri?.risco_nutricional || ""}
                          onChange={(e) =>
                            updateNested(
                              "nutri",
                              "risco_nutricional",
                              e.target.value
                            )
                          }
                        >
                          <option value="">-</option>
                          {RISCO_NUTRICIONAL.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-4 border rounded-xl bg-white">
                      <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <Utensils size={16} /> Dieta
                      </h4>

                      <label className="block text-xs font-bold text-gray-500 mb-1">
                        Via de Administração
                      </label>
                      <select
                        className="w-full p-2 border rounded mb-3"
                        value={currentPatient.nutri?.via || ""}
                        onChange={(e) =>
                          updateNested("nutri", "via", e.target.value)
                        }
                      >
                        <option value="">Selecione...</option>
                        <option value="Oral">Oral</option>
                        <option value="Enteral">Enteral</option>
                        <option value="Parenteral">Parenteral</option>
                        <option value="Zero">Zero</option>
                        <option value="Mista">Mista</option>
                      </select>

                      <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-500 mb-1">
                          Características da Dieta
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {CARACTERISTICAS_DIETA.map((c) => {
                            const cArray = Array.isArray(
                              currentPatient.nutri?.caracteristicasDieta
                            )
                              ? currentPatient.nutri.caracteristicasDieta
                              : [];
                            return (
                              <label
                                key={c}
                                className="flex items-center gap-1 text-xs text-slate-700 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={cArray.includes(c)}
                                  onChange={() =>
                                    toggleArrayItem(
                                      "nutri",
                                      "caracteristicasDieta",
                                      c
                                    )
                                  }
                                />{" "}
                                {c}
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-xs font-bold text-pink-700 mb-1">
                          Consistência da Dieta (Fono)
                        </label>
                        <select
                          className="w-full p-2 border rounded bg-pink-50/30"
                          value={currentPatient.fono?.consistencia || ""}
                          onChange={(e) =>
                            updateNested("fono", "consistencia", e.target.value)
                          }
                        >
                          <option value="">Selecione...</option>
                          {CONSISTENCIA_ALIMENTAR.map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      {(currentPatient.nutri?.via === "Enteral" ||
                        currentPatient.nutri?.via === "Parenteral") && (
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            placeholder="Tipo/Fórmula"
                            className="p-2 border rounded"
                            value={currentPatient.nutri?.tipoDieta || ""}
                            onChange={(e) =>
                              updateNested("nutri", "tipoDieta", e.target.value)
                            }
                          />
                          <input
                            placeholder="Vazão (ml/h)"
                            className="p-2 border rounded"
                            value={currentPatient.nutri?.vazao || ""}
                            onChange={(e) =>
                              updateNested("nutri", "vazao", e.target.value)
                            }
                          />
                        </div>
                      )}
                      {currentPatient.nutri?.via === "Mista" && (
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            placeholder="Enteral: Vazão"
                            className="p-2 border rounded"
                            value={currentPatient.nutri?.vazao || ""}
                            onChange={(e) =>
                              updateNested("nutri", "vazao", e.target.value)
                            }
                          />
                          <div className="text-xs text-slate-500 p-2 border rounded bg-slate-50 flex items-center justify-center text-center">
                            Oral / Fórmula Mista
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-4 border rounded-xl bg-white">
                      <h4 className="font-bold text-slate-700 mb-4">
                        Gastrointestinal
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-bold text-gray-500">
                            Resíduo Gástrico (ml)
                          </label>
                          <input
                            type="number"
                            className="w-full p-2 border rounded"
                            value={currentPatient.nutri?.residuo || ""}
                            onChange={(e) =>
                              updateNested("nutri", "residuo", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500">
                            Data Últ. Evacuação
                          </label>
                          <input
                            type="date"
                            className="w-full p-2 border rounded"
                            value={
                              currentPatient.gastro?.dataUltimaEvacuacao || ""
                            }
                            onChange={(e) =>
                              updateNested(
                                "gastro",
                                "dataUltimaEvacuacao",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>
                      {currentPatient.gastro?.dataUltimaEvacuacao && (
                        <p className="text-xs text-right mt-1 text-slate-400">
                          Tempo:{" "}
                          {calculateEvacDays(
                            currentPatient.gastro.dataUltimaEvacuacao
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-white border rounded-xl">
                    <h4 className="font-bold text-slate-700 mb-2">
                      Anotações Nutricionais
                    </h4>
                    <textarea
                      className="w-full p-3 border rounded-lg h-32 text-sm"
                      placeholder="Evolução nutricional, condutas específicas, cálculos..."
                      value={currentPatient.nutri?.anotacoes || ""}
                      onChange={(e) =>
                        updateNested("nutri", "anotacoes", e.target.value)
                      }
                    />
                  </div>
                </fieldset>
              )}

              {/* --- FONO --- */}
              {viewMode === "speech" && (
                <fieldset
                  disabled={!isEditable}
                  className="space-y-6 animate-fadeIn min-w-0 border-0 p-0 m-0"
                >
                  <div className="p-4 border rounded-xl bg-pink-50/20">
                    <h4 className="font-bold text-pink-800 mb-4 flex items-center gap-2">
                      <Mic size={18} /> Avaliação Fonoaudiológica
                    </h4>

                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-4">
                        <div className="bg-white p-4 rounded-lg border border-pink-100">
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                            Nível de Consciência
                          </label>
                          <input
                            className="w-full p-2 border rounded"
                            value={currentPatient.fono?.nivel_consciencia || ""}
                            onChange={(e) =>
                              updateNested(
                                "fono",
                                "nivel_consciencia",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-pink-100">
                          <label className="block text-xs font-bold text-pink-700 uppercase mb-2">
                            Compreensão
                          </label>
                          <select
                            className="w-full p-2 border rounded"
                            value={currentPatient.fono?.compreensao || ""}
                            onChange={(e) =>
                              updateNested(
                                "fono",
                                "compreensao",
                                e.target.value
                              )
                            }
                          >
                            <option value="">Selecione...</option>
                            {FONO_COMPREENSAO.map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-pink-100">
                          <label className="block text-xs font-bold text-pink-700 uppercase mb-2">
                            Expressão Oral
                          </label>
                          <select
                            className="w-full p-2 border rounded mb-2"
                            value={currentPatient.fono?.expressao_oral || ""}
                            onChange={(e) =>
                              updateNested(
                                "fono",
                                "expressao_oral",
                                e.target.value
                              )
                            }
                          >
                            <option value="">Selecione...</option>
                            {FONO_EXPRESSAO.map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                          {currentPatient.fono?.expressao_oral ===
                            "Alterada" && (
                            <select
                              className="w-full p-2 border rounded bg-pink-50"
                              value={
                                currentPatient.fono?.expressao_oral_detalhe ||
                                ""
                              }
                              onChange={(e) =>
                                updateNested(
                                  "fono",
                                  "expressao_oral_detalhe",
                                  e.target.value
                                )
                              }
                            >
                              <option value="">Detalhe...</option>
                              {FONO_EXPRESSAO_DETALHE.map((c) => (
                                <option key={c}>{c}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-white p-4 rounded-lg border border-pink-100">
                          <label className="block text-xs font-bold text-pink-700 uppercase mb-2">
                            Consistência Alimentar Liberada
                          </label>
                          <select
                            className="w-full p-2 border rounded"
                            value={currentPatient.fono?.consistencia || ""}
                            onChange={(e) =>
                              updateNested(
                                "fono",
                                "consistencia",
                                e.target.value
                              )
                            }
                          >
                            <option value="">Selecione...</option>
                            {CONSISTENCIA_ALIMENTAR.map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-pink-100">
                          <label className="flex items-center gap-2 font-bold text-pink-700 mb-2">
                            <input
                              type="checkbox"
                              checked={currentPatient.fono?.toleraAgua || false}
                              onChange={(e) =>
                                updateNested(
                                  "fono",
                                  "toleraAgua",
                                  e.target.checked
                                )
                              }
                            />{" "}
                            Água Oral Liberada?
                          </label>
                          {currentPatient.fono?.toleraAgua && (
                            <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                Utensílio
                              </label>
                              <select
                                className="w-full p-2 border rounded"
                                value={currentPatient.fono?.utensilioAgua || ""}
                                onChange={(e) =>
                                  updateNested(
                                    "fono",
                                    "utensilioAgua",
                                    e.target.value
                                  )
                                }
                              >
                                <option value="">Selecione...</option>
                                {UTENSILIOS_AGUA.map((u) => (
                                  <option key={u}>{u}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-pink-100">
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                            Blue Dye Test
                          </label>
                          <select
                            className="w-full p-2 border rounded"
                            value={currentPatient.fono?.blue_dye || ""}
                            onChange={(e) =>
                              updateNested("fono", "blue_dye", e.target.value)
                            }
                          >
                            <option value="">Selecione...</option>
                            <option value="Negativo">Negativo</option>
                            <option value="Positivo">Positivo</option>
                            <option value="Não Realizado">Não Realizado</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl mb-4">
                      <h4 className="font-bold text-red-800 mb-3 text-sm uppercase">
                        Sinais de Inaptidão para Via Oral
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {FONO_INAPTO_VO.map((item) => {
                          const voArray = Array.isArray(
                            currentPatient.fono?.inapto_vo
                          )
                            ? currentPatient.fono.inapto_vo
                            : [];
                          return (
                            <label
                              key={item}
                              className="flex items-start gap-2 text-xs text-red-700 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                className="mt-0.5"
                                checked={voArray.includes(item)}
                                onChange={() =>
                                  toggleArrayItem("fono", "inapto_vo", item)
                                }
                              />
                              {item}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">
                        Conduta / Plano Terapêutico
                      </label>
                      <textarea
                        className="w-full p-3 border rounded h-24"
                        value={currentPatient.fono?.conduta || ""}
                        onChange={(e) =>
                          updateNested("fono", "conduta", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </fieldset>
              )}

              {/* --- TECH --- */}
              {viewMode === "tech" && (
                <div className="space-y-8 animate-fadeIn print:space-y-2 bh-print-container">
                  <div
                    id="print-header"
                    className="hidden print:flex w-full justify-between items-center text-xs font-bold border-b-2 border-black pb-2 mb-1 text-black"
                  >
                    <span className="flex-1">
                      PACIENTE:{" "}
                      {currentPatient.nome?.toUpperCase() || "___________"}
                    </span>
                    <span className="w-20 text-center">
                      IDADE:{" "}
                      {calculateAge(currentPatient.dataNascimento) || "__"}a
                    </span>
                    <span className="w-20 text-center">
                      LEITO: {currentPatient.leito}
                    </span>
                    <span className="w-24 text-right">
                      DATA:{" "}
                      {formatDateDDMM(displayedBH.date || getManausDateStr())}
                    </span>
                  </div>

                  {viewingPreviousBH && (
                    <div className="bg-orange-100 border border-orange-300 text-orange-800 p-3 rounded-xl mb-4 text-sm font-bold flex items-center justify-center gap-2 print:hidden">
                      <AlertCircle size={18} />
                      VOCÊ ESTÁ VISUALIZANDO O BALANÇO HÍDRICO DO DIA ANTERIOR
                      (SOMENTE LEITURA).
                    </div>
                  )}

                  <div className="flex justify-between items-end mb-2 print:hidden">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Droplets className="text-blue-500" />
                      Balanço Hídrico{" "}
                      {viewingPreviousBH ? "(DIA ANTERIOR)" : "24h"}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          currentPatient.bh_previous &&
                          setViewingPreviousBH(!viewingPreviousBH)
                        }
                        disabled={!currentPatient.bh_previous}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
                          !currentPatient.bh_previous
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : viewingPreviousBH
                            ? "bg-orange-500 text-white hover:bg-orange-600"
                            : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                        }`}
                        title={
                          !currentPatient.bh_previous
                            ? "Ainda não foi fechado nenhum dia para este leito."
                            : "Ver balanço do dia anterior"
                        }
                      >
                        <Clock size={14} />{" "}
                        {viewingPreviousBH ? "Voltar ao Atual" : "Dia Anterior"}
                      </button>
                      <button
                        onClick={handlePrintBH}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <Printer size={14} /> Imprimir
                      </button>
                      {!viewingPreviousBH && canCloseDay && (
                        <button
                          onClick={handleNextDayBH}
                          disabled={!isEditable}
                          className={`bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                            !isEditable
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:bg-blue-700"
                          }`}
                        >
                          <RotateCcw size={14} /> Fechar Dia
                        </button>
                      )}
                    </div>
                  </div>

                  <fieldset
                    disabled={isBHReadOnly}
                    className="min-w-0 border-0 p-0 m-0 space-y-4"
                  >
                    <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl print:hidden">
                      <div className="flex items-center gap-2">
                        <Scale size={16} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-500 uppercase">
                          Peso (kg):
                        </span>
                        <input
                          type="text"
                          value={currentPatient.nutri?.peso}
                          disabled
                          className="w-20 p-1 border rounded text-center text-sm font-bold bg-gray-100 text-gray-500"
                          placeholder={currentPatient.nutri?.peso || "---"}
                        />
                      </div>
                      {!viewingPreviousBH && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleAutoCalcInsensible();
                          }}
                          className="text-blue-600 text-xs font-bold hover:underline print:hidden"
                        >
                          Calcular PI
                        </button>
                      )}
                      <div className="ml-auto text-xs text-slate-500">
                        PI Total:{" "}
                        <input
                          type="text"
                          value={displayedBH.insensibleLoss}
                          onChange={(e) =>
                            updateNested("bh", "insensibleLoss", e.target.value)
                          }
                          className="w-16 p-1 border rounded text-center ml-1 bg-white"
                        />{" "}
                        ml
                      </div>
                    </div>

                      <div>
                      <div className="overflow-x-auto border rounded-xl print:overflow-visible print:border-none print:w-full">
                        <table className="w-full text-xs text-center border-collapse">
                          <thead>
                            <tr className="bg-blue-600 text-white print:bg-gray-300 print:text-black">
                              <th className="p-2 text-left min-w-[120px] sticky left-0 z-10 bg-blue-600 print:bg-gray-300 print:p-1">
                                ITEM
                              </th>
                              {BH_HOURS.map((h) => (
                                <th
                                  key={h}
                                  className="p-1 min-w-[25px] border-l border-blue-500 print:border-black"
                                >
                                  {h.split(":")[0]}
                                </th>
                              ))}
                              <th className="p-2 min-w-[40px] bg-blue-700 print:bg-gray-400 print:border-black print:border-l">
                                TOTAL
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="bg-green-50 print:bg-white">
                              <td
                                colSpan={26}
                                className="text-left p-1 font-bold text-green-700 sticky left-0 bg-green-50 print:bg-white print:text-black border border-black"
                              >
                                GANHOS (+)
                              </td>
                            </tr>
                            {[
                              ...BH_GAINS,
                              ...(displayedBH.customGains || []),
                            ].map((item) => {
                              let rowTotal = 0;
                              BH_HOURS.forEach(
                                (h) =>
                                  (rowTotal += safeNumber(
                                    displayedBH.gains[h]?.[item]
                                  ))
                              );
                              return (
                                <tr
                                  key={item}
                                  className="hover:bg-slate-200 transition-colors group border-b print:border-black"
                                >
                                  <td className="p-1 text-left font-medium text-slate-600 sticky left-0 bg-white group-hover:bg-slate-200 transition-colors border-r print:border-black print:text-black">
                                    <div className="flex justify-between items-center">
                                      <span>{item}</span>
                                      {displayedBH.customGains?.includes(
                                        item
                                      ) &&
                                        isEditable &&
                                        !viewingPreviousBH && (
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault();
                                              if (
                                                window.confirm(
                                                  `Excluir a linha de ganho "${item}"?`
                                                )
                                              ) {
                                                const up = [...patients];
                                                up[activeTab].bh.customGains =
                                                  up[
                                                    activeTab
                                                  ].bh.customGains.filter(
                                                    (g) => g !== item
                                                  );
                                                if (up[activeTab].bh.gains) {
                                                  Object.keys(
                                                    up[activeTab].bh.gains
                                                  ).forEach((hour) => {
                                                    if (
                                                      up[activeTab].bh.gains[
                                                        hour
                                                      ]
                                                    )
                                                      delete up[activeTab].bh
                                                        .gains[hour][item];
                                                  });
                                                }
                                                setPatients(up);
                                                save(up[activeTab]);
                                              }
                                            }}
                                            className="text-slate-400 hover:text-red-500 print:hidden"
                                            title="Excluir Ganho"
                                          >
                                            <X size={12} />
                                          </button>
                                        )}
                                    </div>
                                  </td>
                                  {BH_HOURS.map((h) => (
                                    <td
                                      key={h}
                                      className="p-0 border-r border-slate-100 print:border-black print:overflow-visible"
                                    >
                                      <input
                                        type="text"
                                        className="w-full h-full text-center outline-none bg-transparent focus:bg-blue-50 p-0.5 print:hidden"
                                        value={
                                          displayedBH.gains[h]?.[item] || ""
                                        }
                                        onChange={(e) =>
                                          updateBH(
                                            h,
                                            "gains",
                                            item,
                                            e.target.value
                                          )
                                        }
                                      />
                                      <span className="hidden print:block text-center text-[8px] w-full align-middle">
                                        {displayedBH.gains[h]?.[item] || ""}
                                      </span>
                                    </td>
                                  ))}
                                  <td className="font-bold text-slate-700 bg-slate-50 print:bg-white print:text-black print:border-black text-[9px]">
                                    {rowTotal || ""}
                                  </td>
                                </tr>
                              );
                            })}
                            {isEditable && !viewingPreviousBH && (
                              <tr className="print:hidden">
                                <td
                                  colSpan={26}
                                  className="text-left sticky left-0 bg-white border-r print:border-black border-b p-1"
                                >
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      const n = prompt("Nome do novo ganho:");
                                      if (n && n.trim()) {
                                        const up = [...patients];
                                        if (!up[activeTab].bh.customGains)
                                          up[activeTab].bh.customGains = [];
                                        if (
                                          !up[
                                            activeTab
                                          ].bh.customGains.includes(n.trim()) &&
                                          !BH_GAINS.includes(n.trim())
                                        ) {
                                          up[activeTab].bh.customGains.push(
                                            n.trim()
                                          );
                                          setPatients(up);
                                          save(up[activeTab]);
                                        }
                                      }
                                    }}
                                    className="text-blue-600 hover:text-blue-800 font-bold text-[10px] flex items-center gap-1 w-full p-1"
                                    title="Adicionar Linha de Ganho"
                                  >
                                    <PlusCircle size={14} /> Adicionar Ganho
                                  </button>
                                </td>
                              </tr>
                            )}
                            <tr className="bg-slate-200 text-slate-600 print:hidden text-[10px] font-bold border-y-4 border-white">
                              <th className="p-1 text-left sticky left-0 z-10 bg-slate-200 border-r border-slate-300">
                                HORÁRIO
                              </th>
                              {BH_HOURS.map((h) => (
                                <th
                                  key={h}
                                  className="p-1 min-w-[25px] border-r border-slate-300"
                                >
                                  {h.split(":")[0]}
                                </th>
                              ))}
                              <th className="p-1 min-w-[40px] bg-slate-300">
                                TOTAL
                              </th>
                            </tr>

                            <tr className="bg-red-50 print:bg-white">
                              <td
                                colSpan={26}
                                className="text-left p-1 font-bold text-red-700 sticky left-0 bg-red-50 print:bg-white print:text-black border border-black"
                              >
                                PERDAS (-)
                              </td>
                            </tr>
                            {[
                              ...BH_LOSSES,
                              ...(displayedBH.customLosses || []),
                            ].map((item) => {
                              let rowTotal = 0;
                              BH_HOURS.forEach(
                                (h) =>
                                  (rowTotal += safeNumber(
                                    displayedBH.losses[h]?.[item]
                                  ))
                              );
                              let displayTotal = rowTotal;
                              if (item === "Diurese (Total Coletado)") {
                                let totalIrrigation = 0;
                                if (displayedBH.irrigation)
                                  Object.values(displayedBH.irrigation).forEach(
                                    (val) =>
                                      (totalIrrigation += safeNumber(val))
                                  );
                                displayTotal = rowTotal - totalIrrigation;
                              }
                              return (
                                <tr
                                  key={item}
                                  className="hover:bg-slate-200 transition-colors group border-b print:border-black"
                                >
                                  <td className="p-1 text-left font-medium text-slate-600 sticky left-0 bg-white group-hover:bg-slate-200 transition-colors border-r print:border-black print:text-black">
                                    <div className="flex justify-between items-center">
                                      <span>{item}</span>
                                      {displayedBH.customLosses?.includes(
                                        item
                                      ) &&
                                        isEditable &&
                                        !viewingPreviousBH && (
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault();
                                              if (
                                                window.confirm(
                                                  `Excluir a linha de perda "${item}"?`
                                                )
                                              ) {
                                                const up = [...patients];
                                                up[activeTab].bh.customLosses =
                                                  up[
                                                    activeTab
                                                  ].bh.customLosses.filter(
                                                    (g) => g !== item
                                                  );
                                                if (up[activeTab].bh.losses) {
                                                  Object.keys(
                                                    up[activeTab].bh.losses
                                                  ).forEach((hour) => {
                                                    if (
                                                      up[activeTab].bh.losses[
                                                        hour
                                                      ]
                                                    )
                                                      delete up[activeTab].bh
                                                        .losses[hour][item];
                                                  });
                                                }
                                                setPatients(up);
                                                save(up[activeTab]);
                                              }
                                            }}
                                            className="text-slate-400 hover:text-red-500 print:hidden"
                                            title="Excluir Perda"
                                          >
                                            <X size={12} />
                                          </button>
                                        )}
                                    </div>
                                  </td>
                                  {BH_HOURS.map((h) => (
                                    <td
                                      key={h}
                                      className="p-0 border-r border-slate-100 print:border-black print:overflow-visible"
                                    >
                                      <input
                                        type="text"
                                        className="w-full h-full text-center outline-none bg-transparent focus:bg-blue-50 p-0.5 print:hidden"
                                        value={
                                          displayedBH.losses[h]?.[item] || ""
                                        }
                                        onChange={(e) =>
                                          updateBH(
                                            h,
                                            "losses",
                                            item,
                                            e.target.value
                                          )
                                        }
                                      />
                                      <span className="hidden print:block text-center text-[8px] w-full align-middle">
                                        {displayedBH.losses[h]?.[item] || ""}
                                      </span>
                                    </td>
                                  ))}
                                  <td className="font-bold text-slate-700 bg-slate-50 print:bg-white print:text-black print:border-black text-[9px]">
                                    {displayTotal || ""}
                                  </td>
                                </tr>
                              );
                            })}
                            {isEditable && !viewingPreviousBH && (
                              <tr className="print:hidden">
                                <td
                                  colSpan={26}
                                  className="text-left sticky left-0 bg-white border-r print:border-black border-b p-1"
                                >
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      const n = prompt("Nome da nova perda:");
                                      if (n && n.trim()) {
                                        const up = [...patients];
                                        if (!up[activeTab].bh.customLosses)
                                          up[activeTab].bh.customLosses = [];
                                        if (
                                          !up[
                                            activeTab
                                          ].bh.customLosses.includes(
                                            n.trim()
                                          ) &&
                                          !BH_LOSSES.includes(n.trim())
                                        ) {
                                          up[activeTab].bh.customLosses.push(
                                            n.trim()
                                          );
                                          setPatients(up);
                                          save(up[activeTab]);
                                        }
                                      }
                                    }}
                                    className="text-red-600 hover:text-red-800 font-bold text-[10px] flex items-center gap-1 w-full p-1"
                                    title="Adicionar Linha de Perda"
                                  >
                                    <PlusCircle size={14} /> Adicionar Perda
                                  </button>
                                </td>
                              </tr>
                            )}
                            <tr className="bg-yellow-50/50 hover:bg-slate-200 transition-colors group border-t-2 border-slate-200 print:bg-white print:border-black">
                              <td className="p-1 text-left font-bold text-slate-500 sticky left-0 bg-white group-hover:bg-slate-200 transition-colors border-r print:border-black print:text-black">
                                Irrigação Vesical
                              </td>
                              {BH_HOURS.map((h) => (
                                <td
                                  key={h}
                                  className="p-0 border-r border-slate-100 print:border-black print:overflow-visible"
                                >
                                  <input
                                    type="text"
                                    className="w-full h-full text-center outline-none bg-transparent focus:bg-yellow-50 p-0.5 text-slate-400 print:hidden"
                                    placeholder="Vol"
                                    value={displayedBH.irrigation[h] || ""}
                                    onChange={(e) =>
                                      updateBH(
                                        h,
                                        "irrigation",
                                        null,
                                        e.target.value
                                      )
                                    }
                                  />
                                  <span className="hidden print:block text-center text-[8px] w-full text-black align-middle">
                                    {displayedBH.irrigation[h] || ""}
                                  </span>
                                </td>
                              ))}
                              <td className="font-bold text-slate-700 bg-slate-50 print:bg-white print:text-black print:border-black text-[9px]">
                                {Object.values(
                                  displayedBH.irrigation || {}
                                ).reduce((a, b) => a + safeNumber(b), 0) || ""}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-100 rounded-xl border border-slate-200 print:hidden mt-4">
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase">
                            Total Ganhos
                          </p>
                          <p className="text-xl font-bold text-green-600">
                            +{bhTotals.totalGains}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase">
                            Total Perdas (+PI)
                          </p>
                          <p className="text-xl font-bold text-red-600">
                            -
                            {bhTotals.totalLosses +
                              safeNumber(displayedBH.insensibleLoss)}
                          </p>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-300 print:border-none">
                          <p className="text-[10px] text-slate-500 font-bold uppercase">
                            Balanço 24h
                          </p>
                          <p
                            className={`text-xl font-bold ${
                              bhTotals.dailyBalance >= 0
                                ? "text-blue-600"
                                : "text-orange-600"
                            }`}
                          >
                            {bhTotals.dailyBalance > 0 ? "+" : ""}
                            {bhTotals.dailyBalance}
                          </p>
                        </div>

                        <div className="bg-slate-800 p-2 rounded-lg text-white print:text-black print:bg-white print:border flex flex-col justify-between">
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-[10px] text-slate-400 font-bold uppercase print:text-black">
                              Acumulado Ant.
                            </p>
                            <input
                              type="text"
                              value={displayedBH.accumulated || ""}
                              onChange={(e) =>
                                updateNested(
                                  "bh",
                                  "accumulated",
                                  e.target.value
                                )
                              }
                              className="w-12 bg-slate-700 text-white text-xs text-center rounded outline-none border border-slate-600 print:hidden focus:ring-1 focus:ring-blue-400"
                            />
                            <span className="hidden print:inline text-[10px] font-bold">
                              {displayedBH.accumulated || 0}
                            </span>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase print:text-black">
                              Total Atual
                            </p>
                            <p className="text-xl font-bold">
                              {bhTotals.accumulated > 0 ? "+" : ""}
                              {bhTotals.accumulated}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="hidden print:flex justify-between items-center text-[10px] font-bold border border-black mt-1 p-1 print:mb-1">
                        <span>GANHOS: +{bhTotals.totalGains}</span>
                        <span>
                          PERDAS (c/ PI): -
                          {bhTotals.totalLosses +
                            safeNumber(displayedBH.insensibleLoss)}
                        </span>
                        <span>
                          BALANÇO 24H: {bhTotals.dailyBalance > 0 ? "+" : ""}
                          {bhTotals.dailyBalance}
                        </span>
                        <span>
                          ACUMULADO: {bhTotals.accumulated > 0 ? "+" : ""}
                          {bhTotals.accumulated}
                        </span>
                      </div>
                    </div>
                  </fieldset>

                  <div className="mt-8 print:mt-1">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2 print:hidden">
                      <Activity className="text-red-500" /> Sinais Vitais
                    </h3>
                    <div className="hidden print:block font-bold text-xs mb-1 uppercase bg-gray-200 p-1 border border-black text-center">
                      Sinais Vitais
                    </div>
                    <fieldset
                      disabled={isBHReadOnly}
                      className="overflow-x-auto border rounded-xl print:border-none print:overflow-visible min-w-0 border-0 p-0 m-0"
                    >
                      <table className="w-full text-xs text-center border-collapse">
                        <thead>
                          <tr className="bg-slate-200 print:bg-gray-300 print:text-black">
                            <th className="p-2 text-left min-w-[100px] sticky left-0 z-10 bg-slate-200 print:bg-gray-300 print:p-1">
                              PARÂMETRO
                            </th>
                            {BH_HOURS.map((h) => (
                              <th
                                key={h}
                                className="p-1 min-w-[25px] border-l border-slate-300 print:border-black"
                              >
                                {h.split(":")[0]}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            "Temp (ºC)",
                            "FC (bpm)",
                            "FR (irpm)",
                            "PAS",
                            "PAD",
                            "PAM",
                            "SpO2 (%)",
                            "HGT (mg/dL)",
                            "Insulina",
                          ].map((param) => (
                            <tr
                              key={param}
                              className="border-b last:border-0 hover:bg-slate-200 transition-colors group print:border-black"
                            >
                              <td className="p-2 text-left font-medium sticky left-0 bg-white group-hover:bg-slate-200 transition-colors border-r print:border-black print:text-black">
                                {param}
                              </td>
                              {BH_HOURS.map((h) => {
                                const val =
                                  displayedBH.vitals[h]?.[param] || "";
                                const numVal = safeNumber(val);
                                let isRed = false;
                                if (val !== "") {
                                  if (param === "Temp (ºC)" && numVal >= 38)
                                    isRed = true;
                                  if (
                                    param === "FC (bpm)" &&
                                    (numVal > 100 || numVal < 60)
                                  )
                                    isRed = true;
                                  if (param === "PAM" && numVal < 65)
                                    isRed = true;
                                  if (param === "SpO2 (%)" && numVal < 90)
                                    isRed = true;
                                  if (
                                    param === "HGT (mg/dL)" &&
                                    (numVal > 180 || numVal < 70)
                                  )
                                    isRed = true;
                                }
                                return (
                                  <td
                                    key={h}
                                    className="p-0 border-r border-slate-100 print:border-black print:overflow-visible"
                                  >
                                    <input
                                      type="text"
                                      className={`w-full h-full text-center outline-none bg-transparent focus:bg-blue-50 p-0.5 print:hidden ${
                                        isRed ? "text-red-600 font-bold" : ""
                                      }`}
                                      value={val}
                                      onChange={(e) =>
                                        updateBH(
                                          h,
                                          "vitals",
                                          param,
                                          e.target.value
                                        )
                                      }
                                    />
                                    <span
                                      className={`hidden print:block text-center text-[8px] w-full align-middle ${
                                        isRed ? "font-bold" : ""
                                      }`}
                                    >
                                      {val}
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </fieldset>
                  </div>

                  <fieldset
                    disabled={!isEditable}
                    className="mt-6 print:hidden min-w-0 border-0 p-0 m-0"
                  >
                    <div className="p-4 bg-white border rounded-xl shadow-sm">
                      <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <Edit3 size={16} className="text-slate-400" /> Anotações
                        da Equipe Técnica
                      </h4>
                      <textarea
                        className="w-full p-3 border rounded-lg h-32 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-slate-50 focus:bg-white transition-colors"
                        placeholder="Registros do plantão, intercorrências, observações gerais..."
                        value={currentPatient.enfermagem?.anotacoes_tech || ""}
                        onChange={(e) =>
                          updateNested(
                            "enfermagem",
                            "anotacoes_tech",
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </fieldset>
                </div>
              )}

              {/* --- HEMODIÁLISE --- */}
              {viewMode === "hemodialysis" && (
                <div className="space-y-4 animate-fadeIn hd-print-container">
                  <div className="hidden print:block hd-print-header">
                    UNIDADE DE TERAPIA INTENSIVA - HOSPITAL MUNICIPAL DE
                    ARIQUEMES
                    <br />
                    PREFEITURA MUNICIPAL DE ARIQUEMES
                    <br />
                    PRESCRIÇÃO E MONITORAMENTO DO TRATAMENTO DIALÍTICO
                  </div>

                  <div className="hidden print:flex justify-between border-b-2 border-black pb-1 mb-1 font-bold text-[10px]">
                    <span className="flex-1">
                      PACIENTE:{" "}
                      {currentPatient.nome?.toUpperCase() ||
                        "_______________________"}
                    </span>
                    <span className="w-32 text-center">
                      IDADE:{" "}
                      {calculateAge(currentPatient.dataNascimento) || "___"}
                    </span>
                    <span className="w-32 text-center">
                      LEITO: {currentPatient.leito}
                    </span>
                    <span className="w-32 text-right">
                      DATA: {formatDateDDMM(getManausDateStr())}
                    </span>
                  </div>

                  <div className="flex justify-between items-center print:hidden mb-4">
                    <h3 className="text-xl font-bold text-blue-800 flex items-center gap-2">
                      <Filter size={20} /> Terapia Renal Substitutiva
                    </h3>
                    <button
                      onClick={() => {
                        document.body.classList.add("printing-hd");
                        setTimeout(() => {
                          window.print();
                          setTimeout(() => {
                            document.body.classList.remove("printing-hd");
                          }, 500);
                        }, 100);
                      }}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
                    >
                      <Printer size={16} /> Imprimir Ficha
                    </button>
                  </div>

                  {/* SECÇÃO 1: PRESCRIÇÃO MÉDICA */}
                  <fieldset
                    disabled={!isDocRole && currentPatient?.leito !== 11}
                    className="p-4 border rounded-xl bg-blue-50/30 print:border print:p-1 min-w-0 m-0 print:mb-1"
                  >
                    <div className="flex justify-between items-center mb-3 print:mb-1">
                     <h4 className="font-bold text-blue-800 text-sm section-title m-0">
                      PRESCRIÇÃO MÉDICA DE HEMODIÁLISE
                     </h4>
                     <button
    type="button"
    onClick={() => resetHDMedica()}
    className="print:hidden text-[10px] bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 font-bold transition-colors shadow-sm"
    title="Apagar todos os campos médicos"
  >
    Limpar Prescrição
  </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 print:grid-cols-5 gap-4 print:gap-x-2 print:gap-y-1 text-xs print:text-[9px]">
                      <div>
                        <label className="font-bold text-slate-500 print:text-black">
                          Duração
                        </label>
                        <input
                          type="text"
                          className="w-full p-2 print:p-0.5 border rounded"
                          value={currentPatient.hd_prescricao?.duracao || ""}
                          onChange={(e) =>
                            updateNested(
                              "hd_prescricao",
                              "duracao",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-500 print:text-black">
                          Temperatura
                        </label>
                        <input
                          type="text"
                          className="w-full p-2 print:p-0.5 border rounded"
                          value={
                            currentPatient.hd_prescricao?.temperatura || ""
                          }
                          onChange={(e) =>
                            updateNested(
                              "hd_prescricao",
                              "temperatura",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-500 print:text-black">
                          Ultrafiltração
                        </label>
                        <input
                          type="text"
                          className="w-full p-2 print:p-0.5 border rounded"
                          value={currentPatient.hd_prescricao?.uf || ""}
                          onChange={(e) =>
                            updateNested("hd_prescricao", "uf", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-500 print:text-black">
                          Anticoagulação
                        </label>
                        <input
                          type="text"
                          className="w-full p-2 print:p-0.5 border rounded"
                          value={
                            currentPatient.hd_prescricao?.anticoagulacao || ""
                          }
                          onChange={(e) =>
                            updateNested(
                              "hd_prescricao",
                              "anticoagulacao",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-500 print:text-black">
                          Desprezar Priming
                        </label>
                        <input
                          type="text"
                          className="w-full p-2 print:p-0.5 border rounded"
                          value={currentPatient.hd_prescricao?.priming || ""}
                          onChange={(e) =>
                            updateNested(
                              "hd_prescricao",
                              "priming",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-500 print:text-black">
                          Sódio / Perfil
                        </label>
                        <input
                          type="text"
                          className="w-full p-2 print:p-0.5 border rounded"
                          value={currentPatient.hd_prescricao?.sodio || ""}
                          onChange={(e) =>
                            updateNested(
                              "hd_prescricao",
                              "sodio",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-500 print:text-black">
                          Fluxo de Sangue
                        </label>
                        <input
                          type="text"
                          className="w-full p-2 print:p-0.5 border rounded"
                          value={
                            currentPatient.hd_prescricao?.fluxo_sangue || ""
                          }
                          onChange={(e) =>
                            updateNested(
                              "hd_prescricao",
                              "fluxo_sangue",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-500 print:text-black">
                          Fluxo Dialisato
                        </label>
                        <input
                          type="text"
                          className="w-full p-2 print:p-0.5 border rounded"
                          value={
                            currentPatient.hd_prescricao?.fluxo_dialisato || ""
                          }
                          onChange={(e) =>
                            updateNested(
                              "hd_prescricao",
                              "fluxo_dialisato",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="md:col-span-2 print:col-span-1">
                        <label className="font-bold text-slate-500 print:text-black">
                          Dialisador
                        </label>
                        <input
                          type="text"
                          className="w-full p-2 print:p-0.5 border rounded"
                          value={currentPatient.hd_prescricao?.dialisador || ""}
                          onChange={(e) =>
                            updateNested(
                              "hd_prescricao",
                              "dialisador",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <div className="md:col-span-2 print:col-span-5">
                        <label className="font-bold text-slate-500 print:text-black">
                          Observação
                        </label>
                        <input
                          type="text"
                          className="w-full p-2 print:p-0.5 border rounded"
                          value={currentPatient.hd_prescricao?.obs || ""}
                          onChange={(e) =>
                            updateNested("hd_prescricao", "obs", e.target.value)
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 print:grid-cols-5 gap-2 print:gap-1 mt-4 print:mt-1 pt-2 border-t print:border-none text-[10px] print:text-[8px]">
                      <div>
                        <label className="text-slate-500 print:text-black font-bold block mb-1">
                          Nefrologista
                        </label>
                        <input
                          type="text"
                          className="w-full p-1 print:p-0 border-b print:border-b"
                          value={currentPatient.hd_prescricao?.nefro || ""}
                          onChange={(e) =>
                            updateNested(
                              "hd_prescricao",
                              "nefro",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="text-slate-500 print:text-black font-bold block mb-1">
                          Téc. Nefrologia
                        </label>
                        <input
                          type="text"
                          className="w-full p-1 print:p-0 border-b print:border-b"
                          value={currentPatient.hd_prescricao?.tec_nefro || ""}
                          onChange={(e) =>
                            updateNested(
                              "hd_prescricao",
                              "tec_nefro",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="text-slate-500 print:text-black font-bold block mb-1">
                          Plantonista Manhã
                        </label>
                        <input
                          type="text"
                          className="w-full p-1 print:p-0 border-b print:border-b"
                          value={currentPatient.hd_prescricao?.plant_m || ""}
                          onChange={(e) =>
                            updateNested(
                              "hd_prescricao",
                              "plant_m",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="text-slate-500 print:text-black font-bold block mb-1">
                          Plantonista Tarde
                        </label>
                        <input
                          type="text"
                          className="w-full p-1 print:p-0 border-b print:border-b"
                          value={currentPatient.hd_prescricao?.plant_t || ""}
                          onChange={(e) =>
                            updateNested(
                              "hd_prescricao",
                              "plant_t",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="text-slate-500 print:text-black font-bold block mb-1">
                          Plantonista Noite
                        </label>
                        <input
                          type="text"
                          className="w-full p-1 print:p-0 border-b print:border-b"
                          value={currentPatient.hd_prescricao?.plant_n || ""}
                          onChange={(e) =>
                            updateNested(
                              "hd_prescricao",
                              "plant_n",
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </div>
                  </fieldset>

                  {/* SECÇÃO 2: MONITORAMENTO HORÁRIO */}
<fieldset
  disabled={!isNursingRole && currentPatient?.leito !== 11}
  className="min-w-0 border-0 p-0 m-0 mt-4"
>
  <div className="flex justify-between items-center mb-2 print:hidden">
    <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
      CONTROLES E ANOTAÇÕES DA ENFERMAGEM
    </h4>
    <button
    type="button"
    onClick={() => resetHDTecnico()}
    className="print:hidden text-[10px] bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 font-bold transition-colors shadow-sm"
    title="Apagar monitoramento, balanço, acessos e insumos"
  >
    Limpar Tudo (Técnico)
  </button>
  </div>
  <div className="overflow-x-auto border rounded-xl print:border-none print:mt-2">
                      <table className="w-full text-xs text-center border-collapse table-fixed">
                      <thead>
                          <tr className="bg-slate-200">
                            <th className="p-2 print:p-0.5 border w-12 font-bold">HORÁRIO</th>
                            <th className="p-2 print:p-0.5 border">PA</th>
                            <th className="p-2 print:p-0.5 border">PAM</th>
                            <th className="p-2 print:p-0.5 border">FC</th>
                            <th className="p-2 print:p-0.5 border">Glic.</th>
                            <th className="p-2 print:p-0.5 border">Ins. R</th>
                            <th className="p-2 print:p-0.5 border">Nora</th>
                            <th className="p-2 print:p-0.5 border">S.F. 0,9%</th>
                            <th className="p-2 print:p-0.5 border text-blue-700">GH 50%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {HD_TIMES.map((time) => (
                            <tr key={time} className="hover:bg-slate-50">
                              <td className="p-1 print:p-0 border font-bold text-slate-600 bg-slate-50">
                                {time}
                              </td>
                              {[
                                "pa", "pam", "fc", "glic", "ins", "nora", "sf", "gh"
                              ].map((campo) => (
                                <td key={campo} className="p-0 border print:overflow-visible">
                                  <input
                                    type="text"
                                    className="w-full h-full text-center outline-none bg-transparent focus:bg-blue-50 p-1 print:hidden"
                                    value={currentPatient.hd_monitoramento?.[time]?.[campo] || ""}
                                    onChange={(e) => updateHDMonitoramento(time, campo, e.target.value)}
                                  />
                                  <span className="hidden print:block text-center text-[8px] w-full align-middle">
                                    {currentPatient.hd_monitoramento?.[time]?.[campo] || ""}
                                  </span>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </fieldset>

                  {/* LINHA DE ENTRADAS, UF REALIZADA E BH FINAL */}
                  <fieldset
                    disabled={!isNursingRole && currentPatient?.leito !== 11}
                    className="grid grid-cols-3 gap-4 print:gap-2 print:my-1 mt-4"
                  >
                    {/* ENTRADAS (Automático) */}
                    <div className="flex flex-col items-center justify-center bg-green-50 print:bg-white p-2 print:p-0.5 rounded border border-green-200 print:border-black">
                      <span className="font-bold text-green-800 print:text-black text-xs print:text-[10px]">
                        ENTRADAS
                      </span>
                      <input
                        type="text"
                        readOnly
                        className="w-full bg-transparent border-none print:hidden outline-none text-base text-center font-bold text-green-700 cursor-not-allowed"
                        value={calcularHDEntradas(currentPatient)}
                        title="Soma automática das colunas S.F. 0,9% e GH 50%"
                      />
                      <span className="hidden print:inline-block text-[10px] w-full text-center font-bold">
                        {calcularHDEntradas(currentPatient)}
                      </span>
                    </div>

                    {/* UF REALIZADA (Digitado pelo Técnico) */}
                    <div className="flex flex-col items-center justify-center bg-orange-50 print:bg-white p-2 print:p-0.5 rounded border border-orange-200 print:border-black shadow-sm">
                      <span className="font-bold text-orange-800 print:text-black text-xs print:text-[10px]">
                        UF REALIZADA
                      </span>
                      <input
                        type="number"
                        className="w-full bg-white border border-orange-300 print:hidden outline-none text-base text-center font-bold text-orange-700 rounded mt-1 p-1 focus:ring-2 focus:ring-orange-400"
                        value={currentPatient.hd_balanco?.uf_realizada || ""}
                        onChange={(e) => updateHDBalanco("uf_realizada", e.target.value)}
                        placeholder="Ex: 2000"
                        title="Ultrafiltração efetivamente realizada pela enfermagem"
                      />
                      <span className="hidden print:inline-block text-[10px] w-full text-center font-bold">
                        {currentPatient.hd_balanco?.uf_realizada || ""}
                      </span>
                    </div>

                    {/* BH FINAL (Automático) */}
                    <div className="flex flex-col items-center justify-center bg-blue-50 print:bg-white p-2 print:p-0.5 rounded border border-blue-200 print:border-black">
                      <span className="font-bold text-blue-800 print:text-black text-xs print:text-[10px]">
                        BH FINAL
                      </span>
                      <input
                        type="text"
                        readOnly
                        className="w-full bg-transparent border-none print:hidden outline-none text-base text-center font-bold text-blue-700 cursor-not-allowed"
                        value={calcularHDBalancoFinal(currentPatient)}
                        title="Entradas Totais subtraídas da UF Realizada"
                      />
                      <span className="hidden print:inline-block text-[10px] w-full text-center font-bold">
                        {calcularHDBalancoFinal(currentPatient)}
                      </span>
                    </div>
                  </fieldset>

                  {/* QUEBRA DE PÁGINA NA IMPRESSÃO DA HEMODIÁLISE */}
                  <div className="hidden print:block force-print-break"></div>

                  {/* SECÇÃO 3 E 4: ACESSO VASCULAR E INSUMOS LADO A LADO NA IMPRESSÃO */}
                  <fieldset
                    disabled={!isNursingRole && currentPatient?.leito !== 11}
                    className="grid md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2"
                  >
                    {/* ACESSO VASCULAR */}
                    <div className="border rounded-xl p-4 print:p-2 bg-white">
                      <h4 className="font-bold text-slate-700 mb-3 text-sm section-title">
                        ACESSO VASCULAR
                      </h4>
                      <div className="space-y-3 text-xs">
                        <div className="grid grid-cols-3 gap-2 items-center">
                          <label className="font-bold text-slate-600">
                            FAV
                          </label>
                          <select
                            className="col-span-2 p-1 border rounded bg-slate-50"
                            value={currentPatient.hd_acesso?.fav_local || ""}
                            onChange={(e) =>
                              updateNested(
                                "hd_acesso",
                                "fav_local",
                                e.target.value
                              )
                            }
                          >
                            <option value="">Local...</option>
                            <option value="MSD">MSD</option>
                            <option value="MSE">MSE</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex gap-2 items-center">
                            <label className="font-bold text-slate-600">
                              Frêmito
                            </label>
                            <select
                              className="flex-1 p-1 border rounded"
                              value={currentPatient.hd_acesso?.fremito || ""}
                              onChange={(e) =>
                                updateNested(
                                  "hd_acesso",
                                  "fremito",
                                  e.target.value
                                )
                              }
                            >
                              <option value="">-</option>
                              <option value="SIM">SIM</option>
                              <option value="NÃO">NÃO</option>
                            </select>
                          </div>
                          <div className="flex gap-2 items-center">
                            <label className="font-bold text-slate-600">
                              Punção
                            </label>
                            <select
                              className="flex-1 p-1 border rounded"
                              value={currentPatient.hd_acesso?.puncao || ""}
                              onChange={(e) =>
                                updateNested(
                                  "hd_acesso",
                                  "puncao",
                                  e.target.value
                                )
                              }
                            >
                              <option value="">-</option>
                              <option value="FÁCIL">FÁCIL</option>
                              <option value="DIFÍCIL">DIFÍCIL</option>
                            </select>
                          </div>
                        </div>
                        <hr className="my-1 border-dashed" />
                        <div className="grid grid-cols-3 gap-2 items-center">
                          <label className="font-bold text-slate-600">
                            CATÉTER
                          </label>
                          <select
                            className="col-span-2 p-1 border rounded bg-slate-50"
                            value={currentPatient.hd_acesso?.cateter_tipo || ""}
                            onChange={(e) =>
                              updateNested(
                                "hd_acesso",
                                "cateter_tipo",
                                e.target.value
                              )
                            }
                          >
                            <option value="">Tipo...</option>
                            <option value="DUPLO LUMEN">DUPLO LUMEN</option>
                            <option value="TRIPLO LUMEN">TRIPLO LUMEN</option>
                            <option value="PERMICATH">PERMICATH</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-3 gap-2 items-center">
                          <label className="font-bold text-slate-600">
                            Local
                          </label>
                          <select
                            className="col-span-2 p-1 border rounded"
                            value={
                              currentPatient.hd_acesso?.cateter_local || ""
                            }
                            onChange={(e) =>
                              updateNested(
                                "hd_acesso",
                                "cateter_local",
                                e.target.value
                              )
                            }
                          >
                            <option value="">-</option>
                            <option value="VJID">VJID</option>
                            <option value="VJIE">VJIE</option>
                            <option value="VSCD">VSCD</option>
                            <option value="VSCE">VSCE</option>
                            <option value="VFID">VFID</option>
                            <option value="VFIE">VFIE</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-bold text-slate-600 block">
                              Inserção
                            </label>
                            <input
                              type="date"
                              className="w-full p-1 border rounded"
                              value={currentPatient.hd_acesso?.insercao || ""}
                              onChange={(e) =>
                                updateNested(
                                  "hd_acesso",
                                  "insercao",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                          <div>
                            <label className="font-bold text-slate-600 block">
                              Fluxo
                            </label>
                            <select
                              className="w-full p-1 border rounded"
                              value={currentPatient.hd_acesso?.fluxo || ""}
                              onChange={(e) =>
                                updateNested(
                                  "hd_acesso",
                                  "fluxo",
                                  e.target.value
                                )
                              }
                            >
                              <option value="">-</option>
                              <option value="BOM">BOM</option>
                              <option value="RUIM">RUIM</option>
                              <option value="AUSENTE">AUSENTE</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="font-bold text-slate-600 block">
                            Local Prévio
                          </label>
                          <input
                            type="text"
                            className="w-full p-1 border rounded"
                            value={currentPatient.hd_acesso?.previo || ""}
                            onChange={(e) =>
                              updateNested(
                                "hd_acesso",
                                "previo",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <hr className="my-1 border-dashed" />
                        <div>
                          <label className="font-bold text-slate-600 block mb-1">
                            Curativo
                          </label>
                          <div className="grid grid-cols-2 gap-1 text-[10px]">
                            {[
                              "Limpo",
                              "Hiperemia",
                              "Secreção Serosa",
                              "Sanguinolenta",
                              "Purulenta",
                              "Sem ponto",
                            ].map((c) => (
                              <label
                                key={c}
                                className="flex items-center gap-1 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={
                                    currentPatient.hd_acesso?.curativo?.includes(
                                      c
                                    ) || false
                                  }
                                  onChange={() => toggleHDAcessoCurativo(c)}
                                />{" "}
                                {c.toUpperCase()}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="pt-2">
                          <label className="font-bold text-slate-600 block text-xs">
                            Intercorrências
                          </label>
                          <textarea
                            className="w-full p-2 border rounded h-12 outline-none"
                            value={
                              currentPatient.hd_acesso?.intercorrencias || ""
                            }
                            onChange={(e) =>
                              updateNested(
                                "hd_acesso",
                                "intercorrencias",
                                e.target.value
                              )
                            }
                          ></textarea>
                        </div>
                      </div>
                    </div>

                    {/* INSUMOS E ANOTAÇÕES GERAIS */}
                    <div className="flex flex-col gap-4 print:gap-2">
                      <div className="border rounded-xl p-4 print:p-2 bg-white flex-1">
                        <h4 className="font-bold text-slate-700 mb-2 text-sm section-title">
                          INSUMOS
                        </h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                          {HD_SUPPLIES.map((item) =>
                            item.id !== "vazio" ? (
                              <div
                                key={item.id}
                                className="flex justify-between items-center border-b pb-0.5"
                              >
                                <span className="truncate pr-1 text-slate-600">
                                  {item.label}
                                </span>
                                <input
                                  type="number"
                                  className="w-10 text-center border rounded outline-none p-0"
                                  value={
                                    currentPatient.hd_insumos?.[item.id] || ""
                                  }
                                  onChange={(e) =>
                                    updateNested(
                                      "hd_insumos",
                                      item.id,
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                            ) : (
                              <div key="vazio"></div>
                            )
                          )}
                        </div>
                      </div>

                      <div className="border rounded-xl p-4 print:p-2 bg-yellow-50/50 flex-1">
                        <h4 className="font-bold text-slate-700 mb-2 text-sm section-title">
                          ANOTAÇÕES DE ENFERMAGEM
                        </h4>
                        <div className="flex gap-4 mb-2 text-xs">
                          <div className="flex items-center gap-1">
                            <label className="font-bold text-slate-600">
                              INÍCIO:
                            </label>
                            <input
                              type="time"
                              className="p-1 border rounded bg-white w-20"
                              value={currentPatient.hd_anotacoes?.inicio || ""}
                              onChange={(e) =>
                                updateNested(
                                  "hd_anotacoes",
                                  "inicio",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <label className="font-bold text-slate-600">
                              TÉRMINO:
                            </label>
                            <input
                              type="time"
                              className="p-1 border rounded bg-white w-20"
                              value={currentPatient.hd_anotacoes?.termino || ""}
                              onChange={(e) =>
                                updateNested(
                                  "hd_anotacoes",
                                  "termino",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        </div>
                        <textarea
                          className="w-full h-20 p-2 border rounded outline-none text-xs bg-white mb-2"
                          value={currentPatient.hd_anotacoes?.texto || ""}
                          onChange={(e) =>
                            updateNested(
                              "hd_anotacoes",
                              "texto",
                              e.target.value
                            )
                          }
                        ></textarea>
                        <div className="flex items-center gap-2 text-xs">
                          <label className="font-bold text-slate-600">
                            TÉCNICO:
                          </label>
                          <input
                            type="text"
                            className="flex-1 p-1 border-b bg-transparent outline-none"
                            value={currentPatient.hd_anotacoes?.tecnico || ""}
                            onChange={(e) =>
                              updateNested(
                                "hd_anotacoes",
                                "tecnico",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </fieldset>

                  {/* SECÇÃO 5: ANOTAÇÕES DA NEFROLOGIA (NÃO IMPRIME) */}
                  <fieldset
                    disabled={!isDocRole && currentPatient?.leito !== 11}
                    className="mt-4 p-4 border rounded-xl bg-white shadow-sm print:hidden"
                  >
                    <h4 className="font-bold text-blue-800 mb-2 text-sm flex items-center gap-2">
                      <Edit3 size={16} /> Anotações da Nefrologia
                    </h4>
                    <textarea
                      className="w-full h-24 p-3 border rounded-lg outline-none text-sm bg-slate-50 focus:bg-white transition-colors focus:ring-2 focus:ring-blue-100"
                      placeholder="Evolução diária da nefrologia, intercorrências, ajustes de prescrição..."
                      value={currentPatient.hd_anotacoes?.nefro_texto || ""}
                      onChange={(e) =>
                        updateNested(
                          "hd_anotacoes",
                          "nefro_texto",
                          e.target.value
                        )
                      }
                    ></textarea>
                  </fieldset>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {showForceChangePassword && (
        <div className="fixed inset-0 bg-slate-900 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
            <ShieldCheck size={48} className="mx-auto text-orange-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Primeiro Acesso</h2>
            <p className="text-sm text-gray-500 mb-4">
              Defina sua senha pessoal.
            </p>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nova Senha (min 6)"
              className="w-full p-2 border rounded mb-2"
            />
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="Confirmar"
              className="w-full p-2 border rounded mb-4"
            />
            {changePasswordError && (
              <p className="text-red-500 text-xs mb-2">{changePasswordError}</p>
            )}
            <button
              onClick={handleForceChangePassword}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 rounded font-bold"
            >
              {isLoading ? "..." : "Definir Senha"}
            </button>
          </div>
        </div>
      )}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-white z-[60] flex flex-col p-4 animate-fadeIn history-print-mode">
          <div id="history-print-header" className="hidden">
            <div className="flex justify-between border-b-2 border-black pb-2 mb-4">
              <span>PACIENTE: {currentPatient.nome?.toUpperCase()}</span>
              <span>LEITO: {currentPatient.leito}</span>
            </div>
          </div>
          <div className="flex justify-between items-center mb-4 pb-2 border-b">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Table /> Histórico Completo
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handlePrintHistory}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-sm"
              >
                <Printer size={18} /> IMPRIMIR
              </button>
              <button onClick={() => setShowHistoryModal(false)}>
                <X />
              </button>
            </div>
          </div>
          <div className="overflow-auto flex-1">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="p-2 border bg-gray-100 sticky left-0 z-10">
                    Exame
                  </th>
                  {/* INVERSÃO DA LINHA DO TEMPO: Adicionado o .reverse() aqui */}
                  {Array.from(new Set([...Object.keys(currentPatient.examHistory || {}), ...getLast10Days()])).sort().reverse().map((d) => (
                    <th key={d} className="p-2 border min-w-[80px] text-center bg-gray-50">
                      {formatDateDDMM(d)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EXAM_ROWS.map((ex) => (
                  <tr key={ex} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2 border font-bold sticky left-0 bg-white shadow-[1px_0_0_0_#e5e7eb]">
                      {formatExamName(ex)}
                    </td>
                    {/* INVERSÃO DA LINHA DO TEMPO: Adicionado o .reverse() aqui */}
                    {Array.from(new Set([...Object.keys(currentPatient.examHistory || {}), ...getLast10Days()])).sort().reverse().map((d) => (
                      <td key={d} className="p-0 border">
                        <input
                          className="w-full h-full text-center p-2 outline-none focus:bg-blue-100 transition-colors bg-transparent"
                          disabled={!isOverviewEditable}
                          value={currentPatient.examHistory[d]?.[ex] || ""}
                          onChange={(e) => {
                            const up = [...patients];
                            if (!up[activeTab].examHistory[d])
                              up[activeTab].examHistory[d] = {};
                            up[activeTab].examHistory[d][ex] = e.target.value;
                            const s = syncLabsFromHistory(up[activeTab]);
                            up[activeTab] = s;
                            setPatients(up);
                          }}
                          onBlur={() => save(patients[activeTab])}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                {currentPatient.customExamRows?.map((ex) => (
                  <tr key={ex} className="bg-yellow-50/30 hover:bg-yellow-50/80 transition-colors">
                    <td className="p-2 border font-bold sticky left-0 bg-white shadow-[1px_0_0_0_#e5e7eb]">
                      {ex}
                    </td>
                    {/* INVERSÃO DA LINHA DO TEMPO: Adicionado o .reverse() aqui */}
                    {Array.from(new Set([...Object.keys(currentPatient.examHistory || {}), ...getLast10Days()])).sort().reverse().map((d) => (
                      <td key={d} className="p-0 border">
                        <input
                          className="w-full h-full text-center p-2 outline-none focus:bg-blue-100 transition-colors bg-transparent"
                          disabled={!isOverviewEditable}
                          value={currentPatient.examHistory[d]?.[ex] || ""}
                          onChange={(e) => {
                            const up = [...patients];
                            if (!up[activeTab].examHistory[d])
                              up[activeTab].examHistory[d] = {};
                            up[activeTab].examHistory[d][ex] = e.target.value;
                            setPatients(up);
                          }}
                          onBlur={() => save(patients[activeTab])}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                {isOverviewEditable && (
                  <tr>
                    <td
                      colSpan={50} 
                      className="p-3 text-center border cursor-pointer bg-slate-50 hover:bg-slate-100 text-blue-600 font-bold transition-colors"
                      onClick={handleAddCustomExam}
                    >
                      <PlusCircle size={16} className="inline mr-1" /> Adicionar
                      Linha de Exame Específico
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showATBHistoryModal && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
            <div className="bg-orange-500 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2">
                <Pill size={20} /> Histórico de Antibióticos
              </h3>
              <button onClick={() => setShowATBHistoryModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {!currentPatient.antibioticsHistory ||
              currentPatient.antibioticsHistory.length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-6">
                  Nenhum antibiótico no histórico para este leito.
                </p>
              ) : (
                <div className="space-y-3">
                  {[...currentPatient.antibioticsHistory].reverse().map((h) => (
                    <div
                      key={h.id}
                      className="p-3 border border-orange-100 bg-orange-50 rounded-xl flex justify-between items-center"
                    >
                      <div>
                        <p className="font-bold text-orange-800">{h.name}</p>
                        <p className="text-xs text-orange-600 mt-1">
                          <span className="font-medium">Início:</span>{" "}
                          {formatDateDDMM(h.startDate)} •{" "}
                          <span className="font-medium">Fim:</span>{" "}
                          {formatDateDDMM(h.endDate)}
                        </p>
                        <p className="text-xs font-bold text-orange-700 mt-1 bg-orange-200/50 inline-block px-2 py-0.5 rounded">
                          Tempo de uso: {h.duration}
                        </p>
                      </div>
                      {isDocRole && (
                        <button
                          onClick={() => deleteATBHistoryItem(h.id)}
                          className="text-orange-400 hover:text-red-500 p-2 transition-colors"
                          title="Excluir do Histórico"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ADMISSÃO ENFERMAGEM */}
      {showNursingModal && (
        <div className="fixed inset-0 bg-slate-900/80 z-[80] flex items-center justify-center p-2 md:p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto flex flex-col shadow-2xl">
            <div className="bg-green-600 p-4 text-white flex justify-between items-center sticky top-0 z-10 shadow">
              <h3 className="font-bold flex items-center gap-2 text-lg">
                <UserPlus size={20} /> Admissão de Enfermagem (Leito{" "}
                {activeTab + 1})
              </h3>
              <button
                onClick={() => setShowNursingModal(false)}
                className="hover:bg-green-700 p-1 rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 text-sm">
              <div className="p-4 border rounded-xl bg-orange-50/20 shadow-sm">
                <h4 className="font-bold text-orange-800 mb-3">
                  Cuidados Gerais
                </h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Escala de Dor
                    </label>
                    <select
                      className="w-full p-2 border rounded"
                      value={nursingData.dor || ""}
                      onChange={(e) =>
                        setNursingData({ ...nursingData, dor: e.target.value })
                      }
                    >
                      <option value="">Selecione...</option>
                      {ESCALA_DOR.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center gap-2 font-bold text-slate-700">
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={nursingData.hemodialise || false}
                        onChange={(e) =>
                          setNursingData({
                            ...nursingData,
                            hemodialise: e.target.checked,
                          })
                        }
                      />{" "}
                      Hemodiálise
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Precauções
                    </label>
                    <select
                      className="w-full p-2 border rounded"
                      value={nursingData.precaucao || ""}
                      onChange={(e) =>
                        setNursingData({
                          ...nursingData,
                          precaucao: e.target.value,
                        })
                      }
                    >
                      <option value="">Selecione...</option>
                      {PRECAUCOES.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-xl bg-orange-50/20 shadow-sm">
                <h4 className="font-bold text-orange-800 mb-3">
                  Invasivos e Dispositivos
                </h4>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">
                      AVP (Local/Data)
                    </label>
                    <div className="flex gap-2">
                      <input
                        className="w-full p-2 border rounded"
                        placeholder="Local"
                        value={nursingData.avpLocal || ""}
                        onChange={(e) =>
                          setNursingData({
                            ...nursingData,
                            avpLocal: e.target.value,
                          })
                        }
                      />
                      <input
                        type="date"
                        className="w-40 p-2 border rounded"
                        value={nursingData.avpData || ""}
                        onChange={(e) =>
                          setNursingData({
                            ...nursingData,
                            avpData: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">
                      CVC/PICC (Local/Data)
                    </label>
                    <div className="flex gap-2">
                      <input
                        className="w-full p-2 border rounded"
                        placeholder="Local"
                        value={nursingData.cvcLocal || ""}
                        onChange={(e) =>
                          setNursingData({
                            ...nursingData,
                            cvcLocal: e.target.value,
                          })
                        }
                      />
                      <input
                        type="date"
                        className="w-40 p-2 border rounded"
                        value={nursingData.cvcData || ""}
                        onChange={(e) =>
                          setNursingData({
                            ...nursingData,
                            cvcData: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1">
                      <input
                        type="checkbox"
                        checked={nursingData.svd || false}
                        onChange={(e) =>
                          setNursingData({
                            ...nursingData,
                            svd: e.target.checked,
                          })
                        }
                      />
                      SVD (Data)
                    </label>
                    <input
                      type="date"
                      className={`w-full p-2 border rounded ${
                        !nursingData.svd ? "bg-gray-100 opacity-50" : ""
                      }`}
                      value={nursingData.svdData || ""}
                      onChange={(e) =>
                        setNursingData({
                          ...nursingData,
                          svdData: e.target.value,
                        })
                      }
                      disabled={!nursingData.svd}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">
                      SNE (Fixação cm / Data)
                    </label>
                    <div className="flex gap-2">
                      <input
                        className="w-full p-2 border rounded"
                        placeholder="cm"
                        value={nursingData.sneCm || ""}
                        onChange={(e) =>
                          setNursingData({
                            ...nursingData,
                            sneCm: e.target.value,
                          })
                        }
                      />
                      <input
                        type="date"
                        className="w-32 p-2 border rounded"
                        value={nursingData.sneData || ""}
                        onChange={(e) =>
                          setNursingData({
                            ...nursingData,
                            sneData: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">
                      Drenos
                    </label>
                    <input
                      className="w-full p-2 border rounded"
                      placeholder="Tipo/Características"
                      value={nursingData.drenoTipo || ""}
                      onChange={(e) =>
                        setNursingData({
                          ...nursingData,
                          drenoTipo: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-xl bg-orange-50/20 shadow-sm">
                <h4 className="font-bold text-orange-800 mb-3">
                  Pele e Curativos
                </h4>
                <textarea
                  placeholder="Lesões por pressão (Local / Estágio)..."
                  className="w-full p-2 border rounded mb-3 h-16 outline-none focus:ring-2 focus:ring-orange-200"
                  value={nursingData.lesaoLocal || ""}
                  onChange={(e) =>
                    setNursingData({
                      ...nursingData,
                      lesaoLocal: e.target.value,
                    })
                  }
                />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500 mb-1 block">
                      Tipo de Curativo
                    </label>
                    <input
                      className="w-full p-2 border rounded"
                      placeholder="Descritivo do curativo"
                      value={nursingData.curativoTipo || ""}
                      onChange={(e) =>
                        setNursingData({
                          ...nursingData,
                          curativoTipo: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="w-40">
                    <label className="text-xs font-bold text-gray-500 mb-1 block">
                      Data Curativo
                    </label>
                    <input
                      type="date"
                      className="w-full p-2 border rounded"
                      value={nursingData.curativoData || ""}
                      onChange={(e) =>
                        setNursingData({
                          ...nursingData,
                          curativoData: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* ESCALA BRADEN */}
              <div className="p-5 bg-orange-50 border border-orange-200 rounded-xl shadow-sm">
                <h4 className="font-bold text-orange-800 mb-4 text-sm uppercase flex items-center gap-2">
                  <AlertTriangle size={16} /> Escala de Braden (Obrigatório)
                </h4>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {Object.entries(BRADEN_OPTIONS).map(([key, options]) => (
                    <div key={key}>
                      <label className="text-xs font-bold text-orange-700 uppercase mb-2 block">
                        {key === "percepcao"
                          ? "Percepção Sensorial"
                          : key === "friccao"
                          ? "Fricção / Cisalhamento"
                          : key}
                      </label>
                      <select
                        className="w-full p-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-orange-300"
                        value={nursingData[`braden_${key}`] || ""}
                        onChange={(e) =>
                          setNursingData({
                            ...nursingData,
                            [`braden_${key}`]: e.target.value,
                          })
                        }
                      >
                        <option value="">Selecione...</option>
                        {options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* ESCALA MORSE */}
              <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl shadow-sm">
                <h4 className="font-bold text-blue-800 mb-4 text-sm uppercase flex items-center gap-2">
                  <AlertTriangle size={16} /> Escala de Morse (Obrigatório)
                </h4>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {Object.entries(MORSE_OPTIONS).map(([key, options]) => (
                    <div key={key}>
                      <label className="text-xs font-bold text-blue-700 uppercase mb-2 block">
                        {key === "historico"
                          ? "Histórico de Quedas"
                          : key === "diagnostico"
                          ? "Diagnóstico Secundário"
                          : key === "auxilio"
                          ? "Auxílio na Marcha"
                          : key === "terapiaIV"
                          ? "Terapia Endovenosa"
                          : key === "estadoMental"
                          ? "Estado Mental"
                          : key}
                      </label>
                      <select
                        className="w-full p-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-300"
                        value={nursingData[`morse_${key}`] || ""}
                        onChange={(e) =>
                          setNursingData({
                            ...nursingData,
                            [`morse_${key}`]: e.target.value,
                          })
                        }
                      >
                        <option value="">Selecione...</option>
                        {options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t flex flex-col-reverse sm:flex-row justify-end gap-3 sticky bottom-0 z-10">
              <button
                onClick={() => setShowNursingModal(false)}
                className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors w-full sm:w-auto"
              >
                Cancelar
              </button>
              <button
                onClick={handleFinalizeNursingAdmission}
                className="px-6 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <FileText size={18} /> Finalizar e Gerar Texto
              </button>
            </div>
          </div>
        </div>
      )}
     
     {/* MODAL DE ADMISSÃO FISIOTERAPIA */}
     {showPhysioModal && (
        <div className="fixed inset-0 bg-slate-900/80 z-[80] flex items-center justify-center p-2 md:p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto flex flex-col shadow-2xl">
            <div className="bg-cyan-600 p-4 text-white flex justify-between items-center sticky top-0 z-10 shadow">
              <h3 className="font-bold flex items-center gap-2 text-lg">
                <Wind size={20} /> Admissão Fisioterapêutica (Leito {activeTab + 1})
              </h3>
              <button onClick={() => setShowPhysioModal(false)} className="hover:bg-cyan-700 p-1 rounded transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm bg-slate-50">
              <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm">
                <label className="font-bold text-cyan-800 mb-2 block uppercase">Estado Geral</label>
                <textarea
                  className="w-full p-3 border rounded-lg h-20 outline-none focus:ring-2 focus:ring-cyan-200 resize-y"
                  value={physioData.estadoGeral}
                  onChange={(e) => setPhysioData({ ...physioData, estadoGeral: e.target.value })}
                />
              </div>
              
              <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm">
                <label className="font-bold text-cyan-800 mb-2 block uppercase">Sistema Nervoso</label>
                <textarea
                  className="w-full p-3 border rounded-lg h-28 outline-none focus:ring-2 focus:ring-cyan-200 resize-y"
                  value={physioData.sistemaNervoso}
                  onChange={(e) => setPhysioData({ ...physioData, sistemaNervoso: e.target.value })}
                />
              </div>

              <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm">
                <label className="font-bold text-cyan-800 mb-2 block uppercase">Sistema Respiratório</label>
                <textarea
                  className="w-full p-3 border rounded-lg h-44 outline-none focus:ring-2 focus:ring-cyan-200 resize-y"
                  value={physioData.sistemaRespiratorio}
                  onChange={(e) => setPhysioData({ ...physioData, sistemaRespiratorio: e.target.value })}
                />
              </div>

              <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm">
                <label className="font-bold text-cyan-800 mb-2 block uppercase">Sistema Cardiovascular</label>
                <textarea
                  className="w-full p-3 border rounded-lg h-28 outline-none focus:ring-2 focus:ring-cyan-200 resize-y"
                  value={physioData.sistemaCardiovascular}
                  onChange={(e) => setPhysioData({ ...physioData, sistemaCardiovascular: e.target.value })}
                />
              </div>

              <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm">
                <label className="font-bold text-cyan-800 mb-2 block uppercase">Sistema Digestivo</label>
                <textarea
                  className="w-full p-3 border rounded-lg h-24 outline-none focus:ring-2 focus:ring-cyan-200 resize-y"
                  value={physioData.sistemaDigestivo}
                  onChange={(e) => setPhysioData({ ...physioData, sistemaDigestivo: e.target.value })}
                />
              </div>

              <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm">
                <label className="font-bold text-cyan-800 mb-2 block uppercase">Sistema Musculoesquelético</label>
                <textarea
                  className="w-full p-3 border rounded-lg h-24 outline-none focus:ring-2 focus:ring-cyan-200 resize-y"
                  value={physioData.sistemaMusculoesqueletico}
                  onChange={(e) => setPhysioData({ ...physioData, sistemaMusculoesqueletico: e.target.value })}
                />
              </div>

              <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm">
                <label className="font-bold text-cyan-800 mb-2 block uppercase">Funcionalidade e Escalas</label>
                <textarea
                  className="w-full p-3 border rounded-lg h-24 outline-none focus:ring-2 focus:ring-cyan-200 resize-y mb-4"
                  value={physioData.funcionalidade}
                  onChange={(e) => setPhysioData({ ...physioData, funcionalidade: e.target.value })}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-cyan-100 pt-4">
                  <div>
                    <label className="block text-xs font-bold text-cyan-700 mb-1">
                      Escore MRC (0-60)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      className="w-full p-2 border rounded bg-slate-50 outline-none focus:ring-2 focus:ring-cyan-200"
                      placeholder="Soma MRC..."
                      value={physioData.mrcScore || ""}
                      onChange={(e) =>
                        setPhysioData({ ...physioData, mrcScore: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-cyan-700 mb-1">
                      ICU Mobility Scale (IMS)
                    </label>
                    <select
                      className="w-full p-2 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                      value={physioData.ims || ""}
                      onChange={(e) =>
                        setPhysioData({ ...physioData, ims: e.target.value })
                      }
                    >
                      <option value="">Selecione...</option>
                      {ICU_MOBILITY_SCALE.map((scale) => (
                        <option key={scale} value={scale}>
                          {scale}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* --- NOVA SEÇÃO: SUPORTE VENTILATÓRIO --- */}
                <div className="mt-4 border-t border-cyan-100 pt-4">
                  <label className="font-bold text-cyan-800 text-xs uppercase flex items-center gap-2 mb-3">
                    <Wind size={14} className="text-cyan-600" /> Suporte Ventilatório
                  </label>
                  <select
                    className="w-full p-2 border rounded mb-3 bg-white outline-none focus:ring-2 focus:ring-cyan-200 text-xs font-bold text-slate-700"
                    value={physioData.suporte || ""}
                    onChange={(e) => setPhysioData({ ...physioData, suporte: e.target.value })}
                  >
                    <option value="">Selecione o suporte...</option>
                    {SUPORTE_RESP_OPTS.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>

                  {(physioData.suporte === "Cateter Nasal" || physioData.suporte === "Máscara não reinalante" || physioData.suporte === "Tubo T") && (
                    <div className="mb-3 animate-fadeIn">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Fluxo (L/min) / Detalhe</label>
                      <input
                        type="text"
                        className="w-full p-2 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                        value={physioData.parametro || ""}
                        onChange={(e) => setPhysioData({ ...physioData, parametro: e.target.value })}
                      />
                    </div>
                  )}

                  {physioData.suporte === "Venturi" && (
                    <div className="mb-3 animate-fadeIn">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">FiO2 (%)</label>
                      <input
                        type="number"
                        className="w-full p-2 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                        value={physioData.fiO2 || ""}
                        onChange={(e) => setPhysioData({ ...physioData, fiO2: e.target.value })}
                      />
                    </div>
                  )}

                  {physioData.suporte === "VNI" && (
                    <div className="grid grid-cols-2 gap-2 mb-3 animate-fadeIn">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Modo (CPAP/BIPAP)</label>
                        <select
                          className="w-full p-2 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                          value={physioData.parametro || ""}
                          onChange={(e) => setPhysioData({ ...physioData, parametro: e.target.value })}
                        >
                          <option value="">...</option>
                          <option value="CPAP">CPAP</option>
                          <option value="BIPAP">BIPAP</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">FiO2 (%)</label>
                        <input
                          type="number"
                          className="w-full p-2 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                          value={physioData.fiO2 || ""}
                          onChange={(e) => setPhysioData({ ...physioData, fiO2: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

{physioData.suporte === "VM" && (
                    <div className="mb-3 animate-fadeIn">
                      
                      {/* --- DADOS DO TUBO OROTRAQUEAL --- */}
                      <div className="grid grid-cols-3 gap-2 mb-3 p-3 bg-slate-100 rounded-xl border border-slate-200 shadow-inner">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Data Intubação</label>
                          <input 
                            type="date" 
                            className="w-full p-2 border rounded bg-white text-xs outline-none focus:ring-2 focus:ring-cyan-200 text-slate-700" 
                            value={physioData.dataIntubacao || ""} 
                            onChange={(e) => setPhysioData({ ...physioData, dataIntubacao: e.target.value })} 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Nº TOT</label>
                          <input 
                            type="number" step="0.5" 
                            className="w-full p-2 border rounded bg-white text-xs outline-none focus:ring-2 focus:ring-cyan-200 text-center text-slate-700" 
                            placeholder="Ex: 8.0" 
                            value={physioData.numeroTOT || ""} 
                            onChange={(e) => setPhysioData({ ...physioData, numeroTOT: e.target.value })} 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Rima (cm)</label>
                          <input 
                            type="number" 
                            className="w-full p-2 border rounded bg-white text-xs outline-none focus:ring-2 focus:ring-cyan-200 text-center text-slate-700" 
                            placeholder="Ex: 22" 
                            value={physioData.rimaFixacao || ""} 
                            onChange={(e) => setPhysioData({ ...physioData, rimaFixacao: e.target.value })} 
                          />
                        </div>
                      </div>

                      {/* --- PARÂMETROS DO VENTILADOR --- */}
                      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                        <div className="col-span-2">
                          <label className="text-[9px] font-bold text-slate-500 uppercase">Modo</label>
                          <select
                            className="w-full p-1.5 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                            value={physioData.parametro || ""}
                            onChange={(e) => setPhysioData({ ...physioData, parametro: e.target.value })}
                          >
                            <option value="">...</option>
                            {MODOS_VM.map((m) => (
                              <option key={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="text-[9px] font-bold text-slate-500 uppercase">Vol (ml)</label>
                          <input
                            type="number"
                            className="w-full p-1.5 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200 text-center"
                            value={physioData.volCorrente || ""}
                            onChange={(e) => setPhysioData({ ...physioData, volCorrente: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase">PEEP</label>
                          <input
                            type="number"
                            className="w-full p-1.5 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200 text-center"
                            value={physioData.peep || ""}
                            onChange={(e) => setPhysioData({ ...physioData, peep: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase">FR</label>
                          <input
                            type="number"
                            className="w-full p-1.5 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200 text-center"
                            value={physioData.fr || ""}
                            onChange={(e) => setPhysioData({ ...physioData, fr: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase">T.ins</label>
                          <input
                            type="number" step="0.1"
                            className="w-full p-1.5 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200 text-center"
                            value={physioData.tIns || ""}
                            onChange={(e) => setPhysioData({ ...physioData, tIns: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase">I:E</label>
                          <input
                            type="text" placeholder="1:2"
                            className="w-full p-1.5 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200 text-center"
                            value={physioData.relIE || ""}
                            onChange={(e) => setPhysioData({ ...physioData, relIE: e.target.value })}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[9px] font-bold text-slate-500 uppercase">FiO2(%)</label>
                          <input
                            type="number"
                            className="w-full p-1.5 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200 text-center"
                            value={physioData.fiO2 || ""}
                            onChange={(e) => setPhysioData({ ...physioData, fiO2: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* --- NOVA SEÇÃO: VIA AÉREA E DISPOSITIVOS --- */}
                <div className="mt-4 border-t border-cyan-100 pt-4">
                  <label className="font-bold text-cyan-800 text-xs uppercase flex items-center gap-2 mb-3">
                    <Shield size={14} className="text-cyan-600" /> Via Aérea e Dispositivos
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Cuff */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Pressão do Cuff (cmH2O)</label>
                      <input
                        type="number"
                        className="w-full p-2 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                        placeholder="Ex: 25"
                        value={physioData.cuff || ""}
                        onChange={(e) => setPhysioData({ ...physioData, cuff: e.target.value })}
                      />
                    </div>

                    {/* Filtro HMEF */}
                    <div className="flex flex-col gap-1">
                      <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase cursor-pointer h-5">
                        <input
                          type="checkbox"
                          checked={physioData.filtroHMEF || false}
                          onChange={(e) => setPhysioData({ ...physioData, filtroHMEF: e.target.checked })}
                        />
                        Filtro HMEF
                      </label>
                      <input
                        type="date"
                        className={`w-full p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-cyan-200 ${!physioData.filtroHMEF ? 'bg-gray-100 opacity-50 cursor-not-allowed' : 'bg-slate-50'}`}
                        value={physioData.dataTrocaHMEF || ""}
                        onChange={(e) => setPhysioData({ ...physioData, dataTrocaHMEF: e.target.value })}
                        disabled={!physioData.filtroHMEF}
                        title="Data da troca do Filtro HMEF"
                      />
                    </div>

                    {/* Sistema Fechado */}
                    <div className="flex flex-col gap-1">
                      <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase cursor-pointer h-5">
                        <input
                          type="checkbox"
                          checked={physioData.sistemaFechado || false}
                          onChange={(e) => setPhysioData({ ...physioData, sistemaFechado: e.target.checked })}
                        />
                        Sistema Fechado (Trach Care)
                      </label>
                      <input
                        type="date"
                        className={`w-full p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-cyan-200 ${!physioData.sistemaFechado ? 'bg-gray-100 opacity-50 cursor-not-allowed' : 'bg-slate-50'}`}
                        value={physioData.dataTrocaSistemaFechado || ""}
                        onChange={(e) => setPhysioData({ ...physioData, dataTrocaSistemaFechado: e.target.value })}
                        disabled={!physioData.sistemaFechado}
                        title="Data da troca do Sistema Fechado"
                      />
                    </div>

                  </div>
                </div>

{/* --- SECREÇÃO (ADMISSÃO) --- */}
<div className="mt-4 border-t border-cyan-100 pt-4 mb-4">
                    <label className="font-bold text-cyan-800 text-xs uppercase flex items-center gap-2 mb-3">
                      Secreção
                    </label>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <label className="flex items-center gap-2 mb-2 text-xs text-slate-700 font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={physioData.secrecao || false}
                          onChange={(e) => setPhysioData({ ...physioData, secrecao: e.target.checked })}
                        />
                        Presente na Admissão?
                      </label>
                      
                      {physioData.secrecao && (
                        <div className="grid grid-cols-3 gap-2 mt-3 animate-fadeIn">
                          <select
                            className="p-2 border rounded bg-white text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                            value={physioData.secrecaoAspecto || ""}
                            onChange={(e) => setPhysioData({ ...physioData, secrecaoAspecto: e.target.value })}
                          >
                            <option value="">Aspecto...</option>
                            {ASPECTO_SECRECAO.map((a) => (
                              <option key={a}>{a}</option>
                            ))}
                          </select>
                          <select
                            className="p-2 border rounded bg-white text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                            value={physioData.secrecaoColoracao || ""}
                            onChange={(e) => setPhysioData({ ...physioData, secrecaoColoracao: e.target.value })}
                          >
                            <option value="">Coloração...</option>
                            {COLORACAO_SECRECAO.map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                          <select
                            className="p-2 border rounded bg-white text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                            value={physioData.secrecaoQtd || ""}
                            onChange={(e) => setPhysioData({ ...physioData, secrecaoQtd: e.target.value })}
                          >
                            <option value="">Qtd...</option>
                            {QTD_SECRECAO.map((q) => (
                              <option key={q}>{q}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                {/* --- NOVA SEÇÃO: GASOMETRIA DE ADMISSÃO --- */}
                <div className="mt-4 border-t border-cyan-100 pt-4">
                  <div className="flex flex-col md:flex-row justify-between md:items-center mb-3 gap-2">
                    <label className="font-bold text-cyan-800 text-xs uppercase flex items-center gap-2">
                      <Activity size={14} className="text-red-500" /> Gasometria de Admissão
                    </label>
                    <div className="flex items-center gap-2 bg-red-50 p-1.5 rounded-lg border border-red-100">
                      <span className="text-[10px] font-bold text-red-700 uppercase">Horário:</span>
                      <input 
                        type="time" 
                        className="p-1 border rounded bg-white text-xs outline-none focus:ring-2 focus:ring-red-200 text-red-700 font-bold"
                        value={physioData.gasoHora || ""}
                        onChange={(e) => setPhysioData({ ...physioData, gasoHora: e.target.value })}
                        title="Se preenchido, os dados irão automaticamente para a tabela principal"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                    {[{id: "gaso_pH", label: "pH"}, {id: "gaso_pCO2", label: "pCO2"}, {id: "gaso_PaO2", label: "PaO2"}, {id: "gaso_BE", label: "BE"}, 
                      {id: "gaso_HCO3", label: "HCO3"}, {id: "gaso_SatO2", label: "SatO2"}, {id: "gaso_FiO2", label: "FiO2"}, {id: "gaso_PF", label: "P/F"}].map(param => (
                      <div key={param.id} className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-500 text-center mb-0.5">{param.label}</span>
                        <input
                          type="text"
                          className="w-full p-1.5 border rounded bg-slate-50 text-xs text-center outline-none focus:ring-2 focus:ring-cyan-200"
                          value={physioData[param.id] || ""}
                          onChange={(e) => setPhysioData({ ...physioData, [param.id]: e.target.value })}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] text-slate-400 mt-2 italic text-right">* Preencha o horário para salvar na tabela geral.</p>
                </div>
              </div>

              {/* --- NOVA SEÇÃO: CONDUTAS FISIOTERAPÊUTICAS --- */}
              <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm mt-4">
                <label className="font-bold text-cyan-800 mb-2 block uppercase flex items-center gap-2">
                  <ClipboardCheck size={16} className="text-cyan-600" /> Condutas Fisioterapêuticas
                </label>
                <textarea
                  className="w-full p-3 border rounded-lg h-56 outline-none focus:ring-2 focus:ring-cyan-200 resize-y text-xs text-slate-700 bg-slate-50"
                  value={physioData.condutas || ""}
                  onChange={(e) => setPhysioData({ ...physioData, condutas: e.target.value })}
                />
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t flex flex-col-reverse sm:flex-row justify-end gap-3 sticky bottom-0 z-10">
              <button onClick={() => setShowPhysioModal(false)} className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors w-full sm:w-auto">
                Cancelar
              </button>
              <button onClick={handleFinalizePhysioAdmission} className="px-6 py-3 rounded-xl font-bold text-white bg-cyan-600 hover:bg-cyan-700 shadow-lg transition-colors flex items-center justify-center gap-2 w-full sm:w-auto">
                <FileText size={18} /> Finalizar e Gerar Texto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE TEXTO GERADO PÓS-ADMISSÃO FISIO */}
      {generatedPhysioText && (
        <div className="fixed inset-0 bg-slate-900/90 z-[90] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl">
            <div className="bg-cyan-600 p-4 text-white flex justify-between items-center rounded-t-2xl">
              <h3 className="font-bold flex items-center gap-2">
                <ClipboardCheck size={20} /> Admissão Fisioterapêutica Concluída!
              </h3>
              <button onClick={() => setGeneratedPhysioText("")} className="hover:bg-cyan-700 p-1 rounded transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4 font-medium">
                Copie a evolução gerada abaixo para anexar no prontuário oficial:
              </p>
              <textarea
                className="w-full h-96 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none mb-6 font-mono resize-none focus:border-cyan-400 focus:bg-white transition-colors"
                readOnly
                value={generatedPhysioText}
              ></textarea>
              <div className="flex gap-3">
                <button onClick={() => copyToClipboardFallback(generatedPhysioText)} className="flex-1 py-3 bg-cyan-100 text-cyan-800 font-bold rounded-xl hover:bg-cyan-200 transition-colors flex items-center justify-center gap-2 shadow-sm">
                  <ClipboardCheck size={18} /> Copiar Texto Inteiro
                </button>
                <button onClick={() => setGeneratedPhysioText("")} className="py-3 px-6 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-colors shadow-sm">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ADMISSÃO (FORMULÁRIO MÉDICO) */}
      {showAdmissionModal && (
        <div className="fixed inset-0 bg-slate-900/80 z-[80] flex items-center justify-center p-2 md:p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto flex flex-col shadow-2xl">
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center sticky top-0 z-10 shadow">
              <h3 className="font-bold flex items-center gap-2 text-lg">
                <UserPlus size={20} /> Admissão de Paciente (Leito{" "}
                {activeTab + 1})
              </h3>
              <button
                onClick={() => setShowAdmissionModal(false)}
                className="hover:bg-blue-700 p-1 rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid md:grid-cols-12 gap-4">
                <div className="md:col-span-5">
                  <label className="text-xs font-bold text-blue-600 uppercase mb-1 block">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    className="w-full p-3 border-2 border-blue-100 focus:border-blue-500 rounded-lg outline-none font-bold text-slate-700"
                    placeholder="Nome do paciente..."
                    value={admissionData.nome || ""}
                    onChange={(e) =>
                      setAdmissionData({
                        ...admissionData,
                        nome: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-blue-600 uppercase mb-1 block">
                    Data Nasc.
                  </label>
                  <input
                    type="date"
                    className="w-full p-3 border-2 border-blue-100 focus:border-blue-500 rounded-lg outline-none font-bold text-slate-700 bg-white"
                    value={admissionData.dataNascimento || ""}
                    onChange={(e) =>
                      setAdmissionData({
                        ...admissionData,
                        dataNascimento: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-blue-600 uppercase mb-1 block">
                    Sexo
                  </label>
                  <select
                    className="w-full p-3 border-2 border-blue-100 focus:border-blue-500 rounded-lg outline-none font-bold text-slate-700 bg-white"
                    value={admissionData.sexo || ""}
                    onChange={(e) =>
                      setAdmissionData({
                        ...admissionData,
                        sexo: e.target.value,
                      })
                    }
                  >
                    <option value="">-</option>
                    <option value="M">M</option>
                    <option value="F">F</option>
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                    Origem da Admissão
                  </label>
                  <input
                    type="text"
                    className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-700 bg-white"
                    placeholder="Setor/Hospital..."
                    value={admissionData.origem || ""}
                    onChange={(e) => {
                      setAdmissionData({
                        ...admissionData,
                        origem: e.target.value,
                      });
                    }}
                  />
                </div>
              </div>

              {/* === INÍCIO DO CÓDIGO A COLAR === */}
              {/* DADOS PARA SAPS 3 */}
              <div className="border border-purple-200 rounded-xl p-4 bg-purple-50/30">
                <h4 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
                  <Activity size={16} /> Fatores SAPS 3 Pré-Admissão
                </h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="block font-bold mb-1 text-purple-700">
                      Tempo de Internação Pré-UTI
                    </label>
                    <select
                      className="w-full p-2 border rounded"
                      value={admissionData.saps_dias || ""}
                      onChange={(e) =>
                        setAdmissionData({
                          ...admissionData,
                          saps_dias: e.target.value,
                        })
                      }
                    >
                      <option value="">Selecione...</option>
                      <option value="< 14 dias">Menos de 14 dias</option>
                      <option value="14 a 27 dias">De 14 a 27 dias</option>
                      <option value="≥28 dias">28 dias ou mais</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold mb-1 text-purple-700">
                      Local de Origem
                    </label>
                    <select
                      className="w-full p-2 border rounded"
                      value={admissionData.saps_origem || ""}
                      onChange={(e) =>
                        setAdmissionData({
                          ...admissionData,
                          saps_origem: e.target.value,
                        })
                      }
                    >
                      <option value="">Selecione...</option>
                      <option value="Emergência/Outra UTI">
                        Emergência / Outra UTI
                      </option>
                      <option value="Enfermarias">Enfermarias</option>
                      <option value="Recuperação Pós-Anestésica">
                        Recuperação Pós-Anestésica
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold mb-1 text-purple-700">
                      Tipo de Admissão
                    </label>
                    <select
                      className="w-full p-2 border rounded"
                      value={admissionData.saps_motivo || ""}
                      onChange={(e) =>
                        setAdmissionData({
                          ...admissionData,
                          saps_motivo: e.target.value,
                        })
                      }
                    >
                      <option value="">Selecione...</option>
                      <option value="Médica">Médica</option>
                      <option value="Cirúrgica Eletiva">
                        Cirúrgica Eletiva
                      </option>
                      <option value="Cirúrgica de Urgência">
                        Cirúrgica de Urgência
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold mb-1 text-purple-700">
                      Sistema / Razão
                    </label>
                    <select
                      className="w-full p-2 border rounded"
                      value={admissionData.saps_sistema || ""}
                      onChange={(e) =>
                        setAdmissionData({
                          ...admissionData,
                          saps_sistema: e.target.value,
                        })
                      }
                    >
                      <option value="">Selecione...</option>
                      <option value="Gastrointestinal / Digestivo">
                        Gastrointestinal / Digestivo
                      </option>
                      <option value="Cardiovascular">Cardiovascular</option>
                      <option value="Respiratório">Respiratório</option>
                      <option value="Geniturinário / Renal">
                        Geniturinário / Renal
                      </option>
                      <option value="Neurológico">Neurológico</option>
                      <option value="Hematológico">Hematológico</option>
                      <option value="Trauma (Não-Neurológico)">
                        Trauma (Não-Neurológico)
                      </option>
                      <option value="Outros / Diversos">
                        Outros / Diversos
                      </option>
                      <option value="Metabólico / Endócrino">
                        Metabólico / Endócrino
                      </option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:col-span-2">
                    <div>
                      <label className="block font-bold mb-1 text-purple-700">
                        Infecção na Admissão?
                      </label>
                      <select
                        className="w-full p-2 border rounded"
                        value={admissionData.saps_infeccao || ""}
                        onChange={(e) =>
                          setAdmissionData({
                            ...admissionData,
                            saps_infeccao: e.target.value,
                          })
                        }
                      >
                        <option value="">Selecione...</option>
                        <option value="Não">Ausente</option>
                        <option value="Sim">Presente</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold mb-1 text-purple-700">
                        Se sim, qual o Sítio?
                      </label>
                      <select
                        className="w-full p-2 border rounded disabled:opacity-50"
                        disabled={admissionData.saps_infeccao !== "Sim"}
                        value={admissionData.saps_sitioInfeccao || ""}
                        onChange={(e) =>
                          setAdmissionData({
                            ...admissionData,
                            saps_sitioInfeccao: e.target.value,
                          })
                        }
                      >
                        <option value="">Selecione...</option>
                        <option value="Respiratório">Respiratório</option>
                        <option value="Outros focos">Outros focos</option>
                      </select>
                    </div>
                  </div>
                  <div className="md:col-span-2 flex flex-col sm:flex-row gap-4 mt-2">
                    <label className="flex items-center gap-2 font-bold text-red-700 bg-white px-3 py-2 border rounded-lg shadow-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={admissionData.saps_cirurgiaUrgente || false}
                        onChange={(e) =>
                          setAdmissionData({
                            ...admissionData,
                            saps_cirurgiaUrgente: e.target.checked,
                          })
                        }
                      />
                      Cirurgia Urgente? (+5 pts)
                    </label>
                    <label className="flex items-center gap-2 font-bold text-red-700 bg-white px-3 py-2 border rounded-lg shadow-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={admissionData.saps_imunossupressao || false}
                        onChange={(e) =>
                          setAdmissionData({
                            ...admissionData,
                            saps_imunossupressao: e.target.checked,
                          })
                        }
                      />
                      Imunossupressão Prévia? (+3 pts)
                    </label>
                  </div>
                  <div className="md:col-span-2 mt-2">
                    <label className="block font-bold mb-2 text-purple-700">
                      Comorbidades (SAPS 3)
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        "Câncer Sólido",
                        "Hemato-onco",
                        "IC NYHA IV",
                        "Cirrose",
                        "AIDS",
                      ].map((c) => (
                        <label
                          key={c}
                          className="flex items-center gap-1 cursor-pointer bg-white px-2 py-1 border rounded"
                        >
                          <input
                            type="checkbox"
                            checked={
                              admissionData.saps_comorbidades?.includes(c) ||
                              false
                            }
                            onChange={() => toggleSAPSComorbidade(c)}
                          />{" "}
                          {c}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {/* === FIM DO CÓDIGO A COLAR === */}

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  História Clínica
                </label>
                <textarea
                  className="w-full p-3 border rounded-lg h-24 outline-none focus:ring-2 focus:ring-blue-100 text-slate-700 resize-y"
                  placeholder="HDA e evolução inicial..."
                  value={admissionData.historia || ""}
                  onChange={(e) =>
                    setAdmissionData({
                      ...admissionData,
                      historia: e.target.value,
                    })
                  }
                />
              </div>

              <div className="p-4 bg-slate-50 border rounded-xl shadow-sm">
                <h4 className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2">
                  <Stethoscope size={16} /> EXAME FÍSICO
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">
                      GERAL
                    </label>
                    <input
                      className="w-full p-2.5 border rounded-lg bg-white outline-none"
                      value={admissionData.exameGeral || ""}
                      onChange={(e) =>
                        setAdmissionData({
                          ...admissionData,
                          exameGeral: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">
                      ACV
                    </label>
                    <input
                      className="w-full p-2.5 border rounded-lg bg-white outline-none"
                      value={admissionData.exameACV || ""}
                      onChange={(e) =>
                        setAdmissionData({
                          ...admissionData,
                          exameACV: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">
                      AR
                    </label>
                    <input
                      className="w-full p-2.5 border rounded-lg bg-white outline-none"
                      value={admissionData.exameAR || ""}
                      onChange={(e) =>
                        setAdmissionData({
                          ...admissionData,
                          exameAR: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">
                      ABD.
                    </label>
                    <input
                      className="w-full p-2.5 border rounded-lg bg-white outline-none"
                      value={admissionData.exameABD || ""}
                      onChange={(e) =>
                        setAdmissionData({
                          ...admissionData,
                          exameABD: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-500 mb-1 block">
                      EXTREMIDADES
                    </label>
                    <input
                      className="w-full p-2.5 border rounded-lg bg-white outline-none"
                      value={admissionData.exameExtremidades || ""}
                      onChange={(e) =>
                        setAdmissionData({
                          ...admissionData,
                          exameExtremidades: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:col-span-2 p-3 bg-white border rounded-xl">
                    <div className="sm:col-span-3">
                      <label className="text-[11px] font-bold text-indigo-500 mb-1 block">
                        NEURO (Nível de Consciência Geral)
                      </label>
                      <input
                        className="w-full p-2 border rounded bg-indigo-50/30 outline-none"
                        placeholder="Nível de consciência..."
                        value={admissionData.exameNeuro || ""}
                        onChange={(e) =>
                          setAdmissionData({
                            ...admissionData,
                            exameNeuro: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-indigo-500 mb-1 block">
                        Glasgow AO
                      </label>
                      <select
                        className="w-full p-2 border rounded bg-indigo-50/30 outline-none text-xs"
                        value={admissionData.ecg_ao || ""}
                        onChange={(e) =>
                          setAdmissionData({
                            ...admissionData,
                            ecg_ao: e.target.value,
                          })
                        }
                      >
                        <option value="">AO...</option>
                        {GLASGOW_AO.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-indigo-500 mb-1 block">
                        Glasgow RV
                      </label>
                      <select
                        className="w-full p-2 border rounded bg-indigo-50/30 outline-none text-xs"
                        value={admissionData.ecg_rv || ""}
                        onChange={(e) =>
                          setAdmissionData({
                            ...admissionData,
                            ecg_rv: e.target.value,
                          })
                        }
                      >
                        <option value="">RV...</option>
                        {GLASGOW_RV.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-indigo-500 mb-1 block">
                        Glasgow RM
                      </label>
                      <select
                        className="w-full p-2 border rounded bg-indigo-50/30 outline-none text-xs"
                        value={admissionData.ecg_rm || ""}
                        onChange={(e) =>
                          setAdmissionData({
                            ...admissionData,
                            ecg_rm: e.target.value,
                          })
                        }
                      >
                        <option value="">RM...</option>
                        {GLASGOW_RM.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-1">
                      <label className="text-[11px] font-bold text-indigo-500 mb-1 block">
                        RASS
                      </label>
                      <select
                        className="w-full p-2 border rounded bg-indigo-50/30 outline-none text-xs"
                        value={admissionData.rass || ""}
                        onChange={(e) =>
                          setAdmissionData({
                            ...admissionData,
                            rass: e.target.value,
                          })
                        }
                      >
                        <option value="">Se sedado...</option>
                        {RASS_OPTS.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                      
                      {/* A MÁGICA ACONTECE AQUI: Só aparece se o RASS for preenchido */}
                      {admissionData.rass && (
                        <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded-lg shadow-sm animate-fadeIn">
                          <label className="text-[9px] font-bold text-purple-700 mb-1 block uppercase">
                            Glasgow Pré-Sedação (SAPS 3)
                          </label>
                          <div className="grid grid-cols-3 gap-1">
                            <select
                              className="w-full p-1 border rounded bg-white outline-none text-[10px] text-center"
                              value={admissionData.ecg_basal_ao || ""}
                              onChange={(e) => setAdmissionData({ ...admissionData, ecg_basal_ao: e.target.value })}
                            >
                              <option value="">AO</option>
                              {GLASGOW_AO.map((o) => <option key={o}>{o.split(" - ")[0]}</option>)}
                            </select>
                            <select
                              className="w-full p-1 border rounded bg-white outline-none text-[10px] text-center"
                              value={admissionData.ecg_basal_rv || ""}
                              onChange={(e) => setAdmissionData({ ...admissionData, ecg_basal_rv: e.target.value })}
                            >
                              <option value="">RV</option>
                              {GLASGOW_RV.map((o) => <option key={o}>{o.split(" - ")[0]}</option>)}
                            </select>
                            <select
                              className="w-full p-1 border rounded bg-white outline-none text-[10px] text-center"
                              value={admissionData.ecg_basal_rm || ""}
                              onChange={(e) => setAdmissionData({ ...admissionData, ecg_basal_rm: e.target.value })}
                            >
                              <option value="">RM</option>
                              {GLASGOW_RM.map((o) => <option key={o}>{o.split(" - ")[0]}</option>)}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-indigo-500 mb-1 block">
                        PUPILAS
                      </label>
                      <input
                        className="w-full p-2 border rounded bg-indigo-50/30 outline-none"
                        placeholder="Fotorreagentes, isocóricas..."
                        value={admissionData.pupilas || ""}
                        onChange={(e) =>
                          setAdmissionData({
                            ...admissionData,
                            pupilas: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl">
                  <label className="flex items-center gap-2 font-bold text-red-800 mb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={admissionData.dva || false}
                      onChange={(e) =>
                        setAdmissionData({
                          ...admissionData,
                          dva: e.target.checked,
                        })
                      }
                    />
                    Uso de DVA (Drogas Vasoativas)
                  </label>
                  {admissionData.dva && (
                    <div className="flex flex-wrap gap-2 pl-6 mt-2">
                      {OPCOES_DVA.map((d) => (
                        <label
                          key={d}
                          className="flex items-center gap-1 text-xs text-slate-700 cursor-pointer bg-white px-2 py-1 border rounded"
                        >
                          <input
                            type="checkbox"
                            checked={
                              admissionData.drogasDVA?.includes(d) || false
                            }
                            onChange={() => {
                              setAdmissionData((prev) => {
                                let arr = prev.drogasDVA || [];
                                if (arr.includes(d))
                                  arr = arr.filter((i) => i !== d);
                                else arr = [...arr, d];
                                return { ...prev, drogasDVA: arr };
                              });
                            }}
                          />{" "}
                          {d}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                  <label className="flex items-center gap-2 font-bold text-indigo-800 mb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={admissionData.sedacao || false}
                      onChange={(e) =>
                        setAdmissionData({
                          ...admissionData,
                          sedacao: e.target.checked,
                        })
                      }
                    />
                    Sedação Contínua
                  </label>
                  {admissionData.sedacao && (
                    <div className="flex flex-wrap gap-2 pl-6 mt-2">
                      {OPCOES_SEDATIVOS.map((s) => (
                        <label
                          key={s}
                          className="flex items-center gap-1 text-xs text-slate-700 cursor-pointer bg-white px-2 py-1 border rounded"
                        >
                          <input
                            type="checkbox"
                            checked={
                              admissionData.drogasSedacao?.includes(s) || false
                            }
                            onChange={() => {
                              setAdmissionData((prev) => {
                                let arr = prev.drogasSedacao || [];
                                if (arr.includes(s))
                                  arr = arr.filter((i) => i !== s);
                                else arr = [...arr, s];
                                return { ...prev, drogasSedacao: arr };
                              });
                            }}
                          />{" "}
                          {s}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Medicamentos de uso habitual
                </label>
                <textarea
                  className="w-full p-3 border rounded-lg h-20 outline-none focus:ring-2 focus:ring-blue-100"
                  value={admissionData.medicamentos || ""}
                  onChange={(e) =>
                    setAdmissionData({
                      ...admissionData,
                      medicamentos: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                    Nível de Consciência Basal
                  </label>
                  <input
                    type="text"
                    className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-700"
                    placeholder="Ex: Lúcido e orientado..."
                    value={admissionData.conscienciaBasal || ""}
                    onChange={(e) =>
                      setAdmissionData({
                        ...admissionData,
                        conscienciaBasal: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                    Nível de Mobilidade Basal
                  </label>
                  <input
                    type="text"
                    className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-700"
                    placeholder="Ex: Deambula sem auxílio..."
                    value={admissionData.mobilidadeBasal || ""}
                    onChange={(e) =>
                      setAdmissionData({
                        ...admissionData,
                        mobilidadeBasal: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Exames Complementares
                </label>
                <textarea
                  className="w-full p-3 border rounded-lg h-20 outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Resultados relevantes..."
                  value={admissionData.examesComplementares || ""}
                  onChange={(e) =>
                    setAdmissionData({
                      ...admissionData,
                      examesComplementares: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-orange-600 uppercase mb-1 block">
                    Diagnósticos Agudos
                  </label>
                  <textarea
                    className="w-full p-3 border rounded-lg h-20 outline-none focus:ring-2 focus:ring-orange-100 bg-orange-50/30"
                    value={admissionData.diagAgudos || ""}
                    onChange={(e) =>
                      setAdmissionData({
                        ...admissionData,
                        diagAgudos: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-orange-600 uppercase mb-1 block">
                    Diagnósticos Crônicos (HPP)
                  </label>
                  <textarea
                    className="w-full p-3 border rounded-lg h-20 outline-none focus:ring-2 focus:ring-orange-100 bg-orange-50/30"
                    value={admissionData.diagCronicos || ""}
                    onChange={(e) =>
                      setAdmissionData({
                        ...admissionData,
                        diagCronicos: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-green-600 uppercase mb-1 block">
                  Conduta / Plano Terapêutico
                </label>
                <textarea
                  className="w-full p-3 border border-green-200 rounded-lg h-24 outline-none focus:ring-2 focus:ring-green-100 bg-green-50/30"
                  value={admissionData.conduta || ""}
                  onChange={(e) =>
                    setAdmissionData({
                      ...admissionData,
                      conduta: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="p-4 bg-slate-100 border-t flex flex-col-reverse sm:flex-row justify-end gap-3 sticky bottom-0 z-10">
              <button
                onClick={() => setShowAdmissionModal(false)}
                className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors w-full sm:w-auto"
              >
                Cancelar
              </button>
              <button
                onClick={handleFinalizeAdmission}
                className="px-6 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <FileText size={18} /> Finalizar e Gerar Texto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE TEXTO GERADO PÓS-ADMISSÃO E ENFERMAGEM */}
      {generatedAdmissionText && (
        <div className="fixed inset-0 bg-slate-900/90 z-[90] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl">
            <div className="bg-green-600 p-4 text-white flex justify-between items-center rounded-t-2xl">
              <h3 className="font-bold flex items-center gap-2">
                <ClipboardCheck size={20} /> Admissão Concluída!
              </h3>
              <button
                onClick={() => setGeneratedAdmissionText("")}
                className="hover:bg-green-700 p-1 rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4 font-medium">
                O paciente foi avaliado com sucesso no sistema. Copie a evolução
                gerada abaixo para anexar no prontuário oficial:
              </p>
              <textarea
                className="w-full h-80 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none mb-6 font-mono resize-none focus:border-green-400 focus:bg-white transition-colors"
                readOnly
                value={generatedAdmissionText}
              ></textarea>
              <div className="flex gap-3">
                <button
                  onClick={() =>
                    copyToClipboardFallback(generatedAdmissionText)
                  }
                  className="flex-1 py-3 bg-green-100 text-green-800 font-bold rounded-xl hover:bg-green-200 transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <ClipboardCheck size={18} /> Copiar Texto Inteiro
                </button>
                <button
                  onClick={() => setGeneratedAdmissionText("")}
                  className="py-3 px-6 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-colors shadow-sm"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES DO SAPS 3 */}
      {/* MODAL DE PROCESSAMENTO EM LOTE */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/80 z-[90] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-blue-600 text-white">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Bot size={20} /> Processamento em Lote (IA)
              </h2>
              {!isProcessingBulk && (
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="hover:text-blue-200"
                >
                  <X size={24} />
                </button>
              )}
            </div>
            <div className="p-4 overflow-y-auto flex-1 bg-slate-50 space-y-2">
              {bulkUploadLogs.map((l, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg text-sm flex items-center gap-2 border shadow-sm ${
                    l.status === "loading"
                      ? "bg-white border-blue-100 text-blue-700"
                      : l.status === "success"
                      ? "bg-green-50 border-green-200 text-green-800 font-medium"
                      : "bg-red-50 border-red-200 text-red-800 font-medium"
                  }`}
                >
                  {l.status === "loading" && (
                    <Loader2 className="animate-spin" size={16} />
                  )}
                  {l.status === "success" && (
                    <CheckCircle size={16} className="text-green-600" />
                  )}
                  {l.status === "error" && (
                    <AlertTriangle size={16} className="text-red-600" />
                  )}
                  {l.msg}
                </div>
              ))}
            </div>
            <div className="p-4 border-t bg-white">
              {isProcessingBulk ? (
                <div className="flex justify-center items-center gap-2 text-blue-600 font-bold">
                  <Loader2 className="animate-spin" /> Lendo e Distribuindo
                  Dados...
                </div>
              ) : (
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow hover:bg-blue-700 transition-colors"
                >
                  Concluído
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO INDIVIDUAL */}
      {showIndividualUploadModal && pendingUploadData && (
        <div className="fixed inset-0 bg-slate-900/80 z-[90] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-blue-600 text-white">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <CheckCircle size={20} /> Confirmação de Leitura
              </h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                A Inteligência Artificial extraiu os seguintes dados do PDF:
              </p>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                <p className="text-sm mb-1">
                  Paciente:{" "}
                  <b className="text-slate-800">
                    {pendingUploadData.patientName}
                  </b>
                </p>
                <p className="text-sm mb-1">
                  Data Base:{" "}
                  <b className="text-slate-800">
                    {formatDateDDMM(pendingUploadData.date)}
                  </b>
                </p>
                <p className="text-sm">
                  Parâmetros:{" "}
                  <b className="text-blue-600">{pendingUploadData.count}</b>{" "}
                  encontrados
                </p>
              </div>
              <p className="text-sm font-bold text-center text-slate-700 mb-4">
                Deseja lançar estes resultados no Leito{" "}
                {patients[activeTab].leito}?
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowIndividualUploadModal(false);
                    setPendingUploadData(null);
                  }}
                  className="flex-1 py-3 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmIndividualUpload}
                  className="flex-1 py-3 rounded-xl font-bold bg-blue-600 text-white shadow hover:bg-blue-700 transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showSapsDetailsModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-[90] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-purple-600 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2">
                <Activity size={20} /> Detalhes SAPS 3
              </h3>
              <button
                onClick={() => setShowSapsDetailsModal(null)}
                className="hover:bg-purple-700 p-1 rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="text-center mb-6">
                <p className="text-sm text-slate-500 uppercase font-bold">
                  {showSapsDetailsModal.patientName}
                </p>
                <div className="flex justify-center gap-4 mt-2">
                  <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 min-w-[100px]">
                    <span className="block text-[10px] text-purple-600 font-bold uppercase">
                      Pontuação Total
                    </span>
                    <span className="text-2xl font-bold text-purple-800">
                      {showSapsDetailsModal.saps.score}
                    </span>
                  </div>
                  <div className="bg-red-50 p-3 rounded-xl border border-red-100 min-w-[100px]">
                    <span className="block text-[10px] text-red-600 font-bold uppercase">
                      Mortalidade Esp.
                    </span>
                    <span className="text-2xl font-bold text-red-800">
                      {showSapsDetailsModal.saps.prob}%
                    </span>
                  </div>
                </div>
              </div>

              <h4 className="font-bold text-slate-700 mb-3 text-sm border-b pb-2">
                Itens Pontuados:
              </h4>
              <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
                {showSapsDetailsModal.saps.details &&
                showSapsDetailsModal.saps.details.length > 0 ? (
                  showSapsDetailsModal.saps.details.map((det, idx) => {
                    const parts = det.split(":");
                    return (
                      <div
                        key={idx}
                        className="bg-slate-50 p-2 rounded border border-slate-100 text-sm text-slate-700 flex justify-between"
                      >
                        <span>{parts[0]}</span>
                        <span className="font-bold text-purple-600">
                          {parts[1]}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-500 italic text-center py-4">
                    Nenhum item pontuou para este paciente ou os dados estão
                    incompletos.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL DO MAPA DE VENTILAÇÃO MECÂNICA       */}
      {/* ========================================== */}
      {showVmFlowsheet && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-7xl rounded-2xl shadow-2xl flex flex-col h-[90vh] overflow-hidden animate-fadeIn">
            
            <div className="p-4 bg-slate-800 flex justify-between items-center text-white shrink-0">
              <h2 className="text-lg font-black uppercase flex items-center gap-2 tracking-wide">
                <Activity size={24} className="text-cyan-400" />
                Mapa de Ventilação Mecânica - {currentPatient.nome || "Paciente"}
              </h2>
              <button onClick={() => setShowVmFlowsheet(false)} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto bg-slate-50 relative">
              <div className="mb-4 flex justify-between items-center sticky left-0">
                <p className="text-sm text-slate-600 font-bold">Registro de Parâmetros Contínuos</p>
                <button
                  onClick={handleAddVmEntry}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-lg shadow transition-colors"
                >
                  + Adicionar Coluna (Puxar Horário Atual)
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-300 rounded-lg shadow-sm bg-white">
                <table className="w-full text-[10px] text-center whitespace-nowrap">
                <thead>
                    {[
                      { key: 'dataHora', label: 'Data / Hora' },
                      { key: 'diasUti', label: 'Dias UTI' },
                      { key: 'diasVm', label: 'Dias VM' },
                      { key: 'cuff_row', label: 'Pressão Cuff (M/T/N)' }, 
                      { key: 'despertar_row', label: 'Despertar Diário' }, 
                      { key: 'modo', label: 'MODO' },
                      { key: 'fio2', label: 'FiO2 (%)' },
                      { key: 'pc', label: 'PC' },
                      { key: 'vc', label: 'VC' },
                      { key: 'vtPc', label: 'Vt pc' },
                      { key: 'ps', label: 'PS' },
                      { key: 'vm', label: 'V.M (L/min)' },
                      { key: 'fluxoInsp', label: 'Fluxo Insp.' },
                      { key: 'tInsp', label: 'T. Insp' },
                      { key: 'ie', label: 'I:E' },
                      { key: 'fr_row', label: 'FR set / FR tot' }, 
                      { key: 'peep', label: 'PEEP' },
                      { key: 'pPico', label: 'P pico' },
                      { key: 'pPlato', label: 'P platô' },
                      { key: 'dp', label: 'Driving Pressure (DP)' },
                      { key: 'cst', label: 'Cst' },
                      { key: 'cdin', label: 'Cdin' },
                      { key: 'rva', label: 'Rva' },
                      { key: 'autoPeep', label: 'Auto PEEP' },
                    ].map((rowDef) => (
                      <tr key={rowDef.key} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="sticky left-0 bg-slate-200 p-2 font-bold text-slate-800 border-r border-slate-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] z-10 w-40 text-left">
                          {rowDef.label}
                        </td>
                        {currentPatient.physio?.vmFlowsheet?.map((entry, index) => (
                          <td key={entry.id} className="p-1 border-r border-slate-200 min-w-[120px]">
                            {rowDef.key === 'cuff_row' ? (
                              <div className="flex gap-1 justify-center">
                                <input className="w-8 p-1 border rounded text-center text-[10px]" placeholder="M" value={entry.cuffM || ""} onChange={(e) => updateVmEntry(index, 'cuffM', e.target.value)} />
                                <input className="w-8 p-1 border rounded text-center text-[10px]" placeholder="T" value={entry.cuffT || ""} onChange={(e) => updateVmEntry(index, 'cuffT', e.target.value)} />
                                <input className="w-8 p-1 border rounded text-center text-[10px]" placeholder="N" value={entry.cuffN || ""} onChange={(e) => updateVmEntry(index, 'cuffN', e.target.value)} />
                              </div>
                            ) : rowDef.key === 'despertar_row' ? (
                              <div className="flex gap-2 justify-center font-bold text-[9px]">
                                <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={entry.despertarS || false} onChange={(e) => updateVmEntry(index, 'despertarS', e.target.checked)} /> S</label>
                                <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={entry.despertarN || false} onChange={(e) => updateVmEntry(index, 'despertarN', e.target.checked)} /> N</label>
                              </div>
                            ) : rowDef.key === 'fr_row' ? (
                              <div className="flex gap-1 justify-center items-center">
                                <input className="w-10 p-1 border rounded text-center text-[10px]" placeholder="Set" value={entry.frSet || ""} onChange={(e) => updateVmEntry(index, 'frSet', e.target.value)} />
                                <span>/</span>
                                <input className="w-10 p-1 border rounded text-center text-[10px]" placeholder="Tot" value={entry.frTotal || ""} onChange={(e) => updateVmEntry(index, 'frTotal', e.target.value)} />
                              </div>
                            ) : (
                              <input
                                type="text"
                                className={`w-full p-1 border rounded text-center text-[11px] outline-none focus:ring-1 focus:ring-cyan-400 
                                  ${rowDef.key === 'dp' ? 'bg-amber-100 font-bold text-amber-900' : ''} 
                                  ${rowDef.key === 'cst' || rowDef.key === 'cdin' ? 'bg-blue-50 font-bold' : ''}`}
                                value={entry[rowDef.key] || ""}
                                onChange={(e) => updateVmEntry(index, rowDef.key, e.target.value)}
                              />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </thead>
                </table>
              </div>
            </div>
            
            <div className="p-3 bg-slate-100 border-t flex justify-end shrink-0">
               <button onClick={() => setShowVmFlowsheet(false)} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700">Fechar Mapa</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL GERADOR DE EVOLUÇÃO DA FISIOTERAPIA  */}
      {/* ========================================== */}
      {showPhysioEvoModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col h-[85vh] overflow-hidden animate-fadeIn">
            
            <div className="p-4 bg-slate-800 flex justify-between items-center text-white shrink-0">
              <h2 className="text-lg font-black uppercase flex items-center gap-2">
                <FileText size={24} className="text-cyan-400" />
                Evolução Diária - {currentPatient.nome || "Paciente"}
              </h2>
              <button onClick={() => setShowPhysioEvoModal(false)} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-hidden flex flex-col bg-slate-50">
              <div className="bg-cyan-50 border-l-4 border-cyan-500 p-3 mb-3 rounded-r-lg">
                <p className="text-xs text-cyan-800 font-bold uppercase">
                  Revise o texto gerado. Você pode digitar os "Ajustes Realizados" diretamente nesta caixa antes de copiar!
                </p>
              </div>
              <textarea
                className="w-full flex-1 p-4 border border-slate-300 rounded-xl text-[13px] leading-relaxed font-mono outline-none focus:ring-2 focus:ring-cyan-500 resize-none bg-white shadow-inner whitespace-pre-wrap"
                value={physioEvoText}
                onChange={(e) => setPhysioEvoText(e.target.value)}
              />
            </div>

            <div className="p-4 bg-slate-100 border-t flex justify-between items-center shrink-0">
              <button onClick={() => setShowPhysioEvoModal(false)} className="px-6 py-3 bg-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-400 transition-colors">
                Fechar
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(physioEvoText);
                  alert("Evolução copiada com sucesso! Cole no prontuário eletrônico do hospital.");
                }}
                className="px-8 py-3 bg-cyan-600 text-white rounded-xl font-black hover:bg-cyan-700 shadow-lg flex items-center gap-2 transition-colors uppercase"
              >
                <Copy size={20} /> Copiar para o Prontuário
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PASSO 4: MODAL CHECKLIST PRÉ-EVOLUÇÃO (TIMEOUT CLÍNICO)   */}
      {/* ========================================================= */}
      {showChecklistEvo && (
        <div className="fixed inset-0 bg-slate-900/70 z-[90] flex justify-center items-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-800 text-white flex justify-between items-center shrink-0">
              <h3 className="font-bold flex items-center gap-2">
                <ShieldAlert size={18} className="text-amber-400" />
                Timeout Clínico: Validar Dados
              </h3>
              <button onClick={() => setShowChecklistEvo(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-5 bg-slate-50 flex-1">
              {/* ESTADO GERAL */}
              <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase">Estado Geral</label>
                <div className="flex gap-2">
                  {["BEG", "REG", "MEG"].map(eg => (
                    <button key={eg} onClick={() => setCheckData({...checkData, estadoGeral: eg})} className={`flex-1 py-2 rounded text-sm font-bold border transition-colors ${checkData.estadoGeral === eg ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
                      {eg}
                    </button>
                  ))}
                </div>
              </div>

              {/* SEDAÇÃO E NEUROLÓGICO */}
              <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer mb-3">
                  <input type="checkbox" className="w-4 h-4 text-slate-800 rounded focus:ring-slate-800" checked={checkData.usaSedacao} onChange={(e) => setCheckData({...checkData, usaSedacao: e.target.checked})} />
                  Paciente Sedado?
                </label>
                
                {checkData.usaSedacao ? (
                  <div className="pl-6 space-y-3 border-l-2 border-slate-100 animate-fadeIn">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sedativos em uso (Marque)</label>
                      <div className="grid grid-cols-2 gap-1">
                        {["Fentanil", "Midazolam", "Propofol", "Dexmedetomidina", "Cetamina"].map(sed => (
                          <label key={sed} className="flex items-center gap-1 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded">
                            <input type="checkbox" checked={checkData.sedativos.includes(sed)} onChange={(e) => {
                              const seds = e.target.checked ? [...checkData.sedativos, sed] : checkData.sedativos.filter(s => s !== sed);
                              setCheckData({...checkData, sedativos: seds});
                            }}/> {sed}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Escala RASS Atual</label>
                      <select 
                        className="w-full p-2 border rounded text-sm bg-white outline-none focus:ring-2 focus:ring-slate-300"
                        value={checkData.rass} 
                        onChange={(e) => setCheckData({...checkData, rass: e.target.value})}
                      >
                        <option value="">Selecione...</option>
                        {/* A MÁGICA ESTÁ AQUI: Usando o seu próprio cardápio RASS_OPTS */}
                        {RASS_OPTS.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="pl-6 animate-fadeIn">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Escala de Glasgow</label>
                    <select 
                      className="w-full p-2 border rounded text-sm bg-white outline-none focus:ring-2 focus:ring-slate-300"
                      value={checkData.glasgow} 
                      onChange={(e) => setCheckData({...checkData, glasgow: e.target.value})}
                    >
                      <option value="">Selecione...</option>
                      {["15", "14", "13", "12", "11", "10", "9", "8", "7", "6", "5", "4", "3"].map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* DVA E HEMODINÂMICA */}
              <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer mb-3">
                  <input type="checkbox" className="w-4 h-4 text-red-600 rounded focus:ring-red-500" checked={checkData.usaDva} onChange={(e) => setCheckData({...checkData, usaDva: e.target.checked})} />
                  Uso de DVA?
                </label>
                
                {checkData.usaDva && (
                  <div className="pl-6 grid grid-cols-2 gap-1 border-l-2 border-red-50 animate-fadeIn">
                    {["Noradrenalina", "Vasopressina", "Adrenalina", "Dobutamina", "Milrinone"].map(dva => (
                      <label key={dva} className="flex items-center gap-1 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded">
                        <input type="checkbox" checked={checkData.dvas.includes(dva)} onChange={(e) => {
                          const d = e.target.checked ? [...checkData.dvas, dva] : checkData.dvas.filter(x => x !== dva);
                          setCheckData({...checkData, dvas: d});
                        }}/> {dva}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* ANTIBIÓTICOS */}
              <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase flex items-center gap-1">
                  <Bug size={14} className="text-orange-500"/> Confirmar Antibióticos (D)
                </label>
                <textarea className="w-full p-2 border rounded text-sm outline-none focus:ring-2 focus:ring-orange-200 h-16 resize-none" value={checkData.atbs} onChange={(e) => setCheckData({...checkData, atbs: e.target.value})} placeholder="Ex: Meropenem (D3) + Vancomicina (D3)" />
              </div>

            </div>
            
            <div className="p-4 bg-white border-t flex justify-end gap-3 shrink-0">
              <button onClick={() => setShowChecklistEvo(false)} className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded transition-colors">Cancelar</button>
              <button onClick={confirmarEGerar} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow transition-colors flex items-center gap-2">
                <CheckCircle size={18} /> Confirmar e Gerar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError)
      return (
        <div className="p-10 text-red-600 text-center font-bold font-sans">
          <h1>Erro Crítico na Aplicação.</h1>
          <p className="text-sm font-normal text-slate-600 mt-2">
            Detalhe: {this.state.error?.message}
          </p>
        </div>
      );
    return this.props.children;
  }
}

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}