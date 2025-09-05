import { Module } from "@medusajs/framework/utils";
import OnboardingModuleService from "./service";

export const ONBOARDING_MODULE = "onboardingModule";

export default Module(ONBOARDING_MODULE, {
  service: OnboardingModuleService,
});


