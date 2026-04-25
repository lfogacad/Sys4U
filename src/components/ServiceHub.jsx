import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Settings, 
  Activity 
} from 'lucide-react'; // Removemos o ícone do Truck (SAMU) e ClipboardList

const ServiceHub = ({ userProfile }) => {
  const navigate = useNavigate();

  // Mantemos a leitura dupla do crachá para não falhar
  const userRole = userProfile?.perfil || userProfile?.role;

  const modulos = [
    {
      id: 'recepcao',
      titulo: 'Recepção e Triagem',
      descricao: 'Cadastro de pacientes e classificação de risco.',
      icon: <Users size={32} />,
      cor: 'bg-blue-500',
      path: '/recepcao'
    },
    {
      id: 'uti',
      titulo: 'UTI Adulto',
      descricao: 'Monitoramento crítico e mapa de leitos.',
      icon: <Activity size={32} />,
      cor: 'bg-emerald-500',
      path: '/uti'
    },
    {
      id: 'admin',
      titulo: 'Painel Gestor',
      descricao: 'Relatórios, auditoria e gestão de usuários.',
      icon: <Settings size={32} />,
      cor: 'bg-slate-700',
      path: '/admin'
    }
  ];

  // Filtra os módulos dinamicamente com base no crachá
  const modulosVisiveis = modulos.filter(modulo => {
    // 1. REGRA DA RECEPÇÃO: Só enxerga a própria recepção e nada mais
    if (userRole === 'Recepção') {
      return modulo.id === 'recepcao';
    }

    // 2. REGRA DO PAINEL GESTOR: Lista VIP de quem pode acessar
    if (modulo.id === 'admin') {
      const perfisGestao = [
        'Desenvolvedor',
        'Diretor Administrativo',
        'Gerente de Enfermagem',
        'RT da Fisioterapia',
        'CCIH UTI',
        'CCIH Geral',
        'Administrador' // Mantido por retrocompatibilidade caso tenha algum antigo
      ];
      return perfisGestao.includes(userRole);
    }

    // 3. REGRA GERAL: Para a equipe clínica (Médico, Enf, Físio, etc)
    // Eles verão Recepção e UTI normalmente, pois passam direto pelas travas acima
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-800">Painel de Módulos</h2>
        <p className="text-slate-500">Selecione o serviço que deseja acessar agora.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modulosVisiveis.map((modulo) => (
          <button
            key={modulo.id}
            onClick={() => navigate(modulo.path)}
            className="bg-white p-6 rounded-3xl shadow-sm border-2 border-transparent hover:border-emerald-500 hover:shadow-xl transition-all text-left group flex flex-col h-full"
          >
            <div className={`${modulo.cor} text-white w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
              {modulo.icon}
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">{modulo.titulo}</h3>
            <p className="text-sm text-slate-500 leading-relaxed flex-grow">
              {modulo.descricao}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ServiceHub;