import * as vscode from "vscode";
import { TokenDefault } from "./types";
import { tokenize } from "./utils";
import { MultiMap } from "./mmap";
import { files, register, tokenizeFile, ToolHover } from "./registrar";

async function handleDocs(txt: vscode.TextDocument) {
    if (txt.languageId !== "jaiva") return;

    let out: TokenDefault[] = (await tokenize(txt.fileName)) ?? [];

    await register(txt, out);

    console.log(files.get(txt.fileName));
}

export function activate(context: { subscriptions: vscode.Disposable[] }) {
    console.log("Jaiva extension activated.");
    for (const doc of vscode.workspace.textDocuments) {
        handleDocs(doc);
    }
    vscode.workspace.onDidOpenTextDocument(handleDocs);
    vscode.workspace.onDidSaveTextDocument(handleDocs);
    // vscode.workspace.onDidChangeTextDocument((ch) => {
    //     handleDocs(ch.document);
    // });
    const indexCommand = vscode.commands.registerCommand(
        "jaiva.indexProject",
        async () => {
            const files = await vscode.workspace.findFiles(
                "**/*.{jiv,jaiva,jva}"
            );

            if (files.length === 0) {
                vscode.window.showInformationMessage("No Jaiva files found.");
                return;
            }

            files.forEach((file) => {
                console.log(`[Jaiva Index] Found: ${file.fsPath}`);
            });

            vscode.window.showInformationMessage(
                `Indexed ${files.length} Jaiva files.`
            );
        }
    );

    const runCommand = vscode.commands.registerCommand("jaiva.run", () => {
        // Ensure there is an active editor
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage("No active editor found.");
            return;
        }

        const filePath = editor.document.uri.fsPath;
        // Retrieve additional args from the configuration
        const config = vscode.workspace.getConfiguration("jaiva");
        const runArgs = config.get("runArgs", "");
        const command = `jaiva "${filePath}" ${runArgs}`;

        // Create or re-use an existing terminal
        let terminal =
            vscode.window.activeTerminal ||
            vscode.window.createTerminal("Jaiva!");
        terminal.show();
        terminal.sendText(command);
    });

    const hoverProvider = vscode.languages.registerHoverProvider("jaiva", {
        provideHover(document, position, token) {
            const word = document.getText(
                document.getWordRangeAtPosition(position)
            );
            const file = files.get(document.fileName);

            if (!file) return undefined;

            const tools = file.registerees.get(word);

            if (!tools || tools.length == 0) return undefined;

            const lineNumber = position.line + 1;
            // filter for tools in range
            const newTools = tools.filter((tool) => {
                (tool.range[0] == -1 && tool.range[1] == -1) ||
                    (tool.range[0] <= lineNumber &&
                        tool.range[1] >= lineNumber);
            });

            console.log(lineNumber);

            if (newTools.length == 0) return undefined;

            return new vscode.Hover(newTools[0].tooltip);

            // return undefined;
        },
    });

    context.subscriptions.push(runCommand, indexCommand, hoverProvider);

    const runStatusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        100
    );
    runStatusBarItem.text = "$(play) Run Jaiva";
    runStatusBarItem.command = "jaiva.run";
    runStatusBarItem.tooltip =
        "Run the current Jaiva file with additional arguments";
    runStatusBarItem.show();
}

export function deactivate() {}
