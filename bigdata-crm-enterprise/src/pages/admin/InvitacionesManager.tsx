import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { KeyRound, Copy, Check, Shield, UserCheck, Link as LinkIcon, Eye, EyeOff, Database, Edit3, X, GitFork } from 'lucide-react';
import { sendInvitationEmail } from '../../lib/emailService';

interface Invitation {
  id: string;
  email: string;
  rol: string;
  permisos: string[];
  codigo: string;
  usado: boolean;
  created_at: string;
}

interface Dataset {
  id: string;
  codigo_num?: number | string;
  empresa?: string;
  source_filename?: string;
  nombre?: string;
  filename?: string;
}

const ADMIN_EMAIL = 'darkkrisalix616@gmail.com';

export function InvitationsManager() {
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState('PRACTICANTE');
  const [selectedModulo, setSelectedModulo] = useState('bigdata');
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>([]);
  const [invitaciones, setInvitaciones] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [visibleCodes, setVisibleCodes] = useState<Record<string, boolean>>({});

  const [editingInvitation, setEditingInvitation] = useState<Invitation | null>(null);
  const [editDatasets, setEditDatasets] = useState<string[]>([]);

  const availablePermissions = [
    { id: 'bigdata', label: 'Big Data & Analytics' },
    { id: 'documentos', label: 'Documentación' },
    { id: 'permisos', label: 'Admin' },
  ];

  const fetchInvitations = async () => {
    const { data, error } = await supabase
      .from('invitaciones')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const filteredData = (data as Invitation[]).filter(
        (inv) => inv.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
      );
      setInvitaciones(filteredData);
    }
  };

  const fetchDatasets = async () => {
    setLoadingDatasets(true);
    const { data, error } = await supabase
      .from('datasets')
      .select('*')
      .order('codigo_num', { ascending: true });

    if (!error && data) {
      setDatasets(data as Dataset[]);
    }
    setLoadingDatasets(false);
  };

  useEffect(() => {
    void fetchInvitations();
    void fetchDatasets();

    // Suscripción Realtime a la tabla invitaciones
    const channel = supabase
      .channel('invitaciones_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invitaciones' },
        () => {
          void fetchInvitations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleCodeVisibility = (id: string) => {
    setVisibleCodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDatasetToggle = (dsId: string, currentList: string[], setList: (val: string[]) => void) => {
    if (currentList.includes(dsId)) {
      setList(currentList.filter((id) => id !== dsId));
    } else {
      setList([...currentList, dsId]);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    const codigo = 'NEX-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const permisosPayload = [selectedModulo];
    if (selectedModulo === 'bigdata') {
      selectedDatasets.forEach((dsId) => permisosPayload.push(`dataset:${dsId}`));
    }

    const { error } = await supabase.from('invitaciones').insert([
      {
        email: email.trim().toLowerCase(),
        rol,
        permisos: permisosPayload,
        codigo,
        usado: false,
      },
    ]);

    if (error) {
      setLoading(false);
      alert('Error al generar la invitación: ' + error.message);
      return;
    }

    await sendInvitationEmail(email, codigo, rol);
    setLoading(true);
    setEmail('');
    setSelectedDatasets([]);
    await fetchInvitations();
    setLoading(false);
  };

  const handleSaveEdit = async () => {
    if (!editingInvitation) return;
    setLoading(true);

    const basePermisos = editingInvitation.permisos.filter((p) => !p.startsWith('dataset:'));
    const newDatasetPermisos = editDatasets.map((dsId) => `dataset:${dsId}`);
    const updatedPermisos = [...basePermisos, ...newDatasetPermisos];

    const { error } = await supabase
      .from('invitaciones')
      .update({ permisos: updatedPermisos })
      .eq('id', editingInvitation.id);

    setLoading(false);
    if (!error) {
      setEditingInvitation(null);
      await fetchInvitations();
    } else {
      alert('Error al actualizar permisos: ' + error.message);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(key);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getModuloBadge = (permisos: string[]) => {
    const mainMod = permisos.find((p) => !p.startsWith('dataset:')) || 'bigdata';
    const match = availablePermissions.find((p) => p.id === mainMod);
    return match ? match.label : mainMod;
  };

  const renderDatasetBadges = (permisos: string[]) => {
    const datasetIds = permisos.filter((p) => p.startsWith('dataset:')).map((p) => p.replace('dataset:', ''));
    if (datasetIds.length === 0) return <span className="text-slate-500 font-mono">-</span>;

    return (
      <div className="flex flex-wrap gap-1 items-center">
        {datasetIds.map((id) => {
          const ds = datasets.find((d) => d.id === id);
          const numFormatted = ds?.codigo_num ? `#${String(ds.codigo_num).padStart(3, '0')}` : `#${id.substring(0, 3)}`;
          const label = ds?.empresa || ds?.source_filename || ds?.nombre || ds?.filename || 'Dataset';
          return (
            <span key={id} className="px-1.5 py-0.5 text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded font-mono" title={label}>
              {numFormatted}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white rounded-xl max-w-5xl mx-auto shadow-lg space-y-8 transition-colors">
      <div>
        <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
          <KeyRound className="text-blue-600 dark:text-blue-400" /> Permisos e Invitaciones
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Crea códigos de acceso personalizados y asigna datasets por serie a los empleados.
        </p>
      </div>

      <form onSubmit={handleGenerate} className="space-y-5 bg-slate-50 dark:bg-slate-950 p-5 rounded-lg border border-slate-200 dark:border-slate-800">
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Correo Electrónico</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@empresa.com"
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Rol Asignado</label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            >
              <option value="PRACTICANTE">Practicante</option>
              <option value="ANALISTA">Analista</option>
              <option value="TIEMPO_PARCIAL">Trabajador a tiempo parcial</option>
              <option value="EMPLEADO_FULL">Empleado Full-Time</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Módulo Permitido</label>
            <select
              value={selectedModulo}
              onChange={(e) => setSelectedModulo(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            >
              {availablePermissions.map((perm) => (
                <option key={perm.id} value={perm.id}>{perm.label}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedModulo === 'bigdata' && (
          <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-md space-y-2">
            <label className="block text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
              <Database size={14} /> Datasets Asignados (Códigos de serie)
            </label>
            {loadingDatasets ? (
              <p className="text-xs text-slate-500 italic">Cargando datasets...</p>
            ) : datasets.length === 0 ? (
              <p className="text-xs text-amber-600 dark:text-amber-400 italic">No hay datasets registrados en el módulo Admin.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                {datasets.map((ds) => {
                  const numFormatted = ds.codigo_num ? `#${String(ds.codigo_num).padStart(3, '0')}` : `#${ds.id.substring(0, 3)}`;
                  const isChecked = selectedDatasets.includes(ds.id);
                  const labelName = ds.empresa || ds.source_filename || ds.nombre || ds.filename || 'Dataset';
                  return (
                    <label key={ds.id} className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs cursor-pointer hover:border-blue-500 transition-colors">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleDatasetToggle(ds.id, selectedDatasets, setSelectedDatasets)}
                        className="rounded border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span className="font-mono text-blue-500 font-bold">{numFormatted}</span>
                      <span className="truncate text-slate-700 dark:text-slate-300">{labelName}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 font-medium rounded-md text-sm text-white transition-colors"
        >
          {loading ? 'Generando...' : 'Generar Código de Invitación'}
        </button>
      </form>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Invitaciones Activas e Historial</h3>
        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Correo</th>
                <th className="p-3">Rol</th>
                <th className="p-3">Módulo</th>
                <th className="p-3">Datasets (IDs)</th>
                <th className="p-3">Código</th>
                <th className="p-3">Estado</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {invitaciones.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-slate-500 italic">No se han generado invitaciones.</td>
                </tr>
              ) : (
                invitaciones.map((inv) => {
                  const directUrl = `${window.location.origin}/registro?code=${inv.codigo}`;
                  const isVisible = visibleCodes[inv.id];

                  return (
                    <tr key={inv.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-900/50">
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{inv.email}</td>
                      <td className="p-3">{inv.rol}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded">
                          {getModuloBadge(inv.permisos)}
                        </span>
                      </td>
                      <td className="p-3">{renderDatasetBadges(inv.permisos)}</td>
                      <td className="p-3 font-mono text-blue-600 dark:text-blue-400 font-bold">
                        {isVisible ? inv.codigo : '••••••••'}
                      </td>
                      <td className="p-3">
                        {inv.usado ? (
                          <span className="inline-flex items-center gap-1 text-slate-500"><UserCheck size={12} /> Usado</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><Shield size={12} /> Activo</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingInvitation(inv);
                              const currentDs = inv.permisos.filter((p) => p.startsWith('dataset:')).map((p) => p.replace('dataset:', ''));
                              setEditDatasets(currentDs);
                            }}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400 hover:text-blue-500"
                            title="Editar accesos / Datasets"
                          >
                            <Edit3 size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleCodeVisibility(inv.id)}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400"
                            title={isVisible ? 'Ocultar Código' : 'Mostrar Código'}
                          >
                            {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>

                          {!inv.usado && (
                            <>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(inv.codigo, `code-${inv.id}`)}
                                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400"
                                title="Copiar Código"
                              >
                                {copiedCode === `code-${inv.id}` ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                              </button>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(directUrl, `url-${inv.id}`)}
                                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400"
                                title="Copiar Enlace Directo"
                              >
                                {copiedCode === `url-${inv.id}` ? <Check size={14} className="text-emerald-500" /> : <LinkIcon size={14} />}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingInvitation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <GitFork size={16} className="text-blue-500" /> Editar Datasets Asignados
              </h3>
              <button onClick={() => setEditingInvitation(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Usuario: <strong className="text-slate-800 dark:text-slate-200">{editingInvitation.email}</strong>
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Datasets Asignados:</label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {datasets.map((ds) => {
                  const numFormatted = ds.codigo_num ? `#${String(ds.codigo_num).padStart(3, '0')}` : `#${ds.id.substring(0, 3)}`;
                  const isChecked = editDatasets.includes(ds.id);
                  const labelName = ds.empresa || ds.source_filename || ds.nombre || ds.filename || 'Dataset';
                  return (
                    <label key={ds.id} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleDatasetToggle(ds.id, editDatasets, setEditDatasets)}
                        className="rounded border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span className="font-mono text-blue-500 font-bold">{numFormatted}</span>
                      <span className="text-slate-700 dark:text-slate-300">{labelName}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEditingInvitation(null)}
                className="flex-1 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={loading}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium"
              >
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}