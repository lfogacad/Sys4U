import React, { useState, useEffect } from 'react';
import { 
  BarChart2, ShieldAlert, FileCheck, Users, AlertTriangle, CheckCircle, Settings, CalendarDays, 
  ArrowLeft, Activity, Calendar, TrendingUp, AlertCircle, Clock, Plus, Shield, 
  Bed, Save, Bell, Calculator, Loader2, ArrowRight 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../config/firebase";
import ModuloAdmin from './ModuloAdmin';
import ImportadorEscala from './ImportadorEscala';

const GestorDashboard = ({ userProfile }) => {
  // Controle de navegação principal (hub, indicadores, tendencias, qualidade, auditoria, equipe)
  const [activeView, setActiveView] = useState('hub');
  // Controle de navegação da aba Equipe (menu, acessos, escalas, config)
  const [subViewEquipe, setSubViewEquipe] = useState('menu');
  
  // Controles de Visão e Escala
  const [categoriaAtiva, setCategoriaAtiva] = useState('Médico');
  const [modoVisao, setModoVisao] = useState('dia');
  const [dataSelecionada, setDataSelecionada] = useState(new Date().toISOString().split('T')[0]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [plantaoEditado, setPlantaoEditado] = useState(null);
  const [novoPlantonista, setNovoPlantonista] = useState("");
  const [indicadorTendencia, setIndicadorTendencia] = useState('mortalidade');
  
  // Controles de Dados do Firebase
  const [plantoesDoDia, setPlantoesDoDia] = useState([]);
  const [isLoadingPlantoes, setIsLoadingPlantoes] = useState(false);
  const [plantoesDoMes, setPlantoesDoMes] = useState({});
  const [isLoadingMes, setIsLoadingMes] = useState(false);
  const [consolidadoDia, setConsolidadoDia] = useState({});

  // Efeito: Buscar Plantões do Dia
  useEffect(() => {
    if (subViewEquipe !== 'escalas' || modoVisao !== 'dia') return;

    const buscarDados = async () => {
      setIsLoadingPlantoes(true);
      try {
        let q;
        if (categoriaAtiva === 'Visão Geral') {
          q = query(collection(db, "escalas"), where("data", "==", dataSelecionada));
        } else {
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

  // Efeito: Buscar Grade Mensal
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

        querySnapshot.forEach((doc) => {
          const p = doc.data();
          if (p.data && p.data.startsWith(anoMesAlvo)) {
            if (!dadosAgrupados[p.nome]) dadosAgrupados[p.nome] = {};
            const dia = p.data.split('-')[2]; 
            if (!dadosAgrupados[p.nome][dia]) dadosAgrupados[p.nome][dia] = [];
            if (!dadosAgrupados[p.nome][dia].includes(p.sigla)) {
              dadosAgrupados[p.nome][dia].push(p.sigla);
            }
          }
        });

        const ordemTurnos = { 'M': 1, 'T': 2, 'N': 3, 'D': 4, 'DN': 5, 'V': 6 };
        Object.keys(dadosAgrupados).forEach(nome => {
          Object.keys(dadosAgrupados[nome]).forEach(dia => {
             dadosAgrupados[nome][dia] = dadosAgrupados[nome][dia]
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
    setNovoPlantonista(nomeAtual.includes('Pendente') ? "" : nomeAtual);
    setIsEditModalOpen(true);
  };

  const salvarTrocaPlantao = () => {
    alert(`Escala atualizada! O turno ${plantaoEditado.turno} foi assumido por: ${novoPlantonista}`);
    setIsEditModalOpen(false);
  };

  const formatarDataBR = (strData) => {
    if (!strData) return "";
    const [ano, mes, dia] = strData.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  // ==========================================
  // VISÃO 1: HUB PRINCIPAL
  // ==========================================
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

      {/* GRADE DE NAVEGAÇÃO */}
      <div className="grid md:grid-cols-2 gap-6">
        <button onClick={() => setActiveView('indicadores')} className="bg-white p-8 rounded-3xl shadow-sm border-2 border-transparent hover:border-blue-500 hover:shadow-xl transition-all group text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all"><BarChart2 size={100} /></div>
          <div className="bg-blue-100 w-14 h-14 rounded-2xl flex items-center justify-center text-blue-600 mb-6"><BarChart2 size={28} /></div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Inteligência Clínica</h3>
          <p className="text-slate-500 text-sm pr-8">Taxa de mortalidade, SMR, tempo de permanência, densidade de dispositivos e desfechos.</p>
        </button>

        <button onClick={() => setActiveView('qualidade')} className="bg-white p-8 rounded-3xl shadow-sm border-2 border-transparent hover:border-red-500 hover:shadow-xl transition-all group text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all"><ShieldAlert size={100} /></div>
          <div className="bg-red-100 w-14 h-14 rounded-2xl flex items-center justify-center text-red-600 mb-6"><ShieldAlert size={28} /></div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Qualidade e Segurança</h3>
          <p className="text-slate-500 text-sm pr-8">Notificação de eventos adversos, incidência de LPP, extubações acidentais e quedas.</p>
        </button>

        <button onClick={() => setActiveView('auditoria')} className="bg-white p-8 rounded-3xl shadow-sm border-2 border-transparent hover:border-amber-500 hover:shadow-xl transition-all group text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all"><FileCheck size={100} /></div>
          <div className="bg-amber-100 w-14 h-14 rounded-2xl flex items-center justify-center text-amber-600 mb-6"><FileCheck size={28} /></div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Auditoria (Prontuários)</h3>
          <p className="text-slate-500 text-sm pr-8">Varredura de evoluções pendentes, escalas de risco não preenchidas e adesão a protocolos.</p>
        </button>

        <button onClick={() => setActiveView('equipe')} className="bg-white p-8 rounded-3xl shadow-sm border-2 border-transparent hover:border-emerald-500 hover:shadow-xl transition-all group text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all"><Users size={100} /></div>
          <div className="bg-emerald-100 w-14 h-14 rounded-2xl flex items-center justify-center text-emerald-600 mb-6"><Users size={28} /></div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Gestão de Equipe</h3>
          <p className="text-slate-500 text-sm pr-8">Controle de acessos, aprovação de usuários, perfis de permissão e layout de leitos.</p>
        </button>
      </div>
    </div>
  );

  // ==========================================
  // VISÃO 2: INTELIGÊNCIA CLÍNICA (FOTO)
  // ==========================================
  const renderIndicadores = () => {
    const dataDesfechos = [
      { name: 'Alta Hospitalar', value: 45, color: '#10b981' }, 
      { name: 'Óbito', value: 8, color: '#ef4444' }, 
      { name: 'Transferência', value: 12, color: '#f59e0b' }, 
    ];

    const dataDispositivos = [
      { name: 'VMI', dias: 320, fill: '#3b82f6' }, 
      { name: 'CVC', dias: 450, fill: '#8b5cf6' }, 
      { name: 'SVD', dias: 380, fill: '#0ea5e9' }, 
      { name: 'Shiley', dias: 90, fill: '#f97316' }, 
    ];

    return (
      <div className="animate-fadeIn">
        
        {/* Cabeçalho */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setActiveView('hub')} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <BarChart2 className="text-blue-600" /> Inteligência Clínica e Indicadores
            </h2>
            <p className="text-slate-500 text-sm mt-1">Análise de fluxo, ocupação e desfechos clínicos da unidade.</p>
          </div>
        </div>

        {/* Filtro de Período */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-8 flex gap-4 items-center">
          <Calendar size={18} className="text-slate-400" />
          <select className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-blue-500">
            <option>Abril 2026</option>
            <option>Março 2026</option>
          </select>
          <button className="ml-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">
            Exportar Relatório PDF
          </button>
        </div>

        {/* =========================================
            GRUPO 1: INDICADORES OPERACIONAIS E FLUXO 
            ========================================= */}
        <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
          <Bed size={16} className="text-blue-500" /> Operacional e Fluxo
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Taxa de Ocupação</span>
            <div className="text-3xl font-black text-slate-800 mt-1">88.5%</div>
            <div className="absolute bottom-0 left-0 h-1 bg-blue-500 w-[88.5%]"></div>
          </div>
          
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Giro de Leito</span>
            <div className="text-3xl font-black text-slate-800 mt-1">5.2</div>
            <div className="text-[10px] text-slate-400 font-bold mt-1">Pacientes / Leito / Mês</div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Tempo Médio (LOS)</span>
            <div className="text-3xl font-black text-slate-800 mt-1">8.4 <span className="text-sm font-normal text-slate-500">dias</span></div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total de Altas</span>
            <div className="text-3xl font-black text-slate-800 mt-1">65</div>
            <div className="text-[10px] text-slate-400 font-bold mt-1">No período selecionado</div>
          </div>
        </div>

        {/* =========================================
            GRUPO 2: DESFECHOS CLÍNICOS E SEGURANÇA
            ========================================= */}
        <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
          <ShieldAlert size={16} className="text-emerald-500" /> Desfechos Clínicos e Qualidade
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Mortalidade Bruta</span>
            <div className="text-3xl font-black text-red-600 mt-1">12.3%</div>
            <div className="text-[10px] text-slate-400 font-bold mt-1">Esperada (SAPS 3): 14.5%</div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden bg-emerald-50/30">
            <span className="text-[10px] font-bold text-emerald-600 uppercase">SMR (SAPS 3)</span>
            <div className="text-3xl font-black text-emerald-700 mt-1">0.85</div>
            <div className="absolute bottom-2 right-4 text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-1 rounded">Salvando Mais!</div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Readmissão em 48h</span>
            <div className="text-3xl font-black text-amber-600 mt-1">3.2%</div>
            <div className="text-[10px] text-slate-400 font-bold mt-1">Alerta se &gt; 5%</div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Identificação Correta</span>
            <div className="text-3xl font-black text-blue-600 mt-1">94%</div>
            <div className="text-[10px] text-slate-400 font-bold mt-1">Meta Interna: 100%</div>
            <div className="absolute bottom-0 left-0 h-1 bg-amber-400 w-[94%]"></div>
          </div>
        </div>

        {/* CHAMADA PARA TENDÊNCIAS TEMPORAIS */}
        <div onClick={() => setActiveView('tendencias')} className="mb-8 bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700 cursor-pointer hover:bg-slate-900 hover:shadow-xl transition-all group flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-1"><TrendingUp className="text-emerald-400" size={24} /> Explorar Gráficos de Tendências Temporais</h3>
            <p className="text-slate-400 text-sm">Analise a evolução histórica da ocupação, mortalidade, dias de VM e outros indicadores ao longo dos meses.</p>
          </div>
          <div className="bg-slate-700 p-3 rounded-full group-hover:translate-x-2 transition-transform"><ArrowRight className="text-emerald-400" size={24} /></div>
        </div>

        {/* SEÇÃO DE GRÁFICOS (RECHARTS) */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-80 flex flex-col">
            <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase flex items-center gap-2"><Activity size={16} className="text-blue-500" /> Total de Dias-Dispositivo</h3>
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
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-80 flex flex-col">
            <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase flex items-center gap-2"><TrendingUp size={16} className="text-emerald-500" /> Distribuição de Desfechos</h3>
            <div className="flex-1 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dataDesfechos} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                    {dataDesfechos.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
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

  // ==========================================
  // VISÃO 2.1: TENDÊNCIAS (FILME)
  // ==========================================
  const renderTendencias = () => {
    
    // Dados simulados expandidos com todos os seus novos indicadores da UTI
    const dataTendencias = [
      { mes: 'Jan', mortalidade: 14.2, smr: 0.95, diasVM: 120, diasCVC: 180, ocupacao: 85.0, giroLeito: 4.8, altas: 58, los: 8.9, readmissao: 4.1, identificacao: 90 },
      { mes: 'Fev', mortalidade: 15.0, smr: 0.98, diasVM: 145, diasCVC: 190, ocupacao: 90.2, giroLeito: 5.0, altas: 60, los: 8.7, readmissao: 4.5, identificacao: 91 },
      { mes: 'Mar', mortalidade: 13.5, smr: 0.90, diasVM: 110, diasCVC: 160, ocupacao: 87.5, giroLeito: 5.1, altas: 62, los: 8.5, readmissao: 3.8, identificacao: 92 },
      { mes: 'Abr', mortalidade: 12.3, smr: 0.85, diasVM: 95,  diasCVC: 150, ocupacao: 88.5, giroLeito: 5.2, altas: 65, los: 8.4, readmissao: 3.2, identificacao: 94 },
      { mes: 'Mai', mortalidade: 11.8, smr: 0.82, diasVM: 88,  diasCVC: 140, ocupacao: 86.0, giroLeito: 5.4, altas: 68, los: 8.1, readmissao: 2.9, identificacao: 96 },
      { mes: 'Jun', mortalidade: 10.5, smr: 0.78, diasVM: 80,  diasCVC: 135, ocupacao: 84.5, giroLeito: 5.6, altas: 72, los: 7.8, readmissao: 2.5, identificacao: 98 },
    ];

    // Dicionário Inteligente: Define o Título e a Cor dependendo do indicador escolhido
    const configIndicadores = {
      ocupacao:      { label: 'Taxa de Ocupação (%)', color: '#3b82f6' }, // Azul
      giroLeito:     { label: 'Giro de Leito (Pacientes/Leito/Mês)', color: '#8b5cf6' }, // Roxo
      los:           { label: 'Tempo Médio de Permanência - LOS (Dias)', color: '#f59e0b' }, // Âmbar
      altas:         { label: 'Total de Altas no Mês', color: '#14b8a6' }, // Teal
      mortalidade:   { label: 'Taxa de Mortalidade Bruta (%)', color: '#ef4444' }, // Vermelho
      smr:           { label: 'SMR (SAPS 3)', color: '#10b981' }, // Esmeralda
      readmissao:    { label: 'Taxa de Readmissão em 48h (%)', color: '#f97316' }, // Laranja
      identificacao: { label: 'Identificação Correta do Paciente (%)', color: '#06b6d4' }, // Ciano
      diasVM:        { label: 'Densidade de Ventilação Mecânica (Dias)', color: '#6366f1' }, // Indigo
      diasCVC:       { label: 'Densidade de CVC (Dias)', color: '#ec4899' }, // Rosa
    };

    // Pega as configurações do indicador atualmente selecionado
    const configAtual = configIndicadores[indicadorTendencia] || configIndicadores['mortalidade'];

    return (
      <div className="animate-fadeIn max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setActiveView('indicadores')} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><TrendingUp className="text-emerald-600" /> Gráficos de Tendências</h2>
            <p className="text-slate-500 text-sm mt-1">Monitore a evolução histórica dos principais indicadores da unidade.</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <div className="flex items-center gap-3">
              <label className="text-sm font-bold text-slate-500 uppercase">Indicador:</label>
              {/* O select agora muda o estado 'indicadorTendencia' em tempo real */}
              <select 
                value={indicadorTendencia}
                onChange={(e) => setIndicadorTendencia(e.target.value)}
                className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 cursor-pointer min-w-[200px]"
              >
                <optgroup label="Operacional e Fluxo">
                  <option value="ocupacao">Taxa de Ocupação (%)</option>
                  <option value="giroLeito">Giro de Leito</option>
                  <option value="los">Tempo Médio (LOS)</option>
                  <option value="altas">Total de Altas</option>
                </optgroup>
                <optgroup label="Desfechos Clínicos">
                  <option value="mortalidade">Taxa de Mortalidade (%)</option>
                  <option value="smr">SMR (SAPS 3)</option>
                  <option value="readmissao">Readmissão em 48h (%)</option>
                  <option value="identificacao">Identificação Correta (%)</option>
                </optgroup>
                <optgroup label="Dispositivos Invasivos">
                  <option value="diasVM">Densidade de VM (Dias)</option>
                  <option value="diasCVC">Densidade de CVC (Dias)</option>
                </optgroup>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-bold text-slate-500 uppercase">Período:</label>
              <div className="flex items-center gap-2">
                <select className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm font-bold text-slate-700 outline-none cursor-pointer"><option>Jan 2026</option></select>
                <span className="text-slate-400 font-bold">até</span>
                <select className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm font-bold text-slate-700 outline-none cursor-pointer"><option>Jun 2026</option></select>
              </div>
            </div>
          </div>
          <button className="w-full md:w-auto bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors">Exportar PDF</button>
        </div>

        {/* O Gráfico muda o Título e a Linha dinamicamente */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 h-[500px] flex flex-col">
          <h3 className="font-black text-slate-800 mb-6 text-lg flex items-center gap-2">
            {configAtual.label} - Evolução
          </h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataTendencias} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 14, fill: '#64748b', fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 14, fill: '#64748b', fontWeight: 600 }} dx={-10} />
                <RechartsTooltip cursor={{ stroke: '#cbd5e1', strokeWidth: 2, strokeDasharray: '5 5' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontWeight: 'bold', color: configAtual.color }} />
                
                {/* A linha muda a cor e os dados baseada na escolha do menu */}
                <Line 
                  type="monotone" 
                  dataKey={indicadorTendencia} 
                  stroke={configAtual.color} 
                  strokeWidth={4} 
                  dot={{ r: 6, fill: configAtual.color, stroke: '#ffffff', strokeWidth: 2 }} 
                  activeDot={{ r: 8, fill: configAtual.color, stroke: '#ffffff', strokeWidth: 3 }} 
                  animationDuration={800}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // VISÃO 3: QUALIDADE E SEGURANÇA
  // ==========================================
  const renderQualidade = () => {
    const dataPareto = [
      { evento: 'Retirada SNE', quantidade: 14, fill: '#f59e0b' },
      { evento: 'Queda do Leito', quantidade: 8, fill: '#ef4444' },
      { evento: 'LPP Adquirida', quantidade: 5, fill: '#8b5cf6' },
      { evento: 'Flebite', quantidade: 3, fill: '#ec4899' },
      { evento: 'Extubação Acidental', quantidade: 1, fill: '#3b82f6' },
    ];

    const dataTimeline = [
      { dia: '01/Abr', eventos: 0 }, { dia: '05/Abr', eventos: 2 }, { dia: '10/Abr', eventos: 1 },
      { dia: '15/Abr', eventos: 5 }, { dia: '20/Abr', eventos: 0 }, { dia: '25/Abr', eventos: 1 },
    ];

    return (
      <div className="animate-fadeIn">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setActiveView('hub')} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><ShieldAlert className="text-red-600" /> Qualidade e Segurança</h2>
            <p className="text-slate-500 text-sm mt-1">Monitoramento de eventos adversos e gestão de riscos.</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex gap-4 items-center">
          <Calendar size={18} className="text-slate-400" />
          <select className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-red-500">
            <option>Abril 2026</option><option>Março 2026</option>
          </select>
          <button className="ml-auto bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">Relatório de Conformidade</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200"><span className="text-[10px] font-bold text-slate-400 uppercase">Total de Notificações</span><div className="text-3xl font-black text-slate-800 mt-1">31</div></div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200"><span className="text-[10px] font-bold text-slate-400 uppercase">Incidência de LPP</span><div className="text-3xl font-black text-red-600 mt-1">2.5%</div><div className="text-[10px] text-slate-400 font-bold mt-1">5 lesões adquiridas</div></div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200"><span className="text-[10px] font-bold text-slate-400 uppercase">Extubação Acidental</span><div className="text-3xl font-black text-blue-600 mt-1">3.1</div><div className="text-[10px] text-slate-400 font-bold mt-1">por 1000 dias-VM</div></div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200"><span className="text-[10px] font-bold text-slate-400 uppercase">Dias Sem Quedas</span><div className="text-3xl font-black text-emerald-600 mt-1">12</div></div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-80 flex flex-col">
            <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase flex items-center gap-2"><AlertCircle size={16} className="text-amber-500" /> Pareto de Intercorrências</h3>
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
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-80 flex flex-col">
            <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase flex items-center gap-2"><Activity size={16} className="text-red-500" /> Curva de Ocorrências (Abril)</h3>
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

  // ==========================================
  // VISÃO 4: AUDITORIA E CONFORMIDADE
  // ==========================================
  const renderAuditoria = () => {
    const dataConformidade = [
      { setor: 'Médico', preenchido: 85, pendente: 15 },
      { setor: 'Enfermagem', preenchido: 96, pendente: 4 },
      { setor: 'Fisioterapia', preenchido: 90, pendente: 10 },
    ];

    const alertasPendencias = [
      { id: 1, leito: '02', paciente: 'João S. (45a)', pendencia: 'Evolução Médica Diária ausente', tempo: 'Atrasado > 24h', gravidade: 'alta' },
      { id: 2, leito: '05', paciente: 'Maria C. (72a)', pendencia: 'Escala de Braden não atualizada', tempo: 'Venceu às 14h', gravidade: 'media' },
      { id: 3, leito: '08', paciente: 'Carlos R. (59a)', pendencia: 'Falta assinar alta de ontem', tempo: 'Pendente Doc', gravidade: 'alta' },
      { id: 4, leito: '10', paciente: 'Ana P. (81a)', pendencia: 'Checklist de CVC em branco', tempo: 'D2 do Acesso', gravidade: 'baixa' },
    ];

    return (
      <div className="animate-fadeIn">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setActiveView('hub')} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><FileCheck className="text-amber-600" /> Auditoria de Prontuários</h2>
            <p className="text-slate-500 text-sm mt-1">Conformidade de preenchimento, escalas e checagem de prescrições.</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex gap-4 items-center">
          <Clock size={18} className="text-slate-400" />
          <select className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-amber-500">
            <option>Plantão Atual (Hoje)</option><option>Consolidado do Mês</option>
          </select>
          <button className="ml-auto bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">Notificar Equipe</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200"><span className="text-[10px] font-bold text-slate-400 uppercase">Adesão Global (Prontuário)</span><div className="text-3xl font-black text-emerald-600 mt-1">90%</div><div className="text-[10px] text-slate-400 font-bold mt-1">Meta: &gt; 95%</div></div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200"><span className="text-[10px] font-bold text-slate-400 uppercase">Evoluções Pendentes</span><div className="text-3xl font-black text-red-600 mt-1">3</div><div className="text-[10px] text-slate-400 font-bold mt-1">Das últimas 24h</div></div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200"><span className="text-[10px] font-bold text-slate-400 uppercase">Assinaturas Faltantes</span><div className="text-3xl font-black text-amber-500 mt-1">12</div><div className="text-[10px] text-slate-400 font-bold mt-1">Documentos abertos</div></div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200"><span className="text-[10px] font-bold text-slate-400 uppercase">Prescrições Checadas</span><div className="text-3xl font-black text-blue-600 mt-1">98%</div><div className="text-[10px] text-slate-400 font-bold mt-1">Pela Enfermagem</div></div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-80 flex flex-col">
            <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase flex items-center gap-2"><CheckCircle size={16} className="text-emerald-500" /> Adesão ao Preenchimento (%)</h3>
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
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-80 flex flex-col overflow-hidden">
            <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase flex items-center gap-2"><AlertTriangle size={16} className="text-amber-500" /> Radar de Pendências Críticas</h3>
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
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // VISÃO 5: GESTÃO DE EQUIPE
  // ==========================================
  const renderEquipe = () => {
    
    if (subViewEquipe === 'menu') {
      return (
        <div className="animate-fadeIn">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setActiveView('hub')} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors">
              <ArrowLeft size={20} className="text-slate-700" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Users className="text-emerald-600" /> Gestão de Equipe e Sistema</h2>
              <p className="text-slate-500 text-sm mt-1">Selecione o módulo administrativo que deseja acessar.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200"><span className="text-[10px] font-bold text-slate-400 uppercase">Equipe Cadastrada</span><div className="text-3xl font-black text-slate-800 mt-1">45</div></div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-emerald-200 bg-emerald-50/30"><span className="text-[10px] font-bold text-emerald-600 uppercase">Usuários Ativos</span><div className="text-3xl font-black text-emerald-700 mt-1">12</div></div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-amber-200 bg-amber-50/30"><span className="text-[10px] font-bold text-amber-600 uppercase">Pendências RH</span><div className="text-3xl font-black text-amber-700 mt-1">2</div></div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-blue-200 bg-blue-50/30"><span className="text-[10px] font-bold text-blue-600 uppercase">Furos na Escala</span><div className="text-3xl font-black text-blue-700 mt-1">0</div></div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <button onClick={() => setSubViewEquipe('acessos')} className="bg-white p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-emerald-500 hover:shadow-md transition-all group text-left flex flex-col h-full">
              <div className="bg-emerald-100 w-12 h-12 rounded-xl flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform"><Shield size={24} /></div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Controle de Perfis</h3>
              <p className="text-slate-500 text-sm flex-grow">Cadastre a equipe, gerencie senhas e defina os acessos e vínculos de cada profissional.</p>
            </button>
            <button onClick={() => setSubViewEquipe('escalas')} className="bg-white p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-blue-500 hover:shadow-md transition-all group text-left flex flex-col h-full">
              <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform"><CalendarDays size={24} /></div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Gestão de Escalas</h3>
              <p className="text-slate-500 text-sm flex-grow">Monte o espelho de plantão (Médico, Enf e Fisio) e acompanhe trocas.</p>
            </button>
            <button onClick={() => setSubViewEquipe('config')} className="bg-white p-6 rounded-2xl shadow-sm border-2 border-transparent hover:border-slate-500 hover:shadow-md transition-all group text-left flex flex-col h-full">
              <div className="bg-slate-200 w-12 h-12 rounded-xl flex items-center justify-center text-slate-700 mb-4 group-hover:scale-110 transition-transform"><Settings size={24} /></div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Configurações da UTI</h3>
              <p className="text-slate-500 text-sm flex-grow">Altere o número de leitos, mapeie áreas e ajuste parâmetros gerais.</p>
            </button>
          </div>
        </div>
      );
    }

    if (subViewEquipe === 'acessos') {
      return (
        <div className="animate-fadeIn">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setSubViewEquipe('menu')} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors">
              <ArrowLeft size={20} className="text-slate-700" />
            </button>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Shield className="text-emerald-600" /> Controle de Perfis e Acessos</h2>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 min-h-[500px]">
            <ModuloAdmin userProfile={userProfile} />
          </div>
        </div>
      );
    }

    if (subViewEquipe === 'escalas') {
      const categorias = [
        { id: 'Médico', icon: <Activity size={16} /> }, { id: 'Enfermeiro', icon: <Users size={16} /> },
        { id: 'Téc. Enfermagem', icon: <Users size={16} /> }, { id: 'Fisioterapeuta', icon: <Activity size={16} /> },
        { id: 'Fonoaudiólogo', icon: <Activity size={16} /> }, { id: 'Nutricionista', icon: <Activity size={16} /> },
        { id: 'Recepção', icon: <Users size={16} /> }, { id: 'Visão Geral', icon: <Shield size={16} /> },
      ];

      return (
        <div className="animate-fadeIn pb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setSubViewEquipe('menu')} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors">
                <ArrowLeft size={20} className="text-slate-700" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><CalendarDays className="text-blue-600" /> Radar de Plantão</h2>
                <p className="text-slate-500 text-sm">Controle diário e mensal das equipes da UTI.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
              <input type="date" value={dataSelecionada} onChange={(e) => setDataSelecionada(e.target.value)} className="text-sm font-bold text-slate-700 p-2 outline-none border-r border-slate-100" />
              <button onClick={() => setModoVisao('dia')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${modoVisao === 'dia' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>DIA</button>
              <button onClick={() => setModoVisao('mes')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${modoVisao === 'mes' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>MÊS</button>
            </div>
          </div>

          <div className="flex overflow-x-auto gap-2 mb-6 no-scrollbar pb-2">
            {categorias.map(cat => (
              <button key={cat.id} onClick={() => setCategoriaAtiva(cat.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border-2 ${categoriaAtiva === cat.id ? 'bg-white border-blue-500 text-blue-600 shadow-sm' : 'bg-slate-100 border-transparent text-slate-500 hover:bg-slate-200'}`}>
                {cat.icon} {cat.id}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            {categoriaAtiva === 'Visão Geral' ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                 <div className="bg-slate-800 p-4 text-white font-bold text-sm uppercase tracking-wider flex justify-between">
                   <span>Plantão Consolidado</span><span className="text-blue-400">{formatarDataBR(dataSelecionada)}</span>
                 </div>
                 <div className="p-6 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categorias.filter(c => c.id !== 'Visão Geral').map(cat => {
                      const profissionais = consolidadoDia[cat.id] || [];
                      return (
                        <div key={cat.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex flex-col">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3 flex justify-between items-center">{cat.id} {profissionais.length > 0 && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{profissionais.length}</span>}</h4>
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
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4 flex justify-between items-center">Escala de {categoriaAtiva} <span className="text-xs text-slate-400 font-normal">Dia {dataSelecionada.split('-')[2]}</span></h3>
                  <div className="space-y-4">
                    {isLoadingPlantoes && <div className="p-8 text-center text-slate-400 font-bold animate-pulse bg-slate-50 rounded-xl border border-dashed border-slate-200"><Loader2 className="animate-spin inline mr-2" size={20} /> A carregar a escala da base de dados...</div>}
                    {!isLoadingPlantoes && plantoesDoDia.length === 0 && <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">Nenhum profissional escalado para este dia nesta categoria.</div>}
                    {!isLoadingPlantoes && plantoesDoDia.map((plantao) => {
                      let corBg = 'bg-slate-50'; let corBorder = 'border-slate-100'; let corText = 'text-slate-600';
                      if (plantao.sigla === 'V') { corBg = 'bg-emerald-50'; corBorder = 'border-emerald-100'; corText = 'text-emerald-600'; }
                      else if (plantao.sigla === 'N') { corBg = 'bg-indigo-50'; corBorder = 'border-indigo-100'; corText = 'text-indigo-600'; }
                      else if (plantao.sigla.includes('D') || plantao.sigla.includes('M') || plantao.sigla.includes('T')) { corBg = 'bg-blue-50'; corBorder = 'border-blue-100'; corText = 'text-blue-600'; }

                      return (
                        <div key={plantao.id} className={`p-4 ${corBg} border ${corBorder} rounded-xl relative group`}>
                          <span className={`text-[10px] font-bold ${corText} uppercase`}>{plantao.turno} ({plantao.horario})</span>
                          <div className="text-lg font-black text-slate-800 mt-1">{plantao.nome}</div>
                          <button onClick={() => abrirModalTroca(`${plantao.turno} (${plantao.horario})`, plantao.nome)} className={`absolute top-4 right-4 z-20 p-2 bg-white/50 hover:bg-white rounded-lg shadow-sm ${corText} transition-all cursor-pointer border ${corBorder}`} title="Substituir Plantonista">
                            <Settings size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <ImportadorEscala categoria={categoriaAtiva} />
              </div>
            ) : (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
                 <div className="flex justify-between items-center mb-4">
                   <h3 className="font-bold text-slate-800">Grade Mensal - {categoriaAtiva}</h3>
                   <div className="flex items-center gap-2">
                     <span className="text-xs font-bold text-slate-500 uppercase">Mês de Referência:</span>
                     <input type="month" value={dataSelecionada.substring(0, 7)} onChange={(e) => setDataSelecionada(e.target.value + "-01")} className="p-2 border border-slate-200 bg-slate-50 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-blue-500" />
                   </div>
                 </div>

                 <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="p-2 border border-slate-200 font-bold text-slate-500">Profissional</th>
                        {[...Array(31)].map((_, i) => <th key={i} className="p-1 border border-slate-200 font-bold text-slate-500 text-center w-8">{(i + 1).toString().padStart(2, '0')}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingMes && <tr><td colSpan="32" className="p-8 text-center text-slate-400 animate-pulse">A carregar o mês completo...</td></tr>}
                      {!isLoadingMes && Object.keys(plantoesDoMes).length === 0 && <tr><td colSpan="32" className="p-8 text-center text-slate-400">Nenhum plantão encontrado para {dataSelecionada.substring(0,7)}.</td></tr>}
                      {!isLoadingMes && Object.entries(plantoesDoMes).map(([nome, dias]) => (
                        <tr key={nome} className="hover:bg-slate-50 border-b border-slate-100">
                          <td className="p-2 border-r border-slate-200 font-bold text-slate-700 whitespace-nowrap text-[10px] uppercase">{nome}</td>
                          {[...Array(31)].map((_, i) => {
                            const diaStr = (i + 1).toString().padStart(2, '0');
                            const sigla = dias[diaStr]; 
                            let corLetra = 'text-slate-200'; let corFundo = '';
                            if (sigla) {
                              if (sigla === 'V') { corLetra = 'text-emerald-700'; corFundo = 'bg-emerald-50'; } 
                              else if (sigla === 'N') { corLetra = 'text-indigo-700'; corFundo = 'bg-indigo-50'; } 
                              else if (sigla.includes('D') || sigla.includes('M') || sigla.includes('T')) { corLetra = 'text-blue-700'; corFundo = 'bg-blue-50'; } 
                              else { corLetra = 'text-slate-700'; corFundo = 'bg-slate-50'; }
                            }
                            return <td key={i} className={`p-1 border-r border-slate-200 text-center font-black ${corLetra} ${corFundo}`}>{sigla || '-'}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                 </table>
                 <p className="text-right text-[10px] text-slate-400 mt-4 font-bold uppercase">Total de {Object.keys(plantoesDoMes).length} profissionais listados em {dataSelecionada.substring(0,7)}</p>
              </div>
            )}
          </div>

          {/* MODAL DE TROCA DE PLANTÃO */}
          {isEditModalOpen && plantaoEditado && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-fadeIn">
                <div className="bg-slate-800 p-5 flex justify-between items-center text-white">
                  <div><h3 className="font-black text-lg">Alterar Plantonista</h3><p className="text-slate-300 text-xs">Substituição Manual</p></div>
                  <button onClick={() => setIsEditModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors text-white font-bold">FECHAR</button>
                </div>
                <div className="p-6 space-y-4">
                  <div><div className="text-xs font-bold text-slate-400 uppercase">Turno e Horário</div><div className="font-bold text-slate-700">{plantaoEditado.turno}</div></div>
                  <div><div className="text-xs font-bold text-slate-400 uppercase">Plantonista Original (Excel)</div><div className="text-sm text-slate-500 line-through">{plantaoEditado.nomeAtual}</div></div>
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-sm font-bold text-blue-600 mb-2">Novo Plantonista Assumindo:</label>
                    <input type="text" value={novoPlantonista} onChange={(e) => setNovoPlantonista(e.target.value)} placeholder="Ex: Dr. Carlos Silva" className="w-full p-3 bg-blue-50 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 font-bold" />
                  </div>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                  <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Cancelar</button>
                  <button onClick={salvarTrocaPlantao} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm">Confirmar Troca</button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (subViewEquipe === 'config') {
      return (
        <div className="animate-fadeIn pb-8">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setSubViewEquipe('menu')} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors"><ArrowLeft size={20} className="text-slate-700" /></button>
            <div><h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Settings className="text-slate-600" /> Parâmetros e Configurações da Unidade</h2><p className="text-slate-500 text-sm mt-1">Ajuste o espelho físico da UTI e as regras de alertas do sistema.</p></div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 md:p-8 grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2"><Bed className="text-emerald-500" size={20} /> Estrutura Física</h3>
                <div><label className="block text-sm font-bold text-slate-700 mb-1">Capacidade Total (Número de Leitos)</label><input type="number" defaultValue={10} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" /><p className="text-[10px] text-slate-500 mt-1">Este número é a base para o cálculo da Taxa de Ocupação no Painel Gestor.</p></div>
                <div><label className="block text-sm font-bold text-slate-700 mb-1">Leitos de Isolamento</label><input type="number" defaultValue={2} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" /></div>
              </div>
              <div className="space-y-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2"><Calculator className="text-blue-500" size={20} /> Protocolos Assistenciais</h3>
                <div><label className="block text-sm font-bold text-slate-700 mb-1">Escore de Gravidade Padrão</label><select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"><option>SAPS 3 (Recomendado)</option><option>APACHE II</option></select></div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2 mt-8"><Bell className="text-amber-500" size={20} /> Alertas Automáticos</h3>
                <div className="flex items-center justify-between p-4 border border-amber-100 bg-amber-50 rounded-xl"><div><div className="font-bold text-slate-800 text-sm">Alerta de Lotação</div></div><div className="flex items-center gap-2"><input type="number" defaultValue={90} className="w-16 p-2 text-center font-bold text-amber-700 bg-white border border-amber-200 rounded-lg outline-none" /><span className="font-bold text-amber-700">%</span></div></div>
              </div>
            </div>
            <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-end">
              <button onClick={() => { alert("✅ Configurações salvas."); setSubViewEquipe('menu'); }} className="bg-slate-800 hover:bg-slate-900 text-white px-8 py-3 rounded-xl font-bold transition-colors flex items-center gap-2"><Save size={20} /> Salvar Configurações</button>
            </div>
          </div>
        </div>
      );
    }
  };

  // ==========================================
  // RENDERIZAÇÃO PRINCIPAL DO COMPONENTE
  // ==========================================
  return (
    <div className="p-4 md:p-8 min-h-screen bg-slate-50">
      {activeView === 'hub' && renderHub()}
      {activeView === 'indicadores' && renderIndicadores()}
      {activeView === 'tendencias' && renderTendencias()}
      {activeView === 'qualidade' && renderQualidade()}
      {activeView === 'auditoria' && renderAuditoria()}
      {activeView === 'equipe' && renderEquipe()}
    </div>
  );
};

export default GestorDashboard;