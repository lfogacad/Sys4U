import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { Scale, Utensils, Lock, ClipboardSignature, CheckSquare, Square, CalendarDays, ChevronDown, ChevronRight,
         Activity, History, X, BarChart2, Save, LineChart } from 'lucide-react';
import { CARACTERISTICAS_DIETA, CONSISTENCIA_ALIMENTAR, FORMULAS_ENTERAIS } from '../../constants/clinicalLists';
import { calculateEvacDays, calcularNutricaoDerivada, calcularMetasNutricionais, calcularAdministracaoEnteral } from '../../utils/core';
import { ModalPortal } from '../../components/ModuloUTI';
import { db } from '../../config/firebase';

const NutriDashboard = ({
  currentPatient,
  patients, 
  activeTab, 
  setPatients,
  isEditable,
  updateNested,
  toggleArrayItem,
  handleBlurSave,
  handleNutriAdmission,
  handleViewNutriAdmission
}) => {

  // Estado para controlar o modal de histórico de consumo
  const [modalConsumo, setModalConsumo] = useState({ isOpen: false, tipo: null }); // 'alimentos' ou 'suplementos'

  // =========================================================================
  // ESTADOS E FUNÇÕES DO HISTÓRICO DE MÉTRICAS NUTRICIONAIS
  // =========================================================================
  const [showHistoricoMetricas, setShowHistoricoMetricas] = useState(false);
  const [dataDetalheMetrica, setDataDetalheMetrica] = useState(null); // ISO "AAAA-MM-DD" ou null
  const [metricasSelecionadas, setMetricasSelecionadas] = useState([
    "peso", "imc", "circBraco", "circPanturrilha"
  ]);

  // Catálogo de métricas disponíveis para o gráfico
  const METRICAS_DISPONIVEIS = [
    { key: "peso", label: "Peso (kg)", cor: "#65a30d" },
    { key: "imc", label: "IMC (kg/m²)", cor: "#0284c7" },
    { key: "circBraco", label: "Circ. Braço (cm)", cor: "#c2410c" },
    { key: "circPanturrilha", label: "Circ. Panturrilha (cm)", cor: "#7c3aed" },
    { key: "pct", label: "PCT (mm)", cor: "#db2777" },
    { key: "cmb", label: "CMB (cm)", cor: "#0891b2" },
    { key: "amb", label: "AMB (cm²)", cor: "#ca8a04" },
    { key: "altura", label: "Altura (cm)", cor: "#475569" }
  ];

  // Data local em ISO (AAAA-MM-DD) — usa o fuso do navegador, não UTC
  const dataLocalISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // Salva o snapshot atual das métricas no histórico do paciente
  const salvarMetricasNutricionais = async () => {
    const p = patients[activeTab];
    if (!p || !p.nome) {
      alert("Não há paciente ativo neste leito.");
      return;
    }

    const nutri = p.nutri || {};
    const deriv = typeof calcularNutricaoDerivada === "function"
      ? calcularNutricaoDerivada(nutri, p)
      : {};

    const temAlgumDado = [
      nutri.peso, nutri.altura, nutri.circBraco, nutri.circPanturrilha,
      nutri.pct, nutri.alturaJoelho
    ].some((v) => String(v ?? "").trim() !== "");

    if (!temAlgumDado) {
      alert("Preencha ao menos uma medida antropométrica antes de salvar.");
      return;
    }

    const snapshot = {
      id: `metrica_${Date.now()}`,
      data: dataLocalISO(),
      registradoEm: new Date().toISOString(),
      peso: nutri.peso || "",
      tipoMedicaoPeso: nutri.tipoMedicaoPeso || "",
      altura: nutri.altura || "",
      tipoMedicaoAltura: nutri.tipoMedicaoAltura || "",
      alturaJoelho: nutri.alturaJoelho || "",
      circBraco: nutri.circBraco || "",
      circPanturrilha: nutri.circPanturrilha || "",
      pct: nutri.pct || "",
      imc: deriv.imc ?? nutri.imc ?? null,
      classificacaoIMC: deriv.classificacaoIMC || nutri.classificacaoIMC || "",
      cmb: deriv.cmb ?? null,
      amb: deriv.amb ?? null,
      adequacaoPCT: deriv.adequacaoPCT ?? null,
      adequacaoCMB: deriv.adequacaoCMB ?? null,
      adequacaoAMB: deriv.adequacaoAMB ?? null,
      classificacaoPCT: deriv.classificacaoPCT || "",
      classificacaoCMB: deriv.classificacaoCMB || "",
      classificacaoAMB: deriv.classificacaoAMB || "",
      classificacaoSarcopenia: deriv.classificacaoSarcopenia || "",
      nrsEscore: deriv.nrsEscore ?? nutri.nrsEscore ?? null,
      nrsClassificacao: deriv.nrsClassificacao || nutri.nrsClassificacao || "",
      amputacoes: Array.isArray(nutri.amputacoes) ? [...nutri.amputacoes] : []
    };

    // Lista atual do histórico (local) — para substituição do mesmo dia
    const historicoAtual = Array.isArray(nutri.historico_metricas) ? [...nutri.historico_metricas] : [];
    const idxMesmoDia = historicoAtual.findIndex((m) => m && m.data === snapshot.data);
    if (idxMesmoDia >= 0) {
      const confirmar = window.confirm(
        `Já existe um registro de métricas em ${snapshot.data.split("-").reverse().join("-")}.\n\nDeseja substituí-lo pelos valores atuais?`
      );
      if (!confirmar) return;
      historicoAtual[idxMesmoDia] = snapshot;
    } else {
      historicoAtual.push(snapshot);
    }
    historicoAtual.sort((a, b) => String(a.data).localeCompare(String(b.data)));

    // 1) Atualiza o estado local imediatamente (UI responde na hora)
    const up = patients.map((item, i) =>
      i === activeTab
        ? { ...item, nutri: { ...(item.nutri || {}), historico_metricas: historicoAtual } }
        : item
    );
    setPatients(up);
    if (typeof patientsRef !== "undefined" && patientsRef?.current) {
      patientsRef.current[activeTab] = up[activeTab];
    }

    // 2) Grava DIRETO no Firestore, sem passar pela fila do save().
    //    updateDoc com notação de ponto garante que apenas este campo é tocado —
    //    nada mais do documento é sobrescrito.
    try {
      const idBruto = p.id !== undefined ? p.id : p.leito;
      const apenasNumero = String(idBruto).replace(/bed_/g, "");
      const docId = `bed_${apenasNumero === "0" ? "1" : apenasNumero}`;

      await updateDoc(doc(db, "leitos_uti", docId), {
        "nutri.historico_metricas": historicoAtual,
        "nutri.admitido": true
      });

      if (typeof registrarLogAuditoria === "function") {
        registrarLogAuditoria(
          "NUTRIÇÃO: MÉTRICAS SALVAS",
          `Snapshot antropométrico registrado em ${snapshot.data.split("-").reverse().join("-")}`,
          `Leito ${activeTab + 1}`,
          p.nome
        );
      }

      alert(`✅ Métricas salvas em ${snapshot.data.split("-").reverse().join("-")}.`);
    } catch (err) {
      console.error("[MÉTRICAS] Falha ao gravar no Firestore:", err);
      alert("Erro ao gravar as métricas na nuvem. Verifique a conexão e tente novamente.");
    }
  };


  // Cor de fundo conforme a classificação nutricional
  const corClassificacao = (txt) => {
    const s = String(txt || "").toLowerCase();
    if (!s) return "text-slate-400";
    if (s.includes("grave") || s.includes("desnutri")) return "text-red-700";
    if (s.includes("risco") || s.includes("moderad")) return "text-amber-700";
    if (s.includes("obes") || s.includes("sobrepeso")) return "text-orange-700";
    if (s.includes("eutrof") || s.includes("normal") || s.includes("adequado")) return "text-emerald-700";
    return "text-slate-700";
  };
  
  
  // =========================================================================
  // CÁLCULO DAS MÉDIAS DE CONSUMO ORAL
  // =========================================================================
  const historicoDieta = currentPatient?.enfermagem?.historico_dieta_vo || [];

  // =========================================================================
  // SEPARAÇÃO ALIMENTOS × SUPLEMENTOS
  // Regra: registro é SUPLEMENTO quando o 'Tipo de Refeição' == 'Suplemento'.
  // ALIMENTOS = todo registro que NÃO é suplemento (sólida OU líquida = amostras).
  // Cada prato/copo conta como amostra independente.
  // =========================================================================
  const ehSuplemento = (reg) => (reg.tipoRefeicao || reg.refeicao || '') === 'Suplemento';

  // Acumula % de consumo, contando cada amostra (prato/copo) independente
  const acumularConsumo = (reg, soma, count) => {
    if (reg.tiposOferecidos?.solida && reg.consumo?.solida !== null && reg.consumo?.solida !== "") {
      soma += Number(reg.consumo.solida);
      count++;
    }
    if (reg.tiposOferecidos?.liquida && reg.consumo?.liquida !== null && reg.consumo?.liquida !== "") {
      soma += Number(reg.consumo.liquida);
      count++;
    }
    return { soma, count };
  };

  let somaAlimentos = 0, countAlimentos = 0;
  let somaSuplementos = 0, countSuplementos = 0;

  historicoDieta.forEach(reg => {
    if (ehSuplemento(reg)) {
      const r = acumularConsumo(reg, somaSuplementos, countSuplementos);
      somaSuplementos = r.soma; countSuplementos = r.count;
    } else {
      const r = acumularConsumo(reg, somaAlimentos, countAlimentos);
      somaAlimentos = r.soma; countAlimentos = r.count;
    }
  });

  const mediaAlimentos = countAlimentos > 0 ? Math.round(somaAlimentos / countAlimentos) : 0;
  const mediaSuplementos = countSuplementos > 0 ? Math.round(somaSuplementos / countSuplementos) : 0;

  // ---------- CONSUMO ORAL DO DIA ANTERIOR (janela clínica 07h ontem → 06h hoje) ----------
  const inicioJanela = new Date();
  inicioJanela.setDate(inicioJanela.getDate() - 1);
  inicioJanela.setHours(7, 0, 0, 0);
  const fimJanela = new Date();
  fimJanela.setHours(6, 0, 0, 0);

  const historicoDietaOntem = historicoDieta.filter(reg => {
    const dt = reg.dataHoraRegistro ? new Date(reg.dataHoraRegistro) : null;
    return dt && !isNaN(dt.getTime()) && dt >= inicioJanela && dt < fimJanela;
  });

  let somaAlimentosOntem = 0, countAlimentosOntem = 0;
  let somaSuplementosOntem = 0, countSuplementosOntem = 0;
  historicoDietaOntem.forEach(reg => {
    if (ehSuplemento(reg)) {
      const r = acumularConsumo(reg, somaSuplementosOntem, countSuplementosOntem);
      somaSuplementosOntem = r.soma; countSuplementosOntem = r.count;
    } else {
      const r = acumularConsumo(reg, somaAlimentosOntem, countAlimentosOntem);
      somaAlimentosOntem = r.soma; countAlimentosOntem = r.count;
    }
  });
  const mediaAlimentosOntem = countAlimentosOntem > 0 ? Math.round(somaAlimentosOntem / countAlimentosOntem) : 0;
  const mediaSuplementosOntem = countSuplementosOntem > 0 ? Math.round(somaSuplementosOntem / countSuplementosOntem) : 0;

  // Função para agrupar o histórico por data para o Modal
  const getGroupedHistory = (tipo) => {
    // 'tipo' agora é a CATEGORIA: 'alimentos' ou 'suplementos'
    const filtered = historicoDieta.filter(h =>
      tipo === 'suplementos' ? ehSuplemento(h) : !ehSuplemento(h)
    );
    const groups = {};
    
    filtered.forEach(item => {
      const dateStr = item.dataHoraRegistro ? new Date(item.dataHoraRegistro).toLocaleDateString('pt-BR') : 'Sem data';
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(item);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => {
      if(a === 'Sem data') return 1;
      if(b === 'Sem data') return -1;
      const [d1, m1, y1] = a.split('/');
      const [d2, m2, y2] = b.split('/');
      return new Date(`${y2}-${m2}-${d2}`) - new Date(`${y1}-${m1}-${d1}`);
    });

    return { groups, sortedDates };
  };

  const AMPUTACAO_LABELS = {
  mao: 'Mão',
  antebraco: 'Antebraço',
  braco: 'Braço inteiro',
  pe: 'Pé',
  perna_abaixo_joelho: 'Perna abaixo do joelho',
  perna_inteira: 'Perna inteira'
};

  // Função para agrupar o histórico por data para o Modal (filtrado pela janela)
  const getGroupedHistoryFiltrado = (tipo, dataMinima) => {
    // 'tipo' agora é a CATEGORIA: 'alimentos' ou 'suplementos' (mesma regra da getGroupedHistory)
    const filtered = historicoDieta.filter(h =>
      (tipo === 'suplementos' ? ehSuplemento(h) : !ehSuplemento(h)) &&
      h.dataHoraRegistro && new Date(h.dataHoraRegistro) >= dataMinima
    );
    const groups = {};
    
    filtered.forEach(item => {
      const dateStr = item.dataHoraRegistro ? new Date(item.dataHoraRegistro).toLocaleDateString('pt-BR') : 'Sem data';
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(item);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => {
      if(a === 'Sem data') return 1;
      if(b === 'Sem data') return -1;
      const [d1, m1, y1] = a.split('/');
      const [d2, m2, y2] = b.split('/');
      return new Date(`${y2}-${m2}-${d2}`) - new Date(`${y1}-${m1}-${d1}`);
    });

    return { groups, sortedDates };
  };

  // Card de consumo oral reutilizável (Total / Dia Anterior)
  const renderConsumoCard = (titulo, mediaAlimentosV, countAlimentosV, mediaSuplementosV, countSuplementosV, abrirHistorico, variant = 'total') => {
    const paleta = variant === 'diario' ? {
      icone: 'text-sky-600',
      valor: 'text-sky-700',
      botao: 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200',
      barra: 'bg-sky-500',
      badge: 'bg-sky-100 text-sky-700'
    } : {
      icone: 'text-lime-600',
      valor: 'text-lime-700',
      botao: 'bg-lime-50 hover:bg-lime-100 text-lime-700 border-lime-200',
      barra: 'bg-lime-500',
      badge: 'bg-lime-100 text-lime-700'
    };
    const rotuloVariant = variant === 'diario' ? 'Dia Anterior' : 'Total';
    return (
      <div className="p-4 border rounded-xl bg-white shadow-sm">
        <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Activity size={16} className={paleta.icone} />
          Monitoramento do Consumo Oral
          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${paleta.badge}`}>{rotuloVariant}</span>
        </h4>
        <div className="space-y-5">
          {/* ALIMENTOS */}
          <div>
            <div className="flex justify-between items-end mb-1">
              <span className="text-xs font-bold text-gray-600 uppercase">Alimentos (Média)</span>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-black ${paleta.valor}`}>{mediaAlimentosV}%</span>
                <button
                  onClick={(e) => { e.preventDefault(); abrirHistorico('alimentos'); }}
                  className={`p-1.5 ${paleta.botao} rounded-lg transition-colors border`}
                  title="Ver Histórico"
                >
                  <History size={14} />
                </button>
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 shadow-inner overflow-hidden">
              <div className={`${paleta.barra} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${mediaAlimentosV}%` }}></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 text-right">{countAlimentosV} refeições registradas</p>
          </div>
          {/* SUPLEMENTOS */}
          <div>
            <div className="flex justify-between items-end mb-1">
              <span className="text-xs font-bold text-gray-600 uppercase">Suplementos (Média)</span>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-black ${paleta.valor}`}>{mediaSuplementosV}%</span>
                <button
                  onClick={(e) => { e.preventDefault(); abrirHistorico('suplementos'); }}
                  className={`p-1.5 ${paleta.botao} rounded-lg transition-colors border`}
                  title="Ver Histórico"
                >
                  <History size={14} />
                </button>
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 shadow-inner overflow-hidden">
              <div className={`${paleta.barra} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${mediaSuplementosV}%` }}></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 text-right">{countSuplementosV} refeições registradas</p>
          </div>
        </div>
      </div>
    );
  };

  if (!currentPatient?.nutri?.admitido) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-lime-50/50 border-2 border-dashed border-lime-200 rounded-2xl animate-fadeIn mt-4">
        <div className="w-20 h-20 bg-lime-100 text-lime-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
          <Lock size={40} />
        </div>
        <h3 className="text-xl font-black text-lime-800 mb-2 text-center">Admissão Nutricional Pendente</h3>
        <p className="text-slate-500 text-center max-w-md mb-6">
          Realize a admissão nutricional para definir os parâmetros base do paciente.
        </p>
        <button
          onClick={(e) => { e.preventDefault(); handleNutriAdmission(); }} 
          disabled={!isEditable}
          className="flex items-center gap-2 px-8 py-4 bg-lime-600 hover:bg-lime-700 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50"
        >
          <ClipboardSignature size={24} /> Realizar Admissão Nutricional
        </button>
      </div>
    );
  }

  // ===== RECÁLCULO AO VIVO (IMC, Estado Nutricional, NRS, Metas) =====
  const nutriBase = {
    ...(currentPatient.nutri || {}),
    amputacoes: currentPatient.nutri?.amputacoes || [],
    nrsInicial: currentPatient.nutri?.nrsInicial || []
  };
  const derivVivo = calcularNutricaoDerivada(nutriBase, currentPatient);
  const metasVivo = calcularMetasNutricionais(nutriBase.peso, derivVivo.classificacaoIMC, nutriBase.aumentarPeso);

  const recalcularNutri = () => {
    const b = { ...(currentPatient.nutri || {}) };
    const d = calcularNutricaoDerivada(b, currentPatient);
    const m = calcularMetasNutricionais(b.peso, d.classificacaoIMC, b.aumentarPeso);
    updateNested("nutri", "imc", d.imc !== null ? +d.imc.toFixed(1) : null);
    updateNested("nutri", "classificacaoIMC", d.classificacaoIMC || null);
    updateNested("nutri", "nrsEscore", d.nrsEscore ?? null);
    updateNested("nutri", "nrsClassificacao", d.nrsClassificacao || null);
    updateNested("nutri", "metaCalTotal", m.metaCaloricaTotal !== null ? Math.round(m.metaCaloricaTotal) : null);
    updateNested("nutri", "metaProtTotal", m.metaProteicaTotal !== null ? Math.round(m.metaProteicaTotal) : null);
    updateNested("nutri", "fatorCalorico", m.fatorCalorico);
    handleBlurSave("Nutrição: Recalculou IMC, NRS e Metas");
  };

  return (
    <fieldset disabled={!isEditable} className="space-y-6 animate-fadeIn min-w-0 border-0 p-0 m-0">
      
      <div className="flex justify-end mb-2">
        <button
          onClick={(e) => { e.preventDefault(); handleViewNutriAdmission(); }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-lime-200 text-lime-700 hover:bg-lime-50 rounded-lg text-sm font-bold shadow-sm transition-colors print:hidden"
        >
          <ClipboardSignature size={16} /> Ver Admissão Nutricional
        </button>
      </div>

      {/* BLOCO 1: ANTROPOMETRIA E METAS (LARGURA TOTAL) */}
      <div className="p-4 border rounded-xl bg-lime-50/20">
        <div className="flex items-center justify-between mb-4 gap-2">
          <h4 className="font-bold text-lime-800 flex items-center gap-2">
            <Scale size={18} /> Antropometria e Metas
          </h4>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={salvarMetricasNutricionais}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-lime-600 hover:bg-lime-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors print:hidden"
              title="Salvar snapshot das métricas atuais no histórico"
            >
              <Save size={14} /> Salvar Métricas
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setShowHistoricoMetricas(true); }}
              className="p-1.5 bg-white border border-lime-300 text-lime-700 hover:bg-lime-50 rounded-lg transition-colors print:hidden"
              title="Ver histórico de métricas e evolução"
            >
              <LineChart size={16} />
            </button>
          </div>
        </div>

        {/* MEDIDAS PRINCIPAIS */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Peso Atual */}
          <div>
            <label className="text-xs font-bold text-gray-500">Peso Atual (kg)</label>
            <div className="flex gap-2">
              <input
                type="number"
                className="w-full p-2 border rounded border-lime-300 bg-white font-bold text-lime-900"
                value={currentPatient.nutri?.peso || ""}
                onChange={(e) => updateNested("nutri", "peso", e.target.value)}
                onBlur={recalcularNutri}
              />
              <select
                className="p-2 border rounded text-xs bg-white"
                value={currentPatient.nutri?.tipoMedicaoPeso || ""}
                onChange={(e) => updateNested("nutri", "tipoMedicaoPeso", e.target.value)}
              >
                <option value="">Medição...</option>
                <option value="Aferido">Aferido</option>
                <option value="Referido">Referido</option>
                <option value="Estimado">Estimado</option>
              </select>
            </div>
            {derivVivo.pesoCorrigido !== null && (
              <p className="text-[10px] text-slate-400 font-bold mt-1">Estimado: {derivVivo.pesoCorrigido.toFixed(1)} kg</p>
            )}            
          </div>

          {/* Altura (editável, prioriza a da admissão) */}
          <div>
            <label className="text-xs font-bold text-gray-500">Altura (cm)</label>
            <div className="flex gap-2">
              <input
                type="number"
                className="w-full p-2 border rounded border-lime-300 bg-white font-bold text-lime-900"
                value={currentPatient.nutri?.altura || ""}
                onChange={(e) => updateNested("nutri", "altura", e.target.value)}
                onBlur={recalcularNutri}
              />
              <select
                className="p-2 border rounded text-xs bg-white"
                value={currentPatient.nutri?.tipoMedicaoAltura || ""}
                onChange={(e) => updateNested("nutri", "tipoMedicaoAltura", e.target.value)}
              >
                <option value="">Medição...</option>
                <option value="Aferido">Aferido</option>
                <option value="Referido">Referido</option>
                <option value="Estimado">Estimado</option>
              </select>
            </div>
            {derivVivo.estaturaCorrigida !== null && (
              <p className="text-[10px] text-slate-400 font-bold mt-1">Estimada: {derivVivo.estaturaCorrigida.toFixed(1)} cm</p>
            )}
          </div>

          {/* IMC */}
           <div>
            <label className="text-xs font-bold text-gray-500">IMC</label>
            <div className="p-2 border rounded bg-white font-bold text-lime-900">
              {derivVivo.imc !== null
                ? `${derivVivo.imc.toFixed(1)} kg/m²`
                : (currentPatient.nutri?.imc ? `${Number(currentPatient.nutri.imc).toFixed(1)} kg/m²` : '-')}
            </div>
            {(derivVivo.classificacaoIMC || currentPatient.nutri?.classificacaoIMC) && (
              <p className="text-[10px] font-bold text-lime-700 mt-1">{derivVivo.classificacaoIMC || currentPatient.nutri.classificacaoIMC}</p>
            )}
          </div>

          {/* Risco Nutricional (automático) */}
          <div>
            <label className="text-xs font-bold text-red-700">Risco Nutricional (NRS 2002)</label>
            <div className="p-2 border rounded bg-white font-bold text-red-800 border-red-200 min-h-[38px]">
              {derivVivo.nrsClassificacao || currentPatient.nutri?.nrsClassificacao || '-'}
            </div>
            {currentPatient.nutri?.nrsEscore !== undefined && (
              <p className="text-[10px] font-bold text-slate-500 mt-1">Escore NRS: {derivVivo.nrsEscore ?? currentPatient.nutri?.nrsEscore ?? '-'}</p>
            )}
          </div>
        </div>

        {/* MEDIDAS ANTROPOMÉTRICAS (EDITÁVEIS) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block">Altura do Joelho (cm)</label>
            <input type="number" className="w-full p-2 border rounded border-lime-300 bg-white font-bold text-lime-900"
              value={currentPatient.nutri?.alturaJoelho || ""}
              onChange={(e) => updateNested("nutri", "alturaJoelho", e.target.value)}
              onBlur={recalcularNutri} />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block">Circ. Braço (cm)</label>
            <input type="number" className="w-full p-2 border rounded border-lime-300 bg-white font-bold text-lime-900"
              value={currentPatient.nutri?.circBraco || ""}
              onChange={(e) => updateNested("nutri", "circBraco", e.target.value)}
              onBlur={recalcularNutri} />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block">Circ. Panturrilha (cm)</label>
            <input type="number" className="w-full p-2 border rounded border-lime-300 bg-white font-bold text-lime-900"
              value={currentPatient.nutri?.circPanturrilha || ""}
              onChange={(e) => updateNested("nutri", "circPanturrilha", e.target.value)}
              onBlur={recalcularNutri} />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block">PCT (mm)</label>
            <input type="number" className="w-full p-2 border rounded border-lime-300 bg-white font-bold text-lime-900"
              value={currentPatient.nutri?.pct || ""}
              onChange={(e) => updateNested("nutri", "pct", e.target.value)}
              onBlur={recalcularNutri} />
          </div>
        </div>

        {/* Amputações marcadas */}
        {currentPatient.nutri?.amputacoes?.length > 0 && (
          <div className="bg-white p-3 rounded-lg border border-lime-200 mb-6">
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Amputações</label>
            <div className="flex flex-wrap gap-2">
              {currentPatient.nutri.amputacoes.map(a => (
                <span key={a} className="px-2 py-1 rounded bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                  {AMPUTACAO_LABELS[a] || a}
                </span>
              ))}
            </div>
          </div>
        )}        

        {/* ESTADO NUTRICIONAL (IMC + ANTROPOMETRIA) */}
        <div className="bg-white p-4 rounded-xl border border-lime-200 shadow-sm mb-6">
          <h5 className="text-xs font-bold text-slate-500 uppercase mb-3">Estado Nutricional</h5>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-lime-100 text-lime-900">
                  <th className="p-2 text-left font-bold">Indicador</th>
                  <th className="p-2 text-center font-bold">Valor</th>
                  <th className="p-2 text-center font-bold">Adequação</th>
                  <th className="p-2 text-center font-bold">Classificação</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-lime-100">
                  <td className="p-2 font-bold text-slate-700">IMC</td>
                  <td className="p-2 text-center font-bold text-slate-700">{derivVivo.imc !== null ? `${derivVivo.imc.toFixed(1)} kg/m²` : '—'}</td>
                  <td className="p-2 text-center text-slate-600">—</td>
                  <td className="p-2 text-center font-bold text-lime-700">{derivVivo.classificacaoIMC || '—'}</td>
                </tr>
                <tr className="border-b border-lime-100">
                  <td className="p-2 font-bold text-slate-700">PCT</td>
                  <td className="p-2 text-center font-bold text-slate-700">{derivVivo.pctMm > 0 ? `${derivVivo.pctMm.toFixed(1)} mm` : '—'}</td>
                  <td className="p-2 text-center text-slate-600">{derivVivo.adequacaoPCT !== null ? `${derivVivo.adequacaoPCT.toFixed(1)}%` : '—'}</td>
                  <td className="p-2 text-center font-bold text-lime-700">{derivVivo.classificacaoPCT || '—'}</td>
                </tr>
                <tr className="border-b border-lime-100">
                  <td className="p-2 font-bold text-slate-700">CMB</td>
                  <td className="p-2 text-center font-bold text-slate-700">{derivVivo.cmb !== null ? `${derivVivo.cmb.toFixed(1)} cm` : '—'}</td>
                  <td className="p-2 text-center text-slate-600">{derivVivo.adequacaoCMB !== null ? `${derivVivo.adequacaoCMB.toFixed(1)}%` : '—'}</td>
                  <td className="p-2 text-center font-bold text-lime-700">{derivVivo.classificacaoCMB || '—'}</td>
                </tr>
                <tr className="border-b border-lime-100">
                  <td className="p-2 font-bold text-slate-700">AMB</td>
                  <td className="p-2 text-center font-bold text-slate-700">{derivVivo.amb !== null ? `${derivVivo.amb.toFixed(1)} cm²` : '—'}</td>
                  <td className="p-2 text-center text-slate-600">{derivVivo.adequacaoAMB !== null ? `${derivVivo.adequacaoAMB.toFixed(1)}%` : '—'}</td>
                  <td className="p-2 text-center font-bold text-lime-700">{derivVivo.classificacaoAMB || '—'}</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-slate-700">Sarcopenia (CP)</td>
                  <td className="p-2 text-center font-bold text-slate-700">{currentPatient.nutri?.circPanturrilha ? `${currentPatient.nutri.circPanturrilha} cm` : '—'}</td>
                  <td className="p-2 text-center text-slate-600">—</td>
                  <td className="p-2 text-center font-bold text-lime-700">{derivVivo.classificacaoSarcopenia || '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-2">Referência: percentil 50 de Frisancho (1981) · Blackburn & Thornton (1979) · EWGSOP2 (2019)</p>
        </div>

        {/* METAS NUTRICIONAIS (TOTAIS AUTO-CALCULADAS + DIÁRIAS MANUAIS) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="text-xs font-bold text-lime-700 uppercase truncate block">Meta Calórica Total (kcal)</label>
            <input
              type="number" readOnly
              className="w-full p-2 border-2 border-lime-100 rounded bg-lime-50 font-black text-lime-800"
              value={metasVivo.metaCaloricaTotal !== null ? Math.round(metasVivo.metaCaloricaTotal) : ""}
              placeholder="Automática"
            />
            {metasVivo.fatorCalorico && (
              <p className="text-[10px] text-lime-600 font-bold mt-1">
                {metasVivo.fatorCalorico} kcal/kg{nutriBase.aumentarPeso ? ' × 1,25 (+25%)' : ''}
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-bold text-lime-700 uppercase truncate block">Meta Cal. Diária (kcal)</label>
            <input
              type="number"
              className="w-full p-2 border-2 border-lime-100 rounded bg-white font-black"
              value={currentPatient.nutri?.metaCalDiaria || ""}
              onChange={(e) => updateNested("nutri", "metaCalDiaria", e.target.value)}
              onBlur={() => handleBlurSave("Nutrição: Editou Meta Calórica Diária")}
              placeholder="Manual"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-lime-700 uppercase truncate block">Meta Proteica Total (g)</label>
            <input
              type="number"
              className="w-full p-2 border-2 border-lime-100 rounded bg-white font-black"
              value={currentPatient?.nutri?.metaProtTotal ?? (metasVivo.metaProteicaTotal !== null ? Math.round(metasVivo.metaProteicaTotal) : "")}
              onChange={(e) => updateNested("nutri", "metaProtTotal", e.target.value === "" ? null : Number(e.target.value))}
              onBlur={() => handleBlurSave("Nutrição: Editou Meta Proteica Total")}
            />
            <p className="text-[10px] text-lime-600 font-bold mt-1">0,8 g/kg de peso</p>
          </div>
          <div>
            <label className="text-xs font-bold text-lime-700 uppercase truncate block">Meta Prot. Diária (g)</label>
            <input
              type="number"
              className="w-full p-2 border-2 border-lime-100 rounded bg-white font-black"
              value={currentPatient.nutri?.metaProtDiaria || ""}
              onChange={(e) => updateNested("nutri", "metaProtDiaria", e.target.value)}
              onBlur={() => handleBlurSave("Nutrição: Editou Meta Proteica Diária")}
              placeholder="Manual"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none mt-1">
            <input type="checkbox" className="w-4 h-4 accent-lime-600"
              checked={!!nutriBase.aumentarPeso}
              onChange={(e) => { updateNested("nutri", "aumentarPeso", e.target.checked); recalcularNutri(); }} />
            <span className="text-xs font-bold text-slate-600">Aumentar peso — meta calórica +25%</span>
          </label>          
        </div>
        

        {/* ACOMPANHAMENTO DE METAS */}
        <div className="bg-white p-4 rounded-xl border border-lime-200 shadow-sm">
          <h5 className="text-xs font-bold text-slate-500 uppercase mb-3">Acompanhamento de Metas</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <label className={`flex items-center justify-between gap-2 cursor-pointer p-3 rounded-lg border transition-colors ${currentPatient.nutri?.metaCalDiariaAtingida ? 'bg-lime-100 border-lime-400' : 'bg-slate-50 border-slate-200'}`}>
              <span className="font-bold text-sm text-slate-700">Meta Calórica Diária Atingida</span>
              <input
                type="checkbox" className="w-5 h-5 accent-lime-600"
                checked={currentPatient.nutri?.metaCalDiariaAtingida || false}
                onChange={(e) => updateNested("nutri", "metaCalDiariaAtingida", e.target.checked)}
              />
            </label>
            <label className={`flex items-center justify-between gap-2 cursor-pointer p-3 rounded-lg border transition-colors ${currentPatient.nutri?.metaProtDiariaAtingida ? 'bg-lime-100 border-lime-400' : 'bg-slate-50 border-slate-200'}`}>
              <span className="font-bold text-sm text-slate-700">Meta Proteica Diária Atingida</span>
              <input
                type="checkbox" className="w-5 h-5 accent-lime-600"
                checked={currentPatient.nutri?.metaProtDiariaAtingida || false}
                onChange={(e) => updateNested("nutri", "metaProtDiariaAtingida", e.target.checked)}
              />
            </label>
            <label className={`flex items-center justify-between gap-2 cursor-pointer p-3 rounded-lg border transition-colors ${currentPatient.nutri?.metaCalTotalAtingida ? 'bg-lime-100 border-lime-400' : 'bg-slate-50 border-slate-200'}`}>
              <span className="font-bold text-sm text-slate-700">Meta Calórica Total Atingida</span>
              <input
                type="checkbox" className="w-5 h-5 accent-lime-600"
                checked={currentPatient.nutri?.metaCalTotalAtingida || false}
                onChange={(e) => updateNested("nutri", "metaCalTotalAtingida", e.target.checked)}
              />
            </label>
            <label className={`flex items-center justify-between gap-2 cursor-pointer p-3 rounded-lg border transition-colors ${currentPatient.nutri?.metaProtTotalAtingida ? 'bg-lime-100 border-lime-400' : 'bg-slate-50 border-slate-200'}`}>
              <span className="font-bold text-sm text-slate-700">Meta Proteica Total Atingida</span>
              <input
                type="checkbox" className="w-5 h-5 accent-lime-600"
                checked={currentPatient.nutri?.metaProtTotalAtingida || false}
                onChange={(e) => updateNested("nutri", "metaProtTotalAtingida", e.target.checked)}
              />
            </label>
          </div>
          <textarea
            className="w-full text-xs p-3 border rounded-lg outline-none h-16 bg-slate-50 focus:bg-white transition-colors"
            placeholder="Anotações sobre o acompanhamento das metas..."
            value={currentPatient.nutri?.atingidoAnotacoes || ""}
            onChange={(e) => updateNested("nutri", "atingidoAnotacoes", e.target.value)}
          />
        </div>
      </div>

      {/* BLOCO 2: LAYOUT SIMÉTRICO EM 2 COLUNAS */}
      <div className="grid md:grid-cols-2 gap-6">
        
        {/* COLUNA ESQUERDA: Dieta + Monitoramento */}
        <div className="flex flex-col gap-6">
          
          {/* CARD: DIETA */}
          <div className="p-4 border rounded-xl bg-white shadow-sm">
            <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Utensils size={16} /> Dieta</h4>
            
            <label className="block text-xs font-bold text-gray-500 mb-1">Via de Administração</label>
            <select
              className="w-full p-2 border rounded mb-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-lime-200 transition-colors"
              value={currentPatient.nutri?.via || ""}
              onChange={(e) => updateNested("nutri", "via", e.target.value)}
              onBlur={() => handleBlurSave("Nutrição: Alterou Via de Administração da Dieta")}
            >
              <option value="">Selecione...</option>
              <option value="Oral">Oral</option>
              <option value="Enteral">Enteral</option>
              <option value="Parenteral">Parenteral</option>
              <option value="Zero">Zero</option>
              <option value="Mista">Mista</option>
            </select>

            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 mb-1">Características da Dieta</label>
              <div className="flex flex-wrap gap-2">
                {CARACTERISTICAS_DIETA.map((c) => (
                  <label key={c} className="flex items-center gap-1 text-xs font-semibold text-slate-700 cursor-pointer p-1 hover:bg-lime-50 rounded transition-colors">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 text-lime-600 rounded focus:ring-lime-500"
                      checked={(currentPatient.nutri?.caracteristicasDieta || []).includes(c)}
                      onChange={() => toggleArrayItem("nutri", "caracteristicasDieta", c)}
                      onBlur={() => handleBlurSave(`Nutrição: Alterou característica da dieta (${c})`)}
                    /> {c}
                  </label>
                ))}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-xs font-bold text-pink-700 mb-1">Consistência (Fono)</label>
              <select
                className="w-full p-2 border rounded bg-pink-50/30 text-pink-900 font-bold outline-none focus:ring-2 focus:ring-pink-300"
                value={currentPatient.fono?.consistencia || ""}
                onChange={(e) => updateNested("fono", "consistencia", e.target.value)}
                onBlur={() => handleBlurSave("Nutrição: Alterou Consistência (Fono)")}
              >
                <option value="">Selecione...</option>
                {CONSISTENCIA_ALIMENTAR.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>

            {currentPatient.nutri?.via === "Enteral" && (
              <div className="mt-2 p-3 bg-lime-50/50 border border-lime-200 rounded-xl animate-fadeIn">
                <label className="block text-xs font-bold text-gray-500 mb-2">Administração Enteral</label>

                {/* Fórmula */}
                <select
                  className="w-full p-2 border rounded text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-lime-200 bg-white mb-3"
                  value={currentPatient.nutri?.tipoDietaEnteral || ""}
                  onChange={(e) => updateNested("nutri", "tipoDietaEnteral", e.target.value)}
                  onBlur={() => handleBlurSave("Nutrição: Editou Tipo/Fórmula da Dieta Enteral")}
                >
                  <option value="">Selecione a fórmula enteral...</option>
                  {FORMULAS_ENTERAIS.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>

                {/* Modo de administração */}
                <label className="block text-xs font-bold text-gray-500 mb-1">Modo de Administração</label>
                <div className="flex gap-2 mb-3">
                  {['BIC', 'Gravitacional'].map((modo) => {
                    const ativo = (currentPatient.nutri?.modoEnteral || "") === modo;
                    return (
                      <button
                        key={modo}
                        type="button"
                        onClick={() => {
                          updateNested("nutri", "modoEnteral", modo);
                          if (modo === "BIC") updateNested("nutri", "vezesPorDiaEnteral", "");
                        }}
                        onBlur={() => handleBlurSave(`Nutrição: Alterou modo de administração enteral (${modo})`)}
                        className={`flex-1 px-3 py-2 rounded-lg border-2 text-xs font-bold transition-all ${
                          ativo
                            ? 'border-lime-600 bg-lime-100 text-lime-800'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-lime-300'
                        }`}
                      >
                        {modo === 'BIC' ? '💧 BIC (bomba)' : '⬇️ Gravitacional'}
                      </button>
                    );
                  })}
                </div>

                {/* Volume total + campos por modo */}
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Volume Total (mL/dia)</label>
                    <input
                      inputMode="decimal"
                      placeholder="Ex: 1440"
                      className="w-full p-2 border rounded text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-lime-200"
                      value={currentPatient.nutri?.volumeTotalEnteral || ""}
                      onChange={(e) => updateNested("nutri", "volumeTotalEnteral", e.target.value)}
                      onBlur={() => handleBlurSave("Nutrição: Editou Volume Total Enteral")}
                    />
                  </div>

                  {currentPatient.nutri?.modoEnteral === 'Gravitacional' ? (
                    <div className="animate-fadeIn">
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">Vezes por dia</label>
                      <input
                        inputMode="numeric"
                        placeholder="Ex: 6"
                        className="w-full p-2 border rounded text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-lime-200"
                        value={currentPatient.nutri?.vezesPorDiaEnteral || ""}
                        onChange={(e) => updateNested("nutri", "vezesPorDiaEnteral", e.target.value)}
                        onBlur={() => handleBlurSave("Nutrição: Editou nº de administrações enterais")}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">Vazão (mL/h)</label>
                      <input
                        readOnly
                        placeholder="—"
                        className="w-full p-2 border rounded text-xs font-bold text-lime-800 bg-lime-50 outline-none cursor-default"
                        value={(() => {
                          const calc = calcularAdministracaoEnteral(currentPatient.nutri);
                          return currentPatient.nutri?.modoEnteral === 'BIC' ? calc.vazao : (currentPatient.nutri?.vazaoEnteral || "");
                        })()}
                      />
                    </div>
                  )}
                </div>

                {/* Resultado calculado */}
                {(() => {
                  const calc = calcularAdministracaoEnteral(currentPatient.nutri);
                  if (!calc.resumo) return null;
                  return (
                    <div className="p-2 bg-white border border-lime-200 rounded-lg text-[11px] text-lime-800 font-bold animate-fadeIn">
                      ✓ {calc.resumo}
                    </div>
                  );
                })()}
              </div>
            )}

            {currentPatient.nutri?.via === "Parenteral" && (
              <div className="mt-2 animate-fadeIn">
                <input
                  placeholder="Vazão (ml/h) — Parenteral"
                  className="w-full p-2 border rounded text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-lime-200"
                  value={currentPatient.nutri?.vazaoParenteral || ""}
                  onChange={(e) => updateNested("nutri", "vazaoParenteral", e.target.value)}
                  onBlur={() => handleBlurSave("Nutrição: Editou Vazão Parenteral")}
                />
              </div>
            )}

            {currentPatient.nutri?.via === "Mista" && (
              <div className="mt-3 p-3 bg-lime-50/50 border border-lime-200 rounded-xl animate-fadeIn">
                <label className="block text-xs font-bold text-gray-500 mb-2">Vias que compõem a dieta mista</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {['Parenteral', 'Enteral', 'Oral'].map((viaMista) => {
                    const selecionada = (currentPatient.nutri?.viasMistas || []).includes(viaMista);
                    return (
                      <button
                        key={viaMista}
                        type="button"
                        onClick={() => toggleArrayItem("nutri", "viasMistas", viaMista)}
                        onBlur={() => handleBlurSave(`Nutrição: Alterou via da dieta mista (${viaMista})`)}
                        className={`px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-all ${
                          selecionada
                            ? 'border-lime-600 bg-lime-100 text-lime-800'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-lime-300'
                        }`}
                      >
                        {selecionada ? '✓ ' : ''}{viaMista}
                      </button>
                    );
                  })}
                </div>

                {(currentPatient.nutri?.viasMistas || []).includes('Enteral') && (
                  <div className="p-3 bg-white border border-lime-200 rounded-lg mb-3 animate-fadeIn">
                    <label className="block text-xs font-bold text-gray-500 mb-2">Administração Enteral</label>

                    <select
                      className="w-full p-2 border rounded text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-lime-200 bg-white mb-3"
                      value={currentPatient.nutri?.tipoDietaEnteral || ""}
                      onChange={(e) => updateNested("nutri", "tipoDietaEnteral", e.target.value)}
                      onBlur={() => handleBlurSave("Nutrição: Editou Tipo/Fórmula Enteral da Dieta Mista")}
                    >
                      <option value="">Selecione a fórmula enteral...</option>
                      {FORMULAS_ENTERAIS.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>

                    <label className="block text-xs font-bold text-gray-500 mb-1">Modo de Administração</label>
                    <div className="flex gap-2 mb-3">
                      {['BIC', 'Gravitacional'].map((modo) => {
                        const ativo = (currentPatient.nutri?.modoEnteral || "") === modo;
                        return (
                          <button
                            key={modo}
                            type="button"
                            onClick={() => {
                              updateNested("nutri", "modoEnteral", modo);
                              if (modo === "BIC") updateNested("nutri", "vezesPorDiaEnteral", "");
                            }}
                            onBlur={() => handleBlurSave(`Nutrição: Alterou modo enteral da dieta mista (${modo})`)}
                            className={`flex-1 px-3 py-2 rounded-lg border-2 text-xs font-bold transition-all ${
                              ativo
                                ? 'border-lime-600 bg-lime-100 text-lime-800'
                                : 'border-slate-200 bg-white text-slate-500 hover:border-lime-300'
                            }`}
                          >
                            {modo === 'BIC' ? '💧 BIC (bomba)' : '⬇️ Gravitacional'}
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">Volume Total (mL/dia)</label>
                        <input
                          inputMode="decimal"
                          placeholder="Ex: 1440"
                          className="w-full p-2 border rounded text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-lime-200"
                          value={currentPatient.nutri?.volumeTotalEnteral || ""}
                          onChange={(e) => updateNested("nutri", "volumeTotalEnteral", e.target.value)}
                          onBlur={() => handleBlurSave("Nutrição: Editou Volume Total Enteral (Mista)")}
                        />
                      </div>

                      {currentPatient.nutri?.modoEnteral === 'Gravitacional' ? (
                        <div className="animate-fadeIn">
                          <label className="block text-[10px] font-bold text-gray-500 mb-1">Vezes por dia</label>
                          <input
                            inputMode="numeric"
                            placeholder="Ex: 6"
                            className="w-full p-2 border rounded text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-lime-200"
                            value={currentPatient.nutri?.vezesPorDiaEnteral || ""}
                            onChange={(e) => updateNested("nutri", "vezesPorDiaEnteral", e.target.value)}
                            onBlur={() => handleBlurSave("Nutrição: Editou nº de adm. enterais (Mista)")}
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1">Vazão (mL/h)</label>
                          <input
                            readOnly
                            placeholder="—"
                            className="w-full p-2 border rounded text-xs font-bold text-lime-800 bg-lime-50 outline-none cursor-default"
                            value={(() => {
                              const calc = calcularAdministracaoEnteral(currentPatient.nutri);
                              return currentPatient.nutri?.modoEnteral === 'BIC' ? calc.vazao : (currentPatient.nutri?.vazaoEnteral || "");
                            })()}
                          />
                        </div>
                      )}
                    </div>

                    {(() => {
                      const calc = calcularAdministracaoEnteral(currentPatient.nutri);
                      if (!calc.resumo) return null;
                      return (
                        <div className="p-2 bg-lime-50 border border-lime-200 rounded-lg text-[11px] text-lime-800 font-bold animate-fadeIn">
                          ✓ {calc.resumo}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {(currentPatient.nutri?.viasMistas || []).includes('Parenteral') && (
                  <div className="mb-3 animate-fadeIn">
                    <input
                      placeholder="Vazão (ml/h) — Parenteral"
                      className="w-full p-2 border rounded text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-lime-200"
                      value={currentPatient.nutri?.vazaoParenteral || ""}
                      onChange={(e) => updateNested("nutri", "vazaoParenteral", e.target.value)}
                      onBlur={() => handleBlurSave("Nutrição: Editou Vazão Parenteral da Dieta Mista")}
                    />
                  </div>
                )}

                {(currentPatient.nutri?.viasMistas || []).includes('Oral') && (
                  <div className="p-2 bg-white border border-lime-200 rounded-lg text-[11px] text-slate-500 font-bold animate-fadeIn">
                    ✓ Via Oral selecionada — use as características da dieta acima para definir hipossódica, DM, laxativa, etc.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CARD: ÚLTIMA EVACUAÇÃO */}
          <div className="p-4 border rounded-xl bg-white shadow-sm flex flex-col">
            <h4 className="font-bold text-slate-700 mb-4">Última Evacuação</h4>
            {(() => {
              const temRegistroPositivo = (valor) => {
                if (!valor) return false;
                const texto = String(valor).trim().toLowerCase();
                if (texto === "" || texto === "0" || texto === "n" || texto === "nao" || texto === "não" || texto === "-") return false;
                return true;
              };
              let evacuouNoBH = false;
              if (currentPatient.bh?.losses) {
                Object.values(currentPatient.bh.losses).forEach(hora => {
                  if (hora && (temRegistroPositivo(hora["Evacuação"]) || temRegistroPositivo(hora["Evacuacao"]) || temRegistroPositivo(hora["Fezes"]))) {
                    evacuouNoBH = true;
                  }
                });
              }
              const dataSalva = currentPatient.gastro?.dataUltimaEvacuacao;
              const diasSemEvacuar = evacuouNoBH ? 0 : calculateEvacDays(dataSalva);
              return (
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Data da última evacuação</label>
                  {evacuouNoBH ? (
                    <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-xs font-bold text-green-700 uppercase">Registrada hoje no BH</span>
                    </div>
                  ) : (
                    <input
                      type="date"
                      className="w-full p-2 border rounded text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-lime-200"
                      value={dataSalva || ""}
                      onChange={(e) => updateNested("gastro", "dataUltimaEvacuacao", e.target.value)}
                    />
                  )}
                  {dataSalva || evacuouNoBH ? (
                    <div className="mt-2 p-1.5 bg-amber-50 border border-amber-200 rounded-lg text-center">
                      <span className="text-[10px] font-bold text-amber-800 uppercase">
                        Tempo sem evacuar: <span className="text-xs font-black">{diasSemEvacuar} {diasSemEvacuar === 1 ? 'dia' : 'dias'}</span>
                      </span>
                    </div>
                  ) : null}
                </div>
              );
            })()}
          </div>

        </div>

        {/* COLUNA DIREITA: Tolerância + Anotações */}
        <div className="flex flex-col gap-6">
          
          {/* CARD: MONITORAMENTO DO CONSUMO ORAL — TOTAL */}
          {renderConsumoCard(
            'Monitoramento do Consumo Oral (Total)',
            mediaAlimentos, countAlimentos, mediaSuplementos, countSuplementos,
            (tipo) => setModalConsumo({ isOpen: true, tipo }),
            'total'
          )}

          {/* CARD: MONITORAMENTO DO CONSUMO ORAL — DIA ANTERIOR (07h às 06h) */}
          {renderConsumoCard(
            'Monitoramento do Consumo Oral (Dia Anterior)',
            mediaAlimentosOntem, countAlimentosOntem, mediaSuplementosOntem, countSuplementosOntem,
            (tipo) => setModalConsumo({ isOpen: true, tipo, dataMinima: inicioJanela }),
            'diario'
          )}

          {/* CARD: ANOTAÇÕES (Expande para preencher o espaço) */}
          <div className="p-4 bg-white border rounded-xl shadow-sm">
            <h4 className="font-bold text-slate-700 mb-2">Anotações Nutricionais</h4>
            <textarea
              className="w-full p-2.5 border rounded-lg h-24 resize-y text-sm outline-none focus:ring-2 focus:ring-lime-200"
              value={currentPatient.nutri?.anotacoes || ""}
              onChange={(e) => updateNested("nutri", "anotacoes", e.target.value)}
              onBlur={() => handleBlurSave("Nutrição: Editou Anotações")}
            />
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: HISTÓRICO DE CONSUMO ORAL                                          */}
      {/* ========================================================================= */}
      {modalConsumo.isOpen && (() => {
        const { groups, sortedDates } = modalConsumo.dataMinima
          ? getGroupedHistoryFiltrado(modalConsumo.tipo, modalConsumo.dataMinima)
          : getGroupedHistory(modalConsumo.tipo);
        const titulo = modalConsumo.tipo === 'suplementos' ? 'Suplementos' : 'Alimentos';

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in border-4 border-lime-500/20 max-h-[85vh]">
              
              <div className="bg-lime-600 p-5 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-full"><BarChart2 size={20} /></div>
                  <h2 className="text-lg font-black tracking-wide leading-tight">Histórico: {titulo}</h2>
                </div>
                <button onClick={() => setModalConsumo({ isOpen: false, tipo: null })} className="p-1.5 hover:bg-white/20 rounded-xl transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 bg-slate-50 overflow-y-auto space-y-6">
                {sortedDates.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 font-bold">Nenhum registro encontrado.</div>
                ) : (
                  sortedDates.map(date => (
                    <div key={date} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 font-black text-sm text-slate-600 flex items-center gap-2">
                        <History size={14} className="text-lime-600" /> {date}
                      </div>
                      <div className="divide-y divide-slate-100">
                        {groups[date].sort((a,b) => {
                          // 🔥 AGORA ELE PRIORIZA O 'horarioRefeicao'
                          const timeA = a.horarioRefeicao || a.horario || a.hora || (a.dataHoraRegistro ? new Date(a.dataHoraRegistro).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : "");
                          const timeB = b.horarioRefeicao || b.horario || b.hora || (b.dataHoraRegistro ? new Date(b.dataHoraRegistro).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : "");
                          return timeA.localeCompare(timeB);
                        }).map((item, idx) => {
                          // 🔥 APLICA A MESMA LÓGICA PARA EXIBIR NA TELA
                          const timeItem = item.horarioRefeicao || item.horario || item.hora || (item.dataHoraRegistro ? new Date(item.dataHoraRegistro).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : "--:--");
                          
                          const nomeRefeicao = item.tipoRefeicao || item.refeicao || "Refeição";
                          
                          return (
                            <div key={idx} className="p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                              <div>
                                <span className="text-xs font-bold text-lime-700 bg-lime-50 px-2 py-1 rounded border border-lime-100 mr-2">
                                  {timeItem}
                                </span>
                                <span className="text-sm font-bold text-slate-700">{nomeRefeicao}</span>
                              </div>
                              <div className="text-right">
                                {item.tiposOferecidos?.solida && (
                                  <span className="block text-lg font-black text-orange-600">{item.consumo?.solida ?? 0}%</span>
                                )}
                                {item.tiposOferecidos?.liquida && (
                                  <span className="block text-lg font-black text-blue-600">{item.consumo?.liquida ?? 0}%</span>
                                )}
                                {!item.tiposOferecidos?.solida && !item.tiposOferecidos?.liquida && (
                                  <span className="block text-lg font-black text-lime-600">—</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL: HISTÓRICO DE MÉTRICAS NUTRICIONAIS                                */}
      {/* ========================================================================= */}
      {showHistoricoMetricas && (() => {
        const registros = Array.isArray(currentPatient?.nutri?.historico_metricas)
          ? [...currentPatient.nutri.historico_metricas].sort((a, b) => String(a.data).localeCompare(String(b.data)))
          : [];

        const fmtData = (iso) => {
          if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || "-";
          const [a, m, d] = iso.split("-");
          return `${d}-${m}-${a}`;
        };

        // Alterna métrica no gráfico
        const toggleMetrica = (key) => {
          setMetricasSelecionadas(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
          );
        };

        // Monta os dados do gráfico para as métricas selecionadas
        const seriesAtivas = METRICAS_DISPONIVEIS.filter(m => metricasSelecionadas.includes(m.key));

        // Escala vertical: min/max globais entre as séries ativas
        const todosValores = seriesAtivas.flatMap(s =>
          registros
            .map(r => parseFloat(String(r[s.key] ?? "").replace(",", ".")))
            .filter(v => !isNaN(v))
        );
        const vMin = todosValores.length ? Math.min(...todosValores) : 0;
        const vMax = todosValores.length ? Math.max(...todosValores) : 1;
        const pad = (vMax - vMin) * 0.1 || 1;
        const yMin = Math.max(0, vMin - pad);
        const yMax = vMax + pad;

        const W = 640, H = 260;
        const PAD_L = 46, PAD_R = 16, PAD_T = 16, PAD_B = 42;
        const plotW = W - PAD_L - PAD_R;
        const plotH = H - PAD_T - PAD_B;

        const xDe = (i) => PAD_L + (registros.length <= 1 ? plotW / 2 : (i / (registros.length - 1)) * plotW);
        const yDe = (v) => PAD_T + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;

        return (
          <ModalPortal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4 text-left">
              <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-fadeIn border-4 border-lime-500/20">
                <div className="bg-lime-700 p-4 text-white flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-full"><LineChart size={20} /></div>
                    <div>
                      <h2 className="text-lg font-black tracking-wide leading-tight">Histórico de Métricas</h2>
                      <p className="text-lime-200 text-xs">{registros.length} registro(s)</p>
                    </div>
                  </div>
                  <button onClick={() => setShowHistoricoMetricas(false)} className="p-1 hover:bg-white/20 rounded-xl transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="p-5 bg-slate-50 overflow-y-auto space-y-5 flex-1 min-h-0">

                  {registros.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <LineChart size={44} className="mx-auto mb-3 opacity-40" />
                      <p className="font-bold">Nenhum registro ainda.</p>
                      <p className="text-xs mt-1">Use "Salvar Métricas" para criar o primeiro ponto.</p>
                    </div>
                  ) : (
                    <>
                      {/* CHECKBOXES DE MÉTRICAS */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <label className="text-[11px] font-bold text-slate-500 uppercase block mb-2">
                          Métricas no gráfico
                        </label>
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                          {METRICAS_DISPONIVEIS.map(m => {
                            const ativa = metricasSelecionadas.includes(m.key);
                            return (
                              <label key={m.key} className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer hover:text-lime-700">
                                <input
                                  type="checkbox"
                                  className="w-3.5 h-3.5 rounded focus:ring-lime-500"
                                  style={{ accentColor: m.cor }}
                                  checked={ativa}
                                  onChange={() => toggleMetrica(m.key)}
                                />
                                <span className="inline-block w-2 h-2 rounded-full" style={{ background: m.cor }} />
                                {m.label}
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* GRÁFICO DE LINHAS — SVG puro */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 overflow-x-auto">
                        {seriesAtivas.length === 0 ? (
                          <p className="text-center text-sm text-slate-400 py-10">
                            Selecione ao menos uma métrica acima.
                          </p>
                        ) : (
                          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto min-w-[520px]">
                            {/* Grid horizontal */}
                            {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
                              const y = PAD_T + plotH * f;
                              const val = yMax - (yMax - yMin) * f;
                              return (
                                <g key={i}>
                                  <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                                  <text x={PAD_L - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="bold">
                                    {val.toFixed(1)}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Eixo X — rótulos de data */}
                            {registros.map((r, i) => (
                              <text
                                key={r.id || i}
                                x={xDe(i)} y={H - PAD_B + 14}
                                textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="bold"
                              >
                                {fmtData(r.data).slice(0, 5)}
                              </text>
                            ))}

                            {/* Séries */}
                            {seriesAtivas.map(s => {
                              const pontos = registros
                                .map((r, i) => {
                                  const v = parseFloat(String(r[s.key] ?? "").replace(",", "."));
                                  return isNaN(v) ? null : { x: xDe(i), y: yDe(v), v, r };
                                })
                                .filter(Boolean);

                              if (pontos.length === 0) return null;

                              const path = pontos.map((p, k) => `${k === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

                              return (
                                <g key={s.key}>
                                  <path d={path} fill="none" stroke={s.cor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                                  {pontos.map((p, k) => (
                                    <circle key={k} cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke={s.cor} strokeWidth="2">
                                      <title>{`${s.label}: ${p.v} — ${fmtData(p.r.data)}`}</title>
                                    </circle>
                                  ))}
                                </g>
                              );
                            })}
                          </svg>
                        )}

                        {/* Legenda */}
                        {seriesAtivas.length > 0 && (
                          <div className="flex flex-wrap gap-3 mt-2 pt-2 border-t border-slate-100">
                            {seriesAtivas.map(s => (
                              <span key={s.key} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                                <span className="inline-block w-3 h-0.5 rounded" style={{ background: s.cor }} />
                                {s.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* LISTA DE DATAS SALVAS — clicáveis */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <label className="text-[11px] font-bold text-slate-500 uppercase block mb-2">
                          Datas registradas <span className="text-slate-400 normal-case">(clique para ver os dados)</span>
                        </label>
                        <div className="space-y-1.5 max-h-52 overflow-y-auto">
                          {[...registros].reverse().map((r) => {
                            const aberto = dataDetalheMetrica === r.data;
                            return (
                              <button
                                key={r.id || r.data}
                                type="button"
                                onClick={() => setDataDetalheMetrica(aberto ? null : r.data)}
                                className={`w-full text-left p-2 rounded-lg border transition-all ${
                                  aberto
                                    ? "bg-lime-50 border-lime-400 shadow-sm"
                                    : "bg-slate-50 border-slate-100 hover:border-lime-300 hover:bg-lime-50/40"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                                      <CalendarDays size={12} className="text-lime-600" />
                                      {fmtData(r.data)}
                                    </p>
                                    <p className="text-[10px] text-slate-500 truncate">
                                      {r.peso ? `Peso ${r.peso}kg` : ""}
                                      {r.imc ? ` · IMC ${Number(r.imc).toFixed(1)}` : ""}
                                      {r.classificacaoIMC ? ` · ${r.classificacaoIMC}` : ""}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {r.nrsClassificacao && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                                        {r.nrsClassificacao}
                                      </span>
                                    )}
                                    {aberto ? <ChevronDown size={14} className="text-lime-700" /> : <ChevronRight size={14} className="text-slate-400" />}
                                  </div>
                                </div>

                                {/* DETALHE EXPANDIDO */}
                                {aberto && (() => {
                                  const det = r;
                                  const num = (v, dec = 1, un = "") => {
                                    const n = parseFloat(String(v ?? "").replace(",", "."));
                                    return isNaN(n) ? "—" : `${n.toFixed(dec)}${un}`;
                                  };
                                  const linha = (ind, valor, adeq, clas) => (
                                    <tr className="border-b border-slate-100 last:border-0">
                                      <td className="p-1.5 font-bold text-slate-700">{ind}</td>
                                      <td className="p-1.5 text-center font-bold text-slate-700">{valor}</td>
                                      <td className="p-1.5 text-center text-slate-600">{adeq}</td>
                                      <td className={`p-1.5 text-center font-bold ${corClassificacao(clas)}`}>{clas || "—"}</td>
                                    </tr>
                                  );

                                  return (
                                    <div className="mt-2 pt-2 border-t border-lime-200 space-y-2 animate-fadeIn" onClick={(e) => e.stopPropagation()}>

                                      {/* MEDIDAS PRINCIPAIS */}
                                      <div className="grid grid-cols-2 gap-1.5">
                                        <div className="bg-white rounded-lg p-1.5 border border-lime-200">
                                          <p className="text-[9px] font-bold text-slate-400 uppercase">Peso</p>
                                          <p className="text-xs font-black text-lime-900">{num(det.peso, 1, " kg")}</p>
                                          {det.tipoMedicaoPeso && <p className="text-[8px] text-slate-400 font-bold">{det.tipoMedicaoPeso}</p>}
                                        </div>
                                        <div className="bg-white rounded-lg p-1.5 border border-lime-200">
                                          <p className="text-[9px] font-bold text-slate-400 uppercase">Altura</p>
                                          <p className="text-xs font-black text-lime-900">{num(det.altura, 1, " cm")}</p>
                                          {det.tipoMedicaoAltura && <p className="text-[8px] text-slate-400 font-bold">{det.tipoMedicaoAltura}</p>}
                                        </div>
                                        <div className="bg-white rounded-lg p-1.5 border border-lime-200">
                                          <p className="text-[9px] font-bold text-slate-400 uppercase">IMC</p>
                                          <p className="text-xs font-black text-lime-900">{num(det.imc, 1, " kg/m²")}</p>
                                          {det.classificacaoIMC && <p className={`text-[8px] font-bold ${corClassificacao(det.classificacaoIMC)}`}>{det.classificacaoIMC}</p>}
                                        </div>
                                        <div className="bg-white rounded-lg p-1.5 border border-red-200">
                                          <p className="text-[9px] font-bold text-red-400 uppercase">NRS 2002</p>
                                          <p className="text-xs font-black text-red-800">
                                            {det.nrsEscore !== null && det.nrsEscore !== undefined ? `Escore ${det.nrsEscore}` : "—"}
                                          </p>
                                          {det.nrsClassificacao && <p className="text-[8px] font-bold text-red-600 leading-tight">{det.nrsClassificacao}</p>}
                                        </div>
                                      </div>

                                      {/* MEDIDAS ANTROPOMÉTRICAS */}
                                      <div className="grid grid-cols-2 gap-1.5">
                                        <div className="bg-white rounded-lg p-1.5 border border-lime-200">
                                          <p className="text-[9px] font-bold text-slate-400 uppercase">Altura Joelho</p>
                                          <p className="text-xs font-black text-lime-900">{num(det.alturaJoelho, 1, " cm")}</p>
                                        </div>
                                        <div className="bg-white rounded-lg p-1.5 border border-lime-200">
                                          <p className="text-[9px] font-bold text-slate-400 uppercase">Circ. Braço</p>
                                          <p className="text-xs font-black text-lime-900">{num(det.circBraco, 1, " cm")}</p>
                                        </div>
                                        <div className="bg-white rounded-lg p-1.5 border border-lime-200">
                                          <p className="text-[9px] font-bold text-slate-400 uppercase">Circ. Panturrilha</p>
                                          <p className="text-xs font-black text-lime-900">{num(det.circPanturrilha, 1, " cm")}</p>
                                        </div>
                                        <div className="bg-white rounded-lg p-1.5 border border-lime-200">
                                          <p className="text-[9px] font-bold text-slate-400 uppercase">PCT</p>
                                          <p className="text-xs font-black text-lime-900">{num(det.pct, 1, " mm")}</p>
                                        </div>
                                      </div>

                                      {/* AMPUTAÇÕES */}
                                      {Array.isArray(det.amputacoes) && det.amputacoes.length > 0 && (
                                        <div className="bg-white rounded-lg p-1.5 border border-red-200">
                                          <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Amputações</p>
                                          <div className="flex flex-wrap gap-1">
                                            {det.amputacoes.map((a) => (
                                              <span key={a} className="px-1.5 py-0.5 rounded bg-red-50 border border-red-200 text-red-700 text-[9px] font-bold">
                                                {typeof AMPUTACAO_LABELS !== "undefined" && AMPUTACAO_LABELS[a] ? AMPUTACAO_LABELS[a] : a}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* TABELA ESTADO NUTRICIONAL */}
                                      <div>
                                        <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Estado Nutricional</p>
                                        <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
                                          <table className="w-full text-[10px]">
                                            <thead>
                                              <tr className="bg-lime-100 text-lime-900">
                                                <th className="p-1.5 text-left font-bold">Indicador</th>
                                                <th className="p-1.5 text-center font-bold">Valor</th>
                                                <th className="p-1.5 text-center font-bold">Adeq.</th>
                                                <th className="p-1.5 text-center font-bold">Classificação</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {linha("IMC", num(det.imc, 1, " kg/m²"), "—", det.classificacaoIMC)}
                                              {linha("PCT", num(det.pct, 1, " mm"), det.adequacaoPCT !== null && det.adequacaoPCT !== undefined ? `${num(det.adequacaoPCT, 1)}%` : "—", det.classificacaoPCT)}
                                              {linha("CMB", num(det.cmb, 1, " cm"), det.adequacaoCMB !== null && det.adequacaoCMB !== undefined ? `${num(det.adequacaoCMB, 1)}%` : "—", det.classificacaoCMB)}
                                              {linha("AMB", num(det.amb, 1, " cm²"), det.adequacaoAMB !== null && det.adequacaoAMB !== undefined ? `${num(det.adequacaoAMB, 1)}%` : "—", det.classificacaoAMB)}
                                              {linha("Sarcopenia (CP)", num(det.circPanturrilha, 1, " cm"), "—", det.classificacaoSarcopenia)}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>

                                      <p className="text-[8px] text-slate-400 font-bold leading-tight">
                                        Salvo em {det.registradoEm ? new Date(det.registradoEm).toLocaleString("pt-BR", { timeZone: "America/Manaus" }) : fmtData(det.data)}
                                      </p>
                                    </div>
                                  );
                                })()}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowHistoricoMetricas(false)}
                    className="w-full py-3 bg-lime-700 hover:bg-lime-800 text-white font-black rounded-xl shadow-lg transition-all uppercase tracking-wider"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </ModalPortal>
        );
      })()}

    </fieldset>
  );
};

export default NutriDashboard;