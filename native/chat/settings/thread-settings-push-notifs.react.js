// @flow

import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { AppState } from '../../redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type {
  SubscriptionUpdateRequest,
  ThreadSubscription,
} from 'lib/types/subscription-types';

import React from 'react';
import { Text, StyleSheet, View, Switch } from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { visibilityRules } from 'lib/types/thread-types';
import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import {
  updateSubscriptionActionTypes,
  updateSubscription,
} from 'lib/actions/user-actions';

type Props = {|
  threadInfo: ThreadInfo,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  updateSubscription: (
    subscriptionUpdate: SubscriptionUpdateRequest,
  ) => Promise<ThreadSubscription>,
|};
type State = {|
  currentValue: bool,
|};
class ThreadSettingsPushNotifs extends React.PureComponent<Props, State> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    updateSubscription: PropTypes.func.isRequired,
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      currentValue: props.threadInfo.currentUser.subscription.pushNotifs,
    };
  }

  render() {
    return (
      <View style={styles.row}>
        <Text style={styles.label}>Push notifs</Text>
        <View style={styles.currentValue}>
          <Switch
            value={this.state.currentValue}
            onValueChange={this.onValueChange}
          />
        </View>
      </View>
    );
  }

  onValueChange = (value: bool) => {
    this.setState({ currentValue: value });
    this.props.dispatchActionPromise(
      updateSubscriptionActionTypes,
      this.props.updateSubscription({
        threadID: this.props.threadInfo.id,
        updatedFields: {
          pushNotifs: value,
        },
      }),
    );
  }

}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: "white",
    paddingVertical: 3,
  },
  label: {
    fontSize: 16,
    width: 96,
    color: "#888888",
  },
  currentValue: {
    flex: 1,
    paddingLeft: 4,
    paddingRight: 0,
    paddingVertical: 0,
    margin: 0,
    alignItems: 'flex-end',
  },
});

export default connect(
  (state: AppState) => ({
    cookie: state.cookie,
  }),
  includeDispatchActionProps,
  bindServerCalls({ updateSubscription }),
)(ThreadSettingsPushNotifs);
