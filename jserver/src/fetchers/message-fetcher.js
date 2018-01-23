// @flow

import type { Connection } from '../database';
import type { PushInfo } from '../push/send';
import type { UserInfo } from 'lib/types/user-types';
import type { RawMessageInfo } from 'lib/types/message-types';

import invariant from 'invariant';

import { notifCollapseKeyForRawMessageInfo } from 'lib/shared/notif-utils';
import { messageType } from 'lib/types/message-types';
import {
  assertVisibilityRules,
  assertEditRules,
  threadPermissions,
  visibilityRules,
} from 'lib/types/thread-types';
import { sortMessageInfoList } from 'lib/shared/message-utils';

import { SQL, appendSQLArray, rawSQL } from '../database';
import { permissionHelper } from '../permissions/permissions';

export type CollapsableNotifInfo = {|
  collapseKey: ?string,
  existingMessageInfos: RawMessageInfo[],
  newMessageInfos: RawMessageInfo[],
|};
export type FetchCollapsableNotifsResult = {|
  usersToCollapsableNotifInfo: { [userID: string]: CollapsableNotifInfo[] },
  userInfos: { [id: string]: UserInfo },
|};

async function fetchCollapsableNotifs(
  conn: Connection,
  pushInfo: PushInfo,
): Promise<FetchCollapsableNotifsResult> {
  // First, we need to fetch any notifications that should be collapsed
  const usersToCollapseKeysToInfo = {};
  const usersToCollapsableNotifInfo = {};
  for (let userID in pushInfo) {
    usersToCollapseKeysToInfo[userID] = {};
    usersToCollapsableNotifInfo[userID] = [];
    for (let rawMessageInfo of pushInfo[userID].messageInfos) {
      const collapseKey = notifCollapseKeyForRawMessageInfo(rawMessageInfo);
      if (!collapseKey) {
        const collapsableNotifInfo = {
          collapseKey,
          existingMessageInfos: [],
          newMessageInfos: [ rawMessageInfo ],
        };
        usersToCollapsableNotifInfo[userID].push(collapsableNotifInfo);
        continue;
      }
      if (!usersToCollapseKeysToInfo[userID][collapseKey]) {
        usersToCollapseKeysToInfo[userID][collapseKey] = {
          collapseKey,
          existingMessageInfos: [],
          newMessageInfos: [],
        };
      }
      usersToCollapseKeysToInfo[userID][collapseKey].newMessageInfos.push(
        rawMessageInfo,
      );
    }
  }

  const sqlTuples = [];
  for (let userID in usersToCollapseKeysToInfo) {
    const collapseKeysToInfo = usersToCollapseKeysToInfo[userID];
    for (let collapseKey in collapseKeysToInfo) {
      sqlTuples.push(
        SQL`(n.user = ${userID} AND n.collapse_key = ${collapseKey})`,
      );
    }
  }

  if (sqlTuples.length === 0) {
    return { usersToCollapsableNotifInfo, userInfos: {} };
  }

  const visPermissionExtractString = `$.${threadPermissions.VISIBLE}.value`;
  const collapseQuery = SQL`
    SELECT m.id, m.thread AS threadID, m.content, m.time, m.type,
      u.username AS creator, m.user AS creatorID,
      stm.permissions AS subthread_permissions,
      st.visibility_rules AS subthread_visibility_rules,
      st.edit_rules AS subthread_edit_rules, n.user, n.collapse_key
    FROM notifications n
    LEFT JOIN messages m ON m.id = n.message
    LEFT JOIN threads t ON t.id = m.thread
    LEFT JOIN memberships mm ON mm.thread = m.thread AND mm.user = n.user
    LEFT JOIN threads st
      ON m.type = ${messageType.CREATE_SUB_THREAD} AND st.id = m.content
    LEFT JOIN memberships stm
      ON m.type = ${messageType.CREATE_SUB_THREAD}
        AND stm.thread = m.content AND stm.user = n.user
    LEFT JOIN users u ON u.id = m.user
    WHERE
      (
        JSON_EXTRACT(mm.permissions, ${visPermissionExtractString}) IS TRUE
        OR t.visibility_rules = ${visibilityRules.OPEN}
      )
      AND n.rescinded = 0
      AND (
  `;
  appendSQLArray(collapseQuery, sqlTuples, " OR ");
  collapseQuery.append(SQL`) ORDER BY m.time DESC`);
  const [ collapseResult ] = await conn.query(collapseQuery);

  const userInfos = {};
  for (let row of collapseResult) {
    userInfos[row.creatorID] = { id: row.creatorID, username: row.creator };
    const rawMessageInfo = rawMessageInfoFromRow(row);
    if (rawMessageInfo) {
      const info = usersToCollapseKeysToInfo[row.user][row.collapse_key];
      info.existingMessageInfos.push(rawMessageInfo);
    }
  }

  for (let userID in usersToCollapseKeysToInfo) {
    const collapseKeysToInfo = usersToCollapseKeysToInfo[userID];
    for (let collapseKey in collapseKeysToInfo) {
      const info = collapseKeysToInfo[collapseKey];
      usersToCollapsableNotifInfo[userID].push({
        collapseKey: info.collapseKey,
        existingMessageInfos: sortMessageInfoList(info.existingMessageInfos),
        newMessageInfos: sortMessageInfoList(info.newMessageInfos),
      });
    }
  }

  return { usersToCollapsableNotifInfo, userInfos };
}

function rawMessageInfoFromRow(row: Object): ?RawMessageInfo {
  const type = parseInt(row.type);
  if (type === messageType.TEXT) {
    return {
      id: row.id,
      threadID: row.threadID,
      time: parseInt(row.time),
      type,
      creatorID: row.creatorID,
      text: row.content,
    };
  } else if (type === messageType.CREATE_THREAD) {
    return {
      id: row.id,
      threadID: row.threadID,
      time: parseInt(row.time),
      type,
      creatorID: row.creatorID,
      initialThreadState: row.content,
    };
  } else if (type === messageType.ADD_MEMBERS) {
    return {
      id: row.id,
      threadID: row.threadID,
      time: parseInt(row.time),
      type,
      creatorID: row.creatorID,
      addedUserIDs: row.content,
    };
  } else if (type === messageType.CREATE_SUB_THREAD) {
    const subthreadPermissionInfo = {
      permissions: row.subthread_permissions,
      visibilityRules: assertVisibilityRules(row.subthread_visibility_rules),
      editRules: assertEditRules(row.subthread_edit_rules),
    };
    if (!permissionHelper(subthreadPermissionInfo, threadPermissions.KNOW_OF)) {
      return null;
    }
    return {
      id: row.id,
      threadID: row.threadID,
      time: parseInt(row.time),
      type,
      creatorID: row.creatorID,
      childThreadID: row.content,
    };
  } else if (type === messageType.CHANGE_SETTINGS) {
    const field = Object.keys(row.content)[0];
    return {
      id: row.id,
      threadID: row.threadID,
      time: parseInt(row.time),
      type,
      creatorID: row.creatorID,
      field,
      value: row.content[field],
    };
  } else if (type === messageType.REMOVE_MEMBERS) {
    return {
      id: row.id,
      threadID: row.threadID,
      time: parseInt(row.time),
      type,
      creatorID: row.creatorID,
      removedUserIDs: row.content,
    };
  } else if (type === messageType.CHANGE_ROLE) {
    return {
      id: row.id,
      threadID: row.threadID,
      time: parseInt(row.time),
      type,
      creatorID: row.creatorID,
      userIDs: row.content.userIDs,
      newRole: row.content.newRole,
    };
  } else if (type === messageType.LEAVE_THREAD) {
    return {
      id: row.id,
      threadID: row.threadID,
      time: parseInt(row.time),
      type: messageType.LEAVE_THREAD,
      creatorID: row.creatorID,
    };
  } else if (type === messageType.JOIN_THREAD) {
    return {
      id: row.id,
      threadID: row.threadID,
      time: parseInt(row.time),
      type: messageType.JOIN_THREAD,
      creatorID: row.creatorID,
    };
  } else if (type === messageType.CREATE_ENTRY) {
    return {
      id: row.id,
      threadID: row.threadID,
      time: parseInt(row.time),
      type: messageType.CREATE_ENTRY,
      creatorID: row.creatorID,
      entryID: row.content.entryID,
      date: row.content.date,
      text: row.content.text,
    };
  } else if (type === messageType.EDIT_ENTRY) {
    return {
      id: row.id,
      threadID: row.threadID,
      time: parseInt(row.time),
      type: messageType.EDIT_ENTRY,
      creatorID: row.creatorID,
      entryID: row.content.entryID,
      date: row.content.date,
      text: row.content.text,
    };
  } else {
    invariant(false, `unrecognized messageType ${type}`);
  }
}

export {
  fetchCollapsableNotifs,
};