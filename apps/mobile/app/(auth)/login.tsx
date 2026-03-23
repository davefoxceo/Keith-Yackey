import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';
import Button from '@/components/common/Button';

export default function LoginScreen() {
  const { login, loginWithApple } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      Alert.alert('Login Failed', err.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleSignIn() {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (credential.identityToken) {
        await loginWithApple(credential.identityToken);
      }
    } catch (err: any) {
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple Sign In Failed', 'Please try again.');
      }
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-surface"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6 py-12">
          {/* Logo */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(600)}
            className="items-center mb-12"
          >
            <View className="w-20 h-20 rounded-full bg-accent/20 items-center justify-center mb-4">
              <Ionicons name="shield-checkmark" size={40} color={colors.accent.default} />
            </View>
            <Text className="text-3xl font-bold text-white">Coach Keith</Text>
            <Text className="text-base text-slate-400 mt-1">
              Welcome back, brother
            </Text>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)}>
            <View className="mb-4">
              <Text className="text-sm text-slate-400 mb-2 ml-1">Email</Text>
              <View className="flex-row items-center bg-surface-raised border border-surface-overlay rounded-xl px-4">
                <Ionicons name="mail-outline" size={20} color={colors.text.muted} />
                <TextInput
                  className="flex-1 text-white text-base py-4 ml-3"
                  placeholder="you@example.com"
                  placeholderTextColor={colors.text.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-sm text-slate-400 mb-2 ml-1">Password</Text>
              <View className="flex-row items-center bg-surface-raised border border-surface-overlay rounded-xl px-4">
                <Ionicons name="lock-closed-outline" size={20} color={colors.text.muted} />
                <TextInput
                  className="flex-1 text-white text-base py-4 ml-3"
                  placeholder="Your password"
                  placeholderTextColor={colors.text.muted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={colors.text.muted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              variant="primary"
            />
          </Animated.View>

          {/* Divider */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(600)}
            className="flex-row items-center my-8"
          >
            <View className="flex-1 h-px bg-surface-overlay" />
            <Text className="mx-4 text-slate-500 text-sm">or</Text>
            <View className="flex-1 h-px bg-surface-overlay" />
          </Animated.View>

          {/* Apple Sign In */}
          <Animated.View entering={FadeInDown.delay(400).duration(600)}>
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                onPress={handleAppleSignIn}
                className="flex-row items-center justify-center bg-white rounded-xl py-4 mb-4"
                activeOpacity={0.8}
              >
                <Ionicons name="logo-apple" size={22} color="#000" />
                <Text className="text-black text-base font-semibold ml-2">
                  Continue with Apple
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Register Link */}
          <Animated.View
            entering={FadeInUp.delay(500).duration(600)}
            className="items-center mt-6"
          >
            <Text className="text-slate-400">
              Don't have an account?{' '}
              <Link href="/(auth)/register" asChild>
                <Text className="text-accent font-semibold">Sign up</Text>
              </Link>
            </Text>
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
