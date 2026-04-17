import React, { useEffect } from 'react';
import { Wind, X, Shield, Activity, ClipboardCheck, FileText } from 'lucide-react';
import { ICU_MOBILITY_SCALE, SUPORTE_RESP_OPTS, MODOS_VM, ASPECTO_SECRECAO, COLORACAO_SECRECAO, QTD_SECRECAO } from '../../constants/clinicalLists';

// 1. DICIONÁRIO DE TEXTOS PADRÃO (BOILERPLATE)
const DEFAULT_TEXTS = {
  estadoGeral: "BEG/REG/MEG, LOTE, cooperativo, sem queixas sistêmicas no momento da avaliação.",
  sistemaNervoso: "Paciente sedado/sem sedação, sob protocolo de sedação contínua, em uso de xx em x ml/h e xx em x ml/h (BIC), RASS: xx/ escala de Coma de Glasgow: (AO: 4 – RV: 5 – RM:6) = 15T. Paciente consciente e orientado/ rebaixado. Pupilas: Isocóricas / anisocóricas, fotorreagentes / não fotorreagentes, simétricas ou assimétricas, reflexos preservados/ausentes.",
  sistemaRespiratorio: "Paciente em ventilação mecânica invasiva, TOT/TQT, N° x, rima x / oxigenoterapia / ar ambiente. Padrão respiratório eupneico/taquipneico/bradipneico. Apresenta expansibilidade torácica simétrica/assimétrica, com predomínio costal/abdominal/misto. Ausculta pulmonar: murmúrio vesicular presente/abolido/diminuído bilateralmente, com presença de estertores crepitantes/roncos/sibilos em bases/apex/hemitorax D ou E. Apresenta tosse eficaz/ineficaz/ausente, com presença/ausência de secreção traqueobrônquica, de aspecto fluido/espesso, coloração clara/amarelada/esverdeada/purulenta/sanguinolenta, em pequena/média/grande quantidade. Paciente com uso/não uso de musculatura acessória, sem sinais de desconforto respiratório/ com sinais de desconforto respiratório (batimento de asa de nariz, tiragem intercostal). SpO₂ mantida em torno de xx%, com suporte ventilatório adequado no momento.",
  sistemaCardiovascular: "Paciente sob monitorização cardíaca contínua, apresentando ritmo cardíaco regular/irregular. Estável/instável hemodinamicamente em uso/não uso de drogas vasoativas: xx em x ml/h (BIC) com FC em torno de x bpm,  PA: 95/76 mmHg, PAM: 98mmHg, Tº: 34.7°. Perfusão periférica adequada/reduzida, com extremidades aquecidas/frias, sem cianose, tempo de enchimento capilar </> 3 segundos. Presença/ausência de edema em membros inferiores/superiores (grau ___).",
  sistemaDigestivo: "Paciente com abdômen plano/globoso/distendido/flácido/semigloboso, indolor/doloroso à palpação. Ruídos hidroaéreos presentes/diminuídos/ausentes. Em uso de dieta oral/enteral/parenteral, por via oral/sonda nasoenteral/nasogástrica/gastrostomia. Paciente com risco baixo/moderado/alto para broncoaspiração, anictérico.",
  sistemaMusculoesqueletico: "Força muscular reduzida/preservada (avaliada quando possível). Tônus muscular normotônico/hipotônico/hipertônico. Amplitude de movimento preservada/reduzida em x. Presença de imobilidade no leito, com risco para fraqueza muscular adquirida na UTI. Sem/com sinais de retrações musculares. Independência prévia: x",
  funcionalidade: "Paciente dependente parcialmente/dependente/independente para mudanças de decúbito e atividades funcionais no leito. Não deambula. Apresenta limitações funcionais decorrentes do estado clínico atual/tempo de internação em UTI.",
  condutas: `• Monitorização contínua de sinais vitais e vigilância respiratória;
• Posicionamento funcional e terapêutico em leito com cabeceira a 30° a 45º;
• Avaliação de mecânica ventilatória e parâmetros do ventilador;
• Ajuste e monitorização de parâmetros ventilatórios (desmame/correção assincronias/correção gasometria);
• Higiene brônquica com vibração/compressão torácica/AFE/drenagem postural/estímulo de tosse/bag squeezing;
• Aspiração de vias aéreas sistema aberto/fechado, com retirada de secreção [descrever];
• Técnicas de reexpansão pulmonar com exercícios ventilatórios/EPAP/CPAP recrutamento;
• Mobilização [passiva/ativo-assistida/ativa] de MMSS e MMII (3x10 repetições);
• Sedestação no leito/à beira do leito/poltrona - ortostatismo/marcha assistida/deambulação;

Paciente apresentou boa tolerância às manobras, sem intercorrências hemodinâmicas. Melhora discreta da expansibilidade torácica e redução de secreção espessa em vias aéreas. Mantida estabilidade dos sinais vitais durante todo atendimento.`
};

