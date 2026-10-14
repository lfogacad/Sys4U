import React, { useState } from 'react';
import { Activity, X, Printer, Plus, Wind } from 'lucide-react';



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

  const [vmDraft, setVmDraft] = useState({}); // { "realIndex:key": "valor" } — células em edição

  const getEntryTime = (entry) => entry?.dataHora || "Horário Indefinido";
  // Determina o tipo de suporte atual
  const suporteAtual = currentPatient?.physio?.suporte || "Ar Ambiente"; 

  const displayVmEntries = [...(currentPatient.physio?.vmFlowsheet || [])].reverse();

  // ===== HELPERS DE INPUT COM RASCUNHO LOCAL =====
  // O que está sendo digitado tem precedência sobre snapshots → nada "apaga" durante a escrita.
  // A gravação acontece APENAS no onBlur (via updateVmEntry + handleBlurSave).

  const draftInput = (realIndex, entry, key, label, extra = {}) => {
    const k = `${realIndex}:${key}`;
    const draftVal = vmDraft[k];
    return (
      <input
        type={extra.type || "text"}
        inputMode={extra.inputMode}
        className={extra.className || "w-full p-1 border rounded text-center text-[11px] outline-none focus:ring-1 focus:ring-cyan-400"}
        placeholder={extra.placeholder || ""}
        value={draftVal !== undefined ? draftVal : (entry[key] || "")}
        onChange={(e) => setVmDraft(prev => ({ ...prev, [k]: e.target.value }))}
        onBlur={(e) => {
          const val = e.target.value;
          if (val !== (entry[key] || "")) {
            updateVmEntry(realIndex, key, val);
            if (extra.onBlurExtra) extra.onBlurExtra(val);
            handleBlurSave(`Mapa SV: Editou ${label} - Coluna ${getEntryTime(entry)}`);
          }
          setVmDraft(prev => { const n = { ...prev }; delete n[k]; return n; });
        }}
      />
    );
  };

  const draftCheckbox = (realIndex, entry, key, label, text) => {
    const k = `${realIndex}:${key}`;
    const draftVal = vmDraft[k];
    return (
      <label className="flex items-center gap-1 cursor-pointer">
        <input
          type="checkbox"
          checked={draftVal !== undefined ? draftVal : !!entry[key]}
          onChange={(e) => setVmDraft(prev => ({ ...prev, [k]: e.target.checked }))}
          onBlur={(e) => {
            const val = e.target.checked;
            if (val !== !!entry[key]) {
              updateVmEntry(realIndex, key, val);
              handleBlurSave(`Mapa SV: Avaliou ${label} - Coluna ${getEntryTime(entry)}`);
            }
            setVmDraft(prev => { const n = { ...prev }; delete n[k]; return n; });
          }}
        /> {text}
      </label>
    );
  };

  const draftTextarea = (realIndex, entry, key, label, extra = {}) => {
    const k = `${realIndex}:${key}`;
    const draftVal = vmDraft[k];
    return (
      <textarea
        className={extra.className || "w-full p-1 border rounded text-[10px] outline-none focus:ring-1 focus:ring-cyan-400 resize-none overflow-hidden min-h-[28px] leading-tight"}
        value={draftVal !== undefined ? draftVal : (entry[key] || "")}
        onChange={(e) => {
          setVmDraft(prev => ({ ...prev, [k]: e.target.value }));
          e.target.style.height = 'auto';
          e.target.style.height = e.target.scrollHeight + 'px';
        }}
        onBlur={(e) => {
          const val = e.target.value;
          if (val !== (entry[key] || "")) {
            updateVmEntry(realIndex, key, val);
            handleBlurSave(`Mapa SV: Editou ${label} - Coluna ${getEntryTime(entry)}`);
          }
          setVmDraft(prev => { const n = { ...prev }; delete n[k]; return n; });
        }}
        placeholder={extra.placeholder || ""}
        rows={1}
        onInput={(e) => {
          e.target.style.height = 'auto';
          e.target.style.height = e.target.scrollHeight + 'px';
        }}
      />
    );
  };

  // ==============================================================
  // DEFINIÇÃO DAS LINHAS POR TIPO DE SUPORTE
  // ==============================================================
