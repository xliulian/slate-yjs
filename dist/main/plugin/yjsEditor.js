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
    applySlateOps: (e, operations) => {
        //invariant(e.sharedType.doc, 'shared type is not bound to a document');
        e.isLocal = true;
        e.localYjsStateVector = Y.encodeStateVector(e.localYDoc);
        e.localYDoc.transact(() => {
            apply_1.applySlateOps(e.sharedType, operations);
        });
        const localUpdate = Y.encodeStateAsUpdate(e.localYDoc, e.localYjsStateVector);
        e.localYjsStateVector = Y.encodeStateVector(e.localYDoc);
        if (localUpdate && localUpdate.length) {
            Y.applyUpdate(e.remoteYDoc, localUpdate);
        }
        // eslint-disable-next-line no-return-assign
        Promise.resolve().then(() => (e.isLocal = false));
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
                exports.YjsEditor.applySlateOps(e, e.operations.slice(opCount));
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
function withYjs(editor, ydoc, sharedTypeKey = 'content') {
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
            exports.YjsEditor.applyYjsEvents(e, events);
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
            exports.YjsEditor.synchronizeValue(e);
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
    const throttledApplyRemoteUpdate = lodash_1.default.throttle(applyRemoteUpdate, 1000, { leading: false });
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
            exports.YjsEditor.applySlateOps(e, e.operations);
        }
        if (onChange) {
            onChange();
        }
    };
    return e;
}
exports.withYjs = withYjs;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieWpzRWRpdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL3BsdWdpbi95anNFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlDQUEwQztBQUMxQyxpREFBOEM7QUFDOUMseUNBQXlDO0FBQ3pDLHVDQUF5QjtBQUN6QixvREFBdUI7QUFDdkIsb0NBQXlDO0FBQ3pDLHdDQUF3QztBQUV4Qyw4Q0FBOEM7QUFjakMsUUFBQSxTQUFTLEdBQUc7SUFDdkI7O09BRUc7SUFDSCxnQkFBZ0IsRUFBRSxDQUFDLENBQVksRUFBUSxFQUFFO1FBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEMsQ0FBQyxDQUFDLG1CQUFtQixHQUFHLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDeEQsTUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFDL0UsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBRXhDLGNBQU0sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFO1lBQ2hDLENBQUMsQ0FBQyxRQUFRLEdBQUcsb0JBQVUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDdEMsK0VBQStFO1lBQy9FLElBQUksNkJBQWEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ3BDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztnQkFDckIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO2FBQ3RCO1lBQ0QsQ0FBQyxDQUFDLFNBQVMsR0FBRyxJQUFJLENB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