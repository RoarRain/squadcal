// @flow

import type { AppState, UpdateStore } from '../redux-reducer';

import React from 'react';
import classNames from 'classnames';
import { connect } from 'react-redux';

import NewSquadModal from '../modals/new-squad-modal.react';
import LogInToCreateSquadModal
  from '../modals/account/log-in-to-create-squad-modal.react';
import { monthURL, fetchEntriesAndUpdateStore } from '../nav-utils';
import { mapStateToUpdateStore } from '../redux-utils'
import history from '../router-history';

export type NavID = "home" | "new";
type Props = {
  navID: NavID,
  name: string,
  monthURL: string,
  year: number,
  month: number,
  loggedIn: bool,
  setModal: (modal: React.Element<any>) => void,
  clearModal: () => void,
  freezeTypeahead: (navID: string) => void,
  unfreezeTypeahead: () => void,
  updateStore: UpdateStore,
  frozen?: bool,
};

class TypeaheadActionOption extends React.Component {

  static defaultProps: { frozen: bool };
  static homeText;
  static newText;
  props: Props;

  render() {
    return (
      <div
        className={classNames(
          "squad-nav-option",
          {'squad-nav-frozen-option': this.props.frozen},
        )}
        onClick={this.onClick.bind(this)}
      >
        <div>
          <div className="squad-nav-option-name">
            {this.props.name}
          </div>
          <div className="clear" />
        </div>
      </div>
    );
  }

  async onClick(event: SyntheticEvent) {
    if (this.props.navID === 'new') {
      this.props.freezeTypeahead(this.props.navID);
      const onClose = () => {
        this.props.unfreezeTypeahead();
        this.props.clearModal();
      }
      if (this.props.loggedIn) {
        this.props.setModal(
          <NewSquadModal
            onClose={onClose}
          />
        );
      } else {
        this.props.setModal(
          <LogInToCreateSquadModal 
            onClose={onClose}
            setModal={this.props.setModal}
          />
        );
      }
    } else if (this.props.navID == 'home') {
      this.props.unfreezeTypeahead();
      history.push(`home/${this.props.monthURL}`);
      await fetchEntriesAndUpdateStore(
        this.props.year,
        this.props.month,
        "home",
        this.props.updateStore,
      );
    } 
  }

}

TypeaheadActionOption.homeText = "Home";
TypeaheadActionOption.newText = "New squad...";

TypeaheadActionOption.propTypes = {
  navID: React.PropTypes.string.isRequired,
  name: React.PropTypes.string.isRequired,
  monthURL: React.PropTypes.string.isRequired,
  year: React.PropTypes.number.isRequired,
  month: React.PropTypes.number.isRequired,
  loggedIn: React.PropTypes.bool.isRequired,
  setModal: React.PropTypes.func.isRequired,
  clearModal: React.PropTypes.func.isRequired,
  freezeTypeahead: React.PropTypes.func.isRequired,
  unfreezeTypeahead: React.PropTypes.func.isRequired,
  updateStore: React.PropTypes.func.isRequired,
  frozen: React.PropTypes.bool,
};

TypeaheadActionOption.defaultProps = {
  frozen: false,
};

export default connect(
  (state: AppState) => ({
    monthURL: monthURL(state),
    loggedIn: state.loggedIn,
    year: state.navInfo.year,
    month: state.navInfo.month,
  }),
  mapStateToUpdateStore,
)(TypeaheadActionOption);