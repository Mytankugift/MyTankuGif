export type FeedCategoryItem = {
  id: string | number
  name: string
  image?: string | null
  parentId?: string | null
}

export function normalizeParentId(value: unknown): string | null {
  if (value == null || value === '') return null
  const s = String(value).trim()
  return s.length > 0 ? s : null
}

/** Mapeo unificado desde API / feed init (camelCase o snake_case). */
export function mapCategoryFromApi(raw: {
  id: string | number
  name: string
  imageUrl?: string | null
  image?: string | null
  parentId?: string | null
  parent_id?: string | null
}): FeedCategoryItem {
  return {
    id: raw.id,
    name: raw.name,
    image: raw.imageUrl ?? raw.image ?? null,
    parentId: normalizeParentId(raw.parentId ?? raw.parent_id),
  }
}

export function isRootCategory(category: FeedCategoryItem): boolean {
  return normalizeParentId(category.parentId) === null
}

export function getParentCategories(categories: FeedCategoryItem[]): FeedCategoryItem[] {
  return categories.filter(isRootCategory)
}

export function getCategoryById(
  categories: FeedCategoryItem[],
  id: string | null | undefined
): FeedCategoryItem | null {
  if (!id) return null
  return categories.find((c) => String(c.id) === String(id)) ?? null
}

export type CategoryBarContext = {
  selected: FeedCategoryItem | null
  parent: FeedCategoryItem | null
  /** Hijos si la selección es padre; hermanas si es subcategoría */
  related: FeedCategoryItem[]
}

export function getCategoryBarContext(
  categories: FeedCategoryItem[],
  selectedCategoryId: string | null
): CategoryBarContext {
  const selected = getCategoryById(categories, selectedCategoryId)
  if (!selected) {
    return { selected: null, parent: null, related: [] }
  }

  const parentPid = normalizeParentId(selected.parentId)
  const parent = parentPid ? getCategoryById(categories, parentPid) : null

  const related = parentPid
    ? categories.filter(
        (c) =>
          normalizeParentId(c.parentId) === parentPid &&
          String(c.id) !== String(selected.id)
      )
    : categories.filter(
        (c) => normalizeParentId(c.parentId) === String(selected.id)
      )

  return { selected, parent, related }
}

export type CategoryBarChip = {
  category: FeedCategoryItem
  selected: boolean
}

/** Orden fijo de la barra; solo cambia el estado selected (no el layout). */
export function getCategoryBarChips(
  categories: FeedCategoryItem[],
  selectedCategoryId: string | null
): CategoryBarChip[] {
  const selected = getCategoryById(categories, selectedCategoryId)
  if (!selected) return []

  const selectedId = String(selected.id)
  const parentPid = normalizeParentId(selected.parentId)

  if (!parentPid) {
    const children = categories.filter(
      (c) => normalizeParentId(c.parentId) === selectedId
    )
    return [
      { category: selected, selected: true },
      ...children.map((c) => ({
        category: c,
        selected: false,
      })),
    ]
  }

  const parent = getCategoryById(categories, parentPid)
  const siblings = categories.filter(
    (c) => normalizeParentId(c.parentId) === parentPid
  )

  const siblingChips: CategoryBarChip[] = siblings.map((c) => ({
    category: c,
    selected: String(c.id) === selectedId,
  }))

  return parent
    ? [{ category: parent, selected: false }, ...siblingChips]
    : siblingChips
}
