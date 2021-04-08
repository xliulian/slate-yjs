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
    });

    // onChange expect valid doc, we make sure do normalization before that.
    Editor.normalize(e, { force: true });
    e.onChange();
  },

  /**
   * Apply slate ops to Yjs
   */
  applySlateOps: (e: YjsEditor, operations: Operation[]): void => {
    //invariant(e.sharedType.doc, 'shared type is not bound to a document');

    e.isLocal = true;

    e.localYjsStateVector = Y.encodeStateVector(e.localYDoc)
    e.localYDoc.transact(() => {
      applySlateOps(e.sharedType, operations);
    });
    const localUpdate = Y.encodeStateAsUpdate(e.localYDoc, e.localYjsStateVector)
    e.localYjsStateVector = Y.encodeStateVector(e.localYDoc)

    if (localUpdate && localUpdate.length) {
      Y.applyUpdate(e.remoteYDoc, localUpdate)
    }

    // eslint-disable-next-line no-return-assign
    Promise.resolve().then(() => (e.isLocal = false));
  },

  /**
   * Apply Yjs events to slate
   */
  applyYjsEvents: (e: YjsEditor, events: Y.YEvent[]): void => {
    // do not change isRemote flag for no-op case.
    const wasRemote = e.isRemote;
    e.isRemote = true;

    const slateOps = toSlateOps(events, e.children)
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
        YjsEditor.applySlateOps(e, e.operations.slice(opCount));
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
  sharedType: SharedType
): T & YjsEditor {
  const e = editor as T & YjsEditor;

  e.isRemote = false;
  e.isLocal = false;
  e.remoteUpdated = false;

  e.localYDoc = new Y.Doc()
  e.remoteYDoc = sharedType.doc!
  //e.remoteSharedType = sharedType

  let initialSynced = false;

  e.sharedType = e.localYDoc.getArray('content')
  e.sharedType.observeDeep((events) => {
    if (!e.isLocal && initialSynced) {
      YjsEditor.applyYjsEvents(e, events);
    }
  })

  let initialSynceScheduled = false;
  const scheduleInitialSync = () => {
    if (initialSynceScheduled || !sharedType.length) {
      return;
    }
    initialSynceScheduled = true;
    console.log('schedule synchronizeValue')
    setTimeout(() => {
      YjsEditor.synchronizeValue(e);
      initialSynced = true;
    })
  }
  setTimeout(scheduleInitialSync)

  const applyRemoteUpdate = () => {
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
  const throttledApplyRemoteUpdate = _.throttle(applyRemoteUpdate, 1000, {leading: false})

  sharedType.observeDeep(() => {
    !initialSynceScheduled && scheduleInitialSync()
    if (!e.isLocal) {
      console.log('schedule yjs remote update')
      e.remoteUpdated = true;
      if (e.children.length === 0) {
        setTimeout(applyRemoteUpdate)
      } else {
        throttledApplyRemoteUpdate()
      }
    }
  });

  e.receiveOperation = (update) => {
    Y.applyUpdate(e.localYDoc, update)
    e.localYjsStateVector = Y.encodeStateVector(e.localYDoc)
  }

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
