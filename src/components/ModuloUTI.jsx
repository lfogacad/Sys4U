import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
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
    analyzeTextWithGemini, normalizeName, calculateSAPS3Score, getMissingSAPS3
  } from '../utils/core';

// Dashboards e Tabs
import MedicalDashboard from '../features/medical/MedicalDashboard';
import NursingDashboard from '../features/nursing/NursingDashboard';
import PhysioDashboard from '../features/physio/PhysioDashboard';
import NutriDashboard from '../features/nutri/NutriDashboard';
import SpeechDashboard from '../features/speech/SpeechDashboard';
import HemoDashboard from '../features/hemo/HemoDashboard';
import ManagementTab from './tabs/ManagementTab'; // Verifique se o caminho está correto
import OverviewTab from './tabs/OverviewTab';     // Verifique se o caminho está correto

const ModuloUTI = ({ user, userProfile, unidadeAtiva, handleLogout }) => {
    const location = useLocation();
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

    const [showAdmissionModal, setShowAdmissionModal] = useState(false);
    const [showNursingModal, setShowNursingModal] = useState(false);
    const [showPhysioEvoModal, setShowPhysioEvoModal] = useState(false);
    const [physioEvoText, setPhysioEvoText] = useState("");
    const [showSapsDetailsModal, setShowSapsDetailsModal] = useState(null);
    const [showVmFlowsheet, setShowVmFlowsheet] = useState(false);
    const [showChecklistEvo, setShowChecklistEvo] = useState(false);
    const [checkData, setCheckData] = useState({ estadoGeral: "REG", usaDva: false, dvas: [], usaSedacao: false, sedativos: [], rass: "", glasgow: "", atbs: "" });

    const [patients, setPatients] = useState(Array(11).fill(null).map((_, i) => defaultPatient(i)));
    const [showSepsisModal, setShowSepsisModal] = useState(false);


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

    const rawPatient = patients[activeTab] || defaultPatient(0);
    const currentPatient = ensureBHStructure(rawPatient); 
    const displayedBH = viewingPreviousBH && currentPatient.bh_previous ? currentPatient.bh_previous : currentPatient.bh;
    const bhTotals = calculateTotals(displayedBH);

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

    // --- LOGICA DE UI ---
    const navButtons = [
        { id: "overview", label: "Visão Geral", icon: <Activity size={20} /> },
        { id: "medical", label: "Evolução Médica", icon: <Stethoscope size={20} /> },
        { id: "nursing", label: "Enfermagem", icon: <Syringe size={20} /> },
        { id: "physio", label: "Fisioterapia", icon: <Wind size={20} /> },
        { id: "nutri", label: "Nutrição", icon: <Utensils size={20} /> },
        { id: "speech", label: "Fonoaudiologia", icon: <Mic size={20} /> },
        { id: "tech", label: "Balanço Hídrico", icon: <Droplets size={20} /> },
        { id: "hemodialysis", label: "Hemodiálise", icon: <Pill size={20} /> },
        { id: "management", label: "Gestão / SAPS 3", icon: <Table size={20} /> },
    ];

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

    // RBAC
    const isDocRole = userProfile?.role === "Médico" || userProfile?.role === "Gestor" || userProfile?.role === "Administrador";
    const isNursingRole = userProfile?.role === "Enfermeiro" || userProfile?.role === "Técnico em Enfermagem" || userProfile?.role === "Gestor" || userProfile?.role === "Administrador";
    const isAdmin = userProfile?.role === "Administrador";
    const isEditable = isDocRole; // Simplificado para exemplo
    const isOverviewEditable = isDocRole;
    const canCloseDay = userProfile?.role === "Enfermeiro" || isOverviewEditable;
    const isBHReadOnly = viewingPreviousBH || !isEditable;

    const visibleNavButtons = userProfile?.role === "Técnico em Enfermagem"
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

            <div id="original-header" className="relative z-30 pb-36 pt-8 px-4 md:px-8 shadow-xl print:hidden bg-teal-700">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
                    <div className="flex items-center gap-4">
                        <img src="/logobranca.png" alt="Logo" className="w-16 h-16 object-contain" />
                        <div className="flex flex-col text-white">
                            <h1 className="text-xl md:text-2xl font-bold">UTI Municipal de Ariquemes</h1>
                            <p className="text-xs opacity-80">Sys4U - Gestão Hospitalar</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-white rounded-full p-1.5 pr-2 shadow-lg gap-3">
                            <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white"><User size={20} /></div>
                            <div className="flex flex-col text-right hidden md:flex min-w-[120px]">
                                <span className="text-sm font-bold text-slate-800">{userProfile?.name || "Dr. Luciano"}</span>
                                <span className="text-xs text-slate-500">{userProfile?.role}</span>
                            </div>
                            <button onClick={handleLogout} className="w-10 h-10 rounded-full bg-teal-100 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors"><LogOut size={18} /></button>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto -mt-20 px-2 md:px-4 print:mt-0">
                <div className="relative z-40 bg-white/95 backdrop-blur-sm p-1.5 rounded-2xl shadow-md mb-6 flex overflow-x-auto gap-2 border border-white">
                    {patients.map((p, idx) => {
                        const isActive = activeTab === idx;
                        return (
                            <button key={idx} onClick={() => setActiveTab(idx)}
                                className={`flex-shrink-0 w-14 h-16 rounded-xl font-bold border flex flex-col items-center justify-center transition-all ${isActive ? "bg-teal-600 text-white scale-105" : "bg-slate-50 text-slate-500"}`}>
                                <span className="text-[9px] uppercase">Leito</span>
                                <span className="text-xl">{p.leito}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="flex flex-col md:flex-row gap-4 md:gap-6 relative mt-2">
                    <div className="w-full md:w-12 flex-shrink-0 relative z-[60] print:hidden self-start md:sticky md:top-6">
                        <div ref={navScrollRef} onScroll={handleNavScroll} className="flex overflow-x-auto md:flex-col gap-2 pb-4 md:pb-0 items-center">
                            {visibleNavButtons.map((btn) => (
                                <button key={btn.id} onClick={() => setViewMode(btn.id)}
                                    className={`w-12 h-12 flex items-center justify-center rounded-2xl border transition-all ${viewMode === btn.id ? "bg-teal-600 text-white" : "bg-white text-slate-400"}`} title={btn.label}>
                                    {btn.icon}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 min-w-0 relative z-30">
                        <div className="sticky top-0 z-40 bg-white px-4 py-3 shadow-md border rounded-t-3xl flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-extrabold text-teal-600 uppercase">{currentPatient.nome || "LEITO DISPONÍVEL"}</h2>
                                {currentPatient.nome && <button onClick={handleClearData} className="text-slate-300 hover:text-red-500"><Trash2 size={18} /></button>}
                            </div>
                            <span className="bg-slate-100 px-3 py-1.5 rounded-xl font-bold">Leito {currentPatient.leito}</span>
                        </div>

                        <div className="relative z-20 bg-white p-6 md:p-8 rounded-b-3xl shadow-xl border border-t-0 min-h-[500px]">
                            {!currentPatient.nome ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500 py-20">
                                    <UserPlus size={64} className="mb-4 text-slate-300" />
                                    <h3 className="text-xl font-bold">Leito Vazio</h3>
                                    <button onClick={() => setShowAdmissionModal(true)} className="mt-4 bg-teal-600 text-white px-6 py-2 rounded-xl font-bold">Admitir Paciente</button>
                                </div>
                            ) : (
                                <>
                                    {viewMode === "management" && <ManagementTab patients={patients} calculateSAPS3Score={calculateSAPS3Score} getDaysD1={getDaysD1} handleBlurSave={handleBlurSave} />}
                                    {viewMode === "overview" && <OverviewTab currentPatient={currentPatient} isOverviewEditable={isOverviewEditable} handleBlurSave={handleBlurSave} updateP={updateP} />}
                                    {viewMode === "medical" && <MedicalDashboard currentPatient={currentPatient} isEditable={isEditable} updateNested={updateNested} updateP={updateP} handleBlurSave={handleBlurSave} abrirChecklistEvolucao={abrirChecklistEvolucao} />}
                                    {viewMode === "nursing" && <NursingDashboard currentPatient={currentPatient} isEditable={isEditable} updateNested={updateNested} handleBlurSave={handleBlurSave} />}
                                    {viewMode === "physio" && <PhysioDashboard currentPatient={currentPatient} isEditable={isEditable} updateNested={updateNested} handleBlurSave={handleBlurSave} handleGeneratePhysioEvo={handleGeneratePhysioEvo} />}
                                    {viewMode === "nutri" && <NutriDashboard currentPatient={currentPatient} isEditable={isEditable} updateNested={updateNested} handleBlurSave={handleBlurSave} toggleArrayItem={toggleArrayItem} />}
                                    {viewMode === "speech" && <SpeechDashboard currentPatient={currentPatient} isEditable={isEditable} updateNested={updateNested} handleBlurSave={handleBlurSave} toggleArrayItem={toggleArrayItem} />}
                                    {viewMode === "tech" && <TechDashboard currentPatient={currentPatient} displayedBH={displayedBH} bhTotals={bhTotals} isBHReadOnly={isBHReadOnly} updateBH={updateBH} handleNextDayBH={handleNextDayBH} />}
                                    {viewMode === "hemodialysis" && <HemoDashboard currentPatient={currentPatient} isEditable={isEditable} updateNested={updateNested} handleBlurSave={handleBlurSave} />}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ModuloUTI;