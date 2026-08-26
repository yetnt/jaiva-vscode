import * as T from "./tokens/types";
import * as fs from "fs";
import * as path from "path";

export type Library = {
    version: string;
    tokens: any[];
};

export type LoadedLibrary = {
    tokens: T.TokenDefault[];
};

export function load(
    file: string,
    context: import("vscode").ExtensionContext,
): Library {
    if (file === "math/utils") file = "math-utils";
    const f = path.join(context.extensionPath, "data", file + ".json");

    const content = fs.readFileSync(f, "utf-8");
    const data = JSON.parse(content) as Library;

    return data;
}
