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
  Check,
  Target,
} from "lucide-react";
import { auth, db, firebaseError, signInWithEmailAndPassword, createUserWithEmailAndPassword, updatePassword, signOut, onAuthStateChanged, sendPasswordResetEmail, collection, doc, setDoc, getDoc, onSnapshot } from "./config/firebase";
import { getAutoSOFA2 } from "./utils/core";
import PhysioDashboard from './features/physio/PhysioDashboard';
import NutriDashboard from './features/nutri/NutriDashboard';
import SpeechDashboard from './features/speech/SpeechDashboard';
import TechDashboard from './features/tech/TechDashboard';
import HemoDashboard from './features/hemo/HemoDashboard';
import NursingDashboard from './features/nursing/NursingDashboard';
import MedicalDashboard from './features/medical/MedicalDashboard';
import ForceChangePasswordModal from './components/modals/ForceChangePasswordModal';
import HistoryModal from './components/modals/HistoryModal';
import ATBHistoryModal from './components/modals/ATBHistoryModal';
import NursingAdmissionModal from './components/modals/NursingAdmissionModal';
import PhysioAdmissionModal from './components/modals/PhysioAdmissionModal';
import GeneratedPhysioTextModal from './components/modals/GeneratedPhysioTextModal';
import MedicalAdmissionModal from './components/modals/MedicalAdmissionModal';
import GeneratedAdmissionTextModal from './components/modals/GeneratedAdmissionTextModal';
import BulkProcessingModal from './components/modals/BulkProcessingModal';
import IndividualUploadModal from './components/modals/IndividualUploadModal';
import SapsDetailsModal from './components/modals/SapsDetailsModal';
import VmFlowsheetModal from './components/modals/VmFlowsheetModal';
import PhysioEvoModal from './components/modals/PhysioEvoModal';
import ChecklistEvoModal from './components/modals/ChecklistEvoModal';
import NoraModal from './components/modals/NoraModal';
import SepsisModal from './components/modals/SepsisModal';
import ManagementTab from './components/tabs/ManagementTab';
import OverviewTab from './components/tabs/OverviewTab';

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

// Se hospedar externamente, coloque a sua API Key do Google AI Studio aqui dentro. No Canvas, deixe vazio.
const apiKeyMed = import.meta.env.VITE_GEMINI_API_KEY_MED;
const apiKeyEnf = import.meta.env.VITE_GEMINI_API_KEY_ENF;
const apiKey = import.meta.env.VITE_GEMINI_API_KEY; // Mantém para o leitor de PDF

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

const getAdmissionData = (p) => {
  // 1. Tenta buscar dados salvos explicitamente na admissão médica
  // 2. Se não houver, tenta buscar o primeiro registro do histórico de SSVV
  // 3. Como último recurso, usa os dados atuais (mas avisa o usuário)
  
  const admissionVitals = p.medical?.vitalsAtAdmission || {};
  const hasAdmissionData = Object.keys(admissionVitals).length > 0;

  return {
    temp: admissionVitals.temp || p.admissaoTemp || 36,
    fc: admissionVitals.fc || p.admissaoFC || 80,
    pas: admissionVitals.pas || p.admissaoPAS || 120,
    pam: admissionVitals.pam || p.admissaoPAM || 80,
    spo2: admissionVitals.spo2 || p.admissaoSpO2 || 95,
    isFallback: !hasAdmissionData
  };
};

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

// --- CÁLCULO SAPS 3 (ATUALIZADO CONFORME PLANILHA E ADMISSÃO) ---
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

  // EXTRAÇÃO PRIMÁRIA: Busca os SSVV da Admissão
  const admFC = safeNumber(patient.medical?.vitalsAtAdmission?.fc || patient.admissaoFC);
  const admPAS = safeNumber(patient.medical?.vitalsAtAdmission?.pas || patient.admissaoPAS);
  const admTemp = safeNumber(patient.medical?.vitalsAtAdmission?.temp || patient.admissaoTemp);

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

  // 11. Frequência Cardíaca (Atualizado para focar na Admissão)
  let fcMax = admFC > 0 ? admFC : 0;
  if (fcMax === 0 && patient.bh?.vitals) {
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

  // 15. PA Sistólica (Atualizado para focar na Admissão)
  let pasMin = admPAS > 0 ? admPAS : 999;
  if (pasMin === 999 && patient.bh?.vitals) {
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

  // 17. Temperatura (Atualizado para focar na Admissão)
  let tempMin = admTemp > 0 ? admTemp : 99;
  if (tempMin === 99 && patient.bh?.vitals) {
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

const checkLossBH = (bh, lossName) => {
  if (!bh || !bh.losses) return false;
  // BH_HOURS já está definido no seu código, vamos usá-lo para varrer o dia
  for (let h of BH_HOURS) {
    const val = String(bh.losses[h]?.[lossName] || "").trim().toLowerCase();
    const numVal = parseFloat(val.replace(",", "."));
    // Detecta se houve perda (seja por valor numérico > 0 ou por cruzes/texto)
    if (["sim", "s", "+", "++", "+++"].some(term => val.includes(term)) || (!isNaN(numVal) && numVal > 0)) {
      return true;
    }
  }
  return false;
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
  const [tappedTab, setTappedTab] = useState(null);
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

  // --- INJEÇÕES DO CARROSSEL 3D MOBILE ---
  const navScrollRef = React.useRef(null);
  const [centerTab, setCenterTab] = React.useState(null);

  const handleNavScroll = () => {
    if (!navScrollRef.current || window.innerWidth >= 768) return;
    const container = navScrollRef.current;
    const centerPosition = container.scrollLeft + container.clientWidth / 2;

    let closest = null;
    let minDistance = Infinity;

    Array.from(container.children).forEach((child) => {
      if (!child.id || !child.id.startsWith('nav-')) return;
      const childCenter = child.offsetLeft + child.clientWidth / 2;
      const distance = Math.abs(centerPosition - childCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closest = child.id.replace('nav-', '');
      }
    });

    if (closest && closest !== centerTab) setCenterTab(closest);
  };
  // ---------------------------------------

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
    const p = currentPatient || {};
    const med = p.medical || {};
    const cardio = p.cardio || {};
    const neuro = p.neuro || {};

    // --- NOVA LÓGICA GASTRO ---
    // Verificamos se houve registro de Vômitos ou Diarreia no BH de HOJE
    const temVomito = checkLossBH(p.bh, "Vômitos");
    const temDiarreia = checkLossBH(p.bh, "Diarreia");

    // 1. ANTIBIÓTICOS
    let atbSalvo = "";
    if (Array.isArray(p.antibiotics) && p.antibiotics.length > 0) {
      atbSalvo = p.antibiotics
        .filter(a => a && a.name)
        .map(a => `${a.name} (${getDaysD0(a.date)})`)
        .join(" + ");
    }

    setCheckData({
      estadoGeral: med.estadoGeral || "REG",
      usaDva: cardio.dva || false,
      dvas: Array.isArray(cardio.drogasDVA) ? [...cardio.drogasDVA] : [],
      usaSedacao: neuro.sedacao || false,
      sedativos: Array.isArray(neuro.drogasSedacao) ? [...neuro.drogasSedacao] : [],
      rass: neuro.rass || "",
      glasgow: neuro.glasgow || "",
      atbs: atbSalvo,
      
      // --- INJETANDO O GASTRO NA MALETA ---
      temVomito, 
      temDiarreia,
      evacuacao: calculateEvacDays(p.gastro?.dataUltimaEvacuacao)
    });
    
    setShowChecklistEvo(true);
  };

  const confirmarEGerar = () => {
    // 1. Salva os dados nas gavetas (incluindo agora o Gastro validado no Timeout)
    updateNested("medical", null, { ...currentPatient.medical, estadoGeral: checkData.estadoGeral, antibioticosTextoIA: checkData.atbs });
    updateNested("cardio", null, { ...currentPatient.cardio, dva: checkData.usaDva, drogasDVA: checkData.usaDva ? checkData.dvas : [] });
    updateNested("neuro", null, { ...currentPatient.neuro, sedacao: checkData.usaSedacao, drogasSedacao: checkData.usaSedacao ? checkData.sedativos : [], rass: checkData.usaSedacao ? checkData.rass : "", glasgow: !checkData.usaSedacao ? checkData.glasgow : "" });
    
    // --- ADICIONE ESTA LINHA ---
    updateNested("gastro", null, { ...currentPatient.gastro, temVomito: checkData.temVomito, temDiarreia: checkData.temDiarreia });

    setShowChecklistEvo(false);
    
    // 2. Dispara a IA entregando a 'maleta' (checkData)
    setTimeout(() => {
      generateAIEvolution(checkData); 
    }, 300);
  };
  // =========================================================================

// Função que compila todos os dados e gera o texto da evolução da Fisioterapia
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

  // 1. CORREÇÃO DA GASOMETRIA (Buscando a chave correta e mais recente)
  let gasoText = "Nenhuma gasometria registrada no plantão atual.";

  // Bloqueia o falso positivo do array vazio
  let gasoCols = [];
  if (p.customGasometriaCols && p.customGasometriaCols.length > 0) {
    gasoCols = p.customGasometriaCols;
  } else {
    gasoCols = Object.keys(p.gasometriaHistory || {});
  }

  if (gasoCols.length > 0) {
    // Pega a gasometria mais nova (posição 0 para customizadas ou a última do histórico)
    const ultimaGasoCol = (p.customGasometriaCols && p.customGasometriaCols.length > 0) ? gasoCols[0] : gasoCols[gasoCols.length - 1];
    const gasoData = p.gasometriaHistory?.[ultimaGasoCol] || {};

    // Só exibe se houver dados clínicos reais
    if (gasoData['pH'] || gasoData['pCO2'] || gasoData['PaO2']) {
      gasoText = `Referência: ${ultimaGasoCol}
pH: ${gasoData['pH'] || '--'} | pCO2: ${gasoData['pCO2'] || '--'} | PaO2: ${gasoData['PaO2'] || gasoData['pO2'] || '--'} | HCO3: ${gasoData['HCO3'] || '--'} | BE: ${gasoData['BE'] || '--'} | SatO2: ${gasoData['SatO2'] || '--'}% | P/F: ${gasoData['P/F'] || '--'}`;
    }
  }

  // 2. CORREÇÃO DOS DIAGNÓSTICOS (Buscando da raiz do paciente onde a admissão salva)
  const diagAgudos = p.diagnostico || med.diagnosticosAgudos || 'Não informados';
  const diagCronicos = p.comorbidades || med.diagnosticosCronicos || 'Não informados';
  const historiaClinica = p.historia || p.historiaClinica || med.historiaClinica || 'Não informada';

  // 3. PARÂMETROS VENTILATÓRIOS (Sincronizado com os campos da Fisio)
  let paramText = `Modo: ${physio.parametro || '--'} | PEEP: ${physio.peep || '--'} | FiO2: ${physio.fiO2 || '--'}%`;
  if (physio.parametro === 'VCV') paramText += ` | Vt: ${physio.volCorrente || physio.vt || '--'} ml`; 
  if (physio.parametro === 'PCV') paramText += ` | PC: ${physio.pc || '--'} cmH2O`;
  if (physio.parametro === 'PSV') paramText += ` | PS: ${physio.ps || '--'} cmH2O`;

  // Constrói o texto completo
  const textoGerado = `EVOLUÇÃO FISIOTERAPÊUTICA

--- HISTÓRIA E DIAGNÓSTICOS ---
História Clínica: ${historiaClinica}
Diagnósticos Agudos: ${diagAgudos}
Diagnósticos Crônicos: ${diagCronicos}

--- AVALIAÇÃO POR SISTEMAS ---
Neurológico: ${physio.sistemaNervoso || 'Sem alterações descritas'}
Respiratório: ${physio.sistemaRespiratorio || 'Sem alterações descritas'}
Cardiovascular: ${physio.sistemaCardiovascular || 'Sem alterações descritas'}
Gastrointestinal/Abdome: ${physio.sistemaDigestivo || 'Sem alterações descritas'}
Musculoesquelético: ${physio.sistemaMusculoesqueletico || 'Sem alterações descritas'}
Estado Geral: ${physio.estadoGeral || 'Não descrito'}

--- GASOMETRIA ---
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
Manhã: ${physio.cuffM || physio.cuff || '--'} | Tarde: ${physio.cuffT || '--'} | Noite: ${physio.cuffN || '--'}

--- CONDUTAS E PLANOS ---
Intercorrências:
${physio.intercorrencias || 'Nenhuma intercorrência no plantão.'}

Condutas Fisioterapêuticas:
${physio.condutas || physio.admissao_condutas || 'Sem condutas descritas.'}

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
  
    // Usamos o setPatients com callback para garantir que estamos pegando o estado mais recente
    setPatients(prevPatients => {
      const up = [...prevPatients];
      
      // 1. CLONE ABSOLUTO: Criamos um paciente totalmente novo na memória para o React não se perder
      const p = JSON.parse(JSON.stringify(up[activeTab])); 
      
      // 2. Calcula o saldo acumulado que vai passar para o próximo plantão
      const { accumulated } = calculateTotals(p.bh || {});
  
      // 3. O "Torniquete": Salva o balanço de hoje intacto na gaveta do dia anterior
      p.bh_previous = { ...(p.bh || {}) };
  
      // 4. Inicia a nova folha de balanço 24h (zerada, mas com o saldo herdado)
      p.bh = {
        date: typeof getManausDateStr === 'function' ? getManausDateStr() : new Date().toISOString().split('T')[0],
        accumulated: accumulated || 0,
        insensibleLoss: p.bh?.insensibleLoss || 0,
        gains: {},
        losses: {},
        irrigation: {},
        vitals: {},
        customGains: p.bh?.customGains || [],
        customLosses: p.bh?.customLosses || [],
      };
  
      up[activeTab] = p;
  
      // 5. Salva no banco de dados definitivo (Firebase)
      if (typeof user !== 'undefined' && typeof db !== 'undefined' && user && db) {
        setDoc(doc(db, "leitos_uti", `bed_${p.id}`), p);
      }
  
      return up; // Atualiza a tela instantaneamente
    });
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

  // --- LÓGICA DE PREVENÇÃO DE PAV (7 Dias) ---
  const calculateExchangeDate = (installDate) => {
    if (!installDate) return null;
    const [year, month, day] = installDate.split('-');
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + 7); 
    
    const calcYear = date.getFullYear();
    const calcMonth = String(date.getMonth() + 1).padStart(2, '0');
    const calcDay = String(date.getDate()).padStart(2, '0');
    
    return {
      formatted: `${calcDay}/${calcMonth}`, 
      raw: `${calcYear}-${calcMonth}-${calcDay}` 
    };
  };

  const isDeviceExpired = (installDate) => {
    if (!installDate) return false;
    const exchange = calculateExchangeDate(installDate);
    const today = new Date();
    const todayRaw = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    return exchange.raw < todayRaw; 
  };
  // -------------------------------------------

  // --- LÓGICA DO ALERTA DE SEPSE (REARME DINÂMICO DE MÚLTIPLOS EVENTOS) ---
  const [showSepsisModal, setShowSepsisModal] = useState(false);

  useEffect(() => {
    const isMedico = userProfile ? userProfile.role === "Médico" : true; 

    if (viewMode === "medical" && currentPatient && isMedico) {
      const currentSofa = getAutoSOFA2(currentPatient);
      const basalSofa = parseInt(currentPatient.sofa_data_technical?.baseline_sofa || 0);

      let referenceSofa = currentPatient.sofa_data_technical?.reference_sofa_for_sepsis;
      referenceSofa = referenceSofa !== undefined ? parseInt(referenceSofa) : basalSofa;

      // FILTRO DE SEGURANÇA: Verifica se a queda do SOFA é por falta de dados (início de plantão)
      const isPlantaoZerado = !currentPatient.bh?.vitals || Object.keys(currentPatient.bh.vitals).length === 0;

      // 1. O REARME CLÍNICO (Apenas se o dia NÃO estiver zerado)
      if (currentSofa < referenceSofa && !isPlantaoZerado) {
        const p = { ...currentPatient };
        if (!p.sofa_data_technical) p.sofa_data_technical = {};
        p.sofa_data_technical.reference_sofa_for_sepsis = currentSofa;
        p.sofa_data_technical.last_alerted_sofa = null; 
        
        const up = [...patients];
        up[activeTab] = p;
        setPatients(up);
        return; 
      }

      // 2. O GATILHO SEPSIS-3
      if (currentSofa - referenceSofa >= 2) {
        if (currentPatient.sofa_data_technical?.last_alerted_sofa !== currentSofa) {
          setShowSepsisModal(true);
        }
      }
    }
  }, [patients, activeTab, viewMode, currentPatient, userProfile]);

  const handleSepsisResponse = (hasInfection) => {
    const p = { ...currentPatient };
    if (!p.sofa_data_technical) p.sofa_data_technical = {};

    const currentSofa = getAutoSOFA2(p);

    // Salva exatamente o nível de gravidade em que estamos alertando
    p.sofa_data_technical.last_alerted_sofa = currentSofa;
    
    // A nova referência passa a ser esse SOFA alto. Só apita de novo se subir MAIS 2 pontos.
    p.sofa_data_technical.reference_sofa_for_sepsis = currentSofa;

    // Se o médico disser sim, acende o banner
    p.sofa_data_technical.sepsis_protocol_active = hasInfection;

    const up = [...patients];
    up[activeTab] = p;
    setPatients(up);
    if (user && db) setDoc(doc(db, "leitos_uti", `bed_${p.id}`), p);

    setShowSepsisModal(false);
  };
  // --------------------------------------------------------

  // LÓGICA DE AUDITORIA NORADRENALINA E CÁLCULO SOFA-2 (7 Dias Válido)
  const [showNoraModal, setShowNoraModal] = useState(false);
  const [currentNoraHour, setCurrentNoraHour] = useState("");
  const [currentNoraRate, setCurrentNoraRate] = useState("");

  // Diluição Padrão: 4 ampolas (16mg) em SF 250mL (final volume) = 64 µg/mL
  // Diluição Dobrada: 8 ampolas (32mg) em SF 250mL (final volume) = 128 µg/mL
  const calculateNoraDose = (patient, mlHour) => {
    if (!patient) return null;
    
    // Peso: Tenta pegar o Peso Predito (Aba nutrição/calculado) ou o peso de admissão.
    // Doutor, para cálculo de DVA, o ideal na UTI é usar o peso real ou estimado na admissão.
    const peso = safeNumber(patient.nutri?.pesoRealAdmissao || patient.nutri?.pesoPredito);
    const doubleDose = patient.sofa_data_technical?.noraDoubleDoseToday || false;
    const rate = safeNumber(mlHour);
    const concentration = doubleDose ? 128 : 64; // µg/mL

    if (rate > 0 && peso > 0) {
      // Cálculo: mL/h -> mcg/min -> mcg/kg/min
      // Dose (µg/kg/min) = [ (rate mL/h * concentration µg/mL) / 60 min/h ] / peso_kg
      const doseMcgKgMin = ((rate * concentration) / 60) / peso;
      return doseMcgKgMin.toFixed(3);
    }
    return null;
  };

  const handleNoraModalResponse = (isDoubleDose) => {
    const up = [...patients];
    const today = getManausDateStr(); // Data de hoje (AM)

    if (!up[activeTab].sofa_data_technical) up[activeTab].sofa_data_technical = {};
    if (!up[activeTab].hd_monitoramento) up[activeTab].hd_monitoramento = {};
    if (!up[activeTab].hd_monitoramento[currentNoraHour]) up[activeTab].hd_monitoramento[currentNoraHour] = {};

    // 1. Salva o status da dose para o plantão de hoje (evita popup redundante)
    up[activeTab].sofa_data_technical.noraDoubleDoseToday = isDoubleDose;
    up[activeTab].sofa_data_technical.noraModalShown_date = today;

    // 2. Salva o valor que o técnico digitou originalmente
    up[activeTab].hd_monitoramento[currentNoraHour].noraRate = currentNoraRate;

    setPatients(up);
    save(up[activeTab]);
    
    // 3. Fecha o popup
    setShowNoraModal(false);
    
    // Limpa os estados temporários
    setCurrentNoraHour("");
    setCurrentNoraRate("");
  };
  
  // --- TRADUTOR DE MORTALIDADE SOFA-2 ---
  const getSOFAMortality = (score) => {
    if (score <= 1) return "Mínima";
    if (score >= 2 && score <= 6) return "< 10%";
    if (score >= 7 && score <= 9) return "15 - 20%";
    if (score >= 10 && score <= 12) return "40 - 50%";
    if (score >= 13 && score <= 14) return "50 - 60%";
    if (score >= 15) return "> 80%";
    return "N/A";
  };

// --- INTELIGÊNCIA ARTIFICIAL: DETECTAR GLASGOW REAL (SOFA-2) ---
const getBestGlasgowForSOFA = (p) => {
  // 1. PACIENTE ACORDADO (Sem Sedação):
  // Se a chave "sedacao" for falsa ou não existir, pega o Glasgow da evolução de hoje.
  if (!p.neuro?.sedacao) {
    return { 
      valor: safeNumber(p.neuro?.glasgow || 15), 
      origem: "Atual" 
    };
  }

  // 2. PACIENTE SEDADO: Busca o Glasgow Pré-Sedação ou da Admissão (SAPS 3)
  // Primeiro tentamos achar um campo específico de pré-sedação (se você tiver)
  if (p.neuro?.glasgowPreSedacao) {
    return { 
      valor: safeNumber(p.neuro?.glasgowPreSedacao), 
      origem: "Pré-Sedação" 
    };
  }

  // Se não tem salvo na evolução de hoje, vamos buscar na Admissão/SAPS 3
  if (p.saps3?.glasgow || p.admissionData?.glasgow) {
    const gcsSaps = safeNumber(p.saps3?.glasgow || p.admissionData?.glasgow);
    return { 
      valor: gcsSaps, 
      origem: "Admissão (SAPS3)" 
    };
  }

  // 3. FALLBACK DE SEGURANÇA HISTÓRICA:
  // Se o sistema guarda o histórico de evoluções, ele varre de trás pra frente
  // procurando o último dia em que o paciente NÃO estava sedado.
  if (p.history && Array.isArray(p.history)) {
    const lastAwake = p.history.slice().reverse().find(evo => !evo.neuro?.sedacao && evo.neuro?.glasgow);
    if (lastAwake) {
      return { 
        valor: safeNumber(lastAwake.neuro.glasgow), 
        origem: "Histórico UTI" 
      };
    }
  }

  // Se falhar tudo (paciente chegou sedado, sem SAPS3 preenchido), 
  // a diretriz do SOFA orienta usar o Glasgow presumido (geralmente normal se não houver TCE).
  return { 
    valor: 15, 
    origem: "Presumido" 
  };
};

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
    
    // CORREÇÃO: Nomes alinhados com o Modal e o Painel Principal
    p.physio.dataHMEF = physioData.dataHMEF; 
    
    p.physio.sistemaFechado = physioData.sistemaFechado;
    
    // CORREÇÃO: Nomes alinhados com o Modal e o Painel Principal
    p.physio.dataSFA = physioData.dataSFA; 
    
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

  const checkLossBH = (bh, lossName) => {
    if (!bh || !bh.losses) return false;
    const hours = Array.from({ length: 24 }, (_, i) => ((i + 7) % 24).toString().padStart(2, "0") + ":00");
    for (let h of hours) {
      const val = String(bh.losses[h]?.[lossName] || "").trim().toLowerCase();
      if (val !== "" && val !== "0" && val !== "não" && val !== "n") return true;
    }
    return false;
  };

  const generateAIEvolution = async (dadosDoTimeout = null) => {
    setIsGeneratingAI(true);
    let success = false;
    let lastError = "Iniciando...";

    try {
      const currentKey = apiKeyMed || apiKey || window.apiKey || "";
      if (!currentKey || currentKey.length < 10) {
        throw new Error("Chave de API ausente ou inválida.");
      }

      const safeNum = (val) => {
        const n = parseFloat(String(val).replace(",", "."));
        return isNaN(n) ? 0 : n;
      };

      // --- IDENTIFICAÇÃO DE GÊNERO ---
      const isFem = currentPatient.sexo === 'F';
      const sexoPaciente = isFem ? 'A paciente' : 'O paciente';
      const mantemSe = 'Mantém-se'; 

      // 1. SINAIS VITAIS (Aba Técnico)
      const vitals = currentPatient.bh?.vitals || {};
      let tempMax = 0, spo2Min = 100, fcMax = 0, fcMin = 0, pasMax = 0, pasMin = 0;
      
      Object.values(vitals).forEach((v) => {
        if (!v) return;
        const t = safeNum(v["Temp (ºC)"]); if (t > tempMax) tempMax = t;
        const s = safeNum(v["SpO2 (%)"]); if (s > 0 && s < spo2Min) spo2Min = s;
        const fc = safeNum(v["FC (bpm)"]);
        if (fc > 0) { if (fcMax === 0 || fc > fcMax) fcMax = fc; if (fcMin === 0 || fc < fcMin) fcMin = fc; }
        const pas = safeNum(v["PAS"]);
        if (pas > 0) { if (pasMax === 0 || pas > pasMax) pasMax = pas; if (pasMin === 0 || pas < pasMin) pasMin = pas; }
      });

      const tempStatus = tempMax >= 37.8 ? "febril" : "afebril";
      const spo2Status = (spo2Min <= 92 && spo2Min > 0) ? "com baixa SpO2" : "mantendo boa SpO2";
      
      // Ajuste de gênero para FC e PA
      const fcStatus = fcMax > 100 ? (isFem ? "taquicárdica" : "taquicárdico") : (fcMin > 0 && fcMin < 60 ? (isFem ? "bradicárdica" : "bradicárdico") : (isFem ? "eucárdica" : "eucárdico"));
      const paStatus = (pasMin > 0 && pasMin < 90) ? "com hipotensão" : (pasMax > 160 ? (isFem ? "hipertensa" : "hipertenso") : "com bom controle pressórico");

      // 2. ESTADO GERAL E NEURO (Janela Pop-up)
      const egSalvo = dadosDoTimeout?.estadoGeral || currentPatient.medical?.estadoGeral || "REG";
      const egExtenso = egSalvo === "BEG" ? "BEG" : (egSalvo === "MEG" ? "MEG" : "REG");
      
      // Ajuste de gênero para sedação
      const sedacaoText = currentPatient.neuro?.sedacao ? (isFem ? "sedada" : "sedado") : "sem sedação";

      // 3. RESPIRATÓRIO (Aba Fisio)
      const suporte = currentPatient.physio?.suporte || "ar ambiente";
      const suporteText = suporte === "VM" ? "em VM por TOT" : `em uso de ${suporte}`;

      // 4. HEMODINÂMICO (Calculadora Nora e DVA Pop-up)
      const usaDVA = currentPatient.cardio?.dva === true; 
      
      // Ajuste de gênero para compensado(a)
      let hemodinamicaStatus = usaDVA ? (isFem ? "Hemodinamicamente compensada" : "Hemodinamicamente compensado") : "Hemodinamicamente estável";
      
      if (currentPatient.bh?.gains && typeof BH_HOURS !== 'undefined') {
        let noraVals = [];
        BH_HOURS.forEach(h => {
          const v = currentPatient.bh.gains[h]?.["Noradrenalina"];
          if (v) noraVals.push(safeNum(v));
        });
        if (noraVals.length >= 2) {
          const last = noraVals[noraVals.length - 1];
          const prev = noraVals[noraVals.length - 2];
          if (last > prev) hemodinamicaStatus = "Hemodinamicamente instável (DVA em ascensão)";
        }
      }
      const dvaText = usaDVA ? `em uso de DVA (${currentPatient.cardio.drogasDVA?.join(", ")})` : "sem uso de DVA";

      // 5. RENAL (Aba Visita Multi)
      const diureseNum = parseFloat(calculateDiurese12hMlKgH(currentPatient));
      const diureseStatus = (!isNaN(diureseNum) && diureseNum < 0.5) ? "Baixa diurese" : "Boa diurese";
      const crclNum = parseFloat(calculateCreatinineClearance(currentPatient));
      const renalStatus = (!isNaN(crclNum) && crclNum < 60) ? "função renal alterada" : "função renal normal";

      // 6. LABORATORIAL E INFECCIOSO (Aba Médico/Exames)
      const leucoVal = safeNum(currentPatient.labs?.today?.leuco);
      const leucoStatus = leucoVal > 11000 ? "leucocitose" : (leucoVal > 0 && leucoVal < 4000 ? "leucopenia" : "leucometria normal");
      const atbValidado = dadosDoTimeout?.atbs || currentPatient.medical?.antibioticosTextoIA || "";
      const atbsFinal = (!atbValidado || atbValidado.toLowerCase() === "nenhum") ? "sem uso de antibióticos ativos" : `em uso de ${atbValidado}`;

      // 7. GASTRO E DIETA (Aba Nutri e SSVV)
      const evacDaysStr = typeof calculateEvacDays === 'function' ? calculateEvacDays(currentPatient.gastro?.dataUltimaEvacuacao) : "-";
      const temVomitoBH = typeof checkLossBH === 'function' ? checkLossBH(currentPatient.bh, "Vômitos") : false;
      const temDiarreiaBH = typeof checkLossBH === 'function' ? checkLossBH(currentPatient.bh, "Diarreia") : false;
      
      let tgiDescricao = "";
      if (temVomitoBH && temDiarreiaBH) tgiDescricao = "com episódios de vômito e diarreia";
      else if (temVomitoBH) tgiDescricao = "com episódio de vômito";
      else if (temDiarreiaBH) tgiDescricao = "com episódio de diarreia";

      const viaDieta = currentPatient.nutri?.via ? currentPatient.nutri.via.toLowerCase() : "zero";

      // 8. O PROMPT "ENGESSADO"
      const promptText = `Você é um médico intensivista. Redija a evolução ESTRITAMENTE no formato exato fornecido abaixo, substituindo os colchetes pelos dados clínicos reais fornecidos na lista. 
      NÃO adicione introduções, NÃO crie parágrafos extras, NÃO use tópicos. Siga exatamente a estrutura de 5 parágrafos.

      FORMATO OBRIGATÓRIO:
      ${sexoPaciente} encontra-se em [ESTADO GERAL], [SEDAÇÃO], [SUPORTE RESPIRATÓRIO], [SPO2].
      [HEMODINÂMICA], [DVA], apresenta-se [FC], [PA].
      [DIURESE], com [FUNÇÃO RENAL].
      ${mantemSe} [TEMPERATURA], com [LEUCOMETRIA] e [ATB].
      A dieta é [VIA DIETA], [TGI]. Última evacuação: [EVACUAÇÃO].

      DADOS CLÍNICOS REAIS PARA PREENCHER:
      - [ESTADO GERAL]: ${egExtenso}
      - [SEDAÇÃO]: ${sedacaoText}
      - [SUPORTE RESPIRATÓRIO]: ${suporteText}
      - [SPO2]: ${spo2Status}
      - [HEMODINÂMICA]: ${hemodinamicaStatus}
      - [DVA]: ${dvaText}
      - [FC]: ${fcStatus}
      - [PA]: ${paStatus}
      - [DIURESE]: ${diureseStatus}
      - [FUNÇÃO RENAL]: ${renalStatus}
      - [TEMPERATURA]: ${tempStatus}
      - [LEUCOMETRIA]: ${leucoStatus}
      - [ATB]: ${atbsFinal}
      - [VIA DIETA]: ${viaDieta}
      - [TGI]: ${tgiDescricao ? tgiDescricao : "[OMITIR ESTA PARTE DO TGI]"}
      - [EVACUAÇÃO]: ${evacDaysStr}
      
      Regra Crítica TGI: Se a tag [TGI] pedir para omitir, escreva apenas "A dieta é [VIA DIETA]. Última evacuação: [EVACUAÇÃO]." Não escreva "ausência de vômitos".`;

      // 9. LOOP DE MODELOS
      const models = [
        "gemini-2.5-flash-preview-09-2025",
        "gemini-2.5-flash",
        "gemini-1.5-flash",
      ];
      
      for (const model of models) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
          });

          const data = await response.json();

          if (data.error) {
            lastError = `API ${data.error.code}: ${data.error.message}`;
            continue;
          }

          if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            setAiEvolution(data.candidates[0].content.parts[0].text);
            success = true;
            break;
          }
        } catch (e) {
          lastError = `Falha de Rede: ${e.message}`;
        }
      }
    } catch (err) {
      lastError = `Erro de Processamento: ${err.message}`;
    }

    if (!success) setAiEvolution(`Erro ao gerar evolução: ${lastError}`);
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
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans bg-hexagon-pattern bg-repeat">
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
    <div className="min-h-screen bg-gray-100 font-sans pb-20 relative bg-hexagon-pattern bg-repeat">
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

      {/* CABEÇALHO SUPERIOR - IMAGEM TOTAL DE FUNDO */}
      <div
        id="original-header"
        className="relative z-30 pb-36 pt-8 px-4 md:px-8 shadow-xl print:hidden bg-[url('/logodagua.svg')] bg-cover bg-center bg-no-repeat"
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
          
          {/* LADO ESQUERDO DO CABEÇALHO: Logo e Títulos RESTAURADOS */}
          <div className="flex items-center gap-4">
            <img 
              src="/logobranca.png" 
              alt="Sys4U Logo" 
              className="w-16 h-16 object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="hidden w-16 h-16 border-2 border-white/50 rounded-xl items-center justify-center text-white">
              {/* Fallback Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            </div>

            <div className="flex flex-col">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white shadow-sm">
                UTI Municipal de Ariquemes
              </h1>
              <hr className="border-white/40 my-1" />
              <p className="text-white text-xs md:text-sm font-medium opacity-95 shadow-sm">
                Sys4U - Desenvolvimento de Sistemas
              </p>
            </div>
          </div>

          {/* LADO DIREITO DO CABEÇALHO: Cápsula de Usuário e Upload */}
          <div className="flex items-center gap-4">
            <label
              className="bg-white/10 hover:bg-white/20 p-2.5 rounded-full text-white transition-all border border-white/30 cursor-pointer shadow-sm backdrop-blur-sm"
              title="Upload Lote"
            >
              {/* Ocultando o ícone do FolderInput só para o código ficar limpo, ele está no seu import */}
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H2"/><path d="M12 18v-6"/><path d="m9 15 3-3 3 3"/></svg>
              <input
                type="file"
                multiple
                accept="application/pdf"
                className="hidden"
                onChange={handleBulkUpload}
              />
            </label>

            <div className="flex items-center bg-white rounded-full p-1.5 pr-2 shadow-lg gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white shadow-inner">
                {/* Ocultando o ícone User só para o código ficar limpo */}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              
              <div className="flex flex-col text-right hidden md:flex min-w-[120px]">
                <span className="text-sm font-bold text-slate-800 leading-tight">
                  {userProfile?.name || user?.email || "Dr. Luciano Fogaça"}
                </span>
                <span className="text-xs text-slate-500 leading-tight">
                  - {userProfile?.role || "Administrador"}
                </span>
              </div>

              <button
                onClick={handleLogout} 
                className="w-10 h-10 rounded-full bg-teal-600 hover:bg-teal-700 flex items-center justify-center text-white transition-colors shadow-sm ml-2"
                title="Sair do Sistema"
              >
                 {/* Ocultando o ícone LogOut só para o código ficar limpo */}
                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto -mt-20 px-2 md:px-4 print:mt-0 print:p-0">
        
        {/* BARRA DE LEITOS */}
        <div className="relative z-40 bg-white/95 backdrop-blur-sm p-1.5 rounded-2xl shadow-md mb-6 flex overflow-x-auto gap-2 scrollbar-hide print:hidden border border-white">
          {patients.map((p) => {
            if (p.leito === 11 && !isAdmin) return null;
            const isActive = activeTab === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setActiveTab(p.id)}
                className={`flex-shrink-0 w-14 h-16 rounded-xl font-bold transition-all border flex flex-col items-center justify-center ${
                  isActive
                    ? "bg-gradient-to-bl from-teal-400 to-blue-600 border-transparent text-white shadow-md scale-105"
                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 shadow-sm"
                }`}
              >
                <span className="text-[9px] uppercase tracking-wider opacity-80 font-semibold mb-0.5">Leito</span>
                <span className="text-xl leading-none">{p.leito}</span>
              </button>
            );
          })}
        </div>

        {/* CONTAINER DE DUAS COLUNAS NO PC */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 relative mt-2">
          
          {/* Fundo de Hexágonos (AGORA LIVRE NO CONTAINER PRINCIPAL, NA EXTREMA DIREITA) */}
          <img 
            src="/hexagons.svg" 
            alt="Hexágonos" 
            className="absolute -top-6 right-0 md:-right-4 w-[280px] md:w-[350px] opacity-15 pointer-events-none z-0" 
          />

          {/* LADO ESQUERDO: BARRA DE NAVEGAÇÃO FLUTUANTE (Carrossel 3D Mobile) */}
          <div className="w-full md:w-12 flex-shrink-0 relative z-[60] print:hidden self-start md:sticky md:top-6">
            <div className="relative mb-6 md:mb-0 print:hidden">

              {/* CONTAINER DO CARROSSEL */}
              {/* px-[35vw] garante que a primeira e a última aba alcancem o centro da tela no celular */}
              <div
                ref={navScrollRef}
                onScroll={handleNavScroll}
                className="flex overflow-x-auto md:overflow-visible md:flex-col gap-0 md:gap-3 px-[35vw] md:px-0 pb-4 md:pb-0 scrollbar-hide snap-x snap-mandatory items-center"
              >
                {visibleNavButtons.map((btn, index) => {
                  const isActive = viewMode === btn.id; // APENAS ele recebe a cor
                  
                  // Se for celular, a aba expande se estiver no centro do scroll
                  const isExpandedMobile = centerTab === btn.id && window.innerWidth < 768; 

                  // --- CÁLCULO DA CASCATA 3D (Z-INDEX) ---
                  const centerIndex = visibleNavButtons.findIndex(b => b.id === centerTab);
                  const distanceToCenter = Math.abs(index - (centerIndex !== -1 ? centerIndex : 0));
                  const zIndexCascata = window.innerWidth < 768 ? (40 - distanceToCenter) : 10;

                  return (
                    <div
                      key={btn.id}
                      id={`nav-${btn.id}`}
                      // CORREÇÃO: Agora usa apenas a cascata natural. A aba ativa vai para trás se sair do centro!
                      style={{ zIndex: zIndexCascata }} 
                      className={`relative flex-shrink-0 snap-center md:snap-align-none transition-all duration-300 ease-out 
                        ${window.innerWidth < 768 ? '-ml-5 first:ml-0' : ''} 
                        hover:z-[100]
                      `}
                    >
                      <button
                        onClick={() => {
                          const isMobile = window.innerWidth < 768;
                          if (isMobile) {
                            // Se bater na aba no mobile, ela centraliza. Se já tiver no centro, ativa a ficha dela.
                            if (centerTab !== btn.id) {
                               const el = document.getElementById(`nav-${btn.id}`);
                               if(el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                            } else {
                               setViewMode(btn.id);
                            }
                          } else {
                            setViewMode(btn.id);
                          }
                        }}
                        // LÓGICA DE COR E TAMANHO
                        className={`flex items-center h-12 md:h-12 min-w-[3rem] p-0 rounded-2xl border transition-all duration-300 ease-out outline-none group overflow-hidden shadow-lg
                          ${
                            isActive
                              ? "bg-gradient-to-r from-teal-400 to-blue-600 border-transparent text-white scale-[1.05] md:scale-100 shadow-teal-500/40"
                              : "bg-slate-100 border-slate-300 text-slate-500 shadow-sm"
                          }
                          ${isExpandedMobile ? "w-[160px]" : "w-12"}
                          md:w-12 md:hover:w-[180px]
                        `}
                        title={btn.label}
                      >
                        {/* ÍCONE */}
                        <div className={`flex-shrink-0 flex items-center justify-center w-12 h-12 transition-transform duration-300 ${isActive ? 'text-white' : 'text-slate-500'}`}>
                          <div className={isExpandedMobile || isActive ? "scale-100" : "scale-75 md:scale-90"}>
                            {btn.icon}
                          </div>
                        </div>

                        {/* TEXTO (Aparece se for o centro no mobile ou hover no PC) */}
                        <div
                          className={`whitespace-nowrap transition-all duration-300 pr-4 flex items-center
                            ${isExpandedMobile ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 md:translate-x-0 md:group-hover:opacity-100"}
                          `}
                        >
                          <span className="text-xs md:text-sm font-bold tracking-wide">
                            {btn.label}
                          </span>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* LADO DIREITO: ÁREA DE CONTEÚDO DO PRONTUÁRIO */}
          {/* Note o z-30 aqui, ele é menor que o z-[60] da coluna da esquerda! */}
          <div className="flex-1 min-w-0 relative z-30">
            
            {/* CABEÇALHO DO PACIENTE (Otimizado para 1 linha) */}
            <div
              className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm px-4 py-3 shadow-md border border-slate-200 border-b-slate-100 print:hidden flex flex-row items-center justify-between gap-2 rounded-t-3xl"
            >
              {/* O truncate garante que nomes enormes não quebrem a linha */}
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <h2 className="text-lg md:text-xl font-extrabold text-teal-600 uppercase tracking-tight truncate">
                  {currentPatient.nome || "LEITO DISPONÍVEL"}
                </h2>
                
                {currentPatient.nome && (userProfile?.role === "Médico" || isAdmin) && (
                  <button
                    onClick={handleClearData}
                    className="text-slate-300 hover:text-red-500 transition-colors print:hidden flex-shrink-0"
                    title="Excluir Paciente / Limpar Leito"
                  >
                     <Trash2 size={18} />
                  </button>
                )}
                
                {currentPatient.nome && currentPatient.dataNascimento && (
                  <span className="bg-teal-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm flex-shrink-0">
                    {calculateAge(currentPatient.dataNascimento)} anos
                  </span>
                )}
              </div>

              {/* Quadrado do Leito reduzido e protegido com whitespace-nowrap */}
              <span className="text-sm md:text-base font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl flex-shrink-0 text-center border border-slate-200 whitespace-nowrap">
                Leito {currentPatient.leito}
              </span>
            </div>

        {/* CORPO DO PRONTUÁRIO (Agora como barreira impenetrável) */}
        <div className="relative z-20 bg-white p-6 md:p-8 rounded-b-3xl shadow-xl border border-t-0 border-slate-200 min-h-[500px] print:shadow-none print:border-none print:p-0 print:m-0 print:rounded-none">
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
              
              <ManagementTab
                viewMode={viewMode}
                patients={patients}
                calculateSAPS3Score={calculateSAPS3Score}
                getDaysD1={getDaysD1}
                setShowSapsDetailsModal={setShowSapsDetailsModal}
                getTempoVMText={getTempoVMText}
                calculateDiurese12hMlKgH={calculateDiurese12hMlKgH}
              />

              <OverviewTab
                viewMode={viewMode}
                isOverviewEditable={isOverviewEditable}
                currentPatient={currentPatient}
                handleUnlockSAPS3={handleUnlockSAPS3}
                getMissingSAPS3={getMissingSAPS3}
                handleLockSAPS3={handleLockSAPS3}
                getDaysD1={getDaysD1}
                getTempoVMText={getTempoVMText}
                historyOpen={historyOpen}
                setHistoryOpen={setHistoryOpen}
                calculateEvacDays={calculateEvacDays}
                calculateGlasgowTotal={calculateGlasgowTotal}
                renderValue={renderValue}
                calculateDiurese12hMlKgH={calculateDiurese12hMlKgH}
                calculateCreatinineClearance={calculateCreatinineClearance}
                setShowATBHistoryModal={setShowATBHistoryModal}
                getDaysD0={getDaysD0}
                setShowHistoryModal={setShowHistoryModal}
                formatDateDDMM={formatDateDDMM}
                updateLab={updateLab}
                userProfile={userProfile}
                updateP={updateP}
              />

              {/* --- MEDICAL --- */}
              {viewMode === "medical" && (
                <MedicalDashboard
                  currentPatient={currentPatient}
                  isEditable={isEditable}
                  patients={patients}
                  activeTab={activeTab}
                  setPatients={setPatients}
                  updateNested={updateNested}
                  updateP={updateP}
                  clearDate={clearDate}
                  historyOpen={historyOpen}
                  setHistoryOpen={setHistoryOpen}
                  toggleArrayItem={toggleArrayItem}
                  aiEvolution={aiEvolution}
                  setAiEvolution={setAiEvolution}
                  copyToClipboardFallback={copyToClipboardFallback}
                  abrirChecklistEvolucao={abrirChecklistEvolucao}
                  isGeneratingAI={isGeneratingAI}
                  setShowATBHistoryModal={setShowATBHistoryModal}
                  clearAntibiotic={clearAntibiotic}
                  updateAntibiotic={updateAntibiotic}
                />
              )}

              {/* --- NURSING --- */}
              {viewMode === "nursing" && (
                <NursingDashboard
                  currentPatient={currentPatient}
                  isEditable={isEditable}
                  handleNursingAdmission={handleNursingAdmission}
                  updateNested={updateNested}
                  generateNursingAI_Evolution={generateNursingAI_Evolution}
                  isNursingRole={isNursingRole}
                  isGeneratingNursingAI={isGeneratingNursingAI}
                />
              )}

              {/* --- PHYSIO --- */}
              {viewMode === "physio" && (
                <PhysioDashboard
                  currentPatient={currentPatient}
                  isEditable={isEditable}
                  uniqueGasoCols={uniqueGasoCols}
                  patients={patients}
                  activeTab={activeTab}
                  setPatients={setPatients}
                  save={save}
                  handlePhysioAdmission={handlePhysioAdmission}
                  clearDate={clearDate}
                  updateP={updateP}
                  updateNested={updateNested}
                  setShowVmFlowsheet={setShowVmFlowsheet}
                  handleSuporteChange={handleSuporteChange}
                  toggleArrayItem={toggleArrayItem}
                  calculateExchangeDate={calculateExchangeDate}
                  isDeviceExpired={isDeviceExpired}
                  handlePrintGasometria={handlePrintGasometria}
                  handleGeneratePhysioEvo={handleGeneratePhysioEvo}
                  getTempoVMText={getTempoVMText}
                  isOverviewEditable={isOverviewEditable}
                />
              )}

              {/* --- NUTRI --- */}
              {viewMode === "nutri" && (
                <NutriDashboard
                  currentPatient={currentPatient}
                  isEditable={isEditable}
                  updateNested={updateNested}
                  toggleArrayItem={toggleArrayItem}
                />
              )}

              {/* --- FONO --- */}
              {viewMode === "speech" && (
                <SpeechDashboard
                  currentPatient={currentPatient}
                  isEditable={isEditable}
                  updateNested={updateNested}
                  toggleArrayItem={toggleArrayItem}
                />
              )}

             {/* --- TECH --- */}
             {viewMode === "tech" && (
                <TechDashboard
                  currentPatient={currentPatient}
                  patients={patients}
                  activeTab={activeTab}
                  setPatients={setPatients}
                  save={save}
                  isEditable={isEditable}
                  viewingPreviousBH={viewingPreviousBH}
                  setViewingPreviousBH={setViewingPreviousBH}
                  displayedBH={displayedBH}
                  bhTotals={bhTotals}
                  isBHReadOnly={isBHReadOnly}
                  canCloseDay={canCloseDay}
                  handleNextDayBH={handleNextDayBH}
                  handlePrintBH={handlePrintBH}
                  handleAutoCalcInsensible={handleAutoCalcInsensible}
                  updateBH={updateBH}
                  updateNested={updateNested}
                  setCurrentNoraHour={setCurrentNoraHour}
                  setCurrentNoraRate={setCurrentNoraRate}
                  setShowNoraModal={setShowNoraModal}
                />
              )}

              {/* --- HEMODIÁLISE --- */}
              {viewMode === "hemodialysis" && (
                <HemoDashboard
                  currentPatient={currentPatient}
                  isEditable={isEditable}
                  updateNested={updateNested}
                  patients={patients}
                  activeTab={activeTab}
                  setPatients={setPatients}
                  save={save}
                  userProfile={userProfile}
                />
              )}
            </>
          )}
        </div>
        </div> {/* Fim do Lado Direito (Área de Conteúdo) */}
        </div> {/* Fim do Container de Duas Colunas */}
      </main>

      {/* MODAL: TROCA DE SENHA OBRIGATÓRIA */}
      <ForceChangePasswordModal
        showForceChangePassword={showForceChangePassword}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        confirmNewPassword={confirmNewPassword}
        setConfirmNewPassword={setConfirmNewPassword}
        changePasswordError={changePasswordError}
        handleForceChangePassword={handleForceChangePassword}
        isLoading={isLoading}
      />

      {/* MODAL: HISTÓRICO DE EXAMES LABORATORIAIS */}
      <HistoryModal
        showHistoryModal={showHistoryModal}
        setShowHistoryModal={setShowHistoryModal}
        currentPatient={currentPatient}
        handlePrintHistory={handlePrintHistory}
        formatDateDDMM={formatDateDDMM}
        getLast10Days={getLast10Days}
        EXAM_ROWS={EXAM_ROWS}
        formatExamName={formatExamName}
        isOverviewEditable={isOverviewEditable}
        patients={patients}
        activeTab={activeTab}
        setPatients={setPatients}
        syncLabsFromHistory={syncLabsFromHistory}
        save={save}
        handleAddCustomExam={handleAddCustomExam}
      />

      {/* MODAL: HISTÓRICO DE ANTIBIÓTICOS */}
      <ATBHistoryModal
        showATBHistoryModal={showATBHistoryModal}
        setShowATBHistoryModal={setShowATBHistoryModal}
        currentPatient={currentPatient}
        formatDateDDMM={formatDateDDMM}
        isDocRole={isDocRole}
        deleteATBHistoryItem={deleteATBHistoryItem}
      />

      {/* MODAL: ADMISSÃO DE ENFERMAGEM */}
      <NursingAdmissionModal
        showNursingModal={showNursingModal}
        setShowNursingModal={setShowNursingModal}
        activeTab={activeTab}
        nursingData={nursingData}
        setNursingData={setNursingData}
        handleFinalizeNursingAdmission={handleFinalizeNursingAdmission}
      />
     
     {/* MODAL: ADMISSÃO DE FISIOTERAPIA */}
     <PhysioAdmissionModal
        showPhysioModal={showPhysioModal}
        setShowPhysioModal={setShowPhysioModal}
        activeTab={activeTab}
        physioData={physioData}
        setPhysioData={setPhysioData}
        handleFinalizePhysioAdmission={handleFinalizePhysioAdmission}
      />

      {/* MODAL: TEXTO GERADO PÓS-ADMISSÃO FISIO */}
      <GeneratedPhysioTextModal
        generatedPhysioText={generatedPhysioText}
        setGeneratedPhysioText={setGeneratedPhysioText}
        copyToClipboardFallback={copyToClipboardFallback}
      />

      {/* MODAL: ADMISSÃO (FORMULÁRIO MÉDICO) */}
      <MedicalAdmissionModal
        showAdmissionModal={showAdmissionModal}
        setShowAdmissionModal={setShowAdmissionModal}
        activeTab={activeTab}
        admissionData={admissionData}
        setAdmissionData={setAdmissionData}
        toggleSAPSComorbidade={toggleSAPSComorbidade}
        handleFinalizeAdmission={handleFinalizeAdmission}
      />

      {/* MODAL: TEXTO GERADO PÓS-ADMISSÃO E ENFERMAGEM */}
      <GeneratedAdmissionTextModal
        generatedAdmissionText={generatedAdmissionText}
        setGeneratedAdmissionText={setGeneratedAdmissionText}
        copyToClipboardFallback={copyToClipboardFallback}
      />

      {/* MODAL: PROCESSAMENTO EM LOTE (IA) */}
      <BulkProcessingModal
        showBulkModal={showBulkModal}
        setShowBulkModal={setShowBulkModal}
        isProcessingBulk={isProcessingBulk}
        bulkUploadLogs={bulkUploadLogs}
      />

      {/* MODAL: CONFIRMAÇÃO UPLOAD INDIVIDUAL PDF */}
      <IndividualUploadModal
        showIndividualUploadModal={showIndividualUploadModal}
        setShowIndividualUploadModal={setShowIndividualUploadModal}
        pendingUploadData={pendingUploadData}
        setPendingUploadData={setPendingUploadData}
        formatDateDDMM={formatDateDDMM}
        patients={patients}
        activeTab={activeTab}
        confirmIndividualUpload={confirmIndividualUpload}
      />

      {/* MODAL: DETALHES DO SAPS 3 */}
      <SapsDetailsModal
        showSapsDetailsModal={showSapsDetailsModal}
        setShowSapsDetailsModal={setShowSapsDetailsModal}
      />

      {/* MODAL: MAPA DE VENTILAÇÃO MECÂNICA */}
      <VmFlowsheetModal
        showVmFlowsheet={showVmFlowsheet}
        setShowVmFlowsheet={setShowVmFlowsheet}
        currentPatient={currentPatient}
        handleAddVmEntry={handleAddVmEntry}
        updateVmEntry={updateVmEntry}
      />

      {/* MODAL: GERADOR DE EVOLUÇÃO DA FISIOTERAPIA */}
      <PhysioEvoModal
        showPhysioEvoModal={showPhysioEvoModal}
        setShowPhysioEvoModal={setShowPhysioEvoModal}
        currentPatient={currentPatient}
        physioEvoText={physioEvoText}
        setPhysioEvoText={setPhysioEvoText}
      />

      {/* MODAL: CHECKLIST PRÉ-EVOLUÇÃO (TIMEOUT CLÍNICO) */}
      <ChecklistEvoModal
        showChecklistEvo={showChecklistEvo}
        setShowChecklistEvo={setShowChecklistEvo}
        currentPatient={currentPatient}
        updateNested={updateNested}
        updateP={updateP}
        confirmarEGerar={generateAIEvolution}
      />
      
      {/* MODAL: AUDITORIA DE NORADRENALINA */}
      <NoraModal
        showNoraModal={showNoraModal}
        handleNoraModalResponse={handleNoraModalResponse}
      />

        {/* MODAL: ALERTA DE SEPSE (Sepsis-3) */}
      <SepsisModal
        showSepsisModal={showSepsisModal}
        handleSepsisResponse={handleSepsisResponse}
      />
</div>
    ); // Fecha o return do App
}; // FECHA A CONST APP

// --- COMPONENTES AUXILIARES ---
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
