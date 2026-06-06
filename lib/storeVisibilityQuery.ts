/**
 * Filtre PostgREST pour magasins « visibles » côté app (carte, widgets) :
 * - is_active : true ou NULL (anciennes lignes sans valeur = souvent actives)
 * - is_deleted : false ou NULL
 *
 * Évite d’exclure des magasins avec `.eq('is_active', true)` seul (NULL ≠ true en SQL).
 */
export function applyStoreVisibilityFilters(query: any) {
  return query
    .or('is_active.is.null,is_active.eq.true')
    .or('is_deleted.is.null,is_deleted.eq.false');
}
