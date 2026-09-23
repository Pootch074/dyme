import { Card, Column, Icon, ListItem, Text } from '@expo/ui/jetpack-compose';
import {
  clickable,
  clip,
  fillMaxSize,
  fillMaxWidth,
  paddingAll,
  Shapes,
  verticalScroll,
} from '@expo/ui/jetpack-compose/modifiers';
import { type Href, router } from 'expo-router';

import { Icons } from '@/components/compose/icons';
import { ComposeScreen, ScreenHeader } from '@/components/compose/screen';
import { useAppMaterialColors } from '@/components/compose/theme';

type NavItem = {
  href: Href;
  label: string;
  description: string;
  icon: number;
};

const NAV_ITEMS: NavItem[] = [
  {
    // Typed routes lists this index route as "/records/index", which 404s at
    // runtime; "/records" is correct. Same upstream issue as "/" in app-tabs.web.
    href: '/records' as Href,
    label: 'Records',
    description: 'Keep track of your important personal records',
    icon: Icons.folder,
  },
  {
    href: '/dtr',
    label: 'DTR',
    description: 'Daily time record',
    icon: Icons.schedule,
  },
];

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
              <ListItem colors={{ containerColor: '#00000000' }}>
                <ListItem.LeadingContent>
                  <Icon source={item.icon} tint={colors.primary} />
                </ListItem.LeadingContent>
                <ListItem.HeadlineContent>
                  <Text style={{ typography: 'titleMedium' }}>{item.label}</Text>
                </ListItem.HeadlineContent>
                <ListItem.SupportingContent>
                  <Text>{item.description}</Text>
                </ListItem.SupportingContent>
                <ListItem.TrailingContent>
                  <Icon source={Icons.chevronRight} />
                </ListItem.TrailingContent>
              </ListItem>
            </Card>
          ))}
        </Column>
      </Column>
    </ComposeScreen>
  );
}
