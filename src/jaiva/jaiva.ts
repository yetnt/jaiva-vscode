import { spawn } from "child_process";

import * as Tokens from "./tokens/types";
import * as JaivaLibraries from "./globals";
import { MultiMap } from "../mmap";
import * as Docs from "./tokens/jdoc";
import { Diagnostics } from "../vscodeWrapper";
import * as vscode from "vscode";

export { Tokens, JaivaLibraries, Docs };

export type ExtensionError = {
    err: string;
    type: "OH_FUCK" | "JAIVA";
};

class Base {
    private d: Diagnostics | null = null;

    public uses(d: Diagnostics) {
        this.d = d;
    }

    protected getDiagnostics(): Diagnostics | null {
        return this.d;
    }
}

export class SharedValues extends Base {
    private tokenList: Tokens.TokenDefault[] = [];
    private readCopy: Tokens.TokenDefault[] = [];
    private libraryMap: Map<string, JaivaLibraries.Library> = new Map();
    public definitionsMap: MultiMap<string, Tokens.TokenDefault> =
        new MultiMap();

    constructor() {
        super();
    }

    public loadLibraries(
        vscode: typeof import("vscode"),
        vers: string,
        context: import("vscode").ExtensionContext,
    ): void {
        const globals = [
            "globals",
            "debug",
            "math",
            "types",
            "math/utils",
            "file",
            "arrays",
            "time",
            "time/zone",
        ];

        globals.forEach((lib) => {
            const load = JaivaLibraries.load(lib, context);
            console.log("Loaded " + lib);

            if (load.version !== vers) {
                const str =
                    "Expected " +
                    lib +
                    " to be of version " +
                    vers +
                    ". Instead got " +
                    load.version;
                vscode.window.showInformationMessage(str + ".");
                return;
            }

            this.libraryMap.set(lib, load);
        });
    }

    public write(doc: vscode.TextDocument, str: string): void {
        let any;
        try {
            any = JSON.parse(str);
            if (Tokens.hasPropertyOf<ExtensionError>(any, "err")) {
                if (this.getDiagnostics()) {
                    this.getDiagnostics()?.err(doc, any);
                }
                return;
            }
        } catch (error) {
            console.log(error);
            return;
        }
        if (!str.startsWith("[")) return;

        const arr = any as any[];
        this.tokenList = this.add(-1, arr);
        this.tokenList.push(...this.loadLibraryAt(null, "globals", -1));
        this.readCopy = [...this.tokenList];
    }

    private loadLibraryAt(
        importTok: null | Tokens.ImportToken,
        name: string,
        range: Tokens.LineRange,
    ): Tokens.TokenDefault[] {
        var tokens = this.libraryMap.get(name)?.tokens ?? [];
        if (importTok !== null) {
            const str = "\n\n_Imported from " + importTok.fileName + "_";
            (tokens as Tokens.TokenDefault[]).forEach((t) => {
                t = {
                    ...t,
                    importedFromLine: importTok.lineNumber,
                } as Tokens.TokenDefault & Tokens.ImportedFrom;
                if (typeof t.toolTip === "string") {
                    if (!t.toolTip.includes(str)) t.toolTip += "\n" + str;
                } else {
                    const arr = t.toolTip;
                    let doc = arr.find((c) => {
                        if (c.tagType === "GENERIC") return c;
                    });
                    if (doc == undefined) {
                        doc = {
                            tagType: "GENERIC",
                            description: str,
                        } as Docs.GenericDoc;
                    } else {
                        if (!(doc as Docs.GenericDoc).description.includes(str))
                            (doc as Docs.GenericDoc).description += "\n" + str;
                    }
                }
            });
        }
        return this.add(range, tokens);
    }

    private add(
        parentRange: Tokens.LineRange,
        arr: any[],
    ): Tokens.TokenDefault[] {
        const tokens: Tokens.TokenDefault[] = [];
        for (const token of arr) {
            if (Tokens.hasPropertyOf<Tokens.TokenDefault>(token, "type")) {
                const out = Tokens.toScopedToken(token);
                if (out === null) {
                    // normal token. cast and add.
                    if (Tokens.isTheTokensWeNeed(token)) {
                        token.within = parentRange;
                        tokens.push(token);

                        if (
                            Tokens.hasPropertyOf<Tokens.ImportToken>(
                                token,
                                "isLib",
                            )
                        ) {
                            // check if is a isLib is true
                            if (token.isLib) {
                                tokens.push(
                                    ...this.loadLibraryAt(
                                        token,
                                        token.fileName,
                                        parentRange,
                                    ),
                                );
                            }
                        }
                    }
                } else {
                    const [scoped, otherTokens] = out;
                    scoped.within = parentRange;
                    tokens.push(scoped);
                    const arr2 = this.add(
                        [scoped.lineNumber, scoped.lineEnd],
                        otherTokens,
                    );
                    tokens.push(...arr2);
                    const other = this.others(scoped, [
                        scoped.lineNumber,
                        scoped.lineEnd,
                    ]);
                    tokens.push(...other);
                }

                this.definitionsMap.add(
                    token.type === "TFunction"
                        ? token.name.slice(2)
                        : token.name,
                    token,
                );
            }
        }
        return tokens;
    }

