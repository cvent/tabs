/* @flow */

import React from 'react';
import {
  Animated,
  TouchableWithoutFeedback,
  StyleSheet,
  View,
  Keyboard,
  Platform,
} from 'react-native';
import {
  getStatusBarHeight,
  getBottomSpace,
} from 'react-native-iphone-x-helper';

import CrossFadeIcon from './CrossFadeIcon';
import withDimensions from '../utils/withDimensions';

type Orientation = 'horizontal' | 'vertical';
type Position = 'beside-icon' | 'below-icon';
type LabelPosition =
  | Position
  | ((options: { deviceOrientation: Orientation }) => Position);

export type TabBarOptions = {
  keyboardHidesTabBar: boolean,
  activeTintColor?: string,
  inactiveTintColor?: string,
  activeBackgroundColor?: string,
  inactiveBackgroundColor?: string,
  allowFontScaling: boolean,
  showLabel: boolean,
  showIcon: boolean,
  labelStyle: any,
  iconStyle: any,
  activeLabelStyle: any,
  inactiveLabelStyle: any,
  tabStyle: any,
  labelPosition?: LabelPosition,
  adaptive?: boolean,
  style: any,
};

type Props = TabBarOptions & {
  navigation: any,
  onTabPress: any,
  onTabLongPress: any,
  getAccessibilityLabel: (props: { route: any }) => string,
  getAccessibilityRole: (props: { route: any }) => string,
  getAccessibilityStates: (props: { route: any }) => string[],
  getButtonComponent: ({ route: any }) => any,
  getLabelText: ({ route: any }) => any,
  getTestID: (props: { route: any }) => string,
  renderIcon: any,
  dimensions: { width: number, height: number },
  isLandscape: boolean,
  safeAreaInset: { top: string, right: string, bottom: string, left: string },
};

type State = {
  layout: { height: number, width: number },
  keyboard: boolean,
  visible: Animated.Value,
};

const majorVersion = parseInt(Platform.Version, 10);
const isIos = Platform.OS === 'ios';
const isIOS11 = majorVersion >= 11 && isIos;

const DEFAULT_MAX_TAB_ITEM_WIDTH = 125;
const DEFAULT_HEIGHT = 49;
const COMPACT_HEIGHT = 29;

class TouchableWithoutFeedbackWrapper extends React.Component<*> {
  render() {
    const {
      onPress,
      onLongPress,
      testID,
      accessibilityLabel,
      accessibilityRole,
      accessibilityStates,
      ...props
    } = this.props;

    return (
      <TouchableWithoutFeedback
        onPress={onPress}
        onLongPress={onLongPress}
        testID={testID}
        hitSlop={{ left: 15, right: 15, top: 0, bottom: 5 }}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
        accessibilityStates={accessibilityStates}
      >
        <View {...props} />
      </TouchableWithoutFeedback>
    );
  }
}

class TabBarBottom extends React.Component<Props, State> {
  static defaultProps = {
    keyboardHidesTabBar: true,
    activeTintColor: '#007AFF',
    activeBackgroundColor: 'transparent',
    inactiveTintColor: '#8E8E93',
    inactiveBackgroundColor: 'transparent',
    showLabel: true,
    showIcon: true,
    allowFontScaling: true,
    adaptive: isIOS11,
    safeAreaInset: { bottom: 'always', top: 'never' },
  };

  state = {
    layout: { height: 0, width: 0 },
    keyboard: false,
    visible: new Animated.Value(1),
  };

