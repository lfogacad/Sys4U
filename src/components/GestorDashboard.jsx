import React, { useState, useEffect } from 'react';
import { 
  BarChart2, ShieldAlert, FileCheck, Users, AlertTriangle, CheckCircle, Settings, CalendarDays, 
  ArrowLeft, Activity, Calendar, TrendingUp, AlertCircle, Clock, UserCheck, UserPlus, Plus, Shield, 
  Bed, Save, Bell, Calculator, Loader2 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { collection, addDoc, getDocs, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../config/firebase";
import ModuloAdmin from './ModuloAdmin';
import ImportadorEscala from './ImportadorEscala';

const GestorDashboard = ({ userProfile }) => {
  // Controle de navegação da tela (hub, indicadores, qualidade, auditoria, equipe)
  const [activeView, setActiveView] = useState('hub');
  const [subViewEquipe, setSubViewEquipe] = useState('menu');
  const [isLoading, setIsLoading] = useState(false);
  const [categoriaAtiva, setCategoriaAtiva] = useState('Médico');
  const [modoVisao, setModoVisao] = useState('dia');
  const [dataSelecionada, setDataSelecionada] = useState(new Date().toISOString().split('T')[0]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [plantaoEditado, setPlantaoEditado] = useState(null);
  const [novoPlantonista, setNovoPlantonista] = useState("");
  // Controles do Modal de Vínculos
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  // Controles dos dados recebidos da base de dados
  const [plantoesDoDia, setPlantoesDoDia] = useState([]);
  const [isLoadingPlantoes, setIsLoadingPlantoes] = useState(false);
  const [plantoesDoMes, setPlantoesDoMes] = useState({});
  const [isLoadingMes, setIsLoadingMes] = useState(false);
  const [consolidadoDia, setConsolidadoDia] = useState({});
  // Controlos do Cadastro de Profissionais
  const [novoProfissional, setNovoProfissional] = useState({
    nome: '',
    categoria: 'Médico',
    conselho: 'CRM',
    numeroConselho: '',
    vinculo: 'PJ', // PJ, CLT, Efetivo
    telefone: ''
  });
  const [erroConselho, setErroConselho] = useState('');
  const [isSalvandoProfissional, setIsSalvandoProfissional] = useState(false);
  const [listaProfissionais, setListaProfissionais] = useState([]);

  // Fica a "ouvir" a coleção profissionais em tempo real
  useEffect(() => {
    if (subViewEquipe === 'cadastro') {
      const q = query(collection(db, "profissionais"), orderBy("nome", "asc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const dados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setListaProfissionais(dados);
      });
      return () => unsubscribe();
    }
  }, [subViewEquipe]);

  // --- LÓGICA DE CADASTRO DE PROFISSIONAIS ---

  // 1. Muda o conselho automaticamente de acordo com a categoria
  const handleCategoriaChange = (e) => {
    const cat = e.target.value;
    let conselhoPadrao = 'Outro';
    if (cat === 'Médico') conselhoPadrao = 'CRM';
    if (cat === 'Enfermeiro' || cat === 'Téc. Enfermagem') conselhoPadrao = 'COREN';
    if (cat === 'Fisioterapeuta') conselhoPadrao = 'CREFITO';
    if (cat === 'Nutricionista') conselhoPadrao = 'CRN';
    if (cat === 'Fonoaudiólogo') conselhoPadrao = 'CREFONO';

    setNovoProfissional({ ...novoProfissional, categoria: cat, conselho: conselhoPadrao });
  };

  // 2. Verifica duplicidade de CRM/COREN ao sair do campo
  const handleBlurConselho = async () => {
    if (!novoProfissional.numeroConselho) {
      setErroConselho('');
      return;
    }
    
    try {
      const q = query(
        collection(db, "profissionais"), 
        where("numeroConselho", "==", novoProfissional.numeroConselho)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        setErroConselho(`Atenção: Este ${novoProfissional.conselho} já está cadastrado!`);
      } else {
        setErroConselho('');
      }
    } catch (error) {
      console.error("Erro ao verificar conselho:", error);
    }
  };

  // 3. A FUNÇÃO QUE ESTAVA A FALTAR: Salva no Firebase
  const salvarProfissional = async (e) => {
    e.preventDefault(); 
    if (erroConselho) return;

    setIsSalvandoProfissional(true);
    try {
      // Grava na coleção "profissionais" para consulta do Primeiro Acesso
      await addDoc(collection(db, "profissionais"), {
        ...novoProfissional,
        cadastradoEm: new Date().toISOString(),
        status: 'Ativo'
      });
      
      alert(`✅ Sucesso! ${novoProfissional.nome} agora faz parte da base oficial.`);
      
      // Limpa os campos para o próximo cadastro
      setNovoProfissional({ nome: '', categoria: 'Médico', conselho: 'CRM', numeroConselho: '', vinculo: 'PJ', telefone: '' });
      setSubViewEquipe('menu'); // Volta para o menu automaticamente
    } catch (error) {
      console.error("Erro ao salvar profissional:", error);
      alert("❌ Erro ao salvar na base de dados.");
    } finally {
      setIsSalvandoProfissional(false);
    }
  };
  
  // Este "useEffect" dispara automaticamente sempre que o senhor muda a data ou a aba
  useEffect(() => {
    if (subViewEquipe !== 'escalas' || modoVisao !== 'dia') return;

    const buscarDados = async () => {
      setIsLoadingPlantoes(true);
      try {
        let q;
        if (categoriaAtiva === 'Visão Geral') {
          // Busca TUDO do dia para todas as categorias
          q = query(collection(db, "escalas"), where("data", "==", dataSelecionada));
        } else {
          // Busca apenas a categoria selecionada
          q = query(
            collection(db, "escalas"),
            where("data", "==", dataSelecionada),
            where("categoria", "==", categoriaAtiva)
          );
        }
        
        const querySnapshot = await getDocs(q);
        const resultados = [];
        const agrupadoGeral = {};

        querySnapshot.forEach((doc) => {
          const dados = { id: doc.id, ...doc.data() };
          resultados.push(dados);
          
          // Organiza para a Visão Geral
          if (!agrupadoGeral[dados.categoria]) agrupadoGeral[dados.categoria] = [];
          agrupadoGeral[dados.categoria].push(dados);
        });
        
        setPlantoesDoDia(resultados);
        setConsolidadoDia(agrupadoGeral);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        setIsLoadingPlantoes(false);
      }
    };

    buscarDados();
  }, [dataSelecionada, categoriaAtiva, subViewEquipe, modoVisao]);

  // useEffect para buscar a GRADE MENSAL INTEIRA (Com Agrupamento de Turnos)
  useEffect(() => {
    if (subViewEquipe !== 'escalas' || modoVisao !== 'mes') return;

    const buscarPlantoesMes = async () => {
      setIsLoadingMes(true);
      try {
        const anoMesAlvo = dataSelecionada.substring(0, 7); 

        const q = query(
          collection(db, "escalas"),
          where("categoria", "==", categoriaAtiva)
        );

        const querySnapshot = await getDocs(q);
        const dadosAgrupados = {};

        // 1. Lê todos os plantões e guarda numa LISTA por dia
        querySnapshot.forEach((doc) => {
          const p = doc.data();
          
          if (p.data && p.data.startsWith(anoMesAlvo)) {
            if (!dadosAgrupados[p.nome]) {
              dadosAgrupados[p.nome] = {};
            }
            const dia = p.data.split('-')[2]; 
            
            // Se o dia ainda não existe, cria um array vazio
            if (!dadosAgrupados[p.nome][dia]) {
              dadosAgrupados[p.nome][dia] = [];
            }
            
            // Só adiciona a sigla se ela não estiver duplicada
            if (!dadosAgrupados[p.nome][dia].includes(p.sigla)) {
              dadosAgrupados[p.nome][dia].push(p.sigla);
            }
          }
        });

        // 2. Ordena as siglas para ficar bonito (M, depois T, depois N)
        const ordemTurnos = { 'M': 1, 'T': 2, 'N': 3, 'D': 4, 'DN': 5, 'V': 6 };
        
        Object.keys(dadosAgrupados).forEach(nome => {
          Object.keys(dadosAgrupados[nome]).forEach(dia => {
             const arrayDeSiglas = dadosAgrupados[nome][dia];
             // Ordena e junta tudo numa palavra só (Ex: ['N', 'T', 'M'] vira "MTN")
             dadosAgrupados[nome][dia] = arrayDeSiglas
               .sort((a, b) => (ordemTurnos[a] || 99) - (ordemTurnos[b] || 99))
               .join('');
          });
        });

        setPlantoesDoMes(dadosAgrupados);
      } catch (error) {
        console.error("Erro ao buscar a escala do mês:", error);
      } finally {
        setIsLoadingMes(false);
      }
    };

    buscarPlantoesMes();
  }, [dataSelecionada, categoriaAtiva, subViewEquipe, modoVisao]);

  const abrirModalTroca = (turno, nomeAtual) => {
    setPlantaoEditado({ turno, nomeAtual });
    // Se estiver pendente, deixa o campo em branco para digitar. Se tiver nome, preenche para facilitar.
    setNovoPlantonista(nomeAtual.includes('Pendente') ? "" : nomeAtual);
    setIsEditModalOpen(true);
  };

  const salvarTrocaPlantao = () => {
    // No futuro, aqui vai a linha que avisa o Firebase da mudança
    alert(`Escala atualizada! O turno ${plantaoEditado.turno} foi assumido por: ${novoPlantonista}`);
    setIsEditModalOpen(false);
  };

  // Função para formatar data sem erro de fuso horário
  const formatarDataBR = (strData) => {
    if (!strData) return "";
    const [ano, mes, dia] = strData.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  // === VISÃO 1: HUB PRINCIPAL ===
  const renderHub = () => (
    <div className="animate-fadeIn">
      {/* HEADER DE SINAIS VITAIS */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Painel do Gestor</h2>
          <p className="text-slate-500 text-sm mt-1">Visão estratégica e monitoramento da UTI</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 flex flex-col items-center">
            <span className="text-[10px] font-bold text-emerald-600 uppercase">Ocupação Atual</span>
            <span className="text-lg font-black text-emerald-800">80%</span>
          </div>
          <div className="bg-red-50 px-4 py-2 rounded-xl border border-red-100 flex flex-col items-center">
            <span className="text-[10px] font-bold text-red-600 uppercase">Eventos 24h</span>
            <span className="text-lg font-black text-red-800">2</span>
          </div>
          <div className="bg-amber-50 px-4 py-2 rounded-xl border border-amber-100 flex flex-col items-center">
            <span className="text-[10px] font-bold text-amber-600 uppercase">Pendências</span>
            <span className="text-lg font-black text-amber-800">5</span>
          </div>
        </div>
      </div>

      {/* GRADE DE NAVEGAÇÃO (OS 4 PILARES) */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* BLOCO 1 */}
        <button 
          onClick={() => setActiveView('indicadores')}
          className="bg-white p-8 rounded-3xl shadow-sm border-2 border-transparent hover:border-blue-500 hover:shadow-xl transition-all group text-left relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all">
            <BarChart2 size={100} />
          </div>
          <div className="bg-blue-100 w-14 h-14 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
            <BarChart2 size={28} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Inteligência Clínica</h3>
          <p className="text-slate-500 text-sm pr-8">Taxa de mortalidade, SMR, tempo de permanência, densidade de dispositivos e desfechos.</p>
        </button>

        {/* BLOCO 2 */}
        <button 
          onClick={() => setActiveView('qualidade')}
          className="bg-white p-8 rounded-3xl shadow-sm border-2 border-transparent hover:border-red-500 hover:shadow-xl transition-all group text-left relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all">
            <ShieldAlert size={100} />
          </div>
          <div className="bg-red-100 w-14 h-14 rounded-2xl flex items-center justify-center text-red-600 mb-6">
            <ShieldAlert size={28} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Qualidade e Segurança</h3>
          <p className="text-slate-500 text-sm pr-8">Notificação de eventos adversos, incidência de LPP, extubações acidentais e quedas.</p>
        </button>

        {/* BLOCO 3 */}
        <button 
          onClick={() => setActiveView('auditoria')}
          className="bg-white p-8 rounded-3xl shadow-sm border-2 border-transparent hover:border-amber-500 hover:shadow-xl transition-all group text-left relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all">
            <FileCheck size={100} />
          </div>
          <div className="bg-amber-100 w-14 h-14 rounded-2xl flex items-center justify-center text-amber-600 mb-6">
            <FileCheck size={28} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Auditoria (Prontuários)</h3>
          <p className="text-slate-500 text-sm pr-8">Varredura de evoluções pendentes, escalas de risco não preenchidas e adesão a protocolos.</p>
        </button>

        {/* BLOCO 4 */}
        <button 
          onClick={() => setActiveView('equipe')}
          className="bg-white p-8 rounded-3xl shadow-sm border-2 border-transparent hover:border-emerald-500 hover:shadow-xl transition-all group text-left relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all">
            <Users size={100} />
          </div>
          <div className="bg-emerald-100 w-14 h-14 rounded-2xl flex items-center justify-center text-emerald-600 mb-6">
            <Users size={28} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Gestão de Equipe</h3>
          <p className="text-slate-500 text-sm pr-8">Controle de acessos, aprovação de usuários, perfis de permissão e layout de leitos.</p>
        </button>
      </div>
    </div>
  );

  // === VISÃO 2: BLOCO 1 (INTELIGÊNCIA CLÍNICA) ===
  const renderIndicadores = () => {
    // Dados fictícios para visualização inicial (Mock Data)
    const dataDesfechos = [
      { name: 'Alta Hospitalar', value: 45, color: '#10b981' }, // Emerald
      { name: 'Óbito', value: 8, color: '#ef4444' }, // Red
      { name: 'Transferência', value: 12, color: '#f59e0b' }, // Amber
    ];

    const dataDispositivos = [
      { name: 'VMI', dias: 320, fill: '#3b82f6' }, // Blue
      { name: 'CVC', dias: 450, fill: '#8b5cf6' }, // Violet
      { name: 'SVD', dias: 380, fill: '#0ea5e9' }, // Sky
      { name: 'Shiley', dias: 90, fill: '#f97316' }, // Orange
    ];

    // 1. Muda o conselho automaticamente de acordo com a categoria
  const handleCategoriaChange = (e) => {
    const cat = e.target.value;
    let conselhoPadrao = 'Outro';
    if (cat === 'Médico') conselhoPadrao = 'CRM';
    if (cat === 'Enfermeiro' || cat === 'Téc. Enfermagem') conselhoPadrao = 'COREN';
    if (cat === 'Fisioterapeuta') conselhoPadrao = 'CREFITO';
    if (cat === 'Nutricionista') conselhoPadrao = 'CRN';
    if (cat === 'Fonoaudiólogo') conselhoPadrao = 'CREFONO';

    setNovoProfissional({ ...novoProfissional, categoria: cat, conselho: conselhoPadrao });
  };

  // 2. O famoso handleBlur: Verifica duplicidade ao sair do campo
  const handleBlurConselho = async () => {
    if (!novoProfissional.numeroConselho) {
      setErroConselho('');
      return;
    }
    
    try {
      const q = query(
        collection(db, "profissionais"), 
        where("numeroConselho", "==", novoProfissional.numeroConselho)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        setErroConselho(`Atenção: Já existe um profissional cadastrado com o ${novoProfissional.conselho} ${novoProfissional.numeroConselho}!`);
      } else {
        setErroConselho(''); // Tudo limpo, pode prosseguir
      }
    } catch (error) {
      console.error("Erro ao verificar conselho:", error);
    }
  };

  // 3. Salva o Profissional no Firebase
  const salvarProfissional = async (e) => {
    e.preventDefault(); // Evita que a página recarregue
    if (erroConselho) return; // Bloqueia se houver erro de duplicidade

    setIsSalvandoProfissional(true);
    try {
      await addDoc(collection(db, "profissionais"), {
        ...novoProfissional,
        cadastradoEm: new Date().toISOString(),
        status: 'Ativo'
      });
      
      alert(`✅ Sucesso! ${novoProfissional.nome} foi cadastrado na equipa de ${novoProfissional.categoria}.`);
      
      // Limpa o formulário
      setNovoProfissional({ nome: '', categoria: 'Médico', conselho: 'CRM', numeroConselho: '', vinculo: 'PJ', telefone: '' });
    } catch (error) {
      console.error("Erro ao salvar profissional:", error);
      alert("❌ Ocorreu um erro ao salvar.");
    } finally {
      setIsSalvandoProfissional(false);
    }
  };

    return (
      <div className="animate-fadeIn">
        {/* Botão de Voltar e Título */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => setActiveView('hub')}
            className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <BarChart2 className="text-blue-600" /> Inteligência Clínica e Indicadores
            </h2>
            <p className="text-slate-500 text-sm mt-1">Análise de desfechos baseados nas altas da unidade.</p>
          </div>
        </div>

        {/* Filtro de Período */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex gap-4 items-center">
          <Calendar size={18} className="text-slate-400" />
          <select className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-blue-500">
            <option>Abril 2026</option>
            <option>Março 2026</option>
          </select>
          <button className="ml-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
            Exportar Relatório PDF
          </button>
        </div>

        {/* Mini-Cards de Desfechos (SMR Atualizado) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Altas do Período</span>
            <div className="text-3xl font-black text-slate-800 mt-1">65</div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Tempo Médio (LOS)</span>
            <div className="text-3xl font-black text-slate-800 mt-1">8.4 <span className="text-sm font-normal text-slate-500">dias</span></div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Taxa de Mortalidade</span>
            <div className="text-3xl font-black text-red-600 mt-1">12.3%</div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
            <span className="text-[10px] font-bold text-slate-400 uppercase">SMR (SAPS 3)</span>
            <div className="text-3xl font-black text-emerald-600 mt-1">0.85</div>
            <div className="absolute bottom-2 right-4 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded">Salvando mais!</div>
          </div>
        </div>

        {/* SEÇÃO DE GRÁFICOS (RECHARTS) */}
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Gráfico 1: Densidade de Dispositivos */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-80 flex flex-col">
            <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase flex items-center gap-2">
              <Activity size={16} className="text-blue-500" /> Total de Dias-Dispositivo
            </h3>
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataDispositivos} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="dias" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 2: Desfechos */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-80 flex flex-col">
            <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500" /> Distribuição de Desfechos
            </h3>
            <div className="flex-1 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataDesfechos}
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {dataDesfechos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>
    );
  };

  // === VISÃO 3: BLOCO 2 (QUALIDADE E SEGURANÇA) ===
  const renderQualidade = () => {
    // Mock Data para o Gráfico de Pareto (Os maiores ofensores da UTI)
    const dataPareto = [
      { evento: 'Retirada SNE', quantidade: 14, fill: '#f59e0b' }, // Amber
      { evento: 'Queda do Leito', quantidade: 8, fill: '#ef4444' }, // Red
      { evento: 'LPP Adquirida', quantidade: 5, fill: '#8b5cf6' }, // Violet
      { evento: 'Flebite', quantidade: 3, fill: '#ec4899' }, // Pink
      { evento: 'Extubação Acidental', quantidade: 1, fill: '#3b82f6' }, // Blue
    ];

    // Mock Data para a Linha do Tempo (Eventos ao longo do mês)
    const dataTimeline = [
      { dia: '01/Abr', eventos: 0 },
      { dia: '05/Abr', eventos: 2 },
      { dia: '10/Abr', eventos: 1 },
      { dia: '15/Abr', eventos: 5 }, // Um dia atípico no plantão
      { dia: '20/Abr', eventos: 0 },
      { dia: '25/Abr', eventos: 1 },
    ];

    return (
      <div className="animate-fadeIn">
        {/* Botão de Voltar e Título */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => setActiveView('hub')}
            className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert className="text-red-600" /> Qualidade e Segurança
            </h2>
            <p className="text-slate-500 text-sm mt-1">Monitoramento de eventos adversos e gestão de riscos.</p>
          </div>
        </div>

        {/* Filtro de Período */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex gap-4 items-center">
          <Calendar size={18} className="text-slate-400" />
          <select className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-red-500">
            <option>Abril 2026</option>
            <option>Março 2026</option>
          </select>
          <button className="ml-auto bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
            Relatório de Conformidade
          </button>
        </div>

        {/* Mini-Cards de Segurança */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total de Notificações</span>
            <div className="text-3xl font-black text-slate-800 mt-1">31</div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Incidência de LPP</span>
            <div className="text-3xl font-black text-red-600 mt-1">2.5%</div>
            <div className="text-[10px] text-slate-400 font-bold mt-1">5 lesões adquiridas</div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Extubação Acidental</span>
            <div className="text-3xl font-black text-blue-600 mt-1">3.1</div>
            <div className="text-[10px] text-slate-400 font-bold mt-1">por 1000 dias-VM</div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Dias Sem Quedas</span>
            <div className="text-3xl font-black text-emerald-600 mt-1">12</div>
          </div>
        </div>

        {/* SEÇÃO DE GRÁFICOS */}
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Gráfico 1: Pareto de Eventos */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-80 flex flex-col">
            <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-500" /> Pareto de Intercorrências
            </h3>
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataPareto} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis type="category" dataKey="evento" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#475569', fontWeight: 'bold' }} width={120} />
                  <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="quantidade" radius={[0, 6, 6, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-400 text-center mt-2 italic">* 80% dos problemas estão concentrados nos primeiros itens.</p>
          </div>

          {/* Gráfico 2: Linha do Tempo (Timeline) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-80 flex flex-col">
            <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase flex items-center gap-2">
              <Activity size={16} className="text-red-500" /> Curva de Ocorrências (Abril)
            </h3>
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="eventos" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#white' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>
    );
  };

  // === VISÃO 4: BLOCO 3 (AUDITORIA E CONFORMIDADE) ===
  const renderAuditoria = () => {
    // Mock Data para o Gráfico de Conformidade (Preenchimento de Prontuário)
    const dataConformidade = [
      { setor: 'Médico', preenchido: 85, pendente: 15 },
      { setor: 'Enfermagem', preenchido: 96, pendente: 4 },
      { setor: 'Fisioterapia', preenchido: 90, pendente: 10 },
    ];

    // Mock Data para Alertas de Prontuário (O que falta preencher AGORA)
    const alertasPendencias = [
      { id: 1, leito: '02', paciente: 'João S. (45a)', pendencia: 'Evolução Médica Diária ausente', tempo: 'Atrasado > 24h', gravidade: 'alta' },
      { id: 2, leito: '05', paciente: 'Maria C. (72a)', pendencia: 'Escala de Braden não atualizada', tempo: 'Venceu às 14h', gravidade: 'media' },
      { id: 3, leito: '08', paciente: 'Carlos R. (59a)', pendencia: 'Falta assinar alta de ontem', tempo: 'Pendente Doc', gravidade: 'alta' },
      { id: 4, leito: '10', paciente: 'Ana P. (81a)', pendencia: 'Checklist de CVC em branco', tempo: 'D2 do Acesso', gravidade: 'baixa' },
    ];

    return (
      <div className="animate-fadeIn">
        {/* Botão de Voltar e Título */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => setActiveView('hub')}
            className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FileCheck className="text-amber-600" /> Auditoria de Prontuários
            </h2>
            <p className="text-slate-500 text-sm mt-1">Conformidade de preenchimento, escalas e checagem de prescrições.</p>
          </div>
        </div>

        {/* Filtro de Visão (Hoje vs Mês) */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex gap-4 items-center">
          <Clock size={18} className="text-slate-400" />
          <select className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-amber-500">
            <option>Plantão Atual (Hoje)</option>
            <option>Consolidado do Mês</option>
          </select>
          <button className="ml-auto bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
            Notificar Equipe
          </button>
        </div>

        {/* Mini-Cards de Auditoria */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Adesão Global (Prontuário)</span>
            <div className="text-3xl font-black text-emerald-600 mt-1">90%</div>
            <div className="text-[10px] text-slate-400 font-bold mt-1">Meta: &gt; 95%</div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Evoluções Pendentes</span>
            <div className="text-3xl font-black text-red-600 mt-1">3</div>
            <div className="text-[10px] text-slate-400 font-bold mt-1">Das últimas 24h</div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Assinaturas Faltantes</span>
            <div className="text-3xl font-black text-amber-500 mt-1">12</div>
            <div className="text-[10px] text-slate-400 font-bold mt-1">Documentos abertos</div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Prescrições Checadas</span>
            <div className="text-3xl font-black text-blue-600 mt-1">98%</div>
            <div className="text-[10px] text-slate-400 font-bold mt-1">Pela Enfermagem</div>
          </div>
        </div>

        {/* SEÇÃO PRINCIPAL (Gráfico + Lista de Pendências) */}
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Gráfico: Adesão por Setor (Empilhado) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-80 flex flex-col">
            <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-500" /> Adesão ao Preenchimento (%)
            </h3>
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataConformidade} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="setor" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#475569', fontWeight: 'bold' }} width={90} />
                  <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="preenchido" name="Conforme" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={24} />
                  <Bar dataKey="pendente" name="Em Branco/Atrasado" stackId="a" fill="#f87171" radius={[0, 6, 6, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Lista de Alertas Críticos (Actionables) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-80 flex flex-col overflow-hidden">
            <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" /> Radar de Pendências Críticas
            </h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {alertasPendencias.map((alerta) => (
                <div key={alerta.id} className="flex p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className={`w-2 rounded-full mr-3 ${alerta.gravidade === 'alta' ? 'bg-red-500' : alerta.gravidade === 'media' ? 'bg-amber-500' : 'bg-blue-400'}`}></div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-slate-800">Leito {alerta.leito} - {alerta.paciente}</span>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{alerta.tempo}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{alerta.pendencia}</p>
                  </div>
                </div>
              ))}
              {alertasPendencias.length === 0 && (
                <div className="text-center text-slate-400 py-8 italic">
                  Tudo em conformidade! Nenhuma pendência crítica.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    );
  };

  // === VISÃO 5: BLOCO 4 (GESTÃO DE EQUIPE E SISTEMA) ===
  const renderEquipe = () => {

    // ----------------------------------------------------
    // TELA 1: O SUB-MENU COM OS 4 CARTÕES
    // ----------------------------------------------------
    if (subViewEquipe === 'menu') {
      return (
        <div className="animate-fadeIn">
          {/* Botão de Voltar para o Hub e Título */}
          <div className="flex items-center gap-4 mb-8">
            <button 
              onClick={() => setActiveView('hub')}
              className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors"
            >
              <ArrowLeft size={20} className="text-slate-700" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Users className="text-emerald-600" /> Gestão de Equipe e Sistema
              </h2>
              <p className="text-slate-500 text-sm mt-1">Selecione o módulo administrativo que deseja acessar.</p>
            </div>
          </div>

          {/* Mini-Cards de Resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Equipe Cadastrada</span>
              <div className="text-3xl font-black text-slate-800 mt-1">45</div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-emerald-200 bg-emerald-50/30">
              <span className="text-[10px] font-bold text-emerald-600 uppercase">Usuários Ativos</span>
              <div className="text-3xl font-black text-emerald-700 mt-1">12</div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-amber-200 bg-amber-50/30">
              <span className="text-[10px] font-bold text-amber-600 uppercase">Pendências RH</span>
              <div className="text-3xl font-black text-amber-700 mt-1">2</div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-blue-200 bg-blue-50/30">
              <span className="text-[10px] font-bold text-blue-600 uppercase">Furos na Escala</span>
              <div className="text-3xl font-black text-blue-700 mt-1">0</div>
            </div>
          </div>

          {/* OS 4 CARTÕES DE SELEÇÃO */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* CARTÃO 1: ACESSOS */}
            <button 
              onClick={() => setSubViewEquipe('acessos')}
              className="bg-white p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-emerald-500 hover:shadow-md transition-all group text-left flex flex-col h-full"
            >
              <div className="bg-emerald-100 w-12 h-12 rounded-xl flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                <Shield size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Controle de Perfis</h3>
              <p className="text-slate-500 text-sm flex-grow">Gerencie senhas, aprove credenciamentos e defina os cargos de cada profissional.</p>
            </button>

            {/* CARTÃO 2: ESCALAS */}
            <button 
              onClick={() => setSubViewEquipe('escalas')}
              className="bg-white p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-blue-500 hover:shadow-md transition-all group text-left flex flex-col h-full"
            >
              <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                <CalendarDays size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Gestão de Escalas</h3>
              <p className="text-slate-500 text-sm flex-grow">Monte o espelho de plantão (Médico, Enf e Fisio) e acompanhe trocas.</p>
            </button>

            {/* CARTÃO 3: NOVO - CADASTRO DE PROFISSIONAL (O Caminho A começa aqui) */}
            <button 
              onClick={() => setSubViewEquipe('cadastro')}
              className="bg-white p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-amber-500 hover:shadow-md transition-all group text-left flex flex-col h-full"
            >
              <div className="bg-amber-100 w-12 h-12 rounded-xl flex items-center justify-center text-amber-600 mb-4 group-hover:scale-110 transition-transform">
                <UserPlus size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Cadastrar Profissional</h3>
              <p className="text-slate-500 text-sm flex-grow">Registre o CRM/COREN da equipe na base oficial da UTI (Para integração).</p>
            </button>

            {/* CARTÃO 4: CONFIGURAÇÕES */}
            <button 
              onClick={() => setSubViewEquipe('config')}
              className="bg-white p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-slate-500 hover:shadow-md transition-all group text-left flex flex-col h-full"
            >
              <div className="bg-slate-200 w-12 h-12 rounded-xl flex items-center justify-center text-slate-700 mb-4 group-hover:scale-110 transition-transform">
                <Settings size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Configurações da UTI</h3>
              <p className="text-slate-500 text-sm flex-grow">Altere o número de leitos, mapeie áreas e ajuste parâmetros gerais.</p>
            </button>

          </div>
        </div>
      );
    }

    // ----------------------------------------------------
    // TELA DE CADASTRO E LISTA DE PROFISSIONAIS (RH)
    // ----------------------------------------------------
    if (subViewEquipe === 'cadastro') {
      return (
        <div className="animate-fadeIn max-w-7xl mx-auto pb-12">
          {/* CABEÇALHO */}
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setSubViewEquipe('menu')} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors">
              <ArrowLeft size={20} className="text-slate-700" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Users className="text-emerald-600" /> Equipe e Setorização
              </h2>
              <p className="text-slate-500 text-sm">Cadastre novos membros e vincule-os aos seus respectivos setores.</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* COLUNA ESQUERDA: FORMULÁRIO */}
            <div className="lg:col-span-1">
              <form onSubmit={salvarProfissional} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm sticky top-4">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <UserPlus size={18} className="text-emerald-500" /> Novo Registro
                </h3>
                
                <div className="space-y-4">
                  {/* NOME */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nome (Conforme Escala)</label>
                    <input 
                      type="text" required value={novoProfissional.nome}
                      onChange={(e) => setNovoProfissional({...novoProfissional, nome: e.target.value.toUpperCase()})}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:border-emerald-500 outline-none"
                      placeholder="DR. NOME DO MÉDICO"
                    />
                  </div>

                  {/* SETOR / CATEGORIA (Aqui é feita a vinculação do setor) */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Vinculação de Setor</label>
                    <select 
                      value={novoProfissional.categoria} onChange={handleCategoriaChange}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:border-emerald-500 outline-none cursor-pointer"
                    >
                      <option value="Médico">Médico</option>
                      <option value="Enfermeiro">Enfermeiro</option>
                      <option value="Téc. Enfermagem">Téc. Enfermagem</option>
                      <option value="Fisioterapeuta">Fisioterapeuta</option>
                      <option value="Nutricionista">Nutricionista</option>
                      <option value="Fonoaudiólogo">Fonoaudiólogo</option>
                    </select>
                  </div>

                  {/* CONSELHO E VÍNCULO */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{novoProfissional.conselho}</label>
                      <input 
                        type="number" required value={novoProfissional.numeroConselho}
                        onChange={(e) => setNovoProfissional({...novoProfissional, numeroConselho: e.target.value})}
                        onBlur={handleBlurConselho}
                        className={`w-full p-2.5 bg-slate-50 border ${erroConselho ? 'border-red-500' : 'border-slate-200'} rounded-xl text-sm font-bold focus:border-emerald-500 outline-none`}
                        placeholder="Número"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Vínculo</label>
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
                    <p className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                      <AlertCircle size={12} /> {erroConselho}
                    </p>
                  )}

                  <button 
                    type="submit" disabled={isSalvandoProfissional || !!erroConselho}
                    className="w-full bg-emerald-600 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all disabled:opacity-50"
                  >
                    {isSalvandoProfissional ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                    Salvar na Base Oficial
                  </button>
                </div>
              </form>
            </div>

            {/* COLUNA DIREITA: TABELA DE PROFISSIONAIS */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-700">Base de Profissionais Autorizados</h3>
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">
                    {listaProfissionais.length} Registros
                  </span>
                </div>

                {listaProfissionais.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 font-medium">
                    Nenhum profissional cadastrado na base oficial ainda.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
                        <tr>
                          <th className="px-4 py-3">Profissional / Setor</th>
                          <th className="px-4 py-3">Registro</th>
                          <th className="px-4 py-3">Vínculo</th>
                          <th className="px-4 py-3 text-right">Ações</th> {/* NOVA COLUNA */}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {listaProfissionais.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-700 text-sm">{p.nome}</div>
                              <div className="text-[10px] font-bold text-blue-500 uppercase">{p.categoria}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded font-bold text-slate-600">
                                {p.conselho} {p.numeroConselho}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs font-bold text-slate-500">
                              {p.vinculo}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {/* O FAMOSO BOTÃO DE VÍNCULOS */}
                              <button 
                                onClick={() => openModal(p)}
                                className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200 px-3 py-1.5 rounded-lg transition-all inline-flex items-center gap-1"
                              >
                                + Vínculos
                              </button>
                            </td>
                          </tr>
                        ))}
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
    }

    // ----------------------------------------------------
    // TELA 2: SUB-MÓDULO DE ACESSOS (O SEU COMPONENTE ANTIGO)
    // ----------------------------------------------------
    if (subViewEquipe === 'acessos') {
      return (
        <div className="animate-fadeIn">
          {/* Botão de voltar para os 3 cartões */}
          <div className="flex items-center gap-4 mb-6">
            <button 
              onClick={() => setSubViewEquipe('menu')}
              className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors"
            >
              <ArrowLeft size={20} className="text-slate-700" />
            </button>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Shield className="text-emerald-600" /> Controle de Perfis e Acessos
            </h2>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 min-h-[500px]">
            <ModuloAdmin userProfile={userProfile} />
          </div>
        </div>
      );
    }

   // ----------------------------------------------------
    // TELA 3: GESTÃO DE ESCALAS MULTIPROFISSIONAIS
    // ----------------------------------------------------
    if (subViewEquipe === 'escalas') {
      
      const categorias = [
        { id: 'Médico', icon: <Activity size={16} /> },
        { id: 'Enfermeiro', icon: <Users size={16} /> },
        { id: 'Téc. Enfermagem', icon: <Users size={16} /> },
        { id: 'Fisioterapeuta', icon: <Activity size={16} /> },
        { id: 'Fonoaudiólogo', icon: <Activity size={16} /> },
        { id: 'Nutricionista', icon: <Activity size={16} /> },
        { id: 'Recepção', icon: <Users size={16} /> },
        { id: 'Visão Geral', icon: <Shield size={16} /> },
      ];

      return (
        <div className="animate-fadeIn pb-12">
          {/* Cabeçalho do Módulo */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setSubViewEquipe('menu')} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors">
                <ArrowLeft size={20} className="text-slate-700" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <CalendarDays className="text-blue-600" /> Radar de Plantão
                </h2>
                <p className="text-slate-500 text-sm">Controle diário e mensal das equipes da UTI.</p>
              </div>
            </div>

            {/* Seleção de Data e Visão */}
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
              <input 
                type="date" 
                value={dataSelecionada} 
                onChange={(e) => setDataSelecionada(e.target.value)}
                className="text-sm font-bold text-slate-700 p-2 outline-none border-r border-slate-100"
              />
              <button 
                onClick={() => setModoVisao('dia')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${modoVisao === 'dia' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                DIA
              </button>
              <button 
                onClick={() => setModoVisao('mes')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${modoVisao === 'mes' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                MÊS
              </button>
            </div>
          </div>

          {/* Abas de Categorias Profissionais */}
          <div className="flex overflow-x-auto gap-2 mb-6 no-scrollbar pb-2">
            {categorias.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoriaAtiva(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border-2 ${
                  categoriaAtiva === cat.id 
                  ? 'bg-white border-blue-500 text-blue-600 shadow-sm' 
                  : 'bg-slate-100 border-transparent text-slate-500 hover:bg-slate-200'
                }`}
              >
                {cat.icon} {cat.id}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            {/* ÁREA DE CONTEÚDO DINÂMICO */}
            {categoriaAtiva === 'Visão Geral' ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                 <div className="bg-slate-800 p-4 text-white font-bold text-sm uppercase tracking-wider flex justify-between">
                   <span>Plantão Consolidado</span>
                   <span className="text-blue-400">{formatarDataBR(dataSelecionada)}</span>
                 </div>
                 
                 <div className="p-6 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categorias.filter(c => c.id !== 'Visão Geral').map(cat => {
                      const profissionais = consolidadoDia[cat.id] || [];
                      
                      return (
                        <div key={cat.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex flex-col">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3 flex justify-between items-center">
                            {cat.id} 
                            {profissionais.length > 0 && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{profissionais.length}</span>}
                          </h4>
                          
                          <div className="space-y-2 flex-grow">
                            {profissionais.length === 0 ? (
                              <div className="text-[10px] text-slate-400 italic py-2">Sem escala para hoje</div>
                            ) : (
                              profissionais.sort((a,b) => (a.sigla === 'V' ? -1 : 1)).map(p => {
                                let corBarra = "border-blue-500";
                                if (p.sigla === 'V') corBarra = "border-emerald-500";
                                if (p.sigla === 'N') corBarra = "border-indigo-500";
                                
                                return (
                                  <div key={p.id} className={`bg-white p-2 rounded shadow-sm border-l-4 ${corBarra} flex justify-between items-center`}>
                                    <div className="text-xs font-bold text-slate-700 truncate pr-2">{p.nome}</div>
                                    <div className="text-[9px] font-black bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{p.sigla}</div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                 </div>
              </div>
            ) : modoVisao === 'dia' ? (
              <div className="grid md:grid-cols-2 gap-6">
                {/* LISTA DE PLANTONISTAS DO DIA (LIMPA, SEM DUPLICADOS) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4 flex justify-between items-center">
                    Escala de {categoriaAtiva} 
                    <span className="text-xs text-slate-400 font-normal">Dia {dataSelecionada.split('-')[2]}</span>
                  </h3>
                  
                  <div className="space-y-4">
                    {isLoadingPlantoes && (
                      <div className="p-8 text-center text-slate-400 font-bold animate-pulse bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <Loader2 className="animate-spin inline mr-2" size={20} />
                        A carregar a escala da base de dados...
                      </div>
                    )}

                    {!isLoadingPlantoes && plantoesDoDia.length === 0 && (
                      <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        Nenhum profissional escalado para este dia nesta categoria.
                      </div>
                    )}

                    {/* Desenha os cartões reais vindos do Firebase */}
                    {!isLoadingPlantoes && plantoesDoDia.map((plantao) => {
                      
                      // NOVO PADRÃO DE CORES PARA OS CARTÕES
                      let corBg = 'bg-slate-50';
                      let corBorder = 'border-slate-100';
                      let corText = 'text-slate-600';

                      if (plantao.sigla === 'V') {
                        corBg = 'bg-emerald-50'; corBorder = 'border-emerald-100'; corText = 'text-emerald-600';
                      } else if (plantao.sigla === 'N') {
                        corBg = 'bg-indigo-50'; corBorder = 'border-indigo-100'; corText = 'text-indigo-600';
                      } else if (plantao.sigla.includes('D') || plantao.sigla.includes('M') || plantao.sigla.includes('T')) {
                        corBg = 'bg-blue-50'; corBorder = 'border-blue-100'; corText = 'text-blue-600';
                      }

                      return (
                        <div key={plantao.id} className={`p-4 ${corBg} border ${corBorder} rounded-xl relative group`}>
                          <span className={`text-[10px] font-bold ${corText} uppercase`}>
                            {plantao.turno} ({plantao.horario})
                          </span>
                          <div className="text-lg font-black text-slate-800 mt-1">{plantao.nome}</div>
                          
                          <button 
                            onClick={() => abrirModalTroca(`${plantao.turno} (${plantao.horario})`, plantao.nome)}
                            className={`absolute top-4 right-4 z-20 p-2 bg-white/50 hover:bg-white rounded-lg shadow-sm ${corText} transition-all cursor-pointer border ${corBorder}`}
                            title="Substituir Plantonista"
                          >
                            <Settings size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Importador lateral */}
                <ImportadorEscala categoria={categoriaAtiva} />
              </div>
            ) : (
              /* VISÃO MENSAL */
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
                 <div className="flex justify-between items-center mb-4">
                   <h3 className="font-bold text-slate-800">Grade Mensal - {categoriaAtiva}</h3>
                   
                   {/* NOVO SELETOR DE MÊS AQUI */}
                   <div className="flex items-center gap-2">
                     <span className="text-xs font-bold text-slate-500 uppercase">Mês de Referência:</span>
                     <input 
                       type="month" 
                       value={dataSelecionada.substring(0, 7)} // Pega apenas o Ano e o Mês (ex: 2026-05)
                       onChange={(e) => setDataSelecionada(e.target.value + "-01")} // Atualiza a data global para o dia 1 do mês escolhido
                       className="p-2 border border-slate-200 bg-slate-50 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
                     />
                   </div>
                 </div>

                 <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="p-2 border border-slate-200 font-bold text-slate-500">Profissional</th>
                        {[...Array(31)].map((_, i) => (
                          <th key={i} className="p-1 border border-slate-200 font-bold text-slate-500 text-center w-8">
                            {(i + 1).toString().padStart(2, '0')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingMes && (
                        <tr><td colSpan="32" className="p-8 text-center text-slate-400 animate-pulse">A carregar o mês completo...</td></tr>
                      )}
                      
                      {!isLoadingMes && Object.keys(plantoesDoMes).length === 0 && (
                        <tr><td colSpan="32" className="p-8 text-center text-slate-400">Nenhum plantão encontrado para {dataSelecionada.substring(0,7)}.</td></tr>
                      )}

                      {!isLoadingMes && Object.entries(plantoesDoMes).map(([nome, dias]) => (
                        <tr key={nome} className="hover:bg-slate-50 border-b border-slate-100">
                          <td className="p-2 border-r border-slate-200 font-bold text-slate-700 whitespace-nowrap text-[10px] uppercase">
                            {nome}
                          </td>
                          {[...Array(31)].map((_, i) => {
                            const diaStr = (i + 1).toString().padStart(2, '0');
                            const sigla = dias[diaStr]; // Procura se tem plantão neste dia
                            
                            // NOVO PADRÃO DE CORES DO DR. LUCIANO
                            let corLetra = 'text-slate-200';
                            let corFundo = '';
                            
                            if (sigla) {
                              if (sigla === 'V') { 
                                // V é Verde
                                corLetra = 'text-emerald-700'; corFundo = 'bg-emerald-50'; 
                              } else if (sigla === 'N') { 
                                // Somente N é Roxo
                                corLetra = 'text-indigo-700'; corFundo = 'bg-indigo-50'; 
                              } else if (sigla.includes('D') || sigla.includes('M') || sigla.includes('T')) { 
                                // Se tem D, M ou T (ex: MTN, DN, T), pinta de Azul
                                corLetra = 'text-blue-700'; corFundo = 'bg-blue-50'; 
                              } else {
                                // Prevenção para outras siglas
                                corLetra = 'text-slate-700'; corFundo = 'bg-slate-50';
                              }
                            }

                            return (
                              <td key={i} className={`p-1 border-r border-slate-200 text-center font-black ${corLetra} ${corFundo}`}>
                                {sigla || '-'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                 </table>
                 <p className="text-right text-[10px] text-slate-400 mt-4 font-bold uppercase">
                    Total de {Object.keys(plantoesDoMes).length} profissionais listados em {dataSelecionada.substring(0,7)}
                 </p>
              </div>
            )}
          </div> {/* <--- Fim da área dinâmica (Dia/Mês) */}

          {/* ========================================== */}
          {/* MODAL DE TROCA DE PLANTÃO (PASSO 3B)       */}
          {/* ========================================== */}
          {isEditModalOpen && plantaoEditado && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-fadeIn">
                <div className="bg-slate-800 p-5 flex justify-between items-center text-white">
                  <div>
                    <h3 className="font-black text-lg">Alterar Plantonista</h3>
                    <p className="text-slate-300 text-xs">Substituição Manual</p>
                  </div>
                  <button onClick={() => setIsEditModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors text-white font-bold">
                    FECHAR
                  </button>
                </div>
                
                <div className="p-6 space-y-4">
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase">Turno e Horário</div>
                    <div className="font-bold text-slate-700">{plantaoEditado.turno}</div>
                  </div>
                  
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase">Plantonista Original (Excel)</div>
                    <div className="text-sm text-slate-500 line-through">{plantaoEditado.nomeAtual}</div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-sm font-bold text-blue-600 mb-2">Novo Plantonista Assumindo:</label>
                    <input 
                      type="text" 
                      value={novoPlantonista}
                      onChange={(e) => setNovoPlantonista(e.target.value)}
                      placeholder="Ex: Dr. Carlos Silva"
                      className="w-full p-3 bg-blue-50 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 font-bold"
                    />
                    <p className="text-[10px] text-slate-400 mt-2">
                      No futuro, este campo será um menu listando todos os {categoriaAtiva}s cadastrados no sistema.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                  <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">
                    Cancelar
                  </button>
                  <button onClick={salvarTrocaPlantao} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm">
                    Confirmar Troca
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // ----------------------------------------------------
    // TELA 4: SUB-MÓDULO DE CONFIGURAÇÕES DA UTI
    // ----------------------------------------------------
    if (subViewEquipe === 'config') {
      return (
        <div className="animate-fadeIn pb-8">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setSubViewEquipe('menu')} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors">
              <ArrowLeft size={20} className="text-slate-700" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Settings className="text-slate-600" /> Parâmetros e Configurações da Unidade
              </h2>
              <p className="text-slate-500 text-sm mt-1">Ajuste o espelho físico da UTI e as regras de alertas do sistema.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 md:p-8 grid md:grid-cols-2 gap-8">
              
              {/* COLUNA 1: Estrutura Física e Leitos */}
              <div className="space-y-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Bed className="text-emerald-500" size={20} /> Estrutura Física
                </h3>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Capacidade Total (Número de Leitos)</label>
                  <input type="number" defaultValue={10} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                  <p className="text-[10px] text-slate-500 mt-1">Este número é a base para o cálculo da Taxa de Ocupação no Painel Gestor.</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Leitos de Isolamento (Pressão Negativa/Contato)</label>
                  <input type="number" defaultValue={2} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Padrão de Nomenclatura dos Leitos</label>
                  <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none">
                    <option>Numérico (01, 02, 03...)</option>
                    <option>Alfanumérico (A1, A2, B1...)</option>
                  </select>
                </div>
              </div>

              {/* COLUNA 2: Protocolos e Alertas */}
              <div className="space-y-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Calculator className="text-blue-500" size={20} /> Protocolos Assistenciais
                </h3>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Escore de Gravidade Padrão (Admissão)</label>
                  <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                    <option>SAPS 3 (Recomendado)</option>
                    <option>APACHE II</option>
                    <option>SOFA</option>
                  </select>
                </div>

                <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2 mt-8">
                  <Bell className="text-amber-500" size={20} /> Alertas Automáticos
                </h3>

                <div className="flex items-center justify-between p-4 border border-amber-100 bg-amber-50 rounded-xl">
                  <div>
                    <div className="font-bold text-slate-800 text-sm">Alerta de Lotação</div>
                    <div className="text-xs text-slate-600 mt-1">Notificar coordenação quando a ocupação atingir:</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" defaultValue={90} className="w-16 p-2 text-center font-bold text-amber-700 bg-white border border-amber-200 rounded-lg outline-none" />
                    <span className="font-bold text-amber-700">%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-slate-200 bg-slate-50 rounded-xl">
                  <div>
                    <div className="font-bold text-slate-800 text-sm">Auditoria Rigorosa</div>
                    <div className="text-xs text-slate-600 mt-1">Bloquear alta no sistema se houver pendências na evolução?</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

              </div>
            </div>

            {/* Rodapé com Botão Salvar */}
            <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-end">
              <button 
                onClick={() => {
                  alert("✅ Configurações salvas e aplicadas a toda a unidade.");
                  setSubViewEquipe('menu');
                }}
                className="bg-slate-800 hover:bg-slate-900 text-white px-8 py-3 rounded-xl font-bold transition-colors flex items-center gap-2"
              >
                <Save size={20} /> Salvar Configurações da UTI
              </button>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-slate-50">
      {activeView === 'hub' && renderHub()}
      {activeView === 'indicadores' && renderIndicadores()}
      {activeView === 'qualidade' && renderQualidade()}
      {activeView === 'auditoria' && renderAuditoria()}
      {activeView === 'equipe' && renderEquipe()}

      {activeView === 'qualidade' && <div className="p-8"><button onClick={() => setActiveView('hub')} className="bg-slate-200 p-2 rounded">Voltar</button><h2 className="mt-4 text-xl">Qualidade em construção...</h2></div>}
      {activeView === 'auditoria' && <div className="p-8"><button onClick={() => setActiveView('hub')} className="bg-slate-200 p-2 rounded">Voltar</button><h2 className="mt-4 text-xl">Auditoria em construção...</h2></div>}
      {activeView === 'equipe' && <div className="p-8"><button onClick={() => setActiveView('hub')} className="bg-slate-200 p-2 rounded">Voltar</button><h2 className="mt-4 text-xl">Gestão de Equipe em construção...</h2></div>}
    </div>
  );
};

export default GestorDashboard;