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
        });
        // onChange expect valid doc, we make sure do normalization before that.
        slate_1.Editor.normalize(e, { force: true });
        e.onChange();
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
        const slateOps = convert_1.toSlateOps(events, e.children);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieWpzRWRpdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL3BsdWdpbi95anNFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlDQUEwQztBQUMxQyxpREFBOEM7QUFDOUMseUNBQXlDO0FBQ3pDLHVDQUF5QjtBQUN6QixvREFBdUI7QUFDdkIsb0NBQXlDO0FBQ3pDLHdDQUF3QztBQUV4Qyw4Q0FBOEM7QUFjakMsUUFBQSxTQUFTLEdBQUc7SUFDdkI7O09BRUc7SUFDSCxnQkFBZ0IsRUFBRSxDQUFDLENBQVksRUFBUSxFQUFFO1FBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEMsQ0FBQyxDQUFDLG1CQUFtQixHQUFHLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDeEQsTUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFDL0UsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBRXhDLGNBQU0sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFO1lBQ2hDLENBQUMsQ0FBQyxRQUFRLEdBQUcsb0JBQVUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDdEMsK0VBQStFO1lBQy9FLElBQUksNkJBQWEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ3BDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztnQkFDckIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO2FBQ3RCO1lBQ0QsQ0FBQyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7UUFDckIsQ0FBQyxDQUFDLENBQUM7UUFFSCx3RUFBd0U7UUFDeEUsY0FBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNyQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDZixDQUFDO0lBRUQ7O09BRUc7SUFDSCxhQUFhLEVBQUUsQ0FBQyxDQUFZLEVBQUUsVUFBdUIsRUFBUSxFQUFFO1FBQzdELHdFQUF3RTtRQUV4RSxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztRQUVqQixDQUFDLENBQUMsbUJBQW1CLEdBQUcsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUN4RCxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7WUFDeEIscUJBQWEsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQzFDLENBQUMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFDN0UsQ0FBQyxDQUFDLG1CQUFtQixHQUFHLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFeEQsSUFBSSxXQUFXLElBQUksV0FBVyxDQUFDLE1BQU0sRUFBRTtZQUNyQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFDLENBQUE7U0FDekM7UUFFRCw0Q0FBNEM7UUFDNUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxjQUFjLEVBQUUsQ0FBQyxDQUFZLEVBQUUsTUFBa0IsRUFBUSxFQUFFO1FBQ3pELDhDQUE4QztRQUM5QyxNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDO1FBQzdCLENBQUMsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBRWxCLE1BQU0sUUFBUSxHQUFHLG9CQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMvQyxPQUFPLENBQUMsR0FBRyxDQUFDLDRDQUE0QyxFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUMzRSxNQUFNLHFCQUFxQixHQUFHLEdBQUcsRUFBRTtZQUNqQyxJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQTtZQUNqQyxjQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRTtnQkFDaEMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQVksRUFBRSxFQUFFO29CQUNoQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNaLENBQUMsQ0FBQyxDQUFBO2dCQUNGLE9BQU8sR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQTtnQkFDN0IsMkNBQTJDO1lBQzdDLENBQUMsQ0FBQyxDQUFBO1lBQ0YsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxPQUFPLEVBQUU7Z0JBQ2pDLHdEQUF3RDtnQkFDeEQsdURBQXVEO2dCQUN2RCxpQkFBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQzthQUN6RDtRQUNILENBQUMsQ0FBQTtRQUVELE1BQU0sdUJBQXVCLEdBQUcsS0FBSyxDQUFBO1FBQ3JDLElBQUksNkJBQWEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsRUFBRTtZQUNoRSw2QkFBYSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEVBQUUscUJBQXFCLENBQUMsQ0FBQTtTQUN0RDthQUFNO1lBQ0wscUJBQXFCLEVBQUUsQ0FBQTtTQUN4QjtRQUVELElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDdkIsaUZBQWlGO1lBQ2pGLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQTtTQUNsRDthQUFNO1lBQ0wsQ0FBQyxDQUFDLFFBQVEsR0FBRyxTQUFTLENBQUE7U0FDdkI7SUFDSCxDQUFDO0NBQ0YsQ0FBQztBQUVGLFNBQWdCLE9BQU8sQ0FDckIsTUFBUyxFQUNULElBQVcsRUFDWCxnQkFBd0IsU0FBUztJQUVqQyxNQUFNLENBQUMsR0FBRyxNQUF1QixDQUFDO0lBRWxDLENBQUMsQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDO0lBQ25CLENBQUMsQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO0lBQ2xCLENBQUMsQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFDO0lBRXhCLENBQUMsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUE7SUFDekIsQ0FBQyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUE7SUFDbkIsaUNBQWlDO0lBRWpDLElBQUksYUFBYSxHQUFHLEtBQUssQ0FBQztJQUUxQixDQUFDLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBQ2xELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDL0MsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtRQUNsQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxhQUFhLEVBQUU7WUFDL0IsaUJBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQ3JDO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLHFCQUFxQixHQUFHLEtBQUssQ0FBQztJQUNsQyxNQUFNLG1CQUFtQixHQUFHLEdBQUcsRUFBRTtRQUMvQixJQUFJLHFCQUFxQixJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRTtZQUMvQyxPQUFPO1NBQ1I7UUFDRCxxQkFBcUIsR0FBRyxJQUFJLENBQUM7UUFDN0IsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO1FBQ3hDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDZCxpQkFBUyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlCLGFBQWEsR0FBRyxJQUFJLENBQUM7UUFDdkIsQ0FBQyxDQUFDLENBQUE7SUFDSixDQUFDLENBQUE7SUFDRCxVQUFVLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtJQUUvQixNQUFNLGlCQUFpQixHQUFHLEdBQUcsRUFBRTtRQUM3QixPQUFPLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxDQUFDLENBQUE7UUFDaEQsdUNBQXVDO1FBQ3ZDLHlEQUF5RDtRQUN6RCxrQ0FBa0M7UUFDbEMsTUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFDL0UsMENBQTBDO1FBQzFDLElBQUksWUFBWSxJQUFJLFlBQVksQ0FBQyxNQUFNLEVBQUU7WUFDdkMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxDQUFBO1NBQ2pDO1FBQ0QsNEZBQTRGO1FBQzVGLENBQUMsQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFDO0lBQzFCLENBQUMsQ0FBQTtJQUNELE1BQU0sMEJBQTBCLEdBQUcsZ0JBQUMsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLEVBQUMsT0FBTyxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUE7SUFFeEYsVUFBVSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUU7UUFDMUIsQ0FBQyxxQkFBcUIsSUFBSSxtQkFBbUIsRUFBRSxDQUFBO1FBQy9DLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFO1lBQ2QsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFBO1lBQ3pDLENBQUMsQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUMzQixVQUFVLENBQUMsaUJBQWlCLENBQUMsQ0FBQTthQUM5QjtpQkFBTTtnQkFDTCwwQkFBMEIsRUFBRSxDQUFBO2FBQzdCO1NBQ0Y7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILENBQUMsQ0FBQyxnQkFBZ0IsR0FBRyxDQUFDLE1BQU0sRUFBRSxFQUFFO1FBQzlCLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNsQyxDQUFDLENBQUMsbUJBQW1CLEdBQUcsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUMxRCxDQUFDLENBQUE7SUFFRCxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsTUFBTSxDQUFDO0lBRTVCLENBQUMsQ0FBQyxRQUFRLEdBQUcsR0FBRyxFQUFFO1FBQ2hCLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFO1lBQ2YsaUJBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUMxQztRQUVELElBQUksUUFBUSxFQUFFO1lBQ1osUUFBUSxFQUFFLENBQUM7U0FDWjtJQUNILENBQUMsQ0FBQztJQUVGLE9BQU8sQ0FBQyxDQUFDO0FBQ1gsQ0FBQztBQXJGRCwwQkFxRkMifQ==