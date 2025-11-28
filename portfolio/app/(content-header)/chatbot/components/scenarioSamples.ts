// app/(content-header)/chatbot/components/scenarioSamples.ts
export const todoScenarioNodes = [
  {
    id: "message-1764313899323-s8p3kq0",
    type: "message",
    position: { x: -158, y: -92 },
    data: {
      id: "message-1764313899323-s8p3kq0",
      content: "오늘의 할일 시나리오를 시작합니다.",
      replies: [],
      chainNext: false,
    },
  },
  {
    id: "branch-1764313940866-hmsfmbv",
    type: "branch",
    position: { x: 170, y: -104 },
    data: {
      id: "branch-1764313940866-hmsfmbv",
      evaluationType: "BUTTON",
      conditions: [
        {
          id: "cond-1764313940866",
          slot: "",
          operator: "==",
          value: "",
          valueType: "value",
        },
      ],
      replies: [
        {
          display: "Yes",
          value: "cond_1764313940866",
        },
        {
          display: "No",
          value: "cond_1764313952319-ncbqd65",
        },
      ],
      content: "오늘의 할일을 등록 하시겠습니까?",
    },
  },
  {
    id: "form-1764313977106-1nt7swz",
    type: "form",
    position: { x: 510, y: -166 },
    data: {
      id: "form-1764313977106-1nt7swz",
      title: "할일등록",
      elements: [
        {
          id: "input-1764313982347-v1bhkc1",
          type: "input",
          name: "text",
          label: "Text",
          placeholder: "오늘의 할 일을 입력하세요.",
          validation: { type: "text" },
          defaultValue: "",
        },
      ],
      dataSourceType: "json",
      dataSource: "",
      enableExcelUpload: false,
    },
  },
  {
    id: "message-1764314050846-9g8uogv",
    type: "message",
    position: { x: 536, y: 420 },
    data: {
      id: "message-1764314050846-9g8uogv",
      content: "시나리오를 종료합니다.",
      replies: [],
      chainNext: false,
    },
  },
  {
    id: "link-1764314653993-eqbas31",
    type: "link",
    position: { x: 545.36, y: 105.26 },
    data: {
      id: "link-1764314653993-eqbas31",
      content: "http://localhost:5173/todos",
      display: "Link",
      chainNext: false,
    },
  },
];

export const todoScenarioEdges = [
  {
    source: "message-1764313899323-s8p3kq0",
    sourceHandle: null,
    target: "branch-1764313940866-hmsfmbv",
    targetHandle: null,
    id: "reactflow__edge-message-1764313899323-s8p3kq0-branch-1764313940866-hmsfmbv",
  },
  {
    source: "branch-1764313940866-hmsfmbv",
    sourceHandle: "cond_1764313940866",
    target: "form-1764313977106-1nt7swz",
    targetHandle: null,
    id: "reactflow__edge-branch-1764313940866-hmsfmbvcond_1764313940866-form-1764313977106-1nt7swz",
  },
  {
    source: "branch-1764313940866-hmsfmbv",
    sourceHandle: "cond_1764313952319-ncbqd65",
    target: "message-1764314050846-9g8uogv",
    targetHandle: null,
    id: "reactflow__edge-branch-1764313940866-hmsfmbvcond_1764313952319-ncbqd65-message-1764314050846-9g8uogv",
  },
  {
    source: "form-1764313977106-1nt7swz",
    sourceHandle: null,
    target: "link-1764314653993-eqbas31",
    targetHandle: null,
    id: "reactflow__edge-form-1764313977106-1nt7swz-link-1764314653993-eqbas31",
  },
  {
    source: "link-1764314653993-eqbas31",
    sourceHandle: null,
    target: "message-1764314050846-9g8uogv",
    targetHandle: null,
    id: "reactflow__edge-link-1764314653993-eqbas31-message-1764314050846-9g8uogv",
  },
];
