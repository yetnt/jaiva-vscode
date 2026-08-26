import { exec, spawn } from "child_process";
import { promisify } from "util";

import * as Tokens from "./tokens/types";
import * as JaivaLibraries from "./globals";
import { MultiMap } from "../mmap";
import { JDoc, ParameterDoc } from "./tokens/jdoc";

export { Tokens };

type Error = {
    err: string;
    type: "OH_FUCK" | "JAIVA";
};

export class SharedValues {
    private tokenList: Tokens.TokenDefault[] = [];
    private readCopy: Tokens.TokenDefault[] = [];
    private libraryMap: Map<string, JaivaLibraries.Library> = new Map();
    private definitionsMap: MultiMap<string, Tokens.TokenDefault> =
        new MultiMap();

    constructor() {}

    public loadLibraries(
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
        ];

        globals.forEach((lib) => {
            const load = JaivaLibraries.load(lib, context);
            console.log("Loaded " + lib);

            if (load.version !== vers) {
                console.log(
                    "Expected " +
                        lib +
                        " to be of version " +
                        vers +
                        ". Instead got " +
                        load.version,
                );
                return;
            }

            this.libraryMap.set(lib, load);
        });
    }

    public write(str: string): void {
        let any;
        try {
            any = JSON.parse(str);
            if (Tokens.hasPropertyOf<Error>(any, "err")) {
                console.log(any.err);
                return;
            }
        } catch (error) {
            console.log(error);
            return;
        }
        if (!str.startsWith("[")) return;

        const arr = any as any[];
        this.tokenList = this.add(-1, arr);
        this.tokenList.push(...this.loadLibraryAt("globals", -1));
        this.readCopy = [...this.tokenList];
    }

    private loadLibraryAt(
        name: string,
        range: Tokens.LineRange,
    ): Tokens.TokenDefault[] {
        return this.add(range, this.libraryMap.get(name)?.tokens ?? []);
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
                return [
                    {
                        ...tok,
                        sortText: "1_",
                    } as Tokens.SpecialToken,
                ];
            } else if (scoped.arrayVariable !== null) {
                const tok = scoped.variable as Tokens.TokenDefault;
                tok.toolTip =
                    "Colonize Loop Array Variable - Line " +
                    scoped.lineNumber +
                    "\n```jaiva\n" +
                    tok.name +
                    "\n```\n";
                tok.within = lineRange;
                const out = {
                    ...tok,
                    sortText: "1_",
                } as Tokens.SpecialToken;
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
                    const jdoc = doc as JDoc[];
                    // filter and find by arg name
                    const found = doc.find((d) => {
                        if (
                            Tokens.hasPropertyOf<ParameterDoc>(d, "type") &&
                            d.var === name
                        )
                            return d;
                    }) as ParameterDoc;
                    if (found !== undefined) {
                        str =
                            "_(From `" +
                            scoped.name +
                            "()`'s documentation)_ : " +
                            found.description;
                    }
                }

                tokens.push({
                    name,
                    lineNumber: scoped.lineNumber,
                    within: lineRange,
                    sortText: "0_",
                    argumentType: isFunction ? "F~" : "V~",
                    type: "TUnknownScalar",
                    toolTip:
                        str +
                        "\n" +
                        (!isOptional
                            ? ""
                            : "> This parameter is marked as optional. Meaning it may possibly hold a value " +
                              "of `idk`."),
                } as Tokens.FunctionArgument);
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

export class JaivaCLI {
    private child;
    private buffer = "";
    private pending: ((data: string) => void)[] = [];

    constructor() {
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
        });
    }

    async call(args: string[]): Promise<string> {
        return new Promise((resolve) => {
            this.pending.push(resolve);
            this.child.stdin.write(args.join(" ") + "\n");
        });
    }
}
