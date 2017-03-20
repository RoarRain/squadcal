// @flow

import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { AppState } from '../redux-setup';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { RegisterResult } from 'lib/actions/user-actions';

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableHighlight,
  Text,
  Platform,
  ActivityIndicator,
  Keyboard,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { connect } from 'react-redux';
import invariant from 'invariant';

import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import { registerActionType, register } from 'lib/actions/user-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  validUsernameRegex,
  validEmailRegex,
} from 'lib/shared/account-regexes';

import { TextInput } from '../modal-components.react';

class RegisterPanel extends React.PureComponent {

  props: {
    navigateToApp: () => void,
    setActiveAlert: (activeAlert: bool) => void,
    // Redux state
    loadingStatus: LoadingStatus,
    // Redux dispatch functions
    dispatchActionPromise: DispatchActionPromise,
    // async functions that hit server APIs
    register: (
      username: string,
      email: string,
      password: string,
    ) => Promise<RegisterResult>,
  };
  static propTypes = {
    navigateToApp: React.PropTypes.func.isRequired,
    setActiveAlert: React.PropTypes.func.isRequired,
    loadingStatus: React.PropTypes.string.isRequired,
    dispatchActionPromise: React.PropTypes.func.isRequired,
    register: React.PropTypes.func.isRequired,
  };
  state: {
    usernameInputText: string,
    emailInputText: string,
    passwordInputText: string,
    confirmPasswordInputText: string,
  } = {
    usernameInputText: "",
    emailInputText: "",
    passwordInputText: "",
    confirmPasswordInputText: "",
  };
  usernameInput: ?TextInput;
  emailInput: ?TextInput;
  passwordInput: ?TextInput;
  confirmPasswordInput: ?TextInput;

