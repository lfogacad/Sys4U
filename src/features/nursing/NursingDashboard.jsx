import React from 'react';
import { Shield, UserPlus, UserCheck, Plus, X, Edit3, AlertTriangle, ShieldAlert, 
Syringe, Activity, AlertCircle, CheckCircle, Loader2, BrainCircuit } from 'lucide-react';
import { ESCALA_DOR, PRECAUCOES, CARACTERISTICAS_DIURESE } from '../../constants/clinicalLists';

const NursingDashboard = ({
  currentPatient,
  isEditable,
  handleNursingAdmission,
  updateNested,
  handleBlurSave,
  addLesao,
  removeLesao,
  updateLesaoData,
  registrarEventoAdverso,
  generateNursingAI_Evolution,
  isNursingRole,
  isGeneratingNursingAI
}) => {
return (
    <div className="space-y-6 animate-fadeIn text-left">
      {/* 1. SE A ADMISSÃO NÃO FOI FEITA, MOSTRAMOS O BOTÃO LIVRE DO FIELDSET */}
      {!currentPatient.enfermagem?.braden_percepcao ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-xl border-2 border-dashed border-orange-200 shadow-sm print:hidden">
          <AlertTriangle size={64} className="text-orange-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-700 mb-2 text-center">Admissão de Enfermagem Pendente</h3>
          <p className="text-sm text-slate-500 mb-6 text-center max-w-md">
            O paciente já foi alocado no leito, mas a avaliação inicial de enfermagem (Escalas de Braden e Morse) ainda não foi realizada.
          </p>
          
          <button
            onClick={(e) => { 
              e.preventDefault(); 
              handleNursingAdmission(); 
            }}
            disabled={!isEditable} 
            className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
              isEditable 
                ? "bg-green-600 text-white shadow-lg hover:bg-green-700 transform hover:scale-105" 
                : "bg-slate-300 text-slate-500 cursor-not-allowed"
            }`}
          >
            <UserPlus size={20} /> Iniciar Admissão de Enfermagem
          </button>
          
          {!isEditable && (
             <p className="text-xs text-red-500 mt-3">Somente o perfil "Enfermeiro" pode iniciar a admissão.</p>
          )}
        </div>
      ) : (
        /* 2. SE A ADMISSÃO JÁ FOI FEITA, AÍ SIM ABRIMOS O FIELDSET PARA OS DADOS */
        <fieldset disabled={!isEditable} className="min-w-0 border-0 p-0 m-0">
        <>
          {/* ======================================================== */}
          {/* CABEÇALHO DA ABA: IDENTIFICAÇÃO E BOTÃO REABRIR          */}
          {/* ======================================================== */}
          <div className="flex flex-col md:flex-row gap-4 mb-4 mt-4 items-stretch">
            
            {/* CARD DA IDENTIFICAÇÃO */}
            <div className={`flex-1 p-4 rounded-xl border transition-all duration-300 flex items-center justify-between shadow-sm ${
                currentPatient.enfermagem?.identificacaoCorreta 
                  ? 'bg-emerald-50 border-emerald-200' 
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl transition-colors hidden sm:flex ${
                  currentPatient.enfermagem?.identificacaoCorreta 
                    ? 'bg-emerald-100 text-emerald-600' 
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  <UserCheck size={24} />
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${currentPatient.enfermagem?.identificacaoCorreta ? 'text-emerald-800' : 'text-slate-700'}`}>
                    Identificação Correta do Paciente
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 pr-2">
                    Confirmo que o paciente possui pulseira e placa no leito com os dados corretos.
                  </p>
                </div>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={!!currentPatient.enfermagem?.identificacaoCorreta}
                onChange={async (e) => {
                  const novoValor = e.target.checked;
                  
                  // 1. Atualiza a tela instantaneamente (Visual macio para o usuário)
                  updateNested("enfermagem", "identificacaoCorreta", novoValor);
                  
                  // 2. Salva DIRETO no Firebase (Sem depender da memória lenta do React)
                  try {
                    // Confirme se a sua coleção principal é 'leitos_uti' e se o ID segue esse padrão
                    const leitoRef = doc(db, "leitos_uti", `bed_${currentPatient.id}`);
                    
                    await updateDoc(leitoRef, {
                      // O uso das aspas com ponto atualiza APENAS este campo, sem apagar o resto da enfermagem
                      "enfermagem.identificacaoCorreta": novoValor
                    });
                  } catch (error) {
                    console.error("Erro crítico ao salvar identificação:", error);
                  }
                }}
                disabled={!isEditable}
              />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 disabled:opacity-50"></div>
              </label>
            </div>

            {/* BOTÃO DE REABRIR ADMISSÃO */}
            <button
              onClick={(e) => { e.preventDefault(); handleNursingAdmission(); }}
              className="bg-slate-200 text-slate-700 px-6 rounded-xl text-sm font-bold hover:bg-slate-300 flex items-center justify-center gap-2 transition-colors border border-slate-300 shadow-sm print:hidden shrink-0"
            >
              <Edit3 size={18} /> Reabrir Admissão
            </button>

          </div>
          {/* ======================================================== */}

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
              else bradenRisk = "Sem Risco"; 
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
                <div className="flex flex-col items-center justify-center p-4 border border-orange-200 rounded-xl bg-orange-50/50 text-center">
                  <h4 className="text-xs font-bold text-orange-800 uppercase mb-3 flex items-center justify-center gap-1">
                    <AlertTriangle size={14} /> Escala de Braden
                  </h4>
                  <div className="text-4xl font-black text-orange-600 leading-none">
                    {bradenSum > 0 ? bradenSum : "-"}
                  </div>
                  <div className={`mt-3 px-3 py-1.5 text-[11px] font-bold rounded-lg leading-tight shadow-sm max-w-[90%] break-words ${bradenSum <= 12 ? "bg-red-200 text-red-900" : "bg-orange-200 text-orange-900"}`}>
                    {bradenRisk || "Não Avaliado"}
                  </div>
                </div>
          
                <div className="flex flex-col items-center justify-center p-4 border border-blue-200 rounded-xl bg-blue-50/50 text-center">
                  <h4 className="text-xs font-bold text-blue-800 uppercase mb-3 flex items-center justify-center gap-1">
                    <AlertTriangle size={14} /> Escala de Morse
                  </h4>
                  <div className="text-4xl font-black text-blue-600 leading-none">
                    {currentPatient.enfermagem?.morse_historico !== undefined ? morseSum : "-"}
                  </div>
                  <div className={`mt-3 px-3 py-1.5 text-[11px] font-bold rounded-lg leading-tight shadow-sm max-w-[90%] break-words ${morseSum >= 45 ? "bg-red-200 text-red-900" : "bg-blue-200 text-blue-900"}`}>
                    {morseRisk || "Não Avaliado"}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* CUIDADOS GERAIS */}
          <div className="p-4 border rounded-xl bg-orange-50/20">
            <h4 className="font-bold text-orange-800 mb-4 flex items-center gap-2"><Shield size={16} /> Cuidados Gerais</h4>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Escala de Dor</label>
            <select 
              className="w-full p-2 border rounded mb-4" 
              value={currentPatient.enfermagem?.dor || ""} 
              onChange={(e) => updateNested("enfermagem", "dor", e.target.value)}
              onBlur={() => handleBlurSave("Enfermagem: Avaliou Escala de Dor")}
            >
              <option value="">Selecione...</option>
              {ESCALA_DOR.map((o) => <option key={o}>{o}</option>)}
            </select>

            <label className="flex items-center gap-2 mb-4 font-bold">
              <input 
                type="checkbox" 
                // Para a visualização, checamos se ALGUM dos dois marcou:
                checked={currentPatient.enfermagem?.hemodialise || currentPatient.medical?.hemodialise || false} 
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  // Atualiza as duas abas simultaneamente!
                  updateNested("enfermagem", "hemodialise", isChecked);
                  updateNested("medical", "hemodialise", isChecked);
                }} 
                onBlur={() => handleBlurSave("Enfermagem: Alterou status de Hemodiálise")}
              /> 
              Hemodiálise
            </label>
            
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Precauções</label>
            <select 
              className="w-full p-2 border rounded" 
              value={currentPatient.enfermagem?.precaucao || ""} 
              onChange={(e) => updateNested("enfermagem", "precaucao", e.target.value)}
              onBlur={() => handleBlurSave("Enfermagem: Alterou Precauções")}
            >
              <option value="">Selecione...</option>
              {PRECAUCOES.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>

          {/* INVASIVOS E DISPOSITIVOS */}
          <div className="p-4 border rounded-xl bg-orange-50/20">
            <h4 className="font-bold text-orange-800 mb-4 flex items-center gap-2"><Syringe size={16} /> Dispositivos Invasivos</h4>
            
            {/* GRADE 1: ACESSOS VENOSOS (AVP, CVC, SHILEY) */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 items-start">
              
              {/* 1. AVP */}
              <div>
                <label className="text-xs font-bold text-gray-500">AVP (Local/Data)</label>
                <div className="flex gap-2">
                  <input 
                    className="w-full p-2 border rounded" 
                    placeholder="Local" 
                    value={currentPatient.enfermagem?.avpLocal || ""} 
                    onChange={(e) => updateNested("enfermagem", "avpLocal", e.target.value)} 
                    onBlur={() => handleBlurSave("Enfermagem: Editou AVP (Local)")}
                  />
                  <input 
                    type="date" 
                    className="w-32 p-2 border rounded shrink-0" 
                    value={currentPatient.enfermagem?.avpData || ""} 
                    onChange={(e) => updateNested("enfermagem", "avpData", e.target.value)} 
                    onBlur={() => handleBlurSave("Enfermagem: Editou AVP (Data)")}
                  />
                </div>
              </div>

              {/* 2. CVC/PICC */}
              <div>
                <label className="text-xs font-bold text-gray-500">CVC/PICC (Inserção)</label>
                <div className="flex gap-2">
                  <input 
                    className="w-full p-2 border rounded" 
                    placeholder="Local" 
                    value={currentPatient.enfermagem?.cvcLocal || ""} 
                    onChange={(e) => updateNested("enfermagem", "cvcLocal", e.target.value)} 
                    onBlur={() => handleBlurSave("Enfermagem: Editou CVC/PICC (Local)")}
                  />
                  <input 
                    type="date" 
                    className="w-32 p-2 border rounded shrink-0" 
                    value={currentPatient.enfermagem?.cvcData || ""} 
                    onChange={(e) => updateNested("enfermagem", "cvcData", e.target.value)} 
                    onBlur={() => handleBlurSave("Enfermagem: Editou CVC/PICC (Data Inserção)")}
                  />
                </div>
                
                {currentPatient.enfermagem?.cvcLocal && (
                  <div className="mt-2">
                    <label className="block text-[10px] font-bold text-red-500 uppercase">Data de Retirada (CVC/PICC)</label>
                    <input 
                      type="date" 
                      className="w-full p-2 border border-red-200 rounded bg-red-50 focus:ring-2 focus:ring-red-500 outline-none" 
                      value={currentPatient.enfermagem?.cvcRetiradaData || ""} 
                      onChange={(e) => updateNested("enfermagem", "cvcRetiradaData", e.target.value)} 
                      onBlur={() => handleBlurSave("Enfermagem: Registrou retirada do CVC/PICC")}
                      disabled={!isEditable} 
                    />
                  </div>
                )}
              </div>

              {/* 3. SHILEY (HEMODIÁLISE) */}
              <div>
                <label className="text-xs font-bold text-gray-500">Cateter de Shiley (Inserção)</label>
                <div className="flex gap-2">
                  <input 
                    className="w-full p-2 border rounded" 
                    placeholder="Local" 
                    value={currentPatient.enfermagem?.shileyLocal || ""} 
                    onChange={(e) => updateNested("enfermagem", "shileyLocal", e.target.value)} 
                    onBlur={() => handleBlurSave("Enfermagem: Editou Shiley (Local)")}
                  />
                  <input 
                    type="date" 
                    className="w-32 p-2 border rounded shrink-0" 
                    value={currentPatient.enfermagem?.shileyData || ""} 
                    onChange={(e) => updateNested("enfermagem", "shileyData", e.target.value)} 
                    onBlur={() => handleBlurSave("Enfermagem: Editou Shiley (Data Inserção)")}
                  />
                </div>
                
                {currentPatient.enfermagem?.shileyLocal && (
                  <div className="mt-2">
                    <label className="block text-[10px] font-bold text-red-500 uppercase">Data de Retirada (Shiley)</label>
                    <input 
                      type="date" 
                      className="w-full p-2 border border-red-200 rounded bg-red-50 focus:ring-2 focus:ring-red-500 outline-none" 
                      value={currentPatient.enfermagem?.shileyRetiradaData || ""} 
                      onChange={(e) => updateNested("enfermagem", "shileyRetiradaData", e.target.value)} 
                      onBlur={() => handleBlurSave("Enfermagem: Registrou retirada do Shiley")}
                      disabled={!isEditable} 
                    />
                  </div>
                )}
              </div>

            </div>
            
            {/* GRADE 2: OUTROS DISPOSITIVOS (SVD, DIURESE, SNE, DRENOS) */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
              
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1">
                  <input 
                    type="checkbox" 
                    checked={currentPatient.enfermagem?.svd || false} 
                    onChange={(e) => updateNested("enfermagem", "svd", e.target.checked)} 
                    onBlur={() => handleBlurSave("Enfermagem: Alterou status de SVD")}
                  /> 
                  SVD (Sonda Vesical / Inserção)
                </label>
                <div className="space-y-2">
                  <input 
                    type="date" 
                    className={`w-full p-2 border rounded ${!currentPatient.enfermagem?.svd ? "bg-gray-100 opacity-50" : ""}`} 
                    value={currentPatient.enfermagem?.svdData || ""} 
                    onChange={(e) => updateNested("enfermagem", "svdData", e.target.value)} 
                    onBlur={() => handleBlurSave("Enfermagem: Editou SVD (Data Inserção)")}
                    disabled={!currentPatient.enfermagem?.svd || !isEditable} 
                  />
                  
                  {currentPatient.enfermagem?.svd && (
                    <div className="mt-2">
                      <label className="block text-[10px] font-bold text-red-500 uppercase">Data de Retirada (SVD)</label>
                      <input 
                        type="date" 
                        className="w-full p-2 border border-red-200 rounded bg-red-50 focus:ring-2 focus:ring-red-500 outline-none" 
                        value={currentPatient.enfermagem?.svdRetiradaData || ""} 
                        onChange={(e) => updateNested("enfermagem", "svdRetiradaData", e.target.value)} 
                        onBlur={() => handleBlurSave("Enfermagem: Registrou retirada da SVD")}
                        disabled={!isEditable} 
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Aspecto da Diurese</label>
                <select 
                  className="w-full p-2 border rounded bg-white" 
                  value={currentPatient.enfermagem?.diureseCaracteristica || ""} 
                  onChange={(e) => updateNested("enfermagem", "diureseCaracteristica", e.target.value)}
                  onBlur={() => handleBlurSave("Enfermagem: Alterou Aspecto da Diurese")}
                >
                  <option value="">Selecione...</option>
                  {CARACTERISTICAS_DIURESE.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">SNE (Fixação cm / Data)</label>
                <div className="flex gap-2">
                  <input 
                    className="w-full p-2 border rounded" 
                    placeholder="cm" 
                    value={currentPatient.enfermagem?.sneCm || ""} 
                    onChange={(e) => updateNested("enfermagem", "sneCm", e.target.value)} 
                    onBlur={() => handleBlurSave("Enfermagem: Editou SNE (Fixação)")}
                  />
                  <input 
                    type="date" 
                    className="w-32 p-2 border rounded" 
                    value={currentPatient.enfermagem?.sneData || ""} 
                    onChange={(e) => updateNested("enfermagem", "sneData", e.target.value)} 
                    onBlur={() => handleBlurSave("Enfermagem: Editou SNE (Data)")}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Drenos (Tipo/Características)</label>
                <input 
                  className="w-full p-2 border rounded" 
                  value={currentPatient.enfermagem?.drenoTipo || ""} 
                  onChange={(e) => updateNested("enfermagem", "drenoTipo", e.target.value)} 
                  onBlur={() => handleBlurSave("Enfermagem: Editou Drenos")}
                />
              </div>
            </div>
          </div>

          {/* PELE E CURATIVOS */}
          <div className="p-4 border rounded-xl bg-blue-50/30 mt-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-blue-800 flex items-center gap-2">
                <ShieldAlert size={16} /> Integridade Cutânea e Curativos
              </h4>
              <button 
                onClick={addLesao}
                className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
              >
                <Plus size={14} /> Adicionar Lesão
              </button>
            </div>

            <div className="space-y-4">
              {(!currentPatient.enfermagem?.lesoes || currentPatient.enfermagem?.lesoes.length === 0) && (
                <p className="text-sm text-slate-400 italic text-center py-2">Nenhuma lesão registrada. Pele íntegra.</p>
              )}

              {currentPatient.enfermagem?.lesoes?.map((lesao) => (
                <div key={lesao.id} className="bg-white border border-blue-100 p-4 rounded-xl shadow-sm relative">
                  <button 
                    onClick={() => removeLesao(lesao.id)}
                    className="absolute top-2 right-2 text-slate-300 hover:text-red-500"
                  >
                    <X size={16} />
                  </button>

                  <div className="grid md:grid-cols-4 gap-4">
                    {/* Origem da Lesão */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Origem</label>
                      <select 
                        className={`w-full p-2 border rounded text-sm font-bold ${lesao.origem === 'incidencia' ? 'text-red-600 bg-red-50' : 'text-slate-600'}`}
                        value={lesao.origem}
                        onChange={(e) => updateLesaoData(lesao.id, "origem", e.target.value)}
                      >
                        <option value="prevalencia">Prévia (Prevalência)</option>
                        <option value="incidencia">Adquirida na UTI (Incidência)</option>
                      </select>
                    </div>

                    {/* Localização e Estágio */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Localização / Estágio</label>
                      <input 
                        type="text"
                        placeholder="Ex: Sacra - Estágio II"
                        className="w-full p-2 border rounded text-sm"
                        value={lesao.localizacao}
                        onChange={(e) => updateLesaoData(lesao.id, "localizacao", e.target.value)}
                        onBlur={() => handleBlurSave("Enfermagem: Atualizou local da lesão")}
                      />
                    </div>

                    {/* Tipo de Curativo */}
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Curativo / Conduta</label>
                      <input 
                        type="text"
                        placeholder="Ex: Placa de Hidrocoloide / AGE"
                        className="w-full p-2 border border-emerald-200 bg-emerald-50/30 rounded text-sm"
                        value={lesao.curativo}
                        onChange={(e) => updateLesaoData(lesao.id, "curativo", e.target.value)}
                        onBlur={() => handleBlurSave("Enfermagem: Atualizou curativo")}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* NOTIFICAÇÃO DE EVENTOS ADVERSOS */}
          <div className="p-4 border rounded-xl bg-red-50/30 mt-4">
            <h4 className="font-bold text-red-800 mb-3 flex items-center gap-2">
              <AlertTriangle size={18} /> Notificação de Eventos Adversos (Gestão de Risco)
            </h4>
            
            <p className="text-[11px] text-red-600 mb-4 italic">
              * Clique no evento para registrar imediatamente. Estes dados alimentam os indicadores de segurança do paciente.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                { label: "Queda do Leito", icon: "🛏️" },
                { label: "Retirada Acidental SNE", icon: "👃" },
                { label: "Retirada Acidental CVC", icon: "🫀" },
                { label: "Retirada Acidental SVD", icon: "💧" },
                { label: "Extubação Acidental", icon: "🗣️" },
                { label: "Erro de Medicação", icon: "💊" },
                { label: "Obstrução de SNE", icon: "❌" },
                { label: "Flebite / Extravasamento", icon: "💉" }
              ].map((evento) => (
                <button
                  key={evento.label}
                  onClick={() => {
                    if(window.confirm(`Confirmar registro de "${evento.label}" para este paciente?`)) {
                      registrarEventoAdverso(evento.label);
                    }
                  }}
                  className="flex flex-col items-center justify-center p-3 bg-white border border-red-100 rounded-xl hover:bg-red-50 hover:border-red-300 transition-all group"
                >
                  <span className="text-xl mb-1 group-hover:scale-110 transition-transform">{evento.icon}</span>
                  <span className="text-[10px] font-bold text-slate-700 text-center leading-tight">
                    {evento.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* INTERCORRÊNCIAS E CONDUTAS */}
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="p-4 bg-white border rounded-xl shadow-sm">
              <h4 className="font-bold text-slate-700 mb-2 text-sm flex items-center gap-2"><AlertCircle size={16} className="text-orange-500" /> Intercorrências</h4>
              <textarea 
                className="w-full p-3 border rounded-lg h-24 text-sm outline-none focus:ring-2 focus:ring-orange-100 bg-slate-50 focus:bg-white transition-colors whitespace-pre-wrap" 
                placeholder="Relate as intercorrências do plantão aqui..." 
                value={currentPatient.enfermagem?.intercorrencias || ""} 
                onChange={(e) => updateNested("enfermagem", "intercorrencias", e.target.value)} 
                onBlur={() => handleBlurSave("Enfermagem: Editou Intercorrências")}
              />
            </div>
            <div className="p-4 bg-white border rounded-xl shadow-sm">
              <h4 className="font-bold text-slate-700 mb-2 text-sm flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Condutas</h4>
              <textarea 
                className="w-full p-3 border rounded-lg h-24 text-sm outline-none focus:ring-2 focus:ring-green-100 bg-slate-50 focus:bg-white transition-colors whitespace-pre-wrap" 
                placeholder="Plano de cuidados e condutas tomadas..." 
                value={currentPatient.enfermagem?.condutas || ""} 
                onChange={(e) => updateNested("enfermagem", "condutas", e.target.value)} 
                onBlur={() => handleBlurSave("Enfermagem: Editou Condutas")}
              />
            </div>
          </div>

          {/* EVOLUÇÃO IA / PRIVATIVO */}
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
            <textarea 
              className="w-full p-3 border rounded-lg h-64 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-slate-50 focus:bg-white transition-colors whitespace-pre-wrap" 
              placeholder="Clique no botão acima para gerar a evolução baseada nos dados clínicos, ou digite aqui..." 
              value={currentPatient.enfermagem?.anotacoes || ""} 
              onChange={(e) => updateNested("enfermagem", "anotacoes", e.target.value)} 
              onBlur={() => handleBlurSave("Enfermagem: Editou Evolução de Enfermagem")}
            />
          </div>
        </>
      </fieldset>
      )}
    </div>
  );
};

export default NursingDashboard;