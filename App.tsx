// src/screens/HomeScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>トップページ</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,              // 画面全体を使う
    justifyContent: 'center', // 縦方向中央揃え
    alignItems: 'center',     // 横方向中央揃え
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
