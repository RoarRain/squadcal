// @flow

import type { BaseAction } from '../types/redux-types';

import { setDeviceTokenActionTypes } from '../actions/device-actions';

export default function reduceDeviceToken(
  state: ?string,
  action: BaseAction,
) {
  if (action.type === setDeviceTokenActionTypes.success) {
    return action.payload;
  }
  return state;
}
