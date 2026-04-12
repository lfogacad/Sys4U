import React from 'react';
import { LogOut, Hospital, UserCircle } from 'lucide-react';

const HeaderGlobal = ({ user, unidade, onSignOut }) => {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
      {/* Lado Esquerdo: Logo e Unidade */}
      <div className="flex items-center gap-4">
        <div className="bg-emerald-600 text-white p-2 rounded-xl shadow-sm">
          <Hospital size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Sys4U</h1>
          {unidade ? (
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
              {unidade.instituicaoNome} • {unidade.unidadeNome}
            </p>
          ) : (
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Ecossistema de Saúde
            </p>
          )}
        </div>
      </div>

      {/* Lado Direito: Médico e Logout */}
      <div className="flex items-center gap-6">
        {user && (
          <div className="flex items-center gap-3 border-r border-slate-200 pr-6 hidden md:flex">
            <div className="text-right">
              <p className="text-sm font-bold text-slate-800">{user.nome}</p>
              <p className="text-xs text-slate-500 font-medium">{user.perfil} | {user.numeroConselho}</p>
            </div>
            <UserCircle size={36} className="text-slate-300" />
          </div>
        )}
        
        <button 
          onClick={onSignOut}
          className="flex items-center gap-2 text-slate-400 hover:text-red-500 font-bold transition-colors"
          title="Sair do Sistema"
        >
          <LogOut size={20} />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
};

export default HeaderGlobal;