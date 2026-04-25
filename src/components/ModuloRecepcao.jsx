import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, setDoc, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { ArrowLeft, Activity, Search, Loader2, UserPlus, CheckCircle, AlertTriangle, Send } from "lucide-react";
import { formatarDataBR } from "../utils/core";

const ModuloRecepcao = ({ userProfile }) => {
  const navigate = useNavigate();
  
  const [cpf, setCpf] = useState('');
  const [status, setStatus] = useState('idle'); 
  const [patient, setPatient] = useState(null);
  const [view, setView] = useState('search'); 

  // Modal de Encaminhamento
  const [showSectorModal, setShowSectorModal] = useState(false);
  const [setorDestino, setSetorDestino] = useState('');
  const [isForwarding, setIsForwarding] = useState(false);

  const [formData, setFormData] = useState({
    cpf: '', cns: '', passaporte: '', nome: '', nomeSocial: '', dataNascimento: '',
    sexo: '', identidadeGenero: '', nomeMae: '', nomePai: '',
    nacionalidade: 'Brasileira', naturalidade: '', estadoCivil: '', conjuge: '',
    grauInstrucao: '', profissao: '', cor: '', religiao: '',
    telefone: '', telefoneContatos: '', endereco: '', responsavelLegal: '', alergias: ''
  });

  const handleSearch = async (e) => {
    e.preventDefault();
    if (cpf.length < 11) return alert("Digite um CPF válido (somente números)");
    setStatus('searching');

    try {
      // 1. Busca o cadastro base
      const q = query(collection(db, "pacientes"), where("cpf", "==", cpf));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docData = querySnapshot.docs[0].data();
        const foundPatient = { ...docData, id: querySnapshot.docs[0].id };

        // 2. TRIAGEM DE SEGURANÇA: Verifica se ele já está internado ou na fila
        const qLeitos = query(collection(db, "leitos_uti"), where("cpf", "==", cpf));
        const qFila = query(collection(db, "fila_espera"), where("cpf", "==", cpf), where("status", "==", "aguardando"));
        
        const [leitosSnap, filaSnap] = await Promise.all([
          getDocs(qLeitos),
          getDocs(qFila)
        ]);

        if (!leitosSnap.empty || !filaSnap.empty) {
          // PACIENTE JÁ ESTÁ NO SISTEMA ATIVO
          setPatient(foundPatient);
          setStatus('already_admitted'); 
          return;
        }

        // Paciente livre para internar
        setPatient(foundPatient);
        setStatus('found');
      } else {
        setStatus('not_found');
      }
    } catch (error) {
      console.error("Erro ao buscar:", error);
      alert("Erro ao consultar o banco de dados.");
      setStatus('idle');
    }
  };

  const handleOpenRegister = (isEditing = false) => {
    if (isEditing && patient) {
      setFormData(patient); // Preenche a ficha com os dados do paciente achado
    } else {
      setFormData(prev => ({ ...prev, cpf: cpf })); // Novo cadastro
      setPatient(null);
    }
    setView('register');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Salva a ficha E abre o modal para escolher o setor
  const handleSaveAndPrepareForward = async (e) => {
    e.preventDefault();
    if (!formData.nome || !formData.cpf) return alert("Nome e CPF são obrigatórios.");
    
    try {
      let currentPatientId = patient?.id;

      // Se NÃO tem ID, é um paciente novo. Salva no banco.
      if (!currentPatientId) {
        const docRef = await addDoc(collection(db, "pacientes"), {
          ...formData, status: "Ativo", cadastradoPor: userProfile.nome || "Admin", dataCriacao: serverTimestamp()
        });
        currentPatientId = docRef.id;
        setPatient({ ...formData, id: currentPatientId });
      } else {
        // Se já tem ID, só atualiza os dados dele (edição)
        await updateDoc(doc(db, "pacientes", currentPatientId), formData);
        setPatient({ ...formData, id: currentPatientId });
      }

      // Tudo salvo, agora pergunta o setor!
      setShowSectorModal(true);

    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar a ficha do paciente.");
    }
  };

  // Envia para a Sala de Espera da UTI/PS/Enfermaria
  const handleConfirmForward = async () => {
    if (!setorDestino) return alert("Selecione um setor de destino!");
    setIsForwarding(true);

    try {
        // Usar setDoc com o ID do paciente garante que ele tenha apenas UMA vaga na fila
        await setDoc(doc(db, "fila_espera", patient.id), {
          pacienteId: patient.id,
          nome: formData.nome,
          cpf: formData.cpf,
          dataNascimento: formData.dataNascimento,
          sexo: formData.sexo,
          origem: "Recepção",
          setorDestino: setorDestino,
          status: "aguardando",
          encaminhadoPor: userProfile.nome || "Admin",
          timestamp: serverTimestamp()
        });
  
        alert(`Paciente encaminhado para a Sala de Espera da ${setorDestino} com sucesso!`);
      
      // Limpa a tela para o próximo paciente
      setShowSectorModal(false);
      setView('search');
      setCpf('');
      setPatient(null);
      setStatus('idle');
      setSetorDestino('');

    } catch (error) {
      console.error("Erro ao encaminhar:", error);
      alert("Erro ao encaminhar paciente.");
    } finally {
      setIsForwarding(false);
    }
  };

  // ==========================================
  // TELA DE CADASTRO E REVISÃO
  // ==========================================
  if (view === 'register') {
    return (
      <div className="min-h-screen bg-slate-50 p-6 pb-20 relative">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button onClick={() => setView('search')} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors">
                <ArrowLeft size={20} className="text-slate-600" />
              </button>
              <div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <UserPlus className="text-emerald-500" /> {patient?.id ? "Revisão de Ficha Cadastral" : "Novo Cadastro"}
                </h2>
                <p className="text-sm text-slate-500">Revise os dados e encaminhe para o setor de internação.</p>
              </div>
            </div>
            <button onClick={handleSaveAndPrepareForward} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-colors">
              <Send size={18} /> Salvar e Encaminhar
            </button>
          </div>

          {/* O Formulário Completo */}
          <form className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-8" onSubmit={handleSaveAndPrepareForward}>
            
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

        {/* MODAL DE ESCOLHA DO SETOR */}
        {showSectorModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-bold text-slate-800 mb-2">Encaminhar Paciente</h3>
              <p className="text-slate-500 text-sm mb-6">Para qual setor o paciente <b>{formData.nome}</b> será enviado?</p>
              
              <div className="space-y-3 mb-6">
                {['UTI'].map(setor => (
                  <button 
                    key={setor} 
                    onClick={() => setSetorDestino(setor)} 
                    className={`w-full p-4 rounded-xl font-bold border-2 transition-all text-left flex justify-between items-center ${setorDestino === setor ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:border-emerald-200 bg-white text-slate-600'}`}
                  >
                    {setor} {setorDestino === setor && <CheckCircle size={20} className="text-emerald-500" />}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowSectorModal(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl">Cancelar</button>
                <button onClick={handleConfirmForward} disabled={!setorDestino || isForwarding} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                  {isForwarding ? <Loader2 className="animate-spin" size={20} /> : "Encaminhar"}
                </button>
              </div>
            </div>
          </div>
        )}
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
            <input type="text" placeholder="Digite o CPF" className="flex-1 p-4 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-emerald-500 text-lg font-mono tracking-widest" value={cpf} onChange={(e) => setCpf(e.target.value.replace(/\D/g, ''))} maxLength="11" />
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2">
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
          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase mb-1">Paciente Localizado</p>
              <h4 className="text-2xl font-black text-slate-800">{patient.nome}</h4>
              <p className="text-sm text-slate-600 mt-1">Data Nasc: <b>{patient.dataNascimento ? formatarDataBR(patient.dataNascimento) : "-"}</b> | CPF: <b>{patient.cpf}</b></p>
            </div>
            <button onClick={() => handleOpenRegister(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-sm transition-colors w-full sm:w-auto">
              Revisar Ficha e Internar
            </button>
          </div>
        )}

        {/* AVISO DE PACIENTE JÁ INTERNADO */}
        {status === 'already_admitted' && patient && (
          <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-4">
              <div className="bg-amber-100 p-3 rounded-full text-amber-600">
                <AlertTriangle size={32} />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-600 uppercase mb-1">Internação Ativa Detectada</p>
                <h4 className="text-2xl font-black text-slate-800">{patient.nome}</h4>
                <p className="text-sm text-slate-600 mt-1">Este paciente já consta como <b>Internado</b> ou na <b>Fila de Espera</b>.</p>
              </div>
            </div>
            <div className="bg-amber-100 text-amber-700 px-6 py-3 rounded-xl font-bold border border-amber-200">
               Ação Bloqueada
            </div>
          </div>
        )}

        {status === 'not_found' && (
          <div className="bg-white p-10 rounded-2xl shadow-sm border border-dashed border-slate-300 text-center">
            <h4 className="text-lg font-bold text-slate-800 mb-2">Paciente não localizado</h4>
            <p className="text-sm text-slate-500 mb-6">Não há registros para o CPF <b>{cpf}</b>.</p>
            <button onClick={() => handleOpenRegister(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 mx-auto transition-colors">
              <UserPlus size={20} /> Iniciar Novo Cadastro
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModuloRecepcao;