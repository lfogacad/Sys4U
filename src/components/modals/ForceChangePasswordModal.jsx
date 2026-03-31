import React from 'react';
import { ShieldCheck } from 'lucide-react';

const ForceChangePasswordModal = ({
  showForceChangePassword,
  newPassword,
  setNewPassword,
  confirmNewPassword,
  setConfirmNewPassword,
  changePasswordError,
  handleForceChangePassword,
  isLoading
}) => {
  if (!showForceChangePassword) return null;

  return (
    <div className="fixed inset-0 bg-slate-900 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
        <ShieldCheck size={48} className="mx-auto text-orange-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Primeiro Acesso</h2>
        <p className="text-sm text-gray-500 mb-4">
          Defina sua senha pessoal.
        </p>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Nova Senha (min 6)"
          className="w-full p-2 border rounded mb-2"
        />
        <input
          type="password"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          placeholder="Confirmar"
          className="w-full p-2 border rounded mb-4"
        />
        {changePasswordError && (
          <p className="text-red-500 text-xs mb-2">{changePasswordError}</p>
        )}
        <button
          onClick={handleForceChangePassword}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 transition-colors"
        >
          {isLoading ? "Salvando..." : "Definir Senha"}
        </button>
      </div>
    </div>
  );
};

export default ForceChangePasswordModal;