import React from 'react';
import { ClipboardCheck, X } from 'lucide-react';

const GeneratedAdmissionTextModal = ({
  generatedAdmissionText,
  setGeneratedAdmissionText,
  copyToClipboardFallback
}) => {
  if (!generatedAdmissionText) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/90 z-[90] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl">
        <div className="bg-green-600 p-4 text-white flex justify-between items-center rounded-t-2xl">
          <h3 className="font-bold flex items-center gap-2">
            <ClipboardCheck size={20} /> Admissão Concluída!
          </h3>
          <button
            onClick={() => setGeneratedAdmissionText("")}
            className="hover:bg-green-700 p-1 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-600 mb-4 font-medium">
            O paciente foi avaliado com sucesso no sistema. Copie a evolução
            gerada abaixo para anexar no prontuário oficial:
          </p>
          <textarea
            className="w-full h-80 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none mb-6 font-mono resize-none focus:border-green-400 focus:bg-white transition-colors"
            readOnly
            value={generatedAdmissionText}
          ></textarea>
          <div className="flex gap-3">
            <button
              onClick={() => copyToClipboardFallback(generatedAdmissionText)}
              className="flex-1 py-3 bg-green-100 text-green-800 font-bold rounded-xl hover:bg-green-200 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <ClipboardCheck size={18} /> Copiar Texto Inteiro
            </button>
            <button
              onClick={() => setGeneratedAdmissionText("")}
              className="py-3 px-6 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-colors shadow-sm"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneratedAdmissionTextModal;