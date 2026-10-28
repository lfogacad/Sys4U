import React, { useState, useRef } from 'react';
import { Activity, X, Printer, Plus, Wind, Save } from 'lucide-react';

const VmFlowsheetModal = ({
  showVmFlowsheet,
  setShowVmFlowsheet,
  currentPatient,
  handleAddVmEntry,
  updateVmEntry,
  handleBlurSave,
  getDaysD1,
  getTempoVMText,
  updateNested,
  excluirColunaVm
}) => {
  if (!showVmFlowsheet) return null;

  // ===== ESTADO LOCAL DO MODAL =====
  // Fonte da verdade é o array copiado. Nada é persistido até "Salvar e Fechar".
  const [vmDraft, setVmDraft] = useState(() =>
    JSON.parse(JSON.stringify(currentPatient?.physio?.vmFlowsheet || []))
  );
  const [colunasExcluidas, setColunasExcluidas] = useState([]);
  const [colunasAdicionadas, setColunasAdicionadas] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const originalRef = useRef(
    JSON.parse(JSON.stringify(currentPatient?.physio?.vmFlowsheet || []))
  );

  const getEntryTime = (entry) => entry?.dataHora || "Horário Indefinido";
  const suporteAtual = currentPatient?.physio?.suporte || "Ar Ambiente";

  // Ordem de exibição: mais recente à esquerda
  const displayVmEntries = [...vmDraft].reverse();

  // ===== EDIÇÃO EM RASCUNHO (sem persistência) =====
  const setCell = (id, key, value) => {
    setVmDraft(prev =>
      prev.map(e => (e.id === id ? { ...e, [key]: value } : e))
    );
  };

  const draftInput = (entry, key, label, extra = {}) => (
    <input
      type={extra.type || "text"}
      inputMode={extra.inputMode}
      className={extra.className || "w-full p-1 border rounded text-center text-[11px] outline-none focus:ring-1 focus:ring-cyan-400"}
      placeholder={extra.placeholder || ""}
      value={entry[key] || ""}
      onChange={(e) => setCell(entry.id, key, e.target.value)}
    />
  );

  const draftCheckbox = (entry, key, label, text) => (
    <label className="flex items-center gap-1 cursor-pointer">
      <input
        type="checkbox"
        checked={!!entry[key]}
        onChange={(e) => setCell(entry.id, key, e.target.checked)}
      /> {text}
    </label>
  );

  const draftTextarea = (entry, key, label, extra = {}) => (
    <textarea
      className={extra.className || "w-full p-1 border rounded text-[10px] outline-none focus:ring-1 focus:ring-cyan-400 resize-none overflow-hidden min-h-[28px] leading-tight"}
      value={entry[key] || ""}
      onChange={(e) => {
        setCell(entry.id, key, e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
      }}
      placeholder={extra.placeholder || ""}
      rows={1}
      onInput={(e) => {
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
      }}
    />
  );

  // ===== LINHAS =====
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

  // ===== ADICIONAR COLUNA (local) =====
  const adicionarColunaLocal = () => {
    const agora = new Date();
    const dd = String(agora.getDate()).padStart(2, '0');
    const mm = String(agora.getMonth() + 1).padStart(2, '0');
    const hh = String(agora.getHours()).padStart(2, '0');
    const mi = String(agora.getMinutes()).padStart(2, '0');
    const novo = {
      id: String(Date.now()),
      dataHora: `${dd}/${mm} - ${hh}:${mi}`,
      suporte: currentPatient?.physio?.suporte || "",
      diasUti: currentPatient?.physio?.diasUti || "",
      diasVm: currentPatient?.physio?.diasVm || "",
      modo: "", fluxo: "", fio2: "", pc: "", vc: "", vtPc: "", ps: "", vm: "",
      fluxoInsp: "", tInsp: "", ie: "", frSet: "", frTotal: "", peep: "",
      pPico: "", pPlato: "", dp: "", cst: "", cdin: "", rva: "", autoPeep: "",
      p01: "", irrs: "", satO2: "", etco2: "", ajustesDia: "",
      cuffM: "", cuffT: "", cuffN: "",
      despertarS: false, despertarN: false
    };
    setVmDraft(prev => [...prev, novo]);
    setColunasAdicionadas(prev => [...prev, novo.id]);
  };

  // ===== EXCLUIR COLUNA (local) =====
  const excluirColunaLocal = (entry) => {
    if (!window.confirm(`Excluir a coluna "${entry.dataHora}"? Todos os dados dessa avaliação serão perdidos.`)) return;
    setVmDraft(prev => prev.filter(e => e.id !== entry.id));
    // Se foi uma coluna que já existia no servidor, marcar para exclusão
    if (originalRef.current.some(e => e.id === entry.id)) {
      setColunasExcluidas(prev => [...prev, entry.id]);
    }
  };

  // ===== SALVAR E FECHAR =====
  const handleSalvarEFechar = async () => {
    setSalvando(true);
    setErro(null);

    try {
      // 1) Exclusões: remove pelo id no array do pai
      for (const id of colunasExcluidas) {
        const alvo = originalRef.current.find(e => e.id === id);
        if (alvo && typeof excluirColunaVm === 'function') {
          excluirColunaVm(alvo);
        }
      }

      // 2) Inclusões: usa handleAddVmEntry para cada coluna nova
      const adicionadas = vmDraft.filter(e => colunasAdicionadas.includes(e.id));
      for (const nova of adicionadas) {
        if (typeof handleAddVmEntry === 'function') {
          handleAddVmEntry(nova);
        }
      }

      // 3) Edições: para cada célula alterada, chama updateVmEntry
      //    (somente em colunas que já existiam no servidor)
      const listaAtual = currentPatient?.physio?.vmFlowsheet || [];
      for (const entry of vmDraft) {
        const original = originalRef.current.find(o => o.id === entry.id);
        if (!original) continue; // foi adicionada agora, já tratada acima

        const idx = listaAtual.findIndex(e => e.id === entry.id);
        if (idx < 0) continue;

        Object.keys(entry).forEach((key) => {
          if (key === 'id') return;
          const antes = original[key];
          const depois = entry[key];
          const mudou = typeof depois === 'boolean'
            ? !!antes !== !!depois
            : String(antes ?? '') !== String(depois ?? '');
          if (mudou) {
            updateVmEntry(idx, key, depois);
          }
        });
      }

      if (typeof handleBlurSave === 'function') {
        handleBlurSave("Mapa SV: Salvou alterações do Mapa Ventilatório");
      }

      setShowVmFlowsheet(false);
    } catch (e) {
      console.error("[SYS4U] Erro ao salvar Mapa Ventilatório:", e);
      setErro("Não foi possível salvar. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  // ===== IMPRESSÃO =====
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
        <div className="p-3 md:p-4 bg-slate-800 flex justify-center items-center shrink-0">
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
                onClick={adicionarColunaLocal}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-lg shadow transition-colors"
              >
                + Adicionar Coluna
              </button>
            </div>
          </div>

          {erro && (
            <p className="mb-2 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded p-2">{erro}</p>
          )}

          <div className="flex-1 overflow-auto border border-slate-300 rounded-lg shadow-sm bg-white relative">
            <table className="w-max min-w-full text-[10px] text-center whitespace-nowrap">
              <tbody>
                {rowsDef.map((rowDef) => (
                  <tr key={rowDef.key} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                    <td className="sticky left-0 bg-slate-200 p-2 font-bold text-slate-800 border-r border-slate-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] z-10 w-40 text-left">
                      {rowDef.label}
                    </td>
                    {displayVmEntries.map((entry, displayIndex) => {
                      const realIndex = vmDraft.length - 1 - displayIndex;
                      return (
                        <td key={entry.id || `col-${realIndex}`} className={`p-1 border-r border-slate-200 ${rowDef.key === 'ajustesDia' ? 'min-w-[250px]' : 'min-w-[120px]'}`}>
                          {rowDef.key === 'dataHora' ? (
                            <div className="flex items-center justify-center gap-1 px-1">
                              <span className="text-[10px] font-bold text-slate-700 truncate">
                                {entry.dataHora || "-"}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  excluirColunaLocal(entry);
                                }}
                                className="text-slate-400 hover:text-red-600 transition-colors shrink-0 p-0.5"
                                title="Excluir esta coluna"
                              >
                                <X size={11} />
                              </button>
                            </div>
                          ) : rowDef.key === 'cuff_row' ? (
                            <div className="flex gap-1 justify-center">
                              {draftInput(entry, 'cuffM', 'Pressão Cuff (Manhã)', {
                                type: 'text', inputMode: 'numeric', placeholder: 'M',
                                className: 'w-8 p-1 border rounded text-center text-[10px] outline-none focus:ring-1 focus:ring-cyan-400'
                              })}
                              {draftInput(entry, 'cuffT', 'Pressão Cuff (Tarde)', {
                                type: 'text', inputMode: 'numeric', placeholder: 'T',
                                className: 'w-8 p-1 border rounded text-center text-[10px] outline-none focus:ring-1 focus:ring-cyan-400'
                              })}
                              {draftInput(entry, 'cuffN', 'Pressão Cuff (Noite)', {
                                type: 'text', inputMode: 'numeric', placeholder: 'N',
                                className: 'w-8 p-1 border rounded text-center text-[10px] outline-none focus:ring-1 focus:ring-cyan-400'
                              })}
                            </div>
                          ) : rowDef.key === 'diasUti' ? (
                            draftInput(entry, 'diasUti', 'Dias UTI', {
                              className: 'w-full p-1 border rounded text-center text-[11px] outline-none bg-blue-50/50 font-bold text-slate-700 focus:ring-1 focus:ring-cyan-400'
                            })
                          ) : rowDef.key === 'suporte' ? (
                            draftInput(entry, 'suporte', 'Suporte Ventilatório', {
                              placeholder: 'VM / VNI / CN / Venturi...',
                              className: 'w-full p-1 border rounded text-center text-[11px] outline-none focus:ring-1 focus:ring-cyan-400 bg-purple-50 font-bold text-purple-800'
                            })
                          ) : rowDef.key === 'diasVm' ? (
                            draftInput(entry, 'diasVm', 'Dias Suporte Vent.', {
                              className: 'w-full p-1 border rounded text-center text-[11px] outline-none bg-cyan-50/50 font-bold text-slate-700 focus:ring-1 focus:ring-cyan-400'
                            })
                          ) : rowDef.key === 'despertar_row' ? (
                            <div className="flex gap-2 justify-center font-bold text-[9px]">
                              {draftCheckbox(entry, 'despertarS', 'Despertar Diário (Sim)', 'S')}
                              {draftCheckbox(entry, 'despertarN', 'Despertar Diário (Não)', 'N')}
                            </div>
                          ) : rowDef.key === 'fr_row' ? (
                            <div className="flex gap-1 justify-center items-center">
                              {draftInput(entry, 'frSet', 'FR Setada', { placeholder: 'Set', className: 'w-10 p-1 border rounded text-center text-[10px]' })}
                              <span>/</span>
                              {draftInput(entry, 'frTotal', 'FR Total', { placeholder: 'Tot', className: 'w-10 p-1 border rounded text-center text-[10px]' })}
                            </div>
                          ) : rowDef.key === 'fluxo' ? (
                            draftInput(entry, 'fluxo', 'Fluxo', { placeholder: 'L/min' })
                          ) : rowDef.key === 'dispositivo' ? (
                            draftInput(entry, 'dispositivo', 'Dispositivo', { placeholder: 'Tipo...' })
                          ) : rowDef.key === 'satO2' ? (
                            draftInput(entry, 'satO2', 'SatO2', { placeholder: '%' })
                          ) : rowDef.key === 'ajustesDia' ? (
                            draftTextarea(entry, 'ajustesDia', 'Ajustes do Dia', { placeholder: 'Digite os ajustes...' })
                          ) : (
                            draftInput(entry, rowDef.key, rowDef.label, {
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

        <div className="p-3 bg-slate-100 border-t flex justify-end items-center gap-2 shrink-0">
          {salvando && <span className="text-xs font-bold text-cyan-700 mr-2">Salvando...</span>}
          <button
            onClick={() => {
              if (window.confirm("Descartar as alterações não salvas?")) {
                setShowVmFlowsheet(false);
              }
            }}
            disabled={salvando}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Descartar
          </button>
          <button
            onClick={handleSalvarEFechar}
            disabled={salvando}
            className="px-6 py-2 bg-cyan-700 text-white rounded-lg font-bold hover:bg-cyan-800 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={16} /> {salvando ? "Salvando..." : "Salvar e Fechar"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VmFlowsheetModal;