import React from 'react';
import { UserPlus, X, Activity, Stethoscope, FileText, Lock } from 'lucide-react';
import { GLASGOW_AO, GLASGOW_RV, GLASGOW_RM, RASS_OPTS, OPCOES_DVA, OPCOES_SEDATIVOS } from '../../constants/clinicalLists';

const MedicalAdmissionModal = ({
  showAdmissionModal,
  setShowAdmissionModal,
  activeTab,
  admissionData,
  setAdmissionData,
  toggleSAPSComorbidade,
  handleFinalizeAdmission,
  isReadOnly // <-- NOVA PROP: O Cofre
}) => {
  if (!showAdmissionModal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-[80] flex items-center justify-center p-2 md:p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto flex flex-col shadow-2xl">
        
        {/* CABEÇALHO DINÂMICO */}
        <div className={`p-4 text-white flex justify-between items-center sticky top-0 z-10 shadow ${isReadOnly ? 'bg-slate-700' : 'bg-blue-600'}`}>
          <h3 className="font-bold flex items-center gap-2 text-lg">
            {isReadOnly ? <Lock size={20} /> : <UserPlus size={20} />} 
            Admissão Médica (Leito {activeTab + 1})
            {isReadOnly && <span className="ml-2 text-xs bg-slate-800 px-2 py-1 rounded-full uppercase tracking-wider">Imutável (Apenas Leitura)</span>}
          </h3>
          <button onClick={() => setShowAdmissionModal(false)} className="hover:bg-black/20 p-1 rounded transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* CORPO DO MODAL */}
        <div className={`p-6 space-y-6 ${isReadOnly ? 'opacity-90 pointer-events-none' : ''}`}>
          
          <div className="grid md:grid-cols-12 gap-4">
            {/* CAMPOS PERMANENTEMENTE BLOQUEADOS (Vêm do Cadastro) */}
            <div className="md:col-span-5">
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome Completo</label>
              <input type="text" disabled className="w-full p-3 border border-slate-200 bg-slate-100 rounded-lg outline-none font-bold text-slate-500 cursor-not-allowed" placeholder="Nome do paciente..." value={admissionData.nome || ""} />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Data Nasc.</label>
              <input type="date" disabled className="w-full p-3 border border-slate-200 bg-slate-100 rounded-lg outline-none font-bold text-slate-500 cursor-not-allowed" value={admissionData.dataNascimento || ""} />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Sexo</label>
              <select disabled className="w-full p-3 border border-slate-200 bg-slate-100 rounded-lg outline-none font-bold text-slate-500 cursor-not-allowed" value={admissionData.sexo || ""}>
                <option value="">-</option>
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
            </div>
            
            {/* CAMPO LIVRE */}
            <div className="md:col-span-3">
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Origem da Admissão</label>
              <input type="text" disabled={isReadOnly} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-700 bg-white" placeholder="Setor/Hospital..." value={admissionData.origem || ""} onChange={(e) => setAdmissionData({ ...admissionData, origem: e.target.value })} />
            </div>
          </div>

          {/* DADOS PARA SAPS 3 (OBRIGATÓRIOS) */}
          <div className="border border-purple-200 rounded-xl p-4 bg-purple-50/30">
            <h4 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
              <Activity size={16} /> Fatores SAPS 3 Pré-Admissão
            </h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block font-bold mb-1 text-purple-700">Tempo de Internação Pré-UTI <span className="text-red-500">*</span></label>
                <select disabled={isReadOnly} className="w-full p-2 border rounded" value={admissionData.saps_dias || ""} onChange={(e) => setAdmissionData({ ...admissionData, saps_dias: e.target.value })}>
                  <option value="">Selecione...</option>
                  <option value="< 14 dias">Menos de 14 dias</option>
                  <option value="14 a 27 dias">De 14 a 27 dias</option>
                  <option value="≥28 dias">28 dias ou mais</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1 text-purple-700">Local de Origem <span className="text-red-500">*</span></label>
                <select disabled={isReadOnly} className="w-full p-2 border rounded" value={admissionData.saps_origem || ""} onChange={(e) => setAdmissionData({ ...admissionData, saps_origem: e.target.value })}>
                  <option value="">Selecione...</option>
                  <option value="Emergência/Outra UTI">Emergência / Outra UTI</option>
                  <option value="Enfermarias">Enfermarias</option>
                  <option value="Recuperação Pós-Anestésica">Recuperação Pós-Anestésica</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1 text-purple-700">Tipo de Admissão <span className="text-red-500">*</span></label>
                <select disabled={isReadOnly} className="w-full p-2 border rounded" value={admissionData.saps_motivo || ""} onChange={(e) => setAdmissionData({ ...admissionData, saps_motivo: e.target.value })}>
                  <option value="">Selecione...</option>
                  <option value="Médica">Médica</option>
                  <option value="Cirúrgica Eletiva">Cirúrgica Eletiva</option>
                  <option value="Cirúrgica de Urgência">Cirúrgica de Urgência</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1 text-purple-700">Sistema / Razão <span className="text-red-500">*</span></label>
                <select disabled={isReadOnly} className="w-full p-2 border rounded" value={admissionData.saps_sistema || ""} onChange={(e) => setAdmissionData({ ...admissionData, saps_sistema: e.target.value })}>
                  <option value="">Selecione...</option>
                  <option value="Gastrointestinal / Digestivo">Gastrointestinal / Digestivo</option>
                  <option value="Cardiovascular">Cardiovascular</option>
                  <option value="Respiratório">Respiratório</option>
                  <option value="Geniturinário / Renal">Geniturinário / Renal</option>
                  <option value="Neurológico">Neurológico</option>
                  <option value="Hematológico">Hematológico</option>
                  <option value="Trauma (Não-Neurológico)">Trauma (Não-Neurológico)</option>
                  <option value="Outros / Diversos">Outros / Diversos</option>
                  <option value="Metabólico / Endócrino">Metabólico / Endócrino</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2 md:col-span-2">
                <div>
                  <label className="block font-bold mb-1 text-purple-700">Infecção na Admissão? <span className="text-red-500">*</span></label>
                  <select disabled={isReadOnly} className="w-full p-2 border rounded" value={admissionData.saps_infeccao || ""} onChange={(e) => setAdmissionData({ ...admissionData, saps_infeccao: e.target.value })}>
                    <option value="">Selecione...</option>
                    <option value="Não">Ausente</option>
                    <option value="Sim">Presente</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1 text-purple-700">Se sim, qual o Sítio?</label>
                  <select className="w-full p-2 border rounded disabled:opacity-50" disabled={admissionData.saps_infeccao !== "Sim" || isReadOnly} value={admissionData.saps_sitioInfeccao || ""} onChange={(e) => setAdmissionData({ ...admissionData, saps_sitioInfeccao: e.target.value })}>
                    <option value="">Selecione...</option>
                    <option value="Respiratório">Respiratório</option>
                    <option value="Outros focos">Outros focos</option>
                  </select>
                </div>
              </div>
              <div className="md:col-span-2 flex flex-col sm:flex-row gap-4 mt-2">
                <label className="flex items-center gap-2 font-bold text-red-700 bg-white px-3 py-2 border rounded-lg shadow-sm cursor-pointer">
                  <input type="checkbox" disabled={isReadOnly} checked={admissionData.saps_cirurgiaUrgente || false} onChange={(e) => setAdmissionData({ ...admissionData, saps_cirurgiaUrgente: e.target.checked })} /> Cirurgia Urgente? (+5 pts)
                </label>
                <label className="flex items-center gap-2 font-bold text-red-700 bg-white px-3 py-2 border rounded-lg shadow-sm cursor-pointer">
                  <input type="checkbox" disabled={isReadOnly} checked={admissionData.saps_imunossupressao || false} onChange={(e) => setAdmissionData({ ...admissionData, saps_imunossupressao: e.target.checked })} /> Imunossupressão Prévia? (+3 pts)
                </label>
              </div>
              <div className="md:col-span-2 mt-2">
                <label className="block font-bold mb-2 text-purple-700">Comorbidades (SAPS 3)</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {["Câncer Sólido", "Hemato-onco", "IC NYHA IV", "Cirrose", "AIDS"].map((c) => (
                    <label key={c} className="flex items-center gap-1 cursor-pointer bg-white px-2 py-1 border rounded">
                      <input type="checkbox" disabled={isReadOnly} checked={admissionData.saps_comorbidades?.includes(c) || false} onChange={() => toggleSAPSComorbidade(c)} /> {c}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">História Clínica</label>
            <textarea disabled={isReadOnly} className="w-full p-3 border rounded-lg h-24 outline-none focus:ring-2 focus:ring-blue-100 text-slate-700 resize-y" placeholder="HDA e evolução inicial..." value={admissionData.historia || ""} onChange={(e) => setAdmissionData({ ...admissionData, historia: e.target.value })} />
          </div>

          <div className="p-4 bg-slate-50 border rounded-xl shadow-sm">
            <h4 className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2">
              <Stethoscope size={16} /> EXAME FÍSICO
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="text-xs font-bold text-gray-500 mb-1 block">GERAL</label><input disabled={isReadOnly} className="w-full p-2.5 border rounded-lg bg-white outline-none" value={admissionData.exameGeral || ""} onChange={(e) => setAdmissionData({ ...admissionData, exameGeral: e.target.value })} /></div>
              <div><label className="text-xs font-bold text-gray-500 mb-1 block">ACV</label><input disabled={isReadOnly} className="w-full p-2.5 border rounded-lg bg-white outline-none" value={admissionData.exameACV || ""} onChange={(e) => setAdmissionData({ ...admissionData, exameACV: e.target.value })} /></div>
              <div><label className="text-xs font-bold text-gray-500 mb-1 block">AR</label><input disabled={isReadOnly} className="w-full p-2.5 border rounded-lg bg-white outline-none" value={admissionData.exameAR || ""} onChange={(e) => setAdmissionData({ ...admissionData, exameAR: e.target.value })} /></div>
              <div><label className="text-xs font-bold text-gray-500 mb-1 block">ABD.</label><input disabled={isReadOnly} className="w-full p-2.5 border rounded-lg bg-white outline-none" value={admissionData.exameABD || ""} onChange={(e) => setAdmissionData({ ...admissionData, exameABD: e.target.value })} /></div>
              <div className="md:col-span-2"><label className="text-xs font-bold text-gray-500 mb-1 block">EXTREMIDADES</label><input disabled={isReadOnly} className="w-full p-2.5 border rounded-lg bg-white outline-none" value={admissionData.exameExtremidades || ""} onChange={(e) => setAdmissionData({ ...admissionData, exameExtremidades: e.target.value })} /></div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:col-span-2 p-3 bg-white border rounded-xl">
                <div className="sm:col-span-3">
                  <label className="text-[11px] font-bold text-indigo-500 mb-1 block">NEURO (Nível de Consciência Geral)</label>
                  <input disabled={isReadOnly} className="w-full p-2 border rounded bg-indigo-50/30 outline-none" placeholder="Nível de consciência..." value={admissionData.exameNeuro || ""} onChange={(e) => setAdmissionData({ ...admissionData, exameNeuro: e.target.value })} />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-indigo-500 mb-1 block">Glasgow AO</label>
                  <select disabled={isReadOnly} className="w-full p-2 border rounded bg-indigo-50/30 outline-none text-xs" value={admissionData.ecg_ao || ""} onChange={(e) => setAdmissionData({ ...admissionData, ecg_ao: e.target.value })}><option value="">AO...</option>{GLASGOW_AO.map((o) => <option key={o}>{o}</option>)}</select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-indigo-500 mb-1 block">Glasgow RV</label>
                  <select disabled={isReadOnly} className="w-full p-2 border rounded bg-indigo-50/30 outline-none text-xs" value={admissionData.ecg_rv || ""} onChange={(e) => setAdmissionData({ ...admissionData, ecg_rv: e.target.value })}><option value="">RV...</option>{GLASGOW_RV.map((o) => <option key={o}>{o}</option>)}</select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-indigo-500 mb-1 block">Glasgow RM</label>
                  <select disabled={isReadOnly} className="w-full p-2 border rounded bg-indigo-50/30 outline-none text-xs" value={admissionData.ecg_rm || ""} onChange={(e) => setAdmissionData({ ...admissionData, ecg_rm: e.target.value })}><option value="">RM...</option>{GLASGOW_RM.map((o) => <option key={o}>{o}</option>)}</select>
                </div>

                <div className="sm:col-span-1">
                  <label className="text-[11px] font-bold text-indigo-500 mb-1 block">RASS</label>
                  <select disabled={isReadOnly} className="w-full p-2 border rounded bg-indigo-50/30 outline-none text-xs" value={admissionData.rass || ""} onChange={(e) => setAdmissionData({ ...admissionData, rass: e.target.value })}><option value="">Se sedado...</option>{RASS_OPTS.map((r) => <option key={r}>{r}</option>)}</select>
                  
                  {admissionData.rass && (
                    <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded-lg shadow-sm animate-fadeIn">
                      <label className="text-[9px] font-bold text-purple-700 mb-1 block uppercase">Glasgow Pré-Sedação (SAPS 3)</label>
                      <div className="grid grid-cols-3 gap-1">
                        <select disabled={isReadOnly} className="w-full p-1 border rounded bg-white outline-none text-[10px] text-center" value={admissionData.ecg_basal_ao || ""} onChange={(e) => setAdmissionData({ ...admissionData, ecg_basal_ao: e.target.value })}><option value="">AO</option>{GLASGOW_AO.map((o) => <option key={o}>{o.split(" - ")[0]}</option>)}</select>
                        <select disabled={isReadOnly} className="w-full p-1 border rounded bg-white outline-none text-[10px] text-center" value={admissionData.ecg_basal_rv || ""} onChange={(e) => setAdmissionData({ ...admissionData, ecg_basal_rv: e.target.value })}><option value="">RV</option>{GLASGOW_RV.map((o) => <option key={o}>{o.split(" - ")[0]}</option>)}</select>
                        <select disabled={isReadOnly} className="w-full p-1 border rounded bg-white outline-none text-[10px] text-center" value={admissionData.ecg_basal_rm || ""} onChange={(e) => setAdmissionData({ ...admissionData, ecg_basal_rm: e.target.value })}><option value="">RM</option>{GLASGOW_RM.map((o) => <option key={o}>{o.split(" - ")[0]}</option>)}</select>
                      </div>
                    </div>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-indigo-500 mb-1 block">PUPILAS</label>
                  <input disabled={isReadOnly} className="w-full p-2 border rounded bg-indigo-50/30 outline-none" placeholder="Fotorreagentes, isocóricas..." value={admissionData.pupilas || ""} onChange={(e) => setAdmissionData({ ...admissionData, pupilas: e.target.value })} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl">
              <label className="flex items-center gap-2 font-bold text-red-800 mb-2 cursor-pointer">
                <input type="checkbox" disabled={isReadOnly} checked={admissionData.dva || false} onChange={(e) => setAdmissionData({ ...admissionData, dva: e.target.checked })} /> Uso de DVA (Drogas Vasoativas)
              </label>
              {admissionData.dva && (
                <div className="flex flex-wrap gap-2 pl-6 mt-2">
                  {OPCOES_DVA.map((d) => (
                    <label key={d} className="flex items-center gap-1 text-xs text-slate-700 cursor-pointer bg-white px-2 py-1 border rounded">
                      <input type="checkbox" disabled={isReadOnly} checked={admissionData.drogasDVA?.includes(d) || false} onChange={() => { setAdmissionData((prev) => { let arr = prev.drogasDVA || []; if (arr.includes(d)) arr = arr.filter((i) => i !== d); else arr = [...arr, d]; return { ...prev, drogasDVA: arr }; }); }} /> {d}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
              <label className="flex items-center gap-2 font-bold text-indigo-800 mb-2 cursor-pointer">
                <input type="checkbox" disabled={isReadOnly} checked={admissionData.sedacao || false} onChange={(e) => setAdmissionData({ ...admissionData, sedacao: e.target.checked })} /> Sedação Contínua
              </label>
              {admissionData.sedacao && (
                <div className="flex flex-wrap gap-2 pl-6 mt-2">
                  {OPCOES_SEDATIVOS.map((s) => (
                    <label key={s} className="flex items-center gap-1 text-xs text-slate-700 cursor-pointer bg-white px-2 py-1 border rounded">
                      <input type="checkbox" disabled={isReadOnly} checked={admissionData.drogasSedacao?.includes(s) || false} onChange={() => { setAdmissionData((prev) => { let arr = prev.drogasSedacao || []; if (arr.includes(s)) arr = arr.filter((i) => i !== s); else arr = [...arr, s]; return { ...prev, drogasSedacao: arr }; }); }} /> {s}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Medicamentos de uso habitual</label>
            <textarea disabled={isReadOnly} className="w-full p-3 border rounded-lg h-20 outline-none focus:ring-2 focus:ring-blue-100" value={admissionData.medicamentos || ""} onChange={(e) => setAdmissionData({ ...admissionData, medicamentos: e.target.value })} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nível de Consciência Basal</label><input disabled={isReadOnly} type="text" className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-700" placeholder="Ex: Lúcido e orientado..." value={admissionData.conscienciaBasal || ""} onChange={(e) => setAdmissionData({ ...admissionData, conscienciaBasal: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nível de Mobilidade Basal</label><input disabled={isReadOnly} type="text" className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-700" placeholder="Ex: Deambula sem auxílio..." value={admissionData.mobilidadeBasal || ""} onChange={(e) => setAdmissionData({ ...admissionData, mobilidadeBasal: e.target.value })} /></div>
          </div>
          <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Exames Complementares</label><textarea disabled={isReadOnly} className="w-full p-3 border rounded-lg h-20 outline-none focus:ring-2 focus:ring-blue-100" placeholder="Resultados relevantes..." value={admissionData.examesComplementares || ""} onChange={(e) => setAdmissionData({ ...admissionData, examesComplementares: e.target.value })} /></div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-orange-600 uppercase mb-1 block">Diagnósticos Agudos</label><textarea disabled={isReadOnly} className="w-full p-3 border rounded-lg h-20 outline-none focus:ring-2 focus:ring-orange-100 bg-orange-50/30" value={admissionData.diagAgudos || ""} onChange={(e) => setAdmissionData({ ...admissionData, diagAgudos: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-orange-600 uppercase mb-1 block">Diagnósticos Crônicos (HPP)</label><textarea disabled={isReadOnly} className="w-full p-3 border rounded-lg h-20 outline-none focus:ring-2 focus:ring-orange-100 bg-orange-50/30" value={admissionData.diagCronicos || ""} onChange={(e) => setAdmissionData({ ...admissionData, diagCronicos: e.target.value })} /></div>
          </div>
          <div><label className="text-xs font-bold text-green-600 uppercase mb-1 block">Conduta / Plano Terapêutico</label><textarea disabled={isReadOnly} className="w-full p-3 border border-green-200 rounded-lg h-24 outline-none focus:ring-2 focus:ring-green-100 bg-green-50/30" value={admissionData.conduta || ""} onChange={(e) => setAdmissionData({ ...admissionData, conduta: e.target.value })} /></div>
        </div>
        
        <div className="p-4 bg-slate-100 border-t flex flex-col-reverse sm:flex-row justify-end gap-3 sticky bottom-0 z-10">
          <button onClick={() => setShowAdmissionModal(false)} className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors w-full sm:w-auto">
            {isReadOnly ? "Fechar" : "Cancelar"}
          </button>
          
          {/* SÓ MOSTRA O BOTÃO SE NÃO ESTIVER TRAVADO */}
          {!isReadOnly && (
            <button onClick={handleFinalizeAdmission} className="px-6 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg transition-colors flex items-center justify-center gap-2 w-full sm:w-auto">
              <FileText size={18} /> Finalizar e Gerar Texto
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MedicalAdmissionModal;