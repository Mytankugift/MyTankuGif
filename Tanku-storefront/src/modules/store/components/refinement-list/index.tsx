import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

type RefinementListProps = {
  sortBy: SortOptions
}

const RefinementList = ({ sortBy }: RefinementListProps) => {
  return (
    <div className="flex small:flex-col gap-12 py-4 mb-8 small:px-0 pl-6 small:min-w-[250px] small:ml-[1.675rem]">
      <div className="block">
        <div className="pb-2">
          <h3 className="text-base-semi">Categorías</h3>
        </div>
        <div className="text-sm text-ui-fg-muted">
          <ul className="flex items-center justify-between text-base-regular">
            <li className="mr-8">
              <span className="border-b border-gray-600 border-basic">
                Todos los productos
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default RefinementList
