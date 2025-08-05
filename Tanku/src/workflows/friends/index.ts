import {
  createWorkflow,
  WorkflowResponse,
  when,
  transform,
} from "@medusajs/framework/workflows-sdk";
import { createRemoteLinkStep } from "@medusajs/medusa/core-flows";
import { Modules } from "@medusajs/framework/utils";
import { listUsersStep } from "./steps/list-users";
import { sendFriendRequestStep, SendFriendRequestInput } from "./steps/send-friend-request";
import { acceptFriendRequestStep, AcceptFriendRequestInput } from "./steps/accept-friend-request";


export const listUsersWorkflow = createWorkflow(
  "list-users-workflow",
  () => {
  
    const usersResult = listUsersStep();

    return new WorkflowResponse(usersResult);
  }
);

export const sendFriendRequestWorkflow = createWorkflow(
  "send-friend-request-workflow",
  (input: SendFriendRequestInput) => {
    
    const friendRequestResult = sendFriendRequestStep(input);

    return new WorkflowResponse(friendRequestResult);
  }
);

export const acceptFriendRequestWorkflow = createWorkflow(
  "accept-friend-request-workflow",
  (input: AcceptFriendRequestInput) => {
    
    const acceptResult = acceptFriendRequestStep(input);

    return new WorkflowResponse(acceptResult);
  }
);

