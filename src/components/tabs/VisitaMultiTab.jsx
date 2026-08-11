import React, { useState, useMemo } from 'react';

// ============================================================
// VisitaMultiTab - Visita Multidisciplinar integrada ao Firestore
// Grava em currentPatient.visita[dataISO] via save()
// ============================================================

// Estrutura vazia padrão de um dia de visita
const criarVisitaVazia = () => ({
  medicoRotina: {
    planoTerapeutico: '', sedacaoAnalgesia: '', antibiotico: '',
    desmameVentilatorio: '', diretivas: '', observacoes: '',
    profilaxias: {
      tvp: { avaliado: false, fatoresRisco: {}, contraindicacoes: {}, indicada: false, tipo: 'farmacologica', farmaco: '' },
      ulceraEstresse: { avaliado: false, fatoresRisco: {}, indicada: false, farmaco: '' }
    },
    tot: {
      avaliado: false, manterTOT: true,
      criteriosDespertar: { satAplicavel: false, semSedacaoContinua: false, semBloqueioNeuromuscular: false, semAtividadeEpileptica: false, semIsquemiaMiocardica: false, semPicElevada: false, semVasopressorAltaDose: false, semHipoxemiaGrave: false, satRealizado: false, motivoNao: '' },
      tre: { treAplicavel: false, causaIpraEmResolucao: false, pao2Fio2Adequado: false, semVasopressorOuBaixaDose: false, semSedacaoContinua: false, esforcoInspiratorioPresente: false, semAcidoseRespiratoria: false, semSecrecoesExcessivas: false, semInstabilidadeNeurologica: false, treRealizado: false, motivoNao: '' },
      conduta: ''
    }
  },
  medicoPlantonista: { evolucaoPlantao: '', intercorrencias24h: '', condutasPlantao: '', observacoes: '' },
  enfermeiroPlantonista: {
    balancoHidrico: '', escalas: { braden: '', morse: '' },
    dispositivos: { svd: { presente: false, indicacaoManter: false }, sng: { presente: false }, cvc: { presente: false }, acessoHD: { shiley: { presente: false } } },
    higieneOral: { realizada3x: false }, lesoesPressao: { presente: false, estagio: null },
    curativos: '', observacoes: ''
  },
  gerenteEnfermagem: { recursos: '', padronizacoes: '', observacoes: '' },
  fisioterapeutaPlantonista: {
    ventilacaoMecanica: { modo: '', fio2: '', peep: '' },
    desmame: '', mobilizacaoPrecoce: '', observacoes: ''
  },
  coordenadorFisioterapia: { indicadores: '', observacoes: '' },
  nutricionista: { viaAcesso: '', dieta: '', metaCalorica: '', metaProteica: '', suplementacao: '', reavaliacao: '', observacoes: '' },
  tecnicoEnfermagem: {
    sinaisVitais: { pa: '', fc: '', fr: '', sat: '', temp: '' },
    glicemia: '', higiene: '', higieneOral: { realizada3x: false }, observacoesLeito: '', observacoes: ''
  },
  indicacoes: []
});

