# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

require "test/unit"
require_relative "../fabric.rb"
require_relative "../utils.rb"
require_relative "./test_utils/podSpy.rb"

class FabricTest < Test::Unit::TestCase

    def setup
        podSpy_cleanUp()
    end

    def teardown
        podSpy_cleanUp()
        ENV['RCT_NEW_ARCH_ENABLED'] = "0"
    end

    # ================== #
    # TEST - setupFabric #
    # ================== #
    def test_setupFabric_whenNewArchDisabled_installsPods
        # Arrange
        prefix = "../.."

        # Act
        setup_fabric!(:react_native_path => prefix)

        # Assert
        check_installed_pods(prefix)
    end

    def test_setupFabric_whenNewArchEnabled_installPods
        # Arrange
        prefix = "../.."
        ENV['RCT_NEW_ARCH_ENABLED'] = "1"

        # Act
        setup_fabric!(:react_native_path => prefix, new_arch_enabled: true)

        # Assert
        check_installed_pods(prefix, install_rncore: false)
    end

    def check_installed_pods(prefix, install_rncore: true)
        assert_equal($podInvocationCount, install_rncore ? 5 : 4)

        check_pod("React-Fabric", :path => "#{prefix}/ReactCommon")
        check_pod("React-graphics", :path => "#{prefix}/ReactCommon/react/renderer/graphics")
        check_pod("React-RCTFabric", :path => "#{prefix}/React", :modular_headers => true)
        check_pod("RCT-Folly/Fabric", :podspec => "#{prefix}/third-party-podspecs/RCT-Folly.podspec")
        if install_rncore
            check_pod("React-rncore", :path => "#{prefix}/ReactCommon")
        else
            assert_nil($podInvocation["React-rncore"])
        end
    end

    def check_pod(name, path: nil, modular_headers: nil, podspec: nil)
        params = $podInvocation[name]
        expected_params = {}

        if path != nil then expected_params[:path] = path end
        if modular_headers != nil then expected_params[:modular_headers] = modular_headers end
        if podspec != nil then expected_params[:podspec] = podspec end

        assert_equal(params, expected_params)
    end
end
