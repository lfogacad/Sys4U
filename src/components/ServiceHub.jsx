import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Stethoscope, 
  Settings, 
  Activity, 
  Truck, 
  ClipboardList 
} from 'lucide-react';

const ServiceHub = ({ userProfile }) => {
  const navigate = useNavigate();

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
      id: 'samu',
      titulo: 'Regulação SAMU',
      descricao: 'Gestão de frotas e chamados de urgência.',
      icon: <Truck size={32} />,
      cor: 'bg-red-500',
      path: '/samu'
    },
    {
      id: 'admin',
      titulo: 'Painel Gestor',
      descricao: 'Relatórios, auditoria e gestão de usuários.',
      icon: <Settings size={32} />,
      cor: 'bg-slate-700',
      path: '/admin',
      somenteAdmin: true
    }
  ];

  // Filtra módulos se não for admin/desenvolvedor
 const modulosVisiveis = modulos.filter(m => !m.somenteAdmin || userProfile?.perfil === 'Administrador' || userProfile?.perfil === 'Desenvolvedor');

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
            className="bg-white p-6 rounded-3xl shadow-sm border-2 border-transparent hover:border-emerald-500 hover:shadow-xl transition-all text-left group"
          >
            <div className={`${modulo.cor} text-white w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
              {modulo.icon}
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">{modulo.titulo}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              {modulo.descricao}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ServiceHub;