import { useState, useEffect } from 'react';
import useBuilderStore from '../store/index';
import styles from './NodeController.module.css';
import ApiNodeController from './controllers/ApiNodeController';
import FormNodeController from './controllers/FormNodeController';
import LlmNodeController from './controllers/LlmNodeController';
import ToastNodeController from './controllers/ToastNodeController';
import IframeNodeController from './controllers/IframeNodeController';
import MessageNodeController from './controllers/MessageNodeController';
import SlotFillingNodeController from './controllers/SlotFillingNodeController';
import BranchNodeController from './controllers/BranchNodeController';
import LinkNodeController from './controllers/LinkNodeController';
import FixedMenuNodeController from './controllers/FixedMenuNodeController';
import SetSlotNodeController from './controllers/SetSlotNodeController';
import DelayNodeController from './controllers/DelayNodeController';

const nodeControllerMap = {
  message: MessageNodeController,
  slotfilling: SlotFillingNodeController,
  branch: BranchNodeController,
  link: LinkNodeController,
  fixedmenu: FixedMenuNodeController,
  form: FormNodeController,
  api: ApiNodeController,
  llm: LlmNodeController,
  toast: ToastNodeController,
  iframe: IframeNodeController,
  setSlot: SetSlotNodeController,
  delay: DelayNodeController,
} as any;

function NodeController({ backend }: any) {
  const { selectedNodeId, nodes, updateNodeData } = useBuilderStore();
  const [localNode, setLocalNode] = useState<any>(null);
  const [isDirty, setIsDirty] = useState(false);

  const selectedNode = nodes.find((n: any) => n.id === selectedNodeId);

  useEffect(() => {
    if (selectedNode) {
      setLocalNode(JSON.parse(JSON.stringify(selectedNode)));
      setIsDirty(false);
    } else {
      setLocalNode(null);
    }
  }, [selectedNode]);

  useEffect(() => {
    if (localNode && selectedNode) {
      const hasChanged = JSON.stringify(localNode.data) !== JSON.stringify(selectedNode.data);
      setIsDirty(hasChanged);
    }
  }, [localNode, selectedNode]);

  if (!localNode) {
    return (
      <div className={styles.controllerContainer}>
        <div className={styles.mainControls}>
          <h3>Controller</h3>
          <p className={styles.placeholder}>Please select a node to edit.</p>
        </div>
      </div>
    );
  }

  const handleSaveChanges = () => {
    updateNodeData(localNode.id, localNode.data);
    setIsDirty(false);
  };

  const renderContent = () => {
    const ControllerComponent = nodeControllerMap[localNode.type];
    const commonProps = { localNode, setLocalNode, backend };

    return ControllerComponent
      ? <ControllerComponent {...commonProps} />
      : <p className={styles.placeholder}>This node type has no editable properties.</p>;
  };

  return (
    <div className={styles.controllerContainer}>
      <div className={styles.mainControls}>
        <h3>Type: {localNode.type}</h3>
        <div className={styles.form}>
          {renderContent()}
        </div>
      </div>
      <div className={styles.controllerActions}>
        <button onClick={handleSaveChanges} className={styles.saveNodeButton} disabled={!isDirty}>
          Save Changes {isDirty && ' *'}
        </button>
      </div>
    </div>
  );
}

export default NodeController;