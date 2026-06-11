CREATE INDEX "Stock_theme_idx" ON "Stock"("theme");

CREATE INDEX "Trade_order_portfolio_id_stock_id_status_ordered_at_idx"
  ON "Trade_order"("portfolio_id", "stock_id", "status", "ordered_at");

CREATE INDEX "Trade_order_stock_id_status_remaining_quantity_idx"
  ON "Trade_order"("stock_id", "status", "remaining_quantity");

CREATE INDEX "Trade_order_stock_id_status_type_price_per_share_idx"
  ON "Trade_order"("stock_id", "status", "type", "price_per_share");
