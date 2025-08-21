import { Module } from "@medusajs/framework/utils";
import OnboardingModuleService from "./service";
import OnboardingPhaseOne from "./models/onboarding_phase_one";
import OnboardingPhaseTwo from "./models/onboarding_phase_two";
import OnboardingStatus from "./models/onboarding_status";

export const ONBOARDING_MODULE = "onboardingModule";

const OnboardingModule = Module(ONBOARDING_MODULE, {
  service: OnboardingModuleService,
});

export default OnboardingModule;