  componentDidMount() {
    if (Platform.OS === 'ios') {
      this.keyboardWillShowListener = Keyboard.addListener('keyboardWillShow', this._handleKeyboardShow);
      this.keyboardWillHideListener = Keyboard.addListener('keyboardWillHide', this._handleKeyboardHide);
    } else {
      this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this._handleKeyboardShow);
      this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this._handleKeyboardHide);
    }
  }

  componentWillUnmount() {
    if (Platform.OS === 'ios') {
      this.keyboardWillShowListener.remove();
      this.keyboardWillHideListener.remove();
    } else {
      this.keyboardDidShowListener.remove();
      this.keyboardDidHideListener.remove();
    }
  }

  _handleKeyboardShow = () =>
    this.setState({ keyboard: true }, () =>
      Animated.timing(this.state.visible, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start()
    );

  _handleKeyboardHide = () =>
    Animated.timing(this.state.visible, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      this.setState({ keyboard: false });
    });

  _handleLayout = e => {
    const { layout } = this.state;
    const { height, width } = e.nativeEvent.layout;

    if (height === layout.height && width === layout.width) {
      return;
    }

    this.setState({
      layout: {
        height,
        width,
      },
    });
  };

  _renderLabel = ({ route, focused }) => {
    const {
      activeTintColor,
      inactiveTintColor,
      labelStyle,
      activeLabelStyle,
      inactiveLabelStyle,
      showLabel,
      showIcon,
      allowFontScaling,
    } = this.props;

    if (showLabel === false) {
      return null;
    }

    const label = this.props.getLabelText({ route });
    const horizontal = this._shouldUseHorizontalLabels();
    const tintColor = focused ? activeTintColor : inactiveTintColor;

    if (typeof label === 'string') {
      return (
        <Animated.Text
          numberOfLines={1}
          style={[
            styles.label,
            { color: tintColor },
            showIcon && horizontal ? styles.labelBeside : styles.labelBeneath,
            labelStyle,
            focused ? activeLabelStyle : inactiveLabelStyle,
          ]}
          allowFontScaling={allowFontScaling}
        >
          {label}
        </Animated.Text>
      );
    }

    if (typeof label === 'function') {
      return label({
        route,
        focused,
        tintColor,
        orientation: horizontal ? 'horizontal' : 'vertical',
      });
    }

    return label;
  };

  _renderIcon = ({ route, focused }) => {
    const {
      navigation,
      activeTintColor,
      inactiveTintColor,
      iconStyle,
      renderIcon,
      showIcon,
      showLabel,
    } = this.props;
    if (showIcon === false) {
      return null;
    }

    const horizontal = this._shouldUseHorizontalLabels();

    const activeOpacity = focused ? 1 : 0;
    const inactiveOpacity = focused ? 0 : 1;

    return (
      <CrossFadeIcon
        route={route}
        horizontal={horizontal}
        navigation={navigation}
        activeOpacity={activeOpacity}
        inactiveOpacity={inactiveOpacity}
        activeTintColor={activeTintColor}
        inactiveTintColor={inactiveTintColor}
        renderIcon={renderIcon}
        style={[
          styles.iconWithExplicitHeight,
          showLabel === false && !horizontal && styles.iconWithoutLabel,
          showLabel !== false && !horizontal && styles.iconWithLabel,
          iconStyle,
        ]}
      />
    );
  };

  _shouldUseHorizontalLabels = () => {
    const { routes } = this.props.navigation.state;
    const {
      isLandscape,
      dimensions,
      adaptive,
      tabStyle,
      labelPosition,
    } = this.props;

    if (labelPosition) {
      let position;
      if (typeof labelPosition === 'string') {
        position = labelPosition;
      } else {
        position = labelPosition({
          deviceOrientation: isLandscape ? 'horizontal' : 'vertical',
        });
      }

      if (position) {
        return position === 'beside-icon';
      }
    }

    if (!adaptive) {
      return false;
    }

    if (Platform.isPad) {
      let maxTabItemWidth = DEFAULT_MAX_TAB_ITEM_WIDTH;

      const flattenedStyle = StyleSheet.flatten(tabStyle);

      if (flattenedStyle) {
        if (typeof flattenedStyle.width === 'number') {
          maxTabItemWidth = flattenedStyle.width;
        } else if (typeof flattenedStyle.maxWidth === 'number') {
          maxTabItemWidth = flattenedStyle.maxWidth;
        }
      }

      return routes.length * maxTabItemWidth <= dimensions.width;
    } else {
      return isLandscape;
    }
  };

  render() {
    const {
      navigation,
      keyboardHidesTabBar,
      activeBackgroundColor,
      inactiveBackgroundColor,
      onTabPress,
      onTabLongPress,
      isLandscape,
      safeAreaInset,
      style,
      tabStyle,
    } = this.props;

    const { routes } = navigation.state;

    const {
      position,
      top,
      left = 0,
      bottom = 0,
      right = 0,
      margin,
      marginTop,
      marginLeft,
      marginBottom,
      marginRight,
      marginHorizontal,
      marginVertical,
      ...innerStyle
    } = StyleSheet.flatten(style || {});

    const containerStyle = {
      position,
      top,
      left,
      bottom,
      right,
      margin,
      marginTop,
      marginLeft,
      marginBottom,
      marginRight,
      marginHorizontal,
      marginVertical,
    };

    const statusBarHeight = getStatusBarHeight(true);
    const horizontalInset = isLandscape ? statusBarHeight : 0;
    const insets = {
      bottom:
        typeof safeAreaInset?.bottom === 'number'
          ? safeAreaInset.bottom
          : safeAreaInset?.bottom === 'never'
          ? 0
          : getBottomSpace(),
      left:
        typeof safeAreaInset?.left === 'number'
          ? safeAreaInset.left
          : safeAreaInset?.left === 'never'
          ? 0
          : horizontalInset,
      right:
        typeof safeAreaInset?.right === 'number'
          ? safeAreaInset.right
          : safeAreaInset?.right === 'never'
          ? 0
          : horizontalInset,
    };

    const tabBarStyle = [
      styles.tabBar,
      innerStyle,
      {
        height:
          // @ts-ignore: isPad exists in runtime but not available in type defs
          (this._shouldUseHorizontalLabels() && !Platform.isPad
            ? COMPACT_HEIGHT
            : DEFAULT_HEIGHT) + insets.bottom,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      },
    ];

    return (
      <Animated.View
        style={[
          styles.container,
          containerStyle,
          keyboardHidesTabBar
            ? // eslint-disable-next-line react-native/no-inline-styles
              {
                // When the keyboard is shown, slide down the tab bar
                transform: [
                  {
                    translateY: this.state.visible.interpolate({
                      inputRange: [0, 1],
                      outputRange: [this.state.layout.height, 0],
                    }),
                  },
                ],
                // Absolutely position the tab bar so that the content is below it
                // This is needed to avoid gap at bottom when the tab bar is hidden
                position: this.state.keyboard ? 'absolute' : null,
              }
            : null,
        ]}
        pointerEvents={
          keyboardHidesTabBar && this.state.keyboard ? 'none' : 'auto'
        }
        onLayout={this._handleLayout}

      >
        <View style={tabBarStyle}>
          {routes.map((route, index) => {
            const focused = index === navigation.state.index;
            const scene = { route, focused };
            const accessibilityLabel = this.props.getAccessibilityLabel({
              route,
            });

            const accessibilityRole = this.props.getAccessibilityRole({
              route,
            });

            const accessibilityStates = this.props.getAccessibilityStates(
              scene
            );

            const testID = this.props.getTestID({ route });

            const backgroundColor = focused
              ? activeBackgroundColor
              : inactiveBackgroundColor;

            const ButtonComponent =
              this.props.getButtonComponent({ route }) ||
              TouchableWithoutFeedbackWrapper;

            return (
              <ButtonComponent
                key={route.key}
                onPress={() => onTabPress({ route })}
                onLongPress={() => onTabLongPress({ route })}
                testID={testID}
                accessibilityLabel={accessibilityLabel}
                accessibilityRole={accessibilityRole}
                accessibilityStates={accessibilityStates}
                style={[
                  styles.tab,
                  { backgroundColor },
                  this._shouldUseHorizontalLabels()
                    ? styles.tabLandscape
                    : styles.tabPortrait,
                  tabStyle,
                ]}
              >
                {this._renderIcon(scene)}
                {this._renderLabel(scene)}
              </ButtonComponent>
            );
          })}
        </View>
      </Animated.View>
    );
  }
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, .3)',
    flexDirection: 'row',
  },
  container: {
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: isIos ? 'center' : 'stretch',
  },
  tabPortrait: {
    justifyContent: 'flex-end',
    flexDirection: 'column',
  },
  tabLandscape: {
    justifyContent: 'center',
    flexDirection: 'row',
  },
  iconWithoutLabel: {
    flex: 1,
  },
  iconWithLabel: {
    flex: 1,
  },
  iconWithExplicitHeight: {
    height: Platform.isPad ? DEFAULT_HEIGHT : COMPACT_HEIGHT,
  },
  label: {
    textAlign: 'center',
    backgroundColor: 'transparent',
  },
  labelBeneath: {
    fontSize: 11,
    marginBottom: 1.5,
  },
  labelBeside: {
    fontSize: 12,
    marginLeft: 20,
  },
});

export default withDimensions(TabBarBottom);

