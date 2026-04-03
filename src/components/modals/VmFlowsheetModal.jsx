import React from 'react';
import { Activity, X, Printer } from 'lucide-react'; // <-- Adicionado o ícone Printer aqui

const VmFlowsheetModal = ({
  showVmFlowsheet,
  setShowVmFlowsheet,
  currentPatient,
  handleAddVmEntry,
  updateVmEntry
}) => {
  if (!showVmFlowsheet) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[90] flex justify-center items-center p-4 print:bg-white print:p-0">
      <div className="bg-white w-full max-w-7xl rounded-2xl shadow-2xl flex flex-col h-[90vh] overflow-hidden animate-fadeIn print:shadow-none print:h-auto print:overflow-visible">
        
        {/* CABEÇALHO - Oculto na impressão para economizar tinta */}
        <div className="p-3 md:p-4 bg-slate-800 flex justify-between items-center shrink-0 print:hidden">
          
          <div className="flex flex-col min-w-0 pr-4">
            <h2 className="text-base md:text-lg font-black uppercase text-white flex items-center gap-2 tracking-wide">
              <Activity size={20} className="text-cyan-400 shrink-0" />
              Mapa de VM
            </h2>
            <span className="text-xs md:text-sm text-slate-300 font-bold truncate mt-0.5">
              Paciente: {currentPatient.nome || "Não identificado"}
            </span>
          </div>

          <button onClick={() => setShowVmFlowsheet(false)} className="p-2 hover:bg-slate-700 rounded-full transition-colors text-white/70 hover:text-white shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* TÍTULO APENAS PARA IMPRESSÃO */}
        <div className="hidden print:block text-center py-4 border-b-2 border-slate-800 mb-4">
          <h1 className="text-2xl font-black uppercase tracking-wide text-slate-800">
            Mapa de Ventilação Mecânica
          </h1>
          <p className="text-lg font-bold text-slate-600">Paciente: {currentPatient.nome || "Não identificado"}</p>
        </div>

        <div className="p-4 flex-1 overflow-auto bg-slate-50 relative print:bg-white print:overflow-visible print:p-0">
          
          {/* BARRA DE AÇÕES (Botões Impressão e Adicionar) - Oculta na impressão */}
          <div className="mb-4 flex justify-between items-center sticky left-0 print:hidden">
            <p className="text-sm text-slate-600 font-bold">Registro de Parâmetros Contínuos</p>
            
            <div className="flex gap-2">
              {/* --- NOVO BOTÃO DE IMPRIMIR AQUI --- */}
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow transition-colors flex items-center gap-2"
                title="Imprimir Mapa de VM"
              >
                <Printer size={16} />
                Imprimir
              </button>
              
              <button
                onClick={handleAddVmEntry}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-lg shadow transition-colors"
              >
                + Adicionar Coluna (Puxar Horário Atual)
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-300 rounded-lg shadow-sm bg-white print:overflow-visible print:shadow-none print:border-none">
            <table className="w-full text-[10px] text-center whitespace-nowrap print:whitespace-normal">
              <tbody>
                {[
                  { key: 'dataHora', label: 'Data / Hora' },
                  { key: 'diasUti', label: 'Dias UTI' },
                  { key: 'diasVm', label: 'Dias VM' },
                  { key: 'cuff_row', label: 'Pressão Cuff (M/T/N)' }, 
                  { key: 'despertar_row', label: 'Despertar Diário' }, 
                  { key: 'modo', label: 'MODO' },
                  { key: 'fio2', label: 'FiO2 (%)' },
                  { key: 'pc', label: 'PC' },
                  { key: 'vc', label: 'VC' },
                  { key: 'vtPc', label: 'Vt pc' },
                  { key: 'ps', label: 'PS' },
                  { key: 'vm', label: 'V.M (L/min)' },
                  { key: 'fluxoInsp', label: 'Fluxo Insp.' },
                  { key: 'tInsp', label: 'T. Insp' },
                  { key: 'ie', label: 'I:E' },
                  { key: 'fr_row', label: 'FR set / FR tot' }, 
                  { key: 'peep', label: 'PEEP' },
                  { key: 'pPico', label: 'P pico' },
                  { key: 'pPlato', label: 'P platô' },
                  { key: 'dp', label: 'Driving Pressure (DP)' },
                  { key: 'cst', label: 'Cst' },
                  { key: 'cdin', label: 'Cdin' },
                  { key: 'rva', label: 'Rva' },
                  { key: 'autoPeep', label: 'Auto PEEP' },
                ].map((rowDef) => (
                  <tr key={rowDef.key} className="border-b border-slate-200 hover:bg-slate-50 transition-colors print:break-inside-avoid">
                    <td className="sticky left-0 bg-slate-200 p-2 font-bold text-slate-800 border-r border-slate-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] z-10 w-40 text-left print:static print:shadow-none">
                      {rowDef.label}
                    </td>
                    {currentPatient.physio?.vmFlowsheet?.map((entry, index) => (
                      <td key={entry.id} className="p-1 border-r border-slate-200 min-w-[120px] print:border-slate-400">
                        {rowDef.key === 'cuff_row' ? (
                          <div className="flex gap-1 justify-center">
                            <input className="w-8 p-1 border rounded text-center text-[10px] print:border-none print:p-0" placeholder="M" value={entry.cuffM || ""} onChange={(e) => updateVmEntry(index, 'cuffM', e.target.value)} />
                            <input className="w-8 p-1 border rounded text-center text-[10px] print:border-none print:p-0" placeholder="T" value={entry.cuffT || ""} onChange={(e) => updateVmEntry(index, 'cuffT', e.target.value)} />
                            <input className="w-8 p-1 border rounded text-center text-[10px] print:border-none print:p-0" placeholder="N" value={entry.cuffN || ""} onChange={(e) => updateVmEntry(index, 'cuffN', e.target.value)} />
                          </div>
                        ) : rowDef.key === 'despertar_row' ? (
                          <div className="flex gap-2 justify-center font-bold text-[9px]">
                            <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={entry.despertarS || false} onChange={(e) => updateVmEntry(index, 'despertarS', e.target.checked)} /> S</label>
                            <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={entry.despertarN || false} onChange={(e) => updateVmEntry(index, 'despertarN', e.target.checked)} /> N</label>
                          </div>
                        ) : rowDef.key === 'fr_row' ? (
                          <div className="flex gap-1 justify-center items-center">
                            <input className="w-10 p-1 border rounded text-center text-[10px] print:border-none print:p-0" placeholder="Set" value={entry.frSet || ""} onChange={(e) => updateVmEntry(index, 'frSet', e.target.value)} />
                            <span>/</span>
                            <input className="w-10 p-1 border rounded text-center text-[10px] print:border-none print:p-0" placeholder="Tot" value={entry.frTotal || ""} onChange={(e) => updateVmEntry(index, 'frTotal', e.target.value)} />
                          </div>
                        ) : (
                          <input
                            type="text"
                            className={`w-full p-1 border rounded text-center text-[11px] outline-none focus:ring-1 focus:ring-cyan-400 print:border-none print:bg-transparent print:p-0
                              ${rowDef.key === 'dp' ? 'bg-amber-100 font-bold text-amber-900' : ''} 
                              ${rowDef.key === 'cst' || rowDef.key === 'cdin' ? 'bg-blue-50 font-bold' : ''}`}
                            value={entry[rowDef.key] || ""}
                            onChange={(e) => updateVmEntry(index, rowDef.key, e.target.value)}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* RODAPÉ - Oculto na impressão */}
        <div className="p-3 bg-slate-100 border-t flex justify-end shrink-0 print:hidden">
           <button onClick={() => setShowVmFlowsheet(false)} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 transition-colors">Fechar Mapa</button>
        </div>
      </div>
    </div>
  );
};

export default VmFlowsheetModal;