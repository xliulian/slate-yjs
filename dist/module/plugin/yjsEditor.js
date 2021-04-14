import { Editor } from 'slate';
import { HistoryEditor } from 'slate-history';
//import invariant from 'tiny-invariant';
import * as Y from 'yjs';
import _ from 'lodash';
import { applySlateOps } from '../apply';
import { toSlateOps } from '../convert';
import { toSlateDoc } from '../utils/convert';
export const YjsEditor = {
    /**
     * Set the editor value to the content of the to the editor bound shared type.
     */
    synchronizeValue: (e) => {
        console.log('synchronizeValue', e);
        e.localYjsStateVector = Y.encodeStateVector(e.localYDoc);
        const remoteUpdate = Y.encodeStateAsUpdate(e.remoteYDoc, e.localYjsStateVector);
        Y.applyUpdate(e.localYDoc, remoteUpdate);
        Editor.withoutNormalizing(e, () => {
            e.children = toSlateDoc(e.sharedType);
            // XXX: Since we are force override slate internal doc, clear what we can clear
            if (HistoryEditor.isHistoryEditor(e)) {
                e.history.undos = [];
                e.history.redos = [];
            }
            e.selection = null;
            e.operations = [];
        });
        // onChange expect valid doc, we make sure do normalization before that.
        Editor.normalize(e, { force: true });
        if (e.operations.length === 0) {
            // if any op was applied, onChange will be scheduled, so we do not call from here.
            e.onChange();
        }
    },
    /**
     * Apply slate ops to Yjs
     */
    applySlateOps: (e, operations) => {
        //invariant(e.sharedType.doc, 'shared type is not bound to a document');
        e.isLocal = true;
        e.localYjsStateVector = Y.encodeStateVector(e.localYDoc);
        e.localYDoc.transact(() => {
            applySlateOps(e.sharedType, operations);
        });
        const localUpdate = Y.encodeStateAsUpdate(e.localYDoc, e.localYjsStateVector);
        e.localYjsStateVector = Y.encodeStateVector(e.localYDoc);
        if (localUpdate && localUpdate.length) {
            Y.applyUpdate(e.remoteYDoc, localUpdate);
        }
        // eslint-disable-next-line no-return-assign
        /*Promise.resolve().then(() => (*/ e.isLocal = false; //));
    },
    /**
     * Apply Yjs events to slate
     */
    applyYjsEvents: (e, events) => {
        // do not change isRemote flag for no-op case.
        const wasRemote = e.isRemote;
        e.isRemote = true;
        const slateOps = toSlateOps(events, e);
        console.log('translated yjs update events to slate ops:', events, slateOps);
        const applyRemoteOpsToSlate = () => {
            let opCount = e.operations.length;
            Editor.withoutNormalizing(e, () => {
                slateOps.forEach((o) => {
                    e.apply(o);
                });
                opCount = e.operations.length;
                //e.onCursor && e.onCursor(updated.cursors)
            });
            if (e.operations.length > opCount) {
                // XXX: there are some normalization operations happened
                //      make sure we apply it to remote (automerge doc)
                YjsEditor.applySlateOps(e, e.operations.slice(opCount));
            }
        };
        const preserveExternalHistory = false;
        if (HistoryEditor.isHistoryEditor(e) && !preserveExternalHistory) {
            HistoryEditor.withoutSaving(e, applyRemoteOpsToSlate);
        }
        else {
            applyRemoteOpsToSlate();
        }
        if (slateOps.length > 0) {
            // XXX: only schedule set isRemote false when we did scheduled onChange by apply.
            Promise.resolve().then(_ => (e.isRemote = false));
        }
        else {
            e.isRemote = wasRemote;
        }
    },
};
export function withYjs(editor, ydoc, sharedTypeKey = 'content') {
    const e = editor;
    e.isRemote = false;
    e.isLocal = false;
    e.remoteUpdated = false;
    e.localYDoc = new Y.Doc();
    e.remoteYDoc = ydoc;
    //e.remoteSharedType = sharedType
    let initialSynced = false;
    e.sharedType = e.localYDoc.getArray(sharedTypeKey);
    const sharedType = ydoc.getArray(sharedTypeKey);
    e.sharedType.observeDeep((events) => {
        if (!e.isLocal && initialSynced) {
            YjsEditor.applyYjsEvents(e, events);
        }
    });
    let initialSynceScheduled = false;
    const scheduleInitialSync = () => {
        if (initialSynceScheduled || !sharedType.length) {
            return;
        }
        initialSynceScheduled = true;
        console.log('schedule synchronizeValue');
        setTimeout(() => {
            YjsEditor.synchronizeValue(e);
            initialSynced = true;
        });
    };
    setTimeout(scheduleInitialSync);
    const applyRemoteUpdate = () => {
        console.log('batch apply yjs remote update ...');
        // state of last: e.localYjsStateVector
        // we need figure out updates since e.localYjsStateVector
        // then somehow apply it to slate.
        const remoteUpdate = Y.encodeStateAsUpdate(e.remoteYDoc, e.localYjsStateVector);
        //Y.applyUpdate(e.localYDoc, remoteUpdate)
        if (remoteUpdate && remoteUpdate.length) {
            e.receiveOperation(remoteUpdate);
        }
        // XXX: how do we get slate ops from the remote Update?? apply them again on the other ydoc?
        e.remoteUpdated = false;
    };
    const throttledApplyRemoteUpdate = _.throttle(applyRemoteUpdate, 250, { leading: false });
    sharedType.observeDeep(() => {
        !initialSynceScheduled && scheduleInitialSync();
        if (!e.isLocal) {
            console.log('schedule yjs remote update');
            e.remoteUpdated = true;
            if (e.children.length === 0) {
                setTimeout(applyRemoteUpdate);
            }
            else {
                throttledApplyRemoteUpdate();
            }
        }
    });
    e.receiveOperation = (update) => {
        Y.applyUpdate(e.localYDoc, update);
        e.localYjsStateVector = Y.encodeStateVector(e.localYDoc);
    };
    const { onChange } = editor;
    e.onChange = () => {
        if (!e.isRemote) {
            YjsEditor.applySlateOps(e, e.operations);
        }
        if (onChange) {
            onChange();
        }
    };
    return e;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieWpzRWRpdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL3BsdWdpbi95anNFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLE1BQU0sRUFBYSxNQUFNLE9BQU8sQ0FBQztBQUMxQyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQzlDLHlDQUF5QztBQUN6QyxPQUFPLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQztBQUN6QixPQUFPLENBQUMsTUFBTSxRQUFRLENBQUM7QUFDdkIsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUN6QyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRXhDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQWM5QyxNQUFNLENBQUMsTUFBTSxTQUFTLEdBQUc7SUFDdkI7O09BRUc7SUFDSCxnQkFBZ0IsRUFBRSxDQUFDLENBQVksRUFBUSxFQUFFO1FBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEMsQ0FBQyxDQUFDLG1CQUFtQixHQUFHLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDeEQsTUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFDL0UsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBRXhDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFO1lBQ2hDLENBQUMsQ0FBQyxRQUFRLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUN0QywrRUFBK0U7WUFDL0UsSUFBSSxh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