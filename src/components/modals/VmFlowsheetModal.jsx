import React, { useEffect, useRef } from 'react';
import { Activity, X, Printer } from 'lucide-react';

const VmFlowsheetModal = ({
  showVmFlowsheet,
  setShowVmFlowsheet,
  currentPatient,
  handleAddVmEntry,
  updateVmEntry,
  handleBlurSave,
  getDaysD1,
  getTempoVMText,
  updateNested
}) => {
  if (!showVmFlowsheet) return null;

  const getEntryTime = (entry) => entry?.dataHora || "Horário Indefinido";
  const hasAutoAddedRef = useRef(false);

  // ==============================================================
  // CÃO DE GUARDA DEFINITIVO (AGORA COM TRAVA DE SUPORTE === "VM")
  // ==============================================================
  useEffect(() => {
    if (!showVmFlowsheet || !currentPatient?.id) return;

    const checkAndAddNewDayColumn = () => {
      // 👇 A NOVA TRAVA: Só prossegue se o suporte for estritamente "VM"
      const isPacienteEmVM = currentPatient.physio?.suporte === "VM";

      if (!isPacienteEmVM) {
        console.log("Sistema: Paciente não está em VM. Criação automática de coluna abortada.");
        return; 
      }

      const now = new Date();
      const todayStamp = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
      const storageKey = `vm_col_added_${currentPatient.id}`;
      
      const lastAddedDate = localStorage.getItem(storageKey);
      if (lastAddedDate === todayStamp) return; 

      const flowsheet = currentPatient.physio?.vmFlowsheet || [];
      if (flowsheet.length > 0) {
        const lastEntry = flowsheet[flowsheet.length - 1]; 
        const lastDate = lastEntry?.dataHora?.split(' ')[0]; 
        if (lastDate) {
           const [d, m, y] = lastDate.split('/');
           const lastEntryStamp = `${parseInt(d)}/${parseInt(m)}/${y}`;
           if (lastEntryStamp === todayStamp) {
             localStorage.setItem(storageKey, todayStamp);
             return;
           }
        }
      }

      console.log("Sistema: Paciente em VM. Virada de dia confirmada. Criando a coluna de hoje.");
      if (typeof handleAddVmEntry === 'function') handleAddVmEntry();
      localStorage.setItem(storageKey, todayStamp);
    };

    checkAndAddNewDayColumn();
    const interval = setInterval(checkAndAddNewDayColumn, 300000);
    return () => clearInterval(interval);

  }, [showVmFlowsheet, currentPatient?.id, currentPatient?.physio?.suporte]); 

  const displayVmEntries = [...(currentPatient.physio?.vmFlowsheet || [])].reverse();

  // ==============================================================
  // GERADOR DE IMPRESSÃO (TÉCNICA DO BH - 14 COLUNAS POR PÁGINA)
  // ==============================================================
  const handleCustomPrintVM = () => {
    const printWindow = window.open("", "_blank");
    
    // 👇 AJUSTES CSS PARA 14 COLUNAS E PRIMEIRA COLUNA MAIS LARGA
    let html = `<html><head><title>Mapa de VM - ${currentPatient.nome || 'Paciente'}</title>
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      body { font-family: Arial, sans-serif; font-size: 8px; margin: 0; padding: 0; color: #000; }
      .title-center { text-align: center; font-size: 16px; margin-bottom: 5px; font-weight: bold; text-transform: uppercase; }
      .header { display: flex; justify-content: space-between; border-bottom: 2px solid black; padding-bottom: 4px; margin-bottom: 12px; font-weight: bold; font-size: 11px; text-transform: uppercase; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed; }
      
      /* Fonte tamanho 8 para caber tudo. nowrap corta o texto se não couber. */
      th, td { border: 1px solid #000; padding: 3px 1px; text-align: center; overflow: hidden; white-space: nowrap; font-size: 8px; }
      th { background-color: #334155; color: white; font-weight: bold; }
      
      /* 👇 A MÁGICA AQUI: Primeira coluna usa 16% do espaço. white-space: normal permite quebrar linha se for muito grande */
      .col-item { width: 8%; text-align: left; padding-left: 4px; font-weight: bold; background-color: #f1f5f9; color: #000; white-space: normal; line-height: 1.1; }
      
      /* Cada uma das 14 colunas de dados usará exatos 6% da folha */
      .col-data { width: 6,5%; }
      
      .page-break { page-break-after: always; }
      .bg-blue { background-color: #eff6ff; }
      .bg-amber { background-color: #fffbeb; }
    </style></head><body>`;

    const rowsDef = [
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
      { key: 'p01', label: 'P 0.1' },
      { key: 'irrs', label: 'IRRS (Tobin)' }
    ];

    // 👇 CHUNK CRAVADO EM 10 COLUNAS
    const chunkSize = 10;
    const totalChunks = Math.ceil(displayVmEntries.length / chunkSize) || 1;

    for (let i = 0; i < totalChunks; i++) {
      const chunk = displayVmEntries.slice(i * chunkSize, (i + 1) * chunkSize);

      if (i > 0) html += `<div class="page-break"></div>`;

      html += `<div class="title-center">Mapa de Ventilação Mecânica</div>`;
      html += `<div class="header">
        <span>PACIENTE: ${currentPatient.nome || "___________________"}</span>
        <span>LEITO: ${currentPatient.leito || "___"}</span>
        <span>PÁGINA ${i + 1} DE ${totalChunks}</span>
      </div>`;

      html += `<table><thead><tr><th class="col-item" style="color: white; background-color: #334155;">PARÂMETROS</th>`;
      
      // Cabeçalho de Datas
      chunk.forEach(entry => {
        html += `<th class="col-data">${entry.dataHora || "-"}</th>`;
      });
      // Completa com vazio para manter o tamanho exato de 14 colunas
      for (let j = chunk.length; j < chunkSize; j++) html += `<th class="col-data">-</th>`;
      html += `</tr></thead><tbody>`;

      // Preenche as linhas
      rowsDef.forEach(row => {
        let cssClass = "";
        if (row.key === 'dp') cssClass = "bg-amber";
        if (row.key === 'cst' || row.key === 'cdin' || row.key === 'diasUti' || row.key === 'diasVm') cssClass = "bg-blue";

        html += `<tr><td class="col-item">${row.label}</td>`;
        
        chunk.forEach(entry => {
          let val = "-";
          if (row.key === 'cuff_row') val = `${entry.cuffM || '-'} / ${entry.cuffT || '-'} / ${entry.cuffN || '-'}`;
          else if (row.key === 'despertar_row') val = entry.despertarS ? 'Sim' : entry.despertarN ? 'Não' : '-';
          else if (row.key === 'fr_row') val = `${entry.frSet || '-'} / ${entry.frTotal || '-'}`;
          else if (row.key === 'diasUti') val = entry.diasUti || (typeof getDaysD1 === 'function' ? getDaysD1(currentPatient.dataInternacao || currentPatient.dataAdmissao) : "-");
          else if (row.key === 'diasVm') val = entry.diasVm || (typeof getTempoVMText === 'function' ? getTempoVMText(currentPatient) : "-");
          else val = entry[row.key] || "-";

          html += `<td class="${cssClass}">${val}</td>`;
        });

        for (let j = chunk.length; j < chunkSize; j++) html += `<td></td>`;
        
        html += `</tr>`;
      });

      html += `</tbody></table>`;
    }

    html += `</body></html>`;
    
    printWindow.document.write(html);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[90] flex justify-center items-center p-4">
      <div className="bg-white w-full max-w-7xl rounded-2xl shadow-2xl flex flex-col h-[90vh] overflow-hidden animate-fadeIn">
        
        <div className="p-3 md:p-4 bg-slate-800 flex justify-between items-center shrink-0">
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

        <div className="p-4 flex-1 overflow-hidden bg-slate-50 relative flex flex-col">
          
          <div className="mb-4 flex justify-between items-center sticky left-0 shrink-0">
            <p className="text-sm text-slate-600 font-bold">Registro de Parâmetros Contínuos <span className="text-[10px] text-cyan-600 ml-2">(Mais recente à esquerda)</span></p>
            <div className="flex gap-2">
              
              <button
                onClick={handleCustomPrintVM}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow transition-colors flex items-center gap-2"
                title="Imprimir Mapa de VM (Formato A4 - 14 Colunas)"
              >
                <Printer size={16} /> Imprimir Relatório
              </button>
              
              <button
                onClick={handleAddVmEntry}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-lg shadow transition-colors"
              >
                + Adicionar Coluna (Puxar Horário Atual)
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto border border-slate-300 rounded-lg shadow-sm bg-white relative">
            <table className="w-max min-w-full text-[10px] text-center whitespace-nowrap">
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
                  { key: 'p01', label: 'P 0.1' },
                  { key: 'irrs', label: 'IRRS (Tobin)' }
                ].map((rowDef) => (
                  <tr key={rowDef.key} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                    <td className="sticky left-0 bg-slate-200 p-2 font-bold text-slate-800 border-r border-slate-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] z-10 w-40 text-left">
                      {rowDef.label}
                    </td>
                    
                    {displayVmEntries.map((entry, displayIndex) => {
                      const totalItems = currentPatient.physio?.vmFlowsheet?.length || 0;
                      const realIndex = totalItems - 1 - displayIndex;

                      return (
                        <td key={entry.id || displayIndex} className="p-1 border-r border-slate-200 min-w-[120px]">
                          {rowDef.key === 'cuff_row' ? (
                            <div className="flex gap-1 justify-center">
                              <input type="text" inputMode="numeric" className="w-8 p-1 border rounded text-center text-[10px] outline-none focus:ring-1 focus:ring-cyan-400" placeholder="M" value={entry.cuffM || ""} onChange={(e) => updateVmEntry(realIndex, 'cuffM', e.target.value)} onBlur={(e) => { if (realIndex === totalItems - 1 && typeof updateNested === 'function') updateNested("physio", "cuffM", e.target.value); handleBlurSave(`Mapa VM: Editou Pressão Cuff (Manhã) - Coluna ${getEntryTime(entry)}`); }} />
                              <input type="text" inputMode="numeric" className="w-8 p-1 border rounded text-center text-[10px] outline-none focus:ring-1 focus:ring-cyan-400" placeholder="T" value={entry.cuffT || ""} onChange={(e) => updateVmEntry(realIndex, 'cuffT', e.target.value)} onBlur={(e) => { if (realIndex === totalItems - 1 && typeof updateNested === 'function') updateNested("physio", "cuffT", e.target.value); handleBlurSave(`Mapa VM: Editou Pressão Cuff (Tarde) - Coluna ${getEntryTime(entry)}`); }} />
                              <input type="text" inputMode="numeric" className="w-8 p-1 border rounded text-center text-[10px] outline-none focus:ring-1 focus:ring-cyan-400" placeholder="N" value={entry.cuffN || ""} onChange={(e) => updateVmEntry(realIndex, 'cuffN', e.target.value)} onBlur={(e) => { if (realIndex === totalItems - 1 && typeof updateNested === 'function') updateNested("physio", "cuffN", e.target.value); handleBlurSave(`Mapa VM: Editou Pressão Cuff (Noite) - Coluna ${getEntryTime(entry)}`); }} />
                            </div>
                          ) : rowDef.key === 'diasUti' ? (
                            <input type="text" className="w-full p-1 border rounded text-center text-[11px] outline-none bg-blue-50/50 font-bold text-slate-700 focus:ring-1 focus:ring-cyan-400" value={entry.diasUti || (typeof getDaysD1 === 'function' ? getDaysD1(currentPatient.dataInternacao || currentPatient.dataAdmissao) : "")} onChange={(e) => updateVmEntry(realIndex, rowDef.key, e.target.value)} onBlur={() => handleBlurSave(`Mapa VM: Editou Dias UTI - Coluna ${getEntryTime(entry)}`)} />
                          ) : rowDef.key === 'diasVm' ? (
                            <input type="text" className="w-full p-1 border rounded text-center text-[11px] outline-none bg-cyan-50/50 font-bold text-slate-700 focus:ring-1 focus:ring-cyan-400" value={entry.diasVm || (typeof getTempoVMText === 'function' ? getTempoVMText(currentPatient) : "")} onChange={(e) => updateVmEntry(realIndex, rowDef.key, e.target.value)} onBlur={() => handleBlurSave(`Mapa VM: Editou Dias VM - Coluna ${getEntryTime(entry)}`)} />
                          ) : rowDef.key === 'despertar_row' ? (
                            <div className="flex gap-2 justify-center font-bold text-[9px]">
                              <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={entry.despertarS || false} onChange={(e) => updateVmEntry(realIndex, 'despertarS', e.target.checked)} onBlur={() => handleBlurSave(`Mapa VM: Avaliou Despertar Diário (Sim) - Coluna ${getEntryTime(entry)}`)} /> S</label>
                              <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={entry.despertarN || false} onChange={(e) => updateVmEntry(realIndex, 'despertarN', e.target.checked)} onBlur={() => handleBlurSave(`Mapa VM: Avaliou Despertar Diário (Não) - Coluna ${getEntryTime(entry)}`)} /> N</label>
                            </div>
                          ) : rowDef.key === 'fr_row' ? (
                            <div className="flex gap-1 justify-center items-center">
                              <input className="w-10 p-1 border rounded text-center text-[10px]" placeholder="Set" value={entry.frSet || ""} onChange={(e) => updateVmEntry(realIndex, 'frSet', e.target.value)} onBlur={() => handleBlurSave(`Mapa VM: Editou FR Setada - Coluna ${getEntryTime(entry)}`)} />
                              <span>/</span>
                              <input className="w-10 p-1 border rounded text-center text-[10px]" placeholder="Tot" value={entry.frTotal || ""} onChange={(e) => updateVmEntry(realIndex, 'frTotal', e.target.value)} onBlur={() => handleBlurSave(`Mapa VM: Editou FR Total - Coluna ${getEntryTime(entry)}`)} />
                            </div>
                          ) : (
                            <input type="text" className={`w-full p-1 border rounded text-center text-[11px] outline-none focus:ring-1 focus:ring-cyan-400 ${rowDef.key === 'dp' ? 'bg-amber-100 font-bold text-amber-900' : ''} ${rowDef.key === 'cst' || rowDef.key === 'cdin' ? 'bg-blue-50 font-bold' : ''}`} value={entry[rowDef.key] || ""} onChange={(e) => updateVmEntry(realIndex, rowDef.key, e.target.value)} onBlur={() => handleBlurSave(`Mapa VM: Editou ${rowDef.label} - Coluna ${getEntryTime(entry)}`)} />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="p-3 bg-slate-100 border-t flex justify-end shrink-0">
           <button onClick={() => setShowVmFlowsheet(false)} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 transition-colors">Fechar Mapa</button>
        </div>
      </div>
    </div>
  );
};

export default VmFlowsheetModal;