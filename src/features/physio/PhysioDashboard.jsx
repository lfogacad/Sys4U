import React, { useEffect, useState, useRef } from 'react';
import { UserPlus, Calendar, X, Wind, Activity, Move, FileText, Shield, ClipboardCheck, ClipboardSignature, 
         Target, Printer, PlusCircle, Lock, AlertTriangle, Edit3, History, RefreshCw, ChevronDown, ChevronRight,
         Gauge, Timer, ArrowUpCircle, ClipboardList, BicepsFlexed, Map, ChartLine, TestTube, Stethoscope } from 'lucide-react';
import { SUPORTE_RESP_OPTS, MODOS_VM, ASPECTO_SECRECAO, COLORACAO_SECRECAO, QTD_SECRECAO, 
         MOBILIZACAO, ICU_MOBILITY_SCALE, GASOMETRIA_PARAMS } from '../../constants/clinicalLists';
import { formatDateDDMM } from '../../utils/core';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PhysioEvoModal from '../../components/modals/PhysioEvoModal';
import { ModalPortal } from '../../components/ModuloUTI';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

const PhysioDashboard = ({ currentPatient, isEditable, uniqueGasoCols, patients, activeTab, setPatients, save, handlePhysioAdmission, handleViewPhysioAdmission, clearDate, updateP, updateNested, handleBlurSave, setShowVmFlowsheet, handleSuporteChange, toggleArrayItem, calculateExchangeDate, isDeviceExpired, handlePrintGasometria, handleGeneratePhysioEvo, getTempoVMText, isOverviewEditable, localEditRef }) => {
  
  // 🔥 NOVO: Estado para controlar as sub-abas da Fisioterapia
  const [activePhysioTab, setActivePhysioTab] = useState('suporte');

  const [editingHora, setEditingHora] = useState({}); // { "23/06 (Adm)": "10:00", ... }

  const [showAcoesFisio, setShowAcoesFisio] = useState(false);

  const [listaMedicos, setListaMedicos] = useState([]);

  const [showEvolucaoModal, setShowEvolucaoModal] = useState(false);
  const [evolucaoData, setEvolucaoData] = useState({
    estadoGeral: "",
    sistemaNervoso: "",
    sistemaRespiratorio: "",
    sistemaCardiovascular: "",
    sistemaDigestivo: "",
    sistemaMusculoesqueletico: "",
    intercorrencias: "",
    condutas: "",
    planoMetas: "",
    // Mobilização como array (para os checkboxes)
    mobilizacao: [],
    // Escalas
    mrcScore: "",
    ims: ""
  });

  const [modalAspiracaoFisio, setModalAspiracaoFisio] = useState({
  isOpen: false,
  horario: "08:00", // Inicializa com um horário padrão fluido
  sistema: "",      // Aberto / Fechado
  viaAerea: "",      // TOT / TQT / VAS
  quantidade: "",    // Pequena / Moderada / Grande / Abundante
  caracteristica: "",// Fluida / Espessa / Mucoide...
  coloracao: "",     // Transparente / Esbranquiçada...
  oxigenacaoPre: "",
  intercorrencias: ""
});

  const [modalVNI, setModalVNI] = useState({
  isOpen: false,
  horario: "08:00",
  modo: "",       // BIPAP, CPAP, PSV
  ipap: "",
  epap: "",
  peep: "",
  ps: "",
  o2: "",         // Serve para O2 (L/min) ou FiO2 (%) dependendo do modo
  tempo: "",
  unidadeTempo: "minutos",
  fr: "",
  spo2: ""
});

const [modalIOT, setModalIOT] = useState(null);

const [modalTRE, setModalTRE] = useState({
  isOpen: false,
  step: 1,               // NOVO: Controla a tela (1 = Checklist, 2 = Parâmetros)
  checklist: {},         // NOVO: Armazena as respostas do checklist
  horario: "08:00",
  cuffLeakFeito: false,
  cuffLeakResultado: "", // Positivo, Negativo
  modo: "",              // Tubo T, PSV, CPAP
  o2: "",                // Para Tubo T
  ps: "",                // Para PSV
  peep: "",              // Para PSV e CPAP
  fio2: "",              // Para PSV e CPAP
  duracao: "",           // em minutos
  irrs: "",              // Índice de Respiração Rápida e Superficial (Tobin)
  desfecho: ""           // Sucesso, Falha
});

  const [modalMobilizacao, setModalMobilizacao] = useState({
  isOpen: false,
  horario: "08:00",
  tipoExercicio: "", // Ativo, Ativo-Assistido, Passivo
  alongamentoFeito: false,
  alongamentoSeries: "3",
  alongamentoReps: "10",
  selecionados: [], // Armazena apenas as strings dos exercícios marcados
  parametros: {},   // Armazena { "Nome Exercicio": { series: "3", reps: "10", carga: "Livre" } }
  outrosTronco: ""
});

// Função para marcar/desmarcar exercícios e inicializar seus parâmetros
const toggleExercicio = (nome, isParametrizado = false) => {
  setModalMobilizacao(prev => {
    const jaSelecionado = prev.selecionados.includes(nome);
    const novosSelecionados = jaSelecionado
      ? prev.selecionados.filter(i => i !== nome)
      : [...prev.selecionados, nome];

    let novosParametros = { ...prev.parametros };
    if (!jaSelecionado && isParametrizado) {
      novosParametros[nome] = { series: "3", reps: "10", carga: "Livre" };
    } else if (jaSelecionado && isParametrizado) {
      delete novosParametros[nome];
    }

    return { ...prev, selecionados: novosSelecionados, parametros: novosParametros };
  });
};

const updateParamExercicio = (nome, campo, valor) => {
  setModalMobilizacao(prev => ({
    ...prev,
    parametros: {
      ...prev.parametros,
      [nome]: { ...prev.parametros[nome], [campo]: valor }
    }
  }));
};

// Listas estáticas baseadas no seu protocolo
const LISTAS_MOBILIZACAO = {
  mmss: ['Flexão e extensão de ombros', 'Abdução e adução de ombros', 'Flexão e extensão de cotovelos', 'Preensão palmar e abertura das mãos'],
  mmiiParam: ['Flexão de quadril', 'Extensão de joelhos', 'Flexão de joelhos', 'Flexão plantar e dorsiflexão de tornozelos'],
  mmiiSimples: ['Panturrilhas em pé', 'Senta-levanta', 'Miniagachamentos'],
  tronco: ['Controle postural em sedestação', 'Deslocamentos laterais e ântero-posteriores', 'Alcance funcional', 'Rotação de tronco'],
  condicionamento: ['Transferência leito-poltrona', 'Sedestação em poltrona', 'Ortostatismo assistido', 'Marcha estacionária', 'Deambulação assistida', 'Deambulação independente', 'Passeio externo']
};

  const [modalExtubacao, setModalExtubacao] = useState({
  isOpen: false,
  horario: "08:00",
  // 1. Drive e Proteção
  nivelConscienciaOk: false, // Paciente cooperativo / obedece comandos
  tosseEficaz: false,       // Força de tosse adequada
  secrecaoControlada: false, // Pouca/moderada aspiração nas últimash
  // 2. Critérios do TRE e Balanço
  treSucesso: false,         // Passou no TRE anterior
  cuffLeakNegativo: false,   // Sem edema de glote detectado
  balancoHidricoOk: false,   // Estável ou negativo nas últimas 24h
  // 3. Preditivos Mecânicos
  fio2Adequada: false,       // FiO2 <= 40% antes de desmamar
  peepAdequada: false,       // PEEP <= 5-8 cmH2O
  // 4. Desfecho Final
  procedimentoRealizado: "", // "Extubado com sucesso", "Falha imediata / Reintubado", "Adiado por critérios de segurança"
  dispositivoPosExtubacao: ""// Cateter de O2, Máscara de Venturi, VNI Profilática, VNI Terapêutica, Cateter de Alto Fluxo (CNAF)
});

  // =========================================================================
  // ESTADOS E FUNÇÕES DO MODAL DE TROCA DE VIA AÉREA
  // =========================================================================
  const [modalTrocaVA, setModalTrocaVA] = useState({ isOpen: false, tipo: "", data: "" });

  const salvarTrocaVA = () => {
    // Define qual campo será salvo na base de dados (TOT ou TQT)
    const campo = modalTrocaVA.tipo === 'TOT' ? 'dataUltimaTrocaTOT' : 'dataUltimaTrocaTQT';
    
    updateP(campo, modalTrocaVA.data);
    handleBlurSave(`Fisioterapia: Editou Última Troca de ${modalTrocaVA.tipo}`);
    
    if (typeof registrarLogAuditoria === "function") {
      registrarLogAuditoria(`VIA AÉREA: TROCA ${modalTrocaVA.tipo}`, `Data alterada para: ${modalTrocaVA.data || "Vazio"}`, currentPatient.id, currentPatient.nome);
    }
    
    setModalTrocaVA({ isOpen: false, tipo: "", data: "" });
  };

  // Estado para controlar o modal do gráfico de O2
  const [showO2History, setShowO2History] = useState(false);

  // === FORMATADORES DE DATA CURTA ===
  const formatShort = (iso) => {
    if (!iso) return "DD/MM/AA";
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y.slice(-2)}`;
  };

  const getTrocaShort = (iso, hours) => {
    if (!iso) return "";
    const d = new Date(iso + 'T12:00:00');
    d.setHours(d.getHours() + hours);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  };

  // ==============================================================
  // EXORCISMO DE DADOS ANTIGOS: ZERA O CUFF AO VIRAR O DIA
  // ==============================================================
  useEffect(() => {
    const checkAndResetCuff = () => {
      if (!currentPatient) return;
      const now = new Date();
      const today = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
      const lastReset = currentPatient.physio?.lastCuffResetDate;

      if (lastReset !== today) {
        if (now.getHours() === 0 && now.getMinutes() === 0) return;
        updateNested("physio", "cuffM", "");
        updateNested("physio", "cuffT", "");
        updateNested("physio", "cuffN", "");
        updateNested("physio", "lastCuffResetDate", today);
      }
    };

    checkAndResetCuff();
    const interval = setInterval(checkAndResetCuff, 60000);
    return () => clearInterval(interval);
  }, [currentPatient?.id]);

  // BUSCA A EQUIPE DE MÉDICOS NO FIREBASE
  useEffect(() => {
    const carregarEquipeMedica = async () => {
      try {
        const profRef = collection(db, "profissionais");
        const q = query(profRef, where("categoria", "==", "Médico")); 
        
        const querySnapshot = await getDocs(q);
        const medicosTemp = [];
        
        querySnapshot.forEach((doc) => {
          medicosTemp.push({ id: doc.id, ...doc.data() });
        });

        medicosTemp.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
        
        setListaMedicos(medicosTemp);
      } catch (error) {
        console.error("Erro ao carregar a lista de médicos:", error);
      }
    };

    carregarEquipeMedica();
  }, []);  

  const onSuporteChange = (novoSuporte) => {
    updateNested("physio", "suporte", novoSuporte);
    updateNested("physio", "parametro", "");
    updateNested("physio", "fiO2", "");
    updateNested("physio", "peep", "");
    updateNested("physio", "volCorrente", "");
    updateNested("physio", "pressaoControlada", "");
    updateNested("physio", "pressaoSuporte", "");
    if (typeof handleSuporteChange === 'function') handleSuporteChange(novoSuporte);
  };

  const handleModoVMChange = (novoModo) => {
    updateNested("physio", "parametro", novoModo);
    updateNested("physio", "volCorrente", "");
    updateNested("physio", "pressaoControlada", "");
    updateNested("physio", "pressaoSuporte", "");
  };

  const handleAcaoFisio = (acao) => console.log("Abrir modal de:", acao);

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

  const sortedGasoCols = [...(uniqueGasoCols || [])].sort((a, b) => {
    const diff = parseDateForSort(b) - parseDateForSort(a);
    if (diff !== 0) return diff;

    // Desempate pelo campo _hora (se existir)
    const horaA = currentPatient.gasometriaHistory?.[a]?.["_hora"] || "";
    const horaB = currentPatient.gasometriaHistory?.[b]?.["_hora"] || "";

    if (horaA && horaB) {
      return horaB.localeCompare(horaA); // Mais recente primeiro
    }

    return horaB ? 1 : horaA ? -1 : 0;
  });

  const handleCustomPrintGasometria = () => {
    const printWindow = window.open("", "_blank");
    let html = `<html><head><title>Gasometria - ${currentPatient.nome || 'Paciente'}</title>
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      body { font-family: Arial, sans-serif; font-size: 9px; margin: 0; padding: 0; color: #000; }
      .title-center { text-align: center; font-size: 16px; margin-bottom: 5px; font-weight: bold; text-transform: uppercase; }
      .header { display: flex; justify-content: space-between; border-bottom: 2px solid black; padding-bottom: 4px; margin-bottom: 12px; font-weight: bold; font-size: 11px; text-transform: uppercase; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed; }
      th, td { border: 1px solid #000; padding: 4px 1px; text-align: center; overflow: hidden; white-space: nowrap; font-size: 8px; }
      th { background-color: #334155; color: white; font-weight: bold; }
      .col-item { width: 9.6%; text-align: left; padding-left: 2px; font-weight: bold; background-color: #f1f5f9; color: #000; white-space: normal; line-height: 1.1; }
      .col-data { width: 5%; }
      .page-break { page-break-after: always; }
    </style></head><body>`;

    const chunkSize = 18;
    const totalChunks = Math.ceil(sortedGasoCols.length / chunkSize) || 1;

    for (let i = 0; i < totalChunks; i++) {
      const chunk = sortedGasoCols.slice(i * chunkSize, (i + 1) * chunkSize);
      if (i > 0) html += `<div class="page-break"></div>`;
      
      html += `<div class="title-center">Histórico de Gasometria Arterial</div>`;
      html += `<div class="header"><span>PACIENTE: ${currentPatient.nome || "___________________"}</span><span>LEITO: ${currentPatient.leito || "___"}</span><span>PÁGINA ${i + 1} DE ${totalChunks}</span></div>`;
      html += `<table><thead><tr><th class="col-item" style="color: white; background-color: #334155;">PARÂMETRO</th>`;
      
      chunk.forEach(col => {
        const displayName = col.match(/^\d{4}-\d{2}-\d{2}$/) ? formatDateDDMM(col) : col;
        html += `<th class="col-data">${displayName}</th>`;
      });
      for (let j = chunk.length; j < chunkSize; j++) html += `<th class="col-data">-</th>`;
      html += `</tr></thead><tbody>`;

      GASOMETRIA_PARAMS.forEach(param => {
        html += `<tr><td class="col-item">${param}</td>`;
        chunk.forEach(col => {
          const val = currentPatient.gasometriaHistory?.[col]?.[param] || "-";
          html += `<td>${val}</td>`;
        });
        for (let j = chunk.length; j < chunkSize; j++) html += `<td></td>`;
        html += `</tr>`;
      });
      html += `</tbody></table>`;
    }
    html += `</body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  };

  const handleGasoKeyDown = (e, rowIndex, colIndex) => {
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"].includes(e.key)) return;
    e.preventDefault();
    let nextRow = rowIndex;
    let nextCol = colIndex;
    const maxRow = GASOMETRIA_PARAMS.length - 1;
    const maxCol = sortedGasoCols.length - 1;

    if (e.key === "ArrowUp") nextRow = Math.max(0, rowIndex - 1);
    if (e.key === "ArrowDown" || e.key === "Enter") nextRow = Math.min(maxRow, rowIndex + 1);
    if (e.key === "ArrowLeft") nextCol = Math.max(0, colIndex - 1);
    if (e.key === "ArrowRight") nextCol = Math.min(maxCol, colIndex + 1);

    const nextInput = document.querySelector(`input[data-gaso-row="${nextRow}"][data-gaso-col="${nextCol}"]`);
    if (nextInput) {
      nextInput.focus();
      setTimeout(() => nextInput.select(), 10);
    }
  };

const handleFluxoO2Change = (novoFluxo, suporteAtual) => {
    updateNested("physio", "fluxo", novoFluxo); // 👈 TROCADO DE parametro PARA fluxo
    const fluxo = parseFloat(novoFluxo);
    if (!isNaN(fluxo)) {
      let fio2Calculada = "";
      if (suporteAtual === "Cateter Nasal" || suporteAtual === "Macronebulização por TQT") {
        fio2Calculada = Math.min(100, Math.round(21 + (4 * fluxo)));
      } else if (suporteAtual === "Máscara não reinalante") {
        if (fluxo >= 10) {
          fio2Calculada = "Aprox. 85%";
        } else {
          fio2Calculada = "Fluxo insuficiente";
        }
      }
      updateNested("physio", "fiO2", fio2Calculada);
    } else {
      updateNested("physio", "fiO2", "");
    }
  };

  const salvarAspiracaoFisio = () => {
  const hoje = new Date().toLocaleDateString('pt-BR');
  
  // Monta o texto descritivo que irá para o histórico/auditoria de procedimentos do leito
  const textoProcedimento = `Realizada aspiração traqueal por sistema ${modalAspiracaoFisio.sistema?.toLowerCase()} via ${modalAspiracaoFisio.viaAerea}. Secreção em ${modalAspiracaoFisio.quantidade?.toLowerCase()} quantidade, aspecto ${modalAspiracaoFisio.caracteristica?.toLowerCase()} e coloração ${modalAspiracaoFisio.coloracao?.toLowerCase()}.${modalAspiracaoFisio.oxigenacaoPre ? ` SatO2 pré-procedimento: ${modalAspiracaoFisio.oxigenacaoPre}%.` : ''}${modalAspiracaoFisio.intercorrencias ? ` Intercorrências: ${modalAspiracaoFisio.intercorrencias}` : ' Sem intercorrências.'}`;

  // Cria a estrutura para salvar no histórico de procedimentos da fisioterapia
  const novoRegistro = {
    tipo: "Aspiração Traqueal",
    data: new Date().toISOString(),
    horario: modalAspiracaoFisio.horario,
    detalhes: modalAspiracaoFisio,
    textoFormatado: textoProcedimento
  };

  // 1. Injeta no array de histórico de procedimentos do paciente (exemplo de estrutura padrão)
  const historicoAtual = currentPatient.physio?.procedimentosDiarios || [];
  const atualizado = [...historicoAtual, novoRegistro];

  // Atualiza também os campos da PhysioDashboard (última avaliação)
  updateNested("physio", "secrecao", true);
  updateNested("physio", "secrecaoAspecto", modalAspiracaoFisio.caracteristica || "");
  updateNested("physio", "secrecaoColoracao", modalAspiracaoFisio.coloracao || "");
  updateNested("physio", "secrecaoQtd", modalAspiracaoFisio.quantidade || "");
  
  // 2. Salva no estado e no Firebase
  updateNested("physio", "procedimentosDiarios", atualizado);
  
  // 3. Dispara o salvamento geral com o log clínico correto
  if (typeof handleBlurSave === "function") {
    handleBlurSave(`Fisioterapia: Registrou Aspiração Traqueal às ${modalAspiracaoFisio.horario}`);
  }

  // Fecha o modal
  setModalAspiracaoFisio(prev => ({ ...prev, isOpen: false }));
};

  const salvarVNI = () => {
  let paramText = "";
  if (modalVNI.modo === "BIPAP") {
    paramText = `IPAP: ${modalVNI.ipap || "-"} | EPAP: ${modalVNI.epap || "-"} | O2: ${modalVNI.o2 || "-"}`;
  } else if (modalVNI.modo === "CPAP") {
    paramText = `PEEP: ${modalVNI.peep || "-"} | O2: ${modalVNI.o2 || "-"}`;
  } else if (modalVNI.modo === "PSV") {
    paramText = `PS: ${modalVNI.ps || "-"} | PEEP: ${modalVNI.peep || "-"} | FiO2: ${modalVNI.o2 || "-"}%`;
  }

  const textoProcedimento = `Sessão de VNI em modo ${modalVNI.modo} (${paramText}). Tempo de utilização: ${modalVNI.tempo} ${modalVNI.unidadeTempo}. Durante a terapia: FR ${modalVNI.fr} irpm e SpO2 ${modalVNI.spo2}%.`;

  const novoRegistro = {
    tipo: "Sessão de VNI",
    data: new Date().toISOString(),
    horario: modalVNI.horario,
    detalhes: modalVNI,
    textoFormatado: textoProcedimento
  };

  const historicoAtual = currentPatient.physio?.procedimentosDiarios || [];
  const atualizado = [...historicoAtual, novoRegistro];

  updateNested("physio", "procedimentosDiarios", atualizado);
  
  if (typeof handleBlurSave === "function") {
    handleBlurSave(`Fisioterapia: Registrou Sessão de VNI às ${modalVNI.horario}`);
  }

  setModalVNI(prev => ({ ...prev, isOpen: false }));
};

const IOT_ITENS_LABELS = {
  material: 'Selecionou e conferiu o material?',
  identificacao: 'Conferiu a identificação do paciente?',
  semAdornos: 'Equipe sem adornos?',
  higieneMaos: 'Foi realizado higiene das mãos com a técnica correta?',
  gorro: 'Foi utilizado gorro?',
  mascara: 'Uso de Máscara por todos os envolvidos?',
  avental: 'Uso de Avental?',
  luvaEsteril: 'Uso de Luva Estéril?',
  xylocaina: 'Uso de Xylocaína?',
  inducao: 'Realizou indução medicamentosa?',
  oportunidadeUnica: 'Inserção em oportunidade única?',
  aspiradoVAS: 'Aspirado VAS antes do procedimento?',
  ausculta: 'Feito ausculta pulmonar para fixação do TOT?',
  fixado: 'Fixado TOT corretamente?',
  sedacao: 'Instalou sedação conforme prescrição médica?',
  cuff: 'Ajustou pressão do Cuff entre 20 e 30 cmH2O?'
};

const salvarIOT = async () => {
  if (!modalIOT.horario || !modalIOT.tentativa || !modalIOT.condicao || !modalIOT.localInserção) return;

  // 🔑 Calcular PRIMEIRO os totais de conformidade (antes de usar no registro)
  const valores = Object.values(modalIOT.conformidade || {});
  const conformes = valores.filter(v => v === 'Sim').length;
  const naoConformes = valores.filter(v => v === 'Não').length;
  const depoisLembrado = valores.filter(v => v === 'Sim, depois de lembrado').length;

  const textoProcedimento = `Checklist de IOT (${modalIOT.localInserção}) - Tentativa: ${modalIOT.tentativa}. Condição: ${modalIOT.condicao}. Tubo nº ${modalIOT.numeroTubo || '-'} (Rima ${modalIOT.rima || '-'}). Conformidade: ${conformes} itens conformes, ${naoConformes} não conformes, ${depoisLembrado} depois de lembrado. Reintubação <48h: ${modalIOT.reintubacao48h ? 'Sim' : 'Não'}. Uso de VNI realizado ou considerado: ${modalIOT.vni ? 'Sim' : 'Não'}.`;

  const hoje = new Date();
  const dataISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

  const registro = {
    tipo: 'Checklist IOT',
    data: dataISO,
    horario: modalIOT.horario,
    tentativa: modalIOT.tentativa,
    condicao: modalIOT.condicao,
    numeroTubo: modalIOT.numeroTubo || '',
    rima: modalIOT.rima || '',
    indicacao: modalIOT.indicacao,
    indicacaoOutros: modalIOT.indicacao === 'Outros' ? modalIOT.indicacaoOutros : '',
    localInserção: modalIOT.localInserção,
    medicoResponsavel: modalIOT.medicoResponsavel || '',
    auditor: modalIOT.auditor || '',
    conformidade: modalIOT.conformidade,
    totais: { conformes, naoConformes, depoisLembrado },
    barreiras: {
      itens: Object.entries(modalIOT.conformidade).map(([key, valor]) => ({
        key,
        label: IOT_ITENS_LABELS[key] || key,
        cumprida: valor === 'Sim'
      })),
      total: Object.keys(modalIOT.conformidade).length,
      cumpridas: conformes,
      todasCumpridas: conformes > 0 && naoConformes === 0 && depoisLembrado === 0,
      resumo: `${conformes}/${Object.keys(modalIOT.conformidade).length}`
    },    
    informacoesAdicionais: modalIOT.informacoesAdicionais || '',
    reintubacao48h: modalIOT.reintubacao48h || false,
    vni: modalIOT.vni || false,
    textoFormatado: textoProcedimento
  };

  // Salva no histórico do fisio
  const historico = [...(currentPatient.physio?.historicoIOT || []), registro];

  // Monta o paciente com TODAS as alterações em um único objeto:
  // checklist IOT + data de intubação + tubo + rima
  const pacienteAtualizado = JSON.parse(JSON.stringify(currentPatient));
  if (!pacienteAtualizado.physio) pacienteAtualizado.physio = {};
  pacienteAtualizado.physio.historicoIOT = historico;
  pacienteAtualizado.physio.ultimoIOT = registro;
  pacienteAtualizado.dataIntubacao = dataISO;
  if (modalIOT.numeroTubo) {
    pacienteAtualizado.physio.totNumero = modalIOT.numeroTubo;
  }
  if (modalIOT.rima) {
    pacienteAtualizado.physio.totRima = modalIOT.rima;
  }

  // Atualiza o estado de uma vez só
  setPatients(prev => {
    const novos = [...prev];
    novos[activeTab] = pacienteAtualizado;
    return novos;
  });

  // Persiste no Firebase UMA única vez (com o paciente completo)
  save(pacienteAtualizado, `Fisioterapia: Checklist de IOT registrado (${modalIOT.localInserção}) - Conformes: ${conformes}, Não conformes: ${naoConformes}, Depois de lembrado: ${depoisLembrado}${modalIOT.reintubacao48h ? ' | REINTUBAÇÃO <48h' : ''}`);

  setModalIOT(null);
};

  const salvarTRE = () => {
  let paramText = "";
  if (modalTRE.modo === "Tubo T") {
    paramText = `O2: ${modalTRE.o2 || "-"}`;
  } else if (modalTRE.modo === "PSV") {
    paramText = `PS: ${modalTRE.ps || "-"} | PEEP: ${modalTRE.peep || "-"} | FiO2: ${modalTRE.fio2 || "-"}%`;
  } else if (modalTRE.modo === "CPAP") {
    paramText = `PEEP: ${modalTRE.peep || "-"} | FiO2: ${modalTRE.fio2 || "-"}%`;
  }

  let cuffText = "";
  if (modalTRE.cuffLeakFeito) {
    cuffText = ` | Cuff Leak Test: ${modalTRE.cuffLeakResultado || "Não informado"}`;
  }

  const textoProcedimento = `Teste de Respiração Espontânea (TRE) em modo ${modalTRE.modo} (${paramText}). Duração: ${modalTRE.duracao} minutos. Índice de Tobin (IRRS): ${modalTRE.irrs || "-"}. Desfecho: ${modalTRE.desfecho.toUpperCase()}${cuffText}.`;

  const novoRegistro = {
    tipo: "TRE",
    data: new Date().toISOString(),
    horario: modalTRE.horario,
    detalhes: modalTRE,
    textoFormatado: textoProcedimento
  };

  const historicoAtual = currentPatient.physio?.procedimentosDiarios || [];
  const atualizado = [...historicoAtual, novoRegistro];

  updateNested("physio", "procedimentosDiarios", atualizado);
  
  if (typeof handleBlurSave === "function") {
    handleBlurSave(`Fisioterapia: Registrou TRE às ${modalTRE.horario} - Desfecho: ${modalTRE.desfecho}`);
  }

  setModalTRE(prev => ({ ...prev, isOpen: false }));
};

const TRE_CHECKLIST = [
  { id: 'causa', label: 'Causa da falência respiratória controlada' },
  { id: 'pao2', label: 'PaO2 ≥ 60mmHg com FiO2 ≤ 0,4' },
  { id: 'peep_ps', label: 'PEEP ≤ 8 e PS ≤ 12' },
  { id: 'fc', label: 'FC ≥ 60 e ≤ 120' },
  { id: 'fr', label: 'FR ≥ 12 e ≤ 22' },
  { id: 'spo2', label: 'SpO2 ≥ 90% ou adequada para quadro clínico' },
  { id: 'neuro', label: 'Glasgow ≥ 10 ou RASS de -2 a +1' },
  { id: 'secrecao', label: 'Capacidade de mobilização de secreção' },
  { id: 'dva', label: 'Dose estável de vasopressor ou em queda' },
  { id: 'ph', label: 'pH maior que 7,30' }
];

  const salvarMobilizacao = () => {
  const m = modalMobilizacao;
  const selecionados = m.selecionados;
  
  let textoBlocos = [];

  if (m.alongamentoFeito) {
    textoBlocos.push(`Alongamentos (${m.alongamentoSeries} séries de ${m.alongamentoReps} repetições)`);
  }

  // Helper para formatar os selecionados em texto legível
  const formatarGrupo = (listaBase, isParam = false) => {
    const filtrados = selecionados.filter(item => listaBase.includes(item));
    if (filtrados.length === 0) return null;
    return filtrados.map(item => {
      if (isParam && m.parametros[item]) {
        const p = m.parametros[item];
        return `${item} (${p.series}x${p.reps}, Carga: ${p.carga})`;
      }
      return item;
    }).join("; ");
  };

  const strMMSS = formatarGrupo(LISTAS_MOBILIZACAO.mmss, true);
  if (strMMSS) textoBlocos.push(`MMSS: ${strMMSS}`);

  const strMMII = [formatarGrupo(LISTAS_MOBILIZACAO.mmiiParam, true), formatarGrupo(LISTAS_MOBILIZACAO.mmiiSimples, false)].filter(Boolean).join("; ");
  if (strMMII) textoBlocos.push(`MMII: ${strMMII}`);

  let strTronco = formatarGrupo(LISTAS_MOBILIZACAO.tronco, false);
  if (m.outrosTronco) strTronco = strTronco ? `${strTronco}; Outros: ${m.outrosTronco}` : `Outros: ${m.outrosTronco}`;
  if (strTronco) textoBlocos.push(`Tronco: ${strTronco}`);

  const strCond = formatarGrupo(LISTAS_MOBILIZACAO.condicionamento, false);
  if (strCond) textoBlocos.push(`Condicionamento: ${strCond}`);

  const textoProcedimento = `Mobilização Precoce (${m.tipoExercicio || "Tipo não especificado"}). ` + (textoBlocos.length > 0 ? textoBlocos.join(". ") + "." : "Nenhum exercício detalhado.");

  const novoRegistro = {
    tipo: "Mobilização",
    data: new Date().toISOString(),
    horario: m.horario,
    detalhes: m,
    textoFormatado: textoProcedimento
  };

  const historicoAtual = currentPatient.physio?.procedimentosDiarios || [];
  updateNested("physio", "procedimentosDiarios", [...historicoAtual, novoRegistro]);
  
  if (typeof handleBlurSave === "function") {
    handleBlurSave(`Fisioterapia: Registrou Mobilização Precoce às ${m.horario}`);
  }

  setModalMobilizacao(prev => ({ ...prev, isOpen: false }));
};

  const salvarExtubacao = () => {
  const ex = modalExtubacao;
  
  let textoChecklist = [];
  if (ex.nivelConscienciaOk) textoChecklist.push("Nível de consciência adequado");
  if (ex.tosseEficaz) textoChecklist.push("Tosse eficaz");
  if (ex.secrecaoControlada) textoChecklist.push("Secreção controlada");
  if (ex.treSucesso) textoChecklist.push("Sucesso no TRE");
  if (ex.cuffLeakNegativo) textoChecklist.push("Cuff Leak Test negativo (sem estridor)");
  if (ex.balancoHidricoOk) textoChecklist.push("Balanço hídrico compensado");
  if (ex.fio2Adequada) textoChecklist.push("FiO2 <= 40%");
  if (ex.peepAdequada) textoChecklist.push("PEEP estável");

  let textoProcedimento = "";
  if (ex.procedimentoRealizado === "Adiado") {
    textoProcedimento = `Protocolo de Extubação avaliado às ${ex.horario}. Procedimento ADIADO por critérios de segurança hospitalar.`;
  } else {
    textoProcedimento = `Executado Protocolo de Extubação às ${ex.horario}. Checklist de segurança prévio contemplou: ${textoChecklist.join(", ")}. Conduta: Paciente submetido ao procedimento de extubação com desfecho: ${ex.procedimentoRealizado}. Instalado suporte de oxigenoterapia pós-extubação via ${ex.dispositivoPosExtubacao || "não especificado"}.`;
  }

  const novoRegistro = {
    tipo: "Protocolo de Extubação",
    data: new Date().toISOString(),
    horario: ex.horario,
    detalhes: ex,
    textoFormatado: textoProcedimento
  };

  const historicoAtual = currentPatient.physio?.procedimentosDiarios || [];
  updateNested("physio", "procedimentosDiarios", [...historicoAtual, novoRegistro]);
  
  if (typeof handleBlurSave === "function") {
    handleBlurSave(`Fisioterapia: Registrou desfecho do Protocolo de Extubação - ${ex.procedimentoRealizado}`);
  }

  setModalExtubacao(prev => ({ ...prev, isOpen: false }));
};

  // Função auxiliar com nome diferente para não dar conflito com a do gerador de texto
  const parseDateForChart = (str) => {
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

  // Monta os dados mesclando Gasometria e Physiodashboard
  const getChartData = () => {
    if (!currentPatient) return [];
    
    const gasoHistory = currentPatient.gasometriaHistory || {};
    const vmFlowsheet = currentPatient.physio?.vmFlowsheet || [];
    
    // Usando um objeto simples para evitar conflito com o ícone <Map /> do lucide-react
    const timeMap = {};
    
    // 1. Processa o Mapa de Suporte (Physio) para FiO2 e Suporte
    vmFlowsheet.forEach(entry => {
      const ts = parseDateForChart(entry.dataHora);
      if (ts === 0) return;
      
      timeMap[ts] = {
        timestamp: ts,
        PaO2: null, 
        PF: null,   
        FiO2: parseFloat(entry.fio2?.toString().replace(',', '.')) || null,
        suporte: entry.suporte || "-",
        isInterpolated: false
      };
    });

    // 2. Processa as Gasometrias
    Object.keys(gasoHistory).forEach(key => {
      const ts = parseDateForChart(key);
      if (ts === 0) return;
      
      const g = gasoHistory[key];
      const pao2 = parseFloat(g.PaO2?.toString().replace(',', '.')) || null;
      const fio2 = parseFloat(g.FiO2?.toString().replace(',', '.')) || null;
      const pf = parseFloat(g['P/F']?.toString().replace(',', '.')) || null;

      if (timeMap[ts]) {
        const existing = timeMap[ts];
        if (pao2 !== null) existing.PaO2 = pao2;
        if (pf !== null) existing.PF = pf;
        if (fio2 !== null) existing.FiO2 = fio2; // Gaso tem prioridade na FiO2
        existing.isInterpolated = false;
      } else {
        timeMap[ts] = {
          timestamp: ts,
          PaO2: pao2,
          FiO2: fio2,
          PF: pf,
          suporte: "-",
          isInterpolated: false
        };
      }
    });
    
    // 3. Ordena cronologicamente
    const sorted = Object.values(timeMap).sort((a, b) => a.timestamp - b.timestamp);
    
    // 4. Herda o suporte ventilatório para os pontos que vieram só da gaso
    let lastSuporte = "-";
    sorted.forEach(item => {
      if (item.suporte !== "-") {
        lastSuporte = item.suporte;
      } else {
        item.suporte = lastSuporte;
      }
    });

    // 5. INTERPOLAÇÃO INTELIGENTE para conectar PaO2 e P/F
    const gasos = sorted.filter(item => item.PaO2 !== null || item.PF !== null);
    
    sorted.forEach(item => {
      if (item.PaO2 === null && item.PF === null) {
        // Encontra a gasometria anterior e a próxima
        const prevGaso = [...gasos].reverse().find(g => g.timestamp < item.timestamp);
        const nextGaso = gasos.find(g => g.timestamp > item.timestamp);
        
        if (prevGaso && nextGaso) {
          const dayPrev = new Date(prevGaso.timestamp).setHours(0,0,0,0);
          const dayNext = new Date(nextGaso.timestamp).setHours(0,0,0,0);
          const diffDays = Math.round((dayNext - dayPrev) / 86400000);
          
          // Se a diferença for <= 1 dia, significa que não pulou nenhum dia inteiro sem gasometria
          if (diffDays <= 1) {
            const ratio = (item.timestamp - prevGaso.timestamp) / (nextGaso.timestamp - prevGaso.timestamp);
            if (prevGaso.PaO2 !== null && nextGaso.PaO2 !== null) {
              item.PaO2 = prevGaso.PaO2 + (nextGaso.PaO2 - prevGaso.PaO2) * ratio;
            }
            if (prevGaso.PF !== null && nextGaso.PF !== null) {
              item.PF = prevGaso.PF + (nextGaso.PF - prevGaso.PF) * ratio;
            }
            item.isInterpolated = true; // Flag para esconder no tooltip e não desenhar a bolinha
          }
        }
      }
    });

    // 6. Formata os labels para o eixo X
    return sorted.map(item => {
      const dateObj = new Date(item.timestamp);
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const hh = String(dateObj.getHours()).padStart(2, '0');
      const min = String(dateObj.getMinutes()).padStart(2, '0');
      
      return {
        ...item,
        label: `${dd}/${mm} ${hh}:${min}`,
      };
    });
  };

  const chartData = getChartData();

  // Componente customizado para o Eixo X (Data em cima, Suporte embaixo)
  const CustomXAxisTick = ({ x, y, payload }) => {
    const item = chartData.find(d => d.label === payload.value);
    const suporte = item?.suporte || "";
    
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={10} textAnchor="end" fill="#64748b" fontSize={10} fontWeight="bold" transform="rotate(-35)">
          {payload.value}
        </text>
        <text x={0} y={12} dy={10} textAnchor="end" fill="#0ea5e9" fontSize={9} transform="rotate(-35)">
          {suporte}
        </text>
      </g>
    );
  };

  // Componente customizado para o Tooltip (Hover do mouse)
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg text-xs">
          <p className="font-bold text-slate-800 border-b pb-1 mb-2">{data.label}</p>
          <p className="text-slate-600 font-bold mb-2">Suporte: <span className="text-cyan-700">{data.suporte}</span></p>
          {payload.map((entry, index) => {
            // Se for PaO2 ou P/F e for um ponto interpolado, NÃO mostra no tooltip!
            if ((entry.dataKey === 'PaO2' || entry.dataKey === 'PF') && data.isInterpolated) {
              return null;
            }
            return (
              <p key={index} style={{ color: entry.color }} className="font-bold">
                {entry.name}: {entry.value !== null ? Number(entry.value).toFixed(1).replace('.0', '') : '-'}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // ==============================================================
  // 🔐 TELAS DE BLOQUEIO (PADRONIZADAS)
  // ==============================================================
  if (!currentPatient?.nome) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] mt-4 border-2 border-dashed border-slate-200 rounded-2xl bg-white p-12">
        <div className="bg-slate-50 w-24 h-24 rounded-full shadow-inner mb-6 border border-slate-100 flex items-center justify-center">
          <Lock size={40} className="text-slate-300 stroke-[1.5]" />
        </div>
        <h3 className="text-xl font-black text-slate-400 uppercase tracking-[0.2em]">Leito Disponível</h3>
      </div>
    );
  }

  if (!currentPatient.physio?.admitido && !currentPatient.physio?.suporte) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white border-2 border-dashed border-cyan-200 rounded-2xl animate-fadeIn mt-4">
        <div className="w-20 h-20 bg-cyan-50 text-cyan-500 rounded-full flex items-center justify-center mb-4 shadow-inner">
          <AlertTriangle size={40} className="stroke-[1.5]" />
        </div>
        <h3 className="text-xl font-black text-slate-700 mb-2 text-center">Admissão de Fisioterapia Pendente</h3>
        <p className="text-slate-500 text-center max-w-md mb-6">
          O paciente já foi alocado no leito, mas a avaliação inicial de fisioterapia ainda não foi realizada.
        </p>
        <button
          onClick={(e) => { e.preventDefault(); handlePhysioAdmission(); }}
          disabled={!isEditable}
          className="flex items-center justify-center gap-2 px-8 py-3 bg-[#10b981] hover:bg-[#059669] text-white font-bold rounded-lg shadow-md transition-all disabled:opacity-50"
        >
          <UserPlus size={20} /> Iniciar Admissão de Fisioterapia
        </button>
      </div>
    );
  }

  // ==============================================================
  // 3️⃣ DASHBOARD PRINCIPAL DA FISIO
  // ==============================================================
  return (
    <fieldset disabled={!isEditable} className="space-y-6 animate-fadeIn min-w-0 border-0 p-0 m-0">
      
      {/* === CABEÇALHO E BOTÃO DE ADMISSÃO === */}
      <div className="flex justify-between items-center mb-2 print:hidden">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Wind className="text-cyan-600" /> Fisioterapia
        </h3>
        <button
          onClick={(e) => { e.preventDefault(); handleViewPhysioAdmission(); }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-bold shadow-sm transition-colors"
        >
          <ClipboardSignature size={16} /> Ver Admissão Fisioterapêutica
        </button>
      </div>

      {/* ======================================================== */}
      {/* 1º BLOCO: REGISTROS DIÁRIOS (AGORA NO TOPO)             */}
      {/* ======================================================== */}
      <div className="mb-4 p-4 bg-white border border-slate-200 rounded-xl print:hidden shadow-sm">
        
        {/* BOTÃO QUE ABRE/FECHA A SEÇÃO */}
        <button 
          onClick={(e) => { e.preventDefault(); setShowAcoesFisio(!showAcoesFisio); }} 
          className="flex items-center gap-2 font-bold text-slate-700 w-full text-left"
        >
          {showAcoesFisio ? <ChevronDown size={20} className="text-cyan-600" /> : <ChevronRight size={20} className="text-slate-400" />} 
          <ClipboardList className={showAcoesFisio ? "text-cyan-600" : "text-slate-400"} size={18} />
          Registros e Procedimentos Diários
        </button>

        {showAcoesFisio && (
          <div className="mt-4 pt-4 border-t border-slate-100 animate-fadeIn">
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">

              <button 
                onClick={(e) => { 
                  e.preventDefault(); 
                  // Abre o modal pegando a hora atual do sistema arredondada para os minutos disponíveis
                  const agora = new Date();
                  const horaStr = String(agora.getHours()).padStart(2, '0');
                  setModalAspiracaoFisio({
                    isOpen: true,
                    horario: `${horaStr}:00`,
                    sistema: "", viaAerea: "", quantidade: "", caracteristica: "", coloracao: "",
                    oxigenacaoPre: "", intercorrencias: ""
                  });
                }} 
                className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white border border-slate-200 rounded-xl hover:bg-cyan-50 hover:border-cyan-300 transition-all group"
              >
                <Wind size={22} className="text-slate-400 group-hover:text-cyan-600 transition-colors" />
                <span className="text-[10px] font-bold text-slate-500 group-hover:text-cyan-700 uppercase leading-tight text-center transition-colors">Aspiração<br/>Vias Aéreas</span>
              </button>

              <button 
                type="button"
                onClick={(e) => { 
                  e.preventDefault(); 
                  const agora = new Date();
                  const horaStr = String(agora.getHours()).padStart(2, '0');
                  setModalVNI({
                    isOpen: true,
                    horario: `${horaStr}:00`,
                    modo: "", ipap: "", epap: "", peep: "", ps: "", o2: "",
                    tempo: "", unidadeTempo: "minutos", fr: "", spo2: ""
                  });
                }} 
                className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white border border-slate-200 rounded-xl hover:bg-cyan-50 hover:border-cyan-300 transition-all group"
              >
                <Gauge size={22} className="text-slate-400 group-hover:text-cyan-600 transition-colors" />
                <span className="text-[10px] font-bold text-slate-500 group-hover:text-cyan-700 uppercase leading-tight text-center transition-colors">Sessão<br/>de VNI</span>
              </button>

              <button 
                type="button"
                onClick={(e) => { 
                  e.preventDefault(); 
                  const agora = new Date();
                  const horaStr = String(agora.getHours()).padStart(2, '0');
                  setModalIOT({
                    isOpen: true,
                    horario: `${horaStr}:00`,
                    tentativa: "", condicao: "", numeroTubo: "", rima: "",
                    indicacao: "", indicacaoOutros: "", localInserção: "",
                    reintubacao48h: false,
                    // Checklist de conformidade (17 itens)
                    conformidade: {
                      material: "", identificacao: "", semAdornos: "", higieneMaos: "",
                      gorro: "", mascara: "", avental: "", luvaEsteril: "",
                      xylocaina: "", inducao: "", oportunidadeUnica: "", aspiradoVAS: "",
                      ausculta: "", fixado: "", sedacao: "", cuff: ""
                    },
                    medicoResponsavel: "", auditor: "", informacoesAdicionais: ""
                  });
                }} 
                className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white border border-slate-200 rounded-xl hover:bg-cyan-50 hover:border-cyan-300 transition-all group"
              >
                <Stethoscope size={22} className="text-slate-400 group-hover:text-cyan-600 transition-colors" />
                <span className="text-[10px] font-bold text-slate-500 group-hover:text-cyan-700 uppercase leading-tight text-center transition-colors">Checklist<br/>de IOT</span>
              </button>

              <button 
                type="button"
                onClick={(e) => { 
                  e.preventDefault(); 
                  const agora = new Date();
                  const horaStr = String(agora.getHours()).padStart(2, '0');
                  setModalTRE({
                    isOpen: true,
                    horario: `${horaStr}:00`,
                    cuffLeakFeito: false, cuffLeakResultado: "",
                    modo: "", o2: "", ps: "", peep: "", fio2: "",
                    duracao: "", irrs: "", desfecho: ""
                  });
                }} 
                className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white border border-slate-200 rounded-xl hover:bg-cyan-50 hover:border-cyan-300 transition-all group"
              >
                <Timer size={22} className="text-slate-400 group-hover:text-cyan-600 transition-colors" />
                <span className="text-[10px] font-bold text-slate-500 group-hover:text-cyan-700 uppercase leading-tight text-center transition-colors">Teste de<br/>Resp. Espontânea</span>
              </button>

              <button 
                type="button"
                onClick={(e) => { 
                  e.preventDefault(); 
                  const agora = new Date();
                  const horaStr = String(agora.getHours()).padStart(2, '0');
                  setModalExtubacao({
                    isOpen: true,
                    horario: `${horaStr}:00`,
                    nivelConscienciaOk: false, tosseEficaz: false, secrecaoControlada: false,
                    treSucesso: false, cuffLeakNegativo: false, balancoHidricoOk: false,
                    fio2Adequada: false, peepAdequada: false,
                    procedimentoRealizado: "", dispositivoPosExtubacao: ""
                  });
                }} 
                className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white border border-slate-200 rounded-xl hover:bg-cyan-50 hover:border-cyan-300 transition-all group"
              >
                <ArrowUpCircle size={22} className="text-slate-400 group-hover:text-cyan-600 transition-colors" />
                <span className="text-[10px] font-bold text-slate-500 group-hover:text-cyan-700 uppercase leading-tight text-center transition-colors">Protocolo de<br/>Extubação</span>
              </button>

              <button 
                type="button"
                onClick={(e) => { 
                  e.preventDefault(); 
                  const agora = new Date();
                  const horaStr = String(agora.getHours()).padStart(2, '0');
                  setModalMobilizacao({
                    isOpen: true, horario: `${horaStr}:00`, tipoExercicio: "",
                    alongamentoFeito: false, alongamentoSeries: "3", alongamentoReps: "10",
                    selecionados: [], parametros: {}, outrosTronco: ""
                  });
                }} 
                className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white border border-slate-200 rounded-xl hover:bg-cyan-50 hover:border-cyan-300 transition-all group"
              >
                <BicepsFlexed size={22} className="text-slate-400 group-hover:text-cyan-600 transition-colors" />
                <span className="text-[10px] font-bold text-slate-500 group-hover:text-cyan-700 uppercase leading-tight text-center transition-colors">Mobilização<br/>Precoce</span>
              </button>

            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 2º BLOCO: ANTROPOMETRIA (ABAIXO DOS REGISTROS)           */}
      {/* ======================================================== */}
      <div className="grid md:grid-cols-2 gap-4 bg-lime-50/40 p-4 rounded-xl border border-lime-100">
        <div>
          <label className="text-xs font-bold text-lime-700">Altura (m/cm)</label>
          <input
            type="number"
            step="0.01"
            className="w-full p-2 border rounded bg-white outline-none focus:ring-2 focus:ring-lime-300"
            value={currentPatient.nutri?.altura || ""}
            onChange={(e) => {
              const val = e.target.value;
              updateNested("nutri", "altura", val);
              if (val) {
                let h = parseFloat(val.replace(',', '.'));
                if (h > 0) {
                  if (h < 3) h = h * 100;
                  const sexo = currentPatient.sexo?.charAt(0).toUpperCase();
                  let predito = 0;
                  if (sexo === 'M') {
                    predito = 50 + 0.91 * (h - 152.4);
                  } else if (sexo === 'F') {
                    predito = 45.5 + 0.91 * (h - 152.4);
                  }
                  if (predito > 0) {
                    updateNested("nutri", "pesoPredito", predito.toFixed(1));
                  }
                }
              }
            }}
            onBlur={() => handleBlurSave("Fisioterapia: Editou Altura e calculou Peso Predito")}
          />
          {!currentPatient.sexo && <p className="text-[9px] text-red-500 mt-1 font-bold">*Preencha o Sexo no cadastro para o cálculo automático.</p>}
        </div>
        <div>
          <label className="text-xs font-bold text-lime-700">Peso Predito (kg)</label>
          <input
            type="number"
            className="w-full p-2 border rounded bg-white font-bold text-slate-700 outline-none focus:ring-2 focus:ring-lime-300"
            value={currentPatient.nutri?.pesoPredito || ""}
            onChange={(e) => updateNested("nutri", "pesoPredito", e.target.value)}
            onBlur={() => handleBlurSave("Fisioterapia: Editou Peso Predito")}
            title="Calculado automaticamente pela fórmula ARDSNet"
          />
        </div>
      </div>

          {/* DATAS DE VIA AÉREA */}
          <div className="grid md:grid-cols-4 gap-4 bg-cyan-50 p-4 rounded-xl border border-cyan-100">
             {/* INTUBAÇÃO */}
            <div>
              <label className="text-xs font-bold text-cyan-700 flex justify-between items-center mb-1">
                <span className="flex items-center gap-2">
                  Data Intubação
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setModalTrocaVA({ isOpen: true, tipo: 'TOT', data: currentPatient.dataUltimaTrocaTOT || "" });
                    }}
                    className="text-cyan-500 hover:text-cyan-800 transition-colors"
                    title="Última troca"
                  >
                    <RefreshCw size={14} />
                  </button>
                </span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    clearDate("dataIntubacao");
                    if (typeof registrarLogAuditoria === "function") {
                      registrarLogAuditoria("VIA AÉREA: INTUBAÇÃO", "Data apagada pelo utilizador", currentPatient.id, currentPatient.nome);
                    }
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
                onChange={(e) => updateP("dataIntubacao", e.target.value)}
                onBlur={(e) => {
                  handleBlurSave("Fisioterapia: Editou Data Intubação");
                  if (typeof registrarLogAuditoria === "function") {
                    registrarLogAuditoria("VIA AÉREA: INTUBAÇÃO", `Data alterada para: ${e.target.value || "Vazio"}`, currentPatient.id, currentPatient.nome);
                  }
                }}
              />
              {/* Exibe a data da última troca se existir */}
              {currentPatient.dataUltimaTrocaTOT && (
                <div className="text-[10px] font-semibold text-cyan-600 mt-1 animate-fadeIn">
                  Última troca: {new Date(currentPatient.dataUltimaTrocaTOT).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                </div>
              )}
            </div>
            {/* EXTUBAÇÃO */}
            <div>
              <label className="text-xs font-bold text-cyan-700 flex justify-between">
                Data Extubação
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    clearDate("dataExtubacao");
                    if (typeof registrarLogAuditoria === "function") {
                      registrarLogAuditoria("VIA AÉREA: EXTUBAÇÃO", "Data apagada pelo utilizador", currentPatient.id, currentPatient.nome);
                    }
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
                onChange={(e) => updateP("dataExtubacao", e.target.value)}
                onBlur={(e) => {
                  handleBlurSave("Fisioterapia: Editou Data Extubação");
                  if (typeof registrarLogAuditoria === "function") {
                    registrarLogAuditoria("VIA AÉREA: EXTUBAÇÃO", `Data alterada para: ${e.target.value || "Vazio"}`, currentPatient.id, currentPatient.nome);
                  }
                }}
              />
            </div>
             {/* TQT */}
            <div>
              <label className="text-xs font-bold text-cyan-700 flex justify-between items-center mb-1">
                <span className="flex items-center gap-2">
                  Data TQT
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setModalTrocaVA({ isOpen: true, tipo: 'TQT', data: currentPatient.dataUltimaTrocaTQT || "" });
                    }}
                    className="text-cyan-500 hover:text-cyan-800 transition-colors"
                    title="Última troca"
                  >
                    <RefreshCw size={14} />
                  </button>
                </span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    clearDate("dataTQT");
                    if (typeof registrarLogAuditoria === "function") {
                      registrarLogAuditoria("VIA AÉREA: TQT", "Data apagada pelo utilizador", currentPatient.id, currentPatient.nome);
                    }
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
                onBlur={(e) => {
                  handleBlurSave("Fisioterapia: Editou Data TQT");
                  if (typeof registrarLogAuditoria === "function") {
                    registrarLogAuditoria("VIA AÉREA: TQT", `Data alterada para: ${e.target.value || "Vazio"}`, currentPatient.id, currentPatient.nome);
                  }
                }}
              />
              {/* Exibe a data da última troca se existir */}
              {currentPatient.dataUltimaTrocaTQT && (
                <div className="text-[10px] font-semibold text-cyan-600 mt-1 animate-fadeIn">
                  Última troca: {new Date(currentPatient.dataUltimaTrocaTQT).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                </div>
              )}
            </div>
            {/* DECANULAÇÃO */}
            <div>
              <label className="text-xs font-bold text-cyan-700 flex justify-between">
                Data Decanulação
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    clearDate("dataDecanulacao");
                    if (typeof registrarLogAuditoria === "function") {
                      registrarLogAuditoria("VIA AÉREA: DECANULAÇÃO", "Data apagada pelo utilizador", currentPatient.id, currentPatient.nome);
                    }
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
                onChange={(e) => updateP("dataDecanulacao", e.target.value)}
                onBlur={(e) => {
                  handleBlurSave("Fisioterapia: Editou Data Decanulação");
                  if (typeof registrarLogAuditoria === "function") {
                    registrarLogAuditoria("VIA AÉREA: DECANULAÇÃO", `Data alterada para: ${e.target.value || "Vazio"}`, currentPatient.id, currentPatient.nome);
                  }
                }}
              />
            </div>
          </div>

          {/* SUPORTE VENTILATÓRIO */}
          <div className="p-4 border rounded-xl bg-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 mb-4">
              <h4 className="font-bold text-cyan-800 flex items-center gap-2 shrink-0">
                <Wind size={16} /> Suporte Ventilatório
                {(() => {
                  if (!currentPatient?.dataNascimento) return null;
                  const birthDate = new Date(currentPatient.dataNascimento);
                  const today = new Date();
                  let idade = today.getFullYear() - birthDate.getFullYear();
                  const m = today.getMonth() - birthDate.getMonth();
                  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) idade--;
                  const pO2Ideal = Math.round(109 - (0.43 * idade));
                  return <span className="ml-2 px-2 py-0.5 bg-cyan-100/80 text-cyan-800 text-[10px] font-black tracking-wide rounded-full border border-cyan-300 shadow-sm cursor-help" title={`Calculado para ${idade} anos | Fórmula (Supino): 109 - (0.43 x Idade)`}>PaO2 Ideal: {pO2Ideal}</span>;
                })()}
              </h4>
              <div className="flex flex-row items-center gap-3 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs w-full md:w-auto">
                <div className="flex flex-col flex-1">
                  <label className="text-[10px] md:text-xs font-semibold text-gray-700 mb-1 leading-tight truncate">Dias Prévios:</label>
                  <input
                    type="number"
                    className="w-full p-1 border border-cyan-300 rounded text-center font-bold text-cyan-700 outline-none focus:ring-2 focus:ring-cyan-500"
                    value={currentPatient.physio?.diasAcumuladosVM || ""}
                    onChange={(e) => updateNested("physio", "diasAcumuladosVM", parseInt(e.target.value) || 0)}
                    onBlur={() => handleBlurSave("Fisioterapia: Editou Dias Prévios de VM")}
                    placeholder="Ex: 5"
                  />
                </div>
                <div className="flex flex-col flex-1">
                  <label className="text-[10px] md:text-xs font-semibold text-gray-700 mb-1 leading-tight truncate">Tempo Total de VM:</label>
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

            <button
              onClick={() => setShowVmFlowsheet(true)}
              className="w-full mt-3 mb-4 p-2 bg-cyan-600 text-white font-bold rounded-lg shadow flex justify-center items-center gap-2 hover:bg-cyan-500 transition-colors uppercase text-xs"
            >
              <Map size={16} className="text-cyan-200"/> Abrir Mapa de Suporte Ventilatório
            </button>

            <select
              className="w-full p-2 border rounded mb-4 font-bold"
              value={currentPatient.physio?.suporte || ""}
              onChange={(e) => onSuporteChange(e.target.value)}
              onBlur={() => handleBlurSave("Fisioterapia: Alterou Suporte Ventilatório")}
            >
              <option value="">Selecione o suporte...</option>
              {SUPORTE_RESP_OPTS.map((o) => <option key={o}>{o}</option>)}
            </select>

            {/* PARÂMETROS CONDICIONAIS */}
            
            {/* CATETER NASAL / MÁSCARA NÃO REINALANTE / MACRONEBULIZAÇÃO TQT */}
            {(currentPatient.physio?.suporte === "Cateter Nasal" || currentPatient.physio?.suporte === "Máscara não reinalante" || currentPatient.physio?.suporte === "Macronebulização por TQT") && (
              <div className="grid grid-cols-2 gap-4 mb-2 animate-fadeIn">
                <div>
                  <label className="text-xs font-bold text-slate-700">Fluxo (L/min)</label>
                  <input
                    type="number"
                    className={`w-full p-2 border rounded outline-none transition-colors ${
                      currentPatient.physio?.suporte === "Cateter Nasal" && Number(currentPatient.physio?.fluxo) > 6 ? 'border-red-500 bg-red-50 text-red-700 focus:border-red-600' : 'border-slate-300 focus:border-cyan-500'
                    }`}
                    placeholder="Ex: 5"
                    value={currentPatient.physio?.fluxo || ""}
                    onChange={(e) => handleFluxoO2Change(e.target.value, currentPatient.physio?.suporte)}
                    onBlur={() => handleBlurSave("Fisioterapia: Editou Fluxo de O2")}
                  />
                  {currentPatient.physio?.suporte === "Cateter Nasal" && Number(currentPatient.physio?.fluxo) > 6 && (
                    <span className="text-[9px] text-red-600 font-bold mt-1 block">* Cateter Nasal idealmente até 6 L/min</span>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-cyan-800">FiO2 Estimada (%)</label>
                  <input
                    type="text"
                    className={`w-full p-2 border font-bold rounded outline-none transition-colors ${
                      currentPatient.physio?.fiO2 === "Fluxo insuficiente" ? 'border-red-400 bg-red-50 text-red-700 focus:border-red-500' : 'border-cyan-200 bg-cyan-50 text-cyan-900 focus:border-cyan-500'
                    }`}
                    value={currentPatient.physio?.fiO2 || ""}
                    onChange={(e) => updateNested("physio", "fiO2", e.target.value)}
                    onBlur={() => handleBlurSave("Fisioterapia: Ajustou FiO2 manualmente")}
                  />
                </div>
              </div>
            )}

            {/* VENTURI */}
            {currentPatient.physio?.suporte === "Venturi" && (
              <div className="grid grid-cols-2 gap-4 mb-2 animate-fadeIn">
                <div>
                  <label className="text-xs font-bold text-slate-700">Fluxo (L/min)</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded outline-none focus:border-cyan-500"
                    placeholder="Ex: 5"
                    value={currentPatient.physio?.fluxo || ""}
                    onChange={(e) => updateNested("physio", "fluxo", e.target.value)}
                    onBlur={() => handleBlurSave("Fisioterapia: Editou Fluxo Venturi")}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-cyan-800">FiO2 (%)</label>
                  <input
                    type="number"
                    className="w-full p-2 border border-cyan-200 rounded outline-none focus:border-cyan-500 bg-cyan-50 text-cyan-900 font-bold"
                    placeholder="%"
                    value={currentPatient.physio?.fiO2 || ""}
                    onChange={(e) => updateNested("physio", "fiO2", e.target.value)}
                    onBlur={() => handleBlurSave("Fisioterapia: Editou FiO2 Venturi")}
                  />
                </div>
              </div>
            )}

            {/* VNI */}
            {currentPatient.physio?.suporte === "VNI" && (
              <div className="grid grid-cols-2 gap-4 mb-2 animate-fadeIn">
                <div>
                  <label className="text-xs font-bold text-slate-700">Modo</label>
                  <select
                    className="w-full p-2 border rounded"
                    value={currentPatient.physio?.parametro || ""}
                    onChange={(e) => updateNested("physio", "parametro", e.target.value)}
                    onBlur={() => handleBlurSave("Fisioterapia: Alterou Modo VNI")}
                  >
                    <option value="">Selecione...</option>
                    <option value="CPAP">CPAP</option>
                    <option value="BIPAP">BIPAP</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">FiO2 (%)</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded"
                    value={currentPatient.physio?.fiO2 || ""}
                    onChange={(e) => updateNested("physio", "fiO2", e.target.value)}
                    onBlur={() => handleBlurSave("Fisioterapia: Editou FiO2 VNI")}
                  />
                </div>
              </div>
            )}

            {/* VM */}
            {currentPatient.physio?.suporte === "VM" && (
              <div className="animate-fadeIn">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase">Modo</label>
                    <select className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-cyan-200 text-xs" value={currentPatient.physio?.parametro || ""} onChange={(e) => handleModoVMChange(e.target.value)} onBlur={() => handleBlurSave("Fisioterapia: Alterou Modo VM")}>
                      <option value="">...</option>
                      {MODOS_VM && MODOS_VM.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  
                  {currentPatient.physio?.parametro === "VCV" ? (
                    <div className="animate-fadeIn">
                      <label className="text-[10px] font-bold text-blue-700 uppercase">Vt (ml)</label>
                      <input type="number" className="w-full p-2 border border-blue-200 rounded bg-blue-50/30 outline-none focus:ring-2 focus:ring-blue-400 text-xs font-bold" value={currentPatient.physio?.volCorrente || ""} onChange={(e) => updateNested("physio", "volCorrente", e.target.value)} onBlur={() => handleBlurSave("Fisioterapia: Editou Vol Corrente VM")} />
                    </div>
                  ) : currentPatient.physio?.parametro === "PCV" ? (
                    <div className="animate-fadeIn">
                      <label className="text-[10px] font-bold text-emerald-700 uppercase">PC (cmH2O)</label>
                      <input type="number" className="w-full p-2 border border-emerald-200 rounded bg-emerald-50/30 outline-none focus:ring-2 focus:ring-emerald-400 text-xs font-bold" value={currentPatient.physio?.pressaoControlada || ""} onChange={(e) => updateNested("physio", "pressaoControlada", e.target.value)} onBlur={() => handleBlurSave("Fisioterapia: Editou Pressão Controlada VM")} />
                    </div>
                  ) : currentPatient.physio?.parametro === "PSV" ? (
                    <div className="animate-fadeIn">
                      <label className="text-[10px] font-bold text-purple-700 uppercase">PS (cmH2O)</label>
                      <input type="number" className="w-full p-2 border border-purple-200 rounded bg-purple-50/30 outline-none focus:ring-2 focus:ring-purple-400 text-xs font-bold" value={currentPatient.physio?.pressaoSuporte || ""} onChange={(e) => updateNested("physio", "pressaoSuporte", e.target.value)} onBlur={() => handleBlurSave("Fisioterapia: Editou Pressão Suporte VM")} />
                    </div>
                  ) : (
                    <div className="opacity-60">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Alvo</label>
                      <input type="text" disabled className="w-full p-2 border border-slate-200 rounded bg-slate-50 text-xs" />
                    </div>
                  )}
                  
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase">PEEP</label>
                    <input type="number" className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-cyan-200 text-xs" value={currentPatient.physio?.peep || ""} onChange={(e) => updateNested("physio", "peep", e.target.value)} onBlur={() => handleBlurSave("Fisioterapia: Editou PEEP VM")} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 uppercase">FiO2 (%)</label>
                    <input type="number" className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-cyan-200 text-xs" value={currentPatient.physio?.fiO2 || ""} onChange={(e) => updateNested("physio", "fiO2", e.target.value)} onBlur={() => handleBlurSave("Fisioterapia: Editou FiO2 VM")} />
                  </div>
                </div>

                {currentPatient.nutri?.pesoPredito ? (
                  <div className="p-2 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-200 shadow-sm mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-wide">Meta VC (mL/kg)</span>
                      <span className="text-[10px] text-slate-500 font-semibold">Peso Predito: <span className="text-cyan-700">{currentPatient.nutri.pesoPredito} kg</span></span>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {[4, 5, 6, 7, 8].map((ratio) => {
                        const vc = Math.round(currentPatient.nutri.pesoPredito * ratio);
                        const isSelected = ratio === 6;
                        return (
                          <div key={ratio} className={`flex flex-col items-center py-0.5 rounded-lg border transition-all ${isSelected ? 'bg-cyan-600 border-cyan-600 shadow-md shadow-cyan-200' : 'bg-white border-slate-200 hover:border-cyan-300'}`}>
                            <span className={`text-[8px] font-bold ${isSelected ? 'text-cyan-200' : 'text-slate-400'}`}>{ratio} mL</span>
                            <span className={`text-[11px] font-black ${isSelected ? 'text-white' : 'text-slate-700'}`}>{vc}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-[9px] text-orange-500 font-bold italic mb-4">* Defina Altura para ver metas de Vt.</p>
                )}
              </div>
            )}
          </div>

          {/* VIA AÉREA, DISPOSITIVOS E SECREÇÃO */}
          <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col">
            <h4 className="font-bold text-slate-700 text-xs uppercase mb-4 flex items-center gap-2 shrink-0">Via Aérea, Dispositivos e Secreção</h4>
            
            {/* LINHA 1: COMPACTA (TOT, Rima, Cuff) */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="col-span-1"><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block truncate">TOT/TQT nº</label><input type="number" step="0.5" placeholder="8.0" className="w-full p-1.5 border rounded text-xs text-center text-slate-700 outline-none focus:ring-2 focus:ring-cyan-200" value={currentPatient.physio?.totNumero || ""} onChange={(e) => updateNested("physio", "totNumero", e.target.value)} onBlur={() => handleBlurSave("Fisioterapia: Editou TOT/TQT nº")} /></div>
              <div className="col-span-1"><label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block truncate">Rima (cm)</label><input type="number" placeholder="22" className="w-full p-1.5 border rounded text-xs text-center text-slate-700 outline-none focus:ring-2 focus:ring-cyan-200" value={currentPatient.physio?.totRima || ""} onChange={(e) => updateNested("physio", "totRima", e.target.value)} onBlur={() => handleBlurSave("Fisioterapia: Editou Rima TOT")} /></div>
              
              <div className="col-span-2 flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block text-center truncate" title="Pressão do Cuff: Manhã / Tarde / Noite">Pressão do Cuff (M|T|N)</label>
                <div className="flex gap-1 justify-center w-full">
                  <input type="number" placeholder="M" title="Manhã" className="flex-1 min-w-0 p-1.5 border rounded text-[10px] text-center text-slate-700 outline-none focus:ring-2 focus:ring-cyan-200" value={currentPatient.physio?.cuffM || ""} onChange={(e) => { const val = e.target.value; updateNested("physio", "cuffM", val); const flowsheet = currentPatient.physio?.vmFlowsheet; if (flowsheet && flowsheet.length > 0) { const updated = [...flowsheet]; updated[updated.length - 1] = { ...updated[updated.length - 1], cuffM: val }; updateNested("physio", "vmFlowsheet", updated); } }} onBlur={() => handleBlurSave("Fisioterapia: Editou Cuff (M)")} />
                  <input type="number" placeholder="T" title="Tarde" className="flex-1 min-w-0 p-1.5 border rounded text-[10px] text-center text-slate-700 outline-none focus:ring-2 focus:ring-cyan-200" value={currentPatient.physio?.cuffT || ""} onChange={(e) => { const val = e.target.value; updateNested("physio", "cuffT", val); const flowsheet = currentPatient.physio?.vmFlowsheet; if (flowsheet && flowsheet.length > 0) { const updated = [...flowsheet]; updated[updated.length - 1] = { ...updated[updated.length - 1], cuffT: val }; updateNested("physio", "vmFlowsheet", updated); } }} onBlur={() => handleBlurSave("Fisioterapia: Editou Cuff (T)")} />
                  <input type="number" placeholder="N" title="Noite" className="flex-1 min-w-0 p-1.5 border rounded text-[10px] text-center text-slate-700 outline-none focus:ring-2 focus:ring-cyan-200" value={currentPatient.physio?.cuffN || ""} onChange={(e) => { const val = e.target.value; updateNested("physio", "cuffN", val); const flowsheet = currentPatient.physio?.vmFlowsheet; if (flowsheet && flowsheet.length > 0) { const updated = [...flowsheet]; updated[updated.length - 1] = { ...updated[updated.length - 1], cuffN: val }; updateNested("physio", "vmFlowsheet", updated); } }} onBlur={() => handleBlurSave("Fisioterapia: Editou Cuff (N)")} />
                </div>
              </div>
            </div>
            
            {/* LINHA 2: Filtros */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-1"><label className="text-[10px] font-bold text-slate-700">Filtro HMEF</label><button onClick={(e) => { e.preventDefault(); clearDate("dataHMEF", "physio"); }} className="text-slate-400 hover:text-red-500"><X size={12} /></button></div>
                <div className="relative w-full"><div className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white flex justify-between items-center text-slate-800 font-bold"><span>{formatShort(currentPatient.physio?.dataHMEF)}</span><Calendar size={14} className="text-cyan-600" /></div><input type="date" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" value={currentPatient.physio?.dataHMEF || ""} onChange={(e) => updateNested("physio", "dataHMEF", e.target.value)} onBlur={() => handleBlurSave("Fisioterapia: Editou Data HMEF")} /></div>
                <div className="mt-1 text-[10px] font-bold text-center">{currentPatient.physio?.dataHMEF ? ( <span className={isDeviceExpired(currentPatient.physio?.dataHMEF, 168) ? "text-red-600" : "text-green-600"}>Trocar: {getTrocaShort(currentPatient.physio?.dataHMEF, 168)}</span> ) : <span className="text-slate-400">Sem data</span>}</div>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-1"><label className="text-[10px] font-bold text-slate-700">Traqueia SFA</label><button onClick={(e) => { e.preventDefault(); clearDate("dataSFA", "physio"); }} className="text-slate-400 hover:text-red-500"><X size={12} /></button></div>
                <div className="relative w-full"><div className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white flex justify-between items-center text-slate-800 font-bold"><span>{formatShort(currentPatient.physio?.dataSFA)}</span><Calendar size={14} className="text-cyan-600" /></div><input type="date" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" value={currentPatient.physio?.dataSFA || ""} onChange={(e) => updateNested("physio", "dataSFA", e.target.value)} onBlur={() => handleBlurSave("Fisioterapia: Editou Data SFA")} /></div>
                <div className="mt-1 text-[10px] font-bold text-center">{currentPatient.physio?.dataSFA ? ( <span className={isDeviceExpired(currentPatient.physio?.dataSFA, 168) ? "text-red-600" : "text-green-600"}>Trocar: {getTrocaShort(currentPatient.physio?.dataSFA, 168)}</span> ) : <span className="text-slate-400">Sem data</span>}</div>
              </div>
            </div>

            {/* LINHA 3: SECREÇÃO */}
            <div className="pt-3 border-t border-slate-100 mt-auto shrink-0">
              <h4 className="font-bold text-slate-700 text-[11px] uppercase mb-2">Secreção</h4>
              <label className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-600">
                <input type="checkbox" className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500" checked={currentPatient.physio?.secrecao || false} onChange={(e) => updateNested("physio", "secrecao", e.target.checked)} onBlur={() => handleBlurSave("Fisioterapia: Alterou Status Secreção")} /> 
                Apresentou Secreção?
              </label>
              {currentPatient.physio?.secrecao && (
                <div className="grid grid-cols-3 gap-2 animate-fadeIn">
                  <select className="p-1.5 border rounded text-[11px] outline-none focus:ring-2 focus:ring-cyan-200" value={currentPatient.physio?.secrecaoAspecto || ""} onChange={(e) => updateNested("physio", "secrecaoAspecto", e.target.value)} onBlur={() => handleBlurSave("Fisioterapia: Avaliou Aspecto Secreção")}><option value="">Aspecto...</option>{ASPECTO_SECRECAO.map((a) => <option key={a}>{a}</option>)}</select>
                  <select className="p-1.5 border rounded text-[11px] outline-none focus:ring-2 focus:ring-cyan-200" value={currentPatient.physio?.secrecaoColoracao || ""} onChange={(e) => updateNested("physio", "secrecaoColoracao", e.target.value)} onBlur={() => handleBlurSave("Fisioterapia: Avaliou Coloração Secreção")}><option value="">Coloração...</option>{COLORACAO_SECRECAO.map((c) => <option key={c}>{c}</option>)}</select>
                  <select className="p-1.5 border rounded text-[11px] outline-none focus:ring-2 focus:ring-cyan-200" value={currentPatient.physio?.secrecaoQtd || ""} onChange={(e) => updateNested("physio", "secrecaoQtd", e.target.value)} onBlur={() => handleBlurSave("Fisioterapia: Avaliou Qtd Secreção")}><option value="">Qtd...</option>{QTD_SECRECAO.map((q) => <option key={q}>{q}</option>)}</select>
                </div>
              )}
            </div>
          </div>

          {/* GASOMETRIA ARTERIAL */}
          <div className="p-4 bg-slate-50 border rounded-xl border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-700 flex items-center gap-2"><TestTube size={16} /> Gasometria</h4>
                {/* 🔥 NOVO BOTÃO DE HISTÓRICO */}
                <button 
                  onClick={(e) => { e.preventDefault(); setShowO2History(true); }}
                  className="p-1 bg-cyan-100 text-cyan-700 hover:bg-cyan-600 hover:text-white rounded-lg transition-colors shadow-sm"
                  title="Gráfico Evolutivo de O2"
                >
                  <ChartLine size={16} />
                </button>
              </div>
              <button onClick={handleCustomPrintGasometria} className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 print:hidden shadow transition-colors"><Printer size={14} /> Imprimir Relatório</button>
            </div>
            <fieldset disabled={!isEditable} className="overflow-x-auto rounded-lg border border-slate-200 min-w-0 border-0 p-0 m-0">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="bg-slate-200 text-slate-700">
                    <th className="p-2 text-left sticky left-0 bg-slate-200 border-r border-slate-300 z-10 shadow-[1px_0_0_0_#cbd5e1]">PARÂMETRO</th>
                    {isEditable && (
                      <th className="p-0 border-r border-slate-300 bg-blue-100 min-w-[40px]">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            const dataInput = prompt("Data da gasometria (DD/MM):");
                            if (!dataInput || !dataInput.trim()) return;
                            const horaInput = prompt("Horário (HH:MM):");
                            if (!horaInput || !horaInput.trim()) return;
                            const dataLimpa = dataInput.trim();
                            const horaLimpa = horaInput.trim();
                            const nomeColuna = `${dataLimpa} - ${horaLimpa}`;
                            const up = [...patients];
                            if (!up[activeTab].customGasometriaCols) up[activeTab].customGasometriaCols = [];
                            if (!up[activeTab].gasometriaHistory) up[activeTab].gasometriaHistory = {};
                            if (!up[activeTab].customGasometriaCols.includes(nomeColuna)) {
                              up[activeTab].customGasometriaCols.unshift(nomeColuna);
                            }
                            if (!up[activeTab].gasometriaHistory[nomeColuna]) up[activeTab].gasometriaHistory[nomeColuna] = {};
                            up[activeTab].gasometriaHistory[nomeColuna]["_hora"] = horaLimpa;
                            setPatients(up);
                            save(up[activeTab], `Fisioterapia: Adicionou gasometria em ${nomeColuna}`);
                          }}
                          className="text-blue-600 hover:text-blue-800 w-full h-full flex items-center justify-center p-2 transition-colors"
                          title="Adicionar Gasometria extra"
                        >
                          <PlusCircle size={18} />
                        </button>
                      </th>
                    )}
                    {sortedGasoCols.map((col) => (
                      <th key={col} className="p-2 border-l border-slate-300 min-w-[80px] align-top">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] leading-tight text-center w-full">{col.match(/^\d{4}-\d{2}-\d{2}$/) ? formatDateDDMM(col) : col}</span>
                          {currentPatient.customGasometriaCols?.includes(col) && isEditable && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                if (!window.confirm(`Excluir a coluna "${col}"?`)) return;
                                
                                // Marca edição local pendente
                                if (localEditRef) localEditRef.current = true;
                                
                                const up = [...patients];
                                up[activeTab].customGasometriaCols = up[activeTab].customGasometriaCols.filter((c) => c !== col);
                                if (up[activeTab].gasometriaHistory) delete up[activeTab].gasometriaHistory[col];
                                setPatients(up);
                                save(up[activeTab], `Fisioterapia: Excluiu coluna de Gasometria (${col})`);
                                
                                // Libera o ref após tempo suficiente para o Firebase processar
                                setTimeout(() => {
                                  if (localEditRef) localEditRef.current = false;
                                }, 3000);
                              }}
                              className="text-slate-400 hover:text-red-500 transition-colors" title="Excluir Coluna"
                            >
                              <X size={10} />
                            </button>
                          )}
                        </div>
                        {isEditable && (
                          <input
                            type="time"
                            value={editingHora[col] ?? currentPatient.gasometriaHistory?.[col]?.["_hora"] ?? ""}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              setEditingHora(prev => ({ ...prev, [col]: e.target.value }));
                            }}
                            onBlur={(e) => {
                              const val = e.target.value;
                              if (val !== (currentPatient.gasometriaHistory?.[col]?.["_hora"] || "")) {
                                const up = [...patients];
                                if (!up[activeTab].gasometriaHistory) up[activeTab].gasometriaHistory = {};
                                if (!up[activeTab].gasometriaHistory[col]) up[activeTab].gasometriaHistory[col] = {};
                                up[activeTab].gasometriaHistory[col]["_hora"] = val;
                                setPatients(up);
                                save(up[activeTab], `Fisioterapia: Horário definido para ${col}`);
                              }
                              setEditingHora(prev => {
                                const next = { ...prev };
                                delete next[col];
                                return next;
                              });
                            }}
                            className="w-full text-[10px] p-0.5 text-center border border-slate-200 rounded bg-white mt-1"
                          />
                        )}
                        {!isEditable && currentPatient.gasometriaHistory?.[col]?.["_hora"] && (
                          <div className="text-[10px] font-bold text-slate-500 mt-1">
                            🕐 {currentPatient.gasometriaHistory[col]["_hora"]}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {GASOMETRIA_PARAMS.map((param, rowIndex) => (
                    <tr key={param} className="border-b last:border-0 hover:bg-slate-100 bg-white transition-colors">
                      <td className="p-2 text-left font-bold text-slate-600 sticky left-0 bg-white border-r border-slate-200 z-10 shadow-[1px_0_0_0_#e2e8f0]">{param}</td>
                      {isEditable && <td className="bg-slate-50 border-r border-slate-200"></td>}
                      {sortedGasoCols.map((col, colIndex) => (
                        <td key={col} className="p-0 border-l border-slate-200">
                          <input type="text" data-gaso-row={rowIndex} data-gaso-col={colIndex} className="w-full h-full text-center outline-none bg-transparent focus:bg-blue-50 p-1.5 transition-colors" value={currentPatient.gasometriaHistory?.[col]?.[param] || ""} onKeyDown={(e) => handleGasoKeyDown(e, rowIndex, colIndex)} onChange={(e) => { const val = e.target.value; setPatients(prev => { const up = [...prev]; const p = JSON.parse(JSON.stringify(up[activeTab])); if (!p.gasometriaHistory) p.gasometriaHistory = {}; if (!p.gasometriaHistory[col]) p.gasometriaHistory[col] = {}; p.gasometriaHistory[col][param] = val; const pao2Str = p.gasometriaHistory[col]["PaO2"]; const fio2Str = p.gasometriaHistory[col]["FiO2"]; if (pao2Str && fio2Str) { const pao2 = parseFloat(pao2Str.toString().replace(',', '.')); let fio2 = parseFloat(fio2Str.toString().replace(',', '.')); if (!isNaN(pao2) && !isNaN(fio2) && fio2 > 0) { const decimalFio2 = fio2 >= 1 ? fio2 / 100 : fio2; const pf = (pao2 / decimalFio2).toFixed(0); p.gasometriaHistory[col]["P/F"] = pf; } } else if (p.gasometriaHistory[col]["Relação P/F"]) { p.gasometriaHistory[col]["P/F"] = ""; } up[activeTab] = p; return up; }); }} onBlur={() => handleBlurSave(`Gasometria: Editou ${param} (Ref: ${col})`)} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </fieldset>
          </div>

          {/* GERAR EVOLUÇÃO */}
          <div className="mt-8 mb-6 border-t-2 border-slate-200 pt-6">
            <button onClick={(e) => {
              e.preventDefault();
              setEvolucaoData({
                estadoGeral: currentPatient.physio?.estadoGeral || "",
                sistemaNervoso: currentPatient.physio?.sistemaNervoso || "",
                sistemaRespiratorio: currentPatient.physio?.sistemaRespiratorio || "",
                sistemaCardiovascular: currentPatient.physio?.sistemaCardiovascular || "",
                sistemaDigestivo: currentPatient.physio?.sistemaDigestivo || "",
                sistemaMusculoesqueletico: currentPatient.physio?.sistemaMusculoesqueletico || "",
                intercorrencias: currentPatient.physio?.intercorrencias || "",
                condutas: currentPatient.physio?.condutas || currentPatient.physio?.admissao_condutas || "",
                planoMetas: currentPatient.physio?.planoMetas || "",
                mobilizacao: [],
                mrcScore: "",
                ims: ""
              });
              setShowEvolucaoModal(true);
            }} 
            className="w-full p-4 bg-gradient-to-r from-cyan-700 to-blue-800 text-white font-black rounded-xl shadow-lg hover:from-cyan-600 hover:to-blue-700 transition-all flex justify-center items-center gap-3 uppercase tracking-wider text-sm"><FileText size={20} className="text-cyan-200" /> Gerar Evolução Diária
            </button>
          </div>

          <PhysioEvoModal
            showPhysioEvoModal={showEvolucaoModal}
            setShowPhysioEvoModal={setShowEvolucaoModal}
            currentPatient={currentPatient}
            updateNested={updateNested}
            handleBlurSave={handleBlurSave}
            handleGeneratePhysioEvo={handleGeneratePhysioEvo}
          />

      {/* MODAL DE GRÁFICO EVOLUTIVO DE O2 (RECHARTS) */}
      {showO2History && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
            <div className="bg-cyan-700 p-4 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-2">
                <Activity size={24} />
                <h2 className="text-lg font-black tracking-wide">Evolução de Oxigenação e Suporte</h2>
              </div>
              <button onClick={() => setShowO2History(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
              {chartData.length > 0 ? (
                <div className="h-[450px] w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      
                      <XAxis 
                        dataKey="label" 
                        tick={<CustomXAxisTick />} 
                        interval="preserveStartEnd"
                      />
                      
                      {/* Eixo Y Esquerdo (PaO2 e P/F) */}
                      <YAxis 
                        yAxisId="left" 
                        tick={{fontSize: 11, fill: '#64748b'}} 
                        axisLine={false} 
                        tickLine={false}
                      />
                      
                      {/* Eixo Y Direito (FiO2 em %) - Cor Laranja */}
                      <YAxis 
                        yAxisId="right" 
                        orientation="right" 
                        domain={[20, 100]} 
                        tick={{fontSize: 11, fill: '#ea580c', fontWeight: 'bold'}} 
                        axisLine={false} 
                        tickLine={false}
                      />
                      
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontWeight: 'bold', fontSize: '12px' }}/>
                      
                      {/* 1º - FiO2: connectNulls={true}. Linha contínua sempre */}
                      <Line 
                        yAxisId="right" 
                        type="monotone" 
                        name="FiO2 (%)" 
                        dataKey="FiO2" 
                        stroke="#ea580c" 
                        strokeWidth={3} 
                        connectNulls={true} 
                        dot={{r: 4, strokeWidth: 2}} 
                        activeDot={{r: 6}} 
                      />

                      {/* 2º - PaO2: connectNulls={false}. As bolinhas somem nos pontos interpolados */}
                      <Line 
                        yAxisId="left" 
                        type="monotone" 
                        name="PaO2" 
                        dataKey="PaO2" 
                        stroke="#0284c7" 
                        strokeWidth={3} 
                        connectNulls={false} 
                        dot={(props) => props.payload.isInterpolated ? null : <circle cx={props.cx} cy={props.cy} r={4} stroke={props.stroke} strokeWidth={2} fill="#fff" />} 
                        activeDot={(props) => props.payload.isInterpolated ? null : <circle cx={props.cx} cy={props.cy} r={6} fill={props.stroke} stroke="#fff" strokeWidth={2} />} 
                      />
                      
                      {/* 3º - P/F: connectNulls={false}. As bolinhas somem nos pontos interpolados */}
                      <Line 
                        yAxisId="left" 
                        type="monotone" 
                        name="P/F" 
                        dataKey="PF" 
                        stroke="#16a34a" 
                        strokeWidth={3} 
                        connectNulls={false} 
                        dot={(props) => props.payload.isInterpolated ? null : <circle cx={props.cx} cy={props.cy} r={4} stroke={props.stroke} strokeWidth={2} fill="#fff" />} 
                        activeDot={(props) => props.payload.isInterpolated ? null : <circle cx={props.cx} cy={props.cy} r={6} fill={props.stroke} stroke="#fff" strokeWidth={2} />} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center p-8 bg-white rounded-xl border border-slate-200">
                  <div className="flex justify-center mb-4"><Activity size={40} className="text-slate-300" /></div>
                  <p className="text-slate-500 font-medium">Nenhum histórico de gasometria ou suporte registrado ainda.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ÚLTIMA TROCA DE VIA AÉREA                                          */}
      {/* ========================================================================= */}
      {modalTrocaVA?.isOpen && (
        <ModalPortal>
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-cyan-500/20">
            
            <div className="bg-cyan-600 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><RefreshCw size={20} /></div>
                <h2 className="text-lg font-black tracking-wide leading-tight">Última Troca ({modalTrocaVA.tipo})</h2>
              </div>
              <button onClick={() => setModalTrocaVA({ isOpen: false, tipo: "", data: "" })} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 bg-slate-50 space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Data da Troca</label>
                <input 
                  type="date" 
                  className="w-full p-3 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300 font-bold text-center text-lg shadow-inner bg-white"
                  value={modalTrocaVA.data}
                  onChange={(e) => setModalTrocaVA({ ...modalTrocaVA, data: e.target.value })}
                />
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button onClick={() => setModalTrocaVA({ isOpen: false, tipo: "", data: "" })} className="px-4 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">
                  Cancelar
                </button>
                <button onClick={salvarTrocaVA} className="flex-1 py-4 bg-cyan-600 hover:bg-cyan-700 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider">
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* ========================================================================= */}
      {/* MODAL EXCLUSIVO: ASPIRAÇÃO TRAQUEAL DA FISIOTERAPIA v2                     */}
      {/* ========================================================================= */}
      {modalAspiracaoFisio?.isOpen && (
        <ModalPortal>
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4 text-left">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-fade-in border-4 border-cyan-500/20">
            
            {/* CABEÇALHO FIXO */}
            <div className="bg-cyan-700 p-4 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><Wind size={20} /></div>
                <h2 className="text-lg font-black tracking-wide">Aspiração Traqueal (Fisio)</h2>
              </div>
              <button onClick={() => setModalAspiracaoFisio({ ...modalAspiracaoFisio, isOpen: false })} className="p-1 hover:bg-white/20 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* CORPO ROLÁVEL */}
            <div className="p-5 bg-slate-50 space-y-6 overflow-y-auto">

              {/* HORÁRIO DA ASPIRAÇÃO */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block text-center">Horário da Aspiração</label>
                <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
                  <select className="w-24 p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalAspiracaoFisio.horario ? modalAspiracaoFisio.horario.split(':')[0] : "08"} onChange={(e) => setModalAspiracaoFisio({ ...modalAspiracaoFisio, horario: `${e.target.value}:${modalAspiracaoFisio.horario ? modalAspiracaoFisio.horario.split(':')[1] : '00'}` })}>
                    {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}h</option>)}
                  </select>
                  <span className="text-3xl font-black text-slate-300 pb-1">:</span>
                  <select className="w-24 p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalAspiracaoFisio.horario ? modalAspiracaoFisio.horario.split(':')[1] : "00"} onChange={(e) => setModalAspiracaoFisio({ ...modalAspiracaoFisio, horario: `${modalAspiracaoFisio.horario ? modalAspiracaoFisio.horario.split(':')[0] : '00'}:${e.target.value}` })}>
                    {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* SISTEMA E VIA AÉREA */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block text-center">Sistema</label>
                  <div className="grid grid-cols-1 gap-2">
                    {['Aberto', 'Fechado'].map(sist => (
                      <button key={sist} type="button" onClick={() => setModalAspiracaoFisio({ ...modalAspiracaoFisio, sistema: sist })} className={`p-2.5 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalAspiracaoFisio.sistema === sist ? 'border-cyan-500 bg-cyan-50 text-cyan-700 shadow-sm scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-cyan-200'}`}>{sist}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block text-center">Via Aérea</label>
                  <div className="grid grid-cols-1 gap-2">
                    {['TOT', 'TQT', 'VAS'].map(via => (
                      <button key={via} type="button" onClick={() => setModalAspiracaoFisio({ ...modalAspiracaoFisio, viaAerea: via })} className={`p-2.5 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalAspiracaoFisio.viaAerea === via ? 'border-cyan-500 bg-cyan-50 text-cyan-700 shadow-sm scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-cyan-200'}`}>{via}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* QUANTIDADE DE SECREÇÃO */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block text-center">Quantidade de Secreção</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['Pequena', 'Moderada', 'Grande', 'Abundante'].map(qtd => (
                    <button key={qtd} type="button" onClick={() => setModalAspiracaoFisio({ ...modalAspiracaoFisio, quantidade: qtd })} className={`p-2 rounded-xl border-2 font-bold text-[10px] uppercase tracking-wide transition-all ${modalAspiracaoFisio.quantidade === qtd ? 'border-cyan-500 bg-cyan-50 text-cyan-700 shadow-sm scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-cyan-200'}`}>{qtd}</button>
                  ))}
                </div>
              </div>

              {/* CARACTERÍSTICA */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block text-center">Característica</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['Fluida', 'Espessa', 'Mucoide', 'Mucopurul.', 'Hemoptoica', 'Hemática', 'Espumosa', 'Rolhas'].map(c => (
                    <button key={c} type="button" onClick={() => setModalAspiracaoFisio({ ...modalAspiracaoFisio, caracteristica: c })} className={`p-2 rounded-xl border-2 font-bold text-[10px] uppercase tracking-wide transition-all ${modalAspiracaoFisio.caracteristica === c ? 'border-cyan-500 bg-cyan-50 text-cyan-700 shadow-sm scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-cyan-200'}`}>{c}</button>
                  ))}
                </div>
              </div>

              {/* COLORAÇÃO */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block text-center">Coloração</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['Transparente', 'Esbranquiçada', 'Amarelada', 'Esverdeada', 'Acastanhada', 'Hemática'].map(cor => (
                    <button key={cor} type="button" onClick={() => setModalAspiracaoFisio({ ...modalAspiracaoFisio, coloracao: cor })} className={`p-2 rounded-xl border-2 font-bold text-[10px] uppercase tracking-wide transition-all ${modalAspiracaoFisio.coloracao === cor ? 'border-cyan-500 bg-cyan-50 text-cyan-700 shadow-sm scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-cyan-200'}`}>{cor}</button>
                  ))}
                </div>
              </div>

              {/* OXIGENAÇÃO PRÉVIA */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Oximetria (SatO₂ Pré)</label>
                <div className="flex items-center justify-center gap-3">
                  <input type="number" min="0" max="100" value={modalAspiracaoFisio.oxigenacaoPre || ""} onChange={(e) => setModalAspiracaoFisio({ ...modalAspiracaoFisio, oxigenacaoPre: e.target.value })} placeholder="Ex: 95" className="w-32 p-3 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300 text-center text-lg font-bold" />
                  <span className="text-xs font-bold text-slate-400 uppercase">%</span>
                </div>
              </div>

              {/* INTERCORRÊNCIAS */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Intercorrências</label>
                <textarea value={modalAspiracaoFisio.intercorrencias || ""} onChange={(e) => setModalAspiracaoFisio({ ...modalAspiracaoFisio, intercorrencias: e.target.value })} placeholder="Tosse, desconforto, sangramento, etc." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300 text-sm resize-none h-16" />
              </div>
            </div>

            {/* RODAPÉ FIXO COM BOTÕES */}
            <div className="p-4 bg-white border-t border-slate-200 flex gap-3 shrink-0">
              <button type="button" onClick={() => setModalAspiracaoFisio({ ...modalAspiracaoFisio, isOpen: false })} className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">
                Cancelar
              </button>
              <button 
                type="button"
                disabled={!modalAspiracaoFisio.horario || !modalAspiracaoFisio.sistema || !modalAspiracaoFisio.viaAerea || !modalAspiracaoFisio.quantidade || !modalAspiracaoFisio.caracteristica || !modalAspiracaoFisio.coloracao} 
                onClick={salvarAspiracaoFisio} 
                className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"
              >
                Salvar
              </button>
            </div>

          </div>
        </div>
        </ModalPortal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SESSÃO DE VNI                                                      */}
      {/* ========================================================================= */}
      {modalVNI?.isOpen && (
        <ModalPortal>
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4 text-left">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-fade-in border-4 border-cyan-500/20">
            
            {/* CABEÇALHO FIXO */}
            <div className="bg-cyan-700 p-4 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><Gauge size={20} /></div>
                <h2 className="text-lg font-black tracking-wide">Sessão de VNI</h2>
              </div>
              <button onClick={() => setModalVNI({ ...modalVNI, isOpen: false })} className="p-1 hover:bg-white/20 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* CORPO ROLÁVEL */}
            <div className="p-5 bg-slate-50 space-y-6 overflow-y-auto">

              {/* HORÁRIO */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block text-center">Horário</label>
                <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
                  <select className="w-24 p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalVNI.horario ? modalVNI.horario.split(':')[0] : "08"} onChange={(e) => setModalVNI({ ...modalVNI, horario: `${e.target.value}:${modalVNI.horario ? modalVNI.horario.split(':')[1] : '00'}` })}>
                    {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}h</option>)}
                  </select>
                  <span className="text-3xl font-black text-slate-300 pb-1">:</span>
                  <select className="w-24 p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalVNI.horario ? modalVNI.horario.split(':')[1] : "00"} onChange={(e) => setModalVNI({ ...modalVNI, horario: `${modalVNI.horario ? modalVNI.horario.split(':')[0] : '00'}:${e.target.value}` })}>
                    {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* MODO VNI */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block text-center">Modo</label>
                <div className="grid grid-cols-3 gap-2">
                  {['BIPAP', 'CPAP', 'PSV'].map(m => (
                    <button key={m} type="button" onClick={() => setModalVNI({ ...modalVNI, modo: m })} className={`p-2.5 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalVNI.modo === m ? 'border-cyan-500 bg-cyan-50 text-cyan-700 shadow-sm scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-cyan-200'}`}>{m}</button>
                  ))}
                </div>
              </div>

              {/* PARÂMETROS DINÂMICOS CONFORME O MODO */}
              {modalVNI.modo && (
                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm animate-fadeIn">
                  <label className="text-[10px] font-bold text-cyan-700 uppercase mb-3 block text-center border-b border-slate-100 pb-2">Parâmetros ({modalVNI.modo})</label>
                  
                  {modalVNI.modo === 'BIPAP' && (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">IPAP</label>
                        <input type="number" className="w-full p-2 border border-slate-200 rounded-lg text-center font-bold outline-none focus:ring-2 focus:ring-cyan-300 text-slate-700" value={modalVNI.ipap} onChange={e => setModalVNI({...modalVNI, ipap: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">EPAP</label>
                        <input type="number" className="w-full p-2 border border-slate-200 rounded-lg text-center font-bold outline-none focus:ring-2 focus:ring-cyan-300 text-slate-700" value={modalVNI.epap} onChange={e => setModalVNI({...modalVNI, epap: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">O₂</label>
                        <input type="text" placeholder="L/min" className="w-full p-2 border border-slate-200 rounded-lg text-center font-bold outline-none focus:ring-2 focus:ring-cyan-300 text-slate-700" value={modalVNI.o2} onChange={e => setModalVNI({...modalVNI, o2: e.target.value})} />
                      </div>
                    </div>
                  )}

                  {modalVNI.modo === 'CPAP' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">PEEP</label>
                        <input type="number" className="w-full p-2 border border-slate-200 rounded-lg text-center font-bold outline-none focus:ring-2 focus:ring-cyan-300 text-slate-700" value={modalVNI.peep} onChange={e => setModalVNI({...modalVNI, peep: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">O₂</label>
                        <input type="text" placeholder="L/min" className="w-full p-2 border border-slate-200 rounded-lg text-center font-bold outline-none focus:ring-2 focus:ring-cyan-300 text-slate-700" value={modalVNI.o2} onChange={e => setModalVNI({...modalVNI, o2: e.target.value})} />
                      </div>
                    </div>
                  )}

                  {modalVNI.modo === 'PSV' && (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">PS</label>
                        <input type="number" className="w-full p-2 border border-slate-200 rounded-lg text-center font-bold outline-none focus:ring-2 focus:ring-cyan-300 text-slate-700" value={modalVNI.ps} onChange={e => setModalVNI({...modalVNI, ps: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">PEEP</label>
                        <input type="number" className="w-full p-2 border border-slate-200 rounded-lg text-center font-bold outline-none focus:ring-2 focus:ring-cyan-300 text-slate-700" value={modalVNI.peep} onChange={e => setModalVNI({...modalVNI, peep: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">FiO₂ (%)</label>
                        <input type="number" className="w-full p-2 border border-slate-200 rounded-lg text-center font-bold outline-none focus:ring-2 focus:ring-cyan-300 text-slate-700" value={modalVNI.o2} onChange={e => setModalVNI({...modalVNI, o2: e.target.value})} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TEMPO DE UTILIZAÇÃO */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Tempo de utilização</label>
                  <input type="number" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300 text-center font-bold" value={modalVNI.tempo} onChange={e => setModalVNI({...modalVNI, tempo: e.target.value})} />
                </div>
                <div className="flex-1">
                  <select className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300 font-bold appearance-none cursor-pointer text-center" value={modalVNI.unidadeTempo} onChange={e => setModalVNI({...modalVNI, unidadeTempo: e.target.value})}>
                    <option value="minutos">Minutos</option>
                    <option value="horas">Horas</option>
                  </select>
                </div>
              </div>

              {/* SINAIS VITAIS DURANTE TERAPIA */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-cyan-50/50 rounded-xl border border-cyan-100">
                <div>
                  <label className="text-[10px] font-bold text-cyan-800 uppercase mb-2 block text-center">FR (irpm)</label>
                  <input type="number" className="w-full p-3 bg-white border border-cyan-200 rounded-xl text-cyan-900 outline-none focus:ring-2 focus:ring-cyan-400 text-center font-black text-lg" value={modalVNI.fr} onChange={e => setModalVNI({...modalVNI, fr: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-cyan-800 uppercase mb-2 block text-center">SpO₂ (%)</label>
                  <input type="number" className="w-full p-3 bg-white border border-cyan-200 rounded-xl text-cyan-900 outline-none focus:ring-2 focus:ring-cyan-400 text-center font-black text-lg" value={modalVNI.spo2} onChange={e => setModalVNI({...modalVNI, spo2: e.target.value})} />
                </div>
              </div>

            </div>

            {/* RODAPÉ FIXO */}
            <div className="p-4 bg-white border-t border-slate-200 flex gap-3 shrink-0">
              <button type="button" onClick={() => setModalVNI({ ...modalVNI, isOpen: false })} className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">
                Cancelar
              </button>
              <button 
                type="button"
                disabled={!modalVNI.modo || !modalVNI.tempo || !modalVNI.fr || !modalVNI.spo2} 
                onClick={salvarVNI} 
                className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"
              >
                Salvar Sessão
              </button>
            </div>

          </div>
        </div>
        </ModalPortal>
      )}

      {/*  */}
      {/* MODAL EXCLUSIVO: CHECKLIST DE IOT - PREVENÇÃO DE PAV                      */}
      {/*  */}
      {modalIOT?.isOpen && (
        <ModalPortal>
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4 text-left">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-fade-in border-4 border-cyan-500/20">
            
            {/* CABEÇALHO FIXO */}
            <div className="bg-cyan-700 p-4 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><Stethoscope size={20} /></div>
                <div>
                  <h2 className="text-lg font-black tracking-wide">Checklist de IOT</h2>
                  <p className="text-[10px] text-cyan-100 font-semibold">Prevenção de Pneumonia Associada à Ventilação Mecânica (PAV)</p>
                </div>
              </div>
              <button onClick={() => setModalIOT(null)} className="p-1 hover:bg-white/20 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* CORPO ROLÁVEL */}
            <div className="p-5 bg-slate-50 space-y-6 overflow-y-auto">

              {/* HORÁRIO */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block text-center">Horário do Procedimento</label>
                <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
                  <select className="w-24 p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalIOT.horario ? modalIOT.horario.split(':')[0] : "08"} onChange={(e) => setModalIOT({ ...modalIOT, horario: `${e.target.value}:${modalIOT.horario ? modalIOT.horario.split(':')[1] : '00'}` })}>
                    {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}h</option>)}
                  </select>
                  <span className="text-3xl font-black text-slate-300 pb-1">:</span>
                  <select className="w-24 p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalIOT.horario ? modalIOT.horario.split(':')[1] : "00"} onChange={(e) => setModalIOT({ ...modalIOT, horario: `${modalIOT.horario ? modalIOT.horario.split(':')[0] : '00'}:${e.target.value}` })}>
                    {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* INSERÇÃO DO TUBO */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-cyan-700 uppercase tracking-wider border-b border-cyan-200 pb-1">Inserção do Tubo</h3>

                {/* TENTATIVA */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block text-center">Inserção do Tubo Traqueal</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Primeira Tentativa', 'Segunda Tentativa', 'Outras'].map(op => (
                      <button key={op} type="button" onClick={() => setModalIOT({ ...modalIOT, tentativa: op })} className={`p-2 rounded-xl border-2 font-bold text-[10px] uppercase tracking-wide transition-all ${modalIOT.tentativa === op ? 'border-cyan-500 bg-cyan-50 text-cyan-700 shadow-sm scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-cyan-200'}`}>{op}</button>
                    ))}
                  </div>
                </div>

                {/* CONDIÇÃO */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block text-center">Condição</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Urgência e Emergência', 'Programado'].map(op => (
                      <button key={op} type="button" onClick={() => setModalIOT({ ...modalIOT, condicao: op })} className={`p-2 rounded-xl border-2 font-bold text-[10px] uppercase tracking-wide transition-all ${modalIOT.condicao === op ? 'border-cyan-500 bg-cyan-50 text-cyan-700 shadow-sm scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-cyan-200'}`}>{op}</button>
                    ))}
                  </div>
                </div>

                {/* NÚMERO DO TUBO E RIMA */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block text-center">Nº do Tubo Orotraqueal</label>
                    <input type="text" value={modalIOT.numeroTubo || ""} onChange={(e) => setModalIOT({ ...modalIOT, numeroTubo: e.target.value })} placeholder="Ex: 7.5" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300 text-center text-sm font-bold" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block text-center">Rima</label>
                    <input type="text" value={modalIOT.rima || ""} onChange={(e) => setModalIOT({ ...modalIOT, rima: e.target.value })} placeholder="Ex: 21 cm" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300 text-center text-sm font-bold" />
                  </div>
                </div>

                {/* INDICAÇÃO */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block text-center">Indicação</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Rebaixamento de nível de consciência', 'IRPA', 'Cirurgia eletiva', 'Outros'].map(op => (
                      <button key={op} type="button" onClick={() => setModalIOT({ ...modalIOT, indicacao: op })} className={`p-2 rounded-xl border-2 font-bold text-[10px] uppercase tracking-wide transition-all ${modalIOT.indicacao === op ? 'border-cyan-500 bg-cyan-50 text-cyan-700 shadow-sm scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-cyan-200'}`}>{op}</button>
                    ))}
                  </div>
                  {modalIOT.indicacao === 'Outros' && (
                    <input type="text" value={modalIOT.indicacaoOutros || ""} onChange={(e) => setModalIOT({ ...modalIOT, indicacaoOutros: e.target.value })} placeholder="Especifique a indicação..." className="w-full p-3 mt-2 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300 text-sm" />
                  )}
                </div>

                {/* LOCAL DA INSERÇÃO */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block text-center">Local da Inserção</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Orotraqueal', 'Nasotraqueal', 'Traqueostomia'].map(op => (
                      <button key={op} type="button" onClick={() => setModalIOT({ ...modalIOT, localInserção: op })} className={`p-2 rounded-xl border-2 font-bold text-[10px] uppercase tracking-wide transition-all ${modalIOT.localInserção === op ? 'border-cyan-500 bg-cyan-50 text-cyan-700 shadow-sm scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-cyan-200'}`}>{op}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* REINTUBAÇÃO < 48H */}
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className="text-[10px] font-black text-amber-700 uppercase tracking-wider block">Reintubação &lt; 48h</label>
                    <p className="text-[10px] text-amber-600/80 mt-0.5">Clique se o paciente foi reintubado em menos de 48h após extubação prévia</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalIOT({ ...modalIOT, reintubacao48h: !modalIOT.reintubacao48h })}
                    className={`px-4 py-2.5 rounded-xl border-2 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
                      modalIOT.reintubacao48h
                        ? 'border-red-500 bg-red-500 text-white shadow-md scale-[1.02]'
                        : 'border-amber-300 bg-white text-amber-600 hover:border-amber-400'
                    }`}
                  >
                    {modalIOT.reintubacao48h ? '✓ Sim' : 'Não'}
                  </button>
                </div>
              </div>

              {/* USO DE VNI */}
              <div className="bg-violet-50 border-2 border-violet-200 rounded-xl p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className="text-[10px] font-black text-violet-700 uppercase tracking-wider block">Foi realizado ou considerado o uso de VNI?</label>
                    <p className="text-[10px] text-violet-600/80 mt-0.5">Ventilação Não Invasiva durante ou após o procedimento</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalIOT({ ...modalIOT, vni: !modalIOT.vni })}
                    className={`px-4 py-2.5 rounded-xl border-2 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
                      modalIOT.vni
                        ? 'border-violet-500 bg-violet-500 text-white shadow-md scale-[1.02]'
                        : 'border-violet-300 bg-white text-violet-600 hover:border-violet-400'
                    }`}
                  >
                    {modalIOT.vni ? '✓ Sim' : 'Não'}
                  </button>
                </div>
              </div>

              {/* CHECKLIST DE CONFORMIDADE */}
              <div>
                <h3 className="text-xs font-black text-cyan-700 uppercase tracking-wider border-b border-cyan-200 pb-1 mb-3">Checklist de Boas Práticas</h3>
                <p className="text-[10px] text-slate-400 mb-3 text-center font-semibold">Conformidade: Sim / Não / Sim, depois de lembrado</p>
                <div className="space-y-2">
                  {[
                    { key: 'material', label: 'Selecionou e conferiu o material?' },
                    { key: 'identificacao', label: 'Conferiu a identificação do paciente?' },
                    { key: 'semAdornos', label: 'Equipe sem adornos?' },
                    { key: 'higieneMaos', label: 'Foi realizado higiene das mãos com a técnica correta?' },
                    { key: 'gorro', label: 'Foi utilizado gorro?' },
                    { key: 'mascara', label: 'Uso de Máscara por todos os envolvidos?' },
                    { key: 'avental', label: 'Uso de Avental?' },
                    { key: 'luvaEsteril', label: 'Uso de Luva Estéril?' },
                    { key: 'xylocaina', label: 'Uso de Xylocaína?' },
                    { key: 'inducao', label: 'Realizou indução medicamentosa?' },
                    { key: 'oportunidadeUnica', label: 'Inserção em oportunidade única?' },
                    { key: 'aspiradoVAS', label: 'Aspirado VAS antes do procedimento?' },
                    { key: 'ausculta', label: 'Feito ausculta pulmonar para fixação do TOT?' },
                    { key: 'fixado', label: 'Fixado TOT corretamente?' },
                    { key: 'sedacao', label: 'Instalou sedação conforme prescrição médica?' },
                    { key: 'cuff', label: 'Ajustou pressão do Cuff entre 20 e 30 cmH2O?' }
                  ].map(item => (
                    <div key={item.key} className="bg-white border border-slate-200 rounded-xl p-2.5">
                      <p className="text-xs font-semibold text-slate-700 mb-2">{item.label}</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {['Sim', 'Não', 'Sim, depois de lembrado'].map(op => (
                          <button key={op} type="button" onClick={() => setModalIOT({ ...modalIOT, conformidade: { ...modalIOT.conformidade, [item.key]: op } })} className={`p-1.5 rounded-lg border-2 font-bold text-[9px] uppercase tracking-wide transition-all ${modalIOT.conformidade[item.key] === op ? 'border-cyan-500 bg-cyan-50 text-cyan-700 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-cyan-200'}`}>{op}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* MÉDICO RESPONSÁVEL (lista) */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Médico Responsável pela IOT</label>
                <select 
                  value={modalIOT.medicoResponsavel || ""} 
                  onChange={(e) => setModalIOT({ ...modalIOT, medicoResponsavel: e.target.value })} 
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-300 outline-none text-slate-800 font-bold text-sm"
                >
                  <option value="">Selecione o médico...</option>
                  {listaMedicos.map((med) => (
                    <option key={med.id} value={med.nome}>{med.nome}</option>
                  ))}
                </select>
              </div>

              {/* AUDITOR DO CHECKLIST */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Auditor do Checklist</label>
                <input type="text" value={modalIOT.auditor || ""} onChange={(e) => setModalIOT({ ...modalIOT, auditor: e.target.value })} placeholder="Nome do auditor" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300 text-sm" />
              </div>

              {/* INFORMAÇÕES ADICIONAIS */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block text-center">Informações Adicionais</label>
                <textarea value={modalIOT.informacoesAdicionais || ""} onChange={(e) => setModalIOT({ ...modalIOT, informacoesAdicionais: e.target.value })} placeholder="Observações relevantes..." className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300 text-sm resize-none h-16" />
              </div>
            </div>

            {/* RODAPÉ FIXO COM BOTÕES */}
            <div className="p-4 bg-white border-t border-slate-200 flex gap-3 shrink-0">
              <button type="button" onClick={() => setModalIOT(null)} className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">
                Cancelar
              </button>
              <button 
                type="button"
                disabled={!modalIOT.horario || !modalIOT.tentativa || !modalIOT.condicao || !modalIOT.localInserção} 
                onClick={salvarIOT} 
                className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"
              >
                Salvar
              </button>
            </div>

          </div>
        </div>
        </ModalPortal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TESTE DE RESPIRAÇÃO ESPONTÂNEA (TRE)                               */}
      {/* ========================================================================= */}
      {modalTRE?.isOpen && (
        <ModalPortal>
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4 text-left">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-fade-in border-4 border-cyan-500/20">
            
            {/* CABEÇALHO FIXO */}
            <div className="bg-cyan-700 p-4 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><Timer size={20} /></div>
                <h2 className="text-lg font-black tracking-wide">
                  {(!modalTRE.step || modalTRE.step === 1) ? "Critérios para TRE" : "Parâmetros do TRE"}
                </h2>
              </div>
              <button onClick={() => setModalTRE({ ...modalTRE, isOpen: false, step: 1, checklist: {} })} className="p-1 hover:bg-white/20 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>
            
            {/* CORPO ROLÁVEL */}
            <div className="p-5 bg-slate-50 space-y-6 overflow-y-auto">
              
              {(!modalTRE.step || modalTRE.step === 1) ? (
                // =====================================================================
                // FASE 1: CHECKLIST
                // =====================================================================
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-800 text-xs font-bold text-center mb-4">
                    Responda aos critérios de segurança antes de iniciar o TRE.
                  </div>
                  
                  {TRE_CHECKLIST.map((item, idx) => (
                    <div key={item.id} className="bg-white p-3 border border-slate-200 rounded-xl shadow-sm flex flex-col gap-2">
                      <span className="text-[11px] font-bold text-slate-700 leading-tight">
                        {idx + 1}. {item.label}
                      </span>
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => setModalTRE(prev => ({ ...prev, checklist: { ...prev.checklist, [item.id]: 'Sim' } }))}
                          className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all ${modalTRE.checklist?.[item.id] === 'Sim' ? 'bg-green-500 text-white border-green-600 shadow-inner' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                        >
                          Sim
                        </button>
                        <button 
                          type="button"
                          onClick={() => setModalTRE(prev => ({ ...prev, checklist: { ...prev.checklist, [item.id]: 'Não' } }))}
                          className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all ${modalTRE.checklist?.[item.id] === 'Não' ? 'bg-red-500 text-white border-red-600 shadow-inner' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                        >
                          Não
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // =====================================================================
                // FASE 2: MODAL ORIGINAL (PARÂMETROS E DESFECHO)
                // =====================================================================
                <div className="space-y-6">
                  {/* HORÁRIO */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block text-center">Horário</label>
                    <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
                      <select className="w-24 p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalTRE.horario ? modalTRE.horario.split(':')[0] : "08"} onChange={(e) => setModalTRE({ ...modalTRE, horario: `${e.target.value}:${modalTRE.horario ? modalTRE.horario.split(':')[1] : '00'}` })}>
                        {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}h</option>)}
                      </select>
                      <span className="text-3xl font-black text-slate-300 pb-1">:</span>
                      <select className="w-24 p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300 font-black text-center text-2xl cursor-pointer appearance-none" value={modalTRE.horario ? modalTRE.horario.split(':')[1] : "00"} onChange={(e) => setModalTRE({ ...modalTRE, horario: `${modalTRE.horario ? modalTRE.horario.split(':')[0] : '00'}:${e.target.value}` })}>
                        {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  {/* CUFF LEAK TEST */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Avaliação Pré-Extubação: Cuff Leak</label>
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={modalTRE.cuffLeakFeito} onChange={(e) => {
                          setModalTRE({ ...modalTRE, cuffLeakFeito: e.target.checked, cuffLeakResultado: e.target.checked ? modalTRE.cuffLeakResultado : "" })
                        }} className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500" />
                        Feito
                      </label>
                    </div>
                    {modalTRE.cuffLeakFeito && (
                      <div className="grid grid-cols-2 gap-2 mt-2 animate-fadeIn">
                        {['Positivo', 'Negativo'].map(res => (
                          <button key={res} type="button" onClick={() => setModalTRE({ ...modalTRE, cuffLeakResultado: res })} className={`p-2 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalTRE.cuffLeakResultado === res ? 'border-cyan-500 bg-cyan-50 text-cyan-700 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-cyan-200'}`}>{res}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* MODO TRE */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block text-center">Modo do TRE</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Tubo T', 'PSV', 'CPAP'].map(m => (
                        <button key={m} type="button" onClick={() => setModalTRE({ ...modalTRE, modo: m })} className={`p-2.5 rounded-xl border-2 font-bold text-xs uppercase tracking-wide transition-all ${modalTRE.modo === m ? 'border-cyan-500 bg-cyan-50 text-cyan-700 shadow-sm scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-cyan-200'}`}>{m}</button>
                      ))}
                    </div>
                  </div>
                  {/* PARÂMETROS */}
                  {modalTRE.modo && (
                    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm animate-fadeIn">
                      <label className="text-[10px] font-bold text-cyan-700 uppercase mb-3 block text-center border-b border-slate-100 pb-2">Parâmetros ({modalTRE.modo})</label>
                      {modalTRE.modo === 'Tubo T' && (
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1 text-center">O₂ (L/min)</label>
                            <input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-center font-bold outline-none focus:ring-2 focus:ring-cyan-300 text-slate-700" value={modalTRE.o2} onChange={e => setModalTRE({...modalTRE, o2: e.target.value})} />
                          </div>
                        </div>
                      )}
                      {modalTRE.modo === 'PSV' && (
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1 text-center">PS</label>
                            <input type="number" className="w-full p-2 border border-slate-200 rounded-lg text-center font-bold outline-none focus:ring-2 focus:ring-cyan-300 text-slate-700" value={modalTRE.ps} onChange={e => setModalTRE({...modalTRE, ps: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1 text-center">PEEP</label>
                            <input type="number" className="w-full p-2 border border-slate-200 rounded-lg text-center font-bold outline-none focus:ring-2 focus:ring-cyan-300 text-slate-700" value={modalTRE.peep} onChange={e => setModalTRE({...modalTRE, peep: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1 text-center">FiO₂ (%)</label>
                            <input type="number" className="w-full p-2 border border-slate-200 rounded-lg text-center font-bold outline-none focus:ring-2 focus:ring-cyan-300 text-slate-700" value={modalTRE.fio2} onChange={e => setModalTRE({...modalTRE, fio2: e.target.value})} />
                          </div>
                        </div>
                      )}
                      {modalTRE.modo === 'CPAP' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1 text-center">PEEP</label>
                            <input type="number" className="w-full p-2 border border-slate-200 rounded-lg text-center font-bold outline-none focus:ring-2 focus:ring-cyan-300 text-slate-700" value={modalTRE.peep} onChange={e => setModalTRE({...modalTRE, peep: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1 text-center">FiO₂ (%)</label>
                            <input type="number" className="w-full p-2 border border-slate-200 rounded-lg text-center font-bold outline-none focus:ring-2 focus:ring-cyan-300 text-slate-700" value={modalTRE.fio2} onChange={e => setModalTRE({...modalTRE, fio2: e.target.value})} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {/* DURAÇÃO E IRRS */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block text-center">Duração (minutos)</label>
                      <input type="number" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300 text-center font-bold text-lg" value={modalTRE.duracao} onChange={e => setModalTRE({...modalTRE, duracao: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block text-center" title="Índice de Respiração Rápida e Superficial">IRRS (Tobin)</label>
                      <input type="number" step="0.1" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300 text-center font-bold text-lg" value={modalTRE.irrs} onChange={e => setModalTRE({...modalTRE, irrs: e.target.value})} />
                    </div>
                  </div>
                  {/* DESFECHO */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block text-center">Desfecho</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setModalTRE({ ...modalTRE, desfecho: "Sucesso" })} className={`p-3 rounded-xl border-2 font-black text-sm uppercase tracking-wide transition-all ${modalTRE.desfecho === "Sucesso" ? 'border-green-500 bg-green-50 text-green-700 shadow-sm scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-green-200'}`}>Sucesso</button>
                      <button type="button" onClick={() => setModalTRE({ ...modalTRE, desfecho: "Falha" })} className={`p-3 rounded-xl border-2 font-black text-sm uppercase tracking-wide transition-all ${modalTRE.desfecho === "Falha" ? 'border-red-500 bg-red-50 text-red-700 shadow-sm scale-[1.02]' : 'border-slate-200 bg-white text-slate-500 hover:border-red-200'}`}>Falha</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* RODAPÉ FIXO */}
            <div className="p-4 bg-white border-t border-slate-200 flex gap-3 shrink-0">
              {(!modalTRE.step || modalTRE.step === 1) ? (
                <>
                  <button type="button" onClick={() => setModalTRE({ ...modalTRE, isOpen: false, step: 1, checklist: {} })} className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">
                    Cancelar
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      const checklistValues = Object.values(modalTRE.checklist || {});
                      const unansweredCount = TRE_CHECKLIST.length - checklistValues.length;

                      if (unansweredCount > 0) {
                        alert("Por favor, responda todos os itens do checklist antes de prosseguir.");
                        return;
                      }

                      const naoCount = checklistValues.filter(val => val === 'Não').length;

                      if (naoCount === 1) {
                        if (window.confirm("Sugiro avaliação com equipe multi. Deseja prosseguir?")) {
                          setModalTRE({ ...modalTRE, step: 2 });
                        }
                      } else if (naoCount >= 2) {
                        if (window.confirm("Sugiro suspender extubação e reavaliar em 24h. Deseja prosseguir?")) {
                          setModalTRE({ ...modalTRE, step: 2 });
                        }
                      } else {
                        setModalTRE({ ...modalTRE, step: 2 });
                      }
                    }}
                    className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"
                  >
                    Seguir
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => setModalTRE({ ...modalTRE, step: 1 })} className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">
                    Voltar
                  </button>
                  <button 
                    type="button"
                    disabled={!modalTRE.modo || !modalTRE.duracao || !modalTRE.desfecho || (modalTRE.cuffLeakFeito && !modalTRE.cuffLeakResultado)} 
                    onClick={salvarTRE} 
                    className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wider"
                  >
                    Salvar TRE
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MOBILIZAÇÃO PRECOCE                                                */}
      {/* ========================================================================= */}
      {modalMobilizacao?.isOpen && (
        <ModalPortal>
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4 text-left">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-fade-in border-4 border-cyan-500/20">
            
            <div className="bg-cyan-700 p-4 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><Activity size={20} /></div>
                <h2 className="text-lg font-black tracking-wide">Mobilização Precoce</h2>
              </div>
              <button onClick={() => setModalMobilizacao({ ...modalMobilizacao, isOpen: false })} className="p-1 hover:bg-white/20 rounded-xl transition-colors"><X size={24} /></button>
            </div>

            <div className="p-5 bg-slate-50 space-y-6 overflow-y-auto">

              {/* HORÁRIO E TIPO DE EXERCÍCIO */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block text-center">Horário</label>
                  <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-xl shadow-inner">
                    <select className="w-16 p-1 bg-transparent text-slate-700 outline-none font-black text-center text-xl appearance-none cursor-pointer" value={modalMobilizacao.horario.split(':')[0]} onChange={(e) => setModalMobilizacao({ ...modalMobilizacao, horario: `${e.target.value}:${modalMobilizacao.horario.split(':')[1]}` })}>
                      {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}h</option>)}
                    </select>
                    <span className="text-xl font-black text-slate-300">:</span>
                    <select className="w-16 p-1 bg-transparent text-slate-700 outline-none font-black text-center text-xl appearance-none cursor-pointer" value={modalMobilizacao.horario.split(':')[1]} onChange={(e) => setModalMobilizacao({ ...modalMobilizacao, horario: `${modalMobilizacao.horario.split(':')[0]}:${e.target.value}` })}>
                      {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block text-center">Tipo Principal</label>
                  <div className="grid grid-cols-3 gap-1">
                    {['Ativos', 'Ativo-Assist.', 'Passivos'].map(tipo => (
                      <button key={tipo} type="button" onClick={() => setModalMobilizacao({ ...modalMobilizacao, tipoExercicio: tipo })} className={`p-2 rounded-lg border font-bold text-[10px] uppercase tracking-wide transition-all ${modalMobilizacao.tipoExercicio === tipo ? 'border-cyan-500 bg-cyan-50 text-cyan-700 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-cyan-200'}`}>{tipo}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ALONGAMENTOS */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={modalMobilizacao.alongamentoFeito} onChange={(e) => setModalMobilizacao({ ...modalMobilizacao, alongamentoFeito: e.target.checked })} className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500" />
                  Alongamentos
                </label>
                {modalMobilizacao.alongamentoFeito && (
                  <div className="flex items-center gap-2 mt-3 pl-6 animate-fadeIn">
                    <select className="p-1 border border-slate-200 rounded text-xs font-bold bg-slate-50 outline-none" value={modalMobilizacao.alongamentoSeries} onChange={e => setModalMobilizacao({...modalMobilizacao, alongamentoSeries: e.target.value})}>
                      {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">séries de</span>
                    <select className="p-1 border border-slate-200 rounded text-xs font-bold bg-slate-50 outline-none" value={modalMobilizacao.alongamentoReps} onChange={e => setModalMobilizacao({...modalMobilizacao, alongamentoReps: e.target.value})}>
                      {[5,10,15,20,30].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">repetições.</span>
                  </div>
                )}
              </div>

              {/* MMSS e MMII (Parametrizados) */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* MMSS */}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2 border-b border-slate-200 pb-1">MMSS</h4>
                  <div className="space-y-2">
                    {LISTAS_MOBILIZACAO.mmss.map(item => (
                      <div key={item} className="p-2 bg-white border border-slate-200 rounded-lg">
                        <label className="flex items-start gap-2 text-[11px] font-bold text-slate-700 cursor-pointer">
                          <input type="checkbox" checked={modalMobilizacao.selecionados.includes(item)} onChange={() => toggleExercicio(item, true)} className="w-3.5 h-3.5 mt-0.5 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500" />
                          <span className="leading-tight">{item}</span>
                        </label>
                        {modalMobilizacao.selecionados.includes(item) && modalMobilizacao.parametros[item] && (
                          <div className="grid grid-cols-3 gap-1 mt-2 pl-5 animate-fadeIn">
                            <div>
                              <span className="text-[8px] uppercase text-slate-400 block font-bold">Séries</span>
                              <select className="w-full p-1 border rounded text-[10px] bg-slate-50 outline-none" value={modalMobilizacao.parametros[item].series} onChange={e => updateParamExercicio(item, 'series', e.target.value)}>
                                {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            </div>
                            <div>
                              <span className="text-[8px] uppercase text-slate-400 block font-bold">Reps</span>
                              <select className="w-full p-1 border rounded text-[10px] bg-slate-50 outline-none" value={modalMobilizacao.parametros[item].reps} onChange={e => updateParamExercicio(item, 'reps', e.target.value)}>
                                {[5,8,10,12,15,20].map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            </div>
                            <div>
                              <span className="text-[8px] uppercase text-slate-400 block font-bold">Carga</span>
                              <select className="w-full p-1 border rounded text-[10px] bg-slate-50 outline-none" value={modalMobilizacao.parametros[item].carga} onChange={e => updateParamExercicio(item, 'carga', e.target.value)}>
                                {['Livre', '0.5kg', '1kg', '2kg', 'Elástico'].map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* MMII */}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2 border-b border-slate-200 pb-1">MMII</h4>
                  <div className="space-y-2">
                    {LISTAS_MOBILIZACAO.mmiiParam.map(item => (
                      <div key={item} className="p-2 bg-white border border-slate-200 rounded-lg">
                        <label className="flex items-start gap-2 text-[11px] font-bold text-slate-700 cursor-pointer">
                          <input type="checkbox" checked={modalMobilizacao.selecionados.includes(item)} onChange={() => toggleExercicio(item, true)} className="w-3.5 h-3.5 mt-0.5 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500" />
                          <span className="leading-tight">{item}</span>
                        </label>
                        {modalMobilizacao.selecionados.includes(item) && modalMobilizacao.parametros[item] && (
                          <div className="grid grid-cols-3 gap-1 mt-2 pl-5 animate-fadeIn">
                            <div>
                              <span className="text-[8px] uppercase text-slate-400 block font-bold">Séries</span>
                              <select className="w-full p-1 border rounded text-[10px] bg-slate-50 outline-none" value={modalMobilizacao.parametros[item].series} onChange={e => updateParamExercicio(item, 'series', e.target.value)}>
                                {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            </div>
                            <div>
                              <span className="text-[8px] uppercase text-slate-400 block font-bold">Reps</span>
                              <select className="w-full p-1 border rounded text-[10px] bg-slate-50 outline-none" value={modalMobilizacao.parametros[item].reps} onChange={e => updateParamExercicio(item, 'reps', e.target.value)}>
                                {[5,8,10,12,15,20].map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            </div>
                            <div>
                              <span className="text-[8px] uppercase text-slate-400 block font-bold">Carga</span>
                              <select className="w-full p-1 border rounded text-[10px] bg-slate-50 outline-none" value={modalMobilizacao.parametros[item].carga} onChange={e => updateParamExercicio(item, 'carga', e.target.value)}>
                                {['Livre', '0.5kg', '1kg', '2kg', 'Elástico'].map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {/* MMII Simples */}
                    {LISTAS_MOBILIZACAO.mmiiSimples.map(item => (
                      <label key={item} className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={modalMobilizacao.selecionados.includes(item)} onChange={() => toggleExercicio(item, false)} className="w-3.5 h-3.5 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500" />
                        {item}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* TRONCO E CONDICIONAMENTO */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2 border-b border-slate-200 pb-1">Tronco</h4>
                  <div className="space-y-2">
                    {LISTAS_MOBILIZACAO.tronco.map(item => (
                      <label key={item} className="flex items-start gap-2 p-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={modalMobilizacao.selecionados.includes(item)} onChange={() => toggleExercicio(item, false)} className="w-3.5 h-3.5 mt-0.5 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500" />
                        <span className="leading-tight">{item}</span>
                      </label>
                    ))}
                    <input type="text" placeholder="Outros..." value={modalMobilizacao.outrosTronco} onChange={e => setModalMobilizacao({...modalMobilizacao, outrosTronco: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg text-[11px] outline-none focus:ring-2 focus:ring-cyan-300 text-slate-700" />
                  </div>
                </div>
                
                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2 border-b border-slate-200 pb-1">Condicionamento Funcional</h4>
                  <div className="space-y-2">
                    {LISTAS_MOBILIZACAO.condicionamento.map(item => (
                      <label key={item} className="flex items-start gap-2 p-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={modalMobilizacao.selecionados.includes(item)} onChange={() => toggleExercicio(item, false)} className="w-3.5 h-3.5 mt-0.5 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500" />
                        <span className="leading-tight">{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            <div className="p-4 bg-white border-t border-slate-200 flex gap-3 shrink-0">
              <button type="button" onClick={() => setModalMobilizacao({ ...modalMobilizacao, isOpen: false })} className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">Cancelar</button>
              <button type="button" disabled={!modalMobilizacao.tipoExercicio && modalMobilizacao.selecionados.length === 0} onClick={salvarMobilizacao} className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center uppercase tracking-wider">
                Salvar Sessão
              </button>
            </div>

          </div>
        </div>
        </ModalPortal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PROTOCOLO DE EXTUBAÇÃO                                             */}
      {/* ========================================================================= */}
      {modalExtubacao?.isOpen && (
        <ModalPortal>
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4 text-left">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-fade-in border-4 border-cyan-500/20">
            
            {/* CABEÇALHO FIXO */}
            <div className="bg-cyan-700 p-4 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><ArrowUpCircle size={20} /></div>
                <h2 className="text-lg font-black tracking-wide">Protocolo de Extubação</h2>
              </div>
              <button onClick={() => setModalExtubacao({ ...modalExtubacao, isOpen: false })} className="p-1 hover:bg-white/20 rounded-xl transition-colors"><X size={24} /></button>
            </div>

            {/* CORPO ROLÁVEL */}
            <div className="p-5 bg-slate-50 space-y-5 overflow-y-auto">

              {/* HORÁRIO */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block text-center">Horário da Avaliação</label>
                <div className="flex items-center justify-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-inner">
                  <select className="w-16 p-1 bg-transparent text-slate-700 outline-none font-black text-center text-xl appearance-none cursor-pointer" value={modalExtubacao.horario.split(':')[0]} onChange={(e) => setModalExtubacao({ ...modalExtubacao, horario: `${e.target.value}:${modalExtubacao.horario.split(':')[1]}` })}>
                    {Array.from({length: 24}, (_, i) => String(i).padStart(2, '0')).map(h => <option key={h} value={h}>{h}h</option>)}
                  </select>
                  <span className="text-xl font-black text-slate-300">:</span>
                  <select className="w-16 p-1 bg-transparent text-slate-700 outline-none font-black text-center text-xl appearance-none cursor-pointer" value={modalExtubacao.horario.split(':')[1]} onChange={(e) => setModalExtubacao({ ...modalExtubacao, horario: `${modalExtubacao.horario.split(':')[0]}:${e.target.value}` })}>
                    {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* CHECKLIST DE SEGURANÇA BÁSICA */}
              <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <label className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider block border-b border-slate-100 pb-1.5 mb-2">Checklist Pré-Extubação</label>
                
                {/* Switchers Binários para facilitar seleção rápida beira-leito */}
                {[
                  { id: "nivelConscienciaOk", label: "Drive / Comando: Paciente alerta e cooperativo?" },
                  { id: "tosseEficaz", label: "Mecânica: Apresenta tosse forte/eficaz?" },
                  { id: "secrecaoControlada", label: "Vias Aéreas: Secreção fluida e controlada?" },
                  { id: "treSucesso", label: "Desmame: Sucesso no TRE (Mínimo 30 min)?" },
                  { id: "cuffLeakNegativo", label: "Edema: Cuff Leak Test Negativo (Sem Estridor)?" },
                  { id: "balancoHidricoOk", label: "Cardiovascular: Estável e BH equilibrado/negativo?" },
                  { id: "fio2Adequada", label: "Oxigenação: FiO₂ ≤ 40% tolerada?" },
                  { id: "peepAdequada", label: "Pressão: PEEP entre 5 e 8 cmH₂O?" }
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 py-1 border-b border-slate-50 last:border-0">
                    <span className="text-[11px] font-bold text-slate-600 leading-tight flex-1">{item.label}</span>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
                      <button type="button" onClick={() => setModalExtubacao({ ...modalExtubacao, [item.id]: true })} className={`px-2.5 py-1 text-[10px] font-black rounded-md transition-all ${modalExtubacao[item.id] === true ? 'bg-green-500 text-white shadow-sm' : 'text-slate-400'}`}>SIM</button>
                      <button type="button" onClick={() => setModalExtubacao({ ...modalExtubacao, [item.id]: false })} className={`px-2.5 py-1 text-[10px] font-black rounded-md transition-all ${modalExtubacao[item.id] === false ? 'bg-slate-300 text-slate-600 shadow-sm' : 'text-slate-400'}`}>NÃO</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* DECISÃO DO PROCEDIMENTO */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block text-center">Conduta e Desfecho</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { key: "Sucesso", label: "Extubado com Sucesso", color: "border-green-500 bg-green-50 text-green-700 font-bold" },
                    { key: "Falha", label: "Falha Imediata / Reintubado", color: "border-red-500 bg-red-50 text-red-700 font-bold" },
                    { key: "Adiado", label: "Adiado (Critérios Incompletos)", color: "border-amber-500 bg-amber-50 text-amber-700 font-bold" }
                  ].map(op => (
                    <button key={op.key} type="button" onClick={() => setModalExtubacao({ ...modalExtubacao, procedimentoRealizado: op.key, dispositivoPosExtubacao: op.key === "Adiado" ? "" : modalExtubacao.dispositivoPosExtubacao })} className={`p-2.5 rounded-xl border-2 font-black text-xs uppercase tracking-wide transition-all text-center ${modalExtubacao.procedimentoRealizado === op.key ? op.color + ' shadow-sm scale-[1.01]' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>{op.label}</button>
                  ))}
                </div>
              </div>

              {/* DISPOSITIVO INSTALADO PÓS-EXTUBAÇÃO (Somente se for extubado de fato) */}
              {modalExtubacao.procedimentoRealizado && modalExtubacao.procedimentoRealizado !== "Adiado" && (
                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm animate-fadeIn">
                  <label className="text-[10px] font-bold text-cyan-700 uppercase mb-3 block text-center border-b border-slate-100 pb-2">Oxigenoterapia Pós-Extubação</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Cateter Nasal de O2', 'Máscara de Venturi', 'VNI Profilática', 'VNI Terapêutica', 'Máscara não reinalante'].map(disp => (
                      <button key={disp} type="button" onClick={() => setModalExtubacao({ ...modalExtubacao, dispositivoPosExtubacao: disp })} className={`p-2 rounded-xl border-2 font-bold text-[10px] uppercase tracking-wide transition-all ${modalExtubacao.dispositivoPosExtubacao === disp ? 'border-cyan-500 bg-cyan-50 text-cyan-700 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-cyan-200'}`}>{disp}</button>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* RODAPÉ FIXO */}
            <div className="p-4 bg-white border-t border-slate-200 flex gap-3 shrink-0">
              <button type="button" onClick={() => setModalExtubacao({ ...modalExtubacao, isOpen: false })} className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">
                Cancelar
              </button>
              <button 
                type="button"
                disabled={!modalExtubacao.procedimentoRealizado || (modalExtubacao.procedimentoRealizado !== "Adiado" && !modalExtubacao.dispositivoPosExtubacao)} 
                onClick={salvarExtubacao} 
                className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-lg transition-all flex justify-center items-center uppercase tracking-wider text-xs"
              >
                {modalExtubacao.procedimentoRealizado === "Adiado" ? "Registrar Adiamento" : "Salvar Protocolo"}
              </button>
            </div>

          </div>
        </div>
        </ModalPortal>
      )}

    </fieldset>
  );
};

export default PhysioDashboard;