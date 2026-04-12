import React from 'react';
import { Hospital, Building2, ArrowRight, UserCircle } from 'lucide-react';

const SeletorUnidade = ({ userProfile, onSelectUnit }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-white rounded-full shadow-sm mb-4">
            <UserCircle size={48} className="text-emerald-500" />
          </div>
          <h1 className="text-2xl font-black text-slate-800">Olá, {userProfile.nome}</h1>
          <p className="text-slate-500">Selecione a unidade de plantão hoje:</p>
        </div>

        <div className="space-y-4">
          {userProfile.vinculos.map((vinculo, index) => (
            <button
              key={index}
              onClick={() => onSelectUnit(vinculo)}
              className="w-full bg-white p-5 rounded-2xl shadow-sm border-2 border-transparent hover:border-emerald-500 hover:shadow-md transition-all text-left flex items-center gap-4 group"
            >
              <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                {vinculo.instituicaoNome.includes('Hospital') ? <Hospital size={24} /> : <Building2 size={24} />}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800">{vinculo.instituicaoNome}</h3>
                <p className="text-sm text-slate-500">{vinculo.unidadeNome} • <span className="text-emerald-600 font-semibold">{vinculo.perfil}</span></p>
              </div>
              <ArrowRight size={20} className="text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
            </button>
          ))}
        </div>

        <div className="mt-8 text-center text-xs text-slate-400">
          Sys4U Ecossistema v2.0 • Registro Profissional: {userProfile.conselho} {userProfile.numeroConselho}
        </div>
      </div>
    </div>
  );
};

export default SeletorUnidade;