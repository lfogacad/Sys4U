import React from 'react';
import { Gauge, FileText } from 'lucide-react';

const ManagementTab = ({
  viewMode,
  patients,
  calculateSAPS3Score,
  getDaysD1,
  setShowSapsDetailsModal,
  getTempoVMText,
  calculateDiurese12hMlKgH
}) => {
  if (viewMode !== "management") return null;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Gauge size={22} className="text-purple-600" /> Gestão da UTI (Indicadores)
        </h3>
      </div>
      <div className="overflow-x-auto border rounded-xl shadow-sm bg-white">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
            <tr>
              <th className="p-3">Leito</th>
              <th className="p-3">Paciente</th>
              <th className="p-3 text-center">Dias UTI</th>
              <th className="p-3 text-center">SAPS 3</th>
              <th className="p-3 text-center">Mortalidade Esp.</th>
              <th className="p-3 text-center">Tempo VM</th>
              <th className="p-3 text-center">Diurese (12h)</th>
            </tr>
          </thead>
          <tbody>
            {patients
              .filter((p) => p.leito !== 11)
              .map((p) => {
                if (!p.nome) return null;
                const saps = calculateSAPS3Score(p);
                return (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-center font-bold text-slate-400 bg-slate-50">{p.leito}</td>
                    <td className="p-3 font-bold text-blue-700">{p.nome}</td>
                    <td className="p-3 text-center">{getDaysD1(p.dataInternacao)}</td>
                    <td className="p-3 text-center font-bold text-slate-700">
                      {p.saps3?.isLocked ? (
                        <button
                          onClick={() => setShowSapsDetailsModal({ patientName: p.nome, saps })}
                          className="flex items-center justify-center gap-1 mx-auto hover:text-purple-600 transition-colors px-2 py-1 rounded hover:bg-purple-50"
                          title="Ver detalhes da pontuação"
                        >
                          {saps.score} <FileText size={14} className="text-slate-400 hover:text-purple-500" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded">PENDENTE</span>
                      )}
                    </td>
                    <td className="p-3 text-center font-bold text-red-600 bg-red-50/50">
                      {p.saps3?.isLocked ? `${saps.prob}%` : "-"}
                    </td>
                    <td className="p-3 text-center font-medium text-cyan-700">{getTempoVMText(p)}</td>
                    <td className="p-3 text-center font-medium">{calculateDiurese12hMlKgH(p)}</td>
                  </tr>
                );
              })}
            {!patients.filter((p) => p.leito !== 11).some((p) => p.nome) && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  Nenhum paciente internado no momento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl text-xs text-purple-800">
        <strong>Nota sobre SAPS 3:</strong> O cálculo utiliza a equação customizada para a América Central e do Sul. Ele rastreia automaticamente o estado clínico inserido na aba admissão, exames laboratoriais das primeiras 48h (D0/D1) e os parâmetros vitais registados para estimar o risco no momento da internação.
      </div>
    </div>
  );
};

export default ManagementTab;