import { Component, ErrorInfo, ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, space, type } from '@/lib/theme';

type Props = { children: ReactNode };
type State = { error: Error | null; info: string | null };

// Production EAS Update bundles don't show the dev red-box, so a render-time
// crash just blanks the screen. This boundary surfaces the message + stack on
// screen so failures are diagnosable from a screenshot.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info: info.componentStack ?? null });
    console.error('App crashed:', error, info.componentStack);
  }

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;
    return (
      <ScrollView style={styles.safe} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Something broke</Text>
        <Text style={styles.label}>Error</Text>
        <Text style={styles.mono}>{error.message || String(error)}</Text>
        {error.stack ? (
          <>
            <Text style={styles.label}>Stack</Text>
            <Text style={styles.mono}>{error.stack}</Text>
          </>
        ) : null}
        {info ? (
          <>
            <Text style={styles.label}>Component stack</Text>
            <Text style={styles.mono}>{info}</Text>
          </>
        ) : null}
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.xl, paddingTop: 80, gap: space.sm },
  title: { ...type.title, color: colors.danger, marginBottom: space.md },
  label: { ...type.overline, marginTop: space.lg },
  mono: { fontFamily: 'Courier', fontSize: 12, color: colors.ink, lineHeight: 17 },
});
