import React, { useState, useEffect } from 'react';
import { X, Activity, ShieldAlert, Syringe, BrainCircuit } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase'; 

// Opções com as strings EXATAS do seu banco de dados
const BRADEN_OPTS = {
  percepcaoSensorial: [{v:1, l:"1 - Totalmente limitado"}, {v:2, l:"2 - Muito limitado"}, {v:3, l:"3 - Levemente limitado"}, {v:4, l:"4 - Nenhuma limitação"}],
  umidade: [{v:1, l:"1 - Completamente molhado"}, {v:2, l:"2 - Muito molhado"}, {v:3, l:"3 - Ocasionalmente molhado"}, {v:4, l:"4 - Raramente molhado"}],
  atividade: [{v:1, l:"1 - Acamado"}, {v:2, l:"2 - Confinado à cadeira"}, {v:3, l:"3 - Anda ocasionalmente"}, {v:4, l:"4 - Anda frequentemente"}],
  mobilidade: [{v:1, l:"1 - Totalmente imóvel"}, {v:2, l:"2 - Muito limitado"}, {v:3, l:"3 - Levemente limitado"}, {v:4, l:"4 - Nenhuma limitação"}],
  nutricao: [{v:1, l:"1 - Muito pobre"}, {v:2, l:"2 - Provavelmente inadequada"}, {v:3, l:"3 - Adequada"}, {v:4, l:"4 - Excelente"}],
  friccaoCisalhamento: [{v:1, l:"1 - Problema"}, {v:2, l:"2 - Problema potencial"}, {v:3, l:"3 - Nenhum problema aparente"}]
};

const BRADEN_LABELS = {
  percepcaoSensorial: "Percepção Sensorial", umidade: "Umidade", atividade: "Atividade", 
  mobilidade: "Mobilidade", nutricao: "Nutrição", friccaoCisalhamento: "Fricção / Cisalhamento"
};

const MORSE_OPTS = {
  historicoDeQuedas: [{v:0, l:"0 - Não"}, {v:25, l:"25 - Sim"}],
  diagnosticoSecundario: [{v:0, l:"0 - Não"}, {v:15, l:"15 - Sim"}],
  auxilioNaMarcha: [{v:0, l:"0 - Nenhum / Acamado / Auxiliado por profissional"}, {v:15, l:"15 - Muleta / Bengala / Andador"}, {v:30, l:"30 - Apoia-se nos móveis"}],
  terapiaEndovenosa: [{v:0, l:"0 - Não"}, {v:20, l:"20 - Sim"}],
  marcha: [{v:0, l:"0 - Normal / Acamado / Cadeira de rodas"}, {v:10, l:"10 - Fraca"}, {v:20, l:"20 - Comprometida / Cambaleante"}],
  estadoMental: [{v:0, l:"0 - Orientado / Capaz"}, {v:15, l:"15 - Superestima cap. / Esquece limites"}]
};

const MORSE_LABELS = {
  historicoDeQuedas: "Histórico de Quedas", diagnosticoSecundario: "Diagnóstico Secundário", auxilioNaMarcha: "Auxílio na Marcha", 
  terapiaEndovenosa: "Terapia Endovenosa", marcha: "Marcha", estadoMental: "Estado Mental"
};

