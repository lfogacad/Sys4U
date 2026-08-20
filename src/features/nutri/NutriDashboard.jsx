import React, { useState } from 'react';
import { Scale, Utensils, Lock, ClipboardSignature, CheckSquare, Square, Activity, History, X, BarChart2 } from 'lucide-react';
import { CARACTERISTICAS_DIETA, CONSISTENCIA_ALIMENTAR, FORMULAS_ENTERAIS, RISCO_NUTRICIONAL } from '../../constants/clinicalLists';
import { calculateEvacDays } from '../../utils/core';

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
  const [modalConsumo, setModalConsumo] = useState({ isOpen: false, tipo: null }); // 'solida' ou 'liquida'

  // =========================================================================
  // CÁLCULO DAS MÉDIAS DE CONSUMO ORAL
  // =========================================================================
  const historicoDieta = currentPatient?.enfermagem?.historico_dieta_vo || [];
  
  let somaSolida = 0, countSolida = 0;
  let somaLiquida = 0, countLiquida = 0;

  historicoDieta.forEach(reg => {
    if (reg.tiposOferecidos?.solida && reg.consumo?.solida !== null && reg.consumo?.solida !== "") {
      somaSolida += Number(reg.consumo.solida);
      countSolida++;
    }
    if (reg.tiposOferecidos?.liquida && reg.consumo?.liquida !== null && reg.consumo?.liquida !== "") {
      somaLiquida += Number(reg.consumo.liquida);
      countLiquida++;
    }
  });

  const mediaSolida = countSolida > 0 ? Math.round(somaSolida / countSolida) : 0;
  const mediaLiquida = countLiquida > 0 ? Math.round(somaLiquida / countLiquida) : 0;
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

  let somaSolidaOntem = 0, countSolidaOntem = 0;
  let somaLiquidaOntem = 0, countLiquidaOntem = 0;
  historicoDietaOntem.forEach(reg => {
    if (reg.tiposOferecidos?.solida && reg.consumo?.solida !== null && reg.consumo?.solida !== "") {
      somaSolidaOntem += Number(reg.consumo.solida);
      countSolidaOntem++;
    }
    if (reg.tiposOferecidos?.liquida && reg.consumo?.liquida !== null && reg.consumo?.liquida !== "") {
      somaLiquidaOntem += Number(reg.consumo.liquida);
      countLiquidaOntem++;
    }
  });
  const mediaSolidaOntem = countSolidaOntem > 0 ? Math.round(somaSolidaOntem / countSolidaOntem) : 0;
  const mediaLiquidaOntem = countLiquidaOntem > 0 ? Math.round(somaLiquidaOntem / countLiquidaOntem) : 0;

  // Função para agrupar o histórico por data para o Modal
  const getGroupedHistory = (tipo) => {
    const filtered = historicoDieta.filter(h => h.tiposOferecidos?.[tipo]);
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

  // Função para agrupar o histórico por data para o Modal (filtrado pela janela)
  const getGroupedHistoryFiltrado = (tipo, dataMinima) => {
    const filtered = historicoDieta.filter(h => h.tiposOferecidos?.[tipo] && h.dataHoraRegistro && new Date(h.dataHoraRegistro) >= dataMinima);
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
  const renderConsumoCard = (titulo, mediaSolidaV, countSolidaV, mediaLiquidaV, countLiquidaV, abrirHistorico) => (
    <div className="p-4 border rounded-xl bg-white shadow-sm">
      <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
        <Activity size={16} className="text-lime-600" /> {titulo}
      </h4>
      <div className="space-y-5">
        {/* ALIMENTOS */}
        <div>
          <div className="flex justify-between items-end mb-1">
            <span className="text-xs font-bold text-gray-600 uppercase">Alimentos (Média)</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-lime-700">{mediaSolidaV}%</span>
              <button
                onClick={(e) => { e.preventDefault(); abrirHistorico('solida'); }}
                className="p-1.5 bg-lime-50 hover:bg-lime-100 text-lime-700 rounded-lg transition-colors border border-lime-200"
                title="Ver Histórico"
              >
                <History size={14} />
              </button>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 shadow-inner overflow-hidden">
            <div className="bg-lime-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${mediaSolidaV}%` }}></div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 text-right">{countSolidaV} refeições registradas</p>
        </div>
        {/* SUPLEMENTOS */}
        <div>
          <div className="flex justify-between items-end mb-1">
            <span className="text-xs font-bold text-gray-600 uppercase">Suplementos (Média)</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-lime-700">{mediaLiquidaV}%</span>
              <button
                onClick={(e) => { e.preventDefault(); abrirHistorico('liquida'); }}
                className="p-1.5 bg-lime-50 hover:bg-lime-100 text-lime-700 rounded-lg transition-colors border border-lime-200"
                title="Ver Histórico"
              >
                <History size={14} />
              </button>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 shadow-inner overflow-hidden">
            <div className="bg-lime-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${mediaLiquidaV}%` }}></div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 text-right">{countLiquidaV} refeições registradas</p>
        </div>
      </div>
    </div>
  );

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
        <h4 className="font-bold text-lime-800 mb-4 flex items-center gap-2">
          <Scale size={18} /> Antropometria e Metas
        </h4>
        <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <div className="lg:col-span-2">
            <label className="text-xs font-bold text-gray-500">Peso Atual (kg)</label>
            <div className="flex gap-2">
              <input
                type="number"
                className="w-full p-2 border rounded border-lime-300 bg-white font-bold text-lime-900"
                value={currentPatient.nutri?.peso || ""}
                onChange={(e) => updateNested("nutri", "peso", e.target.value)}
                onBlur={() => handleBlurSave("Nutrição: Editou Peso")}
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
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500">Altura (Fisio)</label>
            <input
              type="text"
              className="w-full p-2 border rounded bg-slate-100 cursor-not-allowed font-medium text-slate-600"
              value={currentPatient.nutri?.altura || "-"} 
              disabled
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500">Peso Predito</label>
            <input
              type="text"
              className="w-full p-2 border rounded bg-slate-100 cursor-not-allowed font-medium text-slate-600"
              value={currentPatient.nutri?.pesoPredito || "-"}
              disabled
            />
          </div>
          <div className="lg:col-span-2">
            <label className="text-xs font-bold text-red-700">Risco Nutricional (NRS 2002)</label>
            <select
              className="w-full p-2 border rounded bg-white font-bold text-red-800 border-red-200"
              value={currentPatient.nutri?.risco_nutricional || ""}
              onChange={(e) => updateNested("nutri", "risco_nutricional", e.target.value)}
            >
              <option value="">-</option>
              {RISCO_NUTRICIONAL.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="text-xs font-bold text-lime-700 uppercase truncate block">Meta Calórica Total (kcal)</label>
            <input
              type="number"
              className="w-full p-2 border-2 border-lime-100 rounded bg-white font-black"
              value={currentPatient.nutri?.metaCalTotal || ""}
              onChange={(e) => updateNested("nutri", "metaCalTotal", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-lime-700 uppercase truncate block">Meta Cal. Diária (kcal)</label>
            <input
              type="number"
              className="w-full p-2 border-2 border-lime-100 rounded bg-white font-black"
              value={currentPatient.nutri?.metaCalDiaria || ""}
              onChange={(e) => updateNested("nutri", "metaCalDiaria", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-lime-700 uppercase truncate block">Meta Proteica Total (g)</label>
            <input
              type="number"
              className="w-full p-2 border-2 border-lime-100 rounded bg-white font-black"
              value={currentPatient.nutri?.metaProtTotal || ""}
              onChange={(e) => updateNested("nutri", "metaProtTotal", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-lime-700 uppercase truncate block">Meta Prot. Diária (g)</label>
            <input
              type="number"
              className="w-full p-2 border-2 border-lime-100 rounded bg-white font-black"
              value={currentPatient.nutri?.metaProtDiaria || ""}
              onChange={(e) => updateNested("nutri", "metaProtDiaria", e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-lime-200 shadow-sm">
          <h5 className="text-xs font-bold text-slate-500 uppercase mb-3">Acompanhamento de Metas</h5>
          <div className="flex flex-wrap gap-6 mb-4">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-700">
              <input 
                type="checkbox" className="w-5 h-5 accent-lime-600"
                checked={currentPatient.nutri?.metaCalDiariaAtingida || false}
                onChange={(e) => updateNested("nutri", "metaCalDiariaAtingida", e.target.checked)}
              /> Meta Calórica Diária Atingida
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-700">
              <input 
                type="checkbox" className="w-5 h-5 accent-lime-600"
                checked={currentPatient.nutri?.metaCalTotalAtingida || false}
                onChange={(e) => updateNested("nutri", "metaCalTotalAtingida", e.target.checked)}
              /> Meta Calórica Total Atingida
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-700">
              <input
                type="checkbox" className="w-5 h-5 accent-lime-600"
                checked={currentPatient.nutri?.metaProtDiariaAtingida || false}
                onChange={(e) => updateNested("nutri", "metaProtDiariaAtingida", e.target.checked)}
              /> Meta Proteica Diária Atingida
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-700">
              <input
                type="checkbox" className="w-5 h-5 accent-lime-600"
                checked={currentPatient.nutri?.metaProtTotalAtingida || false}
                onChange={(e) => updateNested("nutri", "metaProtTotalAtingida", e.target.checked)}
              /> Meta Proteica Total Atingida
            </label>
          </div>
          <textarea
            className="w-full text-xs p-3 border rounded-lg outline-none h-16 bg-slate-50 focus:bg-white transition-colors"
            placeholder="Anotações sobre a meta atingida..."
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
              <div className="grid grid-cols-2 gap-3 mt-2 animate-fadeIn">
                <select
                  className="p-2 border rounded text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-lime-200 bg-white"
                  value={currentPatient.nutri?.tipoDietaEnteral || ""}
                  onChange={(e) => updateNested("nutri", "tipoDietaEnteral", e.target.value)}
                  onBlur={() => handleBlurSave("Nutrição: Editou Tipo/Fórmula da Dieta Enteral")}
                >
                  <option value="">Selecione a fórmula enteral...</option>
                  {FORMULAS_ENTERAIS.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <input
                  placeholder="Vazão (ml/h) — Enteral"
                  className="p-2 border rounded text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-lime-200"
                  value={currentPatient.nutri?.vazaoEnteral || ""}
                  onChange={(e) => updateNested("nutri", "vazaoEnteral", e.target.value)}
                  onBlur={() => handleBlurSave("Nutrição: Editou Vazão Enteral")}
                />
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
                  <div className="grid grid-cols-2 gap-3 mb-3 animate-fadeIn">
                    <select
                      className="p-2 border rounded text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-lime-200 bg-white"
                      value={currentPatient.nutri?.tipoDietaEnteral || ""}
                      onChange={(e) => updateNested("nutri", "tipoDietaEnteral", e.target.value)}
                      onBlur={() => handleBlurSave("Nutrição: Editou Tipo/Fórmula Enteral da Dieta Mista")}
                    >
                      <option value="">Selecione a fórmula enteral...</option>
                      {FORMULAS_ENTERAIS.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    <input
                      placeholder="Vazão (ml/h) — Enteral"
                      className="p-2 border rounded text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-lime-200"
                      value={currentPatient.nutri?.vazaoEnteral || ""}
                      onChange={(e) => updateNested("nutri", "vazaoEnteral", e.target.value)}
                      onBlur={() => handleBlurSave("Nutrição: Editou Vazão Enteral da Dieta Mista")}
                    />
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

          {/* CARD: MONITORAMENTO DO CONSUMO ORAL — TOTAL */}
          {renderConsumoCard(
            'Monitoramento do Consumo Oral (Total)',
            mediaSolida, countSolida, mediaLiquida, countLiquida,
            (tipo) => setModalConsumo({ isOpen: true, tipo })
          )}

          {/* CARD: MONITORAMENTO DO CONSUMO ORAL — DIA ANTERIOR (07h às 06h) */}
          {renderConsumoCard(
            'Monitoramento do Consumo Oral (Dia Anterior)',
            mediaSolidaOntem, countSolidaOntem, mediaLiquidaOntem, countLiquidaOntem,
            (tipo) => setModalConsumo({ isOpen: true, tipo, dataMinima: inicioJanela })
          )}
        </div>

        {/* COLUNA DIREITA: Tolerância + Anotações */}
        <div className="flex flex-col gap-6 h-full">
          
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

          {/* CARD: ANOTAÇÕES (Expande para preencher o espaço) */}
          <div className="p-4 bg-white border rounded-xl shadow-sm flex-1 flex flex-col">
            <h4 className="font-bold text-slate-700 mb-2">Anotações Nutricionais</h4>
            <textarea
              className="w-full p-3 border rounded-lg flex-1 min-h-[120px] text-sm outline-none focus:ring-2 focus:ring-lime-200 resize-none"
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
        const titulo = modalConsumo.tipo === 'solida' ? 'Alimentos' : 'Suplementos';

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
                              <span className="text-lg font-black text-lime-600">
                                {item.consumo?.[modalConsumo.tipo] || 0}%
                              </span>
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

    </fieldset>
  );
};

export default NutriDashboard;