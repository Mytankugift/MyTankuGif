import { StepResponse, createStep, StepExecutionContext } from "@medusajs/framework/workflows-sdk";
import { Modules } from "@medusajs/framework/utils";
import { createCustomerAccountWorkflow } from "@medusajs/medusa/core-flows";

type checkRegistrationInput = {
  email: string;
  token: string;
 
};

// Define a type that allows for null customer
type RegistrationResult = {
  customer: any | null;
  authIdentity: any | undefined;
};

// Define the same type for input and output to satisfy the third type parameter
type RegistrationOutput = RegistrationResult;

const checkRegistrationStep = createStep<checkRegistrationInput, RegistrationResult, RegistrationOutput>(
  "check-registration-step",
  async (
    { email, token, }: checkRegistrationInput,
    { container }
  ) => {
console.log("accede a crear el usuario")
    const moduleCustomer = container.resolve(Modules.CUSTOMER);
    const authModuleService = container.resolve(Modules.AUTH);

    // Buscar el customer por email
    const retrieverCustomer = await moduleCustomer.listCustomers();

    const customer = retrieverCustomer.find((customer) => customer.email === email);

    if (customer) {
      // Si existe, autenticar usando email y token como contraseña
      const { success, authIdentity, error } =
        await authModuleService.authenticate("emailpass", {
          body: {
            email,
            password: token,
          },
        });
      if (!success) {
        throw new Error(error || "No se pudo autenticar el usuario existente");
      }
      console.log("Customer autenticado:", authIdentity)
      return new StepResponse({ customer: customer, authIdentity });
    } else {
        // Registrar la identidad
        const { success, authIdentity, error } = await authModuleService.register(
          "emailpass",
          {
            body: {
              email,
              password: token,
            },
          }
        );
        if (!success || !authIdentity?.id) {
          throw new Error(error || "No se pudo registrar el usuario");
        }
      
        console.log("Customer registrado:", authIdentity)
        // Crear el customer y asociarlo a la identidad usando el workflow recomendado
        const { result } = await createCustomerAccountWorkflow(container).run({
          input: {
            authIdentityId: authIdentity.id,
            customerData: {
              email,
              // Puedes agregar más campos aquí:
              first_name: "Nombre de Wordpress",
              last_name: "Apellido de wordpress",
              // phone: "123456789",
              // company_name: "Empresa",
              // metadata: { origen: "wordpress" }
            },
          },
        });
        console.log("Customer creado:", result)
        const customer = result;
      
        return new StepResponse({ customer, authIdentity });
      }
    }
);

export default checkRegistrationStep;
