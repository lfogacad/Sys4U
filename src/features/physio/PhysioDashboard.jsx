import React from 'react';
import { UserPlus, Calendar, X, Wind, Activity, Move, FileText, Shield, ClipboardCheck, Target, Printer, PlusCircle } from 'lucide-react';
import { SUPORTE_RESP_OPTS, MODOS_VM, ASPECTO_SECRECAO, COLORACAO_SECRECAO, QTD_SECRECAO, MOBILIZACAO, ICU_MOBILITY_SCALE, GASOMETRIA_PARAMS } from '../../constants/clinicalLists';
import { formatDateDDMM } from '../../utils/core';

const PhysioDashboard = ({
  currentPatient,
  isEditable,
  uniqueGasoCols,
  patients,
  activeTab,
  setPatients,
  save,
  handlePhysioAdmission,
  clearDate,
  updateP,
  updateNested,
  handleBlurSave,
  setShowVmFlowsheet,
  handleSuporteChange,
  toggleArrayItem,
  calculateExchangeDate,
  isDeviceExpired,
  handlePrintGasometria,
  handleGeneratePhysioEvo,
  getTempoVMText,
  isOverviewEditable
}) => {

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

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* === BOTÃO DE ADMISSÃO FISIO === */}
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

      <fieldset
        disabled={!isEditable}
        className="space-y-6 min-w-0 border-0 p-0 m-0"
      >
        {/* DATAS DE VIA AÉREA */}
        <div className="grid md:grid-cols-4 gap-4 bg-cyan-50 p-4 rounded-xl border border-cyan-100">
          <div>
            <label className="text-xs font-bold text-cyan-700 flex justify-between">
              Data Intubação{" "}
              <button onClick={(e) => { e.preventDefault(); clearDate("dataIntubacao"); }} className={`${!isEditable ? "hidden" : ""}`}>
                <X size={12} />
              </button>
            </label>
            <input 
              type="date" 
              className="w-full p-2 border rounded bg-white" 
              value={currentPatient.dataIntubacao || ""} 
              onChange={(e) => updateP("dataIntubacao", e.target.value)} 
              onBlur={() => handleBlurSave("Fisioterapia: Editou Data Intubação")}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-cyan-700 flex justify-between">
              Data Extubação{" "}
              <button onClick={(e) => { e.preventDefault(); clearDate("dataExtubacao"); }} className={`${!isEditable ? "hidden" : ""}`}>
                <X size={12} />
              </button>
            </label>
            <input 
              type="date" 
              className="w-full p-2 border rounded bg-white" 
              value={currentPatient.dataExtubacao || ""} 
              onChange={(e) => updateP("dataExtubacao", e.target.value)} 
              onBlur={() => handleBlurSave("Fisioterapia: Editou Data Extubação")}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-cyan-700 flex justify-between">
              Data TQT{" "}
              <button onClick={(e) => { e.preventDefault(); clearDate("dataTQT"); }} className={`${!isEditable ? "hidden" : ""}`}>
                <X size={12} />
              </button>
            </label>
            <input 
              type="date" 
              className="w-full p-2 border rounded bg-white" 
              value={currentPatient.dataTQT || ""} 
              onChange={(e) => updateP("dataTQT", e.target.value)} 
              onBlur={() => handleBlurSave("Fisioterapia: Editou Data TQT")}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-cyan-700 flex justify-between">
              Data Decanulação{" "}
              <button onClick={(e) => { e.preventDefault(); clearDate("dataDecanulacao"); }} className={`${!isEditable ? "hidden" : ""}`}>
                <X size={12} />
              </button>
            </label>
            <input 
              type="date" 
              className="w-full p-2 border rounded bg-white" 
              value={currentPatient.dataDecanulacao || ""} 
              onChange={(e) => updateP("dataDecanulacao", e.target.value)} 
              onBlur={() => handleBlurSave("Fisioterapia: Editou Data Decanulação")}
            />
          </div>
        </div>

        {/* ANTROPOMETRIA */}
        <div className="grid md:grid-cols-2 gap-4 bg-lime-50/40 p-4 rounded-xl border border-lime-100 mb-6">
          <div>
            <label className="text-xs font-bold text-lime-700">Altura (m/cm)</label>
            <input 
              type="number" step="0.01" 
              className="w-full p-2 border rounded bg-white outline-none focus:ring-2 focus:ring-lime-300" 
              value={currentPatient.nutri?.altura || ""} 
              onChange={(e) => {
                const val = e.target.value;
                updateNested("nutri", "altura", val);
                
                // MÁGICA DO CÁLCULO DE PESO PREDITO (ARDSNet)
                if (val) {
                  let h = parseFloat(val.replace(',', '.'));
                  if (h > 0) {
                    // Se o usuário digitou em metros (ex: 1.75), converte para cm (175)
                    if (h < 3) h = h * 100; 
                    
                    // Identifica o sexo do paciente (M ou F)
                    const sexo = currentPatient.sexo?.charAt(0).toUpperCase(); 
                    let predito = 0;
                    
                    if (sexo === 'M') {
                      predito = 50 + 0.91 * (h - 152.4);
                    } else if (sexo === 'F') {
                      predito = 45.5 + 0.91 * (h - 152.4);
                    }
                    
                    // Se conseguiu calcular, já atualiza o campo ao lado automaticamente
                    if (predito > 0) {
                      updateNested("nutri", "pesoPredito", predito.toFixed(1));
                    }
                  }
                }
              }} 
              onBlur={() => handleBlurSave("Fisioterapia: Editou Altura e calculou Peso Predito")}
            />
            {!currentPatient.sexo && (
               <p className="text-[9px] text-red-500 mt-1 font-bold">*Preencha o Sexo no cadastro para o cálculo automático.</p>
            )}
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
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                  idade--;
                }
                const pO2Ideal = Math.round(109 - (0.43 * idade));
                
                return (
                  <span 
                    className="ml-2 px-2 py-0.5 bg-cyan-100/80 text-cyan-800 text-[10px] font-black tracking-wide rounded-full border border-cyan-300 shadow-sm cursor-help" 
                    title={`Calculado para ${idade} anos | Fórmula (Supino): 109 - (0.43 x Idade)`}
                  >
                    PaO2 Ideal: {pO2Ideal}
                  </span>
                );
              })()}
            </h4>
            <div className="flex flex-row items-center gap-3 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs w-full md:w-auto">
              <div className="flex flex-col flex-1">
                <label className="text-[10px] md:text-xs font-semibold text-gray-700 mb-1 leading-tight truncate" title="Dias Prévios (Reintubação)">
                  Dias Prévios:
                </label>
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
                <label className="text-[10px] md:text-xs font-semibold text-gray-700 mb-1 leading-tight truncate">
                  Tempo Total:
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

          {currentPatient.physio?.suporte === "VM" && (
            <button onClick={() => setShowVmFlowsheet(true)} className="w-full mt-3 mb-4 p-2 bg-slate-800 text-white font-bold rounded-lg shadow flex justify-center items-center gap-2 hover:bg-slate-700 transition-colors uppercase text-xs">
              <Wind size={16} className="text-cyan-400"/> Abrir Mapa de Ventilação Mecânica
            </button>
          )}

          <select 
            className="w-full p-2 border rounded mb-4 font-bold" 
            value={currentPatient.physio?.suporte || ""} 
            onChange={(e) => handleSuporteChange(e.target.value)}
            onBlur={() => handleBlurSave("Fisioterapia: Alterou Suporte Ventilatório")}
          >
            <option value="">Selecione o suporte...</option>
            {SUPORTE_RESP_OPTS.map((o) => <option key={o}>{o}</option>)}
          </select>

          {/* PARÂMETROS CONDICIONAIS */}
          {(currentPatient.physio?.suporte === "Cateter Nasal" || currentPatient.physio?.suporte === "Máscara não reinalante") && (
            <div className="mb-2">
              <label className="text-xs font-bold">Fluxo (L/min)</label>
              <input 
                type="number" 
                className="w-full p-2 border rounded" 
                placeholder="L/min" 
                value={currentPatient.physio?.parametro || ""} 
                onChange={(e) => updateNested("physio", "parametro", e.target.value)} 
                onBlur={() => handleBlurSave("Fisioterapia: Editou Fluxo de O2")}
              />
            </div>
          )}
          {currentPatient.physio?.suporte === "Venturi" && (
            <div className="mb-2">
              <label className="text-xs font-bold">Porcentagem (%)</label>
              <input 
                type="number" 
                className="w-full p-2 border rounded" 
                placeholder="%" 
                value={currentPatient.physio?.fiO2 || ""} 
                onChange={(e) => updateNested("physio", "fiO2", e.target.value)} 
                onBlur={() => handleBlurSave("Fisioterapia: Editou FiO2 Venturi")}
              />
            </div>
          )}
          {currentPatient.physio?.suporte === "Macronebulização por TQT" && (
            <div className="mb-2">
              <label className="text-xs font-bold text-cyan-800">Fluxo (L/min) / FiO2 (%)</label>
              <input 
                type="text" 
                className="w-full p-2 border rounded" 
                placeholder="Ex: 10 L/min - 40%" 
                value={currentPatient.physio?.parametro || ""} 
                onChange={(e) => updateNested("physio", "parametro", e.target.value)} 
                onBlur={() => handleBlurSave("Fisioterapia: Editou Parâmetros TQT")}
              />
            </div>
          )}
          {currentPatient.physio?.suporte === "VNI" && (
            <div className="grid grid-cols-2 gap-4 mb-2">
              <div>
                <label className="text-xs font-bold">Modo (CPAP/BIPAP)</label>
                <select 
                  className="w-full p-2 border rounded" 
                  value={currentPatient.physio?.parametro || ""} 
                  onChange={(e) => updateNested("physio", "parametro", e.target.value)}
                  onBlur={() => handleBlurSave("Fisioterapia: Alterou Modo VNI")}
                >
                  <option value="CPAP">CPAP</option>
                  <option value="BIPAP">BIPAP</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold">FiO2 (%)</label>
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
          {currentPatient.physio?.suporte === "VM" && (
            <div className="animate-fadeIn">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-700 uppercase">Modo</label>
                  <select 
                    className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-cyan-200 text-xs" 
                    value={currentPatient.physio?.parametro || ""} 
                    onChange={(e) => updateNested("physio", "parametro", e.target.value)}
                    onBlur={() => handleBlurSave("Fisioterapia: Alterou Modo VM")}
                  >
                    <option value="">...</option>
                    {MODOS_VM && MODOS_VM.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                {currentPatient.physio?.parametro === "VCV" ? (
                  <div className="animate-fadeIn">
                    <label className="text-[10px] font-bold text-blue-700 uppercase">Vt (ml)</label>
                    <input 
                      type="number" 
                      className="w-full p-2 border border-blue-200 rounded bg-blue-50/30 outline-none focus:ring-2 focus:ring-blue-400 text-xs font-bold" 
                      value={currentPatient.physio?.volCorrente || ""} 
                      onChange={(e) => updateNested("physio", "volCorrente", e.target.value)} 
                      onBlur={() => handleBlurSave("Fisioterapia: Editou Vol Corrente VM")}
                    />
                  </div>
                ) : currentPatient.physio?.parametro === "PCV" ? (
                  <div className="animate-fadeIn">
                    <label className="text-[10px] font-bold text-emerald-700 uppercase">PC (cmH2O)</label>
                    <input 
                      type="number" 
                      className="w-full p-2 border border-emerald-200 rounded bg-emerald-50/30 outline-none focus:ring-2 focus:ring-emerald-400 text-xs font-bold" 
                      value={currentPatient.physio?.pressaoControlada || ""} 
                      onChange={(e) => updateNested("physio", "pressaoControlada", e.target.value)} 
                      onBlur={() => handleBlurSave("Fisioterapia: Editou Pressão Controlada VM")}
                    />
                  </div>
                ) : currentPatient.physio?.parametro === "PSV" ? (
                  <div className="animate-fadeIn">
                    <label className="text-[10px] font-bold text-purple-700 uppercase">PS (cmH2O)</label>
                    <input 
                      type="number" 
                      className="w-full p-2 border border-purple-200 rounded bg-purple-50/30 outline-none focus:ring-2 focus:ring-purple-400 text-xs font-bold" 
                      value={currentPatient.physio?.pressaoSuporte || ""} 
                      onChange={(e) => updateNested("physio", "pressaoSuporte", e.target.value)} 
                      onBlur={() => handleBlurSave("Fisioterapia: Editou Pressão Suporte VM")}
                    />
                  </div>
                ) : (
                  <div className="opacity-60">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Alvo</label>
                    <input type="text" disabled className="w-full p-2 border border-slate-200 rounded bg-slate-50 text-xs" />
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold text-slate-700 uppercase">PEEP</label>
                  <input 
                    type="number" 
                    className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-cyan-200 text-xs" 
                    value={currentPatient.physio?.peep || ""} 
                    onChange={(e) => updateNested("physio", "peep", e.target.value)} 
                    onBlur={() => handleBlurSave("Fisioterapia: Editou PEEP VM")}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-700 uppercase">FiO2 (%)</label>
                  <input 
                    type="number" 
                    className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-cyan-200 text-xs" 
                    value={currentPatient.physio?.fiO2 || ""} 
                    onChange={(e) => updateNested("physio", "fiO2", e.target.value)} 
                    onBlur={() => handleBlurSave("Fisioterapia: Editou FiO2 VM")}
                  />
                </div>
              </div>

              {currentPatient.nutri?.pesoPredito ? (
                <div className="p-1.5 bg-slate-800 rounded-lg border border-slate-700 flex items-center gap-2 mb-4">
                  <span className="text-[9px] font-black text-cyan-400 uppercase tracking-tighter ml-1">
                    Meta VC (mL/kg):
                  </span>
                  <div className="flex-1 grid grid-cols-5 gap-1">
                    {[4, 5, 6, 7, 8].map((ratio) => (
                      <div key={ratio} className={`flex items-center justify-center gap-1 py-0.5 rounded border ${ratio === 6 ? 'bg-cyan-900/60 border-cyan-500' : 'bg-slate-700/30 border-slate-600'}`}>
                        <span className={`text-[9px] font-bold ${ratio === 6 ? 'text-cyan-300' : 'text-slate-500'}`}>{ratio}</span>
                        <span className={`text-[11px] font-black ${ratio === 6 ? 'text-white' : 'text-slate-200'}`}>
                          {Math.round(currentPatient.nutri.pesoPredito * ratio)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[9px] text-orange-500 font-bold italic mb-4">* Defina Sexo/Altura na Nutrição para ver metas de Vt.</p>
              )}
            </div>
          )}
        </div>

        {/* VIA AÉREA, SECREÇÃO, MOBILIZAÇÃO */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col h-full">
            <h4 className="font-bold text-slate-700 text-xs uppercase mb-4 flex items-center gap-2 shrink-0">
              Via Aérea e Dispositivos
            </h4>
            
            <div className="grid grid-cols-2 gap-3 mb-4 shrink-0">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">TOT/TQT nº</label>
                <input 
                  type="number" step="0.5" placeholder="Ex: 8.0" 
                  className="w-full p-2 border rounded text-xs text-center text-slate-700 outline-none focus:ring-2 focus:ring-cyan-200" 
                  value={currentPatient.physio?.totNumero || ""} 
                  onChange={(e) => updateNested("physio", "totNumero", e.target.value)} 
                  onBlur={() => handleBlurSave("Fisioterapia: Editou TOT/TQT nº")}
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Rima (cm)</label>
                <input 
                  type="number" placeholder="Ex: 22" 
                  className="w-full p-2 border rounded text-xs text-center text-slate-700 outline-none focus:ring-2 focus:ring-cyan-200" 
                  value={currentPatient.physio?.totRima || ""} 
                  onChange={(e) => updateNested("physio", "totRima", e.target.value)} 
                  onBlur={() => handleBlurSave("Fisioterapia: Editou Rima TOT")}
                />
              </div>
              
              <div className="col-span-2 flex flex-col mt-2 items-center">
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block text-center" title="Pressão do Cuff: Manhã / Tarde / Noite">Pressão do Cuff (M | T | N)</label>
                <div className="flex gap-2 justify-center w-[80%] md:w-[60%]">
                  <input 
                    type="number" placeholder="M" title="Manhã" 
                    className="flex-1 min-w-0 p-2 border rounded text-[10px] text-center text-slate-700 outline-none focus:ring-2 focus:ring-cyan-200" 
                    value={currentPatient.physio?.cuffM || ""} 
                    onChange={(e) => {
                      const val = e.target.value;
                      updateNested("physio", "cuffM", val); // Atualiza a tela principal
                      
                      // Sincroniza com a última coluna do Mapa de VM
                      const flowsheet = currentPatient.physio?.vmFlowsheet;
                      if (flowsheet && flowsheet.length > 0) {
                        const updated = [...flowsheet];
                        updated[updated.length - 1] = { ...updated[updated.length - 1], cuffM: val };
                        updateNested("physio", "vmFlowsheet", updated);
                      }
                    }} 
                    onBlur={() => handleBlurSave("Fisioterapia: Editou Cuff (M) e sincronizou com Mapa")}
                  />
                  <input 
                    type="number" placeholder="T" title="Tarde" 
                    className="flex-1 min-w-0 p-2 border rounded text-[10px] text-center text-slate-700 outline-none focus:ring-2 focus:ring-cyan-200" 
                    value={currentPatient.physio?.cuffT || ""} 
                    onChange={(e) => {
                      const val = e.target.value;
                      updateNested("physio", "cuffT", val); // Atualiza a tela principal
                      
                      // Sincroniza com a última coluna do Mapa de VM
                      const flowsheet = currentPatient.physio?.vmFlowsheet;
                      if (flowsheet && flowsheet.length > 0) {
                        const updated = [...flowsheet];
                        updated[updated.length - 1] = { ...updated[updated.length - 1], cuffT: val };
                        updateNested("physio", "vmFlowsheet", updated);
                      }
                    }} 
                    onBlur={() => handleBlurSave("Fisioterapia: Editou Cuff (T) e sincronizou com Mapa")}
                  />
                  <input 
                    type="number" placeholder="N" title="Noite" 
                    className="flex-1 min-w-0 p-2 border rounded text-[10px] text-center text-slate-700 outline-none focus:ring-2 focus:ring-cyan-200" 
                    value={currentPatient.physio?.cuffN || ""} 
                    onChange={(e) => {
                      const val = e.target.value;
                      updateNested("physio", "cuffN", val); // Atualiza a tela principal
                      
                      // Sincroniza com a última coluna do Mapa de VM
                      const flowsheet = currentPatient.physio?.vmFlowsheet;
                      if (flowsheet && flowsheet.length > 0) {
                        const updated = [...flowsheet];
                        updated[updated.length - 1] = { ...updated[updated.length - 1], cuffN: val };
                        updateNested("physio", "vmFlowsheet", updated);
                      }
                    }} 
                    onBlur={() => handleBlurSave("Fisioterapia: Editou Cuff (N) e sincronizou com Mapa")}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 pt-4 border-t border-slate-100">
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold text-slate-700">Filtro HMEF</label>
                  <button onClick={(e) => { e.preventDefault(); clearDate("dataHMEF", "physio"); }} className="text-slate-400 hover:text-red-500"><X size={12} /></button>
                </div>
                <div className="relative w-full">
                  <div className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white flex justify-between items-center text-slate-800 font-bold">
                    <span>{formatShort(currentPatient.physio?.dataHMEF)}</span>
                    <Calendar size={14} className="text-cyan-600" />
                  </div>
                  <input 
                    type="date" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    value={currentPatient.physio?.dataHMEF || ""} 
                    onChange={(e) => updateNested("physio", "dataHMEF", e.target.value)} 
                    onBlur={() => handleBlurSave("Fisioterapia: Editou Data HMEF")}
                  />
                </div>
                <div className="mt-1 text-[10px] font-bold text-center">
                  {currentPatient.physio?.dataHMEF ? (
                     <span className={isDeviceExpired(currentPatient.physio?.dataHMEF, 168) ? "text-red-600" : "text-green-600"}>
                       Trocar: {getTrocaShort(currentPatient.physio?.dataHMEF, 168)}
                     </span>
                  ) : <span className="text-slate-400">Sem data</span>}
                </div>
              </div>

              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold text-slate-700">Traqueia SFA</label>
                  <button onClick={(e) => { e.preventDefault(); clearDate("dataSFA", "physio"); }} className="text-slate-400 hover:text-red-500"><X size={12} /></button>
                </div>
                <div className="relative w-full">
                  <div className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white flex justify-between items-center text-slate-800 font-bold">
                    <span>{formatShort(currentPatient.physio?.dataSFA)}</span>
                    <Calendar size={14} className="text-cyan-600" />
                  </div>
                  <input 
                    type="date" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    value={currentPatient.physio?.dataSFA || ""} 
                    onChange={(e) => updateNested("physio", "dataSFA", e.target.value)} 
                    onBlur={() => handleBlurSave("Fisioterapia: Editou Data SFA")}
                  />
                </div>
                <div className="mt-1 text-[10px] font-bold text-center">
                  {currentPatient.physio?.dataSFA ? (
                     <span className={isDeviceExpired(currentPatient.physio?.dataSFA, 168) ? "text-red-600" : "text-green-600"}>
                       Trocar: {getTrocaShort(currentPatient.physio?.dataSFA, 168)}
                     </span>
                  ) : <span className="text-slate-400">Sem data</span>}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-auto shrink-0">
              <h4 className="font-bold text-slate-700 text-xs uppercase mb-3">Secreção</h4>
              <label className="flex items-center gap-2 mb-3 text-sm font-bold text-slate-600">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500" 
                  checked={currentPatient.physio?.secrecao || false} 
                  onChange={(e) => updateNested("physio", "secrecao", e.target.checked)} 
                  onBlur={() => handleBlurSave("Fisioterapia: Alterou Status Secreção")}
                /> 
                Apresentou Secreção?
              </label>
              {currentPatient.physio?.secrecao && (
                <div className="grid grid-cols-3 gap-2 animate-fadeIn">
                  <select 
                    className="p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-cyan-200" 
                    value={currentPatient.physio?.secrecaoAspecto || ""} 
                    onChange={(e) => updateNested("physio", "secrecaoAspecto", e.target.value)}
                    onBlur={() => handleBlurSave("Fisioterapia: Avaliou Aspecto Secreção")}
                  >
                    <option value="">Aspecto...</option>
                    {ASPECTO_SECRECAO.map((a) => <option key={a}>{a}</option>)}
                  </select>
                  <select 
                    className="p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-cyan-200" 
                    value={currentPatient.physio?.secrecaoColoracao || ""} 
                    onChange={(e) => updateNested("physio", "secrecaoColoracao", e.target.value)}
                    onBlur={() => handleBlurSave("Fisioterapia: Avaliou Coloração Secreção")}
                  >
                    <option value="">Coloração...</option>
                    {COLORACAO_SECRECAO.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <select 
                    className="p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-cyan-200" 
                    value={currentPatient.physio?.secrecaoQtd || ""} 
                    onChange={(e) => updateNested("physio", "secrecaoQtd", e.target.value)}
                    onBlur={() => handleBlurSave("Fisioterapia: Avaliou Qtd Secreção")}
                  >
                    <option value="">Qtd...</option>
                    {QTD_SECRECAO.map((q) => <option key={q}>{q}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border border-cyan-100 rounded-xl bg-cyan-50/30 shadow-sm flex flex-col h-full">
            <h4 className="font-bold text-cyan-800 text-xs uppercase mb-4 flex items-center gap-2 shrink-0">
              <Move size={16} /> Mobilização / Conduta Motora
            </h4>
            <div className="grid grid-cols-2 gap-3 mb-6 flex-1">
              {MOBILIZACAO.map((m) => {
                const mobArray = Array.isArray(currentPatient.physio?.mobilizacao) ? currentPatient.physio.mobilizacao : [];
                return (
                  <label key={m} className="flex items-center gap-2 text-xs font-semibold text-cyan-900 cursor-pointer hover:bg-cyan-100/50 p-1 rounded transition-colors">
                    <input 
                      type="checkbox" 
                      className="w-3.5 h-3.5 text-cyan-600 rounded focus:ring-cyan-500" 
                      checked={mobArray.includes(m)} 
                      onChange={() => toggleArrayItem("physio", "mobilizacao", m)} 
                      onBlur={() => handleBlurSave(`Fisioterapia: Alterou Conduta Motora (${m})`)}
                    /> {m}
                  </label>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-cyan-200 pt-4 mt-auto shrink-0">
              <div>
                <label className="block text-[10px] font-bold text-cyan-700 uppercase mb-1">Escore MRC (0-60)</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-cyan-200 rounded bg-white text-xs text-center font-bold text-cyan-900 outline-none focus:ring-2 focus:ring-cyan-400" 
                  placeholder="Ex: 48, NT" 
                  value={currentPatient.physio?.mrcScore || ""} 
                  onChange={(e) => updateNested("physio", "mrcScore", e.target.value)} 
                  onBlur={() => handleBlurSave("Fisioterapia: Editou Escore MRC")}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-cyan-700 uppercase mb-1">IMS (Escala Mobilidade)</label>
                <select 
                  className="w-full p-2 border border-cyan-200 rounded bg-white text-xs font-bold text-cyan-900 outline-none focus:ring-2 focus:ring-cyan-400" 
                  value={currentPatient.physio?.icuMobilityScale || ""} 
                  onChange={(e) => updateNested("physio", "icuMobilityScale", e.target.value)}
                  onBlur={() => handleBlurSave("Fisioterapia: Avaliou Escala IMS")}
                >
                  <option value="">Selecione...</option>
                  {ICU_MOBILITY_SCALE.map((scale) => <option key={scale} value={scale}>{scale}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* EVOLUÇÃO SISTÊMICA */}
        <div className="w-full mb-6 p-4 border border-slate-200 rounded-xl bg-white shadow-sm">
          <h4 className="font-bold text-slate-700 text-sm uppercase mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Activity size={18} className="text-cyan-600" /> Evolução Sistêmica e Plano Terapêutico
          </h4>
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
                  onBlur={() => handleBlurSave(`Fisioterapia: Evoluiu ${sys.label}`)}
                  placeholder={`Evolução diária - ${sys.label}...`} 
                />
              </div>
            ))}
          </div>

          <div className="space-y-4 border-t border-slate-100 pt-6">
            <div className="bg-red-50 p-4 rounded-lg border border-red-100 shadow-sm">
              <label className="text-xs font-bold text-red-600 uppercase mb-2 block flex items-center gap-1">
                <Shield size={14} /> Intercorrências do Plantão
              </label>
              <textarea 
                className="w-full p-3 border border-red-200 rounded bg-white text-xs text-slate-700 outline-none focus:ring-2 focus:ring-red-300 h-20 resize-y" 
                value={currentPatient.physio?.intercorrencias || ""} 
                onChange={(e) => updateNested("physio", "intercorrencias", e.target.value)} 
                onBlur={() => handleBlurSave("Fisioterapia: Editou Intercorrências")} 
                placeholder="Descreva quedas de saturação, autoextubação, rolhas, instabilidade hemodinâmica nas manobras..." 
              />
            </div>
            <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-100 shadow-sm">
              <label className="text-xs font-bold text-cyan-700 uppercase mb-2 block flex items-center gap-1">
                <ClipboardCheck size={14} /> Condutas Fisioterapêuticas Realizadas
              </label>
              <textarea 
                className="w-full p-3 border border-cyan-200 rounded bg-white text-xs text-slate-700 outline-none focus:ring-2 focus:ring-cyan-300 h-28 resize-y" 
                value={currentPatient.physio?.condutas || currentPatient.physio?.admissao_condutas || ""} 
                onChange={(e) => updateNested("physio", "condutas", e.target.value)} 
                onBlur={() => handleBlurSave("Fisioterapia: Editou Condutas Realizadas")}
              />
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-100 shadow-sm">
              <label className="text-xs font-bold text-green-700 uppercase mb-2 block flex items-center gap-1">
                <Target size={14} /> Plano / Metas para o Próximo Plantão
              </label>
              <textarea 
                className="w-full p-3 border border-green-200 rounded bg-white text-xs text-slate-700 outline-none focus:ring-2 focus:ring-green-300 h-24 resize-y" 
                value={currentPatient.physio?.planoMetas || ""} 
                onChange={(e) => updateNested("physio", "planoMetas", e.target.value)} 
                onBlur={() => handleBlurSave("Fisioterapia: Editou Plano/Metas")}
                placeholder="Ex: Iniciar protocolo de desmame, tentar sedestação à beira leito amanhã de manhã, discutir extubação no round..." 
              />
            </div>
          </div>
        </div>
      </fieldset>

      {/* GASOMETRIA ARTERIAL */}
      <div className="p-4 bg-slate-50 border rounded-xl border-slate-200">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-bold text-slate-700 flex items-center gap-2">
            <Activity size={16} /> Gasometria Arterial
          </h4>
          <button onClick={handlePrintGasometria} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 print:hidden">
            <Printer size={14} /> Imprimir
          </button>
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
                        const n = prompt("Identificação da nova gasometria (ex: 23/02 - 14h):");
                        if (n && n.trim()) {
                          const up = [...patients];
                          if (!up[activeTab].customGasometriaCols) up[activeTab].customGasometriaCols = [];
                          if (!up[activeTab].customGasometriaCols.includes(n.trim())) {
                            up[activeTab].customGasometriaCols.unshift(n.trim());
                            setPatients(up);
                            save(up[activeTab], "Fisioterapia: Adicionou nova coluna de Gasometria");
                          }
                        }
                      }}
                      className="text-blue-600 hover:text-blue-800 w-full h-full flex items-center justify-center p-2 transition-colors"
                      title="Adicionar Gasometria extra"
                    >
                      <PlusCircle size={18} />
                    </button>
                  </th>
                )}
                {uniqueGasoCols.map((col) => (
                  <th key={col} className="p-2 border-l border-slate-300 min-w-[80px]">
                    <div className="flex items-center justify-between gap-1">
                      <span>{col.match(/^\d{4}-\d{2}-\d{2}$/) ? formatDateDDMM(col) : col}</span>
                      {currentPatient.customGasometriaCols?.includes(col) && isEditable && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            if (window.confirm(`Excluir a coluna "${col}"?`)) {
                              const up = [...patients];
                              up[activeTab].customGasometriaCols = up[activeTab].customGasometriaCols.filter((c) => c !== col);
                              if (up[activeTab].gasometriaHistory) delete up[activeTab].gasometriaHistory[col];
                              setPatients(up);
                              save(up[activeTab], `Fisioterapia: Excluiu coluna de Gasometria (${col})`);
                            }
                          }}
                          className="text-slate-400 hover:text-red-500 transition-colors" title="Excluir Coluna"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GASOMETRIA_PARAMS.map((param) => (
                <tr key={param} className="border-b last:border-0 hover:bg-slate-100 bg-white transition-colors">
                  <td className="p-2 text-left font-bold text-slate-600 sticky left-0 bg-white border-r border-slate-200 z-10 shadow-[1px_0_0_0_#e2e8f0]">{param}</td>
                  {isEditable && <td className="bg-slate-50 border-r border-slate-200"></td>}
                  {uniqueGasoCols.map((col) => (
                    <td key={col} className="p-0 border-l border-slate-200">
                      <input
                        type="text"
                        className="w-full h-full text-center outline-none bg-transparent focus:bg-blue-50 p-1.5 transition-colors"
                        value={currentPatient.gasometriaHistory?.[col]?.[param] || ""}
                        
                        // Atualiza na memória usando cópia profunda (previne engasgos)
                        onChange={(e) => {
                          const val = e.target.value;
                          setPatients(prev => {
                            const up = [...prev];
                            const p = JSON.parse(JSON.stringify(up[activeTab]));
                            if (!p.gasometriaHistory) p.gasometriaHistory = {};
                            if (!p.gasometriaHistory[col]) p.gasometriaHistory[col] = {};
                            p.gasometriaHistory[col][param] = val;
                            up[activeTab] = p;
                            return up;
                          });
                        }}
                        
                        // Audita exatamente qual célula foi alterada
                        onBlur={() => handleBlurSave(`Gasometria: Editou ${param} (Ref: ${col})`)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </fieldset>
      </div>

      <div className="mt-8 mb-6 border-t-2 border-slate-200 pt-6">
        <button
          onClick={(e) => {
            e.preventDefault();
            handleGeneratePhysioEvo();
          }}
          className="w-full p-4 bg-gradient-to-r from-cyan-700 to-blue-800 text-white font-black rounded-xl shadow-lg hover:from-cyan-600 hover:to-blue-700 transition-all flex justify-center items-center gap-3 uppercase tracking-wider text-sm"
        >
          <FileText size={20} className="text-cyan-200" /> Gerar Evolução Diária
        </button>
      </div>
    </div>
  );
};

export default PhysioDashboard;