import React, { useState } from 'react';
import { Microscope, UploadCloud, Bot, AlertTriangle, ShieldAlert, CheckCircle, X, Bug, Link, PenLine, Pencil, Loader2 } from 'lucide-react';
import { ModalPortal } from './ModuloUTI';

const MECANISMOS = [
  'KPC', 'NDM', 'OXA-48', 'OXA-23', 'OXA-24/40', 'OXA-58', 'VIM', 'IMP',
  'VRE', 'MRSA', 'ESBL', 'Sem carbapenemase / outro mecanismo', 'Não identificado'
];

const ModuloCulturas = ({ currentPatient, updateNested, apiKey }) => {
  const [loadingId, setLoadingId] = useState(null);
  const [loadingManualIA, setLoadingManualIA] = useState(false);
  const [modalIA, setModalIA] = useState(null);

  // MODAL "INFORMAR RESULTADO" — usado tanto para informar quanto para editar
  const [modalResultado, setModalResultado] = useState(null); // { cultura, editando }
  const [formManual, setFormManual] = useState(null);
  const [dataResultadoSel, setDataResultadoSel] = useState('');

  // 1. EXTRAÇÃO SEGURA
  const culturas = currentPatient?.culturas?.lista || [];
  // Ordena por data de coleta (mais recente primeiro).
  // A string ISO AAAA-MM-DD compara lexicograficamente igual a cronologicamente,
  // então não é necessário fazer parse de data.
  const culturasValidas = culturas
    .filter(c => c && c.tipo && c.tipo.trim() !== "")
    .sort((a, b) => {
      const porData = String(b.dataColeta || '').localeCompare(String(a.dataColeta || ''));
      if (porData !== 0) return porData;
      return String(a.tipo || '').localeCompare(String(b.tipo || ''));
    });

  const dataHojeISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Manaus' }).format(new Date());

  // Abre o modal de resultado já com a data pré-preenchida:
  // usa a data já gravada na cultura, ou a data de hoje.
  const abrirModalResultado = (cultura, editando = false) => {
    setDataResultadoSel(cultura.dataResultado || dataHojeISO());
    setModalResultado({ cultura, editando });
  };

  // ==========================================
  // MARCAR COMO NEGATIVO
  // ==========================================
  const marcarNegativo = (culturaId) => {
    const atualizadas = culturas.map(c => {
      if (c.id !== culturaId) return c;
      return {
        ...c,
        status: 'Negativo',
        germe: '', qtdEspecies: 0, contagemUFC: 0, amostrasPositivas: 'unica',
        testados: [], resistentes: [], mecanismoResistencia: [],
        classificacaoMicrobiota: '', relevanciaClinica: '',
        analiseIA: 'Resultado negativo informado manualmente.',
        dataResultado: dataResultadoSel || dataHojeISO(),
        irasAssociada: c.irasAssociada || ''
      };
    });
    updateNested("culturas", "lista", atualizadas);
    setModalResultado(null);
  };

  // Atualiza APENAS a data de resultado, sem mexer no status nem nos outros campos.
  const salvarDataResultado = (culturaId) => {
    const atualizadas = culturas.map(c => {
      if (c.id !== culturaId) return c;
      return { ...c, dataResultado: dataResultadoSel || dataHojeISO() };
    });
    updateNested("culturas", "lista", atualizadas);
    setModalResultado(null);
  };

  // ==========================================
  // VOLTAR PARA "PENDENTE"
  // ==========================================
  const limparResultado = (culturaId) => {
    if (!window.confirm('Remover o resultado informado e voltar a cultura para "Aguardando"?\n\nOs dados do antibiograma serão apagados.')) return;
    const atualizadas = culturas.map(c => {
      if (c.id !== culturaId) return c;
      return {
        ...c,
        status: 'Pendente',
        germe: '', qtdEspecies: 0, contagemUFC: 0, amostrasPositivas: 'unica',
        testados: [], resistentes: [], mecanismoResistencia: [],
        classificacaoMicrobiota: '', relevanciaClinica: '', analiseIA: '',
        dataResultado: null,
        irasAssociada: c.irasAssociada || ''
      };
    });
    updateNested("culturas", "lista", atualizadas);
    setModalResultado(null);
  };

  // ==========================================
  // SALVAR RESULTADO MANUAL
  // ==========================================
  const salvarManual = () => {
    if (!formManual || !formManual.germe?.trim()) {
      alert('Informe ao menos o nome do germe isolado.');
      return;
    }
    const resistentes = String(formManual.resistentesTexto || '').split(',').map(s => s.trim()).filter(Boolean);
    const testados = String(formManual.testadosTexto || '').split(',').map(s => s.trim()).filter(Boolean);
    const mecanismos = Array.isArray(formManual.mecanismos) && formManual.mecanismos.length > 0
      ? formManual.mecanismos
      : ['Não identificado'];

    const atualizadas = culturas.map(c => {
      if (c.id !== formManual.culturaId) return c;
      return {
        ...c,
        status: 'Positivo',
        germe: formManual.germe.trim(),
        qtdEspecies: Number(formManual.qtdEspecies) || 1,
        contagemUFC: Number(formManual.contagemUFC) || 0,
        amostrasPositivas: formManual.amostrasPositivas || 'unica',
        testados,
        resistentes,
        mecanismoResistencia: mecanismos,
        classificacaoMicrobiota: formManual.classificacaoMicrobiota || 'Não classificado',
        relevanciaClinica: formManual.relevanciaClinica || '',
        analiseIA: formManual.analiseIA || 'Resultado informado manualmente pelo profissional.',
        dataResultado: formManual.dataResultado || dataHojeISO(),
        irasAssociada: c.irasAssociada || ''
      };
    });
    updateNested("culturas", "lista", atualizadas);

    if (formManual.exigeIsolamento) {
      updateNested("medical", "isolamentoContato", true);
      updateNested("medical", "motivoIsolamento", formManual.germe.trim());
      updateNested("medical", "dataInicioIsolamento", formManual.dataResultado || dataHojeISO());
    }

    setModalResultado(null);
    setFormManual(null);
  };

  // ==========================================
  // ABRIR EDIÇÃO: pré-carrega o form
  // ==========================================
  const abrirEdicaoManual = (cultura) => {
    setFormManual({
      culturaId: cultura.id,
      germe: cultura.germe || '',
      qtdEspecies: cultura.qtdEspecies || 1,
      contagemUFC: cultura.contagemUFC || 0,
      amostrasPositivas: cultura.amostrasPositivas || 'unica',
      testadosTexto: Array.isArray(cultura.testados) ? cultura.testados.join(', ') : '',
      resistentesTexto: Array.isArray(cultura.resistentes) ? cultura.resistentes.join(', ') : '',
      mecanismos: Array.isArray(cultura.mecanismoResistencia)
        ? cultura.mecanismoResistencia
        : (cultura.mecanismoResistencia ? [cultura.mecanismoResistencia] : []),
      classificacaoMicrobiota: cultura.classificacaoMicrobiota || 'Não classificado',
      relevanciaClinica: cultura.relevanciaClinica || '',
      analiseIA: cultura.analiseIA || '',
      exigeIsolamento: !!currentPatient?.medical?.isolamentoContato,
      dataResultado: cultura.dataResultado || dataHojeISO()
    });
  };

  // ==========================================
  // PROMPT CCIH (compartilhado entre laudo e manual)
  // ==========================================
  const montarPromptCCIH = () => `
Você é um Médico Infectologista e especialista em Antimicrobial Stewardship.
Analise o antibiograma fornecido e retorne APENAS um JSON válido. Não inclua textos explicativos fora do JSON.
{
  "status": "Positivo ou Negativo",
  "germe": "Nome do(s) microrganismo(s) (se negativo, deixe vazio)",
  "qtdEspecies": "Número inteiro de quantas espécies diferentes cresceram (ex: 1 ou 2). Se o laudo citar 'flora mista' ou 3 ou mais espécies, retorne 3",
  "contagemUFC": "Número de colônias (ex: 100000). Se não houver quantificação numérica, retorne 0",
  "amostrasPositivas": "Responda 'multiplas' se o laudo citar 'dois lados', 'duas amostras', 'par', ou positividade em 'garrafa aeróbia e anaeróbia'. Caso contrário, responda 'unica'",
  "antibioticosTestados": ["Lista de TODOS os antibióticos testados"],
  "antibioticosResistentes": ["Lista APENAS dos antibióticos com Resistência (R) ou Intermediário (I). Se tudo sensível, retorne []"],
  "analise": "Sua análise terapêutica baseada no arsenal do hospital.",
  "exigeIsolamento": true ou false,
  "mecanismoResistencia": "Retorne um ARRAY de mecanismos de resistência detectados, usando exatamente estas strings: KPC, NDM, OXA-48, OXA-23, OXA-24/40, OXA-58, VIM, IMP, VRE, MRSA, ESBL, 'Sem carbapenemase / outro mecanismo'. Pode retornar MÚLTIPLOS mecanismos quando houver (ex.: cepa coprodutora NDM-1 + OXA-23 deve retornar ['NDM', 'OXA-23']). Se não houver mecanismo ou resistência relevante, retorne ['Não identificado']",
  "classificacaoMicrobiota": "Retorne APENAS um destes valores exatos: Comensal, Não comensal, Flora mista ou Contaminante. Classifique com base no microrganismo E no tipo de amostra: em amostra ESTÉRIL (hemocultura, LCR, líquido ascítico) qualquer crescimento é relevante; em amostra NÃO ESTÉRIL (swab, escarro, urina de bolsa) um germe comensal geralmente indica contaminação",
  "relevanciaClinica": "Nota breve e objetiva (1-2 frases) sobre o significado clínico do achado: representa infecção, colonização ou contaminação provável? Há indicação de tratamento? Menção a outro achado relevante?"
}
REGRA DE ISOLAMENTO: Retorne true se o germe for multirresistente (KPC, MRSA, VRE, Acinetobacter MDR, Pseudomonas MDR, ESBL) ou Clostridium.
`;

  // ==========================================
  // 🆕 ANALISAR FORMULÁRIO MANUAL COM IA (texto, sem upload)
  // ==========================================
  const analisarManualComIA = async () => {
    if (!formManual) return;
    const temDados = formManual.germe?.trim() || formManual.testadosTexto?.trim();
    if (!temDados) {
      alert('Preencha ao menos o germe ou os antibióticos testados antes de analisar.');
      return;
    }

    const culturaAtual = culturas.find(c => c.id === formManual.culturaId);
    const contextoTexto = [
      `Tipo de cultura: ${culturaAtual?.tipo || 'N/D'}`,
      `Germe isolado: ${formManual.germe?.trim() || '(não informado)'}`,
      `Espécies: ${formManual.qtdEspecies || 1}`,
      `UFC/contagem: ${formManual.contagemUFC || 0}`,
      `Amostras: ${formManual.amostrasPositivas || 'unica'}`,
      `Antibióticos testados: ${formManual.testadosTexto || '(não informado)'}`,
      `Antibióticos resistentes/intermediários: ${formManual.resistentesTexto || '(nenhum informado)'}`
    ].join('\n');

    setLoadingManualIA(true);
    try {
      const currentKey = apiKey || window.apiKey;
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${currentKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${montarPromptCCIH()}\n\nDADOS CLÍNICOS JÁ INFORMADOS PELO PROFISSIONAL (não há laudo anexado — analise com base nestes dados):\n${contextoTexto}\n\nRetorne o JSON com a análise estruturada.`
              }]
            }]
          }),
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(`API Google: ${data.error.message}`);
      if (!data.candidates || data.candidates.length === 0) throw new Error("A IA não retornou dados.");

      const aiText = data.candidates[0].content.parts[0].text;
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("A IA não conseguiu estruturar os dados no formato esperado.");
      const r = JSON.parse(jsonMatch[0]);

      // Mescla resultados da IA no formulário, preservando o que o usuário digitou
      setFormManual(prev => {
        if (!prev) return prev;
        const mecanismosIA = Array.isArray(r.mecanismoResistencia)
          ? r.mecanismoResistencia
          : (r.mecanismoResistencia ? [r.mecanismoResistencia] : []);
        // União entre o que usuário marcou e o que a IA detectou (sem duplicatas)
        const mecanismosUniao = Array.from(new Set([...(prev.mecanismos || []), ...mecanismosIA]));

        return {
          ...prev,
          germe: prev.germe?.trim() ? prev.germe : (r.germe || ''),
          qtdEspecies: prev.qtdEspecies || r.qtdEspecies || 1,
          contagemUFC: prev.contagemUFC || r.contagemUFC || 0,
          amostrasPositivas: prev.amostrasPositivas === 'multiplas' || r.amostrasPositivas === 'multiplas' ? 'multiplas' : 'unica',
          testadosTexto: prev.testadosTexto?.trim() || (Array.isArray(r.antibioticosTestados) ? r.antibioticosTestados.join(', ') : ''),
          resistentesTexto: prev.resistentesTexto?.trim() || (Array.isArray(r.antibioticosResistentes) ? r.antibioticosResistentes.join(', ') : ''),
          mecanismos: mecanismosUniao,
          classificacaoMicrobiota: (prev.classificacaoMicrobiota && prev.classificacaoMicrobiota !== 'Não classificado')
            ? prev.classificacaoMicrobiota
            : (r.classificacaoMicrobiota || 'Não classificado'),
          relevanciaClinica: prev.relevanciaClinica?.trim() || r.relevanciaClinica || '',
          analiseIA: r.analise || prev.analiseIA || '',
          exigeIsolamento: prev.exigeIsolamento || !!r.exigeIsolamento
        };
      });
    } catch (err) {
      console.error('Erro na análise manual por IA:', err);
      alert(`Falha na análise:\n${err.message}`);
    } finally {
      setLoadingManualIA(false);
    }
  };

  // ==========================================
  // MOTOR DA IA (LAUDO PDF/IMAGEM)
  // ==========================================
  const analisarAntibiograma = async (e, culturaId) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoadingId(culturaId);
    try {
      const mimeType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      const base64Data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
      });

      const currentKey = apiKey || window.apiKey;
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${currentKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: montarPromptCCIH() }, { inline_data: { mime_type: mimeType, data: base64Data } }] }]
          }),
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(`API Google: ${data.error.message}`);
      if (!data.candidates || data.candidates.length === 0) throw new Error("A IA bloqueou a leitura ou não retornou dados.");

      const aiText = data.candidates[0].content.parts[0].text;
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("Resposta bruta da IA:", aiText);
        throw new Error("A IA não conseguiu estruturar os dados no formato esperado.");
      }
      const resultadoIA = JSON.parse(jsonMatch[0]);

      const culturasAtualizadas = culturas.map(c => {
        if (c.id === culturaId) {
          return {
            ...c,
            status: resultadoIA.status,
            germe: resultadoIA.germe || "",
            qtdEspecies: Number(resultadoIA.qtdEspecies) || 1,
            contagemUFC: Number(resultadoIA.contagemUFC) || 0,
            amostrasPositivas: resultadoIA.amostrasPositivas || "unica",
            testados: resultadoIA.antibioticosTestados || [],
            resistentes: resultadoIA.antibioticosResistentes || [],
            mecanismoResistencia: Array.isArray(resultadoIA.mecanismoResistencia)
              ? resultadoIA.mecanismoResistencia
              : resultadoIA.mecanismoResistencia
                ? [resultadoIA.mecanismoResistencia]
                : ["Não identificado"],
            classificacaoMicrobiota: resultadoIA.classificacaoMicrobiota || "Não classificado",
            relevanciaClinica: resultadoIA.relevanciaClinica || "",
            analiseIA: resultadoIA.analise || "",
            dataResultado: dataResultadoSel || dataHojeISO(),
            irasAssociada: c.irasAssociada || ""
          };
        }
        return c;
      });
      updateNested("culturas", "lista", culturasAtualizadas);

      if (resultadoIA.exigeIsolamento) {
        updateNested("medical", "isolamentoContato", true);
        updateNested("medical", "motivoIsolamento", resultadoIA.germe);
        updateNested("medical", "dataInicioIsolamento", dataResultadoSel || dataHojeISO());
      }

      setModalResultado(null);
    } catch (error) {
      console.error("Erro completo:", error);
      alert(`Falha na Análise:\n${error.message}`);
    } finally {
      setLoadingId(null);
      e.target.value = null;
    }
  };

  if (culturasValidas.length === 0) return null;

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
      <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 border-b pb-2">
        <Microscope className="text-indigo-600" size={18} /> Monitoramento de Culturas (CCIH)
      </h3>

      {/* BANNER DE ISOLAMENTO */}
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
              if (window.confirm("Deseja retirar a precaução de contato? Certifique-se de que os critérios da CCIH foram atingidos.")) {
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
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                    <AlertTriangle size={12} /> Aguardando
                  </span>
                  <button
                    onClick={() => abrirModalResultado(cultura, false)}
                    disabled={loadingId === cultura.id}
                    className="cursor-pointer bg-indigo-600 border border-indigo-700 text-white hover:bg-indigo-700 px-2.5 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-60"
                  >
                    {loadingId === cultura.id ? (
                      <span className="animate-pulse">Analisando...</span>
                    ) : (
                      <><PenLine size={13} /> Informar Resultado</>
                    )}
                  </button>
                </div>
              )}

              {cultura.status === "Negativo" && (
                <div className="mt-2 flex flex-col gap-2">
                  <div className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle size={14} /> Negativo ({cultura.dataResultado ? cultura.dataResultado.split('-').reverse().join('/') : 'N/D'})
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => abrirModalResultado(cultura, true)}
                      className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-2 py-1 rounded flex items-center gap-1 transition-colors"
                    >
                      <Pencil size={11} /> Editar resultado
                    </button>
                    <button
                      onClick={() => limparResultado(cultura.id)}
                      className="text-[10px] bg-white border border-slate-300 hover:bg-slate-100 text-slate-600 font-bold px-2 py-1 rounded transition-colors"
                    >
                      Reabrir
                    </button>
                  </div>
                </div>
              )}

              {cultura.status === "Positivo" && (
                <div className="mt-2 flex flex-col gap-3">
                  <div className="text-sm font-black text-red-600 flex items-center gap-1 leading-tight">
                    <Bug size={16} className="shrink-0" /> {cultura.germe}
                  </div>

                  {cultura.classificacaoMicrobiota && (
                    <div className={`mt-1 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                      (() => {
                        const c = String(cultura.classificacaoMicrobiota || '').toLowerCase();
                        if (c.includes('não') || c.includes('nao')) return 'bg-red-50 border-red-200 text-red-700';
                        if (c.includes('comensal')) return 'bg-emerald-50 border-emerald-200 text-emerald-700';
                        if (c.includes('contaminante') || c.includes('flora')) return 'bg-amber-50 border-amber-200 text-amber-700';
                        return 'bg-red-50 border-red-200 text-red-700';
                      })()
                    }`}>
                      {cultura.classificacaoMicrobiota}
                    </div>
                  )}

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

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => abrirEdicaoManual(cultura)}
                      className="flex-1 text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-2 py-1.5 rounded flex items-center justify-center gap-1 transition-colors"
                    >
                      <Pencil size={11} /> Editar resultado
                    </button>
                    <button
                      onClick={() => limparResultado(cultura.id)}
                      className="text-[10px] bg-white border border-slate-300 hover:bg-slate-100 text-slate-600 font-bold px-2 py-1.5 rounded transition-colors"
                    >
                      Reabrir
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ========================================================= */}
      {/* MODAL: INFORMAR / EDITAR RESULTADO — via ModalPortal       */}
      {/* ========================================================= */}
      {modalResultado && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden max-h-[90vh] flex flex-col">
              <div className="bg-indigo-700 p-4 flex justify-between items-center text-white shrink-0">
                <h3 className="font-bold flex items-center gap-2 text-sm">
                  <PenLine size={16} />
                  {modalResultado.editando ? 'Editar Resultado' : 'Informar Resultado'} — {modalResultado.cultura.tipo}
                </h3>
                <button onClick={() => setModalResultado(null)} className="text-indigo-200 hover:text-white transition-colors"><X size={18} /></button>
              </div>

              <div className="p-5 overflow-y-auto">
                <p className="text-xs text-slate-500 font-bold mb-4">
                  Coleta: {modalResultado.cultura.dataColeta ? modalResultado.cultura.dataColeta.split('-').reverse().join('/') : 'N/D'}
                </p>

                <div className="mb-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Data do resultado</label>
                  <input
                    type="date"
                    value={dataResultadoSel}
                    onChange={(e) => setDataResultadoSel(e.target.value)}
                    max={dataHojeISO()}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Usada em qualquer um dos três caminhos abaixo. Alterar aqui atualiza o resultado salvo.
                  </p>
                </div>

                {modalResultado.editando && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-[11px] font-bold text-amber-800">
                      ⚠️ Escolher um dos caminhos abaixo SUBSTITUI o resultado. Para alterar apenas a data, use <strong>Salvar</strong>.
                    </p>
                  </div>
                )}

                <button
                onClick={() => {
                  if (modalResultado.editando && modalResultado.cultura.status === 'Negativo') {
                    return; // já está Negativo — só use o botão Salvar para atualizar a data
                  }
                  marcarNegativo(modalResultado.cultura.id);
                }}
                  className={`w-full mb-3 p-4 rounded-xl border-2 transition-colors text-left flex items-center gap-3 ${
                    modalResultado.editando && modalResultado.cultura.status === 'Negativo'
                      ? 'border-emerald-400 bg-emerald-100 cursor-default'
                      : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-400'
                  }`}
                >
                  <CheckCircle size={24} className="text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-black text-emerald-800 text-sm">Negativo</p>
                    <p className="text-xs text-emerald-700">
                      {modalResultado.editando && modalResultado.cultura.status === 'Negativo'
                        ? 'Já está Negativo — use Salvar para atualizar a data'
                        : 'Sem crescimento microbiano'}
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    if (modalResultado.editando) {
                      abrirEdicaoManual(modalResultado.cultura);
                    } else {
                       setFormManual({
                        culturaId: modalResultado.cultura.id,
                        germe: '', qtdEspecies: 1, contagemUFC: 0, amostrasPositivas: 'unica',
                        testadosTexto: '', resistentesTexto: '', mecanismos: [],
                        classificacaoMicrobiota: 'Não classificado', relevanciaClinica: '',
                        analiseIA: '', exigeIsolamento: false,
                        dataResultado: dataResultadoSel || dataHojeISO()
                      });
                    }
                  }}
                  className="w-full mb-3 p-4 rounded-xl border-2 border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-indigo-400 transition-colors text-left flex items-center gap-3"
                >
                  <PenLine size={24} className="text-indigo-600 shrink-0" />
                  <div>
                    <p className="font-black text-slate-800 text-sm">
                      {modalResultado.editando ? 'Editar dados manualmente' : 'Inserir manualmente'}
                    </p>
                    <p className="text-xs text-slate-600">
                      {modalResultado.editando
                        ? 'Abre o formulário com os valores atuais'
                        : 'Digitar germe e antibiograma sem laudo'}
                    </p>
                  </div>
                </button>

                <label className="w-full p-4 rounded-xl border-2 border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-amber-400 transition-colors text-left flex items-center gap-3 cursor-pointer">
                  <UploadCloud size={24} className="text-amber-600 shrink-0" />
                  <div>
                    <p className="font-black text-slate-800 text-sm">Anexar laudo</p>
                    <p className="text-xs text-slate-600">
                      {modalResultado.editando
                        ? 'Substitui o resultado pelo conteúdo do novo laudo'
                        : 'IA lê o antibiograma e estrutura os dados'}
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => analisarAntibiograma(e, modalResultado.cultura.id)}
                    disabled={loadingId === modalResultado.cultura.id}
                  />
                </label>
              </div>

              <div className="p-4 bg-white border-t flex justify-end gap-2 shrink-0">
                <button onClick={() => setModalResultado(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors text-sm">
                  Cancelar
                </button>
                {modalResultado.editando && (
                  <button
                    onClick={() => salvarDataResultado(modalResultado.cultura.id)}
                    disabled={!dataResultadoSel}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors text-sm disabled:opacity-50"
                  >
                    Salvar
                  </button>
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ========================================================= */}
      {/* MODAL: FORMULÁRIO MANUAL — via ModalPortal                 */}
      {/* ========================================================= */}
      {formManual && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col">
              <div className="bg-slate-800 p-4 flex justify-between items-center text-white shrink-0">
                <h3 className="font-bold flex items-center gap-2 text-sm">
                  <PenLine size={16} className="text-amber-400" />
                  {culturas.find(c => c.id === formManual.culturaId)?.status === 'Positivo'
                    ? 'Editar Resultado Manual'
                    : 'Resultado Manual'}
                </h3>
                <button onClick={() => setFormManual(null)} className="text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
              </div>

              <div className="p-5 overflow-y-auto space-y-3">
                {/* ══════ BLOCO 1: DADOS BÁSICOS ══════ */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Data do resultado</label>
                  <input
                    type="date"
                    value={formManual.dataResultado || ''}
                    onChange={(e) => setFormManual({ ...formManual, dataResultado: e.target.value })}
                    max={dataHojeISO()}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Germe isolado *</label>
                  <input
                    type="text"
                    value={formManual.germe}
                    onChange={(e) => setFormManual({ ...formManual, germe: e.target.value })}
                    placeholder="Ex: Klebsiella pneumoniae"
                    className="w-full p-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Nº de espécies</label>
                    <input
                      type="number" min="1"
                      value={formManual.qtdEspecies}
                      onChange={(e) => setFormManual({ ...formManual, qtdEspecies: e.target.value })}
                      className="w-full p-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">UFC / contagem</label>
                    <input
                      type="number" min="0"
                      value={formManual.contagemUFC}
                      onChange={(e) => setFormManual({ ...formManual, contagemUFC: e.target.value })}
                      className="w-full p-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Amostras</label>
                  <select
                    value={formManual.amostrasPositivas}
                    onChange={(e) => setFormManual({ ...formManual, amostrasPositivas: e.target.value })}
                    className="w-full p-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <option value="unica">Única amostra positiva</option>
                    <option value="multiplas">Múltiplas (bilaterais / garrafas aeróbia + anaeróbia)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Antibióticos testados (separar por vírgula)</label>
                  <input
                    type="text"
                    value={formManual.testadosTexto}
                    onChange={(e) => setFormManual({ ...formManual, testadosTexto: e.target.value })}
                    placeholder="Ex: Meropenem, Amicacina, Polimixina B"
                    className="w-full p-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Antibióticos resistentes / intermediários</label>
                  <input
                    type="text"
                    value={formManual.resistentesTexto}
                    onChange={(e) => setFormManual({ ...formManual, resistentesTexto: e.target.value })}
                    placeholder="Ex: Meropenem, Amicacina"
                    className="w-full p-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>

                {/* ══════ BOTÃO DE ANÁLISE IA ══════ */}
                <button
                  type="button"
                  onClick={analisarManualComIA}
                  disabled={loadingManualIA}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-md"
                >
                  {loadingManualIA ? (
                    <><Loader2 size={16} className="animate-spin" /> Analisando...</>
                  ) : (
                    <><Bot size={16} /> Analisar com IA</>
                  )}
                </button>

                <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg">
                  <p className="text-[10px] font-bold text-sky-800">
                    💡 Clique em <strong>Analisar com IA</strong> para classificar microbiota, detectar mecanismos de resistência e gerar a análise terapêutica com base nos dados acima. Você pode revisar tudo antes de salvar.
                  </p>
                </div>

                {/* ══════ BLOCO 2: RESULTADOS DA IA ══════ */}
                <div className="pt-3 border-t border-slate-200">
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block">Mecanismos de resistência</label>
                  <div className="flex flex-wrap gap-1.5">
                    {MECANISMOS.map(mec => {
                      const sel = formManual.mecanismos.includes(mec);
                      return (
                        <button
                          key={mec}
                          type="button"
                          onClick={() => {
                            const novo = sel
                              ? formManual.mecanismos.filter(x => x !== mec)
                              : [...formManual.mecanismos, mec];
                            setFormManual({ ...formManual, mecanismos: novo });
                          }}
                          className={`px-2 py-1 rounded-lg border text-[10px] font-bold uppercase transition-all ${sel ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-500 hover:border-red-200'}`}
                        >
                          {mec}
                        </button>
                      );
                    })}
                  </div>
                  {formManual.mecanismos.length > 0 && (
                    <p className="text-[10px] text-slate-400 mt-2 font-bold">
                      Selecionados: {formManual.mecanismos.join(' + ')}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Classificação da microbiota</label>
                  <select
                    value={formManual.classificacaoMicrobiota}
                    onChange={(e) => setFormManual({ ...formManual, classificacaoMicrobiota: e.target.value })}
                    className="w-full p-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <option value="Não classificado">Não classificado</option>
                    <option value="Comensal">Comensal</option>
                    <option value="Não comensal">Não comensal</option>
                    <option value="Flora mista">Flora mista</option>
                    <option value="Contaminante">Contaminante</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Relevância clínica</label>
                  <textarea
                    value={formManual.relevanciaClinica}
                    onChange={(e) => setFormManual({ ...formManual, relevanciaClinica: e.target.value })}
                    placeholder="Interpretação clínica do achado..."
                    className="w-full p-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-300 min-h-[60px]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Análise / conduta</label>
                  <textarea
                    value={formManual.analiseIA}
                    onChange={(e) => setFormManual({ ...formManual, analiseIA: e.target.value })}
                    placeholder="Observações terapêuticas..."
                    className="w-full p-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-300 min-h-[60px]"
                  />
                </div>

                <label className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formManual.exigeIsolamento}
                    onChange={(e) => setFormManual({ ...formManual, exigeIsolamento: e.target.checked })}
                    className="w-4 h-4 accent-red-600"
                  />
                  <span className="text-xs font-bold text-red-800">
                    Ativar precaução de contato (germe multirresistente)
                  </span>
                </label>
              </div>

              <div className="p-4 bg-white border-t flex justify-end gap-2 shrink-0">
                <button
                  onClick={() => {
                    setDataResultadoSel(formManual.dataResultado || dataResultadoSel);
                    setFormManual(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors text-sm"
                >
                  Voltar
                </button>
                <button
                  onClick={salvarManual}
                  disabled={!formManual.germe?.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors text-sm disabled:opacity-50"
                >
                  Salvar Resultado
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ========================================================= */}
      {/* MODAL DE ANÁLISE DA IA (antibiograma estruturado) — portal */}
      {/* ========================================================= */}
      {modalIA && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col">
              <div className="bg-slate-800 p-4 flex justify-between items-center text-white shrink-0">
                <h3 className="font-bold flex items-center gap-2">
                  <Bot className="text-amber-400" size={18} />
                  Consultoria CCIH - Análise de Resistência
                </h3>
                <button onClick={() => setModalIA(null)} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
              </div>
              <div className="p-5 overflow-y-auto">
                <div className="mb-4 pb-4 border-b border-slate-100">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">
                    Isolado em {modalIA.tipo} ({modalIA.dataResultado ? modalIA.dataResultado.split('-').reverse().join('/') : 'N/D'})
                  </p>
                  <p className="text-xl font-black text-red-600">{modalIA.germe}</p>
                  <div className="mt-3">
                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-3 block text-center">Mecanismo(s) de Resistência</label>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {MECANISMOS.map(mec => {
                          const selecionado = Array.isArray(modalIA.mecanismoResistencia) && modalIA.mecanismoResistencia.includes(mec);
                          return (
                            <button key={mec} type="button" onClick={() => {
                              const atual = Array.isArray(modalIA.mecanismoResistencia) ? modalIA.mecanismoResistencia : [];
                              const novo = selecionado ? atual.filter(x => x !== mec) : [...atual, mec];
                              setModalIA({ ...modalIA, mecanismoResistencia: novo });
                            }} className={`p-2 rounded-xl border-2 font-bold text-[11px] uppercase tracking-wide transition-all ${selecionado ? 'border-red-500 bg-red-50 text-red-700 shadow-md' : 'border-slate-200 bg-white text-slate-500 hover:border-red-200'}`}>{mec}</button>
                          );
                        })}
                      </div>
                      {Array.isArray(modalIA.mecanismoResistencia) && modalIA.mecanismoResistencia.length > 0 && (
                        <p className="text-[10px] text-slate-400 text-center mt-2 font-bold">
                          Selecionados: {modalIA.mecanismoResistencia.join(' + ')}
                        </p>
                      )}
                    </div>
                  </div>
                  {modalIA.irasAssociada && (
                    <span className="inline-block mt-2 bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold border border-indigo-200">
                      Classificação: {modalIA.irasAssociada}
                    </span>
                  )}
                  {modalIA.classificacaoMicrobiota && (
                    <span className={`inline-block mt-2 px-2.5 py-1 rounded text-xs font-black uppercase border ${
                      (() => {
                        const c = String(modalIA.classificacaoMicrobiota || '').toLowerCase();
                        if (c.includes('não') || c.includes('nao')) return 'bg-red-50 text-red-700 border-red-200';
                        if (c.includes('comensal')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                        if (c.includes('contaminante') || c.includes('flora')) return 'bg-amber-50 text-amber-700 border-amber-200';
                        return 'bg-red-50 text-red-700 border-red-200';
                      })()
                    }`}>
                      {modalIA.classificacaoMicrobiota}
                    </span>
                  )}
                </div>

                {modalIA.resistentes && modalIA.resistentes.length > 0 && (
                  <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-100">
                    <p className="text-[10px] font-black text-red-800 uppercase mb-2 flex items-center gap-1">
                      <AlertTriangle size={12} /> Resistências Detectadas:
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

                {modalIA.relevanciaClinica && (
                  <div className="mb-4 p-3 bg-sky-50 rounded-lg border border-sky-100">
                    <p className="text-[10px] font-black text-sky-800 uppercase mb-1 flex items-center gap-1">
                      <ShieldAlert size={12} /> Relevância Clínica:
                    </p>
                    <p className="text-sm text-slate-700 font-medium leading-relaxed">
                      {modalIA.relevanciaClinica}
                    </p>
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
        </ModalPortal>
      )}
    </div>
  );
};

export default ModuloCulturas;