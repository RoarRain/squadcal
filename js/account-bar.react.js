// @flow

import type { AppState, UpdateStore } from './redux-reducer';

import React from 'react';
import { connect } from 'react-redux';
import update from 'immutability-helper';
import classNames from 'classnames';
import invariant from 'invariant';

import fetchJSON from './fetch-json';
import LogInModal from './modals/account/log-in-modal.react';
import RegisterModal from './modals/account/register-modal.react';
import UserSettingsModal from './modals/account/user-settings-modal.react.js';
import { mapStateToUpdateStore } from './redux-utils';
import { currentNavID } from './nav-utils';
import { UpCaret, DownCaret } from './vectors.react';
import { htmlTargetFromEvent } from './vector-utils';

type Props = {
  loggedIn: bool,
  username: string,
  currentNavID: ?string,
  updateStore: UpdateStore,
  setModal: (modal: React.Element<any>) => void,
  clearModal: () => void,
};
type State = {
  expanded: bool,
}

class AccountBar extends React.Component {

  props: Props;
  state: State;
  menu: ?HTMLDivElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      expanded: false,
    };
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.state.expanded && !prevState.expanded) {
      invariant(this.menu, "menu ref should be set");
      this.menu.focus();
    }
  }

  render() {
    const classes = classNames({
      'lower-left': true,
      'lower-left-null-state': !this.props.currentNavID,
    });
    if (this.props.loggedIn) {
      let menu = null;
      if (this.state.expanded) {
        menu = (
          <div
            className="account-menu"
            tabIndex="0"
            onBlur={() => this.setState({ expanded: false })}
            onKeyDown={this.onMenuKeyDown.bind(this)}
            ref={(elem) => this.menu = elem}
          >
            <div>
              <a
                href="#"
                onClick={this.onLogOut.bind(this)}
              >Log out</a>
            </div>
            <div>
              <a
                href="#"
                onClick={this.onEditAccount.bind(this)}
              >Edit account</a>
            </div>
          </div>
        );
      }
      const caret = this.state.expanded
        ? <DownCaret size="10px" className="account-caret" />
        : <UpCaret size="10px" className="account-caret" />;
      return (
        <div
          className={classes}
          onMouseDown={this.onMouseDown.bind(this)}
        >
          {menu}
          <div className="account-button">
            {"logged in as "}
            <span className="username">{this.props.username}</span>
            {caret}
          </div>
        </div>
      );
    } else {
      return (
        <div className={classes}>
          <div className="account-button">
            <a
              href="#"
              onClick={this.onLogIn.bind(this)}
            >Log in</a>
            {" · "}
            <a
              href="#"
              onClick={this.onRegister.bind(this)}
            >Register</a>
          </div>
        </div>
      );
    }
  }

  // Throw away typechecking here because SyntheticEvent isn't typed
  onMenuKeyDown(event: any) {
    if (event.keyCode === 27) { // Esc
      this.setState({ expanded: false });
    }
  }

  onMouseDown(event: SyntheticEvent) {
    if (!this.state.expanded) {
      // This prevents onBlur from firing on div.account-menu
      event.preventDefault();
      this.setState({ expanded: true });
      return;
    }
    const target = htmlTargetFromEvent(event);
    invariant(this.menu, "menu ref not set");
    if (this.menu.contains(target)) {
      // This prevents onBlur from firing on div.account-menu
      event.preventDefault();
    } else {
      this.setState({ expanded: false });
    }
  }

  async onLogOut(event: SyntheticEvent) {
    event.preventDefault();
    this.setState({ expanded: false });
    const response = await fetchJSON('logout.php', {});
    if (response.success) {
      this.props.updateStore((prevState: AppState) => update(prevState, {
        calendarInfos: { $set: response.calendar_infos },
        email: { $set: "" },
        loggedIn: { $set: false },
        username: { $set: "" },
        emailVerified: { $set: false },
      }));
    }
  }

  onEditAccount(event: SyntheticEvent) {
    event.preventDefault();
    // This will blur the focus off the menu which will set expanded to false
    this.props.setModal(
      <UserSettingsModal
        onClose={this.props.clearModal}
        setModal={this.props.setModal}
      />
    );
  }

  onLogIn(event: SyntheticEvent) {
    event.preventDefault();
    this.props.setModal(
      <LogInModal
        onClose={this.props.clearModal}
        setModal={this.props.setModal}
      />
    );
  }

  onRegister(event: SyntheticEvent) {
    event.preventDefault();
    this.props.setModal(
      <RegisterModal
        onClose={this.props.clearModal}
        setModal={this.props.setModal}
      />
    );
  }

}

AccountBar.propTypes = {
  loggedIn: React.PropTypes.bool.isRequired,
  username: React.PropTypes.string.isRequired,
  currentNavID: React.PropTypes.string,
  updateStore: React.PropTypes.func.isRequired,
  setModal: React.PropTypes.func.isRequired,
  clearModal: React.PropTypes.func.isRequired,
};

export default connect(
  (state: AppState) => ({
    loggedIn: state.loggedIn,
    username: state.username,
    currentNavID: currentNavID(state),
  }),
  mapStateToUpdateStore,
)(AccountBar);
