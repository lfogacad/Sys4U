import React from 'react';
import { AlertCircle, Check, X } from 'lucide-react';

const NoraModal = ({
  showNoraModal,
  handleNoraModalResponse,
  handleBlurSave // <-- 1. Adicionado o bisturi da Caixa Preta aqui
}) => {
  if (!showNoraModal) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center border-4 border-amber-400">
        <div className="flex justify-center mb-5">
          <AlertCircle size={44} className="text-amber-600" />
        </div>
        <h2 className="text-xl font-black text-slate-800 mb-3 uppercase">
          Atenção: Registro de Noradrenalina!
        </h2>
        <p className="text-slate-700 font-medium mb-8 text-sm leading-relaxed">
          Este paciente está utilizando dose dobrada de Noradrenalina neste plantão?
          <span className="block text-xs text-slate-500 mt-2">(Verifique com a enfermeira e confirme para auditoria do SOFA-2)</span>
        </p>
        
        <div className="flex gap-5">
          <button
            onClick={() => handleNoraModalResponse(true)}
            className="w-1/2 flex flex-col items-center justify-center gap-1.5 bg-green-600 text-white px-5 py-4 rounded-xl font-bold hover:bg-green-700 transition-colors shadow-sm text-sm"
          >
            <Check size={20} />
            SIM, DOBRADA
            <span className="text-[10px] opacity-80">(8 amp/250mL)</span>
          </button>
          <button
            onClick={() => handleNoraModalResponse(false)}
            className="w-1/2 flex flex-col items-center justify-center gap-1.5 bg-slate-100 text-slate-700 px-5 py-4 rounded-xl font-bold hover:bg-slate-200 transition-colors text-sm"
          >
            <X size={20} />
            NÃO, PADRÃO
            <span className="text-[10px] opacity-80">(4 amp/250mL)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoraModal;