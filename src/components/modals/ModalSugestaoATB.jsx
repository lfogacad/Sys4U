import React, { useState, useEffect, useMemo } from 'react';
import { X, Brain, AlertTriangle, Activity, Syringe, Clock, CheckCircle, ShieldAlert } from 'lucide-react';
import { calculateCreatinineClearance } from "../../utils/core";

const ModalSugestaoATB = ({ isOpen, onClose, currentPatient, onApply }) => {
  // --- ESTADOS MANUAIS DO MÉDICO ---
  const [foco, setFoco] = useState('');
  const [origem, setOrigem] = useState('Comunitária');
  const [isCirurgiaLimpa, setIsCirurgiaLimpa] = useState(false);
  const [isAlergiaBeta, setIsAlergiaBeta] = useState(false);
  const [riscoMDR, setRiscoMDR] = useState(false); // Risco MRSA ou ESBL
  const [gravidadeManual, setGravidadeManual] = useState('');

  // --- AUTO-FETCH (DADOS DO PRONTUÁRIO) ---
  const peso = currentPatient?.nutri?.peso ? parseFloat(currentPatient.nutri.peso) : null;
  const noraDose = currentPatient?.sofa_data_technical?.lastNoraDose ? parseFloat(currentPatient.sofa_data_technical.lastNoraDose) : 0;
  const lactato = currentPatient?.labs?.today?.lactato ? parseFloat(currentPatient.labs.today.lactato) : 0;
  const clcrText = calculateCreatinineClearance(currentPatient);
  const clcr = !isNaN(parseFloat(clcrText)) ? parseFloat(clcrText) : null;
  
  // Inferência automática de gravidade
  const isChoqueAuto = noraDose > 0 || lactato > 2.0;
  const isChoque = isChoqueAuto || gravidadeManual === 'Choque Séptico';

  useEffect(() => {
    if (isChoqueAuto && !gravidadeManual) setGravidadeManual('Choque Séptico');
  }, [isChoqueAuto, gravidadeManual]);

      // --- MOTOR DE REGRAS (Baseado no Protocolo de Ariquemes + Ajuste Renal Sanford) ---
  const sugestao = useMemo(() => {
    if (!foco && !isCirurgiaLimpa) return null;

    let drugs = [];
    let timeToAtb = isChoque ? "1 HORA" : "3 HORAS";
    let alertColor = isChoque ? "bg-red-100 text-red-800 border-red-300" : "bg-amber-100 text-amber-800 border-amber-300";

    // FUNÇÃO INTERNA: Calcula a dose de manutenção com base no Clearance (Sanford Guide)
    const getDoseManutencao = (atb, isMeningiteOuGrave = false) => {
      const normal = !clcr || clcr >= 50;
      const tagAjuste = " ⚠️ (Ajuste Renal)"; // Tag que aponta que houve correção
      
      switch(atb) {
        case "MEROPENEM":
          if (normal) return isMeningiteOuGrave ? "2g IV 8/8h" : "1g IV 8/8h";
          if (clcr >= 26) return (isMeningiteOuGrave ? "2g IV 12/12h" : "1g IV 12/12h") + tagAjuste;
          if (clcr >= 10) return (isMeningiteOuGrave ? "1g IV 12/12h" : "500mg IV 12/12h") + tagAjuste;
          return (isMeningiteOuGrave ? "1g IV 24/24h" : "500mg IV 24/24h") + tagAjuste;

        case "PIPERACILINA + TAZOBACTAM":
          if (normal) return "4.5g IV 6/6h";
          if (clcr >= 20) return "4.5g IV 8/8h" + tagAjuste;
          return "2.25g IV 8/8h" + tagAjuste;

        case "CEFEPIME":
          if (normal) return "2g IV 8/8h";
          if (clcr >= 30) return "2g IV 12/12h" + tagAjuste;
          if (clcr >= 11) return "2g IV 24/24h" + tagAjuste;
          return "1g IV 24/24h" + tagAjuste;

        case "VANCOMICINA":
          const vancoDose = peso ? `${Math.round(peso * 15)}mg IV` : "15 mg/kg IV";
          if (normal) return `${vancoDose} 12/12h`;
          if (clcr >= 20) return `${vancoDose} 24/24h` + tagAjuste;
          return `${vancoDose} a cada 48h (Guiar por nível sérico)` + tagAjuste;

        case "AMICACINA":
          const amicaDose = peso ? `${Math.round(peso * 15)}mg IV` : "15 mg/kg IV";
          if (normal) return `${amicaDose} 24/24h`;
          if (clcr >= 20) return `${amicaDose} 48/48h` + tagAjuste;
          return `${amicaDose} (Dose única - Guiar por nível sérico)` + tagAjuste;

        case "AZTREONAM":
          if (normal) return "2g IV 8/8h";
          if (clcr >= 10) return "1g IV 8/8h" + tagAjuste;
          return "500mg IV 8/8h" + tagAjuste;

        case "CEFTRIAXONA":
          return isMeningiteOuGrave ? "2g IV 12/12h" : "2g IV 24/24h"; // Sem ajuste renal

        case "AZITROMICINA": return "500mg VO 24/24h"; // Sem ajuste renal
        case "METRONIDAZOL": return "500mg IV 8/8h"; // Sem ajuste renal
        case "OXACILINA": return "2g IV 4/4h"; // Sem ajuste renal
        case "CLINDAMICINA": return "600mg IV 8/8h"; // Sem ajuste renal
        case "CEFAZOLINA": return "2g IV 8/8h"; // Profilaxia
        default: return "Dose padrão";
      }
    };

    // REGRA 1: Cirurgia Limpa (Trava de Profilaxia)
    if (isCirurgiaLimpa) {
      return {
        drugs: [{ nome: "CEFAZOLINA", ataque: "Não aplicável", manutencao: getDoseManutencao("CEFAZOLINA"), infusao: "30 min" }],
        timeToAtb: "Profilaxia Cirúrgica", alertColor: "bg-blue-100 text-blue-800 border-blue-300",
        aviso: "⚠️ Pós-operatório de Cirurgia Limpa: O protocolo recomenda apenas profilaxia. ATB terapêutico desencorajado."
      };
    }

    // REGRA 2: Alergia a Betalactâmicos (Fallback Genérico)
    if (isAlergiaBeta) {
      return {
        drugs: [
          { nome: "AZTREONAM", ataque: "Não aplicável", manutencao: getDoseManutencao("AZTREONAM"), infusao: "30 min" },
          { nome: "VANCOMICINA", ataque: peso ? `${Math.round(peso * 20)}mg IV` : "20-25 mg/kg IV", manutencao: getDoseManutencao("VANCOMICINA"), infusao: "Lenta (máx 10mg/min)" }
        ],
        timeToAtb, alertColor,
        aviso: "🚨 ALERGIA A BETALACTÂMICOS: Sugestão alternativa gerada. Discutir com CCIH/Infectologia."
      };
    }

    // REGRA 3: Focos Infecciosos (Tabela 5 e 6 do Protocolo)
    if (foco === 'Pulmonar (PAC/PAV)') {
      if (origem === 'Comunitária') {
        drugs.push({ nome: "CEFTRIAXONA", ataque: "Não aplicável", manutencao: getDoseManutencao("CEFTRIAXONA"), infusao: "30 min" });
        drugs.push({ nome: "AZITROMICINA", ataque: "Não aplicável", manutencao: getDoseManutencao("AZITROMICINA"), infusao: "Não aplicável" });
      } else { // PAV
        if (isChoque) {
          drugs.push({ nome: "MEROPENEM", ataque: "1g a 2g IV", manutencao: getDoseManutencao("MEROPENEM", true), infusao: "Estendida 3h" });
          drugs.push({ nome: "AMICACINA", ataque: "Não aplicável", manutencao: getDoseManutencao("AMICACINA"), infusao: "30 min" });
          if (riscoMDR) drugs.push({ nome: "VANCOMICINA", ataque: peso ? `${Math.round(peso * 20)}mg IV` : "20-25 mg/kg IV", manutencao: getDoseManutencao("VANCOMICINA"), infusao: "Lenta" });
        } else {
          drugs.push({ nome: "CEFEPIME", ataque: "2g IV", manutencao: getDoseManutencao("CEFEPIME"), infusao: "Estendida 3 a 4h" });
        }
      }
    } 
    else if (foco === 'Urinário') {
      if (origem === 'Comunitária') {
        if (riscoMDR) drugs.push({ nome: "MEROPENEM", ataque: "1g a 2g IV", manutencao: getDoseManutencao("MEROPENEM"), infusao: "Estendida 3h" });
        else drugs.push({ nome: "CEFTRIAXONA", ataque: "Não aplicável", manutencao: getDoseManutencao("CEFTRIAXONA"), infusao: "30 min" });
      } else { // ITU-AC
        if (isChoque || riscoMDR) {
          drugs.push({ nome: "MEROPENEM", ataque: "1g a 2g IV", manutencao: getDoseManutencao("MEROPENEM"), infusao: "Estendida 3h" });
          drugs.push({ nome: "AMICACINA", ataque: "Não aplicável", manutencao: getDoseManutencao("AMICACINA"), infusao: "30 min" });
        } else {
          drugs.push({ nome: "PIPERACILINA + TAZOBACTAM", ataque: "4.5g IV", manutencao: getDoseManutencao("PIPERACILINA + TAZOBACTAM"), infusao: "Estendida 3 a 4h" });
        }
      }
    }
    else if (foco === 'Abdominal') {
      if (isChoque) {
        drugs.push({ nome: "PIPERACILINA + TAZOBACTAM", ataque: "4.5g IV", manutencao: getDoseManutencao("PIPERACILINA + TAZOBACTAM"), infusao: "Estendida 3 a 4h" });
      } else {
        drugs.push({ nome: "CEFTRIAXONA", ataque: "Não aplicável", manutencao: getDoseManutencao("CEFTRIAXONA"), infusao: "30 min" });
        drugs.push({ nome: "METRONIDAZOL", ataque: "Não aplicável", manutencao: getDoseManutencao("METRONIDAZOL"), infusao: "60 min" });
      }
    }
    else if (foco === 'Pele e Partes Moles') {
      if (riscoMDR || isChoque) { 
        drugs.push({ nome: "VANCOMICINA", ataque: peso ? `${Math.round(peso * 20)}mg IV` : "20-25 mg/kg IV", manutencao: getDoseManutencao("VANCOMICINA"), infusao: "Lenta" });
        drugs.push({ nome: "PIPERACILINA + TAZOBACTAM", ataque: "4.5g IV", manutencao: getDoseManutencao("PIPERACILINA + TAZOBACTAM"), infusao: "Estendida 3 a 4h" });
        drugs.push({ nome: "CLINDAMICINA", ataque: "Não aplicável", manutencao: getDoseManutencao("CLINDAMICINA"), infusao: "30 min" });
      } else {
        drugs.push({ nome: "OXACILINA", ataque: "Não aplicável", manutencao: getDoseManutencao("OXACILINA"), infusao: "60 min" });
      }
    }
    else if (foco === 'SNC (Meningite)') {
      drugs.push({ nome: "CEFTRIAXONA", ataque: "Não aplicável", manutencao: getDoseManutencao("CEFTRIAXONA", true), infusao: "30 min" });
      if (riscoMDR) drugs.push({ nome: "VANCOMICINA", ataque: peso ? `${Math.round(peso * 20)}mg IV` : "20-25 mg/kg IV", manutencao: getDoseManutencao("VANCOMICINA"), infusao: "Lenta" });
    }
    else if (foco === 'Corrente Sanguínea (IPCS-C)') {
      drugs.push({ nome: "VANCOMICINA", ataque: peso ? `${Math.round(peso * 20)}mg IV` : "20-25 mg/kg IV", manutencao: getDoseManutencao("VANCOMICINA"), infusao: "Lenta" });
      drugs.push({ nome: "CEFEPIME", ataque: "2g IV", manutencao: getDoseManutencao("CEFEPIME"), infusao: "Estendida 3 a 4h" });
    }

    return { drugs, timeToAtb, alertColor, aviso: null };
  }, [foco, origem, isCirurgiaLimpa, isAlergiaBeta, riscoMDR, isChoque, peso, clcr]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-700 p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <Brain size={24} />
            <h2 className="text-lg font-black tracking-wide">Assistente de Prescrição Antimicrobiana</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors"><X size={24} /></button>
        </div>

        <div className="overflow-y-auto p-6 flex-1 bg-slate-50">
          
          {/* AUTO-FETCH CONTEXT */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="bg-white border border-slate-200 px-3 py-2 rounded-lg flex items-center gap-2 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase">Peso:</span>
              <span className={`text-sm font-black ${peso ? 'text-slate-800' : 'text-red-500'}`}>{peso ? `${peso} kg` : 'S/ Dado'}</span>
            </div>
            <div className="bg-white border border-slate-200 px-3 py-2 rounded-lg flex items-center gap-2 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase">ClCr:</span>
              <span className={`text-sm font-black ${clcr && clcr < 50 ? 'text-red-600' : 'text-slate-800'}`}>{clcrText} {clcr ? 'ml/min' : ''}</span>
            </div>
            <div className="bg-white border border-slate-200 px-3 py-2 rounded-lg flex items-center gap-2 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase">Lactato:</span>
              <span className={`text-sm font-black ${lactato > 2 ? 'text-red-600' : 'text-slate-800'}`}>{lactato || '-'}</span>
            </div>
            <div className="bg-white border border-slate-200 px-3 py-2 rounded-lg flex items-center gap-2 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase">Noradrenalina:</span>
              <span className={`text-sm font-black ${noraDose > 0 ? 'text-red-600' : 'text-slate-800'}`}>{noraDose > 0 ? `${noraDose} mcg/kg/min` : 'Zero'}</span>
            </div>
          </div>

          {/* FORMULÁRIO DE DECISÃO */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6">
            <h3 className="text-sm font-bold text-slate-800 mb-4 border-b pb-2">Parâmetros Clínicos</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Lado Esquerdo */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Foco Infeccioso</label>
                  <select 
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-teal-500 font-bold text-slate-700 bg-slate-50"
                    value={foco} onChange={(e) => setFoco(e.target.value)} disabled={isCirurgiaLimpa}
                  >
                    <option value="">Selecione o Foco...</option>
                    <option value="Pulmonar (PAC/PAV)">Pulmonar (PAC / PAV)</option>
                    <option value="Urinário">Urinário (Sepse Urinária / ITU-AC)</option>
                    <option value="Abdominal">Abdominal</option>
                    <option value="Pele e Partes Moles">Pele e Partes Moles</option>
                    <option value="SNC (Meningite)">SNC (Meningite)</option>
                    <option value="Corrente Sanguínea (IPCS-C)">Corrente Sanguínea (Cateter)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Origem</label>
                  <div className="flex gap-2">
                    <button onClick={() => setOrigem('Comunitária')} disabled={isCirurgiaLimpa} className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${origem === 'Comunitária' ? 'bg-teal-50 border-teal-500 text-teal-700' : 'bg-white border-slate-200 text-slate-500'}`}>Comunitária</button>
                    <button onClick={() => setOrigem('Nosocomial')} disabled={isCirurgiaLimpa} className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${origem === 'Nosocomial' ? 'bg-teal-50 border-teal-500 text-teal-700' : 'bg-white border-slate-200 text-slate-500'}`}>Nosocomial</button>
                  </div>
                </div>
              </div>

              {/* Lado Direito (Modificadores) */}
              <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white rounded-md transition-colors">
                  <input type="checkbox" checked={isCirurgiaLimpa} onChange={(e) => setIsCirurgiaLimpa(e.target.checked)} className="w-5 h-5 text-teal-600 rounded" />
                  <span className="text-sm font-bold text-slate-700">Pós-operatório de Cirurgia Limpa</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white rounded-md transition-colors">
                  <input type="checkbox" checked={isAlergiaBeta} onChange={(e) => setIsAlergiaBeta(e.target.checked)} className="w-5 h-5 text-red-500 rounded" />
                  <span className="text-sm font-bold text-red-600">Alergia a Betalactâmicos</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white rounded-md transition-colors">
                  <input type="checkbox" checked={riscoMDR} onChange={(e) => setRiscoMDR(e.target.checked)} disabled={isCirurgiaLimpa} className="w-5 h-5 text-teal-600 rounded" />
                  <span className="text-sm font-bold text-slate-700">Risco MRSA / ESBL / Necrosante</span>
                </label>
              </div>
            </div>
          </div>

          {/* RESULTADO (SUGESTÃO) */}
          {sugestao && (
            <div className="animate-fade-in">
              <h3 className="text-sm font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-500" /> Esquema Recomendado (Protocolo Ariquemes)
              </h3>
              
              <div className="bg-white border-2 border-emerald-400 rounded-xl overflow-hidden shadow-lg">
                
                {/* Alerta de Tempo */}
                <div className={`px-4 py-2 flex items-center justify-center gap-2 border-b ${sugestao.alertColor}`}>
                  <Clock size={18} />
                  <span className="text-sm font-black uppercase tracking-wide">Administrar 1ª dose em até {sugestao.timeToAtb}</span>
                </div>

                {sugestao.aviso && (
                  <div className="bg-blue-50 p-3 border-b border-blue-100 flex items-start gap-2 text-blue-800 text-sm font-medium">
                    <ShieldAlert size={18} className="flex-shrink-0 mt-0.5" />
                    <p>{sugestao.aviso}</p>
                  </div>
                )}

                {clcr && clcr < 50 && !isCirurgiaLimpa && (
                  <div className="bg-blue-50 p-2 border-b border-blue-100 text-center text-blue-800 text-xs font-bold uppercase">
                    ℹ️ Clearance reduzido ({clcrText} ml/min). As doses de manutenção abaixo já foram ajustadas automaticamente.
                  </div>
                )}

                <div className="p-0">
                  {sugestao.drugs.map((drug, idx) => (
                    <div key={idx} className="p-4 border-b border-slate-100 last:border-0 flex flex-col md:flex-row md:items-center gap-4 hover:bg-slate-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Syringe size={16} className="text-emerald-600" />
                          <span className="text-lg font-black text-slate-800">{drug.nome}</span>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-2">
                          <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded">Ataque: {drug.ataque}</span>
                          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded">Manutenção: {drug.manutencao}</span>
                          <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">Infusão: {drug.infusao}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER / AÇÕES */}
        <div className="bg-white border-t border-slate-200 p-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancelar</button>
          <button 
            disabled={!sugestao}
            onClick={() => {
              onApply(sugestao.drugs);
              onClose();
            }} 
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md transition-colors flex items-center gap-2"
          >
            <CheckCircle size={18} /> Aplicar à Prescrição
          </button>
        </div>

      </div>
    </div>
  );
};

export default ModalSugestaoATB;