import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { FileText, FileSpreadsheet, Table, Upload, Trash2, ExternalLink, Eye } from 'lucide-react';

interface StoredFile {
  name: string;
  folder: string;
  url: string;
  size: number;
  type: 'pdf' | 'csv' | 'excel' | 'other';
}

// Utilidad para limpiar el timestamp del nombre
const formatFileName = (rawName: string): string => {
  return rawName.replace(/^\d+[-_]/, '');
};

// Utilidad para formatear el tamaño
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function DocumentUploader() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<StoredFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const getFileType = (fileName: string): 'pdf' | 'csv' | 'excel' | 'other' => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (ext === 'csv') return 'csv';
    if (ext === 'xlsx' || ext === 'xls') return 'excel';
    return 'other';
  };

  const loadStoredDocuments = async () => {
    const folders = ['informes', 'datasets'];
    const docs: StoredFile[] = [];

    for (const folder of folders) {
      const { data, error } = await supabase.storage.from('documentos').list(folder, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });

      if (!error && data) {
        data.forEach((file) => {
          if (file.name !== '.emptyFolderPlaceholder') {
            const { data: publicData } = supabase.storage
              .from('documentos')
              .getPublicUrl(`${folder}/${file.name}`);

            docs.push({
              name: file.name,
              folder,
              url: publicData.publicUrl,
              size: file.metadata?.size || 0,
              type: getFileType(file.name),
            });
          }
        });
      }
    }
    setUploadedDocs(docs);
  };

  useEffect(() => {
    void loadStoredDocuments();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUploadAll = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);

    for (const file of selectedFiles) {
      const fileType = getFileType(file.name);
      const folder = fileType === 'pdf' ? 'informes' : 'datasets';
      const filePath = `${folder}/${Date.now()}_${file.name}`;

      const { error } = await supabase.storage.from('documentos').upload(filePath, file);

      if (error) {
        alert(`Error al subir ${file.name}: ${error.message}`);
      }
    }

    setUploading(false);
    setSelectedFiles([]);
    await loadStoredDocuments();
  };

  const handleDelete = async (folder: string, fileName: string) => {
    if (!confirm(`¿Eliminar ${formatFileName(fileName)}?`)) return;

    const { error } = await supabase.storage.from('documentos').remove([`${folder}/${fileName}`]);
    if (error) {
      alert('Error al eliminar: ' + error.message);
    } else {
      if (previewUrl?.includes(fileName)) setPreviewUrl(null);
      await loadStoredDocuments();
    }
  };

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 text-white rounded-xl max-w-5xl mx-auto shadow-lg space-y-6">
      <div>
        <h2 className="text-xl font-bold text-blue-400">Gestión y Carga Documental</h2>
        <p className="text-sm text-slate-400 mt-1">
          Sube múltiples archivos simultáneamente (PDF, CSV, Excel) y mantenlos guardados en la plataforma.
        </p>
      </div>

      <div className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-lg p-6 text-center bg-slate-950/50 transition-colors">
        <input
          type="file"
          id="fileInput"
          multiple
          accept=".pdf,.csv,.xlsx,.xls,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          onChange={handleFileChange}
          className="hidden"
        />
        <label htmlFor="fileInput" className="cursor-pointer flex flex-col items-center justify-center space-y-2">
          <Upload className="w-10 h-10 text-slate-400 hover:text-blue-400" />
          <span className="text-sm text-slate-300">
            {selectedFiles.length > 0
              ? `${selectedFiles.length} archivo(s) seleccionado(s)`
              : 'Haz clic o arrastra para seleccionar varios archivos (PDF, CSV, Excel)'}
          </span>
        </label>
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Archivos por subir:</p>
          <ul className="bg-slate-950 p-3 rounded-lg border border-slate-800 divide-y divide-slate-800 text-sm">
            {selectedFiles.map((f, i) => (
              <li key={i} className="py-2 flex items-center justify-between text-slate-300">
                <span className="truncate max-w-md">{f.name}</span>
                <span className="text-xs text-slate-500 font-mono font-medium">
                  {formatFileSize(f.size)}
                </span>
              </li>
            ))}
          </ul>
          <button
            onClick={handleUploadAll}
            disabled={uploading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {uploading ? 'Guardando en la nube...' : `Subir ${selectedFiles.length} documento(s)`}
          </button>
        </div>
      )}

      {previewUrl && (
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
              <Eye size={16} className="text-blue-400" /> Previsualizando Documento
            </h3>
            <button
              onClick={() => setPreviewUrl(null)}
              className="text-xs text-slate-400 hover:text-white bg-slate-800 px-2 py-1 rounded"
            >
              Cerrar Vista Previa
            </button>
          </div>
          <iframe src={previewUrl} className="w-full h-[500px] border-none rounded-lg bg-slate-900" title="PDF Preview" />
        </div>
      )}

      <div className="space-y-4 pt-4 border-t border-slate-800">
        <h3 className="text-md font-bold text-slate-200">
          Documentos Guardados en la Plataforma ({uploadedDocs.length})
        </h3>

        {uploadedDocs.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No hay documentos almacenados aún.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {uploadedDocs.map((doc, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg flex items-center justify-between gap-3 shadow-sm"
              >
                <div className="flex items-center gap-3 truncate">
                  {doc.type === 'pdf' && <FileText className="w-7 h-7 text-red-400 shrink-0" />}
                  {doc.type === 'csv' && <Table className="w-7 h-7 text-amber-400 shrink-0" />}
                  {doc.type === 'excel' && <FileSpreadsheet className="w-7 h-7 text-emerald-400 shrink-0" />}
                  {doc.type === 'other' && <FileText className="w-7 h-7 text-slate-400 shrink-0" />}

                  <div className="truncate">
                    <p className="text-sm font-medium text-slate-200 truncate" title={formatFileName(doc.name)}>
                      {formatFileName(doc.name)}
                    </p>
                    <p className="text-xs text-slate-500 uppercase font-mono">
                      {doc.type} • {formatFileSize(doc.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {doc.type === 'pdf' && (
                    <button
                      onClick={() => setPreviewUrl(doc.url)}
                      className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-blue-400"
                      title="Previsualizar PDF"
                    >
                      <Eye size={16} />
                    </button>
                  )}
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-400"
                    title="Ver / Descargar"
                  >
                    <ExternalLink size={16} />
                  </a>
                  <button
                    onClick={() => handleDelete(doc.folder, doc.name)}
                    className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}