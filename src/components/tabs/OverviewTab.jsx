import React from 'react';
import { Activity, ChevronDown, ChevronRight, Wind, Utensils, Brain, HeartPulse, Droplets, Clock, Table as TableIcon, Edit3 } from 'lucide-react';
import { BH_HOURS } from '../../constants/clinicalLists'; 

const OverviewTab = ({
  viewMode,
  isOverviewEditable,
  currentPatient,
  handleUnlockSAPS3,
  getMissingSAPS3,
  handleLockSAPS3,
  getDaysD1,
  getTempoVMText,
  historyOpen,
  setHistoryOpen,
  calculateEvacDays,
  calculateGlasgowTotal,
  renderValue,
  calculateDiurese12hMlKgH,
  calculateCreatinineClearance,
  setShowATBHistoryModal,
  getDaysD0,
  setShowHistoryModal,
  formatDateDDMM,
  updateLab,
  handleBlurSave,
  userProfile,
  updateP
}) => {
  // Se o ModuloUTI não mandar o viewMode, ou não for overview, esconde.
  if (viewMode && viewMode !== "overview") return null;
  if (!currentPatient) return null;

  return (
    <div className="space-y-6 animate-fadeIn text-left">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
          <Activity className="text-blue-500" /> Resumo do Plantão
        </h3>
      </div>

      <fieldset disabled={!isOverviewEditable} className="min-w-0 border-0 p-0 m-0">
        {/* CARTÃO SAPS 3 */}
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 mb-4 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-xs font-bold text-purple-800 uppercase flex items-center gap-2">
              <Activity size={14} /> Índice de Gravidade (SAPS 3)
            </h4>
            {currentPatient.saps3?.isLocked && isOverviewEditable && (
              <button onClick={(e) => { e.preventDefault(); handleUnlockSAPS3(); }} className="text-[10px] bg-purple-200 text-purple-800 px-2 py-1 rounded hover:bg-purple-300 font-bold transition-colors">
                Destravar
              </button>
            )}
          </div>

          {currentPatient.saps3?.isLocked ? (
            <div className="flex gap-4 items-center">
              <div className="bg-white px-4 py-2 rounded-lg border border-purple-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Pontuação</span>
                <span className="text-xl font-bold text-purple-700">{currentPatient.saps3.lockedScore}</span>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg border border-red-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Mortalidade Esperada</span>
                <span className="text-xl font-bold text-red-600">{currentPatient.saps3.lockedProb}%</span>
              </div>
            </div>
          ) : (
            <div className="bg-white p-3 rounded-lg border border-purple-200">
              {(() => {
                const missing = typeof getMissingSAPS3 === 'function' ? getMissingSAPS3(currentPatient) : [];
                const isReady = missing.length === 0;
                return (
                  <div className="flex flex-col gap-2">
                    {!isReady ? (
                      <>
                        <p className="text-xs font-bold text-slate-600">Aguardando preenchimento nas primeiras 24h:</p>
                        <p className="text-[10px] text-red-600 font-bold bg-red-50 p-2 rounded border border-red-100">Faltam: {missing.join(", ")}</p>
                      </>
                    ) : (
                      <p className="text-xs font-bold text-green-600 bg-green-50 p-2 rounded border border-green-100 text-center">Todos os dados clínicos de admissão presentes!</p>
                    )}
                    <button disabled={!isReady || !isOverviewEditable} onClick={(e) => { e.preventDefault(); handleLockSAPS3(); }} className={`py-2 rounded-lg text-xs font-bold text-white transition-colors ${!isReady || !isOverviewEditable ? "bg-slate-300 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700 shadow-md"}`}>
                      {isReady ? "Calcular e Salvar SAPS 3 Definitivo" : "Aguardando Requisitos..."}
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div><span className="text-xs font-bold text-gray-400 block uppercase">Diagnóstico Principal</span> <span className="font-medium text-slate-700">{currentPatient.diagnostico || "-"}</span></div>
          <div><span className="text-xs font-bold text-gray-400 block uppercase">Procedência</span> <span className="font-medium text-slate-700">{currentPatient.procedencia || "-"}</span></div>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 mt-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Comorbidades / HPP</h4>
          <p className="text-sm">{currentPatient.comorbidades || "Nenhuma registrada."}</p>
          <div className="flex gap-4 mt-2 text-xs font-bold text-slate-500 border-t pt-2 border-slate-200">
            <span>Internação: {typeof getDaysD1 === 'function' ? getDaysD1(currentPatient.dataInternacao) : "-"}</span>
            <span className="text-cyan-700">Tempo de VM: {typeof getTempoVMText === 'function' ? getTempoVMText(currentPatient) : "-"}</span>
          </div>
        </div>
      </fieldset>

      <div className="bg-white p-4 rounded-xl border border-slate-200 mt-4">
        <button onClick={(e) => { e.preventDefault(); setHistoryOpen(!historyOpen); }} className="flex items-center gap-2 font-bold text-slate-700 w-full text-left">
          {historyOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />} História Clínica
        </button>
        {historyOpen && (
          <div className="mt-3 p-3 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-700 whitespace-pre-wrap min-h-[60px] text-left">
            {currentPatient.historiaClinica || "Nenhuma história clínica registrada."}
          </div>
        )}
      </div>

      {/* LINHA 1: VENTILAÇÃO, NUTRIÇÃO E ELIMINAÇÕES */}
      <div className="grid md:grid-cols-3 gap-4 mt-4">
        <div className="p-4 bg-cyan-50 border border-cyan-100 rounded-xl">
          <h4 className="font-bold text-cyan-800 mb-2 flex items-center gap-2"><Wind size={16} /> Ventilação</h4>
          <p className="text-sm">Suporte: <b>{currentPatient.physio?.suporte || "Não informado"}</b></p>
          {currentPatient.physio?.suporte === "VM" && (
            <div className="mt-1 text-xs text-cyan-700">
              <span className="mr-2">Modo: <b>{currentPatient.physio?.parametro || "-"}</b></span>
              <span>PEEP: <b>{currentPatient.physio?.peep || "-"}</b></span>
            </div>
          )}
          {currentPatient.physio?.fiO2 && <p className="text-xs text-cyan-600 mt-1">FiO2: {currentPatient.physio.fiO2}%</p>}
        </div>

        <div className="p-4 bg-lime-50 border border-lime-100 rounded-xl">
          <h4 className="font-bold text-lime-800 mb-2 flex items-center gap-2"><Utensils size={16} /> Nutrição</h4>
          <p className="text-sm">Via: <b>{currentPatient.nutri?.via || "Zero"}</b></p>
          {currentPatient.nutri?.via === "Oral" && <p className="text-xs text-lime-600 mt-1">Consistência: <b>{currentPatient.fono?.consistencia || "-"}</b></p>}
          {(currentPatient.nutri?.via === "Enteral" || currentPatient.nutri?.via === "Parenteral") && (
            <div className="text-xs text-lime-600 mt-1">
              <p>Fórmula: <b>{currentPatient.nutri?.tipoDieta || "-"}</b></p>
              <p>Vazão: <b>{currentPatient.nutri?.vazao || "-"} ml/h</b></p>
            </div>
          )}
          {currentPatient.nutri?.via === "Mista" && (
            <div className="text-xs text-lime-600 mt-1">
              <p>Fórmula (SNE): <b>{currentPatient.nutri?.tipoDieta || "-"}</b></p>
              <p>Vazão: <b>{currentPatient.nutri?.vazao || "-"} ml/h</b></p>
              <p className="mt-1">VO (Consistência): <b>{currentPatient.fono?.consistencia || "-"}</b></p>
            </div>
          )}
          {currentPatient.nutri?.caracteristicasDieta?.length > 0 && (
            <div className="mt-1 pt-1 border-t border-lime-200">
              <p className="text-[11px] text-lime-700 font-medium">Caract.: {currentPatient.nutri.caracteristicasDieta.join(", ")}</p>
            </div>
          )}
        </div>

        {(() => {
          const checkLossBH = (bh, lossName) => {
            if (!bh || !bh.losses) return false;
            for (let h of BH_HOURS || []) {
              const val = String(bh.losses[h]?.[lossName] || "").trim().toLowerCase();
              const numVal = parseFloat(val);
              if (["sim", "s"].includes(val) || val.includes("+") || (!isNaN(numVal) && numVal > 0)) return true;
            }
            return false;
          };

          const diarreiaHoje = checkLossBH(currentPatient.bh, "Diarreia");
          const diarreiaOntem = checkLossBH(currentPatient.bh_previous, "Diarreia");
          let diarreiaText = "";
          if (diarreiaHoje && diarreiaOntem) diarreiaText = "Hoje e Ontem";
          else if (diarreiaHoje) diarreiaText = "Hoje";
          else if (diarreiaOntem) diarreiaText = "Ontem";

          const vomitoHoje = checkLossBH(currentPatient.bh, "Vômitos");
          const vomitoOntem = checkLossBH(currentPatient.bh_previous, "Vômitos");
          let vomitoText = "";
          if (vomitoHoje && vomitoOntem) vomitoText = "Hoje e Ontem";
          else if (vomitoHoje) vomitoText = "Hoje";
          else if (vomitoOntem) vomitoText = "Ontem";

          const evacResult = typeof calculateEvacDays === 'function' ? calculateEvacDays(currentPatient.gastro?.dataUltimaEvacuacao) : "-";
          const diasSemEvacuar = parseInt(String(evacResult).replace(/\D/g, ""), 10);
          const isConstipado = !isNaN(diasSemEvacuar) && diasSemEvacuar > 2 && !String(evacResult).toLowerCase().includes("hoje") && !String(evacResult).toLowerCase().includes("ontem");

          return (
            <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
              <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2"><Activity size={16} /> Eliminações</h4>
              <p className="text-sm">Últ. Evacuação: <b className={isConstipado ? "text-red-600 font-black bg-red-100 px-1.5 py-0.5 rounded border border-red-300" : "text-slate-800"}>{evacResult}</b></p>
              {diarreiaText && <p className="text-sm mt-1">Diarreia: <b className="text-red-600">{diarreiaText}</b></p>}
              {vomitoText && <p className="text-sm mt-1">Vômitos: <b className="text-red-600">{vomitoText}</b></p>}
            </div>
          );
        })()}
      </div>

      {/* LINHA 2: NEUROLÓGICO, CARDIO E RENAL */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
          <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2"><Brain size={14} /> Neurológico</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p>Glasgow: <b>{currentPatient.neuro?.glasgowAO && typeof calculateGlasgowTotal === 'function' ? calculateGlasgowTotal(currentPatient) : "-"}</b></p>
            <p>RASS: <b>{currentPatient.neuro?.rass || "-"}</b></p>
          </div>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
          <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2"><HeartPulse size={14} /> Cardiovascular</h4>
          <div className="text-sm">
            <p>DVA: {currentPatient.cardio?.dva ? "Sim" : "Não"}</p>
            <p>Drogas: <span className={currentPatient.cardio?.dva && currentPatient.cardio?.drogasDVA?.length > 0 ? "text-red-600 font-bold" : ""}>{typeof renderValue === 'function' ? renderValue(currentPatient.cardio?.drogasDVA) : "-"}</span></p>
          </div>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
          <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2"><Droplets size={14} /> Renal / BH</h4>
          <div className="flex flex-col gap-2 text-sm">
            <p>Diurese (Últ. 12h): <b>{typeof calculateDiurese12hMlKgH === 'function' ? calculateDiurese12hMlKgH(currentPatient) : "-"}</b> ml/kg/h</p>
            <p>Clearance Cr: <b>{typeof calculateCreatinineClearance === 'function' ? calculateCreatinineClearance(currentPatient) : "-"}</b> {typeof calculateCreatinineClearance === 'function' && calculateCreatinineClearance(currentPatient) !== "Falta Sexo" && calculateCreatinineClearance(currentPatient) !== "---" ? "ml/min" : ""}</p>
          </div>
        </div>
      </div>

      {/* ANTIBIÓTICOS */}
      <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-xs font-bold text-orange-600 uppercase">Antibióticos Ativos</h4>
          <button onClick={() => setShowATBHistoryModal(true)} className="text-[10px] bg-orange-200 text-orange-800 px-2 py-1 rounded hover:bg-orange-300 font-bold flex items-center gap-1 transition-colors">
            <Clock size={12} /> ATBs Usados
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(currentPatient.antibiotics || []).map((a, i) => a.name && (
            <span key={i} className="text-xs font-bold bg-white border border-orange-200 px-2 py-1 rounded-lg text-orange-700">{a.name} ({typeof getDaysD0 === 'function' ? getDaysD0(a.date) : ""})</span>
          ))}
        </div>
      </div>

      {/* LABORATÓRIO E ANOTAÇÕES */}
      <div className="pt-4 border-t space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-blue-800">Laboratório</h3>
          <button onClick={() => setShowHistoryModal(true)} className="bg-gray-200 text-gray-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
            <TableIcon size={14} /> Visualizar Histórico
          </button>
        </div>
        <fieldset disabled={!isOverviewEditable} className="min-w-0 border-0 p-0 m-0">
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="font-bold text-left pt-6">EXAME</div>
            <div className="bg-slate-100 p-1 rounded font-bold text-slate-500">{typeof formatDateDDMM === 'function' ? formatDateDDMM(currentPatient.labs?.dayBefore?.date) : "-"}</div>
            <div className="bg-slate-100 p-1 rounded font-bold text-slate-500">{typeof formatDateDDMM === 'function' ? formatDateDDMM(currentPatient.labs?.yesterday?.date) : "-"}</div>
            <div className="bg-blue-100 p-1 rounded font-bold text-blue-600">{typeof formatDateDDMM === 'function' ? formatDateDDMM(currentPatient.labs?.today?.date) : "-"}</div>
            
            {["Leucócitos", "Ureia", "Creatinina", "Na (Sódio)", "K (Potássio)"].map((ex) => {
              const key = ex === "Leucócitos" ? "leuco" : ex === "Ureia" ? "ureia" : ex === "Creatinina" ? "creat" : ex.includes("Na") ? "na" : "k";
              return (
                <React.Fragment key={ex}>
                  <div className="text-left py-2 font-medium">{ex}</div>
                  <div className="bg-slate-50 flex items-center justify-center border rounded">{currentPatient.labs?.dayBefore?.[key] || "-"}</div>
                  <div className="bg-slate-50 flex items-center justify-center border rounded">{currentPatient.labs?.yesterday?.[key] || "-"}</div>
                  
                  <input 
                    className="text-center border-2 border-blue-100 rounded focus:border-blue-500 outline-none" 
                    value={currentPatient.labs?.today?.[key] || ""} 
                    onChange={(e) => updateLab("today", key, e.target.value)} 
                    onBlur={() => typeof handleBlurSave === 'function' ? handleBlurSave(`Laboratório: Editou ${ex}`) : null} 
                  />
                </React.Fragment>
              );
            })}
          </div>
        </fieldset>
        
        <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-xl">
          <div className="flex justify-between mb-2">
            <h4 className="text-xs font-bold text-yellow-600 uppercase">Anotações / Pendências</h4>
            {userProfile?.role === "Médico" && <Edit3 size={12} className="text-yellow-600" />}
          </div>
          {userProfile?.role === "Médico" ? (
            <textarea 
              value={currentPatient.anotacoes || ""} 
              onChange={(e) => updateP("anotacoes", e.target.value)} 
              onBlur={() => typeof handleBlurSave === 'function' ? handleBlurSave("Visita Multi: Editou Anotações / Pendências") : null} 
              className="w-full bg-transparent border-0 outline-none text-sm text-slate-700 resize-y min-h-[100px] focus:ring-0" 
              placeholder="Digite aqui..." 
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap min-h-[50px] text-left">{currentPatient.anotacoes || "Sem pendências."}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;