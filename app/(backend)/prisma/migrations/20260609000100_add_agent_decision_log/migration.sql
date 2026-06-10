-- AlterEnum
ALTER TYPE "Agent_type" ADD VALUE IF NOT EXISTS 'GROWTH';

-- CreateEnum
CREATE TYPE "Decision_source" AS ENUM ('ADK', 'RULE_BASED');

-- CreateEnum
CREATE TYPE "Trade_side" AS ENUM ('BUY', 'SELL', 'HOLD');

-- CreateEnum
CREATE TYPE "Decision_status" AS ENUM ('PENDING', 'EXECUTED', 'REJECTED', 'FAILED');

-- CreateTable
CREATE TABLE "Agent_decision_log" (
    "id" BIGSERIAL NOT NULL,
    "agent_user_id" BIGINT NOT NULL,
    "stock_id" INTEGER NOT NULL,
    "agent_type" "Agent_type" NOT NULL,
    "decision_source" "Decision_source" NOT NULL,
    "side" "Trade_side" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "score" DECIMAL(10,4) NOT NULL,
    "raw_response" JSONB NOT NULL,
    "status" "Decision_status" NOT NULL,
    "reject_reason" TEXT,
    "executed_order_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_decision_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Agent_decision_log_agent_user_id_idx" ON "Agent_decision_log"("agent_user_id");

-- CreateIndex
CREATE INDEX "Agent_decision_log_stock_id_idx" ON "Agent_decision_log"("stock_id");

-- CreateIndex
CREATE INDEX "Agent_decision_log_executed_order_id_idx" ON "Agent_decision_log"("executed_order_id");

-- AddForeignKey
ALTER TABLE "Agent_decision_log" ADD CONSTRAINT "Agent_decision_log_agent_user_id_fkey" FOREIGN KEY ("agent_user_id") REFERENCES "Agent"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent_decision_log" ADD CONSTRAINT "Agent_decision_log_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "Stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent_decision_log" ADD CONSTRAINT "Agent_decision_log_executed_order_id_fkey" FOREIGN KEY ("executed_order_id") REFERENCES "Trade_order"("order_id") ON DELETE SET NULL ON UPDATE CASCADE;
