## 패키지 구조
```bash
app/(content-header)/chatbot/components/emulator/
  ScenarioEmulator.tsx                # 기존 파일을 이쪽으로 옮기거나, 기존 파일이 re-export
  core/
    graph.ts                          # findRootNode, findNextNode
    stableStringify.ts                # stableStringify
  hooks/
    useScenarioDefinition.ts          # nodes/edges 로딩
    useScenarioHydration.ts           # persisted/initial/root로 1회 hydration
    useScenarioProgress.ts            # progress emit + saveScenarioRun + dedupe
    useScenarioHistoryAppend.ts       # finished 시 onHistoryAppend 1회
    useScenarioReset.ts               # resetScenario
    useScenarioAutoRunner.ts          # currentNode 자동 실행(effect)
  runners/
    runApiNode.ts
    runSetSlotNode.ts
    runLlmNode.ts
  handlers/
    createUiHandlers.ts               # continue/branch/form/link/iframe/slotFilling 핸들러 생성
```