// Critérios fechados (baseados em evidência)
const CRITERIOS_TVP = [
  { id: 'imobilidade', label: 'Imobilidade' },
  { id: 'vmMais48h', label: 'VM > 48h' },
  { id: 'idadeMais60', label: 'Idade > 60' },
  { id: 'obesidadeImc30', label: 'Obesidade (IMC ≥ 30)' },
  { id: 'tvpPrevia', label: 'TVP prévia' },
  { id: 'neoplasiaAtiva', label: 'Neoplasia ativa' },
  { id: 'sepse', label: 'Sepse' },
  { id: 'trauma', label: 'Trauma' },
  { id: 'cirurgiaRecente', label: 'Cirurgia recente' },
  { id: 'cateterVenosoCentral', label: 'Cateter venoso central' },
  { id: 'insufCardiacaRespiratoria', label: 'ICC / IRpA' },
  { id: 'hormonioterapia', label: 'Hormonioterapia' },
  { id: 'trombofilia', label: 'Trombofilia' }
];
const CONTRA_TVP = [
  { id: 'sangramentoAtivo', label: 'Sangramento ativo' },
  { id: 'coagulopatia', label: 'Coagulopatia' },
  { id: 'hdaRecente', label: 'HDA recente' },
  { id: 'avcHemorragicoRecente', label: 'AVC hemorrágico recente' },
  { id: 'neurocirurgiaRecente', label: 'Neurocirurgia recente' },
  { id: 'traumaRaquimedular', label: 'Trauma raquimedular' }
];
const CRITERIOS_ULCERA = [
  { id: 'vmMais48h', label: 'VM > 48h' },
  { id: 'coagulopatia', label: 'Coagulopatia' },
  { id: 'iraTrs', label: 'IRA / TRS' },
  { id: 'corticoideAltaDose', label: 'Corticoide alta dose' },
  { id: 'hdaUlceraPrevia12m', label: 'HDA/úlcera prévia (12m)' },
  { id: 'choque', label: 'Choque' },
  { id: 'queimaduras', label: 'Queimaduras' },
  { id: 'tce', label: 'TCE' },
  { id: 'sepse', label: 'Sepse' }
];
const CRITERIOS_DESPERTAR = [
  { id: 'semSedacaoContinua', label: 'Sem sedação contínua obrigatória' },
  { id: 'semBloqueioNeuromuscular', label: 'Sem bloqueio neuromuscular' },
  { id: 'semAtividadeEpileptica', label: 'Sem atividade epiléptica' },
  { id: 'semIsquemiaMiocardica', label: 'Sem isquemia miocárdica ativa' },
  { id: 'semPicElevada', label: 'Sem PIC elevada' },
  { id: 'semVasopressorAltaDose', label: 'Sem vasopressor em dose alta' },
  { id: 'semHipoxemiaGrave', label: 'Sem hipoxemia grave' }
];
const CRITERIOS_TRE = [
  { id: 'causaIpraEmResolucao', label: 'Causa da IRpA em resolução' },
  { id: 'pao2Fio2Adequado', label: 'PaO2/FiO2 ≥ 150-200 (PEEP ≤ 5-8)' },
  { id: 'semVasopressorOuBaixaDose', label: 'Sem vasopressor ou dose baixa' },
  { id: 'semSedacaoContinua', label: 'Sem sedação contínua' },
  { id: 'esforcoInspiratorioPresente', label: 'Esforço inspiratório presente' },
  { id: 'semAcidoseRespiratoria', label: 'Sem acidose respiratória' },
  { id: 'semSecrecoesExcessivas', label: 'Sem secreções excessivas' },
  { id: 'semInstabilidadeNeurologica', label: 'Sem instabilidade neurológica' }
];

const CATEGORIAS = [
  { id: 'medicoRotina', label: 'Médico RT', cor: 'teal' },
  { id: 'medicoPlantonista', label: 'Médico Plantão', cor: 'blue' },
  { id: 'enfermeiroPlantonista', label: 'Enfermagem', cor: 'emerald' },
  { id: 'gerenteEnfermagem', label: 'Ger. Enfermagem', cor: 'green' },
  { id: 'fisioterapeutaPlantonista', label: 'Fisioterapia', cor: 'violet' },
  { id: 'coordenadorFisioterapia', label: 'Coord. Fisio', cor: 'purple' },
  { id: 'nutricionista', label: 'Nutrição', cor: 'amber' },
  { id: 'tecnicoEnfermagem', label: 'Téc. Enfermagem', cor: 'rose' }
];

const TIPOS_INDICACAO = [
  'SVD', 'CVC', 'Dieta/SNG', 'Cultura', 'Raio-X',
  'Profilaxia TVP', 'Profilaxia úlcera', 'Outro'
];

