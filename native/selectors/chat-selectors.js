// @flow

import type { AppState } from '../redux-setup';
import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type {
  MessageInfo,
  MessageStore,
  TextMessageInfo,
  RobotextMessageInfo,
} from 'lib/types/message-types';
import { messageInfoPropType } from 'lib/types/message-types';
import type { UserInfo } from 'lib/types/user-types';

import { createSelector } from 'reselect';
import PropTypes from 'prop-types';
import invariant from 'invariant';
import _flow from 'lodash/fp/flow';
import _filter from 'lodash/fp/filter';
import _map from 'lodash/fp/map';
import _orderBy from 'lodash/fp/orderBy';
import _memoize from 'lodash/memoize';

import { messageType } from 'lib/types/message-types';
import {
  robotextForMessageInfo,
  createMessageInfo,
} from 'lib/shared/message-utils';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';

export type ChatThreadItem = {|
  type: "chatThreadItem",
  threadInfo: ThreadInfo,
  mostRecentMessageInfo?: MessageInfo,
  lastUpdatedTime: number,
|};
const chatThreadItemPropType = PropTypes.shape({
  type: PropTypes.oneOf(["chatThreadItem"]),
  threadInfo: threadInfoPropType.isRequired,
  mostRecentMessageInfo: messageInfoPropType,
  lastUpdatedTime: PropTypes.number.isRequired,
});
const chatListData = createSelector(
  threadInfoSelector,
  (state: AppState) => state.messageStore,
  (state: AppState) => state.currentUserInfo && state.currentUserInfo.id,
  (state: AppState) => state.userInfos,
  (
    threadInfos: {[id: string]: ThreadInfo},
    messageStore: MessageStore,
    viewerID: ?string,
    userInfos: {[id: string]: UserInfo},
  ): ChatThreadItem[] => _flow(
    _map((threadInfo: ThreadInfo): ChatThreadItem => {
      const thread = messageStore.threads[threadInfo.id];
      if (!thread || thread.messageIDs.length === 0) {
        return {
          type: "chatThreadItem",
          threadInfo,
          lastUpdatedTime: threadInfo.creationTime,
        };
      }
      let mostRecentMessageInfo = undefined;
      for (let messageID of thread.messageIDs) {
        const mostRecentRawMessageInfo = messageStore.messages[messageID];
        mostRecentMessageInfo = createMessageInfo(
          mostRecentRawMessageInfo,
          viewerID,
          userInfos,
          threadInfos,
        );
        if (mostRecentMessageInfo) {
          break;
        }
      }
      if (!mostRecentMessageInfo) {
        return {
          type: "chatThreadItem",
          threadInfo,
          lastUpdatedTime: threadInfo.creationTime,
        };
      }
      return {
        type: "chatThreadItem",
        threadInfo,
        mostRecentMessageInfo,
        lastUpdatedTime: mostRecentMessageInfo.time,
      };
    }),
    _orderBy("lastUpdatedTime")("desc"),
  )(threadInfos),
);

export type ChatMessageInfoItem = {|
  itemType: "message",
  messageInfo: RobotextMessageInfo,
  startsConversation: bool,
  startsCluster: bool,
  endsCluster: bool,
  robotext: string,
|} | {|
  itemType: "message",
  messageInfo: TextMessageInfo,
  startsConversation: bool,
  startsCluster: bool,
  endsCluster: bool,
|};
export type ChatMessageItem =
  {| itemType: "loader" |} |
  ChatMessageInfoItem;
const chatMessageItemPropType = PropTypes.oneOfType([
  PropTypes.shape({
    itemType: PropTypes.oneOf(["loader"]).isRequired,
  }),
  PropTypes.shape({
    itemType: PropTypes.oneOf(["message"]).isRequired,
    messageInfo: messageInfoPropType.isRequired,
    startsConversation: PropTypes.bool.isRequired,
    startsCluster: PropTypes.bool.isRequired,
    endsCluster: PropTypes.bool.isRequired,
    robotext: PropTypes.string,
  }),
]);
const msInFiveMinutes = 5 * 60 * 1000;
const baseMessageListData = (threadID: string) => createSelector(
  (state: AppState) => state.messageStore,
  (state: AppState) => state.currentUserInfo && state.currentUserInfo.id,
  (state: AppState) => state.userInfos,
  threadInfoSelector,
  (
    messageStore: MessageStore,
    viewerID: ?string,
    userInfos: {[id: string]: UserInfo},
    threadInfos: {[id: string]: ThreadInfo},
  ): ChatMessageItem[] => {
    const thread = messageStore.threads[threadID];
    if (!thread) {
      return [];
    }
    const rawMessageInfos = thread.messageIDs
      .map((messageID: string) => messageStore.messages[messageID])
      .filter(Boolean);
    const chatMessageItems = [];
    let lastMessageInfo = null;
    for (let i = rawMessageInfos.length - 1; i >= 0; i--) {
      const rawMessageInfo = rawMessageInfos[i];
      let startsConversation = true;
      let startsCluster = true;
      if (
        lastMessageInfo &&
        lastMessageInfo.time + msInFiveMinutes > rawMessageInfo.time
      ) {
        startsConversation = false;
        if (
          lastMessageInfo.type === messageType.TEXT &&
          rawMessageInfo.type === messageType.TEXT &&
          lastMessageInfo.creatorID === rawMessageInfo.creatorID
        ) {
          startsCluster = false;
        }
      }
      if (startsCluster && chatMessageItems.length > 0) {
        const lastMessageItem = chatMessageItems[chatMessageItems.length - 1];
        invariant(lastMessageItem.itemType === "message", "should be message");
        lastMessageItem.endsCluster = true;
      }
      const messageInfo = createMessageInfo(
        rawMessageInfo,
        viewerID,
        userInfos,
        threadInfos,
      );
      if (!messageInfo) {
        continue;
      }
      if (messageInfo.type === messageType.TEXT) {
        chatMessageItems.push({
          itemType: "message",
          messageInfo,
          startsConversation,
          startsCluster,
          endsCluster: false,
        });
      } else {
        const robotext = robotextForMessageInfo(
          messageInfo,
          threadInfos[threadID],
        );
        chatMessageItems.push({
          itemType: "message",
          messageInfo,
          startsConversation,
          startsCluster,
          endsCluster: false,
          robotext,
        });
      }
      lastMessageInfo = messageInfo;
    }
    if (chatMessageItems.length > 0) {
      const lastMessageItem = chatMessageItems[chatMessageItems.length - 1];
      invariant(lastMessageItem.itemType === "message", "should be message");
      lastMessageItem.endsCluster = true;
    }
    chatMessageItems.reverse();
    if (thread.startReached) {
      return chatMessageItems;
    }
    return [...chatMessageItems, ({ itemType: "loader" }: ChatMessageItem)];
  },
);
const messageListData = _memoize(baseMessageListData);

export {
  chatThreadItemPropType,
  chatListData,
  chatMessageItemPropType,
  messageListData,
};
