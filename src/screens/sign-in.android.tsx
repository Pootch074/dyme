import {
  Box,
  Button,
  Column,
  Icon,
  IconButton,
  RNHostView,
  Row,
  Spacer,
  Text,
} from '@expo/ui/jetpack-compose';
import {
  background,
  clip,
  fillMaxSize,
  fillMaxWidth,
  imePadding,
  padding,
  Shapes,
  size,
  verticalScroll,
  width,
} from '@expo/ui/jetpack-compose/modifiers';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Icons } from '@/components/compose/icons';
import { ComposeScreen, ScreenHeader } from '@/components/compose/screen';
import { ControlledTextField } from '@/components/compose/text-field';
import { useSignInForm } from '@/hooks/use-sign-in-form';

/** The only screen available while signed out. */
export default function SignInScreen() {
  const form = useSignInForm();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <ComposeScreen>
      <Column
        modifiers={[fillMaxSize(), verticalScroll(), imePadding(), padding(24, 64, 24, 24)]}
        verticalArrangement={{ spacedBy: 16 }}>
        {/* A React Native image hosted in Compose: the native Compose Image view
            isn't in every installed build of the app (or in Expo Go). The logo is
            dark on transparent, so it sits on a white tile to stay visible in
            dark mode. */}
        <Box modifiers={[size(96, 96), clip(Shapes.RoundedCorner(22)), background('#FFFFFF')]}>
          <RNHostView>
            <View style={styles.logoTile}>
              <Image
                source={require('@/assets/images/icon.png')}
                style={styles.logo}
                resizeMode="contain"
                accessibilityLabel="Dyme logo"
              />
            </View>
          </RNHostView>
        </Box>
        <ScreenHeader title="Welcome back" subtitle="Sign in to continue." />

        <ControlledTextField
          value={form.email}
          onChangeText={form.setEmail}
          label="Email"
          keyboardType="email"
          exact
          isError={Boolean(form.error)}
        />
        <ControlledTextField
          value={form.password}
          onChangeText={form.setPassword}
          label="Password"
          keyboardType="password"
          exact
          masked={!showPassword}
          isError={Boolean(form.error)}
          supportingText={form.error}
          trailing={
            <IconButton onClick={() => setShowPassword((shown) => !shown)}>
              <Icon
                source={showPassword ? Icons.visibilityOff : Icons.visibility}
                contentDescription={showPassword ? 'Hide password' : 'Show password'}
              />
            </IconButton>
          }
        />

        <Button
          onClick={form.submit}
          enabled={!form.isSubmitting}
          modifiers={[fillMaxWidth()]}>
          <Row verticalAlignment="center">
            <Icon source={Icons.login} size={18} />
            <Spacer modifiers={[width(8)]} />
            <Text>{form.isSubmitting ? 'Signing in…' : 'Sign in'}</Text>
          </Row>
        </Button>
      </Column>
    </ComposeScreen>
  );
}

const styles = StyleSheet.create({
  logoTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 72,
    height: 72,
  },
});
