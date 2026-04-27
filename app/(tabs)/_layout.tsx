import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { Colors } from "@/constants/theme";
import { BinHeightTransportProvider } from "@/contexts/bin-height-transport-context";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? "light";
  const palette = Colors[colorScheme];

  return (
    <BinHeightTransportProvider>
      <Tabs
        initialRouteName="configure"
        screenOptions={{
          headerShown: false,
          headerTitleAlign: "center",
          tabBarActiveTintColor: palette.tabIconSelected,
          tabBarInactiveTintColor: palette.tabIconDefault,
          tabBarStyle: {
            backgroundColor: palette.card,
            borderTopColor: palette.border,
          },
          tabBarButton: HapticTab,
        }}
      >
        <Tabs.Screen
          name="configure"
          options={{
            title: "Configure",
            tabBarLabel: "Configure",
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="tune" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="device"
          options={{
            title: "Device",
            tabBarLabel: "Device",
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="sensors" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </BinHeightTransportProvider>
  );
}
