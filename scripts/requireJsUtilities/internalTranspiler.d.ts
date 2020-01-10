import ts from 'typescript';

interface InternalTranspiler {
    moduleId: string,
    transpile(
        code: string,
        transformers: ts.CustomTransformers
    ): Promise<string>;
}

const value: InternalTranspiler;
export default value;