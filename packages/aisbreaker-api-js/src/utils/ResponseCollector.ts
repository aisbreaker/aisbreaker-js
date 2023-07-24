import { ResponseEvent, Output, Request, OutputText, OutputImage } from '../api/models/index.js'

/**
 * Collect all streamed ReponseEvents to create a FinalResponse at the end
 */
export class ResponseCollector {
    private responseEvents: ResponseEvent[] = [];
    private startTime = Date.now();
    /** service specific engine/model ID */
    lastObservedEngineId: string | undefined;

    constructor(public request: Request) {
    }

    addResponseEvent(responseEvent: ResponseEvent) {
        this.responseEvents.push(responseEvent);
    }

    /* NOT NEEDED? TODO DELETE
    getMaxOutputIndex(): number {
        let maxOutputIndex = -1
        for (const responseEvent of this.responseEvents) {
            if (responseEvent.outputs) {
                for (const output of responseEvent.outputs) {
                    if (output.text) {
                        if (output.text.index > maxOutputIndex) {
                            maxOutputIndex = output.text.index
                        }
                    } else if (output.image) {
                        if (output.image.index > maxOutputIndex) {
                            maxOutputIndex = output.image.index
                        }
                    }
                }
            }
        }
        return maxOutputIndex
    }
    */
    private setOrAppendSingleOutput(output: Output, outputs: Output[]): Output[] {
        if (output.text) {
            const text = output.text;
            const index = text.index || 0;
            const role = text.role;

            if (text.content) {
                var content = text.content || '';
                if (text.isDelta) {
                    // aggregate
                    const previousContent = outputs[index]?.text?.content || '';
                    content = previousContent + content;

                    // save aggregated
                    const aggregatedOutputText: OutputText = {
                        index: index,
                        role: role,
                        content: content,
                        isDelta: false,
                        isProcessing: false,
                    };
                    outputs[index] = { text: aggregatedOutputText };
                } else {
                    // no delta, just save
                    const aggregatedOutputText: OutputText = {
                        index: index,
                        role: role,
                        content: content,
                        isDelta: false,
                        isProcessing: false, // because it's for the final response
                    };
                    outputs[index] = { text: aggregatedOutputText };
                }
            } else {
                // no content, nothing to do here
            }

        } else if (output.image) {
            // just save
            const image = output.image;
            const index = image.index || 0;
            const role = image.role;
            const outputImage: OutputImage = {
                index: index,
                role: role,
                base64: image.base64,
                url: image.url,
                isProcessing: false, // because it's for the final response
            };
            outputs[index] = { image: outputImage };
        }

        return outputs;
    }

    private collectInternResponses(): any[] | undefined {
        // collect all
        let internResponses: any[] = this.responseEvents.map((responseEvent) => { responseEvent.internResponse; });

        // remove empty/undefined
        internResponses = internResponses.filter((internResponse) => { return internResponse; });

        // result
        if (internResponses.length === 0) {
            return undefined;
        } else {
            return internResponses;
        }
    }

    /**
     * Create a final response from the collected response events
     */
    getResponseFinalOutputs(): Output[] {
        // collect and aggregate the outputs
        let outputs: Output[] = [];
        for (const responseEvent of this.responseEvents) {
            if (responseEvent.outputs) {
                for (const output of responseEvent.outputs) {
                    outputs = this.setOrAppendSingleOutput(output, outputs);
                }
            }
        }
        return outputs;
    }

    /**
    * Create a final response from the collected response events
    */
    getResponseFinalInternResponse(): any | undefined {
        // collect and aggregate internResponses
        let internResponse: any;
        let internResponses = this.collectInternResponses();
        if (internResponses && internResponses.length === 1) {
            internResponse = internResponses[0];
        } else {
            internResponse = internResponses;
        }
        return internResponse;
    }

    getMillisSinceStart(): number {
        return Date.now() - this.startTime;
    }
}
