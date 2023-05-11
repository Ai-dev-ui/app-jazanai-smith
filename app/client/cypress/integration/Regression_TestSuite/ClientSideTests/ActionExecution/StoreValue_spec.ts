import { ObjectsRegistry } from "../../../../support/Objects/Registry";

const {
  AggregateHelper: agHelper,
  CommonLocators: locator,
  DeployMode: deployMode,
  EntityExplorer: ee,
  JSEditor: jsEditor,
  PropertyPane: propPane,
} = ObjectsRegistry;

describe("storeValue Action test", () => {
  before(() => {
    ee.DragDropWidgetNVerify("buttonwidget", 100, 100);
    ee.NavigateToSwitcher("explorer");
  });

  it("1. Bug 14653: Running consecutive storeValue actions and await", function () {
    const jsObjectBody = `export default {
      storeTest: () => {
        let values =
          [
            storeValue('val1', 'number 1'),
            storeValue('val2', 'number 2'),
            storeValue('val3', 'number 3'),
            storeValue('val4', 'number 4')
          ]
        return Promise.all(values)
          .then(() => {
            showAlert(JSON.stringify(appsmith.store))
        })
          .catch((err) => {
            return showAlert('Could not store values in store ' + err.toString());
          })
      }
    }`;

    jsEditor.CreateJSObject(jsObjectBody, {
      paste: true,
      completeReplace: true,
      toRun: false,
      shouldCreateNewJSObj: true,
    });

    ee.SelectEntityByName("Button1", "Widgets");
    propPane.UpdatePropertyFieldValue("Label", "");
    propPane.TypeTextIntoField("Label", "StoreTest");
    cy.get("@jsObjName").then((jsObj: any) => {
      propPane.SelectJSFunctionToExecute(
        "onClick",
        jsObj as string,
        "storeTest",
      );
    });

    deployMode.DeployApp();
    agHelper.ClickButton("StoreTest");
    agHelper.AssertContains(
      JSON.stringify({
        val1: "number 1",
        val2: "number 2",
        val3: "number 3",
        val4: "number 4",
      }),
    );
    deployMode.NavigateBacktoEditor();
  });

  it("2. Bug 14827 : Accepts paths as keys and doesn't update paths in store but creates a new field with path as key", function () {
    const DEFAULT_STUDENT_OBJECT = {
      details: { isTopper: true, name: "Abhah", grade: 1 },
    };
    const MODIFIED_STUDENT_OBJECT = {
      details: { isTopper: false, name: "Alia", grade: 3 },
    };
    const JS_OBJECT_BODY = `export default {
        storePathTest: async ()=> {
        await storeValue("student", ${JSON.stringify(
          DEFAULT_STUDENT_OBJECT,
        )}, false)
        await showAlert(JSON.stringify(appsmith.store.student));
        await storeValue("student.details.name", "Annah", false);
        await showAlert(appsmith.store.student.details.name);
        await showAlert(appsmith.store["student.details.name"]);
       },
       modifyStorePath: async ()=>{
        await storeValue("student",${JSON.stringify(
          MODIFIED_STUDENT_OBJECT,
        )} , false)
        await showAlert(JSON.stringify(appsmith.store.student));
        await storeValue("student.details.isTopper", true, false);
        await showAlert(appsmith.store.student.details.isTopper.toString());
        await showAlert(appsmith.store["student.details.isTopper"].toString());
       }
       }
   `;

    // Create js object
    jsEditor.CreateJSObject(JS_OBJECT_BODY, {
      paste: true,
      completeReplace: true,
      toRun: false,
      shouldCreateNewJSObj: true,
    });

    // Button1
    ee.SelectEntityByName("Button1", "Widgets");
    propPane.UpdatePropertyFieldValue("Label", "StorePathTest");
    cy.get(".action-block-tree").click({ force: true });
    cy.get("@jsObjName").then((jsObj: any) => {
      propPane.SelectJSFunctionToExecuteInExistingActionBlock(
        jsObj,
        "storePathTest",
      );
    });

    // Button 2
    ee.DragDropWidgetNVerify("buttonwidget", 100, 200);
    ee.SelectEntityByName("Button2", "Widgets");
    propPane.UpdatePropertyFieldValue("Label", "modifyStorePath");
    cy.get("@jsObjName").then((jsObj: any) => {
      propPane.SelectJSFunctionToExecute(
        "onClick",
        jsObj as string,
        "modifyStorePath",
      );
    });

    deployMode.DeployApp();
    agHelper.ClickButton("StorePathTest");
    agHelper.ValidateToastMessage(JSON.stringify(DEFAULT_STUDENT_OBJECT), 0, 1);
    agHelper.ValidateToastMessage(DEFAULT_STUDENT_OBJECT.details.name, 1, 2);
    agHelper.ValidateToastMessage("Annah", 2, 3);

    agHelper.WaitUntilAllToastsDisappear();
    agHelper.ClickButton("modifyStorePath");
    agHelper.ValidateToastMessage(
      JSON.stringify(MODIFIED_STUDENT_OBJECT.details),
      0,
      1,
    );
    agHelper.ValidateToastMessage(
      `${MODIFIED_STUDENT_OBJECT.details.isTopper}`,
      1,
      2,
    );
    agHelper.ValidateToastMessage(`true`, 2, 3);
    deployMode.NavigateBacktoEditor();
  });

  it("3. Bug 14827 : Accepts paths as keys and doesn't update paths in store but creates a new field with path as key - object keys", function () {
    const TEST_OBJECT = { a: 1, two: {} };

    const JS_OBJECT_BODY = `export default {
      setStore: async () => {
        await storeValue("test", ${JSON.stringify(TEST_OBJECT)}, false);
        await showAlert(JSON.stringify(appsmith.store.test));
        await storeValue("test.two",{"b":2}, false);
        await showAlert(JSON.stringify(appsmith.store.test.two));
        await showAlert(JSON.stringify(appsmith.store["test.two"]));
      },
      showStore: () =>  {
        showAlert(JSON.stringify(appsmith.store.test));}
      showStore2: () =>  {
        showAlert(JSON.stringify(appsmith.store.test2));}
    }`;

    // create js object
    jsEditor.CreateJSObject(JS_OBJECT_BODY, {
      paste: true,
      completeReplace: true,
      toRun: false,
      shouldCreateNewJSObj: true,
    });

    ee.SelectEntityByName("Button1", "Widgets");
    propPane.UpdatePropertyFieldValue("Label", "SetStore");
    cy.get(".action-block-tree").click({ force: true });
    cy.get("@jsObjName").then((jsObj: any) => {
      propPane.SelectJSFunctionToExecuteInExistingActionBlock(
        jsObj,
        "setStore",
      );
    });

    ee.SelectEntityByName("Button2", "Widgets");
    propPane.UpdatePropertyFieldValue("Label", "ShowStore");
    cy.get(".action-block-tree").click({ force: true });
    cy.get("@jsObjName").then((jsObj: any) => {
      propPane.SelectJSFunctionToExecuteInExistingActionBlock(
        jsObj,
        "showStore",
      );
    });

    deployMode.DeployApp();
    agHelper.ClickButton("SetStore");
    agHelper.ValidateToastMessage(JSON.stringify(TEST_OBJECT), 0, 1);
    agHelper.ValidateToastMessage(JSON.stringify(TEST_OBJECT.two), 1, 2);
    agHelper.ValidateToastMessage(`{"b":2}`, 2, 3);

    agHelper.ClickButton("ShowStore");
    agHelper.ValidateToastMessage(JSON.stringify(TEST_OBJECT), 0);
    deployMode.NavigateBacktoEditor();
  });
  it.only("4. Bug 23201 :Unable to set unserialized objects using store value", function () {
    const TEST_OBJECT_2 = { a: 1, two: () => console.log("Hello world!") };

    const JS_OBJECT_BODY = `export default {
      setStore2: async () => {
        await storeValue("test2", ${JSON.stringify(TEST_OBJECT_2)}, false);
        await showAlert(JSON.stringify(appsmith.store.test2));
        await storeValue("test2.two",{"b":2}, false);
        await showAlert(JSON.stringify(appsmith.store.test2.two));
        await showAlert(JSON.stringify(appsmith.store["test2.two"]));
      },
      showStore: () =>  {
        showAlert(JSON.stringify(appsmith.store.test));}
      showStore2: () =>  {
        showAlert(JSON.stringify(appsmith.store.test2));}
    }`;

    // create js object
    jsEditor.CreateJSObject(JS_OBJECT_BODY, {
      paste: true,
      completeReplace: true,
      toRun: false,
      shouldCreateNewJSObj: true,
    });

    //Button3
    ee.DragDropWidgetNVerify("buttonwidget", 100, 200);
    ee.SelectEntityByName("Button3", "Widgets");
    propPane.UpdatePropertyFieldValue("Label", "SetStore2");
    cy.get(".action-block-tree").click({ force: true });
    cy.get("@jsObjName").then((jsObj: any) => {
      propPane.SelectJSFunctionToExecuteInExistingActionBlock(
        jsObj,
        "setStore2",
      );
    });

    //Button4
    ee.DragDropWidgetNVerify("buttonwidget", 100, 200);
    ee.SelectEntityByName("Button4", "Widgets");
    propPane.UpdatePropertyFieldValue("Label", "ShowStore2");
    cy.get(".action-block-tree").click({ force: true });
    cy.get("@jsObjName").then((jsObj: any) => {
      propPane.SelectJSFunctionToExecuteInExistingActionBlock(
        jsObj,
        "showStore2",
      );
    });

    deployMode.DeployApp();

    agHelper.ClickButton("SetStore2");
    agHelper.ValidateToastMessage(JSON.stringify(TEST_OBJECT_2), 0, 1);
    agHelper.ValidateToastMessage(JSON.stringify(TEST_OBJECT_2.two), 1, 2);
    agHelper.ValidateToastMessage(`{"b":2}`, 2, 3);

    agHelper.ClickButton("ShowStore2");
    agHelper.ValidateToastMessage(JSON.stringify(TEST_OBJECT_2), 0);
    deployMode.NavigateBacktoEditor();
  });
});
