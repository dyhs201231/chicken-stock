# ADK Worker

Google ADK 기반 매매 의도 생성 워커입니다.

이 워커는 판단만 담당합니다. DB 수정, 주문 검증, 체결, 잔고/보유 수량 반영, 주문 저장은 백엔드 매매 로직에서 처리합니다.

## 역할 분리

- ADK Worker: 백엔드 rule-based 필터가 선별한 5~15개 후보 종목을 받아 매매 의도 JSON만 생성합니다.
- Backend: 유저 매매와 에이전트 매매의 진입점은 분리하되, 최종 주문 검증/체결/저장 함수는 공유합니다.

## 폴더/파일 구조

```text
adk-worker/
├── .env.example
├── .python-version
├── Dockerfile
├── README.md
├── cloud-run.md
├── requirements.txt
├── main.py
├── server.py
├── examples/
│   └── run_test_agent.py
├── test_agent/
│   ├── __init__.py
│   └── agent.py
└── adk_worker/
    ├── __init__.py
    ├── config.py
    ├── schema.py
    ├── mock_data.py
    ├── runner.py
    ├── backend_sink.py
    └── agents/
        ├── __init__.py
        ├── base.py
        ├── test_agent.py
        ├── value_agent.py
        ├── growth_agent.py
        └── momentum_agent.py
```

### 루트 파일

- `.env.example`: 워커 실행에 필요한 환경 변수 예시입니다. `GOOGLE_API_KEY`, `GEMINI_MODEL`, 1회 후보 종목 수 제한 등을 관리합니다.
- `.python-version`: 이 워커가 Python 3.11 기준으로 작성되었음을 표시합니다.
- `Dockerfile`: Cloud Run 배포용 컨테이너 이미지 정의입니다.
- `cloud-run.md`: Cloud Run 배포와 로컬 Docker smoke test 절차입니다.
- `requirements.txt`: Python 의존성 목록입니다. Google ADK 사용을 위해 `google-adk`가 포함되어 있습니다.
- `main.py`: 워커 실행 진입점입니다. `python main.py --mock`처럼 실행하면 에이전트 3개의 매매 의도 JSON을 출력합니다.
- `server.py`: Cloud Run에서 실행할 FastAPI HTTP 서버입니다.
- `README.md`: 워커의 목적, 실행 방법, 파일 구조를 설명하는 문서입니다.
- `examples/run_test_agent.py`: DB 없이 mock 종목 하나로 TEST_AGENT를 실행하고 `AgentTradeIntent` JSON을 출력하는 예제입니다.
- `test_agent/agent.py`: `adk web`이 인식하는 Playground용 진입점입니다. 여기에서 `root_agent`를 export합니다.

### `adk_worker/`

- `config.py`: `.env` 값을 읽어 워커 설정을 만듭니다. API 키가 없으면 mock 실행으로 대체할 수 있게 판단합니다.
- `schema.py`: 워커 내부에서 쓰는 데이터 타입을 정의합니다. TypeScript의 `AgentTradeIntent`와 같은 구조의 Python/Pydantic 모델이 들어 있습니다.
- `mock_data.py`: 실제 백엔드 후보 종목 API가 준비되기 전까지 사용할 샘플 종목 데이터입니다.
- `runner.py`: 워커의 전체 흐름을 조립합니다. 후보 종목을 가져오고, VALUE/GROWTH/MOMENTUM 에이전트를 실행한 뒤, 결과를 백엔드 연결 지점으로 넘깁니다.
- `backend_sink.py`: 추후 백엔드 주문 처리 함수 또는 API와 연결될 자리입니다. 현재는 DB를 수정하거나 주문을 실행하지 않습니다.
- `__init__.py`: `adk_worker`를 Python 패키지로 인식시키는 파일입니다.

### `adk_worker/agents/`

- `base.py`: 세 에이전트가 공통으로 쓰는 ADK Agent 생성, 프롬프트 생성, JSON 응답 파싱, 결과 검증 로직입니다.
- `test_agent.py`: Gemini + ADK 호출이 정상 동작하는지 확인하기 위한 최소 에이전트입니다. mock 종목 하나를 받아 `AgentTradeIntent` JSON만 생성합니다.
- `value_agent.py`: VALUE 전략 에이전트입니다. 저평가 지표를 중심으로 매매 의도를 생성합니다.
- `growth_agent.py`: GROWTH 전략 에이전트입니다. 매출 성장률 등 성장 지표를 중심으로 매매 의도를 생성합니다.
- `momentum_agent.py`: MOMENTUM 전략 에이전트입니다. 최근 가격 흐름과 거래량을 중심으로 매매 의도를 생성합니다.
- `__init__.py`: 세 에이전트 실행 함수를 한 곳에서 import할 수 있게 모아둔 파일입니다.

## Setup

```bash
cd adk-worker
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

`.env`에 `GOOGLE_API_KEY`를 넣으면 Google ADK로 실행됩니다. 키가 없으면 mock 판단 로직으로 실행되어 현재도 결과를 확인할 수 있습니다.

## Run

TEST_AGENT를 실제 Gemini 호출로 확인하려면:

```bash
python examples/run_test_agent.py
```

ADK Playground를 띄우려면 `adk-worker` 폴더에서 실행합니다.

```bash
adk web
```

브라우저에서 `test_agent`를 선택한 뒤 아래처럼 입력하면 `AgentTradeIntent` JSON 응답을 확인할 수 있습니다.

```json
{
  "stockId": 1,
  "per": 7.2,
  "pbr": 0.8
}
```

기존 VALUE/GROWTH/MOMENTUM mock 워커를 확인하려면:

```bash
python main.py --mock
```

또는 API 키 설정 후:

```bash
python main.py
```

MVP 운영 정책은 10~30분 주기, 1회 5~15개 후보 종목, Gemini Flash-Lite 모델을 기준으로 합니다. 전체 종목을 LLM에 직접 넣지 말고 백엔드 필터링 이후 최소 데이터만 전달하세요.
