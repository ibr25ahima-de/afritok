import React from "react";
import { trpc } from "@/lib/trpc";

export default function WarningsSettings() {
  const {
    data: warnings,
    isLoading,
    error,
  } = trpc.user.getMyWarnings.useQuery();

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5">
        <h2 className="text-xl font-bold text-white mb-2">
          ⚠️ Mes avertissements
        </h2>

        <p className="text-gray-400">
          Chargement de vos avertissements...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-gray-900 border border-red-900 p-5">
        <h2 className="text-xl font-bold text-white mb-2">
          ⚠️ Mes avertissements
        </h2>

        <p className="text-red-400">
          Impossible de charger vos avertissements.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold text-white">
            ⚠️ Mes avertissements
          </h2>

          <p className="text-sm text-gray-400 mt-1">
            Consultez les avertissements reçus de l'administration.
          </p>
        </div>

        <div className="bg-yellow-600/20 text-yellow-400 px-3 py-1.5 rounded-full text-sm font-semibold">
          {warnings?.length ?? 0}
        </div>
      </div>

      {!warnings?.length ? (
        <div className="rounded-xl bg-gray-800/60 p-5 text-center">
          <div className="text-4xl mb-3">✅</div>

          <p className="text-white font-semibold">
            Aucun avertissement
          </p>

          <p className="text-gray-400 text-sm mt-1">
            Vous n'avez reçu aucun avertissement de l'administration.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {warnings.map((warning) => (
            <div
              key={warning.id}
              className="rounded-xl bg-gray-800 border border-yellow-900/50 p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚠️</span>

                  <span className="text-yellow-400 font-bold">
                    Avertissement
                  </span>
                </div>

                <span className="text-xs text-gray-500">
                  {warning.createdAt
                    ? new Date(warning.createdAt).toLocaleDateString(
                        "fr-FR",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        }
                      )
                    : "Date inconnue"}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Motif
                  </p>

                  <p className="text-white mt-1">
                    {warning.reason || "Motif non précisé"}
                  </p>
                </div>

                {warning.message && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Message de l'administration
                    </p>

                    <p className="text-gray-300 mt-1">
                      {warning.message}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