// ============================================================
const VisitaMultiTab = ({ currentPatient, save, updateNested }) => {
  const hoje = new Date();
  const dataISO = hoje.toISOString().slice(0, 10);
  const dataBR = `${String(hoje.getDate()).padStart(2, '0')}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${hoje.getFullYear()}`;

  const [categoriaAtiva, setCategoriaAtiva] = useState('medicoRotina');
  const [modalCancelamento, setModalCancelamento] = useState(null);
  const [novaIndicacao, setNovaIndicacao] = useState({ tipo: 'SVD', descricao: '' });

  // Inicializa a visita de hoje (já existente OU vazia)
  const [visita, setVisita] = useState(() => {
    const existente = currentPatient?.visita?.[dataISO];
    const base = criarVisitaVazia();
    return existente ? { ...base, ...existente } : base;
  });

  // ============================================================
  // PERSISTÊNCIA: grava a visita no Firestore via save()
  // ============================================================
  const salvarVisita = (novaVisita) => {
    if (!save || !currentPatient) return;
    const pacienteAtualizado = {
      ...currentPatient,
      visita: {
        ...(currentPatient.visita || {}),
        [dataISO]: novaVisita
      }
    };
    save(pacienteAtualizado, `Visita Multi ${dataBR}`);
  };

  // Atualiza um campo de uma categoria e salva
  const updateCampo = (categoria, campo, valor) => {
    setVisita(prev => {
      const nova = {
        ...prev,
        [categoria]: { ...prev[categoria], [campo]: valor }
      };
      salvarVisita(nova);
      return nova;
    });
  };

  // Atualiza um campo aninhado (ex: escalas.braden) e salva
  const updateNestedCampo = (categoria, subCampo, campo, valor) => {
    setVisita(prev => {
      const nova = {
        ...prev,
        [categoria]: {
          ...prev[categoria],
          [subCampo]: { ...prev[categoria][subCampo], [campo]: valor }
        }
      };
      salvarVisita(nova);
      return nova;
    });
  };

  // Atualiza um item de checklist (fatoresRisco/contraindicacoes) e salva
  const updateChecklist = (categoria, bloco, lista, id, valor) => {
    setVisita(prev => {
      const nova = {
        ...prev,
        [categoria]: {
          ...prev[categoria],
          [bloco]: {
            ...prev[categoria][bloco],
            [lista]: { ...prev[categoria][bloco][lista], [id]: valor }
          }
        }
      };
      salvarVisita(nova);
      return nova;
    });
  };

  // ============================================================
  // INDICAÇÕES (METAS DO DIA)
  // ============================================================
  const adicionarIndicacao = (tipo, descricao) => {
    if (!descricao.trim()) return;
    const novaInd = {
      id: `ind_${Date.now()}`,
      tipo, descricao,
      quemIndicou: categoriaAtiva,
      dataIndicacao: dataISO,
      status: 'pendente',
      dataRealizado: null, marcadoPor: null, marcadoEm: null,
      justificativaCancelamento: null
    };
    setVisita(prev => {
      const nova = { ...prev, indicacoes: [...(prev.indicacoes || []), novaInd] };
      salvarVisita(nova);
      return nova;
    });
  };

  const marcarRealizado = (id) => {
    setVisita(prev => {
      const nova = {
        ...prev,
        indicacoes: (prev.indicacoes || []).map(ind =>
          ind.id === id
            ? { ...ind, status: 'realizado', dataRealizado: dataISO, marcadoPor: categoriaAtiva, marcadoEm: new Date().toISOString(), justificativaCancelamento: null }
            : ind
        )
      };
      salvarVisita(nova);
      return nova;
    });
  };

  const confirmarCancelamento = (id, justificativa) => {
    setVisita(prev => {
      const nova = {
        ...prev,
        indicacoes: (prev.indicacoes || []).map(ind =>
          ind.id === id
            ? { ...ind, status: 'cancelado', dataRealizado: null, marcadoPor: categoriaAtiva, marcadoEm: new Date().toISOString(), justificativaCancelamento: justificativa }
            : ind
        )
      };
      salvarVisita(nova);
      return nova;
    });
    setModalCancelamento(null);
  };

  // Reúne todas as indicações pendentes de TODOS os dias (para o painel Metas do Dia)
  const metasPendentes = useMemo(() => {
    const todas = [];
    const visitas = currentPatient?.visita || {};
    Object.keys(visitas).forEach(d => {
      (visitas[d].indicacoes || []).forEach(ind => {
        if (ind.status === 'pendente') todas.push({ ...ind, dia: d });
      });
    });
    return todas;
  }, [currentPatient?.visita]);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-4">
      {/* Cabeçalho da visita */}
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-teal-800">Visita Multi — {currentPatient?.nome}</h3>
          <p className="text-xs text-teal-600 mt-0.5">Leito {currentPatient?.leito} · {dataBR} · Cada profissional preenche a sua seção</p>
        </div>
        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-teal-600 text-white">Salvando automaticamente</span>
      </div>

      {/* Abas por categoria */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIAS.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategoriaAtiva(cat.id)}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
              categoriaAtiva === cat.id ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Conteúdo da categoria ativa */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        {categoriaAtiva === 'medicoRotina' && (
          <>
            <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Médico da Rotina / RT</h4>
            <CampoTexto label="Plano Terapêutico" valor={visita.medicoRotina.planoTerapeutico} onChange={v => updateCampo('medicoRotina', 'planoTerapeutico', v)} />
            <CampoTexto label="Sedação / Analgesia" valor={visita.medicoRotina.sedacaoAnalgesia} onChange={v => updateCampo('medicoRotina', 'sedacaoAnalgesia', v)} />
            <CampoTexto label="Antibiótico" valor={visita.medicoRotina.antibiotico} onChange={v => updateCampo('medicoRotina', 'antibiotico', v)} />
            <CampoTexto label="Desmame Ventilatório" valor={visita.medicoRotina.desmameVentilatorio} onChange={v => updateCampo('medicoRotina', 'desmameVentilatorio', v)} />
            <CampoTexto label="Diretivas" valor={visita.medicoRotina.diretivas} onChange={v => updateCampo('medicoRotina', 'diretivas', v)} />

            {/* Checklist Profilaxia TVP */}
            <ChecklistCard
              titulo="Profilaxia de TVP"
              descricao="Indicada se ≥1 fator de risco E nenhuma contraindicação"
              itens={CRITERIOS_TVP}
              valores={visita.medicoRotina.profilaxias.tvp.fatoresRisco}
              onToggle={(id, v) => updateChecklist('medicoRotina', 'profilaxias', 'fatoresRisco', id, v)}
              cor="cyan"
            />
            <ChecklistCard
              titulo="Contraindicações à profilaxia de TVP"
              itens={CONTRA_TVP}
              valores={visita.medicoRotina.profilaxias.tvp.contraindicacoes}
              onToggle={(id, v) => updateChecklist('medicoRotina', 'profilaxias', 'contraindicacoes', id, v)}
              cor="rose"
            />
            <div className="grid grid-cols-2 gap-3">
              <CampoTexto label="Tipo (farmacológica/mecânica)" valor={visita.medicoRotina.profilaxias.tvp.tipo} onChange={v => updateNestedCampo('medicoRotina', 'profilaxias', 'tipo', v)} />
              <CampoTexto label="Fármaco (ex: Enoxaparina 40mg)" valor={visita.medicoRotina.profilaxias.tvp.farmaco} onChange={v => updateNestedCampo('medicoRotina', 'profilaxias', 'farmaco', v)} />
            </div>

            {/* Checklist Profilaxia Úlcera de Estresse */}
            <ChecklistCard
              titulo="Profilaxia de Úlcera de Estresse"
              descricao="Indicada se ≥1 fator de risco"
              itens={CRITERIOS_ULCERA}
              valores={visita.medicoRotina.profilaxias.ulceraEstresse.fatoresRisco}
              onToggle={(id, v) => updateChecklist('medicoRotina', 'profilaxias', 'fatoresRisco', id, v)}
              cor="amber"
            />
            <CampoTexto label="Fármaco (ex: Omeprazol 40mg)" valor={visita.medicoRotina.profilaxias.ulceraEstresse.farmaco} onChange={v => updateNestedCampo('medicoRotina', 'profilaxias', 'farmaco', v)} />

            {/* Checklist TOT */}
            <ChecklistCard
              titulo="TOT — Critérios para Despertar (SAT)"
              descricao="Se todos ok → sugere pausar sedação e testar despertar"
              itens={CRITERIOS_DESPERTAR}
              valores={visita.medicoRotina.tot.criteriosDespertar}
              onToggle={(id, v) => updateChecklist('medicoRotina', 'tot', 'criteriosDespertar', id, v)}
              cor="violet"
            />
            <CampoTexto label="SAT realizado? (motivo se não)" valor={visita.medicoRotina.tot.criteriosDespertar.motivoNao} onChange={v => updateNestedCampo('medicoRotina', 'tot', 'motivoNao', v)} />
            <ChecklistCard
              titulo="TOT — Critérios para TRE"
              descricao="Se todos ok → sugere tentativa de TRE"
              itens={CRITERIOS_TRE}
              valores={visita.medicoRotina.tot.tre}
              onToggle={(id, v) => updateChecklist('medicoRotina', 'tot', 'tre', id, v)}
              cor="indigo"
            />
            <CampoTexto label="TRE realizado? (motivo se não)" valor={visita.medicoRotina.tot.tre.motivoNao} onChange={v => updateNestedCampo('medicoRotina', 'tot', 'motivoNao', v)} />
            <CampoTexto label="Conduta do TOT" valor={visita.medicoRotina.tot.conduta} onChange={v => updateNestedCampo('medicoRotina', 'tot', 'conduta', v)} />

            <CampoTexto label="Observações" valor={visita.medicoRotina.observacoes} onChange={v => updateCampo('medicoRotina', 'observacoes', v)} />
          </>
        )}

        {categoriaAtiva === 'medicoPlantonista' && (
          <>
            <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Médico Plantonista</h4>
            <CampoTexto label="Evolução do Plantão" valor={visita.medicoPlantonista.evolucaoPlantao} onChange={v => updateCampo('medicoPlantonista', 'evolucaoPlantao', v)} />
            <CampoTexto label="Intercorrências 24h" valor={visita.medicoPlantonista.intercorrencias24h} onChange={v => updateCampo('medicoPlantonista', 'intercorrencias24h', v)} />
            <CampoTexto label="Condutas do Plantão" valor={visita.medicoPlantonista.condutasPlantao} onChange={v => updateCampo('medicoPlantonista', 'condutasPlantao', v)} />
            <CampoTexto label="Observações" valor={visita.medicoPlantonista.observacoes} onChange={v => updateCampo('medicoPlantonista', 'observacoes', v)} />
          </>
        )}

        {categoriaAtiva === 'enfermeiroPlantonista' && (
          <>
            <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Enfermeiro Plantonista</h4>
            <div className="grid grid-cols-2 gap-3">
              <CampoTexto label="Balanço Hídrico (ml)" valor={visita.enfermeiroPlantonista.balancoHidrico} onChange={v => updateCampo('enfermeiroPlantonista', 'balancoHidrico', v)} />
              <CampoTexto label="Braden" valor={visita.enfermeiroPlantonista.escalas.braden} onChange={v => updateNestedCampo('enfermeiroPlantonista', 'escalas', 'braden', v)} />
              <CampoTexto label="Morse" valor={visita.enfermeiroPlantonista.escalas.morse} onChange={v => updateNestedCampo('enfermeiroPlantonista', 'escalas', 'morse', v)} />
            </div>
            <ToggleRow label="Higiene oral realizada 3x/dia" valor={visita.enfermeiroPlantonista.higieneOral.realizada3x} onChange={v => updateNestedCampo('enfermeiroPlantonista', 'higieneOral', 'realizada3x', v)} />
            <ToggleRow label="SVD presente / manter" valor={visita.enfermeiroPlantonista.dispositivos.svd.indicacaoManter} onChange={v => updateNestedCampo('enfermeiroPlantonista', 'dispositivos', 'indicacaoManter', v)} />
            <CampoTexto label="Curativos" valor={visita.enfermeiroPlantonista.curativos} onChange={v => updateCampo('enfermeiroPlantonista', 'curativos', v)} />
            <CampoTexto label="Observações" valor={visita.enfermeiroPlantonista.observacoes} onChange={v => updateCampo('enfermeiroPlantonista', 'observacoes', v)} />
          </>
        )}

        {categoriaAtiva === 'gerenteEnfermagem' && (
          <>
            <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Gerente de Enfermagem</h4>
            <CampoTexto label="Recursos" valor={visita.gerenteEnfermagem.recursos} onChange={v => updateCampo('gerenteEnfermagem', 'recursos', v)} />
            <CampoTexto label="Padronizações" valor={visita.gerenteEnfermagem.padronizacoes} onChange={v => updateCampo('gerenteEnfermagem', 'padronizacoes', v)} />
            <CampoTexto label="Observações" valor={visita.gerenteEnfermagem.observacoes} onChange={v => updateCampo('gerenteEnfermagem', 'observacoes', v)} />
          </>
        )}

        {categoriaAtiva === 'fisioterapeutaPlantonista' && (
          <>
            <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Fisioterapeuta Plantonista</h4>
            <div className="grid grid-cols-3 gap-3">
              <CampoTexto label="Modo VM" valor={visita.fisioterapeutaPlantonista.ventilacaoMecanica.modo} onChange={v => updateNestedCampo('fisioterapeutaPlantonista', 'ventilacaoMecanica', 'modo', v)} />
              <CampoTexto label="FiO2 (%)" valor={visita.fisioterapeutaPlantonista.ventilacaoMecanica.fio2} onChange={v => updateNestedCampo('fisioterapeutaPlantonista', 'ventilacaoMecanica', 'fio2', v)} />
              <CampoTexto label="PEEP" valor={visita.fisioterapeutaPlantonista.ventilacaoMecanica.peep} onChange={v => updateNestedCampo('fisioterapeutaPlantonista', 'ventilacaoMecanica', 'peep', v)} />
            </div>
            <CampoTexto label="Desmame" valor={visita.fisioterapeutaPlantonista.desmame} onChange={v => updateCampo('fisioterapeutaPlantonista', 'desmame', v)} />
            <CampoTexto label="Mobilização Precoce" valor={visita.fisioterapeutaPlantonista.mobilizacaoPrecoce} onChange={v => updateCampo('fisioterapeutaPlantonista', 'mobilizacaoPrecoce', v)} />
            <CampoTexto label="Observações" valor={visita.fisioterapeutaPlantonista.observacoes} onChange={v => updateCampo('fisioterapeutaPlantonista', 'observacoes', v)} />
          </>
        )}

        {categoriaAtiva === 'coordenadorFisioterapia' && (
          <>
            <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Coordenador da Fisioterapia</h4>
            <CampoTexto label="Indicadores" valor={visita.coordenadorFisioterapia.indicadores} onChange={v => updateCampo('coordenadorFisioterapia', 'indicadores', v)} />
            <CampoTexto label="Observações" valor={visita.coordenadorFisioterapia.observacoes} onChange={v => updateCampo('coordenadorFisioterapia', 'observacoes', v)} />
          </>
        )}

        {categoriaAtiva === 'nutricionista' && (
          <>
            <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Nutricionista</h4>
            <div className="grid grid-cols-2 gap-3">
              <CampoTexto label="Via de Acesso" valor={visita.nutricionista.viaAcesso} onChange={v => updateCampo('nutricionista', 'viaAcesso', v)} />
              <CampoTexto label="Meta Calórica (kcal)" valor={visita.nutricionista.metaCalorica} onChange={v => updateCampo('nutricionista', 'metaCalorica', v)} />
              <CampoTexto label="Meta Proteica (g)" valor={visita.nutricionista.metaProteica} onChange={v => updateCampo('nutricionista', 'metaProteica', v)} />
              <CampoTexto label="Suplementação" valor={visita.nutricionista.suplementacao} onChange={v => updateCampo('nutricionista', 'suplementacao', v)} />
            </div>
            <CampoTexto label="Dieta" valor={visita.nutricionista.dieta} onChange={v => updateCampo('nutricionista', 'dieta', v)} />
            <CampoTexto label="Reavaliação" valor={visita.nutricionista.reavaliacao} onChange={v => updateCampo('nutricionista', 'reavaliacao', v)} />
            <CampoTexto label="Observações" valor={visita.nutricionista.observacoes} onChange={v => updateCampo('nutricionista', 'observacoes', v)} />
          </>
        )}

        {categoriaAtiva === 'tecnicoEnfermagem' && (
          <>
            <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Técnico em Enfermagem</h4>
            <div className="grid grid-cols-3 gap-3">
              <CampoTexto label="PA" valor={visita.tecnicoEnfermagem.sinaisVitais.pa} onChange={v => updateNestedCampo('tecnicoEnfermagem', 'sinaisVitais', 'pa', v)} />
              <CampoTexto label="FC" valor={visita.tecnicoEnfermagem.sinaisVitais.fc} onChange={v => updateNestedCampo('tecnicoEnfermagem', 'sinaisVitais', 'fc', v)} />
              <CampoTexto label="FR" valor={visita.tecnicoEnfermagem.sinaisVitais.fr} onChange={v => updateNestedCampo('tecnicoEnfermagem', 'sinaisVitais', 'fr', v)} />
              <CampoTexto label="SatO2" valor={visita.tecnicoEnfermagem.sinaisVitais.sat} onChange={v => updateNestedCampo('tecnicoEnfermagem', 'sinaisVitais', 'sat', v)} />
              <CampoTexto label="Temp" valor={visita.tecnicoEnfermagem.sinaisVitais.temp} onChange={v => updateNestedCampo('tecnicoEnfermagem', 'sinaisVitais', 'temp', v)} />
              <CampoTexto label="Glicemia" valor={visita.tecnicoEnfermagem.glicemia} onChange={v => updateCampo('tecnicoEnfermagem', 'glicemia', v)} />
            </div>
            <ToggleRow label="Higiene oral realizada 3x/dia" valor={visita.tecnicoEnfermagem.higieneOral.realizada3x} onChange={v => updateNestedCampo('tecnicoEnfermagem', 'higieneOral', 'realizada3x', v)} />
            <CampoTexto label="Higiene" valor={visita.tecnicoEnfermagem.higiene} onChange={v => updateCampo('tecnicoEnfermagem', 'higiene', v)} />
            <CampoTexto label="Observações do Leito" valor={visita.tecnicoEnfermagem.observacoesLeito} onChange={v => updateCampo('tecnicoEnfermagem', 'observacoesLeito', v)} />
            <CampoTexto label="Observações" valor={visita.tecnicoEnfermagem.observacoes} onChange={v => updateCampo('tecnicoEnfermagem', 'observacoes', v)} />
          </>
        )}
      </div>

      {/* Painel Metas do Dia */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-500" /> Metas do Dia ({metasPendentes.length} pendentes)
        </h4>
        {/* NOVA INDICAÇÃO */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lançar nova indicação</p>
            <div className="flex flex-col sm:flex-row gap-2">
            <select
                value={novaIndicacao.tipo}
                onChange={e => setNovaIndicacao({ ...novaIndicacao, tipo: e.target.value })}
                className="p-2.5 border border-slate-300 rounded-lg bg-white text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-teal-300 sm:w-40"
            >
                {TIPOS_INDICACAO.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
                type="text"
                value={novaIndicacao.descricao}
                onChange={e => setNovaIndicacao({ ...novaIndicacao, descricao: e.target.value })}
                placeholder="Descreva a indicação (ex: manter SVD, RX tórax controle...)"
                className="flex-1 p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-300"
            />
            <button
                onClick={() => {
                adicionarIndicacao(novaIndicacao.tipo, novaIndicacao.descricao);
                setNovaIndicacao({ tipo: novaIndicacao.tipo, descricao: '' });
                }}
                disabled={!novaIndicacao.descricao.trim()}
                className="px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm disabled:opacity-50 transition-colors"
            >
                + Adicionar
            </button>
            </div>
        </div>        
        {metasPendentes.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Nenhuma meta pendente.</p>
        ) : (
          <div className="space-y-2">
            {metasPendentes.map(meta => (
              <div key={meta.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">pendente</span>
                  <span className="text-sm font-semibold text-slate-700">{meta.tipo} — {meta.descricao}</span>
                  <span className="text-xs text-slate-400">({meta.quemIndicou})</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => marcarRealizado(meta.id)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
                  >
                    ✓ Marcar realizado
                  </button>
                  <button
                    onClick={() => setModalCancelamento({ id: meta.id, justificativa: '' })}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
                  >
                    ✗ Cancelar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de cancelamento com justificativa */}
      {modalCancelamento && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-lg text-slate-800 mb-4">Cancelar Indicação</h3>
            <textarea
              value={modalCancelamento.justificativa}
              onChange={e => setModalCancelamento({ ...modalCancelamento, justificativa: e.target.value })}
              placeholder="Justificativa do cancelamento..."
              className="w-full p-3 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-300 mb-4"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setModalCancelamento(null)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 font-bold text-sm">Voltar</button>
              <button
                onClick={() => confirmarCancelamento(modalCancelamento.id, modalCancelamento.justificativa)}
                disabled={!modalCancelamento.justificativa.trim()}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-sm disabled:opacity-50"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================
const CampoTexto = ({ label, valor, onChange }) => (
  <div>
    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">{label}</label>
    <textarea
      value={valor || ''}
      onChange={e => onChange(e.target.value)}
      className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-300"
      rows={2}
    />
  </div>
);

const ToggleRow = ({ label, valor, onChange }) => (
  <label className="flex items-center gap-3 cursor-pointer bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
    <input type="checkbox" checked={!!valor} onChange={e => onChange(e.target.checked)} className="w-4 h-4 accent-teal-600" />
    <span className="text-sm font-semibold text-slate-700">{label}</span>
  </label>
);

const ChecklistCard = ({ titulo, descricao, itens, valores, onToggle, cor }) => {
  const cores = {
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    violet: 'border-violet-200 bg-violet-50 text-violet-800',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-800'
  };
  return (
    <div className={`border rounded-xl p-4 ${cores[cor] || cores.cyan}`}>
      <h5 className="font-bold text-sm mb-0.5">{titulo}</h5>
      {descricao && <p className="text-xs opacity-80 mb-3">{descricao}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {itens.map(item => (
          <label key={item.id} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!(valores && valores[item.id])}
              onChange={e => onToggle(item.id, e.target.checked)}
              className="w-4 h-4 accent-teal-600"
            />
            <span className="text-sm">{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default VisitaMultiTab;