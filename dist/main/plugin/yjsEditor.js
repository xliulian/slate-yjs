"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withYjs = exports.YjsEditor = void 0;
const slate_1 = require("slate");
const slate_history_1 = require("slate-history");
//import invariant from 'tiny-invariant';
const Y = __importStar(require("yjs"));
const lodash_1 = __importDefault(require("lodash"));
const apply_1 = require("../apply");
const convert_1 = require("../convert");
const convert_2 = require("../utils/convert");
exports.YjsEditor = {
    /**
     * Set the editor value to the content of the to the editor bound shared type.
     */
    synchronizeValue: (e) => {
        console.log('synchronizeValue', e);
        e.localYjsStateVector = Y.encodeStateVector(e.localYDoc);
        const remoteUpdate = Y.encodeStateAsUpdate(e.remoteYDoc, e.localYjsStateVector);
        Y.applyUpdate(e.localYDoc, remoteUpdate);
        slate_1.Editor.withoutNormalizing(e, () => {
            e.children = convert_2.toSlateDoc(e.sharedType);
            // XXX: Since we are force override slate internal doc, clear what we can clear
            if (slate_history_1.HistoryEditor.isHistoryEditor(e)) {
                e.history.undos = [];
                e.history.redos = [];
            }
            e.selection = null;
            e.operations = [];
        });
        // onChange expect valid doc, we make sure do normalization before that.
        slate_1.Editor.normalize(e, { force: true });
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
            apply_1.applySlateOps(e.sharedType, operations);
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
        const slateOps = convert_1.toSlateOps(events, e);
        console.log('translated yjs update events to slate ops:', events, slateOps);
        const applyRemoteOpsToSlate = () => {
            let opCount = e.operations.length;
            slate_1.Editor.withoutNormalizing(e, () => {
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
                    exports.YjsEditor.applySlateOps(e, localOps);
                });
            }
        };
        const preserveExternalHistory = false;
        if (slate_history_1.HistoryEditor.isHistoryEditor(e) && !preserveExternalHistory) {
            slate_history_1.HistoryEditor.withoutSaving(e, applyRemoteOpsToSlate);
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
function withYjs(editor, ydoc, sharedTypeKey = 'content', originId) {
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
            exports.YjsEditor.applyYjsEvents(e, events);
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
            exports.YjsEditor.synchronizeValue(e);
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
    const throttledApplyRemoteUpdate = lodash_1.default.throttle(applyRemoteUpdate, 250, { leading: false });
    sharedType.observeDeep(() => {
        !initialSynceScheduled && scheduleInitialSync('remote update');
        if (!e.isLocal && !e.isUndoRedo) {
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
            exports.YjsEditor.applySlateOps(e, e.operations, e.originId);
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
exports.withYjs = withYjs;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieWpzRWRpdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL3BsdWdpbi95anNFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlDQUEwQztBQUMxQyxpREFBOEM7QUFDOUMseUNBQXlDO0FBQ3pDLHVDQUF5QjtBQUN6QixvREFBdUI7QUFDdkIsb0NBQXlDO0FBQ3pDLHdDQUF3QztBQUV4Qyw4Q0FBOEM7QUFtQmpDLFFBQUEsU0FBUyxHQUFHO0lBQ3ZCOztPQUVHO0lBQ0gsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFZLEVBQVEsRUFBRTtRQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xDLENBQUMsQ0FBQyxtQkFBbUIsR0FBRyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBQy9FLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQTtRQUV4QyxjQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRTtZQUNoQyxDQUFDLENBQUMsUUFBUSxHQUFHLG9CQUFVLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3RDLCtFQUErRTtZQUMvRSxJQUFJLDZCQUFhLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNwQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7Z0JBQ3JCLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQzthQUN0QjtZQUNELENBQUMsQ0FBQyxTQUFTLEdBQUcsSUFBSSxD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