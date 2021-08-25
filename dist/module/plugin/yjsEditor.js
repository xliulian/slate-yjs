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
    applySlateOps: (e, operations, originId = null) => {
        //invariant(e.sharedType.doc, 'shared type is not bound to a document');
        e.isLocal = true;
        e.localYjsStateVector = Y.encodeStateVector(e.localYDoc);
        e.localYDoc.transact(() => {
            applySlateOps(e.sharedType, operations);
        }, originId);
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
                const localOps = e.operations.slice(opCount);
                Promise.resolve().then(() => {
                    // delay the local op apply to avoid dead loop caused by observeDeep
                    YjsEditor.applySlateOps(e, localOps);
                });
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
export function withYjs(editor, ydoc, sharedTypeKey = 'content', originId) {
    const e = editor;
    e.isRemote = false;
    e.isLocal = false;
    e.remoteUpdated = false;
    e.localYDoc = new Y.Doc();
    e.remoteYDoc = ydoc;
    //e.remoteSharedType = sharedType
    let initialSynced = false;
    e.sharedType = e.localYDoc.getArray(sharedTypeKey);
    e.sharedType.observeDeep((events) => {
        if (!e.isLocal && initialSynced) {
            YjsEditor.applyYjsEvents(e, events);
        }
    });
    const sharedType = ydoc.getArray(sharedTypeKey);
    let initialSynceScheduled = false;
    const scheduleInitialSync = (source = 'init') => {
        if (initialSynceScheduled || !sharedType.length) {
            return;
        }
        initialSynceScheduled = true;
        console.log('schedule synchronizeValue source:', source);
        setTimeout(() => {
            YjsEditor.synchronizeValue(e);
            initialSynced = true;
            e.remoteUpdated = false; // reset remote any updated flag.
        });
    };
    setTimeout(scheduleInitialSync);
    const applyRemoteUpdate = () => {
        if (!e.remoteUpdated) {
            console.log('ignore applyRemoteUpdate call due to remote updated flag is false');
            return;
        }
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
        !initialSynceScheduled && scheduleInitialSync('remote update');
        if (initialSynced && !e.isLocal && !e.isUndoRedo) {
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
    e.receiveOperation = () => {
        // use current newest update.
        const remoteUpdate = Y.encodeStateAsUpdate(e.remoteYDoc, e.localYjsStateVector);
        Y.applyUpdate(e.localYDoc, remoteUpdate);
        e.localYjsStateVector = Y.encodeStateVector(e.localYDoc);
    };
    const { onChange } = editor;
    e.onChange = () => {
        if (!e.isRemote) {
            YjsEditor.applySlateOps(e, e.operations, e.originId);
        }
        if (onChange) {
            onChange();
        }
    };
    e.originId = null;
    if (originId !== false) {
        e.originId = originId || e.localYDoc.clientID;
        e.undoManager = new Y.UndoManager(e.sharedType, {
            trackedOrigins: new Set([e.originId])
        });
        e.undo = () => {
            console.log('undoManager undo');
            e.isUndoRedo = true;
            const localYjsStateVector = Y.encodeStateVector(e.localYDoc);
            e.undoManager.undo();
            console.log('after undo');
            const undoUpdate = Y.encodeStateAsUpdate(e.localYDoc, localYjsStateVector);
            // now localYDoc updated, the update events will be translated to remote update then apply to local slate.
            // but how do we apply the update to remote doc?
            e.localYjsStateVector = Y.encodeStateVector(e.localYDoc);
            if (undoUpdate && undoUpdate.length) {
                Y.applyUpdate(e.remoteYDoc, undoUpdate);
            }
            // eslint-disable-next-line no-return-assign
            /*Promise.resolve().then(() => (*/ e.isUndoRedo = false; //));
        };
        e.redo = () => {
            console.log('undoManager redo');
            e.isUndoRedo = true;
            const localYjsStateVector = Y.encodeStateVector(e.localYDoc);
            e.undoManager.redo();
            console.log('after redo');
            const redoUpdate = Y.encodeStateAsUpdate(e.localYDoc, localYjsStateVector);
            // now localYDoc updated, the update events will be translated to remote update then apply to local slate.
            // but how do we apply the update to remote doc?
            e.localYjsStateVector = Y.encodeStateVector(e.localYDoc);
            if (redoUpdate && redoUpdate.length) {
                Y.applyUpdate(e.remoteYDoc, redoUpdate);
            }
            // eslint-disable-next-line no-return-assign
            /*Promise.resolve().then(() => (*/ e.isUndoRedo = false; //));
        };
    }
    return e;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieWpzRWRpdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL3BsdWdpbi95anNFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLE1BQU0sRUFBYSxNQUFNLE9BQU8sQ0FBQztBQUMxQyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQzlDLHlDQUF5QztBQUN6QyxPQUFPLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQztBQUN6QixPQUFPLENBQUMsTUFBTSxRQUFRLENBQUM7QUFDdkIsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUN6QyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRXhDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQW1COUMsTUFBTSxDQUFDLE1BQU0sU0FBUyxHQUFHO0lBQ3ZCOztPQUVHO0lBQ0gsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFZLEVBQVEsRUFBRTtRQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xDLENBQUMsQ0FBQyxtQkFBbUIsR0FBRyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBQy9FLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQTtRQUV4QyxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRTtZQUNoQyxDQUFDLENBQUMsUUFBUSxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDdEMsK0VBQStFO1lBQy9FLElBQUks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