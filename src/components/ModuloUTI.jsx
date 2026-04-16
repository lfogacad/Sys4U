import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { doc, setDoc, deleteDoc, collection, onSnapshot, query, where, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  Stethoscope, HeartPulse, Brain, Wind, Utensils, Apple,
  Droplets, Syringe, Pill, Thermometer, Scale, Gauge, Move,
  Activity, ClipboardCheck, FileText, FileCheck, Target,
  Printer, Bot, BrainCircuit, Sparkles, Mic, Table, UploadCloud,
  FolderInput, List, Copy, User, Search, ArrowLeft, X, PlusCircle,
  Edit3, Trash2, Check, CheckCircle, AlertCircle, AlertTriangle,
  Loader2, ChevronRight, ChevronDown, Clock, RotateCcw, Filter,
  CalendarX, UserPlus, LogOut
} from "lucide-react";

import {
  getManausDateStr, formatDateDDMM, getLast10Days, calculateTotals,
  safeNumber, defaultPatient, ensureBHStructure, calculateAge,
  getDaysD0, getDaysD1, getTempoVMText, calculateEvacDays,
  calculateGlasgowTotal, renderValue, calculateDiurese12hMlKgH,
  calculateCreatinineClearance, syncLabsFromHistory, extractTextFromPdf,
  analyzeTextWithGemini, normalizeName, calculateSAPS3Score, getMissingSAPS3, formatExamName
} from '../utils/core';
import {
  EXAM_ROWS,
  BH_HOURS,
  BRADEN_OPTIONS,
  MORSE_OPTIONS
} from '../constants/clinicalLists';

// Dashboards e Tabs
import MedicalDashboard from '../features/medical/MedicalDashboard';
import NursingDashboard from '../features/nursing/NursingDashboard';
import PhysioDashboard from '../features/physio/PhysioDashboard';
import NutriDashboard from '../features/nutri/NutriDashboard';
import SpeechDashboard from '../features/speech/SpeechDashboard';
import HemoDashboard from '../features/hemo/HemoDashboard';
import ManagementTab from './tabs/ManagementTab';
import TechDashboard from '../features/tech/TechDashboard';
import OverviewTab from './tabs/OverviewTab';

// ==========================================
// IMPORTAÇÃO DOS MODAIS (Pop-ups do Sistema)
// ==========================================
import HistoryModal from './modals/HistoryModal';
import ATBHistoryModal from './modals/ATBHistoryModal';
import NursingAdmissionModal from './modals/NursingAdmissionModal';
import PhysioAdmissionModal from './modals/PhysioAdmissionModal';
import GeneratedPhysioTextModal from './modals/GeneratedPhysioTextModal';
import MedicalAdmissionModal from './modals/MedicalAdmissionModal';
import GeneratedAdmissionTextModal from './modals/GeneratedAdmissionTextModal';
import BulkProcessingModal from './modals/BulkProcessingModal';
import IndividualUploadModal from './modals/IndividualUploadModal';
import SapsDetailsModal from './modals/SapsDetailsModal';
import VmFlowsheetModal from './modals/VmFlowsheetModal';
import PhysioEvoModal from './modals/PhysioEvoModal';
import ChecklistEvoModal from './modals/ChecklistEvoModal';
import NoraModal from './modals/NoraModal';
import SepsisModal from './modals/SepsisModal';

// ÍCONE PERSONALIZADO DE ENFERMAGEM
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

// Esta função garante que, se o banco de dados não tiver algum campo (ex: exames novos), 
// o sistema use o valor padrão e não trave a tela.
const mergePatientData = (base, incoming) => {
  return {
    ...base,
    ...incoming,
    // Garantimos que objetos internos não sumam
    neuro: { ...(base.neuro || {}), ...(incoming.neuro || {}) },
    cardio: { ...(base.cardio || {}), ...(incoming.cardio || {}) },
    resp: { ...(base.resp || {}), ...(incoming.resp || {}) },
    bh: { ...(base.bh || {}), ...(incoming.bh || {}) },
    saps3: { ...(base.saps3 || {}), ...(incoming.saps3 || {}) },
    exames: { ...(base.exames || {}), ...(incoming.exames || {}) }
  };
};

