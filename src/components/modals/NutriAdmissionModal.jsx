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

  const toggleCaracteristica = (item) => {
    setNutriData(prev => {
      let arr = prev.caracteristicasDieta || [];
      if (arr.includes(item)) arr = arr.filter(i => i !== item);
      else arr = [...arr, item];
      return { ...prev, caracteristicasDieta: arr };
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-[80] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        
        <div className="bg-lime-600 p-4 text-white flex justify-between items-center shrink-0 shadow">
          <h3 className="font-bold flex items-center gap-2 text-lg">
            <ClipboardSignature size={20} /> Admissão Nutricional (Leito {activeTab + 1})
          </h3>
          <button onClick={() => setShowNutriModal(false)} className="hover:bg-lime-700 p-1 rounded transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 bg-slate-50 flex-1">
          <div className="p-5 bg-white border border-lime-100 rounded-xl shadow-sm">
            <h4 className="font-bold text-lime-800 mb-4 flex items-center gap-2 border-b pb-2"><Scale size={18} /> Antropometria e Risco</h4>
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Peso Atual (kg)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="w-full p-2.5 border-2 border-lime-200 rounded-lg outline-none font-bold text-slate-700"
                    value={nutriData.peso || ""}
                    onChange={(e) => setNutriData({ ...nutriData, peso: e.target.value })}
                  />
                  <select
                    className="p-2.5 border-2 border-lime-200 rounded-lg text-sm bg-white font-bold"
                    value={nutriData.tipoMedicaoPeso || ""}
                    onChange={(e) => setNutriData({ ...nutriData, tipoMedicaoPeso: e.target.value })}
                  >
                    <option value="">Tipo...</option>
                    <option value="Aferido">Aferido</option>
                    <option value="Referido">Referido</option>
                    <option value="Estimado">Estimado</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Risco Nutricional (NRS 2002)</label>
                <select
                  className="w-full p-2.5 border rounded-lg bg-white text-red-700 font-bold"
                  value={nutriData.risco_nutricional || ""}
                  onChange={(e) => setNutriData({ ...nutriData, risco_nutricional: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  {RISCO_NUTRICIONAL.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="p-5 bg-white border border-lime-100 rounded-xl shadow-sm">
            <h4 className="font-bold text-lime-800 mb-4 flex items-center gap-2 border-b pb-2">Metas Nutricionais</h4>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Meta Calórica Total</label>
                <input type="number" className="w-full p-2.5 border rounded-lg font-bold" value={nutriData.metaCalTotal || ""} onChange={(e) => setNutriData({ ...nutriData, metaCalTotal: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Meta Calórica Diária</label>
                <input type="number" className="w-full p-2.5 border rounded-lg font-bold" value={nutriData.metaCalDiaria || ""} onChange={(e) => setNutriData({ ...nutriData, metaCalDiaria: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Meta Proteica Total</label>
                <input type="number" className="w-full p-2.5 border rounded-lg font-bold" value={nutriData.metaProtTotal || ""} onChange={(e) => setNutriData({ ...nutriData, metaProtTotal: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="p-5 bg-white border border-lime-100 rounded-xl shadow-sm">
            <h4 className="font-bold text-lime-800 mb-4 flex items-center gap-2 border-b pb-2"><Utensils size={18} /> Dieta Inicial</h4>
            <div className="mb-5">
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Via Principal</label>
              <select className="w-full p-3 border-2 border-lime-200 rounded-lg font-bold" value={nutriData.via || ""} onChange={(e) => setNutriData({ ...nutriData, via: e.target.value })}>
                <option value="">Selecione...</option>
                <option value="Oral">Oral</option>
                <option value="Enteral">Enteral</option>
                <option value="Parenteral">Parenteral</option>
                <option value="Zero">Zero</option>
                <option value="Mista">Mista</option>
              </select>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {CARACTERISTICAS_DIETA.map((c) => (
                <label key={c} className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 p-2 rounded border cursor-pointer">
                  <input type="checkbox" checked={(nutriData.caracteristicasDieta || []).includes(c)} onChange={() => toggleCaracteristica(c)} /> {c}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border-t flex justify-end gap-3 shrink-0">
          <button onClick={() => setShowNutriModal(false)} className="px-6 py-2.5 font-bold text-slate-600">Cancelar</button>
          <button onClick={handleFinalizeNutriAdmission} className="px-6 py-2.5 rounded-xl font-bold text-white bg-lime-600 flex items-center gap-2 shadow-md">
            <CheckCircle size={18} /> Salvar Admissão
          </button>
        </div>
      </div>
    </div>
  );
};

export default NutriAdmissionModal;