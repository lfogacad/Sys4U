import React from 'react';
import { Shield, UserPlus, Edit3, AlertTriangle, Syringe, Activity, AlertCircle, CheckCircle, Loader2, BrainCircuit } from 'lucide-react';
import { ESCALA_DOR, PRECAUCOES, CARACTERISTICAS_DIURESE } from '../../constants/clinicalLists';

const NursingDashboard = ({
  currentPatient,
  isEditable,
  handleNursingAdmission,
  updateNested,
  generateNursingAI_Evolution,
  isNursingRole,
  isGeneratingNursingAI
}) => {
  return (
    <fieldset disabled={!isEditable} className="space-y-6 animate-fadeIn min-w-0 border-0 p-0 m-0">
      {!currentPatient.enfermagem?.braden_percepcao ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-xl border-2 border-dashed border-orange-200 shadow-sm print:hidden">
          <Shield size={64} className="text-orange-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-700 mb-2 text-center">Admissão de Enfermagem Pendente</h3>
          <p className="text-sm text-slate-500 mb-6 text-center max-w-md">
            O paciente já foi alocado no leito pela equipe médica, mas a avaliação inicial de enfermagem (Escalas de Braden e Morse) ainda não foi realizada.
          </p>
          <button
            onClick={(e) => { e.preventDefault(); handleNursingAdmission(); }}
            className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 flex items-center gap-2 transition-all transform hover:scale-105"
          >
            <UserPlus size={20} /> Iniciar Admissão de Enfermagem
          </button>
        </div>
      ) : (
        <>
          <div className="flex justify-end print:hidden">
            <button
              onClick={(e) => { e.preventDefault(); handleNursingAdmission(); }}
              className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-300 flex items-center gap-2 transition-colors border border-slate-300"
            >
              <Edit3 size={16} /> Ver/Editar Escalas de Admissão
            </button>
          </div>

          {(() => {
            const reqBraden = ["braden_percepcao", "braden_umidade", "braden_atividade", "braden_mobilidade", "braden_nutricao", "braden_friccao"];
            const reqMorse = ["morse_historico", "morse_diagnostico", "morse_auxilio", "morse_terapiaIV", "morse_marcha", "morse_estadoMental"];

            const bradenSum = reqBraden.reduce((s, k) => s + parseInt(currentPatient.enfermagem?.[k] || 0), 0);
            let bradenRisk = "";
            if (bradenSum > 0) {
              if (bradenSum <= 9) bradenRisk = "Risco Altíssimo";
              else if (bradenSum <= 12) bradenRisk = "Risco Alto";
              else if (bradenSum <= 14) bradenRisk = "Risco Moderado";
              else if (bradenSum <= 18) bradenRisk = "Risco Leve";
              else bradenRisk = "Sem Risco / Risco Mínimo";
            }

            const morseSum = reqMorse.reduce((s, k) => s + parseInt(currentPatient.enfermagem?.[k] || 0), 0);
            let morseRisk = "";
            if (currentPatient.enfermagem?.morse_historico !== undefined && currentPatient.enfermagem?.morse_historico !== "") {
              if (morseSum <= 24) morseRisk = "Risco Baixo";
              else if (morseSum <= 44) morseRisk = "Risco Moderado";
              else morseRisk = "Risco Alto";
            }

            return (
              <div className="grid grid-cols-2 gap-4 mb-2 mt-4">
                <div className="p-4 border border-orange-200 rounded-xl bg-orange-50/50 flex flex-col justify-center">
                  <h4 className="text-xs font-bold text-orange-800 uppercase mb-2 flex items-center gap-1"><AlertTriangle size={14} /> Escala de Braden</h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-orange-600">{bradenSum > 0 ? bradenSum : "-"}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${bradenSum <= 12 ? "bg-red-200 text-red-800" : "bg-orange-200 text-orange-800"}`}>{bradenRisk}</span>
                  </div>
                </div>
                <div className="p-4 border border-blue-200 rounded-xl bg-blue-50/50 flex flex-col justify-center">
                  <h4 className="text-xs font-bold text-blue-800 uppercase mb-2 flex items-center gap-1"><AlertTriangle size={14} /> Escala de Morse</h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-blue-600">{currentPatient.enfermagem?.morse_historico !== undefined ? morseSum : "-"}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${morseSum >= 45 ? "bg-red-200 text-red-800" : "bg-blue-200 text-blue-800"}`}>{morseRisk}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="p-4 border rounded-xl bg-orange-50/20">
            <h4 className="font-bold text-orange-800 mb-4 flex items-center gap-2"><Shield size={16} /> Cuidados Gerais</h4>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Escala de Dor</label>
            <select className="w-full p-2 border rounded mb-4" value={currentPatient.enfermagem?.dor || ""} onChange={(e) => updateNested("enfermagem", "dor", e.target.value)}>
              <option value="">Selecione...</option>
              {ESCALA_DOR.map((o) => <option key={o}>{o}</option>)}
            </select>

            <label className="flex items-center gap-2 mb-4 font-bold">
              <input type="checkbox" checked={currentPatient.enfermagem?.hemodialise || false} onChange={(e) => updateNested("enfermagem", "hemodialise", e.target.checked)} /> Hemodiálise
            </label>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Precauções</label>
            <select className="w-full p-2 border rounded" value={currentPatient.enfermagem?.precaucao || ""} onChange={(e) => updateNested("enfermagem", "precaucao", e.target.value)}>
              <option value="">Selecione...</option>
              {PRECAUCOES.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>

          <div className="p-4 border rounded-xl bg-orange-50/20">
            <h4 className="font-bold text-orange-800 mb-4 flex items-center gap-2"><Syringe size={16} /> Invasivos e Dispositivos</h4>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs font-bold text-gray-500">AVP (Local/Data)</label>
                <div className="flex gap-2">
                  <input className="w-full p-2 border rounded" placeholder="Local" value={currentPatient.enfermagem?.avpLocal || ""} onChange={(e) => updateNested("enfermagem", "avpLocal", e.target.value)} />
                  <input type="date" className="w-32 p-2 border rounded" value={currentPatient.enfermagem?.avpData || ""} onChange={(e) => updateNested("enfermagem", "avpData", e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500">CVC/PICC (Local/Data)</label>
                <div className="flex gap-2">
                  <input className="w-full p-2 border rounded" placeholder="Local" value={currentPatient.enfermagem?.cvcLocal || ""} onChange={(e) => updateNested("enfermagem", "cvcLocal", e.target.value)} />
                  <input type="date" className="w-32 p-2 border rounded" value={currentPatient.enfermagem?.cvcData || ""} onChange={(e) => updateNested("enfermagem", "cvcData", e.target.value)} />
                </div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1">
                  <input type="checkbox" checked={currentPatient.enfermagem?.svd || false} onChange={(e) => updateNested("enfermagem", "svd", e.target.checked)} /> SVD (Sonda Vesical / Data)
                </label>
                <input type="date" className={`w-full p-2 border rounded ${!currentPatient.enfermagem?.svd ? "bg-gray-100 opacity-50" : ""}`} value={currentPatient.enfermagem?.svdData || ""} onChange={(e) => updateNested("enfermagem", "svdData", e.target.value)} disabled={!currentPatient.enfermagem?.svd || !isEditable} />
              </div>
              
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Aspecto da Diurese</label>
                <select className="w-full p-2 border rounded bg-white" value={currentPatient.enfermagem?.diureseCaracteristica || ""} onChange={(e) => updateNested("enfermagem", "diureseCaracteristica", e.target.value)}>
                  <option value="">Selecione...</option>
                  {CARACTERISTICAS_DIURESE.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">SNE (Fixação cm / Data)</label>
                <div className="flex gap-2">
                  <input className="w-full p-2 border rounded" placeholder="cm" value={currentPatient.enfermagem?.sneCm || ""} onChange={(e) => updateNested("enfermagem", "sneCm", e.target.value)} />
                  <input type="date" className="w-32 p-2 border rounded" value={currentPatient.enfermagem?.sneData || ""} onChange={(e) => updateNested("enfermagem", "sneData", e.target.value)} />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Drenos (Tipo/Característica)</label>
                <input className="w-full p-2 border rounded" value={currentPatient.enfermagem?.drenoTipo || ""} onChange={(e) => updateNested("enfermagem", "drenoTipo", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="p-4 border rounded-xl bg-orange-50/20">
            <h4 className="font-bold text-orange-800 mb-4 flex items-center gap-2"><Activity size={16} /> Pele e Curativos</h4>
            <textarea placeholder="Lesões por pressão (Local / Estágio)..." className="w-full p-2 border rounded mb-2 h-16" value={currentPatient.enfermagem?.lesaoLocal || ""} onChange={(e) => updateNested("enfermagem", "lesaoLocal", e.target.value)} />
            <div className="flex gap-2">
              <input className="flex-1 p-2 border rounded" placeholder="Tipo de Curativo" value={currentPatient.enfermagem?.curativoTipo || ""} onChange={(e) => updateNested("enfermagem", "curativoTipo", e.target.value)} />
              <input type="date" className="w-32 p-2 border rounded" value={currentPatient.enfermagem?.curativoData || ""} onChange={(e) => updateNested("enfermagem", "curativoData", e.target.value)} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="p-4 bg-white border rounded-xl shadow-sm">
              <h4 className="font-bold text-slate-700 mb-2 text-sm flex items-center gap-2"><AlertCircle size={16} className="text-orange-500" /> Intercorrências</h4>
              <textarea className="w-full p-3 border rounded-lg h-24 text-sm outline-none focus:ring-2 focus:ring-orange-100 bg-slate-50 focus:bg-white transition-colors whitespace-pre-wrap" placeholder="Relate as intercorrências do plantão aqui..." value={currentPatient.enfermagem?.intercorrencias || ""} onChange={(e) => updateNested("enfermagem", "intercorrencias", e.target.value)} />
            </div>
            <div className="p-4 bg-white border rounded-xl shadow-sm">
              <h4 className="font-bold text-slate-700 mb-2 text-sm flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Condutas</h4>
              <textarea className="w-full p-3 border rounded-lg h-24 text-sm outline-none focus:ring-2 focus:ring-green-100 bg-slate-50 focus:bg-white transition-colors whitespace-pre-wrap" placeholder="Plano de cuidados e condutas tomadas..." value={currentPatient.enfermagem?.condutas || ""} onChange={(e) => updateNested("enfermagem", "condutas", e.target.value)} />
            </div>
          </div>

          <div className="p-4 bg-white border rounded-xl shadow-sm mt-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-slate-700 flex items-center gap-2"><Edit3 size={16} className="text-slate-400" /> Evolução de Enfermagem (Privativo)</h4>
              <button
                type="button"
                onClick={generateNursingAI_Evolution}
                disabled={!isNursingRole || isGeneratingNursingAI}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm print:hidden ${isGeneratingNursingAI ? "bg-slate-200 text-slate-500 cursor-not-allowed" : "bg-blue-100 text-blue-700 hover:bg-blue-200"} ${!isNursingRole ? "opacity-50 cursor-not-allowed" : ""}`}
                title="Usar Inteligência Artificial para gerar evolução"
              >
                {isGeneratingNursingAI ? <><Loader2 className="animate-spin" size={14} /> Gerando...</> : <><BrainCircuit size={14} /> Evolução por IA</>}
              </button>
            </div>
            <textarea className="w-full p-3 border rounded-lg h-64 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-slate-50 focus:bg-white transition-colors whitespace-pre-wrap" placeholder="Clique no botão acima para gerar a evolução baseada nos dados clínicos, ou digite aqui..." value={currentPatient.enfermagem?.anotacoes || ""} onChange={(e) => updateNested("enfermagem", "anotacoes", e.target.value)} />
          </div>
        </>
      )}
    </fieldset>
  );
};

export default NursingDashboard;