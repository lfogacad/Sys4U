import React from 'react';
import { Activity, X } from 'lucide-react';

const SapsDetailsModal = ({
  showSapsDetailsModal,
  setShowSapsDetailsModal
}) => {
  if (!showSapsDetailsModal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-[90] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden">
        <div className="bg-purple-600 p-4 text-white flex justify-between items-center">
          <h3 className="font-bold flex items-center gap-2">
            <Activity size={20} /> Detalhes SAPS 3
          </h3>
          <button
            onClick={() => setShowSapsDetailsModal(null)}
            className="hover:bg-purple-700 p-1 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-sm text-slate-500 uppercase font-bold">
              {showSapsDetailsModal.patientName}
            </p>
            <div className="flex justify-center gap-4 mt-2">
              <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 min-w-[100px]">
                <span className="block text-[10px] text-purple-600 font-bold uppercase">
                  Pontuação Total
                </span>
                <span className="text-2xl font-bold text-purple-800">
                  {showSapsDetailsModal.saps.score}
                </span>
              </div>
              <div className="bg-red-50 p-3 rounded-xl border border-red-100 min-w-[100px]">
                <span className="block text-[10px] text-red-600 font-bold uppercase">
                  Mortalidade Esp.
                </span>
                <span className="text-2xl font-bold text-red-800">
                  {showSapsDetailsModal.saps.prob}%
                </span>
              </div>
            </div>
          </div>

          <h4 className="font-bold text-slate-700 mb-3 text-sm border-b pb-2">
            Itens Pontuados:
          </h4>
          <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
            {showSapsDetailsModal.saps.details &&
            showSapsDetailsModal.saps.details.length > 0 ? (
              showSapsDetailsModal.saps.details.map((det, idx) => {
                const parts = det.split(":");
                return (
                  <div
                    key={idx}
                    className="bg-slate-50 p-2 rounded border border-slate-100 text-sm text-slate-700 flex justify-between"
                  >
                    <span>{parts[0]}</span>
                    <span className="font-bold text-purple-600">
                      {parts[1]}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500 italic text-center py-4">
                Nenhum item pontuou para este paciente ou os dados estão
                incompletos.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SapsDetailsModal;