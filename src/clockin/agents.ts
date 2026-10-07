/**
 * The agent's strategies, drawn as xorr's agents: each strategy is a persona on Home's Agents tab, with its orb.
 * Momentum Scout is the agent everyone starts with; the others join by tier or by an SKR-paid shift.
 */
import { colors } from '@/ui';
import { STRATEGY_INFO, type StrategyId } from './tiers';

export type ClockinAgent = { id: StrategyId; name: string; role: string; gradient: { c1: string; c2: string } };

export const CLOCKIN_AGENTS: ClockinAgent[] = [
  { id: 'momentum', name: STRATEGY_INFO.momentum.name, role: STRATEGY_INFO.momentum.line, gradient: colors.agent.momentum },
  { id: 'dip', name: STRATEGY_INFO.dip.name, role: STRATEGY_INFO.dip.line, gradient: colors.agent.earnings },
  { id: 'nightShift', name: STRATEGY_INFO.nightShift.name, role: STRATEGY_INFO.nightShift.line, gradient: colors.agent.drawdown },
  { id: 'indexKeeper', name: STRATEGY_INFO.indexKeeper.name, role: STRATEGY_INFO.indexKeeper.line, gradient: colors.agent.yield },
];

export function agentFor(id: StrategyId): ClockinAgent {
  return CLOCKIN_AGENTS.find((a) => a.id === id)!;
}