const ModalChecklistEnfermagem = ({ isOpen, onClose, currentPatient, updateNested, handleBlurSave, onGenerateAI }) => {
  const today = new Date().toISOString().split('T')[0];

  // Estados Braden e Morse mapeados com as chaves exatas do Firebase
  const [bradenData, setBradenData] = useState({ percepcaoSensorial: '', umidade: '', atividade: '', mobilidade: '', nutricao: '', friccaoCisalhamento: '' });
  const [morseData, setMorseData] = useState({ historicoDeQuedas: '', diagnosticoSecundario: '', auxilioNaMarcha: '', terapiaEndovenosa: '', marcha: '', estadoMental: '' });

  // Estados Dispositivos
  const [cvcActive, setCvcActive] = useState(false);
  const [shileyActive, setShileyActive] = useState(false);
  const [svdActive, setSvdActive] = useState(false);
  const [initialCvc, setInitialCvc] = useState(false);
  const [initialShiley, setInitialShiley] = useState(false);
  const [initialSvd, setInitialSvd] = useState(false);
  const [cvcLocal, setCvcLocal] = useState('');
  const [shileyLocal, setShileyLocal] = useState('');

  useEffect(() => {
    if (isOpen && currentPatient) {
      const escalasHoje = currentPatient.enfermagem?.escalas_diarias?.[today];
      
      // 🔥 Zera as escalas toda vez que o modal abre
      setBradenData({ percepcaoSensorial: '', umidade: '', atividade: '', mobilidade: '', nutricao: '', friccaoCisalhamento: '' });
      setMorseData({ historicoDeQuedas: '', diagnosticoSecundario: '', auxilioNaMarcha: '', terapiaEndovenosa: '', marcha: '', estadoMental: '' });

      const enf = currentPatient.enfermagem || {};
      
      const hasActiveCvc = !!enf.cvcData && !enf.cvcRetiradaData;
      const hasActiveShiley = !!enf.shileyData && !enf.shileyRetiradaData;
      const hasActiveSvd = !!enf.svdData && !enf.svdRetiradaData;

      setCvcActive(hasActiveCvc); 
      setShileyActive(hasActiveShiley); 
      setSvdActive(hasActiveSvd);
      
      setInitialCvc(hasActiveCvc); 
      setInitialShiley(hasActiveShiley); 
      setInitialSvd(hasActiveSvd);
      setCvcLocal(enf.cvcLocal || '');
      setShileyLocal(enf.shileyLocal || '');
    }
  }, [isOpen, currentPatient, today]);

  // Cálculos Braden
  const bradenScore = Object.values(bradenData).reduce((a, b) => a + Number(b || 0), 0);
  const getBradenRisk = (score) => {
    if (Object.values(bradenData).some(v => v === '')) return "Incompleto";
    if (score <= 9) return "Altíssimo";
    if (score <= 12) return "Alto";
    if (score <= 14) return "Moderado";
    if (score <= 18) return "Baixo";
    return "Sem Risco";
  };
  const bradenRisk = getBradenRisk(bradenScore);

  // Cálculos Morse
  const morseScore = Object.values(morseData).reduce((a, b) => a + Number(b || 0), 0);
  const getMorseRisk = (score) => {
    if (Object.values(morseData).some(v => v === '')) return "Incompleto";
    if (score === 0) return "Sem Risco";
    if (score <= 24) return "Baixo";
    if (score <= 44) return "Médio";
    return "Alto";
  };
  const morseRisk = getMorseRisk(morseScore);

  const handleConfirmAndGenerate = async () => {
    const bradenIncompleto = Object.values(bradenData).some(v => v === '');
    const morseIncompleto = Object.values(morseData).some(v => v === '');

    if (bradenIncompleto || morseIncompleto) {
      alert("⚠️ Atenção: É obrigatório preencher todos os campos das Escalas de Braden e Morse para gerar a evolução.");
      return;
    }

    let auditMessages = [];

    // 1. Salva na coleção externa "indicadores_performance" para o Dashboard de Gestão
    try {
      const basePayload = {
        cpf: currentPatient.cpf || "",
        dataRegistro: new Date(), // O Firebase converte automaticamente para Timestamp
        idInternacao: currentPatient.idInternacao || currentPatient.id || "",
        nomePaciente: currentPatient.nome || ""
      };

      // Só salva se a escala estiver 100% preenchida
      if (!Object.values(bradenData).some(v => v === '')) {
        const bradenPayload = {
          ...basePayload,
          risco: bradenRisk,
          tipo: "BRADEN",
          valor: bradenScore,
          respostas: {
            atividade: BRADEN_OPTS.atividade.find(o => o.v == bradenData.atividade)?.l || "",
            friccaoCisalhamento: BRADEN_OPTS.friccaoCisalhamento.find(o => o.v == bradenData.friccaoCisalhamento)?.l || "",
            mobilidade: BRADEN_OPTS.mobilidade.find(o => o.v == bradenData.mobilidade)?.l || "",
            nutricao: BRADEN_OPTS.nutricao.find(o => o.v == bradenData.nutricao)?.l || "",
            percepcaoSensorial: BRADEN_OPTS.percepcaoSensorial.find(o => o.v == bradenData.percepcaoSensorial)?.l || "",
            umidade: BRADEN_OPTS.umidade.find(o => o.v == bradenData.umidade)?.l || ""
          }
        };
        await addDoc(collection(db, "indicadores_performance"), bradenPayload);
        auditMessages.push(`Braden salvo (${bradenScore})`);
      }

      if (!Object.values(morseData).some(v => v === '')) {
        const morsePayload = {
          ...basePayload,
          risco: morseRisk,
          tipo: "MORSE",
          valor: morseScore,
          respostas: {
            auxilioNaMarcha: MORSE_OPTS.auxilioNaMarcha.find(o => o.v == morseData.auxilioNaMarcha)?.l || "",
            diagnosticoSecundario: MORSE_OPTS.diagnosticoSecundario.find(o => o.v == morseData.diagnosticoSecundario)?.l || "",
            estadoMental: MORSE_OPTS.estadoMental.find(o => o.v == morseData.estadoMental)?.l || "",
            historicoDeQuedas: MORSE_OPTS.historicoDeQuedas.find(o => o.v == morseData.historicoDeQuedas)?.l || "",
            marcha: MORSE_OPTS.marcha.find(o => o.v == morseData.marcha)?.l || "",
            terapiaEndovenosa: MORSE_OPTS.terapiaEndovenosa.find(o => o.v == morseData.terapiaEndovenosa)?.l || ""
          }
        };
        await addDoc(collection(db, "indicadores_performance"), morsePayload);
        auditMessages.push(`Morse salvo (${morseScore})`);
      }
    } catch (error) {
      console.error("Erro ao salvar indicadores_performance:", error);
      alert("Aviso: Erro ao salvar as escalas no dashboard de gestão. Verifique a conexão.");
    }

    // 2. Salva localmente no paciente para manter a memória do modal
    const escalasDiarias = currentPatient.enfermagem?.escalas_diarias || {};
    updateNested("enfermagem", "escalas_diarias", { 
      ...escalasDiarias, 
      [today]: {
        braden: { score: bradenScore, risco: bradenRisk, detalhes: bradenData },
        morse: { score: morseScore, risco: morseRisk, detalhes: morseData }
      } 
    });

    // 3. Lógica Bidirecional de Dispositivos (Corrigido para salvar em "enfermagem")
    if (!initialCvc && cvcActive) {
      updateNested("enfermagem", "cvcData", today);
      updateNested("enfermagem", "cvcLocal", cvcLocal);
      updateNested("enfermagem", "cvcRetiradaData", "");
      auditMessages.push("CVC instalado");
    } else if (initialCvc && !cvcActive) {
      updateNested("enfermagem", "cvcRetiradaData", today);
      auditMessages.push("CVC retirado");
    }

    if (!initialShiley && shileyActive) {
      updateNested("enfermagem", "shileyData", today);
      updateNested("enfermagem", "shileyLocal", shileyLocal)
      updateNested("enfermagem", "shileyRetiradaData", "");
      auditMessages.push("Shiley instalado");
    } else if (initialShiley && !shileyActive) {
      updateNested("enfermagem", "shileyRetiradaData", today);
      auditMessages.push("Shiley retirado");
    }

    if (!initialSvd && svdActive) {
      updateNested("enfermagem", "svdData", today);
      updateNested("enfermagem", "cvcLocal", "");
      updateNested("enfermagem", "svdRetiradaData", "");
      auditMessages.push("SVD instalada");
    } else if (initialSvd && !svdActive) {
      updateNested("enfermagem", "svdRetiradaData", today);
      auditMessages.push("SVD retirada");
    }

    if (auditMessages.length > 0) {
      handleBlurSave(`Enfermagem: Checklist Diário (${auditMessages.join(', ')})`);
    }

    onGenerateAI();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
        
        <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <Activity size={24} />
            <h2 className="text-lg font-black tracking-wide">Evolução Diária da Enfermagem</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors"><X size={24} /></button>
        </div>

        <div className="p-6 overflow-y-auto bg-slate-50 space-y-6">
          
          {/* BRADEN */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ShieldAlert size={18} className="text-amber-500" /> Escala de Braden (Risco de LPP)
              </h3>
              <div className="text-right">
                <span className="text-2xl font-black text-blue-600">{bradenScore > 0 ? bradenScore : '-'}</span>
                <span className="text-xs font-bold text-slate-500 ml-2 uppercase">{bradenRisk}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.keys(BRADEN_OPTS).map(key => (
                <div key={key}>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{BRADEN_LABELS[key]}</label>
                  <select 
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm font-medium text-slate-700 bg-slate-50"
                    value={bradenData[key]} 
                    onChange={(e) => setBradenData({...bradenData, [key]: e.target.value})}
                  >
                    <option value="">Selecione...</option>
                    {BRADEN_OPTS[key].map(opt => <option key={opt.v} value={opt.v}>{opt.l}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* MORSE */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ShieldAlert size={18} className="text-amber-500" /> Escala de Morse (Risco de Queda)
              </h3>
              <div className="text-right">
                <span className="text-2xl font-black text-blue-600">{morseScore > 0 || Object.values(morseData).some(v=>v!=="") ? morseScore : '-'}</span>
                <span className="text-xs font-bold text-slate-500 ml-2 uppercase">{morseRisk}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.keys(MORSE_OPTS).map(key => (
                <div key={key}>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{MORSE_LABELS[key]}</label>
                  <select 
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm font-medium text-slate-700 bg-slate-50"
                    value={morseData[key]} 
                    onChange={(e) => setMorseData({...morseData, [key]: e.target.value})}
                  >
                    <option value="">Selecione...</option>
                    {MORSE_OPTS[key].map(opt => <option key={opt.v} value={opt.v}>{opt.l}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* DISPOSITIVOS */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-2">
              <Syringe size={18} className="text-blue-500" /> Checagem de Dispositivos Invasivos
            </h3>
            
            <p className="text-xs text-slate-500 mb-4">
              Marque se o paciente iniciou o uso hoje, ou desmarque caso o dispositivo tenha sido sacado.
            </p>

            <div className="space-y-3">
              <div className={`p-3 rounded-lg border transition-colors ${cvcActive ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={cvcActive} onChange={(e) => setCvcActive(e.target.checked)} className="w-5 h-5 text-blue-600 rounded" />
                    <span className="text-sm font-bold text-slate-700">Cateter Venoso Central (CVC)</span>
                  </div>
                  {!initialCvc && cvcActive && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Será instalado hoje</span>}
                  {initialCvc && !cvcActive && <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded">Será baixado hoje</span>}
                </label>
                {/* 🔥 Select do local aparece apenas quando marcado */}
                {cvcActive && (
                  <div className="mt-2 ml-8">
                    <select
                      value={cvcLocal}
                      onChange={(e) => setCvcLocal(e.target.value)}
                      className="w-full p-2 border border-blue-200 rounded-lg outline-none focus:border-blue-500 text-sm font-medium text-slate-700 bg-white"
                    >
                      <option value="">Selecione o local...</option>
                      <option disabled className="font-bold text-slate-400">─── Acesso Central (CVC) ───</option>
                      <option value="Subclávia D">Subclávia D</option>
                      <option value="Subclávia E">Subclávia E</option>
                      <option value="Jugular Interna D">Jugular Interna D</option>
                      <option value="Jugular Interna E">Jugular Interna E</option>
                      <option value="Femoral D">Femoral D</option>
                      <option value="Femoral E">Femoral E</option>
                      <option disabled className="font-bold text-slate-400">─── PICC ───</option>
                      <option value="PICC MSD">PICC MSD</option>
                      <option value="PICC MSE">PICC MSE</option>
                    </select>
                  </div>
                )}
              </div>

              <div className={`p-3 rounded-lg border transition-colors ${shileyActive ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={shileyActive} onChange={(e) => setShileyActive(e.target.checked)} className="w-5 h-5 text-blue-600 rounded" />
                    <span className="text-sm font-bold text-slate-700">Cateter de Hemodiálise (Shiley)</span>
                  </div>
                  {!initialShiley && shileyActive && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Será instalado hoje</span>}
                  {initialShiley && !shileyActive && <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded">Será baixado hoje</span>}
                </label>
                {/* 🔥 Select do local aparece apenas quando marcado */}
                {shileyActive && (
                  <div className="mt-2 ml-8">
                    <select
                      value={shileyLocal}
                      onChange={(e) => setShileyLocal(e.target.value)}
                      className="w-full p-2 border border-blue-200 rounded-lg outline-none focus:border-blue-500 text-sm font-medium text-slate-700 bg-white"
                    >
                      <option value="">Local...</option>
                      <option value="VJID">VJID</option>
                      <option value="VJIE">VJIE</option>
                      <option value="VSCD">VSCD</option>
                      <option value="VSCE">VSCE</option>
                      <option value="VFID">VFID</option>
                      <option value="VFIE">VFIE</option>
                    </select>
                  </div>
                )}
              </div>

              <div className={`p-3 rounded-lg border transition-colors ${svdActive ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={svdActive} onChange={(e) => setSvdActive(e.target.checked)} className="w-5 h-5 text-blue-600 rounded" />
                    <span className="text-sm font-bold text-slate-700">Sonda Vesical de Demora (SVD)</span>
                  </div>
                  {!initialSvd && svdActive && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Será instalada hoje</span>}
                  {initialSvd && !svdActive && <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded">Será baixada hoje</span>}
                </label>
                {svdActive && (
                  <div className="mt-2 ml-8">
                    <input 
                      type="date" 
                      className="w-full p-2 border border-blue-200 rounded-lg outline-none focus:border-blue-500 text-sm bg-white"
                      value={currentPatient.enfermagem?.svdData || today}
                      disabled
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Data de inserção registrada na admissão</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        <div className="bg-white border-t border-slate-200 p-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancelar</button>
          <button onClick={handleConfirmAndGenerate} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center gap-2">
            <BrainCircuit size={18} /> Confirmar e Gerar IA
          </button>
        </div>

      </div>
    </div>
  );
};

export default ModalChecklistEnfermagem;