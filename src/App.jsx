import './index.css';
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./config/firebase";

// Imports dos Componentes
import HeaderGlobal from "./components/HeaderGlobal";
import ServiceHub from "./components/ServiceHub";
import TelaLogin from "./components/TelaLogin";
import TelaCadastro from "./components/TelaCadastro";
import ModuloAdmin from "./components/ModuloAdmin";
import ModuloUTI from "./components/ModuloUTI"; 
import TrocaSenhaObrigatoria from "./components/TrocaSenhaObrigatoria";
import SeletorUnidade from "./components/SeletorUnidade";
// Nota: Se o ModuloRecepcao ainda estava solto, crie um arquivo para ele e importe aqui:
// import ModuloRecepcao from "./components/ModuloRecepcao"; 

// Componente de Segurança (Disjuntor)
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
          <div className="bg-white p-8 rounded-3xl shadow-xl border-t-4 border-red-500 max-w-md">
            <h1 className="text-xl font-bold mb-2">Erro Crítico</h1>
            <pre className="text-[10px] bg-red-50 p-3 rounded-lg text-red-600 mb-4 overflow-auto">{this.state.error?.message}</pre>
            <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">Recarregar Sistema</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppRouter = () => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [unidadeAtiva, setUnidadeAtiva] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const docRef = doc(db, "usuarios", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserProfile(data);
            if (data.vinculos && data.vinculos.length === 1) {
              setUnidadeAtiva(data.vinculos[0]);
            }
          }
        } catch (error) {
          console.error("Erro ao buscar perfil:", error);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setUnidadeAtiva(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => { 
    await signOut(auth); 
    window.location.href = "/"; 
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-bold text-emerald-600 animate-pulse">Sincronizando...</div>;
  }

  if (!user) {
    // Retorna para a sua tela de Login/Cadastro
    return <TelaLogin isLoading={isLoading} />; 
  }

  if (userProfile?.isFirstLogin) {
    return <TrocaSenhaObrigatoria user={user} userProfile={userProfile} />;
  }

  if (!unidadeAtiva && userProfile?.perfil !== "Administrador") {
    return <SeletorUnidade userProfile={userProfile} onSelectUnit={setUnidadeAtiva} />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <HeaderGlobal user={userProfile} unidade={unidadeAtiva} onSignOut={handleLogout} />
        <main className="p-6">
          <Routes>
            <Route path="/hub" element={userProfile?.perfil === "Administrador" ? <ServiceHub userProfile={userProfile} /> : <Navigate to="/" />} />
            <Route path="/uti/*" element={<ModuloUTI user={user} userProfile={userProfile} unidadeAtiva={unidadeAtiva} handleLogout={handleLogout} />} />
            <Route path="/admin" element={userProfile?.perfil === "Administrador" ? <ModuloAdmin userProfile={userProfile} /> : <Navigate to="/" />} />
            
            {/* Se você tiver o ModuloRecepcao em um arquivo separado, descomente a linha abaixo */}
            {/* <Route path="/recepcao" element={<ModuloRecepcao userProfile={userProfile} unidadeAtiva={unidadeAtiva} />} /> */}

            <Route path="/" element={<Navigate to={userProfile?.perfil === "Administrador" ? "/hub" : "/uti"} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  );
}