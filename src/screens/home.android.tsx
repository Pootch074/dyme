import { Card, Column, Icon, Row, Text } from '@expo/ui/jetpack-compose';
import {
  clickable,
  clip,
  fillMaxSize,
  fillMaxWidth,
  paddingAll,
  Shapes,
  verticalScroll,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import { type Href, router } from 'expo-router';

import { Icons } from '@/components/compose/icons';
import { ComposeScreen, ScreenHeader } from '@/components/compose/screen';
import { useAppMaterialColors } from '@/components/compose/theme';
import { sortByLabel } from '@/utils/sort';

type NavItem = {
  href: Href;
  label: string;
  description: string;
  icon: number;
};

// Shown A–Z by label (see sortByLabel), so new sections slot in automatically.
const NAV_ITEMS: NavItem[] = sortByLabel([
  {
    // Typed routes lists this index route as "/records/index", which 404s at
    // runtime; "/records" is correct. Same upstream issue as "/" in app-tabs.web.
    href: '/records' as Href,
    label: 'Records',
    description: 'Keep track of your important personal records',
    icon: Icons.folder,
  },
  {
    // Same typed-routes issue as "/records" above.
    href: '/shopping' as Href,
    label: 'Shopping Calculator',
    description: 'Record your shopping and track your budget',
    icon: Icons.shoppingCart,
  },
  {
    href: '/dtr',
    label: 'DTR',
    description: 'Daily time record',
    icon: Icons.schedule,
  },
]);

export default function HomeScreen() {
  const colors = useAppMaterialColors();

  return (
    <ComposeScreen>
      <Column
        modifiers={[fillMaxSize(), verticalScroll(), paddingAll(16)]}
        verticalArrangement={{ spacedBy: 16 }}>
        <ScreenHeader title="Home" subtitle="Jump into a section." />

        <Column modifiers={[fillMaxWidth()]} verticalArrangement={{ spacedBy: 8 }}>
          {NAV_ITEMS.map((item) => (
            <Card
              key={item.label}
              modifiers={[
                fillMaxWidth(),
                clip(Shapes.RoundedCorner(12)),
                clickable(() => router.push(item.href)),
              ]}>
              {/* A plain Row rather than ListItem: Material 3 top-aligns a
                  ListItem's icons once the description wraps to two lines. */}
              <Row
                modifiers={[fillMaxWidth(), paddingAll(16)]}
                horizontalArrangement={{ spacedBy: 16 }}
                verticalAlignment="center">
                <Icon source={item.icon} tint={colors.primary} />
                <Column modifiers={[weight(1)]} verticalArrangement={{ spacedBy: 2 }}>
                  <Text style={{ typography: 'titleMedium' }}>{item.label}</Text>
                  <Text color={colors.onSurfaceVariant} style={{ typography: 'bodyMedium' }}>
                    {item.description}
                  </Text>
                </Column>
                <Icon source={Icons.chevronRight} tint={colors.onSurfaceVariant} />
              </Row>
            </Card>
          ))}
        </Column>
      </Column>
    </ComposeScreen>
  );
}
