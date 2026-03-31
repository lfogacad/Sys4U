import React from 'react';
import { CheckCircle } from 'lucide-react';

const IndividualUploadModal = ({
  showIndividualUploadModal,
  setShowIndividualUploadModal,
  pendingUploadData,
  setPendingUploadData,
  formatDateDDMM,
  patients,
  activeTab,
  confirmIndividualUpload
}) => {
  if (!showIndividualUploadModal || !pendingUploadData) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-[90] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-blue-600 text-white">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <CheckCircle size={20} /> Confirmação de Leitura
          </h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-600 mb-4">
            A Inteligência Artificial extraiu os seguintes dados do PDF:
          </p>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
            <p className="text-sm mb-1">
              Paciente:{" "}
              <b className="text-slate-800">
                {pendingUploadData.patientName}
              </b>
            </p>
            <p className="text-sm mb-1">
              Data Base:{" "}
              <b className="text-slate-800">
                {formatDateDDMM(pendingUploadData.date)}
              </b>
            </p>
            <p className="text-sm">
              Parâmetros:{" "}
              <b className="text-blue-600">{pendingUploadData.count}</b>{" "}
              encontrados
            </p>
          </div>
          <p className="text-sm font-bold text-center text-slate-700 mb-4">
            Deseja lançar estes resultados no Leito{" "}
            {patients[activeTab].leito}?
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => {
                setShowIndividualUploadModal(false);
                setPendingUploadData(null);
              }}
              className="flex-1 py-3 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmIndividualUpload}
              className="flex-1 py-3 rounded-xl font-bold bg-blue-600 text-white shadow hover:bg-blue-700 transition-colors"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndividualUploadModal;