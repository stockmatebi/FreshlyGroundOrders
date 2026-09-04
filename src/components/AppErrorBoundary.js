import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../theme';

export class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Freshly Ground app error:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const message = this.state.error?.message || String(this.state.error);
    return (
      <View style={styles.screen}>
        <View style={styles.badge}><Text style={styles.badgeText}>FG</Text></View>
        <Text style={styles.title}>Freshly Ground Orders</Text>
        <Text style={styles.heading}>The app hit an error</Text>
        <Text style={styles.body}>Instead of closing, this screen keeps the error visible so it can be fixed.</Text>
        <ScrollView style={styles.errorBox}><Text selectable style={styles.errorText}>{message}</Text></ScrollView>
        <TouchableOpacity style={styles.button} onPress={() => this.setState({ error: null })}>
          <Text style={styles.buttonText}>TRY AGAIN</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const c = theme.colors;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg, padding: 24, justifyContent: 'center' },
  badge: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.green, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  badgeText: { color: '#fff', fontSize: 22, fontWeight: '900' },
  title: { color: c.greenDark, fontSize: 24, fontWeight: '900' },
  heading: { color: c.ink, fontSize: 18, fontWeight: '900', marginTop: 18 },
  body: { color: c.muted, lineHeight: 20, marginTop: 6 },
  errorBox: { maxHeight: 180, backgroundColor: '#fff', borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 12, marginTop: 14 },
  errorText: { color: c.ink, fontFamily: 'monospace' },
  button: { backgroundColor: c.red, borderRadius: 12, padding: 14, marginTop: 18 },
  buttonText: { color: '#fff', fontWeight: '900', textAlign: 'center' },
});
