/**
 * Activity (CLOCK IN build) — xorr's activity list: every devnet action the app took for you, newest first, each with
 * its transaction. Grants, clock-ins, the agent's trades, refusals, shifts paid in SKR.
 */
import React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BackButton, EmptyState, Row, Screen, Text, TransactionRef, colors, size, space } from '@/ui';
import { Rise } from '@/ui/Rise';
import { useGoBack } from '@/nav/useGoBack';
import { explorerTx } from '../config';
import { useClockin } from '../session';

const ROWS_FROM = 1;

export default function ClockinActivity() {
  const goBack = useGoBack('/');
  const router = useRouter();
  const activity = useClockin((s) => s.activity);
  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s8 }}>
        <BackButton onPress={() => goBack()} />
        <Text variant="screenTitle">Activity</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: space.s16, paddingBottom: space.s30 }}>
        {activity.length === 0 ? (
          <EmptyState text="Nothing yet. Clock-ins, permissions and your agent’s trades land here, each with its transaction." actionLabel="Give your agent a permission" onAction={() => router.push('/desk')} />
        ) : (
          activity.slice(0, 60).map((a, i, all) => (
            <Rise key={a.id} index={ROWS_FROM + Math.min(i, 8)}>
              <Row
                height={size.rowLg}
                divider={i < all.length - 1}
                title={
                  <Text variant="rowPrimary" color={a.ok ? colors.ink : colors.down} numberOfLines={1}>
                    {a.title}
                  </Text>
                }
                secondary={`${new Date(a.at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}${a.detail ? ` · ${a.detail}` : ''}`}
                right={a.sig ? <TransactionRef explorer={explorerTx(a.sig)} /> : undefined}
              />
            </Rise>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
