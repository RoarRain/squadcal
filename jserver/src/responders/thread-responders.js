// @flow

import type { $Response, $Request } from 'express';
import {
  type ThreadDeletionRequest,
  type RoleChangeRequest,
  type ChangeThreadSettingsResult,
  type RemoveMembersRequest,
  type LeaveThreadRequest,
  type LeaveThreadResult,
  type UpdateThreadRequest,
  type NewThreadRequest,
  type NewThreadResult,
  type ThreadJoinRequest,
  type ThreadJoinResult,
  assertVisibilityRules,
} from 'lib/types/thread-types';
import type { Viewer } from '../session/viewer';

import t from 'tcomb';

import { ServerError } from 'lib/utils/fetch-utils';

import { tShape, tNumEnum, tColor } from '../utils/tcomb-utils';
import { deleteThread } from '../deleters/thread-deleters';
import {
  updateRole,
  removeMembers,
  leaveThread,
  updateThread,
  joinThread,
} from '../updaters/thread-updaters';
import createThread from '../creators/thread-creator';

const threadDeletionRequestInputValidator = tShape({
  threadID: t.String,
  accountPassword: t.String,
});

async function threadDeletionResponder(
  viewer: Viewer,
  req: $Request,
  res: $Response,
): Promise<void> {
  const threadDeletionRequest: ThreadDeletionRequest = (req.body: any);
  if (!threadDeletionRequestInputValidator.is(threadDeletionRequest)) {
    throw new ServerError('invalid_parameters');
  }

  await deleteThread(viewer, threadDeletionRequest);
}

const roleChangeRequestInputValidator = tShape({
  threadID: t.String,
  memberIDs: t.list(t.String),
  role: t.refinement(
    t.String,
    str => {
      const int = parseInt(str);
      return int == str && int > 0;
    },
  ),
});

async function roleUpdateResponder(
  viewer: Viewer,
  req: $Request,
  res: $Response,
): Promise<ChangeThreadSettingsResult> {
  const roleChangeRequest: RoleChangeRequest = (req.body: any);
  if (!roleChangeRequestInputValidator.is(roleChangeRequest)) {
    throw new ServerError('invalid_parameters');
  }

  return await updateRole(viewer, roleChangeRequest);
}

const removeMembersRequestInputValidator = tShape({
  threadID: t.String,
  memberIDs: t.list(t.String),
});

async function memberRemovalResponder(
  viewer: Viewer,
  req: $Request,
  res: $Response,
): Promise<ChangeThreadSettingsResult> {
  const removeMembersRequest: RemoveMembersRequest = (req.body: any);
  if (!removeMembersRequestInputValidator.is(removeMembersRequest)) {
    throw new ServerError('invalid_parameters');
  }

  return await removeMembers(viewer, removeMembersRequest);
}

const leaveThreadRequestInputValidator = tShape({
  threadID: t.String,
});

async function threadLeaveResponder(
  viewer: Viewer,
  req: $Request,
  res: $Response,
): Promise<LeaveThreadResult> {
  const leaveThreadRequest: LeaveThreadRequest = (req.body: any);
  if (!leaveThreadRequestInputValidator.is(leaveThreadRequest)) {
    throw new ServerError('invalid_parameters');
  }

  return await leaveThread(viewer, leaveThreadRequest);
}

const updateThreadRequestInputValidator = tShape({
  threadID: t.String,
  changes: tShape({
    name: t.maybe(t.String),
    description: t.maybe(t.String),
    color: t.maybe(tColor),
    password: t.maybe(t.String),
    parentThreadID: t.maybe(t.String),
    visibilityRules: t.maybe(tNumEnum(assertVisibilityRules)),
    newMemberIDs: t.maybe(t.list(t.String)),
  }),
  accountPassword: t.maybe(t.String),
});

async function threadUpdateResponder(
  viewer: Viewer,
  req: $Request,
  res: $Response,
): Promise<ChangeThreadSettingsResult> {
  const updateThreadRequest: UpdateThreadRequest = (req.body: any);
  if (!updateThreadRequestInputValidator.is(updateThreadRequest)) {
    throw new ServerError('invalid_parameters');
  }

  return await updateThread(viewer, updateThreadRequest);
}

const newThreadRequestInputValidator = tShape({
  name: t.maybe(t.String),
  description: t.maybe(t.String),
  color: t.maybe(tColor),
  password: t.maybe(t.String),
  parentThreadID: t.maybe(t.String),
  visibilityRules: tNumEnum(assertVisibilityRules),
  initialMemberIDs: t.maybe(t.list(t.String)),
});
async function threadCreationResponder(
  viewer: Viewer,
  req: $Request,
  res: $Response,
): Promise<NewThreadResult> {
  const newThreadRequest: NewThreadRequest = (req.body: any);
  if (!newThreadRequestInputValidator.is(newThreadRequest)) {
    throw new ServerError('invalid_parameters');
  }

  return await createThread(viewer, newThreadRequest);
}

const joinThreadRequestInputValidator = tShape({
  threadID: t.String,
  password: t.maybe(t.String),
});
async function threadJoinResponder(
  viewer: Viewer,
  req: $Request,
  res: $Response,
): Promise<ThreadJoinResult> {
  const threadJoinRequest: ThreadJoinRequest = (req.body: any);
  if (!joinThreadRequestInputValidator.is(threadJoinRequest)) {
    throw new ServerError('invalid_parameters');
  }

  return await joinThread(viewer, threadJoinRequest);
}

export {
  threadDeletionResponder,
  roleUpdateResponder,
  memberRemovalResponder,
  threadLeaveResponder,
  threadUpdateResponder,
  threadCreationResponder,
  threadJoinResponder,
};
