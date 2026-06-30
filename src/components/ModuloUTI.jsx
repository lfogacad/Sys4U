import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { doc, setDoc, getDocs, deleteDoc, collection, addDoc, arrayUnion, 
         onSnapshot, query, where, updateDoc, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  Stethoscope, HeartPulse, Brain, Wind, Utensils, Apple,
  Droplets, Syringe, Pill, Thermometer, Scale, Gauge, Move,
  Activity, ClipboardCheck, FileText, FileCheck, Target, ShieldAlert,
  Printer, Bot, BrainCircuit, Sparkles, Mic, Table, UploadCloud,
  FolderInput, List, Copy, User, Search, ArrowLeft, X, PlusCircle,
  Edit3, Trash2, Check, CheckCircle, AlertCircle, AlertTriangle,
  Loader2, ChevronRight, ChevronDown, Clock, RotateCcw, Filter,
  CalendarX, UserPlus, LogOut, ArrowRightLeft, Ambulance, Save
} from "lucide-react";

import {
  getManausDateStr, formatDateDDMM, getLast10Days, calculateTotals,
  safeNumber, defaultPatient, ensureBHStructure, calculateAge,
  getDaysD0, getDaysD1, getTempoVMText, getTempoVMNumber,calculateEvacDays,
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
import PsychologyDashboard from '../features/psychology/PsychologyDashboard';
import HemoDashboard from '../features/hemo/HemoDashboard';
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
import NutriAdmissionModal from './modals/NutriAdmissionModal';

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

  // --- MOTOR DE TEMPO DA UTI ---
  
  // 1. O "Hoje" da UTI vai das 07:00 de um dia até as 06:59 do dia seguinte.
  const getLogicalDate = () => {
    const now = new Date();
    if (now.getHours() < 7) {
      now.setDate(now.getDate() - 1); // Ex: Se for 05:00 do dia 05/05, ainda pertence ao plantão do dia 04/05
    }
    return now.toISOString().split('T')[0]; // Retorna 'YYYY-MM-DD'
  };

  // 2. Trava de Segurança das 08:00
  // Adicionamos o 'unlockedDates' como parâmetro para verificar se o dia foi liberado na sessão
const checkIsBHBlocked = (bhDateStr, unlockedDates = []) => {
  if (!bhDateStr) return false;
  if (unlockedDates.includes(bhDateStr)) return false; // 🛡️ A MÁGICA: Se estiver destravado, libera a edição
  
  const logicalToday = getLogicalDate();
  if (bhDateStr === logicalToday) return false; 

  const now = new Date();
  const blockTime = new Date(bhDateStr + 'T08:00:00');
  blockTime.setDate(blockTime.getDate() + 1); 

  return now >= blockTime;
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

  const localEditRef = useRef(false);

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
  
  const leitosDisponiveis = useMemo(() => {
    return ['1','2','3','4','5','6','7','8','9','10'];
  }, []);

  const pacientesPorLeito = useMemo(() => {
    const mapa = {};
    patients.forEach(p => {
      if (p.nome) { // 🔥 SÓ MApeia se tiver nome (paciente real)
        mapa[String(p.leito)] = p;
      }
    });
    return mapa;
  }, [patients]);

  const [showSepsisModal, setShowSepsisModal] = useState(false);

  const [admissionData, setAdmissionData] = useState({});
  const [generatedAdmissionText, setGeneratedAdmissionText] = useState("");
  const [nursingData, setNursingData] = useState({});
  const [physioData, setPhysioData] = useState({});
  const [generatedPhysioText, setGeneratedPhysioText] = useState("");

  const [showNutriAdmissionModal, setShowNutriAdmissionModal] = useState(false);
  const [nutriAdmissionData, setNutriAdmissionData] = useState({});

  // Para o Modal de Noradrenalina
  const [showNoraModal, setShowNoraModal] = useState(false);
  const [currentNoraHour, setCurrentNoraHour] = useState("");
  const [currentNoraRate, setCurrentNoraRate] = useState("");

  const [selectedBHDate, setSelectedBHDate] = useState(getLogicalDate());

  // Para a Troca de Senha
  const [showForceChangePassword, setShowForceChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changePasswordError, setChangePasswordError] = useState("");

  const [showPatientDataModal, setShowPatientDataModal] = useState(false);

  const [isReadOnly, setIsReadOnly] = useState(false);

  const [isNutriReadOnly, setIsNutriReadOnly] = useState(false);
  
  const rawPatient = patients[activeTab] || defaultPatient(0);
  const currentPatient = ensureBHStructure(rawPatient);
  const displayedBH = viewingPreviousBH && currentPatient.bh_previous ? currentPatient.bh_previous : currentPatient.bh;
  const bhTotals = calculateTotals(displayedBH, currentPatient.nutri?.peso);

  // --- ESTADOS DA FILA DE ESPERA ---
  const [waitingList, setWaitingList] = useState([]);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [selectedBedForAdmission, setSelectedBedForAdmission] = useState(null);

  // --- ESTADOS DO MODAL DE DESFECHO (ALTA/ÓBITO) ---
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [dischargeDestination, setDischargeDestination] = useState("");
  const [isDischarging, setIsDischarging] = useState(false);

  const [listaEventosAdversos, setListaEventosAdversos] = useState([]);
  const [eventoSelecionado, setEventoSelecionado] = useState(null);
  const [formEvento, setFormEvento] = useState({
    leito: '',
    dataHora: '',
    relato: '',
    grauDano: '',
    acoesImediatas: '',
    impactoPaciente: ''
  });

  const [modalCarrinhoAberto, setModalCarrinhoAberto] = useState(false);
  const [formCarrinho, setFormCarrinho] = useState({
    horario: '',
    carrinhoNumero: '1',
    lacreCarrinho: '',
    lacreCaixa: '',
    laringoscopio: '',
    cardioversor: '',
    gelCondutor: '',
    tabua: ''
  });
  const [salvandoCarrinho, setSalvandoCarrinho] = useState(false);

  const [listaCarrinhoEMG, setListaCarrinhoEMG] = useState([]);
  const [mesFiltroCarrinhoEMG, setMesFiltroCarrinhoEMG] = useState(new Date().toISOString().slice(0, 7));
  const [loadingCarrinhoEMG, setLoadingCarrinhoEMG] = useState(false);
  const [modalDetalheCarrinho, setModalDetalheCarrinho] = useState({ isOpen: false, dia: '', registros: [] });
  const [temCarrinhoEMGHoje, setTemCarrinhoEMGHoje] = useState(false);

  const [leitosConfig, setLeitosConfig] = useState([]);

  // Guarda os pacientes internados para o modal de eventos cruzar os dados
  const [listaCenso, setListaCenso] = useState([]);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  // ESTADOS DA GESTÃO DE RISCO (NSP)
  const [abaRiscoAtiva, setAbaRiscoAtiva] = useState('eventos'); // 'eventos' ou 'escalas'
  const [formInvestigacao, setFormInvestigacao] = useState({
    prontuario: '',
    faseCuidado: '',
    fatoresContribuintes: '',
    medidasPreventivas: '',
    statusAnalise: 'Em Análise'
  });

  const [modalTrocaLeito, setModalTrocaLeito] = useState({
    isOpen: false,
    novoLeito: ''
  });

  // State para guardar quais dias foram destravados nesta sessão
  const [unlockedBHDates, setUnlockedBHDates] = useState([]);

  // A Função do Auditor (Botão de Destravar)
  const handleUnlockHistoricalBH = async (dateStr, reason) => {
    // 1. Libera visualmente na tela instantaneamente
    setUnlockedBHDates(prev => [...prev, dateStr]);

    // 2. Registra na Caixa Preta (Firebase)
    try {
      let idBruto = currentPatient.id !== undefined ? currentPatient.id : currentPatient.leito;
      const apenasNumero = String(idBruto).replace(/bed_/g, "");
      const docId = `bed_${apenasNumero === "0" ? "1" : apenasNumero}`;
      const leitoRef = doc(db, "leitos_uti", docId);

      // O "Documento Legal" da alteração local
      const auditLog = {
        dataAcao: new Date().toISOString(),
        dataBHAlterado: dateStr,
        usuario: userProfile?.nome || user?.email || "Usuário",
        perfil: userProfile?.perfil || "Desconhecido",
        justificativa: reason,
        tipo: "DESTRAVAMENTO_BH_RETROATIVO"
      };

      // Injeta o log dentro de um array específico de auditoria no paciente
      await updateDoc(leitoRef, {
        auditoria_seguranca: arrayUnion(auditLog)
      });

      // Também aciona o seu log de atividades normal
      handleBlurSave(`AUDITORIA: ${userProfile?.nome} destravou o BH arquivado do dia ${dateStr}. Motivo: ${reason}`);

      // =========================================================================
      // 💡 AUDITORIA GLOBAL: O "X-9" reporta a alteração retroativa à central
      // =========================================================================
      if (typeof registrarLogAuditoria === "function") {
        registrarLogAuditoria(
          "BALANÇO HÍDRICO: DESTRAVAMENTO RETROATIVO (ALERTA)", 
          `Data destravada: ${dateStr} | Justificativa: ${reason}`, 
          `Leito ${apenasNumero === "0" ? "1" : apenasNumero}`, 
          currentPatient.nome
        );
      }

    } catch (error) {
      console.error("Erro ao registrar auditoria de destravamento:", error);
    }
  };

  // Função para Trancar Manualmente
  const handleLockHistoricalBH = () => {
    setUnlockedBHDates(prev => prev.filter(date => date !== selectedBHDate));
    handleBlurSave(`AUDITORIA: ${userProfile?.nome || "Usuário"} encerrou a edição retroativa do BH e trancou o prontuário.`);
    
    // =========================================================================
    // 💡 AUDITORIA GLOBAL: Registo do fecho da edição retroativa
    // =========================================================================
    if (typeof registrarLogAuditoria === "function") {
      let idBruto = currentPatient.id !== undefined ? currentPatient.id : currentPatient.leito;
      const apenasNumero = String(idBruto).replace(/bed_/g, "");
      
      registrarLogAuditoria(
        "BALANÇO HÍDRICO: RETRAVAMENTO", 
        `Edição retroativa encerrada para a data: ${selectedBHDate}.`, 
        `Leito ${apenasNumero === "0" ? "1" : apenasNumero}`, 
        currentPatient.nome
      );
    }
  };

  // O Vigia Silencioso: Se mudar de data ou de paciente (activeTab), tranca tudo automaticamente
  useEffect(() => {
    setUnlockedBHDates([]);
  }, [selectedBHDate, activeTab]);

 const handleSyncGasometriaAdmissao = (dadosAtualizados) => {
    // 1. Verifica se há algum valor clínico de gasometria digitado
    const chavesGaso = ["gaso_pH", "gaso_pCO2", "gaso_PaO2", "gaso_BE", "gaso_HCO3", "gaso_SatO2", "gaso_FiO2", "gaso_PF"];
    const temDadoPreenchido = chavesGaso.some(chave => dadosAtualizados[chave] && dadosAtualizados[chave].trim() !== "");

    // 2. A REGRA DE OURO: Se tem dado preenchido, a hora é obrigatória!
    if (temDadoPreenchido && !dadosAtualizados.gasoHora) {
      alert("⚠️ Atenção Fisio: O Horário da Gasometria é OBRIGATÓRIO para que os valores sejam salvos na tabela.");
      return; // Bloqueia a sincronização e não salva nada pela metade
    }

    // Se a aba estiver completamente em branco (sem dados e sem hora), apenas ignoramos silenciosamente
    if (!temDadoPreenchido && !dadosAtualizados.gasoHora) return;

    const nomeColuna = `Admissão ${dadosAtualizados.gasoHora}`;
    let pacienteAtualizado = null;

    setPatients(prev => {
      const up = [...prev];
      const p = JSON.parse(JSON.stringify(up[activeTab])); 
      
      if (!p.gasometriaHistory) p.gasometriaHistory = {};
      if (!p.customGasometriaCols) p.customGasometriaCols = [];

      // Limpa colunas de admissão antigas (caso ele corrija o horário depois)
      const colunasAntigas = p.customGasometriaCols.filter(c => c.startsWith("Admissão"));
      colunasAntigas.forEach(antiga => {
        if (antiga !== nomeColuna) {
          if (p.gasometriaHistory[antiga]) {
            p.gasometriaHistory[nomeColuna] = { ...p.gasometriaHistory[antiga] };
          }
          delete p.gasometriaHistory[antiga];
        }
      });
      p.customGasometriaCols = p.customGasometriaCols.filter(c => !c.startsWith("Admissão"));
      
      // Adiciona a coluna com a hora correta
      p.customGasometriaCols.push(nomeColuna);
      if (!p.gasometriaHistory[nomeColuna]) p.gasometriaHistory[nomeColuna] = {};

      const mapaParametros = [
        {id: "gaso_pH", label: "pH"}, {id: "gaso_pCO2", label: "pCO2"}, 
        {id: "gaso_PaO2", label: "PaO2"}, {id: "gaso_BE", label: "BE"}, 
        {id: "gaso_HCO3", label: "HCO3"}, {id: "gaso_SatO2", label: "SatO2"}, 
        {id: "gaso_FiO2", label: "FiO2"}, {id: "gaso_PF", label: "P/F"}
      ];

      mapaParametros.forEach(param => {
        if (dadosAtualizados[param.id] !== undefined) {
          p.gasometriaHistory[nomeColuna][param.label] = dadosAtualizados[param.id];
        }
      });

      up[activeTab] = p;
      pacienteAtualizado = p; 
      return up;
    });

    if (typeof save === 'function' && pacienteAtualizado) {
      save(pacienteAtualizado, `Fisioterapia: Sincronizou Gasometria de ${nomeColuna}`);
    } else if (typeof handleBlurSave === 'function') {
      setTimeout(() => {
        handleBlurSave(`Fisioterapia: Sincronizou Gasometria de ${nomeColuna}`);
      }, 300);
    }
  };

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

        // Proteção caso a IA falhe e retorne nulo
        if (!json) throw new Error("Falha ao analisar o texto do exame com a IA.");

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
            // Fazemos uma cópia profunda para não mutar o estado diretamente
            const target = JSON.parse(JSON.stringify(list[matchIdx]));
            
            // 🔥 CORREÇÃO PRINCIPAL: Cria a gaveta principal se ela não existir
            if (!target.examHistory) target.examHistory = {}; 
            if (!target.examHistory[date]) target.examHistory[date] = {};

            Object.keys(json.results || {}).forEach((k) => {
              if (json.results[k]) {
                target.examHistory[date][k] = json.results[k];
              }
            });

            const finalTarget = syncLabsFromHistory(target);
            list[matchIdx] = finalTarget;

            // Salva no banco de dados com proteção no ID
            if (typeof user !== 'undefined' && typeof db !== 'undefined') {
              const docId = String(finalTarget.id).startsWith("bed_") ? finalTarget.id : `bed_${finalTarget.id}`;
              setDoc(doc(db, "leitos_uti", docId), finalTarget);
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
        console.error(`Erro ao processar ${file.name}:`, e);
        setBulkProgress((prev) => {
          const n = [...prev];
          // 🔥 CORREÇÃO: Agora ele mostra o motivo real do erro na tela!
          n[fileIndex] = { status: "error", msg: `❌ Erro: ${e.message}` };
          return n;
        });
      }
    });

    await Promise.all(promessasDeLeitura);
    setIsProcessingBulk(false);
  };

  const salvarNotificacaoEvento = async () => {
    // Validação agora exige o leito
    if (!formEvento.leito || !formEvento.dataHora || !formEvento.relato || !formEvento.grauDano || !formEvento.acoesImediatas || !formEvento.impactoPaciente) {
      alert("Por favor, preencha todos os campos obrigatórios (incluindo o Leito) para enviar a notificação.");
      return;
    }

    // 1. BUSCA O PACIENTE NO CENSO ATUAL
    // Transforma o valor do select ("01") em número puro ("1") para procurar o documento correto
    const leitoSelecionadoLimpo = parseInt(formEvento.leito, 10).toString(); 
    
    // Busca o paciente internado no momento
    const pacienteAtual = (listaCenso || []).find(p => 
      p.id === `bed_${leitoSelecionadoLimpo}` || 
      p.leito === formEvento.leito
    ) || null;

    // Função auxiliar para pegar as iniciais do paciente (Ex: João Silva Costa -> JSC)
    const extrairIniciais = (nomeCompleto) => {
      if (!nomeCompleto) return "";
      return nomeCompleto.split(' ').map(n => n[0]).join('').substring(0, 3).toUpperCase();
    };

    // ======================================================
    // 2. MONTANDO O PACOTE DE DADOS PADRÃO ANVISA/CCIH
    // ======================================================
    const payloadNotificacao = {
      // --- Identificação da Instituição ---
      cnes: "2494299",
      instituicao: "Hospital Municipal de Ariquemes",
      localizacao: "Ariquemes/RO",

      // --- Características do Paciente (Puxa do Censo automaticamente) ---
      leitoOcorrencia: formEvento.leito,
      pacienteIniciais: extrairIniciais(pacienteAtual?.nome), 
      pacienteDataNascimento: pacienteAtual?.dataNascimento || "",
      pacienteSexo: pacienteAtual?.sexo || "",
      pacienteRaca: pacienteAtual?.raca || "",
      
      // --- Registros Clínicos ---
      prontuario: pacienteAtual?.prontuario || "", 
      diagnosticoPrincipal: pacienteAtual?.diagnostico || "",

      // --- Detalhes do Incidente ---
      dataHoraOcorrencia: formEvento.dataHora,
      dataDeteccao: new Date().toISOString(), // Hora exata do clique
      setor: "UTI Geral",
      faseCuidado: "", // CCIH preencherá depois
      tipoEvento: eventoSelecionado,
      relatoIncidente: formEvento.relato,

      // --- Consequências para o Paciente ---
      impactoGerado: formEvento.impactoPaciente,
      grauDano: formEvento.grauDano,

      // --- Ações e Prevenção ---
      acoesImediatas: formEvento.acoesImediatas,
      medidasPreventivas: "", // CCIH preencherá depois
      fatoresContribuintes: "", // CCIH preencherá depois

      // --- Metadados do Sistema ---
      statusAnalise: "Pendente NSP",
      notificadoPor: "Profissional Assistencial" 
    };

    // ======================================================
    // 3. ENVIANDO PARA O FIREBASE
    // ======================================================
    try {
      await addDoc(collection(db, "eventos_adversos"), payloadNotificacao);
      
      console.log("📝 Evento Registrado com Sucesso:", payloadNotificacao);
      alert("Notificação enviada com sucesso ao Núcleo de Gestão de Risco. Agradecemos o compromisso com a segurança do paciente.");
      
      // Reseta o formulário
      setFormEvento({ leito: '', dataHora: '', relato: '', grauDano: '', acoesImediatas: '', impactoPaciente: '' });
      setEventoSelecionado(null);
      setIsEventModalOpen(false);

    } catch (error) {
      console.error("❌ Erro ao salvar notificação:", error);
      alert("Erro ao conectar com o banco de dados. Tente novamente.");
    }
  };

  // ==========================================
  // OLHEIRO DE EVENTOS ADVERSOS (QUALIDADE)
  // ==========================================
  useEffect(() => {
    if (!db) return;
    
    // Busca todos os eventos adversos na nuvem
    const q = collection(db, "eventos_adversos");
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setListaEventosAdversos(eventos);
      console.log(`📊 Indicadores de Segurança atualizados: ${eventos.length} eventos lidos.`);
    });

    // Limpa a escuta quando o componente for fechado
    return () => unsubscribe();
  }, [db]); // Importante: adicionamos db como dependência para segurança

  // --- SINCRONIZAÇÃO DOS LEITOS COM O FIREBASE ---
  useEffect(() => {
    if (!db) return;

    const q = collection(db, "leitos_uti");

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreBeds = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      firestoreBeds.sort((a, b) => {
        const numA = parseInt(a.id.replace('bed_', ''));
        const numB = parseInt(b.id.replace('bed_', ''));
        return numA - numB;
      });

      const updatedPatients = firestoreBeds.map(bedData => {
        const index = parseInt(bedData.id.replace('bed_', '')) - 1;
        return mergePatientData(defaultPatient(index), bedData);
      });

      console.log("Leitos sincronizados dinamicamente!");
      setPatients(prev => {
        if (localEditRef.current) {
          return prev;
        }
        return updatedPatients;
      });
    });

    return () => unsubscribe();
  }, []);

  // BUSCA OS PACIENTES INTERNADOS (Para auto-preencher as notificações)
  useEffect(() => {
    const carregarCenso = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "leitos_uti"));
        const pacientesTemp = [];
        
        querySnapshot.forEach((doc) => {
          pacientesTemp.push({ id: doc.id, ...doc.data() });
        });
        
        setListaCenso(pacientesTemp);
      } catch (error) {
        console.error("Erro ao carregar o censo para notificações:", error);
      }
    };

    carregarCenso();
  }, []);

  // BUSCA OS EVENTOS ADVERSOS NO FIREBASE
  useEffect(() => {
    if (viewMode === 'auditoria') { // Só busca se o usuário abrir a tela de Gestão de Risco
      const carregarEventos = async () => {
        try {
          const querySnapshot = await getDocs(collection(db, "eventos_adversos"));
          const eventosTemp = [];
          querySnapshot.forEach((doc) => {
            eventosTemp.push({ id: doc.id, ...doc.data() });
          });
          // Ordena dos mais recentes para os mais antigos
          eventosTemp.sort((a, b) => new Date(b.dataHoraOcorrencia) - new Date(a.dataHoraOcorrencia));
          setListaEventos(eventosTemp);
        } catch (error) {
          console.error("Erro ao carregar eventos adversos:", error);
        }
      };
      carregarEventos();
    }
  }, [viewMode]);

  // Sincroniza Carrinho de EMG (por mês selecionado)
  useEffect(() => {
    if (!db || !mesFiltroCarrinhoEMG) return;
    
    const fetchCarrinhoEMG = async () => {
      setLoadingCarrinhoEMG(true);
      try {
        const [ano, mes] = mesFiltroCarrinhoEMG.split('-');
        const primeiroDia = `${mesFiltroCarrinhoEMG}-01`;
        const ultimoDia = new Date(Number(ano), Number(mes), 0);
        const ultimoDiaStr = `${mesFiltroCarrinhoEMG}-${String(ultimoDia.getDate()).padStart(2, '0')}`;
        
        const q = query(
          collection(db, "carrinho_emg"),
          where("data", ">=", primeiroDia),
          where("data", "<=", ultimoDiaStr)
        );
        
        const snapshot = await getDocs(q);
        const dados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setListaCarrinhoEMG(dados);
      } catch (error) {
        console.error("Erro ao buscar carrinho_emg:", error);
      } finally {
        setLoadingCarrinhoEMG(false);
      }
    };
    
    fetchCarrinhoEMG();
  }, [mesFiltroCarrinhoEMG, db]);

  // Verifica se há carrinho EMG preenchido hoje (para bloquear evolução IA)
  useEffect(() => {
    if (!db) return;
    const hoje = new Date().toISOString().split('T')[0];
    const checkCarrinhoHoje = async () => {
      try {
        const snapshot = await getDocs(
          query(
            collection(db, "carrinho_emg"),
            where("data", "==", hoje)
          )
        );
        setTemCarrinhoEMGHoje(snapshot.docs.length > 0);
      } catch (e) {
        console.warn("Erro ao verificar carrinho EMG:", e);
        setTemCarrinhoEMGHoje(true); // Se falhar, libera (não bloquear)
      }
    };
    checkCarrinhoHoje();
  }, [db, currentPatient?.nome]); // Recarrega se mudar de paciente

  // Busca configuração dos leitos para bloquear botão de Puxar Paciente
  useEffect(() => {
    if (!db) return;
    const unsubscribe = onSnapshot(collection(db, "leitos_uti"), (snapshot) => {
      const dados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLeitosConfig(dados);
    }, (error) => {
      console.error("Erro ao buscar leitos_uti:", error);
    });
    return () => unsubscribe();
  }, [db]);

  // ==============================================================
  // AUTOMAÇÃO DO BALANÇO HÍDRICO (O "Capataz" das 07h00)
  // ==============================================================
  useEffect(() => {
    const automatizarFechamentoBH = async () => {
      // Evita rodar se os dados ainda não carregaram
      if (!db || !currentPatient || !currentPatient.bh || !currentPatient.bh.date) return;

      const logicalToday = getLogicalDate();
      const currentBHDate = currentPatient.bh.date;

      // Comparação de Strings (Ex: "2026-05-03" < "2026-05-04")
      // Se a data do BH atual for menor que o dia lógico de hoje, o plantão virou.
      if (currentBHDate < logicalToday) {
        console.log(`[SYS4U] Virada de plantão detectada. Arquivando BH do dia ${currentBHDate} para o Leito ${currentPatient.leito}`);

        // 1. Resgata o histórico antigo para não perder nada
        const historicoAntigo = currentPatient.historico_bh || [];

        // 2. Calcula o saldo acumulado que será herdado para o novo dia
        // Soma o acumulado prévio com o balanço de 24h do dia que está sendo fechado
        const saldoAnterior = parseFloat(currentPatient.bh.accumulated) || 0;
        // Nota: Se o senhor tiver o valor exato do balanço 24h salvo no Firebase, pode somar aqui. 
        // Caso contrário, ele herda o que foi digitado no campo "BH Ant."

        // 3. Cria a "Folha em Branco" para o plantão de hoje
        const novoBHzero = {
          date: logicalToday,
          gains: {},
          losses: {},
          vitals: {},
          irrigation: {},
          customGains: currentPatient.bh.customGains || [], // Mantém os itens customizados criados pela equipe
          customLosses: currentPatient.bh.customLosses || [],
          accumulated: saldoAnterior, 
          insensibleLoss: 0
        };

        // 4. Salva no Banco de Dados (Transação Blindada)
        try {
          let idBruto = currentPatient.id !== undefined ? currentPatient.id : currentPatient.leito;
          const apenasNumero = String(idBruto).replace(/bed_/g, "");
          const docId = `bed_${apenasNumero === "0" ? "1" : apenasNumero}`;
          const leitoRef = doc(db, "leitos_uti", docId);

          await updateDoc(leitoRef, {
            // Empurra o BH antigo para o cofre do histórico
            historico_bh: [...historicoAntigo, currentPatient.bh],
            // Substitui o BH atual pela folha em branco
            bh: novoBHzero
          });

          console.log(`[SYS4U] BH do leito ${currentPatient.leito} virado para ${logicalToday} com sucesso.`);
        } catch (error) {
          console.error("[SYS4U] Erro crítico ao automatizar fechamento do BH:", error);
        }
      }
    };

    // Roda a verificação toda vez que o paciente mudar ou o componente montar
    automatizarFechamentoBH();
  }, [currentPatient, db]); // Remova o getLogicalDate das dependências se ele estiver definido fora do componente ou use useCallback

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

  // ==============================================================
  // MOTOR DE ORDENAÇÃO DE GASOMETRIA
  // ==============================================================
  const parseDateForSort = (str) => {
    if (!str) return 0;
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split('-');
      return new Date(y, m - 1, d, 0, 0).getTime();
    }
    const dMatch = str.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (dMatch) {
      const day = parseInt(dMatch[1], 10);
      const month = parseInt(dMatch[2], 10) - 1;
      let year = dMatch[3] ? (dMatch[3].length === 2 ? 2000 + parseInt(dMatch[3], 10) : parseInt(dMatch[3], 10)) : new Date().getFullYear();
      let hour = 0, min = 0;
      const tMatch = str.match(/(?:-|\s|às)\s*(\d{1,2})(?:[hH:](\d{2})?)?/i);
      if (tMatch) {
        hour = parseInt(tMatch[1], 10);
        min = tMatch[2] ? parseInt(tMatch[2], 10) : 0;
      }
      return new Date(year, month, day, hour, min).getTime();
    }
    return 0;
  };

  const gasoCols = [...Object.keys(currentPatient.gasometriaHistory || {}), ...(currentPatient.customGasometriaCols || [])];
  const uniqueGasoCols = [...new Set(gasoCols)].sort((a, b) => parseDateForSort(b) - parseDateForSort(a));

  // --- FUNÇÕES DE PERSISTÊNCIA ---
  const save = async (updatedPatient, logMsg = "Alteração no Prontuário") => {
    if (!db || !updatedPatient) return;

    // SUTURA DE SEGURANÇA: Esterilizando o payload
    const pacienteSeguro = JSON.parse(JSON.stringify(updatedPatient));

    try {
      // Normalização do ID
      let idBruto = pacienteSeguro.id !== undefined ? pacienteSeguro.id : pacienteSeguro.leito;
      const apenasNumero = String(idBruto).replace(/bed_/g, "");
      let numeroFinal = apenasNumero;
      if (numeroFinal === "0") numeroFinal = "1"; 

      const docId = `bed_${numeroFinal}`;
      
      // Grava no Prontuário Físico (Leito Atual)
      await setDoc(doc(db, "leitos_uti", docId), pacienteSeguro, { merge: true });
      
      // =========================================================
      // 🚨 O PULO DO GATO: ESPELHAMENTO GLOBAL DE CULTURAS (CCIH)
      // =========================================================
      if (pacienteSeguro.culturas && Array.isArray(pacienteSeguro.culturas.lista)) {
        pacienteSeguro.culturas.lista.forEach(async (cultura) => {
           // Grava apenas culturas reais que possuam ID
           if (cultura.id && cultura.tipo) {
             const culturaGlobal = {
               ...cultura,
               pacienteId: pacienteSeguro.id || docId,
               pacienteNome: pacienteSeguro.nome || "Desconhecido",
               leito: numeroFinal
             };
             // Grava na coleção 'imortal' da CCIH (nunca apagada na alta)
             await setDoc(doc(db, "culturas_globais", cultura.id), culturaGlobal, { merge: true });
           }
        });
      }
      // =========================================================

      console.log(`[AUDITORIA]: ${logMsg} no documento ${docId}`);
    } catch (err) { 
      console.error("Erro fatal ao salvar no Firebase:", err);
      alert("Aviso: Ocorreu um erro ao gravar na nuvem. Verifique o console.");
    }
  };

  const updateNested = (categoria, campo, valor) => {
    setPatients(prev => {
      const novosPacientes = [...prev];
      const pacienteAlvo = JSON.parse(JSON.stringify(novosPacientes[activeTab])); 
      
      if (!pacienteAlvo[categoria]) pacienteAlvo[categoria] = {};
      pacienteAlvo[categoria][campo] = valor;

      // 🔄 SINCRONIZAÇÃO DE MÃO DUPLA (SHILEY <-> HEMODIÁLISE)
      
      // 1. Sincroniza a Data de Inserção
      if (categoria === "enfermagem" && campo === "shileyData") {
        if (!pacienteAlvo["hd_acesso"]) pacienteAlvo["hd_acesso"] = {};
        pacienteAlvo["hd_acesso"]["insercao"] = valor;
      } else if (categoria === "hd_acesso" && campo === "insercao") {
        if (!pacienteAlvo["enfermagem"]) pacienteAlvo["enfermagem"] = {};
        pacienteAlvo["enfermagem"]["shileyData"] = valor;
      }

      // 2. Sincroniza o Local do Catéter
      if (categoria === "enfermagem" && campo === "shileyLocal") {
        if (!pacienteAlvo["hd_acesso"]) pacienteAlvo["hd_acesso"] = {};
        pacienteAlvo["hd_acesso"]["cateter_local"] = valor;
      } else if (categoria === "hd_acesso" && campo === "cateter_local") {
        if (!pacienteAlvo["enfermagem"]) pacienteAlvo["enfermagem"] = {};
        pacienteAlvo["enfermagem"]["shileyLocal"] = valor;
      }
      
      novosPacientes[activeTab] = pacienteAlvo;
      
      if (typeof save === 'function') {
        save(pacienteAlvo, `Atualização Automática: ${categoria} > ${campo}`);
      }
      
      return novosPacientes;
    });
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
      const bedIndex = selectedBedForAdmission; // Para o computador, Leito 1 = 0

      const newPatientRecord = {
        ...defaultPatient(bedIndex),
        id: `bed_${bedIndex + 1}`,
        nome: patientFromQueue.nome,
        cpf: patientFromQueue.cpf,
        dataNascimento: patientFromQueue.dataNascimento,
        sexo: patientFromQueue.sexo,
        dataInternacao: getManausDateStr(),
        procedencia: patientFromQueue.origem || "Recepção",
        statusInternacao: "Aguardando Admissão Médica",
        
        // 💡 VASSOURA DE ESCALAS: Garante que as escalas venham limpas
        enfermagem: {
          bradenResult: "",
          morseResult: "",
          nrsResult: "",
          // O resto da enfermagem pode ficar vazio ou ser adicionado conforme necessidade
        },
        // 💡 VASSOURA DO SAPS 3 (Se já preenchido anteriormente, apaga)
        saps3: {
          score: "",
          lockedProb: "",
          comorbidades: []
        }
      };

      // 1. Salva no Firebase (AQUI ENTRA O + 1: bed_0 vira bed_1)
      await setDoc(doc(db, "leitos_uti", `bed_${bedIndex + 1}`), newPatientRecord);

      // 2. Atualiza a tela (React) na mesma hora! (Aqui continua sem o + 1)
      const up = [...patients];
      up[bedIndex] = newPatientRecord;
      setPatients(up);

      // 3. Remove o paciente da Fila de Espera (Avisando o número real do leito)
      await updateDoc(doc(db, "fila_espera", patientFromQueue.id), {
        status: "internado",
        leitoAtribuido: bedIndex + 1, // <--- Ajustado aqui também para o histórico da recepção
        dataInternada: serverTimestamp()
      });

      // =========================================================================
      // 💡 4. AUDITORIA: Registra quem efetivou a ocupação do leito
      // =========================================================================
      if (typeof registrarLogAuditoria === "function") {
        registrarLogAuditoria(
          "VINCULAÇÃO DE LEITO / ADMISSÃO", 
          `Paciente puxado da fila de espera. Procedência: ${patientFromQueue.origem || "Não informada"}.`, 
          `Leito ${bedIndex + 1}`, 
          patientFromQueue.nome
        );
      }

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

  const salvarCarrinhoEMG = async () => {
    if (!formCarrinho.horario) {
      alert('Selecione o horário da verificação.');
      return;
    }

    setSalvandoCarrinho(true);

    try {
      const hoje = new Date().toISOString().split('T')[0];
      const registro = {
        data: hoje,
        horario: formCarrinho.horario,
        carrinhoNumero: formCarrinho.carrinhoNumero || '1',
        lacreCarrinho: formCarrinho.lacreCarrinho || '',
        lacreCaixa: formCarrinho.lacreCaixa || '',
        laringoscopio: formCarrinho.laringoscopio || '',
        cardioversor: formCarrinho.cardioversor || '',
        gelCondutor: formCarrinho.gelCondutor || '',
        tabua: formCarrinho.tabua || '',
        preenchidoPor: userProfile?.nome || 'Não identificado',
        criadoEm: new Date()
      };

      await addDoc(collection(db, "carrinho_emg"), registro);

      handleBlurSave(`Carrinho EMG: Verificação às ${formCarrinho.horario} por ${userProfile?.nome || 'N/I'}`);

      setModalCarrinhoAberto(false);
      setFormCarrinho({
        horario: '',
        carrinhoNumero: '1',
        lacreCarrinho: '',
        lacreCaixa: '',
        laringoscopio: '',
        cardioversor: '',
        gelCondutor: '',
        tabua: ''
      });
    } catch (error) {
      console.error("Erro ao salvar carrinho:", error);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setSalvandoCarrinho(false);
    }
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

  const addAntibiotic = () => {
    setPatients(prev => {
      const up = [...prev];
      const p = JSON.parse(JSON.stringify(up[activeTab]));
      
      if (!p.antibiotics) p.antibiotics = [];
      p.antibiotics.push({ name: "", date: "", locked: false });
      
      up[activeTab] = p;

      // 🚨 SALVAMENTO DIRETO: Salva no Firebase a versão exata com a nova linha
      if (typeof save === 'function') {
        save(p, "Médico: Adicionou nova linha de ATB");
      }
      
      return up;
    });
  };

  const removeAntibiotic = (indexToRemove) => {
    setPatients(prev => {
      const up = [...prev];
      const p = JSON.parse(JSON.stringify(up[activeTab]));
      
      // Remove o item apenas se ele existir e for além dos 3 primeiros (índice 0, 1 e 2)
      if (p.antibiotics && p.antibiotics.length > indexToRemove && indexToRemove >= 3) {
        p.antibiotics.splice(indexToRemove, 1);
      }
      
      up[activeTab] = p;

      // 🚨 SALVAMENTO DIRETO: Salva no Firebase a versão sem a linha
      if (typeof save === 'function') {
        save(p, "Médico: Removeu linha de ATB extra");
      }
      
      return up;
    });
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
    setPatients((curr) => {
      const up = [...curr];
      // 1. Fazemos uma cópia profunda para não mutar o estado diretamente
      const p = JSON.parse(JSON.stringify(up[activeTab]));
      
      // 2. Garante que as gavetas existem
      if (!p.examHistory) p.examHistory = {};
      if (!p.examHistory[date]) p.examHistory[date] = {};
      
      // 3. Se o valor for vazio, deletamos a chave para manter o banco limpo
      if (value === "" || value === null) {
        delete p.examHistory[date][exam];
      } else {
        p.examHistory[date][exam] = value;
      }
      
      // 4. Sincroniza as colunas (today, yesterday, dayBefore)
      up[activeTab] = syncLabsFromHistory(p);
      
      // Retorna a lista atualizada para a tela
      return up;
    });
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

    const replaceAntibiotics = (newArray) => {
    setPatients(prev => {
      const up = [...prev];
      const p = JSON.parse(JSON.stringify(up[activeTab])); // Cópia profunda segura
      p.antibiotics = newArray; // Substitui a lista inteira
      up[activeTab] = p;
      return up;
    });
    // O salvamento no Firebase será chamado pelo handleBlurSave no Dashboard
  };

  const handleNextDayBH = () => {
    if (!window.confirm("Deseja fechar o balanço atual e iniciar um novo dia?")) return;

    const up = [...patients];
    const p = JSON.parse(JSON.stringify(up[activeTab]));

    const { accumulated } = calculateTotals(p.bh || {}, p.nutri?.peso);
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

  const registrarEventoAdverso = async (dadosOuTipo, detalhes = "") => {
    const pacienteAtual = patients[activeTab];
    // Verifica se há um paciente no leito antes de registrar
    if (!pacienteAtual?.nome) return;

    try {
      let payload = {};

      // 1. SE RECEBER O PACOTE COMPLETO (Ex: Gatilho automático da LPP)
      if (typeof dadosOuTipo === 'object' && dadosOuTipo !== null) {
        payload = {
          ...dadosOuTipo,
          // Mantém o rastreio de quem estava logado no momento do disparo
          registradoPor: userProfile?.nome || "Não identificado",
          perfil: userProfile?.perfil || userProfile?.role || "Enfermeiro"
        };
      } 
      // 2. SE RECEBER O PADRÃO ANTIGO (Ex: Um botão simples chamando "Queda")
      else {
        // Extrai as iniciais caso seja uma notificação manual
        const iniciais = pacienteAtual.nome.split(" ").map(n => n[0]).join("").substring(0, 3).toUpperCase();
        
        payload = {
          idInternacao: pacienteAtual.idInternacao || "N/A",
          pacienteNome: pacienteAtual.nome,
          pacienteIniciais: iniciais,
          leitoOcorrencia: activeTab,     // Campo lido pelo novo Dashboard
          leito: activeTab,               // Mantido para retrocompatibilidade
          tipoEvento: dadosOuTipo,        // Campo lido pelo novo Dashboard
          tipo: dadosOuTipo,              // Mantido para retrocompatibilidade
          detalhes: detalhes,
          dataHoraOcorrencia: new Date().toISOString(), // Lido pelo novo Dashboard
          dataEvento: new Date().toISOString(),         // Mantido para retrocompatibilidade
          statusAnalise: "Pendente NSP",
          grauDano: "Moderado",
          registradoPor: userProfile?.nome || "Não identificado",
          perfil: userProfile?.perfil || userProfile?.role || "Enfermeiro"
        };
      }

      // Envia para o banco de dados (Mantive a coleção "eventos_adversos" do seu código)
      await addDoc(collection(db, "eventos_adversos"), payload);
      
      // Feedback visual para a equipe
      const nomeEvento = typeof dadosOuTipo === 'object' ? dadosOuTipo.tipoEvento : dadosOuTipo;
      console.log(`[SEGURANÇA]: Evento ${nomeEvento} registrado.`);
      alert(`✅ Evento registrado: ${nomeEvento}.\nIsso foi enviado para o relatório mensal de segurança.`);
      
    } catch (error) {
      console.error("Erro ao registrar evento adverso:", error);
      alert("Erro técnico ao salvar evento. Comunique o suporte.");
    }
  };

  const abrirEvolucaoInteligente = () => {
    // 1. ATBs (Mantém a lógica intacta)
    const atbsAtivos = currentPatient.antibiotics?.filter(atb => atb.name && atb.date) || [];
    const textoAtbs = atbsAtivos.map(atb => {
      const start = new Date(atb.date + 'T12:00:00');
      const today = new Date();
      const diffDays = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
      return `${atb.name.toUpperCase()} (D${diffDays > 0 ? diffDays : 1})`;
    }).join(", ");

    updateNested("medical", "antibioticosTextoIA", textoAtbs || "Nenhum");

    // =====================================================================
    // 🧠 O NOVO DETETIVE DE EXAME FÍSICO (CASCATA DE MEMÓRIA)
    // =====================================================================
    
    // PLANO A: Procurar na Evolução de Ontem (Último item salvo no histórico)
    let exOntem = {};
    if (currentPatient.history && currentPatient.history.length > 0) {
      // Pega o último plantão salvo
      const ultimaEvo = currentPatient.history[currentPatient.history.length - 1];
      exOntem = ultimaEvo.medical || {}; // Puxa os dados médicos de ontem
    }

    // PLANO B: Procurar na Admissão (Caso não tenha histórico ainda)
    const adm = currentPatient.admissionData || currentPatient.admissoes || {};

    // PLANO C: Injetar no Modal apenas se a aba de hoje ainda estiver vazia
    if (!currentPatient.medical?.exameGeral) {
      updateNested("medical", "exameGeral", exOntem.exameGeral || adm.exameGeral || "Bom estado geral.");
    }
    if (!currentPatient.medical?.exameAR) {
      updateNested("medical", "exameAR", exOntem.exameAR || adm.exameAR || "Murmúrio vesicular presente bilateralmente.");
    }
    if (!currentPatient.medical?.exameABD) {
      updateNested("medical", "exameABD", exOntem.exameABD || adm.exameABD || "Globoso, flácido, indolor.");
    }
    if (!currentPatient.medical?.exameExtremidades) {
      updateNested("medical", "exameExtremidades", exOntem.exameExtremidades || adm.exameExtremidades || "Aquecidas, sem edemas.");
    }

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
    // Pegamos os dados do paciente que está na maca do leito
    const p = currentPatient;
    
    console.log(">>> CLICOU EM ADMITIR! Puxando dados do leito:", p);

    // 👇 MÁGICA: Puxa do "Cofre" primeiro! Se não tiver, puxa da evolução atual, se não, fica vazio.
    const dadosSalvos = p?.admissaoMedica || p?.admissionData || {};

    setAdmissionData({
      // 1. DADOS DE CADASTRO (Imutáveis, sempre vêm do paciente base)
      nome: p?.nome || dadosSalvos.nome || "",
      sexo: p?.sexo || dadosSalvos.sexo || "",
      dataNascimento: p?.dataNascimento || dadosSalvos.dataNascimento || "",
      origem: dadosSalvos.origem || (p?.procedencia === "Recepção" ? "" : (p?.procedencia || "")),

      // 2. DADOS CLÍNICOS (Puxa do cofre se existir, senão inicia vazio)
      historia: dadosSalvos.historia || "", 
      exameGeral: dadosSalvos.exameGeral || "REG, normocorado, acianótico, anictérico.", 
      exameACV: dadosSalvos.exameACV || "RCR 2T. S/S.", 
      exameAR: dadosSalvos.exameAR || "MV+. S/ RA.",
      exameABD: dadosSalvos.exameABD || "Flácido, indolor à palpação, sem VMG palpável. RHA +.", 
      exameExtremidades: dadosSalvos.exameExtremidades || "Pulsos pérvios, sem edemas.",
      exameNeuro: dadosSalvos.exameNeuro || "",
      ecg_ao: dadosSalvos.ecg_ao || "", 
      ecg_rv: dadosSalvos.ecg_rv || "", 
      ecg_rm: dadosSalvos.ecg_rm || "", 
      ecg_basal_ao: dadosSalvos.ecg_basal_ao || "", 
      ecg_basal_rv: dadosSalvos.ecg_basal_rv || "", 
      ecg_basal_rm: dadosSalvos.ecg_basal_rm || "",
      rass: dadosSalvos.rass || "", 
      pupilas: dadosSalvos.pupilas || "", 
      dva: dadosSalvos.dva || false, 
      drogasDVA: dadosSalvos.drogasDVA || [],
      sedacao: dadosSalvos.sedacao || false, 
      drogasSedacao: dadosSalvos.drogasSedacao || [], 
      medicamentos: dadosSalvos.medicamentos || "",
      conscienciaBasal: dadosSalvos.conscienciaBasal || "", 
      mobilidadeBasal: dadosSalvos.mobilidadeBasal || "", 
      examesComplementares: dadosSalvos.examesComplementares || "",
      diagAgudos: dadosSalvos.diagAgudos || "", 
      diagCronicos: dadosSalvos.diagCronicos || "", 
      conduta: dadosSalvos.conduta || "",
      
      // 3. SAPS 3 (Obrigatórios)
      saps_origem: dadosSalvos.saps_origem || "", 
      saps_dias: dadosSalvos.saps_dias || "", 
      saps_motivo: dadosSalvos.saps_motivo || "", 
      saps_sistema: dadosSalvos.saps_sistema || "",
      saps_infeccao: dadosSalvos.saps_infeccao || "", 
      saps_sitioInfeccao: dadosSalvos.saps_sitioInfeccao || "",
      saps_cirurgiaUrgente: dadosSalvos.saps_cirurgiaUrgente || false, 
      saps_imunossupressao: dadosSalvos.saps_imunossupressao || false,
      saps_comorbidades: dadosSalvos.saps_comorbidades || [],
    });

    setShowAdmissionModal(true);
  };

  // --- REABRIR ADMISSÃO MÉDICA ---
  const handleEditAdmission = () => {
    // Procura na gaveta correta (admissionData)
    const dadosSalvos = currentPatient.admissionData || currentPatient.admissoes || {};

    // Injeta os dados salvos de volta no modal
    setAdmissionData({
      ...dadosSalvos
    });

    setShowAdmissionModal(true);
  };

  const handleFinalizeAdmission = async () => {
    // 1. VERIFICAÇÃO DE NOME (Já existia)
    if (!admissionData.nome || !admissionData.nome.trim()) {
      return alert(
        "O preenchimento do NOME é obrigatório para admitir o paciente."
      );
    }

    // 2. VERIFICAÇÃO SAPS 3 (OBRIGATÓRIOS BÁSICOS)
    const requiredSapsFields = ["saps_dias", "saps_origem", "saps_motivo", "saps_sistema", "saps_infeccao"];
    for (let field of requiredSapsFields) {
      if (!admissionData[field]) {
        return alert("⚠️ O preenchimento de todos os Fatores SAPS 3 Pré-Admissão é obrigatório para admitir o paciente!");
      }
    }

    if (admissionData.saps_infeccao === "Sim" && !admissionData.saps_sitioInfeccao) {
      return alert("⚠️ Como há Infecção na Admissão, é obrigatório selecionar o 'Sítio da Infecção' para o SAPS 3!");
    }

    const r = currentPatient.nome ? JSON.parse(JSON.stringify(currentPatient)) : defaultPatient(activeTab);
    
    // O CARIMBO ATÔMICO DE TEMPO
    if (!r.dataInternacaoISO) {
      r.dataInternacaoISO = new Date().toISOString(); 
    }

    // O COFRE DA ADMISSÃO MÉDICA
    if (!r.admissaoMedica) {
      r.admissaoMedica = {
        ...admissionData,
        dataRegistroAdmissao: new Date().toISOString()
      };
    }

    const idInternacao = `${admissionData.cpf || 'SEM_CPF'}_${Date.now()}`;
    if (!r.idInternacao) r.idInternacao = idInternacao; 

    r.statusInternacao = "Ativo";
    r.nome = admissionData.nome.trim().toUpperCase();
    r.sexo = admissionData.sexo || "";
    r.dataNascimento = admissionData.dataNascimento || "";
    r.dataInternacao = r.dataInternacao || getManausDateStr();
    
    r.bh.date = r.bh.date || getManausDateStr();
    r.procedencia = admissionData.origem;
    r.diagnostico = admissionData.diagAgudos;
    r.comorbidades = admissionData.diagCronicos;

    const getVal = (s) => parseInt(s?.split(" ")[0]) || 0;
    const ao = getVal(admissionData.ecg_ao);
    const rv = admissionData.ecg_rv?.startsWith("T") ? 1 : getVal(admissionData.ecg_rv);
    const rm = getVal(admissionData.ecg_rm);
    const totalEcg = admissionData.ecg_ao || admissionData.ecg_rv || admissionData.ecg_rm ? ao + rv + rm : null;
    const ecgText = totalEcg !== null ? `${totalEcg} (AO:${ao} RV:${admissionData.ecg_rv?.startsWith("T") ? "T" : rv } RM:${rm})` : "-";

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

    const historiaAbaMedica = `${admissionData.historia || "-"}
  
MEDICAMENTOS DE USO HABITUAL:
${admissionData.medicamentos || "-"}
  
NÍVEL DE CONSCIÊNCIA BASAL: ${admissionData.conscienciaBasal || "-"}
MOBILIDADE BASAL: ${admissionData.mobilidadeBasal || "-"}`;

    r.historiaClinica = historiaAbaMedica;
    r.admissionData = admissionData;

    r.medical = {
      ...(r.medical || {}),
      exameGeral: admissionData.exameGeral || "",
      exameAR: admissionData.exameAR || "",
      exameACV: admissionData.exameACV || "",
      exameABD: admissionData.exameABD || "",
      exameExtremidades: admissionData.exameExtremidades || "",
      examesComplementares: admissionData.examesComplementares || "",
      condutaPlano: admissionData.conduta || ""
    };

    const up = [...patients];
    up[activeTab] = r;
    setPatients(up);
    save(r, "Médico: Realizou a Admissão Completa do Paciente (Pré-UTI, SAPS 3 e Exame Físico)");

    // =========================================================================
    // 💡 AUDITORIA: Registo da Admissão Médica
    // =========================================================================
    if (typeof registarLogAuditoria === "function" || typeof registrarLogAuditoria === "function") {
      const auditoriaFn = typeof registrarLogAuditoria === "function" ? registrarLogAuditoria : registarLogAuditoria;
      auditoriaFn(
        "ADMISSÃO MÉDICA FINALIZADA",
        `Diagnóstico Agudo: ${admissionData.diagAgudos?.substring(0, 50) || "Não descrito"}... | Tipo SAPS 3: ${admissionData.saps_motivo || "N/A"}`,
        `Leito ${activeTab + 1}`,
        r.nome
      );
    }

    setShowAdmissionModal(false);
    setGeneratedAdmissionText(text);
    setViewMode("medical");
  };

  const handleNursingAdmission = () => {
    // CAMPO ESTÉRIL ABSOLUTO: Injeta uma prancheta 100% vazia.
    // Ignora qualquer rascunho de evolução para não puxar lixo de memória de outro leito.
    setNursingData({
      dor: "", hemodialise: false, precaucao: "",
      avpLocal: "", avpData: "", cvcLocal: "", cvcData: "", cvcRetiradaData: "",
      shileyLocal: "", shileyData: "", shileyRetiradaData: "",
      svd: false, svdData: "", svdRetiradaData: "",
      sneCm: "", sneData: "", drenoTipo: "",
      lesaoLocal: "", curativoTipo: "", curativoData: "", lesoes: [],
      braden_percepcao: "", braden_umidade: "", braden_atividade: "", braden_mobilidade: "", braden_nutricao: "", braden_friccao: "",
      morse_historico: "", morse_diagnostico: "", morse_auxilio: "", morse_terapiaIV: "", morse_marcha: "", morse_estadoMental: ""
    });
    
    setShowNursingModal(true);
  };


// --- INICIAR ADMISSÃO DA FISIOTERAPIA (Campos Estruturados v2) ---
  const handlePhysioAdmission = () => {
    console.log("🟢 MOTOR: Injetando Template Estruturado para NOVA Admissão v2");
    
    // 1. Inicializamos o objeto com os novos campos limpos ou com os padrões desejados
    const templateLimpoV2 = {
      // Bloco 1: Avaliação Respiratória
      expansibilidadeTipo: "",        // Select (Simétrica / Assimétrica)
      expansibilidadePredominio: "",  // Select (Costal / Abdominal / Misto)
      
      // O texto que você queria escrito de verdade para edição direta (sem ser placeholder)
      auscultaPulmonar: "Murmúrio vesicular presente. Sem ruídos adventícios.", 
      
      tosse: "",                      // Select (Eficaz / Ineficaz / Ausente)
      secrecao: false,                // Checkbox (true / false)
      secrecaoAspecto: "",            // Select baseado em constantes
      secrecaoColoracao: "",          // Select baseado em constantes
      secrecaoQtd: "",                // Select baseado em constantes
      desconfortoRespiratorio: false, // Checkbox (true / false)
      sinaisDesconforto: [],          // Array para armazenar os múltiplos checkboxes de sinais

      // Bloco 2: Avaliação Musculoesquelética
      tonusMuscular: "",              // Select (Normotônico / Hipotônico / Hipertônico)
      amplitudeMovimento: "",         // Select (Preservada / Reduzida)
      amplitudeDescricao: "",         // Textarea de limitação (caso seja reduzida)
      retracoesMusculares: false,     // Checkbox (true / false)

      // Bloco 3: Escalas Funcionais
      mrcScore: "",                   // Input numérico obrigatório
      ims: "",                        // Select obrigatório baseado em constantes

      // Bloco 4: Suporte Ventilatório
      suporte: "",                    // Select obrigatório (VM, VNI, etc)
      parametro: "",                  // Modo de VM ou Tipo de VNI / Fluxo O2
      volCorrente: "",                // Parâmetro Vt (ml)
      pressaoControlada: "",          // Parâmetro PC (cmH2O)
      pressaoSuporte: "",             // Parâmetro PS (cmH2O)
      peep: "",                       // PEEP
      fiO2: "",                       // FiO2 (%)
      fr: "",                         // FR (irpm)
      tIns: "",                       // T. Ins (s)
      relIE: "",                      // I:E (1:2)
      
      // Dispositivos da Via Aérea
      dataIntubacao: "",              // Data da IOT
      numeroTOT: "",                  // Nº do TOT
      rimaFixacao: "",                // Rima (cm)
      filtroHMEF: false,              // Checkbox Filtro HMEF
      dataHMEF: "",                   // Data da troca do Filtro HMEF
      sistemaFechado: false,          // Checkbox SFA
      dataSFA: "",                    // Data da troca do SFA
      cuff: "",                       // Pressão do cuff

      // Bloco 5: Gasometria de Admissão
      gasoHora: "",                   // Horário da Gaso
      gaso_pH: "",
      gaso_pCO2: "",
      gaso_PaO2: "",
      gaso_BE: "",
      gaso_HCO3: "",
      gaso_SatO2: "",
      gaso_FiO2: "",
      gaso_PF: "",                    // Calculado automaticamente pelo useEffect do modal

      // Bloco 6: Condutas Fisioterapêuticas (Mantido o texto padrão sugerido)
      condutas: `• Monitorização contínua de sinais vitais e vigilância respiratória;\n• Posicionamento funcional e terapêutico em leito com cabeceira a 30° a 45º;\n• Avaliação de mecânica ventilatória e parâmetros do ventilador.`
    };

    // 2. Atualiza o estado no modulouti.jsx enviando o objeto correto
    setPhysioData(templateLimpoV2);
    
    // 3. Abre o modal na tela
    setShowPhysioModal(true);
  };

  // --- REABRIR/VER ADMISSÃO DE ENFERMAGEM ---
  const handleViewNursingAdmission = () => {
    // Procura na gaveta correta (priorizando o cofre imutável)
    const cofre = currentPatient.admissaoEnfermagem || currentPatient.enfermagem || {};

    // Injeta os dados salvos de volta no modal
    setNursingData({ ...cofre });

    setShowNursingModal(true);
  };

  // --- REABRIR/VER ADMISSÃO DE FISIOTERAPIA ---
  const handleViewPhysioAdmission = () => {
    console.log("🟡 MOTOR: Lendo admissão existente (Cofre)");
    // Procura na gaveta correta (priorizando o cofre imutável)
    const cofre = currentPatient.admissaoFisioterapia || currentPatient.physio || {};
    console.log("🟡 MOTOR: Dados extraídos do cofre:", cofre);

    // Injeta os dados salvos de volta no modal
    setPhysioData({ ...cofre });

    setShowPhysioModal(true);
  };

const handleFinalizePhysioAdmission = () => {
    // ========================================================
    // 🚧 O LEÃO DE CHÁCARA: Bloqueia a finalização se faltar a hora da gaso
    // ========================================================
    const chavesGaso = ["gaso_pH", "gaso_pCO2", "gaso_PaO2", "gaso_BE", "gaso_HCO3", "gaso_SatO2", "gaso_FiO2", "gaso_PF"];
    const temDadoGaso = chavesGaso.some(chave => physioData[chave] && String(physioData[chave]).trim() !== "");

    if (temDadoGaso && !physioData.gasoHora) {
      alert("⚠️ Atenção Fisio: O Horário da Gasometria é OBRIGATÓRIO para finalizar a admissão.");
      return;
    }

    // 1. O CLONE PROFUNDO DO PACIENTE
    const pacienteBase = patients[activeTab];
    const r = pacienteBase ? JSON.parse(JSON.stringify(pacienteBase)) : {};

    // ========================================================
    // 2. SALVANDO OS DADOS NO COFRE DA FISIOTERAPIA
    // ========================================================
    if (!r.admissaoFisioterapia) {
      r.admissaoFisioterapia = {
        ...physioData,
        dataRegistroAdmissao: new Date().toISOString()
      };
    }

    const hoje = new Date().toLocaleDateString('pt-BR');

    r.physio = {
      ...(r.physio || {}),
      mrcScore: physioData.mrcScore ? { [hoje]: physioData.mrcScore } : (r.physio?.mrcScore || {}),
      icuMobilityScale: physioData.ims ? { [hoje]: physioData.ims } : (r.physio?.icuMobilityScale || {}),
      suporte: physioData.suporte,
      parametro: physioData.parametro,
      peep: physioData.peep,
      fiO2: physioData.fiO2,
      volCorrente: physioData.volCorrente,
      pressaoControlada: physioData.pressaoControlada,
      pressaoSuporte: physioData.pressaoSuporte,
      fr: physioData.fr,
      tIns: physioData.tIns,
      relIE: physioData.relIE,
      filtroHMEF: physioData.filtroHMEF,
      dataHMEF: physioData.dataHMEF,
      sistemaFechado: physioData.sistemaFechado,
      dataSFA: physioData.dataSFA,
      cuff: physioData.cuff,
      admissao_condutas: physioData.condutas,
      totNumero: physioData.numeroTOT,
      totRima: physioData.rimaFixacao,
      secrecao: physioData.secrecao,
      secrecaoAspecto: physioData.secrecaoAspecto,
      secrecaoColoracao: physioData.secrecaoColoracao,
      secrecaoQtd: physioData.secrecaoQtd
    };

    if (physioData.dataIntubacao) r.dataIntubacao = physioData.dataIntubacao;

    // --- MÁGICA DA GASOMETRIA AUTOMÁTICA ---
    if (physioData.gasoHora) {
      if (!r.gasometriaHistory) r.gasometriaHistory = {};
      if (!r.customGasometriaCols) r.customGasometriaCols = [];
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const colName = `${dd}/${mm} (Adm)`;

      if (!r.customGasometriaCols.includes(colName)) r.customGasometriaCols.push(colName);
      if (!r.gasometriaHistory[colName]) r.gasometriaHistory[colName] = {};
      if (physioData.gasoHora) r.gasometriaHistory[colName]["_hora"] = physioData.gasoHora;
      if (physioData.gaso_pH) r.gasometriaHistory[colName]["pH"] = physioData.gaso_pH;
      if (physioData.gaso_pCO2) r.gasometriaHistory[colName]["pCO2"] = physioData.gaso_pCO2;
      if (physioData.gaso_PaO2) r.gasometriaHistory[colName]["PaO2"] = physioData.gaso_PaO2;
      if (physioData.gaso_BE) r.gasometriaHistory[colName]["BE"] = physioData.gaso_BE;
      if (physioData.gaso_HCO3) r.gasometriaHistory[colName]["HCO3"] = physioData.gaso_HCO3;
      if (physioData.gaso_SatO2) r.gasometriaHistory[colName]["SatO2"] = physioData.gaso_SatO2;
      if (physioData.gaso_FiO2) r.gasometriaHistory[colName]["FiO2"] = physioData.gaso_FiO2;
      if (physioData.gaso_PF) r.gasometriaHistory[colName]["P/F"] = physioData.gaso_PF;
    }

    const up = [...patients];
    up[activeTab] = r;
    setPatients(up);

    if (typeof save === "function") {
      save(r, "Fisioterapia: Realizou a Admissão Completa (Avaliação Inicial, Parâmetros Ventilatórios e Escalas)");
    }

    // =========================================================================
    // 🧠 MÁGICA DE INTELIGÊNCIA CLÍNICA DO TEXTO (GERADOR)
    // =========================================================================

    // 1. SISTEMA RESPIRATÓRIO (Buscando a 1ª FR registrada em bh.vitals)
    let padraoRespiratorio = "Padrão respiratório eupneico";
    if (r.bh && r.bh.vitals) {
      const hoursArray = Object.keys(r.bh.vitals).sort(); // Ordena horas, ex: "08:00", "10:00"
      if (hoursArray.length > 0) {
        const earliestHour = hoursArray[0];
        const frValueStr = r.bh.vitals[earliestHour]["FR (irpm)"];
        if (frValueStr) {
          const frValue = parseInt(frValueStr);
          if (frValue < 12) padraoRespiratorio = "Padrão respiratório bradipneico";
          else if (frValue > 20) padraoRespiratorio = "Padrão respiratório taquipneico";
        }
      }
    }

    // =========================================================================
    // 🧠 AJUSTE DE FLUXO E CONCORDÂNCIA CLÍNICA (TOSSE E SECREÇÃO)
    // =========================================================================
    let tosseESecrecaoText = "";

    const tosseStatus = physioData.tosse?.toLowerCase(); // "eficaz", "ineficaz", "ausente"

    if (tosseStatus === "ausente") {
      if (physioData.secrecao) {
        // Cenário raro, mas possível (ex: paciente não tosse, mas aspira secreção em via aérea)
        tosseESecrecaoText = `Ausência de tosse espontânea, porém com presença de secreção traqueobrônquica de aspecto ${physioData.secrecaoAspecto?.toLowerCase() || "..."}, coloração ${physioData.secrecaoColoracao?.toLowerCase() || "..."}, em ${physioData.secrecaoQtd?.toLowerCase() || "pouca"} quantidade.`;
      } else {
        // Cenário padrão ouro: sem tosse e sem secreção
        tosseESecrecaoText = "Ausência de tosse e de secreção traqueobrônquica.";
      }
    } else {
      // Se a tosse for Eficaz ou Ineficaz
      const detalheSecrecao = physioData.secrecao
        ? `com presença de secreção traqueobrônquica de aspecto ${physioData.secrecaoAspecto?.toLowerCase() || "..."}, coloração ${physioData.secrecaoColoracao?.toLowerCase() || "..."}, em ${physioData.secrecaoQtd?.toLowerCase() || "pouca"} quantidade.`
        : "com ausência de secreção traqueobrônquica.";
        
      tosseESecrecaoText = `Apresenta tosse ${tosseStatus || "não avaliada"}, ${detalheSecrecao}`;
    }

    const desconfortoText = physioData.desconfortoRespiratorio
      ? `com uso de musculatura acessória, com sinais de desconforto respiratório (${Array.isArray(physioData.sinaisDesconforto) ? physioData.sinaisDesconforto.join(", ") : "não especificado"}).`
      : "sem uso de musculatura acessória, sem sinais de desconforto respiratório.";

    // 2. SISTEMA CARDIOVASCULAR (Nova Lógica Baseada em DVA + 1ª PAM do Dia)
    const usaDVA = r.cardio?.dva === true;
    const isFem = r.sexo === "F"; 
    
    // Padrão inicial caso não encontre a PAM na base
    let hemodinamicaStatus = usaDVA 
      ? (isFem ? "Hemodinamicamente compensada" : "Hemodinamicamente compensado") 
      : "Hemodinamicamente estável";

    // Busca o valor da primeira PAM inserida no balanço hídrico
    if (r.bh && r.bh.vitals) {
      const hoursArray = Object.keys(r.bh.vitals).sort(); // Ordena os horários ("10:00", "11:00"...)
      if (hoursArray.length > 0) {
        const earliestHour = hoursArray[0];
        const pamValueStr = r.bh.vitals[earliestHour]["PAM"]; // Puxa a PAM do primeiro horário
        
        if (pamValueStr) {
          const pamValue = parseInt(pamValueStr);
          
          if (!usaDVA) {
            hemodinamicaStatus = "Hemodinamicamente estável";
          } else if (usaDVA && pamValue >= 65) {
            hemodinamicaStatus = isFem ? "Hemodinamicamente compensada" : "Hemodinamicamente compensado";
          } else if (usaDVA && pamValue < 65) {
            hemodinamicaStatus = "Hemodinamicamente instável";
          }
        }
      }
    }
    
    const dvaText = usaDVA ? `em uso de DVA (${r.cardio?.drogasDVA?.join(", ") || "não especificadas"})` : "sem uso de DVA";

    // 3. SISTEMA NERVOSO
    // Tenta pegar do r.admissionData, r.admissaoMedica ou r.neuro
    const nivelConsciencia = r.admissionData?.conscienciaBasal || r.admissaoMedica?.conscienciaBasal || r.neuro?.glasgowBasalText || "Nível de consciência não informado";
    const sedado = r.neuro?.sedacao === true || r.neuro?.sedacao === "Sim" || r.admissaoMedica?.sedacao === "Sim";
    const sedadoText = sedado ? "sedado" : "sem sedação";
    
    const drogasSedativas = r.neuro?.drogasSedacao || r.admissaoMedica?.drogasSedacao || [];
    const drogasSedText = sedado && drogasSedativas.length > 0 ? `, em uso de ${drogasSedativas.join(" e ")} em BIC` : "";
    
    // Lógica Inteligente RASS vs Glasgow
    let rassGcs = "Glasgow não avaliado";
    const rassValue = r.neuro?.rass || r.admissaoMedica?.rass;

    if (rassValue) {
      rassGcs = `RASS ${rassValue}`;
    } else {
      // Extrator de números do Firebase (ex: "4 - Espontânea" -> 4)
      const getGcsVal = (s) => parseInt(s?.split(" ")[0]) || 0;
      
      const aoStr = r.admissaoMedica?.ecg_ao || r.neuro?.glasgowAO;
      const rvStr = r.admissaoMedica?.ecg_rv || r.neuro?.glasgowRV;
      const rmStr = r.admissaoMedica?.ecg_rm || r.neuro?.glasgowRM;

      if (aoStr || rvStr || rmStr) {
        const ao = getGcsVal(aoStr);
        const rm = getGcsVal(rmStr);
        
        let rv = 0;
        let rvDisplay = "";
        
        // Verifica se o paciente está intubado (1T)
        if (rvStr?.startsWith("1T") || rvStr?.startsWith("T")) {
           rv = 1; 
           rvDisplay = "T";
        } else {
           rv = getGcsVal(rvStr);
           rvDisplay = rv.toString();
        }
        
        const totalGcs = ao + rv + rm;
        rassGcs = `Glasgow ${totalGcs} (AO:${ao} RV:${rvDisplay} RM:${rm})`;
      }
    }

    const pupilasText = r.admissionData?.pupilas || r.admissaoMedica?.pupilas || "não descritas";

    // 4. SISTEMA MUSCULOESQUELÉTICO E TEMPO VM
    const mrcScoreInt = parseInt(physioData.mrcScore);
    const forcaMuscularText = (!isNaN(mrcScoreInt) && mrcScoreInt < 48) ? "Força muscular reduzida" : "Força muscular preservada";

    let tempoVMText = "";
    if (physioData.suporte === "VM" && physioData.dataIntubacao) {
      const dataIOT = new Date(physioData.dataIntubacao + "T00:00:00");
      const diffTime = Math.abs(new Date() - dataIOT);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      tempoVMText = `\nTempo de VM: D${diffDays}`;
    }

    // 5. PARÂMETROS E DISPOSITIVOS
    let paramText = "-";
    if (physioData.suporte === "VM") {
      if (physioData.parametro === "VCV") paramText = `Vt: ${physioData.volCorrente || "-"}ml | PEEP: ${physioData.peep || "-"} | FR: ${physioData.fr || "-"} | T.ins: ${physioData.tIns || "-"} | I:E: ${physioData.relIE || "-"} | FiO2: ${physioData.fiO2 || "-"}%`;
      else if (physioData.parametro === "PCV") paramText = `PC: ${physioData.pressaoControlada || "-"}cmH2O | PEEP: ${physioData.peep || "-"} | FR: ${physioData.fr || "-"} | T.ins: ${physioData.tIns || "-"} | I:E: ${physioData.relIE || "-"} | FiO2: ${physioData.fiO2 || "-"}%`;
      else if (physioData.parametro === "PSV") paramText = `PS: ${physioData.pressaoSuporte || "-"}cmH2O | PEEP: ${physioData.peep || "-"} | FiO2: ${physioData.fiO2 || "-"}%`;
    } else if (physioData.suporte === "VNI") {
      paramText = `Modo: ${physioData.parametro || "-"} | FiO2: ${physioData.fiO2 || "-"}%`;
    } else if (physioData.suporte === "Venturi") {
      paramText = `FiO2: ${physioData.fiO2 || "-"}%`;
    } else if (["Cateter Nasal", "Máscara não reinalante", "Macronebulização por TQT"].includes(physioData.suporte)) {
      paramText = `Fluxo: ${physioData.parametro || "-"} L/min`;
    }

    const gasoText = physioData.gasoHora ? `${physioData.gasoHora}h - pH: ${physioData.gaso_pH || "-"} | pCO2: ${physioData.gaso_pCO2 || "-"} | PaO2: ${physioData.gaso_PaO2 || "-"} | BE: ${physioData.gaso_BE || "-"} | HCO3: ${physioData.gaso_HCO3 || "-"} | SatO2: ${physioData.gaso_SatO2 || "-"} | FiO2: ${physioData.gaso_FiO2 || "-"} | P/F: ${physioData.gaso_PF || "-"}` : "Não realizada.";

    let dispositivosText = [];
    if (physioData.filtroHMEF) dispositivosText.push(`Filtro HMEF (Instalação: ${physioData.dataHMEF || "não informada"})`);
    if (physioData.sistemaFechado) dispositivosText.push(`Sistema Fechado de Aspiração (Instalação: ${physioData.dataSFA || "não informada"})`);
    if (physioData.cuff) dispositivosText.push(`Pressão do Cuff: ${physioData.cuff} cmH2O`);
    const blocoDispositivos = dispositivosText.length > 0 ? `\n\nDISPOSITIVOS DE VIA AÉREA:\n${dispositivosText.join("\n")}` : "";

// =========================================================================
// 6. GERADOR DE TEXTO (TEXTO FINAL EXATO)
// =========================================================================
const text = `ADMISSÃO FISIOTERAPÊUTICA
 
--- HISTÓRIA E DIAGNÓSTICOS ---
HISTÓRIA CLÍNICA:
${r.admissionData?.historia || "Não informada no sistema médico."}
 
DIAGNÓSTICOS AGUDOS:
${r.admissionData?.diagAgudos || "Não informados no sistema médico."}
 
HPP:
${r.admissionData?.diagCronicos || "Não informados no sistema médico."}
 
NÍVEL DE CONSCIÊNCIA BASAL: ${r.admissionData?.conscienciaBasal || "Não informado no sistema médico."}

--- AVALIAÇÃO POR SISTEMAS ---

SISTEMA RESPIRATÓRIO:
${padraoRespiratorio}.
Expansibilidade torácica ${physioData.expansibilidadeTipo?.toLowerCase() || "não avaliada"}, com predomínio ${physioData.expansibilidadePredominio?.toLowerCase() || "não avaliado"}.
Ausculta pulmonar: ${physioData.auscultaPulmonar || "Não avaliada."}
${tosseESecrecaoText}
Paciente ${desconfortoText}
 
SISTEMA CARDIOVASCULAR:
Paciente ${hemodinamicaStatus}, ${dvaText}.
 
SISTEMA NERVOSO: 
Paciente ${nivelConsciencia}, ${sedadoText}${drogasSedText}, ${rassGcs}. Pupilas: ${pupilasText}.
 
SISTEMA MUSCULOESQUELÉTICO:
${forcaMuscularText} (MRC: ${physioData.mrcScore || "não testado"}). Tônus muscular ${physioData.tonusMuscular?.toLowerCase() || "não avaliado"}. ${physioData.retracoesMusculares ? "Com" : "Sem"} sinais de retrações musculares.
Amplitude de movimento ${physioData.amplitudeMovimento?.toLowerCase() || "não avaliada"} ${physioData.amplitudeMovimento === 'Reduzida' && physioData.amplitudeDescricao ? `em ${physioData.amplitudeDescricao}` : ""}.
Mobilidade no leito (IMS): ${physioData.ims || "Não avaliada"}.
 
FUNCIONALIDADE: 
${r.admissionData?.mobilidadeBasal || "Não informada no sistema médico."}
 
--- SUPORTE VENTILATÓRIO ---
Suporte Atual: ${physioData.suporte || "Não informado"}${tempoVMText}
Parâmetros: ${paramText}
 
--- GASOMETRIA DE ADMISSÃO ---
${gasoText}${blocoDispositivos}

--- CONDUTAS FISIOTERAPÊUTICAS ---
${physioData.condutas || "Nenhuma conduta descrita."}`;

    setShowPhysioModal(false);
    
    if(typeof setGeneratedPhysioText === 'function') {
      setGeneratedPhysioText(text);
    }
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

  const handleLockSAPS3 = async () => { // 🔥 Adicionamos o 'async' aqui
    const up = [...patients];
    const p = up[activeTab];
    const calc = calculateSAPS3Score(p);

    // 1. TRAVA O SAPS 3
    if (!p.saps3) p.saps3 = {};
    p.saps3.isLocked = true;
    p.saps3.lockedScore = calc.score;
    p.saps3.lockedProb = calc.prob;
    p.saps3.lockedDetails = calc.details;

    // 2. SUTURA: CARIMBO AUTOMÁTICO NA EVOLUÇÃO MÉDICA
    if (!p.medical) p.medical = {};
    const evolucaoAtual = p.medical.evolucao || "";
    const textoSaps = `\n\n--- ADMISSÃO ---\nEscore SAPS 3: ${calc.score} pontos (Mortalidade Estimada: ${calc.prob}%).\n----------------\n`;

    if (!evolucaoAtual.includes("Escore SAPS 3:")) {
      p.medical.evolucao = evolucaoAtual + textoSaps;
      alert("SAPS 3 Calculado, Travado e carimbado na Evolução Médica com sucesso!");
    } else {
      alert("SAPS 3 Travado com sucesso!");
    }

    // 3. SALVA O ESTADO LOCAL DO PACIENTE
    setPatients(up);
    if (typeof save === "function") save(p, "SAPS 3 Travado Definitivo");

    // 4. 🔥 O NOVO PASSO: ENVIA A FOTO DEFINITIVA PARA A AUDITORIA DO GESTOR
    try {
      const historicoRef = collection(db, "indicadores_performance");
      await addDoc(historicoRef, {
        cpf: p.cpf || "SEM_CPF",
        idInternacao: p.idInternacao || `${p.cpf || 'SEM_CPF'}_${Date.now()}`,
        tipo: "SAPS 3",
        dataRegistro: serverTimestamp(),
        valor: calc.score, 
        probabilidadeMorte: calc.prob,
        respostas: calc.details, // O array detalhado que o modal vai ler
        nomePaciente: p.nome,
        periodo: {
            mes: new Date().getMonth() + 1,
            ano: new Date().getFullYear()
        }
      });
      console.log("Auditoria do SAPS 3 salva no banco de gestão.");
      
      // =========================================================================
      // 💡 AUDITORIA: Registra o Travamento Oficial
      // =========================================================================
      if (typeof registrarLogAuditoria === "function") {
        registrarLogAuditoria(
          "SAPS 3: TRAVADO", 
          `Score: ${calc.score} pontos | Mortalidade Prevista: ${calc.prob}%`, 
          `Leito ${activeTab + 1}`, 
          p.nome
        );
      }

    } catch (e) {
      console.error("Erro ao salvar indicador SAPS3 definitivo:", e);
    }
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

    // =========================================================================
    // 💡 AUDITORIA: Alerta Crítico de Destravamento
    // =========================================================================
    if (typeof registrarLogAuditoria === "function") {
      registrarLogAuditoria(
        "SAPS 3: DESTRAVADO (ALERTA DE SEGURANÇA)", 
        `O cálculo definitivo do SAPS 3 foi reaberto para edição.`, 
        `Leito ${activeTab + 1}`, 
        p.nome
      );
    }
  };

const generateAIEvolution = async (dadosDoTimeout = null) => {
    setIsGeneratingAI(true);
    let success = false;
    let lastError = "Iniciando...";

    try {
      const envKey = import.meta.env.VITE_GEMINI_API_KEY_MED;
      const currentKey = envKey || window.apiKey || "";
      
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

      // 1. SINAIS VITAIS (COM A NOVA LÓGICA DE SPO2)
      const vitals = currentPatient.bh?.vitals || {};
      let tempMax = 0, spo2Min = 100, fcMax = 0, fcMin = 0, pasMax = 0, pasMin = 0;
      let hasSpo2 = false; // Rastreador de segurança
      
      Object.values(vitals).forEach((v) => {
        if (!v) return;
        const t = safeNum(v["Temp (ºC)"]); if (t > tempMax) tempMax = t;
        
        // Coleta da SpO2
        const s = safeNum(v["SpO2 (%)"]); 
        if (s > 0) {
          hasSpo2 = true;
          if (s < spo2Min) spo2Min = s; 
        }

        const fc = safeNum(v["FC (bpm)"]);
        if (fc > 0) { if (fcMax === 0 || fc > fcMax) fcMax = fc; if (fcMin === 0 || fc < fcMin) fcMin = fc; }
        const pas = safeNum(v["PAS"]);
        if (pas > 0) { if (pasMax === 0 || pas > pasMax) pasMax = pas; if (pasMin === 0 || pas < pasMin) pasMin = pas; }
      });

      const tempStatus = tempMax >= 37.8 ? "febril" : "afebril";
      
      // 👇 A MÁGICA DA SPO2 RASA/BOA/BAIXA 👇
      let spo2Status = "sem registro de SpO2";
      if (hasSpo2) {
        if (spo2Min > 92) spo2Status = "mantendo boa SpO2";
        else if (spo2Min >= 89) spo2Status = "com SpO2 rasa";
        else spo2Status = "com baixa SpO2";
      }

      const fcStatus = fcMax > 100 ? (isFem ? "taquicárdica" : "taquicárdico") : (fcMin > 0 && fcMin < 60 ? (isFem ? "bradicárdica" : "bradicárdico") : (isFem ? "eucárdica" : "eucárdico"));
      const paStatus = (pasMin > 0 && pasMin < 90) ? "com hipotensão" : (pasMax > 160 ? (isFem ? "hipertensa" : "hipertenso") : "com bom controle pressórico");

      // 2. ESTADO GERAL E NEURO
      const egSalvo = dadosDoTimeout?.estadoGeral || currentPatient.medical?.estadoGeral || "REG";
      const egExtenso = egSalvo === "BEG" ? "BEG" : (egSalvo === "MEG" ? "MEG" : "REG");
      const sedacaoText = currentPatient.neuro?.sedacao ? (isFem ? "sedada" : "sedado") : "sem sedação";

      // 3. RESPIRATÓRIO
      const suporte = currentPatient.physio?.suporte || "Ar ambiente";
      let suporteText = "";
      if (suporte === "VM") suporteText = "em VM por TOT";
      else if (suporte.toLowerCase() === "ar ambiente") suporteText = "em ar ambiente";
      else suporteText = `em uso de ${suporte}`;

      // 4. HEMODINÂMICO 
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
          if (last > prev) hemodinamicaStatus = "Hemodinamicamente instável"; 
        }
      }
      const dvaText = usaDVA ? `em uso de DVA (${currentPatient.cardio.drogasDVA?.join(", ")})` : "sem uso de DVA";

      // 5. RENAL 
      const diureseNum = parseFloat(calculateDiurese12hMlKgH(currentPatient));
      const diureseStatus = (!isNaN(diureseNum) && diureseNum < 0.5) ? "Baixa diurese" : "Boa diurese";
      
      const crclNum = parseFloat(calculateCreatinineClearance(currentPatient));
      let renalStatus = "sem cálculo de função renal";
      
      if (!isNaN(crclNum)) {
        // 🔥 MUDANÇA: A palavra "com" agora fica embutida aqui, apenas se houver cálculo
        if (crclNum >= 90) renalStatus = "com função renal normal";
        else if (crclNum >= 60) renalStatus = "com redução leve da função renal";
        else if (crclNum >= 30) renalStatus = "com falha moderada da função renal";
        else renalStatus = "com falha severa da função renal";
      }

     // 6. LABORATORIAL
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
        // 🔥 MUDANÇA: A palavra "com" agora fica embutida aqui também
        if (leucoVal < 5000) leucoStatus = "com leucopenia";
        else if (leucoVal <= 10000) leucoStatus = "com leucometria normal";
        else if (leucoVal <= 12000) leucoStatus = "com leucocitose discreta";
        else if (leucoVal <= 20000) leucoStatus = "com leucocitose";
        else leucoStatus = "com leucocitose importante";
      }

      const atbValidado = dadosDoTimeout?.atbs || currentPatient.medical?.antibioticosTextoIA || "";
      const atbsFinal = (!atbValidado || atbValidado.toLowerCase() === "nenhum") ? "sem uso de antibióticos ativos" : `em uso de ${atbValidado}`;

      // 7. GASTRO E DIETA
      const temRegistroPositivo = (valor) => {
        if (!valor) return false;
        const texto = String(valor).trim().toLowerCase();
        if (texto === "" || texto === "0" || texto === "n" || texto === "nao" || texto === "não" || texto === "-") return false;
        return true; 
      };

      let temVomitoNoBH = false;
      let temDiarreiaNoBH = false;
      let temEvacuacaoNoBH = false; 

      if (currentPatient.bh?.losses) {
        Object.values(currentPatient.bh.losses).forEach(hora => {
          if (!hora) return;
          if (temRegistroPositivo(hora["Vômitos"]) || temRegistroPositivo(hora["Vomitos"])) {
            temVomitoNoBH = true;
          }
          if (temRegistroPositivo(hora["Diarreia"]) || temRegistroPositivo(hora["Diarréia"])) {
            temDiarreiaNoBH = true;
          }
          if (temRegistroPositivo(hora["Evacuação"]) || temRegistroPositivo(hora["Evacuacao"]) || temRegistroPositivo(hora["Fezes"])) {
            temEvacuacaoNoBH = true;
          }
        });
      }

      const dataEvac = currentPatient.gastro?.dataUltimaEvacuacao;
      let evacDaysStr = dataEvac 
        ? (typeof calculateEvacDays === 'function' ? calculateEvacDays(dataEvac) : "-")
        : "sem registro de evacuações durante essa internação";

      if (temEvacuacaoNoBH) {
        evacDaysStr = "hoje";
      }
      
      let tgiIntercorrencias = "";
      if (temVomitoNoBH && temDiarreiaNoBH) tgiIntercorrencias = " Houve registro de vômitos e diarreia no dia de hoje.";
      else if (temVomitoNoBH) tgiIntercorrencias = " Houve registro de vômito no dia de hoje.";
      else if (temDiarreiaNoBH) tgiIntercorrencias = " Houve registro de diarreia no dia de hoje.";

      const viaDieta = currentPatient.nutri?.via ? currentPatient.nutri.via.toLowerCase() : "zero";

      // 8. O PROMPT PARA A IA (APENAS O BLOCO DE EVOLUÇÃO)
      const promptText = `Você é um médico intensivista. Redija a evolução ESTRITAMENTE no formato exato fornecido abaixo.
      NÃO adicione introduções e não invente dados. Siga exatamente a estrutura fornecida.

      FORMATO OBRIGATÓRIO:
      ${sexoPaciente} encontra-se em [ESTADO GERAL], [SEDAÇÃO], [SUPORTE RESPIRATÓRIO], [SPO2].
      [HEMODINÂMICA], [DVA], apresenta-se [FC], [PA].
      [DIURESE], [FUNÇÃO RENAL].
      ${mantemSe} [TEMPERATURA], [LEUCOMETRIA] e [ATB].
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
      
      INSTRUÇÃO FINAL: Se o campo [TGI] contiver texto, você DEVE transcrevê-lo exatamente após a última evacuação. Se [TGI] estiver vazio, finalize a frase após a [EVACUAÇÃO].`;

      // 9. LOOP DE MODELOS (GEMINI)
      const models = ["gemini-2.5-flash", "gemini-1.5-pro"];
      
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
            const aiEvolucaoClinica = data.candidates[0].content.parts[0].text.trim();
            
            // =========================================================================
            // 🧠 CARIMBADOR AUTOMÁTICO: MONTAGEM DO DOCUMENTO FINAL COM ESTRUTURA FIXA
            // =========================================================================
            
            const adm = currentPatient.admissionData || currentPatient.admissoes || {};
            const origem = adm.origem || "Não informada";
            const historia = adm.historia || "Sem registro";
            const diagAgudos = adm.diagAgudos || "Sem registro";
            const hpp = adm.diagCronicos || "Sem registro";
            const medsHabituais = adm.medicamentos || "Sem registro";
            
            const saps3Val = currentPatient.saps3?.lockedScore || currentPatient.saps3?.score || "N/A";
            
            // Puxando Exame Físico (do Modal/Aba Médica)
            const exGeral = currentPatient.medical?.exameGeral || "Bom estado geral.";
            const exResp = currentPatient.medical?.exameAR || "Sem alterações relevantes.";
            const exAcv = currentPatient.medical?.exameACV || "RCR em 2T, bulhas normofonéticas, sem sopros.";
            const exAbd = currentPatient.medical?.exameABD || "Sem alterações relevantes.";
            const exExt = currentPatient.medical?.exameExtremidades || "Sem alterações relevantes.";

            // Puxando Exames e Conduta (Novos Campos)
            const examesComp = currentPatient.medical?.examesComplementares || "Aguardando resultados / Sem exames descritos.";
            const conduta = currentPatient.medical?.condutaPlano || "Mantidas condutas prévias. Monitoramento contínuo.";
            const obsImportantes = currentPatient.medical?.observacoesImportantes || "Sem observações adicionais.";

            // Formatando listas de Sedação e DVA
            const sedacaoList = currentPatient.neuro?.sedacao && currentPatient.neuro?.drogasSedacao?.length > 0 
              ? currentPatient.neuro.drogasSedacao.join(", ") 
              : "Sem uso de sedativos em bomba";
              
            const dvaList = currentPatient.cardio?.dva && currentPatient.cardio?.drogasDVA?.length > 0 
              ? currentPatient.cardio.drogasDVA.join(", ") 
              : "Sem uso de drogas vasoativas";

            // Montando o Template Final
            const evolutionCompleta = `EVOLUÇÃO DIÁRIA
ORIGEM: ${origem}
SAPS3: ${saps3Val}

HISTÓRIA CLÍNICA:
${historia}

DIAGNÓSTICOS AGUDOS:
${diagAgudos}

HPP:
${hpp}

MEDICAMENTOS DE USO HABITUAL:
${medsHabituais}

EXAME FÍSICO:
GERAL: ${exGeral}
AR: ${exResp}
ACV: ${exAcv}
ABD.: ${exAbd}
EXTREMIDADES: ${exExt}

SEDAÇÃO: ${sedacaoList}

DVA: ${dvaList}

EVOLUÇÃO E INTERCORRÊNCIAS:
${aiEvolucaoClinica}

OBSERVAÇÕES IMPORTANTES:
${obsImportantes}

EXAMES COMPLEMENTARES:
${examesComp}

CONDUTA:
${conduta}
`;

            // =========================================================================
            // 🚨 LOGICA DA CCIH: REGISTRO DE CULTURAS (CORREÇÃO DE ESTRUTURA)
            // =========================================================================
            try {
              if (dadosDoTimeout?.culturaColetadaHoje && dadosDoTimeout?.culturasTipos?.length > 0) {
                
                let historicoCulturas = [];
                // 1. Lê da gaveta correta ("lista")
                if (currentPatient.culturas && Array.isArray(currentPatient.culturas.lista)) {
                  historicoCulturas = [...currentPatient.culturas.lista];
                }

                const hojeISO = new Date().toISOString().split('T')[0];

                // 2. Adiciona as novas
                dadosDoTimeout.culturasTipos.forEach(tipo => {
                  let nomeMaterial = tipo;
                  if (tipo === "Outro" && dadosDoTimeout.culturaOutroDetalhe) {
                    nomeMaterial = `Outro (${dadosDoTimeout.culturaOutroDetalhe})`;
                  }

                  const jaExisteNoMesmoDia = historicoCulturas.some(
                    c => c.tipo === nomeMaterial && c.dataColeta === hojeISO
                  );

                  if (!jaExisteNoMesmoDia) {
                    historicoCulturas.push({
                      id: `cult_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                      tipo: nomeMaterial,
                      dataColeta: hojeISO,
                      status: "Pendente",
                      germe: "",
                      analiseIA: "",
                      dataResultado: ""
                    });
                  }
                });

                // 3. Salva na gaveta nomeada "lista" (O Firebase vai amar isso)
                updateNested("culturas", "lista", historicoCulturas);
              }
            } catch (ccihError) {
              console.error("Erro ao registrar cultura:", ccihError);
            }

            setAiEvolution(evolutionCompleta);
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

  // --- 1. INICIAR ADMISSÃO DA NUTRIÇÃO (Campo Estéril) ---
  const handleNutriAdmission = () => {
    // CAMPO ESTÉRIL ABSOLUTO: Prancheta 100% vazia para não puxar lixo de memória
    setNutriAdmissionData({
      peso: "",
      tipoMedicaoPeso: "",
      metaCalTotal: "",
      metaCalDiaria: "",
      metaProtTotal: "",
      risco_nutricional: "",
      via: "",
      caracteristicasDieta: []
    });

    setShowNutriAdmissionModal(true);
  };

  // --- 2. VER ADMISSÃO DA NUTRIÇÃO (Leitura do Cofre) ---
  const handleViewNutriAdmission = () => {
    const p = currentPatient;
    if (!p) return;

    // Procura na gaveta correta (priorizando o cofre imutável)
    const cofre = p.admissaoNutricao || p.nutri || {};

    setNutriAdmissionData({
      peso: cofre.peso || "",
      tipoMedicaoPeso: cofre.tipoMedicaoPeso || "",
      metaCalTotal: cofre.metaCalTotal || "",
      metaCalDiaria: cofre.metaCalDiaria || "",
      metaProtTotal: cofre.metaProtTotal || "",
      metaProtDiaria: cofre.metaProtDiaria || "", // 👈 O CAMPO NOVO ADICIONADO AQUI!
      risco_nutricional: cofre.risco_nutricional || "",
      via: cofre.via || "",
      caracteristicasDieta: cofre.caracteristicasDieta || []
    });

    setShowNutriAdmissionModal(true);
  };

  // --- 3. FINALIZAR ADMISSÃO DA NUTRIÇÃO (O Cofre Blindado) ---
  const handleFinalizeNutriAdmission = () => {
    // A TRAVA DE SEGURANÇA (Hard Stop)
    if (!nutriAdmissionData.peso || String(nutriAdmissionData.peso).trim() === "") {
      return alert("⚠️ O Peso Atual é OBRIGATÓRIO.\nSem esta informação, é impossível traçar as metas calóricas e proteicas do paciente na UTI.");
    }

    // O CLONE PROFUNDO DA MÉDICA (Rompe o vínculo de memória)
    const r = patients[activeTab] ? JSON.parse(JSON.stringify(patients[activeTab])) : {};

    // 1. O COFRE DA NUTRIÇÃO (Congela a imagem inicial na raiz)
    if (!r.admissaoNutricao) {
      r.admissaoNutricao = {
        ...nutriAdmissionData,
        dataRegistroAdmissao: new Date().toISOString()
      };
    }

    // 2. A LOUSA DO DIA A DIA (Abastece o painel de evolução diária)
    r.nutri = {
      ...(r.nutri || {}),
      ...nutriAdmissionData,
      admitido: true // 🔑 Libera o painel principal da nutrição
    };

    // ATUALIZAÇÃO IMEDIATA DA TELA
    const up = [...patients];
    up[activeTab] = r;
    setPatients(up);
    
    // O CARIMBADOR FIREBASE
    if (typeof save === "function") {
      save(r, `Nutrição: Admissão Finalizada (Peso: ${nutriAdmissionData.peso}kg | Risco: ${nutriAdmissionData.risco_nutricional || "N/A"})`);
    }

    setShowNutriAdmissionModal(false);
  };

  // ==========================================
  // IA DA ENFERMAGEM (PROMPT E API)
  // ==========================================
  const buildNursingAIPrompt = (p, registrosCarrinho = []) => {
    if (!p) return "";

    const safeNum = (val) => {
      const n = parseFloat(String(val).replace(",", "."));
      return isNaN(n) ? 0 : n;
    };
    const isFem = p.sexo === 'F';

    // 1. NEUROLÓGICO
    const sedacaoText = p.neuro?.sedacao ? "em sedação contínua" : "sem sedação contínua";
    const glasgowAO = p.neuro?.glasgowAO ? parseInt(p.neuro.glasgowAO) : 0;
    const glasgowRV = p.neuro?.glasgowRV?.startsWith("T") ? 1 : (parseInt(p.neuro?.glasgowRV) || 0);
    const glasgowRM = p.neuro?.glasgowRM ? parseInt(p.neuro.glasgowRM) : 0;
    const glasgowTotal = (glasgowAO + glasgowRV + glasgowRM) || "NT";
    const rass = p.neuro?.rass || "NT";

    const neuroFrase = p.neuro?.sedacao
      ? `${sedacaoText}, com RASS ${rass}`
      : `${sedacaoText}, com Glasgow ${glasgowTotal}`;

    // 2. SINAIS VITAIS (SpO2, FC, PA)
    const vitals = p.bh?.vitals || {};
    let spo2Min = 100, fcMax = 0, fcMin = 0, pasMax = 0, pasMin = 0;
    let hasSpo2 = false;

    Object.values(vitals).forEach((v) => {
      if (!v) return;
      const s = safeNum(v["SpO2 (%)"]);
      if (s > 0) { hasSpo2 = true; if (s < spo2Min) spo2Min = s; }
      
      const fc = safeNum(v["FC (bpm)"]);
      if (fc > 0) { if (fcMax === 0 || fc > fcMax) fcMax = fc; if (fcMin === 0 || fc < fcMin) fcMin = fc; }
      
      const pas = safeNum(v["PAS"]);
      if (pas > 0) { if (pasMax === 0 || pas > pasMax) pasMax = pas; if (pasMin === 0 || pas < pasMin) pasMin = pas; }
    });

    // 3. RESPIRATÓRIO
    let suporteVM = p.physio?.suporte || "Ar Ambiente";
    if (suporteVM.toLowerCase() === "ar ambiente") suporteVM = "em ar ambiente";
    else if (suporteVM === "VM") suporteVM = "em VM por TOT";
    else suporteVM = `em uso de ${suporteVM}`;

    let spo2Status = "sem registro de SpO2";
    if (hasSpo2) {
      if (spo2Min > 92) spo2Status = "mantendo boa SpO2";
      else if (spo2Min >= 89) spo2Status = "com SpO2 rasa";
      else spo2Status = "com baixa SpO2";
    }

    const secrecao = p.physio?.secrecao 
      ? `presença de secreção (${p.physio?.secrecaoAspecto || "N/A"}, ${p.physio?.secrecaoColoracao || "N/A"})` 
      : "sem evidência de secreções em via aérea";

    const respFrase = `${suporteVM}, ${spo2Status}, ${secrecao}`;

    // 4. CARDIOVASCULAR
    const usaDVA = p.cardio?.dva === true;
    let hemodinamicaStatus = "Compensado hemodinamicamente";

    if (usaDVA && p.bh?.gains && typeof BH_HOURS !== 'undefined') {
      let noraVals = [];
      BH_HOURS.forEach((h) => {
        const v = p.bh.gains[h]?.["Noradrenalina"];
        if (v !== undefined && v !== "") {
          const num = parseFloat(String(v).replace(",", "."));
          if (!isNaN(num)) noraVals.push(num);
        }
      });
      if (noraVals.length > 0) {
        const last3 = noraVals.slice(-3);
        let instavel = false;
        if (last3.length === 2) instavel = last3[1] > last3[0];
        else if (last3.length >= 3) instavel = last3[2] > last3[1] || (last3[2] === last3[1] && last3[1] > last3[0]);
        hemodinamicaStatus = instavel ? "Hemodinamicamente instável" : "Compensado hemodinamicamente";
      }
    } else if (!usaDVA) {
       hemodinamicaStatus = "Estável hemodinamicamente";
    }

    const fcStatus = fcMax > 100 ? (isFem ? "taquicárdica" : "taquicárdico") : (fcMin > 0 && fcMin < 60 ? (isFem ? "bradicárdica" : "bradicárdico") : (isFem ? "normocárdica" : "normocárdico"));
    const paStatus = (pasMin > 0 && pasMin < 90) ? (isFem ? "hipotensa" : "hipotenso") : (pasMax > 160 ? (isFem ? "hipertensa" : "hipertenso") : (isFem ? "normotensa" : "normotenso"));

    const dvaFrase = usaDVA ? `(em uso de DVA: ${p.cardio?.drogasDVA?.join(", ") || "N/A"})` : "(sem uso de DVA)";
    
    const cardioFrase = `${hemodinamicaStatus} ${dvaFrase}, apresentando-se ${fcStatus} e ${paStatus}`;

    // 5. DIGESTÓRIO
    const temRegistroPositivo = (valor) => {
      if (!valor) return false;
      const texto = String(valor).trim().toLowerCase();
      if (texto === "" || texto === "0" || texto === "n" || texto === "nao" || texto === "não" || texto === "-") return false;
      return true; 
    };

    let temVomitoNoBH = false, temDiarreiaNoBH = false, temEvacuacaoNoBH = false; 
    if (p.bh?.losses) {
      Object.values(p.bh.losses).forEach(hora => {
        if (!hora) return;
        if (temRegistroPositivo(hora["Vômitos"]) || temRegistroPositivo(hora["Vomitos"])) temVomitoNoBH = true;
        if (temRegistroPositivo(hora["Diarreia"]) || temRegistroPositivo(hora["Diarréia"])) temDiarreiaNoBH = true;
        if (temRegistroPositivo(hora["Evacuação"]) || temRegistroPositivo(hora["Evacuacao"]) || temRegistroPositivo(hora["Fezes"])) temEvacuacaoNoBH = true;
      });
    }

    const viaDieta = p.nutri?.via ? p.nutri.via : "via não especificada";
    const sneTexto = p.enfermagem?.sneData ? `Sonda Nasoenteral (SNE) a ${p.enfermagem.sneCm || "NT"}cm em uso. ` : "";
    
    const dataEvac = p.gastro?.dataUltimaEvacuacao;
    let evacDaysStr = dataEvac 
      ? (typeof calculateEvacDays === 'function' ? calculateEvacDays(dataEvac) : dataEvac)
      : "sem registro de evacuações durante essa internação";
    if (temEvacuacaoNoBH) evacDaysStr = "hoje";

    let tgiIntercorrencias = "";
    if (temVomitoNoBH && temDiarreiaNoBH) tgiIntercorrencias = " Houve registro de vômitos e diarreia.";
    else if (temVomitoNoBH) tgiIntercorrencias = " Houve registro de vômito.";
    else if (temDiarreiaNoBH) tgiIntercorrencias = " Houve registro de diarreia.";

    const digestorioFrase = `Dieta via ${viaDieta}. ${sneTexto}Última evacuação: ${evacDaysStr}.${tgiIntercorrencias}`;

    // 6. GENITURINÁRIO
    let diureseStatus = "boa diurese";
    if (typeof calculateDiurese12hMlKgH === "function") {
      const diureseNum = parseFloat(calculateDiurese12hMlKgH(p));
      if (!isNaN(diureseNum) && diureseNum < 0.5) diureseStatus = "baixa diurese";
    }
    const svdTexto = p.enfermagem?.svd ? "Sonda Vesical de Demora (SVD) em uso" : "Sem SVD em uso";
    const diureseAspecto = p.enfermagem?.diureseCaracteristica || "não especificado";
    
    const geniFrase = `${svdTexto}, com ${diureseStatus} de aspecto ${diureseAspecto.toLowerCase()}`;

    // 7. TEGUMENTAR
    const lesoesArray = p.enfermagem?.lesoes || [];
    const tegumentarFrase = lesoesArray.length > 0 
      ? lesoesArray.map(l => 
          `${l.origem === 'incidencia' ? 'Lesão adquirida na UTI' : 'Lesão prévia'}: ${l.localizacao}${l.curativo ? ` — Curativo: ${l.curativo}` : ''}`
        ).join('. ')
      : "Pele íntegra";

    // 8. DISPOSITIVOS E INTERCORRÊNCIAS
    const hoje = new Date();
    const hojeISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

    const dispositivos = [
      // AVP
      ...(p.enfermagem?.avpLocal ? [`- Acesso Venoso Periférico (AVP) em ${p.enfermagem.avpLocal}${p.enfermagem.avpCalibre ? ` (${p.enfermagem.avpCalibre})` : ''}`] : []),
      
      // CVC / PICC (só se NÃO foi retirado hoje)
      ...(p.enfermagem?.cvcLocal && p.enfermagem?.cvcRetiradaData !== hojeISO ? [`- ${p.enfermagem.cvcTipo === 'PICC' ? 'Cateter de Inserção Periférica (PICC)' : 'Cateter Venoso Central (CVC)'} em ${p.enfermagem.cvcLocal}`] : []),
      
      // Shiley / Traqueostomia (só se NÃO foi retirado hoje)
      ...(p.enfermagem?.shileyLocal && p.enfermagem?.shileyRetiradaData !== hojeISO ? [`- Traqueostomia (Shiley) em ${p.enfermagem.shileyLocal}`] : []),
      
      // SVD (só se NÃO foi retirado hoje)
      ...(p.enfermagem?.svd && p.enfermagem?.svdRetiradaData !== hojeISO ? ['- Sonda Vesical de Demora (SVD) em uso'] : []),
      
      // SNE
      ...(p.enfermagem?.sneData ? [`- Sonda Nasoenteral (SNE) a ${p.enfermagem.sneCm || 'NT'}cm`] : []),
      
      // Dreno
      ...(p.enfermagem?.drenoTipo ? [`- Dreno ${p.enfermagem.drenoTipo}`] : []),
    ].filter(Boolean);
  
    // 9. REGISTROS DE ENFERMAGEM (Eventos dos Modais - SOMENTE HOJE)
    const eventosRegistros = [];

    // Filtra eventos de HOJE e ordena por horário
    const filtrarHoje = (historico) => {
      if (!Array.isArray(historico)) return [];
      return historico
        .filter(e => {
          // Aceita ambos os formatos: YYYY-MM-DD (ISO) ou DD/MM/YYYY (brasileiro)
          const dataEvento = e.data || '';
          const dataISO = dataEvento.replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, '$3-$2-$1');
          return dataISO === hojeISO;
        })
        .sort((a, b) => (a.horario || a.horarioInicio || '').localeCompare(b.horario || b.horarioInicio || ''));
    };

    // Manutenção SVD
    const svdsHoje = filtrarHoje(p.enfermagem?.historicoManutencaoSVD);
    svdsHoje.forEach(ultimoSVD => {
      const todosCumpridos = ultimoSVD.itens?.todosCumpridos ? '✅' : '❌';
      eventosRegistros.push(`- Manutenção SVD ${ultimoSVD.horario} — ${ultimoSVD.itens?.resumo || 'N/A'} ${todosCumpridos}${ultimoSVD.unidadeInserção ? ` (inserido na ${ultimoSVD.unidadeInserção})` : ''}${ultimoSVD.tipoSonda ? ` — Sonda ${ultimoSVD.tipoSonda}` : ''}`);
    });

    // Gasometria
    const gasesHoje = filtrarHoje(p.enfermagem?.historicoGasometria);
    gasesHoje.forEach(gas => {
      eventosRegistros.push(`- Gasometria ${gas.horario} — ${gas.tipoGasometria}`);
    });

    // Hemotransfusão
    const hemosHoje = filtrarHoje(p.enfermagem?.historicoHemotransfusao);
    hemosHoje.forEach(hemo => {
      eventosRegistros.push(`- Hemotransfusão ${hemo.horarioInicio} — ${hemo.hemocomponente}${hemo.reacao ? ` — Reação: ${hemo.reacao}` : ''}${hemo.suspendeu ? ' ⚠️ Suspensa' : ''}`);
    });

    // ECG
    const ecgsHoje = filtrarHoje(p.enfermagem?.historicoECG);
    ecgsHoje.forEach(ecg => {
      eventosRegistros.push(`- ECG ${ecg.horario}${ecg.posicionamentoV3R ? ' (com V3R/V4R)' : ''}`);
    });

    // Fleet Enema
    const fleetsHoje = filtrarHoje(p.enfermagem?.historicoFleetEnema);
    fleetsHoje.forEach(fleet => {
      eventosRegistros.push(`- Fleet Enema ${fleet.horario}`);
    });

    // NPT
    const nptsHoje = filtrarHoje(p.enfermagem?.historicoNPT);
    nptsHoje.forEach(npt => {
      eventosRegistros.push(`- NPT ${npt.horario}${npt.acessoCentralExclusivo ? ' (Acesso Central / Via Exclusiva ✅)' : ''}`);
    });

    // Aspiração Traqueal
    const aspsHoje = filtrarHoje(p.enfermagem?.historicoAspiracao);
    aspsHoje.forEach(asp => {
      eventosRegistros.push(`- Aspiração Traqueal ${asp.horario} — ${asp.quantidade} / ${asp.caracteristica}${asp.viaAerea ? ` (${asp.viaAerea})` : ''}${asp.oxigenacaoPre ? ` — SatO₂ pré: ${asp.oxigenacaoPre}` : ''}`);
    });

    // Inserção CVC (historicoCVC)
    const cvcsHoje = filtrarHoje(p.enfermagem?.historicoCVC);
    cvcsHoje.forEach(cvc => {
      eventosRegistros.push(`- Inserção CVC ${cvc.horario} — ${cvc.tipoCateter} em ${cvc.localInserção}${cvc.barreiras ? ` (Checklist: ${cvc.barreiras.cumpridas}/${cvc.barreiras.total})` : ''}`);
    });

    // Manutenção CVC (historicoManutencaoCVC)
    const manutCVCsHoje = filtrarHoje(p.enfermagem?.historicoManutencaoCVC);
    manutCVCsHoje.forEach(mcvc => {
      eventosRegistros.push(`- Manutenção CVC ${mcvc.horario}${mcvc.trocaCurativo ? ' — Troca de curativo' : ''}`);
    });

    // Inserção SVD (historicoSVD)
    const svdsInsercaoHoje = filtrarHoje(p.enfermagem?.historicoSVD || []);
    svdsInsercaoHoje.forEach(svd => {
      eventosRegistros.push(`- Inserção SVD ${svd.horario} — ${svd.genero || ''} (${svd.indicacao || 'N/I'}) — ${svd.itens?.resumo || ''}`);
    });

    // Retirada de dispositivos (checklist de dispositivos)
    if (p.enfermagem?.cvcRetiradaData === hojeISO) {
      eventosRegistros.push(`- Retirado CVC de ${p.enfermagem.cvcLocal || 'local não especificado'}`);
    }
    if (p.enfermagem?.shileyRetiradaData === hojeISO) {
      eventosRegistros.push(`- Retirado Shiley de ${p.enfermagem.shileyLocal || 'local não especificado'}`);
    }
    if (p.enfermagem?.svdRetiradaData === hojeISO) {
      eventosRegistros.push(`- Retirado SVD`);
    }

    // Curativo (dentro de lesoes[].historicoCurativos)
    const lesoes = p.enfermagem?.lesoes || [];
    lesoes.forEach(lesao => {
      const curativosHoje = filtrarHoje(lesao.historicoCurativos);
      curativosHoje.forEach(cur => {
        eventosRegistros.push(`- Curativo ${cur.horario} — ${lesao.localizacao || 'N/A'}: ${cur.tipo}${cur.obs ? ` (${cur.obs})` : ''}`);
      });
    });

    // Curativos avulsos (histórico independente — pacientes sem lesão prévia)
    const curativosAvulsosHoje = filtrarHoje(p.enfermagem?.historicoCurativos);
    curativosAvulsosHoje.forEach(cur => {
      eventosRegistros.push(`- Curativo ${cur.horario} — ${cur.local}: ${cur.tipoCurativo}${cur.observacao ? ` (${cur.observacao})` : ''}`);
    });

    // Acesso Periférico (campos avulsos — pega o último registro)
    if (p.enfermagem?.avpData === hojeISO && p.enfermagem?.avpHorario) {
      eventosRegistros.push(`- Acesso Periférico ${p.enfermagem.avpHorario} — ${p.enfermagem.avpLocal} (${p.enfermagem.avpCalibre || 'N/A'})`);
    }

    // Carrinho de Emergência (da coleção carrinhos_emg)
    registrosCarrinho.forEach(car => {
      const statusLaringo = car.laringoscopio === 'Funcionante' ? '✅' : '❌';
      const statusCardio = car.cardioversor === 'Funcionante' ? '✅' : '❌';
      const statusGel = car.gelCondutor === 'Sim' ? '✅' : '❌';
      const statusTabua = car.tabua === 'Sim' ? '✅' : '❌';
      eventosRegistros.push(`- Checklist Carrinho de Emergência ${car.horario} — Lacre Carrinho: ${car.lacreCarrinho || '—'} / Lacre Caixa: ${car.lacreCaixa || '—'} — Laringoscópio ${statusLaringo} | Cardioversor ${statusCardio} | Gel Condutor ${statusGel} | Tábua ${statusTabua}`);
    });

    const eventosTexto = eventosRegistros.length > 0
      ? eventosRegistros.join('\n')
      : 'Nenhum registro adicional no período.';

    const intercorrencias = p.enfermagem?.intercorrencias || "Nenhuma intercorrência relatada.";
    const condutas = p.enfermagem?.condutas || "Cuidados de rotina de enfermagem mantidos.";

    // 9. O PROMPT BLINDADO
    return `
DADOS ESTRUTURADOS:
- NEURO: ${neuroFrase}.
- RESPIRATÓRIO: ${respFrase}.
- CARDIO: ${cardioFrase}.
- GASTRO: ${digestorioFrase}.
- GENI: ${geniFrase}.
- PELE: ${tegumentarFrase}.
DISPOSITIVOS ADICIONAIS:
${dispositivos.length > 0 ? dispositivos.join("\n") : "- Nenhum."}

REGISTROS DE ENFERMAGEM:
${eventosTexto}

INSTRUÇÕES PARA A IA (Enfermeiro da UTI):
Escreva a EVOLUÇÃO DE ENFERMAGEM baseada EXATAMENTE nos dados acima.

REGRAS CRÍTICAS ESTRITAS:
1. NUNCA mencione o nome do paciente. NUNCA use "Paciente encontra-se" ou "O paciente apresenta" no início das frases.
2. Inicie a frase de cada sistema DIRETAMENTE com o conteúdo fornecido (ex: "sem sedação contínua, com Glasgow 15" ou "em ar ambiente, com SpO2 rasa...").
3. É OBRIGATÓRIO copiar o texto de cada sistema EXATAMENTE como foi formatado e montado nos "DADOS ESTRUTURADOS". Não adicione verbos auxiliares e não mude a ordem das palavras.
4. Mantenha os títulos dos sistemas em maiúsculo, exatamente como no formato abaixo.

FORMATO OBRIGATÓRIO:
EVOLUÇÃO DE ENFERMAGEM:

SISTEMA NEUROLÓGICO: [Copia o texto do NEURO]
SISTEMA RESPIRATÓRIO: [Copia o texto do RESPIRATÓRIO]
SISTEMA CARDIOVASCULAR: [Copia o texto do CARDIO]
SISTEMA DIGESTÓRIO: [Copia o texto do GASTRO]
SISTEMA GENITURINÁRIO: [Copia o texto do GENI]
SISTEMA TEGUMENTAR: [Copia o texto do PELE]

DISPOSITIVOS ADICIONAIS:
[A lista fornecida no bloco de dados]

REGISTROS DE ENFERMAGEM:
[Os eventos registrados no período]

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
      const envKey = import.meta.env.VITE_GEMINI_API_KEY_ENF;
      const currentKey = envKey || window.apiKey || "";
      
      console.log("CHAVE IA ENFERMAGEM (GOOGLE): ", currentKey.substring(0, 8) + "...");

      if (!currentKey || currentKey.length < 10 || currentKey === "undefined") {
        throw new Error(`Chave da Enfermagem ausente ou inválida.`);
      }

      // Busca registros do carrinho de EMG de hoje
      const hoje = new Date().toISOString().split('T')[0];
      let registrosCarrinhoHoje = [];
      try {
        const carrinhoSnapshot = await getDocs(
          query(
            collection(db, "carrinho_emg"),
            where("data", "==", hoje)
          )
        );
        registrosCarrinhoHoje = carrinhoSnapshot.docs.map(doc => doc.data());
      } catch (e) {
        console.warn("Erro ao buscar carrinho_emg para evolução:", e);
      }

      const promptText = buildNursingAIPrompt(currentPatient, registrosCarrinhoHoje);
      
      const modelsToTry = ["gemini-2.5-flash"];

      for (const model of modelsToTry) {
        try {
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
            // Se for erro de chave (400) ou permissão (403), ele para. Se for modelo não encontrado, tenta o próximo.
            if (d.error.code === 400 || d.error.code === 403) break;
            if (lastError.includes("not found") || d.error.code === 404) continue;
            break;
          }

          const aiResponse = d.candidates?.[0]?.content?.parts?.[0]?.text;
          if (aiResponse) {
            // Escreve a evolução na tela da enfermagem
            updateNested("enfermagem", "anotacoes", aiResponse.trim());
            // Salva no banco de dados automaticamente com o carimbo do usuário
            save(currentPatient, "Enfermagem: Gerou evolução utilizando Inteligência Artificial");
          }
          success = true;
          break;
        } catch (e) {
          lastError = e.message;
        }
      }
      if (!success) alert(`Erro IA: ${lastError}`);
    } catch (e) {
      alert(`Não foi possível gerar a evolução por IA: ${e.message}`);
    } finally {
      setIsGeneratingNursingAI(false);
    }
  };

  // ==============================================================
  // GERADOR AUTOMÁTICO DE EVOLUÇÃO (FISIOTERAPIA - MODELO OFICIAL)
  // ==============================================================
const handleGeneratePhysioEvo = () => {
    const p = patients[activeTab];
    if (!p) return;

    const phy = p.physio || {};
    const hoje = new Date().toLocaleDateString('pt-BR');

    const getField = (key) => {
      const val = p[key] || p.medical?.[key] || p.admissionData?.[key] || p.admissao?.[key];
      return (val && val.trim() !== "") ? val : "Não registrado na aba médica.";
    };

    const formatDt = (iso) => {
      if (!iso) return "___/___/___";
      const [y, m, d] = iso.split('-');
      return `${d}/${m}/${y.slice(-2)}`;
    };

    const getTroca7d = (iso) => {
      if (!iso) return "___/___/___";
      const d = new Date(iso + 'T12:00:00');
      d.setDate(d.getDate() + 7);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = String(d.getFullYear()).slice(-2);
      return `${dd}/${mm}/${yy}`;
    };

    const parseDateForSort = (str) => {
      if (!str) return 0;
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const [y, m, d] = str.split('-');
        return new Date(y, m - 1, d, 0, 0).getTime();
      }
      const dMatch = str.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
      if (dMatch) {
        const day = parseInt(dMatch[1], 10);
        const month = parseInt(dMatch[2], 10) - 1;
        let year = dMatch[3] ? (dMatch[3].length === 2 ? 2000 + parseInt(dMatch[3], 10) : parseInt(dMatch[3], 10)) : new Date().getFullYear();
        let hour = 0, min = 0;
        const tMatch = str.match(/(?:-|\s|às)\s*(\d{1,2})(?:[hH:](\d{2})?)?/i);
        if (tMatch) { hour = parseInt(tMatch[1], 10); min = tMatch[2] ? parseInt(tMatch[2], 10) : 0; }
        return new Date(year, month, day, hour, min).getTime();
      }
      return 0;
    };

    // 🔥 GASOMETRIAS DO DIA
    let gasoTxt = "";
    if (p.gasometriaHistory) {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const endOfToday = startOfToday + 24 * 60 * 60 * 1000 - 1;

      const keys = Object.keys(p.gasometriaHistory).sort((a, b) => parseDateForSort(a) - parseDateForSort(b));
      
      const keysHoje = keys.filter(k => {
        const t = parseDateForSort(k);
        return t >= startOfToday && t <= endOfToday;
      });

      if (keysHoje.length > 0) {
        keysHoje.forEach(k => {
          const g = p.gasometriaHistory[k];
          
          const dateObj = new Date(parseDateForSort(k));
          const dd = String(dateObj.getDate()).padStart(2, '0');
          const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
          const yyyy = dateObj.getFullYear();
          const hh = String(dateObj.getHours()).padStart(2, '0');
          const min = String(dateObj.getMinutes()).padStart(2, '0');
          
          let dataFormatada = `${dd}-${mm}-${yyyy}`;
          if (hh !== '00' || min !== '00') {
            dataFormatada += ` às ${hh}:${min}`;
          }

          gasoTxt += `[${dataFormatada}] pH: ${g['pH']||'-'} | pCO2: ${g['pCO2']||'-'} | PaO2: ${g['PaO2']||'-'} | HCO3: ${g['HCO3']||'-'} | BE: ${g['BE']||'-'} | SatO2: ${g['SatO2']||'-'} | FiO2: ${g['FiO2']||'-'} | P/F: ${g['P/F']||'-'}\n`;
        });
      } else {
        gasoTxt = "Nenhuma gasometria registrada no dia de hoje.\n";
      }
    } else {
      gasoTxt = "Nenhuma gasometria registrada no sistema.\n";
    }
    
    gasoTxt = gasoTxt.trim();

    // --- CONSTRUÇÃO DO TEXTO ---
    let evo = `EVOLUÇÃO FISIOTERAPÊUTICA\n\n`;

    evo += `--- HISTÓRIA E DIAGNÓSTICOS ---\n`;
    evo += `História Clínica:\n${getField('historia')}\n\n`;
    evo += `Diagnósticos Agudos:\n${getField('diagAgudos')}\n\n`;
    evo += `HPP:\n${getField('diagCronicos')}\n\n`;
    evo += `MEDICAMENTOS DE USO HABITUAL:\n${getField('medicamentos')}\n\n`;
    
    const consc = getField('conscienciaBasal');
    evo += `NÍVEL DE CONSCIÊNCIA BASAL: ${consc === "Não registrado na aba médica." ? "Não registrado." : consc}\n`;
    const mob = getField('mobilidadeBasal');
    evo += `MOBILIDADE BASAL: ${mob === "Não registrado na aba médica." ? "Não registrado." : mob}\n\n`;

    evo += `--- AVALIAÇÃO POR SISTEMAS ---\n`;
    evo += `ESTADO GERAL: ${phy.estadoGeral || "Não registrado."}\n\n`;
    evo += `NEUROLÓGICO: ${phy.sistemaNervoso || "Não registrado."}\n\n`;
    evo += `RESPIRATÓRIO: ${phy.sistemaRespiratorio || "Não registrado."}\n\n`;
    evo += `CARDIOVASCULAR: ${phy.sistemaCardiovascular || "Não registrado."}\n\n`;
    evo += `GASTROINTESTINAL/ABDOME: ${phy.sistemaDigestivo || "Não registrado."}\n\n`;
    evo += `MUSCULOESQUELÉTICO: ${phy.sistemaMusculoesqueletico || "Não registrado."}\n\n`;

    evo += `--- GASOMETRIA ---\n`;
    evo += `${gasoTxt}\n\n`;

    evo += `--- SUPORTE VENTILATÓRIO ---\n`;
    evo += `Suporte Atual: ${phy.suporte || "Ar Ambiente"}\n`;
    evo += `Tempo de VM: ${getTempoVMText(p) || "-"}\n`;
    evo += `Parâmetros: Modo: ${phy.parametro || "-"} | PEEP: ${phy.peep || "-"} | FiO2: ${phy.fiO2 || "-"}%\n`;
    evo += `Ajustes realizados: [ DIGITE AQUI OS AJUSTES REALIZADOS NO PLANTÃO ]\n\n`;

    evo += `Filtro HMEF:\n`;
    evo += `- Instalação: ${formatDt(phy.dataHMEF)}\n`;
    evo += `- Troca Prevista (7 dias): ${getTroca7d(phy.dataHMEF)}\n\n`;

    evo += `Sistema Fechado de Aspiração (Trach Care):\n`;
    evo += `- Instalação: ${formatDt(phy.dataSFA)}\n`;
    evo += `- Troca Prevista (7 dias): ${getTroca7d(phy.dataSFA)}\n\n`;

    evo += `Pressão do Cuff (cmH2O):\n`;
    evo += `Manhã: ${phy.cuffM || "-"} | Tarde: ${phy.cuffT || "-"} | Noite: ${phy.cuffN || "-"}\n\n`;

    evo += `--- CONDUTAS E PLANOS ---\n`;
    evo += `INTERCORRÊNCIAS DO PLANTÃO:\n${phy.intercorrencias || "Sem intercorrências no plantão."}\n\n`;

    // 🔥 Condutas + Mobilização (sem espaço entre eles)
    let condutasTexto = phy.condutas || phy.admissao_condutas || "Não registrado.";
    const mobArray = Array.isArray(phy.mobilizacao) ? phy.mobilizacao : [];
    if (mobArray.length > 0) {
      condutasTexto += `\n\nFoi realizado as seguintes condutas motoras:\n${mobArray.map(m => `• ${m}`).join('\n')}`;
    }
    evo += `CONDUTAS FISIOTERAPÊUTICAS REALIZADAS:\n${condutasTexto}\n\n`;

    // 🔥 Escalas (pulando uma linha após condutas)
    const mrcHoje = typeof phy.mrcScore === 'object' ? (phy.mrcScore[hoje] || "") : (phy.mrcScore || "");
    const imsHoje = typeof phy.icuMobilityScale === 'object' ? (phy.icuMobilityScale[hoje] || "") : (phy.icuMobilityScale || "");
    
    let escalasTexto = "";
    if (mrcHoje) {
      escalasTexto += `ESCORE MRC: ${mrcHoje}\n`;
    }
    if (imsHoje) {
      escalasTexto += `IMS (ICU Mobility Scale): ${imsHoje}`;
    }
    if (escalasTexto) {
      evo += `${escalasTexto}\n\n`;
    }

    evo += `PLANO / METAS PARA O PRÓXIMO PLANTÃO:\n${phy.planoMetas || "Manter condutas atuais."}`;

    setPhysioEvoText(evo);
    setShowPhysioEvoModal(true);
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

// 1. Função Vital: Atualizar células do BH (Agora com Roteamento Histórico)
  const updateBH = (hour, category, item, value) => {
    setPatients(prev => {
      const up = [...prev];
      const p = JSON.parse(JSON.stringify(up[activeTab])); // Cópia profunda para não ferir o estado

      // A. O Roteador: Identifica se estamos editando o Hoje ou o Passado
      const logicalToday = getLogicalDate();
      const isHistorical = selectedBHDate !== (p.bh?.date || logicalToday);

      let targetBH; // O ponteiro que vai guiar onde salvaremos o dado

      if (isHistorical) {
        // B. Rota do Histórico: Garante que o arquivo morto existe
        if (!p.historico_bh) p.historico_bh = [];
        
        // Localiza a gaveta exata do dia que foi destravado na Caixa Preta
        let historyIndex = p.historico_bh.findIndex(h => h.date === selectedBHDate);
        
        // Failsafe de segurança: se a gaveta não existir, cria uma para a data
        if (historyIndex === -1) {
          p.historico_bh.push({ date: selectedBHDate, gains: {}, losses: {}, vitals: {}, irrigation: {} });
          historyIndex = p.historico_bh.length - 1;
        }
        
        targetBH = p.historico_bh[historyIndex];
      } else {
        // C. Rota do Hoje: Edição do plantão ativo
        if (!p.bh) p.bh = { date: logicalToday, gains: {}, losses: {}, vitals: {}, irrigation: {} };
        targetBH = p.bh;
      }

      // D. A Injeção do Dado no local correto
      if (!targetBH[category]) targetBH[category] = {};
      
      if (category === "irrigation") {
        targetBH.irrigation[hour] = value;
      } else {
        if (!targetBH[category][hour]) targetBH[category][hour] = {};
        targetBH[category][hour][item] = value;
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

const handleFinalizeNursingAdmission = async () => {
    const reqBraden = [
      "braden_percepcao", "braden_umidade", "braden_atividade",
      "braden_mobilidade", "braden_nutricao", "braden_friccao",
    ];
    const reqMorse = [
      "morse_historico", "morse_diagnostico", "morse_auxilio",
      "morse_terapiaIV", "morse_marcha", "morse_estadoMental",
    ];

    // 1. VALIDAÇÃO DE SEGURANÇA (Hard Stop)
    for (let k of [...reqBraden, ...reqMorse]) {
      if (nursingData[k] === "" || nursingData[k] === null || nursingData[k] === undefined) {
        alert("O preenchimento de todos os fatores das Escalas de Braden e Morse é obrigatório.");
        return;
      }
    }

    // 2. MATEMÁTICA DAS ESCALAS
    const bradenTotal = reqBraden.reduce((acc, curr) => acc + (parseInt(nursingData[curr]) || 0), 0);
    let bradenRisco = bradenTotal <= 9 ? "Altíssimo" : bradenTotal <= 12 ? "Alto" : bradenTotal <= 14 ? "Moderado" : bradenTotal <= 18 ? "Leve" : "Sem Risco";

    const morseTotal = reqMorse.reduce((acc, curr) => acc + (parseInt(nursingData[curr]) || 0), 0);
    let morseRisco = morseTotal >= 45 ? "Alto" : morseTotal >= 25 ? "Baixo" : "Sem Risco";

    // 3. RECUPERANDO DADOS MÉDICOS COM CLONE PROFUNDO (O Padrão Ouro)
    const pacienteBase = patients[activeTab];
    const r = pacienteBase ? JSON.parse(JSON.stringify(pacienteBase)) : {};
    
    const adm = r.admissionData || r.admissoes || {};
    const historia = adm.historia || "Sem registro prévio";

    // 4. PROCESSAMENTO DE LESÕES (Blindagem contra apagamento)
    const lesoesLista = nursingData.lesoes || r.enfermagem?.lesoes || r.admissaoEnfermagem?.lesoes || [];
    const textoLesoes = lesoesLista.length > 0 
      ? lesoesLista.map(l => `- [${l.origem === 'incidencia' ? 'ADQUIRIDA NA UTI' : 'PRÉVIA'}] ${l.localizacao}. Curativo: ${l.curativo || "Não especificado"}`).join('\n')
      : "Pele íntegra / Sem lesões por pressão.";

    // 5. O NOVO CARIMBADOR (Texto Integrado para Evolução)
    const text = `ADMISSÃO DE ENFERMAGEM

--- HISTÓRIA CLÍNICA (ADMISSÃO MÉDICA) ---
${historia}

--- DADOS DE ENFERMAGEM ---
Escala de Dor: ${nursingData.dor || "0"} | Hemodiálise: ${nursingData.hemodialise ? "Sim" : "Não"}
Precauções: ${nursingData.precaucao || "Padrão"}

DISPOSITIVOS INVASIVOS E DATAS:
AVP: ${nursingData.avpLocal ? `${nursingData.avpLocal} (Data: ${nursingData.avpData || "-"})` : "Não possui"}
CVC/PICC: ${nursingData.cvcLocal ? `${nursingData.cvcLocal} (Ins: ${nursingData.cvcData || "-"}) ${nursingData.cvcRetiradaData ? `| RETIRADA: ${nursingData.cvcRetiradaData}` : ""}` : "Não possui"}
SHILEY: ${nursingData.shileyLocal ? `${nursingData.shileyLocal} (Ins: ${nursingData.shileyData || "-"}) ${nursingData.shileyRetiradaData ? `| RETIRADA: ${nursingData.shileyRetiradaData}` : ""}` : "Não possui"}
SVD: ${nursingData.svdData ? `Sim (Ins: ${nursingData.svdData}) ${nursingData.svdRetiradaData ? `| RETIRADA: ${nursingData.svdRetiradaData}` : ""}` : "Não possui"}
SNE: ${nursingData.sneCm ? `Fixação em ${nursingData.sneCm} cm (Data: ${nursingData.sneData || "-"})` : "Não possui"}
Drenos: ${nursingData.drenoTipo || "Nenhum"}

INTEGRIDADE CUTÂNEA E CURATIVOS:
${textoLesoes}

ESCALAS DE RISCO:
- BRADEN: ${bradenTotal} pontos (Risco: ${bradenRisco})
- MORSE: ${morseTotal} pontos (Risco de Queda: ${morseRisco})

---
Documento gerado eletronicamente e registrado nos indicadores de performance da unidade.
`;

    // =========================================================================
    // 6. 🛡️ ATUALIZAÇÃO BLINDADA DO OBJETO DO PACIENTE (Filtro Anti-Rejeição)
    // =========================================================================
    
    // O COFRE DA ENFERMAGEM: Se não existe, cria a admissão imutável
    if (!r.admissaoEnfermagem) {
      r.admissaoEnfermagem = JSON.parse(JSON.stringify({
        ...nursingData,
        lesoes: lesoesLista,
        dataRegistroAdmissao: new Date().toISOString()
      }));
    }

    // A LOUSA DIÁRIA: Abastece o painel de evolução diário
    r.enfermagem = JSON.parse(JSON.stringify({ 
      ...(r.enfermagem || {}), 
      ...nursingData, 
      lesoes: lesoesLista 
    }));
    
    // Atualiza a interface gráfica imediatamente
    const up = [...patients];
    up[activeTab] = r;
    setPatients(up);

    if (typeof save === "function") {
      save(r, "Enfermagem: Admissão e Indicadores Atualizados");
    }

    // =========================================================================
    // 7. TRADUÇÃO DOS DETALHES DAS ESCALAS PARA AUDITORIA
    // =========================================================================
    const detalhesBraden = {
      percepcaoSensorial: BRADEN_OPTIONS.percepcao.find(opt => opt.value == nursingData.braden_percepcao)?.label || "N/D",
      umidade: BRADEN_OPTIONS.umidade.find(opt => opt.value == nursingData.braden_umidade)?.label || "N/D",
      atividade: BRADEN_OPTIONS.atividade.find(opt => opt.value == nursingData.braden_atividade)?.label || "N/D",
      mobilidade: BRADEN_OPTIONS.mobilidade.find(opt => opt.value == nursingData.braden_mobilidade)?.label || "N/D",
      nutricao: BRADEN_OPTIONS.nutricao.find(opt => opt.value == nursingData.braden_nutricao)?.label || "N/D",
      friccaoCisalhamento: BRADEN_OPTIONS.friccao.find(opt => opt.value == nursingData.braden_friccao)?.label || "N/D",
    };

    const detalhesMorse = {
      historicoDeQuedas: MORSE_OPTIONS.historico.find(opt => opt.value == nursingData.morse_historico)?.label || "N/D",
      diagnosticoSecundario: MORSE_OPTIONS.diagnostico.find(opt => opt.value == nursingData.morse_diagnostico)?.label || "N/D",
      auxilioNaMarcha: MORSE_OPTIONS.auxilio.find(opt => opt.value == nursingData.morse_auxilio)?.label || "N/D",
      terapiaEndovenosa: MORSE_OPTIONS.terapiaIV.find(opt => opt.value == nursingData.morse_terapiaIV)?.label || "N/D",
      marcha: MORSE_OPTIONS.marcha.find(opt => opt.value == nursingData.morse_marcha)?.label || "N/D",
      estadoMental: MORSE_OPTIONS.estadoMental.find(opt => opt.value == nursingData.morse_estadoMental)?.label || "N/D",
    };

    // 8. CARIMBADOR DE INDICADORES (Firebase)
    try {
      const historicoRef = collection(db, "indicadores_performance");
      const baseData = {
        cpf: r.cpf,
        idInternacao: r.idInternacao,
        dataRegistro: serverTimestamp(),
        nomePaciente: r.nome
      };

      await addDoc(historicoRef, { ...baseData, tipo: "BRADEN", valor: bradenTotal, risco: bradenRisco, respostas: detalhesBraden });
      await addDoc(historicoRef, { ...baseData, tipo: "MORSE", valor: morseTotal, risco: morseRisco, respostas: detalhesMorse });

      const dispositivos = [
        { nome: "SVD", ativo: !!nursingData.svdData, inicio: nursingData.svdData, fim: nursingData.svdRetiradaData },
        { nome: "CVC", ativo: !!nursingData.cvcLocal, inicio: nursingData.cvcData, fim: nursingData.cvcRetiradaData },
        { nome: "SHILEY", ativo: !!nursingData.shileyLocal, inicio: nursingData.shileyData, fim: nursingData.shileyRetiradaData }
      ];

      for (let disp of dispositivos) {
        if (disp.ativo) {
          await addDoc(historicoRef, { ...baseData, tipo: "DISPOSITIVO_INICIO", nome: disp.nome, data: disp.inicio });
          if (disp.fim) {
            await addDoc(historicoRef, { ...baseData, tipo: "DISPOSITIVO_FIM", nome: disp.nome, data: disp.fim });
          }
        }
      }

      const incidencias = lesoesLista.filter(l => l.origem === "incidencia");
      for (let lpp of incidencias) {
        await addDoc(historicoRef, { ...baseData, tipo: "LPP_INCIDENCIA", local: lpp.localizacao });
      }

      // =========================================================================
      // 💡 AUDITORIA GLOBAL: Registo da Admissão de Enfermagem
      // =========================================================================
      const auditoriaFn = typeof registrarLogAuditoria === "function" 
        ? registrarLogAuditoria 
        : (typeof registarLogAuditoria === "function" ? registarLogAuditoria : null);
      
      if (auditoriaFn) {
        const lesoesPrevias = lesoesLista.filter(l => l.origem !== "incidencia").length;
        auditoriaFn(
          "ADMISSÃO DE ENFERMAGEM FINALIZADA", 
          `Braden: ${bradenTotal} (${bradenRisco}) | LPP Prévia Admissão: ${lesoesPrevias > 0 ? "Sim" : "Não"}`, 
          `Leito ${activeTab + 1}`, 
          r.nome || "Paciente não identificado"
        );
      }

    } catch (e) {
      console.error("Erro ao carimbar indicadores:", e);
    }

    // Finalização da Interface
    setShowNursingModal(false);
    setGeneratedAdmissionText(text);
    setViewMode("nursing"); 
  };

  // ========================================================================
  // MAPA DE VENTILAÇÃO MECÂNICA (FISIOTERAPIA)
  // ========================================================================

const handleAddVmEntry = () => {
    const up = [...patients];
    const p = JSON.parse(JSON.stringify(up[activeTab]));

    if (!p.physio) p.physio = {};
    if (!Array.isArray(p.physio.vmFlowsheet)) p.physio.vmFlowsheet = [];

    const now = new Date();
    const dataHora = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')} - ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 👇 PRÉ-CALCULA E CONGELA os valores no momento da criação
    const diasUti = typeof getDaysD1 === 'function' 
      ? getDaysD1(p.dataInternacao || p.dataAdmissao) 
      : "";
    const diasVm = typeof getTempoVMText === 'function' 
      ? getTempoVMText(p) 
      : "";

    const newEntry = {
      id: Date.now().toString(),
      dataHora: dataHora,
      // 👇 Campos preenchidos automaticamente e congelados
      suporte: p.physio.suporte || "",
      diasUti: diasUti,
      diasVm: diasVm,
      // Campos copiados do painel principal
      modo: p.physio.parametro || "",
      fluxo: p.physio.fluxo || "",
      fio2: p.physio.fiO2 || "",
      peep: p.physio.peep || "",
      vc: p.physio.volCorrente || "",
      pc: p.physio.pressaoControlada || "",
      ps: p.physio.pressaoSuporte || "",
      frSet: p.physio.fr || "",
      frTotal: "",
      // Campos que o modal agora suporta (todos inicializados vazios)
      cuffM: "", cuffT: "", cuffN: "",
      despertarS: false, despertarN: false,
      vtPc: "", vm: "", fluxoInsp: "", tInsp: "", ie: "",
      pPico: "", pPlato: "", dp: "", cst: "",
      cdin: "", rva: "", autoPeep: "", p01: "", irrs: "",
      dispositivo: "", satO2: "", ajustesDia: ""
    };

    p.physio.vmFlowsheet.push(newEntry);

    up[activeTab] = p;
    setPatients(up);

    save(p, "Fisioterapia: Adicionou nova coluna de avaliação no Mapa de Suporte Ventilatório");
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

  // Adiciona uma nova lesão à lista
  const addLesao = () => {
    const lesoesAtuais = currentPatient.enfermagem?.lesoes || [];
    const novaLesao = {
      id: Date.now(), // ID único para controle
      origem: "prevalencia",
      localizacao: "",
      estagio: "",
      curativo: "",
      dataRegistro: new Date().toISOString().split('T')[0]
    };
    updateNested("enfermagem", "lesoes", [...lesoesAtuais, novaLesao]);
  };

  // Remove uma lesão específica
  const removeLesao = (id) => {
    const lesoesAtuais = currentPatient.enfermagem?.lesoes || [];
    const novasLesoes = lesoesAtuais.filter(l => l.id !== id);
    updateNested("enfermagem", "lesoes", novasLesoes);
    handleBlurSave("Enfermagem: Removeu registro de lesão");
  };

  // Atualiza um campo de uma lesão específica
  const updateLesaoData = (id, campo, valor) => {
    const lesoesAtuais = currentPatient.enfermagem?.lesoes || [];
    
    const novasLesoes = lesoesAtuais.map(l => {
      if (l.id === id) {
        // Se mudar para 'incidencia' e não era antes, dispara o evento adverso
        if (campo === "origem" && valor === "incidencia" && l.origem !== "incidencia") {
          
          // 1. Extrai iniciais e leito com segurança
          const iniciais = currentPatient?.nome 
            ? currentPatient.nome.split(" ").map(n => n[0]).join("").substring(0, 3).toUpperCase() 
            : "SN";
          const leito = currentPatient?.leito || currentPatient?.numeroLeito || "SN";

          // 2. Prepara a armadura completa que o painel da Gestão exige
          const dadosEventoAdverso = {
            tipoEvento: "LPP (Adquirida na UTI)",
            descricao: `Nova lesão detectada em: ${l.localizacao || 'Local não informado'}. Conduta inicial: ${l.curativo || 'Não informada'}.`,
            dataHoraOcorrencia: new Date().toISOString(), // Grava o segundo exato
            leitoOcorrencia: leito,
            pacienteIniciais: iniciais,
            statusAnalise: "Pendente NSP",
            grauDano: "Moderado", // Padrão inicial para LPP, o RT audita depois
            idPaciente: currentPatient?.id || "",
            lesaoIdOriginal: id,
            origemNotificacao: "NursingDashboard"
          };

          // 3. Dispara a notificação completa
          registrarEventoAdverso(dadosEventoAdverso);
        }
        
        return { ...l, [campo]: valor };
      }
      return l;
    });
    
    updateNested("enfermagem", "lesoes", novasLesoes);
  };

  // 1. Apenas abre a janela (Trava de segurança ATUALIZADA para Enfermagem)
  const handleClearData = () => {
    // Dupla checagem: Garante que mesmo se o botão for clicado, a função barra perfis não autorizados
    const role = userProfile?.perfil || userProfile?.role;
    if (role !== "Enfermeiro" && role !== "Desenvolvedor") {
      alert("Acesso Negado: A liberação de leito e registro de desfecho é uma atribuição exclusiva da Enfermagem.");
      return;
    }

    const pacienteAtual = patients[activeTab];
    if (!pacienteAtual || !pacienteAtual.nome) {
      alert("Este leito já está vazio.");
      return;
    }
    
    setShowDischargeModal(true); // Abre o modal de desfecho
  };

  // Função para calcular diferença em dias entre duas datas (formato ISO ou string YYYY-MM-DD)
  const calcularDiferencaDias = (dataInicio, dataFim) => {
    if (!dataInicio || !dataFim) return 0;
    const start = new Date(dataInicio);
    const end = new Date(dataFim);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1; // Retorna no mínimo 1 dia se o paciente entrou e saiu no mesmo dia
  };

  // 2. O motor que salva o desfecho, verifica dispositivos e limpa o leito
  const confirmDischarge = async () => {
    if (!dischargeDestination) return alert("Selecione o destino do paciente.");

    const pacienteAtual = patients[activeTab];
    const enf = pacienteAtual.enfermagem || {};

    // 1. Função Auxiliar de Cálculo (Garante que não retorne NaN)
    const calcularDias = (ini, fim) => {
      if (!ini) return 0;
      const dataIni = new Date(ini);
      const dataFim = fim ? new Date(fim) : new Date();
      const diffTime = dataFim - dataIni;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays < 0 ? 0 : diffDays + 1; // Padrão D1, D2...
    };

    // 2. Auditoria de Dispositivos
    let dispositivosAtivos = [];
    if (enf.svd && !enf.svdRetiradaData) dispositivosAtivos.push("Sonda Vesical (SVD)");
    if (enf.cvcLocal && !enf.cvcRetiradaData) dispositivosAtivos.push("Acesso Central (CVC)");
    if (enf.shileyLocal && !enf.shileyRetiradaData) dispositivosAtivos.push("Cateter de Shiley");

    if (dispositivosAtivos.length > 0) {
      const confirmar = window.confirm(
        `⚠️ DISPOSITIVOS SEM DATA DE RETIRADA:\n- ${dispositivosAtivos.join('\n- ')}\n\nDeseja registrar a retirada como HOJE para fechar os indicadores?`
      );
      if (!confirmar) return;
      
      const hojeStr = new Date().toISOString().split('T')[0];
      if (enf.svd && !enf.svdRetiradaData) enf.svdRetiradaData = hojeStr;
      if (enf.cvcLocal && !enf.cvcRetiradaData) enf.cvcRetiradaData = hojeStr;
      if (enf.shileyLocal && !enf.shileyRetiradaData) enf.shileyRetiradaData = hojeStr;
    }

    setIsDischarging(true);

    try {
      const historicoRef = collection(db, "internacoes_historico");
      const hojeISO = new Date().toISOString();

      // --- 🧠 MOTOR DE INDICADORES OTIMIZADO (COM BUSCA BLINDADA DE SAPS) ---
      
      // Tenta achar a mortalidade em qualquer lugar do prontuário antes de fechar o pacote
      const sapsEncontrado = pacienteAtual.saps3?.lockedProb || 
                             pacienteAtual.backupProntuario?.saps3?.lockedProb || 
                             pacienteAtual.saps3?.probabilidade || 
                             pacienteAtual.saps3?.probabilidadeMortalidade || 0;
                             
      const scoreEncontrado = pacienteAtual.saps3?.lockedScore || 
                              pacienteAtual.backupProntuario?.saps3?.lockedScore || 
                              pacienteAtual.saps3?.score || 0;

      const indicadores_finais = {
        permanenciaTotal: calcularDias(pacienteAtual.dataInternacao, hojeISO),
        totalDiasVM: typeof getTempoVMNumber === 'function' ? getTempoVMNumber(pacienteAtual) : 0,
        totalDiasSVD: enf.svd ? calcularDias(enf.svdData, enf.svdRetiradaData) : 0,
        totalDiasCVC: enf.cvcLocal ? calcularDias(enf.cvcData, enf.cvcRetiradaData) : 0,
        totalDiasShiley: enf.shileyLocal ? calcularDias(enf.shileyData, enf.shileyRetiradaData) : 0,
        saps3Score: scoreEncontrado, // <-- Agora envia o valor real salvo
        mortalidadePrevista: sapsEncontrado, // <-- Agora envia a probabilidade real salva
        pacienteIdentificado: pacienteAtual.identificacaoCorreta || "auditado_positivo",
        foiObito: dischargeDestination === 'Óbito' ? 1 : 0,
        resultado: dischargeDestination === 'Óbito' ? 'Óbito' : 'Vivo'
      };

      // 3. Salvamento no Histórico
      await addDoc(historicoRef, {
        nomePaciente: pacienteAtual.nome,
        cpf: pacienteAtual.cpf || "000.000.000-00",
        dataEntrada: pacienteAtual.dataInternacao,
        dataSaida: hojeISO,
        desfecho: dischargeDestination,
        leitoFinal: pacienteAtual.id,
        indicadores: indicadores_finais,
        backupProntuario: JSON.parse(JSON.stringify(pacienteAtual))
      });

      // ==========================================
      // 4. LIMPEZA DO LEITO ATIVO (BLINDADA)
      // ==========================================
      
      // Puxa o template vazio
      const empty = defaultPatient(activeTab);
      
      // 🔥 TRAVA DE SEGURANÇA 1: Garante que a cama vazia não perca sua "placa de identificação"
      empty.id = pacienteAtual.id;
      
      // 🔥 TRAVA DE SEGURANÇA 2: Atualiza a tela sem quebrar a ordem ou apagar os leitos vizinhos
      setPatients(listaAnterior => 
        listaAnterior.map(paciente => 
          paciente.id === pacienteAtual.id ? empty : paciente
        )
      );
      
      // 🔥 TRAVA DE SEGURANÇA 3: Descobre o nome certo do documento para não duplicar o "bed_"
      const docId = pacienteAtual.id.includes('bed_') ? pacienteAtual.id : `bed_${pacienteAtual.id}`;
      
      // Sobrescreve o documento correto no Firebase com os dados vazios
      await setDoc(doc(db, "leitos_uti", docId), empty);

      // =========================================================================
      // 💡 AUDITORIA: Registro Seguro da Saída / Desfecho
      // =========================================================================
      const auditoriaFn = typeof registrarLogAuditoria === "function" 
        ? registrarLogAuditoria 
        : (typeof registarLogAuditoria === "function" ? registarLogAuditoria : null);
      
      if (auditoriaFn) {
        auditoriaFn(
          "SAÍDA DE PACIENTE / DESFECHO", 
          `Desfecho clínico registrado: ${dischargeDestination}`, 
          `Leito ${activeTab + 1}`, 
          pacienteAtual.nome
        );
      }

      // Finaliza a interface
      setShowDischargeModal(false);
      setDischargeDestination("");
      alert(`✅ Saída concluída! O leito de ${pacienteAtual.nome} agora está livre e limpo.`);

    } catch (error) {
      console.error("Erro ao processar alta:", error);
      alert("Erro crítico ao salvar indicadores. Verifique a conexão.");
    } finally {
      setIsDischarging(false);
    }
  };

  const recuperarUltimoPaciente = async (bedIndex) => {
    const bedId = `bed_${bedIndex + 1}`;

    const confirmar = window.confirm("Deseja realmente desfazer a última alta/óbito deste leito? Os dados retornarão para a tela e os indicadores de saída serão apagados.");
    if (!confirmar) return;

    try {
      // 1. Busca no cofre o último paciente que ocupou ESTE leito específico
      const historicoRef = collection(db, "internacoes_historico");
      const q = query(
        historicoRef,
        where("leitoFinal", "==", bedId),
        orderBy("dataSaida", "desc"),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert("Não foi encontrado nenhum registro recente de saída para este leito.");
        return;
      }

      const docHistorico = querySnapshot.docs[0];
      const pacienteRecuperado = docHistorico.data().backupProntuario;

      // 2. Restaura o paciente para o leito ativo (com todos os dados exatos do momento da saída)
      await setDoc(doc(db, "leitos_uti", bedId), pacienteRecuperado);

      // 3. Apaga o registro do histórico para não poluir sua taxa de mortalidade e giro de leito
      await deleteDoc(doc(db, "internacoes_historico", docHistorico.id));

      // 4. Atualiza a tela instantaneamente
      const up = [...patients];
      up[bedIndex] = pacienteRecuperado;
      setPatients(up);

      // =========================================================================
      // 💡 AUDITORIA: Registro de reversão de alta
      // =========================================================================
      const auditoriaFn = typeof registrarLogAuditoria === "function" 
        ? registrarLogAuditoria 
        : (typeof registarLogAuditoria === "function" ? registarLogAuditoria : null);
      
      if (auditoriaFn) {
        auditoriaFn(
          "RECUPERAÇÃO DE PACIENTE (ALTA ANULADA)", 
          `O desfecho anterior foi apagado do histórico e o paciente regressou ao leito ativo.`, 
          `Leito ${bedIndex + 1}`, 
          pacienteRecuperado.nome
        );
      }

      alert(`✅ Paciente ${pacienteRecuperado.nome} recuperado com sucesso!`);

    } catch (error) {
      console.error("Erro crítico ao recuperar paciente:", error);
      alert("Falha ao recuperar. Verifique o console. Pode ser necessário criar um Índice no Firebase.");
    }
  };

  const handlePrintHistory = () => {
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

    // 🔥 NOVO: Cria um histórico de mudanças de dose por dia e hora
    if (!p.sofa_data_technical.noraDoseHistory) p.sofa_data_technical.noraDoseHistory = {};
    if (!p.sofa_data_technical.noraDoseHistory[today]) p.sofa_data_technical.noraDoseHistory[today] = {};
    
    // Grava a resposta exata (true ou false) na hora em que o modal abriu
    p.sofa_data_technical.noraDoseHistory[today][currentNoraHour] = isDoubleDose;

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

  // --- TROCA DE GLASGOW POR RASS ---
  const handleNeuroSwitch = (type, field, value) => {
    const up = [...patients];
    const p = up[activeTab];
    if (!p.neuro) p.neuro = {};

    if (type === "RASS") {
      // Se selecionou um RASS válido
      if (value && value !== "Se sedado..." && value !== "") {
        // Calcula o Glasgow atual. Se existir, guarda na gaveta "glasgowPreSedacao"
        const currentGCS = calculateGlasgowTotal(p);
        if (currentGCS !== "-" && !isNaN(currentGCS)) {
          p.neuro.glasgowPreSedacao = currentGCS;
        }
        // Zera os campos do Glasgow para eles voltarem ao padrão (AO, RV, RM)
        p.neuro.glasgowAO = "";
        p.neuro.glasgowRV = "";
        p.neuro.glasgowRM = "";
      }
      p.neuro.rass = value;
    } 
    else if (type === "GLASGOW") {
      p.neuro[field] = value;
      // Se digitou algum valor de Glasgow, apaga o RASS automaticamente
      if (value && value !== "") {
        p.neuro.rass = ""; // Isso fará o RASS voltar pro "Se sedado..."
      }
    }
    
    setPatients(up);
  };

// --- MATRIZ DE PERMISSÕES (RBAC) ---
// Define o que cada perfil pode VER (views) e o que pode EDITAR (edits)
const ROLE_PERMISSIONS = {
  "Desenvolvedor": {
    views: ["overview", "medical", "nursing", "physio", "nutri", "speech", "psychology", "tech", "hemodialysis", "management", "reception"],
    edits: ["overview", "medical", "nursing", "physio", "nutri", "speech", "psychology", "tech", "hemodialysis", "management", "reception"],
    canSeeLeito11: true
  },
  "Diretor Administrativo": {
    views: ["overview", "medical", "nursing", "physio", "nutri", "speech", "psychology", "tech", "hemodialysis", "management", "reception"],
    edits: ["management", "reception"],
    canSeeLeito11: false
  },
  "Gerente de Enfermagem": {
    views: ["overview", "medical", "nursing", "physio", "nutri", "speech", "psychology", "tech", "hemodialysis", "management", "reception"],
    edits: ["management", "nursing", "tech", "hemodialysis", "reception"],
    canSeeLeito11: false
  },
  "RT da Fisioterapia": {
    views: ["overview", "medical", "nursing", "physio", "nutri", "speech", "psychology", "tech", "hemodialysis", "management", "reception"],
    edits: ["management", "physio"],
    canSeeLeito11: false
  },
  "CCIH UTI": {
    views: ["overview", "medical", "nursing", "physio", "nutri", "speech", "psychology", "tech", "hemodialysis", "management"],
    edits: ["management"],
    canSeeLeito11: false
  },
  "CCIH Geral": {
    views: ["overview", "medical", "nursing", "physio", "nutri", "speech", "psychology", "tech", "hemodialysis", "management"],
    edits: [], // Somente visualiza
    canSeeLeito11: false
  },
  "Médico": {
    views: ["overview", "medical", "nursing", "physio", "nutri", "speech", "psychology", "tech", "hemodialysis", "reception"],
    edits: ["medical", "nutri", "speech", "reception"],
    canSeeLeito11: false
  },
  "RT Médico": {
    views: ["overview", "medical", "nursing", "physio", "nutri", "speech", "psychology", "tech", "hemodialysis", "reception"],
    edits: ["management", "medical", "nutri", "speech", "reception"],
    canSeeLeito11: false
  },
  "Enfermeiro": {
    views: ["overview", "medical", "nursing", "physio", "nutri", "speech", "psychology", "tech", "hemodialysis", "reception"],
    edits: ["nursing", "tech", "hemodialysis", "reception"],
    canSeeLeito11: false
  },
  "Fisioterapeuta": {
    views: ["overview", "medical", "nursing", "physio", "nutri", "speech", "psychology", "tech", "hemodialysis"],
    edits: ["physio"],
    canSeeLeito11: false
  },
  "Nutricionista": {
    views: ["overview", "medical", "nursing", "physio", "nutri", "speech", "psychology", "tech", "hemodialysis"],
    edits: ["nutri"],
    canSeeLeito11: false
  },
  "Fonoaudiólogo": {
    views: ["overview", "medical", "nursing", "physio", "nutri", "speech", "psychology", "tech", "hemodialysis"],
    edits: ["speech"],
    canSeeLeito11: false
  },
  // 👇 NOVO PERFIL ADICIONADO AQUI
  "Psicólogo": {
    views: ["overview", "medical", "nursing", "physio", "nutri", "speech", "psychology", "tech", "hemodialysis"],
    edits: ["psychology"],
    canSeeLeito11: false
  },
  "Téc. em Enf.": {
    views: ["overview", "tech", "hemodialysis"],
    edits: ["tech", "hemodialysis"],
    canSeeLeito11: false
  },
  "Nefrologista": {
    views: ["overview", "medical", "nursing", "physio", "nutri", "speech", "psychology", "tech", "hemodialysis"],
    edits: ["hemodialysis"],
    canSeeLeito11: false
  }
};

// 1. LÊ O CRACHÁ: Aceita tanto 'role' quanto 'perfil' vindo do Firebase
const userRole = userProfile?.role || userProfile?.perfil;

// 2. ABRE A PORTA: Agora busca na matriz usando a variável correta que lê os dois
  const currentRolePerms = ROLE_PERMISSIONS[userRole] || { views: [], edits: [], canSeeLeito11: false };

  // --- LÓGICA DE INTERFACE (Botões Base) ---
  const baseNavButtons = [
    { id: "overview", label: "Visita Multi", icon: <Activity size={20} /> },
    { id: "medical", label: "Médico", icon: <Stethoscope size={20} /> },
    { id: "nursing", label: "Enfermeiro", icon: <NurseCap size={20} /> },
    { id: "physio", label: "Fisioterapeuta", icon: <Wind size={20} /> },
    { id: "nutri", label: "Nutrição", icon: <Apple size={20} /> },
    { id: "speech", label: "Fonoaudiologia", icon: <Mic size={20} /> },
    { id: "psychology", label: "Psicologia", icon: <Brain size={18} /> },
    { id: "tech", label: "Téc. em Enf.", icon: <Thermometer size={20} /> },
    { id: "hemodialysis", label: "Hemodiálise", icon: <Filter size={20} /> }
  ];

  // Filtra as abas: O botão só aparece na tela se o ID dele estiver na lista "views" do perfil do usuário
  const allNavButtons = baseNavButtons.filter(btn => currentRolePerms.views.includes(btn.id));

  // Define dinamicamente se o usuário logado tem permissão para EDITAR a aba que ele está clicando agora
  const isEditable = currentRolePerms.edits.includes(viewMode); 
  // (Certifique-se de usar essa variável isEditable nos seus inputs/botões de salvar em todas as abas!)

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

  // --- VARIÁVEIS DE ESTADO E PERMISSÕES DE AÇÕES ---
  
  // Superusuário 
  const isDev = userRole === "Desenvolvedor";

  // Traduzindo a Matriz nova para as variáveis antigas
  const isDocRole = currentRolePerms.edits.includes("medical") || userRole === "Nefrologista" || isDev;
  const isNursingRole = currentRolePerms.edits.includes("nursing") || isDev;
  const isNutriRole = currentRolePerms.edits.includes("nutri") || isDev;

  // Permissões de Abas e Ações
  const isOverviewEditable = currentRolePerms.edits.includes("overview");
  const canCloseDay = isDev || userRole === "Enfermeiro" || isOverviewEditable;

  // Trava de segurança extra para o Balanço Hídrico
  const isBHReadOnly = viewingPreviousBH || !isEditable;

  // Permissão exclusiva para limpar o leito (Apenas Médico e Dev)
  const canClearBed = isDev || userRole === "Médico";

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-20 relative bg-hexagon-pattern bg-repeat print:block print:min-h-0 print:h-auto print:pb-0 print:bg-white print:overflow-visible">
      <style>{`
          @media print {
              /* 1. Reduzimos a margem da impressora para dar mais espaço (de 10mm para 5mm) */
              @page { size: portrait; margin: 5mm; }
              
              .print\\:hidden { display: none !important; }
              
              /* 2. Força o corpo do site a parar exatamente onde o conteúdo termina */
              html, body, #root { 
                  height: max-content !important; 
                  min-height: 0 !important; 
                  background: white !important; 
                  margin: 0 !important;
                  padding: 0 !important;
              }

              /* 3. A MÁGICA: Remove a sombra e as bordas arredondadas do "Cartão" branco */
              * {
                  box-shadow: none !important;
                  border-radius: 0 !important;
              }

              /* 4. Mata qualquer preenchimento (padding) do fundo cinza que empurra a página */
              main, .bg-gray-100 {
                  padding: 0 !important;
                  margin: 0 !important;
              }
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
            
            {/* --- BOTÃO DE VOLTAR AO HUB (Livre para todos os perfis) --- */}
            <button
              onClick={() => navigate('/hub')}
              className="bg-white/10 hover:bg-white/20 p-2.5 md:pr-4 md:pl-3 rounded-full text-white transition-all border border-white/30 cursor-pointer shadow-sm backdrop-blur-sm flex items-center gap-2 mr-1 md:mr-2"
              title="Voltar ao Painel de Módulos"
            >
              <ArrowLeft size={20} />
              <span className="hidden md:inline font-bold text-sm">Painel</span>
            </button>

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
            
            // 👇 A MÁGICA DO LEITO FANTASMA: 
            // Se for o leito 11 e o perfil NÃO tiver permissão na matriz, o botão não é desenhado.
            if ((p.leito === 11 || p.leito === "11") && !currentRolePerms.canSeeLeito11) {
              return null; 
            }

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

              {/* CONTAINER DO CARROSSEL AJUSTADO PARA WEBKIT/IOS + ERGONOMIA V2 */}
              <div
                ref={navScrollRef}
                // SUTURA 1: Mantém a aceleração de hardware nativa de rolagem da Apple
                style={{ WebkitOverflowScrolling: 'touch' }} 
                // SUTURA 2: gap-4 adicionado conforme sua v2. Remoção do px-[40vw] e adição do touch-pan-x e pseudo-elementos
                className={`flex overflow-x-auto md:overflow-visible md:flex-col gap-4 md:gap-3 pb-4 md:pb-0 scrollbar-hide snap-x snap-mandatory items-center touch-pan-x
                  before:content-[''] before:min-w-[40vw] before:flex-shrink-0 md:before:hidden
                  after:content-[''] after:min-w-[40vw] after:flex-shrink-0 md:after:hidden
                `}
              >
                {allNavButtons.map((btn, index) => {
                  const isActive = viewMode === btn.id;
                  
                  // Lógica 3D do Mobile
                  const isExpandedMobile = window.innerWidth < 768 && centerTab === btn.id;
                  const centerIndex = allNavButtons.findIndex(b => b.id === (centerTab || allNavButtons[0]?.id));
                  const distanceToCenter = Math.abs(index - (centerIndex !== -1 ? centerIndex : 0));
                  const zIndexCascata = window.innerWidth < 768 ? (40 - distanceToCenter) : 10;

                  return (
                    <div
                      key={btn.id}
                      id={`nav-${btn.id}`}
                      style={{ zIndex: zIndexCascata }} 
                      className={`relative flex-shrink-0 snap-center md:snap-align-none transition-all duration-300 ease-out hover:z-[100]`}
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
                        // MUDANÇA: h-16 w-16 no mobile (antes era 12). Botões maiores!
                        className={`flex items-center h-16 md:h-12 min-w-[4rem] md:min-w-[3rem] p-0 rounded-2xl border transition-all duration-300 ease-out outline-none group overflow-hidden shadow-lg
                          ${
                            isActive
                              ? "bg-gradient-to-r from-teal-400 to-blue-600 border-transparent text-white scale-[1.05] md:scale-100 shadow-teal-500/40"
                              : "bg-slate-100 border-slate-300 text-slate-500 shadow-sm"
                          }
                          ${isExpandedMobile ? "w-[170px]" : "w-16 md:w-12"}
                          md:hover:w-[180px]
                        `}
                        title={btn.label}
                      >
                        {/* ÍCONE */}
                        <div className={`flex-shrink-0 flex items-center justify-center w-16 h-16 md:w-12 md:h-12 transition-transform duration-300 ${isActive ? 'text-white' : 'text-slate-500'}`}>
                          {/* MUDANÇA: scale-125 no mobile para ícones mais nítidos */}
                          <div className={isExpandedMobile || isActive ? "scale-125 md:scale-100" : "scale-110 md:scale-90"}>
                            {btn.icon}
                          </div>
                        </div>

                        {/* TEXTO */}
                        <div
                          className={`whitespace-nowrap transition-all duration-300 pr-4 flex items-center
                            ${isExpandedMobile ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 md:translate-x-0 md:group-hover:opacity-100"}
                          `}
                        >
                          <span className="text-sm font-bold tracking-wide">
                            {btn.label}
                          </span>
                        </div>
                      </button>
                    </div>
                  );
                })}

                {/* ========================================================= */}
                {/* BOTÃO DO CARRINHO DE EMERGÊNCIA                          */}
                {/* ========================================================= */}
                <div
                  id="nav-carrinho"
                  style={{ zIndex: 5 }} 
                  className={`relative flex-shrink-0 snap-center md:snap-align-none transition-all duration-300 ease-out hover:z-[100] mt-0 md:mt-4`}
                >
                  <button
                    onClick={() => setModalCarrinhoAberto(true)}
                    className={`flex items-center h-16 md:h-12 min-w-[4rem] md:min-w-[3rem] p-0 rounded-2xl border transition-all duration-300 ease-out outline-none group overflow-hidden shadow-lg
                      bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100
                      w-16 md:w-12 md:hover:w-[190px]
                    `}
                    title="Carrinho de Emergência"
                  >
                    <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 md:w-12 md:h-12 transition-transform duration-300">
                      <div className="scale-125 md:scale-100">
                        <Ambulance size={22} className="text-amber-600 group-hover:scale-110 transition-transform" />
                      </div>
                    </div>
                    <div
                      className={`whitespace-nowrap transition-all duration-300 pr-4 flex items-center
                        opacity-0 -translate-x-4 md:translate-x-0 md:group-hover:opacity-100
                      `}
                    >
                      <span className="text-sm font-bold tracking-wide text-amber-700">
                        Carrinho EMG
                      </span>
                    </div>
                  </button>
                </div>

                {/* ========================================================= */}
                {/* O NOVO BOTÃO DE NOTIFICAÇÃO DE EVENTOS (Fixo no final)    */}
                {/* ========================================================= */}
                <div
                  id="nav-notificacao"
                  style={{ zIndex: 5 }} 
                  className={`relative flex-shrink-0 snap-center md:snap-align-none transition-all duration-300 ease-out hover:z-[100] mt-0 md:mt-4`}
                >
                  <button
                    onClick={() => setIsEventModalOpen(true)}
                    className={`flex items-center h-16 md:h-12 min-w-[4rem] md:min-w-[3rem] p-0 rounded-2xl border transition-all duration-300 ease-out outline-none group overflow-hidden shadow-lg
                      bg-red-50 border-red-200 text-red-600 hover:bg-red-100
                      w-16 md:w-12 md:hover:w-[190px]
                    `}
                    title="Notificar Evento Adverso"
                  >
                    <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 md:w-12 md:h-12 transition-transform duration-300">
                      <div className="scale-125 md:scale-100">
                        <AlertTriangle size={22} className="text-red-600 group-hover:scale-110 transition-transform" />
                      </div>
                    </div>
                    <div
                      className={`whitespace-nowrap transition-all duration-300 pr-4 flex items-center
                        opacity-0 -translate-x-4 md:translate-x-0 md:group-hover:opacity-100
                      `}
                    >
                      <span className="text-sm font-bold tracking-wide text-red-700">
                        Notificar Evento
                      </span>
                    </div>
                  </button>
                </div>

              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* LADO DIREITO: ÁREA DAS ABAS (Conteúdo) */}
          {/* ========================================== */}
          <div className="flex-1 w-full min-w-0">
            <div className="sticky top-0 z-40 bg-white px-4 py-3 shadow-md border rounded-t-3xl flex justify-between items-center print:hidden">
              
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
                
                {/* BOTÃO DA LIXEIRA + TROCA DE LEITO */}
                  {currentPatient.nome && (userProfile?.perfil === "Enfermeiro" || userProfile?.role === "Enfermeiro" || userProfile?.perfil === "Desenvolvedor" || userProfile?.role === "Desenvolvedor") && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => setModalTrocaLeito({ isOpen: true, novoLeito: '' })} className="text-slate-300 hover:text-amber-500 transition-colors" title="Transferir para outro leito">
                        <ArrowRightLeft size={18} />
                      </button>
                      <button onClick={handleClearData} className="text-slate-300 hover:text-red-500 transition-colors" title="Liberar Leito">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}

                {/* --- NOVA CÁPSULA DE IDADE --- */}
                {currentPatient.dataNascimento && (
                  <span className="bg-teal-600 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow-sm">
                    {calculateAge(currentPatient.dataNascimento)} anos
                  </span>
                )}
                {/* ========================================================================= */}
                {/* 🚨 ALERTA DE PRECAUÇÃO DE CONTATO (CCIH) - VEM DO MÓDULO DE CULTURAS (IA) */}
                {/* ========================================================================= */}
                {currentPatient.medical?.isolamentoContato && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-red-100 border border-red-300 text-red-700 rounded-full text-xs font-black uppercase shadow-sm animate-pulse">
                    <ShieldAlert size={14} />
                    Precaução de Contato ({currentPatient.medical?.motivoIsolamento})
                  </div>
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

                  {(() => {
                    const role = userProfile?.perfil || userProfile?.role;
                    const canPullPatient = role === "Médico" || role === "Enfermeiro" || role === "Desenvolvedor";

                    return canPullPatient ? (
                      // 💡 CONTÊINER: Abraça os dois botões para não quebrar o React
                      <div className="flex flex-col items-center gap-3 mt-4 w-full max-w-sm mx-auto">
                        <button
                          onClick={() => handleOpenQueue(activeTab)}
                          disabled={(() => {
                            // Encontra o leito do paciente atual pelo número do leito
                            const leitoAtual = patients[activeTab]?.leito;
                            const configLeito = leitosConfig.find(l => {
                              const numLeito = parseInt(String(l.id || '').replace(/\D/g, ''));
                              return numLeito === Number(leitoAtual);
                            });
                            return configLeito?.bloqueado === true;
                          })()}
                          className={`w-full px-8 py-3 rounded-xl font-bold shadow-md transition-colors ${
                            (() => {
                              const leitoAtual = patients[activeTab]?.leito;
                              const configLeito = leitosConfig.find(l => {
                                const numLeito = parseInt(String(l.id || '').replace(/\D/g, ''));
                                return numLeito === Number(leitoAtual);
                              });
                              return configLeito?.bloqueado === true
                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                : 'bg-teal-600 hover:bg-teal-700 text-white';
                            })()
                          }`}
                          title={(() => {
                            const leitoAtual = patients[activeTab]?.leito;
                            const configLeito = leitosConfig.find(l => {
                              const numLeito = parseInt(String(l.id || '').replace(/\D/g, ''));
                              return numLeito === Number(leitoAtual);
                            });
                            return configLeito?.bloqueado === true
                              ? 'Leito bloqueado — não é possível puxar paciente'
                              : 'Puxar paciente da fila para este leito';
                          })()}
                        >
                          Puxar Paciente da Fila
                        </button>

                        {/* 💡 NOVO BOTÃO: Recuperar Último Paciente */}
                        <button 
                          onClick={() => recuperarUltimoPaciente(activeTab)} 
                          className="w-full p-3 bg-amber-50 text-amber-800 font-bold rounded-xl border border-amber-300 hover:bg-amber-100 transition-colors flex items-center justify-center gap-2 shadow-sm"
                        >
                          <RotateCcw size={18} /> Recuperar Último Paciente
                        </button>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-slate-400 font-medium px-4 py-2 bg-slate-50 rounded-lg border border-slate-100">
                        🔒 Apenas Médicos e Enfermeiros podem alocar pacientes.
                      </p>
                    );
                  })()}
                  
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
                        updateNested={updateNested}
                        userProfile={userProfile}
                        isOverviewEditable={isOverviewEditable}
                      />
                    )
                  )}

                  {viewMode === "medical" && (
                    currentPatient.statusInternacao === "Aguardando Admissão Médica" ? (
                      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border-2 border-dashed border-slate-200 mt-4">
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                          <span className="text-4xl">🩺</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Paciente Aguardando Admissão</h3>
                        <p className="text-slate-500 mb-6 text-center max-w-sm">
                          O paciente foi vinculado a este leito. É obrigatório realizar a admissão formal antes de acessar a tela de evolução diária.
                        </p>
                        
                        {(() => {
                          const role = userProfile?.perfil || userProfile?.role;
                          const canStartAdmission = role === "Médico" || role === "Desenvolvedor";

                          return (
                            <>
                              <button
                                onClick={handleAdmitPatient}
                                disabled={!canStartAdmission}
                                className={`px-8 py-3 rounded-xl font-bold shadow-lg transition-transform ${
                                  canStartAdmission 
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95" 
                                    : "bg-slate-300 text-slate-500 cursor-not-allowed"
                                }`}
                              >
                                Iniciar Admissão Médica
                              </button>
                              
                              {!canStartAdmission && (
                                <p className="text-xs text-red-500 mt-3 font-medium">
                                  🔒 Somente o perfil "Médico" pode iniciar esta admissão.
                                </p>
                              )}
                            </>
                          );
                        })()}
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
                        replaceAntibiotics={replaceAntibiotics}
                        addAntibiotic={addAntibiotic}
                        removeAntibiotic={removeAntibiotic}
                        clearAntibiotic={clearAntibiotic}
                        abrirChecklistEvolucao={abrirEvolucaoInteligente}
                        isGeneratingAI={isGeneratingAI}
                        aiEvolution={aiEvolution}
                        setAiEvolution={setAiEvolution}
                        copyToClipboardFallback={copyToClipboardFallback}
                        handleNeuroSwitch={handleNeuroSwitch}
                      />
                    )
                  )}
                  {viewMode === "nursing" && (
                    <NursingDashboard
                      currentPatient={currentPatient}
                      calculateAge={calculateAge}
                      userProfile={userProfile}
                      isEditable={isEditable}
                      updateNested={updateNested}
                      handleBlurSave={handleBlurSave}
                      addLesao={addLesao}
                      removeLesao={removeLesao}
                      updateLesaoData={updateLesaoData}
                      registrarEventoAdverso={registrarEventoAdverso}
                      handleNursingAdmission={() => setShowNursingModal(true)}
                      generateNursingAI_Evolution={generateNursingAI_Evolution}
                      isNursingRole={isNursingRole}
                      isGeneratingNursingAI={isGeneratingNursingAI}
                      handleViewNursingAdmission={handleViewNursingAdmission}
                      temCarrinhoEMGHoje={temCarrinhoEMGHoje}
                    />
                  )}
                  {activeTab !== null && viewMode === "physio" && (
                    <PhysioDashboard
                      currentPatient={currentPatient}
                      isEditable={isEditable}
                      uniqueGasoCols={uniqueGasoCols}
                      patients={patients}
                      activeTab={activeTab}
                      setPatients={setPatients}
                      save={save}
                      handlePhysioAdmission={handlePhysioAdmission}
                      handleViewPhysioAdmission={handleViewPhysioAdmission}
                      localEditRef={localEditRef}
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

                  {viewMode === "nutri" && (
                    <NutriDashboard
                      currentPatient={currentPatient}
                      patients={patients}
                      activeTab={activeTab}
                      setPatients={setPatients}
                      isEditable={isNutriRole}
                      updateNested={updateNested}
                      toggleArrayItem={toggleArrayItem}
                      handleBlurSave={handleBlurSave}
                      handleNutriAdmission={handleNutriAdmission}
                      handleViewNutriAdmission={handleViewNutriAdmission}
                    />
                  )}

                  {viewMode === "speech" && 
                    <SpeechDashboard 
                      currentPatient={currentPatient} 
                      isEditable={isEditable} 
                      updateNested={updateNested} 
                      handleBlurSave={handleBlurSave} 
                      toggleArrayItem={toggleArrayItem} 
                    />
                  }

                  {viewMode === "psychology" && (
                    <PsychologyDashboard
                      currentPatient={currentPatient}
                      isEditable={isEditable}
                      updateNested={updateNested}
                      handleBlurSave={handleBlurSave}
                      userProfile={userProfile}
                    />
                  )}

                  {viewMode === "tech" && (() => {
                    // 1. Lógica de triagem: Qual Balanço Hídrico exibir?
                    let currentDisplayedBH = currentPatient.bh; // Por padrão exibe o do plantão atual
                    
                    if (selectedBHDate !== currentPatient.bh?.date && currentPatient.historico_bh) {
                        // Se a data selecionada for do passado, resgata o documento do arquivo morto (histórico)
                        const historicalRecord = currentPatient.historico_bh.find(h => h.date === selectedBHDate);
                        if (historicalRecord) {
                          currentDisplayedBH = historicalRecord;
                        }
                    }

                    // 2. Trava de Segurança das 08:00
                    const isBHReadOnly = checkIsBHBlocked(selectedBHDate);

                    return (
                      <TechDashboard 
                        currentPatient={currentPatient} 
                        patients={patients}
                        activeTab={activeTab}
                        setPatients={setPatients}
                        save={save}
                        isEditable={isEditable}
                        
                        // NOVAS PROPS DA GESTÃO DE TEMPO
                        selectedDate={selectedBHDate}
                        setSelectedDate={setSelectedBHDate}
                        displayedBH={currentDisplayedBH} 
                        isBHReadOnly={checkIsBHBlocked(selectedBHDate, unlockedBHDates) || !isEditable} 
                        bhTotals={calculateTotals(currentDisplayedBH, currentPatient.nutri?.peso)} 
                        unlockedDates={unlockedBHDates}
                        handleUnlockHistoricalBH={handleUnlockHistoricalBH}
                        handleLockHistoricalBH={handleLockHistoricalBH}
                        
                        // Demais props mantidas
                        handlePrintBH={handlePrintBH}
                        updateBH={updateBH} 
                        updateNested={updateNested}
                        setCurrentNoraHour={setCurrentNoraHour} 
                        setCurrentNoraRate={setCurrentNoraRate} 
                        setShowNoraModal={setShowNoraModal} 
                        handleBlurSave={handleBlurSave}
                      />
                    );
                  })()}
                  {viewMode === "hemodialysis" && (
                    <HemoDashboard 
                      currentPatient={currentPatient} 
                      isEditable={isEditable} 
                      updateNested={updateNested} 
                      handleBlurSave={handleBlurSave}
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
        isDocRole={isDocRole}
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
        isReadOnly={!!patients[activeTab]?.admissaoEnfermagem}
      />

      {/* MODAL: ADMISSÃO DE FISIOTERAPIA */}
      {showPhysioModal && (
        <PhysioAdmissionModal
          showPhysioModal={showPhysioModal}
          setShowPhysioModal={setShowPhysioModal}
          activeTab={activeTab}
          physioData={physioData}
          setPhysioData={setPhysioData}
          handleBlurSave={handleBlurSave}
          handleFinalizePhysioAdmission={handleFinalizePhysioAdmission}
          isReadOnly={!!patients[activeTab]?.admissaoFisioterapia}
        />
      )}

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
        isReadOnly={!!patients[activeTab]?.admissaoMedica}
      />

      {/* MODAL: TEXTO GERADO PÓS-ADMISSÃO E ENFERMAGEM */}
      <GeneratedAdmissionTextModal
        generatedAdmissionText={generatedAdmissionText}
        setGeneratedAdmissionText={setGeneratedAdmissionText}
        copyToClipboardFallback={copyToClipboardFallback}
      />

      {/* MODAL: ADMISSÃO NUTRICIONAL */}
      <NutriAdmissionModal
        showNutriModal={showNutriAdmissionModal}
        setShowNutriModal={setShowNutriAdmissionModal}
        activeTab={activeTab}
        nutriData={nutriAdmissionData}
        setNutriData={setNutriAdmissionData}
        handleFinalizeNutriAdmission={handleFinalizeNutriAdmission}
        handleViewNutriAdmission={handleViewNutriAdmission}
        isReadOnly={!!patients[activeTab]?.admissaoNutricao}
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
        getDaysD1={getDaysD1}
        getTempoVMText={getTempoVMText}
        updateNested={updateNested}
      />

      {/* MODAL: GERADOR DE EVOLUÇÃO DA FISIOTERAPIA */}
      <PhysioEvoModal
        showPhysioEvoModal={showPhysioEvoModal}
        setShowPhysioEvoModal={setShowPhysioEvoModal}
        currentPatient={currentPatient}
        physioEvoText={physioEvoText}
        setPhysioEvoText={setPhysioEvoText}
      />

      {/* MODAL DE DESFECHO / SAÍDA DA UTI */}
      {showDischargeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Desfecho da Internação</h3>
            <p className="text-slate-500 text-sm mb-6">
              Selecione o destino do paciente <b className="text-slate-700">{patients[activeTab]?.nome}</b>:
            </p>

            <div className="space-y-3 mb-6">
              {['Alta Hospitalar', 'Transferência para Enfermaria', 'Transferência Externa (Outro Hospital)', 'Óbito'].map(destino => {
                // Lógica de cores simplificada para não engasgar o compilador do Vite
                const isSelected = dischargeDestination === destino;
                const isObito = destino === 'Óbito';
                
                let btnClass = 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'; // Cor padrão
                if (isSelected && isObito) btnClass = 'border-red-500 bg-red-50 text-red-700'; // Cor se for óbito
                if (isSelected && !isObito) btnClass = 'border-emerald-500 bg-emerald-50 text-emerald-700'; // Cor se for alta/transferência

                return (
                  <button
                    key={destino}
                    onClick={() => setDischargeDestination(destino)}
                    className={`w-full p-4 rounded-xl font-bold border-2 transition-all text-left flex justify-between items-center ${btnClass}`}
                  >
                    {destino} 
                    {isSelected && (
                      <span className={isObito ? 'text-red-500' : 'text-emerald-500'}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => { setShowDischargeModal(false); setDischargeDestination(""); }} 
                className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDischarge}
                disabled={!dischargeDestination || isDischarging}
                className={`flex-1 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${
                  dischargeDestination === 'Óbito' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isDischarging ? "Processando..." : "Confirmar Saída"}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* ======================================================== */}
      {/* MODAL: CARRINHO DE EMERGÊNCIA                            */}
      {/* ======================================================== */}
      {modalCarrinhoAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-amber-500/20 my-auto">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><Ambulance size={20} /></div>
                <h2 className="text-lg font-black tracking-wide leading-tight">Verificação do Carrinho de Emergência</h2>
              </div>
              <button onClick={() => setModalCarrinhoAberto(false)} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"><X size={24} /></button>
            </div>

            <div className="p-6 bg-slate-50 space-y-5 overflow-y-auto max-h-[70vh]">

              {/* HORÁRIO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Horário da Verificação</label>
                <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-amber-300 font-black text-center text-2xl cursor-pointer appearance-none"
                    value={formCarrinho.horario ? formCarrinho.horario.split(':')[0] : "00"}
                    onChange={(e) => setFormCarrinho({ ...formCarrinho, horario: `${e.target.value}:${formCarrinho.horario ? formCarrinho.horario.split(':')[1] : '00'}` })}>
                    {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}h</option>)}
                  </select>
                  <span className="text-3xl font-black text-slate-300 pb-1">:</span>
                  <select className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-amber-300 font-black text-center text-2xl cursor-pointer appearance-none"
                    value={formCarrinho.horario ? formCarrinho.horario.split(':')[1] : "00"}
                    onChange={(e) => setFormCarrinho({ ...formCarrinho, horario: `${formCarrinho.horario ? formCarrinho.horario.split(':')[0] : '00'}:${e.target.value}` })}>
                    {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* CARRINHO NÚMERO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Carrinho de Emergência</label>
                <div className="grid grid-cols-2 gap-3">
                  {['1', '2'].map(num => (
                    <button
                      key={num}
                      onClick={() => setFormCarrinho({ ...formCarrinho, carrinhoNumero: num })}
                      className={`p-4 rounded-xl border-2 font-black text-lg transition-all ${
                        formCarrinho.carrinhoNumero === num
                          ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-md scale-[1.02]'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-amber-200'
                      }`}
                    >
                      🚑 Carrinho {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* LACRE DO CARRINHO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block">🔒 Nº do Lacre do Carrinho</label>
                <input type="text" placeholder="Ex: 001234"
                  value={formCarrinho.lacreCarrinho}
                  onChange={(e) => setFormCarrinho({ ...formCarrinho, lacreCarrinho: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-amber-300 text-sm"
                />
              </div>

              {/* LACRE DA CAIXA */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block">🔒 Nº do Lacre da Caixa</label>
                <input type="text" placeholder="Ex: 005678"
                  value={formCarrinho.lacreCaixa}
                  onChange={(e) => setFormCarrinho({ ...formCarrinho, lacreCaixa: e.target.value })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-amber-300 text-sm"
                />
              </div>

              {/* LARINGOSCÓPIO */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">🔦 Laringoscópio</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Funcionante', 'Não funcionante'].map(r => (
                    <button key={r} onClick={() => setFormCarrinho({ ...formCarrinho, laringoscopio: r })}
                      className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${formCarrinho.laringoscopio === r ? (r === 'Funcionante' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md scale-[1.02]' : 'border-red-500 bg-red-50 text-red-700 shadow-md scale-[1.02]') : 'border-slate-200 bg-white text-slate-500 hover:border-amber-200'}`}>
                      {r === 'Funcionante' ? '✅ Funcionante' : '❌ Não funcionante'}
                    </button>
                  ))}
                </div>
              </div>

              {/* CARDIOVERSOR */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">⚡ Cardioversor</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Funcionante', 'Não funcionante'].map(r => (
                    <button key={r} onClick={() => setFormCarrinho({ ...formCarrinho, cardioversor: r })}
                      className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${formCarrinho.cardioversor === r ? (r === 'Funcionante' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md scale-[1.02]' : 'border-red-500 bg-red-50 text-red-700 shadow-md scale-[1.02]') : 'border-slate-200 bg-white text-slate-500 hover:border-amber-200'}`}>
                      {r === 'Funcionante' ? '✅ Funcionante' : '❌ Não funcionante'}
                    </button>
                  ))}
                </div>
              </div>

              {/* GEL CONDUTOR */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">🧴 Gel Condutor</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Sim', 'Não'].map(r => (
                    <button key={r} onClick={() => setFormCarrinho({ ...formCarrinho, gelCondutor: r })}
                      className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${formCarrinho.gelCondutor === r ? (r === 'Sim' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md scale-[1.02]' : 'border-red-500 bg-red-50 text-red-700 shadow-md scale-[1.02]') : 'border-slate-200 bg-white text-slate-500 hover:border-amber-200'}`}>
                      {r === 'Sim' ? '✅ Sim' : '❌ Não'}
                    </button>
                  ))}
                </div>
              </div>

              {/* TÁBUA */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-3 block text-center">🪵 Tábua</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Sim', 'Não'].map(r => (
                    <button key={r} onClick={() => setFormCarrinho({ ...formCarrinho, tabua: r })}
                      className={`p-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${formCarrinho.tabua === r ? (r === 'Sim' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md scale-[1.02]' : 'border-red-500 bg-red-50 text-red-700 shadow-md scale-[1.02]') : 'border-slate-200 bg-white text-slate-500 hover:border-amber-200'}`}>
                      {r === 'Sim' ? '✅ Sim' : '❌ Não'}
                    </button>
                  ))}
                </div>
              </div>

              {/* ENFERMEIRO */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <span className="text-[10px] font-bold text-amber-700 uppercase">Preenchido por</span>
                <div className="text-sm font-bold text-slate-700 mt-1">{userProfile?.nome || 'Usuário'}</div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 shrink-0">
                <button onClick={() => setModalCarrinhoAberto(false)} className="px-4 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">Cancelar</button>
                <button disabled={!formCarrinho.horario || salvandoCarrinho} onClick={salvarCarrinhoEMG} className="flex-1 py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:bg-slate-300 disabled:from-slate-300 disabled:to-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider">
                  {salvandoCarrinho ? (
                    <><span className="animate-spin">⏳</span> Salvando...</>
                  ) : (
                    <><Save size={18} /> Salvar Verificação</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

          {/* ============================================== */}
          {/* MODAL GLOBAL DE EVENTOS ADVERSOS                 */}
          {/* ============================================== */}
          {isEventModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
                
                {/* CABEÇALHO DO MODAL */}
                <div className="bg-red-600 p-5 flex justify-between items-center text-white shrink-0">
                  <div className="flex items-center gap-3">
                    <ShieldAlert size={24} className="text-red-200" />
                    <div>
                      <h3 className="font-black text-lg">
                        {eventoSelecionado ? `Notificar: ${eventoSelecionado}` : 'Notificação de Eventos Adversos'}
                      </h3>
                      <p className="text-red-200 text-xs">Gestão de Risco e Segurança do Paciente</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setIsEventModalOpen(false);
                      setEventoSelecionado(null);
                    }} 
                    className="hover:bg-red-700 p-2 rounded-full transition-colors text-white font-bold"
                  >
                    FECHAR
                  </button>
                </div>
                
                {/* CORPO DO MODAL (Com rolagem caso a tela seja pequena) */}
                <div className="p-6 bg-slate-50 overflow-y-auto flex-1">
                  
                  {!eventoSelecionado ? (
                    /* TELA 1: SELEÇÃO DO EVENTO */
                    <div className="animate-fadeIn">
                      <p className="text-sm text-red-800 font-bold mb-6 bg-red-100 p-3 rounded-xl border border-red-200 flex items-start gap-2">
                        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                        Selecione o evento ocorrido. Esta notificação não é punitiva, serve exclusivamente para mapearmos riscos e melhorarmos processos.
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {[
                          { label: "Queda", icon: "🤕" },
                          { label: "Retirada Acidental SNE", icon: "👃" },
                          { label: "Retirada Acidental CVC", icon: "🫀" },
                          { label: "Retirada Acidental SVD", icon: "💧" },
                          { label: "Extubação Acidental", icon: "🗣️" },
                          { label: "Erro de Medicação", icon: "💊" },
                          { label: "Obstrução de SNE", icon: "❌" },
                          { label: "Flebite / Extravasamento", icon: "💉" },
                          // --- NOVOS EVENTOS ADICIONADOS ---
                          { label: "Broncoaspiração", icon: "🫁" },
                          { label: "Falta de O2", icon: "💨" },
                          { label: "Incidente na HD", icon: "🩸" },
                          { label: "TEV", icon: "🦵" },
                          { label: "Falha de Equipamento", icon: "⚙️" },
                          { label: "Medicamento Vencido", icon: "📅" }
                        ].map((evento) => (
                          <button
                            key={evento.label}
                            onClick={() => setEventoSelecionado(evento.label)}
                            className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-2xl hover:bg-red-50 hover:border-red-400 hover:shadow-md transition-all group"
                          >
                            <span className="text-3xl mb-2 group-hover:scale-110 transition-transform drop-shadow-sm">{evento.icon}</span>
                            <span className="text-[11px] font-bold text-slate-700 text-center leading-tight group-hover:text-red-700">
                              {evento.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* TELA 2: FORMULÁRIO DE PREENCHIMENTO */
                    <div className="space-y-5 animate-fadeIn">
                      
                      {/* LEITO E DATA/HORA (Lado a Lado em telas maiores) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Seletor de Leito (NOVO) */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Leito do Evento <span className="text-red-500">*</span></label>
                          <select 
                            value={formEvento.leito}
                            onChange={(e) => setFormEvento({...formEvento, leito: e.target.value})}
                            className="w-full p-3 bg-red-50 border border-red-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-red-900 font-bold"
                          >
                            <option value="">Selecione o leito...</option>
                            {/* Gera os 10 leitos dinamicamente. */}
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => {
                              const leitoFormatado = num.toString().padStart(2, '0'); // Ex: "01"
                              const leitoSemZero = num.toString(); // Ex: "1"
                              
                              // 🔥 BUSCA CORRIGIDA: Converte o leito do banco para texto antes de comparar
                              const pac = (listaCenso || []).find(p => {
                                // Pega o leito do banco e transforma em texto (se for 3, vira "3")
                                const leitoBanco = p.leito !== undefined && p.leito !== null ? String(p.leito) : "";
                                
                                return (
                                  p.id === `bed_${leitoSemZero}` ||   // Procura pelo ID: bed_3
                                  p.id === `bed_${leitoFormatado}` || // Procura pelo ID: bed_03
                                  leitoBanco === leitoSemZero ||      // Compara texto com texto: "3" === "3"
                                  leitoBanco === leitoFormatado       // Compara texto com texto: "03" === "03"
                                );
                              });

                              // Garante que o nome existe antes de tentar cortar o primeiro nome
                              const nomePaciente = pac && pac.nome ? pac.nome.split(' ')[0] : null;

                              return (
                                <option key={num} value={leitoFormatado}>
                                  Leito {leitoFormatado} {nomePaciente ? `- ${nomePaciente}` : '(Vazio/Desconhecido)'}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Data e Hora */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Data e hora exatas <span className="text-red-500">*</span></label>
                          <input 
                            type="datetime-local" 
                            value={formEvento.dataHora}
                            onChange={(e) => setFormEvento({...formEvento, dataHora: e.target.value})}
                            className="w-full p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-slate-700 font-bold"
                          />
                        </div>
                      </div>

                      {/* Relato */}
                      <div>
                        <label className="flex justify-between items-end mb-1">
                          <span className="text-xs font-bold text-slate-600 uppercase">Breve relato do incidente <span className="text-red-500">*</span></span>
                          <span className="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded">⚠️ NÃO identifique paciente ou profissional</span>
                        </label>
                        <textarea 
                          rows="3" 
                          placeholder="Descreva o que ocorreu de forma objetiva..."
                          value={formEvento.relato}
                          onChange={(e) => setFormEvento({...formEvento, relato: e.target.value})}
                          className="w-full p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-slate-700 text-sm resize-none"
                        ></textarea>
                      </div>

                      {/* Impacto no Paciente (NOVO) */}
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                          Caracterização do impacto gerado <span className="text-red-500">*</span>
                        </label>
                        <textarea 
                          rows="2" 
                          placeholder="Qual foi a consequência direta no paciente? (Ex: Necessitou de reintubação, aumento de drogas...)"
                          value={formEvento.impactoPaciente}
                          onChange={(e) => setFormEvento({...formEvento, impactoPaciente: e.target.value})}
                          className="w-full p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-slate-700 text-sm resize-none"
                        ></textarea>
                      </div>

                      {/* Grau do Dano */}
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Classificação do grau de dano <span className="text-red-500">*</span></label>
                        <select 
                          value={formEvento.grauDano}
                          onChange={(e) => setFormEvento({...formEvento, grauDano: e.target.value})}
                          className="w-full p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-slate-700 font-bold text-sm"
                        >
                          <option value="">Selecione a gravidade...</option>
                          <option value="Nenhum">Nenhum (Incidente sem dano ou Near Miss)</option>
                          <option value="Leve">Leve (Baixa gravidade / Sintomas leves)</option>
                          <option value="Moderado">Moderado (Morbidade prolongada / Necessidade de intervenção)</option>
                          <option value="Grave">Grave (Ameaça imediata à vida / Dano permanente)</option>
                          <option value="Óbito">Óbito (Evento resultou em morte)</option>
                        </select>
                      </div>

                      {/* Ações Imediatas */}
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Ações imediatas adotadas pela equipe <span className="text-red-500">*</span></label>
                        <textarea 
                          rows="2" 
                          placeholder="O que foi feito imediatamente para mitigar ou reverter o dano ao paciente?"
                          value={formEvento.acoesImediatas}
                          onChange={(e) => setFormEvento({...formEvento, acoesImediatas: e.target.value})}
                          className="w-full p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-slate-700 text-sm resize-none"
                        ></textarea>
                      </div>

                    </div>
                  )}
                </div>

                {/* RODAPÉ E BOTÕES DE AÇÃO (SÓ APARECEM NO FORMULÁRIO) */}
                {eventoSelecionado && (
                  <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3 shrink-0">
                    <button 
                      onClick={() => {
                        setEventoSelecionado(null); // Volta para a tela de ícones
                        setFormEvento({ dataHora: '', relato: '', grauDano: '', acoesImediatas: '' });
                      }} 
                      className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Voltar
                    </button>
                    <button 
                      onClick={salvarNotificacaoEvento} 
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm flex items-center gap-2"
                    >
                      <ShieldAlert size={16} /> Submeter Notificação
                    </button>
                  </div>
                )}

              </div>
            </div>
          )}

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

      {/* MODAL: TROCA DE LEITO */}
      {modalTrocaLeito.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-fade-in border-4 border-amber-500/20">
            <div className="bg-amber-600 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><ArrowRightLeft size={20} /></div>
                <h2 className="text-lg font-black tracking-wide">Transferir Paciente</h2>
              </div>
              <button onClick={() => setModalTrocaLeito({ ...modalTrocaLeito, isOpen: false })} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"><X size={24} /></button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 font-medium">
                Selecione o leito de destino para <strong>{currentPatient.nome}</strong>:
              </p>

              {/* GRADE DE LEITOS */}
              <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto p-1">
                {leitosDisponiveis.map(leito => {
                  const ocupado = pacientesPorLeito[leito] && pacientesPorLeito[leito].id !== currentPatient.id;
                  const selected = modalTrocaLeito.novoLeito === leito;
                  return (
                    <button
                      key={leito}
                      disabled={ocupado}
                      onClick={() => setModalTrocaLeito({ ...modalTrocaLeito, novoLeito: leito })}
                      className={`p-3 rounded-xl border-2 font-bold text-xs text-center transition-all ${
                        ocupado
                          ? 'border-slate-200 bg-slate-100 text-slate-300 cursor-not-allowed line-through'
                          : selected
                            ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-md scale-105'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:bg-amber-50/50'
                      }`}
                    >
                      {leito}
                      {ocupado && <div className="text-[9px] font-normal text-slate-300 mt-0.5">Ocupado</div>}
                    </button>
                  );
                })}
              </div>

              {/* BOTÕES */}
              <div className="flex gap-3 pt-2 border-t border-slate-200">
                <button onClick={() => setModalTrocaLeito({ ...modalTrocaLeito, isOpen: false })} className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">Cancelar</button>
                <button
                  disabled={!modalTrocaLeito.novoLeito}
                  onClick={() => {
                    const leitoDestino = modalTrocaLeito.novoLeito;
                    const destinoNum = parseInt(leitoDestino, 10);
                    const destIndex = destinoNum - 1;

                    if (destIndex === activeTab) {
                      setModalTrocaLeito({ isOpen: false, novoLeito: '' });
                      return;
                    }

                    try {
                      // 1. CLONAGEM DO PACIENTE (igual ao robô que funciona)
                      const pacienteTransferido = JSON.parse(JSON.stringify(currentPatient));
                      pacienteTransferido.id = String(patients[destIndex]?.id || `bed_${destinoNum}`);
                      pacienteTransferido.leito = destinoNum;

                      // 2. PREPARO DA CAMA VELHA (LIMPA)
                      const camaVelhaLimpa = defaultPatient(activeTab);
                      camaVelhaLimpa.id = String(currentPatient.id || `bed_${activeTab + 1}`);
                      camaVelhaLimpa.leito = activeTab + 1;

                      // 3. ATUALIZA A TELA INSTANTANEAMENTE
                      const novaLista = [...patients];
                      novaLista[destIndex] = pacienteTransferido;
                      novaLista[activeTab] = camaVelhaLimpa;
                      setPatients(novaLista);

                      // 4. SALVA NO FIREBASE (motor nativo)
                      if (typeof save === "function") {
                        save(pacienteTransferido);
                        save(camaVelhaLimpa);
                      }

                      // 5. LOG DE AUDITORIA
                      if (typeof registrarLogAuditoria === "function") {
                        registrarLogAuditoria(
                          "TRANSFERÊNCIA DE LEITO",
                          `Transferido do Leito ${activeTab + 1} para o Leito ${destinoNum}`,
                          `Leito ${destinoNum}`,
                          pacienteTransferido.nome
                        );
                      }

                      setModalTrocaLeito({ isOpen: false, novoLeito: '' });
                    } catch (error) {
                      console.error("Erro na transferência:", error);
                    }
                  }}
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all uppercase tracking-wider"
                >
                  Transferir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ModuloUTI;