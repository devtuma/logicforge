const { convertToModelMessages } = require('ai');

async function main() {
  try {
    const messages = [{ id: '123', createdAt: new Date(), role: 'user', content: 'hello' }];
    console.log(convertToModelMessages(messages));
  } catch (err) {
    console.error(err);
  }
}
main();
