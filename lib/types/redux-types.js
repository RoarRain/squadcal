// @flow

import type {
  RawThreadInfo,
  ChangeThreadSettingsResult,
  LeaveThreadPayload,
  DeleteThreadPayload,
  NewThreadResult,
  ThreadJoinPayload,
} from './thread-types';
import type {
  RawEntryInfo,
  EntryStore,
  CalendarQuery,
  SaveEntryPayload,
  CreateEntryResponse,
  DeleteEntryResponse,
  RestoreEntryResponse,
  FetchEntryInfosResult,
  CalendarResult,
} from './entry-types';
import type { LoadingStatus, LoadingInfo } from './loading-types';
import type { BaseNavInfo } from './nav-types';
import type { CurrentUserInfo, LoggedInUserInfo, UserInfo } from './user-types';
import type {
  LogOutResult,
  LogInResult,
  LogInStartingPayload,
} from '../actions/user-actions';
import type { UserSearchResult } from '../types/search-types';
import type {
  PingStartingPayload,
  PingSuccessPayload,
} from '../types/ping-types';
import type {
  MessageStore,
  RawTextMessageInfo,
  RawMessageInfo,
  FetchMessageInfosPayload,
  SendTextMessagePayload,
} from './message-types';
import type { SetCookiePayload } from '../utils/action-utils';
import type { UpdateActivityResult } from '../types/activity-types';

export type BaseAppState = {
  // This "+" means that navInfo can be a sub-type of BaseNavInfo. As a result,
  // within lib (where we're handling a generic BaseAppState) we can read
  // navInfo, but we can't set it - otherwise, we may be setting a more specific
  // type to a more general one.
  +navInfo: BaseNavInfo,
  currentUserInfo: ?CurrentUserInfo,
  sessionID: string,
  entryStore: EntryStore,
  lastUserInteraction: {[section: string]: number},
  threadInfos: {[id: string]: RawThreadInfo},
  userInfos: {[id: string]: UserInfo},
  messageStore: MessageStore,
  drafts: {[key: string]: string},
  currentAsOf: number, // millisecond timestamp
  loadingStatuses: {[key: string]: {[idx: number]: LoadingStatus}},
  cookie: ?string,
  deviceToken: ?string,
};

