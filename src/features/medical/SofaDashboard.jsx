import React from 'react';
import { Activity, AlertCircle, X } from 'lucide-react';
import { getAutoSOFA2, getSOFAMortality, getBestGlasgowForSOFA } from '../../utils/core';

export default function SofaDashboard({ patient, updateNested }) {
  if (!patient) return null;
  const currentSOFA = getAutoSOFA2(patient);
  
  // Pegamos os valores que o core calculou lá atrás
  const noraDose = patient.sofa_data_technical?.lastNoraDose;

  return (
    <>
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-2xl mb-2 border border-white/10 animate-fadeIn relative">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <svg className="w-24 h-24">
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/10" />
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" fill="transparent" 
                        strokeDasharray="251" 
                        strokeDashoffset={251 - (251 * (currentSOFA / 24))}
                        className={`${currentSOFA >= 10 ? 'text-red-500' : 'text-blue-400'} transition-all duration-1000`} 
                        strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black leading-none">{currentSOFA}</span>
                <span className="text-[10px] font-bold opacity-50 uppercase">Pontos</span>
              </div>
            </div>
            <div>
              <h3 className="text-xs font-black text-indigo-300 uppercase tracking-widest mb-1">Status SOFA-2</h3>
              <div className={`text-2xl font-black italic ${currentSOFA >= 10 ? 'text-red-500' : 'text-white'}`}>
                {currentSOFA >= 10 ? 'CRÍTICO / FALÊNCIA' : 'ESTÁVEL / DISFUNÇÃO'}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs font-medium text-white/60">
                <span>Mortalidade: <span className="text-white font-bold">{getSOFAMortality(currentSOFA)}</span></span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 w-full md:w-auto border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-8">
            <span className="text-[10px] font-black text-indigo-300 uppercase">Monitoramento Noradrenalina</span>
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1.5 rounded-lg border font-black text-xs ${patient.sofa_data_technical?.noraDoubleDoseToday ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-emerald-500/20 border-emerald-500 text-emerald-400'}`}>
                {patient.sofa_data_technical?.noraDoubleDoseToday ? 'DOSE DOBRADA' : 'DILUIÇÃO PADRÃO'}
              </div>
              
              {noraDose ? (
                <div className="bg-white text-indigo-950 px-4 py-1.5 rounded-lg shadow-xl flex flex-col items-center">
                  <span className="text-xl font-black leading-none">{noraDose}</span>
                  <span className="text-[9px] font-black uppercase">mcg/kg/min</span>
                </div>
              ) : (
                <div className="text-[10px] text-white/40 italic">Sem infusão (BH) ou sem peso</div>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-white/5 flex flex-wrap gap-4 text-[9px] font-bold text-white/40 uppercase">
          
          {/* 👇 SNC AJUSTADO PARA PEGAR EM TEMPO REAL */}
          <span className="text-indigo-400">
            ● SNC: {getBestGlasgowForSOFA(patient)?.valor || 'S/ DADO'} 
            <span className="text-[7px] ml-1 opacity-70">
              ({getBestGlasgowForSOFA(patient)?.origem})
            </span>
          </span>
          
          <span className={patient.sofa_data_technical?.lastPF ? "text-indigo-400" : "text-amber-500/60"}>
            ● P/F: {patient.sofa_data_technical?.lastPF || 'S/ GASO'}
          </span>
          
          <span className={patient.sofa_data_technical?.lastPAM ? (patient.sofa_data_technical?.lastPAM < 70 ? "text-red-400 animate-pulse" : "text-indigo-400") : "text-amber-500/60"}>
            ● PAM: {patient.sofa_data_technical?.lastPAM || 'S/ DADO'}
          </span>
          
          {/* 👇 RENAL AJUSTADO PARA MOSTRAR O MOTIVO (HD, ANÚRIA OU CREAT) */}
          <span className="text-amber-400">
            ● RENAL: {patient.sofa_data_technical?.renalReason || 'S/ DADO'}
          </span>
          
          <span className={patient.sofa_data_technical?.lastPlat ? "text-indigo-400" : "text-amber-500/60"}>
            ● PLT: {patient.sofa_data_technical?.lastPlat || 'S/ EXAME'}
          </span>
          
        </div>
      </div>
    </>
  );
}