/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <react/renderer/core/ReactPrimitives.h>
#include <react/renderer/core/ShadowNode.h>
#include <react/renderer/mounting/MountingCoordinator.h>

namespace facebook {
namespace react {

/*
 * Abstract class for UIManager's delegate.
 */
class UIManagerDelegate {
 public:
  /*
   * Called right after a new/updated Shadow Node tree is constructed.
   * For this moment the tree is already laid out and sealed.
   */
  virtual void uiManagerDidFinishTransaction(
      MountingCoordinator::Shared const &mountingCoordinator) = 0;

  /*
   * Called each time when UIManager constructs a new Shadow Node. Receiver
   * might use this to optimistically allocate a new native view
   * instances.
   */
  virtual void uiManagerDidCreateShadowNode(
      const ShadowNode::Shared &shadowNode) = 0;

  /*
   * Called when UIManager wants to dispatch a command to the mounting layer.
   */
  virtual void uiManagerDidDispatchCommand(
      const ShadowNode::Shared &shadowNode,
      std::string const &commandName,
      folly::dynamic const args) = 0;

  /*
   * Called when UIManager wants to dispatch some accessibility event
   * to the mounting layer. eventType is platform-specific and not all
   * platforms will necessarily implement the same set of events.
   */
  virtual void uiManagerDidSendAccessibilityEvent(
      const ShadowNode::Shared &shadowNode,
      std::string const &eventType) = 0;

  /*
   * Set JS responder for a view.
   */
  virtual void uiManagerDidSetIsJSResponder(
      ShadowNode::Shared const &shadowNode,
      bool isJSResponder) = 0;

  virtual ~UIManagerDelegate() noexcept = default;
};

} // namespace react
} // namespace facebook
