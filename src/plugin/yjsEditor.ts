import { Editor, Operation } from 'slate';
import { HistoryEditor } from 'slate-history';
//import invariant from 'tiny-invariant';
import * as Y from 'yjs';
import _ from 'lodash';
import { applySlateOps } from '../apply';
import { toSlateOps } from '../convert';
import { SharedType } from '../model';
import { toSlateDoc } from '../utils/convert';

export interface YjsEditor extends Editor {
  isRemote: boolean;
  isLocal: boolean;
  remoteUpdated: boolean;
  sharedType: SharedType;
  //remoteSharedType: SharedType;
  localYDoc: Y.Doc;
  remoteYDoc: Y.Doc;
  localYjsStateVector: Uint8Array,
  receiveOperation: (update: Uint8Array) => void;
  undoManager: Y.UndoManager;
  originId: any;
  isUndoRedo: boolean;
  undo: () => void;
  redo: () => void;
}

export const YjsEditor = {
  /**
   * Set the editor value to the content of the to the editor bound shared type.
   */
  synchronizeValue: (e: YjsEditor): void => {
    console.log('synchronizeValue', e)
    e.localYjsStateVector = Y.encodeStateVector(e.localYDoc)
    const remoteUpdate = Y.encodeStateAsUpdate(e.remoteYDoc, e.localYjsStateVector)
    Y.applyUpdate(e.localYDoc, remoteUpdate)

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
  applySlateOps: (e: YjsEditor, operations: Operation[], originId: any = null): void => {
    //invariant(e.sharedType.doc, 'shared type is not bound to a document');

    e.isLocal = true;

    e.localYjsStateVector = Y.encodeStateVector(e.localYDoc)
    e.localYDoc.transact(() => {
      applySlateOps(e.sharedType, operations);
    }, originId);
    const localUpdate = Y.encodeStateAsUpdate(e.localYDoc, e.localYjsStateVector)
    e.localYjsStateVector = Y.encodeStateVector(e.localYDoc)

    if (localUpdate && localUpdate.length) {
      Y.applyUpdate(e.remoteYDoc, localUpdate)
    }

    // eslint-disable-next-line no-return-assign
    /*Promise.resolve().then(() => (*/e.isLocal = false//));
  },

  /**
   * Apply Yjs events to slate
   */
  applyYjsEvents: (e: YjsEditor, events: Y.YEvent[]): void => {
    // do not change isRemote flag for no-op case.
    const wasRemote = e.isRemote;
    e.isRemote = true;

    const slateOps = toSlateOps(events, e)
    console.log('translated yjs update events to slate ops:', events, slateOps)
    const applyRemoteOpsToSlate = () => {
      let opCount = e.operations.length
      Editor.withoutNormalizing(e, () => {
        slateOps.forEach((o: Operation) => {
          e.apply(o)
        })
        opCount = e.operations.length
        //e.onCursor && e.onCursor(updated.cursors)
      })
      if (e.operations.length > opCount) {
        // XXX: there are some normalization operations happened
        //      make sure we apply it to remote (automerge doc)
        const localOps = e.operations.slice(opCount)
        Promise.resolve().then(() => {
          // delay the local op apply to avoid dead loop caused by observeDeep
          YjsEditor.applySlateOps(e, localOps)
        })
      }
    }

    const preserveExternalHistory = false
    if (HistoryEditor.isHistoryEditor(e) && !preserveExternalHistory) {
      HistoryEditor.withoutSaving(e, applyRemoteOpsToSlate)
    } else {
      applyRemoteOpsToSlate()
    }

    if (slateOps.length > 0) {
      // XXX: only schedule set isRemote false when we did scheduled onChange by apply.
      Promise.resolve().then(_ => (e.isRemote = false))
    } else {
      e.isRemote = wasRemote
    }
  },
};

export function withYjs<T extends Editor>(
  editor: T,
  ydoc: Y.Doc,
  sharedTypeKey: string = 'content',
  originId: any,  // false to disable yjs undo manager
): T & YjsEditor {
  const e = editor as T & YjsEditor;

  e.isRemote = false;
  e.isLocal = false;
  e.remoteUpdated = false;

  e.localYDoc = new Y.Doc()
  e.remoteYDoc = ydoc
  //e.remoteSharedType = sharedType

  let initialSynced = false;

  e.sharedType = e.localYDoc.getArray(sharedTypeKey)
  e.sharedType.observeDeep((events) => {
    if (!e.isLocal && initialSynced) {
      YjsEditor.applyYjsEvents(e, events);
    }
  })

  const sharedType = ydoc.getArray(sharedTypeKey)

  let initialSynceScheduled = false;
  const scheduleInitialSync = (source = 'init') => {
    if (initialSynceScheduled || !sharedType.length) {
      return;
    }
    initialSynceScheduled = true;
    console.log('schedule synchronizeValue source:', source)
    setTimeout(() => {
      YjsEditor.synchronizeValue(e);
      initialSynced = true;
      e.remoteUpdated = false;  // reset remote any updated flag.
    })
  }
  setTimeout(scheduleInitialSync)

  const applyRemoteUpdate = () => {
    if (!e.remoteUpdated) {
      console.log('ignore applyRemoteUpdate call due to remote updated flag is false')
      return;
    }
    console.log('batch apply yjs remote update ...')
    // state of last: e.localYjsStateVector
    // we need figure out updates since e.localYjsStateVector
    // then somehow apply it to slate.
    const remoteUpdate = Y.encodeStateAsUpdate(e.remoteYDoc, e.localYjsStateVector)
    //Y.applyUpdate(e.localYDoc, remoteUpdate)
    if (remoteUpdate && remoteUpdate.length) {
      e.receiveOperation(remoteUpdate)
    }
    // XXX: how do we get slate ops from the remote Update?? apply them again on the other ydoc?
    e.remoteUpdated = false;
  }
  const throttledApplyRemoteUpdate = _.throttle(applyRemoteUpdate, 250, {leading: false})

  sharedType.observeDeep(() => {
    !initialSynceScheduled && scheduleInitialSync('remote update')
    if (!e.isLocal && !e.isUndoRedo) {
      console.log('schedule yjs remote update')
      e.remoteUpdated = true;
      if (e.children.length === 0) {
        setTimeout(applyRemoteUpdate)
      } else {
        throttledApplyRemoteUpdate()
      }
    }
  });

  e.receiveOperation = () => {
    // use current newest update.
    const remoteUpdate = Y.encodeStateAsUpdate(e.remoteYDoc, e.localYjsStateVector)
    Y.applyUpdate(e.localYDoc, remoteUpdate)
    e.localYjsStateVector = Y.encodeStateVector(e.localYDoc)
  }

  const { onChange } = editor;

  e.onChange = () => {
    if (!e.isRemote) {
      YjsEditor.applySlateOps(e, e.operations, e.originId);
    }

    if (onChange) {
      onChange();
    }
  };

  e.originId = null
  if (originId !== false) {
    e.originId = originId || e.localYDoc.clientID

    e.undoManager = new Y.UndoManager(e.sharedType, {
      trackedOrigins: new Set([e.originId])
    })

    e.undo = () => {
      console.log('undoManager undo')
      e.isUndoRedo = true
      const localYjsStateVector = Y.encodeStateVector(e.localYDoc)

      e.undoManager.undo()

      console.log('after undo')
      const undoUpdate = Y.encodeStateAsUpdate(e.localYDoc, localYjsStateVector)
      // now localYDoc updated, the update events will be translated to remote update then apply to local slate.
      // but how do we apply the update to remote doc?

      e.localYjsStateVector = Y.encodeStateVector(e.localYDoc)

      if (undoUpdate && undoUpdate.length) {
        Y.applyUpdate(e.remoteYDoc, undoUpdate)
      }

      // eslint-disable-next-line no-return-assign
      /*Promise.resolve().then(() => (*/e.isUndoRedo = false//));
    }

    e.redo = () => {
      console.log('undoManager redo')
      e.isUndoRedo = true
      const localYjsStateVector = Y.encodeStateVector(e.localYDoc)

      e.undoManager.redo()

      console.log('after redo')
      const redoUpdate = Y.encodeStateAsUpdate(e.localYDoc, localYjsStateVector)
      // now localYDoc updated, the update events will be translated to remote update then apply to local slate.
      // but how do we apply the update to remote doc?

      e.localYjsStateVector = Y.encodeStateVector(e.localYDoc)

      if (redoUpdate && redoUpdate.length) {
        Y.applyUpdate(e.remoteYDoc, redoUpdate)
      }

      // eslint-disable-next-line no-return-assign
      /*Promise.resolve().then(() => (*/e.isUndoRedo = false//));
    }
  }

  return e;
}
