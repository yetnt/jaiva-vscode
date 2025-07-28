import { exec } from "child_process";
import { TokenDefault } from "./types";

export function cliRun(cmd: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) return reject(error);
            if (stderr) return reject(new Error(stderr));
            resolve(stdout.trim());
        });
    });
}

export function runJaiva(...args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
        cliRun(`jaiva ${args.join(" ")}`)
            .then((val) => {
                resolve(val);
            })
            .catch((reason) => reject(reason));
    });
}

export async function tokenize(file: string) {
    try {
        let out: string = await runJaiva(file, "-j");

        if (!out.startsWith("[") && !out.endsWith("]")) return undefined;

        let tokens: TokenDefault[] = JSON.parse(out);

        return tokens;
    } catch (e) {
        console.error(e);
        return undefined;
    }
}

export function arrayEquals(arr1: any[], arr2: any[]) {
    return JSON.stringify(arr1) === JSON.stringify(arr2);
}
