class Command {
    name: string;
    callback: (...args: any[]) => void;
    constructor(name: string, callback: (...args: any[]) => void) {
        this.name = name;
        this.callback = callback;
    }
}

export class CommandRegistry {
    private commands: Command[] = [];
    constructor(vscode: typeof import("vscode")) {
        this.registerCommand("run", () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage("No active file to run.");
                return;
            }

            const filePath = editor.document.fileName;

            const terminal =
                vscode.window.activeTerminal || vscode.window.createTerminal();
            terminal.show();
            terminal.sendText(`jaiva "${filePath}"`);
        });
        this.registerCommand("runTokens", () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage("No active file to run.");
                return;
            }

            const filePath = editor.document.fileName;

            const terminal =
                vscode.window.activeTerminal || vscode.window.createTerminal();
            terminal.show();
            terminal.sendText(`jaiva "${filePath}" --json`);
        });
    }

    public subscribe(
        vscode: typeof import("vscode"),
        context: import("vscode").ExtensionContext,
    ) {
        this.commands.forEach((cmd) => {
            context.subscriptions.push(
                vscode.commands.registerCommand(cmd.name, cmd.callback),
            );
        });
    }

    public registerCommand(name: string, callback: (...args: any[]) => void) {
        const command = new Command("jaiva." + name, callback);
        this.commands.push(command);
    }
}
