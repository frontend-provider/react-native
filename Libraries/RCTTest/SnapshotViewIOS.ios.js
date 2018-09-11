/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

'use strict';

const DeprecatedViewPropTypes = require('DeprecatedViewPropTypes');
const PropTypes = require('prop-types');
const React = require('React');
const StyleSheet = require('StyleSheet');
const UIManager = require('UIManager');
const View = require('View');

const requireNativeComponent = require('requireNativeComponent');

const {TestModule} = require('NativeModules');

// Verify that RCTSnapshot is part of the UIManager since it is only loaded
// if you have linked against RCTTest like in tests, otherwise we will have
// a warning printed out
const RCTSnapshot = UIManager.RCTSnapshot
  ? requireNativeComponent('RCTSnapshot')
  : View;

class SnapshotViewIOS extends React.Component<{
  onSnapshotReady?: Function,
  testIdentifier?: string,
}> {
  // $FlowFixMe(>=0.41.0)
  static propTypes = {
    ...DeprecatedViewPropTypes,
    // A callback when the Snapshot view is ready to be compared
    onSnapshotReady: PropTypes.func,
    // A name to identify the individual instance to the SnapshotView
    testIdentifier: PropTypes.string,
  };

  onDefaultAction = (event: Object) => {
    TestModule.verifySnapshot(TestModule.markTestPassed);
  };

  render() {
    const testIdentifier = this.props.testIdentifier || 'test';
    const onSnapshotReady = this.props.onSnapshotReady || this.onDefaultAction;
    return (
      // $FlowFixMe - Typing ReactNativeComponent revealed errors
      <RCTSnapshot
        style={style.snapshot}
        {...this.props}
        onSnapshotReady={onSnapshotReady}
        testIdentifier={testIdentifier}
      />
    );
  }
}

const style = StyleSheet.create({
  snapshot: {
    flex: 1,
  },
});

module.exports = SnapshotViewIOS;
