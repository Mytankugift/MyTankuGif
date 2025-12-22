import { TankuProduct } from "../../../../types/global"
import { Tab } from "@headlessui/react"
import { Text } from "@medusajs/ui"
import { Fragment } from "react"

type ProductTabsTankuProps = {
  product: TankuProduct
}

const ProductTabsTanku = ({ product }: ProductTabsTankuProps) => {
  const tabs = [
    {
      label: "Descripción del Producto",
      component: <ProductDescription product={product} />,
    },
    {
      label: "Información Adicional",
      component: <AdditionalInformation product={product} />,
    },
  ]

  return (
    <div className="w-full">
      <Tab.Group>
        <Tab.List className="border-b border-gray-200 box-border grid grid-cols-2">
          {tabs.map((tab, i) => {
            return (
              <Tab
                key={i}
                className={({ selected }) =>
                  `text-left uppercase text-small-regular h-[40px] border-b border-gray-200 transition-color duration-150 ease-in-out ${
                    selected ? "border-b border-gray-900" : "hover:text-gray-900"
                  }`
                }
              >
                {tab.label}
              </Tab>
            )
          })}
        </Tab.List>
        <Tab.Panels>
          {tabs.map((tab, j) => {
            return (
              <Tab.Panel
                key={j}
                className="text-small-regular py-8 focus:outline-none"
              >
                {tab.component}
              </Tab.Panel>
            )
          })}
        </Tab.Panels>
      </Tab.Group>
    </div>
  )
}

const ProductDescription = ({ product }: { product: TankuProduct }) => {
  return (
    <Text className="text-small-regular">
      {product.description}
    </Text>
  )
}

const AdditionalInformation = ({ product }: { product: TankuProduct }) => {
  return (
    <div className="text-small-regular">
      <div className="grid grid-cols-2 gap-4">
        {product.material && (
          <>
            <div className="font-semibold">Material</div>
            <div>{product.material}</div>
          </>
        )}
        {product.origin_country && (
          <>
            <div className="font-semibold">País de Origen</div>
            <div>{product.origin_country}</div>
          </>
        )}
        {product.weight && (
          <>
            <div className="font-semibold">Peso</div>
            <div>{product.weight}g</div>
          </>
        )}
      </div>
    </div>
  )
}

export default ProductTabsTanku
