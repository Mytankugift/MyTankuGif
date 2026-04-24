'use client'

import type { ProfileInsightsDTO } from '@/types/api'

interface OtherProfileInsightsProps {
  insights: ProfileInsightsDTO
}

/**
 * Bloque tipo “sugerencias” en perfil de otro usuario cuando no son amigos aún:
 * amigos en común, categorías y actividades compartidas (máx. 3 cada una en API).
 */
export function OtherProfileInsights({ insights }: OtherProfileInsightsProps) {
  const {
    mutualFriendsCount,
    mutualFriendNames,
    commonCategories = [],
    commonActivities = [],
  } = insights

  const hasMutual = mutualFriendsCount > 0
  const hasCategories = commonCategories.length > 0
  const hasActivities = commonActivities.length > 0

  if (!hasMutual && !hasCategories && !hasActivities) {
    return null
  }

  return (
    <div
      className="mb-6 space-y-3 rounded-[15px] border border-[#66DEDB]/35 bg-[#171B21]/95 px-3 py-3 sm:px-3.5 sm:py-3.5"
      style={{
        boxShadow: 'inset 0 1px 0 rgba(115,255,162,0.08)',
      }}
    >
      <div className="space-y-1 text-center md:text-left">
        <h4 className="text-sm font-semibold leading-snug text-white">
          <span className="font-bold tracking-tight text-[#73FFA2]">TANKU</span>{' '}
          encontró coincidencias interesantes entre ustedes
        </h4>
        <p className="text-[11px] leading-snug text-gray-400">
          Por ejemplo categorías que ambos siguen, actividades parecidas o amigos en común.
        </p>
      </div>

      <div className="space-y-2.5">
        {hasMutual && (
          <div>
            <p className="text-[11px] font-medium text-gray-500">Amigos en común</p>
            <p className="text-sm font-semibold text-white">
              {mutualFriendsCount}{' '}
              {mutualFriendsCount === 1 ? 'amigo en común' : 'amigos en común'}
            </p>
            {mutualFriendNames && mutualFriendNames.length > 0 && (
              <p className="mt-1 text-xs text-gray-300">
                {mutualFriendNames.join(' · ')}
                {mutualFriendsCount > mutualFriendNames.length && (
                  <span className="text-gray-500">
                    {' '}
                    · +{mutualFriendsCount - mutualFriendNames.length} más
                  </span>
                )}
              </p>
            )}
          </div>
        )}

        {hasCategories && (
          <div>
            <p className="mb-1.5 text-[11px] font-medium text-gray-500">Categorías</p>
            <div className="flex flex-wrap gap-1.5">
              {commonCategories.map((name) => (
                <span
                  key={name}
                  className="rounded-full border border-[#73FFA2]/35 bg-[#73FFA2]/10 px-2 py-0.5 text-[11px] text-[#73FFA2]"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {hasActivities && (
          <div>
            <p className="mb-1.5 text-[11px] font-medium text-gray-500">Actividades</p>
            <div className="flex flex-wrap gap-1.5">
              {commonActivities.map((name) => (
                <span
                  key={name}
                  className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[11px] text-gray-200"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
