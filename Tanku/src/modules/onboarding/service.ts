import { MedusaService } from "@medusajs/framework/utils";
import OnboardingPhaseOne from "./models/onboarding_phase_one";
import OnboardingPhaseTwo from "./models/onboarding_phase_two";
import OnboardingStatus from "./models/onboarding_status";

class OnboardingModuleService extends MedusaService({
  OnboardingPhaseOne,
  OnboardingPhaseTwo,
  OnboardingStatus,
}) {}
export default OnboardingModuleService

  


