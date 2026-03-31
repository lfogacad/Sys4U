import React from 'react';
import { AlertCircle, Check, X } from 'lucide-react';

const SepsisModal = ({
  showSepsisModal,
  handleSepsisResponse
}) => {
  if (!showSepsisModal) return null;

  return (
    <div className="fixed inset-0 bg-red-900/90 flex items-center justify-center z-[90] p-6 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center border-4 border-red-500">
        <div className="flex justify-center mb-5">
          <AlertCircle size={54} className="text-red-600 animate-pulse" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2 uppercase">
          Alerta: Δ SOFA ≥ 2
        </h2>
        <p className="text-slate-700 font-medium mb-8 text-sm leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
          O escore SOFA-2 do paciente subiu rapidamente, indicando nova disfunção orgânica aguda.
          <br/><br/>
          <span className="font-bold text-red-700 text-base">O paciente tem algum processo infeccioso ativo suspeito ou confirmado?</span>
        </p>
        
        <div className="flex gap-4">
          <button
            onClick={() => handleSepsisResponse(true)}
            className="w-1/2 flex flex-col items-center justify-center gap-1.5 bg-red-600 text-white px-5 py-4 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-sm text-sm"
          >
            <Check size={20} />
            SIM, TEM INFECÇÃO
            <span className="text-[10px] opacity-80">(Iniciar Sepsis-3)</span>
          </button>
          <button
            onClick={() => handleSepsisResponse(false)}
            className="w-1/2 flex flex-col items-center justify-center gap-1.5 bg-slate-200 text-slate-700 px-5 py-4 rounded-xl font-bold hover:bg-slate-300 transition-colors text-sm"
          >
            <X size={20} />
            NÃO
            <span className="text-[10px] opacity-80">(Outra causa / Hemorragia)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SepsisModal;