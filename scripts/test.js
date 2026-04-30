const { streamText, tool } = require('ai');
const { google } = require('@ai-sdk/google');
const { z } = require('zod');

async function main() {
  try {
    const result = streamText({
      model: google('gemini-2.5-flash'),
      messages: [{role: 'user', content: 'test'}],
      tools: {
        my_tool: tool({
          description: 'test',
          inputSchema: z.object({ value: z.string() })
        })
      },
      providerOptions: {
        google: {
          thinkingConfig: { thinkingBudget: 0 },
          streamFunctionCallArguments: true,
        },
      },
    });
    console.log("STREAM CREATED", Object.keys(result));
    const res = result.toUIMessageStreamResponse();
    console.log(res.headers);
  } catch (err) {
    console.error("ERROR CAUGHT:");
    console.error(err);
  }
}
main();
