import { isPromise } from "workers/Evaluation/JSObject/utils";
import { postJSFunctionExecutionLog } from "@appsmith/workers/Evaluation/JSObject/postJSFunctionExecution";
import TriggerEmitter, { BatchKey } from "./TriggerEmitter";
import { MAIN_THREAD_ACTION } from "@appsmith/workers/Evaluation/evalWorkerActions";
import { WorkerMessenger } from "./Messenger";
import { getEntityNameAndPropertyPath } from "@appsmith/workers/Evaluation/evaluationUtils";
import type { DataTreeJSAction } from "entities/DataTree/dataTreeFactory";

declare global {
  interface Window {
    structuredClone: (
      value: any,
      options?: StructuredSerializeOptions | undefined,
    ) => any;
  }
}
export interface JSExecutionData {
  data: unknown;
  funcName: string;
}

function saveExecutionData(name: string, data: unknown) {
  TriggerEmitter.emit(BatchKey.process_batched_fn_execution, {
    name,
    data,
  });
}

export function jsObjectFunctionFactory<P extends ReadonlyArray<unknown>>(
  fn: (...args: P) => unknown,
  name: string,
  entity: DataTreeJSAction,
  postProcessors: Array<(name: string, res: unknown) => void> = [
    saveExecutionData,
    postJSFunctionExecutionLog,
  ],
) {
  const { entityName, propertyPath } = getEntityNameAndPropertyPath(name);
  const entityMeta = entity.meta;
  const actionId = entity.actionId;
  const { confirmBeforeExecute, isAsync } = entityMeta[propertyPath];

  if (isAsync) {
    return async (...args: P) => {
      try {
        if (confirmBeforeExecute) {
          const response = await WorkerMessenger.request({
            method: MAIN_THREAD_ACTION.CONFIRM_BEFORE_EXECUTE_JS_FUNCTION,
            data: {
              entityName,
              propertyPath,
              actionId,
            },
          });

          if (!response.data.confirmed) {
            return "cancelled";
          }
        }
        return executeJsFunctionCall(fn, name, args, postProcessors);
      } catch (e) {
        postProcessors.forEach((postProcessor) => {
          postProcessor(name, undefined);
        });
        throw e;
      }
    };
  } else {
    return (...args: P) => {
      return executeJsFunctionCall(fn, name, args, postProcessors);
    };
  }
}

export function executeJsFunctionCall<P extends ReadonlyArray<unknown>>(
  fn: (...args: P) => unknown,
  name: string,
  args: P,
  postProcessors: Array<(name: string, res: unknown) => void> = [
    saveExecutionData,
    postJSFunctionExecutionLog,
  ],
) {
  try {
    const result = fn(...args);
    if (isPromise(result)) {
      result.then((res) => {
        postProcessors.forEach((p) => p(name, res));
        return res;
      });
      result.catch((e) => {
        postProcessors.forEach((p) => p(name, undefined));
        throw e;
      });
    } else {
      postProcessors.forEach((p) => p(name, result));
    }

    return result;
  } catch (e) {
    postProcessors.forEach((postProcessor) => {
      postProcessor(name, undefined);
    });
    throw e;
  }
}
