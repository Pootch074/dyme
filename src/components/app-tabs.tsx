import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useChromeColors } from '@/hooks/use-chrome-colors';

export default function AppTabs() {
  const colors = useChromeColors();

  return (
    <NativeTabs
      backgroundColor={colors.tabBar}
      indicatorColor={colors.tabIndicator}
      labelStyle={{ selected: { color: colors.tabLabel } }}
      iconColor={colors.tabIcon}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" renderingMode="template" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
