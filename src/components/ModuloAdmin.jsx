import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import { Users, Search, ShieldCheck, AlertCircle, ArrowLeft, Loader2, Plus, X } from 'lucide-react';

const ModuloAdmin = ({ userProfile }) => {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estados para o Modal de Vínculo
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Simulação das Unidades Físicas do seu Ecossistema
  // No futuro, isso pode vir de uma coleção "unidades" no Firestore
  const unidadesDisponiveis = [
    { instituicaoId: "hosp_municipal", instituicaoNome: "Hospital Municipal", unidadeId: "uti_01", unidadeNome: "UTI Adulto" },
    { instituicaoId: "hosp_municipal", instituicaoNome: "Hospital Municipal", unidadeId: "recepcao", unidadeNome: "Recepção Central" },
    { instituicaoId: "samu_regional", instituicaoNome: "SAMU", unidadeId: "base_alfa", unidadeNome: "Base Alfa" }
  ];

  const fetchUsuarios = async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "usuarios"));
      const lista = [];
      querySnapshot.forEach((doc) => {
        lista.push({ id: doc.id, ...doc.data() });
      });
      // Ordenar: Pendentes (sem vínculo) primeiro
      lista.sort((a, b) => (a.vinculos?.length || 0) - (b.vinculos?.length || 0));
      setUsuarios(lista);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      alert("Erro ao carregar a lista de profissionais.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const openModal = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleAtribuirVinculo = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    
    // Pegar os dados do form
    const formData = new FormData(e.target);
    const unidadeIndex = formData.get("unidadeIndex");
    const cargoLocal = formData.get("cargoLocal");
    
    const unidadeSelecionada = unidadesDisponiveis[unidadeIndex];
    
    const novoVinculo = {
      ...unidadeSelecionada,
      perfil: cargoLocal // Ex: "Médico Plantonista"
    };

    try {
      const userRef = doc(db, "usuarios", selectedUser.id);
      await updateDoc(userRef, {
        vinculos: arrayUnion(novoVinculo)
      });
      
      alert(`Vínculo adicionado com sucesso para ${selectedUser.nome}!`);
      setIsModalOpen(false);
      fetchUsuarios(); // Recarrega a lista para mostrar a mudança
    } catch (error) {
      console.error("Erro ao atualizar vínculo:", error);
      alert("Erro ao atribuir vínculo.");
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredUsers = usuarios.filter(u => 
    u.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto">
      {/* Cabeçalho do Módulo */}
      <div className="flex flex-col md:flex-row md:items-start justify-end mb-6 gap-4">
        
        {/* LADO DIREITO: Barra de Pesquisa */}
        <div className="relative w-full md:w-72 md:mt-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar profissional..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
          />
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400">
            <Loader2 size={40} className="animate-spin mb-4 text-emerald-500" />
            <p className="font-bold">Carregando prontuários do RH...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm uppercase tracking-wider">
                  <th className="p-4 font-bold">Profissional</th>
                  <th className="p-4 font-bold">Cargo Global</th>
                  <th className="p-4 font-bold">Status de Acesso</th>
                  <th className="p-4 font-bold text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const hasVinculo = u.vinculos && u.vinculos.length > 0;
                  const isAdmin = u.perfil === "Administrador";

                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{u.nome}</div>
                        <div className="text-xs text-slate-500">{u.email} • {u.numeroConselho}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${isAdmin ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          {u.perfil}
                        </span>
                      </td>
                      <td className="p-4">
                        {isAdmin ? (
                          <div className="flex items-center gap-1 text-emerald-600 font-bold text-sm">
                            <ShieldCheck size={16} /> Passe Livre (Admin)
                          </div>
                        ) : hasVinculo ? (
                          <div className="text-sm font-medium text-slate-600">
                            {u.vinculos.length} unidade(s) vinculada(s)
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                            <AlertCircle size={16} /> Pendente (Sem Acesso)
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => openModal(u)}
                          className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors inline-flex items-center gap-2 font-bold text-sm"
                        >
                          <Plus size={16} /> Vínculos
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE ATRIBUIÇÃO DE VÍNCULO */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-emerald-600 p-6 flex justify-between items-center text-white">
              <div>
                <h3 className="font-black text-xl">Atribuir Unidade</h3>
                <p className="text-emerald-100 text-sm">Dr(a). {selectedUser.nome}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAtribuirVinculo} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Selecione o Hospital / Setor</label>
                <select name="unidadeIndex" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none">
                  {unidadesDisponiveis.map((uni, idx) => (
                    <option key={idx} value={idx}>
                      {uni.instituicaoNome} - {uni.unidadeNome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Cargo de Atuação nesta Unidade</label>
                <select name="cargoLocal" required defaultValue="" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none">
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
                <p className="text-[10px] text-slate-500 mt-1">Este cargo define as abas e permissões de edição que o usuário terá ao acessar a unidade.</p>
              </div>

              <div className="pt-4 border-t border-slate-100">
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