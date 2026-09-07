import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface DatasetInfo {
  id: string;
  empresa: string;
  rubro: string;
  metodologia: string;
  ingresos: number;
  costos: number;
  ganancia_neta?: number;
  source_filename?: string;
}

interface UserDatasetRelation {
  id: string;
  estado: string;
  is_branch: boolean;
  datasets: DatasetInfo | null;
}

export const MisDatasets: React.FC = () => {
  const [userDatasets, setUserDatasets] = useState<UserDatasetRelation[]>([]);
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadDatasets = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        // 1. Obtener la sesión actual de la autenticación
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          setErrorMsg('No hay una sesión de usuario activa.');
          return;
        }

        setUserEmail(user.email || '');

        // 2. Consultar user_datasets uniendo con la relación de datasets
        const { data, error } = await supabase
          .from('user_datasets')
          .select(`
            id,
            estado,
            is_branch,
            datasets:dataset_origen_id (
              id,
              empresa,
              rubro,
              metodologia,
              ingresos,
              costos,
              ganancia_neta,
              source_filename
            )
          `)
          .eq('user_id', user.id);

        if (error) {
          throw error;
        }

        // Formatear la respuesta asegurando el tipado del JOIN
        const formattedData = (data || []).map((item: any) => ({
          id: item.id,
          estado: item.estado,
          is_branch: item.is_branch,
          datasets: Array.isArray(item.datasets) ? item.datasets[0] : item.datasets,
        }));

        setUserDatasets(formattedData);
      } catch (err: any) {
        console.error('Error al obtener los datasets:', err);
        setErrorMsg(err.message || 'Error al cargar la información.');
      } finally {
        setLoading(false);
      }
    };

    loadDatasets();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-400">
        Cargando datasets del usuario...
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-4 m-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg">
        {errorMsg}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Encabezado con información del usuario */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-900 border border-slate-800 rounded-xl">
        <div>
          <h1 className="text-xl font-bold text-white">Mis Datasets Asignados</h1>
          <p className="text-sm text-slate-400">Sesión actual: <span className="text-blue-400">{userEmail}</span></p>
        </div>
        <div className="px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-full text-blue-300 text-sm font-semibold self-start sm:self-auto">
          Total: {userDatasets.length} {userDatasets.length === 1 ? 'Dataset' : 'Datasets'}
        </div>
      </div>

      {/* Listado / Grid de Datasets */}
      {userDatasets.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/50 border border-slate-800 rounded-xl text-slate-400">
          No tienes ningún dataset ni CSV asignado a tu cuenta.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {userDatasets.map((item) => {
            const ds = item.datasets;
            return (
              <div 
                key={item.id} 
                className="p-5 bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all rounded-xl space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white text-lg">
                      {ds?.empresa || 'Dataset Sin Nombre'}
                    </h3>
                    <span className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                      {item.estado}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">
                    <span className="font-medium text-slate-300">Archivo:</span> {ds?.source_filename || 'N/A'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                    <div className="p-2 bg-slate-800/50 rounded">
                      <span className="text-slate-400 block">Rubro</span>
                      <span className="text-slate-200 font-medium">{ds?.rubro || '-'}</span>
                    </div>
                    <div className="p-2 bg-slate-800/50 rounded">
                      <span className="text-slate-400 block">Metodología</span>
                      <span className="text-slate-200 font-medium">{ds?.metodologia || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Ingresos: ${ds?.ingresos?.toLocaleString()}</span>
                  <span className="text-slate-400">Costos: ${ds?.costos?.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};