  render() {
    let buttonIcon;
    if (this.props.loadingStatus === "loading") {
      buttonIcon = (
        <View style={styles.loadingIndicatorContainer}>
          <ActivityIndicator color="#555" />
        </View>
      );
    } else {
      buttonIcon = (
        <View style={styles.submitContentIconContainer}>
          <Icon
            name="arrow-right"
            size={16}
            color="#555"
          />
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <View>
          <Icon name="user" size={22} color="#777" style={styles.icon} />
          <TextInput
            style={styles.input}
            value={this.state.usernameInputText}
            onChangeText={this.onChangeUsernameInputText}
            placeholder="Username"
            autoFocus={true}
            autoCorrect={false}
            autoCapitalize="none"
            keyboardType="ascii-capable"
            returnKeyType='next'
            blurOnSubmit={false}
            onSubmitEditing={this.focusEmailInput}
            editable={this.props.loadingStatus !== "loading"}
            ref={this.usernameInputRef}
          />
        </View>
        <View>
          <Icon
            name="envelope"
            size={18}
            color="#777"
            style={[styles.icon, styles.envelopeIcon]}
          />
          <TextInput
            style={styles.input}
            value={this.state.emailInputText}
            onChangeText={this.onChangeEmailInputText}
            placeholder="Email address"
            autoCorrect={false}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType='next'
            blurOnSubmit={false}
            onSubmitEditing={this.focusPasswordInput}
            editable={this.props.loadingStatus !== "loading"}
            ref={this.emailInputRef}
          />
        </View>
        <View>
          <Icon name="lock" size={22} color="#777" style={styles.icon} />
          <TextInput
            style={styles.input}
            value={this.state.passwordInputText}
            onChangeText={this.onChangePasswordInputText}
            placeholder="Password"
            secureTextEntry={true}
            returnKeyType='next'
            blurOnSubmit={false}
            onSubmitEditing={this.focusConfirmPasswordInput}
            editable={this.props.loadingStatus !== "loading"}
            ref={this.passwordInputRef}
          />
        </View>
        <View>
          <TextInput
            style={styles.input}
            value={this.state.confirmPasswordInputText}
            onChangeText={this.onChangeConfirmPasswordInputText}
            placeholder="Confirm password"
            secureTextEntry={true}
            returnKeyType='go'
            blurOnSubmit={false}
            onSubmitEditing={this.onSubmit}
            editable={this.props.loadingStatus !== "loading"}
            ref={this.confirmPasswordInputRef}
          />
        </View>
        <TouchableHighlight
          onPress={this.onSubmit}
          style={styles.submitButton}
          underlayColor="#A0A0A0DD"
        >
          <View style={styles.submitContentContainer}>
            <Text style={styles.submitContentText}>SIGN UP</Text>
            {buttonIcon}
          </View>
        </TouchableHighlight>
      </View>
    );
  }

  usernameInputRef = (usernameInput: ?TextInput) => {
    this.usernameInput = usernameInput;
  }

  emailInputRef = (emailInput: ?TextInput) => {
    this.emailInput = emailInput;
  }

  passwordInputRef = (passwordInput: ?TextInput) => {
    this.passwordInput = passwordInput;
  }

  confirmPasswordInputRef = (confirmPasswordInput: ?TextInput) => {
    this.confirmPasswordInput = confirmPasswordInput;
  }

  focusEmailInput = () => {
    invariant(this.emailInput, "ref should be set");
    this.emailInput.focus();
  }

  focusPasswordInput = () => {
    invariant(this.passwordInput, "ref should be set");
    this.passwordInput.focus();
  }

  focusConfirmPasswordInput = () => {
    invariant(this.confirmPasswordInput, "ref should be set");
    this.confirmPasswordInput.focus();
  }

  onChangeUsernameInputText = (text: string) => {
    this.setState({ usernameInputText: text });
  }

  onChangeEmailInputText = (text: string) => {
    this.setState({ emailInputText: text });
  }

  onChangePasswordInputText = (text: string) => {
    this.setState({ passwordInputText: text });
  }

  onChangeConfirmPasswordInputText = (text: string) => {
    this.setState({ confirmPasswordInputText: text });
  }

  onSubmit = () => {
    if (this.state.passwordInputText === '') {
      this.props.setActiveAlert(true);
      Alert.alert(
        "Empty password",
        "Password cannot be empty",
        [
          { text: 'OK', onPress: this.onPasswordAlertAcknowledged },
        ],
        { cancelable: false },
      );
    } else if (
      this.state.passwordInputText !== this.state.confirmPasswordInputText
    ) {
      this.props.setActiveAlert(true);
      Alert.alert(
        "Passwords don't match",
        "Password fields must contain the same password",
        [
          { text: 'OK', onPress: this.onPasswordAlertAcknowledged },
        ],
        { cancelable: false },
      );
    } else if (this.state.usernameInputText.search(validUsernameRegex) === -1) {
      this.props.setActiveAlert(true);
      Alert.alert(
        "Invalid username",
        "Alphanumeric usernames only",
        [
          { text: 'OK', onPress: this.onUsernameAlertAcknowledged },
        ],
        { cancelable: false },
      );
    } else if (this.state.emailInputText.search(validEmailRegex) === -1) {
      this.props.setActiveAlert(true);
      Alert.alert(
        "Invalid email address",
        "Valid email addresses only",
        [
          { text: 'OK', onPress: this.onEmailAlertAcknowledged },
        ],
        { cancelable: false },
      );
    } else {
      Keyboard.dismiss();
      this.props.dispatchActionPromise(
        registerActionType,
        this.registerAction(),
      );
    }
  }

  onPasswordAlertAcknowledged = () => {
    this.props.setActiveAlert(false);
    this.setState(
      {
        passwordInputText: "",
        confirmPasswordInputText: "",
      },
      () => {
        invariant(this.passwordInput, "ref should exist");
        this.passwordInput.focus();
      },
    );
  }

  onUsernameAlertAcknowledged = () => {
    this.props.setActiveAlert(false);
    this.setState(
      {
        usernameInputText: "",
      },
      () => {
        invariant(this.usernameInput, "ref should exist");
        this.usernameInput.focus();
      },
    );
  }

  onEmailAlertAcknowledged = () => {
    this.setState(
      {
        emailInputText: "",
      },
      () => {
        invariant(this.emailInput, "ref should exist");
        this.emailInput.focus();
      },
    );
  }

  async registerAction() {
    try {
      const result = await this.props.register(
        this.state.usernameInputText,
        this.state.emailInputText,
        this.state.passwordInputText,
      );
      this.props.navigateToApp();
      return result;
    } catch (e) {
      this.props.setActiveAlert(true);
      if (e.message === 'username_taken') {
        Alert.alert(
          "Username taken",
          "An account with that username already exists",
          [
            { text: 'OK', onPress: this.onUsernameAlertAcknowledged },
          ],
          { cancelable: false },
        );
      } else if (e.message === 'email_taken') {
        Alert.alert(
          "Email taken",
          "An account with that email already exists",
          [
            { text: 'OK', onPress: this.onEmailAlertAcknowledged },
          ],
          { cancelable: false },
        );
      } else {
        Alert.alert(
          "Unknown error",
          "Uhh... try again?",
          [
            { text: 'OK', onPress: this.onUnknownErrorAlertAcknowledged },
          ],
          { cancelable: false },
        );
      }
      throw e;
    }
  }

  onUnknownErrorAlertAcknowledged = () => {
    this.props.setActiveAlert(false);
    this.setState(
      {
        usernameInputText: "",
        emailInputText: "",
        passwordInputText: "",
        confirmPasswordInputText: "",
      },
      () => {
        invariant(this.usernameInput, "ref should exist");
        this.usernameInput.focus();
      },
    );
  }

}

const styles = StyleSheet.create({
  container: {
    paddingBottom: Platform.OS === 'ios' ? 37 : 36,
    paddingTop: 6,
    paddingLeft: 18,
    paddingRight: 18,
    marginLeft: 20,
    marginRight: 20,
    marginTop: 40,
    borderRadius: 6,
    backgroundColor: '#FFFFFFAA',
    zIndex: 2,
  },
  input: {
    paddingLeft: 35,
  },
  icon: {
    position: 'absolute',
    bottom: 8,
    left: 4,
  },
  envelopeIcon: {
    left: 3,
    bottom: 10,
  },
  submitButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderBottomRightRadius: 6,
  },
  submitContentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: 18,
    paddingTop: 6,
    paddingRight: 18,
    paddingBottom: 6,
  },
  submitContentText: {
    fontSize: 18,
    fontFamily: 'OpenSans-Semibold',
    color: "#555",
    paddingRight: 7,
  },
  submitContentIconContainer: {
    width: 14,
    paddingBottom: 5,
  },
  loadingIndicatorContainer: {
    width: 14,
    paddingBottom: 2,
  },
});

const loadingStatusSelector = createLoadingStatusSelector(registerActionType);

export default connect(
  (state: AppState) => ({
    cookie: state.cookie,
    loadingStatus: loadingStatusSelector(state),
  }),
  includeDispatchActionProps({ dispatchActionPromise: true }),
  bindServerCalls({ register }),
)(RegisterPanel);