const ModuloUTI = ({ user, userProfile, unidadeAtiva, handleLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [pdfReady, setPdfReady] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState("overview");
  const [viewingPreviousBH, setViewingPreviousBH] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showATBHistoryModal, setShowATBHistoryModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkUploadLogs, setBulkProgress] = useState([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [pdfProcessingStatus, setPdfProcessingStatus] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiEvolution, setAiEvolution] = useState("");
  const [showIndividualUploadModal, setShowIndividualUploadModal] = useState(false);
  const [pendingUploadData, setPendingUploadData] = useState(null);
  const [centerTab, setCenterTab] = useState(null);
  const navScrollRef = useRef(null);
  const [isGeneratingNursingAI, setIsGeneratingNursingAI] = useState(false);

  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [showNursingModal, setShowNursingModal] = useState(false);
  const [showPhysioModal, setShowPhysioModal] = useState(false);
  const [showPhysioEvoModal, setShowPhysioEvoModal] = useState(false);
  const [physioEvoText, setPhysioEvoText] = useState("");
  const [showSapsDetailsModal, setShowSapsDetailsModal] = useState(null);
  const [showVmFlowsheet, setShowVmFlowsheet] = useState(false);
  const [showChecklistEvo, setShowChecklistEvo] = useState(false);
  const [checkData, setCheckData] = useState({ estadoGeral: "REG", usaDva: false, dvas: [], usaSedacao: false, sedativos: [], rass: "", glasgow: "", atbs: "" });

  const [patients, setPatients] = useState(Array(11).fill(null).map((_, i) => defaultPatient(i)));
  const [showSepsisModal, setShowSepsisModal] = useState(false);

  const [admissionData, setAdmissionData] = useState({});
  const [generatedAdmissionText, setGeneratedAdmissionText] = useState("");
  const [nursingData, setNursingData] = useState({});
  const [physioData, setPhysioData] = useState({});
  const [generatedPhysioText, setGeneratedPhysioText] = useState("");

  // Para o Modal de Noradrenalina
  const [showNoraModal, setShowNoraModal] = useState(false);
  const [currentNoraHour, setCurrentNoraHour] = useState("");
  const [currentNoraRate, setCurrentNoraRate] = useState("");

  // Para a Troca de Senha
  const [showForceChangePassword, setShowForceChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changePasswordError, setChangePasswordError] = useState("");

  const [showPatientDataModal, setShowPatientDataModal] = useState(false);

  const rawPatient = patients[activeTab] || defaultPatient(0);
  const currentPatient = ensureBHStructure(rawPatient);
  const displayedBH = viewingPreviousBH && currentPatient.bh_previous ? currentPatient.bh_previous : currentPatient.bh;
  const bhTotals = calculateTotals(displayedBH);

  // --- ESTADOS DA FILA DE ESPERA ---
  const [waitingList, setWaitingList] = useState([]);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [selectedBedForAdmission, setSelectedBedForAdmission] = useState(null);

  const handleBulkUpload = async (e) => {
    const files = Array.from(e.target.files);
    e.target.value = null;

    if (files.length === 0) return;

    setIsProcessingBulk(true);
    setShowBulkModal(true);

    const initialProgress = files.map((f) => ({
      status: "loading",
      msg: `Iniciando leitura de ${f.name}...`,
    }));
    setBulkProgress(initialProgress);

    const promessasDeLeitura = files.map(async (file, fileIndex) => {
      try {
        setBulkProgress((prev) => {
          const n = [...prev];
          n[fileIndex] = { status: "loading", msg: `IA Lendo ${file.name}...` };
          return n;
        });

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
              if (json.results[k]) {
                target.examHistory[date][k] = json.results[k];
              }
            });

            list[matchIdx] = syncLabsFromHistory(target);

            if (user && db) {
              setDoc(doc(db, "leitos_uti", `bed_${target.id}`), target);
            }
            return list;
          });

          setBulkProgress((prev) => {
            const n = [...prev];
            n[fileIndex] = {
              status: json.isFallback ? "error" : "success",
              msg: `${json.isFallback ? `⚠️ IA Offline (${json.errorReason}):` : "✅"
                } ${json.patientName} (${formatDateDDMM(date)}) -> Leito ${matchIdx + 1}`,
            };
            return n;
          });

        } else {
          setBulkProgress((prev) => {
            const n = [...prev];
            n[fileIndex] = {
              status: "error",
              msg: `⚠️ ${json.patientName || "?"}: Não encontrado na UTI.`,
            };
            return n;
          });
        }
      } catch (e) {
        setBulkProgress((prev) => {
          const n = [...prev];
          n[fileIndex] = { status: "error", msg: `❌ Erro ao processar ${file.name}` };
          return n;
        });
      }
    });

    await Promise.all(promessasDeLeitura);
    setIsProcessingBulk(false);
  };

  // --- SINCRONIZAÇÃO DOS LEITOS COM O FIREBASE ---
  useEffect(() => {
    if (!db) return;

    // Criamos uma escuta na coleção de leitos
    const q = collection(db, "leitos_uti");

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Começamos com um array de leitos padrão (vazios)
      // Ajuste o '10' para a quantidade de leitos que o senhor tiver
      const updatedPatients = Array(10).fill(null).map((_, i) => defaultPatient(i));

      snapshot.forEach((doc) => {
        // O id do documento é 'bed_0', 'bed_1', etc. 
        // Extraímos o número para saber em qual posição do array colocar
        const bedIndex = parseInt(doc.id.replace('bed_', ''));
        if (bedIndex >= 0 && bedIndex < updatedPatients.length) {
          updatedPatients[bedIndex] = mergePatientData(defaultPatient(bedIndex), doc.data());
        }
      });

      console.log("Leitos sincronizados com a nuvem!");
      setPatients(updatedPatients);
    });

    // Para de ouvir quando o componente for fechado (logout)
    return () => unsubscribe();
  }, []);

  // Efeito para buscar a fila de espera da UTI em tempo real
  useEffect(() => {
    if (!db) return;
    const q = query(
      collection(db, "fila_espera"),
      where("setorDestino", "==", "UTI"),
      where("status", "==", "aguardando")
    );

    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWaitingList(list);
    });
  }, []);

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

  // Efeito para capturar dados vindos da Recepção assim que a tela carrega
  useEffect(() => {
    const incoming = location.state?.incomingPatient;

    if (incoming && !admissionData.nome) { // Se tem paciente vindo e o form está vazio
      console.log("Detectado paciente da recepção:", incoming);

      setAdmissionData({
        nome: incoming.nome || "",
        sexo: incoming.sexo || "",
        dataNascimento: incoming.dataNascimento || incoming.nascimento || "",
        origem: incoming.procedencia || incoming.origem || "",
        // Campos em branco para o médico preencher
        historia: "", exameGeral: "", diagAgudos: "", conduta: "",
        saps_comorbidades: [],
      });

      // Abre o modal automaticamente para facilitar a vida do médico
      setShowAdmissionModal(true);
    }
  }, [location.state, admissionData.nome]);

  const gasoCols = [...Object.keys(currentPatient.gasometriaHistory || {}), ...(currentPatient.customGasometriaCols || []), ...getLast10Days()];
  const uniqueGasoCols = [...new Set(gasoCols)].sort().reverse();

  // --- FUNÇÕES DE PERSISTÊNCIA ---
  const save = async (updatedPatient, logMsg = "Alteração no Prontuário") => {
    if (!db || !updatedPatient) return;
    try {
      await setDoc(doc(db, "leitos_uti", `bed_${updatedPatient.id}`), updatedPatient, { merge: true });
      console.log(`[AUDITORIA]: ${logMsg}`);
    } catch (err) { console.error("Erro ao salvar:", err); }
  };

  const updateNested = (category, subfield, value) => {
    const up = [...patients];
    const p = { ...up[activeTab] };
    if (!p[category]) p[category] = {};
    if (subfield) p[category][subfield] = value;
    else p[category] = value;
    up[activeTab] = p;
    setPatients(up);
  };

  const updateP = (field, value) => {
    const up = [...patients];
    up[activeTab] = { ...up[activeTab], [field]: value };
    setPatients(up);
  };

  // Função disparada ao clicar no "Admitir" do leito vazio
  const handleOpenQueue = (bedId) => {
    setSelectedBedForAdmission(bedId);
    setShowQueueModal(true);
  };

  // Função que efetiva a internação (tira da fila e põe no leito)
  const bindPatientToBed = async (patientFromQueue) => {
    try {
      const bedIndex = selectedBedForAdmission;

      const newPatientRecord = {
        ...defaultPatient(bedIndex),
        id: bedIndex,
        nome: patientFromQueue.nome,
        cpf: patientFromQueue.cpf,
        dataNascimento: patientFromQueue.dataNascimento,
        sexo: patientFromQueue.sexo,
        dataInternacao: getManausDateStr(),
        procedencia: patientFromQueue.origem || "Recepção",
        statusInternacao: "Aguardando Admissão Médica"
      };

      // 1. Salva no Firebase
      await setDoc(doc(db, "leitos_uti", `bed_${bedIndex}`), newPatientRecord);

      // 2. A PEÇA QUE FALTAVA: Atualiza a tela (React) na mesma hora!
      const up = [...patients];
      up[bedIndex] = newPatientRecord;
      setPatients(up);

      // 3. Remove o paciente da Fila de Espera
      await updateDoc(doc(db, "fila_espera", patientFromQueue.id), {
        status: "internado",
        leitoAtribuido: bedIndex,
        dataInternada: serverTimestamp()
      });

      setShowQueueModal(false);
      alert(`${patientFromQueue.nome} foi vinculado ao Leito ${bedIndex + 1}.`);

    } catch (error) {
      console.error("Erro na internação:", error);
      alert("Falha ao vincular paciente ao leito.");
    }
  };

  const toggleSAPSComorbidade = (c) => {
    setAdmissionData((prev) => {
      const arr = prev.saps_comorbidades || [];
      return arr.includes(c)
        ? { ...prev, saps_comorbidades: arr.filter((i) => i !== c) }
        : { ...prev, saps_comorbidades: [...arr, c] };
    });
  };

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

