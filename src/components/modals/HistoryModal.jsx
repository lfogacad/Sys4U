import React from 'react';
import { Table, Printer, X, PlusCircle } from 'lucide-react';
import { calculateAge, getManausDateStr } from '../../utils/core';

const HistoryModal = ({
  showHistoryModal,
  setShowHistoryModal,
  currentPatient,
  handlePrintHistory, 
  formatDateDDMM,
  getLast10Days,
  EXAM_ROWS,
  formatExamName,
  isDocRole,
  patients,
  activeTab,
  setPatients,
  syncLabsFromHistory,
  save,
  handleBlurSave,
  handleAddCustomExam
}) => {
  if (!showHistoryModal) return null;

  // 👇 SUTURA BLINDADA: Filtra qualquer variação de erro, espaço ou nulo que venha do banco
  const timelineDates = Array.from(new Set([...Object.keys(currentPatient.examHistory || {}), ...getLast10Days()]))
    .filter(d => {
      if (d == null) return false; // Mata nulos reais
      const textoLimpo = String(d).trim().toLowerCase();
      // Mata strings vazias, "undefined", "null", "nan" (com ou sem espaços)
      return textoLimpo !== "" && textoLimpo !== "undefined" && textoLimpo !== "null" && textoLimpo !== "nan";
    })
    .sort()
    .reverse();

  // Unificamos os exames fixos e os customizados em uma única "espinha dorsal" para a navegação funcionar
  const allExams = [...EXAM_ROWS, ...(currentPatient.customExamRows || [])];

  // O cérebro da navegação por teclado (Cima, Baixo, Esquerda, Direita e Enter)
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
      if (e.target.selectionEnd === e.target.value.length) {
        nextCol = colIndex + 1;
        shouldMove = true;
      }
    } 
    else if (e.key === 'ArrowLeft') {
      if (e.target.selectionStart === 0) {
        nextCol = colIndex - 1;
        shouldMove = true;
      }
    }

    if (shouldMove) {
      const nextInput = document.getElementById(`exam-input-${nextRow}-${nextCol}`);
      if (nextInput) {
        e.preventDefault();
        nextInput.focus();
        nextInput.select();
      }
    }
  };

  // ==============================================================
  // GERADOR DE PDF DE EXAMES - MULTI-PÁGINA (12 COLUNAS)
  // ==============================================================
  const handleCustomPrintHistory = () => {
    const printWindow = window.open("", "_blank");
    
    const datesWithData = timelineDates.filter(d => {
      const dia = currentPatient.examHistory?.[d];
      return dia && Object.values(dia).some(val => val !== "" && val !== null);
    });

    if (datesWithData.length === 0) {
      alert("Não há dados de exames preenchidos para imprimir.");
      return;
    }

    // 👇 SUTURA 2: Agora imprime 14 dias por folha
    const columnsPerPage = 14;
    const dateChunks = [];
    for (let i = 0; i < datesWithData.length; i += columnsPerPage) {
      dateChunks.push(datesWithData.slice(i, i + columnsPerPage));
    }

    // AJUSTE FINO NO CSS: Reduzimos a fonte e os espaçamentos das células para caber as 14 colunas sem encavalar
    let html = `<html><head><title>Histórico de Exames - Leito ${currentPatient.leito}</title>
    <style>
      @page { size: A4 landscape; margin: 8mm; } 
      body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #000; }
      .header { display: flex; justify-content: space-between; border-bottom: 2px solid black; padding-bottom: 5px; margin-bottom: 8px; font-weight: bold; font-size: 11px; text-transform: uppercase; }
      .page-break { page-break-after: always; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 15px; table-layout: fixed; }
      
      /* Células levemente menores (7.5px) e com padding super espremido (2px 1px) */
      th, td { border: 1px solid #444; padding: 2px 1px; text-align: center; height: 14px; overflow: hidden; white-space: nowrap; font-size: 7.5px; }
      th { background-color: #eee; font-weight: bold; font-size: 8px; }
      
      /* Coluna do Exame ocupa 13% e o restante é dividido para os 14 dias */
      .col-item { width: 13%; text-align: left; padding-left: 3px; font-weight: bold; background-color: #fafafa; font-size: 8px; }
      
      .page-footer { text-align: right; font-size: 8px; color: #666; margin-bottom: 10px; }
      tr:nth-child(even) td { background-color: #f9f9f9; }
      tr.custom-exam td { background-color: #fffde7; }
      tr.custom-exam .col-item { background-color: #fff9c4; }
    </style></head><body>`;

    const age = calculateAge(currentPatient.dataNascimento) || "__";

    dateChunks.forEach((chunk, index) => {
      html += `<div class="header">
        <span>PACIENTE: ${currentPatient.nome?.toUpperCase() || "___________________"}</span>
        <span>IDADE: ${age}a</span>
        <span>LEITO: ${currentPatient.leito}</span>
        <span>PÁGINA: ${index + 1} / ${dateChunks.length}</span>
      </div>`;

      html += `<div class="page-footer">Período nesta folha: ${formatDateDDMM(chunk[chunk.length-1])} a ${formatDateDDMM(chunk[0])}</div>`;

      html += `<table><thead><tr><th class="col-item">EXAME</th>`;
      
      chunk.forEach(d => {
        html += `<th>${formatDateDDMM(d)}</th>`;
      });
      html += `</tr></thead><tbody>`;

      allExams.forEach(ex => {
        const isCustom = !EXAM_ROWS.includes(ex);
        const examName = isCustom ? ex : formatExamName(ex);
        const rowClass = isCustom ? 'class="custom-exam"' : '';
        
        html += `<tr ${rowClass}><td class="col-item">${examName}</td>`;
        
        chunk.forEach(d => {
          const val = currentPatient.examHistory?.[d]?.[ex] || "";
          html += `<td>${val}</td>`;
        });
        html += `</tr>`;
      });

      html += `</tbody></table>`;

      if (index < dateChunks.length - 1) {
        html += `<div class="page-break"></div>`;
      }
    });

    html += `</body></html>`;
    
    printWindow.document.write(html);
    printWindow.document.close();
    
    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
    }, 250);
  };

 return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col p-4 animate-fadeIn history-print-mode">
      <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-200">
        
        {/* LADO ESQUERDO: TÍTULO E IDENTIFICAÇÃO DO PACIENTE */}
        <div className="flex flex-col gap-1.5">
          <h2 className="text-xl font-black flex items-center gap-2 text-slate-800 uppercase tracking-tight">
            <Table className="text-blue-600" size={24} /> Histórico de Exames
          </h2>
          
          <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
            <span className="bg-slate-800 text-white px-2.5 py-0.5 rounded shadow-sm text-xs uppercase tracking-wider">
              Leito {currentPatient?.leito || (activeTab + 1)}
            </span>
            <span className="truncate max-w-[400px]" title={currentPatient?.nome}>
              {currentPatient?.nome || "Paciente não identificado"}
            </span>
          </div>
        </div>

        {/* LADO DIREITO: BOTÕES DE AÇÃO */}
        <div className="flex gap-3 items-center">
          <button 
            onClick={handleCustomPrintHistory} 
            className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-sm uppercase tracking-wide"
          >
            <Printer size={16} /> Imprimir Histórico
          </button>
          <button 
            onClick={() => setShowHistoryModal(false)}
            className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-100"
            title="Fechar Histórico"
          >
            <X size={20} strokeWidth={2.5} />
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
              const isCustom = !EXAM_ROWS.includes(ex);
              
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
                        disabled={!isDocRole}
                        value={currentPatient.examHistory[d]?.[ex] || ""}
                        onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPatients(prev => {
                            const up = [...prev];
                            const p = JSON.parse(JSON.stringify(up[activeTab]));
                            
                            if (!p.examHistory) p.examHistory = {};
                            if (!p.examHistory[d]) p.examHistory[d] = {};
                            p.examHistory[d][ex] = val;
                            
                            if (!isCustom && typeof syncLabsFromHistory === "function") {
                              up[activeTab] = syncLabsFromHistory(p);
                            } else {
                              up[activeTab] = p;
                            }
                            
                            return up;
                          });
                        }}
                        onBlur={() => handleBlurSave(`Histórico Lab: Editou ${ex} (Data: ${formatDateDDMM(d)})`)}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
            
            {isDocRole && (
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