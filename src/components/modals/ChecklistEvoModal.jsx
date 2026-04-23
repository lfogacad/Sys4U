import React from 'react';
import { ShieldAlert, X, Bug, CheckCircle, Stethoscope } from 'lucide-react';
import { RASS_OPTS } from '../../constants/clinicalLists'; 

const ChecklistEvoModal = ({
  showChecklistEvo,
  setShowChecklistEvo,
  currentPatient,
  updateNested,
  updateP,
  confirmarEGerar
}) => {
  if (!showChecklistEvo || !currentPatient) return null;

  // Atalhos para facilitar a leitura do código
  const med = currentPatient.medical || {};
  const neuro = currentPatient.neuro || {};
  const cardio = currentPatient.cardio || {};

  // Função para lidar com Arrays (drogas DVA e Sedativos) de forma segura
  const toggleArrayItemLocal = (categoria, campoArray, item) => {
    const atual = currentPatient[categoria]?.[campoArray] || [];
    const novoArray = atual.includes(item) 
      ? atual.filter(i => i !== item) 
      : [...atual, item];
    updateNested(categoria, campoArray, novoArray);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 z-[90] flex justify-center items-center backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* CABEÇALHO */}
        <div className="p-4 bg-slate-800 text-white flex justify-between items-center shrink-0">
          <h3 className="font-bold flex items-center gap-2">
            <ShieldAlert size={18} className="text-amber-400" />
            Timeout Clínico: Sincronizado com Aba Médico
          </h3>
          <button onClick={() => setShowChecklistEvo(false)} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-5 overflow-y-auto space-y-5 bg-slate-50 flex-1">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* LADO ESQUERDO: GERAL E NEURO */}
            <div className="space-y-4">
              {/* ESTADO GERAL */}
              <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase">Estado Geral</label>
                <div className="flex gap-2">
                  {["BEG", "REG", "MEG"].map(eg => (
                    <button 
                      key={eg} 
                      onClick={() => updateNested("medical", "estadoGeral", eg)} 
                      className={`flex-1 py-1.5 rounded text-sm font-bold border transition-colors ${med.estadoGeral === eg ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                    >
                      {eg}
                    </button>
                  ))}
                </div>
              </div>

              {/* SEDAÇÃO E NEUROLÓGICO */}
              <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer mb-3">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-slate-800 rounded focus:ring-slate-800" 
                    checked={neuro.sedacao || false} 
                    onChange={(e) => updateNested("neuro", "sedacao", e.target.checked)} 
                  />
                  Paciente Sedado?
                </label>
                
                {neuro.sedacao ? (
                  <div className="pl-6 space-y-3 border-l-2 border-slate-100 animate-fadeIn">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sedativos em uso</label>
                      <div className="grid grid-cols-2 gap-1">
                        {["Fentanil", "Midazolam", "Propofol", "Dexmedetomidina", "Cetamina"].map(sed => (
                          <label key={sed} className="flex items-center gap-1 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded">
                            <input 
                              type="checkbox" 
                              checked={(neuro.drogasSedacao || []).includes(sed)} 
                              onChange={() => toggleArrayItemLocal("neuro", "drogasSedacao", sed)}
                            /> {sed}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Escala RASS</label>
                      <select 
                        className="w-full p-1.5 border rounded text-sm bg-white outline-none focus:ring-2 focus:ring-slate-300"
                        value={neuro.rass || ""} 
                        onChange={(e) => updateNested("neuro", "rass", e.target.value)}
                      >
                        <option value="">Selecione...</option>
                        {RASS_OPTS.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="pl-6 animate-fadeIn">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Escala de Glasgow</label>
                    <select 
                      className="w-full p-1.5 border rounded text-sm bg-white outline-none focus:ring-2 focus:ring-slate-300"
                      value={neuro.glasgow || ""} 
                      onChange={(e) => updateNested("neuro", "glasgow", e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {["15", "14", "13", "12", "11", "10", "9", "8", "7", "6", "5", "4", "3"].map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* LADO DIREITO: CARDIO E ATB */}
            <div className="space-y-4">
              {/* DVA E HEMODINÂMICA */}
              <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer mb-3">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-red-600 rounded focus:ring-red-500" 
                    checked={cardio.dva || false} 
                    onChange={(e) => updateNested("cardio", "dva", e.target.checked)} 
                  />
                  Uso de DVA?
                </label>
                
                {cardio.dva && (
                  <div className="pl-6 grid grid-cols-2 gap-1 border-l-2 border-red-50 animate-fadeIn">
                    {["Noradrenalina", "Vasopressina", "Adrenalina", "Dobutamina", "Milrinone"].map(dva => (
                      <label key={dva} className="flex items-center gap-1 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded">
                        <input 
                          type="checkbox" 
                          checked={(cardio.drogasDVA || []).includes(dva)} 
                          onChange={() => toggleArrayItemLocal("cardio", "drogasDVA", dva)}
                        /> {dva}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* ANTIBIÓTICOS */}
              <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase flex items-center gap-1">
                  <Bug size={14} className="text-orange-500"/> Confirmar Antibióticos (D)
                </label>
                <textarea 
                  className="w-full p-2 border rounded text-sm outline-none focus:ring-2 focus:ring-orange-200 h-16 resize-none bg-slate-50 focus:bg-white transition" 
                  value={med.antibioticosTextoIA || ""} 
                  onChange={(e) => updateNested("medical", "antibioticosTextoIA", e.target.value)} 
                  placeholder="Ex: Meropenem (D3) + Vancomicina (D3)" 
                />
              </div>
            </div>
          </div>

          {/* EXAME FÍSICO DA ADMISSÃO / EVOLUÇÃO */}
          <div className="bg-white p-4 rounded border border-slate-200 shadow-sm border-t-4 border-t-indigo-400">
            <label className="text-xs font-bold text-indigo-700 mb-3 uppercase flex items-center gap-1 border-b pb-2">
              <Stethoscope size={16} /> Exame Físico
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              {/* Geral */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">GERAL</label>
                <textarea 
                  className="w-full p-2 border rounded text-xs bg-slate-50 focus:bg-white transition resize-none outline-none focus:ring-2 focus:ring-indigo-200"
                  value={med.exameGeral || ""}
                  onChange={(e) => updateNested("medical", "exameGeral", e.target.value)}
                  rows={2}
                />
              </div>

              {/* AR */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">AR</label>
                <textarea 
                  className="w-full p-2 border rounded text-xs bg-slate-50 focus:bg-white transition resize-none outline-none focus:ring-2 focus:ring-indigo-200"
                  value={med.exameAR || ""}
                  onChange={(e) => updateNested("medical", "exameAR", e.target.value)}
                  rows={2}
                />
              </div>

              {/* ACV (Adicionado) */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">ACV</label>
                <textarea 
                  className="w-full p-2 border rounded text-xs bg-slate-50 focus:bg-white transition resize-none outline-none focus:ring-2 focus:ring-indigo-200"
                  value={med.exameACV || ""}
                  onChange={(e) => updateNested("medical", "exameACV", e.target.value)}
                  rows={2}
                />
              </div>

              {/* ABD */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">ABD.</label>
                <textarea 
                  className="w-full p-2 border rounded text-xs bg-slate-50 focus:bg-white transition resize-none outline-none focus:ring-2 focus:ring-indigo-200"
                  value={med.exameABD || ""}
                  onChange={(e) => updateNested("medical", "exameABD", e.target.value)}
                  rows={2}
                />
              </div>

              {/* Extremidades */}
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">EXTREMIDADES</label>
                <textarea 
                  className="w-full p-2 border rounded text-xs bg-slate-50 focus:bg-white transition resize-none outline-none focus:ring-2 focus:ring-indigo-200"
                  value={med.exameExtremidades || ""}
                  onChange={(e) => updateNested("medical", "exameExtremidades", e.target.value)}
                  rows={2}
                />
              </div>

              {/* NOVOS CAMPOS: EXAMES E CONDUTA */}
              <div className="md:col-span-2 border-t pt-4 mt-2">
                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Exames Complementares (Laboratório e Imagem)</label>
                <textarea 
                  className="w-full p-2 mt-1 border rounded text-xs bg-slate-50 focus:bg-white transition resize-none outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Descreva os achados relevantes dos exames..."
                  value={med.examesComplementares || ""}
                  onChange={(e) => updateNested("medical", "examesComplementares", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Conduta / Plano Terapêutico</label>
                <textarea 
                  className="w-full p-2 mt-1 border rounded text-xs bg-indigo-50/30 focus:bg-white transition resize-none outline-none focus:ring-2 focus:ring-indigo-200 font-medium"
                  placeholder="Planejamento para as próximas 24h..."
                  value={med.condutaPlano || ""}
                  onChange={(e) => updateNested("medical", "condutaPlano", e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* RODAPÉ */}
        <div className="p-4 bg-white border-t flex justify-end gap-3 shrink-0">
          <button onClick={() => setShowChecklistEvo(false)} className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded transition-colors">Cancelar</button>
          
          <button 
            onClick={() => {
              setShowChecklistEvo(false);
              setTimeout(() => {
                confirmarEGerar();
              }, 300);
            }} 
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded shadow transition-colors flex items-center gap-2"
          >
            <CheckCircle size={18} /> Confirmar e Gerar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChecklistEvoModal;