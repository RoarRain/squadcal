// @flow

import type { AppState } from '../redux-setup';
import type {
  NavigationScreenProp,
  NavigationRoute,
  NavigationAction,
} from 'react-navigation';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { MessageInfo } from 'lib/types/message-types';
import { messageInfoPropType } from 'lib/types/message-types';

import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { InvertibleFlatList } from 'react-native-invertible-flat-list';
import invariant from 'invariant';
import _sum from 'lodash/fp/sum';
import _difference from 'lodash/fp/difference';

import { messageKey } from 'lib/shared/message-utils';

import { messageListData } from '../selectors/chat-selectors';
import Message from './message.react';
import TextHeightMeasurer from '../text-height-measurer.react';
import InputBar from './input-bar.react';

type NavProp = NavigationScreenProp<NavigationRoute, NavigationAction>;

export type MessageInfoWithHeight = MessageInfo & { textHeight: number };
type Props = {
  navigation: NavProp,
  // Redux state
  messageListData: $ReadOnlyArray<MessageInfo>,
  userID: ?string,
};
type State = {
  textToMeasure: string[],
  listDataWithHeights: ?$ReadOnlyArray<MessageInfoWithHeight>,
};
class InnerMessageList extends React.PureComponent {

  props: Props;
  state: State;
  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        params: PropTypes.shape({
          threadInfo: threadInfoPropType,
        }).isRequired,
      }).isRequired,
    }).isRequired,
    messageListData: PropTypes.arrayOf(messageInfoPropType).isRequired,
    userID: PropTypes.string,
  };
  static navigationOptions = ({ navigation }) => ({
    title: navigation.state.params.threadInfo.name,
  });
  textHeights: ?{ [text: string]: number } = null;

  constructor(props: Props) {
    super(props);
    const textToMeasure = props.messageListData
      ? InnerMessageList.textToMeasureFromListData(props.messageListData)
      : [];
    this.state = {
      textToMeasure,
      listDataWithHeights: null,
    };
  }

  static textToMeasureFromListData(listData: $ReadOnlyArray<MessageInfo>) {
    return listData.map((messageInfo: MessageInfo) => messageInfo.text);
  }

  componentWillReceiveProps(nextProps: Props) {
    if (nextProps.listData === this.props.messageListData) {
      return;
    }
    const newListData = nextProps.messageListData;

    if (!newListData) {
      this.setState({
        textToMeasure: [],
        listDataWithHeights: null,
      });
      return;
    }

    const newTextToMeasure = InnerMessageList.textToMeasureFromListData(
      newListData,
    );

    let allTextAlreadyMeasured = false;
    if (this.textHeights) {
      allTextAlreadyMeasured = true;
      for (let text of newTextToMeasure) {
        if (this.textHeights[text] === undefined) {
          allTextAlreadyMeasured = false;
          break;
        }
      }
    }
    if (allTextAlreadyMeasured) {
      this.mergeHeightsIntoListData(newListData);
      return;
    }

    const newText =
      _difference(newTextToMeasure)(this.state.textToMeasure);
    if (newText.length === 0) {
      // Since we don't have everything in textHeights, but we do have
      // everything in textToMeasure, we can conclude that we're just
      // waiting for the measurement to complete and then we'll be good.
    } else {
      // We set textHeights to null here since if a future set of text
      // came in before we completed text measurement that was a subset
      // of the earlier text, we would end up merging directly there, but
      // then when the measurement for the middle text came in it would
      // override the newer text heights.
      this.textHeights = null;
      this.setState({ textToMeasure: newTextToMeasure });
    }

  }

  mergeHeightsIntoListData(listData: $ReadOnlyArray<MessageInfo>) {
    const textHeights = this.textHeights;
    invariant(textHeights, "textHeights should be set");
    const listDataWithHeights = listData.map((item: MessageInfo) => {
      const textHeight = textHeights[item.text];
      invariant(textHeight, `height for ${messageKey(item)} should be set`);
      return { ...item, textHeight };
    });
    this.setState({ listDataWithHeights });
  }

  renderItem = (row: { item: MessageInfoWithHeight }) => {
    return <Message messageInfo={row.item} />;
  }

  getItemLayout = (
    data: $ReadOnlyArray<MessageInfoWithHeight>,
    index: number,
  ) => {
    const offset = this.heightOfItems(data.filter((_, i) => i < index));
    const item = data[index];
    const length = item ? Message.itemHeight(item, this.props.userID) : 0;
    return { length, offset, index };
  }

  heightOfItems(data: $ReadOnlyArray<MessageInfoWithHeight>): number {
    return _sum(data.map(
      (messageInfo: MessageInfoWithHeight) =>
        Message.itemHeight(messageInfo, this.props.userID),
    ));
  }

  render() {
    const textHeightMeasurer = (
      <TextHeightMeasurer
        textToMeasure={this.state.textToMeasure}
        allHeightsMeasuredCallback={this.allHeightsMeasured}
        style={styles.text}
      />
    );
    const listDataWithHeights = this.state.listDataWithHeights;
    let flatList = null;
    if (listDataWithHeights) {
      flatList = (
        <InvertibleFlatList
          inverted={true}
          data={listDataWithHeights}
          renderItem={this.renderItem}
          keyExtractor={messageKey}
          getItemLayout={this.getItemLayout}
        />
      );
    } else {
      flatList = (
        <View style={styles.loadingIndicatorContainer}>
          <ActivityIndicator
            color="black"
            size="large"
            style={styles.loadingIndicator}
          />
        </View>
      );
    }

    const behavior = Platform.OS === "android" ? undefined : "padding";
    const keyboardVerticalOffset = Platform.OS === "ios" ? 64 : 0;
    return (
      <KeyboardAvoidingView
        behavior={behavior}
        keyboardVerticalOffset={keyboardVerticalOffset}
        style={styles.container}
      >
        {textHeightMeasurer}
        <View style={styles.flatListContainer}>
          {flatList}
        </View>
        <InputBar />
      </KeyboardAvoidingView>
    );
  }

  allHeightsMeasured = (
    textToMeasure: string[],
    newTextHeights: { [text: string]: number },
  ) => {
    if (textToMeasure !== this.state.textToMeasure) {
      return;
    }
    this.textHeights = newTextHeights;
    if (this.props.messageListData) {
      this.mergeHeightsIntoListData(this.props.messageListData);
    }
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flatListContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  text: {
    left: 24,
    right: 24,
    fontSize: 18,
    fontFamily: 'Arial',
  },
  loadingIndicator: {
    flex: 1,
  },
  loadingIndicatorContainer: {
    flex: 1,
  },
});

const MessageListRouteName = 'MessageList';
const MessageList = connect(
  (state: AppState, ownProps: { navigation: NavProp }) => ({
    messageListData: messageListData
      (ownProps.navigation.state.params.threadInfo.id)(state),
    userID: state.userInfo && state.userInfo.id,
  }),
)(InnerMessageList);

export {
  MessageList,
  MessageListRouteName,
};