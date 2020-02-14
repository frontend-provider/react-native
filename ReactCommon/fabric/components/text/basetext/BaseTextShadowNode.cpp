/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "BaseTextShadowNode.h"

#include <react/components/text/RawTextProps.h>
#include <react/components/text/RawTextShadowNode.h>
#include <react/components/text/TextProps.h>
#include <react/components/text/TextShadowNode.h>
#include <react/debug/DebugStringConvertibleItem.h>
#include <react/mounting/ShadowView.h>

namespace facebook {
namespace react {

AttributedString BaseTextShadowNode::getAttributedString(
    TextAttributes const &textAttributes,
    ShadowNode const &parentNode) {
  auto attributedString = AttributedString{};

  for (auto const &childNode : parentNode.getChildren()) {
    // RawShadowNode
    auto rawTextShadowNode =
        std::dynamic_pointer_cast<const RawTextShadowNode>(childNode);
    if (rawTextShadowNode) {
      auto fragment = AttributedString::Fragment{};
      fragment.string = rawTextShadowNode->getConcreteProps().text;
      fragment.textAttributes = textAttributes;

      // Storing a retaining pointer to `ParagraphShadowNode` inside
      // `attributedString` causes a retain cycle (besides that fact that we
      // don't need it at all). Storing a `ShadowView` instance instead of
      // `ShadowNode` should properly fix this problem.
      fragment.parentShadowView = ShadowView(parentNode);
      attributedString.appendFragment(fragment);
      continue;
    }

    // TextShadowNode
    auto textShadowNode =
        std::dynamic_pointer_cast<const TextShadowNode>(childNode);
    if (textShadowNode) {
      auto localTextAttributes = textAttributes;
      localTextAttributes.apply(
          textShadowNode->getConcreteProps().textAttributes);
      attributedString.appendAttributedString(
          textShadowNode->getAttributedString(
              localTextAttributes, *textShadowNode));
      continue;
    }

    // Any other kind of ShadowNode
    auto fragment = AttributedString::Fragment{};
    fragment.string = AttributedString::Fragment::AttachmentCharacter();
    fragment.parentShadowView = ShadowView(*childNode);
    fragment.textAttributes = textAttributes;
    attributedString.appendFragment(fragment);
  }

  return attributedString;
}

} // namespace react
} // namespace facebook
