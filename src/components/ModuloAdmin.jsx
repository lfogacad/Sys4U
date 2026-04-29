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

  // Filtros da Tabela de Profissionais
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [filtroUnidade, setFiltroUnidade] = useState('Todas');

  // Unidades Físicas
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
      // 1. Atualiza a coleção 'profissionais' (Objeto complexo)
      const profRef = doc(db, "profissionais", selectedUser.id); 
      await updateDoc(profRef, {
        vinculos: arrayUnion(novoVinculo)
      });

      // 2. 🔍 PREPARAÇÃO DA BUSCA: Converte o conselho forçadamente para String (Texto)
      const conselhoString = String(selectedUser.numeroConselho);
      console.log("🔍 Procurando usuário na portaria com o Conselho:", conselhoString);

      const q = query(
        collection(db, "usuarios"), 
        where("numeroConselho", "==", conselhoString)
      );
      
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // ACHAOU O USUÁRIO NA PORTARIA!
        const userDoc = querySnapshot.docs[0];
        const userRef = doc(db, "usuarios", userDoc.id);
        
        // 💉 SUTURA CRÍTICA: Grava apenas o nome da unidade no array 'vinculos' para o App.jsx
        await updateDoc(userRef, {
          vinculos: arrayUnion(unidadeSelecionada.unidadeNome),
          perfil: cargoLocal
        });
        
        alert(`Vínculo e Acesso liberados com sucesso para ${selectedUser.nome}!`);
      } else {
        console.error("❌ Erro de Ligação: Usuário não achado na coleção 'usuarios'.");
        alert("O vínculo foi salvo no painel, mas não achamos o login dele para abrir a porta. Peça para ele fazer o cadastro inicial.");
      }

      setIsModalOpen(false);
      
    } catch (error) {
      console.error("Erro ao atualizar vínculo:", error);
      alert("Erro ao atribuir vínculo. Verifique o console.");
    } finally {
      setIsUpdating(false);
    }
  };

  // ------------------------------------------------------------------
  // 4. RENDERIZAÇÃO DA TELA
  // ------------------------------------------------------------------
  // Lógica de cruzamento de dados (Busca em Texto + Filtro Categoria + Filtro Unidade)
  const filteredUsers = profissionaisList.filter(u => {
    // 1. Busca por Texto (Nome, Conselho ou Categoria digitada)
    const matchBusca = 
      !searchTerm || 
      u.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.numeroConselho?.includes(searchTerm) ||
      u.categoria?.toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Filtro de Área de Atuação (Dropdown)
    const matchCategoria = filtroCategoria === 'Todas' || u.categoria === filtroCategoria;
    
    // 3. Filtro de Unidade (Dropdown) - CORRIGIDO PARA ARRAY DE OBJETOS
    const hasVinculos = u.vinculos && Array.isArray(u.vinculos) && u.vinculos.length > 0;
    
    // O ".some" entra na lista e verifica se o unidadeId bate com o filtro selecionado
    const matchUnidade = filtroUnidade === 'Todas' || (hasVinculos && u.vinculos.some(v => v.unidadeId === filtroUnidade));

    // O profissional só aparece se passar nas 3 regras
    return matchBusca && matchCategoria && matchUnidade;
  });

  // --- NOVAS FUNÇÕES DE GESTÃO ---

  const excluirProfissional = async (profissional) => {
    const { id, nome, numeroConselho } = profissional;

    if (window.confirm(`🚨 ATENÇÃO: Tem a certeza que deseja excluir DEFINITIVAMENTE o cadastro de ${nome}? \n\nIsso apagará o acesso e o histórico nas duas bases.`)) {
      try {
        setIsUpdating(true); // Se tiver esse state para loading

        // 1. 🗑️ Apaga da coleção 'profissionais'
        await deleteDoc(doc(db, "profissionais", id));
        console.log("✅ Removido da coleção profissionais");

        // 2. 🔍 Radar para achar e apagar na coleção 'usuarios' (Portaria)
        const conselhoString = String(numeroConselho);
        const q = query(
          collection(db, "usuarios"), 
          where("numeroConselho", "==", conselhoString)
        );
        
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userDocId = querySnapshot.docs[0].id;
          await deleteDoc(doc(db, "usuarios", userDocId));
          console.log("✅ Removido da coleção usuários");
        }

        alert(`${nome} foi removido com sucesso das bases de dados.`);
        
        // 3. 💡 Nota sobre o Authentication:
        alert("Nota: O acesso foi bloqueado no banco, mas por segurança, você deve apagar o e-mail manualmente no painel 'Authentication' do Firebase caso deseje liberar o e-mail para um novo cadastro.");

        // Recarregue sua lista aqui
        // fetchProfissionais();

      } catch (error) {
        console.error("Erro ao realizar exclusão total:", error);
        alert("Erro ao excluir profissional. Verifique o console.");
      } finally {
        setIsUpdating(false);
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
        
      </div>

      {/* LAYOUT PRINCIPAL: FORMULÁRIO (TOPO) + TABELA (EM BAIXO) */}
      <div className="flex flex-col gap-8">
        
        {/* ==========================================
            1. SEÇÃO DE CADASTRO (LARGURA TOTAL)
            ========================================== */}
        <form onSubmit={salvarProfissional} className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <UserPlus size={20} className="text-emerald-500" /> Cadastrar Novo Servidor
            </h3>
          </div>
          
          {/* Campos dispostos em linha (Grid de 4 colunas) para economizar espaço vertical */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Campo: Nome */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nome Completo</label>
              <input 
                type="text" required value={novoProfissional.nome}
                onChange={(e) => setNovoProfissional({...novoProfissional, nome: e.target.value.toUpperCase()})}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:border-emerald-500 outline-none transition-colors"
                placeholder=""
              />
            </div>

            {/* Campo: Área de Atuação */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Área de Atuação</label>
              <select 
                required 
                value={novoProfissional.categoria} onChange={handleCategoriaChange}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:border-emerald-500 outline-none cursor-pointer transition-colors"
              >
                <option value="" disabled>Selecione...</option>
                <option value="Médico">Médico</option>
                <option value="Enfermeiro">Enfermeiro</option>
                <option value="Téc. Enfermagem">Téc. Enfermagem</option>
                <option value="Fisioterapeuta">Fisioterapeuta</option>
                <option value="Nutricionista">Nutricionista</option>
                <option value="Fonoaudiólogo">Fonoaudiólogo</option>
                <option value="Administrativo">Administrativo</option>
              </select>
            </div>

            {/* Campo: Registro */}
            <div className="relative">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{novoProfissional.conselho || 'Registro'}</label>
              <input 
                type="number" required value={novoProfissional.numeroConselho}
                onChange={(e) => setNovoProfissional({...novoProfissional, numeroConselho: e.target.value})}
                onBlur={handleBlurConselho}
                className={`w-full p-3 bg-slate-50 border ${erroConselho ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-emerald-500'} rounded-xl text-sm font-bold outline-none transition-colors`}
                placeholder="Somente Números"
              />
              {erroConselho && (
                <p className="absolute -bottom-5 left-0 text-[10px] font-bold text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> {erroConselho}
                </p>
              )}
            </div>

            {/* Campo: Contrato */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Vínculo Contratual</label>
              <select 
                value={novoProfissional.vinculo} onChange={(e) => setNovoProfissional({...novoProfissional, vinculo: e.target.value})}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:border-emerald-500 outline-none cursor-pointer transition-colors"
              >
                <option value="PJ">PJ</option>
                <option value="CLT">CLT</option>
                <option value="Efetivo">Efetivo</option>
              </select>
            </div>
            
          </div>

          {/* Botão de Salvar posicionado à direita para dar um ar mais limpo */}
          <div className="mt-6 flex justify-end border-t border-slate-100 pt-6">
            <button 
              type="submit" disabled={isSalvandoProfissional || !!erroConselho}
              className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all disabled:opacity-50 min-w-[200px]"
            >
              {isSalvandoProfissional ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
              {isSalvandoProfissional ? 'A guardar...' : 'Salvar na Base'}
            </button>
          </div>
        </form>

        {/* ==========================================
            2. SEÇÃO DA TABELA E FILTROS
            ========================================== */}
        <div className="flex flex-col gap-4">
          
          {/* BARRA DE FILTROS SUPERIOR (AGORA COM BUSCA INTEGRADA) */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col xl:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 w-full flex-wrap items-center">
              
              {/* Filtro de Categoria / Área de Atuação */}
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden md:block">Área de Atuação:</label>
                <select 
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 cursor-pointer min-w-[170px] transition-colors hover:bg-slate-100"
                >
                  <option value="Todas">Todas as Áreas</option>
                  <option value="Médico">Médico</option>
                  <option value="Enfermeiro">Enfermeiro</option>
                  <option value="Téc. Enfermagem">Téc. Enfermagem</option>
                  <option value="Fisioterapeuta">Fisioterapeuta</option>
                  <option value="Fonoaudiólogo">Fonoaudiólogo</option>
                  <option value="Nutricionista">Nutricionista</option>
                  <option value="Administrador">Administrador (Gestão)</option>
                </select>
              </div>

              {/* Filtro de Unidade / Vínculo */}
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden md:block">Vínculo / UTI:</label>
                <select 
                  value={filtroUnidade}
                  onChange={(e) => setFiltroUnidade(e.target.value)}
                  className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 cursor-pointer min-w-[170px] transition-colors hover:bg-slate-100"
                >
                  <option value="Todas">Todas as Unidades</option>
                  <option value="uti_01">UTI Adulto (HMA)</option>
                  <option value="uti_municipal">UTI Municipal de Ariquemes</option>
                </select>
              </div>

              {/* NOVO: Campo de Busca de Texto Integrado */}
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Buscar por nome ou conselho..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-emerald-500 outline-none transition-colors"
                />
              </div>
              
            </div>
            
            {/* Resumo Rápido do Filtro */}
            <div className="text-xs font-bold text-slate-400 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 whitespace-nowrap ml-auto">
              Mostrando: <span className="text-slate-800 text-sm">{filteredUsers.length}</span> registros
            </div>
          </div>

          {/* TABELA DE GERENCIAMENTO */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            {isLoading ? (
              <div className="p-16 flex flex-col items-center justify-center text-slate-400">
                <Loader2 size={40} className="animate-spin mb-4 text-emerald-500" />
                <p className="font-bold">Carregando base de profissionais...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                      <th className="p-4 md:px-6 font-bold">Profissional</th>
                      <th className="p-4 md:px-6 font-bold">Registro / Vínculo</th>
                      <th className="p-4 md:px-6 font-bold">Status de Atuação</th>
                      <th className="p-4 md:px-6 font-bold text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => {
                      const hasVinculo = u.vinculos && u.vinculos.length > 0;
                      const isSuperAdmin = u.categoria === "Administrador"; 
                      const estaDesativado = u.ativo === false; 

                      return (
                        <tr key={u.id} className={`transition-colors ${estaDesativado ? 'bg-slate-50 opacity-60 grayscale-[0.5]' : 'hover:bg-slate-50'}`}>
                          <td className="p-4 md:px-6">
                            <div className={`font-bold ${estaDesativado ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{u.nome}</div>
                            <div className="text-xs font-bold text-emerald-600 uppercase mt-0.5">{u.categoria}</div>
                          </td>
                          <td className="p-4 md:px-6">
                            <div className="font-mono text-sm text-slate-600 font-medium">
                              {u.conselho} {u.numeroConselho}
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                              CONTRATO: {u.vinculo || 'N/A'}
                            </div>
                          </td>
                          <td className="p-4 md:px-6">
                            {estaDesativado ? (
                               <div className="flex items-center gap-1.5 text-red-500 font-bold text-xs bg-red-50 inline-flex px-2 py-1 rounded-md">
                                 <UserX size={14} /> Conta Inativa
                               </div>
                            ) : isSuperAdmin ? (
                              <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs bg-emerald-50 inline-flex px-2 py-1 rounded-md">
                                <ShieldCheck size={14} /> Acesso Global
                              </div>
                            ) : hasVinculo ? (
                              <div className="text-xs font-bold text-blue-600 bg-blue-50 inline-flex px-2 py-1 rounded-md">
                                {u.vinculos.length} unidade(s)
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs bg-amber-50 inline-flex px-2 py-1 rounded-md">
                                <AlertCircle size={14} /> Pendente (Sem Unidade)
                              </div>
                            )}
                          </td>
                          <td className="p-4 md:px-6">
                            <div className="flex items-center justify-center gap-2">
                              {/* Botões de Ação */}
                              <button 
                                onClick={() => openModal(u)}
                                title={hasVinculo ? "Gerenciar Vínculos" : "Atribuir Unidade"}
                                className={`p-2.5 rounded-xl transition-colors ${hasVinculo ? 'bg-slate-100 text-slate-600 hover:bg-slate-800 hover:text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'}`}
                              >
                                {hasVinculo ? <Settings size={18} /> : <Plus size={18} />}
                              </button>

                              <button 
                                onClick={() => toggleStatusProfissional(u.id, u.nome, u.ativo)}
                                title={estaDesativado ? "Reativar Profissional" : "Desativar Acesso"}
                                className={`p-2.5 rounded-xl transition-colors ${estaDesativado ? 'bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-600 hover:text-white'}`}
                              >
                                {estaDesativado ? <UserCheck size={18} /> : <UserX size={18} />}
                              </button>

                              <button 
                                onClick={() => excluirProfissional(u)}
                                title="Excluir Definitivamente"
                                className="p-2.5 bg-red-50 text-red-500 hover:bg-red-600 hover:text-white rounded-xl transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan="4" className="p-12 text-center text-slate-400 font-medium bg-slate-50/50">
                          Nenhum profissional encontrado com os filtros atuais.
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