const clearAntibiotic = (i) => {
    const up = [...patients];
    const p = JSON.parse(JSON.stringify(up[activeTab]));
    const atb = p.antibiotics[i];

    // Arquivar no histórico antes de limpar
    if (atb && atb.name) {
      if (!p.antibioticsHistory) p.antibioticsHistory = [];
      
      // 🧠 MÁGICA NATIVA: Calcula os dias de uso sem depender da ferramenta ausente
      let daysUsed = "?";
      if (atb.date) {
        const start = new Date(atb.date + 'T12:00:00'); // T12:00:00 evita bugs de fuso horário
        const today = new Date();
        const diffTime = today - start;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 porque o dia de início já é D1
        daysUsed = diffDays > 0 ? diffDays : 1;
      }

      p.antibioticsHistory.push({
        id: Date.now() + "_" + Math.random().toString(36).substr(2, 9),
        name: atb.name,
        startDate: atb.date,
        endDate: getManausDateStr(),
        duration: `${daysUsed} dia(s)`,
      });
    }

    // Limpa a prancheta e destranca o campo para o próximo uso
    p.antibiotics[i] = { name: "", date: "", locked: false }; 
    up[activeTab] = p;
    setPatients(up);

    // Salva e carimba na auditoria instantaneamente
    save(p, "Farmácia: Arquivou/Limpou Antibiótico");
  };

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

  const updateLab = (date, exam, value) => {
    const up = [...patients];
    const p = up[activeTab];
    if (!p.examHistory[date]) p.examHistory[date] = {};
    p.examHistory[date][exam] = value;
    up[activeTab] = syncLabsFromHistory(p);
    setPatients(up);
  };

  const updateAntibiotic = (i, f, v) => {
    setPatients(prev => {
      const up = [...prev];
      const p = JSON.parse(JSON.stringify(up[activeTab])); // Cópia profunda
      p.antibiotics[i][f] = v;
      up[activeTab] = p;
      return up;
    });
    // O 'save' foi removido! A auditoria acontecerá pelo onBlur no <input>
  };

  const handleNextDayBH = () => {
    if (!window.confirm("Deseja fechar o balanço atual e iniciar um novo dia?")) return;

    const up = [...patients];
    const p = JSON.parse(JSON.stringify(up[activeTab]));

    const { accumulated } = calculateTotals(p.bh || {});
    p.bh_previous = { ...(p.bh || {}) };
    p.bh = {
      date: getManausDateStr(),
      accumulated: accumulated || 0,
      insensibleLoss: p.bh?.insensibleLoss || 0,
      gains: {}, losses: {}, irrigation: {}, vitals: {}, customGains: p.bh?.customGains || [], customLosses: p.bh?.customLosses || [],
    };

    up[activeTab] = p;
    setPatients(up);
    save(p, "Balanço Hídrico: Fechou o dia (Balanço de 24h)");
  };

  const deleteATBHistoryItem = (id) => {
    if (!window.confirm("Excluir este antibiótico do histórico de forma permanente?")) return;

    const up = [...patients];
    const p = JSON.parse(JSON.stringify(up[activeTab]));
    if (p.antibioticsHistory) {
      p.antibioticsHistory = p.antibioticsHistory.filter((h) => h.id !== id);
      up[activeTab] = p;
      setPatients(up);

      // Salva e carimba na auditoria instantaneamente
      save(p, "Farmácia: Excluiu item do Histórico de ATB");
    }
  };

  const clearDate = (field) => {
    const up = [...patients];
    const p = JSON.parse(JSON.stringify(up[activeTab]));
    p[field] = "";
    up[activeTab] = p;
    setPatients(up);

    // Salva e carimba na auditoria instantaneamente
    save(p, "Sistema: Limpou Campo de Data");
  };

  const abrirEvolucaoInteligente = () => {
    // 1. Filtra os ATBs preenchidos
    const atbsAtivos = currentPatient.antibiotics?.filter(atb => atb.name && atb.date) || [];

    // 2. Monta o texto calculando os dias (D1, D2) nativamente para evitar erros
    const textoAtbs = atbsAtivos.map(atb => {
      const start = new Date(atb.date + 'T12:00:00');
      const today = new Date();
      const diffDays = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
      const diaFormatado = `D${diffDays > 0 ? diffDays : 1}`;
      
      return `${atb.name.toUpperCase()} (${diaFormatado})`;
    }).join(", ");

    // 3. Salva esse texto no campo que a IA vai ler
    updateNested("medical", "antibioticosTextoIA", textoAtbs || "Nenhum");

    // 4. Abre a tela do Checklist
    setShowChecklistEvo(true);
  };

  const confirmIndividualUpload = async (processedData) => {
    // Blindagem de memória
    const up = [...patients];
    const p = JSON.parse(JSON.stringify(up[activeTab]));

    // Se o paciente ainda não tem a pasta de documentos, nós a criamos
    if (!p.documentos) p.documentos = [];

    // Adiciona o novo documento processado na ficha do paciente
    p.documentos.push({
      id: Date.now().toString(),
      data: processedData.date || getManausDateStr(),
      categoria: processedData.category || "Outros",
      textoExtraido: processedData.text || "",
      resumoIA: processedData.aiSummary || "",
      nomeArquivo: processedData.fileName || "documento_anexado.pdf"
    });

    // Atualiza a tela
    up[activeTab] = p;
    setPatients(up);

    // Salva no banco de dados e gera o carimbo de auditoria
    save(p, `Recepção/Upload: Anexou novo documento (${processedData.category || "Outros"})`);

    // Fecha a janela e limpa os dados temporários
    setShowIndividualUploadModal(false);
    setPendingUploadData(null);
    alert("Documento salvo e anexado ao prontuário com sucesso!");
  };

  const handleAdmitPatient = () => {
    // MUDANÇA CRUCIAL: Pega os dados do paciente que já está na maca do leito!
    const p = currentPatient;

    console.log(">>> CLICOU EM ADMITIR! Puxando dados do leito:", p);

    setAdmissionData({
      // Puxa o que foi preenchido na hora de vincular da Fila de Espera
      nome: p?.nome || "",
      sexo: p?.sexo || "",
      dataNascimento: p?.dataNascimento || "",
      origem: p?.procedencia === "Recepção" ? "" : (p?.procedencia || ""),

      // Restante dos campos zerados para o médico preencher
      historia: "", exameGeral: "", exameACV: "", exameAR: "",
      exameABD: "", exameExtremidades: "", exameNeuro: "",
      ecg_ao: "", ecg_rv: "", ecg_rm: "", ecg_basal_ao: "", ecg_basal_rv: "", ecg_basal_rm: "",
      rass: "", pupilas: "", dva: false, drogasDVA: [],
      sedacao: false, drogasSedacao: [], medicamentos: "",
      conscienciaBasal: "", mobilidadeBasal: "", examesComplementares: "",
      diagAgudos: "", diagCronicos: "", conduta: "",
      saps_origem: "", saps_dias: "", saps_motivo: "", saps_sistema: "",
      saps_infeccao: "", saps_sitioInfeccao: "",
      saps_cirurgiaUrgente: false, saps_imunossupressao: false,
      saps_comorbidades: [],
    });

    setShowAdmissionModal(true);
  };

  // --- REABRIR ADMISSÃO MÉDICA ---
  const handleEditAdmission = () => {
    // Apenas levanta o modal novamente. Não zeramos a prancheta para não apagar
    // o que o médico já tinha digitado caso ele só queira corrigir uma palavra.
    setShowAdmissionModal(true);
  };

  const handleFinalizeAdmission = async () => {
    if (!admissionData.nome || !admissionData.nome.trim()) {
      return alert(
        "O preenchimento do NOME é obrigatório para admitir o paciente."
      );
    }

    const r = currentPatient.nome ? JSON.parse(JSON.stringify(currentPatient)) : defaultPatient(activeTab);
    r.statusInternacao = "Ativo"; // Libera o cadeado da Aba Médica
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
        ? `${totalEcg} (AO:${ao} RV:${admissionData.ecg_rv?.startsWith("T") ? "T" : rv
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

    const text = 
`ADMISSÃO
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

    // Criando o bloco filtrado apenas com o que importa para o dia a dia
    const historiaAbaMedica = `${admissionData.historia || "-"}
  
  MEDICAMENTOS DE USO HABITUAL:
  ${admissionData.medicamentos || "-"}
  
  NÍVEL DE CONSCIÊNCIA BASAL: ${admissionData.conscienciaBasal || "-"}
  MOBILIDADE BASAL: ${admissionData.mobilidadeBasal || "-"}`;

    // Agora a Aba Médica recebe apenas o resumo
    r.historiaClinica = historiaAbaMedica;
    // --- A CHAVE MESTRA: SALVANDO NA NUVEM ---
    try {
      await setDoc(doc(db, "leitos_uti", `bed_${activeTab}`), r);
    } catch (error) {
      console.error("Erro ao salvar admissão na nuvem:", error);
    }
    // -----------------------------------------
    const up = [...patients];
    up[activeTab] = r;
    setPatients(up);
    save(r, "Médico: Realizou a Admissão Completa do Paciente (Pré-UTI, SAPS 3 e Exame Físico)");

    setShowAdmissionModal(false);
    // A tela de copiar texto final continua recebendo a Admissão Completa
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
    // 1. BLINDAGEM DE MEMÓRIA (Evita bugs do React com Cópia Profunda)
    const up = [...patients];
    const p = JSON.parse(JSON.stringify(up[activeTab]));

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
    p.physio.pressaoControlada = physioData.pressaoControlada;
    p.physio.pressaoSuporte = physioData.pressaoSuporte;
    p.physio.fr = physioData.fr;
    p.physio.tIns = physioData.tIns;
    p.physio.relIE = physioData.relIE;
    p.physio.filtroHMEF = physioData.filtroHMEF;

    p.physio.dataHMEF = physioData.dataHMEF;
    p.physio.sistemaFechado = physioData.sistemaFechado;
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

    up[activeTab] = p;
    setPatients(up);

    // 2. A CAIXA PRETA: Carimba a admissão da fisio de uma vez só!
    save(p, "Fisioterapia: Realizou a Admissão Completa (Avaliação Inicial, Parâmetros Ventilatórios e Escalas)");

    // --- O RESTANTE DA FUNÇÃO (GERADOR DE TEXTO) CONTINUA INTACTO ---
    const mrcText = physioData.mrcScore ? `\nESCORE MRC: ${physioData.mrcScore}` : "";
    const imsText = physioData.ims ? `\nICU MOBILITY SCALE (IMS): ${physioData.ims}` : "";

    let suporteText = "";
    if (physioData.suporte) {
      if (physioData.suporte === "VM") {
        let paramText = "-";
        if (physioData.parametro === "VCV") paramText = `Vt: ${physioData.volCorrente || "-"}ml`;
        else if (physioData.parametro === "PCV") paramText = `PC: ${physioData.pressaoControlada || "-"}cmH2O`;
        else if (physioData.parametro === "PSV") paramText = `PS: ${physioData.pressaoSuporte || "-"}cmH2O`;

        suporteText = `\n\nSUPORTE VENTILATÓRIO: ${physioData.suporte}\nModo: ${physioData.parametro || "-"} | ${paramText} | PEEP: ${physioData.peep || "-"} | FR: ${physioData.fr || "-"} | T.ins: ${physioData.tIns || "-"} | I:E: ${physioData.relIE || "-"} | FiO2: ${physioData.fiO2 || "-"}%`;
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

    if (physioData.suporte === "VM") {
      if (physioData.dataIntubacao) itensAirway.push(`Intubação: ${physioData.dataIntubacao ? formatDateDDMM(physioData.dataIntubacao) : "-"}`);
      if (physioData.numeroTOT) itensAirway.push(`TOT Nº: ${physioData.numeroTOT}`);
      if (physioData.rimaFixacao) itensAirway.push(`Rima: ${physioData.rimaFixacao}cm`);
    }

    if (physioData.cuff) itensAirway.push(`Cuff: ${physioData.cuff} cmH2O`);
    if (physioData.filtroHMEF) itensAirway.push(`Filtro HMEF (Troca: ${physioData.dataHMEF ? formatDateDDMM(physioData.dataHMEF) : "Não informada"})`);
    if (physioData.sistemaFechado) itensAirway.push(`Sist. Fechado de Aspiração (Troca: ${physioData.dataSFA ? formatDateDDMM(physioData.dataSFA) : "Não informada"})`);

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

    // 1. TRAVA O SAPS 3 (O código original do senhor)
    if (!p.saps3) p.saps3 = {};
    p.saps3.isLocked = true;
    p.saps3.lockedScore = calc.score;
    p.saps3.lockedProb = calc.prob;
    p.saps3.lockedDetails = calc.details;

    // 2. SUTURA: CARIMBO AUTOMÁTICO NA EVOLUÇÃO MÉDICA
    if (!p.medical) p.medical = {};
    const evolucaoAtual = p.medical.evolucao || "";
    const textoSaps = `\n\n--- ADMISSÃO ---\nEscore SAPS 3: ${calc.score} pontos (Mortalidade Estimada: ${calc.prob}%).\n----------------\n`;

    // Verifica se o texto já existe para evitar duplicidade (caso o médico destrave e trave de novo)
    if (!evolucaoAtual.includes("Escore SAPS 3:")) {
      p.medical.evolucao = evolucaoAtual + textoSaps;
      alert("SAPS 3 Travado e carimbado na Evolução Médica com sucesso!");
    } else {
      alert("SAPS 3 Travado com sucesso!");
    }

    // 3. SALVA TUDO NO BANCO DE DADOS
    setPatients(up);
    save(p);
  };

  const handleUnlockSAPS3 = () => {
    if (!window.confirm("Atenção: Destravar o SAPS 3 fará com que a pontuação seja recalculada com os dados atuais de sinais e exames. Deseja continuar?")) return;
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
    let lastError = "Iniciando...";

    try {
      // AQUI GARANTIMOS QUE ELE PUXE DIRETO DO VITE, ALÉM DAS PROPS
      const envKey = import.meta.env.VITE_GEMINI_API_KEY_MED; // <- MUDE AQUI PARA O NOME EXATO QUE ESTÁ NA SUA VERCEL
      const currentKey = envKey || window.apiKey || "";
      
      // O NOSSO RAIO-X:
      console.log("CHAVE QUE ESTÁ INDO PARA O GOOGLE: ", currentKey.substring(0, 8) + "...");

      if (!currentKey || currentKey.length < 10 || currentKey === "undefined") {
        throw new Error(`Chave inválida. Valor recebido: ${currentKey}`);
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
      
      const fcStatus = fcMax > 100 ? (isFem ? "taquicárdica" : "taquicárdico") : (fcMin > 0 && fcMin < 60 ? (isFem ? "bradicárdica" : "bradicárdico") : (isFem ? "eucárdica" : "eucárdico"));
      const paStatus = (pasMin > 0 && pasMin < 90) ? "com hipotensão" : (pasMax > 160 ? (isFem ? "hipertensa" : "hipertenso") : "com bom controle pressórico");

      // 2. ESTADO GERAL E NEURO
      const egSalvo = dadosDoTimeout?.estadoGeral || currentPatient.medical?.estadoGeral || "REG";
      const egExtenso = egSalvo === "BEG" ? "BEG" : (egSalvo === "MEG" ? "MEG" : "REG");
      const sedacaoText = currentPatient.neuro?.sedacao ? (isFem ? "sedada" : "sedado") : "sem sedação";

      // 3. RESPIRATÓRIO -> CORREÇÃO AR AMBIENTE
      const suporte = currentPatient.physio?.suporte || "Ar ambiente";
      let suporteText = "";
      if (suporte === "VM") suporteText = "em VM por TOT";
      else if (suporte.toLowerCase() === "ar ambiente") suporteText = "em ar ambiente";
      else suporteText = `em uso de ${suporte}`;

      // 4. HEMODINÂMICO (Cirurgia: Removido o texto "DVA em ascensão")
      const usaDVA = currentPatient.cardio?.dva === true; 
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
          if (last > prev) hemodinamicaStatus = "Hemodinamicamente instável"; // <-- Alterado aqui
        }
      }
      const dvaText = usaDVA ? `em uso de DVA (${currentPatient.cardio.drogasDVA?.join(", ")})` : "sem uso de DVA";

      // 5. RENAL -> CORREÇÃO CLEARANCE (KDIGO)
      const diureseNum = parseFloat(calculateDiurese12hMlKgH(currentPatient));
      const diureseStatus = (!isNaN(diureseNum) && diureseNum < 0.5) ? "Baixa diurese" : "Boa diurese";
      
      const crclNum = parseFloat(calculateCreatinineClearance(currentPatient));
      let renalStatus = "sem cálculo de função renal";
      
      if (!isNaN(crclNum)) {
        if (crclNum >= 90) renalStatus = "função renal normal";
        else if (crclNum >= 60) renalStatus = "redução leve da função renal";
        else if (crclNum >= 30) renalStatus = "falha moderada da função renal";
        else renalStatus = "falha severa da função renal";
      }

     // 6. LABORATORIAL -> CORREÇÃO BUSCA RECENTE, FAIXAS E PONTUAÇÃO BRASILEIRA
      const parseLeuco = (val) => {
        if (!val) return 0;
        let n = parseFloat(String(val).replace(",", "."));
        if (isNaN(n)) return 0;
        if (n > 0 && n < 200) n = n * 1000;
        return n;
      };

      let leucoVal = parseLeuco(currentPatient.labs?.today?.leuco);
      if (!leucoVal) leucoVal = parseLeuco(currentPatient.labs?.yesterday?.leuco);
      if (!leucoVal) leucoVal = parseLeuco(currentPatient.labs?.dayBefore?.leuco);

      let leucoStatus = "sem dados recentes de leucometria";
      if (leucoVal > 0) {
        if (leucoVal < 5000) leucoStatus = "leucopenia";
        else if (leucoVal <= 10000) leucoStatus = "leucometria normal";
        else if (leucoVal <= 12000) leucoStatus = "leucocitose discreta";
        else if (leucoVal <= 20000) leucoStatus = "leucocitose";
        else leucoStatus = "leucocitose importante";
      }

      const atbValidado = dadosDoTimeout?.atbs || currentPatient.medical?.antibioticosTextoIA || "";
      const atbsFinal = (!atbValidado || atbValidado.toLowerCase() === "nenhum") ? "sem uso de antibióticos ativos" : `em uso de ${atbValidado}`;

      // 7. GASTRO E DIETA (Leitura Qualitativa no BH para Vômitos, Diarreia e Evacuação)
      
      // 🧠 TRADUTOR CLINICO: Aceita cruzes, "sim", "s" e volumes, mas ignora "0", "n", "nao" e hífens.
      const temRegistroPositivo = (valor) => {
        if (!valor) return false;
        const texto = String(valor).trim().toLowerCase();
        if (texto === "" || texto === "0" || texto === "n" || texto === "nao" || texto === "não" || texto === "-") return false;
        return true; 
      };

      let temVomitoNoBH = false;
      let temDiarreiaNoBH = false;
      let temEvacuacaoNoBH = false; // <-- Nova variável para rastrear evacuação no plantão

      if (currentPatient.bh?.losses) {
        Object.values(currentPatient.bh.losses).forEach(hora => {
          if (!hora) return;
          // Verifica Vômitos
          if (temRegistroPositivo(hora["Vômitos"]) || temRegistroPositivo(hora["Vomitos"])) {
            temVomitoNoBH = true;
          }
          // Verifica Diarreia
          if (temRegistroPositivo(hora["Diarreia"]) || temRegistroPositivo(hora["Diarréia"])) {
            temDiarreiaNoBH = true;
          }
          // Verifica Evacuação (procurando por várias nomenclaturas comuns)
          if (temRegistroPositivo(hora["Evacuação"]) || temRegistroPositivo(hora["Evacuacao"]) || temRegistroPositivo(hora["Fezes"])) {
            temEvacuacaoNoBH = true;
          }
        });
      }

      // Calcula os dias baseado na data cadastrada
      const dataEvac = currentPatient.gastro?.dataUltimaEvacuacao;
      let evacDaysStr = dataEvac 
        ? (typeof calculateEvacDays === 'function' ? calculateEvacDays(dataEvac) : "-")
        : "sem registro de evacuações durante essa internação";

      // 🌟 SE A ENFERMAGEM LANÇOU NO BH HOJE, SOBRESCREVE A DATA E AVISA QUE FOI HOJE!
      if (temEvacuacaoNoBH) {
        evacDaysStr = "hoje";
      }
      
      let tgiIntercorrencias = "";
      if (temVomitoNoBH && temDiarreiaNoBH) tgiIntercorrencias = " Houve registro de vômitos e diarreia no dia de hoje.";
      else if (temVomitoNoBH) tgiIntercorrencias = " Houve registro de vômito no dia de hoje.";
      else if (temDiarreiaNoBH) tgiIntercorrencias = " Houve registro de diarreia no dia de hoje.";

      const viaDieta = currentPatient.nutri?.via ? currentPatient.nutri.via.toLowerCase() : "zero";

      // 8. O PROMPT (Ajustado para clareza máxima na anexação do TGI)
      const promptText = `Você é um médico intensivista. Redija a evolução ESTRITAMENTE no formato exato fornecido abaixo.
      NÃO adicione introduções, NÃO use tópicos. Siga exatamente a estrutura de 5 parágrafos.

      FORMATO OBRIGATÓRIO:
      ${sexoPaciente} encontra-se em [ESTADO GERAL], [SEDAÇÃO], [SUPORTE RESPIRATÓRIO], [SPO2].
      [HEMODINÂMICA], [DVA], apresenta-se [FC], [PA].
      [DIURESE], com [FUNÇÃO RENAL].
      ${mantemSe} [TEMPERATURA], com [LEUCOMETRIA] e [ATB].
      A dieta é [VIA DIETA]. Última evacuação: [EVACUAÇÃO].[TGI]

      DADOS CLÍNICOS REAIS:
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
      - [EVACUAÇÃO]: ${evacDaysStr}
      - [TGI]: ${tgiIntercorrencias}
      
      INSTRUÇÃO FINAL: Se o campo [TGI] contiver texto, você DEVE transcrevê-lo exatamente após a última evacuação. Se [TGI] estiver vazio, finalize a evolução em [EVACUAÇÃO].`;

      // 9. LOOP DE MODELOS (GEMINI)
      const models = ["gemini-2.5-flash"];
      
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
            // SUTURA DE SEGURANÇA: O SAPS 3 é injetado diretamente no código, sem depender da IA
            const baseText = data.candidates[0].content.parts[0].text.trim();
            const saps3Val = currentPatient.saps3?.lockedScore || currentPatient.saps3?.score || "N/A";
            
            // Adiciona o texto base, dá DOIS enters (uma linha vazia de espaço) e carimba o SAPS
            setAiEvolution(`${baseText}\n\nSAPS 3: ${saps3Val}`);
            
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
      const modelsToTry = ["gemini-1.5-pro"];

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

  const handleGeneratePhysioEvo = () => {
    alert("O Médico Especialista (IA) da Fisioterapia está sendo preparado e chegará em breve!");
  };

  // --- FUNÇÃO: TROCA DE SUPORTE VENTILATÓRIO ---
  const handleSuporteChange = (novoSuporte) => {
    // 1. Atualiza o nome do suporte escolhido
    updateNested("physio", "suporte", novoSuporte);
      
    // 2. Limpa os parâmetros antigos (para não sobrar PEEP da VM se o paciente for para o Ar Ambiente)
    updateNested("physio", "parametro", "");
    updateNested("physio", "peep", "");
    updateNested("physio", "fiO2", "");
    updateNested("physio", "volCorrente", "");
    updateNested("physio", "pressaoControlada", "");
    updateNested("physio", "pressaoSuporte", "");
  };

  // --- 1. Calcular a Data de Troca (Ex: Filtro HMEF vence em 168h / 7 dias) ---
    const calculateExchangeDate = (dateString, hoursToAdd) => {
      if (!dateString) return "";
      // Ajusta para o meio-dia para evitar bugs de fuso horário no JavaScript
      const d = new Date(dateString + 'T12:00:00'); 
      d.setHours(d.getHours() + hoursToAdd);
      
      // Formata a data de saída para DD/MM/AA
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = String(d.getFullYear()).slice(-2);
      
      return `${dd}/${mm}/${yy}`;
    };

    // --- 2. Verificar se o dispositivo está vencido (Fica vermelho na tela) ---
    const isDeviceExpired = (dateString, maxHours) => {
      if (!dateString) return false;
      const deviceDate = new Date(dateString + 'T12:00:00');
      const now = new Date();
      // Diferença em milissegundos convertida para horas
      const diffInHours = (now - deviceDate) / (1000 * 60 * 60);
      return diffInHours >= maxHours;
    };

    // --- 3. Acionar a Impressora para a Gasometria ---
    const handlePrintGasometria = () => {
      window.print();
    };

// --- FERRAMENTAS DO BALANÇO HÍDRICO (TÉCNICO) ---

    // 1. Função Vital: Atualizar células do BH
    const updateBH = (hour, category, item, value) => {
      setPatients(prev => {
        const up = [...prev];
        const p = JSON.parse(JSON.stringify(up[activeTab])); // Cópia profunda
        
        // Garante que o BH atual existe
        if (!p.bh) p.bh = { date: getManausDateStr(), gains: {}, losses: {}, vitals: {}, irrigation: {} };
        if (!p.bh[category]) p.bh[category] = {};
        
        // Se for irrigação, não tem "item", é direto na hora
        if (category === "irrigation") {
          p.bh.irrigation[hour] = value;
        } else {
          if (!p.bh[category][hour]) p.bh[category][hour] = {};
          p.bh[category][hour][item] = value;
        }
        
        up[activeTab] = p;
        return up;
      });
    };

    // 2. Imprimir Balanço Hídrico
    const handlePrintBH = () => {
      window.print();
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

  const handleFinalizeNursingAdmission = () => {
    const reqBraden = [
      "braden_percepcao", "braden_umidade", "braden_atividade",
      "braden_mobilidade", "braden_nutricao", "braden_friccao",
    ];
    const reqMorse = [
      "morse_historico", "morse_diagnostico", "morse_auxilio",
      "morse_terapiaIV", "morse_marcha", "morse_estadoMental",
    ];

    // 1. VALIDAÇÃO DE SEGURANÇA (Obrigatório preencher tudo)
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

    // 2. A SUTURA FINAL (Atualiza, Salva e Fecha)
    const up = [...patients];
    const p = JSON.parse(JSON.stringify(up[activeTab])); // Cópia profunda segura

    if (!p.enfermagem) p.enfermagem = {};

    // Injeta os dados do formulário no corpo do paciente
    Object.keys(nursingData).forEach((k) => {
      p.enfermagem[k] = nursingData[k];
    });

    // Atualiza a tela
    up[activeTab] = p;
    setPatients(up);

    // Salva no banco de dados com carimbo de auditoria
    save(p, "Enfermagem: Admissão Concluída (Escalas Braden e Morse validadas)");

    // Fecha o modal de admissão
    setShowNursingModal(false);
  };

  // ========================================================================
  // MAPA DE VENTILAÇÃO MECÂNICA (FISIOTERAPIA)
  // ========================================================================

  const handleAddVmEntry = () => {
    const up = [...patients];
    const p = JSON.parse(JSON.stringify(up[activeTab])); // Cópia profunda segura

    if (!p.physio) p.physio = {};
    if (!Array.isArray(p.physio.vmFlowsheet)) p.physio.vmFlowsheet = [];

    // Cria a etiqueta de tempo no formato "DD/MM - HH:MM"
    const now = new Date();
    const dataHora = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')} - ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Puxa os dados basais que já estão na admissão/painel principal da fisio
    const newEntry = {
      id: Date.now().toString(),
      dataHora: dataHora,
      modo: p.physio.parametro || "",
      fio2: p.physio.fiO2 || "",
      peep: p.physio.peep || "",
      vc: p.physio.volCorrente || "",
      pc: p.physio.pressaoControlada || "",
      ps: p.physio.pressaoSuporte || "",
      fr: p.physio.fr || "",
      pPico: "",
      pPlato: "",
      dp: "",
      cst: "",
    };

    p.physio.vmFlowsheet.push(newEntry);

    up[activeTab] = p;
    setPatients(up);

    // Como criar uma coluna é uma ação de clique de botão, salvamos na hora!
    save(p, "Fisioterapia: Adicionou nova coluna de avaliação no Mapa VM");
  };

  const updateVmEntry = (index, field, value) => {
    setPatients(prev => {
      const up = [...prev];
      const p = JSON.parse(JSON.stringify(up[activeTab])); // Cópia profunda segura

      if (!p.physio || !p.physio.vmFlowsheet) return prev; // Trava de segurança

      let entry = p.physio.vmFlowsheet[index];
      if (!entry) return prev;

      entry[field] = value;

      // 🧠 MOTOR DE CÁLCULO AUTOMÁTICO (Mecânica Ventilatória)
      // Substitui vírgula por ponto para não dar erro no cálculo se o fisio digitar "14,5"
      const plato = parseFloat(entry.pPlato?.toString().replace(',', '.'));
      const peep = parseFloat(entry.peep?.toString().replace(',', '.'));
      const vc = parseFloat(entry.vc?.toString().replace(',', '.'));

      // 1. Calcula a Driving Pressure (DP = PPlatô - PEEP)
      if (!isNaN(plato) && !isNaN(peep)) {
        const dp = plato - peep;
        entry.dp = dp > 0 ? dp.toFixed(0) : "";

        // 2. Calcula a Complacência Estática (Cst = VC / DP)
        if (!isNaN(vc) && dp > 0) {
          const cst = vc / dp;
          entry.cst = cst.toFixed(1);
        } else {
          entry.cst = ""; // Limpa se faltar o VC
        }
      } else {
        // Se o usuário apagar o Platô ou PEEP, limpamos os cálculos para não mostrar "NaN"
        if (field === 'pPlato' || field === 'peep') {
          entry.dp = "";
          entry.cst = "";
        }
      }

      p.physio.vmFlowsheet[index] = entry;
      up[activeTab] = p;
      return up;
    });
    // O 'save' não está aqui porque a digitação salva no onBlur do input!
  };

  const toggleArrayItem = (category, field, value) => {
    const up = [...patients];
    const p = up[activeTab];
    if (!p[category]) p[category] = {};
    let arr = Array.isArray(p[category][field]) ? [...p[category][field]] : [];
    if (arr.includes(value)) arr = arr.filter(i => i !== value);
    else arr.push(value);
    p[category][field] = arr;
    setPatients(up);
  };

  const handleBlurSave = () => save(patients[activeTab], "Auto-save on blur");

  const handleClearData = async () => {
    if (!window.confirm("Deseja realmente LIMPAR todos os dados deste leito?")) return;
    const empty = defaultPatient(activeTab);
    const up = [...patients];
    up[activeTab] = empty;
    setPatients(up);
    await deleteDoc(doc(db, "leitos_uti", `bed_${empty.id}`));
  };

  const handlePrintHistory = () => {
    // Essa função geralmente abre uma janela de impressão do histórico.
    // Cole aqui o conteúdo original do seu App.jsx (que criava o window.open, montava o HTML e chamava window.print()).
    alert("Função de impressão em desenvolvimento para o novo módulo.");
  };

  const handleNoraModalResponse = (isDoubleDose) => {
    const up = [...patients];
    const p = JSON.parse(JSON.stringify(up[activeTab]));
    const today = getManausDateStr();

    if (!p.sofa_data_technical) p.sofa_data_technical = {};
    if (!p.hd_monitoramento) p.hd_monitoramento = {};
    if (!p.hd_monitoramento[currentNoraHour]) p.hd_monitoramento[currentNoraHour] = {};

    p.sofa_data_technical.noraDoubleDoseToday = isDoubleDose;
    p.sofa_data_technical.noraModalShown_date = today;
    p.hd_monitoramento[currentNoraHour].noraRate = currentNoraRate;

    up[activeTab] = p;
    setPatients(up);

    const mensagemAuditoria = isDoubleDose
      ? "Segurança/Drogas: Confirmou uso de Noradrenalina DOBRADA (8 amp/250mL)"
      : "Segurança/Drogas: Confirmou uso de Noradrenalina PADRÃO (4 amp/250mL)";

    save(p, mensagemAuditoria);

    setShowNoraModal(false);
    setCurrentNoraHour("");
    setCurrentNoraRate("");
  };

  // --- LÓGICA DE INTERFACE (RBAC - Filtro de Abas) ---
  const allNavButtons = [
    { id: "overview", label: "Visita Multi", icon: <Activity size={20} /> },
    { id: "medical", label: "Médico", icon: <Stethoscope size={20} /> },
    { id: "nursing", label: "Enfermeiro", icon: <NurseCap size={20} /> },
    { id: "physio", label: "Fisioterapeuta", icon: <Wind size={20} /> },
    { id: "nutri", label: "Nutrição", icon: <Apple size={20} /> },
    { id: "speech", label: "Fonoaudiologia", icon: <Mic size={20} /> },
    { id: "tech", label: "Téc. em Enf.", icon: <Thermometer size={20} /> },
    { id: "hemodialysis", label: "Hemodiálise", icon: <Filter size={20} /> },
    // Aba de Gestão: Só aparece para chefias
    ...(userProfile?.role === "Gestor" || userProfile?.role === "Administrador"
      ? [{ id: "management", label: "Gestão da UTI", icon: <Gauge size={20} /> }]
      : []),
  ];

  const navButtons = allNavButtons.filter((btn) => {
    // Se o userProfile ainda não carregou (está nulo), mostramos tudo por segurança 
    // ou nada até carregar. Aqui vamos deixar passar se for nulo para não quebrar a tela.
    if (!userProfile) return true;

    if (userProfile.perfil === "Técnico em Enfermagem") {
      return btn.id === "tech" || btn.id === "hemodialysis";
    }
    return true;
  });

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
      if (distance < minDistance) { minDistance = distance; closest = child.id.replace('nav-', ''); }
    });
    if (closest && closest !== centerTab) setCenterTab(closest);
  };

  // --- RBAC (Controle de Acessos com Chave Mestra) ---
  // Blindagem: Aceita tanto 'role' quanto 'perfil' vindo do Firebase
  const userRole = userProfile?.role || userProfile?.perfil;

  const isDev = userRole === "Desenvolvedor";

  // O Desenvolvedor herda automaticamente os poderes de todos os perfis
  const isDocRole = isDev || userRole === "Médico" || userRole === "Gestor" || userRole === "Administrador";

  const isNursingRole = isDev || userRole === "Enfermeiro" || userRole === "Técnico em Enfermagem" || userRole === "Gestor" || userRole === "Administrador";

  const isAdmin = isDev || userRole === "Administrador";

  // Regras de Edição: Adicionamos a Enfermagem aqui para ela poder editar as próprias abas!
  const isEditable = isDev || isDocRole || isNursingRole;

  const isOverviewEditable = isDev || isDocRole || isNursingRole;

  const canCloseDay = isDev || userRole === "Enfermeiro" || isOverviewEditable;

  const isBHReadOnly = viewingPreviousBH || !isEditable;

  // Menus Visíveis
  const visibleNavButtons = userRole === "Técnico em Enfermagem"
    ? navButtons.filter(btn => btn.id === "tech" || btn.id === "hemodialysis")
    : navButtons;

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-20 relative bg-hexagon-pattern bg-repeat">
      <style>{`
                @media print {
                    @page { size: portrait; margin: 10mm; }
                    .print\\:hidden { display: none !important; }
                    body { background: white !important; }
                }
            `}</style>

      {/* CABEÇALHO SUPERIOR - DESIGN DA MAIN COM DADOS DA V2 */}
      <div
        id="original-header"
        className="relative z-30 pb-36 pt-8 px-4 md:px-8 shadow-xl print:hidden bg-[#008f8f] bg-[url('/logodagua.svg')] bg-cover bg-center bg-no-repeat"
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
          
{/* LADO ESQUERDO DO CABEÇALHO: Logo e Títulos RESTAURADOS */}
          <div className="flex items-center gap-2 md:gap-4">
            
            {/* --- NOVO BOTÃO DE VOLTAR (Apenas para perfis Master) --- */}
            {(userProfile?.perfil === "Administrador" || userProfile?.perfil === "Desenvolvedor" || userProfile?.role === "Administrador" || userProfile?.role === "Desenvolvedor") && (
              <button
                onClick={() => navigate('/hub')}
                className="bg-white/10 hover:bg-white/20 p-2.5 md:pr-4 md:pl-3 rounded-full text-white transition-all border border-white/30 cursor-pointer shadow-sm backdrop-blur-sm flex items-center gap-2 mr-1 md:mr-2"
                title="Voltar ao Mapa de Setores"
              >
                <ArrowLeft size={20} />
                <span className="hidden md:inline font-bold text-sm">Painel</span>
              </button>
            )}

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
              <Activity size={32} />
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

          {/* LADO DIREITO DO CABEÇALHO: Upload de Lote e Cápsula de Usuário */}
          <div className="flex items-center gap-4">
            {/* BOTÃO DE UPLOAD (Vindo da Main) */}
            <label
              className="bg-white/10 hover:bg-white/20 p-2.5 rounded-full text-white transition-all border border-white/30 cursor-pointer shadow-sm backdrop-blur-sm"
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

            {/* CÁPSULA DE USUÁRIO (Design Main + Dados V2) */}
            <div className="flex items-center bg-white rounded-full p-1.5 pr-2 shadow-lg gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white shadow-inner">
                <User size={20} />
              </div>
              
              <div className="flex flex-col text-right hidden md:flex min-w-[120px]">
                <span className="text-sm font-bold text-slate-800 leading-tight">
                  {userProfile?.nome || user?.email || "Usuário"}
                </span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-tight">
                  {userProfile?.perfil || "Médico"} {userProfile?.conselho ? `- ${userProfile.conselho} ${userProfile.numeroConselho || ''}` : ''}
                </span>
              </div>

              {/* BOTÃO DE SAIR (Design Main - Redondo e Verde/Teal) */}
              <button
                onClick={handleLogout} 
                className="w-10 h-10 rounded-full bg-teal-600 hover:bg-teal-700 flex items-center justify-center text-white transition-colors shadow-sm ml-2"
                title="Sair do Sistema"
              >
                 <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* CORPO PRINCIPAL (LEITOS + ABAS LATERAIS) */}
      {/* ========================================== */}
      <main className="max-w-7xl mx-auto -mt-20 px-2 md:px-4 print:mt-0 print:p-0">
        
        {/* BARRA DE LEITOS (Design Main) */}
        <div className="relative z-40 bg-white/95 backdrop-blur-sm p-1.5 rounded-2xl shadow-md mb-6 flex overflow-x-auto gap-2 scrollbar-hide print:hidden border border-white">
          {patients.map((p, idx) => {
            // Se o senhor tiver regra de esconder o leito 11, coloque aqui (Ex: if (p.leito === 11 && !isAdmin) return null;)
            const isActive = activeTab === idx;
            return (
              <button
                key={p.id || idx}
                onClick={() => setActiveTab(idx)}
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
          
          {/* FUNDO DE HEXÁGONOS */}
          <img 
            src="/hexagons.svg" 
            alt="Hexágonos" 
            className="absolute -top-6 right-0 md:-right-40 w-[280px] md:w-[350px] opacity-5 pointer-events-none z-0" 
            onError={(e) => e.target.style.display = 'none'}
          />

          {/* LADO ESQUERDO: BARRA DE NAVEGAÇÃO FLUTUANTE (Carrossel 3D Mobile) */}
          <div className="w-full md:w-12 flex-shrink-0 relative z-[60] print:hidden self-start md:sticky md:top-6">
            <div className="relative mb-6 md:mb-0 print:hidden">

              <div
                ref={navScrollRef}
                // SUTURA: px-[40vw] garante que mesmo com 1 ou 2 abas, você consiga "deslizar" ela para fora do centro
                className={`flex overflow-x-auto md:overflow-visible md:flex-col gap-0 md:gap-3 pb-4 md:pb-0 scrollbar-hide snap-x snap-mandatory items-center px-[40vw] md:px-0`}
              >
                {visibleNavButtons.map((btn, index) => {
                  const isActive = viewMode === btn.id;
                  
                  // Lógica 3D do Mobile
                  const isExpandedMobile = window.innerWidth < 768 && centerTab === btn.id;
                  const centerIndex = visibleNavButtons.findIndex(b => b.id === (centerTab || visibleNavButtons[0]?.id));
                  const distanceToCenter = Math.abs(index - (centerIndex !== -1 ? centerIndex : 0));
                  const zIndexCascata = window.innerWidth < 768 ? (40 - distanceToCenter) : 10;

                  return (
                    <div
                      key={btn.id}
                      id={`nav-${btn.id}`}
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

                        {/* TEXTO */}
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

{/* ========================================== */}
          {/* LADO DIREITO: ÁREA DAS ABAS (Conteúdo) */}
          {/* ========================================== */}
          <div className="flex-1 w-full min-w-0">
            <div className="sticky top-0 z-40 bg-white px-4 py-3 shadow-md border rounded-t-3xl flex justify-between items-center">
              
              <div className="flex items-center gap-3 flex-wrap">
                {/* O NOME AGORA É UM BOTÃO */}
                <button 
                  onClick={() => currentPatient.nome && setShowPatientDataModal(true)}
                  className={`text-lg font-extrabold text-teal-600 uppercase transition-all flex items-center gap-2 ${
                    currentPatient.nome ? "hover:text-teal-800 cursor-pointer hover:scale-[1.01]" : "cursor-default"
                  }`}
                  title={currentPatient.nome ? "Ver dados cadastrais" : ""}
                >
                  {currentPatient.nome || "LEITO DISPONÍVEL"}
                  {currentPatient.nome && <FileText size={16} className="text-teal-400 opacity-50" />}
                </button>
                
                {/* BOTÃO DA LIXEIRA */}
                {currentPatient.nome && (
                  <button onClick={handleClearData} className="text-slate-300 hover:text-red-500 transition-colors" title="Liberar Leito">
                    <Trash2 size={18} />
                  </button>
                )}

                {/* --- NOVA CÁPSULA DE IDADE --- */}
                {currentPatient.dataNascimento && (
                  <span className="bg-teal-600 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow-sm">
                    {calculateAge(currentPatient.dataNascimento)} anos
                  </span>
                )}
              </div>
              
              <span className="bg-slate-100 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap">
                Leito {currentPatient.leito}
              </span>
            </div>

            <div className="relative z-20 bg-white p-6 md:p-8 rounded-b-3xl shadow-xl border border-t-0 min-h-[500px]">
              {!currentPatient.nome ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 py-20">
                  <UserPlus size={64} className="mb-4 text-slate-300" />
                  <h3 className="text-xl font-bold text-slate-700">Leito Vazio</h3>
                  <p className="text-slate-400 mb-6 text-sm">Nenhum paciente ocupando este leito no momento.</p>

                  {/* AQUI ESTÁ A MÁGICA: Agora ele chama a Fila de Espera passando o número do leito! */}
                  <button
                    onClick={() => handleOpenQueue(activeTab)}
                    className="mt-4 bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-xl font-bold shadow-md transition-colors"
                  >
                    Puxar Paciente da Fila
                  </button>
                </div>
              ) : (
                <>
                  {/* ABA: VISITA MULTI / OVERVIEW */}
                  {viewMode === "overview" && (
                    currentPatient.statusInternacao === "Aguardando Admissão Médica" ? (
                      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border-2 border-dashed border-slate-200 mt-4">
                        <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 text-3xl">
                          👥
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Aguardando Admissão</h3>
                        <p className="text-slate-500 mb-6 text-center max-w-sm">
                          O paciente <b>{currentPatient.nome}</b> já foi vinculado ao leito, mas a Visita Multi será liberada assim que o médico finalizar a Admissão.
                        </p>
                      </div>
                    ) : (
                      <OverviewTab
                        currentPatient={currentPatient}
                        viewMode={viewMode} // ou activeTab (depende de como o senhor chamou aí em cima)
                        handleBlurSave={handleBlurSave}
                        updateP={updateP}

                        // --- Ferramentas e Cálculos que faltavam ---
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
                        isOverviewEditable={isOverviewEditable}
                      />
                    )
                  )}

                  {/* ABA: GESTÃO / MANAGEMENT */}
                  {viewMode === "management" && (
                    <ManagementTab
                      patients={patients}
                      calculateSAPS3Score={calculateSAPS3Score}
                      getDaysD1={getDaysD1}
                      handleBlurSave={handleBlurSave}
                    />
                  )}
                  {viewMode === "medical" && (
                    currentPatient.statusInternacao === "Aguardando Admissão Médica" ? (
                      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border-2 border-dashed border-slate-200 mt-4">
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                          {/* Usando um ícone ou um emoji de estetoscópio caso não tenha o Lucide importado aí */}
                          <span className="text-4xl">🩺</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Paciente Aguardando Admissão</h3>
                        <p className="text-slate-500 mb-6 text-center max-w-sm">
                          O paciente foi vinculado a este leito. É obrigatório realizar a admissão formal antes de acessar a tela de evolução diária.
                        </p>
                        <button
                          onClick={handleAdmitPatient}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-transform active:scale-95"
                        >
                          Iniciar Admissão Médica
                        </button>
                      </div>
                    ) : (
                      <MedicalDashboard
                        currentPatient={currentPatient}
                        isEditable={isEditable}
                        updateNested={updateNested}
                        updateP={updateP}
                        handleBlurSave={handleBlurSave}
                        handleEditAdmission={handleEditAdmission}
                        setShowATBHistoryModal={setShowATBHistoryModal}
                        updateAntibiotic={updateAntibiotic}
                        clearAntibiotic={clearAntibiotic}
                        abrirChecklistEvolucao={abrirEvolucaoInteligente}
                        isGeneratingAI={isGeneratingAI}
                        aiEvolution={aiEvolution}
                        setAiEvolution={setAiEvolution}
                        copyToClipboardFallback={copyToClipboardFallback}
                      />
                    )
                  )}
                  {viewMode === "nursing" && (
                    <NursingDashboard
                      currentPatient={currentPatient}
                      isEditable={isEditable}
                      updateNested={updateNested}
                      handleBlurSave={handleBlurSave}

                      // 👇 A MÁGICA MUDA AQUI: Em vez de setViewMode, usamos setShowNursingModal 👇
                      handleNursingAdmission={() => setShowNursingModal(true)}

                      generateNursingAI_Evolution={generateNursingAI_Evolution}
                      isNursingRole={isNursingRole}
                      isGeneratingNursingAI={isGeneratingNursingAI}
                    />
                  )}
                  {viewMode === "physio" && (
                    <PhysioDashboard
                      currentPatient={currentPatient}
                      isEditable={isEditable}
                      uniqueGasoCols={uniqueGasoCols}
                      patients={patients}
                      activeTab={activeTab}
                      setPatients={setPatients}
                      save={save}

                      // 👇 O botão de Admissão da Fisio (Ligado no modal!)
                      handlePhysioAdmission={() => setShowPhysioModal(true)}

                      // 👇 As calculadoras e ferramentas que estavam faltando:
                      clearDate={clearDate}
                      updateP={updateP}
                      updateNested={updateNested}
                      handleBlurSave={handleBlurSave}
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
                  {viewMode === "nutri" && <NutriDashboard currentPatient={currentPatient} isEditable={isEditable} updateNested={updateNested} handleBlurSave={handleBlurSave} toggleArrayItem={toggleArrayItem} />}
                  {viewMode === "speech" && <SpeechDashboard currentPatient={currentPatient} isEditable={isEditable} updateNested={updateNested} handleBlurSave={handleBlurSave} toggleArrayItem={toggleArrayItem} />}
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
                      
                      // As funções que criamos agora e faltavam:
                      handleNextDayBH={handleNextDayBH} 
                      handlePrintBH={handlePrintBH}
                      updateBH={updateBH} 
                      updateNested={updateNested}
                      setCurrentNoraHour={setCurrentNoraHour} 
                      setCurrentNoraRate={setCurrentNoraRate} 
                      setShowNoraModal={setShowNoraModal} 
                      handleBlurSave={handleBlurSave}
                    />
                  )}
                  {viewMode === "hemodialysis" && <HemoDashboard currentPatient={currentPatient} isEditable={isEditable} updateNested={updateNested} handleBlurSave={handleBlurSave} />}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

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
        handleBlurSave={handleBlurSave}
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
        handleBlurSave={handleBlurSave}
        handleFinalizeNursingAdmission={handleFinalizeNursingAdmission}
      />

      {/* MODAL: ADMISSÃO DE FISIOTERAPIA */}
      <PhysioAdmissionModal
        showPhysioModal={showPhysioModal}
        setShowPhysioModal={setShowPhysioModal}
        activeTab={activeTab}
        physioData={physioData}
        setPhysioData={setPhysioData}
        handleBlurSave={handleBlurSave}
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
        handleBlurSave={handleBlurSave}
        toggleSAPSComorbidade={toggleSAPSComorbidade}
        handleFinalizeAdmission={handleFinalizeAdmission}
      />

      {/* MODAL: TEXTO GERADO PÓS-ADMISSÃO E ENFERMAGEM */}
      <GeneratedAdmissionTextModal
        generatedAdmissionText={generatedAdmissionText}
        setGeneratedAdmissionText={setGeneratedAdmissionText}
        copyToClipboardFallback={copyToClipboardFallback}
      />

      {/* MODAL: FILA DE ESPERA DA UTI */}
      {showQueueModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Fila de Espera: UTI</h3>
                <p className="text-sm text-slate-500">Selecione o paciente para o <b>Leito {selectedBedForAdmission + 1}</b></p>
              </div>
              <button onClick={() => setShowQueueModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">FECHAR</button>
            </div>

            <div className="p-4 max-h-[400px] overflow-y-auto">
              {waitingList.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <p className="italic">Nenhum paciente aguardando vaga na UTI no momento.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {waitingList.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => bindPatientToBed(p)}
                      className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl text-left hover:border-emerald-500 hover:bg-emerald-50 transition-all flex justify-between items-center group"
                    >
                      <div>
                        <p className="font-black text-slate-700 group-hover:text-emerald-700">{p.nome}</p>
                        <p className="text-xs text-slate-500">CPF: {p.cpf} | Origem: {p.origem}</p>
                      </div>
                      <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg">
                        <span className="text-xs font-bold">ADMITIR</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
        handleBlurSave={handleBlurSave}
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
        handleBlurSave={handleBlurSave}
        handleNoraModalResponse={handleNoraModalResponse}
      />

      {/* MODAL: ALERTA DE SEPSE (Sepsis-3) */}
      <SepsisModal
        showSepsisModal={showSepsisModal}
        handleBlurSave={handleBlurSave}
        handleSepsisResponse={handleSepsisResponse}
      />

      {/* MODAL DE DADOS CADASTRAIS (SOMENTE LEITURA) */}
      {showPatientDataModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-popIn">
            <div className="bg-teal-600 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2">
                <User size={20} /> Dados Cadastrais do Paciente
              </h3>
              <button onClick={() => setShowPatientDataModal(false)} className="hover:bg-teal-700 p-1 rounded">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Nome Completo</label>
                  <p className="font-bold text-slate-800 uppercase">{currentPatient.nome}</p>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Data de Nascimento</label>
                  <p className="font-bold text-slate-800">
                    {currentPatient.dataNascimento ? currentPatient.dataNascimento.split('-').reverse().join('/') : "-"}
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Idade Atual</label>
                  <p className="font-bold text-slate-800">{currentPatient.dataNascimento ? `${calculateAge(currentPatient.dataNascimento)} anos` : "-"}</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Sexo</label>
                  <p className="font-bold text-slate-800">{currentPatient.sexo === "M" ? "Masculino" : currentPatient.sexo === "F" ? "Feminino" : "-"}</p>
                </div>

                <div className="col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Procedência/Origem</label>
                  <p className="font-bold text-slate-800">{currentPatient.procedencia || "Não informada"}</p>
                </div>
              </div>

              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 mt-4">
                <p className="text-[11px] text-amber-700 font-medium leading-relaxed italic">
                  * Estes dados foram importados da Recepção/Fila de Espera. Para alterações cadastrais críticas, consulte a Recepção.
                </p>
              </div>
              
              <button 
                onClick={() => setShowPatientDataModal(false)}
                className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl mt-2 hover:bg-slate-900 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ModuloUTI;