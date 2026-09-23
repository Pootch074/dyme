import {
  Feather,
  type FeatherIconName,
} from "@react-native-vector-icons/feather";
import { type Href, Link } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type NavItem = {
  href: Href;
  label: string;
  description: string;
  icon: FeatherIconName;
};

const NAV_ITEMS: NavItem[] = [
  {
    // Typed routes lists this index route as "/records/index", which 404s at
    // runtime; "/records" is correct. Same upstream issue as "/" in app-tabs.web.
    href: "/records" as Href,
    label: "Records",
    description: "Keep track of your important personal records",
    icon: "shopping-bag",
  },
  {
    // Same typed-routes issue as "/records" above.
    href: "/shopping" as Href,
    label: "Shopping Calculator",
    description: "Record your shopping and track your budget",
    icon: "shopping-cart",
  },
  {
    href: "/dtr",
    label: "DTR",
    description: "Daily time record",
    icon: "clock",
  },
];

export default function HomeScreen() {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">Home</ThemedText>
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={styles.subtitleText}
        >
          Jump into a section.
        </ThemedText>

        <View style={styles.list}>
          {NAV_ITEMS.map((item) => (
            <Link key={item.label} href={item.href} asChild>
              <Pressable style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView type="backgroundElement" style={styles.row}>
                  <View style={styles.rowIcon}>
                    <Feather name={item.icon} size={20} color={theme.text} />
                  </View>
                  <View style={styles.rowText}>
                    <ThemedText style={styles.rowLabel}>
                      {item.label}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.description}
                    </ThemedText>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={18}
                    color={theme.textSecondary}
                  />
                </ThemedView>
              </Pressable>
            </Link>
          ))}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },
  safeArea: {
    width: "100%",
    maxWidth: MaxContentWidth,
    padding: Spacing.four,
  },
  subtitleText: {
    marginTop: Spacing.half,
    marginBottom: Spacing.four,
  },
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(60, 135, 247, 0.15)",
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  rowLabel: {
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
});
