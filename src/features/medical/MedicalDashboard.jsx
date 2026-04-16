import React, { useState } from 'react';
import { AlertCircle, Edit3, X, Sparkles, ClipboardCheck, Loader2, FileText, Activity, ChevronDown, ChevronRight, HeartPulse, Brain, Clock, Pill, CheckCircle } from 'lucide-react';
import { BH_HOURS, OPCOES_DVA, GLASGOW_AO, GLASGOW_RV, GLASGOW_RM, RASS_OPTS, OPCOES_SEDATIVOS } from '../../constants/clinicalLists';
import { getAutoSOFA2, getSOFAMortality, calculateNoraDose, getBestGlasgowForSOFA, calculateGlasgowTotal, formatDateDDMM, getDaysD0 } from '../../utils/core';

const formatarDataBR = (dataISO) => {
  if (!dataISO) return "";
  const partes = dataISO.split("-");
  if (partes.length !== 3) return dataISO;
  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
};

const MedicalDashboard = ({
  currentPatient,
  isEditable,
  patients,
  activeTab,
  setPatients,
  updateNested,
  updateP,
  handleBlurSave,
  clearDate,
  toggleArrayItem,
  aiEvolution,
  setAiEvolution,
  copyToClipboardFallback,
  abrirChecklistEvolucao,
  isGeneratingAI,
  setShowATBHistoryModal,
  clearAntibiotic,
  updateAntibiotic,
  handleEditAdmission
}) => {
  
  // 👇 INJETAMOS O "CÉREBRO" DO BOTÃO AQUI DENTRO:
  const [historyOpen, setHistoryOpen] = useState(false);
  return (
    <fieldset disabled={!isEditable} className="space-y-6 animate-fadeIn min-w-0 border-0 p-0 m-0">
      {/* === DASHBOARD DE GRAVIDADE SOFA-2 (AUTOMATIZADO) === */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-2xl mb-2 border border-white/10 animate-fadeIn relative">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          
          {/* Lado Esquerdo: O Score */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <svg className="w-24 h-24">
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/10" />
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" fill="transparent" 
                        strokeDasharray="251" 
                        strokeDashoffset={251 - (251 * (getAutoSOFA2(currentPatient) / 24))}
                        className={`${getAutoSOFA2(currentPatient) >= 10 ? 'text-red-500' : 'text-blue-400'} transition-all duration-1000`} 
                        strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black leading-none">{getAutoSOFA2(currentPatient)}</span>
                <span className="text-[10px] font-bold opacity-50 uppercase">Pontos</span>
              </div>
            </div>
            
            <div>
              <h3 className="text-xs font-black text-indigo-300 uppercase tracking-widest mb-1">Status SOFA-2</h3>
              <div className={`text-2xl font-black italic ${getAutoSOFA2(currentPatient) >= 10 ? 'text-red-500' : 'text-white'}`}>
                {getAutoSOFA2(currentPatient) >= 10 ? 'CRÍTICO / FALÊNCIA' : 'ESTÁVEL / DISFUNÇÃO'}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs font-medium text-white/60">
                <span>Mortalidade: <span className="text-white font-bold">{getSOFAMortality(getAutoSOFA2(currentPatient))}</span></span>
                <span className="text-white/20">|</span>
                
                <label className="flex items-center gap-1 cursor-pointer" title="Se o paciente for renal crônico ou cirrótico, ajuste o SOFA de base aqui">
                  Basal: 
                  <input 
                    type="number" 
                    min="0" max="24"
                    className="w-10 bg-white/10 border border-white/20 rounded text-center text-white focus:outline-none focus:border-indigo-400 font-bold px-1"
                    value={currentPatient.sofa_data_technical?.baseline_sofa || 0}
                    onChange={(e) => {
                      const novoBasal = e.target.value;
                      const p = currentPatient;
                      if (!p.sofa_data_technical) p.sofa_data_technical = {};
                      p.sofa_data_technical.baseline_sofa = novoBasal;
                      p.sofa_data_technical.reference_sofa_for_sepsis = novoBasal;
                      const up = [...patients];
                      up[activeTab] = p;
                      setPatients(up);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Lado Direito: Auditoria da Nora */}
          <div className="flex flex-col items-end gap-2 w-full md:w-auto border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-8">
            <span className="text-[10px] font-black text-indigo-300 uppercase">Monitoramento Noradrenalina</span>
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1.5 rounded-lg border font-black text-xs ${currentPatient.sofa_data_technical?.noraDoubleDoseToday ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-emerald-500/20 border-emerald-500 text-emerald-400'}`}>
                {currentPatient.sofa_data_technical?.noraDoubleDoseToday ? 'DOSE DOBRADA' : 'DILUIÇÃO PADRÃO'}
              </div>
              {(() => {
                const lastHour = BH_HOURS.slice().reverse().find(h => currentPatient.bh?.gains?.[h]?.["Noradrenalina"]);
                const dose = calculateNoraDose(currentPatient, currentPatient.bh?.gains?.[lastHour]?.["Noradrenalina"]);
                return dose ? (
                  <div className="bg-white text-indigo-950 px-4 py-1.5 rounded-lg shadow-xl flex flex-col items-center">
                    <span className="text-xl font-black leading-none">{dose}</span>
                    <span className="text-[9px] font-black uppercase">mcg/kg/min</span>
                  </div>
                ) : (
                  <div className="text-[10px] text-white/40 italic">Aguardando dados...</div>
                );
              })()}
            </div>
          </div>
        </div>
        
        {/* Rodapé: Auditoria de Dados */}
        <div className="mt-6 pt-4 border-t border-white/5 flex flex-wrap gap-4 text-[9px] font-bold text-white/40 uppercase">
          <span className={currentPatient.neuro?.glasgow || currentPatient.neuro?.sedacao ? "text-indigo-400" : ""}>
            ● SNC: {getBestGlasgowForSOFA(currentPatient)?.valor || 'N/A'} 
            <span className="text-[7px] ml-1 opacity-70">
              ({currentPatient.sofa_data_technical?.glasgowOrigem || 'N/A'})
            </span>
          </span>
          <span className={currentPatient.sofa_data_technical?.lastPF ? "text-indigo-400" : "text-amber-500/60"}>
            ● P/F: {currentPatient.sofa_data_technical?.lastPF || 'S/ GASO'}
          </span>
          <span className={currentPatient.sofa_data_technical?.lastPAM ? (currentPatient.sofa_data_technical?.lastPAM < 70 ? "text-red-400 animate-pulse" : "text-indigo-400") : "text-amber-500/60"}>
            ● PAM: {currentPatient.sofa_data_technical?.lastPAM || 'S/ DADO'}
          </span>
          <span className={currentPatient.sofa_data_technical?.lastCreat ? "text-indigo-400" : "text-amber-500/60"}>
            ● CREAT: {currentPatient.sofa_data_technical?.lastCreat || 'S/ EXAME'}
          </span>
          <span className={currentPatient.sofa_data_technical?.lastPlat ? "text-indigo-400" : "text-amber-500/60"}>
            ● PLT: {currentPatient.sofa_data_technical?.lastPlat || 'S/ EXAME'}
          </span>
        </div>
      </div>

      {/* BOTÃO DE REABRIR ADMISSÃO */}
      <div className="flex justify-end mb-6 print:hidden">
        <button
          onClick={(e) => {
            e.preventDefault();
            if (handleEditAdmission) handleEditAdmission();
          }}
          disabled={!isEditable}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm ${
            !isEditable
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
          }`}
          title="Reabrir e editar dados da Admissão Médica"
        >
          <Edit3 size={16} /> Reabrir Admissão Médica
        </button>
      </div>

      {/* ALERTA DE SEPSE */}
      {currentPatient.sofa_data_technical?.sepsis_protocol_active && (
        <div className="bg-red-100 border-2 border-red-500 text-red-800 rounded-xl p-4 flex items-center justify-between mb-8 shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <AlertCircle size={28} className="text-red-600" />
            <div>
              <h4 className="font-black uppercase text-sm">Alerta Clínico: Δ SOFA ≥ 2</h4>
              <p className="font-medium text-xs opacity-90">Suspeita de infecção confirmada. <span className="font-bold underline">Sugiro iniciar protocolo de Sepse (Pacote de 1 hora)</span>.</p>
            </div>
          </div>
          <button 
            onClick={() => updateNested("sofa_data_technical", "sepsis_protocol_active", false)}
            className="text-red-400 hover:text-red-700 transition-colors p-2"
            title="Descartar Alerta"
          >
            <X size={24} />
          </button>
        </div>
      )}

      {/* DADOS CLÍNICOS, ORIGEM E DIAGNÓSTICO REORGANIZADOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
        
        {/* 1. DATA DE ADMISSÃO: 1º no Celular | 2º no PC (Direita) */}
        <div className="order-1 md:order-2">
          <label className="text-xs font-bold text-gray-400">Data de Admissão</label>
          <div className="w-full p-2 border border-slate-200 rounded-lg bg-slate-100/50 min-h-[38px] text-sm flex items-center text-slate-500 font-medium">
            {formatarDataBR(currentPatient.dataInternacao) || "Não informada"}
          </div>
        </div>

        {/* 2. PROCEDÊNCIA: 2º no Celular | 1º no PC (Esquerda) */}
        <div className="order-2 md:order-1">
          <label className="text-xs font-bold text-gray-400">Procedência</label>
          <input 
            type="text" 
            value={currentPatient.procedencia || ""} 
            onChange={(e) => updateP("procedencia", e.target.value)} 
            onBlur={() => handleBlurSave("Médico: Editou Procedência")}
            className="w-full p-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-teal-100" 
          />
        </div>

        {/* 3. DIAGNÓSTICO PRINCIPAL: 3º no Celular | 3º no PC (Esquerda) */}
        <div className="order-3 md:order-3">
          <label className="text-xs font-bold text-gray-400">Diagnóstico Principal</label>
          <textarea 
            value={currentPatient.diagnostico || ""} 
            onChange={(e) => updateP("diagnostico", e.target.value)} 
            onBlur={() => handleBlurSave("Médico: Editou Diagnóstico")}
            className="w-full p-2 border rounded-lg h-24 bg-white resize-none outline-none focus:ring-2 focus:ring-teal-100" 
          />
        </div>

        {/* 4. HPP / COMORBIDADES: 4º no Celular | 4º no PC (Direita) */}
        <div className="order-4 md:order-4">
          <label className="text-xs font-bold text-gray-400">HPP / Comorbidades</label>
          <textarea 
            value={currentPatient.comorbidades || ""} 
            onChange={(e) => updateP("comorbidades", e.target.value)} 
            onBlur={() => handleBlurSave("Médico: Editou HPP/Comorbidades")}
            className="w-full p-2 border rounded-lg h-24 bg-white resize-none outline-none focus:ring-2 focus:ring-teal-100" 
          />
        </div>
        
      </div>

{/* HISTÓRIA CLÍNICA */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 transition-all duration-300">
        <button 
          type="button"
          onClick={() => setHistoryOpen(!historyOpen)} 
          className="flex items-center gap-2 font-bold text-slate-700 w-full text-left hover:text-teal-600 transition-colors outline-none"
        >
          {historyOpen ? <ChevronDown size={20} className="text-teal-600" /> : <ChevronRight size={20} />} 
          História Clínica
        </button>
        
        {historyOpen && (
          <div className="pt-3 animate-fadeIn">
            <textarea 
              value={currentPatient.historiaClinica || ""} 
              onChange={(e) => updateP("historiaClinica", e.target.value)} 
              onBlur={() => handleBlurSave("Médico: Editou História Clínica")}
              className="w-full p-3 border border-slate-200 rounded-lg h-32 text-sm bg-white outline-none focus:ring-2 focus:ring-teal-100 resize-none shadow-inner" 
              placeholder="Digite a história clínica detalhada do paciente..." 
            />
          </div>
        )}
      </div>

{/* CARDIO & NEURO */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-4 border rounded-xl bg-red-50/20">
          <h4 className="font-bold text-red-800 mb-4 flex items-center gap-2"><HeartPulse size={16} /> Cardiovascular</h4>
          <label className="flex items-center gap-2 mb-2 font-bold">
            <input 
              type="checkbox" 
              checked={currentPatient.cardio?.dva || false} 
              onChange={(e) => updateNested("cardio", "dva", e.target.checked)} 
              onBlur={() => handleBlurSave("Médico: Alterou Uso de DVA")}
            /> 
            DVA (Drogas Vasoativas)
          </label>
          {currentPatient.cardio?.dva && (
            <div className="grid grid-cols-2 gap-2 pl-4">
              {OPCOES_DVA.map((d) => (
                <label key={d} className="flex items-center gap-1 text-sm cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={currentPatient.cardio?.drogasDVA?.includes(d) || false} 
                    onChange={(e) => {
                      let arr = currentPatient.cardio?.drogasDVA || [];
                      if (e.target.checked) arr = [...arr, d];
                      else arr = arr.filter(i => i !== d);
                      updateNested("cardio", "drogasDVA", arr);
                    }} 
                    onBlur={() => handleBlurSave(`Médico: Alterou DVA Específica (${d})`)}
                  /> 
                  {d}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border rounded-xl bg-indigo-50/20">
          <h4 className="font-bold text-indigo-800 mb-4 flex items-center gap-2"><Brain size={16} /> Neurológico</h4>
          <div className="grid md:grid-cols-3 gap-2 mb-2">
            <select className="p-2 border rounded text-xs" value={currentPatient.neuro?.glasgowAO || ""} onChange={(e) => updateNested("neuro", "glasgowAO", e.target.value)} onBlur={() => handleBlurSave("Médico: Avaliou Glasgow (AO)")}><option value="">AO</option>{GLASGOW_AO.map((o) => <option key={o}>{o}</option>)}</select>
            <select className="p-2 border rounded text-xs" value={currentPatient.neuro?.glasgowRV || ""} onChange={(e) => updateNested("neuro", "glasgowRV", e.target.value)} onBlur={() => handleBlurSave("Médico: Avaliou Glasgow (RV)")}><option value="">RV</option>{GLASGOW_RV.map((o) => <option key={o}>{o}</option>)}</select>
            <select className="p-2 border rounded text-xs" value={currentPatient.neuro?.glasgowRM || ""} onChange={(e) => updateNested("neuro", "glasgowRM", e.target.value)} onBlur={() => handleBlurSave("Médico: Avaliou Glasgow (RM)")}><option value="">RM</option>{GLASGOW_RM.map((o) => <option key={o}>{o}</option>)}</select>
          </div>
          <p className="text-sm font-bold text-blue-600 mb-3 text-right">
            Total Glasgow: {(() => {
              const ao = parseInt(currentPatient.neuro?.glasgowAO) || 0;
              const rm = parseInt(currentPatient.neuro?.glasgowRM) || 0;
              const rvStr = currentPatient.neuro?.glasgowRV || "";
              
              if (!currentPatient.neuro?.glasgowAO && !rvStr && !currentPatient.neuro?.glasgowRM) return "-";
              
              if (rvStr.startsWith("T") || rvStr.startsWith("1 - T")) return `${ao + rm}T`;
              
              const rv = parseInt(rvStr) || 0;
              return ao + rm + rv;
            })()}
          </p>

          <label className="block text-xs font-bold text-gray-500 mb-1">RASS</label>
          <select className="w-full p-2 border rounded mb-3" value={currentPatient.neuro?.rass || ""} onChange={(e) => updateNested("neuro", "rass", e.target.value)} onBlur={() => handleBlurSave("Médico: Avaliou RASS")}><option value="">Se Sedado...</option>{RASS_OPTS.map((r) => <option key={r}>{r}</option>)}</select>

          <label className="flex items-center gap-2 mb-2 font-bold">
            <input 
              type="checkbox" 
              checked={currentPatient.neuro?.sedacao || false} 
              onChange={(e) => updateNested("neuro", "sedacao", e.target.checked)} 
              onBlur={() => handleBlurSave("Médico: Alterou Uso de Sedação")}
            /> 
            Sedação Contínua
          </label>
          {currentPatient.neuro?.sedacao && (
            <div className="grid grid-cols-2 gap-2 pl-4">
              {OPCOES_SEDATIVOS.map((d) => (
                <label key={d} className="flex items-center gap-1 text-sm cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={currentPatient.neuro?.drogasSedacao?.includes(d) || false} 
                    onChange={(e) => {
                      let arr = currentPatient.neuro?.drogasSedacao || [];
                      if (e.target.checked) arr = [...arr, d];
                      else arr = arr.filter(i => i !== d);
                      updateNested("neuro", "drogasSedacao", arr);
                    }} 
                    onBlur={() => handleBlurSave(`Médico: Alterou Sedativo Específico (${d})`)}
                  /> 
                  {d}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

{/* ATB */}
      <div className="p-4 border border-orange-200 bg-orange-50 rounded-xl">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-sm font-bold text-orange-700">Prescrição de Antimicrobianos</h4>
          
          <button 
            onClick={(e) => { 
              e.preventDefault(); 
              if(setShowATBHistoryModal) setShowATBHistoryModal(true);
              else alert("Ferramenta de Histórico não conectada!");
            }} 
            className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded hover:bg-orange-300 font-bold flex items-center gap-1 transition-colors"
          >
            <Clock size={14} /> Histórico
          </button>
        </div>
        
        {currentPatient.antibiotics?.map((atb, idx) => {
          
          // 👇 CIRURGIA 1: Agora só bloqueia se o botão verde for clicado!
          const isFixed = atb.locked === true;
          const isLastItem = idx === currentPatient.antibiotics.length - 1;

          return (
            <div key={idx} className="w-full">
              <div className="flex flex-wrap md:flex-nowrap gap-2 mb-3 items-stretch">
                {isFixed ? (
                  <>
                    <div className="flex-1 flex items-center px-3 py-2 bg-orange-100/50 border border-orange-200 rounded-lg text-orange-900 font-bold uppercase overflow-hidden shadow-sm">
                      <Pill size={16} className="mr-2 text-orange-500 flex-shrink-0" />
                      <span className="truncate text-xs md:text-sm">{atb.name}</span>
                    </div>
                    <div className="w-[85px] md:w-32 flex items-center justify-center px-1 py-2 bg-orange-50 border border-orange-200 rounded-lg text-xs md:text-sm font-bold text-orange-800 shadow-sm">{atb.date ? formatDateDDMM(atb.date) : "-"}</div>
                    <div className="w-10 md:w-12 flex items-center justify-center text-sm md:text-base font-bold text-orange-600 bg-white rounded-lg border border-orange-200 shadow-sm">{atb.date ? getDaysD0(atb.date) : "-"}</div>
                    
                    {/* 👇 CIRURGIA CORRETIVA: Botão X estrito. Ele SÓ apaga se arquivar no histórico! */}
                    <button 
                      onClick={(e) => { 
                        e.preventDefault(); 
                        if (clearAntibiotic) {
                           // Chama a função principal que arquiva no histórico e depois limpa o campo
                           clearAntibiotic(idx);
                        } else {
                           alert("Aviso: O cabo do Histórico está desconectado. O ATB não foi apagado para não perder o dado!");
                        }
                      }} 
                      className={`flex items-center justify-center text-orange-400 hover:text-white hover:bg-red-500 transition-colors bg-white border border-orange-200 rounded-lg w-10 md:w-10 shadow-sm ${!isEditable ? "hidden" : ""}`} 
                      title="Arquivar no Histórico e Limpar"
                    >
                      <X size={18} strokeWidth={3} />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex flex-wrap md:flex-nowrap w-full gap-2">
                      <input 
                        id={`atb-name-${idx}`}
                        type="text" 
                        value={atb.name || ""} 
                        onChange={(e) => updateAntibiotic(idx, "name", e.target.value.toUpperCase())}
                        onBlur={() => {
                          if (atb.name) handleBlurSave(`Médico: Digitou Nome de Novo ATB (${atb.name})`);
                        }} 
                        placeholder={`Novo ATB ${idx + 1}`} 
                        className="w-full md:flex-1 min-w-[100px] p-2 rounded-lg border border-orange-300 focus:border-orange-500 outline-none font-bold text-slate-700 uppercase text-sm" 
                      />

                      <div className="flex w-full md:w-auto gap-2 mt-1 md:mt-0">
                        <input 
                          id={`atb-date-${idx}`}
                          type="date" 
                          value={atb.date || ""} 
                          onChange={(e) => updateAntibiotic(idx, "date", e.target.value)}
                          onBlur={() => {
                            if (atb.date) handleBlurSave("Médico: Definiu Data de Novo ATB");
                          }} 
                          className="flex-1 md:w-32 p-2 rounded-lg border border-orange-300 focus:border-orange-500 outline-none font-bold text-slate-700 text-sm" 
                        />
                        <div className="hidden md:flex w-12 items-center justify-center font-bold text-orange-300 bg-slate-50 rounded-lg border border-orange-100">-</div>
                        
                        <button 
                          onClick={(e) => { 
                            e.preventDefault(); 
                            if (atb.name && atb.date) { 
                              updateAntibiotic(idx, "locked", true); 
                              setTimeout(() => handleBlurSave(`Médico: Fixou Prescrição de ATB (${atb.name})`), 100);
                            } else { 
                              alert("Preencha o Nome e a Data do antibiótico para fixá-lo!"); 
                            }
                          }} 
                          className={`flex flex-shrink-0 items-center justify-center w-[42px] md:w-10 h-[42px] md:h-auto text-green-600 hover:text-white hover:bg-green-500 transition-colors bg-green-50 border border-green-200 rounded-lg shadow-sm ${!isEditable ? "hidden" : ""}`} 
                          title="Confirmar e Fixar Antibiótico"
                        >
                          <CheckCircle size={18} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {!isLastItem && (
                <div className="w-[70%] mx-auto mb-3 border-b border-orange-200/80"></div>
              )}
            </div>
          );
        })}
      </div>

      {/* EVOLUÇÃO IA */}
      <div className="bg-white border border-indigo-100 rounded-xl p-4 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-indigo-800 flex items-center gap-2">
            <Sparkles size={16} /> Evolução Diária (IA)
          </h3>
          <div className="flex gap-2">
            {aiEvolution && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  copyToClipboardFallback(aiEvolution);
                  // Auditando a cópia do texto
                  handleBlurSave("Médico: Copiou Evolução da IA");
                }}
                className="flex items-center gap-1 bg-white border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-indigo-50 transition"
                title="Copiar texto gerado"
              >
                <ClipboardCheck size={14} /> Copiar
              </button>
            )}
            <button
              onClick={(e) => {
                e.preventDefault();
                abrirChecklistEvolucao();
              }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow hover:bg-indigo-700 transition"
            >
              {isGeneratingAI ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />} Gerar Evolução
            </button>
          </div>
        </div>
        {aiEvolution && (
          <textarea
            className="w-full bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 text-sm text-slate-700 min-h-[150px] outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
            value={aiEvolution}
            onChange={(e) => setAiEvolution(e.target.value)}
            // A IA não salva no firebase do paciente diretamente, mas auditamos a edição do campo
            onBlur={() => handleBlurSave("Médico: Editou o campo de Evolução da IA")}
          />
        )}
      </div>
      
    </fieldset>
  );
};

export default MedicalDashboard;