export type BaseAction =
  {| type: "@@redux/INIT" |} | {|
    type: "FETCH_ENTRIES_AND_SET_RANGE_STARTED",
    payload?: {|
      calendarQuery?: CalendarQuery,
    |},
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_ENTRIES_AND_SET_RANGE_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_ENTRIES_AND_SET_RANGE_SUCCESS",
    payload: CalendarResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_ENTRIES_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_ENTRIES_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_ENTRIES_SUCCESS",
    payload: FetchEntryInfosResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "LOG_OUT_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "LOG_OUT_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "LOG_OUT_SUCCESS",
    payload: LogOutResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "DELETE_ACCOUNT_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "DELETE_ACCOUNT_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "DELETE_ACCOUNT_SUCCESS",
    payload: LogOutResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "CREATE_LOCAL_ENTRY",
    payload: RawEntryInfo,
  |} | {|
    type: "CREATE_ENTRY_STARTED",
    loadingInfo: LoadingInfo,
    payload: {| newSessionID?: string |},
  |} | {|
    type: "CREATE_ENTRY_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "CREATE_ENTRY_SUCCESS",
    payload: CreateEntryResponse,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SAVE_ENTRY_STARTED",
    loadingInfo: LoadingInfo,
    payload: {| newSessionID?: string |},
  |} | {|
    type: "SAVE_ENTRY_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SAVE_ENTRY_SUCCESS",
    payload: SaveEntryPayload,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "CONCURRENT_MODIFICATION_RESET",
    payload: {|
      id: string,
      dbText: string,
    |},
  |} | {|
    type: "DELETE_ENTRY_STARTED",
    loadingInfo: LoadingInfo,
    payload: {|
      localID: ?string,
      serverID: ?string,
      newSessionID?: string,
    |},
  |} | {|
    type: "DELETE_ENTRY_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "DELETE_ENTRY_SUCCESS",
    payload: ?DeleteEntryResponse,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "LOG_IN_STARTED",
    loadingInfo: LoadingInfo,
    payload?: LogInStartingPayload,
  |} | {|
    type: "LOG_IN_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "LOG_IN_SUCCESS",
    payload: LogInResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "REGISTER_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "REGISTER_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "REGISTER_SUCCESS",
    payload: LoggedInUserInfo,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "RESET_PASSWORD_STARTED",
    payload?: {|
      calendarQuery?: CalendarQuery,
    |},
    loadingInfo: LoadingInfo,
  |} | {|
    type: "RESET_PASSWORD_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "RESET_PASSWORD_SUCCESS",
    payload: LogInResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FORGOT_PASSWORD_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FORGOT_PASSWORD_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FORGOT_PASSWORD_SUCCESS",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "CHANGE_USER_SETTINGS_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "CHANGE_USER_SETTINGS_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "CHANGE_USER_SETTINGS_SUCCESS",
    payload: {|
      email: string,
    |},
    loadingInfo: LoadingInfo,
  |} | {|
    type: "RESEND_VERIFICATION_EMAIL_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "RESEND_VERIFICATION_EMAIL_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "RESEND_VERIFICATION_EMAIL_SUCCESS",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "CHANGE_THREAD_SETTINGS_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "CHANGE_THREAD_SETTINGS_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "CHANGE_THREAD_SETTINGS_SUCCESS",
    payload: ChangeThreadSettingsResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "DELETE_THREAD_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "DELETE_THREAD_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "DELETE_THREAD_SUCCESS",
    payload: DeleteThreadPayload,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "NEW_THREAD_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "NEW_THREAD_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "NEW_THREAD_SUCCESS",
    payload: NewThreadResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "REMOVE_USERS_FROM_THREAD_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "REMOVE_USERS_FROM_THREAD_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "REMOVE_USERS_FROM_THREAD_SUCCESS",
    payload: ChangeThreadSettingsResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "CHANGE_THREAD_MEMBER_ROLES_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "CHANGE_THREAD_MEMBER_ROLES_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "CHANGE_THREAD_MEMBER_ROLES_SUCCESS",
    payload: ChangeThreadSettingsResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_REVISIONS_FOR_ENTRY_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_REVISIONS_FOR_ENTRY_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_REVISIONS_FOR_ENTRY_SUCCESS",
    payload: {|
      entryID: string,
      text: string,
      deleted: bool,
    |},
    loadingInfo: LoadingInfo,
  |} | {|
    type: "RESTORE_ENTRY_STARTED",
    loadingInfo: LoadingInfo,
    payload: {|
      newSessionID?: string,
    |},
  |} | {|
    type: "RESTORE_ENTRY_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "RESTORE_ENTRY_SUCCESS",
    payload: RestoreEntryResponse,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "JOIN_THREAD_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "JOIN_THREAD_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "JOIN_THREAD_SUCCESS",
    payload: ThreadJoinPayload,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "LEAVE_THREAD_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "LEAVE_THREAD_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "LEAVE_THREAD_SUCCESS",
    payload: LeaveThreadPayload,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SET_COOKIE",
    payload: SetCookiePayload,
  |} | {|
    type: "PING_STARTED",
    payload: PingStartingPayload,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "PING_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "PING_SUCCESS",
    payload: PingSuccessPayload,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "NEW_SESSION_ID",
    payload: string,
  |} | {|
    type: "FETCH_ENTRIES_AND_APPEND_RANGE_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_ENTRIES_AND_APPEND_RANGE_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_ENTRIES_AND_APPEND_RANGE_SUCCESS",
    payload: CalendarResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "persist/REHYDRATE",
    payload: BaseAppState,
  |} | {|
    type: "FETCH_MESSAGES_BEFORE_CURSOR_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_MESSAGES_BEFORE_CURSOR_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_MESSAGES_BEFORE_CURSOR_SUCCESS",
    payload: FetchMessageInfosPayload,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_MOST_RECENT_MESSAGES_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_MOST_RECENT_MESSAGES_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "FETCH_MOST_RECENT_MESSAGES_SUCCESS",
    payload: FetchMessageInfosPayload,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SEND_MESSAGE_STARTED",
    loadingInfo: LoadingInfo,
    payload: RawTextMessageInfo,
  |} | {|
    type: "SEND_MESSAGE_FAILED",
    error: true,
    payload: Error & {
      localID: string,
      threadID: string,
    },
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SEND_MESSAGE_SUCCESS",
    payload: SendTextMessagePayload,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SEARCH_USERS_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SEARCH_USERS_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SEARCH_USERS_SUCCESS",
    payload: UserSearchResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SAVE_DRAFT",
    payload: {
      key: string,
      draft: string,
    },
  |} | {|
    type: "UPDATE_ACTIVITY_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "UPDATE_ACTIVITY_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "UPDATE_ACTIVITY_SUCCESS",
    payload: UpdateActivityResult,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SET_DEVICE_TOKEN_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SET_DEVICE_TOKEN_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "SET_DEVICE_TOKEN_SUCCESS",
    payload: string,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "HANDLE_VERIFICATION_CODE_STARTED",
    loadingInfo: LoadingInfo,
  |} | {|
    type: "HANDLE_VERIFICATION_CODE_FAILED",
    error: true,
    payload: Error,
    loadingInfo: LoadingInfo,
  |} | {|
    type: "HANDLE_VERIFICATION_CODE_SUCCESS",
    loadingInfo: LoadingInfo,
  |};

export type ActionPayload = ?(Object | Array<*> | string);
export type SuperAction = {
  type: $Subtype<string>,
  payload?: ActionPayload,
  loadingInfo?: LoadingInfo,
  error?: bool,
};
type ThunkedAction = (dispatch: Dispatch) => void;
export type PromisedAction = (dispatch: Dispatch) => Promise<void>;
export type Dispatch =
  ((promisedAction: PromisedAction) => Promise<void>) &
  ((thunkedAction: ThunkedAction) => void) &
  ((action: SuperAction) => bool);

export const rehydrateActionType = "persist/REHYDRATE";
