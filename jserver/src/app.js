// @flow

import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

import { jsonHandler } from './responders/handlers';
import {
  textMessageCreationResponder,
  messageFetchResponder,
} from './responders/message-responders';
import { updateActivityResponder } from './responders/activity-responders';
import { deviceTokenUpdateResponder } from './responders/device-responders';
import {
  userSubscriptionUpdateResponder,
  accountUpdateResponder,
  sendVerificationEmailResponder,
  sendPasswordResetEmailResponder,
} from './responders/user-responders';
import { userSearchResponder } from './responders/search-responders';
import {
  entryFetchResponder,
  entryRevisionFetchResponder,
  entryCreationResponder,
  entryUpdateResponder,
  entryDeletionResponder,
  entryRestorationResponder,
} from './responders/entry-responders';
import {
  codeVerificationResponder,
} from './responders/verification-responders';
import {
  threadDeletionResponder,
  roleUpdateResponder,
  memberRemovalResponder,
  threadLeaveResponder,
  threadUpdateResponder,
  threadCreationResponder,
  threadJoinResponder,
} from './responders/thread-responders';
import { pingResponder } from './responders/ping-responders';

const app = express();
app.use(bodyParser.json());
app.use(cookieParser());

const jsonEndpoints = {
  'update_activity': updateActivityResponder,
  'update_user_subscription': userSubscriptionUpdateResponder,
  'update_device_token': deviceTokenUpdateResponder,
  'update_account': accountUpdateResponder,
  'send_verification_email': sendVerificationEmailResponder,
  'search_users': userSearchResponder,
  'send_password_reset_email': sendPasswordResetEmailResponder,
  'create_text_message': textMessageCreationResponder,
  'fetch_entries': entryFetchResponder,
  'fetch_entry_revisions': entryRevisionFetchResponder,
  'verify_code': codeVerificationResponder,
  'delete_thread': threadDeletionResponder,
  'create_entry': entryCreationResponder,
  'update_entry': entryUpdateResponder,
  'delete_entry': entryDeletionResponder,
  'restore_entry': entryRestorationResponder,
  'update_role': roleUpdateResponder,
  'remove_members': memberRemovalResponder,
  'leave_thread': threadLeaveResponder,
  'update_thread': threadUpdateResponder,
  'create_thread': threadCreationResponder,
  'fetch_messages': messageFetchResponder,
  'join_thread': threadJoinResponder,
  'ping': pingResponder,
};
for (let endpoint in jsonEndpoints) {
  const responder = jsonEndpoints[endpoint];
  app.post(`/${endpoint}`, jsonHandler(responder));
}

app.listen(parseInt(process.env.PORT) || 3000, 'localhost');
