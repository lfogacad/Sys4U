import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
    // Clínico & Sistemas
    Stethoscope, HeartPulse, Brain, Wind, Utensils, Apple, 
    Droplets, Syringe, Pill, Thermometer, Scale, Gauge, Move,
    
    // Ações Clínicas & IA
    Activity, ClipboardCheck, FileText, FileCheck, Target, 
    Printer, Bot, BrainCircuit, Sparkles, Mic,
    
    // Gestão de Dados & Uploads
    Table, UploadCloud, FolderInput, List, Copy, 
    
    // Interface Geral & Navegação
    User, Search, ArrowLeft, X, PlusCircle, Edit3, Trash2, 
    Check, CheckCircle, AlertCircle, AlertTriangle, Loader2,
    ChevronRight, ChevronDown, Clock, RotateCcw, Filter, CalendarX
  } from "lucide-react";

const ModuloUTI = ({ user, userProfile, unidadeAtiva, handleLogout }) => {
  
    const location = useLocation();
    const [pdfReady, setPdfReady] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
  
    // --- STATES CLÍNICOS MANTIDOS ---
    const [activeTab, setActiveTab] = useState(0);
    const [viewMode, setViewMode] = useState("overview");
    const [viewingPreviousBH, setViewingPreviousBH] = useState(false);
    const [tappedTab, setTappedTab] = useState(null);
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
  
    const checkLossBH = (bh, lossName) => {
        if (!bh || !bh.losses) return false;
        
        // Gera as 24h dinamicamente para o módulo ser independente
        const hours = Array.from({ length: 24 }, (_, i) => ((i + 7) % 24).toString().padStart(2, "0") + ":00");
        
        for (let h of hours) {
          const val = String(bh.losses[h]?.[lossName] || "").trim().toLowerCase();
          const numVal = parseFloat(val.replace(",", "."));
          
          // Detecta se houve perda (valor numérico > 0 OU cruzes/texto)
          if (["sim", "s", "+", "++", "+++"].some(term => val.includes(term)) || (!isNaN(numVal) && numVal > 0)) {
            return true;
          }
        }
        return false;
      };  
  
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
      // 1. Cópia profunda para garantir que o React não engasgue
      const up = [...patients];
      const p = JSON.parse(JSON.stringify(up[activeTab]));
      
      if (!p.physio) p.physio = {};
      if (!Array.isArray(p.physio.vmFlowsheet)) p.physio.vmFlowsheet = [];
  
      const now = new Date();
      const dataHora = `${now.toLocaleDateString('pt-BR')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
      // --- SUA MÁGICA MANTIDA INTACTA ---
      const diasUtiImportado = typeof getDaysD1 === 'function' ? getDaysD1(p.dataInternacao) : "";
      const diasVmImportado = typeof getTempoVMText === 'function' ? getTempoVMText(p) : "";
  
      const newEntry = {
        id: Date.now().toString(),
        dataHora: dataHora,
        diasUti: diasUtiImportado,
        diasVm: diasVmImportado,
        cuffM: p.physio?.cuffM || "",
        cuffT: p.physio?.cuffT || "",
        cuffN: p.physio?.cuffN || "",
        despertarS: false,
        despertarN: false,
        modo: p.physio?.parametro || "",
        fio2: p.physio?.fiO2 || "",
        
        // Mapeamento blindado (Tenta pegar 'pc' ou 'pressaoControlada', o que existir)
        pc: p.physio?.parametro === "PCV" ? (p.physio?.pc || p.physio?.pressaoControlada || "") : "",
        vc: p.physio?.parametro === "VCV" ? (p.physio?.vt || p.physio?.volCorrente || "") : "",
        vtPc: "",
        ps: p.physio?.parametro === "PSV" ? (p.physio?.ps || p.physio?.pressaoSuporte || "") : "",
        
        vm: "",
        fluxoInsp: "",
        tInsp: "",
        ie: "",
        frSet: "",
        frTotal: "",
        peep: p.physio?.peep || "",
        pPico: "",
        pPlato: "",
        dp: "",
        cst: "",  
        cdin: "", 
        rva: "",
        autoPeep: ""
      };
  
      p.physio.vmFlowsheet.push(newEntry);
  
      // 2. Atualiza a tela instantaneamente
      up[activeTab] = p;
      setPatients(up);
  
      // 3. A AUDITORIA: Salva na mesma hora carimbando que a Fisio iniciou uma coluna!
      save(p, `Mapa VM: Adicionou uma nova coluna de avaliação (${dataHora})`);
    };
  
    // Função para atualizar uma célula específica da tabela E calcular DP/Compliância
    const updateVmEntry = (index, field, value) => {
      setPatients(prev => {
        const up = [...prev];
        const p = JSON.parse(JSON.stringify(up[activeTab])); // Cópia profunda (blindagem)
  
        if (!p.physio) p.physio = {};
        if (!p.physio.vmFlowsheet) p.physio.vmFlowsheet = [];
  
        let updatedEntry = { ...p.physio.vmFlowsheet[index], [field]: value };
  
        // --- MÁGICA DOS CÁLCULOS AUTOMÁTICOS PRESERVADA ---
        const plato = parseFloat(updatedEntry.pPlato);
        const peep = parseFloat(updatedEntry.peep);
        // Pega o volume corrente independente do nome que estiver na tela (vc, vcv ou vtPc)
        const vt = parseFloat(updatedEntry.vc) || parseFloat(updatedEntry.vcv) || parseFloat(updatedEntry.vtPc); 
  
        if (!isNaN(plato) && !isNaN(peep)) {
          const dpCalculada = plato - peep;
          updatedEntry.dp = dpCalculada.toFixed(0); 
  
          if (!isNaN(vt) && dpCalculada > 0) {
            const cstCalculada = vt / dpCalculada;
            updatedEntry.cStDin = cstCalculada.toFixed(1); 
            updatedEntry.cst = cstCalculada.toFixed(1); // Compatibilidade com a tela
          } else {
            updatedEntry.cStDin = updatedEntry.cStDin || ""; 
            updatedEntry.cst = updatedEntry.cst || ""; 
          }
        } else {
          if (field === 'pPlato' || field === 'peep') {
            updatedEntry.dp = "";
            updatedEntry.cStDin = "";
            updatedEntry.cst = "";
          }
        }
    
          p.physio.vmFlowsheet[index] = updatedEntry;
          up[activeTab] = p;
          return up;
        });
        // Sem o save() aqui! A auditoria será acionada perfeitamente pelo onBlur do modal.
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
      ) return;
    
      // 1. Preparamos os dados isolados da memória atual
      const up = [...patients];
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
  
      // 5. Atualiza a tela (Memória do React)
      up[activeTab] = p;
      setPatients(up);
  
      // 6. A ALTA CIRÚRGICA: Usamos a nossa função 'save' que já tem a caixa preta embutida!
      // Isso substitui aquele 'setDoc' cru e garante a auditoria.
      save(p, "Balanço Hídrico: Fechou o dia (Balanço de 24h)");
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
};

export default ModuloUTI;