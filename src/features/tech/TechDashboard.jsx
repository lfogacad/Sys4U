import React from 'react';
import { AlertCircle, ShieldAlert, Droplets, Clock, Printer, RotateCcw, Scale, X, PlusCircle, Activity, CheckCircle, Edit3 } from 'lucide-react';
import { BH_HOURS, BH_GAINS, BH_LOSSES } from '../../constants/clinicalLists';
import { calculateAge, formatDateDDMM, getManausDateStr, safeNumber } from '../../utils/core';

const TechDashboard = ({
  currentPatient,
  patients,
  activeTab,
  setPatients,
  save,
  isEditable,
  viewingPreviousBH,
  setViewingPreviousBH,
  displayedBH,
  bhTotals,
  isBHReadOnly,
  canCloseDay,
  handleNextDayBH,
  handlePrintBH,
  handleAutoCalcInsensible,
  updateBH,
  updateNested,
  setCurrentNoraHour,
  setCurrentNoraRate,
  setShowNoraModal,
  handleBlurSave // <-- Adicionado para a Caixa Preta
}) => {

  // SISTEMA ANTI-ERRO DE DIGITAÇÃO ===
  const LIMITS = {
    gains: {
      "Dieta SNE": { min: 0, max: 120 },
      "Água": { min: 0, max: 999 },
      "Soro basal": { min: 0, max: 500 },
      "Diluição EV": { min: 0, max: 500 },
      "Volume": { min: 0, max: 1000 },
      "Midazolan": { min: 0, max: 100 },
      "Fentanil": { min: 0, max: 100 },
      "Noradrenalina": { min: 0, max: 100 },
      "Dobutamina": { min: 0, max: 100 },
      "Hemocomponentes": { min: 0, max: 500 }
    },
    losses: {
      "Diurese": { min: 0, max: 2000 },
      "Drenos": { min: 0, max: 5000 },
      "SNG/SNE": { min: 0, max: 999 },
      "HD": { min: 0, max: 9999 }
    },
    vitals: {
      "Temp (ºC)": { min: 20, max: 45 },
      "FC (bpm)": { min: 0, max: 350 },
      "FR (irpm)": { min: 0, max: 99 },
      "PAS": { min: 0, max: 300 },
      "PAD": { min: 0, max: 200 },
      "PAM": { min: 0, max: 250 },
      "SpO2 (%)": { min: 0, max: 100 },
      "HGT (mg/dL)": { min: 0, max: 600 }
    }
  };

  const getLimits = (category, item) => {
    if (!LIMITS[category]) return null;
    const matchedKey = Object.keys(LIMITS[category]).find(k => item.includes(k));
    return matchedKey ? LIMITS[category][matchedKey] : null;
  };

  const handleValidatedChange = (hour, category, item, e) => {
    let val = e.target.value;
    
    if (val === "") {
      updateBH(hour, category, item, val);
      return;
    }
    
    const limits = getLimits(category, item);

    if (limits) {
      if (!/^-?\d*[.,]?\d*$/.test(val)) return;
      const numVal = parseFloat(val.replace(',', '.'));
      if (!isNaN(numVal) && numVal > limits.max) {
        return; 
      }
    }
    updateBH(hour, category, item, val);
  };

  const checkMinLimitOnBlur = (hour, category, item, e) => {
    let val = e.target.value;
    
    // 1. CARIMBO DA AUDITORIA (Sempre roda quando sai da célula)
    handleBlurSave(`BH: Editou ${item} às ${hour}h (${category === 'gains' ? 'Ganho' : category === 'losses' ? 'Perda' : 'Sinal Vital'})`);

    if (val === "") return;
    const numVal = parseFloat(val.replace(',', '.'));
    if (!isNaN(numVal)) {
      const limits = getLimits(category, item);
      if (limits && numVal < limits.min) {
        alert(`ATENÇÃO de SEGURANÇA:\n\nO valor inserido em ${item} é inferior ao mínimo permitido (${limits.min}).\nO dado foi removido para evitar erros no Prontuário.`);
        updateBH(hour, category, item, ""); 
        
        // Se extirpou o valor por segurança, audita essa ação também!
        handleBlurSave(`Segurança BH: O sistema bloqueou um valor irreal (${val}) no campo ${item} às ${hour}h`);
      }
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn print:space-y-2 bh-print-container">
      <div id="print-header" className="hidden print:flex w-full justify-between items-center text-xs font-bold border-b-2 border-black pb-2 mb-1 text-black">
        <span className="flex-1">PACIENTE: {currentPatient.nome?.toUpperCase() || "___________"}</span>
        <span className="w-20 text-center">IDADE: {calculateAge(currentPatient.dataNascimento) || "__"}a</span>
        <span className="w-20 text-center">LEITO: {currentPatient.leito}</span>
        <span className="w-24 text-right">DATA: {formatDateDDMM(displayedBH.date || getManausDateStr())}</span>
      </div>

      {viewingPreviousBH && (
        <div className="bg-orange-100 border border-orange-300 text-orange-800 p-3 rounded-xl mb-4 text-sm font-bold flex items-center justify-center gap-2 print:hidden">
          <AlertCircle size={18} />
          VOCÊ ESTÁ VISUALIZANDO O BALANÇO HÍDRICO DO DIA ANTERIOR (SOMENTE LEITURA).
        </div>
      )}

      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-3 mb-2 print:hidden">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Droplets className="text-blue-500" /> Balanço Hídrico {viewingPreviousBH ? "(DIA ANTERIOR)" : "24h"}
        </h3>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={() => {
              if (currentPatient.bh_previous) {
                const isGoingToPrevious = !viewingPreviousBH;
                setViewingPreviousBH(isGoingToPrevious);
                handleBlurSave(`BH: Acessou visualização do Balanço ${isGoingToPrevious ? 'Anterior' : 'Atual'}`);
              }
            }}
            disabled={!currentPatient.bh_previous}
            className={`flex-1 md:flex-none px-3 py-2 md:py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
              !currentPatient.bh_previous ? "bg-gray-100 text-gray-400 cursor-not-allowed" : viewingPreviousBH ? "bg-orange-500 text-white hover:bg-orange-600" : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
            }`}
            title={!currentPatient.bh_previous ? "Ainda não foi fechado nenhum dia para este leito." : "Ver balanço do dia anterior"}
          >
            <Clock size={14} /> {viewingPreviousBH ? "Voltar ao Atual" : "Dia Anterior"}
          </button>
          <button onClick={handlePrintBH} className="flex-1 md:flex-none bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 md:py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
            <Printer size={14} /> Imprimir
          </button>
          {!viewingPreviousBH && canCloseDay && (
            <button
              onClick={handleNextDayBH} // Essa função tem o 'save()' na origem, não se preocupe
              disabled={!isEditable}
              className={`w-full md:w-auto bg-blue-600 text-white px-3 py-2 md:py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 mt-1 md:mt-0 ${
                !isEditable ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700"
              }`}
            >
              <RotateCcw size={14} /> Fechar Dia
            </button>
          )}
        </div>
      </div>

      <fieldset disabled={isBHReadOnly} className="min-w-0 border-0 p-0 m-0 space-y-4">
        <div className="flex items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl print:hidden">
          <div className="flex items-center gap-1 md:gap-2">
            <Scale size={16} className="text-slate-400 hidden sm:block" />
            <span className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Peso (kg):</span>
            <input 
              type="text" 
              value={currentPatient.nutri?.peso} 
              disabled 
              className="w-14 md:w-20 p-1 border rounded text-center text-[10px] md:text-sm font-bold bg-gray-100 text-gray-500" 
              placeholder={currentPatient.nutri?.peso || "---"} 
            />
          </div>
          <div className="flex items-center text-[10px] md:text-xs font-bold text-slate-500 whitespace-nowrap flex-shrink-0">
            PI Total: 
            <input 
              type="text" 
              value={displayedBH.insensibleLoss || ""} 
              onChange={(e) => updateNested("bh", "insensibleLoss", e.target.value)} 
              onBlur={() => handleBlurSave("BH: Alterou manualmente a Perda Insensível (PI)")}
              className="w-12 md:w-16 p-1 border rounded text-center ml-1 md:ml-2 bg-white text-slate-800" 
            /> ml
          </div>
        </div>

        <div>
          <div className="overflow-x-auto border rounded-xl print:overflow-visible print:border-none print:w-full">
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr className="bg-blue-600 text-white print:bg-gray-300 print:text-black">
                  <th className="p-2 text-left min-w-[120px] sticky left-0 z-10 bg-blue-600 print:bg-gray-300 print:p-1">ITEM</th>
                  {BH_HOURS.map((h) => <th key={h} className="p-1 min-w-[25px] border-l border-blue-500 print:border-black">{h.split(":")[0]}</th>)}
                  <th className="p-2 min-w-[40px] bg-blue-700 print:bg-gray-400 print:border-black print:border-l">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-green-50 print:bg-white">
                  <td colSpan={26} className="text-left p-1 font-bold text-green-700 sticky left-0 bg-green-50 print:bg-white print:text-black border border-black">
                    GANHOS (+)
                  </td>
                </tr>
                {[...BH_GAINS, ...(displayedBH.customGains || [])].map((item) => {
                  let rowTotal = 0;
                  BH_HOURS.forEach((h) => (rowTotal += safeNumber(displayedBH.gains[h]?.[item])));
                  return (
                    <tr key={item} className="hover:bg-slate-200 transition-colors group border-b print:border-black">
                      <td className="p-1 text-left font-medium text-slate-600 sticky left-0 bg-white group-hover:bg-slate-200 transition-colors border-r print:border-black print:text-black">
                        <div className="flex justify-between items-center">
                          <span>{item}</span>
                          {displayedBH.customGains?.includes(item) && isEditable && !viewingPreviousBH && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                if (window.confirm(`Excluir a linha de ganho "${item}"?`)) {
                                  const up = [...patients];
                                  up[activeTab].bh.customGains = up[activeTab].bh.customGains.filter((g) => g !== item);
                                  if (up[activeTab].bh.gains) {
                                    Object.keys(up[activeTab].bh.gains).forEach((hour) => {
                                      if (up[activeTab].bh.gains[hour]) delete up[activeTab].bh.gains[hour][item];
                                    });
                                  }
                                  setPatients(up);
                                  save(up[activeTab], `BH: Excluiu linha customizada de Ganho (${item})`);
                                }
                              }}
                              className="text-slate-400 hover:text-red-500 print:hidden" title="Excluir Ganho"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                      {BH_HOURS.map((h) => (
                        <td key={h} className="p-0 border-r border-slate-100 print:border-black print:overflow-visible">
                          <input
                            type="text"
                            className="w-full h-full text-center outline-none bg-transparent focus:bg-blue-50 p-0.5 print:hidden"
                            value={displayedBH.gains[h]?.[item] || ""}
                            onChange={(e) => handleValidatedChange(h, "gains", item, e)}
                            onBlur={(e) => {
                              checkMinLimitOnBlur(h, "gains", item, e);
                              const val = e.target.value;
                              const newVal = parseFloat(val.replace(',', '.')) || 0;
                              const isNora = item.toLowerCase().includes("nora");
                              const todayStr = getManausDateStr();
                              const modalAlreadyShownToday = currentPatient.sofa_data_technical?.noraModalShown_date === todayStr;
                              const hourIndex = BH_HOURS.indexOf(h);
                              const prevHour = hourIndex > 0 ? BH_HOURS[hourIndex - 1] : null;
                              const prevRate = prevHour ? parseFloat((displayedBH.gains[prevHour]?.[item] || "0").replace(',', '.')) : 0;
                              const isFirstTime = !modalAlreadyShownToday && val && val !== "0";
                              const isSignificantDrop = prevRate > 0 && newVal > 0 && newVal <= (prevRate * 0.5);
                              const isSignificantIncrease = prevRate > 0 && newVal > 0 && newVal >= (prevRate * 1.3);
                              if (isNora && !viewingPreviousBH && (isFirstTime || isSignificantDrop || isSignificantIncrease)) {
                                setCurrentNoraHour(h);
                                setCurrentNoraRate(val);
                                setShowNoraModal(true);
                              }
                            }}
                          />
                          <span className="hidden print:block text-center text-[8px] w-full align-middle">{displayedBH.gains[h]?.[item] || ""}</span>
                        </td>
                      ))}
                      <td className="font-bold text-slate-700 bg-slate-50 print:bg-white print:text-black print:border-black text-[9px]">{rowTotal || ""}</td>
                    </tr>
                  );
                })}
                {isEditable && !viewingPreviousBH && (
                  <tr className="print:hidden">
                    <td colSpan={26} className="text-left sticky left-0 bg-white border-r print:border-black border-b p-1">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          const n = prompt("Nome do novo ganho:");
                          if (n && n.trim()) {
                            const up = [...patients];
                            if (!up[activeTab].bh.customGains) up[activeTab].bh.customGains = [];
                            if (!up[activeTab].bh.customGains.includes(n.trim()) && !BH_GAINS.includes(n.trim())) {
                              up[activeTab].bh.customGains.push(n.trim());
                              setPatients(up);
                              save(up[activeTab], `BH: Adicionou nova linha customizada de Ganho (${n.trim()})`);
                            }
                          }
                        }}
                        className="text-blue-600 hover:text-blue-800 font-bold text-[10px] flex items-center gap-1 w-full p-1" title="Adicionar Linha de Ganho"
                      >
                        <PlusCircle size={14} /> Adicionar Ganho
                      </button>
                    </td>
                  </tr>
                )}
                <tr className="bg-slate-200 text-slate-600 print:hidden text-[10px] font-bold border-y-4 border-white">
                  <th className="p-1 text-left sticky left-0 z-10 bg-slate-200 border-r border-slate-300">HORÁRIO</th>
                  {BH_HOURS.map((h) => <th key={h} className="p-1 min-w-[25px] border-r border-slate-300">{h.split(":")[0]}</th>)}
                  <th className="p-1 min-w-[40px] bg-slate-300">TOTAL</th>
                </tr>

                <tr className="bg-red-50 print:bg-white">
                  <td colSpan={26} className="text-left p-1 font-bold text-red-700 sticky left-0 bg-red-50 print:bg-white print:text-black border border-black">
                    PERDAS (-)
                  </td>
                </tr>
                {[...BH_LOSSES, ...(displayedBH.customLosses || [])].map((item) => {
                  let rowTotal = 0;
                  BH_HOURS.forEach((h) => (rowTotal += safeNumber(displayedBH.losses[h]?.[item])));
                  let displayTotal = rowTotal;
                  if (item === "Diurese (Total Coletado)") {
                    let totalIrrigation = 0;
                    if (displayedBH.irrigation) Object.values(displayedBH.irrigation).forEach((val) => (totalIrrigation += safeNumber(val)));
                    displayTotal = rowTotal - totalIrrigation;
                  }
                  return (
                    <tr key={item} className="hover:bg-slate-200 transition-colors group border-b print:border-black">
                      <td className="p-1 text-left font-medium text-slate-600 sticky left-0 bg-white group-hover:bg-slate-200 transition-colors border-r print:border-black print:text-black">
                        <div className="flex justify-between items-center">
                          <span>{item}</span>
                          {displayedBH.customLosses?.includes(item) && isEditable && !viewingPreviousBH && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                if (window.confirm(`Excluir a linha de perda "${item}"?`)) {
                                  const up = [...patients];
                                  up[activeTab].bh.customLosses = up[activeTab].bh.customLosses.filter((g) => g !== item);
                                  if (up[activeTab].bh.losses) {
                                    Object.keys(up[activeTab].bh.losses).forEach((hour) => {
                                      if (up[activeTab].bh.losses[hour]) delete up[activeTab].bh.losses[hour][item];
                                    });
                                  }
                                  setPatients(up);
                                  save(up[activeTab], `BH: Excluiu linha customizada de Perda (${item})`);
                                }
                              }}
                              className="text-slate-400 hover:text-red-500 print:hidden" title="Excluir Perda"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                      {BH_HOURS.map((h) => (
                        <td key={h} className="p-0 border-r border-slate-100 print:border-black print:overflow-visible">
                          <input 
                            type="text" 
                            className="w-full h-full text-center outline-none bg-transparent focus:bg-blue-50 p-0.5 print:hidden" 
                            value={displayedBH.losses[h]?.[item] || ""} 
                            onChange={(e) => handleValidatedChange(h, "losses", item, e)} 
                            onBlur={(e) => checkMinLimitOnBlur(h, "losses", item, e)} 
                          />
                          <span className="hidden print:block text-center text-[8px] w-full align-middle">{displayedBH.losses[h]?.[item] || ""}</span>
                        </td>
                      ))}
                      <td className="font-bold text-slate-700 bg-slate-50 print:bg-white print:text-black print:border-black text-[9px]">{displayTotal || ""}</td>
                    </tr>
                  );
                })}
                {isEditable && !viewingPreviousBH && (
                  <tr className="print:hidden">
                    <td colSpan={26} className="text-left sticky left-0 bg-white border-r print:border-black border-b p-1">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          const n = prompt("Nome da nova perda:");
                          if (n && n.trim()) {
                            const up = [...patients];
                            if (!up[activeTab].bh.customLosses) up[activeTab].bh.customLosses = [];
                            if (!up[activeTab].bh.customLosses.includes(n.trim()) && !BH_LOSSES.includes(n.trim())) {
                              up[activeTab].bh.customLosses.push(n.trim());
                              setPatients(up);
                              save(up[activeTab], `BH: Adicionou nova linha customizada de Perda (${n.trim()})`);
                            }
                          }
                        }}
                        className="text-red-600 hover:text-red-800 font-bold text-[10px] flex items-center gap-1 w-full p-1" title="Adicionar Linha de Perda"
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
                    <td key={h} className="p-0 border-r border-slate-100 print:border-black print:overflow-visible">
                      <input 
                        type="text" 
                        className="w-full h-full text-center outline-none bg-transparent focus:bg-yellow-50 p-0.5 text-slate-400 print:hidden" 
                        placeholder="Vol" 
                        value={displayedBH.irrigation?.[h] || ""} 
                        onChange={(e) => updateBH(h, "irrigation", null, e.target.value)} 
                        onBlur={() => handleBlurSave(`BH: Editou Irrigação Vesical às ${h}h`)}
                      />
                      <span className="hidden print:block text-center text-[8px] w-full text-black align-middle">{displayedBH.irrigation?.[h] || ""}</span>
                    </td>
                  ))}
                  <td className="font-bold text-slate-700 bg-slate-50 print:bg-white print:text-black print:border-black text-[9px]">
                    {Object.values(displayedBH.irrigation || {}).reduce((a, b) => a + safeNumber(b), 0) || ""}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 print:flex print:justify-between gap-4 p-4 print:p-0 print:pt-2 bg-slate-100 print:bg-white rounded-xl border border-slate-200 print:border-none mt-4 print:mt-1">
            <div className="print:text-center">
              <p className="text-[10px] text-slate-500 print:text-black font-bold uppercase">Total Ganhos</p>
              <p className="text-xl font-bold text-green-600 print:text-black">+{Math.round(bhTotals.totalGains || 0)}</p>
            </div>
            <div className="print:text-center">
              <p className="text-[10px] text-slate-500 print:text-black font-bold uppercase">Total Perdas (+PI)</p>
              <p className="text-xl font-bold text-red-600 print:text-black">-{Math.round((bhTotals.totalLosses || 0) + safeNumber(displayedBH.insensibleLoss))}</p>
            </div>
            <div className="bg-white p-2 print:p-0 rounded-lg border border-slate-300 print:border-none print:text-center">
              <p className="text-[10px] text-slate-500 print:text-black font-bold uppercase">Balanço 24h</p>
              <p className={`text-xl font-bold ${Math.round(bhTotals.dailyBalance || 0) >= 0 ? "text-blue-600 print:text-black" : "text-orange-600 print:text-black"}`}>
                {Math.round(bhTotals.dailyBalance || 0) > 0 ? "+" : ""}
                {Math.round(bhTotals.dailyBalance || 0)}
              </p>
            </div>
            <div className="bg-slate-800 p-2 rounded-lg text-white print:text-black print:bg-white flex flex-col justify-between print:text-center">
              <div className="flex justify-between print:justify-center items-center mb-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase print:text-black">BH Ant.</p>
                <input 
                  type="text" 
                  value={displayedBH.accumulated || ""} 
                  onChange={(e) => updateNested("bh", "accumulated", e.target.value)} 
                  onBlur={() => handleBlurSave("BH: Editou o Saldo do Balanço Anterior (BH Ant.)")}
                  className="w-12 bg-slate-700 text-white text-xs text-center rounded outline-none border border-slate-600 print:hidden focus:ring-1 focus:ring-blue-400 ml-1" 
                />
                <span className="hidden print:inline text-[10px] font-bold ml-1">: {displayedBH.accumulated || 0}</span>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase print:text-black">Total Atual</p>
                <p className="text-xl font-bold">
                  {Math.round(bhTotals.accumulated || 0) > 0 ? "+" : ""}
                  {Math.round(bhTotals.accumulated || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </fieldset>

      <div className="mt-8 print:mt-1">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2 print:hidden"><Activity className="text-red-500" /> Sinais Vitais</h3>
        <fieldset disabled={isBHReadOnly} className="overflow-x-auto border rounded-xl print:border-none print:overflow-visible min-w-0 border-0 p-0 m-0">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="bg-slate-200 print:bg-gray-300 print:text-black">
                <th className="p-2 text-left min-w-[100px] sticky left-0 z-10 bg-slate-200 print:bg-gray-300 print:p-1">PARÂMETRO</th>
                {BH_HOURS.map((h) => <th key={h} className="p-1 min-w-[25px] border-l border-slate-300 print:border-black">{h.split(":")[0]}</th>)}
              </tr>
            </thead>
            <tbody>
              {["Temp (ºC)", "FC (bpm)", "FR (irpm)", "PAS", "PAD", "PAM", "SpO2 (%)", "HGT (mg/dL)", "Insulina"].map((param) => (
                <tr key={param} className="border-b last:border-0 hover:bg-slate-200 transition-colors group print:border-black">
                  <td className="p-2 text-left font-medium sticky left-0 bg-white group-hover:bg-slate-200 transition-colors border-r print:border-black print:text-black">{param}</td>
                  {BH_HOURS.map((h) => {
                    const val = displayedBH.vitals[h]?.[param] || "";
                    const numVal = safeNumber(val);
                    let isRed = false;
                    if (val !== "") {
                      if (param === "Temp (ºC)" && numVal >= 38) isRed = true;
                      if (param === "FC (bpm)" && (numVal > 100 || numVal < 60)) isRed = true;
                      if (param === "PAM" && numVal < 65) isRed = true;
                      if (param === "SpO2 (%)" && numVal < 90) isRed = true;
                      if (param === "HGT (mg/dL)" && (numVal > 180 || numVal < 70)) isRed = true;
                    }
                    return (
                      <td key={h} className="p-0 border-r border-slate-100 print:border-black print:overflow-visible">
                        <input 
                          type="text" 
                          className={`w-full h-full text-center outline-none bg-transparent focus:bg-blue-50 p-0.5 print:hidden ${isRed ? "text-red-600 font-bold" : ""}`} 
                          value={val} 
                          onChange={(e) => handleValidatedChange(h, "vitals", param, e)} 
                          onBlur={(e) => checkMinLimitOnBlur(h, "vitals", param, e)} 
                        />
                        <span className={`hidden print:block text-center text-[8px] w-full align-middle print:text-black ${isRed ? "font-bold" : ""}`}>
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

      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-lg shadow-sm print:hidden mt-6">
        <h4 className="text-sm font-black text-amber-800 flex items-center gap-2 mb-2 uppercase tracking-wide">
          <ShieldAlert size={18} className="text-amber-600" />
          Segurança de Deglutição
        </h4>
        
        <div className="flex flex-col md:flex-row gap-6 mt-3 bg-white p-3 rounded border border-amber-200">
          <div className="flex-1 flex flex-col justify-center">
            <span className="text-[10px] text-amber-600 font-bold uppercase block mb-1">Consistência Alimentar Liberada:</span>
            <span className="text-sm font-black text-slate-800 uppercase">
              {currentPatient.fono?.consistencia || "Aguardando avaliação / Dieta Zero"}
            </span>
          </div>
          
          <div className="flex-1 border-t md:border-t-0 md:border-l border-amber-100 md:pl-6 pt-3 md:pt-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-amber-600 font-bold uppercase block mb-2 w-full">Água Via Oral (VO):</span>
            
            {currentPatient.fono?.toleraAgua === "Sim" || currentPatient.fono?.toleraAgua === true ? (
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded border border-emerald-300">
                  <CheckCircle size={14} /> LIBERADA
                </span>
                {currentPatient.fono?.utensilioAgua && (
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                    Via: {currentPatient.fono.utensilioAgua}
                  </span>
                )}
              </div>
            ) : currentPatient.fono?.toleraAgua === "Não" || currentPatient.fono?.toleraAgua === false ? (
              <span className="inline-flex items-center justify-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-black rounded border border-red-300">
                <X size={14} /> SUSPENSA
              </span>
            ) : (
              <span className="inline-flex items-center justify-center gap-1 px-2 py-1 bg-slate-100 text-slate-500 text-xs font-black rounded border border-slate-300">
                <Clock size={14} /> AGUARDANDO AVALIAÇÃO
              </span>
            )}
          </div>
        </div>
      </div>

      <fieldset disabled={!isEditable} className="mt-6 print:hidden min-w-0 border-0 p-0 m-0">
        <div className="p-4 bg-white border rounded-xl shadow-sm">
          <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><Edit3 size={16} className="text-slate-400" /> Anotações da Equipe Técnica</h4>
          <textarea 
            className="w-full p-3 border rounded-lg h-32 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-slate-50 focus:bg-white transition-colors" 
            placeholder="Registros do plantão, intercorrências, observações gerais..." 
            value={currentPatient.enfermagem?.anotacoes_tech || ""} 
            onChange={(e) => updateNested("enfermagem", "anotacoes_tech", e.target.value)} 
            onBlur={() => handleBlurSave("Equipe Técnica: Editou as Anotações Gerais")}
          />
        </div>
      </fieldset>
    </div>
  );
};

export default TechDashboard;