import { ChangeEvent } from "react"

export type SortOptions = "price_asc" | "price_desc" | "created_at" | "title"

type SortProductsProps = {
  sortBy: SortOptions
  setQueryParams: (name: string, value: SortOptions) => void
  'data-testid'?: string
}

const SortProducts = ({ 'data-testid': dataTestId, sortBy, setQueryParams }: SortProductsProps) => {
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newSortBy = e.target.value as SortOptions
    setQueryParams("sortBy", newSortBy)
  }

  return (
    <div className="flex items-center">
      <span className="text-ui-fg-muted text-small-regular mr-2">
        Ordenar por:
      </span>
      <select
        data-testid={dataTestId}
        onChange={handleChange}
        value={sortBy}
        className="text-small-regular"
      >
        <option value="created_at">Más recientes</option>
        <option value="price_asc">Precio: Menor a mayor</option>
        <option value="price_desc">Precio: Mayor a menor</option>
        <option value="title">Alfabético</option>
      </select>
    </div>
  )
}

export default SortProducts
