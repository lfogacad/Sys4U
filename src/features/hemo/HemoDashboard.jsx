import React from 'react';
import { Filter, Printer, Edit3 } from 'lucide-react';
import { HD_TIMES, HD_SUPPLIES } from '../../constants/clinicalLists';
import { calculateAge, formatDateDDMM, getManausDateStr, safeNumber } from '../../utils/core';

const HemoDashboard = ({
  currentPatient,
  isEditable,
  updateNested,
  patients,
  activeTab,
  setPatients,
  save,
  userProfile,
  handleBlurSave // <-- Adicionado para a Caixa Preta
}) => {
  // --- SEGURANÇA DE ACESSO ---
  const isDocRole = userProfile?.role === "Médico" || userProfile?.role === "Admin";
  const isNursingRole = userProfile?.role === "Técnico" || userProfile?.role === "Enfermeiro" || userProfile?.role === "Admin";

  // --- FUNÇÕES INTERNAS DA HEMODIÁLISE ---
  const resetHDMedica = () => {
    if (window.confirm("Deseja realmente apagar a prescrição médica atual de HD?")) {
      const up = [...patients];
      const p = JSON.parse(JSON.stringify(up[activeTab]));
      p.hd_prescricao = {};
      up[activeTab] = p;
      setPatients(up);
      save(p, "Nefrologia: Limpou a Prescrição Médica de HD"); // <-- Auditado!
    }
  };

  const resetHDTecnico = () => {
    if (window.confirm("Deseja apagar os controles horários, acessos e insumos da HD atual?")) {
      const up = [...patients];
      const p = JSON.parse(JSON.stringify(up[activeTab]));
      p.hd_monitoramento = {};
      p.hd_acesso = {};
      p.hd_insumos = {};
      p.hd_balanco = {};
      p.hd_anotacoes = { nefro_texto: p.hd_anotacoes?.nefro_texto };
      up[activeTab] = p;
      setPatients(up);
      save(p, "Equipe HD: Limpou Monitoramento, Acessos e Insumos da HD"); // <-- Auditado!
    }
  };

  // Funções de digitação cegas (Apenas atualizam a memória)
  const updateHDMonitoramento = (time, campo, valor) => {
    setPatients(prev => {
      const up = [...prev];
      const p = JSON.parse(JSON.stringify(up[activeTab]));
      if (!p.hd_monitoramento) p.hd_monitoramento = {};
      if (!p.hd_monitoramento[time]) p.hd_monitoramento[time] = {};
      p.hd_monitoramento[time][campo] = valor;
      up[activeTab] = p;
      return up;
    });
  };

  const updateHDBalanco = (campo, valor) => {
    setPatients(prev => {
      const up = [...prev];
      const p = JSON.parse(JSON.stringify(up[activeTab]));
      if (!p.hd_balanco) p.hd_balanco = {};
      p.hd_balanco[campo] = valor;
      up[activeTab] = p;
      return up;
    });
  };

  const toggleHDAcessoCurativo = (item) => {
    setPatients(prev => {
      const up = [...prev];
      const p = JSON.parse(JSON.stringify(up[activeTab]));
      if (!p.hd_acesso) p.hd_acesso = {};
      let curativos = p.hd_acesso.curativo || [];
      if (curativos.includes(item)) {
        curativos = curativos.filter((c) => c !== item);
      } else {
        curativos.push(item);
      }
      p.hd_acesso.curativo = curativos;
      up[activeTab] = p;
      return up;
    });
  };

  const calcularHDEntradas = (p) => {
    let total = 0;
    if (p.hd_monitoramento) {
      Object.values(p.hd_monitoramento).forEach((hora) => {
        total += safeNumber(hora.sf) + safeNumber(hora.gh);
      });
    }
    return total;
  };

  const calcularHDBalancoFinal = (p) => {
    const entradas = calcularHDEntradas(p);
    const uf = safeNumber(p.hd_balanco?.uf_realizada);
    const saldo = entradas - uf;
    return saldo > 0 ? `+${saldo}` : saldo;
  };

  return (
    <div className="space-y-4 animate-fadeIn hd-print-container">
      <div className="hidden print:block hd-print-header text-center font-bold mb-4">
        UNIDADE DE TERAPIA INTENSIVA - HOSPITAL MUNICIPAL DE ARIQUEMES<br />
        PREFEITURA MUNICIPAL DE ARIQUEMES<br />
        PRESCRIÇÃO E MONITORAMENTO DO TRATAMENTO DIALÍTICO
      </div>

      <div className="hidden print:flex justify-between border-b-2 border-black pb-1 mb-1 font-bold text-[10px]">
        <span className="flex-1">PACIENTE: {currentPatient.nome?.toUpperCase() || "_______________________"}</span>
        <span className="w-32 text-center">IDADE: {calculateAge(currentPatient.dataNascimento) || "___"}</span>
        <span className="w-32 text-center">LEITO: {currentPatient.leito}</span>
        <span className="w-32 text-right">DATA: {formatDateDDMM(getManausDateStr())}</span>
      </div>

      <div className="flex justify-between items-center print:hidden mb-4">
        <h3 className="text-xl font-bold text-blue-800 flex items-center gap-2">
          <Filter size={20} /> Terapia Renal Substitutiva
        </h3>
        <button
          onClick={() => {
            document.body.classList.add("printing-hd");
            setTimeout(() => {
              window.print();
              setTimeout(() => document.body.classList.remove("printing-hd"), 500);
            }, 100);
          }}
          className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
        >
          <Printer size={16} /> Imprimir Ficha
        </button>
      </div>

      {/* SECÇÃO 1: PRESCRIÇÃO MÉDICA */}
      <fieldset disabled={!isDocRole && currentPatient?.leito !== 11} className="p-4 border rounded-xl bg-blue-50/30 print:border print:p-1 min-w-0 m-0 print:mb-1">
        <div className="flex justify-between items-center mb-3 print:mb-1">
          <h4 className="font-bold text-blue-800 text-sm section-title m-0">PRESCRIÇÃO MÉDICA DE HEMODIÁLISE</h4>
          <button type="button" onClick={resetHDMedica} className="print:hidden text-[10px] bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 font-bold transition-colors shadow-sm" title="Apagar todos os campos médicos">Limpar Prescrição</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 print:grid-cols-5 gap-4 print:gap-x-2 print:gap-y-1 text-xs print:text-[9px]">
          <div><label className="font-bold text-slate-500 print:text-black">Duração</label><input type="text" className="w-full p-2 print:p-0.5 border rounded" value={currentPatient.hd_prescricao?.duracao || ""} onChange={(e) => updateNested("hd_prescricao", "duracao", e.target.value)} onBlur={() => handleBlurSave("Nefrologia: Editou Duração da HD")} /></div>
          <div><label className="font-bold text-slate-500 print:text-black">Temperatura</label><input type="text" className="w-full p-2 print:p-0.5 border rounded" value={currentPatient.hd_prescricao?.temperatura || ""} onChange={(e) => updateNested("hd_prescricao", "temperatura", e.target.value)} onBlur={() => handleBlurSave("Nefrologia: Editou Temperatura da HD")} /></div>
          <div><label className="font-bold text-slate-500 print:text-black">Ultrafiltração</label><input type="text" className="w-full p-2 print:p-0.5 border rounded" value={currentPatient.hd_prescricao?.uf || ""} onChange={(e) => updateNested("hd_prescricao", "uf", e.target.value)} onBlur={() => handleBlurSave("Nefrologia: Editou Ultrafiltração Prescrita")} /></div>
          <div><label className="font-bold text-slate-500 print:text-black">Anticoagulação</label><input type="text" className="w-full p-2 print:p-0.5 border rounded" value={currentPatient.hd_prescricao?.anticoagulacao || ""} onChange={(e) => updateNested("hd_prescricao", "anticoagulacao", e.target.value)} onBlur={() => handleBlurSave("Nefrologia: Editou Anticoagulação")} /></div>
          <div><label className="font-bold text-slate-500 print:text-black">Desprezar Priming</label><input type="text" className="w-full p-2 print:p-0.5 border rounded" value={currentPatient.hd_prescricao?.priming || ""} onChange={(e) => updateNested("hd_prescricao", "priming", e.target.value)} onBlur={() => handleBlurSave("Nefrologia: Editou Priming")} /></div>
          <div><label className="font-bold text-slate-500 print:text-black">Sódio / Perfil</label><input type="text" className="w-full p-2 print:p-0.5 border rounded" value={currentPatient.hd_prescricao?.sodio || ""} onChange={(e) => updateNested("hd_prescricao", "sodio", e.target.value)} onBlur={() => handleBlurSave("Nefrologia: Editou Perfil de Sódio")} /></div>
          <div><label className="font-bold text-slate-500 print:text-black">Fluxo de Sangue</label><input type="text" className="w-full p-2 print:p-0.5 border rounded" value={currentPatient.hd_prescricao?.fluxo_sangue || ""} onChange={(e) => updateNested("hd_prescricao", "fluxo_sangue", e.target.value)} onBlur={() => handleBlurSave("Nefrologia: Editou Fluxo de Sangue (Qb)")} /></div>
          <div><label className="font-bold text-slate-500 print:text-black">Fluxo Dialisato</label><input type="text" className="w-full p-2 print:p-0.5 border rounded" value={currentPatient.hd_prescricao?.fluxo_dialisato || ""} onChange={(e) => updateNested("hd_prescricao", "fluxo_dialisato", e.target.value)} onBlur={() => handleBlurSave("Nefrologia: Editou Fluxo de Dialisato (Qd)")} /></div>
          <div className="md:col-span-2 print:col-span-1"><label className="font-bold text-slate-500 print:text-black">Dialisador</label><input type="text" className="w-full p-2 print:p-0.5 border rounded" value={currentPatient.hd_prescricao?.dialisador || ""} onChange={(e) => updateNested("hd_prescricao", "dialisador", e.target.value)} onBlur={() => handleBlurSave("Nefrologia: Editou Dialisador")} /></div>
          <div className="md:col-span-2 print:col-span-5"><label className="font-bold text-slate-500 print:text-black">Observação</label><input type="text" className="w-full p-2 print:p-0.5 border rounded" value={currentPatient.hd_prescricao?.obs || ""} onChange={(e) => updateNested("hd_prescricao", "obs", e.target.value)} onBlur={() => handleBlurSave("Nefrologia: Editou Observação Médica da HD")} /></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 print:grid-cols-5 gap-2 print:gap-1 mt-4 print:mt-1 pt-2 border-t print:border-none text-[10px] print:text-[8px]">
          <div><label className="text-slate-500 print:text-black font-bold block mb-1">Nefrologista</label><input type="text" className="w-full p-1 print:p-0 border-b print:border-b" value={currentPatient.hd_prescricao?.nefro || ""} onChange={(e) => updateNested("hd_prescricao", "nefro", e.target.value)} onBlur={() => handleBlurSave("HD: Editou Nome do Nefrologista")} /></div>
          <div><label className="text-slate-500 print:text-black font-bold block mb-1">Téc. Nefrologia</label><input type="text" className="w-full p-1 print:p-0 border-b print:border-b" value={currentPatient.hd_prescricao?.tec_nefro || ""} onChange={(e) => updateNested("hd_prescricao", "tec_nefro", e.target.value)} onBlur={() => handleBlurSave("HD: Editou Nome do Técnico de Nefro")} /></div>
          <div><label className="text-slate-500 print:text-black font-bold block mb-1">Plantonista Manhã</label><input type="text" className="w-full p-1 print:p-0 border-b print:border-b" value={currentPatient.hd_prescricao?.plant_m || ""} onChange={(e) => updateNested("hd_prescricao", "plant_m", e.target.value)} onBlur={() => handleBlurSave("HD: Editou Plantonista Manhã")} /></div>
          <div><label className="text-slate-500 print:text-black font-bold block mb-1">Plantonista Tarde</label><input type="text" className="w-full p-1 print:p-0 border-b print:border-b" value={currentPatient.hd_prescricao?.plant_t || ""} onChange={(e) => updateNested("hd_prescricao", "plant_t", e.target.value)} onBlur={() => handleBlurSave("HD: Editou Plantonista Tarde")} /></div>
          <div><label className="text-slate-500 print:text-black font-bold block mb-1">Plantonista Noite</label><input type="text" className="w-full p-1 print:p-0 border-b print:border-b" value={currentPatient.hd_prescricao?.plant_n || ""} onChange={(e) => updateNested("hd_prescricao", "plant_n", e.target.value)} onBlur={() => handleBlurSave("HD: Editou Plantonista Noite")} /></div>
        </div>
      </fieldset>

      {/* SECÇÃO 2: MONITORAMENTO HORÁRIO */}
      <fieldset disabled={!isEditable && currentPatient?.leito !== 11} className="min-w-0 border-0 p-0 m-0 mt-4">
        <div className="flex justify-between items-center mb-2 print:hidden">
          <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">CONTROLES E ANOTAÇÕES DA ENFERMAGEM</h4>
          <button type="button" onClick={resetHDTecnico} className="print:hidden text-[10px] bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 font-bold transition-colors shadow-sm" title="Apagar monitoramento, balanço, acessos e insumos">Limpar Tudo (Técnico)</button>
        </div>
        <div className="overflow-x-auto border rounded-xl print:border-none print:mt-2">
          <table className="w-full text-xs text-center border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-200">
                <th className="p-2 print:p-0.5 border w-12 font-bold">HORÁRIO</th>
                <th className="p-2 print:p-0.5 border">PA</th>
                <th className="p-2 print:p-0.5 border">PAM</th>
                <th className="p-2 print:p-0.5 border">FC</th>
                <th className="p-2 print:p-0.5 border">Glic.</th>
                <th className="p-2 print:p-0.5 border">Ins. R</th>
                <th className="p-2 print:p-0.5 border">Nora</th>
                <th className="p-2 print:p-0.5 border">S.F. 0,9%</th>
                <th className="p-2 print:p-0.5 border text-blue-700">GH 50%</th>
              </tr>
            </thead>
            <tbody>
              {HD_TIMES.map((time) => (
                <tr key={time} className="hover:bg-slate-50">
                  <td className="p-1 print:p-0 border font-bold text-slate-600 bg-slate-50">{time}</td>
                  {["pa", "pam", "fc", "glic", "ins", "nora", "sf", "gh"].map((campo) => (
                    <td key={campo} className="p-0 border print:overflow-visible">
                      <input 
                        type="text" 
                        className="w-full h-full text-center outline-none bg-transparent focus:bg-blue-50 p-1 print:hidden" 
                        value={currentPatient.hd_monitoramento?.[time]?.[campo] || ""} 
                        onChange={(e) => updateHDMonitoramento(time, campo, e.target.value)} 
                        onBlur={() => handleBlurSave(`HD Controle: Editou ${campo.toUpperCase()} às ${time}`)} 
                      />
                      <span className="hidden print:block text-center text-[8px] w-full align-middle">{currentPatient.hd_monitoramento?.[time]?.[campo] || ""}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </fieldset>

      {/* LINHA DE ENTRADAS, UF REALIZADA E BH FINAL */}
      <fieldset disabled={!isEditable && currentPatient?.leito !== 11} className="grid grid-cols-3 gap-4 print:gap-2 print:my-1 mt-4">
        <div className="flex flex-col items-center justify-center bg-green-50 print:bg-white p-2 print:p-0.5 rounded border border-green-200 print:border-black">
          <span className="font-bold text-green-800 print:text-black text-xs print:text-[10px]">ENTRADAS</span>
          <input type="text" readOnly className="w-full bg-transparent border-none print:hidden outline-none text-base text-center font-bold text-green-700 cursor-not-allowed" value={calcularHDEntradas(currentPatient)} title="Soma automática das colunas S.F. 0,9% e GH 50%" />
          <span className="hidden print:inline-block text-[10px] w-full text-center font-bold">{calcularHDEntradas(currentPatient)}</span>
        </div>
        <div className="flex flex-col items-center justify-center bg-orange-50 print:bg-white p-2 print:p-0.5 rounded border border-orange-200 print:border-black shadow-sm">
          <span className="font-bold text-orange-800 print:text-black text-xs print:text-[10px]">UF REALIZADA</span>
          <input 
            type="number" 
            className="w-full bg-white border border-orange-300 print:hidden outline-none text-base text-center font-bold text-orange-700 rounded mt-1 p-1 focus:ring-2 focus:ring-orange-400" 
            value={currentPatient.hd_balanco?.uf_realizada || ""} 
            onChange={(e) => updateHDBalanco("uf_realizada", e.target.value)} 
            onBlur={() => handleBlurSave("HD Balanço: Editou UF Realizada")}
            placeholder="Ex: 2000" 
            title="Ultrafiltração efetivamente realizada pela enfermagem" 
          />
          <span className="hidden print:inline-block text-[10px] w-full text-center font-bold">{currentPatient.hd_balanco?.uf_realizada || ""}</span>
        </div>
        <div className="flex flex-col items-center justify-center bg-blue-50 print:bg-white p-2 print:p-0.5 rounded border border-blue-200 print:border-black">
          <span className="font-bold text-blue-800 print:text-black text-xs print:text-[10px]">BH FINAL</span>
          <input type="text" readOnly className="w-full bg-transparent border-none print:hidden outline-none text-base text-center font-bold text-blue-700 cursor-not-allowed" value={calcularHDBalancoFinal(currentPatient)} title="Entradas Totais subtraídas da UF Realizada" />
          <span className="hidden print:inline-block text-[10px] w-full text-center font-bold">{calcularHDBalancoFinal(currentPatient)}</span>
        </div>
      </fieldset>

      <div className="hidden print:block force-print-break"></div>

      {/* SECÇÃO 3 E 4: ACESSO VASCULAR E INSUMOS */}
      <fieldset disabled={!isEditable && currentPatient?.leito !== 11} className="flex flex-col md:grid md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2 w-full overflow-hidden">
        
        {/* BLOCO 1: ACESSO VASCULAR */}
        <div className="border rounded-xl p-4 print:p-2 bg-white w-full">
          <h4 className="font-bold text-slate-700 mb-3 text-sm section-title text-center md:text-left">ACESSO VASCULAR</h4>
          <div className="space-y-3 text-xs w-full">
            
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2 items-start sm:items-center">
              <label className="font-bold text-slate-600">FAV</label>
              <select className="w-full sm:col-span-2 p-1.5 border rounded bg-slate-50 outline-none" value={currentPatient.hd_acesso?.fav_local || ""} onChange={(e) => updateNested("hd_acesso", "fav_local", e.target.value)} onBlur={() => handleBlurSave("HD Acesso: Editou Local da FAV")}>
                <option value="">Local...</option><option value="MSD">MSD</option><option value="MSE">MSE</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 items-start sm:items-center">
                <label className="font-bold text-slate-600">Frêmito</label>
                <select className="w-full p-1.5 border rounded outline-none" value={currentPatient.hd_acesso?.fremito || ""} onChange={(e) => updateNested("hd_acesso", "fremito", e.target.value)} onBlur={() => handleBlurSave("HD Acesso: Avaliou Frêmito")}><option value="">-</option><option value="SIM">SIM</option><option value="NÃO">NÃO</option></select>
              </div>
              <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 items-start sm:items-center">
                <label className="font-bold text-slate-600">Punção</label>
                <select className="w-full p-1.5 border rounded outline-none" value={currentPatient.hd_acesso?.puncao || ""} onChange={(e) => updateNested("hd_acesso", "puncao", e.target.value)} onBlur={() => handleBlurSave("HD Acesso: Avaliou Punção")}><option value="">-</option><option value="FÁCIL">FÁCIL</option><option value="DIFÍCIL">DIFÍCIL</option></select>
              </div>
            </div>
            
            <hr className="my-2 border-dashed border-slate-200" />
            
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2 items-start sm:items-center">
              <label className="font-bold text-slate-600">CATÉTER</label>
              <select className="w-full sm:col-span-2 p-1.5 border rounded bg-slate-50 outline-none" value={currentPatient.hd_acesso?.cateter_tipo || ""} onChange={(e) => updateNested("hd_acesso", "cateter_tipo", e.target.value)} onBlur={() => handleBlurSave("HD Acesso: Selecionou Tipo de Catéter")}>
                <option value="">Tipo...</option><option value="DUPLO LUMEN">DUPLO LUMEN</option><option value="TRIPLO LUMEN">TRIPLO LUMEN</option><option value="PERMICATH">PERMICATH</option>
              </select>
            </div>
            
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2 items-start sm:items-center">
              <label className="font-bold text-slate-600">Local</label>
              <select className="w-full sm:col-span-2 p-1.5 border rounded outline-none" value={currentPatient.hd_acesso?.cateter_local || ""} onChange={(e) => updateNested("hd_acesso", "cateter_local", e.target.value)} onBlur={() => handleBlurSave("HD Acesso: Definiu Local do Catéter")}>
                <option value="">-</option><option value="VJID">VJID</option><option value="VJIE">VJIE</option><option value="VSCD">VSCD</option><option value="VSCE">VSCE</option><option value="VFID">VFID</option><option value="VFIE">VFIE</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Inserção</label>
                <input type="date" className="w-full p-1.5 border rounded outline-none" value={currentPatient.hd_acesso?.insercao || ""} onChange={(e) => updateNested("hd_acesso", "insercao", e.target.value)} onBlur={() => handleBlurSave("HD Acesso: Inseriu Data do Catéter")} />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Fluxo</label>
                <select className="w-full p-1.5 border rounded outline-none" value={currentPatient.hd_acesso?.fluxo || ""} onChange={(e) => updateNested("hd_acesso", "fluxo", e.target.value)} onBlur={() => handleBlurSave("HD Acesso: Avaliou Fluxo do Catéter")}><option value="">-</option><option value="BOM">BOM</option><option value="RUIM">RUIM</option><option value="AUSENTE">AUSENTE</option></select>
              </div>
            </div>
            
            <div>
              <label className="font-bold text-slate-600 block mb-1">Local Prévio</label>
              <input type="text" className="w-full p-1.5 border rounded outline-none" value={currentPatient.hd_acesso?.previo || ""} onChange={(e) => updateNested("hd_acesso", "previo", e.target.value)} onBlur={() => handleBlurSave("HD Acesso: Editou Local Prévio")} />
            </div>
            
            <hr className="my-2 border-dashed border-slate-200" />
            
            <div>
              <label className="font-bold text-slate-600 block mb-2 text-center md:text-left">Curativo</label>
              <div className="grid grid-cols-2 gap-y-2 gap-x-1 text-[10px]">
                {["Limpo", "Hiperemia", "Secreção Serosa", "Sanguinolenta", "Purulenta", "Sem ponto"].map((c) => (
                  <label key={c} className="flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 p-1 rounded">
                    <input type="checkbox" checked={currentPatient.hd_acesso?.curativo?.includes(c) || false} onChange={() => toggleHDAcessoCurativo(c)} onBlur={() => handleBlurSave(`HD Acesso: Alterou aspecto do Curativo (${c})`)} className="w-3 h-3 text-blue-600" /> 
                    <span className="truncate">{c.toUpperCase()}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="pt-2">
              <label className="font-bold text-slate-600 block mb-1">Intercorrências</label>
              <textarea className="w-full p-2 border rounded h-16 outline-none resize-none" value={currentPatient.hd_acesso?.intercorrencias || ""} onChange={(e) => updateNested("hd_acesso", "intercorrencias", e.target.value)} onBlur={() => handleBlurSave("HD Acesso: Editou Intercorrências do Acesso")}></textarea>
            </div>
          </div>
        </div>

        {/* BLOCO 2: INSUMOS E ANOTAÇÕES */}
        <div className="flex flex-col gap-4 print:gap-2 w-full">
          
          <div className="border rounded-xl p-4 print:p-2 bg-white flex-1 w-full">
            <h4 className="font-bold text-slate-700 mb-3 text-sm section-title text-center md:text-left">INSUMOS</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-[10px]">
              {HD_SUPPLIES.map((item) => item.id !== "vazio" ? (
                <div key={item.id} className="flex justify-between items-center border-b pb-1">
                  <span className="truncate pr-2 text-slate-600">{item.label}</span>
                  <input type="number" className="w-12 text-center border rounded outline-none p-0.5 focus:bg-blue-50 focus:border-blue-300" value={currentPatient.hd_insumos?.[item.id] || ""} onChange={(e) => updateNested("hd_insumos", item.id, e.target.value)} onBlur={() => handleBlurSave(`HD Insumos: Alterou Quantidade de ${item.label}`)} />
                </div>
              ) : (<div key="vazio" className="hidden sm:block"></div>))}
            </div>
          </div>
          
          <div className="border rounded-xl p-4 print:p-2 bg-yellow-50/50 flex-1 w-full">
            <h4 className="font-bold text-slate-700 mb-3 text-sm section-title text-center md:text-left">ANOTAÇÕES DE ENFERMAGEM</h4>
            
            <div className="flex flex-col sm:flex-row justify-between gap-3 mb-3 text-xs">
              <div className="flex items-center gap-2 justify-between sm:justify-start w-full sm:w-auto">
                <label className="font-bold text-slate-600">INÍCIO:</label>
                <input type="time" className="p-1.5 border rounded bg-white w-24 text-center outline-none focus:ring-2 focus:ring-blue-200" value={currentPatient.hd_anotacoes?.inicio || ""} onChange={(e) => updateNested("hd_anotacoes", "inicio", e.target.value)} onBlur={() => handleBlurSave("HD Enfermagem: Editou Horário de Início")} />
              </div>
              <div className="flex items-center gap-2 justify-between sm:justify-start w-full sm:w-auto">
                <label className="font-bold text-slate-600">TÉRMINO:</label>
                <input type="time" className="p-1.5 border rounded bg-white w-24 text-center outline-none focus:ring-2 focus:ring-blue-200" value={currentPatient.hd_anotacoes?.termino || ""} onChange={(e) => updateNested("hd_anotacoes", "termino", e.target.value)} onBlur={() => handleBlurSave("HD Enfermagem: Editou Horário de Término")} />
              </div>
            </div>
            
            <textarea className="w-full h-24 p-2 border rounded outline-none text-xs bg-white mb-3 resize-none focus:ring-2 focus:ring-blue-100" placeholder="Evolução de enfermagem..." value={currentPatient.hd_anotacoes?.texto || ""} onChange={(e) => updateNested("hd_anotacoes", "texto", e.target.value)} onBlur={() => handleBlurSave("HD Enfermagem: Editou Anotações/Evolução")}></textarea>
            
            <div className="flex items-center gap-2 text-xs">
              <label className="font-bold text-slate-600 whitespace-nowrap">TÉCNICO(A):</label>
              <input type="text" className="flex-1 min-w-0 p-1 border-b border-slate-300 bg-transparent outline-none focus:border-blue-400" value={currentPatient.hd_anotacoes?.tecnico || ""} onChange={(e) => updateNested("hd_anotacoes", "tecnico", e.target.value)} onBlur={() => handleBlurSave("HD Enfermagem: Editou Nome do Técnico Responsável")} />
            </div>
          </div>
        
        </div>
      </fieldset>

      {/* SECÇÃO 5: ANOTAÇÕES DA NEFROLOGIA (NÃO IMPRIME) */}
      <fieldset disabled={!isDocRole && currentPatient?.leito !== 11} className="mt-4 p-4 border rounded-xl bg-white shadow-sm print:hidden">
        <h4 className="font-bold text-blue-800 mb-2 text-sm flex items-center gap-2"><Edit3 size={16} /> Anotações da Nefrologia</h4>
        <textarea className="w-full h-24 p-3 border rounded-lg outline-none text-sm bg-slate-50 focus:bg-white transition-colors focus:ring-2 focus:ring-blue-100" placeholder="Evolução diária da nefrologia, intercorrências, ajustes de prescrição..." value={currentPatient.hd_anotacoes?.nefro_texto || ""} onChange={(e) => updateNested("hd_anotacoes", "nefro_texto", e.target.value)} onBlur={() => handleBlurSave("Nefrologia: Editou Anotações Gerais")}></textarea>
      </fieldset>
    </div>
  );
};

export default HemoDashboard;