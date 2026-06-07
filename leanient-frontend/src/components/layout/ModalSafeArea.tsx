import React from "react";
import type { StyleProp, ViewStyle } from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
  type Edge,
} from "react-native-safe-area-context";

interface ModalSafeAreaProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: readonly Edge[];
}

/**
 * Safe-area container for content rendered inside a React Native <Modal>.
 *
 * A plain <SafeAreaView> reports a 0 top inset inside a Modal because the modal
 * renders in its own native view tree, outside the app's root SafeAreaProvider —
 * which pushes headers/back buttons under the notch where they can't be tapped.
 * This scopes a SafeAreaProvider to the modal (seeded with initialWindowMetrics
 * so there's no first-frame jump) so insets resolve correctly and dynamically.
 *
 * Use this in place of <SafeAreaView> for any full-screen Modal content.
 */
export function ModalSafeArea({ children, style, edges = ["top", "bottom"] }: ModalSafeAreaProps) {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <SafeAreaView style={style} edges={edges}>
        {children}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default ModalSafeArea;
