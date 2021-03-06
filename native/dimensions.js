// @flow

import { Dimensions, Platform, DeviceInfo } from 'react-native';

let { height, width } = Dimensions.get('window');
if (Platform.OS === "android") {
  // Android's Dimensions.get doesn't include the status bar
  height -= 24;
}
if (Platform.OS === "ios" && DeviceInfo.isIPhoneX_deprecated) {
  height -= 34;
}
const windowHeight = height;
const windowWidth = width;

let contentVerticalOffset = 0;
if (Platform.OS === "ios") {
  contentVerticalOffset = DeviceInfo.isIPhoneX_deprecated ? 44 : 20;
}

const iosKeyboardOffset = DeviceInfo.isIPhoneX_deprecated ? 89 : 65;

const tabBarSize = Platform.OS === "android" ? 50 : 49;

export {
  windowHeight,
  windowWidth,
  contentVerticalOffset,
  iosKeyboardOffset,
  tabBarSize,
};
