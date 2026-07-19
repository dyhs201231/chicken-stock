export type MarketDataResult<T> =
  | {
      status: "success";
      data: T;
      provider: string;
      updatedAt: string;
    }
  | {
      status: "fallback";
      data: T;
      provider: string;
      reason: string;
      updatedAt: string;
    }
  | {
      status: "error";
      errorCode: string;
      message: string;
    };
