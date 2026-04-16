import React from 'react';
import { ClipboardSignature, X, CheckCircle, Scale, Utensils } from 'lucide-react';
import { RISCO_NUTRICIONAL, CARACTERISTICAS_DIETA } from '../../constants/clinicalLists';

const NutriAdmissionModal = ({
  showNutriModal,
  setShowNutriModal,
  activeTab,
  nutriData,
  setNutriData,
  handleFinalizeNutriAdmission
}) => {
  if (!showNutriModal) return null;

  // Função local para lidar com o array de características da dieta
  const toggleCaracteristica = (item) => {
    setNutriData(prev => {
      let arr = prev.caracteristicasDieta || [];
      if (arr.includes(item)) arr = arr.filter(i => i !== item);
      else arr = [...arr, item];
      return { ...prev, caracteristicasDieta: arr };
    });
  };

  return (
    // 1. Fundo escuro cobrindo a tela toda
    <div className="fixed inset-0 bg-slate-900/80 z-[80] flex items-center justify-center p-2 md:p-4 animate-fadeIn">
      
      {/* 2. O Modal em si com trava de altura (max-h-[90vh]) */}
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* CABEÇALHO (continua igualzinho) */}
        <div className="bg-lime-600 p-4 text-white flex justify-between items-center shrink-0 shadow">
          <h3 className="font-bold flex items-center gap-2 text-lg">
            <ClipboardSignature size={20} /> Admissão Nutricional (Leito {activeTab + 1})
          </h3>
          <button onClick={() => setShowNutriModal(false)} className="hover:bg-lime-700 p-1 rounded transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* CORPO DO MODAL (Tem que ter o flex-1 e overflow-y-auto para rolar bonitinho) */}
        <div className="p-4 md:p-6 overflow-y-auto space-y-6 bg-slate-50 flex-1">
          
          <div className="p-5 bg-white border border-lime-100 rounded-xl shadow-sm">
            <h4 className="font-bold text-lime-800 mb-4 flex items-center gap-2 border-b pb-2">
              <Scale size={18} /> Antropometria e Metas Basais
            </h4>
            <div className="grid md:grid-cols-2 gap-5">
              
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Peso Atual (kg)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="w-full p-2.5 border-2 border-lime-200 focus:border-lime-500 rounded-lg outline-none font-bold text-slate-700"
                    placeholder="Ex: 70.5"
                    value={nutriData.peso || ""}
                    onChange={(e) => setNutriData({ ...nutriData, peso: e.target.value })}
                  />
                  <select
                    className="p-2.5 border-2 border-lime-200 rounded-lg text-sm bg-white outline-none focus:border-lime-500 font-bold text-slate-600"
                    value={nutriData.tipoMedicaoPeso || ""}
                    onChange={(e) => setNutriData({ ...nutriData, tipoMedicaoPeso: e.target.value })}
                  >
                    <option value="">Selecione...</option>
                    <option value="Aferido">Aferido</option>
                    <option value="Referido">Referido</option>
                    <option value="Estimado">Estimado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Risco Nutricional (NRS 2002)</label>
                <select
                  className="w-full p-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-red-200 text-red-700 font-bold"
                  value={nutriData.risco_nutricional || ""}
                  onChange={(e) => setNutriData({ ...nutriData, risco_nutricional: e.target.value })}
                >
                  <option value="">Selecione a pontuação...</option>
                  {RISCO_NUTRICIONAL.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Meta Calórica (kcal/dia)</label>
                <input
                  type="number"
                  className="w-full p-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-lime-200 text-slate-700 font-bold"
                  placeholder="Ex: 1800"
                  value={nutriData.metaCal || ""}
                  onChange={(e) => setNutriData({ ...nutriData, metaCal: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Meta Proteica (g/dia)</label>
                <input
                  type="number"
                  className="w-full p-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-lime-200 text-slate-700 font-bold"
                  placeholder="Ex: 90"
                  value={nutriData.metaProt || ""}
                  onChange={(e) => setNutriData({ ...nutriData, metaProt: e.target.value })}
                />
              </div>

            </div>
          </div>

          <div className="p-5 bg-white border border-lime-100 rounded-xl shadow-sm">
            <h4 className="font-bold text-lime-800 mb-4 flex items-center gap-2 border-b pb-2">
              <Utensils size={18} /> Prescrição Dietética Inicial
            </h4>
            
            <div className="mb-5">
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Via de Administração Principal</label>
              <select
                className="w-full p-3 border-2 border-lime-200 rounded-lg text-slate-700 font-bold outline-none focus:border-lime-500"
                value={nutriData.via || ""}
                onChange={(e) => setNutriData({ ...nutriData, via: e.target.value })}
              >
                <option value="">Selecione...</option>
                <option value="Oral">Oral</option>
                <option value="Enteral">Enteral</option>
                <option value="Parenteral">Parenteral</option>
                <option value="Zero">Zero Dieta</option>
                <option value="Mista">Mista</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Características da Dieta</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {CARACTERISTICAS_DIETA.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer bg-slate-50 hover:bg-lime-50 p-2 rounded border border-transparent hover:border-lime-200 transition-colors">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-lime-600 rounded focus:ring-lime-500"
                      checked={(nutriData.caracteristicasDieta || []).includes(c)}
                      onChange={() => toggleCaracteristica(c)}
                    /> {c}
                  </label>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* RODAPÉ */}
        <div className="p-4 bg-white border-t flex justify-end gap-3 shrink-0">
          <button onClick={() => setShowNutriModal(false)} className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors">
            Cancelar
          </button>
          <button 
            onClick={handleFinalizeNutriAdmission} 
            className="px-6 py-2.5 rounded-xl font-bold text-white bg-lime-600 hover:bg-lime-700 shadow-md transition-colors flex items-center gap-2"
          >
            <CheckCircle size={18} /> Salvar Admissão Nutricional
          </button>
        </div>

      </div>
    </div>
  );
};

export default NutriAdmissionModal;