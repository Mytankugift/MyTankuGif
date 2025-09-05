import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { handleIncentivePopupStep } from "./steps/handle-incentive-popup";
import { getOnboardingStatusStep } from "./steps/get-onboarding-status";
import { completeOnboardingPhaseStep } from "./steps/complete-onboarding-phase";
import { savePhaseOneStep } from "./steps/save-phase-one";
import { savePhaseTwoStep } from "./steps/save-phase-two"

export interface SavePhaseOneInput {
  customer_id: string;
  birth_date: string;
  gender: string;
  marital_status: string;
  country: string;
  city: string;
  languages: string[];
  main_interests: string[];
  representative_colors: string[];
  favorite_activities: string[];
  important_celebrations: string[];
}

export interface HandleIncentivePopupInput {
  customer_id: string;
  action: "show" | "dismiss";
}

export interface GetOnboardingStatusInput {
  customer_id: string;
}

export interface CompleteOnboardingPhaseInput {
  customer_id: string;
  phase: "one" | "two";
}

export const handleIncentivePopupWorkflow = createWorkflow(
  "handle-incentive-popup-workflow",
  (input: HandleIncentivePopupInput) => {
    const result = handleIncentivePopupStep(input);

    return new WorkflowResponse(result);
  }
);

export const getOnboardingStatusWorkflow = createWorkflow(
  "get-onboarding-status-workflow",
  (input: GetOnboardingStatusInput) => {
    const statusResult = getOnboardingStatusStep(input);

    return new WorkflowResponse(statusResult);
  }
);

export const completeOnboardingPhaseWorkflow = createWorkflow(
  "complete-onboarding-phase-workflow",
  (input: CompleteOnboardingPhaseInput) => {
    const result = completeOnboardingPhaseStep(input);

    return new WorkflowResponse(result);
  }
);

export const savePhaseOneWorkflow = createWorkflow(
  "save-phase-one-workflow",
  (input: SavePhaseOneInput) => {
    const result = savePhaseOneStep(input);

    return new WorkflowResponse(result);
  }
);




export interface SavePhaseTwoInput {
  customer_id: string
  product_interests: string[]
  favorite_social_networks: string[]
  preferred_interaction: string[]
  purchase_frequency: string
  monthly_budget: string
  brand_preference: string
  purchase_motivation: string
  social_circles: string[]
  wants_connections: string
  connection_types: string[]
  lifestyle_style: string[]
  personal_values: string[]
  platform_expectations: string[]
  preferred_content_type: string[]
  connection_moments: string[]
  shopping_days: string
  ecommerce_experience: string
  social_activity_level: string
  notifications_preference: string
}

export const savePhaseTwoWorkflow = createWorkflow(
  "save-phase-two-workflow",
  (input: SavePhaseTwoInput) => {
    const result = savePhaseTwoStep(input)
    
    return new WorkflowResponse(result)
  }
)
