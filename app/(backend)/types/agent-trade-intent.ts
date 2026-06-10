export type AgentTradeIntent = {
  agentUserId: number;
  agentType: "VALUE" | "GROWTH" | "MOMENTUM";
  decisionSource: "ADK" | "RULE_BASED";
  stockId: number;
  side: "BUY" | "SELL" | "HOLD";
  quantity: number;
  reason: string;
  score?: number;
  rawResponse?: unknown;
};

export type AgentType = AgentTradeIntent["agentType"];
export type DecisionSource = AgentTradeIntent["decisionSource"];
export type TradeSide = AgentTradeIntent["side"];
export type DecisionStatus =
  | "PENDING"
  | "EXECUTED"
  | "REJECTED"
  | "FAILED"
  | "SKIPPED";
