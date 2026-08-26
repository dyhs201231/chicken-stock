type StockUpdateTimer = ReturnType<typeof setTimeout>;

type RealtimeStockUpdateSchedulerOptions = {
  clearTimer?: (timer: StockUpdateTimer) => void;
  publish: (stockId: number) => Promise<void>;
  setTimer?: (callback: () => void, delayMs: number) => StockUpdateTimer;
};

type PendingStockUpdate = {
  promise: Promise<void>;
  reject: (error: unknown) => void;
  resolve: () => void;
  timer: StockUpdateTimer | null;
};

export function createRealtimeStockUpdateScheduler({
  clearTimer = clearTimeout,
  publish,
  setTimer = setTimeout,
}: RealtimeStockUpdateSchedulerOptions) {
  const pendingUpdates = new Map<number, PendingStockUpdate>();

  function startPublish(stockId: number, pendingUpdate: PendingStockUpdate) {
    if (pendingUpdates.get(stockId) !== pendingUpdate) {
      return;
    }

    pendingUpdates.delete(stockId);
    pendingUpdate.timer = null;

    try {
      publish(stockId).then(pendingUpdate.resolve, pendingUpdate.reject);
    } catch (error) {
      pendingUpdate.reject(error);
    }
  }

  function armPublish(
    stockId: number,
    delayMs: number,
    pendingUpdate: PendingStockUpdate,
  ) {
    if (delayMs <= 0) {
      startPublish(stockId, pendingUpdate);
      return;
    }

    pendingUpdate.timer = setTimer(
      () => startPublish(stockId, pendingUpdate),
      delayMs,
    );
  }

  return {
    schedule(stockId: number, delayMs: number): Promise<void> {
      const existingUpdate = pendingUpdates.get(stockId);

      if (existingUpdate) {
        if (existingUpdate.timer) {
          clearTimer(existingUpdate.timer);
          existingUpdate.timer = null;
        }

        armPublish(stockId, delayMs, existingUpdate);
        return existingUpdate.promise;
      }

      let resolve!: () => void;
      let reject!: (error: unknown) => void;
      const promise = new Promise<void>((promiseResolve, promiseReject) => {
        resolve = promiseResolve;
        reject = promiseReject;
      });
      const pendingUpdate: PendingStockUpdate = {
        promise,
        reject,
        resolve,
        timer: null,
      };

      pendingUpdates.set(stockId, pendingUpdate);
      armPublish(stockId, delayMs, pendingUpdate);

      return promise;
    },
  };
}
