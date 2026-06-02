import React, { useState } from 'react';
import { Brain, FileText, Users, Activity, TrendingUp, CheckCircle, AlertCircle, Info, Send, X } from 'lucide-react';

const PsychologyDashboard = ({ currentPatient, isEditable, updateNested, handleBlurSave, userProfile }) => {
  const [activeSubTab, setActiveSubTab] = useState('VISÃO GERAL');

  // --- ESTADOS LOCAIS PARA O FORMULÁRIO DE NOVA SOLICITAÇÃO ---
  const [formMotivos, setFormMotivos] = useState([]);
  const [formDescricao, setFormDescricao] = useState('');

  // Atalho para ler os dados de psicologia
  const psiData = currentPatient?.psychology || {};

  // Função auxiliar para formatar data/hora
  const formatarDataHora = (isoString) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Função auxiliar para lidar com checkboxes gerais (Arrays no Firebase)
  const handleCheckboxChange = (field, value) => {
    let currentArray = psiData[field] || [];
    if (currentArray.includes(value)) {
      currentArray = currentArray.filter(item => item !== value);
    } else {
      currentArray = [...currentArray, value];
    }
    updateNested("psychology", field, currentArray);
  };

  // Função para lidar com os checkboxes do formulário RASCUNHO (Local)
  const handleFormCheckbox = (motivo) => {
    if (formMotivos.includes(motivo)) {
      setFormMotivos(formMotivos.filter(m => m !== motivo));
    } else {
      setFormMotivos([...formMotivos, motivo]);
    }
  };

  // Função para ENVIAR a nova solicitação para o Firebase
  const handleEnviarSolicitacao = (e) => {
    e.preventDefault();
    if (formMotivos.length === 0 && !formDescricao.trim()) {
      alert("Selecione um motivo ou digite uma descrição para enviar a solicitação.");
      return;
    }

    const nomeSolicitante = userProfile?.nome || userProfile?.name || "Profissional";
    const cargoSolicitante = userProfile?.role || userProfile?.perfil || "Equipe";

    const novaSolicitacao = {
      id: Date.now().toString(), // ID único baseado no tempo
      data: new Date().toISOString(),
      solicitante: `${nomeSolicitante} (${cargoSolicitante})`,
      motivos: formMotivos,
      descricao: formDescricao,
      prioridade: '',
      intervencao: '',
      status: 'Pendente'
    };

    const solicitacoesAtuais = psiData.solicitacoes || [];
    
    // Salva direto no Firebase
    updateNested("psychology", "solicitacoes", [...solicitacoesAtuais, novaSolicitacao]);
    
    // Limpa o formulário local
    setFormMotivos([]);
    setFormDescricao('');
  };

  // Função para a Psicologia atualizar os campos dentro do Card
  const handleUpdateCard = (id, field, value) => {
    const solicitacoesAtuais = psiData.solicitacoes || [];
    const index = solicitacoesAtuais.findIndex(s => s.id === id);
    if (index !== -1) {
      const novasSolicitacoes = [...solicitacoesAtuais];
      novasSolicitacoes[index] = { ...novasSolicitacoes[index], [field]: value };
      updateNested("psychology", "solicitacoes", novasSolicitacoes);
    }
  };

  // Função para EXCLUIR uma solicitação inteira
  const handleDeleteSolicitacao = (id) => {
    if (window.confirm("Tem certeza que deseja excluir esta solicitação? Esta ação não pode ser desfeita.")) {
      const solicitacoesAtuais = psiData.solicitacoes || [];
      const novasSolicitacoes = solicitacoesAtuais.filter(s => s.id !== id);
      updateNested("psychology", "solicitacoes", novasSolicitacoes);
    }
  };

  // --- REGRAS DE NEGÓCIO AUTOMÁTICAS PARA O PAINEL DE STATUS ---
  const isDeliriumSuspeito = (psiData.sintomas || []).includes('Delirium suspeito');
  const deliriumStatus = isDeliriumSuspeito ? 'SUSPEITO' : 'NEGATIVO';
  
  const isFamiliaAssistida = psiData.notasFamilia && psiData.notasFamilia.trim().length > 0;
  const familiaAssistidaStatus = isFamiliaAssistida ? 'SIM' : 'NÃO';

  const isSedado = currentPatient?.neuro?.sedacao === true;
  const sedacaoStatus = isSedado ? 'SIM' : 'NÃO';

  const compreensaoStatus = psiData.compreensao ? psiData.compreensao.toUpperCase() : '-';

  // --- SUB-ABAS ---
  const subTabs = [
    { id: 'VISÃO GERAL', icon: <Brain size={16} /> },
    { id: 'SOLICITAÇÕES', icon: <FileText size={16} /> },
    { id: 'FAMÍLIA', icon: <Users size={16} /> },
    { id: 'INTERVENÇÕES', icon: <Activity size={16} /> },
    { id: 'EVOLUÇÃO', icon: <TrendingUp size={16} /> }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* NAVEGAÇÃO INTERNA DA PSICOLOGIA */}
      <div className="flex overflow-x-auto border-b border-slate-200 scrollbar-hide">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={(e) => { e.preventDefault(); setActiveSubTab(tab.id); }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${
              activeSubTab === tab.id
                ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.icon}
            {tab.id}
          </button>
        ))}
      </div>

      {/* ========================================== */}
      {/* ABA 1: VISÃO GERAL E TRIAGEM                */}
      {/* ========================================== */}
      {activeSubTab === 'VISÃO GERAL' && (
        <div className="space-y-6">
          
          {/* PAINEL DE STATUS PSICOLÓGICO */}
          <div className="bg-[#1e293b] rounded-xl p-5 text-white shadow-md flex flex-col md:flex-row gap-6 items-center md:items-start">
            <div className="w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center flex-shrink-0">
              <Brain size={32} className="text-teal-400" />
            </div>
            <div className="flex-1 w-full">
              <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">Status Psicológico / Psicossocial</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Risco Psicológico</p>
                  <p className={`font-bold text-sm ${psiData.riscoPsicologico === 'Alto' ? 'text-red-400' : psiData.riscoPsicologico === 'Moderado' ? 'text-orange-400' : 'text-emerald-400'}`}>
                    {psiData.riscoPsicologico ? psiData.riscoPsicologico.toUpperCase() : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Humor Predominante</p>
                  <p className="font-bold text-sm text-yellow-400">{psiData.humor ? psiData.humor.toUpperCase() : '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Delirium</p>
                  <p className={`font-bold text-sm ${isDeliriumSuspeito ? 'text-orange-400' : 'text-white'}`}>{deliriumStatus}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Família Assistida</p>
                  <p className={`font-bold text-sm ${isFamiliaAssistida ? 'text-green-400' : 'text-slate-400'}`}>{familiaAssistidaStatus}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Sedação</p>
                  <p className={`font-bold text-sm ${isSedado ? 'text-purple-400' : 'text-white'}`}>{sedacaoStatus}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Compreensão</p>
                  <p className="font-bold text-sm text-blue-400">{compreensaoStatus}</p>
                </div>
              </div>
            </div>
          </div>

          {/* TRIAGEM PSICOLÓGICA */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-purple-50 border-b border-purple-100 p-4 flex items-center gap-2">
              <Activity size={18} className="text-purple-600" />
              <h4 className="font-bold text-purple-800">Triagem Psicológica Inicial</h4>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nível de consciência</label>
                <select className="w-full p-2 border rounded-lg bg-slate-50 outline-none focus:border-purple-400 text-sm" disabled={!isEditable} value={psiData.nivelConsciencia || ""} onChange={(e) => updateNested("psychology", "nivelConsciencia", e.target.value)} onBlur={() => handleBlurSave("Psicologia: Triagem")}>
                  <option value="">Selecione...</option><option value="Alerta">Alerta</option><option value="Sonolento">Sonolento</option><option value="Sedado">Sedado</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Comunicação</label>
                <select className="w-full p-2 border rounded-lg bg-slate-50 outline-none focus:border-purple-400 text-sm" disabled={!isEditable} value={psiData.comunicacao || ""} onChange={(e) => updateNested("psychology", "comunicacao", e.target.value)} onBlur={() => handleBlurSave("Psicologia: Triagem")}>
                  <option value="">Selecione...</option><option value="Verbal">Verbal</option><option value="Não verbal">Não verbal</option><option value="Impossibilitada">Impossibilitada</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Compreensão</label>
                <select className="w-full p-2 border rounded-lg bg-slate-50 outline-none focus:border-purple-400 text-sm" disabled={!isEditable} value={psiData.compreensao || ""} onChange={(e) => updateNested("psychology", "compreensao", e.target.value)} onBlur={() => handleBlurSave("Psicologia: Triagem")}>
                  <option value="">Selecione...</option><option value="Preservada">Preservada</option><option value="Parcial">Parcial</option><option value="Ausente">Ausente</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Humor observado</label>
                <select className="w-full p-2 border rounded-lg bg-slate-50 outline-none focus:border-purple-400 text-sm" disabled={!isEditable} value={psiData.humor || ""} onChange={(e) => updateNested("psychology", "humor", e.target.value)} onBlur={() => handleBlurSave("Psicologia: Triagem")}>
                  <option value="">Selecione...</option><option value="Eutímico">Eutímico</option><option value="Ansioso">Ansioso</option><option value="Deprimido">Deprimido</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Sofrimento emocional</label>
                <select className="w-full p-2 border rounded-lg bg-slate-50 outline-none focus:border-purple-400 text-sm" disabled={!isEditable} value={psiData.sofrimento || ""} onChange={(e) => updateNested("psychology", "sofrimento", e.target.value)} onBlur={() => handleBlurSave("Psicologia: Triagem")}>
                  <option value="">Selecione...</option><option value="Leve">Leve</option><option value="Moderado">Moderado</option><option value="Grave">Grave</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Risco psicológico</label>
                <select className={`w-full p-2 border rounded-lg outline-none focus:border-purple-400 text-sm font-bold ${psiData.riscoPsicologico === 'Alto' ? 'bg-red-50 text-red-700 border-red-200' : psiData.riscoPsicologico === 'Moderado' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-slate-50 text-slate-700'}`} disabled={!isEditable} value={psiData.riscoPsicologico || ""} onChange={(e) => updateNested("psychology", "riscoPsicologico", e.target.value)} onBlur={() => handleBlurSave("Psicologia: Triagem")}>
                  <option value="">Selecione...</option><option value="Baixo">Baixo</option><option value="Moderado">Moderado</option><option value="Alto">Alto</option>
                </select>
              </div>

              <div className="col-span-1 md:col-span-2 lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-3 mt-2 pt-4 border-t border-slate-100">
                {['Agitação', 'Choro frequente', 'Confusão mental', 'Delirium suspeito'].map(item => (
                  <label key={item} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" disabled={!isEditable} checked={(psiData.sintomas || []).includes(item)} onChange={() => handleCheckboxChange('sintomas', item)} className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500" />
                    {item}
                  </label>
                ))}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 2: SOLICITAÇÕES                         */}
      {/* ========================================== */}
      {activeSubTab === 'SOLICITAÇÕES' && (
        <div className="space-y-6">
          
          {/* FORMULÁRIO DE NOVA SOLICITAÇÃO (Aberto para todos) */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-indigo-50 border-b border-indigo-100 p-4 flex items-center gap-2">
              <AlertCircle size={18} className="text-indigo-600" />
              <h4 className="font-bold text-indigo-800 uppercase text-sm tracking-wide">Nova Solicitação de Psicologia</h4>
            </div>
            <div className="p-5">
              
              {/* Identificação Automática */}
              <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 text-sm text-slate-600">
                <Info size={16} className="text-blue-500 flex-shrink-0" />
                <span>Solicitante registrado automaticamente como: <strong className="text-slate-800">{userProfile?.nome || userProfile?.name || "Profissional"}</strong> ({userProfile?.role || userProfile?.perfil || "Equipe"})</span>
              </div>

              <label className="block text-sm font-bold text-slate-700 mb-3">Motivo da solicitação</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {[
                  'Ansiedade / agitação', 'Delirium', 'Suporte emocional', 'Comunicação difícil', 
                  'Recusa terapêutica', 'Cuidados paliativos', 'Comunicação de más notícias', 
                  'Sofrimento familiar', 'Luto antecipatório', 'Luto pós-óbito', 'Ideação suicida', 
                  'Uso de substâncias', 'Desorganização comportamental', 'Apoio à equipe', 'Outro'
                ].map(motivo => (
                  <label key={motivo} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer p-2 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-colors">
                    <input type="checkbox" checked={formMotivos.includes(motivo)} onChange={() => handleFormCheckbox(motivo)} className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                    {motivo}
                  </label>
                ))}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">Descrição da solicitação</label>
                <textarea 
                  className="w-full p-3 border border-slate-300 rounded-xl bg-slate-50 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-sm" 
                  rows="3" 
                  placeholder="Descreva o contexto e a necessidade..." 
                  value={formDescricao} 
                  onChange={(e) => setFormDescricao(e.target.value)}
                ></textarea>
              </div>

              <div className="flex justify-end">
                <button 
                  className="py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm" 
                  onClick={handleEnviarSolicitacao}
                >
                  <Send size={18} /> Enviar Solicitação
                </button>
              </div>
            </div>
          </div>

          {/* CARDS DE SOLICITAÇÕES REGISTRADAS */}
          {psiData.solicitacoes && psiData.solicitacoes.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-700 uppercase text-sm tracking-wide flex items-center gap-2 mt-4 ml-1">
                <FileText size={18} className="text-slate-400" />
                Histórico de Solicitações ({psiData.solicitacoes.length})
              </h4>
              
              {/* Mapeia as solicitações da mais nova para a mais antiga */}
              {[...psiData.solicitacoes].reverse().map((solic) => (
                <div key={solic.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col md:flex-row">
                  
                  {/* Lado Esquerdo: Dados do Pedido (Somente leitura) */}
                  <div className="p-5 flex-1 border-b md:border-b-0 md:border-r border-slate-100">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-xs font-bold text-slate-400">{formatarDataHora(solic.data)}</p>
                        <p className="text-sm font-bold text-indigo-700">{solic.solicitante}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${solic.status === 'Concluída' ? 'bg-emerald-100 text-emerald-700' : solic.status === 'Em Andamento' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                        {solic.status || 'Pendente'}
                      </span>
                    </div>
                    
                    <div className="mb-3 flex flex-wrap gap-1">
                      {(solic.motivos || []).map((m, i) => (
                        <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 text-[11px] rounded-md font-bold uppercase">{m}</span>
                      ))}
                    </div>
                    
                    {solic.descricao && (
                      <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">"{solic.descricao}"</p>
                    )}
                  </div>

                  {/* Lado Direito: Uso Exclusivo da Psicologia (Bloqueado para outros) */}
                  <div className="p-5 md:w-1/3 bg-slate-50 flex flex-col gap-3 relative">
                    
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Brain size={16} className="text-purple-600" />
                        <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">Gestão da Psicologia</span>
                      </div>
                      
                      {/* BOTÃO DE EXCLUIR SOLICITAÇÃO (Aparece apenas se tiver permissão de edição) */}
                      {isEditable && (
                        <button 
                          onClick={(e) => { e.preventDefault(); handleDeleteSolicitacao(solic.id); }}
                          className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                          title="Excluir Solicitação"
                        >
                          <X size={16} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Prioridade</label>
                        <select 
                          className={`w-full p-2 border rounded-lg outline-none focus:border-purple-400 text-sm font-bold ${solic.prioridade === 'Imediata' ? 'bg-red-50 text-red-700 border-red-200' : solic.prioridade === 'Urgente' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-white text-slate-700'}`} 
                          disabled={!isEditable} 
                          value={solic.prioridade || ""} 
                          onChange={(e) => handleUpdateCard(solic.id, "prioridade", e.target.value)} 
                        >
                          <option value="">Definir...</option>
                          <option value="Rotina">Rotina</option>
                          <option value="Urgente">Urgente</option>
                          <option value="Imediata">Imediata</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status</label>
                        <select 
                          className="w-full p-2 border rounded-lg bg-white outline-none focus:border-purple-400 text-sm font-bold text-slate-700" 
                          disabled={!isEditable} 
                          value={solic.status || "Pendente"} 
                          onChange={(e) => handleUpdateCard(solic.id, "status", e.target.value)} 
                        >
                          <option value="Pendente">Pendente</option>
                          <option value="Em Andamento">Em Andamento</option>
                          <option value="Concluída">Concluída</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col mt-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Intervenção / Conduta Realizada</label>
                      <textarea 
                        className="w-full flex-1 min-h-[80px] p-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100 text-sm" 
                        placeholder={isEditable ? "Registre a conduta para esta solicitação..." : "Aguardando avaliação da psicologia..."} 
                        disabled={!isEditable} 
                        value={solic.intervencao || ""} 
                        onChange={(e) => handleUpdateCard(solic.id, "intervencao", e.target.value)} 
                        onBlur={() => handleBlurSave("Psicologia: Registrou Intervenção")}
                      ></textarea>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 3: FAMÍLIA E REDE DE APOIO              */}
      {/* ========================================== */}
      {activeSubTab === 'FAMÍLIA' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-blue-50 border-b border-blue-100 p-4 flex items-center gap-2">
              <Users size={18} className="text-blue-600" />
              <h4 className="font-bold text-blue-800 uppercase text-sm tracking-wide">Dados do Familiar de Referência</h4>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">Nome do Familiar</label>
                <input type="text" className="w-full p-2 border rounded-lg bg-slate-50 outline-none focus:border-blue-400 text-sm" disabled={!isEditable} value={psiData.nomeFamiliar || ""} onChange={(e) => updateNested("psychology", "nomeFamiliar", e.target.value)} onBlur={() => handleBlurSave("Psicologia: Familiar")} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Parentesco</label>
                <input type="text" className="w-full p-2 border rounded-lg bg-slate-50 outline-none focus:border-blue-400 text-sm" disabled={!isEditable} value={psiData.parentesco || ""} onChange={(e) => updateNested("psychology", "parentesco", e.target.value)} onBlur={() => handleBlurSave("Psicologia: Familiar")} />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Presença frequente?</label>
                <select className="w-full p-2 border rounded-lg bg-slate-50 outline-none focus:border-blue-400 text-sm" disabled={!isEditable} value={psiData.presencaFamiliar || ""} onChange={(e) => updateNested("psychology", "presencaFamiliar", e.target.value)} onBlur={() => handleBlurSave("Psicologia: Familiar")}><option value="">-</option><option value="Sim">Sim</option><option value="Não">Não</option></select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Família orientada?</label>
                <select className="w-full p-2 border rounded-lg bg-slate-50 outline-none focus:border-blue-400 text-sm" disabled={!isEditable} value={psiData.familiaOrientada || ""} onChange={(e) => updateNested("psychology", "familiaOrientada", e.target.value)} onBlur={() => handleBlurSave("Psicologia: Familiar")}><option value="">-</option><option value="Sim">Sim</option><option value="Não">Não</option></select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Compreensão do quadro</label>
                <select className="w-full p-2 border rounded-lg bg-slate-50 outline-none focus:border-blue-400 text-sm" disabled={!isEditable} value={psiData.compreensaoFamiliar || ""} onChange={(e) => updateNested("psychology", "compreensaoFamiliar", e.target.value)} onBlur={() => handleBlurSave("Psicologia: Familiar")}><option value="">-</option><option value="Adequada">Adequada</option><option value="Parcial">Parcial</option><option value="Baixa">Baixa</option></select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Sofrimento familiar</label>
                <select className={`w-full p-2 border rounded-lg outline-none focus:border-blue-400 text-sm font-bold ${psiData.sofrimentoFamiliar === 'Intenso' ? 'bg-orange-100 text-orange-800 border-orange-300' : 'bg-slate-50 text-slate-700'}`} disabled={!isEditable} value={psiData.sofrimentoFamiliar || ""} onChange={(e) => updateNested("psychology", "sofrimentoFamiliar", e.target.value)} onBlur={() => handleBlurSave("Psicologia: Familiar")}><option value="">-</option><option value="Leve">Leve</option><option value="Moderado">Moderado</option><option value="Intenso">Intenso</option></select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Conflito familiar?</label>
                <select className="w-full p-2 border rounded-lg bg-slate-50 outline-none focus:border-blue-400 text-sm" disabled={!isEditable} value={psiData.conflitoFamiliar || ""} onChange={(e) => updateNested("psychology", "conflitoFamiliar", e.target.value)} onBlur={() => handleBlurSave("Psicologia: Familiar")}><option value="">-</option><option value="Sim">Sim</option><option value="Não">Não</option></select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Necessita intervenção?</label>
                <select className="w-full p-2 border rounded-lg bg-slate-50 outline-none focus:border-blue-400 text-sm" disabled={!isEditable} value={psiData.necessitaIntervencao || ""} onChange={(e) => updateNested("psychology", "necessitaIntervencao", e.target.value)} onBlur={() => handleBlurSave("Psicologia: Familiar")}><option value="">-</option><option value="Sim">Sim</option><option value="Não">Não</option></select>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center gap-2">
              <Info size={18} className="text-slate-500" />
              <h4 className="font-bold text-slate-700 uppercase text-sm tracking-wide">Acompanhamento Familiar (Notas)</h4>
            </div>
            <div className="p-5">
              <textarea className="w-full p-3 border border-slate-300 rounded-xl bg-slate-50 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-sm" rows="4" placeholder="Descreva o acolhimento, reações da família e orientações dadas..." disabled={!isEditable} value={psiData.notasFamilia || ""} onChange={(e) => updateNested("psychology", "notasFamilia", e.target.value)} onBlur={() => handleBlurSave("Psicologia: Notas Família")}></textarea>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 4: INTERVENÇÕES                         */}
      {/* ========================================== */}
      {activeSubTab === 'INTERVENÇÕES' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-emerald-50 border-b border-emerald-100 p-4 flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-600" />
            <h4 className="font-bold text-emerald-800 uppercase text-sm tracking-wide">Intervenções Psicológicas Realizadas</h4>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              'Escuta psicológica', 'Psicoeducação', 'Manejo de ansiedade', 'Suporte emocional', 
              'Mediação familiar', 'Comunicação de más notícias', 'Intervenção em crise', 
              'Técnicas de grounding', 'Estimulação cognitiva', 'Acompanhamento paliativo', 
              'Apoio ao luto', 'Apoio à equipe'
            ].map(intervencao => (
              <label key={intervencao} className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer p-3 bg-slate-50 hover:bg-emerald-50/50 rounded-xl border border-slate-200 hover:border-emerald-200 transition-colors">
                <input type="checkbox" disabled={!isEditable} checked={(psiData.intervencoesRealizadas || []).includes(intervencao)} onChange={() => handleCheckboxChange('intervencoesRealizadas', intervencao)} className="w-5 h-5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500" />
                <span className="font-medium">{intervencao}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ABA 5: EVOLUÇÃO                             */}
      {/* ========================================== */}
      {activeSubTab === 'EVOLUÇÃO' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-slate-800 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-slate-300" />
                <h4 className="font-bold uppercase text-sm tracking-wide">Evolução Psicológica Padronizada</h4>
              </div>
            </div>
            <div className="p-5">
              <textarea className="w-full p-4 border border-slate-300 rounded-xl bg-slate-50 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 text-sm leading-relaxed" rows="8" placeholder="Paciente avaliado em leito de UTI. Encontrava-se consciente/orientado... Apresenta humor... Relata... Familiares... Realizadas intervenções de... Mantido acompanhamento psicológico." disabled={!isEditable} value={psiData.evolucaoPadronizada || ""} onChange={(e) => updateNested("psychology", "evolucaoPadronizada", e.target.value)} onBlur={() => handleBlurSave("Psicologia: Evolução")}></textarea>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-yellow-100 border-b border-yellow-200 p-4 flex items-center gap-2">
              <AlertCircle size={18} className="text-yellow-700" />
              <h4 className="font-bold text-yellow-800 uppercase text-sm tracking-wide">Observações Relevantes à Equipe Multi</h4>
            </div>
            <div className="p-5">
              <p className="text-xs text-yellow-700 mb-3">Use este espaço para deixar recados importantes para médicos, enfermeiros e fisios (ex: "Paciente responde melhor à presença familiar", "Evitar jargão médico ao falar com a mãe").</p>
              <textarea className="w-full p-3 border border-yellow-300 rounded-xl bg-white outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 text-sm font-medium text-slate-800" rows="3" placeholder="Anotações compartilhadas..." disabled={!isEditable} value={psiData.observacoesEquipe || ""} onChange={(e) => updateNested("psychology", "observacoesEquipe", e.target.value)} onBlur={() => handleBlurSave("Psicologia: Obs Equipe")}></textarea>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PsychologyDashboard;