    private others(
        scoped: Tokens.ScopedToken,
        lineRange: Tokens.LineRange,
    ): Tokens.TokenDefault[] {
        if (Tokens.hasPropertyOf<Tokens.TForLoop>(scoped, "variable")) {
            // TForLoop contributes a variable to the scope. We need to add that variable to the list of tokens.
            // contributes iterator
            if (scoped.arrayVariable === null) {
                const tok = scoped.variable as Tokens.TokenDefault;
                tok.toolTip =
                    "Colonize Loop Iterator Variable - Line " +
                    scoped.lineNumber +
                    "\n```jaiva\n" +
                    tok.name +
                    "\n```\n";
                tok.within = lineRange;
                const special: Tokens.SpecialToken = {
                    ...tok,
                    sortText: "1_",
                };
                this.definitionsMap.add(special.name, special);
                return [special];
            } else if (scoped.arrayVariable !== null) {
                const tok = scoped.variable as Tokens.TokenDefault;
                tok.toolTip =
                    "Colonize Loop Array Variable - Line " +
                    scoped.lineNumber +
                    "\n```jaiva\n" +
                    tok.name +
                    "\n```\n";
                tok.within = lineRange;
                const out: Tokens.SpecialToken = {
                    ...tok,
                    sortText: "1_",
                };
                this.definitionsMap.add(out.name, out);
                return [out];
            }
        } else if (Tokens.hasPropertyOf<Tokens.TFunction>(scoped, "args")) {
            const tokens: Tokens.TokenDefault[] = [];
            // try to find the arg docs in JDoc
            // add the arguments of the function
            scoped.args.forEach((arg, index) => {
                const isFunction = arg.startsWith("F~");
                const isOptional = scoped.isArgOptional[index];
                const name = isFunction ? arg.slice(2) : arg;

                const doc = scoped.toolTip;
                let str =
                    "Function parameter of " +
                    scoped.name +
                    " on line " +
                    scoped.lineNumber;
                if (typeof doc !== "string") {
                    const jdoc = doc as Docs.JDoc[];
                    // filter and find by arg name
                    const found = doc.find((d) => {
                        if (
                            Tokens.hasPropertyOf<Docs.ParameterDoc>(
                                d,
                                "tagType",
                            ) &&
                            d.var === name
                        )
                            return d;
                    }) as Docs.ParameterDoc;
                    if (found !== undefined) {
                        str =
                            "_(From `" +
                            scoped.name +
                            "()`'s documentation)_ : " +
                            found.description;
                    }
                }

                const argument: Tokens.FunctionArgument = {
                    name,
                    lineNumber: scoped.lineNumber,
                    within: lineRange,
                    sortText: "0_",
                    argumentType: isFunction
                        ? "F~"
                        : scoped.varArgs
                          ? "<-"
                          : "V~",
                    type: "TUnknownScalar",
                    toolTip:
                        str +
                        "\n" +
                        (!isOptional
                            ? ""
                            : "> This parameter is marked as optional. Meaning it may possibly hold a value " +
                              "of `idk`."),
                };
                this.definitionsMap.add(argument.name, argument);
                tokens.push(argument);
            });
            return tokens;
        }
        return [];
    }

    public read(): Tokens.TokenDefault[] {
        return this.readCopy;
    }

    public getLibrary(name: string): JaivaLibraries.Library | undefined {
        return this.libraryMap.get(name);
    }
}

export class JaivaCLI extends Base {
    private child;
    private buffer = "";
    private pending: ((data: string) => void)[] = [];

    constructor() {
        super();
        this.child = spawn("jaiva", ["--json-stream"], { shell: true });

        this.child.stdout.on("data", (chunk) => {
            this.buffer += chunk.toString();

            // Example: assume each response ends with a newline
            let lines = this.buffer.split("\n");
            this.buffer = lines.pop() || ""; // keep incomplete line

            for (const line of lines) {
                const resolver = this.pending.shift();
                if (resolver) resolver(line);
            }
        });

        this.child.stderr.on("data", (chunk) => {
            console.error("Jaiva STDERR:", chunk.toString());
        });

        this.child.on("error", (err) => {
            console.error("Jaiva process error:", err);
        });

        this.child.on("close", (code) => {
            console.log(`Jaiva exited with code ${code}`);
            if (code != 0) {
                vscode.window
                    .showErrorMessage(
                        "Jaiva crashed! Please reload your window",
                        "Reload",
                    )
                    .then((sel) => {
                        if ((sel = "Reload")) {
                            vscode.commands.executeCommand(
                                "workbench.action.reloadWindow",
                            );
                        }
                    });
            }
        });
    }

    async call(args: string[]): Promise<string> {
        return new Promise((resolve) => {
            this.pending.push(resolve);
            this.child.stdin.write(args.join(" ") + "\n");
        });
    }
}
