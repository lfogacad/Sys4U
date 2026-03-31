import React from 'react';
import { Activity, AlertCircle, X } from 'lucide-react';
import { 
  getAutoSOFA2, 
  getSOFAMortality, 
  getBestGlasgowForSOFA, 
  calculateNoraDose 
} from '../../utils/core';
import { BH_HOURS } from '../../constants/clinicalLists';

export default function SofaDashboard({ patient, updateNested }) {
  if (!patient) return null;

  return (
    <>
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
                        strokeDashoffset={251 - (251 * (getAutoSOFA2(patient) / 24))}
                        className={`${getAutoSOFA2(patient) >= 10 ? 'text-red-500' : 'text-blue-400'} transition-all duration-1000`} 
                        strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black leading-none">{getAutoSOFA2(patient)}</span>
                <span className="text-[10px] font-bold opacity-50 uppercase">Pontos</span>
              </div>
            </div>
            
            <div>
              <h3 className="text-xs font-black text-indigo-300 uppercase tracking-widest mb-1">Status SOFA-2</h3>
              <div className={`text-2xl font-black italic ${getAutoSOFA2(patient) >= 10 ? 'text-red-500' : 'text-white'}`}>
                {getAutoSOFA2(patient) >= 10 ? 'CRÍTICO / FALÊNCIA' : 'ESTÁVEL / DISFUNÇÃO'}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs font-medium text-white/60">
                <span>Mortalidade: <span className="text-white font-bold">{getSOFAMortality(getAutoSOFA2(patient))}</span></span>
                <span className="text-white/20">|</span>
                
                {/* Controle do SOFA Basal */}
                <label className="flex items-center gap-1 cursor-pointer" title="Se o paciente for renal crônico ou cirrótico, ajuste o SOFA de base aqui">
                  Basal: 
                  <input 
                    type="number" 
                    min="0" max="24"
                    className="w-10 bg-white/10 border border-white/20 rounded text-center text-white focus:outline-none focus:border-indigo-400 font-bold px-1"
                    value={patient.sofa_data_technical?.baseline_sofa || 0}
                    onChange={(e) => {
                      updateNested("sofa_data_technical", "baseline_sofa", e.target.value);
                      updateNested("sofa_data_technical", "reference_sofa_for_sepsis", e.target.value);
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
              <div className={`px-3 py-1.5 rounded-lg border font-black text-xs ${patient.sofa_data_technical?.noraDoubleDoseToday ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-emerald-500/20 border-emerald-500 text-emerald-400'}`}>
                {patient.sofa_data_technical?.noraDoubleDoseToday ? 'DOSE DOBRADA' : 'DILUIÇÃO PADRÃO'}
              </div>
              {(() => {
                const lastHour = BH_HOURS.slice().reverse().find(h => patient.bh?.gains?.[h]?.["Noradrenalina"]);
                const dose = calculateNoraDose(patient, patient.bh?.gains?.[lastHour]?.["Noradrenalina"]);
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
          <span className={patient.neuro?.glasgow || patient.neuro?.sedacao ? "text-indigo-400" : ""}>
            ● SNC: {getBestGlasgowForSOFA(patient).valor} 
            <span className="text-[7px] ml-1 opacity-70">
              ({patient.sofa_data_technical?.glasgowOrigem || 'N/A'})
            </span>
          </span>
          <span className={patient.sofa_data_technical?.lastPF ? "text-indigo-400" : "text-amber-500/60"}>
            ● P/F: {patient.sofa_data_technical?.lastPF || 'S/ GASO'}
          </span>
          <span className={patient.sofa_data_technical?.lastPAM ? (patient.sofa_data_technical?.lastPAM < 70 ? "text-red-400 animate-pulse" : "text-indigo-400") : "text-amber-500/60"}>
            ● PAM: {patient.sofa_data_technical?.lastPAM || 'S/ DADO'}
          </span>
          <span className={patient.sofa_data_technical?.lastCreat ? "text-indigo-400" : "text-amber-500/60"}>
            ● CREAT: {patient.sofa_data_technical?.lastCreat || 'S/ EXAME'}
          </span>
          <span className={patient.sofa_data_technical?.lastPlat ? "text-indigo-400" : "text-amber-500/60"}>
            ● PLT: {patient.sofa_data_technical?.lastPlat || 'S/ EXAME'}
          </span>
        </div>
      </div>

      {/* ALERTA DE SEPSE */}
      {patient.sofa_data_technical?.sepsis_protocol_active && (
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
    </>
  );
}