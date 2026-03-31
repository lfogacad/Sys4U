import React from 'react';
import { ClipboardCheck, X } from 'lucide-react';

const GeneratedPhysioTextModal = ({
  generatedPhysioText,
  setGeneratedPhysioText,
  copyToClipboardFallback
}) => {
  if (!generatedPhysioText) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/90 z-[90] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl">
        <div className="bg-cyan-600 p-4 text-white flex justify-between items-center rounded-t-2xl">
          <h3 className="font-bold flex items-center gap-2">
            <ClipboardCheck size={20} /> Admissão Fisioterapêutica Concluída!
          </h3>
          <button onClick={() => setGeneratedPhysioText("")} className="hover:bg-cyan-700 p-1 rounded transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-600 mb-4 font-medium">
            Copie a evolução gerada abaixo para anexar no prontuário oficial:
          </p>
          <textarea
            className="w-full h-96 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none mb-6 font-mono resize-none focus:border-cyan-400 focus:bg-white transition-colors"
            readOnly
            value={generatedPhysioText}
          ></textarea>
          <div className="flex gap-3">
            <button onClick={() => copyToClipboardFallback(generatedPhysioText)} className="flex-1 py-3 bg-cyan-100 text-cyan-800 font-bold rounded-xl hover:bg-cyan-200 transition-colors flex items-center justify-center gap-2 shadow-sm">
              <ClipboardCheck size={18} /> Copiar Texto Inteiro
            </button>
            <button onClick={() => setGeneratedPhysioText("")} className="py-3 px-6 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-colors shadow-sm">
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneratedPhysioTextModal;