import { useState } from 'react';
import styles from './HelpModal.module.css';

// --- 👇 [수정] Delay Node 추가 및 Slot 구문 설명 수정 ---
const HelpManual = () => (
<>
 <h2>1. Getting Started</h2>
 <h3>1.1. Login</h3>
 <ul>
 <li>You must log in with a Google account to use the service.</li>
 <li>Only users with <strong>authorized emails and domains</strong>(<code>cyberlogitec.com</code>, <code>wisenut.co.kr</code>) can access the service.</li>
 </ul>
 <h3>1.2. Main Screen</h3>
 <ul>
 <li><strong>Flow Editor</strong>: The main workspace for visually creating and editing chatbot conversation flows.</li>
 <li><strong>Board</strong>: Provides a simple bulletin board feature to help communication between users.</li>
 <li><strong>API Docs</strong>: Displays the API specification for managing scenarios.</li>
 <li><strong>Backend Switch</strong>: Located in the top-right header, this switch allows you to toggle between <strong>Firebase</strong> and <strong>FastAPI</strong> backends for scenario data storage and management.</li>
 </ul>

 <h2>2. Scenario Management</h2>
 <p>The first screen you see after login is the <strong>Scenario List</strong>.</p>
 <ul>
 <li><strong>Add New Scenario</strong>: Click the <code>+ Add New Scenario</code> button and enter a scenario name and select a job type to create a new conversation flow.</li>
 <li><strong>Select Scenario</strong>: Click on a scenario name in the list to navigate to that scenario's editing screen.</li>
 {/* --- 👇 [수정] Clone 기능 추가 --- */}
 <li><strong>Edit/Clone/Delete Scenario</strong>: Use the <code>Edit</code> icon to change the name or job type, the <code>Clone</code> icon to duplicate the scenario with a new name, or the <code>Delete</code> icon to permanently remove the scenario.</li>
 {/* --- 👆 [수정 끝] --- */}
 </ul>

  <h2>3. Board Usage</h2>
  <ul>
    <li>You can write new posts, and attach images or files.</li>
    <li>You can edit or delete only the posts you have created.</li>
  </ul>

 <h2>4. Flow Editor Screen Layout</h2>
 <ol>
 <li><strong>Node Addition Panel (Left)</strong>: Add various types of nodes that make up the scenario to the canvas.</li>
 <li><strong>Canvas (Center)</strong>: Space for placing nodes and connecting them to create actual conversation flows. A <strong>Minimap</strong> is available in the bottom-right corner for easy navigation.</li>
 <li><strong>Controller Panel (Right)</strong>: Activated when you select a node on the canvas, allowing you to edit the detailed content of that node.</li>
 <li><strong>Simulator (Right)</strong>: Can be activated by clicking the <code><img src="/images/chat_simulator.png" alt="chatbot" style={{ width: '24px', height: '24px' }}/></code> icon to test how your written scenario works in real-time as an actual chatbot.</li>
 </ol>

 <h2>5. Node Types and Functions</h2>
 <p>Click the desired node from the left panel to add it to the canvas.</p>
 <table className={styles.table}>
 <thead>
  <tr>
  <th>Node Type</th>
  <th>Description</th>
  </tr>
 </thead>
 <tbody>
  <tr>
  <td><strong>Message</strong></td>
  <td>The most basic text message that the chatbot sends to users. You can add quick reply buttons (Quick Replies).</td>
  </tr>
  <tr>
  <td><strong>Form</strong></td>
  <td>A form for receiving structured data input from users (e.g., text, date, checkboxes, dropdown, grid). Options/data can be dynamically populated from slots. Selecting a row in a slot-bound grid stores the row data in the <code>selectedRow</code> slot.</td>
  </tr>
  <tr>
  <td><strong>Condition Branch</strong></td>
  <td>Divides the conversation flow into multiple branches based on user responses (buttons) or slot values (conditions, including boolean <code>true</code>/<code>false</code> and comparing slots).</td>
  </tr>
  <tr>
  <td><strong>SlotFilling</strong></td>
  <td>Used to receive user input (text or button click) and store it in specific variables (Slots).</td>
  </tr>
  <tr>
  <td><strong>API</strong></td>
  <td>Calls an external API. You can use slot values in the request (URL, headers, body) and save parts of the JSON response back into slots. It allows branching based on success/failure and supports multiple parallel API requests.</td>
  </tr>
  <tr>
  <td><strong>LLM</strong></td>
  <td>Connects to a large language model to generate text based on a dynamic prompt using slot values. The flow can be branched based on keywords in the generated response, and the full response can be saved to a slot.</td>
  </tr>
  <tr>
  <td><strong>Set Slot</strong></td>
  <td>Directly sets or updates the value of one or more slots using static values or values from other slots. Supports string, number, boolean, and JSON object/array types.</td>
  </tr>
  {/* --- 👇 [추가] Delay Node --- */}
  <tr>
    <td><strong>Delay</strong></td>
    <td>Pauses the conversation flow for a specified duration (in milliseconds) before proceeding to the next node. Does not display any message to the user during the delay.</td>
  </tr>
  {/* --- 👆 [추가 끝] --- */}
  <tr>
  <td><strong>Link</strong></td>
  <td>Delivers external website links to users, optionally opening them in a new tab.</td>
  </tr>
   <tr>
  <td><strong>Toast</strong></td>
  <td>Displays a small, non-intrusive pop-up message (info, success, error) to the user in the simulator. It does not interrupt the conversation flow.</td>
  </tr>
  <tr>
  <td><strong>iFrame</strong></td>
  <td>Embeds an external webpage directly within the chatbot interface using an iframe, with configurable dimensions.</td>
  </tr>
 </tbody>
 </table>

 <h2>6. Scenario Editing and Testing</h2>
 <h3>6.1. Node Editing</h3>
 <ol>
 <li>Click on the node you want to edit on the canvas.</li>
 <li>Modify the node's text, buttons, form elements, API details, etc. in the <strong>Controller Panel</strong> that appears on the right.</li>
 <li>When editing is complete, click the <code>Save Changes</code> button at the bottom of the controller panel to apply changes to the node.</li>
 </ol>

 <h3>6.2. Using Slots (Variables)</h3>
 <p>Slots are variables used to store and reuse information within a scenario. You can store user input, data from API responses, LLM outputs, selected grid rows, or set them directly.</p>
 {/* --- 👇 [수정] Slot 구문 설명 통일 --- */}
 <p>To use a stored slot value within node content (like messages, prompts, URLs, API bodies, etc.), use the <strong>curly brace notation</strong>: <code>{`{{slotName}}`}</code>.</p>
 <p><strong>Example:</strong> If you stored a user's name in a slot called <code>userName</code>, you can use it in a Message node like this: <code>Hello, {`{{userName}}`}! Welcome.</code> The Slot Display panel (top-left of the canvas) shows the current values of all slots during simulation.</p>
 {/* --- 👆 [수정 끝] --- */}

 <h4>6.2.1. Dynamic Options/Data (Slot Binding)</h4>
 <p>In a <strong>Form</strong> node, you can dynamically populate the options of a <strong>Dropbox</strong> or the data in a <strong>Grid</strong> element from a slot containing an array.</p>
 <ul>
    <li><strong>Data Format</strong>: The slot must contain an array. For Dropbox, it can be strings or objects with <code>label</code>/<code>value</code>. For Grid, it should typically be an array of objects.</li>
    <li><strong>Setup</strong>:
        <ol>
            <li>Select the Dropbox or Grid element in the Form Node controller.</li>
            <li>In the 'Options Slot' (Dropbox) or 'Data Slot' (Grid) field, enter the name of the slot holding the array (e.g., <code>user_list</code>).</li>
            {/* --- 💡 [수정] Grid 'Display Labels' 설명 변경 --- */}
            <li>(Grid specific) Optionally specify 'Display Labels' using <code>key(Label)</code> syntax (e.g., <code>name(My Name),email</code>). If <code>(Label)</code> is omitted, the key is used as the label. You can also check 'Hide Columns with Null Values'.</li>
            {/* --- 💡 [수정 끝] --- */}
            <li>Fallback options/data entered manually will be used if the slot is empty or invalid.</li>
        </ol>
    </li>
    <li><strong>Grid Row Selection</strong>: When a user clicks a row in a Grid populated via 'Data Slot', the entire data object for that row is automatically stored in a special slot named <code>selectedRow</code>. You can then use this slot (e.g., <code>{`{{selectedRow.userId}}`}</code>) in subsequent nodes.</li>
 </ul>

 <h3>6.3. Using the API Node</h3>
 <p>The API node allows for dynamic interaction with external servers.</p>
 <ul>
 <li><strong>Individual API Test</strong>: In single API mode, click the <strong>Play (▶)</strong> icon on the node header to test that specific API call immediately using current slot values. In multi-API mode, use the 'Test' button in the controller for the selected API call.</li>
 <li><strong>Multi API Request</strong>: Check 'Enable Multi API' in the controller to send multiple requests in parallel. Add and configure each call. The node proceeds to 'On Success' only if *all* calls succeed, otherwise to 'On Error'.</li>
 {/* --- 👇 [수정] Slot 구문 설명 수정 --- */}
 <li><strong>Dynamic Requests</strong>: Use slots (e.g., <code>{`{{userId}}`}</code>) in the URL, Headers (JSON string values), or Body (JSON string values) fields to make dynamic API calls.</li>
 {/* --- 👆 [수정 끝] --- */}
 <li><strong>Response Mapping</strong>: Extract values from the JSON response using JSON Path (e.g., <code>data.user.name</code>, <code>data.items[0].product</code>) and save them into slots.</li>
 <li><strong>Success/Failure Branching</strong>: Connect the <code>On Success</code> handle (green) for successful calls and the <code>On Error</code> handle (red) for failed calls to different subsequent nodes.</li>
 </ul>

 <h3>6.4. Using the LLM Node</h3>
 <p>The LLM node sends a dynamic prompt (using slots like <code>{`{{topic}}`}</code>) to a large language model and displays the response.</p>
 <ul>
    <li><strong>Output Variable</strong>: Store the full LLM response text into a specified slot.</li>
    <li><strong>Conditional Branching</strong>: Add conditions based on 'Keywords'. If a keyword is found in the response, the flow follows that specific handle. Otherwise, it follows the 'Default' handle.</li>
 </ul>

 <h3>6.5. Node Connection</h3>
 <ul>
 <li>Drag from the handles (circles) on the edges of nodes to connect them.</li>
 <li><strong>Branch/API/LLM nodes</strong>: These have multiple source handles corresponding to different outcomes (button clicks, conditions, success/error, keywords). Hover over a handle to see its purpose.</li>
 </ul>

 <h3>6.6. Node and Connection Deletion/Duplication</h3>
 <ul>
 <li><strong>Delete Node</strong>: Click the <code>x</code> icon in the top right of the node.</li>
 <li><strong>Delete Connection</strong>: Click the connection line itself to select it, then press <code>Backspace</code> or <code>Delete</code>.</li>
 <li><strong>Duplicate Node</strong>: Select the node you want to copy, then click the <code>+ Duplicate Node</code> button at the bottom of the left panel.</li>
 </ul>

 <h3>6.7. Node and Scenario Group Management</h3>
  <p>Reuse parts of scenarios or entire scenarios efficiently.</p>
  <ul>
    <li><strong>Export/Import Nodes</strong>: Select nodes (Shift+click for multiple), click <code>Export Nodes</code> (copies to clipboard), then go to another scenario (or the same one) and click <code>Import Nodes</code> to paste.</li>
    <li><strong>Scenario as Group</strong>: Click <code>+ Scenario Group</code>, choose a scenario from the list. It will be imported as a single, collapsible group node representing that entire scenario's flow. Connect its input/output handles like a regular node.</li>
  </ul>

 {/* --- 👇 [추가] chainNext 기능 설명 --- */}
 <h3>6.8. Chaining Bubbles (No New Bubble)</h3>
 <ul>
  <li>For non-interactive nodes (like Message, API, LLM, Set Slot, Delay, Link, iFrame, Toast), you can find a checkbox in the <strong>Controller Panel</strong> labeled <strong>"Chain with next node (no new bubble)"</strong>.</li>
  <li>If this is <strong>checked</strong>, the simulator will not create a new speech bubble for this node. Instead, it will <strong>append its content sequentially</strong> to the currently active bubble after a short delay (for visual effect).</li>
  <li>This allows you to chain multiple messages, API calls, and delays together to appear as a single, continuous turn from the bot.</li>
  <li>The chain breaks (a new bubble is started) when a node has this option <strong>unchecked</strong>, or when an <strong>interactive node</strong> (like Form, SlotFilling, or Button Branch) is reached.</li>
 </ul>
 {/* --- 👆 [추가 끝] --- */}

 {/* --- 👇 [수정] 섹션 번호 변경 6.8 -> 6.9 --- */}
 <h3>6.9. Setting the Start Node</h3>
 <ul>
  <li>Click the **Play (▶)** icon in the header of any node to designate it as the starting point for the simulation.</li>
  <li>The designated Start Node will have a **green border and shadow**.</li>
  <li>Clicking the Play icon again on the same node will remove its Start Node designation.</li>
  <li>If no Start Node is explicitly set, the simulation will attempt to begin from a node that has no incoming connections.</li>
  <li>The currently set Start Node ID is saved along with the scenario data.</li>
 </ul>
 {/* --- 👆 [수정 끝] --- */}

 {/* --- 👇 [수정] 섹션 번호 변경 6.9 -> 6.10 --- */}
 <h3>6.10. Save and Test</h3>
 <ul>
 <li><strong>Save</strong>: Click the Save icon (💾) in the top right to save the current scenario structure (including the Start Node ID) to the selected backend (Firebase/FastAPI).</li>
 <li><strong>Test</strong>: Click the Chatbot icon (🤖) to open/close the simulator panel. Click the 'Start' button within the simulator header to begin testing from the designated Start Node (or the inferred starting node).</li>
 </ul>
 {/* --- 👆 [수정 끝] --- */}
</>
);

const HelpManual_ko = () => (
<>
 <h2>1. 시작하기</h2>
 <h3>1.1. 로그인</h3>
 <ul>
 <li>서비스를 이용하려면 구글 계정으로 로그인해야 합니다.</li>
 <li><strong>허용된 이메일과 도메인</strong>(<code>cyberlogitec.com</code>, <code>wisenut.co.kr</code>)을 가진 사용자만 접근할 수 있습니다.</li>
 </ul>
 <h3>1.2. 메인 화면</h3>
 <ul>
 <li><strong>Flow Editor</strong>: 챗봇 대화 흐름을 시각적으로 만들고 편집하는 기본 작업 공간입니다.</li>
 <li><strong>Board</strong>: 사용자 간 소통을 돕는 간단한 게시판 기능을 제공합니다.</li>
 <li><strong>API Docs</strong>: 시나리오 관리를 위한 API 명세를 보여줍니다.</li>
 <li><strong>백엔드 전환 스위치</strong>: 우측 상단 헤더에 위치하며, 시나리오 데이터 저장 및 관리를 위한 백엔드를 <strong>Firebase</strong>와 <strong>FastAPI</strong> 중에서 선택할 수 있습니다.</li>
 </ul>

 <h2>2. 시나리오 관리</h2>
 <p>로그인 후 가장 먼저 시나리오 목록 화면이 나타납니다.</p>
 <ul>
 <li><strong>새 시나리오 추가</strong>: <code>+ 새 시나리오 추가</code> 버튼을 클릭하고 시나리오 이름과 Job 타입을 선택하여 새로운 대화 흐름을 생성합니다.</li>
 <li><strong>시나리오 선택</strong>: 목록에서 시나리오 이름을 클릭하면 해당 시나리오의 편집 화면으로 이동합니다.</li>
 {/* --- 👇 [수정] Clone 기능 추가 --- */}
 <li><strong>시나리오 수정/복제/삭제</strong>: 각 항목 옆의 <code>수정</code> 아이콘으로 이름이나 Job 타입을 변경하고, <code>복제</code> 아이콘으로 시나리오를 새 이름으로 복제하며, <code>삭제</code> 아이콘으로 시나리오를 영구적으로 제거합니다.</li>
 {/* --- 👆 [수정 끝] --- */}
 </ul>

 <h2>3. 게시판 사용법</h2>
  <ul>
    <li>새 게시물을 작성하고, 이미지나 파일을 첨부할 수 있습니다.</li>
    <li>자신이 작성한 게시물만 수정하거나 삭제할 수 있습니다.</li>
  </ul>

 <h2>4. Flow Editor 화면 구성</h2>
 <ol>
 <li><strong>노드 추가 패널 (좌측)</strong>: 시나리오를 구성하는 다양한 종류의 노드를 캔버스에 추가합니다.</li>
 <li><strong>캔버스 (중앙)</strong>: 노드를 배치하고 연결하여 실제 대화 흐름을 구성하는 공간입니다. 쉬운 탐색을 위해 우측 하단에 <strong>미니맵</strong>이 제공됩니다.</li>
 <li><strong>컨트롤러 패널 (우측)</strong>: 캔버스에서 노드를 선택하면 활성화되며, 해당 노드의 세부 내용을 편집할 수 있습니다.</li>
 <li><strong>시뮬레이터 (우측)</strong>: <code><img src="/images/chat_simulator.png" alt="chatbot" style={{ width: '24px', height: '24px' }}/></code> 아이콘을 클릭하여 활성화할 수 있으며, 작성한 시나리오가 실제 챗봇처럼 동작하는지 실시간으로 테스트할 수 있습니다.</li>
 </ol>

 <h2>5. 노드 종류 및 기능</h2>
 <p>좌측 패널에서 원하는 노드를 클릭하여 캔버스에 추가하세요.</p>
 <table className={styles.table}>
 <thead>
  <tr>
  <th>노드<br />종류</th>
  <th>설명</th>
  </tr>
 </thead>
 <tbody>
  <tr>
  <td><strong>메시지</strong></td>
  <td>챗봇이 사용자에게 보내는 가장 기본적인 텍스트 메시지입니다. 빠른 답장 버튼(Quick Replies)을 추가할 수 있습니다.</td>
  </tr>
  <tr>
  <td><strong>폼</strong></td>
  <td>사용자로부터 텍스트, 날짜, 체크박스, 드롭다운, 그리드 등 정형화된 데이터 입력을 받기 위한 양식입니다. 선택지/데이터를 슬롯을 통해 동적으로 구성할 수 있습니다. 슬롯에 바인딩된 그리드의 행을 선택하면 해당 행 데이터가 <code>selectedRow</code> 슬롯에 저장됩니다.</td>
  </tr>
  <tr>
  <td><strong>조건<br />분기</strong></td>
  <td>사용자의 답변(버튼 클릭) 또는 슬롯 값(조건 비교, boolean <code>true</code>/<code>false</code> 포함, 슬롯 간 비교)에 따라 대화 흐름을 여러 갈래로 나눕니다.</td>
  </tr>
  <tr>
  <td><strong>슬롯<br />채우기</strong></td>
  <td>사용자 입력(텍스트 또는 버튼 클릭)을 받아 특정 변수(Slot)에 저장하는 데 사용됩니다.</td>
  </tr>
  <tr>
  <td><strong>API</strong></td>
  <td>외부 API를 호출합니다. 요청(URL, 헤더, 본문) 시 슬롯 값을 사용할 수 있으며, JSON 응답의 일부를 다시 슬롯에 저장할 수 있습니다. 성공/실패 분기 및 다중 API 병렬 요청을 지원합니다.</td>
  </tr>
  <tr>
  <td><strong>LLM</strong></td>
  <td>거대 언어 모델과 연동하여 슬롯 값을 사용한 동적 프롬프트를 기반으로 텍스트를 생성합니다. 생성된 응답 내용의 키워드에 따라 흐름을 분기할 수 있으며, 전체 응답을 슬롯에 저장할 수 있습니다.</td>
  </tr>
  <tr>
  <td><strong>슬롯<br/>설정</strong></td>
  <td>하나 이상의 슬롯 값을 고정 값 또는 다른 슬롯 값으로 직접 설정하거나 업데이트합니다. 문자열, 숫자, boolean, JSON 객체/배열 타입을 지원합니다.</td>
  </tr>
  {/* --- 👇 [추가] Delay Node --- */}
  <tr>
    <td><strong>딜레이</strong></td>
    <td>다음 노드로 진행하기 전에 지정된 시간(밀리초 단위) 동안 대화 흐름을 일시 중지합니다. 지연 시간 동안 사용자에게는 아무 메시지도 표시되지 않습니다.</td>
  </tr>
  {/* --- 👆 [추가 끝] --- */}
  <tr>
  <td><strong>링크</strong></td>
  <td>외부 웹사이트 링크를 사용자에게 전달하며, 선택적으로 새 탭에서 열 수 있습니다.</td>
  </tr>
  <tr>
  <td><strong>토스트</strong></td>
  <td>시뮬레이터 내에서 사용자에게 방해되지 않는 작은 팝업 메시지(정보, 성공, 오류)를 표시합니다. 대화 흐름을 중단시키지 않습니다.</td>
  </tr>
   <tr>
  <td><strong>iFrame</strong></td>
  <td>iframe을 사용하여 외부 웹페이지를 챗봇 인터페이스 내에 직접 삽입하며, 크기를 조절할 수 있습니다.</td>
  </tr>
 </tbody>
 </table>

 <h2>6. 시나리오 편집 및 테스트</h2>
 <h3>6.1. 노드 편집</h3>
 <ol>
 <li>캔버스에서 편집하고 싶은 노드를 클릭합니다.</li>
 <li>우측에 나타나는 <strong>컨트롤러 패널</strong>에서 노드의 텍스트, 버튼, 양식 요소, API 정보 등을 수정합니다.</li>
 <li>편집이 끝나면 컨트롤러 패널 하단의 <code>Save Changes</code> 버튼을 클릭하여 변경 사항을 노드에 적용합니다.</li>
 </ol>

 <h3>6.2. 슬롯(변수) 사용하기</h3>
 <p>슬롯은 시나리오 내에서 정보를 저장하고 재사용하기 위한 변수입니다. 사용자 입력, API 응답, LLM 출력, 선택된 그리드 행 데이터 등을 저장하거나 직접 설정할 수 있습니다.</p>
 {/* --- 👇 [수정] Slot 구문 설명 통일 --- */}
 <p>노드 내용(메시지, 프롬프트, URL, API 본문 등) 안에서 저장된 슬롯 값을 사용하려면 <strong>이중 중괄호 표기법</strong>: <code>{`{{슬롯이름}}`}</code>을 사용합니다.</p>
 <p><strong>예시:</strong> <code>userName</code>이라는 슬롯에 사용자 이름을 저장했다면, 메시지 노드에서 <code>안녕하세요, {`{{userName}}`}님!</code> 과 같이 사용할 수 있습니다. 캔버스 좌측 상단의 슬롯 표시 패널은 시뮬레이션 중 현재 모든 슬롯의 값을 보여줍니다.</p>
 {/* --- 👆 [수정 끝] --- */}

 <h4>6.2.1. 동적 옵션/데이터 (슬롯 바인딩)</h4>
 <p><strong>Form</strong> 노드에서, 배열을 담고 있는 슬롯을 이용하여 <strong>Dropbox</strong> 요소의 선택지나 <strong>Grid</strong> 요소의 데이터를 동적으로 채울 수 있습니다.</p>
 <ul>
    <li><strong>데이터 형식</strong>: 슬롯은 반드시 배열 형태여야 합니다. Dropbox의 경우 문자열 또는 <code>label</code>/<code>value</code> 객체 배열, Grid의 경우 일반적으로 객체 배열 형태입니다.</li>
    <li><strong>설정 방법</strong>:
        <ol>
            <li>Form 노드 컨트롤러에서 Dropbox 또는 Grid 요소를 선택합니다.</li>
            <li>'Options Slot'(Dropbox) 또는 'Data Slot'(Grid) 필드에 배열을 담고 있는 슬롯 이름을 입력합니다(예: <code>user_list</code>).</li>
            {/* --- 💡 [수정] Grid 'Display Labels' 설명 변경 --- */}
            <li>(Grid 전용) 선택적으로 <code>key(Label)</code> 형식(예: <code>name(내 이름),email</code>)을 사용하여 'Display Labels'를 지정할 수 있습니다. <code>(Label)</code>을 생략하면 키 값이 레이블로 사용됩니다. 'Hide Columns with Null Values'도 체크할 수 있습니다.</li>
            {/* --- 💡 [수정 끝] --- */}
            <li>슬롯이 비어있거나 유효하지 않으면 수동으로 입력된 대체(Fallback) 옵션/데이터가 사용됩니다.</li>
        </ol>
    </li>
    <li><strong>Grid 행 선택</strong>: 'Data Slot'을 통해 채워진 Grid에서 사용자가 특정 행을 클릭하면, 해당 행의 전체 데이터 객체가 <code>selectedRow</code>라는 특수 슬롯에 자동으로 저장됩니다. 이후 노드에서 이 슬롯 값을 사용할 수 있습니다(예: <code>{`{{selectedRow.userId}}`}</code>).</li>
 </ul>

 <h3>6.3. API 노드 사용하기</h3>
 <p>API 노드를 사용하면 외부 서버와 동적으로 상호작용할 수 있습니다.</p>
 <ul>
 <li><strong>개별 API 테스트</strong>: 단일 API 모드에서는 노드 헤더의 **재생(▶) 아이콘**을 클릭하여 현재 슬롯 값으로 해당 API를 즉시 테스트합니다. 다중 API 모드에서는 컨트롤러에서 선택한 API 호출에 대한 'Test' 버튼을 사용합니다.</li>
 <li><strong>다중 API 요청</strong>: 컨트롤러에서 'Enable Multi API'를 체크하면 여러 API 요청을 병렬로 보낼 수 있습니다. 각 호출을 추가하고 개별적으로 설정합니다. *모든* 호출이 성공해야 'On Success'로 진행되며, 하나라도 실패하면 'On Error'로 진행됩니다.</li>
 {/* --- 👇 [수정] Slot 구문 설명 수정 --- */}
 <li><strong>동적 요청</strong>: URL, Headers(JSON 문자열 값), Body(JSON 문자열 값) 필드에 슬롯(예: <code>{`{{userId}}`}</code>)을 사용하여 동적인 API를 호출할 수 있습니다.</li>
 {/* --- 👆 [수정 끝] --- */}
 <li><strong>응답 매핑</strong>: JSON Path(예: <code>data.user.name</code>, <code>data.items[0].product</code>)를 사용하여 JSON 응답에서 값을 추출하고 지정된 슬롯에 저장합니다.</li>
 <li><strong>성공/실패 분기</strong>: 성공 시에는 <code>On Success</code> 핸들(녹색)에서, 실패 시에는 <code>On Error</code> 핸들(빨간색)에서 다음 노드로 연결합니다.</li>
 </ul>

 <h3>6.4. LLM 노드 사용하기</h3>
 <p>LLM 노드는 슬롯 값(<code>{`{{topic}}`}</code> 등)을 사용하여 동적 프롬프트를 거대 언어 모델에 보내고 응답을 표시합니다.</p>
 <ul>
    <li><strong>출력 변수 (Output Variable)</strong>: LLM의 전체 응답 텍스트를 지정된 슬롯에 저장합니다.</li>
    <li><strong>조건부 분기 (Conditional Branching)</strong>: '키워드' 기반 조건을 추가합니다. 응답에 키워드가 포함되어 있으면 해당 핸들로, 없으면 'Default' 핸들로 흐름이 분기됩니다.</li>
 </ul>

 <h3>6.5. 노드 연결</h3>
 <ul>
 <li>노드 가장자리의 핸들(원)을 클릭하여 다른 노드의 핸들로 드래그하여 연결합니다.</li>
 <li><strong>조건 분기/API/LLM 노드</strong>: 버튼 클릭, 조건, 성공/실패, 키워드 등 다양한 결과에 따라 여러 개의 소스 핸들을 가집니다. 핸들 위에 마우스를 올리면 용도를 확인할 수 있습니다.</li>
 </ul>

 <h3>6.6. 노드 및 연결선 삭제/복제</h3>
 <ul>
 <li><strong>노드 삭제</strong>: 노드 우측 상단의 <code>x</code> 아이콘을 클릭합니다.</li>
 <li><strong>연결선 삭제</strong>: 연결선 자체를 클릭하여 선택한 후 <code>Backspace</code> 또는 <code>Delete</code> 키를 누릅니다.</li>
 <li><strong>노드 복제</strong>: 복제할 노드를 선택한 후, 좌측 패널 하단의 <code>+ Duplicate Node</code> 버튼을 클릭합니다.</li>
 </ul>

 <h3>6.7. 노드 및 시나리오 그룹 관리</h3>
 <p>시나리오의 일부 또는 전체를 효율적으로 재사용합니다.</p>
 <ul>
  <li><strong>노드 내보내기/가져오기</strong>: 노드들을 선택(Shift+클릭)하고 <code>Export Nodes</code>로 복사한 뒤, 다른 (또는 같은) 시나리오에서 <code>Import Nodes</code>로 붙여넣습니다.</li>
  <li><strong>시나리오 그룹으로 가져오기</strong>: <code>+ Scenario Group</code> 버튼을 누르고 목록에서 시나리오를 선택하면, 해당 시나리오 전체가 하나의 접을 수 있는 그룹 노드로 캔버스에 추가됩니다. 일반 노드처럼 입/출력 핸들을 연결하여 사용합니다.</li>
 </ul>

 {/* --- 👇 [추가] chainNext 기능 설명 --- */}
 <h3>6.8. 말풍선 묶기 (No New Bubble)</h3>
 <ul>
  <li>사용자 입력이 필요 없는 노드(Message, API, LLM, Set Slot, Delay, Link, iFrame, Toast)의 <strong>컨트롤러 패널</strong>에서 <strong>"다음 노드와 이어서 표시"</strong> 체크박스를 찾을 수 있습니다.</li>
  <li>이 옵션을 <strong>체크</strong>하면, 시뮬레이터는 이 노드를 위해 새 말풍선을 생성하지 않습니다. 대신, (시각적 효과를 위해) 약간의 딜레이 후 현재 활성화된 말풍선에 <strong>내용을 순차적으로 덧붙입니다.</strong></li>
  <li>이를 통해 여러 메시지, API 호출, 딜레이 등을 봇의 연속된 하나의 턴(turn)처럼 자연스럽게 묶어서 표시할 수 있습니다.</li>
  <li>이 체인(연결)은 이 옵션이 <strong>체크 해제</strong>된 노드를 만나거나, <strong>사용자 입력이 필요한 노드</strong>(Form, SlotFilling 등)를 만나면 중단되고 새 말풍선이 시작됩니다.</li>
 </ul>
 {/* --- 👆 [추가 끝] --- */}

 {/* --- 👇 [수정] 섹션 번호 변경 6.8 -> 6.9 --- */}
 <h3>6.9. 시작 노드 설정</h3>
 <ul>
  <li>시뮬레이션을 시작할 노드의 헤더에 있는 **재생(▶) 아이콘**을 클릭하여 시작 노드로 지정합니다.</li>
  <li>지정된 시작 노드는 **녹색 테두리와 그림자**로 표시됩니다.</li>
  <li>같은 노드의 재생 아이콘을 다시 클릭하면 시작 노드 지정이 해제됩니다.</li>
  <li>시작 노드를 명시적으로 지정하지 않으면, 들어오는 연결이 없는 노드에서 시뮬레이션이 시작됩니다.</li>
  <li>현재 설정된 시작 노드 ID는 시나리오 데이터와 함께 저장됩니다.</li>
 </ul>
 {/* --- 👆 [수정 끝] --- */}

 {/* --- 👇 [수정] 섹션 번호 변경 6.9 -> 6.10 --- */}
 <h3>6.10. 저장 및 테스트</h3>
 <ul>
 <li><strong>저장</strong>: 화면 우측 상단의 저장 아이콘(💾)을 클릭하여 현재 시나리오 구조(시작 노드 ID 포함)를 선택된 백엔드(Firebase/FastAPI)에 저장합니다.</li>
 <li><strong>테스트</strong>: 챗봇 아이콘(🤖)을 클릭하여 시뮬레이터 패널을 열고 닫습니다. 시뮬레이터 헤더의 'Start' 버튼을 클릭하여 지정된 시작 노드(또는 추론된 시작 노드)부터 테스트를 시작합니다.</li>
 </ul>
 {/* --- 👆 [수정 끝] --- */}
</>
);

// --- 👇 [수정] 베트남어 번역 (Delay Node 추가, Slot 구문 수정, Start Node 설명 추가 등) ---
const HelpManual_vi = () => (
<>
 <h2>1. Bắt đầu</h2>
 <h3>1.1. Đăng nhập</h3>
 <ul>
 <li>Bạn phải đăng nhập bằng tài khoản Google để sử dụng dịch vụ.</li>
 <li>Chỉ những người dùng có <strong>email và tên miền được ủy quyền</strong> (<code>cyberlogitec.com</code>, <code>wisenut.co.kr</code>) mới có thể truy cập dịch vụ.</li>
 </ul>
 <h3>1.2. Màn hình chính</h3>
 <ul>
 <li><strong>Trình chỉnh sửa luồng (Flow Editor)</strong>: Không gian làm việc chính để tạo và chỉnh sửa luồng hội thoại của chatbot một cách trực quan.</li>
 <li><strong>Bảng tin (Board)</strong>: Cung cấp tính năng bảng tin đơn giản để giúp người dùng giao tiếp với nhau.</li>
 <li><strong>Tài liệu API (API Docs)</strong>: Hiển thị thông số kỹ thuật API để quản lý các kịch bản.</li>
 <li><strong>Công tắc Backend</strong>: Nằm ở tiêu đề trên cùng bên phải, công tắc này cho phép bạn chuyển đổi giữa các backend <strong>Firebase</strong> và <strong>FastAPI</strong> để lưu trữ và quản lý dữ liệu kịch bản.</li>
 </ul>

 <h2>2. Quản lý kịch bản</h2>
 <p>Màn hình đầu tiên bạn thấy sau khi đăng nhập là <strong>Danh sách kịch bản</strong>.</p>
 <ul>
 <li><strong>Thêm kịch bản mới</strong>: Nhấp vào nút <code>+ Thêm kịch bản mới</code>, nhập tên kịch bản và chọn loại công việc (job type) để tạo một luồng hội thoại mới.</li>
 <li><strong>Chọn kịch bản</strong>: Nhấp vào tên kịch bản trong danh sách để điều hướng đến màn hình chỉnh sửa của kịch bản đó.</li>
 <li><strong>Chỉnh sửa/Sao chép/Xóa kịch bản</strong>: Sử dụng biểu tượng <code>Chỉnh sửa</code> để thay đổi tên hoặc loại công việc, biểu tượng <code>Sao chép</code> để nhân bản kịch bản với tên mới, hoặc biểu tượng <code>Xóa</code> để xóa vĩnh viễn kịch bản.</li>
 </ul>

  <h2>3. Cách sử dụng Bảng tin</h2>
  <ul>
    <li>Bạn có thể viết bài mới, đính kèm hình ảnh hoặc tệp tin.</li>
    <li>Bạn chỉ có thể chỉnh sửa hoặc xóa các bài đăng do chính bạn tạo.</li>
  </ul>

 <h2>4. Bố cục màn hình Trình chỉnh sửa luồng</h2>
 <ol>
 <li><strong>Bảng thêm Node (Bên trái)</strong>: Thêm các loại node khác nhau tạo nên kịch bản vào canvas.</li>
 <li><strong>Canvas (Ở giữa)</strong>: Không gian để đặt các node và kết nối chúng để tạo ra các luồng hội thoại thực tế. Một <strong>Bản đồ thu nhỏ (Minimap)</strong> có sẵn ở góc dưới cùng bên phải để dễ dàng điều hướng.</li>
 <li><strong>Bảng điều khiển (Bên phải)</strong>: Được kích hoạt khi bạn chọn một node trên canvas, cho phép bạn chỉnh sửa nội dung chi tiết của node đó.</li>
 <li><strong>Trình mô phỏng (Bên phải)</strong>: Có thể được kích hoạt bằng cách nhấp vào biểu tượng <code><img src="/images/chat_simulator.png" alt="chatbot" style={{ width: '24px', height: '24px' }}/></code> để kiểm tra xem kịch bản bạn đã viết hoạt động như thế nào trong thời gian thực như một chatbot thực tế.</li>
 </ol>

 <h2>5. Các loại Node và chức năng</h2>
 <p>Nhấp vào node mong muốn từ bảng bên trái để thêm nó vào canvas.</p>
 <table className={styles.table}>
 <thead>
  <tr>
  <th>Loại Node</th>
  <th>Mô tả</th>
  </tr>
 </thead>
 <tbody>
  <tr>
  <td><strong>Tin nhắn (Message)</strong></td>
  <td>Tin nhắn văn bản cơ bản nhất mà chatbot gửi cho người dùng. Bạn có thể thêm các nút trả lời nhanh (Quick Replies).</td>
  </tr>
  <tr>
  <td><strong>Biểu mẫu (Form)</strong></td>
  <td>Một biểu mẫu để nhận dữ liệu có cấu trúc từ người dùng (ví dụ: văn bản, ngày tháng, hộp kiểm, danh sách thả xuống, lưới). Tùy chọn/dữ liệu có thể được điền động từ các slot. Việc chọn một hàng trong lưới được liên kết với slot sẽ lưu trữ dữ liệu hàng đó vào slot <code>selectedRow</code>.</td>
  </tr>
  <tr>
  <td><strong>Nhánh điều kiện (Condition Branch)</strong></td>
  <td>Chia luồng hội thoại thành nhiều nhánh dựa trên phản hồi của người dùng (nút bấm) hoặc giá trị của slot (điều kiện, bao gồm boolean <code>true</code>/<code>false</code> và so sánh giữa các slot).</td>
  </tr>
  <tr>
  <td><strong>Điền slot (SlotFilling)</strong></td>
  <td>Được sử dụng để nhận thông tin đầu vào của người dùng (văn bản hoặc nhấp nút) và lưu trữ nó trong các biến cụ thể (Slots).</td>
  </tr>
  <tr>
  <td><strong>API</strong></td>
  <td>Gọi một API bên ngoài. Bạn có thể sử dụng các giá trị của slot trong yêu cầu (URL, headers, body) và lưu các phần của phản hồi JSON trở lại vào các slot. Cho phép phân nhánh dựa trên thành công/thất bại và hỗ trợ nhiều yêu cầu API song song.</td>
  </tr>
  <tr>
  <td><strong>LLM</strong></td>
  <td>Kết nối với một mô hình ngôn ngữ lớn để tạo văn bản dựa trên một lời nhắc động sử dụng giá trị slot. Luồng có thể được phân nhánh dựa trên các từ khóa trong phản hồi được tạo ra và phản hồi đầy đủ có thể được lưu vào một slot.</td>
  </tr>
  <tr>
  <td><strong>Đặt Slot (Set Slot)</strong></td>
  <td>Trực tiếp đặt hoặc cập nhật giá trị của một hoặc nhiều slot bằng cách sử dụng các giá trị tĩnh hoặc giá trị từ các slot khác. Hỗ trợ các kiểu dữ liệu chuỗi, số, boolean và đối tượng/mảng JSON.</td>
  </tr>
  <tr>
    <td><strong>Độ trễ (Delay)</strong></td>
    <td>Tạm dừng luồng hội thoại trong một khoảng thời gian xác định (tính bằng mili giây) trước khi chuyển sang node tiếp theo. Không hiển thị bất kỳ tin nhắn nào cho người dùng trong thời gian trì hoãn.</td>
  </tr>
  <tr>
  <td><strong>Liên kết (Link)</strong></td>
  <td>Cung cấp các liên kết trang web bên ngoài cho người dùng, tùy chọn mở chúng trong một tab mới.</td>
  </tr>
   <tr>
  <td><strong>Thông báo nhanh (Toast)</strong></td>
  <td>Hiển thị một thông báo bật lên nhỏ, không phô trương (thông tin, thành công, lỗi) cho người dùng trong trình mô phỏng. Nó không làm gián đoạn luồng hội thoại.</td>
  </tr>
  <tr>
  <td><strong>iFrame</strong></td>
  <td>Nhúng một trang web bên ngoài trực tiếp vào giao diện chatbot bằng iframe, với kích thước có thể định cấu hình.</td>
  </tr>
 </tbody>
 </table>

 <h2>6. Chỉnh sửa và kiểm tra kịch bản</h2>
 <h3>6.1. Chỉnh sửa Node</h3>
 <ol>
 <li>Nhấp vào node bạn muốn chỉnh sửa trên canvas.</li>
 <li>Sửa đổi văn bản, nút, các yếu tố biểu mẫu, chi tiết API, v.v. của node trong <strong>Bảng điều khiển</strong> xuất hiện ở bên phải.</li>
 <li>Khi chỉnh sửa xong, nhấp vào nút <code>Lưu thay đổi (Save Changes)</code> ở cuối bảng điều khiển để áp dụng các thay đổi cho node.</li>
 </ol>

 <h3>6.2. Sử dụng Slots (Biến)</h3>
 <p>Slots là các biến được sử dụng để lưu trữ và tái sử dụng thông tin trong một kịch bản. Bạn có thể lưu trữ đầu vào của người dùng, dữ liệu từ phản hồi API, đầu ra LLM, hàng lưới đã chọn hoặc đặt chúng trực tiếp.</p>
 <p>Để sử dụng giá trị slot đã lưu trong nội dung node (như tin nhắn, lời nhắc, URL, body API, v.v.), hãy sử dụng <strong>ký hiệu dấu ngoặc nhọn kép</strong>: <code>{`{{tên_slot}}`}</code>.</p>
 <p><strong>Ví dụ:</strong> Nếu bạn đã lưu tên người dùng trong một slot có tên là <code>userName</code>, bạn có thể sử dụng nó trong một node Tin nhắn như sau: <code>Xin chào, {`{{userName}}`}! Chào mừng.</code> Bảng hiển thị Slot (phía trên bên trái của canvas) hiển thị các giá trị hiện tại của tất cả các slot trong quá trình mô phỏng.</p>

 <h4>6.2.1. Tùy chọn/Dữ liệu động (Liên kết Slot)</h4>
 <p>Trong một node <strong>Biểu mẫu (Form)</strong>, bạn có thể tự động điền các tùy chọn của một phần tử <strong>Dropbox</strong> hoặc dữ liệu trong một phần tử <strong>Lưới (Grid)</strong> từ một slot chứa một mảng.</p>
 <ul>
    <li><strong>Định dạng dữ liệu</strong>: Slot phải chứa một mảng. Đối với Dropbox, đó có thể là chuỗi hoặc đối tượng có <code>label</code>/<code>value</code>. Đối với Lưới, thường là một mảng các đối tượng.</li>
    <li><strong>Cài đặt</strong>:
        <ol>
            <li>Chọn phần tử Dropbox hoặc Lưới trong bộ điều khiển Node Biểu mẫu.</li>
            <li>Trong trường 'Options Slot' (Dropbox) hoặc 'Data Slot' (Lưới), nhập tên của slot chứa mảng (ví dụ: <code>user_list</code>).</li>
            {/* --- 💡 [수정] Grid 'Display Labels' 설명 변경 --- */}
            <li>(Chỉ Lưới) Tùy chọn chỉ định 'Display Labels' bằng cú pháp <code>key(Label)</code> (ví dụ: <code>name(Tên tôi),email</code>). Nếu <code>(Label)</code> bị bỏ qua, khóa sẽ được sử dụng làm nhãn. Bạn cũng có thể chọn 'Hide Columns with Null Values'.</li>
            {/* --- 💡 [수정 끝] --- */}
            <li>Các tùy chọn/dữ liệu dự phòng được nhập thủ công sẽ được sử dụng nếu slot trống hoặc không hợp lệ.</li>
        </ol>
    </li>
    <li><strong>Lựa chọn hàng lưới</strong>: Khi người dùng nhấp vào một hàng trong Lưới được điền thông qua 'Data Slot', toàn bộ đối tượng dữ liệu cho hàng đó sẽ tự động được lưu trữ trong một slot đặc biệt có tên là <code>selectedRow</code>. Sau đó, bạn có thể sử dụng slot này (ví dụ: <code>{`{{selectedRow.userId}}`}</code>) trong các node tiếp theo.</li>
 </ul>

 <h3>6.3. Sử dụng Node API</h3>
 <p>Node API cho phép tương tác động với các máy chủ bên ngoài.</p>
 <ul>
 <li><strong>Kiểm tra API riêng lẻ</strong>: Ở chế độ API đơn, nhấp vào biểu tượng <strong>Phát (▶)</strong> trên tiêu đề node để kiểm tra lệnh gọi API cụ thể đó ngay lập tức bằng cách sử dụng các giá trị slot hiện tại. Ở chế độ đa API, sử dụng nút 'Test' trong bộ điều khiển cho lệnh gọi API đã chọn.</li>
 <li><strong>Yêu cầu API đa nhiệm</strong>: Chọn 'Enable Multi API' trong bộ điều khiển để gửi nhiều yêu cầu song song. Thêm và cấu hình từng lệnh gọi. Node chỉ tiếp tục đến 'On Success' nếu *tất cả* các lệnh gọi thành công, nếu không sẽ đến 'On Error'.</li>
 <li><strong>Yêu cầu động</strong>: Sử dụng các slot (ví dụ: <code>{`{{userId}}`}</code>) trong các trường URL, Headers (giá trị chuỗi JSON) hoặc Body (giá trị chuỗi JSON) để thực hiện các lệnh gọi API động.</li>
 <li><strong>Ánh xạ phản hồi (Response Mapping)</strong>: Trích xuất các giá trị từ phản hồi JSON bằng cách sử dụng Đường dẫn JSON (ví dụ: <code>data.user.name</code>, <code>data.items[0].product</code>) và lưu chúng vào các slot.</li>
 <li><strong>Phân nhánh thành công/thất bại</strong>: Kết nối tay cầm <code>On Success</code> (màu xanh lá) cho các lệnh gọi thành công và tay cầm <code>On Error</code> (màu đỏ) cho các lệnh gọi không thành công đến các node tiếp theo khác nhau.</li>
 </ul>

 <h3>6.4. Sử dụng Node LLM</h3>
 <p>Node LLM gửi một lời nhắc động (sử dụng các slot như <code>{`{{topic}}`}</code>) đến một mô hình ngôn ngữ lớn và hiển thị phản hồi.</p>
 <ul>
    <li><strong>Biến đầu ra (Output Variable)</strong>: Lưu trữ toàn bộ văn bản phản hồi LLM vào một slot được chỉ định.</li>
    <li><strong>Phân nhánh có điều kiện (Conditional Branching)</strong>: Thêm các điều kiện dựa trên 'Từ khóa'. Nếu một từ khóa được tìm thấy trong phản hồi, luồng sẽ theo tay cầm cụ thể đó. Nếu không, nó sẽ theo tay cầm 'Mặc định (Default)'.</li>
 </ul>

 <h3>6.5. Kết nối Node</h3>
 <ul>
 <li>Kéo từ các tay cầm (hình tròn) trên các cạnh của node để kết nối chúng.</li>
 <li><strong>Node Nhánh/API/LLM</strong>: Các node này có nhiều tay cầm nguồn tương ứng với các kết quả khác nhau (nhấp nút, điều kiện, thành công/lỗi, từ khóa). Di chuột qua một tay cầm để xem mục đích của nó.</li>
 </ul>

 <h3>6.6. Xóa/Nhân bản Node và Kết nối</h3>
 <ul>
 <li><strong>Xóa Node</strong>: Nhấp vào biểu tượng <code>x</code> ở trên cùng bên phải của node.</li>
 <li><strong>Xóa kết nối</strong>: Nhấp vào chính đường kết nối để chọn nó, sau đó nhấn <code>Backspace</code> hoặc <code>Delete</code>.</li>
 <li><strong>Nhân bản Node</strong>: Chọn node bạn muốn sao chép, sau đó nhấp vào nút <code>+ Nhân bản Node (+ Duplicate Node)</code> ở cuối bảng bên trái.</li>
 </ul>

 <h3>6.7. Quản lý Node và Nhóm kịch bản</h3>
  <p>Tái sử dụng các phần của kịch bản hoặc toàn bộ kịch bản một cách hiệu quả.</p>
  <ul>
    <li><strong>Xuất/Nhập Node</strong>: Chọn các node (giữ Shift + nhấp để chọn nhiều), nhấp vào <code>Xuất Node (Export Nodes)</code> (sao chép vào khay nhớ tạm), sau đó chuyển đến kịch bản khác (hoặc cùng kịch bản) và nhấp vào <code>Nhập Node (Import Nodes)</code> để dán.</li>
    <li><strong>Kịch bản dưới dạng Nhóm</strong>: Nhấp vào <code>+ Nhóm kịch bản (+ Scenario Group)</code>, chọn một kịch bản từ danh sách. Nó sẽ được nhập dưới dạng một node nhóm có thể thu gọn duy nhất đại diện cho toàn bộ luồng của kịch bản đó. Kết nối các tay cầm đầu vào/đầu ra của nó giống như một node thông thường.</li>
  </ul>

 {/* --- 👇 [추가] chainNext 기능 설명 --- */}
 <h3>6.8. Nối chuỗi bong bóng (No New Bubble)</h3>
 <ul>
  <li>Đối với các node không tương tác (như Message, API, LLM, Set Slot, Delay, Link, iFrame, Toast), bạn có thể tìm thấy một hộp kiểm trong <strong>Bảng điều khiển</strong> có nhãn <strong>"Nối với node tiếp theo (không tạo bong bóng mới)"</strong>.</li>
  <li>Nếu tùy chọn này được <strong>chọn</strong>, trình mô phỏng sẽ không tạo bong bóng hội thoại mới cho node này. Thay vào đó, nó sẽ <strong>nối thêm nội dung một cách tuần tự</strong> vào bong bóng đang hoạt động sau một khoảng trễ ngắn (để tạo hiệu ứng hình ảnh).</li>
  <li>Điều này cho phép bạn nối chuỗi nhiều tin nhắn, lệnh gọi API và độ trễ lại với nhau để xuất hiện như một lượt nói liên tục duy nhất từ bot.</li>
  <li>Chuỗi này bị ngắt (một bong bóng mới được bắt đầu) khi gặp một node có tùy chọn này <strong>không được chọn</strong>, hoặc khi đến một <strong>node tương tác</strong> (như Form, SlotFilling hoặc Nhánh Nút bấm).</li>
 </ul>
 {/* --- 👆 [추가 끝] --- */}

 {/* --- 👇 [수정] 섹션 번호 변경 6.8 -> 6.9 --- */}
 <h3>6.9. Thiết lập Node Bắt đầu</h3>
 <ul>
  <li>Nhấp vào biểu tượng **Phát (▶)** trong tiêu đề của bất kỳ node nào để chỉ định nó là điểm bắt đầu cho mô phỏng.</li>
  <li>Node Bắt đầu được chỉ định sẽ có **viền và bóng màu xanh lá cây**.</li>
  <li>Nhấp lại vào biểu tượng Phát trên cùng một node sẽ xóa chỉ định Node Bắt đầu của nó.</li>
  <li>Nếu không có Node Bắt đầu nào được đặt rõ ràng, mô phỏng sẽ cố gắng bắt đầu từ một node không có kết nối đến.</li>
  <li>ID Node Bắt đầu hiện được đặt sẽ được lưu cùng với dữ liệu kịch bản.</li>
 </ul>
 {/* --- 👆 [수정 끝] --- */}

 {/* --- 👇 [수정] 섹션 번호 변경 6.9 -> 6.10 --- */}
 <h3>6.10. Lưu và Kiểm tra</h3>
 <ul>
 <li><strong>Lưu</strong>: Nhấp vào biểu tượng Lưu (💾) ở trên cùng bên phải để lưu cấu trúc kịch bản hiện tại (bao gồm cả ID Node Bắt đầu) vào backend đã chọn (Firebase/FastAPI).</li>
 <li><strong>Kiểm tra</strong>: Nhấp vào biểu tượng Chatbot (🤖) để mở/đóng bảng điều khiển trình mô phỏng. Nhấp vào nút 'Start' trong tiêu đề trình mô phỏng để bắt đầu kiểm tra từ Node Bắt đầu được chỉ định (hoặc node bắt đầu được suy ra).</li>
 </ul>
 {/* --- 👆 [수정 끝] --- */}
</>
);
// --- 👆 [수정 끝] ---


function HelpModal({ isOpen, onClose }) {
if (!isOpen) return null;

const [language, setLanguage] = useState('en');

return (
 <div className={styles.modalOverlay} onClick={onClose}>
 <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
  <button className={styles.closeButton} onClick={onClose}>&times;</button>
  
  <select 
  className={styles.languageSelector} 
  value={language} 
  onChange={(e) => setLanguage(e.target.value)}
  >
  <option value="en">English</option>
  <option value="ko">한국어</option>
  <option value="vi">Tiếng Việt</option>
  </select>
  
  <h1>Chatbot Scenario Editor User Manual</h1>
  
  {language === 'en' && <HelpManual />}
  {language === 'ko' && <HelpManual_ko />}
  {language === 'vi' && <HelpManual_vi />}
 </div>
 </div>
);
}

export default HelpModal;