// @flow

import {
  type NewThreadRequest,
  type NewThreadResult,
  visibilityRules,
  threadPermissions,
} from 'lib/types/thread-types';
import type { Viewer } from '../session/viewer';

import bcrypt from 'twin-bcrypt';

import { generateRandomColor } from 'lib/shared/thread-utils';
import { ServerError } from 'lib/utils/fetch-utils';
import { getAllThreadPermissions } from 'lib/permissions/thread-permissions';
import { messageType } from 'lib/types/message-types';

import { pool, SQL } from '../database';
import { checkThreadPermission } from '../fetchers/thread-fetchers';
import createIDs from './id-creator';
import createInitialRolesForNewThread from './role-creator';
import { verifyUserIDs } from '../fetchers/user-fetchers';
import {
  changeRole,
  recalculateAllPermissions,
  saveMemberships,
  deleteMemberships,
} from '../updaters/thread-permission-updaters';
import createMessages from './message-creator';

async function createThread(
  viewer: Viewer,
  request: NewThreadRequest,
): Promise<NewThreadResult> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const visRules = request.visibilityRules;
  let password = null;
  if (
    visRules === visibilityRules.CLOSED ||
    visRules === visibilityRules.SECRET
  ) {
    if (!request.password || request.password.trim() === "") {
      throw new ServerError('empty_password');
    }
    password = request.password;
  } else if (visRules === visibilityRules.NESTED_OPEN) {
    if (!request.parentThreadID) {
      throw new ServerError('invalid_parameters');
    }
  }

  let parentThreadID = null;
  if (request.parentThreadID) {
    if (
      visRules === visibilityRules.OPEN ||
      visRules === visibilityRules.CLOSED ||
      visRules === visibilityRules.SECRET
    ) {
      throw new ServerError('invalid_parameters');
    }
    parentThreadID = request.parentThreadID;
    const hasPermission = await checkThreadPermission(
      viewer,
      parentThreadID,
      threadPermissions.CREATE_SUBTHREADS,
    );
    if (!hasPermission) {
      throw new ServerError('invalid_credentials');
    }
  }

  const [ id ] = await createIDs("threads", 1);
  const newRoles = await createInitialRolesForNewThread(id);

  const name = request.name ? request.name : null;
  const description = request.description ? request.description : null;
  const color = request.color
    ? request.color.toLowerCase()
    : generateRandomColor();
  const time = Date.now();
  const hash = password ? bcrypt.hashSync(password) : null;

  const row = [
    id,
    name,
    description,
    visRules,
    hash,
    viewer.userID,
    time,
    color,
    parentThreadID,
    newRoles.members.id,
  ];
  const query = SQL`
    INSERT INTO threads(id, name, description, visibility_rules, hash, creator,
      creation_time, color, parent_thread_id, default_role)
    VALUES ${[row]}
  `;
  const [ initialMemberIDs, [ result ] ] = await Promise.all([
    request.initialMemberIDs
      ? verifyUserIDs(request.initialMemberIDs)
      : undefined,
    pool.query(query),
  ]);

  const [
    creatorChangeset,
    initialMembersChangeset,
    recalculatePermissionsChangeset,
  ] = await Promise.all([
    changeRole(id, [viewer.userID], newRoles.admins.id),
    initialMemberIDs
      ? changeRole(id, initialMemberIDs, null)
      : undefined,
    recalculateAllPermissions(id, visRules),
  ]);
  if (!creatorChangeset) {
    throw new ServerError('unknown_error');
  }
  const initialMemberAndCreatorIDs = initialMemberIDs
    ? [...initialMemberIDs, viewer.userID]
    : [viewer.userID];
  let toSave = [
    ...creatorChangeset.toSave,
    ...recalculatePermissionsChangeset.toSave.filter(
      rowToSave => !initialMemberAndCreatorIDs.includes(rowToSave.userID),
    ),
  ];
  let toDelete = [
    ...creatorChangeset.toDelete,
    ...recalculatePermissionsChangeset.toDelete.filter(
      rowToSave => !initialMemberAndCreatorIDs.includes(rowToSave.userID),
    ),
  ];
  if (initialMemberIDs) {
    if (!initialMembersChangeset) {
      throw new ServerError('unknown_error');
    }
    toSave = [...toSave, ...initialMembersChangeset.toSave];
    toDelete = [...toDelete, ...initialMembersChangeset.toDelete];
  }

  const members = [];
  let currentUserInfo = null;
  for (let rowToSave of toSave) {
    if (
      rowToSave.role !== "0" &&
      (rowToSave.userID !== viewer.userID ||
        rowToSave.threadID !== id)
    ) {
      rowToSave.unread = true;
    }
    if (rowToSave.threadID === id && rowToSave.role !== "0") {
      const subscription = { home: true, pushNotifs: true };
      rowToSave.subscription = subscription;
      const member = {
        id: rowToSave.userID,
        permissions: getAllThreadPermissions(
          { permissions: rowToSave.permissions, visibilityRules: visRules },
          id,
        ),
        role: rowToSave.role && rowToSave.role !== "0"
          ? rowToSave.role
          : null,
      };
      members.unshift(member);
      if (rowToSave.userID === viewer.userID) {
        currentUserInfo = {
          role: member.role,
          permissions: member.permissions,
          subscription,
          unread: false,
        };
      }
    }
  }
  if (!currentUserInfo) {
    throw new ServerError('unknown_error');
  }

  const messageDatas = [{
    type: messageType.CREATE_THREAD,
    threadID: id,
    creatorID: viewer.userID,
    time,
    initialThreadState: {
      name,
      parentThreadID,
      visibilityRules: visRules,
      color,
      memberIDs: initialMemberAndCreatorIDs,
    },
  }];
  if (parentThreadID) {
    messageDatas.push({
      type: messageType.CREATE_SUB_THREAD,
      threadID: parentThreadID,
      creatorID: viewer.userID,
      time,
      childThreadID: id,
    });
  }

  const [ newMessageInfos ] = await Promise.all([
    createMessages(messageDatas),
    saveMemberships(toSave),
    deleteMemberships(toDelete),
  ]);

  return {
    newThreadInfo: {
      id,
      name,
      description,
      visibilityRules: visRules,
      color,
      creationTime: time,
      parentThreadID,
      members,
      roles: {
        [newRoles.members.id]: newRoles.members,
        [newRoles.admins.id]: newRoles.admins,
      },
      currentUser: currentUserInfo,
    },
    newMessageInfos,
  };
}

export default createThread;
