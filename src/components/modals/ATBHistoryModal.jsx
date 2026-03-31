import React from 'react';
import { Pill, X, Trash2 } from 'lucide-react';

const ATBHistoryModal = ({
  showATBHistoryModal,
  setShowATBHistoryModal,
  currentPatient,
  formatDateDDMM,
  isDocRole,
  deleteATBHistoryItem
}) => {
  if (!showATBHistoryModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
        <div className="bg-orange-500 p-4 text-white flex justify-between items-center">
          <h3 className="font-bold flex items-center gap-2">
            <Pill size={20} /> Histórico de Antibióticos
          </h3>
          <button onClick={() => setShowATBHistoryModal(false)}>
            <X size={20} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {!currentPatient.antibioticsHistory || currentPatient.antibioticsHistory.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-6">
              Nenhum antibiótico no histórico para este leito.
            </p>
          ) : (
            <div className="space-y-3">
              {[...currentPatient.antibioticsHistory].reverse().map((h) => (
                <div
                  key={h.id}
                  className="p-3 border border-orange-100 bg-orange-50 rounded-xl flex justify-between items-center"
                >
                  <div>
                    <p className="font-bold text-orange-800">{h.name}</p>
                    <p className="text-xs text-orange-600 mt-1">
                      <span className="font-medium">Início:</span>{" "}
                      {formatDateDDMM(h.startDate)} •{" "}
                      <span className="font-medium">Fim:</span>{" "}
                      {formatDateDDMM(h.endDate)}
                    </p>
                    <p className="text-xs font-bold text-orange-700 mt-1 bg-orange-200/50 inline-block px-2 py-0.5 rounded">
                      Tempo de uso: {h.duration}
                    </p>
                  </div>
                  {isDocRole && (
                    <button
                      onClick={() => deleteATBHistoryItem(h.id)}
                      className="text-orange-400 hover:text-red-500 p-2 transition-colors"
                      title="Excluir do Histórico"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ATBHistoryModal;