export interface DebuggerLogItem {
  message: string | number | Record<string, unknown> | Array<unknown>;
  line?: number;
  column?: number;
}

export interface DebuggerLog {
  type: string;
  args: Array<DebuggerLogItem>;
}

export interface SrcDoc {
  html: string;
  js: string;
  css: string;
}

export interface CustomWidgetBuilderContextValueType {
  //Custom widget name
  name: string;

  isReferenceOpen: boolean;
  selectedLayout: string;

  //Compiled src doc
  srcDoc: SrcDoc;

  //unCompiled src doc
  uncompiledSrcDoc: SrcDoc;
  model: Record<string, unknown>;
  events: Record<string, string>;
  key: number;
  lastSaved?: number;

  //the version of uncompiledSrcDoc when the builder is opened.
  // used to revert the changes made in current session.
  initialSrcDoc?: SrcDoc;

  //Array of logs to show on the debugger section
  debuggerLogs: Array<DebuggerLog>;
}

export interface CustomWidgetBuilderContextFunctionType {
  toggleReference: () => void;
  selectLayout: (layout: string) => void;
  close: () => void;
  update: (editor: string, value: string) => void;
  updateModel: (model: Record<string, unknown>) => void;
  bulkUpdate: (srcDoc: CustomWidgetBuilderContextValueType["srcDoc"]) => void;
  updateDebuggerLogs: (log: { type: string; args: any }) => void;
  clearDegbuggerLogs: () => void;
}

export interface CustomWidgetBuilderContextType
  extends CustomWidgetBuilderContextValueType,
    CustomWidgetBuilderContextFunctionType {}
