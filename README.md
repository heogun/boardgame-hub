# boardgame-hub
web based P2P boardgame hub

## 새 게임 추가하기

게임 하나는 `src/games/<id>/` 폴더 하나입니다. `index.ts`에서 `defineGame`으로 정의를 `export default` 하면 자동으로 등록되고, 대기실 게임 목록·인원 검증·시작 버튼·옵션 UI가 생성됩니다. 공용 파일은 고칠 필요가 없습니다. 가장 작은 예제는 [`src/games/tictactoe/index.ts`](src/games/tictactoe/index.ts)입니다.

| 항목 | 역할 | 실행 위치 |
|---|---|---|
| `setup({ players, options })` | 초기 상태 생성 (무작위 포함) | 방장 |
| `reduce(state, action, { playerId })` | 액션 검증·적용. 규칙 위반이면 `throw new IllegalAction('사유')` | 방장 |
| `view(state, viewerId)` *(선택)* | 플레이어별로 보이는 정보만 남김 (손패·덱 등 숨김 정보) | 방장 |
| `render(container, state, ctx)` | 화면 그리기. 입력은 `ctx.dispatch(action)`, 로컬 UI 상태는 `ctx.local` | 모두 |
| `result(state)` *(선택)* | 끝났으면 `{ summary }` → 종료 배너, 다시 하기/대기실 버튼 | 모두 |
| `options` *(선택)* | 대기실에서 고르는 옵션 (덱, 맵, 난이도 등) | — |
| `tick` *(선택)* | 실시간·타이머 게임용 주기 업데이트 | 방장 |
| `onPlayerLeave` *(선택)* | 도중 이탈 시 계속 진행할 상태 반환 (없으면 게임 종료). 연결이 끊긴 플레이어는 60초 동안 재접속을 기다린 뒤에 호출된다 | 방장 |

네트워크 구조는 방장 권위(host-authoritative) 방식입니다. 클라이언트는 액션만 보내고, 방장이 검증한 뒤 각자에게 걸러진 상태를 보냅니다. 게임 도중 들어온 사람은 관전자로 참여합니다. 구현은 [`src/framework/`](src/framework/)에 있습니다.

방장 탭은 방과 진행 중인 게임 상태를 `sessionStorage`에 자동 저장합니다. 방장이 새로고침해도 같은 방 ID로 다시 열리고, 참가자는 자동으로 재접속해 같은 자리로 돌아옵니다. 그래서 **게임 상태는 JSON으로 저장할 수 있는 평범한 객체**여야 합니다 (`Map`·`Set`·클래스 인스턴스·함수는 넣지 마세요).