const getRowsBySuporte = () => {
  return [
    { key: 'dataHora', label: 'Data / Hora' },
    { key: 'diasUti', label: 'Dias UTI' },
    { key: 'suporte', label: 'Suporte Ventilatório' },
    { key: 'diasVm', label: 'Dias de VM' },
    { key: 'cuff_row', label: 'Pressão Cuff (M/T/N)' },
    { key: 'despertar_row', label: 'Despertar Diário' },
    { key: 'modo', label: 'MODO' },
    { key: 'fluxo', label: 'Fluxo (L/min)' },
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
    { key: 'irrs', label: 'IRRS (Tobin)' },
    { key: 'satO2', label: 'SatO2 (%)' },
    { key: 'etco2', label: 'EtCO2 (mmHg)' },
    { key: 'ajustesDia', label: 'Ajustes do Dia' }
  ];
};

  const rowsDef = getRowsBySuporte();

  // ==============================================================
  // GERADOR DE IMPRESSÃO
  // ==============================================================
  const handleCustomPrintVM = () => {
    const printWindow = window.open("", "_blank");
    
    let html = `<html><head><title>Mapa de Suporte Ventilatório - ${currentPatient.nome || 'Paciente'}</title>
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      body { font-family: Arial, sans-serif; font-size: 8px; margin: 0; padding: 0; color: #000; }
      .title-center { text-align: center; font-size: 16px; margin-bottom: 5px; font-weight: bold; text-transform: uppercase; }
      .header { display: flex; justify-content: space-between; border-bottom: 2px solid black; padding-bottom: 4px; margin-bottom: 12px; font-weight: bold; font-size: 11px; text-transform: uppercase; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed; }
      th, td { border: 1px solid #000; padding: 3px 1px; text-align: center; overflow: hidden; white-space: nowrap; font-size: 8px; }
      th { background-color: #334155; color: white; font-weight: bold; }
      .col-item { width: 12%; text-align: left; padding-left: 4px; font-weight: bold; background-color: #f1f5f9; color: #000; white-space: normal; line-height: 1.1; }
      .col-data { width: 8%; }
      .page-break { page-break-after: always; }
      .bg-blue { background-color: #eff6ff; }
      .bg-amber { background-color: #fffbeb; }
      .suporte-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
    </style></head><body>`;

    const chunkSize = 10;
    const totalChunks = Math.ceil(displayVmEntries.length / chunkSize) || 1;

    for (let i = 0; i < totalChunks; i++) {
      const chunk = displayVmEntries.slice(i * chunkSize, (i + 1) * chunkSize);

      if (i > 0) html += `<div class="page-break"></div>`;

      html += `<div class="title-center">Mapa de Suporte Ventilatório</div>`;
      html += `<div class="header">
        <span>PACIENTE: ${currentPatient.nome || "___________________"}</span>
        <span>LEITO: ${currentPatient.leito || "___"}</span>
        <span>SUPORTE: ${suporteAtual}</span>
        <span>PÁGINA ${i + 1} DE ${totalChunks}</span>
      </div>`;

      html += `<table><thead><tr><th class="col-item" style="color: white; background-color: #334155;">PARÂMETROS</th>`;
      
      chunk.forEach(entry => {
        html += `<th class="col-data">${entry.dataHora || "-"}</th>`;
      });
      for (let j = chunk.length; j < chunkSize; j++) html += `<th class="col-data">-</th>`;
      html += `</tr></thead><tbody>`;

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
              Mapa de Suporte Ventilatório
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs md:text-sm text-slate-300 font-bold truncate">
                Paciente: {currentPatient.nome || "Não identificado"}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                suporteAtual === 'VM' ? 'bg-red-100 text-red-700' :
                suporteAtual === 'VNI' ? 'bg-amber-100 text-amber-700' :
                suporteAtual === 'Cateter Nasal' || suporteAtual === 'Venturi' ? 'bg-green-100 text-green-700' :
                'bg-slate-100 text-slate-700'
              }`}>
                <Wind size={12} className="inline mr-1" />
                {suporteAtual}
              </span>
            </div>
          </div>
          <button onClick={() => setShowVmFlowsheet(false)} className="p-2 hover:bg-slate-700 rounded-full transition-colors text-white/70 hover:text-white shrink-0">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-hidden bg-slate-50 relative flex flex-col">
          
          <div className="mb-4 flex justify-between items-center sticky left-0 shrink-0 flex-wrap gap-2">
            <p className="text-sm text-slate-600 font-bold">
              Registro de Parâmetros <span className="text-[10px] text-cyan-600 ml-2">(Mais recente à esquerda)</span>
            </p>
            <div className="flex gap-2 flex-wrap">
              
              <button
                onClick={handleCustomPrintVM}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow transition-colors flex items-center gap-2"
                title="Imprimir Mapa de Suporte Ventilatório"
              >
                <Printer size={16} /> Imprimir Relatório
              </button>
              
              <button
                onClick={handleAddVmEntry}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-lg shadow transition-colors"
              >
                + Adicionar Coluna
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto border border-slate-300 rounded-lg shadow-sm bg-white relative">
            <table className="w-max min-w-full text-[10px] text-center whitespace-nowrap">
              <tbody>
                {rowsDef.map((rowDef) => (
                  <tr key={rowDef.key} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                    <td className="sticky left-0 bg-slate-200 p-2 font-bold text-slate-800 border-r border-slate-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] z-10 w-40 text-left">
                      {rowDef.label}
                    </td>
                    
                    {displayVmEntries.map((entry, displayIndex) => {
                      const totalItems = currentPatient.physio?.vmFlowsheet?.length || 0;
                      const realIndex = totalItems - 1 - displayIndex;

                      return (
                        <td key={entry.id || displayIndex} className={`p-1 border-r border-slate-200 ${rowDef.key === 'ajustesDia' ? 'min-w-[250px]' : 'min-w-[120px]'}`}>
                          {rowDef.key === 'cuff_row' ? (
                            <div className="flex gap-1 justify-center">
                              {draftInput(realIndex, entry, 'cuffM', 'Pressão Cuff (Manhã)', {
                                type: 'text', inputMode: 'numeric', placeholder: 'M',
                                className: 'w-8 p-1 border rounded text-center text-[10px] outline-none focus:ring-1 focus:ring-cyan-400',
                                onBlurExtra: (val) => { if (realIndex === totalItems - 1 && typeof updateNested === 'function') updateNested("physio", "cuffM", val); }
                              })}
                              {draftInput(realIndex, entry, 'cuffT', 'Pressão Cuff (Tarde)', {
                                type: 'text', inputMode: 'numeric', placeholder: 'T',
                                className: 'w-8 p-1 border rounded text-center text-[10px] outline-none focus:ring-1 focus:ring-cyan-400',
                                onBlurExtra: (val) => { if (realIndex === totalItems - 1 && typeof updateNested === 'function') updateNested("physio", "cuffT", val); }
                              })}
                              {draftInput(realIndex, entry, 'cuffN', 'Pressão Cuff (Noite)', {
                                type: 'text', inputMode: 'numeric', placeholder: 'N',
                                className: 'w-8 p-1 border rounded text-center text-[10px] outline-none focus:ring-1 focus:ring-cyan-400',
                                onBlurExtra: (val) => { if (realIndex === totalItems - 1 && typeof updateNested === 'function') updateNested("physio", "cuffN", val); }
                              })}
                            </div>
                          ) : rowDef.key === 'diasUti' ? (
                            draftInput(realIndex, entry, 'diasUti', 'Dias UTI', {
                              className: 'w-full p-1 border rounded text-center text-[11px] outline-none bg-blue-50/50 font-bold text-slate-700 focus:ring-1 focus:ring-cyan-400'
                            })
                          ) : rowDef.key === 'suporte' ? (
                            draftInput(realIndex, entry, 'suporte', 'Suporte Ventilatório', {
                              placeholder: 'VM / VNI / CN / Venturi...',
                              className: 'w-full p-1 border rounded text-center text-[11px] outline-none focus:ring-1 focus:ring-cyan-400 bg-purple-50 font-bold text-purple-800'
                            })
                          ) : rowDef.key === 'diasVm' ? (
                            draftInput(realIndex, entry, 'diasVm', 'Dias Suporte Vent.', {
                              className: 'w-full p-1 border rounded text-center text-[11px] outline-none bg-cyan-50/50 font-bold text-slate-700 focus:ring-1 focus:ring-cyan-400'
                            })
                          ) : rowDef.key === 'despertar_row' ? (
                            <div className="flex gap-2 justify-center font-bold text-[9px]">
                              {draftCheckbox(realIndex, entry, 'despertarS', 'Despertar Diário (Sim)', 'S')}
                              {draftCheckbox(realIndex, entry, 'despertarN', 'Despertar Diário (Não)', 'N')}
                            </div>
                          ) : rowDef.key === 'fr_row' ? (
                            <div className="flex gap-1 justify-center items-center">
                              {draftInput(realIndex, entry, 'frSet', 'FR Setada', { placeholder: 'Set', className: 'w-10 p-1 border rounded text-center text-[10px]' })}
                              <span>/</span>
                              {draftInput(realIndex, entry, 'frTotal', 'FR Total', { placeholder: 'Tot', className: 'w-10 p-1 border rounded text-center text-[10px]' })}
                            </div>
                          ) : rowDef.key === 'fluxo' ? (
                            draftInput(realIndex, entry, 'fluxo', 'Fluxo', { placeholder: 'L/min' })
                          ) : rowDef.key === 'dispositivo' ? (
                            draftInput(realIndex, entry, 'dispositivo', 'Dispositivo', { placeholder: 'Tipo...' })
                          ) : rowDef.key === 'satO2' ? (
                            draftInput(realIndex, entry, 'satO2', 'SatO2', { placeholder: '%' })
                          ) : rowDef.key === 'ajustesDia' ? (
                            draftTextarea(realIndex, entry, 'ajustesDia', 'Ajustes do Dia', { placeholder: 'Digite os ajustes...' })
                          ) : (
                            draftInput(realIndex, entry, rowDef.key, rowDef.label, {
                              className: `w-full p-1 border rounded text-center text-[11px] outline-none focus:ring-1 focus:ring-cyan-400 ${rowDef.key === 'dp' ? 'bg-amber-100 font-bold text-amber-900' : ''} ${rowDef.key === 'cst' || rowDef.key === 'cdin' ? 'bg-blue-50 font-bold' : ''}`
                            })
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