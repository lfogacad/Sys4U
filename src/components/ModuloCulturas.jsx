import React, { useState } from 'react';
import { Microscope, UploadCloud, Bot, AlertTriangle, CheckCircle, X, Bug, Link } from 'lucide-react';

const ModuloCulturas = ({ currentPatient, updateNested, apiKey }) => {
  const [loadingId, setLoadingId] = useState(null);
  const [modalIA, setModalIA] = useState(null);

  // 1. EXTRAÇÃO SEGURA
  const culturas = currentPatient?.culturas?.lista || [];
  
  // 2. FILTRO VISUAL
  const culturasValidas = culturas.filter(c => c && c.tipo && c.tipo.trim() !== "");

  // ==========================================
  // MOTOR DA IA (GEMINI VISION) - VERSÃO BLINDADA
  // ==========================================
  const analisarAntibiograma = async (e, culturaId) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoadingId(culturaId);

    try {
      // 1. Garante que o tipo de arquivo seja reconhecido (Crucial para PDFs)
      const mimeType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

      const base64Data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
      });

      const promptCCIH = `
Você é um Médico Infectologista e especialista em Antimicrobial Stewardship.
Analise este antibiograma e retorne APENAS um JSON válido. Não inclua textos explicativos fora do JSON.

{
  "status": "Positivo ou Negativo",
  "germe": "Nome do microrganismo (se negativo, deixe vazio)",
  "antibioticosTestados": ["Lista de TODOS os antibióticos testados"],
  "antibioticosResistentes": ["Lista APENAS dos antibióticos com Resistência (R) ou Intermediário (I). Se for tudo sensível, retorne um array vazio []"],
  "analise": "Sua análise terapêutica baseada no arsenal: [Ceftriaxona, Amoxicilina/Clavulanato, Cefepime, Oxacilina, Ampicilina, Tazocin, Meropenem, Clindamicina, Vancomicina, Fluconazol, Anfotericina B, Amicacina, Gentamicina, Cirpofloxacino, Levofloxacino, Metronidazol, SMT/TMP].",
  "exigeIsolamento": true ou false
}
REGRA DE ISOLAMENTO: Retorne true se o germe for multirresistente (KPC, MRSA, VRE, Acinetobacter MDR, Pseudomonas MDR, ESBL) ou Clostridium.
`;

      const currentKey = apiKey || window.apiKey;
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${currentKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [ { text: promptCCIH }, { inline_data: { mime_type: mimeType, data: base64Data } } ] }]
          }),
        }
      );

      const data = await response.json();
      
      if (data.error) throw new Error(`API Google: ${data.error.message}`);
      if (!data.candidates || data.candidates.length === 0) throw new Error("A IA bloqueou a leitura ou não retornou dados.");

      const aiText = data.candidates[0].content.parts[0].text;
      
      // 🚨 EXTRATOR CIRÚRGICO DE JSON: Ignora "tagarelices" da IA e pega só os dados
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("Resposta bruta da IA:", aiText);
        throw new Error("A IA não conseguiu estruturar os dados no formato esperado.");
      }

      const resultadoIA = JSON.parse(jsonMatch[0]);

      // 1. Atualiza a lista de culturas com os novos arrays
      const culturasAtualizadas = culturas.map(c => {
        if (c.id === culturaId) {
          return {
            ...c,
            status: resultadoIA.status,
            germe: resultadoIA.germe || "",
            testados: resultadoIA.antibioticosTestados || [],
            resistentes: resultadoIA.antibioticosResistentes || [],
            analiseIA: resultadoIA.analise || "",
            dataResultado: new Date().toISOString().split('T')[0],
            irasAssociada: "" 
          };
        }
        return c;
      });
      updateNested("culturas", "lista", culturasAtualizadas);

      // 2. GATILHO DE ISOLAMENTO GLOBAL
      if (resultadoIA.exigeIsolamento) {
        updateNested("medical", "isolamentoContato", true);
        updateNested("medical", "motivoIsolamento", resultadoIA.germe);
        updateNested("medical", "dataInicioIsolamento", new Date().toISOString().split('T')[0]);
      }

    } catch (error) {
      console.error("Erro completo:", error);
      alert(`Falha na Análise:\n${error.message}`);
    } finally {
      setLoadingId(null);
      e.target.value = null; // Reseta o input do arquivo para permitir upload do mesmo arquivo caso dê erro
    }
  };

  if (culturasValidas.length === 0) return null;

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
      <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 border-b pb-2">
        <Microscope className="text-indigo-600" size={18} /> Monitoramento de Culturas (CCIH)
      </h3>

      {/* BANNER DE ISOLAMENTO COM BOTÃO DE RETIRADA */}
      {currentPatient.medical?.isolamentoContato && (
        <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex flex-col md:flex-row justify-between items-center gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-lg text-white">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h4 className="text-red-800 font-black text-sm uppercase">Precaução de Contato Ativa</h4>
              <p className="text-red-700 text-xs font-bold">
                Microrganismo: {currentPatient.medical.motivoIsolamento} | Início: {currentPatient.medical.dataInicioIsolamento?.split('-').reverse().join('/')}
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => {
              if(window.confirm("Deseja retirar a precaução de contato? Certifique-se de que os critérios da CCIH foram atingidos.")) {
                updateNested("medical", "isolamentoContato", false);
                updateNested("medical", "motivoIsolamento", "");
              }
            }}
            className="px-4 py-2 bg-white border border-red-300 text-red-700 text-xs font-black rounded-lg hover:bg-red-100 transition-colors"
          >
            ENCERRAR PRECAUÇÃO
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {culturasValidas.map((cultura) => (
          <div key={cultura.id} className="p-3 border rounded-lg bg-slate-50 relative overflow-hidden flex flex-col justify-between">
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${cultura.status === 'Positivo' ? 'bg-red-500' : cultura.status === 'Negativo' ? 'bg-emerald-500' : 'bg-amber-400'}`}></div>
            
            <div className="pl-2">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-black text-slate-700 uppercase">{cultura.tipo}</span>
                <span className="text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border">
                  Coleta: {cultura.dataColeta ? cultura.dataColeta.split('-').reverse().join('/') : 'N/D'}
                </span>
              </div>

              {cultura.status === "Pendente" && (
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                    <AlertTriangle size={12}/> Aguardando Resultado
                  </span>
                  <label className="cursor-pointer bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors">
                    {loadingId === cultura.id ? (
                      <span className="animate-pulse">Analisando...</span>
                    ) : (
                      <> <UploadCloud size={14} /> Anexar Laudo </>
                    )}
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => analisarAntibiograma(e, cultura.id)} disabled={loadingId === cultura.id} />
                  </label>
                </div>
              )}

              {cultura.status === "Negativo" && (
                <div className="mt-2 text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle size={14}/> Negativo ({cultura.dataResultado ? cultura.dataResultado.split('-').reverse().join('/') : 'N/D'})
                </div>
              )}

              {/* SE POSITIVO: MOSTRA O GERME E O BOTÃO DA IA */}
              {cultura.status === "Positivo" && (
                <div className="mt-2 flex flex-col gap-3">
                  <div className="text-sm font-black text-red-600 flex items-center gap-1 leading-tight">
                    <Bug size={16} className="shrink-0"/> {cultura.germe}
                  </div>
                  
                  {/* EXIBIÇÃO DA CLASSIFICAÇÃO DA CCIH (Se houver) */}
                  {cultura.irasAssociada && (
                    <div className="mt-1 bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">
                      <Link size={10} /> CCIH: {cultura.irasAssociada}
                    </div>
                  )}

                  <button 
                    onClick={() => setModalIA(cultura)}
                    className="w-full text-[10px] bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 rounded transition-colors flex items-center justify-center gap-1 mt-1"
                  >
                    <Bot size={12} className="text-amber-400" /> Ver Antibiograma Estruturado
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE ANÁLISE DA IA */}
      {modalIA && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-fadeIn max-h-[90vh] flex flex-col">
            <div className="bg-slate-800 p-4 flex justify-between items-center text-white shrink-0">
              <h3 className="font-bold flex items-center gap-2">
                <Bot className="text-amber-400" size={18}/> 
                Consultoria CCIH - Análise de Resistência
              </h3>
              <button onClick={() => setModalIA(null)} className="text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
            </div>
            
            <div className="p-5 overflow-y-auto">
              <div className="mb-4 pb-4 border-b border-slate-100">
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">
                  Isolado em {modalIA.tipo} ({modalIA.dataResultado ? modalIA.dataResultado.split('-').reverse().join('/') : 'N/D'})
                </p>
                <p className="text-xl font-black text-red-600">{modalIA.germe}</p>
                {modalIA.irasAssociada && (
                  <span className="inline-block mt-2 bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold border border-indigo-200">
                    Classificação: {modalIA.irasAssociada}
                  </span>
                )}
              </div>

              {/* EXIBIÇÃO DE RESISTÊNCIA ESTRUTURADA */}
              {modalIA.resistentes && modalIA.resistentes.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-100">
                  <p className="text-[10px] font-black text-red-800 uppercase mb-2 flex items-center gap-1">
                    <AlertTriangle size={12} /> Perfil de Resistência Detectado:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {modalIA.resistentes.map((atb, idx) => (
                      <span key={idx} className="bg-red-600 text-white px-2 py-1 rounded text-[10px] font-bold shadow-sm">
                        {atb}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-sm text-slate-700 whitespace-pre-wrap font-medium leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                {modalIA.analiseIA}
              </div>
            </div>
            
            <div className="p-4 bg-white border-t flex justify-end shrink-0">
              <button onClick={() => setModalIA(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors text-sm">
                Fechar Análise
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuloCulturas;