import React, { useState, useEffect } from 'react';
import { collection, doc, updateDoc, deleteDoc, arrayUnion, addDoc, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import { Users, Search, ShieldCheck, AlertCircle, ArrowLeft, Loader2, Plus, X, UserPlus, Save, 
         Settings, UserX, UserCheck, Trash2 } from 'lucide-react';

const ModuloAdmin = ({ userProfile }) => {
  const navigate = useNavigate();
  
  // Estados da Lista e Pesquisa
  const [profissionaisList, setProfissionaisList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estados do Formulário de Novo Registro
  const [novoProfissional, setNovoProfissional] = useState({
    nome: '', categoria: '', conselho: 'Registro', numeroConselho: '', vinculo: 'PJ'
  });
  const [erroConselho, setErroConselho] = useState('');
  const [isSalvandoProfissional, setIsSalvandoProfissional] = useState(false);

  // Estados para o Modal de Vínculo
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Simulação das Unidades Físicas
  const unidadesDisponiveis = [
    { instituicaoId: "hosp_municipal", instituicaoNome: "HMA", unidadeId: "uti_01", unidadeNome: "UTI Adulto" },
  ];

  // ------------------------------------------------------------------
  // 1. CARREGAMENTO EM TEMPO REAL DA COLEÇÃO "profissionais"
  // ------------------------------------------------------------------
  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, "profissionais"), orderBy("nome", "asc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Ordenar: Pendentes (sem vínculo) primeiro para chamar a atenção do gestor
      lista.sort((a, b) => (a.vinculos?.length || 0) - (b.vinculos?.length || 0));
      
      setProfissionaisList(lista);
      setIsLoading(false);
    }, (error) => {
      console.error("Erro ao buscar profissionais:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ------------------------------------------------------------------
  // 2. FUNÇÕES DO FORMULÁRIO DE CADASTRO
  // ------------------------------------------------------------------
  const handleCategoriaChange = (e) => {
    const cat = e.target.value;
    let conselhoPadrao = 'Outro';
    if (cat === 'Médico') conselhoPadrao = 'CRM';
    if (cat === 'Enfermeiro' || cat === 'Téc. Enfermagem') conselhoPadrao = 'COREN';
    if (cat === 'Fisioterapeuta') conselhoPadrao = 'CREFITO';
    if (cat === 'Nutricionista') conselhoPadrao = 'CRN';
    if (cat === 'Fonoaudiólogo') conselhoPadrao = 'CREFONO';
    if (cat === 'Administrativo') conselhoPadrao = 'CPF';

    setNovoProfissional({ ...novoProfissional, categoria: cat, conselho: conselhoPadrao });
  };

  const handleBlurConselho = async () => {
    if (!novoProfissional.numeroConselho) {
      setErroConselho('');
      return;
    }
    try {
      const q = query(collection(db, "profissionais"), where("numeroConselho", "==", novoProfissional.numeroConselho));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setErroConselho(`Este ${novoProfissional.conselho} já está cadastrado!`);
      } else {
        setErroConselho('');
      }
    } catch (error) {
      console.error("Erro ao verificar conselho:", error);
    }
  };

  const salvarProfissional = async (e) => {
    e.preventDefault(); 
    if (erroConselho) return;

    setIsSalvandoProfissional(true);
    try {
      await addDoc(collection(db, "profissionais"), {
        ...novoProfissional,
        cadastradoEm: new Date().toISOString(),
        status: 'Ativo',
        vinculos: [] // Nasce sem vínculos
      });
      
      alert(`✅ ${novoProfissional.nome} cadastrado com sucesso!`);
      setNovoProfissional({ nome: '', categoria: '', conselho: 'Registro', numeroConselho: '', vinculo: 'PJ' });
    } catch (error) {
      console.error("Erro ao salvar profissional:", error);
      alert("❌ Erro ao salvar na base de dados.");
    } finally {
      setIsSalvandoProfissional(false);
    }
  };

  // ------------------------------------------------------------------
  // 3. FUNÇÕES DE VÍNCULO (MODAL)
  // ------------------------------------------------------------------
  const openModal = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleAtribuirVinculo = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    
    const formData = new FormData(e.target);
    const unidadeIndex = formData.get("unidadeIndex");
    const cargoLocal = formData.get("cargoLocal");
    
    const unidadeSelecionada = unidadesDisponiveis[unidadeIndex];
    
    const novoVinculo = {
      ...unidadeSelecionada,
      perfil: cargoLocal 
    };

    try {
      const userRef = doc(db, "profissionais", selectedUser.id); 
      await updateDoc(userRef, {
        vinculos: arrayUnion(novoVinculo)
      });
      
      alert(`Vínculo adicionado com sucesso para ${selectedUser.nome}!`);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Erro ao atualizar vínculo:", error);
      alert("Erro ao atribuir vínculo.");
    } finally {
      setIsUpdating(false);
    }
  };

  // ------------------------------------------------------------------
  // 4. RENDERIZAÇÃO DA TELA
  // ------------------------------------------------------------------
  const filteredUsers = profissionaisList.filter(u => 
    u.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.numeroConselho?.includes(searchTerm) ||
    u.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- NOVAS FUNÇÕES DE GESTÃO ---

  const excluirProfissional = async (id, nome) => {
    if (window.confirm(`🚨 ATENÇÃO: Tem a certeza que deseja excluir DEFINITIVAMENTE o cadastro de ${nome}? Esta ação não pode ser desfeita.`)) {
      try {
        await deleteDoc(doc(db, "profissionais", id));
        alert("Profissional excluído com sucesso.");
        // Se tiver uma função que recarrega a tabela (ex: fetchUsers), chame-a aqui!
        // fetchUsers(); 
      } catch (error) {
        console.error("Erro ao excluir:", error);
        alert("Erro ao excluir profissional.");
      }
    }
  };

  const toggleStatusProfissional = async (id, nome, statusAtivo) => {
    const acao = statusAtivo === false ? 'reativar' : 'desativar (bloquear acesso de)';
    if (window.confirm(`Deseja ${acao} ${nome}?`)) {
      try {
        await updateDoc(doc(db, "profissionais", id), { 
          ativo: statusAtivo === false ? true : false 
        });
        // Se tiver uma função que recarrega a tabela (ex: fetchUsers), chame-a aqui!
        // fetchUsers();
      } catch (error) {
        console.error("Erro ao mudar status:", error);
        alert("Erro ao atualizar status.");
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="text-emerald-600" /> Controle de Equipe e Acessos
          </h2>
          <p className="text-slate-500 text-sm mt-1">Cadastre novos profissionais e gerencie as unidades de atuação.</p>
        </div>
        
        {/* Barra de Pesquisa */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou conselho..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
          />
        </div>
      </div>

      {/* LAYOUT PRINCIPAL: FORMULÁRIO (ESQUERDA) + TABELA (DIREITA) */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* COLUNA ESQUERDA: FORMULÁRIO */}
        <div className="lg:col-span-1">
          <form onSubmit={salvarProfissional} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm sticky top-4">
            <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
              <UserPlus size={18} className="text-emerald-500" /> CADASTRAR SERVIDOR
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nome (Conforme Escala)</label>
                <input 
                  type="text" required value={novoProfissional.nome}
                  onChange={(e) => setNovoProfissional({...novoProfissional, nome: e.target.value.toUpperCase()})}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:border-emerald-500 outline-none"
                  placeholder=""
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Área de Atuação</label>
                <select 
                  required // <--- Impede de salvar sem escolher
                  value={novoProfissional.categoria} onChange={handleCategoriaChange}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:border-emerald-500 outline-none cursor-pointer"
                >
                  <option value="" disabled>Selecione...</option> {/* <--- NOVA OPÇÃO */}
                  <option value="Médico">Médico</option>
                  <option value="Enfermeiro">Enfermeiro</option>
                  <option value="Téc. Enfermagem">Téc. Enfermagem</option>
                  <option value="Fisioterapeuta">Fisioterapeuta</option>
                  <option value="Nutricionista">Nutricionista</option>
                  <option value="Fonoaudiólogo">Fonoaudiólogo</option>
                  <option value="Administrativo">Administrativo</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  {/* O Rótulo muda automaticamente para 'CPF ou Matrícula' se for Administrativo */}
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{novoProfissional.conselho}</label>
                  <input 
                    type="number" required value={novoProfissional.numeroConselho}
                    onChange={(e) => setNovoProfissional({...novoProfissional, numeroConselho: e.target.value})}
                    onBlur={handleBlurConselho}
                    className={`w-full p-2.5 bg-slate-50 border ${erroConselho ? 'border-red-500' : 'border-slate-200'} rounded-xl text-sm font-bold focus:border-emerald-500 outline-none`}
                    placeholder="Somente Números"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Contrato</label>
                  <select 
                    value={novoProfissional.vinculo} onChange={(e) => setNovoProfissional({...novoProfissional, vinculo: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:border-emerald-500 outline-none cursor-pointer"
                  >
                    <option value="PJ">PJ</option>
                    <option value="CLT">CLT</option>
                    <option value="Efetivo">Efetivo</option>
                  </select>
                </div>
              </div>

              {erroConselho && (
                <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle size={12} /> {erroConselho}
                </p>
              )}

              <div className="pt-2">
                <button 
                  type="submit" disabled={isSalvandoProfissional || !!erroConselho}
                  className="w-full bg-emerald-600 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {isSalvandoProfissional ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                  Salvar na Base
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* COLUNA DIREITA: TABELA DE GERENCIAMENTO */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            {isLoading ? (
              <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 size={40} className="animate-spin mb-4 text-emerald-500" />
                <p className="font-bold">Carregando base de profissionais...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                      <th className="p-4 font-bold">Profissional</th>
                      <th className="p-4 font-bold">Registro / Vínculo</th>
                      <th className="p-4 font-bold">Status de Atuação</th>
                      <th className="p-4 font-bold text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => {
                      const hasVinculo = u.vinculos && u.vinculos.length > 0;
                      const isSuperAdmin = u.categoria === "Administrador"; 
                      const estaDesativado = u.ativo === false; // Checa se a flag de inativo existe

                      return (
                        <tr key={u.id} className={`transition-colors ${estaDesativado ? 'bg-slate-50 opacity-60 grayscale-[0.5]' : 'hover:bg-slate-50'}`}>
                          <td className="p-4">
                            <div className={`font-bold ${estaDesativado ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{u.nome}</div>
                            <div className="text-xs font-bold text-emerald-600 uppercase mt-0.5">{u.categoria}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-mono text-sm text-slate-600 font-medium">
                              {u.conselho} {u.numeroConselho}
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                              CONTRATO: {u.vinculo || 'N/A'}
                            </div>
                          </td>
                          <td className="p-4">
                            {estaDesativado ? (
                               <div className="flex items-center gap-1 text-red-500 font-bold text-xs">
                                 <UserX size={14} /> Conta Inativa
                               </div>
                            ) : isSuperAdmin ? (
                              <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
                                <ShieldCheck size={14} /> Acesso Global
                              </div>
                            ) : hasVinculo ? (
                              <div className="text-xs font-bold text-blue-600 bg-blue-50 inline-flex px-2 py-1 rounded-md">
                                {u.vinculos.length} unidade(s)
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                                <AlertCircle size={14} /> Pendente (Sem Unidade)
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            {/* GRUPO DE BOTÕES DE AÇÃO */}
                            <div className="flex items-center justify-center gap-2">
                              {/* Botão: Gerenciar Vínculos / Atribuir */}
                              <button 
                                onClick={() => openModal(u)}
                                title={hasVinculo ? "Gerenciar Vínculos" : "Atribuir Unidade"}
                                className={`p-2 rounded-lg transition-colors ${hasVinculo ? 'bg-slate-100 text-slate-600 hover:bg-slate-800 hover:text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'}`}
                              >
                                {hasVinculo ? <Settings size={16} /> : <Plus size={16} />}
                              </button>

                              {/* Botão: Desativar / Reativar */}
                              <button 
                                onClick={() => toggleStatusProfissional(u.id, u.nome, u.ativo)}
                                title={estaDesativado ? "Reativar Profissional" : "Desativar Acesso"}
                                className={`p-2 rounded-lg transition-colors ${estaDesativado ? 'bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-600 hover:text-white'}`}
                              >
                                {estaDesativado ? <UserCheck size={16} /> : <UserX size={16} />}
                              </button>

                              {/* Botão: Excluir */}
                              <button 
                                onClick={() => excluirProfissional(u.id, u.nome)}
                                title="Excluir Definitivamente"
                                className="p-2 bg-red-50 text-red-500 hover:bg-red-600 hover:text-white rounded-lg transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan="4" className="p-8 text-center text-slate-400 font-medium">
                          Nenhum profissional encontrado na base.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MODAL DE ATRIBUIÇÃO DE VÍNCULO */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-emerald-600 p-6 flex justify-between items-center text-white">
              <div>
                <h3 className="font-black text-xl">Atribuir Unidade</h3>
                <p className="text-emerald-100 text-sm">Profissional: {selectedUser.nome}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAtribuirVinculo} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Selecione o Hospital / Setor</label>
                <select name="unidadeIndex" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer font-medium">
                  {unidadesDisponiveis.map((uni, idx) => (
                    <option key={idx} value={idx}>
                      {uni.instituicaoNome} - {uni.unidadeNome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Cargo de Atuação nesta Unidade</label>
                <select name="cargoLocal" required defaultValue="" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer font-medium">
                  <option value="" disabled>Selecione o cargo do profissional...</option>
                  
                  {/* Equipe Médica */}
                  <option value="Médico">Médico (Plantonista/Diarista)</option>
                  <option value="Nefrologista">Nefrologista</option>
                  <option value="RT Médico">RT Médico (Coordenador)</option>
                  
                  {/* Equipe Assistencial Multi */}
                  <option value="Enfermeiro">Enfermeiro</option>
                  <option value="Téc. em Enf.">Téc. em Enf.</option>
                  <option value="Fisioterapeuta">Fisioterapeuta</option>
                  <option value="Nutricionista">Nutricionista</option>
                  <option value="Fonoaudiólogo">Fonoaudiólogo</option>
                  
                  {/* Chefias e Coordenações */}
                  <option value="Gerente de Enfermagem">Gerente de Enfermagem</option>
                  <option value="RT da Fisioterapia">RT da Fisioterapia</option>
                  <option value="CCIH UTI">CCIH UTI</option>
                  <option value="CCIH Geral">CCIH Geral</option>
                  
                  {/* Gestão e Administrativo */}
                  <option value="Diretor Administrativo">Diretor Administrativo</option>
                  <option value="Recepção">Recepção / Faturamento</option>
                  
                  {/* TI / Suporte */}
                  <option value="Desenvolvedor">Desenvolvedor do Sistema</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-2 font-medium">Este cargo define as abas e permissões de edição que o usuário terá ao acessar a referida unidade.</p>
              </div>

              <div className="pt-4 border-t border-slate-100 mt-2">
                <button 
                  type="submit" disabled={isUpdating}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {isUpdating ? <Loader2 size={20} className="animate-spin" /> : "Confirmar Liberação de Acesso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuloAdmin;