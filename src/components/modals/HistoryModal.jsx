import React from 'react';
import { Table, Printer, X, PlusCircle } from 'lucide-react';

const HistoryModal = ({
  showHistoryModal,
  setShowHistoryModal,
  currentPatient,
  handlePrintHistory,
  formatDateDDMM,
  getLast10Days,
  EXAM_ROWS,
  formatExamName,
  isOverviewEditable,
  patients,
  activeTab,
  setPatients,
  syncLabsFromHistory,
  save,
  handleBlurSave,
  handleAddCustomExam
}) => {
  if (!showHistoryModal) return null;

  // Calculamos as datas únicas para a timeline
  const timelineDates = Array.from(new Set([...Object.keys(currentPatient.examHistory || {}), ...getLast10Days()])).sort().reverse();

  // SUTURA 1: Unificamos os exames fixos e os customizados em uma única "espinha dorsal" para a navegação funcionar
  const allExams = [...EXAM_ROWS, ...(currentPatient.customExamRows || [])];

  // SUTURA 2: O cérebro da navegação por teclado (Cima, Baixo, Esquerda, Direita e Enter)
  const handleKeyDown = (e, rowIndex, colIndex) => {
    let nextRow = rowIndex;
    let nextCol = colIndex;
    let shouldMove = false;

    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      nextRow = rowIndex + 1;
      shouldMove = true;
    } 
    else if (e.key === 'ArrowUp') {
      nextRow = rowIndex - 1;
      shouldMove = true;
    } 
    else if (e.key === 'ArrowRight') {
      // Pula para a coluna da direita apenas se o cursor estiver no fim do texto
      if (e.target.selectionEnd === e.target.value.length) {
        nextCol = colIndex + 1;
        shouldMove = true;
      }
    } 
    else if (e.key === 'ArrowLeft') {
      // Pula para a coluna da esquerda apenas se o cursor estiver no início do texto
      if (e.target.selectionStart === 0) {
        nextCol = colIndex - 1;
        shouldMove = true;
      }
    }

    if (shouldMove) {
      const nextInput = document.getElementById(`exam-input-${nextRow}-${nextCol}`);
      if (nextInput) {
        e.preventDefault(); // Previne o pulo duplo ou rolagem da tela
        nextInput.focus();
        nextInput.select(); // Já deixa o texto selecionado para sobrescrever rápido
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col p-4 animate-fadeIn history-print-mode">
      <div id="history-print-header" className="hidden">
        <div className="flex justify-between border-b-2 border-black pb-2 mb-4">
          <span className="font-bold">PACIENTE: {currentPatient.nome?.toUpperCase()}</span>
          <span className="font-bold">LEITO: {currentPatient.leito}</span>
        </div>
      </div>
      <div className="flex justify-between items-center mb-4 pb-2 border-b">
        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
          <Table className="text-blue-600" /> Histórico Completo de Exames
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handlePrintHistory}
            className="flex items-center gap-2 bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold hover:bg-slate-300 shadow-sm transition-colors"
          >
            <Printer size={18} /> Imprimir
          </button>
          <button 
            onClick={() => setShowHistoryModal(false)}
            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
            title="Fechar Histórico"
          >
            <X size={20} strokeWidth={3} />
          </button>
        </div>
      </div>
      <div className="overflow-auto flex-1 border rounded-xl shadow-sm">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="p-3 border-b bg-slate-200 text-slate-700 sticky left-0 z-10 text-left font-black uppercase shadow-[1px_0_0_0_#cbd5e1]">
                Exame
              </th>
              {timelineDates.map((d) => (
                <th key={d} className="p-2 border-b border-l border-slate-300 min-w-[80px] text-center bg-slate-100 font-bold text-slate-700">
                  {formatDateDDMM(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allExams.map((ex, rowIndex) => {
              const isCustom = !EXAM_ROWS.includes(ex); // Verifica se é um exame customizado para colorir diferente
              
              return (
                <tr key={ex} className={`${isCustom ? "bg-yellow-50/30 hover:bg-yellow-50/80" : "hover:bg-blue-50"} transition-colors border-b last:border-0`}>
                  <td className={`p-2 border-r border-slate-200 font-bold text-slate-700 sticky left-0 shadow-[1px_0_0_0_#e2e8f0] ${isCustom ? "bg-yellow-50" : "bg-white"}`}>
                    {isCustom ? ex : formatExamName(ex)}
                  </td>
                  
                  {timelineDates.map((d, colIndex) => (
                    <td key={d} className="p-0 border-r border-slate-200">
                      <input
                        id={`exam-input-${rowIndex}-${colIndex}`}
                        className="w-full h-full text-center p-2 outline-none focus:bg-blue-100 focus:font-bold transition-colors bg-transparent"
                        disabled={!isOverviewEditable}
                        value={currentPatient.examHistory[d]?.[ex] || ""}
                        onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                        
                        // 1. BLINDAGEM DE MEMÓRIA (Evita sumir letras)
                        onChange={(e) => {
                          const val = e.target.value;
                          setPatients(prev => {
                            const up = [...prev];
                            const p = JSON.parse(JSON.stringify(up[activeTab])); // Cópia profunda
                            
                            if (!p.examHistory) p.examHistory = {};
                            if (!p.examHistory[d]) p.examHistory[d] = {};
                            p.examHistory[d][ex] = val;
                            
                            // Sincroniza os painéis principais se não for customizado
                            if (!isCustom && typeof syncLabsFromHistory === "function") {
                              up[activeTab] = syncLabsFromHistory(p);
                            } else {
                              up[activeTab] = p;
                            }
                            
                            return up;
                          });
                        }}
                        
                        // 2. AUDITORIA: Carimba exatamente o Exame e a Data!
                        onBlur={() => handleBlurSave(`Histórico Lab: Editou ${ex} (Data: ${formatDateDDMM(d)})`)}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
            
            {isOverviewEditable && (
              <tr>
                <td
                  colSpan={50} 
                  className="p-3 text-center border-t cursor-pointer bg-slate-50 hover:bg-slate-100 text-blue-600 font-bold transition-colors uppercase text-[10px]"
                  onClick={handleAddCustomExam}
                >
                  <PlusCircle size={14} className="inline mr-1" /> Adicionar Linha de Exame Específico
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HistoryModal;