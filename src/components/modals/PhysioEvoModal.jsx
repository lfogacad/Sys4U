import React from 'react';
import { FileText, X, Copy } from 'lucide-react';

const PhysioEvoModal = ({
  showPhysioEvoModal,
  setShowPhysioEvoModal,
  currentPatient,
  physioEvoText,
  setPhysioEvoText
}) => {
  if (!showPhysioEvoModal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[90] flex justify-center items-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col h-[85vh] overflow-hidden animate-fadeIn">
        
        <div className="p-4 bg-slate-800 flex justify-between items-center text-white shrink-0">
          <h2 className="text-lg font-black uppercase flex items-center gap-2">
            <FileText size={24} className="text-cyan-400" />
            Evolução Diária - {currentPatient.nome || "Paciente"}
          </h2>
          <button onClick={() => setShowPhysioEvoModal(false)} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-hidden flex flex-col bg-slate-50">
          <div className="bg-cyan-50 border-l-4 border-cyan-500 p-3 mb-3 rounded-r-lg">
            <p className="text-xs text-cyan-800 font-bold uppercase">
              Revise o texto gerado. Você pode digitar os "Ajustes Realizados" diretamente nesta caixa antes de copiar!
            </p>
          </div>
          <textarea
            className="w-full flex-1 p-4 border border-slate-300 rounded-xl text-[13px] leading-relaxed font-mono outline-none focus:ring-2 focus:ring-cyan-500 resize-none bg-white shadow-inner whitespace-pre-wrap"
            value={physioEvoText || ""}
            onChange={(e) => setPhysioEvoText(e.target.value)}
          />
        </div>

        <div className="p-4 bg-slate-100 border-t flex justify-between items-center shrink-0">
          <button onClick={() => setShowPhysioEvoModal(false)} className="px-6 py-3 bg-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-400 transition-colors">
            Fechar
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(physioEvoText);
              alert("Evolução copiada com sucesso! Cole no prontuário eletrônico do hospital.");
            }}
            className="px-8 py-3 bg-cyan-600 text-white rounded-xl font-black hover:bg-cyan-700 shadow-lg flex items-center gap-2 transition-colors uppercase"
          >
            <Copy size={20} /> Copiar para o Prontuário
          </button>
        </div>

      </div>
    </div>
  );
};

export default PhysioEvoModal;