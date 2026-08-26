import * as v from "vscode";
import * as j from "./jaiva/jaiva";
import * as t from "./jaiva/tokens/types";

export class AllHandler {
    public diagnosticCollection: v.DiagnosticCollection;
    public shared: j.SharedValues;
    public cli: j.JaivaCLI;
    public completions: Completions = new Completions();
    private version: string;

    private debounceTimer?: NodeJS.Timeout;

    constructor(
        version: string,
        shared: j.SharedValues,
        cli: j.JaivaCLI,
        diagnosticCollection: v.DiagnosticCollection,
    ) {
        this.version = version;
        this.diagnosticCollection = diagnosticCollection;
        this.shared = shared;
        this.cli = cli;
    }

    public begin(vscode: typeof v, context: v.ExtensionContext) {
        vscode.workspace.onDidOpenTextDocument(() => this.docParse);
        vscode.workspace.onDidChangeTextDocument((event) => {
            this.docParse(event.document);
        });
        const handler = this;
        vscode.languages.registerCompletionItemProvider("jaiva", {
            provideCompletionItems(document, pos) {
                console.log("sd");
                return handler.completions.provide(
                    handler.shared,
                    document,
                    pos,
                );
            },
        });
    }

    private docParse(doc: v.TextDocument) {
        if (doc.languageId !== "jaiva") return;

        console.log("son.");

        if (doc.isUntitled) {
            return;
        }

        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            const current = this.shared.read();

            void (async () => {
                const out = await this.cli.call([doc.uri.fsPath]);

                this.shared.write(out);

                console.log("parsed.");
            })();
        }, 1000); // 1 second
    }
}

class Completions {
    constructor() {}

    public provide(
        shared: j.SharedValues,
        document: v.TextDocument,
        position: v.Position,
    ): v.CompletionItem[] {
        const completions: v.CompletionItem[] = [];

        const tokens = shared.read();

        tokens.forEach((token) => {
            if (token.name === "roo") console.log("D");
            if (
                token.type === "TFunction" ||
                [
                    "TUnknownScalar",
                    "TBooleanVar",
                    "TStringVar",
                    "TArrayVar",
                    "TNumberVar",
                ].includes(token.type)
            ) {
                const lineNumber: number = position.line;

                if (token.within !== -1)
                    if (
                        token.within[0] < lineNumber &&
                        token.within[1] > lineNumber
                    )
                        return;

                let completionItem: v.CompletionItem;
                if (token.type === "TFunction") {
                    const fn = token as t.TFunction;
                    const funcName = token.name.slice(2);
                    let args: string[] = [];
                    for (let i = 0; i < fn.args.length; i++) {
                        const argument = fn.args[i];
                        if (fn.isArgOptional[i]) {
                            args.push("${" + (i + 1) + ":[" + argument + "?]}");
                        } else {
                            args.push("${" + (i + 1) + ":" + argument + "}");
                        }
                    }
                    const completionString =
                        funcName + "(" + args.join(", ") + ")$0";
                    completionItem = new v.CompletionItem(
                        funcName,
                        v.CompletionItemKind.Function,
                    );
                    completionItem.insertText = new v.SnippetString(
                        completionString,
                    );
                } else {
                    completionItem = new v.CompletionItem(
                        token.name,
                        v.CompletionItemKind.Variable,
                    );
                    if (
                        t.hasPropertyOf<t.FunctionArgument>(
                            token,
                            "argumentType",
                        )
                    ) {
                        if (token.argumentType === "F~") {
                            completionItem.insertText = new v.SnippetString(
                                token.name + "($0)",
                            );
                        }
                    }
                }
                completionItem.documentation = new v.MarkdownString(
                    t.docsToMarkdown(token),
                );

                completions.push(completionItem);
            }
        });

        return completions;
    }
}

class Error {}
