import * as vscode from "vscode";
import * as jaiva from "./jaiva/jaiva";
import * as wrapFr from "./vscodeWrapper";
import { CommandRegistry } from "./commands";
// import { MultiMap } from "./mmap";

const VERSION = "6.0.0";

export function activate(context: vscode.ExtensionContext) {
    console.log("JAIVA VSCODE IS ACTIVE!!");

    const collection = vscode.languages.createDiagnosticCollection("jaiva");
    const diagnostics = new wrapFr.Diagnostics(collection);

    // Register commands
    const commandRegistry = new CommandRegistry(vscode);
    commandRegistry.subscribe(vscode, context, diagnostics);

    const values = new jaiva.SharedValues();
    const cli = new jaiva.JaivaCLI();

    const handler = new wrapFr.AllHandler(VERSION, values, cli, diagnostics);
    values.loadLibraries(vscode, VERSION, context);

    handler.begin(vscode, context);

    if (vscode.window.activeTextEditor?.document) {
        handler.docParse(vscode.window.activeTextEditor?.document);
        handler.diagnostics.show(vscode.window.activeTextEditor?.document);
    }
}
