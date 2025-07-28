import {
    TFunction,
    TIfStatement,
    TImport,
    TokenDefault,
    TTryCatchStatement,
    TVarReassign,
    TWhileLoop,
} from "./types";
import * as vscode from "vscode";
import { arrayEquals, tokenize } from "./utils";
import path from "path";
import { MultiMap } from "./mmap";

type Parameters = {
    paramName: string;
    required: boolean;
};

export type ToolHover = {
    range: [number, number];
    token: TokenDefault;
    tooltip: string;
    name: string;
    type: "func" | "var" | "param" | "param?" | "reassigned";
    fParams?: Parameters[];
};

export type File = {
    tokens: TokenDefault[];
    registerees: MultiMap<string, ToolHover>;
};

/**
 * Holds all the hovers/tooltip/autocomplete info for each file
 * Does not include autocompletions for things like keywords or blocks.
 */
export const files: Map<string, File> = new Map();

export async function register(file: vscode.TextDocument, tks: TokenDefault[]) {
    let f: File | undefined = files.get(file.fileName);
    if (f != undefined && arrayEquals(f.tokens, tks)) return;

    f = {
        tokens: tks,
        registerees: await tokenizeFile(file.fileName, tks),
    };

    files.set(file.fileName, f);
}

export async function tokenizeFile(
    filePath: string,
    tks: TokenDefault[],
    range: [number, number] = [-1, -1]
): Promise<MultiMap<string, ToolHover>> {
    let out: MultiMap<string, ToolHover> = new MultiMap();
    for (const token of tks) {
        switch (token.type) {
            case "TVarReassign": {
                let reassign: TVarReassign = token as TVarReassign;
                function predicate(
                    value: ToolHover,
                    index?: number,
                    array?: ToolHover[]
                ): boolean {
                    return (
                        value.range[0] <= range[0] && value.range[1] >= range[1]
                    );
                }
                let newMmap: MultiMap<string, ToolHover> = Object.assign(
                    {},
                    out
                ).filter((key, values) => {
                    if (key !== reassign.name) return false;
                    let tool: ToolHover[] = values.filter(predicate);
                    return tool.length > 0;
                });

                if (newMmap.size() == 0) break;

                let t = newMmap.get(reassign.name)[0];
                t.type = "reassigned";

                out.replaceWhere(reassign.name, predicate, t);
            }
            case "TBooleanVar":
            case "TUnknownVar":
            case "TNumberVar":
            case "TStringVar":
            case "TArrayVar": {
                out.add(token.name, {
                    range,
                    token,
                    tooltip: token.toolTip,
                    name: token.name,
                    type: "var",
                });
                break;
            }
            case "TFunction": {
                let func: TFunction = token as TFunction;
                out.add(token.name.replace("F~", ""), {
                    range,
                    token,
                    tooltip: token.toolTip,
                    name: token.name.replace("F~", ""),
                    type: "func",
                    fParams: functionParams(func, out),
                });
                out.addAll(
                    await tokenizeFile(filePath, func.body.lines, [
                        func.body.lineNumber,
                        func.body.lineEnd,
                    ])
                );
                break;
            }
            case "TIfStatement": {
                let ifs: TIfStatement = token as TIfStatement;
                out.addAll(
                    await tokenizeFile(filePath, ifs.body.lines, [
                        ifs.body.lineNumber,
                        ifs.body.lineEnd,
                    ]),
                    await tokenizeFile(filePath, ifs.elseBody.lines, [
                        ifs.elseBody.lineNumber,
                        ifs.elseBody.lineEnd,
                    ])
                );
                for (const ifz of ifs.elseIfs) {
                    out.addAll(
                        await tokenizeFile(filePath, ifz.body.lines, [
                            ifz.body.lineNumber,
                            ifz.body.lineEnd,
                        ])
                    );
                }
                break;
            }
            case "TTryCatchStatement": {
                let tryc: TTryCatchStatement = token as TTryCatchStatement;
                out.addAll(
                    await tokenizeFile(filePath, tryc.try.lines, [
                        tryc.try.lineNumber,
                        tryc.try.lineEnd,
                    ]),
                    await tokenizeFile(filePath, tryc.catch.lines, [
                        tryc.catch.lineNumber,
                        tryc.catch.lineEnd,
                    ])
                );
                break;
            }
            case "TForLoop":
            case "TWhileLoop": {
                let tw: TWhileLoop = token as TWhileLoop;
                out.addAll(
                    await tokenizeFile(filePath, tw.body.lines, [
                        tw.body.lineNumber,
                        tw.body.lineEnd,
                    ])
                );
                break;
            }
            case "TImport": {
                let imp: TImport = token as TImport;
                if (imp.filePath.includes("jaiva")) {
                    break;
                }
                let p: string;
                if (path.isAbsolute(imp.filePath)) {
                    p = imp.filePath;
                } else {
                    p = path.resolve(path.parse(filePath).dir, imp.filePath);
                }

                out.addAll(
                    imp.symbols.length > 0
                        ? (
                              await tokenizeFile(
                                  p,
                                  (await tokenize(p)) ?? [],
                                  range
                              )
                          ).filter((key) => imp.symbols.includes(key))
                        : await tokenizeFile(
                              p,
                              (await tokenize(p)) ?? [],
                              range
                          )
                );
            }
        }
    }
    return out;
}

function functionParams(
    func: TFunction,
    out: MultiMap<string, ToolHover>
): Parameters[] {
    let params: Parameters[] = [];
    for (let i = 0; i < func.args.length; i++) {
        out.add(func.args[i], {
            range: [func.body.lineNumber, func.body.lineEnd - 1],
            token: func,
            tooltip: func.toolTip,
            name: func.args[i],
            type: func.isArgOptional[i] ? "param?" : "param",
        });
        params.push({
            paramName: func.args[i],
            required:
                func.isArgOptional[i] === "true"
                    ? false
                    : func.isArgOptional[i] === "false"
                    ? true
                    : !(func.isArgOptional[i] as boolean),
        });
    }
    return params;
}
