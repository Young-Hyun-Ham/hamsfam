
import styles from '../NodeController.module.css';
import { useNodeController } from './hooks/useNodeController'; // 💡[추가된 부분]

function FixedMenuNodeController({ localNode, setLocalNode }) {
    const { data } = localNode;
    // 💡[수정된 부분] Custom Hook 사용
    const { handleLocalDataChange, addReply, updateReply, deleteReply } = useNodeController(setLocalNode);

    return (
        <>
            <div className={styles.formGroup}>
                <label>Menu Title</label>
                <textarea value={data.content || ''} onChange={(e) => handleLocalDataChange('content', e.target.value)} rows={4} />
            </div>
            <div className={styles.formGroup}>
                <label>Menus</label>
                <div className={styles.repliesContainer}>
                    {data.replies?.map((reply, index) => (
                        <div key={reply.value || index} className={styles.quickReply}>
                            <input
                                className={styles.quickReplyInput}
                                value={reply.display}
                                onChange={(e) => updateReply(index, 'display', e.target.value)}
                                placeholder="Display text"
                            />
                            <button onClick={() => deleteReply(index)} className={styles.deleteReplyButton}>×</button>
                        </div>
                    ))}
                    <button onClick={addReply} className={styles.addReplyButton}>
                        + Add Menu
                    </button>
                </div>
            </div>
        </>
    );
}

export default FixedMenuNodeController;