const PhysioAdmissionModal = ({
  showPhysioModal,
  setShowPhysioModal,
  activeTab,
  physioData,
  setPhysioData,
  handleFinalizePhysioAdmission
}) => {

  // 2. GATILHO INTELIGENTE: Preenche automaticamente os campos vazios ao abrir o modal
  useEffect(() => {
    if (showPhysioModal && physioData) {
      let needsUpdate = false;
      const updatedData = { ...physioData };

      // Varre todos os campos do nosso dicionário. Se estiver vazio no paciente, ele injeta o padrão.
      Object.keys(DEFAULT_TEXTS).forEach(key => {
        if (!updatedData[key]) {
          updatedData[key] = DEFAULT_TEXTS[key];
          needsUpdate = true;
        }
      });

      // Se injetou algo novo, atualiza a memória
      if (needsUpdate) {
        setPhysioData(updatedData);
      }
    }
  }, [showPhysioModal]); // Executa sempre que o modal de admissão é aberto

  if (!showPhysioModal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-[80] flex items-center justify-center p-2 md:p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto flex flex-col shadow-2xl">
        <div className="bg-cyan-600 p-4 text-white flex justify-between items-center sticky top-0 z-10 shadow">
          <h3 className="font-bold flex items-center gap-2 text-lg">
            <Wind size={20} /> Admissão Fisioterapêutica (Leito {activeTab + 1})
          </h3>
          <button onClick={() => setShowPhysioModal(false)} className="hover:bg-cyan-700 p-1 rounded transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 text-sm bg-slate-50">
          <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm">
            <label className="font-bold text-cyan-800 mb-2 block uppercase">Estado Geral</label>
            <textarea
              className="w-full p-3 border rounded-lg h-20 outline-none focus:ring-2 focus:ring-cyan-200 resize-y leading-relaxed text-slate-700"
              value={physioData.estadoGeral || ""}
              onChange={(e) => setPhysioData({ ...physioData, estadoGeral: e.target.value })}
            />
          </div>
          
          <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm">
            <label className="font-bold text-cyan-800 mb-2 block uppercase">Sistema Nervoso</label>
            <textarea
              className="w-full p-3 border rounded-lg h-28 outline-none focus:ring-2 focus:ring-cyan-200 resize-y leading-relaxed text-slate-700"
              value={physioData.sistemaNervoso || ""}
              onChange={(e) => setPhysioData({ ...physioData, sistemaNervoso: e.target.value })}
            />
          </div>

          <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm">
            <label className="font-bold text-cyan-800 mb-2 block uppercase">Sistema Respiratório</label>
            <textarea
              className="w-full p-3 border rounded-lg h-44 outline-none focus:ring-2 focus:ring-cyan-200 resize-y leading-relaxed text-slate-700"
              value={physioData.sistemaRespiratorio || ""}
              onChange={(e) => setPhysioData({ ...physioData, sistemaRespiratorio: e.target.value })}
            />
          </div>

          <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm">
            <label className="font-bold text-cyan-800 mb-2 block uppercase">Sistema Cardiovascular</label>
            <textarea
              className="w-full p-3 border rounded-lg h-28 outline-none focus:ring-2 focus:ring-cyan-200 resize-y leading-relaxed text-slate-700"
              value={physioData.sistemaCardiovascular || ""}
              onChange={(e) => setPhysioData({ ...physioData, sistemaCardiovascular: e.target.value })}
            />
          </div>

          <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm">
            <label className="font-bold text-cyan-800 mb-2 block uppercase">Sistema Digestivo</label>
            <textarea
              className="w-full p-3 border rounded-lg h-24 outline-none focus:ring-2 focus:ring-cyan-200 resize-y leading-relaxed text-slate-700"
              value={physioData.sistemaDigestivo || ""}
              onChange={(e) => setPhysioData({ ...physioData, sistemaDigestivo: e.target.value })}
            />
          </div>

          <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm">
            <label className="font-bold text-cyan-800 mb-2 block uppercase">Sistema Musculoesquelético</label>
            <textarea
              className="w-full p-3 border rounded-lg h-24 outline-none focus:ring-2 focus:ring-cyan-200 resize-y leading-relaxed text-slate-700"
              value={physioData.sistemaMusculoesqueletico || ""}
              onChange={(e) => setPhysioData({ ...physioData, sistemaMusculoesqueletico: e.target.value })}
            />
          </div>

          <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm">
            <label className="font-bold text-cyan-800 mb-2 block uppercase">Funcionalidade e Escalas</label>
            <textarea
              className="w-full p-3 border rounded-lg h-24 outline-none focus:ring-2 focus:ring-cyan-200 resize-y leading-relaxed text-slate-700 mb-4"
              value={physioData.funcionalidade || ""}
              onChange={(e) => setPhysioData({ ...physioData, funcionalidade: e.target.value })}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-cyan-100 pt-4">
              <div>
                <label className="block text-xs font-bold text-cyan-700 mb-1">Escore MRC (0-60)</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  className="w-full p-2 border rounded bg-slate-50 outline-none focus:ring-2 focus:ring-cyan-200"
                  placeholder="Soma MRC..."
                  value={physioData.mrcScore || ""}
                  onChange={(e) => setPhysioData({ ...physioData, mrcScore: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-cyan-700 mb-1">ICU Mobility Scale (IMS)</label>
                <select
                  className="w-full p-2 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                  value={physioData.ims || ""}
                  onChange={(e) => setPhysioData({ ...physioData, ims: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  {ICU_MOBILITY_SCALE.map((scale) => (
                    <option key={scale} value={scale}>{scale}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* --- NOVA SEÇÃO: SUPORTE VENTILATÓRIO --- */}
            <div className="mt-4 border-t border-cyan-100 pt-4">
              <label className="font-bold text-cyan-800 text-xs uppercase flex items-center gap-2 mb-3">
                <Wind size={14} className="text-cyan-600" /> Suporte Ventilatório
              </label>
              <select
                className="w-full p-2 border rounded mb-3 bg-white outline-none focus:ring-2 focus:ring-cyan-200 text-xs font-bold text-slate-700"
                value={physioData.suporte || ""}
                onChange={(e) => setPhysioData({ ...physioData, suporte: e.target.value })}
              >
                <option value="">Selecione o suporte...</option>
                {SUPORTE_RESP_OPTS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>

              {(physioData.suporte === "Cateter Nasal" || physioData.suporte === "Máscara não reinalante" || physioData.suporte === "Macronebulização por TQT") && (
                <div className="mb-3 animate-fadeIn">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Fluxo de O2 (L/min)</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                    value={physioData.parametro || ""}
                    onChange={(e) => setPhysioData({ ...physioData, parametro: e.target.value })}
                  />
                </div>
              )}

              {physioData.suporte === "Venturi" && (
                <div className="mb-3 animate-fadeIn">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">FiO2 (%)</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                    value={physioData.fiO2 || ""}
                    onChange={(e) => setPhysioData({ ...physioData, fiO2: e.target.value })}
                  />
                </div>
              )}

              {physioData.suporte === "VNI" && (
                <div className="grid grid-cols-2 gap-2 mb-3 animate-fadeIn">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Modo (CPAP/BIPAP)</label>
                    <select
                      className="w-full p-2 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                      value={physioData.parametro || ""}
                      onChange={(e) => setPhysioData({ ...physioData, parametro: e.target.value })}
                    >
                      <option value="">...</option>
                      <option value="CPAP">CPAP</option>
                      <option value="BIPAP">BIPAP</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">FiO2 (%)</label>
                    <input
                      type="number"
                      className="w-full p-2 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                      value={physioData.fiO2 || ""}
                      onChange={(e) => setPhysioData({ ...physioData, fiO2: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {physioData.suporte === "VM" && (
                <div className="mb-3 animate-fadeIn">
                  {/* --- DADOS DO TUBO OROTRAQUEAL --- */}
                  <div className="grid grid-cols-3 gap-2 mb-3 p-3 bg-slate-100 rounded-xl border border-slate-200 shadow-inner">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Data Intubação</label>
                      <input 
                        type="date" 
                        className="w-full p-2 border rounded bg-white text-xs outline-none focus:ring-2 focus:ring-cyan-200 text-slate-700" 
                        value={physioData.dataIntubacao || ""} 
                        onChange={(e) => setPhysioData({ ...physioData, dataIntubacao: e.target.value })} 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Nº TOT</label>
                      <input 
                        type="number" step="0.5" 
                        className="w-full p-2 border rounded bg-white text-xs outline-none focus:ring-2 focus:ring-cyan-200 text-center text-slate-700" 
                        placeholder="Ex: 8.0" 
                        value={physioData.numeroTOT || ""} 
                        onChange={(e) => setPhysioData({ ...physioData, numeroTOT: e.target.value })} 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Rima (cm)</label>
                      <input 
                        type="number" 
                        className="w-full p-2 border rounded bg-white text-xs outline-none focus:ring-2 focus:ring-cyan-200 text-center text-slate-700" 
                        placeholder="Ex: 22" 
                        value={physioData.rimaFixacao || ""} 
                        onChange={(e) => setPhysioData({ ...physioData, rimaFixacao: e.target.value })} 
                      />
                    </div>
                  </div>

                  {/* --- PARÂMETROS DO VENTILADOR (COM CAMALEÃO INTELIGENTE) --- */}
                  <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                    
                    {/* CAMPO 1: MODO */}
                    <div className="col-span-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Modo</label>
                      <select
                        className="w-full p-1.5 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                        value={physioData.parametro || ""}
                        onChange={(e) => setPhysioData({ ...physioData, parametro: e.target.value })}
                      >
                        <option value="">...</option>
                        {MODOS_VM && MODOS_VM.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    {/* CAMPO 2: O CAMALEÃO (Vt / PC / PS) */}
                    <div className="col-span-2">
                      {physioData.parametro === "VCV" ? (
                        <div className="animate-fadeIn">
                          <label className="text-[9px] font-bold uppercase text-blue-600">Vt (ml)</label>
                          <input type="number" className="w-full p-1.5 border rounded bg-blue-50 text-xs outline-none focus:ring-2 focus:ring-blue-400 text-center font-bold text-blue-700" value={physioData.volCorrente || ""} onChange={(e) => setPhysioData({ ...physioData, volCorrente: e.target.value })} />
                        </div>
                      ) : physioData.parametro === "PCV" ? (
                        <div className="animate-fadeIn">
                          <label className="text-[9px] font-bold uppercase text-orange-600">PC (cmH2O)</label>
                          <input type="number" className="w-full p-1.5 border rounded bg-orange-50 text-xs outline-none focus:ring-2 focus:ring-orange-400 text-center font-bold text-orange-700" value={physioData.pressaoControlada || ""} onChange={(e) => setPhysioData({ ...physioData, pressaoControlada: e.target.value })} />
                        </div>
                      ) : physioData.parametro === "PSV" ? (
                        <div className="animate-fadeIn">
                          <label className="text-[9px] font-bold uppercase text-green-600">PS (cmH2O)</label>
                          <input type="number" className="w-full p-1.5 border rounded bg-green-50 text-xs outline-none focus:ring-2 focus:ring-green-400 text-center font-bold text-green-700" value={physioData.pressaoSuporte || ""} onChange={(e) => setPhysioData({ ...physioData, pressaoSuporte: e.target.value })} />
                        </div>
                      ) : (
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Parâmetro</label>
                          <input type="text" disabled className="w-full p-1.5 border rounded bg-slate-100 text-xs cursor-not-allowed text-center" />
                        </div>
                      )}
                    </div>

                    {/* CAMPO 3: PEEP */}
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase">PEEP</label>
                      <input
                        type="number"
                        className="w-full p-1.5 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200 text-center"
                        value={physioData.peep || ""}
                        onChange={(e) => setPhysioData({ ...physioData, peep: e.target.value })}
                      />
                    </div>

                    {/* CAMPO 4: FR (Bloqueado em PSV) */}
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase">FR</label>
                      <input
                        type="number"
                        className={`w-full p-1.5 border rounded text-xs outline-none text-center ${physioData.parametro === "PSV" ? "bg-slate-100 cursor-not-allowed text-slate-400 border-slate-200" : "bg-slate-50 focus:ring-2 focus:ring-cyan-200"}`}
                        value={physioData.fr || ""}
                        onChange={(e) => setPhysioData({ ...physioData, fr: e.target.value })}
                        disabled={physioData.parametro === "PSV"}
                      />
                    </div>

                    {/* CAMPO 5: T.Ins (Bloqueado em PSV) */}
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase">T.ins</label>
                      <input
                        type="number" step="0.1"
                        className={`w-full p-1.5 border rounded text-xs outline-none text-center ${physioData.parametro === "PSV" ? "bg-slate-100 cursor-not-allowed text-slate-400 border-slate-200" : "bg-slate-50 focus:ring-2 focus:ring-cyan-200"}`}
                        value={physioData.tIns || ""}
                        onChange={(e) => setPhysioData({ ...physioData, tIns: e.target.value })}
                        disabled={physioData.parametro === "PSV"}
                      />
                    </div>

                    {/* CAMPO 6: I:E (Bloqueado em PSV) */}
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase">I:E</label>
                      <input
                        type="text" placeholder={physioData.parametro === "PSV" ? "-" : "1:2"}
                        className={`w-full p-1.5 border rounded text-xs outline-none text-center ${physioData.parametro === "PSV" ? "bg-slate-100 cursor-not-allowed text-slate-400 border-slate-200" : "bg-slate-50 focus:ring-2 focus:ring-cyan-200"}`}
                        value={physioData.relIE || ""}
                        onChange={(e) => setPhysioData({ ...physioData, relIE: e.target.value })}
                        disabled={physioData.parametro === "PSV"}
                      />
                    </div>

                    {/* CAMPO 7: FiO2 */}
                    <div className="col-span-2 md:col-span-8 lg:col-span-2">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">FiO2(%)</label>
                      <input
                        type="number"
                        className="w-full p-1.5 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200 text-center font-bold text-slate-700"
                        value={physioData.fiO2 || ""}
                        onChange={(e) => setPhysioData({ ...physioData, fiO2: e.target.value })}
                      />
                    </div>

                  </div>
                </div>
              )}
            </div>

            {/* --- NOVA SEÇÃO: VIA AÉREA E DISPOSITIVOS --- */}
            <div className="mt-4 border-t border-cyan-100 pt-4">
              <label className="font-bold text-cyan-800 text-xs uppercase flex items-center gap-2 mb-3">
                <Shield size={14} className="text-cyan-600" /> Via Aérea e Dispositivos
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Cuff */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Pressão do Cuff (cmH2O)</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded bg-slate-50 text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                    placeholder="Ex: 25"
                    value={physioData.cuff || ""}
                    onChange={(e) => setPhysioData({ ...physioData, cuff: e.target.value })}
                  />
                </div>

                {/* Filtro HMEF */}
                <div className="flex flex-col gap-1">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase cursor-pointer h-5">
                    <input
                      type="checkbox"
                      checked={physioData.filtroHMEF || false}
                      onChange={(e) => {
                        // Se desmarcar, limpa a data também
                        const newData = { ...physioData, filtroHMEF: e.target.checked };
                        if (!e.target.checked) newData.dataHMEF = "";
                        setPhysioData(newData);
                      }}
                    />
                    Filtro HMEF
                  </label>
                  <input
                    type="date"
                    className={`w-full p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-cyan-200 ${!physioData.filtroHMEF ? 'bg-gray-100 opacity-50 cursor-not-allowed' : 'bg-slate-50'}`}
                    value={physioData.dataHMEF || ""} 
                    onChange={(e) => setPhysioData({ ...physioData, dataHMEF: e.target.value })} 
                    disabled={!physioData.filtroHMEF}
                    title="Data da troca do Filtro HMEF"
                  />
                </div>

                {/* Sistema Fechado */}
                <div className="flex flex-col gap-1">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase cursor-pointer h-5">
                    <input
                      type="checkbox"
                      checked={physioData.sistemaFechado || false}
                      onChange={(e) => {
                        // Se desmarcar, limpa a data também
                        const newData = { ...physioData, sistemaFechado: e.target.checked };
                        if (!e.target.checked) newData.dataSFA = "";
                        setPhysioData(newData);
                      }}
                    />
                    Sistema Fechado (Trach Care)
                  </label>
                  <input
                    type="date"
                    className={`w-full p-2 border rounded text-xs outline-none focus:ring-2 focus:ring-cyan-200 ${!physioData.sistemaFechado ? 'bg-gray-100 opacity-50 cursor-not-allowed' : 'bg-slate-50'}`}
                    value={physioData.dataSFA || ""} 
                    onChange={(e) => setPhysioData({ ...physioData, dataSFA: e.target.value })} 
                    disabled={!physioData.sistemaFechado}
                    title="Data da troca do Sistema Fechado"
                  />
                </div>

              </div>
            </div>

            {/* --- SECREÇÃO (ADMISSÃO) --- */}
            <div className="mt-4 border-t border-cyan-100 pt-4 mb-4">
              <label className="font-bold text-cyan-800 text-xs uppercase flex items-center gap-2 mb-3">
                Secreção
              </label>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <label className="flex items-center gap-2 mb-2 text-xs text-slate-700 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={physioData.secrecao || false}
                    onChange={(e) => setPhysioData({ ...physioData, secrecao: e.target.checked })}
                  />
                  Presente na Admissão?
                </label>
                
                {physioData.secrecao && (
                  <div className="grid grid-cols-3 gap-2 mt-3 animate-fadeIn">
                    <select
                      className="p-2 border rounded bg-white text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                      value={physioData.secrecaoAspecto || ""}
                      onChange={(e) => setPhysioData({ ...physioData, secrecaoAspecto: e.target.value })}
                    >
                      <option value="">Aspecto...</option>
                      {ASPECTO_SECRECAO.map((a) => (
                        <option key={a}>{a}</option>
                      ))}
                    </select>
                    <select
                      className="p-2 border rounded bg-white text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                      value={physioData.secrecaoColoracao || ""}
                      onChange={(e) => setPhysioData({ ...physioData, secrecaoColoracao: e.target.value })}
                    >
                      <option value="">Coloração...</option>
                      {COLORACAO_SECRECAO.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                    <select
                      className="p-2 border rounded bg-white text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                      value={physioData.secrecaoQtd || ""}
                      onChange={(e) => setPhysioData({ ...physioData, secrecaoQtd: e.target.value })}
                    >
                      <option value="">Qtd...</option>
                      {QTD_SECRECAO.map((q) => (
                        <option key={q}>{q}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* --- NOVA SEÇÃO: GASOMETRIA DE ADMISSÃO --- */}
            <div className="mt-4 border-t border-cyan-100 pt-4">
              <div className="flex flex-col md:flex-row justify-between md:items-center mb-3 gap-2">
                <label className="font-bold text-cyan-800 text-xs uppercase flex items-center gap-2">
                  <Activity size={14} className="text-red-500" /> Gasometria de Admissão
                </label>
                <div className="flex items-center gap-2 bg-red-50 p-1.5 rounded-lg border border-red-100">
                  <span className="text-[10px] font-bold text-red-700 uppercase">Horário:</span>
                  <input 
                    type="time" 
                    className="p-1 border rounded bg-white text-xs outline-none focus:ring-2 focus:ring-red-200 text-red-700 font-bold"
                    value={physioData.gasoHora || ""}
                    onChange={(e) => setPhysioData({ ...physioData, gasoHora: e.target.value })}
                    title="Se preenchido, os dados irão automaticamente para a tabela principal"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                {[{id: "gaso_pH", label: "pH"}, {id: "gaso_pCO2", label: "pCO2"}, {id: "gaso_PaO2", label: "PaO2"}, {id: "gaso_BE", label: "BE"}, 
                  {id: "gaso_HCO3", label: "HCO3"}, {id: "gaso_SatO2", label: "SatO2"}, {id: "gaso_FiO2", label: "FiO2"}, {id: "gaso_PF", label: "P/F"}].map(param => (
                  <div key={param.id} className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-500 text-center mb-0.5">{param.label}</span>
                    <input
                      type="text"
                      className="w-full p-1.5 border rounded bg-slate-50 text-xs text-center outline-none focus:ring-2 focus:ring-cyan-200"
                      value={physioData[param.id] || ""}
                      onChange={(e) => setPhysioData({ ...physioData, [param.id]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-slate-400 mt-2 italic text-right">* Preencha o horário para salvar na tabela geral.</p>
            </div>
          </div>

          {/* --- NOVA SEÇÃO: CONDUTAS FISIOTERAPÊUTICAS --- */}
          <div className="bg-white p-4 border border-cyan-100 rounded-xl shadow-sm mt-4">
            <label className="font-bold text-cyan-800 mb-2 block uppercase flex items-center gap-2">
              <ClipboardCheck size={16} className="text-cyan-600" /> Condutas Fisioterapêuticas
            </label>
            <textarea
              className="w-full p-3 border rounded-lg h-56 outline-none focus:ring-2 focus:ring-cyan-200 resize-y text-xs text-slate-700 bg-slate-50"
              value={physioData.condutas || ""}
              onChange={(e) => setPhysioData({ ...physioData, condutas: e.target.value })}
            />
          </div>
        </div>

        <div className="p-4 bg-slate-100 border-t flex flex-col-reverse sm:flex-row justify-end gap-3 sticky bottom-0 z-10">
          <button onClick={() => setShowPhysioModal(false)} className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors w-full sm:w-auto">
            Cancelar
          </button>
          <button onClick={handleFinalizePhysioAdmission} className="px-6 py-3 rounded-xl font-bold text-white bg-cyan-600 hover:bg-cyan-700 shadow-lg transition-colors flex items-center justify-center gap-2 w-full sm:w-auto">
            <FileText size={18} /> Finalizar e Gerar Texto
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhysioAdmissionModal;