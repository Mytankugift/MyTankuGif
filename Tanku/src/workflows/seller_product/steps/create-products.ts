import { StepResponse, createStep, StepExecutionContext } from "@medusajs/framework/workflows-sdk";
import { CreateSellerProductInput } from "..";
import { Modules } from "@medusajs/framework/utils"
import { VARIANT_INVENTORY_TANKU_MODULE } from "../../../modules/variant_inventory_tanku";
import VariantInventoryTankuModuleService from "../../../modules/variant_inventory_tanku/service";
import { createRemoteLinkStep } from "@medusajs/medusa/core-flows"

export type CreatedProductVariant = {
  variantId: string;
  currency_code: string;
  price: number;
  storeId: string;
  [key: string]: any; // Allow additional properties
};

export type CreatedProduct = {
  id: string;
  title: string;
  description: string | null;
  variants: Array<{
    variantId: string;
    price: number;
    currency_code: string;
    storeId: string;
  }>;
  [key: string]: any; // Allow additional properties
};

export type ProductPriceData = {
  dataVariant: Array<{
    variantId: string;
    price: number;
    currency_code: string;
  }>;
  productId: string;
  storeId: string;
};

const createSellerProductsStep = createStep(
  "create-seller-products-step",
  async (
    {productsInput, idStore}: {productsInput: any[] , idStore: string},
    { container }
  ) => {  
    console.log("esto es el productsInput", productsInput)
    const productService = container.resolve(Modules.PRODUCT)
    const variantInventoryTankuModule: VariantInventoryTankuModuleService = container.resolve(VARIANT_INVENTORY_TANKU_MODULE)

    const createdProducts: CreatedProduct[] = [];
    const createdProductIds: string[] = [];
    
    // Ensure productsInput is an array
    if (!Array.isArray(productsInput)) {
     
      throw new Error("Expected an array of product data");
    }
    
    for (const productInput of productsInput) {
      // Handle both direct product data and wrapped product data
      const productData = productInput.productData || productInput;
      const thumbnail = productInput.thumbnail || productData.thumbnail || null;
      const images = productInput.images || productData.images || [];
      
      // Validate productData has variants
      if (!productData || !productData.variants || !Array.isArray(productData.variants)) {
       
        throw new Error("Product data is missing required variants array");
      }

      // Ensure we have all required fields with proper defaults
      const variants = productData.variants.map((variant) => ({
        title: `${productData.title} ${Object.values(variant.options || {}).join(' ')}`,
        options: variant.options || {},
        prices: variant.prices || [],
        manage_inventory: true,
        inventory_quantity: variant.quantity || 0,
        sku: variant.sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        images: images?.map(image => ({
          url: image
        })) || []
      }));

      console.log("Creating product with data:", {
        title: productData.title,
        description: productData.description || "",
        options: productData.options || [],
        thumbnail,
        variants
      });

      const product = await productService.createProducts({
        title: productData.title,
        description: productData.description || "",
        options: productData.options || [],
        thumbnail,
        status: "published"
      });

      const variantsInfo: CreatedProductVariant[] = [];

      for (const variant of productData.variants) {
        try {
          // Ensure variant has all required fields with defaults
          const safeVariant = {
            options: variant.options || {},
            prices: variant.prices || [],
            quantity: variant.quantity || 0,
            sku: variant.sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`
          };
          
          // Ensure we have at least one price
          if (!safeVariant.prices.length) {
            safeVariant.prices = [{
              amount: 0,
              currency_code: 'USD'
            }];
          }
          
          // Create variant using the product service
          const variantInput = {
            title: safeVariant.sku, // Using SKU as title if needed
            sku: safeVariant.sku,
            options: safeVariant.options,
            inventory_quantity: safeVariant.quantity,
            prices: safeVariant.prices.map(p => ({
              amount: p.amount || 0,
              currency_code: p.currency_code || 'USD'
            })),
          };

          
          
          // Create variant using the product service with the correct parameter structure
          const createdVariant = await productService.createProductVariants([{
            ...variantInput,
            product_id: product.id
          }]);
          
          const variantId = createdVariant[0]?.id;
          if (!variantId) {
            console.error('Failed to create variant, no ID returned:', createdVariant);
            throw new Error('Failed to create variant');
          }
          
          // Get store ID from product data or use a default
          const storeId = idStore || 'default-store';
          
          const variantInfo: CreatedProductVariant = {
            variantId: variantId,
            currency_code: safeVariant.prices[0]?.currency_code || 'USD',
            price: safeVariant.prices[0]?.amount || 0,
            storeId: storeId
          };
          
          variantsInfo.push(variantInfo);

          // Create inventory entry
          await variantInventoryTankuModule.createVariantInventoryTankus([{
            variant_id: variantId,
            quantity_stock: safeVariant.quantity,
            currency_code: safeVariant.prices[0]?.currency_code || 'USD',
            price: safeVariant.prices[0]?.amount || 0
          }]);
        } catch (error) {
          console.error(`Error creating variant for product ${product.id}:`, error);
          // Continue with other variants instead of failing the entire process
        }
      }
      
      
      // Only add products with at least one variant
      if (variantsInfo.length > 0) {
        createdProducts.push({
          ...product,
          variants: variantsInfo
        });
        createdProductIds.push(product.id);
      } else {
        console.warn(`Product ${product.id} has no variants, skipping in final result`);
      }
    }
    
    // Check if we have any successfully created products
    if (createdProducts.length === 0) {
      throw new Error("No products were successfully created");
    }
    
    console.log("Productos creados con sus variaciones:", createdProducts);
    
    // Create price data for each product
    const priceData = createdProducts.map(product => {
     
        // Ensure we have at least one variant to get the storeId
        if (!product.variants || !Array.isArray(product.variants) || product.variants.length === 0) {
          console.warn(`Product ${product.id} has no variants, using default values for price data`);
          return {
            dataVariant: [],
            productId: product.id,
            storeId: idStore
          };
        }
        
        const firstVariant = product.variants[0];
        const storeId = firstVariant?.storeId || idStore
        
        return {
          dataVariant: product.variants.map(variant => ({
            variantId: variant.variantId,
            price: variant.price || 0,
            currency_code: variant.currency_code || 'USD'
          })),
          productId: product.id,
          storeId: storeId
        };
     
    });

    // Create the response type that matches what we expect in the workflow
    const response = {
      products: createdProducts.map(p => {
        
          // Ensure variants exists and is an array
          const variants = p.variants && Array.isArray(p.variants) 
            ? p.variants.map(v => ({
                variantId: v.variantId || '',
                currency_code: v.currency_code || 'USD',
                price: v.price || 0,
                storeId: v.storeId || idStore
              }))
            : [];
            
          return {
            id: p.id || '',
            title: p.title || '',
            description: p.description || '',
            variants: variants
          };
      
      }) as CreatedProduct[],
      priceData
    };

    return new StepResponse(response, createdProductIds);
  },
  async (productIds: string[] = [], { container }) => {
   
      // Validate productIds is an array with elements
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        console.log("No product IDs to delete in compensation handler");
        return;
      }
      
      const productService = container.resolve(Modules.PRODUCT);
      if (!productService) {
        console.error("Product service could not be resolved in compensation handler");
        return;
      }
      
      console.log(`Deleting ${productIds.length} products in compensation handler`);
      await productService.deleteProducts(productIds);
   
  }
)


export default createSellerProductsStep;
