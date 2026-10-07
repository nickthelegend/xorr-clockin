/**
 * The agent's strategies, drawn as xorr's agents: each strategy is a persona on Home's Agents tab, with its orb.
 * Momentum Scout is the agent everyone starts with; the others join by tier or by an SKR-paid shift.
 */
import { agentGradient } from '@/design/gradients';
import { STRATEGY_INFO, type StrategyId } from './tiers';

export type ClockinAgent = { id: StrategyId; name: string; role: string; gradient: { c1: string; c2: string } };

const RAW: Omit<ClockinAgent, 'gradient'>[] = [
  { id: 'momentum', name: STRATEGY_INFO.momentum.name, role: STRATEGY_INFO.momentum.line },
  { id: 'dip', name: STRATEGY_INFO.dip.name, role: STRATEGY_INFO.dip.line },
  { id: 'nightShift', name: STRATEGY_INFO.nightShift.name, role: STRATEGY_INFO.nightShift.line },
  { id: 'indexKeeper', name: STRATEGY_INFO.indexKeeper.name, role: STRATEGY_INFO.indexKeeper.line },
];

export const CLOCKIN_AGENTS: ClockinAgent[] = RAW.map((a) => ({ ...a, gradient: agentGradient(a.name) }));

export function agentFor(id: StrategyId): ClockinAgent {
  return CLOCKIN_AGENTS.find((a) => a.id === id)!;
}
