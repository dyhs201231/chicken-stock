import { ImageResponse } from "next/og";

const size = {
  width: 1200,
  height: 630,
};

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f7faf7",
          color: "#17231b",
          padding: "72px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "28px",
          }}
        >
          <div
            style={{
              width: "104px",
              height: "104px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "26px",
              background: "#d6ead1",
              border: "4px solid #426b4a",
              color: "#284c30",
              fontSize: "42px",
              fontWeight: 800,
            }}
          >
            CS
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div
              style={{
                color: "#426b4a",
                fontSize: "34px",
                fontWeight: 700,
              }}
            >
              Chicken Stock
            </div>
            <div
              style={{
                color: "#5b6f60",
                fontSize: "26px",
                fontWeight: 500,
              }}
            >
              모의 투자 · 투자 퀴즈 · 학습 콘텐츠
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "30px",
          }}
        >
          <div
            style={{
              maxWidth: "940px",
              fontSize: "72px",
              lineHeight: 1.14,
              fontWeight: 800,
              letterSpacing: "0",
            }}
          >
            가상 주식 투자 학습 플랫폼
          </div>
          <div
            style={{
              maxWidth: "900px",
              color: "#3d4d41",
              fontSize: "32px",
              lineHeight: 1.45,
              fontWeight: 500,
            }}
          >
            모의 투자와 퀴즈, 학습 콘텐츠로 주식 투자를 연습하고 경험해보세요.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
