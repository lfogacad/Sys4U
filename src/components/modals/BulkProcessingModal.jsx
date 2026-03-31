import React from 'react';
import { Bot, X, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

const BulkProcessingModal = ({
  showBulkModal,
  setShowBulkModal,
  isProcessingBulk,
  bulkUploadLogs
}) => {
  if (!showBulkModal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-[90] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-blue-600 text-white">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Bot size={20} /> Processamento em Lote (IA)
          </h2>
          {!isProcessingBulk && (
            <button
              onClick={() => setShowBulkModal(false)}
              className="hover:text-blue-200"
            >
              <X size={24} />
            </button>
          )}
        </div>
        <div className="p-4 overflow-y-auto flex-1 bg-slate-50 space-y-2">
          {bulkUploadLogs.map((l, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg text-sm flex items-center gap-2 border shadow-sm ${
                l.status === "loading"
                  ? "bg-white border-blue-100 text-blue-700"
                  : l.status === "success"
                  ? "bg-green-50 border-green-200 text-green-800 font-medium"
                  : "bg-red-50 border-red-200 text-red-800 font-medium"
              }`}
            >
              {l.status === "loading" && (
                <Loader2 className="animate-spin" size={16} />
              )}
              {l.status === "success" && (
                <CheckCircle size={16} className="text-green-600" />
              )}
              {l.status === "error" && (
                <AlertTriangle size={16} className="text-red-600" />
              )}
              {l.msg}
            </div>
          ))}
        </div>
        <div className="p-4 border-t bg-white">
          {isProcessingBulk ? (
            <div className="flex justify-center items-center gap-2 text-blue-600 font-bold">
              <Loader2 className="animate-spin" /> Lendo e Distribuindo
              Dados...
            </div>
          ) : (
            <button
              onClick={() => setShowBulkModal(false)}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow hover:bg-blue-700 transition-colors"
            >
              Concluído
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkProcessingModal;