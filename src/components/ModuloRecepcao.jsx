import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { ArrowLeft, Activity, Search, Loader2, UserPlus, CheckCircle, AlertTriangle } from "lucide-react";
import { formatarDataBR } from "../utils/core"; 

const ModuloRecepcao = ({ userProfile, unidadeAtiva }) => {
  const navigate = useNavigate();
  
  // Estados da Busca
  const [cpf, setCpf] = useState('');
  const [status, setStatus] = useState('idle'); 
  const [patient, setPatient] = useState(null);

  // Estados do Cadastro
  const [view, setView] = useState('search'); 
  const [formData, setFormData] = useState({
    cpf: '', cns: '', passaporte: '', nome: '', nomeSocial: '', dataNascimento: '',
    sexo: '', identidadeGenero: '', nomeMae: '', nomePai: '',
    nacionalidade: 'Brasileira', naturalidade: '', estadoCivil: '', conjuge: '',
    grauInstrucao: '', profissao: '', cor: '', religiao: '',
    telefone: '', telefoneContatos: '', endereco: '', responsavelLegal: '', alergias: ''
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (cpf.length < 11) return alert("Digite um CPF válido (somente números)");
    setStatus('searching');

    // Simulando busca (Pode conectar ao Firebase para buscar paciente existente)
    setTimeout(() => {
      if (cpf === '12345678900') {
        setPatient({ nome: 'João da Silva', nascimento: '1980-05-15', cpf: '12345678900' });
        setStatus('found');
      } else {
        setStatus('not_found');
      }
    }, 1000);
  };

  const handleOpenRegister = () => {
    setFormData(prev => ({ ...prev, cpf: cpf }));
    setView('register');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSavePatient = async (e) => {
    e.preventDefault();
  
    const perfisAutorizados = ["Médico", "Enfermeiro", "Recepcionista", "Administrador", "Gestor"];
    if (!perfisAutorizados.includes(userProfile?.perfil || userProfile?.role)) {
      return alert("Acesso Negado: Perfil sem permissão para cadastro.");
    }
  
    if (!formData.nome || !formData.cpf) {
      return alert("Nome e CPF são obrigatórios para abrir o prontuário.");
    }
  
    try {
      setStatus('searching'); 
  
      const q = query(collection(db, "pacientes"), where("cpf", "==", formData.cpf));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setStatus('idle');
        return alert("Atenção: Este CPF já possui cadastro ativo no sistema.");
      }
  
      const docRef = await addDoc(collection(db, "pacientes"), {
        ...formData,
        status: "Ativo",
        cadastradoPor: userProfile.nome || userProfile.name,
        dataCriacao: serverTimestamp()
      });
  
      await addDoc(collection(db, "logs"), {
        acao: `Cadastro: Novo paciente ${formData.nome}`,
        conselho: userProfile.conselho || "N/A",
        data: new Date().toISOString(),
        perfil: userProfile.perfil || userProfile.role,
        usuario: userProfile.nome || userProfile.name,
        pacienteId: docRef.id
      });
  
      alert("Paciente cadastrado com sucesso!");
  
      setPatient({ ...formData, id: docRef.id });
      setStatus('found');
      setView('search');
  
    } catch (error) {
      console.error("Erro na operação:", error);
      alert("Erro ao conectar com o banco de dados.");
      setStatus('idle');
    }
  };

  // ==========================================
  // TELA DE CADASTRO (Restaurada na íntegra)
  // ==========================================
  if (view === 'register') {
    return (
      <div className="min-h-screen bg-slate-50 p-6 pb-20">
        <div className="max-w-5xl mx-auto">
          {/* Cabeçalho do Cadastro */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button onClick={() => setView('search')} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors">
                <ArrowLeft size={20} className="text-slate-600" />
              </button>
              <div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <UserPlus className="text-emerald-500" /> Cadastro de Paciente
                </h2>
                <p className="text-sm text-slate-500">Preencha os dados demográficos e clínicos básicos.</p>
              </div>
            </div>
            <button onClick={handleSavePatient} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-colors">
              <CheckCircle size={18} /> Salvar Ficha
            </button>
          </div>

          {/* O Formulário Completo */}
          <form className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-8" onSubmit={handleSavePatient}>
            
            {/* Bloco 1: Identificação Básica */}
            <div>
              <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">1. Identificação</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nome Completo *</label>
                  <input type="text" name="nome" value={formData.nome} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 uppercase" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nome Social</label>
                  <input type="text" name="nomeSocial" value={formData.nomeSocial} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">CPF *</label>
                  <input type="text" name="cpf" value={formData.cpf} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Cartão SUS (CNS)</label>
                  <input type="text" name="cns" value={formData.cns} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Passaporte (Estrangeiro)</label>
                  <input type="text" name="passaporte" value={formData.passaporte} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Data de Nascimento *</label>
                  <input type="date" name="dataNascimento" value={formData.dataNascimento} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-700" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Sexo *</label>
                  <select name="sexo" value={formData.sexo} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-700" required>
                    <option value="">Selecione...</option>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Identidade de Gênero</label>
                  <input type="text" name="identidadeGenero" value={formData.identidadeGenero} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500" />
                </div>
              </div>
            </div>

            {/* Bloco 2: Filiação e Demografia */}
            <div>
              <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">2. Demografia e Filiação</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nome da Mãe</label>
                  <input type="text" name="nomeMae" value={formData.nomeMae} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 uppercase" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nome do Pai</label>
                  <input type="text" name="nomePai" value={formData.nomePai} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Cor/Raça</label>
                  <select name="cor" value={formData.cor} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-700">
                    <option value="">Selecione...</option>
                    <option value="Branca">Branca</option><option value="Preta">Preta</option>
                    <option value="Parda">Parda</option><option value="Amarela">Amarela</option><option value="Indígena">Indígena</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nacionalidade</label>
                  <input type="text" name="nacionalidade" value={formData.nacionalidade} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Naturalidade (Cidade/UF)</label>
                  <input type="text" name="naturalidade" value={formData.naturalidade} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Estado Civil</label>
                  <select name="estadoCivil" value={formData.estadoCivil} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-700">
                    <option value="">Selecione...</option>
                    <option value="Solteiro(a)">Solteiro(a)</option><option value="Casado(a)">Casado(a)</option>
                    <option value="Divorciado(a)">Divorciado(a)</option><option value="Viúvo(a)">Viúvo(a)</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Cônjuge</label>
                  <input type="text" name="conjuge" value={formData.conjuge} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Grau de Instrução</label>
                  <input type="text" name="grauInstrucao" value={formData.grauInstrucao} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Religião</label>
                  <input type="text" name="religiao" value={formData.religiao} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Profissão</label>
                  <input type="text" name="profissao" value={formData.profissao} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 uppercase" />
                </div>
              </div>
            </div>

            {/* Bloco 3: Contato e Endereço */}
            <div>
              <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">3. Contato e Responsável</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Telefone do Paciente</label>
                  <input type="text" name="telefone" value={formData.telefone} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500" placeholder="(  ) _____-____" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Telefone de Contatos (Familiares)</label>
                  <input type="text" name="telefoneContatos" value={formData.telefoneContatos} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Endereço Atual Completo</label>
                  <input type="text" name="endereco" value={formData.endereco} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Responsável Legal</label>
                  <input type="text" name="responsavelLegal" value={formData.responsavelLegal} onChange={handleInputChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 uppercase" />
                </div>
              </div>
            </div>

            {/* Bloco 4: Dados Clínicos Críticos */}
            <div>
              <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider mb-4 border-b border-red-100 pb-2 flex items-center gap-2">
                <AlertTriangle size={16} /> 4. Alertas Clínicos
              </h3>
              <div>
                <label className="block text-xs font-bold text-red-500 mb-1">Alergias Relatadas</label>
                <textarea name="alergias" value={formData.alergias} onChange={handleInputChange} rows="2" className="w-full p-3 bg-red-50 border border-red-200 rounded-xl outline-none focus:border-red-500 text-red-700" placeholder="Ex: Dipirona, Penicilina, Iodo (Deixe em branco se negar)" />
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // TELA DE BUSCA
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/hub')} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Activity className="text-emerald-500" /> Recepção e Admissão
          </h2>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">
          <h3 className="font-bold text-slate-700 mb-4 text-lg">Buscar Paciente</h3>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <input type="text" placeholder="Digite o CPF (somente números)" className="flex-1 p-4 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-lg font-mono tracking-widest" value={cpf} onChange={(e) => setCpf(e.target.value.replace(/\D/g, ''))} maxLength="11" />
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
              <Search size={20} /> Buscar
            </button>
          </form>
        </div>

        {status === 'searching' && (
          <div className="text-center text-slate-500 py-10 animate-pulse font-bold flex flex-col items-center">
            <Loader2 className="animate-spin text-emerald-500 mb-2" size={32} /> Consultando banco de dados...
          </div>
        )}

        {status === 'found' && patient && (
          <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Paciente Encontrado</p>
              <h4 className="text-2xl font-black text-slate-800">{patient.nome}</h4>
              <p className="text-sm text-slate-600 mt-1">Data Nasc: <b>{patient.nascimento ? formatarDataBR(patient.nascimento) : "-"}</b> | CPF: <b>{patient.cpf}</b></p>
            </div>
            <button onClick={() => navigate('/uti', { state: { incomingPatient: patient } })} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-sm transition-colors w-full sm:w-auto">
              Iniciar Internação
            </button>
          </div>
        )}

        {status === 'not_found' && (
          <div className="bg-white p-10 rounded-2xl shadow-sm border border-dashed border-slate-300 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <UserPlus size={32} />
            </div>
            <h4 className="text-lg font-bold text-slate-800 mb-2">Paciente não localizado</h4>
            <p className="text-sm text-slate-500 mb-6">Não há registros para o CPF <b>{cpf}</b>.</p>
            <button onClick={handleOpenRegister} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 mx-auto transition-colors">
              <UserPlus size={20} /> Cadastrar Novo Paciente
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModuloRecepcao;