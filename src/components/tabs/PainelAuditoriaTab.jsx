import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from "../../config/firebase";
import { ShieldAlert, Search, Clock, User, Bed, Activity } from 'lucide-react';

export default function PainelAuditoriaTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        
        // 1. Aponta para a coleção EXATA do seu Firebase
        const logsRef = collection(db, "logs"); 
        
        // 2. Ordena pelo campo exato de data que o senhor tem ("data")
        const q = query(logsRef, orderBy("data", "desc"), limit(150));
        
        const snapshot = await getDocs(q);
        const logData = snapshot.docs.map(doc => {
          const d = doc.data();
          
          // 3. Traduz os dados do Firebase para o que a tela espera ver
          return {
            id: doc.id,
            acao: d.acao || "Ação não especificada",
            utilizador: d.usuario || "Usuário Desconhecido", // Puxa do seu campo 'usuario'
            perfil: d.perfil || "Sem perfil",
            paciente: d.pacienteId || "N/A", // Puxa do seu campo 'pacienteId'
            leito: d.leito || "Geral", 
            detalhes: d.detalhes || d.conselho || "", 
            // Converte a sua data ISO do Firebase para o formato brasileiro
            dataLocalFormata: d.data ? new Date(d.data).toLocaleString('pt-BR') : "Data não registada",
            ...d
          };
        });
        
        setLogs(logData);
      } catch (error) {
        console.error("Erro ao buscar auditoria:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const termo = searchTerm.toLowerCase();
    return (
      (log.acao && log.acao.toLowerCase().includes(termo)) ||
      (log.utilizador && log.utilizador.toLowerCase().includes(termo)) ||
      (log.paciente && log.paciente.toLowerCase().includes(termo)) ||
      (log.leito && log.leito.toLowerCase().includes(termo))
    );
  });

  return (
    <div className="bg-white rounded-xl flex flex-col shadow-sm border border-slate-200 overflow-hidden animate-fadeIn h-[600px]">
      
      {/* BARRA DE PESQUISA */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="text-slate-700" size={20} />
          <h3 className="font-bold text-slate-700">Caixa Preta de Auditoria</h3>
        </div>
        <div className="relative w-full sm:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm shadow-sm transition-all"
            placeholder="Filtrar por enfermeiro, médico, paciente, leito..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* TABELA DE LOGS (CORPO COM ROLAGEM) */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
            <Activity className="animate-pulse" size={40} />
            <p className="font-medium animate-pulse text-sm">A extrair dados criptografados do Firebase...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <ShieldAlert size={48} className="mb-4 opacity-20" />
            <p className="text-sm">Nenhum registo de auditoria encontrado para esta pesquisa.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div key={log.id} className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col md:flex-row gap-4 hover:shadow-md transition-shadow">
                
                {/* DATA E HORA */}
                <div className="md:w-40 shrink-0 border-r border-slate-100 pr-3">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                    <Clock size={12} /> Momento da Ação
                  </div>
                  <div className="text-xs font-semibold text-slate-700">
                    {log.dataLocalFormata || "Data não registada"}
                  </div>
                </div>

                {/* AÇÃO E DETALHES */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded ${
                      log.acao.includes("DESTRAVAMENTO") || log.acao.includes("ALTA ANULADA") || log.acao.includes("APAGADA") 
                      ? 'bg-red-100 text-red-700 border border-red-200' 
                      : log.acao.includes("ADMISSÃO") || log.acao.includes("SAÍDA") 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                    }`}>
                      {log.acao}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium mt-1.5 leading-relaxed">
                    {log.detalhes}
                  </p>
                </div>

                {/* METADADOS (USUÁRIO E PACIENTE) */}
                <div className="md:w-56 shrink-0 bg-slate-50 rounded p-2 text-[11px] space-y-1.5 border border-slate-100">
                  <div className="flex items-start gap-1.5">
                    <User size={12} className="text-slate-400 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-700">{log.utilizador}</p>
                      <p className="text-[9px] text-slate-400 uppercase">{log.perfil || "Perfil não identificado"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5 pt-1.5 border-t border-slate-200">
                    <Bed size={12} className="text-slate-400 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-700">{log.leito}</p>
                      <p className="text-slate-500 truncate max-w-[130px]" title={log.paciente}>{log.paciente}</p>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}