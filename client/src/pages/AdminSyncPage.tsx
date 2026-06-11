import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSyncStatus, runSync, type SyncResult } from '../api/admin';

function StatCard({ label, value, dim }: { label: string; value: number; dim?: boolean }) {
  return (
    <div className="bg-base-300 rounded-xl p-4 text-center">
      <p className={`text-2xl font-bold ${dim ? 'text-base-content/30' : 'signal-text'}`}>{value.toLocaleString()}</p>
      <p className="text-xs text-base-content/40 mt-1">{label}</p>
    </div>
  );
}

function ResultRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-base-content/5 last:border-0">
      <span className="text-sm text-base-content/60">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${highlight && value > 0 ? 'text-success' : 'text-base-content'}`}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}

export function AdminSyncPage() {
  const queryClient = useQueryClient();
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['sync-status'],
    queryFn: fetchSyncStatus,
    staleTime: 10000,
  });

  const mutation = useMutation({
    mutationFn: runSync,
    onSuccess: (result) => {
      setLastResult(result);
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
    },
  });

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold signal-text">Datenabgleich</h1>
        <p className="text-base-content/40 text-sm mt-1">
          Bildmetadaten aus <code className="text-primary/70 bg-primary/8 px-1 rounded text-xs">klosterneuburg_stadt.ts</code> mit der Datenbank abgleichen und Cluster-Regionen zuweisen.
        </p>
      </div>

      {/* Status */}
      <div className="bg-base-200 border border-base-content/8 rounded-2xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-base-content/50 uppercase tracking-wider mb-4">Aktueller Stand</h2>

        {statusLoading ? (
          <div className="flex justify-center py-6">
            <span className="loading loading-spinner loading-md text-primary" />
          </div>
        ) : status ? (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <StatCard label="Synchronisiert" value={status.synced} />
            <StatCard label="Veraltet" value={status.unsynced} />
            <StatCard label="Nicht in Datei" value={status.notInFile} />
          </div>
        ) : null}

        {status && (
          <div className="flex items-center justify-between text-xs text-base-content/30 mt-2">
            <span>{status.dbTotal} Bilder in DB</span>
            <span>{status.total} Einträge in Datei</span>
            <span>{status.notInDb} noch nicht hochgeladen</span>
          </div>
        )}
      </div>

      {/* Action */}
      <div className="bg-base-200 border border-base-content/8 rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-base-content">Abgleich starten</h2>
            <p className="text-xs text-base-content/40 mt-0.5">
              Metadaten + Geo-Daten schreiben, Cluster-Regionen A–W anlegen und zuweisen.
            </p>
          </div>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="btn btn-primary btn-sm shrink-0 ml-4"
          >
            {mutation.isPending
              ? <><span className="loading loading-spinner loading-xs" />Läuft…</>
              : 'Abgleich starten'
            }
          </button>
        </div>

        {mutation.isError && (
          <p className="text-xs text-error mt-3">
            Fehler: {(mutation.error as Error)?.message ?? 'Unbekannter Fehler'}
          </p>
        )}
      </div>

      {/* Last result */}
      {lastResult && (
        <div className="bg-base-200 border border-success/20 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-base-content/50 uppercase tracking-wider mb-3">
            Letztes Ergebnis
          </h2>
          <ResultRow label="Aktualisiert" value={lastResult.updated} highlight />
          <ResultRow label="Regionen zugewiesen" value={lastResult.regionAssigned} highlight />
          <ResultRow label="Pfade repariert" value={lastResult.pathsRepaired} highlight />
          <ResultRow label="Bereits synchronisiert" value={lastResult.alreadySynced} />
          <ResultRow label="Nicht in Datei" value={lastResult.notInFile} />
          {lastResult.pathsBroken > 0 && (
            <ResultRow label="Gelöschte Regionen bereinigt" value={lastResult.pathsBroken} />
          )}
          <ResultRow label="Noch nicht hochgeladen" value={lastResult.notInDb} />
          <div className="flex items-center justify-between pt-2 mt-1">
            <span className="text-xs text-base-content/30">Gesamt in Datei</span>
            <span className="text-xs font-semibold text-base-content/40 tabular-nums">{lastResult.total.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
